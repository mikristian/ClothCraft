import { getStagePreset } from '../data/stagePresets.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js'
import { FontLoader } from 'three/addons/loaders/FontLoader.js'
import boldTypeface from 'three/examples/fonts/helvetiker_bold.typeface.json' with { type: 'json' }

// Studio stages contain hundreds of tiny bevels and floor details. Let the
// substantial vertical props cast shadows, while keeping the receiver surfaces
// and fine trim out of the shadow pass for predictable editor performance.
function configureRoomShadows(THREE, room) {
  const candidates = []
  let meshCount = 0
  let adjustedMaterials = 0
  let skippedNonStructural = 0
  const seenMaterials = new Set()
  room.updateWorldMatrix(true, true)
  room.traverse(node => {
    if (!node.isMesh || !node.geometry?.getAttribute('position')) return
    meshCount++
    node.castShadow = false
    node.receiveShadow = true
    for (const material of (Array.isArray(node.material) ? node.material : [node.material])) {
      if (!material?.isMeshStandardMaterial || seenMaterials.has(material)) continue
      seenMaterials.add(material)
      const name = (material.name || '').toLowerCase()
      // Viewer renderers use ACES tone mapping and a shared studio environment.
      // Tune only named PBR surfaces, retaining authored color/texture maps.
      if (/mirror/.test(name)) {
        material.metalness = 0.9
        material.roughness = 0.09
        material.envMapIntensity = 1.35
      } else if (/water surface/.test(name)) {
        material.metalness = 0.08
        material.roughness = 0.12
        material.envMapIntensity = 1.2
      } else if (/polished metal/.test(name)) {
        material.roughness = Math.max(0.23, material.roughness)
        material.envMapIntensity = 1.15
      } else if (/brushed brass|anodized/.test(name)) {
        material.roughness = Math.max(0.34, material.roughness)
        material.envMapIntensity = 1.05
      } else continue
      material.needsUpdate = true
      adjustedMaterials++
    }
    if (!node.visible || !node.geometry.getAttribute('position').count) return
    const meshMaterials = (Array.isArray(node.material) ? node.material : [node.material]).filter(Boolean)
    // A shadow-map pass treats even mirror and luminous artwork as opaque
    // blockers. Keep their reflection/emission visible without casting an
    // unnatural black silhouette across the garment or stage floor.
    if (meshMaterials.some(material => material.transparent || material.opacity < 0.98 ||
      /mirror|water surface|illuminated strip|emissive|light panel/i.test(material.name || ''))) {
      skippedNonStructural++
      return
    }
    // World-aligned bounds account for rotated props (e.g. reflectors and
    // foliage). Local bounding boxes misclassified these as floor trim.
    const bounds = new THREE.Box3().setFromObject(node)
    if (bounds.isEmpty()) return
    const size = bounds.getSize(new THREE.Vector3())
    // Floors and thin horizontal caps should receive, never cast; tiny trim
    // adds shadow draw calls with little visible improvement.
    if (size.y < 0.24 || Math.max(size.x, size.z) < 0.13) return
    // A full-height enclosing wall can obscure all direct garment lighting.
    // Reserve shadow casters for architectural props within the stage.
    if (Math.max(size.x, size.z) > 7 && size.y > 2.5) return
    const center = bounds.getCenter(new THREE.Vector3())
    const distance = Math.hypot(center.x, center.z)
    // Readable contact shadows around the garment matter more than massive
    // set pieces at the far end of a long runway.
    const score = size.y * Math.min(Math.max(size.x, size.z), 3) / (1 + distance * 0.18)
    candidates.push({ node, score })
  })
  candidates.sort((a, b) => b.score - a.score)
  for (const { node } of candidates.slice(0, 14)) node.castShadow = true
  return { meshCount, shadowCasters: Math.min(candidates.length, 14), adjustedMaterials, skippedNonStructural }
}

function disposeLoadedScene(scene) {
  const textures = new Set()
  scene.traverse(node => {
    node.geometry?.dispose?.()
    const materials = Array.isArray(node.material) ? node.material : node.material ? [node.material] : []
    for (const material of materials) {
      if (!material) continue
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value)
      material.dispose?.()
    }
  })
  for (const texture of textures) texture.dispose?.()
}

