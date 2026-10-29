import React,{useMemo,useState} from 'react'
import {inspectAccuMarkGradedStack20261024_1341} from '../core/accumarkGradeStackActions20261024_1341.js'
import {applyAccuMarkPieceRigidAction20261024_1341} from '../core/accumarkPieceRigidActions20261024_1341.js'
import {applyAccuMarkLineConstruction} from '../core/accumarkLineConstruction20261024_1341.js'
import {extractAccuMarkReferencePiece20261024_1341} from '../core/accumarkReferencePieceExtraction20261024_1341.js'
import {applyAccuMarkCurvedSourceRigidTransform20261024_1400} from '../core/accumarkCurvedSourceRigidTransform20261024_1400.js'

const num=v=>String(v).trim()&&Number.isFinite(Number(v))?Number(v):NaN
const colors=['#b9a3ef','#eab174','#67bbcc','#d18eb7','#8cca99','#e7a18a','#90afeb','#90c6b0']
const field={flex:'1 1 105px',minWidth:105}
const flexible={display:'flex',gap:7,flexWrap:'wrap'}
function save(name,data){
 const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}))
 const a=document.createElement('a')
 try{a.download=name;a.href=url;document.body.appendChild(a);a.click()}
 finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
}
function pathForRow(row){
 const points=row.pointsCm||[]
 if(!points.length)return ''
 const controls=new Map((row.curves||[]).map(c=>[c.edgeIndex,c]))
 const segments=['M '+points[0].xCm+' '+(-points[0].yCm)]
 points.forEach((p,i)=>{
   const next=points[(i+1)%points.length],c=controls.get(i)
   segments.push(c?'Q '+c.cxCm+' '+(-c.cyCm)+' '+next.xCm+' '+(-next.yCm):
     'L '+next.xCm+' '+(-next.yCm))
 })
 return segments.join(' ')+' Z'
}
function GradeOverlay({result}){
 const geometry=useMemo(()=>{
  const coords=result.rows.flatMap(row=>[
   ...(row.pointsCm||[]).map(p=>({x:p.xCm,y:-p.yCm})),
   ...(row.curves||[]).map(c=>({x:c.cxCm,y:-c.cyCm}))
  ])
  const l=Math.min(...coords.map(p=>p.x)),r=Math.max(...coords.map(p=>p.x))
  const t=Math.min(...coords.map(p=>p.y)),b=Math.max(...coords.map(p=>p.y))
  const pad=Math.max(1,(r-l+b-t)*.03)
  return{x:l-pad,y:t-pad,w:r-l+2*pad,h:b-t+2*pad}
 },[result])
 return <div style={{display:'grid',gap:7}}>
   <svg role="img" aria-label="Physically graded stack overlay" viewBox={[geometry.x,geometry.y,geometry.w,geometry.h].join(' ')}
    style={{width:'100%',maxHeight:330,background:'#161b21',border:'1px solid #64707e',borderRadius:5}}>
     {result.rows.map((row,i)=><path key={row.size} d={pathForRow(row)} stroke={colors[i%colors.length]}
      fill="none" strokeWidth={Math.max(.03,geometry.w/300)} strokeLinejoin="round"/>)}
   </svg>
   <div style={flexible}>{result.rows.map((row,i)=><span key={row.size} style={{fontWeight:600,color:colors[i%colors.length]}}>{row.size}</span>)}</div>
   <div style={{overflow:'auto',maxHeight:200}}><table style={{fontSize:11,width:'100%'}}>
    <thead><tr><th>Size</th><th>ΔX cm</th><th>ΔY cm</th><th>Edge cm</th></tr></thead>
    <tbody>{result.rows.map(row=><tr key={row.size}>
      <td>{row.size}</td><td>{row.sourceGradeAnchorDeltaCm.xCm.toFixed(3)}</td>
      <td>{row.sourceGradeAnchorDeltaCm.yCm.toFixed(3)}</td>
      <td>{row.selectedEdgeLengthCm?.toFixed(3)||'—'}</td>
    </tr>)}</tbody>
   </table></div>
 </div>
}

