// Research-only constrained edge-flip refinement of an already crease-split
// sleeve mesh. Never writes the project, builds springs, or certifies contact.
import {buildNativeUnderarmCreaseRemeshResearch} from './nativeUnderarmCreaseRemeshResearch.js'

const edgeKey=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
const triangle=(v,f)=>{
  const [a,b,c]=f.map(i=>v[i])
  const lengths=[Math.hypot(a[0]-b[0],a[1]-b[1]),
    Math.hypot(b[0]-c[0],b[1]-c[1]),
    Math.hypot(c[0]-a[0],c[1]-a[1])]
  const longest=Math.max(...lengths)
  const signed=cross(a,b,c)
  const altitude=Math.abs(signed)/longest
  const aspect=longest/altitude
  const ill=altitude<.002||aspect>25?1:0
  const penalty=Math.max(0,.002/altitude-1)**2+
    Math.max(0,aspect/25-1)**2+aspect*.0001
  return {signed,altitude,aspect,ill,penalty}
}
const audit=(v,faces)=>{
  let illConditioned=0,minAltitudeMm=Infinity,maxAspect=0,penalty=0,area=0
  for(const f of faces){
    const q=triangle(v,f)
    if(!Number.isFinite(q.penalty)||Math.abs(q.signed)<1e-14)
      throw new Error('Invalid refined material triangle')
    illConditioned+=q.ill
    minAltitudeMm=Math.min(minAltitudeMm,q.altitude*1000)
    maxAspect=Math.max(maxAspect,q.aspect)
    penalty+=q.penalty
    area+=Math.abs(q.signed)/2
  }
  return {illConditioned,minAltitudeMm,maxAspect,penalty,area}
}
const incidence=faces=>{
  const map=new Map()
  faces.forEach((f,faceIndex)=>{
    for(let j=0;j<3;j++){
      const a=f[j],b=f[(j+1)%3],k=edgeKey(a,b)
      if(!map.has(k))map.set(k,[])
      map.get(k).push({faceIndex,a,b,other:f[(j+2)%3]})
    }
  })
  if([...map.values()].some(uses=>uses.length>2))
    throw new Error('Nonmanifold refinement topology')
  return map
}
const oriented=(v,indices,sign)=>{
  const area=cross(...indices.map(i=>v[i]))
  if(!Number.isFinite(area)||Math.abs(area)<1e-14)return null
  return Math.sign(area)===sign?indices:[indices[0],indices[2],indices[1]]
}

export function refineNativeUnderarmCreaseMeshResearch(reference,{
  maxFlips=128,axisToleranceM=1e-9,
}={}){
  if(!Number.isInteger(maxFlips)||maxFlips<0||maxFlips>512)
    throw new RangeError('Invalid bounded edge-flip budget')
  const frozen=JSON.stringify(reference)
  const remesh=buildNativeUnderarmCreaseRemeshResearch(reference,{axisToleranceM})
  const panels=remesh.panels.map(piece=>{
    const vertices=piece.verticesM
    const faces=piece.faces.map(f=>[...f])
    const originalEdges=incidence(faces)
    const boundary=new Set([...originalEdges].filter(([,uses])=>uses.length===1).map(([k])=>k))
    const crease=new Set(piece.creaseEdges.map(([a,b])=>edgeKey(a,b)))
    const before=audit(vertices,faces)
    let flips=0
    while(flips<maxFlips){
      const graph=incidence(faces)
      let chosen=null
      for(const [k,uses] of graph){
        if(uses.length!==2||boundary.has(k)||crease.has(k))continue
        const [u,w]=uses
        const {a,b,other:c}=u,d=w.other
        if(c===d||edgeKey(c,d)===k||graph.has(edgeKey(c,d)))continue
        // A valid planar flip needs a strictly convex quadrilateral, with
        // both old faces consistently oriented and the opposite vertices
        // strictly separated by both diagonals.
        const old1=triangle(vertices,faces[u.faceIndex])
        const old2=triangle(vertices,faces[w.faceIndex])
        const s=Math.sign(old1.signed)
        if(s===0||Math.sign(old2.signed)!==s)continue
        const ca=cross(vertices[a],vertices[b],vertices[c])
        const da=cross(vertices[a],vertices[b],vertices[d])
        const ac=cross(vertices[c],vertices[d],vertices[a])
        const bc=cross(vertices[c],vertices[d],vertices[b])
        if(ca*da>=-1e-14||ac*bc>=-1e-14)continue
        const next1=oriented(vertices,[c,d,a],s)
        const next2=oriented(vertices,[d,c,b],s)
        if(!next1||!next2)continue
        // The crease is a hard constraint: neither replacement triangle
        // may cross it, even when the new diagonal is not itself a crease.
        if([next1,next2].some(f=>{
          const xs=f.map(i=>vertices[i][0])
          return Math.min(...xs)<-axisToleranceM&&Math.max(...xs)>axisToleranceM
        }))continue
        const new1=triangle(vertices,next1),new2=triangle(vertices,next2)
        if(new1.signed*s<=1e-14||new2.signed*s<=1e-14)continue
        if(Math.abs(new1.signed+new2.signed-old1.signed-old2.signed)>1e-10)
          continue
        const deltaIll=new1.ill+new2.ill-old1.ill-old2.ill
        const deltaPenalty=new1.penalty+new2.penalty-old1.penalty-old2.penalty
        if(deltaIll>0||(deltaIll===0&&deltaPenalty>=-1e-9))continue
        if(!chosen||deltaIll<chosen.deltaIll||
          (deltaIll===chosen.deltaIll&&deltaPenalty<chosen.deltaPenalty)){
          chosen={indices:[u.faceIndex,w.faceIndex],triangles:[next1,next2],
            deltaIll,deltaPenalty}
        }
      }
      if(!chosen)break
      const [i,j]=chosen.indices
      const [f,g]=chosen.triangles
      faces[i]=f;faces[j]=g
      flips++
    }
    const after=audit(vertices,faces)
    const finalEdges=incidence(faces)
    const finalBoundary=new Set([...finalEdges].filter(([,uses])=>uses.length===1).map(([k])=>k))
    if(finalBoundary.size!==boundary.size||[...boundary].some(k=>!finalBoundary.has(k)))
      throw new Error('Refinement changed original material boundary')
    if([...crease].some(k=>finalEdges.get(k)?.length!==2))
      throw new Error('Refinement removed constrained crease edge')
    if(Math.abs(before.area-after.area)>1e-10||
      after.illConditioned>before.illConditioned||
      after.penalty>before.penalty+1e-8)
      throw new Error('Refinement failed material quality/area contract')
    return {...piece,faces,flipCount:flips,refinementBefore:before,
      refinementAfter:after,qualityApproved:after.illConditioned===0,
      qualityRegressed:after.illConditioned>piece.beforeQuality.illConditioned,
      afterQuality:{illConditioned:after.illConditioned,
        minAltitudeMm:after.minAltitudeMm,maxAspect:after.maxAspect}}
  })
  if(JSON.stringify(reference)!==frozen)throw new Error('Refinement mutated source')
  return {...remesh,panels,refinementOnly:true,sourceUnchanged:true,
    meshConditioningCertified:false,safeToAutoApply:false}
}
