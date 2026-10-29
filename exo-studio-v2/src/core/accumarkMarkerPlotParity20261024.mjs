import { markerToSvg, markerToPdf } from './markerArtifacts.js'
import { auditMarkerCalibrationSheet20261024 } from './accumarkMarkerCalibrationSheet20261024.mjs'
import { inspectMarkerPageBoundarySafety20261024 } from './accumarkMarkerPageBoundarySafety20261024.mjs'
import { planSafeMarkerPdfPages20261024 } from './accumarkMarkerSafePageBreaks20261024.mjs'
import { auditMarkerPdfPageIdentity20261024 } from './accumarkMarkerPdfPageIdentity20261024.mjs'
import { planPrintedMarkerPageRegistration20261024 } from './accumarkPrintedPageRegistration20261024.mjs'
import { auditMarkerRulerInkClearance20261024 } from './accumarkMarkerRulerInkClearance20261024.mjs'

const FACTOR = 72 / 2.54
const num = value => Number(Number(value).toFixed(4))
const close = (a, b, tolerance = 0.00012) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tolerance
const asText = value => typeof value === 'string' ? value : value instanceof Uint8Array ? new TextDecoder('utf-8', { fatal: true }).decode(value) : (() => { throw Error('Expected literal SVG/PDF bytes') })()
const requireMatch = (condition, message) => { if (!condition) throw Error(message) }
const EPS = 1e-7
const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
const onSegment = (a, b, p) => Math.abs(cross(a, b, p)) <= EPS && p.x >= Math.min(a.x, b.x) - EPS && p.x <= Math.max(a.x, b.x) + EPS && p.y >= Math.min(a.y, b.y) - EPS && p.y <= Math.max(a.y, b.y) + EPS
function intersects(a, b, c, d) {
  const abC = cross(a, b, c), abD = cross(a, b, d), cdA = cross(c, d, a), cdB = cross(c, d, b)
  if (((abC > EPS && abD < -EPS) || (abC < -EPS && abD > EPS)) && ((cdA > EPS && cdB < -EPS) || (cdA < -EPS && cdB > EPS))) return true
  return (Math.abs(abC) <= EPS && onSegment(a, b, c)) || (Math.abs(abD) <= EPS && onSegment(a, b, d)) || (Math.abs(cdA) <= EPS && onSegment(c, d, a)) || (Math.abs(cdB) <= EPS && onSegment(c, d, b))
}
function insideOrOn(point, polygon) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[j], b = polygon[i]
    if (onSegment(a, b, point)) return true
    if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}
function validateContour(outline, index) {
  requireMatch(outline.length <= 2000, `Contour ${index} exceeds verifier geometry budget`)
  let twiceArea = 0
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i], b = outline[(i + 1) % outline.length]
    requireMatch(Math.hypot(a.x - b.x, a.y - b.y) > EPS, `Contour ${index} has zero-length edge`)
    twiceArea += a.x * b.y - b.x * a.y
    for (let j = i + 1; j < outline.length; j++) {
      if (j === i + 1 || (i === 0 && j === outline.length - 1)) continue
      requireMatch(!intersects(a, b, outline[j], outline[(j + 1) % outline.length]), `Contour ${index} self-intersects`)
    }
  }
  requireMatch(Number.isFinite(twiceArea) && Math.abs(twiceArea) > EPS, `Contour ${index} has zero area`)
}
function validateNoOverlap(placements) {
  let comparisonBudget = 4_000_000
  for (let i = 0; i < placements.length; i++) for (let j = i + 1; j < placements.length; j++) {
    const a = placements[i].outline, b = placements[j].outline
    const ax = placements[i], bx = placements[j]
    if (ax.x + ax.width < bx.x - EPS || bx.x + bx.width < ax.x - EPS || ax.y + ax.height < bx.y - EPS || bx.y + bx.height < ax.y - EPS) continue
    comparisonBudget -= a.length * b.length
    requireMatch(comparisonBudget >= 0, 'Marker exceeds pairwise geometry comparison budget')
    for (let u = 0; u < a.length; u++) for (let v = 0; v < b.length; v++) requireMatch(!intersects(a[u], a[(u + 1) % a.length], b[v], b[(v + 1) % b.length]), `Contours ${i} and ${j} overlap or touch`)
    requireMatch(!insideOrOn(a[0], b) && !insideOrOn(b[0], a), `Contours ${i} and ${j} overlap by containment`)
  }
}

