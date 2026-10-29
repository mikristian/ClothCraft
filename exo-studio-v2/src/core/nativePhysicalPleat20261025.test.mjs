import test from 'node:test'
import assert from 'node:assert/strict'
import {planNativePhysicalPleats20261025 as plan} from './nativePhysicalPleat20261025.js'
const original=()=>({revision:5,template:{panels:[{id:'panel',polygon:{
 points:[[0,0],[.4,0],[.4,.3],[0,.3]],edges:['top','right','bottom','left'],curves:{},free_curve_points:{},
 holes:[],lines:[],notches:{},target_lengths:{},measurements:[]}}],seams:[]}})
const base={panelId:'panel',edge:'top',centerPercent:50,intakeMm:16,depthMm:60}
test('one uncut physical tuck proposal preserves input and explicit Rust fields',()=>{
 const fixture=original(),saved=structuredClone(fixture)
 const result=plan(fixture,base)
 assert.equal(result.ok,true,result.reason)
 assert.equal(result.commands[0].kind,'TuckFoldSew')
 assert.equal(result.commands[0].depth_m,.06)
 assert.equal(result.commands[0].panel,'panel')
 assert.ok(Math.abs((result.commands[0].right_t-result.commands[0].left_t)*.4-.016)<1e-9)
 assert.equal(result.manufacturingApproved,false)
 assert.deepEqual(fixture,saved)
})
test('three spaced pleats compute independent stations in one proposal',()=>{
 const result=plan(original(),{...base,count:3,spacingMm:65})
 assert.equal(result.ok,true,result.reason)
 assert.equal(result.commands.length,3)
 const mids=result.commands.map(c=>(c.left_t+c.right_t)/2)
 assert.ok(Math.abs((mids[1]-mids[0])*.4-.065)<1e-8)
 assert.deepEqual(mids,[mids[0],.5,mids[2]])
})
test('reject holes, curves, sewn edge and production references',()=>{
 const fixture=original();fixture.template.panels[0].polygon.holes.push({id:'h',points:[[.1,.1],[.15,.1],[.13,.15]]})
 assert.equal(plan(fixture,base).ok,false)
 const curved=original();curved.template.panels[0].polygon.curves.top=[[.1,-.02],[.3,-.02]]
 assert.equal(plan(curved,base).ok,false)
 const sewn=original();sewn.template.seams.push({a:{panel:'panel',edge:'top'},b:{panel:'other',edge:'left'}})
 assert.equal(plan(sewn,base).ok,false)
 const reference=original();reference.template.panels[0].polygon.notches.top=[{t:.5,depth_m:.005}]
 assert.equal(plan(reference,base).ok,false)
})
test('malformed and nonfinite parameters fail without modifying snapshot',()=>{
 const fixture=original(),saved=structuredClone(fixture)
 for(const values of [{depthMm:NaN},{intakeMm:Infinity},{spacingMm:2,count:3},
  {centerPercent:0},{count:17},{count:.5},{intakeMm:151},{depthMm:501},
  {intakeMm:1},{depthMm:7},{intakeMm:100,count:3,spacingMm:70},
  {centerPercent:99,depthMm:100}]){
  const r=plan(fixture,{...base,...values})
  assert.equal(r.ok,false,JSON.stringify(values))
 }
 assert.deepEqual(fixture,saved)
})
test('an interior pleat cannot continue outside a narrow panel',()=>{
 assert.equal(plan(original(),{...base,depthMm:320}).ok,false)
})
test('preview stitch endpoints and length match Rust inset plus requested depth',()=>{
 const result=plan(original(),base)
 assert.equal(result.ok,true,result.reason)
 for(const [start,end] of result.preview[0].legs){
  assert.ok(Math.abs(start[1]-.0005)<1e-12)
  assert.ok(Math.abs(end[1]-.0605)<1e-12)
  assert.ok(Math.abs(Math.hypot(end[0]-start[0],end[1]-start[1])-.06)<1e-12)
 }
})
test('the native half-millimetre inset cannot push a stitch endpoint outside cloth',()=>{
 const fixture=original()
 fixture.template.panels[0].polygon.points=[[0,0],[.4,0],[.4,.06025],[0,.06025]]
 assert.equal(plan(fixture,base).ok,false)
})
test('nested and enclosing existing tuck intakes are rejected before native mutation',()=>{
 for(const interval of [[.19,.21],[.1,.3]]){
  const fixture=original(),poly=fixture.template.panels[0].polygon
  poly.lines=interval.map((x,i)=>({id:`tuck_0_line_${i?'b':'a'}`,points:[[x,.0005],[x,.08]],tangents:[[0,0],[0,0]]}))
  const saved=structuredClone(fixture)
  assert.equal(plan(fixture,base).ok,false)
  assert.deepEqual(fixture,saved)
 }
})
test('nonoverlapping existing tucks retain usable space for a new row',()=>{
 const fixture=original()
 fixture.template.panels[0].polygon.lines=[.04,.06].map((x,i)=>({id:`tuck_0_line_${i?'b':'a'}`,points:[[x,.0005],[x,.08]]}))
 const result=plan(fixture,base)
 assert.equal(result.ok,true,result.reason)
})
test('collinear contact and endpoint touch with internal paths fail closed',()=>{
 for(const points of [[[.192,.02],[.192,.04]],[[.17,.0605],[.192,.0605]]]){
  const fixture=original();fixture.template.panels[0].polygon.lines=[{id:'construction',points}]
  assert.equal(plan(fixture,base).ok,false)
 }
})
test('duplicate edge IDs and malformed internal coordinates fail without mutation',()=>{
 for(const invalid of ['duplicate','nan','short']){
  const fixture=original(),p=fixture.template.panels[0].polygon
  if(invalid==='duplicate')p.edges[1]='top'
  else p.lines=[{id:'bad',points:invalid==='nan'?[[NaN,.02],[.2,.03]]:[[.2,.03]]}]
  const before=structuredClone(fixture)
  assert.equal(plan(fixture,base).ok,false)
  assert.deepEqual(fixture,before)
 }
})
test('all four source-edge orientations retain exact requested physical depth',()=>{
 for(const edge of ['top','right','bottom','left']){
  const r=plan(original(),{...base,edge,count:3,spacingMm:45})
  assert.equal(r.ok,true,r.reason)
  for(const fold of r.preview)for(const [a,b] of fold.legs)
   assert.ok(Math.abs(Math.hypot(b[0]-a[0],b[1]-a[1])-.06)<1e-12)
 }
})
