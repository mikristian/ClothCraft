import React,{useEffect,useMemo,useState} from 'react'
import {authorNativePerSizeChartEnvelope20261027} from '../core/modarisNativePerSizeChartAuthor20261027.js'

const SIZES=['XS','S','M','L','XL','XXL']
const NUMBER=/^(?:\+|-)?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/
const number=text=>typeof text==='string'&&NUMBER.test(text.trim())?Number(text):NaN
const isDirect=m=>typeof m==='number'||(m&&typeof m==='object'&&!Object.hasOwn(m,'formula')&&Number.isFinite(m.valueMm))
const canonical=value=>JSON.stringify(value,(_,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item)
const initial=(names,source)=>({
  values:Object.fromEntries(names.filter(n=>isDirect(source[n])).map(n=>[n,Object.fromEntries(SIZES.map(s=>[s,'']))])),
  limits:Object.fromEntries(names.map(n=>[n,Object.fromEntries(SIZES.map(s=>[s,{min:'',max:''}]))])),
  physical:{},
})
export function nativePerSizeChartPreflight20261027(snapshot,project,disabled=false){
  if(disabled)return 'Native chart editing is busy.'
  if(!Number.isSafeInteger(snapshot?.revision)||!snapshot?.template)return 'A revisioned Rust snapshot is required.'
  if(!project?.template||!project?.native_point_bindings?.measurements)return 'Load the real native save.project with persisted measurement bindings.'
  if(!project?.grade_run?.gradedTemplates||project.grade_run.gradedTemplates.length!==6)return 'A persisted six-size native grade run is required.'
  if(!Array.isArray(project.template.fabrics)||!project.template.fabrics.length)return 'The saved project must include a real fabric identifier.'
  return ''
}

export default function ModarisNativePerSizeChartStudio20261027({snapshot,project:parentProject,disabled=false,onLoadProject,onStoreEnvelope,onRegenerate,onInspectEnvelope}){
  const [loadedProject,setLoadedProject]=useState(null)
  const [loadedRevision,setLoadedRevision]=useState(null)
  const project=parentProject||loadedProject
  const source=project?.native_point_bindings?.measurements||{}
  const names=Object.keys(source)
  const fabrics=project?.template?.fabrics||[]
  const poms=project?.grade_run?.pomSpecs||[]
  const token=JSON.stringify({revision:snapshot?.revision,project:project?.native_point_bindings,grade:project?.grade_run?.baseSize,existing:project?.fabric_grade_envelope})
  const [fabricId,setFabricId]=useState('')
  const [provenance,setProvenance]=useState('')
  const [fields,setFields]=useState(()=>initial(names,source))
  const [review,setReview]=useState(null)
  const [confirmed,setConfirmed]=useState(false)
  const [busy,setBusy]=useState(false)
  const [notice,setNotice]=useState('Enter all six explicit direct measurement cells and per-size bounds in millimetres.')
  const [receipt,setReceipt]=useState(null)
  const [editName,setEditName]=useState('')
  const [editValue,setEditValue]=useState('')
  const loadProject=async()=>{
    if(typeof onLoadProject!=='function')return
    setBusy(true)
    try{
      const loaded=await onLoadProject()
      const candidate=loaded?.project||loaded?.data?.project||loaded
      if(loaded?.ok===false||!candidate?.template||!candidate?.native_point_bindings||loaded?.revision!==snapshot?.revision)throw Error(loaded?.reason||'Native save.project or matching source revision was absent')
      setLoadedProject(candidate);setLoadedRevision(loaded.revision);setReceipt(null)
      setFabricId('');setProvenance('');invalidate()
      setNotice('Loaded saved Rust project. Enter each direct size value and all limits explicitly.')
    }catch(error){setNotice(`Cannot load native project: ${error.message}`)}finally{setBusy(false)}
  }
  useEffect(()=>{setFields(initial(names,source));setReview(null);setConfirmed(false)},[token])
  const preflight=(!parentProject&&loadedProject&&loadedRevision!==snapshot?.revision)?'Native revision changed; reload the saved Rust project before chart authoring.':nativePerSizeChartPreflight20261027(snapshot,project,disabled||busy)
  const stale=Boolean(review&&review.token!==token)
  const invalidate=()=>{setReview(null);setConfirmed(false)}
  const update=(kind,name,size,field,value)=>{
    invalidate()
    setFields(prev=>{
      const next=structuredClone(prev)
      if(kind==='values')next.values[name][size]=value
      else if(kind==='limits')next.limits[name][size][field]=value
      else{
        if(!next.physical[name])next.physical[name]={}
        if(!next.physical[name][size])next.physical[name][size]={min:'',max:''}
        next.physical[name][size][field]=value
      }
      return next
    })
  }
  const packet=useMemo(()=>{
    const values={},limits={},physicalPomBounds={}
    for(const name of names){
      limits[name]={}
      if(isDirect(source[name]))values[name]={}
      for(const size of SIZES){
        if(isDirect(source[name]))values[name][size]=number(fields.values[name]?.[size])
        limits[name][size]={minMm:number(fields.limits[name]?.[size]?.min),maxMm:number(fields.limits[name]?.[size]?.max)}
      }
    }
    for(const pom of poms){
      physicalPomBounds[pom.id]={}
      for(const size of SIZES)physicalPomBounds[pom.id][size]={
        minMm:number(fields.physical[pom.id]?.[size]?.min),maxMm:number(fields.physical[pom.id]?.[size]?.max)}
    }
    return {fabricId,provenance,sourceRevision:snapshot?.revision,chartProvenance:provenance,
      directCells:values,bounds:limits,physicalPomBounds}
  },[fields,fabricId,provenance,project,snapshot?.revision])
  const validate=()=>{
    if(preflight){setNotice(preflight);return}
    try{
      const authored=authorNativePerSizeChartEnvelope20261027({project,...packet})
      if(!authored?.ok||!authored.envelope)throw Error(authored?.reason||'Native chart author refused the packet.')
      setReview({...authored,token,revision:snapshot.revision})
      setConfirmed(false)
      setNotice(`Reviewed six sizes, ${names.length} measurements and ${Object.keys(packet.physicalPomBounds||{}).length} physical POM specifications. Commit requires confirmation.`)
    }catch(error){invalidate();setNotice(`Chart refused: ${error.message}`)}
  }
  const commit=async()=>{
    if(!review||stale||!confirmed||preflight||typeof onStoreEnvelope!=='function')return
    setBusy(true);setReceipt(null)
    let stored=false
    try{
      const authored=authorNativePerSizeChartEnvelope20261027({project,...packet})
      if(!authored?.ok||canonical(authored.envelope)!==canonical(review.envelope))throw Error('Chart or authoritative source changed; review again.')
      const result=await onStoreEnvelope({envelope:review.envelope,revision:review.revision})
      if(result?.ok!==true)throw Error(result?.reason||result?.error||'Rust refused the envelope.')
      stored=true
      const revision=result?.after?.revision??result?.revision
      if(revision!==review.revision+1)throw Error('Native store did not report exactly one new revision.')
      if(typeof onInspectEnvelope!=='function')throw Error('Native inspection callback is required to verify persisted envelope.')
      const inspected=await onInspectEnvelope({revision})
      const persisted=inspected?.envelope||inspected?.fabricGradeEnvelope||inspected?.data?.envelope||inspected?.data?.fabricGradeEnvelope
      const verified=persisted||result?.project?.fabric_grade_envelope||result?.inspected?.envelope||result?.inspected?.fabricGradeEnvelope
      if(inspected?.ok!==true||!verified||canonical(verified)!==canonical(review.envelope))
        throw Error('Native inspect did not return the exact stored chart envelope.')
      setReceipt({revision,inspected:true,physical:inspected?.physicalReceipt||result?.physicalReceipt||null})
      if(result?.project){setLoadedProject(result.project);setLoadedRevision(revision)}
      setNotice('Rust stored and independently inspected the six-size chart in one native revision. Save/reopen verification is performed by the parent when provided.')
      invalidate()
    }catch(error){setNotice(`${stored?'Native storage may have committed; inspect and reopen the project before retrying':'Native store refused'}: ${error.message}`);invalidate()}
    finally{setBusy(false)}
  }
  const regenerate=async()=>{
    if(preflight||!editName||!Number.isFinite(number(editValue))||typeof onRegenerate!=='function')return
    setBusy(true);setReceipt(null)
    try{
      const outcome=await onRegenerate({measurement:editName,valueMm:number(editValue),revision:snapshot.revision})
      if(outcome?.ok!==true)throw Error(outcome?.reason||outcome?.error||'Rust rejected regeneration')
      const revision=outcome?.after?.revision??outcome?.revision
      if(revision!==snapshot.revision+1)throw Error('Native regeneration revision did not advance by one')
      setReceipt({revision,inspected:false,physical:outcome?.preview||outcome?.regenerationEvidence||outcome?.physicalReceipt||null})
      if(outcome?.project){setLoadedProject(outcome.project);setLoadedRevision(revision)}
      setNotice(`Rust accepted ${editName} = ${editValue} mm for six-size regeneration. Inspect native physical POM and graded cut/stitch receipts before production.`)
      invalidate()
    }catch(error){setNotice(`Native regeneration refused: ${error.message}`)}finally{setBusy(false)}
  }
  return <section aria-label="Native Rust per-size chart studio" data-native-per-size-chart="authoring" style={{display:'grid',gap:8}}>
    <h3>Native Rust XS–XXL measurement and fabric chart</h3>
    {!parentProject&&<button type="button" onClick={loadProject} disabled={busy||disabled||typeof onLoadProject!=='function'}>Load native saved project for chart authoring</button>}
    <p>Enter each direct cell explicitly. Formula cells are derived by Rust from the saved native binding rules. Record minimum and maximum bounds for every measurement and size. No size is filled automatically.</p>
    {preflight&&<p role="alert">{preflight}</p>}
    <fieldset disabled={Boolean(preflight)}><legend>Saved fabric and chart provenance</legend>
      <label>Fabric <select aria-label="Native chart fabric" value={fabricId} onChange={e=>{setFabricId(e.target.value);invalidate()}}><option value="">Choose saved fabric</option>{fabrics.map(f=><option key={f.id} value={f.id}>{f.name||f.id}</option>)}</select></label>
      <label>Physical-limit source <input aria-label="Native chart provenance" value={provenance} onChange={e=>{setProvenance(e.target.value);invalidate()}} maxLength={256}/></label>
    </fieldset>
    <div style={{overflowX:'auto'}}><table aria-label="Native six-size explicit direct values and physical limits"><thead><tr><th>Measurement</th><th>Size</th><th>Direct (mm)</th><th>Min (mm)</th><th>Max (mm)</th></tr></thead><tbody>
      {names.flatMap(name=>SIZES.map(size=><tr key={`${name}:${size}`}><th scope="row">{name}</th><td>{size}</td><td>{isDirect(source[name])?<input aria-label={`${name} ${size} direct millimetres`} value={fields.values[name]?.[size]??''} onChange={e=>update('values',name,size,'',e.target.value)} placeholder="Required"/>:<span title={source[name]?.formula||'Native formula'}>Formula: {source[name]?.formula||'derived'}</span>}</td>{['min','max'].map(bound=><td key={bound}><input aria-label={`${name} ${size} ${bound} millimetres`} value={fields.limits[name]?.[size]?.[bound]??''} onChange={e=>update('limits',name,size,bound,e.target.value)} placeholder="Required"/></td>)}</tr>))}
    </tbody></table></div>
    {poms.length>0&&<fieldset disabled={Boolean(preflight)}><legend>Required bounds for saved native physical POM specifications</legend><p>All saved physical POMs require operator-authored limits for all six sizes.</p><div style={{overflowX:'auto'}}><table><thead><tr><th>Saved POM</th><th>Size</th><th>Min (mm)</th><th>Max (mm)</th></tr></thead><tbody>{poms.flatMap(pom=>SIZES.map(size=><tr key={`${pom.id}:${size}`}><th>{pom.label||pom.id}</th><td>{size}</td>{['min','max'].map(bound=><td key={bound}><input aria-label={`${pom.id} ${size} physical ${bound} millimetres`} value={fields.physical[pom.id]?.[size]?.[bound]??''} onChange={e=>update('physical',pom.id,size,bound,e.target.value)} placeholder="Required"/></td>)}</tr>))}</tbody></table></div></fieldset>}
    <button type="button" disabled={Boolean(preflight)||!fabricId||!provenance.trim()} onClick={validate}>Validate six-size native chart packet</button>
    {review&&!stale&&<section aria-label="Authoritative native chart preview"><strong>Native envelope preview · revision {review.revision} · six sizes</strong><pre style={{whiteSpace:'pre-wrap',maxHeight:260,overflow:'auto'}}>{JSON.stringify(review.envelope,null,2)}</pre><label><input aria-label="Confirm native six-size chart store" type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> I reviewed every cell, fabric, source revision and physical limit.</label><button type="button" disabled={!confirmed||Boolean(preflight)||typeof onStoreEnvelope!=='function'||typeof onInspectEnvelope!=='function'} onClick={commit}>Store native chart · one Rust Undo revision</button></section>}
    {stale&&<p role="alert">Native source changed. Validate a fresh chart before storing.</p>}
    {!project?.fabric_grade_envelope?.perSizeChart&&<p>Store and re-inspect a native six-size computed chart before requesting measurement-driven regeneration.</p>}
    <fieldset disabled={Boolean(preflight)||!project?.fabric_grade_envelope?.perSizeChart||typeof onRegenerate!=='function'}><legend>Native six-size direct measurement regeneration</legend><label>Direct measurement <select aria-label="Native regeneration measurement" value={editName} onChange={e=>setEditName(e.target.value)}><option value="">Choose measurement</option>{names.filter(n=>isDirect(source[n])).map(n=><option key={n} value={n}>{n}</option>)}</select></label><label>New base measurement (mm) <input aria-label="Native regeneration millimetres" value={editValue} onChange={e=>setEditValue(e.target.value)}/></label><button type="button" disabled={!editName||!Number.isFinite(number(editValue))} onClick={regenerate}>Regenerate all six sizes through Rust</button></fieldset>
    {receipt&&<section role="status" data-native-chart-receipt="true"><strong>Native revision {receipt.revision}</strong><p>{receipt.inspected?'Envelope persisted and verified by native inspection.':'Native regeneration returned a receipt.'}</p>{receipt.physical&&<pre style={{whiteSpace:'pre-wrap',maxHeight:220,overflow:'auto'}}>{JSON.stringify(receipt.physical,null,2)}</pre>}</section>}
    <p role="status">{notice}</p><small>Native engineering evidence only. No licensed Modaris interchange, industrial approval or factory certification is claimed.</small>
  </section>
}
