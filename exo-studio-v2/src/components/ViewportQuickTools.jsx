import React, {useEffect, useId, useRef, useState} from 'react'
import {flushSync} from 'react-dom'
import CadToolIcon from './CadToolIcon.jsx'
import {Combine,PanelLeftClose} from 'lucide-react'
import {PenAnchorIcon,PEN_ANCHOR_TOOLS,PEN_HOLD_MS} from './PenAnchorToolIcons.jsx'
import './ViewportQuickTools.css'

// Original Garment Studio CAD SVGs, arranged as compact CLO-inspired tool
// families. Each icon runs the real editor command; hovering or focusing its
// flyout reveals alternative actions from the same family.
const TOOLS = {
  '2d': [
    { name: 'select', label: 'Select / Transform', icon: 'select-2d', options: ['select', 'point', 'split'] },
    { name: 'point', label: 'Edit Pattern Points', icon: 'points', options: ['point', 'curve', 'split'] },
    { name: 'curve', label: 'Edit Curve Point', icon: 'curve', options: ['curve', 'point', 'split'] },
    { name: 'shape-builder', label: 'Shape Builder · Join / Subtract / Intersect', icon: 'polygon-tool', options: ['shape-builder'] },
    { name: 'direct-select', label: 'Direct Selection · A', icon: 'points', options: ['direct-select'] },
    { name: 'vector-pen', label: 'Pen / Pencil · hold for drawing alternatives', icon: 'polygon-tool', options: PEN_ANCHOR_TOOLS.filter(tool=>tool.id!=='direct-select').map(tool=>tool.id) },
    { name: 'polygon', label: 'Draw Pattern Polygon', icon: 'polygon-tool', options: ['polygon'] },
    { name: 'sew', label: 'Edit Sewing', icon: 'sew', options: ['sew', 'notch', 'allowance', 'fastener'] },
    { name: 'notch', label: 'Notches / Seam Allowance', icon: 'notch', options: ['notch', 'allowance'] },
    { name: 'internal', label: 'Internal Line / Dart', icon: 'internal', options: ['internal', 'dart', 'pin', 'measure'] },
    { name: 'measure', label: 'Measure', icon: 'measure', options: ['measure', 'notch', 'allowance', 'pin'] },
  ],
  '3d': [
    { name: 'orbit', label: 'Orbit Camera', icon: 'camera', options: ['orbit', 'hand'] },
    { name: 'transform', label: 'Select / Move', icon: 'select-3d', options: ['transform', 'move', 'rotate'] },
    { name: 'move', label: 'Move Garment', icon: 'move-3d', options: ['move', 'transform'] },
    { name: 'rotate', label: 'Rotate Garment', icon: 'rotate-3d', options: ['rotate', 'transform'] },
    { name: 'hand', label: 'Fabric Hand', icon: 'hand', options: ['hand', 'orbit'] },
  ],
}

const LABELS = {
  select: 'Select / Transform', point: 'Edit Points', split: 'Add Anchor Point Tool', polygon: 'Draw Polygon',
  curve: 'Edit Curve Point', 'shape-builder':'Shape Builder · combine patterns', sew: 'Free Sewing', notch: 'Add Notch', allowance: 'Seam Allowance',
  fastener: 'Fastener', internal: 'Internal Line', dart: 'Physical Dart (Cut + Sew)', pin: 'Pin',
  'vector-pen':'Pen Tool', 'vector-pencil':'VectorCraft Pencil · Freehand', measure: 'Measure', orbit: 'Orbit', transform: 'Select / Move',
  'anchor-point':'Anchor Point Tool', 'direct-select':'Direct Selection · A', 'remove-anchor':'Delete Anchor Point Tool',
  move: 'Move', rotate: 'Rotate', hand: 'Fabric Hand',
}
const ICONS = {
  select: 'select-2d', point: 'points', split: 'split', curve: 'curve', 'shape-builder':'polygon-tool', polygon: 'polygon-tool',
  'vector-pen':'polygon-tool', 'vector-pencil':'curve', 'anchor-point':'points', 'direct-select':'points', 'remove-anchor':'points',
  sew: 'sew', notch: 'notch', allowance: 'seam-links', fastener: 'fastener', internal: 'internal',
  dart: 'internal', pin: 'pin', measure: 'measure', orbit: 'camera', transform: 'select-3d',
  move: 'move-3d', rotate: 'rotate-3d', hand: 'hand',
}

