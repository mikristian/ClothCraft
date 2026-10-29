import React,{useEffect,useMemo,useState} from 'react'
import {edgeLength} from '../core/project.js'
import {gradeProject} from '../core/grading.js'
import {inspectGradedNotchPairs} from '../core/industrialNotchQA.js'
import {inspectAccuMarkJoinedEnds} from '../core/accumarkJoinedEndGrading20261023.js'
import './AccuMarkEngineeringControls.css'

const parseMeasure=value=>value.trim()===''?NaN:Number(value)
const validIndex=(n,array)=>Number.isInteger(n)&&n>=0&&n<(array?.length||0)
const fmt=n=>Number.isFinite(n)?n.toFixed(3):'—'
const choosePoint=(p,i)=><option key={p.id||i} value={i}>P{i+1}{p.industrialGradeRule?' · rule':''}</option>

/** The source can contain a single shared corner vertex. We deliberately
 * offer pair propagation only where independently-addressable coincident
 * vertices really exist, rather than claim a Gerber dual-line endpoint. */
export function AccuMarkJoinedEndControls20261023({project,piece,onApply,disabled=false}){
 const [sourceIndex,setSourceIndex]=useState('0')
 const [targetIndex,setTargetIndex]=useState('0')
 const [policy,setPolicy]=useState('individual')
 const [partner,setPartner]=useState('')
 const [message,setMessage]=useState('')
 const points=piece?.points||[]
 const selected=Number(targetIndex)
 const paired=useMemo(()=>{
  if(!piece||!validIndex(selected,points))return {candidates:[],error:''}
  try{return {...inspectAccuMarkJoinedEnds(project,{pieceId:piece.id,pointIndex:selected}),error:''}}
  catch(e){return {candidates:[],error:e.message||String(e)}}
 },[project,piece?.id,selected])
 const candidates=paired.candidates||[]
 useEffect(()=>{setSourceIndex('0');setTargetIndex('0');setPartner('');setPolicy('individual');setMessage('')},[piece?.id])
 const send=()=>{
  try{
   if(!piece||typeof onApply!=='function')throw Error('Select a pattern piece')
   const source=points[Number(sourceIndex)]
   if(!source?.industrialGradeRule)throw Error('Choose a source point with a complete industrial grade rule')
   const spec={pieceId:piece.id,pointIndex:selected,policy,rule:structuredClone(source.industrialGradeRule)}
   if(policy!=='individual'){
    if(!candidates.length)throw Error('This contour has no separately addressable coincident corner endpoint')
    spec.pairedPointIndex=Number(partner||candidates[0].pointIndex)
   }
   const result=onApply(spec)
   setMessage(`Updated ${policy==='individual'?'one point':'both corner ends'} with ${result?.validation?.sizes?.length||0} graded sizes checked. Verify the corner and seam allowance.`)
  }catch(e){setMessage('Corner grade blocked: '+(e.message||String(e)))}
 }
 return <section className="exo-accu-engine-controls" aria-label="Joined-end grade rule controls">
  <details>
   <summary>Grade Corner · Individual / Both if Same / Always Both</summary>
   <fieldset disabled={disabled||!piece}>
    <p>Assign a point's X/Y size-break rule to a selected corner. If the piece has two separate coincident endpoints, you can propagate the rule to both. A single shared contour vertex has only one grade point.</p>
    <div className="exo-engine-row">
     <label>Rule from<select aria-label="Corner rule source point" value={sourceIndex} onChange={e=>setSourceIndex(e.target.value)}>{points.map(choosePoint)}</select></label>
     <label>Apply to<select aria-label="Joined-end destination point" value={targetIndex} onChange={e=>{setTargetIndex(e.target.value);setPartner('')}}>{points.map(choosePoint)}</select></label>
    </div>
    <label>Apply rule to joined ends<select aria-label="Joined-end grading policy" value={policy} onChange={e=>setPolicy(e.target.value)}>
     <option value="individual">Individual selected point</option>
     <option value="both-if-same">Both if Same (matching current growth)</option>
     <option value="always-both">Always Both (two explicit endpoints)</option>
    </select></label>
    {policy!=='individual'&&<label>Independent paired corner endpoint<select aria-label="Paired corner point" value={partner||String(candidates[0]?.pointIndex??'')} disabled={!candidates.length} onChange={e=>setPartner(e.target.value)}>
     {candidates.map(candidate=><option key={candidate.pointIndex} value={candidate.pointIndex}>P{candidate.pointIndex+1}{candidate.canBothIfSame?' · matching growth':''}</option>)}
    </select></label>}
    {paired.error&&<p role="alert">{paired.error}</p>}
    <small>{candidates.length? `${candidates.length} independently addressable coincident candidate(s) found.`:'No separate coincident endpoints identified on this point.'}</small>
    <button type="button" disabled={!points[Number(sourceIndex)]?.industrialGradeRule||Boolean(paired.error)||(policy!=='individual'&&!candidates.length)} onClick={send}>Apply corner grading</button>
   </fieldset>
   {message&&<p role="status" className="exo-engine-error">{message}</p>}
  </details>
 </section>
}

/** Size-specific arc fractions are calculated by the grading engine from
 * actual graded quadratic edge lengths, never from a screen approximation. */
