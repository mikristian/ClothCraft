// A strict, source-bound native Rust CUT → machine-neutral 2D intake witness.
// Coordinates from the Rust grade-run-cutlines API are metres; this intake
// explicitly converts them to centimetres for downstream JS/CAM development.
// It is deliberately NOT a JS garment/project, native↔JS parity certificate,
// authenticated operator signature, physical roll preflight or CUT release.
import {createHash} from 'node:crypto'
import {createNativeVerifiedProductionOrderRun37,
  inspectNativeVerifiedProductionSourceRun37}
  from './native-verified-production-order-run37.mjs'
import {nativeSourceFingerprint,nativeCutlineFingerprint}
  from './native-production-order-marker-20261029.mjs'

const fail=code=>{throw Error(code)}
const plain=o=>o!==null&&typeof o==='object'&&!Array.isArray(o)&&
  [Object.prototype,null].includes(Object.getPrototypeOf(o))
const canonical=(value,parents=new Set(),depth=0,state={nodes:0})=>{
  if(++state.nodes>300000)fail('NATIVE_INTAKE_HASH_COMPLEXITY_BUDGET')
  if(depth>64)fail('NATIVE_INTAKE_HASH_DEPTH_EXCEEDED')
  if(value===null||typeof value==='string'||typeof value==='boolean')
    return JSON.stringify(value)
  if(typeof value==='number'&&Number.isFinite(value))return JSON.stringify(value)
  if(!Array.isArray(value)&&!plain(value))fail('NATIVE_INTAKE_NON_JSON_DIGEST')
  if(parents.has(value))fail('NATIVE_INTAKE_CYCLIC_DIGEST')
  const desc=Object.getOwnPropertyDescriptors(value)
  const keys=Object.keys(value)
  if(Reflect.ownKeys(value).some(k=>typeof k==='symbol')||
    Object.keys(desc).length!==keys.length+(Array.isArray(value)?1:0)||
    keys.some(k=>['__proto__','prototype','constructor'].includes(k))||
    (Array.isArray(value)&&
      (keys.length!==value.length||
       !Array.from({length:value.length},(_,i)=>Object.hasOwn(value,i)).every(Boolean))))
    fail('NATIVE_INTAKE_NON_JSON_DIGEST')
  parents.add(value)
  const entries=Array.isArray(value)?keys:keys.sort()
  const wire=entries.map(k=>{
    const d=desc[k]
    if(!d||!Object.hasOwn(d,'value'))fail('NATIVE_INTAKE_HASH_ACCESSOR_REFUSED')
    return Array.isArray(value)?canonical(d.value,parents,depth+1,state):
      JSON.stringify(k)+':'+canonical(d.value,parents,depth+1,state)
  })
  parents.delete(value)
  return Array.isArray(value)?'['+wire.join(',')+']':'{'+wire.join(',')+'}'
}
export const digestNativeCutroomIntakeRun44=manifest=>{
  const wire=canonical(manifest)
  if(Buffer.byteLength(wire,'utf8')>8_000_000)fail('NATIVE_INTAKE_HASH_SIZE_LIMIT')
  return createHash('sha256').update(wire).digest('hex')
}
const hash=digestNativeCutroomIntakeRun44
const MAX_NATIVE_CUT_INSTANCES=4096
const sq=(a,b)=> (a[0]-b[0])**2+(a[1]-b[1])**2
const orient=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
const between=(x,a,b)=>x>=Math.min(a,b)-1e-10&&x<=Math.max(a,b)+1e-10
const onSegment=(p,a,b)=>Math.abs(orient(a,b,p))<1e-12&&
  between(p[0],a[0],b[0])&&between(p[1],a[1],b[1])
