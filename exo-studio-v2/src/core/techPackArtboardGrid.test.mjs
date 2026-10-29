import test from 'node:test';import assert from 'node:assert/strict'
import {snapArtboardCoordinate,snapArtboardObject,alignArtboardBox} from './techPackArtboardGrid.js'
test('artboard snap is optional and changes only presentation position',()=>{
 const data={x:19.7,y:25.3,scaleX:1.3,scaleY:.8,sourceRevision:7}
 assert.deepEqual(snapArtboardObject(data,8,true),{...data,x:16,y:24})
 assert.deepEqual(snapArtboardObject(data,8,false),data)
 assert.equal(snapArtboardCoordinate(61,8),64)
 assert.deepEqual(data,{x:19.7,y:25.3,scaleX:1.3,scaleY:.8,sourceRevision:7})
})
test('align to Letter landscape page edges without changing dimensions or arbitrary content',()=>{
 const box={id:'POM',x:43,y:37,width:170,height:90,note:'Never change POM'}
 assert.equal(alignArtboardBox(box,'center',792,612).x,311)
 assert.equal(alignArtboardBox(box,'middle',792,612).y,261)
 assert.equal(alignArtboardBox(box,'right',792,612).x,622)
 assert.equal(alignArtboardBox(box,'bottom',792,612).y,522)
 assert.equal(alignArtboardBox(box,'left',792,612).note,box.note)
 assert.equal(box.x,43)
})
