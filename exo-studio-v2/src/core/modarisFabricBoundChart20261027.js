import { evaluateNativeDraftFormulas20261023 } from './nativeParametricFormula20261023.js'
import {
  fingerprintNativePatternBindingsSource20261023 as fingerprint,
  planNativePatternConstraintBindings20261023 as planBindings,
  serializeNativePatternConstraintSidecar20261023 as serializeSidecar,
} from './nativePatternConstraintBindings20261023.js'
import { reconcileModarisBidirectionalChart20261027 as reconcileNativeInverse } from './modarisBidirectionalChart20261027.js'

// An explicit, supplier-/patternmaker-authored size/fabric measurement envelope.
// No elastic recovery, ease or allowable strain is inferred from a fabric name.
const UNIT_MM = Object.freeze({ mm: 1, cm: 10, in: 25.4 })
const identifier = value => typeof value === 'string' && /^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(value)
const finite = value => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 1e7
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
const exact = (value, fields) => plain(value) && Object.keys(value).every(key => fields.includes(key))
const reject = reason => Object.freeze({ ok: false, reason, manufacturingApproved: false })
const freeze = value => {
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) freeze(item)
    Object.freeze(value)
  }
  return value
}

function millimetres(cell) {
  if (!exact(cell, ['value', 'unit']) || !finite(cell.value) || !Object.hasOwn(UNIT_MM, cell.unit))
    throw Error('Invalid finite measurement value or unit')
  const mm = cell.value * UNIT_MM[cell.unit]
  if (!finite(mm)) throw Error('Measurement exceeds numeric limit')
  return mm
}

function checked(snapshot, chart, envelope) {
  if (!exact(chart, ['version', 'revision', 'sourceRevision', 'sourceFingerprint', 'fabricId', 'sizes', 'baseSize', 'measurements']) ||
      chart.version !== 1 || !Number.isSafeInteger(chart.revision) || chart.revision < 0 ||
      chart.sourceRevision !== snapshot?.revision || chart.sourceFingerprint !== fingerprint(snapshot))
    throw Error('Stale or invalid native chart source/revision')
  if (typeof chart.fabricId !== 'string' || !chart.fabricId.trim() || chart.fabricId.length > 128 ||
      !Array.isArray(chart.sizes) || !chart.sizes.length || chart.sizes.length > 32 ||
      chart.sizes.some(size => typeof size !== 'string' || !size.trim() || size.length > 64) ||
      new Set(chart.sizes).size !== chart.sizes.length || !chart.sizes.includes(chart.baseSize))
    throw Error('Invalid chart fabric or size catalog')
  if (!plain(chart.measurements) || !Object.keys(chart.measurements).length ||
      Object.keys(chart.measurements).length > 128 || Object.keys(chart.measurements).some(name => !identifier(name)))
    throw Error('Invalid named chart measurements')
  if (!exact(envelope, ['version', 'fabricId', 'provenance', 'bounds']) || envelope.version !== 1 ||
      envelope.fabricId !== chart.fabricId || typeof envelope.provenance !== 'string' ||
      !envelope.provenance.trim() || envelope.provenance.length > 256 ||
      !Array.isArray(envelope.bounds) || envelope.bounds.length > 4096)
    throw Error('Missing or mismatched fabric envelope provenance')

  const names = Object.keys(chart.measurements)
  const bounds = new Map()
  for (const item of envelope.bounds) {
    if (!exact(item, ['measurement', 'size', 'minMm', 'maxMm']) || !names.includes(item.measurement) ||
        !chart.sizes.includes(item.size) || !finite(item.minMm) || !finite(item.maxMm) ||
        item.minMm > item.maxMm) throw Error('Invalid fabric envelope bound')
    const key = `${item.size}\u0000${item.measurement}`
    if (bounds.has(key)) throw Error('Duplicate fabric envelope bound')
    bounds.set(key, item)
  }
  if (bounds.size !== chart.sizes.length * names.length)
    throw Error('Fabric envelope must cover every measurement and size')

  const perSize = []
  for (const size of chart.sizes) {
    const measurements = Object.create(null)
    for (const name of names) {
      const entry = chart.measurements[name]
      if (!exact(entry, ['kind', 'values', 'expression'])) throw Error(`Invalid chart entry: ${name}`)
      if (entry.kind === 'direct') {
        if (Object.hasOwn(entry, 'expression') || !plain(entry.values) ||
            Object.keys(entry.values).length !== chart.sizes.length ||
            chart.sizes.some(s => !Object.hasOwn(entry.values, s)))
          throw Error(`Incomplete direct size values: ${name}`)
        measurements[name] = { valueMm: millimetres(entry.values[size]) }
      } else if (entry.kind === 'formula') {
        if (Object.hasOwn(entry, 'values') || typeof entry.expression !== 'string' ||
            !entry.expression.length || entry.expression.length > 4096)
          throw Error(`Invalid size formula: ${name}`)
        measurements[name] = { formula: entry.expression }
      } else throw Error(`Unsupported chart measurement kind: ${name}`)
    }
    const resolved = evaluateNativeDraftFormulas20261023({ measurements })
    if (!resolved.ok) throw Error(`Size ${size}: ${resolved.reason}`)
    const valuesMm = Object.fromEntries(names.map(name => [name, resolved.valuesMm[name]]))
    const marginsMm = Object.create(null)
    for (const name of names) {
      const bound = bounds.get(`${size}\u0000${name}`)
      const value = valuesMm[name]
      if (value < bound.minMm - 1e-8 || value > bound.maxMm + 1e-8)
        throw Error(`Fabric limit exceeded: ${size}/${name} (${value} mm not in ${bound.minMm}..${bound.maxMm} mm)`)
      marginsMm[name] = { lower: value - bound.minMm, upper: bound.maxMm - value }
    }
    perSize.push({ size, valuesMm, marginsMm, dependencyOrder: [...resolved.dependencyOrder] })
  }
  return { perSize, names }
}

