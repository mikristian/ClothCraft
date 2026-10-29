// Isolated Rust session: a committed side Shape must change the 3D snapshot mesh.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {createInterface} from 'node:readline'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {addNativeFreeCurvePoint,moveNativeFreeCurvePoint} from '../../src/core/nativeFreeCurvePoints.js'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const tmp=mkdtempSync(path.join(tmpdir(),'exo-side-3d-disposable-'))
const proc=spawn(path.join(root,'research/oss/clothcraft/target/debug/exo-session'),[
  path.join(root,'research/oss/clothcraft/assets/makehuman/mannequin.obj'),path.join(tmp,'garment.json')
],{cwd:root,stdio:['pipe','pipe','pipe']})
let pending,stderr=''
proc.stderr.on('data',d=>stderr+=d)
createInterface({input:proc.stdout}).on('line',line=>{const done=pending;pending=null;done?.(JSON.parse(line))})
const rpc=payload=>new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>{pending=null;reject(Error('RPC timeout '+stderr.slice(-200)))},20000)
  pending=reply=>{clearTimeout(timeout);reply.ok?resolve(reply.data):reject(Error(reply.error))}
  proc.stdin.write(JSON.stringify(payload)+'\n')
})
const panel=(s,id)=>s.template.panels.find(p=>p.id===id)
const mesh=(s,id)=>{
  const p=s.panels.find(p=>p.id===id),indices=new Set(s.triangles.slice(...p.triangles).flat())
  return [...indices].map(i=>[...s.uv[i],...s.positions[i]]).sort((a,b)=>a[0]-b[0]||a[1]-b[1])
}
try{
  const results=[]
  for(const id of ['front','back'])for(const edge of ['side-left','side-right']){
    let s=await rpc({op:'open',preset:'tshirt'})
    const original=mesh(s,id)
    for(const seam of s.template.seams.filter(x=>[x.a,x.b].some(ref=>ref.panel===id&&ref.edge===edge))){
      s=await rpc({op:'edit-seam',revision:s.revision,seam:seam.id,reverse:seam.reverse_b,ease:true,stiffness:seam.stiffness})
    }
    const add=addNativeFreeCurvePoint(panel(s,id).polygon,edge,.5)
    assert(add)
    s=await rpc({op:'edit',revision:s.revision,command:{kind:'Shape',panel:id,polygon:add.polygon}})
    const moved=moveNativeFreeCurvePoint(panel(s,id).polygon,edge,add.mark.id,[edge==='side-left'?.004:-.004,0])
    assert(moved)
    s=await rpc({op:'edit',revision:s.revision,command:{kind:'Shape',panel:id,polygon:moved}})
    const after=mesh(s,id)
    assert.notDeepEqual(after,original,`3D mesh snapshot unchanged after Shape: ${id}:${edge}`)
    assert(after.every(v=>v.length===5&&v.every(Number.isFinite)))
    const saved=await rpc({op:'save'})
    const reopened=await rpc({op:'open',project:saved.project})
    assert.deepEqual(mesh(reopened,id),after,`Reopened 3D mesh differs: ${id}:${edge}`)
    results.push({id,edge,revision:s.revision,meshVerticesBefore:original.length,meshVerticesAfter:after.length,threeDChanged:true,saveReopen:true})
  }
  console.log(JSON.stringify({pass:true,isolation:'temporary Rust session',results},null,2))
}finally{proc.stdin.end();if(proc.exitCode===null)proc.kill('SIGTERM');rmSync(tmp,{recursive:true,force:true})}
