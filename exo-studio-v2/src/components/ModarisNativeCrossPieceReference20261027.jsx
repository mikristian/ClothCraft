import React,{useEffect,useMemo,useState} from 'react'
import {fingerprintNativePatternBindingsSource20261023 as fingerprint,serializeNativePatternConstraintSidecar20261023 as serialize} from '../core/nativePatternConstraintBindings20261023.js'
import {planModarisNativeCrossPieceReference20261027 as plan,verifyModarisNativeCrossPieceReferenceCommit20261027 as verify} from '../core/modarisNativeCrossPieceReference20261027.js'

const decimal=/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/
const mm=s=>typeof s==='string'&&decimal.test(s.trim())&&Number.isFinite(Number(s))?Number(s):NaN
const signature=(snapshot,sidecar)=>JSON.stringify({snapshot,sidecar})
const coord=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)
const shown=p=>p.map(v=>(v*1000).toFixed(3)).join(' / ')
function board(panel,point){
  const theta=(panel.layout_rotation_degrees??0)*Math.PI/180,c=Math.cos(theta),s=Math.sin(theta),o=panel.layout_2d??[0,0]
  if(!coord(o)||!coord(point)||!Number.isFinite(theta))throw Error('Invalid native board coordinate frame')
  return [o[0]+c*point[0]-s*point[1],o[1]+s*point[0]+c*point[1]]
}

export function modarisNativeCrossPieceReferencePreflight20261027(snapshot,sidecar,disabled=false){
  if(disabled)return 'Native cross-panel editing is unavailable while the workspace is busy.'
  if(!Number.isSafeInteger(snapshot?.revision)||!Array.isArray(snapshot?.template?.panels))return 'A revisioned native Rust snapshot is required.'
  if(!sidecar?.bindings?.length)return 'Save a native measurement binding sidecar first.'
  try{
    serialize(sidecar)
    if(sidecar.sourceRevision!==snapshot.revision||sidecar.sourceFingerprint!==fingerprint(snapshot))return 'The native binding source is stale.'
  }catch(error){return `Invalid native bindings or source: ${error.message}`}
  return ''
}

/** The native callback returns only {revision,template} as its before witness.
 * Compare revision and fingerprinted authored geometry, not service metadata. */
export function modarisNativeCrossPieceSourceIdentity20261027(live,before){
  try{return Number.isSafeInteger(live?.revision)&&before?.revision===live.revision&&fingerprint(before)===fingerprint(live)}
  catch{return false}
}

