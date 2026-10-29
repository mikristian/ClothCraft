import React,{useEffect,useMemo,useState} from 'react'
import {inspectAccuMarkGradeAngleParallel20261023} from '../core/accumarkGradeAngleParallelAudit20261023.js'
import './AccuMarkEngineeringControls.css'

const fmt=n=>Number.isFinite(n)?n.toFixed(3):'—'

/** Read-only true all-size point direction measurement; not an automatic
 * Gerber grade constraint solver or an approval of sewn seam fit. */
export default function AccuMarkGradeAngleParallelInspector20261023({project,piece}){
 const [expanded,setExpanded]=useState(false)
 const [indices,setIndices]=useState({angleA:0,angleB:1,angleC:2,lineA:0,lineB:1,lineC:2,lineD:3})
 const [tolerance,setTolerance]=useState('.25')
 useEffect(()=>setIndices({angleA:0,angleB:1,angleC:2,lineA:0,lineB:1,lineC:2,lineD:3}),[piece?.id])
 const result=useMemo(()=>{
  if(!expanded||!piece||!project)return null
  try{return inspectAccuMarkGradeAngleParallel20261023(project,{
   pieceId:piece.id,
   angle:{a:indices.angleA,b:indices.angleB,c:indices.angleC},
   parallel:{a:indices.lineA,b:indices.lineB,c:indices.lineC,d:indices.lineD},
   angleToleranceDegrees:tolerance.trim()===''?NaN:Number(tolerance),
   parallelToleranceDegrees:tolerance.trim()===''?NaN:Number(tolerance),
  })}catch(error){return {ok:false,rows:[],issues:[{code:'ANGLE_QA_ENGINE_ERROR',message:error.message||String(error)}]}}
 },[expanded,project,piece?.id,indices,tolerance])
 const control=(key,label)=><label key={key}>{label}<select aria-label={label} value={indices[key]}
  onChange={event=>setIndices(previous=>({...previous,[key]:Number(event.target.value)}))}>
  {(piece?.points||[]).map((p,i)=><option key={p.id||i} value={i}>P{i+1}</option>)}
 </select></label>
 return <section className="exo-accu-engine-controls" aria-label="All-size grade angle and parallel geometry residuals">
  <details onToggle={event=>setExpanded(event.currentTarget.open)}>
   <summary>Grade Keep Angle and Parallel · XS–XXL residual inspector</summary>
   <p>Choose three points to measure an angle (middle point is vertex), then two directed lines to check whether they stay parallel across the graded sizes. Shows geometric deviations; it does not change pattern vertices.</p>
   <fieldset disabled={!piece||!project}>
    <strong>Angle: A → B → C</strong>
    <div className="exo-engine-row">{control('angleA','Angle point A')}{control('angleB','Angle vertex B')}{control('angleC','Angle point C')}</div>
    <strong>Parallel lines: A → B and C → D</strong>
    <div className="exo-engine-row">{control('lineA','Line 1 start')}{control('lineB','Line 1 end')}{control('lineC','Line 2 start')}{control('lineD','Line 2 end')}</div>
    <label>Allowable deviation in degrees<input aria-label="Maximum graded angle and parallel direction residual degrees"
      type="number" min="0" max="180" step=".05" value={tolerance} onChange={event=>setTolerance(event.target.value)}/></label>
   </fieldset>
   {result&&<>
    <p role="status">{result.ok?'No selected angle/parallel residual exceeded tolerance.':'At least one selected size violates angle/parallel tolerance or has invalid vectors.'} {result.issues?.length||0} blocker(s).</p>
    {result.rows?.length>0&&<div style={{overflowX:'auto'}}>
     <table aria-label="Actual graded size angle and parallel degrees" style={{width:'100%',fontSize:10,fontVariantNumeric:'tabular-nums'}}>
      <thead><tr><th>Size</th><th>Angle °</th><th>Δ angle °</th><th>Parallel residual °</th><th>Line direction Δ °</th><th>Pass</th></tr></thead>
      <tbody>{result.rows.map(row=><tr key={row.size}>
       <td>{row.size}</td><td>{fmt(row.angleDegrees)}</td><td>{fmt(row.angleDeltaDegrees)}</td>
       <td>{fmt(row.parallelResidualDegrees)}</td><td>{fmt(row.parallelDeltaDegrees)}</td><td>{row.pass?'Yes':'No'}</td>
      </tr>)}</tbody>
     </table>
    </div>}
    {result.issues?.length>0&&<details open>
     <summary>Constraint and geometry blockers ({result.issues.length})</summary>
     <ul>{result.issues.slice(0,35).map((issue,index)=><li key={index}>
      {issue.code}{issue.size?` · ${issue.size}`:''}{issue.message?` · ${issue.message}`:''}
     </li>)}</ul>
    </details>}
    <small>Read-only test of physically graded points; no hidden auto-rotation, production trueing, seam changes, saved grading rule edits or AccuMark compatibility claims.</small>
   </>}
  </details>
 </section>
}
