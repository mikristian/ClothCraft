import { edgeLength, edgePointAt, getEdgeSeamAllowance, samplePieceBoundary, seamAllowanceBoundary } from './project.js'
import { rustDxfNotchCut } from './rustGeometryKernel.js'
import {inspectCutlinePolygon} from './cutlineTopology.js'

function entityLine(layer, a, b) {
  return [
    '0', 'LINE',
    '8', layer,
    '10', String(a.x * 10),
    '20', String(a.y * 10),
    '30', '0',
    '11', String(b.x * 10),
    '21', String(b.y * 10),
    '31', '0',
  ]
}

function entityPolyline(layer, points) {
  const rows = ['0', 'POLYLINE', '8', layer, '66', '1', '70', '1']
  for (const point of points) {
    rows.push(
      '0', 'VERTEX',
      '8', layer,
      '10', String(point.x * 10),
      '20', String(point.y * 10),
      '30', '0',
    )
  }
  rows.push('0', 'SEQEND', '8', layer)
  return rows
}

function entityText(layer, point, text, heightMm = 5) {
  return [
    '0', 'TEXT',
    '8', layer,
    '10', String(point.x * 10),
    '20', String(point.y * 10),
    '30', '0',
    '40', String(heightMm),
    '1', text,
  ]
}

function safeLayer(value) {
  return String(value || 'PATTERN').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 48)
}

function centroid(points) {
  if (!points.length) return { x: 0, y: 0 }
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  }
}

function notchForEdge(piece, edgeIndex, depthCm = 0.45, fraction = 0.5) {
  const located = edgePointAt(piece, edgeIndex, fraction, 48)
  if (!located) return null
  return rustDxfNotchCut(located.point, located.normal, depthCm)
}

/** Map the authored stitch-edge arclength fraction to its matching point on
 * the offset physical CUT polygon. A notch must begin at the cutter edge and
 * point into the seam allowance, never originate inside the sewn garment.
 * Outlines are built from the exact same 12-segment edge sampling as DXF.
 */
function factoryNotchForEdge(piece,edgeIndex,depthCm=0.45,fraction=0.5){
 const allowance=getEdgeSeamAllowance(piece,edgeIndex)
 if(!Number.isFinite(depthCm)||!(depthCm>0)||!(allowance>depthCm+0.05)){
  throw new Error(`Unsafe manufacturing notch depth/allowance at ${piece.id} edge ${edgeIndex}`)
 }
 const {edgePaths}=samplePieceBoundary(piece,12)
 const sourcePath=edgePaths[edgeIndex]
 const cut=seamAllowanceBoundary(piece,12)
 if(!sourcePath||sourcePath.length<2||!cut.length)throw new Error(`Missing notch curve or physical cutting outline on ${piece.id}`)
 const lengths=[0]
 for(let k=1;k<sourcePath.length;k++)lengths[k]=lengths[k-1]+Math.hypot(sourcePath[k].x-sourcePath[k-1].x,sourcePath[k].y-sourcePath[k-1].y)
 const total=lengths.at(-1)
 if(!(total>0)||!Number.isFinite(fraction)||fraction<0||fraction>1)throw new Error(`Invalid physical notch arclength on ${piece.id}`)
 const target=total*fraction
 let segment=0
 while(segment<lengths.length-2&&lengths[segment+1]<target)segment++
 const span=lengths[segment+1]-lengths[segment]
 if(!(span>0))throw new Error(`Invalid zero-length notch interval on ${piece.id}`)
 const t=(target-lengths[segment])/span
 const startIndex=edgePaths.slice(0,edgeIndex).reduce((sum,path)=>sum+path.length-1,0)
 const a=cut[(startIndex+segment)%cut.length]
 const b=cut[(startIndex+segment+1)%cut.length]
 const atCut={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t}
 const atStitch=edgePointAt(piece,edgeIndex,fraction,64)?.point
 if(!atStitch)throw new Error(`Missing sewn edge at notch ${piece.id}`)
 const dx=atStitch.x-atCut.x,dy=atStitch.y-atCut.y
 const distance=Math.hypot(dx,dy)
 if(!(distance>1e-5))throw new Error(`Physical notch cannot locate seam allowance direction on ${piece.id}`)
 const intoSeam={x:dx/distance,y:dy/distance}
 const end={x:atCut.x+intoSeam.x*depthCm,y:atCut.y+intoSeam.y*depthCm}
 return {a:atCut,b:end}
}

function dartLegs(line) {
  const dx = line.b.x - line.a.x
  const dy = line.b.y - line.a.y
  const length = Math.hypot(dx, dy) || 1
  const halfWidth = Number(line.widthCm ?? 2.5) * 0.5
  const nx = -dy / length * halfWidth
  const ny = dx / length * halfWidth
  return {
    left: { x: line.a.x + nx, y: line.a.y + ny },
    right: { x: line.a.x - nx, y: line.a.y - ny },
    apex: { ...line.b },
  }
}

