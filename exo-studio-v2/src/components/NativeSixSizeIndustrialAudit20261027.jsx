import React,{useEffect,useRef,useState} from 'react'

const SIX=['XS','S','M','L','XL','XXL']
const numeric=n=>typeof n==='number'&&Number.isFinite(n)
const mm=n=>numeric(n)?`${(n*1000).toFixed(2)} mm`:'—'
const vector=p=>Array.isArray(p)&&p.length===2&&p.every(numeric)

/** Native engine evidence only; an external factory/receiving CAD is not assessed. */
export function verifyNativeSixSizeIndustrialAuditPacket20261027(result,revision,panelId){
  if (!result||result.format!=='exo-native-linked-industrial-six-size-proof.v1'||
    result.sourceRevision!==revision||result.sourcePanelId!==panelId||
    result.manufacturerApproved!==false||result.factoryApproved!==false||
    result.pairedSewingVerified!==false||result.sizes?.length!==6||
    !Array.isArray(result.sizes))return false
  let originalIds=null
  return result.sizes.every((row,i)=>{
    if(row?.size!==SIX[i]||row.panelId!==panelId||!Array.isArray(row.edges)||row.edges.length<3)return false
    const ids=row.edges.map(e=>e?.edgeId)
    if(ids.some(id=>typeof id!=='string'||!id)||new Set(ids).size!==ids.length||
      originalIds&&JSON.stringify(ids)!==JSON.stringify(originalIds))return false
    if(!originalIds)originalIds=ids
    return row.edges.every(edge=>numeric(edge.physicalSeamArclengthM)&&edge.physicalSeamArclengthM>0&&
      (edge.allowanceM===null||edge.allowanceM===undefined||numeric(edge.allowanceM)&&edge.allowanceM>0)&&
      (edge.minAllowanceNormalAlignment===null||edge.minAllowanceNormalAlignment===undefined||numeric(edge.minAllowanceNormalAlignment)&&edge.minAllowanceNormalAlignment>=0.999)&&
      Array.isArray(edge.notches)&&edge.notches.every(mark=>numeric(mark.fraction)&&mark.fraction>0&&mark.fraction<1&&
        numeric(mark.seamArclengthM)&&mark.seamArclengthM>0&&numeric(mark.depthM)&&mark.depthM>0&&
        vector(mark.stitchPositionM)&&vector(mark.outwardNormal)&&vector(mark.markerEndM)))
  })
}

export default function NativeSixSizeIndustrialAudit20261027({snapshot,disabled=false,onAudit}){
  const [panelId,setPanelId]=useState('')
  const [report,setReport]=useState(null)
  const [notice,setNotice]=useState('')
  const [busy,setBusy]=useState(false)
  const generation=useRef(0)
  const latestRevision=useRef(snapshot?.revision)
  const revision=snapshot?.revision
  latestRevision.current=revision
  useEffect(()=>{generation.current++;setReport(null);setNotice('');setBusy(false)},[revision])
  const panels=(snapshot?.template?.panels||[]).filter(p=>p?.polygon&&
    ((p.polygon.notches&&Object.keys(p.polygon.notches).length)||
      (p.polygon.seam_allowances&&Object.keys(p.polygon.seam_allowances).length)))
  const selected=panels.find(p=>p.id===panelId)
  const blocker=disabled?'Native workspace is busy.':!Number.isSafeInteger(revision)?'A native source revision is required.':
    snapshot?.activeGradedSize?'Restore the base size before industrial auditing.':
    snapshot?.gradeRunPersisted!==true?'Save all six native graded sizes first.':
    !panels.length?'No authored native notches or seam allowances are available.':
    !selected?'Select an industrial pattern piece.':''
  const stale=Boolean(report&&(report.sourceRevision!==revision||report.sourcePanelId!==panelId))
  const ready=report&&!stale&&verifyNativeSixSizeIndustrialAuditPacket20261027(report,revision,panelId)
  function select(id){generation.current++;setPanelId(id);setReport(null);setNotice('')}
  async function inspect(){
    if(blocker||busy||typeof onAudit!=='function')return
    const ticket=++generation.current
    const capturedRevision=revision,capturedPanel=panelId
    setBusy(true);setReport(null);setNotice('')
    try{
      const result=await onAudit({sourceRevision:capturedRevision,panelId:capturedPanel})
      if(ticket!==generation.current)return
      if(latestRevision.current!==capturedRevision||
        !verifyNativeSixSizeIndustrialAuditPacket20261027(result,capturedRevision,capturedPanel))
        throw Error('Native industrial proof is missing, stale, or incomplete for the six graded sizes.')
      setReport(result)
      setNotice('Physical stitch, allowance and notch stations measured in all six saved Rust sizes. Factory uncertified.')
    }catch(error){if(ticket===generation.current)setNotice(error instanceof Error?error.message:String(error))}
    finally{if(ticket===generation.current)setBusy(false)}
  }
  return <section aria-label="Native six-size industrial station audit" data-native-six-size-industrial-audit="true">
    <h3>Six-size native industrial geometry</h3>
    <p>Rust-measured curved/straight stitch lengths, notch arclength positions and allowance normals on the saved XS–XXL patterns. Read-only. Sewing alignment and factory cutting require separate acceptance.</p>
    <label>Industrial pattern piece <select aria-label="Native industrial audit piece" value={panelId} disabled={disabled||busy} onChange={e=>select(e.target.value)}>
      <option value="">Choose a saved piece</option>{panels.map(p=><option key={p.id} value={p.id}>{p.name||p.id}</option>)}
    </select></label>
    {blocker&&<p role="status">{blocker}</p>}
    <button type="button" disabled={Boolean(blocker)||busy||typeof onAudit!=='function'} onClick={inspect}>{busy?'Auditing Rust geometry…':'Measure all six industrial patterns'}</button>
    {stale&&<p role="alert">The source revision or selected pattern changed. Prior industrial evidence is stale.</p>}
    {notice&&<p role="status">{notice}</p>}
    {ready&&<div aria-label="Native industrial size proof"><p>Verified source revision {report.sourceRevision} · six sizes · {panelId} · industrial geometry only.</p>
      <table aria-label="Native industrial six-size physical measurements"><thead><tr><th>Size</th><th>Named edge</th><th>Stitch length</th><th>Allowance</th><th>Notch stations</th></tr></thead><tbody>
      {report.sizes.flatMap(row=>row.edges.map(edge=><tr key={`${row.size}:${edge.edgeId}`}><th>{row.size}</th><th>{edge.edgeId}</th><td>{mm(edge.physicalSeamArclengthM)}</td><td>{mm(edge.allowanceM)}</td><td>{edge.notches.length?edge.notches.map(mark=>`${mm(mark.seamArclengthM)} at ${(mark.fraction*100).toFixed(2)}%`).join('; '):'None'}</td></tr>))}
      </tbody></table></div>}
    <p>Factory approval: none. Paired sewing verification: none. Modaris interchange acceptance: none. This report does not authorize cutting or manufacture.</p>
  </section>
}
