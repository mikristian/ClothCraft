import {
  createNativePatternConstraintSidecar20261023 as createSidecar,
  fingerprintNativePatternBindingsSource20261023 as fingerprint,
  planNativePatternConstraintBindings20261023 as planBindings,
} from './nativePatternConstraintBindings20261023.js'
import {evaluateNativeDraftFormulas20261023 as evaluateFormulas} from './nativeParametricFormula20261023.js'

const fail = reason => Object.freeze({ok:false,reason,manufacturingApproved:false})
const canonical = value => Array.isArray(value) ? value.map(canonical) :
  value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key,canonical(value[key])])) : value
const same = (a,b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b))
const rules = list => list.map(item => {
  const copy = structuredClone(item)
  if (Array.isArray(copy.dependsOn) && copy.dependsOn.length === 0) delete copy.dependsOn
  return copy
})
const direct = value => typeof value === 'number' ? value :
  value && typeof value === 'object' && !Object.hasOwn(value,'formula') ? value.valueMm : undefined
const withValue = (old,valueMm) => typeof old === 'number' ? valueMm : {valueMm}
const near = (a,b) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a-b)<=1e-8
const nearVec = (a,b) => Array.isArray(a) && Array.isArray(b) && a.length===b.length &&
  a.every((value,i)=>near(value,b[i]))
function rotatedXYZ(vector,degrees){
  if(!Array.isArray(degrees)||degrees.length!==3||!degrees.every(Number.isFinite))
    throw Error('Invalid native 3D placement rotation')
  const [rx,ry,rz]=degrees.map(n=>n*Math.PI/180)
  let [x,y,z]=vector
  ;[x,y]=[x*Math.cos(rz)-y*Math.sin(rz),x*Math.sin(rz)+y*Math.cos(rz)]
  ;[x,z]=[x*Math.cos(ry)+z*Math.sin(ry),-x*Math.sin(ry)+z*Math.cos(ry)]
  ;[y,z]=[y*Math.cos(rx)-z*Math.sin(rx),y*Math.sin(rx)+z*Math.cos(rx)]
  return [x,y,z]
}

/** Preflight a single Rust-owned numeric measurement transaction. No browser
 * geometry or dependent point coordinates are included in the RPC. */
