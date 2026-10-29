import React, {useState} from 'react'
import {previewModarisSeamTrueing20261027} from '../core/modarisSeamTrueing20261027.js'

const finite=n=>typeof n==='number'&&Number.isFinite(n)
const edgeLength=(piece,index)=>{
 const a=piece.points[index],b=piece.points[(index+1)%piece.points.length]
 return Math.hypot(b.x-a.x,b.y-a.y)
}
/** Normal App mutateProject increments the original revision once. */
export function prepareModarisSeamTrueingApply20261027(project,preview,sourceFingerprint){
 if(!project||!preview?.changed||!preview.candidate||typeof sourceFingerprint!=='string'||
   JSON.stringify(project)!==sourceFingerprint||preview.originalRevision!==project.revision||
   preview.candidateRevision!==project.revision+1)throw Error('Stale or unchanged trueing preview')
 const candidate=previewModarisSeamTrueing20261027(project,{
   source:preview.source,target:preview.target,easeCm:preview.requestedEaseCm,expectedRevision:project.revision,
 })
 if(JSON.stringify(candidate.candidate)!==JSON.stringify(preview.candidate))throw Error('Preview geometry no longer matches')
 const applied=structuredClone(candidate.candidate)
 applied.revision=project.revision
 return applied
}
export function modarisSeamTrueingPreflight20261027(project,{nativeMode=false,disabled=false,onApplyProject,sourcePieceId,targetPieceId,sourceEdge,targetEdge,easeCm}={}){
 if(nativeMode)return 'Native mode is unsupported; choose a legacy 2D project.'
 if(disabled)return 'Seam trueing is disabled.'
 if(typeof onApplyProject!=='function')return 'An apply callback is required for explicit confirmation.'
 if(!project||!Number.isSafeInteger(project.revision)||project.revision<0||!Array.isArray(project.pieces))return 'A revisioned legacy project is required.'
 if(sourcePieceId===targetPieceId||!project.pieces.some(p=>p.id===sourcePieceId)||!project.pieces.some(p=>p.id===targetPieceId))return 'Choose different existing source and target pieces.'
 const source=project.pieces.find(p=>p.id===sourcePieceId),target=project.pieces.find(p=>p.id===targetPieceId)
 if(!Number.isSafeInteger(sourceEdge)||sourceEdge<0||sourceEdge>=source.points?.length||!Number.isSafeInteger(targetEdge)||targetEdge<0||targetEdge>=target.points?.length)return 'Choose valid source and target edges.'
 if(!finite(easeCm)||Math.abs(easeCm)>10)return 'Ease must be between -10 and 10 cm.'
 try{previewModarisSeamTrueing20261027(project,{source:{pieceId:sourcePieceId,edgeIndex:sourceEdge},target:{pieceId:targetPieceId,edgeIndex:targetEdge},easeCm,expectedRevision:project.revision})}
 catch(error){return error.message}
 return ''
}
export default function ModarisSeamTrueingStudy20261027({project,nativeMode=false,disabled=false,onApplyProject}){
 const [sourcePieceId,setSourcePieceId]=useState('')
 const [targetPieceId,setTargetPieceId]=useState('')
 const [sourceEdge,setSourceEdge]=useState(0)
 const [targetEdge,setTargetEdge]=useState(0)
 const [ease,setEase]=useState('0')
 const [preview,setPreview]=useState(null)
 const [fingerprint,setFingerprint]=useState('')
 const [status,setStatus]=useState('Choose two legacy pattern edges to inspect.')
 const pieces=Array.isArray(project?.pieces)?project.pieces:[]
 const source=pieces.find(p=>p.id===sourcePieceId),target=pieces.find(p=>p.id===targetPieceId)
 const easeCm=ease.trim()?Number(ease):NaN
 const config={sourcePieceId,targetPieceId,sourceEdge,targetEdge,easeCm,nativeMode,disabled,onApplyProject}
 const blocker=modarisSeamTrueingPreflight20261027(project,config)
 const sourceRef={pieceId:sourcePieceId,edgeIndex:sourceEdge}
 const targetRef={pieceId:targetPieceId,edgeIndex:targetEdge}
 const currentFingerprint=JSON.stringify(project)
 const ready=Boolean(preview&&preview.changed&&fingerprint===currentFingerprint&&!blocker&&typeof onApplyProject==='function')
 function inspect(){
  if(blocker){setPreview(null);setStatus(blocker);return}
  try{
   const outcome=previewModarisSeamTrueing20261027(project,{source:sourceRef,target:targetRef,easeCm,expectedRevision:project.revision})
   setPreview(outcome);setFingerprint(currentFingerprint)
   setStatus(outcome.changed?'Candidate ready for explicit review and confirmation.':'Lengths already match within tolerance; no edit is needed.')
  }catch(error){setPreview(null);setStatus(error.message)}
 }
 function apply(){
  if(!ready){setStatus('Preview is stale or cannot be applied. Inspect again.');return}
  try{
   const candidate=prepareModarisSeamTrueingApply20261027(project,preview,fingerprint)
   onApplyProject(candidate,'Applied reviewed legacy straight seam trueing; grading and sewing QA remain required.')
   setPreview(null);setStatus('Trueing candidate passed to project apply callback.')
  }catch(error){setPreview(null);setStatus('Trueing rejected: '+error.message)}
 }
 const optionsFor=(piece)=>(Array.isArray(piece?.points)?piece.points:[]).map((p,index)=>{
  const label=piece.edgeNames?.[index]||'Edge '+(index+1)
  return <option value={index} key={index}>{label} · {edgeLength(piece,index).toFixed(3)} cm</option>
 })
 return <section aria-label="Modaris seam trueing study" data-production-approved="false">
  <h3>Straight seam trueing · legacy 2D</h3>
  <p>Engineering preview for unsewn straight edges only. Does not certify curved seams, notches, grades, assembly or manufacturing.</p>
  <fieldset disabled={disabled||nativeMode}>
   <legend>Seam selection</legend>
   <label>Source piece <select aria-label="Trueing source piece" value={sourcePieceId} onChange={e=>{setSourcePieceId(e.target.value);setSourceEdge(0);setPreview(null)}}><option value="">Choose source</option>{pieces.map(p=><option key={p.id} value={p.id}>{p.name||p.id}</option>)}</select></label>
   <label>Source edge <select aria-label="Trueing source edge" value={sourceEdge} onChange={e=>{setSourceEdge(Number(e.target.value));setPreview(null)}}>{optionsFor(source)}</select></label>
   <label>Target piece <select aria-label="Trueing target piece" value={targetPieceId} onChange={e=>{setTargetPieceId(e.target.value);setTargetEdge(0);setPreview(null)}}><option value="">Choose target</option>{pieces.map(p=><option key={p.id} value={p.id}>{p.name||p.id}</option>)}</select></label>
   <label>Target edge <select aria-label="Trueing target edge" value={targetEdge} onChange={e=>{setTargetEdge(Number(e.target.value));setPreview(null)}}>{optionsFor(target)}</select></label>
   <label>Ease (cm) <input aria-label="Trueing ease cm" type="number" step="0.01" value={ease} onChange={e=>{setEase(e.target.value);setPreview(null)}}/></label>
  </fieldset>
  {source&&target&&sourceEdge<source.points?.length&&targetEdge<target.points?.length&&<p aria-label="Current seam lengths">Source: {edgeLength(source,sourceEdge).toFixed(3)} cm · Target: {edgeLength(target,targetEdge).toFixed(3)} cm · Current ease: {(edgeLength(target,targetEdge)-edgeLength(source,sourceEdge)).toFixed(3)} cm</p>}
  {blocker&&<p role="alert">{blocker}</p>}
  <button type="button" disabled={Boolean(blocker)} onClick={inspect}>Inspect and preview seam correction</button>
  {preview&&<div aria-label="Seam correction preview"><p>Source {preview.sourceLengthCm.toFixed(3)} cm · Target before {preview.previousTargetLengthCm.toFixed(3)} cm · Target proposed {preview.targetLengthCm.toFixed(3)} cm · Resulting ease {preview.measuredEaseCm.toFixed(3)} cm</p><p>Proposed revision {preview.candidateRevision}; endpoint and adjacent edge adjusted. Review polygon geometry before confirming.</p></div>}
  <button type="button" disabled={!ready} onClick={apply}>Confirm and apply reviewed seam correction</button>
  <p role="status">{status}</p>
 </section>
}
