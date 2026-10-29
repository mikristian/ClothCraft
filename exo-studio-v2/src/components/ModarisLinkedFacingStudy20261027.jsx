import React, { useState } from 'react'
import { createAccuMarkLinkedFacing20261027, updateAccuMarkLinkedFacing20261027 } from '../core/accumarkLinkedFacing20261027.js'

const idPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/

/** Read-only preflight: backend is the final authority on supported attachments and contour validity. */
export function modarisLinkedFacingPreflight(project, { nativeMode = false, disabled = false, sourcePieceId, facingId, facingName, depthCm } = {}) {
  if (nativeMode) return 'The linked facing study requires legacy 2D project geometry; native Rust projects are unsupported.'
  if (disabled) return 'Linked facing studies are disabled.'
  if (!project || !Number.isSafeInteger(project.revision) || project.revision < 0 || !Array.isArray(project.pieces)) return 'A revisioned legacy project is required.'
  if (!idPattern.test(sourcePieceId || '') || !project.pieces.some(p => p?.id === sourcePieceId)) return 'Choose an existing source piece.'
  if (!idPattern.test(facingId || '') || project.pieces.some(p => p?.id === facingId)) return 'Choose a unique engineering facing ID.'
  if (typeof facingName !== 'string' || !facingName.trim() || facingName.length > 140) return 'Enter a facing study name.'
  if (typeof depthCm !== 'number' || !Number.isFinite(depthCm) || depthCm <= 0 || depthCm > 30) return 'Enter a displacement greater than 0 and at most 30 cm.'
  return ''
}

const pointLabel = p => `${p.x.toFixed(3)}, ${p.y.toFixed(3)} cm`

