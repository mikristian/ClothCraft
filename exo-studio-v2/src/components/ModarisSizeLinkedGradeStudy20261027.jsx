import React, { useState } from 'react'
import { createModarisSizeLinkedGrade, reapplyModarisSizeLinkedGrade, buildModarisSizeLinkedGradeRun } from '../core/modarisSizeLinkedGrade20261027.js'

const refKey = ref => JSON.stringify([ref.pieceId, ref.pointIndex])
const fingerprint = project => JSON.stringify(project)

/** Advisory gating. The pure core APIs remain the authoritative validators. */
export function modarisSizeLinkedGradeStudyPreflight(project, { nativeMode=false, disabled=false, onApplyProject }={}) {
  if (nativeMode) return 'Native grading is unavailable in this legacy linked-grade study.'
  if (disabled) return 'Linked-grade study is disabled.'
  if (typeof onApplyProject !== 'function') return 'A project apply callback is required to commit.'
  if (!project || !Array.isArray(project.pieces) || !project.pieces.length) return 'A legacy project with pattern pieces is required.'
  const sizes=project.grading?.sizes,base=project.grading?.baseSize
  if (!Array.isArray(sizes) || sizes.length<2 || sizes.length>64 || sizes.some(s=>typeof s!=='string'||!s.trim()||s.trim()!==s) || new Set(sizes).size!==sizes.length || !sizes.includes(base)) return 'The ordered size set and base size are invalid.'
  if (project.units && project.units!=='cm') return 'Only centimetre legacy geometry is supported.'
  return ''
}

export function prepareModarisSizeLinkedGradeStudy(project, links) {
  const outcome=project?.modarisSizeLinkedGrade
    ? reapplyModarisSizeLinkedGrade(project)
    : createModarisSizeLinkedGrade(project,links)
  const preview=buildModarisSizeLinkedGradeRun(outcome.project)
  const sizes=outcome.validation.sizes
  return {project:outcome.project,validation:outcome.validation,run:preview.run,
    diagnostics:sizes.map(size=>({size,pieces:preview.run[size].pieces.map(piece=>({id:piece.id,pointCount:piece.points.length,curveCount:Object.keys(piece.curves??{}).length}))}))}
}

