import {gradeProject, DEFAULT_SIZES} from './grading.js'

const valid = n => typeof n === 'number' && Number.isFinite(n)
const fail = message => { throw new Error(`AccuMark full pattern grade nest: ${message}`) }
const uniqueNames = (items, what) => {
  if (!Array.isArray(items) || !items.length || items.length > 64 ||
    items.some(item => typeof item !== 'string' || !item.trim()) ||
    new Set(items).size !== items.length) fail(`invalid or duplicate ${what}`)
}
const finitePoint = point => valid(point?.x) && valid(point?.y)
const boundsOf = coords => {
  if (!coords.length || coords.some(point => !finitePoint(point))) fail('invalid bounds geometry')
  return {minX: Math.min(...coords.map(p => p.x)), minY: Math.min(...coords.map(p => p.y)),
    maxX: Math.max(...coords.map(p => p.x)), maxY: Math.max(...coords.map(p => p.y))}
}

/** Exact stitchline Q geometry in the shared 2D canvas coordinate frame.
 * Layout coordinates are in the same workspace units as the 2D pattern board;
 * individual piece geometry and grade rules remain in centimetres.
 */
export function buildAccuMarkFullPatternGradeNest(sourceProject, {
  pieceIds, sizes, baseSize, selectedSize, showPoints = true, showLabels = true,
  showVectors = false, maxPointsPerPiece = 1024,
} = {}) {
  if (!sourceProject || !Array.isArray(sourceProject.pieces) || !sourceProject.pieces.length || sourceProject.pieces.length > 256)
    fail('invalid project or excessive piece count')
  const available = sourceProject.grading?.sizes?.length ? sourceProject.grading.sizes : DEFAULT_SIZES
  uniqueNames(available, 'source sizes')
  const base = baseSize ?? sourceProject.grading?.baseSize ?? 'M'
  if (!available.includes(base) || base !== (sourceProject.grading?.baseSize || 'M')) fail('base size must match authored grade rules')
  const requestedSizes = sizes ?? available
  uniqueNames(requestedSizes, 'requested sizes')
  if (requestedSizes.some(size => !available.includes(size))) fail('unknown grade size')
  if (selectedSize !== undefined && !requestedSizes.includes(selectedSize)) fail('selected size absent from requested run')
  if (!Number.isInteger(maxPointsPerPiece) || maxPointsPerPiece < 3 || maxPointsPerPiece > 10000)
    fail('invalid point limit')
  if ([showPoints, showLabels, showVectors].some(value => typeof value !== 'boolean')) fail('invalid visibility flag')
  uniqueNames(sourceProject.pieces.map(piece => piece?.id), 'source piece IDs')
  const requestedIds = pieceIds ?? sourceProject.pieces.map(piece => piece.id)
  uniqueNames(requestedIds, 'requested piece IDs')
  const sourceMap = new Map(sourceProject.pieces.map(piece => [piece.id, piece]))
  if (requestedIds.some(id => !sourceMap.has(id))) fail('requested piece missing')
  for (const id of requestedIds) {
    const piece = sourceMap.get(id)
    if (!Array.isArray(piece.points) || piece.points.length < 3 || piece.points.length > maxPointsPerPiece ||
      piece.points.some(point => !finitePoint(point))) fail(`invalid point topology in ${id}`)
    if (piece.layout2d && (!valid(piece.layout2d.x) || !valid(piece.layout2d.y))) fail(`invalid layout in ${id}`)
    for (const [key, curve] of Object.entries(piece.curves || {})) {
      if (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= piece.points.length ||
        !valid(curve?.cx) || !valid(curve?.cy)) fail(`invalid quadratic control in ${id}`)
    }
  }
  const gradeSizes = [...new Set([base, ...requestedSizes])]
  const snapshots = new Map(gradeSizes.map(size => [size, gradeProject(sourceProject, size)]))
  const gradedMaps = new Map()
  for (const [size, snapshot] of snapshots) {
    if (!Array.isArray(snapshot?.pieces) || snapshot.pieces.length !== sourceProject.pieces.length)
      fail(`piece topology mismatch in ${size}`)
    uniqueNames(snapshot.pieces.map(piece => piece?.id), `graded piece IDs in ${size}`)
    const map = new Map(snapshot.pieces.map(piece => [piece.id, piece]))
    for (const id of requestedIds) {
      const original = sourceMap.get(id), piece = map.get(id)
      if (!piece || !Array.isArray(piece.points) || piece.points.length !== original.points.length ||
        piece.points.some(point => !finitePoint(point))) fail(`point topology mismatch in ${id} ${size}`)
      const oldCurves = Object.keys(original.curves || {}).sort(), nextCurves = Object.keys(piece.curves || {}).sort()
      if (JSON.stringify(oldCurves) !== JSON.stringify(nextCurves) ||
        nextCurves.some(key => !valid(piece.curves[key]?.cx) || !valid(piece.curves[key]?.cy)))
        fail(`curve topology mismatch in ${id} ${size}`)
    }
    gradedMaps.set(size, map)
  }
  const pieces = requestedIds.map(pieceId => {
    const original = sourceMap.get(pieceId)
    const layout2d = {...(original.layout2d || {x:0,y:0})}
    const toCanvas = point => ({x: layout2d.x + point.x, y: layout2d.y - point.y})
    const basePoints = gradedMaps.get(base).get(pieceId).points
    const outputs = requestedSizes.map((size, sizeIndex) => {
      const piece = gradedMaps.get(size).get(pieceId)
      const points = piece.points.map((point, index) => {
        const xy = toCanvas(point), reference = basePoints[index]
        return {index, x:xy.x, y:xy.y, xLocalCm:point.x, yLocalCm:point.y,
          dxCm:point.x-reference.x, dyCm:point.y-reference.y}
      })
      const commands = [`M ${points[0].x} ${points[0].y}`]
      const geometry = points.map(({x,y}) => ({x,y}))
      for (let index=0; index<points.length; index++) {
        const next = points[(index+1)%points.length]
        const control = piece.curves?.[index]
        if (control) {
          const c = toCanvas({x:control.cx,y:control.cy})
          // True quadratic path; evaluate derivative roots for tight bounds.
          const p = points[index]
          for (const [a, b, controlAxis] of [[p.x,next.x,c.x], [p.y,next.y,c.y]]) {
            const denominator = a - 2*controlAxis + b
            const t = Math.abs(denominator) > 1e-12 ? (a-controlAxis)/denominator : -1
            if (t > 0 && t < 1) {
              const u=1-t
              geometry.push({x:u*u*p.x+2*u*t*c.x+t*t*next.x,
                y:u*u*p.y+2*u*t*c.y+t*t*next.y})
            }
          }
          commands.push(`Q ${c.x} ${c.y} ${next.x} ${next.y}`)
        } else commands.push(`L ${next.x} ${next.y}`)
      }
      commands.push('Z')
      const bounds = boundsOf(geometry)
      const labelAnchor = {x:bounds.maxX + 1.5 + sizeIndex * 1.5,
        y:bounds.minY + sizeIndex * 2.5}
      return {size,path:commands.join(' '),points,bounds,labelAnchor}
    })
    const combined = boundsOf(outputs.flatMap(item => [{x:item.bounds.minX,y:item.bounds.minY},{x:item.bounds.maxX,y:item.bounds.maxY}]))
    return {pieceId,pieceName:original.name || pieceId,layout2d,pointCount:original.points.length,sizes:outputs,bounds:combined}
  })
  return {schema:'exo.accumark.full-pattern-grade-nest.v1',pieces,sizes:[...requestedSizes],baseSize:base,
    selectedSize:selectedSize ?? base,showPoints,showLabels,showVectors,maxPointsPerPiece,
    bounds:boundsOf(pieces.flatMap(piece => [{x:piece.bounds.minX,y:piece.bounds.minY},{x:piece.bounds.maxX,y:piece.bounds.maxY}])),
    units:'cm',displayOnly:true}
}
