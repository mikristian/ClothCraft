// Research-only independent cloth-contact gate for TWO sequential hinge arcs.
// The existing coupled search checks avatar samples; it does not establish
// cloth/cloth clearance. Check both inter-panel and nonadjacent same-panel
// triangles at endpoints AND along the actual curved folds before treating a
// seam improvement as eligible for further research. Conservative swept boxes
// now cover inter-panel AND nonadjacent same-panel pairs between samples;
// overlap can be a false positive. This is NOT narrow-phase swept CCD,
// cloth thickness certification or a production fitting solver.
import {createNativeDevelopableHingeCandidate} from './nativeDevelopableHingeResearch.js'
import {inspectNativeInterpanelBroadphase} from './nativeInterpanelBroadphaseResearch.js'
import {inspectNativeIntrapanelStaticContact} from './nativeIntrapanelContactResearch.js'
import {auditNativePrincipalStrain} from './nativePrincipalStrainAudit.js'
import {auditNativeSeamCandidate} from './nativeSeamCandidateGate.js'
import {inspectNativeFacePairRestTopology} from './nativeClothContactTopologyResearch.js'
import {measureNativeTriangleDistanceM} from './nativeTriangleDistanceResearch.js'

const finite3=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)
const samplesExpected=p=>p.pieces.reduce((n,x)=>n+x.particleIndices.length+x.faces.length,0)

// A vertex on a rigid hinge arc can bow beyond the AABB of two sampled
// endpoints. Its maximum distance from the endpoint chord is the sagitta:
// |end-start| * tan(|deltaAngle|/4) / 2. Inflating each vertex's endpoint
// bounds by this amount encloses its entire circular arc, not just the
// sampled positions. Triangle AABBs then enclose the moving triangle for
// the WHOLE interval. Overlap is only a conservative potential contact;
// this is not swept triangle/triangle narrow-phase or cloth-thickness CCD.
function sweptPanelBoxes(start,end,piece,deltaAngle){
  return piece.faces.map(face=>{
    if(!Array.isArray(face)||face.length!==3||new Set(face).size!==3)
      throw new Error('Invalid swept hinge triangle topology')
    const vertices=face.map(local=>{
      if(!Number.isInteger(local)||local<0||local>=piece.particleIndices.length)
        throw new Error('Swept hinge triangle index outside panel')
      const index=piece.particleIndices[local]
      const a=start.particles[index]?.position,b=end.particles[index]?.position
      if(!finite3(a)||!finite3(b))throw new Error('Invalid swept hinge vertex')
      const sagitta=Math.hypot(...a.map((x,k)=>x-b[k]))*
        Math.tan(Math.abs(deltaAngle)/4)/2
      return {start:a,end:b,radius:sagitta,
        min:a.map((x,k)=>Math.min(x,b[k])-sagitta),
        max:a.map((x,k)=>Math.max(x,b[k])+sagitta)}
    })
    return {vertices,
      min:[0,1,2].map(k=>Math.min(...vertices.map(v=>v.min[k]))),
      max:[0,1,2].map(k=>Math.max(...vertices.map(v=>v.max[k])))}
  })
}

const sub=(a,b)=>a.map((x,i)=>x-b[i])
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],
  a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
const dot=(a,b)=>a.reduce((n,x,i)=>n+x*b[i],0)
const boxDistance=(a,b)=>Math.hypot(...[0,1,2].map(k=>
  Math.max(0,a.min[k]-b.max[k],b.min[k]-a.max[k])))

