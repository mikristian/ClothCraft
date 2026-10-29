import React, { useEffect, useRef, useState } from 'react'
import CadToolIcon from './CadToolIcon.jsx'
import PatternStudioExtraColumns from './PatternStudioExtraColumns.jsx'
import { RotateCcw,ChevronLeft,ChevronRight } from 'lucide-react'
import {CLO7_2D_A,CLO7_2D_B} from '../data/clo7ToolbarOrder.js'
import {getClo7NativeCapability} from '../core/clo7NativeToolCapabilities.js'
import {RIGHT_PALETTE_TOOLS,EXO_RIGHT_EXTRA_TOOLS,EXO_RIGHT_REFERENCE_ACTION_IDS} from '../core/exoExtraToolCatalog.js'

// Original EXO workspace actions plus a 2D polygon creation shortcut. This inventory is not a claim
// that the proprietary CLO toolbar contains exactly these controls, nor that
// unfinished features work. Planned commands are explicitly disabled.
export {RIGHT_PALETTE_TOOLS}

// Workflows affect the *layout*, not the underlying editing actions. Every
// original command remains accessible in All tools, including planned/disabled
// functionality. An action appears in exactly one group within a workflow.
const FOCUSED_GROUPS = {
  Pattern: [
    ['DRAFT', ['select-2d','points','split','curve','internal','foam-padding','annotation-add','annotation-edit','notch','seam-allowance','measure','mirror']],
    ['ON BODY', ['select-3d','move-3d','rotate-3d','hand','camera']],
    ['DISPLAY', ['scene','seam-links','surface','wireframe']],
  ],
  Sewing: [
    ['SEW & ATTACH', ['sew','seam-links','pin','fastener','buttons','buttonholes','topstitch','trim','foam-padding']],
    ['PATTERN', ['select-2d','points','notch','seam-allowance','measure','scene']],
    ['SIMULATION', ['simulate','reset','camera']],
  ],
  Fabric: [
    ['MATERIALS', ['fabric','material','graphics','trim','scene']],
    ['INSPECT', ['select-3d','hand','surface','wireframe','camera']],
    ['SIMULATION', ['simulate','reset']],
  ],
  Avatar: [
    ['VIEW AVATAR', ['select-3d','move-3d','rotate-3d','hand','camera']],
    ['DISPLAY', ['scene','surface','wireframe','seam-links']],
    ['FIT', ['fit','simulate','reset']],
  ],
  Fit: [
    ['ANALYZE', ['surface','wireframe','seam-links','fit']],
    ['SIMULATION', ['simulate','reset']],
    ['VIEW', ['select-3d','move-3d','hand','camera','scene']],
  ],
  Production: [
    ['PRODUCTION', ['grading','pom','measure','export']],
    ['DRAFT', ['select-2d','points','split','curve','notch','seam-allowance','mirror']],
    ['SCENE', ['scene','camera']],
  ],
  Render: [
    ['CAMERA & VIEW', ['select-3d','hand','camera','surface','wireframe']],
    ['PROJECT', ['scene','fabric','graphics','export']],
  ],
}
const ALL_GROUPS = [
  ['3D GARMENT', ['select-3d','move-3d','rotate-3d','hand','surface','wireframe','seam-links']],
  ['2D PATTERN', ['select-2d','points','split','curve','internal','annotation-add','annotation-edit','notch','seam-allowance','measure','pin','mirror']],
  ['SEWING', ['sew','fastener','buttons','buttonholes','topstitch','trim','foam-padding','seam-weld']],
  ['BROWSERS', ['fabric','graphics','grading','pom','scene','material','fit']],
  ['RUN & EXPORT', ['simulate','reset','camera','export']],
]
// CLO 7.0.242 screenshot (2026-10-12): the strip to the RIGHT of the 2D
// viewport consists of two independent vertical columns, reading A1, B1,
// A2, B2 by row. Place only semantically corresponding *functional* EXO tools
// in this reference section. CLO-specific missing tools remain catalogued in
// docs/CLO_V7_EXACT_DUAL_TOOLBAR_ORDER_2026-10-16.md rather than faked.
// The remaining EXO actions are retained in a separate, labelled section.
export const CLO_REFERENCE_LEFT_COLUMN = [
  'select-2d','points','split','polygon-tool','internal','measure','grading',
]
export const CLO_REFERENCE_RIGHT_COLUMN = [
  'curve','graphics','topstitch','seam-links',
]
// Exclude only actions genuinely present in the rendered reference map.
// Old column arrays listed Split/Curve although the new CLO inventory did not,
// which made those working EXO actions disappear from All tools entirely.
const EXO_EXTRA_TOOL_IDS = EXO_RIGHT_EXTRA_TOOLS.map(tool=>tool.id)
export const EXO_EXTRA_LEFT_COLUMN = EXO_EXTRA_TOOL_IDS.filter((_,i)=>i%2===0)
export const EXO_EXTRA_RIGHT_COLUMN = EXO_EXTRA_TOOL_IDS.filter((_,i)=>i%2===1)
const TOOL_BY_ID = new Map(RIGHT_PALETTE_TOOLS.map(item => [item[0], item]))
const WORKFLOW_TABS = [
  ['Pattern', 'select-2d'],
  ['Sewing', 'sew'],
  ['Fabric', 'fabric'],
  ['Fit', 'fit'],
]
// EXO defaults to the complete action palette, matching the
// requested desktop workspace. Compact workflow subsets remain optional.
// New persisted key intentionally resets older focused-only layouts once, so
// returning users see the restored complete CLO tool strips on first launch.
const MODE_KEY = 'garment-studio-right-tools-mode-v3'
const NATIVE_2D_SLOT_BY_ID = new Map([...CLO7_2D_A,...CLO7_2D_B].map(slot => [slot.id,slot]))
const UNSUPPORTED_NATIVE_ACTIONS = new Set(['pin','fastener'])
// The supplemental strip shares native authoring commands with the CLO strip.
// Resolve through one verified capability so these shortcuts cannot drift into
// a different editor or offer an operation that Rust does not support.
const NATIVE_EXTRA_CAPABILITIES = Object.freeze({
  select: 'A01', point: 'A02', 'create-polygon': 'A04', internal: 'A05',
  notch: 'A08', allowance: 'A09', sew: 'B03', measure: 'A11',
  'annotation-add':'A14', 'annotation-edit':'A13',
})
// Every slot's artwork must be an identified CAD symbol. These supplemental
// commands have no dedicated asset and previously fell back to the generic
// cursor, making distinct authoring operations look like placeholders.
const EXTRA_ICON_ALIASES = Object.freeze({
  'seam-allowance':'internal',
  'annotation-add':'pattern-properties',
  'annotation-edit':'pattern-properties',
  'foam-padding':'surface',
})
const nativeExtraCapability = action => NATIVE_EXTRA_CAPABILITIES[action]
  ? getClo7NativeCapability('2d', NATIVE_EXTRA_CAPABILITIES[action]) : null
