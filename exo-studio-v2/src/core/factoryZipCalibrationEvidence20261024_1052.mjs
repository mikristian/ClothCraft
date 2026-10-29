import { auditFactoryZipConditionalInventory20261024_1000 } from './factoryZipConditionalInventory20261024_1000.mjs'
import { auditMarkerCalibrationSheet20261024 } from './accumarkMarkerCalibrationSheet20261024.mjs'

const decoder = new TextDecoder('utf-8', { fatal: true })
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key)
const get = (object, key) => {
  if (!object || typeof object !== 'object') throw Error('Invalid object')
  const descriptor = Object.getOwnPropertyDescriptor(object, key)
  if (!descriptor || !own(descriptor, 'value')) throw Error('Missing data property')
  return descriptor.value
}
const slug = value => String(value || 'garment').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'garment'
const read = (files, path) => {
  const bytes = get(files, path)
  if (!(bytes instanceof Uint8Array)) throw Error(`Invalid archived bytes: ${path}`)
  return decoder.decode(bytes)
}
const json = (files, path) => JSON.parse(read(files, path))

/** Development evidence audit. Archived SVG ruler ink and authenticated sheet
 * presence determine calibration mode; width alone cannot require a ruler to
 * be printed over cutting geometry.
 * This never verifies physical print scale or grants manufacturing approval.
 */
