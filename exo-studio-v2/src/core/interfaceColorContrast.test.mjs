import test from 'node:test'
import assert from 'node:assert/strict'
import {contrastRatio,readableUiInk} from './interfaceColorContrast.js'

test('readable interface text on white and dark panels',()=>{
  for(const [base,color] of [['#ffffff','#c6c6c6'],['#151c26','#4b5360'],['#eeeeee','#d5d5d5'],['#2d2d2d','#303030']]){
    assert(contrastRatio(readableUiInk(color,base),base)>=4.49)
  }
  assert(contrastRatio('#000000','#ffffff')>=20.9)
  assert.equal(readableUiInk('#abcdef','#000000',{autoContrast:false}),'#abcdef')
  assert.notEqual(readableUiInk('#abcdef','#000000',{brightness:.5,autoContrast:false}), '#abcdef')
  assert.equal(readableUiInk('#ff00dd','#ffffff',{brightness:1,autoContrast:false}),'#ff00dd')
  assert.match(readableUiInk('bad','broken',{autoContrast:true}),/^#[0-9a-f]{6}$/)
})
