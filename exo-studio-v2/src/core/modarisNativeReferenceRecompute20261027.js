import {fingerprintNativePatternBindingsSource20261023 as fingerprint, serializeNativePatternConstraintSidecar20261023 as serialize} from './nativePatternConstraintBindings20261023.js'
import {buildNativeParametricPointProposal as pointPlan, simulateNativeAnchorRemap20261023 as remap, sampleNativeConstructionContour as sample} from './nativeParametricPoint20261023.js'
import {evaluateNativeDraftFormulas20261023 as evaluate} from './nativeParametricFormula20261023.js'
import {auditNativePointGraphIntegrity20261028 as auditGraph} from './nativePointGraphIntegrity20261028.js'

const fail=reason=>Object.freeze({ok:false,reason,manufacturingApproved:false})
const finite=p=>Array.isArray(p)&&p.length===2&&p.every(x=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<=10)
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x)}return x}
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
const area=p=>p.reduce((v,x,i)=>v+x[0]*p[(i+1)%p.length][1]-x[1]*p[(i+1)%p.length][0],0)/2
const intersect=(a,b,c,d)=>{const x=cross(a,b,c),y=cross(a,b,d),z=cross(c,d,a),w=cross(c,d,b);return (x*y< -1e-16&&z*w< -1e-16)}
function safeContour(polygon,sign){
  const points=sample(polygon),a=area(points)
  if(Math.abs(a)<1e-9||(sign!==undefined&&Math.sign(a)!==sign))throw Error('Unsafe topology: zero area or reversed winding')
  for(let i=0;i<points.length;i++){
    const next=(i+1)%points.length
    if(Math.hypot(points[i][0]-points[next][0],points[i][1]-points[next][1])<1e-6)throw Error('Unsafe topology: collapsed edge')
    for(let j=i+2;j<points.length;j++){
      if(i===0&&j===points.length-1)continue
      if(intersect(points[i],points[next],points[j],points[(j+1)%points.length]))throw Error('Unsafe topology: crossing contour')
    }
  }
  return Math.sign(a)
}
const allowedPanel=new Set(['id','name','polygon','layout_2d','layout_rotation_degrees','pattern','fabric','grain_degrees','placement','pins','pin_points'])
const allowedPolygon=new Set(['points','edges','curves','subdivisions','meshing','free_curve_points','vertex_ids','vertex_mirror_groups','holes','lines','target_lengths','notches','seam_allowances','annotations','measurements'])
const empty=v=>v==null||(Array.isArray(v)&&v.length===0)||(typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===0)
const vec3=v=>Array.isArray(v)&&v.length===3&&v.every(Number.isFinite)
function qualified(panel,template){
  if(Object.keys(panel).some(k=>!allowedPanel.has(k))||Object.keys(panel.polygon??{}).some(k=>!allowedPolygon.has(k)))
    throw Error('Unsafe topology or attachment metadata; qualified unsewn flat polygon only')
  if(typeof panel.fabric!=='undefined'&&typeof panel.fabric!=='string')throw Error('Invalid native fabric reference')
  if(panel.grain_degrees!==undefined&&!Number.isFinite(panel.grain_degrees))throw Error('Invalid native grain')
  if(panel.layout_2d!==undefined&&!finite(panel.layout_2d))throw Error('Invalid native layout')
  if(panel.placement!==undefined&&(!vec3(panel.placement?.translation)||!vec3(panel.placement?.rotation_degrees)))
    throw Error('Invalid native 3D placement')
  if((template.seams??[]).some(s=>s?.a?.panel===panel.id||s?.b?.panel===panel.id))
    throw Error('Sewn panel reference cannot be recomputed')
  if(!empty(template.grade_rules)||!empty(template.grading)||!empty(template.nativeGradeRules))
    throw Error('Graded references require independent safety validation')
  for(const key of ['pins','pin_points'])if(!empty(panel[key]))throw Error(`Attached native ${key} refuses recompute`)
  for(const key of ['curves','free_curve_points','vertex_ids','vertex_mirror_groups','holes','lines','target_lengths','notches','seam_allowances','annotations','measurements'])
    if(!empty(panel.polygon[key]))throw Error(`Attached native ${key} refuses recompute`)
  // Rust primitive authoring initializes PolygonPattern.subdivisions to u32 zero.
  if(panel.polygon.subdivisions!==undefined&&(!Number.isSafeInteger(panel.polygon.subdivisions)||panel.polygon.subdivisions<0||panel.polygon.subdivisions>0xffffffff))
    throw Error('Invalid native subdivisions')
  if(panel.polygon.meshing!==undefined&&(panel.polygon.meshing===null||typeof panel.polygon.meshing!=='object'||Array.isArray(panel.polygon.meshing)))
    throw Error('Invalid native meshing')
}
/**
 * Recompute an unbound source anchor and all existing point links in topological order.
 * All edits remain material-space positions until one native AnchorGroup normalization.
 * This one-shot planner does not persist a reactive graph in Rust.
 */