const crossing=(a,b,c,d)=>{
  const ab=orient(a,b,c),ac=orient(a,b,d)
  const cd=orient(c,d,a),ce=orient(c,d,b)
  const opposite=(a,b)=>(a>1e-12&&b< -1e-12)||(a< -1e-12&&b>1e-12)
  if(opposite(ab,ac)&&opposite(cd,ce))return true
  return (Math.abs(ab)<1e-12&&onSegment(c,a,b))||
    (Math.abs(ac)<1e-12&&onSegment(d,a,b))||
    (Math.abs(cd)<1e-12&&onSegment(a,c,d))||
    (Math.abs(ce)<1e-12&&onSegment(b,c,d))
}
const nativeCutPolygon=(cut)=>{
  if(!plain(cut)||Object.keys(cut).sort().join(',')!==
      'area_m2,edges,notches,perimeter_m,points'||
    !Array.isArray(cut.edges)||!Array.isArray(cut.notches)||
    cut.edges.length>512||cut.notches.length>256||
    !Array.isArray(cut.points)||cut.points.length<3||
    cut.points.length>512)return fail('NATIVE_INTAKE_UNSUPPORTED_CUT_TOPOLOGY')
  const points=cut.points
  if(points.some(p=>!Array.isArray(p)||p.length!==2||
    p.some(v=>typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>20)))
    fail('NATIVE_INTAKE_INVALID_METRE_COORDINATES')
  let area2=0,perimeter=0
  for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length]
    if(sq(a,b)<1e-16)fail('NATIVE_INTAKE_DUPLICATE_CUT_VERTEX')
    perimeter+=Math.sqrt(sq(a,b))
    area2+=a[0]*b[1]-b[0]*a[1]
    for(let j=i+1;j<points.length;j++){
      if(j===i+1||(i===0&&j===points.length-1))continue
      if(crossing(a,b,points[j],points[(j+1)%points.length]))
        fail('NATIVE_INTAKE_SELF_INTERSECTING_CUT')
    }
  }
  // Native Rust production_cutline rejects clockwise/zero-area contours.
  // A caller cannot launder an inverted outline with a positive abs(area).
  if(!Number.isFinite(area2)||area2<=1e-10)
    fail('NATIVE_INTAKE_DEGENERATE_CUT')
  if(!Number.isFinite(cut.area_m2)||cut.area_m2<=0||
    !Number.isFinite(cut.perimeter_m)||cut.perimeter_m<=0||
    Math.abs(cut.area_m2-Math.abs(area2)/2)>1e-6*Math.max(.0001,cut.area_m2)||
    Math.abs(cut.perimeter_m-perimeter)>1e-6*Math.max(.0001,perimeter))
    fail('NATIVE_INTAKE_CUT_METROLOGY_MISMATCH')
  // Rust's production_cutline offsets every named polygon edge into a
  // consecutive ownership range. A partial/empty or overlapping list must not
  // let unrelated CUT segments acquire a manufactured allowance identity.
  if(cut.edges.length<3||cut.edges.length>points.length)
    fail('NATIVE_INTAKE_INCOMPLETE_CUT_EDGE_PARTITION')
  const names=new Set()
  const edges=cut.edges.map(edge=>{
    if(!plain(edge)||Object.keys(edge).sort().join(',')!==
        'allowance_m,end,name,start'||
      typeof edge.name!=='string'||!edge.name||names.has(edge.name)||
      !Number.isFinite(edge.allowance_m)||edge.allowance_m<0||edge.allowance_m>.5||
      !Number.isSafeInteger(edge.start)||!Number.isSafeInteger(edge.end)||
      edge.start<0||edge.end<0||edge.start>=points.length||
      edge.end>=points.length||edge.start===edge.end)
      fail('NATIVE_INTAKE_INVALID_SEAM_ALLOWANCE_EDGE')
    names.add(edge.name)
    return {name:edge.name,start:edge.start,end:edge.end,
      allowanceCm:edge.allowance_m*100}
  })
  if(edges[0].start!==0||edges[edges.length-1].end!==0||
    edges.some((edge,i)=>edge.end!==edges[(i+1)%edges.length].start)||
    edges.reduce((sum,edge)=>sum+
      ((edge.end-edge.start+points.length)%points.length),0)!==points.length)
    fail('NATIVE_INTAKE_INCOMPLETE_CUT_EDGE_PARTITION')
  const stationsByEdge=new Map()
  const physicalNotchStarts=[]
  const marks=cut.notches.map(mark=>{
    const validPoint=p=>Array.isArray(p)&&p.length===2&&
      p.every(n=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=20)
    if(!plain(mark)||Object.keys(mark).sort().join(',')!==
        'cut_start,depth_m,edge_id,inner_end,t'||
      !names.has(mark.edge_id)||!Number.isFinite(mark.t)||
      mark.t<=0||mark.t>=1||!Number.isFinite(mark.depth_m)||
      mark.depth_m<=0||mark.depth_m>1||
      !validPoint(mark.cut_start)||!validPoint(mark.inner_end))
      fail('NATIVE_INTAKE_INVALID_NOTCH')
    const edge=edges.find(e=>e.name===mark.edge_id)
    if(mark.depth_m>edge.allowanceCm/100+1e-9)
      fail('NATIVE_INTAKE_NOTCH_EXCEEDS_ALLOWANCE')
    const former=stationsByEdge.get(mark.edge_id)||[]
    if(former.some(t=>Math.abs(t-mark.t)<1e-9))
      fail('NATIVE_INTAKE_DUPLICATE_NOTCH_STATION')
    // Rust itself rejects physically coincident notch starts even when two
    // DIFFERENT named edges claim distinct parameter stations.
    if(physicalNotchStarts.some(start=>sq(start,mark.cut_start)<1e-10))
      fail('NATIVE_INTAKE_DUPLICATE_PHYSICAL_NOTCH')
    former.push(mark.t)
    stationsByEdge.set(mark.edge_id,former)
    physicalNotchStarts.push(mark.cut_start)
    // The notch starts ON the named physical CUT edge and points back into
    // the CCW panel by exactly its authored depth. Merely finite endpoints
    // and a matching edge_id are insufficient production evidence.
    const span=(edge.end-edge.start+points.length)%points.length
    const distance=Math.hypot(
      mark.cut_start[0]-mark.inner_end[0],
      mark.cut_start[1]-mark.inner_end[1])
    if(Math.abs(distance-mark.depth_m)>1e-6)
      fail('NATIVE_INTAKE_INVALID_NOTCH_GEOMETRY')
    let projected=false
    for(let i=0;i<span;i++){
      const a=points[(edge.start+i)%points.length]
      const b=points[(edge.start+i+1)%points.length]
      const dx=b[0]-a[0],dy=b[1]-a[1]
      const denom=dx*dx+dy*dy
      const t=((mark.cut_start[0]-a[0])*dx+
        (mark.cut_start[1]-a[1])*dy)/denom
      if(t<=1e-6||t>=1-1e-6)continue
      const projection=[a[0]+Math.max(0,Math.min(1,t))*dx,
        a[1]+Math.max(0,Math.min(1,t))*dy]
      if(Math.hypot(mark.cut_start[0]-projection[0],
        mark.cut_start[1]-projection[1])>1e-6)continue
      const inward=dx*(mark.inner_end[1]-mark.cut_start[1])-
        dy*(mark.inner_end[0]-mark.cut_start[0])
      if(inward <=1e-12)continue
      // A near-tangent slash is not an inward notch. On a curved native seam
      // the source normal can differ slightly from the sampled CUT tangent,
      // so allow a bounded 2% angular projection instead of requiring exact
      // floating-point orthogonality.
      const parallel=dx*(mark.inner_end[0]-mark.cut_start[0])+
        dy*(mark.inner_end[1]-mark.cut_start[1])
      if(Math.abs(parallel)/Math.sqrt(denom)>
        Math.max(1e-6,.02*mark.depth_m))continue
      projected=true
      break
    }
    if(!projected)fail('NATIVE_INTAKE_INVALID_NOTCH_GEOMETRY')
    return {edgeId:mark.edge_id,t:mark.t,depthCm:mark.depth_m*100,
      cutStartCm:mark.cut_start.map(v=>v*100),
      innerEndCm:mark.inner_end.map(v=>v*100)}
  })
  return {outlineCm:points.map(([x,y])=>({x:x*100,y:y*100})),
    physicalAreaCm2:Math.abs(area2)*5000,
    physicalPerimeterCm:perimeter*100,allowanceEdges:edges,notchMarksCm:marks}
}
// Pure geometry inspection exports are for adversarial fixture testing and
// local diagnostics; they confer no native/source authority by themselves.
export const inspectNativeCutPolygonGeometryRun44=nativeCutPolygon
// Compare actual vertex correspondence after the exact SOURCE grain rotation.
// Edge lengths+area alone are NOT a proof: distinct noncongruent quadrilaterals
// can have equal lengths/area. Nor may a one-way piece be mirrored/reversed.
const sameShape=(source,placed,grain)=>{
  if(!Number.isFinite(grain)||!Array.isArray(placed?.outline)||
    source.length!==placed.outline.length||source.length>512||
    !Number.isFinite(placed.rotationDeg)||
    placed.outline.some(p=>!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)))return false
  const angle=((-grain%360)+360)%360
  const rotation=((placed.rotationDeg%360)+360)%360
  if(Math.abs(angle-rotation)>1e-7&&Math.abs(Math.abs(angle-rotation)-360)>1e-7)return false
  const rad=rotation*Math.PI/180,c=Math.cos(rad),s=Math.sin(rad)
  const rotated=source.map(p=>({x:p.x*c-p.y*s,y:p.x*s+p.y*c}))
  const minX=Math.min(...rotated.map(p=>p.x)),minY=Math.min(...rotated.map(p=>p.y))
  const normalized=rotated.map(p=>({x:p.x-minX,y:p.y-minY}))
  // RUN36 marker outlines are stored in GLOBAL fabric marker coordinates:
  // e.g. second piece vertices start at placement.x, not local (0,0).
  const lowX=Math.min(...placed.outline.map(p=>p.x))
  const lowY=Math.min(...placed.outline.map(p=>p.y))
  const highX=Math.max(...placed.outline.map(p=>p.x))
  const highY=Math.max(...placed.outline.map(p=>p.y))
  const tol=1e-5 // 0.1 micrometre in the centimetre contract.
  if([placed.x,placed.y,placed.width,placed.height].some(x=>!Number.isFinite(x))||
    Math.abs(placed.x-lowX)>tol||Math.abs(placed.y-lowY)>tol||
    Math.abs(placed.width-(highX-lowX))>tol||
    Math.abs(placed.height-(highY-lowY))>tol)return false
  for(let offset=0;offset<normalized.length;offset++)
    if(normalized.every((p,i)=>{
      const q=placed.outline[(i+offset)%normalized.length]
      return Math.abs(p.x-(q.x-lowX))<=tol&&
        Math.abs(p.y-(q.y-lowY))<=tol
    }))return true
  return false
}
export const verifyNativeCutPlacementGeometryRun44=sameShape
const rpc=async(workspace,packet)=>{
  const result=await workspace.request(packet)
  if(result?.ok!==true||!result.data)fail('NATIVE_INTAKE_WORKSPACE_REQUEST_FAILED')
  return result.data
}
const sourceLinks=project=>hash({
  grade_run:project?.grade_run,
  template:project?.template,
  native_point_bindings:project?.native_point_bindings??null,
  native_facing_dependency:project?.native_facing_dependency??null,
  fabric_grade_envelope:project?.fabric_grade_envelope??null,
  piece_variant:project?.piece_variant??null,
})

