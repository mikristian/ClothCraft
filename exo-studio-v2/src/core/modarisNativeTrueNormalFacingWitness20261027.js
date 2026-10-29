import {sampleNativeFreeKnotEdge20261027} from './modarisNativeFreeKnotReactiveWitness20261027.js'

// Independent read-only geometry witness. Rust remains source of authority;
// this function neither creates patterns nor releases material to a cutter.
const SIZES=['XS','S','M','L','XL','XXL']
const finite=x=>typeof x==='number'&&Number.isFinite(x)
const point=p=>Array.isArray(p)&&p.length===2&&p.every(finite)
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
const add=(a,b)=>[a[0]+b[0],a[1]+b[1]]
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1]]
const mult=(a,s)=>[a[0]*s,a[1]*s]
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])
const near=(a,b,eps=2e-8)=>point(a)&&point(b)&&dist(a,b)<=eps
const crash=message=>{throw Error(`NORMAL_FACING_WITNESS: ${message}`)}
const bezier=(v,t)=>{
  const a=1-t
  return add(add(mult(v[0],a**3),mult(v[1],3*a*a*t)),
    add(mult(v[2],3*a*t*t),mult(v[3],t**3)))
}
const tangent=(v,t)=>add(add(mult(sub(v[1],v[0]),3*(1-t)**2),
  mult(sub(v[2],v[1]),6*t*(1-t))),mult(sub(v[3],v[2]),3*t*t))
const normal=(v,t)=>{
  const u=tangent(v,t),length=Math.hypot(...u)
  if(!finite(length)||length<=1e-10||u[0]<=0)crash('Nonmonotone/zero-tangent curve')
  return [-u[1]/length,u[0]/length]
}
const arc=arr=>arr.slice(1).reduce((s,p,i)=>s+dist(p,arr[i]),0)
const panel=(template,id)=>{
  const matches=template.panels.filter(p=>p.id===id)
  if(matches.length!==1||!matches[0].polygon)crash(`Missing ${id} geometry`)
  return matches[0].polygon
}
function verifyOne(template,cut,sew,spec,size){
  const {parentPanelId, parentEdgeId, facingId, depthM, allowanceM}=spec
  const source=panel(template,parentPanelId),face=panel(template,facingId)
  if(source.points.length!==4||source.edges[0]!==parentEdgeId||
    Object.keys(source.curves??{}).length!==1||
    Object.keys(source.free_curve_points??{}).length||
    !Array.isArray(source.curves[parentEdgeId])||source.curves[parentEdgeId].length!==2)
    crash(`${size} source cubic/topology invalid`)
  const controls=source.curves[parentEdgeId]
  const nativeSew=`${facingId}_sew`
  if(face.edges[0]!==nativeSew||face.points.length<12||
    face.edges.length!==face.points.length||face.points.length>260||
    new Set(face.edges).size!==face.edges.length||
    Object.keys(face.curves??{}).length!==1||
    !Array.isArray(face.curves[nativeSew])||
    !eq(Object.keys(face.free_curve_points??{}),[]))crash(`${size} stitched/offset child topology incorrect`)
  const p0=source.points[0],p1=source.points[1]
  const cubic=[p0,controls[0],controls[1],p1]
  for(let k=0;k<2;k++)if(!near(face.curves[nativeSew][k],sub(cubic[k+1],p0)))
    crash(`${size} facing cubic sewing controls detached from source`)
  const n=face.points.length-3
  if(n<8||n>256||face.edges.some((edge,j)=>j>=2&&j<face.edges.length-1&&
      (!edge.startsWith(`${facingId}_`)||edge===nativeSew)))
    crash(`${size} offset sampled edge names invalid`)
  // Child offset contains n+1 hem samples (right->left), indexing from 2.
  // Compare the exact mathematical normal locations, independently sampled
  // from the parent cubic at each fixed t. No translated-cubic fallback.
  let maxChordError=0, minNormalGap=Infinity
  for(let i=0;i<=n;i++){
    const t=1-i/n
    const p=bezier(cubic,t),u=normal(cubic,t)
    const expected=add(add(sub(p,p0),mult(u,depthM)),face.points[0])
    if(!near(face.points[i+2],expected,3e-6))
      crash(`${size} hem sample ${i} is not source cubic unit-normal offset`)
    if(i<n){
      const middleT=1-(i+.5)/n
      const midway=add(add(sub(bezier(cubic,middleT),p0),mult(normal(cubic,middleT),depthM)),face.points[0])
      const chordMid=mult(add(face.points[i+2],face.points[i+3]),.5)
      maxChordError=Math.max(maxChordError,dist(midway,chordMid))
      if(dist(midway,chordMid)>.00025+1e-8)
        crash(`${size} offset polyline exceeds 0.25mm chord deviation`)
    }
    minNormalGap=Math.min(minNormalGap,dist(expected,add(sub(p,p0),face.points[0])))
  }
  if(minNormalGap<depthM-3e-6)crash(`${size} offset thickness collapsed`)
  const faceCut=cut.panels.filter(p=>p.panel_id===facingId)
  const parentCut=cut.panels.filter(p=>p.panel_id===parentPanelId)
  if(faceCut.length!==1||parentCut.length!==1||!faceCut[0].cut||!parentCut[0].cut||
    faceCut[0].cut.area_m2<=0||!finite(faceCut[0].cut.area_m2)||
    !eq(faceCut[0].cut.edges.map(e=>e.name),face.edges)||
    faceCut[0].cut.edges.some(e=>!finite(e.allowance_m)||Math.abs(e.allowance_m-allowanceM)>1e-10)||
    faceCut[0].cut.notches.length!==2||
    parentCut[0].cut.notches.filter(n=>n.edge_id===parentEdgeId).length!==2)
    crash(`${size} native CUT or allowances/notches inconsistent`)
  const actual=arc(sampleNativeFreeKnotEdge20261027(source,parentEdgeId))
  const childSewn=arc(sampleNativeFreeKnotEdge20261027(face,nativeSew))
  if(Math.abs(actual-childSewn)>1e-6||
    Math.abs(actual-faceCut[0].sewline_edge_lengths_m[nativeSew])>1e-6||
    Math.abs(actual-parentCut[0].sewline_edge_lengths_m[parentEdgeId])>1e-6)
    crash(`${size} independently sampled sewn arclength diverges`)
  const seam=sew.seams.filter(s=>s.seamId===`${facingId}_attach`)
  if(seam.length!==1||seam[0].allowEase!==false||seam[0].requiresEaseReview!==false||
    Math.abs(seam[0].mismatchM)>1e-7||
    seam[0].notchIntervalLengthsM?.length!==3||
    seam[0].notchIntervalLengthsM.some(pair=>!Array.isArray(pair)||pair.length!==2||
      pair.some(x=>!finite(x)||x<=0)||Math.abs(pair[0]-pair[1])>1e-7))
    crash(`${size} physical sewn pairing/ease/notch intervals not verified`)
  const parentNotches=source.notches[parentEdgeId],childNotches=face.notches[nativeSew]
  if(!Array.isArray(parentNotches)||!Array.isArray(childNotches)||
    parentNotches.length!==2||childNotches.length!==2||
    parentNotches.some((m,i)=>m.t!==[.25,.75][i]||
      m.t!==childNotches[i].t||
      Math.abs(m.depth_m-childNotches[i].depth_m)>1e-12))
    crash(`${size} saved physical arclength notch identities drifted`)
  return {size,hemSamples:n+1,maxChordErrorMm:maxChordError*1000,
    physicalNotches:4,parentSewlineM:actual,factoryApproved:false}
}