export default function AccuMarkCommandImplementationStudio20261024_1341({
 project,selectedPiece,disabled=false,nativeMode=false,onApplyProject
}){
 const [chosen,setChosen]=useState('')
 const piece=(project?.pieces||[]).find(p=>p.id===(chosen||selectedPiece?.id))||project?.pieces?.[0]
 const [point,setPoint]=useState('0'),[edge,setEdge]=useState(''),[fraction,setFraction]=useState('.5')
 const [align,setAlign]=useState('anchor'),[sizeNames,setSizeNames]=useState('')
 const [stack,setStack]=useState(null),[notice,setNotice]=useState('')
 const [pieceAction,setPieceAction]=useState('MOVE'),[dx,setDx]=useState('1'),[dy,setDy]=useState('0')
 const [angle,setAngle]=useState('90'),[axis,setAxis]=useState('vertical'),[copyId,setCopyId]=useState('')
 const [curvedX,setCurvedX]=useState('1'),[curvedY,setCurvedY]=useState('0'),[curvedAngle,setCurvedAngle]=useState('0')
 const [curvedValidation,setCurvedValidation]=useState(null)
 const [lineAction,setLineAction]=useState('line.twoPoint'),[reference,setReference]=useState('')
 const [referenceId,setReferenceId]=useState('detached-outline-1')
 const [extraction,setExtraction]=useState(null)
 const [aX,setAX]=useState('0'),[aY,setAY]=useState('0'),[bX,setBX]=useState('10'),[bY,setBY]=useState('0')
 const [length,setLength]=useState('2'),[station,setStation]=useState('.5'),[lineId,setLineId]=useState('')
 const canMutate=!disabled&&!nativeMode&&Boolean(piece)&&typeof onApplyProject==='function'
 const inspect=()=>{
   setNotice('');setStack(null)
   try{
    const result=inspectAccuMarkGradedStack20261024_1341(project,{pieceId:piece.id,
      pointIndex:num(point),edgeIndex:edge===''?null:num(edge),edgeFraction:num(fraction),align,
      sizes:sizeNames.trim()?sizeNames.split(',').map(s=>s.trim()):project.grading.sizes})
    setStack(result)
   }catch(e){setNotice('Grade stack blocked: '+e.message)}
 }
 const applyPiece=()=>{
  setNotice('')
  try{
   if(!canMutate)throw Error('A writable legacy EXO source project is required')
   const result=applyAccuMarkPieceRigidAction20261024_1341(project,{
    pieceId:piece.id,action:pieceAction,dxCm:num(dx),dyCm:num(dy),
    angleDeg:num(angle),axis,copyId:copyId.trim()})
   onApplyProject(result.project,'Validated detached piece '+pieceAction+' operation. Source geometry is in EXO project Undo; review graded construction before export.')
   setStack(null)
  }catch(e){setNotice('Piece operation blocked: '+e.message)}
 }
 const applyCurved=()=>{
   setNotice('');setCurvedValidation(null)
   try{
     if(!canMutate)throw Error('A writable legacy EXO source project is required')
     const result=applyAccuMarkCurvedSourceRigidTransform20261024_1400(project,{
       pieceId:piece.id,dxCm:num(curvedX),dyCm:num(curvedY),angleDeg:num(curvedAngle)
     })
     onApplyProject(result.project,'Preserved verified quadratic controls, supported marks and grade stations during bounded curved transform. Engineering review only.')
     setCurvedValidation(result.validation)
     setStack(null)
   }catch(e){setNotice('Curved source operation blocked: '+e.message)}
 }
 const applyLine=()=>{
  setNotice('')
  try{
   if(!canMutate)throw Error('A writable legacy EXO source project is required')
   const used=new Set((piece.internalLines||[]).map(p=>p.id))
   let id=lineId.trim()
   if(!id)for(let i=1;i<=1000;i++)if(!used.has('construction-'+i)){id='construction-'+i;break}
   const spec={kind:lineAction,pieceId:piece.id,lineId:id,
    a:{x:num(aX),y:num(aY)},b:{x:num(bX),y:num(bY)},
    distanceCm:num(length),offsetCm:num(length),lengthCm:num(length),atFraction:num(station)}
   if(reference)spec.referenceLineId=reference
   const result=applyAccuMarkLineConstruction(project,spec)
   if(result.measurement){setNotice('Physical length: '+result.measurement.lengthCm.toFixed(3)+' cm');return}
   onApplyProject(result.project,'Added validated non-cutting construction line '+id+' ('+result.validation.lengthCm.toFixed(3)+' cm).')
   setLineId('')
  }catch(e){setNotice('Line operation blocked: '+e.message)}
 }
 const extractOutline=()=>{
  setNotice('');setExtraction(null)
  try{
   if(!piece)throw Error('Choose a source pattern piece')
   const result=extractAccuMarkReferencePiece20261024_1341(project,{
    sourcePieceId:piece.id,referenceId:referenceId.trim()})
   if(result.project.pieces.length!==project.pieces.length)throw Error('Unsafe reference extraction changed production piece inventory')
   setExtraction(result)
   setNotice('Detached geometric reference created as a sidecar study. The garment and factory CUT inventory remain unchanged.')
  }catch(e){setNotice('Reference extraction blocked: '+e.message)}
 }
 return <section data-accumark-new-command-workbench="true" style={{padding:12,display:'grid',gap:10,fontSize:12}}>
  <strong style={{fontSize:14}}>AccuMark command implementation · real 2D geometry</strong>
  <p>Executable EXO source operations from the master command inventory. They are bounded engineering tools, not certified Gerber equivalents or factory-approved garment editing.</p>
  {nativeMode&&<p role="status">Native Rust is active. Only a read-only grade reference is available here; legacy pattern edits cannot mutate the native garment.</p>}
  <label>Source EXO piece<select aria-label="Source piece for extended AccuMark tools" value={piece?.id||''}
    onChange={e=>{setChosen(e.target.value);setStack(null);setNotice('')}} style={{width:'100%'}}>
    {(project?.pieces||[]).map(p=><option key={p.id} value={p.id}>{p.name||p.id} ({p.id})</option>)}
  </select></label>
  <details open><summary><strong>Selected edge inspection + graded stack alignment</strong></summary>
    <p>Uses actual size grading, aligns independently generated contours to a source point or arc-length station, and reports physical edge lengths. Does not rewrite rules or certify curved intersections.</p>
    <div style={flexible}>
      <label style={field}>Point index<input type="number" aria-label="Grade stack anchor point index" style={{width:'100%'}} value={point} onChange={e=>setPoint(e.target.value)}/></label>
      <label style={field}>Edge<select aria-label="Grade stack selected edge" style={{width:'100%'}} value={edge} onChange={e=>setEdge(e.target.value)}>
        <option value="">Point only</option>{(piece?.points||[]).map((_,i)=><option key={i} value={i}>Edge {i+1}</option>)}
      </select></label>
      <label style={field}>Edge fraction<input type="number" aria-label="Grade stack edge station fraction" step=".05" style={{width:'100%'}} value={fraction} onChange={e=>setFraction(e.target.value)}/></label>
      <label style={field}>Overlay<select style={{width:'100%'}} value={align} onChange={e=>setAlign(e.target.value)}>
        <option value="anchor">Aligned to station</option><option value="source">Original source positions</option>
      </select></label>
    </div>
    <label>Optional size subset (comma separated)<input style={{width:'100%'}} value={sizeNames} onChange={e=>setSizeNames(e.target.value)} placeholder={(project?.grading?.sizes||[]).join(', ')}/></label>
    <button type="button" disabled={!piece||disabled} onClick={inspect}>Inspect real size-run and overlay</button>
    {stack&&<><GradeOverlay result={stack}/><button type="button" onClick={()=>save('exo-graded-stack-station-REVIEW-ONLY.json',stack)}>Download grade-stack inspection</button></>}
  </details>
  <details><summary><strong>Curved pieces · rotate/move with control-point and mark preservation</strong></summary>
    <fieldset disabled={!canMutate} style={{padding:9,display:'grid',gap:7}}>
      <p>This is a stricter source-aware operation than moving an unattached polygon. It transforms authored quadratic Bézier controls, notch stations, supported internal construction and grade break vectors, then validates physical edge lengths and all requested sizes. Unsupported sewing relationships, automatic-axis rotation and directional fabric are blocked.</p>
      <div style={flexible}>
        <label style={field}>X translation (cm)<input type="number" aria-label="Curved source delta X" value={curvedX} onChange={e=>setCurvedX(e.target.value)}/></label>
        <label style={field}>Y translation (cm)<input type="number" aria-label="Curved source delta Y" value={curvedY} onChange={e=>setCurvedY(e.target.value)}/></label>
        <label style={field}>Angle (degrees)<input type="number" aria-label="Curved source rotation degrees" value={curvedAngle} onChange={e=>setCurvedAngle(e.target.value)}/></label>
      </div>
      <button type="button" onClick={applyCurved}>Transform curves and attached source coordinates with graded QA</button>
      {curvedValidation&&<p role="status">Physical edge lengths preserved across {curvedValidation.sizes.length} graded size(s). Units: {curvedValidation.units}. Sewn/factory approval remains pending.</p>}
    </fieldset>
  </details>
  <details><summary><strong>Source piece Move, Rotate, Mirror and Copy</strong></summary>
    <fieldset disabled={!canMutate} style={{padding:9,display:'grid',gap:7}}>
      <p>Detached straight source pieces only. Attached seams, curves, markings and incompatible grading block the edit; no attachments are silently dropped.</p>
      <label>Piece action<select value={pieceAction} onChange={e=>setPieceAction(e.target.value)}>{['MOVE','ROTATE','MIRROR','COPY'].map(x=><option key={x}>{x}</option>)}</select></label>
      {pieceAction==='MOVE'&&<div style={flexible}>
       <label style={field}>ΔX cm<input type="number" style={{width:'100%'}} value={dx} onChange={e=>setDx(e.target.value)}/></label>
       <label style={field}>ΔY cm<input type="number" style={{width:'100%'}} value={dy} onChange={e=>setDy(e.target.value)}/></label>
      </div>}
      {pieceAction==='ROTATE'&&<label>Rotation degrees<input type="number" value={angle} onChange={e=>setAngle(e.target.value)}/></label>}
      {pieceAction==='MIRROR'&&<label>Axis<select value={axis} onChange={e=>setAxis(e.target.value)}>
        <option value="vertical">Vertical</option><option value="horizontal">Horizontal</option>
      </select></label>}
      {pieceAction==='COPY'&&<label>New unique piece ID<input value={copyId} onChange={e=>setCopyId(e.target.value)} placeholder="front-copy-1"/></label>}
      <button type="button" onClick={applyPiece}>Validate and apply {pieceAction.toLowerCase()} with Undo</button>
    </fieldset>
  </details>
  <details><summary><strong>Extract a safe detached pattern outline study</strong></summary>
    <p>Copies the physical source perimeter of a verified straight-edged piece into an independent reference-only study. The sidecar is <strong>never added to the garment's cutting inventory</strong>. Sewn attachments, graded rules, curve and notch meaning are not transferred.</p>
    <label>Reference-only study ID<input aria-label="Extracted reference study ID" value={referenceId} onChange={e=>setReferenceId(e.target.value)}/></label>
    <button type="button" disabled={!piece||disabled} onClick={extractOutline}>Extract immutable source outline to sidecar</button>
    {extraction&&<div role="status">
      <p>Source: {extraction.provenance?.sourcePieceId} · geometry reference hash: {extraction.provenance?.sourceGeometryHash}</p>
      <button type="button" onClick={()=>save('exo-extracted-reference-outline-NOT-CUT-READY.json',extraction.study)}>Download non-production reference study</button>
    </div>}
  </details>
  <details><summary><strong>Line construction: 2-point, parallel, offset, perpendicular, length</strong></summary>
    <fieldset disabled={!canMutate} style={{padding:9,display:'grid',gap:7}}>
      <p>Creates actual non-cutting construction lines in centimeters; never alters stitched/CUT outlines or grade attachment stations.</p>
      <label>Action<select style={{width:'100%'}} value={lineAction} onChange={e=>setLineAction(e.target.value)}>
        {['line.twoPoint','line.parallel','line.offset','line.perpendicular','line.setLength','line.measureDistance'].map(x=><option key={x} value={x}>{x}</option>)}
      </select></label>
      <label>Optional reference construction line<select style={{width:'100%'}} value={reference} onChange={e=>setReference(e.target.value)}>
        <option value="">Explicit A/B</option>{(piece?.internalLines||[]).filter(x=>x.id).map(x=><option key={x.id} value={x.id}>{x.id}</option>)}
      </select></label>
      <div style={flexible}>{[['AX',aX,setAX],['AY',aY,setAY],['BX',bX,setBX],['BY',bY,setBY]].map(([name,value,update])=>
        <label key={name} style={field}>{name} (cm)<input type="number" style={{width:'100%'}} value={value} onChange={e=>update(e.target.value)}/></label>)}</div>
      <div style={flexible}>
        <label style={field}>Length / offset cm<input type="number" style={{width:'100%'}} value={length} onChange={e=>setLength(e.target.value)}/></label>
        <label style={field}>Fraction (0–1)<input type="number" step=".05" style={{width:'100%'}} value={station} onChange={e=>setStation(e.target.value)}/></label>
        <label style={field}>New line ID (auto)<input style={{width:'100%'}} value={lineId} onChange={e=>setLineId(e.target.value)}/></label>
      </div>
      <button type="button" onClick={applyLine}>{lineAction==='line.measureDistance'?'Measure physical line':'Add validated construction line'}</button>
    </fieldset>
  </details>
  {notice&&<p role="status">{notice}</p>}
  <small>Each operation is EXO-only, with no licensed AccuMark parity claim or factory release.</small>
 </section>
}
