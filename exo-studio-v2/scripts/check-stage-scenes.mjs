import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const dir = path.join(root, 'public/stage-scenes')
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'))
const stageIds=['EXO01','R02','R03','S01','S10']
assert.deepEqual(manifest.stages.map(entry=>entry.id),stageIds,'Only the curated/recovered EXO stages may be available')
assert.equal(manifest.stages[0].meshes,23,'Keep original approved Stage 01 geometry')
for(const stage of manifest.stages){
  assert.equal(stage.status,'ready',`${stage.id}: invalid status`)
  const glb=fs.readFileSync(path.join(root,'public',stage.file.replace(/^\//,'')))
  assert.equal(glb.toString('ascii',0,4),'glTF',`${stage.id}: GLB signature`)
  assert.equal(glb.readUInt32LE(8),glb.length,`${stage.id}: GLB length`)
  assert.equal(glb.length,stage.bytes,`${stage.id}: manifest length`)
  assert.ok(stage.meshes>0,`${stage.id}: mesh geometry missing`)
  const poster=fs.statSync(path.join(root,'public',stage.poster.replace(/^\//,'')))
  assert.ok(poster.size>8000,`${stage.id}: poster empty`)
}
assert.deepEqual(fs.readdirSync(dir).sort(),[...stageIds.map(id=>id+'.glb'),'manifest.json'].sort())
assert.deepEqual(fs.readdirSync(path.join(root,'public/stage-posters')).sort(),stageIds.map(id=>id+'.png').sort())
console.log('PASS: five original/recovered EXO studio GLBs and posters verified; approved Stage 01 preserved')
