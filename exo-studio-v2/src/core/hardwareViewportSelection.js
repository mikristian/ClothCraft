/** Pick one rendering source for each saved placement. A button backed by a
 * GLB must not also get an overlapping procedural button mesh. */
export const hasImportedHardwareModel = placement => Boolean(
  typeof placement?.glbUrl === 'string' && placement.glbUrl.trim() ||
  typeof placement?.glb === 'string' && placement.glb.trim()
)

export function viewportHardwarePlacements(piece={}) {
  const buttons=(piece.buttons||[]).filter(item=>item?.visible!==false)
  // A saved imported placement can appear in both legacy and current lists.
  // Keep one mesh for each placement ID while preserving distinct attachments.
  const seenIds=new Set()
  const imported=[
    // The editable button record wins over stale legacy mirrored placements.
    // This keeps GLB transforms, colors and visibility in sync after an edit.
    ...buttons.filter(hasImportedHardwareModel),
    ...(piece.importedHardwarePlacements||[]),
    ...(piece.importedHardware||[]),
  ].filter(item=>{
    if(item?.visible===false||!hasImportedHardwareModel(item))return false
    const id=typeof item.id==='string'&&item.id.trim()?item.id:null
    if(id&&seenIds.has(id))return false
    if(id)seenIds.add(id)
    return true
  })
  return {
    proceduralButtons:buttons.filter(item=>!hasImportedHardwareModel(item)),
    imported,
  }
}
