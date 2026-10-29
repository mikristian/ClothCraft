import * as THREE from 'three'

const limit=(value,fallback,min,max)=>THREE.MathUtils.clamp(Number.isFinite(Number(value))?Number(value):fallback,min,max)

/** The same CLO GLB material edits in the EXO draft and native Rust viewports.
 * Original PBR maps and UVs remain on the original imported meshes.
 * Weight is saved in the project for production/specification only.
 */
export function createImportedCloMaterial(source,placement={}) {
  const materialType=placement.materialType||'original'
  const metalness=limit(placement.metalness,source.metalness??0,0,1)
  const roughness=limit(placement.roughness,source.roughness??.7,0,1)
  const overrides={
    metal: {metalness:Math.max(.85,metalness),roughness:Math.min(.42,roughness)},
    plastic: {metalness:0,roughness:Math.max(.25,roughness)},
    nylon: {metalness:0,roughness:Math.max(.52,roughness)},
    textile: {metalness:0,roughness:Math.max(.76,roughness)},
    ceramic: {metalness:0,roughness:Math.min(.3,roughness)},
    glass: {metalness:0,roughness:Math.min(.18,roughness)},
  }[materialType]||{metalness,roughness}
  const result=new THREE.MeshPhysicalMaterial({
    name:source.name,
    color:source.color?.clone?.()||new THREE.Color('#ffffff'),
    map:source.map||null,
    normalMap:source.normalMap||null,
    normalScale:source.normalScale?.clone?.()||new THREE.Vector2(1,1),
    roughnessMap:source.roughnessMap||null,
    metalnessMap:source.metalnessMap||null,
    aoMap:source.aoMap||null,
    aoMapIntensity:source.aoMapIntensity??1,
    emissive:source.emissive?.clone?.()||new THREE.Color('#000000'),
    emissiveMap:source.emissiveMap||null,
    emissiveIntensity:source.emissiveIntensity??1,
    alphaMap:source.alphaMap||null,
    alphaTest:source.alphaTest??0,
    side:source.side??THREE.FrontSide,
    depthWrite:source.depthWrite!==false,
    opacity:limit(placement.opacity,source.opacity??1,0,1),
    metalness:overrides.metalness,roughness:overrides.roughness,
    clearcoat:limit(placement.clearcoat,0,0,1),
    clearcoatRoughness:Math.max(.08,overrides.roughness*.6),
    envMapIntensity:limit(placement.reflectionIntensity,1,0,3),
    transparent:source.transparent===true||limit(placement.opacity,1,0,1)<1,
    transmission:materialType==='glass'?.78:0,
    thickness:materialType==='glass'?.002:0,
    ior:materialType==='glass'?1.5:1.48,
  })
  // White preserves the source colors. Other choices tint existing geometry
  // and texture detail rather than painting every source mesh the same color.
  if(/^#[0-9a-f]{6}$/i.test(placement.color||''))result.color.multiply(new THREE.Color(placement.color))
  return result
}
