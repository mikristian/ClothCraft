import test from 'node:test'
import assert from 'node:assert/strict'
import {createTemplateProject} from '../data/templates.js'
import {gradeProject} from './grading.js'
import {samplePieceBoundary} from './project.js'
import {buildAccuMarkTwoPointRestack20261023 as restack} from './accumarkTwoPointRestack20261023.js'

const near=(a,b,tol=1e-7)=>assert.ok(Math.abs(a-b)<tol,`${a} vs ${b}`)
const len=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y)
const contourLength=points=>points.reduce((sum,p,i)=>sum+len(p,points[(i+1)%points.length]),0)

test('nonuniform six-size tee rigid registration aligns first anchor, reports guide mismatch and retains base identity',()=>{
  const source=createTemplateProject('tee'),before=structuredClone(source)
  const result=restack(source,{pieceId:'front',firstPointIndex:0,secondPointIndex:2})
  assert.equal(result.ok,true,JSON.stringify(result))
  assert.deepEqual(result.sizeLine,['XS','S','M','L','XL','XXL'])
  assert.equal(result.outlines.length,6)
  const base=result.outlines.find(x=>x.size==='M')
  near(base.transform.rotationRadians,0)
  near(base.transform.translationCm.x,0)
  near(base.transform.translationCm.y,0)
  near(base.residualCm,0)
  assert(result.outlines.some(x=>x.size!=='M'&&Math.abs(x.lengthMismatchCm)>1e-5))
  for(const row of result.outlines){
    near(row.targetGuide.first.x,base.targetGuide.first.x)
    near(row.targetGuide.first.y,base.targetGuide.first.y)
    near(row.secondResidualCm,Math.abs(row.lengthMismatchCm))
    near(row.transform.scale,1)
    const graded=gradeProject(source,row.size).pieces.find(p=>p.id==='front')
    const original=samplePieceBoundary(graded,12).points
    near(contourLength(row.points),contourLength(original),1e-5)
    near(len(row.vertices[0],row.vertices[2]),len(graded.points[0],graded.points[2]))
    near(row.sourceGuide.lengthCm,row.targetGuide.lengthCm)
  }
  assert.deepEqual(source,before)
  assert.equal(result.displayOnly,true)
  assert.equal(result.manufacturingApproved,false)
})

test('straight rectangular and curved contours preserve all sampled segment lengths under nonzero rotation',()=>{
  for(const curved of [false,true]){
    const piece={id:'square',points:[{x:0,y:0},{x:10,y:0},{x:10,y:8},{x:0,y:8}],
      ...(curved?{curves:{0:{cx:5,cy:-3}}}:{})}
    const project={grading:{sizes:['XS','S','M','L','XL','XXL'],baseSize:'M',widthPerSizeCm:0,lengthPerSizeCm:0},pieces:[piece]}
    // Rotate one graded anchor relative to the base, generating nonzero rigid registration.
    piece.points[1].gradeRule={enabled:true,dxPerSize:0,dyPerSize:2}
    const result=restack(project,{pieceId:'square',firstPointIndex:0,secondPointIndex:1})
    assert.equal(result.ok,true,JSON.stringify(result))
    assert(result.outlines.some(o=>Math.abs(o.transform.rotationDegrees)>1))
    for(const row of result.outlines){
      const graded=gradeProject(project,row.size).pieces[0]
      const sample=samplePieceBoundary(graded,12).points
      assert.equal(sample.length,row.points.length)
      for(let i=0;i<sample.length;i++){
        near(len(sample[i],sample[(i+1)%sample.length]),len(row.points[i],row.points[(i+1)%row.points.length]),1e-7)
      }
    }
  }
})

test('bad guide indices, degenerate base and graded guides, invalid topology and size run fail closed',()=>{
  const project=createTemplateProject('tee'),params={pieceId:'front',firstPointIndex:0,secondPointIndex:1}
  const before=structuredClone(project)
  assert.equal(restack(project,{...params,secondPointIndex:0}).reason,'INVALID_GUIDE_INDICES')
  assert.equal(restack(project,{...params,secondPointIndex:999}).reason,'INVALID_GUIDE_INDICES')
  assert.equal(restack(project,{...params,samplesPerEdge:2}).reason,'INVALID_SAMPLE_COUNT')
  assert.equal(restack(project,{...params,pieceId:'absent'}).reason,'INVALID_PIECE_ID')
  const bad=structuredClone(project)
  bad.pieces.find(p=>p.id==='front').points[1]={...bad.pieces.find(p=>p.id==='front').points[0]}
  assert.equal(restack(bad,params).reason,'DEGENERATE_BASE_GUIDE')
  const changed=structuredClone(project)
  changed.grading.sizes[5]='M'
  assert.equal(restack(changed,params).reason,'INVALID_SIZE_RUN')
  const invalid=structuredClone(project)
  invalid.pieces.find(p=>p.id==='front').points[0].x=Infinity
  assert.equal(restack(invalid,params).reason,'INVALID_SOURCE_POINTS')
  assert.deepEqual(project,before)
})
