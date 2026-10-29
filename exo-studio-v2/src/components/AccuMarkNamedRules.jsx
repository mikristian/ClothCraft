import React,{useState} from 'react'
import {createNamedGradeRuleLibrary,captureNamedGradeRule,updateNamedGradeRule,assignNamedGradeRule,
 detachNamedGradeRule,serializeNamedGradeRuleLibrary,deserializeNamedGradeRuleLibrary,inspectNamedGradeRuleReferences} from '../core/accumarkNamedGradeRuleLibrary20261023.js'
import './AccuMarkNamedRules.css'

/** Portable versioned grade rules. Download the JSON to preserve the current
 * library across sessions; project assignments retain their rule snapshots.
 */
export default function AccuMarkNamedRules({project,piece,onApplyProject,disabled=false}){
 const [library,setLibrary]=useState(()=>createNamedGradeRuleLibrary())
 const [name,setName]=useState('')
 const [id,setId]=useState('')
 const [sourceIndex,setSourceIndex]=useState('0')
 const [targetIndex,setTargetIndex]=useState('0')
 const [selectedId,setSelectedId]=useState('')
 const [error,setError]=useState(''),[notice,setNotice]=useState('')
 const execute=action=>{try{setError('');setNotice('');action()}catch(e){setError(e.message||String(e))}}
 const points=piece?.points||[]
 const unique=[...new Map(library.entries.map(entry=>[entry.id,entry])).values()]
 const capture=()=>execute(()=>{
  if(!piece)throw Error('Select a pattern piece with a point rule')
  const next=captureNamedGradeRule(library,project,{id:id.trim(),name:name.trim(),pieceId:piece.id,pointIndex:Number(sourceIndex)})
  setLibrary(next);setSelectedId(id.trim());setNotice('Named rule saved in this session. Download library JSON to keep it.')
 })
 const update=()=>execute(()=>{
  const point=piece?.points?.[Number(sourceIndex)]
  if(!point?.industrialGradeRule)throw Error('Select a point with an authored industrial grade rule')
  const next=updateNamedGradeRule(library,{id:selectedId,rule:point.industrialGradeRule})
  setLibrary(next);setNotice('Rule version created; previously assigned points remain pinned to their earlier version.')
 })
 const assign=()=>execute(()=>{
  if(!piece)throw Error('Choose a pattern piece first')
  const next=assignNamedGradeRule(project,library,{id:selectedId,pieceId:piece.id,pointIndex:Number(targetIndex)})
  onApplyProject?.(next,`Assigned named rule ${selectedId} to ${piece.id} point ${Number(targetIndex)+1}`)
  setNotice('Rule assigned as a snapshot. Validate all graded sizes.')
 })
 const detach=()=>execute(()=>{
  const next=detachNamedGradeRule(project,{pieceId:piece.id,pointIndex:Number(targetIndex),keepRule:true})
  onApplyProject?.(next,'Detached named rule reference and preserved grading geometry')
  setNotice('Reference detached; independent point rule retained.')
 })
 const download=()=>execute(()=>{
  const data=serializeNamedGradeRuleLibrary(library)
  const url=URL.createObjectURL(new Blob([data],{type:'application/json'}))
  const a=document.createElement('a');a.href=url;a.download='exo-named-grade-rule-library.json';a.click()
  window.setTimeout(()=>URL.revokeObjectURL(url),5000)
  setNotice('Downloaded the current versioned named grading library.')
 })
 const upload=async event=>{
  const file=event.target.files?.[0];if(!file)return
  try{
   if(file.size>1024*1024)throw Error('Grade library exceeds 1 MB')
   const parsed=deserializeNamedGradeRuleLibrary(await file.text())
   setLibrary(parsed);setSelectedId(parsed.entries[0]?.id||'');setError('');setNotice('Imported versioned grade library JSON.')
  }catch(error){setError(error.message||String(error))}
  finally{event.target.value=''}
 }
 const issues=project?inspectNamedGradeRuleReferences(project,library):[]
 return <section className="exo-named-rules" aria-label="Named grading rule tables">
  <details><summary>Named grade rule library · versioned and reusable</summary>
   <fieldset disabled={disabled||!piece}>
    <p>Create a versioned rule from a point’s independent X/Y size breaks, then assign its immutable snapshot to another point. Save the library JSON for reuse across sessions.</p>
    <div className="exo-named-row"><label>Rule ID<input aria-label="New named grade rule ID" value={id} placeholder="bodice.side.01" onChange={e=>setId(e.target.value)}/></label><label>Rule name<input aria-label="New named grade rule name" value={name} placeholder="Side seam grading" onChange={e=>setName(e.target.value)}/></label></div>
    <div className="exo-named-row"><label>Source point<select aria-label="Named rule source point" value={sourceIndex} onChange={e=>setSourceIndex(e.target.value)}>{points.map((p,i)=><option key={p.id||i} value={i}>P{i+1}{p.industrialGradeRule?' · graded':''}</option>)}</select></label><button type="button" onClick={capture}>Save named rule</button></div>
    <div className="exo-named-row"><label>Saved rule<select aria-label="Select named grade rule" value={selectedId} onChange={e=>setSelectedId(e.target.value)}><option value="">Select a rule</option>{unique.map(v=><option key={v.id} value={v.id}>{v.name} · v{v.version}</option>)}</select></label><button type="button" disabled={!selectedId} onClick={update}>New version from source</button></div>
    <div className="exo-named-row"><label>Destination point<select aria-label="Named rule destination point" value={targetIndex} onChange={e=>setTargetIndex(e.target.value)}>{points.map((p,i)=><option key={p.id||i} value={i}>P{i+1}</option>)}</select></label><button type="button" disabled={!selectedId} onClick={assign}>Assign rule</button><button type="button" disabled={!piece?.points?.[Number(targetIndex)]?.namedGradeRuleRef} onClick={detach}>Detach</button></div>
    <div className="exo-named-row"><button type="button" onClick={download}>Download library JSON</button><label>Import saved library<input aria-label="Import named grade library JSON" type="file" accept=".json,application/json" onChange={upload}/></label></div>
   </fieldset>
   {issues.length>0&&<p role="alert">{issues.length} named grade rule reference issue(s); inspect version or rule mismatches before production.</p>}
   {error&&<p role="alert">{error}</p>}
   {notice&&<p role="status">{notice}</p>}
  </details>
 </section>
}
