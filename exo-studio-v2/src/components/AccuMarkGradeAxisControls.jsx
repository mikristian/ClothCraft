import React,{useEffect,useState} from 'react'
import './AccuMarkEngineeringControls.css'

/** Textbook exercises 19.19 and 19.20: independently copy or reverse signed
 * per-size X/Y point growth. Underlying engine validates full size rules. */
export default function AccuMarkGradeAxisControls({project,piece,onApply,disabled=false}) {
  const [kind,setKind]=useState('copy-axis')
  const [axis,setAxis]=useState('x')
  const [sourceId,setSourceId]=useState('')
  const [sourceIndex,setSourceIndex]=useState('0')
  const [targetIndex,setTargetIndex]=useState('0')
  const [notice,setNotice]=useState('')
  const pieces=project?.pieces||[]
  const source=pieces.find(item=>item.id===(sourceId||piece?.id))
  useEffect(()=>{setSourceId(piece?.id||'');setSourceIndex('0');setTargetIndex('0');setNotice('')},[piece?.id])
  const submit=()=>{
    try{
      if(!piece || typeof onApply!=='function')throw Error('Select a source garment piece')
      const spec={kind,axis,target:{pieceId:piece.id,pointIndex:Number(targetIndex)}}
      if(kind==='copy-axis')spec.source={pieceId:sourceId||piece.id,pointIndex:Number(sourceIndex)}
      const result=onApply(spec)
      if(!result?.validation?.sizes?.length)throw Error('Grading engine did not confirm the size run')
      setNotice(`${kind==='copy-axis'?'Copied':'Flipped'} ${axis.toUpperCase()} movement on ${result.validation.sizes.length} graded sizes. Compare the full size nest before cutting.`)
    }catch(error){setNotice('Operation blocked: '+(error?.message||String(error)))}
  }
  return <section className="exo-accu-engine-controls" aria-label="Independent X and Y grading operations">
    <details>
      <summary>Grade Axis · Copy X/Y Movement · Flip X/Y Movement</summary>
      <fieldset disabled={disabled||!piece}>
        <p>Copy just one axis of a point’s authored grading to another point, or reverse its direction. Opposite-axis growth and base size remain fixed. Named rule references must be detached before editing.</p>
        <div className="exo-engine-row">
          <label>Operation<select aria-label="Single-axis grade operation" value={kind} onChange={e=>setKind(e.target.value)}>
            <option value="copy-axis">Copy X/Y movement</option><option value="flip-axis">Flip X/Y movement</option>
          </select></label>
          <label>Movement axis<select aria-label="Grading movement axis" value={axis} onChange={e=>setAxis(e.target.value)}><option value="x">X horizontal</option><option value="y">Y vertical</option></select></label>
        </div>
        {kind==='copy-axis'&&<div className="exo-engine-row">
          <label>Source piece<select aria-label="Grade movement source piece" value={sourceId||piece?.id||''} onChange={e=>{setSourceId(e.target.value);setSourceIndex('0')}}>{pieces.map(item=><option key={item.id} value={item.id}>{item.name||item.id}</option>)}</select></label>
          <label>Source grade point<select aria-label="Grade movement source point" value={sourceIndex} onChange={e=>setSourceIndex(e.target.value)}>{(source?.points||[]).map((point,i)=><option key={point.id||i} value={i}>P{i+1}{point.industrialGradeRule?' · grade rule':''}</option>)}</select></label>
        </div>}
        <label>Destination point ({piece?.name||'selection'})<select aria-label="Grade movement destination point" value={targetIndex} onChange={e=>setTargetIndex(e.target.value)}>{(piece?.points||[]).map((point,i)=><option key={point.id||i} value={i}>P{i+1}{point.industrialGradeRule?' · grade rule':''}</option>)}</select></label>
        <button type="button" onClick={submit}>Apply grade movement</button>
      </fieldset>
      {notice&&<p role="status" className="exo-engine-error">{notice}</p>}
    </details>
  </section>
}