export function auditFactoryZipCalibrationEvidence20261024_1052(files, expectedProject) {
  let baseline
  try { baseline = auditFactoryZipConditionalInventory20261024_1000(files, expectedProject) }
  catch { baseline = { diagnostics: [{ code: 'UNSAFE_CONDITIONAL_INVENTORY', message: 'Unable to inspect conditional inventory' }] } }
  const diagnostics = [...(Array.isArray(baseline?.diagnostics) ? baseline.diagnostics : [])]
  if (!baseline || baseline.ok !== true) diagnostics.push({ code: 'BASELINE_INVENTORY_FAILED', message: 'Underlying conditional inventory did not pass' })
  const reject = (code, message) => diagnostics.push({ code, message })
  const finish = () => ({ ok: diagnostics.length === 0, diagnostics, manufacturingApproved: false })
  try {
    if (!files || typeof files !== 'object' || Array.isArray(files)) throw Error('Invalid file map')
    const source = json(files, 'garment-source.json')
    const rows = get(json(files, 'marker-plot-geometry-qa.json'), 'rows')
    const sizes = get(get(source, 'grading'), 'sizes')
    const pieces = get(source, 'pieces')
    const name = get(source, 'name')
    const widthSource = expectedProject === undefined ? source : expectedProject
    const settings = own(widthSource, 'markerSettings') ? get(widthSource, 'markerSettings') : undefined
    const overrides = settings && own(settings, 'fabricWidthsCm') ? get(settings, 'fabricWidthsCm') : undefined
    const defaultWidth = settings && own(settings, 'fabricWidthCm') ? get(settings, 'fabricWidthCm') : undefined
    if (!Array.isArray(rows) || !Array.isArray(sizes) || !sizes.length ||
        !Array.isArray(pieces) || typeof name !== 'string' || !name.trim()) throw Error('Invalid source or QA')
    const fabrics = new Set(pieces.map(piece => get(piece, 'fabricId') || 'main'))
    const expectedSheets = new Set()
    const expectedPairs = new Set()
    for (const size of sizes) {
      if (typeof size !== 'string' || !size.trim()) throw Error('Invalid size')
      for (const fabric of fabrics) {
        if (typeof fabric !== 'string' || !fabric.trim()) throw Error('Invalid fabric')
        const pair = JSON.stringify([size, fabric])
        if (expectedPairs.has(pair)) throw Error('Duplicate source pair')
        expectedPairs.add(pair)
        const matches = rows.filter(row => get(row, 'size') === size && get(row, 'fabricId') === fabric)
        if (matches.length !== 1) { reject('CALIBRATION_QA_COVERAGE', `Expected one QA row for ${size}/${fabric}`); continue }
        const row = matches[0]
        const prefix = `${slug(name)}-${slug(fabric)}-${slug(size)}`
        const svg = read(files, `markers/${prefix}.svg`)
        const tag = svg.match(/^<\?xml version="1\.0" encoding="UTF-8"\?>\n<svg\s+([^>]+)>/)
        if (!tag || (svg.match(/<svg\b/g) || []).length !== 1) throw Error(`Missing canonical marker SVG root: ${prefix}`)
        const attrs = tag[1]
        const dimension = key => {
          const values = [...attrs.matchAll(new RegExp(`(?:^|\\s)${key}="([^"]*)"`, 'g'))]
          if (values.length !== 1 || !/^(?:\d+\.?\d*|\.\d+)cm$/.test(values[0][1])) throw Error(`Unsupported ${key} dimension: ${prefix}`)
          const number = Number(values[0][1].slice(0, -2))
          if (!Number.isFinite(number) || number <= 0) throw Error(`Invalid ${key} dimension: ${prefix}`)
          return number
        }
        const width = dimension('width'), height = dimension('height')
        const override = overrides && own(overrides, fabric) ? get(overrides, fabric) : undefined
        const expectedWidth = Number(override ?? defaultWidth ?? 150)
        if (!Number.isFinite(expectedWidth) || expectedWidth <= 0 || Math.abs(width - expectedWidth) > 0.0001)
          reject('CALIBRATION_MARKER_WIDTH_MISMATCH', `Archived marker width differs from authored fabric settings: ${size}/${fabric}`)
        const view = attrs.match(/(?:^|\s)viewBox="([^"]+)"/g) || []
        if (view.length !== 1) throw Error(`Invalid viewBox: ${prefix}`)
        const coords = view[0].split('"')[1].trim().split(/\s+/).map(Number)
        if (coords.length !== 4 || coords.some(n => !Number.isFinite(n)) ||
            coords[0] !== 0 || coords[1] !== 0 || Math.abs(coords[2] - width) > 0.0001 || Math.abs(coords[3] - height) > 0.0001)
          throw Error(`SVG dimensions and viewBox disagree: ${prefix}`)
        const rulers = (svg.match(/<g id="print-scale-check"(?=\s|>)/g) || []).length
        const canContainRuler = width >= 11 && height >= 3
        const mode = canContainRuler && rulers === 1 ? 'on-page' : 'separate-sheet'
        if (get(row, 'calibrationMode') !== mode)
          reject('CALIBRATION_MODE_MISMATCH', `Archived SVG requires ${mode} for ${size}/${fabric}`)
        if (rulers !== Number(mode === 'on-page') || (rulers > 0 && !canContainRuler))
          reject('CALIBRATION_RULER_MISMATCH', `Archived marker ruler differs for ${size}/${fabric}`)
        if (mode === 'separate-sheet') {
          const stem = `print-calibration/${prefix}`
          expectedSheets.add(`${stem}.svg`)
          expectedSheets.add(`${stem}.pdf`)
          const audit = auditMarkerCalibrationSheet20261024({ svg: read(files, `${stem}.svg`), pdf: get(files, `${stem}.pdf`) }, { size, fabricId: fabric })
          if (!audit.ok) reject('INVALID_CALIBRATION_SHEET', `Sheet failed exact calibration audit for ${size}/${fabric}`)
        }
      }
    }
    for (const row of rows) {
      const pair = JSON.stringify([get(row, 'size'), get(row, 'fabricId')])
      if (!expectedPairs.has(pair)) reject('UNEXPECTED_CALIBRATION_QA', `QA pair absent from source: ${pair}`)
    }
    for (const path of Object.keys(files)) if (path.startsWith('print-calibration/') && !expectedSheets.has(path))
      reject('UNEXPECTED_CALIBRATION_SHEET', `Unexpected calibration artifact: ${path}`)
  } catch (error) {
    reject('UNSAFE_CALIBRATION_EVIDENCE', String(error?.message || 'Unable to safely audit calibration'))
  }
  return finish()
}
