// Separate, two-axis 100 mm print witness for markers too narrow/short to
// contain an in-page ruler. It is NOT a cutter pattern or physical approval.
const PT_PER_CM = 72 / 2.54
const format = value => Number(value.toFixed(4)).toString()
const escapeXml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char])
const escapePdf = value => String(value).normalize('NFKD').replace(/[^\x20-\x7e]/g, '?').replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)')
const point = cm => format(cm * PT_PER_CM)
const LABEL = '100 mm X AND Y - MEASURE PRINTED SHEET'
const WIDTH_CM = 12
const HEIGHT_CM = 12

export function makeMarkerCalibrationSheet20261024({ size = 'BASE', fabricId = 'Fabric' } = {}) {
  const title = `EXO print calibration ${String(size)} / ${String(fabricId)}`
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="12cm" height="12cm" viewBox="0 0 12 12"><title>${escapeXml(title)}</title><desc>Separate 100 mm X and Y ruler; print with the SAME settings as the marker. NOT A CUT PATTERN. Verify physically.</desc><rect x="0" y="0" width="12" height="12" fill="white" stroke="#555" stroke-width="0.025"/><g id="calibration-only" stroke="#111" stroke-width="0.035"><line id="ruler-x" x1="1" y1="11" x2="11" y2="11"/><line id="ruler-y" x1="1" y1="11" x2="1" y2="1"/><line x1="1" y1="10.8" x2="1" y2="11.2"/><line x1="11" y1="10.8" x2="11" y2="11.2"/><line x1="0.8" y1="1" x2="1.2" y2="1"/><line x1="0.8" y1="11" x2="1.2" y2="11"/></g><text x="1.5" y="2" font-size="0.35">100 mm X and Y - measure printed sheet</text><text x="1.5" y="2.6" font-size="0.3">NOT CUT DATA - physical scale unverified</text></svg>`

  const x1 = point(1), x2 = point(11), y1 = point(1), y2 = point(11)
  const lines = [
    'q', `0 0 ${point(WIDTH_CM)} ${point(HEIGHT_CM)} re W n`,
    '0.4 G 0.4 w',
    `${x1} ${y1} m ${x2} ${y1} l S`,
    `${x1} ${y1} m ${x1} ${y2} l S`,
    `${x1} ${point(0.8)} m ${x1} ${point(1.2)} l S`,
    `${x2} ${point(0.8)} m ${x2} ${point(1.2)} l S`,
    `${point(0.8)} ${y1} m ${point(1.2)} ${y1} l S`,
    `${point(0.8)} ${y2} m ${point(1.2)} ${y2} l S`,
    `BT /F1 7 Tf ${point(1.5)} ${point(9.5)} Td (${escapePdf(LABEL)}) Tj ET`,
    `BT /F1 6 Tf ${point(1.5)} ${point(9)} Td (NOT CUT DATA - physical scale unverified) Tj ET`,
    `BT /F1 5 Tf ${point(1.5)} ${point(8.5)} Td (${escapePdf(title.slice(0, 60))}) Tj ET`,
    'Q',
  ]
  const content = lines.join('\n') + '\n'
  const objects = [null,
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [4 0 R] /Count 1 >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${point(WIDTH_CM)} ${point(HEIGHT_CM)}] /Resources << /Font << /F1 3 0 R >> >> /Contents 5 0 R >>`,
    `<< /Length ${content.length} >>\nstream\n${content}endstream`,
  ]
  // Bind the PDF to the exact size/fabric identity. A geometrically identical
  // witness from a different job must not pass provenance/byte parity.
  const provenance = encodeURIComponent(JSON.stringify([String(size), String(fabricId)]))
  let pdf = `%PDF-1.4\n%EXO calibration sheet - NOT CUT DATA\n%EXO job ${provenance}\n`
  const offsets = [0]
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = pdf.length
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`
  }
  const xref = pdf.length
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`
  for (let id = 1; id < objects.length; id++) pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return { svg, pdf: new TextEncoder().encode(pdf) }
}

const decode = bytes => bytes instanceof Uint8Array ? new TextDecoder('utf-8', { fatal: true }).decode(bytes) : typeof bytes === 'string' ? bytes : null
const near = (a, b) => Number.isFinite(a) && Math.abs(a - b) < 0.0002

export function auditMarkerCalibrationSheet20261024(sheet, options = {}) {
  const issues = []
  try {
    const svg = decode(sheet?.svg), pdf = decode(sheet?.pdf)
    if (!svg || !pdf) throw Error('Both calibration SVG and PDF are required')
    const expected = makeMarkerCalibrationSheet20261024(options)
    const expectedPdf = decode(expected.pdf)
    const dims = svg.match(/<svg\b[^>]*width="([\d.]+)cm" height="([\d.]+)cm" viewBox="0 0 ([\d.]+) ([\d.]+)"/)
    if (!dims || !dims.slice(1).every(value => near(Number(value), 12))) throw Error('Calibration SVG physical dimensions differ')
    const x = svg.match(/<line id="ruler-x" x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"/)
    const y = svg.match(/<line id="ruler-y" x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"/)
    if (!x || !y || !near(Number(x[3]) - Number(x[1]), 10) || !near(Number(y[2]) - Number(y[4]), 10)) throw Error('Calibration SVG 100mm X/Y axes differ')
    const media = pdf.match(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/)
    if (!media || !near(Number(media[1]), 12 * PT_PER_CM) || !near(Number(media[2]), 12 * PT_PER_CM) || !pdf.includes('/Count 1 >>')) throw Error('Calibration PDF page size differs')
    const rulerX = `${point(1)} ${point(1)} m ${point(11)} ${point(1)} l S`
    const rulerY = `${point(1)} ${point(1)} m ${point(1)} ${point(11)} l S`
    if (!pdf.includes(rulerX) || !pdf.includes(rulerY)) throw Error('Calibration PDF 100mm X/Y axes differ')
    if (svg !== expected.svg || pdf !== expectedPdf) throw Error('Calibration sheet bytes changed or contain extra elements')
  } catch (error) { issues.push({ code: 'CALIBRATION_SHEET_INVALID', message: String(error.message || error) }) }
  return { ok: issues.length === 0, issues, physicalScaleVerified: false, factoryApproved: false }
}
