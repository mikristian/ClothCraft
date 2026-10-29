import {
  planNativePatternConstraintBindings20261023 as evaluateBindings,
  serializeNativePatternConstraintSidecar20261023 as serialize,
} from './nativePatternConstraintBindings20261023.js'

const fail=reason=>Object.freeze({ok:false,reason,manufacturingApproved:false})
const key=(panelId,pointIndex)=>JSON.stringify([panelId,pointIndex])
const unique=items=>new Set(items).size===items.length

/** One shared safety boundary for ALL browser-authored point edit batches.
 * A saved Rust six-size catalog cannot be silently invalidated by editing
 * only the base-size template; use Rust's grade-regenerate command instead. */
export function nativePointGraphGradingBlocker20261028(snapshot){
  if(snapshot?.gradeRunPersisted===true||snapshot?.gradeRun!=null||
    snapshot?.activeGradedSize!=null||snapshot?.gradedSizePreview===true||
    snapshot?.fabricGradeEnvelope!=null)
    return 'Active or persisted native grading requires qualified six-size Rust regeneration; single-size point batch refused'
  return ''
}

/**
 * Shared read-only preflight for authored v1 point bindings. All callers
 * (interactive numeric source changes, reference recompute and postcommit
 * verification) must enforce the same actual-reference dependency topology.
 *
 * A dependsOn ID is only a sequencing hint. It cannot express a geometric
 * cross-panel source reference: all v1 a/b indices are local to the target
 * panel. Never silently treat a cross-panel hint as real regeneration.
 *
 * A source panel is allowed to have dependent points awaiting regeneration;
 * every OTHER panel must ALREADY satisfy its saved rules before committing
 * an edit that leaves it unchanged. Without sourcePanelId ALL rules must be
 * satisfied (appropriate for postcommit verification).
 */
export function auditNativePointGraphIntegrity20261028(snapshot,sidecar,{sourcePanelId=null}={}){
  try{
    serialize(sidecar)
    // Saved six-size catalogs and active-size previews are Rust-owned.
    // A browser-authored base-size AnchorGroup cannot regenerate their size
    // templates, graded POMs and sewn production derivatives atomically.
    // Route those changes through bindings-grade-regenerate, never here.
    const gradingBlocker=nativePointGraphGradingBlocker20261028(snapshot)
    if(gradingBlocker)throw Error(gradingBlocker)
    const panels=snapshot?.template?.panels
    if(!Array.isArray(panels)||!unique(panels.map(p=>p.id)))throw Error('Missing or duplicate native panel')
    if(sourcePanelId!==null&&(
      typeof sourcePanelId!=='string'||panels.filter(p=>p.id===sourcePanelId).length!==1))
      throw Error('Unknown native source panel for dependency audit')
    const byId=new Map(sidecar.bindings.map(b=>[b.id,b]))
    const byTarget=new Map(sidecar.bindings.map(b=>[key(b.panelId,b.pointIndex),b]))
    if(byId.size!==sidecar.bindings.length||byTarget.size!==sidecar.bindings.length)
      throw Error('Duplicate saved point binding identity')
    for(const binding of sidecar.bindings){
      const panel=panels.find(p=>p.id===binding.panelId)
      if(!panel||!Array.isArray(panel.polygon?.points))throw Error('Saved point binding refers to an unknown panel')
      const indices=binding.mode==='polar'?[binding.a]:[binding.a,binding.b]
      if(binding.pointIndex>=panel.polygon.points.length||
        indices.some(index=>index>=panel.polygon.points.length))
        throw Error(`Saved point binding ${binding.id} refers to an absent anchor`)
      if(indices.includes(binding.pointIndex))throw Error(`Self-referential bound anchor ${binding.id}`)
      const required=indices.map(index=>byTarget.get(key(binding.panelId,index))?.id).filter(Boolean)
      const declared=binding.dependsOn??[]
      if(declared.some(id=>byId.get(id)?.panelId!==binding.panelId))
        throw Error('Cross-panel dependency requires atomic multi-panel regeneration and explicit geometric reference semantics')
      if(!unique(declared)||!unique(required)||
        declared.length!==required.length||
        declared.some(id=>!required.includes(id)))
        throw Error(`Saved dependency graph for ${binding.id} differs from actual same-panel reference anchors`)
    }
    const evaluated=evaluateBindings(snapshot,sidecar)
    if(!evaluated.ok)throw Error(`Native binding evaluation failed: ${evaluated.reason}`)
    const drifted=evaluated.steps.filter(step=>!step.unchanged&&(
      sourcePanelId===null||step.command.panel!==sourcePanelId))
    if(drifted.length)
      throw Error(sourcePanelId===null?
        `Committed native graph does not satisfy every persisted point binding: ${drifted.map(s=>s.bindingId).join(', ')}`:
        `Unrelated native panel already violates a saved binding (does not satisfy every persisted point binding): ${drifted.map(s=>s.bindingId).join(', ')}`)
    return Object.freeze({ok:true,sourceRevision:sidecar.sourceRevision,
      sourcePanelId,verifiedBindingCount:evaluated.steps.length,
      unchangedOtherPanels:true,dependencyOrder:Object.freeze([...evaluated.dependencyOrder]),
      manufacturingApproved:false,
      note:'One revision-scoped point-graph integrity check. No persistent cross-panel graph or industrial qualification.'})
  }catch(error){return fail(error?.message??String(error))}
}