// Diagnostic only: exact Euclidean distance between two nondegenerate,
// coplanar STATIC triangles, including edge crossings and containment.
// For noncoplanar faces return null rather than pretending a projected 2D
// distance certifies 3D clearance. Never use this to waive a contact veto.
function staticCoplanarGapM(a,b){
  const pa=a.vertices.map(v=>v.start),pb=b.vertices.map(v=>v.start)
  const na=cross(sub(pa[1],pa[0]),sub(pa[2],pa[0]))
  const nb=cross(sub(pb[1],pb[0]),sub(pb[2],pb[0]))
  const la=Math.hypot(...na),lb=Math.hypot(...nb)
  if(la<1e-14||lb<1e-14)return null
  if(Math.hypot(...cross(na,nb))/(la*lb)>1e-9||
     pb.some(p=>Math.abs(dot(na,sub(p,pa[0])))/la>1e-9))return null
  const skip=[0,1,2].sort((i,j)=>Math.abs(na[j])-Math.abs(na[i]))[0]
  const project=p=>p.filter((_,i)=>i!==skip)
  const x=pa.map(project),y=pb.map(project)
  const orient=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-
    (q[1]-p[1])*(r[0]-p[0])
  const inside=(p,t)=>{
    const signs=[0,1,2].map(i=>orient(t[i],t[(i+1)%3],p))
    return signs.every(v=>v>=-1e-14)||signs.every(v=>v<=1e-14)
  }
  if(x.some(p=>inside(p,y))||y.some(p=>inside(p,x)))return 0
  const pointSegment=(p,u,v)=>{
    const dx=v[0]-u[0],dy=v[1]-u[1],length2=dx*dx+dy*dy
    const t=length2>0?Math.max(0,Math.min(1,
      ((p[0]-u[0])*dx+(p[1]-u[1])*dy)/length2)):0
    return Math.hypot(p[0]-u[0]-t*dx,p[1]-u[1]-t*dy)
  }
  let closest=Infinity
  for(let i=0;i<3;i++)for(let j=0;j<3;j++){
    const p=x[i],q=x[(i+1)%3],u=y[j],v=y[(j+1)%3]
    const o1=orient(p,q,u),o2=orient(p,q,v)
    const o3=orient(u,v,p),o4=orient(u,v,q)
    if(((o1>=0&&o2<=0)||(o1<=0&&o2>=0))&&
       ((o3>=0&&o4<=0)||(o3<=0&&o4>=0)))return 0
    closest=Math.min(closest,pointSegment(p,u,v),pointSegment(q,u,v),
      pointSegment(u,p,q),pointSegment(v,p,q))
  }
  return closest
}

// A bounded, conservative separating-axis *filter* for swept triangles.
// Every circular vertex arc is enclosed by its two endpoints plus a ball of
// radius equal to the arc sagitta. Projection intervals therefore contain
// every point of each moving triangle throughout the hinge interval. If ANY
// axis separates those intervals by more than clearance, the pair cannot
// touch. Otherwise it remains a potential collision, never a proven hit.
// Include in-plane edge normals to resolve coplanar AABB false positives.
function sweptPairProvablySeparated(a,b,clearanceM){
  const edgeSets=shape=>['start','end'].map(key=>{
    const p=shape.vertices.map(v=>v[key])
    const edges=[sub(p[1],p[0]),sub(p[2],p[1]),sub(p[0],p[2])]
    return {edges,normal:cross(edges[0],sub(p[2],p[0]))}
  })
  const ae=edgeSets(a),be=edgeSets(b)
  const axes=[...ae,...be].flatMap(({edges,normal})=>[
    normal,...edges.map(edge=>cross(normal,edge))])
  for(const x of ae)for(const y of be)
    for(const u of x.edges)for(const v of y.edges)axes.push(cross(u,v))
  for(const axis of axes){
    const magnitude=Math.hypot(...axis)
    if(magnitude<1e-12)continue
    const unit=axis.map(x=>x/magnitude)
    const interval=shape=>{
      let min=Infinity,max=-Infinity
      for(const vertex of shape.vertices)for(const point of [vertex.start,vertex.end]){
        const projection=dot(point,unit)
        min=Math.min(min,projection-vertex.radius)
        max=Math.max(max,projection+vertex.radius)
      }
      return {min,max}
    }
    const x=interval(a),y=interval(b)
    if(x.max+clearanceM<y.min||y.max+clearanceM<x.min)return true
  }
  return false
}

