import React,{useEffect,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import {Grip,Link2,Unlink2} from 'lucide-react'
import './ExoUniversalPanelHandles20261028.css'

/* All workspace modes use the same DOM-owned panels. Moving DOM nodes into a
 * portal would break React ownership and native canvases. Instead, the handle
 * switches the existing panel's presentation between grid and floating, while
 * the original React subtree and action state remain intact. */
const PARTS=[
 ['library','Library','.main-layout>.asset-browser','.exo-library-edge-toggle'],
 ['left','Left tools','.main-layout>.tool-rail','.exo-left-tools-edge-toggle'],
 ['right','Right tools','.main-layout>.clo-inspector>.clo-right-tool-palette','.exo-right-tools-edge-toggle'],
 ['inspector','Object Browser + Property Editor','.main-layout>.clo-inspector>.clo-inspector-content','.exo-reopen-inspector-arrow'],
]
const KEY='exo.universal-panel-floating.v8'
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch{return {}}}
const DEFAULT_ORDER=['library','left','viewer','inspector']
const validOrder=value=>Array.isArray(value)&&value.length===4&&new Set(value).size===4&&DEFAULT_ORDER.every(id=>value.includes(id))
// Recover a known-good original workspace after the previous experimental
// reordering caused the inspector to overlap other panels. The next user drag
// is the first new history entry; no stale geometry is restored at startup.
const initial=()=>{
 const saved=read()
 // Inspector visibility is App-owned, never a second independently persisted
 // flag. Old saved universal `inspector:true` could keep the entire parent
 // at 24px even after opening the 2D toolbar on the App collapse arrow.
 return {positions:{},inspectorSplit:false,placements:{right:'right',left:'left'},horizontalRows:saved.layoutVersion===8&&saved.horizontalRows===1?1:2,ribbonScope:saved.ribbonScope==='workspace'?'workspace':'board',sideOrder:[...DEFAULT_ORDER],sidePanels:{library:saved.layoutVersion===8&&saved.sidePanels?.library==='right'?'right':'left',inspector:saved.layoutVersion===8&&saved.sidePanels?.inspector==='left'?'left':'right'},sideCollapsed:{library:Boolean(saved.layoutVersion===8&&saved.sideCollapsed?.library),inspector:false}}
}
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n))
// The drag preview and the committed ribbon use the SAME measured bounds.
// Wide reaches from the Library side to the Object Browser/Property Editor
// edge; Center is limited to the actual visible 2D/3D viewer panes.
export function getExoUniversalHorizontalDockZones20261028(board,viewer,viewRects=[],library=null,inspector=null){
 if(!board||!viewer||board.width<180||viewer.width<80||viewer.height<90)return []
 const visible=viewRects.filter(rect=>rect&&rect.width>0&&rect.height>0)
 const centerLeft=visible.length?Math.min(...visible.map(rect=>rect.left)):viewer.left
 const centerRight=visible.length?Math.max(...visible.map(rect=>rect.right)):viewer.right
 const wideLeft=library?.width>0?Math.min(library.left,inspector?.left??library.left):board.left
 const wideRight=Math.max(board.right,inspector?.right||board.right)
 const width=(left,right)=>({left:Math.max(board.left,left),right:Math.min(board.right,right)})
 const wide=width(wideLeft,wideRight),center=width(centerLeft,centerRight)
 const band=Math.max(26,Math.min(44,Math.floor(board.height*.08)))
 // Separate vertical hit bands make both choices independently targetable:
 // TOP: Wide above Center. BOTTOM: Center above Wide.
 return [
  {edge:'top',scope:'board',label:'Wide Dock',box:{...wide,top:board.top,bottom:board.top+band}},
  {edge:'top',scope:'workspace',label:'Center Dock',box:{...center,top:board.top+band,bottom:board.top+2*band}},
  {edge:'bottom',scope:'workspace',label:'Center Dock',box:{...center,top:board.bottom-2*band,bottom:board.bottom-band}},
  {edge:'bottom',scope:'board',label:'Wide Dock',box:{...wide,top:board.bottom-band,bottom:board.bottom}},
 ]
}
export default function ExoUniversalPanelHandles20261028({inspectorVisible,libraryVisible,leftVisible=true,rightVisible=true,onInspectorVisibleChange=()=>{}}){
 const [state,setState]=useState(initial),[tick,setTick]=useState(0),[hover,setHover]=useState(null)
 const active=useRef(null),handles=useRef({}),workspace=useRef(null)
 const history=useRef([])
 const commit=updater=>setState(previous=>{const next=typeof updater==='function'?updater(previous):updater;history.current.push(previous);if(history.current.length>30)history.current.shift();return next})
 const resetWorkspace=()=>{history.current.push(state);setState({...initial(),sidePanels:{library:'left',inspector:'right'},sideCollapsed:{library:false,inspector:false}});setHover(null)}
 const undoWorkspace=()=>{const previous=history.current.pop();if(previous){setState(previous);setHover(null)}}
 const [menu,setMenu]=useState(null)
 const root=workspace.current||document.querySelector('.main-layout')
 const openLayoutMenu=(id,event)=>{
  event.preventDefault();event.stopPropagation()
  setMenu({id,x:Math.max(4,Math.min(event.clientX,window.innerWidth-188)),y:Math.max(4,Math.min(event.clientY,window.innerHeight-225))})
 }
 // Register one capture-phase listener across the workspace. Individual
 // tool buttons, draggable panels and docked widgets may stop propagation;
 // their right clicks must still expose the common layout menu.
 useEffect(()=>{
  if(!root)return
  const onRightClick=event=>{
   const target=event.target instanceof Element?event.target:null
   if(!target||target.closest('.exo-universal-context-menu'))return
   const selectors=[
    ['right','.clo-right-tool-palette'],['left','.tool-rail'],
    ['library','.asset-browser'],['browser','.clo-object-browser'],
    ['property','.clo-property-panel'],
   ]
   const found=selectors.find(([,selector])=>target.closest(selector))
   const widget=target.closest('.clo-floating-tool,.exo-grade-bottom-widget,.exo-bottom-dock-widget')
   if(!found&&!widget)return
   // Keep tool-specific editing context menus on the controls themselves.
   // Header, whitespace and toolbar icons expose layout controls.
   if(widget&&!found){openLayoutMenu('widget',event);return}
   openLayoutMenu(found[0],event)
  }
  root.addEventListener('contextmenu',onRightClick,true)
  return()=>root.removeEventListener('contextmenu',onRightClick,true)
 },[root])
 useEffect(()=>{const shortcut=e=>{if((e.metaKey||e.ctrlKey)&&!e.shiftKey&&e.key.toLowerCase()==='z'&&history.current.length&&!e.target.closest('input,textarea,[contenteditable="true"]')&&document.activeElement?.closest('.exo-universal-panel-handle')){e.preventDefault();e.stopPropagation();undoWorkspace()}};window.addEventListener('keydown',shortcut,true);return()=>window.removeEventListener('keydown',shortcut,true)})
 useEffect(()=>{try{localStorage.setItem(KEY,JSON.stringify({layoutVersion:8,horizontalRows:state.horizontalRows,ribbonScope:state.ribbonScope,sidePanels:state.sidePanels,sideCollapsed:state.sideCollapsed}))}catch{}},[state.horizontalRows,state.ribbonScope,state.sidePanels,state.sideCollapsed])
 useEffect(()=>{const node=document.querySelector('.main-layout');workspace.current=node;if(!node)return
  const observer=new MutationObserver(()=>setTick(n=>n+1));observer.observe(node,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
  return()=>observer.disconnect()
 },[])
 const browser=root?.querySelector('.clo-object-browser')
 const property=root?.querySelector('.clo-property-panel')
 const panel=(id)=>id==='browser'?browser:id==='property'?property:root?.querySelector(PARTS.find(p=>p[0]===id)?.[2]||'__missing__')
 const displayed=(id)=>id==='library'?libraryVisible&&!state.sideCollapsed?.library:id==='left'?leftVisible:id==='inspector'||id==='browser'||id==='property'?inspectorVisible:rightVisible
 const ids=[...PARTS.map(p=>p[0]),...(state.inspectorSplit?['browser','property']:[])]
 const order=validOrder(state.sideOrder)?state.sideOrder:DEFAULT_ORDER
 const libraryOnRight=state.sidePanels?.library==='right'
 const inspectorOnLeft=state.sidePanels?.inspector==='left'
 const libraryCollapsed=Boolean(state.sideCollapsed?.library)
 // A single source of truth: the main Object Browser arrow and this panel's
 // context menu must update the same App state, never shadow each other.
 const inspectorCollapsed=false
 useEffect(()=>{if(!root)return;root.dataset.exoRibbonScope=state.ribbonScope;root.dataset.exoLibrarySide=libraryOnRight?'right':'left';root.dataset.exoInspectorSide=inspectorOnLeft?'left':'right';root.dataset.exoLibraryCollapsed=libraryCollapsed?'true':'false';root.dataset.exoInspectorCollapsed=inspectorCollapsed?'true':'false';return()=>{delete root.dataset.exoLibrarySide;delete root.dataset.exoInspectorSide;delete root.dataset.exoLibraryCollapsed;delete root.dataset.exoInspectorCollapsed}},[root,libraryOnRight,inspectorOnLeft,libraryCollapsed,inspectorCollapsed,state.ribbonScope])
 useEffect(()=>{if(!root)return;root.dataset.exoSideOrder=order.join('-');for(const [name,key] of [['library','--exo-library-slot'],['left','--exo-left-slot'],['viewer','--exo-viewer-slot'],['inspector','--exo-inspector-slot']])root.style.setProperty(key,String(order.indexOf(name)+2));const widthFor={library:'minmax(0,var(--effective-library-width,232px))',left:'minmax(0,var(--exo-tool-width,72px))',viewer:'minmax(0,1fr)',inspector:'minmax(0,var(--effective-inspector-width,392px))'};for(let i=0;i<4;i++)root.style.setProperty('--exo-slot-'+(i+2),widthFor[order[i]]);return()=>{delete root.dataset.exoSideOrder;for(const key of ['--exo-library-slot','--exo-left-slot','--exo-viewer-slot','--exo-inspector-slot','--exo-slot-2','--exo-slot-3','--exo-slot-4','--exo-slot-5'])root.style.removeProperty(key)}},[root,state.sideOrder])
 // Scope owns these layout declarations; legacy stylesheet ordering must not
 // turn a viewer-only dock back into a full-board row or a scrolling rail.
 useEffect(()=>{
  if(!root)return
  const changes=[]
  const set=(node,key,value)=>{if(!node)return;changes.push([node,key,node.style.getPropertyValue(key),node.style.getPropertyPriority(key)]);node.style.setProperty(key,value,'important')}
  if(['top','bottom'].includes(state.placements.right)){set(root.querySelector(':scope>.exo-right-independent-tools-arrow'),'top','90px');set(root.querySelector(':scope>.exo-right-independent-tools-arrow'),'right','0px')}
  if(state.ribbonScope==='workspace'){
   for(const node of root.querySelectorAll(':scope>.asset-browser,:scope>.clo-inspector'))set(node,'grid-row','1 / -1')
  }
  if(['top','bottom'].includes(state.placements.left)){
   const rail=root.querySelector(':scope>.tool-rail')
   set(rail,'flex-flow','row wrap');set(rail,'justify-content','flex-start');set(rail,'align-content','flex-start');set(rail,'overflow','visible')
  }
  return()=>{for(const [node,key,value,priority]of changes){if(value)node.style.setProperty(key,value,priority);else node.style.removeProperty(key)}}
 },[root,tick,state.ribbonScope,state.placements.left,state.placements.right])
 // Never reposition the canvas-bearing grid, sidebars, or inspector with
 // fixed positioning. CSS-owned dock tracks preserve React and WebGL layout.
 // Only the already-independent tool palette may move into the top/bottom bar.
 useEffect(()=>{
  if(!root)return
  const node=panel('right')
  if(!node)return
  const placement=state.placements.right||'right'
  const horizontal=placement==='top'||placement==='bottom'
  const viewport=root.querySelector('.workspaces')
  const previous=viewport?.style.getPropertyValue('--exo-universal-dock-height')||''
  if(viewport)viewport.style.setProperty('--exo-universal-dock-height',horizontal?(state.horizontalRows===1?'31px':'56px'):'0px')
  node.dataset.exoUniversalPlacement=placement
  root.dataset.exoRightToolsPlacement=placement
  node.dataset.exoHorizontalRows=String(state.horizontalRows===1?1:2)
  const sync=()=>{
   const height=state.horizontalRows===1?31:56
   const bounds=viewport?.getBoundingClientRect();if(!bounds)return
   // A full-width dock spans the entire board, including side panels, but
   // sits in the independent top/bottom grid row so it cannot cover headers.
   const board=root.getBoundingClientRect()
   const views=[...viewport.querySelectorAll('.cc-viewport-2d,.cc-viewport-3d')].map(el=>el.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0)
   const centerLeft=views.length?Math.min(...views.map(r=>r.left)):bounds.left
   const centerRight=views.length?Math.max(...views.map(r=>r.right)):bounds.right
   const edgeTabs=root.querySelector('.clo-edge-tabs')?.getBoundingClientRect()
   const library=root.querySelector('.asset-browser')?.getBoundingClientRect()
   const left=state.ribbonScope==='workspace'?centerLeft:(library?.width>0?library.left:Math.max(board.left,edgeTabs?.right||board.left))
   const right=state.ribbonScope==='workspace'?centerRight:board.right
   root.style.setProperty('--exo-ribbon-left',`${left}px`)
   root.style.setProperty('--exo-ribbon-width',`${Math.max(120,right-left)}px`)
   root.style.setProperty('--exo-ribbon-top',`${board.top}px`)
   root.style.setProperty('--exo-ribbon-bottom-top',`${Math.max(board.top,bounds.bottom)}px`)
  }
  const observer=new ResizeObserver(sync);observer.observe(root);if(viewport)observer.observe(viewport);const inspector=root.querySelector('.clo-inspector');if(inspector)observer.observe(inspector);sync();window.addEventListener('resize',sync)
  return()=>{observer.disconnect();window.removeEventListener('resize',sync);delete node.dataset.exoUniversalPlacement;delete node.dataset.exoHorizontalRows;delete root.dataset.exoRightToolsPlacement;for(const key of ['--exo-ribbon-left','--exo-ribbon-width','--exo-ribbon-top','--exo-ribbon-bottom-top'])root.style.removeProperty(key);if(viewport){if(previous)viewport.style.setProperty('--exo-universal-dock-height',previous);else viewport.style.removeProperty('--exo-universal-dock-height')}}
 },[root,tick,state.placements.right,state.horizontalRows,state.ribbonScope])
 useEffect(()=>{
  if(!root)return
  const rail=panel('left'),viewport=root.querySelector('.workspaces')
  if(!rail||!viewport)return
  const horizontal=['top','bottom'].includes(state.placements.left)
  rail.dataset.exoUniversalPlacement=state.placements.left||'left'
  root.dataset.exoLeftToolsPlacement=state.placements.left||'left'
  const sync=()=>{
   if(!horizontal)return
   const bounds=viewport.getBoundingClientRect(),board=root.getBoundingClientRect()
   const views=[...viewport.querySelectorAll('.cc-viewport-2d,.cc-viewport-3d')].map(el=>el.getBoundingClientRect()).filter(r=>r.width>0&&r.height>0)
   const centerLeft=views.length?Math.min(...views.map(r=>r.left)):bounds.left
   const centerRight=views.length?Math.max(...views.map(r=>r.right)):bounds.right
   const edgeTabs=root.querySelector('.clo-edge-tabs')?.getBoundingClientRect()
   const library=root.querySelector('.asset-browser')?.getBoundingClientRect()
   const left=state.ribbonScope==='workspace'?centerLeft:(library?.width>0?library.left:Math.max(board.left,edgeTabs?.right||board.left))
   const right=state.ribbonScope==='workspace'?centerRight:board.right
   root.style.setProperty('--exo-left-ribbon-left',`${left}px`)
   root.style.setProperty('--exo-left-ribbon-width',`${Math.max(120,right-left)}px`)
   root.style.setProperty('--exo-left-ribbon-top',`${board.top}px`)
   root.style.setProperty('--exo-left-ribbon-bottom-top',`${Math.max(board.top,bounds.bottom)}px`)
  }
  const observer=new ResizeObserver(sync);observer.observe(root);observer.observe(viewport);sync();window.addEventListener('resize',sync)
  return()=>{observer.disconnect();window.removeEventListener('resize',sync);delete rail.dataset.exoUniversalPlacement;delete root.dataset.exoLeftToolsPlacement;for(const key of ['--exo-left-ribbon-left','--exo-left-ribbon-width','--exo-left-ribbon-top','--exo-left-ribbon-bottom-top'])root.style.removeProperty(key)}
 },[root,tick,state.placements.left,state.ribbonScope])
 const start=(event,id)=>{
  if(event.button!==0)return
  const node=panel(id);if(!node)return
  const rect=node.getBoundingClientRect()
  active.current={id,x:event.clientX-rect.left,y:event.clientY-rect.top,width:rect.width,height:rect.height,moved:false,originX:event.clientX,originY:event.clientY}
  event.currentTarget.setPointerCapture(event.pointerId);event.preventDefault();event.stopPropagation()
 }
 const horizontalZones=()=>{
  if(!root)return []
  const board=root.getBoundingClientRect()
  const viewport=root.querySelector('.workspaces')
  if(!viewport)return []
  const viewer=viewport.getBoundingClientRect()
  const viewRects=[...viewport.querySelectorAll('.cc-viewport-2d,.cc-viewport-3d')]
   .filter(node=>{const style=getComputedStyle(node);return style.display!=='none'&&style.visibility!=='hidden'})
   .map(node=>node.getBoundingClientRect())
  return getExoUniversalHorizontalDockZones20261028(board,viewer,viewRects,
   root.querySelector('.asset-browser')?.getBoundingClientRect(),
   root.querySelector('.clo-inspector')?.getBoundingClientRect())
 }
 const zoneAt=(zones,x,y)=>zones.find(zone=>x>=zone.box.left&&x<=zone.box.right&&y>=zone.box.top&&y<=zone.box.bottom)
 const findZone=(x,y,id)=>{
  if(!root)return null
  const rects={library:root.querySelector('.asset-browser')?.getBoundingClientRect(),left:root.querySelector('.tool-rail')?.getBoundingClientRect(),viewer:root.querySelector('.workspaces')?.getBoundingClientRect(),inspector:root.querySelector('.clo-inspector')?.getBoundingClientRect()}
  const viewer=rects.viewer
  if(!viewer||viewer.width<80||viewer.height<90)return null
  const candidates=[]
  // Only toolbars support horizontal placement. Always make scope explicit:
  // an edge-only match silently reused an unrelated old width preference.
  if(id==='left'||id==='right'){
   const horizontal=zoneAt(horizontalZones(),x,y)
   if(horizontal)return {...horizontal,x:horizontal.edge}
  }
  // The target is the actual gap between adjacent panels; not a fake full
  // screen region. The preview highlights exactly the destination column.
  for(let i=0;i<order.length;i++){
   const name=order[i],rect=rects[name]
   if(!rect||rect.width<18)continue
   const width=Math.min(45,rect.width*.38)
   candidates.push({x:'side',slot:i,box:{left:rect.left,right:rect.left+width,top:rect.top,bottom:rect.bottom}})
  }
  const last=rects[order.at(-1)]
  if(last)candidates.push({x:'side',slot:order.length,box:{left:last.right-20,right:last.right+20,top:last.top,bottom:last.bottom}})
  return candidates.find(zone=>x>=zone.box.left&&x<=zone.box.right&&y>=zone.box.top&&y<=zone.box.bottom)||null
 }
 const move=event=>{
  const drag=active.current;if(!drag)return
  if(Math.hypot(event.clientX-drag.originX,event.clientY-drag.originY)<6&&!drag.moved)return
  drag.moved=true
  const zones=(drag.id==='left'||drag.id==='right')?horizontalZones():[]
  const near=zones.find(zone=>event.clientY>=zone.box.top&&event.clientY<=zone.box.bottom
   &&event.clientX>=root.getBoundingClientRect().left&&event.clientX<=root.getBoundingClientRect().right)
  const side=findZone(event.clientX,event.clientY,drag.id)
  setHover(near?{edge:near.edge,zones:zones.filter(zone=>zone.edge===near.edge),selected:side?.scope?side.scope:null}
   :side?{side}:null)
 }
 const finish=event=>{
  const drag=active.current;if(!drag)return
  active.current=null
  const zone=drag.moved&&event.type==='pointerup'?findZone(event.clientX,event.clientY,drag.id):null
  setHover(null)
  if(zone){
   const target=zone.x
   // Only supported and measurable placement changes commit. Core panels
   // always remain in the layout grid; unsupported horizontal placements
   // do not silently detach or hide the WebGL viewer.
   if(drag.id==='right'||drag.id==='left')commit(old=>({...old,
    placements:{...old.placements,[drag.id]:target==='top'||target==='bottom'?target:drag.id==='left'?'left':'right'},
    ...(zone.scope?{ribbonScope:zone.scope}:{})}))
   else if(target==='side'&&['library','left','inspector'].includes(drag.id)){commit(old=>{const sequence=[...old.sideOrder].filter(v=>v!==drag.id);const removedBefore=old.sideOrder.indexOf(drag.id)<zone.slot;const slot=Math.min(Math.max(0,zone.slot-(removedBefore?1:0)),sequence.length);sequence.splice(slot,0,drag.id);return{...old,sideOrder:sequence}})}
  }
  event.stopPropagation()
 }
 const reset=id=>{commit(old=>({...old,positions:{...old.positions,[id]:undefined},placements:{...old.placements,[id]:id==='left'?'left':'right'},sidePanels:{...old.sidePanels,...(id==='library'?{library:'left'}:id==='inspector'||id==='browser'||id==='property'?{inspector:'right'}:{})},sideCollapsed:{...old.sideCollapsed,...(id==='library'?{library:false}:id==='inspector'||id==='browser'||id==='property'?{inspector:false}:{})},...(id==='library'||id==='inspector'||id==='left'?{sideOrder:[...DEFAULT_ORDER]}:{})}));if(['inspector','browser','property'].includes(id))onInspectorVisibleChange(true)}
 const setPanelSide=(id,side)=>{commit(old=>({...old,sidePanels:{...old.sidePanels,[id]:side},sideCollapsed:{...old.sideCollapsed,[id]:false}}));if(id==='inspector')onInspectorVisibleChange(true)}
 const setPanelCollapsed=(id,collapsed)=>{if(id==='inspector'){onInspectorVisibleChange(!collapsed);return}commit(old=>({...old,sideCollapsed:{...old.sideCollapsed,[id]:collapsed}}))}
 const toggleSplit=()=>setState(old=>({...old,inspectorSplit:!old.inspectorSplit,positions:{...old.positions,browser:undefined,property:undefined,inspector:undefined}}))
 if(!root)return null
 return createPortal(<div className="exo-universal-panel-handles" aria-label="Movable workspace panel handles">
  {(libraryCollapsed||inspectorCollapsed)&&<div className="exo-universal-panel-restore-rail" data-side={inspectorOnLeft?'left':'right'} aria-label="Restore collapsed panels">
    {libraryCollapsed&&<button type="button" aria-label="Expand Library panel" title="Expand Library" onClick={()=>setPanelCollapsed('library',false)}>L</button>}
    {inspectorCollapsed&&<button type="button" aria-label="Expand Object Browser and Property Editor panel" title="Expand Object Browser and Property Editor" onClick={()=>setPanelCollapsed('inspector',false)}>O</button>}
   </div>}
  {menu&&<div className="exo-universal-context-menu" role="menu" style={{left:menu.x,top:menu.y}} onPointerDown={e=>e.stopPropagation()}>
    {['library','inspector','browser','property'].includes(menu.id)&&<><button type="button" role="menuitem" onClick={()=>{setPanelSide(menu.id==='library'?'library':'inspector','left');setMenu(null)}}>Dock on left</button><button type="button" role="menuitem" onClick={()=>{setPanelSide(menu.id==='library'?'library':'inspector','right');setMenu(null)}}>Dock on right</button><button type="button" role="menuitem" onClick={()=>{setPanelCollapsed(menu.id==='library'?'library':'inspector',true);setMenu(null)}}>Collapse panel</button></>}
    {['right','left','widget'].includes(menu.id)&&<><button type="button" role="menuitem" onClick={()=>{commit(old=>({...old,placements:{...old.placements,[menu.id]: 'top'}}));setMenu(null)}}>Dock toolbar at top</button><button type="button" role="menuitem" onClick={()=>{commit(old=>({...old,placements:{...old.placements,[menu.id]: 'bottom'}}));setMenu(null)}}>Dock toolbar at bottom</button><button type="button" role="menuitemradio" aria-checked={state.ribbonScope!=='workspace'} onClick={()=>{commit(old=>({...old,ribbonScope:'board'}));setMenu(null)}}>Toolbar across full board</button><button type="button" role="menuitemradio" aria-checked={state.ribbonScope==='workspace'} onClick={()=>{commit(old=>({...old,ribbonScope:'workspace'}));setMenu(null)}}>Toolbar over 2D / 3D windows only</button></>}
    {['right','left','widget'].includes(menu.id)&&<><button type="button" role="menuitemradio" aria-checked={state.horizontalRows===1} onClick={()=>{commit(old=>({...old,horizontalRows:1}));setMenu(null)}}>Single horizontal row {state.horizontalRows===1?'✓':''}</button><button type="button" role="menuitemradio" aria-checked={state.horizontalRows!==1} onClick={()=>{commit(old=>({...old,horizontalRows:2}));setMenu(null)}}>Double-stacked rows {state.horizontalRows!==1?'✓':''}</button></>}
    <button type="button" role="menuitem" onClick={()=>{reset(menu.id);setMenu(null)}}>Reset this panel</button>
    <button type="button" role="menuitem" onClick={()=>{resetWorkspace();setMenu(null)}}>Reset workspace layout</button>
    <button type="button" role="menuitem" disabled={!history.current.length} onClick={()=>{undoWorkspace();setMenu(null)}}>Undo layout change</button>
    <button type="button" role="menuitem" onClick={()=>setMenu(null)}>Cancel</button>
   </div>}
  {hover?.zones?.map(zone=><div key={zone.edge+zone.scope}
    className={`exo-universal-dock-preview exo-universal-dock-preview--choice ${hover.selected===zone.scope?'exo-universal-dock-preview--selected':''}`}
    data-exo-dock-preview-edge={zone.edge} data-exo-dock-preview-scope={zone.scope}
    style={{left:zone.box.left,top:zone.box.top,width:zone.box.right-zone.box.left,height:zone.box.bottom-zone.box.top}}
    aria-label={zone.edge+' '+zone.label}>{zone.label}</div>)}
  {hover?.side&&<div className="exo-universal-dock-preview" style={{left:hover.side.box.left,top:hover.side.box.top,width:hover.side.box.right-hover.side.box.left,height:hover.side.box.bottom-hover.side.box.top}} aria-label={`${hover.side.x} dock zone`}>Dock {hover.side.x}</div>}
  {ids.filter(id=>!(state.inspectorSplit&&id==='inspector')).map(id=>{
   const node=panel(id);if(!node||!displayed(id))return null
   const rect=node.getBoundingClientRect(),pos=state.positions[id];const rightSide=id==='right'||id==='inspector'||id==='browser'||id==='property';const topRail=['right','left'].includes(id)&&['top','bottom'].includes(state.placements[id])
   // Match the left 3D rail: the handle is a direct child of the toolbar,
   // rather than inserted inside a nested tool group or inspector header.
   // The right palette has no dedicated header, so its own flex container is
   // the correct mount. It must remain independent of the Object Browser.
   const header=id==='right'?node:id==='left'?node.querySelector('.exo-universal-tools-heading')||node:node.querySelector('.clo-panel-header,.clo-library-top,header')||node
   return createPortal(<div className="exo-universal-panel-handle exo-universal-panel-handle--inset" data-panel-handle={id}>
    <button ref={el=>{handles.current[id]=el}} type="button" className="exo-universal-panel-handle__grip"
      aria-label={`Drag ${id==='browser'?'Object Browser':id==='property'?'Property Editor':PARTS.find(p=>p[0]===id)?.[1]} panel`}
      title="Drag to a supported dock · right-click for layout options"
      onPointerDown={event=>start(event,id)} onPointerMove={move} onPointerUp={finish} onPointerCancel={event=>{active.current=null;setHover(null);event.stopPropagation()}}
      onContextMenu={event=>openLayoutMenu(id,event)}><Grip size={11}/></button>
    {topRail&&<select aria-label={`${id==='left'?'3D':'2D'} toolbar width`} value={state.ribbonScope} onPointerDown={event=>event.stopPropagation()} onChange={event=>commit(old=>({...old,ribbonScope:event.target.value}))}><option value="workspace">Dock center</option><option value="board">Dock wide</option></select>}
    {['right','left'].includes(id)&&<button type="button" title={topRail?`Restore vertical ${id==='left'?'3D':'2D'} tools`:`Dock ${id==='left'?'3D':'2D'} tools horizontally above viewer`} aria-label={topRail?`Restore vertical ${id==='left'?'3D':'2D'} tools`:`Dock ${id==='left'?'3D':'2D'} tools horizontally above viewer`} onClick={()=>commit(old=>({...old,placements:{...old.placements,[id]:topRail?(id==='left'?'left':'right'):'top'}}))}>{topRail?'↕':'↔'}</button>}
    {(id==='inspector'||id==='browser')&&<button type="button" title={state.inspectorSplit?'Group Object Browser and Property Editor':'Separate Object Browser and Property Editor'}
      aria-label={state.inspectorSplit?'Group Object Browser and Property Editor':'Separate Object Browser and Property Editor'}
      onClick={toggleSplit}>{state.inspectorSplit?<Link2 size={12}/>:<Unlink2 size={12}/>}</button>}
   </div>,header,id)
  })}
 </div>,document.body)
}
