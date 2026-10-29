// Read-only adapter between Rust's physical seam snapshots and either viewport.
// Guide weights reference world-space positions; they are not independent 3D stitches.
const finite = value => typeof value === 'number' && Number.isFinite(value)
const validRef = ref => !!ref && typeof ref.panel === 'string' && !!ref.panel && typeof ref.edge === 'string' && !!ref.edge
const failure = (code, detail) => ({ok:false,code,detail,relations:[],issues:[{code,detail}]})

function weightedPoint(weights, positions) {
  if (!Array.isArray(weights) || !weights.length || weights.length > 16) return null
  let sum = 0
  const point = [0,0,0]
  for (const term of weights) {
    if (!Array.isArray(term) || term.length !== 2 || !Number.isSafeInteger(term[0]) ||
        term[0] < 0 || term[0] >= positions.length || !finite(term[1]) || Math.abs(term[1]) > 2) return null
    const vertex = positions[term[0]]
    if (!Array.isArray(vertex) || vertex.length !== 3 || !vertex.every(finite)) return null
    for (let axis = 0; axis < 3; axis++) point[axis] += vertex[axis] * term[1]
    sum += term[1]
  }
  return Math.abs(sum - 1) <= 1e-4 && point.every(finite) ? point : null
}

/**
 * Generate stable seam IDs, source edge refs and world-space segments for the
 * current native snapshot. This never mutates the Rust snapshot or certifies fit.
 * Invalid guides are omitted with explicit diagnostic issues.
 */
export function buildNativeSeam3DSelection20261025(snapshot, {selected = null, maxGuidesPerSeam = 4096} = {}) {
  if (!Array.isArray(snapshot?.positions) || !Array.isArray(snapshot?.seams) ||
      !Array.isArray(snapshot?.template?.seams) || !Array.isArray(snapshot?.panels) ||
      snapshot.seams.length > 256 || snapshot.template.seams.length > 256 ||
      !Number.isSafeInteger(maxGuidesPerSeam) || maxGuidesPerSeam < 1 || maxGuidesPerSeam > 4096)
    return failure('INVALID_NATIVE_SNAPSHOT','Native positions, panels and sewing inventory are required')

  const panelIds = new Set(snapshot.panels.map(panel => panel?.id))
  const definitions = new Map()
  for (const spec of snapshot.template.seams) {
    if (typeof spec?.id !== 'string' || !spec.id || definitions.has(spec.id) ||
        !validRef(spec.a) || !validRef(spec.b) || !panelIds.has(spec.a.panel) || !panelIds.has(spec.b.panel))
      return failure('INVALID_SEAM_DEFINITION','Duplicate seam ID or missing physical panel/edge reference')
    definitions.set(spec.id,spec)
  }

  const relations = [], issues = [], seen = new Set()
  for (const seam of snapshot.seams) {
    if (typeof seam?.id !== 'string' || seen.has(seam.id)) {
      issues.push({code:'INVALID_COMPILED_SEAM_ID',seamId:seam?.id ?? null});continue
    }
    seen.add(seam.id)
    const spec = definitions.get(seam.id)
    if (!spec) {issues.push({code:'ORPHAN_COMPILED_SEAM',seamId:seam.id});continue}
    const guides = []
    if (!Array.isArray(seam.guides) || seam.guides.length > maxGuidesPerSeam) {
      issues.push({code:'INVALID_GUIDE_INVENTORY',seamId:seam.id});continue
    }
    seam.guides.forEach((pair,index) => {
      const a = Array.isArray(pair) && pair.length === 2 ? weightedPoint(pair[0],snapshot.positions) : null
      const b = Array.isArray(pair) && pair.length === 2 ? weightedPoint(pair[1],snapshot.positions) : null
      if (!a || !b) {issues.push({code:'INVALID_GUIDE_WEIGHTS',seamId:seam.id,guideIndex:index});return}
      guides.push({guideIndex:index,a,b,source:{panel:spec.a.panel,edge:spec.a.edge},target:{panel:spec.b.panel,edge:spec.b.edge}})
    })
    const highlighted = !!(selected && (selected.seamId === seam.id ||
      (!selected.seamId && [spec.a,spec.b].some(side => side.panel === selected.panel &&
        (!selected.edge || side.edge === selected.edge)))))
    relations.push({seamId:seam.id,source:{panel:spec.a.panel,edge:spec.a.edge},
      target:{panel:spec.b.panel,edge:spec.b.edge},reverseB:spec.reverse_b === true,
      highlighted,guides,gapMm:finite(seam.gap_m)?seam.gap_m*1000:null,
      rmsGapMm:finite(seam.rms_gap_m)?seam.rms_gap_m*1000:null})
  }
  for (const id of definitions.keys()) if (!seen.has(id)) issues.push({code:'MISSING_COMPILED_SEAM',seamId:id})
  return {ok:issues.length===0,relations,issues,revision:snapshot.revision??null,
    physicalClosureCertified:false}
}

/** Selection payload understood by the existing 2D and 3D workspace callbacks. */
export function nativeSeamSelectionFromGuide20261025(relation, side = 'a') {
  if (!relation || typeof relation.seamId !== 'string' || !relation.seamId ||
      !['a','b'].includes(side)) return null
  const ref = side === 'a' ? relation.source : relation.target
  return validRef(ref) ? {kind:'sewing',seamId:relation.seamId,panel:ref.panel,edge:ref.edge} : null
}
