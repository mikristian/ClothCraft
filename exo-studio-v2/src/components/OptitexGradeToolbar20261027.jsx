import React,{useEffect,useRef,useState} from 'react'
import {ChevronLeft,ChevronRight,Copy,ClipboardPaste,MousePointer2,ArrowLeftRight,ArrowUpDown,Move,RotateCw,Eye,Scaling,Trash2,Layers,MoveHorizontal,MoveVertical,SquareDashed,AlignVerticalJustifyCenter,AlignHorizontalJustifyCenter,Slash,Scissors,Table2,Ruler,Target,ArrowUpRight,Ratio,CornerDownRight,GitCompareArrows,Waypoints,Magnet,MoveDiagonal2} from 'lucide-react'
import './OptitexGradeToolbar20261027.css'

const TOOL_ICONS={
 'prev-point':ChevronLeft,'copy-grading':Copy,'paste-grading':ClipboardPaste,'set-grading-tool':MousePointer2,
 'paste-x-grading':MoveHorizontal,'paste-y-grading':MoveVertical,'paste-relatively':CornerDownRight,'paste-dd-grading':GitCompareArrows,
 'next-point':ChevronRight,'angle':RotateCw,'show-from-base-size':Eye,'grade-proportionally':Scaling,
 'clear-grading':Trash2,'stack-point':Layers,'move-point-size':Move,'move-size-along':ArrowUpRight,
 'move-size-proportional':Ratio,'move-size-parallel':MoveDiagonal2,'move-size-by-rectangle':SquareDashed,
 'align-points-size':Magnet,'align-vertical-size':AlignVerticalJustifyCenter,'align-horizontal-size':AlignHorizontalJustifyCenter,
 'align-size-by-line':Waypoints,'grade-notch':Scissors,
}

/** Display names preserve the 24 commands of the grading reference. Mutation is
 * delegated to the parent native grading transaction, never simulated here. */
export const OPTITEX_GRADE_TOOLS_20261027 = Object.freeze([
 ['prev-point','Prev point'],['copy-grading','Copy Grading','Shift+C'],
 ['paste-grading','Paste Grading','Shift+V'],['set-grading-tool','Set Grading tool'],
 ['paste-x-grading','Paste X Grading','Shift+X'],['paste-y-grading','Paste Y Grading','Shift+Y'],
 ['paste-relatively','Paste Relatively'],['paste-dd-grading','Paste DD Grading'],
 ['next-point','Next point'],['angle','Angle'],['show-from-base-size','Show from Base Size'],
 ['grade-proportionally','Grade proportionally'],['clear-grading','Clear Grading'],
 ['stack-point','Stack Point'],['move-point-size','Move Point Size'],
 ['move-size-along','Move Size Along'],['move-size-proportional','Move Size Proportional'],
 ['move-size-parallel','Move Size Parallel'],['move-size-by-rectangle','Move Size by Rectangle'],
 ['align-points-size','Align Points Size'],['align-vertical-size','Align Vertical Size'],
 ['align-horizontal-size','Align Horizontal Size'],['align-size-by-line','Align Size by Line'],
 ['grade-notch','Grade Notch'],
])

const navigation=new Set(['prev-point','next-point'])
const paste=new Set(['paste-grading','paste-x-grading','paste-y-grading','paste-relatively','paste-dd-grading'])
const requireRectangle=new Set(['move-size-by-rectangle'])
const finite=value=>value.trim()!==''&&Number.isFinite(Number(value))
const parsePointList=(raw,max)=>{
 if(!raw.trim())return []
 const entries=raw.split(',').map(entry=>entry.trim())
 if(entries.some(entry=>!/^\d+$/.test(entry)))return null
 const points=entries.map(Number)
 if(points.some(point=>point>=max)||new Set(points).size!==points.length)return null
 return points
}

