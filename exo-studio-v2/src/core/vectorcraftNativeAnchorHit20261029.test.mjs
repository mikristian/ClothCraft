import test from 'node:test'
import assert from 'node:assert/strict'
import {nativePatternAnchorAt} from './vectorcraftNativeAnchorHit20261029.js'

const panel=(id,layout,points,rotation=0)=>({panel:{id,layout_rotation_degrees:rotation,polygon:{points}},range:{layout}})

test('retargeted SVG double-click picks nearby panel anchor instead of stale selection',()=>{
  const panels=[panel('selected',[0,0],[[0,0],[.1,0]]),panel('clicked',[.5,.2],[[0,0],[.1,0]])]
  const hit=nativePatternAnchorAt(panels,[.6,.2],.012,{preferredPanelId:'selected'})
  assert.equal(hit?.panel.id,'clicked')
  assert.equal(hit?.index,1)
  assert.equal(nativePatternAnchorAt(panels,[.8,.8],.012),null)
})

test('anchor hit uses rotated display coordinates and prefers target panel on exact overlap',()=>{
  const panels=[panel('base',[0,0],[[0,.1]]),panel('rotated',[0,0],[[.1,0]],90)]
  const hit=nativePatternAnchorAt(panels,[0,.1],.001,{preferredPanelId:'rotated'})
  assert.equal(hit?.panel.id,'rotated')
  assert.equal(hit?.index,0)
  assert.equal(nativePatternAnchorAt(panels,[NaN,0],.01),null)
  assert.equal(nativePatternAnchorAt(panels,[0,.1],0),null)
})