function checkSvg(marker, svg, inPageRuler = marker.width >= 11 && Math.max(1, marker.length) >= 3) {
  const tag = svg.match(/<svg\s+([^>]+)>/g) || []
  requireMatch(tag.length === 1 && svg.startsWith('<?xml ') && svg.endsWith('</svg>'), 'Invalid SVG document')
  const attrs = tag[0]
  const width = attrs.match(/\bwidth="([\d.]+)cm"/g) || []
  const height = attrs.match(/\bheight="([\d.]+)cm"/g) || []
  const view = attrs.match(/\bviewBox="([^"]+)"/g) || []
  requireMatch(width.length === 1 && height.length === 1 && view.length === 1, 'Missing or repeated SVG geometry attributes')
  const dimensions = view[0].slice(9, -1).split(/\s+/).map(Number)
  requireMatch(dimensions.length === 4 && close(dimensions[0], 0) && close(dimensions[1], 0) && close(dimensions[2], marker.width) && close(dimensions[3], Math.max(1, marker.length)) && close(Number(width[0].slice(7, -3)), marker.width) && close(Number(height[0].slice(8, -3)), Math.max(1, marker.length)), 'SVG dimensions or viewBox changed')
  const groups = [...svg.matchAll(/<g\b[^>]*id="cut-lines"[^>]*>([\s\S]*?)<\/g>/g)]
  requireMatch(groups.length === 1, 'Missing or duplicate SVG cut layer')
  const contents = groups[0][1]
  const polygons = [...contents.matchAll(/<polygon\s+[^>]*points="([^"]*)"[^>]*\/>/g)]
  requireMatch(contents.replace(/<polygon\s+[^>]*\/>/g, '').trim() === '', 'Unexpected SVG cut elements')
  requireMatch(polygons.length === marker.placements.length && (svg.match(/<polygon\b/g) || []).length === polygons.length, 'SVG cut polygon count differs')
  polygons.forEach((match, i) => {
    const got = match[1].trim().split(/\s+/).map(pair => pair.split(',').map(Number))
    const expected = marker.placements[i].outline
    requireMatch(got.length === expected.length && got.length >= 3, `SVG contour ${i} vertex count differs`)
    got.forEach(([x, y], j) => requireMatch(close(x, num(expected[j].x)) && close(y, num(expected[j].y)), `SVG contour ${i} vertex ${j} differs`))
  })
  const rulers = [...svg.matchAll(/<g id="print-scale-check"[^>]*>([\s\S]*?)<\/g>/g)]
  const shouldRuler = inPageRuler
  requireMatch(rulers.length === Number(shouldRuler), 'SVG 100mm ruler missing or unexpected')
  if (shouldRuler) {
    const lines = [...rulers[0][1].matchAll(/<line\s+([^>]+)\/>/g)]
    requireMatch(lines.length === 3, 'SVG scale ruler line count differs')
    const line = lines[0][1]
    const get = key => Number(line.match(new RegExp(`\\b${key}="([^"]+)"`))?.[1])
    requireMatch(close(get('x1'), 0.5) && close(get('x2'), 10.5) && close(get('y1'), 2) && close(get('y2'), 2), 'SVG 100mm ruler distorted')
  }
}

