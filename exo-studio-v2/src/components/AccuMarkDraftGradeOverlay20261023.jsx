import React from 'react'
import './AccuMarkDraftGradeOverlay20261023.css'

const finite=n=>typeof n==='number'&&Number.isFinite(n)
const coord=(point,layout)=>({x:layout.x+point.x,y:layout.y-point.y})
const sizeColors=['#427fc0','#bf6b3d','#58895e','#8259a4','#ae8a38','#b15d87','#44918d','#906e53']
const fmt=n=>(n>=0?'+':'')+n.toFixed(2)

/** Accurate, non-mutating 2D grade nest annotations in centimeters.
 * Base and sized vertices are always taken from the actual graded geometry.
 * A selected grade vertex reveals individual size changes directly in place.
 */
export default function AccuMarkDraftGradeOverlay20261023({
  sourcePiece,previewPiece,sizes=[],gradeNestProjects=[],previewSize,
  selectedPointIndex=null,onSelectPoint=()=>{},showNest=true,viewWidth=330,
}){
 if(!sourcePiece?.points?.length||!previewPiece?.points?.length||
    sourcePiece.id!==previewPiece.id||
    sourcePiece.points.length!==previewPiece.points.length)return null
 const layout=previewPiece.layout2d
 if(!layout||!finite(layout.x)||!finite(layout.y))return null
 const base=sourcePiece.points,points=previewPiece.points
 if(![...base,...points].every(p=>finite(p.x)&&finite(p.y)))return null
 const pointSize=Math.max(.7,Math.min(2.2,viewWidth/280))
 const labelSize=Math.max(1.5,Math.min(4,viewWidth/115))
 const focus=Number.isInteger(selectedPointIndex)&&selectedPointIndex>=0&&selectedPointIndex<points.length?selectedPointIndex:null
 const graded=gradeNestProjects.slice(0,24).map((project,i)=>{
  const piece=project?.pieces?.find(p=>p.id===previewPiece.id)
  if(!piece||piece.points?.length!==points.length||!piece.layout2d)return null
  if(piece.points.some(p=>!finite(p.x)||!finite(p.y)))return null
  return {piece,size:project.previewSize||sizes[i]||String(i+1),index:i}
 }).filter(Boolean)
 const selectedPoint=focus===null?null:points[focus]
 const sourcePoint=focus===null?null:base[focus]
 const baseCoord=sourcePoint?coord(sourcePoint,sourcePiece.layout2d||layout):null
 const sizeCoord=selectedPoint?coord(selectedPoint,layout):null
 const delta=sourcePoint&&selectedPoint?{dx:selectedPoint.x-sourcePoint.x,dy:selectedPoint.y-sourcePoint.y}:null
 const hasDelta=delta&&Math.hypot(delta.dx,delta.dy)>1e-6
 return <g data-accumark-pattern-grade-overlay={previewPiece.id} aria-label={`Grading vertices of ${previewPiece.name||previewPiece.id}`}>
  <g data-grade-point-selectors="true">
   {points.slice(0,512).map((point,index)=>{
    const at=coord(point,layout),chosen=focus===index
    return <g key={index} data-grade-vertex={`${previewPiece.id}:${index}`}>
     <circle cx={at.x} cy={at.y} r={chosen?pointSize*2.1:pointSize*1.3}
       fill={chosen?'#fcdc83':'#e8f4fd'} stroke={chosen?'#bd5325':'#276e99'}
       strokeWidth={chosen?.8:.46} className="exo-grade-vertex-visible" pointerEvents="none"/>
     <circle cx={at.x} cy={at.y} r={Math.max(2.5,pointSize*3.1)}
       fill="transparent" className="exo-grade-vertex-hit"
       role="button" aria-label={`Inspect grading point ${index+1}, size ${previewSize}`}
       onPointerDown={event=>{event.stopPropagation();event.preventDefault();onSelectPoint(index)}}
       onClick={event=>{event.stopPropagation();onSelectPoint(index)}}>
       <title>{`Point ${index+1} · ${previewSize}`}</title>
     </circle>
     {(chosen||points.length<=24)&&<text x={at.x+pointSize*1.7} y={at.y-pointSize}
       className="exo-grade-point-number" fontSize={labelSize*.66}
       pointerEvents="none">{index+1}</text>}
    </g>
   })}
  </g>
  {focus!==null&&baseCoord&&sizeCoord&&<g pointerEvents="none" data-grade-point-inspector={focus}>
   {hasDelta&&<><path d={`M ${baseCoord.x} ${baseCoord.y} L ${sizeCoord.x} ${sizeCoord.y}`}
      fill="none" stroke="#a64d2d" strokeWidth={.85}
      strokeDasharray="3 1.5" vectorEffect="non-scaling-stroke"/>
     <circle cx={baseCoord.x} cy={baseCoord.y} r={pointSize*1.3}
       fill="#fff" stroke="#b04d32" strokeWidth=".8" vectorEffect="non-scaling-stroke"/>
    </>}
   <g transform={`translate(${sizeCoord.x+pointSize*3.5} ${sizeCoord.y-pointSize*5})`}
      data-grade-point-delta={`${fmt(delta.dx)},${fmt(delta.dy)}`}>
    <rect x="-1" y={-labelSize*1.15} rx=".7" width={labelSize*14.5} height={labelSize*3.65}
       fill="#fdf8e8" stroke="#b09b75" strokeWidth=".35"/>
    <text x={labelSize*.6} y="0" fontSize={labelSize*.85} fontWeight="700"
      fill="#503a28">{`P${focus+1} · ${previewSize}`}</text>
    <text x={labelSize*.6} y={labelSize*1.32} fontSize={labelSize*.72}
      fill="#55493e">{`X ${fmt(delta.dx)}  Y ${fmt(delta.dy)} cm`}</text>
   </g>
  </g>}
  {focus!==null&&showNest&&graded.length>0&&<g pointerEvents="none" data-grade-nest-point-readouts={String(graded.length)}>
    {graded.map(({piece,size,index})=>{
     const at=coord(piece.points[focus],piece.layout2d),color=sizeColors[index%sizeColors.length]
     return <g key={size} data-grade-size-point={`${size}:${focus}`}>
      <circle cx={at.x} cy={at.y} r={pointSize*1.6}
        fill="#fffdf8" stroke={color} strokeWidth=".95" vectorEffect="non-scaling-stroke"/>
      <text x={at.x+pointSize*2.15} y={at.y-pointSize*1.3-index%2*labelSize*.45}
        fontSize={labelSize*.65} fill={color} fontWeight="700">{size}</text>
     </g>
    })}
  </g>}
 </g>
}
