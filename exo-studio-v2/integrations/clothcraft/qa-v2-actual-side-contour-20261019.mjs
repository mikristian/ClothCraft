// Disposable native compiler test: compare rendered paper triangles, physical
// boundary vertices and the yellow free-curve source, including persistence.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {createInterface} from 'node:readline'
import {mkdtempSync,rmSync,existsSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {addNativeFreeCurvePoint,moveNativeFreeCurvePoint,evaluateFreeCurve} from '../../src/core/nativeFreeCurvePoints.js'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const binary=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
const avatar=path.join(root,'research/oss/clothcraft/assets/makehuman/mannequin.obj')
assert(existsSync(binary)&&existsSync(avatar),'Disposable native binary or avatar missing')
const tmp=mkdtempSync(path.join(tmpdir(),'exo-actual-contour-'))
const proc=spawn(binary,[avatar,path.join(tmp,'only-disposable.json')],{cwd:root,stdio:['pipe','pipe','pipe']})
let pending,stderr=''
proc.stderr.on('data',c=>stderr+=c)
createInterface({input:proc.stdout}).on('line',line=>{const fn=pending;pending=null;fn?.(JSON.parse(line))})
const rpc=request=>new Promise((resolve,reject)=>{
  assert(!pending,'Overlapping native RPCs')
  const timeout=setTimeout(()=>{pending=null;reject(Error('RPC timeout '+stderr.slice(-500)))},30000)
  pending=response=>{clearTimeout(timeout);response.ok?resolve(response.data):reject(Error(response.error))}
  proc.stdin.write(JSON.stringify(request)+'\n')
})
const panel=(state,id)=>state.template.panels.find(x=>x.id===id)
const range=(state,id)=>state.panels.find(x=>x.id===id)
const norm=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])
const segmentDistance=(p,a,b)=>{const d=b.map((x,i)=>x-a[i]);const t=Math.max(0,Math.min(1,((p[0]-a[0])*d[0]+(p[1]-a[1])*d[1])/(d[0]**2+d[1]**2||1)));return norm(p,a.map((x,i)=>x+t*d[i]))}
const edgeVertices=(state,id,edge)=>range(state,id).boundaries[edge].map(i=>state.uv[i])
const distToChain=(p,chain)=>Math.min(...chain.slice(1).map((b,i)=>segmentDistance(p,chain[i],b)))
const samples=(polygon,edge)=>Array.from({length:65},(_,i)=>evaluateFreeCurve(polygon,edge,i/64))
const metric=(state,id,edge)=>{
  const curve=samples(panel(state,id).polygon,edge),mesh=edgeVertices(state,id,edge)
  const triangleSet=new Set(state.triangles.slice(...range(state,id).triangles).flat())
  assert(mesh.every(vertex=>state.uv.some((uv,i)=>triangleSet.has(i)&&norm(uv,vertex)<1e-10)),'Paper triangles do not contain physical boundary vertices')
  return {meshCount:mesh.length,triangleCount:range(state,id).triangles[1]-range(state,id).triangles[0],maxCurveToMeshM:Math.max(...curve.map(p=>distToChain(p,mesh))),maxMeshToCurveM:Math.max(...mesh.map(p=>distToChain(p,curve))),mesh,curve}
}
try{
  const results=[]
  for(const id of ['front','back'])for(const edge of ['side-left','side-right']){
    let state=await rpc({op:'open',preset:'tshirt'})
    const baseline=metric(state,id,edge)
    const seams=state.template.seams.filter(s=>[s.a,s.b].some(ref=>ref.panel===id&&ref.edge===edge))
    for(const seam of seams)state=await rpc({op:'edit-seam',revision:state.revision,seam:seam.id,reverse:seam.reverse_b,ease:true,stiffness:seam.stiffness})
    let original=panel(state,id).polygon
    const added=addNativeFreeCurvePoint(original,edge,.5,{mirror:false})
    assert(added,`Cannot create ${id}:${edge} point`)
    state=await rpc({op:'edit',revision:state.revision,command:{kind:'Shape',panel:id,polygon:added.polygon}})
    const current=panel(state,id).polygon
    const shift=edge.endsWith('left')?.004:-.004
    const moved=moveNativeFreeCurvePoint(current,edge,added.mark.id,[shift,0])
    assert(moved,'Cannot move free curve point')
    state=await rpc({op:'edit',revision:state.revision,command:{kind:'Shape',panel:id,polygon:moved}})
    const updated=metric(state,id,edge)
    const contourMoved=Math.max(...updated.mesh.map(p=>distToChain(p,baseline.mesh)))
    assert(contourMoved>.001,`Rust meshed boundary did not move: ${id}:${edge}`)
    assert(updated.maxCurveToMeshM<.0015,`Yellow preview and triangle paper silhouette diverge: ${id}:${edge}`)
    assert(updated.maxMeshToCurveM<.0015,`Triangulated boundary diverges from free curve: ${id}:${edge}`)
    const saved=await rpc({op:'save'})
    const reopened=await rpc({op:'open',project:saved.project})
    const persisted=metric(reopened,id,edge)
    assert.deepEqual(persisted.mesh,updated.mesh,`Reopen changed compiled contour ${id}:${edge}`)
    assert.deepEqual(persisted.curve,updated.curve,`Reopen changed authored curve ${id}:${edge}`)
    results.push({id,edge,seams:seams.map(x=>x.id),contourMovedMm:contourMoved*1000,previewMeshErrorMm:updated.maxCurveToMeshM*1000,meshPreviewErrorMm:updated.maxMeshToCurveM*1000,paperTriangleCount:updated.triangleCount,boundaryVertices:updated.meshCount,saveReopen:true})
  }
  console.log(JSON.stringify({pass:true,isolation:'temporary native project',results},null,2))
}finally{
  proc.stdin.end();if(proc.exitCode===null)proc.kill('SIGTERM');rmSync(tmp,{recursive:true,force:true})
}