// A fold is a single rigid rotation on its moving material side; all other
// vertices remain fixed. Two nonadjacent triangles on the SAME rigid side
// cannot change their relative separation during that interval. This is a
// different certificate from subdividing the already-overlapping swept boxes.
// Vertices classified on the fold axis are fixed by the implementation, even
// when the accepted world-axis tolerance leaves them slightly off the exact
// line. Inflate their static projection by the maximum missing rigid motion
// instead of silently assuming exact collinearity.
function rigidSideClasses(start,piece,hinge,deltaAngle){
  if(piece.id!==hinge.panelId)return piece.particleIndices.map(()=>({moving:false,axis:false,error:0}))
  // Match the hinge constructor's *actual* material-side classification.
  // A caller may widen restToleranceM (up to 1 mm); vertices inside that
  // band are pinned, not rotated. Using a hard-coded 1e-8 here incorrectly
  // classifies those pinned vertices as moving and can waive swept contact
  // between a rotating triangle and one containing a pinned near-axis point.
  const restToleranceM=hinge.restToleranceM??1e-8
  const [i,j]=hinge.axisVertices
  const rest=piece.flatVerticesM
  const a=rest[i],b=rest[j]
  const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)
  if(!Number.isFinite(length)||length<1e-6)throw new Error('Invalid rigid-side hinge material axis')
  const wa=start.particles[piece.particleIndices[i]]?.position
  const wb=start.particles[piece.particleIndices[j]]?.position
  const direction=sub(wb,wa),worldLength=Math.hypot(...direction)
  if(!Number.isFinite(worldLength)||worldLength<1e-6)
    throw new Error('Invalid rigid-side hinge world axis')
  const unit=direction.map(x=>x/worldLength)
  return rest.map((p,k)=>{
    const signed=(dx*(p[1]-a[1])-dy*(p[0]-a[0]))/length
    const axis=Math.abs(signed)<=restToleranceM
    const moving=hinge.side==='positive'?signed>restToleranceM:signed< -restToleranceM
    const position=start.particles[piece.particleIndices[k]]?.position
    const distance=axis?Math.hypot(...cross(sub(position,wa),unit)):0
    return {moving,axis,error:axis?2*distance*Math.sin(Math.abs(deltaAngle)/2):0}
  })
}

function rigidPairSeparation(a,b,faceA,faceB,classes,clearanceM){
  const all=[...faceA,...faceB].map(i=>classes[i])
  const fixed=all.every(v=>!v.moving)
  const corotating=all.every(v=>v.moving||v.axis)
  if(!fixed&&!corotating)return null
  const staticShape=(shape,face)=>({vertices:shape.vertices.map((v,k)=>({
    start:v.start,end:v.start,radius:corotating?classes[face[k]].error:0,
  }))})
  if(sweptPairProvablySeparated(staticShape(a,faceA),
    staticShape(b,faceB),clearanceM))return 'axis'
  // The SAT filter is conservative but can fail to separate diagonal gaps
  // larger than thickness: no individual projection need exceed clearance.
  // For fixed pairs the relative geometry is constant. For co-rotating pairs,
  // both faces undergo the SAME rigid transform, except material-axis points
  // that the hinge implementation pins in place. Their maximum deviation
  // from that common rotation is already bounded by classes[].error.
  const maxError=face=>corotating?
    Math.max(...face.map(index=>classes[index].error)):0
  const distance=measureNativeTriangleDistanceM(
    a.vertices.map(v=>v.start),b.vertices.map(v=>v.start))
  const conservativeError=maxError(faceA)+maxError(faceB)
  // Strict separation, with an additional rounding margin: never waive a
  // possible collision at the threshold or on uncertain moving-side pairs.
  if(distance>clearanceM+conservativeError+
     64*Number.EPSILON*Math.max(1,distance))return 'exact'
  return null
}

