import {sha256Bytes} from './sha256Bytes.js'
import {evaluateNativeDraftFormulas20261023} from './nativeParametricFormula20261023.js'
import {buildNativeParametricPointProposal,simulateNativeAnchorRemap20261023} from './nativeParametricPoint20261023.js'

// VERSION 1 persistent *description* of point bindings. Applying Anchor
// commands is a sequential native operation; Rust must validate each edit.
export const NATIVE_PATTERN_BINDINGS_VERSION_20261023 = 1
const plain = v => v !== null && typeof v === 'object' && !Array.isArray(v) &&
  (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null)
const name = v => typeof v === 'string' && /^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(v)
const str = v => typeof v === 'string' && v.length > 0 && v.length <= 128
const number = v => typeof v === 'number' && Number.isFinite(v)
const integer = v => Number.isSafeInteger(v) && v >= 0
const reject = reason => Object.freeze({ok:false,reason,issues:Object.freeze([reason]),manufacturingApproved:false})

function canonical(value,depth=0){
  if(depth>64)throw Error('Source exceeds fingerprint depth limit')
  if(value === null || typeof value === 'string' || typeof value === 'boolean')return JSON.stringify(value)
  if(number(value))return JSON.stringify(value)
  if(Array.isArray(value)){
    if(value.length>16384)throw Error('Source array exceeds fingerprint bound')
    return `[${value.map(v=>canonical(v,depth+1)).join(',')}]`
  }
  if(plain(value)){
    const keys=Object.keys(value).sort()
    if(keys.length>16384)throw Error('Source object exceeds fingerprint bound')
    return `{${keys.map(k=>`${JSON.stringify(k)}:${canonical(value[k],depth+1)}`).join(',')}}`
  }
  throw Error('Source contains unsupported or nonfinite fingerprint data')
}

function snapshotPanels(snapshot){
  if(!integer(snapshot?.revision)||!Array.isArray(snapshot?.template?.panels)||
     snapshot.template.panels.length<1||snapshot.template.panels.length>128)
    throw Error('Native source revision or panels unavailable')
  const ids=new Set()
  const panels={}
  for(const panel of snapshot.template.panels){
    if(!plain(panel)||!str(panel.id)||ids.has(panel.id)||!plain(panel.polygon))throw Error('Invalid or duplicate native panel')
    ids.add(panel.id)
    const {points,edges}=panel.polygon
    if(!Array.isArray(points)||points.length<3||points.length>128||
       !Array.isArray(edges)||edges.length!==points.length||
       points.some(p=>!Array.isArray(p)||p.length!==2||!p.every(number))||
       edges.some(e=>!str(e))||new Set(edges).size!==edges.length)throw Error('Invalid native polygon points or edges')
    panels[panel.id]=panel.polygon
  }
  return panels
}

/** Stable order-independent JSON fingerprint of authored geometry and revision.
 * Include full polygons so cubic controls and free knots invalidate bindings. */
export function fingerprintNativePatternBindingsSource20261023(snapshot){
  const panels=snapshotPanels(snapshot)
  const source=Object.keys(panels).sort().map(id=>({id,polygon:panels[id]}))
  return `sha256:${sha256Bytes(new TextEncoder().encode(canonical({revision:snapshot.revision,panels:source})))}`
}

