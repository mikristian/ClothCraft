import test from 'node:test'
import assert from 'node:assert/strict'
import {isExoBottomDockHit20261027,setExoBottomDockHover20261027,getExoBottomDockInsertIndex20261028,requestExoBottomDockInsert20261028} from './exoBottomDockGeometry20261027.js'

const root={x:330,y:40,width:930,height:970}
const emptyHost={x:330,y:990,width:930,height:0}
const openHost={x:330,y:780,width:930,height:210}

test('Notion-like insertion line accepts pointer near the bottom, not middle of pattern canvas',()=>{
 assert.equal(isExoBottomDockHit20261027(root,emptyHost,780,978),true)
 assert.equal(isExoBottomDockHit20261027(root,emptyHost,780,730),false)
 assert.equal(isExoBottomDockHit20261027(root,emptyHost,310,978),false)
 assert.equal(isExoBottomDockHit20261027(root,emptyHost,1264,978),false)
})
test('already-occupied bottom strip accepts another widget, without accepting sidebar drops',()=>{
 assert.equal(isExoBottomDockHit20261027(root,openHost,740,825),true)
 assert.equal(isExoBottomDockHit20261027(root,openHost,740,974),true)
 assert.equal(isExoBottomDockHit20261027(root,openHost,740,650),false)
})
test('invalid or missing native workspace geometry rejects closed',()=>{
 assert.equal(isExoBottomDockHit20261027(null,emptyHost,700,999),false)
 assert.equal(isExoBottomDockHit20261027(root,null,700,999),false)
 assert.equal(isExoBottomDockHit20261027({...root,height:80},emptyHost,700,999),false)
 assert.equal(isExoBottomDockHit20261027(root,emptyHost,NaN,999),false)
})
test('highlight state toggles only real target without creating a fake docking receipt',()=>{
 const host={dataset:{}}
 setExoBottomDockHover20261027(host,true)
 assert.equal(host.dataset.exoGradeDockDragHover,'true')
 setExoBottomDockHover20261027(host,false)
 assert.equal(host.dataset.exoGradeDockDragHover,'false')
 setExoBottomDockHover20261027(null,true)
})
test('hovering each side of an existing panel selects distinct insertion positions',()=>{
 const panel={getAttribute:()=> 'compare',getBoundingClientRect:()=>({left:420,width:500})}
 const host={querySelectorAll:()=>[panel]}
 assert.equal(getExoBottomDockInsertIndex20261028(host,490,'values'),0)
 assert.equal(getExoBottomDockInsertIndex20261028(host,830,'values'),1)
 assert.equal(getExoBottomDockInsertIndex20261028(host,null,'values'),1)
 assert.equal(getExoBottomDockInsertIndex20261028(host,500,'compare'),0)
})
test('requesting insertion preserves the selected side in the host event',()=>{
 const events=[]
 const panel={getAttribute:()=> 'values',getBoundingClientRect:()=>({left:0,width:400})}
 const host={
  querySelectorAll:()=>[panel],
  ownerDocument:{defaultView:{CustomEvent:class{constructor(type,init){this.type=type;this.detail=init.detail}}}},
  dispatchEvent:event=>events.push(event),
 }
 assert.equal(requestExoBottomDockInsert20261028(host,'compare',100),true)
 assert.equal(events[0].type,'exo-bottom-dock-insert')
 assert.deepEqual(events[0].detail,{id:'compare',index:0})
 assert.equal(requestExoBottomDockInsert20261028(host,'compare',390),true)
 assert.deepEqual(events[1].detail,{id:'compare',index:1})
})
