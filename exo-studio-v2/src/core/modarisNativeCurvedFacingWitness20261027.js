import {sampleNativeFreeKnotEdge20261027} from './modarisNativeFreeKnotReactiveWitness20261027.js'

// Independent read-only physical receipt verifier for RUST-OWNED v2 facings.
// It never authors production geometry, replaces a Rust audit, or authorizes a cutter.
const SIZES=['XS','S','M','L','XL','XXL']
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
const finite=x=>typeof x==='number'&&Number.isFinite(x)
const point=p=>Array.isArray(p)&&p.length===2&&p.every(finite)
const length=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])
const near=(a,b,t=1e-8)=>point(a)&&point(b)&&length(a,b)<=t
const add=(a,b)=>[a[0]+b[0],a[1]+b[1]]
const minus=(a,b)=>[a[0]-b[0],a[1]-b[1]]
const scale=(a,t)=>[a[0]*t,a[1]*t]
const fail=text=>{throw Error(text)}
const findPanel=(template,id)=>{
  const all=template.panels.filter(p=>p.id===id)
  if(all.length!==1||!all[0].polygon)fail(`Missing or duplicate physical panel ${id}`)
  return all[0].polygon
}
const cubic=(p,t)=>{
  const u=1-t
  return add(add(scale(p[0],u*u*u),scale(p[1],3*u*u*t)),
    add(scale(p[2],3*u*t*t),scale(p[3],t*t*t)))
}
const derivative=(p,t)=>add(add(scale(minus(p[1],p[0]),3*(1-t)**2),
  scale(minus(p[2],p[1]),6*(1-t)*t)),scale(minus(p[3],p[2]),3*t*t))
const arclength=points=>points.slice(1).reduce((s,p,i)=>s+length(p,points[i]),0)
const sameNotches=(a,b,expectedDepth)=>Array.isArray(a)&&Array.isArray(b)&&
  a.length===2&&b.length===2&&a.every((n,i)=>n.t===[.25,.75][i]&&
    n.depth_m===expectedDepth&&b[i].t===n.t&&b[i].depth_m===n.depth_m)

