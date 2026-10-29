import {fingerprintNativePatternBindingsSource20261023 as fingerprint,serializeNativePatternConstraintSidecar20261023 as serialize,planNativePatternConstraintBindings20261023 as planBindings} from './nativePatternConstraintBindings20261023.js'
import {simulateNativeAnchorRemap20261023 as remap,sampleNativeConstructionContour as sample} from './nativeParametricPoint20261023.js'
import {rebaseNativePatternBindingsAfterAnchorGroup20261027 as rebase} from './nativePatternBindingsRebase20261027.js'

const fail=reason=>Object.freeze({ok:false,reason,manufacturingApproved:false})
const vec=p=>Array.isArray(p)&&p.length===2&&p.every(v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=10)
const empty=x=>x==null||(Array.isArray(x)&&x.length===0)||(typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===0)
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x)}return x}
const panelFields=new Set(['id','name','polygon','layout_2d','layout_rotation_degrees','pattern','fabric','grain_degrees','placement','pins','pin_points'])
const polygonFields=new Set(['points','edges','curves','subdivisions','meshing','free_curve_points','vertex_ids','vertex_mirror_groups','holes','lines','target_lengths','notches','seam_allowances','annotations','measurements'])
const attached=['curves','free_curve_points','vertex_ids','vertex_mirror_groups','holes','lines','target_lengths','notches','seam_allowances','annotations','measurements']
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?
  Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value
const equivalentBindings=bindings=>bindings.map(binding=>{
  const copy=structuredClone(binding)
  if(Array.isArray(copy.dependsOn)&&copy.dependsOn.length===0)delete copy.dependsOn
  return canonical(copy)
})
function validateUnaffectedBindings(snapshot,sidecar){
  const reviewed=planBindings(snapshot,sidecar)
  if(!reviewed.ok)throw Error(`Saved native binding validation failed: ${reviewed.reason}`)
  if(reviewed.steps.some(step=>!step.unchanged))throw Error('Saved point bindings are not satisfied by the native source; cross-panel edit refused')
}
function qualify(panel,template){
  if(!panel||Object.keys(panel).some(k=>!panelFields.has(k))||Object.keys(panel.polygon??{}).some(k=>!polygonFields.has(k)))throw Error('Unsupported native panel or production metadata')
  if(!Array.isArray(panel.polygon?.points)||!Array.isArray(panel.polygon?.edges)||panel.polygon.points.length!==panel.polygon.edges.length)throw Error('Invalid polygon')
  if(panel.polygon.subdivisions!==undefined&&(!Number.isSafeInteger(panel.polygon.subdivisions)||panel.polygon.subdivisions<0||panel.polygon.subdivisions>0xffffffff))throw Error('Invalid subdivisions')
  if(panel.polygon.meshing!==undefined&&(panel.polygon.meshing===null||typeof panel.polygon.meshing!=='object'||Array.isArray(panel.polygon.meshing)))throw Error('Invalid meshing')
  if(panel.fabric!==undefined&&typeof panel.fabric!=='string')throw Error('Invalid fabric')
  if(panel.grain_degrees!==undefined&&!Number.isFinite(panel.grain_degrees))throw Error('Invalid grain')
  if(panel.pattern!==undefined&&(!panel.pattern||typeof panel.pattern!=='object'||Array.isArray(panel.pattern)))throw Error('Invalid pattern')
  if(panel.placement!==undefined&&(!Array.isArray(panel.placement.translation)||panel.placement.translation.length!==3||!panel.placement.translation.every(Number.isFinite)||!Array.isArray(panel.placement.rotation_degrees)||panel.placement.rotation_degrees.length!==3||!panel.placement.rotation_degrees.every(Number.isFinite)))throw Error('Invalid native 3D placement')
  if(!vec(panel.layout_2d??[0,0])||!Number.isFinite(panel.layout_rotation_degrees??0))throw Error('Invalid native board layout')
  if((template.seams??[]).some(s=>s?.a?.panel===panel.id||s?.b?.panel===panel.id))throw Error('Sewn panel is unsafe for cross-panel reference')
  if(!empty(panel.pins)||!empty(panel.pin_points)||attached.some(k=>!empty(panel.polygon[k])))throw Error('Attached panel geometry or production marks')
}
function board(panel,point){
  const a=(panel.layout_rotation_degrees??0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a),o=panel.layout_2d??[0,0]
  return [o[0]+c*point[0]-s*point[1],o[1]+s*point[0]+c*point[1]]
}
function material(panel,point){
  const a=(panel.layout_rotation_degrees??0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a),o=panel.layout_2d??[0,0],x=point[0]-o[0],y=point[1]-o[1]
  return [c*x+s*y,-s*x+c*y]
}
/** One explicit board-space source→target link, authored from a detached native snapshot.
 * Commands are ordered per Rust session's distinct-panel atomic edit-batch contract.
 * The relative vector is in metres in the global 2D board coordinate system.
 * This one-shot operation is independent of v1 same-panel formula dependencies.
 */