function checkPdf(marker, pdf, pageLengthCm, size, requirePrintedRegistration = false, inPageRuler = marker.width >= 11 && marker.length >= 3) {
  requireMatch(pdf.startsWith('%PDF-1.4\n') && pdf.endsWith('%%EOF\n') && !/[^\x00-\x7f]/.test(pdf), 'Invalid PDF envelope')
  const pages = [...pdf.matchAll(/\d+ 0 obj\n<< \/Type \/Page \/Parent 2 0 R \/MediaBox \[0 0 ([\d.]+) ([\d.]+)\] [^\n]*?\/Contents (\d+) 0 R >>\nendobj/g)]
  const planned = planSafeMarkerPdfPages20261024(marker, pageLengthCm, {
    calibration: marker.width >= 11 && marker.length >= 3,
  })
  const printed = planPrintedMarkerPageRegistration20261024(marker, planned, {
    size, fabricId: marker.fabricId || 'Fabric', includeRuler: inPageRuler,
  })
  requireMatch(printed.ok || !requirePrintedRegistration,
    `Unsafe printable PDF registration: ${printed.issues.map(issue => issue.code).join(', ')}`)
  const count = planned.length
  const identity = auditMarkerPdfPageIdentity20261024(pdf, planned, { size, fabricId: marker.fabricId || 'Fabric' })
  requireMatch(identity.ok, `PDF page identity/station verification failed: ${identity.issues.map(issue => issue.message).join('; ')}`)
  requireMatch(pages.length === count && (pdf.match(/\/Type \/Page\b/g) || []).length === count, 'PDF page count differs')
  requireMatch(new RegExp(`/Count ${count} >>`).test(pdf), 'PDF page tree count differs')
  pages.forEach((match, index) => {
    const start = planned[index].startCm
    const end = planned[index].endCm
    const height = planned[index].heightCm
    const expectedHeight = num(height * FACTOR)
    const expectedWidth = num(marker.width * FACTOR)
    requireMatch(close(Number(match[1]), expectedWidth) && close(Number(match[2]), expectedHeight), `PDF page ${index} MediaBox differs`)
    const stream = pdf.match(new RegExp(`${match[3]} 0 obj\\n<< \\/Length (\\d+) >>\\nstream\\n([\\s\\S]*?)endstream\\nendobj`))
    requireMatch(stream && Number(stream[1]) === stream[2].length, `PDF page ${index} stream length differs`)
    const lines = stream[2].trimEnd().split('\n')
    requireMatch(lines[0] === 'q' && lines.at(-1) === 'Q', `PDF page ${index} graphics state differs`)
    requireMatch(lines[1] === `0 0 ${expectedWidth} ${expectedHeight} re W n` && lines[4] === `0 0 ${expectedWidth} ${expectedHeight} re S`, `PDF page ${index} clipping or border differs`)
    const actualPaths = []
    for (let j = 0; j < lines.length; j++) {
      if (lines[j] !== 'h S') continue
      const points = []
      let k = j - 1
      while (k >= 0 && /^[-\d.]+ [-\d.]+ [ml]$/.test(lines[k])) k--
      for (const line of lines.slice(k + 1, j)) {
        const [x, y, op] = line.split(' ')
        requireMatch(op === (points.length ? 'l' : 'm'), 'PDF cut path order differs')
        points.push([Number(x), Number(y)])
      }
      actualPaths.push(points)
    }
    const visible = marker.placements.filter(p => p.outline.length >= 3 && !(p.y + p.height < start || p.y > end))
    requireMatch(actualPaths.length === visible.length && (stream[2].match(/\bh S\b/g) || []).length === visible.length, `PDF page ${index} closed cut path count differs`)
    actualPaths.forEach((path, i) => {
      const outline = visible[i].outline
      requireMatch(path.length === outline.length, `PDF page ${index} contour ${i} vertex count differs`)
      path.forEach(([x, y], j) => requireMatch(close(x, num(outline[j].x * FACTOR)) && close(y, num((height - (outline[j].y - start)) * FACTOR)), `PDF page ${index} contour ${i} vertex ${j} differs`))
    })
    const ruler = inPageRuler && height >= 3
    const label = '(100 mm SCALE CHECK - VERIFY WITH RULER) Tj ET'
    requireMatch(lines.filter(line => line.endsWith(label)).length === Number(ruler), `PDF page ${index} 100mm ruler label differs`)
    if (ruler) {
      const x1 = num(0.5 * FACTOR), x2 = num(10.5 * FACTOR), y = num((height - 2) * FACTOR)
      requireMatch(lines.includes(`${x1} ${y} m ${x2} ${y} l S`), `PDF page ${index} 100mm ruler length differs`)
      requireMatch(lines.includes(`${x1} ${num(y - 3)} m ${x1} ${num(y + 3)} l S`) && lines.includes(`${x2} ${num(y - 3)} m ${x2} ${num(y + 3)} l S`), `PDF page ${index} ruler ticks differ`)
    }
    const targets = printed.ok ? printed.pages[index].targets : []
    const begin = `% EXO_PRINTED_REGISTRATION_BEGIN P${index + 1}`
    const finish = `% EXO_PRINTED_REGISTRATION_END P${index + 1}`
    if (targets.length) {
      const expected = [begin, '0.2 G 0.35 w']
      const mapped = p => [num(p.x * FACTOR), num((height - p.y) * FACTOR)]
      const escaped = value => value.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)')
      for (const target of targets) {
        for (const [a, b] of target.segments) {
          const [x1, y1] = mapped(a), [x2, y2] = mapped(b)
          expected.push(`${x1} ${y1} m ${x2} ${y2} l S`)
        }
        const [x, y] = mapped(target.label)
        expected.push(`BT /F1 7 Tf ${x} ${y} Td (${escaped(target.label.text)}) Tj ET`)
      }
      expected.push(finish)
      const at = lines.indexOf(begin)
      requireMatch(at >= 0 && lines.slice(at, at + expected.length).every((line, i) => line === expected[i]) &&
        lines.filter(line => line === begin || line === finish).length === 2,
      `PDF page ${index} printable registration ink differs`)
    } else {
      requireMatch(!lines.some(line => line.startsWith('% EXO_PRINTED_REGISTRATION_')),
        `PDF page ${index} unexpected printable registration ink`)
    }
  })
  return printed.ok && planned.length > 1
}

