// RUST-034: compare actual production Chrome anchor WASM and blocked-WASM JS fallback.
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { chromium } from 'playwright-core'

const server = await createServer({ server: { host: '127.0.0.1', port: 0 } })
let browser
try {
  await server.listen()
  const url = `http://127.0.0.1:${server.httpServer.address().port}/`
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  const evaluate = async fallback => {
    const context = await browser.newContext()
    try {
      if (fallback) await context.route(/\/wasm\/.*anchor.*\.wasm/i, route => route.abort())
      const page = await context.newPage()
      await page.goto(url, { waitUntil: 'domcontentloaded' })
      return await page.evaluate(async ({ fallback }) => {
        const source = await fetch('/src/core/physics.js').then(response => response.text())
        const path = source.match(/from ["'](\/src\/core\/rust[^"']*[Aa]nchor[^"']*\.js[^"']*)["']/)?.[1]
        if (!path) throw Error('Production anchor Rust bridge import absent')
        const bridge = await import(path)
        const init = Object.keys(bridge).find(key => /^initializeRust.*Anchor.*Kernel$/.test(key))
        const status = Object.keys(bridge).find(key => /^rust.*Anchor.*(?:Kernel)?Status$/.test(key))
        if (!init || !status) throw Error(`Anchor bridge exports missing: ${Object.keys(bridge)}`)
        const loaded = await bridge[init]()
        if (!fallback && !loaded) throw Error('Rust anchor WASM initialization failed')
        const before = bridge[status]()
        const { buildSimulation, stepSimulation } = await import('/src/core/physics.js')
        const { createTemplateProject } = await import('/src/data/templates.js')
        const results = []
        for (const name of ['tee', 'pants']) for (const frames of [1, 30]) {
          const project = createTemplateProject(name)
          project.simulation = { ...project.simulation, collisions: false, selfCollision: false,
            continuousSurfaceContact: false, wind: { enabled: false } }
          const original = JSON.stringify(project)
          const sim = buildSimulation(project)
          const anchors = sim.anchorConstraints || []
          if (!anchors.length) throw Error(`${name}: no anchors`)
          anchors[0].particle.invMass = 0
          const pinnedPosition = anchors[0].particle.position.toArray()
          const pinned = anchors.filter(c => c.particle && c.particle.invMass <= 0)
          for (let n = 0; n < frames; n++) stepSimulation(sim, project, 1 / 60)
          if (anchors[0].particle.position.toArray().some((x,i)=>x!==pinnedPosition[i]))
            throw Error(`${name}/${frames}: pinned particle moved`)
          const particles = [...sim.pieces.values()].flatMap(piece => piece.particles)
          const positions = particles.map(p => [...p.position.toArray(), ...p.previous.toArray()])
          let syncChecks = 0
          // Production anchor writes previous on each constrained axis, preventing spurious velocity.
          for (const c of anchors) {
            if (!c.particle || c.particle.invMass <= 0) continue
            const axes = c.axes === 'x' ? [0] : c.axes === 'y' ? [1] : c.axes === 'xz' ? [0, 2] : [0, 1, 2]
            const p = c.particle
            for (const axis of axes) {
              const key = ['x', 'y', 'z'][axis]
              if (Math.abs(p.previous[key] - p.position[key]) > 2e-12)
                throw Error(`${name}/${frames}: anchor previous sync axis ${key}`)
              syncChecks++
            }
          }
          if (JSON.stringify(project) !== original) throw Error(`${name}: project mutated`)
          results.push({ name, frames, positions, anchorCount: anchors.length,
            pinnedCount: pinned.length, syncChecks, projectUnchanged: true })
        }
        return { backend: bridge[status](), before, results, loaded }
      }, { fallback })
    } finally { await context.close() }
  }
  const js = await evaluate(true)
  const rust = await evaluate(false)
  assert.equal(rust.backend.backend, 'rust-wasm')
  assert.equal(js.backend.backend, 'javascript-fallback')
  const counters = Object.keys(rust.backend).filter(key => /call|commit|batch|count|run/i.test(key) &&
    typeof rust.backend[key] === 'number')
  assert.ok(counters.some(key => rust.backend[key] > (rust.before[key] ?? 0)),
    `No Rust anchor execution evidence: ${JSON.stringify(rust.backend)}`)
  let totalChecks = 0, maxError = 0
  const results = []
  for (let i = 0; i < rust.results.length; i++) {
    const a = rust.results[i], b = js.results[i]
    assert.equal(a.name, b.name)
    assert.equal(a.frames, b.frames)
    assert.equal(a.anchorCount, b.anchorCount)
    assert.equal(a.pinnedCount, b.pinnedCount)
    assert.equal(a.positions.length, b.positions.length)
    let error = 0
    for (let j = 0; j < a.positions.length; j++) for (let axis = 0; axis < 6; axis++) {
      const delta = Math.abs(a.positions[j][axis] - b.positions[j][axis])
      assert.ok(Number.isFinite(delta) && delta <= 2e-11,
        `${a.name}/${a.frames} particle ${j} axis ${axis}: Rust ${a.positions[j][axis]} JS ${b.positions[j][axis]}`)
      error = Math.max(error, delta)
      totalChecks++
    }
    maxError = Math.max(maxError, error)
    results.push({ name: a.name, frames: a.frames, particles: a.positions.length,
      anchors: a.anchorCount, pinned: a.pinnedCount, previousSyncChecks: a.syncChecks,
      maxError: error, pass: true })
  }
  console.log(JSON.stringify({ pass: true, rustBackend: rust.backend, jsBackend: js.backend,
    totalNumericChecks: totalChecks, maxError, results }, null, 2))
} finally {
  await browser?.close()
  await server.close()
}
