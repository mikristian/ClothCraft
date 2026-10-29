import test from 'node:test'
import assert from 'node:assert/strict'
import { unzipSync, strFromU8 } from 'fflate'
import { createDefaultProject } from '../data/defaultProject.js'
import { gradeProject, gradePiece } from './grading.js'
import { INDUSTRIAL_GRADE_MODES as MODES } from './industrialGradeRules.js'
import { buildFactoryPackageZip } from './factoryPackage.js'

const original = createDefaultProject()
const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const rule = {
  mode: MODES.SMALL_LARGE_INCREMENTAL,
  sizes,
  baseSize: 'M',
  steps: [
    {dx: 0.25,dy: -0.05},
    {dx: 0.4,dy: -0.1},
    {dx: 0.65,dy: 0.15},
    {dx: 0.9,dy: 0.2},
    {dx: 1.2,dy: 0.35},
  ],
}

function industrialProject() {
  const project = structuredClone(original)
  project.pieces[0].points[0].industrialGradeRule = structuredClone(rule)
  return project
}

test('full garment grade honors nonuniform industrial break vectors instead of constant affine scaling', () => {
  const project = industrialProject()
  const base = project.pieces[0].points[0]
  const m = gradeProject(project, 'M')
  const xs = gradeProject(project, 'XS')
  const l = gradeProject(project, 'L')
  const xl = gradeProject(project, 'XL')
  assert.equal(m.pieces[0].points[0].x, base.x)
  assert.ok(Math.abs(xs.pieces[0].points[0].x - (base.x - .65)) < 1e-9)
  assert.ok(Math.abs(l.pieces[0].points[0].x - (base.x + .65)) < 1e-9)
  assert.ok(Math.abs(xl.pieces[0].points[0].x - (base.x + 1.55)) < 1e-9)
  assert.ok(Math.abs(xl.pieces[0].points[0].y - (base.y + .35)) < 1e-9)
  assert.deepEqual(project.pieces[0].points[0].industrialGradeRule, rule)
  assert.notStrictEqual(xl.pieces[0].points[0].industrialGradeRule,project.pieces[0].points[0].industrialGradeRule)
  assert.deepEqual(gradeProject(project,'XL').pieces[0].points[0],xl.pieces[0].points[0])
})

test('stale per-point rule rejects mismatched garment size set even for its base size', () => {
  const project = industrialProject()
  project.grading.sizes = ['S','M','L']
  assert.throws(()=>gradePiece(project.pieces[0],project.grading,'M'),/size set/i)
  project.grading.sizes = sizes
  project.grading.baseSize = 'L'
  assert.throws(()=>gradePiece(project.pieces[0],project.grading,'L'),/base size/i)
})

test('factory ZIP preserves exact break rules in separate JSON and emits all-size QA report', () => {
  const project = industrialProject()
  const files = unzipSync(buildFactoryPackageZip(project))
  const entry = Object.keys(files).find(name=>name.startsWith('industrial-grading/')&&name.endsWith('.json'))
  assert.ok(entry,'Do not flatten nonuniform rules into a uniform CSV')
  assert.ok(!Object.keys(files).some(name => name.startsWith('grading-rules/001-')), 'Industrial rules must not also ship as misleading uniform AUTO CSV')
  const sidecar = JSON.parse(strFromU8(files[entry]))
  assert.equal(sidecar.format,'exo-industrial-grade-rules.v1')
  assert.deepEqual(sidecar.points[0].rule,rule)
  const qa = JSON.parse(strFromU8(files['industrial-pattern-qa.json']))
  assert.equal(qa.factoryCertified,false)
  assert.ok(Array.isArray(qa.issues))
  const table=strFromU8(files['industrial-pattern-issues.csv'])
  assert.ok(table.startsWith('"severity","code","scope","message"'))
  assert.ok(table.includes('SEAM_LENGTH_MISMATCH'))
  assert.equal(table.split('\n').length,qa.issues.length+1)
  const seamWalk=strFromU8(files['industrial-pattern-seam-walk.csv'])
  assert.ok(seamWalk.startsWith('"size","seam_id","length_a_cm","length_b_cm","signed_a_minus_b_cm","mismatch_percent","status"'))
  assert.equal(seamWalk.split('\n').length,qa.seamReports.length+1)
  assert.ok(seamWalk.includes('BLOCKED'))
})
