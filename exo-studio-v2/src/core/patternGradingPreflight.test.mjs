import {test} from 'node:test'
import assert from 'node:assert/strict'
import {nativeGradePlan} from './nativeGradePlan.js'
import {patternPrintReference} from './patternPrintReference.js'
const fixture=()=>({revision:7,template:{panels:[{id:'front',polygon:{points:[[0,0],[.2,0],[.2,.1],[0,.1]]}}],seams:[{a:{panel:'front'}}]},panels:[{id:'front',boundaries:{edge:[0,1,2,3]}}],uv:[[0,0],[.2,0],[.2,.1],[0,.1]]})
test('millimetre dimensions use compiled material boundary, including curve lobes',()=>{
 const s=fixture();s.uv.push([.25,.05]);s.panels[0].boundaries.edge.push(4)
 const plan=nativeGradePlan(s,'front','17.5','-9');assert.equal(plan.ok,true);assert.deepEqual(plan.before,[250,100]);assert.deepEqual(plan.after,[267.5,91]);assert.equal(plan.revision,7);assert.equal(plan.seams,1)
})
test('blank, nonfinite, no-op, oversize and collapsed grades are blocked',()=>{
 for(const [x,y] of [['',1],[' ',1],[null,1],[NaN,1],[Infinity,1],[501,0],[0,0],[-200,0],[0,-100]])assert.equal(nativeGradePlan(fixture(),'front',x,y).ok,false,JSON.stringify([x,y]))
})
test('unsupported references and unavailable native geometry fail closed',()=>{
 for(const field of ['holes','lines']){const s=fixture();s.template.panels[0].polygon[field]=[{}];assert.equal(nativeGradePlan(s,'front',1,1).ok,false)}
 const s=fixture();s.uv[0]=[NaN,0];assert.equal(nativeGradePlan(s,'front',1,1).ok,false)
 assert.equal(nativeGradePlan(fixture(),'missing',1,1).ok,false)
})
test('valid named internal drafting guides are supported by native grade preflight',()=>{
 const s=fixture()
 s.template.panels[0].polygon.lines=[{
   id:'pocket-guide',points:[[.02,.01],[.18,.08]],tangents:[[.01,.002],[-.006,.005]],
 }]
 const grade=nativeGradePlan(s,'front',20,10)
 assert.equal(grade.ok,true,grade.reason)
 assert.deepEqual(grade.after,[220,110])
 assert.equal(grade.complexManufacturingMarks,true)
 assert.equal(grade.manufacturingApproved,false)
 assert.match(grade.industrialCutlineBlockedReason,/intentionally refuses/)
 const invalid=structuredClone(s)
 invalid.template.panels[0].polygon.lines[0].tangents=[[.01,.002]]
 assert.equal(nativeGradePlan(invalid,'front',20,10).ok,false)
})
test('straight clockwise hole rims are supported but wrong winding, duplicate edges and invalid coordinates fail',()=>{
 const s=fixture()
 s.template.panels[0].polygon.edges=['bottom','right','top','left']
 s.template.panels[0].polygon.holes=[{points:[[.04,.02],[.04,.05],[.08,.05],[.08,.02]],edges:['hole-l','hole-b','hole-r','hole-t']}]
 assert.equal(nativeGradePlan(s,'front',20,10).ok,true)
 const flipped=structuredClone(s)
 flipped.template.panels[0].polygon.holes[0].points.reverse()
 assert.match(nativeGradePlan(flipped,'front',20,10).reason,/clockwise/i)
 const duplicate=structuredClone(s)
 duplicate.template.panels[0].polygon.holes[0].edges=['hole-l','hole-l','hole-r','hole-t']
 assert.equal(nativeGradePlan(duplicate,'front',20,10).ok,false)
 const invalid=structuredClone(s)
 invalid.template.panels[0].polygon.holes[0].points[0][0]=Infinity
 assert.equal(nativeGradePlan(invalid,'front',20,10).ok,false)
})
test('hole preflight refuses escaped, touching, intersecting, nested, and overlapping cutlines',()=>{
 const s=fixture();s.template.panels[0].polygon.edges=['a','b','c','d']
 const hole=(x0,y0,x1,y1,id)=>({points:[[x0,y0],[x0,y1],[x1,y1],[x1,y0]],edges:Array.from({length:4},(_,i)=>`${id}-${i}`)})
 s.template.panels[0].polygon.holes=[hole(.03,.02,.07,.06,'a')]
 assert.equal(nativeGradePlan(s,'front',5,5).ok,true)
 for(const ring of [hole(-.01,.02,.03,.06,'a'),hole(0,.02,.04,.06,'a'),hole(.19,.03,.21,.07,'a'),hole(.03,.02,.03,.06,'a')]){
  const bad=structuredClone(s);bad.template.panels[0].polygon.holes=[ring]
  assert.equal(nativeGradePlan(bad,'front',5,5).ok,false,JSON.stringify(ring.points))
 }
 for(const second of [hole(.05,.04,.09,.08,'b'),hole(.04,.03,.06,.05,'b'),hole(.02,.01,.08,.07,'b'),hole(.07,.02,.10,.06,'b')]){
  const bad=structuredClone(s);bad.template.panels[0].polygon.holes.push(second)
  assert.equal(nativeGradePlan(bad,'front',5,5).ok,false,JSON.stringify(second.points))
 }
 const valid=structuredClone(s);valid.template.panels[0].polygon.holes.push(hole(.12,.02,.16,.06,'b'))
 assert.equal(nativeGradePlan(valid,'front',5,5).ok,true)
})
test('straight guides crossing or running through holes fail; safely separated guides pass',()=>{
 const s=fixture();s.template.panels[0].polygon.holes=[{points:[[.04,.02],[.04,.06],[.08,.06],[.08,.02]],edges:['h1','h2','h3','h4']}]
 const guide=(a,b)=>({id:'guide',points:[a,b],tangents:[[0,0],[0,0]]})
 for(const [a,b] of [[ [.02,.04],[.10,.04] ],[[.05,.03],[.06,.05]],[[.02,.02],[.04,.02]]]){
  s.template.panels[0].polygon.lines=[guide(a,b)]
  assert.match(nativeGradePlan(s,'front',4,2).reason,/hole/i)
 }
 s.template.panels[0].polygon.lines=[guide([.11,.02],[.18,.08])]
 assert.equal(nativeGradePlan(s,'front',4,2).ok,true)
 s.template.panels[0].polygon.lines[0].tangents=[[0,.01],[0,.01]]
 assert.match(nativeGradePlan(s,'front',4,2).reason,/Curved internal guides/)
 const curved=structuredClone(s);curved.template.panels[0].polygon.lines=[];curved.template.panels[0].polygon.curves={a:[[.04,-.03],[.13,-.03]]}
 assert.match(nativeGradePlan(curved,'front',4,2).reason,/Curved source contours/)
})
test('SVG reference has 1:1 mm/viewBox units and a 100 mm calibration square',()=>{
 const lines=[[[-20,-30],[180,-30],[180,70],[-20,70],[-20,-30]]]
 const {svg,widthMm,heightMm}=patternPrintReference(lines)
 assert.equal(widthMm,220);assert.equal(heightMm,250)
 assert.match(svg,/width="220mm" height="250mm" viewBox="-30 -40 220 250"/)
 assert.match(svg,/<rect[^>]*width="100" height="100"/)
 assert.match(svg,/Not a certified production cutline/)
 assert.match(svg,/-20,-30 180,-30 180,70/)
})
test('print rejects invalid geometry and implausible units',()=>{
 for(const lines of [[],[[[0,0]]],[[[0,0],[Infinity,1]]],[[[0,0],[30000,1]]]])assert.throws(()=>patternPrintReference(lines))
})
