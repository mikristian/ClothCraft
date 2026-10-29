import { planModarisFabricBoundNativeChart20261027 as chartPlan, validateModarisFabricBoundChart20261027 as validateChart } from './modarisFabricBoundChart20261027.js'
import { planNativeAtomicPointBindings20261027 as atomicPlan } from './nativeAtomicPointBindings20261027.js'
import { rebaseNativePatternBindingsAfterAnchorGroup20261027 as rebase } from './nativePatternBindingsRebase20261027.js'
import { fingerprintNativePatternBindingsSource20261023 as fingerprint, serializeNativePatternConstraintSidecar20261023 as serialize } from './nativePatternConstraintBindings20261023.js'

const reject = (reason, postCommit = false) => Object.freeze({ ok: false, reason, manufacturingApproved: false,
  ...(postCommit ? { nativeCommitAlreadyOccurred: true, nativeRollbackAttempted: false, requiresOperatorRecovery: true } : {}) })
const freeze = object => {
  if (object && typeof object === 'object' && !Object.isFrozen(object)) {
    for (const value of Object.values(object)) freeze(value)
    Object.freeze(object)
  }
  return object
}
// Compare the entire native request, including command order, point coordinates and
// counts. A caller must never be allowed to add an AnchorGroup to a chart approval.
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const stable = x => Array.isArray(x) ? x.map(stable) :
  x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map(key => [key, stable(x[key])])) : x
const equivalentBindings = bindings => bindings.map(binding => {
  const copy = { ...binding }
  if (!copy.dependsOn?.length) delete copy.dependsOn
  return copy
})

/** Pure, one-shot transaction preparation for an explicitly selected size.
 * All six sizes are bounded; only the selected row changes native source points.
 */
export function prepareModarisFabricBoundNativeTransaction20261027(snapshot, sidecar, chart, envelope, { size } = {}) {
  try {
    if (!Array.isArray(chart?.sizes) || chart.sizes.length !== 6)
      throw Error('Transaction requires exactly six named sizes')
    const reviewed = chartPlan(snapshot, sidecar, chart, envelope, { size })
    if (!reviewed.ok) throw Error(reviewed.reason)
    const atomic = atomicPlan(snapshot, reviewed.sidecar)
    if (!atomic.ok) throw Error(`Native atomic plan rejected: ${atomic.reason}`)
    if (atomic.sourceRevision !== snapshot.revision || atomic.sourceFingerprint !== fingerprint(snapshot))
      throw Error('Native atomic proposal source mismatch')
    // Verify independent planning routes agree on each target and requested point.
    const flattened = atomic.commands.flatMap(command => command.edits.map(([anchor, position]) =>
      ({ kind: 'Anchor', panel: command.panel, anchor, position })))
    if (!same(flattened, reviewed.nativePlan.commands))
      throw Error('Native chart and atomic point binding plans disagree')
    const names = Object.keys(chart.measurements).sort()
    if (!same(Object.keys(reviewed.sidecar.measurements).sort(), names))
      throw Error('Selected chart and native binding identities differ')
    return freeze({ ok: true, size, chartRevision: chart.revision,
      sourceRevision: snapshot.revision, sourceFingerprint: atomic.sourceFingerprint,
      fabricId: chart.fabricId, envelopeProvenance: envelope.provenance,
      measurementNames: names, chart: structuredClone(chart), envelope: structuredClone(envelope),
      originalSidecar: structuredClone(sidecar), selectedSidecar: structuredClone(reviewed.sidecar),
      proposal: structuredClone(atomic), manufacturingApproved: false,
      nativeCommitAlreadyOccurred: false,
      note: 'Prepared for existing native edit-batch AnchorGroup route. Recheck against live source immediately before commit; limits are browser-side only.' })
  } catch (error) { return reject(error?.message ?? String(error)) }
}

