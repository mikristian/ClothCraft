// Read-only installed EXO 2D pattern presentation capture against signed CLO7 evidence.
// Run: node scripts/qa-clo-pattern-visual-parity-20261019.mjs [--url=http://127.0.0.1:5386/?desktop=1&engine=clothcraft]
import {chromium} from 'playwright-core'
import {mkdir, readFile, writeFile} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath, pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..')
const evidence=path.join(root,'research/clo-2d-analysis/audit-20261019')
const reference=path.join(evidence,'clo-live-readonly-20261019.png')
const out=path.resolve(process.env.EXO_PARITY_OUTPUT || path.join(evidence,'visual-parity-qa'))
const arg=process.argv.find(s=>s.startsWith('--url='))
const url=arg?.slice(6)||process.env.EXO_PARITY_URL||'http://127.0.0.1:5386/?desktop=1&engine=clothcraft'
const chrome=process.env.EXO_CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const viewport={width:1512,height:900}
await mkdir(out,{recursive:true})
const bytes=await readFile(reference)
const sha256=createHash('sha256').update(bytes).digest('hex')
const result={schema:1,date:'2026-10-19',source:'installed EXO V2 (read-only)',url,
  reference:{path:reference,sha256,description:'Signed CLO Inspector screenshot; different garment fixture and viewport layout'},
  viewport,states:{},criteria:{},limitations:[],errors:[],complete:false}
let browser
const filename=s=>path.join(out,s)
const save=async()=>writeFile(filename('results.json'),JSON.stringify(result,null,2)+'\n')

async function sample(board){
  return board.evaluate(el=>{
    const svg=el.querySelector('svg[data-native-tool]')
    const pieces=[...el.querySelectorAll('[data-2d-pattern-piece]')]
    const paths=[...el.querySelectorAll('[data-2d-pattern-piece] path[data-pattern-surface]')]
    const strokes=[...el.querySelectorAll('[data-2d-pattern-piece] [stroke-width]')]
    const corners=[...el.querySelectorAll('[data-2d-visible-corner]')]
    const box=svg?.getBoundingClientRect()
    const scale=svg&&box&&svg.viewBox.baseVal.width?Math.min(box.width/svg.viewBox.baseVal.width,box.height/svg.viewBox.baseVal.height):null
    const pxLength=(n,attribute)=>{const raw=n.getAttribute(attribute);if(raw==null)return null;const v=Number(raw);return Number.isFinite(v)&&scale!=null?v*scale:null}
    const circles=[...el.querySelectorAll('[data-control-point]')].filter(n=>n.tagName.toLowerCase()==='circle')
    const dimensions=circles.map(n=>({type:n.getAttribute('data-control-point'),diameterPx:pxLength(n,'r')==null?null:2*pxLength(n,'r'),opacity:Number(getComputedStyle(n).opacity),visible:getComputedStyle(n).visibility!=='hidden'&&getComputedStyle(n).display!=='none'}))
    const curveHandles=[...el.querySelectorAll('[data-curve-handle]')].map(n=>({id:n.getAttribute('data-curve-handle'),x:Number(n.getAttribute('cx')),y:Number(n.getAttribute('cy')),diameterPx:2*pxLength(n,'r')}))
    const cutlines=[...el.querySelectorAll('[data-2d-pattern-piece] path[stroke-width]')].map(n=>({widthPx:n.getAttribute('vector-effect')==='non-scaling-stroke'?Number(n.getAttribute('stroke-width')):pxLength(n,'stroke-width'),opacity:Number(getComputedStyle(n).opacity)*Number(n.getAttribute('stroke-opacity')??1),color:getComputedStyle(n).stroke}))
    const pieceBoxes=pieces.map(n=>n.getBoundingClientRect()).filter(b=>b.width>0&&b.height>0)
    const union=pieceBoxes.length?{
      left:Math.min(...pieceBoxes.map(b=>b.left)),right:Math.max(...pieceBoxes.map(b=>b.right)),
      top:Math.min(...pieceBoxes.map(b=>b.top)),bottom:Math.max(...pieceBoxes.map(b=>b.bottom))}:null
    return {
      tool:svg?.dataset.nativeTool??null,
      mode:el.getAttribute('data-precision-drafting')==='true'?'precision-cad':'standard',
      cssPixelsPerViewUnit:scale,
      viewBox:svg?{x:svg.viewBox.baseVal.x,y:svg.viewBox.baseVal.y,width:svg.viewBox.baseVal.width,height:svg.viewBox.baseVal.height}:null,
      cutlines,pointGlyphs:dimensions,curveHandles,
      coordinateTransform:svg?getComputedStyle(svg).transform:null,
      pieceCount:pieces.length,selectedCount:el.querySelectorAll('[data-2d-pattern-selected="true"]').length,
      visibleCornerCount:corners.length,
      editableVertexCount:el.querySelectorAll('[data-control-point="vertex"]').length,
      bezierControlCount:el.querySelectorAll('[data-curve-handle]').length,
      precisionDrafting:el.getAttribute('data-precision-drafting')==='true',
      sewingMarkerCount:el.querySelectorAll('[data-sewing-marker],[data-native-notch]').length,
      fillColors:[...new Set(paths.map(n=>n.getAttribute('fill')).filter(Boolean))],
      strokes:[...new Set(strokes.map(n=>({color:n.getAttribute('stroke'),width:n.getAttribute('stroke-width'),nonScaling:n.getAttribute('vector-effect')==='non-scaling-stroke'})).map(JSON.stringify))].map(JSON.parse),
      svgViewWidth:svg?.viewBox?.baseVal?.width??null,
      gridWorldWidths:[...el.querySelectorAll('pattern')].map(n=>Number(n.getAttribute('width'))),
      revision:el.getAttribute('data-document-revision'),
      avatarOverlayCount:el.querySelectorAll('[aria-label="Centered front avatar silhouette"]').length,
      floatingHelpCount:el.querySelectorAll('[data-edit-pattern-guide],[data-free-curve-tool-guide],[data-instruction-toast]').length,
      visiblePatternCoverage:union&&box&&box.width>0&&box.height>0?Number((Math.max(0,Math.min(union.right,box.right)-Math.max(union.left,box.left))*Math.max(0,Math.min(union.bottom,box.bottom)-Math.max(union.top,box.top))/(box.width*box.height)).toFixed(4)):null,
      svgBounds:box?{width:Math.round(box.width),height:Math.round(box.height)}:null,
    }
  })
}

