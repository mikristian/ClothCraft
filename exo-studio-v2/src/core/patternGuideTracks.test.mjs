import assert from 'node:assert/strict'
import test from 'node:test'
import {horizontalGuideTracks,verticalGuideTracks,materialGuideSpans,sharedTorsoGuideX,patternGuideLocalFrame} from './patternGuideTracks.js'
import {previewPoint} from './clothcraft2dGeometry.js'

// Simple true cut perimeter: 0.4m wide, 0.8m tall in material coordinates.
const local=[[0,0],[.4,0],[.4,.8],[0,.8],[0,0]]
const boundaries={top:[0,1],right:[1,2],bottom:[2,3],left:[3,4]}

test('chest/waist transverse guides meet the vertical center exactly',()=>{
  const levels=[.30,.52,.72]
  const center=.2
  const [vertical]=verticalGuideTracks(boundaries,local,center,levels)
  assert(vertical)
  assert(vertical.every(([x])=>x===center),'centerline must not change X at guide crossings')
  for(const y of levels){
    const tracks=horizontalGuideTracks(boundaries,local,y,center)
    assert.equal(tracks.length,1)
    assert.deepEqual(tracks[0],[[0,y],[center,y],[.4,y]])
    assert(vertical.some(([x,stationY])=>x===center&&stationY===y))
  }
})

test('derived tracks stay within the cut perimeter and reject absent spans',()=>{
  assert.deepEqual(verticalGuideTracks(boundaries,local,.6,[.3]),[])
  assert.deepEqual(horizontalGuideTracks(boundaries,local,.9,.2),[])
  const [vertical]=verticalGuideTracks(boundaries,local,.2,[-4,.3,.3,4])
  assert(vertical.every(([x,y])=>x===.2&&y>=0&&y<=.8))
  assert.equal(vertical.filter(([,y])=>y===.3).length,1)
})

test('reference landmark follows translated asymmetric side intersections without a kink',()=>{
  const shiftedLocal=[[0,0],[.4,0],[.5,.8],[.1,.8],[0,0]]
  const shiftedBoundaries={top:[0,1],right:[1,2],bottom:[2,3],left:[3,4]}
  const chest=.31,waist=.57
  const center=.27
  const [vertical]=verticalGuideTracks(shiftedBoundaries,shiftedLocal,center,[chest,waist])
  assert(vertical)
  assert(vertical.every(([x])=>x===center))
  for(const y of [chest,waist]){
    const track=horizontalGuideTracks(shiftedBoundaries,shiftedLocal,y,center)
    assert.equal(track.length,1)
    assert.equal(track[0][1][0],center)
    assert(track[0][0][0]<center&&track[0][2][0]>center)
  }
})

test('disconnected material intervals keep each visible vertical segment',()=>{
  // Two separate rectangular cutline islands and one shared local axis.
  const islands=[[0,0],[.4,0],[.4,.3],[0,.3],[0,0],
    [0,.55],[.4,.55],[.4,.9],[0,.9],[0,.55]]
  const boundaries={
    upperTop:[0,1],upperRight:[1,2],upperBottom:[2,3],upperLeft:[3,4],
    lowerTop:[5,6],lowerRight:[6,7],lowerBottom:[7,8],lowerLeft:[8,9],
  }
  const tracks=verticalGuideTracks(boundaries,islands,.2,[.2,.6,.7])
  assert.equal(tracks.length,2)
  assert(tracks[0].every(([,y])=>y>=0&&y<=.3))
  assert(tracks[1].every(([,y])=>y>=.55&&y<=.9))
  assert(tracks[0].some(([,y])=>y===.2))
  assert(tracks[1].some(([,y])=>y===.6))
  assert(tracks[1].some(([,y])=>y===.7))
})

test('physical triangle union retains exact chest and waist crossings around holes',()=>{
  // Two squares separated by a real 20cm material gap in the SVG triangle fill.
  const points=[[0,0],[.4,0],[.4,.3],[0,.3],
    [0,.5],[.4,.5],[.4,.9],[0,.9]]
  const triangles=[[0,1,2],[0,2,3],[4,5,6],[4,6,7]]
  assert.deepEqual(materialGuideSpans(triangles,points,.2,true),[[0,.3],[.5,.9]])
  assert.deepEqual(materialGuideSpans(triangles,points,.4,false),[])
  const tracks=verticalGuideTracks({},points,.2,[.2,.65],triangles)
  assert.equal(tracks.length,2)
  assert(tracks[0].some(([,y])=>y===.2))
  assert(tracks[1].some(([,y])=>y===.65))
  assert(!tracks.some(track=>track.some(([,y])=>y>.3&&y<.5)))
})

