import {
  fingerprintNativePatternBindingsSource20261023 as fingerprint,
  planNativePatternConstraintBindings20261023 as planBindings,
  serializeNativePatternConstraintSidecar20261023 as serialize,
} from './nativePatternConstraintBindings20261023.js'
import { planModarisNativeReferenceRecompute20261027 as planReference } from './modarisNativeReferenceRecompute20261027.js'
import { rebaseNativePatternBindingsAfterAnchorGroup20261027 as rebase } from './nativePatternBindingsRebase20261027.js'
import {auditNativePointGraphIntegrity20261028 as auditGraph} from './nativePointGraphIntegrity20261028.js'

const refuse = reason => Object.freeze({
  ok: false, reason, manufacturingApproved: false,
  nativeCommitAlreadyOccurred: true, nativeRollbackAttempted: false,
  requiresOperatorRecovery: true,
})
const freeze = value => {
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) freeze(item)
    Object.freeze(value)
  }
  return value
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
// Rust's serde_json map ordering is canonicalized independently from JS and
// omits optional empty dependsOn arrays. No other field or value is discarded.
const canonical = value => Array.isArray(value) ? value.map(canonical) :
  value && typeof value === 'object' ?
    Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value
const nativeEquivalentBindings = bindings => bindings.map(binding => {
  const copy = structuredClone(binding)
  if (Array.isArray(copy.dependsOn) && copy.dependsOn.length === 0) delete copy.dependsOn
  return canonical(copy)
})

/**
 * Verify an ALREADY committed native reference/dependent AnchorGroup, including
 * the authoritative Rust-saved point rule definitions. This is intentionally
 * stronger than merely witnessing geometry: ALL saved rules must be satisfied
 * on the committed geometry, including rules on other untouched panels.
 *
 * The Rust binding store is persistent but NOT an automatically reactive graph.
 * This witness never applies, undoes, or saves an edit.
 */
export function witnessModarisNativeReferenceCommit20261027(
  before, after, sidecar, input, submittedProposal,
) {
  try {
    serialize(sidecar)
    const planned = planReference(before, sidecar, input)
    if (!planned.ok) throw Error(`Reference recompute preflight: ${planned.reason}`)
    if (!same(submittedProposal, planned.proposal))
      throw Error('Submitted native AnchorGroup differs from the approved reference recompute')
    if (fingerprint(before) !== sidecar.sourceFingerprint)
      throw Error('Stale source fingerprint')

    const native = after?.nativePointBindings
    if (!native || native.version !== 1 || native.active !== true ||
        native.automaticRegeneration !== false || native.manufacturingApproved !== false)
      throw Error('Native Rust did not return an active, nonautomatic persisted binding graph')
    if (!same(canonical(native.measurements), canonical(sidecar.measurements)) ||
        !Array.isArray(native.bindings) ||
        !same(nativeEquivalentBindings(native.bindings), nativeEquivalentBindings(sidecar.bindings)))
      throw Error('Native persisted binding identities or measurement formulas differ')

    // Rust reply includes extra session metadata; the exact authored template
    // and revision are verified independently by the existing strict rebaser.
    const committed = { revision: after.revision, template: after.template }
    const original = { revision: before.revision, template: before.template }
    const witnessed = rebase(original, committed, sidecar, submittedProposal)
    if (!witnessed.ok) throw Error(`Native geometry witness: ${witnessed.reason}`)

    const satisfied = planBindings(committed, witnessed.sidecar)
    if (!satisfied.ok) throw Error(`Rebased native graph: ${satisfied.reason}`)
    if (satisfied.commands.length !== 0 ||
        satisfied.steps.some(step => step.unchanged !== true))
      throw Error('Committed Rust geometry does not satisfy every persisted point binding')
    const audit=auditGraph(committed,witnessed.sidecar)
    if(!audit.ok)throw Error(`Committed Rust graph integrity: ${audit.reason}`)

    return freeze({
      ok: true, sourceRevision: before.revision, committedRevision: after.revision,
      sourceFingerprint: witnessed.sourceFingerprint,
      persistedNativeBindingCount: native.bindings.length,
      verifiedBindingIds: satisfied.steps.map(step => step.bindingId),
      referenceEditCount: submittedProposal.pointCount,
      sidecar: structuredClone(witnessed.sidecar),
      nativeCommitAlreadyOccurred: true, nativeEvidenceVerified: true,
      nativeAutomaticRegeneration: false, manufacturingApproved: false,
      note: 'One native Rust reference/dependent AnchorGroup and all saved point rules were witnessed. Subsequent source edits still require an explicit guarded recompute; no all-size industrial graph or factory approval.',
    })
  } catch (error) {
    return refuse(error?.message ?? String(error))
  }
}
