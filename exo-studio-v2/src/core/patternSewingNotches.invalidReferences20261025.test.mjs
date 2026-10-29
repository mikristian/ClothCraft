import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {teeBalanceNotchCommands} from './patternSewingNotches.js'
import {initializeRustNotchPresetKernel,rustNotchPresetKernelReady} from './rustNotchPresetKernel.js'

test('incomplete panel entries do not crash notch command generation',()=>{
  const template={panels:[null,undefined,{id:null,polygon:{edges:['armhole-left']}},{id:'front',polygon:{edges:['armhole-left']}}]}
  assert.deepEqual(teeBalanceNotchCommands(template),[
    {kind:'Notch',panel:'front',edge:'armhole-left',t:.53,depth_m:.006},
  ])
})

test('non-string edge references never become sewing commands',()=>{
  const spoof={toString(){throw new Error('Must not coerce edge reference')}}
  const impersonator={toString(){return 'armhole-right'}}
  const template={panels:[{id:'front',polygon:{edges:[null,42,spoof,impersonator,Symbol('armhole-left'),'armhole-left']}}]}
  assert.deepEqual(teeBalanceNotchCommands(template),[
    {kind:'Notch',panel:'front',edge:'armhole-left',t:.53,depth_m:.006},
  ])
})

test('valid front/back notch fractions and existing notches are preserved',()=>{
  const template={panels:[
    {id:'front',polygon:{edges:['armhole-left','underarm_right'],notches:{'underarm_right':[{}]}}},
    {id:'back',polygon:{edges:['sleeve-under_top']}},
    {id:'sleeve',polygon:{edges:['armhole-left']}},
  ]}
  assert.deepEqual(teeBalanceNotchCommands(template),[
    {kind:'Notch',panel:'front',edge:'armhole-left',t:.53,depth_m:.006},
    {kind:'Notch',panel:'back',edge:'sleeve-under_top',t:.5125,depth_m:.006},
    {kind:'Notch',panel:'back',edge:'sleeve-under_top',t:.5475,depth_m:.006},
  ])
})

test('notch preset does not mutate imported pattern data',()=>{
  const template={panels:[{id:'Front',polygon:{edges:['armhole-left'],notches:{}}}]}
  const before=structuredClone(template)
  teeBalanceNotchCommands(template)
  assert.deepEqual(template,before)
  assert.deepEqual(teeBalanceNotchCommands({panels:null}),[])
})

test('compiled Rust notch preset also rejects invalid edge references',async()=>{
  const bytes=readFileSync(new URL('../../public/wasm/exo_notch_preset_kernel.wasm',import.meta.url))
  assert.equal(await initializeRustNotchPresetKernel({bytes}),true)
  assert.equal(rustNotchPresetKernelReady(),true)
  assert.deepEqual(teeBalanceNotchCommands({panels:[
    null,
    {id:'back',polygon:{edges:[{toString(){return 'armhole-right'}},'armhole-right']}},
  ]}),[
    {kind:'Notch',panel:'back',edge:'armhole-right',t:.5125,depth_m:.006},
    {kind:'Notch',panel:'back',edge:'armhole-right',t:.5475,depth_m:.006},
  ])
})
