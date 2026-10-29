import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createDefaultProject} from '../src/data/defaultProject.js'
import {parseDxfPatterns,projectToDxf} from '../src/core/dxf.js'
import {initializeRustGeometryKernel,rustDxfNotchCut,rustGeometryKernelStatus} from '../src/core/rustGeometryKernel.js'

const project=createDefaultProject()
const front=project.pieces[0]
front.notches=[
  {id:'single-preserved',edgeIndex:0,t:0.23,type:'single',depthCm:0.7},
  {id:'double-preserved',edgeIndex:1,t:0.98,type:'double',depthCm:0.45},
  {id:'invalid-preserved',edgeIndex:-1,type:'single'},
]
// Exercise sampled curved edges as well as implicit seam match marks.
front.curves={...front.curves,0:{cx:front.points[0].x-3,cy:front.points[0].y+5}}
assert.ok(project.seams.length>0)
const original=structuredClone(project)
const baseline=projectToDxf(project,'M')
const imported=parseDxfPatterns(baseline)
assert.ok(imported.pieces.some(piece=>piece.notches.length>0))
const wasm=readFileSync('public/wasm/exo_geometry_kernel.wasm')
const {instance}=await WebAssembly.instantiate(wasm,{})
assert.equal(typeof instance.exports.exo_dxf_notch_coordinate,'function')
assert.equal(await initializeRustGeometryKernel({bytes:wasm}),true)
assert.equal(rustGeometryKernelStatus().backend,'rust-wasm')
let coordinates=0
for(const point of [-100.25,0,31.7])for(const normal of [-1,-0.6,0,0.8,1])
for(const depth of [-2,0,0.45,3.7]){
  const cut=rustDxfNotchCut({x:point,y:-point},{x:normal,y:-normal},depth)
  assert.deepEqual(cut,{
    a:{x:point-normal*depth*0.15,y:-point-(-normal)*depth*0.15},
    b:{x:point+normal*depth,y:-point+(-normal)*depth},
  })
  coordinates+=4
}
const actual=projectToDxf(project,'M')
assert.equal(actual,baseline,'DXF export must remain byte identical')
assert.deepEqual(parseDxfPatterns(actual),imported,'Imported geometry and generated notch IDs must match')
assert.deepEqual(project,original,'All source seam/notch IDs and metadata must remain unchanged')
console.log(JSON.stringify({pass:true,coordinates,dxfBytes:Buffer.byteLength(actual),
  pieces:imported.pieces.length,sourceSeamIds:project.seams.map(seam=>seam.id),
  sourceNotchIds:front.notches.map(notch=>notch.id)}))
