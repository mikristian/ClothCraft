import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {placePatternLabel} from '../src/core/patternLabelPlacement.js'
import {initializeRustLabelLayoutKernel,rustPlacePatternLabel,rustLabelLayoutReady} from '../src/core/rustLabelLayoutKernel.js'

const wasm=readFileSync('public/wasm/exo_label_layout_kernel.wasm')
assert.equal(await initializeRustLabelLayoutKernel({bytes:wasm}),true)
assert.equal(rustLabelLayoutReady(),true)
let seed=7919
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
const jsPlace=(midpoint,normal,text,unit,points,bounds)=>{
  const width=Math.max(48,String(text).length*6)*unit,height=13*unit
  const [left,top,w,h]=bounds
  const candidates=[]
  for(const distance of [20,36,54,76])for(const sign of [1,-1]){
    const x=Math.max(left+width/2+4*unit,Math.min(left+w-width/2-4*unit,midpoint[0]+normal[0]*distance*unit*sign))
    const y=Math.max(top+height+30*unit,Math.min(top+h-8*unit,midpoint[1]+normal[1]*distance*unit*sign))
    const box={left:x-width/2,right:x+width/2,top:y-height,bottom:y+3*unit}
    const collisions=points.filter(p=>p[0]+7*unit>box.left&&p[0]-7*unit<box.right&&p[1]+7*unit>box.top&&p[1]-7*unit<box.bottom).length
    candidates.push({x,y,box,collisions})
    if(!collisions)return candidates.at(-1)
  }
  return candidates.sort((a,b)=>a.collisions-b.collisions)[0]
}
let checks=0
for(let i=0;i<600;i++){
  const unit=[0.5,1,2,3][i%4]
  const bounds=[-100+random()*100,-50+random()*80,100+random()*600,100+random()*500]
  const midpoint=[bounds[0]+random()*bounds[2],bounds[1]+random()*bounds[3]]
  const theta=random()*Math.PI*2
  const normal=[Math.cos(theta),Math.sin(theta)]
  const label='Piece '+String(i%31).repeat(i%10)
  const points=Array.from({length:i%6===0?0:(i%6===1?1:Math.floor(random()*300))},()=>[bounds[0]+random()*bounds[2],bounds[1]+random()*bounds[3]])
  const old=jsPlace(midpoint,normal,label,unit,points,bounds)
  const native=placePatternLabel(midpoint,normal,label,unit,points,bounds)
  const direct=rustPlacePatternLabel(midpoint,normal,Math.max(48,label.length*6)*unit,13*unit,unit,points,bounds)
  for(const result of [native,direct]){
    assert.equal(result.collisions,old.collisions,`collision mismatch case ${i}`)
    for(const key of ['x','y'])assert.ok(Math.abs(result[key]-old[key])<1e-9,`${key} mismatch case ${i}`)
    for(const key of ['left','right','top','bottom'])assert.ok(Math.abs(result.box[key]-old.box[key])<1e-9,`${key} mismatch case ${i}`)
  }
  checks++
}
console.log(`PASS label layout WASM parity: ${checks} seeded layouts × 2 entrypoints`)
