import * as THREE from 'three'
import { initialPosition } from './physics.js'
import { resolvePatternArrangement } from './patternBodyArrangement.js'
import {rustStagingCylinder,rustStagingBlend} from './rustStagingKernel.js'

/**
 * Body-adjacent, gently curved initial 3D pattern arrangement. The source
 * 2D pattern is unchanged; this display-only staging is not a drape solve.
 * The same triangulation and particle indices are used for seam correspondence.
 */
export function stagedPanelPositions(simPiece, avatar = {}) {
  const flats = simPiece.flatVertices || []
  if (!flats.length) return []
  const arrangement = resolvePatternArrangement(simPiece.piece)
  if (flats.some(point => !point || !Number.isFinite(point.x) || !Number.isFinite(point.y)))
    throw new RangeError('Invalid staging pattern coordinates')
  const heightCm = Number(avatar.heightCm ?? 180)
  if (!Number.isFinite(heightCm) || heightCm <= 0)
    throw new RangeError('Invalid avatar height for staging')
  for (const key of ['x', 'y', 'z', 'stagingOffsetX', 'stagingOffsetY', 'stagingOffsetZ', 'stagingRotationX', 'stagingRotationY', 'stagingRotationZ', 'sewingClearanceM']) {
    if (arrangement[key] != null && !Number.isFinite(Number(arrangement[key])))
      throw new RangeError(`Invalid staging arrangement ${key}`)
  }
  const wrap = arrangement.wrap || 'flat'
  const scale = THREE.MathUtils.clamp(heightCm / 180, 0.6, 1.5)
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const point of flats) {
    if (point.x < minX) minX = point.x
    if (point.x > maxX) maxX = point.x
    if (point.y < minY) minY = point.y
    if (point.y > maxY) maxY = point.y
  }
  const centerX = (minX + maxX) * 0.5
  const flip = arrangement.flip ? -1 : 1
  const side = wrap.startsWith('left-') ? -1 : 1
  const xOffset = Number(arrangement.x || 0)
  const zOffset = Number(arrangement.z || 0)
  const yOffset = Number(arrangement.y || 0)
  const bodyFront = wrap === 'front' || wrap === 'lower-front'
  const bodyBack = wrap === 'back' || wrap === 'lower-back'
  const isArm = wrap === 'left-arm' || wrap === 'right-arm'
  const isLeg = ['left-leg-front', 'left-leg-back', 'right-leg-front', 'right-leg-back'].includes(wrap)
  const hood = wrap === 'hood-left' || wrap === 'hood-right'
  const isRing = ['neck', 'waist-band', 'left-wrist', 'right-wrist'].includes(wrap)
  const panelHalfWidth = Math.max(0.01, (maxX - minX) * 0.005)

  const positions = flats.map((point) => {
    // Physical pattern dimensions are fixed in centimeters. Avatar height
    // changes the *placement* of a flat pattern, never its width or length.
    // Scaling the actual polygon with the avatar made a 71 cm shirt panel
    // visually 63 cm on a 160 cm avatar, corrupting the pre-fit comparison.
    const localX = (point.x - centerX) * 0.01 * flip
    const localY = (point.y - minY) * 0.01
    let x = xOffset + localX
    let y = yOffset * scale + localY
    let z = zOffset

    if (bodyFront || bodyBack) {
      // Preserve the drafted arc length while forming a true cylindrical
      // surface. Each panel bends toward the body's flanks and remains an
      // independent sheet ready for edge sewing.
      const halfAngle = 1.10
      const radius = Math.max(.02, panelHalfWidth / halfAngle)
      const angle = THREE.MathUtils.clamp(localX / radius, -halfAngle, halfAngle)
      const direction = bodyFront ? 1 : -1
      const accelerated=rustStagingCylinder(localX,panelHalfWidth,scale,xOffset,zOffset,direction)
      x = accelerated ? accelerated[0] : xOffset + Math.sin(angle) * radius
      z = accelerated ? accelerated[1] : direction * ((.18 * scale) + radius * (Math.cos(angle) - Math.cos(halfAngle)))
        + (zOffset - direction * 0.245)
    }
    else if (isArm) {
      // The sleeve cap starts next to the shoulder, while the sleeve itself
      // is flat and entirely OUTSIDE the cylindrical arm rather than worn.
      x = (wrap === 'left-arm' ? -0.59 : 0.59) * scale
        + (xOffset - (wrap === 'left-arm' ? -0.285 : 0.285)) + localX
      // Sleeve wraps slightly around the corresponding arm. This only
      // changes its preview surface, not the sewing constraints or pattern.
      z = 0.045 * scale + zOffset - 0.065 * Math.pow(Math.min(1, Math.abs(localX) / panelHalfWidth), 1.5)
    } else if (isLeg) {
      // Share the actual solver's anatomy-aware leg/pelvis mapping. This keeps
      // front and back cut edges in the same neighborhood through the crotch
      // transition instead of displaying four unrelated flat rectangles.
      const bent = initialPosition({ ...simPiece.piece, arrangement3d: arrangement },
        point, { minX, maxX, minY, maxY }, avatar)
      x = bent.x
      y = bent.y
      z = bent.z + (wrap.endsWith('-front') ? 1 : -1) *
        THREE.MathUtils.clamp(Number(arrangement.sewingClearanceM ?? .035), 0, .12)
    } else if (hood) {
      x = side * 0.33 * scale + xOffset + localX
      y = (1.59 * scale) + localY - 0.10
      z = -0.34 * scale + zOffset
    } else if (isRing) {
      // Ribbing/strips also begin flat near their final body location.
      const stageX = wrap === 'left-wrist' ? -0.73 : wrap === 'right-wrist' ? 0.73 : 0
      x = stageX * scale + xOffset + localX
      y = (wrap === 'neck' ? 1.54 : wrap === 'waist-band' ? 0.86 : 1.00) * scale + localY
      z = 0.48 * scale + zOffset
    }
    // The user can drag a flat panel with the 3D Move tool before sewing.
    // Keep that placement separate from the physical solver's fitted pose.
    return new THREE.Vector3(
      x + Number(arrangement.stagingOffsetX || 0),
      y + Number(arrangement.stagingOffsetY || 0),
      z + Number(arrangement.stagingOffsetZ || 0),
    )
  })

  // CLO-style pre-sew orientation is independent of the pattern's 2D drafting
  // coordinates and of the fitted solver state. Rotate about the panel's
  // center so the 3D rotation rings turn the entire flat fabric piece.
  const rotation = new THREE.Euler(
    THREE.MathUtils.degToRad(Number(arrangement.stagingRotationX || 0)),
    THREE.MathUtils.degToRad(Number(arrangement.stagingRotationY || 0)),
    THREE.MathUtils.degToRad(Number(arrangement.stagingRotationZ || 0)),
    'XYZ',
  )
  if (Math.abs(rotation.x) + Math.abs(rotation.y) + Math.abs(rotation.z) > 0.000001) {
    const centroid = new THREE.Vector3()
    for (const point of positions) centroid.add(point)
    centroid.multiplyScalar(1 / positions.length)
    const quaternion = new THREE.Quaternion().setFromEuler(rotation)
    for (const point of positions) point.sub(centroid).applyQuaternion(quaternion).add(centroid)
  }
  return positions
}

