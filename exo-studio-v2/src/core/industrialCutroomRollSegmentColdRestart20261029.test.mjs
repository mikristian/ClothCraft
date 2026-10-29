import test from 'node:test'
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {createTeeTemplate} from '../data/templates.js'
import {inspectIndustrialMarkerCutWorkflow20261028 as inspect} from './industrialMarkerCutWorkflow20261028.mjs'
import {inspectIndustrialManualMarkerStudy20261029 as inspectManual} from './industrialManualMarkerStudy20261029.mjs'

// Fresh child process must rebuild geometry: it cannot inherit a module-local
// marker hash cache. No installed project or EXO backend is accessed.
test('cold-process roll plan reconstructs source markers and refuses forged CUT coordinates', () => {
  const project = JSON.parse(JSON.stringify(createTeeTemplate()))
  for(const piece of project.pieces) {
    piece.notches=[];piece.internalLines=[];piece.buttonholes=[]
    piece.marker={nap:'one-way',allowCrossGrain:false};piece.grainAngleDeg=0
  }
  const markerStudy=inspect(project,{fabricWidthCm:150,maxCandidates:50000})
  assert.equal(markerStudy.ok,true,JSON.stringify(markerStudy.issues))
  const sizes=project.grading.sizes
  const layPolicy={
    ordersBySize:Object.fromEntries(sizes.map(s=>[s,2])),
    laysBySize:Object.fromEntries(sizes.map(s=>[s,{
      main:{rollId:'ROLL-COLD',plies:2,markerRepeats:1,endLossCmPerPly:1},
    }])),
    rollsById:{'ROLL-COLD':{fabricId:'main',usableWidthCm:150,availableLengthCm:100000}},
  }
  const shadePolicy={
    orderMaterialsByFabric:{main:{shadeId:'BLACK',dyeLotId:'LOT-COLD',maxPlyCount:2}},
    rollProvenanceById:{'ROLL-COLD':{
      fabricId:'main',shadeId:'BLACK',dyeLotId:'LOT-COLD',
      batchId:'SYNTHETIC-COLD',maxPlyCount:2,
    }},
  }
  const freshProcess=[
    "import fs from 'node:fs'",
    "import {planIndustrialCutroomRollSegments20261029 as plan} from './src/core/industrialCutroomRollSegmentPlanner20261029.mjs'",
    "const {project,markerStudy,layPolicy,shadePolicy}=JSON.parse(fs.readFileSync(0,'utf8'))",
    "const options={defectsByRoll:{'ROLL-COLD':[]}}",
    "const valid=plan(project,markerStudy,layPolicy,shadePolicy,options)",
    "const changed=structuredClone(markerStudy)",
    "changed.rows[0].marker.placements[0].x+=0.25",
    "const forged=plan(project,changed,layPolicy,shadePolicy,options)",
    "const staleProject=structuredClone(project)",
    "staleProject.pieces[0].points[0].x+=0.02",
    "const stale=plan(staleProject,markerStudy,layPolicy,shadePolicy,options)",
    "console.log(JSON.stringify({valid:valid.ok,validPlies:valid.inspectedPlyCount,factoryApproved:valid.factoryApproved,cuttingAuthorized:valid.cuttingAuthorized,forgedBlocked:forged.ok===false,forgedReason:forged.issues?.[0]?.code,staleBlocked:stale.ok===false,staleReason:stale.issues?.[0]?.code}))",
  ].join('\n')
  const original=JSON.stringify({project,markerStudy,layPolicy,shadePolicy})
  const child=spawnSync(process.execPath,['--input-type=module','-e',freshProcess],{
    cwd:process.cwd(),input:original,encoding:'utf8',
    maxBuffer:2_000_000,timeout:120000,
  })
  assert.equal(child.status,0,child.stderr||child.error?.message||child.stdout)
  const result=JSON.parse(child.stdout.trim())
  assert.deepEqual(result,{
    valid:true,validPlies:sizes.length*2,
    factoryApproved:false,cuttingAuthorized:false,
    forgedBlocked:true,forgedReason:'ROLL_PLAN_MARKER_SOURCE_WITNESS_MISMATCH',
    staleBlocked:true,staleReason:'ROLL_PLAN_STALE_MARKER_SOURCE',
  })
  assert.equal(JSON.stringify({project,markerStudy,layPolicy,shadePolicy}),original)
})

