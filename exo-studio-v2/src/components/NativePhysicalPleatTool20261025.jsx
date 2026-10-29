import React,{useEffect,useMemo,useState} from 'react'
import {planNativePhysicalPleats20261025} from '../core/nativePhysicalPleat20261025.js'
import {inspectNativeTuckFitReadiness20261025} from '../core/nativeTuckFitReadiness20261025.js'
import './NativePatternConstructionTools20261023.css'

const numeric=text=>{
 const s=String(text).trim()
 return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s)?Number(s):NaN
}

/**
 * Physical pleating is NOT an InternalLine-only preview.
 * Uses the native TuckFoldSew authoring command, one solver-enforced seam
 * between distinct internal paths per tuck, in one atomic session batch.
 */
export default function NativePhysicalPleatTool20261025({
 snapshot,selected,disabled=false,onApply=async()=>false,onSelect=()=>{},onPreview=()=>{}
}){
 const panels=snapshot?.template?.panels||[]
 const [target,setTarget]=useState(''),[edge,setEdge]=useState('')
 const [centre,setCentre]=useState('50'),[intake,setIntake]=useState('18')
 const [depth,setDepth]=useState('45'),[count,setCount]=useState('1')
 const [spacing,setSpacing]=useState('55'),[committing,setCommitting]=useState(false)
 const [feedback,setFeedback]=useState('')
 const panel=panels.find(p=>p.id===target)||panels.find(p=>p.id===selected?.panel)||panels[0]
 const edges=panel?.polygon?.edges||[]
 const source=edges.includes(edge)?edge:edges[0]
 useEffect(()=>{
  if(selected?.panel&&panels.some(p=>p.id===selected.panel)){
   setTarget(selected.panel)
   if(typeof selected.edge==='string')setEdge(selected.edge)
  }
 },[selected?.panel,selected?.edge])
 const proposal=useMemo(()=>planNativePhysicalPleats20261025(snapshot,{
  panelId:panel?.id,edge:source,centerPercent:numeric(centre),
  intakeMm:numeric(intake),depthMm:numeric(depth),
  count:numeric(count),spacingMm:numeric(spacing)
 }),[snapshot,panel?.id,source,centre,intake,depth,count,spacing])
 useEffect(()=>{
  onPreview(proposal.ok?{
   panelId:proposal.panelId,revision:proposal.revision,
   preview:proposal.preview,intakeMm:proposal.intakeMm,
   depthMm:proposal.depthMm
  }:null)
  return()=>onPreview(null)
 },[onPreview,proposal])
 const liveFit=useMemo(()=>inspectNativeTuckFitReadiness20261025(snapshot,{
  panelId:panel?.id
 }),[snapshot,panel?.id])
 const figure=proposal.ok?<svg aria-label="Material-space pleat sewing placement preview" data-native-physical-pleat-diagram="true"
  viewBox="0 0 440 145" preserveAspectRatio="xMidYMid meet"
  style={{display:'block',width:'100%',height:140,minHeight:140,flexShrink:0,
   background:'#ecf3f4',borderRadius:6,border:'1px solid #6e929a'}}>
  <rect x="15" y="35" width="410" height="93" fill="#f3faf7" stroke="#a4b9b1"/>
  <line x1="15" y1="35" x2="425" y2="35" stroke="#1b393b" strokeWidth="2.5"/>
  {proposal.preview.map((fold,i)=>{
   const x1=15+410*fold.left_t,x2=15+410*fold.right_t
   return <g key={i} data-preview-pleat={i}>
    <rect x={x1} y="35" width={x2-x1} height="78" fill="#b2dde0" opacity=".45"/>
    <line x1={x1} y1="37" x2={x1} y2="113" stroke="#047f8a" strokeWidth="2" strokeDasharray="4 3"/>
    <line x1={x2} y1="37" x2={x2} y2="113" stroke="#047f8a" strokeWidth="2" strokeDasharray="4 3"/>
    <line x1={x1} y1="120" x2={x2} y2="120" stroke="#07828e" strokeWidth="1.5"/>
    <text x={(x1+x2)/2} y="17" fontSize="11" fill="#174f57" textAnchor="middle">#{i+1}</text>
   </g>
  })}
  <text x="18" y="138" fontSize="9" fill="#426673">Conceptual view · dual stitch paths on one continuous cloth panel</text>
 </svg>:null
 const field=(name,value,onChange,{min,max,step='0.5',disabled:off=false}={})=>
  <label key={name}>{name}<input type="number" aria-label={'Physical pleat '+name.toLowerCase()}
   value={value} onChange={e=>{onChange(e.target.value);setFeedback('')}}
   min={min} max={max} step={step} disabled={off}/></label>
 const submit=async()=>{
  if(disabled||committing||!proposal.ok)return
  if(!window.confirm('EXPERIMENTAL native tuck sewing: the present cloth solver has NOT demonstrated stable physical fold closure and can reject simulation steps on degenerate contact. The source cut contour is preserved and Undo is available, but this is NOT a production-ready garment operation. Apply this experimental native seam to the current pattern?'))return
  setCommitting(true);setFeedback('')
  try{
   const done=await onApply(proposal)
   setFeedback(done?`Saved ${proposal.count} physical tuck seam(s) in Rust. Check 3D seam convergence, physical self-contact and cut-room results before manufacturing.`:
    'Native construction did not commit. Original material and history should remain unchanged; inspect the error before retrying.')
  }catch(error){setFeedback(error?.message||'Native pleat operation rejected')}
  finally{setCommitting(false)}
 }
 return <section className="exo-native-construction" data-native-physical-pleat="true"
  aria-label="Native physical pleat and tuck sewing">
  <strong>EXPERIMENTAL PHYSICAL TUCK / PLEAT SEWING · RUST</strong>
  <p>Use measured positions along a straight edge to place two internal stitch paths on the same continuous panel. Rust creates a genuine sewing constraint and preserves material area, but stable folded drape and collision-safe closure are not yet implemented.</p>
  <label>Garment pattern<select aria-label="Physical pleat pattern" value={panel?.id||''}
    onChange={event=>{setTarget(event.target.value);setEdge('');setFeedback('');onSelect({panel:event.target.value})}}>
   {panels.map(p=><option key={p.id} value={p.id}>{p.name} / {p.id}</option>)}
  </select></label>
  <label>Straight unsewn source edge<select aria-label="Physical pleat source edge" value={source||''}
    onChange={event=>{setEdge(event.target.value);setFeedback('');onSelect({panel:panel?.id,edge:event.target.value})}}>
   {edges.map((e,i)=><option key={e} value={e}>{i+1}. {e}</option>)}
  </select></label>
  <div className="exo-construction-grid" style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:8}}>
   {field('Centre station (%)',centre,setCentre,{min:1,max:99})}
   {field('Intake per pleat (mm)',intake,setIntake,{min:3,max:150})}
   {field('Stitch path depth (mm)',depth,setDepth,{min:8,max:150})}
   {field('Number of pleats',count,setCount,{min:1,max:16,step:'1'})}
   {field('Centre spacing (mm)',spacing,setSpacing,{min:5,max:500,disabled:numeric(count)===1})}
  </div>
  {figure}
  {proposal.ok?<div className="exo-construction-result" data-native-physical-pleat-status="ready" role="status">
   <strong>VALIDATED PROPOSAL · NOT YET SEWN</strong>
   <span>{proposal.count} seam-constrained tuck(s) · {proposal.intakeMm.toFixed(1)} mm intake each</span>
   <span>Stitch path {proposal.depthMm.toFixed(1)} mm deep · {proposal.sourceBoundaryLengthMm.toFixed(1)} mm source edge</span>
   <span>Original source area: {proposal.originalAreaMm2.toFixed(1)} mm²; native commit must preserve it</span>
   <span>Native revision {proposal.revision}; one atomic Undo for this group</span>
  </div>:<p role="status" data-native-physical-pleat-status="blocked" className="exo-construction-invalid">
   Physical pleat blocked: {proposal.reason}
  </p>}
  <button data-native-physical-pleat-apply="true" disabled={!proposal.ok||disabled||committing}
   type="button" onClick={submit}>
   {committing?'Authoring native seam constraints…':`Create ${proposal.ok?proposal.count:''} experimental tuck seam(s)`}
  </button>
  {feedback&&<p role="status" data-native-physical-pleat-result="true">{feedback}</p>}
  {liveFit.ok&&<section data-native-physical-tuck-fit={liveFit.provisionalFitChecksPass?'reference-pass':'review-required'}
   aria-label="Native physical pleat simulation readiness" style={{display:'grid',gap:7,padding:10,border:'1px solid #547883',borderRadius:6}}>
   <strong>REAL CLOTH SIMULATION · {liveFit.seamCount} TUCK(S)</strong>
   {liveFit.rows.map(row=><div key={row.seamId}>
    <span>{row.seamId}</span>
    <strong style={{display:'block'}}>{row.maxGapMm.toFixed(2)} mm seam gap</strong>
    <small>Reference 2 mm · {row.gapWithinReference?'within reference':'requires further closure'}</small>
   </div>)}
   <div role="status">
    <span>{liveFit.simulated?'Native solver has stepped':'Not simulated since authoring'}</span>
    <strong style={{display:'block'}}>{liveFit.maxStrainPercent===null?'Strain unavailable':
      `Max measured strain ${liveFit.maxStrainPercent.toFixed(1)}%`}</strong>
    {liveFit.residualRmsN!==null&&<small>Solver residual RMS {liveFit.residualRmsN.toFixed(1)} N</small>}
   </div>
   {liveFit.issues.map((issue,i)=><small key={i}>{issue}</small>)}
   <strong>Manufacturing release: NOT APPROVED</strong>
  </section>}
  <small>KNOWN SOLVER LIMITATION: physical seam-gap closure currently stalls in isolated tests, and extreme stress may produce degenerate OGC contacts. The current system does not prescribe mountain/valley fold direction or certify textile self-contact, graded patterns, or factory cutting. Undo removes this experimental seam construction.</small>
 </section>
}
