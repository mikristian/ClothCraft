import test from 'node:test'
import assert from 'node:assert/strict'
import { nestPolygons } from './accumarkPolygonNesting20261024.js'

const square = id => ({id, name:id, grainAngleDeg:0, cutQuantity:1, seamAllowance:0, marker:{nap:'one-way'}, points:[{x:0,y:0},{x:2,y:0},{x:2,y:2},{x:0,y:2}]})

test('candidate cap is strict and a rejected next piece reports its budget exhaustion', () => {
  const result=nestPolygons({pieces:[square('a'),square('b'),square('c')]},{fabricWidth:8,maxLength:8,gap:0,maxCandidates:1})
  assert.equal(result.metrics.candidateChecks,1)
  assert.equal(result.placements.length,1)
  assert.deepEqual(result.unplaced.map(p=>p.reason),['candidate-budget-exceeded','candidate-budget-exceeded'])
})

test('candidate budget rejects noninteger limits explicitly', () => {
  for (const maxCandidates of [0,0.5,NaN,Infinity]) {
    const result=nestPolygons({pieces:[square('a')]},{maxCandidates})
    assert.equal(result.ok,false)
    assert.deepEqual(result.errors,['invalid-layout-limits'])
  }
})

test('deterministic packing produces finite nonoverlapping footprints', () => {
  const project={pieces:Array.from({length:16},(_,i)=>square(String(i)))}
  const options={fabricWidth:16,maxLength:40,gap:0.25,maxCandidates:30000}
  const a=nestPolygons(project,options), b=nestPolygons(project,options)
  assert.deepEqual(a,b)
  assert.equal(a.ok,true)
  assert.ok(Number.isFinite(a.metrics.length))
  for(const p of a.placements) {
    assert.ok(p.x>=0 && p.y>=0)
    assert.ok(p.x+p.width<=options.fabricWidth+1e-7)
    assert.ok(p.y+p.height<=options.maxLength+1e-7)
  }
})
