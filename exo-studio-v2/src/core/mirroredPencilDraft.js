// Draft a complete symmetric contour from one freehand half. The first and
// last point lie on the fold/center line; this is one polygon, not two copies.
const finitePoint = p => Array.isArray(p)&&p.length===2&&Number.isFinite(p[0])&&Number.isFinite(p[1])
const distance = (a,b) => Math.hypot(a[0]-b[0],a[1]-b[1])

export function mirrorHalfPencilDraft(points,tangents=[]){
  if(!Array.isArray(points)||points.length<3)return null
  for(let i=0;i<points.length;i++)if(!finitePoint(points[i]))return null
  const first=points[0],last=points.at(-1)
  const dx=last[0]-first[0],dy=last[1]-first[1],square=dx*dx+dy*dy
  if(!Number.isFinite(square)||square<1e-8)return null
  const reflect=p=>{
    const x=p[0]-first[0],y=p[1]-first[1],t=(x*dx+y*dy)/square
    return [2*(first[0]+t*dx)-p[0],2*(first[1]+t*dy)-p[1]]
  }
  // Reflected points must run backwards around the outside of the panel.
  const vertices=[...points.map(p=>[...p]),...points.slice(1,-1).reverse().map(reflect)]
  if(vertices.some(p=>!finitePoint(p)))return null
  // Keep the original freehand tangents on its half; reverse and reflect the
  // derivatives on the opposite half so there is no sharp zig-zag in the fit.
  const hasTangents=Array.isArray(tangents)&&tangents.length===points.length&&
    Array.from({length:tangents.length},(_,i)=>finitePoint(tangents[i])).every(Boolean)
  const reflectDerivative=v=>{
    const t=(v[0]*dx+v[1]*dy)/square
    return [2*t*dx-v[0],2*t*dy-v[1]]
  }
  const vectors=hasTangents
    ?[...tangents.map((t,i)=>i===0||i===tangents.length-1?[0,0]:[...t]),
      ...tangents.slice(1,-1).reverse().map(t=>reflectDerivative(t).map(v=>-v))]
    :vertices.map(()=>[0,0])
  const area=vertices.reduce((sum,p,i)=>{
    const q=vertices[(i+1)%vertices.length]
    return sum+p[0]*q[1]-q[0]*p[1]
  },0)/2
  if(!Number.isFinite(area)||Math.abs(area)<1e-8||vectors.some(v=>!finitePoint(v))||
    vertices.some((p,i)=>{
      const edgeLength=distance(p,vertices[(i+1)%vertices.length])
      return !Number.isFinite(edgeLength)||edgeLength<1e-7
    }))return null
  return {points:vertices,tangents:vectors,axis:[first,last],area}
}
