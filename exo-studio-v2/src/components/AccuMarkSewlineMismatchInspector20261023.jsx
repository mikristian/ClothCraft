import React,{useMemo,useState} from 'react'
import {inspectAccuMarkSewlineMismatch20261023} from '../core/accumarkSewlineMismatchDiagnostic20261023.js'
import './AccuMarkEngineeringControls.css'

const display=n=>typeof n==='number'&&Number.isFinite(n)?n.toFixed(3):'—'

/** Read-only all-size true quadratic sewline audit. No automatic trueing or
 * factory acceptance; an authored ease policy can explain but never hide a
 * physical seam length mismatch. */
export default function AccuMarkSewlineMismatchInspector20261023({project,selectedPieceId=null}){
 const [open,setOpen]=useState(false)
 const [scope,setScope]=useState('all')
 const [tolerance,setTolerance]=useState('.1')
 const [chosenSeam,setChosenSeam]=useState('')
 const [easeSide,setEaseSide]=useState('A')
 const [ease,setEase]=useState('0')
 const sizeRun=project?.grading?.sizes||[]
 const report=useMemo(()=>{
  if(!open||!project)return null
  const toleranceCm=tolerance.trim()!==''?Number(tolerance):NaN
  const easeCm=ease.trim()!==''?Number(ease):NaN
  const easeBySeamId=chosenSeam&&easeCm>0?
   {[chosenSeam]:{easeCm,easeSide}}:{}
  const output=inspectAccuMarkSewlineMismatch20261023(project,{sizes:sizeRun,toleranceCm,easeBySeamId})
  if(!Number.isFinite(easeCm)||easeCm<0)return {...output,ok:false,
    issues:[...output.issues,{code:'INVALID_AUTHORED_EASE',message:'Ease must be a finite, nonnegative centimetre value'}]}
  return output
 },[open,project,tolerance,ease,easeSide,chosenSeam,sizeRun.join('|')])
 const inspected=report?.seamRows?.filter(row=>scope==='all'||!selectedPieceId||
  row.a?.pieceId===selectedPieceId||row.b?.pieceId===selectedPieceId)||[]
 return <section className="exo-accu-engine-controls" aria-label="AccuMark graded curved sewn boundary length checks">
  <details onToggle={event=>setOpen(event.currentTarget.open)}>
   <summary>Grade Seam Walk · Actual curved sewn lengths and residuals</summary>
   <p>Compare actual curved stitchline intervals across XS–XXL. A stated ease policy changes the expected difference, not the physical pattern. Never interpret a numerical pass as sewn-sample or cutter certification.</p>
   <div className="exo-engine-row">
    <label>Seam scope<select aria-label="Graded sewn seam inspection scope" value={scope} onChange={event=>setScope(event.target.value)}>
     <option value="all">All sewn seams</option><option value="selected">Seams on selected pattern block</option>
    </select></label>
    <label>Tolerance (cm)<input aria-label="Graded sewn line allowable residual cm" type="number" step=".01" min="0"
      value={tolerance} onChange={event=>setTolerance(event.target.value)}/></label>
    <label>Ease reference<select aria-label="Seam with manually specified sewn ease" value={chosenSeam}
      onChange={event=>setChosenSeam(event.target.value)}>
      <option value="">No authored ease</option>
      {(project?.seams||[]).map(seam=><option key={seam.id} value={seam.id}>{seam.id}</option>)}
    </select></label>
   </div>
   {chosenSeam&&<div className="exo-engine-row">
    <label>Extra ease (cm)<input type="number" aria-label="Explicit physical seam ease centimeters"
      min="0" step=".05" value={ease} onChange={event=>setEase(event.target.value)}/></label>
    <label>Longer sewn side<select aria-label="Which sewn side carries the authored ease" value={easeSide}
      onChange={event=>setEaseSide(event.target.value)}>
      <option value="A">Side A</option><option value="B">Side B</option>
    </select></label>
   </div>}
   {report&&<>
    <p role="status">{report.ok?'All examined sewn intervals within stated tolerance.':'Some sewing intervals or size runs are outside tolerance.'}
     {' '}{report.seamRows.length} seams, {report.sizes.length} sizes, {report.issues.length} engineering blocker(s).
    </p>
    {inspected.map(seam=><details key={seam.seamId} open={!seam.allSizesPass}>
     <summary>{seam.seamId} · {seam.allSizesPass?'Within tolerance':'Mismatch detected'} · {seam.reverseB?'reverse sewn B':'forward sewn B'}</summary>
     <div style={{overflowX:'auto'}}>
      <table aria-label={`Graded physical sewn interval ${seam.seamId} all size differences`}
        style={{width:'100%',fontSize:10,fontVariantNumeric:'tabular-nums'}}>
       <thead><tr><th>Size</th><th>A cm</th><th>B cm</th><th>A − B</th><th>Expected ease</th><th>Residual cm</th><th>Δ from base</th><th>Pass</th></tr></thead>
       <tbody>{seam.rows.map(row=><tr key={row.size}>
        <td>{row.size}</td><td>{display(row.lengthAcm)}</td><td>{display(row.lengthBcm)}</td>
        <td>{display(row.signedDeltaCm)}</td><td>{display(row.expectedSignedEaseCm)}</td>
        <td>{display(row.residualCm)}</td><td>{display(row.deltaFromBaseCm)}</td>
        <td>{row.pass?'Yes':'No'}</td>
       </tr>)}</tbody>
      </table>
     </div>
    </details>)}
    {report.issues?.length>0&&<details open>
     <summary>All-size sewn mismatch blockers ({report.issues.length})</summary>
     <ul>{report.issues.slice(0,50).map((issue,index)=><li key={index}>
      {issue.code}{issue.seamId?` · ${issue.seamId}`:''}{issue.size?` · ${issue.size}`:''}
      {issue.message?`: ${issue.message}`:''}{Number.isFinite(issue.residualCm)?` · residual ${display(issue.residualCm)} cm`:''}
     </li>)}</ul>
    </details>}
    <small>Read-only true sewn Bézier-interval arclength diagnostics; no geometric corrections are applied. Manufacturing approval: false.</small>
   </>}
  </details>
 </section>
}