export function projectToDxf(project, size = project.previewSize || project.grading?.baseSize || 'BASE', options = {}) {
  if(project?.patternSource?.referenceOnly||project?.pieces?.some(piece=>piece?.patternImportProvenance?.referenceOnly)){
    throw new Error('DXF export refused: a locked manufacturing CUT/STITCH reference is not an editable authored garment. Restore garment-source.json or create a verified original pattern before production export.')
  }
  // Legacy DXF labels the sewn/stitch contour CUT and the allowance contour SA.
  // It remains the default for existing editor/import users. Factory releases
  // explicitly request an honest CUT layer generated from per-edge allowances
  // and a separate STITCH contour; no source geometry is mutated.
  const factoryCutline = options.cutlineMode === 'manufacturing'
  // This generic exporter has no validated industrial hole/drill schema.
  // Refuse manufacturing files containing such features rather than silently
  // stripping them while a factory assumes the CUT is production-complete.
  if(factoryCutline){
    for(const piece of project?.pieces||[]){
      for(const key of ['drills','drillMarks','punches','holes','cutHoles','internalCutouts','internalCuts']){
        const marks=piece?.[key]
        if(marks!==undefined&&(!Array.isArray(marks)||marks.length))
          throw Error(`MANUFACTURING_FEATURE_EXPORT_UNVERIFIED:${piece.id||'unknown'}:${key}`)
      }
    }
  }
  if (options.cutlineMode != null && options.cutlineMode !== 'manufacturing' && options.cutlineMode !== 'drafting') {
    throw new Error(`Unsupported DXF cutline mode: ${options.cutlineMode}`)
  }
  // A receiver-facing CUT/STITCH file must not simply label base-pattern
  // coordinates as a non-base grade. gradeProject explicitly sets previewSize
  // after transforming the actual physical geometry; require that evidence.
  // This protects direct callers while leaving legacy drafting-only DXF
  // exports/backwards-compatible reference workflows unchanged.
  if(factoryCutline && options.requireGradedGeometry===true &&
    project?.grading?.baseSize && size!==project.grading.baseSize &&
    project.previewSize!==size){
    throw new Error(`Factory DXF refused: requested ${size} but project has no matching graded preview geometry; gradeProject(source, '${size}') first`)
  }
  if(factoryCutline && options.requireGradedGeometry===true && project?.previewSize && project.previewSize!==size){
    throw new Error(`Factory DXF size mismatch: pattern geometry is ${project.previewSize}, not requested ${size}`)
  }
  const entities = []
  const notchTokens = new Set()
  for (const seam of project.seams || []) {
    notchTokens.add(`${seam.a.pieceId}:${seam.a.edgeIndex}`)
    notchTokens.add(`${seam.b.pieceId}:${seam.b.edgeIndex}`)
  }

  let xOffset = 0
  const spacingCm = 10
  for (const piece of project.pieces || []) {
    const sampled = samplePieceBoundary(piece, 12).points
    if(factoryCutline){
      const physicalOutline=seamAllowanceBoundary(piece,12)
      const audited=inspectCutlinePolygon(physicalOutline)
      if(!audited.ok)throw new Error(`Unsafe factory CUT for ${piece.id}: ${audited.faults.map(x=>x.code).slice(0,3).join(', ')}`)
    }
    const xs = sampled.map((point) => point.x)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const translated = sampled.map((point) => ({ x: point.x - minX + xOffset, y: point.y }))
    const pieceToken = safeLayer(piece.name).toUpperCase()
    const sizeToken = safeLayer(size).toUpperCase()
    const layerBase = `CUT_${pieceToken}_${sizeToken}`
    const hasAllowances = piece.points.some((_, edgeIndex) => getEdgeSeamAllowance(piece, edgeIndex) > 0)
    if (factoryCutline && hasAllowances) {
      const allowance = seamAllowanceBoundary(piece, 12)
        .map((point) => ({ x: point.x - minX + xOffset, y: point.y }))
      if (allowance.length < 3 || allowance.some(point => !Number.isFinite(point.x) || !Number.isFinite(point.y))) {
        throw new Error(`Invalid factory cutting geometry for ${piece.id}`)
      }
      entities.push(...entityPolyline(layerBase, allowance))
      entities.push(...entityPolyline(`STITCH_${pieceToken}`, translated))
    } else {
      entities.push(...entityPolyline(layerBase, translated))
      if (hasAllowances) {
        const allowance = seamAllowanceBoundary(piece, 12)
          .map((point) => ({ x: point.x - minX + xOffset, y: point.y }))
        entities.push(...entityPolyline(`SA_${pieceToken}`, allowance))
      }
    }

    const explicitNotchEdges = new Set()
    for (const notch of piece.notches || []) {
      // A manufacturing receiver must never reinterpret an unknown authored
      // physical mark as a single notch. Legacy absent/null types continue to
      // mean a single notch; explicit unsupported types fail closed.
      if (factoryCutline && notch?.type != null && notch.type !== 'single' && notch.type !== 'double') {
        throw new Error(`Unsupported manufacturing DXF notch type on ${piece.id}: ${String(notch.type)}`)
      }
      const edgeIndex = Number(notch?.edgeIndex)
      if (!Number.isInteger(edgeIndex) || edgeIndex < 0 || edgeIndex >= piece.points.length || (factoryCutline && !Number.isInteger(notch?.edgeIndex))) {
        if (factoryCutline) throw new Error(`Invalid manufacturing DXF notch edgeIndex on ${piece.id}: ${String(notch?.edgeIndex)}`)
        continue
      }
      if (factoryCutline) {
        const fraction = notch?.t ?? 0.5
        if (typeof fraction !== 'number' || !Number.isFinite(fraction) || fraction < 0 || fraction > 1) {
          throw new Error(`Invalid manufacturing DXF notch fraction on ${piece.id} edge ${edgeIndex}`)
        }
        const depth = notch?.depthCm ?? 0.45
        if (typeof depth !== 'number' || !Number.isFinite(depth) || depth <= 0) {
          throw new Error(`Invalid manufacturing DXF notch depth on ${piece.id} edge ${edgeIndex}`)
        }
      }
      explicitNotchEdges.add(edgeIndex)
      const length = edgeLength(piece, edgeIndex)
      const gap = length > 0 ? Math.min(0.045, 0.38 / length) : 0.02
      const station = notch.t ?? 0.5
      // Clamping a paired notch near a contour endpoint silently moves both
      // physical cuts away from the authored station. Reject such factory
      // geometry instead of exporting a misleading match mark. Drafting keeps
      // its historical visual behavior for backwards compatibility.
      if (factoryCutline && notch.type === 'double' && (station - gap < 0.01 || station + gap > 0.99)) {
        throw new Error(`Unsafe manufacturing double-notch endpoint clearance on ${piece.id} edge ${edgeIndex}`)
      }
      const fractions = notch.type === 'double'
        ? [Math.max(0.01, station - gap), Math.min(0.99, station + gap)]
        : [station]
      for (const fraction of fractions) {
        const cut = factoryCutline
          ? factoryNotchForEdge(piece,edgeIndex,Number(notch.depthCm ?? 0.45),fraction)
          : notchForEdge(piece, edgeIndex, Number(notch.depthCm ?? 0.45), fraction)
        if (!cut) {
          if (factoryCutline) throw new Error(`Missing manufacturing DXF notch cut on ${piece.id} edge ${edgeIndex}`)
          continue
        }
        entities.push(...entityLine(`NOTCH_${pieceToken}`,
          { x: cut.a.x - minX + xOffset, y: cut.a.y },
          { x: cut.b.x - minX + xOffset, y: cut.b.y },
        ))
      }
    }

    // Sewing-edge references are not instructions to nick fabric. Legacy
    // drafting exports retain their historical auto-notches, but factory
    // cutting exports include only deliberately authored physical notches.
    if(!factoryCutline)piece.points.forEach((_, edgeIndex) => {
      if (explicitNotchEdges.has(edgeIndex)) return
      if (!notchTokens.has(`${piece.id}:${edgeIndex}`)) return
      const notch = notchForEdge(piece, edgeIndex)
      if (!notch) return
      entities.push(...entityLine(`NOTCH_${pieceToken}`,
        { x: notch.a.x - minX + xOffset, y: notch.a.y },
        { x: notch.b.x - minX + xOffset, y: notch.b.y },
      ))
    })

    for (const buttonhole of piece.buttonholes || []) {
      const angle = Number(buttonhole.orientationDeg || 0) * Math.PI / 180
      const halfLength = Math.max(0.4, Number(buttonhole.lengthCm ?? 2.4) * 0.5)
      const dx = Math.cos(angle) * halfLength
      const dy = Math.sin(angle) * halfLength
      entities.push(...entityLine(`BUTTONHOLE_${pieceToken}`,
        { x: Number(buttonhole.x || 0) - dx - minX + xOffset, y: Number(buttonhole.y || 0) - dy },
        { x: Number(buttonhole.x || 0) + dx - minX + xOffset, y: Number(buttonhole.y || 0) + dy },
      ))
    }

    const center = centroid(translated)
    const ys = translated.map((point) => point.y)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const grainHalfLength = Math.max(3, (maxY - minY - 12) * 0.5)
    const grainAngle = (Number(piece.grainAngleDeg || 0) * Math.PI) / 180
    const grainDx = Math.sin(grainAngle) * grainHalfLength
    const grainDy = Math.cos(grainAngle) * grainHalfLength
    entities.push(...entityLine(`GRAIN_${pieceToken}`,
      { x: center.x - grainDx, y: center.y - grainDy },
      { x: center.x + grainDx, y: center.y + grainDy },
    ))
    entities.push(...entityText(`LABEL_${pieceToken}`, center, `${piece.name} / ${size}`, 5))

    for (const line of piece.internalLines || []) {
      const translate = (point) => ({ x: point.x - minX + xOffset, y: point.y })
      const type = safeLayer(line.type || 'construction').toUpperCase()
      if (line.type === 'dart') {
        const legs = dartLegs(line)
        entities.push(...entityLine(`INTERNAL_DART_${pieceToken}`, translate(legs.left), translate(legs.apex)))
        entities.push(...entityLine(`INTERNAL_DART_${pieceToken}`, translate(legs.right), translate(legs.apex)))
        entities.push(...entityLine(`DART_CENTER_${pieceToken}`, translate(line.a), translate(line.b)))
      } else if (line.type === 'pleat') {
        const dx = line.b.x - line.a.x
        const dy = line.b.y - line.a.y
        const length = Math.hypot(dx, dy) || 1
        const nx = -dy / length
        const ny = dx / length
        const count = Math.max(1, Math.min(16, Math.round(Number(line.count ?? 5))))
        const spacing = Math.max(1, Number(line.spacingCm ?? 4))
        for (let index = 0; index < count; index += 1) {
          const offset = (index - (count - 1) * 0.5) * spacing
          entities.push(...entityLine(
            `INTERNAL_PLEAT_${pieceToken}`,
            translate({ x: line.a.x + nx * offset, y: line.a.y + ny * offset }),
            translate({ x: line.b.x + nx * offset, y: line.b.y + ny * offset }),
          ))
        }
      } else {
        entities.push(...entityLine(`INTERNAL_${type}_${pieceToken}`, translate(line.a), translate(line.b)))
      }
    }
    xOffset += (maxX - minX) + spacingCm
  }

  return [
    '0', 'SECTION',
    '2', 'HEADER',
    '9', '$ACADVER',
    '1', 'AC1009',
    '9', '$MEASUREMENT',
    '70', '1',
    // This export emits geometry in millimetres. Many CAD importers prioritize
    // $INSUNITS over $MEASUREMENT, so state the units explicitly.
    '9', '$INSUNITS',
    '70', '4',
    '0', 'ENDSEC',
    '999', `GARMENT_STUDIO_PROJECT ${project.id || 'untitled'}`,
    '999', `GARMENT_STUDIO_SIZE ${size}`,
    '999', 'COORDINATES_MM',
    '999', factoryCutline ? 'CUT_LAYER_IS_PHYSICAL_ALLOWANCE_OUTLINE_STITCH_IS_SEWLINE_EXPLICIT_NOTCHES_ONLY' : 'DRAFTING_LEGACY_CUT_IS_SEWLINE_SA_IS_ALLOWANCE_OUTLINE',
    '0', 'SECTION',
    '2', 'ENTITIES',
    ...entities,
    '0', 'ENDSEC',
    '0', 'EOF',
  ].join('\n')
}

