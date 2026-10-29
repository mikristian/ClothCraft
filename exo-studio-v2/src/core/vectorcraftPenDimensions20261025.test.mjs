import test from 'node:test'
import assert from 'node:assert/strict'
import {dimensionedPenPoint,formatPenDistance,formatPenDistancePrecise,penPreviewAtDisplayedLength,parsePenAngle,parsePenDimension,convertPenDimension,penDraftSegmentMetrics,sampledPenLineMetrics,penInlineLabelPoint} from './vectorcraftPenDimensions20261025.js'

test('exact lengths convert to native metres without changing the angle of the cursor',()=>{
  for(const [length,unit] of [['25.4','mm'],['2.54','cm'],['1','in'],['0.0254','m']]){
    const point=dimensionedPenPoint([.2,.3],[.2,.6],{length,unit})
    assert.ok(Math.abs(point[0]-.2)<1e-12)
    assert.ok(Math.abs(point[1]-.3254)<1e-12)
  }
  assert.equal(formatPenDistance(.0254,'mm'),'25.4 mm')
  assert.equal(convertPenDimension('25.4','mm','cm'),'2.54')
  assert.equal(convertPenDimension('1','in','mm'),'25.4')
  assert.equal(convertPenDimension('','mm','cm'),'')
})

test('exact angle turns segment in material space with positive SVG y downward',()=>{
  const a=dimensionedPenPoint([0,0],[1,0],{length:'100',angle:'90',unit:'mm'})
  assert.ok(Math.abs(a[0])<1e-12)
  assert.ok(Math.abs(a[1]-.1)<1e-12)
  assert.deepEqual(dimensionedPenPoint([0,0],[.15,.2],{angle:'0',unit:'cm'}),[.25,0])
  assert.equal(parsePenAngle(''),null)
  assert.equal(parsePenDimension('','cm'),null)
})

test('invalid or dangerous measurements fail instead of writing a bad native polygon',()=>{
  for(const length of ['0','-1','NaN','Infinity','abc','1000000'])
    assert.throws(()=>dimensionedPenPoint([0,0],[1,0],{length,unit:'mm'}))
  assert.throws(()=>dimensionedPenPoint([0,0],[1,0],{length:'1',unit:'unsupported'}))
  assert.throws(()=>dimensionedPenPoint([0,0],[1,0],{length:'1',angle:'NaN'}))
  assert.throws(()=>dimensionedPenPoint([0,0],[0,0],{}))
  assert.throws(()=>dimensionedPenPoint([0,0],[1,0],{angle:'Infinity'}))
})

test('segment readout measures curved arc independently of the selected chord',()=>{
  const points=[[0,0],[.1,0],[.1,.2]]
  const straight=penDraftSegmentMetrics(points,[])
  assert.equal(straight.length,2)
  assert.ok(Math.abs(straight[0].length-.1)<1e-12)
  const curved=penDraftSegmentMetrics(points,[[0,.04],[0,.04],[0,0]])
  assert.equal(curved[0].curved,true)
  assert.ok(curved[0].length>curved[0].chord)
  assert.equal(curved[1].curved,true)
  assert.ok(curved[1].length>0)
})

test('live Pen measurement starts after first point and sits 13 screen pixels below provisional line',()=>{
  const anchor=[.1,.2],firstHover=[.2,.2],furtherHover=[.4,.2],unit=.0004
  const first=penInlineLabelPoint(anchor,firstHover,unit)
  const next=penInlineLabelPoint(anchor,furtherHover,unit)
  assert.ok(Math.abs(first.x-.15)<1e-12)
  assert.ok(Math.abs(first.y-.2052)<1e-12)
  assert.ok(Math.abs(next.y-.2052)<1e-12)
  assert.ok(next.x>first.x)
  assert.equal(formatPenDistance(Math.hypot(...firstHover.map((v,i)=>v-anchor[i])),'mm'),'100.0 mm')
  assert.equal(formatPenDistance(Math.hypot(...furtherHover.map((v,i)=>v-anchor[i])),'mm'),'300.0 mm')
})

test('readout follows actual bent cubic halfway, rather than straight-line chord',()=>{
  const a=[0,0],b=[.2,0],controls=[[.04,-.06],[.16,-.06]],scale=.001
  const pos=penInlineLabelPoint(a,b,scale,{controls})
  assert.ok(pos)
  assert.ok(Math.abs(pos.x-.1)<1e-12)
  assert.ok(Math.abs(pos.y-(-.045+.013))<1e-12)
  const measured=penDraftSegmentMetrics([a,b],[[.04,-.06],[.04,.06]])
  assert.ok(measured[0].length>.2)
  assert.ok(measured[0].midpoint[1]<0)
  for(const invalid of [0,-.001,NaN])assert.equal(penInlineLabelPoint(a,b,invalid),null)
  assert.equal(penInlineLabelPoint(a,b,scale,{controls:[[0,0],[Infinity,0]]}),null)
})

test('28.00-inch CLO Pen preview is the exact material length authored by the next click',()=>{
  const a=[-.3,.12],cursor=[a[0]+.711176,.12]
  const target=penPreviewAtDisplayedLength(a,cursor,'in')
  const metric=Math.hypot(...target.map((v,i)=>v-a[i]))
  assert.equal(formatPenDistancePrecise(metric,'in'),'28.00 in')
  assert.ok(Math.abs(metric-28*.0254)<1e-12,'displayed 28.00 in must be EXACT 28 inches in native metres')
  assert.equal(formatPenDistancePrecise(metric,'cm'),'71.12 cm')
  assert.equal(formatPenDistancePrecise(metric,'mm'),'711.2 mm')
  assert.equal(formatPenDistancePrecise(0,'in'),'0.00 in')
  assert.equal(penPreviewAtDisplayedLength(a,cursor,'unsupported'),null)
  assert.equal(penPreviewAtDisplayedLength(a,[Infinity,0],'in'),null)
})

test('rounding Pen cursor near unit step updates both the label and the clicked native chord',()=>{
  const a=[.11,.07],p=[.11,.361119]
  const chosen=penPreviewAtDisplayedLength(a,p,'in')
  const label=formatPenDistancePrecise(Math.hypot(...chosen.map((v,i)=>v-a[i])),'in')
  assert.ok(/^11\.46 in$/.test(label))
  assert.ok(Math.abs(Math.hypot(...chosen.map((v,i)=>v-a[i]))-11.46*.0254)<1e-12)
})

test('selected curved guides label physical polyline arc at half travelled distance',()=>{
  const sampled=[[0,0],[0,.2],[.1,.2],[.4,.2]]
  const result=sampledPenLineMetrics(sampled)
  assert.ok(result)
  assert.ok(Math.abs(result.length-.6)<1e-12)
  assert.ok(Math.abs(result.midpoint[0]-.1)<1e-12)
  assert.ok(Math.abs(result.midpoint[1]-.2)<1e-12)
  assert.deepEqual(result.normal,[-0,1])
  assert.equal(sampledPenLineMetrics([[0,0],[0,0]]),null)
  assert.equal(sampledPenLineMetrics([[0,0],[Infinity,0]]),null)
})
