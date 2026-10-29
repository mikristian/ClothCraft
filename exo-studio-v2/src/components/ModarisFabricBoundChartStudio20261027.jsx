import React,{useEffect,useMemo,useRef,useState} from 'react'
import {authorModarisFabricBoundChart20261027} from '../core/modarisFabricBoundChartAuthor20261027.js'
import {planModarisFabricBoundNativeChart20261027,
  validateModarisFabricBoundChart20261027} from '../core/modarisFabricBoundChart20261027.js'
import {prepareModarisFabricBoundNativeTransaction20261027,
  verifyModarisFabricBoundNativeCommitRequest20261027,
  witnessModarisFabricBoundNativeTransaction20261027} from '../core/modarisFabricBoundNativeTransaction20261027.js'

const SIZES=['XS','S','M','L','XL','XXL']
const FORMULA=/^\s*[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?\s*$/
const amount=text=>typeof text==='string'&&FORMULA.test(text)?Number(text):NaN
const directValue=measurement=>typeof measurement==='number'?measurement:measurement?.valueMm
function initialize(sidecar){
  const values={},limits={}
  for(const [name,measurement] of Object.entries(sidecar?.measurements??{})){
    if(Number.isFinite(directValue(measurement)))values[name]=Object.fromEntries(SIZES.map(s=>[s,s==='M'?String(directValue(measurement)):'']))
    limits[name]=Object.fromEntries(SIZES.map(s=>[s,{min:'',max:''}]))
  }
  return {values,limits}
}

/** UI does not infer fabric acceptance from material labels or simulation. */
export function modarisFabricBoundChartStudioPreflight20261027(snapshot,sidecar,disabled=false){
  if(disabled)return 'Chart review is unavailable while native editing is busy.'
  if(!snapshot?.template?.panels||!Number.isSafeInteger(snapshot.revision))return 'A revisioned Rust garment snapshot is required.'
  if(!sidecar||!Array.isArray(sidecar.bindings)||!sidecar.bindings.length)return 'Save a native measurement-to-point binding first.'
  if(sidecar.sourceRevision!==snapshot.revision)return 'The saved native binding revision is stale.'
  return ''
}

/**
 * Operator-authored complete size/fabric envelope with source-bound preview.
 * This is not a Rust-native writable chart and never commits geometry.
 */
export default function ModarisFabricBoundChartStudio20261027({snapshot,sidecar,disabled=false,onApplyBatch}){
  const [fabricId,setFabricId]=useState('')
  const [provenance,setProvenance]=useState('')
  const [fields,setFields]=useState(()=>initialize(sidecar))
  const [selectedSize,setSelectedSize]=useState('M')
  const [validated,setValidated]=useState(null)
  const [confirmed,setConfirmed]=useState(false)
  const [committing,setCommitting]=useState(false)
  const [notice,setNotice]=useState('Enter fabric ID, supplier/patternmaker limit provenance, and all physical measurements and bounds.')
  const commitPendingRef=useRef(false)
  const ownCommittedRevision=useRef(null)
  const sourceToken=sidecar?`${sidecar.sourceRevision}:${sidecar.sourceFingerprint}:${JSON.stringify(sidecar.measurements)}`:''
  useEffect(()=>{
    // The native snapshot can update before the async postcommit geometry
    // witness finishes. Do not let this effect erase the successful witness
    // and chart-mirror receipt for our OWN one-revision transaction.
    if(commitPendingRef.current||ownCommittedRevision.current===sidecar?.sourceRevision)return
    setFields(initialize(sidecar));setValidated(null);setConfirmed(false)
    setNotice('Native source changed. Re-author and validate the complete size chart before reviewing any point edit.')
  },[sourceToken])
  const blockers=modarisFabricBoundChartStudioPreflight20261027(snapshot,sidecar,disabled||committing)
  const names=Object.keys(sidecar?.measurements??{})
  const directNames=names.filter(name=>Number.isFinite(directValue(sidecar.measurements[name])))
  const sourceSignature=useMemo(()=>JSON.stringify({snapshot,sidecar}),[snapshot,sidecar])
  const stale=Boolean(validated&&validated.sourceSignature!==sourceSignature)
  const prepared=useMemo(()=>validated&&!stale?
    prepareModarisFabricBoundNativeTransaction20261027(snapshot,sidecar,validated.chart,validated.envelope,{size:selectedSize}):null,
    [snapshot,sidecar,validated,stale,selectedSize])
  const update=(name,size,value,bound)=>{
    setValidated(null)
    setConfirmed(false)
    setFields(old=>{
      const next=structuredClone(old)
      if(bound)next.limits[name][size][bound]=value
      else next.values[name][size]=value
      return next
    })
  }
  const create=()=>{
    if(blockers){setNotice(blockers);return}
    try{
      const measurements=Object.fromEntries(names.map(name=>{
        const measure=sidecar.measurements[name]
        return [name,Number.isFinite(directValue(measure))?
          {kind:'direct',values:Object.fromEntries(SIZES.map(size=>[size,{value:amount(fields.values[name]?.[size]),unit:'mm'}]))}:
          {kind:'formula',expression:measure?.formula}]
      }))
      const bounds=names.flatMap(name=>SIZES.map(size=>({
        measurement:name,size,minMm:amount(fields.limits[name]?.[size]?.min),
        maxMm:amount(fields.limits[name]?.[size]?.max),
      })))
      const authored=authorModarisFabricBoundChart20261027(snapshot,sidecar,{
        fabricId,provenance,sizes:SIZES,baseSize:'M',measurements,bounds,
      })
      if(!authored.ok)throw Error(authored.reason)
      const preview=planModarisFabricBoundNativeChart20261027(snapshot,sidecar,authored.chart,authored.envelope,{size:selectedSize})
      if(!preview.ok)throw Error(preview.reason)
      setValidated({...authored,preview,sourceSignature})
      setConfirmed(false)
      setNotice(`Validated ${SIZES.length} explicit sizes and ${names.length} named measurements. ${preview.nativePlan.commands.length} point change(s) are previewed in ${selectedSize}; nothing has been committed.`)
    }catch(error){setValidated(null);setNotice(`Chart validation refused: ${error.message}`)}
  }
  const previewSize=size=>{
    setSelectedSize(size)
    setConfirmed(false)
    if(!validated||stale)return
    const plan=planModarisFabricBoundNativeChart20261027(snapshot,sidecar,validated.chart,validated.envelope,{size})
    if(plan.ok)setValidated(old=>({...old,preview:plan}))
    else{setValidated(null);setNotice(`Source-verified size preview refused: ${plan.reason}`)}
  }
  const recordKey=id=>`exo-modaris-fabric-chart-v1:${String(snapshot?.template?.id||snapshot?.template?.name||'untitled').slice(0,180)}:${id}`
  const restore=()=>{
    if(blockers||!fabricId.trim())return
    try{
      const raw=localStorage.getItem(recordKey(fabricId))
      if(!raw)throw Error('No chart mirror exists for this exact project/fabric identifier')
      const record=JSON.parse(raw)
      if(record?.schema!=='exo-modaris-fabric-chart-v1')throw Error('Unknown saved chart mirror schema')
      const review=validateModarisFabricBoundChart20261027(snapshot,record.chart,record.envelope)
      if(!review.ok)throw Error(review.reason)
      const planned=planModarisFabricBoundNativeChart20261027(snapshot,sidecar,record.chart,record.envelope,{size:selectedSize})
      if(!planned.ok)throw Error(planned.reason)
      const fill=initialize(sidecar)
      for(const name of names){
        if(record.chart.measurements[name].kind==='direct'){
          for(const size of SIZES){
            const value=record.chart.measurements[name].values[size]
            fill.values[name][size]=String(value.value*({mm:1,cm:10,in:25.4}[value.unit]))
          }
        }
      }
      for(const bound of record.envelope.bounds){
        fill.limits[bound.measurement][bound.size]={min:String(bound.minMm),max:String(bound.maxMm)}
      }
      setFields(fill);setProvenance(record.envelope.provenance)
      setValidated({chart:record.chart,envelope:record.envelope,perSize:review.perSize,preview:planned,sourceSignature})
      setConfirmed(false)
      setNotice(`Recovered and revalidated the saved browser chart mirror against native source revision ${snapshot.revision}; no garment edit was made.`)
    }catch(error){setValidated(null);setConfirmed(false);setNotice(`Saved chart mirror was refused: ${error.message}`)}
  }
  const apply=async()=>{
    if(!confirmed||committing||blockers||!prepared?.ok||typeof onApplyBatch!=='function')return
    commitPendingRef.current=true
    setCommitting(true)
    let nativeCommitted=false
    try{
      // Recompute the entire operator-reviewed request before invoking Rust;
      // the real native workspace must independently recheck its live source.
      const verified=verifyModarisFabricBoundNativeCommitRequest20261027(snapshot,prepared,prepared.proposal)
      if(!verified.ok)throw Error(verified.reason)
      const applied=await onApplyBatch(verified.proposal,prepared.selectedSidecar)
      if(!applied?.ok||!applied.before||!applied.after)
        throw Error('Native Rust rejected the batch. No committed native edit was reported.')
      nativeCommitted=true
      const witnessed=witnessModarisFabricBoundNativeTransaction20261027(applied.before,applied.after,prepared,verified.proposal)
      if(!witnessed.ok)throw Error(witnessed.reason)
      ownCommittedRevision.current=applied.after.revision
      let mirrored=true
      try{
        localStorage.setItem(recordKey(validated.chart.fabricId),JSON.stringify({schema:'exo-modaris-fabric-chart-v1',chart:witnessed.chart,envelope:validated.envelope}))
      }catch{mirrored=false}
      setValidated(null);setConfirmed(false)
      setNotice(`Rust committed ${verified.proposal.pointCount} selected-size linked native point edit(s) with one Undo; exact source/geometry and six-size chart witness passed. ${mirrored?'A detached browser chart mirror was saved; it is NOT in the Rust garment.':'Browser chart mirror could not be saved: retain the verified chart externally.'} Other sizes were NOT automatically graded. Reopen the chart before making another bounded edit.`)
    }catch(error){
      setConfirmed(false)
      setNotice(nativeCommitted?
        `Native Rust edit COMMITTED but postcommit chart verification/storage failed: ${error.message}. No rollback was performed. Inspect the live garment and recover the chart before continuing.`:
        `Precommit/atomic edit refused: ${error.message}`)
    }finally{commitPendingRef.current=false;setCommitting(false)}
  }
  return <section aria-label="Modaris fabric-constrained multi-size measurement chart" data-modaris-fabric-chart="research-reviewed" style={{display:'grid',gap:8}}>
    <h3>Six-size measurement chart · physical fabric limits</h3>
    <p>Author every size in millimetres, including separate min/max physical limits for each measurement and size. No fabric stretch, ease, or grading values are fabricated by EXO.</p>
    <p>Required: a previously saved native formula binding. Preview is side-effect free. A separately confirmed selected-size commit uses Rust AnchorGroup and saves native point rules; the full chart remains browser-side and is not an authoritative Rust garment dependency graph.</p>
    {blockers&&<p role="alert">{blockers}</p>}
    <fieldset disabled={Boolean(blockers)}><legend>Fabric envelope provenance</legend>
      <label>Fabric identifier <input aria-label="Fabric identifier for chart" value={fabricId} maxLength={128} onChange={event=>{setFabricId(event.target.value);setValidated(null)}}/></label>
      <label>Supplier / patternmaker physical-limit reference <input aria-label="Fabric physical limit provenance" value={provenance} maxLength={256} onChange={event=>{setProvenance(event.target.value);setValidated(null)}}/></label>
    </fieldset>
    <button type="button" disabled={Boolean(blockers)||!fabricId.trim()} onClick={restore}>Reopen previously verified browser chart for this fabric</button>
    <div style={{overflowX:'auto'}}>
      <table aria-label="Explicit physical measurements and limits for all sizes"><thead><tr><th>Measurement</th><th>Size</th><th>Value (mm)</th><th>Minimum (mm)</th><th>Maximum (mm)</th></tr></thead>
        <tbody>{names.flatMap(name=>SIZES.map(size=>{
          const direct=directNames.includes(name)
          const original=sidecar.measurements[name]
          return <tr key={`${name}:${size}`}><th scope="row">{name}{!direct?` = ${original?.formula||'computed'}`:''}</th><td>{size}</td>
            <td>{direct?<input style={{width:95}} aria-label={`${name} ${size} value millimetres`} value={fields.values[name]?.[size]??''} onChange={e=>update(name,size,e.target.value)} placeholder="Required"/>:<em>Formula</em>}</td>
            {['min','max'].map(bound=><td key={bound}><input style={{width:95}} aria-label={`${name} ${size} ${bound} millimetres`} value={fields.limits[name]?.[size]?.[bound]??''} onChange={e=>update(name,size,e.target.value,bound)} placeholder="Required"/></td>)}
          </tr>
        }))}</tbody>
      </table>
    </div>
    <label>Size to preview <select aria-label="Fabric chart preview size" value={selectedSize} onChange={event=>previewSize(event.target.value)}>{SIZES.map(size=><option key={size} value={size}>{size}</option>)}</select></label>
    <button type="button" disabled={Boolean(blockers)} onClick={create}>Validate entire chart and preview selected native size</button>
    {validated&&!stale&&<div aria-label="Verified fabric chart plan" data-verified-sizes={validated.perSize.length}>
      <strong>{validated.perSize.length} sizes validated · {names.length} measurements · {selectedSize} point preview</strong>
      <p>Chart revision {validated.chart.revision} · native revision {validated.chart.sourceRevision} · fabric provenance {validated.envelope.provenance}</p>
      <p>{validated.preview.nativePlan.commands.length} geometry command(s) planned. Fabric checks are browser-side, not enforced inside Rust or certified for garment production.</p>
      <ul>{validated.preview.nativePlan.steps.map(step=><li key={step.bindingId}>{step.bindingId}: X {step.afterMm[0].toFixed(2)} mm, Y {step.afterMm[1].toFixed(2)} mm</li>)}</ul>
      <label><input type="checkbox" aria-label="Confirm one selected-size native chart edit" checked={confirmed} disabled={committing||!prepared?.ok||typeof onApplyBatch!=='function'} onChange={e=>setConfirmed(e.target.checked)}/> I reviewed the entire size/bound chart and understand only the selected native point geometry is edited.</label>
      <button type="button" disabled={!confirmed||committing||!prepared?.ok||typeof onApplyBatch!=='function'} onClick={apply}>Commit bounded selected-size native point groups · ONE Rust Undo</button>
      {!prepared?.ok&&<p role="alert">{prepared?.reason||'A nonzero, source-verified native edit must be available.'}</p>}
    </div>}
    {stale&&<p role="alert">Source revision/fingerprint changed; validate the complete chart again.</p>}
    <p role="status">{notice}</p>
  </section>
}
