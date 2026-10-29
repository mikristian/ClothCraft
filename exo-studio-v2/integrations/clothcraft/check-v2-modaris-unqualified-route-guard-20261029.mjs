import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'
import {createAccuMarkNativeRuleSet} from '../../src/core/accumarkNativePointRuleSet20261023.js'
import {prepareNativeGradeCatalog20261025} from '../../src/core/nativeGradeCatalogBridge20261025.js'

const folder=fs.mkdtempSync(path.join(os.tmpdir(),'exo-unqualified-route-'))
const workspace=createWorkspace(folder)
let snapshot
const rpc=async payload=>{
 const response=await workspace.request({revision:snapshot?.revision,...payload})
 assert.equal(response.ok,true,`${payload.op}: ${response.error}`)
 if(response.data?.template)snapshot=response.data
 return response.data
}
const project=async()=>(await rpc({op:'save'})).project
try {
 await rpc({op:'open',preset:'tshirt'})
 const rules=createAccuMarkNativeRuleSet(snapshot)
 assert.equal(rules.ok,true,rules.reason)
 const prepared=prepareNativeGradeCatalog20261025(snapshot,await project(),rules.ruleSet)
 assert.equal(prepared.ok,true,prepared.reason)
 await rpc({op:'grade-run-commit',gradeRun:prepared.gradeRun})
 await rpc({op:'snapshot'})
 const before=await project()
 const revision=snapshot.revision
 const panel=snapshot.template.panels.find(p=>p.polygon?.points?.length>=3)
 assert(panel,'Trace fixture needs editable polygon')
 const attempt=await workspace.request({revision,op:'trace-contour',panel:panel.id})
 assert.equal(attempt.ok,false,'Trace must not discard installed native grading')
 assert.match(String(attempt.error),/grade|binding|regenerat|depend/i)
 await rpc({op:'snapshot'})
 assert.equal(snapshot.revision,revision)
 assert.deepEqual(await project(),before)
 await rpc({op:'undo'})
 assert.equal((await project()).grade_run??null,null)
 await rpc({op:'redo'})
 assert.deepEqual(await project(),before)
 await rpc({op:'open',project:before})
 assert.deepEqual(await project(),before)
 await rpc({op:'open',preset:'tshirt'})
 const ungradedPanel=snapshot.template.panels.find(p=>p.polygon?.points?.length>=3)
 assert(ungradedPanel)
 const ungradedCount=snapshot.template.panels.length
 await rpc({op:'trace-contour',panel:ungradedPanel.id})
 assert.equal(snapshot.template.panels.length,ungradedCount+1,'Ungraded native tracing must still work')
 console.log('PASS: trace-contour atomically rejects grade loss; undo/redo/reopen preserve catalog')
} finally {await workspace.close?.()}
