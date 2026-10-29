import React,{useEffect,useState} from 'react'

const control={padding:'6px 8px',borderRadius:5,border:'1px solid #87909b',
  background:'transparent',color:'inherit',minWidth:0}
const safe=value=>/^[A-Za-z0-9-]{1,24}$/.test(value)

/** Actual native Rust F7 correspondence authoring, distinct from the draft
 * size-evolution table. This component never writes project geometry itself. */
export default function NativeGradeSizeCorrespondenceStudio20261028({
 snapshot,disabled=false,onInspect,onCommit,
}){
 const [catalog,setCatalog]=useState(null)
 const [aliases,setAliases]=useState({})
 const [label,setLabel]=useState('US16')
 const [target,setTarget]=useState('')
 const [working,setWorking]=useState(false)
 const [message,setMessage]=useState('Inspect the saved Rust catalog before editing its external size labels.')
 useEffect(()=>{
  // The real Rust bridge publishes its new snapshot before the postcommit
  // durable receipt returns. Do not erase the pending operation's outcome.
  if(working)return
  setCatalog(null);setAliases({});setMessage('Native revision changed. Inspect the Rust catalog again.')
 },[snapshot?.revision])
 const inspect=async()=>{
  if(typeof onInspect!=='function'){setMessage('Native inspection callback unavailable.');return}
  setWorking(true)
  try{
   const result=await onInspect()
   if(!result?.ok){setCatalog(null);setMessage('Inspection rejected: '+(result?.reason||'No native receipt'));return}
   setCatalog({revision:result.revision,sizes:result.sizes})
   setAliases({...result.aliases})
   setTarget(result.sizes[0]||'')
   setMessage(`Verified ${result.sizes.length} saved native sizes at revision ${result.revision}. Changes below are drafts until explicitly committed.`)
  }catch(error){setCatalog(null);setMessage('Inspection failed: '+String(error?.message||error))}
  finally{setWorking(false)}
 }
 const add=()=>{
  if(!catalog||!safe(label)||!catalog.sizes.includes(target)||catalog.sizes.includes(label)){
   setMessage('Choose a safe external alias distinct from every canonical size and an existing native target.');return
  }
  setAliases(previous=>({...previous,[label]:target}))
  setMessage('Local correspondence draft updated. Rust has not been changed.')
 }
 const apply=async()=>{
  if(!catalog||typeof onCommit!=='function'){setMessage('Native commit callback unavailable.');return}
  setWorking(true)
  try{
   const result=await onCommit({expectedRevision:catalog.revision,aliases})
   if(!result?.ok){setMessage((result?.needsNativeRecovery?'Native commit outcome needs recovery: inspect Undo/history before retrying. ':'Native rejected before dispatch. ')+(result?.reason||'No receipt'));return}
   setCatalog(null)
   setMessage(`Rust committed ${result.aliases} correspondences across ${result.authoredSizes} authored sizes in revision ${result.revision}; inspect again to verify the current saved catalog.`)
  }catch(error){setMessage('Native commit result unknown; inspect history: '+String(error?.message||error))}
  finally{setWorking(false)}
 }
 const locked=disabled||working||Boolean(snapshot?.activeGradedSize)
 return <section aria-label="Native Rust F7 size correspondence" data-native-f7-correspondence="true"
  style={{display:'grid',gap:8,padding:10,border:'1px solid #77828e',borderRadius:7}}>
  <strong>F7 · Rust-persisted external size correspondence</strong>
  <small>Maps outside labels to existing native sizes. No graded geometry is invented; factory release and independent receiving-CAD approval remain blocked.</small>
  <button type="button" style={control} disabled={locked||!snapshot?.gradeRunPersisted} onClick={inspect}>Inspect saved native size catalog</button>
  {catalog&&<>
   <small>Source revision {catalog.revision} · canonical sizes {catalog.sizes.join(' / ')}</small>
   <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
    <label>External alias <input aria-label="Native external size alias" style={control} value={label} onChange={event=>setLabel(event.target.value)} maxLength={24}/></label>
    <label>Canonical size <select aria-label="Native alias target size" style={control} value={target} onChange={event=>setTarget(event.target.value)}>
     {catalog.sizes.map(size=><option key={size} value={size}>{size}</option>)}
    </select></label>
    <button type="button" style={control} disabled={locked} onClick={add}>Stage mapping</button>
   </div>
   <table aria-label="Native external size correspondence draft" style={{width:'100%',fontSize:12}}>
    <thead><tr><th>External label</th><th>Native size</th><th>Draft action</th></tr></thead>
    <tbody>{Object.entries(aliases).sort(([a],[b])=>a.localeCompare(b)).map(([key,value])=><tr key={key}>
     <td>{key}</td><td>{value}</td><td><button type="button" style={control} disabled={locked}
      aria-label={`Remove native alias ${key}`} onClick={()=>setAliases(previous=>Object.fromEntries(Object.entries(previous).filter(([alias])=>alias!==key)))}>Remove</button></td>
    </tr>)}</tbody>
   </table>
   <button type="button" style={control} disabled={locked} onClick={apply}>Confirm native Rust correspondence commit</button>
  </>}
  <small role="status" data-native-f7-status="true">{message}</small>
 </section>
}