export function planModarisNativeCrossPieceReference20261027(snapshot,sidecar,{
  sourcePanelId,sourcePointIndex,sourceOriginalPosition,sourcePosition,
  targetPanelId,targetPointIndex,targetOriginalPosition,relativeBoardVector,
}={}){
  try{
    serialize(sidecar)
    if(sidecar.sourceRevision!==snapshot?.revision||sidecar.sourceFingerprint!==fingerprint(snapshot))throw Error('Stale native reference source or binding sidecar')
    if(typeof sourcePanelId!=='string'||typeof targetPanelId!=='string'||sourcePanelId===targetPanelId)throw Error('Source and target must belong to different panels')
    const panels=snapshot.template.panels
    const sourceMatches=panels.filter(p=>p.id===sourcePanelId),targetMatches=panels.filter(p=>p.id===targetPanelId)
    if(sourceMatches.length!==1||targetMatches.length!==1)throw Error('Missing or duplicate source/target panel')
    const source=sourceMatches[0],target=targetMatches[0]
    qualify(source,snapshot.template);qualify(target,snapshot.template)
    if(!empty(snapshot.template.grade_rules)||!empty(snapshot.template.grading)||!empty(snapshot.template.nativeGradeRules))throw Error('Graded cross-panel references are unsupported')
    if(!Number.isSafeInteger(sourcePointIndex)||!Number.isSafeInteger(targetPointIndex)||sourcePointIndex<0||targetPointIndex<0||sourcePointIndex>=source.polygon.points.length||targetPointIndex>=target.polygon.points.length)throw Error('Invalid native point index')
    if(![sourceOriginalPosition,sourcePosition,targetOriginalPosition,relativeBoardVector].every(vec))throw Error('Invalid native reference coordinates')
    if(JSON.stringify(source.polygon.points[sourcePointIndex])!==JSON.stringify(sourceOriginalPosition)||JSON.stringify(target.polygon.points[targetPointIndex])!==JSON.stringify(targetOriginalPosition))throw Error('Original point position differs from native snapshot')
    if(Math.hypot(sourcePosition[0]-sourceOriginalPosition[0],sourcePosition[1]-sourceOriginalPosition[1])<1e-8)throw Error('Source point has not moved')
    if(sidecar.bindings.some(b=>b.panelId===sourcePanelId||b.panelId===targetPanelId))throw Error('Saved point binding touches an edited panel; cross-panel references require isolated panels')
    validateUnaffectedBindings(snapshot,sidecar)
    // Relative board vector must be established against the ORIGINAL snapshot,
    // preventing a fabricated offset from silently overwriting authored shape.
    const initialSourceBoard=board(source,sourceOriginalPosition),initialTargetBoard=board(target,targetOriginalPosition)
    if(Math.hypot(initialTargetBoard[0]-initialSourceBoard[0]-relativeBoardVector[0],initialTargetBoard[1]-initialSourceBoard[1]-relativeBoardVector[1])>1e-8)throw Error('Authored board reference vector differs from original native positions')
    const movedBoard=board(source,sourcePosition),newTarget=material(target,[movedBoard[0]+relativeBoardVector[0],movedBoard[1]+relativeBoardVector[1]])
    if(!vec(newTarget))throw Error('Cross-panel target exceeds supported material coordinates')
    if(Math.hypot(newTarget[0]-targetOriginalPosition[0],newTarget[1]-targetOriginalPosition[1])<1e-8)throw Error('Dependent target remains unchanged')
    // Native construction preflight checks self-intersections, winding, and
    // sampled material geometry for EACH detached polygon independently.
    // Native absolute anchor remap and bounded contour topology sampling.
    for(const [panel,index,position] of [[source,sourcePointIndex,sourcePosition],[target,targetPointIndex,newTarget]]){
      const before=sample(panel.polygon),after=sample(remap(panel.polygon,index,position))
      const area=points=>points.reduce((sum,p,i)=>sum+p[0]*points[(i+1)%points.length][1]-p[1]*points[(i+1)%points.length][0],0)/2
      if(Math.abs(area(before))<1e-9||Math.sign(area(before))!==Math.sign(area(after))||Math.abs(area(after))<1e-9)throw Error('Unsafe cross-panel contour winding or area')
      const orient=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
      for(let i=0;i<after.length;i++){
        const j=(i+1)%after.length
        if(Math.hypot(after[i][0]-after[j][0],after[i][1]-after[j][1])<1e-6)throw Error('Collapsed dependent edge')
        for(let k=i+2;k<after.length;k++){
          if(i===0&&k===after.length-1)continue
          const l=(k+1)%after.length
          if(orient(after[i],after[j],after[k])*orient(after[i],after[j],after[l])< -1e-16&&orient(after[k],after[l],after[i])*orient(after[k],after[l],after[j])< -1e-16)throw Error('Cross-panel contour self-intersects')
        }
      }
    }
    const proposal={ok:true,op:'edit-batch',sourceRevision:snapshot.revision,sourceFingerprint:sidecar.sourceFingerprint,panelCount:2,pointCount:2,commands:[
      {kind:'AnchorGroup',panel:sourcePanelId,edits:[[sourcePointIndex,[...sourcePosition]]]},
      {kind:'AnchorGroup',panel:targetPanelId,edits:[[targetPointIndex,[...newTarget]]]},
    ],manufacturingApproved:false}
    return freeze({ok:true,proposal,targetMaterialPosition:newTarget,targetBoardPosition:[movedBoard[0]+relativeBoardVector[0],movedBoard[1]+relativeBoardVector[1]],sourceRevision:snapshot.revision,sourceFingerprint:sidecar.sourceFingerprint,manufacturingApproved:false,caveat:'One explicit cross-panel board-space dependency, applied as two native AnchorGroups in one Rust edit-batch and one Undo step. No persistent native graph, automatic subsequent recompute, or manufacturing approval.'})
  }catch(error){return fail(error?.message||String(error))}
}

