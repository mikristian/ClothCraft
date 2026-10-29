import { markerPdfCoordinates } from './rustMarkerKernel.js'
import { edgeLength, edgePointAt, samplePieceBoundary, seamAllowanceBoundary } from './project.js'
import { planCalibratedMarkerPdfPages20261024 } from './accumarkMarkerCalibrationPagination20261024.mjs'
import { inspectMarkerPageBoundarySafety20261024 } from './accumarkMarkerPageBoundarySafety20261024.mjs'
import { planSafeMarkerPdfPages20261024 } from './accumarkMarkerSafePageBreaks20261024.mjs'
import { planPrintedMarkerPageRegistration20261024 } from './accumarkPrintedPageRegistration20261024.mjs'

// Vector plot outputs use centimeters as document coordinates. The PDF uses
// 72 / 2.54 points per centimeter and true-size MediaBox dimensions.
const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char])
const plain = (value) => String(value ?? '').normalize('NFKD').replace(/[^\x20-\x7e]/g, '?')
const number = (value) => Number(value.toFixed(4)).toString()
const station = (value) => Number(value.toFixed(6)).toString()

function annotations(marker, project) {
  if (!project) return []
  const pieces = new Map((project.pieces || []).map((piece) => [piece.id, piece]))
  return (marker.placements || []).flatMap((placement) => {
    const piece = pieces.get(placement.pieceId)
    if (!piece || !Array.isArray(piece.points) || piece.points.length < 3) return []
    const degrees = Number(placement.rotationDeg || 0) * Math.PI / 180
    const c = Math.cos(degrees)
    const s = Math.sin(degrees)
    const rotated = seamAllowanceBoundary(piece, 10).map((point) => ({ x: point.x * c - point.y * s, y: point.x * s + point.y * c }))
    if (rotated.length < 3) return []
    const minX = Math.min(...rotated.map((point) => point.x))
    const minY = Math.min(...rotated.map((point) => point.y))
    const translate = (point) => ({
      x: placement.x + point.x * c - point.y * s - minX,
      y: placement.y + point.x * s + point.y * c - minY,
    })
    const sampled = samplePieceBoundary(piece, 10).points
    if (!sampled.length) return []
    const x = sampled.reduce((sum, point) => sum + point.x, 0) / sampled.length
    const y = sampled.reduce((sum, point) => sum + point.y, 0) / sampled.length
    const ys = sampled.map((point) => point.y)
    const half = Math.max(2, (Math.max(...ys) - Math.min(...ys)) * 0.28)
    const grainAngle = Number(piece.grainAngleDeg || 0) * Math.PI / 180
    const dx = Math.sin(grainAngle) * half
    const dy = Math.cos(grainAngle) * half
    const grain = [translate({ x: x - dx, y: y - dy }), translate({ x: x + dx, y: y + dy })]
    const notches = []
    for (const notch of piece.notches || []) {
      const edgeIndex = Number(notch.edgeIndex)
      if (!Number.isInteger(edgeIndex) || edgeIndex < 0 || edgeIndex >= piece.points.length) continue
      const t = Number(notch.t ?? 0.5)
      const gap = Math.min(0.045, 0.38 / Math.max(0.1, edgeLength(piece, edgeIndex)))
      for (const fraction of (notch.type === 'double' ? [t - gap, t + gap] : [t])) {
        const located = edgePointAt(piece, edgeIndex, Math.max(0, Math.min(1, fraction)), 48)
        if (!located) continue
        const depth = Number(notch.depthCm ?? 0.45)
        notches.push([
          translate({ x: located.point.x - located.normal.x * depth * 0.15, y: located.point.y - located.normal.y * depth * 0.15 }),
          translate({ x: located.point.x + located.normal.x * depth, y: located.point.y + located.normal.y * depth }),
        ])
      }
    }
    return [{ grain, notches }]
  })
}

