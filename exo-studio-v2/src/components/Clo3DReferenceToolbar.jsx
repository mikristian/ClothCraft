import React, {useRef, useState} from 'react'
import CadToolIcon from './CadToolIcon.jsx'
import {PanelLeftClose} from 'lucide-react'
import {CLO7_3D_A,CLO7_3D_B} from '../data/clo7ToolbarOrder.js'
import {getClo7NativeCapability} from '../core/clo7NativeToolCapabilities.js'

const activeAction=(slot,{running,viewportTool,tool,sewingGuides},nativeAction)=>{
  // Live CLO button selection is tied to the active native command even when
  // the historic screenshot manifest has no legacy V1 slot.action.
  if(nativeAction==='sewing.editExisting')return tool==='seam-edit'
  if(nativeAction==='sewing.segmentSew')return tool==='segment-sew'
  if(nativeAction==='sewing.freeSew')return tool==='free-sew'
  if(nativeAction==='viewport3d.selectMove')return ['transform','move'].includes(viewportTool)
  if(nativeAction==='viewport3d.meshBrushSelect')return tool==='mesh-select'||viewportTool==='mesh-select'
  if(nativeAction==='dimensions.measureAvatar')return tool==='avatar-measure'
  if(nativeAction==='dimensions.measureAvatarEdit')return tool==='avatar-measure-edit'
  if(nativeAction==='dimensions.measureGarment')return tool==='garment-measure'
  if(nativeAction==='dimensions.measureGarmentEdit')return tool==='garment-measure-edit'
  if(nativeAction==='pattern3d.drawInternalLine')return tool==='line-3d'
  switch(slot.action){
    case 'simulate': return running
    case 'transform': return ['transform','move'].includes(viewportTool)
    case 'mesh-select': return viewportTool==='mesh-select'
    case 'pin': return tool==='pin'
    case 'fastener': return tool==='fastener'
    case 'seams': return sewingGuides
    default: return false
  }
}

const handleToolbarKeyDown=event=>{
  if(!['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Home','End'].includes(event.key))return
  const column=event.target.closest('.clo-left-3d-column')
  if(!column)return
  const buttons=Array.from(column.querySelectorAll('button[data-clo-slot]'))
  if(!buttons.length)return
  const index=buttons.indexOf(event.target)
  if(index<0)return
  event.preventDefault()
  if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
    const parent=column.closest('.clo-left-3d-double-bars')
    const columns=Array.from(parent?.querySelectorAll('.clo-left-3d-column')||[])
    const destination=columns[columns.indexOf(column)+(event.key==='ArrowRight'?1:-1)]
    const otherButtons=Array.from(destination?.querySelectorAll('button[data-clo-slot]')||[])
    otherButtons[Math.min(index,otherButtons.length-1)]?.focus()
    return
  }
  const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:
    (index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length
  buttons[next].focus()
}

/**
 * Keep the observed CLO 3D reference positions stable. Native capabilities
 * change independently of their physical order, icon and accessible label.
 * Native commands execute on click, inspectors navigate directly, and
 * unavailable slots keep their original positions without spawning popups.
 */
