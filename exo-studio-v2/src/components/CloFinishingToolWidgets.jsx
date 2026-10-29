import React, {useEffect, useRef, useState} from 'react'
import {createPortal} from 'react-dom'
import {CornerUpLeft, PanelBottom, PanelTop, X} from 'lucide-react'
import {inspectSewingLengths,sewingLengthDiagnostic} from '../core/sewingLengthDiagnostics.js'
import {isExoBottomDockHit20261027,setExoBottomDockHover20261027,requestExoBottomDockInsert20261028} from '../core/exoBottomDockGeometry20261027.js'
import './CloFinishingToolWidgets.css'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const defaultPosition = kind => {
  const width = kind === 'steam' ? 390 : kind === 'grading' ? Math.min(1040,window.innerWidth-24) : kind==='grading-quick-toolbar'?Math.min(520,window.innerWidth-24):405
  const workspace = document.querySelector('.workspaces')
  const bounds = workspace?.getBoundingClientRect()
  const centre = bounds ? bounds.left+bounds.width*.5 : window.innerWidth*.5
  const top = bounds ? bounds.top+bounds.height*.5-117.5 : window.innerHeight*.5-117.5
  return {x: clamp(Math.round(centre-width/2), 8, Math.max(8, window.innerWidth-width-8)),
    y: clamp(Math.round(top), 48, Math.max(48, window.innerHeight-235))}
}

