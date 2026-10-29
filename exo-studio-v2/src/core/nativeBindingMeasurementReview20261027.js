import {createNativePatternConstraintSidecar20261023 as create,planNativePatternConstraintBindings20261023 as plan} from './nativePatternConstraintBindings20261023.js'
import {planNativeAtomicPointBindings20261027 as atomicPlan} from './nativeAtomicPointBindings20261027.js'

// Measurement-only revision: preserve targets, references and dependency order.
// Never rebase stale geometry or write native source while reviewing formulas.
export function reviewNativeBindingMeasurements(snapshot,sidecar,measurements){
  const current=plan(snapshot,sidecar)
  if(!current.ok)return {ok:false,reason:current.reason,manufacturingApproved:false}
  const created=create(snapshot,{measurements,bindings:sidecar.bindings})
  if(!created.ok)return created
  const proposed=plan(snapshot,created.sidecar)
  if(!proposed.ok)return proposed
  const atomic=atomicPlan(snapshot,created.sidecar)
  if(!atomic.ok&&proposed.commands.length)return atomic
  return {ok:true,sidecar:created.sidecar,atomic:atomic.ok?atomic:null,
    noGeometryChanges:proposed.commands.length===0,manufacturingApproved:false,
    changes:proposed.steps.map((step,index)=>({bindingId:step.bindingId,
      beforeMm:[...current.steps[index].afterMm],afterMm:[...step.afterMm],
      deltaMm:step.afterMm.map((value,axis)=>value-current.steps[index].afterMm[axis])}))}
}
