import assert from 'node:assert/strict'
import {edgeRangeLength,edgeLength} from '../../../src/core/project.js'

const speed=(a,c,b,t)=>Math.hypot(
  2*((1-t)*(c.x-a.x)+t*(b.x-c.x)),
  2*((1-t)*(c.y-a.y)+t*(b.y-c.y)))
const integrate=(a,c,b,start,end)=>{
  const n=16384,lo=Math.min(start,end),hi=Math.max(start,end),dt=(hi-lo)/n
  let sum=speed(a,c,b,lo)+speed(a,c,b,hi)
  for(let i=1;i<n;i++)sum+=(i%2?4:2)*speed(a,c,b,lo+i*dt)
  return sum*dt/3
}
const curves=[
  {id:'unequal-handle',points:[{x:0,y:0},{x:100,y:0}],curves:{0:{cx:2,cy:50}}},
  {id:'hook',points:[{x:0,y:0},{x:100,y:0}],curves:{0:{cx:-45,cy:180}}},
  {id:'near-line',points:[{x:0,y:0},{x:100,y:0}],curves:{0:{cx:15,cy:8}}},
  {id:'collapsed-control',points:[{x:0,y:0},{x:100,y:0}],curves:{0:{cx:0,cy:0}}},
]
let checked=0
for(const piece of curves){
  const a=piece.points[0],b=piece.points[1],c={x:piece.curves[0].cx,y:piece.curves[0].cy}
  const whole=edgeLength(piece,0)
  for(const [start,end] of [[0,1],[0,.5],[.15,.75],[.5,1],[1,.5],[.4,.4]]){
    const actual=edgeRangeLength(piece,0,start,end)
    const expected=integrate(a,c,b,start,end)
    assert.ok(Math.abs(actual-expected)<1e-5,`${piece.id} [${start},${end}] got ${actual} expected ${expected}`)
    checked++
  }
  assert.ok(Math.abs(edgeRangeLength(piece,0,0,.5)+edgeRangeLength(piece,0,.5,1)-whole)<1e-5,`${piece.id} partition`)
}
const straight={points:[{x:0,y:0},{x:100,y:0}],curves:{}}
assert.equal(edgeRangeLength(straight,0,.25,.75),50)
assert.equal(edgeRangeLength(straight,0,.75,.25),50)
console.log(JSON.stringify({pass:true,curveIntervals:checked,straightIntervals:2,metric:'cm',reference:'independent Simpson quadrature'}))
