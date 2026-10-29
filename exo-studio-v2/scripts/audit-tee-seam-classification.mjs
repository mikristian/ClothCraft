import assert from 'node:assert/strict'
import { createDefaultProject } from '../src/data/defaultProject.js'
import { createTeeTemplate } from '../src/data/templates.js'
import { gradeProject } from '../src/core/grading.js'
import { edgeRangeLength, seamLengthReport, getEdgeSeamAllowance } from '../src/core/project.js'

const sizeNames = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const family = seam => /shoulder/.test(seam.id) ? 'shoulder' : /side-/.test(seam.id) ? 'body side' : /underarm/.test(seam.id) ? 'sleeve underarm' : /upper/.test(seam.id) ? 'upper sleeve cap / upper armscye' : 'lower sleeve cap / lower armscye'
const round = n => Number(n.toFixed(6))
const classify = (a, b) => {
  const delta = a - b
  return Math.abs(delta) <= 1e-8 ? 'equal raw stitch arcs' : 'unequal raw stitch arcs; ease/defect requires construction evidence'
}

function inspect(label, factory) {
  const project = factory()
  assert.equal(project.pieces.length, 4)
  assert.equal(project.seams.length, 14)
  const rows = []
  for (const size of sizeNames) {
    const graded = gradeProject(project, size)
    for (const seam of graded.seams) {
      const a = graded.pieces.find(piece => piece.id === seam.a.pieceId)
      const b = graded.pieces.find(piece => piece.id === seam.b.pieceId)
      assert.ok(a && b)
      const lengthA = edgeRangeLength(a, seam.a.edgeIndex, seam.a.startT ?? 0, seam.a.endT ?? 1)
      const lengthB = edgeRangeLength(b, seam.b.edgeIndex, seam.b.startT ?? 0, seam.b.endT ?? 1)
      const report = seamLengthReport(graded, seam)
      assert.ok(Math.abs(report.lengthA-lengthA)<1e-9 && Math.abs(report.lengthB-lengthB)<1e-9)
      rows.push({source: label, size, seamId: seam.id, family:family(seam),
        edgeA:`${a.id}:${seam.a.edgeIndex}`,edgeB:`${b.id}:${seam.b.edgeIndex}`,
        lengthAcm:round(lengthA),lengthBcm:round(lengthB),signedDeltaCm:round(lengthA-lengthB),
        absoluteDeltaCm:round(report.difference),mismatchPercent:round(report.mismatchPercent),
        status: report.status, allowanceAcm:getEdgeSeamAllowance(a,seam.a.edgeIndex),
        allowanceBcm:getEdgeSeamAllowance(b,seam.b.edgeIndex), classification:classify(lengthA,lengthB)})
    }
  }
  const strict = rows.filter(row => row.mismatchPercent > 2)
  return { label, sizes:sizeNames, pairsPerSize:project.seams.length, strictCount:strict.length,
    statusCounts:Object.fromEntries(['good','warning','error'].map(status=>[status,rows.filter(row=>row.status===status).length])),
    strictBySize:Object.fromEntries(sizeNames.map(size=>[size,strict.filter(row=>row.size===size).length])),
    strictByFamily:Object.fromEntries([...new Set(rows.map(row=>row.family))].map(type=>[type,strict.filter(row=>row.family===type).length])),
    rows }
}

const reports = [inspect('createDefaultProject',createDefaultProject),inspect('createTeeTemplate',createTeeTemplate)]
console.log(JSON.stringify({unit:'cm',strictRule:'mismatchPercent > 2 (observational; reporting threshold only)', reports},null,2))
