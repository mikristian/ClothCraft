import React,{useMemo} from 'react'
import {inspectNativeGradedFitEvidence20261025} from '../core/nativeGradedFitEvidence20261025.js'
const millimetres=value=>typeof value==='number'&&Number.isFinite(value)?value.toFixed(2)+' mm':'—'
export default function NativeGradedFitEvidence20261025({snapshot}){
  const fit=useMemo(()=>inspectNativeGradedFitEvidence20261025(snapshot),[snapshot])
  return <section className="exo-grading-qa exo-grading-native-fit" aria-label="Current native graded 3D fitting evidence"
    data-native-fit-state={fit.stage} data-native-fit-size={fit.size??''}>
    <header className="exo-grading-qa-heading">
      <strong>Native 3D fit · {fit.size||'No size'}</strong>
      <span>{fit.stepVerified?'SOLVER STEPPED':fit.stage==='compiled-only'?'MESH COMPILED':'NOT VERIFIED'}</span>
    </header>
    <p role="status">{fit.reason}</p>
    {fit.stepVerified&&<>
      <div className="exo-grading-qa-metrics">
        <div><strong>{fit.simulationTimeSeconds.toFixed(3)} s</strong><span>Native simulation time</span></div>
        <div><strong>{fit.seamCount}</strong><span>Native sewn constraints</span></div>
        <div><strong>{millimetres(fit.maxGapMm)}</strong><span>Maximum seam gap</span></div>
        <div><strong>{millimetres(fit.maxRmsGapMm)}</strong><span>Maximum seam RMS gap</span></div>
      </div>
      {fit.rows.length>0&&<div className="exo-grading-qa-table-scroll">
        <table aria-label={`Native ${fit.size} sewn mesh gap measurements`}>
          <thead><tr><th>Native seam</th><th>Maximum gap</th><th>RMS gap</th><th>Provisional 2 mm</th></tr></thead>
          <tbody>{[...fit.rows].sort((a,b)=>b.maxGapMm-a.maxGapMm).slice(0,24).map(row=>
            <tr key={row.seamId}><th>{row.seamId}</th><td>{millimetres(row.maxGapMm)}</td>
              <td>{millimetres(row.rmsGapMm)}</td><td>{row.withinProvisional2Mm?'Within':'Review'}</td></tr>)}</tbody>
        </table>
      </div>}
    </>}
    <footer>Engineering measurements for this active size only. Run fitting simulation to collect time-linked native seam metrics. Compiled mesh and provisional 2 mm seam gaps do not certify physical fit, collision clearance, folded construction or manufacturing readiness. Restore the original garment before editing grading rules.</footer>
  </section>
}
