// Surface coordinates survive vertex movement while triangle topology stays stable.
const point=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)
export function createSurfaceAnchor(hit,source,triangles,panelIds){
  const faceIndex=hit?.faceIndex
  if(!Number.isInteger(faceIndex)||faceIndex<0)return null
  const geometry=hit.object?.geometry
  const attribute=geometry?.getAttribute('position')
  if(!attribute||faceIndex*3+2>=(geometry.index?.count??attribute.count))return null
  const indices=geometry.index
    ?[0,1,2].map(i=>geometry.index.getX(faceIndex*3+i))
    :[faceIndex*3,faceIndex*3+1,faceIndex*3+2]
  const vertices=indices.map(i=>[attribute.getX(i),attribute.getY(i),attribute.getZ(i)])
  const local=hit.object.worldToLocal(hit.point.clone())
  const [a,b,c]=vertices
  const ab=b.map((v,i)=>v-a[i]),ac=c.map((v,i)=>v-a[i]),ap=a.map((v,i)=>local.getComponent(i)-v)
  const dot=(u,v)=>u.reduce((sum,n,i)=>sum+n*v[i],0)
  const d00=dot(ab,ab),d01=dot(ab,ac),d11=dot(ac,ac),d20=dot(ap,ab),d21=dot(ap,ac)
  const denominator=d00*d11-d01*d01
  if(Math.abs(denominator)<1e-14)return null
  const v=(d11*d20-d01*d21)/denominator,w=(d00*d21-d01*d20)/denominator
  const weights=[1-v-w,v,w]
  if(!weights.every(Number.isFinite))return null
  const panelId=Array.isArray(panelIds)&&typeof panelIds[faceIndex]==='string'&&panelIds[faceIndex]?panelIds[faceIndex]:undefined
  return {source,triangleIndex:faceIndex,vertices:source==='actor'?undefined:Array.isArray(triangles?.[faceIndex])?triangles[faceIndex]:undefined,weights,...(panelId?{panelId}:{})}
}

export function anchorLocalPoint(anchor,positions,triangles,geometry){
  if(!anchor||!Array.isArray(anchor.weights)||anchor.weights.length!==3||!anchor.weights.every(Number.isFinite))return null
  const triangle=anchor.vertices||triangles?.[anchor.triangleIndex]
  let vertices=Array.isArray(triangle)&&triangle.length===3
    ?triangle.map(index=>positions?.[index])
    :null
  if(!vertices?.every(point)){
    const attribute=geometry?.getAttribute('position')
    const face=anchor.triangleIndex
    if(!attribute||!Number.isInteger(face)||face<0||face*3+2>=(geometry.index?.count??attribute.count))return null
    vertices=[0,1,2].map(i=>{
      const index=geometry.index?geometry.index.getX(face*3+i):face*3+i
      return [attribute.getX(index),attribute.getY(index),attribute.getZ(index)]
    })
  }
  return [0,1,2].map(axis=>vertices.reduce((sum,vertex,i)=>sum+vertex[axis]*anchor.weights[i],0))
}
