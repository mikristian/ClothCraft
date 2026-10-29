import test from 'node:test'
import assert from 'node:assert/strict'
import {validateAccuMarkMaterialRepeatQA as validate} from './accumarkMaterialRepeatQA20261024.js'

const square=[{x:0,y:0},{x:2,y:0},{x:2,y:2},{x:0,y:2}]
const mk=(x,y,pieceId,instance=0,rotationDeg=0)=>({pieceId,instance,size:'M',x,y,rotationDeg,outline:square.map(p=>({x:p.x+x,y:p.y+y}))})
function fixture(){
  return {
    project:{pieces:[{id:'front',cutQuantity:1,marker:{nap:'one-way'}},{id:'back',cutQuantity:1,marker:{nap:'one-way'}}]},
    nesting:{ok:true,placements:[mk(0,0,'front'),mk(10,10,'back')],unplaced:[],errors:[]},
    fabricWidthCm:30,repeatCm:{x:10,y:10},toleranceCm:0.001,
    sourcesByPieceId:{
      front:{cutline:square,anchor:{x:1,y:1},group:'body',size:'M',shade:'A',nap:'one-way',grainAngleDeg:0,cutQuantity:1},
      back:{cutline:square,anchor:{x:1,y:1},group:'body',size:'M',shade:'A',nap:'one-way',grainAngleDeg:0,cutQuantity:1},
    },quantitiesBySize:{M:1},shadeZones:[{shade:'A',minY:0,maxY:100}],
  }
}
const codes=result=>result.issues.map(x=>x.code)
test('accepted matching physical repeat validates only QA',()=>{
  const result=validate(fixture())
  assert.equal(result.ok,true,JSON.stringify(result.issues))
  assert.equal(result.manufacturingApproved,false)
  assert.equal(result.cuttingAuthorized,false)
  assert.equal(result.registration.length,2)
})
test('mismatched stripe offset blocks with specific piece',()=>{
  const args=fixture();args.nesting.placements[1]=mk(11,10,'back')
  const result=validate(args)
  assert.ok(codes(result).includes('REPEAT_REGISTRATION_MISMATCH'))
  assert.equal(result.issues.find(i=>i.code==='REPEAT_REGISTRATION_MISMATCH').pieceId,'back')
})
test('source cutline and anchor cannot be inferred from translated marker alone',()=>{
  const args=fixture();args.sourcesByPieceId.back.cutline=[...square.slice(0,3),{x:0,y:3}]
  assert.ok(codes(validate(args)).includes('SOURCE_GEOMETRY_MISMATCH'))
  delete args.sourcesByPieceId.back.anchor
  assert.ok(codes(validate(args)).includes('INVALID_SOURCE_REGISTRATION'))
})
test('one-way nap forbids reversed source grain',()=>{
  const args=fixture();args.nesting.placements[1].rotationDeg=180
  assert.ok(codes(validate(args)).includes('GRAIN_OR_NAP'))
})
test('same plaid group across shade identifiers is blocked',()=>{
  const args=fixture();args.sourcesByPieceId.back.shade='B'
  args.shadeZones.push({shade:'B',minY:10,maxY:100})
  assert.ok(codes(validate(args)).includes('REGISTRATION_SHADE_MISMATCH'))
})
test('claimed accepted nest with overlapping cutlines fails closed',()=>{
  const args=fixture();args.nesting.placements[1]=mk(0,0,'back')
  assert.ok(codes(validate(args)).includes('POLYGON_OVERLAP'))
})
test('shade-zone crossing and narrow fabric are blocked',()=>{
  const args=fixture();args.shadeZones=[{shade:'A',minY:0,maxY:11}]
  assert.ok(codes(validate(args)).includes('SHADE_ZONE_MISMATCH'))
  args.shadeZones=[{shade:'A',minY:0,maxY:100}];args.fabricWidthCm=11
  assert.ok(codes(validate(args)).includes('FABRIC_BOUNDS'))
})
test('on-fold marker is blocked despite claimed verification',()=>{
  const args=fixture();args.project.pieces[0].cutOnFold=true
  assert.ok(codes(validate(args)).includes('FOLD_LAYOUT_UNVERIFIED'))
  delete args.project.pieces[0].cutOnFold;args.sourcesByPieceId.front.foldVerified=true
  assert.ok(codes(validate(args)).includes('FOLD_LAYOUT_UNVERIFIED'))
})
test('graded per-size cut count rejects omitted and duplicated pieces',()=>{
  const args=fixture();args.project.pieces[0].cutQuantity=2;args.sourcesByPieceId.front.cutQuantity=2
  assert.ok(codes(validate(args)).includes('SIZE_CUT_COUNT_MISMATCH'))
  args.project.pieces[0].cutQuantity=1;args.sourcesByPieceId.front.cutQuantity=1
  args.nesting.placements.push(mk(20,20,'front',0))
  assert.ok(codes(validate(args)).includes('INVALID_PLACEMENT_ID'))
})
test('missing verified nesting, unpaired groups, invalid repeat, ambiguous shade blocked',()=>{
  const args=fixture();args.nesting.ok=false
  assert.ok(codes(validate(args)).includes('UNVERIFIED_NESTING'))
  args.nesting.ok=true;args.sourcesByPieceId.back.group='sleeve'
  assert.ok(codes(validate(args)).includes('UNPAIRED_REGISTRATION_GROUP'))
  args.sourcesByPieceId.back.group='body';args.repeatCm.x=0
  assert.ok(codes(validate(args)).includes('INVALID_REPEAT'))
  args.repeatCm.x=10;args.shadeZones.push({shade:'A',minY:0,maxY:100})
  assert.ok(codes(validate(args)).includes('SHADE_ZONE_MISMATCH'))
})
