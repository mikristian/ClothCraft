import React,{useMemo,useState} from 'react'
import {inspectAccuMarkNativeGradePoint20261023} from '../core/accumarkNativeGradePointInspector20261023.js'

const mm=n=>Number.isFinite(n)?n.toFixed(2):'—'

/** Read-only numeric inspector for every named native proposed size. */
export default function AccuMarkNativeGradePointInspector20261023({proposal,selectedPointIndex=null,onSelectPoint=null}){
 const [fallback,setFallback]=useState(0)
 const count=proposal?.basePolygon?.points?.length||0
 const picked=Number.isInteger(selectedPointIndex)&&selectedPointIndex>=0&&selectedPointIndex<count?selectedPointIndex:
  Math.min(fallback,Math.max(0,count-1))
 const table=useMemo(()=>inspectAccuMarkNativeGradePoint20261023(proposal,{pointIndex:picked}),[proposal,picked])
 if(!proposal?.ok)return null
 return <details data-native-grade-point-matrix="true" style={{padding:'4px 3px'}}>
  <summary>GRADE POINT TABLE · XS–XXL</summary>
  <p>Inspect point-by-point X/Y movements. These are read-only, independently computed affine proposals, not persisted industrial grading rules.</p>
  <label>Native point<select aria-label="Native graded point to inspect" value={picked}
   onChange={event=>{const index=Number(event.target.value);setFallback(index);onSelectPoint?.(index)}}>
   {proposal.basePolygon.points.map((point,index)=><option key={index} value={index}>P{index+1}</option>)}
  </select></label>
  {table.ok?<div style={{overflowX:'auto'}}>
   <table aria-label="Native graded point XYZ movement by size" style={{width:'100%',fontSize:11,fontVariantNumeric:'tabular-nums'}}>
    <thead><tr><th>Size</th><th>X mm</th><th>Y mm</th><th>ΔX mm</th><th>ΔY mm</th></tr></thead>
    <tbody>{table.rows.map(row=><tr key={row.size} style={{fontWeight:row.size===table.selectedSize?'bold':'normal'}}>
     <td>{row.size}{row.size===table.baseSize?' *':''}</td><td>{mm(row.xMm)}</td><td>{mm(row.yMm)}</td>
     <td>{mm(row.dxMm)}</td><td>{mm(row.dyMm)}</td>
    </tr>)}</tbody>
   </table>
  </div>:<p role="alert">{table.reason}</p>}
  <small>{table.ok&&table.accuracy==='approximate'?'Curved compiled bounds: proposal accuracy approximate. ':' '}
   Values describe uncommitted previews only. Native persistent per-point grade-rule authoring still requires backend implementation.
  </small>
 </details>
}