/** Checks the supplied exported artifacts, without manufacturing approval. */
export function auditMarkerPlotParity20261024(marker, { svg, pdf = null, size = 'BASE', fabricName = marker?.fabricId || 'Fabric', project = null, pageLengthCm = 400, calibrationSheet = null, requirePrintedRegistration = false, separateCalibrationSheet = false, requireRulerInkClearance = false } = {}) {
  const issues = []
  let printableRegistrationTargetsVerified = false
  const check = (code, fn) => { try { fn() } catch (error) { issues.push({ code, message: String(error.message || error) }) } }
  check('INVALID_MARKER', () => {
    requireMatch(marker && Number.isFinite(marker.width) && marker.width > 0 && Number.isFinite(marker.length) && marker.length >= 0 && Array.isArray(marker.placements), 'Invalid in-memory marker')
    // The legacy SVG writer clamps document height to 1 cm. A populated
    // sub-1 cm marker would otherwise pass exact-byte checks while its SVG
    // and PDF physically disagree on the marker length. Refuse until the
    // renderer and receiving plotter protocol both support that geometry.
    requireMatch(!marker.placements.length || marker.length >= 1, 'Populated marker below 1 cm cannot preserve SVG/PDF physical page parity')
    for (const [index, p] of marker.placements.entries()) {
      requireMatch(p && Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.width) && Number.isFinite(p.height) && p.width > 0 && p.height > 0 && Array.isArray(p.outline) && p.outline.length >= 3 && p.outline.every(v => Number.isFinite(v.x) && Number.isFinite(v.y)), 'Invalid placement outline')
      const xs = p.outline.map(v => v.x), ys = p.outline.map(v => v.y)
      const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys)
      requireMatch(minX >= -0.0001 && maxX <= marker.width + 0.0001 && minY >= -0.0001 && maxY <= marker.length + 0.0001, 'Placement is clipped by marker/page bounds')
      requireMatch(close(minX, p.x) && close(maxX, p.x + p.width) && close(minY, p.y) && close(maxY, p.y + p.height), 'Placement bounds differ from cut contour')
      validateContour(p.outline, index)
    }
    validateNoOverlap(marker.placements)
  })
  if (issues.length) return { ok: false, issues, factoryApproved: false }
  const inPageRuler = !separateCalibrationSheet && marker.width >= 11 && Math.max(1, marker.length) >= 3
  check('PAGE_REGISTRATION', () => {
    if (!marker.placements.length) return
    const pages = planSafeMarkerPdfPages20261024(marker, pageLengthCm, {
      calibration: marker.width >= 11 && marker.length >= 3,
    })
    const registration = inspectMarkerPageBoundarySafety20261024(marker, pages)
    requireMatch(registration.ok, `Unsafe unregistered page cut: ${registration.issues.map(issue => issue.code).join(', ')}`)
  })
  check('MISSING_CALIBRATION', () => {
    if (!inPageRuler) {
      requireMatch(calibrationSheet !== null, 'Narrow/short marker requires a separate 100mm X/Y calibration sheet')
      const sheetAudit = auditMarkerCalibrationSheet20261024(calibrationSheet, { size, fabricId: marker.fabricId || 'Fabric' })
      requireMatch(sheetAudit.ok, `Separate calibration sheet failed: ${sheetAudit.issues.map(issue => issue.message).join('; ')}`)
    } else {
      requireMatch(calibrationSheet === null, 'Unexpected separate calibration sheet for marker with on-page ruler')
    }
    if (inPageRuler && marker.placements.length) {
      const pages = planSafeMarkerPdfPages20261024(marker, pageLengthCm, { calibration: true })
      pages.forEach((page, index) => requireMatch(page.heightCm >= 3 - 1e-8, `PDF page ${index} cannot contain a 100mm ruler`))
    }
  })
  if (requireRulerInkClearance && inPageRuler) check('RULER_INK_CLEARANCE', () => {
    const clearance = auditMarkerRulerInkClearance20261024(marker, { pageLengthCm, size })
    requireMatch(clearance.ok && clearance.digitalInkClearanceVerified,
      `Unsafe in-page calibration ink: ${clearance.issues.map(issue => `${issue.code}: ${issue.detail}`).join('; ')}`)
  })
  check('SVG_PARITY', () => {
    const supplied = asText(svg)
    checkSvg(marker, supplied, inPageRuler)
    requireMatch(supplied === markerToSvg(marker, { size, fabricName, project, calibration: true, separateCalibrationSheet }), 'SVG contains extra or changed elements')
  })
  check('PDF_PARITY', () => {
    if (!marker.placements.length) { requireMatch(pdf === null || pdf === undefined, 'Unexpected PDF for empty marker'); return }
    requireMatch(marker.length > 0 && pdf !== null && pdf !== undefined, 'PDF missing for populated marker')
    const supplied = asText(pdf)
    printableRegistrationTargetsVerified = checkPdf(marker, supplied, pageLengthCm, size, requirePrintedRegistration, inPageRuler)
    const canonical = markerToPdf(marker, { size, project, pageLengthCm, calibration: true, requirePrintedRegistration, separateCalibrationSheet })
    requireMatch(supplied === asText(canonical), 'PDF includes altered graphics, structure or metadata')
  })
  return { ok: issues.length === 0, issues, checkedPlacements: marker.placements.length, calibrationMode: inPageRuler ? 'on-page' : 'separate-sheet', rulerInkClearanceVerified: issues.length === 0 && requireRulerInkClearance && inPageRuler, separateCalibrationSheetVerified: issues.length === 0 && !inPageRuler, digitalPageIdentityVerified: issues.length === 0 && pdf !== null && pdf !== undefined, printableRegistrationTargetsVerified: issues.length === 0 && printableRegistrationTargetsVerified, physicalRegistrationVerified: false, factoryApproved: false }
}
