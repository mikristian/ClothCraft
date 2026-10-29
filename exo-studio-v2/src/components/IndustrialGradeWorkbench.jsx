import React,{useEffect,useMemo,useState} from 'react'
import {gradePointForPiece} from '../core/grading.js'
import {
 INDUSTRIAL_GRADE_MODES,
 convertIndustrialGradeRule,
 evaluateIndustrialGradeTable,
} from '../core/industrialGradeRules.js'
import {formatIndustrialGradeBreakPaste,parseIndustrialGradeBreakPaste} from '../core/industrialGradeBreakPaste.js'
import './IndustrialGradeWorkbench.css'

/** Professional nonuniform break editor. Display is centimeter-based because
 * the full EXO pattern model uses centimeters, independent of native Rust mm.
 * This edits one point only; the rest of the garment must pass all-size QA. */
export function initialIndustrialGradeRule(piece,grading,pointIndex){
 const sizes=grading?.sizes
 if(!Array.isArray(sizes)||sizes.length<2||new Set(sizes).size!==sizes.length||!sizes.includes(grading?.baseSize)){
  throw new Error('Configure a valid size run and base size before creating industrial grading rules')
 }
 const point=piece?.points?.[pointIndex]
 if(!point)throw new Error('Choose an existing pattern point')
 const legacyPoint={...point,industrialGradeRule:undefined}
 const positions=sizes.map(size=>gradePointForPiece(piece,grading,size,legacyPoint))
 return {
  mode:INDUSTRIAL_GRADE_MODES.SMALL_LARGE_INCREMENTAL,
  sizes:[...sizes],baseSize:grading.baseSize,
  steps:positions.slice(1).map((p,i)=>({dx:p.x-positions[i].x,dy:p.y-positions[i].y})),
 }
}

function BreakInput({value,onCommit,label}){
 const [draft,setDraft]=useState(String(value))
 const [error,setError]=useState('')
 useEffect(()=>{setDraft(String(value));setError('')},[value])
 const commit=()=>{
  const numeric=Number(draft)
  if(draft.trim()&&Number.isFinite(numeric)&&Math.abs(numeric)<=12){setError('');onCommit(numeric)}
  else setError('Enter a finite grade break within ±12 cm.')
 }
 return <span className="industrial-grade-break-field"><input aria-label={label} aria-invalid={!!error} type="number" step="any" min="-12" max="12" value={draft}
  onChange={event=>{setDraft(event.target.value);setError('')}} onBlur={commit}
  onKeyDown={event=>{if(event.key==='Enter')event.currentTarget.blur();if(event.key==='Escape'){setDraft(String(value));setError('')}}}/>{error&&<small role="alert">{error}</small>}</span>
}

