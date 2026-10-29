import React,{useEffect,useRef,useState} from 'react'
import IndustrialGradeWorkbench from './IndustrialGradeWorkbench.jsx'
import {evaluateIndustrialGradeTable,validateIndustrialGradeRule} from '../core/industrialGradeRules.js'
import './AccuMarkGradeActions.css'

/** Copy a rule only when every adjacent size has a valid numeric break. */
export function copyIndustrialPointRule(point,grading){
 const rule=validateIndustrialGradeRule(point?.industrialGradeRule)
 assertMatchingSizeLine(rule,grading)
 assertFiniteEvaluatedRule(rule)
 return validateIndustrialGradeRule(rule)
}

function assertFiniteEvaluatedRule(rule){
 const offsets=evaluateIndustrialGradeTable(rule)
 if(rule.sizes.some(size=>!Number.isFinite(offsets[size].dx)||!Number.isFinite(offsets[size].dy)))throw new Error('Grade rule produces nonfinite cumulative offsets')
}

/** A copied rule must still belong to the current editing context. */
export function canPasteIndustrialPointRule(clipboard,grading,sourcePieceId,targetPieceId){
 if(!clipboard||!sourcePieceId||!targetPieceId||sourcePieceId!==targetPieceId)return false
 try{pasteIndustrialPointRule(clipboard,grading);return true}catch{return false}
}

export function assertMatchingSizeLine(rule,grading){
 const sizes=grading?.sizes
 if(!Array.isArray(sizes)||sizes.length<2||sizes.length>64||sizes.some(size=>typeof size!=='string'||!size.trim()||size.trim()!==size)||new Set(sizes).size!==sizes.length||!sizes.includes(grading?.baseSize)){
  throw new Error('Choose a valid garment size run and base size before copying grade rules')
 }
 if(rule.sizes.length!==sizes.length||rule.sizes.some((size,index)=>size!==sizes[index])||rule.baseSize!==grading.baseSize){
  throw new Error('Clipboard rule has a different ordered size line or base size')
 }
}

/** Preserve independent point rules; no source or clipboard object is mutated. */
export function pasteIndustrialPointRule(clipboard,grading){
 const rule=validateIndustrialGradeRule(clipboard)
 assertMatchingSizeLine(rule,grading)
 assertFiniteEvaluatedRule(rule)
 return validateIndustrialGradeRule(rule)
}

export default function AccuMarkGradeActions({
 piece,grading,previewSize,showGradeNest,onSelectSize,onToggleNest,onSetRule,onClearRule,onError,disabled=false,
}){
 const [pointIndex,setPointIndex]=useState(0)
 const [clipboard,setClipboard]=useState(null)
 const [clipboardPieceId,setClipboardPieceId]=useState(null)
 const [notice,setNotice]=useState('')
 const selectionPieceId=useRef(piece?.id)
 const points=Array.isArray(piece?.points)?piece.points:[]
 const selectedIndex=selectionPieceId.current===piece?.id?Math.min(pointIndex,Math.max(0,points.length-1)):0
 const selectedPoint=points[selectedIndex]
 const sizes=Array.isArray(grading?.sizes)?grading.sizes:[]
 const validSizeLine=sizes.length>=2&&sizes.length<=64&&sizes.every(size=>typeof size==='string'&&size.trim()===size&&size.length>0)&&new Set(sizes).size===sizes.length&&sizes.includes(grading?.baseSize)
 const canEdit=!disabled&&!!points.length&&typeof onSetRule==='function'
 const editableClear=typeof onClearRule==='function'&&!disabled
 const notifyError=error=>{const message=error instanceof Error?error.message:String(error);setNotice(message);onError?.(message)}
 const copyRule=()=>{
  try{
   const copy=copyIndustrialPointRule(selectedPoint,grading)
   setClipboard(copy)
   setClipboardPieceId(piece?.id??null)
   setNotice(`Copied P${selectedIndex+1} grade rule (${copy.mode}).`)
  }catch(error){notifyError(error)}
 }
 const pasteRule=()=>{
  try{
   if(!clipboard)throw new Error('Copy an independent point grade rule first')
   if(clipboardPieceId!==piece?.id)throw new Error('Copy a rule from the currently selected pattern piece first')
   const copy=pasteIndustrialPointRule(clipboard,grading)
   onSetRule(selectedIndex,copy)
   setNotice(`Pasted independent grade rule to P${selectedIndex+1}.`)
  }catch(error){notifyError(error)}
 }
 useEffect(()=>{selectionPieceId.current=piece?.id;setNotice('');setPointIndex(0)},[piece?.id])
 return <section className="accumark-grade-actions" aria-label="Pattern grading tools" data-accumark-grade-actions="true">
  <div className="accumark-grade-title"><strong>GRADE TOOLS</strong><span>Point rules / size run</span></div>
  <div className="accumark-grade-row">
   <label>Preview size<select aria-label="Grade preview size" value={sizes.includes(previewSize)?previewSize:(grading?.baseSize||'')} disabled={disabled||!validSizeLine||typeof onSelectSize!=='function'} onChange={event=>onSelectSize(event.target.value)}>{sizes.map(size=><option value={size} key={size}>{size}{size===grading?.baseSize?' (base)':''}</option>)}</select></label>
   <label className="accumark-grade-nest"><input type="checkbox" checked={Boolean(showGradeNest)} disabled={disabled||typeof onToggleNest!=='function'} onChange={event=>onToggleNest(event.target.checked)}/>Show grade nest</label>
  </div>
  {points.length>0?<>
   <div className="accumark-grade-clipboard"><label>Clipboard point<select value={selectedIndex} disabled={disabled} aria-label="Grade clipboard point" onChange={event=>{setPointIndex(Number(event.target.value));setNotice('')}}>{points.map((point,index)=><option value={index} key={point.id||index}>P{String(index+1).padStart(2,'0')}{point.label?` · ${point.label}`:''}{point.industrialGradeRule?' · Rule':''}</option>)}</select></label>
    <div className="accumark-grade-buttons"><button type="button" disabled={disabled||!selectedPoint?.industrialGradeRule||!validSizeLine} onClick={copyRule}>Copy rule</button><button type="button" disabled={!canEdit||!canPasteIndustrialPointRule(clipboard,grading,clipboardPieceId,piece?.id)} onClick={pasteRule}>Paste rule</button></div>
   </div>
   <fieldset className="accumark-grade-workbench-wrapper" disabled={disabled} aria-disabled={disabled}>
    <IndustrialGradeWorkbench key={piece?.id??'selected-piece'} piece={piece} grading={grading}
     onSetRule={(index,rule)=>{if(!canEdit)return;try{const checked=validateIndustrialGradeRule(rule);assertMatchingSizeLine(checked,grading);onSetRule(index,checked)}catch(error){notifyError(error)}}}
     onClearRule={index=>{if(editableClear)onClearRule(index)}} onError={notifyError}/>
   </fieldset>
  </>:<p>Select a pattern piece to edit grading rules.</p>}
  {notice&&<p role="status" className="accumark-grade-notice">{notice}</p>}
  <small>Copied rules retain separate X/Y breaks for every size interval. Confirm seam alignment and notches before production export.</small>
 </section>
}
