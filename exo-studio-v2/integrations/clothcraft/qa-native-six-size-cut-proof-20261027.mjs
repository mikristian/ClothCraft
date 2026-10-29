/** Live Rust six-size CUT proof in a disposable native session.
 * Measurements establish geometric engineering behavior, not factory approval.
 */
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {createInterface} from 'node:readline'
import {existsSync,mkdtempSync,readFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const binary=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
const avatar=path.join(root,'research/oss/clothcraft/assets/makehuman/mannequin.obj')
assert(existsSync(binary)&&existsSync(avatar),'Build the development exo-session binary and provide the bundled test avatar')
const output=mkdtempSync(path.join(tmpdir(),'exo-native-six-size-cut-'))
const projectPath=path.join(output,'fitting-project.json')
const child=spawn(binary,[avatar,projectPath],{cwd:root,stdio:['pipe','pipe','pipe'],env:{...process.env,RAYON_NUM_THREADS:'2'}})
const rl=createInterface({input:child.stdout})
let pending,stderr=''
child.stderr.on('data',chunk=>{stderr=(stderr+chunk).slice(-4000)})
rl.on('line',line=>{
  const receiver=pending
  pending=null
  if(receiver)receiver(JSON.parse(line))
})
const rpc=async request=>new Promise((resolve,reject)=>{
  assert(!pending,'Serial native RPC is required')
  const timer=setTimeout(()=>{pending=null;reject(Error('Timed out waiting for Rust: '+stderr))},45000)
  pending=reply=>{
    clearTimeout(timer)
    reply.ok?resolve(reply.data):reject(Error(reply.error||'Unknown native error'))
  }
  child.stdin.write(JSON.stringify(request)+'\n')
})
const sizes=['XS','S','M','L','XL','XXL']
const scaleBySize={XS:.97,S:.985,M:1,L:1.015,XL:1.03,XXL:1.12}
const near=(value,target,tolerance=1e-8)=>
  assert(Math.abs(value-target)<=tolerance,`Measured ${value} differs from ${target} beyond ${tolerance}`)
const edgeLength=(points,index)=>Math.hypot(
  points[(index+1)%points.length][0]-points[index][0],
  points[(index+1)%points.length][1]-points[index][1])
const signedArea=points=>Math.abs(points.reduce((area,p,i)=>{
  const q=points[(i+1)%points.length]
  return area+p[0]*q[1]-q[0]*p[1]
},0)/2)
const clone=value=>structuredClone(value)
const persistSource=project=>{
  const source=clone(project)
  for(const panel of source.template.panels){
    const polygon=panel.polygon
    assert(polygon&&polygon.points.length>=3)
    polygon.seam_allowances=Object.fromEntries(polygon.edges.map(edge=>[edge,.01]))
    assert(polygon.edges.includes('hem'))
    polygon.notches={hem:[{t:.25,depth_m:.004}]}
    // A positive metric source remains immutable throughout CUT inspection.
    panel.pattern.width=1
    panel.pattern.height=.66
  }
  source.state=null
  source.mesh_signature=null
  return source
}
const gradeRunFor=source=>{
  const base=source.template
  const templates=sizes.map(size=>{
    const template=clone(base)
    const factor=scaleBySize[size]
    for(const panel of template.panels){
      const polygon=panel.polygon
      const min=[0,1].map(axis=>Math.min(...polygon.points.map(point=>point[axis])))
      polygon.points=polygon.points.map(point=>point.map((value,axis)=>min[axis]+(value-min[axis])*factor))
    }
    return template
  })
  return {schemaVersion:1,sizes,baseSize:'M',baseTemplate:clone(base),gradedTemplates:templates,pomSpecs:[]}
}
const verifyCut=(packet,run)=>{
  assert.equal(packet.format,'exo-native-graded-cutlines.v1')
  assert.equal(packet.manufacturerReady,false)
  assert.equal(packet.cuttingAuthorized,false)
  assert.deepEqual(packet.sizes.map(entry=>entry.size),sizes)
  const report=[]
  for(let i=0;i<sizes.length;i++){
    const record=packet.sizes[i],template=run.gradedTemplates[i]
    assert.equal(record.panels.length,template.panels.length)
    assert.equal(record.seams.length,template.seams.length)
    const panelAreas=[]
    let notchCount=0
    for(const [index,panel] of record.panels.entries()){
      const original=template.panels[index]
      assert.equal(panel.panel_id,original.id)
      const polygon=original.polygon,cut=panel.cut
      assert.equal(cut.edges.length,polygon.edges.length)
      assert.equal(cut.notches.length,1)
      assert(cut.points.length>=polygon.points.length)
      assert(cut.area_m2>signedArea(polygon.points))
      assert(cut.perimeter_m>0&&Number.isFinite(cut.perimeter_m))
      near(cut.area_m2,signedArea(cut.points),1e-10)
      const roundedAllowance=cut.edges.map(edge=>Math.round(edge.allowance_m*1000))
      assert(roundedAllowance.every(width=>width===10))
      assert.deepEqual(cut.edges.map(edge=>edge.name),polygon.edges)
      for(const [edgeIndex,edge] of polygon.edges.entries()){
        near(panel.sewline_edge_lengths_m[edge],edgeLength(polygon.points,edgeIndex),2e-7)
      }
      const mark=cut.notches[0]
      assert.equal(mark.edge_id,'hem')
      near(mark.t,.25)
      near(mark.depth_m*1000,4)
      near(Math.hypot(mark.cut_start[0]-mark.inner_end[0],mark.cut_start[1]-mark.inner_end[1]),.004)
      const hemIndex=polygon.edges.indexOf('hem')
      const origin=polygon.points[hemIndex].map((value,axis)=>
        value+.25*(polygon.points[(hemIndex+1)%polygon.points.length][axis]-value))
      near(Math.hypot(mark.cut_start[0]-origin[0],mark.cut_start[1]-origin[1]),.01,1e-8)
      near(Math.hypot(mark.inner_end[0]-origin[0],mark.inner_end[1]-origin[1]),.006,1e-8)
      // Markings land precisely on the outward CUT boundary, not the sewline.
      const segment=cut.edges.find(edge=>edge.name==='hem')
      assert(segment)
      const a=cut.points[segment.start],b=cut.points[segment.end]
      const ab=b.map((v,axis)=>v-a[axis]),ap=mark.cut_start.map((v,axis)=>v-a[axis])
      near(ab[0]*ap[1]-ab[1]*ap[0],0,2e-8)
      assert(ap[0]*ab[0]+ap[1]*ab[1]>0)
      panelAreas.push(cut.area_m2)
      notchCount++
    }
    for(const seam of record.seams){
      const authored=template.seams.find(item=>item.id===seam.seam_id)
      assert(authored,`Unknown sewn relationship: ${seam.seam_id}`)
      for(const [reference,field] of [[authored.a,'a_length_m'],[authored.b,'b_length_m']]){
        const panel=record.panels.find(item=>item.panel_id===reference.panel)
        assert(panel)
        near(seam[field],panel.sewline_edge_lengths_m[reference.edge]*(reference.range[1]-reference.range[0]),1e-8)
      }
      near(seam.mismatch_m,Math.abs(seam.a_length_m-seam.b_length_m))
      assert.equal(seam.allows_ease,authored.allow_ease)
      assert.equal(seam.notch_intervals_m.length,authored.notches.length+1)
      near(seam.notch_intervals_m.reduce((sum,span)=>sum+span[0],0),seam.a_length_m)
      near(seam.notch_intervals_m.reduce((sum,span)=>sum+span[1],0),seam.b_length_m)
      if(!seam.allows_ease)near(seam.mismatch_m,0,1e-7)
    }
    report.push({size:sizes[i],factor:scaleBySize[sizes[i]],cutAreasCm2:panelAreas.map(area=>Math.round(area*1e6)/100),notches:notchCount,sewnRelationships:record.seams.length})
  }
  for(let i=1;i<report.length;i++){
    assert(report[i].cutAreasCm2[0]>report[i-1].cutAreasCm2[0],`Nonascending native CUT area for ${sizes[i]}`)
  }
  near(report[5].factor,1.12)
  return report
}

try{
  await rpc({op:'open',preset:'tshirt'})
  const initialSave=await rpc({op:'save'})
  const authored=persistSource(initialSave.project)
  const opened=await rpc({op:'open',project:authored})
  const sourceSave=await rpc({op:'save'})
  assert.deepEqual(sourceSave.project.template,authored.template)
  const run=gradeRunFor(authored)
  const committed=await rpc({op:'grade-run-commit',revision:opened.revision,gradeRun:run})
  assert.equal(committed.gradeRunCommitted,true)
  const status=await rpc({op:'grade-run-status',revision:committed.revision})
  assert.equal(status.persistedInProject,true)
  assert.equal(status.catalog.baseSize,'M')
  assert.deepEqual(status.catalog.gradedTemplates,run.gradedTemplates)
  const savedBefore=await rpc({op:'save'})
  const serializedBefore=readFileSync(projectPath,'utf8')
  const packet=await rpc({op:'grade-run-cutlines',revision:committed.revision})
  assert.equal(packet.sourceRevision,committed.revision)
  assert.equal(packet.revision,committed.revision)
  const report=verifyCut(packet,run)
  assert.deepEqual(await rpc({op:'grade-run-cutlines',revision:committed.revision}),packet,'CUT output must be repeatable')
  await assert.rejects(()=>rpc({op:'grade-run-cutlines',revision:committed.revision+1}),/Stale document revision/)
  const after=await rpc({op:'save'})
  assert.deepEqual(after.project,savedBefore.project,'Read-only CUT inspection must preserve entire project')
  assert.equal(readFileSync(projectPath,'utf8'),serializedBefore,'CUT inspection must preserve durable native project')
  const corrupted=clone(savedBefore.project)
  delete corrupted.grade_run.gradedTemplates[5].panels[0].polygon.seam_allowances.hem
  await assert.rejects(()=>rpc({op:'open',project:corrupted}),/allowance|grade|source|compile/i)
  const malformed=clone(savedBefore.project)
  malformed.grade_run.gradedTemplates[5].panels[0].polygon.notches.hem[0].depth_m=.25
  await assert.rejects(()=>rpc({op:'open',project:malformed}),/grade|metadata|notch|compile/i)
  const retained=await rpc({op:'grade-run-status',revision:committed.revision})
  assert.equal(retained.revision,committed.revision)
  assert.deepEqual(retained.catalog,status.catalog,'Rejected imports cannot alter the valid catalog')
  console.log(JSON.stringify({pass:true,binary,output,sourceRevision:packet.sourceRevision,
    sourcePreserved:true,readOnly:true,repeatable:true,staleRevisionRejected:true,
    corruptAllowanceRejected:true,corruptNotchRejected:true,
    totalPanels:packet.sizes.reduce((sum,size)=>sum+size.panels.length,0),
    totalNotches:packet.sizes.reduce((sum,size)=>sum+size.panels.reduce((n,p)=>n+p.cut.notches.length,0),0),
    totalSeams:packet.sizes.reduce((sum,size)=>sum+size.seams.length,0),
    sizes:report,manufacturerReady:false,cuttingAuthorized:false},null,2))
}finally{
  child.stdin.end()
  if(child.exitCode===null)child.kill('SIGTERM')
}
