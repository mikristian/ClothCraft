import test from 'node:test'
import assert from 'node:assert/strict'
import {verifyModarisNativePhysicalPomEnvelopeCommit20261027 as witness} from './modarisNativePhysicalPomEnvelopeWitness20261027.js'

const SIZES=['XS','S','M','L','XL','XXL']
const clone=structuredClone
function fixture(){
  const make=width=>({name:'sample',fabrics:[{id:'cotton'}],panels:[{
    id:'front',polygon:{points:[[0,0],[width,0],[width,.32],[0,.32]],edges:['top','right','bottom','left']}}]})
  const graded=width=>SIZES.map((size,i)=>make(width+[ -.015,-.007,0,.005,.010,.014][i]))
  const spec={id:'width_pom',panelId:'front',kind:'anchor-distance',fromPoint:0,toPoint:1,
    targetsMm:Object.fromEntries(SIZES.map(s=>[s,null]))}
  const limits=Object.fromEntries(SIZES.map((size,i)=>[size,{
    minMm:380+[ -.015,-.007,0,.005,.010,.014][i]*1000,
    maxMm:415+[ -.015,-.007,0,.005,.010,.014][i]*1000}]))
  const project=width=>{
    const template=make(width)
    return {template,grade_run:{schemaVersion:1,sizes:SIZES,baseTemplate:clone(template),
      gradedTemplates:graded(width),pomSpecs:[clone(spec)]},fabric_grade_envelope:{
      schemaVersion:1,fabricId:'cotton',provenance:'Author lab sample',
      measurements:{width:{}},physicalPomBounds:{width_pom:clone(limits)},sourceTemplate:clone(template)}}
  }
  return {beforeProject:project(.4),afterProject:project(.41),beforeRevision:3,afterRevision:4,pomId:'width_pom'}
}

test('independently verifies six actual graded point distances in one native revision',()=>{
  const result=witness(fixture())
  assert.equal(result.ok,true,result.reason)
  assert.equal(result.changedSizes,6)
  assert.equal(result.rows.length,6)
  assert.equal(result.factoryApproved,false)
})

test('rejects forged geometry, missing bounds, stale sources, unsupported POMs and false revision',()=>{
  const variants=[
    x=>{x.afterProject.grade_run.gradedTemplates[4].panels[0].polygon.points[1][0]+=.05},
    x=>{delete x.afterProject.fabric_grade_envelope.physicalPomBounds.width_pom.XXL},
    x=>{x.afterProject.fabric_grade_envelope.physicalPomBounds.width_pom.XL.maxMm=401},
    x=>{x.afterProject.fabric_grade_envelope.sourceTemplate.name='forged'},
    x=>{x.afterProject.grade_run.pomSpecs[0].kind='sewline-edge'},
    x=>{x.afterProject.grade_run.pomSpecs[0].id='wrong'},
    x=>{x.afterProject.fabric_grade_envelope.physicalPomBounds={}},
    x=>{x.afterProject.fabric_grade_envelope.fabricId='unknown'},
    x=>{x.afterRevision=3},
    x=>{x.afterProject.grade_run.gradedTemplates[0].panels[0].polygon.points[1][0]=Infinity},
  ]
  for(const mutate of variants){const x=fixture();mutate(x);assert.equal(witness(x).ok,false,mutate.toString())}
})
