import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {createTemplateProject} from '../src/data/templates.js'
import {prepareNativePatternExport} from '../src/core/nativePatternExportPreparation.js'

const cli='native_cpp/build-placement-qa/garment_cad_cli'
function convert(project){
  const {document}=prepareNativePatternExport(project)
  const run=spawnSync(cli,[],{input:JSON.stringify({protocol:'garment-studio.native-cad.v1',op:'clothcraft-export',document})+'\n',encoding:'utf8',maxBuffer:30*1024*1024})
  assert.equal(run.status,0,run.stderr)
  const response=JSON.parse(run.stdout)
  assert.equal(response.ok,true,response.error)
  return {document,template:response.interchange.template}
}
const {document,template}=convert(createTemplateProject('hoodie'))
const sourceSeam=document.seams.find(s=>s.id==='hood-left-neck-0')
assert.ok(sourceSeam,'missing reference hood seam')
const converted=template.seams.find(s=>s.id===sourceSeam.id)
assert.equal(converted.allow_ease,true,'curved, analytically equal sewing pair must allow sampling mismatch')
assert.equal(converted.a.edge,`edge_${sourceSeam.a.edgeIndex}`)
assert.equal(converted.b.edge,`edge_${sourceSeam.b.edgeIndex}`)
assert.deepEqual(converted.a.range,[sourceSeam.a.startT??0,sourceSeam.a.endT??1])
assert.deepEqual(converted.b.range,[sourceSeam.b.startT??0,sourceSeam.b.endT??1])
const straight=template.seams.filter(s=>{
  const source=document.seams.find(p=>p.id===s.id)
  return [source.a,source.b].every(end=>!document.pieces.find(p=>p.id===end.pieceId)?.curves?.[end.edgeIndex])
})
assert.ok(straight.length>0,'fixture needs straight sewing cases')
assert.ok(straight.some(s=>s.allow_ease===false),'straight analytically matching seams must stay strict')
const second=convert(createTemplateProject('hoodie'))
assert.deepEqual(second.template,template,'repeat export must be deterministic')
console.log(`PASS curved sewing allowance: ${template.seams.length} seams, ${straight.length} straight candidates, hood-left-neck-0 explicitly eased, topology intact`)