export function prepareModarisNativeMeasurementCommit20261027(snapshot,sidecar,measurement,valueMm) {
  try {
    if (!Number.isSafeInteger(snapshot?.revision) || !snapshot?.nativePointBindings?.active)
      throw Error('An active, revisioned native Rust binding graph is required')
    if (!sidecar || sidecar.sourceRevision !== snapshot.revision ||
        sidecar.sourceFingerprint !== fingerprint(snapshot)) throw Error('Native source revision or fingerprint is stale')
    const native = snapshot.nativePointBindings
    if (native.version !== 1 || !same(native.measurements,sidecar.measurements) ||
        !same(rules(native.bindings??[]),rules(sidecar.bindings??[])))
      throw Error('Native persisted measurements or binding identities differ from the reviewed source')
    if (typeof measurement !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(measurement) ||
        !Object.hasOwn(sidecar.measurements,measurement)) throw Error('Choose a saved, named direct measurement')
    const expectedValueMm = direct(sidecar.measurements[measurement])
    if (!Number.isFinite(expectedValueMm) || !Number.isFinite(valueMm) ||
        Math.abs(valueMm)>5000 || Math.abs(expectedValueMm)>5000 ||
        Math.abs(valueMm-expectedValueMm)<1e-8)
      throw Error('Measurement must be direct, changed, finite and within ±5000 mm')
    if (!Array.isArray(sidecar.bindings) || !sidecar.bindings.length ||
        new Set(sidecar.bindings.map(b=>b.panelId)).size!==1 ||
        sidecar.bindings.some(b=>!Object.hasOwn(sidecar.measurements,b.distanceFormula)))
      throw Error('Qualified native recompute requires one panel and saved named binding distances')
    // Rust evaluates the entire named arithmetic graph, not arbitrary inline
    // distance expressions. Preflight must not promise an unsupported commit.
    const originalValues=evaluateFormulas({measurements:sidecar.measurements})
    if (!originalValues.ok || sidecar.bindings.some(b=>
      !Number.isFinite(originalValues.valuesMm[b.distanceFormula]) ||
      Math.abs(originalValues.valuesMm[b.distanceFormula])>5000))
      throw Error(`Native measurement formula or point distance is unsupported: ${originalValues.reason||'±5000 mm limit'}`)
    const current=planBindings(snapshot,sidecar)
    if (!current.ok || current.commands.length || current.steps.some(s=>!s.unchanged))
      throw Error(`Current native point rules are not satisfied: ${current.reason||'source geometry drift'}`)
    const next=structuredClone(sidecar)
    next.measurements[measurement]=withValue(sidecar.measurements[measurement],valueMm)
    const changedValues=evaluateFormulas({measurements:next.measurements})
    if (!changedValues.ok || sidecar.bindings.some(b=>
      !Number.isFinite(changedValues.valuesMm[b.distanceFormula]) ||
      Math.abs(changedValues.valuesMm[b.distanceFormula])>5000))
      throw Error(`Changed native measurement formula or point distance is unsupported: ${changedValues.reason||'±5000 mm limit'}`)
    if (!sidecar.bindings.some(b=>
      originalValues.valuesMm[b.distanceFormula]!==changedValues.valuesMm[b.distanceFormula]))
      throw Error('Direct measurement does not affect a qualified native bound target')
    const planned=planBindings(snapshot,next)
    if (!planned.ok || !planned.commands.length)
      throw Error(`Changed measurement has no safe dependent geometry: ${planned.reason||'no point changes'}`)
    return Object.freeze({ok:true,request:Object.freeze({
      op:'bindings-measurement-recompute',revision:snapshot.revision,
      measurement,expectedValueMm,valueMm,
    }),changedBindingIds:planned.steps.filter(s=>!s.unchanged).map(s=>s.bindingId),
    expectedPointCount:planned.commands.length,manufacturingApproved:false})
  } catch(error){return fail(error?.message||String(error))}
}

