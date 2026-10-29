import {
  createNativePatternConstraintSidecar20261023 as createSidecar,
  fingerprintNativePatternBindingsSource20261023 as fingerprint,
  planNativePatternConstraintBindings20261023 as planBindings,
} from './nativePatternConstraintBindings20261023.js'
import {planModarisNativeReferenceRecompute20261027 as recompute} from './modarisNativeReferenceRecompute20261027.js'
import {auditNativePointGraphIntegrity20261028 as auditGraph} from './nativePointGraphIntegrity20261028.js'

const fail=reason=>Object.freeze({ok:false,reason,manufacturingApproved:false})
const finite=value=>typeof value==='number'&&Number.isFinite(value)
const freeze=value=>{
  if(value&&typeof value==='object'){
    for(const child of Object.values(value))freeze(child)
    Object.freeze(value)
  }
  return value
}

/**
 * Route an existing native 2D numerical point construction through its saved
 * dependent-reference graph. Without an active native graph, the original
 * one-point Anchor remains unchanged. When an in-project graph exists it must
 * NEVER silently devolve to a bare Anchor that invalidates every rule.
 *
 * This is a guarded one-shot workflow for already-authorized manual numeric
 * construction. It is not global automatic recompute of arbitrary Rust edits.
 */
export function routeModarisNativeNumericalAnchor20261027(snapshot,construction){
  try{
    if(construction?.ok!==true||construction?.command?.kind!=='Anchor'||
       !Number.isSafeInteger(construction.revision)||construction.revision!==snapshot?.revision||
       !Array.isArray(snapshot?.template?.panels))throw Error('Stale or invalid native numerical construction')
    const command=construction.command
    if(typeof command.panel!=='string'||!Number.isSafeInteger(command.anchor)||command.anchor<0||
       !Array.isArray(command.position)||command.position.length!==2||!command.position.every(finite))
      throw Error('Malformed native numerical Anchor')
    const panel=snapshot.template.panels.find(item=>item.id===command.panel)
    if(!panel||snapshot.template.panels.filter(item=>item.id===command.panel).length!==1||
       command.anchor>=panel.polygon?.points?.length||
       construction.panelId!==command.panel||construction.pointIndex!==command.anchor)
      throw Error('Native numerical point identity changed')
    const previous=panel.polygon.points[command.anchor]
    if(!Array.isArray(previous)||previous.length!==2||!previous.every(finite)||
       Math.hypot(previous[0]-command.position[0],previous[1]-command.position[1])<1e-8)
      throw Error('Native numerical construction has no material-space displacement')
    const graph=snapshot.nativePointBindings
    if(!graph)return freeze({ok:true,mode:'direct',command:structuredClone(command),
      sourceRevision:snapshot.revision,manufacturingApproved:false})
    if(graph.active!==true||!Array.isArray(graph.bindings)||graph.bindings.length===0||
       !graph.measurements||typeof graph.measurements!=='object')
      throw Error('Saved native measurement bindings are inactive or malformed; refuse bare Anchor')
    const created=createSidecar(snapshot,{measurements:graph.measurements,bindings:graph.bindings})
    if(!created.ok)throw Error(`Native binding graph cannot be reauthenticated: ${created.reason}`)
    if(graph.sourceRevision!==undefined&&graph.sourceRevision!==snapshot.revision)
      throw Error('Persisted binding source revision does not match numerical construction')
    if(graph.sourceFingerprint!==undefined&&graph.sourceFingerprint!==fingerprint(snapshot))
      throw Error('Persisted binding source geometry differs from current native source')
    const current=planBindings(snapshot,created.sidecar)
    if(!current.ok)throw Error(`Saved native bindings could not be validated: ${current.reason}`)
    const audited=auditGraph(snapshot,created.sidecar,{sourcePanelId:command.panel})
    if(!audited.ok)throw Error(`Saved native graph integrity check: ${audited.reason}`)
    const input={panelId:command.panel,pointIndex:command.anchor,
      originalPosition:[...previous],position:[...command.position]}
    const planned=recompute(snapshot,created.sidecar,input)
    if(!planned.ok)throw Error(`Linked source change refused: ${planned.reason}`)
    if(planned.proposal.commands.length!==1||planned.proposal.commands[0].panel!==command.panel||
       planned.proposal.commands[0].edits[0]?.[0]!==command.anchor||
       JSON.stringify(planned.proposal.commands[0].edits[0]?.[1])!==JSON.stringify(command.position))
      throw Error('Planned grouped edit changes the manually authorized native source Anchor')
    return freeze({ok:true,mode:'linked-native',sourceRevision:snapshot.revision,
      sourceFingerprint:created.sidecar.sourceFingerprint,sidecar:structuredClone(created.sidecar),
      input,batch:structuredClone(planned.proposal),dependentCount:planned.correctedBindingIds.length,
      dependentBindingIds:[...planned.correctedBindingIds],manufacturingApproved:false,
      note:'Authenticated native numeric reference edit and all its qualified same-panel dependents. Unsewn/graded restrictions apply.'})
  }catch(error){return fail(error?.message??String(error))}
}