/** A user-confirmed single transaction. The link is not saved as a Rust graph. */
export default function ModarisNativeCrossPieceReference20261027({snapshot,sidecar,disabled=false,onApplyBatch}){
  const panels=snapshot?.template?.panels??[]
  const [sourceId,setSourceId]=useState('')
  const [sourceIndex,setSourceIndex]=useState('')
  const [targetId,setTargetId]=useState('')
  const [targetIndex,setTargetIndex]=useState('')
  const [x,setX]=useState('')
  const [y,setY]=useState('')
  const [preview,setPreview]=useState(null)
  const [confirmed,setConfirmed]=useState(false)
  const [busy,setBusy]=useState(false)
  const [notice,setNotice]=useState('')
  const currentSignature=signature(snapshot,sidecar)
  useEffect(()=>{setPreview(null);setConfirmed(false)},[currentSignature])
  const blocker=modarisNativeCrossPieceReferencePreflight20261027(snapshot,sidecar,disabled||busy)
  const source=panels.find(p=>p.id===sourceId),target=panels.find(p=>p.id===targetId)
  const bound=useMemo(()=>new Set((sidecar?.bindings??[]).map(b=>`${b.panelId}\u0000${b.pointIndex}`)),[sidecar])
  const unbound=p=>(p?.polygon?.points??[]).map((point,index)=>({point,index})).filter(({index})=>!bound.has(`${p.id}\u0000${index}`))
  const stale=Boolean(preview&&preview.signature!==currentSignature)
  const refreshed=useMemo(()=>preview&&!stale?plan(snapshot,sidecar,preview.input):null,[snapshot,sidecar,preview,stale])
  const clear=()=>{setPreview(null);setConfirmed(false)}
  const selectSourcePanel=value=>{setSourceId(value);setSourceIndex('');setX('');setY('');clear()}
  const selectSourcePoint=value=>{
    setSourceIndex(value);clear()
    const original=source?.polygon?.points?.[Number(value)]
    setX(value!==''&&original?String(original[0]*1000):'')
    setY(value!==''&&original?String(original[1]*1000):'')
  }
  const selectTargetPanel=value=>{setTargetId(value);setTargetIndex('');clear()}
  const buildInput=()=>{
    if(!source||!target||source.id===target.id||sourceIndex===''||targetIndex==='')throw Error('Select different source and target panels with unbound anchors')
    const sourcePointIndex=Number(sourceIndex),targetPointIndex=Number(targetIndex)
    const originalSource=source.polygon?.points?.[sourcePointIndex],originalTarget=target.polygon?.points?.[targetPointIndex]
    if(!Number.isSafeInteger(sourcePointIndex)||!Number.isSafeInteger(targetPointIndex)||!coord(originalSource)||!coord(originalTarget)||bound.has(`${sourceId}\u0000${sourcePointIndex}`)||bound.has(`${targetId}\u0000${targetPointIndex}`))
      throw Error('Select valid unbound source and target anchors')
    if(!Number.isFinite(mm(x))||!Number.isFinite(mm(y)))throw Error('Provide finite desired source X/Y millimetre coordinates')
    const sourceBoard=board(source,originalSource),targetBoard=board(target,originalTarget)
    return {sourcePanelId:sourceId,sourcePointIndex,sourceOriginalPosition:[...originalSource],sourcePosition:[mm(x)/1000,mm(y)/1000],
      targetPanelId:targetId,targetPointIndex,targetOriginalPosition:[...originalTarget],
      relativeBoardVector:[targetBoard[0]-sourceBoard[0],targetBoard[1]-sourceBoard[1]]}
  }
  const previewEdit=()=>{
    clear()
    if(blocker){setNotice(blocker);return}
    try{
      const input=buildInput(),planned=plan(snapshot,sidecar,input)
      if(!planned.ok)throw Error(planned.reason)
      setPreview({input,planned,signature:currentSignature})
      setNotice('Reviewed two ordered native AnchorGroups. Preview only; no geometry has been changed.')
    }catch(error){setNotice(`Preview refused: ${error.message}`)}
  }
  const apply=async()=>{
    if(blocker||!confirmed||!preview||stale||!refreshed?.ok||typeof onApplyBatch!=='function'){
      setNotice('Commit refused: unconfirmed, stale, busy or missing native batch handler.');return
    }
    setBusy(true)
    try{
      if(currentSignature!==preview.signature||signature(snapshot,sidecar)!==preview.signature)throw Error('Native snapshot changed since preview')
      const reviewed=plan(snapshot,sidecar,preview.input)
      if(!reviewed.ok||JSON.stringify(reviewed.proposal)!==JSON.stringify(preview.planned.proposal))throw Error('Reviewed native batch no longer matches current source')
      const result=await onApplyBatch(reviewed.proposal,sidecar)
      if(!result?.ok)throw Error('Native handler declined the batch or did not confirm its result; inspect the workspace before retrying.')
      if(!result.before||!result.after)throw Error('Native batch may have committed without before/after evidence. Inspect native Undo/history before retrying.')
      if(!modarisNativeCrossPieceSourceIdentity20261027(snapshot,result.before))
        throw Error('Committed native source identity differs from the reviewed snapshot. Inspect or Undo before proceeding.')
      const witnessed=verify(result.before,result.after,sidecar,reviewed)
      if(!witnessed.ok)throw Error(`Native batch committed but exact Rust rebase verification failed: ${witnessed.reason}. Inspect or Undo before proceeding.`)
      setNotice(`Cross-panel native batch witnessed at revision ${result.after.revision}; both panels and normalization verified. This explicit one-time update creates no persistent cross-panel reference graph.`)
      clear()
    }catch(error){setNotice(error.message||String(error))}
    finally{setBusy(false);setConfirmed(false)}
  }
  const sourceOptions=unbound(source),targetOptions=unbound(target)
  return <section aria-label="Modaris native cross-panel point reference">
    <h3>Native cross-panel point reference</h3>
    <p>One explicit source-to-target board-relative update across two detached native pattern panels. Rust applies two AnchorGroups in one Undo transaction. No continuously updating cross-panel graph or production approval.</p>
    {blocker&&<p role="alert">{blocker}</p>}
    <label>Source panel <select aria-label="Cross-panel source panel" value={sourceId} disabled={Boolean(blocker)} onChange={e=>selectSourcePanel(e.target.value)}>
      <option value="">Choose source panel</option>{panels.map(p=><option key={p.id} value={p.id}>{p.name||p.id}</option>)}
    </select></label>
    <label>Unbound source anchor <select aria-label="Cross-panel source anchor" value={sourceIndex} disabled={Boolean(blocker)||!source} onChange={e=>selectSourcePoint(e.target.value)}>
      <option value="">Choose source point</option>{sourceOptions.map(({point,index})=><option key={index} value={String(index)}>Point {index+1}: {shown(point)} mm</option>)}
    </select></label>
    <label>Target panel <select aria-label="Cross-panel target panel" value={targetId} disabled={Boolean(blocker)} onChange={e=>selectTargetPanel(e.target.value)}>
      <option value="">Choose target panel</option>{panels.filter(p=>p.id!==sourceId).map(p=><option key={p.id} value={p.id}>{p.name||p.id}</option>)}
    </select></label>
    <label>Unbound target anchor <select aria-label="Cross-panel target anchor" value={targetIndex} disabled={Boolean(blocker)||!target||target.id===sourceId} onChange={e=>{setTargetIndex(e.target.value);clear()}}>
      <option value="">Choose target point</option>{targetOptions.map(({point,index})=><option key={index} value={String(index)}>Point {index+1}: {shown(point)} mm</option>)}
    </select></label>
    <label>Desired source material X (mm) <input aria-label="Desired source X mm" value={x} disabled={Boolean(blocker)} onChange={e=>{setX(e.target.value);clear()}} /></label>
    <label>Desired source material Y (mm) <input aria-label="Desired source Y mm" value={y} disabled={Boolean(blocker)} onChange={e=>{setY(e.target.value);clear()}} /></label>
    <button type="button" disabled={Boolean(blocker)||!source||!target||sourceId===targetId||sourceIndex===''||targetIndex===''} onClick={previewEdit}>Preview cross-panel source and dependent points</button>
    {preview&&!stale&&refreshed?.ok&&<div aria-label="Cross-panel native batch preview">
      <p>One native edit-batch: two AnchorGroups on separate panels, two points, one Rust Undo. The relative board vector comes from the original snapshot: {shown(preview.input.relativeBoardVector)} mm.</p>
      <table><thead><tr><th>Anchor</th><th>Material coordinates (mm)</th><th>Board coordinates (mm)</th></tr></thead><tbody>
        <tr><td>Source before · {sourceId} point {Number(sourceIndex)+1}</td><td>{shown(preview.input.sourceOriginalPosition)}</td><td>{shown(board(source,preview.input.sourceOriginalPosition))}</td></tr>
        <tr><td>Source proposed · {sourceId} point {Number(sourceIndex)+1}</td><td>{shown(preview.input.sourcePosition)}</td><td>{shown(board(source,preview.input.sourcePosition))}</td></tr>
        <tr><td>Dependent before · {targetId} point {Number(targetIndex)+1}</td><td>{shown(preview.input.targetOriginalPosition)}</td><td>{shown(board(target,preview.input.targetOriginalPosition))}</td></tr>
        <tr><td>Dependent proposed · {targetId} point {Number(targetIndex)+1}</td><td>{shown(refreshed.targetMaterialPosition)}</td><td>{shown(refreshed.targetBoardPosition)}</td></tr>
      </tbody></table>
      <label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> Confirm this exact two-panel native transaction</label>
      <button type="button" disabled={!confirmed||Boolean(blocker)||typeof onApplyBatch!=='function'} onClick={apply}>Apply confirmed cross-panel native batch</button>
    </div>}
    {stale&&<p role="alert">Preview is stale. Review the current native source and preview again.</p>}
    {preview&&!stale&&refreshed&&!refreshed.ok&&<p role="alert">Preview is invalid: {refreshed.reason}</p>}
    {notice&&<p role="status">{notice}</p>}
  </section>
}
