import test from 'node:test'
import assert from 'node:assert/strict'
import {exportIndustrialGradeCsv,parseIndustrialGradeCsv} from './industrialGradeCsv.js'
import {evaluateIndustrialGradeTable,INDUSTRIAL_GRADE_MODES as MODES} from './industrialGradeRules.js'

const grading={sizes:['XS','S','M','L','XL'],baseSize:'M'}
function fixture(){return {id:'front,"A"\nleft',points:[
  {id:'neck',x:2,y:3,industrialGradeRule:{mode:MODES.BASE_UP_DOWN_CUMULATIVE,...grading,down:[{dx:-.5,dy:.4},{dx:-1,dy:.9}],up:[{dx:.8,dy:.2},{dx:1.8,dy:.7}]}},
  {id:'armhole',x:18,y:6},
  {id:'hem',x:20,y:29,industrialGradeRule:{mode:MODES.SMALL_LARGE_INCREMENTAL,...grading,steps:[{dx:-.3,dy:0},{dx:-.2,dy:-.1},{dx:.6,dy:.1},{dx:1,dy:.3}]}},
]}}

test('nonuniform CSV exports complete original size breaks and imports without pattern mutation',()=>{
 const piece=fixture(),before=structuredClone(piece)
 const csv=exportIndustrialGradeCsv(piece,grading)
 assert.match(csv,/"front,""A""\nleft"/)
 const rows=parseIndustrialGradeCsv('\uFEFF'+csv,piece,grading)
 assert.deepEqual(rows.map(r=>r.pointIndex),[0,2])
 for(const row of rows)assert.deepEqual(evaluateIndustrialGradeTable(row.rule),evaluateIndustrialGradeTable(piece.points[row.pointIndex].industrialGradeRule))
 assert.deepEqual(piece,before)
 const reordered=csv.split('\r\n')
 const partial=csv.replace('"XS","S",-0.5,0.5','"XS","S",-0.5,0.5')
 assert.equal(parseIndustrialGradeCsv(partial,piece,grading).length,2)
})

test('reject stale geometry, missing size breaks, duplicates, incompatible grading and nonfinite deltas',()=>{
 const piece=fixture(),csv=exportIndustrialGradeCsv(piece,grading)
 assert.throws(()=>parseIndustrialGradeCsv(csv,{...piece,id:'other'},grading),/stale pattern/)
 const changed=structuredClone(piece);changed.points[0].x+=.02
 assert.throws(()=>parseIndustrialGradeCsv(csv,changed,grading),/base geometry/)
 const lines=csv.split('\r\n').filter(Boolean)
 assert.throws(()=>parseIndustrialGradeCsv(lines.slice(0,-1).join('\r\n'),piece,grading),/incomplete size-break/)
 assert.throws(()=>parseIndustrialGradeCsv([...lines,lines[1]].join('\r\n'),piece,grading),/duplicate point/)
 assert.throws(()=>parseIndustrialGradeCsv(csv,piece,{...grading,baseSize:'L'}),/No industrial|unknown|stale|Invalid|size-break|break/i)
 assert.throws(()=>parseIndustrialGradeCsv(csv.replace(',0.5,',',NaN,'),piece,grading),/invalid coordinates/)
 assert.throws(()=>parseIndustrialGradeCsv(csv.replace(',0.5,',',50,'),piece,grading),/12 cm/)
})