export function CloFloatingPanel({kind, title, open, active, onClose, onActivate, embedTarget=null, embedRequest=0, children}) {
  const [position, setPosition] = useState(() => defaultPosition(kind))
  const [nestedTarget,setNestedTarget]=useState(null)
  const [docked,setDocked] = useState(()=>{
    // V2 explicitly starts every tool popup floating; old auto-dock state
    // cannot silently hide a newly opened tool in the bottom region.
    try{return window.localStorage.getItem('exo.widget.bottom-docked.'+kind+'.v2')==='true'}catch{return false}
  })
  const [dockSide,setDockSide]=useState(()=>{
    try{const saved=localStorage.getItem('exo.widget.dock-side.'+kind+'.v1');return ['top','bottom','left','right'].includes(saved)?saved:'bottom'}catch{return 'bottom'}
  })
  const drag = useRef(null)
  const panel = useRef(null)
  const positioned = useRef(false)
  // The native 2D workspace is the owner of the common drop zone; floating
  // tools launched elsewhere remain ordinary independent windows.
  const bottomDockHost=typeof document==='undefined'?null:document.querySelector('[data-exo-grade-dock-host="true"][data-exo-dock-edge="bottom"]')
  const topDockHost=typeof document==='undefined'?null:document.querySelector('[data-exo-grade-dock-host="true"][data-exo-dock-edge="top"]')
  const leftDockHost=typeof document==='undefined'?null:document.querySelector('[data-exo-grade-dock-host="true"][data-exo-dock-edge="left"]')
  const rightDockHost=typeof document==='undefined'?null:document.querySelector('[data-exo-grade-dock-host="true"][data-exo-dock-edge="right"]')
  const dockHosts=[topDockHost,bottomDockHost,...(kind==='grading-quick-toolbar'?[leftDockHost,rightDockHost]:[])].filter(Boolean)
  const dockHost=({top:topDockHost,bottom:bottomDockHost,left:leftDockHost,right:rightDockHost})[dockSide]
  const nestedHost=kind==='grading-quick-toolbar'&&nestedTarget&&typeof document!=='undefined'?
    document.querySelector(`[data-grade-toolbar-parent="${nestedTarget}"][data-exo-grade-toolbar-slot="true"]`):null
  const actuallyNested=Boolean(nestedHost)
  const actuallyDocked=docked&&Boolean(dockHost)&&!actuallyNested
  useEffect(()=>{
    if(kind!=='grading-quick-toolbar'||!actuallyNested)return
    const host=nestedHost?.closest('[data-exo-grade-dock-host="true"]')
    if(host&&host.getBoundingClientRect().height<310)
      host.dispatchEvent(new CustomEvent('exo-dock-request-height',{detail:{height:310}}))
  },[kind,actuallyNested,nestedHost])
  const nestedAt=(x,y)=>{
    if(kind!=='grading-quick-toolbar')return null
    for(const target of ['values','compare']){
      const widget=document.querySelector(`[data-exo-grade-bottom-widget="${target}"]`)
      const rect=widget?.getBoundingClientRect()
      if(rect&&x>=rect.left&&x<=rect.right&&y>=rect.top&&y<=rect.bottom)return target
    }
    return null
  }
  const showNestedHover=target=>{
    if(kind!=='grading-quick-toolbar')return
    for(const name of ['values','compare']){
      const widget=document.querySelector(`[data-exo-grade-bottom-widget="${name}"]`)
      if(widget)widget.dataset.exoGradeToolbarDropHover=String(target===name)
    }
  }
  const moveToNested=target=>{
    setNestedTarget(target)
    if(target){
      setDocked(false)
      try{window.localStorage.setItem('exo.widget.bottom-docked.'+kind+'.v2','false')}catch{}
    }
    showNestedHover(null)
  }
  useEffect(()=>{
    if(kind==='grading-quick-toolbar'&&(embedTarget==='values'||embedTarget==='compare')){
      setNestedTarget(embedTarget)
      setDocked(false)
    }else if(kind==='grading-quick-toolbar'&&embedTarget==='floating'){
      // A user-requested restore must always recover a visible standalone
      // widget, regardless of an old saved dock side, a missing parent table,
      // or an offscreen position from an earlier workspace arrangement.
      setNestedTarget(null)
      setDocked(false)
      try{window.localStorage.setItem('exo.widget.bottom-docked.'+kind+'.v2','false')}catch{}
      setPosition(defaultPosition(kind))
      positioned.current=true
    }
  },[kind,embedTarget,embedRequest])
  const moveToDock=(next,side=dockSide)=>{
    if(next&&!({top:topDockHost,bottom:bottomDockHost,left:leftDockHost,right:rightDockHost})[side])return
    if(next)setNestedTarget(null)
    setDockSide(side)
    try{localStorage.setItem('exo.widget.dock-side.'+kind+'.v1',side)}catch{}
    setDocked(next)
    try{window.localStorage.setItem('exo.widget.bottom-docked.'+kind+'.v2',String(next))}catch{}
    for(const host of dockHosts){if(host.dataset.exoDockEdge==='left'||host.dataset.exoDockEdge==='right')host.dataset.exoGradeDockDragHover='false';else setExoBottomDockHover20261027(host,false)}
  }
  const hostAt=(x,y)=>{
    for(const host of dockHosts){
      if(!host)continue
      const edge=host.dataset.exoDockEdge
      if(edge==='left'||edge==='right'){const rect=host.getBoundingClientRect();if(x>=rect.left-10&&x<=rect.right+10&&y>=rect.top&&y<=rect.bottom)return host;continue}
      const root=host.closest('.cc-embedded-root.cc-embedded-2d')
      if(isExoBottomDockHit20261027(root?.getBoundingClientRect(),host.getBoundingClientRect(),x,y,edge))return host
    }
    return null
  }
  const overDock=(x,y)=>Boolean(hostAt(x,y))
  const showDockHover=(x,y)=>{
    const selected=hostAt(x,y)
    for(const host of dockHosts){
      if(['left','right'].includes(host.dataset.exoDockEdge))host.dataset.exoGradeDockDragHover=String(host===selected)
      else setExoBottomDockHover20261027(host,host===selected,title,x,kind)
    }
  }
  const clearDockHover=()=>{
    for(const host of dockHosts){if(host.dataset.exoDockEdge==='left'||host.dataset.exoDockEdge==='right')host.dataset.exoGradeDockDragHover='false';else setExoBottomDockHover20261027(host,false)}
  }
  const dropInHost=(host,x)=>{
    if(!host)return
    if(!['left','right'].includes(host.dataset.exoDockEdge))requestExoBottomDockInsert20261028(host,kind,x)
    moveToDock(true,host.dataset.exoDockEdge||'bottom')
  }
  const bounds = () => ({
    maxX:Math.max(8,window.innerWidth-(panel.current?.offsetWidth||(kind==='steam'?390:kind==='grading'?Math.min(1040,window.innerWidth-24):kind==='grading-quick-toolbar'?Math.min(520,window.innerWidth-24):405))-8),
    maxY:Math.max(45,window.innerHeight-(panel.current?.offsetHeight||235)-8),
  })
  useEffect(() => {
    if (!open||actuallyDocked||actuallyNested) return undefined
    // On initial React render the workspace DOM may not yet be committed.
    // Centre the first opening against the actual 3D/2D panes, then preserve
    // the user's dragged position across subsequent closes and reopens.
    const firstOpen = !positioned.current
    if (firstOpen) {
      positioned.current = true
      setPosition(defaultPosition(kind))
    }
    const fit = () => setPosition(pos => {
      const {maxX,maxY}=bounds()
      return {x:clamp(pos.x,8,maxX),y:clamp(pos.y,45,maxY)}
    })
    // A panel's final height is only measurable after it is mounted. Keep it
    // inside the window as soon as the browser has laid out its contents.
    fit()
    const frame = window.requestAnimationFrame(() => {
      if (firstOpen && panel.current && !drag.current) {
        const workspace = document.querySelector('.workspaces')?.getBoundingClientRect()
        const centerY = workspace ? workspace.top + workspace.height / 2 : window.innerHeight / 2
        const {maxY} = bounds()
        // Measure the rendered height so every widget, including grading,
        // opens at the actual workspace center regardless of its form rows.
        setPosition(pos => ({...pos,y:clamp(Math.round(centerY-panel.current.offsetHeight/2),45,maxY)}))
      }
      fit()
    })
    window.addEventListener('resize', fit)
    return () => {window.cancelAnimationFrame(frame);window.removeEventListener('resize', fit)}
  }, [open, kind, actuallyDocked, actuallyNested])
  if (!open) return null
  const startDrag = event => {
    if (actuallyDocked||actuallyNested||event.button !== 0 || event.target.closest('button, input, select')) return
    drag.current = {pointerId:event.pointerId, x:event.clientX, y:event.clientY,
      left:position.x, top:position.y}
    event.currentTarget.setPointerCapture(event.pointerId)
    onActivate?.(kind)
    event.preventDefault()
  }
  const moveDrag = event => {
    if (drag.current?.pointerId!==event.pointerId) return
    const {maxX,maxY}=bounds()
    setPosition({
      x:clamp(drag.current.left+event.clientX-drag.current.x,8,maxX),
      y:clamp(drag.current.top+event.clientY-drag.current.y,45,maxY),
    })
    showDockHover(event.clientX,event.clientY)
    showNestedHover(nestedAt(event.clientX,event.clientY))
  }
  const endDrag = event => {
    if (drag.current?.pointerId!==event.pointerId) return
    const destination=event.type==='pointerup'?hostAt(event.clientX,event.clientY):null
    const nested=event.type==='pointerup'?nestedAt(event.clientX,event.clientY):null
    clearDockHover()
    showNestedHover(null)
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId)
    drag.current = null
    if(nested)moveToNested(nested)
    else if(destination)dropInHost(destination,event.clientX)
  }
  const loseCapture = event => {
    if (drag.current?.pointerId===event.pointerId){drag.current=null;clearDockHover();showNestedHover(null)}
  }
  // Dots in the corner also provide direct drag OUT of an already embedded
  // tool. Global listeners survive the React portal moving to document.body.
  const liftDockedGrip=event=>{
    if(!(actuallyDocked||actuallyNested)||event.button!==0)return
    event.stopPropagation();event.preventDefault()
    const pointerId=event.pointerId,startX=event.clientX,startY=event.clientY
    let detached=false
    const move=next=>{
      if(next.pointerId!==pointerId)return
      if(!detached&&Math.hypot(next.clientX-startX,next.clientY-startY)<9)return
      if(!detached){detached=true;positioned.current=true;moveToDock(false);moveToNested(null)}
      setPosition({x:clamp(next.clientX-35,8,Math.max(8,window.innerWidth-300)),
        y:clamp(next.clientY-14,45,Math.max(45,window.innerHeight-140))})
      showDockHover(next.clientX,next.clientY)
      showNestedHover(nestedAt(next.clientX,next.clientY))
    }
    const finish=next=>{
      if(next.pointerId!==pointerId)return
      window.removeEventListener('pointermove',move,true)
      window.removeEventListener('pointerup',finish,true)
      window.removeEventListener('pointercancel',finish,true)
      clearDockHover()
      showNestedHover(null)
      if(detached&&next.type==='pointerup'){
       const target=nestedAt(next.clientX,next.clientY)
       if(target)moveToNested(target)
       else dropInHost(hostAt(next.clientX,next.clientY),next.clientX)
      }
    }
    window.addEventListener('pointermove',move,true)
    window.addEventListener('pointerup',finish,true)
    window.addEventListener('pointercancel',finish,true)
  }
  const appearance=typeof document!=='undefined'?document.querySelector('.app-shell'):null
  const themeVars=['--studio-panel','--studio-sidebar','--studio-text','--studio-muted','--studio-border','--studio-accent','--studio-control','--studio-control-hover','--studio-control-active','--studio-field']
  const themedStyle=appearance?Object.fromEntries(themeVars.map(key=>[key,getComputedStyle(appearance).getPropertyValue(key).trim()]).filter(([,value])=>value)):{}
  return createPortal(<section ref={panel} className={`clo-floating-tool ${active?'is-active':''} ${actuallyDocked?'clo-floating-tool--docked':''} ${actuallyNested?'clo-floating-tool--nested':''}`} role="dialog"
    aria-label={title} data-clo-floating-widget={kind} data-clo-widget-active={String(active)}
    data-docked={String(actuallyDocked)} data-exo-docked-edge={actuallyDocked?dockSide:''} data-embedded-in={actuallyNested?nestedTarget:''}
    style={{...themedStyle,...(actuallyDocked||actuallyNested?{}:{left:position.x,top:position.y})}}
    onPointerDown={event=>{event.stopPropagation();onActivate?.(kind)}}
    onPointerUp={event=>event.stopPropagation()} onClick={event=>event.stopPropagation()}
    onDoubleClick={event=>event.stopPropagation()}
    onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();onClose(kind)}}}>
    <header className="clo-floating-tool-header" onPointerDown={startDrag} onPointerMove={moveDrag}
      onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={loseCapture} aria-label={`Move ${title} panel`}>
      <span className="clo-floating-tool-grip" data-exo-widget-grip="true"
        role="button" tabIndex={0} aria-label={`Drag ${title} widget by dotted handle`}
        title={actuallyDocked||actuallyNested?'Drag dots out onto the canvas':'Drag dots onto a worksheet or the bottom docking bar'}
        onPointerDown={liftDockedGrip}
        onKeyDown={event=>{if((actuallyDocked||actuallyNested)&&(event.key==='Enter'||event.key===' ')){
          event.preventDefault();moveToDock(false);moveToNested(null)
        }}}>⠿</span>
      <strong>{title}</strong>
      {kind==='grading-quick-toolbar'&&<select className="exo-quick-grade-placement"
        aria-label="Grading toolbar placement" title="Embed the toolbar inside a worksheet or keep it floating"
        value={actuallyNested?nestedTarget:actuallyDocked?dockSide:'floating'}
        onPointerDown={event=>event.stopPropagation()} onChange={event=>{
          const target=event.target.value
          if(target==='values'||target==='compare'){moveToNested(target)}
          else {moveToNested(null);moveToDock(target!=='floating',target)}
        }}>
        <option value="floating">Floating</option>
        <option value="values" disabled={!document.querySelector('[data-grade-toolbar-parent="values"][data-exo-grade-toolbar-slot="true"]')}>Inside Grading Table</option>
        <option value="compare" disabled={!document.querySelector('[data-grade-toolbar-parent="compare"][data-exo-grade-toolbar-slot="true"]')}>Inside Compare Length</option>
        {topDockHost&&<option value="top">Top dock · one row</option>}
        {bottomDockHost&&<option value="bottom">Bottom dock</option>}
        {leftDockHost&&<option value="left">Left side · vertical</option>}
        {rightDockHost&&<option value="right">Right side · vertical</option>}
      </select>}
      {dockHosts.length>0&&<button type="button" className="clo-floating-tool-dock-button"
        data-exo-widget-dock-action="true" onClick={()=>{
          if(!actuallyDocked)dropInHost(dockHost||bottomDockHost||topDockHost||leftDockHost||rightDockHost,null)
          else moveToDock(false)
        }}
        title={`${actuallyDocked?'Undock':'Dock'} ${title}`}
        aria-label={`${actuallyDocked?'Undock':'Dock'} ${title}`}>
        {actuallyDocked?<PanelTop size={14}/>:<PanelBottom size={14}/>}</button>}
      <button type="button" onClick={()=>onClose(kind)} title={`Close ${title}`} aria-label={`Close ${title}`}><X size={15}/></button>
    </header>
    {children}
  </section>,actuallyNested?nestedHost:actuallyDocked?dockHost:document.body)
}

