// Pattern-only CAD rendering tokens. Visual dimensions are CSS pixels;
// geometry stays in native Rust material coordinates (metres).
export const PATTERN_VISUAL = Object.freeze({
  paper:'#ffffff',selectedPaper:'#ffffff',outline:'#32373b',selectedOutline:'#252d33',
  activeEdge:'#147ba5',hoverEdge:'#7b8d99',
  canvas:'#c7c7c7',gridMinor:'rgba(68,73,79,.15)',gridMajor:'rgba(63,70,77,.23)',
  vertex:'#333a40',inactiveVertex:'#858e94',vertexOutline:'#fff',selectedVertex:'#df8828',
  curveArm:'#6888bf',curveControlFill:'#fff',curveControlOutline:'#6888bf',
  freeCurvePoint:'#e8aa87',freeCurveOutline:'#bf6244',
  internalLine:'#8b79b5',selectedInternalLine:'#c18642',
})

export const PATTERN_METRICS=Object.freeze({
  cutline:.95,selectedCutline:1.2,activeCutline:1.5,
  contextPointRadius:2.4,inactivePointRadius:1.9,
  editPointRadius:2.85,selectedPointRadius:4.0,
  curveArm:1,curvePointRadius:4.5,pointStroke:.8,
})

/** Screen-sized SVG geometry in material-unit viewBox coordinates. */
export const pointRadiusInView=(pixels,screenUnit)=>patternScreenPixelsToView(pixels,screenUnit)

/** UI-only preview styling cannot affect saved pattern geometry. */
export const patternCutlinePresentation=({selected=false,selectedEdge=false,hovered=false,expressive=false}={})=>({
  stroke:selectedEdge?PATTERN_VISUAL.activeEdge:hovered?PATTERN_VISUAL.hoverEdge:selected?PATTERN_VISUAL.selectedOutline:PATTERN_VISUAL.outline,
  strokeWidth:selectedEdge?PATTERN_METRICS.activeCutline:hovered?PATTERN_METRICS.selectedCutline:selected?PATTERN_METRICS.selectedCutline:PATTERN_METRICS.cutline,
  strokeLinejoin:'round',strokeLinecap:'round',vectorEffect:'non-scaling-stroke',
  ...(expressive?{strokeDasharray:'6 4'}:{})
})

// Layer order is a rendering contract, independent of the active drafting tool.
// Native pattern entities and their coordinates must not be inferred from these styles.
export const PATTERN_LAYER_ORDER=Object.freeze([
  'paper','guides','construction','internal','sewing','cutline','notches',
  'inactive-points','active-points','curve-controls','measurements','hit-targets',
])

export const PATTERN_SEMANTIC=Object.freeze({
  cutline:Object.freeze({stroke:PATTERN_VISUAL.outline,width:PATTERN_METRICS.cutline}),
  internal:Object.freeze({stroke:PATTERN_VISUAL.internalLine,width:.8}),
  baseline:Object.freeze({stroke:'#8996a3',width:.75,dash:'5 3'}),
  grainline:Object.freeze({stroke:'#7c8996',width:.8,dash:'7 3'}),
  fold:Object.freeze({stroke:'#8c78ac',width:.9,dash:'3 3'}),
  guide:Object.freeze({stroke:'#98a2aa',width:.65,dash:'3 4'}),
  topstitch:Object.freeze({stroke:'#927d9f',width:.85,dash:'3 2'}),
  'seam-allowance':Object.freeze({stroke:'#929a9f',width:.7,dash:'5 3'}),
  sewing:Object.freeze({stroke:'#288fa4',width:.9}),
  notch:Object.freeze({stroke:'#e52b38',width:1}),
  measurement:Object.freeze({stroke:'#525e66',width:.75}),
})