export function setStagedGeometry(geometry, positions, fittedPositions = null, fitBlend = 0) {
  const attribute = geometry.getAttribute('position')
  if (!attribute || !Array.isArray(positions) || attribute.count !== positions.length ||
      (fittedPositions != null && (!Array.isArray(fittedPositions) || fittedPositions.length !== positions.length)) ||
      !Number.isFinite(fitBlend)) return false
  const t = THREE.MathUtils.clamp(fitBlend, 0, 1)
  const valid = point => point && [point.x, point.y, point.z].every(Number.isFinite)
  if (positions.some(point => !valid(point)) || (t > 0 && fittedPositions?.some(point => !valid(point))))
    return false
  // Compute the full frame before touching a GPU attribute. Even finite
  // endpoints can overflow while interpolating unusually large coordinates.
  const next = positions.map((staged, i) => {
    const fitted = fittedPositions?.[i] || staged
    return ['x', 'y', 'z'].map(axis =>
      rustStagingBlend(staged[axis], fitted[axis], t) ?? THREE.MathUtils.lerp(staged[axis], fitted[axis], t))
  })
  const coordinateLimit = attribute.array instanceof Float32Array ? 3.4028234663852886e38 : Number.MAX_VALUE
  if (next.some(point => point.some(value => !Number.isFinite(value) || Math.abs(value) > coordinateLimit))) return false
  for (let i = 0; i < positions.length; i += 1) {
    attribute.setXYZ(i, ...next[i])
  }
  attribute.needsUpdate = true
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return true
}
