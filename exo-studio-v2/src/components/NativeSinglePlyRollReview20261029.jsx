import React,{useEffect,useRef,useState} from 'react'
import {prepareNativeSinglePlyRollStudy20261029} from '../core/nativeSinglePlyRollReview20261029.js'

const initial = (source,request) => {
 const rows={}
 for(const panel of source?.panels||[]){
  const fabricId=request?.materialsByPanel?.[panel.id]?.fabricId
  if(!fabricId||Object.hasOwn(rows,fabricId))continue
  rows[fabricId]={rollId:'ROLL-'+fabricId,usableWidthCm:'',
   availableLengthCm:'',shadeId:'',dyeLotId:'',batchId:'',
   endLossCm:'',defects:''}
 }
 return rows
}

/** Optional digital native single-ply review. Operator supplies physical
 * roll declarations; server always re-fetches native Rust source/CUT. Never
 * sends client CUT points, never authorizes a machine.
 */
export default function NativeSinglePlyRollReview20261029({
 nativeBase,nativeRevision,source,request,disabled=false,
}){
 const [entries,setEntries]=useState(()=>initial(source,request))
 const [report,setReport]=useState(null)
 const [error,setError]=useState('')
 const [busy,setBusy]=useState(false)
 const [verified,setVerified]=useState(null)
 const epoch=useRef(0),pending=useRef(null)
 const current=useRef({nativeBase,nativeRevision,disabled,source,request})
 const verifiedInput=useRef(null)
 current.current={nativeBase,nativeRevision,disabled,source,request}
 useEffect(()=>{
  epoch.current++
  pending.current?.abort()
  verifiedInput.current=null
  setEntries(initial(source,request))
  setReport(null);setVerified(null);setError('');setBusy(false)
  return ()=>{epoch.current++;pending.current?.abort()}
 },[nativeBase,nativeRevision,source,request])
 // Parent CUT inspection temporarily disables inputs while its own native
 // request runs. That is NOT a new garment/order identity: preserve declared
 // roll widths, lot, defects and any prior valid QA study across that toggle.
 // Only abort a pending child request while disabled; source changes above
 // still reset stale evidence.
 useEffect(()=>{
  if(!disabled)return
  epoch.current++
  pending.current?.abort()
  setBusy(false)
 },[disabled])
 const invalidate=()=>{
  epoch.current++
  pending.current?.abort()
  verifiedInput.current=null
  setReport(null);setVerified(null);setError('');setBusy(false)
 }
 const update=(fabricId,key,value)=>{
  invalidate()
  setEntries(previous=>({...previous,
   [fabricId]:{...previous[fabricId],[key]:value}}))
 }
 const requestNative=async(route,packet,controller)=>{
  const res=await fetch(nativeBase+'/production/native-verified/v1/'+route,{
   method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify(packet),signal:controller.signal})
  const data=await res.json()
  if(!res.ok||data.ok!==true)
   throw Error(data?.code||data?.result?.issues?.[0]?.detail||'NATIVE_ROLL_REVIEW_BLOCKED')
  return data.result
 }
 const run=async()=>{
  if(busy||disabled||!source||source.revision!==nativeRevision)return
  const stillCurrent=()=>{
   const now=current.current
   return now.nativeBase===nativeBase &&
    now.nativeRevision===nativeRevision && now.disabled===false &&
    now.source===source && now.request===request
  }
  const ticket=++epoch.current
  const controller=new AbortController()
  pending.current?.abort()
  pending.current=controller
  setBusy(true);setReport(null);setVerified(null);setError('')
  try{
   const planning=prepareNativeSinglePlyRollStudy20261029(source,request,entries)
   const result=await requestNative('roll-study',{order:request,planning},controller)
   if(ticket!==epoch.current||!stillCurrent())return
   if(result.cuttingAuthorized!==false||result.factoryApproved!==false||
     result.manifest?.nativeSourceRevision!==nativeRevision ||
     result.manifest?.nativeSourceFingerprint!==source.sourceFingerprint ||
     result.manifest?.nativeCutlineFingerprint!==source.nativeCutlineFingerprint)
    throw Error('NATIVE_ROLL_REVIEW_SOURCE_OR_RELEASE_MISMATCH')
   const packet={manifest:result.manifest,manifestSha256:result.manifestSha256}
   const checked=await requestNative('roll-study-inspect',{
    order:request,planning,packet,
   },controller)
   if(ticket!==epoch.current||!stillCurrent())return
   if(checked.ok!==true||checked.manifestSha256!==result.manifestSha256 ||
     checked.cuttingAuthorized!==false||checked.factoryApproved!==false)
    throw Error('NATIVE_ROLL_REVIEW_REINSPECTION_MISMATCH')
   setReport(result)
   setVerified(checked)
   verifiedInput.current={source,request,nativeBase,nativeRevision,
     manifestSha256:result.manifestSha256}
  }catch(err){if(ticket===epoch.current&&stillCurrent())setError(err.message||String(err))}
  finally{
   if(pending.current===controller)pending.current=null
   if(ticket===epoch.current)setBusy(false)
  }
 }
 const download=()=>{
  const bound=verifiedInput.current
  if(!report||!verified||disabled||source?.revision!==nativeRevision||
    !bound||bound.source!==source||bound.request!==request||
    bound.nativeBase!==nativeBase||bound.nativeRevision!==nativeRevision||
    bound.manifestSha256!==report.manifestSha256||
    report.manifest?.nativeSourceFingerprint!==source.sourceFingerprint||
    report.manifest?.nativeCutlineFingerprint!==source.nativeCutlineFingerprint||
    report.factoryApproved!==false||report.cuttingAuthorized!==false||
    verified.manifestSha256!==report.manifestSha256)return
  const blob=new Blob([JSON.stringify({
   manifest:report.manifest,manifestSha256:report.manifestSha256,
   cuttingAuthorized:false,factoryApproved:false,
  },null,2)],{type:'application/json'})
  const url=URL.createObjectURL(blob)
  const a=document.createElement('a')
  a.href=url;a.download='EXO-native-single-ply-roll-QA-NOT-APPROVED.json'
  document.body.append(a)
  try{a.click()}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 }
 return <section aria-label="Native single ply roll planning QA" style={{
  marginTop:12,padding:12,border:'1px solid #567b92',borderRadius:8}}>
  <strong>Single-ply roll planning · Digital QA only</strong>
  <p>This is one complete marker of physical panel CUT quantities per size and fabric,
   not a calculated multi-ply garment order. Declare roll inventory and defect intervals
   for inspection. Enter <strong>none</strong> to explicitly declare no known defects;
   a blank defect field will be rejected. Fill in measured roll width and available
   length, and explicitly decide end loss (including zero). Supplied shade/roll IDs
   do not prove a physical roll was inspected. No cutter commands are created.</p>
  {Object.entries(entries).map(([fabricId,row])=>
   <fieldset key={fabricId} disabled={disabled||busy}
     style={{padding:8,marginBottom:8,border:'1px solid #789'}}>
    <legend>{fabricId} · Native marker group {request?.materialsByPanel?.[
     source?.panels?.find(p=>request?.materialsByPanel?.[p.id]?.fabricId===fabricId)?.id
    ]?.groupId||'unavailable'}</legend>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:8}}>
     {[
      ['rollId','Roll ID','text'],['usableWidthCm','Usable width (cm)','decimal'],
      ['availableLengthCm','Available length (cm)','decimal'],
      ['shadeId','Shade ID','text'],['dyeLotId','Dye lot ID','text'],
      ['batchId','Batch ID','text'],['endLossCm','End loss (cm)','decimal'],
     ].map(([key,label,type])=><label key={key} style={{display:'grid',gap:3}}>
       {label}
       <input aria-label={fabricId+' '+label}
        type={type==='decimal'?'number':'text'} inputMode={type==='decimal'?'decimal':undefined}
        step={type==='decimal'?'0.00001':undefined}
        min={type==='decimal'?'0':undefined}
        maxLength={type==='text'?64:undefined} value={row[key]??''}
        onChange={e=>update(fabricId,key,e.target.value)}/>
      </label>)}
    </div>
    <label style={{display:'grid',gap:3,marginTop:8}}>
     Declared unusable length intervals (cm): e.g. 0-5, 50-52 or none
     <input aria-label={fabricId+' Defect intervals'}
      placeholder="Required: enter intervals or none"
      value={row.defects??''} onChange={e=>update(fabricId,'defects',e.target.value)}/>
    </label>
   </fieldset>)}
  <button type="button" disabled={disabled||busy||!source||source.revision!==nativeRevision}
   onClick={run}>{busy?'Verifying Rust and rolls…':'Build and re-inspect native digital roll QA'}</button>
  {error&&<p role="alert">Roll study blocked: {error}</p>}
  {report&&verified&&!disabled&&
   verifiedInput.current?.nativeBase===nativeBase&&
   verifiedInput.current?.nativeRevision===nativeRevision&&
   verifiedInput.current?.source===source&&
   verifiedInput.current?.request===request&&<div role="status">
   <p><strong>Digital roll study re-inspected · NOT APPROVED.</strong>
    {' '}{report.manifest?.rows?.length} source-bound single-ply size/fabric assignments,
    {' '}{report.manifest?.rollSummaries?.length} declared rolls.
    Neither physical stock nor equipment was independently verified.</p>
   <div style={{overflowX:'auto'}}>
    <table aria-label="Source bound roll allocation QA" style={{fontSize:12}}>
     <thead><tr><th>Size</th><th>Fabric</th><th>Roll</th><th>CUT pieces</th><th>Start cm</th><th>End cm</th></tr></thead>
     <tbody>{report.manifest.rows.map(row=><tr key={row.size+'/'+row.fabricId}>
      <td>{row.size}</td><td>{row.fabricId}</td><td>{row.rollId}</td>
      <td>{row.nativeCutInstances}</td>
      <td>{row.startCm.toFixed(2)}</td><td>{row.endCm.toFixed(2)}</td>
     </tr>)}</tbody>
    </table>
   </div>
   <button type="button" onClick={download}>Download digital roll QA · NOT APPROVED</button>
  </div>}
 </section>
}
