import test from 'node:test'
import assert from 'node:assert/strict'
import {resolveCustomToolbarDock20261028,EXO_CUSTOM_TOOLBAR_DOCKS_20261028} from './customToolbarDockGeometry20261028.js'

const workspace={left:200,top:100,width:1000,height:700}
test('four edge zones activate independently and center releases to floating',()=>{
 const point=(x,y)=>resolveCustomToolbarDock20261028(workspace,x,y)
 assert.deepEqual(EXO_CUSTOM_TOOLBAR_DOCKS_20261028,['left','right','top','bottom'])
 assert.equal(point(215,475),'left')
 assert.equal(point(1185,475),'right')
 assert.equal(point(700,110),'top')
 assert.equal(point(700,785),'bottom')
 assert.equal(point(700,470),null)
 assert.equal(point(50,50),null)
})
test('visible side panels accept drop beyond the central editor',()=>{
 const panels={left:{left:100,top:100,width:90,height:700},right:{left:1200,top:100,width:250,height:700}}
 assert.equal(resolveCustomToolbarDock20261028(workspace,140,300,panels),'left')
 assert.equal(resolveCustomToolbarDock20261028(workspace,1300,300,panels),'right')
 assert.equal(resolveCustomToolbarDock20261028(workspace,700,300,panels),null)
})
test('non-finite coordinates or invalid geometry never trigger a drop',()=>{
 assert.equal(resolveCustomToolbarDock20261028(null,50,50),null)
 assert.equal(resolveCustomToolbarDock20261028(workspace,NaN,300),null)
 assert.equal(resolveCustomToolbarDock20261028({...workspace,width:0},300,400),null)
})
