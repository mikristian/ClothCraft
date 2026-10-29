import assert from 'node:assert/strict'
import {generateNativeOrderMarkers,nativeSourceFingerprint,nativeCutlineFingerprint} from './native-production-order-marker-20261029.mjs'

// A lightweight provenance regression: valid independent hashes do not prove
// that the supplied CUT geometry was generated from the graded source.
const id='authored_piece'
const panel={id,fabric:'woven-reference',polygon:{points:[[0,0],[.3,0],[.3,.3],[0,.3]],grain_degrees:90}}
const project={template:{panels:[panel]},grade_run:{sizes:['M'],gradedTemplates:[{panels:[panel]}]}}
const cut=(width)=>({format:'exo-native-graded-cutlines.v1',cuttingAuthorized:false,
  sizes:[{size:'M',panels:[{panel_id:id,cut:{points:[[0,0],[width,0],[width,.3],[0,.3]]}}]}]})
const orderFor=cuts=>({sourceFingerprint:nativeSourceFingerprint(project),
  nativeCutlineFingerprint:nativeCutlineFingerprint(cuts),sizes:['M'],panelIds:[id],
  quantitiesBySize:{M:{[id]:1}},materialsByPanel:{[id]:{fabricId:'main',groupId:'shell',grainAngleDeg:0,nap:'one-way'}},
  cuttingAuthorized:false})
const matching=cut(.3),mismatched=cut(.2)
assert.equal(generateNativeOrderMarkers(project,matching,orderFor(matching)).results[0].markers[0].marker.placements.length,1)
assert.throws(()=>generateNativeOrderMarkers(project,mismatched,orderFor(matching)),/STALE_OR_FORGED_CUTLINE_PAYLOAD/)
const accepted=generateNativeOrderMarkers(project,mismatched,orderFor(mismatched))
assert.equal(accepted.results[0].markers[0].marker.placements.length,1)
assert.notDeepEqual(mismatched.sizes[0].panels[0].cut.points,project.grade_run.gradedTemplates[0].panels[0].polygon.points)
const sourceMatchingButReassigned=generateNativeOrderMarkers(project,matching,orderFor(matching))
assert.equal(sourceMatchingButReassigned.results[0].markers[0].fabricId,'main')
assert.equal(project.template.panels[0].fabric,'woven-reference')
assert.equal(project.template.panels[0].polygon.grain_degrees,90)
console.log(JSON.stringify({reproduced:true,issue:'INDEPENDENT_SOURCE_AND_CUT_FINGERPRINTS_ACCEPT_GEOMETRICALLY_MISMATCHED_CUT',
  sourceWidthM:.3,cutWidthM:.2,staleFingerprintRejected:true,recomputedFingerprintAccepted:true,
  sourceFabric:'woven-reference',orderFabricAccepted:'main',sourceGrainDegrees:90,orderGrainDegreesAccepted:0,
  factoryApproved:false,scope:'marker adapter input provenance; not a claim about actual Rust response forging'}))
