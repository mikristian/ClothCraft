import * as THREE from 'three'

/**
 * Staged product illustration of the original four-panel studio shirt.
 * Its sizes come from the editable pattern, while its rounded surface is
 * intentionally independent of the cutting/sewing and simulation geometry.
 * Local +Z is the anatomical front; yaw +Math.PI/2 shows the side.
 */
export function createAvatarWornTeeDisplay(project, { fabricMaterial, edgeMaterial, resources = [] } = {}) {
  const nativeThreePanel = project?.pieces?.some(piece => piece.id === 'panel_1')
  const ids = nativeThreePanel ? ['front', 'back', 'panel_1'] : ['front', 'back', 'sleeve-left', 'sleeve-right']
  const parts = ids.map(id => project?.pieces?.find(piece => piece.id === id))
  if (parts.some(piece => !piece?.points?.length)) throw new Error('Avatar T-Shirt requires its native source panels')
  const [front, back, sleevePiece] = parts
  const span = piece => ({
    width: Math.max(...piece.points.map(p => p.x)) - Math.min(...piece.points.map(p => p.x)),
    height: Math.max(...piece.points.map(p => p.y)) - Math.min(...piece.points.map(p => p.y)),
  })
  const frontSize = span(front)
  const backSize = span(back)
  const sleeveSize = nativeThreePanel
    ? { width: front.points.length > 5 ? Math.abs(front.points[5].x - front.points[4].x) * 2 : 45,
        height: front.points.length > 6 ? Math.abs(front.points[6].y - front.points[4].y) : 25 }
    : span(sleevePiece)
  const nativeTorsoWidth = nativeThreePanel && front.points.length > 10
    ? Math.abs(front.points[7].x - front.points[10].x)
    : null
  const bodyWidth = nativeThreePanel ? nativeTorsoWidth * .024 : (frontSize.width + backSize.width) * .0095
  const length = Math.max(frontSize.height, backSize.height) * .025
  const sleeveReach = Math.min(.53, Math.max(.40, sleeveSize.height * .017))
  const group = new THREE.Group()
  group.name = 'avatar-worn-tee-staged-display'
  group.userData = {
    presentationOnly: true,
    patternIds: ids,
    originalPatternDimensionsCm: { front: frontSize, back: backSize, sleeve: sleeveSize },
    fitCertified: false,
    assembledForDisplay: true,
    nativePanelCount: nativeThreePanel ? 3 : 4,
  }
  const cloth = fabricMaterial || new THREE.MeshStandardMaterial({ color: '#d9d8d4', roughness: .85, side: THREE.DoubleSide })
  const trim = edgeMaterial || new THREE.MeshStandardMaterial({ color: '#c8c7c4', roughness: .92, side: THREE.DoubleSide })
  if (!fabricMaterial) resources.push(cloth)
  if (!edgeMaterial) resources.push(trim)
  const add = (name, geometry, material = cloth) => {
    const mesh = new THREE.Mesh(geometry, material)
    mesh.name = name
    mesh.userData.presentationOnly = true
    group.add(mesh)
    resources.push(geometry)
    return mesh
  }
  // Closed elliptical body shell with shallow front/back drape, natural waist
  // taper and a curved hem. The neck stays physically open.
  const neckWidth = bodyWidth * .29
  const rings = [
    { y: -.50 * length, x: bodyWidth * .96, z: bodyWidth * .48 },
    { y: -.34 * length, x: bodyWidth * .92, z: bodyWidth * .46 },
    { y: -.10 * length, x: bodyWidth * .90, z: bodyWidth * .48 },
    { y: .18 * length, x: bodyWidth, z: bodyWidth * .52 },
    { y: .40 * length, x: bodyWidth * .96, z: bodyWidth * .49 },
    { y: .46 * length, x: bodyWidth * .83, z: bodyWidth * .43 },
    { y: .50 * length, x: neckWidth, z: neckWidth * .72 },
  ]
  // Widths above are HALF widths. Source panels span full body width.
  for (const r of rings) { r.x *= .5; r.z *= .5 }
  const sides = 64
  const positions = [], indices = []
  for (let row = 0; row < rings.length; row++) {
    const r = rings[row]
    for (let s = 0; s <= sides; s++) {
      const theta = s / sides * Math.PI * 2
      const x = Math.sin(theta) * r.x
      const z = Math.cos(theta) * r.z
      const hemScoop = row === 0 ? .020 * (1 - Math.cos(theta)) / 2 : 0
      positions.push(x, r.y + hemScoop, z + .015 * Math.cos(theta) * Math.sin(row / (rings.length - 1) * Math.PI))
      if (row && s) {
        const a = (row - 1) * (sides + 1) + s - 1
        const b = row * (sides + 1) + s - 1
        indices.push(a, b, a + 1, a + 1, b, b + 1)
      }
    }
  }
  const torso = new THREE.BufferGeometry()
  torso.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  torso.setIndex(indices)
  torso.computeVertexNormals()
  add('continuous-curved-torso', torso)

  // Sleeves are open tapered tubes, integrated at the shoulder/upper arm.
  // Their axes incline outward and down; near-side silhouette stays visible
  // to the real side camera rather than appearing as a separate flat strip.
  const cuffR = Math.min(.15, Math.max(.13, sleeveSize.width * .004))
  for (const sign of [-1, 1]) {
    const start = new THREE.Vector3(sign * bodyWidth * .42, length * .355, 0)
    // A slight forward drape makes the near sleeve legible in strict side view.
    const finish = new THREE.Vector3(sign * (bodyWidth * .42 + sleeveReach), length * .355 - sleeveReach * .76, .55)
    const axis = finish.clone().sub(start).normalize()
    const up = new THREE.Vector3(0, 0, 1)
    const other = new THREE.Vector3().crossVectors(up, axis).normalize()
    const points = [], faces = []
    const steps = 9, radial = 36
    for (let j = 0; j <= steps; j++) {
      const t = j / steps
      const center = start.clone().lerp(finish, t)
      const radius = THREE.MathUtils.lerp(cuffR * 1.22, cuffR * .96, t)
      for (let k = 0; k <= radial; k++) {
        const theta = k / radial * Math.PI * 2
        const p = center.clone()
          .addScaledVector(up, Math.cos(theta) * radius * .88)
          .addScaledVector(other, Math.sin(theta) * radius)
        points.push(p.x, p.y, p.z)
        if (j && k) {
          const a = (j - 1) * (radial + 1) + k - 1
          const b = j * (radial + 1) + k - 1
          faces.push(a, a + 1, b, a + 1, b + 1, b)
        }
      }
    }
    const surface = new THREE.BufferGeometry()
    surface.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
    surface.setIndex(faces)
    surface.computeVertexNormals()
    add(sign < 0 ? 'left-attached-sleeve' : 'right-attached-sleeve', surface)
    // Close only the illustrative cut end with matching textile. Seen straight
    // on from the anatomical side, an open tube otherwise reads as a dark
    // floating donut in the chest. The actual source sleeve remains open.
    const cuffPoints = [finish.x, finish.y, finish.z]
    const cuffFaces = []
    for (let k = 0; k <= radial; k++) {
      const theta = k / radial * Math.PI * 2
      const p = finish.clone()
        .addScaledVector(up, Math.cos(theta) * cuffR * .96 * .88)
        .addScaledVector(other, Math.sin(theta) * cuffR * .96)
      cuffPoints.push(p.x, p.y, p.z)
      if (k) cuffFaces.push(0, k, k + 1)
    }
    const cap = new THREE.BufferGeometry()
    cap.setAttribute('position', new THREE.Float32BufferAttribute(cuffPoints, 3))
    cap.setIndex(cuffFaces)
    cap.computeVertexNormals()
    add(sign < 0 ? 'left-cuff-illustrative-face' : 'right-cuff-illustrative-face', cap)
  }
  const collarY = rings[rings.length - 1].y
  const collar = new THREE.Mesh(new THREE.TorusGeometry(neckWidth * .5, .011, 6, 64), trim)
  collar.rotation.x = Math.PI / 2
  collar.scale.y = .72
  collar.position.y = collarY - .007
  collar.name = 'ribbed-crew-neck-collar'
  collar.userData.presentationOnly = true
  group.add(collar)
  resources.push(collar.geometry)
  const hem = new THREE.Mesh(new THREE.TorusGeometry(rings[0].x, .007, 5, 64), trim)
  hem.rotation.x = Math.PI / 2
  hem.scale.y = rings[0].z / rings[0].x
  hem.position.y = rings[0].y + .027
  hem.name = 'bottom-hem-seam'
  hem.userData.presentationOnly = true
  group.add(hem)
  resources.push(hem.geometry)
  return group
}
