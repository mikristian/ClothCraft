// Browser acceptance against the live source app; all geometry remains in memory.
import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'

const url=process.env.EXO_SOURCE_URL||'http://127.0.0.1:5297/'
const browser=await chromium.launch({headless:true,
  executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})
try {
  const page=await browser.newPage()
  await page.goto(url,{waitUntil:'domcontentloaded'})
  const result=await page.evaluate(async()=>{
    const polar=await import('/src/core/rustPrecisionPolarKernel.js')
    const chord=await import('/src/core/rustPrecisionChordKernel.js')
    const drafting=await import('/src/core/draftingPrecision.js')
    const polarLoaded=await polar.initializeRustPrecisionPolarKernel()
    const chordLoaded=await chord.initializeRustPrecisionChordKernel()
    const piece={id:'polar-browser-only',locked:false,points:[
      {id:'a',x:-13.5,y:22.25,gradeRule:{x:1}},
      {id:'b',x:8,y:22.25,gradeRule:{y:2}},
      {id:'c',x:8,y:44,notch:{kind:'single'}},
      {id:'d',x:-13.5,y:44}],curves:{}}
    const before=JSON.stringify(piece)
    const anchor=piece.points[0]
    const inputs=[[0,0],[12.5,0],[12.5,45],[7.25,-137],[0.00000001,270]]
    const points=inputs.map(([length,angle])=>{
      const actual=drafting.pointFromPolar(anchor,length,angle)
      const radians=angle*Math.PI/180
      const expected={x:anchor.x+length*Math.cos(radians),y:anchor.y+length*Math.sin(radians)}
      return {actual,expected}
    })
    const pairInputs=[[anchor,piece.points[1]],[anchor,piece.points[2]],
      [{x:0,y:0},{x:-3,y:4}],[{x:0,y:0},{x:0,y:0}]]
    const pairs=pairInputs.map(([a,b])=>{
      const actual=drafting.polarFromPoints(a,b)
      const dx=b.x-a.x,dy=b.y-a.y
      const expected={lengthCm:Math.hypot(dx,dy),angleDeg:Math.atan2(dy,dx)*180/Math.PI}
      return {actual,expected}
    })
    const errors={}
    for(const [name,fn] of Object.entries({
      negativeLength:()=>drafting.pointFromPolar(anchor,-1,0),
      invalidLength:()=>drafting.pointFromPolar(anchor,Infinity,0),
      invalidAngle:()=>drafting.pointFromPolar(anchor,1,NaN),
      invalidAnchor:()=>drafting.pointFromPolar({x:Infinity,y:0},1,0),
      zeroEdge:()=>drafting.precisePointEdit(piece,1,{mode:'polar',lengthCm:0,angleDeg:0}),
      locked:()=>drafting.precisePointEdit({...piece,locked:true},1,{mode:'polar',lengthCm:2,angleDeg:0}),
    }))try{fn();errors[name]='NO_ERROR'}catch(e){errors[name]=e.message}
    const chordCoordinates=drafting.curveChordCoordinates({x:0,y:0},{x:5,y:2},{x:10,y:0})
    const precisionPoint=drafting.precisePointEdit(piece,1,{mode:'polar',lengthCm:10,angleDeg:0})
    return {polarLoaded,polarStatus:polar.rustPrecisionPolarStatus(),chordLoaded,
      chordStatus:chord.rustPrecisionChordStatus(),points,pairs,errors,chordCoordinates,
      precisionPoint,unchanged:JSON.stringify(piece)===before}
  })
  assert.equal(result.polarLoaded,true,JSON.stringify(result.polarStatus))
  assert.equal(result.polarStatus.backend,'rust-wasm')
  assert.equal(result.chordLoaded,true)
  assert.equal(result.chordStatus.backend,'rust-wasm')
  for(const item of [...result.points,...result.pairs]) {
    for(const key of Object.keys(item.expected))assert.ok(
      Object.is(item.actual[key],item.expected[key])||Math.abs(item.actual[key]-item.expected[key])<=1e-12,
      `${key}: ${item.actual[key]} !== ${item.expected[key]}`)
  }
  assert.deepEqual(result.errors,{
    negativeLength:'Length must not be negative',
    invalidLength:'Length must be a finite length in centimeters',
    invalidAngle:'Angle must be a finite length in centimeters',
    invalidAnchor:'Anchor X must be a finite length in centimeters',
    zeroEdge:'Adjacent pattern points must be at least 0.001 cm apart',
    locked:'Unlock the pattern before editing',
  })
  assert.deepEqual(result.chordCoordinates,{alongCm:0,depthCm:2})
  assert.equal(result.precisionPoint.id,'b')
  assert.deepEqual(result.precisionPoint.gradeRule,{y:2})
  assert.equal(result.unchanged,true)
  console.log(JSON.stringify({pass:true,url,backend:result.polarStatus.backend,
    chordBackend:result.chordStatus.backend,polarCases:result.points.length,
    inverseCases:result.pairs.length,errors:result.errors,authoredGarmentMutation:false}))
} finally {await browser.close()}
