// Exclude narrowly identified *optical* fabric controls from the physics
// topology key. Changing fabric color, coating or visual yarn scale must not
// restart an in-progress drape. Mechanical properties, assignments, patterns,
// sewing, texture UV transforms and all other inputs still rebuild as before.
const OPTICAL_KEYS = new Set([
  'name','surfaceFamily','texture','color','opacity','displacementMm','roughness','metalness','sheen','sheenRoughness',
  'normalStrength','fiberAnisotropy','fiberAngleDeg',
  'reflectionIntensity',
  'clearcoat','clearcoatRoughness','colorVariation','weaveScaleCm','wash',
])

export function physicsInputFingerprint(project) {
  if (!project || typeof project !== 'object') return '{}'
  const next={...project}
  delete next.revision
  delete next.updatedAt
  delete next.render
  // Foam/trapunto objects are construction previews attached to existing
  // cloth faces. Moving or resizing one must never restart the garment solver.
  next.pieces=(project.pieces||[]).map(piece=>{
    const physical={...piece}
    delete physical.foamPads
    return physical
  })
  next.fabrics=Object.fromEntries(Object.entries(project.fabrics || {}).map(([id,fabric]) => {
    const physical={...fabric}
    for (const key of OPTICAL_KEYS) delete physical[key]
    return [id,physical]
  }))
  return JSON.stringify(next)
}

export function opticalFabricFingerprint(project) {
  return JSON.stringify(Object.entries(project?.fabrics || {}).map(([id,fabric]) => [
    id,Object.fromEntries([...OPTICAL_KEYS].map(key=>[key,fabric[key] ?? null])),
  ]))
}
