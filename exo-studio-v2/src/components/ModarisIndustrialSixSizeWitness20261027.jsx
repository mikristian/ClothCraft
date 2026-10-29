import React,{useState} from 'react'
import {auditModarisIndustrialSixSizeWitness20261027 as audit,
  verifyModarisIndustrialSixSizeWitness20261027 as verify} from '../core/modarisIndustrialSixSizeWitness20261027.js'

const safeSource=project=>{try{return JSON.stringify(project)}catch{return 'invalid source'}}
/** Operator-initiated proof; not a factory-release switch. */
export default function ModarisIndustrialSixSizeWitness20261027({project,disabled=false,nativeMode=false}){
  const [result,setResult]=useState(null)
  const [notice,setNotice]=useState('Run exact physical CUT/STITCH and independent DXF receiver tests for all six graded sizes.')
  const current=safeSource(project)
  const blocker=disabled?'The pattern workspace is busy.':
    nativeMode?'This verifies the legacy graded project; native Rust grading requires a separate acceptance.':
    !Number.isSafeInteger(project?.revision)?'A revisioned legacy project is required.':
    !Array.isArray(project?.grading?.sizes)||project.grading.sizes.length!==6?
      'Six graded sizes are required.':' '
  const stale=Boolean(result&&result.source!==current)
  const run=()=>{
    if(blocker.trim()){setNotice(blocker);return}
    const proof=audit(project,{expectedRevision:project.revision})
    setResult({proof,source:current})
    setNotice(proof.ok?
      `${proof.physicalContourCount} physical CUT/STITCH contour pairs and ${proof.rows.length} size-specific DXF receiver cases validated locally. Licensed Modaris and physical cutting remain unverified.`:
      `Industrial size-run rejected: ${proof.reason}`)
  }
  const recheck=()=>{
    if(!result?.proof?.ok||stale||blocker.trim())return
    const checked=verify(project,result.proof)
    setNotice(checked.ok?'Current source and every size-specific output still match the recorded industrial witness. No factory release is implied.':
      `Witness is no longer valid: ${checked.reason}`)
  }
  return <section aria-label="Modaris physical six-size industrial validation" data-modaris-six-size-industrial-witness="true" style={{display:'grid',gap:8}}>
    <h3>Six-size physical CUT / STITCH / DXF receiving witness</h3>
    <p>Graded industrial geometry is verified in centimetres and the receiving DXF in millimetres. This checks separate CUT and STITCH closed outlines, IDs, physical notch locations, grade dimensions and a deterministic per-size DXF digest.</p>
    <p>Independent external Modaris MDL receiving, cutter calibration, fabric shrinkage and actual sample fit are <strong>not</strong> verified by this tool.</p>
    {blocker.trim()&&<p role="alert">{blocker}</p>}
    <button type="button" disabled={Boolean(blocker.trim())} onClick={run}>Audit all six physical sizes and DXF geometry</button>
    {result&&!stale&&result.proof.ok&&<div aria-label="Verified six-size physical CUT STITCH evidence">
      <strong>{result.proof.physicalContourCount} physical contour pairs · {result.proof.rows.length} graded DXF size receipts · NOT factory approved</strong>
      <div style={{overflowX:'auto'}}><table><thead><tr><th>Size</th><th>Pieces</th><th>CUT area (cm²)</th><th>STITCH area (cm²)</th><th>Notches</th><th>DXF bytes</th></tr></thead><tbody>
        {result.proof.rows.map(row=><tr key={row.size}><td>{row.size}</td><td>{row.pieceIds.length}</td>
          <td>{row.physicalCutAreaCm2.toFixed(3)}</td><td>{row.stitchAreaCm2.toFixed(3)}</td>
          <td>{row.notchCount}</td><td>{row.dxfByteCount}</td></tr>)}
      </tbody></table></div>
      <p>SHA-256 source: {result.proof.sourceSha256}</p>
      <p>SHA-256 six-size output: {result.proof.witnessSha256}</p>
      <button type="button" onClick={recheck}>Recheck all six-size geometry against saved digest</button>
    </div>}
    {stale&&<p role="alert">The pattern has changed since the industrial audit. Run it again; previous acceptance is invalid.</p>}
    <p role="status">{notice}</p>
  </section>
}
