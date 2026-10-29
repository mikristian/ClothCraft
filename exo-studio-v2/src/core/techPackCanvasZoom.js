export const TECHPACK_ZOOM_STEPS=[.5,.75,1,1.25,1.5,1.75,2,2.25,2.5]

export function resolvedTechPackZoom(zoom,canvasWidth=900,landscape=false){
  if(zoom==='fit')return Math.max(.5,Math.min(2.5,(Number(canvasWidth)-96)/(landscape?792:612)))
  const number=Number(zoom)
  return Number.isFinite(number)?Math.max(.5,Math.min(2.5,number)):1
}

export function nextTechPackZoom(current,direction,canvasWidth=900,landscape=false){
  if(direction==='reset')return '1'
  if(direction==='fit')return 'fit'
  const value=resolvedTechPackZoom(current,canvasWidth,landscape)
  const values=TECHPACK_ZOOM_STEPS
  const selected=direction==='in'?values.find(step=>step>value+.001):[...values].reverse().find(step=>step<value-.001)
  return String(selected??(direction==='in'?values[values.length-1]:values[0]))
}

export function techPackZoomKey(event){
  if(!(event.metaKey||event.ctrlKey)||event.altKey||event.repeat)return null
  if(event.target?.closest?.('input,textarea,select,[contenteditable="true"]'))return null
  if(event.code==='Equal'||event.code==='NumpadAdd'||['+','='].includes(event.key))return 'in'
  if(event.code==='Minus'||event.code==='NumpadSubtract'||['-','_'].includes(event.key))return 'out'
  if(event.code==='Digit0'||event.key==='0')return 'reset'
  return null
}