function dxfPairs(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n')
  const pairs = []
  for (let index = 0; index + 1 < lines.length; index += 2) {
    const code = Number(lines[index].trim())
    if (!Number.isFinite(code)) continue
    pairs.push({ code, value: lines[index + 1].trim() })
  }
  return pairs
}

function unitScaleToCm(pairs) {
  let insUnits = null
  let metric = null
  for (let index = 0; index < pairs.length; index += 1) {
    if (pairs[index].code !== 9) continue
    if (pairs[index].value === '$INSUNITS') {
      const next = pairs.slice(index + 1, index + 5).find((pair) => pair.code === 70)
      if (next) insUnits = Number(next.value)
    }
    if (pairs[index].value === '$MEASUREMENT') {
      const next = pairs.slice(index + 1, index + 5).find((pair) => pair.code === 70)
      if (next) metric = Number(next.value)
    }
  }
  const map = {
    1: 2.54, // inches
    2: 30.48, // feet
    4: 0.1, // millimeters
    5: 1, // centimeters
    6: 100, // meters
  }
  if (insUnits != null) {
    if (map[insUnits]) return map[insUnits]
    // Explicit unsupported or unitless DXFs cannot be safely guessed as mm.
    // Manufacturing patterns must never silently import at the wrong scale.
    throw new Error(`Unsupported or unitless DXF INSUNITS (${insUnits}); specify the import scale explicitly`)
  }
  return metric === 0 ? 2.54 : 0.1
}

