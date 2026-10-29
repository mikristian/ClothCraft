import React,{useEffect,useMemo,useRef,useState} from 'react'
import {layoutTechnicalPatterns,projectTechnicalMesh,sourceSeamCallouts,technicalPatternPieces} from '../core/techPackTechnicalArt.js'
import {bezierPath,moveBezierAnchor,moveTechPackAnnotation,newBezierAnchor,roundedPoint} from '../core/techPackBezier.js'
import {annotationBounds,resizeTechPackAnnotation} from '../core/techPackAnnotationTransform.js'
import {linkedMeasurementLabel} from '../core/techPackMeasurementDrawing.js'

const finite=x=>Number.isFinite(x)
const modes=new Set(['pen','bezier','arrow','dimension','marker'])
const tidy=s=>String(s||'').slice(0,140)
// Draw genuine cutlines when a simulated 3D mesh is unavailable. A pattern
// panel is not a sewn front/back flat: the caption marks this difference.
function fitReferenceCutline(piece){
  if(!piece?.points||piece.points.length<3)return null
  const xs=piece.points.map(p=>p[0]),ys=piece.points.map(p=>p[1])
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys)
  const dx=Math.max(maxX-minX,1e-8),dy=Math.max(maxY-minY,1e-8)
  const scale=Math.min(335/dx,370/dy)
  const ox=(460-dx*scale)/2,oy=46+(382-dy*scale)/2
  return {name:piece.name,path:piece.points.map(([x,y],i)=>`${i?'L':'M'}${(ox+(x-minX)*scale).toFixed(2)} ${(oy+(y-minY)*scale).toFixed(2)}`).join(' ')+' Z'}
}

