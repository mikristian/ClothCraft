import React,{useEffect,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import {GripVertical,Minus,Maximize2,Table2,X,PanelBottom,PanelTop} from 'lucide-react'
import OptitexGradeTable20261027 from './OptitexGradeTable20261027.jsx'
import {isExoBottomDockHit20261027,setExoBottomDockHover20261027,requestExoBottomDockInsert20261028} from '../core/exoBottomDockGeometry20261027.js'
import './OptitexGradeBottomDock20261027.css'

const TYPES={
 values:{label:'Grading Table',width:520,height:345},
 compare:{label:'Compare Length',width:600,height:355},
}
// A newly opened widget starts FLOATING. Only an explicit user drop or Dock
// button inserts it in the Optitex-style bottom region. V3 ignores previous
// automatic docking preferences, but remembers subsequent user choices.
const STORAGE_PREFIX='exo.grade.bottom-widget.v3.'
const clamp=(value,min,max)=>Math.min(max,Math.max(min,value))
const viewportPosition=(position,kind,minimized=false)=>({
 x:clamp(position.x,8,Math.max(8,window.innerWidth-TYPES[kind].width-8)),
 y:clamp(position.y,48,Math.max(48,window.innerHeight-(minimized?36:TYPES[kind].height)-8)),
})
const initialState=kind=>{
 const fallback={x:80,y:180,docked:false,minimized:false}
 if(typeof window==='undefined')return fallback
 const {width,height}=TYPES[kind]
 const start={x:kind==='values'?Math.max(8,Math.round(innerWidth*.36)-width/2):
  Math.max(8,innerWidth-width-15),y:Math.max(48,innerHeight-height-20),docked:false,minimized:false}
 try{
  const stored=JSON.parse(localStorage.getItem(STORAGE_PREFIX+kind+'.v1'))
  if(stored&&typeof stored==='object')return {
   ...start,...(Number.isFinite(stored.x)&&Number.isFinite(stored.y)?viewportPosition(stored,kind):{}),
   docked:stored.docked===true,dockEdge:['bottom','inner-bottom','top'].includes(stored.dockEdge)?stored.dockEdge:'bottom',minimized:stored.minimized===true,
  }
 }catch{}
 return start
}
const persist=(kind,value)=>{
 try{localStorage.setItem(STORAGE_PREFIX+kind+'.v1',JSON.stringify(value))}catch{}
}

/** Each independent palette keeps its own viewport position, dock state and minimization. */
function GradeWidget({kind,onClose,tableProps,zIndex,onFocus,dockHost,innerDockHost,topDockHost,onDockStateChange,onEmbedToolbar}){
 const {label,width,height}=TYPES[kind]
  const chartPalette=tableProps?.chartThemes?.[kind]
  const chartStyle=chartPalette?{
    '--exo-measure-paper':chartPalette.paper,'--exo-measure-header':chartPalette.header,
    '--exo-measure-stripe':chartPalette.stripe,'--exo-measure-line':chartPalette.line,
    '--exo-measure-ink':chartPalette.ink,'--exo-measure-muted':chartPalette.muted,
    '--exo-measure-selected':chartPalette.selected,'--exo-measure-field':chartPalette.field,
  }:{}
 const [state,setState]=useState(()=>initialState(kind))
 const [dockHeight,setDockHeight]=useState(230)
 const [overDock,setOverDock]=useState(false)
 const drag=useRef(null),stateRef=useRef(state)
 stateRef.current=state
 const targetHost=state.dockEdge==='top'?topDockHost:state.dockEdge==='inner-bottom'?innerDockHost:dockHost
 const docked=state.docked&&Boolean(targetHost)
 useEffect(()=>{
  if(!docked||!targetHost)return
  const measure=()=>setDockHeight(targetHost.getBoundingClientRect().height)
  const observer=new ResizeObserver(measure)
  observer.observe(targetHost);measure()
  return ()=>observer.disconnect()
 },[docked,targetHost])
 useEffect(()=>{
  if(!docked||!targetHost||state.dockEdge==='top'||dockHeight<=120)return
  const frame=requestAnimationFrame(()=>{
   const widget=targetHost.querySelector('[data-exo-grade-bottom-widget="'+kind+'"]')
   const scroll=widget?.querySelector('.optitex-table-scroll')
   const last=scroll?.querySelector('tbody tr:last-child')
   if(!scroll||!last)return
   const clippedPx=last.getBoundingClientRect().bottom-scroll.getBoundingClientRect().bottom
   const current=targetHost.getBoundingClientRect().height
   if(clippedPx>2&&current<595)
     targetHost.dispatchEvent(new CustomEvent('exo-dock-request-height',{
       detail:{height:Math.min(600,Math.ceil(current+clippedPx+8))},
     }))
  })
  return ()=>cancelAnimationFrame(frame)
 },[docked,targetHost,state.dockEdge,dockHeight,kind,tableProps?.ruleSet,tableProps?.selectedSize])
 const update=patch=>{
  const previous=stateRef.current
  const next={...previous,...(typeof patch==='function'?patch(previous):patch)}
  stateRef.current=next
  persist(kind,next)
  if(next.docked!==previous.docked)onDockStateChange?.(kind,next.docked)
  setState(next)
 }
 useEffect(()=>{
  const resize=()=>setState(previous=>{
   const position=viewportPosition(previous,kind,previous.minimized)
   const next={...previous,...position};persist(kind,next);return next
  })
  window.addEventListener('resize',resize)
  return ()=>window.removeEventListener('resize',resize)
 },[kind])
 const hostAt=(x,y)=>{
  for(const host of [topDockHost,innerDockHost,dockHost]){
   if(!host)continue
   const root=host.closest('.cc-embedded-root,.main-layout')
   if(isExoBottomDockHit20261027(root?.getBoundingClientRect(),host.getBoundingClientRect(),x,y,host.dataset.exoDockEdge))
    return host
  }
  return null
 }
 const showHover=(x,y)=>{
  const selected=hostAt(x,y)
  for(const host of [topDockHost,innerDockHost,dockHost])if(host)
   setExoBottomDockHover20261027(host,host===selected,label,x,kind)
  setOverDock(Boolean(selected))
 }
 const clearHover=()=>{for(const host of [topDockHost,innerDockHost,dockHost])setExoBottomDockHover20261027(host,false);setOverDock(false)}
 const commitDock=(host,x)=>{
  if(!host)return
  requestExoBottomDockInsert20261028(host,kind,x)
  update({docked:true,dockEdge:host.dataset.exoDockEdge||'bottom',minimized:false})
  if(host.getBoundingClientRect().height<172)
   host.dispatchEvent(new CustomEvent('exo-dock-request-height',{detail:{height:276}}))
 }
 const pointerDown=event=>{
  if(event.button!==0||docked)return
  onFocus?.()
  drag.current={pointerId:event.pointerId,x:event.clientX,y:event.clientY,
   startX:stateRef.current.x,startY:stateRef.current.y}
  event.currentTarget.setPointerCapture(event.pointerId)
  event.preventDefault()
 }
 const pointerMove=event=>{
  const current=drag.current
  if(!current||current.pointerId!==event.pointerId)return
  const position=viewportPosition({x:current.startX+event.clientX-current.x,
   y:current.startY+event.clientY-current.y},kind,stateRef.current.minimized)
  setState(previous=>({...previous,...position}))
  showHover(event.clientX,event.clientY)
 }
 const pointerUp=event=>{
  if(drag.current?.pointerId!==event.pointerId)return
  const host=event.type==='pointerup'?hostAt(event.clientX,event.clientY):null
  drag.current=null;clearHover()
  if(host)commitDock(host,event.clientX)
  else persist(kind,stateRef.current)
  if(event.currentTarget.hasPointerCapture?.(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId)
 }
 // Dragging the dotted corner of an EMBEDDED widget must detach that real DOM
 // widget from the page, while continuing the pointer gesture after React
 // moves the portal into document.body. Window handlers survive that move.
 const pullOutFromGrip=event=>{
  if(!docked||event.button!==0)return
  onFocus?.()
  event.preventDefault();event.stopPropagation()
  const pointerId=event.pointerId,startX=event.clientX,startY=event.clientY
  let detached=false
  const move=next=>{
   if(next.pointerId!==pointerId)return
   if(!detached&&Math.hypot(next.clientX-startX,next.clientY-startY)<9)return
   if(!detached){detached=true;update({docked:false,minimized:false})}
   const position=viewportPosition({x:next.clientX-36,y:next.clientY-15},kind,false)
   update({...position,docked:false})
   showHover(next.clientX,next.clientY)
  }
  const finish=next=>{
   if(next.pointerId!==pointerId)return
   window.removeEventListener('pointermove',move,true)
   window.removeEventListener('pointerup',finish,true)
   window.removeEventListener('pointercancel',finish,true)
   const host=detached&&next.type==='pointerup'?hostAt(next.clientX,next.clientY):null
   clearHover()
   if(host)commitDock(host,next.clientX)
  }
  window.addEventListener('pointermove',move,true)
  window.addEventListener('pointerup',finish,true)
  window.addEventListener('pointercancel',finish,true)
 }
 const keyboardMove=event=>{
  if(docked||event.target!==event.currentTarget)return
  const direction={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key]
  if(!direction)return
  event.preventDefault();onFocus?.()
  const step=event.shiftKey?24:8
  const position=viewportPosition({x:stateRef.current.x+direction[0]*step,
   y:stateRef.current.y+direction[1]*step},kind,stateRef.current.minimized)
  update(position)
 }
 const actionButton=(action,title,Icon,callback,expanded)=>
  <button type="button" onPointerDown={event=>event.stopPropagation()}
   onClick={callback} title={title} aria-label={title}
   {...(expanded===undefined?{}:{'aria-expanded':expanded})} data-exo-grade-action={action}>
   <Icon size={14} aria-hidden="true"/>
  </button>
 // Never replace the actual six-size table with a tiny summary while nested.
 // The compact layout preserves the rows and measures within the host height.
 const condensed=docked&&dockHeight<240
 const micro=false
 const body=<aside className={'exo-grade-bottom-widget exo-grade-bottom-widget--reference'+(docked?' exo-grade-bottom-widget--docked':'')}
   data-exo-grade-bottom-widget={kind} data-minimized={state.minimized?'true':'false'}
   data-docked={docked?'true':'false'} data-dock-hover={overDock?'true':'false'}
   data-embedded-density={micro?'micro':condensed?'summary':'full'}
   aria-label={label+(docked?' docked panel':' floating panel')}
   data-exo-measure-theme={chartPalette?.id||'paper'}
   style={{...chartStyle,...(docked?{}:{left:state.x,top:state.y,width,height:state.minimized?36:height,zIndex})}}
   onPointerDownCapture={onFocus} onPointerDown={event=>event.stopPropagation()}
   onPointerUp={event=>event.stopPropagation()}
   onClick={event=>event.stopPropagation()} onDoubleClick={event=>event.stopPropagation()}>
   <header className="exo-grade-bottom-widget__titlebar"
    onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp}
    onPointerCancel={pointerUp} onKeyDown={keyboardMove}
    tabIndex={docked?-1:0}
    aria-label={docked?label+' docked controls':'Move '+label+' panel, arrow keys to reposition'}>
    <span className="exo-grade-bottom-widget__corner-grip" data-exo-widget-grip="true"
      role="button" tabIndex={0} aria-label={'Drag '+label+' widget by dotted handle'}
      title={docked?'Drag to reposition in another dock':'Drag widget to the inside, full-workspace or top dock'}
      onPointerDown={pullOutFromGrip}
      onKeyDown={event=>{if(docked&&(event.key==='Enter'||event.key===' ')){
       event.preventDefault();update({docked:false,minimized:false})
      }}}><GripVertical size={16} aria-hidden="true"/></span><Table2 size={14} aria-hidden="true"/>
    <strong>{label}</strong>
    <small>{docked?'Drag dots to reposition':overDock?'Release to embed':'Drag to inside or full-width dock'}</small>
    {actionButton('embed-toolbar','Embed Grading Toolbar in '+label,PanelTop,()=>{
      // A previously minimized worksheet has no toolbar slot. Always restore
      // the physical host BEFORE requesting a portal into that worksheet.
      if(stateRef.current.minimized)update({minimized:false})
      onEmbedToolbar?.(kind)
    })}
    <select className="exo-grade-widget-placement" aria-label={label+' placement'}
     value={docked?(state.dockEdge||'bottom'):'floating'} onPointerDown={e=>e.stopPropagation()}
     onChange={e=>{const edge=e.target.value;if(edge==='floating')update({docked:false});else commitDock(edge==='top'?topDockHost:edge==='inner-bottom'?innerDockHost:dockHost,null)}}>
     <option value="floating">Floating</option><option value="top" disabled={!topDockHost}>Top</option>
     <option value="inner-bottom" disabled={!innerDockHost}>Inside board</option>
     <option value="bottom" disabled={!dockHost}>Below all panels</option>
    </select>
    {actionButton('dock',docked?'Undock '+label:'Dock '+label,docked?PanelTop:PanelBottom,
     ()=>{if(!docked)commitDock(dockHost||topDockHost,null);else update({docked:false,minimized:false});setOverDock(false)})}
    {actionButton('minimize',(state.minimized?'Expand ':'Minimize ')+label,
     state.minimized?Maximize2:Minus,()=>update(previous=>({minimized:!previous.minimized})),!state.minimized)}
    {actionButton('close','Close '+label,X,onClose)}
   </header>
   {!state.minimized&&<>
    <div className="exo-grade-bottom-widget__toolbar-slot" data-exo-grade-toolbar-slot="true"
      aria-label={`Embed grading toolbar above ${label}`} data-grade-toolbar-parent={kind}/>
    <div className="exo-grade-bottom-widget__content">
     <OptitexGradeTable20261027 {...tableProps} compact displayMode={kind}
       docked={docked}
       embeddedSummary={false} embeddedMicro={micro}
       onExpandEmbed={()=>targetHost?.dispatchEvent(new CustomEvent('exo-dock-request-height',{detail:{height:332}}))}/>
    </div>
   </>}
  </aside>
 return createPortal(body,docked?targetHost:document.body)
}

export default function OptitexGradeBottomDock20261027({openValues=false,openCompare=false,
 onCloseValues,onCloseCompare,tableProps,dockHost=null,innerDockHost=null,topDockHost=null,onDockStateChange,onEmbedToolbar}){
 const [front,setFront]=useState('compare')
 useEffect(()=>{
  if(!dockHost)return
  const update=()=>{
   const occupied=Boolean(dockHost.querySelector('.exo-grade-bottom-widget--docked,.clo-floating-tool--docked'))
   dockHost.dataset.exoGradeDockOccupied=String(occupied)
  }
  const observer=new MutationObserver(update)
  observer.observe(dockHost,{childList:true,subtree:true,attributes:true,attributeFilter:['data-docked']})
  update()
  return ()=>{observer.disconnect();delete dockHost.dataset.exoGradeDockOccupied}
 },[dockHost,openValues,openCompare])
 if(typeof document==='undefined'||(!openValues&&!openCompare))return null
 return <>
  {openValues&&<GradeWidget kind="values" onClose={onCloseValues} tableProps={tableProps}
   dockHost={dockHost} innerDockHost={innerDockHost} topDockHost={topDockHost} onDockStateChange={onDockStateChange} onEmbedToolbar={onEmbedToolbar}
   onFocus={()=>setFront('values')} zIndex={front==='values'?100086:100085}/>} 
  {openCompare&&<GradeWidget kind="compare" onClose={onCloseCompare} tableProps={tableProps}
   dockHost={dockHost} innerDockHost={innerDockHost} topDockHost={topDockHost} onDockStateChange={onDockStateChange} onEmbedToolbar={onEmbedToolbar}
   onFocus={()=>setFront('compare')} zIndex={front==='compare'?100086:100085}/>} 
 </>
}
