/** Mouse-pointer artwork for actual active drawing/editing tools.
 * Keep cursors off read-only commands, switches, and tools with no editor.
 * Explicit synonyms are shared by EXO's 2D/3D and native ClothCraft tool names.
 */
const shapeByTool=Object.freeze({
  'sew':'sewing-machine','segment-sew':'sewing-machine','free-sew':'sewing-machine',
  'seam-edit':'sewing-machine','sewing.editExisting':'sewing-machine',
  'sewing.segmentSew':'sewing-machine','sewing.freeSew':'sewing-machine',
  'polygon':'cad-polygon','create-polygon':'cad-polygon','pen':'cad-pen',
  'vector-pen':'cad-pen','vector-pencil':'cad-pen',
  'base-polygon':'cad-polygon','line':'cad-pen','internal':'cad-pen','line-3d':'cad-pen',
  'draw':'cad-pen','draw-line':'cad-pen','curve':'cad-curve','point':'cad-points',
  'points':'cad-points','edit':'cad-points','anchor-point':'cad-anchor-convert','direct-select':'cad-points','split':'cad-split',
  'notch':'cad-notch','allowance':'cad-allowance','seam-allowance':'cad-allowance',
  'pin':'cad-pin','measure':'cad-measure','measure-edit':'cad-measure',
  'seam-measure':'cad-measure','garment-measure':'cad-measure',
  'garment-measure-edit':'cad-measure','avatar-measure':'cad-measure',
  'avatar-measure-edit':'cad-measure','move':'cad-move','move3d':'cad-move',
  'rotate':'cad-rotate','rotate3d':'cad-rotate','transform':'cad-move',
  'mesh-select':'cad-brush','mesh-brush':'cad-brush',
  'graphic':'cad-graphics','graphics':'cad-graphics','graphic-transform':'cad-move',
  'grading':'cad-grading','grading-edit':'cad-grading','grading-auto':'cad-grading',
  'fill':'cad-fill','fill-panel':'cad-fill','trace':'cad-trace',
  'annotation':'cad-annotation','annotation-edit':'cad-annotation',
  'steam':'cad-steam','steam-preview':'cad-steam','tape':'cad-tape',
  'seam-taping':'cad-tape','topstitch':'sewing-machine','topstitch-segment':'sewing-machine',
  'puckering-segment':'sewing-machine','fastener':'sewing-machine',
})
export const SEWING_MACHINE_CURSOR="url('/cursors/sewing-machine.svg') 5 3, crosshair"
export function cursorForTool(tool,fallback='crosshair'){
  const icon=shapeByTool[String(tool||'')]
  // The Convert Anchor tip is the top point of its angled path, not the
  // upper-left corner used by the regular CAD pointer glyphs.
  const hotspot=icon==='cad-anchor-convert'?'14 9':'5 3'
  return icon ? `url('/cursors/${icon}.svg') ${hotspot}, ${fallback}` : null
}
export function hasToolCursor(tool){return Object.hasOwn(shapeByTool,String(tool||''))}
