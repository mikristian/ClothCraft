import React, {useEffect, useMemo, useState} from 'react'
import {getModarisStudioCommands20261027} from './ModarisCommandStudio20261027.jsx'
import './ModarisCadHotkeyGuide20261027.css'

// Reserved shortcuts are already owned by the existing pattern workspace or the browser.
const RESERVED = new Set(['Mod+Z','Mod+Shift+Z','Mod+Y','Mod+S','Mod+C','Mod+V','Mod+X','Mod+A','Mod+P','Mod+R','Mod+F','Escape','Delete','Backspace','Space','V','B','E','I','G','R','H','P','A','C','?','F1','F2','F3','F4','F5','F6','F7','F8'])
const INITIAL_KEYS = Object.freeze({
  'true-seam':'Alt+Shift+T',
  'grade-run':'Alt+Shift+G',
  'grade-audit':'Alt+Shift+A',
  'sewing-balance':'Alt+Shift+B',
  'industrial-audit':'Alt+Shift+I',
  'cutline':'Alt+Shift+K',
  'reference-recompute':'Alt+Shift+R',
  'seam-walk':'Alt+Shift+W',
})

function normalizeKey(key) {
  if(key===' ')return 'Space'
  if(key==='Esc')return 'Escape'
  if(key.length===1)return key.toUpperCase()
  return key
}

export function eventToModarisChord20261027(event) {
  const key=normalizeKey(event.key||'')
  if(!key||['Control','Meta','Alt','Shift','Dead','Process','Unidentified'].includes(key))return ''
  return [...(event.metaKey||event.ctrlKey?['Mod']:[]),...(event.altKey?['Alt']:[]),...(event.shiftKey?['Shift']:[]),key].join('+')
}

export function validateModarisHotkey20261027(chord,keymap={},commandId='') {
  if(!chord)return {ok:true}
  if(RESERVED.has(chord))return {ok:false,reason:'Reserved by the workspace or browser'}
  if(!/^(?:(?:Mod|Alt|Shift)\+){1,3}(?:[A-Z0-9]|F(?:9|10|11|12))$/.test(chord) ||
    new Set(chord.split('+').slice(0,-1)).size!==chord.split('+').length-1 ||
    (!chord.includes('Alt+')&&!chord.includes('Mod+')))
    return {ok:false,reason:'Use Alt or Ctrl/⌘ with a letter, number, or F9–F12'}
  const owner=Object.entries(keymap).find(([id,key])=>id!==commandId&&key===chord)
  return owner?{ok:false,reason:`Already assigned to ${owner[0]}`}:{ok:true}
}

export function getModarisHotkeyCommands20261027({actions={},capabilities={},disabled=false,keymap={}}={}) {
  return getModarisStudioCommands20261027({actions,capabilities,disabled}).map(command=>({
    ...command,
    shortcut:keymap[command.id]||'',
  }))
}

const isEditableTarget=target=>Boolean(target?.isContentEditable||target?.closest?.('input, textarea, select, [contenteditable], [role="textbox"], [role="combobox"]'))

/**
 * The host mounts this component only in full 2D. Keyboard dispatch additionally
 * requires both full2DFocus and enabled, so temporary layouts cannot run CAD commands.
 * actions / capabilities follow ModarisCommandStudio20261027's verified contract.
 */
