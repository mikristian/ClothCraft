// UI preflight; Rust remains the authoritative geometry validator.
const EPS=1e-9
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
const onSegment=(a,b,p)=>Math.abs(cross(a,b,p))<=EPS&&p[0]>=Math.min(a[0],b[0])-EPS&&p[0]<=Math.max(a[0],b[0])+EPS&&p[1]>=Math.min(a[1],b[1])-EPS&&p[1]<=Math.max(a[1],b[1])+EPS
const intersects=(a,b,c,d)=>{
  const x=cross(a,b,c),y=cross(a,b,d),z=cross(c,d,a),w=cross(c,d,b)
  return (x>EPS&&y<-EPS||x<-EPS&&y>EPS)&&(z>EPS&&w<-EPS||z<-EPS&&w>EPS)||
    Math.abs(x)<=EPS&&onSegment(a,b,c)||Math.abs(y)<=EPS&&onSegment(a,b,d)||
    Math.abs(z)<=EPS&&onSegment(c,d,a)||Math.abs(w)<=EPS&&onSegment(c,d,b)
}
const segments=(points,closed=true)=>Array.from({length:closed?points.length:points.length-1},(_,i)=>[points[i],points[(i+1)%points.length]])
const location=(p,ring)=>{
  let inside=false
  for(const [a,b] of segments(ring)){
    if(onSegment(a,b,p))return 0
    if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside
  }
  return inside?1:-1
}
const touches=(a,b)=>segments(a).some(([p,q])=>segments(b).some(([r,s])=>intersects(p,q,r,s)))
const simpleRing=ring=>segments(ring).every(([a,b],i,edges)=>{
  if(Math.hypot(b[0]-a[0],b[1]-a[1])<=EPS)return false
  return edges.every(([c,d],j)=>i===j||Math.abs(i-j)===1||Math.abs(i-j)===ring.length-1||!intersects(a,b,c,d))
})
export function nativeGradePlan(snapshot, panelId, widthInput, heightInput) {
  const fail = reason => ({ok:false, reason})
  const numeric = v => typeof v==='number' ? v : typeof v==='string'&&v.trim()!=='' ? Number(v) : NaN
  const width=numeric(widthInput),height=numeric(heightInput)
  if(!Number.isFinite(width)||!Number.isFinite(height))return fail('Enter both grade increments in millimetres.')
  if(Math.abs(width)>500||Math.abs(height)>500)return fail('Each grade increment must be within ±500 mm.')
  const panel=snapshot?.template?.panels?.find(p=>p.id===panelId),polygon=panel?.polygon
  if(!polygon||polygon.points?.length<3)return fail('Select an editable polygon pattern.')
  const hasMarks=Boolean(polygon.holes?.length||polygon.lines?.length)
  if(hasMarks){
    if(!Array.isArray(polygon.points)||polygon.points.length>4096||polygon.points.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite))||
      !simpleRing(polygon.points))return fail('Invalid or intersecting source contour.')
    if(Object.keys(polygon.curves||{}).length||Object.values(polygon.free_curve_points||{}).some(v=>v?.length))
      return fail('Curved source contours require authoritative native geometry validation before grading marked patterns.')
  }
  if(polygon.holes?.length){
    if(!Array.isArray(polygon.holes)||polygon.holes.length>32)
      return fail('Invalid native hole inventory.')
    const ids=new Set(polygon.edges||[])
    const verified=[]
    for(const hole of polygon.holes){
      const holeIds=new Set()
      if(!Array.isArray(hole?.points)||hole.points.length<3||hole.points.length>4096||
         !Array.isArray(hole.edges)||hole.edges.length!==hole.points.length||
         hole.points.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite))||
         hole.edges.some(id=>typeof id!=='string'||!id||ids.has(id)||(holeIds.has(id)?true:(holeIds.add(id),false))))
        return fail('Invalid native hole topology or named rim.')
      const area=hole.points.reduce((sum,p,i)=>{
        const q=hole.points[(i+1)%hole.points.length]
        return sum+p[0]*q[1]-q[0]*p[1]
      },0)/2
      if(!Number.isFinite(area)||area>=-1e-8)return fail('Native hole must have clockwise material winding.')
      if(!simpleRing(hole.points)||touches(hole.points,polygon.points)||hole.points.some(p=>location(p,polygon.points)!==1))
        return fail('Native hole must be a simple rim strictly inside the source contour.')
      if(verified.some(other=>touches(hole.points,other)||location(hole.points[0],other)!==-1||location(other[0],hole.points)!==-1))
        return fail('Native hole rims must not overlap, intersect, or nest.')
      verified.push(hole.points)
      for(const id of hole.edges)ids.add(id)
    }
  }
  // The native grade engine preserves each named internal line, including
  // every Bézier tangent, under the same affine material-space transform.
  // A malformed line cannot be safely previewed or sent to Rust.
  if(polygon.lines?.length){
    if(!Array.isArray(polygon.lines)||polygon.lines.length>64)return fail('Invalid native internal line inventory.')
    const ids=new Set([...(polygon.edges||[]),...(polygon.holes||[]).flatMap(h=>h.edges)])
    for(const line of polygon.lines){
      if(typeof line?.id!=='string'||!line.id||ids.has(line.id)||
         !Array.isArray(line.points)||line.points.length<2||line.points.length>64||
         !Array.isArray(line.tangents)||line.tangents.length!==line.points.length||
         [...line.points,...line.tangents].some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)))
        return fail('Invalid or duplicate native internal line geometry.')
      ids.add(line.id)
      if(polygon.holes?.length){
        const straight=line.points.every((p,i)=>i===line.points.length-1||(
          Math.abs(cross(p,line.points[i+1],[p[0]+line.tangents[i][0],p[1]+line.tangents[i][1]]))<=EPS&&
          Math.abs(cross(p,line.points[i+1],[line.points[i+1][0]-line.tangents[i+1][0],line.points[i+1][1]-line.tangents[i+1][1]]))<=EPS))
        if(!straight)return fail('Curved internal guides near holes require native geometry validation.')
        if(segments(line.points,false).some(([a,b])=>polygon.holes.some(h=>
          segments(h.points).some(([c,d])=>intersects(a,b,c,d))||location(a,h.points)!==-1||location(b,h.points)!==-1)))
          return fail('Internal guide crosses or enters a native hole cutline.')
      }
    }
  }
  const range=snapshot.panels?.find(p=>p.id===panelId)
  const indices=[...new Set(Object.values(range?.boundaries||{}).flat())]
  const points=indices.map(i=>snapshot.uv?.[i])
  if(points.length<3||points.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)))return fail('Compiled material boundary is unavailable. Refresh the pattern before grading.')
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1])
  const before=[(Math.max(...xs)-Math.min(...xs))*1000,(Math.max(...ys)-Math.min(...ys))*1000]
  const after=[before[0]+width,before[1]+height]
  if(before.some(v=>v<=.001)||after.some(v=>v<1||v>10000))return fail('Resulting dimensions must stay between 1 mm and 10,000 mm.')
  if(width===0&&height===0)return {...fail('Enter a non-zero grade change.'),before,after}
  const seams=(snapshot.template.seams||[]).filter(s=>s.a?.panel===panelId||s.b?.panel===panelId).length
  const complexManufacturingMarks=Boolean(polygon.holes?.length||polygon.lines?.length)
  return {ok:true,reason:'',width,height,before,after,seams,revision:snapshot.revision,
    complexManufacturingMarks,manufacturingApproved:false,
    industrialCutlineBlockedReason:complexManufacturingMarks?
      'Native graded holes and internal guides are preserved as material geometry, but the industrial CUT offset/export kernel intentionally refuses them until a topology-aware factory handoff is validated.':null}
}