function ThresholdField({name, enabled, onEnabled, value, onValue, max, suffix, step}) {
  return <label className="clo-sewing-threshold">
    <span className="clo-threshold-name"><input type="checkbox" checked={enabled}
      onChange={event=>onEnabled(event.target.checked)}/>{name}</span>
    <span className="clo-finishing-number">
      <input type="number" min="0" max={max} step={step} value={value}
        disabled={!enabled} aria-label={`${name} threshold`}
        onChange={event=>{if(event.target.value!=='')onValue(clamp(Number(event.target.value)||0,0,max))}}/>
      <span>{suffix}</span>
    </span>
  </label>
}

function SteamSlider({label,value,onChange,min,max,unit,ticks}) {
  return <label className="clo-steam-row">
    <span className="clo-steam-label">{label}</span>
    <span className="clo-steam-slide">
      <input type="range" aria-label={label} min={min} max={max} step="1" value={value}
        style={{'--steam-progress':`${(value-min)/(max-min)*100}%`}}
        onChange={event=>onChange(Number(event.target.value))}/>
      {ticks&&<span className="clo-steam-ticks"><i>{min>0?'':min}</i><i>+{max}</i></span>}
    </span>
    <span className="clo-finishing-number">
      <input type="number" aria-label={`${label} numeric value`} min={min} max={max}
        step="1" value={value} onChange={event=>{if(event.target.value!=='')onChange(clamp(Number(event.target.value)||0,min,max))}}/>
      <span>{unit}</span>
    </span>
  </label>
}

