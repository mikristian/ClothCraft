import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PATTERN_LAYER_ORDER,PATTERN_SEMANTIC,PATTERN_POINT_GLYPHS,
  patternCutlinePresentation,patternSemanticStroke,patternPointGlyph,
  pointRadiusInView,patternScreenPixelsToView,patternMeasurementLabel,
} from './patternVisualTokens.js'

test('semantic layers draw structural contour above guides and below active controls',()=>{
  const position=name=>PATTERN_LAYER_ORDER.indexOf(name)
  assert.ok(position('guides')<position('cutline'))
  assert.ok(position('cutline')<position('active-points'))
  assert.ok(position('active-points')<position('curve-controls'))
  assert.equal(new Set(PATTERN_LAYER_ORDER).size,PATTERN_LAYER_ORDER.length)
  assert.equal(patternCutlinePresentation().strokeWidth,.95)
})

test('all CAD strokes use fixed screen widths and semantic dash patterns',()=>{
  for(const role of Object.keys(PATTERN_SEMANTIC)) {
    const style=patternSemanticStroke(role)
    assert.equal(style.vectorEffect,'non-scaling-stroke')
    assert.ok(style.strokeWidth>0)
    assert.equal(style.fill,'none')
  }
  assert.notEqual(patternSemanticStroke('fold').strokeDasharray,'none')
  assert.equal(patternSemanticStroke('cutline').strokeDasharray,'none')
  assert.ok(patternSemanticStroke('cutline',{selected:true}).strokeWidth>patternSemanticStroke('cutline').strokeWidth)
  assert.ok(patternSemanticStroke('cutline',{inactive:true}).opacity<1)
  assert.throws(()=>patternSemanticStroke('missing'),RangeError)
})

test('point glyphs preserve identity and selection changes only presentation',()=>{
  for(const role of Object.keys(PATTERN_POINT_GLYPHS)) {
    const inactive=patternPointGlyph(role,{state:'inactive'})
    const selected=patternPointGlyph(role,{state:'selected'})
    assert.equal(inactive.shape,selected.shape)
    assert.ok(selected.radius>inactive.radius)
    assert.ok(inactive.radius>0)
  }
  assert.equal(patternPointGlyph('bezier-control').fill,'#fff')
  assert.equal(patternPointGlyph('internal').fill,'#fff')
  assert.throws(()=>patternPointGlyph('boundary-corner',{state:'wrong'}),RangeError)
})

test('glyph pixel size is invariant when converted across positive view scales',()=>{
  for(const zoom of [.25,.5,1,2,4]) {
    const unit=.002/zoom
    const radius=patternPointGlyph('free-curve',{state:'selected'}).radius
    assert.equal(patternScreenPixelsToView(radius,unit)/unit,radius)
  }
  for(const unit of [0,-1,Infinity,NaN]) assert.throws(()=>patternScreenPixelsToView(3,unit),RangeError)
})

test('2D point radii fail closed when material-view conversion overflows or zoom is invalid',()=>{
  assert.equal(pointRadiusInView(3,.002),.006)
  assert.equal(patternScreenPixelsToView(3,.002),.006)
  for(const convert of [pointRadiusInView,patternScreenPixelsToView]) {
    assert.throws(()=>convert(Number.MAX_VALUE,2),RangeError)
    assert.throws(()=>convert(2,Number.MAX_VALUE),RangeError)
    assert.throws(()=>convert(3,0),RangeError)
    assert.throws(()=>convert(-1,.002),RangeError)
    assert.throws(()=>convert(NaN,.002),RangeError)
  }
})

test('measurement annotation distinguishes exact and approximate readouts',()=>{
  assert.equal(patternMeasurementLabel(16.85),'16.85 cm')
  assert.equal(patternMeasurementLabel(16.85,{unit:'in',approximate:true,digits:1}),'≈ 16.9 in')
  assert.throws(()=>patternMeasurementLabel(NaN),RangeError)
})
