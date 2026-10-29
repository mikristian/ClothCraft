import test from 'node:test'
import assert from 'node:assert/strict'
import {measureDartWedge20261023,rotateDartMaterial20261023,alignDartLegs20261023} from './experimentalDartGeometry20261023.js'
const close=(actual,expected,tolerance=1e-9)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} differs from ${expected}`)
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)

test('30 mm intake and 70 mm depth have correct centimeter area and opening',()=>{
 const result=measureDartWedge20261023({leftLeg:{x:-1.5,y:0},rightLeg:{x:1.5,y:0},apex:{x:0,y:7}})
 close(result.intakeCm,3);close(result.depthCm,7);close(result.wedgeAreaCm2,10.5)
 close(result.leftLengthCm,result.rightLengthCm)
 close(result.dartAngleRad,2*Math.atan(1.5/7))
})

test('rigid dart sector rotation conserves every pair distance, perimeter and signed area',()=>{
 const points=[{x:1,y:2},{x:5,y:2},{x:5,y:6},{x:1,y:6}]
 const shifted=rotateDartMaterial20261023({points,apex:{x:2,y:1},angleRad:1.37})
 for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++)close(distance(points[i],points[j]),distance(shifted[i],shifted[j]))
 const area=polygon=>polygon.reduce((sum,p,i)=>{const q=polygon[(i+1)%polygon.length];return sum+p.x*q.y-q.x*p.y},0)/2
 close(area(points),area(shifted))
 assert.deepEqual(points[0],{x:1,y:2})
})

test('closing unequal dart legs measures overhang and preserves radius without silently trueing',()=>{
 const result=alignDartLegs20261023({apex:{x:0,y:0},stationaryLeg:{x:0,y:8},movingLeg:{x:3,y:7},movingPoints:[{x:4,y:9}]})
 close(result.transverseErrorCm,0)
 close(result.overhangCm,Math.hypot(3,7)-8)
 assert.equal(result.trueingRequired,true)
 close(distance(result.rotatedLeg,{x:0,y:0}),Math.hypot(3,7))
 assert.equal(result.rotatedPoints.length,1)
})

test('rejects inverted, collinear, coincident and nonfinite geometry',()=>{
 const good={leftLeg:{x:0,y:0},rightLeg:{x:3,y:0},apex:{x:1,y:7}}
 assert.throws(()=>measureDartWedge20261023({...good,apex:{x:1,y:-7}}),/interior/)
 assert.throws(()=>measureDartWedge20261023({...good,apex:{x:1,y:0}}),/interior/)
 assert.throws(()=>measureDartWedge20261023({...good,rightLeg:good.leftLeg}),/coincide/)
 assert.throws(()=>measureDartWedge20261023({...good,leftLeg:{x:Infinity,y:0}}),/finite/)
 assert.throws(()=>measureDartWedge20261023({...good,interiorSide:0}),/interiorSide/)
 assert.throws(()=>rotateDartMaterial20261023({points:[good.apex],apex:good.apex,angleRad:NaN}),/finite/)
 assert.throws(()=>alignDartLegs20261023({stationaryLeg:good.apex,movingLeg:good.leftLeg,apex:good.apex}),/coincide/)
})