function collectEntities(pairs) {
  const entities = []
  let index = 0
  while (index < pairs.length) {
    if (pairs[index].code !== 0) {
      index += 1
      continue
    }
    const type = pairs[index].value.toUpperCase()
    if (type === 'POLYLINE') {
      const header = []
      index += 1
      while (index < pairs.length && pairs[index].code !== 0) header.push(pairs[index++])
      const vertices = []
      while (index < pairs.length) {
        if (pairs[index].code !== 0) { index += 1; continue }
        const child = pairs[index].value.toUpperCase()
        if (child === 'SEQEND') {
          index += 1
          while (index < pairs.length && pairs[index].code !== 0) index += 1
          break
        }
        if (child !== 'VERTEX') break
        index += 1
        const data = []
        while (index < pairs.length && pairs[index].code !== 0) data.push(pairs[index++])
        const x = Number(data.find((pair) => pair.code === 10)?.value)
        const y = Number(data.find((pair) => pair.code === 20)?.value)
        if (Number.isFinite(x) && Number.isFinite(y)) vertices.push({ x, y })
      }
      entities.push({
        type,
        layer: header.find((pair) => pair.code === 8)?.value || '0',
        closed: (Number(header.find((pair) => pair.code === 70)?.value || 0) & 1) === 1,
        points: vertices,
      })
      continue
    }

    index += 1
    const data = []
    while (index < pairs.length && pairs[index].code !== 0) data.push(pairs[index++])
    if (type === 'LWPOLYLINE') {
      const points = []
      let pendingX = null
      for (const pair of data) {
        if (pair.code === 10) pendingX = Number(pair.value)
        if (pair.code === 20 && Number.isFinite(pendingX)) {
          const y = Number(pair.value)
          if (Number.isFinite(y)) points.push({ x: pendingX, y })
          pendingX = null
        }
      }
      entities.push({
        type,
        layer: data.find((pair) => pair.code === 8)?.value || '0',
        closed: (Number(data.find((pair) => pair.code === 70)?.value || 0) & 1) === 1,
        points,
      })
    } else if (type === 'LINE') {
      const read = (code) => Number(data.find((pair) => pair.code === code)?.value)
      const x1 = read(10); const y1 = read(20); const x2 = read(11); const y2 = read(21)
      if ([x1, y1, x2, y2].every(Number.isFinite)) {
        entities.push({ type, layer: data.find((pair) => pair.code === 8)?.value || '0', a: { x: x1, y: y1 }, b: { x: x2, y: y2 } })
      }
    } else if (type === 'TEXT' || type === 'MTEXT') {
      const x = Number(data.find((pair) => pair.code === 10)?.value)
      const y = Number(data.find((pair) => pair.code === 20)?.value)
      entities.push({
        type,
        layer: data.find((pair) => pair.code === 8)?.value || '0',
        point: Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null,
        text: data.find((pair) => pair.code === 1)?.value || '',
      })
    }
  }
  return entities
}

