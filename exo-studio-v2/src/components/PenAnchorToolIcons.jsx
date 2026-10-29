import React from 'react'

// The original reference's two toolbar symbols, redrawn as native React SVG.
// These select Rust-backed authoring tools; no demo drawing canvas is mounted.
export const PEN_ANCHOR_TOOLS=Object.freeze([
  {id:'vector-pen',label:'Pen Tool',shortcut:'P'},
  {id:'vector-pencil',label:'Pencil Tool',shortcut:'B'},
  {id:'anchor-point',label:'Anchor Point Tool',shortcut:'Shift+C'},
  {id:'direct-select',label:'Direct Selection Tool',shortcut:'A'},
  {id:'split',label:'Add Anchor Point Tool',shortcut:'+'},
  {id:'remove-anchor',label:'Delete Anchor Point Tool',shortcut:'−'},
])
export const PEN_HOLD_MS=350

export function PenAnchorIcon({tool='vector-pen',size=24}){
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
    {tool==='split'||tool==='remove-anchor'?<>
      <path d="M3.8 18.5 12 5.5 20.2 18.5"/>
      <rect x="10.5" y="3.8" width="3" height="3" fill="currentColor" stroke="none"/>
      <path d={tool==='split'?'M13.5 14h8 M17.5 10v8':'M13.5 14h8'}
        stroke="#183144" strokeWidth="4.6"/>
      <path data-pen-add-remove-symbol={tool==='split'?'plus':'minus'}
        d={tool==='split'?'M13.5 14h8 M17.5 10v8':'M13.5 14h8'}
        stroke="#ffffff" strokeWidth="2.6"/>
    </>:tool==='direct-select'?<>
      <path d="M5 3 L7 20 L11.1 14.5 L17.2 14.5 Z" fill="currentColor" stroke="none"/>
      <path d="M12 7.5H20M16 3.5V11.5" opacity=".7"/>
    </>:tool==='anchor-point'?<>
      <path d="M4.5 18 12 8 19.5 18"/>
      <rect x="10.2" y="6.2" width="3.6" height="3.6" fill="currentColor" stroke="none"/>
      <path d="M4 21.2H8 M16 21.2H20" opacity=".55"/>
    </>:<>
      <path d="M12 2.8 17.4 8.6 15.2 14.6 12 17.4 8.8 14.6 6.6 8.6Z"/>
      <path d="M12 10.8V17.4"/>
      <circle cx="12" cy="9.4" r="1.4" fill="currentColor" stroke="none"/>
      <path d="M8.4 20.4H15.6"/>
    </>}
  </svg>
}
