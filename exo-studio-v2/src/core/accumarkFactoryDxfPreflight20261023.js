import { gradeProject } from './grading.js'
import { projectToDxf } from './dxf.js'
import { preflightPhysicalCutOverlap20261023_2000 } from './physicalCutOverlapPreflight20261023_2000.mjs'

const validId = value => typeof value === 'string' && value.trim().length > 0
const finite = value => typeof value === 'number' && Number.isFinite(value)
const validPoint = value => value && finite(value.x) && finite(value.y)

function verify(project, expected) {
  if (!project || typeof project !== 'object') throw new Error('Missing pattern project')
  if (project.patternSource?.referenceOnly) throw new Error('Reference-only imported pattern cannot be manufactured')
  const sizes = project.grading?.sizes
  const base = project.grading?.baseSize
  if (!Array.isArray(sizes) || sizes.length < 2 || sizes.some(size => !validId(size)) || new Set(sizes).size !== sizes.length || !sizes.includes(base)) {
    throw new Error('Invalid ordered grading sizes or base size')
  }
  for (const key of ['widthPerSizeCm', 'lengthPerSizeCm']) {
    if (project.grading[key] != null && !finite(project.grading[key])) throw new Error(`Invalid grading increment: ${key}`)
  }
  if (!Array.isArray(project.pieces) || !project.pieces.length || !Array.isArray(project.seams)) throw new Error('Missing pieces or seam graph')
  const pieces = new Map()
  for (const piece of project.pieces) {
    if (!validId(piece?.id) || pieces.has(piece.id)) throw new Error(`Duplicate or invalid piece ID: ${String(piece?.id)}`)
    if (piece.patternImportProvenance?.referenceOnly) throw new Error(`Reference-only imported pattern piece: ${piece.id}`)
    if (!Array.isArray(piece.points) || piece.points.length < 3 || piece.points.some(point => !validPoint(point))) throw new Error(`Invalid or nonfinite points: ${piece.id}`)
    if (piece.curves != null) {
      if (!piece.curves || typeof piece.curves !== 'object' || Array.isArray(piece.curves)) throw new Error(`Invalid curves: ${piece.id}`)
      for (const [edge, curve] of Object.entries(piece.curves)) {
        if (!/^(0|[1-9]\d*)$/.test(edge) || Number(edge) >= piece.points.length || !curve || !finite(curve.cx) || !finite(curve.cy)) throw new Error(`Invalid or nonfinite curve: ${piece.id} edge ${edge}`)
      }
    }
    if (piece.seamAllowance != null && (!finite(piece.seamAllowance) || piece.seamAllowance < 0)) throw new Error(`Invalid seam allowance: ${piece.id}`)
    for (const [edge, allowance] of Object.entries(piece.edgeSeamAllowances || {})) {
      if (!/^(0|[1-9]\d*)$/.test(edge) || Number(edge) >= piece.points.length || !finite(allowance) || allowance < 0) throw new Error(`Invalid edge allowance: ${piece.id}`)
    }
    if (piece.notches != null && !Array.isArray(piece.notches)) throw new Error(`Invalid notches: ${piece.id}`)
    const notchIds = new Set()
    for (const notch of piece.notches || []) {
      if (!validId(notch?.id) || notchIds.has(notch.id) || !Number.isInteger(notch.edgeIndex) || notch.edgeIndex < 0 || notch.edgeIndex >= piece.points.length || !finite(notch.t) || notch.t < 0 || notch.t > 1 || !['single', 'double'].includes(notch.type) || (notch.depthCm != null && (!finite(notch.depthCm) || notch.depthCm <= 0))) throw new Error(`Invalid explicit notch: ${piece.id}`)
      notchIds.add(notch.id)
    }
    for (const line of piece.internalLines || []) if (!validPoint(line?.a) || !validPoint(line?.b) || (line.widthCm != null && !finite(line.widthCm))) throw new Error(`Invalid internal line: ${piece.id}`)
    if (piece.grainAngleDeg != null && !finite(piece.grainAngleDeg)) throw new Error(`Invalid grain angle: ${piece.id}`)
    for (const buttonhole of piece.buttonholes || []) {
      if (!validPoint(buttonhole) || (buttonhole.orientationDeg != null && !finite(buttonhole.orientationDeg)) || (buttonhole.lengthCm != null && (!finite(buttonhole.lengthCm) || buttonhole.lengthCm <= 0))) throw new Error(`Invalid buttonhole: ${piece.id}`)
    }
    pieces.set(piece.id, piece)
  }
  const seamIds = new Set()
  for (const seam of project.seams) {
    if (!validId(seam?.id) || seamIds.has(seam.id)) throw new Error(`Duplicate or invalid seam ID: ${String(seam?.id)}`)
    seamIds.add(seam.id)
    for (const side of ['a', 'b']) {
      const endpoint = seam[side]
      const piece = pieces.get(endpoint?.pieceId)
      if (!piece || !Number.isInteger(endpoint.edgeIndex) || endpoint.edgeIndex < 0 || endpoint.edgeIndex >= piece.points.length) throw new Error(`Invalid seam ${seam.id} ${side} endpoint`)
    }
    if (seam.a.pieceId === seam.b.pieceId && seam.a.edgeIndex === seam.b.edgeIndex) throw new Error(`Identical sew sides: ${seam.id}`)
  }
  if (expected) {
    if (project.pieces.length !== expected.pieces.length || project.seams.length !== expected.seams.length) throw new Error('Graded topology count changed')
    for (let i = 0; i < expected.pieces.length; i++) {
      const before = expected.pieces[i], after = project.pieces[i]
      if (before.id !== after.id || before.points.length !== after.points.length || JSON.stringify(Object.keys(before.curves || {}).sort()) !== JSON.stringify(Object.keys(after.curves || {}).sort())) throw new Error(`Graded piece geometry identity changed: ${before.id}`)
      if (JSON.stringify((before.notches || []).map(n => [n.id, n.edgeIndex])) !== JSON.stringify((after.notches || []).map(n => [n.id, n.edgeIndex]))) throw new Error(`Graded notch identity changed: ${before.id}`)
    }
    for (let i = 0; i < expected.seams.length; i++) {
      const a = expected.seams[i], b = project.seams[i]
      if (a.id !== b.id || a.a.pieceId !== b.a.pieceId || a.a.edgeIndex !== b.a.edgeIndex || a.b.pieceId !== b.b.pieceId || a.b.edgeIndex !== b.b.edgeIndex) throw new Error(`Graded seam topology changed: ${a.id}`)
    }
  }
}

