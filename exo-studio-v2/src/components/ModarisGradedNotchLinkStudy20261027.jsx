import React,{useState} from 'react'
import {createModarisGradedNotchLink20261027,reapplyModarisGradedNotchLink20261027} from '../core/modarisGradedNotchLink20261027.js'
import {assertFreshModarisGradedNotchLink20261027} from '../core/modarisGradedNotchLinkPersistence20261027.js'

const name=ref=>JSON.stringify([ref.pieceId,ref.notchId])
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
const FRACTION=/^(?:0?\.[0-9]+|0\.[0-9]*[1-9][0-9]*)$/
export function modarisGradedNotchLinkPreflight20261027(project,{nativeMode=false,disabled=false,onApplyProject}={}){
  if(nativeMode)return 'Native Rust grading does not support legacy linked notches.'
  if(disabled)return 'Linked notch editing is disabled.'
  if(typeof onApplyProject!=='function')return 'A project apply callback is required.'
  if(!project||!Number.isSafeInteger(project.revision)||project.revision<0||!Array.isArray(project.pieces)||project.pieces.length<2)
    return 'A revisioned two-piece legacy pattern is required.'
  if(project.units!=='cm'||!Array.isArray(project.grading?.sizes)||project.grading.sizes.length<2)
    return 'Legacy centimetre geometry and complete graded size metadata are required.'
  return ''
}
/** Prepare a complete deterministic preview and an App-compatible one-revision handoff. */
export function prepareModarisGradedNotchLinkStudy20261027(project,{source,target,newSourceFraction}={}){
  if(!project?.modarisGradedNotchLink){
    const result=createModarisGradedNotchLink20261027(project,{source,target,expectedRevision:project.revision})
    if(!result.project.modarisGradedNotchLink)throw Error('Notch dependency graph was not created')
    return result
  }
  assertFreshModarisGradedNotchLink20261027(project)
  const candidate=structuredClone(project),graph=candidate.modarisGradedNotchLink
  if(newSourceFraction!==undefined){
    if(typeof newSourceFraction!=='number'||!Number.isFinite(newSourceFraction)||newSourceFraction<=0||newSourceFraction>=1)
      throw Error('New source notch fraction must be strictly between 0 and 1')
    const piece=candidate.pieces.find(p=>p.id===graph.source.pieceId)
    const notch=piece?.notches?.find(n=>n.id===graph.source.notchId)
    if(!notch)throw Error('Linked source notch is missing')
    notch.t=newSourceFraction
  }
  return reapplyModarisGradedNotchLink20261027(candidate,{expectedRevision:project.revision})
}
/** Normal App onApplyProject increments revision; the core already supplied +1. */
export function prepareModarisGradedNotchCommit20261027(project,preview,sourceFingerprint,options){
  if(!preview?.project||sourceFingerprint!==JSON.stringify(project)||
    preview.project.revision!==project.revision+1)throw Error('Stale or invalid graded notch preview')
  const fresh=prepareModarisGradedNotchLinkStudy20261027(project,options)
  if(!eq(fresh.project,preview.project)||!eq(fresh.proof,preview.proof))throw Error('Graded notch source or preview changed')
  const next=structuredClone(fresh.project)
  next.revision=project.revision
  return next
}
export default function ModarisGradedNotchLinkStudy20261027({project,nativeMode=false,disabled=false,onApplyProject}){
  const [sourceId,setSourceId]=useState(''),[targetId,setTargetId]=useState('')
  const [newFraction,setNewFraction]=useState('')
  const [preview,setPreview]=useState(null)
  const [confirmed,setConfirmed]=useState(false)
  const [notice,setNotice]=useState('Choose two qualified graded notches and review all sizes before applying.')
  const graph=project?.modarisGradedNotchLink
  const blocker=modarisGradedNotchLinkPreflight20261027(project,{nativeMode,disabled,onApplyProject})
  const opts=(project?.pieces??[]).flatMap(piece=>(piece.notches??[]).map(notch=>({
    id:name({pieceId:piece.id,notchId:notch.id}),label:`${piece.name||piece.id} / ${notch.id} / edge ${notch.edgeIndex+1}`,
  })))
  const unpack=value=>{try{const [pieceId,notchId]=JSON.parse(value);return {pieceId,notchId}}catch{return null}}
  const fingerprint=(()=>{try{return JSON.stringify(project)}catch{return ''}})()
  const selections={source:unpack(sourceId),target:unpack(targetId),
    ...(graph?{newSourceFraction:newFraction.trim()===''?undefined:Number(newFraction)}:{})}
  const previewStale=Boolean(preview&&preview.sourceFingerprint!==fingerprint)
  const eligible=!blocker&&(graph||sourceId&&targetId&&sourceId!==targetId&&
    unpack(sourceId)?.pieceId!==unpack(targetId)?.pieceId)
  const invalidate=()=>{setPreview(null);setConfirmed(false)}
  const inspect=()=>{
    invalidate()
    if(!eligible){setNotice('Select distinct qualified graded notches and confirm legacy project access.');return}
    try{
      const outcome=prepareModarisGradedNotchLinkStudy20261027(project,selections)
      setPreview({outcome,sourceFingerprint:fingerprint,options:structuredClone(selections)})
      setNotice(`Reviewed ${outcome.proof.length} graded sizes. Physical notch fractions and source geometry passed the qualified link check.`)
    }catch(error){setNotice(`Graded notch link refused: ${error.message}`)}
  }
  const apply=()=>{
    if(!confirmed||!preview||previewStale||blocker||typeof onApplyProject!=='function')return
    try{
      const candidate=prepareModarisGradedNotchCommit20261027(project,preview.outcome,preview.sourceFingerprint,preview.options)
      onApplyProject(candidate,`Linked graded notch geometry across ${preview.outcome.proof.length} sizes. Recheck sewing, cutlines and factory marking before release.`)
      invalidate();setNotice('Verified graded-notch dependency submitted as one legacy project Undo edit. No factory approval granted.')
    }catch(error){invalidate();setNotice('Graded-notch commit refused: '+error.message)}
  }
  return <section aria-label="Modaris source-linked graded notch study" data-graded-notch-link-study="legacy-qualified" style={{display:'grid',gap:8}}>
    <h3>Source-linked graded notches · straight-edge research</h3>
    <p>Qualified legacy straight-edge notch fraction links across every graded size, with per-size physical arclength diagnostics. Not for sewn edges, curves, holes, cutline production or native Rust manufacturing.</p>
    {blocker&&<p role="alert">{blocker}</p>}
    <fieldset disabled={Boolean(blocker)||Boolean(graph)}><legend>Link source and destination</legend>
      <label>Source notch<select aria-label="Linked notch source" value={sourceId} onChange={e=>{setSourceId(e.target.value);invalidate()}}><option value="">Choose source</option>{opts.map(o=><option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
      <label>Target notch<select aria-label="Linked notch target" value={targetId} onChange={e=>{setTargetId(e.target.value);invalidate()}}><option value="">Choose target</option>{opts.map(o=><option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
    </fieldset>
    {graph&&<div><p>Stored source {graph.source.pieceId}/{graph.source.notchId} → target {graph.target.pieceId}/{graph.target.notchId}; last linked fraction {graph.lastTargetFraction}.</p>
      <label>Next source fractional notch position (0–1) <input aria-label="New linked source notch fraction" type="number" min="0.0001" max="0.9999" step="0.01" value={newFraction} onChange={e=>{setNewFraction(e.target.value);invalidate()}} placeholder="Keep current when blank"/></label>
      <p>Reapplication is explicit and source-verified. Save/reopen rejects unacknowledged root or target changes.</p></div>}
    <button type="button" disabled={!eligible} onClick={inspect}>Preview verified linked notch sizes</button>
    {preview&&!previewStale&&<div aria-label="Graded notch link diagnostics">
      <strong>{preview.outcome.proof.length} sizes reviewed · no manufacturing approval</strong>
      <ul>{preview.outcome.proof.map(size=><li key={size.size}>Size {size.size}: source {size.sourceArcCm.toFixed(3)} cm / target {size.targetArcCm.toFixed(3)} cm; fraction residual {size.fractionResidual.toExponential(2)}; precision {size.precisionCm.toFixed(6)} cm</li>)}</ul>
      <label><input type="checkbox" aria-label="Confirm applying graded notch link" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> Confirm this complete size run is qualified reference geometry only</label>
    </div>}
    {previewStale&&<p role="alert">Source changed after notch preview. Review again before committing.</p>}
    <button type="button" disabled={!preview||previewStale||!confirmed||Boolean(blocker)} onClick={apply}>Apply verified graded notch link · one Undo</button>
    <p role="status">{notice}</p>
  </section>
}
