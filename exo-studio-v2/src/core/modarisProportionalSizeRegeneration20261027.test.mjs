import test from 'node:test'
import assert from 'node:assert/strict'
import {planModarisProportionalSixSizeRegeneration20261027 as plan} from './modarisProportionalSizeRegeneration20261027.js'

const sizes=['XS','S','M','L','XL','XXL']
const ratios=[0.9,0.95,1,1.06,1.11,1.16]
const offsets=[.006,.003,0,.002,.004,.008]
const rectangle=(id,width,height,offset=0)=>({id,polygon:{points:[[offset,0],[offset+width,0],[offset+width,height],[offset,height]],edges:['e0','e1','e2','e3']}})
function fixture(){
  const template={name:'authored-six-size-source',seams:[],panels:[rectangle('front',.4,.3),rectangle('back',.38,.28)]}
  const gradedTemplates=ratios.map((ratio,i)=>({name:template.name,seams:[],panels:[
    rectangle('front',.4*ratio,.3*ratio,offsets[i]),
    rectangle('back',.38*ratio,.28*ratio,offsets[i]*1.5),
  ]}))
  const project={version:1,revision:92,template,grade_run:{schemaVersion:1,sizes,baseSize:'M',baseTemplate:structuredClone(template),gradedTemplates,pomSpecs:[]}}
  const updated=structuredClone(template)
  for(const panel of updated.panels){
    for(const point of panel.polygon.points){point[0]*=1.08;point[1]*=0.92}
  }
  return {project,updated}
}

test('restages true proportional graded geometry for six real stored templates without mutations',()=>{
  const {project,updated}=fixture(),before=structuredClone({project,updated})
  const result=plan(project,updated,{expectedRevision:92})
  assert.equal(result.ok,true,result.reason)
  assert.deepEqual(result.sizeOrder,sizes)
  assert.equal(result.changedRelations,10)
  assert.equal(result.candidates.length,6)
  for(const [i,size] of sizes.entries())for(const [j,panel] of result.candidates[i].template.panels.entries()){
    assert.equal(result.candidates[i].size,size)
    const originalSize=project.grade_run.gradedTemplates[i].panels[j]
    const originalBase=project.template.panels[j]
    const newBase=updated.panels[j]
    const width=panel.polygon.points[1][0]-panel.polygon.points[0][0]
    const height=panel.polygon.points[2][1]-panel.polygon.points[1][1]
    const oldWidthRatio=(originalSize.polygon.points[1][0]-originalSize.polygon.points[0][0])/(originalBase.polygon.points[1][0]-originalBase.polygon.points[0][0])
    const newWidth=newBase.polygon.points[1][0]-newBase.polygon.points[0][0]
    assert(Math.abs(width-newWidth*oldWidthRatio)<1e-9)
    assert(Math.abs(height-(newBase.polygon.points[2][1])*ratios[i])<1e-9)
    assert.deepEqual(panel.polygon.edges,originalBase.polygon.edges)
  }
  assert.deepEqual(result.candidates[2].template,updated)
  assert.equal(result.committed,false)
  assert.equal(result.nativeAuthority,false)
  assert.equal(result.factoryApproved,false)
  assert.equal(result.vendorEquivalent,false)
  assert.deepEqual({project,updated},before)
  // Prior additive grading would produce .4*.08 + .44 = .472 m for XL;
  // the authored proportional rule correctly yields .4*1.08*1.11 = .47952 m.
  const xlFront=result.candidates[4].template.panels[0].polygon.points
  assert(Math.abs((xlFront[1][0]-xlFront[0][0])-.47952)<1e-8)
})

test('rejects stale source, six-size identity tampering and changed industrial metadata',()=>{
  const original=fixture()
  assert.match(plan(original.project,original.updated,{expectedRevision:91}).reason,/Stale/)
  const stale=fixture();stale.project.grade_run.baseTemplate.panels[0].polygon.points[1][0]+=.01
  assert.match(plan(stale.project,stale.updated,{expectedRevision:92}).reason,/current six-size native source/)
  const lost=fixture();lost.project.grade_run.gradedTemplates.splice(5)
  assert.equal(plan(lost.project,lost.updated,{expectedRevision:92}).ok,false)
  const forged=fixture();forged.project.grade_run.gradedTemplates[0].panels[0].id='wrong'
  assert.match(plan(forged.project,forged.updated,{expectedRevision:92}).reason,/identity/)
  const sewn=fixture();sewn.project.template.seams=[{id:'sew'}]
  assert.equal(plan(sewn.project,sewn.updated,{expectedRevision:92}).ok,false)
  const industrial=fixture();industrial.project.template.panels[0].polygon.notches={e0:[{t:.5}]}
  assert.match(plan(industrial.project,industrial.updated,{expectedRevision:92}).reason,/current six-size native source|industrial attachments/)
})

test('rejects unsafe geometry and impossible authored grade relationships without partial sizes',()=>{
  const collapsed=fixture();collapsed.updated.panels[0].polygon.points[1]=[0,0]
  assert.equal(plan(collapsed.project,collapsed.updated,{expectedRevision:92}).ok,false)
  const inverted=fixture();inverted.updated.panels[0].polygon.points[1]=[-.4,0]
  assert.match(plan(inverted.project,inverted.updated,{expectedRevision:92}).reason,/self-intersecting|winding|invalid|outside compilable range/)
  const extreme=fixture();extreme.project.grade_run.gradedTemplates[5].panels[1].polygon.points[1][0]=1.6
  extreme.project.grade_run.gradedTemplates[5].panels[1].polygon.points[2][0]=1.6
  assert.match(plan(extreme.project,extreme.updated,{expectedRevision:92}).reason,/out of bounds/)
  const invalid=fixture();invalid.project.grade_run.gradedTemplates[0].panels[1].polygon.points[0][0]=Infinity
  assert.match(plan(invalid.project,invalid.updated,{expectedRevision:92}).reason,/nonfinite|source|invalid native material polygon/)
  const sourceCopy=structuredClone(extreme.project)
  assert.deepEqual(extreme.project,sourceCopy)
})

test('accepts native material envelope resize while retaining ungraded panel identity and fields',()=>{
  const {project,updated}=fixture()
  for(const template of [project.template,project.grade_run.baseTemplate,...project.grade_run.gradedTemplates,updated])
    for(const panel of template.panels){
      panel.pattern={width:panel.id==='front'?.4:.38,height:panel.id==='front'?.3:.28,nx:12,ny:10}
      panel.fabric='cotton';panel.grain_degrees=90
      panel.polygon.subdivisions=0
      panel.polygon.notches={}
      panel.polygon.curves={}
      panel.polygon.seam_allowances={}
      panel.polygon.free_curve_points={}
      panel.polygon.measurements=[]
    }
  for(const panel of updated.panels){panel.pattern.width*=1.08;panel.pattern.height*=.92}
  const result=plan(project,updated,{expectedRevision:92})
  assert.equal(result.ok,true,result.reason)
  for(const item of result.candidates)for(const panel of item.template.panels){
    const source=updated.panels.find(p=>p.id===panel.id)
    assert.deepEqual(panel.pattern,source.pattern)
    assert.equal(panel.fabric,'cotton')
    assert.equal(panel.grain_degrees,90)
  }
  assert.equal(result.committed,false)
})
