import test from 'node:test'
import assert from 'node:assert/strict'
import {printPatternGuideOverlay20261025} from './printPatternGuideOverlay20261025.js'

const piece={id:'front',name:'Front Bodice',originCm:[0,0],widthCm:30,heightCm:40,
  points:[[0,0],[30,0],[30,40],[0,40]]}
const panel={id:'front',name:'Front Bodice'}
const empty={guides:[],dimensions:[]}

test('sparse print outline first vertex fails closed without throwing',()=>{
  const points=[,[30,0],[30,40],[0,40]]
  assert.deepEqual(printPatternGuideOverlay20261025({...piece,points},panel),empty)
})

test('sparse print outline middle vertex fails closed without throwing',()=>{
  const points=[[0,0],[30,0],,[0,40]]
  assert.deepEqual(printPatternGuideOverlay20261025({...piece,points},panel),empty)
})

test('sparse print outline last vertex fails closed without throwing',()=>{
  const points=[[0,0],[30,0],[30,40],]
  points.length=4
  assert.deepEqual(printPatternGuideOverlay20261025({...piece,points},panel),empty)
})

test('valid outline still produces finite, non-mutating print annotations',()=>{
  const snapshot=structuredClone(piece)
  const result=printPatternGuideOverlay20261025(piece,panel)
  assert.ok(result.guides.length>0)
  assert.ok(result.dimensions.length>0)
  assert.ok(result.guides.every(g=>Number.isFinite(g.lengthCm)))
  assert.deepEqual(piece,snapshot)
})
