import test from 'node:test'
import assert from 'node:assert/strict'
import {proposeGraphicCanvasResize20261025 as resize} from './graphicCanvasResize20261025.js'
const logo={widthMm:100,heightMm:50,positionMm:[20,25]}
test('SE handle expands artwork at locked ratio and keeps top left visually fixed',()=>{
  assert.deepEqual(resize(logo,'se',{x:40,y:20}),{widthMm:140,heightMm:70,positionMm:[20,5]})
})
test('NW corner keeps opposite corner visually fixed',()=>{
  assert.deepEqual(resize({...logo,lockAspectRatio:false},'nw',{x:20,y:10}),{widthMm:80,heightMm:40,positionMm:[40,25]})
})
test('S resize unlocked keeps width, top visual position fixed',()=>{
  assert.deepEqual(resize({...logo,lockAspectRatio:false},'s',{x:0,y:10}),{widthMm:100,heightMm:60,positionMm:[20,15]})
})
test('rejects invalid graphic, handles, deltas and minimum extent',()=>{
  assert.equal(resize(logo,'bad',{x:1,y:1}),null)
  assert.equal(resize(logo,'se',{x:NaN,y:2}),null)
  assert.equal(resize({...logo,widthMm:0},'se',{x:1,y:1}),null)
  assert(resize({...logo,lockAspectRatio:false},'se',{x:-300,y:-300}).widthMm>=1)
})
test('rotated logo resize holds the opposite visual handle fixed',()=>{
  const proposed=resize({...logo,rotation:90},'e',{x:20,y:0})
  assert.deepEqual(proposed,{widthMm:120,heightMm:60,positionMm:[10,10]})
})
