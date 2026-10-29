import test from 'node:test'
import assert from 'node:assert/strict'
import {parseNativeRollDefects20261029 as parse,
  prepareNativeSinglePlyRollStudy20261029 as prepare}
  from './nativeSinglePlyRollReview20261029.js'

const source={revision:8,sizes:['S','M'],panels:[
  {id:'front',sourceFabricId:'shell'},
  {id:'lining',sourceFabricId:'lining'},
]}
const order={expectedRevision:8,materialsByPanel:{
  front:{fabricId:'shell',groupId:'shell-group'},
  lining:{fabricId:'lining',groupId:'lining-group'},
},quantitiesBySize:{S:{front:1,lining:2},M:{front:2,lining:1}}}
const entries=()=>({
  shell:{rollId:'SHELL-01',usableWidthCm:'150',availableLengthCm:'500',
    endLossCm:'2',shadeId:'BLACK',dyeLotId:'LOT-A',batchId:'BATCH-1',
    defects:'0-5, 50-52'},
  lining:{rollId:'LINING-01',usableWidthCm:'150',availableLengthCm:'500',
    endLossCm:'1',shadeId:'WHITE',dyeLotId:'LOT-B',batchId:'BATCH-2',
    defects:'none'},
})
test('operator roll declarations retain units, shade/lot, group, exact sizes and explicit defects',()=>{
  const input=entries()
  const original=JSON.stringify(input)
  const result=prepare(source,order,input)
  assert.equal(result.rollsById['SHELL-01'].groupId,'shell-group')
  assert.equal(result.rollsById['SHELL-01'].availableLengthCm,500)
  assert.deepEqual(result.defectsByRoll['SHELL-01'],[
    {startCm:0,endCm:5},{startCm:50,endCm:52}])
  assert.deepEqual(result.defectsByRoll['LINING-01'],[])
  assert.deepEqual(Object.keys(result.assignmentsBySize),['S','M'])
  assert.deepEqual(result.assignmentsBySize.M.lining,{rollId:'LINING-01',endLossCm:1})
  assert.equal(JSON.stringify(input),original)
})
test('malformed defect intervals, unbounded measurements and stale order identity fail closed',()=>{
  for(const bad of ['-2','0-0','5-2','0-5,4-6','abc','NaN-1','1e3-5000','']){
    assert.throws(()=>parse(bad),/INVALID_DECLARED_ROLL_DEFECTS|OVERLAPPING_DECLARED_ROLL_DEFECTS|EXPLICIT_ROLL_DEFECT_DECLARATION_REQUIRED/)
  }
  for(const key of ['usableWidthCm','availableLengthCm','endLossCm']){
    for(const value of ['','-1','NaN','Infinity','150cm','1e4']){
      const changed=entries()
      changed.shell[key]=value
      assert.throws(()=>prepare(source,order,changed),/INVALID_DECLARED_ROLL_MEASUREMENT/)
    }
  }
  const missing=entries();delete missing.lining
  assert.throws(()=>prepare(source,order,missing),/NATIVE_ROLL_REVIEW_INCOMPLETE_FABRICS/)
  const blank=entries();blank.lining.defects=''
  assert.throws(()=>prepare(source,order,blank),/EXPLICIT_ROLL_DEFECT_DECLARATION_REQUIRED/)
  const duplicate=entries();duplicate.lining.rollId='SHELL-01'
  assert.throws(()=>prepare(source,order,duplicate),/NATIVE_ROLL_REVIEW_ROLL_IDENTITY/)
  assert.throws(()=>prepare(source,{...order,expectedRevision:7},entries()),
    /NATIVE_ROLL_REVIEW_STALE_SOURCE/)
  const shortQty=structuredClone(order);delete shortQty.quantitiesBySize.M.front
  assert.throws(()=>prepare(source,shortQty,entries()),
    /NATIVE_ROLL_REVIEW_PHYSICAL_CUT_QUANTITY_MISMATCH/)
  const zeroQty=structuredClone(order);zeroQty.quantitiesBySize.S.front=0
  assert.throws(()=>prepare(source,zeroQty,entries()),
    /NATIVE_ROLL_REVIEW_PHYSICAL_CUT_QUANTITY_MISMATCH/)
  const grouped={...order,materialsByPanel:{
    ...order.materialsByPanel,lining:{fabricId:'shell',groupId:'DIFFERENT'},
  }}
  assert.throws(()=>prepare(source,grouped,entries()),/NATIVE_ROLL_REVIEW_MATERIAL_MISMATCH/)
})
