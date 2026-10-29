/** Opt-in exact-point canonicalization for the four imported CLO cloth panels.
 * Never alter the supplied source project, its JSON reference, or app defaults.
 * Removal is refused whenever edge/vertex semantics cannot be proven safe.
 */
export const CLO_CANONICAL_PANELS = Object.freeze([
  'clo-front', 'clo-back', 'clo-right-sleeve', 'clo-left-sleeve',
])

const clone = value => structuredClone(value)
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key)

function rejectReferences(project, piece, duplicates) {
  const has = (obj, key) => obj && own(obj, key)
  // No reference-bearing contour structures may be silently reindexed.
  const indexed = ['curves', 'edgeSeamAllowances', 'notches', 'topstitches', 'bindings',
    'zippers', 'buttons', 'buttonholes', 'internalLines', 'pins', 'graphics', 'darts',
    'pleats', 'folds', 'seamGuides', 'edgeRoles', 'edgeMetadata', 'namedEdges',
    'gradeRules', 'constructionLines', 'annotations']
  for (const field of indexed) {
    const data = piece[field]
    if (data && (Array.isArray(data) ? data.length > 0 : typeof data === 'object' ? Object.keys(data).length > 0 : true)) {
      throw new Error(`Cannot canonicalize ${piece.id}: ${field} may reference original edge or vertex indices`)
    }
  }
  if (piece.points.some(point => has(point, 'id') || has(point, 'industrialGradeRule') || has(point, 'gradeRule') ||
    has(point, 'anchor') || has(point, 'seam') || has(point, 'edgeIndex') || has(point, 'vertexIndex'))) {
    throw new Error(`Cannot canonicalize ${piece.id}: per-vertex identity or grade references are present`)
  }
  if ((project.seams || []).some(seam => seam.a?.pieceId === piece.id || seam.b?.pieceId === piece.id ||
    seam.pieceId === piece.id)) throw new Error(`Cannot canonicalize ${piece.id}: authored sewing references exist`)
  if ((project.customMeasurements || []).some(mark => mark.pieceId === piece.id || mark.a?.pieceId === piece.id ||
    mark.b?.pieceId === piece.id)) throw new Error(`Cannot canonicalize ${piece.id}: measurement references exist`)
  if ((project.fasteners || []).some(mark => mark.pieceId === piece.id || mark.a?.pieceId === piece.id ||
    mark.b?.pieceId === piece.id)) throw new Error(`Cannot canonicalize ${piece.id}: fastener references exist`)
  if (duplicates.length && piece.points.some(point => !point || !Number.isFinite(point.x) || !Number.isFinite(point.y))) {
    throw new Error(`Cannot canonicalize ${piece.id}: nonfinite point`)
  }
}

/** Returns a fresh, explicitly unapproved study document and index map.
 * `originalToCanonical`: each original vertex index maps to the canonical
 * surviving vertex; `canonicalToOriginal`: original indices of survivors.
 */
export function canonicalizeCloMaleTshirtProject(sourceProject) {
  if (!sourceProject || !Array.isArray(sourceProject.pieces)) throw new Error('Expected imported CLO project pieces')
  const project = clone(sourceProject)
  const maps = {}
  let removedCount = 0
  for (const id of CLO_CANONICAL_PANELS) {
    const piece = project.pieces.find(entry => entry.id === id)
    if (!piece || !Array.isArray(piece.points) || piece.points.length < 3) {
      throw new Error(`Missing canonicalization panel: ${id}`)
    }
    const points = piece.points
    const duplicates = []
    for (let index = 0; index < points.length; index++) {
      const nextIndex = (index + 1) % points.length
      if (points[index].x === points[nextIndex].x && points[index].y === points[nextIndex].y) {
        duplicates.push(index)
      }
    }
    rejectReferences(project, piece, duplicates)
    const discard = new Set(duplicates.map(index => (index + 1) % points.length))
    const canonicalToOriginal = points.map((_, index) => index).filter(index => !discard.has(index))
    if (canonicalToOriginal.length < 3) throw new Error(`Cannot canonicalize ${id}: too few surviving points`)
    const indexLookup = new Map(canonicalToOriginal.map((original, current) => [original, current]))
    const originalToCanonical = points.map((_, index) => {
      if (indexLookup.has(index)) return indexLookup.get(index)
      const predecessor = (index - 1 + points.length) % points.length
      if (!duplicates.includes(predecessor) || !indexLookup.has(predecessor)) {
        throw new Error(`Ambiguous canonical duplicate chain: ${id} vertex ${index}`)
      }
      return indexLookup.get(predecessor)
    })
    maps[id] = { originalPointCount: points.length, canonicalPointCount: canonicalToOriginal.length,
      removedOriginalIndices: [...discard].sort((a, b) => a - b),
      collapsedOriginalEdgeIndices: duplicates,
      originalToCanonical, canonicalToOriginal }
    piece.points = canonicalToOriginal.map(index => points[index])
    removedCount += discard.size
  }
  project.canonicalizationProvenance = {
    source: 'clo-male-tshirt-imported-reference',
    mode: 'OPT_IN_EXACT_CONSECUTIVE_DUPLICATE_POINTS',
    status: 'DEVELOPMENT_ONLY_FACTORY_APPROVAL_REQUIRED',
    originalSourcePreserved: true,
    removedPointCount: removedCount,
    indexMaps: maps,
  }
  return { project, removedPointCount: removedCount, indexMaps: maps, factoryCertified: false }
}