test('choose a torso axis shared by chest and waist occupied fabric',()=>{
  // The upper panel is wider and offset; its middle is outside the waist.
  const points=[[0,0],[.9,0],[.9,.3],[0,.3],
    [.4,.3],[.8,.3],[.8,.8],[.4,.8]]
  const triangles=[[0,1,2],[0,2,3],[4,5,6],[4,6,7]]
  const x=sharedTorsoGuideX(triangles,points,.2,.6,.2)
  assert(Math.abs(x-.6)<1e-12)
  const chest=horizontalGuideTracks({},points,.2,x,null,triangles,true)
  const waist=horizontalGuideTracks({},points,.6,x,null,triangles,true)
  assert.equal(chest.length,1)
  assert.equal(waist.length,1)
  assert.equal(chest[0][1][0],x)
  assert.equal(waist[0][1][0],x)
  assert(verticalGuideTracks({},points,x,[.2,.6],triangles).some(track=>
    track.some(([,y])=>y===.2)&&track.some(([,y])=>y===.6)))
})

test('do not draw a misleading transverse center ring on a disconnected island',()=>{
  const points=[[0,0],[.2,0],[.2,.5],[0,.5],
    [.5,0],[.7,0],[.7,.5],[.5,.5]]
  const triangles=[[0,1,2],[0,2,3],[4,5,6],[4,6,7]]
  const paths=horizontalGuideTracks({},points,.25,.1,null,triangles,true)
  assert.equal(paths.length,1)
  assert(paths[0].every(([x])=>x<=.2))
})

test('no shared fabric column means no manufactured chest-to-waist axis',()=>{
  const points=[[0,0],[.2,0],[.2,.25],[0,.25],
    [.5,.45],[.7,.45],[.7,.8],[.5,.8]]
  const triangles=[[0,1,2],[0,2,3],[4,5,6],[4,6,7]]
  assert.equal(sharedTorsoGuideX(triangles,points,.15,.6,.1),null)
})

test('guide local frame exactly inverts translated, rotated and pivot-previewed panels',()=>{
  const material=[[.03,.01],[.37,.01],[.41,.7],[.06,.7]]
  const layout=[1.75,-.9],layoutAngle=Math.PI/2
  const layoutPoint=([x,y])=>[
    layout[0]+x*Math.cos(layoutAngle)-y*Math.sin(layoutAngle),
    layout[1]+x*Math.sin(layoutAngle)+y*Math.cos(layoutAngle),
  ]
  for(const preview of [
    null,
    {kind:'move',delta:[.19,-.23]},
    {kind:'rotate',center:[-1.25,.35],angle:Math.PI/5},
  ]){
    const points=material.map(p=>previewPoint(layoutPoint(p),preview))
    const origin=previewPoint(layoutPoint([0,0]),preview)
    const angle=layoutAngle+(preview?.kind==='rotate'?preview.angle:0)
    const frame=patternGuideLocalFrame(points,origin,angle)
    for(let i=0;i<material.length;i++){
      for(let j=0;j<2;j++){
        assert(Math.abs(frame.local[i][j]-material[i][j])<1e-10)
        assert(Math.abs(frame.toWorld(material[i])[j]-points[i][j])<1e-10)
      }
    }
    const triangles=[[0,1,2],[0,2,3]]
    const x=sharedTorsoGuideX(triangles,frame.local,.25,.58,.2)
    assert(Number.isFinite(x))
    const tracks=verticalGuideTracks({},frame.local,x,[.25,.58],triangles)
    assert(tracks.some(track=>track.some(([,y])=>y===.25)&&track.some(([,y])=>y===.58)))
    for(const track of tracks)for(const p of track){
      const world=frame.toWorld(p)
      const expected=previewPoint(layoutPoint(p),preview)
      assert(Math.hypot(world[0]-expected[0],world[1]-expected[1])<1e-10)
    }
  }
})

test('invalid frame input never produces guessed drafting coordinates',()=>{
  assert.throws(()=>patternGuideLocalFrame([[1,2]],[NaN,0],0),RangeError)
  assert.throws(()=>patternGuideLocalFrame([[1,2]],[0,0],NaN),RangeError)
  const result=patternGuideLocalFrame([[1,2],null],[-2,1],0)
  assert.deepEqual(result.local,[[3,1],null])
})
