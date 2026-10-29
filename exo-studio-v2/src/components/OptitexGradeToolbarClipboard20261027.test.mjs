import test from 'node:test'
import assert from 'node:assert/strict'
import {createAccuMarkNativeRuleSet} from '../core/accumarkNativePointRuleSet20261023.js'
import {applyOptitexGradeTool20261027} from '../core/optitexGradeTools20261027.js'

test('engine copy clipboard can receive panel identity without changing its native schema and paste successfully',()=>{
 const snapshot={template:{panels:[{id:'front',polygon:{points:[[0,0],[.2,0],[.2,.2],[0,.2]],edges:['a','b','c','d']}}]}}
 const rules=createAccuMarkNativeRuleSet(snapshot).ruleSet
 const original=applyOptitexGradeTool20261027({snapshot,ruleSet:rules,panelId:'front',pointIndex:1,toolId:'set-grading-tool',amountMm:3,axis:'y'})
 assert.equal(original.ok,true,original.reason)
 const copied=applyOptitexGradeTool20261027({snapshot,ruleSet:original.ruleSet,panelId:'front',pointIndex:1,toolId:'copy-grading'})
 assert.equal(copied.ok,true,copied.reason)
 assert.equal(copied.clipboard.panelId,undefined,'engine clipboard does not own UI panel identity')
 const stored={...copied.clipboard,panelId:'front'}
 assert.equal(stored.schema,'exo.grade-clipboard.v1')
 assert.deepEqual(stored.sizes,original.ruleSet.sizes)
 const pasted=applyOptitexGradeTool20261027({snapshot,ruleSet:original.ruleSet,panelId:stored.panelId,pointIndex:1,targetPointIndex:2,toolId:'paste-grading',clipboard:stored})
 assert.equal(pasted.ok,true,pasted.reason)
 assert.deepEqual(pasted.ruleSet.panels.front.pointOffsetsMm.L[2],original.ruleSet.panels.front.pointOffsetsMm.L[1])
 assert.deepEqual(pasted.ruleSet.panels.front.pointOffsetsMm.M[2],[0,0])
})
