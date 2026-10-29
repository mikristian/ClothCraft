import {useMemo} from 'react'
import {buildSewingAssemblyWorkflow20261024} from '../core/sewingAssemblyWorkflow20261024.js'
import {inspectSewingFitVerification20261024} from '../core/sewingFitVerification20261024.js'
import {proposeSewingMismatchCalibration20261024} from '../core/sewingMismatchRepair20261024.js'

const stages=['Shoulder assembly','Neck and collar','Sleeves and armholes','Sides and underarms','Finishing seams','Other sewing']
const pretty=step=>step.relation==='join-panels'?'Join panels':step.relation==='self-sew'?'Join edges on one panel':'Close remaining seam'

/** Sewing order and physical-cutline readiness, derived from saved project geometry. */
export default function SewingAssemblyInspector20261024({project,onSelectSeam,onAddNotches,onLoadMatchedTee,ppfJob,nativeResult,nativeAssembly}){
  const report=useMemo(()=>buildSewingAssemblyWorkflow20261024(project),[project])
  const physical=useMemo(()=>inspectSewingFitVerification20261024({ppfJob,nativeResult,nativeAssembly}),
    [ppfJob,nativeResult,nativeAssembly])
  const calibration=useMemo(()=>proposeSewingMismatchCalibration20261024(project),[project])
  const missing=report.issues?.filter(issue=>issue.code==='SEAM_LENGTH_MISMATCH'||issue.code==='GRADED_SEAM_MISMATCH').length||0
  return <div className="panel-section" data-sewing-assembly-workflow="true">
    <div className="panel-title"><span>Assembly sequence</span><strong>{report.stepCount||0} STEPS</strong></div>
    <p className="panel-copy" role="status" data-assembly-ready={String(Boolean(report.assemblyReady))}>
      {report.ok?'Geometry checks passed':'Assembly checks require attention'} · {report.components?.length||0} panel group(s) · {report.checkedSizes?.length||0} graded sizes checked · {report.blockers||0} findings.
    </p>
    <p className="panel-copy">Sequence groups saved sewing relationships. Select any step to inspect its actual cutline walk, lengths and correspondence. Checks use centimetres and account for Bézier curves and partial ranges. A stitch-length check cannot certify physical drape or factory fit.</p>
    <div className="sewing-audit-detail" data-physical-fit-status={physical.status}>
      <strong>3D sewing and collision evidence · {physical.status.replaceAll('_',' ')}</strong>
      <p className="panel-copy">2D seam geometry, numeric seam closure and actual physical fit are separate checks. A factory-ready garment requires full-frame collision, strain, sewing and fit acceptance.</p>
      {physical.issues.slice(0,5).map((issue,index)=><p key={index} className="panel-copy">{issue}</p>)}
    </div>
    {report.issues?.length>0&&<details className="sewing-audit-detail" open={!report.steps?.length}>
      <summary>Review assembly findings ({report.issues.length}{missing?`, ${missing} length differences`:''})</summary>
      {report.issues.slice(0,24).map((issue,index)=><p key={index} className="panel-copy">
        <strong>{issue.code.replaceAll('_',' ')}</strong> {issue.seamId||''}{issue.size?` · ${issue.size}`:''}: {issue.detail}
      </p>)}
      {report.issues.length>24&&<p className="panel-copy">Showing 24 of {report.issues.length} findings. Resolve the displayed issues and inspect again.</p>}
    </details>}
    {calibration.ok&&calibration.affectedSeams>0&&<details className="sewing-audit-detail">
      <summary>Measured sleeve and seam trueing requirements · {calibration.affectedSeams} affected joins</summary>
      <p className="panel-copy">Each row measures actual curved stitchline lengths at every graded size. The curves, pattern notches and shared seam references must be reconstructed together before assembly. No geometry has been changed by this analysis.</p>
      {calibration.proposals.map(proposal=><details key={proposal.seamId}>
        <summary>{proposal.name} · examine {proposal.measurements.length} sizes</summary>
        <table style={{width:'100%',fontSize:'0.78rem'}}>
          <thead><tr><th>Size</th><th>A cm</th><th>B cm</th><th>Difference</th></tr></thead>
          <tbody>{proposal.measurements.map(size=><tr key={size.size}>
            <td>{size.size}</td><td>{size.sourceLengthCm.toFixed(2)}</td>
            <td>{size.targetLengthCm.toFixed(2)}</td>
            <td>{size.mismatchCm.toFixed(2)} cm · {size.mismatchPercent.toFixed(1)}%</td>
          </tr>)}</tbody>
        </table>
        <button type="button" onClick={()=>onSelectSeam?.(proposal.seamId)}>INSPECT THIS SEAM</button>
      </details>)}
    </details>}
    {project?.id==='project-essential-shell'&&!project?.templateId&&calibration?.affectedSeams>0&&onLoadMatchedTee&&
      <div className="sewing-audit-detail">
        <strong>Corrected graded tee available</strong>
        <p className="panel-copy">The newer Foundation Tee uses a coordinated body, sleeve and grading block that passes stitch-length checks across XS–XXL. Opening it replaces the current Essential Shell project in the editor, with Undo available. Existing custom edits should be saved separately before switching. The Foundation Tee still requires actual physical fitting.</p>
        <button type="button" onClick={onLoadMatchedTee}>OPEN MATCHED FOUNDATION TEE · REPLACE CURRENT PROJECT</button>
      </div>}
    {!calibration.ok&&<p className="panel-copy">Sleeve calibration preflight refused this project: {calibration.detail}</p>}
    {report.steps?.length>0&&<details open>
      <summary>Sewing order · select a relationship to inspect</summary>
      <ol style={{paddingLeft:20,marginTop:12}}>
        {report.steps.map(step=><li key={step.seamId} style={{marginBottom:10}}>
          <strong>{step.name}</strong> · {pretty(step)}<br/>
          <small>{stages[step.phase]} · {step.sourcePieceId} ↔ {step.targetPieceId} · {step.sourceLengthCm.toFixed(2)} / {step.targetLengthCm.toFixed(2)} cm{step.partial?' · partial seam':''}</small>
          <div className="seam-quick-actions">
            <button type="button" onClick={()=>onSelectSeam?.(step.seamId)}>INSPECT SEAM</button>
            <button type="button" onClick={()=>onAddNotches?.(step.seamId)}>ADD MATCH NOTCHES</button>
            {step.blocked&&<small>Check mismatch or attachment before assembly</small>}
          </div>
        </li>)}
      </ol>
    </details>}
  </div>
}