/** Witness the full Rust reply, including independent per-panel normalization,
 * board rotation shifts and native 3D placement translation changes. */
export function verifyModarisNativeCrossPieceReferenceCommit20261027(before,after,sidecar,planned){
  if(planned?.ok!==true||planned?.proposal?.panelCount!==2||planned?.proposal?.pointCount!==2||planned?.proposal?.commands?.length!==2)return fail('Missing or invalid approved cross-panel proposal')
  try{
    serialize(sidecar)
    if(!before||!after||typeof before!=='object'||typeof after!=='object'||!before.template||!after.template)throw Error('Missing native Rust before/after template evidence')
    // The workspace callback carries Rust binding metadata on AFTER only.
    // Validate it before narrowing the structural rebase to the authoritative
    // revision and template fields. A missing record remains supported for
    // labelled in-memory geometric simulation tests only.
    if(Object.hasOwn(after,'nativePointBindings')){
      const native=after.nativePointBindings
      if(!native||typeof native!=='object'||Array.isArray(native)||native.active!==true||
        !Object.hasOwn(native,'measurements')||!Object.hasOwn(native,'bindings'))
        throw Error('Rust nativePointBindings missing active saved rules')
      if(native.version!==1||native.automaticRegeneration!==false||native.manufacturingApproved!==false)
        throw Error('Rust nativePointBindings must be versioned, nonautomatic and nonmanufacturing')
      if(JSON.stringify(canonical(native.measurements))!==JSON.stringify(canonical(sidecar.measurements))||
        !Array.isArray(native.bindings)||
        JSON.stringify(equivalentBindings(native.bindings))!==JSON.stringify(equivalentBindings(sidecar.bindings)))
        throw Error('Rust nativePointBindings formulas or binding identities differ from approved sidecar')
      if(native.sourceRevision!==undefined&&native.sourceRevision!==after.revision)
        throw Error('Rust nativePointBindings source revision differs from commit')
      if(native.sourceFingerprint!==undefined&&native.sourceFingerprint!==fingerprint(after))
        throw Error('Rust nativePointBindings source fingerprint differs from committed geometry')
    }
    const projection=snapshot=>({revision:snapshot.revision,template:snapshot.template})
    const witnessed=rebase(projection(before),projection(after),sidecar,planned.proposal)
    if(!witnessed.ok)return witnessed
    validateUnaffectedBindings(projection(after),witnessed.sidecar)
    return witnessed
  }catch(error){return fail(error?.message||String(error))}
}
