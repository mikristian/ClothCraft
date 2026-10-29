import test from 'node:test'
import assert from 'node:assert/strict'
import {convertNativeCutlineStudy20261024 as convert} from './accumarkNativeCutRoomStudy20261024.js'
const snapshot={revision:8,template:{name:'Test',panels:[{id:'front',name:'front',fabric:'main',
 grain_degrees:0,polygon:{points:[[0,0],[.2,0],[.2,.1],[0,.1]],holes:[]}}]}}
const proof={format:'exo-native-cutline-proof.v1',units:'mm',factoryApproved:false,
 revision:8,blockedCount:0,generatedCount:1,
 panels:[{panelId:'front',name:'front',ok:true,pointsMm:[[0,0],[201,0],[201,101],[0,101]]}]}
test('snapshot physical cutline is preserved in cm, without reapplying allowance',()=>{
 const r=convert(snapshot,proof)
 assert.equal(r.ok,true,r.reason)
 assert.equal(r.project.pieces.length,1)
 assert.deepEqual(r.project.pieces[0].points[2],{x:20.1,y:10.1})
 assert.equal(r.project.pieces[0].seamAllowance,0)
 assert.equal(r.project.patternSource.referenceOnly,true)
 assert.equal(r.factoryApproved,false)
})
test('stale revision, missing cutlines and missing units refuse all study placements',()=>{
 assert.equal(convert(snapshot,{...proof,revision:7}).ok,false)
 assert.equal(convert(snapshot,{...proof,blockedCount:1,generatedCount:0}).ok,false)
 assert.equal(convert(snapshot,{...proof,units:'cm'}).ok,false)
 assert.equal(convert(snapshot,{...proof,panels:[{...proof.panels[0],pointsMm:[[0,0],[NaN,0],[1,1]]}]}).ok,false)
})