export function verifyNativeNormalOffsetFacingPhysical20261027({project,cutlines,sewing,sourceRevision}={}){
  try{
    const run=project?.grade_run,base=project?.template,spec=project?.native_facing_dependency
    if(spec?.version!==3||!Number.isSafeInteger(sourceRevision)||
      !base||!run||!eq(spec.sourceTemplate,base)||!eq(run.baseTemplate,base)||
      !eq(run.sizes,SIZES)||run.gradedTemplates?.length!==6||
      run.baseSize!=='M'||!finite(spec.depthM)||spec.depthM<=0||
      !finite(spec.allowanceM)||spec.allowanceM<=0||
      cutlines?.sourceRevision!==sourceRevision||
      cutlines?.format!=='exo-native-graded-cutlines.v1'||
      cutlines?.cuttingAuthorized!==false||
      !eq(cutlines?.sizes?.map(s=>s.size),SIZES)||
      sewing?.sourceRevision!==sourceRevision||
      sewing?.format!=='exo-native-six-size-sewn-balance-audit.v1'||
      sewing?.factoryApproved!==false||
      !eq(sewing?.sizes?.map(s=>s.size),SIZES))
      crash('Six-size persisted source or physical receipt stale/invalid')
    const seam=base.seams.filter(s=>s.id===`${spec.facingId}_attach`)
    if(seam.length!==1||seam[0].a.panel!==spec.parentPanelId||
      seam[0].b.panel!==spec.facingId||
      seam[0].a.edge!==spec.parentEdgeId||
      seam[0].b.edge!==`${spec.facingId}_sew`||
      seam[0].allow_ease!==false||seam[0].reverse_b!==true)
      crash('Persisted sewing relationship was forged')
    const rows=[]
    for(let i=0;i<6;i++){
      if(!eq(run.gradedTemplates[i].seams,base.seams))crash('Graded sewn relation changed')
      rows.push(verifyOne(run.gradedTemplates[i],cutlines.sizes[i],sewing.sizes[i],spec,SIZES[i]))
    }
    return {ok:true,kind:'native-normal-offset-v3-six-size-physical-witness',rows,
      totalPhysicalNotches:24,sourceRevision,factoryApproved:false,
      licensedModarisAccepted:false,cuttingAuthorized:false}
  }catch(error){return {ok:false,reason:error?.message??String(error),factoryApproved:false,
    licensedModarisAccepted:false,cuttingAuthorized:false}}
}
