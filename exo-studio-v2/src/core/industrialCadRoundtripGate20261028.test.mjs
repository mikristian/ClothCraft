import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {gradeProject} from './grading.js'
import {projectToDxf} from './dxf.js'
import {inspectIndustrialCadInterchange20261028 as inspect} from './industrialCadRoundtripGate20261028.mjs'
const fixture=()=>createTeeTemplate()
const wires=project=>Object.fromEntries(project.grading.sizes.map(size=>[size,projectToDxf(gradeProject(project,size),size,{cutlineMode:'manufacturing',requireGradedGeometry:true})]))
test('every six-size tee carries audited physical CUT, STITCH, grain and native size identity without changing source',()=>{
 const project=fixture(),before=JSON.stringify(project),result=inspect(project)
 assert.equal(result.ok,true,JSON.stringify(result.issues))
 assert.equal(result.sizeCount,6);assert.equal(result.files.length,6)
 assert(result.files.every(f=>f.physicalCuts===project.pieces.length&&f.units==='mm'&&/^[a-f\d]{64}$/.test(f.sha256)))
 assert.equal(result.receiverCadVerified,false);assert.equal(result.astmCertified,false);assert.equal(result.cuttingAuthorized,false)
 assert.equal(JSON.stringify(project),before)
})
test('independently received DXF fixture cannot drop a size, relabel it, change geometry or units',()=>{
 const project=fixture(),reference=wires(project)
 for(const [size,mutate] of [
  ['XS',()=>undefined],['M',wire=>wire.replace('GARMENT_STUDIO_SIZE M','GARMENT_STUDIO_SIZE XS')],
  ['L',wire=>wire.replace('9\n$INSUNITS\n70\n4','9\n$INSUNITS\n70\n1')],
  ['XL',wire=>wire.replace(/(\n10\n)([-\d.]+)/,(all,prefix,value)=>prefix+(Number(value)+70))],
 ]){
  const altered={...reference};const resultWire=mutate(altered[size]);if(resultWire===undefined)delete altered[size];else altered[size]=resultWire
  const result=inspect(project,{wireBySize:altered})
  assert.equal(result.ok,false,`undetected tamper ${size}`)
  assert(result.issues.length)
 }
})
test('duplicate sizes and empty source refuse to issue a CAD certificate',()=>{
 const project=fixture();project.grading.sizes=['M','M']
 assert.equal(inspect(project).ok,false)
 assert.equal(inspect({grading:{sizes:['M','XL'],baseSize:'M'},pieces:[]}).ok,false)
})
test('untrusted wire maps, extra size identities and unbounded limits fail without CAD approval',()=>{
 const project=fixture(),reference=wires(project)
 for(const candidate of [
  {...reference,UNKNOWN:reference.M},
  Object.assign(Object.create(null),reference,{UNKNOWN:reference.M}),
  new Date(),
  Object.assign(Object.create({untrusted:true}),reference),
 ]){
  const result=inspect(project,{wireBySize:candidate})
  assert.equal(result.ok,false)
  assert.equal(result.receiverCadVerified,false)
 }
 for(const maxWireBytes of [0,-1,Infinity,16e6+1,'16000000'])
  assert.equal(inspect(project,{wireBySize:reference,maxWireBytes}).ok,false)
})
