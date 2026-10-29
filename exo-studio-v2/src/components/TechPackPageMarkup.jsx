import React,{useRef,useState} from 'react'
import {normalizedPageMarkers,safeMarkerColor,safeMarkerWidth,safePageMarkPoint} from '../core/techPackPageMarkup.js'

// A transparent page-sized vector surface makes markup possible over tables,
// diagrams and notes, rather than only within individual garment drawings.
export default function TechPackPageMarkup({pageId,active=false,color='#f4d03f',width=24,annotations=[],onAdd=()=>{}}){
  const [drawing,setDrawing]=useState(null)
  const pointer=useRef(null)
  const pointFor=event=>{
    const rect=event.currentTarget.getBoundingClientRect()
    if(!rect.width||!rect.height)return null
    return safePageMarkPoint([(event.clientX-rect.left)/rect.width*1000,(event.clientY-rect.top)/rect.height*1000])
  }
  const start=event=>{
    if(!active||event.button!==0)return
    const point=pointFor(event)
    if(!point)return
    event.preventDefault();event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    pointer.current={pointerId:event.pointerId,points:[point],color:safeMarkerColor(color),width:safeMarkerWidth(width)}
    setDrawing(pointer.current)
  }
  const move=event=>{
    if(!pointer.current||pointer.current.pointerId!==event.pointerId)return
    const pt=pointFor(event)
    if(!pt)return
    const prior=pointer.current
    pointer.current={...prior,points:[...prior.points.slice(-698),pt]}
    setDrawing(pointer.current)
  }
  const stop=event=>{
    const value=pointer.current
    if(!value||value.pointerId!==event.pointerId)return
    event.preventDefault();event.stopPropagation()
    const pt=pointFor(event)
    const points=[...value.points,...(pt?[pt]:[])]
    const first=points[0],last=points[points.length-1]
    if(points.length>=2&&Math.hypot(first[0]-last[0],first[1]-last[1])>=2)onAdd(pageId,{
      id:`highlight-${Date.now()}-${Math.random().toString(36).slice(2)}`,type:'highlighter',scope:'page',
      color:value.color,width:value.width,points,label:'Colored highlight',
    })
    pointer.current=null;setDrawing(null)
  }
  const markers=normalizedPageMarkers(annotations)
  return <svg className={`tpws-page-markup ${active?'tpws-page-markup-active':''}`}
    data-page-markup={pageId} data-marker-active={String(active)} viewBox="0 0 1000 1000" preserveAspectRatio="none"
    aria-label="Colored Techpack page markup" onPointerDown={start} onPointerMove={move} onPointerUp={stop}
    onPointerCancel={()=>{pointer.current=null;setDrawing(null)}}>
    {[...markers,...(drawing?[drawing]:[])].map((item,i)=><polyline key={item.id||`drawing-${i}`} data-highlight-stroke={item.id||'preview'}
      points={item.points.map(pt=>pt.join(',')).join(' ')} fill="none" stroke={safeMarkerColor(item.color)}
      strokeWidth={safeMarkerWidth(item.width)} strokeOpacity="0.38" strokeLinecap="round" strokeLinejoin="round" pointerEvents="none"/>)}
  </svg>
}
