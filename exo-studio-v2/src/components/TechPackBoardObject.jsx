import React,{useEffect,useRef,useState} from 'react'
import {boardObjectMove,boardObjectResize,boardObjectTransform} from '../core/techPackBoardObjects.js'

// Universal transform envelope for EXO's native document objects (not only
// drawn arrows). The same id is saved in the project draft for the page.
export default function TechPackBoardObject({id,pageId,enabled=false,selected=false,keyboardEnabled=true,value={},onSelect=()=>{},onChange=()=>{},onGestureStart=()=>{},onContextAction=()=>{},onEnterContent=()=>{},style={},children}){
  const box=useRef(null),session=useRef(null),overlayClicks=useRef({time:0,count:0})
  const [preview,setPreview]=useState(null)
  const [context,setContext]=useState(null)
  useEffect(()=>{if(!enabled)setContext(null)},[enabled])
  useEffect(()=>{
    const close=event=>{if(event.key==='Escape'){session.current=null;setPreview(null);setContext(null);overlayClicks.current={time:0,count:0}}}
    window.addEventListener('keydown',close)
    return()=>window.removeEventListener('keydown',close)
  },[])
  useEffect(()=>{
    if(!selected||!enabled||!keyboardEnabled)return
    const key=event=>{
      if(event.target?.closest?.('input,textarea,select,button,[contenteditable="true"]')||event.metaKey||event.ctrlKey||event.altKey)return
      if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)){
        event.preventDefault()
        const step=event.shiftKey?10:1
        const delta=event.key==='ArrowUp'?[0,-step]:event.key==='ArrowDown'?[0,step]:event.key==='ArrowLeft'?[-step,0]:[step,0]
        onChange(pageId,id,boardObjectMove(value,delta))
      }else if(event.key==='Backspace'||event.key==='Delete'){
        event.preventDefault();onContextAction(pageId,id,'delete')
      }else if(event.key==='Escape')onSelect(null)
    }
    window.addEventListener('keydown',key)
    return()=>window.removeEventListener('keydown',key)
  },[selected,enabled,keyboardEnabled,onChange,onContextAction,onSelect,id,pageId,value])
  const state=boardObjectTransform(preview||value)
  const begin=(event,handle)=>{
    if(!enabled||event.button!==0)return
    if(handle==='move'){
      const now=Date.now(),last=overlayClicks.current
      overlayClicks.current={time:now,count:now-last.time<500?last.count+1:1}
      // Only repeated presses ON THIS SAME overlay can enter the content.
      // A browser dblclick event synthesized across a grid/overlay transition
      // must never switch Layout mode back to Content on the first click.
      if(overlayClicks.current.count>=2){
        overlayClicks.current={time:0,count:0}
        event.preventDefault();event.stopPropagation()
        onEnterContent(pageId,id)
        return
      }
    }
    event.preventDefault();event.stopPropagation();onSelect({pageId,id},event.shiftKey||event.metaKey||event.ctrlKey)
    const root=box.current
    if(!root)return
    const size=[root.offsetWidth,root.offsetHeight]
    const bounds=root.getBoundingClientRect()
    const initial=boardObjectTransform(value)
    const renderScale=[bounds.width/Math.max(1,size[0]*initial.scaleX),bounds.height/Math.max(1,size[1]*initial.scaleY)]
    const gesture=onGestureStart(pageId,id,handle)
    session.current={pointerId:event.pointerId,handle,size,renderScale,start:[event.clientX,event.clientY],initial,moved:false,last:[0,0],wasSelected:selected,gesture}
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const move=event=>{
    const s=session.current
    if(!s||s.pointerId!==event.pointerId)return
    const delta=[(event.clientX-s.start[0])/Math.max(.05,s.renderScale[0]),(event.clientY-s.start[1])/Math.max(.05,s.renderScale[1])]
    if(!delta.every(Number.isFinite)||Math.hypot(...delta)<2&&!s.moved)return
    s.last=delta;s.moved=true;s.preserveAspect=event.shiftKey
    setPreview(s.handle==='move'?boardObjectMove(s.initial,delta):boardObjectResize(s.initial,delta,s.size,s.handle,s.preserveAspect))
  }
  const finish=event=>{
    move(event) // Capture the final pointer position even if no move event preceded it.
    const s=session.current
    if(!s||s.pointerId!==event.pointerId)return
    if(s.moved){
      overlayClicks.current={time:0,count:0}
      const updated=s.handle==='move'?boardObjectMove(s.initial,s.last):boardObjectResize(s.initial,s.last,s.size,s.handle,s.preserveAspect)
      onChange(pageId,id,updated,{handle:s.handle,initial:s.initial,gesture:s.gesture})
    }
    session.current=null;setPreview(null)
  }
  return <div ref={box} className={`tpws-board-object ${enabled?'tpws-object-transformable':''} ${selected?'tpws-object-selected':''}`}
    data-board-object={id} data-board-page={pageId}
    onClick={event=>{if(!enabled&&event.button===0)onSelect({pageId,id})}}
    onContextMenu={event=>{
      if(!enabled)return
      event.preventDefault();event.stopPropagation();onSelect({pageId,id})
      const rect=event.currentTarget.getBoundingClientRect()
      setContext({x:Math.max(4,Math.min(rect.width-130,event.clientX-rect.left)),y:Math.max(4,Math.min(rect.height-38,event.clientY-rect.top))})
    }}
    style={{...style,transform:`translate(${state.x}px,${state.y}px) scale(${state.scaleX},${state.scaleY})`,transformOrigin:'top left'}}>
    {children}
    {enabled&&<div className="tpws-object-transform-cover" title={`Drag to move ${id}. Double-click to edit content. Escape cancels.`} aria-label={`Move ${id} on ${pageId}`} onPointerDown={e=>begin(e,'move')} onPointerMove={move} onPointerUp={finish} onLostPointerCapture={()=>{session.current=null;setPreview(null)}} onPointerCancel={()=>{session.current=null;setPreview(null)}}/>}
    {enabled&&selected&&<div className="tpws-object-bounding-box" data-object-bounds={id}>
      {['nw','n','ne','e','se','s','sw','w'].map(handle=><div key={handle} className={`tpws-object-transform-handle tpws-handle-${handle}`}
        data-object-handle={handle} title="Drag to resize. Shift + corner preserves proportions. Escape cancels." aria-label={`Resize ${id} ${handle}`} onPointerDown={e=>begin(e,handle)} onPointerMove={move} onPointerUp={finish} onLostPointerCapture={()=>{session.current=null;setPreview(null)}} onPointerCancel={()=>{session.current=null;setPreview(null)}}/>)}
    </div>}
    {enabled&&context&&<div className="tpws-board-object-menu" role="menu" style={{left:context.x,top:context.y}}>
      <button type="button" role="menuitem" onClick={()=>{onEnterContent(pageId,id);setContext(null)}}>Edit this object's content</button>
      <button type="button" role="menuitem" onClick={()=>{onContextAction(pageId,id,'replace');setContext(null)}}>Replace visual / reference</button>
      <button type="button" role="menuitem" onClick={()=>{onContextAction(pageId,id,'duplicate');setContext(null)}}>Duplicate object</button>
      <button type="button" role="menuitem" onClick={()=>{onContextAction(pageId,id,'front');setContext(null)}}>Bring to front</button>
      <button type="button" role="menuitem" onClick={()=>{onContextAction(pageId,id,'back');setContext(null)}}>Send to back</button>
      <button type="button" role="menuitem" onClick={()=>{onContextAction(pageId,id,'delete');setContext(null)}}>Delete / remove from page</button>
      <button type="button" role="menuitem" onClick={()=>{onContextAction(pageId,id,'reset');setContext(null)}}>Reset position and size</button>
      <button type="button" role="menuitem" onClick={()=>setContext(null)}>Cancel</button>
    </div>}
  </div>
}
