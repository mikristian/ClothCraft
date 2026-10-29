import React,{useState} from 'react'
import {
  analyzeModarisSeamWalking20261027,
  seamWalkingSourceToken20261027,
} from '../core/modarisSeamWalking20261027.js'

const mm=value=>Number.isFinite(value)?(value*10).toFixed(2):'—'

/** Read-only industrial patternmaking comparison. This does not true seams,
 * distribute ease, change notch positions, or certify an exported cutline. */
export default function ModarisSeamWalkInspector20261027({project,nativeMode=false,disabled=false}){
  const [seamId,setSeamId]=useState('')
  const [additionalIds,setAdditionalIds]=useState('')
  const [tolerance,setTolerance]=useState('0.15')
  const [selected,setSelected]=useState(null)
  const seam=(project?.seams||[]).find(item=>item.id===seamId)
  const seamIds=seamId?[seamId,...additionalIds.split(',').map(id=>id.trim()).filter(Boolean)]:[]
  const snapshotToken=seamWalkingSourceToken20261027(project,seamIds)
  const stale=Boolean(selected)&&selected.sourceToken!==snapshotToken
  const calculate=()=>{
    if(disabled||nativeMode)return
    const sourceToken=seamWalkingSourceToken20261027(project,seamIds)
    const result=analyzeModarisSeamWalking20261027(project,{
      seamId,seamIds,sourceToken,
      sizes:[...(project?.grading?.sizes||[])],
      toleranceCm:tolerance.trim()?Number(tolerance):NaN,
      stationCount:8,
    })
    setSelected({sourceToken,result})
  }
  const report=!stale?selected?.result:null
  return <section data-modaris-seam-walking="read-only" aria-label="Modaris-style seam walk size by size">
    <p>Walk one sewn-edge pair or an explicitly ordered, unbranched path of contiguous sewn edges by physical arclength across the complete graded size run. Inspect signed ease at nine stations. This comparison never moves geometry.</p>
    {nativeMode?<p role="status">Reference-only legacy seam walking. Native Rust seam manipulation is a separate workflow.</p>:<>
      <label>Seam pair <select value={seamId} aria-label="Seam walking target" onChange={event=>{setSeamId(event.target.value);setSelected(null)}}>
        <option value="">Choose an authored sewing pair</option>
        {(project?.seams||[]).map(pair=><option key={pair.id} value={pair.id}>{pair.id}</option>)}
      </select></label>
      <label>Additional contiguous seam IDs, in walking order (comma-separated)
        <input type="text" aria-label="Ordered additional continuous seam IDs"
          placeholder="side_second, side_third" value={additionalIds}
          onChange={event=>{setAdditionalIds(event.target.value);setSelected(null)}}/>
      </label>
      <label>Allowed mismatch (cm) <input type="number" min="0" step=".01" value={tolerance}
        aria-label="Seam walk mismatch tolerance in centimeters" onChange={event=>{setTolerance(event.target.value);setSelected(null)}}/></label>
      <button type="button" disabled={disabled||!seam} onClick={calculate}>Walk ordered sewn path across all sizes</button>
      {stale&&<p role="alert">The seam, source pattern or grading metadata changed. Run seam walking again; previous figures are no longer valid.</p>}
      {report&&!report.ok&&<p role="alert">Seam walking blocked: {report.code} {typeof report.detail==='string'?report.detail:''}</p>}
      {report?.ok&&<>
        <p role="status">{report.status==='within_tolerance'?'All measured size pairs are within the stated tolerance.':'A sewing length mismatch needs review.'} This is not a physical sewn-sample or factory acceptance.</p>
        <div style={{overflowX:'auto'}}><table aria-label="Modaris-style physical seam walk across graded sizes">
          <thead><tr><th>Size</th><th>Side A (mm)</th><th>Side B (mm)</th><th>B − A (mm)</th><th>Required B adjustment (mm)</th><th>Result</th></tr></thead>
          <tbody>{report.results.map(item=><tr key={item.size}><td>{item.size}</td>
            <td>{mm(item.a.lengthCm)}</td><td>{mm(item.b.lengthCm)}</td>
            <td>{mm(item.mismatchCm)}</td><td>{mm(item.easeCorrectionProposal.totalAdjustmentCm)}</td>
            <td>{item.withinTolerance?'Within tolerance':'Mismatch'}</td></tr>)}</tbody>
        </table></div>
        {report.results.map(item=><details key={item.size}>
          <summary>{item.size}: nine matched physical stations · {report.seamIds.length} sewn edge pairs</summary>
          <div style={{overflowX:'auto'}}><table aria-label={`Physical sewing stations for ${item.size}`}>
            <thead><tr><th>%</th><th>A station (mm)</th><th>B station (mm)</th><th>Signed ease (mm)</th><th>A edge / t</th><th>B edge / t</th></tr></thead>
            <tbody>{item.stations.map((station,index)=><tr key={index}>
              <td>{(station.fraction*100).toFixed(1)}</td>
              <td>{mm(station.stationACm)}</td><td>{mm(station.stationBCm)}</td>
              <td>{mm(station.cumulativeEaseCm)}</td>
              <td>{station.locationA?station.locationA.edgeIndex+1:'—'} / {station.locationA?.t?.toFixed(5)??'—'}</td>
              <td>{station.locationB?station.locationB.edgeIndex+1:'—'} / {station.locationB?.t?.toFixed(5)??'—'}</td>
            </tr>)}</tbody>
          </table></div>
        </details>)}
      </>}
    </>}
    <small>Ordered, unbranched authored edge ranges only; legacy straight/quadratic curves and size-run grading. Disconnected or branched paths refuse analysis. Full Modaris industrial seam trueing, grade propagation and CUT certification are not implemented.</small>
  </section>
}
