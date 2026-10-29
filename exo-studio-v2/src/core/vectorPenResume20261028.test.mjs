import test from 'node:test'
import assert from 'node:assert/strict'
import {resumePausedPenFromAnchor} from './vectorPenResume20261028.js'
test('Escape resume at last 90-degree corner preserves all vertices',()=>{
 const points=[[0,0],[.08,0],[.08,.09]],tangents=points.map(()=>[0,0])
 const original=JSON.stringify(points)
 const resumed=resumePausedPenFromAnchor(points,tangents,2)
 assert.deepEqual(resumed.points,points);assert.equal(resumed.selected,2)
 assert.equal(JSON.stringify(points),original)
})
test('resume at starting corner reverses direction and cubic derivative signs, no deleted points',()=>{
 const points=[[0,0],[.08,0],[.08,.09]],tangents=[[.01,0],[0,.02],[0,0]]
 assert.deepEqual(resumePausedPenFromAnchor(points,tangents,0),{points:[[.08,.09],[.08,0],[0,0]],tangents:[[0,0],[0,-.02],[-.01,0]],selected:2})
})
test('interior and invalid anchors fail closed',()=>{
 const p=[[0,0],[.08,0],[.08,.09]],t=p.map(()=>[0,0])
 assert.equal(resumePausedPenFromAnchor(p,t,1),null)
 assert.equal(resumePausedPenFromAnchor(p,[],0),null)
 assert.equal(resumePausedPenFromAnchor(p,t,22),null)
})
