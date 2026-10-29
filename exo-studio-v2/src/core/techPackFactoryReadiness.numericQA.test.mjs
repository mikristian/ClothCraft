import test from 'node:test'
import assert from 'node:assert/strict'
import {techPackFactoryReadiness} from './techPackFactoryReadiness.js'

const source = () => ({ready:true,panels:[{quantity:1,fabricId:'f1',allowance:1,grain:'lengthwise'}],
  fabrics:[{id:'f1',composition:'Cotton',gsm:180}],pom:{front:[{cm:40,toleranceCm:0.5}]}})

test('factory techpack POM validation rejects negative values instead of treating finite numbers as approved',()=>{
  const invalid=techPackFactoryReadiness({...source(),pom:{front:[{cm:-40,toleranceCm:-0.5}]}})
  assert(invalid.missing.some(item=>item.id==='pom'))
  const valid=techPackFactoryReadiness(source())
  assert(!valid.missing.some(item=>item.id==='pom'))
  assert(valid.review.some(item=>item.id==='sample-review'))
})

test('factory techpack fabric GSM must be physically positive finite numeric value',()=>{
  for(const gsm of ['n/a',0,-5,Infinity]){
    const invalid=techPackFactoryReadiness({...source(),fabrics:[{id:'f1',composition:'Cotton',gsm}]})
    assert(invalid.missing.some(item=>item.id==='fabric-spec'),String(gsm))
  }
  const valid=techPackFactoryReadiness(source())
  assert(!valid.missing.some(item=>item.id==='fabric-spec'))
})

test('unknown source readiness does not falsely pass the factory source gate',()=>{
  const {ready,...unknown}=source()
  assert(techPackFactoryReadiness(unknown).missing.some(item=>item.id==='source'))
  assert(!techPackFactoryReadiness(source()).missing.some(item=>item.id==='source'))
})

test('cutting quantities must be positive whole pieces and seam allowance finite and nonnegative',()=>{
  for(const quantity of [0,-1,1.5,'not counted',Infinity]){
    const invalid=techPackFactoryReadiness({...source(),panels:[{quantity,fabricId:'f1',allowance:1,grain:'lengthwise'}]})
    assert(invalid.missing.some(item=>item.id==='cutlist'),`bad cut count ${quantity}`)
  }
  for(const allowance of [-1,'unknown',NaN,Infinity]){
    const invalid=techPackFactoryReadiness({...source(),panels:[{quantity:1,fabricId:'f1',allowance,grain:'lengthwise'}]})
    assert(invalid.missing.some(item=>item.id==='cutlist'),`bad allowance ${allowance}`)
  }
  const valid=techPackFactoryReadiness({...source(),panels:[{quantity:2,fabricId:'f1',allowance:0,grain:'lengthwise'}]})
  assert(!valid.missing.some(item=>item.id==='cutlist'))
})

test('factory cut pieces must reference a fabric present in the actual material inventory',()=>{
  const missing = techPackFactoryReadiness({...source(),panels:[{quantity:1,fabricId:'ghost',allowance:1,grain:'lengthwise'}]})
  assert(missing.missing.some(item=>item.id==='fabric-links'))
  const valid = techPackFactoryReadiness(source())
  assert(!valid.missing.some(item=>item.id==='fabric-links'))
})

test('factory label and packaging quantity rows reject fractional and negative counts without hiding review',()=>{
  const base = {name:'Size label',type:'woven',placement:'back neck',instructions:'Sew into neck seam'}
  for(const quantity of [-1,0,1.5,'unknown']){
    const review=techPackFactoryReadiness(source(),{labels:[{...base,quantity}],packaging:[{...base,quantity}]})
    assert(review.missing.some(item=>item.id==='labels'),`label ${quantity}`)
    assert(review.missing.some(item=>item.id==='packaging'),`packaging ${quantity}`)
    const tableRow={id:'label',cells:['Neck Label','Woven','Back neck','Cotton',quantity,'Sew into neck seam']}
    const tableReview=techPackFactoryReadiness(source(),{}, {extraRows:{labels:[tableRow],packaging:[tableRow]}})
    assert(tableReview.missing.some(item=>item.id==='labels'),`table label ${quantity}`)
    assert(tableReview.missing.some(item=>item.id==='packaging'),`table packaging ${quantity}`)
  }
  const correct=techPackFactoryReadiness(source(),{labels:[{...base,quantity:1}],packaging:[{...base,quantity:2}]})
  assert(!correct.missing.some(item=>item.id==='labels'||item.id==='packaging'))
  assert(correct.review.some(item=>item.id==='sample-review'))
})

test('source-linked spreadsheet revision must be knowable before export',()=>{
  const table={columns:[{id:'name'}],sourceRevision:7,rows:[{cells:{name:{value:'Zipper',sourceRevision:7}}}]}
  const workspace={pageBoxes:{materials:[{id:'materials-1',height:200,slot:{spreadsheetTable:table}}]}}
  const unknown=techPackFactoryReadiness(source(),{},workspace)
  assert(unknown.review.some(item=>item.id==='stale-table-materials-materials-1'))
  assert(unknown.review.some(item=>item.id==='table-cells-materials-materials-1'))
  const exact=techPackFactoryReadiness({...source(),revision:7},{},workspace)
  assert(!exact.review.some(item=>item.id==='stale-table-materials-materials-1'))
  assert(!exact.review.some(item=>item.id==='table-cells-materials-materials-1'))
})
