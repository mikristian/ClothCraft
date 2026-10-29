import React,{useMemo,useRef,useState} from 'react'
import {buildAccuMarkFullPatternGradeNest} from '../core/accumarkFullPatternGradeNest20261023.js'
import './AccuMarkFullPatternGradeNest20261023.css'

const PALETTE=['#1675c2','#cd632c','#148d68','#a050c2','#c19510','#db477c','#008ca4','#7556d6','#a65a20','#497d3b']
const fmt=n=>Number.isFinite(n)?Number(n).toFixed(2):'—'

/**
 * Renders all selected garment blocks within PatternEditor's actual SVG world,
 * never as a detached side-window mini-chart. Paths/vertices come from
 * gradeProject's real size-specific contours and per-size point IDs.
 *
 * All interaction here is view-only except explicitly selecting a piece,
 * grade point or preview size via the parent's existing actions.
 */
export default function AccuMarkFullPatternGradeNest20261023({
  sourceProject,selectedPieceId,selectedPointIndex=null,selectedSize=null,
  scope='all',pointMode='all',showLabels=true,showVectors=true,
  showSizeLabels=true,viewWidth=330,onSelectPiece,onSelectGradePoint,onSelectSize,
  dragGradePoints=false,onGradePointDrag=null,maintainGrowths=false,disabled=false,
}){
 const pointer=useRef(null)
 const [dragPreview,setDragPreview]=useState(null)
 const geometry=useMemo(()=>{
   if(!sourceProject?.pieces?.length)return {result:null,error:null}
   try{return {result:buildAccuMarkFullPatternGradeNest(sourceProject,{
     pieceIds:scope==='selected'&&selectedPieceId?[selectedPieceId]:undefined,
     selectedSize:selectedSize||sourceProject.grading?.baseSize,
   }),error:null}}
   catch(error){return {result:null,error:error.message||String(error)}}
 },[sourceProject,scope,selectedPieceId,selectedSize])
 const result=geometry.result
 if(geometry.error)return <g aria-label="Grade nest could not be drawn" data-grade-nest-error={geometry.error} pointerEvents="none"/>
 if(!result)return null
 const radius=Math.max(.65,Math.min(1.6,viewWidth/310))
 const font=Math.max(1.65,Math.min(3,viewWidth/155))
 const focus=Number.isSafeInteger(selectedPointIndex)?selectedPointIndex:null
 const svgPosition=event=>{
   const svg=event.currentTarget.ownerSVGElement
   const ctm=svg?.getScreenCTM?.()
   if(!ctm||!svg?.createSVGPoint)return null
   const p=svg.createSVGPoint();p.x=event.clientX;p.y=event.clientY
   const value=p.matrixTransform(ctm.inverse())
   return Number.isFinite(value.x)&&Number.isFinite(value.y)?{x:value.x,y:value.y}:null
 }
 const startDrag=(event,block,size,point,baseSize)=>{
   if(!dragGradePoints||disabled||!onGradePointDrag||size!==selectedSize||size===baseSize||event.button!==0)return false
   const start=svgPosition(event)
   if(!start)return false
   pointer.current={id:event.pointerId,block,size,point,start,moved:false}
   event.currentTarget.setPointerCapture?.(event.pointerId)
   setDragPreview({x:point.x,y:point.y,dxCm:0,dyCm:0,block,size,index:point.index})
   event.preventDefault();event.stopPropagation()
   onSelectPiece?.(block);onSelectGradePoint?.(block,point.index)
   return true
 }
 const moveDrag=event=>{
   const active=pointer.current
   if(!active||active.id!==event.pointerId)return
   const current=svgPosition(event)
   if(!current)return
   const dxCm=current.x-active.start.x,dyCm=active.start.y-current.y
   if(!Number.isFinite(dxCm)||!Number.isFinite(dyCm)||Math.abs(dxCm)>50||Math.abs(dyCm)>50)return
   active.moved ||= Math.hypot(dxCm,dyCm)>.025
   setDragPreview({block:active.block,size:active.size,index:active.point.index,
     x:active.point.x+dxCm,y:active.point.y-dyCm,dxCm,dyCm})
   event.stopPropagation()
 }
 const endDrag=(event,cancel=false)=>{
   const active=pointer.current
   if(!active||active.id!==event.pointerId)return
   pointer.current=null
   const current=svgPosition(event)
   const dxCm=current?current.x-active.start.x:0
   const dyCm=current?active.start.y-current.y:0
   setDragPreview(null)
   event.currentTarget.releasePointerCapture?.(event.pointerId)
   event.stopPropagation()
   if(cancel||!active.moved||!Number.isFinite(dxCm)||!Number.isFinite(dyCm)||
     Math.abs(dxCm)>50||Math.abs(dyCm)>50)return
   onGradePointDrag?.({pieceId:active.block,pointIndex:active.point.index,size:active.size,
     dxCm:Number(dxCm.toFixed(5)),dyCm:Number(dyCm.toFixed(5)),maintainGrowths})
 }
 return <g className="exo-full-grade-nest" data-accumark-all-blocks-grade-nest="true"
   data-grade-blocks={result.pieces.length} data-grade-sizes={result.sizes.join(',')}
   aria-label={`Actual graded outlines and points across ${result.pieces.length} pattern blocks and ${result.sizes.length} sizes`}>
   {result.pieces.map(block=>{
     const selectedBlock=block.pieceId===selectedPieceId
     const focused=selectedBlock?focus:null
     const pointsShown=pointMode==='all'||(pointMode==='selected'&&selectedBlock)
     return <g key={block.pieceId} data-grade-block={block.pieceId} aria-label={`Graded ${block.pieceName||block.pieceId}`}>
       {block.sizes.map(({size,path,labelAnchor,points},sizeIndex)=>{
         const current=size===selectedSize,base=size===result.baseSize
         const color=PALETTE[sizeIndex%PALETTE.length]
         const readableSize=size.replace(/[^a-zA-Z0-9_-]/g,'_')
         return <g key={size} data-grade-contour-size={size} data-grade-piece-size={`${block.pieceId}:${size}`}>
           <path d={path} data-graded-outline={`${block.pieceId}:${size}`}
             fill="none" stroke={color} strokeWidth={current?1.65:base?1.3:.95}
             strokeOpacity={current?1:.77} strokeDasharray={base&&!current?'5 2.5':undefined}
             vectorEffect="non-scaling-stroke" pointerEvents="none"/>
           {showSizeLabels&&labelAnchor&&<g data-grade-size-chip={`${block.pieceId}:${size}`} pointerEvents="none">
             <rect x={labelAnchor.x-1.25} y={labelAnchor.y-font*1.1} rx=".7"
               width={Math.max(4.3,size.length*font*.76+2.4)} height={font*1.55}
               fill="#fffcf5" stroke={color} strokeWidth=".3" opacity=".96"/>
             <text x={labelAnchor.x} y={labelAnchor.y} fill={color} fontSize={font*.86}
               fontWeight={current?'800':'700'}>{size}</text>
           </g>}
           {pointsShown&&points?.slice(0,320).map(point=>{
             const active=selectedBlock&&focused===point.index
             const showPointNumber=showLabels&&(active||current&&sizeIndex%2===0&&point.index%2===0)
             const position=`P${point.index+1} · ${size} · X ${fmt(point.xLocalCm??point.xCm)} / Y ${fmt(point.yLocalCm??point.yCm)} cm · ΔX ${fmt(point.dxCm)} / ΔY ${fmt(point.dyCm)} cm`
             return <g key={point.index} data-grade-size-point={`${block.pieceId}:${size}:${point.index}`}
               data-graded-vertex={`${block.pieceId}:${size}:P${point.index+1}`} data-size-marker={readableSize}>
               <circle cx={point.x} cy={point.y} r={active?radius*1.95:current?radius*1.45:radius*1.12}
                 fill={current||active?'#fffded':'#fff'} stroke={color} strokeWidth={active?1.3:.86}
                 vectorEffect="non-scaling-stroke" pointerEvents="none"/>
               {showPointNumber&&<text x={point.x+radius*1.7} y={point.y-radius*1.65}
                 fontSize={font*.67} fontWeight={active?'800':'600'} stroke="#fff" strokeWidth=".75"
                 paintOrder="stroke" fill={color} pointerEvents="none">{`P${point.index+1}`}</text>}
               <circle cx={point.x} cy={point.y} r={Math.max(2.15,radius*2.2)} fill="transparent"
                 role="button" tabIndex={0}
                 data-grade-draggable={String(dragGradePoints&&!disabled&&size===selectedSize&&size!==result.baseSize)}
                 aria-label={`Inspect ${block.pieceName||block.pieceId}, point ${point.index+1}, size ${size}`}
                 onPointerDown={event=>{
                   if(!startDrag(event,block.pieceId,size,point,result.baseSize)){event.stopPropagation();event.preventDefault()}
                 }}
                 onPointerMove={moveDrag}
                 onPointerUp={event=>endDrag(event,false)}
                 onPointerCancel={event=>endDrag(event,true)}
                 onClick={event=>{
                   event.stopPropagation()
                   if(!pointer.current){
                     onSelectPiece?.(block.pieceId);onSelectGradePoint?.(block.pieceId,point.index)
                     onSelectSize?.(size)
                   }
                 }}
                 onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();onSelectPiece?.(block.pieceId);onSelectGradePoint?.(block.pieceId,point.index);onSelectSize?.(size)}}}>
                 <title>{position}</title>
               </circle>
             </g>
           })}
         </g>
       })}
       {showVectors&&selectedBlock&&focused!==null&&<g data-grade-selected-point-vector={`${block.pieceId}:${focused}`} pointerEvents="none">
         {block.sizes.map(({size,points},index)=>{
           const to=points.find(point=>point.index===focused)
           const base=block.sizes.find(row=>row.size===result.baseSize)?.points.find(point=>point.index===focused)
           if(!to||!base||size===result.baseSize)return null
           const col=PALETTE[index%PALETTE.length]
           return <g key={size} data-grade-motion-vector={`${block.pieceId}:${size}:${focused}`}>
             <line x1={base.x} y1={base.y} x2={to.x} y2={to.y}
               stroke={col} strokeWidth="1.05" strokeDasharray="2 2" vectorEffect="non-scaling-stroke"/>
             <circle cx={to.x} cy={to.y} r={radius*.65} fill={col}/>
             <title>{`${size} · P${focused+1} · ΔX ${fmt(to.dxCm)} cm · ΔY ${fmt(to.dyCm)} cm`}</title>
           </g>
         })}
       </g>}
     </g>
   })}
   {dragPreview&&<g data-grade-point-drag-preview={`${dragPreview.block}:${dragPreview.size}:P${dragPreview.index+1}`}
     pointerEvents="none">
     <path d={`M${dragPreview.x-dragPreview.dxCm} ${dragPreview.y+dragPreview.dyCm}L${dragPreview.x} ${dragPreview.y}`}
       stroke="#df6a16" strokeWidth="1.2" strokeDasharray="2 1" vectorEffect="non-scaling-stroke"/>
     <circle cx={dragPreview.x} cy={dragPreview.y} r={radius*2.4} fill="#fff0a0"
       stroke="#c95717" strokeWidth="1.4" vectorEffect="non-scaling-stroke"/>
     <text x={dragPreview.x+radius*3} y={dragPreview.y-radius*2.2} fontSize={font*.8}
       fill="#8d3c12" stroke="white" strokeWidth="1.1" paintOrder="stroke">
       {`P${dragPreview.index+1} · ΔX ${fmt(dragPreview.dxCm)} · ΔY ${fmt(dragPreview.dyCm)} cm`}
     </text>
   </g>}
 </g>
}
