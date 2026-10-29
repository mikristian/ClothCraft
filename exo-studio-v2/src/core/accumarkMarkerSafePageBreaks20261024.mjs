import { planCalibratedMarkerPdfPages20261024 } from './accumarkMarkerCalibrationPagination20261024.mjs'
import { inspectMarkerPageBoundarySafety20261024 } from './accumarkMarkerPageBoundarySafety20261024.mjs'

const EPS = 1e-8
const MAX_PAGES = 2048
const MAX_PLACEMENTS = 10000
const MAX_WORK = 250000

// Return deterministic page stations with strict clearance from every cutting outline.
export function planSafeMarkerPdfPages20261024(marker, pageLengthCm = 400, { calibration = false, clearanceCm = 0.05 } = {}) {
  if (!marker || typeof marker !== 'object' || !Array.isArray(marker.placements) ||
      marker.placements.length > MAX_PLACEMENTS || !Number.isFinite(marker.length) || marker.length <= 0 ||
      typeof pageLengthCm !== 'number' || !Number.isFinite(pageLengthCm) || pageLengthCm <= 0 ||
      typeof clearanceCm !== 'number' || !Number.isFinite(clearanceCm) || clearanceCm < 0 ||
      typeof calibration !== 'boolean') throw new RangeError('Invalid safe marker pagination input')

  const maximum = Math.max(10, Math.min(400, pageLengthCm))
  if (Math.ceil(marker.length / maximum) > MAX_PAGES) throw new RangeError('Safe marker pagination page limit exceeded')
  const baseline = planCalibratedMarkerPdfPages20261024(marker.length, pageLengthCm, { calibration })
  const minimum = calibration ? 3 : EPS
  const forbidden = []
  let pointCount = 0
  for (const placement of marker.placements) {
    const outline = placement?.outline
    if (!Array.isArray(outline) || outline.length < 3 || outline.length > 2000 ||
        (pointCount += outline.length) > MAX_WORK) throw new RangeError('Invalid cutting outline')
    let lo = Infinity, hi = -Infinity
    for (const point of outline) {
      if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) throw new RangeError('Invalid cutting outline')
      lo = Math.min(lo, point.y)
      hi = Math.max(hi, point.y)
    }
    forbidden.push([lo - clearanceCm - EPS, hi + clearanceCm + EPS])
  }

  const inspect = pages => inspectMarkerPageBoundarySafety20261024(marker, pages, { clearanceCm }).ok
  if (inspect(baseline)) return baseline

  forbidden.sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const gaps = []
  let cursor = 0
  for (const [left, right] of forbidden) {
    if (left > cursor) gaps.push([cursor, Math.min(left, marker.length)])
    cursor = Math.max(cursor, right)
    if (cursor >= marker.length) break
  }
  if (cursor < marker.length) gaps.push([cursor, marker.length])

  const intersect = (ranges, gapRanges) => {
    const output = []
    let j = 0
    for (const [left, right] of ranges) {
      while (j < gapRanges.length && gapRanges[j][1] < left) j++
      for (let k = j; k < gapRanges.length && gapRanges[k][0] <= right; k++) {
        const a = Math.max(left, gapRanges[k][0])
        const b = Math.min(right, gapRanges[k][1])
        if (a <= b) {
          if (output.length && a <= output.at(-1)[1] + EPS / 10) output.at(-1)[1] = Math.max(b, output.at(-1)[1])
          else output.push([a, b])
        }
      }
    }
    return output
  }

  let operations = 0
  for (let count = baseline.length; count <= Math.min(MAX_PAGES, baseline.length + 8); count++) {
    const layers = [[[0, 0]]]
    let possible = true
    for (let i = 1; i < count; i++) {
      const projected = layers[i - 1].map(([a, b]) => [a + minimum, b + maximum])
      const candidates = intersect(projected, gaps)
      const constrained = intersect(candidates, [[i * minimum, marker.length - (count - i) * minimum]])
      operations += projected.length * Math.max(1, gaps.length)
      if (operations > MAX_WORK || !constrained.length) { possible = false; break }
      layers.push(constrained)
    }
    if (!possible) continue
    const last = layers.at(-1).filter(([a, b]) => b + maximum >= marker.length - EPS && a + minimum <= marker.length + EPS)
    if (!last.length) continue
    const boundaries = Array(count + 1).fill(0)
    boundaries[count] = marker.length
    let valid = true
    for (let i = count - 1; i > 0; i--) {
      const desired = baseline[i - 1]?.endCm ?? Math.min(marker.length, i * maximum)
      const options = layers[i].map(([a, b]) => [Math.max(a, boundaries[i + 1] - maximum), Math.min(b, boundaries[i + 1] - minimum)])
        .filter(([a, b]) => a <= b)
      if (!options.length) { valid = false; break }
      options.sort((x, y) => Math.abs(Math.max(x[0], Math.min(x[1], desired)) - desired) -
        Math.abs(Math.max(y[0], Math.min(y[1], desired)) - desired) || x[0] - y[0])
      const [a, b] = options[0]
      boundaries[i] = Math.max(a, Math.min(b, desired))
    }
    if (!valid) continue
    const pages = boundaries.slice(0, -1).map((startCm, i) => ({ startCm, endCm: boundaries[i + 1], heightCm: boundaries[i + 1] - startCm }))
    if (pages.every(p => p.heightCm >= minimum - EPS / 10 && p.heightCm <= maximum + EPS / 10) && inspect(pages)) return pages
  }
  throw new RangeError('No safe empty cutting gap for marker PDF pagination')
}
