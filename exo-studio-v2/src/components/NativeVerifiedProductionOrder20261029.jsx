import React,{useEffect,useRef,useState} from 'react'
import {prepareNativeProductionOrderRequest,
  verifyNativeProductionOrderResponse20261029,
  summarizeNativeCutIntakeReview20261029}
  from '../core/nativeVerifiedProductionOrderClient20261029.js'
import NativeSinglePlyRollReview20261029 from './NativeSinglePlyRollReview20261029.jsx'

/**
 * Live graded order inspection. Only the trusted native bridge constructs the
 * source fingerprint and physical CUT payload. This view never sends editable
 * CUT geometry or browser-generated CUT hashes to the verifier.
 */
export default function NativeVerifiedProductionOrder20261029({nativeBase,nativeRevision,disabled=false}){
 const [source,setSource]=useState(null)
 const [quantities,setQuantities]=useState({})
 const [materials,setMaterials]=useState({})
 const [report,setReport]=useState(null)
 const [verifiedSummary,setVerifiedSummary]=useState(null)
 const [cutSummary,setCutSummary]=useState(null)
 const [error,setError]=useState('')
 const [loading,setLoading]=useState(false)
 const revisionRef=useRef(nativeRevision)
 const disabledRef=useRef(disabled)
 const requestEpochRef=useRef(0)
 const nativeBaseRef=useRef(nativeBase)
 const pendingFetchRef=useRef(null)
 const verificationRef=useRef(null)
 const sourceBindingRef=useRef(null)
 revisionRef.current=nativeRevision
 disabledRef.current=disabled
 nativeBaseRef.current=nativeBase
 useEffect(()=>{
  requestEpochRef.current++
  pendingFetchRef.current?.abort()
  verificationRef.current=null
  sourceBindingRef.current=null
  setLoading(false)
  setSource(null);setReport(null);setVerifiedSummary(null);setError('Native garment changed. Reload the exact saved grading catalog before inspecting.')
  setCutSummary(null)
  return ()=>{requestEpochRef.current++;pendingFetchRef.current?.abort();verificationRef.current=null}
 },[nativeRevision,nativeBase,disabled])
 const nativeRequest=async(action,packet)=>{
  const controller=new AbortController()
  pendingFetchRef.current?.abort()
  pendingFetchRef.current=controller
  try{
   const response=await fetch(nativeBase+'/production/native-verified/v1/'+action,{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify(packet),signal:controller.signal})
   const payload=await response.json()
   if(!response.ok||payload.ok!==true)throw Error(payload.code||'Native workspace refused production inspection')
   return payload
  }finally{
   if(pendingFetchRef.current===controller)pendingFetchRef.current=null
  }
 }
 const load=async()=>{
  if(loading||disabled)return
  const ticket=++requestEpochRef.current
  setLoading(true);setError('');setReport(null);setVerifiedSummary(null);setCutSummary(null);setSource(null)
  try{
   const next=(await nativeRequest('source',{})).source
   if(ticket!==requestEpochRef.current||revisionRef.current!==nativeRevision||
     nativeBaseRef.current!==nativeBase||
     disabledRef.current)return
   if(!next||next.revision!==nativeRevision)throw Error('Native revision changed; reopen the project and retry')
   if(!/^[a-f0-9]{64}$/.test(next.sourceFingerprint)||
     !/^[a-f0-9]{64}$/.test(next.nativeCutlineFingerprint))
     throw Error('Native source CUT fingerprints missing or malformed')
   // Ensure the same strict native source shape is accepted before displaying
   // an editable all-size panel quantity grid.
   prepareNativeProductionOrderRequest(next,
     Object.fromEntries(next.sizes.map(size=>[size,
       Object.fromEntries(next.panels.map(panel=>[panel.id,1]))])),
     Object.fromEntries(next.panels.map(panel=>[panel.id,{
       fabricId:panel.sourceFabricId,groupId:panel.sourceFabricId,
     }])))
   setSource(next)
   sourceBindingRef.current={nativeBase,nativeRevision}
   setQuantities(Object.fromEntries(next.sizes.map(size=>[
     size,Object.fromEntries(next.panels.map(panel=>[panel.id,'1']))])))
   setMaterials(Object.fromEntries(next.panels.map(panel=>[
     panel.id,{fabricId:panel.sourceFabricId,groupId:panel.sourceFabricId}])))
  }catch(e){if(ticket===requestEpochRef.current)setError(e.message||String(e))}
  finally{if(ticket===requestEpochRef.current)setLoading(false)}
 }
 const verify=async()=>{
  if(!source||disabled||loading)return
  const ticket=++requestEpochRef.current
  setLoading(true);setError('');setReport(null);setVerifiedSummary(null);setCutSummary(null)
  verificationRef.current=null
  try{
   if(source.revision!==nativeRevision)throw Error('Stale native grading revision; reload before submitting')
   const count=Object.fromEntries(source.sizes.map(size=>[size,
     Object.fromEntries(source.panels.map(panel=>{
       const raw=quantities[size]?.[panel.id]
       return [panel.id,typeof raw==='string'&&/^(?:[1-9]|[1-9][0-9])$/.test(raw)?Number(raw):NaN]
     }))]))
   const request=prepareNativeProductionOrderRequest(source,count,materials)
   const result=(await nativeRequest('order',request)).result
   if(ticket!==requestEpochRef.current||revisionRef.current!==nativeRevision||
     nativeBaseRef.current!==nativeBase||
     disabledRef.current)return
   const summary=verifyNativeProductionOrderResponse20261029(source,request,result)
   if(source.revision!==nativeRevision)
     throw Error('Native garment changed during verification')
   setVerifiedSummary(summary)
   setReport(result)
   verificationRef.current={source,request,result,summary,nativeBase,nativeRevision}
  }catch(e){if(ticket===requestEpochRef.current)setError(e.message||String(e))}
  finally{if(ticket===requestEpochRef.current)setLoading(false)}
 }
 const inspectCuts=async()=>{
  const bound=verificationRef.current
  if(disabled||loading||!bound||!source||!report||!verifiedSummary||
    bound.nativeBase!==nativeBase||bound.nativeRevision!==nativeRevision||
    bound.source!==source||bound.result!==report)return
  const ticket=++requestEpochRef.current
  setLoading(true);setError('');setCutSummary(null)
  try{
   const inspectedOrder=bound.request
   const result=(await nativeRequest('cut-intake',inspectedOrder)).result
   if(ticket!==requestEpochRef.current||
     nativeBaseRef.current!==nativeBase||
     revisionRef.current!==nativeRevision||disabledRef.current)return
   const packet={manifest:result.manifest,manifestSha256:result.manifestSha256}
   const checked=(await nativeRequest('cut-intake-inspect',{
    order:inspectedOrder,packet,
   })).result
   if(ticket!==requestEpochRef.current||
     nativeBaseRef.current!==nativeBase||
     revisionRef.current!==nativeRevision||disabledRef.current||
     verificationRef.current!==bound)return
   const summary=summarizeNativeCutIntakeReview20261029(
     source,inspectedOrder,result,checked)
   if(summary.physicalPieces!==verifiedSummary.placements)
     throw Error('Native CUT intake does not match verified marker quantities')
   setCutSummary(summary)
  }catch(e){if(ticket===requestEpochRef.current)setError(e.message||String(e))}
  finally{if(ticket===requestEpochRef.current)setLoading(false)}
 }
 const download=()=>{
 const verified=verificationRef.current
 if(!report||!verifiedSummary||!source||!verified||
   verified.source!==source||verified.result!==report||verified.summary!==verifiedSummary||
   verified.nativeBase!==nativeBase||verified.nativeRevision!==nativeRevision||
   sourceBindingRef.current?.nativeBase!==nativeBase||
   sourceBindingRef.current?.nativeRevision!==nativeRevision||
   source.revision!==revisionRef.current||
   report.factoryApproved!==false||report.cuttingAuthorized!==false||disabledRef.current)return
  const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}))
  const a=document.createElement('a');a.href=url;a.download='EXO-native-graded-marker-QA-NOT-APPROVED.json'
  document.body.append(a)
  try{a.click()}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 }
 // Passive effects may not run until after React has rendered the new bridge
 // URL. Never display or export old-source evidence in that transition frame.
 const stale=source&&(
  source.revision!==nativeRevision||
  sourceBindingRef.current?.nativeBase!==nativeBase||
  sourceBindingRef.current?.nativeRevision!==nativeRevision)
 const invalidate=()=>{
   requestEpochRef.current++
   pendingFetchRef.current?.abort()
   verificationRef.current=null
   setLoading(false)
   setError('')
   setReport(null)
   setVerifiedSummary(null)
   setCutSummary(null)
 }
 return <section aria-label="Native verified graded production order"
  data-native-verified-production-order="true" style={{border:'1px solid #567b92',borderRadius:8,padding:12,marginBlock:12}}>
   <strong>Native Verified Graded Order · All Sizes</strong>
   <p>Read the saved grade catalog and physical CUT directly from the same Rust session. Declare quantities below; marker group labels are recorded as metadata, while the native marker planner currently groups pieces by source fabric. This study does not inspect roll defects, physical roll allocations, spreading or machine clearance, and is not cutting authorization.</p>
   <button type="button" disabled={disabled||loading} onClick={load}>
     {loading?'Checking Rust…':'Load saved native size and material source'}
   </button>
   {source&&!stale&&!disabled&&<>
    <p role="status">Native revision {source.revision} · {source.sizes.length} sizes · {source.panels.length} source pieces. Source and CUT fingerprints loaded from the Rust bridge; physical fabric and machine approval are not established.</p>
    <div style={{overflowX:'auto',maxHeight:340,overflowY:'auto'}}>
     <table aria-label="Native graded cutpiece quantity matrix" style={{borderCollapse:'collapse',fontSize:12}}>
      <thead><tr><th scope="col">Size</th>{source.panels.map(panel=><th scope="col" key={panel.id}>{panel.name}</th>)}</tr></thead>
      <tbody>{source.sizes.map(size=><tr key={size}><th scope="row">{size}</th>{source.panels.map(panel=>
       <td key={panel.id}><input type="number" min="1" max="99" step="1" required
         style={{width:70}} aria-label={size+' cut quantity '+panel.id}
         value={quantities[size]?.[panel.id]??''} onChange={e=>{
          invalidate()
          setQuantities(v=>({...v,[size]:{...v[size],[panel.id]:e.target.value}}))
          setReport(null);setVerifiedSummary(null)
         }}/></td>)}</tr>)}</tbody>
     </table>
    </div>
    <div>{source.panels.map(panel=><div key={panel.id} style={{marginBlock:8}}>
      <strong>{panel.name}</strong> · Native source fabric {panel.sourceFabricId} · grain {panel.sourceGrainDegrees}°
      <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
       <label>Source-controlled cutting material <input readOnly aria-label={'Cutting fabric '+panel.id}
         value={materials[panel.id]?.fabricId??''}/></label>
       <label>Marker group <input aria-label={'Marker group '+panel.id}
         value={materials[panel.id]?.groupId??''} onChange={e=>{
          invalidate()
          setMaterials(m=>({...m,[panel.id]:{...m[panel.id],groupId:e.target.value}}));setReport(null);setVerifiedSummary(null)
         }}/></label>
      </div>
     </div>)}</div>
    <button type="button" disabled={disabled||loading||stale} onClick={verify}>Verify live Rust CUT and calculate every size marker</button>
   </>}
   {error&&<p role="alert">{error}</p>}
   {report&&verifiedSummary&&verificationRef.current?.nativeBase===nativeBase&&
    verificationRef.current?.nativeRevision===nativeRevision&&
    !stale&&!disabled&&<div role="status">
    <strong>Verified native CUT-to-marker study · not approved</strong>
    <p>{verifiedSummary.sizeCount} graded sizes · {verifiedSummary.placements} physical cutpiece placements.
     Marker grouping uses source fabric. Roll-defect, spreading, ply-stack and carriage preflight remain unverified in this route. No cutter, calibrated fabric or factory permission has been verified.</p>
    <button type="button" onClick={download}>Download source-bound QA JSON · NOT APPROVED</button>
    <button type="button" disabled={disabled||loading} onClick={inspectCuts}>
     {loading?'Checking native CUT…':'Re-inspect native CUT contours and seam/notch metadata'}
    </button>
    {cutSummary&&<p role="status">
     Native CUT intake independently rechecked: {cutSummary.sizeCount} sizes,
     {' '}{cutSummary.panelCount} source panels,
     {' '}{cutSummary.physicalPieces} physical CUT instances,
     {' '}{cutSummary.notchRecords} source notch records.
     Source CUT polygon areas total {cutSummary.totalCutAreaCm2.toFixed(2)} cm²
     across the declared instances, not physical roll usage.
     Notch transfer to a cutter and factory clearance remain unverified.
    </p>}
    <NativeSinglePlyRollReview20261029 nativeBase={nativeBase}
     nativeRevision={nativeRevision} source={source}
     request={verificationRef.current?.request} disabled={disabled||loading}/>
   </div>}
  </section>
}
