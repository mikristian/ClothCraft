import test from 'node:test'
import assert from 'node:assert/strict'
import {createAccuMarkNativeRuleSet,editAccuMarkNativePointRule} from './accumarkNativePointRuleSet20261023.js'
import {inspectNativeGradingPOM20261025} from './nativeGradingPOM20261025.js'
import {exportNativeGradeNamedSizePomCsv20261028 as exportSpecs,
  importNativeGradeNamedSizePomCsv20261028 as importSpecs} from './nativeGradeNamedSizePomCsv20261028.js'

const sizes=['2','4','6','8','10']
function fixture(){
  const snapshot={revision:27,template:{seams:[],fabrics:[],panels:[{
    id:'front',polygon:{points:[[0,0],[.2,0],[.2,.3],[0,.3]],
      edges:['hem','right','neck','left']}}]}}
  const created=createAccuMarkNativeRuleSet(snapshot,{sizes,baseSize:'6'})
  assert.equal(created.ok,true,created.reason)
  const changed=editAccuMarkNativePointRule(snapshot,created.ruleSet,
    {panelId:'front',pointIndex:1,size:'10',dxMm:8,dyMm:0})
  assert.equal(changed.ok,true,changed.reason)
  const ruleSet=changed.ruleSet
  const definition={id:'front-width',label:'Front, width',panelId:'front',
    kind:'anchor-distance',fromPoint:0,toPoint:1,toleranceMm:2,
    targetsMm:{'2':200,'4':200,'6':200,'8':200,'10':208}}
  return {snapshot,ruleSet,definitions:[definition]}
}
test('named-size CSV exchanges actual five-size source-pinned physical POM specifications',()=>{
  const f=fixture(),exported=exportSpecs(f.snapshot,f.ruleSet,f.definitions)
  assert.equal(exported.ok,true,exported.reason)
  assert.equal(exported.rows,5)
  const imported=importSpecs(exported.csv,f.snapshot,f.ruleSet,f.definitions)
  assert.equal(imported.ok,true,imported.reason)
  assert.deepEqual(imported.definitions,f.definitions)
  assert.equal(imported.withinTolerance,true)
  assert.equal(imported.manufacturingApproved,false)
  assert.equal(imported.nativeCommitted,false)
  assert.equal(inspectNativeGradingPOM20261025(f.snapshot,f.ruleSet,imported.definitions,
    {allowNamedSizes:true}).rows.length,5)
})
test('explicit CSV target edits are accepted as unapproved draft and can remain outside tolerance',()=>{
  const f=fixture(),exported=exportSpecs(f.snapshot,f.ruleSet,f.definitions)
  const changed=exported.csv.replace('"10","mm","2","208"','"10","mm","2","250"')
  assert.notEqual(changed,exported.csv)
  const result=importSpecs(changed,f.snapshot,f.ruleSet,f.definitions)
  assert.equal(result.ok,true,result.reason)
  assert.equal(result.definitions[0].targetsMm['10'],250)
  assert.equal(result.withinTolerance,false)
  assert.equal(result.manufacturingApproved,false)
})
test('revision, source template, and graded point-rule changes reject without modifying originals',()=>{
  const f=fixture(),csv=exportSpecs(f.snapshot,f.ruleSet,f.definitions).csv
  const original=structuredClone(f.definitions)
  assert.equal(importSpecs(csv,{...f.snapshot,revision:28},f.ruleSet,f.definitions).ok,false)
  const tampered=structuredClone(f.snapshot)
  tampered.template.panels[0].polygon.points[1][0]=.22
  assert.equal(importSpecs(csv,tampered,f.ruleSet,f.definitions).ok,false)
  const rules=structuredClone(f.ruleSet)
  rules.panels.front.pointOffsetsMm['10'][1][0]=9
  assert.equal(importSpecs(csv,f.snapshot,rules,f.definitions).ok,false)
  assert.deepEqual(f.definitions,original)
})
test('missing, duplicate, forged size and injected spreadsheet formula rows reject',()=>{
  const f=fixture(),csv=exportSpecs(f.snapshot,f.ruleSet,f.definitions).csv
  const lines=csv.trimEnd().split('\r\n')
  assert.equal(importSpecs(lines.slice(0,-1).join('\r\n')+'\r\n',f.snapshot,f.ruleSet,f.definitions).ok,false)
  assert.equal(importSpecs([...lines,lines.at(-1)].join('\r\n')+'\r\n',f.snapshot,f.ruleSet,f.definitions).ok,false)
  assert.equal(importSpecs(csv.replace('"10","mm","2","208"','"12","mm","2","208"'),
    f.snapshot,f.ruleSet,f.definitions).ok,false)
  assert.equal(importSpecs(csv.replace('"Front, width"','"=HYPERLINK(1)"'),
    f.snapshot,f.ruleSet,f.definitions).ok,false)
  assert.equal(importSpecs(csv.replace('"208"','"0"'),f.snapshot,f.ruleSet,f.definitions).ok,false)
})
test('station identity, canonical inventory and missing target refuse fail closed',()=>{
  const f=fixture(),csv=exportSpecs(f.snapshot,f.ruleSet,f.definitions).csv
  assert.equal(importSpecs(csv,f.snapshot,f.ruleSet,[{...f.definitions[0],fromPoint:2}]).ok,false)
  assert.equal(importSpecs(csv,f.snapshot,f.ruleSet,[{...f.definitions[0],id:'other'}]).ok,false)
  assert.equal(importSpecs(csv,f.snapshot,f.ruleSet,[...f.definitions,...f.definitions]).ok,false)
  assert.equal(exportSpecs(f.snapshot,f.ruleSet,[{...f.definitions[0],
    targetsMm:{...f.definitions[0].targetsMm,'10':null}}]).ok,false)
  const renamed=structuredClone(f.ruleSet);renamed.sizes=['2','4','6','8','12']
  assert.equal(importSpecs(csv,f.snapshot,renamed,f.definitions).ok,false)
})
test('quoted multiline CSV, malformed input, and oversized payloads cannot inject station data',()=>{
  const f=fixture(),csv=exportSpecs(f.snapshot,f.ruleSet,f.definitions).csv
  assert.equal(importSpecs(csv.replace('"front-width"','"front\nwidth"'),
    f.snapshot,f.ruleSet,f.definitions).ok,false)
  assert.equal(importSpecs(csv.replace('"front-width"','"front"width"'),
    f.snapshot,f.ruleSet,f.definitions).ok,false)
  assert.equal(importSpecs('a'.repeat(2_000_001),f.snapshot,f.ruleSet,f.definitions).ok,false)
})
test('full 24-size catalog exchanges two independent authored POM stations without fixed XS–XXL assumptions',()=>{
  const f=fixture(),names=Array.from({length:24},(_,i)=>String(i+1))
  const made=createAccuMarkNativeRuleSet(f.snapshot,{sizes:names,baseSize:'12'})
  assert.equal(made.ok,true,made.reason)
  const targetsMm=Object.fromEntries(names.map(name=>[name,200]))
  const definitions=[
    {...f.definitions[0],targetsMm},
    {id:'front-height',label:'Front height',panelId:'front',kind:'anchor-distance',
      fromPoint:1,toPoint:2,toleranceMm:1,targetsMm:Object.fromEntries(names.map(name=>[name,300]))},
  ]
  const csv=exportSpecs(f.snapshot,made.ruleSet,definitions)
  assert.equal(csv.ok,true,csv.reason)
  assert.equal(csv.rows,48)
  const result=importSpecs(csv.csv,f.snapshot,made.ruleSet,definitions)
  assert.equal(result.ok,true,result.reason)
  assert.deepEqual(result.definitions,definitions)
  assert.equal(result.withinTolerance,true)
  assert.equal(result.manufacturingApproved,false)
})
