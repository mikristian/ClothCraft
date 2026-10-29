import {initializeRustLabelLayoutKernel,rustPlacePatternLabel} from './rustLabelLayoutKernel.js'

// Annotation layout is view-only. All coordinates are material-space SVG units.
// The module starts loading immediately and remains synchronous for every caller.
if(typeof window!=='undefined')void initializeRustLabelLayoutKernel()
// Snapshot only explicitly stored numeric coordinates. Reading array indexes
// directly would invoke accessors or accept inherited values from imports.
function finiteFrameTuple(value,size) {
  if(!Array.isArray(value)||value.length!==size)return null
  const tuple=[]
  for(let i=0;i<size;i++){
    const descriptor=Object.getOwnPropertyDescriptor(value,String(i))
    if(!descriptor||!Object.hasOwn(descriptor,'value')||!Number.isFinite(descriptor.value))return null
    tuple.push(descriptor.value)
  }
  return tuple
}
export function placePatternLabel(midpoint,normal,text,screenUnit,points,bounds) {
  // A corrupt view frame must never produce NaN/Infinity SVG annotation
  // positions. Validate before invoking either the Rust or JS layout path.
  // Array#every skips holes. Check both components explicitly so a sparse
  // preview frame cannot produce NaN coordinates in exported SVG labels.
  const safeMidpoint=finiteFrameTuple(midpoint,2)
  const safeNormal=finiteFrameTuple(normal,2)
  const safeBounds=finiteFrameTuple(bounds,4)
  if(!safeMidpoint||!safeNormal||!safeBounds||
    !Number.isFinite(screenUnit)||screenUnit<=0||
    safeBounds[2]<=0||safeBounds[3]<=0||
    !Number.isFinite(safeBounds[0]+safeBounds[2])||!Number.isFinite(safeBounds[1]+safeBounds[3]))
    throw new RangeError('Invalid 2D annotation layout frame')
  const width=Math.max(48,String(text).length*6)*screenUnit,height=13*screenUnit
  if(!Number.isFinite(width)||width<=0||!Number.isFinite(height)||height<=0)
    throw new RangeError('2D annotation label dimensions overflow')
  // Obstacle coordinates come from view transforms, not certified pattern
  // geometry. Ignore malformed preview points without mutating their source;
  // use the identical finite set for WASM and JS collision placement.
  const obstacles=Array.isArray(points)?points.filter(p=>Array.isArray(p)&&p.length>=2&&
    Number.isFinite(p[0])&&Number.isFinite(p[1])):[]
  const native=rustPlacePatternLabel(safeMidpoint,safeNormal,width,height,screenUnit,obstacles,safeBounds)
  if(native)return native
  const [left,top,w,h]=safeBounds
  const candidates=[]
  for(const distance of [20,36,54,76])for(const sign of [1,-1]){
    const x=Math.max(left+width/2+4*screenUnit,Math.min(left+w-width/2-4*screenUnit,safeMidpoint[0]+safeNormal[0]*distance*screenUnit*sign))
    const y=Math.max(top+height+30*screenUnit,Math.min(top+h-8*screenUnit,safeMidpoint[1]+safeNormal[1]*distance*screenUnit*sign))
    const box={left:x-width/2,right:x+width/2,top:y-height,bottom:y+3*screenUnit}
    const collisions=obstacles.filter(p=>p[0]+7*screenUnit>box.left&&p[0]-7*screenUnit<box.right&&p[1]+7*screenUnit>box.top&&p[1]-7*screenUnit<box.bottom).length
    candidates.push({x,y,box,collisions})
    if(!collisions)return candidates.at(-1)
  }
  return candidates.sort((a,b)=>a.collisions-b.collisions)[0]
}
