// EXPERIMENTAL: construct an exactly rest-isometric, off-avatar staging pose
// for the actual EXO native panel mesh. This is an initial-state feasibility
// tool, NOT sewn cloth, collision-safe avatar re-entry, or a production fit.
// It cannot move pinned particles, alter sewing topology, or save garments.
import {auditNativePrincipalStrain} from './nativePrincipalStrainAudit.js'
import {measureNativeSeamResiduals} from './nativeSeamCandidateGate.js'
import {inspectNativeInterpanelBroadphase} from './nativeInterpanelBroadphaseResearch.js'
import {inspectNativeInterpanelExactStaticContact} from './nativeInterpanelExactContactResearch.js'
import {inspectNativeIntrapanelStaticContact} from './nativeIntrapanelContactResearch.js'

const finite3=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)
const expectedSamples=payload=>payload.pieces.reduce((sum,piece)=>
  sum+piece.particleIndices.length+piece.faces.length,0)

export function searchNativeOffbodyRestSeeds(reference,{
  offsetsM=[.35,.7,1.05,1.4],checkPose,strainLimitPercent=5,
  interpanelClearanceM=.001,maxAnchorDisplacementM=.001,
}={}){
  if(!Array.isArray(reference?.pieces)||reference.pieces.length<1||
     !Array.isArray(reference?.particles)||reference.particles.length<1)
    throw new TypeError('Offbody rest seed requires a native panel payload')
  if(!Array.isArray(offsetsM)||offsetsM.length<1||offsetsM.length>6||
     offsetsM.some(x=>!Number.isFinite(x)||x<0||x>2))
    throw new RangeError('Offbody search requires 1..6 offsets in [0, 2] metres')
  if(typeof checkPose!=='function')throw new TypeError('Offbody search requires an avatar contact screen')
  if(!Number.isFinite(maxAnchorDisplacementM)||maxAnchorDisplacementM<0||
     maxAnchorDisplacementM>.1)
    throw new RangeError('Invalid offbody anchor displacement limit')
  if(reference.anchors!==undefined&&!Array.isArray(reference.anchors))
    throw new TypeError('Offbody anchors must be an array')
  const anchors=(reference.anchors||[]).filter(anchor=>{
    if(!Number.isInteger(anchor?.particle)||anchor.particle<0||
       anchor.particle>=reference.particles.length||!finite3(anchor.target)||
       !Number.isFinite(anchor.stiffness)||anchor.stiffness<0||anchor.stiffness>1)
      throw new Error('Invalid offbody anchor constraint')
    if(anchor.axes!==null&&anchor.axes!==undefined&&
       (typeof anchor.axes!=='string'||!/^[xyz]{1,3}$/.test(anchor.axes)||
        new Set(anchor.axes).size!==anchor.axes.length))
      throw new Error('Unsupported offbody anchor axes')
    return anchor.stiffness>0
  })
  if(reference.particles.some(p=>p.invMass===0))
    throw new Error('Offbody rest seed refuses to displace pinned cloth')
  const seen=new Set()
  if(offsetsM.some(x=>{if(seen.has(x))return true;seen.add(x);return false}))
    throw new Error('Offbody offsets must be unique')
  const before=measureNativeSeamResiduals(reference)
  const results=[]
  let best=null
  for(const offsetM of offsetsM){
    const candidate=structuredClone(reference)
    const touched=new Set()
    for(const piece of candidate.pieces){
      const ids=piece.particleIndices,flat=piece.flatVerticesM
      if(!Array.isArray(ids)||!Array.isArray(flat)||ids.length!==flat.length||
         ids.length<3||!flat.every(finite3))
        throw new Error('Invalid rest panel geometry')
      if(flat.some(p=>Math.abs(p[2]-flat[0][2])>1e-9))
        throw new Error('Rest-isometric flat seed requires planar material coordinates')
      const original=ids.map(id=>reference.particles[id]?.position)
      if(!original.every(finite3))throw new Error('Invalid original panel coordinates')
      const mean=(points,axis)=>points.reduce((sum,p)=>sum+p[axis],0)/points.length
      const flatCenter=[mean(flat,0),mean(flat,1)]
      const worldCenter=[mean(original,0),mean(original,1),mean(original,2)]
      ids.forEach((id,index)=>{
        if(touched.has(id))throw new Error('Offbody seed found shared particle across panels')
        touched.add(id)
        const rest=flat[index]
        const point=[worldCenter[0]+rest[0]-flatCenter[0],
          worldCenter[1]+rest[1]-flatCenter[1],
          worldCenter[2]+offsetM]
        candidate.particles[id].position=point
        candidate.particles[id].previous=[...point]
      })
    }
    if(touched.size!==reference.particles.length)
      throw new Error('Offbody seed has particles outside garment panels')
    // A particle with invMass>0 may STILL be tethered by a soft anchor.
    // The old rest seed shifted both shoulder anchors by hundreds of mm,
    // then incorrectly labeled the off-body pose a feasible initializer.
    // Measure the constrained-axis displacement without changing anchor
    // targets, their stiffness or the user's original garment.
    let maximumAnchorDisplacementM=0,maximumAnchorTargetResidualM=0
    for(const anchor of anchors){
      const axes=anchor.axes||'xyz'
      const index=anchor.particle
      const before=reference.particles[index]?.position
      const after=candidate.particles[index]?.position
      if(!finite3(before)||!finite3(after))
        throw new Error('Invalid anchored particle position')
      const component=axis=>({x:0,y:1,z:2})[axis]
      maximumAnchorDisplacementM=Math.max(maximumAnchorDisplacementM,
        Math.hypot(...[...axes].map(axis=>after[component(axis)]-before[component(axis)])))
      maximumAnchorTargetResidualM=Math.max(maximumAnchorTargetResidualM,
        Math.hypot(...[...axes].map(axis=>after[component(axis)]-anchor.target[component(axis)])))
    }
    const anchorsCompatible=maximumAnchorDisplacementM<=maxAnchorDisplacementM+1e-12
    const strain=auditNativePrincipalStrain(candidate,{limitPercent:strainLimitPercent})
    const interpanel=inspectNativeInterpanelBroadphase(candidate,{
      clearanceM:interpanelClearanceM,
    })
    // AABB overlap is not itself cloth contact. An independently bounded
    // static triangle-distance screen can clear broadphase false positives;
    // genuine sub-thickness and intersecting faces still block the seed.
    // Neither static result establishes a safe folding or avatar-entry path.
    const exactInterpanel=inspectNativeInterpanelExactStaticContact(candidate,{
      clearanceM:interpanelClearanceM,
    })
    // Unlike the inter-panel AABB screen, same-panel nonadjacent triangle
    // pairs need narrow-phase testing: ordinary flat meshes have hundreds
    // of AABB overlaps between disjoint triangles. Reject actual static
    // self-intersections, not harmless broadphase false positives.
    const intrapanel=inspectNativeIntrapanelStaticContact(candidate,{
      clearanceM:interpanelClearanceM,
    })
    const contact=checkPose(candidate)
    if(!contact||contact.sampledAvatarClearanceOnly!==true||
       contact.checked!==expectedSamples(candidate)||
       !Number.isInteger(contact.penetrating)||contact.penetrating<0||
       contact.penetrating>contact.checked||
       !Number.isFinite(contact.maximumIntrusionMm)||contact.maximumIntrusionMm<0)
      throw new Error('Incomplete offbody avatar screen')
    const seams=measureNativeSeamResiduals(candidate)
    const clear=contact.penetrating===0
    const materialValid=strain.withinDeclaredStrainLimit
    const row={offsetM,maxGapMm:seams.maxGapMm,rmsGapMm:seams.rmsGapMm,
      maximumPrincipalExtensionPercent:strain.maximumPrincipalExtensionPercent,
      maximumPrincipalCompressionPercent:strain.maximumPrincipalCompressionPercent,
      violatingTriangles:strain.overLimitTriangles,
      contactChecked:contact.checked,contactPenetrations:contact.penetrating,
      contactClear:clear,materialValid,
      activeAnchorCount:anchors.length,anchorsCompatible,
      maximumAnchorDisplacementMm:maximumAnchorDisplacementM*1000,
      maximumAnchorTargetResidualMm:maximumAnchorTargetResidualM*1000,
      interpanelBroadphaseClear:interpanel.staticInterpanelBroadphaseClear,
      interpanelPotentialContactPairs:interpanel.possibleContactPairs,
      interpanelCheckedTrianglePairs:interpanel.checkedTrianglePairs,
      interpanelMinimumAabbDistanceMm:interpanel.minimumAabbDistanceMm,
      interpanelExactStaticClear:exactInterpanel.staticInterpanelExactClear,
      interpanelExactNearClearancePairs:exactInterpanel.nearClearancePairs,
      interpanelExactNarrowphasePairs:exactInterpanel.narrowphaseCheckedPairs,
      interpanelExactMinimumGapMm:exactInterpanel.minimumExactGapMm,
      interpanelExactNearClearanceExamples:exactInterpanel.nearClearanceExamples,
      intrapanelStaticIntersectionFree:
        intrapanel.staticNonadjacentTriangleIntersectionsAbsent,
      intrapanelIntersectingTrianglePairs:intrapanel.intersectingTrianglePairs,
      intrapanelEdgeNeighborNearFoldoverPairs:intrapanel.edgeNeighborNearFoldoverPairs,
      intrapanelNonadjacentNearClearancePairs:intrapanel.nonadjacentNearClearancePairs,
      intrapanelMinimumNearClearanceMm:intrapanel.minimumNearClearanceMm,
      intrapanelNearClearanceExamples:intrapanel.nearClearanceExamples,
      intrapanelPossibleAabbContactPairs:intrapanel.possibleAabbContactPairs,
      intrapanelCheckedNonadjacentPairs:intrapanel.checkedNonadjacentPairs,
      fitCertified:false,sweptCollisionCertified:false,selfCollisionCertified:false,
      safeToAutoApply:false}
    results.push(row)
    if(clear&&materialValid&&anchorsCompatible&&exactInterpanel.staticInterpanelExactClear&&
       intrapanel.staticDisjointThicknessScreenClear&&
       (!best||offsetM<best.row.offsetM))
      best={candidate,row}
  }
  return {before,results,best,trialCount:results.length,
    restAndEndpointFeasible:Boolean(best),
    sewingComplete:false,avatarReentryCertified:false,
    sweptCollisionCertified:false,selfCollisionCertified:false,
    fitCertified:false,safeToAutoApply:false}
}
