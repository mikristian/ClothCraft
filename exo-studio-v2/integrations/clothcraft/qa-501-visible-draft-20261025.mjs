// Visible, isolated research reconstruction using EXO's live native Polygon
// tool and real browser pointer input. This is not a Levi Strauss factory block.
// Existing dev UI 5174 is shared; native edit requests are redirected to an
// isolated Rust session so the user's current desktop garment is untouched.
import assert from 'node:assert/strict'
import {spawn} from 'node:child_process'
import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {setTimeout as sleep} from 'node:timers/promises'
import {chromium} from 'playwright-core'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const evidence=path.join(root,'docs/goals/evidence/501-reconstruction-20261025')
const temp=mkdtempSync(path.join(tmpdir(),'exo-501-live-native-'))
const ui='http://127.0.0.1:5174',port=5564,native=`http://127.0.0.1:${port}`
const rounds=[]
mkdirSync(path.join(temp,'workspace'),{recursive:true})
mkdirSync(evidence,{recursive:true})

// Explicitly reconstructed pattern contours in metres, viewed as individual
// cut pieces. Widths are deliberate research approximations; the official
// product does not disclose sewing patterns, crotch curvature or pocket blocks.
const front=[[.032,0],[.233,0],[.242,.07],[.254,.185],[.291,.25575],[.265,.280],
  [.238,.365],[.227,.625],[.219,1.06855],[.016,1.06855],[.014,.625],
  [.009,.40],[0,.23],[.014,.087]]
const back=[[.032,.098],[.254,.098],[.270,.18],[.311,.264],[.346,.316],
  [.285,.355],[.259,.420],[.245,.625],[.223,1.129],[.017,1.129],
  [.014,.625],[.008,.410],[0,.27],[.018,.160]]
