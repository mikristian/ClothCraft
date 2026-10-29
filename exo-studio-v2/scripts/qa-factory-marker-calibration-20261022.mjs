// Non-destructive factory handoff validation; in-memory project only.
import assert from 'node:assert/strict'
import { createDefaultProject } from '../src/data/defaultProject.js'
import { buildFactoryPackageFiles } from '../src/core/factoryPackage.js'
import { parseGradeRulesCsv } from '../src/core/gradeRuleCsv.js'

const project = createDefaultProject()
const original = structuredClone(project)
const files = buildFactoryPackageFiles(project)
assert.deepEqual(project, original, 'Factory export must not mutate the source garment')
const paths = Object.keys(files)
const pdfPaths = paths.filter(path => path.endsWith('.pdf') && path.startsWith('markers/'))
const svgPaths = paths.filter(path => path.endsWith('.svg') && path.startsWith('markers/'))
const gradePaths = paths.filter(path => path.endsWith('.csv') && path.startsWith('grading-rules/'))
assert.equal(gradePaths.length,project.pieces.length,'Factory handoff must preserve every editable pattern grading table')
for (const [index,piece] of project.pieces.entries()) {
  const key = `grading-rules/${String(index+1).padStart(3,'0')}-${String(piece.id).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}.csv`
  assert.ok(files[key],`Missing graded point exchange file ${key}`)
  assert.equal(parseGradeRulesCsv(new TextDecoder().decode(files[key]),piece).length,piece.points.length)
}
assert.ok(pdfPaths.length >= 6, 'Factory pack must contain printable graded markers')
assert.ok(svgPaths.length >= 6, 'Factory pack must contain corresponding graded vector markers')
const decode = bytes => new TextDecoder().decode(bytes)
for (const path of pdfPaths) {
  const data = decode(files[path])
  assert.match(data, /^%PDF-1\.4/)
  if (!/100 mm SCALE CHECK - VERIFY WITH RULER/.test(data)) {
    const fallback = path.replace(/^markers\//,'print-calibration/')
    assert.ok(files[fallback], `PDF ${path} has no safe in-page ruler and no separate witness sheet`)
    assert.match(decode(files[fallback]), /^%PDF-1\.4/)
    assert.match(decode(files[fallback]), /100 mm/,`Witness ${fallback} missing measurable 100 mm annotation`)
  }
}
for (const path of svgPaths) {
  const data = decode(files[path])
  assert.match(data, /viewBox="0 0 /)
  if (!/id="print-scale-check"/.test(data)) {
    const fallback = path.replace(/^markers\//,'print-calibration/')
    assert.ok(files[fallback], `SVG ${path} has no safe in-page ruler and no separate witness sheet`)
    assert.match(decode(files[fallback]), /100 mm/,`Witness ${fallback} missing measurable 100 mm annotation`)
  }
}
const readme = decode(files['README.txt'])
assert.match(readme, /Before cutting: print with scaling OFF \(100% \/ actual size\)/)
assert.match(readme, /measure every on-page ruler, or print each separate calibration sheet/)
assert.match(readme, /measure BOTH 100 mm axes/)
assert.match(readme, /Reject any mismatch/)
assert.match(readme, /not factory certified/)
assert.match(readme,/grading-rules\/\*\.csv/)
console.log(JSON.stringify({ pass: true, calibratedPdfFiles: pdfPaths.length, calibratedSvgFiles: svgPaths.length, gradedPatternCsvFiles:gradePaths.length, sourceUnchanged: true, printInstructions: true }))
