import {sha256Bytes} from './sha256Bytes.js'

// A bounded geometric AUTHORING CANDIDATE for a physical, paired edge facing.
// Never edits an active Rust document. No factory/cutter/Modaris approval.
const SIZES=['XS','S','M','L','XL','XXL']
const finite=n=>typeof n==='number'&&Number.isFinite(n)
const vector=v=>Array.isArray(v)&&v.length===2&&v.every(finite)
const near=(a,b,eps=1e-8)=>Math.hypot(a[0]-b[0],a[1]-b[1])<=eps
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1]]
const add=(a,b)=>[a[0]+b[0],a[1]+b[1]]
const scale=(a,k)=>[a[0]*k,a[1]*k]
const dist=(a,b)=>Math.hypot(...sub(a,b))
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
const fail=message=>{throw Error(`NATIVE_FACING_${message}`)}
const id=v=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,50}$/.test(v)
const digest=value=>`sha256:${sha256Bytes(new TextEncoder().encode(JSON.stringify(value)))}`

function shape(template,panelId,edgeId){
  const panels=template?.panels?.filter(p=>p.id===panelId)
  if(panels?.length!==1)fail('MISSING_OR_DUPLICATE_SOURCE_PANEL')
  const source=panels[0],poly=source.polygon
  if(!poly||poly.points?.length!==4||poly.edges?.length!==4||
      new Set(poly.edges).size!==4||!poly.points.every(vector)||
      Object.keys(poly.curves??{}).length||Object.keys(poly.free_curve_points??{}).length||
      poly.holes?.length||poly.lines?.length||poly.annotations?.length||poly.measurements?.length||
      Object.keys(poly.vertex_ids??{}).length||Object.keys(poly.vertex_mirror_groups??{}).length||
      Object.keys(poly.target_lengths??{}).length||source.pins?.length||source.pin_points?.length)
    fail('SOURCE_REQUIRES_UNATTACHED_STRAIGHT_RECTANGLE')
  const index=poly.edges.indexOf(edgeId)
  if(index<0||poly.edges.filter(x=>x===edgeId).length!==1)fail('UNKNOWN_NAMED_PARENT_EDGE')
  const x=poly.points.map(p=>p[0]),y=poly.points.map(p=>p[1])
  const minx=Math.min(...x),maxx=Math.max(...x),miny=Math.min(...y),maxy=Math.max(...y)
  if(maxx-minx<.06||maxy-miny<.06||
    poly.points.some(p=>![minx,maxx].some(xx=>Math.abs(p[0]-xx)<1e-8)||
      ![miny,maxy].some(yy=>Math.abs(p[1]-yy)<1e-8))||
    poly.points.some((p,i)=>{
      const q=poly.points[(i+1)%4]
      return (Math.abs(p[0]-q[0])<1e-8)===(Math.abs(p[1]-q[1])<1e-8)
    }))fail('SOURCE_NOT_RECTANGULAR')
  const area=poly.points.reduce((sum,p,i)=>{
    const q=poly.points[(i+1)%4];return sum+p[0]*q[1]-p[1]*q[0]
  },0)/2
  if(area<=1e-8)fail('SOURCE_WINDING_OR_AREA')
  const edge=poly.edges[index],a=poly.points[index],b=poly.points[(index+1)%4],delta=sub(b,a)
  const length=dist(a,b),normal=[-delta[1]/length,delta[0]/length]
  const span=Math.abs(delta[0])>Math.abs(delta[1])?maxy-miny:maxx-minx
  if(!(span>.06)&&length>.06)fail('SOURCE_EDGE_SPAN')
  const width=poly.seam_allowances?.[edge]
  if(!finite(width)||width<=0||width>.5||
    poly.edges.some(e=>!finite(poly.seam_allowances?.[e])||poly.seam_allowances[e]<=0))
    fail('MISSING_PARENT_PHYSICAL_ALLOWANCES')
  for(const notch of poly.notches?.[edge]??[]){
    if(!finite(notch.t)||notch.t<=0||notch.t>=1||
      !finite(notch.depth_m)||notch.depth_m<=0||notch.depth_m>width)
      fail('UNSAFE_PARENT_NOTCH')
  }
  return {source,poly,edge,a,b,normal,length,span}
}

