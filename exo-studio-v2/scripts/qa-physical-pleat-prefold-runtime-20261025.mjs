// A runtime-only solver comparison using an already built exo-session.
// This never modifies the user's installed app, working garments or Rust build.
// The prefold pose is injected into a saved isolated fixture so it can be
// studied even while storage prevents compiling the updated Rust source.
import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'

const root = resolve(import.meta.dirname, '../research/oss/clothcraft')
const directory = mkdtempSync(join(tmpdir(), 'exo-prefold-study-'))
const savedFile = join(directory, 'isolated.json')
const child = spawn(join(root, 'target/debug/exo-session'),
  [join(root, 'assets/makehuman/mannequin.obj'), savedFile],
  { cwd: root, stdio: ['pipe', 'pipe', 'pipe'] })
const lines = createInterface({ input: child.stdout })[Symbol.asyncIterator]()
let errors = ''
child.stderr.on('data', chunk => { errors += chunk })
const request = async body => {
  child.stdin.write(JSON.stringify(body) + '\n')
  const line = await lines.next()
  if (line.done) throw Error('Native session exited: ' + errors.slice(0, 350))
  const response = JSON.parse(line.value)
  if (!response.ok) throw Error(response.error)
  return response.data
}
const vector = (a, b) => [a[0] - b[0], a[1] - b[1]]
const dot = (a, b) => a[0] * b[0] + a[1] * b[1]
const length = a => Math.hypot(...a)
const stages = [1, 12, 50]

try {
  const first = await request({ op: 'open', preset: 'tshirt' })
  const points = [[0, 0], [.4, 0], [.4, .3], [0, .3]]
  const added = await request({ op: 'edit', revision: 0,
    command: { kind: 'Polygon', fabric: first.template.fabrics[0].id,
      points, tangents: points.map(() => [0, 0]) } })
  const panel = added.template.panels.at(-1)
  panel.placement.translation = [2, 2, 2] // well clear of avatar
  await request({ op: 'open', template: { ...added.template, panels: [panel], seams: [] } })
  const tucked = await request({ op: 'edit', revision: 0,
    command: { kind: 'TuckFoldSew', panel: panel.id, edge: panel.polygon.edges[0],
      left_t: .4, right_t: .445, depth_m: .045 } })
  await request({ op: 'save' })
  const project = JSON.parse(readFileSync(savedFile, 'utf8'))
  const poly = project.template.panels[0].polygon
  const seam = project.template.seams[0]
  const a = poly.lines.find(line => line.id === seam.a.edge)
  const b = poly.lines.find(line => line.id === seam.b.edge)
  const across = vector(b.points[0], a.points[0])
  const width = length(across), axis = across.map(value => value / width)
  const along = vector(a.points[1], a.points[0])
  const depth = length(along), direction = along.map(value => value / depth)
  const spread = .0012, layer = Math.sqrt(.0016 ** 2 - spread ** 2)
  const release = Math.max(width * 4, .10)
  const origin = project.template.panels[0].placement.translation
  const results = []
  for (const factor of ['quarter_arc', 0, .25, .4, .55, .7, .85, 1]) {
    const candidate = structuredClone(project)
    candidate.state.x = tucked.uv.map(uv => {
      const diff = vector(uv, a.points[0])
      const u = dot(diff, axis), v = dot(diff, direction)
      let displacement = 0, lift = 0
      if (factor === 'quarter_arc' && u > 0) {
        const clamp01 = value => Math.max(0, Math.min(1, value))
        const fade = clamp01(v / (depth * .25)) * clamp01((depth - v) / (depth * .25))
        const theta = Math.PI / 2, radius = width / theta
        const angle = theta * Math.min(u / width, 1)
        displacement = (u <= width ? radius * Math.sin(angle) - u : radius - width) * fade
        lift = radius * (1 - Math.cos(angle)) * fade
      } else if (typeof factor === 'number' && u > 0 && v >= -.002 && v <= depth + release) {
        const t = Math.max(0, Math.min(1, (v - depth) / release))
        const fade = factor * (1 - t * t * (3 - 2 * t))
        displacement = (u < width ? u * (spread / width - 1) : spread - width) * fade
        lift = (u < width ? Math.min(u, width - u) + layer * u / width : layer) * fade
      }
      return [origin[0] + uv[0] + axis[0] * displacement,
        origin[1] - uv[1] - axis[1] * displacement, origin[2] + lift]
    })
    candidate.state.v = candidate.state.x.map(() => [0, 0, 0])
    let snapshot = await request({ op: 'open', project: candidate })
    const record = { factor, initialGapMm: snapshot.tuckFit[0].maxGapMm }
    for (let step = 1; step <= stages.at(-1);) {
      const count = Math.min(4, stages.find(item => item >= step) - step + 1)
      try {
        snapshot = await request({ op: 'step', revision: snapshot.revision, steps: count })
      } catch (error) {
        record.failure = String(error)
        record.failedAtStep = step
        break
      }
      step += count
      if (stages.includes(step - 1)) {
        record['after' + (step - 1)] = {
          gapMm: snapshot.tuckFit[0].maxGapMm,
          maxExtensionPct: snapshot.metrics.extension_max_percent,
          contacts: snapshot.metrics.contacts,
          residualRmsN: snapshot.metrics.residual_rms_n,
        }
      }
    }
    results.push(record)
  }
  console.log(JSON.stringify({ source: 'existing prebuilt native solver with injected trial states',
    fixture: { widthMm: 400, heightMm: 300, tuckIntakeMm: width * 1000,
      stitchDepthMm: depth * 1000, avatarClearance: true },
    results }, null, 2))
} finally {
  child.kill()
  rmSync(directory, { recursive: true, force: true })
}
