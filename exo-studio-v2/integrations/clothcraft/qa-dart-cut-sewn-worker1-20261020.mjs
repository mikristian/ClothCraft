// Disposable Rust native cut-and-sewn dart QA. Writes only to os.tmpdir().
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {createInterface} from 'node:readline'
import {mkdtempSync,mkdirSync,existsSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {createServer} from 'node:net'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const binary=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
const avatar=path.join(root,'research/oss/clothcraft/assets/makehuman/mannequin.obj')
assert(existsSync(binary)&&existsSync(avatar))
const dir=mkdtempSync(path.join(tmpdir(),'exo-dart-sewn-'))
const child=spawn(binary,[avatar,path.join(dir,'session.json')],{cwd:root,stdio:['pipe','pipe','pipe']})
let pending,stderr=''
child.stderr.on('data',x=>stderr+=x)
createInterface({input:child.stdout}).on('line',line=>{const next=pending;pending=null;next?.(JSON.parse(line))})
const rpc=input=>new Promise((resolve,reject)=>{
 assert(!pending,'Overlapping native RPC')
 const timeout=setTimeout(()=>{pending=null;reject(Error('Timed out '+JSON.stringify(input)+' '+stderr))},45000)
 pending=r=>{clearTimeout(timeout);r.ok?resolve(r.data):reject(Error(r.error))}
 child.stdin.write(JSON.stringify(input)+'\n')
})
const approx=(a,b,eps=1e-6)=>assert(Math.abs(a-b)<eps, `${a} != ${b}`)
const area=points=>Math.abs(points.reduce((acc,p,i)=>acc+p[0]*points[(i+1)%points.length][1]-p[1]*points[(i+1)%points.length][0],0))/2
const length=(a,b)=>Math.hypot(...a.map((v,i)=>v-b[i]))
const report={script:'qa-dart-cut-sewn-worker1-20261020.mjs',temporaryDirectory:dir,checks:[]}
const freePort=()=>new Promise((resolve,reject)=>{const s=createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p))})})
async function browserQA(){
 const {chromium}=await import('playwright-core')
 const {setTimeout:sleep}=await import('node:timers/promises')
 const privatePort=await freePort(),base=`http://127.0.0.1:${privatePort}`
 const tmp=mkdtempSync(path.join(tmpdir(),'exo-dart-browser-'))
 mkdirSync(path.join(tmp,'workspace'))
 const server=spawn(process.execPath,['integrations/clothcraft/server.mjs'],{cwd:root,stdio:'ignore',env:{...process.env,EXO_CLOTHCRAFT_PORT:String(privatePort),EXO_CLOTHCRAFT_OUTPUT_DIR:tmp,EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),EXO_CLOTHCRAFT_SESSION_BIN:binary,EXO_CLOTHCRAFT_GPU:'0'}})
 let browser
 const calls=[],failed=[],errors=[]
 const privateRPC=async body=>{const response=await fetch(base+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});const result=await response.json();assert(result.ok,JSON.stringify({body,error:result.error}));return result.data}
 try{
  let ready=false
  for(let i=0;i<100;i++){try{const r=await fetch(base+'/health',{signal:AbortSignal.timeout(800)});if(r.ok&&(await r.json()).nativeReady){ready=true;break}}catch{}await sleep(150)}
  assert(ready,'Private backend not ready')
  let state=await privateRPC({op:'open',preset:'tshirt'})
  state=await privateRPC({op:'edit',revision:state.revision,command:{kind:'Primitive',shape:'rectangle',size:[.2,.16],origin:[0,0],fabric:state.template.fabrics[0].id}})
  const rectangle=state.template.panels.at(-1),id=rectangle.id,edge=rectangle.polygon.edges[0],startRevision=state.revision
  const ui='http://127.0.0.1:5297'
  const source=await fetch(ui,{signal:AbortSignal.timeout(3000)})
  assert(source.ok,'Source UI 5297 unavailable')
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
  const page=await browser.newPage({viewport:{width:1728,height:1040}})
  page.on('pageerror',e=>errors.push(e.message))
  await page.route('**/workspace',async route=>{
   const body=route.request().postDataJSON();calls.push(body)
   try{const response=await fetch(base+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});const raw=await response.text();if(!response.ok)failed.push({body,status:response.status,raw:raw.slice(0,500)});await route.fulfill({status:response.status,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:raw})}
   catch(e){failed.push({body,error:String(e)});await route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({ok:false,error:String(e)})})}
  })
  await page.goto(ui+'/?desktop=1&engine=clothcraft&qa=physical-dart',{waitUntil:'domcontentloaded',timeout:30000})
  const board=page.locator('.cc-board').filter({has:page.locator('svg[data-native-tool]')}).first()
  await board.locator('[data-2d-edge-hit]').first().waitFor({timeout:45000})
  await page.getByLabel('3D and 2D window arrangement',{exact:true}).selectOption('2d').catch(()=>{})
  await board.getByRole('button',{name:'Frame all',exact:true}).click().catch(()=>{})
  // The native toolbar's Internal Line flyout exposes the actual dart selection.
  const dartButton=page.getByRole('button',{name:'Physical Dart (Cut + Sew)'}).first()
  if(!await dartButton.isVisible()){
   const internal=page.locator('[data-tool-family="internal"] > button').first()
   await internal.hover()
  }
  await dartButton.waitFor({state:'visible',timeout:15000})
  await dartButton.click()
  await board.locator('svg[data-native-tool="dart"]').waitFor({timeout:15000})
  await board.getByRole('button',{name:'2D Pattern Display'}).click()
  await board.getByRole('spinbutton',{name:'Physical dart intake in millimetres'}).fill('30')
  await board.getByRole('spinbutton',{name:'Physical dart depth in millimetres'}).fill('80')
  await board.getByRole('button',{name:'2D Pattern Display'}).click()
  const target=board.locator(`[data-2d-edge-hit="${id}:${edge}"]`).first()
  await target.waitFor({state:'attached',timeout:15000})
  const center=await target.evaluate(node=>{const ps=(node.getAttribute('points')||'').trim().split(/\s+/).map(v=>v.split(',').map(Number)),a=ps[0],b=ps.at(-1),p=new DOMPoint((a[0]+b[0])/2,(a[1]+b[1])/2).matrixTransform(node.getScreenCTM());return{x:p.x,y:p.y}})
  const hit=await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.closest('[data-2d-edge-hit]')?.getAttribute('data-2d-edge-hit'),center)
  assert.equal(hit,`${id}:${edge}`,'Dart edge obscured')
  await page.mouse.click(center.x,center.y)
  await page.waitForFunction(()=>document.querySelectorAll('[data-physical-dart]').length>0,{timeout:25000})
  let snapshot
  for(let i=0;i<100;i++){snapshot=await privateRPC({op:'snapshot'});if(snapshot.revision>startRevision)break;await sleep(100)}
  assert.equal(snapshot.revision,startRevision+1)
  const dartCalls=calls.filter(x=>x.op==='edit'&&x.command?.kind==='DartCutSew')
  assert.equal(dartCalls.length,1)
  const cmd=dartCalls[0].command
  approx((cmd.right_t-cmd.left_t)*.2,.03,1e-4)
  const [a,b]=rectangle.polygon.points,delta=[b[0]-a[0],b[1]-a[1]],middle=[a[0]+delta[0]*(cmd.left_t+cmd.right_t)/2,a[1]+delta[1]*(cmd.left_t+cmd.right_t)/2]
  approx(length(cmd.apex,middle),.08,1e-4)
  assert(snapshot.positions.length>0)
  const physical=await board.locator('[data-physical-dart]').count();assert.equal(physical,1)
  const saved=await privateRPC({op:'save'})
  assert(saved.project.template.seams.some(s=>s.id.startsWith('dart_')))
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('garment-studio-native-action',{detail:'edit.undo'})))
  let undone
  for(let i=0;i<100;i++){undone=await privateRPC({op:'snapshot'});if(undone.revision>snapshot.revision)break;await sleep(100)}
  assert.equal(undone.template.panels.find(p=>p.id===id).polygon.points.length,4)
  assert.equal(undone.template.seams.length,state.template.seams.length)
  const reopened=await privateRPC({op:'open',project:saved.project})
  assert(reopened.template.seams.some(s=>s.id.startsWith('dart_')))
  assert.deepEqual(errors,[])
  return {pass:true,privatePort,sourceUI:5297,panel:id,edge,requests:dartCalls.length,intakeMm:30,depthMm:80,physicalDartDOM:physical,rendererPositions:snapshot.positions.length,revisions:{before:startRevision,dart:snapshot.revision,undo:undone.revision},saved:true,reopened:true,pageErrors:errors,failedRequests:failed}
 }catch(e){return {pass:false,error:String(e.stack||e),privatePort,calls:calls.slice(-12),failed,errors}}
 finally{await browser?.close().catch(()=>{});server.kill('SIGTERM')}
}
const run=async()=>{
 let state=await rpc({op:'open',preset:'tshirt'})
 const edit=async command=>{state=await rpc({op:'edit',revision:state.revision,command});return state}
 const fabric=state.template.fabrics[0].id
 await edit({kind:'Primitive',shape:'rectangle',size:[.2,.16],origin:[0,0],fabric})
 const panel=state.template.panels.at(-1),id=panel.id,edge=panel.polygon.edges[0]
 const baselineArea=area(panel.polygon.points),baselineSeams=state.template.seams.length
 const oldRevision=state.revision
 const a=panel.polygon.points[0],b=panel.polygon.points[1]
 const t0=.425,t1=.575
 const left=a.map((v,i)=>v+(b[i]-v)*t0),right=a.map((v,i)=>v+(b[i]-v)*t1)
 const delta=b.map((v,i)=>v-a[i]),edgeLength=Math.hypot(...delta)
 const mid=left.map((v,i)=>(v+right[i])/2),apex=[mid[0]-delta[1]/edgeLength*.08,mid[1]+delta[0]/edgeLength*.08]
 approx(length(left,right),.03)
 await edit({kind:'DartCutSew',panel:id,edge,left_t:t0,right_t:t1,apex})
 assert.equal(state.revision,oldRevision+1)
 const dartPanel=state.template.panels.find(p=>p.id===id),poly=dartPanel.polygon
 const seam=state.template.seams.at(-1)
 assert.equal(poly.points.length,panel.polygon.points.length+3)
 assert.equal(state.template.seams.length,baselineSeams+1)
 assert.equal(seam.a.panel,id);assert.equal(seam.b.panel,id)
 assert.equal(seam.reverse_b,true)
 const physicalArea=area(poly.points),loss=baselineArea-physicalArea
 approx(loss,.03*.08/2,1e-7)
 assert(state.positions.length>0&&state.triangles.length>0)
 report.drawing={panel:id,edge,sourceAreaM2:baselineArea,dartAreaM2:physicalArea,lostAreaM2:loss,expectedLossM2:.0012,seamId:seam.id,seamLegs:[seam.a.edge,seam.b.edge],revision:state.revision,positionCount:state.positions.length,triangleCount:state.triangles.length}
 report.checks.push('native physical wedge area, named paired seam, remeshed 3D snapshot, one revision')
 const exportProof=await rpc({op:'production-cutlines',revision:state.revision,panel:id})
 const cut=exportProof.panels[0]
 report.production={generatedCount:exportProof.generatedCount,blockedCount:exportProof.blockedCount,ok:cut?.ok,error:cut?.error,factoryApproved:cut?.factoryApproved,areaMm2:cut?.areaMm2,dxfLayers:cut?.dxf?[...new Set([...cut.dxf.matchAll(/\n8\n([^\n]+)/g)].map(x=>x[1]))]:[]}
 if(cut?.ok){assert(cut.areaMm2>0);approx(cut.areaMm2,physicalArea*1e6,1);assert.equal(cut.factoryApproved,false)}
 report.checks.push('native production-cutline response inspected; factory acceptance explicitly limited')
 const saved=await rpc({op:'save'})
 const savedProject=saved.project
 assert(savedProject)
 const reopened=await rpc({op:'open',project:savedProject})
 const rePanel=reopened.template.panels.find(p=>p.id===id)
 assert.equal(rePanel.polygon.points.length,poly.points.length)
 assert(reopened.template.seams.some(s=>s.id===seam.id))
 report.reopen={revision:reopened.revision,preservedPanel:true,preservedSeam:true}
 report.checks.push('native saved project roundtrip through private temporary session')
 // Opening resets history; demonstrate undo on a separate fresh disposable session.
 state=await rpc({op:'open',preset:'tshirt'})
 await edit({kind:'Primitive',shape:'rectangle',size:[.2,.16],origin:[0,0],fabric:state.template.fabrics[0].id})
 const target=state.template.panels.at(-1),eid=target.polygon.edges[0]
 const aa=target.polygon.points[0],bb=target.polygon.points[1],dv=bb.map((v,i)=>v-aa[i]),ln=Math.hypot(...dv)
 const center=aa.map((v,i)=>v+dv[i]*.5),tip=[center[0]-dv[1]/ln*.08,center[1]+dv[0]/ln*.08]
 await edit({kind:'DartCutSew',panel:target.id,edge:eid,left_t:.425,right_t:.575,apex:tip})
 const undo=await rpc({op:'undo',revision:state.revision})
 assert.equal(undo.template.panels.find(p=>p.id===target.id).polygon.points.length,4)
 assert.equal(undo.template.seams.length,baselineSeams)
 report.undo={restoredFourPoints:true,removedSeam:true}
 report.checks.push('single history undo restores contour and removes the dart seam')
 // Run actual native CPU solver after a freshly applied dart.
 state=undo
 await edit({kind:'DartCutSew',panel:target.id,edge:eid,left_t:.425,right_t:.575,apex:tip})
 const beforePositions=state.positions, beforeTime=state.time
 try{
  const stepped=await rpc({op:'step',revision:state.revision,steps:2})
  report.simulation={success:true,timeBefore:beforeTime,timeAfter:stepped.time,revisionBefore:state.revision,revisionAfter:stepped.revision,movedVertices:stepped.positions.filter((p,i)=>length(p,beforePositions[i])>1e-8).length,metrics:stepped.metrics}
 }catch(e){report.simulation={success:false,error:String(e)}}
 console.log(JSON.stringify({pass:true,...report},null,2))
}
try{await run();const browserResult=await browserQA();console.log(JSON.stringify({browserQA:browserResult},null,2));if(!browserResult.pass)process.exitCode=1}catch(e){console.error(JSON.stringify({pass:false,...report,error:String(e),stderr},null,2));process.exitCode=1}
finally{child.stdin.end();if(child.exitCode===null)child.kill('SIGTERM')}
