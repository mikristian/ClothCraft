import React,{useEffect,useMemo,useState} from 'react'
import {fingerprintNativePatternBindingsSource20261023 as fingerprint} from '../core/nativePatternConstraintBindings20261023.js'
import {planModarisNativeReferenceRecompute20261027 as plan} from '../core/modarisNativeReferenceRecompute20261027.js'
import {witnessModarisNativeReferenceCommit20261027 as witnessCommit} from '../core/modarisNativeReferenceCommitWitness20261027.js'

const decimal=/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/
const mm=s=>typeof s==='string'&&decimal.test(s.trim())&&Number.isFinite(Number(s))?Number(s):NaN
const signature=(snapshot,sidecar)=>JSON.stringify({snapshot,sidecar})

export function modarisNativeReferenceRecomputePreflight20261027(snapshot,sidecar,disabled=false){
  if(disabled)return 'Native reference recompute is unavailable while the workspace is busy.'
  if(!Number.isSafeInteger(snapshot?.revision)||!Array.isArray(snapshot?.template?.panels))return 'A revisioned native Rust snapshot is required.'
  if(!sidecar?.bindings?.length)return 'Save a native measurement binding sidecar first.'
  try {
    if(sidecar.sourceRevision!==snapshot.revision||sidecar.sourceFingerprint!==fingerprint(snapshot))return 'The native binding source is stale.'
  }catch(error){return `Invalid native geometry: ${error.message}`}
  return ''
}

/**
 * UI reviews a one-shot native grouped command, not an always-on Rust dependency graph.
 * Native postcommit failure is surfaced for explicit operator recovery.
 */
