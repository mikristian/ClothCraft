import assert from 'node:assert/strict'
import {test} from 'node:test'
import {readFileSync} from 'node:fs'
import {initializeRustFreeSewingKernel,rustFreeSewingKernelReady,rustFreeSewingOperation} from '../../src/core/rustFreeSewingKernel.js'
import {projectFreeSewingPoint,freeSewingRangePoints,freeSewingPointAtFraction} from '../../src/core/freeSewingGeometry.js'

const data=readFileSync(new URL('./target/wasm32-unknown-unknown/release/exo_free_sewing_kernel.wasm',import.meta.url))
function legacySegments(points){const lengths=[];let total=0;for(let i=1;i<points.length;i++){const l=Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]);lengths.push(l);total+=l}return {lengths,total}}
function legacyProject(points,mouse){const {lengths,total}=legacySegments(points);if(total<=1e-7)return null;let traversed=0,best=null;for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],length=lengths[i-1];if(length<=1e-9){traversed+=length;continue}const dx=b[0]-a[0],dy=b[1]-a[1],u=Math.max(0,Math.min(1,((mouse[0]-a[0])*dx+(mouse[1]-a[1])*dy)/(length*length)));const point=[a[0]+u*dx,a[1]+u*dy],distance=Math.hypot(mouse[0]-point[0],mouse[1]-point[1]);if(!best||distance<best.distance)best={fraction:(traversed+u*length)/total,position:point,distance,lengthMetres:total};traversed+=length}return best}
function legacyPoint(points,fraction){const {lengths,total}=legacySegments(points);if(total<=1e-7)return null;const target=Math.max(0,Math.min(1,fraction))*total;let traversed=0;for(let i=1;i<points.length;i++){const l=lengths[i-1];if(l>1e-9&&(traversed+l>=target||i===points.length-1)){const t=Math.max(0,Math.min(1,(target-traversed)/l));return [points[i-1][0]+(points[i][0]-points[i-1][0])*t,points[i-1][1]+(points[i][1]-points[i-1][1])*t]}traversed+=l}return points.at(-1)}
function legacyRange(points,start,end){const {lengths,total}=legacySegments(points);if(total<=1e-7)return [];const low=Math.max(0,Math.min(1,Math.min(start,end)))*total,high=Math.max(0,Math.min(1,Math.max(start,end)))*total;if(high-low<=1e-8)return [];const output=[];let traversed=0;for(let i=1;i<points.length;i++){const length=lengths[i-1],begin=traversed,finish=begin+length;if(length>1e-9&&finish>=low-1e-9&&begin<=high+1e-9){const a=points[i-1],b=points[i],lerp=distance=>{const t=Math.max(0,Math.min(1,(distance-begin)/length));return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]};const from=lerp(Math.max(low,begin)),to=lerp(Math.min(high,finish));if(!output.length)output.push(from);const last=output.at(-1);if(Math.hypot(to[0]-last[0],to[1]-last[1])>1e-9)output.push(to)}traversed=finish}return output}
function nearly(actual,expected,label){if(Array.isArray(expected)){assert.ok(Array.isArray(actual),label);assert.equal(actual.length,expected.length,label);expected.forEach((v,i)=>nearly(actual[i],v,`${label}[${i}]`));return}if(expected&&typeof expected==='object'){assert.ok(actual&&typeof actual==='object',label);assert.deepEqual(Object.keys(actual),Object.keys(expected),label);for(const key of Object.keys(expected))nearly(actual[key],expected[key],`${label}.${key}`);return}if(typeof expected==='number'){assert.ok(Math.abs(actual-expected)<=Math.max(1e-12,Math.abs(expected)*1e-12),`${label}: ${actual} vs ${expected}`);return}assert.equal(actual,expected,label)}

test('real WASM matches legacy JS for batch project, fraction, range including degenerate cases',async()=>{
  assert.equal(rustFreeSewingKernelReady(),false)
  assert.equal(await initializeRustFreeSewingKernel({bytes:data}),true)
  let seed=29123;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296)
  const cases=[[[0,0],[.1,0],[.1,.1]],[[0,0],[0,0],[.2,0]],[[0,0],[0,0]],[[.002,1],[.002,1],[.002,1.1]]]
  for(let i=0;i<125;i++){const pts=[[0,0]];for(let j=0;j<2+i%11;j++)pts.push(j%7===0?[...pts.at(-1)]:[pts.at(-1)[0]+random()*.1,pts.at(-1)[1]+(random()-.5)*.1]);cases.push(pts)}
  cases.forEach((points,i)=>{const indices=points.map((_,j)=>j),mouse=[random()*.5,random()*.5],start=random()*1.8-.4,end=random()*1.8-.4,fraction=random()*1.8-.4;nearly(projectFreeSewingPoint(indices,points,mouse),legacyProject(points,mouse),`project ${i}`);nearly(freeSewingPointAtFraction(indices,points,fraction),legacyPoint(points,fraction),`fraction ${i}`);nearly(freeSewingRangePoints(indices,points,start,end),legacyRange(points,start,end),`range ${i}`)})
  assert.deepEqual(freeSewingRangePoints([0,1],[[0,0],null],0,1),[])
  assert.equal(projectFreeSewingPoint([0,1],[[0,0],null],[0,0]),null)
})
