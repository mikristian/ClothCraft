import React,{useEffect,useRef,useState} from 'react'

const SIZES=['XS','S','M','L','XL','XXL']
const finite=n=>typeof n==='number'&&Number.isFinite(n)
const metric=n=>finite(n)?`${(n*1000).toFixed(2)} mm`:'—'

/** Read-only graded sewn material lengths; a fit, cutter and factory gate remain independent. */
export function validateNativeSixSizeSewingAudit20261027(packet,revision){
  if(!packet||packet.format!=='exo-native-six-size-sewn-balance-audit.v1'||
    packet.sourceRevision!==revision||packet.factoryApproved!==false||
    packet.joinedCurveMutation!==false||typeof packet.easeReviewRequired!=='boolean'||
    !Array.isArray(packet.sizes)||packet.sizes.length!==6)return false
  let identities=null,observedEaseReview=false
  for(const [i,size] of packet.sizes.entries()){
    if(size?.size!==SIZES[i]||!Array.isArray(size.seams)||!size.seams.length)return false
    const ids=size.seams.map(seam=>seam?.seamId)
    if(ids.some(id=>typeof id!=='string'||!id)||new Set(ids).size!==ids.length||
      identities&&JSON.stringify(ids)!==JSON.stringify(identities))return false
    if(!identities)identities=ids
    for(const seam of size.seams){
      if(!finite(seam.mismatchM)||seam.mismatchM<0||typeof seam.allowEase!=='boolean'||
        typeof seam.requiresEaseReview!=='boolean'||
        seam.mismatchM>1e-5&&!seam.allowEase||
        seam.requiresEaseReview&&!seam.allowEase||
        !Array.isArray(seam.notchIntervalLengthsM)||!seam.notchIntervalLengthsM.length||
        seam.notchIntervalLengthsM.some(pair=>!Array.isArray(pair)||pair.length!==2||pair.some(x=>!finite(x)||x<=0)))return false
      for(const side of [seam.a,seam.b]){
        if(typeof side?.panelId!=='string'||!side.panelId||typeof side.edgeId!=='string'||!side.edgeId||
          !Array.isArray(side.interval)||side.interval.length!==2||
          side.interval.some(n=>!finite(n)||n<0||n>1)||side.interval[0]>=side.interval[1]||
          !finite(side.sewnIntervalM)||side.sewnIntervalM<=0||!finite(side.fullSewlineM)||
          side.fullSewlineM<side.sewnIntervalM||typeof side.reversed!=='boolean')return false
      }
      const measuredMismatch=Math.abs(seam.a.sewnIntervalM-seam.b.sewnIntervalM)
      if(Math.abs(measuredMismatch-seam.mismatchM)>1e-7)return false
      if(seam.notchIntervalLengthsM.some(pair=>Math.abs(pair[0]-pair[1])>1e-5)&&
        !seam.allowEase)return false
      if((measuredMismatch>1e-5||seam.notchIntervalLengthsM.some(pair=>Math.abs(pair[0]-pair[1])>1e-5))&&
        !seam.requiresEaseReview)return false
      if(seam.requiresEaseReview)observedEaseReview=true
    }
  }
  return observedEaseReview===packet.easeReviewRequired
}

export default function NativeSixSizeSewingAudit20261027({snapshot,disabled=false,onAudit}){
  const [report,setReport]=useState(null)
  const [notice,setNotice]=useState('')
  const [busy,setBusy]=useState(false)
  const generation=useRef(0)
  const latestRevision=useRef(snapshot?.revision)
  const revision=snapshot?.revision
  latestRevision.current=revision
  useEffect(()=>{generation.current++;setReport(null);setNotice('');setBusy(false)},[revision])
  const blocker=disabled?'Native workspace is busy.':!Number.isSafeInteger(revision)?'Current source revision required.':
    snapshot?.activeGradedSize?'Restore the base garment before auditing saved seams.':
    snapshot?.gradeRunPersisted!==true?'Save an actual native six-size grade catalog first.':
    !snapshot?.template?.seams?.length?'Author actual native sewing relationships first.':''
  const valid=report&&validateNativeSixSizeSewingAudit20261027(report,revision)
  const stale=Boolean(report&&!valid)
  async function inspect(){
    if(blocker||busy||typeof onAudit!=='function')return
    const ticket=++generation.current,captured=revision
    setBusy(true);setNotice('');setReport(null)
    try{
      const result=await onAudit({sourceRevision:captured})
      if(ticket!==generation.current)return
      if(latestRevision.current!==captured||!validateNativeSixSizeSewingAudit20261027(result,captured))
        throw Error('Current Rust six-size sewn evidence was unavailable or inconsistent.')
      setReport(result)
      setNotice(result.easeReviewRequired?'Sewing ease requires physical fullness and fit review.':'Six-size sewn intervals passed the native material-length check.')
    }catch(error){if(ticket===generation.current)setNotice(error instanceof Error?error.message:String(error))}
    finally{if(ticket===generation.current)setBusy(false)}
  }
  return <section aria-label="Native six-size sewing balance audit" data-native-six-size-sewing-audit="true">
    <h3>Saved six-size sewn geometry</h3>
    <p>Rust-measured physical sewn intervals across XS–XXL, including named edge identity, reverse orientation, paired authored stations and declared ease. Sewing changes remain a separate explicit authoring operation.</p>
    {blocker&&<p role="status">{blocker}</p>}
    <button type="button" disabled={Boolean(blocker)||busy||typeof onAudit!=='function'} onClick={inspect}>{busy?'Measuring sewn sizes…':'Audit six-size sewn balance'}</button>
    {stale&&<p role="alert">Stale native sewing measurements. Re-run the current six-size audit.</p>}
    {notice&&<p role="status">{notice}</p>}
    {valid&&<div aria-label="Native six-size sewing measurements"><p>{report.easeReviewRequired?'Requires physical easing review':'No length or notch mismatch detected by the native audit'} · source revision {report.sourceRevision}</p>
      <table aria-label="Native six-size sewn geometry"><thead><tr><th>Size</th><th>Seam</th><th>Side A</th><th>Side B</th><th>Mismatch</th><th>Result</th></tr></thead><tbody>
        {report.sizes.flatMap(item=>item.seams.map(seam=><tr key={`${item.size}:${seam.seamId}`}><th>{item.size}</th><th>{seam.seamId}</th>
          <td>{seam.a.panelId}/{seam.a.edgeId}: {metric(seam.a.sewnIntervalM)}</td>
          <td>{seam.b.panelId}/{seam.b.edgeId}: {metric(seam.b.sewnIntervalM)}</td><td>{metric(seam.mismatchM)}</td>
          <td>{seam.requiresEaseReview?'Ease review': 'Matched'}</td></tr>))}
      </tbody></table></div>}
    <p>Factory approval: none. Joined curved seam regeneration: unsupported. Independent physical fit and licensed Modaris receiver acceptance remain required.</p>
  </section>
}
