import test from 'node:test'
import assert from 'node:assert/strict'
import {parseAccuMarkCutRoomRolls20261029} from './accumarkCutRoomRollParser20261029.js'
const opts={fabricId:'main',nap:true,widthCm:150}

test('legacy five-column inventory retains normal roll allocations',()=>{
 const rolls=parseAccuMarkCutRoomRolls20261029('ROLL-01,BATCH-01,SHADE-A,3000,5',opts)
 assert.deepEqual(rolls,[{rollId:'ROLL-01',batchId:'BATCH-01',shade:'SHADE-A',
   usableLengthCm:3000,costPerMeter:5,fabricId:'main',nap:true,widthCm:150}])
})
test('extended inventory explicitly carries dye lot, ply cap and segmented unusable fabric',()=>{
 const rolls=parseAccuMarkCutRoomRolls20261029(
   'A,B1,blue,600,9,LOT-10,4,110-120|390-406\nB,B2,blue,900,10,LOT-10,2,',opts)
 assert.deepEqual(rolls[0].defectRangesCm,[{startCm:110,endCm:120},{startCm:390,endCm:406}])
 assert.equal(rolls[0].dyeLotId,'LOT-10')
 assert.equal(rolls[0].maxPlyCount,4)
 assert.equal(rolls[1].maxPlyCount,2)
 assert(!Object.hasOwn(rolls[1],'defectRangesCm'))
})
test('bad columns and unparseable intervals fail instead of silently ignoring factory declarations',()=>{
 for(const s of ['', 'A,B,C,20','A,B,C,,5','A,B,C,20,2,L,2,10..12',
   'A,B,C,20,2,L,2,10-','A,B,C,20,2,L,2,3-4,unexpected']){
   assert.throws(()=>parseAccuMarkCutRoomRolls20261029(s,opts),Error)
 }
})
