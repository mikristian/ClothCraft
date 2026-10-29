import React,{useMemo,useState} from 'react'
import {inspectAccuMarkDraftingPrecision20261023} from '../core/accumarkDraftingPrecisionQA20261023.js'
import './AccuMarkEngineeringControls.css'

const fmt=n=>Number.isFinite(n)?n.toFixed(3):'—'

/** Authoring diagnostics, not a production QA or factory acceptance gate. */
export default function AccuMarkDraftingPrecisionInspector20261023({project,selectedPieceId}){
 const [open,setOpen]=useState(false)
 const [detail,setDetail]=useState('all')
 const [segments,setSegments]=useState('24')
 const audit=useMemo(()=>{
  if(!open||!project)return null
  try{return inspectAccuMarkDraftingPrecision20261023(project,{segmentsPerCurve:Number(segments)})}
  catch(error){return {ok:false,blocks:[],issues:[{code:'DRAFTING_PRECISION_AUDIT_ERROR',message:String(error?.message||error)}],summary:{totalPieces:0,passingPieces:0,blockedPieces:0}}}
 },[open,project,segments])
 const rows=(audit?.blocks||[]).filter(row=>detail==='all'||row.pieceId===selectedPieceId)
 return <section className="exo-accu-engine-controls" aria-label="AccuMark physical drafting geometry audit">
  <details onToggle={event=>setOpen(event.currentTarget.open)}>
   <summary>Pattern Drafting Geometry QA · Curves and contour integrity</summary>
   <p>Measure actual quadratic stitchline boundaries and detect invalid controls, zero-length edges, collapsed or self-crossing outlines. This is a bounded sampled check, not a cutter certification.</p>
   <div className="exo-engine-row">
    <label>Pieces<select aria-label="Pattern drafting QA piece scope" value={detail} onChange={event=>setDetail(event.target.value)}>
     <option value="all">All pattern blocks</option><option value="selected">Selected pattern block</option>
    </select></label>
    <label>Curve samples<select aria-label="Quadratic curve QA sampling per segment" value={segments} onChange={event=>setSegments(event.target.value)}>
     <option value="12">12</option><option value="24">24</option><option value="48">48 (complex panels may block)</option>
    </select></label>
   </div>
   {audit&&<>
    <p role="status">{audit.summary?.passingPieces||0} of {audit.summary?.totalPieces||0} pattern blocks passed the sampled drawing geometry checks; {audit.issues?.length||0} issues.</p>
    <div style={{overflowX:'auto'}}>
     <table aria-label="Drafted pattern block physical dimensions and contour validity" style={{width:'100%',fontSize:10,fontVariantNumeric:'tabular-nums'}}>
      <thead><tr><th>Block</th><th>Points</th><th>Curves</th><th>Perimeter cm</th><th>Area cm²</th><th>Orientation</th><th>Integrity</th></tr></thead>
      <tbody>{rows.map(row=><tr key={row.pieceId||'missing'}>
       <td>{row.pieceId||'No ID'}</td><td>{row.pointCount}</td><td>{row.curveCount}</td>
       <td>{fmt(row.perimeterCm)}</td><td>{fmt(row.areaCm2)}</td>
       <td>{row.orientation||'—'}</td><td>{row.ok?'Valid sampled contour':`${row.issues.length} blocker(s)`}</td>
      </tr>)}</tbody>
     </table>
    </div>
    {audit.issues?.length>0&&<details open>
     <summary>Drafting integrity findings ({audit.issues.length})</summary>
     <ul>{audit.issues.slice(0,50).map((issue,i)=><li key={i}>
      {issue.pieceId?`${issue.pieceId} · `:''}{issue.code}{issue.edgeIndex!==undefined?` · edge ${issue.edgeIndex+1}`:''}
     </li>)}</ul>
    </details>}
    <small>All values are source-pattern centimetres. Results are read-only and do not overwrite points, seam allowance, DXF or the stored garment.</small>
   </>}
  </details>
 </section>
}
