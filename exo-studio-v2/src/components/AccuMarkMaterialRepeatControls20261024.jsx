import React,{useEffect,useMemo,useState} from 'react'
import {seamAllowanceBoundary} from '../core/project.js'
import {validateAccuMarkMaterialRepeatQA} from '../core/accumarkMaterialRepeatQA20261024.js'
import {repairAccuMarkRepeatPlacement20261024_1400} from '../core/accumarkRepeatGuidedPlacement20261024_1400.js'

const num=v=>String(v).trim()!==''?Number(v):NaN
export default function AccuMarkMaterialRepeatControls20261024({project,nesting,fabricWidthCm,gapCm,onApplyRepairedNest}){
  const [repeatX,setRepeatX]=useState('10')
  const [repeatY,setRepeatY]=useState('10')
  const [data,setData]=useState({})
  const [shade,setShade]=useState('A')
  const [report,setReport]=useState(null)
  const [validatedInput,setValidatedInput]=useState(null)
  const [target,setTarget]=useState('')
  const [repairResult,setRepairResult]=useState(null)
  const pieces=useMemo(()=>project?.pieces||[],[project])
  useEffect(()=>{
    // Marker group/manual edits elsewhere can replace the nesting object;
    // a previously checked repair must never be committed to the new layout.
    setValidatedInput(null);setRepairResult(null);setReport(null);setTarget('')
  },[nesting])
  const run=()=>{
    const sources={}
    for(const p of pieces) {
      const spec=data[p.id]||{}
      if(!spec.group?.trim()||!String(spec.x??'').trim()||!String(spec.y??'').trim()||
        !Number.isFinite(num(spec.x))||!Number.isFinite(num(spec.y))){
        setReport({ok:false,issues:[{code:'MISSING_PHYSICAL_REGISTRATION_ANCHOR',pieceId:p.id,detail:'Enter verified motif group and physical source anchor X/Y for every piece.'}],manufacturingApproved:false})
        return
      }
      const cutline=seamAllowanceBoundary(p,8)
      sources[p.id]={cutline,anchor:{x:num(spec.x),y:num(spec.y)},group:spec.group.trim(),size:'BASE',
        shade:shade.trim(),nap:p.marker?.nap,grainAngleDeg:p.grainAngleDeg,cutQuantity:p.cutQuantity,
        foldVerified:false}
    }
    const maxLength=Math.max(10,(nesting?.metrics?.length||0)+5)
    const args={
      project,nesting:{...nesting,placements:nesting.placements.map(p=>({...p,size:'BASE'}))},
      fabricWidthCm,repeatCm:{x:num(repeatX),y:num(repeatY)},sourcesByPieceId:sources,
      quantitiesBySize:{BASE:1},shadeZones:[{shade:shade.trim(),minY:0,maxY:maxLength}],toleranceCm:.01,
    }
    const result=validateAccuMarkMaterialRepeatQA(args)
    setValidatedInput(args);setRepairResult(null)
    setReport(result)
  }
  const suggestRepair=()=>{
    if(!validatedInput||!report)return
    const [pieceId,instanceText]=target.split('@@')
    if(!pieceId||!Number.isSafeInteger(Number(instanceText))){
      setRepairResult({ok:false,code:'SELECT_PLACEMENT',detail:'Choose a misplaced physical instance before repairing'});return
    }
    setRepairResult(repairAccuMarkRepeatPlacement20261024_1400(validatedInput,{
      target:{pieceId,size:'BASE',instance:Number(instanceText)},
      maxLengthCm:1000,gapCm,maxCandidates:49,
    }))
  }
  const applyRepair=()=>{
    if(!repairResult?.ok||!validatedInput||typeof onApplyRepairedNest!=='function')return
    // Keep the source entry sizes and all marker metadata untouched. The
    // producer's size is authoritative, not synthetic QA size 'BASE'.
    const coords=new Map(repairResult.nesting.placements.map(p=>[p.pieceId+'@@'+p.instance,p]))
    const adjusted={...nesting,placements:nesting.placements.map(p=>{
      const matching=coords.get(p.pieceId+'@@'+p.instance)
      return matching?{...p,x:matching.x,y:matching.y,outline:matching.outline.map(q=>({...q}))}:p
    }),metrics:{...repairResult.nesting.metrics},
      manufacturingApproved:false,cuttingAuthorized:false}
    onApplyRepairedNest(adjusted)
    setValidatedInput({...validatedInput,nesting:repairResult.nesting})
    setReport(repairResult.qa)
    setRepairResult(null)
  }
  const download=()=>{
    if(!report)return
    const content={schema:'exo.material-repeat-audit.v1',audit:report,
      note:'Engineering registration QA only; no automatic repeat alignment, fold verification, factory signoff or cutter authorization.'}
    const u=URL.createObjectURL(new Blob([JSON.stringify(content,null,2)],{type:'application/json'}))
    const a=document.createElement('a')
    try{a.href=u;a.download='exo-stripe-plaid-registration-QA-NOT-APPROVED.json';document.body.appendChild(a);a.click()}
    finally{a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000)}
  }
  const edit=(id,key,value)=>{
    setData(old=>({...old,[id]:{...old[id],[key]:value}}));setReport(null);setValidatedInput(null);setRepairResult(null)
  }
  return <details style={{padding:'8px 0'}} data-accumark-repeat-qa="true">
    <summary>Stripe / plaid registration, grain and shade-zone checks</summary>
    <p>After calculating a polygon nest, specify real physical motif anchors on the source pattern and matching groups. This checks alignment modulo the repeat; it does not rearrange pieces or approve printing/cutting.</p>
    <div className="exo-accu-prod-row">
      <label>Horizontal repeat (cm)<input type="number" min=".01" step="any" value={repeatX} onChange={e=>{setRepeatX(e.target.value);setReport(null);setValidatedInput(null);setRepairResult(null)}}/></label>
      <label>Vertical repeat (cm)<input type="number" min=".01" step="any" value={repeatY} onChange={e=>{setRepeatY(e.target.value);setReport(null);setValidatedInput(null);setRepairResult(null)}}/></label>
      <label>Shade ID<input value={shade} onChange={e=>{setShade(e.target.value);setReport(null);setValidatedInput(null);setRepairResult(null)}}/></label>
    </div>
    <div className="exo-accu-prod-row">
      {pieces.map(p=><fieldset key={p.id} style={{border:'1px solid currentColor',padding:6,borderRadius:5}}>
        <legend>{p.name||p.id}</legend>
        <label>Motif group<input aria-label={`Motif group ${p.id}`} value={data[p.id]?.group||''} onChange={e=>edit(p.id,'group',e.target.value)} placeholder="front-back-body"/></label>
        <label>Original motif anchor X cm<input aria-label={`Motif anchor X ${p.id}`} type="number" step="any" value={data[p.id]?.x??''} onChange={e=>edit(p.id,'x',e.target.value)}/></label>
        <label>Original motif anchor Y cm<input aria-label={`Motif anchor Y ${p.id}`} type="number" step="any" value={data[p.id]?.y??''} onChange={e=>edit(p.id,'y',e.target.value)}/></label>
      </fieldset>)}
    </div>
    <button type="button" disabled={!nesting?.ok} onClick={run}>Validate physical repeat registration · QA only</button>
    {report&&<div role="status">
      <strong>{report.ok?'Physical repeat checks passed locally':'Repeat QA blocked'} · manufacturing approval NOT granted</strong>
      <p>{report.registration?.length||0} source anchor(s) inspected · {report.issues?.length||0} issue(s).</p>
      {report.issues?.slice(0,14).map((item,i)=><p key={i}>{item.pieceId||'Marker'}: {item.code}{item.detail?' · '+item.detail:''}</p>)}
      <button type="button" onClick={download}>Download repeat registration QA report</button>
    </div>}
    {report&&!report.ok&&report.issues?.length>0&&report.issues.every(i=>i.code==='REPEAT_REGISTRATION_MISMATCH')&&
      <div style={{display:'grid',gap:6,border:'1px solid currentColor',padding:8,borderRadius:6}}>
       <strong>Guided physical stripe/plaid repeat repair · bounded search</strong>
       <p>Use your measured source motif anchors to propose a new placement of ONE polygon piece. This independently rechecks the entire marker, preserves source grain, shade, cut counts and true CUT outlines, and cannot approve a factory layout.</p>
       <label>Misregistered instance<select aria-label="Misregistered marker instance" value={target} onChange={e=>{setTarget(e.target.value);setRepairResult(null)}}>
        <option value="">Choose an instance</option>
        {validatedInput?.nesting?.placements.map(p=><option key={p.pieceId+'@@'+p.instance} value={p.pieceId+'@@'+p.instance}>{p.pieceId} #{p.instance+1}</option>)}
       </select></label>
       <button type="button" disabled={!target} onClick={suggestRepair}>Find source-congruent safe repeat placement</button>
       {repairResult&&<div role="status">
         <strong>{repairResult.ok?'Fully revalidated repeat move available':'No verified repair'}</strong>
         <p>{repairResult.ok?'ΔX '+repairResult.deltaCm.x.toFixed(3)+' cm · ΔY '+repairResult.deltaCm.y.toFixed(3)+' cm · '+repairResult.consideredCandidates+' candidate(s) inspected':repairResult.code+': '+repairResult.detail}</p>
         {repairResult.ok&&typeof onApplyRepairedNest==='function'&&
           <button type="button" onClick={applyRepair}>Apply checked repeat placement to working marker (not factory approved)</button>}
       </div>}
      </div>}
  </details>
}
