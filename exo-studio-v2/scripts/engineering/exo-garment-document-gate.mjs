#!/usr/bin/env node
// A non-mutating bridge acceptance gate for the authoritative native project.
// Rejects silently lost pattern references before any manufacturing handoff.
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const input=process.argv[2];
if(!input){console.error('Usage: node scripts/engineering/exo-garment-document-gate.mjs fitting-project.json');process.exit(2)}
const raw=readFileSync(input);const project=JSON.parse(raw);const template=project.template??project;
assert(Array.isArray(template.panels)&&Array.isArray(template.seams),'Expected native GarmentTemplate');
const panels=new Map(),edges=new Map(),issues=[];
const validId=id=>typeof id==='string'&&id.length>0&&id.length<=128&&!/[\u0000-\u001f\u007f]/.test(id);
const point2=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);
const unique=(items,label,panel)=>{
 const seen=new Set();
 for(const item of items){
  if(!validId(item)||seen.has(item))issues.push(`Panel ${panel}: duplicate/invalid ${label} ID ${String(item)}`);
  seen.add(item);
 }
};
if(project.template!==undefined&&project.version!==1)issues.push('Unsupported FittingProject version (expected 1)');
if(template.version!==2)issues.push('Unsupported GarmentTemplate version (expected 2)');
for(const panel of template.panels){
 if(!validId(panel.id)||panels.has(panel.id))issues.push(`Duplicate/missing panel ID ${panel.id}`);
 panels.set(panel.id,panel);
 if(!panel.polygon)continue;
 const {polygon:p}=panel;
 if(!Array.isArray(p.points)||p.points.some(v=>!point2(v)))issues.push(`Panel ${panel.id}: invalid material-space vertex coordinates`);
 if(p.edges.length!==p.points.length)issues.push(`Panel ${panel.id}: edges and vertices disagree`);
 const names=new Set();
 for(const e of p.edges){if(!validId(e)||names.has(e))issues.push(`Panel ${panel.id}: duplicate/invalid edge ${e}`);names.add(e)}
 edges.set(panel.id,names);
 for(const type of ['curves','free_curve_points','vertex_ids','vertex_mirror_groups','target_lengths','notches','seam_allowances']){
  for(const [edge,value] of Object.entries(p[type]??{})){
   if(!names.has(edge))issues.push(`Panel ${panel.id}: dangling ${type} on ${edge}`);
   if(type==='seam_allowances'&&(!Number.isFinite(value)||value<0))issues.push(`Panel ${panel.id}: invalid allowance on ${edge}`);
   if(type==='notches'&&(!Array.isArray(value)||value.some(n=>!Number.isFinite(n.t)||n.t<0||n.t>1||!Number.isFinite(n.depth_m)||n.depth_m<0)))issues.push(`Panel ${panel.id}: invalid notch on ${edge}`);
   if(type==='curves'&&(!Array.isArray(value)||value.length!==2||value.some(v=>!point2(v))))issues.push(`Panel ${panel.id}: non-finite Bézier controls on ${edge}`);
   if(type==='target_lengths'&&(!Number.isFinite(value)||value<=0))issues.push(`Panel ${panel.id}: invalid target-length specification on ${edge}`);
   if(type==='vertex_ids'&&!validId(value))issues.push(`Panel ${panel.id}: invalid stable vertex ID on ${edge}`);
   if(type==='vertex_mirror_groups'&&(!validId(value)||!p.vertex_ids?.[edge]))issues.push(`Panel ${panel.id}: promoted mirror group needs a stable vertex identity on ${edge}`);
  }
 }
 const knotIds=[],mirrorGroups=new Map();
 for(const [edge,stableId] of Object.entries(p.vertex_ids??{}))knotIds.push(stableId);
 for(const [edge,marks] of Object.entries(p.free_curve_points??{})){
  if(!Array.isArray(marks)){issues.push(`Panel ${panel.id}: free curve points on ${edge} must be an array`);continue}
  let previous=0;
  for(const mark of marks){
   if(!mark||!validId(mark.id)||!Number.isFinite(mark.t)||mark.t<=previous+1e-6||mark.t>=1-1e-6||!point2(mark.position)||
      ['derivative','derivative_in','derivative_out'].some(key=>mark[key]!=null&&!point2(mark[key])))
     issues.push(`Panel ${panel.id}: invalid/unordered independent Bézier point on ${edge}`);
   previous=mark?.t??previous;
   knotIds.push(mark?.id);
   if(mark?.mirror_group){
    const group=mirrorGroups.get(mark.mirror_group)||[];
    group.push(edge);mirrorGroups.set(mark.mirror_group,group);
   }
  }
 }
 unique(knotIds,'stable curve/vertex',panel.id);
 for(const [edge,group] of Object.entries(p.vertex_mirror_groups??{})){
  const items=mirrorGroups.get(group)||[];
  items.push(edge);mirrorGroups.set(group,items);
 }
 for(const [group,items] of mirrorGroups){
  if(!validId(group)||items.length!==2||new Set(items).size!==2)
   issues.push(`Panel ${panel.id}: mirror group ${group} needs two different owning edges`);
 }
 unique((p.lines??[]).map(l=>l.id),'internal line',panel.id);
 for(const line of p.lines??[]){
  if(!Array.isArray(line.points)||line.points.length<2||line.points.some(v=>!point2(v))||
     !Array.isArray(line.tangents)||line.tangents.length!==line.points.length||
     line.tangents.some(v=>!point2(v)))
   issues.push(`Panel ${panel.id}: invalid internal construction ${line.id}`);
 }
 unique((p.annotations??[]).map(mark=>mark.id),'annotation',panel.id);
 if(!Array.isArray(p.measurements??[]))issues.push(`Panel ${panel.id}: POM collection must be an array`);
 else{
 unique((p.measurements??[]).map(mark=>mark?.id),'Point of Measure',panel.id);
 for(const pom of p.measurements??[]){
  if(!pom || typeof pom.label!=='string'||!pom.label.trim()||
    pom.label.length>120||/[\u0000-\u001f\u007f]/.test(pom.label)){
   issues.push(`Panel ${panel.id}: POM requires a valid printable label`);
  }
  for(const endpoint of ['a','b']){
   const anchor=pom?.[endpoint];
   if(!anchor||!names.has(anchor.edge)||!Number.isFinite(anchor.t)||
     anchor.t<0||anchor.t>1)
    issues.push(`Panel ${panel.id}: POM ${pom?.id} has invalid ${endpoint} named-edge station`);
  }
  if(pom?.a?.edge===pom?.b?.edge&&pom?.a?.t===pom?.b?.t)
   issues.push(`Panel ${panel.id}: POM ${pom?.id} has coincident stations`);
 }
 }
 for(const hole of p.holes??[]){
  if(!Array.isArray(hole.points)||hole.points.some(v=>!point2(v))||
    !Array.isArray(hole.edges)||hole.edges.length!==hole.points.length)
   issues.push(`Panel ${panel.id}: invalid hole boundary geometry`);
 }
}
const seenSeams=new Set();
for(const seam of template.seams){
 if(!validId(seam.id)||seenSeams.has(seam.id))issues.push(`Duplicate/missing seam ID ${seam.id}`);seenSeams.add(seam.id);
 for(const side of ['a','b']){
  const r=seam[side];if(!r||!panels.has(r.panel))issues.push(`Seam ${seam.id}: unknown ${side} panel`);
  else if(r.edge&&!edges.get(r.panel)?.has(r.edge))issues.push(`Seam ${seam.id}: orphaned ${side} edge ${r.edge}`);
  if(!Array.isArray(r?.range)||r.range.length!==2||r.range.some(n=>!Number.isFinite(n))||r.range[0]<0||r.range[1]>1||r.range[0]>=r.range[1])issues.push(`Seam ${seam.id}: invalid ${side} interval`);
 }
 if(typeof seam.reverse_b!=='boolean'||typeof seam.allow_ease!=='boolean'||!Number.isFinite(seam.stiffness)||seam.stiffness<=0)
  issues.push(`Seam ${seam.id}: invalid reverse/easing/stiffness specification`);
 let prevA=0,prevB=0;
 for(const pair of seam.notches??[]){
  if(!Array.isArray(pair)||pair.length!==2||pair.some(n=>!Number.isFinite(n))||pair[0]<=prevA||pair[1]<=prevB||pair[0]>=1||pair[1]>=1){issues.push(`Seam ${seam.id}: non-monotone paired notches`);break}
  [prevA,prevB]=pair;
 }
}
const sha=createHash('sha256').update(raw).digest('hex');
const report={schema:'exo-garment-reference-gate.v2',
  authoritativeDocument:{fittingProjectVersion:project.template!==undefined?project.version:null,
    garmentTemplateVersion:template.version,materialUnits:'metres',stableEdges:true},
  status:issues.length?'blocked':'references_valid',sourceSha256:sha,
  panels:template.panels.length,seams:template.seams.length,issues,
  coverageLimits:['No persistent independent parametric multi-size grade rules',
    'No semantic native dart/pleat topology records; internal lines are drafting guides',
    'This read-only check does not certify physical fit or manufacturer cutlines'],
  manufacturerApproved:false,fitCertified:false};
console.log(JSON.stringify(report,null,2));if(issues.length)process.exitCode=1;
