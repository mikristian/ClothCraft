import test from 'node:test'
import assert from 'node:assert/strict'
import {
 getExoBottomDockInsertIndex20261028,
 requestExoBottomDockInsert20261028,
 setExoBottomDockHover20261027,
} from './exoBottomDockGeometry20261027.js'

const node=(name,left,width)=>({
 getAttribute:key=>key==='data-exo-grade-bottom-widget'?name:null,
 getBoundingClientRect:()=>({left,width}),
})
const createHost=()=>{
 const children=[node('values',100,310),node('compare',415,490)]
 const attrs={}
 const styles={}
 let emitted=null
 class FakeEvent{constructor(type,init){this.type=type;this.detail=init.detail}}
 const host={
  dataset:attrs,
  style:{setProperty:(key,value)=>{styles[key]=value},removeProperty:key=>delete styles[key]},
  querySelectorAll:()=>children,
  getBoundingClientRect:()=>({left:100,width:805,height:158}),
  ownerDocument:{defaultView:{CustomEvent:FakeEvent}},
  dispatchEvent:event=>{emitted=event;return true},
 }
 return {host,attrs,styles,get emitted(){return emitted}}
}

test('hover chooses before, between and after existing docked widgets',()=>{
 const {host}=createHost()
 assert.equal(getExoBottomDockInsertIndex20261028(host,120),0)
 assert.equal(getExoBottomDockInsertIndex20261028(host,400),1)
 assert.equal(getExoBottomDockInsertIndex20261028(host,870),2)
 assert.equal(getExoBottomDockInsertIndex20261028(host,250,'values'),0)
})

test('hover renders distinct preview slots and pointer drop requests the same index',()=>{
 const fixture=createHost()
 const {host,attrs,styles}=fixture
 setExoBottomDockHover20261027(host,true,'Grading Table',160,'values')
 assert.equal(attrs.exoDockPreviewPosition,'1/2')
 const firstLeft=styles['--exo-dock-preview-left']
 setExoBottomDockHover20261027(host,true,'Grading Table',850,'values')
 assert.equal(attrs.exoDockPreviewPosition,'2/2')
 assert.notEqual(styles['--exo-dock-preview-left'],firstLeft)
 assert.equal(requestExoBottomDockInsert20261028(host,'values',850),true)
 assert.equal(fixture.emitted.type,'exo-bottom-dock-insert')
 assert.deepEqual(fixture.emitted.detail,{id:'values',index:1})
 setExoBottomDockHover20261027(host,false)
 assert.equal(attrs.exoGradeDockDragHover,'false')
 assert.equal(styles['--exo-dock-preview-left'],undefined)
})
