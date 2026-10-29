import test from 'node:test'
import assert from 'node:assert/strict'
import {createAccuMarkMtmDraft20261024 as draft} from './accumarkMtmDraftFoundation20261024.js'
import {transferAccuMarkMtmReference20261024 as transfer} from './accumarkMtmLegacyTransfer20261024.js'
import {nestPolygons} from './accumarkPolygonNesting20261024.js'
import {adjustAccuMarkManualMarker20261024 as move} from './accumarkManualMarker20261024.js'
import {buildAccuMarkCutterPathStudy20261024 as plot} from './accumarkCutterPathStudy20261024.js'
import {buildAccuMarkExplorerOrder20261024 as order,
 exportAccuMarkExplorerOrderCsv20261024 as csv,auditAccuMarkExplorerOrderCsv20261024 as auditCsv} from './accumarkExplorerProductionFoundation20261024.js'
import {buildAccuMarkCutRoomPlan} from './accumarkCutRoomPlan20261024.js'

const profile={chestCm:98,waistCm:82,hipCm:100,bodyLengthCm:70,
 shoulderWidthCm:44,neckCm:39,armholeDepthCm:23,easeChestCm:8,size:'M'}
test('MTM -> editable EXO -> polygon nest -> manual edit -> cutter preview -> model/BOM/ERP -> cutroom',()=>{
 const input=draft(profile)
 assert.equal(input.ok,true,input.reason)
 const transferred=transfer({id:'old',pieces:[],seams:[{id:'old'}]},input)
 assert.equal(transferred.ok,true)
 const project=transferred.project
 assert.equal(project.seams.length,0)
 const copy=structuredClone(project)
 const nest=nestPolygons(project,{fabricWidth:150,gap:1.5})
 assert.equal(nest.ok,true,JSON.stringify(nest))
 const p=nest.placements[0]
 const relocated=move(project,nest,{pieceId:p.pieceId,instance:p.instance,
   x:105,y:0,rotationDeg:0,fabricWidthCm:150,gapCm:1.5})
 assert.equal(relocated.ok,true,relocated.reason)
 const study=plot(relocated,{fabricWidthCm:150,spaceCm:1.5})
 assert.equal(study.ok,true,study.reason)
 assert.equal(study.cuttingAuthorized,false)
 const model=order(project,{styleId:'TOR-BLOCK',orderId:'ORDER-1',
   quantitiesBySize:{M:3},stockByFabric:{main:30}})
 assert.equal(model.ok,true,model.reason)
 assert.equal(model.order.totalGarments,3)
 assert.equal(model.order.totalPieces,6)
 assert.equal(auditCsv(csv(model),model).ok,true)
 const plan=buildAccuMarkCutRoomPlan(project,{quantitiesBySize:{M:3},
   rolls:[{rollId:'R1',batchId:'B1',shade:'A',usableLengthCm:3000,
     costPerMeter:5,nap:false,fabricId:'main',widthCm:150}],
   fabricWidthCm:150,spacingCm:1.5,maxPlyCount:10,nap:false,fabricId:'main'})
 assert.equal(plan.ok,true,JSON.stringify(plan.issues))
 assert.equal(plan.totals.garments,3)
 assert.equal(plan.cutTickets.length,1)
 assert.equal(plan.cuttingAuthorized,false)
 assert.deepEqual(project,copy)
})
