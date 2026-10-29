import { planSafeMarkerPdfPages20261024 } from './accumarkMarkerSafePageBreaks20261024.mjs'

// Read-only diagnostic of the ruler locations actually emitted by markerArtifacts.
// This does not certify font rendering, plotter margins, physical scale or factory use.
const LABEL = '100 mm SCALE CHECK - VERIFY WITH RULER'
const EPS = 1e-9
const MAX_PLACEMENTS = 10000
const MAX_POINTS = 250000
const MAX_PAGES = 2048
const MAX_COMPARISONS = 3000000
const MAX_PAGE_PLACEMENT_PAIRS = 200000
const finite = n => typeof n === 'number' && Number.isFinite(n)
const issue = (code, detail, pageIndex = null) => ({ code, detail, ...(pageIndex === null ? {} : { pageIndex }) })

function contains(rect, p) {
  return p.x >= rect.x0 - EPS && p.x <= rect.x1 + EPS && p.y >= rect.y0 - EPS && p.y <= rect.y1 + EPS
}
function cross(a, b, c) { return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x) }
function onSegment(a, b, p) {
  return Math.abs(cross(a, b, p)) <= EPS && p.x >= Math.min(a.x, b.x) - EPS && p.x <= Math.max(a.x, b.x) + EPS && p.y >= Math.min(a.y, b.y) - EPS && p.y <= Math.max(a.y, b.y) + EPS
}
function intersects(a, b, c, d) {
  const x = cross(a, b, c), y = cross(a, b, d), u = cross(c, d, a), v = cross(c, d, b)
  if (((x > EPS && y < -EPS) || (x < -EPS && y > EPS)) && ((u > EPS && v < -EPS) || (u < -EPS && v > EPS))) return true
  return onSegment(a, b, c) || onSegment(a, b, d) || onSegment(c, d, a) || onSegment(c, d, b)
}
function insidePolygon(p, polygon) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[j], b = polygon[i]
    if (onSegment(a, b, p)) return true
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}
function polygonTouchesRectangle(poly, rect, budget) {
  // The four point-in-polygon scans are also linear work; count them before
  // executing so a malicious many-page contour cannot bypass the cap.
  if (budget.count + poly.length * 4 > MAX_COMPARISONS) throw Error('Ruler geometry comparison budget exceeded')
  budget.count += poly.length * 4
  const corners = [
    { x: rect.x0, y: rect.y0 }, { x: rect.x1, y: rect.y0 },
    { x: rect.x1, y: rect.y1 }, { x: rect.x0, y: rect.y1 },
  ]
  if (corners.some(p => insidePolygon(p, poly))) return true
  for (let i = 0; i < poly.length; i++) {
    if (++budget.count > MAX_COMPARISONS) throw Error('Ruler geometry comparison budget exceeded')
    const a = poly[i], b = poly[(i + 1) % poly.length]
    if (contains(rect, a)) return true
    for (let j = 0; j < 4; j++) if (intersects(a, b, corners[j], corners[(j + 1) % 4])) return true
  }
  return false
}
function checkedPlacements(marker) {
  if (!marker || !finite(marker.width) || !finite(marker.length) || marker.width <= 0 || marker.length <= 0 ||
      marker.width > 1e7 || marker.length > 1e7 || !Array.isArray(marker.placements) || marker.placements.length > MAX_PLACEMENTS)
    throw Error('Invalid marker dimensions or placement budget')
  let points = 0
  return marker.placements.map((p, index) => {
    if (!p || !Array.isArray(p.outline) || p.outline.length < 3 || p.outline.length > 2000 ||
        (points += p.outline.length) > MAX_POINTS) throw Error(`Invalid placement ${index} outline budget`)
    if (![p.x, p.y, p.width, p.height].every(finite) || p.width <= 0 || p.height <= 0)
      throw Error(`Invalid placement ${index} declared bounds`)
    if (typeof p.name !== 'string' || p.name.length > 120 || !Number.isSafeInteger(p.instance) || p.instance < 0)
      throw Error(`Invalid placement ${index} printable label`)
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
    for (const v of p.outline) {
      if (!v || !finite(v.x) || !finite(v.y)) throw Error(`Invalid placement ${index} vertex`)
      x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x)
      y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y)
    }
    if (x0 < -EPS || y0 < -EPS || x1 > marker.width + EPS || y1 > marker.length + EPS ||
        Math.abs(p.x - x0) > 1e-4 || Math.abs(p.y - y0) > 1e-4 ||
        Math.abs(p.x + p.width - x1) > 1e-4 || Math.abs(p.y + p.height - y1) > 1e-4)
      throw Error(`Invalid placement ${index} cutting bounds`)
    return { index, outline: p.outline, bounds: { x0, x1, y0, y1 }, x: p.x, y: p.y, name: p.name, instance: p.instance }
  })
}
function touchesBounds(a, b) {
  return a.x0 <= b.x1 + EPS && a.x1 >= b.x0 - EPS && a.y0 <= b.y1 + EPS && a.y1 >= b.y0 - EPS
}
function rectangle(x0, x1, y0, y1, margin) {
  return { x0: x0 - margin, x1: x1 + margin, y0: y0 - margin, y1: y1 + margin }
}