function derived(parent,facingId,depthM,allowanceM){
  if(depthM+2*allowanceM>=parent.span||depthM<=.005)
    fail('FACING_DEPTH_EXCEEDS_PARENT_MATERIAL')
  const a=parent.a,b=parent.b,normal=parent.normal
  const points=[a,b,add(b,scale(normal,depthM)),add(a,scale(normal,depthM))]
  const prefix=`${facingId}`
  const edges=['sew','end','inside','start'].map(name=>`${prefix}_${name}`)
  if(edges.some(edge=>edge.length>80)||new Set(edges).size!==4)fail('UNSAFE_DERIVED_EDGE_ID')
  const shape={...structuredClone(parent.poly),points,edges,curves:{},free_curve_points:{},
    vertex_ids:{},vertex_mirror_groups:{},holes:[],lines:[],target_lengths:{},
    annotations:[],measurements:[],notches:{
      [edges[0]]:structuredClone(parent.poly.notches?.[parent.edge]??[]),
    },seam_allowances:Object.fromEntries(edges.map(name=>[name,allowanceM]))}
  const source=structuredClone(parent.source)
  source.id=facingId
  source.name=`${String(parent.source.name||parent.source.id)} Facing ${parent.edge}`.slice(0,120)
  source.polygon=shape
  // Keep pattern calibration/placements from the compiled parent until the
  // native receiver validates all six physical CUT shapes. No auto nesting.
  return source
}

/** Derives a fully authored graded panel and a physical native Sew pairing.
 * The result is a disposable receiver CANDIDATE, NOT a committed dependency.
 */
