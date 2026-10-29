import fixture from './avatarWornTeeNativeFixture.json' with { type: 'json' }
import { createDefaultProject } from './defaultProject.js'

// Fixed template-only snapshot from the installed native fixture; never read
// active fitting-project.json.native when opening a garment library item.
export function createNativeAvatarWornTeeProject() {
  const project = createDefaultProject()
  project.id = 'project-avatar-worn-tee'
  project.name = 'Avatar Worn Tee · Native MakeHuman Fixture'
  project.templateId = 'avatar-worn-tee'
  project.nativeFixture = JSON.parse(JSON.stringify(fixture))
  project.avatar = {
    ...project.avatar,
    name: 'MakeHuman 1.75 m engineering fixture',
    model: 'makehuman-base',
    heightCm: 175,
  }
  // Native fixture owns the physical parameters; this material is only a
  // visual editor approximation with its exact name and native values kept.
  const nativeFabric = fixture.fabrics[0]
  project.fabrics.main = {
    ...project.fabrics.main,
    id: 'main',
    name: nativeFabric.name,
    color: '#d9d8d4',
    thickness: nativeFabric.properties.thickness,
    nativeMaterial: JSON.parse(JSON.stringify(nativeFabric)),
    calibration: 'native-fixture-physical-values; preview color estimated',
  }
  project.pieces = fixture.panels.map((panel, index) => ({
    id: panel.id,
    name: panel.name,
    points: panel.polygon.points.map(([x,y]) => ({ x: x * 100, y: y * 100 })),
    layout2d: { x: 60 + index * 120, y: 115 },
    arrangement3d: {
      x: panel.placement.translation[0],
      y: panel.placement.translation[1],
      z: panel.placement.translation[2],
    },
    nativeEdgeNames: [...panel.polygon.edges],
    sourcePanel: JSON.parse(JSON.stringify(panel)),
    fabricId: 'main',
    simulationResolution: 2,
    grainAngleDeg: panel.grain_degrees || 0,
    graphics: [], notches: [], bindings: [], topstitches: [],
    pins: [], internalLines: [], seamAllowance: 1, locked: false,
  }))
  project.seams = fixture.seams.map(seam => ({
    id: seam.id,
    a: { pieceId: seam.a.panel, edgeIndex: fixture.panels.find(p => p.id === seam.a.panel).polygon.edges.indexOf(seam.a.edge) },
    b: { pieceId: seam.b.panel, edgeIndex: fixture.panels.find(p => p.id === seam.b.panel).polygon.edges.indexOf(seam.b.edge) },
    sourceSeam: JSON.parse(JSON.stringify(seam)),
  }))
  return project
}
