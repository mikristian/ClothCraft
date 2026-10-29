// Digital page-order and absolute-station witness for calibrated marker PDFs.
// PDF PageLabels are viewer metadata, NOT visible printed registration marks.
// This check does not establish physical print scale, alignment, or factory QA.
const station = value => Number(value.toFixed(6)).toString()
const escapePdf = value => String(value ?? '').normalize('NFKD').replace(/[^\x20-\x7e]/g, '?')
  .replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)')
const decode = value => typeof value === 'string' ? value
  : value instanceof Uint8Array ? new TextDecoder('utf-8', { fatal: true }).decode(value)
    : (() => { throw Error('PDF bytes required') })()
const requireValid = (condition, message) => { if (!condition) throw Error(message) }
const PAGE_LABELS = '/PageLabels << /Nums [0 << /S /D /St 1 /P (EXO Page ) >>] >>'
const PAGE = /(\d+) 0 obj\n(<< \/Type \/Page \/Parent 2 0 R [^\n]*>>)\nendobj/g
const META = /\/EXOPageIndex (\d+) \/EXOPageCount (\d+) \/EXOStartCm (-?[\d.]+) \/EXOEndCm (-?[\d.]+) \/EXOSize \(((?:\\.|[^\\)])*)\) \/EXOFabric \(((?:\\.|[^\\)])*)\) \/EXOProvenanceHex <([0-9a-f]+)> \/Resources /

/** Independently parses the supplied PDF rather than regenerating its bytes. */
export function auditMarkerPdfPageIdentity20261024(pdfBytes, pages, { size = 'BASE', fabricId = 'Fabric' } = {}) {
  const issues = []
  let inspectedPages = 0
  try {
    requireValid(Array.isArray(pages) && pages.length >= 1 && pages.length <= 2048,
      'Invalid expected page plan')
    requireValid(pages.every((page, i) => page && Number.isFinite(page.startCm) &&
      Number.isFinite(page.endCm) && page.startCm >= 0 && page.endCm > page.startCm &&
      (i === 0 ? page.startCm === 0 : Math.abs(page.startCm - pages[i - 1].endCm) < 1e-8)),
    'Expected page plan has invalid or discontinuous stations')
    const pdf = decode(pdfBytes)
    requireValid(pdf.startsWith('%PDF-1.4\n') && pdf.endsWith('%%EOF\n') && !/[^\x00-\x7f]/.test(pdf),
      'Invalid PDF envelope')
    // The token must belong to the Catalog dictionary. A comment or page
    // content stream containing the same text is not a valid PageLabels tree.
    const catalog = pdf.match(/(?:^|\n)1 0 obj\n(<< \/Type \/Catalog[^\n]*>>)\nendobj/)
    requireValid(catalog && (pdf.match(/\/Type \/Catalog\b/g) || []).length === 1 &&
      (catalog[1].match(/\/PageLabels\b/g) || []).length === 1 &&
      catalog[1].includes(` /Pages 2 0 R ${PAGE_LABELS} >>`),
    'PDF Catalog page labels missing, repeated, or misplaced')
    const pageTree = pdf.match(/\/Type \/Pages \/Kids \[([^\]]*)\] \/Count (\d+) >>/)
    requireValid(pageTree && Number(pageTree[2]) === pages.length, 'PDF page tree count differs')
    const objects = [...pdf.matchAll(PAGE)]
    requireValid(objects.length === pages.length && (pdf.match(/\/Type \/Page\b/g) || []).length === pages.length,
      'PDF page dictionary count differs')
    requireValid(pageTree[1].trim() === objects.map(match => `${match[1]} 0 R`).join(' '),
      'PDF page tree ordering differs from page dictionaries')
    for (let index = 0; index < objects.length; index++) {
      const dict = objects[index][2]
      for (const key of ['EXOPageIndex', 'EXOPageCount', 'EXOStartCm', 'EXOEndCm', 'EXOSize', 'EXOFabric', 'EXOProvenanceHex']) {
        requireValid((dict.match(new RegExp(`/${key}\\b`, 'g')) || []).length === 1,
          `PDF page ${index + 1} has missing or repeated ${key}`)
      }
      const metadata = dict.match(META)
      requireValid(metadata, `PDF page ${index + 1} identity metadata malformed`)
      requireValid(Number(metadata[1]) === index + 1 && Number(metadata[2]) === pages.length,
        `PDF page ${index + 1} sequence differs`)
      requireValid(metadata[3] === station(pages[index].startCm) &&
        metadata[4] === station(pages[index].endCm), `PDF page ${index + 1} absolute stations differ`)
      requireValid(metadata[5] === escapePdf(size) && metadata[6] === escapePdf(fabricId),
        `PDF page ${index + 1} size/fabric provenance differs`)
      const provenanceBytes = new TextEncoder().encode(JSON.stringify([String(size), String(fabricId)]))
      requireValid(provenanceBytes.length <= 2048, 'Expected PDF page provenance exceeds budget')
      const expectedHex = Array.from(provenanceBytes, byte => byte.toString(16).padStart(2, '0')).join('')
      requireValid(metadata[7] === expectedHex, `PDF page ${index + 1} exact UTF-8 provenance differs`)
      inspectedPages++
    }
  } catch (error) {
    issues.push({ code: 'PDF_PAGE_IDENTITY_INVALID', message: String(error.message || error) })
  }
  return { ok: issues.length === 0, issues, inspectedPages,
    digitalPageIdentityVerified: issues.length === 0, physicalRegistrationVerified: false, factoryApproved: false }
}
