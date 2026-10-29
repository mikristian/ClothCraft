import React,{useEffect,useState} from 'react'
import {proposeAccuMarkNativeGradedTemplateTransaction20261024} from '../core/accumarkNativeGradedTemplateTransaction20261024.js'
import {planAccuMarkNativeGradeMarker20261024} from '../core/accumarkNativeGradeMarkerPlan20261024.js'
import {buildAccuMarkNativeCutProofAama20261024} from '../core/accumarkNativeCutProofAama20261024.mjs'

const finiteText=value=>String(value).trim()!==''&&Number.isFinite(Number(value))?Number(value):NaN
function download(filename,contents,type='application/json'){
 const blob=new Blob([contents],{type}),url=URL.createObjectURL(blob),a=document.createElement('a')
 try{a.href=url;a.download=filename;document.body.appendChild(a);a.click()}
 finally{a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000)}
}
/**
 * Attach independent native source-linked engineering workflows to the true
 * Rust workspace's current snapshot & independently authored point-rule
 * sidecar. Does NOT route via hidden legacy garment project or claim that
 * point-rule proposals have been applied to the Rust simulation.
 */
export default function AccuMarkNativeUnifiedWorkflow20261024({
 snapshot,ruleSet,disabled=false,onRequestCutProof,onCaptureSavedProject
}){
 const [size,setSize]=useState('L'),[width,setWidth]=useState('145'),[gap,setGap]=useState('1')
 const [maxLength,setMaxLength]=useState('1000'),[quantity,setQuantity]=useState('1')
 const [plyCount,setPlyCount]=useState('10'),[rollLength,setRollLength]=useState('2000')
 const [nap,setNap]=useState('one-way'),[transaction,setTransaction]=useState(null)
 const [marker,setMarker]=useState(null),[aama,setAama]=useState(null),[busy,setBusy]=useState(false)
 const [message,setMessage]=useState('')
 const availableSizes=ruleSet?.sizes||[]
 const selectedSize=availableSizes.includes(size)?size:(ruleSet?.baseSize||availableSizes[0]||'M')
 const panels=snapshot?.template?.panels||[]
 useEffect(()=>{setTransaction(null);setMarker(null);setAama(null);setMessage('')},[snapshot?.revision,snapshot?.template,ruleSet])
 useEffect(()=>{setMarker(null)},[selectedSize,width,gap,maxLength,quantity,plyCount,rollLength,nap])
 const run=async(action)=>{
  setMessage('')
  if(!snapshot||!ruleSet){setMessage('Create an authored source-linked native point-rule set before inspecting the graded size run.');return}
  if(action==='transaction'){
   setBusy(true)
   try{
    if(typeof onCaptureSavedProject!=='function')throw Error('Native editor full-project capture unavailable')
    const selectedRevision=snapshot.revision
    const saved=await onCaptureSavedProject()
    if(snapshot.revision!==selectedRevision)throw Error('Native document revision changed during capture')
    const result=proposeAccuMarkNativeGradedTemplateTransaction20261024(saved,ruleSet,{selectedSize})
    setTransaction(result)
    setMessage(result.ok?'All-size native template source study validated from the FULL saved Rust project. Grade rules have NOT been committed to the live editor.':result.reason||result.code||'Native grade transaction blocked')
   }catch(error){setMessage('Saved native project transaction refused: '+String(error?.message||error))}
   finally{setBusy(false)}
  }else{
   const cutQuantities=Object.fromEntries(panels.map(p=>[p.id,finiteText(quantity)]))
   // The live native render snapshot also includes cloth particle arrays,
   // triangle meshes and avatar state. They are not source pattern data and
   // must not exhaust the bounded grading/marker source validator.
   const nativePatternSource={revision:snapshot.revision,template:snapshot.template}
   const result=planAccuMarkNativeGradeMarker20261024(nativePatternSource,ruleSet,{
    selectedSize,fabricWidthCm:finiteText(width),gapCm:finiteText(gap),maxLengthCm:finiteText(maxLength),
    maxEvaluations:240,plyCount:finiteText(plyCount),
    rolls:[{rollId:'ROLL-1',usableLengthCm:finiteText(rollLength)}],nap,cutQuantities})
   setMarker(result)
   setMessage(result.ok?'Graded physical marker study passed supported source constraints. Rust garment remains unchanged.':result.detail||result.code||result.reason||'Native marker refused')
  }
 }
 const checkLiveCut=async()=>{
  setMessage('');setAama(null)
  if(typeof onRequestCutProof!=='function'){setMessage('Native CUT proof service is not available');return}
  setBusy(true)
  try{
   const originalRevision=snapshot?.revision
   const proof=await onRequestCutProof()
   if(snapshot?.revision!==originalRevision)throw Error('Native document changed while checking CUT')
   const result=buildAccuMarkNativeCutProofAama20261024(snapshot,proof,{size:'CURRENT'})
   setAama(result)
   setMessage(result.ok?
    'Independent local AAMA CUT roundtrip passed for the CURRENT Rust garment only. This is not an approved graded size or Gerber receiving-CAD confirmation.':
    'Native physical CUT exchange blocked: '+(result.detail||result.code))
  }catch(error){setMessage('Native physical CUT proof refused: '+String(error?.message||error))}
  finally{setBusy(false)}
 }
 return <details data-native-unified-grade-nest-cad="true" style={{border:'1px solid #667078',borderRadius:8,padding:9,marginTop:10}}>
   <summary><strong>Native source-linked grading → marker → AAMA CUT studies</strong></summary>
   <p style={{fontSize:12}}>These tools read the CURRENT native Rust pattern and its matching point-rule sidecar. They do not silently substitute the legacy project, rewrite sewn relationships, or assert that graded proposals are committed into Rust.</p>
   <label>Grade size <select value={selectedSize} onChange={e=>setSize(e.target.value)} disabled={!ruleSet||disabled}>
    {availableSizes.map(name=><option value={name} key={name}>{name}</option>)}
   </select></label>
   <div style={{display:'grid',gap:6,margin:'8px 0'}}>
    <button type="button" disabled={!ruleSet||disabled||busy} onClick={()=>run('transaction')}>Validate every native size against a fresh saved Rust project</button>
    {transaction?.ok&&<div role="status">
      <p>Complete template-source proposal passed guarded grading checks. Native editor commit is <strong>blocked pending atomic source-revision enforcement</strong>.</p>
      <button type="button" onClick={()=>download('exo-native-size-run-VALIDATED-PROPOSAL-NOT-COMMITTED.json',
        JSON.stringify({sourceRevision:snapshot.revision,selectedSize,templatesBySize:transaction.templatesBySize,
          source:transaction.provenance,manufacturingApproved:false,nativeCommitted:false},null,2))}>
        Download source-linked graded templates (not native committed)
      </button>
    </div>}
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(135px,1fr))',gap:7}}>
     {[['Fabric width (cm)',width,setWidth],['Cut gap (cm)',gap,setGap],['Max marker length (cm)',maxLength,setMaxLength],
       ['Cut quantity per panel',quantity,setQuantity],['Ply count',plyCount,setPlyCount],['Usable roll length (cm)',rollLength,setRollLength]]
      .map(([label,value,callback])=><label key={label}>{label}<input aria-label={label} style={{width:'100%'}} type="number" value={value} onChange={e=>callback(e.target.value)} disabled={disabled}/></label>)}
    </div>
    <label>Fabric nap <select value={nap} onChange={e=>setNap(e.target.value)} disabled={disabled}>
     <option value="one-way">One-way</option><option value="none">Unrestricted direction</option>
    </select></label>
    <button type="button" disabled={!ruleSet||disabled} onClick={()=>run('marker')}>Generate graded source CUT → optimize → roll/ply study</button>
    {marker?.ok&&<div role="status">
     <p>Native pattern revision {snapshot.revision} · size {selectedSize}. Source-linked and independently graded, but not Rust committed or factory approved.</p>
     <button type="button" onClick={()=>download('exo-native-graded-marker-STUDY-ONLY.json',JSON.stringify(marker,null,2))}>Download marker and roll-demand study</button>
    </div>}
    <button type="button" disabled={busy||disabled||!snapshot} onClick={checkLiveCut}>{busy?'Requesting native Rust CUT proof…':'Export CURRENT physical Rust CUT as local AAMA DXF study'}</button>
    {aama?.ok&&<div role="status">
     <p>{aama.pieceCount} native CUT panels independently reimported in millimetres. This does not represent all graded sizes or certify an external receiver.</p>
     <button type="button" onClick={()=>download(aama.filename,aama.dxf,'application/dxf')}>Download AAMA R12 CUT study (not factory approved)</button>
    </div>}
    {message&&<p role="status">{message}</p>}
   </div>
  </details>
}
