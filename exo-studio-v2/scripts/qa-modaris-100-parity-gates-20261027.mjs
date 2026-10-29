import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

export const AUDIT_PATH = 'docs/research/EXO_MODARIS_2D_WORKSPACE_FEATURE_GAP_AUDIT_2026-10-27.md'
export const BASELINE = Object.freeze({ Partial: 44, Foundation: 22, 'Missing equivalent': 8, Experimental: 2, Unverified: 2, 'Read-only': 1 })
export const STATUS = Object.freeze(['VERIFIED_SUBSET', 'EXTERNAL_ACCEPTANCE_REQUIRED', 'OPEN'])
const SHA = s => crypto.createHash('sha256').update(s).digest('hex')
const EVIDENCE = Object.freeze({
  'Named formula evaluation': 'src/core/nativeParametricFormula20261023.test.mjs',
  'Saved formula-to-point bindings': 'src/core/nativePatternConstraintBindings20261023.test.mjs',
  'Reactive dependency graph': 'integrations/clothcraft/check-v2-native-reactive-reference-20261027.mjs',
  'Linked intelligent pattern pieces': 'integrations/clothcraft/check-v2-automatic-bound-six-size-20261027.mjs',
  'All-size parametric recomputation': 'integrations/clothcraft/check-v2-reactive-six-size-20261027.mjs',
  'Physical dart cut and sewing': 'src/core/nativeDartPrecision20261023.test.mjs',
  'Configurable measurement chart': 'src/core/accumarkGradeMeasureChart20261023.test.mjs',
  'Separate sewline/cutline': 'src/core/industrialCutlineQA.test.mjs',
  'Per-edge seam allowance width': 'integrations/clothcraft/check-v2-industrial-six-size-audit-20261027.mjs',
  'Notches in 2D': 'integrations/clothcraft/check-v2-industrial-six-size-audit-20261027.mjs',
  'Assign per-point grade vectors': 'src/core/industrialGradeRules.test.mjs',
  'Different increments between sizes': 'src/core/modarisProportionalSizeRegeneration20261027.test.mjs',
  'Graded notches/allowances': 'integrations/clothcraft/check-v2-industrial-six-size-audit-20261027.mjs',
  'Grade across related pieces': 'integrations/clothcraft/check-v2-automatic-bound-six-size-20261027.mjs',
})
const EXTERNAL = new Set(['Modaris native MDL model format', 'DXF AAMA and ASTM exchange',
  'Pattern Converter add-on', 'Plot full scale', '2D ↔ 3D pattern synchronization'])
const FIXTURES = Object.freeze({
  A: 'Six-size smart bodice: chest 920→960 mm regenerates side panel, armhole, sleeve cap, darts, six sizes, CUT/STITCH without manual actions',
  B: 'Named shared allowance 10→12 mm updates both graded cutlines; sewlines, corners and notches remain valid',
  C: 'Transfer 20 mm waist dart to side seam for base and graded sizes; preserve endpoints, area/intake, Undo and export',
  D: 'Curved neckline facing extraction and mirror regenerate child, grain, cutline, notches and sizes after parent edit',
  E: 'Licensed Modaris 2026.2 exchange validates sizes, curves, identities, grain, cut counts, marks and physical print scale',
})
const cell = text => text.trim().replace(/^\*\*(.*?)\*\*$/, '$1')

