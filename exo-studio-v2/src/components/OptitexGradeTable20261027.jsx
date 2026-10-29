import React,{useEffect,useMemo,useState} from 'react'
import {ChevronLeft,ChevronRight,Copy,ClipboardPaste,Eraser,Layers,Eye,EyeOff,MoveHorizontal,MoveVertical,Minus,Plus,Undo2,Redo2} from 'lucide-react'
import {createAccuMarkNativeRuleSet,editAccuMarkNativePointRule,compileAccuMarkNativeRuleSizeRun} from '../core/accumarkNativePointRuleSet20261023.js'
import {nativeRustEdgeLength20261023} from '../core/nativeRustArcLengthCompat20261023.js'
import {inspectAccuMarkNativeRuleSizeQA20261023} from '../core/accumarkNativeRuleSizeQA20261023.js'
import './OptitexGradeTable20261027.css'

export const OPTITEX_GRADE_COLORS_20261027=['#5c91ef','#d276e6','#df9659','#50af96','#bb9aee','#e16c83','#57a2b8','#d6b25b']
const fixed=value=>Number.isFinite(value)?value.toFixed(2):'—'
const names=ruleSet=>ruleSet?.sizes||['XS','S','M','L','XL','XXL']

/** A visible, independently editable native sidecar table. A source-fingerprint
 * guard and all-size compilation apply before any point movement is accepted.
 * Compare Length uses real drafted contour edges, not a sewn factory audit. */
