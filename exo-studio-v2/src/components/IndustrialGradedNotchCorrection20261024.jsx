import React,{useMemo,useState} from 'react'
import {correctIndustrialGradedSeamNotches20261024} from '../core/industrialGradedSeamCorrection20261024_1516.js'

const validNumber=value=>typeof value==='string'&&value.trim()!==''&&Number.isFinite(Number(value))&&Number(value)>0
const sourceStamp=source=>{
  try{return JSON.stringify(source)}catch{return null}
}

export default function IndustrialGradedNotchCorrection20261024({project,disabled=false,nativeMode=false,onApplyProject}){
  const [seamId,setSeamId]=useState('')
  const [matchGroupId,setMatchGroupId]=useState('')
  const [stationCm,setStationCm]=useState('')
  const [preview,setPreview]=useState(null)
  const [result,setResult]=useState('')
  const seams=Array.isArray(project?.seams)?project.seams:[]
  const seam=seams.find(item=>item?.id===seamId)
  const groups=useMemo(()=>{
    if(!seam||!Array.isArray(project?.pieces))return []
    const all=[]
    for(const piece of project.pieces){
      if(!Array.isArray(piece?.notches))continue
      for(const notch of piece.notches){
        if(notch?.matchedSeamId===seam.id&&typeof notch.matchGroupId==='string'&&notch.matchGroupId.length){
          all.push(notch.matchGroupId)
        }
      }
    }
    return [...new Set(all)].sort()
  },[project,seam])
  const blocked=disabled||nativeMode||typeof onApplyProject!=='function'
  const clear=()=>{setPreview(null);setResult('')}
  const previewChange=()=>{
    clear()
    if(blocked){setResult('BLOCKED: Legacy project edits unavailable.');return}
    if(!seam||!groups.includes(matchGroupId)||!validNumber(stationCm)){
      setResult('BLOCKED: Select a seam, matched notch group, and positive finite arc station in cm.');return
    }
    const stamp=sourceStamp(project)
    if(stamp===null){setResult('BLOCKED: Project cannot be snapshotted safely.');return}
    const outcome=correctIndustrialGradedSeamNotches20261024(project,{seamId,matchGroupId,stationCm:Number(stationCm)})
    if(!outcome.ok){setResult(`BLOCKED: ${outcome.code}`);return}
    if(outcome.validation?.status!=='measurement_only'||!outcome.project){setResult('BLOCKED: Unexpected correction validation.');return}
    setPreview({outcome,stamp,source:project,revision:project?.revision,seamId,matchGroupId,stationCm})
    setResult(`Measurement only: ${outcome.validation.checkedSizes.join(', ')} verified. Review and apply to project.`)
  }
  const apply=()=>{
    if(blocked||!preview){setResult('BLOCKED: No valid correction preview.');return}
    if(project!==preview.source||project?.revision!==preview.revision||sourceStamp(project)!==preview.stamp||
      seamId!==preview.seamId||matchGroupId!==preview.matchGroupId||stationCm!==preview.stationCm){
      setPreview(null);setResult('BLOCKED: Source or input changed. Preview correction again.');return
    }
    const fresh=correctIndustrialGradedSeamNotches20261024(project,{seamId,matchGroupId,stationCm:Number(stationCm)})
    if(!fresh.ok||fresh.validation?.status!=='measurement_only'){
      setPreview(null);setResult(`BLOCKED: ${fresh.code||'Revalidation failed'}`);return
    }
    try{
      const committed=onApplyProject(fresh.project)
      if(committed===false){setResult('BLOCKED: Project update was rejected.');return}
      setResult('Correction submitted to project editor. Status: measurement_only; manufacturing approval remains false.')
      setPreview(null)
    }catch(error){setResult(`BLOCKED: ${error?.message||'Project update failed'}`)}
  }
  return <section className="exo-accu-constraint-box" aria-label="Industrial graded seam notch correction">
    <details><summary>Industrial graded seam · matched notch arc correction</summary>
      <div style={{display:'grid',gap:8,padding:8}}>
        <label>Selected sewn seam
          <select aria-label="Correction seam" value={seamId} disabled={blocked} onChange={e=>{setSeamId(e.target.value);setMatchGroupId('');clear()}}>
            <option value="">Select seam</option>{seams.filter(s=>typeof s?.id==='string').map(s=><option key={s.id} value={s.id}>{s.name||s.id} ({s.id})</option>)}
          </select>
        </label>
        <label>Matched notch group
          <select aria-label="Matched notch group" value={matchGroupId} disabled={blocked||!seam} onChange={e=>{setMatchGroupId(e.target.value);clear()}}>
            <option value="">Select matched pair</option>{groups.map(id=><option key={id} value={id}>{id}</option>)}
          </select>
        </label>
        <label>Desired sewn arc station (cm)
          <input aria-label="Desired arc station cm" type="number" min="0" step="any" value={stationCm} disabled={blocked} onChange={e=>{setStationCm(e.target.value);clear()}}/>
        </label>
        <button type="button" disabled={blocked||!seam||!groups.includes(matchGroupId)||!validNumber(stationCm)} onClick={previewChange}>Validate graded notch correction</button>
        {preview&&<><small>Measurement only · {preview.outcome.validation.rows.length} graded sizes checked · no factory or physical fit approval</small>
          <button type="button" disabled={blocked} onClick={apply}>Apply validated correction to project</button></>}
        {(result||blocked)&&<p role="status">{blocked?'BLOCKED: Available only for editable EXO projects with a project commit callback.':result}</p>}
      </div>
    </details>
  </section>
}
