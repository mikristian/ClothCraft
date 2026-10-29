// Corrects left/right leg orientation of front and back panel pair in the installed native app.
// The duplicated right-front CUT previously faced the same direction as its left twin.
import fs from 'node:fs'
import assert from 'node:assert/strict'
const dir='docs/goals/evidence/501-reconstruction-20261025'
const endpoint='http://127.0.0.1:5385/workspace'
const headers={'content-type':'application/json','origin':'http://127.0.0.1:5386'}
const call=async body=>{const r=await fetch(endpoint,{method:'POST',headers,body:JSON.stringify(body)});const j=await r.json();assert(j.ok,`${body.op}: ${j.error}`);return j.data}
const original=await call({op:'snapshot',avatar:true})
assert.equal(original.avatarModel,'clo-thomas');assert.equal(original.template.panels.length,24)
const before=await call({op:'save'})
fs.writeFileSync(`${dir}/501-Thomas-before-front-back-orientation-second-pass.json`,JSON.stringify(before.project,null,2)+'\n')
const changes=[
  // Right-front material X axis reverses so its crotch extension faces CENTER FRONT.
  [1,[.259,1.077,.232],[0,180,0]],
  // Both back legs: face rearward, with mirrored right leg crotch extensions directed inward.
  [2,[-.006,1.115,-.224],[0,180,0]],
  [3,[.258,1.115,-.238],[0,0,0]],
  // Back yokes follow their corresponding corrected rear quarter.
  [4,[-.006,1.147,-.280],[0,180,0]],
  [5,[.028,1.147,-.294],[0,0,0]],
  // Left front maintains original outer-to-inner direction with a distinct surface plane.
  [0,[-.241,1.077,.213],[0,0,0]],
]
let revision=original.revision
for(const [index,translation,rotation_degrees] of changes){
 const panel=original.template.panels[index]
 const r=await call({op:'edit',revision,command:{kind:'Place',panel:panel.id,placement:{translation,rotation_degrees}}})
 revision=r.revision
 console.log('Repositioned',panel.name,translation,rotation_degrees)
}
const snap=await call({op:'snapshot',avatar:true})
for(const [index,t,rot] of changes){const p=snap.template.panels[index];assert(p.placement.translation.every((n,k)=>Math.abs(n-t[k])<1e-8));assert(p.placement.rotation_degrees.every((n,k)=>Math.abs(n-rot[k])<1e-8))}
assert.deepEqual(snap.template.panels.map(p=>p.polygon),original.template.panels.map(p=>p.polygon))
assert.deepEqual(snap.template.seams,original.template.seams)
const side=(p)=>p.placement.rotation_degrees[1]===180?-1:1
const crotchX=(p)=>p.placement.translation[0]+side(p)*p.polygon.points[4][0]
const four=snap.template.panels.slice(0,4)
assert(crotchX(four[0])>four[0].placement.translation[0],'left front inward crotch')
assert(crotchX(four[1])<four[1].placement.translation[0],'right front inward crotch')
assert(crotchX(four[2])<four[2].placement.translation[0],'left back crotch direction requires manual edge review')
assert(crotchX(four[3])>four[3].placement.translation[0],'right back crotch direction requires manual edge review')
const saved=await call({op:'save'})
fs.writeFileSync(`${dir}/501-Thomas-corrected-front-back-orientation-20261025.json`,JSON.stringify(saved.project,null,2)+'\n')
const out={revision:snap.revision,panels:24,seams:snap.template.seams.length,crotchDirection:['left-front-inward','right-front-inward','back-left-inward-review','back-right-inward-review'],changed:changes.map(([i,t,r])=>({name:snap.template.panels[i].name,translation:t,rotation_degrees:r})),originalCutsUnchanged:true,simulationPassed:false,sewingReady:false,notes:'Flip of 180 degrees reverses local X but does not automatically mirror the 2D drafted pattern or resolve crossed seams. Source seams retained and require a real sewing topology audit.'}
fs.writeFileSync(`${dir}/501-Thomas-front-back-orientation-audit.json`,JSON.stringify(out,null,2)+'\n')
console.log('SAVED',JSON.stringify(out,null,2))