function ignoredOutlineLayer(layer) {
  // Engineering exports may carry separate sew-path and measurement LINE
  // entities. They can form complete loops and must not be imported as extra
  // fabric pieces beside the sole CUT_* closed contour.
  return /^(SA_|NOTCH_|GRAIN_|LABEL_|INTERNAL_|DART_|DART_CENTER|STITCH_|SEW_|POM_|POM_LABEL_)/i.test(layer || '')
}

function closeEnough(a, b, tolerance = 0.75) {
  return Math.hypot(a.x - b.x, a.y - b.y) <= tolerance
}

function lineLoops(lines, tolerance = 0.75) {
  const remaining = lines.map((line) => ({ ...line, a: { ...line.a }, b: { ...line.b } }))
  const loops = []
  while (remaining.length) {
    const seed = remaining.shift()
    const points = [seed.a, seed.b]
    let guard = 0
    while (remaining.length && guard++ < 10000) {
      const end = points[points.length - 1]
      const matchIndex = remaining.findIndex((line) => closeEnough(line.a, end, tolerance) || closeEnough(line.b, end, tolerance))
      if (matchIndex < 0) break
      const match = remaining.splice(matchIndex, 1)[0]
      points.push(closeEnough(match.a, end, tolerance) ? match.b : match.a)
      if (points.length >= 4 && closeEnough(points[0], points[points.length - 1], tolerance)) break
    }
    if (points.length >= 4 && closeEnough(points[0], points[points.length - 1], tolerance)) {
      points.pop()
      loops.push(points)
    }
  }
  return loops
}