/** All-size read-only validation; constraints are explicit measured input, not fabric simulation. */
export function validateModarisFabricBoundChart20261027(snapshot, chart, envelope) {
  try {
    const { perSize } = checked(snapshot, chart, envelope)
    return freeze({ ok: true, revision: chart.revision, sourceRevision: snapshot.revision,
      sourceFingerprint: chart.sourceFingerprint, fabricId: chart.fabricId,
      provenance: envelope.provenance, sizes: [...chart.sizes], perSize,
      manufacturingApproved: false, calibratedFabricPhysics: false })
  } catch (error) { return reject(error?.message ?? String(error)) }
}

/** Atomic pure chart edit; refuses computed cells, stale revisions and any all-size limit breach. */
export function proposeModarisFabricBoundChartEdit20261027(snapshot, chart, envelope, {
  expectedRevision, size, measurement, value, unit,
} = {}) {
  try {
    const before = checked(snapshot, chart, envelope)
    if (expectedRevision !== chart.revision) throw Error('Stale chart edit revision')
    if (!chart.sizes.includes(size) || !before.names.includes(measurement)) throw Error('Unknown chart size or measurement')
    if (chart.measurements[measurement].kind !== 'direct') throw Error('Computed chart cell cannot be edited directly')
    const mm = millimetres({ value, unit })
    const candidate = structuredClone(chart)
    candidate.measurements[measurement].values[size] = { value, unit }
    candidate.revision++
    const after = checked(snapshot, candidate, envelope)
    return freeze({ ok: true, chart: candidate, changed: { size, measurement, valueMm: mm },
      perSize: after.perSize, manufacturingApproved: false })
  } catch (error) { return reject(error?.message ?? String(error)) }
}

/**
 * Size-scoped native binding *preview*. All chart rows are checked first, then
 * the chosen row is reconciled with the existing formula/point sidecar. This
 * does NOT grade geometry, commit Rust commands or save the worksheet.
 */
