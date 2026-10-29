import {gradeProject} from './grading.js'
import {buildFabricMarkers} from './marker.js'
import {inspectMarkerManufacturingConstraints20261028} from './markerManufacturingConstraints20261028.js'
import {projectToDxf} from './dxf.js'
import {auditMarkerDxfGeometryParity20261024} from './accumarkMarkerDxfGeometryParity20261024.mjs'
import {nestPolygons} from './accumarkPolygonNesting20261024.js'
import {buildAccuMarkCutterPathStudy20261024} from './accumarkCutterPathStudy20261024.js'
import {inspectNestedManufacturingMarks20261028} from './industrialNestedMarks20261028.mjs'
import {qualifyIndustrialCutterStudy20261028} from './industrialCutterQualification20261028.mjs'
import {fingerprintIndustrialMarkerSource20261029, fingerprintIndustrialMarkerStudy20261029} from './industrialMarkerSourceFreshness20261029.mjs'
const finite=n=>typeof n==='number'&&Number.isFinite(n)
const blocked=(code,detail)=>({ok:false,status:'BLOCKED',issues:[{code,detail}],rows:[],manufacturingApproved:false,cuttingAuthorized:false,machineReady:false})
// Strictly process-local digest of outputs produced by this real geometry builder.
// A study-supplied SHA is NEVER an independent receipt; this cache is populated
// only after successful source/DXF/mark/CUT verification. It is a performance
// optimization, not a durable signature or factory approval.
const verifiedBuilds=new Map()
const buildKey=(sourceSha256,options)=>fingerprintIndustrialMarkerStudy20261029({sourceSha256,options})
export function getLocallyVerifiedIndustrialMarkerStudyDigest20261029(sourceSha256,options){
 return verifiedBuilds.get(buildKey(sourceSha256,options))??null
}
const prohibited=p=>[p?.holes?.length,p?.drills?.length,p?.drillMarks?.length,p?.cutHoles?.length,p?.internalCutouts?.length,
 p?.internalCuts?.length,p?.marker?.fold,p?.cutOnFold,p?.fold,p?.marker?.repeat,p?.marker?.motif,p?.marker?.stripe,p?.marker?.plaid,
 p?.marker?.shade,p?.marker?.pairing,p?.marker?.fusing,p?.marker?.nap==='one-way'&&p?.marker?.allowReverseGrain].some(Boolean)
/** Full XS-XXL size- and fabric-specific cutting engineering preflight.
 * Polygon nesting and cutter study are separate from marker display preview.
 * Any untransferred manufacturing mark is a blocker, not a silently dropped feature.
 */