function inspectSweptInterpanelInterval(start,end,deltaAngle,clearanceM){
  const boxes=start.pieces.map(piece=>sweptPanelBoxes(start,end,piece,deltaAngle))
  let checked=0,possible=0,aabbPossible=0,axisSeparated=0
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
    for(const a of boxes[i])for(const b of boxes[j]){
      checked++
      if(boxDistance(a,b)>clearanceM)continue
      aabbPossible++
      if(sweptPairProvablySeparated(a,b,clearanceM))axisSeparated++
      else possible++
    }
  }
  return {checked,possible,aabbPossible,axisSeparated}
}

// A within-panel pair can cross between otherwise clear hinge samples.
// Exclude faces sharing a material vertex (as in the independent static
// narrowphase), but conservatively veto overlapping swept boxes for every
// other pair. These are possible contacts, NOT proven swept intersections.
function inspectSweptIntrapanelInterval(start,end,deltaAngle,clearanceM,hinge){
  let checked=0,possible=0,aabbPossible=0,axisSeparated=0,rigidSeparated=0
  let exactRigidSeparated=0
  const unresolved=[]
  for(const piece of start.pieces){
    const boxes=sweptPanelBoxes(start,end,piece,deltaAngle)
    const classes=rigidSideClasses(start,piece,hinge,deltaAngle)
    for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
      if(piece.faces[i].some(vertex=>piece.faces[j].includes(vertex)))continue
      checked++
      const a=boxes[i],b=boxes[j]
      if(boxDistance(a,b)>clearanceM)continue
      aabbPossible++
      if(sweptPairProvablySeparated(a,b,clearanceM))axisSeparated++
      else{
        const rigidReason=rigidPairSeparation(a,b,piece.faces[i],piece.faces[j],
          classes,clearanceM)
        if(rigidReason){
          rigidSeparated++
          if(rigidReason==='exact')exactRigidSeparated++
          continue
        }
        possible++
        if(unresolved.length<16){
          const stationary=[...piece.faces[i],...piece.faces[j]]
            .every(vertex=>!classes[vertex].moving)
          const gapM=stationary?staticCoplanarGapM(a,b):null
          unresolved.push({panelId:piece.id,faceA:i,faceB:j,
            ...inspectNativeFacePairRestTopology(piece,i,j),
            sweptAabbDistanceMm:boxDistance(a,b)*1000,
            stationaryCoplanarGapMm:gapM===null?null:gapM*1000,
            stationaryClearanceDeficitMm:gapM===null?null:
              Math.max(0,clearanceM-gapM)*1000,
          })
        }
      }
    }
  }
  return {checked,possible,aabbPossible,axisSeparated,rigidSeparated,
    exactRigidSeparated,unresolved}
}

function activeAnchors(reference){
  if(reference.anchors!==undefined&&!Array.isArray(reference.anchors))
    throw new Error('Invalid coupled-cloth anchors')
  return (reference.anchors||[]).filter(anchor=>{
    if(!Number.isInteger(anchor?.particle)||anchor.particle<0||
       anchor.particle>=reference.particles.length||!finite3(anchor.target)||
       !Number.isFinite(anchor.stiffness)||anchor.stiffness<0||anchor.stiffness>1||
       (anchor.axes!==undefined&&anchor.axes!==null&&
        (typeof anchor.axes!=='string'||!/^[xyz]{1,3}$/.test(anchor.axes)||
         new Set(anchor.axes).size!==anchor.axes.length)))
      throw new Error('Invalid coupled-cloth anchor constraint')
    return anchor.stiffness>0
  })
}

function anchorDisplacement(reference,pose,anchors){
  let maximumM=0
  for(const anchor of anchors){
    const a=reference.particles[anchor.particle]?.position
    const b=pose.particles[anchor.particle]?.position
    if(!finite3(a)||!finite3(b))throw new Error('Invalid coupled-cloth anchor position')
    const indices=[...(anchor.axes||'xyz')].map(axis=>({x:0,y:1,z:2})[axis])
    maximumM=Math.max(maximumM,Math.hypot(...indices.map(i=>a[i]-b[i])))
  }
  return maximumM
}

