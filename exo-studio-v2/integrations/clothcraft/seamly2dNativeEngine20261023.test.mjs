import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { evaluateSeamly2DPattern20261023 as evaluate, evaluateSeamly2DSizeRun20261023 as sizeRun, SEAMLY2D_RUNTIME_20261023 as executablePath } from './seamly2dNativeEngine20261023.mjs'
import { parseDxfPatterns } from '../../src/core/dxf.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const upstream = path.join(root, 'research/oss/pattern-cad/Seamly2D/src/app/share/samples')
const patternPath = path.join(upstream, 'patterns/male_shirt.sm2d')
const measurementsPath = path.join(upstream, 'measurements/individual/male_shirt.smis')
const outputRoot = path.join(root, 'research/oss/pattern-cad/runtime/engine-outputs')
const nativeAvailable = fs.existsSync(executablePath)

test('fails closed for unavailable executable, format, dimensions and wrong grading source', () => {
  assert.equal(evaluate({ patternPath, measurementsPath, executablePath: path.join(outputRoot,'missing-engine') }).code, 'ENGINE_UNAVAILABLE')
  assert.equal(evaluate({ patternPath, measurementsPath, format:'dxf-manufacturing-certified' }).code, 'INVALID_FORMAT')
  assert.equal(evaluate({ patternPath, measurementsPath, sizeCm: NaN }).code, 'INVALID_GRADATION')
  assert.equal(evaluate({ patternPath, measurementsPath, sizeCm: 48 }).code, 'GRADATION_REQUIRES_SMMS')
})

test('uses actual Seamly2D engine to calculate SVG and AAMA DXF with source immutability', { skip: !nativeAvailable }, () => {
  const originalPattern = fs.readFileSync(patternPath)
  const originalMeasurements = fs.readFileSync(measurementsPath)
  const svg = evaluate({ patternPath, measurementsPath, format:'svg', outputRoot })
  assert.equal(svg.ok, true, svg.reason)
  assert.equal(svg.engine, 'Seamly2D')
  assert.equal(svg.manufacturingApproved, false)
  assert.equal(svg.constructionTools, 188)
  assert.equal(svg.artifacts.length, 1)
  const svgFile = fs.readFileSync(svg.artifacts[0].filename, 'utf8')
  assert.match(svgFile, /<svg\b/)
  assert.match(svgFile, /id="FrontPanel"/)
  assert.match(svgFile, /id="BackPanel"/)
  const dxf = evaluate({ patternPath, measurementsPath, format:'aama-r10', outputRoot })
  assert.equal(dxf.ok, true, dxf.reason)
  assert.equal(dxf.manufacturingApproved, false)
  assert.equal(dxf.artifacts.length, 1)
  assert.match(fs.readFileSync(dxf.artifacts[0].filename, 'utf8'), /SECTION\s*\n\s*2\s*\nENTITIES/)
  assert.deepEqual(fs.readFileSync(patternPath), originalPattern)
  assert.deepEqual(fs.readFileSync(measurementsPath), originalMeasurements)
})

test('upstream formulas actually respond to a different body circumference', { skip: !nativeAvailable }, () => {
  const original = fs.readFileSync(measurementsPath, 'utf8')
  const larger = original.replace('name="bust_circ" value="102"', 'name="bust_circ" value="110"')
  assert.notEqual(larger, original)
  const changedFile = path.join(outputRoot, 'changed-bust-input.smis')
  fs.mkdirSync(outputRoot, { recursive: true })
  fs.writeFileSync(changedFile, larger)
  try {
    const base = evaluate({ patternPath, measurementsPath, outputRoot })
    const changed = evaluate({ patternPath, measurementsPath:changedFile, outputRoot })
    assert.equal(base.ok, true, base.reason)
    assert.equal(changed.ok, true, changed.reason)
    assert.notEqual(base.artifacts[0].sha256, changed.artifacts[0].sha256,
      'Real Seamly2D output should change when bust circumference increases')
  } finally {
    fs.rmSync(changedFile, { force: true })
  }
})

test('real multisize measurements produce a distinct SHA-256-verified graded size run', { skip: !nativeAvailable }, () => {
  const jacket = path.join(upstream,'patterns/jacket1_52-176.sm2d')
  const graded = path.join(upstream,'measurements/multisize/gost_man_ru.smms')
  const before = [fs.readFileSync(jacket), fs.readFileSync(graded)]
  const run = sizeRun({ patternPath:jacket, measurementsPath:graded,
    format:'aama-r10', sizesCm:[48,52], heightCm:176, outputRoot })
  assert.equal(run.ok, true, run.reason)
  assert.equal(run.manufacturingApproved, false)
  assert.equal(run.results.length, 2)
  assert.notEqual(run.results[0].artifacts[0].sha256, run.results[1].artifacts[0].sha256)
  const perimeter = piece => piece.points.reduce((total, point, i, points) => {
    const next = points[(i+1) % points.length]
    return total + Math.hypot(next.x-point.x, next.y-point.y)
  }, 0)
  const physicalPerimeters = run.results.map(result => {
    const wire = fs.readFileSync(result.artifacts[0].filename, 'utf8')
    return parseDxfPatterns(wire).pieces.map(perimeter).map(length => Number(length.toFixed(4)))
  })
  assert.notDeepEqual(physicalPerimeters[0], physicalPerimeters[1],
    'Different label/placement alone is insufficient: sizes must differ in measured contour lengths')
  const manifest = JSON.parse(fs.readFileSync(run.manifestPath, 'utf8'))
  assert.deepEqual(manifest.sizesCm, [48,52])
  assert.equal(manifest.manufacturingApproved, false)
  assert.ok(run.results.every(item => item.artifacts[0].filename.endsWith('.dxf')))
  assert.deepEqual(fs.readFileSync(jacket), before[0])
  assert.deepEqual(fs.readFileSync(graded), before[1])
  assert.equal(sizeRun({ patternPath:jacket, measurementsPath:graded, sizesCm:[48,48] }).code, 'INVALID_SIZE_RUN')
  assert.equal(sizeRun({ patternPath, measurementsPath, sizesCm:[48,52] }).code, 'GRADATION_REQUIRES_SMMS')
})
