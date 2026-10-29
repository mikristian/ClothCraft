import React, {useState} from 'react'
import {edgeLength} from '../core/project.js'
import {previewModarisCurvedSeamTrueing20261027 as solve} from '../core/modarisCurvedSeamTrueing20261027.js'

const ref=(pieceId,edgeIndex)=>({pieceId,edgeIndex})
const fingerprint=project=>JSON.stringify(project)
const numeric=value=>typeof value==='number'&&Number.isFinite(value)
const opts=(selection,revision)=>({
 source:ref(selection.sourcePieceId,selection.sourceEdge),
 target:ref(selection.targetPieceId,selection.targetEdge),
 easeCm:selection.easeCm,expectedRevision:revision,
})

/** App's normal onApplyProject path increases the incoming revision once.
 * Recompute from unchanged source and hand off the validated candidate
 * with source revision so the normal mutation lands at revision +1.
 */
export function prepareModarisCurvedSeamTrueingApply20261027(project,preview,sourceFingerprint){
 if(!preview?.changed||!preview.candidate||typeof sourceFingerprint!=='string'||fingerprint(project)!==sourceFingerprint||
    preview.originalRevision!==project?.revision||preview.candidateRevision!==project.revision+1)
   throw Error('STALE_CURVED_PREVIEW')
 const checked=solve(project,{
   source:preview.source,target:preview.target,easeCm:preview.requestedEaseCm,
   expectedRevision:project.revision,
 })
 if(!checked.changed||fingerprint(checked.candidate)!==fingerprint(preview.candidate))throw Error('CURVED_PREVIEW_MISMATCH')
 const handoff=structuredClone(checked.candidate)
 handoff.revision=project.revision
 return handoff
}

export function modarisCurvedSeamPreflight20261027(project,{
 nativeMode=false,disabled=false,onApplyProject,sourcePieceId,targetPieceId,sourceEdge,targetEdge,easeCm,
}={}){
 if(nativeMode)return 'Native projects cannot use this legacy curved seam study.'
 if(disabled)return 'Curved seam study is disabled.'
 if(typeof onApplyProject!=='function')return 'Project apply callback is required.'
 if(!project||!Number.isSafeInteger(project.revision)||!Array.isArray(project.pieces))return 'Revisioned legacy pattern project required.'
 if(['grading','seams','cutlines','markers','notches','productionSpec'].some(key=>Object.hasOwn(project,key)))return 'Grading, sewn edges, cutlines and marks are unsupported.'
 if(!sourcePieceId||!targetPieceId||sourcePieceId===targetPieceId)return 'Select two different curved pieces.'
 const source=project.pieces.find(p=>p.id===sourcePieceId),target=project.pieces.find(p=>p.id===targetPieceId)
 if(!source||!target)return 'Selected pieces are missing.'
 if(!Number.isInteger(sourceEdge)||!Number.isInteger(targetEdge)||!source.curves?.[sourceEdge]||!target.curves?.[targetEdge])return 'Select existing quadratic source and target edges.'
 if(!numeric(easeCm)||Math.abs(easeCm)>10)return 'Signed ease must be within ±10 cm.'
 try{solve(project,opts({sourcePieceId,targetPieceId,sourceEdge,targetEdge,easeCm},project.revision))}
 catch(error){return error.message}
 return ''
}

