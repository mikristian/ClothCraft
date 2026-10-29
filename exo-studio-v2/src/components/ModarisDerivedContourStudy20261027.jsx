import React,{useState} from 'react'
import {createModarisDerivedContour20261027,regenerateModarisDerivedContour20261027} from '../core/modarisDerivedContour20261027.js'

const ID=/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/

export function modarisDerivedContourPreflight20261027(project,{nativeMode=false,disabled=false,sourcePieceId,derivedId,derivedName,depthCm}={}){
  if(nativeMode)return 'Native Rust pattern projects are not supported by this legacy contour study.'
  if(disabled)return 'Derived contour study is disabled.'
  if(!project||!Number.isSafeInteger(project.revision)||project.revision<0||!Array.isArray(project.pieces))return 'A revisioned legacy pattern project is required.'
  if(!ID.test(sourcePieceId||'')||!project.pieces.some(p=>p?.id===sourcePieceId))return 'Select an existing legacy source pattern.'
  if(!ID.test(derivedId||'')||sourcePieceId===derivedId||project.pieces.some(p=>p?.id===derivedId))return 'Choose a unique derived contour identifier.'
  if(typeof derivedName!=='string'||!derivedName.trim()||derivedName.length>140)return 'Enter a derived pattern name.'
  if(typeof depthCm!=='number'||!Number.isFinite(depthCm)||depthCm<=0||depthCm>5)return 'Use a finite depth greater than 0 and at most 5 cm.'
  return ''
}

export default function ModarisDerivedContourStudy20261027({project,nativeMode=false,disabled=false}){
  const [sourcePieceId,setSourcePieceId]=useState('')
  const [derivedId,setDerivedId]=useState('derived-contour')
  const [derivedName,setDerivedName]=useState('Inward contour study')
  const [depth,setDepth]=useState('1')
  const [study,setStudy]=useState(null)
  const [notice,setNotice]=useState('Select a source pattern to inspect the actual offset geometry.')
  const depthCm=Number(depth)
  const options={sourcePieceId,derivedId,derivedName,depthCm}
  const reason=modarisDerivedContourPreflight20261027(project,{...options,nativeMode,disabled})
  const pieces=Array.isArray(project?.pieces)?project.pieces:[]
  const stale=Boolean(study&&study.provenance.sourceRevision!==project?.revision)
  const create=()=>{
    if(reason){setNotice(reason);return}
    try{
      const generated=createModarisDerivedContour20261027(project,options)
      setStudy(generated.study)
      setNotice(`Source revision ${project.revision}: validated detached inward contour. Curved control offsets remain approximate.`)
    }catch(error){setNotice(`Contour creation refused: ${error.message}`)}
  }
  const regenerate=()=>{
    if(!study||nativeMode||disabled)return
    try{
      const regenerated=regenerateModarisDerivedContour20261027(project,study,{expectedRevision:project.revision})
      setStudy(regenerated.study)
      setNotice(`Regeneration validated against revision ${project.revision}; source geometry changed: ${regenerated.sourceChanged?'yes':'no'}.`)
    }catch(error){setNotice(`Contour regeneration refused: ${error.message}`)}
  }
  return <section aria-label="Modaris inward contour reference study" data-modaris-derived-contour="reference-only" style={{display:'grid',gap:8}}>
    <h3>Source-linked inward contour · geometry study</h3>
    <p>This guarded legacy 2D operation calculates an inward miter offset of straight contour segments, and approximates curved Bézier control offsets using tangents. It remains a detached engineering reference; no cut-ready piece, grading, seam, factory output or saved project mutation is produced.</p>
    <fieldset disabled={nativeMode||disabled} style={{display:'grid',gap:8}}><legend>Offset construction · centimetres</legend>
      <label>Source piece <select aria-label="Source piece for inward contour" value={sourcePieceId} onChange={event=>setSourcePieceId(event.target.value)}>
        <option value="">Select source pattern</option>{pieces.filter(p=>typeof p?.id==='string').map(p=><option key={p.id} value={p.id}>{p.name||p.id}</option>)}
      </select></label>
      <label>Derived contour ID <input aria-label="Derived contour ID" value={derivedId} onChange={event=>setDerivedId(event.target.value)}/></label>
      <label>Derived contour name <input aria-label="Derived contour name" value={derivedName} onChange={event=>setDerivedName(event.target.value)}/></label>
      <label>Inward depth (cm) <input aria-label="Inward depth in centimetres" type="number" min="0.001" max="5" step="0.1" value={depth} onChange={event=>setDepth(event.target.value)}/></label>
    </fieldset>
    {reason&&<p role="alert">{reason}</p>}
    <button type="button" disabled={Boolean(reason)} onClick={create}>Create geometric inward contour study</button>
    <button type="button" disabled={!study||nativeMode||disabled} onClick={regenerate}>Verify and regenerate from source revision</button>
    {study&&<div aria-label="Computed inward contour" data-derived-revision={study.provenance.sourceRevision}>
      <strong>{study.piece.name} · {study.piece.points.length} vertices</strong>
      {stale&&<p role="alert">Source revision changed. Explicit regeneration is required.</p>}
      <p>Source {study.provenance.sourcePieceId} · inward depth {study.provenance.depthCm} cm · geometry approximation {study.provenance.geometryApproximation?'yes, curves':'no, straight edges'} · factory approved: no</p>
      <ol>{study.piece.points.map((p,index)=><li key={index}>Point {index+1}: {p.x.toFixed(3)}, {p.y.toFixed(3)} cm</li>)}</ol>
      <p>Curve controls: {Object.keys(study.piece.curves??{}).length}. Linked source fingerprint: {study.provenance.sourceHash}</p>
    </div>}
    <p role="status">{notice}</p>
  </section>
}
