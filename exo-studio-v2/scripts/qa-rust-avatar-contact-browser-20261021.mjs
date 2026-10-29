// RUST-028 isolated Chrome source acceptance: disposable simulation data only.
import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

const url=process.env.EXO_SOURCE_URL||'http://127.0.0.1:5297/'
const browser=await chromium.launch({headless:true,
  executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
try {
  const page=await browser.newPage()
  await page.goto(url,{waitUntil:'domcontentloaded'})
  const result=await page.evaluate(async()=>{
    const bridge=await import('/src/core/rustAvatarContactParametersKernel.js')
    const {avatarContactParameters,projectAvatarContacts}=await import('/src/core/physics/avatarContactPass.js')
    const loaded=await bridge.initializeRustAvatarContactParametersKernel()
    const project={avatar:{id:'in-memory-avatar'},simulation:{collisionMargin:0.015,collisions:true},metadata:{authored:'unchanged'}}
    const pieces=[
      {id:'default',fabric:{thickness:0.003,friction:0.4},layerIndex:0,metadata:{gradeRule:1}},
      {id:'layer-2',fabric:{thickness:0.004,friction:0.9},layerIndex:2},
      {id:'zero',fabric:{thickness:0,friction:0},layerIndex:3},
      {id:'negative',fabric:{thickness:-0.002,friction:-0.2},layerIndex:-1},
      {id:'defaults',metadata:{note:'keep'}},
      {id:'fractional-layer',fabric:{thickness:0.001,friction:0.65},layerIndex:1.5},
    ]
    const before=JSON.stringify({project,pieces})
    const parameters=pieces.map(piece=>{
      const thickness=piece.fabric?.thickness??0.002
      const layerOffset=(piece.layerIndex||0)*Math.max(0.0025,thickness*1.15)
      const expected={margin:(project.simulation?.collisionMargin??0.012)+thickness+layerOffset,
        friction:piece.fabric?.friction??0.3}
      return {id:piece.id,actual:avatarContactParameters(project,piece),expected}
    })
    const calls=[]
    const simulation={pieces:new Map([
      ['default',{...pieces[0],particles:[{id:'free',invMass:1},{id:'pinned',invMass:0}]}],
      ['layer-2',{...pieces[1],particles:[{id:'second-free',invMass:0.5}]}],
    ])}
    const simulationBefore=JSON.stringify([...simulation.pieces.entries()])
    const callback=(particle,avatar,margin,friction)=>calls.push({particle:particle.id,avatar:avatar.id,margin,friction})
    const movableCount=projectAvatarContacts(simulation,project,callback,{movableOnly:true})
    const movableCalls=[...calls]
    calls.length=0
    const allCount=projectAvatarContacts(simulation,project,callback)
    const allCalls=[...calls]
    calls.length=0
    const disabledCount=projectAvatarContacts(simulation,{...project,simulation:{...project.simulation,collisions:false}},callback)
    return {loaded,status:bridge.rustAvatarContactParametersStatus(),parameters,
      unchanged:before===JSON.stringify({project,pieces}),
      simulationUnchanged:simulationBefore===JSON.stringify([...simulation.pieces.entries()]),
      movableCount,movableCalls,allCount,allCalls,disabledCount,disabledCalls:calls.length}
  })
  assert.equal(result.loaded,true,JSON.stringify(result.status))
  assert.equal(result.status.backend,'rust-wasm')
  for(const row of result.parameters){
    for(const field of ['margin','friction'])assert.ok(Object.is(row.actual[field],row.expected[field])||
      Math.abs(row.actual[field]-row.expected[field])<=1e-15,`${row.id}.${field}`)
  }
  assert.equal(result.unchanged,true)
  assert.equal(result.simulationUnchanged,true)
  assert.equal(result.movableCount,2)
  assert.deepEqual(result.movableCalls.map(x=>x.particle),['free','second-free'])
  assert.equal(result.allCount,3)
  assert.deepEqual(result.allCalls.map(x=>x.particle),['free','pinned','second-free'])
  assert.equal(result.disabledCount,0)
  assert.equal(result.disabledCalls,0)
  for(const call of [...result.allCalls,...result.movableCalls])assert.equal(call.avatar,'in-memory-avatar')
  console.log(JSON.stringify({pass:true,url,backend:result.status.backend,parameterCases:result.parameters.length,
    layerOffsets:true,zeroNegativeThickness:true,friction:true,collisionMargin:true,
    callbacksPreserved:true,movableOnlyPreserved:true,metadataUnchanged:true}))
}finally{await browser.close()}
