// Independent rest-UV -> 3D triangle spectral-stretch evaluator. Does not
// depend on a solver's reported metrics or on mesh edge lengths; a skinny
// triangle can have mild edge strain and enormous principal shear/stretch.
// Input contract: the EXISTING EXO native payload, without mutating it.
// This is an engineering diagnostic, not swept cloth/body collision QA.

const finite3 = p => Array.isArray(p) && p.length === 3 && p.every(Number.isFinite)

export function auditNativePrincipalStrain(payload, {limitPercent=5, degenerateAreaM2=1e-12}={}) {
  if(!payload || !Array.isArray(payload.particles) || !Array.isArray(payload.pieces))
    throw new TypeError('Native payload must provide particle and piece arrays')
  if(!Number.isFinite(limitPercent)||limitPercent<0||limitPercent>1000)
    throw new RangeError('Invalid principal extension limit')
  if(!Number.isFinite(degenerateAreaM2)||degenerateAreaM2<0)
    throw new RangeError('Invalid degenerate triangle tolerance')
  const measured=[],compressed=[],worst=[]
  let invalidTriangles=0, collapsedWorldTriangles=0, triangleCount=0, overLimit=0, compressionOverLimit=0
  for (const piece of payload.pieces) {
    for (let faceIndex=0; faceIndex<(piece.faces||[]).length; faceIndex++) {
      triangleCount++
      const indices=piece.faces[faceIndex]
      if (!Array.isArray(indices) || indices.length!==3) throw new TypeError('Invalid triangular mesh face')
      const uv=indices.map(i=>piece.flatVerticesM?.[i])
      const xyz=indices.map(i=>payload.particles[piece.particleIndices?.[i]]?.position)
      if (!uv.every(finite3)||!xyz.every(finite3)) throw new RangeError('Invalid rest/world triangle coordinates')
      const [a,b,c]=uv,[p,q,r]=xyz
      const dx1=b[0]-a[0],dy1=b[1]-a[1],dx2=c[0]-a[0],dy2=c[1]-a[1]
      const determinant=dx1*dy2-dx2*dy1
      if (Math.abs(determinant)*0.5<=degenerateAreaM2) {invalidTriangles++;continue}
      const v1=[q[0]-p[0],q[1]-p[1],q[2]-p[2]]
      const v2=[r[0]-p[0],r[1]-p[1],r[2]-p[2]]
      // Columns of F = [world edge1 world edge2] * inverse(rest DM).
      const f0=v1.map((x,i)=>(x*dy2-v2[i]*dy1)/determinant)
      const f1=v1.map((x,i)=>(v2[i]*dx1-x*dx2)/determinant)
      const aa=f0[0]**2+f0[1]**2+f0[2]**2
      const bb=f1[0]**2+f1[1]**2+f1[2]**2
      const ab=f0[0]*f1[0]+f0[1]*f1[1]+f0[2]*f1[2]
      // Largest singular value of the 3x2 deformation gradient.
      const largestEigen=0.5*(aa+bb+Math.hypot(aa-bb,2*ab))
      const percent=(Math.sqrt(Math.max(0,largestEigen))-1)*100
      if (!Number.isFinite(percent)) throw new RangeError('Non-finite principal triangle extension')
      const cx=f0[1]*f1[2]-f0[2]*f1[1]
      const cy=f0[2]*f1[0]-f0[0]*f1[2]
      const cz=f0[0]*f1[1]-f0[1]*f1[0]
      const smallestEigen=largestEigen>0?(cx*cx+cy*cy+cz*cz)/largestEigen:0
      if(smallestEigen<1e-20)collapsedWorldTriangles++
      const compressionPercent=(1-Math.sqrt(Math.max(0,smallestEigen)))*100
      if(!Number.isFinite(compressionPercent)) throw new RangeError('Non-finite principal triangle compression')
      measured.push(percent)
      compressed.push(compressionPercent)
      if(percent>limitPercent+1e-9)overLimit++
      if(compressionPercent>limitPercent+1e-9)compressionOverLimit++
      worst.push({pieceId:piece.id,faceIndex,principalExtensionPercent:percent})
    }
  }
  measured.sort((a,b)=>a-b)
  compressed.sort((a,b)=>a-b)
  worst.sort((a,b)=>b.principalExtensionPercent-a.principalExtensionPercent)
  return {
    triangleCount,measuredTriangles:measured.length,degenerateTriangles:invalidTriangles,collapsedWorldTriangles,
    limitPercent,overLimitTriangles:overLimit,compressionOverLimitTriangles:compressionOverLimit,
    maximumPrincipalExtensionPercent:measured.length?measured.at(-1):null,
    maximumPrincipalCompressionPercent:compressed.length?compressed.at(-1):null,
    p95PrincipalExtensionPercent:measured.length?measured[Math.max(0,Math.ceil(measured.length*.95)-1)]:null,
    worstTriangles:worst.slice(0,5),
    withinDeclaredStrainLimit:invalidTriangles===0&&collapsedWorldTriangles===0&&measured.length===triangleCount&&overLimit===0&&compressionOverLimit===0,
    fitCertified:false, // Does not inspect contact, seam topology or swept CCD.
  }
}
