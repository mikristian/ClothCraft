import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {
  gradeMultiPieceBreakTable,
  initializeRustGradingKernel,
  rustGradingKernelReady,
} from './rustGradingKernel.js'

const sizes=['S','M','L']
const valid=()=>({
  sizes:[...sizes],baseSize:'M',
  pieces:[{id:1,points:[{
    id:1,x:10,y:20,
    steps:[{dx:1,dy:2},{dx:3,dy:4}],
  }]}],
})

const malformed=()=>[
  {label:'sparse sizes',make:()=>{const f=valid();delete f.sizes[0];return f},reason:'size names'},
  {label:'sparse pieces',make:()=>{const f=valid();f.pieces.length=2;return f},reason:'piece IDs or pieces'},
  {label:'sparse points',make:()=>{const f=valid();f.pieces[0].points.length=2;return f},reason:'point IDs'},
  {label:'sparse step table',make:()=>{const f=valid();delete f.pieces[0].points[0].steps[0];return f},reason:'coordinates or break table'},
  {label:'overflow after first signed break',make:()=>{
    const f=valid();f.pieces[0].points[0].x=Number.MAX_VALUE;
    f.pieces[0].points[0].steps[1].dx=Number.MAX_VALUE;
    return f
  },reason:'overflow'},
]

test('WASM never accepts sparse structural arrays that JS rejects, and overflow errors match',async()=>{
  assert.equal(rustGradingKernelReady(),false,'benchmark must first check JS fallback')
  const base=valid()
  const js=gradeMultiPieceBreakTable(base)
  const cases=malformed()
  for(const item of cases){
    assert.throws(()=>gradeMultiPieceBreakTable(item.make()),{
      name:'TypeError',message:`Invalid native grading batch: ${item.reason}`
    },`JS fallback ${item.label}`)
  }
  const bytes=readFileSync(new URL('../../public/wasm/exo_grading_kernel.wasm',import.meta.url))
  assert.equal(await initializeRustGradingKernel({bytes}),true)
  assert.equal(rustGradingKernelReady(),true)
  assert.deepEqual(gradeMultiPieceBreakTable(base),js,'valid dense output must be invariant')
  for(const item of cases){
    assert.throws(()=>gradeMultiPieceBreakTable(item.make()),{
      name:'TypeError',message:`Invalid native grading batch: ${item.reason}`
    },`native WASM ${item.label}`)
  }
})
