import React,{useEffect,useMemo,useState} from 'react'
import {readAccuMarkGradeDeltaMatrix} from '../core/accumarkNumericGradeDelta20261023.js'
import './AccuMarkEngineeringControls.css'

// Both controls use authored piece IDs and zero-based stable current vertex
// indices. Mutating operations are performed by the parent's undoable commit.
const numeric=text=>text.trim()!==''&&Number.isFinite(Number(text))
const names=points=>points.map((p,index)=><option key={p.id||index} value={index}>P{index+1}{p.industrialGradeRule?' · graded':''}</option>)
const readIndices=text=>{
 const fields=text.split(',').map(part=>part.trim())
 if(!fields.length||fields.some(part=>!/^\d+$/.test(part)))throw Error('Enter comma-separated nonnegative point indices, e.g. 0,2,3')
 const indices=fields.map(Number)
 if(new Set(indices).size!==indices.length)throw Error('Remove repeated destination point indices')
 if(indices.length>64)throw Error('Select no more than 64 destinations per batch')
 return indices
}

/** AccuMark textbook exercises 19.5/19.6/19.4/19.9. Numeric edits and
 * multi-point grade transfers are separate atomic project transactions. */
export default function AccuMarkGradingPrecisionControls20261023({
 project,piece,onEditDelta,onCopyBatch,disabled=false,focusedGradePoint=null,previewSize=null,
}){
 const [pointIndex,setPointIndex]=useState('0')
 const [size,setSize]=useState('')
 const [mode,setMode]=useState('cumulative')
 const [maintain,setMaintain]=useState(false)
 const [x,setX]=useState('0'),[y,setY]=useState('0')
 const [deltaMessage,setDeltaMessage]=useState('')
 const [srcPieceId,setSrcPieceId]=useState('')
 const [srcIndex,setSrcIndex]=useState('0')
 const [dstPieceId,setDstPieceId]=useState('')
 const [targets,setTargets]=useState('0')
 const [axis,setAxis]=useState('both')
 const [batchMessage,setBatchMessage]=useState('')
 const pieces=project?.pieces||[]
 const picked=Math.min(Math.max(0,Number(pointIndex)||0),Math.max(0,(piece?.points?.length||1)-1))
 const matrix=useMemo(()=>{
  if(!project||!piece)return {data:null,error:'Select a pattern piece'}
  try{return {data:readAccuMarkGradeDeltaMatrix(project,{pieceId:piece.id,pointIndex:picked}),error:''}}
  catch(e){return {data:null,error:e.message||String(e)}}
 },[project,piece?.id,picked])
 const sizes=matrix.data?.sizes||project?.grading?.sizes||[]
 const base=matrix.data?.baseSize||project?.grading?.baseSize
 const editSizes=sizes.filter(s=>s!==base)
 const chosenSize=editSizes.includes(size)?size:(editSizes[0]||'')
 const srcPiece=pieces.find(p=>p.id===(srcPieceId||piece?.id))
 const dstPiece=pieces.find(p=>p.id===(dstPieceId||piece?.id))
 const chosenRow=matrix.data?.rows?.find(r=>r.size===chosenSize)
 useEffect(()=>{
  setPointIndex('0');setSize('');setSrcPieceId(piece?.id||'');setDstPieceId(piece?.id||'')
  setSrcIndex('0');setTargets('0');setDeltaMessage('');setBatchMessage('')
 },[piece?.id])
 useEffect(()=>{
  if(!piece||focusedGradePoint?.pieceId!==piece.id||!Number.isInteger(focusedGradePoint.pointIndex)||
    focusedGradePoint.pointIndex<0||focusedGradePoint.pointIndex>=piece.points.length)return
  setPointIndex(String(focusedGradePoint.pointIndex))
  if(previewSize&&previewSize!==base&&sizes.includes(previewSize))setSize(previewSize)
 },[piece?.id,focusedGradePoint?.pieceId,focusedGradePoint?.pointIndex,previewSize,base,sizes.join('|')])
 useEffect(()=>{
  if(!chosenRow||!matrix.data)return
  const index=matrix.data.rows.findIndex(row=>row.size===chosenSize)
  const baseIndex=matrix.data.rows.findIndex(row=>row.size===base)
  const next=index>baseIndex?index-1:index+1
  const neighbor=matrix.data.rows[next]
  const fx=mode==='incremental'&&neighbor?chosenRow.dxCm-neighbor.dxCm:chosenRow.dxCm
  const fy=mode==='incremental'&&neighbor?chosenRow.dyCm-neighbor.dyCm:chosenRow.dyCm
  setX(String(Number(fx.toFixed(6))));setY(String(Number(fy.toFixed(6))))
 },[matrix.data,chosenSize,base,mode])
 const applyDelta=()=>{
  try{
   if(!piece||typeof onEditDelta!=='function')throw Error('Grading editor is unavailable')
   if(!chosenSize||!numeric(x)||!numeric(y))throw Error('Choose a non-base size and enter valid centimetre values')
   const result=onEditDelta({pieceId:piece.id,pointIndex:picked,size:chosenSize,
    dxCm:Number(x),dyCm:Number(y),mode,maintainGrowths:maintain})
   const count=result?.validation?.sizes?.length||0
   setDeltaMessage(`Updated ${chosenSize} X/Y grade movements; ${count} sizes checked. Sew and cut QA remain required.`)
  }catch(e){setDeltaMessage('Grade edit blocked: '+(e.message||String(e)))}
 }
 const applyBatch=()=>{
  try{
   if(typeof onCopyBatch!=='function'||!srcPiece||!dstPiece)throw Error('Choose source and destination pieces')
   const ids=readIndices(targets)
   const spec={source:{pieceId:srcPiece.id,pointIndex:Number(srcIndex)},
    targets:ids.map(index=>({pieceId:dstPiece.id,pointIndex:index})),axis}
   const result=onCopyBatch(spec)
   setBatchMessage(`Copied ${axis.toUpperCase()} grading to ${result?.validation?.targets??ids.length} target points. Review the all-size nest.`)
  }catch(e){setBatchMessage('Batch grade blocked: '+(e.message||String(e)))}
 }
 return <div className="exo-accu-engine-controls" aria-label="Precise and batch grade rule editing">
  <details>
   <summary>Create / Edit Delta · Exact X/Y grade values</summary>
   <fieldset disabled={disabled||!piece}>
    <p>Inspect and edit signed movement in centimetres for each graded size. The base size stays fixed. Values are saved as independent point-rule increments and re-evaluated across the full size run.</p>
    <div className="exo-engine-row">
     <label>Grading point<select aria-label="Edit grade point" value={picked} onChange={e=>setPointIndex(e.target.value)}>{names(piece?.points||[])}</select></label>
     <label>Size<select aria-label="Edit graded size" value={chosenSize} onChange={e=>setSize(e.target.value)}>{editSizes.map(s=><option key={s} value={s}>{s}</option>)}</select></label>
    </div>
    {matrix.error&&<p role="alert" className="exo-engine-error">{matrix.error}</p>}
    {matrix.data&&<div style={{overflowX:'auto'}}>
     <table aria-label="Current X and Y grade movement by size" style={{width:'100%',fontSize:10,fontVariantNumeric:'tabular-nums'}}>
      <thead><tr><th style={{textAlign:'left'}}>Size</th><th>X (cm)</th><th>Y (cm)</th></tr></thead>
      <tbody>{matrix.data.rows.map(row=><tr key={row.size} style={{fontWeight:row.size===chosenSize?'bold':'normal'}}>
       <td>{row.size}{row.size===base?' · base':''}</td><td style={{textAlign:'right'}}>{row.dxCm.toFixed(3)}</td><td style={{textAlign:'right'}}>{row.dyCm.toFixed(3)}</td>
      </tr>)}</tbody>
     </table>
    </div>}
    <label>Value basis<select aria-label="Grading delta value basis" value={mode} onChange={e=>setMode(e.target.value)}>
     <option value="cumulative">Total movement from base</option>
     <option value="incremental">Movement from adjacent size toward base</option>
    </select></label>
    <div className="exo-engine-row">
     <label>X (cm)<input aria-label="New grading X centimeters" type="number" step=".01" value={x} onChange={e=>setX(e.target.value)}/></label>
     <label>Y (cm)<input aria-label="New grading Y centimeters" type="number" step=".01" value={y} onChange={e=>setY(e.target.value)}/></label>
    </div>
    <label style={{flexDirection:'row',alignItems:'center'}}><input style={{height:'auto',width:'auto'}} type="checkbox" checked={maintain} onChange={e=>setMaintain(e.target.checked)}/>Maintain growths toward outer sizes</label>
    <button type="button" onClick={applyDelta} disabled={!matrix.data||!chosenSize}>Apply numeric grading</button>
   </fieldset>
   {deltaMessage&&<p role="status" className="exo-engine-error">{deltaMessage}</p>}
  </details>
  <details>
   <summary>Copy Grade · Multiple points and pieces</summary>
   <fieldset disabled={disabled||!piece}>
    <p>Transfer authored size-by-size grade movements to several selected points in one validated, undoable operation. Source and destination must use compatible size runs.</p>
    <div className="exo-engine-row">
     <label>Source piece<select aria-label="Batch grading source piece" value={srcPieceId||piece?.id||''} onChange={e=>{setSrcPieceId(e.target.value);setSrcIndex('0')}}>{pieces.map(p=><option value={p.id} key={p.id}>{p.name||p.id}</option>)}</select></label>
     <label>Source point<select aria-label="Batch grading source point" value={srcIndex} onChange={e=>setSrcIndex(e.target.value)}>{names(srcPiece?.points||[])}</select></label>
    </div>
    <div className="exo-engine-row">
     <label>Destination piece<select aria-label="Batch grading destination piece" value={dstPieceId||piece?.id||''} onChange={e=>setDstPieceId(e.target.value)}>{pieces.map(p=><option value={p.id} key={p.id}>{p.name||p.id}</option>)}</select></label>
     <label>Transfer<select aria-label="Batch grading axis" value={axis} onChange={e=>setAxis(e.target.value)}>
      <option value="both">X and Y movements</option><option value="x">X movements only</option><option value="y">Y movements only</option>
     </select></label>
    </div>
    <label>Destination point indices<input aria-label="Batch grading destination point indices" value={targets} onChange={e=>setTargets(e.target.value)} placeholder="0,1,4"/></label>
    <small>Available destination points: {(dstPiece?.points||[]).map((_,i)=>`P${i+1}`).join(', ')}. Enter zero-based indices (P1 is 0).</small>
    <button type="button" onClick={applyBatch}>Copy grading to selected points</button>
   </fieldset>
   {batchMessage&&<p role="status" className="exo-engine-error">{batchMessage}</p>}
  </details>
 </div>
}
