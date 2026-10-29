import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {gradeProject} from './grading.js'
import {projectToDxf} from './dxf.js'
import {auditAccuMarkGradedDxfRoundtrip20261023 as audit,parseAccuMarkGradedDxfWire20261023 as parse} from './accumarkGradedDxfRoundtripAudit20261023.js'

const source=()=>createTeeTemplate()
const wire=(size,graded)=>projectToDxf(graded,size,{cutlineMode:'manufacturing'})

test('all six tee sizes: every panel retains physical CUT and STITCH vertices, no mutation, no factory approval',()=>{
 const project=source(),before=JSON.stringify(project)
 const result=audit(project)
 assert.equal(result.ok,true,JSON.stringify(result.issues).slice(0,3000))
 assert.equal(result.factoryApproved,false)
 assert.deepEqual(result.rows.map(r=>r.size),project.grading.sizes)
 assert(result.rows.every(r=>r.ok&&r.pieces.length===4&&r.pieces.every(p=>p.ok&&p.cutVertices>=3&&p.stitchVertices>=3)))
 assert.equal(JSON.stringify(project),before)
})

test('rejects missing/duplicate sizes and panels, malformed allowance inputs without mutation',()=>{
 const cases=[
  p=>{p.grading.sizes=['M','M']},
  p=>{p.grading.sizes=['XS','S']},
  p=>{p.pieces.pop();p.pieces=[]},
  p=>{p.pieces[1].name=p.pieces[0].name},
  p=>{p.pieces[0].edgeSeamAllowances={0:-1}},
  p=>{p.pieces[0].seamAllowance=NaN},
 ]
 for(const change of cases){const project=source();change(project);const prior=JSON.stringify(project);const result=audit(project);assert.equal(result.ok,false);assert(result.issues.length);assert.equal(result.factoryApproved,false);assert.equal(JSON.stringify(project),prior)}
})

test('independent receiver fixtures reject absent/duplicate contours, missing sizes, wrong units and altered geometry',()=>{
 const good=wire('M',gradeProject(source(),'M'))
 const mutations=[
  str=>str.replace('8\nSTITCH_FRONT','8\nSTITCH_FRONT_MISSING'),
  str=>str.replace('8\nCUT_FRONT_M','8\nCUT_FRONT_XS'),
  str=>str.replace('9\n$INSUNITS\n70\n4','9\n$INSUNITS\n70\n0'),
  str=>str.replace('999\nGARMENT_STUDIO_SIZE M','999\nGARMENT_STUDIO_SIZE XS'),
  str=>str.replace('8\nSTITCH_FRONT','8\nSTITCH_BACK'),
  str=>str.replace('10\n0\n20','10\n99999\n20'),
  str=>str.replace('0\nSEQEND\n8\nCUT_FRONT_M','0\nVERTEX\n8\nCUT_FRONT_M\n10\n0\n20\n0\n0\nSEQEND\n8\nCUT_FRONT_M'),
 ]
 for(const mutate of mutations){const changed=mutate(good);assert.notEqual(changed,good,'fixture must actually mutate DXF');const result=audit(source(),{wireForSize:(size,graded)=>size==='M'?changed:wire(size,graded)});assert.equal(result.ok,false,`${mutate}: ${JSON.stringify(result.issues)}`);assert(result.issues.length)}
})

test('rejects malformed DXF group pairs, missing polyline terminator, overflow and open contours',()=>{
 const good=wire('M',gradeProject(source(),'M'))
 const cases=[
  good+'\n999',
  good.replace('0\nSEQEND\n8\nCUT_FRONT_M','0\nENDSEC'),
  good.replace('0\nPOLYLINE\n8\nCUT_FRONT_M\n66\n1\n70\n1','0\nPOLYLINE\n8\nCUT_FRONT_M\n66\n1\n70\n0'),
  good.replace('10\n0\n20','10\nInfinity\n20'),
 ]
 for(const value of cases){const result=parse(value);assert.equal(result.ok,false,JSON.stringify(result.issues));assert(result.issues.length)}
})

test('identifies direct ungraded size relabeling as an exporter hazard',()=>{
 const project=source(),base=project.grading.baseSize
 const baseline=wire(base,gradeProject(project,base))
 const relabeled=projectToDxf(project,'XS',{cutlineMode:'manufacturing'})
 assert.notEqual(baseline,relabeled)
 const result=audit(project,{wireForSize:(size,graded)=>size==='XS'?relabeled:wire(size,graded)})
 assert.equal(result.ok,false)
 assert(result.issues.some(issue=>issue.code==='CUT_MISMATCH'||issue.code==='STITCH_MISMATCH'))
})

