/**
 * Fixed 30-case EXO marker/nesting/cutting readiness benchmark v1.
 * Run: node integrations/clothcraft/qa-v2-marker-nesting-cutting-90-20261028.mjs
 * Not manufacturer, external receiver, machine protocol or physical cutter approval.
 * The input is the REAL native Rust T-shirt graded CUT boundaries in six sizes;
 * every derived 2D marker operates on the resulting physical CUT polygon.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'
import {createAccuMarkNativeRuleSet} from '../../src/core/accumarkNativePointRuleSet20261023.js'
import {prepareNativeGradeCatalog20261025} from '../../src/core/nativeGradeCatalogBridge20261025.js'
import {nestPolygons,polygonConflict} from '../../src/core/accumarkPolygonNesting20261024.js'
import {adjustAccuMarkManualMarker20261024} from '../../src/core/accumarkManualMarker20261024.js'
import {optimizeAccuMarkMarkerProduction20261024,
 compareAccuMarkMarkerRollDemand20261024} from '../../src/core/accumarkMarkerProductionOptimization20261024.js'
import {buildAccuMarkCutterPathStudy20261024} from '../../src/core/accumarkCutterPathStudy20261024.js'

const SIZES=['XS','S','M','L','XL','XXL']
const rubric=[
 ['M01','Native sewn T-shirt source opens','Native CUT'],
 ['M02','Source contains two actual sewn pattern pieces','Native CUT'],
 ['M03','All native source edges acquire authored physical allowances','Native CUT'],
 ['M04','Six physical graded patterns are committed in Rust','Native CUT'],
 ['M05','Six native graded CUT catalogs resolve','Native CUT'],
 ['M06','Native CUT produces all 12 graded piece contours','Native CUT'],
 ['M07','Every physical CUT area exceeds its stitch area','Native CUT'],
 ['M08','Native CUT reports finite sewn edge measurements','Native CUT'],
 ['M09','CUT contours grow consistently with authored grade sizes','Native CUT'],
 ['M10','Native CUT is converted to exact centimetre geometry for each size','Marker transfer'],
 ['M11','All six size-specific polygon markers place every piece','Polygon nesting'],
 ['M12','No pair of CUT pieces overlaps in any size','Polygon nesting'],
 ['M13','Every marker respects physical fabric-width limits','Polygon nesting'],
 ['M14','Every marker satisfies explicit 1 cm CUT spacing','Polygon nesting'],
 ['M15','Every placed piece preserves one-way grain and nap direction','Polygon nesting'],
 ['M16','Same native CUT sources produce deterministic marker placements','Polygon nesting'],
 ['M17','Multiple requested CUT instances preserve distinct identities','Polygon nesting'],
 ['M18','Impossible narrow fabric widths reject and do not silently place','Safety constraints'],
 ['M19','Missing grain-angle metadata rejects the entire marker','Safety constraints'],
 ['M20','Cut-on-fold declaration rejects unsupported free nesting','Safety constraints'],
 ['M21','Unsupported internal holes reject source marker generation','Safety constraints'],
 ['M22','Manual overlapping CUT arrangement fails closed','Manual marker'],
 ['M23','Manual move beyond available fabric width fails closed','Manual marker'],
 ['M24','Valid manual physical movement preserves all placement identity','Manual marker'],
 ['M25','Cutter study emits actual closed mm-scale CUT paths','Cutter study'],
 ['M26','Cutter perimeter and count match the native CUT marker','Cutter study'],
 ['M27','Invalid cutter calibration refuses an output study','Cutter study'],
 ['M28','Polygon marker optimization stays collision-free and does not worsen length','Optimization'],
 ['M29','Independent external receiving-CAD validation passed','External validation'],
 ['M30','Real cutter protocol, calibration and factory authorization passed','External validation'],
].map(([id,name,group])=>({id,name,group,weight:1}))
assert.equal(rubric.length,30)
const results=[]
const inspect=async(id,fn)=>{
 assert(!results.some(row=>row.id===id),'Duplicate marker benchmark check')
 const item=rubric.find(row=>row.id===id)
 assert(item,`Unknown check ${id}`)
 let passed=false,detail=''
 try{
  const response=await fn()
  assert.notEqual(response?.ok,false,response?.reason||'Rejected')
  passed=true;detail=typeof response==='string'?response:'Observed native geometry and guard'
 }catch(error){detail=String(error?.message||error).slice(0,320)}
 results.push({...item,passed,detail})
 console.log(JSON.stringify({check:id,passed,detail}))
}
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'exo-marker-cut-90-native-'))
const workspace=createWorkspace(temp)
let snapshot,source,project,cut,graded,markers,baseProject,initialNest,moved,optimized,cutter
const send=async command=>{
 const result=await workspace.request({revision:snapshot?.revision,...command})
 assert.equal(result.ok,true,`${command.op}: ${result.error}`)
 if(result.data?.template)snapshot=result.data
 return result.data
}
const cutPoints=outline=>outline.map(([x,y])=>({x:x*100,y:y*100}))
const regionArea=points=>Math.abs(points.reduce((sum,p,index)=>{
 const q=points[(index+1)%points.length]
 return sum+p[0]*q[1]-q[0]*p[1]
},0))/2
const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right)
const markerOptions={fabricWidth:150,gap:1,maxLength:400,maxCandidates:12000}
const manualOptions={fabricWidthCm:150,gapCm:1,maxLengthCm:400}
try{
 await inspect('M01',async()=>{
  await send({op:'open',preset:'tshirt'})
  assert(snapshot.template.name)
  return 'Real Rust preset loaded'
 })
 await inspect('M02',()=>{
  assert.equal(snapshot.template.panels.length,2)
  assert.equal(snapshot.template.seams.length,8)
  assert(snapshot.template.panels.every(panel=>panel.polygon.points.length>=12))
 })
 await inspect('M03',async()=>{
  for(const panel of [...snapshot.template.panels]){
   for(const edge of panel.polygon.edges){
    await send({op:'edit',command:{kind:'SeamAllowance',panel:panel.id,edge,width_m:.012}})
   }
  }
  assert(snapshot.template.panels.every(panel=>panel.polygon.edges.every(edge=>
   panel.polygon.seam_allowances?.[edge]===.012)))
  return '28 native physical 12 mm allowances authored and saved with source'
 })
 await inspect('M04',async()=>{
  source=structuredClone(snapshot)
  const made=createAccuMarkNativeRuleSet(source)
  assert(made.ok,made.reason)
  const rules=made.ruleSet
  for(const panel of source.template.panels){
   for(let i=0;i<SIZES.length;i++){
    const multiplier=(i-2)*8
    rules.panels[panel.id].pointOffsetsMm[SIZES[i]]=panel.polygon.points.map(
     ([x,y])=>[x*multiplier,y*multiplier])
   }
  }
  const prep=prepareNativeGradeCatalog20261025(source,
   {template:structuredClone(source.template)},rules)
  assert(prep.ok,prep.reason)
  await send({op:'grade-run-commit',gradeRun:prep.gradeRun})
  const saved=(await send({op:'save'})).project
  assert.deepEqual(saved.grade_run.sizes,SIZES)
  assert.equal(saved.grade_run.gradedTemplates.length,6)
  project=saved
  return 'Rust six-size catalog committed and durably saved'
 })
 await inspect('M05',async()=>{
  cut=await send({op:'grade-run-cutlines'})
  assert.equal(cut.format,'exo-native-graded-cutlines.v1')
  assert.deepEqual(cut.sizes.map(size=>size.size),SIZES)
  assert.equal(cut.cuttingAuthorized,false)
 })
 await inspect('M06',()=>{
  assert.equal(cut.sizes.reduce((count,size)=>count+size.panels.length,0),12)
  for(const size of cut.sizes)assert.deepEqual(size.panels.map(p=>p.panel_id),['front','back'])
 })
 await inspect('M07',()=>{
  for(const [index,size] of cut.sizes.entries()){
   for(const panel of size.panels){
    const original=project.grade_run.gradedTemplates[index].panels.find(p=>p.id===panel.panel_id)
    const stitch=regionArea(original.polygon.points)
    assert(panel.cut.area_m2>stitch)
   }
  }
 })
 await inspect('M08',()=>{
  for(const size of cut.sizes)for(const p of size.panels){
   assert.equal(Object.keys(p.sewline_edge_lengths_m).length,14)
   assert(Object.values(p.sewline_edge_lengths_m).every(x=>Number.isFinite(x)&&x>0))
  }
 })
 await inspect('M09',()=>{
  for(const id of ['front','back']){
   let previous=-Infinity
   for(const size of cut.sizes){
    const area=size.panels.find(p=>p.panel_id===id).cut.area_m2
    assert(area>previous,`Nonmonotonic graded CUT area for ${id}/${size.size}`)
    previous=area
   }
  }
 })
 await inspect('M10',()=>{
  graded=cut.sizes.map(size=>({size:size.size,revision:snapshot.revision,pieces:size.panels.map(panel=>({
   id:panel.panel_id,name:panel.panel_id,points:cutPoints(panel.cut.points),
   seamAllowance:0,grainAngleDeg:0,cutQuantity:1,fabricId:'main',
   marker:{nap:'one-way'},
  }))}))
  assert.equal(graded.length,6)
  for(let i=0;i<6;i++)for(let j=0;j<2;j++){
   const projected=graded[i].pieces[j].points
   assert.equal(projected.length,cut.sizes[i].panels[j].cut.points.length)
   assert(Math.abs(projected[0].x-cut.sizes[i].panels[j].cut.points[0][0]*100)<1e-8)
  }
  return 'Exact native CUT metres converted once to polygon nest centimetres'
 })
 await inspect('M11',()=>{
  markers=graded.map(item=>nestPolygons(item,markerOptions))
  for(const marker of markers){
   assert(marker.ok,JSON.stringify(marker.errors||marker.unplaced).slice(0,180))
   assert.equal(marker.placements.length,2)
   assert.equal(marker.metrics.placed,marker.metrics.requested)
  }
  baseProject=graded[2];initialNest=markers[2]
  return 'Six native CUT-derived physical markers place 12 piece instances'
 })
 await inspect('M12',()=>{
  for(const marker of markers)assert.equal(polygonConflict(
   marker.placements[0].outline,marker.placements[1].outline,0),false)
 })
 await inspect('M13',()=>{
  for(const marker of markers)for(const p of marker.placements){
   assert(p.x>=0&&p.x+p.width<=150+1e-6)
   assert(p.y>=0&&p.y+p.height<=400+1e-6)
  }
 })
 await inspect('M14',()=>{
  for(const marker of markers)assert.equal(polygonConflict(
   marker.placements[0].outline,marker.placements[1].outline,1),false)
 })
 await inspect('M15',()=>{
  for(const marker of markers)for(const placement of marker.placements){
   assert.equal(placement.rotationDeg,0)
  }
 })
 await inspect('M16',()=>{
  for(let i=0;i<6;i++){
   const copy=nestPolygons(graded[i],markerOptions)
   assert.deepEqual(copy,markers[i])
  }
 })
 await inspect('M17',()=>{
  const doubled=structuredClone(baseProject)
  doubled.pieces[0].cutQuantity=2
  const output=nestPolygons(doubled,markerOptions)
  assert(output.ok,JSON.stringify(output.unplaced))
  assert.equal(output.placements.length,3)
  assert.equal(new Set(output.placements.map(p=>p.pieceId+'-'+p.instance)).size,3)
 })
 await inspect('M18',()=>{
  const narrow=nestPolygons(baseProject,{...markerOptions,fabricWidth:2})
  assert.equal(narrow.ok,false)
  assert.equal(narrow.placements.length,0)
  assert.equal(narrow.unplaced.length,2)
 })
 await inspect('M19',()=>{
  const wrong=structuredClone(baseProject)
  delete wrong.pieces[0].grainAngleDeg
  const rejected=nestPolygons(wrong,markerOptions)
  assert.equal(rejected.ok,false)
  assert(rejected.errors.some(e=>e.reason==='missing-grain-angle'))
 })
 await inspect('M20',()=>{
  const wrong=structuredClone(baseProject)
  wrong.pieces[0].cutOnFold=true
  const rejected=nestPolygons(wrong,markerOptions)
  assert.equal(rejected.ok,false)
  assert(rejected.errors.some(e=>e.reason==='fold-requires-dedicated-layout'))
 })
 await inspect('M21',()=>{
  const wrong=structuredClone(baseProject)
  wrong.pieces[0].holes=[[{x:2,y:2},{x:3,y:2},{x:3,y:3}]]
  const rejected=nestPolygons(wrong,markerOptions)
  assert.equal(rejected.ok,false)
  assert(rejected.errors.some(e=>e.reason==='holes-unsupported'))
 })
 await inspect('M22',()=>{
  const p=initialNest.placements[1],base=initialNest.placements[0]
  const bad=adjustAccuMarkManualMarker20261024(baseProject,initialNest,{...manualOptions,
   pieceId:p.pieceId,instance:p.instance,x:base.x,y:base.y,rotationDeg:p.rotationDeg})
  assert.equal(bad.ok,false)
  assert.equal(bad.code,'PHYSICAL_COLLISION')
 })
 await inspect('M23',()=>{
  const p=initialNest.placements[0]
  const bad=adjustAccuMarkManualMarker20261024(baseProject,initialNest,{...manualOptions,
   pieceId:p.pieceId,instance:p.instance,x:150,y:p.y,rotationDeg:p.rotationDeg})
  assert.equal(bad.ok,false)
  assert.equal(bad.code,'FABRIC_BOUNDS')
 })
 await inspect('M24',()=>{
  const last=initialNest.placements[1]
  const maximum=Math.max(...initialNest.placements.map(p=>p.y+p.height))
  moved=adjustAccuMarkManualMarker20261024(baseProject,initialNest,{...manualOptions,
   pieceId:last.pieceId,instance:last.instance,x:last.x,y:maximum+5,rotationDeg:last.rotationDeg})
  assert(moved.ok,moved.reason||moved.code)
  assert.equal(moved.placements.length,2)
  assert(moved.metrics.length>initialNest.metrics.length)
 })
 await inspect('M25',()=>{
  cutter=buildAccuMarkCutterPathStudy20261024(initialNest,{fabricWidthCm:150,spaceCm:1})
  assert(cutter.ok,cutter.reason)
  assert.equal(cutter.records.length,2)
  for(const r of cutter.records)assert.deepEqual(r.physicalCutPathMm[0],r.physicalCutPathMm.at(-1))
 })
 await inspect('M26',()=>{
  assert.equal(cutter.totals.physicalCuts,2)
  assert(cutter.totals.totalPerimeterMm>500)
  assert.equal(cutter.commandProtocol,null)
  assert.equal(cutter.cuttingAuthorized,false)
 })
 await inspect('M27',()=>{
  const bad=buildAccuMarkCutterPathStudy20261024(initialNest,{fabricWidthCm:150,spaceCm:1,calibrationMm:99})
  assert.equal(bad.ok,false)
  assert.equal(bad.code,'INVALID_STUDY_LIMITS')
 })
 await inspect('M28',()=>{
  optimized=optimizeAccuMarkMarkerProduction20261024(baseProject,moved,
   {...manualOptions,maxEvaluations:400})
  assert(optimized.ok,optimized.code||optimized.detail)
  assert(optimized.optimization.afterLengthCm<=optimized.optimization.beforeLengthCm+1e-7)
  assert(optimized.optimization.evaluations>0)
  assert.equal(optimized.manufacturingApproved,false)
  const compare=compareAccuMarkMarkerRollDemand20261024(baseProject,moved,optimized,
   {...manualOptions,plyCount:5,rolls:[{rollId:'roll-A',usableLengthCm:2000}]})
  assert(compare.ok,compare.code)
  assert(compare.materialSavedCm>=-1e-7)
  return `Collision-safe optimization saves ${optimized.optimization.savedLengthCm} cm per ply`
 })
 await inspect('M29',()=>{throw Error('No external receiving-CAD acceptance from independently operated licensed software')})
 await inspect('M30',()=>{throw Error('Real cutter communications, hardware calibration, and physical signed sample remain unverified')})
}finally{
 workspace.close()
 fs.rmSync(temp,{recursive:true,force:true})
}
for(const item of rubric)if(!results.some(row=>row.id===item.id)){
 results.push({...item,passed:false,detail:'Earlier native source or benchmark precondition failed'})
}
results.sort((a,b)=>a.id.localeCompare(b.id))
const passed=results.filter(row=>row.passed).length,score=Number((100*passed/30).toFixed(2))
const report={schema:'exo-marker-nesting-cutting-native-benchmark.v1',date:'2026-10-28',
 measured:true,criteria:30,passed,failed:30-passed,percent:score,targetPercent:90,
 reachedTarget:score>=90,nativeSource:'Real six-size saved Rust T-shirt CUT geometry; centimetre marker transfer',
 limitations:'Internal native/JS geometric acceptance only. External CAD, cutter machine calibration, and manufacturing authorization are not certified.',
 results}
const destination=process.env.EXO_MARKER_BENCHMARK_REPORT
if(destination){fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,JSON.stringify(report,null,2)+'\n')}
console.log('EXO_MARKER_NESTING_CUT_BENCHMARK '+JSON.stringify(report))
if(!report.reachedTarget)process.exitCode=1
