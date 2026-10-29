// Research-only differentiable point-pair surrogate for a coupled seam,
// bending-edge and finite-clearance objective. This is NOT triangle contact,
// cloth bending calibration, a solver step, CCD, or a garment acceptance gate.
const finite = n => typeof n === 'number' && Number.isFinite(n)

export function evaluateCoupledSeamBendContactMeritResearch20261026({
  positions, seams = [], bends = [], contacts = [],
  seamWeight = 1, bendWeight = 1, contactWeight = 1,
} = {}) {
  if (!Array.isArray(positions) || positions.length < 2 || positions.length > 128 ||
      ![seams, bends, contacts].every(a => Array.isArray(a) && a.length <= 512) ||
      ![seamWeight, bendWeight, contactWeight].every(w => finite(w) && w > 0 && w <= 1e6) ||
      positions.some(p => !Array.isArray(p) || p.length !== 3 ||
        [0, 1, 2].some(k => !Object.hasOwn(p, k) || !finite(p[k]) || Math.abs(p[k]) > 1e6)))
    throw new RangeError('Invalid bounded coupled-merit research input')
  const gradient = positions.map(() => [0, 0, 0])
  const terms = {seam: 0, bend: 0, contact: 0}
  let maxSeamGapMm = 0, seamSquareSum = 0, maxBendErrorMm = 0
  let minimumContactMarginMm = Infinity, contactViolations = 0

  const evaluate = (edges, kind, weight) => {
    for (const edge of edges) {
      if (!Array.isArray(edge) || edge.length !== (kind === 'seam' ? 2 : 3))
        throw new RangeError('Invalid coupled-merit pair')
      const [a, b, target] = edge
      if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b) ||
          a < 0 || b < 0 || a >= positions.length || b >= positions.length || a === b ||
          (kind !== 'seam' && (!finite(target) || target < 0 ||
            (kind === 'contact' && target === 0))))
        throw new RangeError('Invalid coupled-merit pair')
      const delta = positions[a].map((v, k) => v - positions[b][k])
      const distance = Math.hypot(...delta)
      const rest = kind === 'seam' ? 0 : target
      const error = distance - rest
      if (kind === 'seam') {
        maxSeamGapMm = Math.max(maxSeamGapMm, distance)
        seamSquareSum += distance ** 2
      }
      if (kind === 'bend') maxBendErrorMm = Math.max(maxBendErrorMm, Math.abs(error))
      if (kind === 'contact') {
        minimumContactMarginMm = Math.min(minimumContactMarginMm, error)
        if (error < 0) contactViolations++
        else continue // No contact penalty outside the clearance region.
      }
      // A zero-length positive-rest edge has no defined spatial direction.
      // Do not manufacture a gradient that could be mistaken for safe motion.
      if (distance === 0 && rest > 0)
        throw new RangeError('Unresolved coincident pair in coupled merit')
      terms[kind] += 0.5 * weight * error ** 2
      const scale = distance === 0 ? 0 : weight * error / distance
      for (let k = 0; k < 3; k++) {
        const derivative = scale * delta[k]
        gradient[a][k] += derivative
        gradient[b][k] -= derivative
      }
    }
  }
  evaluate(seams, 'seam', seamWeight)
  evaluate(bends, 'bend', bendWeight)
  evaluate(contacts, 'contact', contactWeight)
  const totalEnergy = terms.seam + terms.bend + terms.contact
  if (!finite(totalEnergy) || gradient.some(g => g.some(x => !finite(x))))
    throw new RangeError('Nonfinite coupled-merit result')
  return {totalEnergy, terms, gradient, maxSeamGapMm,
    rmsSeamGapMm: seams.length ? Math.sqrt(seamSquareSum / seams.length) : 0,
    maxBendErrorMm, minimumContactMarginMm, contactViolations,
    pointPairContactValid: contactViolations === 0,
    triangleContactCertified: false, deformableCCDCertified: false,
    materialCalibrated: false, physicalAcceptance: false, safeToAutoApply: false}
}
