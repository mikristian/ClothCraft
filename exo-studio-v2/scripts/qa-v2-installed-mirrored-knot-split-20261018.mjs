// Installed UI regression: a linked free-knot pair promotes atomically to vertices.
// All native operations run against a disposable bridge workspace.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import net from 'node:net'
import {chromium} from 'playwright-core'

const root=process.cwd()
const output=fs.mkdtempSync(path.join(os.tmpdir(),'exo-mirror-split-'))
const qaPort=await new Promise((resolve,reject)=>{
  const socket=net.createServer()
  socket.once('error',reject)
  socket.listen(0,'127.0.0.1',()=>{
    const port=socket.address().port
    socket.close(()=>resolve(port))
  })
})
const qaUrl=`http://127.0.0.1:${qaPort}`
const child=spawn(process.execPath,['integrations/clothcraft/server.mjs'],{
  cwd:root,env:{...process.env,EXO_CLOTHCRAFT_PORT:String(qaPort),
    EXO_CLOTHCRAFT_OUTPUT_DIR:output,
    EXO_CLOTHCRAFT_SESSION_BIN:path.join(root,'research/oss/clothcraft/target/debug/exo-session')},
  stdio:['ignore','pipe','pipe']
})
let log='',browser
for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>{log=(log+chunk).slice(-4000)})
const wait=async(fn,label)=>{
  for(let i=0;i<55;i++){
    const result=await fn().catch(()=>null)
    if(result)return result
    await new Promise(resolve=>setTimeout(resolve,300))
  }
  throw new Error(`Timeout: ${label}; bridge: ${log}`)
}
const native=async body=>{
  const response=await fetch(qaUrl+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
  const payload=await response.json()
  assert.ok(response.ok&&payload.ok,payload.error||'Native request failed')
  return payload.data
}
const polygon=s=>s.template.panels.find(p=>p.id==='front').polygon
const pointOn=async(page,edge)=>{
  const hit=page.locator(`.cc-board [data-2d-edge-hit="front:${edge}"]`).first()
  await hit.waitFor({state:'attached'})
  return hit.evaluate(el=>{
    const p=el.points.getItem(Math.floor(el.points.numberOfItems/2)),m=el.getScreenCTM()
    return {x:p.x*m.a+p.y*m.c+m.e,y:p.x*m.b+p.y*m.d+m.f}
  })
}
try{
  await wait(async()=>{if(child.exitCode!==null)throw Error(log);return (await fetch(qaUrl+'/health')).ok},'bridge startup')
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
  const page=await browser.newPage({viewport:{width:1510,height:960}})
  const errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  let patched=false
  await page.route(/\/assets\/index-[^/]+\.js(?:\?.*)?$/,async route=>{
    const response=await route.fetch(),source=await response.text()
    if(source.includes('http://127.0.0.1:5385'))patched=true
    await route.fulfill({response,body:source.replaceAll('http://127.0.0.1:5385',qaUrl)})
  })
  const openUi=async()=>{
    await page.goto('http://127.0.0.1:5386/?desktop=1&engine=clothcraft&testSession=mirror-split-isolated',
      {waitUntil:'domcontentloaded',timeout:60000})
    await page.locator('.cc-board [data-panel]').first().waitFor({state:'visible',timeout:45000})
  }
  await openUi()
  assert.ok(patched,'Installed bundle did not route to QA bridge')
  const saved=await native({op:'save'})
  assert.ok(saved.project?.template?.panels?.length)
  await native({op:'open',project:{...saved.project,
    template:{...saved.project.template,seams:[]},state:null,mesh_signature:null}})
  await openUi()
  const toolbar=page.getByRole('toolbar',{name:'2D viewport quick tools'})
  await toolbar.getByRole('button',{name:'Edit Curve Point',exact:true}).click()
  await page.getByRole('checkbox',{name:'Link mirrored points on symmetric edges'}).check()
  const pos=await pointOn(page,'side-right')
  await page.locator('.cc-board [data-2d-edge-hit="front:side-right"]').first()
    .dispatchEvent('click',{clientX:pos.x,clientY:pos.y})
  const before=await wait(async()=>{
    const snapshot=await native({op:'snapshot'}),p=polygon(snapshot)
    return p.free_curve_points?.['side-right']?.length===1&&p.free_curve_points?.['side-left']?.length===1?snapshot:null
  },'linked knot insertion')
  const old=polygon(before),right=old.free_curve_points['side-right'][0],left=old.free_curve_points['side-left'][0]
  assert.ok(right.mirror_group&&right.mirror_group===left.mirror_group)
  const oldEdges=[...old.edges]
  await toolbar.getByRole('button',{name:'Edit Pattern Points',exact:true}).hover()
  await toolbar.getByRole('button',{name:'Add / Split Point',exact:true}).click()
  const marker=page.locator(`[data-free-curve-split-candidate="true"][data-free-curve-point="front:side-right:${right.id}"]`)
  await marker.waitFor({state:'visible'})
  const box=await marker.boundingBox()
  assert.ok(box)
  await page.mouse.click(box.x+box.width/2,box.y+box.height/2)
  const after=await wait(async()=>{
    const snapshot=await native({op:'snapshot'}),p=polygon(snapshot)
    return p.edges.length===oldEdges.length+2?snapshot:null
  },'atomic mirrored split')
  const p=polygon(after)
  assert.equal(p.edges.length,oldEdges.length+2,'Both mirrored edges must split in one edit')
  assert.equal(p.vertex_ids?.['side-right_2'],right.id,'Right knot ID becomes stable vertex ID')
  assert.equal(p.vertex_ids?.['side-left_2'],left.id,'Left knot ID becomes stable vertex ID')
  assert.ok(!Object.values(p.free_curve_points||{}).flat().some(mark=>mark.id===right.id||mark.id===left.id),
    'Promoted knots must no longer remain free controls')
  const groups=p.vertex_mirror_groups
  assert.ok(groups,'Native polygon must preserve promoted vertex mirror groups')
  assert.equal(groups['side-right_2'],right.mirror_group,
    'Right successor edge must retain the promoted mirror group')
  assert.equal(groups['side-left_2'],right.mirror_group,
    'Left successor edge must retain the same promoted mirror group')
  await page.keyboard.press('Meta+z')
  const undo=await wait(async()=>{
    const snapshot=await native({op:'snapshot'}),q=polygon(snapshot)
    return q.edges.length===oldEdges.length&&q.free_curve_points?.['side-right']?.[0]?.id===right.id
      &&q.free_curve_points?.['side-left']?.[0]?.id===left.id?snapshot:null
  },'single undo restores both knots')
  assert.equal(polygon(undo).free_curve_points['side-right'][0].mirror_group,right.mirror_group)
  await page.keyboard.press('Meta+Shift+z')
  await wait(async()=>{
    const snapshot=await native({op:'snapshot'}),q=polygon(snapshot)
    return q.edges.length===oldEdges.length+2&&q.vertex_ids?.['side-right_2']===right.id
      &&q.vertex_ids?.['side-left_2']===left.id?snapshot:null
  },'single redo restores both split vertices')
  assert.deepEqual(errors,[],'No browser errors')
  console.log(JSON.stringify({pass:true,isolated:true,atomicMirroredSplit:true,
    stableVertexIds:[right.id,left.id],mirrorGroup:right.mirror_group,undoRedo:true,pageErrors:0}))
}finally{
  if(browser)await browser.close()
  child.kill('SIGTERM')
  await new Promise(resolve=>{if(child.exitCode!==null)resolve();else{child.once('exit',resolve);setTimeout(resolve,2000).unref()}})
  fs.rmSync(output,{recursive:true,force:true})
}
