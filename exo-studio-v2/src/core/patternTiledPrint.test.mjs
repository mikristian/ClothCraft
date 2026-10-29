import {test} from 'node:test'
import assert from 'node:assert/strict'
import {patternTiledPrint} from './patternTiledPrint.js'
const rectangle=(w,h,x=0,y=0)=>[[[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]]]
test('A4 and Letter tiles cover full reference geometry at 1:1 including calibration',()=>{
 for(const format of ['A4','Letter'])for(const [w,h] of [[20,20],[180,200],[190,267],[1000,1000],[2100,660]]){
  const plan=patternTiledPrint(rectangle(w,h,-75,-25),{format,revision:42})
  assert.equal(plan.tiles.length,plan.rows*plan.columns)
  assert.equal(plan.pageCount,plan.tiles.length+1)
  const first=plan.tiles[0],last=plan.tiles.at(-1)
  assert.equal(first.x,-85);assert.equal(first.y,-35)
  assert(last.x+last.width>=-85+Math.max(100,w)+20)
  assert(last.y+last.height>=-35+h+150)
  for(let r=0;r<plan.rows;r++)for(let c=1;c<plan.columns;c++){
   const a=plan.tiles[r*plan.columns+c-1],b=plan.tiles[r*plan.columns+c]
   assert(Math.abs(a.x+a.width-b.x-plan.overlapMm)<1e-9)
   assert(Math.abs(a.x+a.width-plan.overlapMm/2-(b.x+plan.overlapMm/2))<1e-9,'Registration marks must coincide in material space')
  }
  for(let r=1;r<plan.rows;r++){
   const a=plan.tiles[(r-1)*plan.columns],b=plan.tiles[r*plan.columns]
   assert(Math.abs(a.y+a.height-b.y-plan.overlapMm)<1e-9)
  }
  assert.match(plan.html,/width="100" height="100"/)
  assert.match(plan.html,/revision 42/)
 }
})
test('reject invalid page options, excessive tile count and malformed geometry',()=>{
 for(const options of [{format:'A0'},{marginMm:0},{overlapMm:NaN},{overlapMm:30}])assert.throws(()=>patternTiledPrint(rectangle(100,100),options))
 assert.throws(()=>patternTiledPrint(rectangle(9000,9000)),/200 tiles/)
 assert.throws(()=>patternTiledPrint([]))
})
