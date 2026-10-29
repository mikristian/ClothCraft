// Visual 2D pattern reference guides, derived from true native cutlines.
// All coordinates are material metres and are never written to garment data.
import {horizontalPatternSpans,verticalPatternSpans} from './clothcraft2dGeometry.js'
import {rustMaterialGuideSpans} from './rustMaterialGuideKernel.js'

const EPSILON=1e-3

/** Use the actual sewn underarm/side corners for the chest construction bar,
 * instead of placing a second set of endpoints centimetres below those
 * already-authored pattern vertices. Side edge direction may be reversed.
 * Only use this exact anatomical landmark when the two corners are level;
 * otherwise the usual cutline intersection guide is the honest fallback.
 */
export function armpitChestReference(polygon,axisX=null) {
  const edges=polygon?.edges,points=polygon?.points
  if(!Array.isArray(edges)||!Array.isArray(points)||edges.length!==points.length)return null
  const left=edges.indexOf('side-left'),right=edges.indexOf('side-right')
  if(left<0||right<0)return null
  const endpoints=index=>[points[index],points[(index+1)%points.length]]
  // The armpits are whichever ends of the side seams are closer to the
  // shoulders (smallest material Y for a normal y-down garment polygon).
  const [a,b]=[endpoints(left),endpoints(right)].map(pair=>pair.find(p=>
    Array.isArray(p)&&p.length===2&&Number.isFinite(p[0])&&Number.isFinite(p[1])&&
    p[1]===Math.min(...pair.map(q=>q?.[1]??Infinity))))
  if(!a||!b||Math.abs(a[1]-b[1])>.004)return null
  const [p,q]=a[0]<b[0]?[a,b]:[b,a]
  if(!Number.isFinite(q[0]-p[0])||q[0]-p[0]<.08)return null
  const x=Number.isFinite(axisX)&&axisX>p[0]+.001&&axisX<q[0]-.001
    ?axisX:(p[0]+q[0])/2
  const y=(p[1]+q[1])/2
  if(!Number.isFinite(x)||!Number.isFinite(y))return null
  return {left:p.slice(),center:[x,y],right:q.slice(),y}
}

/** Extract canonical material coordinates from already laid-out/previewed
 * vertices, and supply the exact reverse transform for visible SVG guides.
 * The origin must be the previewed layout origin, not world [0,0]. Otherwise
 * translated or rotate-preview pieces get shifted drafting stations.
 */
export function patternGuideLocalFrame(points,origin,angle) {
  if(!Array.isArray(origin)||origin.length!==2||
    !origin.every(Number.isFinite)||!Number.isFinite(angle))
    throw new RangeError('Expected finite pattern frame origin and angle')
  const c=Math.cos(angle),s=Math.sin(angle)
  const local=(points||[]).map(p=>{
    if(!Array.isArray(p)||p.length<2||!p.every(Number.isFinite))return null
    const dx=p[0]-origin[0],dy=p[1]-origin[1]
    if(!Number.isFinite(dx)||!Number.isFinite(dy))return null
    const x=dx*c+dy*s,y=-dx*s+dy*c
    return Number.isFinite(x)&&Number.isFinite(y)?[x,y]:null
  })
  const toWorld=point=>{
    if(!Array.isArray(point)||point.length<2||
      !Number.isFinite(point[0])||!Number.isFinite(point[1]))
      throw new RangeError('Expected finite local guide coordinates')
    const [x,y]=point
    const world=[origin[0]+x*c-y*s,origin[1]+x*s+y*c]
    if(!world.every(Number.isFinite))throw new RangeError('Guide world coordinates must be finite')
    return world
  }
  return {local,toWorld}
}

/** Union the occupied intervals of all rendered fabric triangles at one
 * horizontal or vertical material-space station. The filled SVG pattern uses
 * these same triangles, so a reference line cannot jump into an empty cutout
 * just because an exported boundary chain has duplicated/open endpoints.
 */
export function materialGuideSpans(triangles,points,station,vertical=false) {
  return rustMaterialGuideSpans(triangles,points,station,vertical)
}


/** Choose one fixed torso axis inside the material at both chest and waist.
 * Separate sleeves and neckline openings cannot pull the guide off the body.
 */
export function sharedTorsoGuideX(triangles,points,chestY,waistY,fallback=null) {
  const chest=materialGuideSpans(triangles,points,chestY)
  const waist=materialGuideSpans(triangles,points,waistY)
  const overlaps=chest.flatMap(([a,b])=>waist.map(([c,d])=>[Math.max(a,c),Math.min(b,d)]))
    .filter(([a,b])=>b-a>.025)
    .sort((a,b)=>(b[1]-b[0])-(a[1]-a[0]))
  if(!overlaps.length)return null
  // Prefer the authored torso-side midpoint if it is also inside actual
  // fabric at both stations, keeping the familiar position after a reshape.
  const preferred=overlaps.find(([a,b])=>Number.isFinite(fallback)&&fallback>a+EPSILON&&fallback<b-EPSILON)
  if(preferred)return fallback
  const [left,right]=overlaps[0]
  return (left+right)/2
}

/** The garment-local vertical reference has one fixed X and independent
 * cutline-clipped intervals. Keep every occupied interval; taking only the
 * longest can silently drop the chest or hem when the cutline is concave.
 */
export function verticalGuideTracks(boundaries,local,centerX,levels=[],triangles=null) {
  if(!Number.isFinite(centerX))return []
  const spans=Array.isArray(triangles)&&triangles.length
    ?materialGuideSpans(triangles,local,centerX,true)
    :verticalPatternSpans(boundaries,local,centerX)
  return spans
    .filter(([a,b])=>b-a>.025)
    .map(span=>{
      const inset=Math.min(.006,(span[1]-span[0])*.05)
      const y0=span[0]+inset,y1=span[1]-inset
      const sorted=[y0,...levels.filter(y=>Number.isFinite(y)&&y>y0+EPSILON&&y<y1-EPSILON),y1]
        .sort((a,b)=>a-b)
      const unique=sorted.filter((y,index)=>index===0||y-sorted[index-1]>EPSILON)
      return unique.map(y=>[centerX,y])
    })
}

/** A chest/waist reference occupies only a real cut-outline interval.
 * Torso-side intersections may trim stray sleeve material; they must be
 * wholly within a valid outline span or the true cutline wins.
 */
export function horizontalGuideTracks(boundaries,local,y,centerX,torsoSides=null,triangles=null,requireCenter=false) {
  const full=Array.isArray(triangles)&&triangles.length
    ?materialGuideSpans(triangles,local,y)
    :horizontalPatternSpans(boundaries,local,y)
  const sides=torsoSides?horizontalPatternSpans(torsoSides,local,y):[]
  const spans=sides.length===1&&full.some(([a,b])=>sides[0][0]>=a-EPSILON&&sides[0][1]<=b+EPSILON)&&
    (!requireCenter||centerX>sides[0][0]+EPSILON&&centerX<sides[0][1]-EPSILON)
    ?sides:full
  return spans.filter(([a,b])=>b-a>.025&&(!requireCenter||(
    Number.isFinite(centerX)&&centerX>a+EPSILON&&centerX<b-EPSILON
  ))).map(([a,b])=>{
    const mid=Number.isFinite(centerX)&&centerX>a+EPSILON&&centerX<b-EPSILON
      ?centerX:(a+b)/2
    return [[a,y],[mid,y],[b,y]]
  })
}
