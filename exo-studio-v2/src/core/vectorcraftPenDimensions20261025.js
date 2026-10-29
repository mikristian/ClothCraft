import {cubicAt,cubicLength} from './vectorPatternBezier.js'

// Board and Rust garment geometry use metres; the numeric Pen inspector may
// display a different unit without changing the authored geometry.
export const PEN_LENGTH_UNITS = Object.freeze({mm: .001, cm: .01, m: 1, in: .0254})
// The shown length is the authored length. Quantize only the provisional Pen
// chord (not committed cutlines or existing Bézier geometry), so clicking while
// the CLO-style readout says 28.00 in authors exactly 28.00 inches.
export const PEN_UNIT_DECIMALS=Object.freeze({mm:1,cm:2,in:2,m:3})

// The Pen inspector authors decimal measurements, not JavaScript literals such
// as 0x64 / 0b10 or coercible arrays. Keep decimal exponent input supported.
const decimalPenNumber = value => {
  if (value == null) return null
  if (typeof value !== 'string' && typeof value !== 'number') return NaN
  const raw = String(value).trim()
  if (!raw) return null
  return /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(raw) ? Number(raw) : NaN
}

export function parsePenDimension(value, unit = 'mm') {
  if (!Object.hasOwn(PEN_LENGTH_UNITS, unit)) throw new Error('Select a supported measurement unit')
  const number = decimalPenNumber(value)
  if (number === null) return null
  if (!Number.isFinite(number) || number <= 0 || number * PEN_LENGTH_UNITS[unit] > 100)
    throw new Error('Enter a positive edge length of at most 100 metres')
  return number * PEN_LENGTH_UNITS[unit]
}

export function convertPenDimension(value, oldUnit, newUnit) {
  if (String(value ?? '').trim() === '') return ''
  const metres = parsePenDimension(value, oldUnit)
  if (!Object.hasOwn(PEN_LENGTH_UNITS, newUnit)) throw new Error('Select a supported measurement unit')
  return String(Number((metres / PEN_LENGTH_UNITS[newUnit]).toPrecision(12)))
}

export function parsePenAngle(value) {
  const number = decimalPenNumber(value)
  if (number === null) return null
  if (!Number.isFinite(number) || Math.abs(number) > 360000)
    throw new Error('Enter a finite angle in degrees')
  return number
}

// 0 degrees points right, 90 degrees points downward on the 2D SVG.
// When the angle is blank, the cursor (or previous edge) determines direction.
// When the length is blank, the existing cursor distance is preserved.
export function dimensionedPenPoint(anchor, cursor, {length = '', angle = '', unit = 'mm'} = {}) {
  if (!Array.isArray(anchor) || !Array.isArray(cursor) ||
    ![...anchor, ...cursor].every(Number.isFinite)) throw new Error('A finite anchor and direction are required')
  const metres = parsePenDimension(length, unit)
  const degrees = parsePenAngle(angle)
  const dx = cursor[0] - anchor[0], dy = cursor[1] - anchor[1]
  const originalLength = Math.hypot(dx, dy)
  const distance = metres ?? originalLength
  if (!(distance > 0)) throw new Error('Move the pointer or enter an edge length')
  const direction = degrees === null ? Math.atan2(dy, dx) : degrees * Math.PI / 180
  return [anchor[0] + distance * Math.cos(direction), anchor[1] + distance * Math.sin(direction)]
}

export function penDraftSegmentMetrics(points, tangents = []) {
  if (!Array.isArray(points)) return []
  return points.slice(1).map((b, index) => {
    const a = points[index]
    if (![a, b].every(p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite))) return null
    const outgoing = tangents[index] || [0, 0]
    const incoming = tangents[index + 1] || [0, 0]
    const chord = Math.hypot(b[0] - a[0], b[1] - a[1])
    const curved = Math.hypot(...outgoing) > 1e-9 || Math.hypot(...incoming) > 1e-9
    const length = curved ? cubicLength(a,
      [a[0] + outgoing[0], a[1] + outgoing[1]],
      [b[0] - incoming[0], b[1] - incoming[1]], b) : chord
    return {index, a, b, chord, length, curved,
      midpoint: curved ? cubicAt(a,
        [a[0]+outgoing[0],a[1]+outgoing[1]],
        [b[0]-incoming[0],b[1]-incoming[1]],b,.5)
        :[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
      angleDeg: Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI}
  }).filter(Boolean)
}

