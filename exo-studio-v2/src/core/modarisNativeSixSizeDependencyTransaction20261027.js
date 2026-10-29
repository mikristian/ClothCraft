import { prepareModarisFabricBoundNativeTransaction20261027 as prepareSize } from './modarisFabricBoundNativeTransaction20261027.js'
import { validateModarisFabricBoundChart20261027 as validateChart } from './modarisFabricBoundChart20261027.js'
import { fingerprintNativePatternBindingsSource20261023 as fingerprint } from './nativePatternConstraintBindings20261023.js'
import { simulateNativeAnchorRemap20261023 } from './nativeParametricPoint20261023.js'
import { sha256Bytes } from './sha256Bytes.js'

const SIX = Object.freeze(['XS', 'S', 'M', 'L', 'XL', 'XXL'])
const plain = x => x !== null && typeof x === 'object' && !Array.isArray(x) && (Object.getPrototypeOf(x) === Object.prototype || Object.getPrototypeOf(x) === null)
const vec = x => Array.isArray(x) && x.length === 2 && x.every(v => typeof v === 'number' && Number.isFinite(v))
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const fail = reason => Object.freeze({ ok: false, reason, manufacturingApproved: false, committed: false, requiresAuthoritativeRustSizeRunEngine: true })
function freeze(x) { if (x && typeof x === 'object' && !Object.isFrozen(x)) { for (const v of Object.values(x)) freeze(v); Object.freeze(x) } return x }
function canonical(x, depth = 0) {
  if (depth > 64) throw Error('Six-size proof exceeds nesting limit')
  if (x === null || typeof x === 'string' || typeof x === 'boolean' || typeof x === 'number' && Number.isFinite(x)) return JSON.stringify(x)
  if (Array.isArray(x) && x.length <= 16384) return `[${x.map(v => canonical(v, depth + 1)).join(',')}]`
  if (plain(x) && Object.keys(x).length <= 16384) return `{${Object.keys(x).sort().map(k => `${JSON.stringify(k)}:${canonical(x[k], depth + 1)}`).join(',')}}`
  throw Error('Unsupported or nonfinite six-size proof data')
}
const digest = x => `sha256:${sha256Bytes(new TextEncoder().encode(canonical(x)))}`
function validatePanelLayout(snapshot) {
  if (!plain(snapshot) || !plain(snapshot.template) || !Array.isArray(snapshot.template.panels)) throw Error('Missing authoritative native panel layout')
  if (snapshot.activeGradedSize || snapshot.active_grade_size) throw Error('Active graded display cannot serve as authoritative size snapshot')
  if (snapshot.nativePointBindings?.active === false) throw Error('Inactive native measurement bindings')
  const ids = new Set()
  for (const p of snapshot.template.panels) {
    if (!plain(p) || typeof p.id !== 'string' || ids.has(p.id)) throw Error('Duplicate or malformed native panel layout')
    ids.add(p.id)
    if (p.layout_2d !== undefined && !vec(p.layout_2d) || p.layout_rotation_degrees !== undefined && (typeof p.layout_rotation_degrees !== 'number' || !Number.isFinite(p.layout_rotation_degrees))) throw Error('Invalid native layout origin or rotation')
    if (p.sewing || p.sewn || p.attached || p.attachments?.length || p.seams?.length || p.sewing_edges?.length || p.sewingPairs?.length || p.pin_points?.length) throw Error(`Native panel ${p.id} has sewing, attachment or pinned geometry`)
  }
  if (snapshot.template.sewing?.length || snapshot.template.seams?.length || snapshot.template.attachments?.length || snapshot.sewing?.length || snapshot.attachments?.length) throw Error('Attached or sewn native template cannot be planned')
  return [...ids].sort()
}
function validatePersistedGraph(snapshot, sidecar, size) {
  const saved = snapshot.nativePointBindings
  if (!plain(saved) || saved.active !== true || saved.version !== 1 ||
      saved.automaticRegeneration !== false || saved.manufacturingApproved !== false ||
      !plain(saved.measurements) || !Array.isArray(saved.bindings) || !saved.bindings.length)
    throw Error(`Missing or inactive authoritative native binding graph at ${size}`)
  if (saved.sourceRevision !== undefined && saved.sourceRevision !== snapshot.revision)
    throw Error(`Persisted native binding source revision differs at ${size}`)
  if (saved.sourceFingerprint !== undefined && saved.sourceFingerprint !== fingerprint(snapshot))
    throw Error(`Persisted native binding source geometry differs at ${size}`)
  const normalize = bindings => bindings.map(binding => {
    const copy = structuredClone(binding)
    if (Array.isArray(copy.dependsOn) && copy.dependsOn.length === 0) delete copy.dependsOn
    return copy
  })
  if (canonical(saved.measurements) !== canonical(sidecar.measurements) ||
      canonical(normalize(saved.bindings)) !== canonical(normalize(sidecar.bindings)))
    throw Error(`Persisted native binding values or identities differ at ${size}`)
}
function envelopeForSize(chart, envelope, size) {
  return { ...envelope, bounds: envelope.bounds.filter(bound => bound.size === size) }
}
function predictedNormalized(snapshot, proposal) {
  const expected = structuredClone(snapshot)
  const changed = []
  for (const command of proposal.commands) {
    const panel = expected.template.panels.find(p => p.id === command.panel)
    if (!panel || !Array.isArray(command.edits) || !command.edits.length) throw Error('Missing panel or edits in group')
    const before = structuredClone(panel.polygon)
    for (const [anchor, position] of command.edits) panel.polygon = simulateNativeAnchorRemap20261023(panel.polygon, anchor, position)
    const poly = panel.polygon
    const coords = [...poly.points, ...Object.values(poly.curves ?? {}).flat(), ...Object.values(poly.free_curve_points ?? {}).flat().map(p => p.position)]
    if (!coords.length || !coords.every(vec)) throw Error('Invalid computed pattern geometry')
    const lo = [Math.min(...coords.map(p => p[0])), Math.min(...coords.map(p => p[1]))]
    const hi = [Math.max(...coords.map(p => p[0])), Math.max(...coords.map(p => p[1]))]
    const translate = p => [p[0] - lo[0], p[1] - lo[1]]
    poly.points = poly.points.map(translate)
    if (poly.curves) for (const key of Object.keys(poly.curves)) poly.curves[key] = poly.curves[key].map(translate)
    if (poly.free_curve_points) for (const marks of Object.values(poly.free_curve_points)) for (const mark of marks) mark.position = translate(mark.position)
    if (poly.holes) for (const hole of poly.holes) hole.points = hole.points.map(translate)
    if (poly.lines) for (const line of poly.lines) line.points = line.points.map(translate)
    if (poly.annotations) for (const mark of poly.annotations) mark.position = translate(mark.position)
    const angle = (panel.layout_rotation_degrees ?? 0) * Math.PI / 180
    const origin = panel.layout_2d ?? [0, 0]
    const offset = [lo[0] * Math.cos(angle) - lo[1] * Math.sin(angle), lo[0] * Math.sin(angle) + lo[1] * Math.cos(angle)]
    panel.layout_2d = [origin[0] + offset[0], origin[1] + offset[1]]
    if (panel.pattern) { panel.pattern.width = hi[0] - lo[0]; panel.pattern.height = hi[1] - lo[1] }
    if (panel.placement) throw Error('Native 3D placement requires authoritative Rust normalization')
    changed.push({ panelId: panel.id, beforeFingerprint: digest(before), afterFingerprint: digest(poly),
      pointsAfterMetres: structuredClone(poly.points), normalizedBoundsMetres: { width: hi[0] - lo[0], height: hi[1] - lo[1] }, layoutAfterMetres: [...panel.layout_2d] })
  }
  expected.revision = snapshot.revision + 1
  return { expected, changed }
}