export default function ModarisNativeReferenceRecompute20261027({snapshot,sidecar,disabled=false,onApplyBatch}){
  const panels=snapshot?.template?.panels??[]
  const [panelId,setPanelId]=useState('')
  const [pointIndex,setPointIndex]=useState('')
  const [x,setX]=useState('')
  const [y,setY]=useState('')
  const [preview,setPreview]=useState(null)
  const [confirmed,setConfirmed]=useState(false)
  const [busy,setBusy]=useState(false)
  const [notice,setNotice]=useState('')
  const currentSignature=signature(snapshot,sidecar)
  // Invalidate an in-flight preview, but retain the explicit revision-stamped
  // postcommit witness result. A later source change must not erase the only
  // user-visible evidence of a completed Rust transaction.
  useEffect(()=>{setPreview(null);setConfirmed(false)},[currentSignature])
  const blocker=modarisNativeReferenceRecomputePreflight20261027(snapshot,sidecar,disabled||busy)
  const panel=panels.find(p=>p.id===panelId)
  const bound=new Set((sidecar?.bindings??[]).filter(b=>b.panelId===panelId).map(b=>b.pointIndex))
  const options=(panel?.polygon?.points??[]).map((point,i)=>({point,i})).filter(x=>!bound.has(x.i))
  const stale=Boolean(preview&&preview.signature!==currentSignature)
  const proposal=useMemo(()=>preview&&!stale?plan(snapshot,sidecar,preview.input):null,[preview,stale,snapshot,sidecar])
  const clear=()=>{setPreview(null);setConfirmed(false)}
  const choosePanel=value=>{setPanelId(value);setPointIndex('');setX('');setY('');clear()}
  const choosePoint=value=>{
    setPointIndex(value);clear()
    const point=panels.find(p=>p.id===panelId)?.polygon?.points?.[Number(value)]
    setX(point?String(point[0]*1000):'');setY(point?String(point[1]*1000):'')
  }
  const buildInput=()=>{
    const index=Number(pointIndex)
    const original=panel?.polygon?.points?.[index]
    if(pointIndex===''||!Number.isSafeInteger(index)||!original||bound.has(index))throw Error('Select an unbound source point')
    if(!Number.isFinite(mm(x))||!Number.isFinite(mm(y)))throw Error('Provide finite X/Y coordinates in millimetres')
    return {panelId,pointIndex:index,originalPosition:[...original],position:[mm(x)/1000,mm(y)/1000]}
  }
  const previewEdit=()=>{
    clear()
    if(blocker){setNotice(blocker);return}
    try{
      const input=buildInput(),result=plan(snapshot,sidecar,input)
      if(!result.ok)throw Error(result.reason)
      setPreview({input,signature:currentSignature,planned:result})
      setNotice(`Previewed ${result.proposal.pointCount} source/dependent point edits in one native AnchorGroup. No geometry committed.`)
    }catch(error){setNotice(`Preview refused: ${error.message}`)}
  }
  const apply=async()=>{
    if(blocker||!confirmed||!preview||stale||!proposal?.ok||typeof onApplyBatch!=='function'){
      setNotice('Commit refused: busy, stale, unconfirmed or no native batch handler.');return
    }
    setBusy(true)
    try{
      if(signature(snapshot,sidecar)!==preview.signature)throw Error('Source changed after preview')
      const live=plan(snapshot,sidecar,preview.input)
      if(!live.ok||JSON.stringify(live.proposal)!==JSON.stringify(preview.planned.proposal))
        throw Error('Native source or dependent AnchorGroup changed since preview')
      const result=await onApplyBatch(live.proposal,sidecar)
      if(!result?.ok)throw Error('Native handler declined or could not confirm the batch; inspect the native workspace before retrying.')
      if(!result.before||!result.after)throw Error('Native handler reported success without committed before/after evidence. Native commit may already have occurred; inspect or Undo before continuing.')
      if(result.before.revision!==snapshot.revision||
         fingerprint(result.before)!==fingerprint(snapshot))throw Error('Native commit source differs from reviewed geometry. Native commit already occurred; inspect or Undo before continuing.')
      const witness=witnessCommit(result.before,result.after,sidecar,preview.input,live.proposal)
      if(!witness.ok)throw Error(`Postcommit verification failed: ${witness.reason}. Native commit already occurred; use native Undo or inspect before continuing.`)
      setNotice(`Native batch committed and witnessed at revision ${result.after.revision}. Rust persisted ${witness.persistedNativeBindingCount} point rules, and all saved binding positions were checked. Subsequent edits still require another explicit recompute.`)
      clear()
    }catch(error){setNotice(error.message)}
    finally{setBusy(false);setConfirmed(false)}
  }
  return <section aria-label="Modaris native reference recompute">
    <h3>Native reference point recompute</h3>
    <p>Qualified unsewn, ungraded flat Rust panels only. One source anchor and its measurement-linked dependents; no persistent Rust dependency graph.</p>
    {blocker&&<p role="alert">{blocker}</p>}
    <label>Source panel <select aria-label="Source panel" value={panelId} disabled={Boolean(blocker)} onChange={e=>choosePanel(e.target.value)}>
      <option value="">Choose panel</option>{panels.map(p=><option key={p.id} value={p.id}>{p.name||p.id}</option>)}
    </select></label>
    <label>Unbound source anchor <select aria-label="Unbound source anchor" value={pointIndex} disabled={Boolean(blocker)||!panel} onChange={e=>choosePoint(e.target.value)}>
      <option value="">Choose point</option>{options.map(({point,i})=><option key={i} value={String(i)}>Point {i+1}: {point.map(v=>(v*1000).toFixed(2)).join(', ')} mm</option>)}
    </select></label>
    <label>Desired X mm <input aria-label="Desired X mm" value={x} disabled={Boolean(blocker)} onChange={e=>{setX(e.target.value);clear()}} /></label>
    <label>Desired Y mm <input aria-label="Desired Y mm" value={y} disabled={Boolean(blocker)} onChange={e=>{setY(e.target.value);clear()}} /></label>
    <button type="button" disabled={Boolean(blocker)||!panel||pointIndex===''} onClick={previewEdit}>Preview source and all dependent corrections</button>
    {preview&&!stale&&proposal?.ok&&<div aria-label="Native recompute preview">
      <p>One Rust AnchorGroup: {proposal.proposal.pointCount} edits in {proposal.proposal.panelCount} panel. Dependent binding IDs: {proposal.correctedBindingIds.join(', ')||'none'}.</p>
      <ol>{proposal.proposal.commands[0].edits.map(([index,position])=><li key={index}>Point {index+1}: X {(position[0]*1000).toFixed(3)} mm, Y {(position[1]*1000).toFixed(3)} mm</li>)}</ol>
      <label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> Confirm applying this exact source and dependent native batch</label>
      <button type="button" disabled={!confirmed||Boolean(blocker)||typeof onApplyBatch!=='function'} onClick={apply}>Apply confirmed native AnchorGroup</button>
    </div>}
    {stale&&<p role="alert">Preview is stale; generate a new source-verified preview.</p>}
    {notice&&<p role="status">{notice}</p>}
  </section>
}
