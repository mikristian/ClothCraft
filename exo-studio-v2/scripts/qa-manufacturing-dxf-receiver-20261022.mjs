#!/usr/bin/env node
/** Factory-mode DXF receiver smoke/regression QA. Generic DXF only. */
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { createTeeTemplate } from '../src/data/templates.js'
import { gradeProject } from '../src/core/grading.js'
import { projectToDxf } from '../src/core/dxf.js'
import { samplePieceBoundary, seamAllowanceBoundary } from '../src/core/project.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const python = process.env.EZDXF_PYTHON || '/tmp/exo-ezdxf-qa-20261022/bin/python'
const receiver = join(root, 'integrations/industrial-cad/ezdxf/qa-cut-stitch.py')
const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const temp = mkdtempSync(join(tmpdir(), 'exo-dxf-receiver-semantics-'))
const area = points => Math.abs(points.reduce((sum, a, i) => {
  const b = points[(i + 1) % points.length]
  return sum + a.x * b.y - b.x * a.y
}, 0)) * 50 // cm² to mm²

// Parse DXF group pairs and only POLYLINE/LINE/TEXT entity geometry, including
// vertex children. Independent from production parseDxfPatterns implementation.
function entities(dxf) {
  const lines = dxf.trimEnd().split(/\r?\n/)
  assert.equal(lines.length % 2, 0, 'Complete DXF group-code pairs')
  const tokens = []
  for (let i = 0; i < lines.length; i += 2) {
    const code = Number(lines[i])
    assert(Number.isInteger(code), 'Numeric DXF group code')
    tokens.push([code, lines[i + 1]])
  }
  const out = []
  let current = null
  for (const [code, value] of tokens) {
    if (code === 0) {
      current = { type: value, attributes: [], vertices: [] }
      out.push(current)
    } else if (current) current.attributes.push([code, value])
  }
  return out
}
const value = (entity, code) => entity.attributes.find(([k]) => k === code)?.[1]

function polylineGeometry(dxf) {
  const raw = entities(dxf)
  const polylines = []
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i]
    if (item.type !== 'POLYLINE') continue
    const points = []
    for (let k = i + 1; k < raw.length && raw[k].type !== 'SEQEND'; k++) {
      assert.equal(raw[k].type, 'VERTEX', 'POLYLINE vertex children only')
      points.push({ x: Number(value(raw[k], 10)), y: Number(value(raw[k], 20)) })
    }
    polylines.push({ layer: value(item, 8), closed: Boolean(Number(value(item, 70)) & 1), points })
  }
  return polylines
}

function replaceLayer(dxf, from, to) {
  const lines = dxf.split('\n')
  let count = 0
  for (let i = 0; i < lines.length - 1; i += 2) {
    if (lines[i] === '8' && lines[i + 1] === from) {
      lines[i + 1] = to
      count++
    }
  }
  assert(count > 0, `Mutation must match layer ${from}`)
  return lines.join('\n')
}

function deleteContour(dxf, layer) {
  const lines = dxf.split('\n')
  const find = (index, code, val) => lines[index] === String(code) && lines[index + 1] === val
  for (let i = 0; i < lines.length - 1; i += 2) {
    if (!find(i, 0, 'POLYLINE') || !find(i + 2, 8, layer)) continue
    let end = -1
    for (let j = i + 2; j < lines.length - 1; j += 2) {
      if (find(j, 0, 'SEQEND')) { end = j + 4; break }
    }
    assert(end !== -1, 'Contour contains SEQEND')
    return [...lines.slice(0, i), ...lines.slice(end)].join('\n')
  }
  throw new Error(`Missing contour to remove: ${layer}`)
}

function breakContour(dxf, layer) {
  const lines = dxf.split('\n')
  for (let i = 0; i < lines.length - 1; i += 2) {
    if (lines[i] !== '0' || lines[i + 1] !== 'POLYLINE') continue
    if (lines[i + 2] !== '8' || lines[i + 3] !== layer) continue
    for (let j = i + 4; j < i + 24; j += 2) {
      if (lines[j] === '70' && lines[j + 1] === '1') {
        lines[j + 1] = '0'
        return lines.join('\n')
      }
    }
  }
  throw new Error(`Closed contour flag missing: ${layer}`)
}

