import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {chromium} from 'playwright-core'

const base=process.env.EXO_MARKET_QA_URL||'http://127.0.0.1:5499/'
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox']})
let pass=0
const verify=async (name,fn)=>{await fn();pass++;console.log('PASS',name)}
try{
 for(const size of [{width:1440,height:880},{width:390,height:840}]){
  const page=await browser.newPage({viewport:size,reducedMotion:'reduce'})
  const browserErrors=[]
  page.on('pageerror',e=>browserErrors.push(e.message))
  await page.goto(base+'#marketplace',{waitUntil:'domcontentloaded'})
  await page.waitForFunction(()=>window.EXO_CONCEPT?.assets?.length>0)
  await page.waitForFunction(()=>document.querySelectorAll('.market-fabric-photo.is-fabric-ball img').length>=3)
  await verify(`${size.width} photographic draped fabric balls`,async()=>{
   const images=page.locator('.market-fabric-photo.is-fabric-ball img')
   assert.ok(await images.count()>=3)
   await images.first().evaluate(img=>img.decode())
   assert.ok((await images.first().evaluate(img=>img.naturalWidth))>=300)
  })
  await verify(`${size.width} only authentic stages and single garment image`,async()=>{
   const inventory=await page.evaluate(()=>window.EXO_CONCEPT.assets)
   assert.equal(inventory.filter(item=>item.category==='Garments').length,1)
   assert.equal(inventory.find(item=>item.category==='Garments').image,'./market-media/nike-saved-native-render.webp')
   const publicProjects=await page.evaluate(()=>window.EXO_CONCEPT.projects.filter(item=>item.category==='Garments'))
   assert.equal(publicProjects.length,1)
   assert.equal(publicProjects[0].image,inventory.find(item=>item.category==='Garments').image)
   const scenes=inventory.filter(item=>item.category==='Scenes')
   assert.deepEqual(scenes.map(item=>item.id).sort(),['stage-EXO01','stage-R02','stage-R03','stage-S01','stage-S10'].sort())
   assert.ok(scenes.every(item=>item.image.includes('market-media/scene-')))
   assert.equal(await page.locator('.nav-discover-menu [data-ai-discover]').count(),0)
  })
  await page.locator('[data-market-category="Patterns"]').click()
  await verify(`${size.width} original printable PDF is real and free`,async()=>{
   await page.locator('[data-open="pouch-pattern"]').first().click()
   const href=await page.locator('.market-pdf-download').getAttribute('href')
   assert.ok(href.endsWith('.pdf'))
   const response=await page.request.get(new URL(href,page.url()).href)
   assert.equal(response.status(),200)
   assert.equal((await response.body()).subarray(0,4).toString(),'%PDF')
   await page.locator('#detail-close').click()
   await page.locator('[data-open="foundation-tee"]').first().click()
   assert.equal(await page.locator('.market-pdf-download').count(),2)
   for(const link of await page.locator('.market-pdf-download').all()){
    const href=await link.getAttribute('href')
    const pdf=await page.request.get(new URL(href,page.url()).href)
    assert.equal(pdf.status(),200)
    assert.equal((await pdf.body()).subarray(0,4).toString(),'%PDF')
   }
   await page.locator('#detail-close').click()
  })
  await page.goto(base+'#profile/mikristian-lab',{waitUntil:'domcontentloaded'})
  await page.locator('.dp-tabs [data-tab="techpacks"]').click()
  await verify(`${size.width} public profile keeps private tech packs locked`,async()=>{
   assert.ok((await page.locator('.tp-private').innerText()).includes('Locked'))
   assert.equal(await page.locator('#exo-private-techpack-file').count(),0)
  })
  await page.locator('#profile-menu').click()
  await page.locator('.dp-tabs [data-tab="techpacks"]').click()
  await verify(`${size.width} explicit local owner profile imports Studio Tech Pack`,async()=>{
   assert.ok(await page.locator('#exo-private-techpack-file').count()===1)
   const pack={schemaVersion:1,packId:'qa-private-shirt',source:{project:{name:'QA Shirt',revision:'R01'}},draft:{styleName:'QA Shirt',sku:'QA-0101',technicalNotes:'private prototype'},revisions:[],comments:[]}
   await page.locator('#exo-private-techpack-file').setInputFiles({name:'qa-shirt-techpack.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(pack))})
   await page.locator('.dp-tabs [data-tab="techpacks"]').click()
   assert.ok((await page.locator('.tp-private').innerText()).includes('QA Shirt'))
   await page.locator('[data-tp-comment] [name="body"]').fill('Review sleeve opening on sample 02')
   await page.locator('[data-tp-comment] [type="submit"]').click()
   assert.ok((await page.locator('.tp-private').innerText()).includes('Review sleeve opening'))
   await page.locator('[data-tp-collab] [name="name"]').fill('Sample Factory')
   await page.locator('[data-tp-collab] [name="role"]').selectOption('comment')
   await page.locator('[data-tp-collab] [type="submit"]').click()
   assert.ok((await page.locator('.tp-private').innerText()).includes('Sample Factory'))
  })
  await verify(`${size.width} current garment PNG replaces the sole marketplace and profile garment photo`,async()=>{
   const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/jd8AAAAASUVORK5CYII=','base64')
   await page.locator('#exo-private-garment-photo').setInputFiles({name:'current-tshirt.png',mimeType:'image/png',buffer:png})
   await page.waitForFunction(()=>window.EXO_CONCEPT.assets.find(x=>x.id==='graphic-placement')?.image.startsWith('data:image/webp;base64,'))
   const refs=await page.evaluate(()=>({market:window.EXO_CONCEPT.assets.filter(x=>x.category==='Garments'),profile:window.EXO_CONCEPT.projects.filter(x=>x.category==='Garments')}))
   assert.equal(refs.market.length,1)
   assert.equal(refs.profile.length,1)
   assert.equal(refs.market[0].image,refs.profile[0].image)
   assert.ok(refs.market[0].image.startsWith('data:image/webp;base64,'))
   await page.locator('.dp-tabs [data-tab="works"]').click()
   assert.ok((await page.locator('.dp-project-image img').first().getAttribute('src')).startsWith('data:image/webp;base64,'),'same selected Studio screenshot must render in actual creator portfolio')
   await page.locator('nav.main-links [data-nav="marketplace"]').click()
   await page.locator('[data-market-category="Garments"]').click()
   assert.equal(await page.locator('#asset-grid .asset-card').count(),1)
   assert.ok((await page.locator('#asset-grid .asset-card img').getAttribute('src')).startsWith('data:image/webp;base64,'))
  })
  await page.goto(base+'#profile/mikristian-lab',{waitUntil:'domcontentloaded'})
  await page.locator('.dp-tabs [data-tab="techpacks"]').click()
  await verify(`${size.width} local owner mock grant does not follow public profile link`,async()=>{
   assert.ok((await page.locator('.tp-private').innerText()).includes('Locked'))
   assert.ok(!(await page.locator('.tp-private').innerText()).includes('QA Shirt'))
   assert.deepEqual(browserErrors,[])
  })
  await page.close()
 }
}finally{await browser.close()}
console.log('PASS',pass,'marketplace, drape, PDF and private profile checks')
