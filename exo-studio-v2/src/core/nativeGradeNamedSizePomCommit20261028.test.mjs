import test from 'node:test'
import assert from 'node:assert/strict'
import {createAccuMarkNativeRuleSet,editAccuMarkNativePointRule} from './accumarkNativePointRuleSet20261023.js'
import {prepareNativeGradeCatalog20261025} from './nativeGradeCatalogBridge20261025.js'
import {inspectNativeGradingPOM20261025} from './nativeGradingPOM20261025.js'
import {commitNativeGradeNamedSizePom20261028 as commit} from './nativeGradeNamedSizePomCommit20261028.js'

function fixture(options={}){
  const snapshot={revision:17,gradeRunPersisted:true,activeGradedSize:null,
    template:{seams:[],fabrics:[],panels:[{id:'front',polygon:{
      points:[[0,0],[.2,0],[.2,.3],[0,.3]],
      edges:['hem','side','neck','left'],
    }}]}}
  const sizes=options.sizes??['2','4','6','8','10']
  const initial=createAccuMarkNativeRuleSet(snapshot,{sizes,baseSize:'6'})
  assert.equal(initial.ok,true,initial.reason)
  const edited=editAccuMarkNativePointRule(snapshot,initial.ruleSet,{
    panelId:'front',pointIndex:1,size:sizes.at(-1),dxMm:8,dyMm:0,
  })
  assert.equal(edited.ok,true,edited.reason)
  const ruleSet=edited.ruleSet
  const savedDefinitions=[{id:'width',label:'Front width',panelId:'front',
    kind:'anchor-distance',fromPoint:0,toPoint:1,toleranceMm:2,
    targetsMm:Object.fromEntries(sizes.map(size=>[size,size===sizes.at(-1)?208:200]))}]
  const prepared=prepareNativeGradeCatalog20261025(snapshot,{
    template:snapshot.template,
  },ruleSet,{pomDefinitions:savedDefinitions})
  assert.equal(prepared.ok,true,prepared.reason)
  let revision=17,catalog=structuredClone(prepared.gradeRun)
  const calls=[]
  const request=async packet=>{
    calls.push(packet.op)
    if(packet.revision!==undefined&&packet.revision!==revision)
      throw Error('stale native revision')
    if(packet.op==='grade-run-status')return {
      revision,persistedInProject:true,sizeActivated:false,
      catalog:options.tamperPostCatalog&&revision===18?
        {...structuredClone(catalog),sizes:['forged']}:structuredClone(catalog),
    }
    if(packet.op==='save')return {project:{
      template:structuredClone(snapshot.template),
      grade_run:options.tamperPostSave&&revision===18?
        {...structuredClone(catalog),baseSize:'forged'}:structuredClone(catalog),
    }}
    if(packet.op==='grade-run-commit'){
      catalog=structuredClone(packet.gradeRun)
      revision++
      if(options.dropReceipt)throw Error('network response lost')
      return {revision:options.badReceipt?17:revision,gradeRunCommitted:true}
    }
    if(packet.op==='snapshot')return {...structuredClone(snapshot),revision}
    if(packet.op==='grade-run-pom-audit'){
      const defs=catalog.pomSpecs
      const measured=inspectNativeGradingPOM20261025({...snapshot,revision},ruleSet,
        defs,{allowNamedSizes:true})
      assert.equal(measured.reason,undefined,measured.reason)
      const rows=measured.rows.map(row=>({
        pomId:row.id,label:row.label,panelId:row.panelId,kind:row.kind,
        size:row.size,measuredMm:row.actualMm,targetMm:row.targetMm,
        deltaMm:row.deltaMm,toleranceMm:row.toleranceMm,
        withinTolerance:row.pass,scored:true,
      }))
      if(options.tamperAudit)rows[0].measuredMm+=10
      const passed=rows.filter(row=>row.withinTolerance).length
      const failed=rows.length-passed
      return {format:'exo-native-named-grade-pom-audit.v2',schemaVersion:2,
        source:'persisted-native-grade-run',units:'mm',factoryApproved:false,
        sizeCount:sizes.length,pomCount:defs.length,total:rows.length,rows,
        scored:rows.length,passed,failed,unscored:0,
        numericalAcceptanceComplete:failed===0,acceptanceComplete:failed===0,
        blockers:rows.filter(row=>!row.withinTolerance).map(row=>
          'POM '+row.pomId+' size '+row.size+' exceeds tolerance: delta '+
          row.deltaMm+' mm, tolerance '+row.toleranceMm+' mm'),
      }
    }
    throw Error('Unexpected native operation '+packet.op)
  }
  return {snapshot,ruleSet,savedDefinitions,
    definitions:[{...savedDefinitions[0],targetsMm:{
      ...savedDefinitions[0].targetsMm,[sizes.at(-1)]:options.target??207,
    }}],
    request,calls,getRevision:()=>revision,getCatalog:()=>catalog}
}