export default function ModarisCurvedSeamTrueingStudy20261027({project,nativeMode=false,disabled=false,onApplyProject}){
 const [sourcePieceId,setSourcePieceId]=useState('')
 const [targetPieceId,setTargetPieceId]=useState('')
 const [sourceEdge,setSourceEdge]=useState(0)
 const [targetEdge,setTargetEdge]=useState(0)
 const [ease,setEase]=useState('0')
 const [staged,setStaged]=useState(null)
 const [status,setStatus]=useState('Select two curved edges and inspect a candidate.')
 const pieces=Array.isArray(project?.pieces)?project.pieces:[]
 const source=pieces.find(p=>p.id===sourcePieceId),target=pieces.find(p=>p.id===targetPieceId)
 const easeCm=ease.trim()===''?NaN:Number(ease)
 const selection={sourcePieceId,targetPieceId,sourceEdge,targetEdge,easeCm}
 const blocker=modarisCurvedSeamPreflight20261027(project,{...selection,nativeMode,disabled,onApplyProject})
 const stamp=(()=>{try{return fingerprint(project)}catch{return null}})()
 const selectionKey=JSON.stringify(selection)
 const ready=Boolean(staged?.outcome.changed&&!blocker&&stamp&&staged.sourceFingerprint===stamp&&staged.selectionKey===selectionKey)
 const selectEdges=piece=>Object.keys(piece?.curves??{}).filter(k=>/^(0|[1-9]\d*)$/.test(k)&&Number(k)<piece.points?.length).map(key=>{
   const index=Number(key)
   let length='invalid'
   try{length=edgeLength(piece,index).toFixed(6)+' cm'}catch{}
   return <option key={key} value={key}>{piece.edgeNames?.[index]||'Edge '+(index+1)} · {length}</option>
 })
 function inspect(){
   if(blocker){setStaged(null);setStatus(blocker);return}
   try{
     const outcome=solve(project,opts(selection,project.revision))
     setStaged({outcome,sourceFingerprint:stamp,selectionKey})
     setStatus(outcome.changed?'Candidate staged. Inspect the length and tangent diagnostics before confirming.':'No curve change required.')
   }catch(error){setStaged(null);setStatus(error.message)}
 }
 function confirm(){
   if(!ready){setStatus('Source changed or preview expired. Inspect again.');return}
   try{
     const handoff=prepareModarisCurvedSeamTrueingApply20261027(project,staged.outcome,staged.sourceFingerprint)
     onApplyProject(handoff,'Reviewed curved seam trueing, pending patternmaker verification.')
     setStaged(null)
     setStatus('Reviewed curved seam candidate submitted for application.')
   }catch(error){setStaged(null);setStatus('Refused: '+error.message)}
 }
 function changePiece(side,value){
   if(side==='source'){setSourcePieceId(value);setSourceEdge(Number(Object.keys(pieces.find(p=>p.id===value)?.curves??{})[0]??0))}
   else {setTargetPieceId(value);setTargetEdge(Number(Object.keys(pieces.find(p=>p.id===value)?.curves??{})[0]??0))}
   setStaged(null)
 }
 const current=source?.curves?.[sourceEdge]&&target?.curves?.[targetEdge]
 return <section aria-label="Modaris curved seam trueing study" data-production-approved="false">
   <h3>Curved seam trueing · qualified quadratic study</h3>
   <p>Legacy centimetre geometry only. Signed ease is target minus source. Endpoints stay fixed; endpoint tangent angles may drift by at most 12°. Patternmaker review required.</p>
   <fieldset disabled={nativeMode||disabled}>
     <legend>Curved seam selection</legend>
     <label>Source piece <select aria-label="Curved source piece" value={sourcePieceId} onChange={e=>changePiece('source',e.target.value)}><option value="">Choose source</option>{pieces.map(p=><option key={p.id} value={p.id}>{p.name||p.id}</option>)}</select></label>
     <label>Source edge <select aria-label="Curved source edge" value={sourceEdge} onChange={e=>{setSourceEdge(Number(e.target.value));setStaged(null)}}>{selectEdges(source)}</select></label>
     <label>Target piece <select aria-label="Curved target piece" value={targetPieceId} onChange={e=>changePiece('target',e.target.value)}><option value="">Choose target</option>{pieces.map(p=><option key={p.id} value={p.id}>{p.name||p.id}</option>)}</select></label>
     <label>Target edge <select aria-label="Curved target edge" value={targetEdge} onChange={e=>{setTargetEdge(Number(e.target.value));setStaged(null)}}>{selectEdges(target)}</select></label>
     <label>Signed ease (cm) <input aria-label="Curved signed ease cm" type="number" step="0.001" min="-10" max="10" value={ease} onChange={e=>{setEase(e.target.value);setStaged(null)}}/></label>
   </fieldset>
   {current&&<p aria-label="Current curved seam measurements">Source length: {edgeLength(source,sourceEdge).toFixed(6)} cm · Target length: {edgeLength(target,targetEdge).toFixed(6)} cm · Actual ease: {(edgeLength(target,targetEdge)-edgeLength(source,sourceEdge)).toFixed(6)} cm</p>}
   {blocker&&<p role="alert">{blocker}</p>}
   <button type="button" disabled={Boolean(blocker)} onClick={inspect}>Stage curved seam preview</button>
   {staged&&<div aria-label="Staged curved seam diagnostics">
     <p>Source: {staged.outcome.sourceLengthCm.toFixed(6)} cm · Target before: {staged.outcome.previousTargetLengthCm.toFixed(6)} cm · Target proposed: {staged.outcome.targetLengthCm.toFixed(6)} cm</p>
     <p>Requested ease: {staged.outcome.requestedEaseCm.toFixed(6)} cm · Measured ease: {staged.outcome.measuredEaseCm.toFixed(6)} cm · Residual: {staged.outcome.residualCm.toExponential(3)} cm</p>
     <p>Start tangent drift: {staged.outcome.startTangentDriftDeg.toFixed(4)}° · End tangent drift: {staged.outcome.endTangentDriftDeg.toFixed(4)}° · Candidate revision: {staged.outcome.candidateRevision}</p>
   </div>}
   <button type="button" disabled={!ready} onClick={confirm}>Confirm and apply curved seam correction</button>
   <p role="status">{status}</p>
 </section>
}
