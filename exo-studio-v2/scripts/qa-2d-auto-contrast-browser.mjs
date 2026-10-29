import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'

// Run against installed EXO's UI (default :5386); no native workspace writes.
// QA uses a fresh isolated Chromium context and its own localStorage values.
const url=process.env.EXO_QA_URL||'http://127.0.0.1:5386/?desktop=1&engine=clothcraft&qa=auto-contrast'
const cases=[
  {label:'dark',canvas:'#101113',ink:'#111111',minimum:4.5},
  {label:'light',canvas:'#f8f9fb',ink:'#fefefe',minimum:4.5},
]
const srgb=x=>{const n=x/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4}
const rgb=text=>{
  if(/^#[\da-f]{6}$/i.test(text))return [1,3,5].map(i=>parseInt(text.slice(i,i+2),16))
  const match=String(text).match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
  return match?match.slice(1,4).map(Number):null
}
const contrast=(fg,bg)=>{
  const a=rgb(fg),b=rgb(bg)
  assert.ok(a&&b,`Expected opaque sRGB colors, got ${fg} / ${bg}`)
  const lum=v=>v.map(srgb).reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0)
  const x=lum(a),y=lum(b)
  return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)
}

const browser=await chromium.launch({headless:true,
  executablePath:process.env.EXO_QA_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--enable-webgl','--ignore-gpu-blocklist','--use-angle=metal']})
const failures=[]
try{
  for(const scenario of cases){
    const context=await browser.newContext({viewport:{width:1650,height:1050}})
    const page=await context.newPage()
    const errors=[]
    page.on('pageerror',error=>errors.push(error.message))
    await page.addInitScript(({canvas,ink})=>{
      const key='exo.studioCustomization.v1'
      const prior=JSON.parse(localStorage.getItem(key)||'{}')
      localStorage.setItem(key,JSON.stringify({...prior,version:1,
        appearance:{...prior.appearance,autoContrast:true},
        workspace:{...prior.workspace,viewportLayout:'2d'},
        preferences:{...prior.preferences,twoDCanvasColor:canvas,twoDGridColor:ink,
          twoDRulerMarkColor:ink,twoDEdgeColor:ink,twoDSelectionColor:ink,
          twoDPointColor:ink,twoDNotchColor:ink,twoDPatternColor:canvas,
          twoDShowRulers:true,showGrid:true,twoDGridStyle:'grid'}}))
    },scenario)
    const checks=[]
    const test=(name,color,background,min=scenario.minimum)=>{
      const ratio=contrast(color,background)
      checks.push({name,color,background,contrast:Number(ratio.toFixed(2)),minimum:min})
      if(ratio<min)failures.push(`${scenario.label}: ${name} ${ratio.toFixed(2)}:1 < ${min}:1 (${color} on ${background})`)
    }
    try{
      await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000})
      const board=page.locator('.cc-board').first()
      await board.waitFor({state:'visible',timeout:45000})
      await page.waitForTimeout(1000)
      assert.equal(await board.getAttribute('data-cad-auto-contrast'),'true','Native board contrast enabled')
      const styles=await board.evaluate(element=>{
        const css=getComputedStyle(element)
        const get=name=>css.getPropertyValue(name).trim()
        return {background:css.backgroundColor,grid:get('--cad-adaptive-grid'),ruler:get('--cad-adaptive-ruler'),
          edge:get('--cad-adaptive-edge'),paper:get('--cad-adaptive-paper'),
          selected:get('--cad-adaptive-selected'),gradeMain:get('--cad-adaptive-grade-main'),
          gradeBase:get('--cad-adaptive-grade-base')}
      })
      const ruler=page.locator('.cc-board [data-cad-rulers="true"] svg text').first()
      await ruler.waitFor({state:'visible',timeout:8000})
      const rulerFill=await ruler.evaluate(element=>getComputedStyle(element).fill)
      const minor=page.locator('.cc-board pattern[id$="-minor"] path').first()
      assert.ok(await minor.count(),'Actual grid path must exist')
      const gridStroke=await minor.evaluate(element=>getComputedStyle(element).stroke)
      const pattern=page.locator('.cc-board [data-pattern-surface="drafting-paper"]').first()
      assert.ok(await pattern.count(),'Actual drafting paper must exist')
      const patternFill=await pattern.evaluate(element=>getComputedStyle(element).fill)
      // Same-color custom paper and canvas are allowed as stored preferences,
      // but the *displayed* drafting surface must become distinguishable.
      test('rendered paper silhouette against canvas',patternFill,styles.background,1.95)
      const selected=page.locator('.cc-board [data-2d-pattern-piece] polyline[data-active-curve-edge="false"][data-cutline-hover-blue="false"]:not([data-2d-edge-hit])').first()
      assert.ok(await selected.count(),'Actual rendered cutline must exist')
      const selectedStroke=await selected.evaluate(element=>getComputedStyle(element).stroke)
      test('SVG ruler numeric text',rulerFill,styles.background)
      test('SVG grid path',gridStroke,styles.background,3)
      // Paper can intentionally match the canvas for a transparent workspace;
      // in that case the authoritative cutline still must outline the piece.
      test('rendered cutting line against paper',selectedStroke,patternFill,6.95)
      test('rendered cutting line against canvas',selectedStroke,styles.background,3)
      test('selected grading palette',styles.gradeMain,styles.background)
      test('base grading palette',styles.gradeBase,styles.background)
      test('selected control palette',styles.selected,styles.paper)
      const grades=page.locator('.cc-board [data-accumark-grade-overlay] [data-grade-size] path')
      if(await grades.count()){
        const grade=await grades.first().evaluate(element=>({stroke:getComputedStyle(element).stroke,size:element.closest('[data-grade-size]')?.getAttribute('data-grade-size')}))
        test(`rendered grading line ${grade.size}`,grade.stroke,styles.background,3)
      }
      console.log(JSON.stringify({case:scenario.label,styles,rendered:{rulerFill,gridStroke,patternFill,selectedStroke,gradePaths:await grades.count()},checks,errors},null,2))
      assert.deepEqual(errors.slice(0,3),[],'Unexpected browser JS error')
    }catch(error){failures.push(`${scenario.label}: ${error.stack||error}`)}
    finally{await context.close()}
  }
}finally{await browser.close()}
assert.deepEqual(failures,[],`EXO visual contrast failures:\n${failures.join('\n')}`)
console.log('PASS: native 2D auto contrast rendered dark and light')
