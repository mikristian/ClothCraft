#!/usr/bin/env node
/** Read-only factory archive geometry audit. Passing does not imply factory approval. */
import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { unzipSync, strFromU8 } from 'fflate'

const root = resolve(import.meta.dirname, '..')
const defaultTee = resolve(root, 'docs/qa/tee-sample-handoff-20261022/v2/foundation-tee-production-development-XS-XXL-with-neckband-proposal.zip')
const args = process.argv.slice(2)
const archivePaths = args.filter(arg => !arg.startsWith('--')).map(path => resolve(path))
if (!archivePaths.length) archivePaths.push(defaultTee)
const expectedSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const problems = []
const issue = (archive, code, context) => problems.push({ archive, code, ...context })
const nearly = (a, b, tolerance = 1e-6) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tolerance
const area = points => points.reduce((sum, point, index) => {
  const other = points[(index + 1) % points.length]
  return sum + point.x * other.y - other.x * point.y
}, 0) / 2
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
const sameOutline = (a, b, tolerance = 0.0001) => {
  if (a.length !== b.length) return false
  // Translation is permitted in the DXF layout; winding and vertex order are not.
  const shiftX = a[0].x - b[0].x, shiftY = a[0].y - b[0].y
  return a.every((point, index) => distance(point, { x: b[index].x + shiftX, y: b[index].y + shiftY }) <= tolerance)
}
function parsePolylines(text) {
  const lines = text.replace(/\r/g, '').split('\n')
  const pairs = []
  for (let index = 0; index + 1 < lines.length; index += 2) {
    const code = Number(lines[index].trim())
    if (!Number.isInteger(code)) throw new Error(`Invalid DXF group code at line ${index + 1}`)
    pairs.push({ code, value: lines[index + 1].trim() })
  }
  const entities = []
  for (let index = 0; index < pairs.length; index++) {
    if (pairs[index].code !== 0 || pairs[index].value !== 'POLYLINE') continue
    const header = []
    for (index++; index < pairs.length && pairs[index].code !== 0; index++) header.push(pairs[index])
    const layer = header.find(pair => pair.code === 8)?.value || ''
    const closed = (Number(header.find(pair => pair.code === 70)?.value || 0) & 1) !== 0
    const points = []
    while (index < pairs.length && !(pairs[index].code === 0 && pairs[index].value === 'SEQEND')) {
      if (pairs[index].code !== 0 || pairs[index].value !== 'VERTEX') { index++; continue }
      const vertex = []
      for (index++; index < pairs.length && pairs[index].code !== 0; index++) vertex.push(pairs[index])
      const x = Number(vertex.find(pair => pair.code === 10)?.value)
      const y = Number(vertex.find(pair => pair.code === 20)?.value)
      points.push({ x: x / 10, y: y / 10 }) // DXF is mm; source JSON is cm.
    }
    entities.push({ layer, closed, points })
  }
  return entities
}
function sampleEdge(piece, edgeIndex, subdivisions = 12) {
  const points = piece.points
  const a = points[edgeIndex], b = points[(edgeIndex + 1) % points.length]
  const control = piece.curves?.[edgeIndex]
  if (!control) return [a, b]
  return Array.from({ length: subdivisions + 1 }, (_, index) => {
    const t = index / subdivisions, u = 1 - t
    return { x: u * u * a.x + 2 * u * t * control.cx + t * t * b.x,
      y: u * u * a.y + 2 * u * t * control.cy + t * t * b.y }
  })
}
function stitchContour(piece) {
  return piece.points.flatMap((_, index) => sampleEdge(piece, index).slice(0, -1))
}
function pieceToken(piece) {
  return String(piece.name || '').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 48).toUpperCase()
}
function verifyArchive(filePath) {
  const label = filePath.replace(root + '/', '')
  const result = { archive: label, status: 'PASS', bytes: null, sha256: null, project: null, sizes: [], pieces: [], limitations: [] }
  if (!existsSync(filePath)) {
    issue(label, 'ARCHIVE_UNAVAILABLE', { path: filePath })
    return result
  }
  const raw = readFileSync(filePath)
  result.bytes = raw.length
  result.sha256 = sha256(raw)
  let files
  try { files = unzipSync(raw) } catch (error) {
    issue(label, 'ARCHIVE_INVALID', { detail: error.message })
    return result
  }
  const load = name => {
    if (!files[name]) { issue(label, 'MISSING_ENTRY', { entry: name }); return null }
    try { return JSON.parse(strFromU8(files[name])) } catch (error) {
      issue(label, 'INVALID_JSON', { entry: name, detail: error.message })
      return null
    }
  }
  const source = load('garment-source.json')
  const sizeRun = load('size-run.json')
  const manifest = load('manifest.json')
  if (!source || !sizeRun || !manifest) return result
  result.project = { id: source.id, name: source.name, revision: source.revision }
  const sizes = source.grading?.sizes
  if (!Array.isArray(sizes) || JSON.stringify(sizes) !== JSON.stringify(expectedSizes)) issue(label, 'UNEXPECTED_SOURCE_SIZES', { actual: sizes })
  if (JSON.stringify(Object.keys(sizeRun)) !== JSON.stringify(sizes)) issue(label, 'SIZE_RUN_MISMATCH', { sourceSizes: sizes, exportedSizes: Object.keys(sizeRun) })
  if (JSON.stringify(manifest.grading?.sizes) !== JSON.stringify(sizes)) issue(label, 'MANIFEST_GRADING_MISMATCH', { sizes: manifest.grading?.sizes })
  if (manifest.project?.id !== source.id || manifest.project?.revision !== source.revision) issue(label, 'MANIFEST_PROJECT_MISMATCH', {})
  const listed = new Set(manifest.files || [])
  for (const name of Object.keys(files)) if (!listed.has(name)) issue(label, 'UNLISTED_ARCHIVE_ENTRY', { entry: name })
  for (const name of listed) if (!files[name]) issue(label, 'MISSING_MANIFEST_ENTRY', { entry: name })
  const sourceIds = (source.pieces || []).map(piece => piece.id)
  if (!sourceIds.length || new Set(sourceIds).size !== sourceIds.length) issue(label, 'SOURCE_PIECES_INVALID', { ids: sourceIds })
  if (source.units !== 'cm') issue(label, 'UNSUPPORTED_SOURCE_UNITS', { units: source.units })
  for (const size of sizes || []) {
    const graded = sizeRun[size]
    if (!graded) continue
    result.sizes.push(size)
    if (graded.id !== source.id || graded.units !== source.units || JSON.stringify(graded.pieces.map(p => p.id)) !== JSON.stringify(sourceIds)) {
      issue(label, 'GRADED_PIECE_ID_PARITY', { size, sourceIds, gradedIds: graded.pieces?.map(p => p.id) })
      continue
    }
    const dxfPath = `patterns/${String(source.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${size.toLowerCase()}.dxf`
    if (!files[dxfPath]) { issue(label, 'MISSING_SIZE_DXF', { size, dxfPath }); continue }
    const dxfBytes = files[dxfPath]
    const dxfText = strFromU8(dxfBytes)
    const entities = parsePolylines(dxfText)
    const cuts = entities.filter(item => item.layer.startsWith('CUT_'))
    const stitches = entities.filter(item => item.layer.startsWith('STITCH_'))
    const historicalAllowances = entities.filter(item => item.layer.startsWith('SA_'))
    const legacyMode = stitches.length === 0 && historicalAllowances.length === sourceIds.length
    if (legacyMode && !result.limitations.some(text => text.includes('Historical legacy DXF'))) {
      result.limitations.push('Historical legacy DXF: CUT_* represents stitchline, SA_* represents an allowance outline; no actual STITCH_* manufacturing layer. These archives cannot evidence modern manufacturing CUT/STITCH naming.')
    }
    if (cuts.length !== sourceIds.length || (!legacyMode && stitches.length !== sourceIds.length)) {
      issue(label, 'CUT_STITCH_COUNT', { size, cuts: cuts.length, stitches: stitches.length, legacyAllowances: historicalAllowances.length, expected: sourceIds.length })
    }
    for (const piece of graded.pieces) {
      const sourcePiece = source.pieces.find(item => item.id === piece.id)
      if (piece.points?.length !== sourcePiece?.points?.length || !piece.points?.every(point => Number.isFinite(point.x) && Number.isFinite(point.y))) {
        issue(label, 'GRADED_SOURCE_TOPOLOGY', { size, piece: piece.id }); continue
      }
      const token = pieceToken(piece)
      const stitch = legacyMode ? cuts.find(item => item.layer === `CUT_${token}_${size}`) : stitches.find(item => item.layer === `STITCH_${token}`)
      const cut = legacyMode ? historicalAllowances.find(item => item.layer === `SA_${token}`) : cuts.find(item => item.layer === `CUT_${token}_${size}`)
      if (!cut || !stitch) { issue(label, 'MISSING_PIECE_CONTOUR', { size, piece: piece.id }); continue }
      const sourceSample = stitchContour(piece)
      const measured = { size, piece: piece.id, cutVertices: cut.points.length, stitchVertices: stitch.points.length,
        cutAreaCm2: Math.abs(area(cut.points)), stitchAreaCm2: Math.abs(area(stitch.points)),
        expectedStitchAreaCm2: Math.abs(area(sourceSample)), dxfSha256: sha256(dxfBytes) }
      result.pieces.push(measured)
      if (!cut.closed || !stitch.closed || cut.points.length < 3 || stitch.points.length < 3) issue(label, 'OPEN_OR_EMPTY_CONTOUR', { size, piece: piece.id })
      if (!sameOutline(stitch.points, sourceSample) || !nearly(measured.stitchAreaCm2, measured.expectedStitchAreaCm2, .0001)) {
        issue(label, 'STITCH_SOURCE_GEOMETRY_MISMATCH', { size, piece: piece.id, stitchAreaCm2: measured.stitchAreaCm2, sourceAreaCm2: measured.expectedStitchAreaCm2 })
      }
      if (!Number.isFinite(measured.cutAreaCm2) || measured.cutAreaCm2 <= 0 || measured.stitchAreaCm2 <= 0) issue(label, 'DEGENERATE_AREA', { size, piece: piece.id })
      if (measured.cutAreaCm2 <= measured.stitchAreaCm2 + .0001) issue(label, 'CUT_NOT_OUTSIDE_STITCH', { size, piece: piece.id, ...measured })
      if (size === source.grading?.baseSize && !piece.points.every((point, index) => distance(point, sourcePiece.points[index]) <= 1e-8)) {
        issue(label, 'BASE_SIZE_SOURCE_MISMATCH', { size, piece: piece.id })
      }
    }
  }
  result.limitations.push('Checks stored source, graded size-run, and DXF polylines; does not establish independently graded mathematical correctness, signed factory approval, actual-size print calibration, physical cut/sew/fit, or external CAD receiver acceptance.')
  return result
}

const archives = archivePaths.map(path => {
  try { return verifyArchive(path) } catch (error) {
    issue(path, 'UNHANDLED_AUDIT_ERROR', { detail: error.message })
    return { archive: path, status: 'BLOCKED' }
  }
})
for (const archive of archives) archive.status = problems.some(problem => problem.archive === archive.archive || problem.archive === archivePaths[archives.indexOf(archive)]) ? 'BLOCKED' : 'PASS'
const output = { status: problems.length ? 'BLOCKED' : 'PASS', factoryCertified: false, archiveCount: archives.length,
  checkedContours: archives.reduce((sum, archive) => sum + (archive.pieces?.length || 0) * 2, 0), archives, issues: problems }
console.log(JSON.stringify(output, null, 2))
if (problems.length) process.exitCode = 1
