import React,{useEffect,useMemo,useState} from 'react'
import {fingerprintNativePatternBindingsSource20261023 as fingerprint} from '../core/nativePatternConstraintBindings20261023.js'
import {prepareModarisNativeMeasurementCommit20261027 as prepare,
  witnessModarisNativeMeasurementCommit20261027 as witness} from '../core/modarisNativeMeasurementCommit20261027.js'

const decimal=/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/
const direct=value=>typeof value==='number'?value:
  value&&typeof value==='object'&&!Object.hasOwn(value,'formula')?value.valueMm:undefined

export function modarisNativeMeasurementRecomputePreflight20261027(snapshot,sidecar,disabled=false){
  if(disabled)return 'Native measurement editing is unavailable while the workspace is busy.'
  if(!Number.isSafeInteger(snapshot?.revision)||!snapshot?.nativePointBindings?.active)
    return 'An active native Rust measurement binding graph is required.'
  if(!sidecar?.bindings?.length)return 'Save native measurement-to-point bindings first.'
  try {
    if(sidecar.sourceRevision!==snapshot.revision||sidecar.sourceFingerprint!==fingerprint(snapshot))
      return 'The native measurement source is stale; reauthenticate its geometry.'
  }catch(error){return `Invalid native geometry: ${error.message}`}
  return ''
}

/** A live native Rust direct-measurement operation with qualified named
 * arithmetic dependents, not a browser-authored AnchorGroup. */
export default function ModarisNativeMeasurementRecompute20261027({snapshot,sidecar,disabled=false,onApplyMeasurement}){
  const [measurement,setMeasurement]=useState('')
  const [value,setValue]=useState('')
  const [review,setReview]=useState(null)
  const [confirmed,setConfirmed]=useState(false)
  const [busy,setBusy]=useState(false)
  const [notice,setNotice]=useState('')
  const source=JSON.stringify({snapshot,sidecar})
  useEffect(()=>{setReview(null);setConfirmed(false)},[source])
  const blocker=modarisNativeMeasurementRecomputePreflight20261027(snapshot,sidecar,disabled||busy)
  const directNames=Object.entries(sidecar?.measurements??{}).filter(([,v])=>Number.isFinite(direct(v)))
  const current=direct(sidecar?.measurements?.[measurement])
  const stale=Boolean(review&&review.source!==source)
  const planned=useMemo(()=>review&&!stale?prepare(snapshot,sidecar,review.measurement,review.valueMm):null,
    [snapshot,sidecar,review,stale])
  const choose=name=>{setMeasurement(name);setValue(String(direct(sidecar?.measurements?.[name])??''));setReview(null);setConfirmed(false)}
  const preview=()=>{
    setReview(null);setConfirmed(false)
    if(blocker){setNotice(blocker);return}
    const mm=typeof value==='string'&&decimal.test(value.trim())?Number(value):NaN
    const candidate=prepare(snapshot,sidecar,measurement,mm)
    if(!candidate.ok){setNotice(`Native measurement preflight refused: ${candidate.reason}`);return}
    setReview({source,measurement,valueMm:mm,proposal:candidate})
    setNotice(`Rust recompute preview: ${candidate.expectedPointCount} dependent point correction(s). No native edit has been sent.`)
  }
  const commit=async()=>{
    if(blocker||!confirmed||!review||stale||!planned?.ok||
      JSON.stringify(planned)!==JSON.stringify(review.proposal)||typeof onApplyMeasurement!=='function'){
      setNotice('Commit refused: busy, stale, unconfirmed or missing native Rust handler.');return
    }
    setBusy(true)
    try{
      if(JSON.stringify({snapshot,sidecar})!==review.source)throw Error('Native source changed after preview')
      const result=await onApplyMeasurement(planned.request)
      if(!result?.ok||!result.before||!result.after)
        throw Error('Rust did not confirm a complete before/after commit. Inspect the native project before retrying.')
      if(result.before.revision!==snapshot.revision||fingerprint(result.before)!==fingerprint(snapshot))
        throw Error('Native source changed before commit; inspect or Undo the transaction before retrying.')
      const checked=witness(result.before,result.after,sidecar,planned)
      if(!checked.ok)throw Error(`Native transaction already occurred, but verification failed: ${checked.reason}. Inspect or Undo before continuing.`)
      setNotice(`Rust committed ${checked.measurement} = ${checked.valueMm} mm at revision ${checked.committedRevision}, recomputing ${checked.correctedBindingIds.length} dependent rule(s) in one Undo. Saved native rules were verified.`)
      setReview(null);setConfirmed(false)
    }catch(error){setNotice(error?.message||String(error))}
    finally{setBusy(false)}
  }
  return <section aria-label="Native Rust measurement dependency recompute" data-native-measurement-recompute="true">
    <h3>Rust-authoritative measurement → dependent points</h3>
    <p>Change one saved direct measurement; Rust evaluates named arithmetic formula dependencies and persists qualified dependent geometry in one native Undo revision. One unsewn, ungraded, straight panel only. Fabric bounds, arbitrary inline distance expressions and six-size grading are not enforced by this operation.</p>
    {blocker&&<p role="alert">{blocker}</p>}
    <label>Saved direct measurement <select aria-label="Saved direct measurement" value={measurement} disabled={Boolean(blocker)} onChange={e=>choose(e.target.value)}>
      <option value="">Choose measurement</option>{directNames.map(([name,v])=><option key={name} value={name}>{name}: {direct(v)} mm</option>)}
    </select></label>
    <label>New measurement (mm) <input aria-label="New native measurement millimetres" inputMode="decimal" value={value} disabled={Boolean(blocker)} onChange={e=>{setValue(e.target.value);setReview(null);setConfirmed(false)}}/></label>
    {measurement&&Number.isFinite(current)&&<p>Saved value: {current} mm. New value must change the geometry and remain within ±5000 mm.</p>}
    <button type="button" disabled={Boolean(blocker)||!measurement} onClick={preview}>Preview Rust-owned dependency recompute</button>
    {review&&!stale&&planned?.ok&&<div aria-label="Native measurement recompute confirmation">
      <p>Native operation: {planned.expectedPointCount} point edits, {planned.changedBindingIds.length} affected bindings ({planned.changedBindingIds.join(', ')}). No caller-supplied dependent coordinates.</p>
      <label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> Confirm native measurement and dependent geometry transaction</label>
      <button type="button" disabled={!confirmed||Boolean(blocker)||typeof onApplyMeasurement!=='function'} onClick={commit}>Apply confirmed Rust measurement recompute</button>
    </div>}
    {stale&&<p role="alert">Preview is stale. Review the latest Rust snapshot.</p>}
    {notice&&<p role="status">{notice}</p>}
  </section>
}