test('five-size target-only edit commits once, checks native numerical rows and durable geometry',async()=>{
  const f=fixture()
  const result=await commit({...f,expectedRevision:17})
  assert.equal(result.ok,true,result.reason)
  assert.equal(result.revision,18)
  assert.equal(result.nativeNumericalAccepted,true)
  assert.equal(result.witness.nativeRowsVerified,5)
  assert.equal(result.factoryApproved,false)
  assert.equal(f.getRevision(),18)
  assert.deepEqual(f.getCatalog().pomSpecs,f.definitions)
  assert.deepEqual(f.calls,['grade-run-status','save','grade-run-commit',
    'snapshot','grade-run-status','save','grade-run-pom-audit'])
})

test('out-of-tolerance physical target may persist only as an unapproved draft',async()=>{
  const f=fixture({target:250})
  const result=await commit({...f,expectedRevision:17})
  assert.equal(result.ok,true,result.reason)
  assert.equal(result.nativeNumericalAccepted,false)
  assert.equal(result.witness.failed,1)
  assert.equal(result.manufacturingApproved,false)
})

test('complete 24-size canonical POM inventory commits without fixed XS–XXL assumptions',async()=>{
  const sizes=Array.from({length:24},(_,index)=>String(index+1))
  const f=fixture({sizes})
  const result=await commit({...f,expectedRevision:17})
  assert.equal(result.ok,true,result.reason)
  assert.equal(result.witness.nativeRowsVerified,24)
  assert.deepEqual(result.witness.canonicalSizes,sizes)
  assert.equal(f.getCatalog().pomSpecs[0].targetsMm['24'],207)
  assert.equal(result.factoryApproved,false)
})

test('stale revision, missing targets, changed station and grade-rule tamper refuse before dispatch',async()=>{
  const stale=fixture()
  assert.equal((await commit({...stale,expectedRevision:16})).ok,false)
  assert.equal(stale.calls.length,0)
  const missing=fixture()
  missing.definitions[0].targetsMm['10']=null
  assert.equal((await commit({...missing,expectedRevision:17})).ok,false)
  assert.equal(missing.calls.includes('grade-run-commit'),false)
  const station=fixture()
  station.definitions[0].toleranceMm=3
  assert.equal((await commit({...station,expectedRevision:17})).ok,false)
  assert.equal(station.calls.includes('grade-run-commit'),false)
  const altered=fixture()
  altered.ruleSet.panels.front.pointOffsetsMm['10'][1][0]=14
  assert.equal((await commit({...altered,expectedRevision:17})).ok,false)
  assert.equal(altered.calls.includes('grade-run-commit'),false)
})

test('unchanged POM and added station are not silently committed',async()=>{
  const unchanged=fixture()
  unchanged.definitions=structuredClone(unchanged.savedDefinitions)
  assert.match((await commit({...unchanged,expectedRevision:17})).reason,/No changed/)
  const added=fixture()
  added.definitions.push({...added.definitions[0],id:'new-station'})
  assert.equal((await commit({...added,expectedRevision:17})).ok,false)
  assert.equal(added.calls.includes('grade-run-commit'),false)
})

test('lost or incorrect commit receipt requires recovery, never assumes rollback',async()=>{
  for(const options of [{dropReceipt:true},{badReceipt:true}]){
    const f=fixture(options)
    const result=await commit({...f,expectedRevision:17})
    assert.equal(result.ok,false)
    assert.equal(result.needsNativeRecovery,true)
    assert.equal(result.nativeCommitted,false)
    assert.equal(f.getRevision(),18)
  }
})

test('forged postcommit catalog, save or physical audit is rejected after dispatch',async()=>{
  for(const options of [{tamperPostCatalog:true},{tamperPostSave:true},{tamperAudit:true}]){
    const f=fixture(options)
    const result=await commit({...f,expectedRevision:17})
    assert.equal(result.ok,false)
    assert.equal(result.needsNativeRecovery,true)
    assert.equal(result.nativeCommitted,true)
    assert.equal(f.getRevision(),18)
  }
})

test('concurrent POM editor changes during asynchronous preflight fail before Rust dispatch',async()=>{
  const f=fixture()
  const request=async packet=>{
    const reply=await f.request(packet)
    if(packet.op==='grade-run-status')f.definitions[0].targetsMm['10']=299
    return reply
  }
  const result=await commit({...f,request,expectedRevision:17})
  assert.equal(result.ok,false)
  assert.match(result.reason,/changed during native preflight/)
  assert.equal(result.needsNativeRecovery,false)
  assert.equal(f.calls.includes('grade-run-commit'),false)
  assert.equal(f.getRevision(),17)
})

test('postdispatch editor and transport mutations cannot change intended Rust POM witness',async()=>{
  const f=fixture()
  const request=async packet=>{
    const reply=await f.request(packet)
    if(packet.op==='grade-run-commit'){
      packet.gradeRun.pomSpecs[0].targetsMm['10']=999
      f.definitions[0].targetsMm['10']=999
    }
    return reply
  }
  const result=await commit({...f,request,expectedRevision:17})
  assert.equal(result.ok,true,result.reason)
  assert.equal(result.nativeNumericalAccepted,true)
  assert.equal(result.definitions[0].targetsMm['10'],207)
  assert.equal(result.project.grade_run.pomSpecs[0].targetsMm['10'],207)
  assert.equal(f.getCatalog().pomSpecs[0].targetsMm['10'],207)
  assert.equal(result.factoryApproved,false)
})
