import React,{useEffect,useRef,useState} from 'react'
import {buildNativeSixSizeFacingCandidate20261027 as build,
  verifyNativeSixSizeFacingCandidate20261027 as verify} from '../core/modarisNativeFacingCandidate20261027.js'

const finite=n=>typeof n==='number'&&Number.isFinite(n)
const mm=n=>finite(n)?(n*1000).toFixed(2)+' mm':'—'
export function nativeFacingCandidatePreflight20261027(snapshot,disabled=false){
  if(disabled)return 'Finish the current native edit before reviewing derived facing geometry.'
  if(!Number.isSafeInteger(snapshot?.revision)||snapshot.revision<0)return 'A saved native source revision is required.'
  if(snapshot?.activeGradedSize||snapshot?.active_grade_size)return 'Restore the base pattern before deriving a physical facing.'
  if(snapshot?.gradeRunPersisted!==true)return 'Save a real XS–XXL native grade catalog first.'
  if(!Array.isArray(snapshot?.template?.panels)||!snapshot.template.panels.length)return 'There is no native pattern geometry.'
  return ''
}

/** Genuine XS–XXL authored geometry preview. The native receiver and cutter
 * remain separate; preview does not store the facing into the garment. */
export default function NativeFacingCandidate20261027({snapshot,disabled=false,onReadProject,onNativePreview,onInstall}){
  const [panelId,setPanelId]=useState('')
  const [edgeId,setEdgeId]=useState('')
  const [depth,setDepth]=useState('40')
  const [allowance,setAllowance]=useState('10')
  const [report,setReport]=useState(null)
  const [feedback,setFeedback]=useState('')
  const [busy,setBusy]=useState(false)
  const [confirmed,setConfirmed]=useState(false)
  const epoch=useRef(0)
  const latest=useRef('')
  const source=JSON.stringify({revision:snapshot?.revision,template:snapshot?.template,
    hasCatalog:snapshot?.gradeRunPersisted,activeSize:snapshot?.activeGradedSize,
    installedFacing:snapshot?.nativeFacingDependency})
  latest.current=source
  useEffect(()=>{epoch.current++;setReport(null);setConfirmed(false)},[source])
  const blocker=nativeFacingCandidatePreflight20261027(snapshot,disabled||busy)
  const options=(snapshot?.template?.panels??[]).filter(panel=>panel?.polygon?.points?.length===4)
  const selected=options.find(panel=>panel.id===panelId)
  const namedEdges=selected?.polygon?.edges??[]
  const candidateStale=Boolean(report?.source!==source)
  const installBlocker=report?.nativeAuthoritative?null:report?.proposal?.provenance?.parentEdgeId!==selected?.polygon?.edges?.[0]?
    'Persistent native v1 installation requires the first named CCW rectangular edge. Other edges remain preview-only.':
    report?.proposal?.sizes?.some(row=>row.sourceNotches.length>0)?
      'Persistent native v1 installation requires an unnotched source edge; Rust generates paired 25% and 75% notches itself.':null
  function changePanel(id){epoch.current++;setPanelId(id);setEdgeId('');setReport(null);setConfirmed(false);setFeedback('')}
  function changeEdge(id){epoch.current++;setEdgeId(id);setReport(null);setConfirmed(false);setFeedback('')}
  async function preview(){
    if(blocker||busy||!panelId||!edgeId||typeof onReadProject!=='function')return
    const ticket=++epoch.current,current=source,revision=snapshot.revision
    setReport(null);setConfirmed(false);setFeedback('');setBusy(true)
    try{
      const saved=await onReadProject({sourceRevision:revision})
      if(ticket!==epoch.current||latest.current!==current)throw Error('Native source changed during facing read; retry.')
      if(!saved?.template||JSON.stringify(saved.template)!==JSON.stringify(snapshot.template))
        throw Error('Saved Rust facing source no longer matches the current 2D workspace.')
      let proposal,witness,nativeAuthoritative=false
      const facingId=`facing_${panelId}`.slice(0,50)
      if(typeof onNativePreview==='function'){
        const native=await onNativePreview({sourceRevision:revision,parentPanelId:panelId,
          parentEdgeId:edgeId,facingId,depthMm:Number(depth),allowanceMm:Number(allowance)})
        if(native?.format!=='exo-native-facing-six-size-preview.v1'||
          native.nativeAuthoritative!==true||native.sourceUnchanged!==true||
          native.persisted!==false||native.sourceRevision!==revision||
          native.manufacturingApproved!==false||native.cuttingAuthorized!==false||
          native.derivedPanelId!==facingId||native.parentPanelId!==panelId||
          native.parentEdgeId!==edgeId||native.sizes?.length!==6||
          JSON.stringify(native.sizes.map(row=>row.size))!==JSON.stringify(['XS','S','M','L','XL','XXL'])||
          ![1,2,3].includes(native.relationVersion)||
          native.sizes.some(row=>!Number.isFinite(row.sourceSewlineLengthM)||
            !Number.isFinite(row.facingSewlineLengthM)||
            Math.abs(row.sourceSewlineLengthM-row.facingSewlineLengthM)>1e-8||
            !Array.isArray(row.points)||
            (native.relationVersion===3?(row.points.length<12||row.points.length>260):row.points.length!==4)||
            row.points.some(p=>!Array.isArray(p)||p.length!==2||p.some(v=>!Number.isFinite(v)))||
            row.sourceNotches?.length!==2||row.facingNotches?.length!==2))
          throw Error('Native Rust did not return a complete and safely matched six-size facing preview.')
        nativeAuthoritative=true
        proposal={sourceRevision:revision,derivedPanelId:native.derivedPanelId,
          pairedSeamId:native.pairedSeamId,sizes:native.sizes,relationVersion:native.relationVersion,
          provenance:{parentPanelId:panelId,parentEdgeId:edgeId,facingId,depthMm:Number(depth),
            allowanceMm:Number(allowance)}}
        witness={sourceRevision:revision}
      }else{
        proposal=build(saved,{expectedRevision:revision,parentPanelId:panelId,parentEdgeId:edgeId,
          facingId,depthMm:Number(depth),allowanceMm:Number(allowance)})
        if(!proposal.ok)throw Error(proposal.reason)
        witness=verify(saved,proposal)
        if(!witness.ok)throw Error(witness.reason)
      }
      if(ticket!==epoch.current||latest.current!==current)throw Error('Saved native source changed during facing preview.')
      setReport({source:current,proposal,witness,nativeAuthoritative})
      setFeedback(nativeAuthoritative?
        'Rust independently authored and compiled all six facing contours, paired physical sewing and notches. The preview remains read-only and is not a factory approval.':
        'Six candidate facing contours derived from the saved Rust geometry. Preview has not created a saved child or authorized manufacture.')
    }catch(error){if(ticket===epoch.current)setFeedback(error?.message??String(error))}
    finally{if(ticket===epoch.current)setBusy(false)}
  }
  async function install(){
    if(!report||report.source!==source||!confirmed||blocker||installBlocker||busy||
      typeof onInstall!=='function'||snapshot?.nativeFacingDependency)return
    const ticket=++epoch.current,captured=source,revision=snapshot.revision
    const candidate=report.proposal
    setBusy(true);setFeedback('')
    try{
      if(latest.current!==captured||candidate.sourceRevision!==revision)
        throw Error('Saved native facing preview is stale; read current source again.')
      const output=await onInstall({sourceRevision:revision,
        parentPanelId:candidate.provenance.parentPanelId,
        parentEdgeId:candidate.provenance.parentEdgeId,
        facingId:candidate.provenance.facingId,
        depthMm:candidate.provenance.depthMm,
        allowanceMm:candidate.provenance.allowanceMm})
      if(ticket!==epoch.current)return
      if(!output||output.revision!==revision+1||!output.gradeRunPersisted||
        !output.nativeFacingDependency||
        output.nativeFacingDependency.facingId!==candidate.provenance.facingId)
        throw Error('Native installation did not return a matching persisted facing relation and one revision. Inspect garment before retrying.')
      setReport(null);setConfirmed(false)
      setFeedback(`Rust saved facing ${candidate.provenance.facingId} in revision ${output.revision}. Source-linked geometry still requires independent CUT/STITCH audit; factory cutting is not authorized.`)
    }catch(error){if(ticket===epoch.current)setFeedback(error?.message??String(error))}
    finally{if(ticket===epoch.current)setBusy(false)}
  }
  return <section data-native-facing-candidate="true" aria-label="Native six-size facing construction preview">
    <h3>Connected facing · six-size physical preview</h3>
    <p>Preview a physical source-linked facing from a qualified straight, gentle-cubic or sampled normal-offset parent boundary. Rust previews all six sewn contours and 25%/75% material notches before installation. The sampled hem is a bounded polyline approximation of the mathematical curve normal, not an exact continuous spline or factory-approved cutting line.</p>
    {snapshot?.nativeFacingDependency&&<div role="status" data-facing-persisted-status="true">
      Saved native parent→facing relationship: {snapshot.nativeFacingDependency.parentPanelId} → {snapshot.nativeFacingDependency.facingId}. Review its six-size CUT/STITCH audits before manufacture. One bounded dependent facing per document is supported.
    </div>}
    <label>Facing parent pattern<select aria-label="Facing source pattern" value={panelId} disabled={busy||disabled} onChange={e=>changePanel(e.target.value)}>
      <option value="">Select native pattern</option>
      {options.map(p=><option key={p.id} value={p.id}>{p.name||p.id}</option>)}
    </select></label>
    <label>Unsewn source boundary<select aria-label="Facing source edge" value={edgeId} disabled={busy||disabled||!selected} onChange={e=>changeEdge(e.target.value)}>
      <option value="">Select named boundary</option>
      {namedEdges.map(name=><option key={name} value={name}>{name}</option>)}
    </select></label>
    <label>Facing depth (mm)<input aria-label="Facing depth mm" type="number" min="10" max="100" step="1" value={depth} disabled={busy||disabled} onChange={e=>{epoch.current++;setDepth(e.target.value);setReport(null);setConfirmed(false)}}/></label>
    <label>Child seam allowance (mm)<input aria-label="Facing seam allowance mm" type="number" min="3" max="30" step="1" value={allowance} disabled={busy||disabled} onChange={e=>{epoch.current++;setAllowance(e.target.value);setReport(null);setConfirmed(false)}}/></label>
    {blocker&&<p role="status">{blocker}</p>}
    <button type="button" onClick={preview} disabled={Boolean(blocker)||!panelId||!edgeId||busy||typeof onReadProject!=='function'||Boolean(snapshot?.nativeFacingDependency)}>
      {busy?'Reading saved Rust grade catalog…':'Preview all six physical facing sizes'}
    </button>
    {candidateStale&&<p role="alert">Facing preview is stale. Recalculate from the saved Rust source.</p>}
    {feedback&&<p role="status">{feedback}</p>}
    {report&&!candidateStale&&<div data-facing-six-size-result="true">
      <p><strong>{report.nativeAuthoritative?'Rust-compiled physical preview':'Read-only facing geometry candidate'}:</strong> {report.proposal.derivedPanelId} · paired seam {report.proposal.pairedSeamId} · source revision {report.witness.sourceRevision}{report.proposal.relationVersion===3?' · sampled true-normal hem (research v3)':''} · manufacturing approval: none.</p>
      <table aria-label="Native six-size facing physical construction"><thead><tr><th>Size</th><th>Parent sewn edge</th><th>Derived facing points</th><th>Paired physical notches</th></tr></thead><tbody>
        {report.proposal.sizes.map(row=><tr key={row.size}><th>{row.size}</th><td>{mm(row.sourceSewlineLengthM)}</td>
          <td>{row.points.length}</td><td>{row.facingNotches?.length??row.sourceNotches.length}</td></tr>)}
      </tbody></table>
      <small>These six authored shapes and seam definitions are review candidates only. No production panel, automatic child subscription, fitted closure, or cutter approval was committed by preview.</small>
      {typeof onInstall==='function'&&!snapshot?.nativeFacingDependency&&<div data-facing-install-review="true">
        {installBlocker&&<p role="status">{installBlocker}</p>}
        <label><input type="checkbox" checked={confirmed} disabled={busy||Boolean(blocker)||Boolean(installBlocker)} onChange={event=>setConfirmed(event.target.checked)}/> I reviewed six graded facing contours and authorize Rust to save the parent→child relationship in one Undo step.</label>
        <button type="button" onClick={install} disabled={!confirmed||busy||Boolean(blocker)||Boolean(installBlocker)}>Install confirmed native facing dependency</button>
      </div>}
    </div>}
  </section>
}
