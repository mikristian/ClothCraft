import React, {useState} from 'react'
import {ChevronRight} from 'lucide-react'

// These operations currently belong to the classic/draft workspace. Native
// Rust does not expose equivalent importers or production exporters yet.
const DRAFT_ONLY = new Set([
  'file.import.dxf','file.import.svg','avatar.import',
  'file.export.obj','file.export.glb','file.export.dxf','file.export.pdf',
  'file.export.svg','file.export.factory','file.export.bom',
  'render.capture','materials.graphic',
])
const SHORTCUTS = {
  'file.save':'⌘S','file.open':'⌘O','edit.undo':'⌘Z',
  'edit.redo':'⇧⌘Z','edit.delete':'⌫',
}

export default function CloTopMenuDropdown({menu,nativeMode,onAction,onDismiss}) {
  const [expanded,setExpanded]=useState(null)
  const available=action=>Boolean(action)&&!(nativeMode&&DRAFT_ONLY.has(action))
  const renderAction=([label,action],index)=><button
    type="button" role="menuitem" key={`${label}-${index}`}
    disabled={!available(action)}
    title={!action?'Feature planned':nativeMode&&DRAFT_ONLY.has(action)?'Available in the classic garment workspace':undefined}
    onClick={()=>onAction(action)}
  ><span>{label}</span>{SHORTCUTS[action]&&<kbd>{SHORTCUTS[action]}</kbd>}
    {!available(action)&&<small>{nativeMode&&DRAFT_ONLY.has(action)?'DRAFT':'SOON'}</small>}
  </button>

  return <div className="clo-menu-popover" role="menu" aria-label={`${menu.title} commands`}
    onKeyDown={event=>{
      if(event.key==='Escape'){event.stopPropagation();onDismiss?.()}
      if(event.key==='ArrowLeft'&&expanded){event.stopPropagation();setExpanded(null)}
      if(event.key==='ArrowDown'||event.key==='ArrowUp'){
        const all=[...event.currentTarget.querySelectorAll('button:not(:disabled)')].filter(button=>button.getClientRects().length>0)
        const pos=all.indexOf(document.activeElement)
        if(all.length){event.preventDefault();all[(pos+(event.key==='ArrowDown'?1:all.length-1)+all.length)%all.length]?.focus()}
      }
    }}>
    {menu.quickActions?.map(renderAction)}
    {menu.sections?.length ? menu.sections.map(([name,actions])=><div key={name}
      className={`clo-menu-flyout ${expanded===name?'is-expanded':''}`}
      onMouseEnter={()=>setExpanded(name)}
      onMouseLeave={()=>setExpanded(current=>current===name?null:current)}>
      <button type="button" role="menuitem" aria-haspopup="menu" aria-expanded={expanded===name}
        onClick={()=>setExpanded(name)}
        onKeyDown={event=>{if(event.key==='ArrowRight'){event.preventDefault();setExpanded(name);event.currentTarget.nextElementSibling?.querySelector('button:not(:disabled)')?.focus()}}}>
        <span>{name}</span><ChevronRight aria-hidden size={13}/>
      </button>
      <div className="clo-menu-subpanel" role="menu" aria-label={name}>{actions.map(renderAction)}</div>
    </div>) : menu.commands.map(renderAction)}
  </div>
}
