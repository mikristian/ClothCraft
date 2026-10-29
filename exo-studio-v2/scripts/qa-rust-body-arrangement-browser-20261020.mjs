// Independent source-fixture regression and live Vite module availability.
// Run: node scripts/qa-rust-body-arrangement-browser-20261020.mjs
// When the Rust bridge lands, this suite runs through its production JS caller.
import assert from 'node:assert/strict'
import { createTemplateProject } from '../src/data/templates.js'
import { arrangePatternProject, inferPatternBodyRole, resolvePatternArrangement } from '../src/core/patternBodyArrangement.js'

let checks = 0
const eq = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++ }
const fixtureExpectations = {
  tee: {front:'front', back:'back', 'sleeve-left':'left-arm', 'sleeve-right':'right-arm'},
  hoodie: {'sleeve-left':'left-arm','sleeve-right':'right-arm','hood-left':'hood-left','hood-right':'hood-right'},
  'zip-hoodie': {'front-left':'front','front-right':'front','hood-left':'hood-left','hood-right':'hood-right'},
  skirt: {'skirt-front':'front','skirt-back':'back'},
  pants: {'pants-left-front':'left-leg-front','pants-left-back':'left-leg-back','pants-right-front':'right-leg-front','pants-right-back':'right-leg-back'},
  'jeans-501': {'left-front-leg':'left-leg-front','left-back-leg':'left-leg-back','right-front-leg':'right-leg-front','right-back-leg':'right-leg-back', 'coin-pocket':null,'left-front-pocket-bag':null,'right-front-pocket-facing':null},
  'clo-male-tshirt': {'clo-left-sleeve':'left-arm','clo-right-sleeve':'right-arm','clo-neck-a':'neck'},
}
for (const [id, expected] of Object.entries(fixtureExpectations)) {
  const project = createTemplateProject(id)
  const before = structuredClone(project)
  const twice = arrangePatternProject(project)
  eq(twice, project, `idempotent full layout/template: ${id}`)
  eq(project, before, `no mutation: ${id}`)
  for (const [pieceId, role] of Object.entries(expected)) {
    const piece = project.pieces.find(p => p.id === pieceId)
    assert.ok(piece, `missing ${id}/${pieceId}`)
    eq(inferPatternBodyRole(piece,project),role,`${id}/${pieceId} role`)
    eq(piece.arrangement3d?.wrap ?? null,role,`${id}/${pieceId} wrap`)
  }
  for (const piece of project.pieces) {
    eq(resolvePatternArrangement(piece,project),piece.arrangement3d,`${id}/${piece.id}: exact authored layout`)
  }
}

const samplePoints = [{x:0,y:0},{x:30,y:0},{x:30,y:45},{x:0,y:45}]
const project = {id:'custom',name:'Custom Shirt',templateId:'tee',pieces:[
  {id:'left-sleeve',name:'Left Sleeve',points:samplePoints,layout2d:{x:41,y:22},arrangement3d:{wrap:'left-arm',x:-0.42,y:1.24,z:0.11,flip:true}},
  {id:'right-sleeve',name:'Right Sleeve',points:samplePoints,arrangement3d:{x:0,y:0,z:0}},
  {id:'hood-right',name:'Right Hood',points:samplePoints,arrangement3d:{wrap:'hood-right',x:0.22,y:1.64,z:-0.2}},
  {id:'mystery',name:'Abstract Panel',points:samplePoints,arrangement3d:{x:0,y:0,z:0}},
]}
const pristine=structuredClone(project)
const result=arrangePatternProject(project)
eq(project,pristine,'custom input mutation forbidden')
eq(result.pieces[0],project.pieces[0],'authored explicit wrap/x/y/z/flip/layout unchanged')
eq(result.pieces[2],project.pieces[2],'authored hood wrap/placement unchanged')
eq(result.pieces[1].arrangement3d,{x:0.285,y:1.26,z:0.045,wrap:'right-arm',flip:false},'zero placement defaults')
eq(result.pieces[3],project.pieces[3],'unknown panel remains unclassified')
eq(arrangePatternProject(result),result,'custom idempotence')

const url=process.env.EXO_BODY_QA_VITE || 'http://127.0.0.1:5297'
try {
  const response=await fetch(`${url}/src/core/patternBodyArrangement.js`,{signal:AbortSignal.timeout(3500)})
  assert.equal(response.status,200,'Vite source module HTTP')
  const body=await response.text()
  assert.match(body,/inferPatternBodyRole|rustBodyArrangement/,'Vite source body-arrangement entry point')
  console.log(`PASS source Vite ${url}: body-arrangement module served`)
} catch(error) {
  console.error(`PENDING browser/Vite check: ${error.message}`)
  process.exitCode=1
}
console.log(`PASS ${checks} assertions: 7 real template fixtures, wrap/offset/layout, unknown panels, custom authored placement; Rust bridge parity pending until integration is available`)
