// Non-mutating positive/adversarial cases for the authoritative EXO project
// document reference gate. Uses disposable fixtures, never the user's project.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {spawnSync} from 'node:child_process'

const root=path.resolve(import.meta.dirname,'../../..')
const executable=path.join(root,'scripts/engineering/exo-garment-document-gate.mjs')
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'exo-document-gate-'))
const base={
  version:1,
  template:{
    version:2,
    panels:[{
      id:'front',polygon:{
        edges:['top','right','bottom','left'],
        points:[[0,0],[0.25,0],[0.25,0.35],[0,0.35]],
        curves:{top:[[0.07,-0.02],[0.17,-0.02]]},
        free_curve_points:{
          top:[{id:'free_1',t:0.4,position:[0.1,-0.016],
            derivative_in:[0.18,0.02],derivative_out:[0.21,-0.04]}],
        },
        target_lengths:{top:0.260},
        seam_allowances:{top:0.010},
        notches:{top:[{t:0.27,depth_m:0.004}]},
        lines:[{id:'dart-guide',points:[[0.1,0.1],[0.15,0.17]],
          tangents:[[0,0],[0,0]]}],
        annotations:[{id:'note_1',text:'QA',position:[0.12,0.08]}],
        measurements:[{id:'pom_1',label:'Across chest',
          a:{edge:'left',t:0.5},b:{edge:'right',t:0.5}}],
      },
    },{
      id:'back',polygon:{
        edges:['top','right','bottom','left'],
        points:[[0,0],[0.25,0],[0.25,0.35],[0,0.35]],
      },
    }],
    seams:[{id:'shoulder',a:{panel:'front',edge:'top',range:[0,1]},
      b:{panel:'back',edge:'top',range:[0,1]},
      reverse_b:true,allow_ease:false,stiffness:50000,notches:[]}],
  },
}
const clone=value=>structuredClone(value)
const run=(fixture)=>{
  const file=path.join(temp,'document.json')
  fs.writeFileSync(file,JSON.stringify(fixture))
  const result=spawnSync(process.execPath,[executable,file],{encoding:'utf8',timeout:10000})
  assert.ok([0,1].includes(result.status),'Gate execution failed: '+result.stderr)
  const report=JSON.parse(result.stdout)
  assert.equal(report.schema,'exo-garment-reference-gate.v2')
  assert.equal(report.authoritativeDocument.garmentTemplateVersion,fixture.template.version)
  return {exit:result.status,report}
}
try{
  const good=run(base)
  assert.equal(good.exit,0,JSON.stringify(good.report.issues))
  assert.equal(good.report.status,'references_valid')
  let negative=0
  for(const [label,breakDoc,expected] of [
    ['duplicate promoted vertex ID',doc=>{doc.template.panels[0].polygon.vertex_ids={right:'free_1'}},/stable curve\/vertex/i],
    ['orphan Bézier edge',doc=>{doc.template.panels[0].polygon.curves.ghost=[[0,0],[1,1]]},/dangling curves/i],
    ['invalid asymmetric handle',doc=>{doc.template.panels[0].polygon.free_curve_points.top[0].derivative_out=[null,3]},/invalid\/unordered independent Bézier/i],
    ['duplicate internal construction',doc=>{doc.template.panels[0].polygon.lines.push(clone(doc.template.panels[0].polygon.lines[0]))},/internal line/i],
    ['orphan target',doc=>{doc.template.panels[0].polygon.target_lengths.ghost=0.12},/dangling target_lengths/i],
    ['incomplete promoted mirror',doc=>{doc.template.panels[0].polygon.vertex_ids={right:'id_2'};doc.template.panels[0].polygon.vertex_mirror_groups={right:'mirror_1'}},/mirror group/i],
    ['non-monotone sewing marks',doc=>{doc.template.seams[0].notches=[[0.7,0.7],[0.3,0.9]]},/non-monotone paired notches/i],
    ['missing stitched edge',doc=>{doc.template.seams[0].b.edge='deleted_edge'},/orphaned b edge/i],
    ['unsupported project version',doc=>{doc.version=9},/unsupported fittingproject version/i],
    ['orphaned POM boundary',doc=>{doc.template.panels[0].polygon.measurements[0].a.edge='missing-edge'},/invalid a named-edge station/i],
    ['duplicate POM identifier',doc=>{doc.template.panels[0].polygon.measurements.push(clone(doc.template.panels[0].polygon.measurements[0]))},/point of measure/i],
    ['invalid POM fraction',doc=>{doc.template.panels[0].polygon.measurements[0].b.t=1.5},/invalid b named-edge station/i],
    ['coincident POM anchors',doc=>{doc.template.panels[0].polygon.measurements[0].b={edge:'left',t:0.5}},/coincident stations/i],
  ]){
    const fixture=clone(base);breakDoc(fixture)
    const {exit,report}=run(fixture)
    assert.equal(exit,1,`${label} must fail closed`)
    assert.ok(report.issues.some(v=>expected.test(v)),`${label}: ${report.issues.join('; ')}`)
    negative++
  }
  console.log(JSON.stringify({pass:true,positive:1,negative,format:'exo-garment-reference-gate.v2'}))
}finally{
  fs.rmSync(temp,{recursive:true,force:true})
}
