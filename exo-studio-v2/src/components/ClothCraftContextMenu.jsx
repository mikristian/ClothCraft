import React, {useEffect, useRef} from 'react'
import {createPortal} from 'react-dom'
import './ClothCraftContextMenu.css'

/** Native-editor-style contextual actions for the linked Rust garment views.
 * Uses an app-owned menu, never browser-specific/proprietary CLO assets. */
export default function ClothCraftContextMenu({context, items=[], onChoose, onClose}) {
  const menuRef = useRef(null)
  useEffect(() => {
    if (!context) return undefined
    const closeOnPointer = event => {
      if (!menuRef.current?.contains(event.target)) onClose()
    }
    const closeOnKey = event => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onClose()
      }
    }
    const closeOnScroll = () => onClose()
    document.addEventListener('pointerdown', closeOnPointer, true)
    window.addEventListener('keydown', closeOnKey, true)
    window.addEventListener('scroll', closeOnScroll, true)
    return () => {
      document.removeEventListener('pointerdown', closeOnPointer, true)
      window.removeEventListener('keydown', closeOnKey, true)
      window.removeEventListener('scroll', closeOnScroll, true)
    }
  }, [context, onClose])
  useEffect(() => {
    if (context) menuRef.current?.querySelector('button:not(:disabled)')?.focus({preventScroll:true})
  }, [context])
  if (!context) return null
  const width=278
  // Menus can include several native seam operations. Reserve enough height
  // for button rows, section dividers, title and padding before clamping.
  // The CSS also scrolls very tall menus on short screens.
  const height=Math.min(window.innerHeight - 16, 66 + items.length * 43)
  // Browser events normally provide both coordinates. Keyboard-initiated or
  // programmatically forwarded context-menu actions may not; never render an
  // otherwise valid menu at an unusable NaN/off-screen position.
  const requestedX=Number.isFinite(context.x)?context.x:window.innerWidth/2
  const requestedY=Number.isFinite(context.y)?context.y:window.innerHeight/2
  const x=Math.max(8,Math.min(requestedX,window.innerWidth-width-8))
  const y=Math.max(8,Math.min(requestedY,window.innerHeight-height-8))
  return createPortal(<div ref={menuRef} className="cc-native-context-menu"
    style={{left:x,top:y}} role="menu" aria-label={context.dimension === '2d' ? '2D pattern context actions' : '3D garment context actions'}
    onContextMenu={event=>event.preventDefault()}
    onKeyDown={event=>{
      if(event.key !== 'ArrowDown' && event.key !== 'ArrowUp')return
      event.preventDefault()
      const enabled=[...menuRef.current.querySelectorAll('button:not(:disabled)')]
      const index=enabled.indexOf(document.activeElement)
      enabled[(index + (event.key==='ArrowDown'?1:enabled.length-1)) % enabled.length]?.focus()
    }}>
    <div className="cc-native-context-title">{context.dimension.toUpperCase()} {context.hit?.panel ? '· '+context.hit.panel : '· Viewport'}</div>
    {items.map((item,i)=>item.separator
      ? <div key={'sep'+i} role="separator" className="cc-native-context-divider"/>
      : <button type="button" role="menuitem" key={item.id}
        disabled={item.disabled} title={item.title||undefined}
        className={item.danger?'danger':''}
        onClick={()=>{onClose();onChoose(item.id,context)}}>
        <span>{item.label}</span>{item.shortcut&&<kbd>{item.shortcut}</kbd>}
      </button>)}
  </div>,document.body)
}
