// Convert 2D board/world metres into the Rust panel's original UV/material
// metres. Native construction commands must never receive laid-out coordinates.
export function shapeBuilderWorldToMaterial(points,layout,rotationDegrees=0){
  if(!Array.isArray(points)||points.length!==2||!Array.isArray(layout)||
    layout.length!==2||!Number.isFinite(layout[0])||!Number.isFinite(layout[1])||
    !Number.isFinite(rotationDegrees))return null
  // Array#some/every skip holes; an incomplete stroke must never reach native cutting.
  for(let i=0;i<2;i++){
    const p=points[i]
    if(!Array.isArray(p)||p.length!==2||!Number.isFinite(p[0])||!Number.isFinite(p[1]))return null
  }
  const theta=-rotationDegrees*Math.PI/180
  if(!Number.isFinite(theta))return null
  const c=Math.cos(theta),s=Math.sin(theta)
  const transformed=[]
  for(const [wx,wy] of points){
    const x=wx-layout[0],y=wy-layout[1]
    if(!Number.isFinite(x)||!Number.isFinite(y))return null
    const local=[x*c-y*s,x*s+y*c]
    if(!Number.isFinite(local[0])||!Number.isFinite(local[1]))return null
    transformed.push(local)
  }
  return transformed
}
