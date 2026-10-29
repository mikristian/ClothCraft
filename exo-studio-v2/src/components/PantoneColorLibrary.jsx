import React,{useMemo,useState} from 'react'
import {PANTONE_SYSTEMS,normalizePantoneReference,validatePantoneCatalog} from '../core/pantoneLibrary.js'
import embeddedCommunityCatalog from '../data/pantone-community-catalog.json'

const STORAGE_KEY='exo-authorized-pantone-library-v1'
const bundledCatalog=validatePantoneCatalog(embeddedCommunityCatalog)
function loadCatalog(){try{const saved=localStorage.getItem(STORAGE_KEY);return saved?validatePantoneCatalog(JSON.parse(saved)):bundledCatalog}catch{return bundledCatalog}}
export default function PantoneColorLibrary({fabricId,metadata={},disabled=false}){
  const [catalog,setCatalog]=useState(loadCatalog)
  const [system,setSystem]=useState(metadata.pantoneSystem||'TCX')
  const [reference,setReference]=useState(metadata.pantoneCode||'')
  const [search,setSearch]=useState('')
  const [status,setStatus]=useState('')
  const [approved,setApproved]=useState(metadata.pantoneApproval||'Pending lab dip')
  const [source,setSource]=useState(metadata.pantoneSource||'')
  const visible=useMemo(()=>catalog.filter(c=>c.system===system&&`${c.code} ${c.name}`.toLowerCase().includes(search.toLowerCase())).slice(0,250),[catalog,search,system])
  function write(field,value){return new Promise(resolve=>{
    const requestId=`pantone-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const listener=event=>{if(event.detail?.requestId!==requestId)return;window.removeEventListener('exo-clothcraft-property-result',listener);resolve(event.detail)}
    window.addEventListener('exo-clothcraft-property-result',listener)
    window.dispatchEvent(new CustomEvent('exo-clothcraft-edit-property',{detail:{requestId,kind:'fabric',id:fabricId,field,value}}))
  })}
  async function applyColor(code=reference,entry){
    const normalized=normalizePantoneReference(code,system)
    if(!normalized){setStatus('Enter a valid reference for this Pantone system.');return}
    setStatus('Saving manufacturer reference…')
    for(const [field,value] of [['pantoneSystem',system],['pantoneCode',normalized],['pantoneSource',source||entry?.source||'Physical swatch pending'],['pantoneApproval',approved]]){
      const result=await write(field,value)
      if(!result.ok){setStatus(result.error||'Could not save reference');return}
    }
    setReference(normalized);setStatus(`Saved ${normalized} to native fabric metadata`)
  }
  async function importCatalog(file){
    if(!file)return
    try{
      const records=validatePantoneCatalog(JSON.parse(await file.text()))
      localStorage.setItem(STORAGE_KEY,JSON.stringify(records))
      setCatalog(records);setStatus(`Loaded ${records.length} authorized color records into local browser storage`)
    }catch(error){setStatus(error.message)}
  }
  function exportSpecification(){
    const record={format:'EXO manufacturer color specification v1',fabricId,pantoneCode:normalizePantoneReference(reference,system),pantoneSystem:system,swatchSource:source||null,approvalStatus:approved,screenColorIsCertified:false,generatedAt:new Date().toISOString()}
    if(!record.pantoneCode){setStatus('Choose a valid reference before exporting.');return}
    const url=URL.createObjectURL(new Blob([JSON.stringify(record,null,2)],{type:'application/json'}))
    const a=document.createElement('a');a.href=url;a.download=`EXO-color-${record.pantoneCode.replace(/[^A-Z0-9]+/g,'-')}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
  }
  return <section className="cc-fabric-accordion" aria-label="Pantone color library">
    <h4>Color library <small>Manufacturer standards</small></h4>
    <p>{catalog.length.toLocaleString()} locally available color references. The built-in GitHub community dataset uses approximate HEX previews; it is unofficial and must not be treated as an official Pantone color book or factory-certified match. Authorized catalogs can replace it below.</p>
    <label className="cc-fabric-metadata-edit"><span>Library</span><select aria-label="Pantone system" disabled={disabled} value={system} onChange={e=>{setSystem(e.target.value);setReference('')}}>{PANTONE_SYSTEMS.map(x=><option key={x}>{x}</option>)}</select></label>
    <label className="cc-fabric-metadata-edit"><span>Find color</span><input aria-label="Search Pantone colors" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Code or name"/></label>
    <label className="cc-fabric-metadata-edit"><span>Reference</span><input aria-label="Pantone reference code" value={reference} onChange={e=>setReference(e.target.value)} placeholder={system==='PMS'?'PANTONE 286 C':'19-4052 TCX'}/></label>
    <label className="cc-fabric-metadata-edit"><span>Swatch</span><input aria-label="Physical color standard source" value={source} onChange={e=>setSource(e.target.value)} placeholder="Swatch edition / supplier"/></label>
    <label className="cc-fabric-metadata-edit"><span>Approval</span><select aria-label="Pantone approval status" value={approved} onChange={e=>setApproved(e.target.value)}><option>Pending lab dip</option><option>Lab dip approved</option><option>Production approved</option><option>Rejected</option></select></label>
    <button type="button" disabled={disabled||!fabricId} onClick={()=>applyColor()}>Save fabric color specification</button>{' '}
    <button type="button" onClick={exportSpecification}>Export factory color JSON</button>
    <details open><summary>Searchable color catalog ({catalog.length.toLocaleString()} entries)</summary>
      <p>Import a licensed JSON color catalog in the format <code>{'{"code":"19-4052 TCX","system":"TCX","name":"...","hex":"#123456"}'}</code>. Hex values are screen previews only. Imported data stays in this browser.</p>
      <input aria-label="Import licensed Pantone color library" type="file" accept=".json,application/json" onChange={e=>importCatalog(e.target.files?.[0])}/>
      <button type="button" onClick={()=>{localStorage.removeItem(STORAGE_KEY);setCatalog(bundledCatalog);setStatus('Restored bundled community catalog')}}>Restore built-in catalog</button>
      <div style={{maxHeight:240,overflowY:'auto'}}>{visible.map(color=><button type="button" key={color.code} disabled={disabled} style={{display:'flex',alignItems:'center',width:'100%',gap:9}} onClick={()=>{setReference(color.code);setSource(color.source);setStatus(`Selected ${color.code}; save to assign it.`)}}>{color.hex&&<span style={{display:'inline-block',width:19,height:19,background:color.hex,border:'1px solid #888'}}/>}{color.code} {color.name}</button>)}</div>
    </details>
    <p><a href="https://www.pantone.com/pantone-connect" target="_blank" rel="noreferrer">Pantone Connect</a> · <a href="https://www.pantone.com/license/software-and-web" target="_blank" rel="noreferrer">Official API licensing</a></p>
    {status&&<p role="status">{status}</p>}
  </section>
}
