import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {gradeProject} from './grading.js'
import {projectToDxf} from './dxf.js'
import {inspectCutlinePolygon} from './cutlineTopology.js'
import {inspectGradedCutlines} from './industrialCutlineQA.js'
import {seamAllowanceBoundary,samplePieceBoundary} from './project.js'

test('Foundation Tee has 24 closed physical cutlines across graded XS–XXL with area beyond sewing line',()=>{
 const p=createTeeTemplate(),source=structuredClone(p)
 const result=inspectGradedCutlines(p)
 assert.equal(result.blockers,0,JSON.stringify(result.issues))
 assert.equal(result.checks.length,24)
 assert(result.checks.every(x=>x.hasAllowance&&x.cutlinePass&&x.additionalCutAreaCm2>25))
 assert.equal(result.factoryCertified,false)
 assert.deepEqual(p,source)
})

test('manufacturing CUT is physical allowance outline; STITCH is authored sewline; legacy mapping unchanged',()=>{
 const project=createTeeTemplate(),graded=gradeProject(project,'M')
 const manufactured=projectToDxf(graded,'M',{cutlineMode:'manufacturing'})
 const old=projectToDxf(graded,'M')
 assert.match(manufactured,/CUT_LAYER_IS_PHYSICAL_ALLOWANCE_OUTLINE_STITCH_IS_SEWLINE/)
 assert.match(manufactured,/STITCH_FRONT/)
 assert(!manufactured.includes('SA_FRONT'))
 assert.match(old,/DRAFTING_LEGACY_CUT_IS_SEWLINE_SA_IS_ALLOWANCE_OUTLINE/)
 assert.match(old,/SA_FRONT/)
 assert(!old.includes('STITCH_FRONT'))
 assert.throws(()=>projectToDxf(graded,'M',{cutlineMode:'unknown'}),/unsupported DXF cutline mode/i)
})

test('manufacturing CUT refuses crossed contours, degenerate points and nonfinite cut geometry',()=>{
 const bowtie=[{x:0,y:0},{x:10,y:10},{x:0,y:10},{x:10,y:0}]
 assert(inspectCutlinePolygon(bowtie).faults.some(x=>x.code==='CUTLINE_SELF_INTERSECTION'))
 const touching=[{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:5,y:0},{x:0,y:10}]
 assert(inspectCutlinePolygon(touching).faults.some(x=>x.code==='CUTLINE_SELF_INTERSECTION'))
 assert(!inspectCutlinePolygon([{x:0,y:0},{x:1,y:0},{x:1,y:0},{x:0,y:1}]).ok)
 assert(!inspectCutlinePolygon([{x:0,y:0},{x:NaN,y:1},{x:1,y:0}]).ok)
 const project=createTeeTemplate(),graded=gradeProject(project,'M')
 graded.pieces[0].points=[...bowtie]
 graded.pieces[0].curves={}
 assert.throws(()=>projectToDxf(graded,'M',{cutlineMode:'manufacturing'}),/unsafe factory CUT/i)
})

test('per-size cut areas agree with independently computed source seam allowance boundaries',()=>{
 const project=createTeeTemplate()
 const qa=inspectGradedCutlines(project)
 for(const size of project.grading.sizes){
  const graded=gradeProject(project,size)
  for(const piece of graded.pieces){
   const cut=inspectCutlinePolygon(seamAllowanceBoundary(piece,12))
   const stitch=inspectCutlinePolygon(samplePieceBoundary(piece,12).points)
   const row=qa.checks.find(x=>x.size===size&&x.pieceId===piece.id)
   assert(cut.ok&&stitch.ok)
   assert(Math.abs(cut.areaCm2-row.cutAreaCm2)<1e-7)
   assert(Math.abs(stitch.areaCm2-row.stitchAreaCm2)<1e-7)
  }
 }
})
