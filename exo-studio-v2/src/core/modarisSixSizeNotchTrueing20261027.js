import { buildNativeIndustrialSizeRun } from './grading.js'
import { edgeLength, edgeRangeLength } from './project.js'
import { quadraticAtLengthFraction } from './draftingPrecision.js'
import { buildSewnIndustrialSizeRun20261024 } from './industrialSixSizeSeamContinuity20261024.js'

/**
 * Six-size, physically measured matched-notch trueing for qualified legacy
 * industrial projects. Notch.t is a FULL-EDGE arc-length fraction; sewn ranges
 * use Bézier PARAMETER fractions. No source points, grade rules or sewing
 * topology are edited. One target notch position must satisfy every size.
 * The resulting project is a candidate for the normal legacy Undo history;
 * this helper never commits native Rust edits or certifies physical production.
 */
const fail = message => { throw Error(`MODARIS_SIX_SIZE_NOTCH_TRUEING: ${message}`) }
const finite = n => typeof n === 'number' && Number.isFinite(n)
const ident = s => typeof s === 'string' && s.length > 0 && s.length <= 128 && s.trim() === s &&
  !['__proto__', 'constructor', 'prototype'].includes(s)

function safeCopy(value) {
  let count = 0
  const ancestors = new Set()
  function read(x, depth) {
    if (x === null || typeof x === 'string' || typeof x === 'boolean') return x
    if (finite(x) && Math.abs(x) <= 1e9) return x
    if (!x || typeof x !== 'object' || depth > 28 || ++count > 25000 || ancestors.has(x))
      fail('invalid, cyclic, excessively deep or nonfinite source')
    const array = Array.isArray(x)
    if (Object.getPrototypeOf(x) !== (array ? Array.prototype : Object.prototype))
      fail('non-plain source prototype')
    const result = array ? [] : {}
    const descriptors = Object.getOwnPropertyDescriptors(x)
    if (Reflect.ownKeys(descriptors).length > 20000 || (array && x.length > 20000))
      fail('oversized source')
    ancestors.add(x)
    for (const key of Reflect.ownKeys(descriptors)) {
      if (array && key === 'length') continue
      if (typeof key !== 'string' || ['__proto__', 'constructor', 'prototype', 'toJSON'].includes(key))
        fail('unsafe source key')
      if (array && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= x.length))
        fail('invalid source array index')
      const descriptor = descriptors[key]
      if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value'))
        fail('source accessors and hidden properties are unsupported')
      Object.defineProperty(result, key, { value: read(descriptor.value, depth + 1),
        writable: true, enumerable: true, configurable: true })
    }
    if (array && Object.keys(result).length !== x.length) fail('sparse source array')
    ancestors.delete(x)
    return result
  }
  return read(value, 0)
}

const allowed = (object, keys) => object && typeof object === 'object' && !Array.isArray(object) &&
  Object.keys(object).every(key => keys.includes(key))

function checkSource(project, expectedRevision) {
  if (!allowed(project, ['id','name','revision','updatedAt','pieces','seams','grading']) ||
      !Number.isSafeInteger(project.revision) || project.revision < 0 || project.revision !== expectedRevision)
    fail('invalid or stale source revision/metadata')
  const sizes = project.grading?.sizes
  if (!allowed(project.grading, ['sizes','baseSize']) || !Array.isArray(sizes) || sizes.length !== 6 ||
      sizes.some(size => !ident(size)) || new Set(sizes).size !== 6 || !sizes.includes(project.grading.baseSize))
    fail('exact six-size grading metadata required')
  if (!Array.isArray(project.pieces) || project.pieces.length < 2 || project.pieces.length > 128 ||
      !Array.isArray(project.seams) || !project.seams.length)
    fail('two or more sewn pieces and named seams required')
  const pieceIds = project.pieces.map(piece => piece?.id)
  if (pieceIds.some(id => !ident(id)) || new Set(pieceIds).size !== pieceIds.length) fail('duplicate or invalid piece ID')
  const seamIds = project.seams.map(seam => seam?.id)
  if (seamIds.some(id => !ident(id)) || new Set(seamIds).size !== seamIds.length) fail('duplicate or invalid seam ID')
  return sizes
}

function seamSide(piece, side) {
  if (!allowed(side, ['pieceId','edgeIndex','startT','endT']) || side.pieceId !== piece?.id ||
      !Number.isSafeInteger(side.edgeIndex) || side.edgeIndex < 0 || side.edgeIndex >= piece.points?.length)
    fail('stale or invalid sewn edge reference')
  const start = side.startT ?? 0, end = side.endT ?? 1
  if (![start, end].every(finite) || start < 0 || end > 1 || end - start < 1e-6)
    fail('invalid sewn Bézier parameter interval')
  return { index: side.edgeIndex, start, end }
}