export default function OptitexGradeTable20261027({snapshot,ruleSet,panelId,selectedPointIndex=0,
 selectedSize,onSelectSize,onSelectPoint,onSelectPanel,onSelectContour,onApplyRuleSet,disabled=false,
 visibleSizes=[],onVisibleSizesChange,colorsBySize={},onColorsBySizeChange,
 onCommitNativeCatalog,onRecoverNativeCatalog,catalogMessage='',displayMode=null,compact=false,onGradeTool,
 onUndoGradeDraft,onRedoGradeDraft,canUndoGradeDraft=false,canRedoGradeDraft=false,
 embeddedSummary=false,embeddedMicro=false,onExpandEmbed,docked=false}){
 const [tab,setTab]=useState('values'),[notice,setNotice]=useState('')
 const [gradeView,setGradeView]=useState('offsets')
 const [advancedTools,setAdvancedTools]=useState(false)
 const [clipboard,setClipboard]=useState(null),[motionAmount,setMotionAmount]=useState('1')
 const [motionAxis,setMotionAxis]=useState('x')
 const activeTab=displayMode==='compare'?'compare':displayMode==='values'?'values':tab
 const [edgeA,setEdgeA]=useState(0),[edgeB,setEdgeB]=useState(1)
 const [panelB,setPanelB]=useState('')
 const [compareTolerance,setCompareTolerance]=useState('2')
 const sizes=names(ruleSet),baseSize=ruleSet?.baseSize||'M'
 const panels=snapshot?.template?.panels||[]
 const sourcePanel=panels.find(p=>p.id===panelId)||panels[0]
 const otherPanel=panels.find(p=>p.id===panelB)||sourcePanel
 const selectedPoint=Number.isInteger(selectedPointIndex)&&selectedPointIndex>=0&&
  selectedPointIndex<(sourcePanel?.polygon?.points?.length||0)?selectedPointIndex:0
 const visible=Array.isArray(visibleSizes)?visibleSizes:sizes
 const compiled=useMemo(()=>ruleSet&&snapshot?
  compileAccuMarkNativeRuleSizeRun(snapshot,ruleSet,{selectedSize:sizes.includes(selectedSize)?selectedSize:baseSize}):null,
 [snapshot,ruleSet,selectedSize,baseSize,sizes.join('|')])
 const rows=useMemo(()=>sizes.map((size,index)=>{
  const pt=ruleSet?.panels?.[sourcePanel?.id]?.pointOffsetsMm?.[size]?.[selectedPoint]
  const previous=index&&ruleSet?.panels?.[sourcePanel?.id]?.pointOffsetsMm?.[sizes[index-1]]?.[selectedPoint]
  const polygonA=compiled?.ok?compiled.byPanel?.[sourcePanel?.id]?.sizeRun?.[size]?.polygon:!ruleSet&&size===baseSize?sourcePanel?.polygon:null
  const polygonB=compiled?.ok?compiled.byPanel?.[otherPanel?.id]?.sizeRun?.[size]?.polygon:!ruleSet&&size===baseSize?otherPanel?.polygon:null
  const nameA=polygonA?.edges?.[edgeA],nameB=polygonB?.edges?.[edgeB]
  const a=nameA?nativeRustEdgeLength20261023(polygonA,nameA):null
  const b=nameB?nativeRustEdgeLength20261023(polygonB,nameB):null
  return {size,point:pt||(size===baseSize?[0,0]:[null,null]),step:previous&&pt?[pt[0]-previous[0],pt[1]-previous[1]]:null,
   a:a?.ok?a.totalLengthM*1000:null,b:b?.ok?b.totalLengthM*1000:null}
 }),[sizes.join('|'),ruleSet,sourcePanel,otherPanel,selectedPoint,compiled,edgeA,edgeB])
 const shownRows=embeddedSummary?rows.filter(row=>row.size===(sizes.includes(selectedSize)?selectedSize:baseSize)):rows
 const thresholdMm=compareTolerance.trim()!==''&&Number.isFinite(Number(compareTolerance))&&
  Number(compareTolerance)>=0&&Number(compareTolerance)<=100?Number(compareTolerance):null
 const sameContour=sourcePanel?.id===otherPanel?.id&&edgeA===edgeB
 const compared=rows.filter(row=>row.a!=null&&row.b!=null)
 const overTolerance=thresholdMm==null?[]:compared.filter(row=>Math.abs(row.a-row.b)>thresholdMm)
 const pickContour=(side,size)=>{
  const panel=side==='a'?sourcePanel:otherPanel
  const edge=panel?.polygon?.edges?.[side==='a'?edgeA:edgeB]
  if(!panel||!edge)return
  onSelectSize?.(size)
  onSelectContour?.({panelId:panel.id,edge,size,side})
  setNotice(`Selected ${size} · ${panel.name||panel.id} · ${edge} on the 2D grading nest.`)
 }
 useEffect(()=>setEdgeA(0),[sourcePanel?.id]);useEffect(()=>setEdgeB((otherPanel?.polygon?.edges?.length||0)>1?1:0),[otherPanel?.id])
 const toggle=size=>onVisibleSizesChange?.(visible.includes(size)?
  visible.filter(v=>v!==size):sizes.filter(v=>visible.includes(v)||v===size))
 useEffect(()=>setClipboard(null),[sourcePanel?.id])
 const validGradePoint=!!sourcePanel?.polygon?.points?.length&&
  Number.isInteger(selectedPoint)&&selectedPoint<sourcePanel.polygon.points.length
 const matchingClipboard=clipboard?.panelId===sourcePanel?.id&&clipboard?.schema==='exo.grade-clipboard.v1'&&
  clipboard.baseSize===baseSize&&Array.isArray(clipboard.sizes)&&clipboard.sizes.length===sizes.length&&
  sizes.every((size,i)=>clipboard.sizes[i]===size&&Array.isArray(clipboard.vectors?.[size])&&
   clipboard.vectors[size].length===2&&clipboard.vectors[size].every(Number.isFinite))
 const gradeAction=(id,extra={})=>{
  if(disabled){setNotice('Grading is locked while the workspace is busy or a graded size is active.');return}
  if(!snapshot?.template){setNotice('A native pattern source is required for grading commands.');return}
  if(!validGradePoint){setNotice('Select a pattern panel with a valid grading point.');return}
  if(id==='prev-point'||id==='next-point'){
   if(typeof onSelectPoint!=='function'){setNotice('Point selection is unavailable.');return}
   const next=(selectedPoint+(id==='next-point'?1:-1)+sourcePanel.polygon.points.length)%sourcePanel.polygon.points.length
   onSelectPoint(next);setNotice(`Selected P${next+1}.`);return
  }
  // The EXO native tool dispatcher can create an initial source-matched
  // XS–XXL draft and execute on the SAME first click. Do not block that
  // workflow merely because the in-table sidecar is initially empty.
  if(ruleSet&&!ruleSet.panels?.[sourcePanel.id]){
   setNotice('The current grade run does not contain this selected pattern panel.');return
  }
  if(ruleSet&&!compiled?.ok){setNotice(`Native grading rules are unavailable: ${compiled?.reason||'source geometry rejected'}`);return}
  if(id==='paste-grading'&&!matchingClipboard){setNotice('Copy grading from a point on this panel and matching size run first.');return}
  if(typeof onGradeTool!=='function'){setNotice('Native grading command handler is not connected.');return}
  const options={panelId:sourcePanel.id,pointIndex:selectedPoint,selectedPointIndex:selectedPoint,
   selectedSize:sizes.includes(selectedSize)?selectedSize:baseSize,size:sizes.includes(selectedSize)?selectedSize:baseSize,
   clipboard:id==='paste-grading'?clipboard:null,targetPointIndex:selectedPoint,...extra}
  const label={'copy-grading':'Copy Grading','paste-grading':'Paste Grading','clear-grading':'Clear Grading',
   'show-from-base-size':'Show Base','stack-point':'Stack Point','move-point-size':'Move Point Size'}[id]||id
  const receive=result=>{
   if(!result||result.ok!==true){setNotice(`${label}: ${result?.reason||'Native grading did not confirm this operation.'}`);return}
   if(id==='copy-grading'){
    const copied=result.clipboard
    if(!copied||copied.schema!=='exo.grade-clipboard.v1'||copied.baseSize!==baseSize||
     !Array.isArray(copied.sizes)||copied.sizes.length!==sizes.length||
     !sizes.every((size,i)=>copied.sizes[i]===size&&Array.isArray(copied.vectors?.[size])&&
      copied.vectors[size].length===2&&copied.vectors[size].every(Number.isFinite))){
     setNotice('Copy Grading: native handler returned invalid size vectors.');return
    }
    setClipboard({...copied,panelId:sourcePanel.id})
   }
   setNotice(result.notice||`${label} completed.`)
  }
  try{const result=onGradeTool(id,options)
   if(result&&typeof result.then==='function')result.then(receive).catch(error=>setNotice(`${label}: ${error?.message||String(error)}`))
   else receive(result)
  }catch(error){setNotice(`${label}: ${error?.message||String(error)}`)}
 }
 const adjustGrade=direction=>{
  const amount=Number(motionAmount)
  if(motionAmount.trim()===''||!Number.isFinite(amount)||amount<=0||amount>1000000){
   setNotice('Enter a positive finite grade movement in millimetres.');return
  }
  if(!sizes.includes(selectedSize)||selectedSize===baseSize){setNotice('Select a non-base graded size before moving its point.');return}
  gradeAction('move-point-size',{axis:motionAxis,amountMm:amount*direction,angleDeg:0})
 }
 const ensureDraft=()=>{
  const created=createAccuMarkNativeRuleSet(snapshot)
  if(!created.ok){setNotice(created.reason);return}
  if(typeof onApplyRuleSet!=='function'||onApplyRuleSet(created.ruleSet)!==true){
   setNotice('No native grading draft was confirmed. Restore a valid pattern source and retry.');return
  }
  setNotice('Created a source-matched six-size draft with zero increments. Enter point offsets to grade; the nest and Compare Length use these same rules.')
 }
 const changeOffset=(size,axis,value)=>{
  if(disabled||!ruleSet||size===baseSize)return false
  if(String(value).trim()===''||!Number.isFinite(Number(value))){setNotice('Enter a finite millimetre offset.');return false}
  const current=ruleSet.panels[sourcePanel.id].pointOffsetsMm[size][selectedPoint]
  const vals=[...current];vals[axis]=Number(value)
  const edited=editAccuMarkNativePointRule(snapshot,ruleSet,{panelId:sourcePanel.id,
   pointIndex:selectedPoint,size,dxMm:vals[0],dyMm:vals[1]})
  if(!edited.ok){setNotice(edited.reason);return false}
  const validation=compileAccuMarkNativeRuleSizeRun(snapshot,edited.ruleSet,{selectedSize:size})
  if(!validation.ok){setNotice(validation.reason);return false}
  const qa=inspectAccuMarkNativeRuleSizeQA20261023(snapshot,edited.ruleSet)
  if(!qa.ok){setNotice('Physical size contours rejected: '+
   (qa.issues?.[0]?.message||qa.issues?.[0]?.reason||'One or more size contours failed geometry QA'));return false}
  if(typeof onApplyRuleSet!=='function'||onApplyRuleSet(edited.ruleSet)!==true){
   setNotice('Grade edit not confirmed by source-matched drafting storage. Restored the previous cell value.');return false
  }
  setNotice(`${size} P${selectedPoint+1}: ${fixed(vals[0])} X / ${fixed(vals[1])} Y mm, source-safe draft saved.`)
  return true
 }
 const download=()=>{
  const lines=[['Size','Point','Offset X mm','Offset Y mm','Break X mm','Break Y mm','Edge A mm','Edge B mm','A minus B mm','Ratio A / B'],
   ...rows.map(r=>[r.size,`P${selectedPoint+1}`,r.point[0],r.point[1],r.step?.[0]??'',r.step?.[1]??'',
    r.a??'',r.b??'',r.a!=null&&r.b!=null?r.a-r.b:'',r.a!=null&&r.b?r.a/r.b:''])]
  const csv=lines.map(row=>row.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\r\n')
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}))
  const link=document.createElement('a');link.href=url;link.download='exo-grading-table-review.csv';link.click()
  URL.revokeObjectURL(url)
 }
 if(embeddedMicro)return <section className="optitex-grading-table optitex-grading-table--micro"
   data-optitex-grading-table="true" data-embedded-summary="true" data-grade-display-mode={activeTab}
   aria-label={activeTab==='values'?'Compact grading table':'Compact length comparison'}>
   <strong>{activeTab==='values'?'Grading':'Compare length'}</strong>
   <label>Size <select aria-label="Embedded worksheet size" value={sizes.includes(selectedSize)?selectedSize:baseSize}
    onChange={e=>onSelectSize?.(e.target.value)}>{sizes.map(size=><option key={size} value={size}>{size}</option>)}</select></label>
   <button type="button" onClick={onExpandEmbed}>Expand worksheet</button>
  </section>
 const sizesOnly=activeTab==='values'&&gradeView==='sizes'
 return <section className={`optitex-grading-table ${compact?'optitex-grading-table--compact':''}`} data-optitex-grading-table="true" data-grade-display-mode={activeTab}
  data-grade-view={sizesOnly?'sizes':'offsets'} data-reference-density="true"
  data-embedded-summary={embeddedSummary?'true':'false'} aria-label="EXO grading table and compare length"
  onKeyDown={event=>{
   if(!(event.metaKey||event.ctrlKey)||['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName))return
   const redo=(event.key.toLowerCase()==='z'&&event.shiftKey)||event.key.toLowerCase()==='y'
   const undo=event.key.toLowerCase()==='z'&&!event.shiftKey
   if((redo&&canRedoGradeDraft)||(undo&&canUndoGradeDraft)){
    event.preventDefault();event.stopPropagation()
    if(redo)onRedoGradeDraft?.();else onUndoGradeDraft?.()
   }
  }}>
  <div className="optitex-grading-tabs"><strong>{activeTab==='compare'?'COMPARE LENGTH':'GRADING TABLE'}</strong>
   {panels.length>1&&typeof onSelectPanel==='function'&&<label className="optitex-grade-panel-selector">Pattern <select aria-label="Grading table source pattern" value={sourcePanel?.id||''}
     onChange={e=>onSelectPanel(e.target.value)}>
     {panels.map(panel=><option key={panel.id} value={panel.id}>{panel.name||panel.id}</option>)}
    </select></label>}
   {activeTab==='values'&&<div className="optitex-grade-view-switch" role="group" aria-label="Grading worksheet view">
    <button type="button" aria-pressed={sizesOnly} onClick={()=>setGradeView('sizes')}>Sizes</button>
    <button type="button" aria-pressed={!sizesOnly} onClick={()=>setGradeView('offsets')}>Offsets</button>
   </div>}
   {embeddedSummary&&<><label className="optitex-embedded-size-picker">Size <select aria-label="Embedded worksheet size" value={sizes.includes(selectedSize)?selectedSize:baseSize}
     onChange={e=>onSelectSize?.(e.target.value)}>{sizes.map(size=><option key={size} value={size}>{size}</option>)}</select></label>
    <button type="button" className="optitex-embedded-expand" onClick={onExpandEmbed} title="Enlarge embedded worksheet to show every size">Expand all {sizes.length} sizes</button></>}
   {!displayMode&&<><button type="button" aria-pressed={activeTab==='values'} onClick={()=>setTab('values')}>Grading table</button>
   <button type="button" aria-pressed={activeTab==='compare'} onClick={()=>setTab('compare')}>Compare Length</button></>}
   <button type="button" onClick={download} disabled={!ruleSet} title="Export all grade sizes and measured lengths as CSV" aria-label="Export review CSV">{compact?'CSV':'Export review CSV'}</button>
   {activeTab==='values'&&<button type="button" disabled={!ruleSet||disabled||typeof onCommitNativeCatalog!=='function'}
     onClick={()=>{setNotice('');onCommitNativeCatalog?.()}} title="Validate and save the graded size catalog to the native Rust project">{compact?'Save to Rust':'Save validated sizes to Rust'}</button>}
  </div>
  {!compact&&<p className="optitex-table-notice">Independent editable size rules, in millimetres. Values below do not alter the active Rust garment until you commit the saved native size catalog.</p>}
 {!ruleSet&&<p role="status">Base pattern loaded. Other sizes have no authored grading yet. Load saved grading or create a zero-increment draft, then enter point offsets.</p>}
 {typeof onRecoverNativeCatalog==='function'&&<button type="button" disabled={disabled} onClick={onRecoverNativeCatalog}>Load saved grading</button>}
 {!ruleSet&&<button type="button" disabled={disabled||!snapshot?.template} onClick={ensureDraft} aria-label="Create native XS–XXL grade table">
   Create native XS–XXL grade table to {activeTab==='compare'?'compare physical graded contours':'edit grading points'}
  </button>}
  {activeTab==='values'&&<div className="optitex-grade-inline-tools" role="toolbar" aria-label="Grading table point and size tools"
   data-grade-compact-tools="true" data-grade-advanced-open={advancedTools?'true':'false'}>
   {typeof onUndoGradeDraft==='function'&&typeof onRedoGradeDraft==='function'&&<span className="optitex-inline-tool-group">
    <button type="button" title="Undo last grading draft edit" aria-label="Undo grading draft" disabled={disabled||!canUndoGradeDraft} onClick={onUndoGradeDraft}><Undo2 size={15}/></button>
    <button type="button" title="Redo last grading draft edit" aria-label="Redo grading draft" disabled={disabled||!canRedoGradeDraft} onClick={onRedoGradeDraft}><Redo2 size={15}/></button>
   </span>}
   <span className="optitex-inline-tool-group"><button type="button" title="Previous point" aria-label="Previous grading point" onClick={()=>gradeAction('prev-point')} disabled={disabled||!validGradePoint}><ChevronLeft size={15}/></button>
   <button type="button" title="Next point" aria-label="Next grading point" onClick={()=>gradeAction('next-point')} disabled={disabled||!validGradePoint}><ChevronRight size={15}/></button></span>
   <label>Point <select aria-label="Grading table point" value={selectedPoint} onChange={e=>onSelectPoint?.(Number(e.target.value))}>
    {(sourcePanel?.polygon?.points||[]).map((_,i)=><option value={i} key={i}>P{i+1}</option>)}
   </select></label>
   <span className="optitex-inline-tool-divider" aria-hidden="true"/>
   <span className="optitex-inline-tool-group"><button type="button" title="Copy grading for current point" aria-label="Copy grading" disabled={disabled||!validGradePoint} onClick={()=>gradeAction('copy-grading')}><Copy size={15}/></button>
   <button type="button" title="Paste grading to current point" aria-label="Paste grading" disabled={disabled||!matchingClipboard||!ruleSet} onClick={()=>gradeAction('paste-grading')}><ClipboardPaste size={15}/></button>
   <button type="button" title="Clear current point grading" aria-label="Clear grading" disabled={disabled||!validGradePoint} onClick={()=>gradeAction('clear-grading')}><Eraser size={15}/></button>
   <button type="button" title="Stack this point across graded sizes" aria-label="Stack grading point" disabled={disabled||!validGradePoint} onClick={()=>gradeAction('stack-point')}><Layers size={15}/></button></span>
   <span className="optitex-inline-tool-divider" aria-hidden="true"/>
   <span className="optitex-inline-tool-group"><button type="button" title="Show all graded outlines" aria-label="Show all grading sizes" onClick={()=>onVisibleSizesChange?.([...sizes])} disabled={!onVisibleSizesChange}><Eye size={15}/><span>All</span></button>
   <button type="button" title="Show base size outline only" aria-label="Show base grading size" onClick={()=>onVisibleSizesChange?.([baseSize])} disabled={!onVisibleSizesChange}><EyeOff size={15}/><span>Base</span></button></span>
   {<button type="button" className="optitex-grade-more-tools" aria-label="Toggle advanced grading controls"
     aria-expanded={advancedTools} title={advancedTools?'Hide movement controls':'Show movement controls'}
     onClick={()=>{
       if(!advancedTools)onExpandEmbed?.()
       setAdvancedTools(value=>!value)
     }}>{advancedTools?'Less':'More'}</button>}
   <span className="optitex-inline-tool-divider" aria-hidden="true"/>
   <span className="optitex-inline-grade-motion"><label title="Grade motion axis">{motionAxis==='x'?<MoveHorizontal size={14}/>:<MoveVertical size={14}/>}<select aria-label="Grade movement axis" value={motionAxis} onChange={e=>setMotionAxis(e.target.value)}><option value="x">X</option><option value="y">Y</option></select></label>
   <label title="Grade motion distance in millimetres"><input aria-label="Grade motion millimetres" type="number" min="0.01" step="0.1" value={motionAmount} onChange={e=>setMotionAmount(e.target.value)}/><span>mm</span></label>
   <button type="button" title="Decrease selected size point grade" aria-label="Decrease grade motion" disabled={disabled||!validGradePoint||selectedSize===baseSize} onClick={()=>adjustGrade(-1)}><Minus size={15}/></button>
   <button type="button" title="Increase selected size point grade" aria-label="Increase grade motion" disabled={disabled||!validGradePoint||selectedSize===baseSize} onClick={()=>adjustGrade(1)}><Plus size={15}/></button></span>
  </div>}
  {activeTab==='compare'&&<div className="optitex-compare-controls" role="toolbar" aria-label="Compare Length contour settings">
   <label title="First physical contour">A <select aria-label="Compare length first edge" value={edgeA} onChange={e=>{setEdgeA(Number(e.target.value));onSelectContour?.({panelId:sourcePanel?.id,edge:sourcePanel?.polygon?.edges?.[Number(e.target.value)],size:selectedSize,side:'a'})}}>
    {(sourcePanel?.polygon?.edges||[]).map((edge,i)=><option key={edge} value={i}>{sourcePanel?.name||sourcePanel?.id} · {edge}</option>)}
   </select></label>
   <label title="Second pattern piece">Piece <select aria-label="Compare length second pattern" value={otherPanel?.id||''} onChange={e=>setPanelB(e.target.value)}>
    {panels.map(p=><option key={p.id} value={p.id}>{p.name||p.id}</option>)}
   </select></label>
   <label title="Second physical contour">B <select aria-label="Compare length second edge" value={edgeB} onChange={e=>{setEdgeB(Number(e.target.value));onSelectContour?.({panelId:otherPanel?.id,edge:otherPanel?.polygon?.edges?.[Number(e.target.value)],size:selectedSize,side:'b'})}}>
    {(otherPanel?.polygon?.edges||[]).map((edge,i)=><option key={edge} value={i}>{edge}</option>)}
   </select></label>
   <label title="Maximum acceptable length difference in millimetres">± mm <input type="number" min="0" max="100" step=".1"
     aria-label="Compare length difference review threshold millimetres"
     value={compareTolerance} onChange={e=>setCompareTolerance(e.target.value)}/></label>
  </div>}
  <div className="optitex-table-scroll"><table aria-label={activeTab==='values'?'Point grade movements by size':'Graded contour length comparison'}>
   <thead><tr>{activeTab==='values'&&<th scope="col" title="Show graded outline">Show</th>}<th scope="col">Size</th>{activeTab==='values'&&<th scope="col" title="Size outline color">Color</th>}{activeTab==='values'&&!sizesOnly?<><th scope="col" title="Horizontal movement in millimetres">ΔX mm</th><th scope="col" title="Vertical movement in millimetres">ΔY mm</th><th scope="col" title="Horizontal increment from previous size">X break</th><th scope="col" title="Vertical increment from previous size">Y break</th></>:
    activeTab==='compare'?<><th scope="col" title="First contour length in millimetres">A · mm</th><th scope="col" title="Second contour length in millimetres">B · mm</th><th scope="col" title="First minus second contour length in millimetres">Δ · mm</th><th scope="col" title="Ratio of contour A to B">A/B</th><th scope="col" title="Difference review against tolerance">Check</th></>:null}</tr></thead>
   <tbody>{shownRows.map((row,index)=>{
    const active=selectedSize===row.size,base=row.size===baseSize
    return <tr key={row.size} className={active?'is-active':''} data-size={row.size} data-base-size={base?'true':'false'}
      onDoubleClick={activeTab==='values'?()=>{onSelectSize?.(row.size);setGradeView('offsets')}:undefined}
      style={{'--exo-grade-swatch':colorsBySize[row.size]||OPTITEX_GRADE_COLORS_20261027[index%OPTITEX_GRADE_COLORS_20261027.length]}}>
     {activeTab==='values'&&<td><input type="checkbox" aria-label={`Show ${row.size} graded outline`} checked={visible.includes(row.size)} onChange={()=>toggle(row.size)}/></td>}
     <th scope="row"><button type="button" aria-pressed={active} aria-label={`Select grading size ${row.size}`}
      title={base?`${row.size} · base size`:`Select ${row.size}`} onClick={()=>onSelectSize?.(row.size)}>{row.size}{base&&<span className="optitex-base-size-mark" title="Base size" aria-hidden="true"> · base</span>}</button></th>
     {activeTab==='values'&&<td><input type="color" aria-label={`Grading color for ${row.size}`} value={colorsBySize[row.size]||OPTITEX_GRADE_COLORS_20261027[index%OPTITEX_GRADE_COLORS_20261027.length]}
      onChange={e=>onColorsBySizeChange?.({...colorsBySize,[row.size]:e.target.value})}/></td>}{activeTab==='values'?(sizesOnly?null:<>
      {[0,1].map(axis=><td key={axis}>{!ruleSet||!compiled?.ok||base?<span>{fixed(row.point[axis])}</span>:<input key={`${row.size}-${selectedPoint}-${axis}-${row.point[axis]}`} type="number" step="0.1" disabled={disabled} defaultValue={row.point[axis]}
       aria-label={`${row.size} grade point ${selectedPoint+1} ${axis?'Y':'X'} movement millimetres`}
       onKeyDown={e=>{if(e.key==='Enter'){e.currentTarget.blur()}if(e.key==='Escape'){e.currentTarget.value=String(row.point[axis]);e.currentTarget.blur()}}}
       onBlur={e=>{const entered=e.currentTarget.value.trim()
        if(entered===''||!Number.isFinite(Number(entered))){
         e.currentTarget.value=String(row.point[axis]);setNotice('Enter a finite millimetre offset.');return
        }
        if(Number(entered)!==row.point[axis]&&
         changeOffset(row.size,axis,entered)!==true)e.currentTarget.value=String(row.point[axis])}}/>}</td>)}
      <td>{fixed(row.step?.[0])}</td><td>{fixed(row.step?.[1])}</td>
     </>):<><td>{row.a==null?'—':<button type="button" className="optitex-compare-length-link" aria-label={`Select ${row.size} contour A in grading nest`} onClick={()=>pickContour('a',row.size)}>{fixed(row.a)}</button>}</td><td>{row.b==null?'—':<button type="button" className="optitex-compare-length-link" aria-label={`Select ${row.size} contour B in grading nest`} onClick={()=>pickContour('b',row.size)}>{fixed(row.b)}</button>}</td><td>{fixed(row.a!=null&&row.b!=null?row.a-row.b:null)}</td>
      <td>{fixed(row.a!=null&&row.b>0?row.a/row.b:null)}</td>
      <td data-compare-review={sameContour?'same':thresholdMm==null?'unset':row.a==null||row.b==null?'unavailable':
       Math.abs(row.a-row.b)>thresholdMm?'review':'pass'}>
       {sameContour?'Same':thresholdMm==null?'Set limit':row.a==null||row.b==null?'—':
       Math.abs(row.a-row.b)>thresholdMm?'Review':'OK'}</td></>}
    </tr>
   })}</tbody>
  </table></div>
  {activeTab==='compare'&&<small role="status" title="Draft contour arclength measurements only. These are not native sewn-balance or manufacturing CUT approval.">{!ruleSet&&compared.length?'Measured base contours · author or load rules for other sizes':!compiled?.ok||!compared.length?'No valid graded contour lengths':
    sameContour?'Choose different contours · draft only':
    thresholdMm==null?'Enter review threshold · draft only':
    `${compared.length} sizes · ${overTolerance.length} flagged · ±${thresholdMm.toFixed(1)} mm · draft only`}</small>}
  {!compiled?.ok&&ruleSet&&<p role="alert">Graded outlines unavailable: {compiled?.reason||'Invalid size table'}</p>}
  {compact?(notice||(activeTab==='values'&&catalogMessage))&&<p role="status" title={[notice,catalogMessage].filter(Boolean).join(' · ')}
    className="optitex-compact-status">{notice||catalogMessage}</p>:<>
   {notice&&<p role="status">{notice}</p>}
   {catalogMessage&&<p role="status">{catalogMessage}</p>}
  </>}
 </section>
}
