import test from 'node:test'
import assert from 'node:assert/strict'
import {nestPolygons} from './accumarkPolygonNesting20261024.js'
import {buildAccuMarkCutterPathStudy20261024 as study} from './accumarkCutterPathStudy20261024.js'

const garment={pieces:[{id:'disposable-front',points:[{x:0,y:0},{x:6,y:0},
 {x:6,y:8},{x:0,y:8}],cutQuantity:1,seamAllowance:0,
 grainAngleDeg:0,marker:{nap:'one-way'}}]}
const base=nestPolygons(garment,{fabricWidth:40,gap:1})
assert.equal(base.ok,true)
const run=(key,value)=>{
 const nest=structuredClone(base)
 nest.placements[0][key]=value
 return study(nest,{fabricWidthCm:40,spaceCm:1})
}

test('plain disposable garment remains a machine-neutral CUT inspection only',()=>{
 const result=study(base,{fabricWidthCm:40,spaceCm:1})
 assert.equal(result.ok,true,result.reason)
 assert.equal(result.records.length,1)
 assert.equal(result.records[0].notchCuttingVerified,false)
 assert.equal(result.records[0].drillVerified,false)
 assert.equal(result.cuttingAuthorized,false)
 assert.equal(result.commandProtocol,null)
})

test('forged marker cannot silently strip notch, drill, internal cut or punch features',()=>{
 for(const [key,value] of [
  ['notches',[{edge:0,offsetCm:2}]],
  ['notchMarks',{front:[{x:1,y:0}]}],
  ['drills',[{x:2,y:3}]],
  ['drillMarks',[{x:2,y:3}]],
  ['punches',[{x:2,y:3}]],
  ['holes',[[{x:1,y:1},{x:2,y:1},{x:2,y:2}]]],
  ['internalLines',[{from:{x:1,y:1},to:{x:3,y:3}}]],
  ['internalCuts',[{x:1,y:1}]],
 ]){
  const result=run(key,value)
  assert.equal(result.code,'UNTRANSFERRED_CUT_FEATURE',key)
  assert.equal(result.cuttingAuthorized,false,key)
  assert.equal(result.manufacturingApproved,false,key)
  assert.equal(result.records,undefined,key)
 }
})

test('explicit empty feature inventories do not invent cutting operations',()=>{
 for(const [key,value] of [['notches',[]],['drills',[]],['notchMarks',{}]]){
  const result=run(key,value)
  assert.equal(result.ok,true,`${key}: ${result.reason}`)
  assert.equal(result.records[0].notchCuttingVerified,false)
  assert.equal(result.records[0].drillVerified,false)
  assert.equal(result.cuttingAuthorized,false)
 }
})

test('malformed or ambiguous feature metadata fails closed',()=>{
 for(const value of [null,false,0,'',true,{},undefined]){
  const result=run('notches',value)
  if(value&&typeof value==='object'&&!Array.isArray(value))
   assert.equal(result.ok,true)
  else assert.equal(result.code,'UNTRANSFERRED_CUT_FEATURE',String(value))
 }
})
