import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeModarisSeamWalking20261027 as analyze, seamWalkingSourceToken20261027 as token } from './modarisSeamWalking20261027.js'

const panel = (id, y, curve = null) => ({ id, points: [{x:0,y},{x:10,y},{x:10,y:y+2}], ...(curve ? {curves:{0:curve}} : {}) })
const fixture = () => ({ pieces:[panel('front',0,{cx:5,cy:4}),panel('back',10,{cx:5,cy:14})],
  seams:[{id:'side',a:{pieceId:'front',edgeIndex:0},b:{pieceId:'back',edgeIndex:0},reverseB:true}],
  grading:{baseSize:'M',sizes:['M','L'],widthPerSizeCm:0,lengthPerSizeCm:0} })

test('matched curved seams walk by arclength and preserve source', () => {
  const p=fixture(), before=structuredClone(p)
  const result=analyze(p,{seamId:'side',sourceToken:token(p,'side'),sizes:['M','L']})
  assert.equal(result.ok,true)
  assert.equal(result.status,'within_tolerance')
  assert.equal(result.results.length,2)
  const first=result.results[0]
  assert(first.a.lengthCm>10)
  assert(Math.abs(first.mismatchCm)<1e-8)
  assert.equal(first.stations.length,9)
  assert(Math.abs(first.stations[4].parameterA-.5)<1e-6)
  assert(Math.abs(first.stations[4].parameterB-.5)<1e-6)
  assert(first.stations[0].parameterB>0.999999)
  assert(first.stations.at(-1).parameterB<0.000001)
  assert.deepEqual(p,before)
})

test('curved extra length returns signed adjustment proposal across a size run',()=>{
  const p=fixture()
  p.pieces[1].curves[0].cy+=2
  const result=analyze(p,{seamId:'side',sourceToken:token(p,'side'),sizes:['M','L'],toleranceCm:0.02})
  assert.equal(result.status,'mismatch')
  assert(result.results.every(r=>r.mismatchCm>0.02))
  assert(result.results.every(r=>r.easeCorrectionProposal.totalAdjustmentCm<0 && !r.easeCorrectionProposal.applied))
  assert(result.results[0].stations[4].cumulativeEaseCm>0)
})

test('stale panel, tampered seam, broken range, corrupt controls and invalid size reject',()=>{
  const p=fixture(), original=token(p,'side')
  p.pieces[0].points[0].x=2
  assert.equal(analyze(p,{seamId:'side',sourceToken:original,sizes:['M']}).code,'STALE_OR_INVALID_SOURCE')
  p.pieces[0].points[0].x=0
  p.seams[0].a.endT=2
  assert.equal(analyze(p,{seamId:'side',sourceToken:token(p,'side'),sizes:['M']}).code,'INVALID_EDGE_PATH')
  delete p.seams[0].a.endT
  p.pieces[0].curves[0].cy=Infinity
  assert.equal(analyze(p,{seamId:'side',sourceToken:token(p,'side'),sizes:['M']}).code,'INVALID_EDGE_PATH')
  p.pieces[0].curves[0].cy=4
  assert.equal(analyze(p,{seamId:'side',sourceToken:token(p,'side'),sizes:['XL']}).code,'INVALID_SIZE_RUN')
  p.seams[0].a.edgeIndex=20
  assert.equal(analyze(p,{seamId:'side',sourceToken:original,sizes:['M']}).code,'STALE_OR_INVALID_SOURCE')
})

const multi = (reverseB = false) => {
  const p = fixture()
  p.pieces = [
    {id:'front',points:[{x:0,y:0},{x:5,y:0},{x:10,y:0},{x:10,y:5},{x:0,y:5}],curves:{1:{cx:7.5,cy:2}}},
    {id:'back',points:[{x:0,y:10},{x:5,y:10},{x:10,y:10},{x:10,y:15},{x:0,y:15}],curves:{1:{cx:7.5,cy:12}}},
  ]
  p.seams = [
    {id:'first',a:{pieceId:'front',edgeIndex:0},b:{pieceId:'back',edgeIndex:reverseB?1:0},reverseB},
    {id:'second',a:{pieceId:'front',edgeIndex:1},b:{pieceId:'back',edgeIndex:reverseB?0:1},reverseB},
  ]
  return p
}

test('two contiguous edges including quadratic curve generate per-size station edge maps',()=>{
  const p=multi(), before=structuredClone(p)
  const result=analyze(p,{seamId:'first',seamIds:['first','second'],sourceToken:token(p,['first','second']),sizes:['M','L'],stationCount:10})
  assert.equal(result.ok,true)
  assert.equal(result.results.length,2)
  const row=result.results[0]
  assert.equal(row.a.edges.length,2)
  assert(row.a.lengthCm>10)
  assert(row.stations.some(s=>s.locationA.edgeIndex===1))
  assert(row.stations.some(s=>s.locationA.edgeIndex===0))
  assert(row.stations.every(s=>Number.isFinite(s.locationB.t)))
  assert.deepEqual(p,before)
})

test('reverse sewn direction maps B to descending edges and parameters',()=>{
  const p=multi(true)
  const result=analyze(p,{seamId:'first',seamIds:['first','second'],sourceToken:token(p,['first','second']),sizes:['M']})
  assert.equal(result.ok,true)
  assert.equal(result.results[0].stations[0].locationB.edgeIndex,1)
  assert(Math.abs(result.results[0].stations[0].locationB.t-1)<1e-6)
  assert.equal(result.results[0].stations.at(-1).locationB.edgeIndex,0)
  assert(result.results[0].stations.at(-1).locationB.t<1e-6)
})

test('branched, repeated, stale, unsupported and nonpositive ranges refuse the entire path',()=>{
  const p=multi(), ids=['first','second'], options=()=>({seamId:'first',seamIds:ids,sourceToken:token(p,ids),sizes:['M']})
  const stale=options()
  p.pieces[0].curves[1].cy+=1
  assert.equal(analyze(p,stale).code,'STALE_OR_INVALID_SOURCE')
  p.seams[1].a.edgeIndex=3
  assert.equal(analyze(p,options()).code,'DISCONNECTED_OR_BRANCHED_PATH')
  p.seams[1].a.edgeIndex=0
  assert.equal(analyze(p,options()).code,'DISCONNECTED_OR_BRANCHED_PATH')
  p.seams[1].a.edgeIndex=1
  p.seams[1].extra={branch:true}
  assert.equal(analyze(p,options()).code,'INVALID_SEAM_PAIR')
  delete p.seams[1].extra
  p.seams[1].a.startT=.5
  assert.equal(analyze(p,options()).code,'DISCONNECTED_OR_BRANCHED_PATH')
  p.seams[1].a.startT=-.1
  assert.equal(analyze(p,options()).code,'INVALID_EDGE_PATH')
  p.seams[1].a.startT=0
  p.seams[1].a.endT=0
  assert.equal(analyze(p,options()).code,'INVALID_EDGE_PATH')
  p.seams[1].a.endT=1
  p.pieces[0].points[2]={...p.pieces[0].points[1]}
  p.pieces[0].curves[1]={cx:5,cy:0}
  assert.equal(analyze(p,options()).code,'INVALID_EDGE_PATH')
})
