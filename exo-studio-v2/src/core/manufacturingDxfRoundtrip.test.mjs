import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {gradeProject} from './grading.js'
import {parseDxfPatterns,projectToDxf} from './dxf.js'
import {pieceArea,seamAllowanceBoundary,polygonArea} from './project.js'
import {buildFactoryPackageZip} from './factoryPackage.js'

const source=createTeeTemplate()
const sizes=[...source.grading.sizes]
const make=(size)=>projectToDxf(gradeProject(source,size),size,{cutlineMode:'manufacturing'})
const cmArea=(pieces)=>pieces.reduce((sum,piece)=>sum+pieceArea(piece),0)

test('factory DXFs cannot silently become underspecified editable garments with a second allowance',()=>{
 for(const size of sizes){
  const input=make(size)
  assert.throws(()=>parseDxfPatterns(input),/would double its seam allowance/i,`${size} did not fail closed`)
  assert.throws(()=>parseDxfPatterns(input.replace(/^999\nCUT_LAYER_IS_PHYSICAL_ALLOWANCE_OUTLINE_STITCH_IS_SEWLINE_EXPLICIT_NOTCHES_ONLY\n/m,'')),/would double its seam allowance/i,`${size} did not recognize stripped factory marker`)
 }
})

test('explicit CUT reference preserves physical contour with 0 additional allowance, never fabricates grade or curves',()=>{
 for(const size of sizes){
  const author=gradeProject(source,size)
  const input=make(size)
  const imported=parseDxfPatterns(input,{manufacturingImport:'cut-reference'})
  assert.equal(imported.referenceMode,'cut-reference')
  assert.equal(imported.referenceSize,size)
  assert.equal(imported.factoryCertified,false)
  assert.equal(imported.pieces.length,4)
  const physicalArea=author.pieces.reduce((sum,piece)=>sum+polygonArea(seamAllowanceBoundary(piece,12)),0)
  assert(Math.abs(physicalArea-cmArea(imported.pieces))<.0001)
  assert(imported.pieces.every(piece=>piece.seamAllowance===0&&piece.locked&&piece.active3d===false))
  assert(imported.pieces.every(piece=>piece.patternImportProvenance?.referenceOnly&&piece.patternImportProvenance?.gradedRuleRecovered===false))
  assert(imported.warnings.some(w=>w.includes('notch pairs')))
  assert.throws(()=>buildFactoryPackageZip({id:'reference-only',name:'Cut Reference',pieces:imported.pieces,grading:{sizes:[size],baseSize:size},seams:[],patternSource:{referenceOnly:true}}),/Factory package refused/i)
  assert.throws(()=>projectToDxf({id:'reference-only',name:'Cut Reference',pieces:imported.pieces,grading:{sizes:[size],baseSize:size},seams:[]},size),/DXF export refused/)
 }
})

test('explicit STITCH reference preserves original sewing area without inventing recoverable cutter geometry or notches',()=>{
 for(const size of sizes){
  const graded=gradeProject(source,size)
  const imported=parseDxfPatterns(make(size),{manufacturingImport:'stitch-reference'})
  assert.equal(imported.referenceMode,'stitch-reference')
  assert.equal(imported.pieces.length,4)
  assert(Math.abs(cmArea(imported.pieces)-cmArea(graded.pieces))<.0001)
  assert(imported.pieces.every(p=>p.seamAllowance===0&&p.locked&&p.notches.length===0&&p.patternImportProvenance.originalSeamAllowancesRecovered===false))
  assert(imported.warnings.some(w=>w.includes('physical cut and notches')))
 }
})

test('mismatched CUT/STITCH names, duplicates, open contours, wrong units and wrong import intents reject before replacing any project',()=>{
 const correct=make('M')
 const edits=[
  correct.replaceAll('STITCH_FRONT','STITCH_MISSING_FRONT'),
  correct.replace('0\nPOLYLINE\n8\nSTITCH_FRONT','0\nPOLYLINE\n8\nSTITCH_FRONT_BROKEN'),
  correct.replace('8\nCUT_FRONT_M','8\nCUT_FRONT_XS'),
  correct.replace('9\n$INSUNITS\n70\n4','9\n$INSUNITS\n70\n0'),
 ]
 for(const input of edits.filter(x=>x!==correct)){
  assert.throws(()=>parseDxfPatterns(input,{manufacturingImport:'cut-reference'}))
 }
 assert.throws(()=>parseDxfPatterns(correct,{manufacturingImport:'editable'}),/requires explicit cut-reference or stitch-reference/)
 assert.throws(()=>parseDxfPatterns(projectToDxf(gradeProject(source,'M'),'M'),{manufacturingImport:'cut-reference'}),/requires a DXF with verified physical CUT and STITCH/)
 const markerOnly=correct.replaceAll('STITCH_','REFERENCE_')
 assert.throws(()=>parseDxfPatterns(markerOnly,{manufacturingImport:'cut-reference'}),/requires a DXF with verified physical CUT and STITCH/)
})

test('existing drafting DXF import remains valid and preserves only authored stitch geometry',()=>{
 const draft=projectToDxf(gradeProject(source,'M'),'M')
 const imported=parseDxfPatterns(draft)
 assert.equal(imported.pieces.length,4)
 assert.equal(imported.manufacturingReference,undefined)
 assert(imported.pieces.every(p=>p.locked===false&&p.seamAllowance===1))
 assert(Math.abs(cmArea(imported.pieces)-cmArea(gradeProject(source,'M').pieces))<.0001)
})

test('industrial numeric and extended size labels retain piece names, size and locked reference semantics',()=>{
 const graded=gradeProject(source,'M')
 for(const size of ['4XL','W32_L32','34-36']){
  const dxf=projectToDxf(graded,size,{cutlineMode:'manufacturing'})
  const result=parseDxfPatterns(dxf,{manufacturingImport:'cut-reference'})
  assert.equal(result.referenceSize,size)
  assert.deepEqual(result.pieces.map(p=>p.name),['Front','Back','Left Sleeve','Right Sleeve'])
  assert(result.pieces.every(p=>p.locked===true&&p.patternImportProvenance.referenceOnly))
 }
})