const canInvokeNativeCapability = capability => ['native','inspect'].includes(capability?.mode)
// App's native command dispatcher stores the selected tool using these names.
// Keep the highlight synchronized with the command actually sent to the editor.
const NATIVE_SELECTED_TOOLS = Object.freeze({
  'create-polygon':'polygon', 'annotation-add':'annotation',
  'annotation-edit':'annotation-edit', 'allowance':'allowance',
})
const NATIVE_SLOT_SELECTED_TOOLS = Object.freeze({
  A01:'select', A02:'point', A03:'fullness', A04:'polygon', A05:'internal', A06:'base-polygon',
  A07:'trace', A08:'notch', A09:'allowance', A10:'walk-seam', A11:'measure-edit', A12:'measure',
  A13:'annotation-edit', A14:'annotation', A15:'pleat-guides', A16:'grading-edit', A17:'grading-auto',
  B01:'seam-edit', B02:'segment-sew', B03:'free-sew', B04:'seam-measure', B15:'fill-panel',
})

// Navigate the two observed columns by physical row. CLO's columns have
// different numbers of controls, so horizontal arrows find the nearest row.
const handleReferenceKeyDown = event => {
  if (!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return
  const current = event.target.closest?.('button[data-clo-slot]')
  if (!current || !event.currentTarget.contains(current)) return
  const buttons = [...event.currentTarget.querySelectorAll('button[data-clo-slot]')]
  const slot = [...CLO7_2D_A,...CLO7_2D_B].find(item => `2d:${item.id}` === current.dataset.cloSlot)
  if (!slot) return
  if(slot.id==='B15' && (event.key==='ArrowDown'||event.key==='End')){
    const foam=event.currentTarget.querySelector('button[data-exo-action="foam-padding"]')
    if(foam){event.preventDefault();foam.focus();return}
  }
  const sameColumn = slot.id.startsWith('A') ? CLO7_2D_A : CLO7_2D_B
  const otherColumn = slot.id.startsWith('A') ? CLO7_2D_B : CLO7_2D_A
  const index = sameColumn.findIndex(item => item.id === slot.id)
  let next
  if (event.key === 'Home') next = sameColumn[0]
  else if (event.key === 'End') next = sameColumn[sameColumn.length-1]
  else if (event.key === 'ArrowUp') next = sameColumn[(index-1+sameColumn.length)%sameColumn.length]
  else if (event.key === 'ArrowDown') next = sameColumn[(index+1)%sameColumn.length]
  else next = otherColumn.reduce((best,item) => Math.abs(item.observedY-slot.observedY) < Math.abs(best.observedY-slot.observedY) ? item : best)
  const target = buttons.find(button => button.dataset.cloSlot === `2d:${next.id}`)
  if (target) { event.preventDefault(); target.focus() }
}

export default function RightToolPalette({ activeSection, viewportTool, tool, setViewportTool, setTool, setActiveSection, setObjectTab, onRevealBrowser, showSewingGuides, setShowSewingGuides, wireframe, setWireframe, analysisMode, setAnalysisMode, toggleSimulation, resetSimulation, onReset2d, exportProject, onFitCamera, onMirrorSelected, onCreatePolygon, onCloTool, activeFinishingTool=null, onOtherToolSelect, nativeClothcraft=false, running, full2D=false, toolbarDock='right', toolbarPosition=null, onToolbarPositionChange, toolbarOrder=null, onToolbarOrderChange, onToolbarDockChange, toolbarEditMode=false, extraToolIds=[] }) {
  const [combinedToolsCollapsed,setCombinedToolsCollapsed]=useState(false)
  const [localDock,setLocalDock]=useState({x:0,y:0})
  const [localOrder,setLocalOrder]=useState([])
  const dock=toolbarPosition||localDock
  const order=toolbarOrder||localOrder
  const visible=column=>!Array.isArray(toolbarOrder)?column:column.filter(slot=>order.includes(`2d:${slot.id}`))
  const gripDrag=useRef(null)
  const dragSlot=useRef(null)
  const rootRef=useRef(null)
  const alternativeDock=toolbarDock!=='right'
  const floatStyle=alternativeDock?{
    position:'fixed',zIndex:60,top:toolbarDock==='bottom'?'auto':toolbarDock==='top'?48:72,
    bottom:toolbarDock==='bottom'?12:'auto',
    left:toolbarDock==='left'?12:toolbarDock==='top'?190:'auto',
    right:toolbarDock==='right'?12:toolbarDock==='floating'||toolbarDock==='bottom'?12:'auto',
    width:['top','bottom'].includes(toolbarDock)?'min(90vw,1050px)':78,maxHeight:'calc(100dvh - 105px)',overflow:'hidden'
  }:{}
  const ordered=column=>{
    const ids=visible(column).map(slot=>`2d:${slot.id}`)
    return [...ids].sort((a,b)=>{
      const ai=order.indexOf(a),bi=order.indexOf(b)
      return (ai<0?ids.indexOf(a)+1000:ai)-(bi<0?ids.indexOf(b)+1000:bi)
    }).map(id=>visible(column).find(slot=>`2d:${slot.id}`===id))
  }
  const reorder=(source,target)=>{
    if(!toolbarEditMode)return
    if(!source||source===target||source.slice(3,4)!==target.slice(3,4))return
    const all=[...ordered(CLO7_2D_A),...ordered(CLO7_2D_B)].map(s=>`2d:${s.id}`)
    const from=all.indexOf(source),to=all.indexOf(target)
    if(from<0||to<0)return
    all.splice(from,1);all.splice(to,0,source)
    if(onToolbarOrderChange)onToolbarOrderChange(all)
    else setLocalOrder(all)
  }
  const beginMove=e=>{
    if(!toolbarEditMode||e.button!==0)return
    e.preventDefault()
    const rect=rootRef.current?.getBoundingClientRect()
    gripDrag.current={x:e.clientX,y:e.clientY,initialX:dock.x||0,initialY:dock.y||0,left:rect?.left??0,top:rect?.top??0}
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const move=e=>{
    if(!toolbarEditMode||!gripDrag.current)return
    const next={x:gripDrag.current.initialX+e.clientX-gripDrag.current.x,y:gripDrag.current.initialY+e.clientY-gripDrag.current.y}
    setLocalDock(next)
    onToolbarPositionChange?.(next)
  }
  const finishMove=e=>{
    if(!toolbarEditMode||!gripDrag.current)return
    const drag=gripDrag.current
    const next={x:drag.initialX+e.clientX-drag.x,y:drag.initialY+e.clientY-drag.y}
    setLocalDock(next)
    const floated={x:drag.left+(e.clientX-drag.x)-(window.innerWidth-12-(rootRef.current?.offsetWidth||78)),
      y:drag.top+(e.clientY-drag.y)-72}
    onToolbarPositionChange?.(floated)
    setLocalDock(floated)
    onToolbarDockChange?.('floating')
    gripDrag.current=null
  }
  const [showAll, setShowAll] = useState(() => {
    try { return localStorage.getItem(MODE_KEY) !== 'focused' } catch { return true }
  })
  // Settings retains the saved extra-tool selection, but the side palette
  // exposes only its original reference tools in both display modes.
  // Foam is a real 2D operation, not a footer action. Keep it available in
  // the focused groups as well as directly beneath Fill in the full CLO rail.
  const visibleAction=id=>EXO_RIGHT_REFERENCE_ACTION_IDS.has(id)||id==='foam-padding'
  useEffect(() => {
    try { localStorage.setItem(MODE_KEY, showAll ? 'all' : 'focused') } catch { /* private mode */ }
  }, [showAll])
  const activateWorkflow = (section) => {
    setActiveSection(section)
    setObjectTab(section === 'Fabric' ? 'Fabric' : 'Scene')
    onRevealBrowser?.()
  }
  const click = (action) => {
    onOtherToolSelect?.()
    if (action === 'foam-padding') {
      setActiveSection('Pattern')
      if (nativeClothcraft) window.dispatchEvent(new Event('exo-clothcraft-open-foam-padding'))
      else document.querySelector('[aria-label="Foam padding and trapunto tool"]')?.scrollIntoView({block:'nearest',behavior:'smooth'})
      return
    }
    if (nativeClothcraft && NATIVE_EXTRA_CAPABILITIES[action] && typeof onCloTool === 'function') {
      const position=NATIVE_EXTRA_CAPABILITIES[action]
      const capability=nativeExtraCapability(action)
      if (canInvokeNativeCapability(capability))
        return onCloTool(NATIVE_2D_SLOT_BY_ID.get(position),'2d')
      return
    }
    if (nativeClothcraft && ['notch','allowance'].includes(action)) {
      return
    }
    if (nativeClothcraft && (action === 'split' || action === 'curve')) {
      setTool(action)
      setActiveSection('Pattern')
      window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:action}}))
      return
    }
    if (action === 'mirror-pattern') return onMirrorSelected?.()
    if (nativeClothcraft && UNSUPPORTED_NATIVE_ACTIONS.has(action)) {
      return
    }
    if (action === 'create-polygon') return onCreatePolygon?.()
    if (['orbit','transform','move','rotate','hand'].includes(action)) return setViewportTool(action)
    if (['select','point','split','curve','internal','notch','measure','pin','sew','fastener'].includes(action)) {
      setTool(action)
      if (nativeClothcraft && ['select','point','split','curve','sew','internal','measure'].includes(action))
        window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:action}}))
      if (action === 'sew' || action === 'fastener') setActiveSection('Sewing')
      else setActiveSection('Pattern')
      return
    }
    if (['Scene','Fabric','Graphic','Button','Buttonhole','Topstitch','Trim','Grading','POM'].includes(action)) {
      setObjectTab(action)
      onRevealBrowser?.()
      setActiveSection(action === 'Fabric' || action === 'Graphic' ? 'Fabric' : ['Button','Buttonhole','Topstitch','Trim'].includes(action) ? 'Sewing' : ['Grading','POM'].includes(action) ? 'Production' : 'Pattern')
      return
    }
    if (action === 'analysis') return setAnalysisMode(analysisMode === 'strain' ? 'surface' : 'strain')
    if (action === 'wireframe') return setWireframe(!wireframe)
    if (action === 'seams') return setShowSewingGuides(!showSewingGuides)
    if (action === 'fabric-edit') { setObjectTab('Fabric'); onRevealBrowser?.(); return setActiveSection('Fabric') }
    if (action === 'fit') return setActiveSection('Fit')
    if (action === 'simulate') return toggleSimulation()
    if (action === 'reset') return nativeClothcraft ? onReset2d?.() : resetSimulation()
    if (action === 'export') return exportProject()
    if (action === 'camera') return onFitCamera?.()
  }
  const active = (action) => Boolean(action) && ((action === viewportTool) || ((nativeClothcraft ? NATIVE_SELECTED_TOOLS[action] || action : action) === tool && ['Pattern','Sewing','Production','Fabric'].includes(activeSection)) || (action === 'wireframe' && wireframe) || (action === 'seams' && showSewingGuides) || (action === 'analysis' && analysisMode === 'strain') || (action === 'simulate' && running))
  // Only advertise actions with a command or a functioning native workspace
  // callback. Planned tooling stays in the source inventory for future releases.
  const availableAction = (action) => {
    if (!action) return false
    if (action==='foam-padding') return true
    if (nativeClothcraft && UNSUPPORTED_NATIVE_ACTIONS.has(action)) return false
    if (nativeClothcraft && NATIVE_EXTRA_CAPABILITIES[action]) {
      return typeof onCloTool==='function' && canInvokeNativeCapability(nativeExtraCapability(action))
    }
    if (nativeClothcraft && ['split','curve'].includes(action)) return typeof setTool==='function' && typeof setActiveSection==='function'
    if (action==='mirror-pattern') return typeof onMirrorSelected==='function'
    if (action==='create-polygon') return typeof onCreatePolygon==='function'
    if (action==='camera') return typeof onFitCamera==='function'
    if (action==='reset') return typeof (nativeClothcraft?onReset2d:resetSimulation)==='function'
    if (action==='simulate') return typeof toggleSimulation==='function'
    if (action==='export') return typeof exportProject==='function'
    if (['wireframe','analysis','seams'].includes(action)) return typeof ({wireframe:setWireframe,analysis:setAnalysisMode,seams:setShowSewingGuides}[action])==='function'
    if (['transform','move','rotate','hand'].includes(action)) return typeof setViewportTool==='function'
    if (['select','point','internal','measure','sew'].includes(action)) return typeof setTool==='function'
    if (['Scene','Fabric','Graphic','Button','Buttonhole','Topstitch','Trim','Grading','POM','fabric-edit'].includes(action)) return typeof setObjectTab==='function' && typeof setActiveSection==='function'
    if (action==='fit') return typeof setActiveSection==='function'
    return false
  }
  const groups = showAll ? ALL_GROUPS : (FOCUSED_GROUPS[activeSection] || FOCUSED_GROUPS.Pattern)
  const renderAction = (id) => {
    const item = TOOL_BY_ID.get(id)
    if (!item) return null
    const [itemId, label, action] = item
    const nativeCapability = nativeClothcraft ? nativeExtraCapability(action) : null
    const unavailable = nativeClothcraft && (UNSUPPORTED_NATIVE_ACTIONS.has(action) || nativeCapability?.mode==='unavailable')
    const missingHandler = nativeClothcraft && Boolean(nativeCapability) && typeof onCloTool !== 'function'
    const disabled = !availableAction(action) || !action || unavailable || missingHandler || (!nativeClothcraft && action==='allowance')
    const nativeReason = nativeCapability?.reason || ''
    const actionButton=<button key={itemId} type="button" title={!action ? `${label} · planned` : unavailable ? `${label} · unavailable in native V2` : missingHandler ? `${label} · native command handler unavailable` : nativeReason && nativeClothcraft ? `${label} · ${nativeReason}` : action==='reset' && nativeClothcraft ? 'Reset 2D panel arrangement; preserve authored geometry' : label} aria-label={label} aria-description={disabled ? nativeReason || 'This command is not available in the current editor.' : nativeReason || undefined} aria-pressed={Boolean(!disabled && active(action))} aria-disabled={disabled} disabled={disabled} data-native-availability={disabled?'unavailable':'available'} data-exo-action={action || 'unavailable'} className={!disabled && active(action) ? 'active' : ''} onClick={disabled ? undefined : () => click(action)}><CadToolIcon id={EXTRA_ICON_ALIASES[itemId] || itemId} size={20}/></button>
    return actionButton
  }
  const mappedReferenceAction=slot=>{
    if(nativeClothcraft)return getClo7NativeCapability('2d',slot.id)?.mode==='native'
    const action=TOOL_BY_ID.get(slot.icon)?.[2]
    // Do not expose legacy V1-only CAD edits as operational in the Rust V2
    // pattern viewport. That editor has its own validated command surface.
    return Boolean(slot.action && slot.action===action)
  }
  const supportedReference = slot => nativeClothcraft
    ? typeof onCloTool==='function' && canInvokeNativeCapability(getClo7NativeCapability('2d',slot.id))
    : mappedReferenceAction(slot)
  const visibleReferenceCount = [...CLO7_2D_A,...CLO7_2D_B]
    .filter(supportedReference).length
  const visibleCount = showAll
    ? visibleReferenceCount+1
    : groups.reduce((count, [, ids]) => count + ids.filter(id=>visibleAction(id)&&availableAction(TOOL_BY_ID.get(id)?.[2])).length, 0)
  const referenceTotal = CLO7_2D_A.length+CLO7_2D_B.length
  const totalCount = showAll?visibleCount:RIGHT_PALETTE_TOOLS.filter(([, ,action])=>availableAction(action)).length
  const renderCloReference = slot => {
    const capability=getClo7NativeCapability('2d',slot.id)
    const mapped=mappedReferenceAction(slot)
    const handlerAvailable=typeof onCloTool==='function'
    const supported= nativeClothcraft
      ? handlerAvailable && canInvokeNativeCapability(capability)
      : mapped && (handlerAvailable || Boolean(slot.action))
    const inspect=nativeClothcraft && capability?.mode==='inspect'
    const unavailableReason=capability?.mode==='unavailable'?'Native tool unavailable':!handlerAvailable&&nativeClothcraft?'Native handler unavailable':'Tool unavailable'
    const pressedAction=nativeClothcraft ? NATIVE_SLOT_SELECTED_TOOLS[slot.id] : slot.action
    // Temporary measurement and seam inspection are real selectable EXO
    // workflows, even though their native capability remains inspect-only.
    const selectableInspect=nativeClothcraft&&inspect&&['A11','A12','B04'].includes(slot.id)
    const isFinishingTool=slot.id==='B04'||slot.id==='B05'
    const slotActive=isFinishingTool
      ? activeFinishingTool===(slot.id==='B04'?'sewing':'steam')
      : Boolean((supported||selectableInspect)&&pressedAction&&active(pressedAction))
    const inlineToolAvailable=isFinishingTool&&handlerAvailable
    const clickable=supported||inlineToolAvailable
    const orderedColumn=slot.id[0]==='A'?CLO7_2D_A:CLO7_2D_B
    const slotIndex=Number(slot.id.slice(1))-1
    const nextSlot=orderedColumn[slotIndex+1]
    const observedDivider=Boolean(nextSlot && nextSlot.observedY-slot.observedY>=40)
    // Each column is independently positioned from the actual CLO AX top
    // coordinates. A compacted flex list drifts after the first group divider
    // and places unrelated A/B tools on the same horizontal row.
    return <button key={slot.id} data-clo-slot={`2d:${slot.id}`}
      onKeyDown={e=>{
        if(!toolbarEditMode||!e.altKey||!['ArrowUp','ArrowDown'].includes(e.key))return
        const slots=ordered(orderedColumn)
        const index=slots.findIndex(item=>item.id===slot.id)
        const adjacent=slots[index+(e.key==='ArrowUp'?-1:1)]
        if(adjacent){e.preventDefault();e.stopPropagation();reorder(`2d:${slot.id}`,`2d:${adjacent.id}`)}
      }}
      type="button" aria-label={slot.label}
      title={inlineToolAvailable?`${slot.label} · Activate tool`: `${slot.label} · ${supported?(inspect?'Inspect related properties':capability?.reason||'Activate EXO action'):`${unavailableReason}: ${capability?.reason||'No native operation yet'}`}`}
      aria-disabled={!clickable}
      data-clo-operational={supported&&(!nativeClothcraft||capability?.mode==='native')?'true':'false'}
      aria-description={supported?(capability?.reason||'Run tool'): `${unavailableReason}. ${capability?.reason||'No supported command.'}`}
      data-clo-details-only={inspect?'true':'false'}
      data-clo-implementation={inlineToolAvailable?'inline':capability?.mode||'unavailable'}
      data-clo-divider-after={observedDivider?'true':undefined}
      aria-pressed={slotActive}
      className={`${supported||inlineToolAvailable?'clo-supported-tool':'clo-tool-inquire'} ${slotActive?'active':''}`}
      // Keep each icon's identity/action, but place it at its reordered row.
      // Indexing the sorted array here is an identity lookup and incorrectly
      // leaves every icon at its original Y after the user rearranges it.
      style={{top:orderedColumn[ordered(orderedColumn).findIndex(item=>item.id===slot.id)].observedY-CLO7_2D_A[0].observedY}}
      draggable={toolbarEditMode} onDragStart={e=>{if(!toolbarEditMode){e.preventDefault();return}dragSlot.current=`2d:${slot.id}`;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',dragSlot.current)}}
      onDragOver={e=>{if(toolbarEditMode&&dragSlot.current?.slice(3,4)===slot.id[0])e.preventDefault()}}
      onDrop={e=>{if(!toolbarEditMode)return;e.preventDefault();reorder(dragSlot.current,`2d:${slot.id}`);dragSlot.current=null}}
      onDragEnd={()=>{dragSlot.current=null}}
      onClick={() => {if(!clickable)return; handlerAvailable ? onCloTool(slot,'2d') : supported && slot.action ? click(slot.action) : undefined}}>
      <CadToolIcon id={slot.icon} size={20}/>
    </button>
  }
  return <nav ref={rootRef} className={`clo-right-tool-palette exo-reorderable-toolbar ${showAll ? 'all-tools' : 'focused-tools'} ${nativeClothcraft&&full2D?'exo-four-column-pattern-toolbar':''}`} data-toolbar-dock={toolbarDock} data-toolbar-edit={String(toolbarEditMode)} style={{...floatStyle,transform:`translate(${dock.x||0}px, ${dock.y||0}px)`}} aria-label="Right workspace tools">
    {toolbarEditMode&&<button type="button" className="exo-toolbar-move-grip" aria-label="Move 2D toolbar" title="Drag to move 2D toolbar" onPointerDown={beginMove} onPointerMove={move} onPointerUp={finishMove} onPointerCancel={()=>{gripDrag.current=null}}>⠿</button>}
    <div className="clo-palette-workflows" aria-label="Quick workflow switching">
      {WORKFLOW_TABS.map(([section, iconId]) => <button key={section} type="button" aria-label={`Switch to ${section} tools`} aria-pressed={activeSection === section} title={`${section} tools`} className={activeSection === section ? 'active' : ''} onClick={() => activateWorkflow(section)}><CadToolIcon id={iconId} size={19}/></button>)}
    </div>
    <div className="clo-palette-scroll" aria-live="off">
      {(showAll||nativeClothcraft&&full2D) ? <>
        <div className="clo-tool-palette-group-divider" aria-label="CLO version 7 two-column pattern reference">2D TOOLS</div>

        <div className="clo-reference-dual-bars clo-observed-bars exo-two-column-combined-bars" data-tools-collapsed={combinedToolsCollapsed} aria-label="Combined 2D and Pattern Studio tools" data-toolbar-complete="true" onKeyDown={handleReferenceKeyDown}>
        <div className="clo-reference-column clo-right-tool-grid clo-observed-column" role="toolbar" aria-orientation="vertical" aria-label="CLO 2D column A">{visible(CLO7_2D_A).map(renderCloReference)}{nativeClothcraft&&full2D&&<PatternStudioExtraColumns nativeClothcraft={nativeClothcraft} full2D={full2D} running={running} column={0}/>}</div>
        <div className="clo-reference-column clo-right-tool-grid clo-observed-column" role="toolbar" aria-orientation="vertical" aria-label="CLO 2D column B">
          {visible(CLO7_2D_B).map(renderCloReference)}
          {nativeClothcraft&&full2D&&<PatternStudioExtraColumns nativeClothcraft={nativeClothcraft} full2D={full2D} running={running} column={1}/>}
          {/* EXO extension, not a claimed CLO slot: matches B15 Fill's button
              size and sits one regular 34px row immediately below it. */}
          <button type="button" className="clo-foam-padding-launch clo-supported-tool"
            aria-label="Foam Padding / Trapunto"
            title="Foam Padding / Trapunto · import SVG raised foam shapes"
            data-exo-action="foam-padding" data-exo-after="fill-pattern"
            style={{top:CLO7_2D_B.at(-1).observedY-CLO7_2D_A[0].observedY+34}}
            onKeyDown={event=>{
              if(event.key==='ArrowUp'||event.key==='Home'){
                event.preventDefault()
                event.currentTarget.parentElement.querySelector('[data-clo-slot="2d:B15"]')?.focus()
              }
            }}
            onClick={()=>click('foam-padding')}>
            <CadToolIcon id="surface" size={20}/>
          </button>
        </div>
        </div>
      </> : groups.map(([name, ids])=>[name,ids.filter(visibleAction)]).filter(([,ids])=>ids.length).map(([name, ids]) => <div className="clo-palette-group" key={name}>
        <div className="clo-palette-group-label" title={name}>{name}</div>
        <div className="clo-right-tool-grid">{ids.map(renderAction)}</div>
      </div>)}
    </div>
    <button type="button" className="clo-reset-fabric-panels" disabled={typeof resetSimulation!=='function'} aria-disabled={typeof resetSimulation!=='function'} aria-label={nativeClothcraft?'Reset 3D fabric arrangement':'Reset fabric panels'} title={nativeClothcraft?'Reset the 3D fabric arrangement to its initial pose; preserve authored patterns, sewing and materials':'Reset fabric panels to their initial arrangement; preserve patterns, sewing and materials'} onClick={typeof resetSimulation==='function'?resetSimulation:undefined} style={{alignSelf:"flex-end",margin:"6px 3px",padding:"6px 2px",fontSize:8,width:"calc(100% - 6px)",minHeight:54,display:"flex",flexDirection:"column",alignItems:"center",gap:4,background:"#32373d",color:"#e6edf3"}}><RotateCcw size={18}/><span>RESET<br/>{nativeClothcraft?'3D':'PANELS'}</span></button>
    <div className="clo-palette-count"
      title={showAll?
        `${visibleReferenceCount} operational or inspectable CLO reference positions of ${referenceTotal}; selecting a tool activates it without opening an information panel.`:
        `${visibleCount} operational buttons in this focused workspace group, ${totalCount} available EXO actions.`}>
      {visibleCount}<span>/{totalCount}</span>
    </div>
  </nav>
}