function validateSidecar(sidecar){
  if(!plain(sidecar)||sidecar.version!==1||!integer(sidecar.sourceRevision)||
     typeof sidecar.sourceFingerprint!=='string'||!/^sha256:[a-f0-9]{64}$/.test(sidecar.sourceFingerprint))
    throw Error('Invalid binding version, source revision or fingerprint')
  if(!plain(sidecar.measurements)||!Array.isArray(sidecar.bindings)||
     sidecar.bindings.length<1||sidecar.bindings.length>128)throw Error('Invalid measurements or binding count')
  if(Object.hasOwn(sidecar.measurements,'_binding_distance'))throw Error('Reserved measurement name _binding_distance')
  const bindings=[]
  const targets=new Set(),ids=new Set()
  for(const item of sidecar.bindings){
    if(!plain(item)||!str(item.id)||ids.has(item.id)||!str(item.panelId)||
       !integer(item.pointIndex)||!str(item.distanceFormula)||
       !['along','normal','polar'].includes(item.mode)||
       !integer(item.a)||!integer(item.b)||
       (item.angleDeg!==undefined&&!number(item.angleDeg))||
       (item.dependsOn!==undefined&&(!Array.isArray(item.dependsOn)||item.dependsOn.some(v=>!str(v)))))
       throw Error('Invalid point binding schema')
    if(item.angleDeg!==undefined&&Math.abs(item.angleDeg)>36000)throw Error('Invalid angle')
    const target=`${item.panelId}\u0000${item.pointIndex}`
    if(targets.has(target))throw Error('Duplicate native point target')
    targets.add(target);ids.add(item.id)
    bindings.push({...item,dependsOn:[...(item.dependsOn??[])]})
  }
  // A source point can itself be the target of another binding. Without an
  // explicit dependency, the reader can silently calculate the dependent
  // against stale coordinates when bindings are authored in reverse order.
  // Require the actual read-after-write edge to be declared, consistent with
  // the stricter nativePointGraphIntegrity saved-graph contract. Do NOT just
  // infer a different execution order here: the Rust-persisted sidecar would
  // otherwise contain different dependency semantics from this preview.
  // Polar reads A; along/normal read both A and B. A self-target reference
  // uses the pre-edit anchor and does not imply a cyclic dependency.
  const writerByTarget=new Map(bindings.map(b=>[`${b.panelId}\u0000${b.pointIndex}`,b.id]))
  for(const binding of bindings){
    const refs=binding.mode==='polar'?[binding.a]:[binding.a,binding.b]
    for(const pointIndex of refs){
      const writer=writerByTarget.get(`${binding.panelId}\u0000${pointIndex}`)
      if(writer&&writer!==binding.id&&!binding.dependsOn.includes(writer))
        throw Error(`Missing geometric point-binding dependency for ${binding.id}: ${writer}`)
    }
  }
  const byId=new Map(bindings.map(b=>[b.id,b]))
  const active=new Set(),complete=new Set(),ordered=[]
  const visit=id=>{
    if(active.has(id))throw Error('Circular point-binding dependency')
    if(complete.has(id))return
    const binding=byId.get(id)
    if(!binding)throw Error(`Missing point-binding dependency: ${id}`)
    active.add(id)
    for(const dep of binding.dependsOn){if(dep===id)throw Error('Self-referential binding');visit(dep)}
    active.delete(id);complete.add(id);ordered.push(binding)
  }
  for(const b of bindings)visit(b.id)
  return ordered
}

function evaluateBindingDistance(measurements,binding){
  const scoped=Object.assign(Object.create(null),measurements)
  scoped._binding_distance={formula:binding.distanceFormula}
  const resolved=evaluateNativeDraftFormulas20261023({measurements:scoped})
  if(!resolved.ok)throw Error(`Binding ${binding.id}: ${resolved.reason}`)
  return resolved.valuesMm._binding_distance
}

export function createNativePatternConstraintSidecar20261023(snapshot,{measurements,bindings}={}){
  try{
    const sourceRevision=snapshot?.revision
    const sourceFingerprint=fingerprintNativePatternBindingsSource20261023(snapshot)
    const proposed={version:1,sourceRevision,sourceFingerprint,measurements,bindings}
    const ordered=validateSidecar(proposed)
    const resolved=evaluateNativeDraftFormulas20261023({measurements})
    if(!resolved.ok)throw Error(resolved.reason)
    for(const binding of ordered)evaluateBindingDistance(measurements,binding)
    return Object.freeze({ok:true,sidecar:deepFreeze(structuredClone(proposed)),manufacturingApproved:false})
  }catch(error){return reject(error.message)}
}

function deepFreeze(value){
  if(value && typeof value==='object'){
    Object.values(value).forEach(deepFreeze)
    Object.freeze(value)
  }
  return value
}

