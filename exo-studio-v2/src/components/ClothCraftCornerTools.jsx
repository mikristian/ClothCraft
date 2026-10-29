import React, {useId,useState} from 'react'
import {flushSync} from 'react-dom'
import {Layers3, ScanLine, Spline, Scissors, Ruler} from 'lucide-react'
import ViewportQuickTools from './ViewportQuickTools.jsx'
import './ClothCraftCornerTools.css'

// Reuse Garment Studio's real CAD widget/icon system. Map only the commands
// available in the Rust-linked ClothCraft canvas to working V2 interactions.
const MODE_BY_TOOL = {
  '2d': {select:'edit',point:'edit','direct-select':'edit','anchor-point':'edit',split:'edit','remove-anchor':'edit',curve:'edit',dart:'edit','shape-builder':'edit',polygon:'pen','vector-pen':'pen','vector-pencil':'pen',measure:'edit',sew:'sew',internal:'line',notch:'edit',allowance:'edit'},
  '3d': {orbit:'edit',transform:'move3d',move:'move3d',rotate:'rotate3d',hand:'stretch3d'},
}
const ACTIVE_TOOL = {
  '2d': {edit:'select',sew:'sew',line:'internal',pen:'polygon'},
  '3d': {edit:'orbit',move3d:'move',rotate3d:'rotate',stretch3d:'hand'},
}

