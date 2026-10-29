import test from 'node:test'
import assert from 'node:assert/strict'
import {migrateNativeGradeNamedSizePom20261028 as migrate} from './nativeGradeNamedSizePomMigration20261028.js'

const oldSizes=['2','4','6','8'],newSizes=['2','4','6','8','10']
const saved=()=>[{id:'front-width',panelId:'front',kind:'anchor-distance',fromPoint:0,toPoint:1,
  label:'Front width',toleranceMm:2,targetsMm:{'2':290,'4':300,'6':310,'8':320}}]
const next=()=>[{...saved()[0],targetsMm:{...saved()[0].targetsMm,'10':330}}]
const run=overrides=>migrate({savedDefinitions:saved(),nextDefinitions:next(),oldSizes,newSizes,...overrides})

test('explicit named-size target migration retains old physical specs and does not approve factory',()=>{
 const result=run()
 assert.equal(result.ok,true,result.reason)
 assert.deepEqual(result.appendedSizes,['10'])
 assert.deepEqual(result.definitions,next())
 assert.equal(result.factoryApproved,false)
 assert.deepEqual(saved()[0].targetsMm,{'2':290,'4':300,'6':310,'8':320})
})
test('new targets cannot be missing, null, NaN, zero or physically out of range',()=>{
 for(const value of [undefined,null,NaN,Infinity,-1,0,10001,'330']){
  const changed=next();if(value===undefined)delete changed[0].targetsMm['10']
  else changed[0].targetsMm['10']=value
  assert.equal(run({nextDefinitions:changed}).ok,false,String(value))
 }
})
test('saved targets, POM identity, station and tolerance cannot silently change',()=>{
 for(const mutate of [
  item=>item.targetsMm['8']=321,item=>item.toleranceMm=3,
  item=>item.fromPoint=1,item=>item.id='other',item=>item.label='Other',
 ]){
  const changed=next();mutate(changed[0]);assert.equal(run({nextDefinitions:changed}).ok,false)
 }
 assert.equal(run({nextDefinitions:[]}).ok,false)
})
test('arbitrary inserted canonical sizes require explicitly authored targets',()=>{
 const result=run({newSizes:['2','4','5','6','8'],nextDefinitions:[{
  ...saved()[0],targetsMm:{...saved()[0].targetsMm,'5':305}}]})
 assert.equal(result.ok,true,result.reason)
 assert.deepEqual(result.appendedSizes,['5'])
 assert.equal(run({newSizes:['2','6','4','8','10']}).ok,false)
 assert.equal(run({newSizes:['2','4','6','10']}).ok,false)
})
test('unchanged empty POM inventory is allowed without inventing a measurement',()=>{
 const result=run({savedDefinitions:[],nextDefinitions:[]})
 assert.equal(result.ok,true,result.reason)
 assert.deepEqual(result.definitions,[])
})
test('prototype keys, duplicate sizes and extraneous targets fail closed',()=>{
 assert.equal(run({newSizes:['2','4','6','8','__proto__']}).ok,false)
 assert.equal(run({newSizes:['2','4','6','8','8']}).ok,false)
 const changed=next();changed[0].targetsMm['12']=350
 assert.equal(run({nextDefinitions:changed}).ok,false)
})
