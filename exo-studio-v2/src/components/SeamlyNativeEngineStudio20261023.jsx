import React, {useEffect,useMemo,useState} from 'react'
import {Download, Ruler, Upload} from 'lucide-react'
import {buildSeamlyCadExchangeBundle20261023} from '../core/seamlyCadExchangeBundle20261023.js'
import SeamlyAamaCutReview20261023 from './SeamlyAamaCutReview20261023.jsx'
import {listSeamlyNativeTransferCandidates20261024} from '../core/seamlyNativeCutTransfer20261024.js'
import {inspectSeamlyNativeSizeRun20261024} from '../core/seamlyNativeSizeRunBridge20261024.js'
import {inspectSeamlyNativeGradeCorrespondence20261024_1400} from '../core/seamlyNativeGradeCorrespondence20261024_1400.js'

// Browser client for EXO's loopback-only separate original Seamly2D calculator.
// The original .sm2d graph and all engineering annotations remain upstream.
const bridge = () => {
  const port = window.location.port
  return port === '5386' ? 'http://127.0.0.1:5385'
    : port === '5486' ? 'http://127.0.0.1:5485'
      : 'http://127.0.0.1:5193'
}
const MAX_PATTERN = 4 * 1024 * 1024
const MAX_MEASURE = 2 * 1024 * 1024
const acceptedSizes = input => {
  const values = input.split(',').map(value => Number(value.trim()))
  if (values.length < 2 || values.length > 6 || values.some(value => !Number.isInteger(value) || value < 20 || value > 100)
      || new Set(values).size !== values.length) throw new Error('Enter 2–6 distinct centimeter sizes, e.g. 48,50,52')
  return values
}
export default function SeamlyNativeEngineStudio20261023({onReferenceImport,onNativeImport,nativeMode=false}) {
  const [source,setSource] = useState(null)
  const [measurements,setMeasurements] = useState(null)
  const [mode,setMode] = useState('svg')
  const [aamaUnit,setAamaUnit] = useState('')
  const [sizes,setSizes] = useState('')
  const [height,setHeight] = useState('')
  const [busy,setBusy] = useState(false)
  const [result,setResult] = useState(null)
  const [error,setError] = useState('')
  const [preview,setPreview] = useState('')
  const [cutReview,setCutReview] = useState(null)
  const [nativeChoice,setNativeChoice] = useState({})
  const [nativeMessage,setNativeMessage] = useState('')
  const [nativePending,setNativePending] = useState('')
  const [gradeStudy,setGradeStudy] = useState(null)
  const [gradeStudyBusy,setGradeStudyBusy] = useState(false)
  const correspondenceStudy=useMemo(()=>gradeStudy?.ok
    ?inspectSeamlyNativeGradeCorrespondence20261024_1400(gradeStudy)
    :null,[gradeStudy])
  const nativeInventories=useMemo(()=>result?.format==='aama-r10'
    ?result.artifacts.map(file=>listSeamlyNativeTransferCandidates20261024(file,{unit:aamaUnit}))
    :[],[result,aamaUnit])
  useEffect(()=>{
    let active=true
    setGradeStudy(null)
    setGradeStudyBusy(false)
    if(result?.format!=='aama-r10'||!Array.isArray(result.sizesCm)||result.sizesCm.length<2||!aamaUnit)return undefined
    setGradeStudyBusy(true)
    inspectSeamlyNativeSizeRun20261024(result,{sourceUnit:aamaUnit,baseSize:result.sizesCm[0]})
      .then(data=>{if(active)setGradeStudy(data)})
      .catch(error=>{if(active)setGradeStudy({ok:false,reason:error.message})})
      .finally(()=>{if(active)setGradeStudyBusy(false)})
    return()=>{active=false}
  },[result,aamaUnit])
  useEffect(()=>{
    const report=event=>{
      if(event.detail?.requestId!==nativePending)return
      setNativePending('')
      setNativeMessage(event.detail?.message||'Native CUT import completed without a detailed response')
    }
    window.addEventListener('exo-seamly-native-cut-import-result',report)
    return()=>window.removeEventListener('exo-seamly-native-cut-import-result',report)
  },[nativePending])

  useEffect(() => {
    const svg = result?.artifacts?.find(file => file.name.endsWith('.svg'))?.content
    if (!svg) { setPreview(''); return undefined }
    const objectUrl = URL.createObjectURL(new Blob([svg], {type:'image/svg+xml'}))
    setPreview(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [result])

  const load = async (event,kind) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const expected = kind === 'pattern' ? /\.sm2d$/i : /\.(smis|smms)$/i
      if (!expected.test(file.name) || !file.size || file.size > (kind === 'pattern' ? MAX_PATTERN : MAX_MEASURE)) {
        throw new Error(kind === 'pattern' ? 'Select a valid .sm2d file under 4 MB' : 'Select a valid .smis or .smms file under 2 MB')
      }
      const data = {name:file.name,xml:await file.text(),kind:file.name.split('.').pop().toLowerCase()}
      if (kind === 'pattern') setSource(data)
      else {setMeasurements(data);if(data.kind==='smis')setSizes('')}
      setResult(null);setError('');setNativeMessage('');setNativeChoice({})
    } catch (failure) { setError(failure.message) }
  }

  const evaluate = async () => {
    if (!source || !measurements || busy) return
    setBusy(true);setError('');setResult(null)
    try {
      const payload = {patternXml:source.xml, measurementsXml:measurements.xml, format:mode}
      if(mode==='aama-r10') {
        if(!aamaUnit)throw new Error('Confirm drawing units before evaluating AAMA geometry')
        payload.sourceUnit=aamaUnit
      }
      if (sizes.trim()) {
        if (measurements.kind !== 'smms') throw new Error('Multisize grading requires a SeamlyMe .smms file')
        payload.sizesCm = acceptedSizes(sizes)
      }
      if (height.trim()) {
        if (measurements.kind !== 'smms') throw new Error('Height grading requires a .smms file')
        const n = Number(height)
        if (!Number.isInteger(n) || n < 50 || n > 250) throw new Error('Height must be 50–250 cm')
        payload.heightCm = n
      }
      const response = await fetch(`${bridge()}/seamly/v1/evaluate`,{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),
        signal:AbortSignal.timeout(90000),
      })
      const data = await response.json()
      if (!response.ok || data?.ok !== true || data?.manufacturingApproved !== false || !data.artifacts?.length) {
        throw new Error(data?.reason || 'Seamly2D calculation unavailable')
      }
      setResult(data)
    } catch (failure) {setError(failure.message || 'Seamly2D calculation failed')}
    finally {setBusy(false)}
  }
  const downloadFile = file => {
    const blob = new Blob([file.content], {type:file.name.endsWith('.dxf')?'application/dxf':'image/svg+xml'})
    const objectUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href=objectUrl;anchor.download=file.name
    try {document.body.appendChild(anchor);anchor.click()}
    finally {
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
    }
  }
  const downloadGradeStudy=()=>{
    if(!gradeStudy?.ok||gradeStudyBusy)return
    const data={
      schema:'exo.seamly.separate-native-cut-grade-review.v1',sourceUnit:gradeStudy.sourceUnit,
      baseSize:gradeStudy.baseSize,sizes:gradeStudy.sizes,sourceBlocks:gradeStudy.sourceBlocks,
      sourceHashes:Object.fromEntries(Object.entries(gradeStudy.originalSources).map(([size,file])=>[size,{filename:file.filename,sha256:file.sha256,byteLength:file.byteLength}])),
      gradedCutComparison:gradeStudy.gradeInspector,blockers:gradeStudy.blockers,
      sourceVertexCorrespondence:correspondenceStudy,
      nativeRulesCommitted:false,factoryExportAllowed:false,manufacturingApproved:false,
      caveat:'Original multi-size physical CUT research with bounded cyclic/reversed vertex correspondence. Ambiguous symmetric shapes are blocked. This is NOT a committed native Rust graded rule table, lossless source formula import, stitchline transfer or receiving CAD approval.',
    }
    const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}))
    const a=document.createElement('a')
    try{a.href=url;a.download='exo-seamly-graded-native-CUT-study-NOT-APPROVED.json';document.body.appendChild(a);a.click()}
    finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  }
  const downloadReceiverPacket=async()=>{
    if (busy || !result || !aamaUnit) return
    setBusy(true);setError('')
    try {
      const packet=await buildSeamlyCadExchangeBundle20261023(result,{
        sourceUnit:aamaUnit,sourceFileName:source?.name,
        measurementFileName:measurements?.name,
      })
      const objectUrl=URL.createObjectURL(new Blob([packet.zip],{type:'application/zip'}))
      const anchor=document.createElement('a')
      anchor.download=packet.filename;anchor.href=objectUrl
      let clicked=false
      try { document.body.appendChild(anchor);anchor.click();clicked=true }
      finally {
        anchor.remove()
        if(clicked) window.setTimeout(()=>URL.revokeObjectURL(objectUrl),1000)
        else URL.revokeObjectURL(objectUrl)
      }
    }catch(error){setError(error.message||'Receiving CAD exchange packet refused')}
    finally{setBusy(false)}
  }

  return <div className="panel-section" aria-label="Original Seamly2D calculation engine">
    <div className="panel-title"><span>Seamly2D Native Drafting Engine</span><strong>ORIGINAL FORMULAS</strong></div>
    <p className="panel-copy">Calculate pattern pieces using the actual Seamly2D engine, including measurement formulas and multisize grading. Outputs retain original CAD provenance and are engineering drafts until factory acceptance.</p>
    <label className="wide-action compact-action" style={{display:'block',cursor:'pointer'}}>
      <Upload size={14}/> {source ? source.name : '1 · SELECT SEAMLY .SM2D PATTERN'}
      <input hidden type="file" accept=".sm2d" onChange={event=>load(event,'pattern')}/>
    </label>
    <label className="wide-action compact-action" style={{display:'block',cursor:'pointer'}}>
      <Ruler size={14}/> {measurements ? measurements.name : '2 · SELECT .SMIS / .SMMS MEASUREMENTS'}
      <input hidden type="file" accept=".smis,.smms" onChange={event=>load(event,'measurements')}/>
    </label>
    <label className="panel-copy" style={{display:'block'}}>Output format
      <select aria-label="Seamly2D output format" value={mode} onChange={event=>{setMode(event.target.value);setResult(null)}}>
        <option value="svg">SVG pattern preview</option>
        <option value="aama-r10">Original AAMA R10 DXF pattern exchange</option>
      </select>
    </label>
    {measurements?.kind==='smms' && <>
      <label className="panel-copy" style={{display:'block'}}>Size run (cm; optional; comma separated)
        <input type="text" aria-label="Seamly grading sizes" placeholder="48,50,52" value={sizes} onChange={event=>setSizes(event.target.value)}/>
      </label>
      <label className="panel-copy" style={{display:'block'}}>Body height (cm; optional)
        <input type="number" aria-label="Seamly grading height" placeholder="176" value={height} min="50" max="250" onChange={event=>setHeight(event.target.value)}/>
      </label>
    </>}
    {mode==='aama-r10'&&<label className="panel-copy" style={{display:'block'}}>Confirm source DXF drawing units (required for local QA)
      <select aria-label="Seamly AAMA source drawing units" value={aamaUnit} onChange={event=>{setAamaUnit(event.target.value);setResult(null)}}>
        <option value="">Select unit used by the original SeamlyD2 export</option>
        <option value="mm">Millimeters (mm)</option>
        <option value="cm">Centimeters (cm)</option>
        <option value="inch">Inches (in)</option>
      </select>
    </label>}
    <button type="button" className="wide-action" disabled={!source||!measurements||busy||(mode==='aama-r10'&&!aamaUnit)} onClick={evaluate}>
      <Ruler size={14}/>{busy?'CALCULATING PATTERN…':'3 · CALCULATE USING ORIGINAL ENGINE'}
    </button>
    {error && <p role="alert" className="panel-copy" style={{color:'#ff9898'}}>Seamly2D: {error}</p>}
    {result && <>
      <p className="panel-copy"><strong>Calculated in Seamly2D</strong> · {result.artifacts.length} verified file(s) · factory approval pending</p>
      {preview && <img alt="Calculated Seamly2D pattern pieces" src={preview} style={{display:'block',width:'100%',maxHeight:220,objectFit:'contain',background:'#ffffff',borderRadius:8}}/>}
      {result.artifacts.map((file,index)=><button key={index} className="wide-action compact-action" type="button" onClick={()=>downloadFile(file)}>
        <Download size={14}/>DOWNLOAD {file.name} · {(file.sizeBytes/1024).toFixed(1)} KB
      </button>)}
      {result.format==='aama-r10'&&<div className="panel-copy" role="status">
        <strong>Local AAMA audit</strong> · {result.artifacts.length} sized file(s)
        {result.artifacts.map((file,index)=><p key={index}>
          {file.sizeCm??'Draft'}: {file.localInspection?.sourceCutPieces??'?'} original physical CUT pieces,
          {' '}{file.localInspection?.closedContourInventory??'?'} closed contours,
          {' '}{file.localInspection?.notchCount??'?'} notches,
          {' '}{file.localInspection?.grainlineCount??'?'} grainlines.
          {' '}External receiving CAD and 1:1 scale witness pending.
        </p>)}
      </div>}
      {result.format==='aama-r10' && result.sizesCm?.length>=2 &&
        <button type="button" className="wide-action compact-action" disabled={!aamaUnit||busy} onClick={downloadReceiverPacket}>
          <Download size={14}/>DOWNLOAD GRADED RECEIVER-CAD QA PACK · NOT APPROVED
        </button>}
      {result.format==='aama-r10' && result.sizesCm?.length>=2 && <div className="panel-copy" data-native-seamly-graded-qa="true" style={{padding:9,marginTop:8,border:'1px solid currentColor',borderRadius:7}}>
        <strong>ORIGINAL MULTI-SIZE CUT → NATIVE DRAFT GRADE INSPECTOR</strong>
        {gradeStudyBusy?<p>Independently auditing original graded CUT geometry and SHA-256…</p>:
          gradeStudy?.ok?<>
            <p>Verified {gradeStudy.sizes.join(', ')} · {gradeStudy.sourceBlocks.length} CUT blocks per size · {gradeStudy.blockers.length} size/correspondence issue(s).</p>
            <p>Every-size native draft contours are separately available in the inspection output. The native Rust editor has **not** committed graded formulas, topology or rules.</p>
            {correspondenceStudy&&<div role="status" data-seamly-native-vertex-correspondence="true">
              <p><strong>Independent physical vertex correspondence:</strong> {correspondenceStudy.ok?'source-shape index mapping measured across sizes':'blocked for unsafe or ambiguous geometry'}.
                {' '}This does not create a true industrial rule table.</p>
              <p>{correspondenceStudy.correspondence?.length||0} CUT block(s) analyzed · {correspondenceStudy.blockers?.length||0} correspondence blocker(s) · all original SHA-256 source identities retained.</p>
              {(correspondenceStudy.blockers||[]).slice(0,6).map((issue,index)=><small key={index} style={{display:'block'}}>Correspondence blocker: {issue}</small>)}
            </div>}
            {gradeStudy.blockers.slice(0,6).map((issue,index)=><small key={index} style={{display:'block'}}>Blocker: {issue}</small>)}
            <button type="button" className="wide-action compact-action" onClick={downloadGradeStudy}>DOWNLOAD ORIGINAL-SIZE CUT COMPARISON · NOT APPROVED</button>
          </>:<p role="alert">Graded source QA refused: {gradeStudy?.reason||'Unable to verify graded CUT source'}</p>}
      </div>}
      {result.format==='aama-r10' && result.artifacts.map((file,index)=><button key={`inspect-${index}`} type="button" className="wide-action compact-action" disabled={!aamaUnit} onClick={()=>setCutReview({file,unit:aamaUnit})}>
        INSPECT CUT + DRAW + NOTCH + GRAIN · {file.sizeCm??'DRAFT'}
      </button>)}
      {nativeMode&&typeof onNativeImport==='function'&&result.format==='aama-r10'&&result.artifacts.map((file,index)=>{
        const inventory=nativeInventories[index]
        return <div key={'native-'+index} className="panel-copy" style={{border:'1px solid currentColor',borderRadius:7,padding:8,marginTop:7}}>
          <strong>EDITABLE NATIVE CUT · {file.sizeCm??'DRAFT'}</strong>
          {inventory?.ok?<>
            <label style={{display:'block'}}>One upstream physical CUT piece
              <select aria-label={`Native Seamly CUT piece ${file.sizeCm??'draft'}`} value={nativeChoice[index]??''} onChange={event=>setNativeChoice(v=>({...v,[index]:event.target.value}))}>
                <option value="">Select an upstream block</option>
                {inventory.pieces.map(piece=><option key={piece.index} value={piece.index} disabled={!piece.eligible}>{piece.name} · {piece.originalVertices} points {piece.eligible? `→ ${piece.vertices} native points`:'(requires curve import)'}</option>)}
              </select>
            </label>
            {nativeChoice[index]!==undefined&&nativeChoice[index]!==''&&<small>Physical CUT only · maximum deviation {inventory.pieces[Number(nativeChoice[index])]?.deviationMm?.toFixed(3)||'?'} mm · no Seamly formula or graded sewing rules are transferred</small>}
            <button type="button" className="wide-action compact-action" disabled={nativeChoice[index]===undefined||nativeChoice[index]===''||!inventory.pieces[Number(nativeChoice[index])]?.eligible||!!nativePending} onClick={()=>{
              const requestId='seamly-cut-'+Date.now()+'-'+index
              setNativePending(requestId);setNativeMessage('Asking native Rust to create one reversible CUT-only draft…')
              onNativeImport({file,unit:aamaUnit,index:Number(nativeChoice[index]),requestId})
            }}>ADD CUT AS EDITABLE NATIVE RUST PANEL · DRAFT ONLY</button>
          </>:<p role="alert">Native CUT import unavailable: {inventory?.reason||'invalid AAMA source'}</p>}
        </div>
      })}
      {nativeMessage&&<p className="panel-copy" role="status">{nativeMessage}</p>}
      {typeof onReferenceImport === 'function' && result.format==='aama-r10' && result.artifacts.length === 1 &&
        <>
          {!nativeMode && <button type="button" className="wide-action compact-action" disabled={!aamaUnit} onClick={()=>onReferenceImport(result.artifacts[0],result,{editable:false,unit:aamaUnit})}>VIEW IN LEGACY 2D AS LOCKED REFERENCE</button>}
          {!nativeMode && <button type="button" className="wide-action compact-action" disabled={!aamaUnit} onClick={()=>onReferenceImport(result.artifacts[0],result,{editable:true,unit:aamaUnit})}>CREATE EDITABLE LEGACY DRAFT · UNAPPROVED</button>}
        </>}
      {nativeMode&&result.format==='aama-r10'&&<p className="panel-copy">Native Rust supports reversible one-piece-at-a-time physical CUT draft imports above. Notches, industrial grades, source formula graph, seam allowances and CUT/STITCH pairing remain in external source records and are NOT yet native factory-grade transfers.</p>}
      <p className="panel-copy">Source SHA-256: {result.inputSha256?.slice(0,16)}… · Measurement SHA-256: {result.measurementsSha256?.slice(0,16)}…</p>
      <p className="panel-copy">The factory-release gate remains blocked until cutting/stitching semantics, scale and an independent receiving CAD test have been approved.</p>
    </>}
    {cutReview&&<SeamlyAamaCutReview20261023 file={cutReview.file} unit={cutReview.unit} onClose={()=>setCutReview(null)}/>}
  </div>
}
