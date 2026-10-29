import {fingerprintNativePatternBindingsSource20261023 as fingerprint,serializeNativePatternConstraintSidecar20261023 as serialize,planNativePatternConstraintBindings20261023 as plan} from './nativePatternConstraintBindings20261023.js'
import {rebaseNativePatternBindingsAfterAnchorGroup20261027 as rebase} from './nativePatternBindingsRebase20261027.js'
import {evaluateNativeDraftFormulas20261023 as evaluate} from './nativeParametricFormula20261023.js'

const refuse=reason=>({ok:false,reason,manufacturingApproved:false})
const finite=n=>typeof n==='number'&&Number.isFinite(n)
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])
const deepFreeze=x=>{if(x&&typeof x==='object'){for(const v of Object.values(x))deepFreeze(v);Object.freeze(x)}return x}

/**
 * Inverse reconciliation of one observed Rust AnchorGroup command, with exact
 * committed-snapshot rebase verification. No native command is issued here.
 * Input proposal is the actual one-edit batch submitted to Rust; after is its
 * committed response, including the single per-panel normalization.
 */
export function reconcileModarisBidirectionalChart20261027(before,after,sidecar,proposal,{bindingId}={}){
  try{
    serialize(sidecar)
    if(typeof bindingId!=='string'||!bindingId)throw Error('Select a binding identity')
    if(sidecar.sourceRevision!==before?.revision||sidecar.sourceFingerprint!==fingerprint(before))throw Error('Stale source project or fingerprint')
    const bindings=sidecar.bindings
    const matches=bindings.filter(b=>b.id===bindingId)
    if(matches.length!==1)throw Error('Unknown or duplicate binding')
    const binding=matches[0]
    if(binding.dependsOn?.length||bindings.some(b=>b.id!==bindingId&&b.dependsOn?.includes(bindingId)))throw Error('Dependent binding rules are ambiguous')
    if(!['along','normal','polar'].includes(binding.mode))throw Error('Unsupported inverse construction')
    const variable=binding.distanceFormula
    if(!/^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(variable))throw Error('Formula is not a directly invertible named measurement')
    if(!Object.hasOwn(sidecar.measurements,variable))throw Error('Missing named measurement')
    if(bindings.some(b=>b.id!==bindingId&&new RegExp('\\b'+variable+'\\b').test(b.distanceFormula)))throw Error('Shared measurement controls multiple bindings')
    const original=sidecar.measurements[variable]
    if(!(finite(original)||(original&&Object.getPrototypeOf(original)===Object.prototype&&Object.keys(original).length===1&&finite(original.valueMm))))throw Error('Measurement is computed or non-invertible')
    if(Object.entries(sidecar.measurements).some(([name,val])=>name!==variable&&val&&typeof val==='object'&&typeof val.formula==='string'&&new RegExp('\\b'+variable+'\\b').test(val.formula)))throw Error('Dependent measurement formula')
    if(proposal?.ok!==true||proposal.op!=='edit-batch'||proposal.sourceRevision!==before.revision||proposal.sourceFingerprint!==sidecar.sourceFingerprint||proposal.panelCount!==1||proposal.pointCount!==1||proposal.commands?.length!==1)throw Error('Expected one native AnchorGroup edit')
    const command=proposal.commands[0]
    if(command?.kind!=='AnchorGroup'||command.panel!==binding.panelId||command.edits?.length!==1||command.edits[0]?.[0]!==binding.pointIndex)throw Error('Committed edit targets a different binding')
    const edited=command.edits[0][1]
    if(!Array.isArray(edited)||edited.length!==2||!edited.every(finite))throw Error('Invalid native edit position')
    const panel=before.template.panels.filter(p=>p.id===binding.panelId)
    if(panel.length!==1)throw Error('Missing or duplicate source panel')
    const points=panel[0].polygon.points
    if(!Array.isArray(points)||points.length<3||points.length>128||!points.every(p=>Array.isArray(p)&&p.length===2&&p.every(finite)))throw Error('Unsupported source geometry')
    if(binding.pointIndex===binding.a||(binding.mode!=='polar'&&binding.pointIndex===binding.b))throw Error('Target is a construction reference')
    const A=points[binding.a],B=points[binding.b]
    if(!A||(binding.mode!=='polar'&&!B))throw Error('Missing reference anchor')
    let axis
    if(binding.mode==='polar'){
      if(!finite(binding.angleDeg??0))throw Error('Invalid polar angle')
      const angle=(binding.angleDeg??0)*Math.PI/180
      axis=[Math.cos(angle),Math.sin(angle)]
    }else{
      const dx=B[0]-A[0],dy=B[1]-A[1],length=Math.hypot(dx,dy)
      if(length<1e-6)throw Error('Collapsed reference baseline')
      axis=binding.mode==='along'?[dx/length,dy/length]:[-dy/length,dx/length]
    }
    const delta=[edited[0]-A[0],edited[1]-A[1]]
    const signedMm=(delta[0]*axis[0]+delta[1]*axis[1])*1000
    const transverseMm=Math.abs(delta[0]*axis[1]-delta[1]*axis[0])*1000
    if(!finite(signedMm)||Math.abs(signedMm)>5000||transverseMm>1e-5)throw Error('Edited point is off the bound construction axis')
    if(distance(edited,points[binding.pointIndex])<1e-8)throw Error('No geometric change to reconcile')
    const verified=rebase(before,after,sidecar,proposal)
    if(!verified.ok)throw Error('Native commit evidence: '+verified.reason)
    const revised=structuredClone(verified.sidecar)
    revised.measurements[variable]=finite(original)?signedMm:{...original,valueMm:signedMm}
    serialize(revised)
    const resolved=evaluate({measurements:revised.measurements})
    if(!resolved.ok)throw Error(resolved.reason)
    // A refreshed worksheet must reproduce the observed native geometry
    // when evaluated against the PRE-COMMIT source coordinate frame.
    const replay=structuredClone(sidecar)
    replay.measurements[variable]=revised.measurements[variable]
    const predicted=plan(before,replay)
    if(!predicted.ok)throw Error('Inverse replay rejected: '+predicted.reason)
    const step=predicted.steps.find(s=>s.bindingId===bindingId)
    if(!step||distance(step.command.position,edited)>1e-8)throw Error('Inverse replay does not match the native edit')
    return deepFreeze({ok:true,sidecar:revised,measurements:structuredClone(revised.measurements),
      measurementName:variable,previousValueMm:finite(original)?original:original.valueMm,
      valueMm:signedMm,mode:binding.mode,bindingId,transverseErrorMm:transverseMm,
      sourceRevision:after.revision,sourceFingerprint:revised.sourceFingerprint,
      nativeEvidenceVerified:true,manufacturingApproved:false,
      caveat:'Observed one committed Rust AnchorGroup edit. Reconciled worksheet/sidecar is detached and must be explicitly saved; further geometry edits require another verified reconciliation.'})
  }catch(error){return refuse(error?.message??String(error))}
}
