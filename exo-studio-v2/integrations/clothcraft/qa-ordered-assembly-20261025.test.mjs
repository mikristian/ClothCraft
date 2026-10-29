import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {planOrderedAssembly} from '../../src/core/backends/nativeOrderedAssembly20261025.mjs'
import {createAgentApi} from './agent-api.mjs'
import os from 'node:os'
import path from 'node:path'
const fixture=JSON.parse(fs.readFileSync('docs/goals/evidence/501-reconstruction-20261025/501-Thomas-installed-app-tested-20261025.json','utf8'))
const template=fixture.template
const first=template.panels[0],second=template.panels[1]
const placement={panel:first.id,placement:{translation:[-.18,1.05,.35],rotation_degrees:[0,0,0]}}
const edge=(p,i)=>({panel:p.id,side:'top',edge:`edge_${i}`,range:[0,1]})
const sample={revision:10,template:{...template,seams:[]}}
test('ordered placement and seam preflight fail closed',()=>{
 const ok=planOrderedAssembly(sample,{placements:[placement],pairs:[{a:edge(first,1),b:edge(second,1),reverse:true,ease:false}]})
 assert.equal(ok.ok,true);assert.equal(ok.commands.length,2)
 assert.equal(planOrderedAssembly(sample,{placements:[placement,placement]}).reason,'INVALID_PLACEMENT')
 assert.equal(planOrderedAssembly(sample,{placements:[{...placement,placement:{translation:[Infinity,0,0],rotation_degrees:[0,0,0]}}]}).ok,false)
 assert.equal(planOrderedAssembly(sample,{pairs:[{a:edge(first,1),b:edge(second,2),reverse:true,ease:false}]}).reason,'SEAM_LENGTH_MISMATCH')
 assert.equal(planOrderedAssembly(sample,{pairs:[{a:edge(first,1),b:edge(first,1),reverse:true,ease:true}]}).reason,'SAME_BOUNDARY')
 assert.equal(planOrderedAssembly({...sample,template},{pairs:[{a:template.seams[0].a,b:edge(second,1),reverse:true,ease:true}]}).reason,'BOUNDARY_ALREADY_SEWN')
 const duplicate=[{a:edge(first,1),b:edge(second,1),reverse:true,ease:false},{a:edge(first,1),b:edge(second,2),reverse:true,ease:true}]
 assert.equal(planOrderedAssembly(sample,{pairs:duplicate}).reason,'BOUNDARY_ALREADY_SEWN')
 assert.equal(planOrderedAssembly(sample,{pairs:duplicate.slice().reverse()}).reason,'BOUNDARY_ALREADY_SEWN')
})
test('assembly agent rejects stale revisions and provides no implicit fit approval',async()=>{
 let rev=10, calls=[]
 const workspace={status:()=>({loaded:true,busy:false}),request:async data=>{
  calls.push(data)
  if(data.op==='snapshot')return {ok:true,data:{...sample,revision:rev}}
  if(data.op==='edit'){rev++;return {ok:true,data:{...sample,revision:rev}}}
  return {ok:false,error:'unexpected'}
 }}
 const api=createAgentApi(workspace,{keyStorePath:path.join(fs.mkdtempSync(path.join(os.tmpdir(),'exo-assembly-api-')),'keys.json')})
 try{
  const proposal={placements:[placement]}
  const preview=await api.dispatch({action:'assembly.preflight',proposal})
  assert.equal(preview.status,200);assert.equal(preview.body.commands,undefined)
  assert.equal((await api.dispatch({action:'assembly.apply',proposal,expectedRevision:9})).body.code,'STALE_REVISION')
  assert.equal((await api.dispatch({action:'assembly.apply',proposal,expectedRevision:10},['read'])).status,403)
  const good=await api.dispatch({action:'assembly.apply',proposal,expectedRevision:10})
  assert.equal(good.body.committed,1);assert.equal(good.body.simulationApproved,false);assert.equal(good.body.revision,11)
  assert.equal(calls.filter(c=>c.op==='edit').length,1)
 }finally{api.close()}
})

test('ordered assembly rejects degenerate or ambiguous source geometry before applying commands',()=>{
 const duplicateIds={...sample,template:{...sample.template,panels:[first,{...second,id:first.id}]}}
 assert.equal(planOrderedAssembly(duplicateIds,{placements:[placement]}).reason,'INVALID_SOURCE_PANELS')
 const duplicateEdges={...sample,template:{...sample.template,panels:[{...first,polygon:{...first.polygon,edges:first.polygon.edges.map(()=>first.polygon.edges[0])}},second]}}
 assert.equal(planOrderedAssembly(duplicateEdges,{placements:[placement]}).reason,'INVALID_SOURCE_PANELS')
 const degenerate={...sample,template:{...sample.template,panels:[{...first,polygon:{...first.polygon,points:first.polygon.points.map(()=>[0,0])}},second]}}
 assert.equal(planOrderedAssembly(degenerate,{pairs:[{a:edge(first,1),b:edge(second,1),reverse:true,ease:true}]}).reason,'INVALID_BOUNDARY_LENGTH')
})

test('assembly apply aborts on an inconsistent native revision before later commands',async()=>{
 let calls=0
 const workspace={status:()=>({loaded:true,busy:false}),request:async request=>{
   if(request.op==='snapshot')return {ok:true,data:sample}
   calls++
   return {ok:true,data:{...sample,revision:12}}
 }}
 const api=createAgentApi(workspace,{keyStorePath:path.join(fs.mkdtempSync(path.join(os.tmpdir(),'exo-assembly-drift-')),'keys.json')})
 try{
   const result=await api.dispatch({action:'assembly.apply',expectedRevision:10,proposal:{placements:[placement],pairs:[{a:edge(first,1),b:edge(second,1),reverse:true,ease:false}]}})
   assert.equal(result.status,409)
   assert.equal(result.body.code,'ASSEMBLY_REVISION_DRIFT')
   assert.equal(result.body.committed,0)
   assert.equal(calls,1,'second command must not execute against an unexpected revision')
 }finally{api.close()}
})
