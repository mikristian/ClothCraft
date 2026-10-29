import { gradeProject } from './grading.js'
import { edgeLength, edgeRangeLength } from './project.js'
import { quadraticAtLengthFraction } from './draftingPrecision.js'

// Notch.t is a fraction of *physical edge arclength*, while seam startT/endT
// are quadratic Bézier parameters. Comparing these numbers directly gives
// incorrect results for curved or partial seams.
function notchParameter(piece, edgeIndex, fraction) {
  const curve = piece.curves?.[edgeIndex]
  if (!curve) return fraction
  const start = piece.points[edgeIndex]
  const end = piece.points[(edgeIndex + 1) % piece.points.length]
  return quadraticAtLengthFraction(start, { x: curve.cx, y: curve.cy }, end, fraction).parameter
}

function sewnStation(piece, edgeIndex, fraction, side, reverse) {
  const length = edgeLength(piece, edgeIndex)
  if (!Number.isFinite(length) || length <= 0) throw new Error('Zero or nonfinite sewn edge length')
  const from = side.startT ?? 0, to = side.endT ?? 1
  if (![from, to, fraction].every(Number.isFinite) ||
      from < 0 || from > 1 || to < 0 || to > 1 || from >= to ||
      fraction < 0 || fraction > 1) {
    throw new Error('Invalid seam interval or notch arclength fraction')
  }
  const parameter = notchParameter(piece, edgeIndex, fraction)
  const inside = parameter >= from - 1e-8 && parameter <= to + 1e-8
  const stationCm = reverse
    ? edgeRangeLength(piece, edgeIndex, parameter, to)
    : edgeRangeLength(piece, edgeIndex, from, parameter)
  return { inside, stationCm, parameter, sewnLengthCm: edgeRangeLength(piece, edgeIndex, from, to) }
}

/**
 * Independent read-only QA for matched notches on partial sewn edges.
 * Existing whole-edge notch checks do not account for startT/endT or curved
 * edge arclength. No sewing or factory approval is inferred from a pass.
 */
export function inspectGradedNotchSeamIntervals(project, {
  sizes = project?.grading?.sizes,
  toleranceCm = 0.05,
} = {}) {
  if (!project || !Array.isArray(project.pieces) || !Array.isArray(project.seams) ||
      !Array.isArray(sizes) || !sizes.length || new Set(sizes).size !== sizes.length ||
      sizes.some(size => typeof size !== 'string' || !size.trim()) ||
      !Number.isFinite(toleranceCm) || toleranceCm < 0) {
    throw new TypeError('Valid project, ordered unique sizes and nonnegative tolerance required')
  }
  const issues = [], checks = []
  const add = (code, scope, message) => issues.push({ code, scope, message, severity: 'blocker' })
  // Duplicate identifiers make graded lookup ambiguous; never certify a match
  // against whichever duplicate happens to be last in the Map.
  const pieceIds = project.pieces.map(piece => piece?.id)
  if (pieceIds.some(id => typeof id !== 'string' || !id.trim()) ||
      new Set(pieceIds).size !== pieceIds.length) {
    add('AMBIGUOUS_PIECE_ID', 'project', 'Pattern piece IDs must be unique nonempty strings')
  }
  const seamIds = project.seams.map(seam => seam?.id)
  if (seamIds.some(id => typeof id !== 'string' || !id.trim()) ||
      new Set(seamIds).size !== seamIds.length) {
    add('AMBIGUOUS_SEAM_ID', 'project', 'Sewing seam IDs must be unique nonempty strings')
  }
  const groups = new Map()
  for (const piece of project.pieces) {
    for (const notch of piece.notches || []) {
      if (!notch?.matchGroupId && !notch?.matchedSeamId) continue
      if (typeof notch.matchGroupId !== 'string' || !notch.matchGroupId ||
          typeof notch.matchedSeamId !== 'string' || !notch.matchedSeamId ||
          typeof notch.id !== 'string' || !notch.id) {
        add('INVALID_NOTCH_PAIR_METADATA',piece.id,'Paired notch needs group, seam and notch IDs')
        continue
      }
      const entries = groups.get(notch.matchGroupId) || []
      entries.push({ pieceId: piece.id, notchId: notch.id, edgeIndex: notch.edgeIndex, seamId: notch.matchedSeamId })
      groups.set(notch.matchGroupId, entries)
    }
  }
  if (!groups.size && !issues.length) return {
    status: 'not_configured', blockers: 0, issues, checks, pairedGroups: 0,
    factoryCertified: false, note: 'No paired notches; no seam alignment is certified.',
  }
  const seams = new Map(project.seams.map(seam => [seam.id, seam]))
  const verified = []
  for (const [group, entries] of groups) {
    if (entries.length !== 2 || entries[0].seamId !== entries[1].seamId) {
      add('INVALID_NOTCH_GROUP',group,'Exactly two matching notches must reference one seam')
      continue
    }
    const seam = seams.get(entries[0].seamId)
    const onSide = side => entries.find(entry => entry.pieceId === side?.pieceId && entry.edgeIndex === side?.edgeIndex)
    const a = onSide(seam?.a), b = onSide(seam?.b)
    if (!seam || !a || !b || a === b) {
      add('NOTCH_SEAM_REFERENCE',group,'Matched notches must reference both sewn edges')
      continue
    }
    verified.push({ group, seam, a, b })
  }
  for (const size of sizes) {
    let graded
    try { graded = gradeProject(project,size) }
    catch (error) { add('NOTCH_GRADING_FAILED',size,error.message); continue }
    const pieces = new Map(graded.pieces.map(piece => [piece.id,piece]))
    for (const {group,seam,a,b} of verified) {
      const scope = `${group} / ${size}`
      const pa = pieces.get(a.pieceId), pb = pieces.get(b.pieceId)
      const na = pa?.notches?.find(notch => notch.id === a.notchId && notch.edgeIndex === a.edgeIndex)
      const nb = pb?.notches?.find(notch => notch.id === b.notchId && notch.edgeIndex === b.edgeIndex)
      if (!na || !nb) {
        add('NOTCH_LOST_ON_GRADE',scope,'Graded notch identity or edge assignment changed')
        continue
      }
      try {
        const first = sewnStation(pa,a.edgeIndex,na.t,seam.a,false)
        const second = sewnStation(pb,b.edgeIndex,nb.t,seam.b,Boolean(seam.reverseB))
        if (!first.inside || !second.inside) {
          add('NOTCH_OUTSIDE_SEWN_INTERVAL',scope,'Matched notch lies outside its actual sewn interval')
          continue
        }
        const offsetCm = Math.abs(first.stationCm - second.stationCm)
        const pass = offsetCm <= toleranceCm
        checks.push({group,seamId:seam.id,size,stationAcm:first.stationCm,
          stationBcm:second.stationCm,offsetCm,pass})
        if (!pass) add('NOTCH_INTERVAL_MISALIGNMENT',scope,
          `Notch stations differ by ${offsetCm.toFixed(4)} cm on the sewn intervals`)
      } catch (error) {
        add('INVALID_NOTCH_SEWN_INTERVAL',scope,error.message)
      }
    }
  }
  return { status: issues.length ? 'blocked' : 'pass', blockers: issues.length, issues, checks,
    pairedGroups: groups.size, checkedSizes: [...sizes], toleranceCm, factoryCertified: false,
    note: 'Diagnostic only; independent CAD and sewing acceptance still required.' }
}
