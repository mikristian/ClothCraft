import assert from 'node:assert/strict'
import {existsSync,readFileSync} from 'node:fs'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {createHash} from 'node:crypto'
import {graphicPlacementInUV,physicalGraphicPlacement,initRustGraphicUV,rustGraphicUVReady} from '../src/core/nativeGarmentGraphics.js'

const root=join(fileURLToPath(new URL('..', import.meta.url)))
const wasm=readFileSync(join(root,'public/graphic-presets/exo-graphic-uv.wasm'))
const source=readFileSync(join(root,'integrations/clothcraft/rust/graphic_uv_kernel.rs'))
const upstream=join(root,'research/oss/clothcraft-rust-graphic-layout-20261017/src/garment/graphic_uv_kernel.rs')
// The runtime module is built from precisely the same Rust functions offered
// in the official ClothCraft contribution branch. This is not a JS reimplementation.
// An ordinary GitHub clone contains EXO source, not the separate ClothCraft
// contribution worktree. Check byte-for-byte parity when it is locally present;
// the numerical WASM-vs-JS suite always runs in standalone EXO checkouts.
if (existsSync(upstream)) {
 assert.equal(createHash('sha256').update(source).digest('hex'),createHash('sha256').update(readFileSync(upstream)).digest('hex'),'Rust shared source diverged')
}
assert.ok(!rustGraphicUVReady(),'test initially uses JS fallback')
const graphic={id:'example',dataUrl:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB',panel:'front',width:600,height:320}
const cases=[]
const physical=[]
for (const x of [0,.25,.5,1,-10,10])for(const y of [0,.3,.58,1,-20,20])
  for (const scale of [.03,.42,.44,1.5,-5,9])for (const rotation of [-180,-90,-45,0,60,180,-400,500]) {
    const record={...graphic,center:[x,y],scale,rotation}
    cases.push({record, expected:graphicPlacementInUV(record)})
  }
for(const spanX of [.4,.64])for(const spanY of [.3,.7])for(const widthMm of [45,100,180,600])for(const rotation of [-180,0,30,90]){
 const record={...graphic,center:[.5,.58],scale:.44,widthMm,heightMm:widthMm/2,positionMm:[spanX*250,spanY*580],rotation}
 physical.push({record,spanX,spanY,expected:physicalGraphicPlacement(record,spanX,spanY)})
}
assert.equal(await initRustGraphicUV(wasm),true)
assert.ok(rustGraphicUVReady(),'Rust WASM activated')
let checks=0
for(const {record,expected} of cases){
 const actual=graphicPlacementInUV(record)
 for(const field of ['u','v','widthUV','rotationRadians']){
  assert.ok(Math.abs(actual[field]-expected[field])<1e-12,`Rust VS JS ${field} for ${JSON.stringify({center:record.center,scale:record.scale,rotation:record.rotation})}: ${actual[field]} vs ${expected[field]}`)
  checks++
 }
}
for(const {record,spanX,spanY,expected} of physical){
 const actual=physicalGraphicPlacement(record,spanX,spanY)
 for(const field of ['u','v','widthUV','heightUV','rotationRadians','widthMm','heightMm','effectiveDpi']){
  assert.ok(Math.abs(actual[field]-expected[field])<1e-12,`Rust physical print ${field}: ${actual[field]} vs ${expected[field]}`)
  checks++
 }
}
console.log(`PASS: ${cases.length} normalized + ${physical.length} actual physical 3D print placements, ${checks} numeric comparisons; identical Rust source, ${wasm.length}B compiled WASM, active runtime path`)
