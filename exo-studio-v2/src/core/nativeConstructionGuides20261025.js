// Native 2D InternalLine commands use panel-local metres. This module does not
// change cutlines, seams, or physical fabric: fold/pleat/dart marks are guides.
// Array#every skips sparse slots. Imported guide coordinates must be explicit
// finite data properties, not missing slots, inherited values, or accessors.
const valid = p => {
  if (!Array.isArray(p) || p.length !== 2) return false
  const x = Object.getOwnPropertyDescriptor(p, '0')
  const y = Object.getOwnPropertyDescriptor(p, '1')
  return !!x && !!y && Object.hasOwn(x, 'value') && Object.hasOwn(y, 'value') &&
    Number.isFinite(x.value) && Number.isFinite(y.value)
}
const validPoints = points => {
  if (!Array.isArray(points)) return false
  for (let i = 0; i < points.length; i++) {
    const slot = Object.getOwnPropertyDescriptor(points, String(i))
    if (!slot || !Object.hasOwn(slot, 'value') || !valid(slot.value)) return false
  }
  return true
}
const sub = (a,b) => [a[0]-b[0],a[1]-b[1]]
const add = (a,b,t=1) => [a[0]+b[0]*t,a[1]+b[1]*t]
const cross = (a,b) => a[0]*b[1]-a[1]*b[0]
const length = p => Math.hypot(...p)
const EPS = 1e-9
const onBoundary=(poly,p)=>poly.some((a,i)=>{
  const b=poly[(i+1)%poly.length]
  return Math.abs(cross(sub(b,a),sub(p,a)))<EPS&&
    (p[0]-a[0])*(p[0]-b[0])<=EPS&&(p[1]-a[1])*(p[1]-b[1])<=EPS
})
const overlapsExistingLine=(existing,a,b)=>{
  const pts=existing?.points
  if(!Array.isArray(pts)||pts.length<2||!validPoints(pts))return false
  for(let i=1;i<pts.length;i++){
    const p=pts[i-1],q=pts[i],r=sub(b,a),s=sub(q,p),det=cross(r,s),v=sub(p,a)
    if(Math.abs(det)<EPS){
      if(Math.abs(cross(v,r))<EPS){
        const rr=r[0]*r[0]+r[1]*r[1]
        if(rr>EPS&&Math.max(0,Math.min((v[0]*r[0]+v[1]*r[1])/rr,
          ((q[0]-a[0])*r[0]+(q[1]-a[1])*r[1])/rr))<
          Math.min(1,Math.max((v[0]*r[0]+v[1]*r[1])/rr,
          ((q[0]-a[0])*r[0]+(q[1]-a[1])*r[1])/rr))-EPS)return true
      }
      continue
    }
    const t=cross(v,s)/det,u=cross(v,r)/det
    if(t>=-EPS&&t<=1+EPS&&u>=-EPS&&u<=1+EPS)return true
  }
  return false
}

export function nativePanelLocalToWorld20261025(panel,layout,point) {
  if(!valid(point)||!valid(layout)||!Number.isFinite(panel?.layout_rotation_degrees??0))throw Error('Invalid panel placement')
  const angle=(panel.layout_rotation_degrees??0)*Math.PI/180
  const c=Math.cos(angle),s=Math.sin(angle)
  return [layout[0]+point[0]*c-point[1]*s,layout[1]+point[0]*s+point[1]*c]
}

export function nativePanelWorldToLocal20261025(panel,layout,point) {
  if(!valid(point)||!valid(layout)||!Number.isFinite(panel?.layout_rotation_degrees??0))throw Error('Invalid panel placement')
  const angle=(panel.layout_rotation_degrees??0)*Math.PI/180
  const c=Math.cos(angle),s=Math.sin(angle),p=sub(point,layout)
  return [p[0]*c+p[1]*s,-p[0]*s+p[1]*c]
}