/** Review a completed native commit. A failed review does not roll Rust back. */
export function witnessModarisNativeMeasurementCommit20261027(before,after,sidecar,prepared) {
  const reject = reason => Object.freeze({...fail(reason),nativeCommitAlreadyOccurred:true,
    requiresOperatorRecovery:true,nativeRollbackAttempted:false})
  try {
    if (!prepared?.ok || !same(prepared,prepareModarisNativeMeasurementCommit20261027(
      before,sidecar,prepared.request.measurement,prepared.request.valueMm)))
      throw Error('Reviewed native measurement proposal is stale or modified')
    const {measurement,valueMm}=prepared.request
    if (after?.revision!==before.revision+1 || !after?.template ||
        after.nativeMeasurementRecompute?.nativeAuthoritative!==true ||
        after.nativeMeasurementRecompute?.oneUndoStep!==true ||
        after.nativeMeasurementRecompute?.measurement!==measurement)
      throw Error('Rust did not return one authoritative measurement/geometry revision')
    const native=after.nativePointBindings
    if (!native?.active || native.version!==1 || native.manufacturingApproved!==false ||
        native.automaticRegeneration!==false ||
        !same(rules(native.bindings??[]),rules(sidecar.bindings??[])))
      throw Error('Persisted Rust graph is missing, stale or changed its rule identities')
    const expectedMeasurements=structuredClone(sidecar.measurements)
    expectedMeasurements[measurement]=withValue(expectedMeasurements[measurement],valueMm)
    if (!same(native.measurements,expectedMeasurements))
      throw Error('Rust persisted measurement values differ from the confirmed edit')
    if (!same(before.template.seams,after.template.seams) ||
        !same({...before.template,panels:[]},{...after.template,panels:[]}))
      throw Error('Native edit unexpectedly changed garment-level metadata')
    const panelId=sidecar.bindings[0].panelId
    const oldPanels=before.template.panels,newPanels=after.template.panels
    if (oldPanels.length!==newPanels.length || oldPanels.some((old,i)=>{
      const next=newPanels[i]
      if(old.id!==next?.id)return true
      if(old.id!==panelId)return !same(old,next)
      const strip=p=>({...p,polygon:{...p.polygon,points:[]},
        pattern:{...p.pattern,width:undefined,height:undefined},
        placement:{...p.placement,translation:undefined},layout_2d:undefined})
      return !same(strip(old),strip(next))
    })) throw Error('Native recompute changed unrelated panels or manufacturing metadata')
    // Rust may normalize the panel's local origin after one AnchorGroup. All
    // unbound anchors must therefore share exactly that one translation;
    // changing even one other source anchor is not part of this operation.
    const oldPoints=oldPanels.find(p=>p.id===panelId)?.polygon?.points
    const newPoints=newPanels.find(p=>p.id===panelId)?.polygon?.points
    const bound=new Set(sidecar.bindings.map(b=>b.pointIndex))
    const unbound=oldPoints?.map((_,i)=>i).filter(i=>!bound.has(i))??[]
    if(!unbound.length||!Array.isArray(newPoints)||newPoints.length!==oldPoints.length)
      throw Error('No stable unbound source anchors remain to witness native normalization')
    const originShift=oldPoints[unbound[0]].map((n,i)=>newPoints[unbound[0]][i]-n)
    if(unbound.some(index=>oldPoints[index].some((n,i)=>
      !Number.isFinite(newPoints[index]?.[i])||Math.abs(newPoints[index][i]-n-originShift[i])>1e-8)))
      throw Error('Native recompute altered an unbound source anchor')
    const oldPanel=oldPanels.find(p=>p.id===panelId)
    const newPanel=newPanels.find(p=>p.id===panelId)
    const lo=originShift.map(n=>-n)
    const angle=(oldPanel.layout_rotation_degrees??0)*Math.PI/180
    const layoutShift=[lo[0]*Math.cos(angle)-lo[1]*Math.sin(angle),
      lo[0]*Math.sin(angle)+lo[1]*Math.cos(angle)]
    const oldLayout=oldPanel.layout_2d??[0,0]
    if(!nearVec(newPanel.layout_2d,oldLayout.map((n,i)=>n+layoutShift[i])))
      throw Error('Native 2D layout origin shift differs from material normalization')
    const oldTranslation=oldPanel.placement?.translation
    const translationShift=rotatedXYZ([lo[0],-lo[1],0],oldPanel.placement?.rotation_degrees)
    if(!nearVec(newPanel.placement?.translation,
      oldTranslation?.map((n,i)=>n+translationShift[i])))
      throw Error('Native 3D placement origin shift differs from material normalization')
    const xs=newPoints.map(p=>p[0]),ys=newPoints.map(p=>p[1])
    if(!near(newPanel.pattern?.width,Math.max(...xs)-Math.min(...xs)) ||
        !near(newPanel.pattern?.height,Math.max(...ys)-Math.min(...ys)))
      throw Error('Native panel dimensions do not match its recomputed contour')
    const created=createSidecar(after,{measurements:native.measurements,bindings:native.bindings})
    if(!created.ok)throw Error(`Native saved graph could not be reconstructed: ${created.reason}`)
    const satisfied=planBindings(after,created.sidecar)
    if(!satisfied.ok || satisfied.commands.length || satisfied.steps.some(s=>!s.unchanged))
      throw Error(`Committed geometry does not satisfy saved Rust rules: ${satisfied.reason||'unresolved points'}`)
    const ids=after.nativeMeasurementRecompute.correctedBindingIds
    if(!Array.isArray(ids) || !same([...ids].sort(),[...prepared.changedBindingIds].sort()))
      throw Error('Rust reported different dependent binding identities')
    return Object.freeze({ok:true,committedRevision:after.revision,measurement,valueMm,
      correctedBindingIds:[...ids],nativeCommitAlreadyOccurred:true,nativeEvidenceVerified:true,
      manufacturingApproved:false,nativeAutomaticRegeneration:false})
  } catch(error){return reject(error?.message||String(error))}
}
