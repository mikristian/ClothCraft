import test from 'node:test'
import assert from 'node:assert/strict'
import {createAccuMarkNativeRuleSet,editAccuMarkNativePointRule} from './accumarkNativePointRuleSet20261023.js'
import {createNativeGradingPOM20261025 as create,previewNativeGradingPOM20261025 as preview,inspectNativeGradingPOM20261025 as inspect,reviseNativeGradingPOMAnchors20261025 as revise,exportNativeGradingPOMSpecsCSV20261025 as exportSpecs,importNativeGradingPOMSpecsCSV20261025 as importSpecs,proposeNativeGradingPOMTargetRun20261025 as targetRun} from './nativeGradingPOM20261025.js'
const source=()=>({template:{panels:[{id:'front',polygon:{points:[[0,0],[.2,0],[.2,.3],[0,.3]],
  edges:['hem','right','neck','left'],curves:{hem:[[.05,-.04],[.15,-.04]]}}}]}})
const rules=s=>createAccuMarkNativeRuleSet(s).ruleSet
test('draft station preview responds to anchors, curves, grading and invalid selections without target approval',()=>{
  const s=source(),r=rules(s)
  const horizontal=preview(s,r,{panelId:'front',fromPoint:0,toPoint:1})
  const vertical=preview(s,r,{panelId:'front',fromPoint:1,toPoint:2})
  const curved=preview(s,r,{panelId:'front',kind:'sewline-edge',edge:'hem'})
  assert.equal(horizontal.ok,true)
  assert.equal(horizontal.rows.length,6)
  assert.equal(horizontal.rows.find(row=>row.size==='M').actualMm,200)
  assert.equal(vertical.rows.find(row=>row.size==='M').actualMm,300)
  assert(curved.rows.find(row=>row.size==='M').actualMm>200)
  assert.equal(horizontal.verified,false)
  assert.equal(horizontal.manufacturingApproved,false)
  assert.equal(preview(s,r,{panelId:'front',fromPoint:1,toPoint:1}).ok,false)
})
test('native POM chart measures all 6 graded anchor-distances with actual mm',()=>{
  const s=source();let r=rules(s)
  const graded=editAccuMarkNativePointRule(s,r,{panelId:'front',size:'L',pointIndex:1,dxMm:15,dyMm:0})
  assert(graded.ok,graded.reason);r=graded.ruleSet
  const def=create(s,r,{panelId:'front',fromPoint:0,toPoint:1,label:'Front horizontal construction width'})
  assert(def.ok,def.reason)
  let result=inspect(s,r,[def.definition])
  assert.equal(result.ok,false)
  assert.equal(result.rows.length,6)
  assert.equal(result.rows.find(x=>x.size==='M').actualMm,200)
  assert(Math.abs(result.rows.find(x=>x.size==='L').actualMm-215)<1e-8)
  assert(result.issues.some(x=>x.code==='POM_TARGET_REQUIRED'))
  const approvedSpec={...def.definition,targetsMm:Object.fromEntries(result.rows.map(x=>[x.size,x.actualMm]))}
  result=inspect(s,r,[approvedSpec])
  assert.equal(result.verified,true)
  assert.equal(result.manufacturingApproved,false)
  assert.equal(result.nativeCommitted,false)
  approvedSpec.targetsMm.L=210
  assert(inspect(s,r,[approvedSpec]).issues.some(x=>x.code==='POM_OUT_OF_TOLERANCE'))
})
test('edge POM uses actual cubic arclength and does not masquerade as straight width',()=>{
  const s=source(),r=rules(s)
  const made=create(s,r,{panelId:'front',kind:'sewline-edge',edge:'hem'})
  assert(made.ok,made.reason)
  const row=inspect(s,r,[made.definition]).rows.find(x=>x.size==='M')
  assert(row.actualMm>200)
  assert.equal(row.kind,'sewline-edge')
})
test('consecutive sewn path follows native curved edge topology across every graded size and round-trips specifications',()=>{
  const s={...source(),revision:29};let r=rules(s)
  const changed=editAccuMarkNativePointRule(s,r,{panelId:'front',size:'XL',pointIndex:1,dxMm:10,dyMm:0})
  assert(changed.ok,changed.reason);r=changed.ruleSet
  const path=create(s,r,{panelId:'front',kind:'sewline-path',fromPoint:0,toPoint:2}).definition
  const hem=create(s,r,{panelId:'front',kind:'sewline-edge',edge:'hem'}).definition
  const side=create(s,r,{panelId:'front',kind:'sewline-edge',edge:'right'}).definition
  const pathRows=inspect(s,r,[path]).rows
  for(const size of ['XS','S','M','L','XL','XXL']){
    const actual=pathRows.find(row=>row.size===size).actualMm
    const expected=inspect(s,r,[hem,side]).rows.filter(row=>row.size===size)
      .reduce((total,row)=>total+row.actualMm,0)
    assert(Math.abs(actual-expected)<1e-7,`${size} curved length sum`)
  }
  const straight=inspect(s,r,[create(s,r,{panelId:'front',fromPoint:0,toPoint:2}).definition]).rows
  assert(pathRows[0].actualMm>straight[0].actualMm)
  const populated={...path,id:'sew-path-1',targetsMm:Object.fromEntries(pathRows.map(row=>[row.size,row.actualMm]))}
  const csv=exportSpecs(s,r,[populated]);assert(csv.ok,csv.reason)
  const imported=importSpecs(csv.csv,s,r);assert(imported.ok,imported.reason)
  assert.deepEqual(imported.definitions,[populated])
  const revised=revise(s,r,populated,{fromPoint:3});assert(revised.ok,revised.reason)
  assert.equal(revised.definition.id,'sew-path-1')
  assert(Object.values(revised.definition.targetsMm).every(value=>value===null))
  assert.equal(revise(s,r,populated,{toPoint:0}).ok,false)
  assert.equal(create(s,r,{panelId:'front',kind:'sewline-path',fromPoint:0,toPoint:4}).ok,false)
  assert.equal(inspect(s,r,[{...populated,toPoint:20}]).verified,false)
})
test('incomplete, stale, malicious and impossible specs fail closed',()=>{
  const s=source(),r=rules(s)
  const made=create(s,r,{panelId:'front'}).definition
  assert.equal(create(s,r,{panelId:'front',fromPoint:0,toPoint:0}).ok,false)
  assert.equal(inspect(s,r,[{...made,targetsMm:{M:200}}]).ok,false)
  assert.equal(inspect(s,r,[{...made,toleranceMm:Infinity}]).ok,false)
  assert.equal(inspect(s,r,[made,made]).ok,false)
  s.template.panels[0].polygon.points[0][0]=.01
  assert.equal(inspect(s,r,[made]).ok,false)
})
test('editing a measurement station preserves identity but invalidates prior six-size targets',()=>{
  const s=source(),r=rules(s)
  const base=create(s,r,{panelId:'front',fromPoint:0,toPoint:1}).definition
  const measured=inspect(s,r,[base]).rows
  const full={...base,id:'factory-front-width',targetsMm:Object.fromEntries(measured.map(row=>[row.size,row.actualMm]))}
  assert.equal(inspect(s,r,[full]).verified,true)
  const revised=revise(s,r,full,{toPoint:2})
  assert(revised.ok,revised.reason)
  assert.equal(revised.definition.id,full.id)
  assert.equal(revised.definition.toPoint,2)
  assert.deepEqual(Object.values(revised.definition.targetsMm),Array(6).fill(null))
  assert.equal(inspect(s,r,[revised.definition]).verified,false)
  assert.equal(revise(s,r,full,{toPoint:0}).ok,false)
  assert.strictEqual(revise(s,r,full,{toPoint:1}).definition,full)
  const edge=create(s,r,{panelId:'front',kind:'sewline-edge',edge:'hem'}).definition
  const switched=revise(s,r,edge,{edge:'right'})
  assert(switched.ok)
  assert.equal(switched.definition.edge,'right')
  assert.equal(inspect(s,r,[switched.definition]).verified,false)
})
test('malformed and tampered definitions cannot pass even with matching target values',()=>{
  const s=source(),r=rules(s),base=create(s,r,{panelId:'front'}).definition
  const populated={...base,targetsMm:Object.fromEntries(inspect(s,r,[base]).rows.map(row=>[row.size,row.actualMm]))}
  assert.equal(inspect(s,r,[populated]).verified,true)
  for(const changes of [
    {kind:'fake-unsupported'}, {fromPoint:-1},{fromPoint:1.5},{toPoint:99},
    {toPoint:0},{targetsMm:{...populated.targetsMm,EXTRA:200}},
    {targetsMm:Object.assign(Object.create(null),populated.targetsMm,{XXL:NaN})},
  ]){
    const output=inspect(s,r,[{...populated,...changes}])
    assert.equal(output.verified,false,JSON.stringify(changes))
    assert.equal(output.manufacturingApproved,false)
  }
  assert.equal(create(s,r,{panelId:'front',kind:'fake-unsupported'}).ok,false)
  assert.equal(revise(s,r,populated,{fromPoint:99}).ok,false)
})
test('target specification CSV round-trips exact six-size data and stable POM identities',()=>{
  const s={...source(),revision:17},r=rules(s)
  const anchor=create(s,r,{panelId:'front',label:'Chest, width "finished"'}).definition
  const edge=create(s,r,{panelId:'front',kind:'sewline-edge',edge:'hem',label:'Hem curve'}).definition
  const specs=[anchor,edge].map((def,i)=>({...def,id:`persisted-${i}`,
    targetsMm:Object.fromEntries(inspect(s,r,[def]).rows.map(row=>[row.size,row.actualMm+i+.125]))}))
  const exported=exportSpecs(s,r,specs)
  assert(exported.ok,exported.reason)
  assert.equal(exported.rows,12)
  const result=importSpecs(exported.csv,s,r,[anchor])
  assert(result.ok,result.reason)
  assert.deepEqual(result.definitions,specs)
  assert.equal(result.manufacturingApproved,false)
  assert.deepEqual([anchor,edge].map(x=>x.targetsMm.M),[null,null])
})
test('CSV import fails atomically on stale, duplicate, partial, formula and altered metadata',()=>{
  const s={...source(),revision:21},r=rules(s)
  const def=create(s,r,{panelId:'front'}).definition
  const originals=[{...def,id:'original',targetsMm:Object.fromEntries(inspect(s,r,[def]).rows.map(row=>[row.size,row.actualMm]))}]
  const csv=exportSpecs(s,r,originals).csv
  const lines=csv.trimEnd().split('\r\n')
  const attacks=[
    lines.slice(0,-1).join('\r\n'),
    [...lines,lines[1]].join('\r\n'),
    csv.replace('"XS"','"M"'),
    csv.replace('"mm"','"cm"'),
    csv.replace('"original"','"=IMPORT(1)"'),
    csv.replace('"anchor-distance"','"sewline-edge"'),
    csv.replace(/("mm","2",")[^"]+/, '$1NaN'),
    csv.replace('"2"','"Infinity"'),
    csv.replace('"front"','"unknown"'),
    csv.replace('"targetMm"','"actualMm"'),
  ]
  for(const [index,candidate] of attacks.entries()){
    const before=structuredClone(originals)
    const result=importSpecs(candidate,s,r,originals)
    assert.equal(result.ok,false,`attack ${index}: ${result.reason}`)
    assert.deepEqual(originals,before)
  }
  assert.equal(importSpecs(csv,{...s,revision:22},r,originals).ok,false)
  const changed=structuredClone(s)
  changed.template.panels[0].polygon.seam_allowances={hem:.01}
  assert.equal(importSpecs(csv,changed,r,originals).ok,false)
  assert.equal(exportSpecs(s,r,[def]).ok,false,'partial targets cannot be distributed as complete specs')
})

