// Research-only material crease proposal for intra-sleeve underarm seams.
// Derives a candidate fold line from the sewing-pair midpoints and computes
// an optimistic 180-degree material reflection. It NEVER edits the mesh or
// claims that overlapping fabric at the endpoint is collision-safe.
const TARGETS=[['sleeve-left','seam-sleeve-l-underarm'],
  ['sleeve-right','seam-sleeve-r-underarm']]
const finite3=v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite)
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])
const cross=(a,b)=>a[0]*b[1]-a[1]*b[0]
const subtract=(a,b)=>[a[0]-b[0],a[1]-b[1]]
const rms=values=>Math.hypot(...values)/Math.sqrt(values.length)

export function inspectNativeUnderarmCenterCrease(reference,{
  maxPairs=128,axisToleranceM=1e-6,
}={}){
  if(!Array.isArray(reference?.pieces)||!Array.isArray(reference?.particles)||
     !Array.isArray(reference?.constraints)||
     (reference.virtualSeams!==undefined&&!Array.isArray(reference.virtualSeams))||
     !Number.isInteger(maxPairs)||maxPairs<2||maxPairs>128||
     !Number.isFinite(axisToleranceM)||axisToleranceM<=0||axisToleranceM>1e-3)
    throw new Error('Invalid bounded center-crease inputs')
  const snapshot=JSON.stringify(reference),results=[]
  for(const [panelId,seamId] of TARGETS){
    const panel=reference.pieces.find(p=>p.id===panelId)
    if(!panel||!Array.isArray(panel.particleIndices)||
       !Array.isArray(panel.flatVerticesM)||!Array.isArray(panel.faces)||
       panel.particleIndices.length!==panel.flatVerticesM.length||
       !panel.flatVerticesM.every(finite3))
      throw new Error('Missing or malformed underarm material panel')
    const lookup=new Map()
    for(let i=0;i<panel.particleIndices.length;i++){
      const index=panel.particleIndices[i]
      if(!Number.isInteger(index)||index<0||index>=reference.particles.length||
         lookup.has(index))throw new Error('Invalid underarm particle ownership')
      lookup.set(index,i)
    }
    function endpoint(indices,weights){
      if(!Array.isArray(indices)||!Array.isArray(weights)||
         indices.length<1||indices.length>3||indices.length!==weights.length)
        throw new Error('Malformed underarm seam endpoint')
      let sum=0,x=0,y=0
      for(let k=0;k<indices.length;k++){
        const i=lookup.get(indices[k]),w=weights[k]
        if(i===undefined||!Number.isFinite(w)||w<0)
          throw new Error('Underarm seam endpoint outside material panel')
        sum+=w;x+=w*panel.flatVerticesM[i][0];y+=w*panel.flatVerticesM[i][1]
      }
      if(Math.abs(sum-1)>1e-6)throw new Error('Nonunit underarm seam weights')
      return [x,y]
    }
    const pairs=[]
    for(const c of reference.constraints){
      if(c.type==='seam'&&c.seamId===seamId)
        pairs.push([endpoint([c.a],[1]),endpoint([c.b],[1])])
    }
    for(const c of reference.virtualSeams||[]){
      if((c.seamId||c.id)===seamId)
        pairs.push([endpoint(c.sourceIndices,c.sourceWeights),
          endpoint(c.targetIndices,c.targetWeights)])
    }
    if(pairs.length<2||pairs.length>maxPairs)
      throw new Error('Missing or oversized underarm sewing evidence')
    const midpoints=pairs.map(([a,b])=>[(a[0]+b[0])/2,(a[1]+b[1])/2])
    let farthest=-1,ends=null
    for(let i=0;i<midpoints.length;i++)for(let j=i+1;j<midpoints.length;j++){
      const d=distance(midpoints[i],midpoints[j])
      if(d>farthest){farthest=d;ends=[i,j]}
    }
    if(farthest<axisToleranceM)
      throw new Error('Cannot derive a stable underarm center crease')
    const origin=midpoints[ends[0]],other=midpoints[ends[1]]
    const direction=subtract(other,origin).map(x=>x/farthest)
    const signed=p=>cross(direction,subtract(p,origin))
    if(midpoints.some(p=>Math.abs(signed(p))>axisToleranceM))
      throw new Error('Underarm midpoints do not define one straight crease')
    const before=[],ideal=[]
    for(const [a,b] of pairs){
      const sa=signed(a),sb=signed(b)
      if(sa*sb>=-(axisToleranceM**2))
        throw new Error('Underarm seam pair is not separated by crease')
      const reflectA=[a[0]+2*sa*direction[1],a[1]-2*sa*direction[0]]
      before.push(distance(a,b)*1000)
      ideal.push(distance(reflectA,b)*1000)
    }
    const vertexSigns=panel.flatVerticesM.map(p=>signed(p))
    const cutEdges=new Set(),crossingFaces=[]
    for(let faceIndex=0;faceIndex<panel.faces.length;faceIndex++){
      const face=panel.faces[faceIndex]
      if(!Array.isArray(face)||face.length!==3||new Set(face).size!==3||
         face.some(i=>!Number.isInteger(i)||i<0||i>=vertexSigns.length))
        throw new Error('Malformed crease material triangle')
      const [a,b,c]=face.map(i=>panel.flatVerticesM[i])
      if(Math.abs(cross(subtract(b,a),subtract(c,a)))<1e-14)
        throw new Error('Degenerate crease material triangle')
      if(face.some(i=>vertexSigns[i]>axisToleranceM)&&
         face.some(i=>vertexSigns[i]<-axisToleranceM))crossingFaces.push(faceIndex)
      for(const [i,j] of [[face[0],face[1]],[face[1],face[2]],[face[2],face[0]]]){
        if(vertexSigns[i]*vertexSigns[j]<-(axisToleranceM**2))
          cutEdges.add(i<j?`${i}:${j}`:`${j}:${i}`)
      }
    }
    results.push({panelId,seamId,pairCount:pairs.length,
      creaseOriginM:[...origin],creaseDirection:[...direction],
      initialRestMaxGapMm:Math.max(...before),initialRestRmsGapMm:rms(before),
      idealReflectedMaxGapMm:Math.max(...ideal),idealReflectedRmsGapMm:rms(ideal),
      crossingFaceCount:crossingFaces.length,crossingFaceIndices:crossingFaces,
      cutEdgeCount:cutEdges.size,axisVertexCount:vertexSigns.filter(s=>
        Math.abs(s)<=axisToleranceM).length,
      existingMeshCreaseExecutable:crossingFaces.length===0,
      requiresCreaseConformingRemesh:crossingFaces.length>0})
  }
  if(JSON.stringify(reference)!==snapshot)
    throw new Error('Underarm crease inspection mutated source')
  return {panels:results,sourceUnchanged:true,
    idealMaterialReflectionOnly:true,simulated3DPose:false,
    actualStrainCertified:false,contactCertified:false,
    sweptCollisionCertified:false,avatarEntryCertified:false,
    fitCertified:false,safeToAutoApply:false}
}
