// Native Rust production cutline proof. Strictly disposable input/output.
// A pass means the computed geometry survived authoring, not factory approval.
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
assert(existsSync(binary)&&existsSync(avatar),'Native Rust exo-session and avatar required')
const dir=mkdtempSync(path.join(tmpdir(),'exo-cutline-qa-'))
const child=spawn(binary,[avatar,path.join(dir,'fitting.json')],{cwd:root,stdio:['pipe','pipe','pipe']})
let pending,stderr=''
child.stderr.on('data',data=>stderr+=data)
createInterface({input:child.stdout}).on('line',line=>{const fn=pending;pending=null;fn?.(JSON.parse(line))})
const rpc=async input=>new Promise((resolve,reject)=>{
 assert(!pending,'Native writes must serialize')
 const timer=setTimeout(()=>{pending=null;reject(Error('Native Rust timeout '+stderr.slice(-600)))},30000)
 pending=reply=>{clearTimeout(timer);reply.ok?resolve(reply.data):reject(Error(reply.error))}
 child.stdin.write(JSON.stringify(input)+'\n')
})
const near=(actual,expected,tol=1e-5)=>assert(Math.abs(actual-expected)<tol,`${actual} !== ${expected}`)
try{
 let state=await rpc({op:'open',preset:'tshirt'})
 const fabric=state.template.fabrics[0].id
 state=await rpc({op:'edit',revision:state.revision,command:{kind:'Primitive',shape:'rectangle',size:[.2,.1],origin:[0,0],fabric}})
 const panel=state.template.panels.at(-1),edges=panel.polygon.edges
 let result=await rpc({op:'production-cutlines',revision:state.revision,panel:panel.id})
 assert.equal(result.format,'exo-native-cutline-proof.v1')
 assert.equal(result.generatedCount,0)
 assert.equal(result.blockedCount,1)
 assert.match(result.panels[0].error,/Missing seam allowance/i)
 for(const edge of edges){
  state=await rpc({op:'edit',revision:state.revision,command:{kind:'SeamAllowance',panel:panel.id,edge,width_m:.01}})
 }
 const sourceBefore=JSON.stringify(state.template.panels.find(p=>p.id===panel.id).polygon)
 result=await rpc({op:'production-cutlines',revision:state.revision,panel:panel.id})
 assert.equal(result.generatedCount,1)
 assert.equal(result.blockedCount,0)
 assert.equal(result.factoryApproved,false)
 const cut=result.panels[0]
 assert(cut.ok&&cut.pointCount>=4&&cut.edges.length===4)
 near(cut.areaMm2,26400)
 near(cut.perimeterMm,680)
 const xs=cut.pointsMm.map(p=>p[0]),ys=cut.pointsMm.map(p=>p[1])
 near(Math.max(...xs)-Math.min(...xs),220)
 near(Math.max(...ys)-Math.min(...ys),120)
 assert.match(cut.svg,/width="240\.000000mm"/)
 assert.match(cut.svg,/NOT factory approved/)
 assert.match(cut.dxf,/\$ACADVER\n1\nAC1015/)
 assert.match(cut.dxf,/\$INSUNITS\n70\n4/)
 assert.match(cut.dxf,/0\nLWPOLYLINE\n8\nCUT_EXO\n90\n4\n70\n1/)
 assert.match(cut.dxf,/0\nENDSEC\n0\nEOF\n$/)
 assert.throws(()=>parseDxfPatterns(cut.dxf),/would double its seam allowance/)
 const imported=parseDxfPatterns(cut.dxf,{manufacturingImport:'cut-reference'})
 assert(imported.pieces.every(piece=>piece.locked&&piece.seamAllowance===0))
 assert.equal(imported.pieces.length,1)
 const restored=imported.pieces[0].points
 near(Math.max(...restored.map(p=>p.x))-Math.min(...restored.map(p=>p.x)),22)
 near(Math.max(...restored.map(p=>p.y))-Math.min(...restored.map(p=>p.y)),12)
 const repeat=await rpc({op:'production-cutlines',revision:state.revision,panel:panel.id})
 assert.deepEqual(repeat.panels[0].pointsMm,cut.pointsMm)
 assert.equal(JSON.stringify(state.template.panels.find(p=>p.id===panel.id).polygon),sourceBefore)
 // Notches remain authored reference entities. The Rust cutline kernel must
 // project each exact arclength marker onto the correct derived cut edge,
 // while keeping the notch marking separate from the closed outer contour.
 state=await rpc({op:'edit',revision:state.revision,command:{kind:'Notch',panel:panel.id,edge:edges[0],t:0.25,depth_m:.004}})
 result=await rpc({op:'production-cutlines',revision:state.revision,panel:panel.id})
 assert.equal(result.generatedCount,1)
 assert.equal(result.blockedCount,0)
 assert.equal(result.panels[0].notchMarkCount,1)
 const mark=result.panels[0].notchMarksMm[0]
 assert.equal(mark.edgeId,edges[0])
 near(mark.t,.25)
 near(mark.depthMm,4)
 near(Math.hypot(mark.cutStartMm[0]-mark.innerEndMm[0],mark.cutStartMm[1]-mark.innerEndMm[1]),4)
 assert.match(result.panels[0].svg,/stroke="#c0392b"/)
 assert.match(result.panels[0].dxf,/0\nLINE\n8\nNOTCH_EXO/)
 const withNotch=parseDxfPatterns(result.panels[0].dxf,{manufacturingImport:'cut-reference'})
 assert.equal(withNotch.pieces.length,1)
 assert.equal(withNotch.pieces[0].notches.length,1)
 // Split a different allowanced edge. Notch and all derived child allowance
 // metadata must survive as native source records.
 const splitEdge=edges[1]
 state=await rpc({op:'edit',revision:state.revision,command:{kind:'SplitBoundary',panel:panel.id,edge:splitEdge,at_m:0.05}})
 const split=state.template.panels.find(p=>p.id===panel.id).polygon
 assert.equal(split.edges.length,5)
 assert.equal(split.notches[edges[0]][0].depth_m,.004)
 assert(split.edges.filter(e=>e.startsWith(splitEdge)).length===2)
 for(const name of split.edges)near(split.seam_allowances[name],.01)
 state=await rpc({op:'undo',revision:state.revision})
 state=await rpc({op:'redo',revision:state.revision})
 const save=await rpc({op:'save'})
 state=await rpc({op:'open',project:save.project})
 assert.equal(state.template.panels.find(p=>p.id===panel.id).polygon.edges.length,5)
 result=await rpc({op:'production-cutlines',revision:state.revision,panel:panel.id})
 assert.equal(result.generatedCount,1)
 assert.equal(result.panels[0].notchMarkCount,1)
 await assert.rejects(()=>rpc({op:'production-cutlines',revision:state.revision+1,panel:panel.id}),/Stale document revision/)
 console.log(JSON.stringify({pass:true,closedContour:true,rectangleMm:[200,100],cutlineBoundsMm:[220,120],cutlineAreaMm2:cut.areaMm2,cutlinePerimeterMm:cut.perimeterMm,metricNotchMarkMm:4,namedEdgeSplitPreserved:true,allowancesPreserved:true,undoRedo:true,saveReopen:true,manufacturerApproved:false},null,2))
} finally{
 child.stdin.end()
 if(child.exitCode===null)child.kill('SIGTERM')
}
