import React,{useEffect,useRef,useState} from 'react'
import {edgeLength} from '../core/project.js'
import {applyAdvancedCadCurveHandle20261024_1423} from '../core/advancedCadCurveHandle20261024_1423.js'
import {preflightAdvancedCadGradedCurves} from '../core/advancedCadGradedCurveQA20261024_1423.js'
import {inspectAdvancedCadSeamWalk20261024_1423,proposeAdvancedCadSeamEndpointTrueing20261024_1423} from '../core/advancedCadSeamTrueing20261024_1423.js'
import {splitGradedStraightEdge20261024} from '../core/gradedStraightEdgeSplit20261024_1453.js'
import {splitAttachedGradedCurve20261024} from '../core/advancedAttachedCadEdit20261024_1516.js'
import {inspectAccuMarkGradedMaterialContinuity20261024} from '../core/accumarkGradedMaterialContinuity20261024_1453.js'
import {inspectGradedComplexSeamConstructionAcceptance20261024} from '../core/gradedComplexSeamConstructionAcceptance20261024_1501.js'

// Physical centimetres, zero-based edge IDs matching the pattern editor.
export default function AdvancedCadCurveHandleControls20261024_1423({project,piece,onApplyProject,disabled=false}){
  const latestSource=useRef(null)
  latestSource.current={project,pieceId:piece?.id,revision:project?.revision,disabled}
  const assertCurrentSource=(source,sourceRevision,pieceId)=>{
    const latest=latestSource.current
    if(latest.disabled||latest.project!==source||latest.revision!==sourceRevision||latest.pieceId!==pieceId||
      !Number.isSafeInteger(sourceRevision)||source.revision!==sourceRevision)
      throw Error('Source project or selection changed; refresh before applying edit')
  }
  const [edgeIndex,setEdgeIndex]=useState(0)
  const [mode,setMode]=useState('curve.control.move')
  const [x,setX]=useState('0'),[y,setY]=useState('-1')
  const [notice,setNotice]=useState('')
  const [inspection,setInspection]=useState(null)
  const [selectedSeam,setSelectedSeam]=useState('')
  const [walk,setWalk]=useState(null)
  const [proposal,setProposal]=useState(null)
  const [splitFraction,setSplitFraction]=useState('0.5')
  const [splitNotice,setSplitNotice]=useState('')
  const [curveSplitNotice,setCurveSplitNotice]=useState('')
  const [continuity,setContinuity]=useState(null)
  const [complexReport,setComplexReport]=useState(null)
  const [continuityRevision,setContinuityRevision]=useState(null)
  useEffect(()=>{setEdgeIndex(0);setX('0');setY('-1');setNotice('')},[piece?.id])
  useEffect(()=>{setContinuity(null);setComplexReport(null);setContinuityRevision(null);setSplitNotice('');setCurveSplitNotice('')},[project?.revision])
  const edges=piece?.points?.length||0
  const edge=Math.max(0,Math.min(edgeIndex,Math.max(0,edges-1)))
  const seams=Array.isArray(project?.seams)?project.seams.slice(0,256):[]
  const seamId=seams.some(s=>s.id===selectedSeam)?selectedSeam:(seams[0]?.id||'')
  const curve=piece?.curves?.[edge]
  const a=piece?.points?.[edge],b=piece?.points?.[(edge+1)%edges]
  const control=curve||a&&b&&{cx:(a.x+b.x)/2,cy:(a.y+b.y)/2}
  const run=()=>{
    try{
      if(!piece||!project||typeof onApplyProject!=='function')throw Error('Select a source pattern piece')
      const sourceRevision=project.revision
      assertCurrentSource(project,sourceRevision,piece.id)
      if(!x.trim()||!y.trim()||!Number.isFinite(Number(x))||!Number.isFinite(Number(y)))throw Error('Enter valid centimetre coordinates')
      const spec={pieceId:piece.id,edgeIndex:edge,kind:mode,...(mode==='curve.control.move'?{dxCm:Number(x),dyCm:Number(y)}:{cxCm:Number(x),cyCm:Number(y)})}
      const result=applyAdvancedCadCurveHandle20261024_1423(project,spec)
      assertCurrentSource(project,sourceRevision,piece.id)
      const differences=result.validation.sizes.map(s=>s.size+': '+s.deltaLengthCm.toFixed(3)+' cm').join(', ')
      onApplyProject(result.project,`Updated physical curve handle on ${piece.name||piece.id} edge ${edge+1}; validated ${result.validation.sizes.length} graded sizes. Trueing and manufacturing QA pending.`)
      setNotice('Saved with Undo. Arc-length changes by size: '+differences)
    }catch(error){setNotice('Curve edit blocked: '+(error.message||String(error)))}
  }
  const runPreflight=()=>{try{setInspection(preflightAdvancedCadGradedCurves(project))}catch(error){setInspection({ok:false,diagnostics:[{code:'PREFLIGHT_ERROR',message:error.message}],checkedSizes:[]})}}
  const runWalk=()=>{
    const output=inspectAdvancedCadSeamWalk20261024_1423(project,{seamId,sizes:project?.grading?.sizes})
    setWalk(output);setProposal(null)
  }
  const runProposal=()=>{
    const output=proposeAdvancedCadSeamEndpointTrueing20261024_1423(project,{seamId,sizes:project?.grading?.sizes})
    setProposal(output)
  }
  const runSplit=()=>{
    try{
      if(disabled||!project||!piece||typeof onApplyProject!=='function')throw Error('Editable source pattern required')
      const sourceRevision=project.revision
      if(!Number.isSafeInteger(sourceRevision))throw Error('Source revision is not available')
      const fraction=Number(splitFraction)
      if(!splitFraction.trim()||!Number.isFinite(fraction))throw Error('Enter a finite split fraction')
      const result=splitGradedStraightEdge20261024(project,{pieceId:piece.id,edgeIndex:edge,fraction})
      assertCurrentSource(project,sourceRevision,piece.id)
      if(project.revision!==sourceRevision||result.project.revision!==sourceRevision)throw Error('Project revision changed; refresh before editing')
      if(result.validation?.status!=='GRADE_GEOMETRY_VERIFIED'||result.validation.manufacturingApproved!==false)throw Error('Graded split verification missing')
      onApplyProject(result.project,`Split straight edge ${edge+1} at ${(fraction*100).toFixed(1)}% across ${result.validation.sizes.length} sizes. Physical assembly and factory approval pending.`)
      setSplitNotice(`Applied split with Undo. ${result.validation.sizes.length} graded contours verified; construction and factory QA pending.`)
      setContinuity(null)
    }catch(error){setSplitNotice(`Graded split blocked: ${error.message||String(error)}`)}
  }
  const runCurveSplit=()=>{
    try{
      if(disabled||!project||!piece||typeof onApplyProject!=='function')throw Error('Editable source pattern required')
      const sourceRevision=project.revision
      assertCurrentSource(project,sourceRevision,piece.id)
      if(!piece.curves?.[edge])throw Error('Select a quadratic curved edge')
      const fraction=Number(splitFraction)
      if(!splitFraction.trim()||!Number.isFinite(fraction)||fraction<0.05||fraction>0.95)throw Error('Enter a curve arc fraction between 0.05 and 0.95')
      const result=splitAttachedGradedCurve20261024(project,{pieceId:piece.id,edgeIndex:edge,fraction})
      assertCurrentSource(project,sourceRevision,piece.id)
      if(result.project.revision!==sourceRevision||result.validation?.status!=='GRADED_GEOMETRY_VERIFIED'||result.validation.manufacturingApproved!==false||result.validation.physicalFitApproved!==false||!result.validation.sourceUnchanged||!Array.isArray(result.validation.sizes)||result.validation.sizes.length!==project.grading?.sizes?.length)throw Error('Complete graded curve split proof missing')
      onApplyProject(result.project,`Split attached graded curve ${edge+1} at ${(fraction*100).toFixed(1)}% of physical arc across ${result.validation.sizes.length} sizes. Physical fitting, sewn seams, and factory approval pending.`)
      setCurveSplitNotice(`Applied graded curve split with Undo. ${result.validation.sizes.length} size contours verified. Physical fit, seams, and factory approval pending.`)
      setContinuity(null)
      setComplexReport(null)
    }catch(error){setCurveSplitNotice(`Graded curved split blocked: ${error.message||String(error)}`)}
  }
  const runContinuity=()=>{
    try{
      if(!project)throw Error('Open a graded source project')
      const revision=project.revision
      const result=inspectAccuMarkGradedMaterialContinuity20261024(project)
      setContinuity(result)
      setContinuityRevision(revision)
    }catch(error){setContinuity({status:'blocked',blockers:1,issues:[{code:'INSPECTION_ERROR',entity:error.message}],manufacturingApproved:false});setContinuityRevision(project?.revision)}
  }
  const runComplexInspection=()=>{
    try{setComplexReport(inspectGradedComplexSeamConstructionAcceptance20261024(project))}
    catch(error){setComplexReport({status:'blocked',blockers:1,issues:[{code:'COMPLEX_INSPECTION_ERROR',message:error.message}],manufacturingApproved:false})}
  }
  return <section aria-label="Advanced pattern CAD curved edge editor" className="exo-accu-engine-controls">
    <h4>Advanced 2D CAD · Graded curve geometry</h4>
    <details>
      <summary>Guarded graded quadratic curve split</summary>
      <p>Divide the selected curved edge at a physical arc fraction across graded sizes while preserving supported notch and construction anchors. Unsupported sewing, seam, grade, or source metadata blocks the edit. This does not approve physical fit or factory production.</p>
      <fieldset disabled={disabled||!piece||edges<3||!curve||typeof onApplyProject!=='function'} style={{display:'grid',gap:8}}>
        <label>Fraction along curved arc (0.05–0.95)<input aria-label="Graded curved edge split arc fraction" type="number" min="0.05" max="0.95" step="0.05" value={splitFraction} onChange={event=>{setSplitFraction(event.target.value);setCurveSplitNotice('')}}/></label>
        <p>Selected edge: {edge+1} · {piece?.name||piece?.id||'No piece selected'} · {curve?'Quadratic curve':'Select a curved edge below'}</p>
        <button type="button" onClick={runCurveSplit}>Split curved edge across graded sizes</button>
      </fieldset>
      {curveSplitNotice&&<p role="status">{curveSplitNotice}</p>}
    </details>
    <details>
      <summary>Guarded graded straight-edge split</summary>
      <p>Insert a vertex on the selected straight edge at the same physical fraction in every graded size. Unsupported construction, sewing, or attachment metadata blocks the edit to protect source references.</p>
      <fieldset disabled={disabled||!piece||edges<3||typeof onApplyProject!=='function'} style={{display:'grid',gap:8}}>
        <label>Fraction along selected edge (0.05–0.95)<input aria-label="Graded straight edge split fraction" type="number" min="0.05" max="0.95" step="0.05" value={splitFraction} onChange={event=>setSplitFraction(event.target.value)}/></label>
        <p>Selected edge: {edge+1} · {piece?.name||piece?.id||'No piece selected'}</p>
        <button type="button" onClick={runSplit}>Split straight edge across graded sizes</button>
      </fieldset>
      {splitNotice&&<p role="status">{splitNotice}</p>}
    </details>
    <details>
      <summary>Physical graded seam and attachment continuity QA</summary>
      <p>Read-only measurements for every saved size, including seam lengths, curve stations, and notches. Unsupported curved topology, pairing, and ease remain blockers. No result certifies factory readiness.</p>
      <button type="button" disabled={disabled||!project} onClick={runContinuity}>Inspect graded material continuity</button>
      {continuity&&<div role="status">
        <p>{continuityRevision!==project?.revision?'Report outdated; inspect current revision.':continuity.status==='measurement_only'?'Measured constraints passed; additional physical and factory QA required.':'Continuity blocked.'} {continuity.blockers} blocker(s) · {continuity.seamRows?.length||0} seam measurements · {continuity.curveRows?.length||0} curve measurements.</p>
        {(continuity.issues||[]).slice(0,12).map((issue,index)=><p key={index}>{issue.size?issue.size+' · ':''}{issue.code}{issue.entity?' · '+issue.entity:''}</p>)}
        {(continuity.issues?.length||0)>12&&<p>Additional blockers are recorded in the full inspection output.</p>}
      </div>}
    </details>
    <details>
      <summary>Complex curved seam and construction acceptance</summary>
      <p>Inspect every graded size, curved and partial stitchline, matched notch station, and anchored construction endpoint. Read-only numerical checks are not physical fitting or factory approval.</p>
      <button type="button" disabled={disabled||!project} onClick={runComplexInspection}>Inspect curved seams and construction attachments</button>
      {complexReport&&<div role="status">
        <p>{complexReport.status==='measurement_only'?'Supported measurements passed; production remains unapproved.':'Construction or seam acceptance blocked.'} {complexReport.blockers} blocker(s) · {complexReport.seamRows?.length||0} seam rows · {complexReport.notchRows?.length||0} notch rows · {complexReport.attachmentRows?.length||0} attachment rows.</p>
        {(complexReport.issues||[]).slice(0,12).map((issue,index)=><p key={index}>{issue.code}{issue.scope?' · '+issue.scope:''}: {issue.message}</p>)}
      </div>}
    </details>
    <details>
      <summary>Full-size graded contour and attachment preflight</summary>
      <p>Inspect all pattern sizes for invalid curve references, broken boundaries, notch stations, allowance metadata, and grading errors before further drafting.</p>
      <button type="button" disabled={disabled||!project} onClick={runPreflight}>Inspect all graded sizes</button>
      {inspection&&<div role="status">
        <p>{inspection.ok?'No supported geometry errors detected.':'Geometry blockers found.'} Sizes checked: {inspection.checkedSizes?.join(', ')||'none'} · {inspection.diagnostics?.length||0} diagnostic(s)</p>
        {(inspection.diagnostics||[]).slice(0,12).map((d,i)=><p key={i}>{d.size?d.size+' · ':''}{d.code}: {d.message}</p>)}
        {(inspection.diagnostics?.length||0)>12&&<p>Additional diagnostics available through the full QA report.</p>}
      </div>}
    </details>
    <details>
      <summary>Physical seam walking and guided trueing</summary>
      <p>Walk both stitched edges across all graded sizes and compare physical lengths in millimetres. Endpoint trueing proposals remain detached for separate pattern review.</p>
      <fieldset disabled={disabled||!seams.length} style={{display:'grid',gap:8}}>
        <label>Saved sewn seam<select aria-label="Advanced CAD seam" value={seamId} onChange={event=>{setSelectedSeam(event.target.value);setWalk(null);setProposal(null)}}>
          {seams.map((seam,i)=><option key={seam.id||i} value={seam.id}>{seam.name||seam.id||'Seam '+(i+1)}</option>)}
        </select></label>
        <button type="button" onClick={runWalk}>Walk stitched edges at each size</button>
        <button type="button" onClick={runProposal}>Calculate guarded endpoint trueing proposal</button>
      </fieldset>
      {!seams.length&&<p>No saved seam pairs in this project.</p>}
      {walk&&<div role="status">{walk.ok?<p>Walked {walk.results.length} size(s): {walk.allSizesWithinTolerance?'within inspection tolerances':'length or shape discrepancy'}</p>:<p>Seam walk blocked: {walk.reason}</p>}
        {(walk.results||[]).map(s=><p key={s.size}>{s.size}: {s.lengthsMm[0].toFixed(2)} / {s.lengthsMm[1].toFixed(2)} mm · mismatch {s.signedMismatchMm.toFixed(2)} mm{s.issues.length?' · '+s.issues.join(', '):''}</p>)}
      </div>}
      {proposal&&<div role="status">{proposal.ok?<p>Detached trueing proposal: move {proposal.pieceId} point {proposal.pointIndex+1} by {proposal.movementMm.toFixed(2)} mm to ({proposal.proposed.x.toFixed(3)}, {proposal.proposed.y.toFixed(3)}) cm. Review cutting, adjacent seams and fit before applying.</p>:<p>Trueing proposal blocked: {proposal.reason}</p>}</div>}
    </details>
    <p>Edit a real quadratic curve handle in centimetres. EXO verifies contour validity, grading on every size, and anchored construction stations. Sewn edges and fixed arc-length grade notches require trueing before a geometry change.</p>
    <fieldset disabled={disabled||!piece||edges<3} style={{display:'grid',gap:8}}>
      <label>Pattern edge<select aria-label="Advanced CAD curve edge" value={edge} onChange={event=>{setEdgeIndex(Number(event.target.value));setNotice('');setCurveSplitNotice('');setSplitNotice('')}}>{(piece?.points||[]).map((_,i)=><option key={i} value={i}>Edge {i+1}{piece.curves?.[i]?' · curved':' · straight'}</option>)}</select></label>
      {control&&<p>Current handle: X {control.cx.toFixed(3)} cm · Y {control.cy.toFixed(3)} cm · physical edge length {edgeLength(piece,edge).toFixed(3)} cm</p>}
      <label>Edit mode<select aria-label="Advanced CAD curve mode" value={mode} onChange={event=>{setMode(event.target.value);setNotice('')}}>
        <option value="curve.control.move">Move curve handle by ΔX / ΔY</option>
        <option value="curve.control.set">Set absolute curve handle X / Y</option>
      </select></label>
      <div className="exo-engine-row">
        <label>{mode==='curve.control.move'?'Δ X (cm)':'Handle X (cm)'}<input type="number" step=".1" aria-label="Advanced CAD curve X" value={x} onChange={event=>setX(event.target.value)}/></label>
        <label>{mode==='curve.control.move'?'Δ Y (cm)':'Handle Y (cm)'}<input type="number" step=".1" aria-label="Advanced CAD curve Y" value={y} onChange={event=>setY(event.target.value)}/></label>
      </div>
      <button type="button" onClick={run}>Apply curve edit and validate every size</button>
    </fieldset>
    {notice&&<p role="status" className={notice.startsWith('Curve edit blocked')?'exo-engine-error':''}>{notice}</p>}
    <small>EXO graded CAD study. Physical fitting and approved cutting patterns require separate verification.</small>
  </section>
}