export function markerToSvg(marker, { size = 'BASE', fabricName = marker.fabricId || 'Fabric', project = null, calibration = false, separateCalibrationSheet = false } = {}) {
  const width = Number(marker.width)
  const length = Math.max(1, Number(marker.length))
  if (!(width > 0) || !(length > 0) || !Number.isFinite(length)) throw new Error('Invalid marker dimensions')
  const polygons = (marker.placements || []).map((placement) => {
    const points = (placement.outline || []).map((p) => `${number(p.x)},${number(p.y)}`).join(' ')
    return `<polygon fill="none" stroke="#111" stroke-width="0.04" points="${points}"/>`
  }).join('')
  const overlay = annotations(marker, project)
  const labels = (marker.placements || []).map((placement) => `<text x="${number(placement.x + 0.5)}" y="${number(placement.y + 1.5)}" font-size="1.1" fill="#111">${safe(`${placement.name} ${size} #${placement.instance + 1}`)}</text>`).join('')
  const lines = (segments) => segments.map(([a, b]) => `<line x1="${number(a.x)}" y1="${number(a.y)}" x2="${number(b.x)}" y2="${number(b.y)}"/>`).join('')
  const grains = lines(overlay.map(({ grain }) => grain))
  const notches = lines(overlay.flatMap(({ notches }) => notches))
  const scale = calibration && !separateCalibrationSheet && width >= 11 && length >= 3
    ? `<g id="print-scale-check" stroke="#555" stroke-width="0.025"><line x1="0.5" y1="2" x2="10.5" y2="2"/><line x1="0.5" y1="1.8" x2="0.5" y2="2.2"/><line x1="10.5" y1="1.8" x2="10.5" y2="2.2"/><text x="0.5" y="1.5" font-size="0.5" stroke="none" fill="#555">100 mm SCALE CHECK - VERIFY WITH RULER</text></g>`
    : ''
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${number(width)}cm" height="${number(length)}cm" viewBox="0 0 ${number(width)} ${number(length)}"><title>${safe(`Marker ${fabricName} ${size}`)}</title><desc>True-size SVG; print at 100%. ${marker.unusedPieces} unplaced pieces. Cut and annotation groups remain separate.</desc><rect x="0" y="0" width="${number(width)}" height="${number(length)}" fill="white" stroke="black" stroke-width="0.05"/><g id="cut-lines">${polygons}</g><g id="grain-lines" stroke="#666" stroke-width="0.035" stroke-dasharray="0.5 0.25">${grains}</g><g id="notch-marks" stroke="red" stroke-width="0.045">${notches}</g><g id="labels">${labels}</g>${scale}</svg>`
}

const pdfEscape = (input) => plain(input).replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)')

