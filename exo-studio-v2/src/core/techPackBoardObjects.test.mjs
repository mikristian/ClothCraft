import test from 'node:test'
import assert from 'node:assert/strict'
import {boardObjectTransform,boardObjectMove,boardObjectResize} from './techPackBoardObjects.js'
import {createDefaultProject} from '../data/defaultProject.js'
import {techPackSource,TECHPACK_PAGES} from './techPackWorkspaceModel.js'
import {renderTechPackWorkspacePrintHTML} from './techPackWorkspacePrint.js'

test('move and corner scaling persist layout independently of source measurements',()=>{
  assert.deepEqual(boardObjectTransform(),{x:0,y:0,scaleX:1,scaleY:1})
  assert.deepEqual(boardObjectMove({},[0,0]),{x:0,y:0,scaleX:1,scaleY:1})
  assert.deepEqual(boardObjectMove({x:5,y:10,scaleX:1.5,scaleY:1},[10,-3]),{x:15,y:7,scaleX:1.5,scaleY:1})
  const grown=boardObjectResize({},[80,30],[400,100],'se')
  assert.equal(grown.scaleX,1.2)
  assert.equal(grown.scaleY,1.3)
  assert.equal(boardObjectTransform({x:Infinity,scaleX:50}).scaleX,3)
})

test('Illustrator-style side handles resize a single axis and preserve the other',()=>{
  const east=boardObjectResize({scaleX:1,scaleY:1},[45,33],[150,100],'e')
  assert.equal(east.scaleX,1.3)
  assert.equal(east.scaleY,1)
  const north=boardObjectResize({},[15,-20],[150,100],'n')
  assert.equal(north.scaleX,1)
  assert.equal(north.scaleY,1.2)
})

test('authored logo and technical drawing positions carry into printed factory pages',()=>{
  const source=techPackSource(createDefaultProject(),null,false)
  const html=renderTechPackWorkspacePrintHTML(source,{}, {boardObjects:{patterns:{
    'footer-logo':{x:23,y:14,scaleX:1.2,scaleY:.9},drawing:{x:10,y:12,scaleX:1.1,scaleY:1.1},
  }}})
  const index=TECHPACK_PAGES.findIndex(p=>p.id==='patterns')+1
  assert(html.includes(`.sheet:nth-of-type(${index}) .seville-footer{transform:translate(23px,14px) scale(1.2,0.9)`))
  assert(html.includes(`.sheet:nth-of-type(${index}) .drafting{transform:translate(10px,12px) scale(1.1,1.1)`))
})