function inside(poly,p) {
  let hit=false
  for(let i=0,j=poly.length-1;i<poly.length;j=i++) {
    const a=poly[i],b=poly[j]
    if(Math.abs(cross(sub(b,a),sub(p,a)))<EPS &&
      (p[0]-a[0])*(p[0]-b[0])<=EPS && (p[1]-a[1])*(p[1]-b[1])<=EPS)return true
    if((a[1]>p[1]) !== (b[1]>p[1]) && p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit
  }
  return hit
}

/** Intersect a line segment with a simple polygon. Concave panels may return
 * multiple separated intervals; no fabricated bridge across empty space. */
export function clipNativeConstructionLine20261025(polygon,a,b,{minimumLengthMm=0.1}={}) {
  if(!Array.isArray(polygon)||polygon.length<3||polygon.length>512||!validPoints(polygon)||!valid(a)||!valid(b)||
    !Number.isFinite(minimumLengthMm)||minimumLengthMm<=0)throw Error('Invalid panel contour or guide')
  const d=sub(b,a),denom=length(d)
  if(denom<EPS)throw Error('Guide endpoints coincide')
  const ts=[0,1]
  for(let i=0;i<polygon.length;i++){
    const p=polygon[i],q=polygon[(i+1)%polygon.length],e=sub(q,p),v=sub(p,a),det=cross(d,e)
    if(Math.abs(det)<EPS){
      if(Math.abs(cross(v,d))<EPS)throw Error('Guide overlaps panel boundary')
      continue
    }
    const t=cross(v,e)/det,u=cross(v,d)/det
    if(t>=-EPS&&t<=1+EPS&&u>=-EPS&&u<=1+EPS)ts.push(Math.max(0,Math.min(1,t)))
  }
  ts.sort((x,y)=>x-y)
  const unique=ts.filter((t,i)=>i===0||t-ts[i-1]>EPS)
  const result=[]
  for(let i=1;i<unique.length;i++){
    const start=unique[i-1],end=unique[i]
    if((end-start)*denom<minimumLengthMm/1000)continue
    if(inside(polygon,add(a,d,(start+end)/2)))result.push([add(a,d,start),add(a,d,end)])
  }
  return result
}

/** Commands are safe to submit individually through native edit({kind:'InternalLine',...}).
 * Each guide carries descriptive metadata separately; Rust currently persists
 * the geometry, not semantic fold/pleat/dart types. */
export function buildNativeConstructionGuides20261025(snapshot,{
  panelId,kind='internal',start,end,space='local',layout=null,
  count=3,spacingMm=15,depthMm=20,intakeMm=20,
}={}) {
  try {
    if(!Number.isSafeInteger(snapshot?.revision)||snapshot.revision<0)throw Error('Invalid native revision')
    const matching=snapshot.template?.panels?.filter(p=>p.id===panelId)
    if(matching?.length!==1)throw Error('Missing or ambiguous native panel')
    const panel=matching[0],polygon=panel.polygon
    if(!polygon||!Array.isArray(polygon.points)||polygon.points.length<3||!validPoints(polygon.points)||polygon.holes?.length)
      throw Error('Native panel contour is invalid or contains unsupported holes')
    if(polygon.curves && Object.keys(polygon.curves).length)throw Error('Curved boundary needs sampled native contour before clipping')
    if(!['internal','fold','pleat','dart'].includes(kind))throw Error('Unsupported guide kind')
    if(!valid(start)||!valid(end))throw Error('Invalid guide endpoints')
    if(space==='world'){
      if(!valid(layout))throw Error('World-space guide requires resolved native panel layout')
      start=nativePanelWorldToLocal20261025(panel,layout,start)
      end=nativePanelWorldToLocal20261025(panel,layout,end)
    } else if(space!=='local')throw Error('Unsupported coordinate space')
    const vector=sub(end,start),span=length(vector)
    if(span<.001)throw Error('Guide must span at least 1 mm')
    const normal=[-vector[1]/span,vector[0]/span]
    if(kind==='pleat'&&(!Number.isSafeInteger(count)||count<1||count>32||!Number.isFinite(spacingMm)||spacingMm<=0||spacingMm>300||!Number.isFinite(depthMm)||depthMm<=0||depthMm>300))
      throw Error('Invalid pleat count, spacing or depth')
    if(kind==='dart'&&(!Number.isFinite(intakeMm)||intakeMm<3||intakeMm>150||!Number.isFinite(depthMm)||depthMm<8||depthMm>500))
      throw Error('Invalid dart intake or depth')
    const strokes=[]
    if(kind==='pleat'){
      for(let i=0;i<count;i++){
        const displacement=(i-(count-1)/2)*spacingMm/1000
        strokes.push({role:i%2?'pleat-placement':'pleat-fold',a:add(start,normal,displacement),b:add(end,normal,displacement)})
      }
    } else if(kind==='dart'){
      const midpoint=add(start,vector,.5),apex=add(midpoint,normal,depthMm/1000)
      const half=Math.min(.5,intakeMm/1000/(2*span))
      strokes.push({role:'dart-leg-left',a:add(midpoint,vector,-half),b:apex},{role:'dart-leg-right',a:apex,b:add(midpoint,vector,half)})
    } else strokes.push({role:kind,a:start,b:end})
    const guides=[]
    let reusedLines=0
    for(const stroke of strokes){
      const clipped=clipNativeConstructionLine20261025(polygon.points,stroke.a,stroke.b)
      if(!clipped.length)throw Error(`${stroke.role} falls outside the panel`)
      for(const [a,b] of clipped){
        const originalLength=length(sub(b,a))
        if(originalLength<.002)throw Error('Construction segment shorter than 2 mm')
        // Native Rust requires construction strokes to remain inside the cut
        // boundary. Clipped endpoints touching a physical contour are inset
        // by 0.5 mm; do not add an invalid seam/guide crossing the cut edge.
        const direction=sub(b,a).map(value=>value/originalLength)
        const inset=.0005
        const begin=onBoundary(polygon.points,a)?add(a,direction,inset):a
        const finish=onBoundary(polygon.points,b)?add(b,direction,-inset):b
        const actualLength=length(sub(finish,begin))
        if(actualLength<.001)throw Error('Inset construction guide shorter than 1 mm')
        // A separately placed fold is often intentionally the centre mark of
        // a pleat family. Reuse that saved Rust line instead of submitting an
        // identical InternalLine that the native compiler may reject, causing
        // a partial multi-command transaction.
        const samePoint=(x,y)=>valid(x)&&valid(y)&&length(sub(x,y))<.00005
        const sameLine=line=>Array.isArray(line?.points)&&line.points.length===2&&
          (line.tangents||[]).every(t=>valid(t)&&length(t)<1e-9)&&
          ((samePoint(line.points[0],begin)&&samePoint(line.points[1],finish))||
            (samePoint(line.points[1],begin)&&samePoint(line.points[0],finish)))
        if((polygon.lines||[]).some(sameLine)||guides.some(guide=>
          sameLine({points:guide.points,tangents:[[0,0],[0,0]]}))){
          reusedLines++
          continue
        }
        // Crossing saved internal construction lines can invalidate the Rust
        // polygon's arrangement constraints. Fail before any multi-command
        // commit, rather than relying on a partially successful batch + Undo.
        if((polygon.lines||[]).some(line=>overlapsExistingLine(line,begin,finish)))
          throw Error(`${stroke.role} intersects an existing native internal line; reposition the marks before applying`)
        guides.push({role:stroke.role,points:[begin,finish],lengthMm:actualLength*1000,
          command:{kind:'InternalLine',panel:panelId,points:[begin,finish],tangents:[[0,0],[0,0]]}})
      }
    }
    if(!guides.length)throw Error('All of these construction lines already exist on this pattern')
    return {ok:true,revision:snapshot.revision,panelId,kind,guides,reusedLines,
      manufacturingApproved:false,semanticPersistence:false,
      note:`${reusedLines?reusedLines+' existing native guide(s) reused. ':''}Construction guides are native panel-local internal lines; dart cutting, pleat sewing and physical folding require separate native operations.`}
  } catch(error){return {ok:false,reason:error.message,manufacturingApproved:false}}
}
