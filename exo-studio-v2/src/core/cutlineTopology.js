/** Geometry-only QA for the physical CUT contour, not a manufacturing signoff.
 * Fully independent from the plotting/rendering backend. Exact endpoints are
 * retained; non-adjacent intersections and zero-length segments fail closed.
 */
export function inspectCutlinePolygon(points,{epsilon=1e-7}={}) {
 const faults=[]
 const fail=(code,detail)=>faults.push({code,detail})
 if(!Array.isArray(points)||points.length<3||points.length>20000) {
  fail('CUTLINE_VERTEX_COUNT','A contour requires 3–20000 vertices.')
  return {ok:false,areaCm2:0,faults}
 }
 if(!Number.isFinite(epsilon)||epsilon<=0||epsilon>0.01){
  fail('INVALID_EPSILON','Topology resolution must be a finite value in (0,0.01] cm.')
  return {ok:false,areaCm2:0,faults}
 }
 // Array.prototype.some skips sparse holes; for...of visits them as undefined.
 // Reject missing vertices before geometry calculations can dereference them.
 for(const p of points){
  // A prototype can supply plausible-looking positions for missing authored
  // coordinates. Inspect own data descriptors without executing getters.
  const x=p&&Object.getOwnPropertyDescriptor(p,'x')
  const y=p&&Object.getOwnPropertyDescriptor(p,'y')
  if(!x||!y||!Object.hasOwn(x,'value')||!Object.hasOwn(y,'value')||
     !Number.isFinite(x.value)||!Number.isFinite(y.value)){
   fail('CUTLINE_NONFINITE','Cutline contains undefined or nonfinite positions.')
   return {ok:false,areaCm2:0,faults}
  }
 }
 const n=points.length
 let signedArea=0
 const origin=points[0]
 for(let i=0;i<n;i++){
  const p=points[i],q=points[(i+1)%n]
  // Anchor the shoelace sum to one vertex: absolute coordinates can be
  // enormous even when the physical pattern is only centimetres across.
  signedArea+=(p.x-origin.x)*(q.y-origin.y)-(q.x-origin.x)*(p.y-origin.y)
  if(Math.hypot(p.x-q.x,p.y-q.y)<=epsilon){
   fail('CUTLINE_DEGENERATE_EDGE',`Edge ${i} length is below tolerance.`)
  }
 }
 const rawArea=Math.abs(signedArea/2)
 const areaCm2=Number.isFinite(rawArea)?rawArea:0
 if(!Number.isFinite(rawArea))fail('CUTLINE_AREA_NONFINITE','Cutline area exceeds finite numerical range.')
 else if(!(areaCm2>epsilon))fail('CUTLINE_ZERO_AREA','Cutline area is degenerate.')
 const orient=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)
 const near=(x,y)=>Math.abs(x-y)<=epsilon
 const inside=(p,a,b)=>p.x>=Math.min(a.x,b.x)-epsilon&&p.x<=Math.max(a.x,b.x)+epsilon&&p.y>=Math.min(a.y,b.y)-epsilon&&p.y<=Math.max(a.y,b.y)+epsilon
 const onSegment=(a,b,c)=>near(orient(a,b,c),0)&&inside(c,a,b)
 let crossings=0
 for(let i=0;i<n;i++)for(let j=i+2;j<n;j++){
  if(i===0&&j===n-1)continue
  const a=points[i],b=points[(i+1)%n],c=points[j],d=points[(j+1)%n]
  // Fast bounding box before the expensive topological predicates.
  if(Math.max(a.x,b.x)<Math.min(c.x,d.x)-epsilon||Math.max(c.x,d.x)<Math.min(a.x,b.x)-epsilon||
     Math.max(a.y,b.y)<Math.min(c.y,d.y)-epsilon||Math.max(c.y,d.y)<Math.min(a.y,b.y)-epsilon)continue
  const x=orient(a,b,c),y=orient(a,b,d),z=orient(c,d,a),w=orient(c,d,b)
  const intersects=(x*y<-(epsilon*epsilon)&&z*w<-(epsilon*epsilon)) ||
   onSegment(a,b,c)||onSegment(a,b,d)||onSegment(c,d,a)||onSegment(c,d,b)
  if(intersects){
    crossings++
    if(crossings<=12)fail('CUTLINE_SELF_INTERSECTION',`Nonadjacent edges ${i} and ${j} intersect or touch.`)
  }
 }
 if(crossings>12)fail('CUTLINE_SELF_INTERSECTION',`${crossings-12} additional overlapping or crossing edge pairs.`)
 return {ok:faults.length===0,areaCm2,faults}
}
