import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {fileURLToPath} from 'node:url'
import {resolve,dirname} from 'node:path'
import {ACCUMARK_FOUNDATION_COVERAGE_20261024 as all} from './accumarkFoundationCoverage20261024.js'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..')
test('every requested feature family has a real, separately identified executable source',()=>{
 assert.equal(all.length,22)
 assert.equal(new Set(all.map(x=>x.id)).size,22)
 for(const feature of all){
  assert(feature.name&&feature.entry&&feature.remaining&&feature.source,feature.id)
  assert(['EDITABLE_BASE','BOUNDED_BASE'].includes(feature.state),feature.id)
  const path=resolve(root,feature.source)
  assert(fs.existsSync(path),feature.id+': '+feature.source)
  assert(fs.statSync(path).size>1000,'Empty tool source: '+feature.source)
 }
})
