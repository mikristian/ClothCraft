import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import './ExoBottomDockSplitControls20261027.css'

const PANEL_SELECTOR='.exo-grade-bottom-widget--docked,.clo-floating-tool--docked'
const GAP=5
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value))
// Independent dock heights: a narrow 2D top command ribbon and an expandable
// six-size bottom worksheet. Compact views never require internal scrolling.
const ORDER_KEY='exo.2d.bottom-dock-order.v1'
export const EXO_BOTTOM_DOCK_MIN_HEIGHT_20261027=68
const identity=(node,index)=>node?.getAttribute('data-exo-grade-bottom-widget')||
 node?.getAttribute('data-clo-floating-widget')||`panel-${index}`
const initialWeights=(keys)=>keys.length===2&&keys.includes('values')&&keys.includes('compare')?
 keys.map(key=>key==='values'?35:65):keys.map(()=>100/Math.max(1,keys.length))

/** The resizable tracks live in the actual 2D page. Multiple portals may add
 * widgets to the same host; we never move/reparent their React content. */
export default function ExoBottomDockSplitControls20261027({host,edge='bottom'}){
 const HEIGHT_KEY=`exo.2d.${edge}-dock-height.${edge==='top'?'v9':'v6'}`
 const ORDER_KEY_SCOPED=`${ORDER_KEY}.${edge}`
 const DEFAULT_HEIGHT=edge==='top'?36:edge==='inner-bottom'?242:276
 const MIN_HEIGHT=edge==='top'?36:EXO_BOTTOM_DOCK_MIN_HEIGHT_20261027
 useEffect(()=>{
  if(!host)return
  host.dataset.exoDockEdge=edge
  host.setAttribute('aria-label',`Embedded 2D ${edge} tool workspace`)
 },[host,edge])
 const [keys,setKeys]=useState([])
 const [weights,setWeights]=useState([])
 const [hostSize,setHostSize]=useState([0,0])
 const [preview,setPreview]=useState(null)
 const previewRef=useRef(preview)
 previewRef.current=preview
 const [preferredOrder,setPreferredOrder]=useState(()=>{
  try{const saved=JSON.parse(localStorage.getItem(ORDER_KEY_SCOPED));return Array.isArray(saved)?saved.filter(v=>typeof v==='string'):[]}catch{return []}
 })
 const orderRef=useRef(preferredOrder)
 orderRef.current=preferredOrder
 const drag=useRef(null)
 const verticalDrag=useRef(null)
 const [dockHeight,setDockHeight]=useState(()=>{
  try{
   const value=Number(localStorage.getItem(HEIGHT_KEY))
   return Number.isFinite(value)&&value>=MIN_HEIGHT?value:DEFAULT_HEIGHT
  }catch{return DEFAULT_HEIGHT}
 })
 useEffect(()=>{
  if(!host)return
  const expand=event=>{
   const height=Number(event.detail?.height)
   if(!Number.isFinite(height))return
   const next=clamp(height,MIN_HEIGHT,600)
   setDockHeight(next)
   try{localStorage.setItem(HEIGHT_KEY,String(next))}catch{}
  }
  host.addEventListener('exo-dock-request-height',expand)
  return ()=>host.removeEventListener('exo-dock-request-height',expand)
 },[host,HEIGHT_KEY])
 const current=useRef({keys,weights,hostSize})
 current.current={keys,weights,hostSize}
 const configKey=keys.join('|')
 const storageKey=`exo.2d.${edge}-split.${configKey}.v2`
 const panels=useCallback(()=>host?Array.from(host.children).filter(node=>node.matches?.(PANEL_SELECTOR)):[],[host])
 useEffect(()=>{
  if(!host)return
  const hover=event=>{
   const {active,id,index,label}=event.detail||{}
   setPreview(previous=>{
    if(!active||!id||!Number.isInteger(index))return null
    if(previous?.id===id&&previous.index===index)return previous
    return {id,index,label}
   })
  }
  host.addEventListener('exo-bottom-dock-hover',hover)
  return ()=>host.removeEventListener('exo-bottom-dock-hover',hover)
 },[host])
 useEffect(()=>{
  if(!host)return
  const root=host.closest('.cc-embedded-root,.main-layout')
  const room=Math.max(MIN_HEIGHT,Math.min(600,(root?.clientHeight||window.innerHeight)-180))
  const actualHeight=clamp(dockHeight,MIN_HEIGHT,room)
  host.style.setProperty('--exo-bottom-dock-height',`${actualHeight}px`)
  return ()=>host.style.removeProperty('--exo-bottom-dock-height')
 },[host,dockHeight])
 useEffect(()=>{
  if(!host)return
  const sync=()=>{
   const children=panels()
   const desired=orderRef.current
   const ids=children.map(identity).sort((a,b)=>{
    const left=desired.indexOf(a),right=desired.indexOf(b)
    return (left<0?Number.MAX_SAFE_INTEGER:left)-(right<0?Number.MAX_SAFE_INTEGER:right)
   })
   const live=previewRef.current&&ids.length>0&&!ids.includes(previewRef.current.id)
   children.forEach(node=>{
    const position=ids.indexOf(identity(node))
    const shifted=live&&position>=previewRef.current.index?position+2:position+1
    if(position>=0&&node.style.order!==String(shifted))node.style.order=String(shifted)
   })
   setKeys(prev=>ids.join('|')===prev.join('|')?prev:ids)
  }
  const insert=event=>{
   const {id,index}=event.detail||{}
   if(typeof id!=='string'||!Number.isInteger(index))return
   const present=panels().map(identity)
   const ordered=[...new Set([...orderRef.current,...present])].filter(key=>key!==id)
   ordered.splice(clamp(index,0,present.length),0,id)
   orderRef.current=ordered
   setPreferredOrder(ordered)
   try{localStorage.setItem(ORDER_KEY_SCOPED,JSON.stringify(ordered))}catch{}
   sync()
  }
  const observer=new MutationObserver(sync)
  observer.observe(host,{childList:true})
  host.addEventListener('exo-bottom-dock-insert',insert)
  const resize=new ResizeObserver(()=>setHostSize(prev=>{
   const next=[host.clientWidth,host.clientHeight]
   return prev[0]===next[0]&&prev[1]===next[1]?prev:next
  }))
  resize.observe(host)
  sync()
  return ()=>{observer.disconnect();resize.disconnect();host.removeEventListener('exo-bottom-dock-insert',insert)}
 },[host,panels])
 useEffect(()=>{
  if(!keys.length){setWeights([]);return}
  let saved=null
  try{saved=JSON.parse(localStorage.getItem(storageKey))}catch{}
  setWeights(Array.isArray(saved)&&saved.length===keys.length&&
    saved.every(v=>Number.isFinite(v)&&v>0)?saved:initialWeights(keys))
 },[configKey])
 useEffect(()=>{
  if(!host)return
  if(keys.length<1){host.style.removeProperty('grid-template-columns');return}
  const showingPreview=preview&&keys.length>0&&!keys.includes(preview.id)
  panels().forEach(node=>{
   const index=keys.indexOf(identity(node))
   if(index<0)return
   const position=showingPreview&&index>=preview.index?index+2:index+1
   if(node.style.order!==String(position))node.style.order=String(position)
  })
  if(showingPreview){
   host.style.setProperty('grid-template-columns',`repeat(${keys.length+1},minmax(0,1fr))`)
   return ()=>host.style.removeProperty('grid-template-columns')
  }
  const values=weights.length===keys.length?weights:initialWeights(keys)
  host.style.setProperty('grid-template-columns',values.map(value=>`minmax(0,${Math.max(.1,value)}fr)`).join(' '))
  host.dataset.exoDockSplitCount=String(keys.length)
  host.style.setProperty('--exo-dock-panel-count',String(keys.length))
  return ()=>{host.style.removeProperty('grid-template-columns');host.style.removeProperty('--exo-dock-panel-count')}
 },[host,configKey,weights,preview,panels])
 const update=(values,store=false)=>{
  setWeights(values)
  if(store){try{localStorage.setItem(storageKey,JSON.stringify(values))}catch{}}
 }
 const adjust=(index,delta,from=null,store=false)=>{
  const original=from||current.current.weights
  const available=Math.max(200,host?.clientWidth-GAP*(original.length-1)||500)
  const total=original.reduce((sum,v)=>sum+v,0)
  const sum=original[index]+original[index+1]
  const min=Math.min(sum*.45,Math.max(9,Math.min(175,available/original.length*.64)/available*total))
  const shift=delta/available*total
  const a=clamp(original[index]+shift,min,sum-min)
  const next=original.slice()
  next[index]=a;next[index+1]=sum-a
  update(next,store)
 }
 const down=(event,index)=>{
  if(event.button!==0||weights.length!==keys.length)return
  event.preventDefault();event.stopPropagation()
  drag.current={pointerId:event.pointerId,index,x:event.clientX,start:weights.slice()}
  event.currentTarget.setPointerCapture(event.pointerId)
 }
 const move=event=>{
  const state=drag.current
  if(state?.pointerId!==event.pointerId)return
  adjust(state.index,event.clientX-state.x,state.start,false)
 }
 const up=event=>{
  if(drag.current?.pointerId!==event.pointerId)return
  const state=drag.current
  drag.current=null
  if(event.currentTarget.hasPointerCapture?.(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId)
  if(event.type==='pointerup')adjust(state.index,event.clientX-state.x,state.start,true)
 }
 const points=useMemo(()=>{
  if(keys.length<2||weights.length!==keys.length||hostSize[0]<=0)return []
  const available=hostSize[0]-GAP*(keys.length-1)
  const total=weights.reduce((sum,w)=>sum+w,0)||1
  let offset=0
  return weights.slice(0,-1).map((weight,i)=>{
   offset+=weight/total*available+GAP
   return {left:Math.round(offset-GAP/2),index:i,key:`${keys[i]}-${keys[i+1]}`}
  })
 },[configKey,weights,hostSize])
 const pointerHeightDown=event=>{
  if(event.button!==0)return
  const bounds=host?.getBoundingClientRect()
  if(!bounds)return
  event.preventDefault()
  verticalDrag.current={id:event.pointerId,startY:event.clientY,startHeight:bounds.height}
  event.currentTarget.setPointerCapture(event.pointerId)
 }
 const pointerHeightMove=event=>{
  const data=verticalDrag.current
  if(!data||data.id!==event.pointerId)return
  const root=host.closest('.cc-embedded-root,.main-layout')
  const maximum=Math.max(MIN_HEIGHT,Math.min(600,(root?.clientHeight||innerHeight)-180))
  const next=clamp(data.startHeight+(edge==='top'?event.clientY-data.startY:data.startY-event.clientY),MIN_HEIGHT,maximum)
  // The 2D pattern renderer is expensive: avoid rerendering React and all
  // docked widgets on every pointermove. Preview only the host's CSS height;
  // commit one state update when the pointer is released.
  host.style.setProperty('--exo-bottom-dock-height',`${Math.round(next)}px`)
 }
 const pointerHeightUp=event=>{
  if(verticalDrag.current?.id!==event.pointerId)return
  verticalDrag.current=null
  if(event.currentTarget.hasPointerCapture?.(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId)
  const height=Math.round(host.getBoundingClientRect().height)
  if(event.type==='pointerup'){
   setDockHeight(height)
   try{localStorage.setItem(HEIGHT_KEY,String(height))}catch{}
  }else host.style.setProperty('--exo-bottom-dock-height',`${dockHeight}px`)
 }
 if(!host)return null
 return createPortal(<>
  <div className="exo-dock-layout-controls" role="group" aria-label="Embedded widget layout">
   <button type="button" onClick={()=>{const height=edge==='top'?56:82;setDockHeight(height);try{localStorage.setItem(HEIGHT_KEY,String(height))}catch{}}}>Compact row</button>
   <button type="button" onClick={()=>{const height=edge==='top'?112:276;setDockHeight(height);try{localStorage.setItem(HEIGHT_KEY,String(height))}catch{}}}>Worksheet</button>
  </div>
  {preview&&keys.length>0&&!keys.includes(preview.id)&&
   <div className="exo-bottom-dock-live-insert" aria-hidden="true"
    style={{order:preview.index+1}} data-exo-bottom-insert-index={preview.index}>
    <span>{preview.label||'Widget'}</span>
   </div>}
  {keys.length>0&&<div role="separator" tabIndex={0} aria-orientation="horizontal"
    className="exo-bottom-dock-height-grip" data-exo-bottom-height-grip="true"
    aria-label="Resize embedded widgets height"
    title="Drag toward the canvas to enlarge. Double-click to reset height."
    onPointerDown={pointerHeightDown} onPointerMove={pointerHeightMove}
    onPointerUp={pointerHeightUp} onPointerCancel={pointerHeightUp}
    onDoubleClick={()=>{setDockHeight(DEFAULT_HEIGHT);try{localStorage.setItem(HEIGHT_KEY,String(DEFAULT_HEIGHT))}catch{}}}
    onKeyDown={event=>{if(event.key==='ArrowUp'||event.key==='ArrowDown'){
      event.preventDefault()
      const next=clamp(dockHeight+(event.key===(edge==='top'?'ArrowDown':'ArrowUp')?24:-24),MIN_HEIGHT,600)
      setDockHeight(next);try{localStorage.setItem(HEIGHT_KEY,String(next))}catch{}
    }}}><span aria-hidden="true">⋮⋮</span></div>}
  {!preview&&points.map(point=><div key={point.key} role="separator" aria-orientation="vertical"
    aria-label={`Resize bottom widgets between ${keys[point.index]} and ${keys[point.index+1]}`}
    tabIndex={0} className="exo-bottom-split-divider"
    data-exo-bottom-split-divider={point.index}
    style={{left:point.left}}
    onPointerDown={event=>down(event,point.index)}
    onPointerMove={move} onPointerUp={up} onPointerCancel={up}
    onDoubleClick={()=>adjust(point.index,0,initialWeights(keys),true)}
    onKeyDown={event=>{
      if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
       event.preventDefault();adjust(point.index,(event.key==='ArrowLeft'?-1:1)*(event.shiftKey?42:14),null,true)
      }
    }}><span aria-hidden="true">⋮</span></div>)}
 </>,host)
}