export default function ClothCraftCornerTools({dimension,mode,activeTool:controlledTool,onChangeMode,onChangeTool,disabled=false,onCollapse3D,
  displayLayers, onToggleDisplayLayer, allowanceWidthMm=10,onChangeAllowanceWidth,
  notchDepthMm=6,onChangeNotchDepth,notchPairSpacingMm=6,onChangeNotchPairSpacing,
  dartIntakeMm=30,onChangeDartIntake,dartDepthMm=70,onChangeDartDepth,
  selectedGuide,onCreateGuideLine,onRemoveGuideLine,onClearGuide,cameraHandControl}) {
  const tools = MODE_BY_TOOL[dimension] || {}
  const [lastTool,setLastTool] = useState(null)
  const [displayOpen,setDisplayOpen] = useState(false)
  const [displayHovered,setDisplayHovered] = useState(false)
  const [displayFocused,setDisplayFocused] = useState(false)
  const [displayDismissed,setDisplayDismissed] = useState(false)
  const displayMenuId=useId()
  const activeTool = controlledTool && tools[controlledTool] === mode ? controlledTool : lastTool && tools[lastTool] === mode
    ? lastTool : (ACTIVE_TOOL[dimension]?.[mode] || 'select')
  const displayVisible = !displayDismissed && (displayOpen || displayHovered || displayFocused)
  const displayGroup=dimension==='2d' ? <div className="canvas-tool-group clo-corner-tool-group cc-2d-display-host"
    data-tool-family="pattern-display" data-open={String(displayVisible)} data-dismissed={String(displayDismissed)}
    onPointerEnter={()=>{setDisplayHovered(true);setDisplayDismissed(false)}}
    onPointerLeave={()=>{setDisplayHovered(false);setDisplayOpen(false)}}
    onFocusCapture={event=>{
      setDisplayFocused(true)
      // Escape restores focus from an option to the trigger. That internal
      // focus move must not reopen an intentionally dismissed flyout.
      if(!event.currentTarget.contains(event.relatedTarget))setDisplayDismissed(false)
    }}
    onBlurCapture={event=>{
      if(!event.currentTarget.contains(event.relatedTarget)){
        setDisplayFocused(false)
        setDisplayOpen(false)
      }
    }}
    onKeyDown={event=>{
      if(event.key==='Escape'){
        event.preventDefault();event.stopPropagation()
        setDisplayOpen(false);setDisplayHovered(false);setDisplayFocused(false);setDisplayDismissed(true)
        event.currentTarget.querySelector('.cc-2d-display-trigger')?.focus()
      } else if(event.key==='ArrowRight' && event.target.classList.contains('cc-2d-display-trigger')){
        event.preventDefault()
        // Focus cannot enter CSS display:none; expose the row synchronously.
        flushSync(()=>{setDisplayOpen(true);setDisplayDismissed(false)})
        event.currentTarget.querySelector('.cc-2d-display-menu > button:not(:disabled)')?.focus()
      } else if(['ArrowRight','ArrowLeft','Home','End'].includes(event.key)&&event.target.closest?.('.cc-2d-display-menu')){
        const buttons=[...event.currentTarget.querySelectorAll('.cc-2d-display-menu > button:not(:disabled)')]
        const current=buttons.indexOf(event.target.closest('button'))
        if(current<0||!buttons.length)return
        event.preventDefault()
        const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:
          (current+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length
        buttons[next].focus()
      }
    }}>
    <button type="button" className="cc-2d-display-trigger" aria-label="2D Pattern Display"
      title="2D Pattern Display · hover to toggle reference, internal, notch and allowance guides"
      aria-expanded={displayVisible} aria-haspopup="true" aria-controls={displayMenuId}
      onClick={()=>{
        if(displayOpen){setDisplayOpen(false);setDisplayHovered(false);setDisplayDismissed(true)}
        else {setDisplayOpen(true);setDisplayDismissed(false)}
      }}>
      <Layers3 size={19}/>
      <span className="clo-corner-flyout-caret" aria-hidden="true"/>
    </button>
    <div id={displayMenuId} className="canvas-tool-options clo-corner-tool-options cc-2d-display-menu" role="group" aria-label="2D Pattern Display options">
      {[
        ['reference','Show Reference Lines',ScanLine],
        ['internal','Show Internal Lines',Spline],
        ['notches','Show Notches',Scissors],
        ['allowances','Show Seam Allowance',Ruler],
      ].map(([key,label,Icon])=><button key={key} type="button"
        className={`cc-2d-display-option${displayLayers?.[key]?' active':''}`}
        aria-label={label} title={label} aria-pressed={Boolean(displayLayers?.[key])}
        onClick={()=>onToggleDisplayLayer?.(key)}>
        <Icon size={19} aria-hidden="true"/>
      </button>)}
    </div>
    {(controlledTool==='allowance'||controlledTool==='notch'||controlledTool==='dart'||selectedGuide)&&<div className="cc-2d-display-details">
      {controlledTool==='allowance'&&<label className="cc-2d-display-width">Allowance (mm)
        <input aria-label="Seam allowance width in millimetres" type="number"
          min=".1" max="500" step=".5" value={allowanceWidthMm}
          onChange={event=>onChangeAllowanceWidth?.(Number(event.target.value))}/>
      </label>}
      {controlledTool==='notch'&&<>
        <label className="cc-2d-display-width">Notch depth (mm)
          <input aria-label="Notch depth in millimetres" type="number"
            min=".5" max="100" step=".5" value={notchDepthMm}
            onChange={event=>onChangeNotchDepth?.(Number(event.target.value))}/>
        </label>
        <label className="cc-2d-display-width">Double-notch spacing (mm)
          <input aria-label="Double notch spacing in millimetres" type="number"
            min="1" max="200" step=".5" value={notchPairSpacingMm}
            onChange={event=>onChangeNotchPairSpacing?.(Number(event.target.value))}/>
        </label>
        <small>Click once for a single notch · Shift-click for one atomic double notch · Option-click near a mark to remove. Production export requires depth no greater than the edge allowance.</small>
      </>}
      {controlledTool==='dart'&&<>
        <label className="cc-2d-display-width">Dart intake (mm)
          <input aria-label="Physical dart intake in millimetres" type="number" min="3" max="150" step="1"
            value={dartIntakeMm} onChange={event=>onChangeDartIntake?.(Number(event.target.value))}/>
        </label>
        <label className="cc-2d-display-width">Dart depth (mm)
          <input aria-label="Physical dart depth in millimetres" type="number" min="8" max="500" step="1"
            value={dartDepthMm} onChange={event=>onChangeDartDepth?.(Number(event.target.value))}/>
        </label>
        <small>Click an unsewn straight cutline to create a real V-cut and sewn dart. This removes the wedge and stitches its two legs in 3D; it does not fold an uncut dart.</small>
      </>}
      {selectedGuide&&<div className="cc-2d-display-selection">
        <span>{selectedGuide.kind.replaceAll('-',' ')} · {(selectedGuide.lengthMetres*100).toFixed(2)} cm</span>
        {selectedGuide.nativeLineId
          ?<button type="button" onClick={onRemoveGuideLine} disabled={disabled}>Remove native internal line</button>
          :<button type="button" onClick={onCreateGuideLine} disabled={disabled}>Create native internal line</button>}
        <button type="button" onClick={onClearGuide}>Clear selection</button>
      </div>}
    </div>}
  </div> : null
  return <div className="cc-corner-tool-host">
    <ViewportQuickTools dimension={dimension}
      onCollapse3D={onCollapse3D}
      extraGroup={dimension==='3d'&&cameraHandControl
        ?<div className="canvas-tool-group clo-corner-tool-group cc-3d-camera-hand-host" data-tool-family="camera-hand">{cameraHandControl}</div>
        :displayGroup}
      activeTool={activeTool}
      availableTools={Object.keys(tools)}
      disabled={disabled}
      onChangeTool={name => {
        if (tools[name]) {
          setLastTool(name)
          onChangeTool?.(name)
          onChangeMode?.(tools[name])
        }
      }}/>
  </div>
}
