// Stable ~12 screen-pixel transform boxes in either centimetre SVG or native
// metre SVG. Never use physical garment centimetres for clickable handle size:
// a 10-cm handle covers large sections of a 2D pattern at normal fit zoom.
const positions=[
  ['nw',0,0],['n',.5,0],['ne',1,0],
  ['w',0,.5],['e',1,.5],
  ['sw',0,1],['s',.5,1],['se',1,1],
]
export function referenceImageResizeHandles20261029({x,y,width,height,worldUnitsPerPixel}) {
  if (![x,y,width,height,worldUnitsPerPixel].every(Number.isFinite) ||
      width<=0||height<=0||worldUnitsPerPixel<=0) return []
  const side=12*worldUnitsPerPixel
  return positions.map(([handle,hx,hy])=>({
    handle,
    x:x+width*hx-side/2,
    y:y+height*hy-side/2,
    width:side,height:side,
  }))
}
