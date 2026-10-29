import test from 'node:test'
import assert from 'node:assert/strict'
import {createAccuMarkNativeRuleSet,editAccuMarkNativePointRule} from './accumarkNativePointRuleSet20261023.js'
import {prepareNativeGradeCatalog20261025} from './nativeGradeCatalogBridge20261025.js'
import {inspectNativeGradingPOM20261025} from './nativeGradingPOM20261025.js'
import {verifyNativeGradePomAuditWitness20261028 as verify} from './nativeGradePomAuditWitness20261028.js'

function fixture(){
  const sizes=['2','4','6','8','10']
  const snapshot={revision:12,template:{seams:[],fabrics:[],panels:[{
    id:'front',polygon:{points:[[0,0],[.2,0],[.2,.3],[0,.3]],
      edges:['hem','side','neck','left']},
  }]}}
  let created=createAccuMarkNativeRuleSet(snapshot,{sizes,baseSize:'6'})
  assert.equal(created.ok,true,created.reason)
  created=editAccuMarkNativePointRule(snapshot,created.ruleSet,{
    panelId:'front',pointIndex:1,size:'10',dxMm:8,dyMm:0,
  })
  assert.equal(created.ok,true,created.reason)
  const ruleSet=created.ruleSet
  const definitions=[{
    id:'width',label:'Front width',panelId:'front',kind:'anchor-distance',
    fromPoint:0,toPoint:1,toleranceMm:2,
    targetsMm:{'2':200,'4':200,'6':200,'8':200,'10':208},
  },{
    id:'path',label:'Clockwise boundary',panelId:'front',kind:'sewline-path',
    fromPoint:3,toPoint:1,toleranceMm:2,
    targetsMm:{'2':500,'4':500,'6':500,'8':500,'10':508},
  }]
  const prepared=prepareNativeGradeCatalog20261025(snapshot,{
    template:snapshot.template,
  },ruleSet,{pomDefinitions:definitions})
  assert.equal(prepared.ok,true,prepared.reason)
  const status={revision:snapshot.revision,persistedInProject:true,
    catalog:prepared.gradeRun}
  const measured=inspectNativeGradingPOM20261025(snapshot,ruleSet,definitions,{
    allowNamedSizes:true,
  })
  assert.equal(measured.reason,undefined,measured.reason)
  const rows=measured.rows.map(row=>({
    pomId:row.id,label:row.label,panelId:row.panelId,kind:row.kind,size:row.size,
    measuredMm:row.actualMm,targetMm:row.targetMm,deltaMm:row.deltaMm,
    toleranceMm:row.toleranceMm,withinTolerance:row.targetMm===null?null:row.pass,
    scored:row.targetMm!==null,
  }))
  const passed=rows.filter(row=>row.withinTolerance===true).length
  const failed=rows.filter(row=>row.withinTolerance===false).length
  const unscored=rows.filter(row=>row.withinTolerance===null).length
  const audit={format:'exo-native-named-grade-pom-audit.v2',schemaVersion:2,
    source:'persisted-native-grade-run',units:'mm',factoryApproved:false,
    sizeCount:sizes.length,pomCount:definitions.length,total:rows.length,
    rows,scored:passed+failed,passed,failed,unscored,
    numericalAcceptanceComplete:failed===0&&unscored===0,
    acceptanceComplete:failed===0&&unscored===0,
    blockers:rows.filter(row=>row.withinTolerance!==true).map(row=>
      row.withinTolerance===null?
        'POM '+row.pomId+' size '+row.size+' has no authored target':
        'POM '+row.pomId+' size '+row.size+' exceeds tolerance: delta '+
          row.deltaMm+' mm, tolerance '+row.toleranceMm+' mm'),
  }
  return {snapshot,ruleSet,definitions,status,audit}
}

test('verifies exact saved five-size Rust audit contract including wrapped sewn boundary path',()=>{
  const f=fixture(),result=verify(f)
  assert.equal(result.ok,true,result.reason)
  assert.equal(result.nativeRowsVerified,10)
  assert.equal(result.nativeNumericalAccepted,true)
  assert.equal(result.factoryApproved,false)
  assert.equal(result.manufacturingApproved,false)
})

test('rejects forged native measured coordinates, deltas and claimed acceptance',()=>{
  for(const mutation of [
    audit=>{audit.rows[0].measuredMm+=2},
    audit=>{audit.rows[0].deltaMm+=1},
    audit=>{audit.rows[0].withinTolerance=false},
    audit=>{audit.passed++},
    audit=>{audit.numericalAcceptanceComplete=false},
    audit=>{audit.factoryApproved=true},
  ]){
    const f=fixture()
    mutation(f.audit)
    assert.equal(verify(f).ok,false)
  }
})

test('rejects missing/duplicate/out-of-order rows and stale Rust grade catalogs',()=>{
  for(const mutation of [
    audit=>audit.rows.pop(),
    audit=>{audit.rows[1]=structuredClone(audit.rows[0])},
    audit=>audit.rows.reverse(),
    audit=>{audit.sizeCount=6},
  ]){
    const f=fixture()
    mutation(f.audit)
    assert.equal(verify(f).ok,false)
  }
  const f=fixture()
  f.status.catalog.gradedTemplates[4].panels[0].polygon.points[1][0]+=.01
  assert.equal(verify(f).ok,false)
})

test('authentic out-of-tolerance native POM report is verified but never numerically accepted',()=>{
  const f=fixture()
  f.definitions[0].targetsMm['10']=250
  f.status.catalog.pomSpecs[0].targetsMm['10']=250
  const row=f.audit.rows[4]
  row.targetMm=250
  row.deltaMm=row.measuredMm-250
  row.withinTolerance=false
  f.audit.passed--
  f.audit.failed++
  f.audit.numericalAcceptanceComplete=false
  f.audit.acceptanceComplete=false
  f.audit.blockers.push('POM width size 10 exceeds tolerance: delta -42 mm, tolerance 2 mm')
  const result=verify(f)
  assert.equal(result.ok,true,result.reason)
  assert.equal(result.nativeNumericalAccepted,false)
  assert.equal(result.failed,1)
  assert.equal(result.factoryApproved,false)
})

test('unscored POM target stays unapproved and native audit must report null, never false',()=>{
  const f=fixture()
  f.definitions[0].targetsMm['10']=null
  f.status.catalog.pomSpecs[0].targetsMm['10']=null
  const row=f.audit.rows[4]
  row.targetMm=null
  row.deltaMm=null
  row.withinTolerance=null
  row.scored=false
  f.audit.passed--
  f.audit.scored--
  f.audit.unscored++
  f.audit.numericalAcceptanceComplete=false
  f.audit.acceptanceComplete=false
  f.audit.blockers.push('POM width size 10 has no authored target')
  const result=verify(f)
  assert.equal(result.ok,true,result.reason)
  assert.equal(result.unscored,1)
  assert.equal(result.nativeNumericalAccepted,false)
  f.audit.rows[4].withinTolerance=false
  assert.equal(verify(f).ok,false)
})