// The guide and internal-line renderers already sample their visible curves.
// Locate the dimension at half *arc length*, not the middle sample or chord.
export function sampledPenLineMetrics(points) {
  if (!Array.isArray(points) || points.length < 2 ||
      !points.every(p=>Array.isArray(p) && p.length===2 && p.every(Number.isFinite))) return null
  const segments=[]
  let length=0
  for (let i=1;i<points.length;i++) {
    const a=points[i-1],b=points[i]
    const distance=Math.hypot(b[0]-a[0],b[1]-a[1])
    if(!Number.isFinite(distance))return null
    if(distance>1e-12){segments.push({a,b,distance});length+=distance}
  }
  if(!Number.isFinite(length)||length<=1e-12)return null
  let remaining=length/2
  for(const segment of segments){
    if(remaining>segment.distance){remaining-=segment.distance;continue}
    const t=remaining/segment.distance
    const dx=(segment.b[0]-segment.a[0])/segment.distance
    const dy=(segment.b[1]-segment.a[1])/segment.distance
    return {length,midpoint:[segment.a[0]+t*(segment.b[0]-segment.a[0]),
      segment.a[1]+t*(segment.b[1]-segment.a[1])],normal:[-dy,dx]}
  }
  return null
}

/** A small, screen-consistent measurement below the actual line/curve.
 * Return physical SVG coordinates; caller supplies metres per CSS pixel.
 * A stable downward offset avoids the rotating pop-up that obstructed Pen.
 */
export function penInlineLabelPoint(a,b,screenUnit,{controls=null,belowPixels=13}={}) {
  if(![a,b].every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite))||
    !Number.isFinite(screenUnit)||screenUnit<=0||
    !Number.isFinite(belowPixels)||belowPixels<0)return null
  let midpoint=a.map((value,i)=>(value+b[i])/2)
  if(controls!==null){
    if(!Array.isArray(controls)||controls.length!==2||
      !controls.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)))return null
    midpoint=cubicAt(a,controls[0],controls[1],b,.5)
  }
  return {x:midpoint[0],y:midpoint[1]+belowPixels*screenUnit}
}

export function penPreviewAtDisplayedLength(anchor,cursor,unit='mm') {
  if(!Object.hasOwn(PEN_LENGTH_UNITS,unit)||!Array.isArray(anchor)||!Array.isArray(cursor)||
    anchor.length!==2||cursor.length!==2||![...anchor,...cursor].every(Number.isFinite))return null
  const dx=cursor[0]-anchor[0],dy=cursor[1]-anchor[1],distance=Math.hypot(dx,dy)
  if(distance<=1e-12)return [...anchor]
  const digits=PEN_UNIT_DECIMALS[unit],scale=PEN_LENGTH_UNITS[unit]
  const units=Number((distance/scale).toFixed(digits))
  const measured=units*scale
  return [anchor[0]+dx/distance*measured,anchor[1]+dy/distance*measured]
}

export function formatPenDistancePrecise(metres,unit='mm') {
  if(!Number.isFinite(metres)||!Object.hasOwn(PEN_LENGTH_UNITS,unit))return '—'
  return `${(metres/PEN_LENGTH_UNITS[unit]).toFixed(PEN_UNIT_DECIMALS[unit])} ${unit}`
}

export function formatPenDistance(metres, unit = 'mm') {
  const conversion = PEN_LENGTH_UNITS[unit] || PEN_LENGTH_UNITS.mm
  return `${(metres / conversion).toFixed(unit === 'm' ? 3 : 1)} ${unit}`
}
