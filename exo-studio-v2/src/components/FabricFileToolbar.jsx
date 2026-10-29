import React,{useRef,useState} from 'react'
import {FolderOpen,Save,Search} from 'lucide-react'
import {FABRIC_FILE_LIMIT,fabricPresetPayload,parseFabricPreset} from '../core/fabricPresetFiles.js'
import './FabricFileToolbar.css'

const filenameFor=name=>`${String(name||'fabric').trim().replace(/[^\w.-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,72)||'fabric'}.exo-fabric.json`

export default function FabricFileToolbar({kind,fabric,options=[],onSelect,onImport}){
  const picker=useRef(null)
  const [query,setQuery]=useState('')
  const [focused,setFocused]=useState(false)
  const [status,setStatus]=useState('')
  const [busy,setBusy]=useState(false)
  const matches=query.trim()?options.filter(item=>`${item.name||''} ${item.itemNo||''} ${item.construction||''}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0,14):[]
  const save=()=>{
    if(!fabric){setStatus('Select a fabric before saving');return}
    try{
      const json=JSON.stringify(fabricPresetPayload(fabric,kind),null,2)
      if(json.length>FABRIC_FILE_LIMIT)throw Error('Material includes too much embedded image data for a single-fabric preset (2 MB maximum)')
      const url=URL.createObjectURL(new Blob([json],{type:'application/json'}))
      const anchor=document.createElement('a')
      anchor.href=url;anchor.download=filenameFor(fabric.name)
      document.body.appendChild(anchor);anchor.click();anchor.remove()
      window.setTimeout(()=>URL.revokeObjectURL(url),1000)
      setStatus(`Saved ${fabric.name||'fabric'} as an EXO fabric preset`)
    }catch(error){setStatus(error.message||'Could not save fabric')}
  }
  const open=async event=>{
    const file=event.target.files?.[0]
    event.target.value=''
    if(!file)return
    if(!fabric){setStatus('Select a fabric before opening a preset');return}
    if(file.size>FABRIC_FILE_LIMIT){setStatus('Fabric file exceeds the 2 MB maximum');return}
    setBusy(true)
    try{
      const parsed=parseFabricPreset(await file.text())
      if(parsed.kind!==kind)throw Error(`This ${parsed.kind} preset is not compatible with the selected ${kind} fabric editor`)
      const result=await onImport?.(parsed.fabric)
      if(result?.ok!==true)throw Error(result?.error||'Fabric import was not confirmed')
      setStatus(`Opened ${parsed.fabric.name} in the selected fabric`)
    }catch(error){setStatus(error.message||'Could not open fabric preset')}
    finally{setBusy(false)}
  }
  return <div className="clo-fabric-file-toolbar" aria-label="Fabric search and file controls">
    <div className="clo-fabric-file-row">
      <div className="clo-fabric-file-search">
        <Search size={13} aria-hidden="true"/>
        <input aria-label="Search fabrics in Property Editor" placeholder="Search fabric…" type="search"
          value={query} onChange={event=>{setQuery(event.target.value);setStatus('')}}
          onFocus={()=>setFocused(true)} onBlur={()=>window.setTimeout(()=>setFocused(false),120)}/>
        {focused&&query.trim()&&<div className="clo-fabric-file-matches" role="listbox" aria-label="Matching project fabrics">
          {matches.length?matches.map(item=><button key={item.id} type="button" role="option" aria-selected={item.id===fabric?.id}
            onMouseDown={event=>event.preventDefault()} onClick={()=>{onSelect?.(item.id);setQuery('');setFocused(false)}}>
            <span>{item.name}</span><small>{item.itemNo||''}</small></button>):<span className="clo-fabric-file-no-results">No fabric matches</span>}
        </div>}
      </div>
      <div className="clo-fabric-file-actions">
        <input ref={picker} type="file" accept=".json,.exo-fabric.json,application/json" hidden aria-label="Choose EXO fabric file" onChange={open}/>
        <button type="button" disabled={busy||!fabric} onClick={()=>picker.current?.click()} title="Open an EXO fabric preset (.exo-fabric.json)"><FolderOpen size={13}/>Open</button>
        <button type="button" disabled={busy||!fabric} onClick={save} title="Save selected fabric as a reusable .exo-fabric.json file"><Save size={13}/>Save</button>
      </div>
    </div>
    {status&&<div className="clo-fabric-file-status" role="status">{status}</div>}
  </div>
}
