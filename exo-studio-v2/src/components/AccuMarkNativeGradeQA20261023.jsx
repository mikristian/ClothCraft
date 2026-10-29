import React,{useMemo,useState} from 'react'
import {inspectAccuMarkNativeRuleSizeQA20261023} from '../core/accumarkNativeRuleSizeQA20261023.js'

const fmt=n=>Number.isFinite(n)?n.toFixed(2):'—'

export default function AccuMarkNativeGradeQA20261023({snapshot,ruleSet}){
 const [open,setOpen]=useState(false)
 const report=useMemo(()=>{
  if(!open||!snapshot||!ruleSet)return null
  try{return inspectAccuMarkNativeRuleSizeQA20261023(snapshot,ruleSet)}
  catch(error){return {ok:false,blocks:[],issues:[{code:'GRADE_QA_ERROR',message:error.message}],manufacturingApproved:false}}
 },[open,snapshot?.template,ruleSet])
 if(!ruleSet)return null
 return <details onToggle={event=>setOpen(event.currentTarget.open)}
  aria-label="Native independently graded size quality inspection">
  <summary>NATIVE GRADE QUALITY · XS–XXL BOUNDS AND SEWLINE OUTLINES</summary>
  <p>This audits the independent grade-draft geometry, including curved boundary samples. It does not prove seam lengths, fabric ease, native Rust source commits or cutting readiness.</p>
  {report&&<>
   <p role="status">{report.ok?'No contour blockers detected.':'Review geometry blockers.'}
    {' '}{report.blocks?.length||0} blocks, {report.issues?.length||0} geometry findings.
   </p>
   {(report.blocks||[]).map(block=><details key={block.panelId}>
    <summary>{block.panelId} · {block.rows?.length||0} named sizes</summary>
    <div style={{overflowX:'auto'}}>
     <table aria-label={`Native graded ${block.panelId} physical dimensions`} style={{width:'100%',fontSize:10,fontVariantNumeric:'tabular-nums'}}>
      <thead><tr><th>Size</th><th>Width mm</th><th>Height mm</th><th>Perimeter mm</th><th>Area mm²</th></tr></thead>
      <tbody>{(block.rows||[]).map(row=><tr key={row.size}>
       <td>{row.size}</td><td>{fmt(row.widthMm)}</td><td>{fmt(row.heightMm)}</td>
       <td>{fmt(row.perimeterMm)}</td><td>{fmt(row.areaMm2)}</td>
      </tr>)}</tbody>
     </table>
    </div>
   </details>)}
   {(report.issues||[]).length>0&&<details open>
    <summary>{report.issues.length} geometry blocker(s)</summary>
    <ul>{report.issues.slice(0,35).map((issue,i)=><li key={i}>
     {issue.panelId||'Native source'}{issue.size?` · ${issue.size}`:''}: {issue.code} · {issue.message}
    </li>)}</ul>
   </details>}
   <small>All-size numeric contour evaluation is diagnostic only, not industrial grading approval.</small>
  </>}
 </details>
}