function titleFromLayer(layer, index) {
  const cleaned = String(layer || '')
    .replace(/^CUT_/i, '')
    .replace(/_(XS|S|M|L|XL|XXL|BASE)$/i, '')
    .replace(/[_-]+/g, ' ')
    .trim()
  if (!cleaned || cleaned === '0') return `Imported Pattern ${index + 1}`
  return cleaned.replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function token(value) {
  return safeLayer(value).toUpperCase()
}

function nearestStraightEdge(points, target) {
  let best = null
  let bestDistance = Infinity
  points.forEach((a, edgeIndex) => {
    const b = points[(edgeIndex + 1) % points.length]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const lengthSq = dx * dx + dy * dy || 1
    const t = Math.max(0, Math.min(1, ((target.x - a.x) * dx + (target.y - a.y) * dy) / lengthSq))
    const x = a.x + dx * t
    const y = a.y + dy * t
    const distance = Math.hypot(target.x - x, target.y - y)
    if (distance < bestDistance) {
      bestDistance = distance
      best = { edgeIndex, t, distance }
    }
  })
  return best
}

export function parseDxfPatterns(text, options = {}) {
  const pairs = dxfPairs(text)
  const entities = collectEntities(pairs)
  const scale = options.scaleToCm == null ? unitScaleToCm(pairs) : Number(options.scaleToCm)
  if (!Number.isFinite(scale) || scale <= 0 || scale > 100) throw new Error('DXF import scale must be a finite positive centimeters-per-unit value')
  // Manufacturer CUT is the physical fabric edge, NOT the garment's stitch
  // line. Importing it as an editable pattern with our default allowance of
  // 1 cm would add a second seam allowance. Fail closed unless the user
  // explicitly requests a non-production *reference*, with zero allowance.
  const isFactory = pairs.some(row => row.code === 999 && row.value.includes('CUT_LAYER_IS_PHYSICAL_ALLOWANCE_OUTLINE_STITCH_IS_SEWLINE')) ||
    entities.some(entity => /^STITCH_/i.test(entity.layer))
  if (isFactory && !options.manufacturingImport) {
    throw new Error('Manufacturing DXF contains physical CUT and separate STITCH lines. Importing CUT as a sewing pattern would double its seam allowance. Open garment-source.json from the factory ZIP for editable grading, or explicitly import this DXF as a non-production reference.')
  }
  if (isFactory && !['cut-reference','stitch-reference'].includes(options.manufacturingImport)) {
    throw new Error('Manufacturing DXF import requires explicit cut-reference or stitch-reference mode; neither restores original graded rules or seam allowances.')
  }
  if (!isFactory && options.manufacturingImport) {
    throw new Error('Reference-mode import requires a DXF with verified physical CUT and STITCH contours; cannot assume unnamed contours have factory semantics.')
  }
  const originalClosed = entities.filter((entity) => (
    ['POLYLINE', 'LWPOLYLINE'].includes(entity.type)
    && entity.closed
    && entity.points?.length >= 3
    && !ignoredOutlineLayer(entity.layer)
  ))
  let closed = originalClosed
  const factoryTokens=new Map()
  let factorySize=null
  if(isFactory){
    // The Rust native CUT proof predates the graded DXF exchange schema. It
    // intentionally writes its STITCH contour as individual LINE entities,
    // not a second garment POLYLINE. Accept this *only* as an explicitly
    // requested locked, zero-allowance engineering reference after proving
    // there is exactly one closed physical CUT and one closed sewn loop.
    // It is never interpreted as a graded AAMA/ASTM garment or factory file.
    const rustProof=pairs.some(pair=>pair.code===999 &&
      pair.value==='EXO QA CUTLINE PROOF - verify metric scale, not factory approved')
    if(rustProof){
      const cuts=entities.filter(entity=>entity.layer==='CUT_EXO')
      const sew=entities.filter(entity=>entity.layer==='STITCH_EXO')
      if(cuts.length!==1||cuts[0].type!=='LWPOLYLINE'||!cuts[0].closed||
        sew.length<3||sew.length>8192||sew.some(line=>line.type!=='LINE')||
        entities.some(entity=>/^CUT_|^STITCH_/i.test(entity.layer) &&
          !['CUT_EXO','STITCH_EXO'].includes(entity.layer)))
        throw new Error('Native EXO DXF proof requires one closed CUT and one bounded segmented STITCH contour')
      const loops=lineLoops(sew,0.0001)
      if(loops.length!==1||loops[0].length!==sew.length)
        throw new Error('Native EXO DXF has a broken, duplicate or branching sewn line loop')
      const cut=inspectCutlinePolygon(cuts[0].points)
      const stitch=inspectCutlinePolygon(loops[0])
      if(!cut.ok||!stitch.ok||cut.areaCm2-stitch.areaCm2<=1e-6)
        throw new Error('Native EXO DXF CUT/STITCH contour geometry or physical allowance is invalid')
      closed=options.manufacturingImport==='stitch-reference'?
        [{...cuts[0],points:loops[0]}]:cuts
      factoryTokens.set('CUT_EXO',{pieceName:'EXO',size:'BASE'})
      factorySize='BASE'
    }else{
    const cutEntities=entities.filter(entity=>/^CUT_/i.test(entity.layer))
    const stitchEntities=entities.filter(entity=>/^STITCH_/i.test(entity.layer))
    const stitchByName=new Map()
    const cuts=[]
    for(const stitch of stitchEntities){
      const name=String(stitch.layer).replace(/^STITCH_/i,'').toUpperCase()
      if(stitchByName.has(name))throw new Error(`Manufacturing DXF has duplicate STITCH contour for ${name}`)
      stitchByName.set(name,stitch)
    }
    if(!cutEntities.length||cutEntities.length!==stitchEntities.length)throw new Error('Manufacturing DXF needs exactly one physical CUT and one STITCH contour per piece; unsupported or missing contours detected')
    const sizeSet=new Set()
    for(const cut of cutEntities){
      // Source piece names can themselves contain underscores, and actual
      // industry size labels are not limited to XS–XXL (e.g. 4XL or W32_L32).
      // Match each CUT to an independently named STITCH layer before removing
      // its size suffix; longest matching piece token wins.
      const basename=String(cut.layer||'').replace(/^CUT_/i,'').toUpperCase()
      const names=[...stitchByName.keys()].filter(name=>basename.startsWith(`${name}_`))
        .sort((a,b)=>b.length-a.length)
      if(!names.length)throw new Error(`Manufacturing CUT has invalid or unverified size/piece name: ${cut.layer}`)
      const pieceName=names[0]
      const size=basename.slice(pieceName.length+1)
      if(!/^[A-Z0-9][A-Z0-9_-]{0,23}$/.test(size))throw new Error(`Invalid manufacturing DXF graded size label: ${size}`)
      sizeSet.add(size)
      const stitch=stitchByName.get(pieceName)
      if(!stitch)throw new Error(`Manufacturing DXF lacks a STITCH line paired with ${cut.layer}`)
      if(!['POLYLINE','LWPOLYLINE'].includes(cut.type)||!cut.closed||
        !['POLYLINE','LWPOLYLINE'].includes(stitch.type)||!stitch.closed){
        throw new Error(`Manufacturing CUT/STITCH pair is not a pair of closed polylines for ${pieceName}`)
      }
      const physicalCut=inspectCutlinePolygon(cut.points)
      const sewingOutline=inspectCutlinePolygon(stitch.points)
      if(!physicalCut.ok||!sewingOutline.ok)throw new Error(`Manufacturing CUT/STITCH topology is invalid for ${pieceName}`)
      if(!(physicalCut.areaCm2-sewingOutline.areaCm2>1e-6))throw new Error(`Manufacturing CUT does not exceed STITCH area for ${pieceName}; cannot recover fabric roles`)
      cuts.push(options.manufacturingImport==='stitch-reference'?{...stitch,layer:cut.layer}:cut)
      factoryTokens.set(cut.layer,{pieceName,size})
      stitchByName.delete(pieceName)
    }
    if(sizeSet.size!==1||stitchByName.size)throw new Error('Manufacturing DXF mixes size runs or includes unpaired STITCH outlines; import single size and verify independently')
    factorySize=[...sizeSet][0]
    closed=cuts
    }
  }

  const linesByLayer = new Map()
  for (const entity of entities.filter((item) => item.type === 'LINE')) {
    if (!linesByLayer.has(entity.layer)) linesByLayer.set(entity.layer, [])
    linesByLayer.get(entity.layer).push(entity)
  }
  for (const [layer, lines] of linesByLayer) {
    if(isFactory)continue
    if (ignoredOutlineLayer(layer)) continue
    for (const points of lineLoops(lines)) closed.push({ type: 'LINE_LOOP', layer, closed: true, points })
  }

  if (!closed.length) throw new Error('No closed pattern outlines were found in the DXF.')

  const pieces = []
  let cursorX = 58
  let cursorY = 120
  let rowHeight = 0
  for (const [index, entity] of closed.entries()) {
    const scaled = entity.points.map((point) => ({ x: point.x * scale, y: point.y * scale }))
    const xs = scaled.map((point) => point.x)
    const ys = scaled.map((point) => point.y)
    const minX = Math.min(...xs); const maxX = Math.max(...xs)
    const minY = Math.min(...ys); const maxY = Math.max(...ys)
    const centerX = (minX + maxX) * 0.5
    const points = scaled.map((point) => ({ x: point.x - centerX, y: point.y - minY }))
    const width = maxX - minX
    const height = maxY - minY
    if (cursorX + width * 0.5 > 310) {
      cursorX = 58
      cursorY += rowHeight + 32
      rowHeight = 0
    }
    const factoryPieceName=factoryTokens.get(entity.layer)?.pieceName
    const name = factoryPieceName
      ? factoryPieceName.replace(/[_-]+/g,' ').toLowerCase().replace(/\b\w/g,letter=>letter.toUpperCase())
      : titleFromLayer(entity.layer, index)
    // Keep a stable source token for matching associated NOTCH/GRAIN/etc.
    // Layers contain the original pattern token, not the human-readable name.
    const sourceToken = factoryPieceName || String(entity.layer || '').replace(/^CUT_/i, '').replace(/_[A-Za-z0-9]+$/, '')
    pieces.push({
      id: `imported-${index + 1}`,
      name,
      sourceLayer: entity.layer,
      sourceToken,
      points,
      curves: {},
      internalLines: [],
      notches: [],
      buttonholes: [],
      layout2d: { x: cursorX + width * 0.5, y: cursorY },
      arrangement3d: { x: (index % 3 - 1) * 0.7, y: 0.75 + Math.floor(index / 3) * 0.12, z: -0.65, flip: false },
      grainAngleDeg: 0,
      seamAllowance: isFactory ? 0 : 1,
      fabricId: 'main',
      locked: isFactory,
      ...(isFactory?{active3d:false,frozen3d:true}:{}),
      ...(isFactory?{
        patternImportProvenance:{
          source:'generic-manufacturing-dxf',
          importRole:options.manufacturingImport,
          referenceOnly:true,
          physicalCutlineVerified:true,
          gradedRuleRecovered:false,
          originalCurveControlsRecovered:false,
          originalSeamAllowancesRecovered:false,
          notchPairingRecovered:false,
          factoryCertified:false,
        },
      }:{}),
      _import: { minX, minY, scale, layer: entity.layer },
    })
    cursorX += width + 24
    rowHeight = Math.max(rowHeight, height)
  }

  const findPieceForLayer = (prefix, layer) => {
    const wanted = token(String(layer || '').replace(new RegExp(`^${prefix}`, 'i'), ''))
    return pieces.find((piece) => token(piece.sourceToken) === wanted || token(piece.name) === wanted || token(piece.sourceLayer).includes(wanted) || wanted.includes(token(piece.name)))
  }

  for (const entity of entities.filter((item) => item.type === 'LINE')) {
    let piece = null
    if (/^NOTCH_/i.test(entity.layer)) piece = findPieceForLayer('NOTCH_', entity.layer)
    if (/^BUTTONHOLE_/i.test(entity.layer)) piece = findPieceForLayer('BUTTONHOLE_', entity.layer)
    if (/^GRAIN_/i.test(entity.layer)) piece = findPieceForLayer('GRAIN_', entity.layer)
    if (/^INTERNAL_/i.test(entity.layer) || /^DART_/i.test(entity.layer)) piece = pieces.find((candidate) => token(entity.layer).includes(token(candidate.name)))
    if (!piece) continue
    const toLocal = (point) => ({
      x: point.x * scale - (piece._import.minX + (Math.max(...piece.points.map((p) => p.x)) - Math.min(...piece.points.map((p) => p.x))) * 0.5),
      y: point.y * scale - piece._import.minY,
    })

    if (/^BUTTONHOLE_/i.test(entity.layer)) {
      const a = toLocal(entity.a)
      const b = toLocal(entity.b)
      const dx = b.x - a.x
      const dy = b.y - a.y
      piece.buttonholes.push({
        id: `import-buttonhole-${piece.buttonholes.length + 1}`,
        x: (a.x + b.x) * 0.5,
        y: (a.y + b.y) * 0.5,
        lengthCm: Math.hypot(dx, dy),
        widthCm: 0.35,
        orientationDeg: Math.atan2(dy, dx) * 180 / Math.PI,
        color: '#575757',
      })
    } else if (/^NOTCH_/i.test(entity.layer)) {
      // Factory NOTCH lines originate on the physical CUT and point inward;
      // attaching them directly to a STITCH reference would invent incorrect
      // sewing notches and lose double-notch pairing. Keep cut-reference only.
      if(isFactory&&options.manufacturingImport==='stitch-reference')continue
      const midpoint = toLocal({ x: (entity.a.x + entity.b.x) * 0.5, y: (entity.a.y + entity.b.y) * 0.5 })
      const nearest = nearestStraightEdge(piece.points, midpoint)
      if (nearest && nearest.distance < 1.5) {
        // DXF stores the physical notch lines, not a conceptual paired-mark
        // container. Treat distinct 6 mm match marks as two physical notches;
        // the old 8%-of-edge merge silently discarded the second station.
        // Only an effectively identical line can be deduplicated.
        const duplicate = piece.notches.some((notch) => notch.edgeIndex === nearest.edgeIndex && Math.abs(notch.t - nearest.t) < 0.00001)
        const depthCm = Math.hypot(entity.b.x - entity.a.x, entity.b.y - entity.a.y) * scale
        if (!duplicate && Number.isFinite(depthCm) && depthCm > 0) {
          piece.notches.push({ id: `import-notch-${piece.notches.length + 1}`, edgeIndex: nearest.edgeIndex, t: nearest.t, type: 'single', depthCm })
        }
      }
    } else if (/^GRAIN_/i.test(entity.layer)) {
      const dx = entity.b.x - entity.a.x
      const dy = entity.b.y - entity.a.y
      piece.grainAngleDeg = Math.atan2(dx, dy) * 180 / Math.PI
    } else if (/^INTERNAL_/i.test(entity.layer) || /^DART_/i.test(entity.layer)) {
      const type = /DART/i.test(entity.layer) ? 'dart' : /FOLD/i.test(entity.layer) ? 'fold' : 'construction'
      piece.internalLines.push({
        id: `import-internal-${piece.internalLines.length + 1}`,
        name: `Imported ${type}`,
        type,
        widthCm: type === 'dart' ? 2.5 : undefined,
        foldAngleDeg: type === 'fold' ? 135 : undefined,
        a: toLocal(entity.a),
        b: toLocal(entity.b),
      })
    }
  }

  for (const piece of pieces) { delete piece._import; delete piece.sourceToken }
  return { pieces, scaleToCm: scale, entityCount: entities.length,
    ...(isFactory?{
      manufacturingReference:true,
      referenceMode:options.manufacturingImport,
      referenceSize:factorySize,
      factoryCertified:false,
      warnings:[
        'Reference only: original curves, point-grade breaks, authored seam allowance widths, sewing relationships, and notch pairs were not reconstructed.',
        options.manufacturingImport==='cut-reference'
          ? 'Imported geometry is the physical cutter outline with seamAllowance=0, not an editable sewn garment pattern.'
          : 'Imported geometry is only the sewing outline; physical cut and notches are not recovered as editable authored allowances.',
      ],
    }:{}),
  }
}