export default function IndustrialGradeWorkbench({piece,grading,onSetRule,onClearRule,onError}){
 const [pointIndex,setPointIndex]=useState(0)
 const [pasteOpen,setPasteOpen]=useState(false)
 const [pasteDraft,setPasteDraft]=useState('')
 const [pasteIdentity,setPasteIdentity]=useState('')
 const [pasteNotice,setPasteNotice]=useState('')
 const activeIndex=Math.min(pointIndex,Math.max(0,(piece?.points?.length||1)-1))
 const point=piece?.points?.[activeIndex]
 const rule=point?.industrialGradeRule||null
 const [normalized,table,error]=useMemo(()=>{
  if(!rule)return [null,null,'']
  try{
   const normalized=convertIndustrialGradeRule(rule,INDUSTRIAL_GRADE_MODES.SMALL_LARGE_INCREMENTAL)
   return [normalized,evaluateIndustrialGradeTable(rule),'']
  }catch(e){return [null,null,e.message]}
 },[rule])
 const pasteResult=useMemo(()=>{
  if(!pasteOpen||!rule)return null
  try{return {ok:true,...parseIndustrialGradeBreakPaste(pasteDraft,rule)}}
  catch(error){return {ok:false,reason:error.message}}
 },[pasteOpen,pasteDraft,rule])
 useEffect(()=>{setPasteOpen(false);setPasteNotice('')},[piece?.id,activeIndex])
 if(!piece?.points?.length)return null
 const setBreak=(index,axis,value)=>{
  if(!normalized||!rule)return
  const steps=normalized.steps.map((step,i)=>i===index?{...step,[axis]:value}:{...step})
  onSetRule(activeIndex,convertIndustrialGradeRule({...normalized,steps},rule.mode))
 }
 const openBreakTable=()=>{
  try{setPasteDraft(formatIndustrialGradeBreakPaste(rule));setPasteIdentity(JSON.stringify(rule));setPasteNotice('');setPasteOpen(true)}
  catch(error){onError?.(error.message)}
 }
 const commitBreakTable=()=>{
  if(!pasteResult?.ok)return
  if(JSON.stringify(rule)!==pasteIdentity){setPasteNotice('The grading source changed while this table was open. Close and reopen to review current breaks.');return}
  try{onSetRule(activeIndex,pasteResult.rule);setPasteOpen(false);setPasteNotice(`Updated all ${pasteResult.count} independent size breaks for P${activeIndex+1}.`)}
  catch(error){setPasteNotice(error.message);onError?.(error.message)}
 }
 return <section className="industrial-grade-workbench" data-industrial-grade-workbench="true" aria-label="Industrial size-break grading">
  <div className="industrial-grade-heading"><strong>INDUSTRIAL GRADING</strong><span>Per-size break rules</span></div>
  <p>AccuMark-inspired point X/Y breaks. Each size jump can differ; all other pattern pieces remain independent until their rules are defined and checked.</p>
  <label>Point to grade<select aria-label="Industrial grading point" value={activeIndex} onChange={event=>setPointIndex(Number(event.target.value))}>{piece.points.map((p,i)=><option key={p.id||i} value={i}>P{String(i+1).padStart(2,'0')}{p.label?` · ${p.label}`:''}</option>)}</select></label>
  {!rule?<button type="button" onClick={()=>{try{onSetRule(activeIndex,initialIndustrialGradeRule(piece,grading,activeIndex))}catch(e){onError?.(e.message)}}}>Enable independent size breaks for point P{activeIndex+1}</button>:<>
   <div className="industrial-grade-actions"><label>Grade mode<select aria-label="Industrial grade rule mode" value={rule.mode} onChange={event=>onSetRule(activeIndex,convertIndustrialGradeRule(rule,event.target.value))}>{Object.entries(INDUSTRIAL_GRADE_MODES).map(([label,mode])=><option key={mode} value={mode}>{label.replaceAll('_',' ').toLowerCase()}</option>)}</select></label><button type="button" onClick={()=>onClearRule(activeIndex)}>Use standard grading</button></div>
   {error?<p role="alert">{error}</p>:<>
    <div className="industrial-grade-breaks" role="group" aria-label="Size break increments"><div className="industrial-grade-row heading"><span>Break</span><span>X cm</span><span>Y cm</span></div>{normalized.steps.map((step,i)=><div className="industrial-grade-row" key={`${normalized.sizes[i]}-${normalized.sizes[i+1]}`}><strong>{normalized.sizes[i]} → {normalized.sizes[i+1]}</strong><BreakInput value={step.dx} label={`${normalized.sizes[i]} to ${normalized.sizes[i+1]} X grade delta centimeters`} onCommit={value=>setBreak(i,'dx',value)}/><BreakInput value={step.dy} label={`${normalized.sizes[i]} to ${normalized.sizes[i+1]} Y grade delta centimeters`} onCommit={value=>setBreak(i,'dy',value)}/></div>)}</div>
    <button type="button" aria-expanded={pasteOpen} onClick={()=>pasteOpen?setPasteOpen(false):openBreakTable()}>{pasteOpen?'Close table editor':'Paste complete size-break table'}</button>
    {pasteOpen&&<div className="industrial-grade-paste" role="group" aria-label="Spreadsheet size break editor">
      <strong>Paste X/Y increments for every adjacent size</strong>
      <small>Paste rows from Excel using X and Y columns, or From / To / X cm / Y cm. Every break is checked before one update.</small>
      <textarea aria-label="Spreadsheet size break values" spellCheck={false} rows={Math.min(12,normalized.steps.length+2)} value={pasteDraft} onChange={event=>{setPasteDraft(event.target.value);setPasteNotice('')}}/>
      <span role="status" aria-live="polite">{pasteResult?.ok?`${pasteResult.count} breaks validated, all sizes matched.`:pasteResult?.reason}</span>
      {pasteIdentity!==JSON.stringify(rule)&&<p role="alert">The grading source changed while this table was open. Reopen before applying.</p>}
      <button type="button" disabled={!pasteResult?.ok||pasteIdentity!==JSON.stringify(rule)} onClick={commitBreakTable}>Apply all size breaks</button>
    </div>}
    {pasteNotice&&<p role="status">{pasteNotice}</p>}
    <div className="industrial-grade-offsets"><strong>Offsets from base {rule.baseSize}</strong>{rule.sizes.map(size=><span key={size}>{size}: {table[size].dx>=0?'+':''}{table[size].dx.toFixed(2)} X / {table[size].dy>=0?'+':''}{table[size].dy.toFixed(2)} Y cm</span>)}</div>
   </>}
  </>}
  <small>Offsets are calculated from the original base point. Notch matching, seam walking, cutting and external CAD import require separate all-size verification. These rules do not certify manufacturing readiness.</small>
 </section>
}
