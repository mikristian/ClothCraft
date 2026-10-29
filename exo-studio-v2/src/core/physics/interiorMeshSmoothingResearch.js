// Research-only rest-mesh conditioning. Preserve every boundary vertex,
// protected material-hinge vertex, triangle index and sewing correspondence.
// Do not treat lower rest aspect ratios as proof of a fitted garment.
const xy=value=>Array.isArray(value)?value:[value.x,value.y]
const key=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
const metric=(v,face)=>{
  const [a,b,c]=face.map(i=>xy(v[i]))
  const twice=cross(a,b,c)
  const longest=Math.max(Math.hypot(a[0]-b[0],a[1]-b[1]),
    Math.hypot(b[0]-c[0],b[1]-c[1]),Math.hypot(c[0]-a[0],c[1]-a[1]))
  const altitude=longest?Math.abs(twice)/longest:0
  const aspect=altitude?longest/altitude:Infinity
  // Mesh coordinates are centimeters (buildSimulation/inspectClothMesh).
  // Match inspectClothMesh's 0.2 cm = 2 mm minimum altitude, not 0.002 cm.
  // The old 0.002 value ignored low-altitude triangles with acceptable aspect.
  const minimumAltitudeCm=.2
  const penalty=Math.max(0,aspect/25-1)**2+
    Math.max(0,minimumAltitudeCm/Math.max(altitude,1e-12)-1)**2
  return {twice,penalty,poor:aspect>25||altitude<minimumAltitudeCm}
}
const clone=value=>Array.isArray(value)?[...value]:value.clone()
export function smoothInteriorTriangleQuality(mesh,{
  passes=4,step=.5,protectedEdges=[],fidelityLimits=null,
}={}){
  if(!Array.isArray(mesh?.vertices)||!Array.isArray(mesh?.faces)||
     !Number.isInteger(passes)||passes<1||passes>12||
     !Number.isFinite(step)||step<=0||step>1||
     !Array.isArray(protectedEdges))
    throw new TypeError('Invalid interior quality smoothing input')
  // Optional cumulative limits are relative to the ORIGINAL material mesh,
  // never to the previous smoothing pass. Coordinates here are centimeters.
  if(fidelityLimits!==null&&(
    typeof fidelityLimits!=='object'||Array.isArray(fidelityLimits)||
    Object.keys(fidelityLimits).some(k=>!['maxInteriorDisplacementMm',
      'maxRelativeEdgeDriftPercent'].includes(k))))
    throw new TypeError('Invalid interior smoothing fidelity limits')
  const limits=fidelityLimits===null?null:{
    maxInteriorDisplacementMm:fidelityLimits.maxInteriorDisplacementMm??2,
    maxRelativeEdgeDriftPercent:fidelityLimits.maxRelativeEdgeDriftPercent??10,
  }
  if(limits&&Object.values(limits).some(v=>!Number.isFinite(v)||v<0))
    throw new RangeError('Invalid interior smoothing fidelity limits')
  const vertices=mesh.vertices.map(clone)
  const original=mesh.vertices.map(v=>[...xy(v)])
  const faces=mesh.faces
  const incidence=vertices.map(()=>[])
  const neighbors=vertices.map(()=>new Set())
  const edgeCount=new Map()
  for(let f=0;f<faces.length;f++){
    const face=faces[f]
    if(!Array.isArray(face)||face.length!==3||
       new Set(face).size!==3||face.some(i=>!Number.isInteger(i)||i<0||i>=vertices.length))
      throw new RangeError('Invalid triangle in smoothing mesh')
    for(const i of face)incidence[i].push(f)
    for(const [a,b] of [[face[0],face[1]],[face[1],face[2]],[face[2],face[0]]]){
      neighbors[a].add(b);neighbors[b].add(a)
      const id=key(a,b);edgeCount.set(id,(edgeCount.get(id)||0)+1)
    }
  }
  const fixed=new Set()
  for(const [edge,count] of edgeCount){
    if(count===1||count>2)for(const i of edge.split(':'))fixed.add(Number(i))
  }
  for(const pair of protectedEdges){
    if(!Array.isArray(pair)||pair.length!==2||pair.some(i=>
      !Number.isInteger(i)||i<0||i>=vertices.length)||!edgeCount.has(key(...pair)))
      throw new RangeError('Invalid protected edge in smoothing mesh')
    pair.forEach(i=>fixed.add(i))
  }
  let movedVertices=0
  for(let pass=0;pass<passes;pass++){
    let accepted=0
    for(let i=0;i<vertices.length;i++){
      if(fixed.has(i)||neighbors[i].size<3)continue
      const current=xy(vertices[i])
      const ring=[...neighbors[i]].map(j=>xy(vertices[j]))
      const mean=[0,1].map(k=>ring.reduce((sum,p)=>sum+p[k],0)/ring.length)
      const old=incidence[i].map(f=>metric(vertices,faces[f]))
      if(old.some(m=>!Number.isFinite(m.penalty)||Math.abs(m.twice)<1e-12))continue
      const oldScore=old.reduce((sum,m)=>sum+m.penalty,0)
      if(oldScore<1e-12)continue
      // Tight material caps need smaller backtracking steps; without this,
      // every useful proposal can exceed the cap even when a safe step exists.
      const fractions=limits?[step,step*.5,step*.25,step*.125,
        step*.0625,step*.03125,step*.015625]:[step,step*.5,step*.25]
      for(const fraction of fractions){
        const trial=current.map((v,k)=>v+fraction*(mean[k]-v))
        if(limits){
          const displacementMm=10*Math.hypot(trial[0]-original[i][0],
            trial[1]-original[i][1])
          if(displacementMm>limits.maxInteriorDisplacementMm)continue
          const preservesMaterial=[...neighbors[i]].every(j=>{
            const baseline=Math.hypot(original[i][0]-original[j][0],
              original[i][1]-original[j][1])
            const neighbor=xy(vertices[j])
            const next=Math.hypot(trial[0]-neighbor[0],trial[1]-neighbor[1])
            return baseline>1e-12&&100*Math.abs(next-baseline)/baseline<=
              limits.maxRelativeEdgeDriftPercent
          })
          if(!preservesMaterial)continue
        }
        if(Array.isArray(vertices[i]))vertices[i]=trial
        else {vertices[i].x=trial[0];vertices[i].y=trial[1]}
        const now=incidence[i].map(f=>metric(vertices,faces[f]))
        const score=now.reduce((sum,m)=>sum+m.penalty,0)
        const safe=now.every((m,j)=>Number.isFinite(m.penalty)&&
          Math.sign(m.twice)===Math.sign(old[j].twice)&&
          Math.abs(m.twice)>1e-12&&(!m.poor||old[j].poor))
        if(safe&&score<oldScore-1e-8){accepted++;movedVertices++;break}
        if(Array.isArray(vertices[i]))vertices[i]=[...current]
        else {vertices[i].x=current[0];vertices[i].y=current[1]}
      }
    }
    if(!accepted)break
  }
  return {vertices,faces:faces.map(face=>[...face]),movedVertices,fixedVertices:fixed.size}
}
