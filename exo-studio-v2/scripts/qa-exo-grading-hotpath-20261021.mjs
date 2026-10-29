// Lock garment geometry independently of project-generated metadata / IDs.
// Baselines were captured before the sleeve-arc single-evaluation optimization.
// Run: node scripts/qa-exo-grading-hotpath-20261021.mjs [--bench]
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {performance} from 'node:perf_hooks'
import {createTemplateProject} from '../src/data/templates.js'
import {gradeProject} from '../src/core/grading.js'

const GOLDEN = {
  XS: '219dae71d13607959ba0d7a644a75d0805f8763ec945b66df6eb3ae44bf2e929',
  M: 'b9f60b4e4ae71fd76dab62f56106192681d088aab9dec122aa7f81ca5bfed034',
  XXL: '619a6ca7fd67eaa6d17c2929a9fb341ba7729f606b42a541ae800efa9645a713',
}

const project = createTemplateProject('tee')
assert.equal(project.productionSpec?.gradingModel, 'seam-locked-affine-v1')

for (const [size, golden] of Object.entries(GOLDEN)) {
  const graded = gradeProject(project, size)
  const numericGeometry = graded.pieces.map(piece => ({
    id: piece.id,
    points: piece.points.map(point => [point.x, point.y]),
    curves: Object.entries(piece.curves || {}).map(([edge, curve]) => [edge, curve.cx, curve.cy]),
    lines: (piece.internalLines || []).map(line => [line.a.x, line.a.y, line.b.x, line.b.y]),
  }))
  const hash = createHash('sha256').update(JSON.stringify(numericGeometry)).digest('hex')
  assert.equal(hash, golden, `graded ${size} garment geometry changed from baseline`)
  console.log(`PASS ${size}: bit-identical pre-optimization pattern geometry`)

  if (!process.argv.includes('--bench')) continue
  const times = []
  for (let run = 0; run < 10; run += 1) {
    const start = performance.now()
    gradeProject(project, size)
    if (run > 2) times.push(performance.now() - start)
  }
  times.sort((a, b) => a - b)
  console.log(`BENCH ${size}: median ${times[Math.floor(times.length / 2)].toFixed(3)} ms; local microbenchmark only`)
}
