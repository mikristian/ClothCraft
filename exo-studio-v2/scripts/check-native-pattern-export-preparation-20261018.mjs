import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {createTemplateProject,GARMENT_TEMPLATES} from '../src/data/templates.js'
import {prepareNativePatternExport} from '../src/core/nativePatternExportPreparation.js'

const cli=process.env.GARMENT_CPP_CLI||'native_cpp/build-placement-qa/garment_cad_cli'
// Reversed directed edges map i -> n-2-i; partial sewn ranges mirror in [0,1].
const reversedFixture=createTemplateProject('pants')
const piece=reversedFixture.pieces[0]
const edge=1,n=piece.points.length
piece.points.reverse()
const seam=reversedFixture.seams.find(s=>s.a?.pieceId===piece.id)
assert.ok(seam)
seam.a.edgeIndex=edge
seam.a.startT=.2
seam.a.endT=.7
const mapped=prepareNativePatternExport(reversedFixture)
const outputSeam=mapped.document.seams.find(s=>s.id===seam.id)
assert.equal(outputSeam.a.edgeIndex,(n-2-edge+n)%n)
assert.ok(Math.abs(outputSeam.a.startT-.3)<1e-10)
assert.ok(Math.abs(outputSeam.a.endT-.8)<1e-10)
assert.equal(outputSeam.reverseB,!Boolean(seam.reverseB))
let passed=0
for(const {id} of GARMENT_TEMPLATES){
  const original=createTemplateProject(id)
  const before=JSON.stringify(original)
  const {document,report}=prepareNativePatternExport(original)
  assert.equal(JSON.stringify(original),before,`${id}: source mutated`)
  const run=spawnSync(cli,[],{encoding:'utf8',input:JSON.stringify({protocol:'garment-studio.native-cad.v1',op:'clothcraft-export',document})+'\n',timeout:20000,maxBuffer:30*1024*1024})
  assert.equal(run.status,0,`${id}: ${run.stderr||run.error?.message}`)
  const answer=JSON.parse(run.stdout)
  assert.equal(answer.ok,true,`${id}: ${answer.error}`)
  const out=answer.interchange.template
  assert.equal(out.panels.length,document.pieces.length)
  assert.equal(out.seams.length,document.seams.length)
  assert.ok(out.panels.every(panel=>out.fabrics.some(f=>f.id===panel.fabric)))
  console.log('PASS',id,out.panels.length,'panels',out.seams.length,'seams',JSON.stringify(report))
  passed++
}
console.log(`PASS ${passed}/${GARMENT_TEMPLATES.length} native library exports with independent preparation`)
