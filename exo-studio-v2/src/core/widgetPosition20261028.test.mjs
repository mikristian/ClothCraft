import test from 'node:test'
import assert from 'node:assert/strict'
import {clampWidgetPosition20261028 as position} from './widgetPosition20261028.js'
test('entire widget remains within host',()=>assert.deepEqual(position(990,690,{width:1000,height:700},{width:250,height:180}),{x:750,y:520}))
test('oversized widget stays reachable at origin',()=>assert.deepEqual(position(50,50,{width:100,height:100},{width:250,height:180}),{x:0,y:0}))
test('invalid and negative positions cannot escape',()=>assert.deepEqual(position(NaN,-40,{width:1000,height:700},{width:250,height:180}),{x:0,y:0}))
