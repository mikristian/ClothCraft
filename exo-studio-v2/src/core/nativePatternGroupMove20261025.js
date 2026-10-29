// Convert an existing 2D pattern selection into one atomic native Rust edit-batch.
// Only board layout origins change; cut polygons, stitches, drape and fabrics stay intact.
export function planNativePatternGroupMove20261025(template, ids, delta) {
  if (!Array.isArray(delta) || delta.length !== 2 || !delta.every(Number.isFinite))
    return {ok:false, reason:'The pattern movement must have finite X/Y coordinates.'}
  if (!Array.isArray(ids) || ids.length < 2 || ids.length > 256 ||
      ids.some(id=>typeof id!=='string'||!id.trim()) || new Set(ids).size!==ids.length)
    return {ok:false,reason:'Select two or more distinct patterns to move together.'}
  const panels=template?.panels
  if (!Array.isArray(panels))return {ok:false,reason:'Native pattern layout is unavailable.'}
  // Never resolve an ambiguous native panel ID through Map's last-wins
  // behavior: that would transform a different piece than the one selected.
  // Validate the entire source before preparing any command, including IDs
  // outside the selection, so a corrupt garment cannot be partially edited.
  const lookup=new Map()
  for(const panel of panels){
    const id=panel?.id
    if(typeof id!=='string'||!id.trim()||lookup.has(id))
      return {ok:false,reason:'Native pattern source has missing or duplicate panel IDs.'}
    lookup.set(id,panel)
  }
  const commands=[]
  for(const id of ids){
    const panel=lookup.get(id)
    if(!panel)return {ok:false,reason:`Selected pattern ${id} is missing from the current revision.`}
    const origin=panel.layout_2d??panel.layout
    const rotation=Number(panel.layout_rotation_degrees??0)
    if(!Array.isArray(origin)||origin.length!==2||!origin.every(Number.isFinite)||!Number.isFinite(rotation))
      return {ok:false,reason:`Selected pattern ${id} has an invalid native layout.`}
    const next=origin.map((value,axis)=>value+delta[axis])
    if(!next.every(Number.isFinite))return {ok:false,reason:'The requested movement is outside the finite layout range.'}
    commands.push({kind:'BoardTransform',panel:id,origin:next,rotation_degrees:rotation})
  }
  return {ok:true,commands}
}
