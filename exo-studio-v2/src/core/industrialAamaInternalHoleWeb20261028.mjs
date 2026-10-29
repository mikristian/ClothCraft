// Opt-in local inspection of minimum uncut fabric web BETWEEN closed layer-11
// holes. It does not qualify material strength, a cutter, or factory release.
import {parseSeamlyAamaManufacturingSemantics} from './seamlyAamaManufacturingSemantics20261023.mjs'
import {inspectIndustrialAamaInternalCutCoverage20261028} from './industrialAamaInternalCutCoverage20261028.mjs'

const plain = x => x !== null && typeof x === 'object' && !Array.isArray(x) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(x))
const sameKeys = (x, keys) => plain(x) && Object.keys(x).length === keys.length &&
  keys.every(key => Object.hasOwn(x, key))
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
const pointSegmentDistance = (p, a, b) => {
  const dx = b.x - a.x, dy = b.y - a.y, len2 = dx * dx + dy * dy
  const t = len2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2)) : 0
  return distance(p, {x: a.x + dx * t, y: a.y + dy * t})
}
const edges = points => points.map((a, i) => [a, points[(i + 1) % points.length]])
const segmentGap = ([a, b], [c, d]) => Math.min(
  pointSegmentDistance(a, c, d), pointSegmentDistance(b, c, d),
  pointSegmentDistance(c, a, b), pointSegmentDistance(d, a, b))
const polygonGap = (a, b) => {
  let best = Infinity
  for (const edgeA of edges(a)) for (const edgeB of edges(b)) {
    best = Math.min(best, segmentGap(edgeA, edgeB))
  }
  return best
}
const fail = (code, detail = code) => ({
  ok: false, status: 'BLOCKED', issues: [{code, detail}],
  holeWebInspected: false, independentReceiverAuthenticated: false,
  receiverCadVerified: false, aamaCertified: false, astmCertified: false,
  cuttingAuthorized: false, factoryApproved: false, manufacturingApproved: false,
})

/**
 * Caller supplies complete size/piece-specific hole inventory and independently
 * chosen minimum web limits. First reuses the established internal-CUT guard:
 * malformed, overlapping, nested, open, missing or misplaced holes cannot pass.
 * The new check catches disjoint holes with too little fabric between them.
 * No textile tear-strength or knife-kerf tolerance is inferred.
 */
export function inspectIndustrialAamaInternalHoleWeb20261028(wiresBySize, {
  unit = null, holesBySize = null, minimumWebMmBySize = null,
  minCutClearanceMm = 2, toleranceMm = 0,
} = {}) {
  try {
    if (!plain(holesBySize) || !sameKeys(wiresBySize, Object.keys(holesBySize)) ||
        Object.keys(holesBySize).length < 2 || Object.keys(holesBySize).length > 24 ||
        !sameKeys(minimumWebMmBySize, Object.keys(holesBySize)) ||
        !Number.isFinite(toleranceMm) || toleranceMm < 0 || toleranceMm > 0.25 ||
        !['mm', 'cm', 'inch'].includes(unit))
      return fail('INVALID_AAMA_HOLE_WEB_POLICY')
    // Baseline geometry and physical cutout inventory must pass BEFORE spacing.
    const baseline = inspectIndustrialAamaInternalCutCoverage20261028(wiresBySize, {
      unit, holesBySize, minCutClearanceMm,
    })
    if (!baseline.ok)
      return fail('AAMA_HOLE_WEB_BASELINE_BLOCKED', baseline.issues.map(i => i.code).join(', '))
    const rows = []
    for (const size of Object.keys(holesBySize)) {
      const pieces = parseSeamlyAamaManufacturingSemantics(wiresBySize[size], {unit}).pieces
      if (!sameKeys(minimumWebMmBySize[size], pieces.map(p => p.name)))
        return fail('AAMA_HOLE_WEB_PIECE_IDENTITY_DRIFT', size)
      for (const piece of pieces) {
        const minWebMm = minimumWebMmBySize[size][piece.name]
        if (!Number.isFinite(minWebMm) || minWebMm < 1 || minWebMm > 30)
          return fail('INVALID_AAMA_HOLE_WEB_PIECE_POLICY', `${size}: ${piece.name}`)
        const holes = piece.internalCuts.map(h => h.points)
        let measured = null, pairs = 0
        for (let i = 0; i < holes.length; i++) for (let j = i + 1; j < holes.length; j++) {
          const gap = polygonGap(holes[i], holes[j])
          measured = measured === null ? gap : Math.min(measured, gap)
          pairs++
          if (gap + toleranceMm < minWebMm)
            return fail('AAMA_INTERNAL_HOLE_WEB_TOO_NARROW',
              `${size}: ${piece.name}: holes ${i + 1}/${j + 1}, gap ${gap.toFixed(3)}mm < ${minWebMm}mm`)
        }
        rows.push({size, piece: piece.name, holeCount: holes.length, pairsInspected: pairs,
          requiredMinimumWebMm: minWebMm, measuredMinimumWebMm: measured})
      }
    }
    return {
      ok: true, status: 'LOCAL_AAMA_INTERNAL_HOLE_WEB_INSPECTED', issues: [],
      sizeCount: Object.keys(holesBySize).length, rows, holeWebInspected: true,
      independentReceiverAuthenticated: false, receiverCadVerified: false,
      aamaCertified: false, astmCertified: false, cuttingAuthorized: false,
      factoryApproved: false, manufacturingApproved: false,
      limitations: 'Local layer-11 closed-hole spacing only. Caller-supplied limits and '
        + 'synthetic sew/cut geometry are not licensed CAD, textile-strength, cutter-kerf '
        + 'or physical factory acceptance evidence. CUT inspection never authorizes cutting.',
    }
  } catch (error) {
    return fail('AAMA_HOLE_WEB_INSPECTION_REFUSED', String(error.message || error))
  }
}
