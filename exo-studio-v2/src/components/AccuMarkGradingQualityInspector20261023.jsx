import React,{useMemo,useState} from 'react'
import {inspectAccuMarkGradingQualityMatrix} from '../core/accumarkGradingQualityMatrix20261023.js'
import './AccuMarkEngineeringControls.css'

const fixed=n=>Number.isFinite(n)?n.toFixed(3):'—'

/** Read-only all-block grading quality dashboard. Metrics are actual graded
 * stitchline curves and partial sewn edges, NOT a factory pass certificate. */
export default function AccuMarkGradingQualityInspector20261023({project,selectedPieceId=null}){
 const [open,setOpen]=useState(false)
 const [scope,setScope]=useState('all')
 const [tolerance,setTolerance]=useState('0.3')
 const [seamOnly,setSeamOnly]=useState(false)
 const [size,setSize]=useState('all')
 const report=useMemo(()=>{
  if(!open||!project)return null
  try{
   const cm=Number(tolerance)
   return inspectAccuMarkGradingQualityMatrix(project,{
    pieceIds:scope==='selected'&&selectedPieceId?[selectedPieceId]:undefined,
    maxSeamMismatchCm:tolerance.trim()!==''?cm:NaN,
   })
  }catch(error){return {ok:false,issues:[{code:'QUALITY_MATRIX_FAILED',message:error.message,severity:'blocker'}],blocks:[],seamPairs:[],sizes:[]}}
 },[project,selectedPieceId,scope,tolerance,open])
 const exportCsv=()=>{
  if(!report)return
  const escape=text=>'"'+String(text??'').replaceAll('"','""')+'"'
  const output=[['kind','piece','seam','size','width_cm','height_cm','perimeter_cm','area_cm2','seam_a_cm','seam_b_cm','difference_cm','passing'].join(',')]
  for(const block of report.blocks)for(const row of block.rows)output.push([
   'piece',block.pieceId,'',row.size,...[row.widthCm,row.heightCm,row.perimeterCm,row.areaCm].map(fixed),'','','','',
  ].map(escape).join(','))
  for(const seam of report.seamPairs)for(const row of seam.rows)output.push([
   'seam','',seam.seamId,row.size,'','','','',fixed(row.lenACm),fixed(row.lenBCm),fixed(row.deltaCm),String(row.pass),
  ].map(escape).join(','))
  const blob=new Blob([output.join('\n')+'\n'],{type:'text/csv;charset=utf-8'})
  const url=URL.createObjectURL(blob),anchor=document.createElement('a')
  anchor.href=url;anchor.download='exo-grading-size-run-quality.csv';anchor.click()
  URL.revokeObjectURL(url)
 }
 return <section className="exo-accu-engine-controls" aria-label="All-block grading engineering quality audit">
  <details onToggle={event=>setOpen(event.currentTarget.open)}>
   <summary>All-Size Grading QA · Block dimensions and sewline matching</summary>
   <p>Audit actual graded stitchline lengths, curved edges, piece dimensions and partial sewing intervals across the complete size line. Blocks and seam differences are not manufacturing certification.</p>
   <div className="exo-engine-row">
    <label>Pieces<select aria-label="Grade QA block scope" value={scope} onChange={event=>setScope(event.target.value)}>
     <option value="all">All blocks</option><option value="selected">Selected block and its seams</option>
    </select></label>
    <label>Seam tolerance (cm)<input aria-label="Grade QA maximum seam mismatch cm" type="number" min="0" step=".05" value={tolerance} onChange={event=>setTolerance(event.target.value)}/></label>
    <label>Size<select aria-label="Grade QA size display filter" value={size} onChange={event=>setSize(event.target.value)}>
     <option value="all">All sizes</option>
     {(project?.grading?.sizes||[]).map(s=><option value={s} key={s}>{s}</option>)}
    </select></label>
   </div>
   {report&&<>
    <p role="status">{report.ok?'No grading geometry or sewn-length blockers found.':'Grading audit contains blockers.'}
     {' '}{report.blocks?.length||0} blocks · {report.seamPairs?.length||0} seams · {report.sizes?.length||0} sizes · {report.issues?.length||0} blockers.
    </p>
    <button type="button" onClick={exportCsv} disabled={!report.blocks?.length}>Export graded dimensions and seam table CSV</button>
    <label style={{display:'flex',alignItems:'center',gap:5}}>
     <input type="checkbox" checked={seamOnly} onChange={event=>setSeamOnly(event.target.checked)}/> Show sewing mismatch table only
    </label>
    {!seamOnly&&report.blocks?.map(block=><details key={block.pieceId}>
     <summary>{block.name||block.pieceId} · {block.rows.length} graded sizes</summary>
     <div style={{overflowX:'auto'}}><table style={{width:'100%',fontSize:10,fontVariantNumeric:'tabular-nums'}} aria-label={`${block.name} all-size graded geometry`}>
      <thead><tr><th>Size</th><th>Width cm</th><th>Height cm</th><th>Perimeter cm</th><th>Area cm²</th><th>Points</th></tr></thead>
      <tbody>{block.rows.filter(row=>size==='all'||row.size===size).map(row=><tr key={row.size}>
       <td>{row.size}</td><td>{fixed(row.widthCm)}</td><td>{fixed(row.heightCm)}</td>
       <td>{fixed(row.perimeterCm)}</td><td>{fixed(row.areaCm)}</td><td>{row.pointCount}</td>
      </tr>)}</tbody>
     </table></div>
    </details>)}
    {report.seamPairs?.length>0&&<details open={seamOnly||!report.ok}>
     <summary>All-size stitchline seam differences · {report.seamPairs.length} sewn pair(s)</summary>
     <div style={{overflowX:'auto'}}><table aria-label="Graded seam matching by size" style={{width:'100%',fontSize:10,fontVariantNumeric:'tabular-nums'}}>
      <thead><tr><th>Seam</th><th>Size</th><th>A cm</th><th>B cm</th><th>Difference</th><th>Status</th></tr></thead>
      <tbody>{report.seamPairs.flatMap(seam=>seam.rows.filter(row=>size==='all'||row.size===size).map(row=><tr key={`${seam.seamId}:${row.size}`}>
       <td>{seam.seamId}</td><td>{row.size}</td><td>{fixed(row.lenACm)}</td><td>{fixed(row.lenBCm)}</td>
       <td>{fixed(row.deltaCm)}</td><td>{row.pass?'Within tolerance':'Mismatch'}</td>
      </tr>))}</tbody>
     </table></div>
    </details>}
    {report.issues?.length>0&&<details open>
     <summary>Grade and seam blockers ({report.issues.length})</summary>
     <ul>{report.issues.slice(0,50).map((issue,i)=><li key={i}>
      {issue.code}{issue.pieceId?` · ${issue.pieceId}`:''}{issue.size?` · ${issue.size}`:''}: {issue.message}
     </li>)}</ul>
     {report.issues.length>50&&<p>First 50 blockers displayed; the run must be corrected before manufacturing handoff.</p>}
    </details>}
    <small>Read-only diagnosis. A zero-blocker result is not an approval of physical cutting, alignment marks, vendor DXF/AAMA exchange or actual garment fit.</small>
   </>}
  </details>
 </section>
}
