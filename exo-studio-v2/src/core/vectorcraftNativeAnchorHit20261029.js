// Resolve double-clicks after SVG pointer capture retargets the DOM event.
// Hit test in displayed material space across panels, respecting rotation.
const finitePoint=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)

export function nativePatternAnchorAt(panels,position,tolerance,{preferredPanelId=null}={}){
  if(!Array.isArray(panels)||!finitePoint(position)||!Number.isFinite(tolerance)||tolerance<=0)return null
  let found=null
  for(const entry of panels){
    const panel=entry?.panel,origin=entry?.range?.layout
    const vertices=panel?.polygon?.points
    if(!panel?.id||!finitePoint(origin)||!Array.isArray(vertices))continue
    const rotation=(panel.layout_rotation_degrees||0)*Math.PI/180
    if(!Number.isFinite(rotation))continue
    const cos=Math.cos(rotation),sin=Math.sin(rotation)
    for(let index=0;index<vertices.length;index++){
      const point=vertices[index]
      if(!finitePoint(point))continue
      const x=origin[0]+point[0]*cos-point[1]*sin
      const y=origin[1]+point[0]*sin+point[1]*cos
      const distance=Math.hypot(position[0]-x,position[1]-y)
      if(distance>tolerance)continue
      const preferred=panel.id===preferredPanelId
      if(!found||distance<found.distance-1e-10||
        Math.abs(distance-found.distance)<=1e-10&&preferred&&!found.preferred){
        found={panel,index,distance,preferred}
      }
    }
  }
  return found&&{panel:found.panel,index:found.index,distance:found.distance}
}
