import React,{useState,useEffect} from 'react'
import CadToolIcon from './CadToolIcon.jsx'
import {FilePlus2,SlidersHorizontal,Ruler,Download,Scissors,ShieldCheck,Factory,Grid2X2,Settings2,BookOpen} from 'lucide-react'
import './PatternStudioExtraColumns.css'

/* These two columns live in the same four-column rail as the original 2D A/B
 * columns. Commands dispatch through the live native workspace, never through
 * fabricated local geometry. Source-dependent actions are disabled otherwise. */
const tools=[
 ['new','Create native pattern','base-polygon',FilePlus2,'tool:base-polygon'],
 ['select','Select pattern','select-2d',null,'mode:edit'],
 ['point','Edit points','points',null,'mode:edit'],
 ['numeric','Numerical construction','measure',SlidersHorizontal,'open-construction-guides'],
 ['curve','Edit curve','curve',null,'mode:edit'],
 ['line','Internal line','internal',null,'mode:line'],
 ['grade','Manual grading','grading-edit',null,'grade-manual'],
 ['auto','Automatic grading','grading-auto',null,'grade-auto'],
 ['sew','Sew edge pairs','seam-links',null,'mode:sew'],
 ['walk','Walk seams','seam-links',null,'walk-seam'],
 ['notch','Notches','notch',null,'native:A08'],
 ['allow','Seam allowances','seam-allowance',null,'native:A09'],
 ['audit','Pattern QA','points',ShieldCheck,'pattern-qa'],
 ['cut','CUT geometry study','cut',Factory,'cut-room-study'],
 ['nest','Nest XS–XXL','grading-auto',Grid2X2,'toggle-native-nest'],
 ['print','Actual-size print','measure',Download,'print-panel'],
 ['export','Export pattern','graphics',Download,'export'],
 ['pieces','Pattern pieces','polygon-tool',Grid2X2,'pieces-panel'],
 ['depend','Measurements and dependencies','measure',Ruler,'dependencies-panel'],
 ['industrial','Industrial and 3D','seam-links',Factory,'industrial-panel'],
 ['more','More Pattern Studio commands','pattern-properties',Settings2,'commands-panel'],
]
const issue=(command)=>window.dispatchEvent(new CustomEvent('exo-clothcraft-pattern-studio-command',{detail:{command}}))
export default function PatternStudioExtraColumns({nativeClothcraft=false,full2D=false,running=false,column=0}){
 const [active,setActive]=useState('')
 const [nestVisible,setNestVisible]=useState(false)
 useEffect(()=>{const receive=e=>setNestVisible(Boolean(e.detail?.visible));window.addEventListener('exo-native-nest-state',receive);window.dispatchEvent(new CustomEvent('exo-native-nest-state-request'));return()=>window.removeEventListener('exo-native-nest-state',receive)},[])
 if(!nativeClothcraft||!full2D)return null
 const items=tools.filter((_,i)=>i%2===column)
 return <div className="exo-pattern-studio-embedded-column" aria-label={`Additional Pattern Studio tools in column ${column+1}`}>
 {items.map(([id,label,icon,Icon,command],row)=><button key={id} type="button" title={`Pattern Studio · ${label}`} aria-label={`Pattern Studio · ${label}`} data-pattern-studio-tool={id} aria-pressed={id==='nest'?nestVisible:active===id} disabled={running} style={{top:626+row*34}} onClick={()=>{issue(command);setActive(id)}}>{Icon?<Icon size={20}/>:<CadToolIcon id={icon} size={20}/>}</button>)}
 </div>
}
