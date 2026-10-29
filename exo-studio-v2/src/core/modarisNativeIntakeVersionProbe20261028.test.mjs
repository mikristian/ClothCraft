import test from 'node:test'
import assert from 'node:assert/strict'
import {probeModarisNativeVersion20261028 as probe} from './modarisNativeIntakeVersionProbe20261028.mjs'
test('version hints never become certified parser or decryption claims',()=>{const bytes=new TextEncoder().encode('Lectra Modaris V8\nOpaque Content');const before=[...bytes];const x=probe({fileName:'shirt.mdl',bytes});assert.equal(x.ok,true);assert(x.headerMarkers.includes('Lectra'));assert(x.headerMarkers.includes('V8'));assert.equal(x.versionVerified,false);assert.equal(x.encryptedState,'UNKNOWN');assert.equal(x.editable,false);assert.deepEqual([...bytes],before)})
test('different non-Lectra MDL content cannot become a native EXO pattern',()=>{const x=probe({fileName:'game.mdl',bytes:new TextEncoder().encode('IDST game model')});assert.equal(x.editable,false);assert.equal(x.roundTripVerified,false)})