function pdfPage(marker, size, page, overlay, calibration = false, printedRegistration = null) {
  const widthCm = marker.width
  const startCm = page.startCm
  const endCm = page.endCm
  const heightCm = page.heightCm
  const placements = marker.placements || []
  // Ignore off-page and degenerate outlines before reading their coordinates;
  // the original writer never evaluated skipped placement geometry.
  const visible = placements.filter(placement => {
    const points = placement.outline || []
    return points.length >= 3 && !(placement.y + placement.height < startCm || placement.y > endCm)
  })
  const labels = new Map(visible.filter(placement => placement.y + 1.5 >= startCm && placement.y + 1.5 <= endCm)
    .map(placement => [placement, { x: placement.x + 0.5, y: placement.y + 1.5 }]))
  const dimensions = { x: widthCm, y: startCm }
  const source = [dimensions, ...visible.flatMap(placement => placement.outline || []),
    ...labels.values(), ...overlay.flatMap(({ grain, notches }) => [...grain, ...notches.flat()])]
  const mapped = markerPdfCoordinates(source, heightCm, startCm)
  const coordinates = new Map(source.map((point, index) => [point, mapped[index]]))
  const printable = point => coordinates.get(point)
  const { x: widthPt, y: heightPt } = printable(dimensions)
  const path = [`q`, `0 0 ${number(widthPt)} ${number(heightPt)} re W n`, '0 G', '0.45 w', `0 0 ${number(widthPt)} ${number(heightPt)} re S`]
  for (const placement of marker.placements || []) {
    const points = placement.outline || []
    if (points.length < 3 || placement.y + placement.height < startCm || placement.y > endCm) continue
    for (let i = 0; i < points.length; i += 1) {
      const point = points[i]
      const { x, y } = printable(point)
      path.push(`${number(x)} ${number(y)} ${i ? 'l' : 'm'}`)
    }
    path.push('h S')
    if (placement.y + 1.5 >= startCm && placement.y + 1.5 <= endCm) {
      const { x, y } = printable(labels.get(placement))
      path.push(`BT /F1 9 Tf ${number(x)} ${number(y)} Td (${pdfEscape(`${placement.name} / ${size} / ${placement.instance + 1}`)}) Tj ET`)
    }
  }
  // Grainlines and explicit matched notches are ink annotations, not extra cut
  // paths. Cutter consumers should use the dedicated SVG/DXF geometry layers.
  for (const { grain, notches } of overlay) {
    path.push('[4 3] 0 d 0.5 w')
    const a = printable(grain[0]); const b = printable(grain[1])
    path.push(`${number(a.x)} ${number(a.y)} m ${number(b.x)} ${number(b.y)} l S`)
    path.push('[] 0 d')
    for (const notch of notches) {
      const a = printable(notch[0]); const b = printable(notch[1])
      path.push(`${number(a.x)} ${number(a.y)} m ${number(b.x)} ${number(b.y)} l S`)
    }
  }
  if (calibration && marker.width >= 11 && heightCm >= 3) {
    // A 100 mm ruler on each plot page; it is a separate ink annotation,
    // not a cut contour. The baseline export remains byte-identical by default.
    const scalePts = markerPdfCoordinates([{ x: 0.5, y: 2 + startCm }, { x: 10.5, y: 2 + startCm }], heightCm, startCm)
    const y = number(scalePts[0].y)
    const x1 = number(scalePts[0].x)
    const x2 = number(scalePts[1].x)
    path.push('0.4 G 0.4 w', `${x1} ${y} m ${x2} ${y} l S`,
      `${x1} ${number(scalePts[0].y - 3)} m ${x1} ${number(scalePts[0].y + 3)} l S`,
      `${x2} ${number(scalePts[1].y - 3)} m ${x2} ${number(scalePts[1].y + 3)} l S`,
      `BT /F1 7 Tf ${x1} ${number(scalePts[0].y + 8)} Td (100 mm SCALE CHECK - VERIFY WITH RULER) Tj ET`)
  }
  if (printedRegistration?.targets?.length) {
    // Open ink strokes and visible page/station labels; never cutting paths.
    // A successful digital ink plan does not prove physical plotter alignment.
    const mappedLocal = p => markerPdfCoordinates([{ x: p.x, y: p.y + startCm }], heightCm, startCm)[0]
    path.push(`% EXO_PRINTED_REGISTRATION_BEGIN P${printedRegistration.pageIndex}`, '0.2 G 0.35 w')
    for (const target of printedRegistration.targets) {
      for (const [a, b] of target.segments) {
        const start = mappedLocal(a); const end = mappedLocal(b)
        path.push(`${number(start.x)} ${number(start.y)} m ${number(end.x)} ${number(end.y)} l S`)
      }
      const label = mappedLocal(target.label)
      path.push(`BT /F1 7 Tf ${number(label.x)} ${number(label.y)} Td (${pdfEscape(target.label.text)}) Tj ET`)
    }
    path.push(`% EXO_PRINTED_REGISTRATION_END P${printedRegistration.pageIndex}`)
  }
  path.push('Q')
  return { widthPt, heightPt, content: path.join('\n') + '\n' }
}