export function planModarisFabricBoundNativeChart20261027(snapshot, sidecar, chart, envelope, { size } = {}) {
  try {
    const { perSize, names } = checked(snapshot, chart, envelope)
    if (!chart.sizes.includes(size)) throw Error('Unknown selected size')
    serializeSidecar(sidecar)
    if (sidecar.sourceRevision !== snapshot.revision || sidecar.sourceFingerprint !== chart.sourceFingerprint)
      throw Error('Native binding source does not match chart')
    if (Object.keys(sidecar.measurements).length !== names.length ||
        names.some(name => !Object.hasOwn(sidecar.measurements, name)))
      throw Error('Chart and native worksheet measurement identities differ')
    const row = perSize.find(item => item.size === size)
    const proposed = structuredClone(sidecar)
    for (const name of names) {
      const entry = chart.measurements[name]
      const original = sidecar.measurements[name]
      if (entry.kind === 'formula') {
        if (!plain(original) || Object.keys(original).length !== 1 || original.formula !== entry.expression)
          throw Error(`Native formula differs from chart: ${name}`)
      } else if (typeof original === 'number') proposed.measurements[name] = row.valuesMm[name]
      else if (plain(original) && Object.keys(original).length === 1 && finite(original.valueMm))
        proposed.measurements[name] = { valueMm: row.valuesMm[name] }
      else throw Error(`Native direct measurement differs from chart: ${name}`)
    }
    serializeSidecar(proposed)
    const nativePlan = planBindings(snapshot, proposed)
    if (!nativePlan.ok) throw Error(`Native binding plan rejected: ${nativePlan.reason}`)
    return freeze({ ok: true, size, chartRevision: chart.revision, fabricId: chart.fabricId,
      envelopeProvenance: envelope.provenance, sidecar: proposed, nativePlan,
      manufacturingApproved: false, applied: false,
      note: 'Size-scoped source-verified Rust point-binding preview only. No native grade graph, save, garment ease or factory validation.' })
  } catch (error) { return reject(error?.message ?? String(error)) }
}

/**
 * Review an ALREADY COMMITTED native point edit and, only after verified inverse
 * geometry and full fabric-bound chart validation, propose chart+sidecar rebase.
 * This never rolls back the native edit, writes storage, or grades other sizes.
 */
export function reviewModarisFabricBoundNativeInverse20261027(before, after, sidecar, proposal,
  chart, envelope, { size, bindingId } = {}) {
  try {
    const { perSize, names } = checked(before, chart, envelope)
    if (!chart.sizes.includes(size)) throw Error('Unknown selected chart size')
    const inverse = reconcileNativeInverse(before, after, sidecar, proposal, { bindingId })
    if (!inverse.ok || inverse.nativeEvidenceVerified !== true)
      throw Error(`Native inverse not verified: ${inverse.reason ?? 'missing commit evidence'}`)
    const name = inverse.measurementName
    if (!names.includes(name) || chart.measurements[name].kind !== 'direct')
      throw Error('Inverse measurement is not an editable chart cell')
    const previousMm = perSize.find(row => row.size === size).valuesMm[name]
    if (Math.abs(previousMm - inverse.previousValueMm) > 1e-7)
      throw Error('Native worksheet and selected chart size disagree before commit')
    const edited = proposeModarisFabricBoundChartEdit20261027(before, chart, envelope, {
      expectedRevision: chart.revision, size, measurement: name, value: inverse.valueMm, unit: 'mm',
    })
    if (!edited.ok) throw Error(`Committed edit violates fabric chart: ${edited.reason}`)
    const candidate = structuredClone(edited.chart)
    candidate.sourceRevision = after.revision
    candidate.sourceFingerprint = fingerprint(after)
    checked(after, candidate, envelope)
    if (inverse.sidecar.sourceRevision !== after.revision ||
        inverse.sidecar.sourceFingerprint !== candidate.sourceFingerprint)
      throw Error('Rebased chart and native sidecar have different committed sources')
    return freeze({ ok: true, chart: candidate, sidecar: structuredClone(inverse.sidecar),
      changed: edited.changed, size, bindingId, nativeEvidenceVerified: true,
      nativeCommitAlreadyOccurred: true, chartSaved: false, manufacturingApproved: false,
      note: 'Verified post-commit chart reconciliation. Persist both chart and Rust-sidecar explicitly; no native rollback or multi-size geometry update is performed.' })
  } catch (error) {
    return Object.freeze({ ...reject(error?.message ?? String(error)), postCommitReviewOnly: true,
      nativeRollbackAttempted: false, requiresOperatorRecovery: true })
  }
}
