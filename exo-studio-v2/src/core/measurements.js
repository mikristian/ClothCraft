import { edgeLength, samplePieceBoundary } from './project.js'
import { gradeProject } from './grading.js'
import { buildFabricMarkers } from './marker.js'
import { measureHorizontalSpans } from './rustMeasurementKernel.js'

function bounds(piece) {
  const sampled = samplePieceBoundary(piece, 16).points
  const xs = sampled.map((point) => point.x)
  const ys = sampled.map((point) => point.y)
  return {
    points: sampled,
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  }
}

function horizontalSpansForPiece(piece, levels) {
  if (!piece) return levels.map(() => 0)
  const points = samplePieceBoundary(piece, 18).points
  return measureHorizontalSpans([{ points, levels }])[0]
}

function value(id, label, cm, tolerance = 0.5) {
  return { id, label, cm: Number(cm.toFixed(2)), toleranceCm: tolerance }
}

export function measureProject(project) {
  const front = project.pieces.find((piece) => piece.id === 'front') || project.pieces[0]
  const leftSleeve = project.pieces.find((piece) => piece.id === 'sleeve-left')
  if (!front) return []
  const frontBounds = bounds(front)
  const height = frontBounds.maxY - frontBounds.minY
  const sleeveBounds = leftSleeve ? bounds(leftSleeve) : null

  const chestY = frontBounds.minY + height * 0.70
  const waistY = frontBounds.minY + height * 0.42
  const hemY = frontBounds.minY + Math.max(0.3, height * 0.01)
  const shoulderY = frontBounds.minY + height * 0.955

  const [chestSpan, waistSpan, hemSpan, shoulderSpan] = horizontalSpansForPiece(front,
    [chestY, waistY, hemY, shoulderY])

  const measurements = [
    value('body-length', 'Body length', height, 0.7),
    value('chest-half', '1/2 chest', chestSpan, 0.5),
    value('waist-half', '1/2 waist', waistSpan, 0.5),
    value('hem-half', '1/2 hem', hemSpan, 0.5),
    value('across-shoulder', 'Across shoulder', shoulderSpan, 0.5),
    value('front-armhole', 'Front armhole', edgeLength(front, 1) + edgeLength(front, 2), 0.4),
  ]

  if (leftSleeve && sleeveBounds) {
    const sleeveHeight = sleeveBounds.maxY - sleeveBounds.minY
    const [bicepSpan, cuffSpan] = horizontalSpansForPiece(leftSleeve,
      [sleeveBounds.maxY - sleeveHeight * 0.18, sleeveBounds.minY + 0.3])
    measurements.push(
      value('sleeve-length', 'Sleeve length', sleeveHeight, 0.7),
      // A sleeve is ONE unfolded piece with one underarm seam. Its flat cut
      // width is the finished sleeve circumference (minus sewing turnback),
      // not a half-circumference like the separate front/back body pieces.
      value('bicep-half', 'Bicep circumference (sleeve flat)', bicepSpan, 0.5),
      value('cuff-half', 'Cuff circumference (sleeve flat)', cuffSpan, 0.4),
    )
  }
  for (const measurement of project.customMeasurements || []) {
    if (!measurement?.a || !measurement?.b) continue
    const id = String(measurement.id ?? 'unnamed')
    if (![measurement.a.x, measurement.a.y, measurement.b.x, measurement.b.y].every(Number.isFinite)) {
      throw new RangeError(`Custom measurement ${id} has invalid coordinates`)
    }
    const cm = Math.hypot(measurement.b.x - measurement.a.x, measurement.b.y - measurement.a.y)
    if (!Number.isFinite(cm)) {
      throw new RangeError(`Custom measurement ${id} has an invalid distance`)
    }
    const toleranceCm = Number(measurement.toleranceCm ?? 0.5)
    if (!Number.isFinite(toleranceCm) || toleranceCm < 0) {
      throw new RangeError(`Custom measurement ${id} has an invalid tolerance`)
    }
    measurements.push(value(
      measurement.id,
      measurement.label || 'Custom measurement',
      cm,
      toleranceCm,
    ))
  }
  return measurements
}

export function buildMeasurementSizeRun(project) {
  const sizes = project.grading?.sizes || [project.grading?.baseSize || 'M']
  return Object.fromEntries(sizes.map((size) => [size, measureProject(gradeProject(project, size))]))
}

