import test from 'node:test'
import assert from 'node:assert/strict'
import {CAD_FORMAT_AVAILABILITY_20261028 as formats} from './cadFormatAvailability20261028.mjs'
test('every native/interchange format shows honest import and export status',()=>{assert.equal(formats.length,7);assert.equal(new Set(formats.map(row=>row.extension)).size,7);for(const row of formats)assert(row.import&&row.export&&row.note)})
test('proprietary Modaris files and rule sidecars are never represented as editable or exportable',()=>{for(const extension of ['.mdl','.vet','.iba','.rul']){const row=formats.find(row=>row.extension===extension);assert.equal(row.import,'UNAVAILABLE');assert.equal(row.export,'UNAVAILABLE')}})
test('generic DXF and EXO source communicate different editability',()=>{assert.equal(formats.find(row=>row.extension==='.dxf').import,'GEOMETRY_ONLY');assert.equal(formats.find(row=>row.extension==='.garment.json').import,'EDITABLE')})
