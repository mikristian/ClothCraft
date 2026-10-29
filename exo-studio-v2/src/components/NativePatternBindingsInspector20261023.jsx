import {reviewNativeBindingMeasurements} from '../core/nativeBindingMeasurementReview20261027.js'
import React,{useEffect,useMemo,useState} from 'react'
import {
  createNativePatternConstraintSidecar20261023,
  planNativePatternConstraintBindings20261023,
  serializeNativePatternConstraintSidecar20261023,
  deserializeNativePatternConstraintSidecar20261023,
} from '../core/nativePatternConstraintBindings20261023.js'
import {planNativeAtomicPointBindings20261027} from '../core/nativeAtomicPointBindings20261027.js'
import {rebaseNativePatternBindingsAfterAnchorGroup20261027} from '../core/nativePatternBindingsRebase20261027.js'
import ModarisFabricBoundChartStudio20261027 from './ModarisFabricBoundChartStudio20261027.jsx'
import ModarisNativePerSizeChartStudio20261027 from './ModarisNativePerSizeChartStudio20261027.jsx'
import ModarisNativeReferenceRecompute20261027 from './ModarisNativeReferenceRecompute20261027.jsx'
import ModarisNativeCrossPieceReference20261027 from './ModarisNativeCrossPieceReference20261027.jsx'
import ModarisNativeMeasurementRecompute20261027 from './ModarisNativeMeasurementRecompute20261027.jsx'

const NUMERIC=/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/
const NAME=/^[A-Za-z_][A-Za-z0-9_]{0,63}$/
function worksheetToMeasurements(worksheet){
  if(typeof worksheet!=='string'||worksheet.length>16384)throw Error('Worksheet must be 16 KB or smaller')
  const rows=worksheet.split(/\r?\n/)
  if(rows.length>128)throw Error('Worksheet has too many lines')
  const measurements=Object.create(null)
  for(const [i,text] of rows.entries()){
    const line=text.trim()
    if(!line||line.startsWith('#'))continue
    const pos=line.indexOf('=')
    if(pos<1||pos!==line.lastIndexOf('='))throw Error(`Invalid worksheet at line ${i+1}`)
    const name=line.slice(0,pos).trim(),formula=line.slice(pos+1).trim()
    if(!NAME.test(name)||['__proto__','constructor','prototype','_binding_distance'].includes(name)||!formula||Object.hasOwn(measurements,name))
      throw Error(`Invalid or duplicate measurement ${name} at line ${i+1}`)
    measurements[name]=NUMERIC.test(formula)?Number(formula):{formula}
    if(Object.keys(measurements).length>64)throw Error('Worksheet may have no more than 64 named measurements')
  }
  return measurements
}

/** The native fitting project owns saved measurement/rule definitions.
 * Browser localStorage is only a compatibility fallback for older documents.
 * Rust records the exact source template, so stale graphs cannot be mistaken
 * for current geometry after an unrelated edit or an Undo/Redo.
 */
