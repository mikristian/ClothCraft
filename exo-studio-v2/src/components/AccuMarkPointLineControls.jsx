import React,{useEffect,useState} from 'react'
import './AccuMarkEngineeringControls.css'

const finite = text => text.trim()!==''&&Number.isFinite(Number(text))

/** Precise centimetre-based source pattern editing. The parent applies an
 * immutable core operation through the project's normal undo mechanism. */
export default function AccuMarkPointLineControls({piece,onApply,disabled=false}) {
  const [kind,setKind]=useState('point.set')
  const [pointIndex,setPointIndex]=useState('0')
  const [edgeIndex,setEdgeIndex]=useState('0')
  const [x,setX]=useState('0'),[y,setY]=useState('0')
  const [dx,setDx]=useState('0'),[dy,setDy]=useState('0')
  const [distance,setDistance]=useState('1'),[angle,setAngle]=useState('0')
  const [moveMode,setMoveMode]=useState('delta')
  const [fraction,setFraction]=useState('.5')
  const [notice,setNotice]=useState('')
  const points=piece?.points||[]
  const chosen=Math.max(0,Math.min(Number(pointIndex)||0,points.length-1))
  useEffect(()=>{setPointIndex('0');setEdgeIndex('0');setNotice('')},[piece?.id])
  useEffect(()=>{
    const point=points[chosen]
    if(point){setX(String(point.x));setY(String(point.y))}
  },[piece?.id,chosen,points[chosen]?.x,points[chosen]?.y])
  const apply=()=>{
    try {
      if(!piece || !onApply)throw Error('Select a pattern piece first')
      const spec={kind,pieceId:piece.id}
      let required=[]
      if(kind==='point.set'){
        spec.pointIndex=chosen;spec.xCm=Number(x);spec.yCm=Number(y);required=[x,y]
      } else if(kind==='point.move'){
        spec.pointIndex=chosen
        if(moveMode==='delta'){
          spec.dxCm=Number(dx);spec.dyCm=Number(dy);required=[dx,dy]
        }else{
          spec.distanceCm=Number(distance);spec.angleDeg=Number(angle);required=[distance,angle]
        }
      } else {
        spec.edgeIndex=Number(edgeIndex)
        if(kind==='edge.split'){spec.fraction=Number(fraction);required=[fraction]}
      }
      if(required.some(value=>!finite(value)))throw Error('Enter finite numeric measurements in centimetres')
      const result=onApply(spec)
      if(kind==='edge.measure'){
        const cm=result?.measurement?.lengthCm??result?.lengthCm
        if(!Number.isFinite(cm))throw Error('The edge length could not be measured')
        setNotice(`Edge ${Number(edgeIndex)+1}: ${cm.toFixed(3)} cm (${(cm*10).toFixed(2)} mm)`)
      }else setNotice(`${kind} applied to ${piece.name}. Review the graded size nest and save when ready.`)
    }catch(error){setNotice(`Operation blocked: ${error.message||String(error)}`)}
  }
  return <section className="exo-accu-engine-controls" aria-label="AccuMark precise point and line editing">
    <details>
      <summary>Point + Line · coordinate edit, precise move, split, measure</summary>
      <fieldset disabled={disabled||!piece||points.length<3}>
        <p>Enter dimensions in centimetres. Point and topology changes are checked across the graded size run before they are added to Undo. Attached construction that cannot be preserved is blocked.</p>
        <label>Operation<select aria-label="Precise pattern operation" value={kind} onChange={event=>{setKind(event.target.value);setNotice('')}}>
          <option value="point.set">Set point X/Y</option>
          <option value="point.move">Move point precisely</option>
          <option value="edge.split">Split straight boundary edge</option>
          <option value="edge.measure">Measure boundary edge</option>
        </select></label>
        {kind.startsWith('point.')?<>
          <label>Source point<select aria-label="Precise source point" value={chosen} onChange={event=>setPointIndex(event.target.value)}>{points.map((point,index)=><option key={point.id||index} value={index}>P{index+1}</option>)}</select></label>
          {kind==='point.set'?<div className="exo-engine-row"><label>X (cm)<input aria-label="Set source X centimeters" type="number" step="any" value={x} onChange={event=>setX(event.target.value)}/></label><label>Y (cm)<input aria-label="Set source Y centimeters" type="number" step="any" value={y} onChange={event=>setY(event.target.value)}/></label></div>:<>
            <label>Move by<select aria-label="Point move mode" value={moveMode} onChange={event=>setMoveMode(event.target.value)}><option value="delta">X/Y displacement</option><option value="polar">Distance + angle</option></select></label>
            {moveMode==='delta'?<div className="exo-engine-row"><label>ΔX (cm)<input aria-label="Move X centimeters" type="number" step="any" value={dx} onChange={event=>setDx(event.target.value)}/></label><label>ΔY (cm)<input aria-label="Move Y centimeters" type="number" step="any" value={dy} onChange={event=>setDy(event.target.value)}/></label></div>:<div className="exo-engine-row"><label>Distance (cm)<input aria-label="Move distance centimeters" type="number" step="any" value={distance} onChange={event=>setDistance(event.target.value)}/></label><label>Angle (°)<input aria-label="Move angle degrees" type="number" step="any" value={angle} onChange={event=>setAngle(event.target.value)}/></label></div>}
          </>}
        </>:<>
          <label>Boundary edge<select aria-label="Precise source edge" value={edgeIndex} onChange={event=>setEdgeIndex(event.target.value)}>{points.map((point,index)=><option key={index} value={index}>Edge {index+1} · P{index+1} → P{(index+1)%points.length+1}</option>)}</select></label>
          {kind==='edge.split'&&<label>Fraction along edge (0–1)<input aria-label="Edge split fraction" type="number" min="0.001" max="0.999" step=".05" value={fraction} onChange={event=>setFraction(event.target.value)}/></label>}
        </>}
        <button type="button" onClick={apply}>{kind==='edge.measure'?'Measure selected edge':'Apply precise edit'}</button>
      </fieldset>
      {notice&&<p role="status" className="exo-engine-error">{notice}</p>}
    </details>
  </section>
}
