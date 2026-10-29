import test from 'node:test'
import assert from 'node:assert/strict'
import {parkOpenPenPath,restoreOpenPenPath} from './vectorcraftPenSession20261029.js'

test('Escape parks an intact two-corner contour, leaving next Pen gesture independent',()=>{
  const a=[[0,0],[.2,0]],t=[[0,0],[0,0]]
  const parked=parkOpenPenPath([],a,t,5)
  assert.deepEqual(parked,[{id:5,points:a,tangents:t}])
  assert.notStrictEqual(parked[0].points,a)
  const next=parkOpenPenPath(parked,[[1,1],[1,2],[2,2]],[[0,0],[0,0],[0,0]],6)
  assert.equal(next.length,2)
  assert.deepEqual(next[0].points,a)
  assert.deepEqual(restoreOpenPenPath(next,5,0).points,[[.2,0],[0,0]])
  assert.deepEqual(restoreOpenPenPath(next,5,0).remaining,[next[1]])
  assert.deepEqual(a,[[0,0],[.2,0]])
})

test('only real endpoints can resume a prior contour; bad shape stays untouched',()=>{
  const paths=parkOpenPenPath([],[[0,0],[.1,0],[.1,.1]],[[0,0],[0,0],[0,0]],1)
  assert.equal(restoreOpenPenPath(paths,1,1),null)
  assert.equal(restoreOpenPenPath(paths,99,0),null)
  assert.equal(parkOpenPenPath(paths,[[0,0]],[],2),null)
})