export function buildNativeSixSizeFacingCandidate20261027(project,{expectedRevision,
  parentPanelId,parentEdgeId,facingId,depthMm=40,allowanceMm=10}={}){
  try{
    if(!project||!Number.isSafeInteger(expectedRevision)||expectedRevision<0||
      !id(parentPanelId)||!id(parentEdgeId)||!id(facingId)||
      project.template?.panels?.some(panel=>panel.id===facingId)||
      !finite(depthMm)||depthMm<10||depthMm>100||!finite(allowanceMm)||allowanceMm<3||allowanceMm>30)
      fail('SOURCE_REVISION_OR_OPTIONS')
    const run=project.grade_run??project.gradeRun
    if(!run||!equal(run.sizes,SIZES)||run.gradedTemplates?.length!==6||run.baseSize!=='M'||
      !equal(run.baseTemplate,project.template))fail('MISSING_OR_STALE_SIX_SIZE_CATALOG')
    if(!Array.isArray(project.template.seams)||
      project.template.seams.some(seam=>[seam.a,seam.b].some(ref=>
        ref.panel===parentPanelId&&ref.edge===parentEdgeId)))fail('PARENT_BOUNDARY_ALREADY_SEWN')
    const depthM=depthMm/1000,allowanceM=allowanceMm/1000
    const source=shape(project.template,parentPanelId,parentEdgeId)
    if(source.source.fabric==null)fail('UNAUTHORED_PARENT_FABRIC')
    const candidates=[]
    for(const [i,size] of SIZES.entries()){
      const t=run.gradedTemplates[i]
      if(!equal(t.seams,project.template.seams)||t.panels.length!==project.template.panels.length)
        fail('GRADED_SEAM_OR_PANEL_INVENTORY_CHANGED')
      const parent=shape(t,parentPanelId,parentEdgeId)
      if(!equal(parent.poly.edges,source.poly.edges)||
        !equal(parent.poly.notches,source.poly.notches)||
        !equal(parent.poly.seam_allowances,source.poly.seam_allowances)||
        parent.source.fabric!==source.source.fabric)
        fail('GRADED_PARENT_FACTORY_METADATA_DRIFT')
      if(parent.length<2*(depthM+allowanceM)+.002)fail('GRADED_EDGE_TOO_SHORT')
      const face=derived(parent,facingId,depthM,allowanceM)
      if(face.fabric!==parent.source.fabric)fail('FACING_FABRIC_MISMATCH')
      candidates.push({size,sourcePanelId:parentPanelId,sourceEdgeId:parentEdgeId,
        sourceSewlineLengthM:parent.length,points:structuredClone(face.polygon.points),
        sourceNotches:structuredClone(parent.poly.notches?.[parent.edge]??[]),
        facingSewEdge:face.polygon.edges[0],facing:face})
    }
    const facingForBase=candidates[2].facing
    const seam={id:`${facingId}_seam`,a:{panel:parentPanelId,side:'top',edge:parentEdgeId,range:[0,1]},
      b:{panel:facingId,side:'top',edge:facingForBase.polygon.edges[0],range:[0,1]},
      reverse_b:true,notches:(source.poly.notches?.[parentEdgeId]??[]).map(n=>[n.t,n.t]),
      stiffness:50000,allow_ease:false}
    if(project.template.seams.some(s=>s.id===seam.id))fail('SEAM_ID_COLLISION')
    const append=(template,face)=>{
      const next=structuredClone(template)
      next.panels.push(structuredClone(face))
      next.seams.push(structuredClone(seam))
      return next
    }
    const template=append(project.template,facingForBase)
    const gradedTemplates=run.gradedTemplates.map((tpl,i)=>append(tpl,candidates[i].facing))
    if(!equal(gradedTemplates[2],template))fail('BASE_GRADE_FACING_DIFFERENCE')
    const newRun={...structuredClone(run),baseTemplate:structuredClone(template),gradedTemplates}
    const provenance={sourceRevision:expectedRevision,sourceDigest:digest({template:project.template,
      gradeRun:run}),parentPanelId,parentEdgeId,facingId,depthMm,allowanceMm,
      sixSizes:[...SIZES],facingGeometryDigest:digest(candidates.map(({facing,size})=>({size,polygon:facing.polygon}))),
      referenceOnly:true,manufacturingApproved:false,cuttingAuthorized:false,licensedModarisAccepted:false}
    return {ok:true,kind:'exo-native-six-size-facing-cut-sew-candidate.v1',referenceOnly:true,
      sourceRevision:expectedRevision,template,gradeRun:newRun,sourceUnchanged:true,
      derivedPanelId:facingId,pairedSeamId:seam.id,sizes:candidates.map(({facing,...row})=>row),
      provenance,manufacturingApproved:false,cuttingAuthorized:false,
      caveat:'Disposable physical cut-and-sew candidate, not persisted automatic parent-child or approved factory/Modaris geometry.'}
  }catch(error){return {ok:false,reason:error?.message??String(error),manufacturingApproved:false}}
}

export function verifyNativeSixSizeFacingCandidate20261027(project,proposal,options={}){
  const source=proposal?.provenance
  if(!proposal?.ok||!source||proposal.sourceRevision!==source.sourceRevision||
    source.sourceDigest!==digest({template:project?.template,gradeRun:project?.grade_run??project?.gradeRun})||
    source.referenceOnly!==true||source.manufacturingApproved!==false||
    source.cuttingAuthorized!==false||proposal.manufacturingApproved!==false||
    proposal.cuttingAuthorized!==false)return {ok:false,reason:'Stale, altered or unauthorized facing provenance'}
  const next=buildNativeSixSizeFacingCandidate20261027(project,{expectedRevision:source.sourceRevision,
    parentPanelId:source.parentPanelId,parentEdgeId:source.parentEdgeId,facingId:source.facingId,
    depthMm:source.depthMm,allowanceMm:source.allowanceMm,...options})
  if(!next.ok||!equal(next.template,proposal.template)||!equal(next.gradeRun,proposal.gradeRun)||
    !equal(next.sizes,proposal.sizes)||!equal(next.provenance,proposal.provenance))
    return {ok:false,reason:next.reason??'Facing geometry/provenance changed or was forged'}
  return {ok:true,sourceRevision:source.sourceRevision,pairedSeamId:next.pairedSeamId,
    sixSizes:[...SIZES],derivedPanels:6,manufacturingApproved:false,licensedModarisAccepted:false}
}