/** Entirely pure six-size staging; no native commits or production approval. */
export function planModarisNativeSixSizeDependencyTransaction20261027(snapshots, sidecars, chart, envelope) {
  try {
    if (!plain(snapshots) || !plain(sidecars) || !plain(chart) || !plain(envelope) || !Array.isArray(chart.sizes) ||
      !same(chart.sizes, SIX) || !same(Object.keys(snapshots).sort(), [...SIX].sort()) || !same(Object.keys(sidecars).sort(), [...SIX].sort()))
      throw Error('Exactly six authoritative XS/S/M/L/XL/XXL sources and per-size sidecars are required')
    const sizes = [], revisions = new Set(), fingerprints = new Set()
    let topology = null, ruleIdentity = null
    for (const size of SIX) {
      const snapshot = snapshots[size], sidecar = sidecars[size]
      const panels = validatePanelLayout(snapshot)
      const shapes = snapshot.template.panels.map(p => ({ id: p.id, edges: p.polygon?.edges, pointCount: p.polygon?.points?.length })).sort((a, b) => a.id.localeCompare(b.id))
      if (topology !== null && !same(topology, shapes)) throw Error(`Inconsistent six-size panel topology at ${size}`)
      topology = shapes
      validatePersistedGraph(snapshot, sidecar, size)
      const ids = sidecar?.bindings?.map(b => ({ id: b.id, panelId: b.panelId, pointIndex: b.pointIndex, a: b.a, b: b.b, mode: b.mode, angleDeg: b.angleDeg ?? 0, distanceFormula: b.distanceFormula, dependsOn: b.dependsOn ?? [] }))
      if (ruleIdentity !== null && !same(ruleIdentity, ids)) throw Error(`Inconsistent per-size native binding graph at ${size}`)
      ruleIdentity = ids
      if (!Array.isArray(ids) || !ids.length || new Set(ids.map(b => b.panelId)).size < 2) throw Error('Six-size dependency planning requires bindings across at least two panels')
      if (sidecar.sourceRevision !== snapshot.revision || sidecar.sourceFingerprint !== fingerprint(snapshot)) throw Error(`Stale authoritative native rule sidecar at ${size}`)
      revisions.add(snapshot.revision)
      fingerprints.add(sidecar.sourceFingerprint)
      const sizeChart = { ...chart, sourceRevision: snapshot.revision, sourceFingerprint: sidecar.sourceFingerprint }
      const validation = validateChart(snapshot, sizeChart, envelope)
      if (!validation.ok) throw Error(`${size} chart validation failed: ${validation.reason}`)
      const prepared = prepareSize(snapshot, sidecar, sizeChart, envelope, { size })
      if (!prepared.ok) throw Error(`${size} native group planning failed: ${prepared.reason}`)
      if (prepared.proposal.commands.length < 2 || prepared.proposal.commands.some(c => !panels.includes(c.panel))) throw Error(`${size} dependent source/target group incomplete`)
      const proof = predictedNormalized(snapshot, prepared.proposal)
      const unaffected = snapshot.template.panels.filter(p => !prepared.proposal.commands.some(c => c.panel === p.id)).map(p => p.id)
      if (unaffected.some(id => !same(snapshot.template.panels.find(p => p.id === id), proof.expected.template.panels.find(p => p.id === id)))) throw Error(`${size} unrelated piece was altered`)
      sizes.push({ size, sourceRevision: snapshot.revision, sourceFingerprint: sidecar.sourceFingerprint,
        sourceSnapshotDigest: digest(snapshot), sidecarDigest: digest(sidecar), commands: structuredClone(prepared.proposal.commands),
        prepared: structuredClone(prepared), normalizedGeometryProof: proof.changed,
        unrelatedPanelIdsPreserved: unaffected, expectedNativeSnapshotPreview: proof.expected,
        expectedNativeFingerprint: fingerprint(proof.expected), requiresRustRevalidation: true,
        staged: true, committed: false, manufacturingApproved: false })
    }
    const inputDigest = digest({ snapshots, sidecars, chart, envelope })
    const geometryDigest = digest(sizes.map(s => ({ size: s.size, fingerprint: s.expectedNativeFingerprint, changed: s.normalizedGeometryProof, untouched: s.unrelatedPanelIdsPreserved })))
    return freeze({ ok: true, format: 'exo-six-size-native-dependency-preview.v1', sizes, sizeOrder: [...SIX],
      chartRevision: chart.revision, fabricId: chart.fabricId, provenance: envelope.provenance,
      distinctNativeRevisions: revisions.size, distinctNativeFingerprints: fingerprints.size,
      inputDigest, geometryDigest, committed: false, manufacturingApproved: false,
      requiresAuthoritativeRustSizeRunEngine: true, commitAsSingleTransactionSupported: false,
      note: 'Six immutable independent size proposals and simulated group normalization only. A single authoritative Rust size-run engine must atomically validate and apply the entire grade catalog.' })
  } catch (error) { return fail(error?.message ?? String(error)) }
}

/** Recompute the complete proof against live sources; reject forged previews and stale revisions. */
export function verifyModarisNativeSixSizeDependencyPreview20261027(snapshots, sidecars, chart, envelope, preview) {
  try {
    const fresh = planModarisNativeSixSizeDependencyTransaction20261027(snapshots, sidecars, chart, envelope)
    if (!fresh.ok) throw Error(fresh.reason)
    if (!plain(preview) || !same(fresh, preview)) throw Error('Six-size proof, native revisions, commands or geometry have changed')
    return freeze({ ok: true, inputDigest: fresh.inputDigest, geometryDigest: fresh.geometryDigest,
      validatedSizeCount: 6, committed: false, manufacturingApproved: false,
      requiresAuthoritativeRustSizeRunEngine: true, commitAsSingleTransactionSupported: false })
  } catch (error) { return fail(error?.message ?? String(error)) }
}
