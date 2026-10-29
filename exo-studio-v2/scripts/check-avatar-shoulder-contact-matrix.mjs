import { createTeeTemplate } from '../src/data/templates.js'
import { buildSimulation, stepSimulation, measureAvatarSurfaceIntrusion } from '../src/core/physics.js'

const selected = process.argv.slice(2)
const modes = [
  { bodyTriangleContactAssist: false, continuousSurfaceContact: false },
  { bodyTriangleContactAssist: true, continuousSurfaceContact: false },
  { bodyTriangleContactAssist: false, continuousSurfaceContact: true },
  { bodyTriangleContactAssist: true, continuousSurfaceContact: true },
]
for (const heightCm of [160, 180, 200]) {
  for (const modified of [false, true]) {
    if (selected.length && !selected.includes(`${heightCm}-${modified ? 'modified' : 'standard'}`)) continue
    for (const stabilizeSeamPairs of [true, false]) {
      for (const mode of modes) {
        const project = createTeeTemplate()
        project.avatar.heightCm = heightCm
        if (modified) Object.assign(project.avatar, { shoulderWidthCm: 54, neckCm: 44, bicepCm: 40, armLengthCm: 78 })
        Object.assign(project.simulation, { ...mode, stabilizeSeamPairs })
        const simulation = buildSimulation(project)
        let acceptedCorrections = 0, correctedVertices = 0
        for (let frame = 0; frame < 120; frame++) {
          stepSimulation(simulation, project, 1 / 60)
          if (simulation.surfaceContact?.correctionAccepted) {
            acceptedCorrections++
            correctedVertices += simulation.surfaceContact.correctedVertices
          }
        }
        const strain = simulation.quality.structural
        const surface = measureAvatarSurfaceIntrusion(simulation, project.avatar)
        const gaps = simulation.seamConstraints.map(c => c.a.position.distanceTo(c.b.position) * 1000)
        console.log(JSON.stringify({ heightCm, modified, stabilizeSeamPairs, ...mode,
          peakStrainPercent: +strain.maxStrainPercent.toFixed(2),
          p95StrainPercent: +strain.p95StrainPercent.toFixed(2),
          maxSeamGapMm: +Math.max(...gaps).toFixed(2),
          penetratingFaces: surface.penetratingFaces,
          maximumIntrusionMm: +surface.maximumIntrusionMm.toFixed(2),
          acceptedCorrections, correctedVertices,
        }))
      }
    }
  }
}
