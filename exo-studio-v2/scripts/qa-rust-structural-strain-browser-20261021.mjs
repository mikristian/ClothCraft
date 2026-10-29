// RUST-033: production refreshSimulationAnalysis against independent legacy JS arithmetic.
// Uses disposable tee/pants templates and a private ephemeral Vite port.
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { chromium } from 'playwright-core'

const server = await createServer({ server: { host: '127.0.0.1', port: 0 } })
let browser
try {
  await server.listen()
  const address = server.httpServer.address()
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage()
  await page.goto(`http://127.0.0.1:${address.port}/`)
  const report = await page.evaluate(async () => {
    const physicsSource = await fetch('/src/core/physics.js').then(r => r.text())
    const imports = [...physicsSource.matchAll(/from ["'](\/src\/core\/rustStructuralStrainKernel\.js[^"']*)["']/g)]
      .map(match => match[1])
    if (!imports.length) throw Error('RUST-033 production strain bridge is not imported by physics.js')
    const bridge = await import(imports[0])
    const initName = 'initializeRustStructuralStrainKernel'
    const statusName = 'rustStructuralStrainKernelStatus'
    if (typeof bridge[initName] !== 'function' || typeof bridge[statusName] !== 'function') throw Error('RUST-033 bridge initialization/status exports missing: '+Object.keys(bridge))
    if (!await bridge[initName]()) throw Error('RUST-033 WASM failed to load')
    const before = bridge[statusName]()
    if (before.backend !== 'rust-wasm') throw Error(JSON.stringify(before))
    const { buildSimulation, refreshSimulationAnalysis } = await import('/src/core/physics.js')
    const { createTemplateProject } = await import('/src/data/templates.js')
    const cases = []
    for (const name of ['tee', 'pants']) {
      const project = createTemplateProject(name)
      const originalProject = JSON.stringify(project)
      const sim = buildSimulation(project)
      const particles = [...sim.pieces.values()].flatMap(piece => piece.particles)
      const structural = sim.constraints.filter(c => c.type === 'structural' && c.rest > 1e-6)
      if (!structural.length) throw Error(`No structural constraints for ${name}`)
      // Force a nontrivial deformation and attach ignored constraints with extreme lengths.
      structural[0].a.position.x += 0.017
      structural[Math.floor(structural.length / 2)].b.position.z -= 0.021
      const a = structural[0].a, b = structural[0].b
      sim.constraints.push({ type: 'seam', a, b, rest: 1e-12 })
      sim.constraints.push({ type: 'structural', a, b, rest: 0 })
      sim.constraints.push({ type: 'structural', a, b, rest: 1e-6 })
      const constraintsBefore = sim.constraints.slice()
      const positionsBefore = particles.map(p => [p.position.x, p.position.y, p.position.z])
      const expected = new Map(particles.map(p => [p, { strain: 0, strainSamples: 0 }]))
      let total = 0, max = 0, samples = 0
      for (const c of sim.constraints) {
        if (c.type !== 'structural' || c.rest <= 1e-6) continue
        const dx = c.a.position.x-c.b.position.x, dy = c.a.position.y-c.b.position.y, dz = c.a.position.z-c.b.position.z
        const distance = Math.sqrt(dx*dx+dy*dy+dz*dz)
        const strain = Math.abs(distance-c.rest)/c.rest
        for (const p of [c.a,c.b]) {
          expected.get(p).strain += strain
          expected.get(p).strainSamples++
        }
        total += strain
        max = Math.max(max,strain)
        samples++
      }
      for (const value of expected.values()) if (value.strainSamples) value.strain /= value.strainSamples
      refreshSimulationAnalysis(sim,project)
      let maxError = 0, checks = 0
      const near = (actual,wanted,what) => {
        const delta = Math.abs(actual-wanted)
        maxError = Math.max(maxError,delta)
        if (!Number.isFinite(delta) || delta > Math.max(2e-12,Math.abs(wanted)*2e-12)) throw Error(`${name} ${what}: ${actual} != ${wanted}`)
        checks++
      }
      particles.forEach((p,i) => {
        const ref=expected.get(p)
        near(p.strain,ref.strain,`particle[${i}].strain`)
        if(p.strainSamples!==ref.strainSamples) throw Error(`${name} particle[${i}].strainSamples: ${p.strainSamples} != ${ref.strainSamples}`)
      })
      near(sim.strain.average,samples?total/samples:0,'simulation.strain.average')
      near(sim.strain.max,max,'simulation.strain.max')
      if (JSON.stringify(project)!==originalProject) throw Error(`${name} project modified`)
      if (sim.constraints.length!==constraintsBefore.length || sim.constraints.some((c,i)=>c!==constraintsBefore[i])) throw Error(`${name} constraints modified`)
      if (particles.some((p,i)=>positionsBefore[i].some((x,j)=>x!==[p.position.x,p.position.y,p.position.z][j]))) throw Error(`${name} positions modified`)
      cases.push({name,particles:particles.length,structuralSamples:samples,maxError,checks,nonstructuralFiltered:true,zeroRestFiltered:true,projectUnchanged:true})
    }
    const after=bridge[statusName]()
    return {backend:after,previous:before,cases}
  })
  assert.equal(report.backend.backend,'rust-wasm')
  const counters = Object.keys(report.backend).filter(key=>/call|commit|sweep|batch|count|run/i.test(key) && typeof report.backend[key]==='number')
  assert.ok(counters.some(key=>report.backend[key]> (report.previous[key]??0)),`No evidence production refresh called Rust: ${JSON.stringify(report.backend)}`)
  console.log(JSON.stringify({pass:true,...report},null,2))
} finally {
  await browser?.close()
  await server.close()
}
