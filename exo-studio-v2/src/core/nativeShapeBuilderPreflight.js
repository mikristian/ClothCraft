// Native Boolean replaces cut outlines. Reject topology metadata its output
// cannot preserve, so an ordinary Shape Builder click cannot erase CAD work.
const nonempty=value=>Array.isArray(value)?value.length>0:
  value&&typeof value==='object'?Object.values(value).some(nonempty):value!==null&&value!==undefined&&value!==false&&value!==0&&value!==''

export function nativeShapeBuilderBlockers(template,baseId,toolId){
  if(!baseId||!toolId||baseId===toolId)return ['Choose two different pattern pieces.']
  const panels=template?.panels
  const base=panels?.find(item=>item.id===baseId)
  const tool=panels?.find(item=>item.id===toolId)
  if(!base?.polygon||!tool?.polygon)return ['Both patterns need native cut outlines.']
  const problems=[]
  for(const panel of [base,tool]){
    const poly=panel.polygon,label=panel.name||panel.id
    const guarded=[
      [template?.seams?.some(seam=>seam.a?.panel===panel.id||seam.b?.panel===panel.id),'sewing links'],
      [nonempty(panel.pins)||nonempty(panel.pin_points),'pins'],
      [nonempty(poly.curves)||nonempty(poly.free_curve_points),'curves'],
      [nonempty(poly.lines)||nonempty(poly.target_lengths),'internal construction'],
      [nonempty(poly.notches),'notches'],
      [nonempty(poly.seam_allowances),'seam allowances'],
      [nonempty(poly.annotations),'annotations'],
      [nonempty(poly.measurements),'measurements'],
      [nonempty(poly.vertex_ids),'stable vertex IDs'],
      [nonempty(poly.vertex_mirror_groups),'linked mirror anchors'],
    ]
    for(const [active,description] of guarded)if(active)problems.push(`${label} has ${description}.`)
  }
  return problems
}
