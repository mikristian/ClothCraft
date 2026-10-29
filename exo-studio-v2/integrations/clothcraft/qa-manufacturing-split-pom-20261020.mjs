// Disposable native manufacturing regression: split an annotated edge and
// verify physical station migration, production cutlines, save/open and rollback.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { mkdtempSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseDxfPatterns } from '../../src/core/dxf.js'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const binary=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
const avatar=path.join(root,'research/oss/clothcraft/assets/makehuman/mannequin.obj')
assert(existsSync(binary)&&existsSync(avatar),'Missing disposable native binary/avatar')
const output=mkdtempSync(path.join(tmpdir(),'exo-manufacturing-'))
const child=spawn(binary,[avatar,path.join(output,'fitting.json')],{cwd:root,stdio:['pipe','pipe','pipe']})
let pending,stderr=''
child.stderr.on('data',chunk=>{stderr=(stderr+chunk).slice(-2000)})
createInterface({input:child.stdout}).on('line',line=>{
 const next=pending;pending=undefined
 try{next?.(JSON.parse(line))}catch(error){next?.({ok:false,error:String(error)})}
})
const rpc=async input=>new Promise((resolve,reject)=>{
 assert(!pending,'Native commands must serialize')
 const timeout=setTimeout(()=>{pending=undefined;reject(Error('Native command timeout: '+stderr))},30000)
 pending=reply=>{clearTimeout(timeout);reply.ok?resolve(reply.data):reject(Error(reply.error))}
 child.stdin.write(JSON.stringify(input)+'\n')
})
const near=(a,b,eps=0.00001)=>assert(Math.abs(a-b)<=eps,`${a} != ${b}`)
const get=(snapshot,id)=>snapshot.template.panels.find(panel=>panel.id===id).polygon
const extent=points=>['x','y'].map(axis=>Math.max(...points.map(p=>p[axis]))-Math.min(...points.map(p=>p[axis])))
const report={pass:false,script:'qa-manufacturing-split-pom-20261020.mjs',cases:{},findings:[]}
try{
 let state=await rpc({op:'open',preset:'tshirt'})
 state=await rpc({op:'edit',revision:state.revision,command:{kind:'Primitive',shape:'rectangle',size:[.2,.1],origin:[0,0],fabric:state.template.fabrics[0].id}})
 const panel=state.template.panels.at(-1),id=panel.id,edges=[...panel.polygon.edges]
 const edit=async command=>{state=await rpc({op:'edit',revision:state.revision,command});return state}
 for(const edge of edges)await edit({kind:'SeamAllowance',panel:id,edge,width_m:.01})
 await edit({kind:'Notch',panel:id,edge:edges[0],t:.25,depth_m:.004})
 await edit({kind:'Notch',panel:id,edge:edges[0],t:.75,depth_m:.004})
 await edit({kind:'SetMeasurement',panel:id,measurement:{id:'POM-1',label:'Edge station span',a:{edge:edges[0],t:.1},b:{edge:edges[0],t:.9}}})
 const original=get(state,id),basePOM=original.measurements[0]
 assert.equal(basePOM.id,'POM-1')
 const originalRevision=state.revision
 await assert.rejects(()=>rpc({op:'edit',revision:state.revision,command:{kind:'SplitBoundary',panel:id,edge:edges[0],at_m:.05}}),/notch lies exactly on the split point/i)
 assert.equal((await rpc({op:'snapshot'})).revision,originalRevision)
 assert.deepEqual(get(await rpc({op:'snapshot'}),id),original)
 report.cases.splitOnNotchAtomic=true
 await assert.rejects(()=>rpc({op:'edit',revision:state.revision,command:{kind:'SeamAllowance',panel:id,edge:edges[0],width_m:-.001}}),/Seam allowance/i)
 await assert.rejects(()=>rpc({op:'edit',revision:state.revision,command:{kind:'Notch',panel:id,edge:edges[0],t:1.2,depth_m:.004}}),/Notch/i)
 await assert.rejects(()=>rpc({op:'edit',revision:state.revision,command:{kind:'SetMeasurement',panel:id,measurement:{id:'POM-1',label:'Broken',a:{edge:'missing',t:.1},b:{edge:edges[0],t:.9}}}}),/POM|boundary/i)
 assert.deepEqual(get(await rpc({op:'snapshot'}),id),original)
 report.cases.invalidRollback=true
 await edit({kind:'SplitBoundary',panel:id,edge:edges[0],at_m:.1})
 const split=get(state,id)
 assert.equal(split.edges.length,5)
 const successor=split.edges[1]
 const before=split.notches[edges[0]][0],after=split.notches[successor][0]
 near(before.t,.5)
 near(after.t,.5)
 near(before.depth_m,.004)
 near(after.depth_m,.004)
 near(split.seam_allowances[edges[0]],.01)
 near(split.seam_allowances[successor],.01)
 const pom=split.measurements.find(p=>p.id==='POM-1')
 assert(pom)
 assert.equal(pom.a.edge,edges[0])
 assert.equal(pom.b.edge,successor)
 near(pom.a.t,.2)
 near(pom.b.t,.8)
 report.cases.splitMetadata=true
 let proof=await rpc({op:'production-cutlines',revision:state.revision,panel:id})
 assert.equal(proof.generatedCount,1)
 assert.equal(proof.panels[0].notchMarkCount,2)
 assert.match(proof.panels[0].dxf,/\$INSUNITS\n70\n4/)
 assert.throws(()=>parseDxfPatterns(proof.panels[0].dxf),/would double its seam allowance/)
 const imported=parseDxfPatterns(proof.panels[0].dxf,{manufacturingImport:'cut-reference'})
 assert(imported.pieces.every(piece=>piece.seamAllowance===0&&piece.locked))
 assert.equal(imported.pieces.length,1)
 assert.equal(imported.pieces[0].notches.length,2)
 const sizeCm=extent(imported.pieces[0].points)
 near(sizeCm[0],22,0.02)
 near(sizeCm[1],12,0.02)
 report.cases.dxfMetricCutline=true
 const saved=await rpc({op:'save'})
 state=await rpc({op:'open',project:saved.project})
 assert.deepEqual(get(state,id).measurements,split.measurements)
 assert.deepEqual(get(state,id).notches,split.notches)
 assert.deepEqual(get(state,id).seam_allowances,split.seam_allowances)
 proof=await rpc({op:'production-cutlines',revision:state.revision,panel:id})
 assert.equal(proof.generatedCount,1)
 assert.equal(proof.panels[0].notchMarkCount,2)
 report.cases.saveReopen=true
 const handoff=await rpc({op:'production-handoff',revision:state.revision})
 assert.equal(handoff.revision,state.revision)
 assert.equal(handoff.manufacturerReady,false)
 assert.equal(handoff.cutlineProof.panels.find(p=>p.panelId===id).notchMarkCount,2)
 report.cases.handoffAtomic=true
 report.pass=true
}catch(error){report.error=String(error.stack||error)}finally{
 child.stdin.end()
 if(child.exitCode===null)child.kill('SIGTERM')
 console.log(JSON.stringify(report,null,2))
}
if(!report.pass)process.exitCode=1
