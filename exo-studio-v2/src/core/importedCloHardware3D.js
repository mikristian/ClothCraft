import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import {createImportedCloMaterial} from './importedCloMaterial.js'

const loader = new GLTFLoader()
const modelCache = new Map()
const zAxis = new THREE.Vector3(0, 0, 1)
const tempNormal = new THREE.Vector3()
const tempPoint = new THREE.Vector3()

export function getImportedCloModel(url) {
  if (typeof url !== 'string' || !url.startsWith('/clo-hardware-converted/models/') || !url.endsWith('.glb')) {
    return Promise.reject(new Error('Invalid imported CLO hardware model URL'))
  }
  if (!modelCache.has(url)) {
    const request = loader.loadAsync(url).then(gltf => gltf.scene).catch(error => {
      modelCache.delete(url)
      throw error
    })
    modelCache.set(url, request)
  }
  return modelCache.get(url)
}

function flatBarycentric(simPiece, x, y) {
  const vertices = simPiece.flatVertices || []
  for (const face of simPiece.faces || []) {
    const [ia, ib, ic] = face
    const a = vertices[ia], b = vertices[ib], c = vertices[ic]
    if (!a || !b || !c) continue
    const denominator = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y)
    if (Math.abs(denominator) < 1e-10) continue
    const wa = ((b.y - c.y) * (x - c.x) + (c.x - b.x) * (y - c.y)) / denominator
    const wb = ((c.y - a.y) * (x - c.x) + (a.x - c.x) * (y - c.y)) / denominator
    const wc = 1 - wa - wb
    if (Math.min(wa, wb, wc) >= -0.0001) return { indices: face, weights: [wa, wb, wc] }
  }
  // Outside the triangle domain, attach to the nearest cloth vertex.
  let best = 0, distance = Infinity
  vertices.forEach((vertex, index) => {
    const squared = (vertex.x - x) ** 2 + (vertex.y - y) ** 2
    if (squared < distance) { best = index; distance = squared }
  })
  return vertices.length ? { indices: [best, best, best], weights: [1, 0, 0] } : null
}

export function updateImportedCloHardware3D(record) {
  const position = record.meshRecord.geometry.getAttribute('position')
  const normal = record.meshRecord.geometry.getAttribute('normal')
  if (!position || !normal || !record.mapping) return
  tempPoint.set(0, 0, 0)
  tempNormal.set(0, 0, 0)
  record.mapping.indices.forEach((index, i) => {
    const weight = record.mapping.weights[i]
    tempPoint.x += position.getX(index) * weight
    tempPoint.y += position.getY(index) * weight
    tempPoint.z += position.getZ(index) * weight
    tempNormal.x += normal.getX(index) * weight
    tempNormal.y += normal.getY(index) * weight
    tempNormal.z += normal.getZ(index) * weight
  })
  if (tempNormal.lengthSq() < 1e-10) tempNormal.set(0, 0, 1)
  tempNormal.normalize()
  record.object.position.copy(tempPoint).addScaledVector(tempNormal, record.lift)
  record.object.position.add(record.meshRecord.mesh.position)
  record.object.quaternion.setFromUnitVectors(zAxis, tempNormal)
  record.object.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(zAxis, THREE.MathUtils.degToRad(record.rotationDeg)))
  record.object.visible = record.visible && record.meshRecord.mesh.visible
}

/** Load a real model, sized in meters, for attachment to the live PBD cloth surface. */
export async function createImportedCloHardware3D(placement, meshRecord) {
  const url = placement.glbUrl || placement.glb
  const source = await getImportedCloModel(url)
  const object = source.clone(true)
  const ownedMaterials = []
  // Imported CLO GLB coordinates vary: normalize visually to cloth-facing +Z.
  const visual = new THREE.Group()
  const orientation = new THREE.Group()
  visual.add(orientation)
  orientation.add(object)
  const root = new THREE.Group()
  root.add(visual)
  const bounds = new THREE.Box3().setFromObject(object)
  const size = bounds.getSize(new THREE.Vector3())
  const center = bounds.getCenter(new THREE.Vector3())
  object.position.sub(center)
  // Most CLO button meshes are authored in X/Z with Y as thickness. Rotate
  // their thin axis onto the cloth-normal Z axis before applying dimensions.
  if (size.y < Math.min(size.x, size.z) * 0.5) orientation.rotation.x = Math.PI / 2
  const orientedSize = size.y < Math.min(size.x, size.z) * 0.5
    ? [size.x, size.z, size.y] : [size.x, size.y, size.z]
  // Vendor conversion reports meters, but explicit dimensions must control final print-scale.
  const current = orientedSize
  const requested = [placement.widthMm, placement.heightMm, placement.depthMm]
  const factors = requested.map((mm, i) => Number.isFinite(Number(mm)) && Number(mm) > 0 && current[i] > 1e-8
    ? Number(mm) / 1000 / current[i] : null)
  const uniform = factors.find(factor => factor != null) ?? 1
  visual.scale.set(...factors.map(factor => factor ?? uniform))
  object.traverse(child => {
    if (!child.isMesh) return
    child.material = (Array.isArray(child.material) ? child.material : [child.material]).map(original => {
      const material = createImportedCloMaterial(original,placement)
      ownedMaterials.push(material)
      return material
    })
    if (child.material.length === 1) child.material = child.material[0]
    child.renderOrder = 34
    child.castShadow = true
    child.receiveShadow = true
  })
  const record = {
    type: 'imported-clo-hardware', object: root, meshRecord,
    mapping: flatBarycentric(meshRecord.simPiece, Number(placement.x) || 0, Number(placement.y) || 0),
    lift: (Number(placement.liftMm) || 1) / 1000,
    rotationDeg: Number(placement.rotationDeg) || 0,
    visible: placement.visible !== false,
    dispose() { ownedMaterials.forEach(material => material.dispose()) },
  }
  root.name = `imported-clo-hardware-${placement.id || placement.assetId || 'asset'}`
  root.userData.importedAssetId = placement.assetId || placement.importedAssetId || null
  updateImportedCloHardware3D(record)
  return record
}
