import * as THREE from 'three'
import { getImportedCloModel } from '../core/importedCloHardware3D.js'
import {createImportedCloMaterial} from '../core/importedCloMaterial.js'

const Z = new THREE.Vector3(0, 0, 1)

function barycentric(p, a, b, c) {
  const denom = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
  if (Math.abs(denom) < 1e-12) return null
  const w0 = ((b[1] - c[1]) * (p[0] - c[0]) + (c[0] - b[0]) * (p[1] - c[1])) / denom
  const w1 = ((c[1] - a[1]) * (p[0] - c[0]) + (a[0] - c[0]) * (p[1] - c[1])) / denom
  return [w0, w1, 1 - w0 - w1]
}

/** Finds triangle and barycentric coordinates in the Rust-authoritative panel UV domain. */
export function nativeHardwareAnchor(snapshot, panelId, placement) {
  const panel = snapshot?.panels?.find(p => p.id === panelId)
  const uv = snapshot?.uv
  const faces = snapshot?.triangles
  if (!panel || !Array.isArray(uv) || !Array.isArray(faces)) return null
  const start = panel.triangles?.[0] || 0
  const end = panel.triangles?.[1] || 0
  if (!Number.isFinite(Number(placement.x)) || !Number.isFinite(Number(placement.y))) return null
  // Contract: native x/y in mm, UV stored in metres. Optional uvX/uvY can
  // pass coordinates in snapshot UV units directly if caller already has them.
  const point = [Number(placement.uvX ?? Number(placement.x) / 1000), Number(placement.uvY ?? Number(placement.y) / 1000)]
  for (let i = start; i < end; i++) {
    const face = faces[i]
    if (!face?.every?.(index => Array.isArray(uv[index]))) continue
    const weights = barycentric(point, uv[face[0]], uv[face[1]], uv[face[2]])
    if (weights && Math.min(...weights) >= -1e-4) return { indices: face, weights }
  }
  return null
}

export function updateNativeHardwareAnchor(record, snapshot, offset = null) {
  const positions = snapshot?.positions
  if (!positions) return false
  const point = new THREE.Vector3()
  const normal = new THREE.Vector3()
  const vertices = record.anchor.indices.map(index => positions[index])
  if (vertices.some(v => !v?.every?.(Number.isFinite))) return false
  vertices.forEach((position, index) => point.addScaledVector(new THREE.Vector3(...position), record.anchor.weights[index]))
  const edge1 = new THREE.Vector3(...vertices[1]).sub(new THREE.Vector3(...vertices[0]))
  const edge2 = new THREE.Vector3(...vertices[2]).sub(new THREE.Vector3(...vertices[0]))
  normal.crossVectors(edge1, edge2).normalize()
  if (normal.lengthSq() < 1e-9) normal.copy(Z)
  record.object.position.copy(point).addScaledVector(normal, record.lift)
  if (offset) record.object.position.add(offset)
  record.object.quaternion.setFromUnitVectors(Z, normal)
  record.object.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(Z, record.rotationDeg * Math.PI / 180))
  return true
}

/** Native-scene bridge: create once per placement, call update on Rust snapshots. */
export async function createNativeImportedHardwareOverlay(placement, snapshot, panelId, offset) {
  const anchor = nativeHardwareAnchor(snapshot, panelId, placement)
  if (!anchor) return null
  const source = await getImportedCloModel(placement.glbUrl)
  const root = new THREE.Group()
  const object = source.clone(true)
  const bounds = new THREE.Box3().setFromObject(object)
  const dimensions = bounds.getSize(new THREE.Vector3())
  const center = bounds.getCenter(new THREE.Vector3())
  const oriented = new THREE.Group()
  const sized = new THREE.Group()
  root.add(sized)
  sized.add(oriented)
  oriented.add(object)
  object.position.sub(center)
  const thinY = dimensions.y < Math.min(dimensions.x, dimensions.z) * 0.5
  if (thinY) oriented.rotation.x = Math.PI / 2
  const actual = thinY ? [dimensions.x, dimensions.z, dimensions.y] : dimensions.toArray()
  const wanted = [placement.widthMm, placement.heightMm, placement.depthMm]
  const scale = wanted.map((v, i) => Number(v) > 0 && actual[i] > 1e-8 ? Number(v) / 1000 / actual[i] : null)
  const fallback = scale.find(v => v != null) ?? 1
  sized.scale.set(...scale.map(v => v ?? fallback))
  const materials = []
  object.traverse(child => {
    if (!child.isMesh) return
    const sourceMaterials = Array.isArray(child.material) ? child.material : [child.material]
    const cloned = sourceMaterials.map(sourceMaterial => {
      const material = createImportedCloMaterial(sourceMaterial,placement)
      materials.push(material)
      return material
    })
    child.material = Array.isArray(child.material) ? cloned : cloned[0]
    child.castShadow = true
  })
  root.visible = placement.visible !== false
  root.name = `native-imported-hardware-${placement.id}`
  const record = {object:root, anchor, lift:(Number(placement.liftMm) || 1)/1000, rotationDeg:Number(placement.rotationDeg)||0,
    update(nextSnapshot, nextOffset) { return updateNativeHardwareAnchor(record, nextSnapshot, nextOffset) },
    dispose() { root.parent?.remove(root); materials.forEach(material => material.dispose()) }}
  record.update(snapshot, offset)
  return record
}