// Zero external PDF dependencies, and every byte is ASCII so xref offsets are
// byte-exact. Calibrated long markers choose deterministic, contour-safe page
// breaks; legacy uncalibrated previews retain their original pagination.
export function markerToPdf(marker, { size = 'BASE', pageLengthCm = 400, project = null, calibration = false, requirePrintedRegistration = false, separateCalibrationSheet = false } = {}) {
  if (!Number.isFinite(marker?.width) || marker.width <= 0 || !Number.isFinite(marker?.length) || marker.length <= 0) {
    throw new Error('Cannot print an empty or invalid marker')
  }
  // Narrow/short markers cannot contain an in-page 100 mm horizontal ruler.
  // Their separate, independently audited calibration sheet is packaged by
  // the factory exporter; never stretch the actual cutting marker to fit it.
  const pages = calibration
    ? planSafeMarkerPdfPages20261024(marker, pageLengthCm, {
      calibration: marker.width >= 11 && marker.length >= 3,
    })
    : planCalibratedMarkerPdfPages20261024(marker.length, pageLengthCm, { calibration: false })
  if (calibration) {
    const registration = inspectMarkerPageBoundarySafety20261024(marker, pages)
    // The shared factory parity gate rejects malformed contours. The PDF
    // writer only changes its previous behavior for unsafe page boundaries,
    // preserving existing adversarial fixtures that generate invalid source
    // geometry before independently auditing it.
    const boundaryIssues = registration.issues.filter(issue => issue.code !== 'INVALID_CUT_CONTOUR')
    if (boundaryIssues.length) throw new Error(`Unsafe PDF page break through cutting geometry: ${boundaryIssues.map(issue => issue.code).join(', ')}`)
  }
  const printedRegistration = calibration
    ? planPrintedMarkerPageRegistration20261024(marker, pages, {
      size, fabricId: marker.fabricId || 'Fabric',
      includeRuler: !separateCalibrationSheet && marker.width >= 11 && marker.length >= 3,
    })
    : null
  if (printedRegistration && !printedRegistration.ok && requirePrintedRegistration) {
    throw new Error(`Unsafe printable PDF registration: ${printedRegistration.issues.map(issue => issue.code).join(', ')}`)
  }
  const count = pages.length
  // PDF literal strings are ASCII fallbacks; this separate UTF-8 hex token
  // preserves the exact size/fabric identity even for non-ASCII labels.
  const identityBytes = calibration
    ? new TextEncoder().encode(JSON.stringify([String(size), String(marker.fabricId || 'Fabric')])) : null
  if (identityBytes && identityBytes.length > 2048) throw new RangeError('PDF page identity exceeds provenance budget')
  const identityHex = identityBytes
    ? Array.from(identityBytes, byte => byte.toString(16).padStart(2, '0')).join('') : ''
  const objects = []
  // Object numbers 1 = Catalog, 2 = Pages, 3 = Font, then each page/content.
  // PageLabels are visible in PDF viewers, while explicit page dictionaries
  // retain global cutting stations even when two pages have equal dimensions.
  // Neither is a printed registration mark or evidence of plotter alignment.
  objects[1] = calibration
    ? '<< /Type /Catalog /Pages 2 0 R /PageLabels << /Nums [0 << /S /D /St 1 /P (EXO Page ) >>] >> >>'
    : '<< /Type /Catalog /Pages 2 0 R >>'
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  const pageRefs = []
  for (let index = 0; index < count; index += 1) {
    const page = pdfPage(marker, size, pages[index], annotations(marker, project), calibration && !separateCalibrationSheet,
      printedRegistration?.ok ? printedRegistration.pages[index] : null)
    const pageNumber = 4 + index * 2
    pageRefs.push(`${pageNumber} 0 R`)
    const identity = calibration
      ? ` /EXOPageIndex ${index + 1} /EXOPageCount ${count} /EXOStartCm ${station(pages[index].startCm)} /EXOEndCm ${station(pages[index].endCm)} /EXOSize (${pdfEscape(size)}) /EXOFabric (${pdfEscape(marker.fabricId || 'Fabric')}) /EXOProvenanceHex <${identityHex}>`
      : ''
    objects[pageNumber] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${number(page.widthPt)} ${number(page.heightPt)}]${identity} /Resources << /Font << /F1 3 0 R >> >> /Contents ${pageNumber + 1} 0 R >>`
    objects[pageNumber + 1] = `<< /Length ${page.content.length} >>\nstream\n${page.content}endstream`
  }
  objects[2] = `<< /Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${count} >>`
  let pdf = '%PDF-1.4\n%Garment Studio marker plot\n'
  const offsets = [0]
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = pdf.length
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`
  }
  const startXref = pdf.length
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`
  for (let id = 1; id < objects.length; id += 1) pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`
  return new TextEncoder().encode(pdf)
}
