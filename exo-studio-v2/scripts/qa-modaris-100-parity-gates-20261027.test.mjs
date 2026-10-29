import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { AUDIT_PATH, BASELINE, createModarisParityReport, parseModarisParityAudit } from './qa-modaris-100-parity-gates-20261027.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const evidence = fs.readFileSync(path.resolve(root, AUDIT_PATH), 'utf8')
const make = () => createModarisParityReport({ root })

test('exactly 79 stable unique functions, 8 families, documented classifications and source fingerprints', () => {
  const result = make()
  assert.equal(result.functions.length, 79)
  assert.equal(result.source.families.length, 8)
  assert.deepEqual(result.baselineCounts, BASELINE)
  assert.deepEqual(result.functions.map(x => x.id), Array.from({length:79},(_,i)=>`M2D-${String(i+1).padStart(3,'0')}`))
  assert.equal(new Set(result.functions.map(x=>x.name)).size,79)
  assert(result.functions.every(x=>x.reference.sha256.length===64 && x.reference.line>0 && x.reference.section))
  assert.equal(result.functions.find(x=>x.name==='Fabric-bounded measurement chart').auditClassification,'Missing equivalent')
})

test('subset evidence is real and never fabricated as independently passing', () => {
  const report = make()
  assert.equal(report.statusCounts.VERIFIED_SUBSET,14)
  assert.equal(report.statusCounts.EXTERNAL_ACCEPTANCE_REQUIRED,5)
  assert.equal(report.statusCounts.OPEN,60)
  assert.equal(report.acceptedCount,0)
  assert.equal(report.parity100Achieved,false)
  assert.equal(report.parityPercentage,null)
  assert(report.functions.every(f=>f.independentlyAccepted===false && f.acceptanceEvidence===null))
  for (const f of report.functions) {
    if (f.status==='VERIFIED_SUBSET') {
      assert(f.testPaths.length>0 && f.subsetLimitation.includes('bounded'))
      assert(f.testPaths.every(p=>fs.existsSync(path.resolve(root,p))))
    } else assert.deepEqual(f.testPaths,[])
  }
  assert.deepEqual(report.fixtures.map(f=>f.id),['A','B','C','D','E'])
  assert(report.fixtures.every(f=>f.objectiveAccepted===false && f.independentEvidence===null))
  assert.equal(report.fixtures[4].status,'EXTERNAL_ACCEPTANCE_REQUIRED')
})

test('rejects absent audit, removed row, duplicates and classification drift', () => {
  assert.throws(()=>createModarisParityReport({root,evidencePath:'docs/research/no-such-audit.md'}),/missing/)
  assert.throws(()=>parseModarisParityAudit(evidence.replace(/^\| \*\*Polygon creation\*\*.*\n/m,''),{root}),/79/)
  const duplicate = evidence.replace('**Multiple pattern sheets**','**Create/open/save model and reuse blocks**')
  assert.throws(()=>parseModarisParityAudit(duplicate,{root}),/Duplicate/)
  const drift = evidence.replace('| **Partial** | No proven Modaris-style sheet graph', '| **Foundation** | No proven Modaris-style sheet graph')
  assert.throws(()=>parseModarisParityAudit(drift,{root}),/classification/)
})

test('CLI JSON is deterministic across runs and never promotes 100%', () => {
  const script = path.resolve(root,'scripts/qa-modaris-100-parity-gates-20261027.mjs')
  const run = () => execFileSync(process.execPath,[script],{cwd:root,encoding:'utf8'})
  const first = run(), second = run()
  assert.equal(first,second)
  const report = JSON.parse(first)
  assert.deepEqual(report.statusCounts,{VERIFIED_SUBSET:14,EXTERNAL_ACCEPTANCE_REQUIRED:5,OPEN:60})
  assert.equal(report.parity100Achieved,false)
  assert.equal(report.acceptedCount,0)
})
