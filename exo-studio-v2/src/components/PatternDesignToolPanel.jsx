import React,{useEffect,useId,useRef,useState} from 'react'
import {flushSync} from 'react-dom'
import CadToolIcon from './CadToolIcon.jsx'
import {Combine,Factory} from 'lucide-react'
import {PenAnchorIcon,PEN_ANCHOR_TOOLS,PEN_HOLD_MS} from './PenAnchorToolIcons.jsx'
import './PatternDesignToolPanel.css'

// Original EXO organization informed by the saved Seamly tool taxonomy and
// public AccuMark PDS command research. No vendor implementation/assets copied.
export const PATTERN_DESIGN_GROUPS=[
 ['CUT / Nest',[
  ['native-cut-room','Native CUT / nesting and cut-room study','cut','tool','native-cut-room'],
 ]],
 ['Points',[
  ['select','Select / transform','select-2d','slot','A01'],
  ['point','Edit pattern points','points','slot','A02'],
  ['split','Split edge / insert point','split','tool','split'],
  ['curve-station','Split by physical curve distance','split','tool','curve-station'],
  ['curve','Edit curve points and tangents','curve','tool','curve'],
 ]],
 ['Construct',[
  ['base-polygon','Numeric base shape','base-polygon','slot','A06'],
  ['construction-point','Parametric point · line, perpendicular, intersection','points','tool','construction-point'],
  // The actual left 2D Pattern Design rail (separate from viewport quick tools):
  // put Direct Selection immediately LEFT of the real Pen/Pencil flyout.
  // Draw Pattern Polygon must be BELOW these two, never in the adjacent slot.
  ['direct-select','Direct Selection · move individual native/draft anchors','points','tool','direct-select'],
  ['vector-pen','Bézier pen','curve','tool','vector-pen'],
  ['pen-units','Pen line measurement units · mm / cm / in','measure','tool','pen-units'],
  ['vector-pencil','Freehand fitted curve','internal','tool','vector-pencil'],
  ['polygon','Draw pattern polygon','polygon-tool','slot','A04'],
  ['shape-builder','Shape Builder · Join / Subtract / Intersect','polygon-tool','tool','shape-builder'],
  ['internal','Internal construction line','internal','slot','A05'],
  ['construction-guides','Physical internal / fold / pleat / dart guide drafting','internal','tool','construction-guides'],
  ['trace','Trace straight contour','polygon-tool','slot','A07'],
 ]],
 ['Piece',[
  ['notch','Add notch','notch','slot','A08'],
  ['allowance','Seam allowance','seam-allowance','slot','A09'],
  ['dart','Cut-and-sewn dart','internal','tool','dart'],
  ['dart-precision','Precision cut-and-sewn dart · metric intake','internal','tool','dart-precision'],
  ['physical-pleat','Experimental physical tuck / pleat seam · material retained','internal','tool','physical-pleat'],
  ['pleat-guides','Parallel pleat guides','internal','slot','A15'],
  ['annotation','Add pattern note','annotation','slot','A14'],
  ['annotation-edit','Edit pattern note','annotation-edit','slot','A13'],
 ]],
 ['Grade',[
  ['grading-edit','Grade dimensions / print','grading-edit','slot','A16'],
  ['grading-auto','Grade size increment','grading-auto','slot','A17'],
 ]],
 ['Verify',[
  ['walk-seam','Walk / compare seams','seam-links','slot','A10'],
  ['measure','Measure pattern distance','measure','slot','A12'],
  ['segment-sew','Match sewn segments','segment-sew','slot','B02'],
  ['seam-edit','Edit sewing relationship','seam-links','slot','B01'],
 ]],
]
function PatternToolIcon({item}){
 if(item[0]==='native-cut-room')return <Factory size={19} aria-hidden="true"/>
 if(item[0]==='shape-builder')return <Combine size={19} aria-hidden="true"/>
 const paths={
  'vector-pen':'M4 20 8 8 17 3 21 7 16 16 4 20 M4 20 12 12 M10 10 14 14',
  'vector-pencil':'M4 17 15 6 19 10 8 21 3 22 4 17 M14 7 18 11 M16 5 18 3 22 7 20 9',
  internal:'M3 5h4 M10 5h4 M17 5h4 M3 19h4 M10 19h4 M17 19h4 M5 8v8 M19 8v8 M8 12h8',
  dart:'M3 21 12 3 21 21 M12 3v3 M12 9v3 M12 15v3 M7 21h10',
  'pleat-guides':'M5 3v18 M12 3v3 M12 9v3 M12 15v6 M19 3v18 M7 8h10 M9 6 7 8 9 10 M15 6 17 8 15 10',
 }
 return paths[item[0]]?<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[item[0]]}/></svg>:<CadToolIcon id={item[2]} size={19}/>
}
function PenFamily({activeTool,onTool,disabled}){
 const [open,setOpen]=useState(false),[remembered,setRemembered]=useState('vector-pen')
 const [menuPosition,setMenuPosition]=useState({left:100,top:100})
 const wrapper=useRef(null),trigger=useRef(null),hold=useRef(null),held=useRef(false),pressing=useRef(false)
 const menuId=useId()
 const selected=PEN_ANCHOR_TOOLS.some(({id})=>id===activeTool)?activeTool:remembered
 const clearHold=()=>{if(hold.current!==null)clearTimeout(hold.current);hold.current=null}
 const show=()=>{
  const rect=trigger.current?.getBoundingClientRect()
  if(rect)setMenuPosition({left:Math.max(5,Math.min(rect.right+7,window.innerWidth-250)),
   top:Math.max(5,Math.min(rect.top-5,window.innerHeight-(PEN_ANCHOR_TOOLS.length*40+14)))})
  setOpen(true)
 }
 useEffect(()=>()=>{clearHold();pressing.current=false},[])
 useEffect(()=>{
  const release=e=>{
   if(!pressing.current)return
   pressing.current=false
   clearHold()
   if(!open)return
   const item=document.elementFromPoint(e.clientX,e.clientY)?.closest?.('.exo-pen-flyout [data-tool]')
   if(item&&wrapper.current?.contains(item)){
    const id=item.dataset.tool
    if(PEN_ANCHOR_TOOLS.some(option=>option.id===id)){
     held.current=true
     setRemembered(id);setOpen(false);onTool(id)
     trigger.current?.focus()
    }
   }
  }
  const cancel=()=>{pressing.current=false;clearHold()}
  window.addEventListener('pointerup',release)
  window.addEventListener('pointercancel',cancel)
  return()=>{window.removeEventListener('pointerup',release);window.removeEventListener('pointercancel',cancel)}
 },[open,onTool])
 useEffect(()=>{
  if(!open)return
  const close=e=>{if(!wrapper.current?.contains(e.target))setOpen(false)}
  const escape=e=>{
   if(e.key!=='Escape')return
   e.preventDefault();e.stopImmediatePropagation()
   setOpen(false)
   trigger.current?.focus()
  }
  document.addEventListener('pointerdown',close,true)
  document.addEventListener('keydown',escape,true)
  return()=>{document.removeEventListener('pointerdown',close,true);document.removeEventListener('keydown',escape,true)}
 },[open])
 const choose=id=>{if(disabled)return;setRemembered(id);setOpen(false);onTool(id)}
 const items=()=>[...wrapper.current?.querySelectorAll('.exo-pen-flyout > button:not(:disabled)')||[]]
 const keyDown=e=>{
  if(e.key==='Escape'&&open){e.preventDefault();e.stopPropagation();setOpen(false);trigger.current?.focus();return}
  if(e.target===trigger.current&&['ArrowRight','ArrowDown'].includes(e.key)){
   e.preventDefault();flushSync(show);items()[0]?.focus();return
  }
  if(e.target.closest?.('.exo-pen-flyout')&&['ArrowDown','ArrowUp','Home','End'].includes(e.key)){
   const list=items(),index=list.indexOf(e.target)
   if(index<0||!list.length)return
   e.preventDefault()
   list[e.key==='Home'?0:e.key==='End'?list.length-1:
    (index+(e.key==='ArrowDown'?1:-1)+list.length)%list.length]?.focus()
  }
 }
 return <div ref={wrapper} className="exo-pen-family" data-pen-flyout-open={String(open)} onKeyDown={keyDown}
  onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget))setOpen(false)}}>
  <button ref={trigger} type="button" data-pattern-design-tool="vector-pen" data-pen-current-tool={selected}
   aria-label={`${PEN_ANCHOR_TOOLS.find(item=>item.id===selected)?.label||'Pen Tool'} · hold for more tools`}
   aria-haspopup="menu" aria-expanded={open}
   aria-controls={menuId} title="Pen / Anchor Point · hold for side dropdown"
   aria-pressed={activeTool===selected} disabled={disabled}
   onPointerDown={e=>{held.current=false;clearHold();if(e.button!==0)return;
    pressing.current=true
    try{e.currentTarget.releasePointerCapture(e.pointerId)}catch{}
    hold.current=setTimeout(()=>{if(pressing.current){held.current=true;show()}},PEN_HOLD_MS)}}
   onClick={()=>{if(held.current){held.current=false;return}choose(selected)}}>
   <PenAnchorIcon tool={selected} size={22}/><span className="exo-pen-family-caret" aria-hidden="true"/>
  </button>
  {open&&<div id={menuId} className="exo-pen-flyout" role="menu" aria-label="Pen tools" style={menuPosition}>
   {PEN_ANCHOR_TOOLS.map(({id,label,shortcut})=><button key={id} type="button" data-tool={id} role="menuitemradio" disabled={disabled}
    aria-label={label} aria-checked={activeTool===id} onClick={()=>{choose(id);trigger.current?.focus()}}>
    <PenAnchorIcon tool={id} size={22}/><span className="exo-pen-flyout-name">{label}</span><kbd>{shortcut}</kbd>
   </button>)}
  </div>}
 </div>
}
export default function PatternDesignToolPanel({activeTool,onSlot,onTool,disabled=false}){
 const [query,setQuery]=useState(''),[search,setSearch]=useState(false)
 const [penUnit,setPenUnit]=useState('mm')
 useEffect(()=>{
  const sync=event=>setPenUnit(event.detail?.unit||document.querySelector('.cc-board')?.dataset.penUnit||'mm')
  window.addEventListener('exo-clothcraft-pen-unit-changed',sync)
  sync({detail:{unit:document.querySelector('.cc-board')?.dataset.penUnit||'mm'}})
  return()=>window.removeEventListener('exo-clothcraft-pen-unit-changed',sync)
 },[])
 const run=item=>{
  if(disabled)return
  if(item[4]==='native-cut-room')window.dispatchEvent(new Event('exo-clothcraft-generate-native-cut-room-study'))
  else if(item[4]==='construction-guides')window.dispatchEvent(new Event('exo-clothcraft-open-construction-guides'))
  else if(item[4]==='pen-units')window.dispatchEvent(new Event('exo-clothcraft-cycle-pen-unit'))
  else if(item[3]==='slot')onSlot({id:item[4],label:item[1]},'2d')
  else onTool(item[4])
  setSearch(false);setQuery('')
 }
 return <nav className="exo-pattern-toolpanel" aria-label="Pattern Design toolpanel" data-pattern-design-panel="true">
  <button className="exo-pattern-find" type="button" aria-label="Find pattern design tool" aria-expanded={search} onClick={()=>setSearch(!search)}>Find</button>
  {search&&<div className="exo-pattern-search" role="dialog" aria-label="Find pattern design tool" onKeyDown={e=>{if(e.key==='Escape'){setSearch(false);setQuery('')}}}>
   <label>Find tool<input autoFocus aria-label="Search pattern design tools" value={query} onChange={e=>setQuery(e.target.value)}/></label>
   {PATTERN_DESIGN_GROUPS.flatMap(([group,items])=>items.filter(item=>(group+' '+item[1]).toLowerCase().includes(query.toLowerCase())).map(item=><button type="button" key={item[0]} disabled={disabled} onClick={()=>run(item)}>{group} · {item[1]}</button>))}
   {PATTERN_DESIGN_GROUPS.every(([group,items])=>!items.some(item=>(group+' '+item[1]).toLowerCase().includes(query.toLowerCase())))&&<p role="status">No matching tool.</p>}
   <button type="button" onClick={()=>setSearch(false)}>Close tool search</button>
  </div>}
  {PATTERN_DESIGN_GROUPS.map(([group,items])=><section key={group} aria-label={group+' tools'}>
   <h3>{group}</h3><div>{items.map(item=>item[0]==='vector-pen'
   ?<PenFamily key={item[0]} activeTool={activeTool} onTool={onTool} disabled={disabled}/>
   :item[0]==='pen-units'
    ?<button type="button" key={item[0]} data-pattern-design-tool="pen-units"
      aria-label={`Pen measurement units: ${penUnit}; click to cycle mm, cm, inches`}
      title={`Drawing measurements: ${penUnit} · click for mm / cm / inches`}
      disabled={disabled} onClick={()=>run(item)}
      className="exo-pen-units-button"><span>{penUnit}</span></button>
    :<button type="button" key={item[0]} data-pattern-design-tool={item[0]} aria-label={item[1]} title={item[1]} aria-pressed={activeTool===item[0]} disabled={disabled}
      onContextMenu={item[0]==='vector-pencil'?event=>{
       event.preventDefault();event.stopPropagation()
       if(disabled)return
       if(activeTool!=='vector-pencil')run(item)
       window.dispatchEvent(new CustomEvent('exo-clothcraft-pencil-mirror-menu-request',{
        detail:{clientX:event.clientX,clientY:event.clientY}
       }))
      }:undefined} onClick={()=>run(item)}><PatternToolIcon item={item}/></button>)}</div>
  </section>)}
 </nav>
}
