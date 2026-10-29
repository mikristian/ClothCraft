// Bridge-level graded native 2D accuracy: named straight hole and internal
// cubic line survive real Rust grade, Undo/Redo, and project save/reopen.
// Grading one detached unsown test panel is NOT grading a complete garment.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {createWorkspace} from './workspace.mjs'

const root=fs.mkdtempSync(path.join(os.tmpdir(),'exo-native-grade-hole-'))
const session=createWorkspace(root)
let s
const request=async args=>{
  const result=await session.request({revision:s?.revision,...args})
  assert.equal(result.ok,true,result.error)
  if(result.data?.template)s=result.data
  return result.data
}
try {
  await request({op:'open',preset:'tshirt'})
  // Exact source-grade proof isolates the unsown pattern and explicitly
  // avoids interpreting a one-piece grade as a matched-seam fit approval.
  for (const seam of [...s.template.seams])
    await request({op:'edit',command:{kind:'RemoveSeam',seam:seam.id}})
  const source=s.template.panels.find(p=>p.id==='front')
  assert(source?.polygon)
  const original=structuredClone(source.polygon)
  const hole={points:[[.4,.38],[.4,.42],[.44,.42],[.44,.38]],
    edges:['test-hole-west','test-hole-south','test-hole-east','test-hole-north']}
  const guide={id:'test-pocket-rail',points:[[.52,.38],[.65,.48]],
    tangents:[[.03,.008],[-.012,.02]]}
  await request({op:'edit',command:{kind:'Shape',panel:'front',
    polygon:{...original,holes:[hole],lines:[guide]}}})
  const authored=structuredClone(s)
  const sourcePattern=authored.template.panels.find(p=>p.id==='front').polygon
  assert.equal(sourcePattern.holes[0].edges[0],hole.edges[0])
  assert.equal(sourcePattern.lines[0].id,guide.id)
  const other=authored.template.panels.find(p=>p.id==='back')
  await request({op:'grade-pattern',panel:'front',width_delta_mm:20,height_delta_mm:10})
  const graded=structuredClone(s),result=graded.template.panels.find(p=>p.id==='front').polygon
  assert.equal(graded.revision,authored.revision+1)
  assert.deepEqual(result.holes.map(h=>h.edges),[hole.edges])
  assert.equal(result.lines[0].id,guide.id)
  assert.notDeepEqual(result.holes[0].points,hole.points)
  assert.notDeepEqual(result.lines[0].points,guide.points)
  assert.notDeepEqual(result.lines[0].tangents,guide.tangents)
  assert.deepEqual(graded.template.panels.find(p=>p.id==='back'),other)
  await request({op:'undo'})
  assert.deepEqual(s.template,authored.template)
  await request({op:'redo'})
  assert.deepEqual(s.template,graded.template)
  const saved=await request({op:'save'})
  await request({op:'open',project:saved.project})
  assert.deepEqual(s.template,graded.template)
  console.log(JSON.stringify({passed:true,checks:[
    'Rust source material hole and curve line created',
    'both graded with stable names and no dropped attachments',
    'other panel untouched','single Undo/Redo','native save/reopen'] }))
}finally {
  session.close()
  fs.rmSync(root,{recursive:true,force:true})
}
