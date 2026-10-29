import test from 'node:test'
import assert from 'node:assert/strict'
import {createAccuMarkNativeRuleSet,editAccuMarkNativePointRule} from './accumarkNativePointRuleSet20261023.js'
import {prepareNativeGradeCatalog20261025 as prepare,verifyNativeGradeCatalog20261025 as verify,recoverNativeGradeRules20261025 as recover} from './nativeGradeCatalogBridge20261025.js'

const source=()=>({revision:6,template:{panels:[{id:'front',polygon:{
 points:[[0,0],[.3,0],[.3,.4],[0,.4]],edges:['a','b','c','d']}}],seams:[],fabrics:[]}})

test('native schema v2 commit packet preserves real named-size grading offsets and correspondence',()=>{
 const s=source(),created=createAccuMarkNativeRuleSet(s,{sizes:['2','4','6','8'],baseSize:'6'})
 assert.equal(created.ok,true,created.reason)
 const edited=editAccuMarkNativePointRule(s,created.ruleSet,{panelId:'front',pointIndex:1,size:'8',dxMm:12,dyMm:0})
 assert.equal(edited.ok,true,edited.reason)
 edited.ruleSet.sizeEvolution={correspondences:{US12:'8',US8:'4'},groups:{}}
 const p=prepare(s,{template:structuredClone(s.template)},edited.ruleSet)
 assert.equal(p.ok,true,p.reason)
 assert.equal(p.gradeRun.schemaVersion,2)
 assert.deepEqual(p.gradeRun.sizes,['2','4','6','8'])
 assert.deepEqual(p.gradeRun.sizeCorrespondence,{US12:'8',US8:'4'})
 assert.equal(p.gradeRun.gradedTemplates[3].panels[0].polygon.points[1][0],.312)
 const receipt={revision:6,persistedInProject:true,catalog:p.gradeRun}
 assert.equal(verify(s,edited.ruleSet,receipt,{durablySaved:true}).ok,true)
 const restored=recover(s,receipt)
 assert.equal(restored.ok,true,restored.reason)
 assert(Math.abs(restored.ruleSet.panels.front.pointOffsetsMm['8'][1][0]-12)<1e-8)
 assert.deepEqual(restored.ruleSet.sizeEvolution.correspondences,{US12:'8',US8:'4'})
 assert.equal(verify(s,restored.ruleSet,receipt,{durablySaved:true}).ok,true)
})

test('stale, forged and conflicting named-size catalogs fail closed',()=>{
 const s=source(),r=createAccuMarkNativeRuleSet(s,{sizes:['2','4','6','8'],baseSize:'6'}).ruleSet
 r.sizeEvolution={correspondences:{US12:'8'}}
 const p=prepare(s,{template:structuredClone(s.template)},r)
 assert.equal(p.ok,true,p.reason)
 const stale=structuredClone(s)
 stale.template.panels[0].polygon.points[1][0]=.31
 assert.equal(prepare(stale,{template:stale.template},r).ok,false)
 const status={revision:6,persistedInProject:true,catalog:p.gradeRun}
 assert.equal(verify(s,r,status,{durablySaved:true}).ok,true)
 assert.equal(verify(s,r,{...status,catalog:{...p.gradeRun,sizeCorrespondence:{US12:'6'}}},{durablySaved:true}).ok,false)
 assert.equal(verify(s,r,{...status,catalog:{...p.gradeRun,gradedTemplates:p.gradeRun.gradedTemplates.slice(1)}},{durablySaved:true}).ok,false)
 const collided=structuredClone(r);collided.sizeEvolution.correspondences['8']='6'
 assert.equal(prepare(s,{template:s.template},collided).ok,false)
})
