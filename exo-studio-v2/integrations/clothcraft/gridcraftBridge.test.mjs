import test from 'node:test'
import assert from 'node:assert/strict'
import {validateGridcraftFormula,evaluateGridcraftFormula,gridcraftStatus,GRIDCRAFT_MAX_FORMULA} from './gridcraftBridge.mjs'

test('accepts math functions and rejects references, paths, commands and oversized input',()=>{
  assert.equal(validateGridcraftFormula('=SUM(1,2,3)'), '=SUM(1,2,3)')
  for(const formula of ['=A1','=HYPERLINK(1,2)','=SUM(1);rm -rf /','=SUM("file")','=NOW()','=SUM(1)+A2','='.padEnd(GRIDCRAFT_MAX_FORMULA+2,'1')])assert.throws(()=>validateGridcraftFormula(formula))
})
test('execFile receives fixed arguments, no shell, short timeout',async()=>{
  const env={EXO_GRIDCRAFT_CLI:'/tmp/exo-gridcraft-compile-pilot-20261026/debug/gridcraft-cli'}
  const result=await evaluateGridcraftFormula('=SUM(1,2,3)',{env,exec:(bin,args,options,callback)=>{
    assert.equal(bin,env.EXO_GRIDCRAFT_CLI)
    assert.deepEqual(args,['eval','=SUM(1,2,3)','--json'])
    assert.equal(options.shell,false)
    assert.ok(options.timeout<=1500)
    callback(null,'6.0\n','')
  }})
  assert.deepEqual(result,{ok:true,value:6,engine:'gridcraft-cli',source:'formula-only'})
  assert.equal(gridcraftStatus({EXO_GRIDCRAFT_CLI:'/nonexistent/cli'}).available,false)
})
test('live CLI evaluation if pilot executable exists',async t=>{
  const env={EXO_GRIDCRAFT_CLI:'/tmp/exo-gridcraft-compile-pilot-20261026/debug/gridcraft-cli'}
  if(!gridcraftStatus(env).available)return t.skip('Pilot binary unavailable')
  assert.equal((await evaluateGridcraftFormula('=SUM(1,2,3)',{env})).value,6)
})