export default function OptitexGradeToolbar20261027({
 snapshot,ruleSet,panelId,selectedPointIndex,selectedSize,disabled=false,
 onApply,onSelectPoint,onSelectSize,onOpenGradeNotch,onOpenGradeTable,onOpenCompareLength,onShowBase,onStackPoint,onEnsureGradeRules,
}){
 const [sourcePoint,setSourcePoint]=useState('0')
 const [targetPoint,setTargetPoint]=useState('1')
 const [selection,setSelection]=useState('')
 const [axis,setAxis]=useState('both')
 const [amount,setAmount]=useState('0')
 const [angle,setAngle]=useState('0')
 const [rect,setRect]=useState({x:'0',y:'0',width:'0',height:'0'})
 const [notice,setNotice]=useState('')
 const [activeTool,setActiveTool]=useState('')
 const [clipboard,setClipboard]=useState(null)
 const sectionRef=useRef(null)
 const panel=snapshot?.template?.panels?.find(item=>item.id===panelId)
 const points=panel?.polygon?.points||[]
 const validPoint=Number.isInteger(selectedPointIndex)&&selectedPointIndex>=0&&selectedPointIndex<points.length
 const pointIndex=validPoint?selectedPointIndex:0
 const sizes=Array.isArray(ruleSet?.sizes)?ruleSet.sizes:[]
 const size=sizes.includes(selectedSize)?selectedSize:(sizes.find(item=>item!==ruleSet?.baseSize)||sizes[0]||'')
 const hasPanel=!!panel&&points.length>0&&!disabled
 const ready=hasPanel&&!!ruleSet?.panels?.[panelId]&&!!size
 const sourceIndex=/^\d+$/.test(sourcePoint)?Number(sourcePoint):-1
 const targetIndex=/^\d+$/.test(targetPoint)?Number(targetPoint):-1
 const pointChoices=points.map((_,index)=><option key={index} value={index}>P{index+1}</option>)
 const selectedIndices=parsePointList(selection,points.length)
 const rectValid=Object.values(rect).every(finite)&&Number(rect.width)>0&&Number(rect.height)>0
 const numbersValid=finite(amount)&&finite(angle)
 const paramsValid=sourceIndex>=0&&sourceIndex<points.length&&targetIndex>=0&&targetIndex<points.length&&selectedIndices!==null&&numbersValid
 const groupTools=new Set(['align-points-size','align-vertical-size','align-horizontal-size','align-size-by-line'])
 const requiresLine=new Set(['move-size-along','move-size-parallel','align-size-by-line'])

 useEffect(()=>{
  setSourcePoint('0');setTargetPoint('1');setSelection('');setActiveTool('');setNotice('');setClipboard(null)
 },[panelId])

 const available=()=>!disabled
 const problemFor=id=>{
  if(disabled)return 'Grading is locked while the workspace is busy or a graded size is active.'
  if(!hasPanel)return 'Select a pattern panel containing polygon points in the 2D workspace.'
  if(id==='grade-notch')return !snapshot?.gradeRunPersisted?'Save a native six-size grade catalog before adding a physical notch.':typeof onOpenGradeNotch!=='function'?'Physical notch editor is not connected.':''
  if(navigation.has(id))return points.length<2?'This panel needs at least two points.':typeof onSelectPoint!=='function'?'Point selection is not connected.':''
  if(!ready&&typeof onApply!=='function')return 'Connect the grading handler to create a native rule draft and apply this tool.'
  if(paste.has(id)&&(!clipboard||clipboard.panelId!==panelId||clipboard.schema!=='exo.grade-clipboard.v1'))return 'Copy grading from a point in this panel first, then paste.'
  if(!paramsValid)return 'Correct the point indices, movement or angle fields above.'
  if(requireRectangle.has(id)&&!rectValid)return 'Open Rectangle and enter positive width and height in millimetres.'
  if(requiresLine.has(id)&&sourceIndex===targetIndex)return 'Choose two different source and target reference points.'
  if(groupTools.has(id)&&selectedIndices!==null&&selectedIndices.length===1)return 'Enter at least two comma-separated point indices, or clear the field to use the first two points.'
  if(typeof onApply!=='function'&&!(id==='show-from-base-size'&&onShowBase)&&!(id==='stack-point'&&onStackPoint))return 'Grading handler is not connected.'
  return ''
 }

 const execute=(toolId)=>{
  const problem=problemFor(toolId)
  if(problem){
   setNotice(problem)
   return
  }
  if(navigation.has(toolId)){
   const next=(pointIndex+(toolId==='next-point'?1:-1)+points.length)%points.length
   onSelectPoint(next)
   setNotice(`Selected P${next+1}.`)
   return
  }
  const options={
   panelId,pointIndex,selectedPointIndex:pointIndex,sourcePointIndex:sourceIndex,
   targetPointIndex:targetIndex,targetPointIndices:selectedIndices,
   pointIndices:groupTools.has(toolId)?(selectedIndices.length?selectedIndices:points.length>=2?[0,1]:[pointIndex]):(selectedIndices.length?selectedIndices:[pointIndex]),referencePointIndex:targetIndex,
   selectedSize:size,size,axis,amountMm:Number(amount),angleDeg:Number(angle),
   clipboard:paste.has(toolId)?clipboard:null,
   rectangle:{xMm:Number(rect.x),yMm:Number(rect.y),widthMm:Number(rect.width),heightMm:Number(rect.height)},
  }
  const special={
   'show-from-base-size':onShowBase,
   'stack-point':onStackPoint,
   'grade-notch':onOpenGradeNotch,
  }[toolId]
  const callback=typeof special==='function'?special:null
  const handler=callback||onApply
  if(typeof handler!=='function')return
  const label=OPTITEX_GRADE_TOOLS_20261027.find(item=>item[0]===toolId)?.[1]
  const receive=result=>{
   if(result===false||result?.ok===false){
    setNotice(`${label} rejected: ${result?.reason||'Operation failed'}`)
    return
   }
   if(!result||result.ok!==true){setNotice(`${label}: grading handler did not confirm the operation.`);return}
   if(toolId==='copy-grading'){
    const received=result.clipboard
    if(received?.schema!=='exo.grade-clipboard.v1'||!Array.isArray(received.sizes)||received.sizes.length===0||
       (sizes.length>0&&(received.sizes.length!==sizes.length||
       received.sizes.some((item,index)=>item!==sizes[index])||received.baseSize!==ruleSet.baseSize))||
       received.sizes.some(item=>!Array.isArray(received.vectors?.[item])||received.vectors[item].length!==2||
       !received.vectors[item].every(Number.isFinite))){
     setNotice('Copy Grading failed: engine returned an invalid grading clipboard.');return
    }
    setClipboard({...received,panelId})
   }
   setActiveTool(toolId)
   setNotice(result.notice||`${label} completed.`)
  }
  try{
   const result=callback?callback(options):onApply(toolId,options)
   if(result&&typeof result.then==='function')result.then(receive).catch(error=>setNotice(`${label} failed: ${error?.message||String(error)}`))
   else receive(result)
  }catch(error){setNotice(`${label} failed: ${error?.message||String(error)}`)}
 }

 useEffect(()=>{
  const target=sectionRef.current
  if(!target||typeof window==='undefined')return undefined
  const handler=event=>{
   if(!event.shiftKey||event.altKey||event.metaKey||event.ctrlKey||event.repeat)return
   const editable=event.target?.closest?.('input,textarea,select,[contenteditable="true"]')
   if(editable)return
   // Native grading shortcuts are workstation commands: after selecting a
   // contour on the drawing canvas, keyboard focus is outside this toolbar.
   // Keep them active while the grading editor is mounted, but never intercept
   // input inside an unrelated modal (save/export, file dialog, etc.).
   const dialog=event.target?.closest?.('[role="dialog"],[aria-modal="true"]')
   if(dialog&&!dialog.contains(target))return
   const toolId={c:'copy-grading',v:'paste-grading',x:'paste-x-grading',y:'paste-y-grading'}[event.key.toLowerCase()]
   if(toolId){event.preventDefault();execute(toolId)}
  }
  window.addEventListener('keydown',handler,true)
  return ()=>window.removeEventListener('keydown',handler,true)
 })

 useEffect(()=>{const receive=event=>{const id=event.detail?.toolId;if(!OPTITEX_GRADE_TOOLS_20261027.some(tool=>tool[0]===id))return;const target=sectionRef.current?.querySelectorAll('.exo-optitex-grade-grid button');const index=OPTITEX_GRADE_TOOLS_20261027.findIndex(tool=>tool[0]===id);const button=target?.[index];if(button&&!button.disabled)button.click();else setNotice(`${OPTITEX_GRADE_TOOLS_20261027[index]?.[1]||'Grading tool'} unavailable: select a valid pattern and grading point.`)};window.addEventListener('exo-clothcraft-grading-toolbar-command',receive);if(window.__exoPendingGradeTool){const id=window.__exoPendingGradeTool;window.__exoPendingGradeTool=null;queueMicrotask(()=>receive({detail:{toolId:id}}))}return()=>window.removeEventListener('exo-clothcraft-grading-toolbar-command',receive)},[])
 return <section ref={sectionRef} className="exo-optitex-grade-toolbar" aria-label="Pattern Studio grading tools" data-optitex-grade-toolbar="true" tabIndex={-1}>
  <header className="exo-optitex-grade-header"><strong>GRADING</strong><small>24 point and size tools</small></header>
  <div className="exo-optitex-grade-inputs">
   <label>Active point<select aria-label="Grading active point" disabled={!hasPanel||typeof onSelectPoint!=='function'} value={pointIndex} onChange={event=>onSelectPoint?.(Number(event.target.value))}>{pointChoices}</select></label>
   <label>Active size<select aria-label="Grading active size" disabled={!ready||typeof onSelectSize!=='function'} value={size} onChange={event=>onSelectSize?.(event.target.value)}>{sizes.map(item=><option key={item} value={item}>{item}{item===ruleSet?.baseSize?' · base':''}</option>)}</select></label>
   <label>Source point<select aria-label="Grading source point" disabled={!hasPanel} value={sourceIndex>=0&&sourceIndex<points.length?sourceIndex:0} onChange={event=>setSourcePoint(event.target.value)}>{pointChoices}</select></label>
   <label>Target point<select aria-label="Grading target point" disabled={!hasPanel} value={targetIndex>=0&&targetIndex<points.length?targetIndex:0} onChange={event=>setTargetPoint(event.target.value)}>{pointChoices}</select></label>
   <label className="exo-optitex-grade-span">Additional target indices <input aria-label="Additional graded point indices" disabled={!hasPanel} value={selection} onChange={event=>setSelection(event.target.value)} placeholder="0,2,4 (zero based)"/></label>
   <label>Axis<select aria-label="Grading axis" disabled={!hasPanel} value={axis} onChange={event=>setAxis(event.target.value)}><option value="both">X + Y</option><option value="x">X</option><option value="y">Y</option></select></label>
   <label>Movement (mm)<input aria-label="Grading movement millimetres" type="number" step="any" disabled={!hasPanel} value={amount} onChange={event=>setAmount(event.target.value)}/></label>
   <label>Angle (degrees)<input aria-label="Grading angle degrees" type="number" step="any" disabled={!hasPanel} value={angle} onChange={event=>setAngle(event.target.value)}/></label>
  </div>
  <details className="exo-optitex-grade-rectangle"><summary>Rectangle (mm) · for Move Size by Rectangle</summary>
   <div className="exo-optitex-grade-inputs">{[['x','X'],['y','Y'],['width','Width'],['height','Height']].map(([field,label])=><label key={field}>{label}<input aria-label={`Grading rectangle ${label.toLowerCase()} millimetres`} type="number" step="any" disabled={!hasPanel} value={rect[field]} onChange={event=>setRect(previous=>({...previous,[field]:event.target.value}))}/></label>)}</div>
  </details>
  <div className="exo-optitex-grade-grid" role="group" aria-label="24 grading commands">
   {OPTITEX_GRADE_TOOLS_20261027.map(([id,label,shortcut],index)=>{const Icon=TOOL_ICONS[id];const problem=problemFor(id);return <button key={id} type="button" className={activeTool===id?'is-selected':''} disabled={!available(id)} aria-label={shortcut?`${label} (${shortcut})`:label} title={`${label}${shortcut?` · ${shortcut}`:''}${problem?` · ${problem}`:''}`} onClick={()=>execute(id)}><span className="exo-optitex-grade-index">{String(index+1).padStart(2,'0')}</span><Icon size={14} strokeWidth={1.8} aria-hidden="true"/><span>{label}</span>{shortcut&&<kbd>{shortcut}</kbd>}</button>})}
  </div>
  {(onOpenGradeTable||onOpenCompareLength)&&<div className="exo-optitex-grade-docks" role="group" aria-label="Grading analysis windows">{typeof onOpenGradeTable==='function'&&<button type="button" disabled={!hasPanel} onClick={()=>onOpenGradeTable({panelId,size,pointIndex})}><Table2 size={14} aria-hidden="true"/> Open grade table</button>}{typeof onOpenCompareLength==='function'&&<button type="button" disabled={!hasPanel} onClick={()=>onOpenCompareLength({panelId,size,pointIndex})}><Ruler size={14} aria-hidden="true"/> Compare length</button>}</div>}
  <p role="status" aria-live="polite" className="exo-optitex-grade-notice">{notice||(!hasPanel?'Select a polygon panel to use the 24 grading commands.':!ready?'Select a grading command to create the rule draft and execute it in one click.':'Select a command; grading changes are validated by the connected native handler.')}</p>
 </section>
}
