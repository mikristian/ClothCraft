import React,{useEffect,useRef,useState} from 'react'
import {createAccuMarkNativeRuleSet,editAccuMarkNativePointRule,compileAccuMarkNativeRuleSizeRun} from '../core/accumarkNativePointRuleSet20261023.js'
import {seedAccuMarkNativeRulesFromAffine20261023} from '../core/accumarkNativeRuleSeed20261023.js'
import {copyAccuMarkNativePointRules20261023} from '../core/accumarkNativeRuleBatch20261023.js'
import {encodeAccuMarkNativeGradeSidecar20261023,decodeAccuMarkNativeGradeSidecar20261023} from '../core/nativeGradeSidecarBrowser.js'
import {setNativeAdjacentGradeBreak20261025,setNativeUniformGradeBreaks20261025} from '../core/nativeGradeAdjacentBreak20261025.js'
import {inspectAccuMarkNativeRuleSizeQA20261023} from '../core/accumarkNativeRuleSizeQA20261023.js'

const format=n=>Number.isFinite(n)?n.toFixed(2):'—'
const numeric=s=>s.trim()!==''&&Number.isFinite(Number(s))

/** Native EXO point grading rules stored as a separately importable/exposable
 * versioned sidecar. NEVER call grade-pattern or imply native Rust source
 * is mutated. The existing compiled native project will remain loadable. */