/** Validate the exact request against a live source immediately before native commit. */
export function verifyModarisFabricBoundNativeCommitRequest20261027(snapshot, prepared, proposedBatch) {
  try {
    if (prepared?.ok !== true) throw Error('Missing prepared transaction')
    const fresh = prepareModarisFabricBoundNativeTransaction20261027(snapshot,
      prepared.originalSidecar, prepared.chart, prepared.envelope, { size: prepared.size })
    if (!fresh.ok) throw Error(`Stale transaction: ${fresh.reason}`)
    if (!same(fresh, prepared)) throw Error('Prepared transaction changed since verification')
    if (!same(proposedBatch, fresh.proposal)) throw Error('Submitted native batch differs from approved transaction')
    return freeze({ ok: true, proposal: structuredClone(fresh.proposal),
      nativeBindings: { measurements: structuredClone(fresh.selectedSidecar.measurements),
        bindings: structuredClone(fresh.selectedSidecar.bindings) },
      sourceRevision: snapshot.revision, sourceFingerprint: fresh.sourceFingerprint,
      manufacturingApproved: false })
  } catch (error) { return reject(error?.message ?? String(error)) }
}

/** Postcommit evidence review. Native has already committed and cannot be rolled back here. */
export function witnessModarisFabricBoundNativeTransaction20261027(before, after, prepared, submittedBatch) {
  try {
    const preflight = verifyModarisFabricBoundNativeCommitRequest20261027(before, prepared, submittedBatch)
    if (!preflight.ok) throw Error(`Commit evidence mismatch: ${preflight.reason}`)
    if (!same(Object.keys(before).sort(), ['revision', 'template']) ||
        ![JSON.stringify(['revision','template']), JSON.stringify(['nativePointBindings','revision','template'])]
          .includes(JSON.stringify(Object.keys(after).sort())))
      throw Error('Native fabric witness received unexpected project metadata')
    // The real workspace callback includes Rust's persisted binding receipt
    // on AFTER, whereas the geometric rebase deliberately accepts only
    // {revision,template}. Validate the native receipt before projecting it
    // away; otherwise the extra metadata falsely fails exact geometry proof.
    if (Object.hasOwn(after, 'nativePointBindings')) {
      const native = after.nativePointBindings
      if (!native || native.active !== true || native.version !== 1 ||
          native.automaticRegeneration !== false || native.manufacturingApproved !== false ||
          !same(stable(native.measurements), stable(prepared.selectedSidecar.measurements)) ||
          !Array.isArray(native.bindings) ||
          !same(stable(equivalentBindings(native.bindings)),
            stable(equivalentBindings(prepared.selectedSidecar.bindings))))
        throw Error('Rust saved measurement rules differ from the approved fabric chart')
      if (native.sourceRevision !== undefined && native.sourceRevision !== after.revision)
        throw Error('Rust binding receipt has a stale source revision')
      if (native.sourceFingerprint !== undefined && native.sourceFingerprint !== fingerprint(after))
        throw Error('Rust binding receipt has a stale geometry fingerprint')
    }
    const project = source => ({ revision: source.revision, template: source.template })
    const checked = rebase(project(before), project(after), prepared.selectedSidecar, preflight.proposal)
    if (!checked.ok) throw Error(`Native postcommit witness failed: ${checked.reason}`)
    const chart = structuredClone(prepared.chart)
    chart.sourceRevision = after.revision
    chart.sourceFingerprint = fingerprint(after)
    const validated = validateChart(after, chart, prepared.envelope)
    if (!validated.ok) throw Error(`Rebased all-size chart invalid: ${validated.reason}`)
    if (!same(Object.keys(checked.sidecar.measurements).sort(), prepared.measurementNames))
      throw Error('Rebased native measurement identities changed')
    if (!same(checked.sidecar.bindings, prepared.selectedSidecar.bindings))
      throw Error('Rebased native binding identities changed')
    serialize(checked.sidecar)
    if (checked.sidecar.sourceRevision !== chart.sourceRevision ||
        checked.sidecar.sourceFingerprint !== chart.sourceFingerprint)
      throw Error('Native binding and chart source identities differ')
    return freeze({ ok: true, chart, sidecar: structuredClone(checked.sidecar), size: prepared.size,
      sourceRevision: after.revision, sourceFingerprint: chart.sourceFingerprint,
      nativeCommitAlreadyOccurred: true, nativeEvidenceVerified: true, nativeRollbackAttempted: false,
      chartSaved: false, manufacturingApproved: false,
      note: 'Verified committed native batch and all six unchanged chart rows. Persist chart and sidecar explicitly; no native rollback is available from this validator.' })
  } catch (error) { return reject(error?.message ?? String(error), true) }
}