export default function ModarisLinkedFacingStudy20261027({ project, nativeMode = false, disabled = false }) {
  const pieces = Array.isArray(project?.pieces) ? project.pieces : []
  const [sourcePieceId, setSourcePieceId] = useState('')
  const [facingId, setFacingId] = useState('facing-study')
  const [facingName, setFacingName] = useState('Facing geometry study')
  const [depthCm, setDepthCm] = useState('1.5')
  const [study, setStudy] = useState(null)
  const [offsetPreview,setOffsetPreview]=useState(null)
  const [offsetRefusal,setOffsetRefusal]=useState(null)
  const [status, setStatus] = useState('No linked facing study generated.')
  const [lastOutcome, setLastOutcome] = useState(null)
  const options = { sourcePieceId, facingId, facingName, depthCm: Number(depthCm) }
  const preflight = modarisLinkedFacingPreflight(project, { ...options, nativeMode, disabled })
  const source = pieces.find(p => p?.id === sourcePieceId)
  const revision = project?.revision
  const linkedSource = study?.provenance?.sourcePieceId
  const linkedPiece = pieces.find(p => p?.id === linkedSource)
  const revisionMismatch = Boolean(study && revision !== study.provenance.sourceRevision)
  const create = () => {
    if (preflight) { setStatus(preflight); return }
    try {
      const created = createAccuMarkLinkedFacing20261027(project, options)
      setStudy(created.study)
      setOffsetPreview(created.offsetPreview)
      setOffsetRefusal(created.offsetRefusal)
      setLastOutcome({ kind:'created', sourceChanged:false, revisionAdvanced:false })
      setStatus(`Engineering reference created from revision ${created.provenance.sourceRevision}. Detached from production inventory.`)
    } catch (error) { setStatus(`Study rejected: ${error.message}`) }
  }
  const regenerate = () => {
    if (!study || disabled || nativeMode) return
    try {
      // Explicitly require the displayed revision and observed project revision to match.
      const updated = updateAccuMarkLinkedFacing20261027(project,study,{expectedSourceRevision:revision})
      setStudy(updated.study)
      setOffsetPreview(updated.offsetPreview)
      setOffsetRefusal(updated.offsetRefusal)
      setLastOutcome({kind:'regenerated',sourceChanged:updated.sourceChanged,revisionAdvanced:updated.revisionAdvanced})
      setStatus(updated.sourceChanged ? 'Source geometry or metadata changed; detached facing geometry regenerated.' : updated.revisionAdvanced ? 'Source revision advanced; geometry and metadata unchanged.' : 'Source geometry and metadata unchanged. Regeneration verified.')
    } catch (error) { setLastOutcome({kind:'rejected'});setStatus(`Regeneration rejected: ${error.message}`) }
  }
  const curvePath=source?.points?.length>=3?source.points.map((p,index)=>{
    const target=source.points[(index+1)%source.points.length]
    const c=source.curves?.[index]
    return index===0?`M ${p.x} ${p.y} ${c?`Q ${c.cx} ${c.cy} ${target.x} ${target.y}`:`L ${target.x} ${target.y}`}`:
      c?`Q ${c.cx} ${c.cy} ${target.x} ${target.y}`:`L ${target.x} ${target.y}`
  }).join(' ')+' Z':''
  const drawingPoints=[...(source?.points||[]),...Object.values(source?.curves||{})
    .filter(c=>c&&Number.isFinite(c.cx)&&Number.isFinite(c.cy))
    .map(c=>({x:c.cx,y:c.cy})),...(offsetPreview?.points||[])]
  const xCoords=drawingPoints.map(p=>p.x),yCoords=drawingPoints.map(p=>p.y)
  const xmin=xCoords.length?Math.min(...xCoords)-1:0
  const ymin=yCoords.length?Math.min(...yCoords)-1:0
  const w=xCoords.length?Math.max(...xCoords)-xmin+1:10
  const h=yCoords.length?Math.max(...yCoords)-ymin+1:10
  return <section aria-label="Modaris linked facing engineering study" data-linked-facing-reference-only="true" style={{display:'grid',gap:10}}>
    <h3>Linked facing · engineering reference</h3>
    <p>Legacy 2D outline study in centimetres. The detached engineering piece uses fixed negative-Y displacement and is not a normal-offset facing. A separate conservatively sampled inward-normal outline preview is shown only when geometric validity checks pass; this is not analytic offset geometry.</p>
    <p>Reference only. No production cut piece, seam allowance, sewing relationship, graded sizes, factory approval, or manufacturing export is created.</p>
    <fieldset disabled={nativeMode || disabled} style={{display:'grid',gap:8}}><legend>Study source and displacement</legend>
      <label>Source pattern piece <select aria-label="Source pattern piece" value={sourcePieceId} onChange={e=>setSourcePieceId(e.target.value)}>
        <option value="">Choose a legacy source piece</option>
        {pieces.filter(p=>typeof p?.id==='string').map(p=><option key={p.id} value={p.id}>{p.name || p.id}</option>)}
      </select></label>
      <label>Facing study ID <input aria-label="Facing study ID" value={facingId} onChange={e=>setFacingId(e.target.value)}/></label>
      <label>Facing study name <input aria-label="Facing study name" value={facingName} onChange={e=>setFacingName(e.target.value)}/></label>
      <label>Displacement (cm) <input aria-label="Facing displacement cm" type="number" min="0.001" max="30" step="0.1" value={depthCm} onChange={e=>setDepthCm(e.target.value)}/></label>
    </fieldset>
    {source && <div aria-label="Live legacy source geometry" data-source-revision={revision}>
      <strong>Live source: {source.name || source.id}</strong>
      <p>Source ID: {source.id} · revision {revision} · vertices {Array.isArray(source.points) ? source.points.length : 'invalid'} · quadratic controls {Object.keys(source.curves || {}).length} · fabric {source.fabricId || 'unspecified'}</p>
      <ol>{(Array.isArray(source.points)?source.points:[]).filter(p=>p && Number.isFinite(p.x) && Number.isFinite(p.y)).slice(0,128).map((p,i)=><li key={i}>Point {i+1}: {pointLabel(p)}</li>)}</ol>
      {Object.entries(source.curves || {}).slice(0,128).filter(([,control])=>control && Number.isFinite(control.cx) && Number.isFinite(control.cy)).map(([edge,control])=><p key={edge}>Quadratic edge {Number(edge)+1}: {pointLabel({x:control.cx,y:control.cy})}</p>)}
    </div>}
    {preflight && <p role="alert">{preflight}</p>}
    <button type="button" disabled={Boolean(preflight)} onClick={create}>Create detached linked facing study</button>
    <button type="button" disabled={!study || disabled || nativeMode} onClick={regenerate}>Regenerate from current legacy source</button>
    {study && <div aria-label="Detached linked facing outcome" data-study-source-revision={study.provenance.sourceRevision} data-source-changed={lastOutcome?.sourceChanged === true ? 'true' : 'false'}>
      <strong>Detached study: {study.piece.name}</strong>
      <p>Linked source: {linkedSource} ({linkedPiece?.name || 'source missing'}) · captured revision {study.provenance.sourceRevision} · current revision {revision}</p>
      <p>Source hash: {study.provenance.sourceGeometryHash} · metadata hash: {study.provenance.sourceMetadataHash}</p>
      {revisionMismatch && <p role="alert">Source revision differs from captured study. Regenerate before relying on the outline.</p>}
      <p>Reference-only: yes · Factory approved: no · Locked: yes · Displacement: {study.provenance.depthCm} cm</p>
      {offsetPreview?<details open aria-label="Approximate inward-normal facing preview" data-facing-offset-preview="approximate">
        <summary>Qualified inward-normal outline preview · {offsetPreview.sourceSampleCount} source samples</summary>
        <p>Adaptive sampled offset · {offsetPreview.points.length} preview points · source geometry hash {offsetPreview.sourceGeometryHash}. Preview geometry is NOT an editable or production-ready facing, and may differ from an analytic quadratic offset.</p>
        {drawingPoints.every(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y))&&Number.isFinite(w)&&Number.isFinite(h)&&
          <svg viewBox={`${xmin} ${ymin} ${w} ${h}`} width="100%" height="250" aria-label="Source outline and approximate inset study">
            <path d={curvePath} stroke="currentColor" strokeWidth={0.05} strokeDasharray="0.22 0.12" fill="none" vectorEffect="non-scaling-stroke"/>
            <polygon points={offsetPreview.points.map(p=>`${p.x},${p.y}`).join(' ')}
              stroke="currentColor" strokeWidth={0.05} fill="none" vectorEffect="non-scaling-stroke"/>
          </svg>}
      </details>:<p role="status">Inward-normal preview refused: {offsetRefusal||'No qualified offset is available'}. The legacy translated reference may still be inspected; never infer a production facing.</p>}
      <ol>{study.piece.points.map((p,i)=><li key={i}>Derived point {i+1}: {pointLabel(p)}</li>)}</ol>
      {Object.entries(study.piece.curves || {}).map(([edge,control])=><p key={edge}>Derived quadratic edge {Number(edge)+1}: {pointLabel({x:control.cx,y:control.cy})}</p>)}
      {lastOutcome?.kind==='regenerated' && <p>Regeneration result: source changed {lastOutcome.sourceChanged?'yes':'no'}; revision advanced {lastOutcome.revisionAdvanced?'yes':'no'}.</p>}
    </div>}
    <p role="status">{status}</p>
  </section>
}