export function auditNativeCoupledClothTrajectory(reference,{
  first,second,firstAngleRadians,secondAngleRadians,
  steps=4,checkPose,clearanceM=.001,strainLimitPercent=5,
  maxAnchorDisplacementM=.001,maxTotalPairs=4_000_000,
}={}){
  if(!Array.isArray(reference?.pieces)||reference.pieces.length<2||
     !Array.isArray(reference?.particles)||typeof checkPose!=='function')
    throw new TypeError('Coupled cloth audit requires panels and avatar evaluator')
  if(!Number.isInteger(steps)||steps<2||steps>8)
    throw new RangeError('Coupled cloth path requires 2..8 subdivisions')
  if(!Number.isInteger(maxTotalPairs)||maxTotalPairs<1||maxTotalPairs>5_000_000)
    throw new RangeError('Invalid coupled cloth total pair budget')
  if(!Number.isFinite(clearanceM)||clearanceM<0||clearanceM>.1)
    throw new RangeError('Invalid coupled cloth clearance')
  if(!Number.isFinite(maxAnchorDisplacementM)||maxAnchorDisplacementM<0||
     maxAnchorDisplacementM>.1)
    throw new RangeError('Invalid coupled cloth anchor tolerance')
  // Preflight the worst-case pair count BEFORE evaluating any trajectory.
  // The static same-panel checker now includes shared-edge pairs to catch
  // coplanar fold-overs, so all face pairs must be budgeted.
  const faces=reference.pieces.map(p=>p.faces?.length)
  if(faces.some(n=>!Number.isInteger(n)||n<1))
    throw new Error('Invalid coupled cloth triangle count')
  const interUpper=faces.reduce((n,a,i)=>n+
    faces.slice(i+1).reduce((s,b)=>s+a*b,0),0)
  const intraUpper=faces.reduce((n,a)=>n+a*(a-1)/2,0)
  const poseCount=3+2*(steps-1)
  // In addition to sampled poses, bound EVERY inter-sample hinge interval
  // for both cross-panel and nonadjacent same-panel triangle pairs.
  // Include these pair checks in the budget before creating any candidates.
  if((interUpper+intraUpper)*(poseCount+2*steps)>maxTotalPairs)
    throw new RangeError('Coupled cloth path exceeds total pair budget')

  const anchors=activeAnchors(reference)
  const intermediate=createNativeDevelopableHingeCandidate(reference,{
    ...first,angleRadians:firstAngleRadians}).candidate
  const final=createNativeDevelopableHingeCandidate(intermediate,{
    ...second,angleRadians:secondAngleRadians}).candidate
  const poses=[{stage:0,fraction:0,kind:'initial',pose:reference},
    {stage:1,fraction:1,kind:'endpoint',pose:intermediate},
    {stage:2,fraction:1,kind:'endpoint',pose:final}]
  for(let i=1;i<steps;i++){
    const fraction=i/steps
    poses.push({stage:1,fraction,kind:'hinge-arc',
      pose:createNativeDevelopableHingeCandidate(reference,{
        ...first,angleRadians:firstAngleRadians*fraction}).candidate})
    poses.push({stage:2,fraction,kind:'hinge-arc',
      pose:createNativeDevelopableHingeCandidate(intermediate,{
        ...second,angleRadians:secondAngleRadians*fraction}).candidate})
  }
  let checkedSweptInterpanelPairs=0,possibleSweptInterpanelContacts=0
  let checkedSweptIntrapanelPairs=0,possibleSweptIntrapanelContacts=0
  let sweptInterpanelAabbPotentials=0,sweptIntrapanelAabbPotentials=0
  let sweptInterpanelAxisSeparations=0,sweptIntrapanelAxisSeparations=0
  let sweptIntrapanelRigidSeparations=0
  let sweptIntrapanelExactRigidSeparations=0
  const sweptIntrapanelUnresolvedExamples=[]
  for(const {stage,start,angle,hinge} of [
    {stage:1,start:reference,angle:firstAngleRadians,hinge:first},
    {stage:2,start:intermediate,angle:secondAngleRadians,hinge:second},
  ]){
    const ordered=[{fraction:0,pose:start},...poses.filter(p=>p.stage===stage)]
      .sort((a,b)=>a.fraction-b.fraction)
    for(let i=1;i<ordered.length;i++){
      const interval=inspectSweptInterpanelInterval(
        ordered[i-1].pose,ordered[i].pose,
        angle*(ordered[i].fraction-ordered[i-1].fraction),clearanceM)
      checkedSweptInterpanelPairs+=interval.checked
      possibleSweptInterpanelContacts+=interval.possible
      sweptInterpanelAabbPotentials+=interval.aabbPossible
      sweptInterpanelAxisSeparations+=interval.axisSeparated
      const selfInterval=inspectSweptIntrapanelInterval(
        ordered[i-1].pose,ordered[i].pose,
        angle*(ordered[i].fraction-ordered[i-1].fraction),clearanceM,hinge)
      checkedSweptIntrapanelPairs+=selfInterval.checked
      possibleSweptIntrapanelContacts+=selfInterval.possible
      sweptIntrapanelAabbPotentials+=selfInterval.aabbPossible
      sweptIntrapanelAxisSeparations+=selfInterval.axisSeparated
      sweptIntrapanelRigidSeparations+=selfInterval.rigidSeparated
      sweptIntrapanelExactRigidSeparations+=selfInterval.exactRigidSeparated
      for(const example of selfInterval.unresolved){
        if(sweptIntrapanelUnresolvedExamples.length>=16)break
        sweptIntrapanelUnresolvedExamples.push({stage,
          fractionStart:ordered[i-1].fraction,fractionEnd:ordered[i].fraction,
          ...example})
      }
    }
  }
  const expected=samplesExpected(reference)
  let checkedInterpanelPairs=0,checkedIntrapanelPairs=0
  let possibleInterpanelContacts=0,selfIntersections=0,avatarPenetrations=0
  let edgeNeighborNearFoldoverPairs=0,nonadjacentNearClearancePairs=0
  let maximumPrincipalExtensionPercent=0,maximumPrincipalCompressionPercent=0
  let maximumAnchorDisplacementMm=0
  const samples=[]
  let finalAvatar=null
  for(const {stage,fraction,kind,pose} of poses){
    const avatar=checkPose(pose)
    if(avatar?.sampledAvatarClearanceOnly!==true||avatar.checked!==expected||
       !Number.isInteger(avatar.penetrating)||avatar.penetrating<0||
       avatar.penetrating>expected||!Number.isFinite(avatar.maximumIntrusionMm)||
       avatar.maximumIntrusionMm<0)
      throw new Error('Incomplete coupled cloth avatar screen')
    if(stage===2&&kind==='endpoint')finalAvatar=avatar
    const inter=inspectNativeInterpanelBroadphase(pose,{clearanceM})
    const intra=inspectNativeIntrapanelStaticContact(pose,{clearanceM})
    const strain=auditNativePrincipalStrain(pose,{limitPercent:strainLimitPercent})
    const anchorMm=anchorDisplacement(reference,pose,anchors)*1000
    maximumAnchorDisplacementMm=Math.max(maximumAnchorDisplacementMm,anchorMm)
    maximumPrincipalExtensionPercent=Math.max(maximumPrincipalExtensionPercent,
      strain.maximumPrincipalExtensionPercent)
    maximumPrincipalCompressionPercent=Math.max(maximumPrincipalCompressionPercent,
      strain.maximumPrincipalCompressionPercent)
    checkedInterpanelPairs+=inter.checkedTrianglePairs
    checkedIntrapanelPairs+=intra.checkedTotalPairs
    possibleInterpanelContacts+=inter.possibleContactPairs
    selfIntersections+=intra.intersectingTrianglePairs
    edgeNeighborNearFoldoverPairs+=intra.edgeNeighborNearFoldoverPairs
    nonadjacentNearClearancePairs+=intra.nonadjacentNearClearancePairs
    avatarPenetrations+=avatar.penetrating
    samples.push({stage,fraction,kind,avatarChecked:avatar.checked,
      avatarPenetrations:avatar.penetrating,
      maximumIntrusionMm:avatar.maximumIntrusionMm,
      interpanelPotentialContacts:inter.possibleContactPairs,
      intrapanelIntersections:intra.intersectingTrianglePairs,
      edgeNeighborNearFoldoverPairs:intra.edgeNeighborNearFoldoverPairs,
      nonadjacentNearClearancePairs:intra.nonadjacentNearClearancePairs,
      strainWithinLimit:strain.withinDeclaredStrainLimit,
      anchorDisplacementMm:anchorMm})
  }
  const arcSamples=samples.filter(s=>s.kind==='hinge-arc').map(s=>({
    fraction:s.fraction,checked:s.avatarChecked,
    penetrating:s.avatarPenetrations,maximumIntrusionMm:s.maximumIntrusionMm,
  }))
  const pathContact={samples:arcSamples,intermediateSamples:arcSamples.length,
    checked:arcSamples.reduce((n,s)=>n+s.checked,0),
    penetrating:arcSamples.reduce((n,s)=>n+s.penetrating,0),
    maximumIntrusionMm:Math.max(...arcSamples.map(s=>s.maximumIntrusionMm)),
    sampledIntermediateClearanceOnly:true,sweptCollisionCertified:false}
  // Reuse the independently implemented material/topology/rest-conditioning,
  // pinned-particle and per-seam-group gate rather than silently bypassing it.
  const gate=auditNativeSeamCandidate(reference,final,{
    strainLimitPercent,endpointContact:finalAvatar,sampledPathContact:pathContact,
  })
  const {before,after,merit,groupMerit}=gate
  const materialValid=samples.every(x=>x.strainWithinLimit)
  const anchorsValid=maximumAnchorDisplacementMm<=maxAnchorDisplacementM*1000+1e-9
  const contactClear=avatarPenetrations===0&&possibleInterpanelContacts===0&&
    selfIntersections===0&&edgeNeighborNearFoldoverPairs===0&&
    nonadjacentNearClearancePairs===0&&
    possibleSweptInterpanelContacts===0&&
    possibleSweptIntrapanelContacts===0
  return {before,after,merit,groupMerit,meshConditioning:gate.meshConditioning,
    pinsUnchanged:gate.pinsUnchanged,intermediate,final,
    endpointSamples:3,intermediateSamples:2*(steps-1),samples,
    checkedInterpanelPairs,checkedIntrapanelPairs,possibleInterpanelContacts,
    checkedSweptInterpanelPairs,possibleSweptInterpanelContacts,
    checkedSweptIntrapanelPairs,possibleSweptIntrapanelContacts,
    sweptInterpanelAabbPotentials,sweptIntrapanelAabbPotentials,
    sweptInterpanelAxisSeparations,sweptIntrapanelAxisSeparations,
    sweptIntrapanelRigidSeparations,
    sweptIntrapanelExactRigidSeparations,
    sweptIntrapanelUnresolvedExamples,
    conservativeSweptInterpanelBroadphaseOnly:true,
    conservativeSweptIntrapanelBroadphaseOnly:true,
    intrapanelIntersections:selfIntersections,edgeNeighborNearFoldoverPairs,
    nonadjacentNearClearancePairs,
    avatarPenetrations,
    maximumPrincipalExtensionPercent,maximumPrincipalCompressionPercent,
    maximumAnchorDisplacementMm,materialValid,anchorsValid,contactClear,
    researchScreenPassed:contactClear&&materialValid&&anchorsValid&&
      gate.researchScreenPassed,
    sweptCollisionCertified:false,clothThicknessCertified:false,
    avatarEntryCertified:false,fitCertified:false,safeToAutoApply:false}
}
