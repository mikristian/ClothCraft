import {chromium} from 'playwright-core'
import {readFileSync,mkdirSync,writeFileSync,existsSync} from 'node:fs'
import path from 'node:path'
import {POLYHAVEN_ARCHETYPE_SCAN_IDS,AMBIENTCG_ARCHETYPE_SCAN_OVERRIDES} from '../src/data/polyhavenFabricAssignments.js'

const site='concepts/exo-community-ui'
const catalog=JSON.parse(readFileSync(`${site}/fabric-index.json`,'utf8')).fabrics
const media=JSON.parse(readFileSync(`${site}/market-media.json`,'utf8'))
const candidates=catalog.filter(x=>x.familyId===x.id && media.fabrics[x.familyId])
const selected=candidates.slice(0,34)
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader']})
const page=await browser.newPage({viewport:{width:460,height:460},deviceScaleFactor:1})
await page.goto('http://127.0.0.1:5188/scripts/marketplace-fabric-ball-render.html',{waitUntil:'domcontentloaded'})
await page.waitForFunction(()=>typeof window.renderEXOFabricBall==='function',{timeout:20000})
media.fabricBalls={}
mkdirSync(`${site}/market-media`,{recursive:true})
let count=0
for(const entry of selected){
 const ambient=AMBIENTCG_ARCHETYPE_SCAN_OVERRIDES[entry.familyId]
 const poly=POLYHAVEN_ARCHETYPE_SCAN_IDS[entry.familyId]
 const src=ambient&&existsSync(`public/fabric-scans-ambientcg/${ambient}/color.jpg`)
  ?`/fabric-scans-ambientcg/${ambient}`:`/fabric-scans/${poly}`
 const output=`${site}/market-media/ball-${entry.familyId}.webp`
 // Vite serves the actual public PBR scan; if a family lacks corresponding
 // source, the app's procedural yarn map remains available as a fallback.
 const tint=entry.color||'#9d9e9a'
 await page.evaluate(fabric=>window.renderEXOFabricBall(fabric),{id:entry.id,name:entry.name,color:tint,gsm:entry.gsm,bend:.56,roughness:entry.roughness,texture:{src:`${src}/color.jpg`,normalSrc:`${src}/normal.jpg`,roughnessSrc:`${src}/roughness.jpg`,scanAssetId:entry.familyId}})
 await page.waitForFunction(name=>document.querySelector(`canvas[data-fabric-ball="${name}"]`)?.width>0,entry.name,{timeout:10000})
 await page.waitForTimeout(140)
 const canvas=page.locator('.exo-fabric-ball').first()
 const png=await canvas.screenshot({type:'png',animations:'disabled'})
 // Browser screenshot is RGB losslessly; convert to compressed, independent
 // static preview for the site (which has no React/Vite requirement).
 const {spawnSync}=await import('node:child_process')
 const script='import sys,io\nfrom PIL import Image\nim=Image.open(io.BytesIO(sys.stdin.buffer.read())).convert("RGB")\nim.save(sys.argv[1],"WEBP",quality=83,method=4)'
 const result=spawnSync('python3',['-c',script,output],{input:png})
 if(result.status!==0)throw Error(result.stderr?.toString()||`Could not encode ${output}`)
 media.fabricBalls[entry.familyId]=`./market-media/ball-${entry.familyId}.webp`
 count++
 console.log('rendered',entry.familyId,count)
}
await browser.close()
writeFileSync(`${site}/market-media.json`,JSON.stringify(media,null,2)+'\n')
console.log('Fabric ball previews',count)
