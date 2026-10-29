import React, {useEffect, useMemo, useRef, useState} from 'react'
import './ModarisCommandStudio20261027.css'

// Keys switch command families; individual actions are supplied by the host.
// A capability with no real handler is visible for discovery but cannot execute.
export const MODARIS_STUDIO_FAMILIES_20261027 = Object.freeze([
  {key:'F1', id:'construction', label:'Construction', stage:1, tools:[['select','Select pattern'],['point','Construction point'],['line','Construction line'],['curve','Curve drafting'],['polygon','Create pattern piece']]},
  {key:'F2', id:'modify', label:'Modification', stage:1, tools:[['move','Move / rotate'],['split','Split edge'],['mirror','Mirror piece'],['true-seam','True seam'],['dart','Dart manipulation']]},
  {key:'F3', id:'measure', label:'Measurements', stage:2, tools:[['measure','Measure geometry'],['measurement-chart','Measurement chart'],['constraints','Parametric constraints'],['reference-recompute','Reference regeneration']]},
  {key:'F4', id:'grading', label:'Grading', stage:3, tools:[['grade-chart','Size chart'],['grade-edit','Edit grade rules'],['grade-run','Regenerate all sizes'],['grade-audit','Audit graded sizes']]},
  {key:'F5', id:'sewing', label:'Sewing', stage:4, tools:[['sew','Join seam'],['seam-walk','Walk seam'],['sewing-balance','Seam balance'],['notch','Physical notches']]},
  {key:'F6', id:'industrial', label:'Industrial', stage:5, tools:[['allowance','Seam allowance'],['facing','Linked facing'],['cutline','Cutline generation'],['industrial-audit','Industrial audit']]},
  {key:'F7', id:'prototype', label:'2D / 3D', stage:6, tools:[['view-2d','2D workspace'],['view-split','2D + 3D workspace'],['simulate','Simulate garment'],['fit','Fit inspection'],['variant','Pattern variant']]},
  {key:'F8', id:'output', label:'Output & QA', stage:6, tools:[['undo','Undo'],['redo','Redo'],['save','Save project'],['export','Export'],['interchange','Modaris interchange']]},
])

export function getModarisStudioCommands20261027({actions={}, capabilities={}, disabled=false}={}) {
  return MODARIS_STUDIO_FAMILIES_20261027.flatMap(family=>family.tools.map(([id,label])=>{
    const callback=actions?.[id]
    const capability=capabilities?.[id]
    const sourceReady=capability===true || capability?.available===true || capability?.status==='available'
    const available=!disabled && typeof callback==='function' && sourceReady
    return {id,label,category:family.id,categoryLabel:family.label,key:family.key,stage:family.stage,
      available,reason:available?'':disabled?'Workspace is busy':!sourceReady?(capability?.reason||'Source capability unverified'):'Action handler not connected'}
  }))
}

export function filterModarisStudioCommands20261027(commands,query='',category='all') {
  const tokens=String(query).toLocaleLowerCase().trim().split(/\s+/).filter(Boolean)
  return commands.filter(c=>(category==='all'||c.category===category)&&tokens.every(token=>
    `${c.label} ${c.id} ${c.categoryLabel} ${c.key} stage ${c.stage}`.toLocaleLowerCase().includes(token)))
}

export default function ModarisCommandStudio20261027({
  actions={},capabilities={},disabled=false,activeCommand='',onCommandExecuted,
  enableHotkeys=true,className='',title='EXO · Pattern commands'
}) {
  const [category,setCategory]=useState('construction')
  const [query,setQuery]=useState('')
  const [status,setStatus]=useState('')
  const searchRef=useRef(null)
  const commands=useMemo(()=>getModarisStudioCommands20261027({actions,capabilities,disabled}),[actions,capabilities,disabled])
  const visible=useMemo(()=>filterModarisStudioCommands20261027(commands,query,category),[commands,query,category])
  const execute=id=>{
    const command=commands.find(item=>item.id===id)
    if(!command?.available)return false
    try {
      const outcome=actions[id]()
      if(outcome&&typeof outcome.then==='function')outcome.catch(error=>setStatus(`${command.label}: ${error?.message||String(error)}`))
      onCommandExecuted?.(command)
      setStatus(`${command.label} requested`)
      return true
    }catch(error){setStatus(`${command.label}: ${error?.message||String(error)}`);return false}
  }
  useEffect(()=>{
    if(!enableHotkeys)return undefined
    const onKeyDown=event=>{
      if(event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return
      if(!/^F[1-8]$/.test(event.key))return
      const target=event.target
      if(target?.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName||''))return
      event.preventDefault()
      const family=MODARIS_STUDIO_FAMILIES_20261027.find(group=>group.key===event.key)
      if(family){setCategory(family.id);setQuery('');searchRef.current?.focus()}
    }
    window.addEventListener('keydown',onKeyDown)
    return ()=>window.removeEventListener('keydown',onKeyDown)
  },[enableHotkeys])
  const availableCount=commands.filter(command=>command.available).length
  return <section className={`exo-modaris-command-studio ${className}`} aria-label="Pattern command studio" data-command-studio="modaris-20261027">
    <header className="exo-modaris-command-studio__header"><strong>{title}</strong><small>{availableCount} of {commands.length} source-verified commands connected</small></header>
    <nav className="exo-modaris-command-studio__families" aria-label="Pattern command categories">
      {MODARIS_STUDIO_FAMILIES_20261027.map(family=><button type="button" key={family.id}
        aria-pressed={category===family.id} title={`${family.key} · ${family.label}`}
        onClick={()=>{setCategory(family.id);setQuery('')}}><kbd>{family.key}</kbd><span>{family.label}</span></button>)}
    </nav>
    <label className="exo-modaris-command-studio__search">Search tools across all stages
      <input ref={searchRef} type="search" value={query} placeholder="Name, command, stage…" onChange={event=>{setQuery(event.target.value);if(event.target.value)setCategory('all')}}/>
    </label>
    <div className="exo-modaris-command-studio__filters">
      <button type="button" aria-pressed={category==='all'} onClick={()=>setCategory('all')}>All categories</button>
      <span>{visible.filter(item=>item.available).length} available · {visible.length} shown</span>
    </div>
    <div className="exo-modaris-command-studio__results" role="group" aria-label="Tool commands">
      {visible.length?visible.map(command=><button type="button" key={command.id}
        disabled={!command.available} aria-pressed={command.available&&activeCommand===command.id}
        title={command.available?`${command.categoryLabel} · ${command.label}`:command.reason}
        onClick={()=>execute(command.id)} data-command={command.id} data-availability={command.available?'available':'unavailable'}>
        <span>{command.label}<small>{command.categoryLabel} · Stage {command.stage}</small></span>
        <em>{command.available?'Run':'Unavailable'}</em>
      </button>):<p>No commands match this search.</p>}
    </div>
    <footer><small>F1–F8 open tool families. Commands become executable when the host supplies an action and confirms source capability.</small>{status&&<p role="status">{status}</p>}</footer>
  </section>
}
