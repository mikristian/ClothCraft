import React,{useEffect,useMemo,useState} from 'react'
import {inspectNativeGradingWorkflow20261025} from '../core/nativeGradingWorkflowReadiness20261025.js'
import {inspectNativeGradingPOM20261025} from '../core/nativeGradingPOM20261025.js'
import {inspectNativeGradeActivationEnvelope20261025} from '../core/nativeGradeActivationEnvelope20261025.js'
import {inspectNativeGradeMeasurementMatrix20261025,
  exportNativeGradeMeasurementCsv20261025} from '../core/nativeGradeFactoryMeasurementMatrix20261025.js'
import {summarizeNativeGradingSizes20261025} from '../core/nativeGradingSizeReview20261025.js'
import {proposeNativeGradedSeamMatch20261025} from '../core/nativeGradedSeamMatchProposal20261025.js'
import {isVerifiedNativeGradeStatusCurrent20261026} from '../core/nativeGradeCatalogBridge20261025.js'

const fmm=value=>Number.isFinite(value)?value.toFixed(1)+' mm':'—'

/** One readable QA surface fed by the SAME native six-size sidecar and
 * source revision as the point-rule editor, nest and production studies. */
export default function NativeGradingQualityDashboard20261025({snapshot,ruleSet,selectedSize='M',onSelectSize,
  pomDefinitions=[],nativeCatalog=null,onGoRules,onGoMeasurements,onApplyGradeRules,
  editingDisabled=false}){
  const [showDetails,setShowDetails]=useState(false)
  const [showEdgeMatrix,setShowEdgeMatrix]=useState(false)
  const [seamSuggestion,setSeamSuggestion]=useState(null)
  const [seamSuggestionError,setSeamSuggestionError]=useState('')
  useEffect(()=>{setSeamSuggestion(null);setSeamSuggestionError('')},
    [snapshot?.revision,snapshot?.template,ruleSet,selectedSize])
  const report=useMemo(()=>inspectNativeGradingWorkflow20261025(snapshot,ruleSet),
    [snapshot?.revision,snapshot?.template,ruleSet])
  const pom=useMemo(()=>inspectNativeGradingPOM20261025(snapshot,ruleSet,pomDefinitions),
    [snapshot?.revision,snapshot?.template,ruleSet,pomDefinitions])
  const activationBounds=useMemo(()=>inspectNativeGradeActivationEnvelope20261025(snapshot,ruleSet),
    [snapshot?.revision,snapshot?.template,ruleSet])
  const activated=Boolean(snapshot?.activeGradedSize)
  // The persisted preview badge compares the exact native-verified size rules,
  // authored template, source revision and POM draft. A changed point rule may
  // leave the legacy template fingerprint unchanged, so it is insufficient.
  const persisted=isVerifiedNativeGradeStatusCurrent20261026(
    nativeCatalog,snapshot,ruleSet,pomDefinitions)
  const matrix=useMemo(()=>activated?null:inspectNativeGradeMeasurementMatrix20261025(snapshot,ruleSet,pomDefinitions),
    [snapshot?.revision,snapshot?.template,ruleSet,pomDefinitions,activated])
  const currentEdges=(matrix?.edgeRows||[]).filter(row=>row.size===selectedSize)
  const sizeReview=useMemo(()=>summarizeNativeGradingSizes20261025(report,pom,pomDefinitions.length),
    [report,pom,pomDefinitions.length])
  const selectedReview=sizeReview.find(row=>row.size===selectedSize)
  const currentPoms=(pom.rows||[]).filter(row=>row.size===selectedSize)
  const reviewPassed=sizeReview.filter(row=>row.draftingChecksPass).length
  const currentSizeIndex=sizeReview.findIndex(row=>row.size===selectedSize)
  const nextSizeToReview=Array.from({length:sizeReview.length-1},(_,step)=>
    sizeReview[(Math.max(0,currentSizeIndex)+step+1)%sizeReview.length])
    .find(row=>!row.geometryDiagnosticPass||!row.sewingPass||!row.pomPass)
  const allFindings=report.issues.length+(pom.issues?.length||0)
  const downloadMatrix=()=>{
    if(!matrix?.ok)return
    const blob=new Blob([exportNativeGradeMeasurementCsv20261025(matrix)],{type:'text/csv;charset=utf-8'})
    const url=URL.createObjectURL(blob),link=document.createElement('a')
    try{
      link.href=url;link.download=`exo-six-size-grade-metrology-source-only-r${matrix.sourceRevision??'unknown'}.csv`
      document.body.appendChild(link);link.click()
    }finally{link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000)}
  }
  const current=(report.sewing?.rows||[]).filter(row=>row.size===selectedSize)
  const mismatches=(report.sewing?.rows||[]).filter(row=>!row.pass)
  const proposeSewnRepair=seamId=>{
    setSeamSuggestion(null);setSeamSuggestionError('')
    const proposal=proposeNativeGradedSeamMatch20261025(snapshot,ruleSet,{seamId,size:selectedSize})
    if(!proposal.ok){setSeamSuggestionError(proposal.reason);return}
    setSeamSuggestion({...proposal,sourceRules:ruleSet,sourceSnapshot:snapshot,seamId,size:selectedSize})
  }
  const applySewnRepair=()=>{
    if(!seamSuggestion||seamSuggestion.sourceRules!==ruleSet||
      seamSuggestion.sourceSnapshot!==snapshot||seamSuggestion.size!==selectedSize)return
    onApplyGradeRules?.(seamSuggestion.ruleSet)
    setSeamSuggestion(null)
  }
  const cutIssues=matrix?.cutPreflight?.issues||[]
  const sizeAnnotations=matrix?.cutPreflight?.gradedAnnotations?.rows?.filter(row=>row.size===selectedSize)||[]
  const sizeStations=matrix?.cutPreflight?.gradedAnnotations?.stations?.filter(row=>row.size===selectedSize)||[]
  const sizeCutIssues=cutIssues.filter(issue=>issue.size===selectedSize)
  const cutFindingCounts=Object.entries(cutIssues.reduce((out,issue)=>{
    out[issue.code]=(out[issue.code]||0)+1;return out
  },{})).sort((a,b)=>b[1]-a[1])
  return <section className="exo-grading-qa" aria-label="Unified native size grading quality">
    <header className="exo-grading-qa-heading">
      <strong>All-size grading verification</strong>
      <span data-grade-qa-state={report.stage}>{report.stage==='source-verified'?'CONTOURS + SEAMS PASS':
        report.stage==='needs-sewing'?'SEWING NOT VERIFIED':'REVIEW REQUIRED'}</span>
    </header>
    <div className="exo-grading-qa-metrics">
      <div><strong>{reviewPassed} / 6</strong><span>Draft checks complete</span></div>
      <div><strong>{report.panelCount||'—'}</strong><span>Graded pieces</span></div>
      <div><strong>{report.seamCount}</strong><span>Linked seams</span></div>
      <div><strong>{allFindings}</strong><span>Geometry, seam & POM findings</span></div>
    </div>
    <div className="exo-grading-qa-size-review" role="group" aria-label="Review grading measurements by size"
      data-grade-size-review="true">
      <div className="exo-grading-qa-size-heading"><strong>Inspect each size</strong>
        <span>Measured contours, sewn seams and drafted POM targets</span>
        {nextSizeToReview&&onSelectSize&&<button type="button" data-grade-next-size-review="true"
          onClick={()=>onSelectSize(nextSizeToReview.size)}>
          Review next: {nextSizeToReview.size}
        </button>}</div>
      <div className="exo-grading-qa-size-options">
        {sizeReview.map(row=><button type="button" key={row.size}
          aria-label={`Inspect ${row.size} graded measurements`}
          aria-pressed={row.size===selectedSize}
          data-grade-size-status={row.draftingChecksPass?'pass':'review'}
          data-grade-size={row.size}
          onClick={()=>onSelectSize?.(row.size)}>
          <strong>{row.size}</strong><small>{row.draftingChecksPass?'Checks pass':'Review'}</small>
        </button>)}
      </div>
      {selectedReview&&<div className="exo-grading-qa-size-diagnostics"
        data-grade-selected-size={selectedSize}>
        <span>Contour <strong>{selectedReview.geometryPass?'PASS':selectedReview.geometryDiagnosticPass?'LOCAL OK · SOURCE BLOCKED':'REVIEW'}</strong></span>
        <span>Seams <strong>{selectedReview.sewnExpected?selectedReview.sewnPassed+' / '+selectedReview.sewnExpected:'Not defined'}</strong></span>
        <span>POM <strong>{selectedReview.pomExpected?selectedReview.pomPassed+' / '+selectedReview.pomExpected:'Not defined'}</strong></span>
      </div>}
      {selectedReview?.findings.length>0&&<div className="exo-grading-qa-size-findings"
        data-grade-size-findings={selectedSize}>
        <strong>{selectedSize} — review these checks</strong>
        <ul>{selectedReview.findings.slice(0,8).map((finding,index)=><li key={index}>{finding}</li>)}</ul>
        {selectedReview.findings.length>8&&<small>{selectedReview.findings.length-8} additional findings in the source-level audit.</small>}
      </div>}
    </div>
    <div className="exo-grading-qa-checks">
      <p><strong>{report.previewReady?'PASS':'BLOCKED'}</strong> Curve-aware geometry, grade contours and bounds across all six sizes</p>
      <p><strong>{report.sewingReady?'PASS':'UNVERIFIED'}</strong> Actual sewn arclength differences within 2 mm on every size</p>
      <p data-grade-native-activation-bounds={activationBounds.nativeActivationReady?'pass':'blocked'}>
        <strong>{activationBounds.nativeActivationReady?'PASS':'BLOCKED'}</strong> Native six-size fitting envelope review. {activationBounds.temporaryEnvelopeOnly?
          'The current size outlines require temporary positive compile bounds. The saved source pattern envelope and factory instructions remain unchanged.':activationBounds.nativeActivationReady?
          'All six sized polygons remain within the authored source bounds.':
          'A negative, nonfinite or oversized graded point cannot be activated in the native 2D/3D fitting view.'}
      </p>
      {(!activationBounds.nativeActivationReady||activationBounds.temporaryEnvelopeOnly)&&activationBounds.panelRequirements?.length>0&&
        <div className="exo-grading-envelope-guide" aria-label="Native grade source envelope corrections" data-grade-envelope-fixes="true">
          <strong>{activationBounds.temporaryEnvelopeOnly?'Native preview: temporary bounds required':'Native activation: source pattern bounds to review'}</strong>
          <p>{activationBounds.temporaryEnvelopeOnly?
            'The native grader will derive a temporary positive envelope from these source-linked size outlines; the original pattern metadata is preserved. These derived bounds do not certify cutting dimensions.':
            'These are measured from the six drafted size outlines. Correct negative or oversized geometry before saving a native size run.'}</p>
          {activationBounds.panelRequirements.filter(row=>row.requiresSourceRepositioning||row.canExpandSourceEnvelope)
            .map(row=><div key={row.panelId}>
              <strong>{row.panelId}</strong>
              <span>Authored {row.declaredBoundsMm.map(n=>n.toFixed(1)).join(' × ')} mm</span>
              <span>Required positive extent {row.minimumSourceBoundsMm.map(n=>n.toFixed(1)).join(' × ')} mm</span>
              <small>{row.requiresSourceRepositioning?
                `Graded outline extends into negative coordinates (${row.minimumGradedPointMm.map(n=>n.toFixed(1)).join(', ')} mm); reposition the source geometry and recheck all six sizes.`:
                'The preview uses temporary positive pattern bounds. The authored source envelope is not overwritten.'}</small>
            </div>)}
        </div>}
      <p><strong>{pom.verified?'PASS':'UNVERIFIED'}</strong> {pom.rows?.length||0} drafted material POM checks · six-size targets {pom.verified?'within tolerance':'incomplete or require review'}</p>
      <p><strong>{activated?`NATIVE ${snapshot.activeGradedSize} ACTIVE`:persisted?'NATIVE CATALOG SAVED':'NATIVE CATALOG UNVERIFIED'}</strong> {activated?
        'You are viewing a native 2D/3D fitting preview; restore the base garment for source-linked manufacturing inspection.':
        persisted?'Six sizes persist in the Rust project. Factory CUT and third-party receiver approval are still blocked.':
        'The current browser point rules are not verified as persisted in Rust.'}</p>
    </div>
    {current.length>0&&<div className="exo-grading-qa-table-scroll">
      <table aria-label={`Graded sewn seam measurements for ${selectedSize}`}>
        <thead><tr><th>Sewn edge</th><th>Side A</th><th>Side B</th><th>Mismatch</th><th>Check</th><th>Action</th></tr></thead>
        <tbody>{current.map(row=><tr key={row.seamId} data-grade-seam-check={row.pass?'pass':'review'}>
          <th>{row.seamId}</th><td>{fmm(row.sourceLengthMm)}</td>
          <td>{fmm(row.targetLengthMm)}</td><td>{fmm(row.mismatchMm)}</td><td>{row.pass?'PASS':'REVIEW'}</td>
          <td>{!row.pass&&onApplyGradeRules&&!snapshot?.activeGradedSize&&
            <button type="button" disabled={editingDisabled} aria-label={`Find stitchline correction for ${row.seamId} in ${selectedSize}`}
              onClick={()=>proposeSewnRepair(row.seamId)}>Try correction</button>}</td>
        </tr>)}</tbody>
      </table>
    </div>}
    {seamSuggestionError&&<p role="alert" data-grade-seam-repair-error="true">No safe local seam correction: {seamSuggestionError}</p>}
    {seamSuggestion&&<div className="exo-grading-qa-seam-proposal" role="group"
      aria-label="Review native graded seam correction proposal" data-grade-seam-correction="draft-only">
      <strong>{seamSuggestion.size} · {seamSuggestion.seamId} · suggested source-sidecar correction</strong>
      <p>Physical sewn mismatch: {fmm(seamSuggestion.originalMismatchMm)} → {fmm(seamSuggestion.remainingMismatchMm)}.
        {' '}Move {seamSuggestion.correction.panelId} point {seamSuggestion.correction.pointIndex+1}.
        {' '}{seamSuggestion.selectedSeamWithinTolerance?'Selected seam within provisional 2 mm tolerance.':'Selected seam still needs correction.'}
        {' '}{seamSuggestion.allSizesSewnVerified?'All previously linked size seams pass the current check.':
          `${seamSuggestion.remainingSeamFindings} other physical seam checks still need review.`}</p>
      <p>{seamSuggestion.warning}</p>
      <div className="exo-grading-qa-size-heading">
        <button type="button" disabled={editingDisabled} onClick={applySewnRepair}>Apply to local grading draft</button>
        <button type="button" onClick={()=>setSeamSuggestion(null)}>Discard suggestion</button>
      </div>
    </div>}
    <div className="exo-grading-qa-pom-review" data-grade-pom-review="true">
      <div className="exo-grading-qa-size-heading"><strong>{selectedSize} point-of-measure checks</strong>
        {onGoMeasurements&&<button type="button" onClick={()=>onGoMeasurements({size:selectedSize})}>Edit POM targets</button>}</div>
      {pom.reason&&<p role="status">{pom.reason}</p>}
      {currentPoms.length>0?<div className="exo-grading-qa-table-scroll">
        <table aria-label={`Native ${selectedSize} drafted POM measurements and targets`}>
          <thead><tr><th>Specification</th><th>Measured</th><th>Target</th><th>Difference</th><th>Check</th><th>Action</th></tr></thead>
          <tbody>{currentPoms.map(row=><tr key={row.id} data-grade-pom-check={row.pass?'pass':'review'}>
            <th title={row.panelId}>{row.label}</th><td>{fmm(row.actualMm)}</td>
            <td>{fmm(row.targetMm)}</td><td>{fmm(row.deltaMm)}</td>
            <td>{row.targetMm===null?'UNSET':row.pass?'PASS':'REVIEW'}</td>
            <td>{onGoMeasurements&&<button type="button" aria-label={`Edit ${row.label} for ${selectedSize}`}
              onClick={()=>onGoMeasurements({id:row.id,size:selectedSize})}>Edit</button>}</td>
          </tr>)}</tbody>
        </table>
      </div>:<p>No measurable POM specifications for {selectedSize}. Define a dimension and its targets to review this size.</p>}
    </div>
    {!ruleSet?<button type="button" onClick={onGoRules}>Create grading rules before QA</button>:null}
    {report.issues.length>0&&<details open>
      <summary>Findings ({report.issues.length})</summary>
      <ul>{report.issues.slice(0,16).map((issue,index)=><li key={index}>
        {issue.size?issue.size+' · ':''}{issue.panelId||issue.seamId||'Source'} · {issue.message}
      </li>)}</ul>
    </details>}
    {!activationBounds.ok&&<details open data-grade-native-envelope-issues="true">
      <summary>Native fitting activation boundaries ({activationBounds.issues?.length||1})</summary>
      <p>{activationBounds.reason}. Native fitting derives temporary positive compile bounds without changing the saved pattern; negative, nonfinite and oversized coordinates still need correction in the graded draft.</p>
      {(activationBounds.panelRequirements||[]).filter(row=>row.canExpandSourceEnvelope||row.requiresSourceRepositioning)
        .map(row=><p key={row.panelId} data-grade-native-envelope-suggestion={row.panelId}>
          <strong>{row.panelId}</strong>: current envelope {fmm(row.declaredBoundsMm[0])} × {fmm(row.declaredBoundsMm[1])}.
          {row.requiresSourceRepositioning?
            ` Graded points reach ${fmm(row.minimumGradedPointMm[0])} X and ${fmm(row.minimumGradedPointMm[1])} Y; source geometry needs a positive-origin adjustment before the native engine can activate this size run.`:
            ` Temporary grade-only envelope can reach ${fmm(row.temporaryCompileBoundsMm?.[0])} wide × ${fmm(row.temporaryCompileBoundsMm?.[1])} high without changing the authored source.`}
        </p>)}
      <ul>{(activationBounds.issues||[]).slice(0,12).map((issue,i)=>
        <li key={i}>{issue.message||`${issue.panelId||'Source'}: native envelope unverified`}</li>)}</ul>
    </details>}
    {mismatches.length>0&&<small>{mismatches.length} size-specific sewn intervals require coordinated grade adjustments.</small>}
    <div className="exo-grading-qa-metrology" aria-label="Native graded edge measurement matrix">
      <strong>Physical edge growth and size-break inspection</strong>
      <p>{matrix?.ok?
        `${matrix.edgeCount} named physical edges across all six sizes · ${matrix.edgeRows.length} measured material-space edge lengths. Curved lengths use native Rust's 0.25 mm flattening contract.`:
        `Full physical edge matrix unavailable: ${activated?'Restore the original native garment to review its six-size source.':matrix?.reason||'Grading rules are incomplete.'}`}</p>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <button type="button" disabled={!matrix?.ok} onClick={()=>setShowEdgeMatrix(value=>!value)}>
          {showEdgeMatrix?'Hide':'Show'} {selectedSize} edge measurements
        </button>
        <button type="button" disabled={!matrix?.ok} onClick={downloadMatrix} data-grading-export-measurements="true">
          Export all-size measurement CSV
        </button>
      </div>
      {matrix?.ok&&showEdgeMatrix&&<div className="exo-grading-qa-table-scroll">
        <table aria-label={`Physical graded edge measurements for ${selectedSize}`}>
          <thead><tr><th>Panel</th><th>Physical edge</th><th>Length</th><th>From base</th><th>Previous size break</th></tr></thead>
          <tbody>{currentEdges.map(row=><tr key={row.panelId+'-'+row.id}>
            <td>{row.panelId}</td><th>{row.id}</th><td>{fmm(row.actualMm)}</td>
            <td>{fmm(row.baseDeltaMm)}</td><td>{row.precedingSize?`${row.precedingSize} → ${selectedSize}: ${fmm(row.adjacentGrowthMm)}`:'—'}</td>
          </tr>)}</tbody>
        </table>
      </div>}
      <small>Engineering measurements only. CSV includes incomplete sewing/POM findings and cannot be used as a production CUT authorization.</small>
      {matrix?.ok&&<details data-grade-cut-preflight="true">
        <summary>Six-size CUT / allowance / notch audit · {cutIssues.length} unresolved checks</summary>
        <p>Source-linked diagnostics only. Graded cutting is not approved until allowances, sewn CUT/STITCH relationships, physical notch positions and receiving-CAD acceptance are independently verified.</p>
        {sizeAnnotations.length>0&&<>
          <p>{selectedSize}: {sizeAnnotations.length} graded physical boundary measurements,
            {' '}{sizeStations.length} physically stationed notches. Lengths use native-compatible physical curve arclengths; CUT offsets remain unverified.</p>
          <div className="exo-grading-qa-table-scroll">
            <table aria-label={`${selectedSize} graded allowance and notch measurements`}>
              <thead><tr><th>Pattern</th><th>Edge</th><th>Stitch</th><th>Allowance</th><th>Notches</th></tr></thead>
              <tbody>{sizeAnnotations.slice(0,100).map(row=><tr key={row.panelId+':'+row.edgeId}>
                <th>{row.panelId}</th><td>{row.edgeId}</td>
                <td>{fmm(row.lengthMm)}</td><td>{fmm(row.allowanceMm)}</td><td>{row.notchCount}</td>
              </tr>)}</tbody>
            </table>
          </div>
        </>}
        {sizeCutIssues.length>0&&<ul data-grade-size-cut-issues={selectedSize}>
          {sizeCutIssues.slice(0,8).map((issue,index)=><li key={index}>
            {issue.panelId||'Source'} · {issue.edgeId||'CUT'} · {issue.message||issue.code}
          </li>)}
        </ul>}
        <ul>{cutFindingCounts.slice(0,12).map(([code,count])=>
          <li key={code}>{code.replaceAll('_',' ')}: {count}</li>)}</ul>
      </details>}
    </div>
    <button type="button" className="exo-grading-details-toggle" onClick={()=>setShowDetails(v=>!v)}>
      {showDetails?'Hide':'Show'} all-size dimensions
    </button>
    {showDetails&&<div className="exo-grading-qa-table-scroll">
      <table aria-label="All sizes physical contour dimensions">
        <thead><tr><th>Piece</th><th>Size</th><th>Width</th><th>Height</th><th>Perimeter</th></tr></thead>
        <tbody>{(report.geometry?.blocks||[]).flatMap(block=>(block.rows||[]).map(row=>
          <tr key={block.panelId+'-'+row.size}><th>{block.panelId}</th><td>{row.size}</td>
            <td>{fmm(row.widthMm)}</td><td>{fmm(row.heightMm)}</td><td>{fmm(row.perimeterMm)}</td></tr>))}</tbody>
      </table>
    </div>}
    <footer>Source-linked physical measurements, not factory certification. Production approval requires native size-specific CUT and marking validation, 3D fit evidence, and independent receiving-CAD sign-off.</footer>
  </section>
}
