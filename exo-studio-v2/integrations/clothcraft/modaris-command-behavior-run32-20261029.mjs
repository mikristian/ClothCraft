/** Run 32: real local capability acceptance plus isolated native integration evidence. */
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {readFileSync} from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {resolveModaris2DCommandCapabilities20261027 as resolve,modaris2DCommandState20261027 as state} from '../../src/core/modaris2DCommandCapabilities20261027.js'
import {checkModarisToolbarPreconditions20261028 as preconditions} from '../../src/core/modarisToolbarPreconditions20261028.js'
import {behavioralMatrix,matrixDimensions,comparisonAuthority} from './modaris-2d-command-behavior-matrix-20261028.mjs'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const noop=()=>{}
const actions=Object.fromEntries(['move','notch','allowance','undo','redo','save','view-2d'].map(id=>[id,noop]))
const snapshot={template:{panels:[{id:'front'}]},canUndo:true,canRedo:false}
const command=(selection,extra={})=>resolve({snapshot,actions,full2D:true,selection,...extra})
assert.deepEqual(Object.keys(behavioralMatrix[0].checks),matrixDimensions)
assert.equal(behavioralMatrix.length,3)
assert.match(comparisonAuthority.modaris,/unverified/)
assert.equal(state(command(null),'notch').disabled,true)
assert.match(state(command(null),'notch').reason,/select a pattern piece/i)
assert.match(state(command({panel:'front'}),'notch').reason,/boundary/i)
assert.equal(state(command({panel:'front',edge:0}),'notch').disabled,false)
assert.equal(state(command({panel:'missing',edge:0}),'notch').disabled,true)
assert.equal(state(command({panel:'front'}),'move').disabled,false)
assert.equal(state(command({panel:'front'}, {busy:true}),'move').disabled,true)
assert.equal(state(command({panel:'front'}, {playing:true}),'move').disabled,true)
assert.equal(state(command({panel:'front'}, {full2D:false}),'move').disabled,true)
assert.equal(state(command({panel:'front'}, {verified:{move:false}}),'move').disabled,true)
assert.equal(state(command(null),'undo').disabled,false)
assert.equal(state(command(null),'redo').disabled,true)
assert.equal(state(command(null),'save').disabled,false)
assert.equal(state(resolve({actions,full2D:true}),'save').disabled,true)
assert.equal(preconditions({kind:'app',action:'undo',tool:{label:'Undo'}},{nativeMode:true,session:{name:'fixture',canUndo:false}}).ok,false)
assert.equal(preconditions({kind:'app',action:'redo',tool:{label:'Redo'}},{nativeMode:true,session:{name:'fixture',canRedo:false}}).ok,false)
assert.equal(preconditions({kind:'native',tool:{label:'Notch'},requiresSelection:true},{nativeMode:true,full2D:true,session:{name:'fixture',selection:null}}).ok,false)
assert.equal(preconditions({kind:'native',tool:{label:'Notch'},requiresSelection:true},{nativeMode:true,full2D:true,session:{name:'fixture',selection:{panelId:'front'}}}).ok,true)

const browserEvidence=[
 ['qa-v2-native-2d-construction-20261023.mjs',[/data-native-construction-preview/,/preview must never mutate source geometry/i,/Native Undo failed/]],
 ['qa-v2-modaris-cross-piece-ui-20261027.mjs',[/Cross-panel source panel/,/native batch preview/i,/detail:'undo'/,/detail:'redo'/]],
]
for(const [file,patterns] of browserEvidence){
 const source=readFileSync(path.join(root,'integrations/clothcraft',file),'utf8')
 for(const expression of patterns)assert.match(source,expression,`${file} missing inspected assertion`)
}
const nativeFile='qa-v2-notches-allowances-20261017.mjs'
const run=spawnSync(process.execPath,[path.join(root,'integrations/clothcraft',nativeFile)],{
 cwd:root,encoding:'utf8',timeout:90000,maxBuffer:1024*1024,
})
assert.equal(run.status,0,`Native integration failed (status ${run.status}): ${run.error?.message||run.stderr||run.stdout}`)
const native=JSON.parse(run.stdout.trim())
for(const flag of ['passed','invalidRejected','undoRedo','savePersists','constructionAndDrapePreserved'])assert.equal(native[flag],true,flag)
assert(native.commands.includes('Notch')&&native.commands.includes('SeamAllowance'))
const referenceFile='check-v2-modaris-native-reference-witness-20261027.mjs'
const referenceRun=spawnSync(process.execPath,[path.join(root,'integrations/clothcraft',referenceFile)],{
 cwd:root,encoding:'utf8',timeout:90000,maxBuffer:1024*1024,
})
assert.equal(referenceRun.status,0,`Native reference integration failed (status ${referenceRun.status}): ${referenceRun.error?.message||referenceRun.stderr||referenceRun.stdout}`)
const reference=JSON.parse(referenceRun.stdout.trim())
assert.equal(reference.passed,true)
assert.equal(reference.cycles.length,2)
assert.deepEqual(reference.cycles.map(c=>c.width),[.42,.43])
console.log(JSON.stringify({passed:true,fixture:'run32-modaris-command-behavior',
 capabilityAssertions:19,nativeExecuted:[nativeFile,referenceFile],nativeProof:{geometry:true,invalidRejection:true,undoRedo:true,save:true,reopen:true,referenceCycles:2},
 sourceInspectedOnly:browserEvidence.map(([name])=>name),
 browserExecuted:false,keyboardShortcutVerified:false,licensedModarisCompared:false,
 note:'Local command gates and disposable native service asserted; no Modaris behavioral parity inferred.'},null,2))
