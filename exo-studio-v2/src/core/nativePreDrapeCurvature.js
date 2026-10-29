import {rustPreDrapeArc} from './rustPreDrapeCurvatureKernel.js'

// Preview-only shaping for a reset Rust garment. Never pass these coordinates to
// the native solver, undo history, placement handlers, or project serialization.
export function preDrapeDisplayPositions(snapshot) {
  const source = snapshot?.positions
  if (!Array.isArray(source) || !source.length || !Number.isFinite(snapshot?.time) || snapshot.time > 1e-7 || snapshot.grabActive) return source || []
  const display = source.slice()
  const avatarVertices = snapshot?.avatar?.positions || []
  let avatarLeft = Infinity, avatarRight = -Infinity, avatarNear = Infinity, avatarFar = -Infinity
  for (const vertex of avatarVertices) {
    if (!Array.isArray(vertex) || !vertex.every(Number.isFinite)) continue
    avatarLeft = Math.min(avatarLeft,vertex[0])
    avatarRight = Math.max(avatarRight,vertex[0])
    avatarNear=Math.min(avatarNear,vertex[2]); avatarFar=Math.max(avatarFar,vertex[2])
  }
  const avatarMidX = Number.isFinite(avatarLeft) && Number.isFinite(avatarRight)
    ? (avatarLeft + avatarRight) / 2 : null
  let shaped = 0
  for (const panel of snapshot.panels || []) {
    const range = panel.triangles
    const tris = Array.isArray(range) ? snapshot.triangles?.slice(range[0], range[1]) : []
    const indices = [...new Set((tris || []).flat())].filter(i => Array.isArray(source[i]) && source[i].length >= 3 && source[i].every(Number.isFinite))
    if (indices.length < 6) continue
    // Do not spread an entire dense cloth panel into Math.min/Math.max: large
    // imported meshes can overflow the argument stack and blank the 3D view.
    let xMin = Infinity, xMax = -Infinity, zMin = Infinity, zMax = -Infinity, ySum = 0
    for (const index of indices) {
      const [x,y,z] = source[index]
      xMin = Math.min(xMin,x); xMax = Math.max(xMax,x)
      zMin = Math.min(zMin,z); zMax = Math.max(zMax,z)
      ySum += y
    }
    const xWidth = xMax - xMin, zWidth = zMax - zMin
    const alongX = xWidth >= zWidth
    const width = alongX ? xWidth : zWidth
    const thickness = alongX ? zWidth : xWidth
    // Already draped or angled panels should retain the actual Rust surface.
    if (width < .11 || thickness > width * .08) continue
    const center = alongX ? (xMin + xMax) / 2 : (zMin + zMax) / 2
    const depthCenter = alongX ? (zMin + zMax) / 2 : (xMin + xMax) / 2
    const bodyCenter = alongX && Number.isFinite(avatarNear) ? (avatarNear+avatarFar)/2 : (avatarMidX ?? 0)
    const sign = depthCenter < bodyCenter ? -1 : 1
    const halfAngle = 1.05
    const radius = width / (2 * halfAngle)
    const amplitude = radius * (1 - Math.cos(halfAngle))
    // For torso panels, use the fitting avatar's nearby surface to take the
    // unsimulated preview inward toward the body while retaining clearance.
    // The source Rust placement and actual solver particles remain untouched.
    let towardBody = 0
    if (alongX && avatarMidX !== null && Math.abs(center - avatarMidX) < .32) {
      const averageY = ySum / indices.length
      let surface = -Infinity, samples = 0
      for (const point of avatarVertices) {
        if (!Array.isArray(point) || point.length < 3 || !point.every(Number.isFinite)) continue
        if (Math.abs(point[1]-averageY) > .18 || Math.abs(point[0]-avatarMidX) > .15) continue
        surface = Math.max(surface,sign*point[2]); samples++
      }
      if (samples >= 8 && Number.isFinite(surface)) {
        const visibleCenter = sign*depthCenter + amplitude
        const desired = surface + .045
        towardBody = Math.max(-.24,Math.min(.24,desired-visibleCenter))
      }
    }
    for (const i of indices) {
      const p = source[i]
      const coord = alongX ? p[0] : p[2]
      const accelerated = rustPreDrapeArc(coord,center,width,radius,halfAngle,sign,towardBody)
      const angle = accelerated ? null : ((coord-center)*2/width) * halfAngle
      const bulge = accelerated ? accelerated[1] : sign * (radius * (Math.cos(angle)-Math.cos(halfAngle)) + towardBody)
      const result = [...p]
      result[alongX ? 0 : 2] = accelerated ? accelerated[0] : center + radius * Math.sin(angle)
      result[alongX ? 2 : 0] += bulge
      display[i] = result
    }
    shaped++
  }
  // Preserve reference equality when no reset-stage panel can be shaped.
  return shaped ? display : source
}
