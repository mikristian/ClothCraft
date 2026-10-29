import {planNativePatternConstraintBindings20261023} from './nativePatternConstraintBindings20261023.js'
import {nativePointGraphGradingBlocker20261028 as gradingBlocker} from './nativePointGraphIntegrity20261028.js'

/**
 * Real, source-fingerprinted edit-batch proposal for multiple INDEPENDENT
 * native garment panels. AnchorGroup normalizes a panel only after ALL its
 * ordered point edits; different panels are evaluated in independent material
 * coordinate frames. This is one-shot regeneration, not a continuously
 * evaluated parametric constraint engine.
 */
export function planNativeAtomicPointBindings20261027(snapshot, sidecar) {
  const incompatible=gradingBlocker(snapshot)
  if(incompatible)return {ok:false,reason:incompatible,manufacturingApproved:false}
  const planned = planNativePatternConstraintBindings20261023(snapshot, sidecar)
  if (!planned.ok) return {ok:false,reason:planned.reason,manufacturingApproved:false}
  if (planned.commands.length < 1 || planned.commands.length > 128)
    return {ok:false,reason:'Atomic point edits require 1–128 points',manufacturingApproved:false}
  const grouped=new Map()
  for (const command of planned.commands) {
    if (command?.kind !== 'Anchor' || typeof command.panel !== 'string' ||
        !Number.isSafeInteger(command.anchor) || command.anchor < 0 ||
        !Array.isArray(command.position) || command.position.length!==2 ||
        !command.position.every(Number.isFinite))
      return {ok:false,reason:'Invalid native Anchor command in binding plan',manufacturingApproved:false}
    if (!grouped.has(command.panel)) grouped.set(command.panel,[])
    const group=grouped.get(command.panel)
    if(group.some(([anchor])=>anchor===command.anchor))return {
      ok:false,reason:'Duplicate point target inside atomic panel group',manufacturingApproved:false,
    }
    group.push([command.anchor,[...command.position]])
    if(group.length>32||grouped.size>32)return {
      ok:false,reason:'Atomic native batch is limited to 32 panels and 32 edits per panel',manufacturingApproved:false,
    }
  }
  return Object.freeze({
    ok:true,sourceRevision:planned.sourceRevision,
    sourceFingerprint:planned.sourceFingerprint,
    panelCount:grouped.size,pointCount:planned.commands.length,
    dependencyOrder:Object.freeze([...planned.dependencyOrder]),
    commands:Object.freeze([...grouped].map(([panel,edits])=>Object.freeze({
      kind:'AnchorGroup',panel,
      edits:Object.freeze(edits.map(([anchor,position])=>Object.freeze([
        anchor,Object.freeze(position),
      ]))),
    }))),
    op:'edit-batch',manufacturingApproved:false,
    caveat:'Atomic source edit of ordered point groups with one normalization per panel; links remain browser-side snapshots and require re-planning after the source changes. Existing grade/cutline/fit QA is not certified.',
  })
}
