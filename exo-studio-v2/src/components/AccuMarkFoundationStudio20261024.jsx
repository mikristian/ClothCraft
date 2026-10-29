import React,{useEffect,useState} from 'react'
import {createAccuMarkMtmDraft20261024,runAccuMarkMtmBatch20261024} from '../core/accumarkMtmDraftFoundation20261024.js'
import {transferAccuMarkMtmReference20261024} from '../core/accumarkMtmLegacyTransfer20261024.js'
import {buildAccuMarkExplorerOrder20261024,exportAccuMarkExplorerOrderCsv20261024,
 auditAccuMarkExplorerOrderCsv20261024} from '../core/accumarkExplorerProductionFoundation20261024.js'
import {ACCUMARK_FOUNDATION_COVERAGE_20261024} from '../core/accumarkFoundationCoverage20261024.js'

const initial={chestCm:98,waistCm:82,hipCm:100,bodyLengthCm:70,shoulderWidthCm:44,
 neckCm:39,armholeDepthCm:23,easeChestCm:8,easeWaistCm:6,easeHipCm:6,
 frontNeckDropCm:7,size:'M',fabricId:'main'}
const num=s=>String(s??'').trim()?Number(s):NaN
function save(name,content,type='application/json'){
 const url=URL.createObjectURL(new Blob([content],{type}))
 const anchor=document.createElement('a')
 try{anchor.href=url;anchor.download=name;document.body.appendChild(anchor);anchor.click()}
 finally{anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
}
const rows=[
 ['chestCm','Chest circumference'],['waistCm','Waist circumference'],['hipCm','Hip circumference'],
 ['bodyLengthCm','Body length'],['shoulderWidthCm','Across shoulders'],['neckCm','Neck circumference'],
 ['armholeDepthCm','Armhole depth'],['easeChestCm','Chest ease'],['easeWaistCm','Waist ease'],
 ['easeHipCm','Hip ease'],['frontNeckDropCm','Front neck drop'],
]
export default function AccuMarkFoundationStudio20261024({project,onApplyProject,nativeMode=false,disabled=false}){
 const [measure,setMeasure]=useState(initial)
 const [mtm,setMtm]=useState(null)
 const [batch,setBatch]=useState(null)
 const [batchText,setBatchText]=useState('')
 const [styleId,setStyleId]=useState('EXO-STYLE')
 const [orderId,setOrderId]=useState('EXO-ORDER')
 const [variantId,setVariantId]=useState('BASE')
 const [colorway,setColorway]=useState('BLACK')
 const [quantity,setQuantity]=useState({})
 const [stock,setStock]=useState({})
 const [order,setOrder]=useState(null)
 const sizes=project?.grading?.sizes||[]
 const fabrics=[...new Set((project?.pieces||[]).map(piece=>piece.fabricId||'main'))]
 useEffect(()=>{
  setQuantity(Object.fromEntries(sizes.map(s=>[s,s===project?.grading?.baseSize?'1':'0'])))
  setStock(Object.fromEntries(fabrics.map(f=>[f,'1000'])))
  setOrder(null)
 },[project?.id,JSON.stringify(sizes),JSON.stringify(fabrics)])
 const draft=()=>{
  const input=Object.fromEntries(Object.entries(measure).map(([k,v])=>[k,k==='size'||k==='fabricId'?v:num(v)]))
  setMtm(createAccuMarkMtmDraft20261024(input));setBatch(null)
 }
 const runBatch=()=>{
  try{
   const profiles=JSON.parse(batchText)
   setBatch(runAccuMarkMtmBatch20261024(profiles));setMtm(null)
  }catch(e){setBatch({ok:false,reason:'Invalid JSON: '+e.message})}
 }
 const createOrder=()=>{
  const options={styleId,orderId,variantId,colorway,
   quantitiesBySize:Object.fromEntries(sizes.map(s=>[s,num(quantity[s])])),
   stockByFabric:Object.fromEntries(fabrics.map(f=>[f,num(stock[f])]))}
  setOrder(buildAccuMarkExplorerOrder20261024(project,options))
 }
 const downloadOrder=()=>{
  const value=exportAccuMarkExplorerOrderCsv20261024(order)
  const check=auditAccuMarkExplorerOrderCsv20261024(value,order)
  if(!check.ok)throw Error(check.reason)
  save('exo-style-order-ERP-REVIEW-NOT-APPROVED.csv',value,'text/csv')
 }
 return <div data-accumark-foundation-studio="true" style={{display:'grid',gap:8,margin:'12px 0',fontSize:12}}>
  <details>
   <summary><strong>22 feature-family working foundations · inspect current coverage and remaining gates</strong></summary>
   <p>This inventory points to real EXO executable functions, not 22 claims of AccuMark compatibility. Editing-base and bounded-base functions have explicit limitations; physical manufacturing authorization remains pending.</p>
   <div style={{display:'grid',gap:5}}>
   {ACCUMARK_FOUNDATION_COVERAGE_20261024.map(f=><details key={f.id} style={{border:'1px solid currentColor',padding:7,borderRadius:5}}>
     <summary><strong>{f.name}</strong> · {f.state==='EDITABLE_BASE'?'Editable / calculable base':'Bounded engineering base'}</summary>
     <p><strong>Working:</strong> {f.entry}</p>
     <p><strong>Still required:</strong> {f.remaining}</p>
     <small>Source: {f.source}</small>
   </details>)}
   </div>
  </details>
  <details>
   <summary><strong>Made-to-measure reference pattern + parametric drafting macro</strong></summary>
   <p>Enter actual physical measurements in centimetres. This builds two editable sleeveless torso reference blocks with traceable values. It does not fit an avatar, sew the blocks, grade them automatically or authorize cutting.</p>
   <fieldset disabled={disabled} style={{display:'grid',gap:7,padding:9}}>
    <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
     {rows.map(([key,label])=><label key={key} style={{minWidth:105,flex:'1 1 105px'}}>{label} (cm)
       <input style={{width:'100%'}} type="number" step=".5" value={measure[key]??''} onChange={e=>{setMeasure(v=>({...v,[key]:e.target.value}));setMtm(null)}}/>
     </label>)}
     <label>Size label<input value={measure.size} onChange={e=>setMeasure(v=>({...v,size:e.target.value}))}/></label>
     <label>Fabric ID<input value={measure.fabricId} onChange={e=>setMeasure(v=>({...v,fabricId:e.target.value}))}/></label>
    </div>
    <button type="button" onClick={draft}>Calculate two editable measured blocks</button>
    {mtm&&<div role="status">
     <strong>{mtm.ok?'MTM measured draft created':'Measured draft blocked'}</strong>
     <p>{mtm.ok?'Draft bust '+mtm.actualBustCircumferenceCm+' cm · waist '+mtm.waistCircumferenceCm+' cm · hip '+mtm.hipCircumferenceCm+' cm':'Reason: '+mtm.reason}</p>
     {mtm.ok&&<>
      <button type="button" onClick={()=>save('exo-mtm-reference-block-NOT-APPROVED.json',JSON.stringify(mtm,null,2))}>Download measured 2D reference project</button>
      {!nativeMode&&typeof onApplyProject==='function'&&
       <button type="button" onClick={()=>{
         try{
           const output=transferAccuMarkMtmReference20261024(project,mtm)
           onApplyProject(output.project,'Loaded two measured reference blocks as an editable 2D draft. Existing old sewing and production references have been cleared. Factory release is blocked.')
         }catch(e){setMtm({ok:false,reason:e.message})}
       }}>Open blocks in legacy EXO 2D editor</button>}
     </>}
    </div>}
    <details><summary>Repeatable drafting batch · independent size profiles</summary>
     <p>Supply a JSON array of 1–20 measured profiles with different size labels. The batch fails entirely if one profile fails.</p>
     <textarea aria-label="Measured drafting batch JSON" rows={4} value={batchText}
       placeholder='[{"size":"S","chestCm":90,...},{"size":"M","chestCm":98,...}]'
       onChange={e=>setBatchText(e.target.value)}/>
     <button type="button" onClick={runBatch}>Run measured drafting batch</button>
     {batch&&<div role="status">{batch.ok?batch.count+' standalone measured patterns generated':'Blocked: '+batch.reason}
       {batch.ok&&<button type="button" onClick={()=>save('exo-mtm-macro-reference-size-run-NOT-APPROVED.json',JSON.stringify(batch,null,2))}>Download independent sized drafts</button>}
     </div>}
    </details>
   </fieldset>
  </details>
  <details>
   <summary><strong>AccuMark Explorer / model · BOM · sizes · style order · ERP CSV</strong></summary>
   <p>Creates a traceable model, piece/fabric BOM and per-size cutting demand from the active <strong>{nativeMode?'legacy reference (not the Rust active garment)':'EXO project'}</strong>. Stock quantities here are piece-capacity estimates, not physical fabric metres.</p>
   <fieldset disabled={disabled||nativeMode} style={{display:'grid',gap:7,padding:9}}>
    <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
     {[['Style ID',styleId,setStyleId],['Order ID',orderId,setOrderId],['Variant',variantId,setVariantId],['Colorway',colorway,setColorway]].map(([label,value,change])=>
       <label key={label}>{label}<input value={value} onChange={e=>{change(e.target.value);setOrder(null)}}/></label>)}
    </div>
    <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
      {sizes.map(s=><label key={s}>Size {s} garments<input type="number" min="0" max="1000000" value={quantity[s]??'0'} onChange={e=>{setQuantity(q=>({...q,[s]:e.target.value}));setOrder(null)}}/></label>)}
      {fabrics.map(f=><label key={f}>{f} available cut-piece capacity<input type="number" min="0" max="1000000" value={stock[f]??'0'} onChange={e=>{setStock(q=>({...q,[f]:e.target.value}));setOrder(null)}}/></label>)}
    </div>
    <button type="button" onClick={createOrder} disabled={!project?.pieces?.length||!sizes.length}>Build model / BOM / order demand</button>
    {order&&<div role="status">
      <strong>{order.ok?'Model and piece demand validated':'Model/order blocked'} · never production approved</strong>
      {order.order&&<p>{order.order.totalGarments} garments · {order.order.totalPieces} physical cut pieces · {order.model?.pieces?.length} model pieces</p>}
      {order.blockers?.map((b,i)=><p key={i}>{b}</p>)}{order.reason&&<p>{order.reason}</p>}
      {order.ok&&<>
       <button type="button" onClick={()=>save('exo-model-BOM-order-NOT-APPROVED.json',JSON.stringify(order,null,2))}>Download model/order JSON</button>
       <button type="button" onClick={downloadOrder}>Download verified ERP-style order CSV</button>
      </>}
    </div>}
   </fieldset>
   {nativeMode&&<p role="status">Native Rust garment is protected. These Explorer controls are available for the separate legacy project only; native Rust production uses the Native CUT Study command.</p>}
  </details>
 </div>
}
