import React,{useEffect,useState} from 'react'
import './AccuMarkEngineeringControls.css'

const number=(value)=>value===''?NaN:Number(value)
const fmt=(index)=>'P'+String(index+1).padStart(2,'0')
const option=(point,index)=><option value={index} key={point.id||index}>{fmt(index)}{point.label?' · '+point.label:''}</option>

/** Executable point-rule and restricted straight-edge drafting operations.
 * Validation and all-size mutation take place in the core, never here.
 */
export default function AccuMarkEngineeringControls({piece,grading,onApplyGrade,onApplyDraft,focusOperation,disabled=false}){
 const gradeDetails=React.useRef(null),draftDetails=React.useRef(null)
 const sizes=grading?.sizes||[]
 const [pointIndex,setPointIndex]=useState(0)
 const [edgeIndex,setEdgeIndex]=useState(0)
 const [offsets,setOffsets]=useState({})
 const [normal,setNormal]=useState('1')
 const [smoothStrength,setSmoothStrength]=useState('.5')
 const [newSize,setNewSize]=useState('')
 const [afterSize,setAfterSize]=useState('')
 const [draftKind,setDraftKind]=useState('alter.local')
 const [draftIndices,setDraftIndices]=useState('0')
 const [protectedIndices,setProtectedIndices]=useState('')
 const [dx,setDx]=useState('0')
 const [dy,setDy]=useState('0')
 const [angle,setAngle]=useState('5')
 const [pivotIndex,setPivotIndex]=useState('0')
 const [dartA,setDartA]=useState('1')
 const [dartB,setDartB]=useState('2')
 const [error,setError]=useState('')
 useEffect(()=>{setPointIndex(0);setEdgeIndex(0);setOffsets({});setAfterSize(grading?.baseSize||sizes[0]||'');setError('')},[piece?.id,grading?.baseSize,JSON.stringify(sizes)])
 useEffect(()=>{
  if(!focusOperation)return
  if(['offset','smooth','distribute'].includes(focusOperation)){if(gradeDetails.current)gradeDetails.current.open=true}
  if(['alter.local','dart.pivot','fullness.spread'].includes(focusOperation)){setDraftKind(focusOperation);if(draftDetails.current)draftDetails.current.open=true}
 },[focusOperation])
 const points=piece?.points||[]
 const chosen=Math.max(0,Math.min(pointIndex,points.length-1))
 const edge=Math.max(0,Math.min(edgeIndex,points.length-1))
 const execute=(task)=>{
  try{setError('');task()}catch(e){setError(e.message||String(e))}
 }
 const callGrade=(operation,spec)=>execute(()=>{
  if(!piece)throw Error('Select a pattern piece first')
  if(typeof onApplyGrade!=='function')throw Error('Grading engine unavailable')
  onApplyGrade(operation,{pieceId:piece.id,pointIndex:chosen,...spec})
 })
 const applyOffset=()=>callGrade('offset',{edgeIndex:edge,direction:number(normal),offsetsCm:sizes.map(size=>number(offsets[size]??'0'))})
 const applySize=()=>execute(()=>{
  if(!newSize.trim())throw Error('Enter a new unique size label')
  if(sizes.includes(newSize.trim()))throw Error('This size already exists')
  const idx=sizes.indexOf(afterSize)
  if(idx<0||idx>=sizes.length-1)throw Error('Choose a size before the final size')
  const oldPositions=sizes.map((size,i)=>({size,position:i}))
  const newPositions=[...oldPositions]
  newPositions.splice(idx+1,0,{size:newSize.trim(),position:idx+.5})
  onApplyGrade('redistribute-size-line',{oldPositions,newPositions})
  setNewSize('')
 })
 const parseIndices=(text,label)=>text.trim()?text.split(',').map(token=>{
  const s=token.trim()
  if(!/^\d+$/.test(s))throw Error(label+' must use comma-separated point indices (0, 1, 2)')
  return Number(s)
 }):[]
 const applyDraft=()=>execute(()=>{
  if(!piece||!onApplyDraft)throw Error('Select a pattern piece first')
  const indices=parseIndices(draftIndices,'Selected vertices')
  const protectedSet=parseIndices(protectedIndices,'Protected vertices')
  const spec={kind:draftKind,pieceId:piece.id,indices,protectedIndices:protectedSet}
  if(draftKind==='alter.local'){spec.dxCm=number(dx);spec.dyCm=number(dy)}
  if(draftKind==='fullness.spread'){spec.pivotIndex=number(pivotIndex);spec.angleDeg=number(angle)}
  if(draftKind==='dart.pivot'){
   const apex=points[Number(pivotIndex)]
   if(!apex)throw Error('Choose a valid dart apex')
   spec.apex={x:apex.x,y:apex.y}
   spec.legIndices=[number(dartA),number(dartB)]
   spec.angleDeg=number(angle)
  }
  onApplyDraft(spec)
 })
 return <div className="exo-accu-engine-controls" aria-label="Engineering grade and pattern transforms" data-accumark-engineering-controls="true">
  <details ref={gradeDetails}><summary>Advanced grading operations · run on all sizes</summary>
   <fieldset disabled={disabled||!piece||points.length<3}>
    <div className="exo-engine-row"><label>Point<select aria-label="Engineering grade point" value={chosen} onChange={e=>setPointIndex(Number(e.target.value))}>{points.map(option)}</select></label>
      <label>Reference edge<select aria-label="Offset reference edge" value={edge} onChange={e=>setEdgeIndex(Number(e.target.value))}>{points.map((p,i)=><option key={i} value={i}>Edge {i+1}</option>)}</select></label></div>
    <p>Offset grading: signed centimetres along the selected edge’s normal. Base size must be 0.</p>
    <div className="exo-engine-size-inputs">{sizes.map(size=><label key={size}>{size}<input aria-label={`Offset ${size} centimeters`} type="number" step=".1" value={offsets[size]??'0'} onChange={e=>setOffsets(s=>({...s,[size]:e.target.value}))}/></label>)}</div>
    <div className="exo-engine-row"><label>Normal<select aria-label="Offset normal direction" value={normal} onChange={e=>setNormal(e.target.value)}><option value="1">Left normal</option><option value="-1">Right normal</option></select></label><button type="button" onClick={applyOffset}>Apply Offset</button></div>
    <div className="exo-engine-row"><button type="button" onClick={()=>callGrade('distribute',{})}>Distribute Grade</button><label>Smoothing strength<input type="number" aria-label="Grade smoothing strength" min="0" max="1" step=".1" value={smoothStrength} onChange={e=>setSmoothStrength(e.target.value)}/></label><button type="button" onClick={()=>callGrade('smooth',{strength:number(smoothStrength)})}>Smooth Grade</button></div>
    <p>Insert a size between two existing sizes. Every point must already carry a complete industrial grade rule.</p>
    <div className="exo-engine-row"><label>New size<input aria-label="New graded size name" placeholder="e.g. ML" value={newSize} onChange={e=>setNewSize(e.target.value)}/></label>
      <label>After<select aria-label="Insert after size" value={afterSize} onChange={e=>setAfterSize(e.target.value)}>{sizes.slice(0,-1).map(s=><option key={s} value={s}>{s}</option>)}</select></label>
      <button type="button" onClick={applySize}>Insert Size</button></div>
   </fieldset>
  </details>
  <details ref={draftDetails}><summary>Pattern engineering · restricted straight-edge geometry</summary>
   <fieldset disabled={disabled||!piece||points.length<3}>
    <p>Selected vertex indices are zero-based. Pattern changes require valid closed contours, preserve original geometry through Undo, and reject unsupported attached marks and curves.</p>
    <label>Operation<select aria-label="Pattern engineering operation" value={draftKind} onChange={e=>setDraftKind(e.target.value)}>
     <option value="alter.local">Alter selected vertices</option>
     <option value="fullness.spread">Slash / spread selection about pivot</option>
     <option value="dart.pivot">Rotate dart sector about apex</option>
    </select></label>
    <label>Vertex indices<input aria-label="Pattern engineering vertex indices" value={draftIndices} onChange={e=>setDraftIndices(e.target.value)} placeholder="0,1"/></label>
    <label>Protected vertex indices<input aria-label="Protected pattern vertices" value={protectedIndices} onChange={e=>setProtectedIndices(e.target.value)} placeholder="Optional: 2,3"/></label>
    {draftKind==='alter.local'?<div className="exo-engine-row"><label>X (cm)<input aria-label="Local alteration X centimeters" type="number" step=".1" value={dx} onChange={e=>setDx(e.target.value)}/></label><label>Y (cm)<input aria-label="Local alteration Y centimeters" type="number" step=".1" value={dy} onChange={e=>setDy(e.target.value)}/></label></div>:<>
      <div className="exo-engine-row"><label>{draftKind==='dart.pivot'?'Apex point':'Pivot point'}<select aria-label="Pattern pivot point" value={pivotIndex} onChange={e=>setPivotIndex(e.target.value)}>{points.map(option)}</select></label>
        <label>Angle (°)<input aria-label="Pattern rotation degrees" type="number" step=".5" value={angle} onChange={e=>setAngle(e.target.value)}/></label></div>
      {draftKind==='dart.pivot'&&<div className="exo-engine-row"><label>Dart leg A<select aria-label="Dart leg A" value={dartA} onChange={e=>setDartA(e.target.value)}>{points.map(option)}</select></label><label>Dart leg B<select aria-label="Dart leg B" value={dartB} onChange={e=>setDartB(e.target.value)}>{points.map(option)}</select></label></div>}
    </>}
    <button type="button" onClick={applyDraft}>Apply Pattern Operation</button>
   </fieldset>
  </details>
  {error&&<p role="alert" className="exo-engine-error">{error}</p>}
  <small>These are bounded editing operations, not general-purpose curved-pattern or certified production transformations.</small>
 </div>
}
