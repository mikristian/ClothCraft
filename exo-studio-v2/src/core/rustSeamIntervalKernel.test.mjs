import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {test} from 'node:test'
import {
  initializeRustSeamIntervalKernel,rustSeamIntervalKernelReady,rustSeamIntervalKernelStatus,
  rustSeamIntervalValid,rustSeamIntervalsOverlap,
} from './rustSeamIntervalKernel.js'
import {seamEndpointInterval,seamEndpointOverlap,auditSewingConstruction,validateNewSeam} from './sewingConstruction.js'
import {createTemplateProject} from '../data/templates.js'

const originalValid=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&a>=0&&b<=1&&a<b
const originalOverlap=(a,b,c,d,e)=>originalValid(a,b)&&originalValid(c,d)&&Math.min(b,d)-Math.max(a,c)>e

test('fallback preserves original interval and overlap behavior',()=>{
  assert.equal(rustSeamIntervalKernelReady(),false)
  assert.deepEqual(seamEndpointInterval({startT:null,endT:'0.5'}),{start:0,end:0.5})
  assert.equal(seamEndpointInterval({startT:'broken'}),null)
  assert.equal(seamEndpointOverlap({pieceId:'left',edgeIndex:0,startT:0,endT:.6},
    {pieceId:'right',edgeIndex:0,startT:.3,endT:.7}),false)
  assert.equal(rustSeamIntervalsOverlap(0,.2,.2,.6),false)
})

test('invalid negative seam overlap tolerance cannot turn disjoint edges into a collision',()=>{
  // A negative tolerance reverses the separation test and can incorrectly
  // report a gap as overlapping, blocking otherwise valid 2D sewing topology.
  assert.equal(rustSeamIntervalsOverlap(0,.2,.3,.5,-.2),false)
  assert.equal(rustSeamIntervalsOverlap(0,.2,.3,.5,-Infinity),false)
  assert.equal(rustSeamIntervalsOverlap(0,.2,.3,.5,NaN),false)
  assert.equal(rustSeamIntervalsOverlap(0,.2,.3,.5,0),false)
  assert.equal(rustSeamIntervalsOverlap(0,.4,.3,.5,0),true)
})

test('loaded WASM reproduces JavaScript interval predicates across random and boundary cases',async()=>{
  const wasm=await readFile('public/wasm/exo_seam_interval_kernel.wasm')
  assert.equal(await initializeRustSeamIntervalKernel({bytes:wasm}),true,rustSeamIntervalKernelStatus().error)
  assert.equal(rustSeamIntervalKernelStatus().backend,'rust-wasm')
  assert.equal(rustSeamIntervalsOverlap(0,.2,.3,.5,-.2),false,'WASM-backed calls must reject negative tolerance too')
  let seed=0x12345678
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
  const special=[-Infinity,-2,-.000001,-0,0,1e-8,0.1,0.5,0.500001,0.999999,1,1.000001,2,Infinity,NaN]
  for(let i=0;i<3000;i++){
    const value=()=>i<100?special[Math.floor(random()*special.length)]:random()*1.2-.1
    const [a,b,c,d,e]=[value(),value(),value(),value(),i%9===0?1e-5:i%13===0?NaN:random()*.03]
    assert.equal(rustSeamIntervalValid(a,b),originalValid(a,b),`valid case ${i}`)
    assert.equal(rustSeamIntervalsOverlap(a,b,c,d,e),originalOverlap(a,b,c,d,e),`overlap case ${i}`)
  }
  assert.equal(seamEndpointOverlap({pieceId:'a',edgeIndex:1,startT:.1,endT:.3},
    {pieceId:'a',edgeIndex:1,startT:.2,endT:.4}),true)
  assert.equal(seamEndpointOverlap({pieceId:'a',edgeIndex:1,startT:.1,endT:.3},
    {pieceId:'a',edgeIndex:1,startT:.3,endT:.5}),false)
})

test('native-supported sewing audit preserves existing construction behavior',()=>{
  const project=createTemplateProject('blank')
  const source=project.pieces[0]
  source.id='a'
  source.points=[{x:0,y:0},{x:40,y:0},{x:40,y:20},{x:0,y:20}]
  const target=structuredClone(source);target.id='b'
  project.pieces=[source,target]
  project.seams=[{id:'base',a:{pieceId:'a',edgeIndex:0,startT:.1,endT:.3},b:{pieceId:'b',edgeIndex:0,startT:.1,endT:.3}}]
  const adjacent={a:{pieceId:'a',edgeIndex:0,startT:.3,endT:.6},b:{pieceId:'b',edgeIndex:0,startT:.3,endT:.6}}
  assert.equal(validateNewSeam(project,adjacent).ok,true)
  const overlapping={a:{...adjacent.a,startT:.2},b:adjacent.b}
  assert.equal(validateNewSeam(project,overlapping).ok,false)
  assert.equal(auditSewingConstruction(project).usableForLiveAssembly,true)
  project.seams.push({id:'overlap',...overlapping})
  assert.equal(auditSewingConstruction(project).usableForLiveAssembly,false)
})
