import React,{useRef} from 'react'
import {STUDIO_TOOL_CATALOG,normalizeStudioCustomization} from '../core/studioCustomization.js'
import CadToolIcon from './CadToolIcon.jsx'
import './StudioCustomToolbar.css'

/** Optional workspace toolbar. The parent maps action IDs to real editor commands. */
export default function StudioCustomToolbar({value,onAction,onCustomize,onChange}){
  const config=normalizeStudioCustomization(value)
  const {toolbarVisible,toolbarDock,toolbarPosition,toolbarCompact,toolbarIds,toolbarEditMode}=config.workspace
  const drag=useRef(null)
  const catalog=new Map(STUDIO_TOOL_CATALOG.map(tool=>[tool.id,tool]))
  const moveDown=event=>{
    if(!toolbarEditMode||toolbarDock!=='floating'||event.button!==0)return
    drag.current={pointerId:event.pointerId,x:event.clientX,y:event.clientY,startX:toolbarPosition.x,startY:toolbarPosition.y}
    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
  }
  const move=event=>{
    if(drag.current?.pointerId!==event.pointerId)return
    const next={x:Math.max(0,drag.current.startX+event.clientX-drag.current.x),
      y:Math.max(0,drag.current.startY+event.clientY-drag.current.y)}
    onChange?.({...value,workspace:{...value.workspace,toolbarPosition:next}})
  }
  const moveEnd=event=>{
    if(drag.current?.pointerId!==event.pointerId)return
    drag.current=null
  }
  if(!toolbarVisible)return null
  return <nav className={`exo-custom-toolbar exo-custom-toolbar--${toolbarDock}${toolbarCompact?' exo-custom-toolbar--compact':''}`} aria-label="Custom studio toolbar"
    data-dock={toolbarDock} data-edit-mode={String(toolbarEditMode)}
    style={toolbarDock==='floating'?{left:toolbarPosition.x,top:toolbarPosition.y}:undefined}
    onDragOver={event=>{if(toolbarEditMode&&event.dataTransfer.types.includes('text/plain'))event.preventDefault()}}
    onDrop={event=>{
      if(!toolbarEditMode)return
      const payload=event.dataTransfer.getData('text/plain')
      if(!payload.startsWith('extra:'))return
      const id=payload.slice(6)
      if(!catalog.has(id)||toolbarIds.includes(id))return
      event.preventDefault()
      onChange?.({...value,workspace:{...value.workspace,toolbarIds:[...toolbarIds,id]}})
    }}>
    {toolbarEditMode&&<button type="button" className="exo-custom-toolbar__move"
      onPointerDown={moveDown} onPointerMove={move} onPointerUp={moveEnd} onPointerCancel={moveEnd}
      aria-label="Move custom toolbar" title={toolbarDock==='floating'?'Drag to place custom toolbar':'Choose Floating dock in Settings to move freely'}>⠿</button>}
    {toolbarIds.map(id=>{
      const tool=catalog.get(id)
      if(!tool)return null
      return <button key={id} className="exo-custom-toolbar__action" type="button" title={`${tool.label}${tool.status==='reference'?' · Reference only: requires implementation':tool.status==='mapped'?' · EXO equivalent action':''}`} aria-label={tool.label} data-action={id} data-implementation={tool.status||'available'} onClick={()=>onAction?.(id)}>
        <span className="exo-custom-toolbar__glyph" aria-hidden="true">{({select:'↖',point:'◇',sew:'⌁',move3d:'✥',rotate3d:'⟳',simulate:'▶',reset:'↺',grid:'▦',seams:'⌇',library:'▤',properties:'☷',save:'▣',fit:'⛶',zipper:'⟷',trim:'✂','foam-padding':'▱'})[id]??<CadToolIcon id={tool.icon||id} size={17}/>}</span>
        {!toolbarCompact&&<span className="exo-custom-toolbar__label">{tool.label}</span>}
      </button>
    })}
    <button className="exo-custom-toolbar__customize" type="button" title="Customize toolbar" aria-label="Customize toolbar" onClick={()=>onCustomize?.()}>⚙</button>
  </nav>
}
