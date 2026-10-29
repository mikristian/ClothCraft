import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeFunctionOwnership, prioritizeFunctions } from './function-ownership-priority-20261021.mjs'

test('identifies numerical JS implementation versus Rust delegation',()=>{
  const js=`import { run } from './rustGeometryKernel.js';
export function integrate(vertices) { for(const vertex of vertices) { vertex.x += Math.sqrt(vertex.y * vertex.y); } return vertices }
export function delegate(vertices) { return run(vertices) }
export function mixed(vertices) { for(const vertex of vertices) vertex.x += Math.sqrt(vertex.y); return run(vertices) }`
  const functions=analyzeFunctionOwnership('src/core/mesh.js',js).functions
  assert.deepEqual(functions.map(x=>x.classification),[
    'js-numerical-implementation','rust-bridge-delegation','mixed-js-and-rust-bridge'])
  assert.ok(functions[0].score>functions[2].score)
  assert.equal(functions[1].score,0)
})

test('does not attribute numerical work inside nested function to outer bridge',()=>{
  const js=`import { solve } from './rustMeshKernel.js';
export function outer(){ function numerical(mesh){ for(const vertex of mesh) vertex.x *= Math.sin(vertex.y) } return solve() }`
  const functions=analyzeFunctionOwnership('src/core/mesh.js',js).functions
  assert.equal(functions.find(f=>f.name==='outer').classification,'rust-bridge-delegation')
  assert.equal(functions.find(f=>f.name==='numerical').classification,'js-numerical-implementation')
})

test('bridge numerical fallback is prioritized but tiny glue remains unscored',()=>{
  const functions=analyzeFunctionOwnership('src/core/rustMeshKernel.js',
    `export function compute(mesh){ for(const vertex of mesh) vertex.x += Math.sqrt(vertex.y) }
     export function ready(){ return Boolean(rust) }
     export function glue(x){ return rust.exo_solve(x) }`).functions
  assert.equal(functions[0].classification,'rust-bridge-js-numerical-fallback')
  assert.ok(functions[0].score>0)
  assert.deepEqual(functions.slice(1).map(f=>f.classification),[
    'rust-bridge-glue-or-small-js','rust-bridge-glue-or-small-js'])
  assert.equal(functions[1].score,0)
  assert.equal(functions[2].score,0)
})

test('bridge fallback candidates are included in deterministic priority output',()=>{
  const sources={'src/core/rustMeshKernel.js':`export function fallback(vertices){
    for(const vertex of vertices){ vertex.x = vertex.x + Math.sqrt(vertex.y * vertex.y) }
    return vertices
  }`}
  const report=prioritizeFunctions(sources)
  assert.equal(report.candidateCount,1)
  assert.equal(report.top[0].classification,'rust-bridge-js-numerical-fallback')
  assert.deepEqual(report,prioritizeFunctions(sources))
})

test('deterministic sorting, scoped ownership and source parse failures',()=>{
  const sources={
    'src/core/z.js':'export function solve(mesh){ for(const vertex of mesh) vertex.x += Math.sqrt(vertex.y) }',
    'src/core/a.js':'export function solve(mesh){ for(const vertex of mesh) vertex.x += Math.sqrt(vertex.y) }',
    'src/core/bad.js':'export function (',
  }
  const options={limit:2,workstreams:[{id:'W01',scope:['src/core/a.js']} ]}
  const report=prioritizeFunctions(sources,options)
  assert.deepEqual(report.top.map(f=>f.file),['src/core/a.js','src/core/z.js'])
  assert.deepEqual(report.top.map(f=>f.ownership),[['W01'],[]])
  assert.equal(report.parseFailures.length,1)
  assert.deepEqual(report,prioritizeFunctions(sources,options))
})