test('all six sizes preserve authored single/double notch quantities and exact cut-boundary lengths',()=>{
 const project=source()
 for(const piece of project.pieces){piece.notches=[]}
 const front=project.pieces.find(piece=>piece.id==='front')
 front.notches=[{id:'single',edgeIndex:0,t:.5,type:'single',depthCm:.3},
  {id:'double',edgeIndex:2,t:.5,type:'double',depthCm:.3}]
 const report=audit(project)
 assert.equal(report.ok,true,JSON.stringify(report.issues).slice(0,900))
 assert.equal(report.rows.length,6)
 assert(report.rows.every(row=>row.pieces.find(piece=>piece.id==='front').notchesExpected===3))
 assert(report.rows.every(row=>row.pieces.find(piece=>piece.id==='front').notchesFound===3))
 const good=wire('M',gradeProject(project,'M'))
 const dropped=good.replace(/0\nLINE\n8\nNOTCH_FRONT\n(?:[^\n]*\n[^\n]*\n){6}/,'')
 assert.notEqual(dropped,good,'Test must remove one physical notch entity')
 const missing=audit(project,{wireForSize:(size,graded)=>size==='M'?dropped:wire(size,graded)})
 assert.equal(missing.ok,false)
 assert(missing.issues.some(issue=>issue.code==='NOTCH_COUNT'||issue.code==='NOTCH_GEOMETRY'))
})

test('receiver cannot reverse a notch cut while preserving depth, count and cut-contour origin',()=>{
 const project=source()
 for(const piece of project.pieces)piece.notches=[]
 project.pieces[0].notches=[{id:'mark',edgeIndex:0,t:.5,type:'single',depthCm:.3}]
 const good=wire('M',gradeProject(project,'M'))
 const pattern=/(0\nLINE\n8\nNOTCH_[^\n]+\n10\n)([^\n]+)(\n20\n)([^\n]+)(\n30\n0\n11\n)([^\n]+)(\n21\n)([^\n]+)/
 const altered=good.replace(pattern,(_,prefix,x,middle,y,next,x2,last,y2)=>
  `${prefix}${x}${middle}${y}${next}${2*Number(x)-Number(x2)}${last}${2*Number(y)-Number(y2)}`)
 assert.notEqual(altered,good,'notch fixture must mutate DXF')
 const result=audit(project,{wireForSize:(size,graded)=>size==='M'?altered:wire(size,graded)})
 assert.equal(result.ok,false)
 assert(result.issues.some(issue=>issue.code==='NOTCH_POSITION'),JSON.stringify(result.issues))
})

test('receiver cannot hide curved, wide, raised or extruded geometry behind matching XY vertices',()=>{
 const project=source(),good=wire('M',gradeProject(project,'M'))
 const contour='0\nVERTEX\n8\nCUT_FRONT_M\n10\n'
 const notch='0\nLINE\n8\nNOTCH_FRONT\n10\n'
 project.pieces[0].notches=[{id:'mark',edgeIndex:0,t:.5,type:'single',depthCm:.3}]
 const marked=wire('M',gradeProject(project,'M'))
 const variants=[
  good.replace(contour,'0\nVERTEX\n8\nCUT_FRONT_M\n42\n0.5\n10\n'),
  good.replace(contour,'0\nVERTEX\n8\nCUT_FRONT_M\n40\n3\n10\n'),
  good.replace('0\nPOLYLINE\n8\nCUT_FRONT_M\n66\n1','0\nPOLYLINE\n8\nCUT_FRONT_M\n210\n1\n220\n0\n230\n0\n66\n1'),
  good.replace(contour,'0\nVERTEX\n8\nCUT_FRONT_M\n30\n2\n10\n'),
  marked.replace(notch,'0\nLINE\n8\nNOTCH_FRONT\n39\n2\n10\n'),
  good.replace('0\nPOLYLINE\n8\nCUT_FRONT_M','0\nARC\n8\nCUT_FRONT_M\n10\n50\n20\n50\n40\n4\n0\nPOLYLINE\n8\nCUT_FRONT_M'),
 ]
 for(let i=0;i<variants.length;i++){
  const baseline=i===4?marked:good
  assert.notEqual(variants[i],baseline,`mutation ${i} must change wire`)
  const result=audit(project,{wireForSize:(size,graded)=>size==='M'?variants[i]:wire(size,graded)})
  assert.equal(result.ok,false,`mutation ${i}: ${JSON.stringify(result.issues)}`)
  assert(result.issues.some(x=>['UNSUPPORTED_GEOMETRY','NONPLANAR_GEOMETRY','UNSUPPORTED_LAYER_ENTITY'].includes(x.code)),`mutation ${i}: ${JSON.stringify(result.issues)}`)
 }
})
