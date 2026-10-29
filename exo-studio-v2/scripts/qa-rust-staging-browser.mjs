import assert from 'node:assert/strict'
import {chromium} from '../../music-empire-game/node_modules/playwright-core/index.mjs'
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
try {
 const page=await browser.newPage()
 await page.goto(process.env.QA_URL||'http://127.0.0.1:5297/',{waitUntil:'domcontentloaded'})
 const result=await page.evaluate(async()=>{
   const bridge=await import('/src/core/rustStagingKernel.js')
   const THREE=await import('/node_modules/.vite/deps/three.js')
   const staging=await import('/src/core/staging.js')
   const loaded=await bridge.initializeRustStagingKernel()
   const simPiece={flatVertices:Array.from({length:16},(_,i)=>new THREE.Vector2(i%4*12,Math.floor(i/4)*12)),piece:{arrangement3d:{wrap:'front',y:1}}}
   const before=JSON.stringify(simPiece)
   const positions=staging.stagedPanelPositions(simPiece,{heightCm:180})
   const geom=new THREE.BufferGeometry()
   geom.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(positions.length*3),3))
   const success=staging.setStagedGeometry(geom,positions,positions.map(v=>v.clone().addScalar(.1)),.5)
   return {loaded,status:bridge.rustStagingStatus(),count:positions.length,success,positionsFinite:positions.every(v=>v.isVector3&&[v.x,v.y,v.z].every(Number.isFinite)),authoredUnchanged:before===JSON.stringify(simPiece),first:geom.getAttribute('position').getX(0)}
 })
 assert.equal(result.loaded,true)
 assert.equal(result.status.backend,'rust-wasm')
 assert.equal(result.count,16)
 assert.equal(result.success,true)
 assert.equal(result.positionsFinite,true)
 assert.equal(result.authoredUnchanged,true)
 console.log(JSON.stringify({pass:true,...result}))
} finally {await browser.close()}
