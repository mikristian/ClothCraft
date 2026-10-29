import React,{useEffect,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import {STUDIO_TOOL_CATALOG} from '../core/studioCustomization.js'
import {EXO_CUSTOM_TOOLBAR_DOCKS_20261028,resolveCustomToolbarDock20261028} from '../core/customToolbarDockGeometry20261028.js'
import {applyCustomToolbarPlacement20261028} from '../core/customToolbarContextActions20261028.js'
import CadToolIcon from './CadToolIcon.jsx'
import './StudioCustomToolbarCollection.css'

const catalog=new Map(STUDIO_TOOL_CATALOG.map(tool=>[tool.id,tool]))
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value))
const DOCK_LABELS={left:'Left side panel',right:'Right side panel',top:'Top toolbar',bottom:'Bottom toolbar'}
const orientations=['floating',...EXO_CUSTOM_TOOLBAR_DOCKS_20261028]

export default function StudioCustomToolbarCollection({value,onChange,onAction,onCustomize,gradeNestEnabled=false}){
 const bars=value?.workspace?.customToolbars||[]
 const [hidden,setHidden]=useState([])
 const [collapsed,setCollapsed]=useState([])
 const [hover,setHover]=useState(null)
 const [contextMenu,setContextMenu]=useState(null)
 const contextMenuRef=useRef(null)
 const [previewPos,setPreviewPos]=useState(null)
 const [dockGeometry,setDockGeometry]=useState(null)
 const [panelHosts,setPanelHosts]=useState({left:null,right:null})
 const [panelsVisible,setPanelsVisible]=useState({left:false,right:false})
 const drag=useRef(null)
 const nestDragListeners=useRef(null)
 const suppressNestAction=useRef(new Set())
 const root=useRef(null)
 useEffect(()=>()=>nestDragListeners.current?.(),[])
 useEffect(()=>{
  const layout=root.current?.closest('.main-layout')
  if(!layout)return
  const left=layout.querySelector('.tool-rail')
  // The inspector itself is a *horizontal* flex row (tool palette + browser).
  // Portaling another full-width dock into that row consumed all its width and
  // pushed the Object Browser and Property Editor completely off screen.
  // Mount within the vertical inspector content instead.
  const right=layout.querySelector('.clo-inspector .clo-inspector-content')
    ||layout.querySelector('.clo-inspector')
  setPanelHosts({left,right})
  const sync=()=>setPanelsVisible(previous=>{
   const next={left:!!left&&!left.hidden&&left.getBoundingClientRect().width>0,
    right:!!right&&!right.hidden&&right.getBoundingClientRect().width>0}
   return previous.left===next.left&&previous.right===next.right?previous:next
  })
  const observer=new MutationObserver(sync)
  observer.observe(layout,{attributes:true,attributeFilter:['data-inspector-visible']})
  if(left)observer.observe(left,{attributes:true,attributeFilter:['hidden','style']})
  if(right)observer.observe(right,{attributes:true,attributeFilter:['hidden','style']})
  sync()
  return ()=>observer.disconnect()
 },[])
 // Dock center is strictly the union of the visible 2D/3D viewer windows.
 // Dock wide starts at the Library column and ends at Object Browser's edge.
 useEffect(()=>{
  const workspace=root.current?.closest('.workspaces')
  const layout=workspace?.closest('.main-layout')
  if(!workspace||!layout)return
  const measure=()=>{
   const board=layout.getBoundingClientRect()
   const work=workspace.getBoundingClientRect()
   const viewers=[...workspace.querySelectorAll('.cc-viewport-2d,.cc-viewport-3d')].filter(node=>{
    const box=node.getBoundingClientRect();return box.width>80&&box.height>80&&getComputedStyle(node).display!=='none'
   }).map(node=>node.getBoundingClientRect())
   const library=layout.querySelector('.asset-browser')?.getBoundingClientRect()
   const inspector=layout.querySelector('.clo-inspector')?.getBoundingClientRect()
   const centerLeft=viewers.length?Math.min(...viewers.map(box=>box.left)):work.left
   const centerRight=viewers.length?Math.max(...viewers.map(box=>box.right)):work.right
   const next={centerLeft:centerLeft-work.left,centerWidth:centerRight-centerLeft,
    wideLeft:Math.min(library?.left??work.left,work.left)-work.left,
    wideWidth:Math.max(inspector?.right??board.right,board.right)-Math.min(library?.left??work.left,work.left),
    workWidth:work.width}
   setDockGeometry(old=>old&&Object.keys(next).every(key=>Math.abs(old[key]-next[key])<.5)?old:next)
  }
  measure()
  const observer=new ResizeObserver(measure)
  observer.observe(workspace);observer.observe(layout)
  const library=layout.querySelector('.asset-browser'),inspector=layout.querySelector('.clo-inspector')
  if(library)observer.observe(library)
  if(inspector)observer.observe(inspector)
  window.addEventListener('resize',measure)
  return()=>{observer.disconnect();window.removeEventListener('resize',measure)}
 },[])
 const visible=bars.filter(bar=>bar.visible&&!hidden.includes(bar.id)&&bar.tools?.length)
 const saveBar=(id,fields)=>onChange({...value,workspace:{...value.workspace,
  customToolbars:bars.map(item=>item.id===id?{...item,...fields}:item)}})
 const placeBar=(id,action)=>{
  setContextMenu(null)
  setHidden(ids=>ids.filter(item=>item!==id))
  onChange({...value,workspace:{...value.workspace,
   customToolbars:applyCustomToolbarPlacement20261028(bars,id,action)}})
 }
 useEffect(()=>{
  if(!contextMenu)return
  const dismiss=event=>{if(event?.type==='pointerdown'&&contextMenuRef.current?.contains(event.target))return;setContextMenu(null)}
  window.addEventListener('pointerdown',dismiss)
  window.addEventListener('keydown',dismiss)
  window.addEventListener('resize',dismiss)
  return ()=>{
   window.removeEventListener('pointerdown',dismiss)
   window.removeEventListener('keydown',dismiss)
   window.removeEventListener('resize',dismiss)
  }
 },[contextMenu])
 const zoneAt=(x,y)=>{
  const workspaces=root.current?.closest('.workspaces')
  const rect=workspaces?.getBoundingClientRect()
  const layout=workspaces?.closest('.main-layout')
  const sideRects={}
  const left=layout?.querySelector('.tool-rail')
  const right=layout?.querySelector('.clo-inspector')
  if(left&&getComputedStyle(left).display!=='none')sideRects.left=left.getBoundingClientRect()
  if(right&&getComputedStyle(right).display!=='none'&&!right.hidden)sideRects.right=right.getBoundingClientRect()
  return resolveCustomToolbarDock20261028(rect,x,y,sideRects)
 }
 const syncPanelHighlight=side=>{
  const layout=root.current?.closest('.main-layout')
  for(const [name,selector] of [['left','.tool-rail'],['right','.clo-inspector']]){
   const panel=layout?.querySelector(selector)
   if(panel)panel.dataset.exoCustomToolbarDockHover=String(side===name)
  }
 }
 const clearDrag=()=>{
  drag.current=null
  setHover(null)
  setPreviewPos(null)
  syncPanelHighlight(null)
 }
 const pointerDown=(event,bar)=>{
  const onNestSurface=Boolean(event.currentTarget.closest('[data-exo-nest-drag-handle],.exo-liquid-glass-nest-action'))
  if(event.button!==0||(event.target.closest('button,select,input,a')&&!onNestSurface))return
  const workspaces=root.current?.closest('.workspaces')
  const rect=workspaces?.getBoundingClientRect()
  const barRect=event.currentTarget.closest('[data-custom-bar]')?.getBoundingClientRect()
  if(!rect||!barRect)return
  drag.current={id:bar.id,pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,
   offsetX:event.clientX-barRect.left,offsetY:event.clientY-barRect.top,
   width:barRect.width,height:barRect.height,
   startLeft:bar.x??115,startTop:bar.y??125,moved:false}
  // The single-button Nest grip sits beside a live action control. Capturing
  // on its tiny span is fragile if an overlay/portal rerenders while moving;
  // the Nest grip has its own window-level pointer tracking instead.
  if(!onNestSurface)
   event.currentTarget.setPointerCapture(event.pointerId)
 }
 const pointerMove=event=>{
  const info=drag.current
  if(!info||info.pointerId!==event.pointerId)return
  if(!info.moved&&Math.hypot(event.clientX-info.startX,event.clientY-info.startY)<6)return
  info.moved=true
  const zone=zoneAt(event.clientX,event.clientY)
  setHover(previous=>previous?.side===zone&&previous?.id===info.id?previous:{side:zone,id:info.id})
  syncPanelHighlight(zone)
  if(!zone){
   const rect=root.current?.closest('.workspaces')?.getBoundingClientRect()
   if(rect)setPreviewPos({id:info.id,x:clamp(event.clientX-rect.left-info.offsetX,0,Math.max(0,rect.width-info.width)),
    y:clamp(event.clientY-rect.top-info.offsetY,0,Math.max(0,rect.height-info.height))})
  }else setPreviewPos(null)
 }
 const pointerEnd=event=>{
  const info=drag.current
  if(!info||info.pointerId!==event.pointerId)return
  if(event.currentTarget.hasPointerCapture?.(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId)
  if(info.moved&&event.type==='pointerup'){
   const dock=zoneAt(event.clientX,event.clientY)
   const rect=root.current?.closest('.workspaces')?.getBoundingClientRect()
   if(dock)saveBar(info.id,{dock})
   else if(rect)saveBar(info.id,{dock:'floating',
    x:clamp(event.clientX-rect.left-info.offsetX,0,Math.max(0,rect.width-info.width)),
    y:clamp(event.clientY-rect.top-info.offsetY,0,Math.max(0,rect.height-info.height))})
  }
  clearDrag()
 }
 const nestPointerDown=(event,bar)=>{
  if(event.button!==0)return
  // Drag starts on either the grip OR the button itself. A short button click
  // still invokes Nest; any movement beyond the drag threshold must not toggle
  // it. This is important for real users who grab the main glass button rather
  // than its small adjacent grip.
  if(event.currentTarget.hasAttribute('data-exo-nest-drag-handle'))event.preventDefault()
  event.stopPropagation()
  suppressNestAction.current.delete(bar.id)
  nestDragListeners.current?.()
  pointerDown(event,bar)
  if(!drag.current)return
  const pointerId=event.pointerId
  const move=next=>{
   if(next.pointerId!==pointerId)return
   next.preventDefault()
   pointerMove(next)
  }
  const finish=next=>{
   if(next.pointerId!==pointerId)return
   if(drag.current?.moved)suppressNestAction.current.add(bar.id)
   nestDragListeners.current?.()
   pointerEnd(next)
  }
  const cleanup=()=>{
   window.removeEventListener('pointermove',move,true)
   window.removeEventListener('pointerup',finish,true)
   window.removeEventListener('pointercancel',finish,true)
   nestDragListeners.current=null
  }
  nestDragListeners.current=cleanup
  window.addEventListener('pointermove',move,{capture:true,passive:false})
  window.addEventListener('pointerup',finish,true)
  window.addEventListener('pointercancel',finish,true)
 }
 const toggleCollapsed=id=>setCollapsed(ids=>ids.includes(id)?ids.filter(v=>v!==id):[...ids,id])
 const renderBar=(bar,index)=>{
  const isCollapsed=collapsed.includes(bar.id)
  const buttonOnly=Boolean(bar.buttonOnly||bar.savedSourceId==='saved-liquid-glass-grade-nest'||(bar.tools?.length===1&&bar.tools[0]==='exo:grade-nest-xs-xxl'))
  const floating=bar.dock==='floating'||previewPos?.id===bar.id
  const transient=previewPos?.id===bar.id?previewPos:null
  return <nav key={bar.id} className={`exo-builder-livebar exo-builder-livebar--${floating?'floating':bar.dock}${buttonOnly?' exo-builder-livebar--button-only':''}`}
   data-orientation={bar.orientation||'vertical'} aria-label={`${bar.name} custom toolbar`}
   data-custom-bar={bar.id} data-dock={floating?'floating':bar.dock} data-bar-finish={bar.finish||'solid'} data-button-only={buttonOnly?'true':'false'}
   onContextMenu={event=>{
    event.preventDefault()
    event.stopPropagation()
    setContextMenu({id:bar.id,name:bar.name,x:event.clientX,y:event.clientY})
   }}
   style={{'--custom-bar-color':bar.color||'#253d57','--bar-cols':bar.columns,'--bar-flow':'row','--bar-rows':undefined,
    '--bar-cols-layout':bar.orientation==='horizontal'?
     `repeat(${Math.min(10,Math.max(1,Math.ceil(bar.tools.length/Math.max(bar.columns,1))))},36px)`:
     `repeat(${bar.columns},36px)`,
    left:floating?(transient?.x??bar.x??(115+index*65)):undefined,
    top:floating?(transient?.y??bar.y??(125+index*45)):undefined}}>
   {!buttonOnly&&<div className="exo-builder-livebar__header" data-custom-toolbar-drag-handle="true"
    tabIndex={0} role="button" aria-label={`Drag ${bar.name} to a side, top or bottom dock`}
    onPointerDown={event=>pointerDown(event,bar)}
    onPointerMove={pointerMove} onPointerUp={pointerEnd}
    onPointerCancel={pointerEnd} onLostPointerCapture={event=>{if(drag.current?.pointerId===event.pointerId)clearDrag()}}
    onKeyDown={event=>{if(event.target!==event.currentTarget)return;if(event.key==='Escape')clearDrag()}}>
    <span title={bar.name}>⠿ {bar.name}{isCollapsed?` · ${bar.tools.length}`:''}</span>
    <select aria-label={`Dock ${bar.name} toolbar`} title="Toolbar placement"
     value={bar.dock} onChange={event=>saveBar(bar.id,{dock:event.target.value})}>
     {orientations.map(position=><option value={position} key={position}>{position==='floating'?'Floating':DOCK_LABELS[position]}</option>)}
    </select>
    <button type="button" aria-label={`${isCollapsed?'Expand':'Collapse'} ${bar.name} toolbar`}
     aria-expanded={!isCollapsed} title={isCollapsed?'Expand toolbar':'Collapse toolbar'}
     onClick={()=>toggleCollapsed(bar.id)}>{isCollapsed?'▸':'▾'}</button>
    <button type="button" title="Edit custom toolbar" aria-label={`Edit ${bar.name} toolbar`}
     onClick={onCustomize}>⚙</button>
    <button type="button" title={`Remove ${bar.name} from workspace (keeps saved toolbar)`} aria-label={`Remove ${bar.name} toolbar from workspace`}
     onClick={()=>placeBar(bar.id,'hide')}>×</button>
   </div>}
   {!isCollapsed&&<div className="exo-builder-livebar__tools">{bar.tools.map(id=>{
    const tool=catalog.get(id)
    return <button type="button" key={id} className={id==='exo:grade-nest-xs-xxl'?'exo-liquid-glass-nest-action':undefined} aria-pressed={id==='exo:grade-nest-xs-xxl'?gradeNestEnabled:undefined} aria-label={tool?.label||id}
     data-custom-tool-id={id}
     style={bar.iconColors?.[id]?{'--exo-per-tool-icon-color':bar.iconColors[id]}:undefined}
     data-implementation={tool?.status||'available'}
     title={buttonOnly&&id==='exo:grade-nest-xs-xxl'?'Click to toggle Nest · Drag button or ⠿ grip to move':`${tool?.label||id}${tool?.status==='reference'?' · Reference only; requires EXO implementation':tool?.status==='mapped'?' · EXO equivalent action':''}`}
     onPointerDown={buttonOnly&&id==='exo:grade-nest-xs-xxl'?event=>nestPointerDown(event,bar):undefined}
     onClick={event=>{
      // Button drags must NEVER toggle the size nest, even if the pointer-up
      // still generates a synthetic click against the original button.
      if(buttonOnly&&id==='exo:grade-nest-xs-xxl'&&suppressNestAction.current.has(bar.id)){
       suppressNestAction.current.delete(bar.id)
       event.preventDefault();event.stopPropagation()
       return
      }
      onAction(id)
     }}>{buttonOnly&&id==='exo:grade-nest-xs-xxl'?<><CadToolIcon id={tool?.icon||id} size={18}/><span className="exo-nest-button-label">NEST <small>XS–XXL</small></span></>:<CadToolIcon id={tool?.icon||id} size={20}/>}</button>
   })}{buttonOnly&&<span className="exo-nest-drag-handle" data-exo-nest-drag-handle="true" role="button" tabIndex={0} aria-label={`Drag ${bar.name} button`} title="Drag to reposition Nest" onPointerDown={event=>nestPointerDown(event,bar)} onKeyDown={event=>{
    if(event.key==='Escape'){nestDragListeners.current?.();clearDrag();return}
    const shift={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key]
    if(!shift)return
    event.preventDefault();event.stopPropagation()
    const workspace=root.current?.closest('.workspaces')?.getBoundingClientRect()
    const liveBar=event.currentTarget.closest('[data-custom-bar]')?.getBoundingClientRect()
    if(!workspace||!liveBar)return
    const step=event.shiftKey?24:8
    saveBar(bar.id,{dock:'floating',
     x:clamp(liveBar.left-workspace.left+step*shift[0],0,Math.max(0,workspace.width-liveBar.width)),
     y:clamp(liveBar.top-workspace.top+step*shift[1],0,Math.max(0,workspace.height-liveBar.height))})
   }}>⠿</span>}</div>}
  </nav>
 }
  return <div className="exo-custom-toolbar-docking" ref={root} data-exo-custom-toolbar-docking="true">
  {EXO_CUSTOM_TOOLBAR_DOCKS_20261028.map(side=>{
   const dockedBars=visible.filter(bar=>bar.dock===side&&previewPos?.id!==bar.id)
   // Empty portal regions are NOT layout placeholders. An otherwise empty
   // 100%-width region in the right inspector previously hid both panels.
   if(!dockedBars.length)return null
   const docked=dockedBars.map(bar=>renderBar(bar,visible.indexOf(bar)))
   const embedded=(side==='left'||side==='right')&&panelHosts[side]&&panelsVisible[side]
   const topBottom=side==='top'||side==='bottom'
   const scope=topBottom&&dockedBars.every(bar=>bar.dockScope!=='board')?'workspace':'board'
   const regionStyle=topBottom&&dockGeometry?{'--exo-custom-dock-left':`${scope==='workspace'?dockGeometry.centerLeft:dockGeometry.wideLeft}px`,'--exo-custom-dock-width':`${scope==='workspace'?dockGeometry.centerWidth:dockGeometry.wideWidth}px`}:undefined
   const region=<div key={side} style={regionStyle} data-exo-custom-dock-scope={topBottom?scope:undefined} className={`exo-custom-toolbar-dock-region exo-custom-toolbar-dock-region--${side}${embedded?' exo-custom-toolbar-dock-region--panel':''}`}
    data-exo-custom-toolbar-dock={side} data-docked-in-panel={embedded?'true':'false'}>
    {docked}
   </div>
   return embedded?createPortal(region,panelHosts[side]):region
  })}
  {visible.map((bar,index)=>bar.dock==='floating'||previewPos?.id===bar.id?renderBar(bar,index):null)}
  {hover?.side&&<div className={`exo-custom-toolbar-drop-indicator exo-custom-toolbar-drop-indicator--${hover.side}`}
   data-exo-custom-toolbar-hover={hover.side} aria-hidden="true">
   <span>+ {DOCK_LABELS[hover.side]}</span>
  </div>}
  {contextMenu&&createPortal(<div ref={contextMenuRef} className="exo-custom-toolbar-context-menu"
   role="menu" aria-label={`${contextMenu.name} toolbar options`}
   data-custom-toolbar-context-menu={contextMenu.id}
   style={{left:`min(calc(100vw - 210px), ${Math.max(4,contextMenu.x)}px)`,
    top:`min(calc(100vh - 226px), ${Math.max(4,contextMenu.y)}px)`}}
   onPointerDown={event=>event.stopPropagation()}>
   <strong>{contextMenu.name}</strong>
   {orientations.map(position=><button key={position} type="button" role="menuitem"
    onClick={()=>placeBar(contextMenu.id,position)}>
    {position==='floating'?'Undock · Float':`Embed · ${DOCK_LABELS[position]}`}
   </button>)}
   <button type="button" role="menuitemradio" aria-checked={(bars.find(bar=>bar.id===contextMenu.id)?.dockScope||'workspace')==='workspace'} onClick={()=>{saveBar(contextMenu.id,{dockScope:'workspace'});setContextMenu(null)}}>Dock center · 2D / 3D only</button>
   <button type="button" role="menuitemradio" aria-checked={bars.find(bar=>bar.id===contextMenu.id)?.dockScope==='board'} onClick={()=>{saveBar(contextMenu.id,{dockScope:'board'});setContextMenu(null)}}>Dock wide · Library to Object Browser</button>
   <button type="button" role="menuitem" className="exo-custom-toolbar-context-menu__remove"
    onClick={()=>placeBar(contextMenu.id,'hide')}>Remove from workspace</button>
  </div>,document.body)}
 </div>
}
