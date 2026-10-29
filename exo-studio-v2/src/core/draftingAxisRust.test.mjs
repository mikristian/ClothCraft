import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {test} from 'node:test'
import {constrainDraftAxis} from './draftingSnapping.js'
import {initializeRustGeometryKernel,rustGeometryKernelStatus} from './rustGeometryKernel.js'

function reference(start,destination,degrees){
  const dx=destination.x-start.x,dy=destination.y-start.y
  if(Math.hypot(dx,dy)<1e-10)return {...destination}
  const increment=degrees*Math.PI/180
  const angle=Math.round(Math.atan2(dy,dx)/increment)*increment
  const travel=dx*Math.cos(angle)+dy*Math.sin(angle)
  return {x:start.x+travel*Math.cos(angle),y:start.y+travel*Math.sin(angle)}
}
function near(actual,expected){
  assert.ok(Math.abs(actual.x-expected.x)<1e-10,`x ${actual.x} != ${expected.x}`)
  assert.ok(Math.abs(actual.y-expected.y)<1e-10,`y ${actual.y} != ${expected.y}`)
}

test('axis guideline parity before and after loading compiled Rust WASM',async()=>{
  const cases=[]
  for(const degrees of [1,5,10,15,30,45,60,90,120,180,360]){
    for(const a of [-179,-135,-91,-45,-22.5,-0.01,0,22.5,44.99,45,89.99,135,179]){
      const radians=a*Math.PI/180
      cases.push([{x:12.5,y:-3.2},{x:12.5+24*Math.cos(radians),y:-3.2+24*Math.sin(radians)},degrees])
    }
  }
  cases.push([{x:1,y:2},{x:1+1e-12,y:2,metadata:'kept'},45])
  for(const [s,d,inc] of cases)near(constrainDraftAxis(s,d,inc),reference(s,d,inc))
  const wasm=readFileSync(new URL('../../public/wasm/exo_geometry_kernel.wasm',import.meta.url))
  assert.equal(await initializeRustGeometryKernel({bytes:wasm}),true,JSON.stringify(rustGeometryKernelStatus()))
  for(const [s,d,inc] of cases){try{near(constrainDraftAxis(s,d,inc),reference(s,d,inc))}catch(e){throw new Error(`increment=${inc} start=${JSON.stringify(s)} dest=${JSON.stringify(d)} ${e.message}`)}}
  assert.equal(constrainDraftAxis(...cases.at(-1)).metadata,'kept')
  for(const inc of [0,-1,7,NaN,Infinity])assert.throws(()=>constrainDraftAxis({x:0,y:0},{x:1,y:1},inc),/Invalid drafting guideline/)
  assert.throws(()=>constrainDraftAxis({x:NaN,y:0},{x:1,y:1}),/Invalid drafting guideline/)
})