export default function AccuMarkNativeRuleTableEditor20261023({
 snapshot,ruleSet,onChange,onClear,affineRun,panelId,pointIndex,
 onSelectPoint,selectedSize,onSelectSize,disabled=false,
}){
 const uploadRef=useRef(null)
 const [localPoint,setLocalPoint]=useState('0')
 const [x,setX]=useState('0')
 const [y,setY]=useState('0')
 const [notice,setNotice]=useState('')
 const [copyTargetPanel,setCopyTargetPanel]=useState('')
 const [copyTargets,setCopyTargets]=useState('')
 const [copyAxis,setCopyAxis]=useState('both')
 const [breakTo,setBreakTo]=useState('')
 const [stepX,setStepX]=useState('0')
 const [stepY,setStepY]=useState('0')
 const panel=snapshot?.template?.panels?.find(item=>item.id===panelId)
 const points=panel?.polygon?.points||[]
 const activeIndex=Number.isInteger(pointIndex)&&pointIndex>=0&&pointIndex<points.length?pointIndex:
  Math.min(Number(localPoint)||0,Math.max(0,points.length-1))
 const activeSize=ruleSet?.sizes?.includes(selectedSize)?selectedSize:(ruleSet?.sizes?.find(s=>s!==ruleSet.baseSize)||'')
 const offsets=ruleSet?.panels?.[panelId]?.pointOffsetsMm?.[activeSize]
 const current=offsets?.[activeIndex]||[0,0]
 const sizes=ruleSet?.sizes||[]
 const breakEnd=sizes.indexOf(breakTo)>0?breakTo:sizes[1]||''
 const breakIndex=sizes.indexOf(breakEnd)
 const breakStart=breakIndex>0?sizes[breakIndex-1]:''
 const breaks=sizes.slice(1).map((size,index)=>{
  const current=ruleSet?.panels?.[panelId]?.pointOffsetsMm?.[size]?.[activeIndex]
  const previous=ruleSet?.panels?.[panelId]?.pointOffsetsMm?.[sizes[index]]?.[activeIndex]
  return {from:sizes[index],to:size,dx:current?.[0]-previous?.[0],dy:current?.[1]-previous?.[1]}
 })
 const selectedBreak=breaks.find(item=>item.to===breakEnd)
 useEffect(()=>{setLocalPoint('0');setNotice('')},[panelId])
 useEffect(()=>{setX(String(Number(current[0].toFixed(5))));setY(String(Number(current[1].toFixed(5))))},
  [ruleSet,panelId,activeSize,activeIndex])
 useEffect(()=>{
  setStepX(String(Number.isFinite(selectedBreak?.dx)?Number(selectedBreak.dx.toFixed(5)):0))
  setStepY(String(Number.isFinite(selectedBreak?.dy)?Number(selectedBreak.dy.toFixed(5)):0))
 },[ruleSet,panelId,activeIndex,breakEnd])
 const create=fromAffine=>{
  const result=fromAffine?seedAccuMarkNativeRulesFromAffine20261023(snapshot,affineRun):
    createAccuMarkNativeRuleSet(snapshot)
  if(!result.ok){setNotice('Rule table unavailable: '+result.reason);return}
  onChange?.(result.ruleSet)
  setNotice(fromAffine
   ?'Created an independently editable XS–XXL draft initialized from the verified affine preview. Curved handles are approximate.'
   :'Created zero-offset independent XS–XXL rules. Enter individual point movement below.')
 }
 const apply=()=>{
  if(!ruleSet||disabled||!panel)return
  if(!numeric(x)||!numeric(y)){setNotice('Enter finite X and Y millimetre offsets.');return}
  const updated=editAccuMarkNativePointRule(snapshot,ruleSet,{
   panelId,pointIndex:activeIndex,size:activeSize,dxMm:Number(x),dyMm:Number(y),
  })
  if(!updated.ok){setNotice('Point grade blocked: '+updated.reason);return}
  const rendered=compileAccuMarkNativeRuleSizeRun(snapshot,updated.ruleSet,{selectedSize:activeSize})
  if(!rendered.ok){setNotice('Geometry rejected: '+rendered.reason);return}
  const physical=inspectAccuMarkNativeRuleSizeQA20261023(snapshot,updated.ruleSet)
  if(!physical.ok){setNotice('Six-size contour QA blocked this edit: '+
   (physical.issues?.[0]?.message||physical.issues?.[0]?.reason||'Incomplete or intersecting graded contours'));return}
  onChange?.(updated.ruleSet)
  setNotice(`Edited ${panelId} P${activeIndex+1} ${activeSize}. All six size contours passed source geometry QA; sewn lengths and manufacturing still require verification.`)
 }
 const applyBreak=()=>{
  if(!ruleSet||disabled||!panel||!numeric(stepX)||!numeric(stepY)){
   setNotice('Enter finite numeric adjacent X and Y increments in millimetres.');return
  }
  const result=setNativeAdjacentGradeBreak20261025(snapshot,ruleSet,{
   panelId,pointIndex:activeIndex,fromSize:breakStart,toSize:breakEnd,
   dxMm:Number(stepX),dyMm:Number(stepY),
  })
  if(!result.ok){setNotice('Adjacent size break rejected: '+result.reason);return}
  onChange?.(result.ruleSet)
  setNotice(`Adjusted ${breakStart} → ${breakEnd} for P${activeIndex+1}. Kept the other size increments and fixed base; changed ${result.changedSizes.join(', ')}. Six-size contour checks passed. Sewing and factory QA remain separate.`)
 }
 const applyAllBreaks=()=>{
  if(!ruleSet||disabled||!panel||!numeric(stepX)||!numeric(stepY)){
   setNotice('Enter finite uniform X and Y grade increments.');return
  }
  const result=setNativeUniformGradeBreaks20261025(snapshot,ruleSet,{
   panelId,pointIndex:activeIndex,dxMm:Number(stepX),dyMm:Number(stepY),
  })
  if(!result.ok){setNotice('Uniform grade rejected: '+result.reason);return}
  onChange?.(result.ruleSet)
  setNotice(`Assigned ${stepX} X / ${stepY} Y mm to every adjacent size break for P${activeIndex+1}; base stays fixed. All-size contour QA passed; review seams and measurements.`)
 }
 const download=()=>{
  if(!ruleSet||!snapshot)return
  const encoded=encodeAccuMarkNativeGradeSidecar20261023(JSON.stringify(snapshot),JSON.stringify(ruleSet))
  if(!encoded.ok){setNotice('Grade sidecar export blocked: '+encoded.reason);return}
  const blob=new Blob([encoded.json+'\n'],{type:'application/json'})
  const url=URL.createObjectURL(blob),link=document.createElement('a')
  link.href=url;link.download=`exo-native-grade-rules-${ruleSet.templateFingerprint?.split(':')?.[1]||'draft'}.grade.json`
  link.click();setTimeout(()=>URL.revokeObjectURL(url),3000)
  setNotice(`Exported ${encoded.byteLength} byte versioned grade-rule JSON with checksum and source geometry fingerprint. This is NOT the native Rust garment project file.`)
 }
 const copyPointRules=()=>{
  const targetPanel=copyTargetPanel||panelId
  const values=copyTargets.split(',').map(s=>s.trim())
  if(!values.length||values.some(s=>!/^\d+$/.test(s))){setNotice('Enter nonnegative destination indices, e.g. 2,3,6 (P3,P4,P7).');return}
  const indices=values.map(Number)
  const result=copyAccuMarkNativePointRules20261023(snapshot,ruleSet,{
   source:{panelId,pointIndex:activeIndex},
   targets:indices.map(pointIndex=>({panelId:targetPanel,pointIndex})),
   axis:copyAxis,
  })
  if(!result.ok){setNotice('Copy Grade blocked: '+result.reason);return}
  onChange?.(result.ruleSet)
  setNotice(`Copied ${copyAxis.toUpperCase()} grading across ${ruleSet.sizes.length} sizes to ${indices.length} destination point(s). The source pattern and Rust project remain unchanged.`)
 }
 const upload=async event=>{
  const file=event.target.files?.[0]
  event.target.value=''
  if(!file)return
  if(file.size>2097152){setNotice('Grade rule file too large (2 MiB maximum).');return}
  try{
   const source=await file.text()
   const decoded=decodeAccuMarkNativeGradeSidecar20261023(JSON.stringify(snapshot),source.trim())
   if(decoded.ok){
    onChange?.(decoded.ruleSet)
    setNotice('Imported checksum-checked grade rules matching this exact source geometry. No native Rust pattern was overwritten.')
   }else{
    // Support earlier versions of this EXO UI, which exported the inner raw
    // ruleSet directly. Validate source and every size before accepting. The
    // older envelope did not carry a checksum: disclose reduced provenance.
    let legacy
    try{legacy=JSON.parse(source)}catch{throw Error(decoded.reason)}
    if(legacy?.schema!=='exo.native.point-grading.v1')throw Error(decoded.reason)
    const converted=encodeAccuMarkNativeGradeSidecar20261023(JSON.stringify(snapshot),JSON.stringify(legacy))
    if(!converted.ok)throw Error('Legacy grade rules invalid or stale: '+converted.reason)
    onChange?.(legacy)
    setNotice('Imported legacy raw EXO grading rules after validating every size. Old JSON had no checksum; export again to save the new checked format.')
   }
  }catch(e){setNotice('Import blocked: '+(e?.message||String(e)))}
 }
 const rows=ruleSet?.panels?.[panelId]
 return <section data-native-editable-grade-rule-table="true" aria-label="Editable native point-by-size rule table"
   style={{padding:'9px 8px',border:'1px solid #9baeb8',borderRadius:7,display:'grid',gap:7}}>
  <strong>POINT RULE TABLE · INDEPENDENT XS–XXL</strong>
  <p style={{margin:0}}>Edit each point's movement from the base size in millimetres. Rules live in a separate grade-file draft, not the Rust project. Existing fabric, seam and 3D data stay untouched.</p>
  {!ruleSet&&<div style={{display:'flex',flexWrap:'wrap',gap:6}}>
   <button type="button" disabled={disabled||!snapshot} onClick={()=>create(true)}>Start from current affine sizing</button>
   <button type="button" disabled={disabled||!snapshot} onClick={()=>create(false)}>Start zero-offset grading</button>
  </div>}
  {ruleSet&&<>
   <small role="status">{ruleSet.sizes.length} sizes · {Object.keys(ruleSet.panels||{}).length} panels · BASE {ruleSet.baseSize} fixed · separate grade rules</small>
   <div style={{display:'flex',flexWrap:'wrap',gap:7}}>
    <label>Point<select aria-label="Independent native graded point" value={activeIndex}
      onChange={e=>{const i=Number(e.target.value);setLocalPoint(String(i));onSelectPoint?.(i)}}>
      {points.map((_,i)=><option key={i} value={i}>P{i+1}</option>)}
    </select></label>
    <label>Size<select aria-label="Independent native grading edit size" value={activeSize}
      onChange={e=>onSelectSize?.(e.target.value)}>
      {ruleSet.sizes.map(size=><option key={size} value={size}>{size}{size===ruleSet.baseSize?' · base (locked)':''}</option>)}
    </select></label>
   </div>
   {rows&&<div style={{maxHeight:230,overflow:'auto'}}>
    <table style={{width:'100%',fontSize:11,fontVariantNumeric:'tabular-nums'}} aria-label="Independent editable grade movements by size">
     <thead><tr><th>Size</th><th>ΔX mm</th><th>ΔY mm</th></tr></thead>
     <tbody>{ruleSet.sizes.map(size=>{
      const v=rows.pointOffsetsMm[size]?.[activeIndex]
      return <tr key={size} style={{fontWeight:size===activeSize?'bold':'normal'}}>
       <td>{size}{size===ruleSet.baseSize?' · base':''}</td><td>{format(v?.[0])}</td><td>{format(v?.[1])}</td>
      </tr>
     })}</tbody>
    </table>
   </div>}
   <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
    <label>X movement (mm)<input aria-label="Native grade point horizontal movement mm" type="number"
      step=".1" value={x} onChange={e=>setX(e.target.value)}/></label>
    <label>Y movement (mm)<input aria-label="Native grade point vertical movement mm" type="number"
      step=".1" value={y} onChange={e=>setY(e.target.value)}/></label>
   </div>
   <button type="button" disabled={disabled||activeSize===ruleSet.baseSize||!rows}
     onClick={apply}>Apply point grading to {activeSize}</button>
   <details data-native-adjacent-grade-break="true">
    <summary>Adjacent size breaks · preserve other growths</summary>
    <p>Set a precise movement between consecutive sizes. The base size stays fixed, and other size increments stay unchanged. EXO moves the sizes on the edited interval’s outer side.</p>
    <div style={{overflowX:'auto',maxHeight:180,overflowY:'auto'}}>
     <table aria-label="Adjacent native size grade breaks" style={{width:'100%',fontSize:11,fontVariantNumeric:'tabular-nums'}}>
      <thead><tr><th>From → To</th><th>X step mm</th><th>Y step mm</th></tr></thead>
      <tbody>{breaks.map(item=><tr key={item.to}>
       <th>{item.from} → {item.to}</th><td>{format(item.dx)}</td><td>{format(item.dy)}</td>
      </tr>)}</tbody>
     </table>
    </div>
    <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'end'}}>
     <label>Size interval<select aria-label="Adjacent grading interval" value={breakEnd}
       onChange={event=>setBreakTo(event.target.value)}>
       {breaks.map(item=><option key={item.to} value={item.to}>{item.from} → {item.to}</option>)}
     </select></label>
     <label>X step (mm)<input type="number" step=".1" aria-label="Adjacent grading X step millimetres"
       value={stepX} onChange={event=>setStepX(event.target.value)}/></label>
     <label>Y step (mm)<input type="number" step=".1" aria-label="Adjacent grading Y step millimetres"
       value={stepY} onChange={event=>setStepY(event.target.value)}/></label>
     <button type="button" disabled={disabled||!rows||!breakEnd} onClick={applyBreak}>
      Apply interval to P{activeIndex+1}
     </button>
    </div>
    <button type="button" disabled={disabled||!rows||!breakEnd} onClick={applyAllBreaks}>
     Apply X/Y step to all size intervals · P{activeIndex+1}
    </button>
    <small>All-interval mode replaces the other increments for this point. Select one interval above to preserve the other growths instead.</small>
    <small>Unrelated pattern points and panels remain unchanged. No active 3D garment is resized by editing a size break.</small>
   </details>
   <details>
    <summary>Copy Grade · All sizes, multiple points</summary>
    <p>Copy the selected point's per-size X movement, Y movement or both to other vertices across this or another block. The entire edit is validated as one separate grading-rule transaction.</p>
    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
     <label>Destination panel<select aria-label="Copy grading destination native pattern" value={copyTargetPanel||panelId}
       onChange={e=>setCopyTargetPanel(e.target.value)}>
       {(snapshot?.template?.panels||[]).map(panel=><option key={panel.id} value={panel.id}>{panel.name||panel.id}</option>)}
     </select></label>
     <label>Transfer<select aria-label="Copy grading X or Y movement" value={copyAxis}
       onChange={e=>setCopyAxis(e.target.value)}>
       <option value="both">X + Y</option><option value="x">X only</option><option value="y">Y only</option>
     </select></label>
    </div>
    <label>Destination point indices (zero-based)<input type="text"
      aria-label="Copy grading destination point numbers" placeholder="2,3,6"
      value={copyTargets} onChange={e=>setCopyTargets(e.target.value)}/></label>
    <button type="button" disabled={disabled} onClick={copyPointRules}>Copy all-size grading</button>
   </details>
  </>}
  <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
   <button type="button" disabled={!ruleSet} onClick={download}>Export verified grade rules JSON</button>
   <button type="button" disabled={disabled||!snapshot} onClick={()=>uploadRef.current?.click()}>Import grade rules JSON</button>
   <input type="file" hidden ref={uploadRef} accept=".json,application/json" onChange={upload}/>
   <button type="button" disabled={!ruleSet} onClick={()=>{onClear?.();setNotice('Draft removed from current session and local autosave; exported files remain unchanged.')}}>
    Clear separate grade draft
   </button>
  </div>
  <small>This is a validated EXO sidecar grade-run preview, not a committed Rust session. Geometry changes must be independently approved before seam matching, simulation, DXF or manufacturing.</small>
  {notice&&<p role="status" style={{margin:0}}>{notice}</p>}
 </section>
}
