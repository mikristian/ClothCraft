import test from 'node:test'
import assert from 'node:assert/strict'
import {traceAccuMarkPhotoSilhouette20261024 as trace} from './accumarkPhotoDigitize20261024.js'

function makeMask(w,h,on){
 const rgba=new Uint8ClampedArray(w*h*4).fill(255)
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(on(x,y)){
  const i=(y*w+x)*4;rgba[i]=rgba[i+1]=rgba[i+2]=0
 }
 return {rgba,width:w,height:h,threshold:100,minPixels:20}
}
test('traces closed black rectangle on white photo without claiming industrial marks',()=>{
 const result=trace(makeMask(65,65,(x,y)=>x>=12&&x<42&&y>=18&&y<42))
 assert.equal(result.ok,true,result.reason)
 assert(result.observedPoints.length>=4&&result.observedPoints.length<=20)
 assert.equal(result.sourcePixelCount,30*24)
 assert(result.areaChangeRatio<=.01)
 assert.equal(result.manufacturingApproved,false)
 assert.equal(result.notchesRecovered,false)
 assert.equal(result.physicalCalibrationVerified,false)
})
test('concave pattern retains a nonrectangular silhouette',()=>{
 const result=trace(makeMask(90,80,(x,y)=>(x>=15&&x<70&&y>=15&&y<27)||(x>=15&&x<28&&y>=27&&y<64)))
 assert.equal(result.ok,true,result.reason)
 assert(result.observedPoints.length>=6)
 assert(result.sourceAreaPx2<55*49)
})
test('rejects cropped, double piece, holes, and inaccurate input',()=>{
 assert.equal(trace(makeMask(50,50,(x,y)=>x>=0&&x<15&&y>=10&&y<30)).code,'CROPPED_PATTERN')
 assert.equal(trace(makeMask(90,55,(x,y)=>(x>5&&x<30||x>50&&x<75)&&y>5&&y<35)).code,'MULTIPLE_SILHOUETTES')
 assert.equal(trace(makeMask(60,60,(x,y)=>x>4&&x<55&&y>4&&y<55&&!(x>20&&x<36&&y>20&&y<36))).code,'HOLES_OR_EXTRA_BOUNDARIES')
 assert.equal(trace({width:2000,height:2000,rgba:new Uint8Array(1)}).code,'INVALID_IMAGE')
})
