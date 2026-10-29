// Native adapter integration test: proves the production Swift GPU request
// does not silently select physically unvalidated Metal for user garments.
// All saves go to a fresh isolated scratch directory, never a user project.
import assert from 'node:assert/strict'
import {mkdtempSync, mkdirSync, readFileSync} from 'node:fs'
import {resolve, join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {dirname} from 'node:path'
import {createWorkspace} from '../../../integrations/clothcraft/workspace.mjs'

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..')
const binary=resolve(process.env.EXO_PHYSICS_BINARY||join(root,'.exo-build-scratch/physics-immutable-20261018/exo-session'))
const cpuOnlyBinary=resolve(process.env.EXO_PHYSICS_CPU_ONLY_BINARY||join(root,'research/oss/clothcraft/target/debug/exo-session'))
const original=Object.fromEntries(['EXO_CLOTHCRAFT_GPU','EXO_CLOTHCRAFT_SESSION_BIN','EXO_CLOTHCRAFT_ALLOW_EXPERIMENTAL_GPU','EXO_CLOTHCRAFT_REPO'].map(k=>[k,process.env[k]]))
const scope=mkdtempSync(join(root,'.exo-build-scratch/qa-physics-backend-'))
let active=null
const evidence=[]
try{
  process.env.EXO_CLOTHCRAFT_REPO=join(root,'research/oss/clothcraft')
  process.env.EXO_CLOTHCRAFT_SESSION_BIN=binary
  process.env.EXO_CLOTHCRAFT_GPU='1' // matches the macOS Swift launcher's default
  for(const [optIn,compiledGpu,preset] of [[false,true,'tshirt'],[false,true,'dress'],[true,true,'tshirt'],[true,false,'tshirt']]){
    if(optIn)process.env.EXO_CLOTHCRAFT_ALLOW_EXPERIMENTAL_GPU='1'
    else delete process.env.EXO_CLOTHCRAFT_ALLOW_EXPERIMENTAL_GPU
    process.env.EXO_CLOTHCRAFT_SESSION_BIN=compiledGpu?binary:cpuOnlyBinary
    const output=join(scope,compiledGpu?(optIn?'experimental-gpu':`default-cpu-${preset}`):'unavailable-gpu')
    mkdirSync(output,{recursive:true})
    active=createWorkspace(output)
    const response=await active.request({op:'open',preset})
    assert.equal(response.ok,true,response.error||'Native session refused to open')
    const status=active.status()
    assert.equal(status.gpuSupported,compiledGpu,'native feature probe incorrectly identified executable')
    assert.equal(status.gpuRequested,true)
    const expectedGpu=compiledGpu&&optIn
    assert.equal(status.gpuActive,expectedGpu,'native backend selected without support or explicit experiment opt-in')
    const reported=JSON.stringify(response.data?.backend??response.data?.simulation?.backend??response.data?.metrics?.backend??'')
    assert.match(reported,expectedGpu?/GPU VBD/:/CPU VBD/,'native executable did not run the declared backend')
    const savedPath=join(output,'workspace/fitting-project.json')
    const project=JSON.parse(readFileSync(savedPath,'utf8'))
    assert.ok(project.template.panels.length>0,'authored panels missing from isolated saved fixture')
    let simulatedSteps=0
    if(!optIn&&compiledGpu){
      const stepped=await active.request({op:'step',steps:1,revision:response.data.revision})
      assert.equal(stepped.ok,true,stepped.error||'native CPU step failed')
      assert.equal(stepped.data.backend,response.data.backend)
      assert.equal(stepped.data.time,1/60,'native CPU step advanced wrong physical time')
      assert.deepEqual(stepped.data.template,project.template,'simulation mutated authoritative 2D pattern')
      assert.ok(stepped.data.positions.every(p=>p.length===3&&p.every(Number.isFinite)),
        'simulation produced non-finite 3D vertices')
      const saved=await active.request({op:'save'})
      assert.equal(saved.ok,true,saved.error||'failed to save native CPU step')
      const persisted=JSON.parse(readFileSync(savedPath,'utf8'))
      assert.equal(persisted.state?.time,1/60,'persisted drape missed accepted physical step')
      assert.deepEqual(persisted.template,project.template,'save changed authored 2D garment')
      // Reopen the actual saved native fitting state through a second worker:
      // correctness includes stable sewing/2D documents after reload, not
      // merely an in-memory step returning finite positions.
      active.close()
      active=createWorkspace(output)
      const reopened=await active.request({op:'snapshot'})
      assert.equal(reopened.ok,true,reopened.error||'saved fitting project did not reopen')
      assert.equal(reopened.data.time,1/60,'reopened garment lost physical time')
      assert.deepEqual(reopened.data.template,project.template,'reopened garment changed 2D construction')
      assert.deepEqual(reopened.data.positions,stepped.data.positions,
        'reopened garment changed accepted 3D cloth geometry')
      simulatedSteps=1
    }
    evidence.push({preset,optIn,compiledGpu,gpuActive:status.gpuActive,reportedBackend:reported,panels:project.template.panels.length,revision:response.data.revision,simulatedSteps})
    active.close();active=null
  }
  console.log(JSON.stringify({pass:true,scope,testedBinary:binary,evidence},null,2))
}finally{
  active?.close()
  for(const [key,value] of Object.entries(original)){
    if(value===undefined)delete process.env[key]
    else process.env[key]=value
  }
}
