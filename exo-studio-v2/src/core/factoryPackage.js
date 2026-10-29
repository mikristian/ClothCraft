import { strToU8, zipSync } from 'fflate'
import { buildSizeRun, gradeProject } from './grading.js'
import { buildFabricMarkers } from './marker.js'
import { buildTechPack, measurementRunToCSV } from './measurements.js'
import { projectToDxf } from './dxf.js'
import { pieceArea, seamLengthReport } from './project.js'
import { inspectProduction } from './productionPreflight.js'
import { inspectIndustrialPatterns } from './industrialPatternQA.js'
import {createFactorySampleWorksheet,inspectFactorySampleEvidence} from './factorySampleApproval.js'
import {createTeeNeckbandSampleSet} from './teeNeckbandSample.js'
import {inspectGradedNotchPairs} from './industrialNotchQA.js'
import {inspectGradedCutlines} from './industrialCutlineQA.js'
import {auditGradedSizeRunGeometry} from './gradedSizeRunGeometryAudit.js'
import {inspectManufacturingReleaseReadiness} from './manufacturingReleaseReadiness.js'
import {inspectGradedSeamJunctions,JEANS501_YOKE_JUNCTIONS} from './gradedSeamJunctionQA.js'
import { projectToBomXml } from './bomXml.js'
import { markerToPdf, markerToSvg } from './markerArtifacts.js'
import { buildFabricCostRun, fabricCostRunToCsv } from './productionCost.js'
import { normalizeWashSpec } from './clothWashProcedurals.js'
import { gradeRulesToCsv } from './gradeRuleCsv.js'
import { sha256Bytes } from './sha256Bytes.js'
import {createRecipientCadExchangeProtocol} from './recipientCadExchangeProtocol.js'
import { preflightPhysicalCutOverlap20261023_2000 } from './physicalCutOverlapPreflight20261023_2000.mjs'
import { auditMarkerDxfGeometryParity20261024 } from './accumarkMarkerDxfGeometryParity20261024.mjs'
import { auditMarkerPlotParity20261024 } from './accumarkMarkerPlotParity20261024.mjs'
import { makeMarkerCalibrationSheet20261024 } from './accumarkMarkerCalibrationSheet20261024.mjs'
import { auditMarkerRulerInkClearance20261024 } from './accumarkMarkerRulerInkClearance20261024.mjs'

