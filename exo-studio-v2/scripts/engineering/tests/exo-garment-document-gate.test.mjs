import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
const gate=resolve('scripts/engineering/exo-garment-document-gate.mjs');
const sample=()=>({format:'clothcraft',version:2,name:'Disposable',panels:[{id:'front',polygon:{points:[[0,0],[0.2,0],[0.2,0.2],[0,0.2]],edges:['a','b','c','d'],notches:{a:[{t:0.25,depth_m:0.003}]},seam_allowances:{a:0.01}}},{id:'back',polygon:{points:[[0,0],[0.2,0],[0.2,0.2],[0,0.2]],edges:['a','b','c','d']}}],seams:[{id:'shoulder',a:{panel:'front',edge:'a',range:[0,1]},b:{panel:'back',edge:'a',range:[0,1]},reverse_b:true,allow_ease:false,stiffness:50000,notches:[[0.2,0.2],[0.8,0.8]]} ]});
const cases=[
 ['valid native references',()=>{},true],
 ['duplicate panel ID',p=>p.panels[1].id='front',false],
 ['edge count differs from vertex count',p=>p.panels[0].polygon.edges.pop(),false],
 ['orphaned curve reference',p=>p.panels[0].polygon.curves={missing:[[0,0],[0,0]]},false],
 ['orphaned seam endpoint',p=>p.seams[0].a.edge='missing',false],
 ['inverted seam interval',p=>p.seams[0].a.range=[0.7,0.2],false],
 ['invalid notch depth',p=>p.panels[0].polygon.notches.a[0].depth_m=-0.001,false],
 ['nonmonotonic correspondence',p=>p.seams[0].notches=[[0.8,0.8],[0.2,0.9]],false],
 ['duplicate seam ID',p=>p.seams.push({...p.seams[0]}),false],
];
for(const [name,mutate,accepted] of cases){test(name,()=>{const dir=mkdtempSync(join(tmpdir(),'exo-document-gate-'));try{const p=sample();mutate(p);const file=join(dir,'fixture.json');writeFileSync(file,JSON.stringify({version:1,template:p}));const r=spawnSync(process.execPath,[gate,file],{encoding:'utf8'});assert.equal(r.status,accepted?0:1,`stderr ${r.stderr} stdout ${r.stdout}`);const report=JSON.parse(r.stdout);assert.equal(report.status,accepted?'references_valid':'blocked');assert.equal(report.manufacturerApproved,false);assert.equal(report.fitCertified,false);assert.match(report.sourceSha256,/^[0-9a-f]{64}$/);}finally{rmSync(dir,{recursive:true,force:true});}})}
