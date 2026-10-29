import React,{useEffect,useState} from 'react'
import {ChevronLeft,ChevronRight,Copy,ClipboardPaste,MoveHorizontal,MoveVertical,
 MousePointer2,Eraser,Layers,Eye,Scaling,Scissors} from 'lucide-react'
import './ExoGradingQuickToolbar20261028.css'

const TOOLS=[
 ['prev-point','Prev point',ChevronLeft],['next-point','Next point',ChevronRight],
 ['copy-grading','Copy grading',Copy],['paste-grading','Paste grading',ClipboardPaste],
 ['paste-x-grading','Paste X',MoveHorizontal],['paste-y-grading','Paste Y',MoveVertical],
 ['set-grading-tool','Set grading',MousePointer2],['clear-grading','Clear grading',Eraser],
 ['stack-point','Stack point',Layers],['show-from-base-size','Show base',Eye],
 ['grade-proportionally','Proportional grade',Scaling],['grade-notch','Grade notch',Scissors],
]

/** A true source-backed grading toolbar, compact enough for a top ribbon.
 * The full 24-tool editor remains accessible; invalid native edits fail closed. */
export default function ExoGradingQuickToolbar20261028({snapshot,panelId,selectedPointIndex,
 selectedSize,onSelectSize,sizeNames=['XS','S','M','L','XL','XXL'],
 disabled=false,onApply,onSelectPoint,onGradeNotch,onOpenAll}){
 const [axis,setAxis]=useState('x'),[amount,setAmount]=useState('2')
 const [clipboard,setClipboard]=useState(null),[notice,setNotice]=useState('')
 const [active,setActive]=useState('')
 const [failed,setFailed]=useState('')
 const panel=snapshot?.template?.panels?.find(p=>p.id===panelId)||snapshot?.template?.panels?.[0]
 const count=panel?.polygon?.points?.length||0
 const point=Number.isInteger(selectedPointIndex)&&selectedPointIndex>=0&&selectedPointIndex<count?selectedPointIndex:0
 const size=selectedSize||'M'
 useEffect(()=>{setClipboard(null);setNotice('');setActive('')},[panel?.id])
 const reject=(id,message)=>{setFailed(id);setNotice(message);setActive(id)}
 const run=async id=>{
  if(disabled){reject(id,'Native grading is locked during simulation or active-size editing.');return}
  if(!panel||!count){reject(id,'Open a native 2D pattern with points before using grading tools.');return}
  if(id==='prev-point'||id==='next-point'){
   const next=(point+(id==='next-point'?1:-1)+count)%count
   onSelectPoint?.(next);setNotice(`Point P${next+1}`);setActive(id);setFailed('');return
  }
  if(id==='grade-notch'){
   if(typeof onGradeNotch!=='function'){reject(id,'Native physical notch editor unavailable.');return}
   onGradeNotch();setActive(id);setFailed('');setNotice('Open native physical notch editor to preview and verify all sizes.');return
  }
  if(typeof onApply!=='function'){reject(id,'Native grading engine is not connected.');return}
  if(id.startsWith('paste-')&&(!clipboard||clipboard.panelId!==panel.id)){
   reject(id,'Copy grading from a point in this panel before pasting.');return
  }
  const mm=Number(amount)
  if(amount.trim()===''||!Number.isFinite(mm)||Math.abs(mm)>500){
   reject(id,'Enter a finite grade amount within ±500 mm.');return
  }
  // Point edits must target the selected point in both the grading toolbar
  // and Grading Table. A fixed P2 paste target silently edited another vertex.
  const options={panelId:panel.id,pointIndex:point,selectedPointIndex:point,selectedSize:size,size,
   axis,amountMm:mm,angleDeg:0,sourcePointIndex:point,targetPointIndex:point,
   referencePointIndex:count>1?(point+1)%count:point,pointIndices:[point],clipboard}
  let result
  try{result=await onApply(id,options)}
  catch(error){reject(id,error?.message||'The grading action failed.');return}
  if(result?.ok!==true){reject(id,result?.reason||'The native grading operation was rejected.');return}
  if(id==='copy-grading'){
   if(result.clipboard?.schema!=='exo.grade-clipboard.v1'){
    reject(id,'Native grade clipboard is invalid; copy was rejected.');return
   }
   setClipboard({...result.clipboard,panelId:panel.id})
  }
  setActive(id)
  setFailed('')
  setNotice(result.notice||`${TOOLS.find(t=>t[0]===id)?.[1]} applied to source-matched grading draft.`)
 }
 return <section className="exo-quick-grade" aria-label="Dockable native grading toolbar"
  data-exo-two-row-grading-toolbar="true">
  <div className="exo-quick-grade__settings">
   <label>Point <strong>P{point+1}</strong></label>
   <label>Size <select aria-label="Quick grading selected size" value={size}
    disabled={!onSelectSize||disabled}
    onChange={event=>onSelectSize?.(event.target.value)}>
    {Array.from(new Set([...sizeNames,size])).map(name=><option key={name} value={name}>{name}</option>)}
   </select></label>
   <label>Axis <select aria-label="Quick grading axis" value={axis} onChange={event=>setAxis(event.target.value)}><option value="x">X</option><option value="y">Y</option><option value="both">Both</option></select></label>
   <label>Move <input type="number" aria-label="Quick grade movement millimetres" value={amount} step=".5" onChange={event=>setAmount(event.target.value)}/>mm</label>
   <button type="button" className="exo-quick-grade__full" onClick={onOpenAll}>Open all 24 tools</button>
  </div>
  <div className="exo-quick-grade__grid" role="group" aria-label="Two rows of twelve active grading commands">
   {TOOLS.map(([id,label,Icon])=><button type="button" key={id}
    title={active===id&&notice?`${label} · ${notice}`:label}
    aria-label={label} aria-pressed={active===id} data-grade-action-result={active===id?(failed===id?'rejected':'applied'):'idle'} disabled={disabled}
    onClick={()=>run(id)}><Icon size={15} aria-hidden="true"/><span>{label}</span></button>)}
  </div>
  <small role="status" title={notice||'All edits must pass native six-size source and geometry checks.'}>{notice||'Native six-size grading tools · source-safe draft until saved to Rust.'}</small>
 </section>
}