// Glyphs are measured in *screen* CSS pixels.  The role selects identity;
// the state selects interaction emphasis.  Neither changes hit-test geometry.
export const PATTERN_POINT_GLYPHS=Object.freeze({
  'boundary-corner':Object.freeze({radius:2.4,shape:'circle',filled:true}),
  'smooth-curve':Object.freeze({radius:2.5,shape:'circle',filled:false}),
  'free-curve':Object.freeze({radius:3.25,shape:'circle',filled:true}),
  'split-point':Object.freeze({radius:2.5,shape:'diamond',filled:true}),
  internal:Object.freeze({radius:2.1,shape:'circle',filled:false}),
  'seam-endpoint':Object.freeze({radius:2.5,shape:'square',filled:true}),
  notch:Object.freeze({radius:2.4,shape:'diamond',filled:true}),
  'bezier-control':Object.freeze({radius:4.5,shape:'circle',filled:false}),
})

export const PATTERN_POINT_STATES=Object.freeze({
  inactive:Object.freeze({fill:PATTERN_VISUAL.inactiveVertex,stroke:'#ffffff',radiusDelta:-.35,opacity:.7}),
  normal:Object.freeze({fill:PATTERN_VISUAL.vertex,stroke:'#ffffff',radiusDelta:0,opacity:1}),
  hovered:Object.freeze({fill:PATTERN_VISUAL.hoverEdge,stroke:'#ffffff',radiusDelta:.45,opacity:1}),
  selected:Object.freeze({fill:PATTERN_VISUAL.selectedVertex,stroke:'#ffffff',radiusDelta:1,opacity:1}),
  'control-active':Object.freeze({fill:PATTERN_VISUAL.curveControlFill,stroke:PATTERN_VISUAL.curveControlOutline,radiusDelta:0,opacity:1}),
})

/** Style for an authored CAD entity. Stroke is screen-sized via SVG vectorEffect. */
export function patternSemanticStroke(role,{selected=false,hovered=false,inactive=false}={}) {
  const token=PATTERN_SEMANTIC[role]
  if (!token) throw new RangeError(`Unknown pattern semantic role: ${role}`)
  const stroke=selected?(role==='internal'?PATTERN_VISUAL.selectedInternalLine:PATTERN_VISUAL.activeEdge)
    :hovered?PATTERN_VISUAL.hoverEdge:token.stroke
  return {
    stroke,strokeWidth:token.width+(selected ? .35 : hovered ? .2 : 0),
    strokeDasharray:token.dash??'none',
    opacity:inactive ? .52 : 1,vectorEffect:'non-scaling-stroke',fill:'none',
    strokeLinecap:'round',strokeLinejoin:'round',
  }
}

/** All returned radii/widths are CSS pixels, not material coordinates. */
export function patternPointGlyph(role,{state='normal'}={}) {
  const glyph=PATTERN_POINT_GLYPHS[role]
  const appearance=PATTERN_POINT_STATES[state]
  if (!glyph) throw new RangeError(`Unknown pattern point role: ${role}`)
  if (!appearance) throw new RangeError(`Unknown pattern point state: ${state}`)
  const isControl=role==='bezier-control'
  const fill=(!glyph.filled||isControl)?PATTERN_VISUAL.curveControlFill:appearance.fill
  return Object.freeze({
    shape:glyph.shape,radius:glyph.radius+appearance.radiusDelta,
    fill,stroke:isControl?PATTERN_VISUAL.curveControlOutline:appearance.stroke,
    strokeWidth:PATTERN_METRICS.pointStroke,opacity:appearance.opacity,
  })
}

/** Material-space conversion for a screen-sized glyph, valid for any positive zoom. */
export function patternScreenPixelsToView(pixels,screenUnit) {
  if(!Number.isFinite(pixels)||pixels<0||!Number.isFinite(screenUnit)||screenUnit<=0)
    throw new RangeError('pixels must be nonnegative and screenUnit must be positive and finite')
  const radius=pixels*screenUnit
  if(!Number.isFinite(radius)) throw new RangeError('Screen-to-view radius overflow')
  return radius
}

/** Annotation text is display-only; approximation must remain explicitly marked. */
export function patternMeasurementLabel(value,{unit='cm',approximate=false,digits=2}={}) {
  if(!Number.isFinite(value)||!Number.isInteger(digits)||digits<0||digits>6)
    throw new RangeError('Invalid measurement or precision')
  if(unit!=='cm'&&unit!=='in'&&unit!=='mm') throw new RangeError('Unsupported measurement unit')
  return `${approximate?'≈ ':''}${value.toFixed(digits)} ${unit}`
}