export default function CloFinishingToolWidgets({openSewing=false,openSteam=false,active=null,
  onClose,onActivate,selection=null,seamRefs=[],seamMeasurements=[],onSelectSeam,legacySeam=null}) {
  const [lengthOn,setLengthOn]=useState(true)
  const [ratioOn,setRatioOn]=useState(true)
  const [lengthThreshold,setLengthThreshold]=useState(.5)
  const [ratioThreshold,setRatioThreshold]=useState(10)
  const [steam,setSteam]=useState({shrinkage:-3,size:130,hardness:70})
  const nativeSewing=selection?.kind==='sewing'?selection:null
  const options={lengthOn,ratioOn,lengthThreshold,ratioThreshold}
  const activeMeasurement=nativeSewing||(
    legacySeam?{seamId:null,first:{length2DCm:legacySeam.lengthA},second:{length2DCm:legacySeam.lengthB}}:null)
  const activeDiagnostic=sewingLengthDiagnostic(activeMeasurement,options)
  const diagnostics=inspectSewingLengths(seamMeasurements,options)
  const firstCm=activeDiagnostic.firstCm,secondCm=activeDiagnostic.secondCm
  const hasPair=activeDiagnostic.valid
  const setSteamValue=(key,value)=>setSteam(current=>({...current,[key]:value}))
  return <>
    <CloFloatingPanel kind="sewing" title="Check Sewing Length" open={openSewing}
      active={active==='sewing'} onClose={onClose} onActivate={onActivate}>
      <div className="clo-floating-tool-body">
        <div className="clo-finishing-inset" aria-label="Sewing length tolerance settings">
          <ThresholdField name="Length Difference" enabled={lengthOn} onEnabled={setLengthOn}
            value={lengthThreshold} onValue={setLengthThreshold} max={100} step={.05} suffix="cm"/>
          <ThresholdField name="Ratio Difference" enabled={ratioOn} onEnabled={setRatioOn}
            value={ratioThreshold} onValue={setRatioThreshold} max={100} step={.5} suffix="%"/>
        </div>
        <div className="clo-finishing-seam-status" role="status">
          {hasPair ? <>
            <span>{nativeSewing?.seamId||'Selected sewing'} · {firstCm.toFixed(2)} / {secondCm.toFixed(2)} cm</span>
            <strong className={activeDiagnostic.warning?'clo-finishing-warning':'clo-finishing-ok'}>
              {activeDiagnostic.signedDifferenceCm>=0?'+':''}{activeDiagnostic.signedDifferenceCm.toFixed(2)} cm · {activeDiagnostic.differencePercent.toFixed(1)}% {activeDiagnostic.warning?'Mismatch':'Within tolerance'}
            </strong>
          </> : <span>{seamRefs.length? 'Select a seam to inspect its measured lengths':'No sewn edge pair selected'}</span>}
        </div>
        {seamRefs.length>0&&<select className="clo-finishing-seam-selector" aria-label="Inspect sewing relationship"
          value={nativeSewing?.seamId||''} onChange={event=>onSelectSeam?.(event.target.value)}>
          <option value="">Select sewn edges…</option>
          {seamRefs.map(seam=><option key={seam.id} value={seam.id}>{seam.id} · {seam.first} / {seam.second}</option>)}
        </select>}
        {seamMeasurements.length>0&&<div className="clo-finishing-seam-review" data-native-sewing-length-review="true" aria-label="All native sewing length differences">
          <div className="clo-finishing-seam-overview" role="status">
            <strong>{diagnostics.warnings} over tolerance</strong>
            <span>{diagnostics.measured}/{diagnostics.total} measured{diagnostics.unavailable? ` · ${diagnostics.unavailable} unavailable`:''}</span>
          </div>
          <div className="clo-finishing-seam-pairs" role="list">
            {diagnostics.rows.map(row=><button type="button" key={row.seamId} role="listitem"
              data-sew-length-state={!row.valid?'unavailable':row.warning?'warning':'within-tolerance'}
              aria-pressed={nativeSewing?.seamId===row.seamId}
              onClick={()=>onSelectSeam?.(row.seamId)}>
              <span className="clo-finishing-seam-pair-name">{row.seamId}</span>
              <span className="clo-finishing-seam-pair-values">{row.valid?
                `${row.firstCm.toFixed(2)} / ${row.secondCm.toFixed(2)} cm`:'Measurement unavailable'}</span>
              <strong>{row.valid?`${row.signedDifferenceCm>=0?'+':''}${row.signedDifferenceCm.toFixed(2)} cm · ${row.differencePercent.toFixed(1)}%`:'—'}</strong>
            </button>)}
          </div>
          <small>Measured along the native 2D sewing intervals. The signed difference is first minus second; percent difference uses the longer edge. The 3D draped lengths remain independent in Sewing Properties.</small>
        </div>}
      </div>
    </CloFloatingPanel>
    <CloFloatingPanel kind="steam" title="Steam Brush" open={openSteam}
      active={active==='steam'} onClose={onClose} onActivate={onActivate}>
      <div className="clo-floating-tool-body">
        <div className="clo-finishing-inset" aria-label="Steam brush parameters">
          <SteamSlider label="Shrinkage" value={steam.shrinkage} onChange={value=>setSteamValue('shrinkage',value)}
            min={-100} max={100} unit="%" ticks/>
          <SteamSlider label="Size" value={steam.size} onChange={value=>setSteamValue('size',value)}
            min={10} max={300} unit="mm"/>
          <SteamSlider label="Hardness" value={steam.hardness} onChange={value=>setSteamValue('hardness',value)}
            min={0} max={100} unit="%"/>
        </div>
        <div className="clo-steam-footer">
          <button type="button" aria-label="Reset steam brush settings" title="Reset to CLO reference values"
            onClick={()=>setSteam({shrinkage:-3,size:130,hardness:70})}><CornerUpLeft size={15}/></button>
          <span>Brush settings preview · cloth steam simulation unavailable</span>
        </div>
      </div>
    </CloFloatingPanel>
  </>
}
