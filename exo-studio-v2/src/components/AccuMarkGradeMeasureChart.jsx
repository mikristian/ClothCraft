import React,{useEffect,useState} from 'react'
import {buildAccuMarkGradeMeasureChart} from '../core/accumarkGradeMeasureChart20261023.js'
import './AccuMarkEngineeringControls.css'

const parseEdges = text => {
  const values=text.split(',').map(s=>s.trim())
  if(!values.length||values.some(s=>!/^\d+$/.test(s)))throw Error('Use comma-separated zero-based edge indices, for example 1,2')
  return values.map(Number)
}
const fmt = value => Number.isFinite(value)?value.toFixed(3):'—'

/** Read-only true sampled sewline lengths for every graded size. */
export default function AccuMarkGradeMeasureChart({project,piece,disabled=false}){
  const [edges,setEdges]=useState('0')
  const [compare,setCompare]=useState(false)
  const [otherId,setOtherId]=useState('')
  const [otherEdges,setOtherEdges]=useState('0')
  const [chart,setChart]=useState(null)
  const [error,setError]=useState('')
  const choices=project?.pieces||[]
  useEffect(()=>{setEdges('0');setOtherId('');setOtherEdges('0');setChart(null);setError('')},[piece?.id])
  useEffect(()=>{setChart(null)},[project])
  const calculate=()=>{
    try{
      if(!piece)throw Error('Select a pattern piece')
      const args={pieceId:piece.id,edgeIndices:parseEdges(edges)}
      if(compare){args.comparePieceId=otherId||piece.id;args.compareEdgeIndices=parseEdges(otherEdges)}
      const next=buildAccuMarkGradeMeasureChart(project,args)
      setChart({...next,source:piece.name,other:compare?(choices.find(p=>p.id===args.comparePieceId)?.name||args.comparePieceId):null})
      setError('')
    }catch(e){setChart(null);setError(e.message||String(e))}
  }
  const exportCsv=()=>{
    if(!chart)return
    const columns=['size','totalCm','baseDeltaCm',...(chart.other?['compareTotalCm','differenceCm']:[])]
    const cells=[columns.join(','),...chart.rows.map(row=>columns.map(key=>row[key]??'').join(','))]
    const blob=new Blob([cells.join('\n')+'\n'],{type:'text/csv;charset=utf-8'})
    const url=URL.createObjectURL(blob)
    const anchor=document.createElement('a');anchor.href=url;anchor.download='exo-graded-sewline-measurements.csv';anchor.click()
    window.setTimeout(()=>URL.revokeObjectURL(url),3000)
  }
  return <section className="exo-accu-engine-controls" aria-label="All-size line measurement chart">
    <details>
      <summary>Grade Measure · sewing edge lengths across all sizes</summary>
      <fieldset disabled={disabled||!piece}>
        <p>Measure actual sampled stitch paths after grading, including curved edges. Enter zero-based edge indices and optionally compare another seam. Results use centimetres.</p>
        <label>Piece edges<input aria-label="Graded measurement edge indices" value={edges} onChange={e=>setEdges(e.target.value)} placeholder="1,2"/></label>
        <label style={{display:'flex',flexDirection:'row',alignItems:'center'}}><input type="checkbox" aria-label="Compare another sewing edge" style={{width:'auto',height:'auto'}} checked={compare} onChange={e=>setCompare(e.target.checked)}/>Compare against another piece or edge</label>
        {compare&&<div className="exo-engine-row"><label>Comparison piece<select aria-label="Compare graded pattern piece" value={otherId||piece?.id||''} onChange={e=>setOtherId(e.target.value)}>{choices.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Comparison edges<input aria-label="Compare graded measurement edge indices" value={otherEdges} onChange={e=>setOtherEdges(e.target.value)}/></label></div>}
        <button type="button" onClick={calculate}>Measure all graded sizes</button>
      </fieldset>
      {error&&<p role="alert" className="exo-engine-error">{error}</p>}
      {chart&&<div style={{padding:'8px 11px 12px',overflowX:'auto'}}>
        <table aria-label="Graded line length measurement results" style={{borderCollapse:'collapse',width:'100%',fontVariantNumeric:'tabular-nums',fontSize:'10px'}}>
          <thead><tr><th style={{textAlign:'left'}}>Size</th><th>Length cm</th><th>Δ base cm</th>{chart.other&&<><th>Compare cm</th><th>Difference cm</th></>}</tr></thead>
          <tbody>{chart.rows.map(row=><tr key={row.size}><th style={{textAlign:'left',padding:'5px 2px'}}>{row.size}</th><td style={{textAlign:'right'}}>{fmt(row.totalCm)}</td><td style={{textAlign:'right'}}>{fmt(row.baseDeltaCm)}</td>{chart.other&&<><td style={{textAlign:'right'}}>{fmt(row.compareTotalCm)}</td><td style={{textAlign:'right'}}>{fmt(row.differenceCm)}</td></>}</tr>)}</tbody>
        </table>
        <button type="button" style={{marginTop:8}} onClick={exportCsv}>Export measurement CSV</button>
        <small>Stitch lengths are diagnostic comparisons; seam ease, alignment and cutting approval require separate QA.</small>
      </div>}
    </details>
  </section>
}
