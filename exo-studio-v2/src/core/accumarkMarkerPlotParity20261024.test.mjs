import test from 'node:test'
import assert from 'node:assert/strict'
import { createTeeTemplate } from '../data/templates.js'
import { gradeProject } from './grading.js'
import { buildFabricMarkers } from './marker.js'
import { markerToSvg, markerToPdf } from './markerArtifacts.js'
import { auditMarkerPlotParity20261024 as audit } from './accumarkMarkerPlotParity20261024.mjs'

function fixture(size = 'M') {
  const project = gradeProject(createTeeTemplate(), size)
  const marker = Object.values(buildFabricMarkers(project))[0]
  const options = { size, project, fabricName: marker.fabricId || 'Fabric' }
  const svg = markerToSvg(marker, { ...options, calibration: true })
  const pdf = markerToPdf(marker, { ...options, calibration: true })
  return { marker, svg, pdf, options }
}
const run = f => audit(f.marker, { ...f.options, svg: f.svg, pdf: f.pdf })
const reject = (f, code) => assert.ok(run(f).issues.some(issue => issue.code === code), JSON.stringify(run(f).issues))

test('six actual Foundation Tee graded marker plot artifacts pass byte and physical geometry parity', () => {
  for (const size of ['XS', 'S', 'M', 'L', 'XL', 'XXL']) {
    const f = fixture(size)
    assert.equal(run(f).ok, true, `${size}: ${JSON.stringify(run(f).issues)}`)
  }
})

test('rejects changed SVG contour, viewBox, ruler and injected cut geometry', () => {
  for (const [pattern, replacement] of [
    [/points="([\d.]+),/, 'points="999,'],
    [/viewBox="0 0 [^"]+"/, 'viewBox="0 0 100 100"'],
    [/x2="10.5"/, 'x2="9.5"'],
    [/<\/g><g id="grain-lines"/, '<polygon points="0,0 1,0 1,1"/></g><g id="grain-lines"'],
  ]) {
    const f = fixture()
    assert.match(f.svg, pattern)
    f.svg = f.svg.replace(pattern, replacement)
    reject(f, 'SVG_PARITY')
  }
})

test('rejects changed PDF MediaBox, cut paths, clip, ruler, page count and stream bytes', () => {
  const cases = [
    [ /\/MediaBox \[0 0 ([\d.]+)/, '/MediaBox [0 0 999'],
    [ /([\d.]+) ([\d.]+) m\n/, '999 $2 m\n'],
    [ / re W n/, ' re S n'],
    [ /100 mm SCALE CHECK/, '90 mm SCALE CHECK'],
    [ /\/Count 1 >>/, '/Count 2 >>'],
    [ /h S\n/, 'h S\nh S\n'],
  ]
  for (const [pattern, replacement] of cases) {
    const f = fixture()
    const text = new TextDecoder().decode(f.pdf)
    assert.match(text, pattern)
    f.pdf = text.replace(pattern, replacement)
    reject(f, 'PDF_PARITY')
  }
})

test('rejects unsound placement bounds, overflow, and nonfinite cut coordinates', () => {
  for (const alter of [
    m => { m.placements[0].y += 10 },
    m => { m.placements[0].outline[0].x = m.width + 10 },
    m => { m.placements[0].outline[0].y = NaN },
  ]) {
    const f = fixture()
    alter(f.marker)
    reject(f, 'INVALID_MARKER')
  }
})

test('multi-page marker validates both 100mm rulers and redistributes a short final page', () => {
  const marker = { width: 50, length: 600, placements: [{ x: 2, y: 1, width: 10, height: 5, outline: [{x:2,y:1},{x:12,y:1},{x:12,y:6},{x:2,y:6}], name:'Panel', instance:0 }] }
  const options = { size:'M', fabricName:'main' }
  const svg = markerToSvg(marker, { ...options, calibration:true })
  const pdf = markerToPdf(marker, { ...options, calibration:true })
  assert.equal(audit(marker, { ...options, svg, pdf }).ok, true)
  marker.length = 401
  const redistributedPdf = markerToPdf(marker, { ...options, calibration: true })
  const result = audit(marker, { ...options, svg: markerToSvg(marker, { ...options, calibration: true }), pdf: redistributedPdf })
  assert.equal(result.ok, true, JSON.stringify(result.issues))
  assert.equal((new TextDecoder().decode(redistributedPdf).match(/100 mm SCALE CHECK - VERIFY WITH RULER/g) || []).length, 2)
})

test('empty marker SVG passes without PDF, unexpected PDF and missing ruler fail', () => {
  const marker = { width: 50, length:0, placements:[], unusedPieces:0 }
  const svg = markerToSvg(marker,{calibration:true})
  assert.equal(audit(marker,{svg}).ok,false, 'empty marker has no viable 100mm ruler')
  assert.ok(audit(marker,{svg,pdf:'extraneous'}).issues.some(issue => issue.code === 'PDF_PARITY'))
})

test('canonical bytes cannot certify self-intersecting, collinear, or zero-length contours', () => {
  const outlines = [
    [{x:2,y:2},{x:12,y:12},{x:2,y:12},{x:12,y:2}],
    [{x:2,y:2},{x:7,y:2},{x:12,y:2},{x:10,y:2}],
    [{x:2,y:2},{x:12,y:2},{x:12,y:2},{x:2,y:12}],
  ]
  for (const outline of outlines) {
    const marker = {width:50,length:30,placements:[{x:2,y:2,width:10,height:10,outline,name:'Bad',instance:0}]}
    const svg = markerToSvg(marker,{calibration:true})
    const pdf = markerToPdf(marker,{calibration:true})
    assert.ok(audit(marker,{svg,pdf}).issues.some(issue => issue.code === 'INVALID_MARKER'))
  }
})

test('canonical bytes cannot certify duplicate, crossing, or fully contained placements', () => {
  const rect = (x,y,w,h) => ({x,y,width:w,height:h,outline:[{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}],name:'Panel',instance:0})
  for (const second of [rect(2,2,10,8),rect(8,5,10,8),rect(4,4,2,2)]) {
    const marker = {width:50,length:30,placements:[rect(2,2,10,8),second]}
    const svg = markerToSvg(marker,{calibration:true})
    const pdf = markerToPdf(marker,{calibration:true})
    assert.ok(audit(marker,{svg,pdf}).issues.some(issue => issue.code === 'INVALID_MARKER'))
  }
})

test('rejects excessive contour vertex count before quadratic segment scan', () => {
  const outline = Array.from({length:2001}, (_,i) => ({x:10+5*Math.cos(i*2*Math.PI/2001),y:10+5*Math.sin(i*2*Math.PI/2001)}))
  const marker = {width:50,length:30,placements:[{x:5,y:5,width:10,height:10,outline,name:'Oversized',instance:0}]}
  assert.throws(() => markerToPdf(marker,{calibration:true}), /Invalid cutting outline/)
  const result = audit(marker,{svg:markerToSvg(marker,{calibration:true}),pdf:null})
  assert.ok(result.issues.some(issue => issue.code === 'INVALID_MARKER' && /geometry budget/.test(issue.message)))
})
