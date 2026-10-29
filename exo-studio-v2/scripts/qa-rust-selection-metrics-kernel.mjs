import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {measureNativeSelection} from '../src/core/clothcraftSelectionMetrics.js'
import {initializeRustSelectionMetricsKernel,rustSelectionMetricsReady} from '../src/core/rustSelectionMetricsKernel.js'
const snapshot={revision:1,uv:[],positions:[],panels:[{id:'p',boundaries:{edge:[]}}],template:{seams:[{id:'s',a:{panel:'p',edge:'edge',range:[0.2,0.8]},b:{panel:'p',edge:'edge',range:[0.1,0.7]}}]}}
for(let i=0;i<89;i++){
  snapshot.uv.push([i/10,Math.sin(i/4)/15]);snapshot.positions.push([i/9,Math.cos(i/5)/8,Math.sin(i/7)/6]);snapshot.panels[0].boundaries.edge.push(i)
}
const selected={seamId:'s'}
function sample(){return measureNativeSelection(snapshot,selected)}
const expected=[]
for(let j=0;j<100;j++){
  const a=(j%30)/100,b=0.7+(j%29)/100
  snapshot.template.seams[0].a.range=[a,b]
  snapshot.template.seams[0].b.range=[a/2,0.9]
  expected.push(sample())
}
assert.equal(await initializeRustSelectionMetricsKernel({bytes:readFileSync('public/wasm/exo_selection_metrics_kernel.wasm')}),true)
assert.equal(rustSelectionMetricsReady(),true)
for(let j=0;j<100;j++){
  const a=(j%30)/100,b=0.7+(j%29)/100
  snapshot.template.seams[0].a.range=[a,b]
  snapshot.template.seams[0].b.range=[a/2,0.9]
  const actual=sample()
  for(const key of ['first','second'])for(const field of ['length2DCm','length3DCm']){
    assert.ok(Math.abs(actual[key][field]-expected[j][key][field])<1e-8,`${j} ${key}.${field}: ${actual[key][field]} vs ${expected[j][key][field]}`)
  }
  assert.deepEqual({...actual,first:expected[j].first,second:expected[j].second},expected[j])
}
console.log('compiled WASM 3D interval integration differential: PASS (200 boundaries)')
