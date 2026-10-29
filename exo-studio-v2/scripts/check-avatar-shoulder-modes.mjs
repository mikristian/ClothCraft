import { createTeeTemplate } from '../src/data/templates.js'
import { buildSimulation, stepSimulation, measureAvatarSurfaceIntrusion } from '../src/core/physics.js'

const modes = ['default', 'limited-lateral', 'adaptive-limited-lateral']
for (const heightCm of [160, 180, 200]) {
  for (const modified of [false, true]) {
    for (const mode of modes) {
      const project = createTeeTemplate()
      project.avatar.heightCm = heightCm
      if (modified) Object.assign(project.avatar, { shoulderWidthCm: 54, neckCm: 44, bicepCm: 40, armLengthCm: 78 })
      if (mode !== 'default') {
        project.avatar.shoulderContactMode = mode
        project.avatar.shoulderMaxLateralCorrectionM = 0.008
      }
      const simulation = buildSimulation(project)
      for (let frame = 0; frame < 120; frame += 1) stepSimulation(simulation, project, 1 / 60)
      const edges = simulation.constraints.filter(c => c.type === 'structural' && c.rest > 0)
      const strain = edges.map(c => Math.abs(c.a.position.distanceTo(c.b.position) / c.rest - 1))
      const gaps = simulation.seamConstraints.map(c => c.a.position.distanceTo(c.b.position))
      const surface = measureAvatarSurfaceIntrusion(simulation, project.avatar)
      console.log(JSON.stringify({ heightCm, modified, mode,
        maxStrainPercent: +(Math.max(...strain) * 100).toFixed(2),
        meanSeamGapMm: +(gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length * 1000).toFixed(2),
        penetratingFaces: surface.penetratingFaces,
        maximumIntrusionMm: +surface.maximumIntrusionMm.toFixed(2) }))
    }
  }
}