function runReceiver(dxf, size, scenario, expectedPass, expected) {
  const file = join(temp, `${size}-${scenario}.dxf`)
  writeFileSync(file, dxf)
  const proc = spawnSync(python, [receiver, file, '--size', size, '--pieces', '4'], {
    encoding: 'utf8', timeout: 15000, maxBuffer: 1024 * 1024,
  })
  assert(!proc.error, `${scenario} receiver execution: ${proc.error?.message}`)
  let report
  try { report = JSON.parse(proc.stdout) } catch { throw new Error(`${scenario}: invalid receiver output ${proc.stdout} ${proc.stderr}`) }
  assert.equal(proc.status === 0, expectedPass, `${size} ${scenario}: ${JSON.stringify(report)}`)
  assert.equal(report.status, expectedPass ? 'PASS' : 'FAIL')
  if (expectedPass) {
    assert.equal(report.cuts, 4)
    assert.equal(report.stitch_lines, 4)
    assert.equal(report.pieces.length, 4)
    assert.equal(report.factoryCertified, false)
    assert.equal(report.recipientAccepted, false)
    assert.deepEqual(new Set(report.pieces.map(p => p.piece)), new Set(expected.keys()))
    for (const item of report.pieces) {
      const source = expected.get(item.piece)
      assert(Math.abs(item.cut_area_mm2 - source.cut) < 0.01, `${size} ${item.piece} CUT area changed`)
      assert(Math.abs(item.stitch_area_mm2 - source.stitch) < 0.01, `${size} ${item.piece} STITCH area changed`)
      assert(item.cut_area_mm2 > item.stitch_area_mm2, `${size} ${item.piece} allowance missing`)
    }
  }
  return report
}

let totalChecks = 0
const negatives = []
const reports = []
try {
  const project = createTeeTemplate()
  assert.deepEqual(project.grading.sizes, sizes)
  const frozen = JSON.stringify(project)
  for (const size of sizes) {
    const graded = gradeProject(project, size)
    const expected = new Map(graded.pieces.map(piece => [piece.name.toUpperCase().replace(/[^A-Z0-9_-]/g, '_').slice(0, 48), {
      cut: area(seamAllowanceBoundary(piece, 12)), stitch: area(samplePieceBoundary(piece, 12).points),
    }]))
    assert.equal(expected.size, 4)
    const dxf = projectToDxf(graded, size, { cutlineMode: 'manufacturing' })
    assert.match(dxf, /\$INSUNITS\n70\n4\n/)
    assert.match(dxf, /CUT_LAYER_IS_PHYSICAL_ALLOWANCE_OUTLINE_STITCH_IS_SEWLINE_EXPLICIT_NOTCHES_ONLY/)
    const polys = polylineGeometry(dxf)
    assert.equal(polys.length, 8, `${size} has four CUT and four STITCH contours`)
    for (const item of polys) {
      assert(item.closed && item.points.length >= 3)
      assert(item.points.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)))
      const isCut = item.layer.startsWith('CUT_')
      const key = isCut ? item.layer.slice(4, -(size.length + 1)) : item.layer.slice(7)
      const target = expected.get(key)
      assert(target, `${size} missing piece token ${key}`)
      assert(Math.abs(area(item.points) / 100 - (isCut ? target.cut : target.stitch)) < 0.01)
    }
    const received = runReceiver(dxf, size, 'valid', true, expected)
    totalChecks++
    reports.push({ size, cuts: received.cuts, stitches: received.stitch_lines, notches: received.notches, pieces: received.pieces })
    const first = expected.keys().next().value
    const cutLayer = `CUT_${first}_${size}`
    const stitchLayer = `STITCH_${first}`
    const corruptions = [
      ['missing-cut', deleteContour(dxf, cutLayer)],
      ['missing-stitch', deleteContour(dxf, stitchLayer)],
      ['renamed-cut', replaceLayer(dxf, cutLayer, `UNKNOWN_${first}_${size}`)],
      ['renamed-stitch', replaceLayer(dxf, stitchLayer, `UNKNOWN_STITCH_${first}`)],
      ['open-cut', breakContour(dxf, cutLayer)],
      ['duplicate-cut', replaceLayer(dxf, `CUT_${[...expected.keys()][1]}_${size}`, cutLayer)],
      ['wrong-size', replaceLayer(dxf, cutLayer, `CUT_${first}_WRONG`) ],
      ['wrong-units', dxf.replace('$INSUNITS\n70\n4', '$INSUNITS\n70\n1')],
    ]
    for (const [scenario, mutation] of corruptions) {
      const outcome = runReceiver(mutation, size, scenario, false, expected)
      assert(outcome.reason && typeof outcome.reason === 'string')
      negatives.push({ size, scenario, reason: outcome.reason })
      totalChecks++
    }
  }
  assert.equal(JSON.stringify(project), frozen, 'Fixture project must remain unchanged')
  assert.equal(totalChecks, 54)
  console.log(JSON.stringify({ pass: true, sizes, testCount: totalChecks, positive: 6, negative: negatives.length,
    receiver: receiver.replace(root + '/', ''), reports, negatives,
    limitations: ['Generic ezdxf checks only: no Gerber/Lectra physical application import', 'Does not establish ASTM/AAMA protocol compliance or physical factory/sample approval'] }, null, 2))
} finally {
  rmSync(temp, { recursive: true, force: true })
}
