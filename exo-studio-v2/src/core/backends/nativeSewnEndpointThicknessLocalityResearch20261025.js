// Research-only locality audit for STATIC same-panel contact at a directly
// sewn, world-coincident endpoint. Material-space tip excision lets us ask
// whether contact also persists OUTSIDE a declared neighborhood. This does
// not waive the original contact veto, prove the excised tip is safe, or
// certify finite-thickness cloth contact / swept CCD.
import {diagnoseNativeSamePanelContactWitnesses20261025} from
  './nativeFoundationTeeSelfContactWitnessResearch20261025.js'
import {measureNativeTriangleDistanceM} from './nativeTriangleDistanceResearch.js'

const length=(a,b)=>Math.hypot(...a.map((x,i)=>x-b[i]))
const lerp=(a,b,t)=>a.map((x,i)=>x+t*(b[i]-x))

function exciseMaterialTip(piece,face,particles,sewnIndex,radiusM){
  const tip=face.indexOf(sewnIndex)
  if(tip<0)return null
  const a=face[tip],b=face[(tip+1)%3],c=face[(tip+2)%3]
  const material=piece.flatVerticesM
  const dAB=length(material[a],material[b])
  const dAC=length(material[a],material[c])
  // A full-edge excision would erase material evidence. Refuse rather than
  // infer a clearance result from a missing/degenerate remnant.
  if(!(dAB>radiusM&&dAC>radiusM))return null
  const world=index=>particles[piece.particleIndices[index]]?.position
  const [A,B,C]=[world(a),world(b),world(c)]
  if([A,B,C].some(p=>!Array.isArray(p)||p.length!==3||
    !p.every(Number.isFinite)))throw new Error('Invalid sewn-tip world geometry')
  const cutAB=lerp(A,B,radiusM/dAB)
  const cutAC=lerp(A,C,radiusM/dAC)
  // The quadrilateral (cutAB,B,C,cutAC) exactly covers the original
  // triangle minus the corner whose two incident material edges were
  // trimmed by radiusM. It is NOT a circular material-space excision.
  return [[cutAB,B,C],[cutAB,C,cutAC]]
}

export function auditNativeSewnEndpointThicknessLocality20261025(payload,{
  clearanceM=.001,materialTipExcisionM=.005,maxPairs=500_000,
}={}){
  if(!Number.isFinite(clearanceM)||clearanceM<=0||clearanceM>.1)
    throw new RangeError('Invalid sewn-tip clearance')
  if(!Number.isFinite(materialTipExcisionM)||
    materialTipExcisionM<=0||materialTipExcisionM>.05)
    throw new RangeError('Invalid sewn-tip material excision')
  if(!Number.isInteger(maxPairs)||maxPairs<1||maxPairs>5_000_000)
    throw new RangeError('Invalid sewn-tip work budget')
  const before=JSON.stringify(payload)
  const base=diagnoseNativeSamePanelContactWitnesses20261025(payload,{
    clearanceM,maxPairs,
  })
  const pieces=new Map(payload.pieces.map(p=>[p.id,p]))
  const witnesses=base.witnesses.map(w=>{
    const defaultResult={...w,materialTipExcisionMm:materialTipExcisionM*1000,
      outsideSewnNeighborhoodDistanceMm:null,
      outsideSewnNeighborhoodClear:null,contactVetoRetained:true}
    if(w.strictTransverseCrossings.length)
      return {...defaultResult,locality:'strict-transverse-piercing'}
    // A missing, blank or duplicated seam ID is not useful evidence of an
    // authored sewing endpoint. This still does NOT authenticate a caller's
    // supplied sewing inventory against the canonical garment.
    const sewn=w.coincidentDistinctMaterialVertices.filter(c=>{
      const ids=c.directSewingSeamIds
      return ids.length>0&&ids.every(id=>
        typeof id==='string'&&id.trim().length>0)&&
        new Set(ids).size===ids.length
    })
    if(sewn.length!==1)
      return {...defaultResult,locality:'no-unique-direct-sewn-endpoint'}
    const piece=pieces.get(w.pieceId)
    const first=exciseMaterialTip(piece,piece.faces[w.faceA],
      payload.particles,sewn[0].indexA,materialTipExcisionM)
    const second=exciseMaterialTip(piece,piece.faces[w.faceB],
      payload.particles,sewn[0].indexB,materialTipExcisionM)
    if(!first||!second)
      return {...defaultResult,locality:'insufficient-material-neighborhood'}
    let distanceM=Infinity
    for(const a of first)for(const b of second)
      distanceM=Math.min(distanceM,measureNativeTriangleDistanceM(a,b))
    // This clearance only applies to the two retained polygons. The
    // removed material neighborhood remains unverified and the original
    // contact veto remains mandatory even if distanceM >= clearanceM.
    const clear=distanceM>=clearanceM
    return {...defaultResult,locality:clear?
      'outside-excised-sewn-tip-clear':'contact-persists-outside-excised-sewn-tip',
      directSewingSeamIds:[...sewn[0].directSewingSeamIds],
      outsideSewnNeighborhoodDistanceMm:distanceM*1000,
      outsideSewnNeighborhoodClear:clear}
  })
  if(JSON.stringify(payload)!==before)
    throw new Error('Sewn-tip locality audit mutated source state')
  const tested=witnesses.filter(w=>w.outsideSewnNeighborhoodClear!==null)
  return {scope:'static-sewn-endpoint-locality-only',
    materialTipExcisionMm:materialTipExcisionM*1000,
    clearanceMm:clearanceM*1000,
    totalIntersectionWarnings:base.totalIntersectionWarnings,
    witnessInventoryComplete:base.witnessInventoryComplete,
    testedSewnEndpointWitnesses:tested.length,
    outsideSewnNeighborhoodClearWitnesses:tested.filter(w=>
      w.outsideSewnNeighborhoodClear).length,
    persistentOutsideSewnNeighborhoodContactWitnesses:tested.filter(w=>
      !w.outsideSewnNeighborhoodClear).length,
    uninspectedIntersectionWarnings:base.uninspectedIntersectionWarnings,
    witnesses,
    allSampledWarningsClearOutsideExcision:base.witnessInventoryComplete&&
      witnesses.length===base.totalIntersectionWarnings&&
      witnesses.length>0&&witnesses.every(w=>w.outsideSewnNeighborhoodClear===true),
    originalStaticContactClear:base.staticContactClear,
    contactVetoRetained:true,sourceNonmutationVerified:true,
    authoredSewingProvenanceAuthenticated:false,
    excisedMaterialNeighborhoodVerified:false,
    fullFiniteThicknessCertified:false,physicalAcceptance:false,
    continuousDeformableCCDCertified:false,safeToAutoApply:false}
}
