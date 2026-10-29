// Detached, research-only provenance preflight for the original four-panel
// Foundation Tee native mesh. The reference is regenerated from the canonical
// source template, NOT taken from the candidate under inspection. This binds
// the sewn-tip locality report to the expected 102 direct seam correspondences
// and unchanged MATERIAL/solver parameters while allowing a different
// world-space pose (positions and previous positions only).
// This is code-derived identity, not an independently signed factory baseline,
// cloth-thickness certification or authorization to waive any contact veto.
import {createTemplateProject} from '../../data/templates.js'
import {buildNativeSimulationPayload} from './nativePayload.js'
import {auditNativeSewnEndpointThicknessLocality20261025} from
  './nativeSewnEndpointThicknessLocalityResearch20261025.js'

const fail=()=>{throw new Error('Foundation Tee canonical material/sewing identity mismatch')}
const sameVector=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&
  a.length===b.length&&a.every((x,i)=>Number.isFinite(x)&&x===b[i])
const sameMatrix=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&
  a.length===b.length&&a.every((row,i)=>sameVector(row,b[i]))
const constraintKey=c=>{
  if(!c||typeof c.type!=='string'||!Number.isInteger(c.a)||
    !Number.isInteger(c.b)||c.a===c.b||
    (c.type==='seam'&&(typeof c.seamId!=='string'||!c.seamId.trim())))
    fail()
  // Bind the entire structural/bending/sewing law, not merely a seam's
  // endpoint identities. Pair orientation has no physical significance.
  const fields=Object.keys(c).filter(k=>k!=='a'&&k!=='b').sort()
    .map(k=>[k,c[k]])
  return JSON.stringify([Math.min(c.a,c.b),Math.max(c.a,c.b),fields])
}

function requireCanonicalTeeMaterialAndSeams(payload,reference){
  if(!Array.isArray(payload?.pieces)||!Array.isArray(payload.particles)||
    !Array.isArray(payload.constraints)||
    payload.pieces.length!==reference.pieces.length||
    payload.particles.length!==reference.particles.length||
    !Array.isArray(payload.virtualSeams)||payload.virtualSeams.length!==0||
    JSON.stringify(Object.keys(payload).sort())!==
      JSON.stringify(Object.keys(reference).sort()))
    fail()
  // Static project, collision exclusions, source materials, attachment and
  // solver configuration must match. Never trust a candidate to supply its
  // own expected physics or exemptions.
  for(const key of Object.keys(reference)){
    if(['particles','pieces','constraints'].includes(key))continue
    if(JSON.stringify(payload[key])!==JSON.stringify(reference[key]))fail()
  }
  for(let i=0;i<reference.pieces.length;i++){
    const actual=payload.pieces[i],expected=reference.pieces[i]
    if(actual?.id!==expected.id||
      !sameVector(actual.particleIndices,expected.particleIndices)||
      !sameMatrix(actual.flatVerticesM,expected.flatVerticesM)||
      !sameMatrix(actual.faces,expected.faces)||
      JSON.stringify(actual)!==JSON.stringify(expected))fail()
  }
  for(let i=0;i<reference.particles.length;i++){
    const particle=payload.particles[i],canonical=reference.particles[i]
    if(!particle||!Array.isArray(particle.position)||
      particle.position.length!==3||
      !particle.position.every(Number.isFinite))fail()
    if(!Array.isArray(particle.previous)||particle.previous.length!==3||
      !particle.previous.every(Number.isFinite))fail()
    const metadata=Object.fromEntries(Object.entries(particle).filter(
      ([key])=>key!=='position'&&key!=='previous'))
    const expectedMetadata=Object.fromEntries(Object.entries(canonical).filter(
      ([key])=>key!=='position'&&key!=='previous'))
    if(JSON.stringify(metadata)!==JSON.stringify(expectedMetadata))fail()
  }
  if(payload.constraints.length!==reference.constraints.length)fail()
  const a=payload.constraints.map(constraintKey).sort()
  const b=reference.constraints.map(constraintKey).sort()
  if(a.some((key,i)=>key!==b[i]))fail()
  if(payload.constraints.filter(c=>c.type==='seam').length!==102)fail()
}

function snapshotLocalityOptions(options){
  if(options===undefined)return {}
  if(!options||typeof options!=='object'||Array.isArray(options))
    throw new TypeError('Invalid canonical sewn-tip options')
  // Inspect own DESCRIPTORS, never read accessor values. A Proxy's descriptor
  // traps can run here, so do this BEFORE authenticating the candidate.
  // Pass only our plain snapshot into the underlying locality diagnostic.
  const descriptors=Object.getOwnPropertyDescriptors(options)
  const safe={}
  for(const key of Reflect.ownKeys(descriptors)){
    if(typeof key!=='string'||
      !['clearanceM','materialTipExcisionM','maxPairs'].includes(key)||
      !Object.hasOwn(descriptors[key],'value'))
      throw new TypeError('Invalid canonical sewn-tip options')
    Object.defineProperty(safe,key,{value:descriptors[key].value,
      writable:true,enumerable:true,configurable:true})
  }
  return safe
}

export function auditCanonicalFoundationTeeSewnContactLocality20261025(payload,
  options={}){
  const safeOptions=snapshotLocalityOptions(options)
  // Regenerate separately from the supplied payload. Never derive the
  // expected seams, material positions or face winding from the candidate.
  const reference=buildNativeSimulationPayload(createTemplateProject('tee'),
    {quality:'quality'})
  requireCanonicalTeeMaterialAndSeams(payload,reference)
  const result=auditNativeSewnEndpointThicknessLocality20261025(payload,safeOptions)
  // A second identity check prevents any input accessor invoked by the
  // diagnostic from mutating material/physics after the first preflight.
  requireCanonicalTeeMaterialAndSeams(payload,reference)
  return {...result,codeGeneratedCanonicalTeeMaterialIdentityMatched:true,
    codeGeneratedCanonicalTeeSewingIdentityMatched:true,
    codeGeneratedCanonicalTeeStaticSolverParametersMatched:true,
    codeGeneratedReferenceIndependentlySigned:false,
    authoredSewingProvenanceAuthenticated:false,
    contactVetoRetained:true,physicalAcceptance:false,safeToAutoApply:false}
}