export function inspectIndustrialMarkerCutWorkflow20261028(project,{fabricWidthCm=null,spacingCm=null,maxLengthCm=1000,maxCandidates=30000,dxfBySize=null,cutterProfile=null,qualificationEvidence=null,constrainedLayout=null}={}){
 const sizes=project?.grading?.sizes
 if(!Array.isArray(sizes)||sizes.length<2||sizes.length>24||new Set(sizes).size!==sizes.length||
  !sizes.includes(project?.grading?.baseSize)||!Array.isArray(project?.pieces)||!project.pieces.length||project.pieces.length>80)
  return blocked('INVALID_GRADED_PROJECT','An authored 2–24-size grade run is required')
 const width=fabricWidthCm??project.markerSettings?.fabricWidthCm??150,gap=spacingCm??project.markerSettings?.gapCm??1.5
 if(!finite(width)||width<=0||width>1000||!finite(gap)||gap<0||gap>50||
  !finite(maxLengthCm)||maxLengthCm<=0||maxLengthCm>100000||
  !Number.isSafeInteger(maxCandidates)||maxCandidates<1||maxCandidates>300000)
  return blocked('INVALID_MARKER_SETTINGS','Fabric width, length, spacing or candidate budget invalid')
 const sourceProjectSha256=fingerprintIndustrialMarkerSource20261029(project)
 if(!sourceProjectSha256)return blocked('INVALID_MARKER_SOURCE_REVISION','Source project is not finite canonical JSON')
 const issues=[],rows=[],wires={},gradedBySize={},markersBySize={}
 // Snapshot the effective operator inputs. The subsequent cutroom preflight
 // must rebuild the marker from the current source using these exact options;
 // the project-only source hash must not be accepted as a placement receipt.
 let layoutSnapshot=null
 if(constrainedLayout!==null){
  try{
   if(!constrainedLayout||typeof constrainedLayout!=='object'||Array.isArray(constrainedLayout)||
    !['left','right',null].includes(constrainedLayout.foldEdge??null)||
    !constrainedLayout.defectZonesByFabric||
    typeof constrainedLayout.defectZonesByFabric!=='object'||
    Array.isArray(constrainedLayout.defectZonesByFabric))
    return blocked('INVALID_CONSTRAINED_LAYOUT','Explicit fold edge and per-fabric defect zones required')
   const sourceLayoutDigest=fingerprintIndustrialMarkerStudy20261029(constrainedLayout)
   if(!sourceLayoutDigest)return blocked('INVALID_CONSTRAINED_LAYOUT','Layout must be canonical JSON')
   if(typeof structuredClone!=='function')
    return blocked('INVALID_CONSTRAINED_LAYOUT','Runtime cannot snapshot layout')
   layoutSnapshot=structuredClone(constrainedLayout)
   if(fingerprintIndustrialMarkerStudy20261029(layoutSnapshot)!==sourceLayoutDigest)
    return blocked('INVALID_CONSTRAINED_LAYOUT','Layout changed during snapshot')
  }catch{return blocked('INVALID_CONSTRAINED_LAYOUT','Layout inspection or snapshot failed')}
 }
 const markerBuildOptions={version:1,fabricWidthCm:width,spacingCm:gap,maxLengthCm,maxCandidates,
  constrainedLayout:layoutSnapshot,usesSuppliedDxf:dxfBySize!==null,usesCutterProfile:cutterProfile!==null}
 try{
  const fabrics=[...new Set(project.pieces.map(p=>p.fabricId||'main'))]
  for(const size of sizes){
   const graded=gradeProject(project,size)
   gradedBySize[size]=graded
   // A supplied receiver-wire map is authoritative. Never silently replace a
   // missing or corrupted size with our own newly generated export.
   wires[size]=dxfBySize===null?projectToDxf(graded,size,{cutlineMode:'manufacturing',requireGradedGeometry:true}):dxfBySize?.[size]
   markersBySize[size]=buildFabricMarkers(graded,width,gap)
   for(const fabricId of fabrics){
    const fabricWidth=graded.markerSettings?.fabricWidthsCm?.[fabricId]??width
    if(!finite(fabricWidth)||fabricWidth<=0||fabricWidth>1000){issues.push({code:'INVALID_FABRIC_WIDTH',size,fabricId,detail:String(fabricWidth)});rows.push({size,fabricId,ok:false,marker:null,cutterStudy:null});continue}
    const constraints=inspectMarkerManufacturingConstraints20261028(graded,{fabricId,nap:true})
    const physical=constrainedLayout?.defectZonesByFabric?.[fabricId]
    const physicalFold=constrainedLayout?.foldEdge??null
    const authoredDefects=graded.markerSettings?.fabricDefectsByFabric?.[fabricId]??
      graded.markerSettings?.defectZonesByFabric?.[fabricId]??graded.markerSettings?.rollDefectsByFabric?.[fabricId]
    const originalDefects=project.markerSettings?.fabricDefectsByFabric?.[fabricId]??
      project.markerSettings?.defectZonesByFabric?.[fabricId]??project.markerSettings?.rollDefectsByFabric?.[fabricId]
    const authorizedPhysical=constrainedLayout!==null&&Array.isArray(physical)&&
      (authoredDefects===undefined||JSON.stringify(physical)===JSON.stringify(authoredDefects))&&
      (originalDefects===undefined||JSON.stringify(physical)===JSON.stringify(originalDefects))&&
      graded.markerSettings?.fabricDefects===undefined&&graded.markerSettings?.rollDefects===undefined
    const unresolved=constraints.filter(issue=>!authorizedPhysical||
      !((issue.code==='FABRIC_DEFECT_LAYOUT_UNVERIFIED'&&Array.isArray(physical))||
      (issue.code==='FOLD_LAYOUT_UNVERIFIED'&&physicalFold!==null)))
    if(unresolved.length){
     issues.push(...unresolved.map(issue=>({...issue,size,fabricId})))
     rows.push({size,fabricId,ok:false,marker:null,cutterStudy:null})
     continue
    }
    const pieces=graded.pieces.filter(p=>(p.fabricId||'main')===fabricId)
    // Polygon cutter study requires a homogeneous material and explicit grain/nap semantics.
    const safePieces=pieces.map(piece=>({...piece,cutQuantity:piece.cutQuantity??1,marker:{...piece.marker,nap:piece.marker?.nap??'one-way'}}))
    const missing=[]
    for(const piece of safePieces){
    const authoredFold=Boolean(piece.fold||piece.cutOnFold||piece.marker?.fold||piece.marker?.onFold)
    if(prohibited(piece)&&!(authorizedPhysical&&authoredFold&&physicalFold!==null&&
       !(piece.drills?.length||piece.holes?.length||piece.internalCutouts?.length||piece.cutHoles?.length||piece.marker?.repeat||piece.marker?.pairing||piece.marker?.fusing||piece.marker?.shade||piece.marker?.nap==='one-way'&&piece.marker?.allowReverseGrain)))
       missing.push(`${piece.id}: unsupported fold/drill/cutout/repeat/pairing or reverse-grain marking`)
     if((piece.internalLines||[]).length||(piece.buttonholes||[]).length)missing.push(`${piece.id}: internal lines or buttonholes require verified cutter transfer`)
     if(!finite(piece.grainAngleDeg))missing.push(`${piece.id}: explicit grainline orientation required`)
    }
    if(missing.length){issues.push(...missing.map(detail=>({code:'UNTRANSFERRED_MANUFACTURING_FEATURE',size,fabricId,detail})));rows.push({size,fabricId,ok:false,marker:null,cutterStudy:null});continue}
    const nest=nestPolygons({...graded,pieces:safePieces},{fabricWidth,gap,maxLength:maxLengthCm,maxCandidates,fabricId,placementOrder:'largest-first',
      foldEdge:physicalFold,defectZones:authorizedPhysical?physical:[]})
    if(!nest.ok){issues.push({code:'NEST_INCOMPLETE',size,fabricId,detail:JSON.stringify([...nest.errors,...nest.unplaced]).slice(0,400)});rows.push({size,fabricId,ok:false,marker:nest,cutterStudy:null});continue}
    const transfer=inspectNestedManufacturingMarks20261028(graded,nest,{size})
    if(!transfer.ok)issues.push(...transfer.issues.map(issue=>({...issue,size,fabricId})))
    const cuttingStudy=buildAccuMarkCutterPathStudy20261024(nest,{fabricWidthCm:fabricWidth,spaceCm:gap})
    if(!cuttingStudy.ok)issues.push({code:'CUT_STUDY_REFUSED',size,fabricId,detail:cuttingStudy.reason||cuttingStudy.code})
    const cutterQualification=cutterProfile&&cuttingStudy.ok&&transfer.ok?qualifyIndustrialCutterStudy20261028(cuttingStudy,transfer,cutterProfile,qualificationEvidence||{}):null
    if(cutterQualification&&!cutterQualification.ok)issues.push(...cutterQualification.issues.map(issue=>({...issue,size,fabricId})))
    rows.push({size,fabricId,ok:cuttingStudy.ok&&transfer.ok,marker:nest,cutterStudy:cuttingStudy,markTransfer:transfer,cutterQualification})
   }
  }
  const parity=auditMarkerDxfGeometryParity20261024(project,{dxfBySize:wires,gradedBySize,markersBySize,defaultFabricWidth:width,gap})
  if(!parity.ok)issues.push(...parity.issues.map(x=>({...x,code:`DXF_MARKER_${x.code}`})))
	  const study={ok:issues.length===0,status:issues.length?'BLOCKED':'DIGITAL_GEOMETRY_VERIFIED',issues,rows,
	   sourceProjectSha256,markerBuildOptions,
   sourceSizes:[...sizes],markerCount:rows.length,checkedDxFPlacements:parity.checkedPlacements,
   referenceMarkerParity:parity.ok,rollWidthCm:width,clearanceCm:gap,
   machineReady:false,cuttingAuthorized:false,manufacturingApproved:false,
   limitations:'Preview-only polygon nesting, DXF-verified transformed notch geometry and machine-neutral CUT study. Machine-specific notch/drill execution, fabric repeat, licensed CAD receiver and physical production acceptance not certified.'}
	  if(study.ok && dxfBySize===null && cutterProfile===null){
	   const key=buildKey(sourceProjectSha256,markerBuildOptions)
	   const digest=fingerprintIndustrialMarkerStudy20261029(study)
	   if(key&&digest){
	    verifiedBuilds.set(key,digest)
	    if(verifiedBuilds.size>64)verifiedBuilds.delete(verifiedBuilds.keys().next().value)
	   }
	  }
	  return study
 }catch(error){return {...blocked('MARKER_CUT_WORKFLOW_REFUSED',String(error.message||error)),rows}}
}