export function planModarisNativeReferenceRecompute20261027(snapshot,sidecar,{
  panelId,pointIndex,originalPosition,position,
}={}){
  try{
    serialize(sidecar)
    if(sidecar.sourceRevision!==snapshot?.revision||sidecar.sourceFingerprint!==fingerprint(snapshot))
      throw Error('Stale native reference source or sidecar fingerprint')
    const panel=snapshot.template.panels.find(p=>p.id===panelId)
    if(!panel||snapshot.template.panels.filter(p=>p.id===panelId).length!==1)throw Error('Missing or duplicate source panel')
    qualified(panel,snapshot.template)
    if(!Number.isSafeInteger(pointIndex)||pointIndex<0||pointIndex>=panel.polygon.points.length||!finite(originalPosition)||!finite(position))
      throw Error('Invalid source anchor or position')
    if(JSON.stringify(panel.polygon.points[pointIndex])!==JSON.stringify(originalPosition))
      throw Error('Source point differs from original position')
    if(Math.hypot(position[0]-originalPosition[0],position[1]-originalPosition[1])<1e-8)
      throw Error('Source point is unchanged')
    if(sidecar.bindings.some(b=>b.panelId===panelId&&b.pointIndex===pointIndex))
      throw Error('Bound source anchor cannot be edited as independent reference')
    const targets=new Set(),ids=new Set(),byId=new Map()
    for(const b of sidecar.bindings){
      const key=`${b.panelId}: ${b.pointIndex}`
      if(targets.has(key)||ids.has(b.id))throw Error('Duplicate bound anchor or binding ID')
      targets.add(key);ids.add(b.id);byId.set(b.id,b)
      const p=snapshot.template.panels.find(x=>x.id===b.panelId)
      if(!p)throw Error('Missing dependent panel')
      if(b.panelId===panelId)qualified(p,snapshot.template)
      if(b.panelId!==panelId)continue
      if(b.a===b.pointIndex||b.b===b.pointIndex)throw Error('Self-referential bound anchor')
    }
    const ordered=[],active=new Set(),done=new Set()
    const visit=id=>{
      if(active.has(id))throw Error('Circular point-binding dependency')
      if(done.has(id))return
      const b=byId.get(id)
      if(!b)throw Error('Unknown binding dependency')
      active.add(id)
      for(const dep of b.dependsOn??[])visit(dep)
      active.delete(id);done.add(id);ordered.push(b)
    }
    for(const b of sidecar.bindings)visit(b.id)
    // A one-panel AnchorGroup cannot atomically update another panel. Even if
    // its current coordinates happen to satisfy a cross-panel dependent rule,
    // accepting that rule would falsely claim a fully regenerated graph.
    for(const b of ordered){
      if(b.panelId===panelId)continue
      const stack=[...(b.dependsOn??[])],visited=new Set()
      while(stack.length){
        const id=stack.pop()
        if(visited.has(id))continue
        visited.add(id)
        const dependency=byId.get(id)
        if(dependency?.panelId===panelId)
          throw Error('Cross-panel dependency requires atomic multi-panel regeneration')
        stack.push(...(dependency?.dependsOn??[]))
      }
    }
    // Shared integrity gate for both native numerical and reference-point
    // authoring. The one-panel native batch must not claim it has preserved
    // the complete graph if an untouched panel already violates a saved rule,
    // or if dependsOn omits a local bound reference used by the construction.
    const graphAudit=auditGraph(snapshot,sidecar,{sourcePanelId:panelId})
    if(!graphAudit.ok)throw Error(graphAudit.reason)
    const originalSign=safeContour(panel.polygon)
    const copy=structuredClone(snapshot),working=copy.template.panels.find(p=>p.id===panelId)
    working.polygon=remap(working.polygon,pointIndex,position)
    safeContour(working.polygon,originalSign)
    const edits=[[pointIndex,[...position]]],seen=new Set([pointIndex]),changedIds=[]
    for(const b of ordered){
      if(b.panelId!==panelId)continue
      const distances=Object.assign(Object.create(null),sidecar.measurements)
      distances._binding_distance={formula:b.distanceFormula}
      const calculated=evaluate({measurements:distances})
      if(!calculated.ok)throw Error(`Invalid dependent formula ${b.id}: ${calculated.reason}`)
      const planned=pointPlan(copy,{panelId,pointIndex:b.pointIndex,mode:b.mode,a:b.a,b:b.b,
        angleDeg:b.angleDeg??0,distanceMm:calculated.valuesMm._binding_distance,allowUnchanged:true})
      if(!planned.ok)throw Error(`Dependent binding ${b.id}: ${planned.reason}`)
      if(planned.unchanged)continue
      if(seen.has(b.pointIndex))throw Error('Duplicate AnchorGroup target')
      seen.add(b.pointIndex)
      if(edits.length>=32)throw Error('AnchorGroup maximum 32 edits exceeded')
      working.polygon=remap(working.polygon,b.pointIndex,planned.command.position)
      safeContour(working.polygon,originalSign)
      edits.push([b.pointIndex,[...planned.command.position]])
      changedIds.push(b.id)
    }
    // Re-check every binding against the final geometry, including references
    // changed later in topological order; reject implicit cycles/ref chains.
    for(const b of ordered){
      if(b.panelId!==panelId)continue
      const values=Object.assign(Object.create(null),sidecar.measurements)
      values._binding_distance={formula:b.distanceFormula}
      const calculated=evaluate({measurements:values})
      if(!calculated.ok)throw Error(calculated.reason)
      const check=pointPlan(copy,{panelId,pointIndex:b.pointIndex,mode:b.mode,a:b.a,b:b.b,
        angleDeg:b.angleDeg??0,distanceMm:calculated.valuesMm._binding_distance,allowUnchanged:true})
      if(!check.ok||!check.unchanged)throw Error('Unresolved dependent references or unsafe binding order')
    }
    const proposal={ok:true,op:'edit-batch',sourceRevision:snapshot.revision,
      sourceFingerprint:sidecar.sourceFingerprint,panelCount:1,pointCount:edits.length,
      dependencyOrder:ordered.map(b=>b.id),
      commands:[{kind:'AnchorGroup',panel:panelId,edits}],manufacturingApproved:false}
    return freeze({ok:true,proposal,sourcePanel:panelId,sourcePointIndex:pointIndex,
      correctedBindingIds:changedIds,unchangedOtherPanels:true,sourceRevision:snapshot.revision,
      sourceFingerprint:sidecar.sourceFingerprint,verifiedBindingCount:graphAudit.verifiedBindingCount,
      manufacturingApproved:false,
      caveat:'Qualified one-shot native point graph recomputation; Rust AnchorGroup executes one panel normalization. No persistent source subscription, sewn/graded geometry or production acceptance.'})
  }catch(error){return fail(error?.message??String(error))}
}
