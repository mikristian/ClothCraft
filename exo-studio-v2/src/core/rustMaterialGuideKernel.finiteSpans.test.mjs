import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {rustMaterialGuideSpans,initializeRustMaterialGuideKernel} from './rustMaterialGuideKernel.js'

const extremePoints=[[1e308,0],[-1e308,1],[0,0],[0,0],[4,0],[0,1]]
const malformed=[[0,1,2]]
const mixed=[[0,1,2],[3,4,5]]

function assertSafeSpans(label){
  assert.deepEqual(rustMaterialGuideSpans(malformed,extremePoints,.5),[],`${label}: overflowing interpolation`)
  assert.deepEqual(rustMaterialGuideSpans(mixed,extremePoints,.5),[[0,2]],`${label}: valid triangle survives invalid neighbor`)
  assert.deepEqual(rustMaterialGuideSpans([[0,1,2]],[[-1e308,0],[1e308,0],[0,1]],0),[],`${label}: unrepresentable span width`)
  assert.deepEqual(rustMaterialGuideSpans([[3,4,5]],extremePoints,.5),[[0,2]],`${label}: ordinary geometry unchanged`)
}

test('2D material-guide JavaScript fallback excludes non-finite spans',()=>{
  assertSafeSpans('JS fallback')
})

test('2D material-guide Rust WASM output excludes non-finite spans',async()=>{
  const bytes=readFileSync(new URL('../../public/wasm/exo_material_guide_kernel.wasm',import.meta.url))
  assert.equal(await initializeRustMaterialGuideKernel({bytes}),true)
  assertSafeSpans('Rust WASM')
})
