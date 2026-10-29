import test from 'node:test'
import assert from 'node:assert/strict'
import {inspectNativeTuckFitReadiness20261025 as gate} from './nativeTuckFitReadiness20261025.js'
const fixture=()=>({time:0,template:{panels:[{id:'front'}],seams:[{
 id:'tuck_1',a:{panel:'front',edge:'tuck_1_line_a'},
 b:{panel:'front',edge:'tuck_1_line_b'}}]},
 tuckFit:[{seamId:'tuck_1',maxGapMm:25,rmsGapMm:15,
  lengthsMm:[45,45],physicalSewingConstraint:true,foldContactCertified:false}],
 metrics:null})
test('authoring saves real sewn tuck but does not grant physical fit approval without simulation',()=>{
 const result=gate(fixture(),{panelId:'front'})
 assert.equal(result.ok,true)
 assert.equal(result.seamCount,1)
 assert.equal(result.simulated,false)
 assert.equal(result.provisionalFitChecksPass,false)
 assert.equal(result.manufacturingApproved,false)
 assert.equal(result.foldContactCertified,false)
})
test('severe dynamic stretch and persistent gap produce independent failures',()=>{
 const s=fixture();s.time=.2
 s.metrics={iterations:16,extension_max_percent:402,minimum_distance_m:5e-8,
  residual_rms_n:100447}
 const result=gate(s,{panelId:'front'})
 assert.equal(result.gapPass,false)
 assert.equal(result.strainPass,false)
 assert.equal(result.solverPass,false)
 assert.ok(result.maxStrainPercent>400)
})
test('passing provisional metrics still cannot certify fold collisions or production',()=>{
 const s=fixture();s.time=.2;s.tuckFit[0].maxGapMm=.5
 s.tuckFit[0].rmsGapMm=.25
 s.metrics={iterations:16,extension_max_percent:2,minimum_distance_m:.0003,
  residual_rms_n:1}
 const result=gate(s,{panelId:'front'})
 assert.equal(result.provisionalFitChecksPass,true)
 assert.equal(result.manufacturingApproved,false)
 assert.ok(result.issues.some(i=>i.includes('self-contact')))
})
test('malformed native metrics and unrelated sewing pairs fail closed',()=>{
 const s=fixture()
 s.tuckFit[0].maxGapMm=NaN
 assert.equal(gate(s,{panelId:'front'}).ok,false)
 assert.equal(gate(fixture(),{panelId:'missing'}).ok,false)
 assert.equal(gate(fixture(),{panelId:'front',strainReference:2}).ok,false)
})
