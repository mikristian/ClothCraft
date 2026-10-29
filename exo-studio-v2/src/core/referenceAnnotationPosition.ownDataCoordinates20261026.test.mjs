import assert from 'node:assert/strict'
import { test } from 'node:test'
import { referenceAnnotationPercentPosition } from './referenceAnnotationPosition.js'

test('inherited x or y coordinates cannot create reference-image pins', () => {
  const inheritedBoth = Object.create({ x: 0.25, y: 0.75 })
  const inheritedX = Object.assign(Object.create({ x: 0.25 }), { y: 0.75 })
  const inheritedY = Object.assign(Object.create({ y: 0.75 }), { x: 0.25 })
  for (const entry of [inheritedBoth, inheritedX, inheritedY]) {
    assert.equal(referenceAnnotationPercentPosition(entry), null)
  }
})

test('coordinate accessors are rejected without invoking getters', () => {
  let getterCalls = 0
  const entry = { y: 0.5 }
  Object.defineProperty(entry, 'x', { enumerable: true, get() {
    getterCalls += 1
    throw new Error('coordinate getter must not execute')
  } })
  assert.equal(referenceAnnotationPercentPosition(entry), null)
  assert.equal(getterCalls, 0)
})

test('an inherited getter cannot execute during coordinate validation', () => {
  let getterCalls = 0
  const prototype = Object.create(null)
  Object.defineProperty(prototype, 'y', { get() {
    getterCalls += 1
    throw new Error('inherited getter must not execute')
  } })
  const entry = Object.assign(Object.create(prototype), { x: 0.5 })
  assert.equal(referenceAnnotationPercentPosition(entry), null)
  assert.equal(getterCalls, 0)
})

test('ordinary frozen own numeric and decimal-string coordinates retain placement and source', () => {
  const entry = Object.freeze({ x: '2.5e-1', y: 0.75 })
  assert.deepEqual(referenceAnnotationPercentPosition(entry), { left: 25, top: 75 })
  assert.deepEqual(entry, { x: '2.5e-1', y: 0.75 })
})
