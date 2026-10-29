import test from 'node:test'
import assert from 'node:assert/strict'
import {nativeSolverBadge20261028 as badge} from './nativeSolverBadge20261028.js'

test('installed native CPU fallback is shown as CPU, never Metal GPU',()=>{
 assert.equal(badge({backend:'ClothCraft CPU VBD + OGC'}),'CPU VBD + OGC')
 assert.equal(badge({backend:'ClothCraft GPU VBD + CPU OGC'}),'EXPERIMENTAL GPU VBD + CPU CONTACT')
})
test('missing or forged Rust backend cannot claim running accelerated physics',()=>{
 for(const native of [null,{}, {backend:'GPU VBD + CPU CONTACT'},
  {backend:'ClothCraft GPU VBD + CPU OGC (claimed)'},
  {backend:'ClothCraft GPU VBD + CPU OGC\nCPU'},
  {backend:'ClothCraft GPU VBD + CPU OGC',gpuActive:false}]){
  const result=badge(native)
  if(native?.backend==='ClothCraft GPU VBD + CPU OGC')
   assert.equal(result,'EXPERIMENTAL GPU VBD + CPU CONTACT')
  else assert(!result.startsWith('EXPERIMENTAL GPU'))
 }
})