/** Preflight for a development DXF. Physical factory release requires additional independent acceptance. */
export function exportAccuMarkVerifiedSizeDxf20261023(source, size, options = {}) {
  try {
    verify(source)
    if (!validId(size) || !source.grading.sizes.includes(size)) throw new Error(`Unknown or stale grading size: ${String(size)}`)
    if (options == null || typeof options !== 'object' || Array.isArray(options)) throw new Error('Invalid export options')
    if (Object.hasOwn(options, 'cutlineMode') && options.cutlineMode !== 'manufacturing') throw new Error('Factory cutline mode cannot be overridden')
    if (Object.hasOwn(options, 'requireGradedGeometry') && options.requireGradedGeometry !== true) throw new Error('Graded geometry requirement cannot be disabled')
    // Validate the actual exported physical CUT outlines for every size.
    // The DXF exporter historically positions pieces using STITCH widths;
    // large allowances can make otherwise-valid CUT polygons overlap.
    // Reject rather than handing a silently unsafe physical layout to a cutter.
    let selectedDxf
    for (const candidate of source.grading.sizes) {
      const graded = gradeProject(source, candidate)
      if (graded.previewSize !== candidate) throw new Error(`Grading did not mark selected size: ${candidate}`)
      verify(graded, source)
      const candidateDxf = projectToDxf(graded, candidate, { ...options, cutlineMode: 'manufacturing', requireGradedGeometry: true })
      const cutAudit = preflightPhysicalCutOverlap20261023_2000(candidateDxf)
      if (!cutAudit.ok) {
        const codes = cutAudit.diagnostics.map(item => item.code + ': ' + item.detail).join('; ')
        throw new Error(`Unsafe physical CUT packing for ${candidate}: ${codes}`)
      }
      if (cutAudit.contourCount !== graded.pieces.length) {
        throw new Error(`Incomplete physical CUT packing for ${candidate}: ${cutAudit.contourCount} of ${graded.pieces.length} pieces`)
      }
      if (candidate === size) selectedDxf = candidateDxf
    }
    if (typeof selectedDxf !== 'string' || !selectedDxf.includes('CUT_') || !selectedDxf.includes('STITCH_') || !selectedDxf.includes(size)) throw new Error('Manufacturing DXF missing CUT/STITCH or size')
    return { ok: true, dxf: selectedDxf, size, manufacturingApproved: false }
  } catch (error) {
    return { ok: false, reason: `DXF preflight refused: ${error instanceof Error ? error.message : String(error)}`, manufacturingApproved: false }
  }
}