export default function ModarisCadHotkeyGuide20261027({
  actions={},capabilities={},disabled=false,full2DFocus=false,enabled=true,
  onCommandExecuted,className='',title='CAD keyboard shortcuts'
}) {
  const [keymap,setKeymap]=useState(()=>({...INITIAL_KEYS}))
  const [query,setQuery]=useState('')
  const [category,setCategory]=useState('all')
  const [recording,setRecording]=useState('')
  const [status,setStatus]=useState('')
  const commands=useMemo(()=>getModarisHotkeyCommands20261027({actions,capabilities,disabled,keymap}),[actions,capabilities,disabled,keymap])
  const categories=useMemo(()=>[...new Set(commands.map(command=>command.category))],[commands])
  const visible=useMemo(()=>commands.filter(command=>(category==='all'||command.category===category)&&
    `${command.label} ${command.id} ${command.categoryLabel} ${command.shortcut}`.toLowerCase().includes(query.trim().toLowerCase())),[commands,category,query])
  const execute=command=>{
    if(!command?.available||!full2DFocus||!enabled)return
    try {
      const outcome=actions[command.id]()
      if(outcome&&typeof outcome.then==='function')outcome.catch(error=>setStatus(`${command.label}: ${error?.message||String(error)}`))
      onCommandExecuted?.(command)
      setStatus(`${command.label} requested`)
    }catch(error){setStatus(`${command.label}: ${error?.message||String(error)}`)}
  }
  useEffect(()=>{
    if(!enabled||!full2DFocus||disabled||recording)return undefined
    const onKeyDown=event=>{
      if(event.defaultPrevented||event.repeat||event.isComposing||isEditableTarget(event.target))return
      const chord=eventToModarisChord20261027(event)
      if(!chord||RESERVED.has(chord))return
      const command=commands.find(item=>item.available&&item.shortcut===chord)
      if(!command)return
      event.preventDefault()
      event.stopPropagation()
      execute(command)
    }
    window.addEventListener('keydown',onKeyDown)
    return ()=>window.removeEventListener('keydown',onKeyDown)
  },[enabled,full2DFocus,disabled,recording,commands,actions,onCommandExecuted])
  useEffect(()=>{
    if(!recording)return undefined
    const blockCapture=event=>{
      if(event.target?.closest?.('.exo-cad-hotkeys__key'))return
      if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation?.();setRecording('');setStatus('Shortcut assignment cancelled')}
    }
    window.addEventListener('keydown',blockCapture,true)
    return ()=>window.removeEventListener('keydown',blockCapture,true)
  },[recording])
  const capture=(event,id)=>{
    event.preventDefault()
    event.stopPropagation()
    event.nativeEvent?.stopImmediatePropagation?.()
    if(event.key==='Escape'){setRecording('');setStatus('Shortcut assignment cancelled');return}
    if(event.key==='Backspace'||event.key==='Delete'){
      setKeymap(map=>({...map,[id]:''}))
      setRecording('')
      setStatus('Shortcut cleared')
      return
    }
    const chord=eventToModarisChord20261027(event)
    if(!chord)return
    const check=validateModarisHotkey20261027(chord,keymap,id)
    if(!check.ok){setStatus(check.reason);return}
    setKeymap(map=>({...map,[id]:chord}))
    setRecording('')
    setStatus(`Assigned ${chord}`)
  }
  return <section className={`exo-cad-hotkeys ${className}`} aria-label={title} data-2d-full-focus={String(full2DFocus)}>
    <header className="exo-cad-hotkeys__header"><div><strong>{title}</strong><small>Session keymap · {commands.filter(command=>command.available).length} commands connected</small></div>
      <button type="button" onClick={()=>{setKeymap({...INITIAL_KEYS});setRecording('');setStatus('Default shortcuts restored')}}>Reset all</button>
    </header>
    <p>Assignments work only while the full-width 2D workspace has focus. Select a key to record a new combination. Delete clears it.</p>
    <div className="exo-cad-hotkeys__filters">
      <input type="search" value={query} aria-label="Search CAD shortcuts" placeholder="Search CAD commands…" onChange={event=>setQuery(event.target.value)}/>
      <select value={category} aria-label="Shortcut category" onChange={event=>setCategory(event.target.value)}>
        <option value="all">All tool groups</option>
        {categories.map(id=><option value={id} key={id}>{commands.find(command=>command.category===id)?.categoryLabel||id}</option>)}
      </select>
    </div>
    <div className="exo-cad-hotkeys__list" role="list" aria-label="CAD commands">
      {visible.map(command=><div role="listitem" key={command.id} className="exo-cad-hotkeys__item" data-action={command.id} data-available={String(command.available)}>
        <div className="exo-cad-hotkeys__name"><strong>{command.label}</strong><small>{command.categoryLabel}{command.available?'':' · '+command.reason}</small></div>
        <button type="button" className="exo-cad-hotkeys__key" aria-label={`Change ${command.label} shortcut`} aria-pressed={recording===command.id}
          onClick={event=>{setRecording(command.id);setStatus(`Press a shortcut for ${command.label}`);event.currentTarget.focus()}}
          onKeyDownCapture={event=>{if(recording===command.id)capture(event,command.id)}}>
          <kbd>{recording===command.id?'Press keys…':command.shortcut||'Assign key'}</kbd>
        </button>
        <button type="button" className="exo-cad-hotkeys__run" disabled={!command.available||!enabled||!full2DFocus||Boolean(recording)}
          title={command.available?'Run selected CAD command':command.reason} onClick={()=>execute(command)}>Run</button>
      </div>)}
      {!visible.length&&<p>No matching commands.</p>}
    </div>
    <footer><small>{full2DFocus?'Full-width 2D focus enabled':'Shortcuts inactive until full-width 2D focus'} · Connected actions only</small>
      {recording&&<button type="button" onClick={()=>{setRecording('');setStatus('Shortcut assignment cancelled')}}>Cancel recording</button>}
      {status&&<output role="status">{status}</output>}
    </footer>
  </section>
}
