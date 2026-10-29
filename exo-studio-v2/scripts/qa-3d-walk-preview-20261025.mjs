/** Isolated UI integration. All 3D animation changes are visual-only. */
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync} from 'node:fs'
import {tmpdir,homedir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const isolatedApi='http://127.0.0.1:5445'
const installed=process.argv.includes('--installed')
const ui=installed?'http://127.0.0.1:5386':'http://127.0.0.1:5285'
const output=mkdtempSync(path.join(tmpdir(),'exo-walk-preview-'))
const processes=[]
const start=(cmd,args,env={})=>{
  const processHandle=spawn(cmd,args,{cwd:root,detached:true,stdio:'ignore',env:{...process.env,...env}})
  processes.push(processHandle)
}
const untilReady=async url=>{
  for(let i=0;i<120;i++){
    try{if((await fetch(url,{signal:AbortSignal.timeout(900)})).ok)return}catch{}
    if(processes.some(p=>p.exitCode!==null))throw Error('Isolated test service failed')
    await new Promise(resolve=>setTimeout(resolve,250))
  }
  throw Error('Not ready: '+url)
}
let browser
try{
  start(process.execPath,['integrations/clothcraft/server.mjs'],{
    EXO_CLOTHCRAFT_PORT:'5445',EXO_CLOTHCRAFT_OUTPUT_DIR:output,EXO_CLOTHCRAFT_GPU:'0',
    EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
    EXO_CLOTHCRAFT_SESSION_BIN:path.join(root,'research/oss/clothcraft/target/debug/exo-session'),
    EXO_CLOTHCRAFT_AVATAR_THOMAS_OBJ:path.join(homedir(),
      'Applications/EXO ClothCraft Studio V2.app/Contents/Resources/collision-avatars/thomas-body.obj'),
  })
  if(!installed)start(path.join(root,'node_modules/.bin/vite'),['--host','127.0.0.1','--port','5285','--strictPort'],{
    VITE_CLOTHCRAFT_BRIDGE_URL:isolatedApi,
  })
  await Promise.all([untilReady(isolatedApi+'/health'),untilReady(ui)])
  const opened=await (await fetch(isolatedApi+'/workspace',{method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({op:'open',preset:'tshirt',avatar:true})})).json()
  assert.ok(opened.ok&&opened.data?.avatar?.positions?.length,
    'An isolated native T-shirt avatar is required for a real walking preview')
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
  const page=await browser.newPage({viewport:{width:1500,height:950}})
  const errors=[]
  page.on('pageerror',error=>{errors.push(error.message);console.log('PAGE_ERROR_STACK',String(error.stack).slice(0,1800))})
  page.on('requestfailed',request=>{if(request.url().includes('/workspace'))console.log('workspace request failed',request.failure()?.errorText)})
  // Route the UI's native session to an isolated fixture with explicit CORS
  // so neither installed port 5385 nor its real garment is ever mutated.
  await page.route('**/workspace',async route=>{
    try{
      const headers={...route.request().headers()}
      delete headers.origin
      const response=await route.fetch({url:isolatedApi+'/workspace',headers})
      await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':'*'}})
    }catch(error){console.log('workspace route error',String(error.message).slice(0,220));await route.abort().catch(()=>{})}
  })
  await page.goto(ui+'/?desktop=1&engine=clothcraft&testSession=animation20261025',
    {waitUntil:'domcontentloaded'})
  const canvas=page.locator('.cc-viewport-3d canvas')
  await canvas.waitFor({state:'visible',timeout:40000})
  try{
    await page.waitForFunction(()=>document.querySelector('.cc-viewport-3d canvas')?.dataset.avatarVisible==='true',null,{timeout:40000})
  }catch(error){
    console.log('Avatar render diagnostic',await page.evaluate(()=>({
      canvas:document.querySelector('.cc-viewport-3d canvas')?.dataset.avatarVisible,
      panels:document.querySelector('.cc-viewport-3d canvas')?.dataset.native3dPanelMeshCount,
      message:document.body.innerText.slice(-700)
    })),errors)
    throw error
  }
  await page.getByRole('combobox',{name:'Workspace',exact:true}).selectOption('Render')
  await page.locator('label.select-field').filter({hasText:'Stage preset'}).locator('select').selectOption('EXO01')
  await page.waitForFunction(()=>{
    const canvas=document.querySelector('.cc-viewport-3d canvas')
    return canvas?.dataset.stageId==='EXO01'&&canvas.dataset.stageStatus==='ready'
  },null,{timeout:30000})
  assert.equal(await page.locator('.cc-v2-orientation .cc-walk-trigger').count(),0,
    'Animate must not appear in the 3D glass orientation toolbar')
  await page.getByRole('button',{name:'Simulation and animation modes'}).click()
  await page.getByRole('menuitem',{name:/Animation Workspace/}).click()
  await page.locator('.cc-embedded-root.cc-animation-workspace-active').waitFor({state:'attached'})
  assert.equal(await page.locator('.workspaces').getAttribute('data-viewport-layout'),'3d')
  assert.equal(await page.locator('.cc-viewport-2d').isVisible(),false)
  assert.equal(await canvas.getAttribute('data-animation-camera-framed'),'true',
    'Animation Workspace failed to frame the runway avatar on entry')
  await page.getByRole('region',{name:'Animation timeline'}).waitFor({state:'visible'})
  const resizeHandle=page.getByRole('separator',{name:'Resize Animation Editor timeline'})
  const timelineView=page.getByRole('region',{name:'Animation timeline'})
  const compactBounds=await timelineView.boundingBox()
  assert.ok(compactBounds.height>=195&&compactBounds.height<=212,
    'Animation timeline should open as a short ~205px strip')
  const handleBox=await resizeHandle.boundingBox()
  await page.mouse.move(handleBox.x+handleBox.width*.5,handleBox.y+handleBox.height*.5)
  await page.mouse.down()
  await page.mouse.move(handleBox.x+handleBox.width*.5,handleBox.y+handleBox.height*.5-105,{steps:5})
  await page.mouse.up()
  const enlargedBounds=await timelineView.boundingBox()
  assert.ok(enlargedBounds.height>=compactBounds.height+90,
    'Animation timeline cannot be expanded by dragging its top edge')
  await resizeHandle.dblclick()
  const resetBounds=await timelineView.boundingBox()
  assert.ok(Math.abs(resetBounds.height-205)<4,'Timeline double-click did not restore compact height')
  const canvasBox=await canvas.boundingBox()
  const viewportBox=await page.locator('.cc-viewport-3d').boundingBox()
  assert.ok(canvasBox.width>=viewportBox.width-4 && canvasBox.height<viewportBox.height-192,
    'Animation editor must have a full-width 3D viewport and a bottom timeline')
  assert.equal(await page.locator('.cc-walk-panel').count(),0,
    'Animation Studio must not have an additional embedded side panel')
  const timeline=page.getByRole('region',{name:'Animation timeline'})
  assert.equal(await timeline.locator('.cc-animation-track-lane').count(),3,
    'CLO-style editor needs dedicated motion, position and heading tracks')
  const slider=page.getByRole('slider',{name:'Walk timeline'})
  const seekFraction=async t=>slider.fill(String(Math.round(Number(await slider.getAttribute('max'))*t)))
  const presets=page.getByRole('combobox',{name:'Walk preset'})
  for(const value of ['runway','casual','power','editorial'])await presets.selectOption(value)
  await presets.selectOption('runway')
  await page.getByRole('spinbutton',{name:'Walk travel distance'}).fill('2.4')
  await page.getByRole('spinbutton',{name:'Walk speed'}).fill('1')
  await seekFraction(.5)
  await page.waitForFunction(()=>{
    const canvas=document.querySelector('.cc-viewport-3d canvas')
    return canvas?.dataset.walkPreview==='visual-only' && Number(canvas.dataset.walkPositionZ)>1
  },{timeout:12000})
  const position=Number(await canvas.getAttribute('data-walk-position-z'))
  assert.ok(Math.abs(position-1.2)<.04,'Walk preview did not move the avatar 1.2 metres')
  const sequences=page.getByRole('combobox',{name:'Walk motion sequence'})
  for(const sequence of ['catwalk','runway-turn-pose','straight'])await sequences.selectOption(sequence)
  await sequences.selectOption('runway-return')
  assert.equal(await timeline.locator('.cc-animation-track-lane.cc-animation-track-motion .cc-animation-motion-clip').count(),4)
  await seekFraction(.48)
  await page.waitForFunction(()=>{
    const canvas=document.querySelector('.cc-viewport-3d canvas')
    return canvas?.dataset.walkSequence==='runway-return' &&
      Number(canvas.dataset.walkPositionZ)>2.32 &&
      Number(canvas.dataset.walkYawDegrees)>35&&Number(canvas.dataset.walkYawDegrees)<145
  })
  await seekFraction(.75)
  await page.waitForFunction(()=>{
    const canvas=document.querySelector('.cc-viewport-3d canvas')
    return Number(canvas?.dataset.walkPositionZ)<1.3 &&
      Math.abs(Number(canvas?.dataset.walkYawDegrees)-180)<2
  })
  await seekFraction(.97)
  await page.waitForFunction(()=>Number(document.querySelector('.cc-viewport-3d canvas')?.dataset.walkPositionZ)<.02)
  const turnKey=page.getByRole('button',{name:'Select heading keyframe Turn 180°'})
  await turnKey.click()
  const oldFrame=Number(await page.getByRole('spinbutton',{name:'Selected keyframe frame'}).inputValue())
  await page.getByRole('spinbutton',{name:'Selected keyframe frame'}).fill(String(oldFrame+3))
  assert.equal(Number(await page.getByRole('spinbutton',{name:'Selected keyframe frame'}).inputValue()),oldFrame+3,
    'Keyframe retiming should change the editable frame and the timeline')
  await seekFraction(.65)
  const beforeAdd=Number(await timeline.locator('.cc-animation-tracks').getAttribute('data-animation-tracks'))
  await page.getByRole('button',{name:'Add animation keyframe'}).click()
  assert.equal(Number(await timeline.locator('.cc-animation-tracks').getAttribute('data-animation-tracks')),beforeAdd+1)
  await page.getByRole('button',{name:'Remove selected animation keyframe'}).click()
  assert.equal(Number(await timeline.locator('.cc-animation-tracks').getAttribute('data-animation-tracks')),beforeAdd)
  await page.getByRole('button',{name:'Restore motion preset keyframes'}).click()
  await sequences.selectOption('straight')
  await page.getByRole('button',{name:'Reset walk animation'}).click()
  await page.waitForFunction(()=>document.querySelector('.cc-viewport-3d canvas')?.dataset.walkPreview==='idle')
  assert.equal(Number(await canvas.getAttribute('data-walk-position-z')),0)
  await page.getByRole('button',{name:'Play walk animation'}).click()
  await page.waitForFunction(()=>Number(document.querySelector('.cc-viewport-3d canvas')?.dataset.walkPositionZ)>0.04)
  await page.getByRole('button',{name:'Pause walk animation'}).click()
  await page.getByRole('button',{name:'Reset walk animation'}).click()
  // Repeat the same clip on the other native selectable collision avatar:
  // no per-model animation track or rig is baked into the selected body.
  await page.getByRole('button',{name:'Browse avatars'}).click()
  const thomas=page.locator('.asset-template.garment-tile').filter({hasText:'CLO Thomas'}).first()
  await thomas.waitFor({state:'visible',timeout:15000})
  await thomas.click()
  await page.waitForFunction(()=>document.querySelector('.cc-viewport-3d canvas')?.dataset.avatarVisible==='true',null,{timeout:30000})
  const switched=await (await fetch(isolatedApi+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({op:'snapshot',avatar:true})})).json()
  assert.equal(switched.data?.avatarModel,'clo-thomas')
  assert.ok(switched.data.avatar.positions.length>25000,'CLO Thomas did not load the full body')
  // Switching a complete native CLO garment currently resets the render
  // stage selection. Stage EXO01 was already tested with the previous
  // avatar; all following model switching checks concern retargeted gait.
  await seekFraction(.25)
  await page.waitForFunction(()=>Number(document.querySelector('.cc-viewport-3d canvas')?.dataset.walkPositionZ)>.4)
  await page.getByRole('button',{name:'Reset walk animation'}).click()
  const models=page.getByRole('combobox',{name:'Walk avatar model'})
  for(const model of ['theo','nora','thomas-preview']){
    await models.selectOption(model)
    await page.waitForFunction(name=>document.querySelector('.cc-viewport-3d canvas')?.dataset.walkAvatarLoaded===name,model,{timeout:18000})
    await seekFraction(.35)
    await page.waitForFunction(name=>{
      const canvas=document.querySelector('.cc-viewport-3d canvas')
      return canvas?.dataset.walkAvatarSource===name && Number(canvas.dataset.walkPositionZ)>.65
    },model)
    if(model!=='thomas-preview'){
      assert.ok(Number(await canvas.getAttribute('data-walk-rig-bones'))>=6,
        'The '+model+' rig did not load leg/arm joints')
      assert.ok(Number(await canvas.getAttribute('data-walk-rig-motion'))>.08,
        'The '+model+' rig did not swing its actual bones')
    }
    if(model==='theo')await page.locator('.cc-viewport-3d').screenshot({
      path:path.join(output,'theo-exo01-walk-preview.png'),animations:'disabled'})
    await page.getByRole('button',{name:'Reset walk animation'}).click()
  }
  await models.selectOption('native')
  await page.getByRole('button',{name:'Simulation and animation modes'}).click()
  await page.getByRole('menuitem',{name:/Return to previous workspace/}).click()
  await page.locator('.cc-embedded-root.cc-animation-workspace-active').waitFor({state:'detached'})
  assert.equal(await page.locator('.workspaces').getAttribute('data-viewport-layout'),'split',
    'Leaving animation workspace did not restore the 2D and 3D split')
  assert.equal(await page.locator('.cc-viewport-2d').isVisible(),true)
  assert.equal(await page.getByRole('region',{name:'Animation timeline'}).count(),0)
  const nativeHealth=await (await fetch(isolatedApi+'/health')).json()
  assert.equal(nativeHealth.ok,true)
  assert.deepEqual(errors,[])
  console.log(JSON.stringify({pass:true,installed,stage:'EXO01',animationAccess:'bottom-left simulate dropdown',
    workspace:'full width 3D + compact resizable keyframe timeline',timelineCompactHeight:resetBounds.height,
    timelineResizable:true,sequences:4,runwayTurnAndReturn:true,
    editableKeyframeRetiming:true,addDeleteKeyframe:true,noSidebar:true,restoredSplit:true,glassBarAnimateRemoved:true,
    presets:4,avatarModels:['makehuman-base','clo-thomas','theo','nora','thomas-preview'],seekMetres:position,resetRestored:true,
    playbackAdvanced:true,nativeWorkspaceIsolated:true,pageErrors:0,output}))
}finally{
  await browser?.close().catch(()=>{})
  for(const proc of processes)try{process.kill(-proc.pid,'SIGTERM')}catch{}
}