export function measurementRunToCSV(project) {
  const configuredSizes = project.grading?.sizes
  if (configuredSizes != null && (!Array.isArray(configuredSizes) || !configuredSizes.length || configuredSizes.some((size) => typeof size !== 'string' || !size.trim()) || new Set(configuredSizes).size !== configuredSizes.length)) {
    throw new RangeError('Measurement CSV requires a nonempty run of unique grading sizes')
  }
  const run = buildMeasurementSizeRun(project)
  const sizes = Object.keys(run)
  const ids = run[sizes[0]]?.map((measurement) => measurement.id) || []
  if (!sizes.length) throw new RangeError('Measurement CSV requires at least one grading size')
  if (new Set(sizes).size !== sizes.length) throw new RangeError('Measurement CSV requires unique grading sizes')
  if (new Set(ids).size !== ids.length) throw new RangeError('Measurement CSV requires unique point-of-measure identifiers')
  const lines = [['POM', 'Tolerance cm', ...sizes]]
  for (const id of ids) {
    const first = run[sizes[0]].find((measurement) => measurement.id === id)
    lines.push([
      first?.label || id,
      first?.toleranceCm ?? '',
      ...sizes.map((size) => run[size].find((measurement) => measurement.id === id)?.cm ?? ''),
    ])
  }
  return lines.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n')
}