function createClothCraftLogo(THREE) {
  const logo = new THREE.Group()
  logo.name = 'ClothCraft 3D architectural studio wordmark'
  const shape = new THREE.Shape()
  shape.absarc(0, 0, 0.64, 0.38, Math.PI * 2 - 0.38, false)
  shape.absarc(0, 0, 0.39, Math.PI * 2 - 0.38, 0.38, true)
  shape.closePath()
  const geometry = new THREE.ExtrudeGeometry(shape, {depth: 0.13, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.035, bevelSegments: 3, curveSegments: 48})
  geometry.center()
  const material = new THREE.MeshStandardMaterial({color: 0xe5e8ed, metalness: 0.78, roughness: 0.22})
  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = true
  logo.add(mesh)
  const font = new FontLoader().parse(boldTypeface)
  const wordGeometry = new TextGeometry('ClothCraft', {
    // About 2.6 metres across including the emblem. The studio viewport is
    // often half-width: an unscaled 5+ metre sign filled the entire camera.
    font, size: 0.3, depth: 0.14, curveSegments: 8,
    bevelEnabled: true, bevelThickness: 0.016, bevelSize: 0.012, bevelSegments: 3,
  })
  wordGeometry.computeBoundingBox()
  const wordWidth = wordGeometry.boundingBox.max.x - wordGeometry.boundingBox.min.x
  wordGeometry.translate(-wordWidth / 2, -0.2, 0)
  const wordMesh = new THREE.Mesh(wordGeometry, material)
  wordMesh.castShadow = true
  wordMesh.name = 'ClothCraft full extruded wordmark'
  logo.add(wordMesh)
  mesh.position.set(-wordWidth / 2 - 0.35, 0.06, 0)
  mesh.scale.setScalar(0.3)
  logo.userData.defaultPosition=[0.3,2.85,-3.5]
  logo.position.fromArray(logo.userData.defaultPosition)
  return logo
}

export function applyStageSettings(THREE, group, settings = {}) {
  if (!group) return
  const room = group.userData.stageRoom
  const logo = group.userData.stageLogo
  const vec = (value, fallback) => Array.isArray(value) ? value : fallback
  const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback
  if (room) {
    room.position.fromArray(vec(settings.stagePosition, [0, 0, 0]).map((v, i) => finite(v, 0)))
    room.rotation.set(...vec(settings.stageRotation, [0, 0, 0]).map(v => finite(v, 0)))
    room.scale.set(...vec(settings.stageScale, [1, 1, 1]).map(v => Math.max(0.01, finite(v, 1))))
  }
  if (logo) {
    logo.visible = settings.logoVisible !== false
    logo.position.fromArray(vec(settings.logoPosition, logo.userData.defaultPosition).map(v => finite(v, 0)))
    logo.scale.setScalar(Math.max(0.05, finite(settings.logoScale, 1)) * (logo.userData.defaultScale || 1))
    logo.traverse(child => {if(child.isMesh)child.material.color.set(settings.logoColor || '#e5e8ed')})
  }
}

/**
 * Build a self-contained THREE scene group in metres; avatar stands at x/z=0,
 * with the floor at y=0. Caller owns lifecycle and must dispose geometries and
 * materials by scene traversal. No external textures or borrowed meshes.
 */
export function createStageEnvironment(THREE, stageId, onReady, stageSettings = {}) {
  const group = new THREE.Group()
  group.name = 'exo-stage-environment'
  group.userData.stageId = stageId || 'none'
  const preset = getStagePreset(stageId)
  if (!preset) return group
  group.userData.stagePreset = preset.id
  group.userData.source = preset.sceneFile
  const loader = new GLTFLoader()
  loader.load(preset.sceneFile, gltf => {
    if (group.userData.disposed) {
      disposeLoadedScene(gltf.scene)
      return
    }
    const room = gltf.scene
    room.name = `EXO Blender room ${preset.id}`
    const { meshCount: count, shadowCasters, adjustedMaterials, skippedNonStructural } = configureRoomShadows(THREE, room)
    if (!count) {
      group.userData.loadError = 'Exported room has no mesh geometry'
      disposeLoadedScene(room)
    } else {
      group.add(room)
      group.userData.stageRoom = room
      const logo = createClothCraftLogo(THREE)
      // Keep the sign high against the far wall and away from the editable
      // garment. Centre it in the typical narrow split 3D viewport.
      const bounds=new THREE.Box3().setFromObject(room)
      const size=bounds.getSize(new THREE.Vector3())
      const center=bounds.getCenter(new THREE.Vector3())
      const x=Math.max(bounds.min.x+1.4,Math.min(center.x+0.3,bounds.max.x-1.4))
      const y=Math.max(2.3,Math.min(bounds.max.y-0.8,2.85))
      // The authored rear backdrop lies at about z=-4 in the restored rooms.
      // Place the extruded wordmark *in front* of it, not behind opaque walls.
      const z=Math.min(-2.4,Math.max(bounds.min.z+1.8,-3.5))
      logo.userData.defaultPosition=[x,y,z]
      logo.position.set(x,y,z)
      logo.scale.setScalar(1)
      logo.userData.defaultScale=logo.scale.x
      group.add(logo)
      group.userData.stageLogo = logo
      applyStageSettings(THREE, group, stageSettings)
      group.userData.loaded = true
      group.userData.meshCount = count
      group.userData.shadowCasters = shadowCasters
      group.userData.adjustedMaterials = adjustedMaterials
      group.userData.skippedNonStructural = skippedNonStructural
    }
    onReady?.(group)
  }, undefined, error => {
    if (group.userData.disposed) return
    group.userData.loadError = error?.message || 'EXO Blender room unavailable'
    onReady?.(group)
  })
  return group
}
