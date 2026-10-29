// Disposable seam convergence audit: no writes outside the OS temporary directory.
import {spawn} from 'node:child_process'
import {createInterface} from 'node:readline'
import {mkdtempSync,existsSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const binary=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
const avatar=path.join(root,'research/oss/clothcraft/assets/makehuman/mannequin.obj')
if(!existsSync(binary)||!existsSync(avatar))throw Error('Missing compiled isolated native fixture')
const checkpoints=[0,10,50,200,1000]
const outputs=[]
async function trial(preset,mode='cpu'){
 const temp=mkdtempSync(path.join(tmpdir(),`exo-dart-convergence-${preset}-`))
 const args=[avatar,path.join(temp,'project.json'),...(mode==='gpu'?['--gpu']:[])]
 const child=spawn(binary,args,{cwd:root,stdio:['pipe','pipe','pipe']})
 let pending,stderr=''
 child.stderr.on('data',x=>stderr+=String(x).slice(-2000))
 createInterface({input:child.stdout}).on('line',line=>{const f=pending;pending=undefined;try{f?.resolve(JSON.parse(line))}catch(e){f?.reject(e)}})
 const rpc=(req,timeoutMs=120000)=>new Promise((resolve,reject)=>{
  if(pending)return reject(Error('RPC overlap'))
  const timer=setTimeout(()=>{pending=undefined;reject(Error('RPC timeout '+req.op))},timeoutMs)
  pending={resolve(v){clearTimeout(timer);v.ok?resolve(v.data):reject(Error(v.error))},reject(e){clearTimeout(timer);reject(e)}}
  child.stdin.write(JSON.stringify(req)+'\n')
 })
 const rows=[]
 let s
 try{
  s=await rpc({op:'open',preset})
  const fabric=s.template.fabrics[0].id
  if(preset==='rectangle'){
   // Baseline tshirt is retained to exercise realistic surrounding seams; delete
   // it from this case by creating its independent rectangle in same template.
   s=await rpc({op:'edit',revision:s.revision,command:{kind:'Primitive',shape:'rectangle',size:[.2,.16],origin:[0,0],fabric}})
  }
  const candidates=preset==='rectangle'?[s.template.panels.at(-1)]:s.template.panels.filter(p=>/front|back/i.test(p.id+' '+p.name))
  if(!candidates.length)throw Error('Missing garment front/back panel')
  const sewn=new Set(s.template.seams.flatMap(e=>[e.a,e.b].map(r=>r.panel+':'+r.edge)))
  const edits=[]
  for(const panel of candidates){
   const polygon=panel.polygon
   if(!polygon)continue
   let index=polygon.edges.findIndex((edge,i)=>{
    const a=polygon.points[i],b=polygon.points[(i+1)%polygon.points.length]
    return !sewn.has(panel.id+':'+edge)&&Math.hypot(a[0]-b[0],a[1]-b[1])>=.18
   })
   if(index<0)index=polygon.edges.findIndex((edge,i)=>{
    const a=polygon.points[i],b=polygon.points[(i+1)%polygon.points.length]
    return !sewn.has(panel.id+':'+edge)&&Math.hypot(a[0]-b[0],a[1]-b[1])>=.1
   })
   if(index<0){edits.push({panel:panel.id,skipped:'no suitable unsewn straight boundary'});continue}
   const a=polygon.points[index],b=polygon.points[(index+1)%polygon.points.length],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)
   const intake=Math.min(.03,len*.3),mid=[(a[0]+b[0])/2,(a[1]+b[1])/2],apex=[mid[0]-dy/len*.08,mid[1]+dx/len*.08]
   const cmd={kind:'DartCutSew',panel:panel.id,edge:polygon.edges[index],left_t:.5-intake/(2*len),right_t:.5+intake/(2*len),apex}
   try{s=await rpc({op:'edit',revision:s.revision,command:cmd});edits.push({panel:panel.id,edge:cmd.edge,intakeMm:intake*1000,depthMm:80})}
   catch(e){edits.push({panel:panel.id,error:String(e)})}
  }
  if(!edits.some(e=>e.edge))throw Error('Could not produce compiled dart: '+JSON.stringify(edits))
  const dartIds=s.template.seams.filter(e=>e.id.startsWith('dart_')).map(e=>e.id)
  const sample=step=>{
   const dart=s.seams.filter(seam=>dartIds.includes(seam.id))
   rows.push({steps:step,dartGapMm:dart.map(d=>({id:d.id,gapMm:d.gap_m*1000})),worstDartGapMm:Math.max(...dart.map(d=>d.gap_m*1000)),globalGapMm:Math.max(...s.seams.map(d=>d.gap_m*1000)),contactCount:s.metrics?.contacts??null,minimumDistanceMm:s.metrics?.minimum_distance_m!=null?s.metrics.minimum_distance_m*1000:null,penetrationCertified:false,stepMs:s.metrics?.step_ms??null})
  }
  sample(0)
  let capped=false
  for(const stop of checkpoints.slice(1)){
   if(capped){rows.push({steps:stop,skipped:'Measured native solver >250ms/step at step 50; capped expensive run'});continue}
   while((s.time||0)*60<stop-0.1){const count=Math.min(4,stop-Math.round((s.time||0)*60));s=await rpc({op:'step',revision:s.revision,steps:count})}
   sample(stop)
   if((stop>=50&&rows.at(-1).stepMs>250)||(stop>=10&&rows.at(-1).stepMs>2000))capped=true
   process.stdout.write(JSON.stringify({preset,mode,point:rows.at(-1)})+'\n')
  }
  return {preset,mode,pass:true,edits,rows,temporaryDirectory:temp}
 }catch(e){return{preset,mode,pass:false,error:String(e),stderr,edits:typeof edits==='undefined'?undefined:edits,rows,temporaryDirectory:temp}}
 finally{child.stdin.end();child.kill('SIGTERM')}
}
for(const preset of (process.argv[2]?[process.argv[2]]:['rectangle','tshirt'])){
 const result=await trial(preset)
 outputs.push(result)
 process.stdout.write(JSON.stringify({result})+'\n')
}
process.stdout.write(JSON.stringify({summary:outputs})+'\n')
if(outputs.some(x=>!x.pass))process.exitCode=1