export function parseModarisParityAudit(text, { evidencePath = AUDIT_PATH, root = process.cwd() } = {}) {
  if (typeof text !== 'string' || !text.trim()) throw Error('Missing Modaris audit evidence')
  const sections = []
  let section = ''
  const entries = []
  for (const [index, raw] of text.split(/\r?\n/).entries()) {
    const heading = raw.match(/^### (.+)$/)
    if (heading) { section = heading[1]; continue }
    if (!raw.startsWith('|') || !['Workspace', 'F1–F3 Geometry', 'Expert Parametrics',
      'Darts / Derived', 'Industrial 2D', 'Grading 2D', 'Measures 2D', 'Interchange'].includes(section)) continue
    const columns = raw.split('|').slice(1, -1).map(cell)
    if (columns.length !== 6 || columns[0] === 'Function' || /^[-: ]+$/.test(columns[0])) continue
    const [name, vendorBehavior, exoToday, classification, gap, source] = columns
    if (!Object.hasOwn(BASELINE, classification)) throw Error(`Unexpected audit classification at line ${index + 1}: ${classification}`)
    if (!name || !vendorBehavior || !gap || !source) throw Error(`Incomplete audit evidence at line ${index + 1}`)
    if (!sections.includes(section)) sections.push(section)
    const id = `M2D-${String(entries.length + 1).padStart(3, '0')}`
    const testPath = EVIDENCE[name]
    const tested = Boolean(testPath && fs.existsSync(path.resolve(root, testPath)))
    const status = tested ? 'VERIFIED_SUBSET' : EXTERNAL.has(name) ? 'EXTERNAL_ACCEPTANCE_REQUIRED' : 'OPEN'
    entries.push({ id, name, family: section, auditClassification: classification, status,
      reference: { evidencePath, line: index + 1, section, sha256: SHA(raw) },
      vendorBehavior, exoToday, gap, source, testPaths: tested ? [testPath] : [],
      subsetLimitation: tested ? `Focused EXO helper tests cover a bounded implementation only. Audit gap: ${gap}` : null,
      independentlyAccepted: false, acceptanceEvidence: null })
  }
  if (entries.length !== 79 || sections.length !== 8) throw Error(`Incomplete audit: expected 79 functions in 8 families, got ${entries.length} in ${sections.length}`)
  const names = entries.map(x => x.name)
  if (new Set(names).size !== names.length) throw Error('Duplicate Modaris function names in audit')
  const counts = Object.fromEntries(Object.keys(BASELINE).map(k => [k, entries.filter(x => x.auditClassification === k).length]))
  if (JSON.stringify(counts) !== JSON.stringify(BASELINE)) throw Error('Audit baseline classification counts changed')
  if (Object.keys(EVIDENCE).some(name => !names.includes(name))) throw Error('Referenced function evidence missing from audit')
  const statusCounts = Object.fromEntries(STATUS.map(k => [k, entries.filter(x => x.status === k).length]))
  return {
    schemaVersion: 1, objective: '79 independent Modaris Expert 2D function acceptances',
    source: { evidencePath, sha256: SHA(text), auditDate: '2026-10-27', rows: 79, families: sections },
    baselineCounts: counts, statusCounts, acceptedCount: 0, requiredAcceptedCount: 79,
    parity100Achieved: false, parityPercentage: null,
    qualification: 'Statuses and passing EXO tests never imply licensed vendor equivalence. All 79 require independent recorded acceptance.',
    fixtures: Object.entries(FIXTURES).map(([id, criterion]) => ({
      id, criterion, objectiveAccepted: false, independentEvidence: null,
      status: id === 'E' ? 'EXTERNAL_ACCEPTANCE_REQUIRED' : 'OPEN',
    })), functions: entries,
  }
}

export function createModarisParityReport({ root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
  evidencePath = AUDIT_PATH } = {}) {
  const full = path.resolve(root, evidencePath)
  if (!fs.existsSync(full) || !fs.statSync(full).isFile()) throw Error(`Required audit evidence file missing: ${full}`)
  return parseModarisParityAudit(fs.readFileSync(full, 'utf8'), { evidencePath, root })
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2)
    if (args.some(x => !['--pretty', '--audit'].includes(x)) && !args.includes('--audit')) throw Error('Usage: node scripts/qa-modaris-100-parity-gates-20261027.mjs [--pretty] [--audit relative/path]')
    const at = args.indexOf('--audit')
    if (at >= 0 && !args[at + 1]) throw Error('--audit requires a path')
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
    const report = createModarisParityReport({ root, evidencePath: at < 0 ? AUDIT_PATH : args[at + 1] })
    process.stdout.write(JSON.stringify(report, null, args.includes('--pretty') ? 2 : 0) + '\n')
  } catch (error) {
    process.stderr.write(`Modaris parity gate error: ${error.message}\n`)
    process.exitCode = 1
  }
}
