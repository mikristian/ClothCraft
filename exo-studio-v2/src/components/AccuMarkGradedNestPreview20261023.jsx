import React,{useEffect,useMemo,useState} from 'react'
import {buildAccuMarkRestackedNest} from '../core/accumarkRestackedNestPreview20261023.js'
import {buildAccuMarkTwoPointRestack20261023} from '../core/accumarkTwoPointRestack20261023.js'
import './AccuMarkEngineeringControls.css'

const SIZE_COLORS=['#48a4d7','#ce829c','#73b996','#dcac5c','#9c8be0','#e28164','#68baca','#a5b65b']
const f=n=>Number(n.toFixed(3))
const path=points=>points.map(p=>`${f(p.x)},${f(p.y)}`).join(' ')

/** An honest physical all-size overlay. Stack On changes only the viewport
 * coordinate frame, never saved grade rules or manufacturing contours. */
export default function AccuMarkGradedNestPreview20261023({project,piece,disabled=false}){
 const [expanded,setExpanded]=useState(false)
 const [mode,setMode]=useState('absolute')
 const [pointIndex,setPointIndex]=useState('0')
 const [secondPointIndex,setSecondPointIndex]=useState('1')
 const [chosen,setChosen]=useState('all')
 useEffect(()=>{setPointIndex('0');setSecondPointIndex('1');setMode('absolute');setChosen('all')},[piece?.id])
 const inspected=useMemo(()=>{
  if(!expanded||!project||!piece)return {nest:null,error:''}
  try{return {nest:mode==='two-point'?
    buildAccuMarkTwoPointRestack20261023(project,{pieceId:piece.id,primaryIndex:Number(pointIndex),secondaryIndex:Number(secondPointIndex)}):
    buildAccuMarkRestackedNest(project,{pieceId:piece.id,pointIndex:Number(pointIndex),mode}),error:''}}
  catch(e){return {nest:null,error:e.message||String(e)}}
 },[expanded,project,piece?.id,pointIndex,secondPointIndex,mode])
 const nest=inspected.nest
 const padding=nest?Math.max(nest.bounds.maxX-nest.bounds.minX,nest.bounds.maxY-nest.bounds.minY)*.07:0
 const view=nest?[
  f(nest.bounds.minX-padding),f(nest.bounds.minY-padding),
  f(nest.bounds.maxX-nest.bounds.minX+2*padding),f(nest.bounds.maxY-nest.bounds.minY+2*padding),
 ].join(' '):'0 0 100 100'
 const strokeWidth=nest?Math.max(.09,Math.min(.4,(nest.bounds.maxX-nest.bounds.minX)*.003)):0.2
 return <section className="exo-accu-engine-controls" aria-label="Graded pattern outlines and restacking inspection">
  <details onToggle={event=>setExpanded(event.currentTarget.open)}>
   <summary>All-Size Grade Nest · Visual restack at a point</summary>
   <fieldset disabled={disabled||!piece}>
    <p>Compare graded stitch boundaries. One-point stack translates every size. Two-point registration aligns a selected direction with rigid rotation, never scales the physical outline, and reports remaining grade-growth distance.</p>
    <div className="exo-engine-row">
     <label>Display mode<select aria-label="Graded nest display mode" value={mode} onChange={e=>setMode(e.target.value)}>
      <option value="absolute">Physical position · Stack Off</option>
      <option value="stack">Align reference point · Stack On</option>
      <option value="two-point">Two-point directional registration (rigid)</option>
     </select></label>
     <label>Stack point<select aria-label="Graded nest anchor point" value={pointIndex} onChange={e=>setPointIndex(e.target.value)}>
      {(piece?.points||[]).map((p,index)=><option key={p.id||index} value={index}>P{index+1}{p.industrialGradeRule?' · graded':''}</option>)}
     </select></label>
    </div>
    {mode==='two-point'&&<label>Second direction point<select aria-label="Two-point restack secondary grade point"
      value={secondPointIndex} onChange={event=>setSecondPointIndex(event.target.value)}>
      {(piece?.points||[]).map((point,index)=><option key={point.id||index} value={index}>
        P{index+1}{index===Number(pointIndex)?' · choose different point':''}
      </option>)}
    </select></label>}
    <label>Show sizes<select aria-label="Graded nest visible sizes" value={chosen} onChange={e=>setChosen(e.target.value)}>
     <option value="all">All sizes</option>
     {(project?.grading?.sizes||[]).map(size=><option key={size} value={size}>{size} with reference base</option>)}
    </select></label>
   </fieldset>
   {inspected.error&&<p role="alert" className="exo-engine-error">{inspected.error}</p>}
   {nest&&<div style={{padding:'6px 10px 12px'}}>
    <svg role="img" aria-label={`${piece.name||piece.id} ${mode==='two-point'?'rigid two-point registration':mode==='stack'?'restacked':'physical'} pattern outlines across ${nest.sizeLine.length} sizes`}
     viewBox={view} style={{width:'100%',height:220,border:'1px solid var(--exo-border, #484848)',borderRadius:6,background:'#171c22'}} preserveAspectRatio="xMidYMid meet">
     {nest.outlines.map((outline,index)=>{
      if(chosen!=='all'&&outline.size!==chosen&&outline.size!==nest.baseSize)return null
      return <polyline key={outline.size} points={path(outline.points)} fill="none" stroke={SIZE_COLORS[index%SIZE_COLORS.length]}
       strokeWidth={outline.size===nest.baseSize?strokeWidth*1.8:strokeWidth} opacity={outline.size===nest.baseSize?1:.84}
       strokeLinejoin="round" strokeLinecap="round"/>
     })}
     {mode!=='absolute'&&nest.outlines.length>0&&<circle cx={nest.outlines[0].anchorCm.x} cy={nest.outlines[0].anchorCm.y} r={strokeWidth*3} fill="#fff" opacity=".9"/>}
     {mode==='two-point'&&nest.outlines.map((outline,index)=><circle key={outline.size}
       cx={outline.secondAnchorCm.x} cy={outline.secondAnchorCm.y}
       r={strokeWidth*2.7} stroke={SIZE_COLORS[index%SIZE_COLORS.length]}
       strokeWidth={strokeWidth*.8} fill="none">
       <title>{`${outline.size} second-anchor physical residual ${outline.secondaryResidualCm.toFixed(3)} cm`}</title>
     </circle>)}
    </svg>
    <div style={{display:'flex',flexWrap:'wrap',gap:'5px 12px',fontSize:10,marginTop:8}}>
     {nest.outlines.map((outline,i)=><span key={outline.size} style={{opacity:chosen==='all'||chosen===outline.size||outline.size===nest.baseSize?1:.35}}>
      <span style={{color:SIZE_COLORS[i%SIZE_COLORS.length]}}>●</span> {outline.size}{outline.size===nest.baseSize?' (base)':''}
     </span>)}
    </div>
    {mode==='two-point'&&<div style={{overflowX:'auto',marginTop:8}}>
      <table aria-label="Two-point graded directional residual by size" style={{width:'100%',fontSize:10,fontVariantNumeric:'tabular-nums'}}>
        <thead><tr><th>Size</th><th>Base span cm</th><th>Grade span cm</th><th>Second-anchor residual cm</th></tr></thead>
        <tbody>{nest.outlines.map(outline=><tr key={outline.size}>
          <td>{outline.size}</td><td>{outline.baseAnchorDistanceCm.toFixed(3)}</td>
          <td>{outline.originalAnchorDistanceCm.toFixed(3)}</td>
          <td>{outline.secondaryResidualCm.toFixed(3)}</td>
        </tr>)}</tbody>
      </table>
    </div>}
    <small style={{display:'block',marginTop:7}}>Display-only physical centimetre overlay. Two-point mode uses rigid translation/rotation without scaling any graded contour. Second-anchor mismatch is real size growth, not a defect to hide. No cutting geometry, sewing data or exports are changed.</small>
   </div>}
  </details>
 </section>
}