/** Returns an immutable *read-only* ordered proposal, with no partial plans. */
export function planNativePatternConstraintBindings20261023(snapshot,sidecar){
  try{
    const ordered=validateSidecar(sidecar)
    if(snapshot?.revision!==sidecar.sourceRevision)throw Error('Stale native source revision')
    const fingerprint=fingerprintNativePatternBindingsSource20261023(snapshot)
    if(fingerprint!==sidecar.sourceFingerprint)throw Error('Stale native source geometry fingerprint')
    const evaluated=evaluateNativeDraftFormulas20261023({measurements:sidecar.measurements})
    if(!evaluated.ok)throw Error(evaluated.reason)
    const copy=structuredClone(snapshot)
    const panels=snapshotPanels(copy)
    const steps=[]
    for(const binding of ordered){
      if(!Object.hasOwn(panels,binding.panelId))throw Error(`Missing native panel for binding ${binding.id}`)
      const distanceMm=evaluateBindingDistance(sidecar.measurements,binding)
      const proposal=buildNativeParametricPointProposal(copy,{
        panelId:binding.panelId,pointIndex:binding.pointIndex,mode:binding.mode,
        a:binding.a,b:binding.b,distanceMm,angleDeg:binding.angleDeg??0,
        allowUnchanged:true,
      })
      if(!proposal.ok)throw Error(`Binding ${binding.id}: ${proposal.reason}`)
      const polygon=panels[binding.panelId]
      const next=simulateNativeAnchorRemap20261023(polygon,binding.pointIndex,proposal.command.position)
      const panel=copy.template.panels.find(p=>p.id===binding.panelId)
      panel.polygon=next;panels[binding.panelId]=next
      steps.push({bindingId:binding.id,dependsOn:[...binding.dependsOn],distanceMm,
        beforeMm:proposal.originalMm,afterMm:proposal.proposedMm,
        unchanged:proposal.unchanged,command:proposal.command})
    }
    return deepFreeze({ok:true,version:1,sourceRevision:sidecar.sourceRevision,
      sourceFingerprint:fingerprint,units:'mm',steps,commands:steps.filter(x=>!x.unchanged).map(x=>x.command),
      dependencyOrder:ordered.map(x=>x.id),manufacturingApproved:false,
      requiresNativeRevalidationAfterEachCommand:true,
      caveat:'Native Anchor normalizes its panel after each command. Subsequent proposed absolute coordinates are simulated in pre-normalization material coordinates and MUST be recalculated against the committed snapshot. Rust validates each edit; this is not an executable atomic batch.'})
  }catch(error){return reject(error.message)}
}

/** Strict JSON sidecar transport: reject unknown keys and altered serialization. */
export function serializeNativePatternConstraintSidecar20261023(sidecar){
  validateSidecar(sidecar)
  const allowed=['version','sourceRevision','sourceFingerprint','measurements','bindings']
  if(Object.keys(sidecar).some(k=>!allowed.includes(k)))throw Error('Unknown sidecar field')
  for(const b of sidecar.bindings){
    if(Object.keys(b).some(k=>!['id','panelId','pointIndex','mode','a','b','distanceFormula','angleDeg','dependsOn'].includes(k)))
      throw Error('Unknown binding field')
  }
  for(const value of Object.values(sidecar.measurements)){
    if(plain(value)&&Object.keys(value).some(k=>!['formula','valueMm'].includes(k)))
      throw Error('Unknown measurement field')
  }
  // canonical() rejects NaN, functions, undefined, circular values and prototypes.
  return canonical(sidecar)
}

export function deserializeNativePatternConstraintSidecar20261023(text){
  if(typeof text!=='string'||text.length>262144)throw Error('Invalid sidecar JSON length')
  const parsed=JSON.parse(text)
  const encoded=serializeNativePatternConstraintSidecar20261023(parsed)
  // Roundtrip canonical wire data to strip no fields and freeze every nested value.
  return deepFreeze(JSON.parse(encoded))
}