export function verifyNativeCurvedFacingPhysical20261027({project,cutlines,sewing,sourceRevision}={}){
  try{
    const spec=project?.native_facing_dependency
    const base=project?.template,run=project?.grade_run
    if(spec?.version!==2||!base||!run||!Number.isSafeInteger(sourceRevision)||
      !eq(spec.sourceTemplate,base)||!eq(run.baseTemplate,base)||
      !eq(run.sizes,SIZES)||run.gradedTemplates?.length!==6||run.baseSize!=='M'||
      cutlines?.format!=='exo-native-graded-cutlines.v1'||
      cutlines?.sourceRevision!==sourceRevision||cutlines?.cuttingAuthorized!==false||
      !eq(cutlines?.sizes?.map(v=>v.size),SIZES)||
      sewing?.format!=='exo-native-six-size-sewn-balance-audit.v1'||
      sewing?.sourceRevision!==sourceRevision||sewing?.factoryApproved!==false||
      !eq(sewing?.sizes?.map(v=>v.size),SIZES))fail('Persisted source/grade/physical receiver provenance is missing or stale')
    const {parentPanelId, parentEdgeId, facingId, depthM,allowanceM}=spec
    if(![depthM,allowanceM].every(finite)||depthM<.01||depthM>.08||
      allowanceM<.002||allowanceM>.03||
      typeof parentPanelId!=='string'||typeof facingId!=='string'||
      typeof parentEdgeId!=='string'||!base.seams?.some(s=>s.id===`${facingId}_attach`))
      fail('Invalid named native curved-facing source or physical dimensions')
    const matching=base.seams.filter(s=>s.id===`${facingId}_attach`)
    if(matching.length!==1||matching[0].a.panel!==parentPanelId||
      matching[0].a.edge!==parentEdgeId||matching[0].b.panel!==facingId||
      matching[0].b.edge!==`${facingId}_sew`||matching[0].allow_ease!==false||
      matching[0].reverse_b!==true||!eq(matching[0].a.range,[0,1])||
      !eq(matching[0].b.range,[0,1]))fail('Forged, eased, or unpaired persisted facing sewing')
    let verifiedNotches=0,maxTangentialDriftMm=0
    for(let i=0;i<6;i++){
      const size=SIZES[i],grade=run.gradedTemplates[i]
      const source=findPanel(grade,parentPanelId),face=findPanel(grade,facingId)
      if(!eq(grade.seams,base.seams)||source.points.length!==4||face.points.length!==4||
        source.edges[0]!==parentEdgeId||face.edges.length!==4||
        face.edges[0]!==`${facingId}_sew`||face.edges[2]!==`${facingId}_hem`||
        Object.keys(source.curves??{}).length!==1||Object.keys(face.curves??{}).length!==2||
        Object.keys(source.free_curve_points??{}).length||
        Object.keys(face.free_curve_points??{}).length)
        fail(`Nonqualified six-size cubic source or child topology: ${size}`)
      const baseControls=source.curves[parentEdgeId],upper=face.curves[face.edges[0]],
        lower=face.curves[face.edges[2]]
      if(!Array.isArray(baseControls)||baseControls.length!==2||!baseControls.every(point)||
        !Array.isArray(upper)||upper.length!==2||!upper.every(point)||
        !Array.isArray(lower)||lower.length!==2||!lower.every(point))
        fail(`Missing physical cubic and hem controls in size ${size}`)
      const a=source.points[0],b=source.points[1],width=b[0]-a[0]
      if(!point(a)||!point(b)||!finite(width)||width<=.03||
        !near(face.points[0],[0,0])||!near(face.points[1],[width,0])||
        !near(face.points[2],[width,depthM])||!near(face.points[3],[0,depthM]))
        fail(`Unlinked six-size physical facing endpoints ${size}`)
      const sourceRelative=baseControls.map(control=>minus(control,a))
      if(!near(upper[0],sourceRelative[0])||!near(upper[1],sourceRelative[1])||
        !near(lower[0],add(sourceRelative[1],[0,depthM]))||
        !near(lower[1],add(sourceRelative[0],[0,depthM])))
        fail(`Physical sewn cubic/translated hem identity mismatch ${size}`)
      const cubicPts=[a,...baseControls,b]
      for(let step=0;step<=64;step++){
        const t=step/64,p=cubic(cubicPts,t),v=derivative(cubicPts,t)
        if(!point(v)||v[0]<=width*.2||p[1]>a[1]+1e-9)fail(`Unsafe curved-facing orientation ${size}`)
        const speed=Math.hypot(...v),normal=[-v[1]/speed,v[0]/speed]
        const translated=[0,depthM],gap=translated[0]*normal[0]+translated[1]*normal[1]
        const tangentError=length(translated,scale(normal,gap))
        maxTangentialDriftMm=Math.max(maxTangentialDriftMm,tangentError*1000)
        if(gap<=0||tangentError>.00025+1e-12)
          fail(`Unsupported cubic facing normal-offset error ${size}`)
      }
      if(!source.edges.every(e=>finite(source.seam_allowances?.[e]))||
        !face.edges.every(e=>Math.abs(face.seam_allowances?.[e]-allowanceM)<=1e-10)||
        !sameNotches(source.notches[parentEdgeId],face.notches[face.edges[0]],Math.min(allowanceM*.5,.005)))
        fail(`Incomplete source/child industrial allowances and notches ${size}`)
      const nativeCut=cutlines.sizes[i],src=nativeCut.panels.filter(p=>p.panel_id===parentPanelId),
        child=nativeCut.panels.filter(p=>p.panel_id===facingId)
      if(src.length!==1||child.length!==1||!src[0].cut||!child[0].cut||
        !finite(child[0].cut.area_m2)||child[0].cut.area_m2<=0||
        !eq(child[0].cut.edges.map(e=>e.name),face.edges)||
        child[0].cut.edges.some(e=>Math.abs(e.allowance_m-allowanceM)>1e-10)||
        child[0].cut.notches.length!==2||src[0].cut.notches.filter(n=>n.edge_id===parentEdgeId).length!==2)
        fail(`Native material CUT receiver is incomplete ${size}`)
      for(const [native,edgeName] of [[child[0],face.edges[0]],[src[0],parentEdgeId]]){
        const poly=native===child[0]?face:source
        const independent=arclength(sampleNativeFreeKnotEdge20261027(poly,edgeName))
        if(Math.abs(native.sewline_edge_lengths_m[edgeName]-independent)>1e-6)
          fail(`Independent physical cubic sewline does not match native ${size}`)
      }
      const gradeSeams=sewing.sizes[i].seams.filter(s=>s.seamId===matching[0].id)
      if(gradeSeams.length!==1||gradeSeams[0].allowEase!==false||
        gradeSeams[0].requiresEaseReview!==false||
        Math.abs(gradeSeams[0].mismatchM)>1e-7||
        gradeSeams[0].notchIntervalLengthsM?.length!==3||
        gradeSeams[0].notchIntervalLengthsM.some(pair=>!Array.isArray(pair)||
          pair.length!==2||pair.some(value=>!finite(value)||value<=0)||
          Math.abs(pair[0]-pair[1])>1e-7))
        fail(`Native sewn balance, physical notch intervals, or no-ease proof invalid ${size}`)
      verifiedNotches+=src[0].cut.notches.filter(n=>n.edge_id===parentEdgeId).length+
        child[0].cut.notches.length
    }
    if(verifiedNotches!==24)fail('Physical six-size notch inventory incomplete')
    return {ok:true,nativeCurvedFacingPhysicalAccepted:true,sixSizes:[...SIZES],
      verifiedSourceAndFacingCutPanels:12,verifiedPhysicalNotches:verifiedNotches,
      verifiedMaximumTangentialOffsetMm:maxTangentialDriftMm,
      factoryApproved:false,licensedModarisAccepted:false,cuttingAuthorized:false}
  }catch(error){return {ok:false,reason:error?.message??String(error),
    nativeCurvedFacingPhysicalAccepted:false,factoryApproved:false,
    licensedModarisAccepted:false,cuttingAuthorized:false}}
}