export function buildTechPack(project) {
  const avatar = project.avatar || {}
  for (const field of ['heightCm', 'chestCm', 'waistCm', 'hipCm', 'shoulderWidthCm', 'neckCm', 'bicepCm', 'armLengthCm']) {
    if (avatar[field] != null && (typeof avatar[field] !== 'number' || !Number.isFinite(avatar[field]) || avatar[field] <= 0)) {
      throw new RangeError(`Avatar ${field} must be a finite positive measurement for tech pack export`)
    }
  }
  const derivedArmLength = 72 * (avatar.heightCm ?? 180) / 180
  if (!Number.isFinite(derivedArmLength) || derivedArmLength <= 0) {
    throw new RangeError('Avatar derived arm length is invalid for tech pack export')
  }
  const sizes = project.grading?.sizes || [project.grading?.baseSize || 'M']
  if (!Array.isArray(sizes) || !sizes.length || sizes.some((size) => typeof size !== 'string' || !size.trim()) || new Set(sizes).size !== sizes.length) {
    throw new RangeError('Tech pack requires a nonempty run of unique grading sizes')
  }
  const sizeMeasurements = buildMeasurementSizeRun(project)
  for (const [size, measurements] of Object.entries(sizeMeasurements)) {
    const ids = measurements.map((measurement) => measurement.id)
    if (new Set(ids).size !== ids.length) throw new RangeError(`Tech pack size ${size} contains duplicate point-of-measure identifiers`)
  }
  const markerWidth = project.markerSettings?.fabricWidthCm ?? 150
  const markerGap = project.markerSettings?.gapCm ?? 1.5
  const markers = Object.fromEntries(sizes.map((size) => {
    const graded = gradeProject(project, size)
    const fabricMarkers = buildFabricMarkers(graded, markerWidth, markerGap)
    const marker = fabricMarkers.main || Object.values(fabricMarkers)[0] || {
      width: markerWidth,
      gap: markerGap,
      length: 0,
      efficiency: 0,
    }
    return [size, {
      fabricWidthCm: marker.width,
      gapCm: marker.gap,
      markerLengthCm: Number(marker.length.toFixed(2)),
      efficiency: Number(marker.efficiency.toFixed(4)),
      byFabric: Object.fromEntries(Object.entries(fabricMarkers).map(([fabricId, item]) => [fabricId, {
        fabricWidthCm: item.width,
        gapCm: item.gap,
        markerLengthCm: Number(item.length.toFixed(2)),
        efficiency: Number(item.efficiency.toFixed(4)),
        requestedPieces: item.requestedPieces,
        placedPieces: item.placements.length,
        unusedPieces: item.unusedPieces,
        unplaced: (item.unplaced || []).map((entry) => ({ ...entry })),
      }])),
    }]
  }))
  return {
    format: 'garment-studio-tech-pack',
    version: 1,
    project: {
      id: project.id,
      name: project.name,
      revision: project.revision,
      units: project.units,
    },
    productionSpec: project.productionSpec ? structuredClone(project.productionSpec) : null,
    grading: project.grading,
    avatar: {
      ...avatar,
      armLengthCm: avatar.armLengthCm ?? derivedArmLength,
    },
    sizeMeasurements,
    materials: Object.values(project.fabrics || {}).map((fabric) => ({
      id: fabric.id,
      name: fabric.name,
      catalogPresetId: fabric.catalogPresetId || null,
      calibration: fabric.calibration ? structuredClone(fabric.calibration) : null,
      calibrationEvidence: fabric.calibrationEvidence ? structuredClone(fabric.calibrationEvidence) : null,
      photoReference: fabric.photoReference ? structuredClone(fabric.photoReference) : null,
      color: fabric.color,
      gsm: fabric.gsm,
      thickness: fabric.thickness,
      stretchWarp: fabric.stretchWarp,
      stretchWeft: fabric.stretchWeft,
      shrinkWarp: fabric.shrinkWarp,
      shrinkWeft: fabric.shrinkWeft,
      bend: fabric.bend,
      friction: fabric.friction,
      damping: fabric.damping,
      roughness: fabric.roughness ?? 0.82,
      opacity: fabric.opacity ?? 1,
      displacementMm: fabric.displacementMm ?? 0,
      metalness: fabric.metalness ?? 0,
      sheen: fabric.sheen ?? 0.22,
      sheenRoughness: fabric.sheenRoughness ?? 0.84,
      normalStrength: fabric.normalStrength ?? 1,
      fiberAnisotropy: fabric.fiberAnisotropy ?? .16,
      fiberAngleDeg: fabric.fiberAngleDeg ?? 0,
      clearcoat: fabric.clearcoat ?? 0,
      clearcoatRoughness: fabric.clearcoatRoughness ?? .45,
      colorVariation: fabric.colorVariation ?? .25,
      weaveScaleCm: fabric.weaveScaleCm ?? 3,
      surfaceFamily: fabric.surfaceFamily || 'auto',
      wash: fabric.wash ? structuredClone(fabric.wash) : null,
      washNote: 'Digitally simulated appearance reference only; validate actual manufacturing treatment and physical fabric behavior with supplier samples.',
      texture: fabric.texture ? {
        colorMap: fabric.texture.name || null,
        normalMap: fabric.texture.normalName || null,
        roughnessMap: fabric.texture.roughnessName || null,
        metalnessMap: fabric.texture.metalnessName || null,
        opacityMap: fabric.texture.opacityName || null,
        displacementMap: fabric.texture.displacementName || null,
        repeatWidthCm: fabric.texture.repeatWidthCm ?? 20,
        repeatHeightCm: fabric.texture.repeatHeightCm ?? 20,
        rotationDeg: fabric.texture.rotationDeg ?? 0,
      } : null,
    })),
    patternPieces: project.pieces.map((piece) => ({
      id: piece.id,
      name: piece.name,
      role: piece.generatedRole || 'shell',
      liningForPieceId: piece.liningForPieceId || null,
      interfacingForPieceId: piece.interfacingForPieceId || null,
      fusedToPieceId: piece.fusedToPieceId || null,
      seamAllowanceCm: piece.seamAllowance,
      edgeSeamAllowancesCm: { ...(piece.edgeSeamAllowances || {}) },
      fabricId: piece.fabricId,
      notches: (piece.notches || []).map((notch) => ({
        id: notch.id,
        edgeIndex: notch.edgeIndex,
        t: notch.t ?? 0.5,
        type: notch.type || 'single',
        depthCm: Number(notch.depthCm ?? 0.45),
        matchGroupId: notch.matchGroupId || null,
        matchedSeamId: notch.matchedSeamId || null,
      })),
      buttonholes: (piece.buttonholes || []).map((buttonhole) => ({
        id: buttonhole.id,
        x: Number(buttonhole.x ?? 0),
        y: Number(buttonhole.y ?? 0),
        lengthCm: Number(buttonhole.lengthCm ?? 2.4),
        widthCm: Number(buttonhole.widthCm ?? 0.35),
        orientationDeg: Number(buttonhole.orientationDeg ?? 0),
        pairedButtonId: buttonhole.pairedButtonId || null,
      })),
      internalLines: piece.internalLines || [],
      gradePoints: (piece.points || []).map((point, pointIndex) => ({
        pointIndex,
        x: point.x,
        y: point.y,
        rule: point.gradeRule?.enabled ? {
          dxPerSize: Number(point.gradeRule.dxPerSize ?? 0),
          dyPerSize: Number(point.gradeRule.dyPerSize ?? 0),
        } : null,
      })),
    })),
    customMeasurements: (project.customMeasurements || []).map((measurement) => ({
      id: measurement.id,
      label: measurement.label || 'Custom measurement',
      pieceId: measurement.pieceId,
      a: measurement.a,
      b: measurement.b,
      toleranceCm: Number(measurement.toleranceCm ?? 0.5),
    })),
    construction: (project.seams || []).map((seam) => ({
      id: seam.id,
      name: seam.name,
      type: seam.type || 'normal',
      from: seam.a,
      to: seam.b,
      reverseB: Boolean(seam.reverseB),
      ratio: seam.ratio ?? null,
      easeSide: seam.easeSide || null,
      gatherSide: seam.gatherSide || null,
      openFraction: seam.openFraction ?? null,
      openFrom: seam.openFrom || null,
    })),
    markers,
  }
}
