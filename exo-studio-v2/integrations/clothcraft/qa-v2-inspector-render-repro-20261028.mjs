import assert from 'node:assert/strict'
import {chromium} from 'playwright-core'
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--disable-gpu','--no-first-run']})
const page=await browser.newPage({viewport:{width:1550,height:940}})
const errors=[];page.on('pageerror',e=>errors.push(e.message))
const snapshot=()=>page.evaluate(()=>{
 const main=document.querySelector('.main-layout'),inspector=main?.querySelector('.clo-inspector'),content=inspector?.querySelector('.clo-inspector-content'),browser=content?.querySelector('.clo-object-browser'),property=content?.querySelector('.clo-property-panel'),tools=inspector?.querySelector('.clo-right-tool-palette'),arrow=main?.querySelector('.exo-reopen-inspector-arrow');
 const info=el=>{if(!el)return null;const s=getComputedStyle(el),r=el.getBoundingClientRect();return {width:r.width,height:r.height,x:r.left,display:s.display,visibility:s.visibility,opacity:s.opacity,hidden:el.hidden,children:el.children.length}}
 return {layout:main?.dataset.patternWorkspace,visible:main?.dataset.inspectorVisible,rightTools:main?.dataset.rightToolsCollapsed,columns:main?getComputedStyle(main).gridTemplateColumns:null,
  inspectorChildren:[...inspector?.children||[]].map(el=>({cls:el.className,id:el.id,info:info(el),position:getComputedStyle(el).position,flex:getComputedStyle(el).flex,minWidth:getComputedStyle(el).minWidth})),inspector:info(inspector),content:info(content),browser:info(browser),property:info(property),tools:info(tools),arrow:info(arrow),
  title:browser?.innerText.slice(0,150),propertyText:property?.innerText.slice(0,150),pageText:document.body.innerText.slice(0,200)}
})
try{
 await page.goto('http://127.0.0.1:5958/?desktop=1&engine=clothcraft',{waitUntil:'domcontentloaded',timeout:20000});
 await page.locator('.main-layout').waitFor({timeout:30000});
 const initial=await snapshot(); console.log('INITIAL',JSON.stringify(initial)); assert(initial.browser.width>=245 && initial.property.width>=245,'3D browser/property panel must render at usable width')
 const combobox=page.getByRole('combobox',{name:'3D and 2D window arrangement'});
 console.log('ARRANGEMENT',await combobox.count());if(await combobox.count())await combobox.selectOption('2d')
 await page.waitForTimeout(500)
 console.log('2D',JSON.stringify(await snapshot()))
 const expand=page.getByRole('button',{name:'Expand Object Browser and Property Editor panel'})
 console.log('EXPAND',await expand.count());if(await expand.count())await expand.first().click({timeout:7000})
 await page.waitForTimeout(350)
 const expanded=await snapshot(); console.log('EXPANDED',JSON.stringify(expanded)); assert(expanded.browser.width>=245&&expanded.property.width>=245,'2D expanded browser and property must render inside inspector');assert(expanded.browser.x+expanded.browser.width<=1550,'Browser may not render outside viewport')
 { const collapse=page.getByRole('button',{name:'Collapse Object Browser and Property Editor panel'})
 if(await collapse.count())await collapse.first().click({timeout:7000})
 await page.waitForTimeout(200)
 const collapsed=await snapshot(); console.log('COLLAPSED',JSON.stringify(collapsed));assert.equal(collapsed.visible,'false');assert.equal(collapsed.tools.width,77,'Collapsed browser must retain independent right toolbar')
 if(await expand.count())await expand.first().click({timeout:7000})
 await page.waitForTimeout(200)
 const reopened=await snapshot(); console.log('RE-EXPANDED',JSON.stringify(reopened));assert(reopened.browser.width>=245&&reopened.property.width>=245,'Reopened inspector panels must be visible')
 }; console.log('ERRORS',JSON.stringify(errors));assert.deepEqual(errors,[]);console.log('PASS object browser/property editor right sidebar render and collapse/expand in 2D')
}finally{await browser.close()}
