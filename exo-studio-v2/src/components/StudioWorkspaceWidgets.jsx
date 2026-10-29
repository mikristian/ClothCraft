import React,{useEffect,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import {STUDIO_TOOL_CATALOG} from '../core/studioCustomization.js'
import {resolveCustomToolbarDock20261028} from '../core/customToolbarDockGeometry20261028.js'
import CadToolIcon from './CadToolIcon.jsx'
import './StudioWorkspaceWidgets.css'
import {clampWidgetPosition20261028} from '../core/widgetPosition20261028.js'

const toolMap=new Map(STUDIO_TOOL_CATALOG.map(tool=>[tool.id,tool]))
const docks=['floating','left','right','top','bottom']
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n))
const labels={floating:'Undock · Float',left:'Embed · Left',right:'Embed · Right',top:'Embed · Top',bottom:'Embed · Bottom'}
export default function StudioWorkspaceWidgets({value,onChange,onAction,onCustomize}){
 const widgets=value?.workspace?.customWorkspaceWidgets||[]
 const [dragging,setDragging]=useState(null)
 const [bounds,setBounds]=useState({width:0,height:0})
 useEffect(()=>{
  if(!layer.current)return
  const observer=new ResizeObserver(([entry])=>setBounds({width:entry.contentRect.width,height:entry.contentRect.height}))
  observer.observe(layer.current);return ()=>observer.disconnect()
 },[])
 useEffect(()=>{
  const cancel=event=>{if(event.key==='Escape'){origin.current=null;setDragging(null);setMenu(null)}}
  window.addEventListener('keydown',cancel);return ()=>window.removeEventListener('keydown',cancel)
 },[])
 const [menu,setMenu]=useState(null)
 const menuRef=useRef(null)
 const origin=useRef(null)
 const layer=useRef(null)
 const update=(id,changes)=>onChange({...value,workspace:{...value.workspace,customWorkspaceWidgets:widgets.map(w=>w.id===id?{...w,...changes}:w)}})
 const visible=widgets.filter(w=>w.visible&&w.tools?.length)
 const hostRect=()=>layer.current?.getBoundingClientRect()
 const dockAt=(x,y)=>{
  const rect=hostRect(),layout=layer.current?.closest('.main-layout')
  const left=layout?.querySelector('.tool-rail'),right=layout?.querySelector('.clo-inspector')
  const sides={}
  if(left&&getComputedStyle(left).display!=='none')sides.left=left.getBoundingClientRect()
  if(right&&!right.hidden&&getComputedStyle(right).display!=='none')sides.right=right.getBoundingClientRect()
  return resolveCustomToolbarDock20261028(rect,x,y,sides)
 }
 useEffect(()=>{
  if(!menu)return
  const dismiss=event=>{if(event?.type==='pointerdown'&&menuRef.current?.contains(event.target))return;if(event?.type==='keydown'&&event.key!=='Escape')return;setMenu(null)}
  window.addEventListener('pointerdown',dismiss)
  window.addEventListener('keydown',dismiss)
  window.addEventListener('resize',dismiss)
  return ()=>{window.removeEventListener('pointerdown',dismiss);window.removeEventListener('keydown',dismiss);window.removeEventListener('resize',dismiss)}
 },[menu])
 const onDown=(event,widget)=>{
  if(event.button!==0||event.target.closest('button,select,input,a'))return
  const host=event.currentTarget.closest('.exo-workspace-widget'),rect=host?.getBoundingClientRect(),parent=hostRect()
  if(!rect||!parent)return
  origin.current={id:widget.id,pointerId:event.pointerId,x:event.clientX,y:event.clientY,
   offsetX:event.clientX-rect.left,offsetY:event.clientY-rect.top,width:rect.width,height:rect.height,moved:false}
  event.currentTarget.setPointerCapture(event.pointerId)
 }
 const onMove=event=>{
  const d=origin.current
  if(!d||d.pointerId!==event.pointerId)return
  if(!d.moved&&Math.hypot(event.clientX-d.x,event.clientY-d.y)<5)return
  d.moved=true
  const rect=hostRect(),dock=dockAt(event.clientX,event.clientY)
  setDragging({id:d.id,dock,...clampWidgetPosition20261028(event.clientX-(rect?.left||0)-d.offsetX,event.clientY-(rect?.top||0)-d.offsetY,rect,d)})
 }
 const onUp=event=>{
  const d=origin.current
  if(!d||d.pointerId!==event.pointerId)return
  if(event.currentTarget.hasPointerCapture?.(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId)
  if(d.moved&&event.type==='pointerup'){
   const dock=dockAt(event.clientX,event.clientY)
   const rect=hostRect()
   update(d.id,dock?{dock}:{dock:'floating',...clampWidgetPosition20261028(event.clientX-(rect?.left||0)-d.offsetX,event.clientY-(rect?.top||0)-d.offsetY,rect,d)})
  }
  origin.current=null;setDragging(null)
 }
 return <div ref={layer} className="exo-workspace-widget-layer" data-testid="custom-workspace-widget-layer" aria-label="Custom workspace widgets">
  {visible.map(widget=>{
   const dock=widget.dock||'floating',floating=dock==='floating',pos=dragging?.id===widget.id?dragging:widget
   return <section key={widget.id} className={`exo-workspace-widget exo-workspace-widget--${dock}`}
    data-custom-workspace-widget={widget.id} data-dock={dock} data-glass={String(widget.liquidGlass)}
    onContextMenu={event=>{event.preventDefault();event.stopPropagation();setMenu({id:widget.id,name:widget.name,x:event.clientX,y:event.clientY})}}
    style={{...(floating?{left:Math.max(0,Math.min(pos.x??110,Math.max(0,bounds.width-160))),top:Math.max(0,Math.min(pos.y??135,Math.max(0,bounds.height-40)))}:{}),'--widget-columns':widget.kind==='button'?1:widget.columns}}>
    <header className="exo-workspace-widget-head" data-workspace-widget-drag-handle="true"
     onPointerDown={event=>onDown(event,widget)} onPointerMove={onMove} onPointerUp={onUp}
     onPointerCancel={onUp} onLostPointerCapture={event=>{if(origin.current?.pointerId===event.pointerId){origin.current=null;setDragging(null)}}}>
     <span title="Drag to embed in a side, top or bottom dock">⠿ {widget.name}</span>
     <select aria-label={`Dock ${widget.name} widget`} value={dock} title="Widget docking position"
      onChange={event=>update(widget.id,{dock:event.target.value})}>
      {docks.map(position=><option key={position} value={position}>{position}</option>)}
     </select>
     <button type="button" aria-label={`Customize ${widget.name}`} onClick={onCustomize}>⚙</button>
     <button type="button" aria-label={`Remove ${widget.name} from workspace`} title="Remove widget (preserve configuration)"
      onClick={()=>update(widget.id,{visible:false})}>×</button>
    </header>
    <div className="exo-workspace-widget-tools" role="group" aria-label={widget.name}>{widget.tools.map(id=>{const tool=toolMap.get(id);return <button type="button" key={id} title={tool?.label||id} aria-label={tool?.label||id} onClick={()=>onAction?.(id)}><CadToolIcon id={tool?.icon||id} size={widget.kind==='button'?21:17}/>{widget.kind==='button'&&<span>{widget.name}</span>}</button>})}</div>
   </section>
  })}
  {dragging?.dock&&<div className={`exo-workspace-widget-drop-target exo-workspace-widget-drop-target--${dragging.dock}`} aria-hidden="true">Embed · {dragging.dock}</div>}
  {menu&&createPortal(<div ref={menuRef} role="menu" className="exo-workspace-widget-context" data-workspace-widget-context-menu={menu.id}
   aria-label={`${menu.name} widget options`}
   style={{left:`min(calc(100vw - 215px), ${Math.max(4,menu.x)}px)`,top:`min(calc(100vh - 230px), ${Math.max(4,menu.y)}px)`}}
   onPointerDown={event=>event.stopPropagation()}>
    <strong>{menu.name}</strong>
    {docks.map(position=><button key={position} type="button" role="menuitem" onClick={()=>{update(menu.id,{dock:position});setMenu(null)}}>{labels[position]}</button>)}
    <button type="button" role="menuitem" onClick={()=>{update(menu.id,{visible:false});setMenu(null)}}>Remove from workspace</button>
   </div>,document.body)}
 </div>
}