test('cold-process manual edit replays real graded CUT, and refuses altered journal, marks, and source',()=>{
  const project=JSON.parse(JSON.stringify(createTeeTemplate()))
  for(const piece of project.pieces){
    piece.notches=[];piece.internalLines=[];piece.buttonholes=[]
    piece.marker={nap:'one-way',allowCrossGrain:false};piece.grainAngleDeg=0
  }
  const original=JSON.stringify(project)
  const auto=inspect(project,{fabricWidthCm:150,maxCandidates:50000})
  assert.equal(auto.ok,true,JSON.stringify(auto.issues))
  const first=auto.rows[0]
  const selected=first.marker.placements[0]
  const edit={
    size:first.size,fabricId:first.fabricId,pieceId:selected.pieceId,
    instance:selected.instance,x:0,y:first.marker.metrics.length+3,
    rotationDeg:selected.rotationDeg,
  }
  const manual=inspectManual(project,[edit],auto.markerBuildOptions)
  assert.equal(manual.ok,true,JSON.stringify(manual.issues))
  assert.equal(manual.cuttingAuthorized,false)
  const sizes=project.grading.sizes
  const layPolicy={
    ordersBySize:Object.fromEntries(sizes.map(s=>[s,2])),
    laysBySize:Object.fromEntries(sizes.map(s=>[s,{
      main:{rollId:'ROLL-MANUAL',plies:2,markerRepeats:1,endLossCmPerPly:1},
    }])),
    rollsById:{'ROLL-MANUAL':{
      fabricId:'main',usableWidthCm:150,availableLengthCm:100000,
    }},
  }
  const shadePolicy={
    orderMaterialsByFabric:{main:{shadeId:'BLACK',dyeLotId:'LOT',maxPlyCount:2}},
    rollProvenanceById:{'ROLL-MANUAL':{
      fabricId:'main',shadeId:'BLACK',dyeLotId:'LOT',
      batchId:'SYNTHETIC-MANUAL',maxPlyCount:2,
    }},
  }
  // Order forged CUT and option checks BEFORE the valid call to force an
  // independent cold-cache rebuild, never a false pass through a parent cache.
  const program=[
    "import fs from 'node:fs'",
    "import {planIndustrialCutroomRollSegments20261029 as plan} from './src/core/industrialCutroomRollSegmentPlanner20261029.mjs'",
    "const {project,manual,layPolicy,shadePolicy}=JSON.parse(fs.readFileSync(0,'utf8'))",
    "const options={defectsByRoll:{'ROLL-MANUAL':[]}}",
    "const forged=structuredClone(manual)",
    "forged.rows[0].marker.placements[0].outline[0].x+=0.25",
    "const forgedResult=plan(project,forged,layPolicy,shadePolicy,options)",
    "const valid=plan(project,manual,layPolicy,shadePolicy,options)",
    "const alteredOptions=structuredClone(manual)",
    "alteredOptions.markerBuildOptions.spacingCm+=0.5",
    "const changedOptions=plan(project,alteredOptions,layPolicy,shadePolicy,options)",
    "const invalidJournal=structuredClone(manual)",
    "invalidJournal.manualMarkerEditsV1[0].x=500",
    "const badJournal=plan(project,invalidJournal,layPolicy,shadePolicy,options)",
    "const stale=structuredClone(project)",
    "stale.pieces[0].points[0].x+=0.02",
    "const staleResult=plan(stale,manual,layPolicy,shadePolicy,options)",
    "console.log(JSON.stringify({",
    "valid:valid.ok,plies:valid.inspectedPlyCount,approved:valid.factoryApproved,cutAuthorized:valid.cuttingAuthorized,",
    "forgedBlocked:!forgedResult.ok,optionBlocked:!changedOptions.ok,",
    "journalBlocked:!badJournal.ok,staleBlocked:!staleResult.ok,",
    "staleCode:staleResult.issues?.[0]?.code",
    "}))",
  ].join('\n')
  const result=spawnSync(process.execPath,['--input-type=module','-e',program],{
    cwd:process.cwd(),
    input:JSON.stringify({project,manual,layPolicy,shadePolicy}),
    encoding:'utf8',maxBuffer:2_000_000,timeout:240000,
  })
  assert.equal(result.status,0,result.stderr||result.error?.message||result.stdout)
  assert.deepEqual(JSON.parse(result.stdout.trim()),{
    valid:true,plies:12,approved:false,cutAuthorized:false,
    forgedBlocked:true,optionBlocked:true,journalBlocked:true,
    staleBlocked:true,staleCode:'ROLL_PLAN_STALE_MARKER_SOURCE',
  })
  assert.equal(JSON.stringify(project),original)
})
