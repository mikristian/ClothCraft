// Isolated browser + live Rust regression against the installed V2 web UI.
// The app UI asset is served from :5386 with only its bridge URL routed to
// an ephemeral QA workspace on a free loopback port. User data is untouched.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import net from 'node:net'
import {chromium} from 'playwright-core'

const root=process.cwd()
const output=fs.mkdtempSync(path.join(os.tmpdir(),'exo-free-curve-v2-'))
const qaPort=await new Promise((resolve,reject)=>{
  const listener=net.createServer()
  listener.once('error',reject)
  listener.listen(0,'127.0.0.1',()=>{
    const port=listener.address().port
    listener.close(()=>resolve(port))
  })
})
const qaUrl=`http://127.0.0.1:${qaPort}`
const binary=path.join(root,'research/oss/clothcraft/target/debug/exo-session')
const child=spawn(process.execPath,['integrations/clothcraft/server.mjs'],{
  cwd:root,env:{...process.env,EXO_CLOTHCRAFT_PORT:String(qaPort),
    EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_SESSION_BIN:binary},
  stdio:['ignore','pipe','pipe']
})
let serverLog=''
child.stdout.on('data',chunk=>{serverLog=(serverLog+chunk).slice(-4000)})
child.stderr.on('data',chunk=>{serverLog=(serverLog+chunk).slice(-4000)})
let browser
const native=async body=>{
  const res=await fetch(qaUrl+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
  const result=await res.json()
  assert.ok(res.ok&&result.ok,result.error||'QA native request failed')
  return result.data
}
const waitUntil=async fn=>{
  for(let i=0;i<45;i++){
    const result=await fn().catch(()=>null)
    if(result)return result
    await new Promise(resolve=>setTimeout(resolve,350))
  }
  throw new Error('QA timed out waiting for native update: '+serverLog.slice(-500))
}
const getMark=s=>s?.template?.panels?.find(p=>p.id==='front')?.polygon?.free_curve_points?.hem?.[0]
const getLength=s=>{
  const panel=s?.panels?.find(p=>p.id==='front')
  const indices=panel?.boundaries?.hem||[]
  if(indices.length<2)return null
  return indices.slice(1).reduce((total,id,i)=>{
    const a=s.uv[indices[i]],b=s.uv[id]
    return total+Math.hypot(a[0]-b[0],a[1]-b[1])
  },0)
}
try{
  await waitUntil(async()=>{
    if(child.exitCode!==null || child.signalCode!==null)throw new Error('QA bridge exited: '+serverLog)
    const res=await fetch(qaUrl+'/health');return res.ok
  })
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
  const page=await browser.newPage({viewport:{width:1510,height:960}})
  const errors=[]
  page.on('pageerror',error=>errors.push(error.message))
  page.on('response',async response=>{
    if(response.url().includes('/workspace')&&response.status()>=400){
      const detail=await response.json().catch(()=>null)
      console.log('native-edit-rejection',JSON.stringify({code:response.status(),error:detail?.error}))
    }
  })
  let patched=false
  await page.route(/\/assets\/index-[^/]+\.js(?:\?.*)?$/,async route=>{
    const response=await route.fetch()
    const source=await response.text()
    if(!source.includes('http://127.0.0.1:5385'))
      return route.fulfill({response,body:source})
    patched=true
    await route.fulfill({response,body:source.replaceAll('http://127.0.0.1:5385',qaUrl)})
  })
  await page.goto('http://127.0.0.1:5386/?desktop=1&engine=clothcraft&testSession=free-curve-isolated',
    {waitUntil:'domcontentloaded',timeout:60000})
  await page.locator('.cc-board [data-panel]').first().waitFor({state:'visible',timeout:45000}).catch(async error=>{
    console.log('fresh-bundle-diagnostic',JSON.stringify({
      errors,url:page.url(),title:await page.title(),
      visibleText:(await page.locator('body').innerText()).slice(0,800),patched
    }))
    throw error
  })
  assert.ok(patched,'Browser bundle did not route to isolated native service')
  const initial=await native({op:'snapshot'})
  assert.ok(!getMark(initial),'fresh sandbox must not have a free point')
  await page.getByRole('toolbar',{name:'2D viewport quick tools'})
    .getByRole('button',{name:'Edit Curve Point',exact:true}).click()
  const hit=page.locator('.cc-board [data-2d-edge-hit="front:hem"]').first()
  // A transparent SVG hit polyline is intentionally not visually painted.
  // The material contour under it is visible; the hit region must be attached.
  await hit.waitFor({state:'attached'})
  const position=await hit.evaluate(el=>{
    const items=el.points
    const p=items.getItem(Math.floor(items.numberOfItems/2))
    const m=el.getScreenCTM()
    return {x:p.x*m.a+p.y*m.c+m.e,y:p.x*m.b+p.y*m.d+m.f}
  })
  await hit.dispatchEvent('click',{clientX:position.x,clientY:position.y})
  const inserted=await waitUntil(async()=>{
    const data=await native({op:'snapshot'})
    return getMark(data)?data:null
  })
  const before=getMark(inserted)
  assert.equal(before.id,'free_1')
  assert.equal(inserted.template.panels.find(p=>p.id==='front').polygon.edges.length,
    initial.template.panels.find(p=>p.id==='front').polygon.edges.length)
  const baselineLength=getLength(inserted)
  const marker=page.locator('[data-free-curve-point="front:hem:free_1"]')
  await marker.waitFor({state:'visible'})
  const bounds=await marker.boundingBox()
  assert.ok(bounds)
  const x=bounds.x+bounds.width/2,y=bounds.y+bounds.height/2
  await page.mouse.move(x,y)
  await page.mouse.down()
  await page.mouse.move(x,y+13,{steps:8})
  const preview=await page.locator('[data-native-free-curve-preview="front:hem"]').count()
  await page.mouse.up()
  const bent=await waitUntil(async()=>{
    const data=await native({op:'snapshot'})
    return Math.abs((getMark(data)?.position?.[1]||0)-before.position[1])>.002?data:null
  })
  const newLength=getLength(bent)
  assert.ok(newLength>baselineLength+.00005,'Dragging a free point must change the physical cutline arc length')
  await page.keyboard.press('Meta+z')
  const undone=await waitUntil(async()=>{
    const data=await native({op:'snapshot'})
    return getMark(data)&&Math.abs(getMark(data).position[1]-before.position[1])<1e-9?data:null
  })
  assert.ok(Math.abs(getLength(undone)-baselineLength)<1e-7)
  await page.keyboard.press('Meta+Shift+z')
  const redone=await waitUntil(async()=>{
    const data=await native({op:'snapshot'})
    return getMark(data)&&Math.abs(getMark(data).position[1]-getMark(bent).position[1])<1e-9?data:null
  })
  assert.ok(Math.abs(getLength(redone)-newLength)<1e-7)
  // The default T-shirt's side edges are sewn. A mirrored edit to only the
  // front would break sewing-length constraints, which Rust correctly rejects.
  // Reopen an unsown copy inside this isolated QA workspace for the symmetry
  // gesture without weakening real garment validation.
  const saved=await native({op:'save'})
  assert.ok(saved?.project?.template?.panels?.length,'Native save must return a project')
  const unsown={...saved.project,template:{...saved.project.template,seams:[]},
    state:null,mesh_signature:null}
  await native({op:'open',project:unsown})
  await page.reload({waitUntil:'domcontentloaded'})
  await page.locator('.cc-board [data-panel]').first().waitFor({state:'visible',timeout:45000})
  // A free curve point must survive a real UI boundary split, including the
  // native contour's rest arclength and transactional undo/redo.
  const beforeSplit=await native({op:'snapshot'})
  const beforePoly=beforeSplit.template.panels.find(p=>p.id==='front').polygon
  const unsplitLength=getLength(beforeSplit)
  const quickTools=page.getByRole('toolbar',{name:'2D viewport quick tools'})
  await quickTools.getByRole('button',{name:'Edit Pattern Points',exact:true}).hover()
  await quickTools.getByRole('button',{name:'Add / Split Point',exact:true}).click()
  const splitHit=page.locator('.cc-board [data-2d-edge-hit="front:hem"]').first()
  await splitHit.waitFor({state:'attached'})
  const splitAt=await splitHit.evaluate(el=>{
    const p=el.points.getItem(Math.floor(el.points.numberOfItems*.22)),m=el.getScreenCTM()
    return {x:p.x*m.a+p.y*m.c+m.e,y:p.x*m.b+p.y*m.d+m.f}
  })
  await splitHit.dispatchEvent('click',{clientX:splitAt.x,clientY:splitAt.y})
  const split=await waitUntil(async()=>{
    const data=await native({op:'snapshot'})
    return data.template.panels.find(p=>p.id==='front').polygon.edges.length===beforePoly.edges.length+1?data:null
  })
  const splitPoly=split.template.panels.find(p=>p.id==='front').polygon
  assert.ok(splitPoly.edges.includes('hem_2'),'Split must assign a stable successor edge')
  assert.equal(Object.values(splitPoly.free_curve_points||{}).flat().filter(m=>m.id==='free_1').length,1)
  const splitPanel=split.panels.find(p=>p.id==='front')
  const chainLength=edge=>splitPanel.boundaries[edge].slice(1).reduce((sum,id,i,arr)=>{
    const ids=splitPanel.boundaries[edge],a=split.uv[ids[i]],b=split.uv[id]
    return sum+Math.hypot(a[0]-b[0],a[1]-b[1])
  },0)
  assert.ok(Math.abs(chainLength('hem')+chainLength('hem_2')-unsplitLength)<.0005,
    'Split must retain the physical free curve length within meshing tolerance')
  await page.keyboard.press('Meta+z')
  await waitUntil(async()=>{
    const data=await native({op:'snapshot'})
    return data.template.panels.find(p=>p.id==='front').polygon.edges.length===beforePoly.edges.length?data:null
  })
  await page.keyboard.press('Meta+Shift+z')
  await waitUntil(async()=>{
    const data=await native({op:'snapshot'})
    return data.template.panels.find(p=>p.id==='front').polygon.edges.length===beforePoly.edges.length+1?data:null
  })
  await page.keyboard.press('Meta+z')
  await waitUntil(async()=>{
    const data=await native({op:'snapshot'})
    return data.template.panels.find(p=>p.id==='front').polygon.edges.length===beforePoly.edges.length?data:null
  })
  const knotButton=page.locator('[data-free-curve-split-candidate="true"][data-free-curve-point="front:hem:free_1"]')
  await knotButton.waitFor({state:'visible'})
  const knotBox=await knotButton.boundingBox()
  assert.ok(knotBox,'Direct split marker must remain a visible hit target')
  await page.mouse.click(knotBox.x+knotBox.width/2,knotBox.y+knotBox.height/2)
  const promoted=await waitUntil(async()=>{
    const data=await native({op:'snapshot'})
    return data.template.panels.find(p=>p.id==='front').polygon.vertex_ids?.hem_2==='free_1'?data:null
  })
  const promotedPoly=promoted.template.panels.find(p=>p.id==='front').polygon
  assert.equal(promotedPoly.vertex_ids.hem_2,'free_1')
  assert.ok(!Object.values(promotedPoly.free_curve_points||{}).flat().some(mark=>mark.id==='free_1'),
    'Consumed knot is promoted, not duplicated as an invalid endpoint control')
  await page.keyboard.press('Meta+z')
  await waitUntil(async()=>{
    const data=await native({op:'snapshot'})
    const poly=data.template.panels.find(p=>p.id==='front').polygon
    return poly.edges.length===beforePoly.edges.length&&poly.free_curve_points?.hem?.[0]?.id==='free_1'?data:null
  })
  await page.keyboard.press('Meta+Shift+z')
  await waitUntil(async()=>{
    const data=await native({op:'snapshot'})
    return data.template.panels.find(p=>p.id==='front').polygon.vertex_ids?.hem_2==='free_1'?data:null
  })
  await page.keyboard.press('Meta+z')
  await waitUntil(async()=>{
    const data=await native({op:'snapshot'})
    return data.template.panels.find(p=>p.id==='front').polygon.edges.length===beforePoly.edges.length?data:null
  })
  await page.getByRole('toolbar',{name:'2D viewport quick tools'})
    .getByRole('button',{name:'Edit Curve Point',exact:true}).click()
  // Explicit symmetry is optional and applies only when the same native
  // panel has a geometrically matching partner boundary.
  await page.getByRole('checkbox',{name:'Link mirrored points on symmetric edges'}).check()
  const pairedEdge=page.locator('.cc-board [data-2d-edge-hit="front:side-right"]').first()
  await pairedEdge.waitFor({state:'attached'})
  const mirroredClick=await pairedEdge.evaluate(el=>{
    const p=el.points.getItem(Math.floor(el.points.numberOfItems/2)),m=el.getScreenCTM()
    return {x:p.x*m.a+p.y*m.c+m.e,y:p.x*m.b+p.y*m.d+m.f}
  })
  await pairedEdge.dispatchEvent('click',{clientX:mirroredClick.x,clientY:mirroredClick.y})
  const paired=await waitUntil(async()=>{
    const data=await native({op:'snapshot'})
    const poly=data.template.panels.find(p=>p.id==='front').polygon
    return poly.free_curve_points?.['side-left']?.length&&poly.free_curve_points?.['side-right']?.length?data:null
  })
  const pairPoly=paired.template.panels.find(p=>p.id==='front').polygon
  const right=pairPoly.free_curve_points['side-right'][0],left=pairPoly.free_curve_points['side-left'][0]
  assert.ok(right.mirror_group&&right.mirror_group===left.mirror_group)
  const rightHandle=page.locator(`[data-free-curve-point="front:side-right:${right.id}"]`)
  await rightHandle.waitFor({state:'visible'})
  const rect=await rightHandle.boundingBox()
  const rx=rect.x+rect.width/2,ry=rect.y+rect.height/2
  await page.mouse.move(rx,ry)
  await page.mouse.down()
  await page.mouse.move(rx+9,ry,{steps:8})
  assert.ok((await page.locator('[data-native-free-curve-preview] [data-preview-curve-edge]').count())>=2,
    'Mirrored drag should preview the two linked edges')
  await page.mouse.up()
  const reflected=await waitUntil(async()=>{
    const data=await native({op:'snapshot'})
    const now=data.template.panels.find(p=>p.id==='front').polygon.free_curve_points['side-right'][0]
    return Math.abs(now.position[0]-right.position[0])>.002?data:null
  })
  const reflectedPoly=reflected.template.panels.find(p=>p.id==='front').polygon
  const newRight=reflectedPoly.free_curve_points['side-right'][0]
  const newLeft=reflectedPoly.free_curve_points['side-left'][0]
  assert.ok(Math.abs((newRight.position[0]-right.position[0])+(newLeft.position[0]-left.position[0]))<1e-8)
  assert.ok(Math.abs((newRight.position[1]-right.position[1])-(newLeft.position[1]-left.position[1]))<1e-8)
  // Refocus the actual drafting canvas after releasing a free-point drag.
  // The embedded V2 UI does not contain the old legacy toolbar Undo button.
  await page.locator('.cc-board').click({position:{x:7,y:7}})
  await page.keyboard.press('Meta+z')
  const pairedUndo=await waitUntil(async()=>{
    const data=await native({op:'snapshot'})
    const now=data.template.panels.find(p=>p.id==='front').polygon.free_curve_points?.['side-right']?.[0]
    return now&&Math.abs(now.position[0]-right.position[0])<1e-8?data:null
  })
  assert.equal(pairedUndo.template.panels.find(p=>p.id==='front').polygon.free_curve_points['side-left'][0].mirror_group,left.mirror_group)
  // The split tool exposes the two linked knot locations as one visible pair.
  // Clicking either member must promote both positions in one native edit.
  await page.getByRole('toolbar',{name:'2D viewport quick tools'})
    .getByRole('button',{name:'Edit Pattern Points',exact:true}).hover()
  await page.getByRole('toolbar',{name:'2D viewport quick tools'})
    .getByRole('button',{name:'Add / Split Point',exact:true}).click()
  const initialPairPoly=pairedUndo.template.panels.find(p=>p.id==='front').polygon
  const pairMarkIds=new Set([right.id,left.id])
  const pairLine=page.locator(`[data-mirrored-split-pair="${right.mirror_group}"]`)
  await pairLine.waitFor({state:'attached',timeout:5000}).catch(async error=>{
    console.log('mirror-pair-diagnostic',JSON.stringify({
      guide:await page.locator('[data-mirrored-split-guide]').count(),
      splitCandidates:await page.locator('[data-free-curve-split-candidate]').count(),
      mirroredPairLines:await page.locator('[data-mirrored-split-pair]').count(),
      activeTools:(await page.locator('[aria-pressed="true"]').allTextContents()).slice(0,15),
      url:page.url()
    }))
    throw error
  })
  assert.equal(await pairLine.getAttribute('data-mirrored-split-edges'),'side-left|side-right')
  const mirroredKnot=page.locator(`[data-free-curve-split-candidate="true"][data-free-curve-point="front:side-right:${right.id}"]`)
  const partnerKnot=page.locator(`[data-free-curve-point="front:side-left:${left.id}"]`)
  await mirroredKnot.hover()
  assert.equal(await mirroredKnot.getAttribute('data-mirrored-split-highlight'),'true')
  assert.equal(await partnerKnot.getAttribute('data-mirrored-split-highlight'),'true')
  assert.match(await mirroredKnot.getAttribute('aria-label'),/both mirrored boundaries/)
  const pairBounds=await mirroredKnot.boundingBox()
  assert.ok(pairBounds,'Mirrored knot must have a visible click target')
  await page.mouse.click(pairBounds.x+pairBounds.width/2,pairBounds.y+pairBounds.height/2)
  const pairedSplit=await waitUntil(async()=>{
    const data=await native({op:'snapshot'})
    const poly=data.template.panels.find(p=>p.id==='front').polygon
    return poly.edges.length===initialPairPoly.edges.length+2?data:null
  })
  const pairedSplitPoly=pairedSplit.template.panels.find(p=>p.id==='front').polygon
  assert.equal(pairedSplitPoly.edges.length,initialPairPoly.edges.length+2,
    'Atomic mirrored split must add exactly two edges')
  const promotedIds=Object.values(pairedSplitPoly.vertex_ids||{}).filter(id=>pairMarkIds.has(id))
  assert.equal(promotedIds.length,2,'Both linked knot ids must be promoted into vertices')
  assert.deepEqual(new Set(promotedIds),pairMarkIds,'Promoted vertices must preserve both original knot ids')
  assert.ok(!Object.values(pairedSplitPoly.free_curve_points||{}).flat()
    .some(mark=>pairMarkIds.has(mark.id)),'Promoted pair must not survive as free controls')
  await page.keyboard.press('Meta+z')
  const pairSplitUndo=await waitUntil(async()=>{
    const data=await native({op:'snapshot'})
    const poly=data.template.panels.find(p=>p.id==='front').polygon
    const marks=Object.values(poly.free_curve_points||{}).flat()
    return poly.edges.length===initialPairPoly.edges.length&&
      pairMarkIds.size===marks.filter(mark=>pairMarkIds.has(mark.id)).length?data:null
  })
  assert.deepEqual(pairSplitUndo.template.panels.find(p=>p.id==='front').polygon.edges,
    initialPairPoly.edges,'Undo must restore the complete original edge topology')
  await page.keyboard.press('Meta+Shift+z')
  const pairSplitRedo=await waitUntil(async()=>{
    const data=await native({op:'snapshot'})
    const poly=data.template.panels.find(p=>p.id==='front').polygon
    return poly.edges.length===initialPairPoly.edges.length+2?data:null
  })
  assert.deepEqual(pairSplitRedo.template.panels.find(p=>p.id==='front').polygon.vertex_ids,
    pairedSplitPoly.vertex_ids,'Redo must promote the same mirrored vertices')
  await page.screenshot({path:path.join(root,'integrations/clothcraft/output/qa-free-curve-ui-20261018.png')})
  assert.deepEqual(errors,[],'No browser runtime errors')
  console.log(JSON.stringify({pass:true,isolated:true,freePoint:before.id,
    baselineLengthCm:Number((baselineLength*100).toFixed(3)),draggedLengthCm:Number((newLength*100).toFixed(3)),
    previewDisplayed:Boolean(preview),undoRedoVerified:true,
    freeCurveSplitVerified:true,directKnotSplitVerified:true,mirroredPairVerified:true,
    mirroredAtomicSplitVerified:true,mirroredSplitUndoRedoVerified:true,pageErrors:0}))
}finally{
  if(browser)await browser.close()
  child.kill('SIGTERM')
  await new Promise(resolve=>{if(child.exitCode!==null)resolve();else {child.once('exit',resolve);setTimeout(resolve,2000).unref()}})
  fs.rmSync(output,{recursive:true,force:true})
}