function csvCell(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`
}

function csv(rows) {
  return rows.map((row) => row.map(csvCell).join(',')).join('\n')
}

function slug(value) {
  return String(value || 'garment').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'garment'
}

function safeFactoryPath(path) {
  // ZIP names are portable ASCII paths; rejecting rather than rewriting avoids
  // ambiguous extraction on case-insensitive or Unicode-normalizing filesystems.
  if (typeof path !== 'string' || path.length > 240 || !/^[\x21-\x7e]+$/.test(path) ||
      path.includes('\\') || path.startsWith('/') || /^[a-z]:/i.test(path) ||
      path.split('/').some(part => !part || part === '.' || part === '..' ||
        part.length > 120 || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(part) || part.includes('..'))) {
    throw new Error(`Factory package refused: unsafe ZIP path ${JSON.stringify(path)}`)
  }
  return path.toLowerCase()
}

function validateFactorySizeFilenames(sizes, nameSlug) {
  const refuse = reason => { throw new Error(`Factory package refused: ${reason}`) }
  if (!Array.isArray(sizes) || sizes.length < 1 || sizes.length > 32) refuse('grading size count must be 1–32')
  const paths = new Set()
  for (const size of sizes) {
    if (typeof size !== 'string' || size.length > 64 ||
        !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(size) || size.includes('..')) {
      refuse(`unsafe grading size filename ${JSON.stringify(size)}`)
    }
    for (const path of [`patterns/${nameSlug}-${size.toLowerCase()}.dxf`,
      `markers/${nameSlug}-main-${slug(size)}.svg`,
      `tee-development/neckband-proposal-${slug(size)}.dxf`]) {
      const key = safeFactoryPath(path)
      if (paths.has(key)) refuse(`colliding grading size filenames: ${JSON.stringify(size)}`)
      paths.add(key)
    }
  }
}

function htmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function htmlTable(rows, options = {}) {
  const [header = [], ...body] = rows
  return `<table class="${options.className || ''}"><thead><tr>${header.map((cell) => `<th>${htmlEscape(cell)}</th>`).join('')}</tr></thead><tbody>${body.map((row) => `<tr>${row.map((cell) => `<td>${htmlEscape(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
}

function materialRows(project) {
  const rows = [[
    'Fabric ID', 'Material', 'Color', 'GSM', 'Thickness mm',
    'Warp stretch %', 'Weft stretch %', 'Warp shrink %', 'Weft shrink %',
    'Bending', 'Friction', 'Damping', 'Roughness', 'Sheen', 'Opacity', 'Surface family', 'Visual displacement mm',
    'Color map', 'Normal map', 'Roughness map', 'Metalness map', 'Opacity map', 'Displacement map',
    'Digital wash effect', 'Digital wash strength', 'Visual blend', 'Absorbency look', 'Wear cycle look',
    'UV-edge fade', 'Digital wash placement', 'Wash reference disclaimer',
    'Cut pieces', 'Approx pattern area cm2',
  ]]
  for (const [fabricId, fabric] of Object.entries(project.fabrics || {})) {
    const pieces = (project.pieces || []).filter((piece) => (piece.fabricId || 'main') === fabricId)
    const cutPieces = pieces.reduce((sum, piece) => sum + Math.max(1, Math.round(Number(piece.cutQuantity || 1))), 0)
    const area = pieces.reduce((sum, piece) => sum + pieceArea(piece) * Math.max(1, Math.round(Number(piece.cutQuantity || 1))), 0)
    rows.push([
      fabricId,
      fabric.name || fabricId,
      fabric.color || '',
      fabric.gsm ?? '',
      Number.isFinite(Number(fabric.thickness)) ? (Number(fabric.thickness) * 1000).toFixed(2) : '',
      Number.isFinite(Number(fabric.stretchWarp)) ? (Number(fabric.stretchWarp) * 100).toFixed(1) : '',
      Number.isFinite(Number(fabric.stretchWeft)) ? (Number(fabric.stretchWeft) * 100).toFixed(1) : '',
      Number.isFinite(Number(fabric.shrinkWarp)) ? (Number(fabric.shrinkWarp) * 100).toFixed(1) : '',
      Number.isFinite(Number(fabric.shrinkWeft)) ? (Number(fabric.shrinkWeft) * 100).toFixed(1) : '',
      Number.isFinite(Number(fabric.bend)) ? Number(fabric.bend).toFixed(3) : '',
      Number.isFinite(Number(fabric.friction)) ? Number(fabric.friction).toFixed(3) : '',
      Number.isFinite(Number(fabric.damping)) ? Number(fabric.damping).toFixed(4) : '',
      Number.isFinite(Number(fabric.roughness)) ? Number(fabric.roughness).toFixed(3) : '',
      Number.isFinite(Number(fabric.sheen)) ? Number(fabric.sheen).toFixed(3) : '',
      Number.isFinite(Number(fabric.opacity ?? 1)) ? Number(fabric.opacity ?? 1).toFixed(3) : '',
      fabric.surfaceFamily || 'auto',
      Number.isFinite(Number(fabric.displacementMm ?? 0)) ? Number(fabric.displacementMm ?? 0).toFixed(2) : '',
      fabric.texture?.name || '',
      fabric.texture?.normalName || '',
      fabric.texture?.roughnessName || '',
      fabric.texture?.metalnessName || '',
      fabric.texture?.opacityName || '',
      fabric.texture?.displacementName || '',
      normalizeWashSpec(fabric.wash).type,
      normalizeWashSpec(fabric.wash).strength.toFixed(2),
      normalizeWashSpec(fabric.wash).blend,
      normalizeWashSpec(fabric.wash).absorbency.toFixed(2),
      normalizeWashSpec(fabric.wash).cycleDuration.toFixed(2),
      normalizeWashSpec(fabric.wash).seamAbrasion.toFixed(2),
      JSON.stringify({scale:normalizeWashSpec(fabric.wash).scale,placement:normalizeWashSpec(fabric.wash).placement,rotation:normalizeWashSpec(fabric.wash).rotation,seed:normalizeWashSpec(fabric.wash).seed}),
      'Digital appearance target only; manufacturer must physically sample and approve',
      cutPieces,
      area.toFixed(1),
    ])
  }
  return rows
}

function pieceRows(project) {
  const rows = [[
    'Piece ID', 'Pattern piece', 'Role', 'Attached / fused to', 'Fabric ID', 'Cut quantity', 'Seam allowance cm',
    'Grain angle deg', 'Layer', 'Area cm2', 'Notches', 'Internal lines',
    'Topstitch specs', 'Bindings', 'Graphics', 'Custom grade points', 'Custom edge allowances', 'Matched notches',
  ]]
  for (const piece of project.pieces || []) {
    rows.push([
      piece.id,
      piece.name,
      piece.generatedRole || 'shell',
      piece.fusedToPieceId || piece.liningForPieceId || '',
      piece.fabricId || 'main',
      Math.max(1, Math.round(Number(piece.cutQuantity || 1))),
      Number(piece.seamAllowance || 0).toFixed(2),
      Number(piece.grainAngleDeg || 0).toFixed(1),
      Math.round(Number(piece.layerIndex || 0)),
      pieceArea(piece).toFixed(1),
      (piece.notches || []).length,
      (piece.internalLines || []).length,
      (piece.topstitches || []).length,
      (piece.bindings || []).length,
      (piece.graphics || []).length,
      (piece.points || []).filter((point) => point.gradeRule?.enabled).length,
      Object.keys(piece.edgeSeamAllowances || {}).length,
      (piece.notches || []).filter((notch) => notch.matchGroupId).length,
    ])
  }
  return rows
}

function constructionRows(project) {
  const rows = [[
    'Seam ID', 'Construction', 'Type', 'A piece', 'A edge', 'B piece', 'B edge',
    'A start %', 'A end %', 'B start %', 'B end %',
    'Reverse B', 'Treatment ratio', 'Ease/gather side', 'Open fraction',
    'A length cm', 'B length cm', 'Difference cm', 'Mismatch %', 'Status',
  ]]
  for (const seam of project.seams || []) {
    const report = seamLengthReport(project, seam)
    rows.push([
      seam.id,
      seam.name || seam.id,
      seam.type || 'normal',
      seam.a?.pieceId || '',
      seam.a?.edgeIndex ?? '',
      seam.b?.pieceId || '',
      seam.b?.edgeIndex ?? '',
      ((seam.a?.startT ?? 0) * 100).toFixed(1),
      ((seam.a?.endT ?? 1) * 100).toFixed(1),
      ((seam.b?.startT ?? 0) * 100).toFixed(1),
      ((seam.b?.endT ?? 1) * 100).toFixed(1),
      seam.reverseB ? 'yes' : 'no',
      seam.ratio ?? '',
      seam.easeSide || seam.gatherSide || '',
      seam.openFraction ?? '',
      report.lengthA.toFixed(2),
      report.lengthB.toFixed(2),
      report.difference.toFixed(2),
      report.mismatchPercent.toFixed(2),
      report.status,
    ])
  }
  return rows
}

function markerRows(project) {
  const width = project.markerSettings?.fabricWidthCm ?? 150
  const gap = project.markerSettings?.gapCm ?? 1.5
  const sizes = project.grading?.sizes || [project.grading?.baseSize || 'M']
  const rows = [['Size', 'Fabric ID', 'Material', 'Fabric width cm', 'Gap cm', 'Marker length cm', 'Efficiency %', 'Requested pieces', 'Placed pieces', 'Unplaced pieces', 'Unplaced detail']]
  for (const size of sizes) {
    const graded = gradeProject(project, size)
    const markers = buildFabricMarkers(graded, width, gap)
    for (const [fabricId, marker] of Object.entries(markers)) {
      rows.push([
        size,
        fabricId,
        project.fabrics?.[fabricId]?.name || fabricId,
        marker.width.toFixed(1),
        marker.gap.toFixed(1),
        marker.length.toFixed(2),
        (marker.efficiency * 100).toFixed(1),
        marker.requestedPieces,
        marker.placements.length,
        marker.unusedPieces,
        (marker.unplaced || []).map((item) => `${item.name}${item.minimumWidthCm ? ` needs >=${item.minimumWidthCm.toFixed(1)} cm` : ''}`).join('; '),
      ])
    }
  }
  return rows
}

function trimHardware(project) {
  return {
    pointFasteners: project.fasteners || [],
    zippers: (project.pieces || []).flatMap((piece) => (piece.zippers || []).map((zipper) => ({ pieceId: piece.id, ...zipper }))),
    buttons: (project.pieces || []).flatMap((piece) => (piece.buttons || []).map((button) => ({ pieceId: piece.id, ...button }))),
    buttonholes: (project.pieces || []).flatMap((piece) => (piece.buttonholes || []).map((buttonhole) => ({ pieceId: piece.id, ...buttonhole }))),
    bindings: (project.pieces || []).flatMap((piece) => (piece.bindings || []).map((binding) => ({ pieceId: piece.id, ...binding }))),
    topstitches: (project.pieces || []).flatMap((piece) => (piece.topstitches || []).map((stitch) => ({ pieceId: piece.id, ...stitch }))),
  }
}

function factorySpecHtml(project) {
  const techPack = buildTechPack(project)
  const sizes = project.grading?.sizes || [project.grading?.baseSize || 'M']
  const measurements = techPack.sizeMeasurements || {}
  const pomIds = measurements[sizes[0]]?.map((measurement) => measurement.id) || []
  const pomRows = [['POM', 'Tolerance', ...sizes]]
  for (const id of pomIds) {
    const first = measurements[sizes[0]]?.find((measurement) => measurement.id === id)
    pomRows.push([
      first?.label || id,
      `±${first?.toleranceCm ?? ''} cm`,
      ...sizes.map((size) => `${measurements[size]?.find((measurement) => measurement.id === id)?.cm ?? ''}`),
    ])
  }
  const seamRows = constructionRows(project)
  const markerSummary = markerRows(project)
  const fabricCostReport = buildFabricCostRun(project)
  const costRows = [['Size', 'Fabric', 'Length m', 'Unit price/m', 'Fabric cost', 'Status'], ...fabricCostReport.rows.map((row) => [
    row.size, row.material, row.lengthMeters.toFixed(2), row.pricePerMeter === null ? 'Not set' : `${row.currency} ${row.pricePerMeter.toFixed(2)}`,
    row.extendedCost === null ? 'Not available' : `${row.currency} ${row.extendedCost.toFixed(2)}`, row.status,
  ])]
  const materials = materialRows(project)
  const pieces = pieceRows(project)
  const warnings = (project.seams || [])
    .map((seam) => ({ seam, report: seamLengthReport(project, seam) }))
    .filter(({ report }) => report.status !== 'good')
  const markerWarnings = []
  for (const [size, markerSet] of Object.entries(techPack.markers || {})) {
    for (const [fabricId, marker] of Object.entries(markerSet.byFabric || {})) {
      if (!marker.unusedPieces) continue
      markerWarnings.push({
        size,
        fabricId,
        material: project.fabrics?.[fabricId]?.name || fabricId,
        unplaced: marker.unplaced || [],
      })
    }
  }

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${htmlEscape(project.name)} · Factory Spec</title><style>
@page{size:A4 landscape;margin:12mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0;font-size:10px}h1{font-size:24px;margin:0 0 3px}h2{font-size:14px;margin:22px 0 7px;border-bottom:1px solid #111;padding-bottom:4px}.meta{display:flex;gap:28px;margin:0 0 18px;color:#444}.meta strong{color:#111}.notice{padding:8px 10px;border:1px solid #ccc;background:#f6f6f6;margin:8px 0}.warning{border-color:#b67a28;background:#fff8ea}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}table{width:100%;border-collapse:collapse;margin:0 0 12px;page-break-inside:auto}th,td{border:1px solid #bbb;padding:4px 5px;vertical-align:top;text-align:left}th{background:#efefef;font-size:9px}td{font-size:9px}tr{page-break-inside:avoid}.small td,.small th{font-size:8px}.footer{margin-top:18px;font-size:8px;color:#666}.page-break{page-break-before:always}@media print{h2{page-break-after:avoid}}
</style></head><body>
<h1>${htmlEscape(project.name)}</h1>
<div class="meta"><span><strong>Revision:</strong> ${htmlEscape(project.revision ?? 1)}</span><span><strong>Base size:</strong> ${htmlEscape(project.grading?.baseSize || 'M')}</span><span><strong>Size range:</strong> ${htmlEscape(sizes.join(' / '))}</span><span><strong>Units:</strong> ${htmlEscape(project.units || 'cm')}</span></div>
<div class="notice">This sheet is generated from the editable Garment Studio document. Verify physical samples, material lots, seam construction, shrinkage, and tolerances before bulk production.</div>
${warnings.length ? `<div class="notice warning"><strong>Seam review:</strong> ${warnings.length} seam${warnings.length === 1 ? '' : 's'} exceed the 2% matched-edge threshold. Review the Construction table before sewing.</div>` : ''}
${markerWarnings.length ? `<div class="notice warning"><strong>Marker review:</strong> ${htmlEscape(markerWarnings.map((item) => `${item.size} ${item.material}: ${item.unplaced.map((entry) => `${entry.name}${entry.minimumWidthCm ? ` needs ≥${entry.minimumWidthCm.toFixed(1)} cm` : ''}`).join(', ')}`).join(' · '))}. These marker lengths are incomplete until every requested piece is placed.</div>` : ''}
<h2>Point of Measurement · Full Size Run</h2>${htmlTable(pomRows)}
<div class="page-break"></div><h2>Materials / BOM</h2>${htmlTable(materials)}
<h2>Pattern Pieces</h2>${htmlTable(pieces, { className: 'small' })}
<div class="page-break"></div><h2>Construction / Seam Diagnostics</h2>${htmlTable(seamRows, { className: 'small' })}
<h2>Marker Summary</h2>${htmlTable(markerSummary)}
<h2>Estimated Fabric Consumption & Costs</h2><div class="notice">Per garment size, from the current cutting marker. Missing prices and incomplete markers are not assumed free. Excludes trims, labor, taxes, shipping, shrinkage allowance and physical sampling.</div>${htmlTable(costRows)}
<h2>Avatar / Fit Reference</h2>${htmlTable([
    ['Height cm', 'Chest cm', 'Waist cm', 'Hip cm', 'Shoulder width cm', 'Neck cm', 'Bicep cm', 'Arm length cm', 'Arm pose deg'],
    [project.avatar?.heightCm ?? '', project.avatar?.chestCm ?? '', project.avatar?.waistCm ?? '', project.avatar?.hipCm ?? '', project.avatar?.shoulderWidthCm ?? 46, project.avatar?.neckCm ?? 38, project.avatar?.bicepCm ?? 32, project.avatar?.armLengthCm ?? Number((72 * Number(project.avatar?.heightCm ?? 180) / 180).toFixed(1)), project.avatar?.armAngleDeg ?? ''],
  ])}
<div class="footer">DXF files, trims/hardware data, graded source data, and the editable garment document are included alongside this sheet in the factory package.</div>
</body></html>`
}

function validateSharedFactoryInput(project) {
  const refuse = reason => { throw new Error(`Factory package refused: ${reason}`) }
  if (!project || !Array.isArray(project.pieces) || !Array.isArray(project.seams)) refuse('pieces and seams must be arrays')
  const pieces = new Map()
  for (const piece of project.pieces) {
    if (!piece || typeof piece.id !== 'string' || !piece.id.trim() || pieces.has(piece.id)) refuse('missing or duplicate piece ID')
    if (!Array.isArray(piece.points) || piece.points.length < 3 || piece.points.some(p => !Number.isFinite(p?.x) || !Number.isFinite(p?.y))) refuse(`invalid points for piece ${piece.id}`)
    pieces.set(piece.id, piece)
  }
  const seamIds = new Set()
  for (const seam of project.seams) {
    if (!seam || typeof seam.id !== 'string' || !seam.id.trim() || seamIds.has(seam.id)) refuse('missing or duplicate seam ID')
    seamIds.add(seam.id)
    for (const sideName of ['a', 'b']) {
      const side = seam[sideName]
      const piece = side && pieces.get(side.pieceId)
      if (!piece || !Number.isInteger(side.edgeIndex) || side.edgeIndex < 0 || side.edgeIndex >= piece.points.length) refuse(`invalid ${sideName} sewing reference in seam ${seam.id}`)
      const start = side.startT === undefined ? 0 : side.startT
      const end = side.endT === undefined ? 1 : side.endT
      if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end > 1 || start >= end) refuse(`invalid ${sideName} sewn interval in seam ${seam.id}`)
    }
    if (seam.a.pieceId === seam.b.pieceId && seam.a.edgeIndex === seam.b.edgeIndex &&
      (seam.a.startT ?? 0) === (seam.b.startT ?? 0) && (seam.a.endT ?? 1) === (seam.b.endT ?? 1)) refuse(`identical sewing sides in seam ${seam.id}`)
  }
  const sizes = project.grading?.sizes || [project.grading?.baseSize || 'M']
  const nameSlug = slug(project.name)
  validateFactorySizeFilenames(sizes, nameSlug)
  // Fabric IDs only compete for marker filenames when the fabric is used by a
  // cut piece. The insertion guard below also covers actual marker outputs.
  const markerFabricSlugs = new Set()
  for (const piece of project.pieces) {
    const id = piece.fabricId || 'main'
    if (typeof id !== 'string' || id.length > 120) refuse('invalid marker fabric ID')
    markerFabricSlugs.add(id)
  }
  const markerSlugOwners = new Map()
  for (const id of markerFabricSlugs) {
    const key = slug(id)
    if (markerSlugOwners.has(key)) refuse(`colliding marker fabric IDs: ${JSON.stringify(markerSlugOwners.get(key))} and ${JSON.stringify(id)}`)
    markerSlugOwners.set(key, id)
  }
  const validatedDxfBySize = new Map()
  for (const size of sizes) {
    const graded = gradeProject(project, size)
    const dxf = projectToDxf(graded, size, {cutlineMode:'manufacturing',requireGradedGeometry:true})
    const audit = preflightPhysicalCutOverlap20261023_2000(dxf)
    if (!audit.ok || audit.contourCount !== graded.pieces.length) {
      const detail = (audit.diagnostics || []).map(d => `${d.code}: ${d.detail}`).join('; ')
      refuse(`unsafe physical CUT contours for ${size}: ${detail || `incomplete contours ${audit.contourCount}/${graded.pieces.length}`}`)
    }
    if (!dxf.includes('CUT_') || !dxf.includes('STITCH_')) refuse(`missing manufacturing CUT/STITCH layers for ${size}`)
    // String values are immutable; keep the exact audited DXF private to this
    // invocation so every packaged pattern uses the audited text verbatim.
    validatedDxfBySize.set(size, dxf)
  }
  return validatedDxfBySize
}

export function buildFactoryPackageFiles(project) {
  if (project?.patternSource?.referenceOnly || (Array.isArray(project?.pieces) && project.pieces.some(piece=>piece?.patternImportProvenance?.referenceOnly))) {
    throw new Error('Factory package refused: a CUT/STITCH DXF reference is not an authored graded garment. Restore garment-source.json, redraw and verify the sewing/cutting rules, then sample before export.')
  }
  const validatedDxfBySize = validateSharedFactoryInput(project)
  const nameSlug = slug(project.name)
  const sizes = project.grading?.sizes || [project.grading?.baseSize || 'M']
  const files = {}
  const writtenPaths = new Set()
  const addFile = (path, bytes) => {
    const key = safeFactoryPath(path)
    if (writtenPaths.has(key)) throw new Error(`Factory package refused: duplicate ZIP path ${JSON.stringify(path)}`)
    writtenPaths.add(key)
    files[path] = bytes
  }
  const addText = (path, text) => addFile(path, strToU8(text))
  const markerWidth = project.markerSettings?.fabricWidthCm ?? 150
  const markerGap = project.markerSettings?.gapCm ?? 1.5
  // Verify the actual marker placements against the exact manufacturing DXF
  // text already checked above. Reuse these same placements when packaging so
  // neither the cutting contours nor the marker geometry is regenerated after
  // this gate. An internal geometric pass is NOT factory acceptance.
  const gradedBySize = Object.create(null)
  const markersBySize = Object.create(null)
  for (const size of sizes) {
    gradedBySize[size] = gradeProject(project, size)
    markersBySize[size] = buildFabricMarkers(gradedBySize[size], markerWidth, markerGap)
  }
  const markerDxfAudit = auditMarkerDxfGeometryParity20261024(
    { ...project, grading: { ...(project.grading || {}), sizes } },
    {
      dxfBySize: Object.fromEntries(validatedDxfBySize),
      gradedBySize, markersBySize,
      defaultFabricWidth: markerWidth, gap: markerGap,
    },
  )
  if (!markerDxfAudit.ok || markerDxfAudit.sizes.length !== sizes.length) {
    const details = markerDxfAudit.issues.slice(0, 6).map(issue =>
      `${issue.code} (${issue.size || 'unknown size'}${issue.pieceId ? `/${issue.pieceId}` : ''}): ${issue.detail || ''}`,
    ).join('; ')
    throw new Error(`Factory package refused: marker/DXF physical CUT parity failed: ${details || 'incomplete size coverage'}`)
  }

  addText('README.txt', [
    `GARMENT STUDIO FACTORY PACKAGE`,
    `Project: ${project.name}`,
    `Revision: ${project.revision ?? 1}`,
    `Units: ${project.units || 'cm'}`,
    `Base size: ${project.grading?.baseSize || 'M'}`,
    `Sizes: ${sizes.join(', ')}`,
    '',
    'CONTENTS',
    '- tech-pack.json: structured production specification and full POM size run',
    '- factory-spec.html: print-ready human-readable factory sheet',
    '- pom-spec.csv: point-of-measurement table with tolerances across sizes',
    '- materials-bom.csv: materials, physical properties, cut quantities, and approximate usage area',
    '- fabric-costing.csv: graded fabric meter consumption and optional supplier prices (null until entered)',
    '- bom.xml: open Garment Studio XML BOM (not proprietary CLO XML)',
    '- production-preflight.json: structural checks and all-size marker overflow report',
    '- industrial-pattern-qa.json: per-size seam, contour and POM checks; NOT factory certification',
    '- industrial-pattern-issues.csv: human-readable all-size QA blockers, including affected size and seam (never silently skipped)',
    '- industrial-pattern-seam-walk.csv: actual A/B stitchline lengths, signed mismatch and per-size pass/fail for every sewing pair',
    '- industrial-notch-qa.json and industrial-notch-walk.csv: per-size physical arclength matching of explicitly paired sewing notches; no inferred human approval',
    '- industrial-cutline-qa.json and industrial-cutline-areas.csv: tested, non-self-intersecting physical cutting outlines vs separate sewing outlines for all sizes',
    '- marker-dxf-geometry-qa.json: internal marker-to-exact-validated-DXF physical CUT geometry comparison, NOT independent factory approval',
    '- marker-plot-geometry-qa.json: internal verification of exact SVG/PDF bytes, cutting contours, page dimensions, rulers and printable multi-page registration ink; NOT physical plotter calibration or factory approval',
    '- graded-geometry-qa.json and graded-geometry-issues.csv: cross-size winding, collapsed-edge and area-collapse audit, not factory certification',
    '- graded-seam-junction-qa.json: explicit base-aligned sewn corner continuity across sizes; jeans 501 yoke joints require fully verified grade displacement',
    '- manufacturing-release-readiness.json: explicitly blocked engineering/physical release gate; never a factory signature or cut authorization',
    '- factory-sample-worksheet.json: UNAPPROVED per-size cutting, POM, print scale, sewn fit and independent CAD acceptance records for the manufacturer to complete',
    '- factory-sample-approval-gate.json: unresolved human approval and physical evidence blockers; cannot be signed off automatically',
    '- tee-development/* (Foundation Tee only): PROPOSED, UNAPPROVED XS–XXL rib-neckband cut geometry, manufacturing assumptions and separate cutting DXFs; absent from approved marker/BOM',
    '- pattern-pieces.csv: pattern production metadata and custom grading rule counts',
    '- construction-seams.csv: sewing graph, treatment settings, edge lengths, and mismatch diagnostics',
    '- marker-summary.csv: marker length and efficiency for every graded size',
    '- trims-hardware.json: fasteners, zippers, buttons, buttonholes, bindings, and topstitch specifications',
    '- size-run.json: complete graded garment data for every configured size',
    '- garment-source.json: editable Garment Studio source document',
    '- recipient-cad-acceptance-plan.json: size/point-specific receiving-CAD checklist, outbound generic DXF digests and empty Gerber/Lectra evidence slots (never a vendor approval)',
    '- manifest.json: v2 SHA-256 integrity digests for every ZIP file, plus verified authored source and complete graded size-run (content integrity, NOT a signed factory approval)',
    '- grading-rules/*.csv: editable point-by-point X/Y grading increments per pattern piece, base coordinates retained for safe reimport',
    '- industrial-grading/*.json: optional nonuniform Gerber-style incremental/cumulative per-point rule data; CSV cannot preserve break-specific rules',
    '- patterns/*.dxf: development-only manufacturing-mode DXF: CUT means physical allowance offset; STITCH means sewing line. Not AAMA/ASTM certified.',
    '- IMPORT SAFETY: do not open manufacturing CUT as an editable sewing pattern. CUT already includes seam allowances; automatic reimport would create an unsafe double allowance.',
    '- Editable recovery: use garment-source.json, preserving source curves, per-point grading, sewing assignments and construction data. Re-imported DXF is reference-only and cannot be shipped as an approved factory project.',
    '- markers/*.svg: true-size vector print-layout drawings; in-page 100 mm ruler only when digital ruler-ink clearance passes',
    '- markers/*.pdf: true-size plotter PDF (when any pattern fits; print at 100%); in-page ruler omitted when its ink would collide with cutting geometry or labels',
    '- Calibrated PDF page labels and EXOPageIndex/EXOStartCm/EXOEndCm metadata identify digital page order and global stations. They DO NOT print on paper or provide physical registration targets. Do not tape/join pages for cutting without separately verified physical alignment.',
    '- print-calibration/*.svg/.pdf: separate 100 mm X/Y witness sheets for narrow/short markers OR unsafe in-page ruler ink; NOT CUT DATA. Do not feed this directory to a cutter.',
    '- Before cutting: print with scaling OFF (100% / actual size); measure every on-page ruler, or print each separate calibration sheet on the SAME device, media and settings as its marker and measure BOTH 100 mm axes. Reject any mismatch.',
    '- Factory CAD import, plotter/media support and physical fit still require separate verification. These markers are not factory certified.',
    '',
    `Marker settings: ${markerWidth} cm default fabric width, ${markerGap} cm gap. Per-fabric widths: ${JSON.stringify(project.markerSettings?.fabricWidthsCm || {})}.`,
    'Review seam mismatch warnings/errors and marker overflow before bulk production. Sample physically before bulk production.',
  ].join('\n'))
  addText('marker-dxf-geometry-qa.json', JSON.stringify(markerDxfAudit, null, 2))

  addText('tech-pack.json', JSON.stringify(buildTechPack(project), null, 2))
  addText('factory-spec.html', factorySpecHtml(project))
  addText('pom-spec.csv', measurementRunToCSV(project))
  addText('materials-bom.csv', csv(materialRows(project)))
  addText('fabric-costing.csv', fabricCostRunToCsv(buildFabricCostRun(project)))
  addText('bom.xml', projectToBomXml(project))
  const productionQa=inspectProduction(project)
  addText('production-preflight.json', JSON.stringify(productionQa, null, 2))
  const industrialQa = inspectIndustrialPatterns(project)
  addText('industrial-pattern-qa.json', JSON.stringify(industrialQa, null, 2))
  addText('industrial-pattern-issues.csv', csv([
    ['severity', 'code', 'scope', 'message'],
    ...industrialQa.issues.map(issue => [issue.severity, issue.code, issue.scope, issue.message]),
  ]))
  addText('industrial-pattern-seam-walk.csv', csv([
    ['size', 'seam_id', 'length_a_cm', 'length_b_cm', 'signed_a_minus_b_cm', 'mismatch_percent', 'status'],
    ...industrialQa.seamReports.map(row => [row.size, row.seamId,
      row.lengthA.toFixed(4), row.lengthB.toFixed(4), (row.lengthA-row.lengthB).toFixed(4), row.mismatchPercent.toFixed(3), row.pass ? 'PASS' : 'BLOCKED']),
  ]))
  const notchQa=inspectGradedNotchPairs(project)
  addText('industrial-notch-qa.json',JSON.stringify(notchQa,null,2))
  addText('industrial-notch-walk.csv',csv([
    ['size','group','seam_id','body_or_a_distance_cm','sleeve_or_b_distance_cm','mismatch_cm','tolerance_cm','status'],
    ...notchQa.checks.map(row=>[row.size,row.group,row.seamId,row.fromStartAcm.toFixed(5),
      row.fromStartBcm.toFixed(5),row.offsetCm.toFixed(5),notchQa.toleranceCm.toFixed(5),row.pass?'PASS':'BLOCKED']),
  ]))
  const cutlineQA=inspectGradedCutlines(project)
  addText('industrial-cutline-qa.json',JSON.stringify(cutlineQA,null,2))
  addText('industrial-cutline-areas.csv',csv([
    ['size','piece_id','stitch_area_cm2','physical_cut_area_cm2','additional_allowance_area_cm2','status'],
    ...cutlineQA.checks.map(row=>[row.size,row.pieceId,row.stitchAreaCm2.toFixed(4),row.cutAreaCm2.toFixed(4),
      row.additionalCutAreaCm2.toFixed(4),row.cutlinePass?'PASS':'BLOCKED']),
  ]))
  const gradedGeometryQa=auditGradedSizeRunGeometry(project)
  addText('graded-geometry-qa.json',JSON.stringify({
    ...gradedGeometryQa,factoryCertified:false,
    note:'Tracks grading-induced winding flips, edge and area collapse; does not certify fit, seam ease, materials or factory approval.',
  },null,2))
  addText('graded-geometry-issues.csv',csv([
    ['code','size','piece_id','edge_index','base_area_cm2','graded_area_cm2'],
    ...gradedGeometryQa.issues.map(issue=>[issue.code,issue.size,issue.pieceId,
      issue.edgeIndex??'',issue.baseAreaCm2??'',issue.gradedAreaCm2??'']),
  ]))
  let junctionQa
  try{
    junctionQa=inspectGradedSeamJunctions(project,{
      junctions:project.templateId==='jeans-501'?JEANS501_YOKE_JUNCTIONS:project.gradingJunctionConstraints||[],
    })
  }catch(error){
    junctionQa={status:'blocked',blockers:1,issues:[{code:'JUNCTION_AUDIT_FAILED',severity:'blocker',scope:'Grading',message:error.message}],checks:[],factoryCertified:false}
  }
  addText('graded-seam-junction-qa.json',JSON.stringify(junctionQa,null,2))
  const sampleWorksheet = createFactorySampleWorksheet(project)
  addText('factory-sample-worksheet.json', JSON.stringify(sampleWorksheet,null,2))
  addText('factory-sample-approval-gate.json', JSON.stringify(inspectFactorySampleEvidence(project,sampleWorksheet),null,2))
  addText('recipient-cad-acceptance-plan.json',JSON.stringify(createRecipientCadExchangeProtocol(project),null,2))
  addText('manufacturing-release-readiness.json', JSON.stringify(inspectManufacturingReleaseReadiness(project,{
    checks:{production:productionQa,industrial:industrialQa,
      cutlines:cutlineQA,gradedTopology:gradedGeometryQa,notches:notchQa,junctions:junctionQa},
  }),null,2))
  if (project.productionSpec?.format === 'garment-studio.tee-production-development.v1' &&
      project.productionSpec.neckband?.requiresSeparateNeckbandCutPattern === true) {
    const neckbandSamples=createTeeNeckbandSampleSet(project)
    const rows=neckbandSamples.rows.map(({dxf,piece,...row})=>row)
    addText('tee-development/neckband-proposal.json',JSON.stringify({
      schema:neckbandSamples.schema,projectId:neckbandSamples.projectId,projectRevision:neckbandSamples.projectRevision,
      sizes:neckbandSamples.sizes,rows,factoryCertified:false,
      releaseStatus:'NOT_APPROVED_FOR_CUTTING_OR_BULK_PRODUCTION',
      limitations:[
        'Proposed rib ratio requires real fabric stretch and return-to-shape measurements',
        'Rib grain direction, folding, shrink, machine join and neck finish not validated by a physical sample',
        'Separate neckband pieces are deliberately NOT counted in the production marker, finished garment inventory or signed factory BOM',
        'Requires independent CAD import, full-scale paper checks, cut/sew trials and named factory approval',
      ],
    },null,2))
    addText('tee-development/neckband-proposal.csv',csv([
      ['size','neckline_cm','proposed_sew_length_cm','proposed_cut_length_cm','cut_width_cm','end_join_allowance_cm','ratio','factory_status'],
      ...rows.map(row=>[row.size,row.necklineCm.toFixed(4),row.proposedSewingLengthCm.toFixed(4),row.proposedCutLengthCm.toFixed(4),row.proposedCutWidthCm.toFixed(4),row.endJoinAllowanceCm.toFixed(4),row.proposedSewingRatio,'SAMPLE_REQUIRED']),
    ]))
    for(const row of neckbandSamples.rows) addText(`tee-development/neckband-proposal-${slug(row.size)}.dxf`,row.dxf)
  }
  addText('pattern-pieces.csv', csv(pieceRows(project)))
  addText('construction-seams.csv', csv(constructionRows(project)))
  addText('marker-summary.csv', csv(markerRows(project)))
  addText('trims-hardware.json', JSON.stringify(trimHardware(project), null, 2))
  addText('size-run.json', JSON.stringify(buildSizeRun(project), null, 2))
  addText('garment-source.json', JSON.stringify(project, null, 2))
  for (const [index, piece] of (project.pieces || []).entries()) {
    // Deterministic index prefix prevents duplicate/slug-colliding piece IDs
    // from overwriting one another within the ZIP manifest.
    if (!Array.isArray(piece.points) || !piece.points.length || !piece.id) continue
    const industrial = piece.points.map((point,pointIndex)=>({pointIndex,rule:point.industrialGradeRule})).filter(row=>row.rule)
    // The legacy CSV cannot carry arbitrary unequal size breaks. The full
    // industrial JSON is the only lossless grade interchange for such pieces.
    if (!industrial.length) addText(`grading-rules/${String(index + 1).padStart(3, '0')}-${slug(piece.id)}.csv`, gradeRulesToCsv(piece))
    if (industrial.length) addText(`industrial-grading/${String(index + 1).padStart(3, '0')}-${slug(piece.id)}.json`, JSON.stringify({format:'exo-industrial-grade-rules.v1',pieceId:piece.id,units:'cm',points:industrial},null,2))
  }

  const plotAuditRows = []
  for (const size of sizes) {
    const graded = gradedBySize[size]
    addText(`patterns/${nameSlug}-${String(size).toLowerCase()}.dxf`, validatedDxfBySize.get(size))
    const markerSet = markersBySize[size]
    for (const [fabricId, marker] of Object.entries(markerSet)) {
      const filename = `markers/${nameSlug}-${slug(fabricId)}-${slug(size)}`
      const fabricName = project.fabrics?.[fabricId]?.name || fabricId
      // A byte-perfect plot can still put its scale ruler directly over cut ink.
      // Keep the cutting marker unchanged and use an independently audited,
      // separate calibration sheet when on-page ruler ink is unsafe.
      const rulerAudit = auditMarkerRulerInkClearance20261024(marker, { size, pageLengthCm: 400 })
      if (rulerAudit.issues?.some(issue => issue.code === 'INVALID_RULER_SOURCE'))
        throw new Error(`Factory package refused: invalid ruler clearance source for ${size}/${fabricId}: ${rulerAudit.issues.map(issue => issue.detail).join('; ')}`)
      const separateCalibrationSheet = marker.width < 11 || Math.max(1, marker.length) < 3 || !rulerAudit.ok
      const svg = markerToSvg(marker, { size, fabricName, project: graded, calibration: true, separateCalibrationSheet })
      const pdf = marker.placements.length && marker.length > 0
        ? markerToPdf(marker, { size, project: graded, calibration: true, requirePrintedRegistration: true, separateCalibrationSheet }) : null
      const calibrationSheet = separateCalibrationSheet
        ? makeMarkerCalibrationSheet20261024({ size, fabricId: marker.fabricId || 'Fabric' }) : null
      const plotAudit = auditMarkerPlotParity20261024(marker, {
        svg, pdf, size, fabricName, project: graded, calibrationSheet, requirePrintedRegistration: true,
        separateCalibrationSheet, requireRulerInkClearance: true,
      })
      if (!plotAudit.ok) {
        const detail = plotAudit.issues.map(issue => `${issue.code}: ${issue.message}`).join('; ')
        throw new Error(`Factory package refused: marker SVG/PDF plot parity failed for ${size}/${fabricId}: ${detail}`)
      }
      // Package the exact bytes that passed plot QA; never regenerate afterward.
      addText(`${filename}.svg`, svg)
      if (pdf) addFile(`${filename}.pdf`, pdf)
      if (calibrationSheet) {
        const calibrationFilename = `print-calibration/${nameSlug}-${slug(fabricId)}-${slug(size)}`
        addText(`${calibrationFilename}.svg`, calibrationSheet.svg)
        addFile(`${calibrationFilename}.pdf`, calibrationSheet.pdf)
      }
      plotAuditRows.push({ size, fabricId, ...plotAudit,
        onPageRulerInkAudit: rulerAudit,
        separateSheetReasonCodes: separateCalibrationSheet && !rulerAudit.ok
          ? rulerAudit.issues.map(issue => issue.code) : [],
      })
    }
  }
  addText('marker-plot-geometry-qa.json', JSON.stringify({
    schema: 'exo.accumark.marker-plot-geometry-qa.v1',
    ok: true,
    factoryApproved: false,
    note: 'Internal exact SVG/PDF byte, ruler-ink collision fallback, separate-sheet provenance, plot geometry and printable registration checks only; physical paper/plotter alignment, scale and licensed receiver acceptance remain unverified.',
    rows: plotAuditRows,
  }, null, 2))

  const manifest = {
    format: 'garment-studio-factory-package',
    version: 2,
    project: { id: project.id, name: project.name, revision: project.revision, units: project.units || 'cm' },
    grading: { baseSize: project.grading?.baseSize || 'M', sizes },
    marker: { fabricWidthCm: markerWidth, gapCm: markerGap, fabricWidthsCm: { ...(project.markerSettings?.fabricWidthsCm || {}) } },
    files: [...Object.keys(files), 'manifest.json'].sort(),
    sha256: Object.fromEntries(Object.entries(files).map(([path,data])=>[path,sha256Bytes(data)])),
  }
  addText('manifest.json', JSON.stringify(manifest, null, 2))
  return files
}

export function buildFactoryPackageZip(project) {
  return zipSync(buildFactoryPackageFiles(project), { level: 6 })
}
