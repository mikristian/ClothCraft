import React, {useEffect, useState} from 'react'
import './AccuMarkConstraintControls.css'

const labels={'match-length':'Match line length','keep-angle':'Keep angle','parallel':'Parallel edge','intersect':'Intersect perimeter'}
const fmt=(p,i)=>`P${i+1}${p.label?' · '+p.label:''}`

/** Single-point constrained transform editor; caller runs the project-level solver. */
export default function AccuMarkConstraintControls({selectedPiece,grading,allPieces=[],onApply,focusOperation,disabled=false}){
 const [kind,setKind]=useState('match-length')
 const [mode,setMode]=useState('xy')
 const [pointIndex,setPointIndex]=useState('')
 const [anchorIndex,setAnchorIndex]=useState('')
 const [referencePieceId,setReferencePieceId]=useState('')
 const [referenceStartIndex,setReferenceStartIndex]=useState('')
 const [referenceEndIndex,setReferenceEndIndex]=useState('')
 const [edgePieceId,setEdgePieceId]=useState('')
 const [edgeStartIndex,setEdgeStartIndex]=useState('')
 const [edgeEndIndex,setEdgeEndIndex]=useState('')
 const [lineIndex,setLineIndex]=useState('')
 const [error,setError]=useState('')
 const [notice,setNotice]=useState('')
 const pieces=Array.isArray(allPieces)?allPieces:[]
 const selected=selectedPiece?.id ? selectedPiece : null
 const available=selected&&pieces.some(p=>p.id===selected.id)?pieces:[...(selected?[selected]:[]),...pieces.filter(p=>p.id!==selected?.id)]
 const refPiece=available.find(p=>p.id===referencePieceId)||selected
 const edgePiece=available.find(p=>p.id===edgePieceId)||selected
 const isIntersect=kind==='intersect'
 const modes=isIntersect?[['x','Move X, lock Y'],['y','Move Y, lock X']]:
  kind==='match-length'?[['xy','Scale direction (XY)'],['x','Move X only'],['y','Move Y only'],['projected','Projected extension']]:
  [['xy','Rotate direction (XY)'],['x','Move X only'],['y','Move Y only']]
 useEffect(()=>{setPointIndex('');setAnchorIndex('');setReferencePieceId('');setReferenceStartIndex('');setReferenceEndIndex('');setEdgePieceId('');setEdgeStartIndex('');setEdgeEndIndex('');setLineIndex('');setError('');setNotice('')},[selected?.id])
 useEffect(()=>{setMode(isIntersect?'x':'xy');setError('');setNotice('')},[kind])
 useEffect(()=>{if(['match-length','keep-angle','parallel','intersect'].includes(focusOperation))setKind(focusOperation)},[focusOperation])
 const selectIndex=(name,value,points)=> <label key={name}>{name}<select aria-label={name} value={value} disabled={disabled||!points?.length} onChange={e=>({
  'Moving point':setPointIndex,'Anchor point':setAnchorIndex,'Reference start':setReferenceStartIndex,'Reference end':setReferenceEndIndex,
  'Perimeter start':setEdgeStartIndex,'Perimeter end':setEdgeEndIndex
 })[name](e.target.value)}><option value="">Choose point</option>{(points||[]).map((p,i)=><option key={p.id||i} value={i}>{fmt(p,i)}</option>)}</select></label>
 const parse=(value,label,piece)=>{
  if(!/^(0|[1-9]\d*)$/.test(value))throw new Error(`Choose ${label.toLowerCase()}.`)
  const idx=Number(value)
  if(!piece?.points||idx>=piece.points.length)throw new Error(`${label} is outside the selected piece.`)
  return idx
 }
 const apply=()=>{
  setError('');setNotice('')
  try{
   if(disabled)throw new Error('Constraint controls are disabled.')
   if(!selected?.id||!selected.points?.length)throw new Error('Select a pattern piece with points.')
   if(typeof onApply!=='function')throw new Error('Constraint application is unavailable.')
   const sizes=grading?.sizes
   if(!Array.isArray(sizes)||sizes.length<2||new Set(sizes).size!==sizes.length||!sizes.includes(grading?.baseSize))throw new Error('Configure at least two unique grading sizes and a valid base size.')
   if(selected.curves&&Object.keys(selected.curves).length)throw new Error('Curved target pieces are not supported by this single-point solver.')
   const moving=parse(pointIndex,'Moving point',selected)
   const spec={kind,pieceId:selected.id,pointIndex:moving,mode}
   if(isIntersect){
    const edge=edgePiece||selected
    spec.edgePieceId=edge.id
    spec.edgeStartIndex=parse(edgeStartIndex,'Perimeter start',edge)
    spec.edgeEndIndex=parse(edgeEndIndex,'Perimeter end',edge)
    if(spec.edgeStartIndex===spec.edgeEndIndex)throw new Error('Choose two different perimeter endpoints.')
    if(edge.id===selected.id&&[spec.edgeStartIndex,spec.edgeEndIndex].includes(moving))throw new Error('Moving point cannot also be a perimeter endpoint.')
    if(lineIndex!==''){
     if(!/^(0|[1-9]\d*)$/.test(lineIndex)||Number(lineIndex)>=(selected.internalLines?.length||0))throw new Error('Choose a valid internal line.')
     spec.lineIndex=Number(lineIndex)
    }
   }else{
    const reference=refPiece||selected
    spec.anchorIndex=parse(anchorIndex,'Anchor point',selected)
    spec.referencePieceId=reference.id
    spec.referenceStartIndex=parse(referenceStartIndex,'Reference start',reference)
    spec.referenceEndIndex=parse(referenceEndIndex,'Reference end',reference)
    if(spec.anchorIndex===moving)throw new Error('Anchor and moving point must differ.')
    if(spec.referenceStartIndex===spec.referenceEndIndex)throw new Error('Reference endpoints must differ.')
    if(reference.id===selected.id&&[spec.referenceStartIndex,spec.referenceEndIndex].includes(moving))throw new Error('Moving point cannot also be a reference endpoint.')
   }
   const result=onApply(spec)
   if(result&&typeof result.then==='function')result.then(()=>setNotice('Constraint submitted.')).catch(e=>setError(e?.message||String(e)))
   else setNotice('Constraint submitted. Verify residuals across all sizes.')
  }catch(e){setError(e?.message||String(e))}
 }
 return <section className="exo-accu-constraint" aria-label="AccuMark single-point constrained transform">
  <strong>Single-point constrained transform</strong>
  <p>Adjust one selected vertex with a graded rule across every named size. Coordinates use centimeters. Each operation is independent.</p>
  <fieldset disabled={disabled||!selected}>
   <label>Constraint operation<select aria-label="Constraint operation" value={kind} onChange={e=>setKind(e.target.value)}>{Object.entries(labels).map(([k,label])=><option key={k} value={k}>{label}</option>)}</select></label>
   {selectIndex('Moving point',pointIndex,selected?.points)}
   {!isIntersect&&<>
    {selectIndex('Anchor point',anchorIndex,selected?.points)}
    <label>Reference piece<select aria-label="Reference piece" value={referencePieceId||selected?.id||''} onChange={e=>{setReferencePieceId(e.target.value);setReferenceStartIndex('');setReferenceEndIndex('')}}>{available.map(p=><option key={p.id} value={p.id}>{p.name||p.id}</option>)}</select></label>
    {selectIndex('Reference start',referenceStartIndex,refPiece?.points)}
    {selectIndex('Reference end',referenceEndIndex,refPiece?.points)}
   </>}
   {isIntersect&&<>
    <label>Perimeter piece<select aria-label="Perimeter piece" value={edgePieceId||selected?.id||''} onChange={e=>{setEdgePieceId(e.target.value);setEdgeStartIndex('');setEdgeEndIndex('')}}>{available.map(p=><option key={p.id} value={p.id}>{p.name||p.id}</option>)}</select></label>
    {selectIndex('Perimeter start',edgeStartIndex,edgePiece?.points)}
    {selectIndex('Perimeter end',edgeEndIndex,edgePiece?.points)}
    <label>Internal line (optional)<select aria-label="Internal line" value={lineIndex} onChange={e=>setLineIndex(e.target.value)}><option value="">No line check</option>{(selected?.internalLines||[]).map((line,i)=><option key={line.id||i} value={i}>Line {i+1}</option>)}</select></label>
   </>}
   <label>Transform mode<select aria-label="Transform mode" value={modes.some(([m])=>m===mode)?mode:modes[0][0]} onChange={e=>setMode(e.target.value)}>{modes.map(([m,label])=><option key={m} value={m}>{label}</option>)}</select></label>
   <button type="button" onClick={apply} disabled={disabled||!selected||typeof onApply!=='function'}>Apply single-point constraint</button>
  </fieldset>
  {!selected&&<p role="status">Select a pattern piece to enable constraints.</p>}
  {error&&<p className="exo-accu-constraint-error" role="alert">{error}</p>}
  {!error&&notice&&<p role="status">{notice}</p>}
 </section>
}
