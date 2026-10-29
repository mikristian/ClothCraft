// Disposable Rust session: independent free curve tangent persists through
// Shape, compiled mesh, Undo, Redo, Save and reopen. No installed app edits.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {addNativeFreeCurvePoint,editNativeFreeCurveTangent} from '../../src/core/nativeFreeCurvePoints.js'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const out=mkdtempSync(path.join(tmpdir(),'exo-curve-tangent-native-'))
mkdirSync(path.join(out,'workspace'))
const port=5689,base=`http://127.0.0.1:${port}`
const proc=spawn(process.execPath,['integrations/clothcraft/server.mjs'],{cwd:root,detached:true,stdio:'ignore',env:{...process.env,EXO_CLOTHCRAFT_PORT:String(port),EXO_CLOTHCRAFT_OUTPUT_DIR:out,EXO_CLOTHCRAFT_GPU:'0',EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),EXO_CLOTHCRAFT_SESSION_BIN:path.join(root,'research/oss/clothcraft/target/debug/exo-session')}})
const send=async body=>{const res=await fetch(`${base}/workspace`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});const j=await res.json();assert(j.ok,j.error||JSON.stringify(j));return j.data}
try{
 let ready=false
 for(let i=0;i<60;i++){try{const res=await fetch(`${base}/health`,{signal:AbortSignal.timeout(400)});if(res.ok){ready=true;break}}catch{}await sleep(250)}
 assert(ready,'Disposable native solver is unavailable')
 let s=await send({op:'open',preset:'tshirt'})
 const original=s.template.panels.find(p=>p.id==='front'),edge='neck-bottom'
 const added=addNativeFreeCurvePoint(original.polygon,edge,.5)
 assert(added,'Must insert free curve knot')
 s=await send({op:'edit',revision:s.revision,command:{kind:'Shape',panel:original.id,polygon:added.polygon}})
 const baseline=s.template.panels.find(p=>p.id===original.id).polygon
 assert.equal(baseline.free_curve_points[edge].length,1)
 const moved=editNativeFreeCurveTangent(baseline,edge,added.mark.id,[.015,-.04])
 assert(moved,'Must produce tangent edit')
 s=await send({op:'edit',revision:s.revision,command:{kind:'Shape',panel:original.id,polygon:moved}})
 const current=s.template.panels.find(p=>p.id===original.id).polygon
 assert.deepEqual(current.free_curve_points[edge][0].derivative,moved.free_curve_points[edge][0].derivative)
 assert.equal(current.free_curve_points[edge][0].id,added.mark.id)
 assert(s.positions.length>0&&s.triangles.length>0,'Curved pattern must compile a 3D mesh')
 s=await send({op:'undo',revision:s.revision})
 assert.equal(s.template.panels.find(p=>p.id===original.id).polygon.free_curve_points[edge][0].derivative,undefined)
 s=await send({op:'redo',revision:s.revision})
 assert.deepEqual(s.template.panels.find(p=>p.id===original.id).polygon.free_curve_points[edge][0].derivative,current.free_curve_points[edge][0].derivative)
 const saved=await send({op:'save'})
 s=await send({op:'open',project:saved.project})
 assert.deepEqual(s.template.panels.find(p=>p.id===original.id).polygon.free_curve_points[edge][0].derivative,current.free_curve_points[edge][0].derivative)
 console.log(JSON.stringify({pass:true,edge,marker:added.mark.id,derivative:current.free_curve_points[edge][0].derivative,meshVertices:s.positions.length,undoRedo:true,saveReopen:true,isolated:true}))
}finally{try{process.kill(-proc.pid,'SIGTERM')}catch{}rmSync(out,{recursive:true,force:true})}