export function AccuMarkGradedNotchDistanceControls20261023({project,piece,onApply,disabled=false}){
 const [notchId,setNotchId]=useState('')
 const [distance,setDistance]=useState('')
 const [from,setFrom]=useState('start')
 const [message,setMessage]=useState('')
 const [qa,setQa]=useState(null)
 const notches=piece?.notches||[]
 const notch=notches.find(n=>n.id===notchId)||notches[0]
 const selectedId=notch?.id||''
 const baseSize=project?.grading?.baseSize
 const sizes=project?.grading?.sizes||[]
 const table=useMemo(()=>{
  if(!piece||!notch||!sizes.length)return {rows:[],error:''}
  try{
   const rows=sizes.map(size=>{
    const graded=gradeProject(project,size)
    const p=graded.pieces.find(p=>p.id===piece.id)
    const n=p?.notches?.find(n=>n.id===notch.id)
    if(!p||!n)throw Error(`Notch ${notch.id} is missing at size ${size}`)
    const len=edgeLength(p,n.edgeIndex)
    if(!Number.isFinite(len)||len<=0||!Number.isFinite(n.t)||n.t<0||n.t>1)throw Error(`Invalid graded notch on size ${size}`)
    return {size,lengthCm:len,startCm:len*n.t,endCm:len*(1-n.t),fraction:n.t}
   })
   return {rows,error:''}
  }catch(e){return {rows:[],error:e.message||String(e)}}
 },[project,piece?.id,selectedId])
 useEffect(()=>{setNotchId('');setDistance('');setFrom('start');setMessage('');setQa(null)},[piece?.id])
 useEffect(()=>{
  if(!notch)return
  const station=notch.gradeArcStation
  const base=table.rows.find(row=>row.size===baseSize)
  const end=station?.from==='end'?'end':'start'
  setFrom(end)
  setDistance(String(Number((station?.distanceCm??(end==='end'?base?.endCm:base?.startCm)??0).toFixed(4))))
 },[selectedId,baseSize,notch?.t,notch?.gradeArcStation?.distanceCm,notch?.gradeArcStation?.from])
 const apply=()=>{
  try{
   if(typeof onApply!=='function'||!piece||!notch)throw Error('Select a piece with a physical notch')
   const distanceCm=parseMeasure(distance)
   if(!Number.isFinite(distanceCm)||distanceCm<=0)throw Error('Enter a positive finite physical distance in centimetres')
   const result=onApply({pieceId:piece.id,notchId:notch.id,distanceCm,from})
   setMessage(`Saved physical ${fmt(distanceCm)} cm arc station from ${from} for ${result?.validation?.sizes?.length||0} graded sizes. Verify sew and cut positions before manufacturing.`)
   setQa(null)
  }catch(e){setMessage('Graded notch blocked: '+(e.message||String(e)))}
 }
 const audit=()=>{
  try{
   if(!Array.isArray(project?.seams))throw Error('Project has no defined seam list')
   setQa(inspectGradedNotchPairs(project,{toleranceCm:.05}))
  }catch(e){setMessage('Paired-notch QA unavailable: '+(e.message||String(e)))}
 }
 return <section className="exo-accu-engine-controls" aria-label="Graded notch seam distance controls">
  <details>
   <summary>Grade Notch · Physical distance along curved seam</summary>
   <fieldset disabled={disabled||!piece||!notches.length}>
    <p>Set one notch at a fixed distance along its stitched boundary, measured on the real curve for every graded size. This changes the size-specific physical station rather than keeping the same fraction on edges that change length.</p>
    <label>Physical notch<select aria-label="Graded notch selection" value={selectedId} onChange={e=>setNotchId(e.target.value)}>
     {notches.map(n=><option key={n.id} value={n.id}>{n.id} · edge {n.edgeIndex+1} · {n.type||'single'}</option>)}
    </select></label>
    <div className="exo-engine-row">
     <label>Distance (cm)<input type="number" step=".01" min=".001" aria-label="Graded notch distance centimeters" value={distance} onChange={e=>setDistance(e.target.value)}/></label>
     <label>From edge<select aria-label="Graded notch reference end" value={from} onChange={e=>setFrom(e.target.value)}><option value="start">Start</option><option value="end">End</option></select></label>
    </div>
    <button type="button" disabled={Boolean(table.error)} onClick={apply}>Set graded notch distance</button>
   </fieldset>
   {!notches.length&&<p>Select a piece containing notches to enable this tool.</p>}
   {table.error&&<p role="alert" className="exo-engine-error">{table.error}</p>}
   {table.rows.length>0&&<div style={{padding:'8px 11px',overflowX:'auto'}}>
    <table aria-label="All-size graded notch physical arc positions" style={{width:'100%',fontSize:10,fontVariantNumeric:'tabular-nums',textAlign:'right'}}>
     <thead><tr><th>Size</th><th>Edge cm</th><th>From start</th><th>From end</th><th>Fraction</th></tr></thead>
     <tbody>{table.rows.map(row=><tr key={row.size}><th>{row.size}</th><td>{fmt(row.lengthCm)}</td><td>{fmt(row.startCm)}</td><td>{fmt(row.endCm)}</td><td>{fmt(row.fraction)}</td></tr>)}</tbody>
    </table>
    <button type="button" onClick={audit}>Check matched notch stations (0.05 cm)</button>
    {qa&&<p role="status">{qa.status} · {qa.blockers} alignment blocker(s) · {qa.checks.length} size/pair checks. Diagnostic only.</p>}
   </div>}
   {message&&<p role="status" className="exo-engine-error">{message}</p>}
  </details>
 </section>
}