try{
  browser=await chromium.launch({headless:true,executablePath:chrome,args:['--enable-webgl','--ignore-gpu-blocklist']})
  const context=await browser.newContext({viewport,deviceScaleFactor:1})
  const page=await context.newPage()
  page.on('pageerror',e=>result.errors.push(`page: ${e.message}`))
  const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:15000})
  result.httpStatus=response?.status()??null
  const board=page.locator('.cc-board').first()
  await board.waitFor({timeout:15000})
  await board.locator('[data-2d-pattern-piece]').first().waitFor({timeout:20000})
  await page.waitForTimeout(650)
  const revision=await board.getAttribute('data-document-revision')
  async function capture(name){
    const image=`exo-${name}.png`
    await board.screenshot({path:filename(image),animations:'disabled'})
    result.states[name]={image,metrics:await sample(board),status:'captured'}
    await save()
  }
  await page.getByRole('button',{name:'Transform Pattern',exact:true}).first().click()
  const clearBox=await board.boundingBox()
  await page.mouse.click(clearBox.x+clearBox.width-12,clearBox.y+clearBox.height-12)
  await capture('neutral')
  const hit=board.locator('[data-2d-pattern-piece] [data-panel]').first()
  await hit.click({force:true,timeout:4000})
  await page.waitForTimeout(170)
  await capture('selected')
  const editing=page.getByRole('button',{name:'Edit Pattern',exact:true}).first()
  if(await editing.count()){
    await editing.click({timeout:3000})
    await page.waitForTimeout(200)
    await capture('edit-point')
    const vertex=board.locator('[data-control-point="vertex"]').nth(1)
    if(await vertex.count()){await vertex.click();await capture('bezier-anchor')}
  }else{
    result.states['edit-point']={status:'not-captured',reason:'Edit Pattern control not found; no substitute state inferred'}
  }
  const cad=board.getByRole('button',{name:'Precision drafting',exact:true}).first()
  if(await cad.count()){
    const pressed=await cad.getAttribute('aria-pressed')
    if(pressed!=='true')await cad.click({timeout:3000})
    await page.waitForTimeout(300)
    await capture('precision-cad')
  }else result.states['precision-cad']={status:'not-captured',reason:'Precision drafting control not found'}
  await board.getByRole('button',{name:'Focus selected',exact:true}).click()
  await capture('focused')
  const before=await sample(board)
  const rect=await board.boundingBox()
  if(rect){
    await page.mouse.move(rect.x+rect.width*.5,rect.y+rect.height*.5)
    for(let i=0;i<7;i++)await page.mouse.wheel(0,-100)
    await page.waitForTimeout(250)
    await capture('zoom')
  }else result.states.zoom={status:'not-captured',reason:'2D board has no bounding box'}
  const after=result.states.zoom?.metrics
  result.criteria={
    'S1-rendered-patterns':{pass:result.states.neutral.metrics.pieceCount>0,value:result.states.neutral.metrics.pieceCount,unit:'pieces'},
    'S2-selected-contour':{pass:result.states.selected.metrics.selectedCount>0,value:result.states.selected.metrics.selectedCount,unit:'selected pieces'},
    'S3-editable-point-visibility':{pass:result.states['edit-point']?.metrics?.editableVertexCount>0,value:result.states['edit-point']?.metrics?.editableVertexCount??null,unit:'editable pattern vertices'},
    'S4-viewport-occupation':{pass:null,value:result.states.neutral.metrics.visiblePatternCoverage,unit:'fraction of SVG viewport; compare only with same garment and matched zoom'},
    'S5-zoom-response':{pass:after&&before.svgViewWidth!=null&&after.svgViewWidth<before.svgViewWidth,value:after?.svgViewWidth??null,unit:'SVG viewBox width after zoom'},
    'S6-preserve-native-revision':{pass:Object.values(result.states).filter(s=>s.metrics).every(s=>s.metrics.revision===revision),value:revision,unit:'document revision'},
    'S7-visual-stroke-uniformity':{pass:null,value:result.states.selected.metrics.strokes,unit:'SVG authored widths; screenshot review required'},
    'S8-precision-drafting':{pass:result.states['precision-cad']?.metrics?.precisionDrafting===true&&result.states['precision-cad']?.metrics?.avatarOverlayCount===0,value:result.states['precision-cad']?.metrics?.avatarOverlayCount??null,unit:'visible avatar silhouettes in CAD mode'},
    'S9-cutline-css-pixels':{pass:null,value:result.states.selected.metrics.cutlines,unit:'rendered CSS pixels; CLO calibrated scale unavailable'},
    'S10-point-diameters-css-pixels':{pass:null,value:result.states['edit-point']?.metrics?.pointGlyphs??null,unit:'CSS pixels; requires corresponding CLO point annotations'},
    'S11-bezier-endpoints':{pass:null,value:result.states['edit-point']?.metrics?.curveHandles??null,unit:'SVG coordinates and CSS diameters; CLO curve fixture differs'},
    'S12-coordinate-transform':{pass:after?.cssPixelsPerViewUnit!=null&&before.cssPixelsPerViewUnit!=null?after.cssPixelsPerViewUnit>before.cssPixelsPerViewUnit:null,value:{before:before.cssPixelsPerViewUnit,after:after?.cssPixelsPerViewUnit??null},unit:'CSS pixels per SVG view unit'},
    'S13-render-mode':{pass:result.states['precision-cad']?.metrics?.mode==='precision-cad',value:result.states['precision-cad']?.metrics?.mode??null,unit:'2D render mode'},
    'S14-opacity':{pass:null,value:result.states.selected.metrics.cutlines.map(s=>s.opacity),unit:'effective cutline opacity; CLO pixel reference requires segmentation'},
  }
  result.limitations.push('CLO and EXO screenshots depict different garments and different application layouts. Pixel similarity scores would be misleading.')
  result.limitations.push('Visual review of point sizes, cutline contrast, UI obstruction and color semantics requires matched fixture/camera or annotated reference crop.')
  result.complete=true
  // Capture a fixed rectangular reference region, without modifying signed evidence.
  const refPage=await context.newPage()
  await refPage.goto(pathToFileURL(reference).href)
  await refPage.screenshot({path:filename('clo-reference-full.png')})
  await refPage.close()
}catch(error){
  result.errors.push(error?.stack||String(error))
  result.limitations.push('Installed EXO was unavailable or UI selectors changed; missing states have not been fabricated.')
}finally{
  await save()
  if(browser)await browser.close()
}
console.log(JSON.stringify({complete:result.complete,output:out,criteria:result.criteria,states:Object.fromEntries(Object.entries(result.states).map(([k,v])=>[k,v.status])),errors:result.errors},null,2))
if(!result.complete)process.exitCode=1