test('CSV import rejects old point-grade offsets even with unchanged template and revision',()=>{
  const s={...source(),revision:44},r=rules(s)
  const def=create(s,r,{panelId:'front',fromPoint:0,toPoint:1}).definition
  const originalRows=inspect(s,r,[def]).rows
  const populated={...def,targetsMm:Object.fromEntries(originalRows.map(row=>[row.size,row.actualMm]))}
  const csv=exportSpecs(s,r,[populated]);assert(csv.ok,csv.reason)
  const changed=editAccuMarkNativePointRule(s,r,{panelId:'front',size:'L',pointIndex:1,dxMm:25,dyMm:0})
  assert(changed.ok,changed.reason)
  assert.equal(changed.ruleSet.templateFingerprint,r.templateFingerprint)
  assert.equal(inspect(s,changed.ruleSet,[populated]).rows.find(row=>row.size==='L').actualMm,225)
  const before=structuredClone([populated])
  const imported=importSpecs(csv.csv,s,changed.ruleSet,[populated])
  assert.equal(imported.ok,false)
  assert.match(imported.reason,/Stale or mismatched grading source/)
  assert.deepEqual([populated],before)
  assert.equal(importSpecs(csv.csv,s,r,[populated]).ok,true)
})

test('specification size increments are independent of graded measurements and preserve source',()=>{
  const s={...source(),revision:31},r=rules(s)
  const def=create(s,r,{panelId:'front'}).definition
  const before=structuredClone({s,r,def})
  const result=targetRun(s,r,def,{baseTargetMm:210,incrementMm:5})
  assert(result.ok,result.reason)
  assert.deepEqual(result.definition.targetsMm,{XS:200,S:205,M:210,L:215,XL:220,XXL:225})
  assert.equal(result.withinTolerance,false)
  assert.equal(result.rows.find(row=>row.size==='M').deltaMm,-10)
  assert.equal(result.manufacturingApproved,false)
  assert.deepEqual(structuredClone({s,r,def}),before)
  const csv=exportSpecs(s,r,[result.definition]);assert(csv.ok,csv.reason)
  const restored=importSpecs(csv.csv,s,r);assert(restored.ok,restored.reason)
  assert.deepEqual(restored.definitions,[result.definition])
})
test('target runs honor non-default base size, negative increments and zero increments',()=>{
  const s=source(),created=createAccuMarkNativeRuleSet(s,{baseSize:'L'})
  assert(created.ok,created.reason)
  const r=created.ruleSet,def=create(s,r,{panelId:'front'}).definition
  const decreasing=targetRun(s,r,def,{baseTargetMm:200,incrementMm:-2.5})
  assert(decreasing.ok,decreasing.reason)
  assert.deepEqual(decreasing.definition.targetsMm,{XS:207.5,S:205,M:202.5,L:200,XL:197.5,XXL:195})
  const fixed=targetRun(s,r,def,{baseTargetMm:200,incrementMm:0})
  assert(fixed.ok,fixed.reason)
  assert(Object.values(fixed.definition.targetsMm).every(value=>value===200))
})
test('invalid or stale increment proposals reject atomically without replacing existing targets',()=>{
  const s=source(),r=rules(s),def=create(s,r,{panelId:'front'}).definition
  const before=structuredClone(def)
  for(const options of [{baseTargetMm:10,incrementMm:10},{baseTargetMm:9999,incrementMm:1},
    {baseTargetMm:0,incrementMm:0},{baseTargetMm:200,incrementMm:NaN},
    {baseTargetMm:Infinity,incrementMm:1},{baseTargetMm:'200',incrementMm:1},
    {baseTargetMm:200,incrementMm:null}]){
    assert.equal(targetRun(s,r,def,options).ok,false,JSON.stringify(options))
    assert.deepEqual(def,before)
  }
  s.template.panels[0].polygon.points[1][0]+=.01
  assert.equal(targetRun(s,r,def,{baseTargetMm:200,incrementMm:1}).ok,false)
})
