import test from 'node:test'
import assert from 'node:assert/strict'
import {snapshotNativeVerifiedOrderRun47 as snapshot}
  from './native-verified-order-handoff-run36-20261029.mjs'

const order=()=>({
  sourceFingerprint:'a'.repeat(64),
  nativeCutlineFingerprint:'b'.repeat(64),
  sizes:['XS','M'],panelIds:['front'],
  quantitiesBySize:{XS:{front:2},M:{front:4}},
  materialsByPanel:{front:{fabricId:'shell',groupId:'shell',grainAngleDeg:0,nap:'one-way'}},
  nativeSourceMaterialByPanel:{front:{sourceFabricId:'shell',sourceGrainDegrees:0}},
  cuttingAuthorized:false,
})

test('a verified native order snapshot is detached from later caller material/quantity mutations',()=>{
  const input=order()
  const captured=snapshot(input)
  input.quantitiesBySize.M.front=99
  input.materialsByPanel.front.groupId='forged-group'
  input.nativeSourceMaterialByPanel.front.sourceFabricId='forged-fabric'
  input.sizes.push('XL')
  assert.equal(captured.quantitiesBySize.M.front,4)
  assert.equal(captured.materialsByPanel.front.groupId,'shell')
  assert.equal(captured.nativeSourceMaterialByPanel.front.sourceFabricId,'shell')
  assert.deepEqual(captured.sizes,['XS','M'])
})

test('native order snapshot refuses getters without executing them and rejects non-JSON prototypes',()=>{
  const input=order()
  let called=0
  Object.defineProperty(input.materialsByPanel.front,'fabricId',{
    enumerable:true,get(){called++;return 'wrong-fabric'},
  })
  assert.throws(()=>snapshot(input),/ACCESSOR_NATIVE_ORDER_DECLARATION/)
  assert.equal(called,0)
  const tainted=order()
  tainted.materialsByPanel.front=Object.assign(Object.create({fabricId:'inherited'}),{
    groupId:'shell',grainAngleDeg:0,nap:'one-way',
  })
  assert.throws(()=>snapshot(tainted),/NON_JSON_NATIVE_ORDER_DECLARATION/)
})

test('native order rejects cycles, oversized arrays and deep unbounded metadata before RPC',()=>{
  const cyclic=order()
  cyclic.self=cyclic
  assert.throws(()=>snapshot(cyclic),/CYCLIC_NATIVE_ORDER_DECLARATION/)
  const large=order()
  large.sizes=Array(50001).fill('M')
  assert.throws(()=>snapshot(large),/UNBOUNDED_NATIVE_ORDER_DECLARATION/)
  const deep=order()
  let node=deep
  for(let i=0;i<34;i++){node.child={};node=node.child}
  assert.throws(()=>snapshot(deep),/UNBOUNDED_NATIVE_ORDER_DECLARATION/)
})

test('native order safely carries a literal prototype-sensitive panel key as own data',()=>{
  const input=order()
  input.materialsByPanel=Object.fromEntries([['__proto__',{
    fabricId:'shell',groupId:'shell',grainAngleDeg:0,nap:'one-way',
  }]])
  const captured=snapshot(input)
  assert.equal(Object.hasOwn(captured.materialsByPanel,'__proto__'),true)
  assert.equal(captured.materialsByPanel.__proto__.groupId,'shell')
  assert.equal(Object.getPrototypeOf(captured.materialsByPanel),Object.prototype)
})
