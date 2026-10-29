import {cloneProject,touchProject} from './project.js'
import {reapplyIndustrialAllowanceGraph} from './industrialAllowanceGraph20261027.js'
import {guardIndustrialAllowanceReactiveReapply} from './industrialAllowanceReactiveGuard20261027.js'
import {applyModarisSizeLinkedGradeMutation} from './modarisSizeLinkedGradeMutation20261027.js'

const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b)

/**
 * Pure legacy 2D project transaction boundary. The caller supplies the
 * before state and a draft AFTER mirror synchronization. Validation and
 * propagation are all-or-nothing and return a fresh undoable project copy.
 */
export function finalizeIndustrialAllowanceMutation20261027(
  before,draft,{verifiedAllowanceReapply=null,verifiedGradeDraft=null}={}
){
  const candidate=cloneProject(draft)
  // Recompute the complete linked-grade candidate from its original draft,
  // before trusting any differing industrialGradeRule fields during a linked
  // allowance transaction. A forged trust flag or changed grade target is not
  // enough to bypass the strict ordinary point/topology comparison.
  if(verifiedGradeDraft!==null){
    const verified=applyModarisSizeLinkedGradeMutation(before,verifiedGradeDraft)
    if(!verified.validation.linked||!same(verified.project,candidate))
      throw Error('Linked grade evidence differs from the validated source transaction')
  }
  if(before?.industrialAllowanceGraph&&verifiedAllowanceReapply){
    const reference=reapplyIndustrialAllowanceGraph(before,{expectedRevision:before.revision}).project
    if(!same(reference,verifiedAllowanceReapply)||!same(reference,candidate))
      throw Error('Persistent seam-value graph reapplication differs from its verified source')
  }
  touchProject(candidate)
  if(!before?.industrialAllowanceGraph||verifiedAllowanceReapply){
    return {project:candidate,changedSources:[],reactivelyReapplied:false,factoryCertified:false}
  }
  const decision=guardIndustrialAllowanceReactiveReapply(before,candidate,{
    verifiedGradeMutation:verifiedGradeDraft!==null,
  })
  if(!decision.safe){
    const error=new Error('Linked seam-value edit refused: '+decision.reason)
    error.code=decision.code
    throw error
  }
  if(!decision.shouldReapply)
    return {project:candidate,changedSources:[],reactivelyReapplied:false,factoryCertified:false}
  const regenerated=reapplyIndustrialAllowanceGraph(candidate,{expectedRevision:candidate.revision})
  return {project:regenerated.project,changedSources:decision.changedSources,
    reactivelyReapplied:true,factoryCertified:false}
}
