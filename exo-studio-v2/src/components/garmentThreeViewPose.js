import * as THREE from 'three'
import { garmentPreviewPose } from '../core/garmentPreviewGeometry.js'
import { samplePieceBoundary } from '../core/project.js'

function boundsPose(piece, callback) {
  const points = samplePieceBoundary(piece, 7).points
  const xs = points.map(p => p.x), ys = points.map(p => p.y)
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2
  const rx = Math.max(.001, (Math.max(...xs) - Math.min(...xs)) / 2)
  const ry = Math.max(.001, (Math.max(...ys) - Math.min(...ys)) / 2)
  return point => callback((point.x - cx) / rx, (point.y - cy) / ry)
}

/**
 * Presentation-only pattern pose. Source points, seam references and stitch
 * coordinates remain authoritative; this transform is not simulated draping.
 */
export function garmentThreeViewPose(piece, templateId, index, count) {
  const upperBody = ['tee', 'hoodie', 'zip-hoodie'].includes(templateId)
  const sourcePose = garmentPreviewPose(
    piece, templateId === 'tee' ? 'tee-exploded' : 'pattern-study', index, count,
  )
  const id = String(piece.id || '')
  const wrap = String(piece.arrangement3d?.wrap || '')
  if (templateId === 'jeans-501') {
    const legSide = /^(left|right)-/.exec(id)?.[1]
    const side = legSide === 'left' ? -1 : 1
    const rear = /back|yoke/.test(id)
    const depth = rear ? -.45 : .45
    if (/leg$/.test(id)) return sourcePose
    if (/yoke/.test(id)) return boundsPose(piece, (u, v) => new THREE.Vector3(side * .45 - side * u * .25, 1.13 + v * .13, -.48 - .065 * Math.cos(u)))
    if (/back-pocket/.test(id)) return boundsPose(piece, (u, v) => new THREE.Vector3(side * .45 - side * u * .18, .74 + v * .23, -.52 - .04 * Math.cos(u)))
    if (/front-pocket-(bag|facing)/.test(id)) return boundsPose(piece, (u, v) => new THREE.Vector3(side * .45 - side * u * .19, .94 + v * .21, .50 + (/facing/.test(id) ? .035 : .08)))
    if (/waistband/.test(id)) return boundsPose(piece, (u, v) => new THREE.Vector3(side * .45 - side * u * .24, 1.26 + v * .09, depth + .045 * Math.cos(u)))
    if (/coin-pocket/.test(id)) return boundsPose(piece, (u, v) => new THREE.Vector3(.52 + u * .085, 1.06 + v * .105, .61))
    if (/fly/.test(id)) return boundsPose(piece, (u, v) => new THREE.Vector3((/shield/.test(id) ? -.045 : .045) + u * .065, 1.06 + v * .22, .59))
    if (/belt-loop/.test(id)) {
      const ordinal = Math.max(0, Number(id.match(/\d+$/)?.[0] || 1) - 1)
      const angle = (ordinal / 5) * Math.PI * 2
      return boundsPose(piece, (u, v) => new THREE.Vector3(.70 * Math.sin(angle) + u * .045 * Math.cos(angle), 1.26 + v * .12, .51 * Math.cos(angle) - u * .045 * Math.sin(angle)))
    }
  }
  if (!upperBody) return sourcePose
  const torso = piece.id === 'front' || piece.id === 'back' || (templateId === 'zip-hoodie' && ['front-left', 'front-right'].includes(piece.id))
  if (torso) {
    return point => {
      const halfWidth = templateId === 'tee' ? 27.5 : 31
      const p = templateId === 'tee' ? sourcePose(point) : new THREE.Vector3(
        .98 * Math.sin(point.x / halfWidth * 1.02), (point.y - 35.5) * .0355,
        (piece.id === 'back' ? -1 : 1) * (.21 + .27 * Math.cos(point.x / halfWidth * 1.02)),
      )
      // Concentrate the inward bow in the middle third of the cloth.
      // A smooth zero-slope falloff keeps the side seam/armhole positions
      // aligned with the original pattern even after increasing the bow.
      const width = Math.max(0, 1 - Math.pow(point.x / halfWidth, 2))
      const middle = width * width
      // The central fabric bows gently toward the space between the panels.
      // Both source contours remain unchanged in drafting coordinates.
      const waistDrape = (.018 * Math.sin(point.y * .22 + point.x * .09)
        + .025 * Math.sin((point.y - 18) * .065)) * middle
      // Shape a shallow, continuous scoop into each separate panel, with
      // zero displacement at the outer seams and no new drafted vertices.
      p.z -= (piece.id === 'back' ? -1 : 1) * (.37 * middle + waistDrape)
      return p
    }
  }
  if (piece.id === 'sleeve-left' || piece.id === 'sleeve-right') {
    return point => {
      // Each cap points toward the body; each cuff extends away and down.
      // Mirroring x and z gives symmetric sleeves without flipping vertical.
      const side = piece.id === 'sleeve-left' ? -1 : 1
      // Preserve a continuous derivative at the cap apex so lighting normals
      // stay finite when the geometry sampler steps just beyond the cut line.
      const sleeveLength = templateId === 'tee' ? 25 : 62
      const sleeveHalfWidth = templateId === 'tee' ? 17.25 : 19
      const run = (sleeveLength - point.y) / sleeveLength
      const phi = point.x / sleeveHalfWidth * 2.20
      // The hem rolls wider than the cap; both sleeves use the same
      // vertical mapping so one cannot end up inverted in the back view.
      const radius = .32 + .065 * Math.max(0, Math.min(1, run))
      return new THREE.Vector3(
        side * (1.00 + run * (templateId === 'tee' ? .79 : 1.18)),
        .74 - run * (templateId === 'tee' ? .39 : .78) + .18 * Math.cos(phi),
        side * (radius * Math.sin(phi)),
      )
    }
  }
  if (wrap === 'hood-left' || wrap === 'hood-right' || /^hood-(left|right)$/.test(id)) {
    const side = id.endsWith('left') ? -1 : 1
    return boundsPose(piece, (u, v) => {
      const angle = u * 1.18
      return new THREE.Vector3(side * (.31 + .27 * Math.sin(angle)), 1.19 + (v + 1) * .37, -.10 + .37 * Math.cos(angle) + .04 * v)
    })
  }
  if (wrap === 'left-wrist' || wrap === 'right-wrist' || id.startsWith('rib-cuff-')) {
    const side = /left/.test(id) ? -1 : 1
    return boundsPose(piece, (u, v) => new THREE.Vector3(side * (2.04 + v * .13), -.02 + v * .075 + .20 * Math.cos(u * 1.45), .34 * Math.sin(u * 1.45)))
  }
  if (wrap === 'waist-band' || id === 'rib-waistband') {
    return boundsPose(piece, (u, v) => new THREE.Vector3(1.04 * Math.sin(u * 1.45), -1.03 + v * .12, .46 * Math.cos(u * 1.45)))
  }
  if (id === 'kangaroo-pocket' || id.includes('pocket')) {
    return boundsPose(piece, (u, v) => new THREE.Vector3(u * .46, -.53 + v * .25, .49 + .055 * (1 - u * u)))
  }
  // Truly unknown accessories retain a compact source-derived overview.
  if (templateId !== 'tee') return point => {
    const p = sourcePose(point)
    p.x *= .64
    p.y = -1.85 + p.y * .35
    p.z *= .55
    return p
  }
  return sourcePose
}
