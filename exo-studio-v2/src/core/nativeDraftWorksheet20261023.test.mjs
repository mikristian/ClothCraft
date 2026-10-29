import test from 'node:test'
import assert from 'node:assert/strict'
import {evaluateNativeDraftWorksheet20261023 as solve} from './nativeDraftWorksheet20261023.js'

test('Seamly-style worksheet calculates named construction distance in mm with dependency order',()=>{
  const text='# garment measurement\nchest = 920\nease = 40\nquarter = (chest + ease) / 4\ngrowth = 8'
  const got=solve({worksheet:text,expression:'quarter + growth'})
  assert.equal(got.ok,true);assert.equal(got.valueMm,248)
  assert.equal(got.valuesMm.quarter,240);assert.equal(got.dependencyOrder.at(-1),'_distance')
  assert.equal(got.manufacturingApproved,false)
  assert.equal(text.includes('quarter'),true)
})

test('rejects cyclic, missing, malformed, over-limit, unsafe syntax and duplicate variable worksheets',()=>{
  const cases=[
    ['a= b + 1\nb= a + 1','a'],['a=missing+5','a'],
    ['a=process.exit(1)','a'],['__proto__ = 3','__proto__'],
    ['name = 9\nname = 11','name'],['x == 8','x'],
    ['bad-name = 9','bad-name'],['a = 10','new Function("alert(1)")'],
    ['width = 10000','width'],['a = 12','a / (1-1)'],
  ]
  for(const [worksheet,expression] of cases){const result=solve({worksheet,expression});assert.equal(result.ok,false,JSON.stringify(result));assert.equal(result.valueMm,undefined)}
  assert.equal(solve({worksheet:'',expression:''}).ok,false)
  assert.equal(solve({worksheet:('x=1\n').repeat(140),expression:'x'}).ok,false)
})

test('explicit formula distance can be negative for offset in opposite construction direction',()=>{
  const input=Object.freeze({worksheet:'radius=125\nflange=25',expression:'-radius + flange'})
  const value=solve(input);assert.equal(value.ok,true);assert.equal(value.valueMm,-100)
  assert.equal(input.worksheet,'radius=125\nflange=25')
})
