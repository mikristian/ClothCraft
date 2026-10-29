// Isolated physical Rust Shape compilation. Never opens the installed garment/server.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {createInterface} from 'node:readline'
import {mkdtempSync,existsSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {addNativeFreeCurvePoint,moveNativeFreeCurvePoint,evaluateFreeCurve,symmetricCurveEdge} from '../../src/core/nativeFreeCurvePoints.js'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const binary=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
const avatar=path.join(root,'research/oss/clothcraft/assets/makehuman/mannequin.obj')
assert(existsSync(binary)&&existsSync(avatar),'Local Rust exo-session binary/avatar needed')
const temp=mkdtempSync(path.join(tmpdir(),'exo-side-shape-compile-'))
const child=spawn(binary,[avatar,path.join(temp,'disposable-garment.json')],{cwd:root,stdio:['pipe','pipe','pipe']})
let waiter=null,stderr=''
child.stderr.on('data',chunk=>stderr+=chunk)
createInterface({input:child.stdout}).on('line',line=>{const resolve=waiter;waiter=null;if(resolve)resolve(JSON.parse(line))})
const rpc=payload=>new Promise((resolve,reject)=>{
  assert(!waiter,'Only one request at once')
  const timeout=setTimeout(()=>{waiter=null;reject(Error('Native RPC timeout: '+stderr.slice(-300)))},30000)
  waiter=response=>{clearTimeout(timeout);response.ok?resolve(response.data):reject(Error(response.error))}
  child.stdin.write(JSON.stringify(payload)+'\n')
})
const panelOf=(state,id)=>state.template.panels.find(panel=>panel.id===id)
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])
const snapshot=(polygon,edge)=>[.25,.5,.75].map(t=>evaluateFreeCurve(polygon,edge,t))
const changed=(a,b)=>a.some((point,i)=>distance(point,b[i])>1e-5)
const edit=async(state,panel,polygon)=>rpc({op:'edit',revision:state.revision,command:{kind:'Shape',panel,polygon}})

try{
  let state=await rpc({op:'open',preset:'tshirt'})
  const outcomes=[]
  for(const id of ['front','back']){
    const panel=panelOf(state,id)
    assert(panel?.polygon,`Missing native polygon for ${id}`)
    for(const edge of panel.polygon.edges.filter(edge=>/side-left|side-right|hem/.test(edge))){
      const partner=symmetricCurveEdge(panelOf(state,id).polygon,edge)
      const affectedEdges=new Set([edge,...(partner&&partner.edge!==edge?[partner.edge]:[])])
      const seams=state.template.seams.filter(seam=>[seam.a,seam.b].some(ref=>ref.panel===id&&affectedEdges.has(ref.edge)))
      const easePayloads=[]
      for(const seam of seams){
        const payload={op:'edit-seam',revision:state.revision,seam:seam.id,reverse:seam.reverse_b,ease:true,stiffness:seam.stiffness}
        state=await rpc(payload)
        easePayloads.push(payload)
      }
      const initial=panelOf(state,id).polygon
      const before=snapshot(initial,edge)
      const counterpart=symmetricCurveEdge(initial,edge)
      const isHem=/hem/.test(edge)
      // Paired only when different symmetric edges; mirror helper does not
      // support a self-symmetric edge with a single center marker.
      const mirror=!!counterpart&&counterpart.edge!==edge&&!isHem
      const added=addNativeFreeCurvePoint(initial,edge,.5,{mirror})
      assert(added,`Cannot construct ${id}:${edge}, mirror=${mirror}`)
      let next
      try{next=await edit(state,id,added.polygon)}catch(error){outcomes.push({panel:id,edge,stage:'insert',mirror,error:String(error)});continue}
      const stored=panelOf(next,id).polygon
      const mark=stored.free_curve_points?.[edge]?.find(point=>point.id===added.mark.id)
      assert(mark,`Rust discarded ${id}:${edge} marker`)
      // Pull the side towards panel interior; hem upwards. A small change
      // avoids accidental overlaps with adjacent neck/cuff cutlines.
      const delta=isHem?[0,.004]:[edge.includes('left')?.004:-.004,0]
      const moved=moveNativeFreeCurvePoint(stored,edge,added.mark.id,delta)
      assert(moved,`Cannot move stored ${id}:${edge} marker`)
      try{next=await edit(next,id,moved)}catch(error){outcomes.push({panel:id,edge,stage:'move',mirror,error:String(error)});state=await rpc({op:'undo',revision:next.revision});for(let i=0;i<easePayloads.length;i++)state=await rpc({op:'undo',revision:state.revision});continue}
      const compiled=panelOf(next,id).polygon
      assert(changed(before,snapshot(compiled,edge)),`Compiled ${id}:${edge} contour unchanged`)
      assert(next.positions.length&&next.triangles.length,`Missing compiled mesh ${id}:${edge}`)
      assert.equal(compiled.free_curve_points[edge][0].position[0],moved.free_curve_points[edge][0].position[0])
      const audit=await rpc({op:'pattern-audit',revision:next.revision})
      const measured=audit.panels.find(p=>p.panelId===id)?.edges.find(e=>e.edgeId===edge)
      assert(measured,`No compiled edge measurement ${id}:${edge}`)
      const auditedSeams=audit.seams.filter(seam=>seams.some(item=>item.id===seam.seamId))
      assert.equal(auditedSeams.length,seams.length)
      assert(auditedSeams.every(seam=>seam.allowEase===true),'Physical audit did not retain seam ease')
      const saved=await rpc({op:'save'})
      const reopened=await rpc({op:'open',project:saved.project})
      assert(changed(before,snapshot(panelOf(reopened,id).polygon,edge)),`Reopened ${id}:${edge} contour reverted`)
      const afterAudit=await rpc({op:'pattern-audit',revision:reopened.revision})
      assert(afterAudit.seams.filter(seam=>seams.some(item=>item.id===seam.seamId)).every(seam=>seam.allowEase===true))
      outcomes.push({panel:id,edge,stage:'compiled',mirror,easePayloads,contourDeltaM:Math.max(...snapshot(compiled,edge).map((p,i)=>distance(p,before[i]))),meshVertices:next.positions.length,measuredLengthMm:measured.lengthMm,saveReopen:true,allowEase:true})
      state=await rpc({op:'open',preset:'tshirt'})
    }
  }
  const pass=outcomes.filter(result=>result.stage==='compiled')
  assert.equal(pass.length,6,'All four sides and two hems must compile')
  const rejected=outcomes.filter(result=>result.stage==='move')
  assert.equal(rejected.length,0,'Unexpected native side compilation rejection after ease')
  // Large displacement must be classified independently; do not confuse a
  // locally crossed contour with the first sewn-length error on side edges.
  const isolated=panelOf(state,'front')
  const hem='hem'
  const extreme=addNativeFreeCurvePoint(isolated.polygon,hem,.5)
  assert(extreme)
  const extremeMove=moveNativeFreeCurvePoint(extreme.polygon,hem,extreme.mark.id,[0,.8])
  assert(extremeMove)
  try{
    await edit(state,'front',extremeMove)
    outcomes.push({panel:'front',edge:hem,stage:'extreme',result:'compiled'})
  }catch(error){
    outcomes.push({panel:'front',edge:hem,stage:'extreme',error:String(error)})
  }
  console.log(JSON.stringify({pass:true,fixture:'disposable tshirt',outcomes},null,2))
}finally{
  child.stdin.end()
  if(child.exitCode===null)child.kill('SIGTERM')
  rmSync(temp,{recursive:true,force:true})
}