const shapes=[
  {name:'Front left leg W32 L32',points:front,origin:[-.91,.025],visible:true},
  {name:'Front right leg W32 L32',points:front,origin:[-.595,.025],visible:true},
  {name:'Back left leg W32 L32',points:back,origin:[-.258,.025],visible:true},
  {name:'Back right leg W32 L32',points:back,origin:[.144,.025],visible:true},
  {name:'Back left yoke',points:[[0,0],[.225,0],[.258,.104],[.028,.147]],origin:[-.90,1.235],visible:true},
  {name:'Back right yoke',points:[[0,0],[.225,0],[.258,.104],[.028,.147]],origin:[-.587,1.235],visible:true},
  {name:'Back left patch pocket',points:[[0,0],[.172,0],[.173,.119],[.153,.170],[.086,.190],[.012,.170]],origin:[-.254,1.235],visible:false},
  {name:'Back right patch pocket',points:[[0,0],[.172,0],[.173,.119],[.153,.170],[.086,.190],[.012,.170]],origin:[-.047,1.235],visible:false},
  {name:'Front left pocket facing',points:[[0,0],[.198,0],[.194,.105],[.163,.168],[.070,.185],[0,.148]],origin:[.187,1.235],visible:false},
  {name:'Front right pocket facing',points:[[0,0],[.198,0],[.194,.105],[.163,.168],[.070,.185],[0,.148]],origin:[.432,1.235],visible:false},
  {name:'Front left pocket bag',points:[[0,0],[.195,0],[.196,.205],[.152,.258],[.024,.258],[0,.194]],origin:[-.90,1.49],visible:false},
  {name:'Front right pocket bag',points:[[0,0],[.195,0],[.196,.205],[.152,.258],[.024,.258],[0,.194]],origin:[-.650,1.49],visible:false},
  {name:'Coin pocket',points:[[0,0],[.090,0],[.091,.100],[0,.100]],origin:[-.388,1.49],visible:false},
  {name:'Front waistband',points:[[0,0],[.423,0],[.423,.042],[0,.042]],origin:[-.249,1.58],visible:false},
  {name:'Back waistband',points:[[0,0],[.442,0],[.442,.042],[0,.042]],origin:[.220,1.58],visible:false},
  {name:'Button fly facing',points:[[0,0],[.071,0],[.074,.194],[.045,.250],[0,.252]],origin:[-.388,1.68],visible:false},
  {name:'Button fly shield',points:[[0,0],[.070,0],[.069,.237],[0,.237]],origin:[-.277,1.68],visible:false},
  ...Array.from({length:7},(_,index)=>({name:`Belt loop ${index+1}`,
    points:[[0,0],[.018,0],[.018,.078],[0,.078]],origin:[-.13+index*.060,1.69],visible:false}))
]
const world=shape=>shape.points.map(([x,y])=>[x+shape.origin[0],y+shape.origin[1]])
const writeNotes=()=>writeFileSync(path.join(evidence,'501-fit-source-notes.md'),[
  '# 501 Original Fit-inspired EXO drafting experiment (W32 L32)',
  '',
  'Research reconstruction dated 2026-10-25. This is an independent drafting',
  'exercise, not an original Levi Strauss proprietary production pattern.',
  '',
  'Published Levi\'s size-32 reference (official product pages): front rise',
  '11 1/4 in = 285.75 mm; knee 17 1/2 in = 444.50 mm circumference;',
  'hem opening 16 in = 406.40 mm circumference. Sits at waist, regular thigh,',
  'straight leg, button fly, five-pocket arrangement, rigid 100% cotton denim.',
  '',
  'https://www.levi.com/US/en_US/jeans-by-fit-number/men/jeans/501/501-original-mens-jeans/p/005013793',
  'https://www.levi.com/US/en_US/clothing/men/jeans/straight/501-original-mens-jeans/p/005011484',
  '',
  'Assumed base: W32 L32 (waist designation 812.8 mm, inseam designation',
  '812.8 mm); 30 mm waistband included in front-rise estimate. Drafted front',
  'crotch depth 255.75 mm below front-leg top. Real size-32 waist circumference,',
  'hip ease, fly internals, back rise, yoke and pocket geometry are NOT published',
  'and are patternmaker estimates here. Denim shrinkage, sewing allowance,',
  'pocket bags and assembly sewing lengths require physical verification.',
  '',
  `The draft contains ${shapes.length} separate named pattern pieces. Each`,
  'was created as an editable native Rust polygon. No sewn garment fit, grading,',
  'shrink/wash calibration or production-cut accuracy is certified.',
  ''
].join('\n'))
let server,browser,page
const call=async data=>{
  const res=await fetch(native+'/workspace',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)})
  const json=await res.json()
  assert(json.ok,`${data.op}: ${json.error||'Rust request refused'}`)
  return json.data
}
async function ready(url){for(let i=0;i<70;i++){try{const r=await fetch(url,{signal:AbortSignal.timeout(1400)});if(r.ok)return}catch{}await sleep(200)}throw Error('Native readiness failed: '+url)}
const label=async()=>{const snap=await call({op:'snapshot'});return{revision:snap.revision,panels:snap.template.panels.length}}
try{
  writeNotes()
  await fetch(ui+'/',{signal:AbortSignal.timeout(4000)}).then(r=>assert(r.ok,'Existing dev Vite 5174 unavailable'))
  await fetch(native+'/health',{signal:AbortSignal.timeout(700)}).then(r=>{throw Error('Port 5564 already occupied')}).catch(e=>{if(e.message==='Port 5564 already occupied')throw e})
  server=spawn(process.execPath,['integrations/clothcraft/server.mjs'],{cwd:root,stdio:['ignore','pipe','pipe'],
    env:{...process.env,EXO_CLOTHCRAFT_PORT:String(port),EXO_CLOTHCRAFT_REPO:path.join(root,'research/oss/clothcraft'),
      EXO_CLOTHCRAFT_SESSION_BIN:path.join(root,'research/oss/clothcraft/target/debug/exo-session'),
      EXO_CLOTHCRAFT_OUTPUT_DIR:temp,EXO_CLOTHCRAFT_GPU:'0'}})
  server.stdout.on('data',()=>{})
  server.stderr.on('data',part=>process.stderr.write(String(part).slice(0,1000)))
  await ready(native+'/health')
  console.log('501 live Rust initialized:',temp)
  let snap=await call({op:'open',preset:'tshirt'})
  const original=snap.template.panels.map(item=>item.id)
  const fabric=snap.template.fabrics[0].id
  // The native engine needs at least one piece. Draft first front panel,
  // remove the scaffold tee, and leave the independent trouser document.
  snap=await call({op:'edit',revision:snap.revision,
    command:{kind:'Polygon',points:world(shapes[0]),fabric}})
  for(const id of original)snap=await call({op:'edit',revision:snap.revision,command:{kind:'RemovePanel',panel:id}})
  rounds.push({name:shapes[0].name,method:'native scaffold',...await label()})

  browser=await chromium.launch({headless:false,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal','--window-position=32,35']})
  page=await browser.newPage({viewport:{width:1720,height:1080},deviceScaleFactor:1})
  page.setDefaultTimeout(15000)
  const errors=[]
  page.on('pageerror',err=>{errors.push(err.message);console.error('BROWSER ERROR:',err.message)})
  await page.route('**/workspace',async route=>{
    const headers={...route.request().headers()};delete headers.origin
    const response=await route.fetch({url:native+'/workspace',headers})
    await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':ui}})
  })
  await page.goto(ui+'/?desktop=1&engine=clothcraft&testSession=501-visible-native-demo',{waitUntil:'domcontentloaded'})
  await page.locator('.cc-board [data-2d-pattern-piece]').first().waitFor({timeout:45000})
  await page.locator('.cc-board button[aria-label="Open Pattern Studio"]').click()
  console.log('2D FOCUS',await page.evaluate(()=>({root:document.querySelector('[data-native-clothcraft]')?.className,
    board:document.querySelector('.cc-board')?.getBoundingClientRect().toJSON(),
    svg:document.querySelector('svg[data-native-tool]')?.getBoundingClientRect().toJSON(),
    tools:[...document.querySelectorAll('.cc-board button[aria-label*="Pattern Studio"]')].map(x=>x.getAttribute('aria-label'))})))
  await page.locator('.cc-viewport-2d svg[data-native-tool]').waitFor({state:'attached'})
  await page.locator('.cc-board [aria-label="Grid"]').click()
  await page.locator('.cc-board [aria-label="Frame all"]').click()

  const svg=page.locator('.cc-board svg[data-native-tool]').first()
  async function atPoint([x,y]){
    return svg.evaluate((node,[x,y])=>{
      const group=node.querySelector('[data-clothcraft-metric-layer]')
      const p=new DOMPoint(x,y).matrixTransform(group.getScreenCTM())
      const box=node.getBoundingClientRect()
      return {x:p.x,y:p.y,inside:p.x>=box.left+9&&p.x<=box.right-9&&p.y>=box.top+9&&p.y<=box.bottom-9,
        box:{left:box.left,top:box.top,right:box.right,bottom:box.bottom}}
    },[x,y])
  }
  const draw=async shape=>{
    const count=(await label()).panels
    // Actual EXO 2D Polygon tool and pointer events, visible on the desktop.
    await page.evaluate(()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'polygon'}})))
    await page.locator('svg[data-native-tool="polygon"]').waitFor({timeout:12000})
    for(const [index,point] of world(shape).entries()){
      let pos=await atPoint(point)
      for(let zoom=0;!pos.inside&&zoom<22;zoom++){
        // Future panels may extend beyond the last native fit-to-content.
        // Zoom out through the user's actual board interaction, keeping the
        // material-space pointer calculation exact after each React render.
        const box=await svg.boundingBox()
        await page.mouse.move(box.x+box.width/2,box.y+box.height/2)
        await page.mouse.wheel(0,300)
        await sleep(35)
        pos=await atPoint(point)
      }
      assert(pos.inside,`Pattern ${shape.name} vertex ${index} off 2D canvas: ${JSON.stringify(pos)}`)
      await page.mouse.move(pos.x,pos.y,{steps:5})
      await page.mouse.down();await page.mouse.up()
      await sleep(36)
    }
    const inProgress=Number(await svg.getAttribute('data-vector-draft-count'))
    assert.equal(inProgress,shape.points.length,`Draft tool lost points for ${shape.name}`)
    await page.keyboard.press('Enter')
    await page.waitForFunction(n=>document.querySelectorAll('.cc-board [data-2d-pattern-piece]').length>n,count,{timeout:30000})
    const after=await label()
    assert.equal(after.panels,count+1,`Native Polygon did not save ${shape.name}`)
    rounds.push({name:shape.name,method:'visible 2D mouse Polygon',...after})
    console.log('DRAWN',rounds.at(-1))
  }

  // Four leg blocks and two yokes are visibly drawn in the application's
  // full-window 2D workspace. Small pocket parts are still true Rust polygons.
  for(const shape of shapes.slice(1,6))await draw(shape)
  await page.locator('.cc-board [aria-label="Frame all"]').click()
  await page.screenshot({path:path.join(evidence,'501-2d-legs-and-yokes.png'),animations:'disabled'})

  for(const shape of shapes.slice(6)){
    const before=snap=await call({op:'snapshot'})
    snap=await call({op:'edit',revision:before.revision,command:{kind:'Polygon',points:world(shape),fabric}})
    rounds.push({name:shape.name,method:'native Polygon exact points',revision:snap.revision,panels:snap.template.panels.length})
    console.log('CUT PIECE',rounds.at(-1))
  }

  // Saved native project carries real named editable pieces and source notes.
  const saved=await call({op:'save'})
  const project=saved.project
  assert.equal(project.template.panels.length,shapes.length)
  project.template.name='501 Original Fit-inspired / independent W32 L32 research draft'
  project.template.panels.forEach((panel,index)=>{panel.name=shapes[index].name;panel.grain_degrees=90})
  project.state=null;project.mesh_signature=null
  snap=await call({op:'open',project})
  assert.equal(snap.template.panels.length,shapes.length)
  await call({op:'save'})
  writeFileSync(path.join(evidence,'501-inspired-W32-L32-exo-project.json'),JSON.stringify((await call({op:'save'})).project,null,2)+'\n')

  await page.reload({waitUntil:'domcontentloaded'})
  await page.locator('.cc-board [data-2d-pattern-piece]').first().waitFor({timeout:40000})
  // The full 2D workspace remains visibly open after the reload.
  await page.locator('.cc-board button[aria-label="Open Pattern Studio"]').click()
  await page.locator('.cc-board [aria-label="Grid"]').click()
  await page.locator('.cc-board [aria-label="Frame all"]').click()
  await sleep(700)
  await page.screenshot({path:path.join(evidence,'501-2d-complete-live.png'),animations:'disabled',fullPage:true})
  const verified=await call({op:'snapshot'})
  assert.equal(verified.template.panels.length,shapes.length)
  assert.equal(errors.length,0,`Browser errors: ${JSON.stringify(errors)}`)
  const evidenceLog={researchDate:'2026-10-25',baseline:'W32 L32',panels:shapes.length,
    official:{frontRiseMm:285.75,kneeCircumferenceMm:444.5,legOpeningCircumferenceMm:406.4},
    contours:shapes.map((shape,index)=>({id:verified.template.panels[index].id,name:shape.name,points:shape.points,origin:shape.origin})),
    events:rounds,errors,verified:{revision:verified.revision,panels:verified.template.panels.length,
      view:await page.locator('.cc-pattern-studio-focus').count()}}
  writeFileSync(path.join(evidence,'native-drafting-test-log.json'),JSON.stringify(evidenceLog,null,2)+'\n')
  console.log('PASS RECONSTRUCTION',JSON.stringify({pieces:shapes.length,revision:verified.revision,
    named:verified.template.panels.map(p=>p.name),browserErrors:errors.length,output:evidence},null,2))
  console.log('VISIBLE CHROME SESSION IS LEFT OPEN for the user. Ctrl-C ends the isolated Rust session.')
  // Keep the visible local 2D editor and isolated native server available.
  // This idles after all drafting is complete; no background edits occur.
  await new Promise(resolve=>{process.on('SIGINT',resolve);browser.on('disconnected',resolve)})
}catch(err){console.error('501 DRAFT FAILURE:',err.stack||String(err));process.exitCode=1}
finally{if(browser)await browser.close().catch(()=>{});if(server){server.kill('SIGTERM');}console.log('501 drafting session ended')}