/**
 * Checks the current fixed SVG and per-page PDF ruler positions against cut
 * polygon interiors/edges. Font ink is conservatively estimated, not measured.
 * Callers must NOT treat `ok` as a manufacturing approval or printed-scale QA.
 */
export function auditMarkerRulerInkClearance20261024(marker, { pageLengthCm = 400, clearanceCm = 0.05, size = 'BASE' } = {}) {
  const issues = []
  try {
    if (!finite(clearanceCm) || clearanceCm < 0 || clearanceCm > 1) throw Error('Invalid ruler clearance')
    if (typeof size !== 'string' || size.length > 120) throw Error('Invalid size label')
    const pieces = checkedPlacements(marker)
    if (marker.width < 11 || marker.length < 3) return {
      ok: true, issues: [], calibrationMode: 'separate-sheet', checkedPages: 0,
      digitalInkClearanceVerified: false, physicalScaleVerified: false, factoryApproved: false,
    }
    const pages = planSafeMarkerPdfPages20261024(marker, pageLengthCm, { calibration: true })
    if (!Array.isArray(pages) || !pages.length || pages.length > MAX_PAGES) throw Error('Invalid ruler page plan')
    if (pages.length * pieces.length > MAX_PAGE_PLACEMENT_PAIRS) throw Error('Ruler page/placement scan budget exceeded')
    const budget = { count: 0 }
    // SVG uses an unbounded generic font. 0.375 cm/glyph is an intentionally
    // conservative estimate for its 0.5 cm font; it is NOT a font-metrics proof.
    const svg = [
      { kind: 'SVG_RULER_STROKES', rect: rectangle(.5, 10.5, 1.8, 2.2, clearanceCm + .013) },
      { kind: 'SVG_RULER_TEXT_ESTIMATE', rect: rectangle(.5, .5 + LABEL.length * .375, 1, 1.5, clearanceCm) },
    ]
    // PDF has 7 pt Helvetica text, anchored 8 pt above the ruler baseline.
    // The label estimate matches the conservative width used for registration.
    const pdfForPage = page => [
      { kind: 'PDF_RULER_STROKES', rect: rectangle(.5, 10.5, page.startCm + 2 - 3 * 2.54 / 72, page.startCm + 2 + 3 * 2.54 / 72, clearanceCm + .008) },
      { kind: 'PDF_RULER_TEXT_ESTIMATE', rect: rectangle(.5, .5 + LABEL.length * .25, page.startCm + 2 - 15 * 2.54 / 72, page.startCm + 2 - 8 * 2.54 / 72, clearanceCm) },
    ]
    const inspect = (items, pageIndex, height, startCm) => {
      for (const { kind, rect } of items) {
        if (rect.x0 < -EPS || rect.x1 > marker.width + EPS || rect.y0 < startCm - EPS || rect.y1 > startCm + height + EPS)
          issues.push(issue('RULER_INK_OUT_OF_BOUNDS', kind, pageIndex))
        for (const p of pieces) {
          if (!touchesBounds(rect, p.bounds)) continue
          if (polygonTouchesRectangle(p.outline, rect, budget))
            issues.push(issue('RULER_INK_OVER_CUT_PIECE', `${kind} overlaps cutting piece ${p.index}`, pageIndex))
        }
      }
    }
    const inspectLabels = (rulers, pageIndex, startCm, endCm, isPdf) => {
      for (const p of pieces) {
        const baseline = p.y + 1.5
        if (isPdf && (baseline < startCm || baseline > endCm)) continue
        const label = isPdf ? `${p.name} / ${size} / ${p.instance + 1}` : `${p.name} ${size} #${p.instance + 1}`
        const widthPerGlyph = isPdf ? .35 : .75
        const height = isPdf ? .32 : 1.1
        const ink = rectangle(p.x + .5, p.x + .5 + label.length * widthPerGlyph,
          baseline - height, baseline + .08, clearanceCm)
        if (rulers.some(({ rect }) => touchesBounds(rect, ink)))
          issues.push(issue('RULER_OVERLAPS_PIECE_LABEL', `${isPdf ? 'PDF' : 'SVG'} ruler overlaps estimated label for piece ${p.index}`, pageIndex))
      }
    }
    inspect(svg, 0, marker.length, 0)
    inspectLabels(svg, 0, 0, marker.length, false)
    pages.forEach((page, index) => {
      if (!finite(page.startCm) || !finite(page.heightCm) || !finite(page.endCm) || page.heightCm < 3 - EPS)
        throw Error('Invalid calibrated ruler page')
      const pdfInk = pdfForPage(page)
      inspect(pdfInk, index + 1, page.heightCm, page.startCm)
      inspectLabels(pdfInk, index + 1, page.startCm, page.endCm, true)
    })
    return {
      ok: issues.length === 0, issues, calibrationMode: 'on-page', checkedPages: pages.length,
      digitalInkClearanceVerified: issues.length === 0, fontMetricsPhysicallyVerified: false,
      physicalScaleVerified: false, factoryApproved: false,
    }
  } catch (error) {
    return { ok: false, issues: [...issues, issue('INVALID_RULER_SOURCE', String(error.message || error))],
      digitalInkClearanceVerified: false, physicalScaleVerified: false, factoryApproved: false }
  }
}
