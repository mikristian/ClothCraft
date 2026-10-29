import { auditFactoryZipCalibrationEvidence20261024_1052 } from './factoryZipCalibrationEvidence20261024_1052.mjs'
import { auditMarkerPlotParity20261024 } from './accumarkMarkerPlotParity20261024.mjs'
import { gradeProject } from './grading.js'
import { buildFabricMarkers } from './marker.js'
import { auditMarkerRulerInkClearance20261024 } from './accumarkMarkerRulerInkClearance20261024.mjs'

const decoder = new TextDecoder('utf-8', { fatal: true })
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key)
const slug = value => String(value || 'garment').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'garment'
const value = (object, key) => {
  if (!object || typeof object !== 'object') throw Error('Expected plain data')
  const descriptor = Object.getOwnPropertyDescriptor(object, key)
  if (!descriptor || !own(descriptor, 'value')) throw Error('Missing safe data property: ' + key)
  return descriptor.value
}
const bytes = (files, path, optional = false) => {
  if (!own(files, path) && optional) return null
  const data = value(files, path)
  if (!(data instanceof Uint8Array) || data.byteLength > 32 * 1024 * 1024) throw Error('Invalid or oversized archive entry: ' + path)
  return data.slice()
}
const text = (files, path) => decoder.decode(bytes(files, path))

/** Development-only digital SVG/PDF marker parity against independently regenerated geometry. */
export function auditFactoryZipMarkerPhysicalParity20261024_1202(files, expectedProject) {
  const diagnostics = []
  const reject = (code, message) => { if (diagnostics.length < 64) diagnostics.push({ code, message }) }
  const finish = () => ({ ok: diagnostics.length === 0, diagnostics, manufacturingApproved: false, physicalRegistrationVerified: false })
  try {
    if (!files || typeof files !== 'object' || Array.isArray(files) || Object.keys(files).length > 4096) throw Error('Invalid archive map or file count')
    const baseline = auditFactoryZipCalibrationEvidence20261024_1052(files, expectedProject)
    for (const issue of baseline.diagnostics || []) reject(issue.code, issue.message)
    if (!baseline.ok) {
      reject('CALIBRATION_EVIDENCE_FAILED', 'Existing calibration evidence audit failed')
      return finish()
    }
    const archivedProject = JSON.parse(text(files, 'garment-source.json'))
    // The chained audit validates trusted-project equivalence. Regenerate only
    // from the archived JSON so untrusted getters are never invoked downstream.
    const source = archivedProject
    const sizes = value(value(source, 'grading'), 'sizes')
    const name = value(source, 'name')
    const pieces = value(source, 'pieces')
    if (!Array.isArray(sizes) || !Array.isArray(pieces)) {
      reject('SOURCE_COMPLEXITY_BUDGET', 'Source grading sizes or pieces are not arrays')
      return finish()
    }
    let totalPoints = 0, totalQuantity = 0
    const fabrics = new Set()
    for (const piece of pieces) {
      if (!piece || typeof piece !== 'object' || !Array.isArray(piece.points)) {
        reject('SOURCE_COMPLEXITY_BUDGET', 'Source piece has invalid points')
        return finish()
      }
      totalPoints += piece.points.length
      const quantity = piece.cutQuantity ?? 1
      if (!Number.isFinite(quantity) || quantity < 0) totalQuantity = Infinity
      else totalQuantity += Math.max(1, Math.round(quantity))
      fabrics.add(piece.fabricId || 'main')
    }
    if (sizes.length > 32 || pieces.length > 128 || totalPoints > 4096 || totalQuantity > 512 || fabrics.size > 32) {
      reject('SOURCE_COMPLEXITY_BUDGET', `Source exceeds reconstruction budget (sizes=${sizes.length}, pieces=${pieces.length}, points=${totalPoints}, quantity=${totalQuantity}, fabrics=${fabrics.size})`)
      return finish()
    }
    if (!sizes.length || new Set(sizes).size !== sizes.length || sizes.some(s => typeof s !== 'string' || !s || s.length > 100) || typeof name !== 'string' || !name.trim()) throw Error('Invalid source grading or project name')
    const settings = source.markerSettings || {}
    const width = settings.fabricWidthCm ?? 150
    const gap = settings.gapCm ?? 1.5
    if (!Number.isFinite(width) || width <= 0 || width > 10000 || !Number.isFinite(gap) || gap < 0 || gap > 10000) throw Error('Invalid marker settings')
    const expectedPaths = new Set()
    for (const size of sizes) {
      const graded = gradeProject(source, size)
      const markers = buildFabricMarkers(graded, width, gap)
      if (!markers || Object.keys(markers).length > 128) throw Error('Marker fabric count exceeds budget')
      for (const [fabricId, marker] of Object.entries(markers)) {
        const stem = `markers/${slug(name)}-${slug(fabricId)}-${slug(size)}`
        if (expectedPaths.has(stem)) { reject('DUPLICATE_MARKER_PATH', stem); continue }
        expectedPaths.add(stem)
        const sheetStem = `print-calibration/${slug(name)}-${slug(fabricId)}-${slug(size)}`
        // Reconstruct the same collision decision from the archived garment,
        // never from a mutable QA row or the presence of a sheet alone.
        const rulerAudit = auditMarkerRulerInkClearance20261024(marker, { size, pageLengthCm: 400 })
        if (rulerAudit.issues?.some(issue => issue.code === 'INVALID_RULER_SOURCE')) {
          reject('UNSAFE_RULER_SOURCE', `${size}/${fabricId}: invalid ruler geometry`)
          continue
        }
        const separate = marker.width < 11 || Math.max(1, marker.length) < 3 || !rulerAudit.ok
        const calibrationSheet = separate ? { svg: text(files, sheetStem + '.svg'), pdf: bytes(files, sheetStem + '.pdf') } : null
        const result = auditMarkerPlotParity20261024(marker, {
          svg: bytes(files, stem + '.svg'),
          pdf: bytes(files, stem + '.pdf', !marker.placements.length),
          size, fabricName: source.fabrics?.[fabricId]?.name || fabricId,
          project: graded, calibrationSheet, separateCalibrationSheet: separate,
          requirePrintedRegistration: true, requireRulerInkClearance: true,
        })
        if (!result.ok) for (const issue of result.issues) reject('MARKER_' + issue.code, `${size}/${fabricId}: ${issue.message}`)
      }
    }
    for (const path of Object.keys(files)) {
      if (!path.startsWith('markers/') || !/\.(svg|pdf)$/.test(path)) continue
      if (!expectedPaths.has(path.slice(0, -4))) reject('UNEXPECTED_MARKER', path)
    }
  } catch (error) {
    reject('UNSAFE_MARKER_PARITY', String(error?.message || error))
  }
  return finish()
}
