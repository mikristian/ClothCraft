import test from 'node:test'
import assert from 'node:assert/strict'
import { validateSeamAllowanceEdit20261025 as allowance, validateNotchEdit20261025 as notch, proposeMatchedSeamNotch20261025 as match } from './seamNotchPrecision20261025.js'

const rect = id => ({ id, points: [{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:0,y:10}], notches: [], seamAllowance:1 })
const n = (t=.3) => ({id:'mark',edgeIndex:0,t,type:'single',depthCm:.4})
const setup = (reverseB=false) => ({ pieces:[rect('a'),rect('b')], seam:{id:'s',a:{pieceId:'a',edgeIndex:0},b:{pieceId:'b',edgeIndex:0},reverseB} })

test('allowances use physical centimeters and reject invalid input', () => {
  const p=rect('a')
  assert.deepEqual(allowance(p,0,1.25),{ok:true,widthCm:1.25,previousWidthCm:1})
  for(const val of [-1,9,NaN,Infinity,'1.2']) assert.equal(allowance(p,0,val).ok,false)
  for(const edge of [-1,4,1.2]) assert.equal(allowance(p,edge,1).code,'INVALID_EDGE')
})

test('notch guards boundary and duplicate physical spacing', () => {
  const p=rect('a')
  for(const t of [0,1,-.1,1.1,NaN]) assert.equal(notch(p,n(t)).ok,false)
  assert.equal(notch(p,n(.0001)).code,'NOTCH_TOO_CLOSE_TO_ENDPOINT')
  assert.equal(notch(p,n(.3)).ok,true)
  p.notches=[n(.3)]
  assert.equal(notch(p,{...n(.303),id:'second'}).code,'DUPLICATE_OR_OVERLAPPING_NOTCH')
  assert.equal(notch(p,{...n(.5),type:'triple'}).code,'INVALID_NOTCH_TYPE')
})

test('match respects reversed sew order and does not modify original', () => {
  for(const reverse of [false,true]) {
    const {pieces,seam}=setup(reverse)
    const before=structuredClone(pieces)
    const r=match({pieces},seam,n(.3))
    assert.equal(r.ok,true)
    assert(Math.abs(r.notch.t-(reverse?.7:.3))<1e-9)
    assert.deepEqual(pieces,before)
  }
})

test('partial sewing maps only within interval and rejects reversed ranges', () => {
  const {pieces,seam}=setup()
  seam.a.startT=.2;seam.a.endT=.8
  seam.b.startT=.2;seam.b.endT=.8
  assert.equal(match({pieces},seam,n(.5)).ok,true)
  assert.equal(match({pieces},seam,n(.1)).code,'NOTCH_OUTSIDE_SEAM_INTERVAL')
  seam.b.startT=.9
  assert.equal(match({pieces},seam,n(.5)).code,'INVALID_SEAM_RANGE')
})

test('curved edge converts parameter intervals to physical notch fraction', () => {
  const {pieces,seam}=setup()
  for(const p of pieces) p.curves={0:{cx:2,cy:8}}
  seam.a.startT=.1;seam.a.endT=.7
  seam.b.startT=.1;seam.b.endT=.7
  const r=match({pieces},seam,n(.5))
  assert.equal(r.ok,true)
  assert(Math.abs(r.notch.t-.5)<1e-8)
})

test('sewing length mismatch and out-of-range edges fail closed', () => {
  const {pieces,seam}=setup()
  pieces[1].points[1].x=12
  assert.equal(match({pieces},seam,n()).code,'SEAM_LENGTH_MISMATCH')
  seam.b.edgeIndex=30
  assert.equal(match({pieces},seam,n()).code,'INVALID_EDGE')
})
