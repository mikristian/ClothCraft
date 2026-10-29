// Standalone baseline acceptance for production vertex-deletion remapping.
// Works for the existing JS path and remains applicable when Rust owns the
// numerical edge-index calculation. No persistent documents are edited.
import assert from 'node:assert/strict'
import {deletedPointEdgeIndex,planDraftPointDeletion} from '../src/core/draftingPointDeletion.js'

let cases=0
for(let count=4;count<=120;count++)for(let selected=0;selected<count;selected++){
  const previous=(selected-1+count)%count
  const remaining=[]
  for(let edge=0;edge<count;edge++){
    const actual=deletedPointEdgeIndex(edge,selected,count)
    if(edge===selected||edge===previous){
      assert.equal(actual,null,`adjacent edge ${edge} must be excluded; selected=${selected}`)
    }else{
      const expected=selected===0?edge-1:edge>selected?edge-1:edge
      assert.equal(actual,expected,`edge=${edge}, selected=${selected}, count=${count}`)
      remaining.push(actual)
    }
    cases++
  }
  assert.equal(new Set(remaining).size,count-2,'unique surviving edge indices')
}
for(const invalid of [-5,-1,NaN,Infinity,1.5])assert.equal(deletedPointEdgeIndex(invalid,1,5),null)

const mkPiece=()=>({
  id:'front',points:[
    {x:0,y:0,id:'A'}, {x:5,y:0,id:'B'}, {x:10,y:0,id:'C'},
    {x:10,y:10,id:'D'}, {x:0,y:10,id:'E'},
  ],
  curves:{3:{cx:5,cy:12}},
  notches:[],topstitches:[],bindings:[],zippers:[],
})
const source=mkPiece()
const snapshot=structuredClone(source)
const plan=planDraftPointDeletion(source,1)
assert.deepEqual(source,snapshot,'planning cannot mutate authoring state')
assert.deepEqual(plan.points.map(p=>p.id),['A','C','D','E'])
assert.deepEqual(plan.curves,{2:{cx:5,cy:12}})
for(const collection of ['notches','topstitches','bindings','zippers']){
  const fixture=mkPiece()
  fixture[collection]=[{edgeIndex:1}]
  assert.throws(()=>planDraftPointDeletion(fixture,1))
}
console.log(JSON.stringify({pass:true,numericEdgeCases:cases,
  preventedAdjacentEdits:4,sourceMutation:false}))
