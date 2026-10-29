import React,{useEffect,useMemo,useState} from 'react'
import {NATIVE_POINT_CONSTRUCTIONS,buildNativeParametricPointProposal} from '../core/nativeParametricPoint20261023.js'
import {evaluateNativeDraftWorksheet20261023} from '../core/nativeDraftWorksheet20261023.js'
import NativePatternBindingsInspector20261023 from './NativePatternBindingsInspector20261023.jsx'
import './NativePatternConstructionTools20261023.css'

/** Seamly-style numerical constructions, applied through Rust's existing
 * validated native Anchor edit. Unlike Seamly source graphs, these are
 * one-time constructions, not live formula constraints. */
export default function NativePatternConstructionTools20261023({snapshot,selected,onSelect,onApply,onApplyBindingBatch,onApplyNativeMeasurement,onPersistBindings,onClearBindings,onLoadNativeProject,onStoreNativeFabricEnvelope,onRegenerateNativeFabricChart,onInspectNativeFabricEnvelope,disabled=false,onPreview}){
  const [panelId,setPanelId]=useState('')
  const [pointIndex,setPointIndex]=useState(0)
  const [mode,setMode]=useState('along')
  const [a,setA]=useState(0),[b,setB]=useState(1),[c,setC]=useState(2),[d,setD]=useState(3)
  const [distanceMm,setDistanceMm]=useState('20')
  const [distanceSource,setDistanceSource]=useState('numeric')
  const [worksheet,setWorksheet]=useState('chest = 920\nease = 40\nquarter = (chest + ease) / 4')
  const [distanceExpression,setDistanceExpression]=useState('quarter')
  const [angleDeg,setAngleDeg]=useState('0')
  const [message,setMessage]=useState('')
  const [saving,setSaving]=useState(false)
  const panels=snapshot?.template?.panels||[]
  useEffect(()=>{
    if(selected?.panel&&panels.some(p=>p.id===selected.panel)){
      setPanelId(selected.panel)
      if(Number.isInteger(selected.anchor))setPointIndex(selected.anchor)
    }
  },[selected?.panel,selected?.anchor,snapshot?.template])
  const activePanel=panels.find(p=>p.id===(panels.some(p=>p.id===panelId)?panelId:panels[0]?.id))
  const measurementKey=`exo-v2-draft-formula:${String(snapshot?.template?.id||snapshot?.template?.name||'untitled').slice(0,180)}`
  useEffect(()=>{
    try{
      const record=JSON.parse(localStorage.getItem(measurementKey)||'null')
      if(typeof record?.worksheet==='string'&&record.worksheet.length<=16384)setWorksheet(record.worksheet)
      if(typeof record?.distanceExpression==='string'&&record.distanceExpression.length<=4096)setDistanceExpression(record.distanceExpression)
    }catch{/* Bad saved worksheets never execute or prevent native drafting. */}
  },[measurementKey])
  const count=activePanel?.polygon?.points?.length||0
  const target=Math.min(Math.max(0,pointIndex),Math.max(0,count-1))
  const distanceUsed=['along','normal','polar'].includes(mode)
  const formula=useMemo(()=>distanceSource==='formula'&&distanceUsed
    ?evaluateNativeDraftWorksheet20261023({worksheet,expression:distanceExpression})
    :null,[distanceSource,distanceUsed,worksheet,distanceExpression])
  const proposal=useMemo(()=>{
    if(formula&&!formula.ok)return {ok:false,reason:formula.reason,manufacturingApproved:false}
    return buildNativeParametricPointProposal(snapshot,{
      panelId:activePanel?.id,pointIndex:target,mode,a,b,c,d,
      distanceMm:formula?.ok?formula.valueMm:distanceMm,angleDeg,
    })
  },[snapshot,activePanel?.id,target,mode,a,b,c,d,distanceMm,angleDeg,formula])
  useEffect(()=>{
    onPreview?.(proposal.ok?{panelId:proposal.panelId,pointIndex:proposal.pointIndex,position:proposal.command.position,revision:proposal.revision}:null)
    return()=>onPreview?.(null)
  },[onPreview,proposal.ok,proposal.panelId,proposal.pointIndex,proposal.command?.position?.[0],proposal.command?.position?.[1],proposal.revision])
  const selectTarget=value=>{
    const index=Number(value);setPointIndex(index);setMessage('')
    if(activePanel?.id)onSelect?.({panel:activePanel.id,anchor:index})
  }
  const opts=Array.from({length:count},(_,i)=>
    <option key={i} value={i}>P{i+1} · {((activePanel.polygon.points[i][0]||0)*1000).toFixed(1)}, {((activePanel.polygon.points[i][1]||0)*1000).toFixed(1)} mm</option>)
  const ref=(label,value,set)=> <label className="exo-construction-reference" key={label}>{label}
    <select aria-label={`Construction reference ${label}`} value={value<count?value:0} onChange={e=>{set(Number.isNaN(Number(e.target.value))?0:Number(e.target.value));setMessage('')}}>
      {opts}
    </select>
  </label>
  const pending=disabled||saving
  const commit=async()=>{
    if(pending||!proposal.ok)return
    setSaving(true);setMessage('')
    try{
      const result=await onApply?.(proposal)
      setMessage(result?.linked?
        `Saved P${target+1} and regenerated ${result.dependentCount} native linked point(s) in ONE Rust Undo revision ${result.revision}. Sewing, grading and fit QA must be rerun.`:
        result===true?`Saved P${target+1} to native pattern. Undo and Redo work; seam, grade and fit QA must be rerun.`:
          'Native edit was rejected. Review the native pattern before retrying.')
    }catch(error){setMessage(error?.message||String(error))}
    finally{setSaving(false)}
  }
  return <section className="exo-native-construction" aria-label="Seamly-style native numerical drafting" data-native-construction-tool="true">
    <strong>CONSTRUCT · REAL 2D POINT</strong>
    <p>Move an existing corner by an exact geometric construction. Units are millimetres; target pattern stays connected to the Rust 2D/3D document.</p>
    <label>Pattern<select aria-label="Construction pattern panel" value={activePanel?.id||''} onChange={e=>{setPanelId(e.target.value);setPointIndex(0);setMessage('');onSelect?.({panel:e.target.value,anchor:0})}}>
      {panels.map(panel=><option key={panel.id} value={panel.id}>{panel.name}</option>)}
    </select></label>
    <label>Move corner<select aria-label="Construction target point" value={target} onChange={e=>selectTarget(e.target.value)}>{opts}</select></label>
    <label>Construction<select aria-label="Numerical construction method" value={mode} onChange={e=>{setMode(e.target.value);setMessage('')}}>
      {Object.entries(NATIVE_POINT_CONSTRUCTIONS).map(([id,name])=><option key={id} value={id}>{name}</option>)}
    </select></label>
    <div className="exo-construction-reference-grid">
      {ref('A',a,setA)}
      {mode!=='polar'&&ref('B',b,setB)}
      {mode==='intersect'&&<>{ref('C',c,setC)}{ref('D',d,setD)}</>}
    </div>
    {distanceUsed&&<>
      <label>Distance source<select aria-label="Construction distance source" value={distanceSource} onChange={e=>{setDistanceSource(e.target.value);setMessage('')}}>
        <option value="numeric">Direct millimetres</option>
        <option value="formula">Named measurements & formula</option>
      </select></label>
      {distanceSource==='numeric'?<label>Distance (mm)
        <input type="number" step="0.1" aria-label="Numerical construction distance millimetres" value={distanceMm} onChange={e=>{setDistanceMm(e.target.value);setMessage('')}}/>
      </label>:<div className="exo-construction-worksheet" data-native-construction-worksheet="true">
        <label>Named measurements (one `name = formula` per line, all mm)
          <textarea rows={4} maxLength={16384} aria-label="Named drafting measurement worksheet" value={worksheet} onChange={e=>{setWorksheet(e.target.value);setMessage('')}}/>
        </label>
        <label>Distance expression (mm)
          <input type="text" maxLength={4096} aria-label="Drafting distance formula expression" value={distanceExpression} onChange={e=>{setDistanceExpression(e.target.value);setMessage('')}}/>
        </label>
        {formula?.ok?<p role="status">Calculated distance <strong>{formula.valueMm.toFixed(3)} mm</strong> · {formula.dependencyOrder.length-1} named measurements resolved.</p>
          :<p className="exo-construction-invalid" role="status">Formula blocked: {formula?.reason||'Define a valid named measurement'}</p>}
        <button type="button" className="exo-construction-save-worksheet" onClick={()=>{
          if(!formula?.ok){setMessage('Fix the formula errors before saving the worksheet.');return}
          try{localStorage.setItem(measurementKey,JSON.stringify({worksheet,distanceExpression}));setMessage('Named measurement worksheet saved locally for this EXO draft. Apply to update the native point; later formula changes do not automatically change already drafted geometry.')}
          catch{setMessage('Unable to save this worksheet to local app storage.')}
        }}>Save worksheet locally</button>
        <NativePatternBindingsInspector20261023 snapshot={snapshot} panelId={activePanel?.id||''} pointIndex={target}
          mode={mode} a={a} b={b} angleDeg={angleDeg} worksheet={worksheet} distanceExpression={distanceExpression}
          onApplyBatch={disabled?null:onApplyBindingBatch}
          onApplyNativeMeasurement={disabled?null:onApplyNativeMeasurement}
          onPersistBindings={disabled?null:onPersistBindings}
          onClearBindings={disabled?null:onClearBindings}
          onLoadNativeProject={disabled?null:onLoadNativeProject}
          onStoreNativeFabricEnvelope={disabled?null:onStoreNativeFabricEnvelope}
          onRegenerateNativeFabricChart={disabled?null:onRegenerateNativeFabricChart}
          onInspectNativeFabricEnvelope={disabled?null:onInspectNativeFabricEnvelope}/>
      </div>}
    </>}
    {mode==='polar'&&<label>Angle from X axis (degrees)
      <input type="number" step="0.1" aria-label="Numerical construction angle degrees" value={angleDeg} onChange={e=>{setAngleDeg(e.target.value);setMessage('')}}/>
    </label>}
    {proposal.ok?<div className="exo-construction-result" role="status" data-construction-valid="true">
      <strong>VALID PREVIEW · NOT APPLIED</strong>
      <span>Target X {proposal.proposedMm[0].toFixed(2)} mm · Y {proposal.proposedMm[1].toFixed(2)} mm</span>
      <span>Displacement {proposal.displacementMm.toFixed(2)} mm · sampled contour area {(proposal.sampledAreaAfterMm2/100).toFixed(2)} cm²</span>
      <span>Snapshot revision {proposal.revision}. Curves are sampled, not exact manufacturing tolerance.</span>
    </div>:<p className="exo-construction-invalid" role="status">Construction blocked: {proposal.reason}</p>}
    <div className="exo-construction-actions">
      <button type="button" disabled={!proposal.ok||pending} onClick={commit}>{saving?'Applying…':'Apply with native Undo'}</button>
      <button type="button" onClick={()=>{setDistanceMm('20');setAngleDeg('0');setMessage('')}}>Reset inputs</button>
    </div>
    {message&&<p className="exo-construction-message" role="status">{message}</p>}
    <small>Named drafting formulas use bounded arithmetic without script execution. Ordinary native Anchor edits automatically regenerate qualified saved reference points. A strictly qualified direct polar binding shared by two detached native pieces also regenerates all six saved sizes in one Rust Undo. Other curve, sewing, topology and manufacturing dependencies require separate validation; arbitrary edits are not universally reactive.</small>
  </section>
}