export default function ModarisSizeLinkedGradeStudy20261027({project,onApplyProject,nativeMode=false,disabled=false}) {
  const [source,setSource]=useState('')
  const [target,setTarget]=useState('')
  const [axis,setAxis]=useState('both')
  const [curves,setCurves]=useState(false)
  const [links,setLinks]=useState([])
  const [preview,setPreview]=useState(null)
  const [status,setStatus]=useState('Choose source and target points, then dry-run grading.')
  const [selectedSize,setSelectedSize]=useState('')
  const [confirmed,setConfirmed]=useState(false)
  const preflight=modarisSizeLinkedGradeStudyPreflight(project,{nativeMode,disabled,onApplyProject})
  const graphExists=Boolean(project?.modarisSizeLinkedGrade)
  const points=(project?.pieces??[]).flatMap(piece=>(piece?.points??[]).map((point,index)=>({ref:{pieceId:piece.id,pointIndex:index},label:`${piece.name||piece.id} / point ${index+1}${point.id?` (${point.id})`:''}`,ready:Boolean(point.industrialGradeRule)})))
  const resolve=encoded=>points.find(point=>refKey(point.ref)===encoded)
  const canAdd=!preflight&&!graphExists&&source&&target&&source!==target&&resolve(source)?.ready&&resolve(target)?.ready
  const currentFingerprint=fingerprint(project)
  const stale=Boolean(preview&&preview.fingerprint!==currentFingerprint)
  const invalidate=()=>{setPreview(null);setConfirmed(false)}
  const add=()=>{
    if(!canAdd)return
    const candidate={source:resolve(source).ref,target:resolve(target).ref,axis,curves:axis==='both'&&curves}
    if(links.some(link=>refKey(link.target)===target)){setStatus('Target already linked. Remove the existing link first.');return}
    setLinks(previous=>[...previous,candidate]);invalidate();setStatus('Link queued. Dry-run required before commit.')
  }
  const dryRun=()=>{
    if(preflight)return
    try {
      const result=prepareModarisSizeLinkedGradeStudy(project,links)
      setPreview({...result,fingerprint:currentFingerprint,linkFingerprint:JSON.stringify(links)})
      setSelectedSize(result.validation.baseSize)
      setConfirmed(false)
      setStatus(`Dry-run successful: ${result.validation.sizes.length} sizes and ${result.validation.links} links validated. Review and explicitly confirm before applying.`)
    } catch(error) {setPreview(null);setConfirmed(false);setStatus(`Dry-run refused: ${error.message}`)}
  }
  const commit=()=>{
    if(preflight||!preview||stale||!confirmed||preview.linkFingerprint!==JSON.stringify(links))return
    try {
      // Re-run against the current props immediately before callback; no stale preview can commit.
      const fresh=prepareModarisSizeLinkedGradeStudy(project,links)
      if(fingerprint(project)!==preview.fingerprint||fingerprint(fresh.project)!==fingerprint(preview.project))throw new Error('Preview changed; run grading again')
      onApplyProject(fresh.project)
      setPreview(null);setConfirmed(false);setStatus('Validated linked grade project sent to the supplied apply callback.')
    }catch(error){setPreview(null);setConfirmed(false);setStatus(`Commit refused: ${error.message}`)}
  }
  const size=preview?.diagnostics.find(item=>item.size===(selectedSize||preview.validation.baseSize))
  return <section aria-label="Modaris linked multi-size grading study" data-grade-study="legacy-reference" style={{display:'grid',gap:10}}>
    <h3>Source-linked multi-size grading · legacy research</h3>
    <p>Explicit industrial grading rules across legacy polygon pieces in cm. Source break vectors drive linked target point rules; optional quadratic curve controls require matching edge topology. This does not certify fit, sewability, cutting, production export, or factory approval.</p>
    <p>Size line: {Array.isArray(project?.grading?.sizes)?project.grading.sizes.join(' · '):'unavailable'}; base: {project?.grading?.baseSize||'unavailable'}; links stored: {project?.modarisSizeLinkedGrade?.links?.length??0}.</p>
    {preflight&&<p role="alert">{preflight}</p>}
    <fieldset disabled={Boolean(preflight)||graphExists} style={{display:'grid',gap:8}}><legend>Queue source-linked point rules</legend>
      <label>Source point <select aria-label="Source grading point" value={source} onChange={e=>{setSource(e.target.value);invalidate()}}><option value="">Choose source</option>{points.map(p=><option key={refKey(p.ref)} value={refKey(p.ref)} disabled={!p.ready}>{p.label}{p.ready?'':' · explicit rule required'}</option>)}</select></label>
      <label>Target point <select aria-label="Target grading point" value={target} onChange={e=>{setTarget(e.target.value);invalidate()}}><option value="">Choose target</option>{points.map(p=><option key={refKey(p.ref)} value={refKey(p.ref)} disabled={!p.ready}>{p.label}{p.ready?'':' · explicit rule required'}</option>)}</select></label>
      <label>Transfer axes <select aria-label="Transfer axes" value={axis} onChange={e=>{setAxis(e.target.value);setCurves(false);invalidate()}}><option value="both">X and Y</option><option value="x">X only</option><option value="y">Y only</option></select></label>
      <label><input aria-label="Link quadratic curves" type="checkbox" checked={curves} disabled={axis!=='both'} onChange={e=>{setCurves(e.target.checked);invalidate()}}/> Link matching quadratic controls</label>
      <button type="button" disabled={!canAdd} onClick={add}>Add grade link</button>
    </fieldset>
    {graphExists?<p>Existing versioned link graph detected. Use dry-run to validate and reapply its stored links. Editing links in this study is disabled.</p>:<div aria-label="Queued grade links">{links.length?links.map((link,index)=><div key={index}>{link.source.pieceId} #{link.source.pointIndex+1} → {link.target.pieceId} #{link.target.pointIndex+1} ({link.axis}{link.curves?', curves':''}) <button type="button" disabled={Boolean(preflight)} onClick={()=>{setLinks(old=>old.filter((_,i)=>i!==index));invalidate()}}>Remove link {index+1}</button></div>):<p>No links queued.</p>}</div>}
    <button type="button" disabled={Boolean(preflight)||(!graphExists&&!links.length)} onClick={dryRun}>Dry-run all grading sizes</button>
    {preview&&!stale&&<div aria-label="Grading dry-run diagnostics"><strong>Validated dry-run · {preview.validation.units} · factory approved: no</strong><p>{preview.validation.links} linked rules; {preview.validation.sizes.length} sizes; base {preview.validation.baseSize}.</p>
      <label>Inspect graded size <select aria-label="Inspect graded size" value={selectedSize} onChange={e=>setSelectedSize(e.target.value)}>{preview.validation.sizes.map(s=><option key={s} value={s}>{s}</option>)}</select></label>
      <ul>{size?.pieces.map(piece=><li key={piece.id}>{piece.id}: {piece.pointCount} points, {piece.curveCount} curve controls</li>)}</ul>
      <label><input type="checkbox" aria-label="Confirm applying linked grade" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> I reviewed the size run and understand this is an uncertified research operation.</label>
    </div>}
    {stale&&<p role="alert">The legacy project changed after the preview. Dry-run again before applying.</p>}
    <button type="button" disabled={Boolean(preflight)||!preview||stale||!confirmed||preview.linkFingerprint!==JSON.stringify(links)} onClick={commit}>Apply validated grading project</button>
    <p role="status">{status}</p>
  </section>
}
