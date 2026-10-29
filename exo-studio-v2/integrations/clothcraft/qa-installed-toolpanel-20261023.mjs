import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
import {writeFileSync} from 'node:fs'
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
const errors=[],mutations=[],failedAssets=[]
try{
 const page=await browser.newPage({viewport:{width:1600,height:1000}})
 page.on('pageerror',e=>errors.push(e.message))
 page.on('request',r=>{if(r.method()==='POST'&&r.url().endsWith('/workspace')){const op=r.postDataJSON()?.op;if(op!=='snapshot')mutations.push(op)}})
 page.on('response',r=>{if(r.status()>=400&&/\.(wasm|js|css)(?:\?|$)/.test(r.url()))failedAssets.push({url:r.url(),status:r.status()})})
 await page.goto('http://127.0.0.1:5386/?desktop=1&engine=clothcraft',{waitUntil:'domcontentloaded',timeout:30000})
 await page.locator('.cc-board [data-edge]').first().waitFor({timeout:45000})
 await page.getByLabel('3D and 2D window arrangement',{exact:true}).selectOption('2d')
 const rail=page.getByRole('navigation',{name:'Pattern Design toolpanel',exact:true})
 assert.equal(await rail.locator('[data-pattern-design-tool]').count(),22)
 await page.setViewportSize({width:1100,height:760})
 await rail.locator('[data-pattern-design-tool="grading-auto"]').click()
 const modal=page.locator('[data-clo-floating-widget="grading"]')
 await modal.waitFor({state:'visible'})
 assert.equal(await modal.getByRole('spinbutton',{name:'Grade width per size millimetres'}).count(),1)
 assert.equal(await modal.getByRole('button',{name:'Tiled A4',exact:true}).count(),1)
 assert.equal(await modal.getByRole('button',{name:'Tiled Letter',exact:true}).count(),1)
 assert.equal(await modal.getByRole('button',{name:'Export reference sheet',exact:true}).count(),1)
 await page.screenshot({path:'docs/qa/toolpanel-release-20261023/installed-grading.png'})
 await modal.getByRole('button',{name:'Cancel',exact:true}).click()
 const last=rail.locator('[data-pattern-design-tool="seam-edit"]')
 await last.scrollIntoViewIfNeeded()
 const bounds=await last.boundingBox()
 assert(bounds&&bounds.y>=0&&bounds.y+bounds.height<=760,'Bottom tools must be reachable in narrow view')
 await page.screenshot({path:'docs/qa/toolpanel-release-20261023/installed-narrow-tools.png'})
 assert.deepEqual(errors,[]);assert.deepEqual(mutations,[]);assert.deepEqual(failedAssets,[])
 const report={pass:true,installedUrl:'http://127.0.0.1:5386',customGradingVisible:true,tiledPrintVisible:true,mutations,errors,failedAssets}
 writeFileSync('docs/qa/toolpanel-release-20261023/smoke.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report))
}finally{await browser.close()}
