import React,{useEffect,useMemo,useState} from 'react'
import {inspectNativeGradingReleaseGate20261025} from '../core/nativeGradingReleaseGate20261025.js'
import {inspectNativeGradingPhysicalSampleReview20261026,
  exportNativeGradingPhysicalSampleWorksheet20261026,
  importNativeGradingPhysicalSampleWorksheet20261026} from '../core/nativeGradingPhysicalSampleReview20261026.js'
import {buildNativeGradeExternalReviewRequest20261027} from '../core/nativeGradeExternalReviewRequest20261027.js'
import {verifyNativeGradeIndependentReviewEvidence20261027} from '../core/nativeGradeIndependentReviewEvidence20261027.js'

export default function NativeGradingReleaseChecklist20261025({
  snapshot,ruleSet,pomDefinitions=[],nativeCatalog=null,
  gradedCutProof=null,receivingCadProof=null,physicalSampleObservations=null,
  onRequestNativeCutInspection=null,inspectionDisabled=false,
  trustedIndependentReviewKeys=null,
}){
  const [importResult,setImportResult]=useState(null)
  const [importing,setImporting]=useState(false)
  const [cutInspection,setCutInspection]=useState(null)
  const [cutError,setCutError]=useState('')
  const [cutBusy,setCutBusy]=useState(false)
  const [reviewRequestError,setReviewRequestError]=useState('')
  const [signedReview,setSignedReview]=useState(null)
  const [signedReviewBusy,setSignedReviewBusy]=useState(false)
  // Imported observations are a local inspection, not persisted evidence.
  // Never carry them forward when any of the graded source inputs change.
  useEffect(()=>{setImportResult(null);setImporting(false);setCutInspection(null);setCutError('');setReviewRequestError('');setSignedReview(null)},
    [snapshot?.revision,snapshot?.template,ruleSet,pomDefinitions])
  const activeSampleObservations=importResult?.ok?importResult.observations:physicalSampleObservations
  const report=useMemo(()=>inspectNativeGradingReleaseGate20261025(snapshot,ruleSet,pomDefinitions,
    {nativeCatalog,gradedCutProof,receivingCadProof,physicalSampleObservations:activeSampleObservations}),
    [snapshot?.revision,snapshot?.template,ruleSet,pomDefinitions,nativeCatalog,gradedCutProof,receivingCadProof,activeSampleObservations])
  const sample=useMemo(()=>inspectNativeGradingPhysicalSampleReview20261026(
    snapshot,ruleSet,pomDefinitions,activeSampleObservations),
    [snapshot?.revision,snapshot?.template,ruleSet,pomDefinitions,activeSampleObservations])
  const worksheet=useMemo(()=>exportNativeGradingPhysicalSampleWorksheet20261026(snapshot,ruleSet,pomDefinitions),
    [snapshot?.revision,snapshot?.template,ruleSet,pomDefinitions])
  const actualSizes=new Set(sample.rows.map(row=>row.size))
  const currentCut=cutInspection?.format==='exo-native-graded-cutlines.v1'&&
    cutInspection?.sourceRevision===snapshot?.revision&&
    cutInspection?.structuralAudit?.ok===true&&
    cutInspection?.manufacturerReady===false&&cutInspection?.cuttingAuthorized===false&&
    Array.isArray(cutInspection.sizes)&&cutInspection.sizes.length===6&&
    ['XS','S','M','L','XL','XXL'].every((size,index)=>cutInspection.sizes[index]?.size===size)
  const reviewRequest=useMemo(()=>currentCut?
    buildNativeGradeExternalReviewRequest20261027(
      snapshot,ruleSet,pomDefinitions,cutInspection,cutInspection.structuralAudit):null,
    [currentCut,snapshot?.revision,snapshot?.template,ruleSet,pomDefinitions,cutInspection])
  const downloadReviewRequest=()=>{
    if(!reviewRequest?.ok){setReviewRequestError(reviewRequest?.reason||'Verify native CUT and all six POM targets first');return}
    setReviewRequestError('')
    const url=URL.createObjectURL(new Blob([reviewRequest.json],{type:'application/json;charset=utf-8'}))
    const link=document.createElement('a')
    link.href=url;link.download=reviewRequest.filename
    document.body.appendChild(link);link.click();link.remove()
    setTimeout(()=>URL.revokeObjectURL(url),1000)
  }
  const independentKeysConfigured=Boolean(trustedIndependentReviewKeys&&
    typeof trustedIndependentReviewKeys==='object'&&
    Object.keys(trustedIndependentReviewKeys).length>=3)
  const importSignedReview=async(event)=>{
    const file=event.currentTarget.files?.[0]
    event.currentTarget.value=''
    if(!file)return
    if(!independentKeysConfigured){setSignedReview({ok:false,detail:'Externally enrolled reviewer keys are not configured.'});return}
    if(file.size>2_000_000){setSignedReview({ok:false,detail:'Signed review JSON must be below 2 MB.'});return}
    setSignedReviewBusy(true);setSignedReview(null)
    try{
      const evidence=JSON.parse(await file.text())
      const report=await verifyNativeGradeIndependentReviewEvidence20261027({
        sourceRevision:snapshot.revision,sourceTemplate:snapshot.template,fullRuleSet:ruleSet,
        pomDefinitions,evidence,trustedPublicKeys:trustedIndependentReviewKeys})
      setSignedReview(report)
    }catch(error){setSignedReview({ok:false,detail:`Invalid signed reviewer JSON: ${String(error?.message||error)}`})}
    finally{setSignedReviewBusy(false)}
  }
  const inspectNativeCuts=async()=>{
    if(!onRequestNativeCutInspection||cutBusy)return
    setCutBusy(true);setCutError('');setCutInspection(null)
    try{
      const result=await onRequestNativeCutInspection()
      if(!result||result.format!=='exo-native-graded-cutlines.v1'||result.sourceRevision!==snapshot?.revision||
        result.structuralAudit?.ok!==true||result.manufacturerReady!==false||result.cuttingAuthorized!==false||
        !Array.isArray(result.sizes)||result.sizes.length!==6||
        !['XS','S','M','L','XL','XXL'].every((size,index)=>result.sizes[index]?.size===size)){
        throw Error('Native six-size CUT evidence is incomplete or source revision changed. Recheck the saved grade catalog.')
      }
      setCutInspection(result)
    }catch(error){setCutError(String(error?.message||error))}
    finally{setCutBusy(false)}
  }
  const importSampleWorksheet=async(event)=>{
    const file=event.currentTarget.files?.[0]
    event.currentTarget.value=''
    if(!file)return
    if(file.size>2_000_000){
      setImportResult({ok:false,reason:'Factory worksheet must be smaller than 2 MB.'});return
    }
    setImporting(true)
    try{
      const csv=await file.text()
      setImportResult(importNativeGradingPhysicalSampleWorksheet20261026(snapshot,ruleSet,pomDefinitions,csv))
    }catch(error){setImportResult({ok:false,reason:`Unable to import sample worksheet: ${error.message}`})}
    finally{setImporting(false)}
  }
  const downloadSampleWorksheet=()=>{
    if(!worksheet.ok)return
    const url=URL.createObjectURL(new Blob([worksheet.csv],{type:'text/csv;charset=utf-8'}))
    const link=document.createElement('a')
    link.href=url
    link.download=`exo-physical-sewn-sample-worksheet-r${snapshot.revision}-NOT-APPROVED.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(()=>URL.revokeObjectURL(url),1000)
  }
  return <section className="exo-native-grading-release-gate" data-native-grading-release="blocked"
    aria-label="All-size manufacturing release checklist">
    <header><strong>Production release checklist</strong><span>{report.blocks} BLOCKERS</span></header>
    <p>Every step must be verified before graded patterns can be sent as factory CUT files.</p>
    <div className="exo-grading-release-checks">
      {report.checks.map(item=><div key={item.id} data-check={item.id} data-state={item.ok?'pass':'blocked'}>
        <span aria-hidden="true">{item.ok?'✓':'○'}</span><span>{item.label}</span><small>{item.ok?'PASS':'REQUIRED'}</small>
      </div>)}
    </div>
    {onRequestNativeCutInspection&&<div className="exo-grading-native-cut-inspection" data-native-graded-cut-inspection="true">
      <strong>Native XS–XXL physical CUT inspection</strong>
      <p>Measure actual Rust-generated CUT offsets, seam intervals and notch marks across all six saved sizes. This does not issue a cutter file or approve manufacturing.</p>
      <button type="button" onClick={inspectNativeCuts} disabled={inspectionDisabled||cutBusy||!ruleSet}
        aria-label="Inspect all six native graded physical CUT outlines">
        {cutBusy?'Checking Rust CUT geometry…':'Inspect six-size native CUT geometry'}
      </button>
      {cutError&&<p role="alert" data-native-cut-error="true">Native CUT inspection blocked: {cutError}</p>}
      {currentCut&&<>
        <p role="status" data-native-cut-size-count="6">Rust returned six source-revision-linked CUT studies. Independent 1:1 cutting-scale and factory approval remain unverified.</p>
        <div className="exo-grading-qa-table-scroll">
          <table aria-label="Native six-size graded CUT geometry inspections">
            <thead><tr><th>Size</th><th>Panels</th><th>CUT area</th><th>Notches</th><th>Seams</th><th>Max seam difference</th></tr></thead>
            <tbody>{cutInspection.sizes.map(size=><tr key={size.size}>
              <th>{size.size}</th><td>{size.panels?.length||0}</td>
              <td>{(size.panels||[]).reduce((total,panel)=>total+(panel.cut?.area_m2||0)*10000,0).toFixed(1)} cm²</td>
              <td>{(size.panels||[]).reduce((total,panel)=>total+(panel.cut?.notches?.length||0),0)}</td>
              <td>{size.seams?.length||0}</td>
              <td>{((size.seams||[]).reduce((max,seam)=>Math.max(max,seam.mismatch_m||0),0)*1000).toFixed(2)} mm</td>
            </tr>)}</tbody>
          </table>
        </div>
        <button type="button" onClick={downloadReviewRequest} disabled={!reviewRequest?.ok}
          aria-label="Download independent six-size factory review request">
          Download six-size independent factory review request (JSON)
        </button>
        {reviewRequest?.ok?<small>Packet includes source hashes, complete size rules, POM targets and Rust CUT geometry. It is NOT APPROVED for cutting.</small>:
          <small data-native-review-request-blocker="true">Review request unavailable: {reviewRequest?.reason||'POM targets must be complete.'}</small>}
        {reviewRequestError&&<p role="alert">{reviewRequestError}</p>}
      </>}
      <label className="exo-grading-sample-import-label" htmlFor="exo-grade-signed-manufacturing-review">
        Import independently signed CUT, CAD and sewn-sample review (JSON)
        <input id="exo-grade-signed-manufacturing-review" type="file" accept=".json,application/json"
          disabled={!independentKeysConfigured||signedReviewBusy||!currentCut}
          aria-label="Import independently signed grading manufacturing review" onChange={importSignedReview}/>
      </label>
      {!independentKeysConfigured&&<small data-native-review-trust-not-configured="true">
        External reviewers' public keys must be independently enrolled by the manufacturing authority. No trusted keys are bundled or accepted from the same review file.
      </small>}
      {signedReview&&<p role="status" data-native-signed-review={signedReview.ok?'signature-verified-only':'rejected'}>
        {signedReview.ok?'All three independently provisioned Ed25519 reviewer signatures verified. This authenticates their statements, not the physical production results. Independent final manufacturing approval is still required.':
          `Signed review rejected: ${signedReview.detail||signedReview.code||'source or signature mismatch'}`}
      </p>}
    </div>}
    <div className="exo-grading-release-checks" data-physical-sample-review="true">
      <strong>Physical sewn-sample verification</strong>
      <p>Observed POM rows: {sample.rows.length}/{pomDefinitions.length*6} · sizes represented: {actualSizes.size}/6 · independent factory signature: NOT VERIFIED.</p>
      <p>{sample.readyForIndependentAudit?
        'Measurement observations meet current POM tolerances. Independent factory and calibration evidence still requires authentication.':
        `Sewn-sample review blocked. ${sample.blockers[0]?.message||'Measured factory samples are required.'}`}</p>
      <small>Each XS–XXL sewn specimen needs actual millimetre measurements at every authored POM, specimen ID, factory/operator, calibration record, measurement date and signed report. None are inferred from the 3D preview.</small>
      <button type="button" onClick={downloadSampleWorksheet} disabled={!worksheet.ok}
        aria-label="Download source-linked six-size physical sample worksheet">
        Download blank XS–XXL factory measurement worksheet (CSV)
      </button>
      {!worksheet.ok&&<small>Enter and verify all six target values for each POM to enable the worksheet.</small>}
      <label className="exo-grading-sample-import-label" htmlFor="exo-grade-sample-csv">Import completed factory worksheet (CSV)
        <input id="exo-grade-sample-csv" type="file" accept=".csv,text/csv" disabled={!worksheet.ok||importing}
          aria-label="Import completed six-size factory measurement worksheet" onChange={importSampleWorksheet}/>
      </label>
      {importing&&<small role="status">Checking returned measurements against current graded source and tolerances…</small>}
      {importResult&&!importing&&<div role="status" data-factory-sample-import={importResult.ok?'parsed-unverified':'blocked'}>
        {importResult.ok?`Parsed ${sample.rows.length} sample measurements across ${actualSizes.size} sizes. ${sample.blockers.length} measurement or evidence issue(s). Factory signature and physical specimens remain UNVERIFIED.`:
          `Worksheet rejected: ${importResult.reason}`}
      </div>}
      {importResult?.ok&&sample.blockers.length>0&&<details>
        <summary>Sample inspection findings ({sample.blockers.length})</summary>
        <ul>{sample.blockers.slice(0,12).map((blocker,index)=><li key={index}>
          {[blocker.size,blocker.pomId,blocker.message].filter(Boolean).join(' · ')}
        </li>)}</ul>
      </details>}
    </div>
    <footer role="status">Release blocked · no graded marker, native source study or current-size DXF is factory approved.</footer>
  </section>
}