function notchParameter(piece, notch) {
  const i = notch.edgeIndex
  if (!Number.isSafeInteger(i) || i < 0 || i >= piece.points?.length ||
      !finite(notch.t) || notch.t < 0 || notch.t > 1) fail('invalid notch anchor')
  const curve = piece.curves?.[i]
  if (!curve) return notch.t
  if (!finite(curve.cx) || !finite(curve.cy)) fail('unsupported nonquadratic sewn curve')
  return quadraticAtLengthFraction(piece.points[i], { x: curve.cx, y: curve.cy },
    piece.points[(i + 1) % piece.points.length], notch.t).parameter
}

function findGroups(project) {
  const groups = new Map()
  for (const piece of project.pieces) {
    for (const notch of piece.notches ?? []) {
      if (notch.matchGroupId === undefined && notch.matchedSeamId === undefined) continue
      if (!ident(notch.id) || !ident(notch.matchGroupId) || !ident(notch.matchedSeamId))
        fail('incomplete or invalid matched notch reference')
      const entries = groups.get(notch.matchGroupId) ?? []
      entries.push({ pieceId: piece.id, id: notch.id, notch })
      groups.set(notch.matchGroupId, entries)
    }
  }
  if (!groups.size) fail('no named matched-notch pairs available')
  return [...groups].sort(([a], [b]) => a.localeCompare(b)).map(([groupId, entries]) => {
    if (entries.length !== 2 || entries[0].notch.matchedSeamId !== entries[1].notch.matchedSeamId)
      fail(`incomplete or duplicate matched-notch pair: ${groupId}`)
    const seamMatches = project.seams.filter(seam => seam.id === entries[0].notch.matchedSeamId)
    if (seamMatches.length !== 1) fail(`unknown matched notch seam: ${groupId}`)
    const seam = seamMatches[0]
    if (!allowed(seam, ['id','name','type','a','b','reverseB']) ||
        (seam.reverseB !== undefined && typeof seam.reverseB !== 'boolean'))
      fail('unsupported seam metadata')
    const source = entries.find(entry => entry.pieceId === seam.a?.pieceId && entry.notch.edgeIndex === seam.a.edgeIndex)
    const target = entries.find(entry => entry.pieceId === seam.b?.pieceId && entry.notch.edgeIndex === seam.b.edgeIndex)
    if (!source || !target || source === target) fail(`notch group does not match both sewn edges: ${groupId}`)
    return { groupId, seam, source, target }
  })
}

function expectedTargetFraction(sourcePiece, targetPiece, group) {
  const { seam, source, target } = group
  const a = seamSide(sourcePiece, seam.a), b = seamSide(targetPiece, seam.b)
  const sourceT = notchParameter(sourcePiece, source.notch)
  if (sourceT < a.start - 1e-8 || sourceT > a.end + 1e-8)
    fail(`source notch outside sewn range: ${group.groupId}`)
  const sewnLengthA = edgeRangeLength(sourcePiece, a.index, a.start, a.end)
  const sewnLengthB = edgeRangeLength(targetPiece, b.index, b.start, b.end)
  const stationA = edgeRangeLength(sourcePiece, a.index, a.start, sourceT)
  const totalB = edgeLength(targetPiece, b.index)
  if (![sewnLengthA, sewnLengthB, stationA, totalB].every(v => finite(v) && v >= 0) ||
      sewnLengthA <= 0.01 || sewnLengthB <= 0.01 || totalB <= 0.01)
    fail(`degenerate sewn edge: ${group.groupId}`)
  const startB = edgeRangeLength(targetPiece, b.index, 0, b.start)
  const endB = edgeRangeLength(targetPiece, b.index, 0, b.end)
  const wanted = seam.reverseB ? endB - stationA : startB + stationA
  if (wanted < startB - 1e-8 || wanted > endB + 1e-8)
    fail(`notch transfer leaves sewn range: ${group.groupId}`)
  const oldStationT = notchParameter(targetPiece, target.notch)
  if (oldStationT < b.start - 1e-8 || oldStationT > b.end + 1e-8)
    fail(`existing target notch outside sewn range: ${group.groupId}`)
  const oldStation = edgeRangeLength(targetPiece, b.index, 0, oldStationT)
  return { targetFraction: wanted / totalB, edgeLengthCm: totalB,
    seamLengthDifferenceCm: Math.abs(sewnLengthA - sewnLengthB),
    sourceStationCm: stationA, oldFraction: target.notch.t,
    beforeDriftCm: Math.abs(oldStation - wanted) }
}

