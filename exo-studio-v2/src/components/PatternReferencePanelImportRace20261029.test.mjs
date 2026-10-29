import test from 'node:test'
import assert from 'node:assert/strict'
import {build} from 'esbuild'
import {readFile} from 'node:fs/promises'

const source=await readFile(new URL('./PatternReferencePanel20261025.jsx',import.meta.url),'utf8')

test('reference panel compiles after async import race protection',async()=>{
  const result=await build({entryPoints:['src/components/PatternReferencePanel20261025.jsx'],bundle:true,write:false,platform:'browser',packages:'external',loader:{'.jsx':'jsx','.css':'empty'}})
  assert(result.outputFiles[0].text.includes('selectionEpoch'))
})

test('reference import checks project and selection freshness after every decode',()=>{
  assert.match(source,/const selection = \+\+selectionEpoch\.current/)
  assert.match(source,/current\.current\.projectKey === startedProject/)
  assert.match(source,/if \(!isCurrent\(\)\) return/)
  assert.match(source,/catch \(e\) \{if \(isCurrent\(\)\) setError/)
  assert.match(source,/finally \{if \(isCurrent\(\)\) setBusy\(false\)\}/)
  assert.match(source,/setSelectedLocal\(null\);setError\(''\);setBusy\(false\)/,
    'switching projects must reset the prior import spinner without letting stale finally clear new work')
})

test('reference import merges with latest controlled or local edits at completion',()=>{
  assert.match(source,/const latest = itemsRef\.current\.items/)
  assert.match(source,/changeRef\.current\(\[\.\.\.latest,\.\.\.imports\]\)/)
  assert.doesNotMatch(source,/change\(\[\.\.\.items,\.\.\.imports\]\)/)
  assert.match(source,/!incoming\.length \|\| !projectKey \|\| !ready/,
    'an import must not race hydration of a previously persisted reference list')
})