export default function NativePatternBindingsInspector20261023({snapshot,panelId,pointIndex,mode,a,b,angleDeg,worksheet,distanceExpression,onApplyBatch,onApplyNativeMeasurement,onPersistBindings,onClearBindings,onLoadNativeProject,onStoreNativeFabricEnvelope,onRegenerateNativeFabricChart,onInspectNativeFabricEnvelope}){
  const key=`exo-v2-native-point-bindings:${String(snapshot?.template?.id||snapshot?.template?.name||'untitled').slice(0,180)}`
  const [stored,setStored]=useState(null)
  const [message,setMessage]=useState('')
  const [applying,setApplying]=useState(false)
  useEffect(()=>{
    try{
      if(snapshot?.nativePointBindings){
        const native=snapshot.nativePointBindings
        if(!native.active){
          setStored(null)
          setMessage('The native garment contains saved measurement rules, but their source geometry has changed. Restore its matching source or author a new verified binding plan.')
          return
        }
        const created=createNativePatternConstraintSidecar20261023(snapshot,{
          measurements:native.measurements,bindings:native.bindings,
        })
        if(!created.ok)throw Error(created.reason)
        setStored(created.sidecar)
        setMessage('')
        return
      }
      const raw=localStorage.getItem(key)
      const record=raw?JSON.parse(raw):null
      const sidecar=record?.sidecar?deserializeNativePatternConstraintSidecar20261023(record.sidecar):null
      setStored(sidecar)
      setMessage(raw&&!sidecar?'Stored bindings could not be validated and were not loaded.':'')
    }catch(error){setStored(null);setMessage(`Saved bindings could not be parsed: ${error?.message||String(error)}`)}
  },[key,snapshot?.revision,snapshot?.nativePointBindings])
  const persist=async sidecar=>{
    const encoded=serializeNativePatternConstraintSidecar20261023(sidecar)
    let result=sidecar
    if(typeof onPersistBindings==='function'){
      const accepted=await onPersistBindings({
        measurements:sidecar.measurements,bindings:sidecar.bindings,
      })
      if(!accepted?.template||accepted.nativePointBindings?.active!==true)
        throw Error('Rust did not persist an active native binding graph')
      const created=createNativePatternConstraintSidecar20261023(accepted,{
        measurements:sidecar.measurements,bindings:sidecar.bindings,
      })
      if(!created.ok)throw Error(created.reason)
      result=created.sidecar
    }
    // Compatibility mirror only. The Rust fitting project takes precedence.
    try{localStorage.setItem(key,JSON.stringify({schema:'exo-native-draft-point-bindings-v1',
      sidecar:serializeNativePatternConstraintSidecar20261023(result)}))}
    catch{if(typeof onPersistBindings!=='function')throw Error('Could not store the local binding plan')}
    setStored(result)
    return result
  }
  const plan=useMemo(()=>stored?planNativePatternConstraintBindings20261023(snapshot,stored):null,[snapshot,stored])
  const atomic=useMemo(()=>stored?planNativeAtomicPointBindings20261027(snapshot,stored):null,[snapshot,stored])
  const measurementReview=useMemo(()=>{
    if(!stored)return null
    try{return reviewNativeBindingMeasurements(snapshot,stored,worksheetToMeasurements(worksheet))}
    catch(error){return {ok:false,reason:error.message}}
  },[snapshot,stored,worksheet])
  const reviewPending=Boolean(stored)&&(!measurementReview?.ok||measurementReview.changes.some(change=>change.deltaMm.some(value=>Math.abs(value)>1e-8)))
  const updateMeasurements=async()=>{
    if(applying||!measurementReview?.ok)return
    setApplying(true)
    try{
      await persist(measurementReview.sidecar)
      setMessage('Measurement plan saved with all point identities and formulas preserved. Review the grouped native geometry update before committing it.')
    }catch(error){setMessage(`Measurement plan was not saved: ${error.message}`)}
    finally{setApplying(false)}
  }
  const commitAtomic=async (candidate)=>{
    if(applying||!candidate||typeof onApplyBatch!=='function')return
    setApplying(true);setMessage('')
    let nativeCommitted=false
    try{
      const proposed=planNativeAtomicPointBindings20261027(snapshot,candidate)
      if(!proposed.ok)throw Error(proposed.reason)
      const applied=await onApplyBatch(proposed,candidate)
      if(!applied?.ok||!applied.before||!applied.after){
        setMessage('Rust rejected the atomic linked measurement edit. No partial native geometry was committed.')
        return
      }
      nativeCommitted=true
      const verified=rebaseNativePatternBindingsAfterAnchorGroup20261027(
        applied.before,applied.after,candidate,proposed)
      if(!verified.ok){
        setMessage(`Native point edit committed, but linked measurement metadata was not rebased: ${verified.reason}. The old saved plan is stale; do not reuse it until reviewed.`)
        return
      }
      // A successful Rust grouped edit saved the new rule source *atomically*
      // with geometry. Browser mirroring is optional; native source survives.
      try{localStorage.setItem(key,JSON.stringify({schema:'exo-native-draft-point-bindings-v1',
        sidecar:serializeNativePatternConstraintSidecar20261023(verified.sidecar)}))}catch{}
      setStored(verified.sidecar)
      setMessage(`Committed ${proposed.pointCount} linked native point edits and the reviewed measurement chart in ONE Undo revision; verified geometry and formula references at revision ${verified.sourceRevision}. Recheck sewing, grading and production.`)
    }catch(error){setMessage(nativeCommitted?
      `Native point edit committed, but local binding metadata could not be saved: ${error?.message||String(error)}. The saved plan is stale and must be reviewed before another linked edit.`:
      `Atomic pattern update rejected: ${error?.message||String(error)}`)}
    finally{setApplying(false)}
  }
  const applyAtomic=()=>{if(!reviewPending&&atomic?.ok)void commitAtomic(stored)}
  const applyReviewed=()=>{if(measurementReview?.ok&&measurementReview.atomic&&!measurementReview.noGeometryChanges)void commitAtomic(measurementReview.sidecar)}
  const save=async()=>{
    if(applying)return
    setApplying(true)
    try{
      if(!['along','normal','polar'].includes(mode))throw Error('Bind a distance-based point construction only')
      const measurements=worksheetToMeasurements(worksheet)
      const id=`point_${panelId}_${pointIndex}`
      const binding={id,panelId,pointIndex,mode,a,b,
        distanceFormula:distanceExpression,angleDeg:Number(angleDeg)||0,dependsOn:[]}
      const preserved=stored?.bindings||[]
      const bindings=[...preserved.filter(item=>!(item.panelId===panelId&&item.pointIndex===pointIndex)),binding]
      if(stored){
        const current=planNativePatternConstraintBindings20261023(snapshot,stored)
        if(!current.ok)throw Error('Stored constraint source is stale. Clear old sidecar or restore the matching project revision first.')
      }
      const created=createNativePatternConstraintSidecar20261023(snapshot,{measurements,bindings})
      if(!created.ok)throw Error(created.reason)
      const proposal=planNativePatternConstraintBindings20261023(snapshot,created.sidecar)
      if(!proposal.ok)throw Error(proposal.reason)
      await persist(created.sidecar)
      setMessage(`Saved ${bindings.length} source-linked point rule${bindings.length===1?'':'s'} in ${typeof onPersistBindings==='function'?'the native Rust garment':'the legacy browser sidecar'}. Geometry will be edited only when you apply the validated grouped construction.`)
    }catch(error){setMessage(`Binding was not saved: ${error?.message||String(error)}`)}
    finally{setApplying(false)}
  }
  const clear=async()=>{
    if(applying)return
    setApplying(true)
    try{
      if(typeof onClearBindings==='function'&&snapshot?.nativePointBindings){
        const cleared=await onClearBindings()
        if(!cleared||cleared.nativePointBindings)throw Error('Native binding graph was not cleared')
      }
      localStorage.removeItem(key);setStored(null)
      setMessage('Saved point binding rules cleared without changing native geometry.')
    }
    catch(error){setMessage(`Unable to clear browser-side bindings: ${error?.message||String(error)}`)}
    finally{setApplying(false)}
  }
  return <details className="exo-construction-worksheet" data-native-constraint-sidecar="true">
    <summary>Saved measurement-to-pattern bindings · {stored?.bindings?.length||0}</summary>
    <p>Link this target corner to its named formula and save a versioned source-fingerprinted plan. Other targets can be added one at a time using the same named measurement worksheet.</p>
    <div className="exo-construction-actions">
      <button type="button" onClick={save} disabled={applying}>Bind this point to formula</button>
      <button type="button" onClick={clear} disabled={(!stored&&!snapshot?.nativePointBindings)||applying}>Clear bindings</button>
      <button type="button" onClick={applyAtomic} disabled={applying||reviewPending||!atomic?.ok||typeof onApplyBatch!=='function'}>
        {applying?'Applying grouped point changes…':'Apply linked point groups · ONE native Undo'}
      </button>
    </div>
    {stored&&<section aria-label="Linked measurement change review" className="exo-construction-result">
      <strong>WORKSHEET → LINKED POINT REVIEW</strong>
      {reviewPending&&<span>Review the worksheet below, then apply the chart and linked native point geometry atomically. You can alternatively save just the chart without moving the pattern.</span>}
      <p>Changes below compare the saved chart with the edited worksheet, in millimetres. A reviewed atomic apply commits the chart and geometric source together in one Rust Undo transaction.</p>
      {measurementReview?.ok?<>
        <div style={{overflowX:'auto'}}><table><thead><tr><th>Bound point</th><th>Planned X / Y</th><th>New X / Y</th><th>Change X / Y</th></tr></thead>
          <tbody>{measurementReview.changes.map(change=><tr key={change.bindingId}><td>{change.bindingId}</td>
            <td>{change.beforeMm.map(v=>v.toFixed(2)).join(' / ')}</td><td>{change.afterMm.map(v=>v.toFixed(2)).join(' / ')}</td>
            <td>{change.deltaMm.map(v=>v.toFixed(2)).join(' / ')}</td></tr>)}</tbody></table></div>
        <button type="button" disabled={applying} onClick={updateMeasurements}>Update measurements · keep point rules</button>
        <button type="button" disabled={applying||!reviewPending||!measurementReview.atomic||measurementReview.noGeometryChanges||typeof onApplyBatch!=='function'}
          onClick={applyReviewed}>Apply reviewed chart + linked point geometry · ONE native Undo</button>
      </>:<p role="alert">{measurementReview?.reason||'No measurement proposal available.'}</p>}
    </section>}
    {stored&&<div className="exo-construction-result" data-native-binding-status={plan?.ok?'ready':'stale'} role="status">
      <strong>{plan?.ok?'PERSISTENT REFERENCE PLAN · READ ONLY':'SOURCE CHANGED · PLAN BLOCKED'}</strong>
      <span>Source revision {stored.sourceRevision} · {stored.bindings.length} bound point{stored.bindings.length!==1?'s':''}</span>
      {plan?.ok?plan.steps.map(step=><span key={step.bindingId}>{step.bindingId}: X {step.afterMm[0].toFixed(2)} / Y {step.afterMm[1].toFixed(2)} mm · {step.distanceMm.toFixed(2)} mm expression</span>):<span>{plan?.reason}</span>}
      <span>{snapshot?.nativePointBindings?'Versioned binding definitions live inside the native Rust garment and are verified against its saved source.':'Browser-side legacy plan; save the binding again to embed it in Rust.'} Qualified ordinary source-anchor and direct polar six-size edits can regenerate their saved dependents in one native Undo. Other operations require explicit graph-aware validation.</span>
      <span>{atomic?.ok?`Atomic native proposal ready: ${atomic.pointCount} linked point(s) across ${atomic.panelCount} panel(s). Source must match the recorded revision.`:atomic?.reason||'Choose linked pattern points to evaluate a batch.'}</span>
    </div>}
    {stored&&<details className="exo-construction-result" data-modaris-fabric-bound-chart-tool="true">
      <summary>Modaris-style fabric-constrained six-size measurement chart · explicit source review</summary>
      <ModarisFabricBoundChartStudio20261027 snapshot={snapshot} sidecar={stored} disabled={applying}
        onApplyBatch={onApplyBatch}/>
    </details>}
    {stored&&<details className="exo-construction-result" data-modaris-native-per-size-chart-tool="true">
      <summary>Native Rust XS–XXL computed fabric chart · author, save and regenerate all sizes</summary>
      <ModarisNativePerSizeChartStudio20261027 snapshot={snapshot} disabled={applying}
        onLoadProject={onLoadNativeProject} onStoreEnvelope={onStoreNativeFabricEnvelope}
        onRegenerate={onRegenerateNativeFabricChart} onInspectEnvelope={onInspectNativeFabricEnvelope}/>
    </details>}
    {stored&&<details className="exo-construction-result" data-modaris-native-reference-recompute-tool="true">
      <summary>Modaris-style source reference point → dependent point regeneration · qualified native edit</summary>
      <ModarisNativeReferenceRecompute20261027 snapshot={snapshot} sidecar={stored}
        disabled={applying} onApplyBatch={onApplyBatch}/>
    </details>}
    {stored&&<details className="exo-construction-result" data-modaris-cross-piece-reference-tool="true">
      <summary>Modaris-style Cross-Piece Source → Dependent Point · Board-Linked Rust Transaction</summary>
      <ModarisNativeCrossPieceReference20261027 snapshot={snapshot} sidecar={stored}
        disabled={applying} onApplyBatch={onApplyBatch}/>
    </details>}
    {stored&&<details className="exo-construction-result" data-modaris-native-measurement-recompute-tool="true">
      <summary>Rust-owned direct measurement → persistent dependent point recompute · one native Undo</summary>
      <ModarisNativeMeasurementRecompute20261027 snapshot={snapshot} sidecar={stored}
        disabled={applying} onApplyMeasurement={onApplyNativeMeasurement}/>
    </details>}
    {message&&<p role="status">{message}</p>}
    <small>Atomic AnchorGroup applies up to 32 linked points per native panel in dependency order, normalizing each panel once, and uses one Rust Undo step. Rule definitions now persist inside the native garment; changed geometry invalidates the source until reauthenticated. Automatic recomputation and graded manufacturing parity remain future work.</small>
  </details>
}
