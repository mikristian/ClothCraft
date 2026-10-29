import * as THREE from 'three'

// Keep background customization separate from the garment's lighting and IBL.
// Even pure black needs some falloff to read as a photographic studio space.
export function paintStudioGradient(texture, backgroundColor = null) {
  const canvas = texture?.image
  const context = canvas?.getContext?.('2d')
  if (!context) return '#e9e9eb'
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height)
  let fogColor = '#e9e9eb'
  if (backgroundColor && /^#[\da-f]{6}$/i.test(backgroundColor)) {
    const base = new THREE.Color(backgroundColor)
    const top = base.clone().multiplyScalar(.52).lerp(new THREE.Color('#080a10'), .42)
    const center = base.clone().multiplyScalar(.88).lerp(new THREE.Color('#262b34'), .20)
    const bottom = base.clone().lerp(new THREE.Color('#9499a5'), .29)
    gradient.addColorStop(0, `#${top.getHexString()}`)
    gradient.addColorStop(.53, `#${center.getHexString()}`)
    gradient.addColorStop(1, `#${bottom.getHexString()}`)
    fogColor = `#${bottom.getHexString()}`
  } else {
    gradient.addColorStop(0, '#919298')
    gradient.addColorStop(.48, '#d4d5d9')
    gradient.addColorStop(1, '#f2f2f7')
  }
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)
  texture.needsUpdate = true
  return fogColor
}