export default function TechPackTechnicalBoard({pageId,source,nativeSnapshot,project,nativeMode,tool='select',annotations=[],measurementTable=null,measurementOverrides={},onAdd=()=>{},onUpdate=()=>{},onDelete=()=>{},onSelect=()=>{},onPageSelect=()=>{},selectedId='',focusPanelId=''}){
  const [working,setWorkingState]=useState(null)
  const [contextMenu,setContextMenu]=useState(null)
  const pointerSession=useRef(null)
  const setWorking=change=>{
    // Pointer moves can be batched by React; the pointer-up commit must see the
    // last computed geometry even before the component re-renders.
    const next=typeof change==='function'?change(pointerSession.current):change
    pointerSession.current=next
    setWorkingState(next)
  }
  const [hoverPoint,setHoverPoint]=useState(null)
  const [selectedPatternId,setSelectedPatternId]=useState('')
  const raw=useMemo(()=>technicalPatternPieces(nativeSnapshot,project,nativeMode),[nativeSnapshot,project,nativeMode])
  useEffect(()=>{
    if(pageId==='patterns'&&focusPanelId&&raw.some(piece=>piece.id===focusPanelId))setSelectedPatternId(focusPanelId)
  },[focusPanelId,pageId,raw])
  const selectedRaw=pageId==='patterns'&&raw.length?raw.filter(p=>p.id===(raw.some(x=>x.id===selectedPatternId)?selectedPatternId:raw[0].id)):raw
  const pattern=useMemo(()=>layoutTechnicalPatterns(selectedRaw,980,pageId==='patterns'?{columns:1,tileHeight:370,margin:65}:{}),[raw,pageId,selectedPatternId])
  const views=useMemo(()=>['front','back','side'].map(view=>projectTechnicalMesh(nativeSnapshot,view,290,360)),[nativeSnapshot])
  const hasViews=nativeMode&&views.some(Boolean)
  const isPattern=pageId==='patterns'||pageId==='grading'||pageId==='construction'
  const isConstruction=pageId==='construction'
  const isMeasurement=pageId==='measurements'
  const isFlat=pageId==='flats'||pageId==='overview'||pageId==='callouts'||pageId==='measurements'||pageId==='artwork'
  const isGeneric=!isPattern&&!isFlat
  const height=isGeneric?280:isPattern?Math.min(760,Math.max(pageId==='patterns'?405:430,pattern.height+40)):isMeasurement?610:510
  const box=`0 0 980 ${height}`
  const callouts=useMemo(()=>sourceSeamCallouts(source.seams||[],pattern.pieces,10),[source.seams,pattern.pieces])
  const coords=event=>{
    // Respect SVG viewBox letterboxing; CSS width/height scaling alone shifts
    // annotations when a portrait sheet contains a wide technical drawing.
    const svg=event.currentTarget
    const matrix=svg.getScreenCTM?.()
    if(!matrix)return null
    const point=svg.createSVGPoint()
    point.x=event.clientX;point.y=event.clientY
    const local=point.matrixTransform(matrix.inverse())
    return [Math.min(980,Math.max(0,local.x)),Math.min(height,Math.max(0,local.y))]
  }
  const finishBezier=()=>{
    const session=pointerSession.current
    if(session?.kind!=='bezier')return
    const anchors=session.anchors.filter((a,i,all)=>i===0||Math.hypot(a.point[0]-all[i-1].point[0],a.point[1]-all[i-1].point[1])>2)
    if(anchors.length>=2){
      onAdd(pageId,{id:`annotation-${Date.now()}-${Math.random().toString(36).slice(2)}`,type:'bezier',anchors,label:''})
      onPageSelect(pageId)
    }
    setWorking(null);setHoverPoint(null)
  }
  useEffect(()=>{
    if(tool!=='bezier'||working?.kind!=='bezier')return
    const onKey=event=>{
      if(event.target?.closest?.('input,textarea,select,[contenteditable="true"]'))return
      if(event.key==='Enter'){event.preventDefault();finishBezier()}
      if(event.key==='Escape'){event.preventDefault();setWorking(null);setHoverPoint(null)}
      if(event.key==='Backspace'){event.preventDefault();setWorking(prev=>prev?.kind==='bezier'?
        {...prev,anchors:prev.anchors.slice(0,-1)}:prev)}
    }
    window.addEventListener('keydown',onKey)
    return()=>window.removeEventListener('keydown',onKey)
  },[tool,working])
  useEffect(()=>{setWorking(null);setHoverPoint(null)},[tool])
  useEffect(()=>{
    const onKey=event=>{
      if(event.key==='Escape'){setContextMenu(null);return}
      if(event.target?.closest?.('input,textarea,select,[contenteditable="true"]'))return
      if((event.key==='Delete'||event.key==='Backspace')&&selectedId&&['select','transform'].includes(tool)
        &&annotations.some(a=>a.id===selectedId&&a.scope!=='page')){
        event.preventDefault();onDelete(pageId,selectedId);setContextMenu(null)
      }
    }
    window.addEventListener('keydown',onKey)
    return()=>window.removeEventListener('keydown',onKey)
  },[annotations,onDelete,pageId,selectedId,tool])
  if(isGeneric&&!annotations.some(item=>item.scope!=='page')&&!modes.has(tool))return null
  const onPointerDown=event=>{
    if(event.button!==0)return
    const pt=coords(event);if(!pt)return
    if(tool==='select'||tool==='transform'){
      const id=event.target.closest?.('[data-annotation-id]')?.getAttribute('data-annotation-id')
      const item=annotations.find(a=>a.id===id)
      setContextMenu(null)
      onPageSelect(pageId)
      onSelect(item?.id||'')
      if(!item)return
      const handleTarget=event.target.closest?.('[data-anchor-index]')
      const resizeHandle=event.target.getAttribute?.('data-transform-handle')
      const handle=handleTarget?.getAttribute('data-handle')||'point'
      const index=Number(handleTarget?.getAttribute('data-anchor-index'))
      event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId)
      setWorking({kind:resizeHandle?'resize':handleTarget?'anchor':'move',item,preview:item,index,handle:resizeHandle||handle,start:pt,pointerId:event.pointerId})
      return
    }
    if(!modes.has(tool))return
    event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId)
    onPageSelect(pageId)
    if(tool==='bezier'){
      setWorking(prev=>({kind:'bezier',pointerId:event.pointerId,
        anchors:[...(prev?.kind==='bezier'?prev.anchors:[]),newBezierAnchor(pt)]}))
      return
    }
    setWorking({kind:tool,points:[pt],pointerId:event.pointerId})
  }
  const onPointerMove=event=>{
    const pt=coords(event);if(!pt)return
    if(tool==='bezier')setHoverPoint(pt)
    const session=pointerSession.current
    if(!session||session.pointerId!==event.pointerId)return
    if(session.kind==='move'||session.kind==='anchor'||session.kind==='resize'){
      const dx=pt[0]-session.start[0],dy=pt[1]-session.start[1]
      if(Math.hypot(dx,dy)<.6&&!session.moved)return
      setWorking(prev=>({...prev,moved:true,preview:prev.kind==='move'?moveTechPackAnnotation(prev.item,dx,dy):
        prev.kind==='resize'?resizeTechPackAnnotation(prev.item,prev.handle,null,[dx,dy]):
          moveBezierAnchor(prev.item,prev.index,dx,dy,prev.handle)}))
    }else if(session.kind==='bezier')setWorking(prev=>{
      const anchors=prev.anchors.slice(),last=anchors[anchors.length-1]
      anchors[anchors.length-1]={...last,out:roundedPoint(pt),in:roundedPoint([last.point[0]*2-pt[0],last.point[1]*2-pt[1]])}
      return {...prev,anchors}
    })
    else if(session.kind==='pen')setWorking(prev=>({...prev,points:[...prev.points.slice(-350),pt]}))
    else setWorking(prev=>({...prev,points:[prev.points[0],pt]}))
  }
  const onPointerUp=event=>{
    const session=pointerSession.current
    if(!session||session.pointerId!==event.pointerId)return
    event.preventDefault()
    if(session.kind==='move'||session.kind==='anchor'||session.kind==='resize'){
      if(session.moved)onUpdate(pageId,session.item.id,session.kind==='move'||session.kind==='resize'?
          session.item.type==='bezier'?{anchors:session.preview.anchors}:{points:session.preview.points}:
          {anchors:session.preview.anchors})
      setWorking(null);return
    }
    if(session.kind==='bezier'){
      setWorking(prev=>({...prev,pointerId:null}));return
    }
    const pt=coords(event)||session.points[session.points.length-1]
    const points=session.kind==='pen'?[...session.points,pt]:[session.points[0],pt]
    const len=Math.hypot(pt[0]-points[0][0],pt[1]-points[0][1])
    if(session.kind==='marker'||session.kind==='pen'&&points.length>1||['arrow','dimension'].includes(session.kind)&&len>=3){
      const annotation={id:`annotation-${Date.now()}-${Math.random().toString(36).slice(2)}`,type:session.kind,
        points:session.kind==='marker'?[points[0]]:points.map(p=>p.map(n=>Math.round(n*10)/10)),
        label:session.kind==='arrow'?'Construction detail':session.kind==='marker'?'DETAIL':'',
        ...(session.kind==='dimension'?{pomId:'',sizeIndex:2,placementVerified:false}:{})}
      onAdd(pageId,annotation)
    }
    setWorking(null)
  }
  const renderAnnotation=(item,temporary=false)=>{
    if(!item)return null
    const color=selectedId===item.id?'#2189b6':'#c63e3e'
    if(item.type==='bezier'){
      const anchors=Array.isArray(item.anchors)?item.anchors.filter(a=>Array.isArray(a?.point)&&a.point.every(finite)):[]
      if(!anchors.length)return null
      const path=bezierPath(anchors)
      return <g><path d={path} fill="none" stroke={color} strokeWidth="2.8" strokeLinecap="round"/>
        {!temporary&&<path d={path} fill="none" stroke="transparent" strokeWidth="20" pointerEvents="stroke"/>}
        {!temporary&&tool==='select'&&selectedId===item.id&&anchors.map((anchor,index)=><g key={index} data-editor-only="true">
          {['in','out'].map(handle=><g key={handle}><line x1={anchor.point[0]} y1={anchor.point[1]} x2={(anchor[handle]||anchor.point)[0]} y2={(anchor[handle]||anchor.point)[1]} stroke="#4293b5" strokeDasharray="4 3"/>
            <circle data-anchor-index={index} data-handle={handle} cx={(anchor[handle]||anchor.point)[0]} cy={(anchor[handle]||anchor.point)[1]} r="5" fill="#fff" stroke="#2388b4" strokeWidth="2"/></g>)}
          <rect data-anchor-index={index} data-handle="point" x={anchor.point[0]-6} y={anchor.point[1]-6} width="12" height="12" fill="#fff" stroke="#2388b4" strokeWidth="2"/>
        </g>)}</g>
    }
    if(!Array.isArray(item.points)||!item.points.length)return null
    const points=item.points.filter(p=>Array.isArray(p)&&p.length===2&&p.every(finite))
    if(!points.length)return null
    const start=points[0],last=points[points.length-1]
    if(item.type==='dimension'){
      if(points.length<2)return null
      const spec=linkedMeasurementLabel(item,measurementTable,measurementOverrides)
      const dx=last[0]-start[0],dy=last[1]-start[1],length=Math.hypot(dx,dy)
      if(length<2)return null
      const nx=-dy/length,ny=dx/length,offset=-24
      const a=[start[0]+nx*offset,start[1]+ny*offset],b=[last[0]+nx*offset,last[1]+ny*offset]
      const center=[(a[0]+b[0])/2,(a[1]+b[1])/2],label=spec.label.slice(0,65)
      const width=Math.min(240,Math.max(110,label.length*9))
      return <g data-techpack-dimension={item.id||'preview'}>
        <path d={`M${start.join(' ')} L${a.join(' ')} M${last.join(' ')} L${b.join(' ')}`} fill="none" stroke={color} strokeWidth="1.3"/>
        <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={color} strokeWidth="2"
          markerStart={`url(#tpws-dimension-arrow-${pageId})`} markerEnd={`url(#tpws-dimension-arrow-${pageId})`}/>
        <rect x={center[0]-width/2} y={center[1]-34} width={width} height="30" rx="3" fill="#fff" stroke={color} strokeWidth="1.3"/>
        <text x={center[0]} y={center[1]-13} textAnchor="middle" fontSize="18" fontWeight="800" fill={color}>{label}</text>
        {spec.reference&&<text x={center[0]} y={center[1]+21} textAnchor="middle" fontSize="13" fontWeight="750" fill={color}>{spec.reference} · {item.placementVerified?'PLACEMENT CHECKED':'PLACEMENT TO VERIFY'}</text>}
        {!temporary&&<line x1={start[0]} y1={start[1]} x2={last[0]} y2={last[1]} stroke="transparent" strokeWidth="22" pointerEvents="stroke"/>}
      </g>
    }
    if(item.type==='pen')return <g><polyline points={points.map(p=>p.join(',')).join(' ')} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/><polyline points={points.map(p=>p.join(',')).join(' ')} fill="none" stroke="transparent" strokeWidth="18" pointerEvents="stroke"/></g>
    if(item.type==='arrow')return <g><path d={`M${start.join(' ')} L${last.join(' ')}`} fill="none" stroke={color} strokeWidth="2.5" markerEnd={`url(#tpws-tech-arrow-${pageId})`}/><path d={`M${start.join(' ')} L${last.join(' ')}`} fill="none" stroke="transparent" strokeWidth="20" pointerEvents="stroke"/><text x={start[0]} y={start[1]-8} fontSize="13" fill={color} fontWeight="800">{tidy(item.label)}</text>
      {item.instruction&&<text x={start[0]} y={start[1]+13} fontSize="10" fill={color}>{tidy(item.instruction).slice(0,75)}</text>}</g>
    return <g key={item.id||'working'}><circle cx={start[0]} cy={start[1]} r="15" fill="#fff" stroke={color} strokeWidth="2"/><text x={start[0]} y={start[1]+4} fontSize="11" textAnchor="middle" fontWeight="800" fill={color}>!</text><text x={start[0]+20} y={start[1]+4} fontWeight="700" fontSize="12" fill={color}>{tidy(item.label)}</text></g>
  }

  return <section className="tpws-illustration-block" data-techpack-illustration={pageId}>
    <header className="tpws-illustration-title"><span>{isPattern?'02 / PATTERN GEOMETRY':isGeneric?'DETAIL / ANNOTATIONS':'01 / GARMENT TECHNICAL VIEWS'}</span>
      <strong>{working?.kind==='bezier'?<button type="button" className="tpws-finish-bezier" disabled={working.anchors.length<2} onClick={finishBezier}>Finish Bezier · Enter</button>:pageId==='grading'?'BASE SIZE CUTLINES · NOT GRADED OUTLINES':isConstruction?'ASSEMBLY & SEAM REFERENCES':isPattern?'NATIVE PATTERN CUTLINES':isGeneric?'AUTHOR VECTOR DETAILS':'FRONT · BACK · SIDE'}</strong></header>
    {pageId==='patterns'&&raw.length>0&&<div className="tpws-pattern-focus-controls">
      <label>SELECT PATTERN PIECE<select aria-label="Selected source pattern piece" value={selectedRaw[0]?.id||''} onChange={e=>setSelectedPatternId(e.target.value)}>{raw.map(piece=><option key={piece.id} value={piece.id}>{piece.name} · {piece.id}</option>)}</select></label>
      <span>{raw.findIndex(p=>p.id===selectedRaw[0]?.id)+1} / {raw.length} SOURCE CUTLINES</span>
    </div>}
    <div className="tpws-illustration-artboard" style={{position:'relative'}}>
      <svg viewBox={box} preserveAspectRatio="xMidYMid meet" role="img" aria-label={isPattern?'Current garment 2D pattern cutlines and seam references':'Front, back and side technical projections from current garment geometry'}
        onContextMenu={event=>{
          const id=event.target.closest?.('[data-annotation-id]')?.getAttribute('data-annotation-id')
          const item=annotations.find(a=>a.id===id&&a.scope!=='page')
          if(!item)return
          event.preventDefault();event.stopPropagation();onPageSelect(pageId);onSelect(id)
          const frame=event.currentTarget.getBoundingClientRect()
          setContextMenu({id,x:Math.max(0,Math.min(event.clientX-frame.left,frame.width-145)),y:Math.max(0,Math.min(event.clientY-frame.top,frame.height-80))})
        }}
        data-annotation-surface={pageId} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={()=>setWorking(null)} onDoubleClick={event=>{if(tool==='bezier'){event.preventDefault();finishBezier()}}}>
        <defs><marker id={`tpws-tech-arrow-${pageId}`} markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0 0 L7 3 L0 6" fill="none" stroke="#c63e3e" strokeWidth="1.6"/></marker>
          <marker id={`tpws-dimension-arrow-${pageId}`} markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto-start-reverse"><path d="M0 0 L6 3 L0 6" fill="none" stroke="#c63e3e" strokeWidth="1.6"/></marker></defs>
        <rect width="980" height={height} fill="#fcfdfc"/>
        {isPattern? <g>{pattern.pieces.map((p,i)=><g key={p.id}>
          <rect x={p.tile[0]+5} y={p.tile[1]+4} width={p.tile[2]-10} height={p.tile[3]-9} fill="#fff" stroke="#e3e9ea" strokeWidth="1"/>
          <path d={p.path} fill={focusPanelId===p.id?'#e7f4fa':'#edf1f1'} fillOpacity=".9" stroke={focusPanelId===p.id?'#1e79a6':'#293741'} strokeWidth={focusPanelId===p.id?'3.5':'2.1'} strokeLinejoin="round"/>
          {p.internalLines.map((line,k)=><polyline key={`internal-${k}`} points={line.map(q=>q.join(',')).join(' ')} fill="none" stroke="#718e9a" strokeWidth="1.5" strokeDasharray="6 4"/>)}
          {p.notches.map((point,k)=><circle key={`notch-${k}`} cx={point[0]} cy={point[1]} r="4.5" fill="#fff" stroke="#c43e44" strokeWidth="2"/>)}
          <path d={`M ${p.center[0]} ${p.center[1]-19} l 0 -28`} fill="none" stroke="#778b94" strokeDasharray="4 4" strokeWidth="1"/>
          <text x={p.center[0]} y={p.center[1]} fontSize="12" fontWeight="750" textAnchor="middle" fill="#2b3e48">{p.name.slice(0,29)}</text>
          <text x={p.center[0]} y={p.center[1]+14} fontSize="9.5" textAnchor="middle" fill="#83939b">{p.id} · {p.dimension?.map(n=>`${Math.round(n)} mm`).join(' × ')}</text>
          {p.points.map((point,j)=> <circle key={j} cx={point[0]} cy={point[1]} r="2.3" fill="#5d7481"/>)}
        </g>)}</g>:isMeasurement?<g>
          {['FRONT / SPEC LOCATIONS','BACK / SPEC LOCATIONS'].map((label,i)=>{
            const projection=views[i],origin=27+i*486
            const selected=raw.find(p=>new RegExp(i===0?'front':'back','i').test(`${p.name} ${p.id}`))||raw[i]||raw[0]
            const cutline=!projection?fitReferenceCutline(selected):null
            return <g key={label} transform={`translate(${origin},30)`}>
              <rect width="460" height="530" fill="#fff" stroke="#dbe2e5"/>
              <g transform="translate(80,43) scale(1.14)">
                {projection?.filled.map((d,j)=><path key={j} d={d} fill="#eef0f0" stroke="none"/>)}
                {projection?.edges.map((line,j)=><line key={j} x1={line[0][0]} y1={line[0][1]} x2={line[1][0]} y2={line[1][1]} stroke="#35424a" strokeWidth="1"/>)}
              </g>
              {cutline&&<path d={cutline.path} fill="#f1f3f2" stroke="#34424a" strokeWidth="2.4" strokeLinejoin="round"/>}
              {!projection&&!cutline&&<text x="230" y="240" textAnchor="middle" fill="#80929d" fontSize="15">No source drawing available</text>}
              <line x1="230" y1="20" x2="230" y2="470" stroke="#b5c4cc" strokeWidth="1" strokeDasharray="5 6"/>
              <rect x="0" y="478" width="460" height="52" fill="#f2f5f6" stroke="#dbe2e5"/>
              <text x="230" y="500" textAnchor="middle" fontSize="13" fontWeight="800" letterSpacing="1.4" fill="#283943">{projection?label:`${i===0?'FRONT':'BACK'} / SOURCE PATTERN REFERENCE`}</text>
              <text x="230" y="517" textAnchor="middle" fontSize="10" fill="#82929b">{projection?'POM LEADERS ARE USER-PLACED · VERIFY ENDPOINTS':`${tidy(selected?.name||'UNASSIGNED')} · NOT A SEWN FLAT`}</text>
            </g>
          })}
        </g>:isFlat?<g>{['FRONT VIEW','BACK VIEW','SIDE PROFILE'].map((label,i)=>{
          const projection=views[i],origin=22+i*326
          return <g key={label} transform={`translate(${origin},35)`}>
            <rect x="0" y="0" width="305" height="414" fill="#fff" stroke="#e4e9eb"/>
            {projection? <g transform="translate(7,17)">
              {projection.filled.map((d,j)=><path key={j} d={d} fill={i===0?'#e2e9eb':'#e7e9e8'} stroke="none"/>)}
              {projection.edges.map((line,j)=><line key={j} x1={line[0][0]} y1={line[0][1]} x2={line[1][0]} y2={line[1][1]} stroke="#2e3d46" strokeWidth="1.15"/>)}
            </g>:raw.length?<g transform={`translate(43,55) scale(.21)`}>{layoutTechnicalPatterns(raw.slice(0,4),980).pieces.slice(0,4).map(p=><path key={p.id} d={p.path} fill="#edf1ef" stroke="#43545d" strokeWidth="5"/>)}</g>:
              <text x="152" y="201" textAnchor="middle" fontSize="12" fill="#81909a">No garment geometry</text>}
            <rect x="0" y="377" width="305" height="37" fill="#f5f7f7" stroke="#e1e8eb"/>
            <text x="152" y="401" textAnchor="middle" fontSize="12" fontWeight="750" letterSpacing="1" fill="#35444d">{label}</text>
          </g>
        })}</g>:<g><rect x="25" y="24" width="930" height="232" fill="#fff" stroke="#d4dfe5" strokeDasharray="7 5"/>
          <g data-editor-only="true">
          <text x="490" y="130" textAnchor="middle" fontSize="13" fontWeight="750" letterSpacing="2" fill="#96a7b0">TECHNICAL DETAIL CANVAS</text>
          <text x="490" y="152" textAnchor="middle" fontSize="11" fill="#9cabb3">Use Bezier Pen, arrow, freehand or detail markers to describe this page.</text></g></g>}
        {isConstruction&&callouts.filter(item=>item.located).map((item,i)=><g key={item.id}>
          <circle cx={item.x} cy={item.y} r="13" fill="#fff" stroke="#c53e42" strokeWidth="2"/>
          <text x={item.x} y={item.y+4} textAnchor="middle" fontWeight="800" fontSize="12" fill="#b73336">{item.number}</text>
        </g>)}
        <g>{annotations.filter(item=>item.scope!=='page').map(item=>{
          const shown=working?.item?.id===item.id?working.preview:item
          const bounds=selectedId===item.id&&['select','transform'].includes(tool)?annotationBounds(shown):null
          return <g key={item.id} data-annotation-id={item.id} style={{cursor:['select','transform'].includes(tool)?'move':'crosshair'}}>
            {renderAnnotation(shown)}
            {bounds&&<g data-transform-box={item.id} data-editor-only="true">
              <rect x={bounds.x-6} y={bounds.y-6} width={bounds.width+12} height={bounds.height+12} fill="none" stroke="#267ea4" strokeWidth="1.8" strokeDasharray="7 4" pointerEvents="none"/>
              {['nw','ne','sw','se'].map(handle=>{
                const x=handle.endsWith('w')?bounds.x-6:bounds.x+bounds.width+6
                const y=handle.startsWith('n')?bounds.y-6:bounds.y+bounds.height+6
                return <rect key={handle} data-transform-handle={handle} x={x-6} y={y-6} width="12" height="12" fill="#fff" stroke="#267ea4" strokeWidth="2" style={{cursor:`${handle}-resize`}}/>
              })}
            </g>}
          </g>})}</g>
        {working&& !['move','anchor','resize'].includes(working.kind)&&renderAnnotation(working.kind==='bezier'?{type:'bezier',anchors:working.anchors}: {...working,type:working.kind,label:working.kind==='arrow'?'Construction detail':''},true)}
        {working?.kind==='bezier'&&hoverPoint&&working.anchors.length>0&&<line x1={working.anchors.at(-1).point[0]} y1={working.anchors.at(-1).point[1]} x2={hoverPoint[0]} y2={hoverPoint[1]} stroke="#2986a9" strokeWidth="1.5" strokeDasharray="6 5" pointerEvents="none"/>}
        {modes.has(tool)&&<rect width="980" height={height} fill="transparent" style={{cursor:'crosshair',touchAction:'none'}}/>}
      </svg>
      {contextMenu&&<div className="tpws-annotation-context-menu" role="menu" style={{left:contextMenu.x,top:contextMenu.y}}>
        <button type="button" role="menuitem" onClick={()=>{onDelete(pageId,contextMenu.id);setContextMenu(null)}}>Delete annotation</button>
        <button type="button" role="menuitem" onClick={()=>setContextMenu(null)}>Cancel</button>
      </div>}
    </div>
    <footer className="tpws-illustration-caption"><span>{isGeneric?'EDITABLE VECTOR ANNOTATION SPACE':hasViews&&!isPattern?'ORTHOGRAPHIC VIEW · CURRENT SIMULATED MESH':isPattern?'CUTLINE GEOMETRY · CURRENT 2D PATTERN':'PATTERN REFERENCE ONLY · 3D MESH NOT AVAILABLE'}</span>
      <span>ANNOTATIONS {annotations.length} · {isConstruction?`${source.seams.length} SOURCE SEAMS`:`${raw.length} PATTERNS`}</span></footer>
    {isConstruction&&<div className="tpws-callout-key"><strong>AUTO-GENERATED SEAM INDEX</strong>
      <div>{callouts.map(item=><span key={item.id}><b>{String(item.number).padStart(2,'0')}</b> {item.text} <small>{item.detail}{!item.located?' · placement not derived':''}</small></span>)}</div>
    </div>}
  </section>
}