export default function Clo3DReferenceToolbar({nativeClothcraft, enabledLegacy, onActivate, onCollapse3D,
  canDraft, running=false, viewportTool='', tool='', sewingGuides=false,
  toolbarDock='left', toolbarPosition=null, onToolbarPositionChange, toolbarOrder=null, onToolbarOrderChange, onToolbarDockChange, toolbarEditMode=false}) {
  const [localDock,setLocalDock]=useState({x:0,y:0})
  const [localOrder,setLocalOrder]=useState([])
  const dock=toolbarPosition||localDock
  const order=toolbarOrder||localOrder
  const gripDrag=useRef(null)
  const dragSlot=useRef(null)
  const rootRef=useRef(null)
  // A removed CLO slot must actually disappear. Previously the Settings
  // inventory changed, but both fixed toolbar columns always rendered every
  // button. The authored default inventory still preserves every source slot.
  const visible=(column)=>!Array.isArray(toolbarOrder)?column:column.filter(slot=>order.includes(`3d:${slot.id}`))
  const alternativeDock=toolbarDock!=='left'
  const floatStyle=alternativeDock?{
    position:'fixed',zIndex:60,top:toolbarDock==='bottom'?'auto':toolbarDock==='top'?48:72,
    bottom:toolbarDock==='bottom'?12:'auto',
    left:toolbarDock==='right'?12:toolbarDock==='top'?100:'auto',
    right:toolbarDock==='left'?12:toolbarDock==='floating'||toolbarDock==='bottom'?80:'auto',
    maxHeight:'calc(100dvh - 105px)',overflowY:'auto',overflowX:'hidden'
  }:{}
  const ordered=(column)=>{
    const available=visible(column)
    const ids=available.map(slot=>`3d:${slot.id}`)
    const arranged=[...ids].sort((a,b)=>{
      const ai=order.indexOf(a),bi=order.indexOf(b)
      return (ai<0?ids.indexOf(a)+1000:ai)-(bi<0?ids.indexOf(b)+1000:bi)
    })
    return arranged.map(id=>available.find(slot=>`3d:${slot.id}`===id))
  }
  const reorder=(source,target)=>{
    if(!toolbarEditMode)return
    if(!source||source===target||source.slice(3,4)!==target.slice(3,4))return
    const all=[...ordered(CLO7_3D_A),...ordered(CLO7_3D_B)].map(s=>`3d:${s.id}`)
    const from=all.indexOf(source),to=all.indexOf(target)
    if(from<0||to<0)return
    all.splice(from,1);all.splice(to,0,source)
    if(onToolbarOrderChange)onToolbarOrderChange(all)
    else setLocalOrder(all)
  }
  const beginMove=e=>{
    if(!toolbarEditMode)return
    if(e.button!==0)return
    e.preventDefault()
    const rect=rootRef.current?.getBoundingClientRect()
    gripDrag.current={x:e.clientX,y:e.clientY,initialX:dock.x||0,initialY:dock.y||0,
      left:rect?.left??0,top:rect?.top??0}
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const move=e=>{
    if(!toolbarEditMode)return
    if(!gripDrag.current)return
    const next={x:gripDrag.current.initialX+e.clientX-gripDrag.current.x,y:gripDrag.current.initialY+e.clientY-gripDrag.current.y}
    setLocalDock(next)
    onToolbarPositionChange?.(next)
  }
  const finishMove=e=>{
    if(!toolbarEditMode)return
    if(!gripDrag.current)return
    const drag=gripDrag.current
    const next={x:drag.initialX+e.clientX-drag.x,y:drag.initialY+e.clientY-drag.y}
    setLocalDock(next)
    const floated={x:drag.left+(e.clientX-drag.x)-(window.innerWidth-80-(rootRef.current?.offsetWidth||70)),
      y:drag.top+(e.clientY-drag.y)-72}
    onToolbarPositionChange?.(floated)
    setLocalDock(floated)
    onToolbarDockChange?.('floating')
    gripDrag.current=null
  }
  const renderSlot=slot=>{
    const capability=getClo7NativeCapability('3d',slot.id)
    const nativeMode=nativeClothcraft?capability?.mode:null
    const nativeCommand=nativeMode==='native'
    const inspect=nativeMode==='inspect'
    const legacyCommand=!nativeClothcraft&&Boolean(enabledLegacy?.(slot))
    const draft=!nativeClothcraft&&Boolean(canDraft?.(slot))
    const operational=Boolean(nativeClothcraft&&nativeCommand)
    const legacyAvailable=Boolean(legacyCommand||draft)
    const mode=nativeClothcraft?nativeMode||'unavailable':legacyAvailable?'native':'unavailable'
    const pressed=Boolean((operational||legacyAvailable)&&!inspect&&activeAction(slot,{running,viewportTool,tool,sewingGuides},nativeClothcraft?capability?.nativeAction:null))
    const status=operational?'Activate native EXO action':inspect?'Open related EXO inspector':legacyAvailable?'Activate EXO action':'Native operation unavailable'
    const explanation=capability?.reason||(!operational&&!legacyAvailable?'No implementation available for this tool':'EXO tool')
    // The running CLO 7 window exposes independent A/B Y coordinates. Position
    // each control from that source so group gaps never shift the later row.
    const column=slot.id[0]==='A'?CLO7_3D_A:CLO7_3D_B
    const next=column[Number(slot.id.slice(1))]
    const dividerAfter=Boolean(next&&next.observedY-slot.observedY>=40)
    const slots=ordered(column)
    const displayIndex=slots.findIndex(item=>item.id===slot.id)
    const positions=column.slice(0,slots.length)
    return <button key={slot.id} type="button" data-clo-slot={`3d:${slot.id}`}
      onKeyDown={e=>{
        if(!toolbarEditMode||!e.altKey||!['ArrowUp','ArrowDown'].includes(e.key))return
        const index=slots.findIndex(item=>item.id===slot.id)
        const adjacent=slots[index+(e.key==='ArrowUp'?-1:1)]
        if(adjacent){e.preventDefault();e.stopPropagation();reorder(`3d:${slot.id}`,`3d:${adjacent.id}`)}
      }}
      draggable={toolbarEditMode} onDragStart={e=>{if(!toolbarEditMode){e.preventDefault();return}dragSlot.current=`3d:${slot.id}`;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',dragSlot.current)}}
      onDragOver={e=>{if(toolbarEditMode&&dragSlot.current?.slice(3,4)===slot.id[0])e.preventDefault()}}
      onDrop={e=>{if(!toolbarEditMode)return;e.preventDefault();reorder(dragSlot.current,`3d:${slot.id}`);dragSlot.current=null}}
      onDragEnd={()=>{dragSlot.current=null}}
      data-clo-column={slot.id.charAt(0)} data-clo-row={Number(slot.id.slice(1))}
      data-clo-implementation={mode} data-clo-operational={operational}
      data-clo-status={status}
      data-clo-group-end={dividerAfter?'true':undefined}
      aria-label={slot.label}
      aria-description={`${status}. ${explanation}`}
      title={slot.label}
      aria-pressed={operational||legacyAvailable?pressed:undefined}
      className={`${pressed?'active ':''}${operational||legacyAvailable?'clo-supported-tool':inspect?'clo-inspect-tool':'clo-tool-inquire'}`}
      style={{top:positions[displayIndex].observedY-CLO7_3D_A[0].observedY}}
      onClick={()=>onActivate?.(slot,'3d')}>
      <CadToolIcon id={slot.icon} size={20}/>
    </button>
  }
  return <div ref={rootRef} className="clo-left-3d-double-bars clo-observed-3d-bars exo-reorderable-toolbar" data-toolbar-dock={toolbarDock} data-toolbar-edit={String(toolbarEditMode)} style={{...floatStyle,transform:`translate(${dock.x||0}px, ${dock.y||0}px)`}} role="group" aria-label="3D reference tools: all 38 positions" data-toolbar-complete="true" onKeyDown={handleToolbarKeyDown}>
    {toolbarEditMode&&<button type="button" className="exo-toolbar-move-grip" aria-label="Move 3D toolbar" title="Drag to move 3D toolbar" onPointerDown={beginMove} onPointerMove={move} onPointerUp={finishMove} onPointerCancel={()=>{gripDrag.current=null}}>⠿</button>}
    <div className="clo-left-3d-column clo-observed-3d-column" role="toolbar" aria-orientation="vertical" aria-label="3D editing column A">{visible(CLO7_3D_A).map(renderSlot)}</div>
    <div className="clo-left-3d-column clo-observed-3d-column" role="toolbar" aria-orientation="vertical" aria-label="3D garment column B">
      {visible(CLO7_3D_B).map(renderSlot)}
      {/* The camera launch belongs directly below Press (B18) in the actual
          left toolbar. ClothCraft supplies its working control via a portal. */}
      <div className="clo-3d-webcam-slot" data-camera-hand-toolbar-slot="true" aria-label="Webcam tool below Press"/>
      {onCollapse3D && <button type="button" className="clo-3d-collapse-slot" aria-label="Collapse 3D viewer for full-width 2D patterns" title="Expand 2D patterns · hide 3D" onClick={onCollapse3D}><PanelLeftClose size={19}/></button>}
    </div>
  </div>
}