export default function ViewportQuickTools({ dimension, activeTool, onChangeTool, availableTools, disabled = false, extraGroup = null, onCollapse3D }) {
  const [selectedByFamily, setSelectedByFamily] = useState({})
  const [lastChosenFamily, setLastChosenFamily] = useState(null)
  const [touchOpenFamily, setTouchOpenFamily] = useState(null)
  const [dismissedFamily, setDismissedFamily] = useState(null)
  const [hoveredFamily, setHoveredFamily] = useState(null)
  const [focusedFamily, setFocusedFamily] = useState(null)
  const railRef = useRef(null)
  const menuId = useId()
  const touchPointer = useRef(false)
  const holdTimer = useRef(null)
  const swallowHeldClick = useRef(null)
  const clearHold = () => { if(holdTimer.current!==null)clearTimeout(holdTimer.current);holdTimer.current=null }
  useEffect(()=>()=>clearHold(),[])
  const usable = name => !disabled && (!availableTools || availableTools.includes(name))
  useEffect(() => {
    if (!touchOpenFamily) return
    const closeOutside = event => {
      if (railRef.current?.contains(event.target)) return
      setTouchOpenFamily(null)
      setDismissedFamily(touchOpenFamily)
    }
    document.addEventListener('pointerdown', closeOutside, true)
    return () => document.removeEventListener('pointerdown', closeOutside, true)
  }, [touchOpenFamily])
  const choose = (family, name) => {
    if (!usable(name)) return
    setSelectedByFamily(previous => ({...previous, [family]:name}))
    setLastChosenFamily(family)
    setTouchOpenFamily(null)
    setDismissedFamily(family)
    onChangeTool?.(name)
  }
  useEffect(()=>{
    const release=event=>{
      if(swallowHeldClick.current!=='vector-pen'||touchOpenFamily!=='vector-pen')return
      const item=document.elementFromPoint(event.clientX,event.clientY)?.closest?.('[data-tool-family="vector-pen"] .clo-corner-tool-options [data-tool]')
      if(!item||!railRef.current?.contains(item))return
      const name=item.dataset.tool
      if(!PEN_ANCHOR_TOOLS.some(tool=>tool.id===name))return
      choose('vector-pen',name)
    }
    window.addEventListener('pointerup',release)
    return()=>window.removeEventListener('pointerup',release)
  },[touchOpenFamily,disabled,onChangeTool])
  const handleFamilyKeys = (event, family) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      setTouchOpenFamily(null)
      setDismissedFamily(family)
      // Return keyboard focus to the owning family button when its flyout
      // closes, matching a conventional menu while keeping Escape usable.
      event.currentTarget.querySelector(':scope > button')?.focus()
    }
    if (event.key === 'ArrowRight' && event.target === event.currentTarget.firstElementChild) {
      event.preventDefault()
      // A previously dismissed group needs to become visible again before
      // its first alternative can receive focus.
      flushSync(() => { setDismissedFamily(null); setFocusedFamily(family); if(family==='vector-pen')setTouchOpenFamily(family) })
      event.currentTarget.querySelector('.clo-corner-tool-options > button:not(:disabled)')?.focus()
    }
    if (['ArrowRight','ArrowLeft','ArrowDown','ArrowUp','Home','End'].includes(event.key) && event.target.closest?.('.clo-corner-tool-options')) {
      const buttons = [...event.currentTarget.querySelectorAll('.clo-corner-tool-options > button:not(:disabled)')]
      if (!buttons.length) return
      const index = buttons.indexOf(event.target)
      event.preventDefault()
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 :
        (index + (['ArrowRight','ArrowDown'].includes(event.key) ? 1 : -1) + buttons.length) % buttons.length
      buttons[next]?.focus()
    }
    if (['ArrowDown','ArrowUp'].includes(event.key) && event.target === event.currentTarget.firstElementChild) {
      const mains = [...railRef.current.querySelectorAll(':scope > .clo-corner-tool-group > button:not(:disabled)')]
      const index = mains.indexOf(event.target)
      if (index < 0 || !mains.length) return
      event.preventDefault()
      mains[(index + (event.key === 'ArrowDown' ? 1 : -1) + mains.length) % mains.length].focus()
    }
  }
  const families=(TOOLS[dimension] || []).filter(group => !availableTools || availableTools.includes(group.name))
  // The parent editor is authoritative: an external tool switch must update
  // the highlighted quick tool even when this rail last showed another option.
  // Pick one family so e.g. Point/Curve/Select don't all glow for the same tool.
  const owner=families.find(group=>group.name===lastChosenFamily &&
    selectedByFamily[group.name]===activeTool) ||
    families.find(group=>group.name===activeTool) ||
    families.find(group=>group.options.includes(activeTool))
  return (
    <div ref={railRef} className={`canvas-tool-flyouts clo-corner-toolkit clo-corner-toolkit-${dimension} exo-viewport-inline-tools`} aria-label={`${dimension.toUpperCase()} viewport quick tools`} role="toolbar" aria-orientation="vertical">
      {families.map((group) => {
        const remembered=selectedByFamily[group.name]
        const chosen = owner?.name===group.name ? activeTool :
          remembered && usable(remembered) ? remembered : group.name
        const active = owner?.name===group.name && chosen === activeTool
        const expanded = dismissedFamily !== group.name && (group.name==='vector-pen'
          ? touchOpenFamily === group.name
          : touchOpenFamily === group.name || hoveredFamily === group.name || focusedFamily === group.name)
        const optionsId=`${menuId}-${dimension}-${group.name}`
        return <div className="canvas-tool-group clo-corner-tool-group" key={group.name}
          data-tool-family={group.name} data-current-tool={chosen} data-touch-open={String(touchOpenFamily === group.name)} data-dismissed={String(dismissedFamily === group.name)}
          onPointerEnter={event => {
            if(event.pointerType==='touch')return
            setHoveredFamily(group.name)
            setDismissedFamily(previous => previous === group.name ? null : previous)
          }}
            onPointerLeave={event => {if(event.pointerType!=='touch')setHoveredFamily(previous=>previous===group.name?null:previous);if(group.name==='vector-pen')clearHold()}}
          onFocusCapture={()=>setFocusedFamily(group.name)}
          onBlurCapture={event=>{
            if(!event.currentTarget.contains(event.relatedTarget))
              setFocusedFamily(previous=>previous===group.name?null:previous)
          }}
          onKeyDown={event => handleFamilyKeys(event, group.name)}>
          <button
            type="button"
            aria-label={`${group.label}${chosen !== group.name ? ` · ${LABELS[chosen]}` : ''}`}
            title={`${group.label}${chosen !== group.name ? ` · ${LABELS[chosen]}` : ''}`}
            aria-pressed={active}
            aria-expanded={expanded}
            aria-controls={optionsId}
            aria-haspopup={group.name==='vector-pen' ? 'true' : undefined}
            className={active ? 'active' : ''}
            disabled={!usable(chosen)}
            onPointerDown={event => {
              touchPointer.current = event.pointerType === 'touch'
              swallowHeldClick.current=null
              if(group.name==='vector-pen' && event.button===0){
                try{event.currentTarget.releasePointerCapture(event.pointerId)}catch{}
                clearHold()
                holdTimer.current=setTimeout(()=>{
                  swallowHeldClick.current=group.name
                  setTouchOpenFamily(group.name)
                  setDismissedFamily(null)
                },PEN_HOLD_MS)
              }
              if (touchPointer.current) {
                const closing = touchOpenFamily === group.name
                if(group.name!=='vector-pen')setTouchOpenFamily(closing ? null : group.name)
                // Mobile browsers can preserve :hover after a tap. Explicitly
                // dismiss a closed touch menu so it cannot reappear as a ghost.
                if(group.name!=='vector-pen')setDismissedFamily(closing ? group.name : null)
              } else setDismissedFamily(null)
            }}
            onPointerUp={clearHold}
            onPointerCancel={clearHold}
            onClick={event => {
              if(swallowHeldClick.current===group.name){
                swallowHeldClick.current=null
                touchPointer.current=false
                return
              }
              if(touchPointer.current){
                touchPointer.current=false
                if(group.name==='vector-pen'){setTouchOpenFamily(group.name);setDismissedFamily(null)}
                return
              }
              choose(group.name, chosen)
              event.currentTarget.blur()
            }}
          >
            {group.name==='vector-pen'||group.name==='direct-select'?<PenAnchorIcon tool={chosen} size={22}/>:
              group.name==='shape-builder'?<Combine size={21} aria-hidden="true"/>:
              <CadToolIcon id={ICONS[chosen] || group.icon} size={21}/>}
            {group.options.length>1&&<span className="clo-corner-flyout-caret" aria-hidden="true" />}
          </button>
          {group.options.length>1&&<div id={optionsId} className="canvas-tool-options clo-corner-tool-options" role={group.name==='vector-pen'?'menu':'group'} aria-label={`${group.label} alternatives`}>
            {group.options.map((name) => (
              <button key={name} data-tool={group.name==='vector-pen'?name:undefined} type="button" disabled={!usable(name)} className={activeTool === name ? 'active' : ''}
                role={group.name==='vector-pen'?'menuitemradio':undefined} aria-checked={group.name==='vector-pen'?activeTool===name:undefined}
                aria-pressed={group.name==='vector-pen'?undefined:activeTool===name} aria-label={LABELS[name]} title={usable(name) ? LABELS[name] : `${LABELS[name]} (available in full Garment Studio)`} onClick={event => {choose(group.name, name);event.currentTarget.blur()}}>
                {group.name==='vector-pen'?<PenAnchorIcon tool={name} size={21}/>:<CadToolIcon id={ICONS[name]} size={19}/>}
                <span className="clo-corner-option-label">{LABELS[name]}</span>
                {group.name==='vector-pen'&&<kbd>{PEN_ANCHOR_TOOLS.find(tool=>tool.id===name)?.shortcut}</kbd>}
              </button>
            ))}
          </div>}
        </div>
      })}
      {dimension === '3d' && onCollapse3D && <div className="canvas-tool-group clo-corner-tool-group cc-collapse-3d-host" data-tool-family="collapse-3d">
        <button type="button" aria-label="Collapse 3D viewer for full-width 2D patterns" title="Collapse 3D · expand 2D patterns" onClick={onCollapse3D}>
          <PanelLeftClose size={20} aria-hidden="true"/>
        </button>
      </div>}
      {extraGroup}
    </div>
  )
}
