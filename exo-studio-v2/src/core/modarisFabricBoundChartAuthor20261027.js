import {fingerprintNativePatternBindingsSource20261023 as fingerprint,
  serializeNativePatternConstraintSidecar20261023 as serialize,
  planNativePatternConstraintBindings20261023 as planBindings} from './nativePatternConstraintBindings20261023.js'
import {validateModarisFabricBoundChart20261027 as validate} from './modarisFabricBoundChart20261027.js'

const fail=message=>{throw Error('MODARIS_CHART_AUTHOR: '+message)}
const numeric=n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=1e7
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype
const fields=(v,allowed)=>plain(v)&&Object.keys(v).every(k=>allowed.includes(k))
const values=Object.freeze({mm:1,cm:10,in:25.4})
const identifier=/^[A-Za-z_][A-Za-z0-9_]{0,63}$/
function deepFreeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(deepFreeze);Object.freeze(v)}return v}
function sizeCell(mm){return {value:mm,unit:'mm'}}
const mm=cell=>{
  if(!fields(cell,['value','unit'])||!numeric(cell.value)||!Object.hasOwn(values,cell.unit))fail('invalid physical size cell')
  const result=cell.value*values[cell.unit]
  if(!numeric(result))fail('measurement cell outside supported domain')
  return result
}

/**
 * Create an explicitly authored, full-size fabric-bounded chart from a genuine
 * native sidecar. There are deliberately NO estimated fabric tolerances or
 * synthesized graded values: every physical size cell and every numeric bound
 * must be supplied by an operator with documented provenance.
 *
 * This produces deterministic *planning* records; Rust is not called and no
 * browser/native persistence or industrial approval is performed.
 */
export function authorModarisFabricBoundChart20261027(snapshot,sidecar,spec={}){
  try{
    serialize(sidecar)
    if(sidecar.sourceRevision!==snapshot?.revision||sidecar.sourceFingerprint!==fingerprint(snapshot))fail('stale native binding source')
    if(!fields(spec,['fabricId','provenance','sizes','baseSize','measurements','bounds']))fail('unknown chart author field')
    if(typeof spec.fabricId!=='string'||!spec.fabricId.trim()||spec.fabricId.length>128)fail('fabric identifier required')
    if(typeof spec.provenance!=='string'||!spec.provenance.trim()||spec.provenance.length>256)fail('physical fabric limit provenance required')
    if(!Array.isArray(spec.sizes)||spec.sizes.length<2||spec.sizes.length>32||
       spec.sizes.some(s=>typeof s!=='string'||!s.trim()||s.length>64)||new Set(spec.sizes).size!==spec.sizes.length||
       !spec.sizes.includes(spec.baseSize))fail('invalid complete size run')
    if(!plain(spec.measurements)||Object.keys(spec.measurements).length!==Object.keys(sidecar.measurements).length||
      Object.keys(spec.measurements).some(name=>!identifier.test(name)||!Object.hasOwn(sidecar.measurements,name)))
      fail('measurement identities must match the saved native bindings')
    const authored={}
    for(const [name,original] of Object.entries(sidecar.measurements)){
      const row=spec.measurements[name]
      if(!row)fail('missing authored measurement row: '+name)
      if(original&&typeof original==='object'&&typeof original.formula==='string'){
        if(!fields(row,['kind','expression'])||row.kind!=='formula'||row.expression!==original.formula)
          fail('computed measurement expression must match native source: '+name)
        authored[name]={kind:'formula',expression:original.formula}
        continue
      }
      const originalMm=typeof original==='number'?original:original?.valueMm
      if(!numeric(originalMm)||!fields(row,['kind','values'])||row.kind!=='direct'||!plain(row.values)||
        Object.keys(row.values).length!==spec.sizes.length||spec.sizes.some(s=>!Object.hasOwn(row.values,s)))
        fail('every direct measurement needs an explicitly authored cell in every size: '+name)
      const cellMm=mm(row.values[spec.baseSize])
      if(Math.abs(cellMm-originalMm)>1e-7)fail('base-size value disagrees with current native measurement: '+name)
      authored[name]={kind:'direct',values:Object.fromEntries(spec.sizes.map(s=>[s,sizeCell(mm(row.values[s]))]))}
    }
    if(!Array.isArray(spec.bounds)||spec.bounds.length!==Object.keys(authored).length*spec.sizes.length)
      fail('explicit physical min/max bound required for each size and measurement')
    const bounds=spec.bounds.map(entry=>{
      if(!fields(entry,['measurement','size','minMm','maxMm'])||!Object.hasOwn(authored,entry.measurement)||
         !spec.sizes.includes(entry.size)||!numeric(entry.minMm)||!numeric(entry.maxMm)||entry.minMm>entry.maxMm)
        fail('invalid physical bound row')
      return {...entry}
    })
    const chart={version:1,revision:0,sourceRevision:snapshot.revision,
      sourceFingerprint:sidecar.sourceFingerprint,fabricId:spec.fabricId,
      sizes:[...spec.sizes],baseSize:spec.baseSize,measurements:authored}
    const envelope={version:1,fabricId:spec.fabricId,provenance:spec.provenance,bounds}
    const validated=validate(snapshot,chart,envelope)
    if(!validated.ok)fail(validated.reason)
    const currentPlan=planBindings(snapshot,sidecar)
    if(!currentPlan.ok)fail('binding source plan invalid: '+currentPlan.reason)
    return deepFreeze({ok:true,chart,envelope,perSize:validated.perSize,
      geometryAligned:currentPlan.commands.length===0,
      pendingNativePointEdits:currentPlan.commands.length,
      operatorBoundsProvided:true,calibratedFabricPhysics:false,
      manufacturingApproved:false,
      note:'All sizes, measurement cells and fabric limits were explicitly authored. Chart is detached and must be bound to a separately verified native transaction.'})
  }catch(error){return Object.freeze({ok:false,reason:error?.message??String(error),manufacturingApproved:false})}
}
