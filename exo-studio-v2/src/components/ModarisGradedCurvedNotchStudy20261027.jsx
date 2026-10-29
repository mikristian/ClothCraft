import React,{useState} from 'react'
import {transferModarisGradedCurvedNotch20261027 as transfer} from '../core/modarisGradedCurvedNotchTransfer20261027.js'

const fingerprint=p=>JSON.stringify(p)
const key=ref=>JSON.stringify([ref.pieceId,ref.notchId])
const unpack=value=>{try {const [pieceId,notchId]=JSON.parse(value);return {pieceId,notchId}}catch{return null}}
const reason=error=>String(error?.message??error).includes('REQUIRES_PER_SIZE_NOTCH_MAP')
  ? 'This graded shape requires different physical Bézier notch parameters across sizes. The legacy notch schema stores only one t; a per-size notch map is required before this transfer can be applied.'
  : String(error?.message??error)

export function modarisGradedCurvedNotchPreflight20261027(project,{nativeMode=false,disabled=false,onApplyProject}={}){
 if(nativeMode)return 'Native Rust mode cannot accept this legacy curved notch study.'
 if(disabled)return 'Curved graded notch editing is disabled.'
 if(typeof onApplyProject!=='function')return 'An onApplyProject callback is required.'
 if(!project||!Number.isSafeInteger(project.revision)||project.revision<0||project.units!=='cm'||!Array.isArray(project.pieces)||project.pieces.length<2)return 'A revisioned two-piece centimetre legacy project is required.'
 if(!Array.isArray(project.grading?.sizes)||project.grading.sizes.length<2)return 'Graded size definitions are required.'
 if(['productionSpec','cutlines','cutline','holes','markers','marker','industrialAllowanceGraph','modarisSizeLinkedGrade','modarisGradedNotchLink','manufacturing','attachments'].some(k=>Object.hasOwn(project,k))||(project.seams!==undefined&&(!Array.isArray(project.seams)||project.seams.length)))return 'Sewn or production attached projects cannot be edited by this study.'
 if(project.pieces.some(p=>p.locked||['holes','cutlines','cutline','sewingPairs','edgeBindings','darts','pleats','buttonholes','pins','internalLines','seamAllowance'].some(k=>Object.hasOwn(p,k))))return 'Piece sewing, production, or construction attachments prevent curved notch transfer.'
 return ''
}

export function prepareModarisGradedCurvedNotchStudy20261027(project,{source,target}={}){
 return transfer(project,{source,target,expectedRevision:project.revision})
}

/** App increases project revision itself; verify the full preview again first. */
export function prepareModarisGradedCurvedNotchCommit20261027(project,preview,sourceFingerprint,{source,target}={}){
 if(!preview?.project||sourceFingerprint!==fingerprint(project)||preview.project.revision!==project.revision+1)throw Error('STALE_CURVED_NOTCH_PREVIEW')
 const fresh=prepareModarisGradedCurvedNotchStudy20261027(project,{source,target})
 if(fingerprint(fresh.project)!==fingerprint(preview.project)||fingerprint(fresh.proof)!==fingerprint(preview.proof))throw Error('CURVED_NOTCH_PREVIEW_CHANGED')
 const handoff=structuredClone(fresh.project)
 handoff.revision=project.revision
 return handoff
}

export default function ModarisGradedCurvedNotchStudy20261027({project,nativeMode=false,disabled=false,onApplyProject}){
 const [sourceId,setSourceId]=useState(''),[targetId,setTargetId]=useState('')
 const [staged,setStaged]=useState(null),[confirmed,setConfirmed]=useState(false)
 const [status,setStatus]=useState('Select two curved notches on separate pattern pieces, then review every size.')
 const blocker=modarisGradedCurvedNotchPreflight20261027(project,{nativeMode,disabled,onApplyProject})
 const options=(project?.pieces??[]).flatMap(piece=>(piece.notches??[]).filter(n=>piece.curves?.[n.edgeIndex]).map(n=>({value:key({pieceId:piece.id,notchId:n.id}),label:`${piece.name||piece.id} / ${n.id} / edge ${n.edgeIndex+1}`})))
 const source=unpack(sourceId),target=unpack(targetId)
 const selected=source&&target&&source.pieceId!==target.pieceId
 const stamp=(()=>{try{return fingerprint(project)}catch{return ''}})()
 const selectionStamp=fingerprint([sourceId,targetId])
 const ready=Boolean(staged&&staged.stamp===stamp&&staged.selectionStamp===selectionStamp&&!blocker)
 const invalidate=()=>{setStaged(null);setConfirmed(false)}
 function inspect(){invalidate();if(blocker||!selected){setStatus(blocker||'Select source and target curved notches on separate pieces.');return}
  try{const outcome=prepareModarisGradedCurvedNotchStudy20261027(project,{source,target});setStaged({outcome,stamp,selectionStamp});setStatus(`Qualified ${outcome.proof.length} sizes. Review physical arclength stations before confirming.`)}
  catch(error){setStatus('Transfer refused: '+reason(error))}
 }
 function apply(){if(!ready||!confirmed)return
  try{const candidate=prepareModarisGradedCurvedNotchCommit20261027(project,staged.outcome,staged.stamp,{source,target});onApplyProject(candidate,'Reviewed qualified curved graded notch stations; patternmaker validation required before manufacturing.');invalidate();setStatus('Candidate submitted as one App Undo edit. No manufacturing approval.')}
  catch(error){invalidate();setStatus('Apply refused: '+reason(error))}
 }
 return <section aria-label="Modaris graded curved notch study" data-manufacturing-approved="false">
  <h3>Graded curved notch · physical arclength study</h3>
  <p>Qualified quadratic Bézier legacy geometry only. Per-size physical arclength station checks are required. Research preview; no manufacturing approval.</p>
  {blocker&&<p role="alert">{blocker}</p>}
  <fieldset disabled={Boolean(blocker)}><legend>Source and target quadratic notches</legend>
   <label>Source curved notch <select aria-label="Curved notch source" value={sourceId} onChange={e=>{setSourceId(e.target.value);invalidate()}}><option value="">Choose source</option>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
   <label>Target curved notch <select aria-label="Curved notch target" value={targetId} onChange={e=>{setTargetId(e.target.value);invalidate()}}><option value="">Choose target</option>{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
  </fieldset>
  <button type="button" disabled={Boolean(blocker)||!selected} onClick={inspect}>Stage physical graded notch diagnostics</button>
  {ready&&<div aria-label="Per-size physical arclength diagnostics"><strong>{staged.outcome.proof.length} graded sizes verified · no manufacturing approval</strong>
   <ul>{staged.outcome.proof.map(d=><li key={d.size}>Size {d.size}: source station {d.sourceStationCm.toFixed(6)} cm / {d.sourceEdgeCm.toFixed(6)} cm; target station {d.targetStationCm.toFixed(6)} cm / {d.targetEdgeCm.toFixed(6)} cm; normalized {d.normalizedStation.toFixed(9)}, target t {d.requiredTargetT.toFixed(9)}, inverse residual {d.residualCm.toExponential(3)} cm</li>)}</ul>
   <label><input aria-label="Confirm curved graded notch transfer" type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> I reviewed each size; this is reference geometry with no manufacturing approval.</label>
  </div>}
  {staged&&!ready&&<p role="alert">Project or selection changed after preview; inspect again.</p>}
  <button type="button" disabled={!ready||!confirmed} onClick={apply}>Confirm and apply graded curved notch · one Undo</button>
  <p role="status">{status}</p>
 </section>
}