/** Input is the RUN37 operator declaration; it never carries CUT vertices,
 * source hashes, or permission to manufacture. All CUT is read again from the
 * same native Rust session using revision-bounded trusted RPC calls.
 */
export async function buildNativeVerifiedCutroomIntakeRun44(workspace,input){
  if(typeof workspace?.request!=='function')fail('NATIVE_INTAKE_WORKSPACE_REQUIRED')
  // Snapshot/validate order *before* a potentially costly native grading and
  // polygon-nesting pass. An 8MB HTTP packet could otherwise request nearly
  // 500,000 nested pieces (50 sizes x 100 panels x 99 instances).
  const order=JSON.parse(canonical(input))
  if(!plain(order)||Object.keys(order).sort().join(',')!==
      'expectedRevision,materialsByPanel,quantitiesBySize'||
    !plain(order.quantitiesBySize)||!plain(order.materialsByPanel)||
    Object.keys(order.quantitiesBySize).length>50||
    Object.keys(order.materialsByPanel).length>100)
    fail('NATIVE_INTAKE_ORDER_SHAPE_OR_BUDGET')
  let planned=0
  for(const counts of Object.values(order.quantitiesBySize)){
    if(!plain(counts))fail('NATIVE_INTAKE_ORDER_SHAPE_OR_BUDGET')
    for(const qty of Object.values(counts)){
      if(!Number.isSafeInteger(qty)||qty<1||qty>99)
        fail('NATIVE_INTAKE_ORDER_SHAPE_OR_BUDGET')
      planned+=qty
      if(planned>MAX_NATIVE_CUT_INSTANCES)
        fail('NATIVE_INTAKE_ORDER_INSTANCE_BUDGET')
    }
  }
  // Refuse an oversized/unsupported graded polygon catalog BEFORE RUN37
  // performs potentially thousands of polygon-nesting candidate searches.
  // The later end-to-end CUT source/geometry checks are still mandatory.
  const prior=await inspectNativeVerifiedProductionSourceRun37(workspace)
  if(prior.revision!==order.expectedRevision)
    fail('NATIVE_INTAKE_STALE_ORDER_REVISION')
  const quickCut=await rpc(workspace,{op:'grade-run-cutlines',
    revision:prior.revision})
  if(quickCut.format!=='exo-native-graded-cutlines.v1'||
    quickCut.manufacturerReady!==false||quickCut.cuttingAuthorized!==false||
    quickCut.revision!==prior.revision||
    quickCut.sourceRevision!==prior.revision||
    nativeCutlineFingerprint(quickCut)!==prior.nativeCutlineFingerprint||
    !Array.isArray(quickCut.sizes)||
    quickCut.sizes.length!==prior.sizes.length)
    fail('NATIVE_INTAKE_PRE_NEST_CUT_SOURCE_DRIFT')
  let preNestVertices=0
  for(let i=0;i<prior.sizes.length;i++){
    const row=quickCut.sizes[i]
    if(row?.size!==prior.sizes[i]||!Array.isArray(row.panels)||
      row.panels.length!==prior.panels.length||
      new Set(row.panels.map(p=>p.panel_id)).size!==prior.panels.length)
      fail('NATIVE_INTAKE_PRE_NEST_CUT_COVERAGE')
    for(const p of row.panels){
      const cut=p.cut
      if(!prior.panels.some(panel=>panel.id===p.panel_id)||
        !Array.isArray(cut?.points)||cut.points.length<3||
        cut.points.length>512||
        !Array.isArray(cut.edges)||cut.edges.length<3||
        cut.edges.length>512||!Array.isArray(cut.notches)||
        cut.notches.length>256)
        fail('NATIVE_INTAKE_PRE_NEST_UNSUPPORTED_CUT')
      preNestVertices+=cut.points.length
      if(preNestVertices>20000)
        fail('NATIVE_INTAKE_PRE_NEST_VERTEX_BUDGET')
    }
  }
  const verified=await createNativeVerifiedProductionOrderRun37(workspace,order)
  if(verified.factoryApproved!==false||verified.cuttingAuthorized!==false||
    verified.independentlyAuthenticated!==false||
    verified.receivingCadApproved!==false||verified.sourceMaterialsChecked!==true)
    fail('NATIVE_INTAKE_RELEASE_OR_SOURCE_FLAG_FORGED')
  const before=await inspectNativeVerifiedProductionSourceRun37(workspace)
  const rev=verified.sourceRevision
  if(before.revision!==rev||before.sourceFingerprint!==verified.sourceFingerprint||
    before.nativeCutlineFingerprint!==verified.nativeCutlineFingerprint)
    fail('NATIVE_INTAKE_STALE_SOURCE_OR_CUT')
  const project=(await rpc(workspace,{op:'save',revision:rev})).project
  if(nativeSourceFingerprint(project)!==before.sourceFingerprint)
    fail('NATIVE_INTAKE_SOURCE_IDENTITY_DRIFT')
  const dependencySha256=sourceLinks(project)
  const cuts=await rpc(workspace,{op:'grade-run-cutlines',revision:rev})
  if(cuts?.format!=='exo-native-graded-cutlines.v1'||
    cuts.cuttingAuthorized!==false||
    cuts.manufacturerReady!==false||
    cuts.sourceRevision!==rev||cuts.revision!==rev||
    nativeCutlineFingerprint(cuts)!==before.nativeCutlineFingerprint)
    fail('NATIVE_INTAKE_CUT_IDENTITY_DRIFT')
  const afterProject=(await rpc(workspace,{op:'save',revision:rev})).project
  const after=await inspectNativeVerifiedProductionSourceRun37(workspace)
  if(after.revision!==rev||after.sourceFingerprint!==before.sourceFingerprint||
    after.nativeCutlineFingerprint!==before.nativeCutlineFingerprint||
    sourceLinks(afterProject)!==dependencySha256)
    fail('NATIVE_INTAKE_SOURCE_CHANGED_DURING_BUILD')
  // Recheck linked dependency identity AFTER the final source/CUT inspection,
  // not only before it. A native project opened with the same revision and
  // template/grade but different bindings must not reuse this witness.
  const finalProject=(await rpc(workspace,{op:'save',revision:rev})).project
  const finalSnapshot=await rpc(workspace,{op:'snapshot',revision:rev})
  if(sourceLinks(finalProject)!==dependencySha256||
    nativeSourceFingerprint(finalProject)!==before.sourceFingerprint||
    finalSnapshot.revision!==rev||
    finalSnapshot.gradeRunPersisted!==true||
    finalSnapshot.activeGradedSize||finalSnapshot.running===true)
    fail('NATIVE_INTAKE_SOURCE_CHANGED_DURING_BUILD')
  if(!Array.isArray(cuts.sizes)||cuts.sizes.length!==before.sizes.length||
    !Array.isArray(verified.results)||verified.results.length!==before.sizes.length)
    fail('NATIVE_INTAKE_GRADED_SIZE_COVERAGE_DRIFT')
  const sourcePanels=before.panels
  const ids=sourcePanels.map(p=>p.id)
  const sizeCuts=[]
  let totalVertices=0
  for(let i=0;i<before.sizes.length;i++){
    const row=cuts.sizes[i],verifiedRow=verified.results[i]
    if(row?.size!==before.sizes[i]||verifiedRow?.size!==row.size||
      !Array.isArray(row.panels)||row.panels.length!==ids.length||
      new Set(row.panels.map(p=>p.panel_id)).size!==ids.length)
      fail('NATIVE_INTAKE_SIZE_OR_PANEL_IDENTITY_DRIFT')
    const panelCuts=[]
    for(const panel of sourcePanels){
      const raw=row.panels.find(p=>p.panel_id===panel.id)
      if(!raw)fail('NATIVE_INTAKE_SIZE_OR_PANEL_IDENTITY_DRIFT')
      const contour=nativeCutPolygon(raw.cut)
      totalVertices+=contour.outlineCm.length
      if(totalVertices>20000)fail('NATIVE_INTAKE_VERTEX_BUDGET')
      const quantity=order.quantitiesBySize[row.size][panel.id]
      const matched=verifiedRow.markers.flatMap(x=>x.marker.placements.map(p=>({
        fabricId:x.fabricId,placement:p,
      }))).filter(p=>p.placement.pieceId===panel.id)
      if(matched.length!==quantity||
        new Set(matched.map(p=>p.placement.instance)).size!==quantity ||
        matched.some(p=>p.fabricId!==panel.sourceFabricId||
          !sameShape(contour.outlineCm,p.placement,panel.sourceGrainDegrees)))
        fail('NATIVE_INTAKE_MARKER_CUT_GEOMETRY_DRIFT')
      panelCuts.push({
        panelId:panel.id,fabricId:panel.sourceFabricId,
        groupId:order.materialsByPanel[panel.id].groupId,
        sourceGrainDegrees:panel.sourceGrainDegrees,
        physicalCutCount:quantity,physicalAreaCm2:contour.physicalAreaCm2,
        physicalPerimeterCm:contour.physicalPerimeterCm,
        allowanceEdges:contour.allowanceEdges,notchMarksCm:contour.notchMarksCm,
        notchToMarkerTransferVerified:false,
        notchStationFromSewlineIndependentlyVerified:false,
        outlineCm:contour.outlineCm,
      })
    }
    sizeCuts.push({size:row.size,panels:panelCuts})
  }
  if(verified.results.reduce((total,row)=>total+row.markers.reduce(
    (count,entry)=>count+entry.marker.placements.length,0),0)!==planned)
    fail('NATIVE_INTAKE_TOTAL_CUT_QUANTITY_DRIFT')
  const complete=(await rpc(workspace,{op:'save',revision:rev})).project
  const completeSnapshot=await rpc(workspace,{op:'snapshot',revision:rev})
  if(sourceLinks(complete)!==dependencySha256||
    nativeSourceFingerprint(complete)!==before.sourceFingerprint||
    completeSnapshot.revision!==rev||
    completeSnapshot.gradeRunPersisted!==true||completeSnapshot.running===true||
    completeSnapshot.activeGradedSize)
    fail('NATIVE_INTAKE_SOURCE_CHANGED_DURING_GEOMETRY_INSPECTION')
  const manifest={
    format:'exo-native-rust-graded-cut-intake.v1',schemaVersion:1,
    sourceRevision:rev,sourceFingerprint:before.sourceFingerprint,
    nativeCutlineFingerprint:before.nativeCutlineFingerprint,
    sourceDependencySha256:dependencySha256,
    coordinateContract:{rustCutline:'m',normalizedCutline:'cm',metresToCentimetres:100},
    markerContract:{algorithm:'native-run36-fabric-grouped-v1',
      widthCm:150,gapCm:1,maxLengthCm:1800,physicalRollVerified:false},
    sizes:[...before.sizes],sourcePanels:structuredClone(sourcePanels),
    quantitiesBySize:structuredClone(order.quantitiesBySize),
    materialsByPanel:structuredClone(order.materialsByPanel),
    sizeCuts,verifiedPhysicalCutInstances:verified.results.reduce((sum,row)=>
      sum+row.markers.reduce((count,group)=>count+group.marker.placements.length,0),0),
    jsIndustrialProjectSourceMatched:false,licensedReceiverVerified:false,
    fabricRollVerified:false,cuttingAuthorized:false,factoryApproved:false,
    manufacturingApproved:false,
  }
  return {ok:true,status:'NATIVE_RUST_2D_CUT_INTAKE_SOURCE_INSPECTED',
    manifest,manifestSha256:hash(manifest),cuttingAuthorized:false,
    factoryApproved:false,manufacturingApproved:false,
    limitations:'Independent native workspace CUT/marker correspondence, not JS-project parity, '+
      'authenticated roll inventory, factory cutting or licensed CAD interchange.'}
}

export async function inspectNativeVerifiedCutroomIntakeRun44(workspace,input,packet){
  if(!plain(packet)||Object.keys(packet).sort().join(',')!=='manifest,manifestSha256'||
    !plain(packet.manifest)||typeof packet.manifestSha256!=='string'||
    hash(packet.manifest)!==packet.manifestSha256)
    fail('NATIVE_INTAKE_INVALID_PACKET')
  const rebuilt=await buildNativeVerifiedCutroomIntakeRun44(workspace,input)
  if(rebuilt.manifestSha256!==packet.manifestSha256)
    fail('NATIVE_INTAKE_CURRENT_SOURCE_OR_ORDER_DRIFT')
  return {ok:true,status:'NATIVE_RUST_2D_CUT_INTAKE_REINSPECTED',
    manifestSha256:rebuilt.manifestSha256,
    sizeCount:rebuilt.manifest.sizes.length,
    physicalCutCount:rebuilt.manifest.verifiedPhysicalCutInstances,
    jsIndustrialProjectSourceMatched:false,licensedReceiverVerified:false,
    cuttingAuthorized:false,factoryApproved:false,manufacturingApproved:false}
}