/**
 * Return an atomic legacy project candidate with graded matched notches trued.
 * Every pair is solved once across all six sizes (not one different notch per
 * size). A pair is rejected when the six feasible physical-station intervals
 * have no common intersection or the allowed edit distance would be exceeded.
 */
export function proposeModarisSixSizeNotchTrueing20261027(input, {
  expectedRevision, seamToleranceCm = 0.05, notchToleranceCm = 0.02,
  maxDisplacementCm = 5,
} = {}) {
  if (!finite(seamToleranceCm) || seamToleranceCm < 0 || seamToleranceCm > .05 ||
      !finite(notchToleranceCm) || notchToleranceCm < 0 || notchToleranceCm > .02 ||
      !finite(maxDisplacementCm) || maxDisplacementCm <= 0 || maxDisplacementCm > 5)
    fail('invalid seam/notch tolerance or displacement limit')
  const project = safeCopy(input)
  const sizes = checkSource(project, expectedRevision)
  const groups = findGroups(project)
  const run = buildNativeIndustrialSizeRun(project)
  const results = []
  for (const group of groups) {
    const measurements = sizes.map(size => {
      const graded = run[size]
      const sourcePiece = graded?.pieces?.find(piece => piece.id === group.seam.a.pieceId)
      const targetPiece = graded?.pieces?.find(piece => piece.id === group.seam.b.pieceId)
      if (!sourcePiece || !targetPiece) fail(`missing graded piece for ${group.groupId}/${size}`)
      const perSize = expectedTargetFraction(sourcePiece, targetPiece, group)
      if (perSize.seamLengthDifferenceCm > seamToleranceCm + 1e-9)
        fail(`seam mismatch blocks notch trueing: ${group.groupId}/${size}`)
      return { size, ...perSize }
    })
    // Intersect every size's feasible full-edge fraction interval. Reject when
    // no single geometric station satisfies all six sizes within tolerance.
    let lo = 0, hi = 1
    for (const row of measurements) {
      const delta = notchToleranceCm / row.edgeLengthCm
      lo = Math.max(lo, row.targetFraction - delta)
      hi = Math.min(hi, row.targetFraction + delta)
    }
    if (lo > hi + 1e-11) fail(`no common six-size notch station: ${group.groupId}`)
    const weighted = measurements.reduce((sum, row) => sum + row.targetFraction * row.edgeLengthCm, 0) /
      measurements.reduce((sum, row) => sum + row.edgeLengthCm, 0)
    const t = Math.min(hi, Math.max(lo, weighted))
    const diagnostics = measurements.map(row => {
      const finalDriftCm = Math.abs(t - row.targetFraction) * row.edgeLengthCm
      const adjustmentCm = Math.abs(t - row.oldFraction) * row.edgeLengthCm
      if (finalDriftCm > notchToleranceCm + 1e-7)
        fail(`uncertified notch residual: ${group.groupId}/${row.size}`)
      if (adjustmentCm > maxDisplacementCm + 1e-9)
        fail(`notch displacement exceeds limit: ${group.groupId}/${row.size}`)
      return { size: row.size, seamLengthDifferenceCm: row.seamLengthDifferenceCm,
        beforeDriftCm: row.beforeDriftCm, afterDriftCm: finalDriftCm, adjustmentCm }
    })
    group.target.notch.t = t
    results.push({ groupId: group.groupId, seamId: group.seam.id,
      sourceNotchId: group.source.id, targetNotchId: group.target.id,
      oldTargetT: measurements[0].oldFraction, newTargetT: t, perSize: diagnostics })
  }
  const changed = results.some(item => Math.abs(item.oldTargetT - item.newTargetT) > 1e-10)
  if (changed) project.revision++
  // Verify the FULL industrial sewing run after the proposed edit. Failure in
  // any OTHER pair, notch, graded piece or sewn edge refuses the whole draft.
  const checked = buildSewnIndustrialSizeRun20261024(project, { seamToleranceCm, notchToleranceCm })
  if (checked.validation.status !== 'pass' || checked.validation.checkedSizes.length !== 6)
    fail('final six-size sewn pattern acceptance failed')
  return { candidate: project, changed, originalRevision: expectedRevision,
    candidateRevision: project.revision, groups: results, sizes: [...sizes],
    checkCount: checked.validation.checks.length, manufacturingApproved: false,
    committedToRustProject: false, toleranceCm: { seam: seamToleranceCm, notch: notchToleranceCm },
    limitations: 'Qualified legacy quadratic/straight sewing and matched-notch marks only. Requires normal app Undo transaction, cutline QA and physical production approval.' }
}
