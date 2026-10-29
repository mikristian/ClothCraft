import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const cli = process.env.GARMENT_CPP_CLI || 'native_cpp/build-placement-qa/garment_cad_cli'
const call = (document) => {
  const run = spawnSync(cli, [], {encoding:'utf8', input:JSON.stringify({protocol:'garment-studio.native-cad.v1',op:'clothcraft-export',document})+'\n', timeout:15000})
  assert.equal(run.status, 0, run.stderr || run.error?.message)
  const answer = JSON.parse(run.stdout)
  assert.equal(answer.ok, true, answer.error)
  return answer.interchange.template
}
const fixture = name => JSON.parse(readFileSync(`blender_bridge/fixtures/${name}.garment.json`, 'utf8'))
const get = (template,id) => template.panels.find(panel => panel.id === id)
const pantsSource = fixture('pants'), pants = call(pantsSource)
assert.equal(pants.panels.length,4)
assert.equal(pants.seams.length,pantsSource.seams.length)
assert.equal(pants.fabrics.length,Object.keys(pantsSource.fabrics).length)
for(const p of pantsSource.pieces){
  const exported=get(pants,p.id)
  assert.equal(exported.fabric,p.fabricId)
  assert.equal(exported.polygon.edges.length,p.points.length)
  assert.ok(Math.abs(exported.placement.translation[2]-p.arrangement3d.z)<1e-12)
}
const lf=get(pants,'pants-left-front'),rf=get(pants,'pants-right-front')
const lb=get(pants,'pants-left-back'),rb=get(pants,'pants-right-back')
assert.ok(lf.placement.translation[0]<rf.placement.translation[0],'legs must remain left/right')
assert.ok(lb.placement.translation[0]<rb.placement.translation[0])
assert.equal(lf.placement.rotation_degrees[1],0)
assert.equal(lb.placement.rotation_degrees[1],180)
assert.ok(lf.placement.translation[2]>0 && lb.placement.translation[2]<0)

const teeSource=fixture('tee'), tee=call(teeSource)
assert.equal(tee.seams.length,teeSource.seams.length)
assert.equal(get(tee,'back').placement.rotation_degrees[1],180)
assert.ok(get(tee,'front').placement.translation[2]>get(tee,'back').placement.translation[2])
assert.ok(get(tee,'sleeve-left').placement.translation[0]<get(tee,'sleeve-right').placement.translation[0])
assert.notEqual(get(tee,'sleeve-left').placement.rotation_degrees[2],0)
const fallback=structuredClone(teeSource)
fallback.pieces[0].arrangement3d.wrap='unclassified'
const row=call(fallback)
assert.deepEqual(get(row,'front').placement.translation,[0,1.5,0.5])
console.log('PASS: native C++ ClothCraft placements retain pants/tee anatomical wraps, sewing, fabrics and unknown fallback')
