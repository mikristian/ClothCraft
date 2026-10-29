import {presetForFabric} from "../core/clothcraftFabrics.js"
import {proposeGraphicCanvasResize20261025} from '../core/graphicCanvasResize20261025.js'
import {PatternReferencesSvgLayer20261025} from './PatternReferencePanel20261025.jsx'
import React, {useEffect, useId, useMemo, useRef, useState} from 'react'
import ClothCraftCornerTools from './ClothCraftCornerTools.jsx'
import {PatternReferenceImageLayer, PatternReferenceImageControls, usePatternReferenceImage} from './PatternReferenceImage.jsx'
import {droppedReferenceImage,referenceImageDragAvailable} from '../core/referenceImageDrop20261028.js'
import ClothCraftStudioSilhouette from './ClothCraftStudioSilhouette.jsx'
import './ClothCraftSegmentSewing.css'
import {cursorForTool} from '../core/toolCursors.js'
import {freeSewingPointAtFraction, freeSewingRangePoints, projectFreeSewingPoint} from '../core/freeSewingGeometry.js'
import {getBounds, frontAvatarRegistration, horizontalPatternSpans, previewPoint, rotatedLayoutAroundCenter, boundarySegments} from '../core/clothcraft2dGeometry.js'
import {horizontalGuideTracks,verticalGuideTracks,sharedTorsoGuideX,patternGuideLocalFrame,armpitChestReference} from '../core/patternGuideTracks.js'
import {sampleInternalCurve,initialInternalTangents} from './nativeInternalCurve.js'
import {cubicLength,editPatternBezierHandle,previewPatternAnchorMove,patternEditingControls,visibleTangent,dragPatternAnchorHandles,reshapePatternBezierSegment} from '../core/vectorPatternBezier.js'
import {addNativeFreeCurvePoint,closestFreeCurveParameter,evaluateFreeCurve,moveNativeFreeCurvePoint,editNativeFreeCurveTangent,cubicDerivativeAt,freeCurveBase,removeNativeFreeCurvePoint,arclengthToFreeCurvePoint} from '../core/nativeFreeCurvePoints.js'
import {fitPencilStroke,pathCubicControls} from '../core/vectorFreehandFit.js'
import {mirrorHalfPencilDraft} from '../core/mirroredPencilDraft.js'
import {nativeShapeBuilderBlockers} from '../core/nativeShapeBuilderPreflight.js'
import {shapeBuilderWorldToMaterial} from '../core/shapeBuilderCoordinateAdapter.js'
import {teeBalanceNotchCommands} from '../core/patternSewingNotches.js'
import {preflightNativeCutMark20261025} from '../core/nativeCutMarkPreflight20261025.js'
import {shapePoints} from './FoamPaddingNativeOverlay.jsx'
import {measureNativeSelection} from '../core/clothcraftSelectionMetrics.js'
import {freeTangentDragDelta} from '../core/freeTangentDrag.js'
import {sewingLengthDiagnostic} from '../core/sewingLengthDiagnostics.js'
import {samplePatternSewingGuideIndices} from '../core/patternSewingGuideSampling.js'
import {seamAllowancePreviewPoints} from '../core/patternAllowancePreview.js'
import {sideCurveStation,torsoSideCurveStations,curveDraftDimensions} from '../core/patternCurveDrafting.js'
import {sampleGuideHalfCurve} from '../core/patternGuideHalfCurves.js'
import {vectorcraftAnchorKind} from '../core/vectorcraftAnchorPort.js'
import {parkOpenPenPath,restoreOpenPenPath} from '../core/vectorcraftPenSession20261029.js'
import {smoothNativePatternAnchor} from '../core/vectorcraftSmoothAnchor20261029.js'
import {nativePatternAnchorAt} from '../core/vectorcraftNativeAnchorHit20261029.js'
import {cornerWidgetGeometry,cornerWidgetDragHandle,previewNativeCornerDrag} from '../core/vectorcraftCornerWidget20261029.js'
import {penTangent,penCubicPath,insertPenAnchor,penSegmentAt,curvePenAnchor,reshapePenDraftSegment} from '../core/vectorcraftPenGesture20261023.js'
import {resumePausedPenFromAnchor} from '../core/vectorPenResume20261028.js'
import {dimensionedPenPoint,parsePenDimension,convertPenDimension,penDraftSegmentMetrics,sampledPenLineMetrics,formatPenDistance,formatPenDistancePrecise,penPreviewAtDisplayedLength,penInlineLabelPoint, PEN_LENGTH_UNITS} from '../core/vectorcraftPenDimensions20261025.js'
import {formatDisplayMeasurement20261025} from '../core/measurementDisplayUnits20261025.js'
import {moveCloNativePolygonPoints20261025} from '../core/cloNativeMultiPointEdit20261025.js'
import {planNativePatternGroupMove20261025} from '../core/nativePatternGroupMove20261025.js'
import {proposeCloNativeChangeLength20261025} from '../core/cloNativeChangeLength20261025.js'
import AccuMarkGradingOverlay20261023 from './AccuMarkGradingOverlay20261023.jsx'
import NativeGradingPOMOverlay20261025 from './NativeGradingPOMOverlay20261025.jsx'
import './PatternAuditRefinements.css'
import {PATTERN_VISUAL,PATTERN_METRICS,pointRadiusInView,patternCutlinePresentation,patternPointGlyph,patternSemanticStroke} from '../core/patternVisualTokens.js'
import CadViewportRulers20261023 from './CadViewportRulers20261023.jsx'
import {cadColor20261023,cadDotStep20261023} from '../core/cadDotAppearance20261023.js'
import {cadAutoContrastColors} from '../core/cadAutoContrast.js'
import '../cadAutoContrast.css'

const COLORS = ['#527e91', '#d29465', '#7a9e79', '#a889b2', '#c3ab5d', '#76a5a4']
const SEAM_COLORS = ['#eb775e', '#55aecd', '#dbb44c', '#8dc575', '#a98cd9', '#dd91b9']
const CLO_HOVER_BLUE = '#009dff'
const CLO_CURVE_ACTIVE_YELLOW = '#ffe600'
// Solid CAD control-point fills must contrast with light/white fabric.
// Vertex, curve and seam correspondence dots have distinct visual roles.
const POINT_COLORS = {vertex:PATTERN_VISUAL.vertex,selectedVertex:PATTERN_VISUAL.selectedVertex,curve:PATTERN_VISUAL.curveControlOutline,outline:PATTERN_VISUAL.vertexOutline}
// CLO-style drafting hierarchy; presentation never modifies the pattern UVs.
// CLO-inspired drafting contrast: neutral pattern paper, dark stitch contours,
// and a distinct amber active selection without changing native geometry.
const INITIAL_VIEW = [-1.1, -.24, 2.2, 2]
const finite = value => Number.isFinite(value)
const SEWING_CURSOR = "url('/cursors/sewing-machine.svg') 5 3, crosshair"
const PLEAT_CURSOR = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><path d="M4 3v21M11 3v21M18 3v21" fill="none" stroke="#152b3b" stroke-width="3"/><path d="M4 3v21M11 3v21M18 3v21" fill="none" stroke="#e6f7ff" stroke-width="1.5"/><path d="m21 9 4 4-4 4" fill="none" stroke="#152b3b" stroke-width="2"/></svg>')}") 4 3, crosshair`

function insideTriangle(p, a, b, c) {
  if (!a || !b || !c) return false
  const cross = (u, v, w) => (v[0] - u[0]) * (w[1] - u[1]) - (v[1] - u[1]) * (w[0] - u[0])
  const u = cross(a, b, p), v = cross(b, c, p), w = cross(c, a, p)
  const epsilon = 1e-9
  return (u >= -epsilon && v >= -epsilon && w >= -epsilon) ||
    (u <= epsilon && v <= epsilon && w <= epsilon)
}

function transform(panel, range, uv) {
  const a = (panel.layout_rotation_degrees || 0) * Math.PI / 180
  return [range.layout[0] + uv[0] * Math.cos(a) - uv[1] * Math.sin(a),
    range.layout[1] + uv[0] * Math.sin(a) + uv[1] * Math.cos(a)]
}

function weighted(weights, values) {
  if (!Array.isArray(weights) || !values.length) return null
  const result = [0, 0]
  for (const [index, weight] of weights) {
    if (!values[index] || !finite(weight)) return null
    result[0] += values[index][0] * weight
    result[1] += values[index][1] * weight
  }
  return result
}

// A yellow handle alone is not a real CLO-style shape preview. Build the
// temporarily filled pattern outline directly from the same canonical cubic
// and free-point evaluator Rust compiles. Only native Shape success changes
// the saved mesh; until Apply, this is explicitly a visual proposal.
function proposedPaperOutline(panel,range,polygon,preview=null) {
  if(!polygon?.edges?.length||!Array.isArray(polygon.points)||
    polygon.edges.length!==polygon.points.length)return null
  const points=[]
  for(const edge of polygon.edges){
    for(let sample=0;sample<24;sample++){
      const local=evaluateFreeCurve(polygon,edge,sample/24)
      if(!Array.isArray(local)||local.some(v=>!Number.isFinite(v)))return null
      const global=previewPoint(transform(panel,range,local),preview)
      if(global?.length!==2||global.some(v=>!Number.isFinite(v)))return null
      points.push(global)
    }
  }
  return points.length>=3?`M${points.map(p=>p.join(',')).join('L')}Z`:null
}

// Each visible interval owns its own hit target; shared nodes are drawn once
// per connected guide. They follow model-space vertices at any camera zoom.
function GuideSegment({panelId,kind,id,a,b,color='#918fae',dashed=false,nativeLineId=null,selectedGuide,hoveredGuideId,onSelectGuide,screenUnit=1,curveOffset=null,curveAngle=0,curveMode=false,curveDragging=false}) {
  const active=selectedGuide?.id===id
  const hot=hoveredGuideId===id
  const lengthMetres=Math.hypot(b[0]-a[0],b[1]-a[1])
  // Real CLO-style guide strokes run all the way between the actual dots.
  // Previous midpoint shortening created false, floating visual endpoints.
  // Individual half IDs still select and color only their own line.
  const selected={id,panelId,kind,lengthMetres,points:[a,b]}
  const editable=curveMode&&['chest','belly'].includes(kind)
  const bent=Array.isArray(curveOffset)&&Math.hypot(...curveOffset)>.000025
  const guideCurve=editable||bent?sampleGuideHalfCurve(a,b,curveOffset||[0,0],curveAngle):null
  const pathPoints=guideCurve?.points.map(p=>p.join(',')).join(' ')
  const stroke=curveDragging||editable&&active?CLO_CURVE_ACTIVE_YELLOW:
    hot?CLO_HOVER_BLUE:active?'#ed9d26':color
  return <g data-2d-construction={kind} data-guide-id={id} data-guide-kind={kind}
    data-guide-panel={panelId} data-guide-segment={id} data-hovered={String(hot)}
    data-native-line-id={nativeLineId||undefined}>
    {guideCurve?<polyline data-guide-curve="true" data-curvable-guide-half={id}
      points={pathPoints} fill="none"
      {...patternSemanticStroke('guide',{selected:active,hovered:hot})}
      stroke={stroke} strokeWidth={curveDragging||active&&editable?2.75:hot?3:1.15}
      strokeLinejoin="round" pointerEvents="none"/>:
    <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]}
      {...patternSemanticStroke('guide',{selected:active,hovered:hot})}
      stroke={stroke}
      strokeWidth={hot?3:dashed?2.5:1.15}
      // Non-scaling strokes use CSS-pixel dash lengths, not material metres.
      // Previous dash lengths multiplied by screenUnit became microscopic
      // and could look like a faint solid or disappear completely.
      strokeDasharray={dashed?'6 4':undefined} pointerEvents="none"/>}
    {editable&&(hot||active||curveDragging)&&guideCurve&&
      <g data-guide-half-curve-knob={id} pointerEvents="none">
        <line x1={guideCurve.middle[0]} y1={guideCurve.middle[1]}
          x2={guideCurve.control[0]} y2={guideCurve.control[1]}
          stroke={CLO_CURVE_ACTIVE_YELLOW} strokeWidth="1.25"
          vectorEffect="non-scaling-stroke"/>
        <circle cx={guideCurve.points[Math.floor(guideCurve.points.length/2)][0]}
          cy={guideCurve.points[Math.floor(guideCurve.points.length/2)][1]}
          r={3*screenUnit} fill="#fff8b4" stroke={CLO_CURVE_ACTIVE_YELLOW}
          strokeWidth="1.25" vectorEffect="non-scaling-stroke"/>
      </g>}
    {/* Hit testing belongs to the parent SVG in screen pixels. Overlapping
        3mm hem references must not steal each other's mouse target. */}
    {onSelectGuide&&<line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="transparent"
      strokeWidth=".018" pointerEvents="none"/>}
  </g>
}

function GuideNodes({panelId,kind,points,selectedGuide,hoveredGuideId=null,screenUnit=1,reuseNativeEndpoints=false}) {
  const active=selectedGuide?.kind===kind||
    (selectedGuide?.nativeLineId&&kind===`native:${selectedGuide.nativeLineId}`)
  return <g data-2d-shared-nodes={kind} pointerEvents="none">
    {points.map((p,i)=>{
      // The real authored armpit corner dot already exists at each chest end.
      // Never draw a second guide dot on the exact same pixel.
      if(reuseNativeEndpoints&&(i===0||i===points.length-1))return null
      const onLeft=hoveredGuideId?.endsWith(':left'),onRight=hoveredGuideId?.endsWith(':right')
      const sameTrack=hoveredGuideId?.startsWith(panelId+':'+kind+':')
      // The midpoint belongs to BOTH half segments: keep it neutral so a
      // hover never appears to tint the opposite half through the shared dot.
      const hot=sameTrack&&((i===0&&onLeft)||(i===points.length-1&&onRight))
      const selectedHere=active&&(!selectedGuide?.id||
        (i===0&&selectedGuide.id.endsWith(':left'))||
        (i===points.length-1&&selectedGuide.id.endsWith(':right'))||
        (i>0&&i<points.length-1))
      return <circle key={i} data-2d-shared-node={`${panelId}:${kind}:${i}`}
        data-guide-node-hovered={String(Boolean(hot))}
        cx={p[0]} cy={p[1]} r={(selectedHere?3:2.25)*screenUnit}
        fill={hot?'#eefaff':selectedHere?'#fff1d5':'#f7f8f7'}
        stroke={hot?CLO_HOVER_BLUE:selectedHere?'#e49a37':'#8c9296'}
        strokeWidth={hot?1.6:selectedHere?1.1:.8} vectorEffect="non-scaling-stroke"/>
    })}
  </g>
}

// Physically authored Rust InternalLines render on any garment panel and keep
// stable per-line IDs, independently of the illustrative drafting references.
function NativeInternalLines({panel,range,preview,onSelectGuide,selectedGuide,hoveredGuideId,screenUnit=1,
  activeInternalLine,curveMode,onSelectCurve,onStartTangent,handlePreview}) {
  return <g data-native-internal-lines-panel={panel.id}>
    {(panel.polygon?.lines||[]).map(line=>{
      const points=(line.points||[]).map(uv=>previewPoint(transform(panel,range,uv),preview))
      if(points.length<2)return null
      return <g key={line.id} data-native-internal-line={`${panel.id}:${line.id}`}>
        {points.slice(1).map((pt,i)=>{
          const liveTangent=index=>{
            const tangent=line.tangents?.[index]||[0,0]
            const moved=handlePreview?.panelId===panel.id&&
              handlePreview.anchor===`l:${line.id}:${index}`
            return moved?tangent.map((v,j)=>v+(handlePreview.delta?.[j]||0)):tangent
          }
          const sampled=sampleInternalCurve(line.points[i],line.points[i+1],
            liveTangent(i),liveTangent(i+1))
            .map(p=>previewPoint(transform(panel,range,p),preview))
          const id=`${panel.id}:native:${line.id}:${i}`
          const active=selectedGuide?.id===id
          const hot=hoveredGuideId===id
          const stroke=hot?CLO_HOVER_BLUE:active?'#ed9d26':'#7c5bad'
          const shape=sampled.map(p=>p.join(',')).join(' ')
          return <g key={i} data-2d-construction="native-internal-line"
            data-guide-id={id} data-guide-kind="native-internal-line"
            data-guide-panel={panel.id} data-guide-segment={id}
            data-native-line-id={line.id} data-hovered={String(hot)}>
            <polyline data-guide-curve="true" points={shape} {...patternSemanticStroke('internal',{selected:active,hovered:hot})}
              stroke={handlePreview?.panelId===panel.id&&handlePreview.anchor?.startsWith(`l:${line.id}:`)
                ?'#facc15':stroke}
              strokeLinecap="round" strokeLinejoin="round" fill="none" pointerEvents="none"/>
            {curveMode&&<polyline data-internal-curve-hit={`${panel.id}:${line.id}:${i}`}
              points={shape} stroke="transparent" strokeWidth="10" vectorEffect="non-scaling-stroke" fill="none"
              pointerEvents="stroke" style={{cursor:'pointer'}}
              title="Click to edit curve · Option-click to straighten"
              onPointerDown={event=>event.stopPropagation()}
              onClick={event=>{event.stopPropagation();onSelectCurve?.(panel,line,event.altKey)}}/>}
          </g>
        })}
        <GuideNodes panelId={panel.id} kind={`native:${line.id}`} points={points} selectedGuide={selectedGuide} screenUnit={screenUnit}/>
        {curveMode&&activeInternalLine?.panel===panel.id&&activeInternalLine?.line===line.id&&
          points.map((p,i)=>{
            const tangent=line.tangents?.[i]||[0,0]
            const activeHandle=handlePreview?.panelId===panel.id&&handlePreview.anchor===`l:${line.id}:${i}`
            const moved=handlePreview?.panelId===panel.id&&handlePreview.anchor===`l:${line.id}:${i}`
              ?handlePreview.delta:[0,0]
            const endUV=line.points[i].map((n,j)=>n+tangent[j]+moved[j])
            const handle=previewPoint(transform(panel,range,endUV),preview)
            return <g key={i} data-internal-control-group={`${panel.id}:${line.id}:${i}`}>
              <line x1={p[0]} y1={p[1]} x2={handle[0]} y2={handle[1]}
                stroke={activeHandle?'#facc15':PATTERN_VISUAL.curveArm} strokeWidth={activeHandle?2:1} vectorEffect="non-scaling-stroke" pointerEvents="none"/>
              <circle cx={handle[0]} cy={handle[1]} r={PATTERN_METRICS.curvePointRadius*screenUnit}
                data-internal-curve-handle={`${panel.id}:${line.id}:${i}`}
                data-control-point="internal-curve" data-active-curve-handle={String(Boolean(activeHandle))}
                fill={activeHandle?'#fef08a':PATTERN_VISUAL.curveControlFill} stroke={activeHandle?'#eab308':PATTERN_VISUAL.curveControlOutline} strokeWidth={activeHandle?1.6:.8} vectorEffect="non-scaling-stroke"
                style={{cursor:'crosshair'}}
                onPointerDown={event=>onStartTangent?.(event,panel,`l:${line.id}:${i}`)}/>
            </g>
          })}
      </g>
    })}
  </g>
}

function guideGeometryAt(group,svg,clientX,clientY) {
  const line=group?.querySelector('polyline[data-guide-curve],line')
  const matrix=line?.getScreenCTM()
  if(!matrix)return null
  const polyline=line.tagName.toLowerCase()==='polyline'
  const pts=polyline
    ?(line.getAttribute('points')||'').trim().split(/\s+/).map(item=>item.split(',').map(Number))
    :[[Number(line.getAttribute('x1')),Number(line.getAttribute('y1'))],
      [Number(line.getAttribute('x2')),Number(line.getAttribute('y2'))]]
  if(pts.length<2||pts.some(p=>p.length!==2||p.some(n=>!Number.isFinite(n))))return null
  const screen=pts.map(([x,y])=>{
    const p=svg.createSVGPoint()
    p.x=x;p.y=y
    return p.matrixTransform(matrix)
  })
  let distance=Infinity,lengthMetres=0
  for(let i=1;i<pts.length;i++){
    const a=screen[i-1],b=screen[i],dx=b.x-a.x,dy=b.y-a.y
    const len2=dx*dx+dy*dy
    if(len2>.001){
      const t=Math.max(0,Math.min(1,((clientX-a.x)*dx+(clientY-a.y)*dy)/len2))
      distance=Math.min(distance,Math.hypot(clientX-a.x-dx*t,clientY-a.y-dy*t))
    }
    lengthMetres+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1])
  }
  return {distance,lengthMetres,points:[pts[0],pts.at(-1)],pathPoints:pts}
}

// Decorative drafting marks remain distinct from physically authored Rust
// notches/seam allowances/internal lines until the user creates native data.
function ConstructionGuides({panel, range, boundaries, uv, triangles, clipId, preview, onSelectGuide, selectedGuide, hoveredGuideId, showNotchReferences=true, onCreateGuideLine,screenUnit=1,nativeCornerNodesVisible=false,editableSideStations=false,curveMode=false,curveOffsets=null,curveDraft=null}) {
  const identity=`${panel?.id || ''} ${panel?.name || ''}`
  const torso=/front|back|bodice|torso/i.test(identity)
  if (!uv?.length) return null
  const angle=((panel.layout_rotation_degrees||0)*Math.PI/180)+(preview?.kind==='rotate'?preview.angle:0)
  const origin=previewPoint(transform(panel,range,[0,0]),preview)
  const {local,toWorld}=patternGuideLocalFrame(uv,origin,angle)
  const outline=Object.values(boundaries||{}).flat().map(i=>local[i]).filter(Boolean)
  const bounds=getBounds(outline)
  if (!bounds||bounds.width<.12||bounds.height<.10) return null
  const blue='#8f91ae',red='#b18a8d'
  const torsoSides=boundaries?.['side-left']&&boundaries?.['side-right']
    ? {'side-left':boundaries['side-left'],'side-right':boundaries['side-right']} : null
  const centerAtY=y=>{
    const sideSpans=torsoSides?horizontalPatternSpans(torsoSides,local,y):[]
    const fullSpans=horizontalPatternSpans(boundaries,local,y)
    const span=[...(sideSpans.length===1?sideSpans:fullSpans)].sort((a,b)=>(b[1]-b[0])-(a[1]-a[0]))[0]
    return span?(span[0]+span[1])/2:bounds.cx
  }
  const underarms=torso?armpitChestReference(panel.polygon):null
  const chestY=underarms?.y??bounds.minY+bounds.height*.46
  const waistY=bounds.minY+bounds.height*.64
  // The visually required center axis is not optional just because a very
  // concave edited panel has no column shared at two stations. Fall back to
  // its physical chest-side center and keep each visible material interval
  // separately clipped rather than drawing through empty cloth.
  const centerX=torso?(sharedTorsoGuideX(triangles,local,chestY,waistY,centerAtY(chestY))
    ??centerAtY(chestY)):null
  const segment=(kind,id,p,q,dashed=false,color=blue)=><GuideSegment key={id}
    panelId={panel.id} kind={kind} id={id} a={p} b={q} dashed={dashed}
    color={color} onSelectGuide={onSelectGuide} selectedGuide={selectedGuide}
    hoveredGuideId={hoveredGuideId} screenUnit={screenUnit}
    curveMode={curveMode} curveAngle={angle}
    curveOffset={curveDraft?.id===id?curveDraft.offset:curveOffsets?.[id]}
    curveDragging={curveDraft?.id===id}/>
  const horizontal=(fraction,kind)=>{
    const y=kind==='chest'&&underarms?chestY:bounds.minY+bounds.height*fraction
    const bellySides=kind==='belly'
      ?[sideCurveStation(panel.polygon,'side-left',y),sideCurveStation(panel.polygon,'side-right',y)]:null
    const stations=kind==='belly'&&bellySides?.every(Boolean)&&Number.isFinite(centerX)&&
      centerX>bellySides[0].position[0]+.001&&centerX<bellySides[1].position[0]-.001
      ?[[bellySides[0].position,[centerX,y],bellySides[1].position]]
      :kind==='chest'&&underarms&&Number.isFinite(centerX)&&
      centerX>underarms.left[0]+.001&&centerX<underarms.right[0]-.001
      ?[[underarms.left,[centerX,chestY],underarms.right]]
      :horizontalGuideTracks(boundaries,local,y,centerX,torsoSides,triangles,true)
    return stations.map((localPts,i)=>{
      const pts=localPts.map(toWorld)
      return <g key={`${kind}:${i}`} data-2d-guide-track={kind}
        data-chest-anatomical-endpoints={kind==='chest'&&Boolean(underarms)?'underarm-side-corners':undefined}>
        {segment(kind,`${panel.id}:${kind}:${i}:left`,pts[0],pts[1])}
        {segment(kind,`${panel.id}:${kind}:${i}:right`,pts[1],pts[2])}
        <GuideNodes panelId={panel.id} kind={kind} points={pts} selectedGuide={selectedGuide}
          hoveredGuideId={hoveredGuideId} screenUnit={screenUnit}
          reuseNativeEndpoints={kind==='chest'&&Boolean(underarms)&&nativeCornerNodesVisible||
            kind==='belly'&&editableSideStations&&Boolean(bellySides?.every(Boolean))}/>
      </g>
    })
  }
  const center=()=>{
    const levels=torso?[chestY,waistY,bounds.minY+bounds.height*.965,bounds.minY+bounds.height*.975]:[]
    const tracks=verticalGuideTracks(boundaries,local,centerX,levels,triangles)
    if(!tracks.length)return null
    // Each physically continuous interval is a single straight, selectable
    // guide; mesh-derived midpoint samples must not split its measurement.
    const kind=/back/i.test(identity)?'center-back':'center-front'
    return <g data-2d-guide-track={kind} data-center-vertical-dotted="true">
      {tracks.map((straight,trackIndex)=>{
        const pts=straight.map(toWorld)
        return <g key={trackIndex} data-center-guide-interval={trackIndex}>
          {segment(kind,`${panel.id}:${kind}:${trackIndex}`,pts[0],pts.at(-1),true,'#0e2634')}
          {/* Transverse levels draw one shared ring; interval endpoints get dots. */}
          <GuideNodes panelId={panel.id} kind={kind} points={[pts[0],pts.at(-1)]} selectedGuide={selectedGuide} screenUnit={screenUnit}/>
        </g>
      })}
    </g>
  }
  const shoulderOffsets=torso?Object.entries(boundaries||{}).flatMap(([name,indices])=>{
    if(!/^shoulder/i.test(name)||panel.polygon?.seam_allowances?.[name]>0)return []
    const vertices=indices.map(i=>local[i]).filter(Boolean)
    if(vertices.length<2)return []
    const offset=vertices.map((p,i)=>{
      const a=vertices[Math.max(0,i-1)],b=vertices[Math.min(vertices.length-1,i+1)]
      const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)||1
      const n=[-dy/length,dx/length],toward=[bounds.cx-p[0],bounds.cy-p[1]]
      const sign=n[0]*toward[0]+n[1]*toward[1]>=0?1:-1
      return toWorld([p[0]+n[0]*sign*.011,p[1]+n[1]*sign*.011])
    })
    // A shoulder is ONE drafting guide, even if its mesh has dozens of
    // sampled curve points. Keep those samples for an accurate stroke, but
    // expose ONLY the two true endpoints as Illustrator-like anchors.
    const kind='shoulder-offset-reference',id=`${panel.id}:${kind}:${name}`
    const active=selectedGuide?.id===id,hot=hoveredGuideId===id
    return [<g key={name} data-2d-guide-track={kind} data-guide-boundary={name}>
      <g data-2d-construction={kind} data-guide-id={id} data-guide-kind={kind}
        data-guide-panel={panel.id} data-guide-segment={id} data-hovered={String(hot)}>
        <polyline data-guide-curve="true" points={offset.map(p=>p.join(',')).join(' ')}
          stroke={hot?CLO_HOVER_BLUE:active?'#ed9d26':'#8277c5'}
          strokeWidth={active||hot?'.0055':'.0028'} fill="none" pointerEvents="none"/>
      </g>
      <GuideNodes panelId={panel.id} kind={name} points={[offset[0],offset.at(-1)]} screenUnit={screenUnit}
        selectedGuide={selectedGuide}/>
    </g>]
  }):[]
  const marks=showNotchReferences?Object.entries(boundaries||{}).flatMap(([name,indices])=>{
    // Torso guide marks belong to the armhole/underarm attachment, not every
    // sleeve-top/cuff segment of an older one-piece T-shirt pattern. Separate
    // sleeve pieces may use a crown/cap balance notch instead.
    const underarm=/armhole|underarm|sleeve-under/i.test(name)
    const sleeveBalance=!torso&&/sleeve|cap|crown/i.test(name)
    if (!(underarm||sleeveBalance)||panel.polygon?.notches?.[name]?.length)return []
    const path=indices.map(i=>local[i]).filter(Boolean)
    if(path.length<2)return []
    const first=path[0],last=path[path.length-1]
    const length=path.slice(1).reduce((n,p,i)=>n+Math.hypot(p[0]-path[i][0],p[1]-path[i][1]),0)
    if(length<.03)return []
    const isBack=/back/i.test(identity)
    const count=torso&&isBack?2:1
    return Array.from({length:count},(_,j)=>{
      const fraction=(/sleeve|cap|crown/i.test(name)?.5:.53)+(j-(count-1)/2)*.035
      const target=length*fraction
      let walked=0
      for(let i=1;i<path.length;i++){
        const a=path[i-1],b=path[i],segment=Math.hypot(b[0]-a[0],b[1]-a[1])
        if(walked+segment>=target&&segment>0){
          const t=(target-walked)/segment,p=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]
          const dx=(b[0]-a[0])/segment,dy=(b[1]-a[1])/segment
          const inward=((bounds.cx-p[0])*(-dy)+(bounds.cy-p[1])*dx)>=0?1:-1
          const depth=torso ? .028 : .014
          const q=[p[0]-dy*inward*depth,p[1]+dx*inward*depth]
          const worldP=toWorld(p),worldQ=toWorld(q)
          return <line key={`${name}:${j}`} data-2d-construction="notch-tick"
            data-guide-boundary={name} data-reference-mark="notch" data-notch-count={count}
            x1={worldP[0]} y1={worldP[1]} x2={worldQ[0]} y2={worldQ[1]}
            stroke={red} strokeWidth=".0032" strokeLinecap="round" pointerEvents="none"/>
        }
        walked+=segment
      }
      return null
    })
  }):[]
  return <g data-2d-guide-panel={panel.id} clipPath={`url(#${clipId})`}>
    {torso&&center()}
    {torso&&<>{horizontal(.46,'chest')}{horizontal(.64,'belly')}
      {horizontal(.965,'hem-upper')}{horizontal(.975,'hem-lower')}</>}
    {shoulderOffsets}
    {marks}
  </g>
}

function Dimensions({points, selected, panel, boundaries, uv, clipId, preview,screenUnit=1,unit='mm'}) {
  if (points.length < 3) return null
  const xs = points.map(p => p[0]), ys = points.map(p => p[1])
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys)
  const width = maxX - minX, height = maxY - minY
  if (!(width > .015 && height > .015)) return null
  const line = '#67767b', offset = .045, arrow = .009
  const measureStroke={stroke:line,strokeWidth:.75,vectorEffect:'non-scaling-stroke'}
  const faintStroke={stroke:line,strokeWidth:.55,vectorEffect:'non-scaling-stroke'}
  const y = maxY + offset, x = maxX + offset
  const font = {fontSize: '.019', fill: '#55656a', textAnchor: 'middle', paintOrder: 'stroke', stroke: '#eef0ef', strokeWidth: '.008'}
  return <g pointerEvents="none" opacity={selected ? .95 : .65}>
    <line x1={minX} x2={maxX} y1={y} y2={y} {...measureStroke}/>
    <path d={`M${minX + arrow},${y - arrow / 2}L${minX},${y}L${minX + arrow},${y + arrow / 2} M${maxX - arrow},${y - arrow / 2}L${maxX},${y}L${maxX - arrow},${y + arrow / 2}`} {...measureStroke} fill="none"/>
    <line x1={minX} x2={minX} y1={maxY + .012} y2={y + .012} {...faintStroke}/>
    <line x1={maxX} x2={maxX} y1={maxY + .012} y2={y + .012} {...faintStroke}/>
    <text x={(minX + maxX) / 2} y={y - .009} {...font}>{formatDisplayMeasurement20261025(width,unit)}</text>
    <line x1={x} x2={x} y1={minY} y2={maxY} {...measureStroke}/>
    <path d={`M${x - arrow / 2},${minY + arrow}L${x},${minY}L${x + arrow / 2},${minY + arrow} M${x - arrow / 2},${maxY - arrow}L${x},${maxY}L${x + arrow / 2},${maxY - arrow}`} {...measureStroke} fill="none"/>
    <line x1={maxX + .012} x2={x + .012} y1={minY} y2={minY} {...faintStroke}/>
    <line x1={maxX + .012} x2={x + .012} y1={maxY} y2={maxY} {...faintStroke}/>
    <text x={x + .014} y={(minY + maxY) / 2} fontSize=".019" fill="#55656a" paintOrder="stroke" stroke="#eef0ef" strokeWidth=".008">{formatDisplayMeasurement20261025(height,unit)}</text>
  </g>
}

function SelectionMarquee2D({points, panel, onStart, disabled, screenUnit}) {
  const b = getBounds(points)
  if (!b || b.width < .02 || b.height < .02) return null
  const handles = [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]]
  const x = sign => sign===-1?b.minX:sign===1?b.maxX:b.cx
  const y = sign => sign===-1?b.minY:sign===1?b.maxY:b.cy
  const rotationY=b.minY-32*screenUnit
  const lineColor='#526873',handleSize=7*screenUnit
  return <g data-2d-marquee={panel.id} aria-label={`2D transform selection: ${panel.name}`}>
    <rect x={b.minX} y={b.minY} width={b.width} height={b.height}
      fill="none" stroke={lineColor} strokeWidth=".9" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" pointerEvents="none"/>
    <rect data-2d-marquee-move={panel.id} x={b.minX} y={b.minY}
      width={b.width} height={b.height} fill="none" stroke="transparent" strokeWidth="10" vectorEffect="non-scaling-stroke"
      style={{cursor:disabled?'default':'move'}} pointerEvents="stroke"
      onPointerDown={e => onStart(e,panel,undefined,'move')}/>
    <line x1={b.cx} y1={b.minY} x2={b.cx} y2={rotationY}
      stroke={lineColor} strokeWidth=".9" vectorEffect="non-scaling-stroke" pointerEvents="none"/>
    <circle data-2d-rotate={panel.id} cx={b.cx} cy={rotationY} r={5*screenUnit}
      fill="#fff" stroke={lineColor} strokeWidth="1" vectorEffect="non-scaling-stroke" style={{cursor:'grab'}}
      onPointerDown={e => onStart(e,panel,undefined,'rotate')}/>
    {handles.map(([hx,hy]) => <rect key={`${hx},${hy}`} data-2d-scale-guide={`${hx},${hy}`}
      x={x(hx)-handleSize/2} y={y(hy)-handleSize/2} width={handleSize} height={handleSize}
      fill="#fff" stroke={lineColor} strokeWidth="1" vectorEffect="non-scaling-stroke" pointerEvents="none"/>)}
    <circle cx={b.cx} cy={b.cy} r={3.5*screenUnit} stroke={lineColor} strokeWidth=".8" vectorEffect="non-scaling-stroke"
      fill="#fff" pointerEvents="none"/>
    <path d={`M${b.cx-6*screenUnit} ${b.cy}h${12*screenUnit} M${b.cx} ${b.cy-6*screenUnit}v${12*screenUnit}`}
      stroke={lineColor} strokeWidth=".8" vectorEffect="non-scaling-stroke" pointerEvents="none"/>
  </g>
}

function GraphicMeasurementBox({id, x, y, width, height, enabled, screenUnit,unit='mm'}) {
  const line='#1486b7', tick=5*screenUnit, extension=12*screenUnit
  const labelStyle={fontSize:11*screenUnit,fontWeight:600,
    fill:'#095d82',stroke:'#fff',strokeWidth:2*screenUnit,paintOrder:'stroke'}
  return <g data-2d-graphic-measure-box={id} data-measurements-visible={String(enabled)}
    data-graphic-width-mm={(width*1000).toFixed(2)} data-graphic-height-mm={(height*1000).toFixed(2)}
    pointerEvents="none">
    {enabled&&<>
      <rect x={x} y={y} width={width} height={height} fill="none" stroke={line}
        strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeDasharray="4 3"/>
      <line x1={x} x2={x+width} y1={y-extension} y2={y-extension}
        stroke={line} strokeWidth=".75" vectorEffect="non-scaling-stroke"/>
      <path d={`M${x} ${y-extension-tick}v${tick*2} M${x+width} ${y-extension-tick}v${tick*2}
        M${x} ${y-3*screenUnit}v${-extension+3*screenUnit} M${x+width} ${y-3*screenUnit}v${-extension+3*screenUnit}`}
        fill="none" stroke={line} strokeWidth=".75" vectorEffect="non-scaling-stroke"/>
      <text x={x+width/2} y={y-extension-5*screenUnit} textAnchor="middle" {...labelStyle}>
        {formatDisplayMeasurement20261025(width,unit)}
      </text>
      <line x1={x+width+extension} x2={x+width+extension} y1={y} y2={y+height}
        stroke={line} strokeWidth=".75" vectorEffect="non-scaling-stroke"/>
      <path d={`M${x+width+extension-tick} ${y}h${tick*2}
        M${x+width+extension-tick} ${y+height}h${tick*2}
        M${x+width+3*screenUnit} ${y}h${extension-3*screenUnit}
        M${x+width+3*screenUnit} ${y+height}h${extension-3*screenUnit}`}
        fill="none" stroke={line} strokeWidth=".75" vectorEffect="non-scaling-stroke"/>
      <text x={x+width+extension+8*screenUnit} y={y+height/2} textAnchor="middle"
        transform={`rotate(90 ${x+width+extension+8*screenUnit} ${y+height/2})`} {...labelStyle}>
        {formatDisplayMeasurement20261025(height,unit)}
      </text>
    </>}
  </g>
}

/**
 * Linked metric board. Props are compatible with the original ClothCraftWorkspace Board:
 * s, active, pick, hover, edit, mode, busy, onPolygon.
 * Optional overlays: showMeasurements, showSilhouette, showSeamDots (default true).
 * Dimensions measure each panel's current rotated bounding box in material space.
 * Chest and belly guide heights are proportional landmarks; horizontal
 * lengths use the actual cut outline / torso side edges (not circumference).
 */
export default function ClothCraftBoardV2({
  onTogglePatternStudio=null, patternStudioActive=false,
  nativeGradeProposal=null,
  nativeGradeRunsByPanel=null,
  nativeGradeVisibility=null,
  nativeConstructionPreview=null,
  nativeCurveStationPreview=null,
  gradingPOMPreview=null,
  nativeDartPrecisionPreview=null,
  nativePhysicalPleatPreview=null,
  onPickGradeSize=null,
  s, active, selection, pick = () => {}, hover = () => {}, edit = () => {}, editBatch = null,
  onCreateInternalLine = null,
  onEnableCurveSeamEase = null,
  mode = 'edit', busy = false, onPolygon = () => {},
  graphics = [],
  patternReferences = [], onUpdatePatternReferences = () => {}, referenceModeActive = false,
  foamPads = [], onMoveFoamPad = () => {},
  sewingVariant = 'free', sewingFirstEdge = null, sewingCommitting = false,
  onSegmentSewEdge = () => {}, freeSewPoints = [], onFreeSewPoint = () => {},
  editSewing = false, onSelectSewingSeam = () => {},
  onClearFreeSew = () => {}, allowFreeSewEase = false, onChangeFreeSewEase = () => {},
  selectedGraphicId = null, onSelectGraphic = () => {}, onMoveGraphic = () => {}, onResizeGraphic = () => {},
  showGraphicMeasurements = true, showGraphicMeasurementToggle = true, onToggleGraphicMeasurements = () => {},
  walkSeamId = null, walkFraction = 0,
  onChangeMode = () => {}, onContextMenuRequest = () => {}, onAvatarPick = () => {},
  showMeasurements = true, showSilhouette = true, onToggleSilhouette, showSeamDots = true, showAvatar = true, onToggleAvatar, showGrid = true,
  studioPreferences = null,
}) {
  const svg = useRef(null), drag = useRef(null), tapeDrag = useRef(null), graphicDrag = useRef(null),
    previousMeasureTool = useRef(false), [view, setView] = useState(INITIAL_VIEW), [draft, setDraft] = useState([])
  const [preview, setPreview] = useState(null)
  const [canvasSize,setCanvasSize] = useState([800,800])
  useEffect(()=>{
    if(!svg.current)return
    const observer=new ResizeObserver(([entry])=>setCanvasSize([entry.contentRect.width,entry.contentRect.height]))
    observer.observe(svg.current)
    return ()=>observer.disconnect()
  },[])
  // SVG uses meet scaling: controls remain the same screen size at any zoom.
  const screenUnit=Math.max(view[2]/Math.max(1,canvasSize[0]),view[3]/Math.max(1,canvasSize[1]))
  const accumarkGreen=studioPreferences?.twoDCanvasTheme==='accumark-green'
  const markerStyle=studioPreferences?.twoDGridStyle||'grid'
  const dottedGrid=markerStyle==='dots'
  const showRulers=studioPreferences?.twoDShowRulers!==false && patternStudioActive
  const rulerUnits=studioPreferences?.units||'mm'
  const displayMeasurement=metres=>formatDisplayMeasurement20261025(metres,rulerUnits)
  const canvasColor=cadColor20261023(studioPreferences?.twoDCanvasColor,accumarkGreen?'#174e39':PATTERN_VISUAL.canvas)
  const markerColor=cadColor20261023(studioPreferences?.twoDGridColor,accumarkGreen?'#8bbda1':'#89949c')
  const adaptiveCad=studioPreferences?.twoDAutoContrast!==false
    ?cadAutoContrastColors({canvas:canvasColor,paper:cadColor20261023(studioPreferences?.twoDPatternColor,PATTERN_VISUAL.paper),
      grid:studioPreferences?.twoDGridColor,edge:studioPreferences?.twoDEdgeColor,
      point:studioPreferences?.twoDPointColor,selection:studioPreferences?.twoDSelectionColor,
      notch:studioPreferences?.twoDNotchColor,ruler:studioPreferences?.twoDRulerMarkColor}) : null
  const displayGridColor=adaptiveCad?.grid||markerColor
  const markerOpacity=Math.max(.15,Math.min(1,Number(studioPreferences?.twoDGridOpacity??.8)||.8))
  const dotScale=Math.max(.65,Math.min(2,Number(studioPreferences?.twoDDotSize??1)||1))
  const dotStep=cadDotStep20261023(screenUnit,1)||.05

  const foamDrag=useRef(null)
  const [foamPreview,setFoamPreview]=useState(null)
  const [handlePreview,setHandlePreview] = useState(null)
  // A sewn edge edit must not be thrown away when strict native seam matching
  // is enabled. Retain the actual proposed polygon until the user explicitly
  // accepts easing; clicking Accept commits THAT curve, no second drag needed.
  const [pendingCurveCommit,setPendingCurveCommit] = useState(null)
  const [mirrorFreeCurve,setMirrorFreeCurve] = useState(true)
  const [showRedDartGuides,setShowRedDartGuides] = useState(true)
  const [freeCurveStatus,setFreeCurveStatus] = useState('')
  const [hoveredSplitMirrorGroup,setHoveredSplitMirrorGroup] = useState(null)
  const [vectorTangents,setVectorTangents] = useState([])
  const temporaryShiftPen = useRef(false)
  // A borrowed Convert Anchor tool is a transient keyboard gesture, never a
  // permanent Pen/Pencil tool switch. Remember the exact originating tool so
  // an Option release restores Pencil to Pencil and Pen to Pen.
  const temporaryAnchorBorrow = useRef(null)
  const [vectorSelectedAnchor,setVectorSelectedAnchor] = useState(null)
  const [vectorCurveMode,setVectorCurveMode] = useState(false)
  const [vectorCursor,setVectorCursor] = useState(null)
  const [penPrecision,setPenPrecision] = useState({length:'',angle:'',unit:['mm','cm','in','m'].includes(studioPreferences?.units)?studioPreferences.units:'mm'})
  useEffect(()=>{
    setPenPrecision(previous=>{
      if(previous.unit===rulerUnits)return previous
      let length=previous.length
      try{length=convertPenDimension(length,previous.unit,rulerUnits)}catch{length=''}
      return {...previous,length,unit:rulerUnits}
    })
  },[rulerUnits])
  const [penPrecisionError,setPenPrecisionError] = useState('')
  const [showPenDimensions,setShowPenDimensions] = useState(true)
  useEffect(()=>{
    window.dispatchEvent(new CustomEvent('exo-clothcraft-pen-unit-changed',{detail:{unit:penPrecision.unit}}))
  },[penPrecision.unit])
  useEffect(()=>{
    const cycle=()=>setPenPrecision(value=>{
      const newUnit=({mm:'cm',cm:'in',in:'mm',m:'mm'}[value.unit]||'mm')
      let length=value.length
      try{length=convertPenDimension(value.length,value.unit,newUnit)}catch{length=''}
      return {...value,length,unit:newUnit}
    })
    const setUnit=event=>{
      const unit=event.detail?.unit
      if(!['mm','cm','in','m'].includes(unit))return
      setPenPrecision(value=>{
        if(value.unit===unit)return value
        let length=value.length
        try{length=convertPenDimension(value.length,value.unit,unit)}catch{length=''}
        return {...value,length,unit}
      })
    }
    window.addEventListener('exo-clothcraft-cycle-pen-unit',cycle)
    window.addEventListener('exo-clothcraft-set-pen-unit',setUnit)
    return()=>{
      window.removeEventListener('exo-clothcraft-cycle-pen-unit',cycle)
      window.removeEventListener('exo-clothcraft-set-pen-unit',setUnit)
    }
  },[])
  const [pencilSamples,setPencilSamples] = useState([])
  const [completedPencilMeasure,setCompletedPencilMeasure] = useState(null)
  const [pencilMirrorMode,setPencilMirrorMode] = useState(false)
  const [pencilMirrorMenu,setPencilMirrorMenu] = useState(null)
  const [pencilMirrorStatus,setPencilMirrorStatus] = useState('')
  const [penPaused,setPenPaused] = useState(false)
  const [parkedPenPaths,setParkedPenPaths] = useState([])
  const nextOpenPenId = useRef(1)
  const [anchorEditPopup,setAnchorEditPopup] = useState(null)
  const cornerDrag=useRef(null)
  const [hoveredNativeAnchor,setHoveredNativeAnchor] = useState(null)
  const [hoveredAddAnchor,setHoveredAddAnchor] = useState(null)
  const [anchorToolbarPosition,setAnchorToolbarPosition] = useState(null)
  const anchorToolbarDrag=useRef(null)
  const vectorDrag=useRef(null)
  // Selected construction guides are measured from the current UV/boundary
  // geometry. They remain guide objects until explicitly authored as Rust
  // internal lines; selection never mutates a garment or adds false stitches.
  const [selectedGuide, setSelectedGuide] = useState(null)
  const [activeInternalLine,setActiveInternalLine] = useState(null)
  useEffect(()=>setActiveInternalLine(null),[s?.template?.id,s?.template?.name])
  const [hoveredGuideId,setHoveredGuideId] = useState(null)
  const [hoveredGuideGeometry,setHoveredGuideGeometry] = useState(null)
  const [hoveredGraphicId,setHoveredGraphicId] = useState(null)
  // A curved drafting reference is NOT a native sewn edge. Store its
  // independent half-interval control in the local editor, scoped to the
  // material template; leave the Rust garment and the cutline untouched.
  const halfCurveKey=`exo-v2-half-curves:${s?.template?.id||s?.template?.name||'unnamed'}`
  const [guideHalfCurves,setGuideHalfCurves]=useState({})
  const [guideHalfCurveDraft,setGuideHalfCurveDraft]=useState(null)
  const guideHalfCurveDrag=useRef(null)
  useEffect(()=>{
    let restored={}
    try{
      const parsed=JSON.parse(localStorage.getItem(halfCurveKey)||'{}')
      if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))
        restored=Object.fromEntries(Object.entries(parsed).filter(([id,p])=>
          /:(chest|belly):\d+:(left|right)$/.test(id)&&
          Array.isArray(p)&&p.length===2&&p.every(v=>Number.isFinite(v)&&Math.abs(v)<.5)))
    }catch{}
    setGuideHalfCurves(restored)
    setGuideHalfCurveDraft(null)
    guideHalfCurveDrag.current=null
  },[halfCurveKey])
  const [showReferenceGuides, setShowReferenceGuides] = useState(true)
  const [showInternalLines,setShowInternalLines] = useState(true)
  const [showNativeNotches, setShowNativeNotches] = useState(true)
  const [showNativeAllowances, setShowNativeAllowances] = useState(true)
  const [precisionDrafting,setPrecisionDrafting]=useState(true)
  const [autoFocusDrafting,setAutoFocusDrafting]=useState(true)
  const [editPatternHintDismissed,setEditPatternHintDismissed]=useState(false)
  const [contextNodesInEdit,setContextNodesInEdit]=useState(true)
  const [allowanceWidthMm, setAllowanceWidthMm] = useState(10)
  const [notchDepthMm,setNotchDepthMm] = useState(6)
  const [notchPairSpacingMm,setNotchPairSpacingMm] = useState(6)
  const [dartIntakeMm,setDartIntakeMm] = useState(30)
  const [dartDepthMm,setDartDepthMm] = useState(70)
  const displayLayers={reference:showReferenceGuides,internal:showInternalLines,notches:showNativeNotches,allowances:showNativeAllowances}
  const toggleDisplayLayer=name=>{
    if(name==='reference')setShowReferenceGuides(value=>!value)
    if(name==='internal')setShowInternalLines(value=>!value)
    if(name==='notches')setShowNativeNotches(value=>!value)
    if(name==='allowances')setShowNativeAllowances(value=>!value)
    setSelectedGuide(null)
  }
  // Geometry edits invalidate a cached guide measurement. Re-selection always
  // computes a new length from the latest real boundary coordinates.
  useEffect(()=>setSelectedGuide(null),[s?.revision])
  const [graphicPreview, setGraphicPreview] = useState(null)
  const [freeHover, setFreeHover] = useState(null)
  const [tape, setTape] = useState([])
  const [pomStart,setPomStart] = useState(null)
  const [selectedPom,setSelectedPom] = useState(null)
  const [pomLabelDraft,setPomLabelDraft] = useState('')
  // A pending first click is bound to an exact native revision. Discard it
  // after any committed shape edit, Undo/Redo or project load, so the second
  // click cannot submit a stale named-edge reference against new geometry.
  useEffect(()=>{
    setPomStart(null)
    setTape([])
  },[s?.revision,s?.template?.name])
  // Both Edit Points and Edit Curves share the upstream 'edit' mode, but
  // neither should receive the 2D pattern-transform marquee.
  const [tool2d, setTool2d] = useState('select')
  useEffect(()=>{
    if(!anchorEditPopup)return
    if(tool2d!=='direct-select'){
      cornerDrag.current=null
      setAnchorEditPopup(null)
      setHandlePreview(null)
      return
    }
    const dismiss=e=>{
      if(e.key!=='Escape')return
      e.preventDefault();e.stopImmediatePropagation()
      cornerDrag.current=null
      setAnchorEditPopup(null)
      setHandlePreview(null)
    }
    window.addEventListener('keydown',dismiss,true)
    return()=>window.removeEventListener('keydown',dismiss,true)
  },[anchorEditPopup,tool2d])
  // CLO Edit Pattern Shift/box selection is a native-geometry selection, not
  // a separate decorative drawing object. A group can only span one physical
  // garment panel per Rust Shape transaction.
  const [multiEdit,setMultiEdit]=useState({panel:null,points:[]})
  const [multiMove,setMultiMove]=useState({x:'0',y:'0'})
  const [editLineLength,setEditLineLength]=useState('')
  const [editLengthLocation,setEditLengthLocation]=useState('end')
  const [precisionEditStatus,setPrecisionEditStatus]=useState('')
  const [precisionPanelOpen,setPrecisionPanelOpen]=useState(false)
  const [boxSelectPreview,setBoxSelectPreview]=useState(null)
  const boxSelectDrag=useRef(null)
  const groupMoveDrag=useRef(null)
  const toggleNativePoint=(panel,index)=>{
    setMultiEdit(value=>{
      const old=value.panel===panel?value.points:[]
      return {panel,points:old.includes(index)?old.filter(n=>n!==index):[...old,index].sort((a,b)=>a-b)}
    })
    setPrecisionEditStatus('')
  }
  useEffect(()=>{setMultiEdit({panel:null,points:[]});setPrecisionEditStatus('')},
    [s?.template?.id,s?.template?.name])
  const [shapeBuilderSelection,setShapeBuilderSelection] = useState({a:null,b:null})
  const [patternMultiSelection,setPatternMultiSelection] = useState([])
  const [patternMarquee,setPatternMarquee] = useState(null)
  const patternMarqueeDrag=useRef(null)
  const patternMarqueeIgnoreClick=useRef(false)
  const [shapeBuilderStatus,setShapeBuilderStatus] = useState('')
  const [shapeBuilderLine,setShapeBuilderLine] = useState(null)
  const [shapeBuilderHovered,setShapeBuilderHovered] = useState(null)
  const shapeBuilderDrag=useRef(null)
  const shapeBuilderIgnoreClick=useRef(false)
  useEffect(()=>{
    if(tool2d!=='shape-builder')return
    const cancel=event=>{
      if(event.key!=='Escape')return
      shapeBuilderDrag.current=null
      setShapeBuilderLine(null)
      setShapeBuilderHovered(null)
      setShapeBuilderSelection({a:null,b:null})
      setShapeBuilderStatus('Shape Builder selection cleared.')
    }
    window.addEventListener('keydown',cancel)
    return()=>window.removeEventListener('keydown',cancel)
  },[tool2d])
  // The Pen family shares one unfinished material path. Switching to Convert,
  // Add or Delete is a change of editing gesture, NOT a drawing cancellation.
  const penSibling = name => ['vector-pen','anchor-point','direct-select','split','remove-anchor'].includes(name)
  // A hover acquired in Select mode must never survive into sewing, notch,
  // allowance, point or free-drawing tools and steal their next click.
  useEffect(()=>{
    setHoveredGuideId(null)
    setHoveredGuideGeometry(null)
  },[tool2d,mode,busy,showReferenceGuides,showInternalLines])
  const curveEditing = ['point','curve','anchor-point','direct-select'].includes(tool2d)
  // Numeric construction is an explicitly reviewed edit, never a freehand
  // pointer mutation. A click selects a named corner; only Apply in the
  // metric inspector may submit Rust Anchor/SplitBoundary.
  const readOnlyConstructionTool=['construction-point','curve-station','dart-precision'].includes(tool2d)
  const drawingPanel = useRef(null)
  useEffect(() => {
    const receiveTool = event => {
      const tool = event?.detail?.tool
      const modes = {select:'edit',point:'edit','direct-select':'edit','anchor-point':'edit',curve:'edit','shape-builder':'edit','construction-point':'edit',split:'edit','remove-anchor':'edit','curve-station':'edit',notch:'edit',allowance:'edit',dart:'edit','dart-precision':'edit',annotation:'edit',editAnnotation:'edit',sew:'sew','seam-edit':'edit',internal:'line',line:'line',polygon:'pen','vector-pen':'pen','vector-pencil':'pen',pleat:'edit',measure:'edit','measure-edit':'edit'}
      if (!Object.hasOwn(modes,tool)) return
      setTool2d(tool)
      setFreeCurveStatus('')
      if(event?.detail?.temporary){
        // Holding Shift or Option borrows Anchor Point from Pen/Pencil.
        // Preserve the unfinished draft, tangents and native edit history.
        onChangeMode(modes[tool])
        return
      }
      temporaryAnchorBorrow.current=null
      temporaryShiftPen.current=false
      if(tool==='shape-builder'&&tool2d==='vector-pen'&&draft.length>=2){
        // Shape Builder must inherit an unfinished, open Pen path, instead of
        // closing it into a new garment piece when the user switches tools.
        setShapeBuilderLine({points:draft.map(p=>[...p]),tangents:draft.map((_,i)=>vectorTangents[i]||[0,0]),
          revision:s?.revision})
      }
      if(!(penSibling(tool2d)&&penSibling(tool))){
        setDraft([])
        setVectorTangents([])
        setVectorSelectedAnchor(null)
        setVectorCurveMode(false)
        setPenPaused(false)
        drawingPanel.current=null
      }
      setVectorCursor(null)
      setPencilSamples([])
      setPencilMirrorMenu(null)
      vectorDrag.current=null
      if(!previousMeasureTool.current || !['measure','measure-edit'].includes(tool))setTape([])
      setPomStart(null)
      previousMeasureTool.current=['measure','measure-edit'].includes(tool)
      onChangeMode(modes[tool])
    }
    window.addEventListener('exo-clothcraft-select-2d-tool',receiveTool)
    return () => window.removeEventListener('exo-clothcraft-select-2d-tool',receiveTool)
  },[onChangeMode,tool2d,draft,vectorTangents,s?.revision])
  useEffect(()=>{
    const showMirrorMenu=event=>{
      const board=svg.current?.closest('.cc-board')
      const rect=board?.getBoundingClientRect()
      if(!rect||!Number.isFinite(event.detail?.clientX)||!Number.isFinite(event.detail?.clientY))return
      setPencilMirrorMenu({
        x:Math.max(8,Math.min(Math.max(8,rect.width-236),event.detail.clientX-rect.left)),
        y:Math.max(8,Math.min(Math.max(8,rect.height-115),event.detail.clientY-rect.top)),
      })
    }
    window.addEventListener('exo-clothcraft-pencil-mirror-menu-request',showMirrorMenu)
    return()=>window.removeEventListener('exo-clothcraft-pencil-mirror-menu-request',showMirrorMenu)
  },[])
  useEffect(()=>{
    if(!pencilMirrorMenu)return
    const dismiss=event=>{
      if(event.target.closest?.('[data-pencil-context-menu]'))return
      setPencilMirrorMenu(null)
    }
    const escape=event=>{if(event.key==='Escape')setPencilMirrorMenu(null)}
    document.addEventListener('pointerdown',dismiss)
    document.addEventListener('keydown',escape)
    return()=>{document.removeEventListener('pointerdown',dismiss);document.removeEventListener('keydown',escape)}
  },[pencilMirrorMenu])
  useEffect(()=>{
    let applying=false
    const placeSewingMarks=async(event)=>{
      if(event?.detail?.tool!=='sewing-match-notches'||busy||applying)return
      const commands=teeBalanceNotchCommands(s?.template)
      if(!commands.length)return
      applying=true
      try{
        // Sequential native edits preserve revision ordering and undo history.
        for(const command of commands){
          const result=await edit(command)
          if(!result)break
        }
        setShowNativeNotches(true)
      }finally{applying=false}
    }
    window.addEventListener('exo-clothcraft-select-2d-tool',placeSewingMarks)
    return()=>window.removeEventListener('exo-clothcraft-select-2d-tool',placeSewingMarks)
  },[busy,s?.template,edit])
  const editSewingActive = editSewing && mode === 'edit' && tool2d === 'seam-edit'
  const selectedSewingMeasurement=editSewingActive&&selection?.seamId?
    sewingLengthDiagnostic(measureNativeSelection(s,{seamId:selection.seamId})) : null
  const transform2d = mode === 'edit' && tool2d === 'select'
  const selectConstructionGuide = guide => {
    setSelectedGuide(guide)
    setActiveInternalLine(guide.nativeLineId?{panel:guide.panelId,line:guide.nativeLineId}:null)
    pick({panel:guide.panelId})
    window.dispatchEvent(new CustomEvent('exo-clothcraft-2d-guide-selection',{detail:guide}))
  }
  // Captured clicks can land on an overlapping pattern fill even when the
  // fine SVG construction line is visible. Resolve guide proximity in screen
  // pixels so selecting a line is stable at any board zoom or resolution.
  const findGuideUnderPointer = event => {
    if(busy || mode!=='edit')return null
    // Lower hem references can lie within the broad native boundary hit
    // stroke. Give the precise nearby guide priority in Select mode; active
    // Notch/Seam Allowance/Sew tools still own boundary editing.
    // Graphic print hit boxes often overlap chest/belly construction guides.
    // They own CLICK/DRAG, but their transparent rect must not suppress the
    // underlying guide's independent blue HOVER.
    if(event.target?.closest?.('[data-control-point],[data-2d-marquee-move],[data-2d-rotate]'))return null
    const canvas=svg.current
    if(!canvas)return null
    // Reference strokes have a deliberately generous screen-pixel search
    // radius. Never let a guide on an underlying/hidden pattern win through
    // the topmost real fabric at the cursor, or select off-paper ghost lines.
    const location=point(event)
    const visiblePanel=location&&panelAt(location)
    if(!visiblePanel)return null
    let best=null,smallest=7
    for(const group of canvas.querySelectorAll('[data-guide-id]')){
      const id=group.getAttribute('data-guide-id')
      const panelId=group.getAttribute('data-guide-panel')
      if(!id||panelId!==visiblePanel)continue
      const geom=guideGeometryAt(group,canvas,event.clientX,event.clientY)
      if(!geom)continue
      const {distance,lengthMetres,points,pathPoints}=geom
      if(!Number.isFinite(lengthMetres)||lengthMetres<.001)continue
      const kind=group.getAttribute('data-guide-kind') || id.split(':').at(-2)
      // Centerline intersects horizontal guide nodes. Prefer transverse
      // segments within 2px of shared points, then closest segment otherwise.
      const score=distance+(/center-(front|back)/.test(kind)?2:0)
      if(score>=smallest)continue
      smallest=score
      best={id,panelId,kind,lengthMetres,nativeLineId:group.getAttribute('data-native-line-id')||null,points,pathPoints}
    }
    return best
  }
  const beginGuideHalfCurve = event => {
    if(busy||event.button!==0||mode!=='edit'||tool2d!=='curve')return false
    if(event.target?.closest?.('[data-control-point],[data-side-edit-station],[data-2d-edge-hit],[data-internal-curve-hit],[data-native-pom]'))return false
    const guide=findGuideUnderPointer(event)
    if(!guide||!['chest','belly'].includes(guide.kind)||guide.points?.length!==2)return false
    const group=[...(svg.current?.querySelectorAll('[data-guide-id]')||[])]
      .find(e=>e.getAttribute('data-guide-id')===guide.id)
    const line=group?.querySelector('polyline[data-guide-curve],line')
    const matrix=line?.getScreenCTM()
    if(!matrix)return false
    const endpoints=guide.points.map(([x,y])=>{
      const p=svg.current.createSVGPoint();p.x=x;p.y=y
      return p.matrixTransform(matrix)
    })
    // Shared midpoint and physical side anchors remain owned by the actual
    // pattern point/side-curve tools, never by a fake guide control.
    if(endpoints.some(p=>Math.hypot(p.x-event.clientX,p.y-event.clientY)<10))return false
    const start=point(event)
    const panel=s?.template?.panels?.find(p=>p.id===guide.panelId)
    if(!start||!panel)return false
    const angle=(panel.layout_rotation_degrees||0)*Math.PI/180
    const initial=guideHalfCurves[guide.id]||[0,0]
    guideHalfCurveDrag.current={id:guide.id,initial,start,angle,pointerId:event.pointerId}
    setGuideHalfCurveDraft({id:guide.id,offset:initial})
    setSelectedGuide(guide)
    pick({panel:guide.panelId})
    event.preventDefault();event.stopPropagation()
    svg.current?.setPointerCapture(event.pointerId)
    return true
  }
  const moveGuideHalfCurve = event => {
    const d=guideHalfCurveDrag.current
    if(!d||d.pointerId!==event.pointerId)return false
    const q=point(event)
    if(!q)return true
    const dx=q[0]-d.start[0],dy=q[1]-d.start[1],c=Math.cos(d.angle),s=Math.sin(d.angle)
    const offset=[d.initial[0]+dx*c+dy*s,d.initial[1]-dx*s+dy*c]
      .map(v=>Math.max(-.2,Math.min(.2,v)))
    setGuideHalfCurveDraft({id:d.id,offset})
    return true
  }
  const finishGuideHalfCurve = (event,cancelled=false) => {
    const d=guideHalfCurveDrag.current
    if(!d||event.pointerId!==d.pointerId)return false
    guideHalfCurveDrag.current=null
    if(!cancelled){
      const proposed=guideHalfCurveDraft?.id===d.id?guideHalfCurveDraft.offset:d.initial
      const next={...guideHalfCurves,[d.id]:proposed}
      setGuideHalfCurves(next)
      try{localStorage.setItem(halfCurveKey,JSON.stringify(next))}catch{}
    }
    setGuideHalfCurveDraft(null)
    try{svg.current?.releasePointerCapture(event.pointerId)}catch{}
    return true
  }
  const selectGuideUnderPointer = event => {
    if(busy||mode!=='edit'||tool2d!=='select'||!(showReferenceGuides||showInternalLines))
      return false
    // Unlike hover, clicking the transparent graphic bounds must continue to
    // select/drag that print rather than hijacking the click for a guide.
    if(event.target?.closest?.('[data-2d-graphic-hit],[data-2d-graphic-item]'))return false
    // Keep click identity consistent with the segment already highlighted on
    // hover. Native hem outlines often overlap both reference hit ranges.
    const location=point(event)
    const visiblePanel=location&&panelAt(location)
    const hoveredGroup=hoveredGuideId&&[...(svg.current?.querySelectorAll('[data-guide-id]')||[])]
      .find(group=>group.getAttribute('data-guide-id')===hoveredGuideId&&
        group.getAttribute('data-guide-panel')===visiblePanel)
    const hoveredGeometry=hoveredGroup&&guideGeometryAt(hoveredGroup,svg.current,event.clientX,event.clientY)
    const best=hoveredGeometry?.distance<7?{id:hoveredGuideId,panelId:hoveredGroup.getAttribute('data-guide-panel'),
      kind:hoveredGroup.getAttribute('data-guide-kind'),points:hoveredGeometry.points,
      pathPoints:hoveredGeometry.pathPoints,
      nativeLineId:hoveredGroup.getAttribute('data-native-line-id')||null,
      lengthMetres:hoveredGeometry.lengthMetres}:findGuideUnderPointer(event)
    if(!best)return false
    event.stopPropagation()
    selectConstructionGuide(best)
    return true
  }
  const createNativeLineFromGuide = guide => {
    if(!guide||guide.nativeLineId)return
    if(onCreateInternalLine)return onCreateInternalLine(guide)
    const range=s?.panels?.find(item=>item.id===guide.panelId)
    const panel=s?.template?.panels?.find(item=>item.id===guide.panelId)
    if(!range||!panel?.polygon||!Array.isArray(guide.points)||guide.points.length!==2)return
    // The board's global SVG positions include layout translation and panel
    // rotation. Rust InternalLine stores canonical panel-local material metres.
    const radians=(panel.layout_rotation_degrees||0)*Math.PI/180
    const c=Math.cos(radians),sin=Math.sin(radians)
    // Reference guides intentionally end at the cut outline, but native Rust
    // requires every authored InternalLine point to lie strictly *inside* it.
    // Inset both ends in physical metres, independent of zoom or canvas size.
    const [[ax,ay],[bx,by]]=guide.points
    const dx=bx-ax,dy=by-ay,distance=Math.hypot(dx,dy)
    if(!Number.isFinite(distance)||distance<.03)return
    const inset=Math.min(.01,distance*.1)
    const inner=[
      [ax+dx/distance*inset,ay+dy/distance*inset],
      [bx-dx/distance*inset,by-dy/distance*inset],
    ]
    const points=inner.map(([x,y])=>{
      const u=x-range.layout[0],v=y-range.layout[1]
      return [u*c+v*sin,-u*sin+v*c]
    })
    if(points.some(p=>p.some(value=>!Number.isFinite(value))))return
    return edit({kind:'InternalLine',panel:guide.panelId,points,tangents:points.map(()=>[0,0])})
  }
  const selectNativeCurve = (panel,line,straighten=false) => {
    if(busy||mode!=='edit'||tool2d!=='curve')return
    pick({panel:panel.id})
    setActiveInternalLine({panel:panel.id,line:line.id})
    const tangents=line.tangents||[]
    if(straighten){
      if(!tangents.some(t=>Math.hypot(...t)>.00001))return
      const polygon=structuredClone(panel.polygon)
      const original=polygon?.lines?.find(entry=>entry.id===line.id)
      if(!original)return
      original.tangents=original.points.map(()=>[0,0])
      void edit({kind:'Shape',panel:panel.id,polygon})
      return
    }
    // Convert a straight internal line to a Bézier without changing its
    // geometry. The first/last collinear handles mirror CLO's curve tool.
    if(tangents.length===line.points.length&&tangents.some(t=>Math.hypot(...t)>.00001))return
    const polygon=structuredClone(panel.polygon)
    const original=polygon?.lines?.find(entry=>entry.id===line.id)
    if(!original)return
    original.tangents=initialInternalTangents(original.points)
    void edit({kind:'Shape',panel:panel.id,polygon})
  }
  const segmentSewing = mode === 'sew' && tool2d === 'sew' && sewingVariant === 'segment'
  const freeSewing = mode === 'sew' && tool2d === 'sew' && sewingVariant !== 'segment'
  const sewingActive = segmentSewing || freeSewing
  const sewingOverlayVisible = sewingActive || editSewingActive
  useEffect(()=>{if(!freeSewing)setFreeHover(null)},[freeSewing])
  const [viewPreset, setViewPreset] = useState('FRONT')
  // At overview scale a 1cm grid aliases into a flat gray surface; use the
  // coarser CLO drafting grid until the user zooms close enough for 1cm cells.
  const gridMinorStep=view[2]>1.25?.05:.01
  const gridMajorStep=view[2]>1.25?.25:.05
  const uid = useId().replace(/:/g, '')
  const panels = useMemo(() => {
    if (!s?.panels || !s?.template?.panels || !s?.uv) return []
    return s.panels.map((range, i) => {
      const panel = s.template.panels.find(p => p.id === range.id)
      if (!panel) return null
      const localIndices = Object.values(range.boundaries || {}).flat()
      const unique = [...new Set(localIndices)]
      const points = unique.map(n => s.uv[n] && transform(panel, range, s.uv[n])).filter(Boolean)
      return {panel, range, color: COLORS[i % COLORS.length], points}
    }).filter(Boolean)
  }, [s])
  const pomRows=panels.flatMap(({panel})=>(panel.polygon?.measurements||[]).map(measurement=>({
    panelId:panel.id,measurement,
  })))
  const selectedPomRow=pomRows.find(row=>row.panelId===selectedPom?.panel&&row.measurement.id===selectedPom?.id)
  const boardUV = useMemo(() => {
    if (!s?.uv) return []
    const map = []
    for (const item of panels) {
      const [first, last] = item.range.vertices || []
      for (let i = first; i < last; i++) if (s.uv[i])
        map[i] = previewPoint(transform(item.panel, item.range, s.uv[i]),
          preview?.panelId===item.panel.id ||
          (preview?.kind==='move'&&preview?.groupIds?.includes(item.panel.id)) ? preview : null)
    }
    return map
  }, [s, panels, preview])
  const bounds = useMemo(() => {
    const points = panels.flatMap(p => p.points)
    if (!points.length) return {cx:0, cy:0, minX:-.3, maxX:.3, minY:0, maxY:1}
    const xs = points.map(p => p[0]), ys = points.map(p => p[1])
    const minX=Math.min(...xs), maxX=Math.max(...xs), minY=Math.min(...ys), maxY=Math.max(...ys)
    return {cx:(minX+maxX)/2, cy:(minY+maxY)/2, minX,maxX,minY,maxY}
  },[panels])
  // FRONT matches our original Garment Studio front-body drafting convention:
  // the *front garment* is centered over the avatar on the dark X=0 axis.
  // A whole-board midpoint incorrectly places the body between front and back.
  // GRID keeps the upstream ClothCraft side-by-side layout centered as a set.
  // Both transforms affect presentation only. UVs, seam links, physical metres,
  // pointer inversions and upstream authored panel origins stay unchanged.
  const wholeFront=panels.find(({panel})=>String(panel.id).toLowerCase()==='front')
  const frontPieces=wholeFront?[wholeFront]:panels.filter(({panel})=>/front|bodice/i.test(`${panel.id} ${panel.name}`))
  const frontParts=frontPieces.length?frontPieces:[panels[0]].filter(Boolean)
  const frontBounds=getBounds(frontParts.flatMap(item=>item.points)) || bounds
  const originalAlignment = useRef(null)
  const documentKey = s?.template?.id ?? s?.template?.name ?? null
  const reference = usePatternReferenceImage(`native:${documentKey || 'default'}`)
  if (panels.length && (!originalAlignment.current || originalAlignment.current.key !== documentKey)) {
    const registration=frontAvatarRegistration(frontParts.map(item=>({...item,uv:s?.uv})),s?.avatar)
    const frontOffset=[-(registration?.centerX ?? frontBounds.cx), .76-frontBounds.cy]
    originalAlignment.current = {
      key: documentKey,
      front: frontOffset,
      grid: [-bounds.cx, .76-bounds.cy],
      // Register the actual body mesh shoulder span against the authored front
      // shoulder edges. This guide-only translation is fixed per document so
      // moving a panel never causes the fabric to snap back to the figure.
      avatarX:registration?.matchedShoulders ? registration.avatarX : 0,
      avatarY:registration?.matchedShoulders ? registration.avatarY+frontOffset[1] : .95,
      shoulderY:(registration?.shoulderY ?? frontBounds.minY)+frontOffset[1],
    }
  }
  // Freeze this offset during edits: otherwise moving the front panel would
  // recompute its origin every frame and visually snap the shirt back to X=0.
  const offset = viewPreset === 'FRONT'
    ? (originalAlignment.current?.front || [0,0])
    : (originalAlignment.current?.grid || [0,0])
  const displayed = {minX:bounds.minX+offset[0],maxX:bounds.maxX+offset[0],minY:bounds.minY+offset[1],maxY:bounds.maxY+offset[1]}
  const spanX = displayed.maxX-displayed.minX, spanY=displayed.maxY-displayed.minY
  // The figure remains 1.75m tall in physical board coordinates, registered
  // by actual front shoulders. Never resize its shape to a pattern bounding box.
  const avatarAnchorX = originalAlignment.current?.avatarX ?? 0
  const avatarAnchorY = originalAlignment.current?.avatarY ?? .95
  const avatarAvailable = Boolean(s?.avatar?.positions?.length && s?.avatar?.triangles?.length)
  const avatarVisible = showAvatar && showSilhouette && avatarAvailable
  const focus = (onlySelected=false, includeAvatar=avatarVisible) => {
    let b=displayed
    if(onlySelected && (selection?.panel || active?.panel)){
      const entry=panels.find(p=>p.panel.id===(selection?.panel || active?.panel))
      if(entry?.points.length){
        const xs=entry.points.map(p=>p[0]+offset[0]),ys=entry.points.map(p=>p[1]+offset[1])
        b={minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)}
      }
    } else if (includeAvatar) {
      // Frame all includes the full body, including its feet and head, rather
      // than zooming to only the bodice and cutting away the guide figure.
      b={minX:Math.min(b.minX,avatarAnchorX-.56),maxX:Math.max(b.maxX,avatarAnchorX+.56),
        minY:Math.min(b.minY,avatarAnchorY-.875),maxY:Math.max(b.maxY,avatarAnchorY+.875)}
    }
    const pad=precisionDrafting && !includeAvatar?.065:.22
    const w=Math.max(precisionDrafting && !includeAvatar?.32:.9,b.maxX-b.minX+pad*2),h=Math.max(precisionDrafting && !includeAvatar?.32:.9,b.maxY-b.minY+pad*2)
    const aspect=canvasSize[0]/Math.max(1,canvasSize[1])
    const width=Math.max(w,h*aspect),height=width/aspect
    setView([(b.minX+b.maxX-width)/2,(b.minY+b.maxY-height)/2,width,height])
  }
  useEffect(()=>{
    const onZoomSelected=event=>{
      if(event.detail?.panel&&panels.some(row=>row.panel.id===event.detail.panel))focus(true,false)
    }
    window.addEventListener('exo-clothcraft-zoom-selected-pattern',onZoomSelected)
    return()=>window.removeEventListener('exo-clothcraft-zoom-selected-pattern',onZoomSelected)
  })
  const previousEditingTool=useRef(null)
  useEffect(()=>{
    if(previousEditingTool.current!==tool2d&&['point','curve'].includes(tool2d)&&precisionDrafting)
      setAutoFocusDrafting(true)
    previousEditingTool.current=tool2d
  },[tool2d,precisionDrafting])
  const initialized = useRef(null)
  useEffect(()=>{
    if(!autoFocusDrafting||!precisionDrafting||!panels.length)return
    focus(Boolean(selection?.panel))
    setAutoFocusDrafting(false)
  },[autoFocusDrafting,precisionDrafting,canvasSize[0],canvasSize[1],panels.length])
  useEffect(()=>{
    const key=s?.template?.id ?? s?.template?.name ?? null
    if(key !== initialized.current && panels.length){
      initialized.current=key
      focus()
    }
  },[s?.template?.id,s?.template?.name,panels.length,spanX,spanY])
  // Selecting the other garment piece in a narrow split window can leave its
  // physical side stations beyond the visible SVG. Browser hit testing then
  // lands on the right inspector instead of the station. Reframe only when
  // changing the selected piece in a point/curve workflow, never during a
  // captured drag (which would otherwise alter the pointer-to-metre transform).
  const previousDraftSelection=useRef(null)
  useEffect(()=>{
    const id=selection?.panel||null
    const editing=mode==='edit'&&['point','curve'].includes(tool2d)&&precisionDrafting
    if(!editing||!id){previousDraftSelection.current=null;return}
    if(previousDraftSelection.current===id)return
    previousDraftSelection.current=id
    if(drag.current||!panels.some(item=>item.panel.id===id))return
    focus(true)
  },[selection?.panel,mode,tool2d,precisionDrafting])
  const point = e => {
    const el = svg.current
    const matrix = el?.getScreenCTM()
    if (!matrix) return null
    const p = el.createSVGPoint()
    p.x = e.clientX
    p.y = e.clientY
    const q = p.matrixTransform(matrix.inverse())
    return [q.x-offset[0], q.y-offset[1]]
  }
  const beginFoamDrag=(event,pad)=>{
    if(busy||tool2d!=='select'||pad.locked||event.button!==0)return
    const p=point(event);if(!p)return
    event.preventDefault();event.stopPropagation()
    foamDrag.current={id:pad.id,pointerId:event.pointerId,start:p,x:pad.x||0,y:pad.y||0,angle:(s?.template?.panels?.find(panel=>panel.id===pad.panel)?.layout_rotation_degrees||0)*Math.PI/180}
    setFoamPreview({id:pad.id,x:pad.x||0,y:pad.y||0})
    svg.current?.setPointerCapture(event.pointerId)
  }
  const moveFoamDrag=event=>{
    const drag=foamDrag.current
    if(!drag||drag.pointerId!==event.pointerId)return false
    const p=point(event);if(!p)return true
    const dx=(p[0]-drag.start[0])*100,dy=(p[1]-drag.start[1])*100,c=Math.cos(drag.angle),s=Math.sin(drag.angle)
    setFoamPreview({id:drag.id,x:drag.x+dx*c+dy*s,y:drag.y-dx*s+dy*c})
    return true
  }
  const endFoamDrag=event=>{
    const drag=foamDrag.current
    if(!drag||drag.pointerId!==event.pointerId)return false
    const p=point(event)
    if(p){const dx=(p[0]-drag.start[0])*100,dy=(p[1]-drag.start[1])*100,c=Math.cos(drag.angle),s=Math.sin(drag.angle)
      onMoveFoamPad(drag.id,{x:Number((drag.x+dx*c+dy*s).toFixed(3)),y:Number((drag.y-dx*s+dy*c).toFixed(3))})}
    foamDrag.current=null;setFoamPreview(null)
    try{svg.current?.releasePointerCapture(event.pointerId)}catch{}
    return true
  }
  const startGraphicDrag = (event, graphic, panel) => {
    // The global editor mode may be 'move3d' while the 2D side remains in
    // Select. The graphic still needs to be editable in its own viewport.
    if (busy || !['select','direct-select'].includes(tool2d) || event.button!==0) return
    const p=point(event)
    if(!p)return
    event.stopPropagation()
    event.preventDefault()
    svg.current.setPointerCapture(event.pointerId)
    // Printing stores the upper-left position in millimetres from the panel's
    // unrotated rest UV. The 2D board uses y-down screen coordinates.
    graphicDrag.current={id:graphic.id,start:p,position:[...(graphic.positionMm||[0,0])],
      angle:(panel.layout_rotation_degrees||0)*Math.PI/180,pointerId:event.pointerId}
    setGraphicPreview(null)
    onSelectGraphic(graphic.id)
    // Selecting an image must not trigger native pattern selection: that can
    // route the right property editor away from the graphic mid-drag.
  }
  const startGraphicResize = (event, graphic, panel, handle) => {
    if(busy||!['select','direct-select'].includes(tool2d)||event.button!==0)return
    const p=point(event)
    if(!p)return
    event.stopPropagation()
    event.preventDefault()
    svg.current.setPointerCapture(event.pointerId)
    graphicDrag.current={id:graphic.id,kind:'resize',handle,start:p,
      graphic:{...graphic,positionMm:[...(graphic.positionMm||[0,0])]},
      angle:((panel.layout_rotation_degrees||0)+(graphic.rotation||0))*Math.PI/180,
      pointerId:event.pointerId}
    setGraphicPreview(null)
    onSelectGraphic(graphic.id)
  }
  const graphicResizeAt = (event,d) => {
    const p=point(event)
    if(!p)return null
    const dx=p[0]-d.start[0],dy=p[1]-d.start[1]
    const c=Math.cos(d.angle),s=Math.sin(d.angle)
    return proposeGraphicCanvasResize20261025(d.graphic,d.handle,
      {x:(dx*c+dy*s)*1000,y:(-dx*s+dy*c)*1000})
  }
  const graphicPositionAt = (event,d) => {
    const p=point(event)
    if(!p)return null
    const dx=p[0]-d.start[0],dy=p[1]-d.start[1]
    const c=Math.cos(d.angle),s=Math.sin(d.angle)
    return [d.position[0]+(dx*c+dy*s)*1000,d.position[1]+(dx*s-dy*c)*1000]
      .map(value=>Math.round(Math.max(-2000,Math.min(3000,value))*10)/10)
  }
  const moveGraphicDrag = event => {
    const d=graphicDrag.current
    if(!d||event.pointerId!==d.pointerId)return false
    if(d.kind==='resize'){
      const fields=graphicResizeAt(event,d)
      if(fields)setGraphicPreview({id:d.id,...fields})
      return true
    }
    const positionMm=graphicPositionAt(event,d)
    if(positionMm)setGraphicPreview({id:d.id,positionMm})
    return true
  }
  const endGraphicDrag = event => {
    const d=graphicDrag.current
    if(!d||event.pointerId!==d.pointerId)return false
    if(d.kind==='resize'){
      const fields=graphicResizeAt(event,d)
      graphicDrag.current=null
      setGraphicPreview(null)
      if(fields&&(['widthMm','heightMm'].some(key=>Math.abs(fields[key]-d.graphic[key])>=.01)||
        fields.positionMm.some((value,i)=>Math.abs(value-d.graphic.positionMm[i])>=.01)))
        onResizeGraphic(d.id,fields)
      return true
    }
    const positionMm=graphicPositionAt(event,d)
    graphicDrag.current=null
    setGraphicPreview(null)
    if(positionMm&&Math.hypot(positionMm[0]-d.position[0],positionMm[1]-d.position[1])>=.1)
      onMoveGraphic(d.id,positionMm)
    return true
  }
  const createAnnotation = (e, panel, range) => {
    if (busy || mode !== 'edit' || tool2d !== 'annotation') return false
    const xy = point(e)
    if (!xy) return true
    e.stopPropagation()
    const radians = (panel.layout_rotation_degrees || 0) * Math.PI / 180
    const dx = xy[0] - range.layout[0], dy = xy[1] - range.layout[1]
    const position = [dx * Math.cos(radians) + dy * Math.sin(radians), -dx * Math.sin(radians) + dy * Math.cos(radians)]
    const text = window.prompt('Pattern annotation text')
    if (text?.trim()) { pick({panel:panel.id}); void edit({kind:'Annotation',panel:panel.id,text:text.trim(),position}) }
    return true
  }
  // A new free knot is visible as soon as its first drag produces a proposal.
  // Fast successive gestures can begin before pointerup's staged React state
  // has rendered. Read the currently visible polygon first, then the staged
  // proposal, so the second pointerdown cannot accidentally revert to the
  // original knot-free native polygon.
  const draftPolygon = panel => handlePreview?.panelId===panel.id&&handlePreview.polygon
    ?handlePreview.polygon:pendingCurveCommit?.panelId===panel.id
      ?pendingCurveCommit.polygon:panel.polygon
  const editingPolygon = panel => {
    const polygon=draftPolygon(panel)
    const n=polygon?.edges?.length||0
    const anchor=selection?.panel===panel.id&&Number.isInteger(selection?.anchor)?selection.anchor:null
    const edges=anchor!==null?[polygon.edges[anchor],polygon.edges[(anchor+n-1)%n]]:
      selection?.panel===panel.id&&selection?.edge?[selection.edge]:[]
    return patternEditingControls(polygon,edges)
  }
  // Rust validates sewn arclengths for EVERY contour changed by a gesture.
  // New knots and dragged physical vertices must use the same explicit
  // Shape + seam-ease workflow as cubic handles (previously they bypassed it
  // and silently snapped back at sides/shoulders).
  const applyOrStagePatternCurve = async (panel,polygon,primaryEdge) => {
    if(!polygon||!panel?.polygon)return false
    const original=s.template.panels.find(item=>item.id===panel.id)?.polygon||panel.polygon,n=original.edges?.length||0
    const changedEdges=new Set([primaryEdge].filter(Boolean))
    for(let i=0;i<n;i++){
      const edge=original.edges[i],next=(i+1)%n
      if(JSON.stringify(original.curves?.[edge])!==JSON.stringify(polygon.curves?.[edge])||
        JSON.stringify(original.free_curve_points?.[edge])!==JSON.stringify(polygon.free_curve_points?.[edge])||
        JSON.stringify(original.points?.[i])!==JSON.stringify(polygon.points?.[i])||
        JSON.stringify(original.points?.[next])!==JSON.stringify(polygon.points?.[next]))
        changedEdges.add(edge)
    }
    const strict=(s?.template?.seams||[]).filter(seam=>!seam.allow_ease&&
      [seam.a,seam.b].some(b=>b?.panel===panel.id&&changedEdges.has(b.edge)))
    // VectorCraft commits an edited anchor on pointer release. A standalone
    // unsewn pattern has no seam-length permission to review: commit directly
    // through native Rust Shape instead of leaving every drag as a proposal.
    // Preserve the explicit reviewed gate for sewn edges only.
    if(onEnableCurveSeamEase&&strict.length){
      setPendingCurveCommit({panelId:panel.id,edge:primaryEdge,polygon,
        affectedEdges:[...changedEdges],revision:s.revision,
        strictSeams:strict.map(seam=>seam.id)})
      setHandlePreview({panelId:panel.id,anchor:`proposal:${primaryEdge}`,polygon})
      setFreeCurveStatus('The yellow paper shape is a pending proposal, not yet sewn. Click Apply this curve to update the required sewing relationships and rebuild the actual pattern.')
      return false
    }
    const ok=await edit({kind:'Shape',panel:panel.id,polygon})
    setHandlePreview(null)
    setPendingCurveCommit(null)
    setFreeCurveStatus(ok?'':'Native Rust rejected the shape; original fabric retained. Inspect sewn edges or adjust the curve.')
    return Boolean(ok)
  }
  const exactEditNumber=value=>{
    const raw=String(value??'').trim()
    if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(raw))return null
    const number=Number(raw)
    return Number.isFinite(number)?number:null
  }
  const applyCloMultiMove = async (unitsVector) => {
    const selected=multiEdit
    if(busy||!selected.panel||!selected.points.length)return false
    const panel=s?.template?.panels?.find(item=>item.id===selected.panel)
    if(!panel){setPrecisionEditStatus('Select a valid native pattern first.');return false}
    const result=moveCloNativePolygonPoints20261025(s.template,
      {panelId:selected.panel,indices:selected.points,delta:unitsVector})
    if(!result.ok){setPrecisionEditStatus(result.reason);return false}
    const proposal=result.template.panels.find(item=>item.id===selected.panel)
    const committed=await applyOrStagePatternCurve(panel,proposal.polygon,
      panel.polygon.edges[selected.points[0]])
    setPrecisionEditStatus(committed?
      `Moved ${selected.points.length} native point(s) with Rust validation.`:
      'Rust rejected the proposed multi-point move or seam review is required.')
    return committed
  }
  const localCloGroupDelta=(event,gesture)=>{
    const p=point(event)
    if(!p||!gesture)return null
    const x=p[0]-gesture.start[0],y=p[1]-gesture.start[1]
    const a=-(gesture.rotation||0)*Math.PI/180
    let delta=[x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a)]
    if(event.shiftKey){
      if(Math.abs(delta[0])>=Math.abs(delta[1]))delta[1]=0
      else delta[0]=0
    }
    return delta
  }
  const commitCloMove=()=>{
    const x=exactEditNumber(multiMove.x),y=exactEditNumber(multiMove.y)
    if(x===null||y===null){setPrecisionEditStatus('Enter finite X and Y movement distances.');return}
    if(Math.max(Math.abs(x),Math.abs(y))>10000){setPrecisionEditStatus('Maximum movement is 10 metres per axis.');return}
    const scale=PEN_LENGTH_UNITS[penPrecision.unit]||.001
    void applyCloMultiMove([x*scale,y*scale])
  }
  const commitCloChangeLength=async()=>{
    const target=exactEditNumber(editLineLength)
    if(busy||!selection?.panel||!selection?.edge||target===null||target<=0){
      setPrecisionEditStatus('Select a line and enter a positive target length.');return
    }
    const scale=PEN_LENGTH_UNITS[penPrecision.unit]||.001
    const panel=s?.template?.panels?.find(item=>item.id===selection.panel)
    if(!panel){setPrecisionEditStatus('Native pattern is unavailable.');return}
    const result=proposeCloNativeChangeLength20261025(panel.polygon,{
      edge:selection.edge,lengthM:target*scale,
      mode:{start:'Start',end:'End',both:'Both'}[editLengthLocation],
      panelId:panel.id,template:s.template
    })
    if(!result.ok){setPrecisionEditStatus(result.reason);return}
    const accepted=await applyOrStagePatternCurve(panel,result.polygon,selection.edge)
    setPrecisionEditStatus(accepted?
      `Length changed to ${formatPenDistancePrecise(result.qa.measuredLengthM,penPrecision.unit)} using native Rust Shape.`:
      'Rust rejected Change Length; original garment preserved.')
  }
  useEffect(()=>{
    const nudge=event=>{
      if(mode!=='edit'||tool2d!=='point'||busy||!multiEdit.points.length||!multiEdit.panel||
        !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)||
        event.target?.closest?.('input,select,textarea,[contenteditable="true"]')||
        event.metaKey||event.ctrlKey)return
      event.preventDefault();event.stopImmediatePropagation()
      // CLO's documented default increment is 0.25in. Alt provides a
      // precision tenth step; native geometry remains expressed in metres.
      const step=0.00635*(event.altKey?0.1:1)
      const vector={ArrowLeft:[-step,0],ArrowRight:[step,0],
        ArrowUp:[0,-step],ArrowDown:[0,step]}[event.key]
      if(vector)void applyCloMultiMove(vector)
    }
    window.addEventListener('keydown',nudge,true)
    return()=>window.removeEventListener('keydown',nudge,true)
  },[tool2d,mode,busy,multiEdit,s?.revision,penPrecision.unit])
  const start = (e, panel, anchor, kind='move', handle=null) => {
    if (busy || ['sew', 'pen', 'line'].includes(mode) || e.button !== 0) return
    if(transform2d&&anchor===undefined&&e.shiftKey){
      e.preventDefault();e.stopPropagation()
      const current=patternMultiSelection.length?patternMultiSelection:selection?.panel?[selection.panel]:[]
      setPatternMultiSelection(current.includes(panel.id)?current.filter(id=>id!==panel.id):[...current,panel.id])
      patternMarqueeIgnoreClick.current=true
      return
    }
    const movingSelectedGroup=transform2d&&kind==='move'&&anchor===undefined&&
      patternMultiSelection.length>1&&patternMultiSelection.includes(panel.id)
    if(transform2d&&anchor===undefined&&!e.shiftKey&&!movingSelectedGroup){
      // A regular Transform Pattern click replaces any previous Shift/marquee
      // selection. Otherwise its old multi-selected boxes override the newly
      // picked native panel and can survive later blank-board clicks.
      setPatternMultiSelection([])
    }
    if(readOnlyConstructionTool){
      e.preventDefault();e.stopPropagation()
      pick({panel:panel.id,
        ...(Number.isInteger(anchor)?{anchor,edge:panel.polygon?.edges?.[anchor]}:{}),
        ...(typeof anchor==='string'&&anchor.startsWith('c:')?{edge:anchor.split(':')[1]}:{})})
      return
    }
    if(pendingCurveCommit?.panelId===panel.id&&pendingCurveCommit.revision!==s.revision){
      e.preventDefault();e.stopPropagation()
      setFreeCurveStatus('This proposal is stale after another edit. Discard it before drawing again.')
      return
    }
    if (anchor === undefined && !transform2d) {
      // Point and curve tools select the fabric without translating it.
      e.stopPropagation()
      pick({panel: panel.id})
      return
    }
    const originalPanel=s.template.panels.find(item=>item.id===panel.id)||panel
    if(typeof anchor==='string'&&anchor.startsWith('c:'))panel={...panel,polygon:editingPolygon(panel)}
    else if(typeof anchor==='string'&&/^(f|ft):/.test(anchor)){
      const [,edge,id]=anchor.split(':')
      const proposed=draftPolygon(panel)
      // A newly inserted station is already carried by the passed panel;
      // existing pending knots and their tangents must use the proposal.
      if(proposed.free_curve_points?.[edge]?.some(mark=>mark.id===id))panel={...panel,polygon:proposed}
    }else if(Number.isInteger(anchor))panel={...panel,polygon:draftPolygon(panel)}
    const startPoint = point(e)
    if (!startPoint) return
    // Own the pointer gesture; browser text/image drag can cancel pointerup
    // after selection changes between consecutive curve-handle edits.
    e.preventDefault()
    e.stopPropagation()
    // Keep a just-inserted knot rendered while the next pointerdown acquires
    // SVG capture. Removing the displayed proposal here unmounts the free-knot
    // hit target before gotpointercapture; quick consecutive drags then lose
    // their starting anchor and fall back to the native paper silhouette.
    const [,freeEdge,freeId]=typeof anchor==='string'?anchor.split(':'):[]
    const continuingVisibleFreeKnot=typeof anchor==='string'&&/^(f|ft):/.test(anchor)&&
      handlePreview?.panelId===panel.id&&Boolean(handlePreview.polygon?.free_curve_points?.[freeEdge]
        ?.some(mark=>mark.id===freeId))
    if(!continuingVisibleFreeKnot)setHandlePreview(null)
    svg.current.setPointerCapture(e.pointerId)
    const entry=panels.find(item => item.panel.id===panel.id)
    const b=getBounds(entry?.points)
    drag.current = {panel, originalPanel, pointerId:e.pointerId, previousProposal:pendingCurveCommit, anchor, start: startPoint, kind, handle, bounds:b,
      groupIds:movingSelectedGroup?[...patternMultiSelection]:null,
      breakTangents:e.altKey, snapAngle:e.shiftKey, controlScale:Number(e.currentTarget.dataset.controlScale)||1}
    setPreview(null)
    if(!movingSelectedGroup)pick({panel: panel.id,...(typeof anchor==='string'&&(['c:','f:','ft:','r:'].some(prefix=>anchor.startsWith(prefix)))
      ?{edge:anchor.split(':')[1]}:
      Number.isInteger(anchor)&&curveEditing?{edge:panel.polygon?.edges?.[anchor]}:{}),
      // An old numeric vertex selection must not override a newly pressed
      // Bézier handle on another edge. That stale anchor caused side/hem
      // handles to disappear while the geometry was being dragged.
      ...(anchor !== undefined&&kind!=='reshape-segment' ? {anchor} : {})})
  }
  const updatePreview = (e, d) => {
    const q=point(e)
    if (!q || !d?.bounds) return null
    const delta=q.map((n,i)=>n-d.start[i])
    if (d.kind==='rotate') {
      const b=d.bounds, angle=Math.atan2(q[1]-b.cy,q[0]-b.cx)-
        Math.atan2(d.start[1]-b.cy,d.start[0]-b.cx)
      const normalized=Math.atan2(Math.sin(angle),Math.cos(angle))
      const snapped=e.shiftKey?Math.round(normalized/(Math.PI/12))*(Math.PI/12):normalized
      return {panelId:d.panel.id,kind:'rotate',angle:snapped,center:[b.cx,b.cy]}
    }
    // CLO-like straight-axis / diagonal constraint while translating.
    if (e.shiftKey) {
      const [dx,dy]=delta, ax=Math.abs(dx),ay=Math.abs(dy)
      if(ax>ay*1.75)delta[1]=0
      else if(ay>ax*1.75)delta[0]=0
      else {const length=Math.min(ax,ay);delta[0]=Math.sign(dx)*length;delta[1]=Math.sign(dy)*length}
    }
    return {panelId:d.panel.id,kind:'move',delta,...(d.groupIds?{groupIds:d.groupIds}:{})}
  }
  const move = e => {
    const d=drag.current
    if (!d || d.pan || (d.pointerId!==undefined&&d.pointerId!==e.pointerId)) return
    if(d.kind==='reshape-segment'){
      const q=point(e)
      if(!q)return
      const a=-(d.panel.layout_rotation_degrees||0)*Math.PI/180
      const dx=q[0]-d.start[0],dy=q[1]-d.start[1]
      const local=[dx*Math.cos(a)-dy*Math.sin(a),dx*Math.sin(a)+dy*Math.cos(a)]
      if(Math.hypot(...local)<=1e-6)return
      const polygon=reshapePatternBezierSegment(d.panel.polygon,d.handle.edge,d.handle.t,local,
        {perpendicular:e.shiftKey})
      if(polygon)setHandlePreview({panelId:d.panel.id,anchor:`c:${d.handle.edge}:0`,polygon})
      return
    }
    if(typeof d.anchor==='string'&&(d.anchor.startsWith('c:')||d.anchor.startsWith('l:')||d.anchor.startsWith('f:')||d.anchor.startsWith('ft:'))){
      const q=point(e)
      if(q){
        const a=-(d.panel.layout_rotation_degrees||0)*Math.PI/180
        const dx=q[0]-d.start[0],dy=q[1]-d.start[1]
        const delta=[dx*Math.cos(a)-dy*Math.sin(a),dx*Math.sin(a)+dy*Math.cos(a)].map(v=>v/(d.controlScale||1))
        const polygon=d.anchor.startsWith('ft:')?(()=>{
          const [,edge,id]=d.anchor.split(':')
          const side=d.anchor.split(':')[3]||'out'
          return editNativeFreeCurveTangent(d.panel.polygon,edge,id,freeTangentDragDelta(delta,side),{snapAngle:e.shiftKey||d.snapAngle,side,breakTangents:e.altKey||d.breakTangents})
        })():d.anchor.startsWith('f:')?(()=>{
          const [,edge,id]=d.anchor.split(':')
          return moveNativeFreeCurvePoint(d.panel.polygon,edge,id,delta)
        })():d.anchor.startsWith('c:')?(()=>{
          const [,edge,index]=d.anchor.split(':')
          return editPatternBezierHandle(d.panel.polygon,edge,Number(index),delta,
            {breakTangents:e.altKey,snapAngle:e.shiftKey,mirrorTangents:false,
              mirrorAcrossPattern:mirrorFreeCurve})
        })():null
        setHandlePreview({panelId:d.panel.id,anchor:d.anchor,delta,polygon})
      }
      return
    }
    if(Number.isInteger(d.anchor)&&curveEditing){
      const q=point(e)
      if(q){
        const a=-(d.panel.layout_rotation_degrees||0)*Math.PI/180
        const dx=q[0]-d.start[0],dy=q[1]-d.start[1]
        const delta=[dx*Math.cos(a)-dy*Math.sin(a),dx*Math.sin(a)+dy*Math.cos(a)].map(v=>v/(d.controlScale||1))
        const converting=d.kind==='convert-anchor'
        const polygon=converting?dragPatternAnchorHandles(d.panel.polygon,d.anchor,delta,{snapAngle:e.shiftKey}):
          previewPatternAnchorMove(d.panel.polygon,d.anchor,delta)
        if(polygon)setHandlePreview({panelId:d.panel.id,
          ...(converting?{anchor:`c:${d.panel.polygon.edges[d.anchor]}:0`}:{anchorIndex:d.anchor}),polygon})
      }
      return
    }
    if(d.anchor!==undefined)return
    const next=updatePreview(e,d)
    d.lastPreview=next
    setPreview(next)
  }
  const up = async e => {
    const d = drag.current
    if(d?.pointerId!==undefined&&d.pointerId!==e.pointerId)return
    drag.current = null
    try{svg.current?.releasePointerCapture(e.pointerId)}catch{}
    setPreview(null)
    const shapeGesture=typeof d?.anchor==='string'&&/^(c|f|ft|l|r):/.test(d.anchor)
    if(!shapeGesture)setHandlePreview(null)
    if (!d) return
    const q = point(e)
    if (!q){setHandlePreview(null);return}
    const delta = q.map((n, i) => n - d.start[i])
    // Material edits must retain sub-millimetre adjustments at every zoom.
    // The old 2 mm click threshold silently discarded valid curve gestures.
    // Retain it for board navigation, but use only a numerical tolerance for
    // curve controls and material vertices (one micrometre in model space).
    const materialGesture=shapeGesture||Number.isInteger(d.anchor)
    if (Math.hypot(...delta) < (materialGesture ? 1e-6 : .002)) {
      if(tool2d==='anchor-point'&&typeof d.anchor==='string'&&d.anchor.startsWith('c:')){
        // Match VectorCraft AnchorTool's handle-end click: retract ONLY the
        // pressed native control, without moving the corner or other handle.
        const [,edge,part]=d.anchor.split(':'),index=Number(part)
        const controls=d.originalPanel?.polygon?.curves?.[edge]
        const k=d.panel.polygon.edges?.indexOf(edge)
        const vertex=d.panel.polygon.points?.[(k+index)%d.panel.polygon.points.length]
        const control=d.panel.polygon.curves?.[edge]?.[index]
        if(controls&&k>=0&&vertex&&control){
          const amount=vertex.map((value,axis)=>value-control[axis])
          if(Math.hypot(...amount)>1e-7){
            const polygon=editPatternBezierHandle(d.panel.polygon,edge,index,amount,{breakTangents:true})
            if(polygon)await applyOrStagePatternCurve(d.originalPanel||d.panel,polygon,edge)
          }
        }
        return
      }
      if(d.kind==='convert-anchor'&&Number.isInteger(d.anchor)){
        const polygon=d.panel.polygon,n=polygon?.points?.length||0
        const incoming=polygon?.edges?.[(d.anchor+n-1)%n],outgoing=polygon?.edges?.[d.anchor]
        if(polygon?.curves?.[incoming]||polygon?.curves?.[outgoing])
          await edit({kind:'CurvePoint',panel:d.panel.id,anchor:d.anchor,curved:false})
        return
      }
      if (d.pan && d.background) pick(null)
      if(d.stationDraft){
        // A click creates the side's actual free-knot geometry at exactly the
        // belly/intermediate guide intersection; the next drag edits it.
        await applyOrStagePatternCurve(d.originalPanel,d.panel.polygon,d.stationEdge)
      }else setHandlePreview(null)
      return
    }
    if (d.pan) {
      setView(v => [v[0] - delta[0], v[1] - delta[1], v[2], v[3]])
      return
    }
    const range = s.panels.find(p => p.id === d.panel.id)
    if (!range) return
    if(d.anchor===undefined && d.kind==='rotate') {
      const p=updatePreview(e,d)
      if(!p || Math.abs(p.angle)<.004)return
      const degrees=p.angle*180/Math.PI
      edit({kind:'BoardTransform',panel:d.panel.id,
        origin:rotatedLayoutAroundCenter(range.layout,degrees,p.center),
        rotation_degrees:(d.panel.layout_rotation_degrees||0)+degrees})
      return
    }
    if(d.kind==='reshape-segment'){
      const a=-(d.panel.layout_rotation_degrees||0)*Math.PI/180
      const local=[delta[0]*Math.cos(a)-delta[1]*Math.sin(a),
        delta[0]*Math.sin(a)+delta[1]*Math.cos(a)]
      const polygon=reshapePatternBezierSegment(d.panel.polygon,d.handle.edge,d.handle.t,local,
        {perpendicular:e.shiftKey})
      if(polygon)await applyOrStagePatternCurve(d.originalPanel||d.panel,polygon,d.handle.edge)
      else setHandlePreview(null)
      return
    }
    if (d.anchor !== undefined) {
      const a = -(d.panel.layout_rotation_degrees || 0) * Math.PI / 180
      const local = [delta[0] * Math.cos(a) - delta[1] * Math.sin(a), delta[0] * Math.sin(a) + delta[1] * Math.cos(a)].map(v=>v/(d.controlScale||1))
      if (typeof d.anchor === 'string') {
        let polygon = structuredClone(d.panel.polygon)
        const [, identifier, index] = d.anchor.split(':')
        if(d.anchor.startsWith('ft:')){
          polygon=editNativeFreeCurveTangent(d.panel.polygon,identifier,index,freeTangentDragDelta(local,d.anchor.split(':')[3]||'out'),
            {snapAngle:e.shiftKey||d.snapAngle,side:d.anchor.split(':')[3]||'out',breakTangents:e.altKey||d.breakTangents})
          if(!polygon)return
        }else if(d.anchor.startsWith('f:')){
          polygon=moveNativeFreeCurvePoint(d.panel.polygon,identifier,index,local)
          if(!polygon)return
        }else if(d.anchor.startsWith('l:')){
          const line=polygon.lines?.find(item=>item.id===identifier)
          if(!line?.tangents?.[Number(index)])return
          line.tangents[Number(index)]=line.tangents[Number(index)].map((n,i)=>n+local[i])
        }else{
          polygon=editPatternBezierHandle(d.panel.polygon,identifier,Number(index),local,
            {breakTangents:e.altKey,snapAngle:e.shiftKey,mirrorTangents:false,
              mirrorAcrossPattern:mirrorFreeCurve})
          if(!polygon)return
        }
        await applyOrStagePatternCurve(d.originalPanel||d.panel,polygon,identifier)
      } else {
        const origin = d.panel.polygon?.points?.[d.anchor]
        if(origin&&d.kind==='convert-anchor'){
          const polygon=dragPatternAnchorHandles(d.panel.polygon,d.anchor,local,{snapAngle:e.shiftKey})
          if(polygon)await applyOrStagePatternCurve(d.originalPanel||d.panel,polygon,d.panel.polygon.edges[d.anchor])
        }else if(origin&&tool2d==='curve'){
          const polygon=previewPatternAnchorMove(d.panel.polygon,d.anchor,local)
          if(polygon)await applyOrStagePatternCurve(d.panel,polygon,d.panel.polygon.edges[d.anchor])
        }else if(origin)edit({kind:'Anchor',panel:d.panel.id,anchor:d.anchor,
          position:origin.map((n,i)=>n+local[i])})
      }
    } else {
      const p=updatePreview(e,d)
      if(d.groupIds?.length>1){
        const result=planNativePatternGroupMove20261025(s?.template,d.groupIds,p?.delta||delta)
        if(!result.ok){setPrecisionEditStatus(result.reason);return}
        if(typeof editBatch!=='function'){
          setPrecisionEditStatus('Native atomic multi-pattern movement is unavailable. No patterns moved.')
          return
        }
        const accepted=await editBatch(result.commands)
        setPrecisionEditStatus(accepted?`Moved ${d.groupIds.length} selected patterns together.`:
          'Native Rust rejected the group movement; positions were preserved.')
        return
      }
      edit({kind: 'BoardTransform', panel: d.panel.id,
        origin: range.layout.map((n, i) => n + (p?.delta?.[i] ?? delta[i])),
        rotation_degrees: d.panel.layout_rotation_degrees || 0})
    }
  }
  const cancelPatternGesture = () => {
    const d=drag.current
    if(!d)return
    drag.current=null
    setPreview(null)
    setHandlePreview(null)
    if(d.previousProposal!==undefined)setPendingCurveCommit(d.previousProposal)
    try{svg.current?.releasePointerCapture(d.pointerId)}catch{}
  }
  useEffect(()=>{
    const cancel=event=>{
      if(event.key!=='Escape'||!drag.current)return
      event.preventDefault();event.stopImmediatePropagation()
      cancelPatternGesture()
    }
    window.addEventListener('keydown',cancel,true)
    return ()=>window.removeEventListener('keydown',cancel,true)
  },[])
  const zoom = e => {
    e.preventDefault()
    if(drag.current)return
    const localCursor = point(e)
    if (!localCursor) return
    const cursor = [localCursor[0]+offset[0],localCursor[1]+offset[1]]
    const factor = e.deltaY > 0 ? 1.1 : .9
    setView(v => {
      const width = Math.max(.08, Math.min(15, v[2] * factor))
      const scale = width / v[2]
      return [cursor[0] - (cursor[0] - v[0]) * scale, cursor[1] - (cursor[1] - v[1]) * scale, width, v[3] * scale]
    })
  }
  const isDrawing = mode === 'pen' || mode === 'line'
  const invalidInternal = reason => window.dispatchEvent(new CustomEvent('exo-clothcraft-invalid-internal-polygon', {detail:{reason}}))
  // SVG paints later panels above earlier ones. Resolve overlapping hit regions
  // in the same order so the visible, topmost pattern receives canvas tools.
  const panelAt = p => panels.findLast(({panel,range}) => {
    const triangles = (s?.triangles || []).slice(...range.triangles)
    for(const triangle of triangles)
      if(Array.isArray(triangle)&&triangle.length===3&&insideTriangle(p,...triangle.map(index=>boardUV[index])))return true
    return false
  })?.panel.id || null
  const clearTransformPatternSelection = () => {
    // Keep one explicit deselection path for the real native selection, the
    // 2D Transform Pattern bounding boxes and any graphic selection.
    setPatternMultiSelection([])
    setSelectedGuide(null)
    onSelectGraphic(null)
    hover(null)
    pick(null)
  }
  const completePatternMarquee=(gesture,event)=>{
    const end=point(event)||gesture.end
    if(!end)return
    const lo=[Math.min(gesture.start[0],end[0]),Math.min(gesture.start[1],end[1])]
    const hi=[Math.max(gesture.start[0],end[0]),Math.max(gesture.start[1],end[1])]
    if(Math.hypot(end[0]-gesture.start[0],end[1]-gesture.start[1])<4*screenUnit){
      // A plain click on drafting paper is a deselection, not a marquee.
      // Do not leave an old multi-selection or hover-derived box behind.
      if(tool2d==='select'&&!gesture.additive){
        clearTransformPatternSelection()
      }
      return
    }
    const intersects=({points})=>{
      const bounds=getBounds(points)
      return bounds&&bounds.maxX>=lo[0]&&bounds.minX<=hi[0]&&bounds.maxY>=lo[1]&&bounds.minY<=hi[1]
    }
    const selected=panels.filter(intersects).map(({panel})=>panel.id)
    const next=gesture.additive?[...new Set([...patternMultiSelection,...selected])]:selected
    setPatternMultiSelection(next)
    if(selected.length)pick({panel:selected[0]})
    else if(!gesture.additive&&tool2d==='select')pick(null)
    if(tool2d==='shape-builder')setShapeBuilderStatus(`${selected.length} pattern${selected.length===1?'':'s'} selected. Use Shape Builder to combine or subtract selected shapes.`)
    patternMarqueeIgnoreClick.current=true
  }
  const shapeBuilderLineValid=shapeBuilderLine?.revision===s?.revision&&shapeBuilderLine?.points?.length>=2
  const applyShapeBuilder = async (a,b,operation='union') => {
    const blockers=nativeShapeBuilderBlockers(s?.template,a,b)
    if(busy||blockers.length){
      setShapeBuilderStatus(blockers.join(' ')||'Select two different patterns.')
      return false
    }
    setShapeBuilderStatus('Combining native cut contours…')
    try{
      const accepted=await edit({kind:'Boolean',a,b,operation,keep_tool:false})
      if(accepted){setShapeBuilderSelection({a:null,b:null});setPatternMultiSelection([]);setShapeBuilderStatus('Cut contours updated in the native garment. Undo is available.')}
      else setShapeBuilderStatus('Native geometry rejected this edit; original pieces were retained.')
      return Boolean(accepted)
    }catch(error){setShapeBuilderStatus(error?.message||'Shape operation could not be completed.');return false}
  }
  const commitShapeBuilderLine = async panelId => {
    if(!shapeBuilderLineValid||busy)return
    const {points,tangents}=shapeBuilderLine
    if(points.length!==2||tangents.some(v=>Math.hypot(v[0],v[1])>1e-8)){
      setShapeBuilderStatus('This native cut currently supports one straight Pen segment. Preserve longer or curved paths until region topology is available.')
      return
    }
    const entry=panels.find(item=>item.panel.id===panelId)
    if(!entry){setShapeBuilderStatus('Select an existing garment pattern.');return}
    const {panel,range}=entry
    const local=shapeBuilderWorldToMaterial(points,range.layout,panel.layout_rotation_degrees||0)
    if(!local){setShapeBuilderStatus('The Pen cut has invalid coordinates or changed while editing.');return}
    setShapeBuilderStatus('Building actual native cut edges…')
    try{
      const committed=await edit({kind:'ShapeBuilder',panel:panelId,points:local})
      if(committed){
        setShapeBuilderLine(null)
        setShapeBuilderSelection({a:null,b:null})
        setShapeBuilderStatus('Pen stroke became two real pattern cut contours. Native Undo is available.')
      }else setShapeBuilderStatus('Native cut was rejected. Keep the straight line crossing two separate outer edges; attached seams and protected markings cannot be split yet.')
    }catch(error){setShapeBuilderStatus(error?.message||'Native Shape Builder rejected this cut.')}
  }
  const shapeBuilderClick = (panelId,event) => {
    if(!panelId||busy)return
    if(shapeBuilderLineValid){
      void commitShapeBuilderLine(panelId)
      return
    }
    const previous=shapeBuilderSelection.a
    if(!previous){setShapeBuilderSelection({a:panelId,b:null});setShapeBuilderStatus('Choose a second shape, or drag across adjoining shapes.');return}
    if(previous===panelId){setShapeBuilderSelection({a:null,b:null});setShapeBuilderStatus('Selection cleared.');return}
    void applyShapeBuilder(previous,panelId,event?.altKey?'difference':event?.shiftKey?'intersection':'union')
  }
  const applySelectedShapeBuilder=async operation=>{
    const [first,...rest]=patternMultiSelection
    if(!first||rest.length!==1){setShapeBuilderStatus('Select exactly two pattern pieces to combine, subtract or intersect.');return}
    await applyShapeBuilder(first,rest[0],operation)
  }
  const finishDrawing = () => {
    if(mode==='line') {
      if(!drawingPanel.current || draft.some(p=>panelAt(p)!==drawingPanel.current)) {
        invalidInternal('An internal line must stay entirely inside one existing pattern.')
        return
      }
      // A concave pattern may contain both endpoints while the segment passes outside.
      for(let i=1;i<draft.length;i++)for(let k=1;k<16;k++) {
        const t=k/16, p=[draft[i-1][0]*(1-t)+draft[i][0]*t,draft[i-1][1]*(1-t)+draft[i][1]*t]
        if(panelAt(p)!==drawingPanel.current){invalidInternal('The internal line crosses outside the pattern boundary.');return}
      }
    }
    const tangents=penSibling(tool2d)?draft.map((_,i)=>vectorTangents[i]||[0,0]):undefined
    const mirrored=tool2d==='vector-pen'&&pencilMirrorMode?mirrorHalfPencilDraft(draft,tangents):null
    if(tool2d==='vector-pen'&&pencilMirrorMode&&!mirrored){
      setPencilMirrorStatus('Mirror needs at least three non-collinear points and two distinct centerline endpoints.')
      return
    }
    onPolygon(mirrored?.points||draft,mirrored?.tangents||tangents)
    setDraft([])
    setVectorTangents([])
    setVectorSelectedAnchor(null)
    setVectorCurveMode(false)
    setVectorCursor(null)
    setPenPrecision(value=>({...value,length:'',angle:''}))
    setPenPrecisionError('')
    setPencilSamples([])
    setPenPaused(false)
    setAnchorEditPopup(null)
    setPencilMirrorStatus('')
    drawingPanel.current=null
  }
  const pencilMirrorPreview=tool2d==='vector-pencil'&&pencilMirrorMode&&pencilSamples.length>=3
    ?mirrorHalfPencilDraft(pencilSamples):null
  const undoDraftVertex = (last=false) => {
    const selected=!last&&Number.isInteger(vectorSelectedAnchor)?vectorSelectedAnchor:draft.length-1
    if(!draft.length)return
    setDraft(points=>points.filter((_,index)=>index!==selected))
    setVectorTangents(points=>points.filter((_,index)=>index!==selected))
    setVectorSelectedAnchor(draft.length<=1?null:Math.max(0,Math.min(selected-1,draft.length-2)))
    if(draft.length===1){drawingPanel.current=null;setVectorCursor(null);setVectorCurveMode(false)}
  }
  const addDraftVertex = () => {
    const inserted=insertPenAnchor(draft,vectorTangents,
      Number.isInteger(vectorSelectedAnchor)?vectorSelectedAnchor:draft.length-2)
    if(!inserted)return
    setDraft(inserted.points);setVectorTangents(inserted.tangents)
    setVectorSelectedAnchor(inserted.index)
  }
  const splitDraftAt = (e) => {
    if(busy||tool2d!=='split'||!draft.length)return false
    const pos=point(e)
    if(!pos)return false
    const hit=penSegmentAt(draft,vectorTangents,pos,Math.max(10*screenUnit,.003))
    if(!hit)return false
    // Do not create duplicate anchors when the user clicks an existing one.
    if(draft.some(anchor=>Math.hypot(anchor[0]-pos[0],anchor[1]-pos[1])<7*screenUnit))return false
    const inserted=insertPenAnchor(draft,vectorTangents,hit.index,hit.t)
    if(!inserted)return false
    setDraft(inserted.points);setVectorTangents(inserted.tangents)
    setVectorSelectedAnchor(inserted.index)
    return true
  }
  const convertDraftCurve = () => {
    if(!penSibling(tool2d)||!draft.length)return
    const selected=Number.isInteger(vectorSelectedAnchor)?vectorSelectedAnchor:draft.length-1
    setVectorCurveMode(true)
    const curved=curvePenAnchor(draft,vectorTangents,selected)
    if(curved)setVectorTangents(curved)
    setVectorSelectedAnchor(selected)
  }
  const penHasPrecision=Boolean(penPrecision.length.trim()||penPrecision.angle.trim())
  const penSegments=penDraftSegmentMetrics(draft,vectorTangents)
  const penTotalLength=penSegments.reduce((sum,segment)=>sum+segment.length,0)
  const penClosingSegment=draft.length>=3
    ?penDraftSegmentMetrics([draft.at(-1),draft[0]],[vectorTangents.at(-1)||[0,0],vectorTangents[0]||[0,0]])[0]
    :null
  const penPreviewCursor=(()=>{
    if(!draft.length||!vectorCursor)return vectorCursor
    if(penHasPrecision){
      try{return dimensionedPenPoint(draft.at(-1),vectorCursor,penPrecision)}catch{return vectorCursor}
    }
    return penPreviewAtDisplayedLength(draft.at(-1),vectorCursor,penPrecision.unit)||vectorCursor
  })()
  // Selecting a material corner affects the preceding AND following cutline.
  // Keep both dimension labels active throughout the live anchor/curve drag.
  const measuredNativeEdges=panel=>{
    const names=panel.polygon?.edges||[]
    const selectedHere=selection?.panel===panel.id
    const keys=[selectedHere?selection.edge:null,
      active?.panel===panel.id?active.edge:null]
    const draggingIndex=handlePreview?.panelId===panel.id&&Number.isInteger(handlePreview.anchorIndex)
      ?handlePreview.anchorIndex:null
    const index=draggingIndex??(selectedHere&&Number.isInteger(selection.anchor)?selection.anchor:null)
    if(index!==null&&index>=0&&index<names.length){
      keys.push(names[index],names[(index+names.length-1)%names.length])
    }
    return [...new Set(keys.filter(edge=>names.includes(edge)))]
  }
  // CLO Edit Pattern's small adjacent dimension style, shared by Pen, Pencil,
  // selected native edges and live Bézier adjustment. No canvas popup.
  // The installed WKWebView's navy CAD background swallowed the previous
  // #343b40 ink; use bright lettering with a dark halo so it remains legible
  // on both navy canvas and white fabric paper.
  const cloInlineDimensionStyle={textAnchor:'middle',fontSize:12*screenUnit,fontWeight:650,
    fill:'#f5fcff',stroke:'#183041',strokeWidth:2.2*screenUnit,
    strokeLinejoin:'round',paintOrder:'stroke',pointerEvents:'none'}
  // Native WKWebView paints the SVG strokes but intermittently omits adjacent
  // SVG <text>. Render the SAME small number inline in the native window for
  // (a) live Pen, (b) already-clicked Pen segments, (c) a selected yellow edge.
  // The fallback uses the actual SVG CTM, including pan and split/2D layout,
  // not a reconstructed viewBox approximation. None are floating widgets.
  const nativeWKLineLabels=(()=>{
    if(typeof navigator==='undefined'||!navigator.userAgent.includes('AppleWebKit')||
      /Chrome|Chromium|CriOS/i.test(navigator.userAgent)||typeof DOMPoint==='undefined')return []
    const root=svg.current,boardRect=root?.closest('.cc-board')?.getBoundingClientRect()
    if(!root||!boardRect)return []
    const labels=[]
    const add=(key,kind,metres,position,reference,text,extra={})=>{
      const matrix=reference?.getScreenCTM?.()
      if(!position||!matrix||!Number.isFinite(metres)||metres<0)return
      const positionPx=new DOMPoint(position.x,position.y).matrixTransform(matrix)
      const x=positionPx.x-boardRect.left,y=positionPx.y-boardRect.top
      if(!Number.isFinite(x)||!Number.isFinite(y)||x<8||x>boardRect.width-8||
        y<8||y>boardRect.height-18)return
      labels.push({key,kind,metres,x,y,text,...extra})
    }
    // penDraftVisible is declared later in this component; derive it here
    // to keep WebKit-specific renders free of a temporal-dead-zone exception.
    if(penSibling(tool2d)&&showPenDimensions&&draft.length){
      const reference=root.querySelector('[data-vector-pen-preview="cubic"]')
      for(const segment of penSegments){
        const position=penInlineLabelPoint(segment.midpoint,segment.midpoint,screenUnit)
        add(`pen-draft:${segment.index}`,'draft',segment.length,position,reference,
          `${formatPenDistancePrecise(segment.length,penPrecision.unit)}${segment.curved?' arc':''}`,
          {segmentIndex:segment.index})
      }
      if(tool2d==='vector-pen'&&penPreviewCursor){
        const a=draft.at(-1),b=penPreviewCursor
        const length=Math.hypot(b[0]-a[0],b[1]-a[1])
        if(length>=.000001)add('pen:live','live',length,
          penInlineLabelPoint(a,b,screenUnit),reference,
          `${formatPenDistancePrecise(length,penPrecision.unit)} · ${(Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI).toFixed(1)}°`)
      }
    }
    if(tool2d==='vector-pencil'){
      const sampled=pencilSamples.length>=2?sampledPenLineMetrics(pencilSamples):null
      const result=sampled||completedPencilMeasure
      if(result){
        const isMirror=sampled?Boolean(pencilMirrorPreview):Boolean(completedPencilMeasure?.mirror)
        const visibleLength=sampled&&isMirror?result.length*2:result.length
        const at=sampled?pencilSamples.at(-1):completedPencilMeasure?.endpoint
        const reference=root.querySelector('[data-vector-draft="pencil"]')||
          root.querySelector('[data-pencil-committed-length]')||
          root.querySelector('[data-clothcraft-metric-layer]')
        if(at)add(sampled?'pencil:live':'pencil:completed',
          sampled?'pencil':'pencil-completed',visibleLength,
          {x:at[0]+10*screenUnit,y:at[1]+13*screenUnit},reference,
          `${isMirror?'Mirrored outline':'Stroke'} ${formatPenDistancePrecise(visibleLength,penPrecision.unit)}`)
      }
    }
    if(!sewingActive)for(const {panel,range} of panels){
      const edges=measuredNativeEdges(panel)
      if(!edges.length)continue
      const livePolygon=handlePreview?.panelId===panel.id&&handlePreview.polygon||
        pendingCurveCommit?.panelId===panel.id&&pendingCurveCommit.polygon||panel.polygon
      const measured=curveDraftDimensions(livePolygon)
      const original=livePolygon===panel.polygon?null:curveDraftDimensions(panel.polygon)
        const currentPreview=preview?.panelId===panel.id||
          (preview?.kind==='move'&&preview?.groupIds?.includes(panel.id))?preview:null
      for(const edge of edges){
        const row=measured.find(item=>item.edge===edge)
        if(!row)continue
        const reference=Array.from(root.querySelectorAll('[data-2d-edge-hit]')).find(element=>
          element.getAttribute('data-2d-edge-hit')===`${panel.id}:${edge}`)
        const middle=previewPoint(transform(panel,range,row.midpoint),currentPreview)
        const previous=original?.find(item=>item.edge===edge)
        const change=previous?row.length-previous.length:null
        add(`native-edge:${panel.id}:${edge}`,
          selection?.panel===panel.id&&edges.includes(edge)?'selected':'hover',
          row.length,penInlineLabelPoint(middle,middle,screenUnit),reference,
          `≈ ${formatPenDistancePrecise(row.length,penPrecision.unit)}${change!==null&&Math.abs(change)>=.00005
            ?` (${change>=0?'+':''}${formatPenDistancePrecise(change,penPrecision.unit)})`:''}`,
          {panelId:panel.id,edge})
      }
    }
    // The native EXO WKWebView can paint the internal-guide stroke while
    // silently omitting SVG text. Reuse the same HTML/CTM-backed measurement
    // channel as the working outside cutline labels, for both front and back.
    const hoveredGuide=hoveredGuideGeometry?.id===hoveredGuideId?hoveredGuideGeometry:null
    const activeGuide=hoveredGuide||(!hoveredGuideId?selectedGuide:null)
    if(!sewingActive&&activeGuide?.points?.length===2){
      const guideElement=[...root.querySelectorAll('[data-guide-id]')].find(element=>
        element.getAttribute('data-guide-id')===activeGuide.id&&
        element.getAttribute('data-guide-panel')===activeGuide.panelId)
      const reference=guideElement?.querySelector('polyline[data-guide-curve],line:not([stroke="transparent"])')
      const actual=activeGuide.pathPoints||activeGuide.points
      const measured=sampledPenLineMetrics(actual)
      if(measured&&reference){
        const at=penInlineLabelPoint(measured.midpoint,measured.midpoint,screenUnit)
        add(`inside-guide:${activeGuide.id}`,'guide',measured.length,at,reference,
          formatPenDistancePrecise(measured.length,penPrecision.unit),
          {panelId:activeGuide.panelId,edge:activeGuide.id})
      }
    }
    // Graphic dimensions share the identical HTML fallback. Compute from
    // the transformed SVG rectangle so rotated prints and zoom stay exact.
    for(const element of root.querySelectorAll('[data-2d-graphic-hit]')){
      const id=element.getAttribute('data-2d-graphic-hit')
      if(id!==hoveredGraphicId&&id!==selectedGraphicId)continue
      const graphic=graphics.find(item=>String(item.id)===id)
      const width=Number(graphicPreview?.id===id?graphicPreview.widthMm:graphic?.widthMm)/1000
      const height=Number(graphicPreview?.id===id?graphicPreview.heightMm:graphic?.heightMm)/1000
      const x=Number(element.getAttribute('x')),y=Number(element.getAttribute('y'))
      if(![width,height,x,y].every(Number.isFinite)||width<=0||height<=0)continue
      add(`graphic-width:${id}`,'graphic-width',width,
        {x:x+width/2,y:y-12*screenUnit},element,
        formatDisplayMeasurement20261025(width,rulerUnits),{edge:id,panelId:graphic?.panel})
      add(`graphic-height:${id}`,'graphic-height',height,
        {x:x+width+12*screenUnit,y:y+height/2},element,
        formatDisplayMeasurement20261025(height,rulerUnits),{edge:id,panelId:graphic?.panel})
    }
    return labels
  })()
  const addPrecisePenEdge = () => {
    if(busy||tool2d!=='vector-pen'||mode!=='pen'||!draft.length)return
    try {
      if(parsePenDimension(penPrecision.length,penPrecision.unit)===null)
        throw new Error('Enter an exact length before adding an edge')
      const start=draft.at(-1)
      const previous=draft.at(-2)
      const direction=vectorCursor&&Math.hypot(vectorCursor[0]-start[0],vectorCursor[1]-start[1])>.000001
        ?vectorCursor:previous?[start[0]+start[0]-previous[0],start[1]+start[1]-previous[1]]
        :[start[0]+1,start[1]]
      const next=dimensionedPenPoint(start,direction,penPrecision)
      if(Math.hypot(next[0]-draft[0][0],next[1]-draft[0][1])<1e-9)
        throw new Error('The new anchor overlaps the first anchor; use Close pattern instead')
      setDraft(points=>[...points,next])
      setVectorTangents(points=>[...points,[0,0]])
      setVectorSelectedAnchor(draft.length)
      setVectorCursor(null)
      setPenPrecisionError('')
    } catch(error) {setPenPrecisionError(error.message||String(error))}
  }
  const resizePrecisePenEdge = () => {
    if(busy||tool2d!=='vector-pen'||!Number.isInteger(vectorSelectedAnchor)||vectorSelectedAnchor<1)return
    try {
      if(!penHasPrecision)throw new Error('Enter a length or angle to adjust this edge')
      const index=vectorSelectedAnchor
      const next=dimensionedPenPoint(draft[index-1],draft[index],penPrecision)
      setDraft(points=>points.map((p,i)=>i===index?next:p))
      setPenPrecisionError('')
    }catch(error){setPenPrecisionError(error.message||String(error))}
  }
  const editingDraft=penSibling(tool2d)&&draft.length>0
  const penDraftVisible=penSibling(tool2d)
  // Position the anchor toolbar in viewport pixels, not beside a point in
  // material metres; moving a corner must never move the controls over it.
  const dragAnchorToolbar=event=>{
    if(event.button!==0)return
    const board=event.currentTarget.closest('.cc-board')?.getBoundingClientRect()
    const toolbar=event.currentTarget.closest('[data-context-anchor-tools]')?.getBoundingClientRect()
    if(!board||!toolbar)return
    event.preventDefault()
    event.stopPropagation()
    anchorToolbarDrag.current={pointerId:event.pointerId,dx:event.clientX-toolbar.left,dy:event.clientY-toolbar.top}
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const moveAnchorToolbar=event=>{
    const drag=anchorToolbarDrag.current
    if(!drag||drag.pointerId!==event.pointerId)return
    const board=event.currentTarget.closest('.cc-board')?.getBoundingClientRect()
    if(!board)return
    setAnchorToolbarPosition({
      x:Math.max(6,Math.min(board.width-255,event.clientX-board.left-drag.dx)),
      y:Math.max(6,Math.min(board.height-45,event.clientY-board.top-drag.dy)),
    })
  }
  const addNativeAnchor = () => {
    if(busy||!selection?.panel)return
    const panel=s?.template?.panels?.find(item=>item.id===selection.panel)
    const range=s?.panels?.find(item=>item.id===selection.panel)
    const edge=selection.edge||panel?.polygon?.edges?.[selection.anchor]
    const indices=range?.boundaries?.[edge]
    if(!edge||!Array.isArray(indices)||indices.length<2)return
    const length=indices.slice(1).reduce((sum,index,i)=>{
      const a=boardUV[indices[i]],b=boardUV[index]
      return a&&b?sum+Math.hypot(b[0]-a[0],b[1]-a[1]):sum
    },0)
    if(length>.0002)void edit({kind:'SplitBoundary',panel:panel.id,edge,at_m:length/2})
  }
  const removeNativeAnchor = () => {
    if(busy||!selection?.panel||!Number.isInteger(selection.anchor))return
    void edit({kind:'RemovePoint',panel:selection.panel,point:selection.anchor})
  }
  useEffect(()=>{
    if(!isDrawing&&!editingDraft)return
    const onKey=event=>{
      if(event.target?.closest?.('input,textarea,select,[contenteditable="true"]'))return
      // Uncommitted vertices are the latest drawing actions. Rewind those
      // before touching the Rust document's committed edit history.
      if(draft.length&&(event.metaKey||event.ctrlKey)&&!event.altKey&&!event.shiftKey&&event.key.toLowerCase()==='z'){
        event.preventDefault();event.stopImmediatePropagation()
        undoDraftVertex(true)
        return
      }
      if(event.key==='Escape'&&draft.length){
        event.preventDefault();event.stopImmediatePropagation()
        // VectorCraft finishes the active gesture on Escape. Preserve the
        // authored anchors as a separate open path so a blank click begins
        // an unrelated contour; either endpoint still resumes this path.
        if(tool2d==='vector-pen'){
          const parked=parkOpenPenPath(parkedPenPaths,draft,vectorTangents,nextOpenPenId.current)
          if(parked){setParkedPenPaths(parked);nextOpenPenId.current++}
          setDraft([]);setVectorTangents([]);setVectorSelectedAnchor(null)
          setVectorCurveMode(false)
        }
        setPenPaused(true)
        setVectorCursor(null)
        vectorDrag.current=null
        setPenPrecisionError('')
        return
      }
      if(penSibling(tool2d)&&draft.length&&(event.metaKey||event.ctrlKey)&&
        !event.altKey&&!event.shiftKey&&event.key.toLowerCase()==='c'){
        event.preventDefault();event.stopImmediatePropagation();convertDraftCurve();return
      }
      // Plus/Minus are persistent tool selectors, not immediate mutations.
      // The user must then click a particular segment or anchor, respectively.
      if(event.key==='Enter'&&draft.length>=(mode==='line'?2:3)&&!busy){event.preventDefault();finishDrawing()}
    }
    window.addEventListener('keydown',onKey,true)
    return()=>window.removeEventListener('keydown',onKey,true)
  },[isDrawing,editingDraft,mode,tool2d,draft,vectorTangents,vectorSelectedAnchor,parkedPenPaths,busy,onPolygon,panels,boardUV])
  useEffect(()=>{
    const focusedOnBoard=()=>document.activeElement?.closest?.('.cc-board')
    const switchTemporary=(tool)=>{
      window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',
        {detail:{tool,temporary:true}}))
    }
    const down=event=>{
      const key=(event.key==='Alt'||event.key==='Option')?'Alt':
        event.key==='Shift'?'Shift':null
      if(!key||event.repeat||event.metaKey||event.ctrlKey||
        temporaryAnchorBorrow.current||
        !['vector-pen','vector-pencil'].includes(tool2d)||
        (!focusedOnBoard()&&!svg.current?.matches(':hover'))||
        event.target?.closest?.('input,textarea,select,[contenteditable="true"]'))return
      if(key==='Shift'&&event.altKey||key==='Alt'&&event.shiftKey)return
      temporaryAnchorBorrow.current={key,origin:tool2d}
      temporaryShiftPen.current=key==='Shift'
      event.preventDefault()
      switchTemporary('anchor-point')
    }
    const release=event=>{
      const borrowed=temporaryAnchorBorrow.current
      if(!borrowed)return
      const released=(event.key==='Alt'||event.key==='Option')?'Alt':event.key
      if(event.type==='keyup'&&released!==borrowed.key)return
      temporaryAnchorBorrow.current=null
      temporaryShiftPen.current=false
      if(event.type==='keyup')event.preventDefault()
      switchTemporary(borrowed.origin)
    }
    window.addEventListener('keydown',down,true)
    window.addEventListener('keyup',release,true)
    window.addEventListener('blur',release)
    return()=>{
      window.removeEventListener('keydown',down,true)
      window.removeEventListener('keyup',release,true)
      window.removeEventListener('blur',release)
    }
  },[tool2d])
  useEffect(()=>{
    const shortcut=event=>{
      if(event.defaultPrevented||busy||event.repeat||event.metaKey||event.ctrlKey||event.altKey||
        event.target?.closest?.('input,textarea,select,[contenteditable="true"]'))return
      // This is the actual 2D drawing SVG, not a global shortcut stealing
      // keys from the 3D camera, library search, or Rust property inspector.
      if(!event.target?.closest?.('.cc-board') && !document.activeElement?.closest?.('.cc-board'))return
      if(tool2d==='vector-pen'&&['i','m','u'].includes(event.key.toLowerCase())){
        event.preventDefault();event.stopImmediatePropagation()
        const newUnit=event.key.toLowerCase()==='i'?'in':
          event.key.toLowerCase()==='m'?'mm':
            ({mm:'cm',cm:'in',in:'mm',m:'mm'}[penPrecision.unit]||'mm')
        setPenPrecision(value=>{
          let length=value.length
          try{length=convertPenDimension(value.length,value.unit,newUnit)}catch{length=''}
          return {...value,length,unit:newUnit}
        })
        return
      }
      const tools={p:'vector-pen',b:'vector-pencil',v:'select',a:'direct-select',c:'curve','+':'split','-':'remove-anchor'}
      const tool=event.shiftKey&&event.key.toLowerCase()==='c'?'anchor-point':tools[event.key.toLowerCase()]
      if(!tool||draft.length&&tool==='curve')return
      event.preventDefault();event.stopImmediatePropagation()
      window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool}}))
    }
    window.addEventListener('keydown',shortcut,true)
    return()=>window.removeEventListener('keydown',shortcut,true)
  },[busy,draft,tool2d,vectorTangents,vectorSelectedAnchor,penPrecision.unit])
  const measuring = mode === 'edit' && ['measure','measure-edit'].includes(tool2d)
  const editingTape = measuring && tool2d === 'measure-edit'
  const nativeCursor = busy ? 'default' : mode==='edit' && ['point','remove-anchor'].includes(tool2d) ? 'crosshair' : sewingActive || editSewingActive ? SEWING_CURSOR :
    mode === 'pen' ? cursorForTool(tool2d==='vector-pen'?'vector-pen':'polygon') :
    mode === 'line' ? cursorForTool('internal') :
    mode === 'edit' && tool2d === 'pleat' ? PLEAT_CURSOR :
    mode === 'edit' && tool2d !== 'select' && tool2d !== 'seam-edit' ? cursorForTool(tool2d) : null
  const splitBoundary = (e,panel,edge,indices) => {
    if(busy || mode!=='edit' || !['split'].includes(tool2d))return false
    const p=point(e);if(!p)return true
    let total=0,best=Infinity,at=0
    for(let k=1;k<indices.length;k++){
      const a=boardUV[indices[k-1]],b=boardUV[indices[k]]
      if(!a||!b)continue
      const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)
      if(!length)continue
      const t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(length*length)))
      const distance=Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)
      if(distance<best){best=distance;at=total+t*length}total+=length
    }
    if(total>0.0002){
      pick({panel:panel.id,edge})
      void edit({kind:'SplitBoundary',panel:panel.id,edge,at_m:Math.max(.0001,Math.min(total-.0001,at))})
    }
    return true
  }
  // The same sampled material-space boundary used by the Rust compiled mesh
  // determines the notch's fractional arclength, irrespective of 2D zoom.
  // The native authoring layer validates all dimensions and records history.
  const editConstructionEdge = (e,panel,edge,indices) => {
    if(busy||mode!=='edit'||!['notch','allowance'].includes(tool2d))return false
    if(tool2d==='allowance'){
      const plan=preflightNativeCutMark20261025(s,{panelId:panel.id,edge,
        kind:'allowance',widthMm:e.altKey?0:allowanceWidthMm})
      if(!plan.ok){setFreeCurveStatus('Seam allowance blocked: '+plan.reason);return true}
      void edit(plan.command)
      setFreeCurveStatus(`Native allowance: ${e.altKey?'removed':allowanceWidthMm+' mm'} on ${edge} · Undo available.`)
      pick({panel:panel.id,edge})
      return true
    }
    const p=point(e)
    if(!p)return true
    let total=0,best=Infinity,at=0
    for(let k=1;k<indices.length;k++){
      const a=boardUV[indices[k-1]],b=boardUV[indices[k]]
      if(!a||!b)continue
      const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)
      if(length<1e-9)continue
      const t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(length*length)))
      const d=Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)
      if(d<best){best=d;at=total+t*length}
      total+=length
    }
    if(total>.002){
      const t=Math.max(.002,Math.min(.998,at/total))
      const plan=preflightNativeCutMark20261025(s,{panelId:panel.id,edge,
        kind:e.altKey?'remove':e.shiftKey?'pair':'notch',t,
        depthMm:notchDepthMm,spacingMm:notchPairSpacingMm})
      if(!plan.ok){setFreeCurveStatus('Notch edit blocked: '+plan.reason);return true}
      if(e.altKey){
        // Preflight returns the ORIGINAL saved notch station; Rust removal
        // requires an exact physical arclength identity, not pointer rounding.
        void edit(plan.command)
      }else if(e.shiftKey){
        // Atomic Rust NotchPair: no partial placement if either mark invalid.
        void edit(plan.command)
      }else void edit(plan.command)
      setFreeCurveStatus(e.altKey?'Existing notch removed · Undo restores it.':
        `${e.shiftKey?'Double':'Single'} native notch placed at ${(t*100).toFixed(1)}% of ${edge} · ${plan.lengthMm.toFixed(1)} mm physical cutline.`)
      pick({panel:panel.id,edge})
    }
    return true
  }
  const createPhysicalDart = (e,panel,edge) => {
    if(busy||mode!=='edit'||tool2d!=='dart')return false
    e.preventDefault();e.stopPropagation()
    const polygon=panel.polygon,idx=polygon?.edges?.indexOf(edge)
    if(idx==null||idx<0||polygon.curves?.[edge]||polygon.free_curve_points?.[edge]?.length){
      setFreeCurveStatus('Cut-and-sewn darts currently require an unsewn straight material boundary.')
      return true
    }
    const xy=point(e);if(!xy)return true
    const a=polygon.points[idx],b=polygon.points[(idx+1)%polygon.points.length]
    const angle=(panel.layout_rotation_degrees||0)*Math.PI/180
    const range=s.panels.find(p=>p.id===panel.id)
    if(!range)return true
    const dx=xy[0]-range.layout[0],dy=xy[1]-range.layout[1]
    const local=[dx*Math.cos(angle)+dy*Math.sin(angle),-dx*Math.sin(angle)+dy*Math.cos(angle)]
    const delta=[b[0]-a[0],b[1]-a[1]],squared=delta[0]**2+delta[1]**2,length=Math.sqrt(squared)
    if(length<=.02)return true
    const center=Math.max(.001,Math.min(.999,((local[0]-a[0])*delta[0]+(local[1]-a[1])*delta[1])/squared))
    const half=(dartIntakeMm/1000)/(2*length),left_t=center-half,right_t=center+half
    const inward=[-delta[1]/length,delta[0]/length]
    const midpoint=[a[0]+delta[0]*center,a[1]+delta[1]*center]
    const apex=[midpoint[0]+inward[0]*dartDepthMm/1000,midpoint[1]+inward[1]*dartDepthMm/1000]
    if(left_t<=.01||right_t>=.99){setFreeCurveStatus('Dart intake overlaps the boundary end. Click farther from the corner.');return true}
    pick({panel:panel.id,edge})
    void edit({kind:'DartCutSew',panel:panel.id,edge,left_t,right_t,apex})
    return true
  }
  const boundaryMark = (indices,t) => {
    const path=indices.map(i=>boardUV[i]).filter(Boolean)
    const segments=path.slice(1).map((to,i)=>({a:path[i],b:to,d:Math.hypot(to[0]-path[i][0],to[1]-path[i][1])}))
    const total=segments.reduce((sum,s)=>sum+s.d,0)
    let at=Math.max(0,Math.min(1,t))*total
    for(const segment of segments){
      if(at<=segment.d||segment===segments.at(-1)){
        if(segment.d<1e-10)return null
        const dx=(segment.b[0]-segment.a[0])/segment.d,dy=(segment.b[1]-segment.a[1])/segment.d
        return {p:[segment.a[0]+dx*at,segment.a[1]+dy*at],normal:[dy,-dx]}
      }
      at-=segment.d
    }
    return null
  }
  const sewingEdgeLength = indices => {
    if(!Array.isArray(indices)||indices.length<2)return null
    const coords=indices.map(index=>boardUV[index])
    if(coords.some(p=>!Array.isArray(p)||p.length<2||!p.every(Number.isFinite)))return null
    return coords.slice(1).reduce((length,p,i)=>length+Math.hypot(p[0]-coords[i][0],p[1]-coords[i][1]),0)
  }
  const closestPomStation = p => {
    let best=null
    for(const {panel,range} of panels){
      for(const [edge,indices] of Object.entries(range.boundaries||{})){
        const path=indices.map(i=>boardUV[i]).filter(Boolean)
        const total=path.slice(1).reduce((sum,b,i)=>sum+Math.hypot(b[0]-path[i][0],b[1]-path[i][1]),0)
        let travelled=0
        for(let i=1;i<path.length;i++){
          const a=path[i-1],b=path[i],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy)
          if(length<1e-9)continue
          const u=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(length*length)))
          const location=[a[0]+u*dx,a[1]+u*dy],distance=Math.hypot(p[0]-location[0],p[1]-location[1])
          if(!best||distance<best.distance)best={panel:panel.id,edge,t:(travelled+u*length)/total,p:location,distance}
          travelled+=length
        }
      }
    }
    // Hit radius is visual, not a fixed 35 mm material distance: at high
    // zoom a distant cutline should never silently capture a POM station.
    const matrix=svg.current?.getScreenCTM()
    const pixelsPerMetre=matrix?Math.hypot(matrix.a,matrix.b):0
    const tolerance=pixelsPerMetre>1e-9?Math.min(.035,12/pixelsPerMetre):.012
    return best?.distance<=tolerance?best:null
  }
  const markCanvas = e => {
    if (busy || e.button !== 0 || (!isDrawing && !measuring)) return
    // An existing tape endpoint is edited by dragging its real material-space
    // location. Do not accidentally start a new tape on the capture phase.
    if(editingTape)return
    const p = point(e)
    if (!p) return
    if(measuring && !editingTape){
      e.stopPropagation();e.preventDefault()
      const station=closestPomStation(p)
      if(!station){setPomStart(null);setTape([]);return}
      if(!pomStart){setPomStart(station);setTape([station.p]);return}
      if(pomStart.panel!==station.panel){setPomStart(station);setTape([station.p]);return}
      const id=`pom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`
      const panel=s.template?.panels?.find(item=>item.id===station.panel)
      const label=`POM ${(panel?.polygon?.measurements?.length||0)+1}`
      setTape([pomStart.p,station.p]);setPomStart(null)
      void (async()=>{
        const created=await edit({kind:'SetMeasurement',panel:station.panel,measurement:{
          id,label,a:{edge:pomStart.edge,t:pomStart.t},b:{edge:station.edge,t:station.t},
        }})
        if(created){setSelectedPom({panel:station.panel,id});setPomLabelDraft(label)}
        else setTape([])
      })()
      return
    }
    if(mode==='line') {
      const hit=panelAt(p)
      if(!hit){invalidInternal('Click inside an existing 2D pattern to draw an internal line.');e.stopPropagation();e.preventDefault();return}
      if(drawingPanel.current && drawingPanel.current!==hit){invalidInternal('Continue drawing inside the same pattern. Press Escape to start another line.');e.stopPropagation();e.preventDefault();return}
      if(!drawingPanel.current){drawingPanel.current=hit;pick({panel:hit})}
    }
    // Capture before fabric/edge handlers consume the pointer event. Internal
    // lines must be drawable directly on the selected fabric surface.
    e.stopPropagation()
    e.preventDefault()
    if (tool2d==='vector-pencil') {
      setPencilMirrorMenu(null)
      setPencilMirrorStatus('')
      setCompletedPencilMeasure(null)
      vectorDrag.current={start:p,pointerId:e.pointerId,pencil:true}
      setPencilSamples([p])
      svg.current.setPointerCapture(e.pointerId)
      return
    }
    if(isDrawing){
      if(tool2d==='vector-pen'&&penPaused)setPenPaused(false)
      if(tool2d==='vector-pen'&&draft.length>=3&&Math.hypot(p[0]-draft[0][0],p[1]-draft[0][1])<.014){
        finishDrawing()
        return
      }
      let placed=p
      if(tool2d==='vector-pen'&&draft.length){
        try{
          placed=penHasPrecision?dimensionedPenPoint(draft.at(-1),p,penPrecision):
            penPreviewAtDisplayedLength(draft.at(-1),p,penPrecision.unit)||p
          setPenPrecisionError('')
        }catch(error){setPenPrecisionError(error.message||String(error));return}
      }
      setDraft(old=>[...old,placed])
      if(tool2d==='vector-pen'){
        setVectorTangents(old=>[...old,[0,0]])
        setVectorSelectedAnchor(draft.length)
        setVectorCursor(null)
        vectorDrag.current={start:placed,index:draft.length,pointerId:e.pointerId}
        svg.current.setPointerCapture(e.pointerId)
      }
    }
    else setTape(old => old.length === 1 ? [old[0],p] : [p])
  }
  const showAnchorEditor=(event,kind,panelId=null,index=null)=>{
    if(busy||tool2d!=='direct-select')return
    setAnchorEditPopup({kind,panelId,index,cursor:null})
  }
  const showNativeAnchorEditor=(event,panel,index)=>{
    if(busy||!panel?.polygon?.points?.[index])return
    event.preventDefault();event.stopPropagation()
    pick({panel:panel.id,anchor:index,edge:panel.polygon.edges[index]})
    if(tool2d==='select')setTool2d('direct-select')
    setAnchorEditPopup({kind:'native',panelId:panel.id,index,cursor:null})
  }
  const anchorEditVisual=(()=>{
    const popup=anchorEditPopup
    if(!popup||tool2d!=='direct-select'||mode!=='edit')return null
    if(popup.kind==='draft'){
      const geometry=cornerWidgetGeometry(draft,popup.index,{offset:14*screenUnit})
      if(!geometry)return null
      const t=vectorTangents[popup.index]||[0,0]
      return {anchor:geometry.anchor,knob:popup.cursor||geometry.center,
        guidelines:Math.hypot(...t)>1e-7?[geometry.anchor.map((v,i)=>v-t[i]),geometry.anchor.map((v,i)=>v+t[i])]:[],geometry}
    }
    const entry=panels.find(item=>item.panel.id===popup.panelId)
    const polygon=entry&&handlePreview?.panelId===popup.panelId&&handlePreview.polygon||entry?.panel.polygon
    const geometry=cornerWidgetGeometry(polygon?.points,popup.index,{closed:true,offset:14*screenUnit})
    if(!entry||!geometry)return null
    const count=polygon.points.length,inc=polygon.edges[(popup.index+count-1)%count],out=polygon.edges[popup.index]
    const incoming=polygon.curves?.[inc]?.[1],outgoing=polygon.curves?.[out]?.[0]
    return {anchor:transform(entry.panel,entry.range,geometry.anchor),
      knob:popup.cursor||transform(entry.panel,entry.range,geometry.center),
      guidelines:[incoming,outgoing].filter(Boolean).map(p=>transform(entry.panel,entry.range,p)),geometry}
  })()
  const beginCornerDrag=e=>{
    if(e.button!==0||busy||!anchorEditPopup||!anchorEditVisual)return
    e.stopPropagation();e.preventDefault()
    const popup=anchorEditPopup
    const entry=popup.kind==='native'?panels.find(row=>row.panel.id===popup.panelId):null
    if(popup.kind==='native'&&!entry)return
    const start=point(e)
    if(!start)return
    const baseline=entry?.panel.polygon
    const vertex=baseline?.points?.[popup.index]
    const edge=baseline?.edges?.[popup.index]
    const previous=baseline?.edges?.[(popup.index+baseline.edges.length-1)%baseline.edges.length]
    const outgoing=baseline?.curves?.[edge]?.[0]
    const incoming=baseline?.curves?.[previous]?.[1]
    const initial=popup.kind==='draft'?[...(vectorTangents[popup.index]||[0,0])]:
      outgoing&&vertex?outgoing.map((v,i)=>v-vertex[i]):
      incoming&&vertex?incoming.map((v,i)=>vertex[i]-v):[0,0]
    const toLocal=world=>{
      if(!entry)return world
      const a=-(entry.panel.layout_rotation_degrees||0)*Math.PI/180
      const dx=world[0]-entry.range.layout[0],dy=world[1]-entry.range.layout[1]
      return [dx*Math.cos(a)-dy*Math.sin(a),dx*Math.sin(a)+dy*Math.cos(a)]
    }
    cornerDrag.current={pointerId:e.pointerId,kind:popup.kind,index:popup.index,
      entry,baseline,start,startLocal:toLocal(start),initial,moved:false,proposal:null}
    svg.current?.setPointerCapture(e.pointerId)
  }
  const moveCornerDrag=e=>{
    const gesture=cornerDrag.current
    if(!gesture||gesture.pointerId!==e.pointerId)return false
    const world=point(e)
    if(!world||!gesture.start)return true
    if(Math.hypot(world[0]-gesture.start[0],world[1]-gesture.start[1])<1.2*screenUnit&&!gesture.moved)return true
    gesture.moved=true
    if(gesture.kind==='draft'){
      const geometry=cornerWidgetGeometry(draft,gesture.index,{offset:14*screenUnit})
      const tangent=cornerWidgetDragHandle(geometry,world,
        {start:gesture.start,initial:gesture.initial,shift:e.shiftKey,screenUnit})
      if(tangent){setVectorTangents(old=>old.map((v,i)=>i===gesture.index?tangent:v));setVectorCurveMode(true)}
    }else{
      const {entry,baseline}=gesture
      const a=-(entry.panel.layout_rotation_degrees||0)*Math.PI/180
      const dx=world[0]-entry.range.layout[0],dy=world[1]-entry.range.layout[1]
      const local=[dx*Math.cos(a)-dy*Math.sin(a),dx*Math.sin(a)+dy*Math.cos(a)]
      const proposal=previewNativeCornerDrag(baseline,gesture.index,local,
        {start:gesture.startLocal,initial:gesture.initial,shift:e.shiftKey,screenUnit})
      gesture.proposal=proposal
      setHandlePreview(proposal?{panelId:entry.panel.id,polygon:proposal,anchorIndex:gesture.index}:null)
    }
    setAnchorEditPopup(old=>old?{...old,cursor:world}:old)
    return true
  }
  const endCornerDrag=e=>{
    const gesture=cornerDrag.current
    if(!gesture||gesture.pointerId!==e.pointerId)return false
    cornerDrag.current=null
    try{svg.current?.releasePointerCapture(e.pointerId)}catch{}
    setAnchorEditPopup(old=>old?{...old,cursor:null}:old)
    if(gesture.kind==='native'){
      const proposal=gesture.proposal
      if(gesture.moved&&proposal)void applyOrStagePatternCurve(gesture.entry.panel,proposal,
        gesture.baseline.edges[gesture.index])
      else setHandlePreview(null)
    }
    return true
  }
  const resumeParkedPath=(id,index)=>{
    const restored=restoreOpenPenPath(parkedPenPaths,id,index)
    if(!restored)return null
    setParkedPenPaths(restored.remaining)
    setDraft(restored.points)
    setVectorTangents(restored.tangents)
    setVectorSelectedAnchor(restored.selected)
    setVectorCursor(null)
    setPenPaused(false)
    return restored
  }
  return <div className="cc-board" aria-busy={busy} data-cad-auto-contrast={String(Boolean(adaptiveCad))} data-cad-expanded={String(showRulers)} data-document-revision={s.revision} data-segment-sewing={String(segmentSewing)} data-free-sewing={String(freeSewing)}
    data-pattern-surface-style={studioPreferences?.twoDPatternSurfaceStyle||'solid'}
    data-pen-unit={penPrecision.unit}
    data-pen-paused={String(penPaused)}
    data-pen-open-contours={parkedPenPaths.length}
    data-2d-canvas-theme={accumarkGreen?'accumark-green':'classic'} data-2d-grid-style={markerStyle}
    data-edit-sewing={String(editSewingActive)}
    data-selected-native-seam={selection?.seamId||''}
    data-segment-sew-stage={sewingCommitting?'saving':sewingFirstEdge?'second':'first'}
    data-free-sew-stage={sewingCommitting?'saving':String(freeSewPoints.length)}
    data-free-sew-points-count={freeSewPoints.length}
    data-2d-editor-mode={mode}
    data-reference-guides-visible={String(showReferenceGuides)}
    data-internal-lines-visible={String(showInternalLines)}
    data-native-notches-visible={String(showNativeNotches)}
    data-seam-allowances-visible={String(showNativeAllowances)}
    data-precision-drafting={String(precisionDrafting)}
    style={{position: 'relative', background:canvasColor,
      ...(adaptiveCad?{'--cad-adaptive-edge':adaptiveCad.edge,'--cad-adaptive-edge-halo':adaptiveCad.edgeHalo,
        '--cad-adaptive-grid':adaptiveCad.grid,'--cad-adaptive-measure':adaptiveCad.measure,
        '--cad-adaptive-measure-halo':adaptiveCad.measurementHalo,'--cad-adaptive-measure-outside':adaptiveCad.measurementOutside,
        '--cad-adaptive-point':adaptiveCad.point,'--cad-adaptive-selected':adaptiveCad.selection,
        '--cad-adaptive-notch':adaptiveCad.notch,'--cad-adaptive-paper':adaptiveCad.patternPaper,
        '--cad-adaptive-ruler':adaptiveCad.ruler,'--cad-adaptive-grade-main':adaptiveCad.gradeMain,
        '--cad-adaptive-grade-base':adaptiveCad.gradeBase,
        '--cad-adaptive-grade-other':adaptiveCad.gradeOther,'--cad-adaptive-grade-halo':adaptiveCad.gradeHalo}: {})}}>
    {nativeWKLineLabels.map(label=><span key={label.key}
      data-native-pen-inline-length={label.kind==='live'?'true':undefined}
      data-native-line-measure={label.kind}
      data-native-measure-panel={label.panelId}
      data-native-measure-edge={label.edge}
      data-native-measure-segment={label.segmentIndex}
      data-pen-inline-visible-metres={label.metres.toFixed(8)}
      data-line-length-unit={penPrecision.unit}
      aria-label={`${label.kind==='selected'?'Selected cutline':label.kind==='draft'?'Completed Pen segment':'Current line'} ${label.text}`}
      style={{position:'absolute',left:label.x,top:label.y,
        transform:'translate(-50%,0)',whiteSpace:'nowrap',pointerEvents:'none',
        font:'650 12px/1.2 -apple-system,BlinkMacSystemFont,sans-serif',
        letterSpacing:'.01em',color:'#f6fbff',
        textShadow:'0 1px 2px #001524,1px 0 2px #001524,-1px 0 2px #001524,0 -1px 2px #001524',
        zIndex:7}}>{label.text}</span>)}
    <ClothCraftCornerTools dimension="2d" mode={mode} activeTool={tool2d} onChangeMode={onChangeMode}
      displayLayers={displayLayers} onToggleDisplayLayer={toggleDisplayLayer}
      allowanceWidthMm={allowanceWidthMm} onChangeAllowanceWidth={width=>{
        if(Number.isFinite(width)&&width>=.1&&width<=500)setAllowanceWidthMm(width)
      }}
      notchDepthMm={notchDepthMm} onChangeNotchDepth={depth=>{
        if(Number.isFinite(depth)&&depth>=.5&&depth<=100)setNotchDepthMm(depth)
      }}
      notchPairSpacingMm={notchPairSpacingMm} onChangeNotchPairSpacing={spacing=>{
        if(Number.isFinite(spacing)&&spacing>=1&&spacing<=200)setNotchPairSpacingMm(spacing)
      }}
      dartIntakeMm={dartIntakeMm} onChangeDartIntake={value=>{
        if(Number.isFinite(value)&&value>=3&&value<=150)setDartIntakeMm(value)
      }}
      dartDepthMm={dartDepthMm} onChangeDartDepth={value=>{
        if(Number.isFinite(value)&&value>=8&&value<=500)setDartDepthMm(value)
      }}
      selectedGuide={selectedGuide} onCreateGuideLine={()=>{void createNativeLineFromGuide(selectedGuide);setSelectedGuide(null)}}
      onRemoveGuideLine={()=>{if(selectedGuide?.nativeLineId)void edit({kind:'RemoveLine',panel:selectedGuide.panelId,line:selectedGuide.nativeLineId});setSelectedGuide(null)}}
      onClearGuide={()=>setSelectedGuide(null)}
      onChangeTool={name => {
        // A deliberate toolbar selection cancels an Option/Shift borrow:
        // releasing the modifier must not unexpectedly switch tools back.
        temporaryAnchorBorrow.current=null
        temporaryShiftPen.current=false
        if(name==='shape-builder'&&tool2d==='vector-pen'&&draft.length>=2)
          setShapeBuilderLine({points:draft.map(p=>[...p]),tangents:draft.map((_,i)=>vectorTangents[i]||[0,0]),revision:s?.revision})
        if(!(penSibling(tool2d)&&penSibling(name))){
          setDraft([]);setVectorTangents([]);setVectorSelectedAnchor(null);setVectorCurveMode(false);drawingPanel.current=null
        }
        setTool2d(name);setVectorCursor(null);setTape([])
      }} disabled={busy}/>
    <PatternReferenceImageControls {...reference} unitsPerCm={.01} viewBounds={view} menuOnly editorScope="native"/>
    {tool2d==='shape-builder'&&mode==='edit'&&<div data-native-shape-builder="canvas"
      role="status" aria-live="polite"
      style={{position:'absolute',left:12,bottom:12,zIndex:12,maxWidth:'min(400px,75%)',
        padding:'4px 8px',borderRadius:4,background:'#1b3845db',color:'#d9f0f3',
        font:'11px/1.35 system-ui',pointerEvents:'none'}}>
      {shapeBuilderStatus||(shapeBuilderLineValid
        ?'Open Pen boundary ready. Click a target pattern to turn it into real cut edges. Escape clears selection.'
        :patternMultiSelection.length>1?'Selected patterns ready · Combine, Subtract or Intersect.'
        :shapeBuilderSelection.a?'Click or drag across another shape to merge. Option = subtract · Shift = intersect.'
          :'Shape Builder · Click or drag across shapes to merge. Option = subtract · Shift = intersect.')}
    </div>}
    {tool2d==='shape-builder'&&mode==='edit'&&patternMultiSelection.length>1&&<div
      data-shape-builder-selection-actions="true" role="toolbar" aria-label="Shape Builder selected pattern actions"
      style={{position:'absolute',bottom:48,left:12,zIndex:14,display:'flex',gap:5,
        background:'#203946',border:'1px solid #6e9ba8',borderRadius:6,padding:5}}>
      {['union','difference','intersection'].map(operation=><button key={operation} type="button"
        aria-label={operation==='union'?'Shape Builder add and combine (+)':operation==='difference'?'Shape Builder subtract and remove (−)':'Shape Builder intersect'}
        disabled={busy||patternMultiSelection.length!==2}
        onClick={()=>void applySelectedShapeBuilder(operation)}
        style={{background:'#395769',color:'#f4fbff',border:'1px solid #7491a1',borderRadius:4,padding:'5px 9px',fontSize:11,cursor:'pointer'}}>
        {operation==='union'?'+ Combine':operation==='difference'?'− Subtract':'∩ Intersect'}
      </button>)}
    </div>}
    {['vector-pencil','vector-pen'].includes(tool2d)&&pencilMirrorMode&&<div data-pencil-mirror-active="true" role="status"
      style={{position:'absolute',top:58,left:12,zIndex:8,color:'#f8f6d8',background:'#214258',border:'1px solid #6d9fa8',borderRadius:5,padding:'5px 9px',fontSize:11,pointerEvents:'none'}}>
      Mirror Half Pattern · first and last pencil points define the fold line
    </div>}
    {['vector-pencil','vector-pen'].includes(tool2d)&&pencilMirrorStatus&&<div role="status" data-pencil-mirror-status="true"
      style={{position:'absolute',left:12,bottom:12,zIndex:8,background:'#283c49',color:'#fff',padding:'6px 9px',borderRadius:4,fontSize:12}}>
      {pencilMirrorStatus}
    </div>}
    {['vector-pencil','vector-pen'].includes(tool2d)&&pencilMirrorMenu&&<div role="menu" aria-label="Pen and Pencil drawing options"
      data-pencil-context-menu="true"
      style={{position:'absolute',zIndex:30,left:pencilMirrorMenu.x,top:pencilMirrorMenu.y,minWidth:200,
        background:'#243846',border:'1px solid #849ba5',borderRadius:6,boxShadow:'0 7px 22px #05192799',padding:4}}
      onContextMenu={event=>event.preventDefault()} onPointerDown={event=>event.stopPropagation()}>
      <button type="button" role="menuitemcheckbox" aria-checked={pencilMirrorMode} aria-label="Mirror"
        data-pencil-mirror-action="true" onClick={()=>{
          setPencilMirrorMode(value=>!value);setPencilMirrorMenu(null);setPencilMirrorStatus('')
        }} style={{display:'flex',alignItems:'center',gap:9,width:'100%',border:0,borderRadius:4,textAlign:'left',padding:'8px 10px',background:'#365668',color:'#f6fafc',cursor:'pointer'}}>
        <span aria-hidden="true" style={{display:'inline-grid',placeItems:'center',width:16,height:16,border:'1px solid #acc5d0',borderRadius:3,background:pencilMirrorMode?'#e2f3fc':'transparent',color:'#163448',fontWeight:800}}>
          {pencilMirrorMode?'✓':''}
        </span>
        <span>Mirror</span>
      </button>
      <small style={{display:'block',color:'#b9cbd4',padding:'6px 9px',maxWidth:230}}>
        Draw from one centerline point around half the pattern to the other centerline point. The opposite half mirrors live.
      </small>
    </div>}
    {false&&mode==='edit'&&tool2d==='point'&&!precisionDrafting&&!editPatternHintDismissed&&<div className="cc-native-free-curve-guide cc-pattern-compact-hint" data-edit-pattern-guide="true">
      <strong>Edit Pattern</strong>
      <span>Click a point: incoming + outgoing handles appear automatically. Drag either endpoint to curve the pattern. Option-drag breaks tangents; Shift snaps angles.</span>
      <button type="button" aria-label="Dismiss Edit Pattern hint" onClick={()=>setEditPatternHintDismissed(true)}>×</button>
    </div>}
    {false&&mode==='edit'&&tool2d==='point'&&(multiEdit.points.length>0||selection?.edge||precisionPanelOpen)&&
      <section data-clo-precision-edit="true" aria-label="CLO Edit Pattern precise geometry"
        style={{position:'absolute',left:14,bottom:15,zIndex:16,width:260,maxWidth:'calc(100% - 28px)',
          padding:11,borderRadius:7,border:'1px solid #678292',background:'#263745ef',
          color:'#f1f5f7',boxShadow:'0 5px 20px #0006',fontSize:11}}
        onPointerDown={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:7}}>
          <strong>Edit Pattern · Precision</strong>
          <button type="button" aria-label="Close precision editor" onClick={()=>{
            setMultiEdit({panel:null,points:[]});setPrecisionPanelOpen(false);setPrecisionEditStatus('')
          }} style={{color:'#eef',background:'none',border:0,cursor:'pointer'}}>×</button>
        </div>
        <small style={{display:'block',color:'#b4cbd6',marginBottom:8}}>
          Shift-click points/lines or Shift-drag a box to select a group; arrow keys nudge 0.25 in (Alt for 0.025 in)
        </small>
        {multiEdit.points.length>0&&<form data-clo-group-move="true" onSubmit={event=>{
          event.preventDefault();commitCloMove()
        }} style={{display:'grid',gap:6,marginBottom:9}}>
          <strong>{multiEdit.points.length} selected native point(s) · {multiEdit.panel}</strong>
          <div style={{display:'flex',gap:5}}>
            <label style={{flex:1}}>Move X ({penPrecision.unit})
              <input aria-label="Move selected X" value={multiMove.x} inputMode="decimal"
                onChange={event=>setMultiMove(v=>({...v,x:event.target.value}))}
                style={{boxSizing:'border-box',width:'100%'}}/></label>
            <label style={{flex:1}}>Move Y ({penPrecision.unit})
              <input aria-label="Move selected Y" value={multiMove.y} inputMode="decimal"
                onChange={event=>setMultiMove(v=>({...v,y:event.target.value}))}
                style={{boxSizing:'border-box',width:'100%'}}/></label>
          </div>
          <button type="submit" data-clo-apply-multi-point="true" disabled={busy}
            style={{background:'#d5e8f2',color:'#153443',border:0,borderRadius:4,padding:5,cursor:'pointer'}}>
            Move selected points (native)
          </button>
        </form>}
        {selection?.panel&&selection?.edge&&(()=>{
          const native=s?.template?.panels?.find(p=>p.id===selection.panel)
          const current=native&&curveDraftDimensions(native.polygon).find(row=>row.edge===selection.edge)
          return <form data-clo-change-length="true" onSubmit={e=>{e.preventDefault();void commitCloChangeLength()}}
            style={{display:'grid',gap:6}}>
            <strong>Change Length · {selection.edge}</strong>
            <small>Current: {current?formatPenDistancePrecise(current.length,penPrecision.unit):'—'}</small>
            <label>Exact length ({penPrecision.unit})
              <input aria-label="Change Length target" value={editLineLength}
                placeholder={current?(current.length/(PEN_LENGTH_UNITS[penPrecision.unit]||.001)).toFixed(2):'0'}
                onChange={e=>setEditLineLength(e.target.value)} inputMode="decimal"
                style={{boxSizing:'border-box',width:'100%'}}/></label>
            <label>Location
              <select aria-label="Change Length location" value={editLengthLocation}
                onChange={e=>setEditLengthLocation(e.target.value)} style={{width:'100%'}}>
                <option value="start">Start</option><option value="end">End</option><option value="both">Both</option>
              </select></label>
            <button type="submit" data-clo-apply-change-length="true" disabled={busy}
              style={{background:'#d5e8f2',color:'#153443',border:0,borderRadius:4,padding:5,cursor:'pointer'}}>
              Apply Change Length (native)
            </button>
          </form>
        })()}
        {precisionEditStatus&&<small role="status" data-clo-precision-status="true"
          style={{display:'block',marginTop:7,color:'#ffe0a2'}}>{precisionEditStatus}</small>}
      </section>}
    {mode==='edit'&&(tool2d==='curve'||pendingCurveCommit)&&<div className="cc-native-free-curve-guide" data-free-curve-tool-guide="true">
      <strong>Edit Curve Point</strong>
      <span>Drag either half of the chest or belly guide to curve ONLY that point-to-point construction interval (saved locally, not sewn) · Drag coral side dots or orange knots to reshape the actual cutline · Apply sewn cutlines to update 3D · Live edge lengths appear during curve edits</span>
      <label><input type="checkbox" checked={mirrorFreeCurve}
        onChange={event=>{setMirrorFreeCurve(event.target.checked);setPendingCurveCommit(null);setHandlePreview(null);setFreeCurveStatus('')}}/>
        Link mirrored points on symmetric edges</label>
      <label><input type="checkbox" checked={showRedDartGuides}
        onChange={event=>setShowRedDartGuides(event.target.checked)}/>
        Red short point markers (construction only)</label>
      {selection?.panel&&selection?.edge&&(()=>{
        const staged=pendingCurveCommit?.panelId===selection.panel&&
          pendingCurveCommit.edge===selection.edge?pendingCurveCommit:null
        const strict=(s?.template?.seams||[]).filter(seam=>!seam.allow_ease&&(
          staged?staged.strictSeams.includes(seam.id):
          [seam.a,seam.b].some(boundary=>boundary?.panel===selection.panel&&boundary?.edge===selection.edge)))
        if(!strict.length&&!staged)return null
        return <div data-curve-strict-seams={strict.map(seam=>seam.id).join(' ')}>
          {strict.length>0&&<small>Attached sewn edge: {strict.map(seam=>seam.id).join(', ')}. A reshaped curve can change the seam length, which Rust normally rejects.</small>}
          {onEnableCurveSeamEase&&<button type="button" disabled={busy}
            data-enable-curve-seam-ease={selection.panel+':'+selection.edge}
            onClick={async()=>{
              const ok=await onEnableCurveSeamEase({panelId:selection.panel,edge:selection.edge,
                mirror:staged?.mirror??mirrorFreeCurve,
                polygon:staged?.polygon,expectedRevision:staged?.revision,
                affectedEdges:staged?.affectedEdges})
              if(ok){setPendingCurveCommit(null);setHandlePreview(null)}
              setFreeCurveStatus(ok
                ?staged?'Native Rust committed this curve. Save/reopen will preserve the reshaped cutline. Undo is available.'
                  :'Seam easing explicitly enabled for this sewn boundary. You can now drag its curves.'
                :'The sewing permission or curve commit was not accepted. The shape was not saved; check the error and retry or Undo any sewing changes.')
            }}>{pendingCurveCommit?.panelId===selection.panel&&pendingCurveCommit.edge===selection.edge
              ?strict.length?'Apply this yellow curve and allow seam easing':'Apply this yellow curve'
              :'Allow different sewn-edge lengths so this curve can be edited'}</button>}
        </div>
      })()}
      {pendingCurveCommit&&<button type="button" disabled={busy} data-discard-curve-proposal="true"
        onClick={()=>{cancelPatternGesture();setPendingCurveCommit(null);setHandlePreview(null);setFreeCurveStatus('Curve proposal discarded; native garment unchanged.')}}>Discard curve proposal</button>}
      {freeCurveStatus&&<small role="status">{freeCurveStatus}</small>}
    </div>}
    {selectedSewingMeasurement?.valid&&<div className="cc-native-sew-pair-readout"
      data-native-selected-sewing-length={selectedSewingMeasurement.seamId} role="status">
      <strong>{selectedSewingMeasurement.seamId}</strong>
      <span>{displayMeasurement(selectedSewingMeasurement.firstCm/100)} / {displayMeasurement(selectedSewingMeasurement.secondCm/100)}</span>
      <span>{selectedSewingMeasurement.signedDifferenceCm>=0?'+':''}{displayMeasurement(selectedSewingMeasurement.signedDifferenceCm/100)} · {selectedSewingMeasurement.differencePercent.toFixed(1)}%</span>
    </div>}
    {measuring&&<section className="cc-native-pom-inspector" aria-label="Native Points of Measure" data-native-pom-editor="true">
      <strong>POINTS OF MEASURE <small>{pomRows.length}</small></strong>
      <p>Click two cutline positions to save a physical measurement. Select one below to edit or delete it.</p>
      <div className="cc-native-pom-rows" role="group" aria-label="Saved native Points of Measure">
        {pomRows.length===0?<span>No saved POMs yet</span>:pomRows.map(({panelId,measurement})=>
          <button type="button" key={panelId+':'+measurement.id}
            data-native-pom-select={measurement.id}
            aria-pressed={selectedPom?.panel===panelId&&selectedPom?.id===measurement.id}
            onClick={()=>{setSelectedPom({panel:panelId,id:measurement.id});setPomLabelDraft(measurement.label)}}>
            {measurement.label} <small>{panelId}</small>
          </button>)}
      </div>
      {selectedPomRow&&<div className="cc-native-pom-edit">
        <label>Measurement name
          <input aria-label="Edit native POM label" type="text" maxLength={120}
            value={pomLabelDraft} onChange={e=>setPomLabelDraft(e.target.value)} disabled={busy}/>
        </label>
        <div>
          <button type="button" data-native-pom-save-label="true" disabled={busy||!pomLabelDraft.trim()}
            onClick={()=>void edit({kind:'SetMeasurement',panel:selectedPomRow.panelId,
              measurement:{...selectedPomRow.measurement,label:pomLabelDraft.trim()}})}>Save name</button>
          <button type="button" data-native-pom-delete="true" disabled={busy}
            onClick={()=>void (async()=>{
              const removed=await edit({kind:'RemoveMeasurement',panel:selectedPomRow.panelId,
                id:selectedPomRow.measurement.id})
              if(removed){setSelectedPom(null);setPomLabelDraft('');setTape([])}
            })()}>Delete POM</button>
        </div>
      </div>}
    </section>}
    {/* Selection metadata lives in the 2D Pattern Display tool menu, never
        in a panel-covering popup over the working pattern. */}
    <div className="cc-v2-orientation cc-v2-board-orientation" role="group" aria-label="2D board view controls">
      {onTogglePatternStudio&&<button type="button" className="cc-pattern-studio-glass-arrow" aria-label={patternStudioActive?'Return to main studio':'Open Pattern Studio'} title={patternStudioActive?'Return to main studio':'Open Pattern Studio'} aria-pressed={patternStudioActive} onClick={onTogglePatternStudio}>{patternStudioActive?'›':'‹'}</button>}
      <strong title="Metric 2D drawing orientation">2D</strong>
      <button type="button" aria-label="Front" title="Front drafting view" aria-pressed={viewPreset==='FRONT'} className={viewPreset==='FRONT'?'active':''} onClick={()=>setViewPreset('FRONT')}>FR</button>
      <button type="button" aria-label="Grid" title="Neutral grid drafting view" aria-pressed={viewPreset==='GRID'} className={viewPreset==='GRID'?'active':''} onClick={()=>setViewPreset('GRID')}>GR</button>
      <span className="cc-board-orientation-divider" aria-hidden="true"/>
      <button type="button" aria-label="Frame all" title="Frame all patterns and full avatar" onClick={() => focus()}>F</button>
      <button type="button" aria-label="Focus selected" title="Focus selected pattern" onClick={() => focus(true)}>S</button>
      <button type="button" aria-label="Precision drafting" title="Enlarge pattern drawing and reduce drafting clutter" aria-pressed={precisionDrafting} className={precisionDrafting?'active':''} onClick={()=>{setPrecisionDrafting(value=>!value);setAutoFocusDrafting(!precisionDrafting);setEditPatternHintDismissed(true)}}>CAD</button>
      <button type="button" aria-label="Show 2D avatar silhouette" title={avatarAvailable?'Show or hide the avatar silhouette in the 2D drafting view':'Load a 3D avatar to show its 2D silhouette'} aria-pressed={avatarVisible} disabled={!avatarAvailable || (!onToggleSilhouette&&!onToggleAvatar)} className={avatarVisible?'active':''} onClick={()=>{if(avatarVisible)onToggleSilhouette?.(false);else {onToggleAvatar?.(true);onToggleSilhouette?.(true);setViewPreset('FRONT');setAutoFocusDrafting(false);focus(false,true)}}}>BODY</button>
      <button type="button" aria-label="Show contextual pattern nodes" title="Show compact geometry knots on non-selected patterns while editing" aria-pressed={contextNodesInEdit} className={contextNodesInEdit?'active':''} onClick={()=>setContextNodesInEdit(value=>!value)}>PTS</button>
      <button type="button" aria-label="Center axis" title="Center on the 2D front axis" onClick={() => setView(v=>[-v[2]/2,avatarAnchorY-v[3]/2,v[2],v[3]])}>C</button>
    </div>
    {showGraphicMeasurementToggle&&graphics.some(graphic=>graphic.visible!==false)&&<div className="cc-v2-graphic-dimension-toggle"
      style={{position:'absolute',zIndex:12,top:85,right:10}}>
      <button type="button" aria-label="Show graphic measurement box" aria-pressed={showGraphicMeasurements}
        title="Toggle selected graphic dimensions in millimetres"
        onClick={()=>onToggleGraphicMeasurements(!showGraphicMeasurements)}
        style={{fontSize:10,border:'1px solid #7c8c95',borderRadius:3,padding:'5px 8px',
          color:showGraphicMeasurements?'#e0f5ff':'#dadfe2',
          background:showGraphicMeasurements?'#2c7397':'#42484d',cursor:'pointer'}}>
        Graphic measurements {showGraphicMeasurements?'ON':'OFF'}
      </button>
    </div>}
    {['vector-pen','direct-select','anchor-point','split','remove-anchor'].includes(tool2d)&&<div data-context-anchor-tools="liquid-glass"
      className="cc-vector-anchor-actions cc-anchor-liquid-glass" role="toolbar"
      aria-label="2D VectorCraft anchor tools"
      style={anchorToolbarPosition?{left:anchorToolbarPosition.x,top:anchorToolbarPosition.y,right:'auto'}:undefined}>
      <button type="button" className="cc-anchor-toolbar-grip" aria-label="Move anchor toolbar"
        title="Drag to reposition this toolbar" onPointerDown={dragAnchorToolbar}
        onPointerMove={moveAnchorToolbar}
        onPointerUp={event=>{anchorToolbarDrag.current=null;try{event.currentTarget.releasePointerCapture(event.pointerId)}catch{}}}
        onPointerCancel={()=>{anchorToolbarDrag.current=null}}>⠿</button>
      <button type="button" aria-label="Add anchor point" title="Select Add Anchor · click exactly where on the line · +"
        aria-pressed={tool2d==='split'} disabled={busy}
        onClick={()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'split'}}))}>+<span> Add</span></button>
      <button type="button" aria-label="Remove anchor point" title="Select Delete Anchor · click the point to remove · −"
        aria-pressed={tool2d==='remove-anchor'} disabled={busy}
        onClick={()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'remove-anchor'}}))}>−<span> Remove</span></button>
      {editingDraft&&<button type="button" aria-label="Convert anchor to curve"
        title="Convert to smooth curve · ⌘C" aria-pressed={vectorCurveMode}
        onClick={convertDraftCurve}>⌁<span> Curve</span></button>}
      {editingDraft&&<button type="button" aria-label="Finish Pen path" title="Commit pattern to native Rust · Enter"
        disabled={busy||draft.length<3} onClick={finishDrawing}>✓<span> Finish</span></button>}
    </div>}
    <svg ref={svg} viewBox={view.join(' ')} preserveAspectRatio="xMidYMid meet" tabIndex={0}
      style={{background:canvasColor,cursor:nativeCursor||undefined}}
      aria-label="Metric 2D pattern board with linked sewing and measurements" data-native-tool={tool2d}
      onDragOver={event=>{
        if(referenceImageDragAvailable(event.dataTransfer)){
          event.preventDefault()
          event.dataTransfer.dropEffect='copy'
        }
      }}
      onDrop={event=>{
        const source=droppedReferenceImage(event.dataTransfer)
        if(!source)return
        event.preventDefault()
        event.stopPropagation()
        const matrix=svg.current?.getScreenCTM()?.inverse()
        if(!matrix)return
        const cursor=svg.current.createSVGPoint()
        cursor.x=event.clientX
        cursor.y=event.clientY
        const at=cursor.matrixTransform(matrix)
        void reference.importImage(source,{viewBounds:view,unitsPerCm:.01,dropPoint:{x:at.x,y:at.y}})
      }}
      data-shift-anchor-active={String(temporaryShiftPen.current)} data-vector-draft-count={draft.length}
      data-option-anchor-active={String(temporaryAnchorBorrow.current?.key==='Alt')}
      onPointerDownCapture={event=>{
        event.currentTarget.focus({preventScroll:true})
        // Let the selected reference photo own its pointer gesture. Starting
        // the empty-paper marquee here prevents the photo's move handler
        // from ever receiving pointerdown, even on a direct SVG photo hit.
        if(mode==='edit'&&tool2d==='select'&&
          event.target.closest?.('[data-2d-reference-hit],[data-reference-resize-handle]'))return
        // Resolve a selected native panel before any overlay or root-canvas
        // pointer handler can turn a group drag into viewport panning.
        // Initiate once, on capture; paper's bubble handler observes the
        // owned gesture and cannot replace it with a single-panel drag.
        if(transform2d&&!busy&&event.button===0&&!event.shiftKey&&!drag.current&&
          patternMultiSelection.length>1){
          const xy=point(event),id=xy&&panelAt(xy)
          const reserved=event.target.closest?.('[data-control-point],[data-2d-rotate],'+
            '[data-2d-graphic-item],[data-2d-graphic-hit],[data-graphic-transform-box],'+
            '[data-graphic-resize-handle]')
          if(id&&patternMultiSelection.includes(id)&&!reserved){
            const panel=panels.find(row=>row.panel.id===id)?.panel
            if(panel){start(event,panel);return}
          }
        }
        // CLO Edit Pattern Shift-drag marquee: enclose physical vertices,
        // never fabricate extra draft geometry or move the garment itself.
        // A direct click on a vertex/edge is reserved for Shift-add below.
        if(mode==='edit'&&tool2d==='point'&&event.shiftKey&&event.button===0&&
          !event.target.closest?.('[data-control-point],[data-2d-edge-hit]')){
          const xy=point(event)
          if(xy){
            event.preventDefault();event.stopPropagation()
            boxSelectDrag.current={pointerId:event.pointerId,start:xy,end:xy}
            setBoxSelectPreview({start:xy,end:xy})
            event.currentTarget.setPointerCapture(event.pointerId)
            return
          }
        }
        if(mode==='edit'&&['select','shape-builder'].includes(tool2d)&&event.button===0){
          const xy=point(event)
          if(xy&&!panelAt(xy)&&!event.target.closest?.('[data-2d-graphic-hit],[data-2d-marquee-move],[data-control-point]')){
            event.preventDefault();event.stopPropagation()
            patternMarqueeDrag.current={pointerId:event.pointerId,start:xy,end:xy,additive:event.shiftKey}
            setPatternMarquee({start:xy,end:xy})
            event.currentTarget.setPointerCapture(event.pointerId)
            return
          }
        }
        if(tool2d==='shape-builder'&&mode==='edit'&&event.button===0){
          event.stopPropagation();event.preventDefault()
          shapeBuilderIgnoreClick.current=false
          const location=point(event),id=location&&panelAt(location)
          shapeBuilderDrag.current={pointerId:event.pointerId,first:id,hovered:id,
            moved:false,operation:event.altKey?'difference':event.shiftKey?'intersection':'union'}
          if(id)setShapeBuilderHovered(id)
          try{event.currentTarget.setPointerCapture(event.pointerId)}catch{}
          return
        }
        if(tool2d==='anchor-point'&&editingDraft&&event.button===0&&
          !event.target.closest?.('[data-vector-pen-anchor-hit],[data-vector-pen-handle]')){
          const here=point(event)
          const hit=here&&penSegmentAt(draft,vectorTangents,here,Math.max(10*screenUnit,.003))
          if(hit){
            event.preventDefault();event.stopPropagation()
            vectorDrag.current={pointerId:event.pointerId,reshapeDraft:true,
              index:hit.index,t:hit.t,pointerStart:here,
              startPoints:draft.map(p=>[...p]),startTangents:vectorTangents.map(p=>[...p])}
            setVectorSelectedAnchor(null)
            svg.current?.setPointerCapture(event.pointerId)
            return
          }
        }
        // Hit test the authored draft geometrically before an unrelated
        // material-paper path consumes pointer input. A draft may overlap a
        // native garment; VectorCraft Add Anchor must still hit its own line.
        if(tool2d==='split'&&editingDraft&&splitDraftAt(event)){
          event.preventDefault();event.stopPropagation();return
        }
        if(event.target.closest?.('[data-vector-pen-anchor-hit],[data-vector-pen-handle],[data-vector-draft-split-hit]'))return
        markCanvas(event)
        beginGuideHalfCurve(event)
      }}
      onPointerMoveCapture={event=>{
        if(patternMarqueeDrag.current?.pointerId===event.pointerId){
          const xy=point(event)
          if(xy){patternMarqueeDrag.current.end=xy;setPatternMarquee({start:patternMarqueeDrag.current.start,end:xy})}
          return
        }
        if(tool2d==='shape-builder'&&mode==='edit'){
          const position=point(event),id=position&&panelAt(position)
          setShapeBuilderHovered(previous=>previous===id?previous:id)
          const gesture=shapeBuilderDrag.current
          if(gesture&&gesture.pointerId===event.pointerId&&id&&id!==gesture.first){
            gesture.hovered=id;gesture.moved=true
          }
          return
        }
        // The Add Anchor cursor announces exactly which real Bézier segment
        // will receive the inserted point. Never highlight empty canvas.
        if(tool2d==='split'){
          const here=point(event)
          let highlight=null
          if(here&&editingDraft){
            const hit=penSegmentAt(draft,vectorTangents,here,Math.max(10*screenUnit,.003))
            if(hit&&!draft.some(anchor=>Math.hypot(anchor[0]-hit.point[0],anchor[1]-hit.point[1])<7*screenUnit))
              highlight={kind:'draft',p:hit.point}
          }else if(here){
            const edgeHit=event.target.closest?.('[data-2d-edge-hit]')
            const identity=edgeHit?.getAttribute('data-2d-edge-hit')
            const entry=panels.find(item=>identity?.startsWith(item.panel.id+':'))
            const edge=entry&&identity.slice(entry.panel.id.length+1)
            if(entry&&entry.panel.polygon?.edges?.includes(edge)){
              const angle=(entry.panel.layout_rotation_degrees||0)*Math.PI/180
              const dx=here[0]-entry.range.layout[0],dy=here[1]-entry.range.layout[1]
              const local=[dx*Math.cos(angle)+dy*Math.sin(angle),-dx*Math.sin(angle)+dy*Math.cos(angle)]
              const closest=closestFreeCurveParameter(entry.panel.polygon,edge,local)
              if(closest&&closest.distance<=Math.max(.003,10*screenUnit)&&closest.t>.005&&closest.t<.995){
                const snapped=evaluateFreeCurve(entry.panel.polygon,edge,closest.t)
                if(snapped)highlight={kind:'native',p:transform(entry.panel,entry.range,snapped),panel:entry.panel.id,edge}
              }
            }
          }
          setHoveredAddAnchor(highlight)
        }else if(hoveredAddAnchor)setHoveredAddAnchor(null)
        const guide=findGuideUnderPointer(event)
        setHoveredGuideId(guide?.id||null)
        setHoveredGuideGeometry(guide)
        const graphicHit=event.target?.closest?.('[data-2d-graphic-hit]')
        setHoveredGraphicId(graphicHit?.getAttribute('data-2d-graphic-hit')||null)
      }}
      onPointerLeave={()=>{setHoveredGuideId(null);setHoveredGuideGeometry(null);setHoveredGraphicId(null);setShapeBuilderHovered(null);setHoveredAddAnchor(null);setHoveredNativeAnchor(null)}}
      onClickCapture={e=>{
        if(patternMarqueeIgnoreClick.current){patternMarqueeIgnoreClick.current=false;e.stopPropagation();e.preventDefault();return}
        // SVG pointer capture and overlays can retarget a blank-board click.
        // Resolve the physical paper under the click itself, instead of relying
        // on event.target===svg or a marquee's pointerup reaching this root.
        // This runs only in Transform Pattern, never for actual pattern/graphic
        // hits, Shift-add, drawing tools or canvas drags.
        if(transform2d&&!busy&&!e.shiftKey){
          const p=point(e)
          const graphicHit=e.target.closest?.('[data-2d-graphic-hit],[data-2d-graphic-item],[data-graphic-transform-box],[data-graphic-resize-handle],[data-2d-reference-image]')
          if(p&&!panelAt(p)&&!graphicHit){
            clearTransformPatternSelection()
            e.stopPropagation()
            return
          }
        }
        if(mode==='edit'&&tool2d==='select'&&e.shiftKey){
          const p=point(e),id=p&&panelAt(p)
          if(id){e.stopPropagation();e.preventDefault();return}
        }
        if(tool2d==='shape-builder'&&mode==='edit'){
          e.stopPropagation();e.preventDefault()
          if(shapeBuilderIgnoreClick.current){shapeBuilderIgnoreClick.current=false;return}
          const p=point(e),id=p&&panelAt(p)
          if(id)shapeBuilderClick(id,e)
          return
        }
        if(selectGuideUnderPointer(e))return
        if(busy||tool2d!=='pleat'||mode!=='edit')return
        const p=point(e),panelId=p&&panelAt(p)
        e.stopPropagation();e.preventDefault()
        if(panelId){pick({panel:panelId});window.dispatchEvent(new CustomEvent('exo-clothcraft-pleat-target',{detail:{panelId}}))}
      }}
      onDoubleClickCapture={e=>{
        if(mode!=='edit')return
        if(e.target?.closest?.('[data-parked-pen-anchor]')){
          const anchor=e.target.closest('[data-parked-pen-anchor]')
          const pathId=Number(anchor.getAttribute('data-parked-pen-path'))
          const index=Number(anchor.getAttribute('data-parked-pen-anchor'))
          if(tool2d==='direct-select'&&resumeParkedPath(pathId,index)){
            e.preventDefault();e.stopPropagation()
            showAnchorEditor(e,'draft',null,index===0?0:parkedPenPaths.find(p=>p.id===pathId)?.points.length-1)
          }
          return
        }
        // Anchor Point converts on pointer click/drag; a dblclick must not
        // submit a second, contradictory conversion for the same corner.
        if(tool2d==='anchor-point')return
        // A draft Pen vertex can overlap an existing native pattern. The
        // native-corner fallback runs on the root SVG, so it must give the
        // unfinished Pen contour first refusal. Pointer capture can also
        // retarget the double-click to the SVG instead of the draft circle.
        if(tool2d==='direct-select'&&editingDraft){
          const here=point(e)
          let nearest=-1,distance=Infinity
          if(here)draft.forEach((candidate,index)=>{
            const d=Math.hypot(candidate[0]-here[0],candidate[1]-here[1])
            if(d<distance){distance=d;nearest=index}
          })
          if(nearest>=0&&distance<=Math.max(.004,11*screenUnit)){
            e.preventDefault();e.stopPropagation()
            setVectorSelectedAnchor(nearest)
            showAnchorEditor(e,'draft',null,nearest)
            return
          }
        }
        // Material vertex dragging captures the pointer on the ROOT SVG, so
        // browsers can deliver dblclick to the SVG rather than its original
        // circle. Resolve the nearest real native anchor by metric position.
        // This works identically with the Move, Point and Curve tools.
        if(['select','point','direct-select','curve'].includes(tool2d)){
          const here=point(e)
          const targetPanel=e.target?.closest?.('[data-panel-id][data-pattern-anchor-index]')?.getAttribute('data-panel-id')
          const hit=here&&nativePatternAnchorAt(panels,here,Math.max(.01,13*screenUnit),
            {preferredPanelId:targetPanel||selection?.panel})
          if(hit&&!busy){
            showNativeAnchorEditor(e,hit.panel,hit.index)
            return
          }
        }
        if(tool2d!=='select')return
        const guide=findGuideUnderPointer(e)
        if(guide){e.stopPropagation();void createNativeLineFromGuide(guide);setSelectedGuide(null)}
      }}
      onClick={e => {if (!busy && (isDrawing || measuring)) e.stopPropagation()}}
      onPointerMove={e=>{
        if(moveCornerDrag(e))return
        if(groupMoveDrag.current?.pointerId===e.pointerId){
          const gesture=groupMoveDrag.current
          const delta=localCloGroupDelta(e,gesture)
          if(delta&&Math.hypot(...delta)>=1e-7){
            const result=moveCloNativePolygonPoints20261025(s.template,{
              panelId:gesture.panelId,indices:gesture.indices,delta
            })
            if(result.ok){
              const proposed=result.template.panels.find(panel=>panel.id===gesture.panelId)
              if(proposed)setHandlePreview({panelId:gesture.panelId,
                anchorIndex:gesture.indices[0],polygon:proposed.polygon,groupMove:true})
            }
          }
          return
        }
        if(boxSelectDrag.current?.pointerId===e.pointerId){
          const xy=point(e)
          if(xy){
            boxSelectDrag.current.end=xy
            setBoxSelectPreview({start:boxSelectDrag.current.start,end:xy})
          }
          return
        }
        if(moveGuideHalfCurve(e))return
        if(moveFoamDrag(e))return
        if(vectorDrag.current?.pointerId===e.pointerId){
          const drag=vectorDrag.current,p=point(e)
          if(p){
            // First Pen anchor drags also update the provisional next edge's
            // dimension, before a second anchor has been placed.
            if(tool2d==='vector-pen')setVectorCursor(p)
            if(drag.reshapeDraft){
              const delta=p.map((v,i)=>v-drag.pointerStart[i])
              const reshaped=reshapePenDraftSegment(drag.startPoints,drag.startTangents,
                drag.index,drag.t,delta,{perpendicular:e.shiftKey})
              if(reshaped)setVectorTangents(reshaped.tangents)
            }else if(drag.pencil)setPencilSamples(old=>old.length&&Math.hypot(p[0]-old.at(-1)[0],p[1]-old.at(-1)[1])<.001?old:[...old,p])
            else if(drag.moveDraft){
              // VectorCraft direct selection: move just the chosen point in
              // metre-space; neighboring points and tangents are unchanged.
              const delta=[p[0]-drag.pointerStart[0],p[1]-drag.pointerStart[1]]
              if(e.shiftKey){
                if(Math.abs(delta[0])>=Math.abs(delta[1]))delta[1]=0
                else delta[0]=0
              }
              const position=drag.start.map((value,index)=>value+delta[index])
              setDraft(old=>old.map((value,index)=>index===drag.index?position:value))
            }else if(tool2d==='vector-pen'||drag.convert||drag.handleSide!==undefined){
                // Option is the temporary Convert Anchor shortcut. While
                // held, its Alt flag must NOT zero out the Bézier tangent.
                const tangent=penTangent(drag.start,p,{
                  shift:e.shiftKey,alt:e.altKey&&temporaryAnchorBorrow.current?.key!=='Alt',
                })
              if(drag.convert&&Math.hypot(p[0]-drag.start[0],p[1]-drag.start[1])>2*screenUnit)
                drag.moved=true
              if(drag.convert&&!drag.moved)return
              setVectorTangents(old=>old.map((v,i)=>i===drag.index&&drag.handleSide===-1?
                tangent.map(value=>-value):i===drag.index?tangent:v))
            }
          }
          return
        }
        if(tool2d==='vector-pen'&&draft.length&&!penPaused)setVectorCursor(point(e))
        if(drag.current?.anchor?.startsWith?.('ft:')){
          move(e)
          return
        }
        if(moveGraphicDrag(e))return
        if(tapeDrag.current){const p=point(e);if(p)setTape(old=>old.map((v,i)=>i===tapeDrag.current.index?p:v));return}
        move(e)
      }} onPointerUp={e=>{
        if(endCornerDrag(e))return
        if(patternMarqueeDrag.current?.pointerId===e.pointerId){
          const gesture=patternMarqueeDrag.current
          patternMarqueeDrag.current=null
          setPatternMarquee(null)
          try{svg.current?.releasePointerCapture(e.pointerId)}catch{}
          completePatternMarquee(gesture,e)
          return
        }
        if(tool2d==='shape-builder'&&mode==='edit'){
          const gesture=shapeBuilderDrag.current
          if(gesture?.pointerId===e.pointerId){
            shapeBuilderDrag.current=null
            try{svg.current?.releasePointerCapture(e.pointerId)}catch{}
            if(gesture.moved&&gesture.first&&gesture.hovered!==gesture.first){
              shapeBuilderIgnoreClick.current=true
              if(shapeBuilderLineValid)void commitShapeBuilderLine(gesture.first)
              else void applyShapeBuilder(gesture.first,gesture.hovered,gesture.operation)
            }
          }
          return
        }
        if(groupMoveDrag.current?.pointerId===e.pointerId){
          const gesture=groupMoveDrag.current
          groupMoveDrag.current=null
          const delta=localCloGroupDelta(e,gesture)
          try{svg.current?.releasePointerCapture(e.pointerId)}catch{}
          setHandlePreview(null)
          if(delta&&Math.hypot(...delta)>=1e-7){
            const result=moveCloNativePolygonPoints20261025(s.template,{
              panelId:gesture.panelId,indices:gesture.indices,delta
            })
            if(!result.ok){setPrecisionEditStatus(result.reason);return}
            const panel=s.template.panels.find(item=>item.id===gesture.panelId)
            const proposal=result.template.panels.find(item=>item.id===gesture.panelId)
            if(panel&&proposal)void applyOrStagePatternCurve(panel,proposal.polygon,
              panel.polygon.edges[gesture.indices[0]])
          }
          return
        }
        if(boxSelectDrag.current?.pointerId===e.pointerId){
          const drag=boxSelectDrag.current
          boxSelectDrag.current=null
          setBoxSelectPreview(null)
          try{svg.current?.releasePointerCapture(e.pointerId)}catch{}
          const lo=[Math.min(drag.start[0],drag.end[0]),Math.min(drag.start[1],drag.end[1])]
          const hi=[Math.max(drag.start[0],drag.end[0]),Math.max(drag.start[1],drag.end[1])]
          if(Math.hypot(hi[0]-lo[0],hi[1]-lo[1])<4*screenUnit)return
          const candidates=panels.map(({panel,range})=>({
            panel:panel.id,vertices:(panel.polygon?.points||[]).flatMap((uv,index)=>{
              const xy=transform(panel,range,uv)
              return xy[0]>=lo[0]&&xy[0]<=hi[0]&&xy[1]>=lo[1]&&xy[1]<=hi[1]?[index]:[]
            })
          })).filter(row=>row.vertices.length)
          // Multi-edit is deliberately single-panel; silently applying one
          // displacement to different Rust templates would be dangerous.
          const selected=candidates.find(row=>row.panel===selection?.panel)||candidates[0]
          if(selected)setMultiEdit(value=>({panel:selected.panel,
            points:[...new Set([...(e.shiftKey&&value.panel===selected.panel?value.points:[]),...selected.vertices])].sort((a,b)=>a-b)}))
          return
        }
        if(finishGuideHalfCurve(e))return
        if(endFoamDrag(e))return
        if(vectorDrag.current?.pointerId===e.pointerId){
          const drag=vectorDrag.current
          vectorDrag.current=null
          if(drag.convert&&!drag.moved&&drag.wasCurved){
            // Clicking an existing curved draft anchor restores a corner;
            // its coordinates and the other Pen vertices stay untouched.
            setVectorTangents(old=>old.map((v,i)=>i===drag.index?[0,0]:v))
          }
          if(drag.pencil){
            // Pencil fitting is applied on release; the source sample stream
            // stays temporary and does not pollute the garment's native data.
            const p=point(e),raw=p?[...pencilSamples,p]:pencilSamples
            const measured=sampledPenLineMetrics(raw)
            setCompletedPencilMeasure(measured?{...measured,endpoint:raw.at(-1)}:null)
            const toleranceM=Math.max(.0005,view[2]/1000)
            const closed=raw.length>=4&&Math.hypot(raw[0][0]-raw.at(-1)[0],raw[0][1]-raw.at(-1)[1])<=Math.max(.008,view[2]/180)
            const fitted=fitPencilStroke(raw.map(([x,y])=>({x,y})),{toleranceM,closed})
            if(fitted.length>=3){
              const points=fitted.map(p=>[p.x,p.y])
              const controls=pathCubicControls(fitted)
              const tangents=points.map((p,i)=>{
                const next=controls[i]?.c1,previous=controls[i-1]?.c2
                if(next&&previous)return [(next.x-p[0]+p[0]-previous.x)/2,(next.y-p[1]+p[1]-previous.y)/2]
                if(next)return [next.x-p[0],next.y-p[1]]
                if(previous)return [p[0]-previous.x,p[1]-previous.y]
                return [0,0]
              })
              if(pencilMirrorMode){
                const reflected=mirrorHalfPencilDraft(points,tangents)
                if(reflected){
                  onPolygon(reflected.points,reflected.tangents)
                  if(measured)setCompletedPencilMeasure({...measured,length:measured.length*2,mirror:true,endpoint:raw.at(-1)})
                }
                else setPencilMirrorStatus('Cannot mirror this stroke. Draw a half outline with different start and end points on the centerline.')
              }else onPolygon(points,tangents)
            }else if(pencilMirrorMode)setPencilMirrorStatus('Draw a longer half outline to create a mirrored pattern.')
            setPencilSamples([])
          }
          try{svg.current?.releasePointerCapture(e.pointerId)}catch{}
          return
        }
        if(endGraphicDrag(e)){try{svg.current?.releasePointerCapture(e.pointerId)}catch{};return}
        if(tapeDrag.current){tapeDrag.current=null;try{svg.current?.releasePointerCapture(e.pointerId)}catch{};return}
        up(e)
      }} onPointerCancel={e => {if(cornerDrag.current?.pointerId===e.pointerId){cornerDrag.current=null;setHandlePreview(null);setAnchorEditPopup(null)}patternMarqueeDrag.current=null;setPatternMarquee(null);groupMoveDrag.current=null;shapeBuilderDrag.current=null;setShapeBuilderHovered(null);boxSelectDrag.current=null;setBoxSelectPreview(null);finishGuideHalfCurve(e,true);foamDrag.current=null;setFoamPreview(null);vectorDrag.current=null;setPencilSamples([]);graphicDrag.current=null;setGraphicPreview(null);tapeDrag.current=null;cancelPatternGesture()}}
      onLostPointerCapture={e=>{if(drag.current?.pointerId===e.pointerId)cancelPatternGesture()}}
      onContextMenu={e => {
        e.preventDefault()
        if(tool2d==='vector-pencil'||tool2d==='vector-pen'){
          e.stopPropagation()
          window.dispatchEvent(new CustomEvent('exo-clothcraft-pencil-mirror-menu-request',{
            detail:{clientX:e.clientX,clientY:e.clientY}
          }))
          return
        }
        const element = e.target.closest?.('[data-edit-seam-guide], [data-edge], [data-panel]')
        const seamId=element?.getAttribute('data-edit-seam-guide') || e.target.closest?.('[data-sewing-guide-index]')?.getAttribute('data-guide-seam-id')
        const edgeKey=element?.getAttribute('data-edge')
        const panelId=element?.getAttribute('data-panel')
        const [edgePanel, ...edgeParts] = edgeKey ? edgeKey.split(':') : []
        // An annotation, image, or sewing overlay can cover the fill path.
        // Resolve the native pattern beneath the pointer using the same
        // triangle hit test as the drawing tools before offering Delete.
        const canvasPoint=point(e)
        const geometricPanel=canvasPoint?panelAt(canvasPoint):null
        const hit=seamId?{seamId}:edgeKey ? {panel:edgePanel,edge:edgeParts.join(':')} : panelId ? {panel:panelId} : geometricPanel ? {panel:geometricPanel} : null
        onContextMenuRequest({x:e.clientX,y:e.clientY,dimension:'2d',hit,hasBackgroundImage:Boolean(reference.image)})
      }}
      onPointerDown={e => {
        if (isDrawing || measuring) return
        if (e.button !== 0) return
        // SVG child overlays (guides, selected marquee boxes, cutlines) can
        // swallow a panel's own pointerdown. Resolve the real paper beneath
        // the pointer and begin exactly the same gesture as a paper click.
        // This is essential after a multi-marquee selection: otherwise the
        // root overwrites a live group drag with a viewport-pan gesture.
        if(transform2d&&!busy&&!e.shiftKey&&!drag.current){
          const xy=point(e),hit=xy&&panelAt(xy)
          const excluded=e.target.closest?.('[data-control-point],[data-2d-rotate],'+
            '[data-2d-graphic-item],[data-2d-graphic-hit],[data-graphic-transform-box],'+
            '[data-graphic-resize-handle],[data-2d-reference-image]')
          if(hit&&!excluded&&patternMultiSelection.length>1&&patternMultiSelection.includes(hit)){
            const entry=panels.find(item=>item.panel.id===hit)
            if(entry){start(e,entry.panel);return}
          }
        }
        if(drag.current)return
        // A click on any other 2D surface, including drafting paper, ends
        // artwork selection. Graphic hits and resize handles own their pointer
        // downs; normal pattern selection continues through its own handlers.
        if(tool2d==='select'&&!busy&&!e.target.closest?.(
          '[data-2d-graphic-item],[data-2d-graphic-hit],[data-graphic-transform-box],[data-graphic-resize-handle]'
        ))onSelectGraphic(null)
        const p = point(e)
        if (!p) return
        drag.current = {pan: true, background: e.target===svg.current, start: p}
        svg.current.setPointerCapture(e.pointerId)
      }}
      onWheel={zoom}>
      <defs>
        <pattern id={`${uid}-minor`} width={gridMinorStep} height={gridMinorStep} patternUnits="userSpaceOnUse">
          <path d={`M ${gridMinorStep} 0 L 0 0 0 ${gridMinorStep}`} fill="none"
            stroke={adaptiveCad?.grid||(studioPreferences?.twoDGridColor==='auto'||!studioPreferences?.twoDGridColor?PATTERN_VISUAL.gridMinor:markerColor)} strokeWidth=".45" vectorEffect="non-scaling-stroke"/>
        </pattern>
        <pattern id={`${uid}-major`} width={gridMajorStep} height={gridMajorStep} patternUnits="userSpaceOnUse">
          <path d={`M ${gridMajorStep} 0 L 0 0 0 ${gridMajorStep}`} fill="none"
            stroke={adaptiveCad?.grid||(studioPreferences?.twoDGridColor==='auto'||!studioPreferences?.twoDGridColor?PATTERN_VISUAL.gridMajor:markerColor)} strokeWidth=".65" vectorEffect="non-scaling-stroke"/>
        </pattern>
        <pattern id={`${uid}-dots`} width={dotStep} height={dotStep} patternUnits="userSpaceOnUse">
          <circle cx={dotStep/2} cy={dotStep/2} r={screenUnit*.86*dotScale} fill={displayGridColor}/>
        </pattern>
        <pattern id={`${uid}-dots-major`} width={dotStep*5} height={dotStep*5} patternUnits="userSpaceOnUse">
          <circle cx={dotStep*2.5} cy={dotStep*2.5} r={screenUnit*1.45*dotScale} fill={displayGridColor}/>
        </pattern>
      </defs>
      <rect x={view[0]-view[2]} y={view[1]-view[3]} width={view[2]*3} height={view[3]*3} fill={canvasColor} pointerEvents="none"/>
      {showGrid&&dottedGrid&&<g opacity={markerOpacity} pointerEvents="none">
        <rect x={view[0]-view[2]} y={view[1]-view[3]} width={view[2]*3} height={view[3]*3} fill={`url(#${uid}-dots)`}/>
        <rect x={view[0]-view[2]} y={view[1]-view[3]} width={view[2]*3} height={view[3]*3} fill={`url(#${uid}-dots-major)`}/>
      </g>}
      {showGrid&&markerStyle==='grid'&&<rect x={view[0]-view[2]} y={view[1]-view[3]} width={view[2]*3} height={view[3]*3} fill={`url(#${uid}-minor)`} opacity={(viewPreset==='GRID'?1:.6)*markerOpacity} pointerEvents="none"/>}
      {showGrid&&markerStyle==='grid'&&<rect x={view[0]-view[2]} y={view[1]-view[3]} width={view[2]*3} height={view[3]*3} fill={`url(#${uid}-major)`} opacity={(viewPreset==='GRID'?1:.65)*markerOpacity} pointerEvents="none"/>}
      <PatternReferenceImageLayer image={reference.image} setImage={reference.setImage} unitsPerCm={.01}
        screenUnit={screenUnit}
        interactive={!busy && tool2d === 'select' && mode === 'edit'}/>
      {!precisionDrafting&&<line x1={view[0]-view[2]} x2={view[0]+view[2]*2} y1=".76" y2=".76" stroke="#9aaeb3" strokeWidth=".6" opacity=".5" vectorEffect="non-scaling-stroke" pointerEvents="none"/>}
      {!precisionDrafting&&<line x1="0" x2="0" y1={view[1]-view[3]} y2={view[1]+view[3]*2} stroke="#424b4f" strokeWidth=".8" opacity=".4" vectorEffect="non-scaling-stroke" pointerEvents="none"/>}
      {!precisionDrafting&&<g pointerEvents="none" fontSize=".022" fill="#6c8188">
        <text x=".02" y=".745">X</text><text x=".015" y=".805">Y</text>
      </g>}
      {avatarVisible && s?.avatar?.triangles?.length > 0 && <g opacity=".42" transform={`translate(${avatarAnchorX} ${avatarAnchorY})`} aria-label="Centered front avatar silhouette"
        data-registered-shoulder-y={originalAlignment.current?.shoulderY} data-avatar-anchor-x={avatarAnchorX} data-avatar-anchor-y={avatarAnchorY}>
        <ClothCraftStudioSilhouette avatar={s.avatar}
          onPick={!busy&&!['pen','line','sew'].includes(mode)?onAvatarPick:undefined}/>
      </g>}
      <g data-clothcraft-metric-layer="true" transform={`translate(${offset[0]} ${offset[1]})`}>
      {!(referenceModeActive||(!busy&&mode==='edit'&&['select','direct-select'].includes(tool2d)))&&<g transform="scale(.001)" data-reference-photo-millimeter-layer="true">
        <PatternReferencesSvgLayer20261025 references={patternReferences} onChange={onUpdatePatternReferences} rootUnitMm={1000}
          interactive={false}/>
      </g>}
      {panels.map(({panel, range, color, points}, panelIndex) => {
        const selected = patternMultiSelection.length>0?patternMultiSelection.includes(panel.id):
          (selection !== undefined ? selection?.panel === panel.id : active?.panel === panel.id)
        const currentPreview=preview?.panelId===panel.id ||
          (preview?.kind==='move'&&preview?.groupIds?.includes(panel.id)) ? preview : null
        const livePoints=points.map(p=>previewPoint(p,currentPreview))
        const editablePreview=handlePreview?.panelId===panel.id&&handlePreview.polygon
          ||pendingCurveCommit?.panelId===panel.id&&pendingCurveCommit.polygon||null
        // Never render native mesh-triangle subpaths as full-size pattern
        // paper: overlapping panels can make huge opaque navy rectangles.
        // A valid authored perimeter is the only filled surface. A panel
        // without a valid perimeter stays unfilled, with its native cutlines
        // and independent interaction paths still available.
        const perimeterPath=proposedPaperOutline(panel,range,editablePreview||panel.polygon,currentPreview)
        const shapePath=perimeterPath||''
        const clipId=`${uid}-pattern-${panelIndex}`
        const labelBounds=getBounds(livePoints)
        const label=[labelBounds.cx,labelBounds.maxY+16*screenUnit]
        const transformBounds=selected&&transform2d?getBounds(livePoints):null
        return <g key={panel.id} data-2d-pattern-piece={panel.id} data-2d-pattern-selected={String(selected)}
          onPointerEnter={() => hover({panel: panel.id})} onPointerLeave={() => hover(null)}>
          <defs>
            <clipPath id={clipId}><path d={shapePath}/></clipPath>
            <linearGradient id={`${uid}-pattern-glass-${panelIndex}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ffffff" stopOpacity=".15"/>
              <stop offset=".34" stopColor={cadColor20261023(studioPreferences?.twoDPatternColor,'#cce7f5')} stopOpacity=".035"/>
              <stop offset=".78" stopColor={cadColor20261023(studioPreferences?.twoDPatternColor,'#cce7f5')} stopOpacity=".055"/>
              <stop offset="1" stopColor="#ffffff" stopOpacity=".12"/>
            </linearGradient>
          </defs>
          {/* CLO drafting paper: a soft selected surface and an opaque white
              unselected surface, independent of physical fabric tint. */}
          <path data-panel={panel.id} data-pattern-surface="drafting-paper"
            data-pattern-outline-valid={String(Boolean(perimeterPath))}
            data-paper-preview-state={editablePreview?'uncommitted-curve':'native-mesh'} d={shapePath}
            fill={!perimeterPath?'none':studioPreferences?.twoDPatternColor&&studioPreferences.twoDPatternColor!=='auto'?cadColor20261023(studioPreferences.twoDPatternColor,PATTERN_VISUAL.paper):patternStudioActive?'#b7d9f6':selected?PATTERN_VISUAL.selectedPaper:PATTERN_VISUAL.paper}
            fillOpacity={studioPreferences?.twoDPatternSurfaceStyle==='glass'
              ?selected?.09:.045:
              (reference.image?.visible!==false&&reference.image)
              ||patternReferences.some(item=>item.visible!==false&&!referenceModeActive)?.26:1}
            style={{cursor:busy?'default':nativeCursor||(transform2d?cursorForTool('move'):'default')}}
            onPointerDown={e => {if (tool2d === 'annotation'||editSewingActive) e.stopPropagation(); else if(!drag.current)start(e, panel)}}
            onClick={e => {if(editSewingActive){e.stopPropagation();return}if (!createAnnotation(e,panel,range)) {e.stopPropagation();
              if(mode==='edit'&&['point','anchor-point','direct-select','construction-point'].includes(tool2d)&&panel.polygon?.points?.length){
                const click=point(e),vertices=panel.polygon.points.map(uv=>transform(panel,range,uv))
                const index=click?vertices.findIndex(uv=>Math.hypot(uv[0]-click[0],uv[1]-click[1])<=13*screenUnit):-1
                pick({panel:panel.id,...(index>=0?{anchor:index,edge:panel.polygon.edges[index]}:{})})
              }else if(!(tool2d==='select'&&e.shiftKey))pick({panel: panel.id})}}}/>
          {Boolean(perimeterPath)&&studioPreferences?.twoDPatternSurfaceStyle==='glass'&&
            <path data-pattern-surface-glass="true" d={shapePath}
              fill={`url(#${uid}-pattern-glass-${panelIndex})`}
              stroke="#ffffff" strokeOpacity=".45" strokeWidth=".8"
              vectorEffect="non-scaling-stroke" pointerEvents="none"/>}
          {transformBounds&&<g data-2d-pattern-transform-box={panel.id} pointerEvents="none">
            <rect x={transformBounds.minX} y={transformBounds.minY}
              width={transformBounds.width} height={transformBounds.height}
              fill="none" stroke="#278dc7" strokeWidth="1.5" strokeDasharray="5 3"
              vectorEffect="non-scaling-stroke"/>
            {[[transformBounds.minX,transformBounds.minY],[transformBounds.cx,transformBounds.minY],
              [transformBounds.maxX,transformBounds.minY],[transformBounds.maxX,transformBounds.cy],
              [transformBounds.maxX,transformBounds.maxY],[transformBounds.cx,transformBounds.maxY],
              [transformBounds.minX,transformBounds.maxY],[transformBounds.minX,transformBounds.cy]]
              .map(([x,y],i)=><rect key={i} data-2d-pattern-transform-handle={`${panel.id}:${i}`}
                x={x-4*screenUnit} y={y-4*screenUnit} width={8*screenUnit} height={8*screenUnit}
                fill="#f9fcff" stroke="#278dc7" strokeWidth="1.25" vectorEffect="non-scaling-stroke"/>)}
          </g>}
          {tool2d==='shape-builder'&&[shapeBuilderSelection.a,shapeBuilderHovered].includes(panel.id)&&<path
            data-shape-builder-selected={shapeBuilderSelection.a===panel.id?'base':'hover'} d={shapePath}
            fill={shapeBuilderHovered===panel.id?'#27c7b5':'none'} fillOpacity=".09"
            stroke={shapeBuilderSelection.a===panel.id?'#f7d56b':'#66d8ee'} strokeWidth="3"
            strokeDasharray="8 3" vectorEffect="non-scaling-stroke" pointerEvents="none"/>}
          {/* Drafting references are a PAPER underlay. The authored cutline,
              notch marks and native entities later in this panel must retain
              visual priority. Reference hits are resolved at the SVG root,
              not by overpainting or intercepting native boundary clicks. */}
          {(showReferenceGuides||mode==='edit') && <g data-2d-reference-layer={panel.id} opacity={selected?.97:.86}>
            <ConstructionGuides panel={panel} range={range} boundaries={range.boundaries}
              uv={boardUV} triangles={(s.triangles||[]).slice(...range.triangles)}
              clipId={clipId} preview={currentPreview}
              showNotchReferences={showNativeNotches}
              onSelectGuide={!busy&&mode==='edit'&&tool2d==='select'?selectConstructionGuide:null}
              onCreateGuideLine={!busy&&mode==='edit'&&tool2d==='select'?createNativeLineFromGuide:null}
              screenUnit={screenUnit} selectedGuide={selectedGuide} hoveredGuideId={hoveredGuideId}
              curveMode={mode==='edit'&&tool2d==='curve'}
              curveOffsets={guideHalfCurves} curveDraft={guideHalfCurveDraft}
              nativeCornerNodesVisible={tool2d==='select'||
                (mode==='edit'&&['point','curve'].includes(tool2d)&&
                  (selected||contextNodesInEdit))}
              editableSideStations={tool2d==='curve'&&mode==='edit'}/>
          </g>}
          {foamPads.filter(pad=>pad.panel===panel.id&&pad.points?.length>=3).map(pad=>{
            const shift=foamPreview?.id===pad.id?foamPreview:pad
            const moved={...pad,x:shift.x,y:shift.y}
            const points=shapePoints(moved).map(uv=>previewPoint(transform(panel,range,uv),currentPreview))
            if(points.length<3)return null
            return <g key={pad.id} data-native-foam-outline={pad.id} data-foam-locked={String(Boolean(pad.locked))}>
              <polygon points={points.map(p=>p.join(',')).join(' ')} fill="#94d9ef" fillOpacity=".2" stroke="#176d83" strokeWidth=".0035" strokeDasharray=".009 .005" strokeLinejoin="round"
                style={{cursor:pad.locked?'not-allowed':'move'}} pointerEvents="all" onPointerDown={event=>beginFoamDrag(event,pad)} onClick={event=>{event.stopPropagation();pick({panel:panel.id})}}/>
              <text x={points[0][0]} y={points[0][1]-.012} fontSize=".016" fill="#176d83" pointerEvents="none">{pad.name||'Foam'} · {pad.locked?'LOCKED':'DRAG'}</text>
            </g>
          })}
          {/* Printing registration uses native rest-material metres, exactly
              matching the Rust physical dimensions and curved 3D decal. */}
          {graphics.filter(g=>g.panel===panel.id&&g.visible!==false).map(g=>{
            const uv=s.uv.slice(...range.vertices)
            if(!uv.length)return null
            const x=uv.map(p=>p[0]),y=uv.map(p=>p[1])
            const minX=Math.min(...x),maxX=Math.max(...x),maxY=Math.max(...y)
            const graphicSize=graphicPreview?.id===g.id&&graphicPreview.widthMm>0?graphicPreview:g
            const w=Number(graphicSize.widthMm)/1000,h=Number(graphicSize.heightMm)/1000
            if(!(w>0&&h>0&&Number.isFinite(w)&&Number.isFinite(h)))return null
            // Rust positionMm is the print's top-left material-space offset.
            // Convert to the image center only when building the SVG transform.
            const [mx,my]=graphicPreview?.id===g.id?graphicPreview.positionMm:
              g.positionMm||[(.5*(maxX-minX)-w/2)*1000,(.5*(maxY-Math.min(...y))-h/2)*1000]
            const center=previewPoint(transform(panel,range,[minX+mx/1000+w/2,maxY-my/1000-h/2]),currentPreview)
            const rotation=(panel.layout_rotation_degrees||0)+(g.rotation||0)
            const topLeft=[center[0]-w/2,center[1]-h/2]
            const selectable=['select','direct-select'].includes(tool2d)&&!busy
            const selectedGraphic=g.id===selectedGraphicId
            return <g key={g.id} data-2d-graphic-item={g.id} data-graphic-selected={String(selectedGraphic)}>
              <g transform={`rotate(${rotation} ${center[0]} ${center[1]})`}>
                <image data-2d-graphic={g.id}
                  href={g.displayedMap==='normal'&&g.normalMapDataUrl?g.normalMapDataUrl:g.dataUrl}
                  x={topLeft[0]} y={topLeft[1]} width={w} height={h}
                  preserveAspectRatio="none" opacity={g.opacity??1}
                  clipPath={`url(#${clipId})`}
                  pointerEvents="none"/>
                {/* SVG image hit testing varies across browser/clip-path
                    combinations. A transparent rect is the reliable drag hit
                    surface; it covers precisely the printed image bounds. */}
                <rect data-2d-graphic-hit={g.id}
                  x={topLeft[0]} y={topLeft[1]} width={w} height={h}
                  fill="transparent" pointerEvents="all"
                  style={{cursor:selectable?'move':'default'}}
                  onPointerEnter={()=>setHoveredGraphicId(g.id)}
                  onPointerLeave={()=>setHoveredGraphicId(current=>current===g.id?null:current)}
                  onPointerDown={event=>startGraphicDrag(event,g,panel)}
                  onClick={event=>{if(!selectable)return;event.stopPropagation();onSelectGraphic(g.id)}}
                  onDoubleClick={event=>{if(!selectable)return;event.stopPropagation();onSelectGraphic(g.id)}}/>
                {(selectedGraphic||hoveredGraphicId===g.id)&&<GraphicMeasurementBox id={g.id} x={topLeft[0]} y={topLeft[1]}
                  width={w} height={h} enabled={showGraphicMeasurements||hoveredGraphicId===g.id||graphicPreview?.id===g.id} screenUnit={screenUnit} unit={rulerUnits}/>}
                {selectedGraphic&&<g data-graphic-transform-box={g.id}>
                  <rect x={topLeft[0]} y={topLeft[1]} width={w} height={h} fill="none" stroke="#1389c0"
                    strokeWidth="1.5" vectorEffect="non-scaling-stroke" pointerEvents="none"/>
                  {[
                    ['nw',0,0,'nwse-resize'],['n',.5,0,'ns-resize'],['ne',1,0,'nesw-resize'],
                    ['w',0,.5,'ew-resize'],['e',1,.5,'ew-resize'],
                    ['sw',0,1,'nesw-resize'],['s',.5,1,'ns-resize'],['se',1,1,'nwse-resize'],
                  ].map(([handle,hx,hy,cursor])=><rect key={handle}
                    data-graphic-resize-handle={`${g.id}:${handle}`}
                    x={topLeft[0]+w*hx-4.5*screenUnit} y={topLeft[1]+h*hy-4.5*screenUnit}
                    width={9*screenUnit} height={9*screenUnit}
                    fill="#fff" stroke="#147aa4" strokeWidth="1.25" vectorEffect="non-scaling-stroke"
                    style={{cursor:selectable?cursor:'default'}} pointerEvents={selectable?'all':'none'}
                    onPointerDown={event=>startGraphicResize(event,g,panel,handle)}/>)}
                </g>}
              </g>
            </g>
          })}
          {(panel.polygon?.annotations || []).map(note => {
            const [x,y]=transform(panel,range,note.position)
            const [tx,ty]=previewPoint([x,y],currentPreview)
            return <g key={note.id} data-pattern-annotation={`${panel.id}:${note.id}`}
              onPointerDown={e=>e.stopPropagation()}
              onClick={e=>{
                e.stopPropagation()
                if(busy)return
                pick({panel:panel.id})
                if(e.altKey){void edit({kind:'RemoveAnnotation',panel:panel.id,id:note.id});return}
                if(tool2d!=='editAnnotation'&&tool2d!=='annotation')return
                const text=window.prompt('Edit annotation (Alt-click to delete)',note.text)
                if(text!==null&&text.trim())void edit({kind:'Annotation',panel:panel.id,id:note.id,text:text.trim(),position:note.position})
              }} style={{cursor:tool2d==='annotation'||tool2d==='editAnnotation'?'text':'pointer'}}>
              <rect data-annotation-background="true" x={tx-5*screenUnit} y={ty-13*screenUnit} width={Math.max(30,note.text.length*6.6+10)*screenUnit} height={19*screenUnit} rx={2*screenUnit} fill="#ffffff" fillOpacity=".92" stroke="#b5b9bd" strokeWidth=".65" vectorEffect="non-scaling-stroke"/>
              <text x={tx} y={ty} fontSize={11*screenUnit} fontFamily="Arial,sans-serif" fill="#42484f" pointerEvents="none">{note.text}</text>
            </g>
          })}
          {selected && transform2d && <SelectionMarquee2D
            points={livePoints} panel={panel} onStart={start} disabled={busy} screenUnit={screenUnit}/>}
          {Object.entries(range.boundaries || {}).map(([edge, indices]) => {
            const linkedSeams=(s?.template?.seams||[]).filter(seam=>[seam.a,seam.b].some(side=>side?.panel===panel.id&&side.edge===edge))
            const editingSeam=editSewingActive&&linkedSeams.length>0
            const selectedSeamEdge=editSewingActive&&linkedSeams.some(seam=>seam.id===selection?.seamId)
            const paths=boundarySegments(indices,boardUV).map(points=>points.map(p=>p.join(',')).join(' '))
            const selectedEdge=selected&&measuredNativeEdges(panel).includes(edge)
            const firstSewEdge=segmentSewing&&sewingFirstEdge?.panel===panel.id&&sewingFirstEdge?.edge===edge
            const hoverSewEdge=sewingActive&&active?.panel===panel.id&&active?.edge===edge
            const firstSewIndices=segmentSewing&&sewingFirstEdge?s?.panels?.find(p=>p.id===sewingFirstEdge.panel)?.boundaries?.[sewingFirstEdge.edge]:null
            const firstSewLength=firstSewIndices?sewingEdgeLength(firstSewIndices):null
            const candidateSewLength=segmentSewing?sewingEdgeLength(indices):null
            const sewLengthDifference=firstSewLength!==null&&candidateSewLength!==null?candidateSewLength-firstSewLength:null
            const edgeClick=e => {
              e.stopPropagation()
              if(mode==='edit'&&tool2d==='point'&&e.shiftKey&&!busy){
                const i=panel.polygon?.edges?.indexOf(edge)
                if(i>=0){
                  setMultiEdit(value=>{
                    const vertices=[i,(i+1)%panel.polygon.points.length]
                    const old=value.panel===panel.id?value.points:[]
                    return {panel:panel.id,points:[...new Set([...old,...vertices])].sort((a,b)=>a-b)}
                  })
                  pick({panel:panel.id,edge})
                }
                return
              }
              if(editSewingActive){
                if(busy||sewingCommitting)return
                if(linkedSeams.length){
                  const activeIndex=linkedSeams.findIndex(item=>item.id===selection?.seamId)
                  const seam=linkedSeams[(activeIndex+1)%linkedSeams.length]
                  onSelectSewingSeam(seam.id)
                }
                return
              }
              if(segmentSewing){
                if(busy||sewingCommitting||!Array.isArray(indices)||indices.length<2)return
                onSegmentSewEdge({panel:panel.id,edge})
                return
              }
              if(freeSewing){
                if(busy||sewingCommitting)return
                if(!Array.isArray(indices)||indices.length<2)return
                const candidate=projectFreeSewingPoint(indices,boardUV,point(e))
                if(candidate&&Number.isFinite(candidate.fraction)&&candidate.fraction>=0&&candidate.fraction<=1)
                  onFreeSewPoint({panel:panel.id,edge,fraction:candidate.fraction})
                return
              }
              if(mode==='edit'&&tool2d==='curve'&&!busy){
                // Select an actual named cutline before inserting material
                // knots. Previously EVERY click inserted a new free knot,
                // repeatedly rebuilding side panels when the user only meant
                // to choose an edge or its existing Bézier handles.
                const alreadySelected=selection?.panel===panel.id&&selection?.edge===edge
                pick({panel:panel.id,edge})
                if(!alreadySelected&&!e.shiftKey){
                  setFreeCurveStatus('Edge selected. Drag its yellow handles, or click the same edge again to insert a curve point.')
                  return
                }
                const xy=point(e)
                if(!xy||!panel.polygon)return
                const angle=(panel.layout_rotation_degrees||0)*Math.PI/180
                const dx=xy[0]-range.layout[0],dy=xy[1]-range.layout[1]
                const local=[dx*Math.cos(angle)+dy*Math.sin(angle),-dx*Math.sin(angle)+dy*Math.cos(angle)]
                const nearest=closestFreeCurveParameter(panel.polygon,edge,local)
                if(!nearest)return
                if(nearest.distance>Math.max(.003,10*screenUnit)){
                  setFreeCurveStatus('Add points on the actual cutline, not on nearby material or an old preview.')
                  return
                }
                const mirrored=mirrorFreeCurve?addNativeFreeCurvePoint(panel.polygon,edge,nearest.t,{mirror:true}):null
                // Center seams, asymmetric cuts and many independent collars
                // have no mirrored edge. Editing must still work there.
                const added=mirrored||addNativeFreeCurvePoint(panel.polygon,edge,nearest.t,{mirror:false})
                if(added){
                  setFreeCurveStatus(mirrorFreeCurve&&!mirrored?'No symmetric partner for this edge; curve point added independently.':'')
                  void applyOrStagePatternCurve(panel,added.polygon,edge)
                }else setFreeCurveStatus('Choose another position on the edge; a nearby point may already exist.')
                return
              }
              if(!createPhysicalDart(e,panel,edge)&&!editConstructionEdge(e,panel,edge,indices)&&!splitBoundary(e,panel,edge,indices))pick({panel:panel.id,edge})
            }
            return <g key={edge}>
              {paths.map((path,i)=>{
                const hovered=active?.panel===panel.id&&active?.edge===edge
                const curveFocused=mode==='edit'&&curveEditing&&selectedEdge
                const curveHovered=mode==='edit'&&tool2d==='curve'&&hovered
                const presentation=patternCutlinePresentation({selected,selectedEdge:selectedEdge||selectedSeamEdge,hovered,expressive:firstSewEdge})
                return <polyline key={i} points={path} fill="none" pointerEvents="none"
                  {...presentation}
                  stroke={curveFocused||curveHovered?CLO_CURVE_ACTIVE_YELLOW:hovered?CLO_HOVER_BLUE:presentation.stroke}
                  strokeWidth={curveFocused||curveHovered?2.5:hovered?2.2:presentation.strokeWidth}
                  data-active-curve-edge={String(Boolean(curveFocused||curveHovered))}
                  data-cutline-hover-blue={String(Boolean(hovered&&!curveFocused&&!curveHovered))}
                  data-sew-edge-state={sewingActive?(firstSewEdge?'first':hoverSewEdge?'hover':'eligible'):undefined}/>
              })}
              {paths.map((path,i)=><polyline key={i} data-edge={`${panel.id}:${edge}`} data-2d-edge-hit={`${panel.id}:${edge}`}
                data-segment-sew-candidate={segmentSewing?'true':undefined} data-free-sew-candidate={freeSewing?'true':undefined}
                data-edit-sew-candidate={editSewingActive?'true':undefined}
                data-seam-link={editingSeam?linkedSeams.map(item=>item.id).join(' '):undefined}
                points={path} fill="none" stroke="transparent"
                  strokeWidth={sewingOverlayVisible?'14':'10'} vectorEffect="non-scaling-stroke" pointerEvents="stroke"
                  style={{cursor:busy||sewingCommitting?'wait':(sewingActive||editSewingActive)?SEWING_CURSOR:nativeCursor||'pointer'}}
                data-anchor-reshape-hit={tool2d==='anchor-point'?`${panel.id}:${edge}`:undefined}
                onContextMenu={event=>{
                  if(busy)return
                  event.preventDefault();event.stopPropagation()
                  const seamId=editSewingActive?(linkedSeams.find(seam=>seam.id===selection?.seamId)||linkedSeams[0])?.id:null
                  if(seamId)onSelectSewingSeam(seamId)
                  else pick({panel:panel.id,edge})
                  onContextMenuRequest({x:event.clientX,y:event.clientY,dimension:'2d',hit:{panel:panel.id,edge,...(seamId?{seamId}:{})}})
                }}
                onPointerDown={e => {
                  if(mode==='edit'&&tool2d==='point'&&e.shiftKey&&e.button===0){
                    e.preventDefault();e.stopPropagation()
                    const i=panel.polygon.edges.indexOf(edge)
                    if(i>=0){
                      setMultiEdit(value=>{
                        const old=value.panel===panel.id?value.points:[]
                        return {panel:panel.id,
                          points:[...new Set([...old,i,(i+1)%panel.polygon.points.length])].sort((a,b)=>a-b)}
                      })
                      pick({panel:panel.id,edge})
                    }
                    return
                  }
                  if(mode==='edit'&&tool2d==='anchor-point'&&!busy&&e.button===0){
                    const xy=point(e)
                    const angle=(panel.layout_rotation_degrees||0)*Math.PI/180
                    const dx=(xy?.[0]??0)-range.layout[0],dy=(xy?.[1]??0)-range.layout[1]
                    const local=[dx*Math.cos(angle)+dy*Math.sin(angle),-dx*Math.sin(angle)+dy*Math.cos(angle)]
                    const nearest=xy&&closestFreeCurveParameter(panel.polygon,edge,local)
                    if(nearest&&nearest.distance<=Math.max(.003,10*screenUnit)&&
                      !panel.polygon.free_curve_points?.[edge]?.length){
                      start(e,panel,`r:${edge}`,'reshape-segment',{edge,t:nearest.t})
                      return
                    }
                    e.stopPropagation()
                    pick({panel:panel.id,edge})
                    return
                  }
                  e.stopPropagation()
                }}
                onPointerEnter={e => {e.stopPropagation();hover({panel:panel.id,edge})}}
                onPointerMove={e=>{
                  if(!freeSewing)return
                  const candidate=projectFreeSewingPoint(indices,boardUV,point(e))
                  if(candidate&&Number.isFinite(candidate.fraction))setFreeHover({panel:panel.id,edge,fraction:candidate.fraction})
                  else setFreeHover(null)
                }}
                onPointerLeave={e=>{e.stopPropagation();hover(null);if(freeSewing)setFreeHover(null)}}
                onClick={edgeClick}/>)}
              {sewingActive && (hoverSewEdge||firstSewEdge) && (() => {
                // These are drafting orientation marks only. Direction remains
                // controlled by the sewing command, and Rust owns stitch data.
                const at=boundaryMark(indices,freeSewing&&freeHover?.panel===panel.id&&freeHover.edge===edge?freeHover.fraction:.5)
                if(!at)return null
                const tangent=[-at.normal[1],at.normal[0]]
                const size=8*screenUnit
                const tip=[at.p[0]+tangent[0]*size,at.p[1]+tangent[1]*size]
                const color=firstSewEdge?'#1579bd':'#ed963d'
                return <g data-sew-direction-mark={`${panel.id}:${edge}`}
                  data-sew-direction-kind={segmentSewing?'segment':'free'}
                  pointerEvents="none" stroke={color} fill="none" strokeWidth="2" vectorEffect="non-scaling-stroke">
                  <path d={`M${at.p[0]-tangent[0]*size} ${at.p[1]-tangent[1]*size}L${tip[0]} ${tip[1]} M${tip[0]} ${tip[1]}l${-tangent[0]*size*.65+at.normal[0]*size*.5} ${-tangent[1]*size*.65+at.normal[1]*size*.5} M${tip[0]} ${tip[1]}l${-tangent[0]*size*.65-at.normal[0]*size*.5} ${-tangent[1]*size*.65-at.normal[1]*size*.5}`}/>
                </g>
              })()}
              {segmentSewing&&hoverSewEdge&&sewingFirstEdge&&!firstSewEdge&&sewLengthDifference!==null&&(()=>{
                const midpoint=boundaryMark(indices,.5)?.p
                if(!midpoint)return null
                const deltaMm=sewLengthDifference*1000
                // CLO colors an advisory mismatch above 1 mm; Rust's own
                // provisional 2 mm preflight is a separate commit gate.
                const withinTolerance=Math.abs(deltaMm)<=1
                return <g data-segment-sew-length-preview="true"
                  data-segment-sew-mismatch-mm={deltaMm.toFixed(2)} pointerEvents="none">
                  <text x={midpoint[0]} y={midpoint[1]-18*screenUnit} textAnchor="middle"
                    fontSize={12*screenUnit} fontWeight="600" fill={withinTolerance?'#157a5c':'#b34e2b'}
                    stroke="#fff" strokeWidth={3*screenUnit} paintOrder="stroke">
                    {`1: ${(firstSewLength*1000).toFixed(1)} mm · 2: ${(candidateSewLength*1000).toFixed(1)} mm · Δ ${deltaMm>=0?'+':''}${deltaMm.toFixed(1)} mm`}
                  </text>
                </g>
              })()}
              {freeSewing&&(()=>{
                const onEdge=freeSewPoints.filter(marker=>marker.panel===panel.id&&marker.edge===edge)
                const ranges=[]
                for(const start of [0,2]){
                  const a=freeSewPoints[start],b=freeSewPoints[start+1]
                  if(a?.panel!==panel.id||a?.edge!==edge)continue
                  const end=b?.panel===panel.id&&b?.edge===edge?b:
                    freeSewPoints.length===start+1&&freeHover?.panel===panel.id&&freeHover.edge===edge?freeHover:null
                  if(end)ranges.push({start:a.fraction,end:end.fraction,confirmed:!!b})
                }
                if(!onEdge.length&&!ranges.length)return null
                return <g data-free-sew-selection={`${panel.id}:${edge}`} pointerEvents="none">
                  {ranges.map((selection,i)=>{
                    const points=freeSewingRangePoints(indices,boardUV,selection.start,selection.end)
                    return points.length>=2&&<polyline key={i}
                      data-free-sew-selected-range={selection.confirmed?'confirmed':'preview'}
                      data-range-start={Math.min(selection.start,selection.end).toFixed(5)}
                      data-range-end={Math.max(selection.start,selection.end).toFixed(5)}
                      points={points.map(p=>p.join(',')).join(' ')}
                      stroke={selection.confirmed?'#1579bd':'#1fbeed'} strokeWidth="4"
                      vectorEffect="non-scaling-stroke" strokeLinecap="round" fill="none"
                      strokeDasharray={selection.confirmed?undefined:'6 4'}/>
                  })}
                  {onEdge.map((marker,i)=>{
                    const p=freeSewingPointAtFraction(indices,boardUV,marker.fraction)
                    return p&&<circle key={i} data-free-sew-marker={String(freeSewPoints.indexOf(marker))}
                      cx={p[0]} cy={p[1]} r={3.5*screenUnit} stroke="#fff" strokeWidth=".8" vectorEffect="non-scaling-stroke"
                      fill={freeSewPoints.indexOf(marker)<2?'#1579bd':'#eb953b'}/>
                  })}
                </g>
              })()}
            </g>
          })}
          {showNativeNotches && Object.entries(panel.polygon?.notches||{}).flatMap(([edge,marks])=>{
            const indices=range.boundaries?.[edge]||[]
            return marks.map((mark,index)=>{
              const location=boundaryMark(indices,mark.t)
              if(!location)return null
              return <line key={`notch:${edge}:${index}`} data-native-notch={`${panel.id}:${edge}`}
                x1={location.p[0]} y1={location.p[1]}
                x2={location.p[0]+location.normal[0]*mark.depth_m}
                y2={location.p[1]+location.normal[1]*mark.depth_m}
                {...patternSemanticStroke('notch')} data-pattern-role="notch"
                pointerEvents="none"/>
            })
          })}
          {showNativeAllowances && Object.entries(panel.polygon?.seam_allowances||{}).flatMap(([edge,width])=>{
            const indices=range.boundaries?.[edge]||[]
            if(!Number.isFinite(width)||width<=0)return []
            // Split incomplete cutlines instead of bridging a missing vertex.
            // Corner miters are bounded in preview geometry; Rust owns the
            // actual allowance width and production pattern data.
            return boundarySegments(indices,boardUV).flatMap((run,runIndex)=>{
              const guide=seamAllowancePreviewPoints(run,width)
              if(guide.length<2)return []
              return [<polyline key={`allowance:${edge}:${runIndex}`}
                data-native-allowance={`${panel.id}:${edge}`}
                data-seam-allowance-preview="true"
                points={guide.map(p=>p.join(',')).join(' ')}
                {...patternSemanticStroke('seam-allowance')} data-pattern-role="seam-allowance"
                pointerEvents="none"/>]
            })
          })}
          {/* No inferred grainline: grain direction is a physical production
              annotation that must only be drawn from authored native data.
              The previous SVG reference stroke used metre viewBox units and
              accidentally painted gigantic navy triangles/squares. */}
          <text data-pattern-piece-label={panel.id} x={label[0]} y={label[1]} textAnchor="middle" fontSize={10*screenUnit} fill={selected?'#47404a':'#697076'}
            fontWeight="400" paintOrder="stroke" stroke="#fff" strokeWidth={1.5*screenUnit} strokeLinejoin="round"
            opacity={selected?1:.85} pointerEvents="none">{panel.name}</text>
          {showInternalLines&&<NativeInternalLines panel={panel} range={range} preview={currentPreview} screenUnit={screenUnit}
            onSelectGuide={!busy&&mode==='edit'&&tool2d==='select'?selectConstructionGuide:null}
            selectedGuide={selectedGuide} hoveredGuideId={hoveredGuideId}
            curveMode={!busy&&mode==='edit'&&tool2d==='curve'}
            activeInternalLine={activeInternalLine} onSelectCurve={selectNativeCurve}
            onStartTangent={(event,source,anchor)=>start(event,source,anchor)}
            handlePreview={handlePreview}/>}
          {/* Selected guide halves remain visually above prints and their
              transparent graphic-hit rectangles. This is paint only:
              no duplicate hit target and no native internal-line creation. */}
          {hoveredGuideGeometry?.panelId===panel.id&&
            hoveredGuideGeometry.points?.length===2&&
            (()=>{
              const offset=guideHalfCurveDraft?.id===hoveredGuideGeometry.id
                ?guideHalfCurveDraft.offset:guideHalfCurves[hoveredGuideGeometry.id]
              const curve=sampleGuideHalfCurve(...hoveredGuideGeometry.points,offset||[0,0],
                ((panel.layout_rotation_degrees||0)*Math.PI/180)+
                  (currentPreview?.kind==='rotate'?currentPreview.angle:0))
              if(!curve)return null
              const yellow=tool2d==='curve'&&(guideHalfCurveDraft?.id===hoveredGuideGeometry.id||
                selectedGuide?.id===hoveredGuideGeometry.id)
              return <polyline data-frontmost-half-hover={hoveredGuideGeometry.id}
                data-frontmost-hover-curve="true" points={curve.points.map(p=>p.join(',')).join(' ')}
                fill="none" stroke={yellow?CLO_CURVE_ACTIVE_YELLOW:CLO_HOVER_BLUE}
                strokeWidth="3" vectorEffect="non-scaling-stroke"
                strokeLinecap="butt" pointerEvents="none"/>
            })()}
          {showMeasurements && <Dimensions points={livePoints} selected={selected}
            panel={panel} boundaries={range.boundaries} uv={boardUV} clipId={clipId} preview={currentPreview} screenUnit={screenUnit} unit={rulerUnits}/>}
          {selected&&mode==='edit'&&curveEditing&&(()=>{
            // CLO-like per-edge measurements appear while an edge is being
            // curved. These are material-space lengths of the exact authored
            // spline proposal, not straight-line chord estimates.
            const livePolygon=editablePreview||panel.polygon
            const rows=curveDraftDimensions(livePolygon)
            const cornerBounds=getBounds(rows.flatMap(row=>[
              [row.bounds.minX,row.bounds.minY],[row.bounds.maxX,row.bounds.maxY]]))
            if(!cornerBounds||!rows.length)return null
            const total=rows.reduce((sum,item)=>sum+item.length,0)
            return <g data-curve-pattern-measurements={panel.id}
              data-measured-native-state={editablePreview?'uncommitted-curve':'native-mesh'}
              data-total-perimeter-cm={(total*100).toFixed(3)} pointerEvents="none">
              {rows.map(row=>{
                const toward=[row.midpoint[0]-cornerBounds.cx,row.midpoint[1]-cornerBounds.cy]
                const span=Math.hypot(...toward)||1
                const projected=[row.midpoint[0]+.013*toward[0]/span,row.midpoint[1]+.013*toward[1]/span]
                const p=previewPoint(transform(panel,range,projected),currentPreview)
                return <text key={row.edge} data-curve-measured-edge={row.edge}
                  data-curve-measured-length-cm={(row.length*100).toFixed(3)}
                  x={p[0]} y={p[1]} fontSize={10*screenUnit}
                  textAnchor="middle" fill="#5c4315" stroke="#fff8db"
                  strokeWidth={3.1*screenUnit} paintOrder="stroke"
                  fontWeight="650">{displayMeasurement(row.length)}</text>
              })}
              {(()=>{
                const top=previewPoint(transform(panel,range,[cornerBounds.cx,cornerBounds.minY-.044]),currentPreview)
                const base=previewPoint(transform(panel,range,[cornerBounds.cx,cornerBounds.maxY+.048]),currentPreview)
                return <>
                  <text data-curve-width-cm={(cornerBounds.width*100).toFixed(3)}
                    x={top[0]} y={top[1]} textAnchor="middle" fontSize={12*screenUnit}
                    fill="#6c4b18" stroke="#fff7da" strokeWidth={4*screenUnit}
                    paintOrder="stroke" fontWeight="700">
                    Width {displayMeasurement(cornerBounds.width)} · Height {displayMeasurement(cornerBounds.height)}
                  </text>
                  <text data-curve-perimeter-cm={(total*100).toFixed(3)}
                    x={base[0]} y={base[1]} textAnchor="middle" fontSize={11*screenUnit}
                    fill="#6c4b18" stroke="#fff7da" strokeWidth={4*screenUnit}
                    paintOrder="stroke">Outline {displayMeasurement(total)} · 2D cutline</text>
                </>
              })()}
            </g>
          })()}
          {mode==='edit'&&tool2d==='curve'&&/front|back|torso|bodice/i.test(panel.id+' '+panel.name)&&(()=>{
            const angle=(panel.layout_rotation_degrees||0)*Math.PI/180+
              (currentPreview?.kind==='rotate'?currentPreview.angle:0)
            const {local}=patternGuideLocalFrame(boardUV,
              previewPoint(transform(panel,range,[0,0]),currentPreview),angle)
            const outline=Object.values(range.boundaries||{}).flat().map(i=>local[i]).filter(Boolean)
            const b=getBounds(outline)
            if(!b)return null
            const chest=armpitChestReference(panel.polygon)?.y??b.minY+b.height*.46
            const belly=b.minY+b.height*.64
            const stations=torsoSideCurveStations(draftPolygon(panel),chest,belly)
            return <g data-editable-side-stations={panel.id}>
              {stations.map(item=>{
                const p=previewPoint(transform(panel,range,item.position),currentPreview)
                return <g key={item.edge+':'+item.level}
                  data-side-edit-station={panel.id+':'+item.edge+':'+item.level}
                  data-side-edit-station-t={item.t.toFixed(8)}>
                  <circle cx={p[0]} cy={p[1]} r={7.5*screenUnit}
                    fill="transparent" stroke="none" style={{cursor:'crosshair'}}
                    aria-label={item.level==='belly'
                      ?'Add and drag real curve point at belly guide endpoint'
                      :'Add and drag real curve point between chest and belly'}
                    onPointerDown={event=>{
                      if(busy||event.button!==0)return
                      const paired=mirrorFreeCurve
                        ?addNativeFreeCurvePoint(draftPolygon(panel),item.edge,item.t,{mirror:true}):null
                      const added=paired||addNativeFreeCurvePoint(draftPolygon(panel),item.edge,item.t,{mirror:false})
                      if(!added?.mark){setFreeCurveStatus('A curve point already exists nearby, or this side cannot accept another point.');return}
                      start(event,{...panel,polygon:added.polygon},`f:${item.edge}:${added.mark.id}`)
                      if(drag.current){drag.current.stationDraft=true;drag.current.stationEdge=item.edge;drag.current.originalPanel=panel}
                    }}/>
                  <circle cx={p[0]} cy={p[1]} r={4*screenUnit}
                    fill="#fff8db" stroke="#e25532" strokeWidth={1.65}
                    vectorEffect="non-scaling-stroke" pointerEvents="none"/>
                </g>
              })}
            </g>
          })()}
          {(s?.template?.seams||[]).filter(seam=>seam.id.startsWith('dart_')&&seam.a.panel===panel.id&&seam.b.panel===panel.id).map(seam=>{
            const polygon=panel.polygon,legs=[seam.a.edge,seam.b.edge].map(edge=>polygon?.edges?.indexOf(edge))
            if(legs.some(index=>index==null||index<0))return null
            const pts=legs.map(index=>[polygon.points[index],polygon.points[(index+1)%polygon.points.length]])
              .map(pair=>pair.map(uv=>previewPoint(transform(panel,range,uv),currentPreview)))
            return <g key={seam.id} data-physical-dart={seam.id} data-dart-physical="true" pointerEvents="none">
              {pts.map(([a,b],i)=><line key={i} data-physical-dart-leg={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]}
                stroke="#ac2940" strokeWidth="2.75" vectorEffect="non-scaling-stroke"/>)}
              <circle cx={pts[0][1][0]} cy={pts[0][1][1]} r={3*screenUnit} fill="#ac2940"/>
            </g>
          })}
          {mode==='edit'&&showRedDartGuides&&!(s?.template?.seams||[]).some(seam=>seam.id.startsWith('dart_')&&seam.a.panel===panel.id)&&/front|back|torso|bodice/i.test(panel.id+' '+panel.name)&&(()=>{
            // The supplied CLO reference has SHORT RED TICKS extending inward
            // from actual upper-side construction vertices. It does NOT show
            // floating red triangles at arbitrary points across the belly.
            // Use the authored underarm vertices shared by the chest bar.
            const polygon=editablePreview||panel.polygon
            const edges=polygon?.edges||[]
            const left=edges.indexOf('side-left'),right=edges.indexOf('side-right')
            if(left<0||right<0)return null
            const positions=[
              {edge:'side-left',uv:polygon.points[(left+1)%edges.length],direction:1},
              {edge:'side-right',uv:polygon.points[right],direction:-1},
            ]
            if(positions.some(item=>!Array.isArray(item.uv)||item.uv.some(n=>!Number.isFinite(n))))return null
            return <g data-red-dart-guides={panel.id} data-dart-kind="construction"
              data-dart-physical="false" data-dart-style="short-point-tick" pointerEvents="none">
              {positions.map(({edge,uv,direction})=>{
                const a=previewPoint(transform(panel,range,uv),currentPreview)
                const b=previewPoint(transform(panel,range,[uv[0]+direction*.042,uv[1]-.002]),currentPreview)
                return <line key={edge} data-red-dart={panel.id+':'+edge}
                  data-red-dart-anchor-edge={edge}
                  x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]}
                  stroke="#e03c42" strokeWidth="2.75"
                  vectorEffect="non-scaling-stroke" strokeLinecap="round"/>
              })}
            </g>
          })()}
          {/* CLO also leaves context knots visible on unselected pattern
              pieces. Show real authored corners or native boundary endpoints
              in muted grey; selected corners stay dark. These dots never
              acquire pointer events or modify editable geometry. */}
          {(tool2d==='select'||(contextNodesInEdit&&mode==='edit'&&['point','curve'].includes(tool2d)&&!selected)) && (()=>{
            const corners=panel.polygon?.points?.length
              ?panel.polygon.points.map(uv=>previewPoint(transform(panel,range,uv),currentPreview))
              :Object.values(range.boundaries||{}).flatMap(indices=>[
                boardUV[indices[0]],boardUV[indices[indices.length-1]],
              ]).filter(Boolean)
            const unique=corners.filter((p,i)=>corners.findIndex(q=>Math.hypot(p[0]-q[0],p[1]-q[1])<.0005)===i)
            // Keep visible corner marks stable on screen while zooming,
            // rather than allowing them to overwhelm small pieces.
            const radius=pointRadiusInView(selected?PATTERN_METRICS.contextPointRadius:PATTERN_METRICS.inactivePointRadius,screenUnit)
            const appearance=patternPointGlyph('boundary-corner',{state:selected?'normal':'inactive'})
            return unique.map((p,n)=><circle key={n} data-2d-visible-corner={`${panel.id}:${n}`}
              cx={p[0]} cy={p[1]} r={radius} fill={appearance.fill}
              stroke={appearance.stroke} strokeWidth={appearance.strokeWidth} vectorEffect="non-scaling-stroke"
              opacity={appearance.opacity} pointerEvents="none"/>)
          })()}
          {(selected||tool2d==='remove-anchor') && mode === 'edit' && ['select','point','anchor-point','direct-select','remove-anchor','curve','construction-point'].includes(tool2d) && panel.polygon?.points?.map((uv, n) => {
            const livePolygon=handlePreview?.panelId===panel.id&&handlePreview.polygon||draftPolygon(panel)
            const livePoint=livePolygon.points?.[n]||uv
            const p = previewPoint(transform(panel, range, livePoint),currentPreview)
            const inControl=livePolygon.curves?.[panel.polygon.edges[(n+panel.polygon.points.length-1)%panel.polygon.points.length]]?.[1]||livePoint
            const outControl=livePolygon.curves?.[panel.polygon.edges[n]]?.[0]||livePoint
            const role=vectorcraftAnchorKind(livePoint,inControl,outControl)==='smooth'?'smooth-curve':'boundary-corner'
            const appearance=patternPointGlyph(role,{state:selection?.panel===panel.id&&selection?.anchor===n?'selected':active?.anchor===n?'hovered':'normal'})
            return <circle key={n} data-control-point="vertex" data-pattern-point-role={role} data-panel-id={panel.id}
              data-pattern-anchor-index={n}
              data-clo-multi-selected={multiEdit.panel===panel.id&&multiEdit.points.includes(n)?'true':'false'}
              data-promoted-vertex-id={panel.polygon?.vertex_ids?.[panel.polygon?.edges?.[n]]||undefined}
              cx={p[0]} cy={p[1]} r={pointRadiusInView(selection?.panel===panel.id&&selection?.anchor===n?PATTERN_METRICS.selectedPointRadius:PATTERN_METRICS.editPointRadius,screenUnit)}
              fill={appearance.fill}
              stroke={multiEdit.panel===panel.id&&multiEdit.points.includes(n)?'#ffd52b':appearance.stroke}
              strokeWidth={multiEdit.panel===panel.id&&multiEdit.points.includes(n)?2.8:appearance.strokeWidth}
              vectorEffect="non-scaling-stroke" style={{cursor:tool2d==='direct-select'?'move':'default'}}
              title={tool2d==='select'?'Drag to move this corner · Double-click to edit point and curve handles':'Drag to reshape corner · Double-click to switch straight/curved'}
              onDoubleClick={event=>{
                if(tool2d!=='anchor-point')showNativeAnchorEditor(event,panel,n)
              }}
              onPointerDown={e => {
                if(tool2d==='point'&&e.shiftKey&&e.button===0){
                  e.preventDefault();e.stopPropagation()
                  toggleNativePoint(panel.id,n)
                  pick({panel:panel.id,anchor:n,edge:panel.polygon.edges[n]})
                  return
                }
                if(tool2d==='point'&&e.button===0&&multiEdit.panel===panel.id&&
                  multiEdit.points.length>=2&&multiEdit.points.includes(n)&&!busy){
                  const startPoint=point(e)
                  if(startPoint){
                    e.preventDefault();e.stopPropagation()
                    groupMoveDrag.current={panelId:panel.id,indices:[...multiEdit.points],
                      start:startPoint,rotation:panel.layout_rotation_degrees||0,pointerId:e.pointerId}
                    svg.current?.setPointerCapture(e.pointerId)
                  }
                  return
                }
                if(tool2d==='remove-anchor'){
                  e.preventDefault();e.stopPropagation()
                  if(!busy)void edit({kind:'RemovePoint',panel:panel.id,point:n})
                  return
                }
                if(tool2d==='curve'&&e.altKey){
                  e.stopPropagation();e.preventDefault()
                  if(!busy)void edit({kind:'CurvePoint',panel:panel.id,anchor:n,curved:false})
                  return
                }
                start(e,panel,n,tool2d==='anchor-point'?'convert-anchor':'move')
              }}/>
          })}
          {selected&&curveEditing&&handlePreview?.panelId===panel.id&&Number.isInteger(handlePreview.anchorIndex)&&
            (()=>{const polygon=handlePreview.polygon,index=handlePreview.anchorIndex
              const uv=polygon?.points?.[index]
              if(!uv)return null
              const p=previewPoint(transform(panel,range,uv),currentPreview)
              return <circle data-pattern-vertex-preview={`${panel.id}:${index}`}
                cx={p[0]} cy={p[1]} r={4*screenUnit} stroke="#7549a2" strokeWidth="1" vectorEffect="non-scaling-stroke"
                fill="#f6d77c" pointerEvents="none"/>
            })()}
          {/* Live native curve preview: dragging a VectorCraft-style handle
              changes the displayed contour immediately, without waiting for
              the next Rust triangulation. Measurements are in material cm. */}
          {selected&&mode==='edit'&&curveEditing&&
            handlePreview?.panelId===panel.id&&handlePreview.anchor?.startsWith('c:')&&
            handlePreview.polygon&&(()=>{
              const polygon=handlePreview.polygon
              const editedEdge=handlePreview.anchor.split(':')[1]
              const baseline=editingPolygon(panel)
              return <g data-native-cubic-preview={panel.id} pointerEvents="none">
                {Object.entries(polygon.curves||{})
                  .filter(([edge,controls])=>edge===editedEdge||
                    JSON.stringify(controls)!==JSON.stringify(baseline.curves?.[edge]))
                  .map(([edge,handles])=>{
                    const index=polygon.edges?.indexOf(edge)??-1
                    if(index<0||!Array.isArray(handles)||handles.length!==2)return null
                    const a=polygon.points[index],b=polygon.points[(index+1)%polygon.points.length]
                    if(![a,b,...handles].every(v=>Array.isArray(v)&&v.length===2&&v.every(Number.isFinite)))return null
                    const [start,c1,c2,end]=[a,handles[0],handles[1],b]
                      .map(uv=>previewPoint(transform(panel,range,uv),currentPreview))
                    const measured=cubicLength(a,handles[0],handles[1],b)
                    const originalControls=panel.polygon.curves?.[edge]
                    const originalLength=cubicLength(panel.polygon.points[index],
                      originalControls?.[0]||panel.polygon.points[index].map((v,i)=>v+(panel.polygon.points[(index+1)%panel.polygon.points.length][i]-v)/3),
                      originalControls?.[1]||panel.polygon.points[(index+1)%panel.polygon.points.length].map((v,i)=>v+(panel.polygon.points[index][i]-v)/3),
                      panel.polygon.points[(index+1)%panel.polygon.points.length])
                    const changedBy=measured-originalLength
                    const label=penInlineLabelPoint(start,end,screenUnit,{controls:[c1,c2],belowPixels:14})
                    return <g key={edge} data-preview-curve-edge={edge}>
                      <path data-active-bezier-contour={`${panel.id}:${edge}`}
                        d={`M ${start[0]} ${start[1]} C ${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${end[0]} ${end[1]}`}
                        fill="none" stroke={CLO_CURVE_ACTIVE_YELLOW} strokeWidth="2.25"
                        strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
                      {Number.isFinite(measured)&&label&&<text x={label.x} y={label.y}
                        data-native-cubic-length-cm={(measured*100).toFixed(3)}
                        data-native-cubic-length-delta-cm={Number.isFinite(changedBy)?(changedBy*100).toFixed(3):undefined}
                        data-clo-inline-length="curve-adjust" data-line-length-unit={penPrecision.unit}
                        {...cloInlineDimensionStyle}>
                        {formatPenDistancePrecise(measured,penPrecision.unit)}{Number.isFinite(changedBy)&&Math.abs(changedBy)>=.00005
                          ?`  (${changedBy>=0?'+':''}${formatPenDistancePrecise(changedBy,penPrecision.unit)})`:''}
                      </text>}
                    </g>
                  })}
              </g>
            })()}
          {/* Free curve points remain attached to their original named edge,
              independent of the topological corner points and Bézier handles. */}
          {mode==='edit'&&tool2d==='split'&&Object.values(panel.polygon?.free_curve_points||{})
            .flat().some(mark=>mark.mirror_group)&&(()=>{
              const groups=new Map()
              for(const [edge,marks] of Object.entries(panel.polygon.free_curve_points)){
                for(const mark of marks){
                  if(!mark.mirror_group||!Array.isArray(mark.position)||!mark.position.every(Number.isFinite))continue
                  const items=groups.get(mark.mirror_group)||[]
                  items.push({edge,mark})
                  groups.set(mark.mirror_group,items)
                }
              }
              return <g data-mirrored-split-pairs={panel.id} pointerEvents="none">
                {[...groups].filter(([,items])=>items.length===2&&items[0].edge!==items[1].edge).map(([group,items])=>{
                  const positions=items.map(({mark})=>previewPoint(transform(panel,range,mark.position),currentPreview))
                  return <line key={group} data-mirrored-split-pair={group}
                    data-mirrored-split-edges={items.map(item=>item.edge).join('|')}
                    x1={positions[0][0]} y1={positions[0][1]} x2={positions[1][0]} y2={positions[1][1]}
                    stroke={hoveredSplitMirrorGroup===group?'#a94a29':'#b3775e'}
                    strokeWidth={hoveredSplitMirrorGroup===group?1.1:.75} vectorEffect="non-scaling-stroke"
                    strokeDasharray="4 3" opacity={hoveredSplitMirrorGroup===group?1:.7}/>
                })}
              </g>
            })()}
          {mode==='edit'&&['point','curve','split'].includes(tool2d)&&Object.entries(
            handlePreview?.panelId===panel.id&&handlePreview.polygon?.free_curve_points
              ?handlePreview.polygon.free_curve_points:draftPolygon(panel)?.free_curve_points||{})
            .filter(([edge])=>tool2d==='split'||(selected&&selection?.edge===edge)||
              (selected&&handlePreview?.panelId===panel.id&&
                /^(f|ft):/.test(handlePreview.anchor||'')&&
                (handlePreview.anchor.split(':')[1]===edge||
                  (handlePreview.polygon?.free_curve_points?.[edge]||[]).some(mark=>
                    mark.mirror_group&&mark.mirror_group===
                    handlePreview.polygon?.free_curve_points?.[handlePreview.anchor.split(':')[1]]
                      ?.find(item=>item.id===handlePreview.anchor.split(':')[2])?.mirror_group))))
            .flatMap(([edge,marks])=>marks.map(mark=>{
              const shown=handlePreview?.panelId===panel.id&&handlePreview.polygon?.free_curve_points?.[edge]
                ?.find(candidate=>candidate.id===mark.id)?.position||mark.position
              if(!Array.isArray(shown)||shown.some(v=>!Number.isFinite(v)))return null
              const p=previewPoint(transform(panel,range,shown),currentPreview)
              const shownPolygon=handlePreview?.panelId===panel.id&&handlePreview.polygon||draftPolygon(panel)
              const shownMark=shownPolygon?.free_curve_points?.[edge]?.find(item=>item.id===mark.id)||mark
              const cubic=freeCurveBase(shownPolygon,edge)
              const derivative=shownMark.derivative|| (cubic&&cubicDerivativeAt(cubic,mark.t))
              const tangents=['in','out'].map(side=>{
                const vector=shownMark[`derivative_${side}`]||derivative
                const sign=side==='in'?-1:1
                const end=vector?.map((value,i)=>shown[i]+sign*value*.18)
                const point=end?.every(Number.isFinite)?previewPoint(transform(panel,range,end),currentPreview):null
                const key=`ft:${edge}:${mark.id}:${side}`
                const visual=point?visibleTangent(p,point,screenUnit,drag.current?.anchor===key?drag.current.controlScale:null):null
                return {side,point:visual?.point,scale:visual?.scale}
              })
              return <g key={`free:${edge}:${mark.id}`} data-control-point="free-curve"
                data-free-curve-point={`${panel.id}:${edge}:${mark.id}`}
                data-free-curve-mirrored={String(Boolean(mark.mirror_group))}
                data-free-curve-mirror-group={mark.mirror_group||undefined}
                data-mirrored-split-highlight={tool2d==='split'&&Boolean(mark.mirror_group)&&hoveredSplitMirrorGroup===mark.mirror_group?'true':'false'}
                data-free-curve-split-candidate={tool2d==='split'?'true':undefined}
                aria-label={tool2d==='split'
                  ?mark.mirror_group?'Split both mirrored boundaries at linked free curve points':'Split boundary at this free curve point'
                  :'Free curve point. Drag to reshape the cutline; Option-click to remove.'}
                style={{cursor:tool2d==='split'?'crosshair':'move'}}
                onPointerEnter={()=>{if(tool2d==='split')setHoveredSplitMirrorGroup(mark.mirror_group||null)}}
                onPointerLeave={()=>{if(tool2d==='split')setHoveredSplitMirrorGroup(null)}}
                onPointerDown={event=>{
                  event.stopPropagation()
                  if(tool2d==='split'){
                    event.preventDefault()
                    if(busy||event.button!==0)return
                    const distance=arclengthToFreeCurvePoint(panel.polygon,edge,mark.t)
                    if(distance){
                      pick({panel:panel.id,edge})
                      void edit({kind:'SplitBoundary',panel:panel.id,edge,at_m:distance.at_m})
                    }else setFreeCurveStatus('Unable to locate this point on the material cutline.')
                    return
                  }
                  if(event.altKey){
                    const polygon=removeNativeFreeCurvePoint(draftPolygon(panel),edge,mark.id)
                    if(polygon)void applyOrStagePatternCurve(panel,polygon,edge)
                    return
                  }
                  start(event,panel,`f:${edge}:${mark.id}`)
                }} onClick={event=>event.stopPropagation()}>
                <circle cx={p[0]} cy={p[1]} r={10*screenUnit}
                  fill="transparent" stroke="none" aria-hidden="true"/>
                {tool2d==='split'&&mark.mirror_group&&<circle cx={p[0]} cy={p[1]} r={7*screenUnit}
                  fill="none" stroke="#ae6a40" strokeWidth=".8" vectorEffect="non-scaling-stroke" strokeDasharray="2 2"
                  opacity={hoveredSplitMirrorGroup===mark.mirror_group?1:.8} pointerEvents="none" aria-hidden="true"/>}
                <circle cx={p[0]} cy={p[1]} r={3.5*screenUnit}
                  fill={tool2d==='split'&&mark.mirror_group?'#fce5ab':'#fceae0'}
                  stroke={mark.mirror_group&&hoveredSplitMirrorGroup===mark.mirror_group?'#a43924':'#d45632'}
                  strokeWidth={mark.mirror_group&&hoveredSplitMirrorGroup===mark.mirror_group?1.25:.9} vectorEffect="non-scaling-stroke" pointerEvents="none" aria-hidden="true"/>
                {curveEditing&&<g data-free-curve-tangent={`${panel.id}:${edge}:${mark.id}`}>
                  {tangents.filter(item=>item.point).map(({side,point:tangent,scale})=><g key={side}>
                    {/* A live tangent owns its own arm. Opposite arms remain
                        independently addressable and never both glow by hover. */}
                    <line x1={p[0]} y1={p[1]} x2={tangent[0]} y2={tangent[1]}
                      stroke={handlePreview?.anchor===`ft:${edge}:${mark.id}:${side}`?CLO_CURVE_ACTIVE_YELLOW:PATTERN_VISUAL.curveArm}
                      strokeWidth={handlePreview?.anchor===`ft:${edge}:${mark.id}:${side}`?2:PATTERN_METRICS.curveArm}
                      vectorEffect="non-scaling-stroke" pointerEvents="none"/>
                    <circle cx={tangent[0]} cy={tangent[1]} r={PATTERN_METRICS.curvePointRadius*screenUnit} data-control-scale={scale}
                      data-active-curve-handle={String(handlePreview?.anchor===`ft:${edge}:${mark.id}:${side}`)}
                      fill={handlePreview?.anchor===`ft:${edge}:${mark.id}:${side}`?'#fef08a':PATTERN_VISUAL.curveControlFill}
                      stroke={handlePreview?.anchor===`ft:${edge}:${mark.id}:${side}`?CLO_CURVE_ACTIVE_YELLOW:PATTERN_VISUAL.curveControlOutline}
                      strokeWidth="1.15" vectorEffect="non-scaling-stroke"
                      style={{cursor:'crosshair'}}
                      aria-label={`Drag ${side==='in'?'incoming':'outgoing'} curve tangent · Option breaks smooth link · Shift snaps to 45 degrees`}
                      data-free-curve-tangent-handle={`${panel.id}:${edge}:${mark.id}:${side}`}
                      onPointerDown={event=>{
                        event.stopPropagation()
                        start(event,panel,`ft:${edge}:${mark.id}:${side}`)
                      }}/>
                  </g>)}
                </g>}
              </g>
            }))}
          {selected&&mode==='edit'&&curveEditing&&
            handlePreview?.panelId===panel.id&&
            (handlePreview.anchor?.startsWith('f:')||handlePreview.anchor?.startsWith('ft:'))&&(()=>{
              const polygon=handlePreview.polygon
              const [,edge,anchorId]=handlePreview.anchor.split(':')
              if(!polygon?.free_curve_points?.[edge]?.length)return null
              const group=polygon.free_curve_points[edge]?.find(item=>item.id===anchorId)?.mirror_group
              const shownEdges=group?Object.entries(polygon.free_curve_points)
                .filter(([_,marks])=>marks.some(mark=>mark.mirror_group===group)).map(([edge])=>edge):[edge]
              return <g data-native-free-curve-preview={`${panel.id}:${edge}`} pointerEvents="none">
                {shownEdges.map(shownEdge=>{
                  const points=Array.from({length:97},(_,i)=>evaluateFreeCurve(polygon,shownEdge,i/96))
                    .filter(Boolean).map(uv=>previewPoint(transform(panel,range,uv),currentPreview))
                  if(points.length<2)return null
                  const length=points.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p[0]-points[i][0],p[1]-points[i][1]),0)
                  const midpoint=points[Math.floor(points.length/2)]
                  return <g key={shownEdge} data-preview-curve-edge={shownEdge}>
                    <polyline points={points.map(p=>p.join(',')).join(' ')} fill="none"
                      stroke={CLO_CURVE_ACTIVE_YELLOW} strokeWidth="2.25" vectorEffect="non-scaling-stroke"/>
                    <text x={midpoint[0]} y={midpoint[1]-12*screenUnit} textAnchor="middle"
                      fill="#46536b" stroke="#fff" strokeWidth={2*screenUnit} paintOrder="stroke"
                      fontSize={11*screenUnit} data-native-free-curve-length-cm={(length*100).toFixed(3)}>
                      {displayMeasurement(length)}
                    </text>
                  </g>
                })}
              </g>
            })()}
          {selected && mode === 'edit' && curveEditing &&
            Object.entries(handlePreview?.panelId===panel.id&&handlePreview.polygon?.curves
              ?handlePreview.polygon.curves:editingPolygon(panel)?.curves || {})
            .filter(([edge])=>Number.isInteger(selection?.anchor)
              ?[panel.polygon.edges[selection.anchor],panel.polygon.edges[(selection.anchor+panel.polygon.edges.length-1)%panel.polygon.edges.length]].includes(edge)
              :selection?.edge===edge||
                (handlePreview?.anchor?.startsWith('c:')&&
                  JSON.stringify(handlePreview.polygon?.curves?.[edge])!==JSON.stringify(panel.polygon.curves?.[edge])))
            .flatMap(([edge, controls]) => controls.map((uv, index) => {
            const edgeIndex=panel.polygon.edges.indexOf(edge)
            const vertex=(edgeIndex+index)%panel.polygon.points.length
            if(Number.isInteger(selection?.anchor)&&vertex!==selection.anchor)return null
            const moved=handlePreview?.panelId===panel.id?handlePreview.polygon?.curves?.[edge]?.[index]||uv:uv
            const original=handlePreview?.panelId===panel.id&&handlePreview.polygon?.points?.[vertex]||
              panel.polygon.points[vertex]
            if(!original)return null
            const anchor=previewPoint(transform(panel,range,original),currentPreview)
            const control=previewPoint(transform(panel,range,moved),currentPreview)
            const key=`c:${edge}:${index}`
            const activeHandle=handlePreview?.panelId===panel.id&&handlePreview.anchor===key
            const selectedEdgeHandle=selection?.edge===edge
            const shown=visibleTangent(anchor,control,screenUnit,drag.current?.anchor===key?drag.current.controlScale:null)
            const p=shown.point
            return <g key={`${edge}-${index}`} data-bezier-arm={`${panel.id}:${edge}:${index}`}>
              <line data-bezier-tangent-line="true" x1={anchor[0]} y1={anchor[1]} x2={p[0]} y2={p[1]}
                stroke={activeHandle||selectedEdgeHandle?CLO_CURVE_ACTIVE_YELLOW:PATTERN_VISUAL.curveArm}
                strokeWidth={activeHandle?2:PATTERN_METRICS.curveArm} vectorEffect="non-scaling-stroke" pointerEvents="none"/>
              <circle data-control-point="curve" data-curve-handle={`${panel.id}:${edge}:${index}`}
                data-active-curve-handle={String(Boolean(activeHandle))}
                data-control-scale={shown.scale} data-bezier-anchor-index={vertex}
                data-panel-id={panel.id} cx={p[0]} cy={p[1]} r={pointRadiusInView(PATTERN_METRICS.curvePointRadius,screenUnit)}
                fill={activeHandle?'#fef08a':PATTERN_VISUAL.curveControlFill}
                stroke={activeHandle||selectedEdgeHandle?CLO_CURVE_ACTIVE_YELLOW:PATTERN_VISUAL.curveControlOutline}
                strokeWidth={activeHandle?1.8:1.2} vectorEffect="non-scaling-stroke"
                style={{cursor:'default'}} aria-label={`${index===0?'Outgoing':'Incoming'} Bézier handle · Option to break tangent · Shift to snap`}
                onClick={e=>e.stopPropagation()}
                onPointerDown={e=>start(e,panel,key)}/>
            </g>
          }))}
        </g>
      })}
      {panels.map(({panel,range})=>{
        // Multi-panel sources can now be either independent editable EXO
        // sidecar point rules or read-only native affine proposals. Neither
        // source is committed to the Rust session or factory certified.
        const multi=nativeGradeRunsByPanel?.[panel.id]
        const proposal=multi?.ok?multi:
          nativeGradeProposal?.ok&&nativeGradeProposal.panelId===panel.id?nativeGradeProposal:null
        if(!proposal?.ok)return null
        if(nativeGradeVisibility?.allBlocks===false &&
          panel.id!==nativeGradeVisibility?.selectedPanelId)return null
        const multiRun=Boolean(multi?.ok)
        return <g key={panel.id}
          data-native-grade-proposal-accuracy={proposal.accuracy||'unknown'}
          data-native-proposal-only={String(proposal.source==='AFFINE_PROPOSAL_NOT_COMMITTED_GRADING')}
          data-native-grade-source={proposal.source||'SINGLE_PANEL_AFFINE_PREVIEW'}
          data-native-proposed-size-count={proposal.sizes.length}>
          <AccuMarkGradingOverlay20261023
            contrastPalette={adaptiveCad}
            panelId={panel.id}
            basePolygon={proposal.basePolygon}
            sizeRun={proposal.sizeRun}
            sizes={proposal.sizes}
            baseSize={proposal.baseSize}
            selectedSize={proposal.selectedSize}
            units="m" outputUnits="m"
            layout={range.layout} boardOffset={[0,0]}
            rotationDegrees={panel.layout_rotation_degrees||0}
            zoomUnit={screenUnit}
            showAllSizes={multiRun&&Boolean(nativeGradeVisibility?.showAllSizes)}
            visibleSizes={nativeGradeVisibility?.visibleSizes||null}
            colorsBySize={nativeGradeVisibility?.colorsBySize||null}
            stackPointIndex={nativeGradeVisibility?.stackPointIndex??null}
            showPointLabels={!multiRun||Boolean(nativeGradeVisibility?.showGradePoints)}
            showAllSizePoints={multiRun&&Boolean(nativeGradeVisibility?.showAllSizes)&&Boolean(nativeGradeVisibility?.showGradePoints)}
            showVectors={!multiRun||Boolean(nativeGradeVisibility?.showVectors)}
            onPickPoint={({panelId,size,pointIndex})=>{
              if(typeof size==='string')onPickGradeSize?.(size)
              if(!busy)pick({panel:panelId,anchor:pointIndex})
            }}/>
        </g>
      })}
      {sewingOverlayVisible && (s?.template?.seams || []).flatMap((spec, i) => {
        const seam=(s?.seams||[]).find(item=>item.id===spec.id)
        // A selected *piece* should not flood the board with hundreds of
        // cross-panel correspondence lines. Spotlight full seam structure
        // only when an actual colored boundary is hovered/selected.
        const chosen=editSewingActive&&selection?.seamId===spec.id
        const emphasized = chosen || (!!active?.edge && [spec.a, spec.b].some(b => b?.panel === active.panel && b.edge === active.edge))
        const color = SEAM_COLORS[i % SEAM_COLORS.length]
        const pairs=Array.isArray(seam?.guides)?seam.guides:[]
        // In normal sewing mode show the eligible cutline, not a net of
        // cross-garment threads. The correspondence is a contextual preview
        // of one hovered/selected seam; Edit Sewing can inspect the others.
        // CLO Edit Sewing displays selectable seam lines even before a pair
        // is selected. Keep only a sparse preview for those background pairs;
        // full correspondence detail remains limited to the selected seam.
        if (!emphasized && !editSewingActive) return []
        // Runtime guide weights are optional. When absent, derive a sparse
        // display-only correspondence from the two real named native edges.
        // This depicts the configured reverse_b orientation and never creates
        // seam topology or claims a solver-generated correspondence.
        const nativeSide=side=>{
          const indices=s?.panels?.find(panel=>panel.id===side?.panel)?.boundaries?.[side?.edge]
          if(!Array.isArray(indices)||indices.length<2||indices.some(index=>!boardUV[index]||
            boardUV[index].some(v=>!Number.isFinite(v))))return null
          const interval=side.range===undefined?[0,1]:side.range
          if(!Array.isArray(interval)||interval.length!==2||interval.some(v=>!Number.isFinite(v)||v<0||v>1))return null
          return {indices,interval}
        }
        const first=nativeSide(spec.a),second=nativeSide(spec.b)
        const sampled=pairs.length?samplePatternSewingGuideIndices(pairs.length,{emphasized}):
          first&&second?(emphasized?[0,.25,.5,.75,1]:[.25,.5,.75]):[]
        return sampled.flatMap(j => {
          const pair=pairs.length?pairs[j]:null
          const fraction=pairs.length?null:j
          const a=pair?weighted(pair[0],boardUV):boundaryMark(first.indices,first.interval[0]+fraction*(first.interval[1]-first.interval[0]))?.p
          const secondFraction=spec.reverse_b?1-fraction:fraction
          const b=pair?weighted(pair[1],boardUV):boundaryMark(second.indices,second.interval[0]+secondFraction*(second.interval[1]-second.interval[0]))?.p
          if (!a || !b) return []
          return <g key={`${spec.id}-${j}`} data-sewing-guide-index={j} data-guide-seam-id={spec.id} data-sewing-guide-source={pair?'native':'boundary-preview'}>
            <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={emphasized ? '#ef6339' : color}
              strokeWidth={emphasized?1:.65} vectorEffect="non-scaling-stroke" strokeDasharray="4 5" opacity={emphasized ? 1 : .42} pointerEvents="none"/>
            {editSewingActive&&<line data-edit-seam-guide={spec.id} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]}
              fill="none" stroke="transparent" strokeWidth="12" vectorEffect="non-scaling-stroke" pointerEvents="stroke"
              style={{cursor:SEWING_CURSOR}} onPointerDown={event=>event.stopPropagation()}
              onContextMenu={event=>{
                event.preventDefault()
                event.stopPropagation()
                if(!busy&&!sewingCommitting)onContextMenuRequest({
                  x:event.clientX,y:event.clientY,dimension:'2d',
                  hit:{seamId:spec.id,panel:spec.a.panel,edge:spec.a.edge},
                })
              }}
              onClick={event=>{event.stopPropagation();if(!busy&& !sewingCommitting)onSelectSewingSeam(spec.id)}}/>}
            {showSeamDots && <>
              <circle data-control-point="seam" cx={a[0]} cy={a[1]} r={(emphasized?2.5:1.9)*screenUnit} fill={color} stroke={POINT_COLORS.outline} strokeWidth=".7" vectorEffect="non-scaling-stroke" pointerEvents="none"/>
              <circle data-control-point="seam" cx={b[0]} cy={b[1]} r={(emphasized?2.5:1.9)*screenUnit} fill={color} stroke={POINT_COLORS.outline} strokeWidth=".7" vectorEffect="non-scaling-stroke" pointerEvents="none"/>
            </>}
          </g>
        })
      })}
      {walkSeamId&&(()=>{
        const seam=s?.template?.seams?.find(item=>item.id===walkSeamId)
        if(!seam)return null
        const clamped=Math.max(0,Math.min(1,walkFraction))
        const locations=[seam.a,seam.b].map((side,i)=>{
          const indices=s.panels?.find(panel=>panel.id===side.panel)?.boundaries?.[side.edge||side.side]
          const interval=Array.isArray(side.range)&&side.range.length===2?side.range:[0,1]
          const t=interval[0]+clamped*(interval[1]-interval[0])
          return indices?.length>1?boundaryMark(indices,t)?.p:null
        })
        if(locations.some(p=>!p))return null
        return <g data-native-walk-overlay={walkSeamId} pointerEvents="none">
          <line x1={locations[0][0]} y1={locations[0][1]} x2={locations[1][0]} y2={locations[1][1]} stroke="#b05b26" strokeWidth="1" vectorEffect="non-scaling-stroke" strokeDasharray="5 3"/>
          {locations.map((p,i)=><g key={i} data-native-walk-marker={i}>
            <circle cx={p[0]} cy={p[1]} r={4*screenUnit} fill={i?'#f1c874':'#49a8be'} stroke="#27313a" strokeWidth=".8" vectorEffect="non-scaling-stroke"/>
            <text x={p[0]} y={p[1]-9*screenUnit} fontSize={11*screenUnit} textAnchor="middle" fontWeight="700" fill="#27313a" paintOrder="stroke" stroke="#f4eee7" strokeWidth={2*screenUnit}>{i?'B':'A'}</text>
          </g>)}
        </g>
      })()}
      {parkedPenPaths.map(path=><g key={path.id} data-open-pen-path={path.id}>
        <path d={penCubicPath(path.points,path.tangents)} fill="none" stroke="#9db2cc"
          strokeWidth="1.45" strokeDasharray="7 3" vectorEffect="non-scaling-stroke" pointerEvents="none"/>
        {path.points.map((p,index)=><circle key={index} data-vector-pen-anchor={`${path.id}:${index}`}
          data-vector-pen-anchor-hit={index} data-parked-pen-path={path.id} data-parked-pen-anchor={index}
          cx={p[0]} cy={p[1]} r={Math.max(5*screenUnit,.004)}
          fill="#f6f1d9" stroke="#6689ab" strokeWidth="1.3" vectorEffect="non-scaling-stroke"
          pointerEvents={penSibling(tool2d)?'all':'none'}
          style={{cursor:'pointer'}} aria-label={`Open contour ${path.id}, anchor ${index+1}`}
          onPointerDown={e=>{
            if(e.button!==0||busy||!penSibling(tool2d))return
            e.preventDefault();e.stopPropagation()
            const restored=resumeParkedPath(path.id,index)
            if(!restored)return
            if(tool2d==='anchor-point'){
              const start=restored.points[restored.selected]
              vectorDrag.current={pointerId:e.pointerId,start,index:restored.selected,convert:true,moved:false,
                wasCurved:Math.hypot(...restored.tangents[restored.selected])>.001}
              svg.current?.setPointerCapture(e.pointerId)
            }else if(tool2d==='direct-select'){
              const start=restored.points[restored.selected]
              vectorDrag.current={pointerId:e.pointerId,start,pointerStart:point(e)||start,
                index:restored.selected,moveDraft:true}
              svg.current?.setPointerCapture(e.pointerId)
            }
          }}/>)}</g>)}
      {penDraftVisible&&draft.length>0&&<path data-vector-pen-preview="cubic" d={penCubicPath(draft,vectorTangents,penPreviewCursor)} fill="none" stroke="#6888bf" strokeWidth="1.2" vectorEffect="non-scaling-stroke" pointerEvents="none"/>}
      {tool2d==='split'&&hoveredAddAnchor?.p&&<g data-anchor-add-preview={hoveredAddAnchor.kind} pointerEvents="none">
        <circle cx={hoveredAddAnchor.p[0]} cy={hoveredAddAnchor.p[1]} r={7*screenUnit} fill="#ffcf53" fillOpacity=".25" stroke="#ffbe32" strokeWidth="2" vectorEffect="non-scaling-stroke"/>
        <path d={`M${hoveredAddAnchor.p[0]-4*screenUnit} ${hoveredAddAnchor.p[1]}h${8*screenUnit}M${hoveredAddAnchor.p[0]} ${hoveredAddAnchor.p[1]-4*screenUnit}v${8*screenUnit}`}
          stroke="#fff5bc" strokeWidth="1.6" vectorEffect="non-scaling-stroke"/>
      </g>}
      {tool2d==='split'&&draft.length>=2&&<path data-vector-draft-split-hit="true"
        d={penCubicPath(draft,vectorTangents)} fill="none" stroke="transparent"
        strokeWidth={Math.max(12*screenUnit,.007)} pointerEvents="stroke"
        style={{cursor:'crosshair'}} onPointerDown={e=>{
          e.preventDefault();e.stopPropagation()
          splitDraftAt(e)
        }}/>}
      {penDraftVisible&&showPenDimensions&&draft.length>0&&<g data-pen-draft-measurements="true" pointerEvents="none">
        {penSegments.map(segment=>{
          const label=penInlineLabelPoint(segment.midpoint,segment.midpoint,screenUnit)
          const adjusting=vectorDrag.current?.reshapeDraft&&vectorDrag.current.index===segment.index
          const baseline=adjusting?penDraftSegmentMetrics(vectorDrag.current.startPoints,
            vectorDrag.current.startTangents)[segment.index]?.length:null
          const change=baseline===null||baseline===undefined?null:segment.length-baseline
          return label&&<text key={segment.index} data-pen-edge-length={segment.index}
            data-pen-confirmed-length={segment.index===penSegments.length-1?'true':undefined}
            data-clo-inline-length="draft" data-line-length-unit={penPrecision.unit}
            data-pen-edge-length-metres={segment.length.toFixed(8)} x={label.x} y={label.y}
            {...cloInlineDimensionStyle}>
            {formatPenDistancePrecise(segment.length,penPrecision.unit)}{segment.curved?' arc':''}
            {change!==null&&Math.abs(change)>=.00005?` (${change>=0?'+':''}${formatPenDistancePrecise(change,penPrecision.unit)})`:''}
          </text>
        })}
        {draft.length>0&&penPreviewCursor&&Math.hypot(penPreviewCursor[0]-draft.at(-1)[0],penPreviewCursor[1]-draft.at(-1)[1])>.000001&&
          (()=>{const a=draft.at(-1),b=penPreviewCursor,label=penInlineLabelPoint(a,b,screenUnit)
            const length=Math.hypot(b[0]-a[0],b[1]-a[1])
            return label&&<text data-pen-live-length="true" data-pen-live-length-metres={length.toFixed(8)}
              data-clo-inline-length="live" data-line-length-unit={penPrecision.unit}
              x={label.x} y={label.y} {...cloInlineDimensionStyle}>
              {formatPenDistancePrecise(length,penPrecision.unit)}
              {' · '}{(Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI).toFixed(1)}°
            </text>
          })()}
      </g>}
      {tool2d==='vector-pencil'&&pencilSamples.length>=2&&(()=>{
        const at=pencilSamples.at(-1)
        const metres=pencilSamples.slice(1).reduce((sum,p,index)=>sum+
          Math.hypot(p[0]-pencilSamples[index][0],p[1]-pencilSamples[index][1]),0)
        const isMirror=Boolean(pencilMirrorPreview)
        return <text data-pencil-live-length="true" data-clo-inline-length="pencil"
          x={at[0]+10*screenUnit} y={at[1]+13*screenUnit}
          {...cloInlineDimensionStyle} textAnchor="start">
          {isMirror?'Mirrored outline ':''}{formatPenDistancePrecise(isMirror?metres*2:metres,penPrecision.unit)}
        </text>
      })()}
      {tool2d==='vector-pencil'&&pencilSamples.length<2&&completedPencilMeasure&&(()=>{
        const at=completedPencilMeasure.endpoint
        return <text data-pencil-committed-length="true"
          data-pencil-committed-length-metres={completedPencilMeasure.length.toFixed(8)}
          data-clo-inline-length="pencil-completed" data-line-length-unit={penPrecision.unit}
          x={at[0]+10*screenUnit} y={at[1]+13*screenUnit}
          {...cloInlineDimensionStyle} textAnchor="start">
          {completedPencilMeasure.mirror?'Mirrored outline':'Stroke'} {formatPenDistancePrecise(completedPencilMeasure.length,penPrecision.unit)}
        </text>
      })()}
      {pencilMirrorPreview&&<g data-pencil-mirror-live-preview="true" pointerEvents="none">
        <polygon points={pencilMirrorPreview.points.map(p=>p.join(',')).join(' ')}
          fill="#6eade4" fillOpacity=".16" stroke="#ffe6a3" strokeDasharray="5 3"
          strokeWidth="1.3" vectorEffect="non-scaling-stroke"/>
        <line x1={pencilMirrorPreview.axis[0][0]} y1={pencilMirrorPreview.axis[0][1]}
          x2={pencilMirrorPreview.axis[1][0]} y2={pencilMirrorPreview.axis[1][1]}
          stroke="#ffcc75" strokeDasharray="3 3" strokeWidth="1" vectorEffect="non-scaling-stroke"/>
      </g>}
      {tool2d==='shape-builder'&&shapeBuilderLineValid&&<g data-shape-builder-open-pen="true" pointerEvents="none">
        <polyline points={shapeBuilderLine.points.map(p=>p.join(',')).join(' ')}
          fill="none" stroke="#f2a644" strokeWidth="2.2" strokeDasharray="7 3"
          vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"/>
        {shapeBuilderLine.points.map((p,i)=><circle key={i} cx={p[0]} cy={p[1]}
          r={4*screenUnit} fill="#fff0c8" stroke="#d38118" strokeWidth="1.1" vectorEffect="non-scaling-stroke"/>)}
      </g>}
      {(tool2d!=='vector-pen'&&(draft.length > 0||pencilSamples.length>0)) && <polyline data-vector-draft={tool2d==='vector-pencil'?'pencil':'pattern'}
        points={(pencilSamples.length?pencilSamples:draft).map(p => p.join(',')).join(' ')}
        fill="none" stroke="#6888bf" strokeWidth="1.2" vectorEffect="non-scaling-stroke" pointerEvents="none"/>}
      {penDraftVisible&&draft.map((p,i)=>{const t=vectorTangents[i]||[0,0];return <g key={i} data-vector-pen-anchor={i}>
        <circle data-vector-pen-anchor-hit={i} role="button" aria-label={`Select drawing anchor ${i+1}`}
          cx={p[0]} cy={p[1]} r={Math.max(5*screenUnit,.004)} fill={vectorSelectedAnchor===i?'#ffe194':'#fff'} stroke="#6888bf" strokeWidth="1.5" vectorEffect="non-scaling-stroke"
          pointerEvents={tool2d!=='vector-pen'||vectorCurveMode||penPaused||temporaryShiftPen.current?'all':'none'}
          data-anchor-remove-target={tool2d==='remove-anchor'?'true':undefined}
          data-anchor-hovered={hoveredNativeAnchor===`draft:${i}`?'true':undefined}
          onPointerEnter={()=>setHoveredNativeAnchor(`draft:${i}`)}
          onPointerLeave={()=>setHoveredNativeAnchor(null)}
          style={{cursor:'pointer'}} onPointerDown={e=>{
            e.stopPropagation();e.preventDefault()
            if(tool2d==='vector-pen'&&penPaused){
              const resumed=resumePausedPenFromAnchor(draft,vectorTangents,i)
              if(resumed){
                setDraft(resumed.points);setVectorTangents(resumed.tangents)
                setVectorSelectedAnchor(resumed.selected);setPenPaused(false)
                setVectorCursor(null)
              }
              return
            }
            if(e.button!==0)return
            if(tool2d==='remove-anchor'){
              setDraft(old=>old.filter((_,n)=>n!==i))
              setVectorTangents(old=>old.filter((_,n)=>n!==i))
              setVectorSelectedAnchor(Math.max(0,i-1))
              return
            }
            if(tool2d==='split'){setVectorSelectedAnchor(i);return}
            if(tool2d==='direct-select'){
              setVectorSelectedAnchor(i)
              vectorDrag.current={index:i,start:p,pointerStart:point(e)||p,pointerId:e.pointerId,moveDraft:true}
              svg.current?.setPointerCapture(e.pointerId)
              return
            }
            if(tool2d==='anchor-point'){
              setVectorSelectedAnchor(i)
              // Illustrator Convert Anchor: pressing an already smooth point
              // immediately resets its handles; moving the same press pulls
              // out the new opposite pair. No pointerup target dependency.
              const wasCurved=Math.hypot(...t)>.001
              if(wasCurved)setVectorTangents(old=>old.map((v,index)=>index===i?[0,0]:v))
              vectorDrag.current={start:p,index:i,pointerId:e.pointerId,convert:true,moved:false,
                wasCurved}
              svg.current?.setPointerCapture(e.pointerId)
              return
            }
            // Closing on the first point remains an Illustrator Pen gesture.
            // Option-click lets you edit the starting anchor instead.
            if(i===0&&draft.length>=3&&!e.altKey&&!vectorCurveMode)finishDrawing()
            else setVectorSelectedAnchor(i)
          }}
          onDoubleClick={e=>{
            if(tool2d!=='direct-select'||busy)return
            e.stopPropagation();e.preventDefault()
            setVectorSelectedAnchor(i)
            showAnchorEditor(e,'draft',null,i)
          }}/>
        {Math.hypot(...t)>.001&&<><line x1={p[0]-t[0]} y1={p[1]-t[1]} x2={p[0]+t[0]} y2={p[1]+t[1]} stroke="#6888bf" strokeDasharray="4 3" strokeWidth="1" vectorEffect="non-scaling-stroke" pointerEvents="none"/>
          {[1,-1].map(side=><circle key={side} data-vector-pen-handle={`${i}:${side}`} role="button" aria-label={`${side>0?'Outgoing':'Incoming'} curve handle for drawing anchor ${i+1}`}
            cx={p[0]+side*t[0]} cy={p[1]+side*t[1]} r={4*screenUnit}
            fill="#fff" stroke="#6888bf" strokeWidth=".9" vectorEffect="non-scaling-stroke"
            pointerEvents={tool2d!=='vector-pen'||vectorCurveMode||temporaryShiftPen.current?'all':'none'}
            style={{cursor:'crosshair'}} onPointerDown={e=>{
              e.stopPropagation();e.preventDefault();setVectorSelectedAnchor(i);setVectorCurveMode(true)
              vectorDrag.current={start:p,index:i,pointerId:e.pointerId,handleSide:side}
              svg.current?.setPointerCapture(e.pointerId)
            }}/>)}</>}
      </g>})}
      {anchorEditVisual&&<g data-anchor-curve-popup="circle" data-anchor-circle-kind={anchorEditPopup.kind}
        data-anchor-circle-index={anchorEditPopup.index}>
        <circle cx={anchorEditVisual.anchor[0]} cy={anchorEditVisual.anchor[1]}
          r={4.5*screenUnit} fill="#ffdb87" stroke="#316fa8" strokeWidth="1.6"
          vectorEffect="non-scaling-stroke" pointerEvents="none"/>
        <line x1={anchorEditVisual.anchor[0]} y1={anchorEditVisual.anchor[1]}
          x2={anchorEditVisual.knob[0]} y2={anchorEditVisual.knob[1]}
          stroke="#338fe8" strokeDasharray="4 3" strokeWidth="1.4"
          vectorEffect="non-scaling-stroke" pointerEvents="none" data-anchor-circle-radius-guide="true"/>
        {anchorEditVisual.guidelines.map((p,i)=><g key={i} pointerEvents="none">
          <line x1={anchorEditVisual.anchor[0]} y1={anchorEditVisual.anchor[1]}
            x2={p[0]} y2={p[1]} stroke="#55a5ff" strokeDasharray="3 2"
            strokeWidth="1.3" vectorEffect="non-scaling-stroke" data-anchor-circle-tangent-guide={i}/>
          <circle cx={p[0]} cy={p[1]} r={3*screenUnit} fill="#f1fbff"
            stroke="#3585d4" strokeWidth="1.1" vectorEffect="non-scaling-stroke"/>
        </g>)}
        <circle cx={anchorEditVisual.knob[0]} cy={anchorEditVisual.knob[1]}
          r={7*screenUnit} role="slider" aria-label="Drag circular corner control to curve the selected anchor"
          aria-valuemin={0} aria-valuemax={100}
          aria-valuenow={Math.round(Math.min(100,Math.hypot(anchorEditVisual.knob[0]-anchorEditVisual.anchor[0],anchorEditVisual.knob[1]-anchorEditVisual.anchor[1])/Math.max(anchorEditVisual.geometry.minEdge,1e-8)*250))}
          data-anchor-curve-handle="true" fill="#e6f5ff" fillOpacity=".92" stroke="#238be1"
          strokeWidth="2.3" vectorEffect="non-scaling-stroke" pointerEvents="all"
          style={{cursor:'grab'}} onPointerDown={beginCornerDrag}/>
      </g>}
      {measuring && tape.map((p,i)=><circle key={i} data-tape-point={i} aria-label={`Measurement endpoint ${i+1}`} cx={p[0]} cy={p[1]} r={(editingTape?4:3)*screenUnit} fill="#fff" stroke="#166478" strokeWidth=".8" vectorEffect="non-scaling-stroke" pointerEvents={editingTape?'all':'none'} style={{cursor:editingTape?'move':'default'}} onPointerDown={e=>{
        if(!editingTape||busy)return
        e.stopPropagation();e.preventDefault()
        tapeDrag.current={index:i}
        svg.current?.setPointerCapture(e.pointerId)
      }}/>)}
      {boxSelectPreview&&mode==='edit'&&tool2d==='point'&&(()=>{
        const a=boxSelectPreview.start,b=boxSelectPreview.end
        return <rect data-clo-native-point-marquee="true"
          x={Math.min(a[0],b[0])} y={Math.min(a[1],b[1])}
          width={Math.abs(a[0]-b[0])} height={Math.abs(a[1]-b[1])}
          fill="#ffe363" fillOpacity=".12" stroke="#f9d82a"
          strokeWidth="1.4" strokeDasharray="5 3" vectorEffect="non-scaling-stroke"
          pointerEvents="none"/>
      })()}
      {patternMarquee&&mode==='edit'&&['select','shape-builder'].includes(tool2d)&&<rect
        data-2d-pattern-marquee="true"
        x={Math.min(patternMarquee.start[0],patternMarquee.end[0])}
        y={Math.min(patternMarquee.start[1],patternMarquee.end[1])}
        width={Math.abs(patternMarquee.start[0]-patternMarquee.end[0])}
        height={Math.abs(patternMarquee.start[1]-patternMarquee.end[1])}
        fill="#4caee8" fillOpacity=".1" stroke="#52b7e8" strokeWidth="1.2"
        strokeDasharray="5 3" vectorEffect="non-scaling-stroke" pointerEvents="none"/>}
      {measuring && tape.length===2 && <g data-tape-measurement="true" pointerEvents="none">
        <line x1={tape[0][0]} y1={tape[0][1]} x2={tape[1][0]} y2={tape[1][1]} stroke="#166478" strokeWidth="1" vectorEffect="non-scaling-stroke" strokeDasharray="5 3"/>
        <text x={(tape[0][0]+tape[1][0])/2} y={(tape[0][1]+tape[1][1])/2-10*screenUnit} textAnchor="middle" fontSize={11*screenUnit} fontWeight="500" fill="#37464d" stroke="#fff" strokeWidth={2*screenUnit} paintOrder="stroke">{displayMeasurement(Math.hypot(tape[1][0]-tape[0][0],tape[1][1]-tape[0][1]))}</text>
      </g>}
      {panels.flatMap(({panel,range})=>(panel.polygon?.measurements||[]).map(measurement=>{
        const a=boundaryMark(range.boundaries?.[measurement.a?.edge]||[],measurement.a?.t)?.p
        const b=boundaryMark(range.boundaries?.[measurement.b?.edge]||[],measurement.b?.t)?.p
        if(!a||!b)return null
        const isSelected=selectedPom?.panel===panel.id&&selectedPom?.id===measurement.id
        return <g key={`${panel.id}:${measurement.id}`} data-native-pom={measurement.id} data-native-pom-panel={panel.id} pointerEvents="none">
          <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={isSelected?'#f68c35':'#126c79'} strokeWidth={isSelected?1.2:.8} vectorEffect="non-scaling-stroke" strokeDasharray="5 3"/>
          {[a,b].map((p,i)=><circle key={i} cx={p[0]} cy={p[1]} r={2.5*screenUnit} fill="#fff" stroke="#126c79" strokeWidth=".8" vectorEffect="non-scaling-stroke"/>)}
          <text x={(a[0]+b[0])/2} y={(a[1]+b[1])/2-10*screenUnit} textAnchor="middle" fontSize={11*screenUnit} fill="#37464d" stroke="#fff" strokeWidth={2*screenUnit} paintOrder="stroke">{measurement.label}: {displayMeasurement(Math.hypot(b[0]-a[0],b[1]-a[1]))}</text>
        </g>
      }))}
      {gradingPOMPreview?.definition&&panels.map(({panel,range})=>{
        const definition=gradingPOMPreview.definition
        if(panel.id!==definition.panelId)return null
        const sized=gradingPOMPreview.byPanel?.[panel.id]?.sizeRun?.[gradingPOMPreview.size]?.polygon
        if(!sized)return null
        return <NativeGradingPOMOverlay20261025 key={definition.id}
          definition={definition} polygon={sized} panel={panel} range={range}
          size={gradingPOMPreview.size} screenUnit={screenUnit}/>
      })}
      {nativeConstructionPreview?.revision===s.revision&&panels.map(({panel,range})=>{
        if(panel.id!==nativeConstructionPreview.panelId||!Array.isArray(nativeConstructionPreview.position)||
          nativeConstructionPreview.position.length!==2||nativeConstructionPreview.position.some(v=>!Number.isFinite(v)))return null
        const destination=transform(panel,range,nativeConstructionPreview.position)
        const original=panel.polygon?.points?.[nativeConstructionPreview.pointIndex]
        if(!original)return null
        const start=transform(panel,range,original)
        return <g key={panel.id} data-native-construction-preview={panel.id} pointerEvents="none">
          <line x1={start[0]} y1={start[1]} x2={destination[0]} y2={destination[1]} stroke="#b86b22" strokeDasharray="5 4" strokeWidth="1.6" vectorEffect="non-scaling-stroke"/>
          <circle cx={destination[0]} cy={destination[1]} r={7*screenUnit} fill="#fff3cf" stroke="#b86b22" strokeWidth="1.8" vectorEffect="non-scaling-stroke"/>
          <path d={`M${destination[0]-10*screenUnit},${destination[1]}h${20*screenUnit}M${destination[0]},${destination[1]-10*screenUnit}v${20*screenUnit}`} stroke="#b86b22" strokeWidth="1.2" vectorEffect="non-scaling-stroke"/>
          <text x={destination[0]} y={destination[1]-13*screenUnit} fill="#52310a" fontWeight="700" stroke="white" strokeWidth={2*screenUnit} paintOrder="stroke" fontSize={11*screenUnit} textAnchor="middle">P{nativeConstructionPreview.pointIndex+1} proposal</text>
        </g>
      })}
      {nativeCurveStationPreview?.revision===s.revision&&panels.map(({panel,range})=>{
        if(panel.id!==nativeCurveStationPreview.panelId||!Array.isArray(nativeCurveStationPreview.position)||
          nativeCurveStationPreview.position.length!==2||nativeCurveStationPreview.position.some(v=>!Number.isFinite(v)))return null
        const p=transform(panel,range,nativeCurveStationPreview.position)
        return <g key={panel.id} data-native-curve-station-preview={panel.id} pointerEvents="none">
          <circle cx={p[0]} cy={p[1]} r={6*screenUnit} fill="#e6f6ff" stroke="#0789a5" strokeWidth="1.75" vectorEffect="non-scaling-stroke"/>
          <path d={`M${p[0]-9*screenUnit},${p[1]}h${18*screenUnit}M${p[0]},${p[1]-9*screenUnit}v${18*screenUnit}`} stroke="#0789a5" strokeWidth="1.2" vectorEffect="non-scaling-stroke"/>
          <text x={p[0]} y={p[1]-13*screenUnit} fill="#07546a" fontWeight="700" stroke="white" strokeWidth={2*screenUnit} paintOrder="stroke" fontSize={11*screenUnit} textAnchor="middle">Arc station · {nativeCurveStationPreview.edge}</text>
        </g>
      })}
      {nativeDartPrecisionPreview?.revision===s.revision&&panels.map(({panel,range})=>{
        if(panel.id!==nativeDartPrecisionPreview.panelId)return null
        const source=[nativeDartPrecisionPreview.left,nativeDartPrecisionPreview.apex,nativeDartPrecisionPreview.right]
        if(source.some(p=>!Array.isArray(p)||p.length!==2||p.some(v=>!Number.isFinite(v))))return null
        const p=source.map(uv=>transform(panel,range,uv))
        return <g key={panel.id} data-native-dart-precision-preview={panel.id} pointerEvents="none">
          <path d={`M${p[0][0]},${p[0][1]}L${p[1][0]},${p[1][1]}L${p[2][0]},${p[2][1]}`} fill="#c9676c" fillOpacity=".18" stroke="#ba2e4b" strokeWidth="2" strokeDasharray="6 3" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
          {p.map((pt,i)=><circle key={i} cx={pt[0]} cy={pt[1]} r={(i===1?6:4)*screenUnit} fill="#fff1ed" stroke="#ba2e4b" strokeWidth="1.4" vectorEffect="non-scaling-stroke"/>)}
          <text x={p[1][0]} y={p[1][1]-14*screenUnit} fontWeight="700" fontSize={11*screenUnit} textAnchor="middle" stroke="white" strokeWidth={2*screenUnit} paintOrder="stroke" fill="#9d2545">V-cut proposal · not sewn</text>
        </g>
      })}
      {nativePhysicalPleatPreview?.revision===s.revision&&panels.map(({panel,range})=>{
        if(panel.id!==nativePhysicalPleatPreview.panelId)return null
        const entries=nativePhysicalPleatPreview.preview
        if(!Array.isArray(entries)||entries.length>16)return null
        return <g key={panel.id} data-native-physical-pleat-board-preview={panel.id}
          pointerEvents="none">
          {entries.map((entry,index)=>{
            if(!Array.isArray(entry.legs)||entry.legs.length!==2||
              entry.legs.some(leg=>!Array.isArray(leg)||leg.length!==2||
                leg.some(p=>!Array.isArray(p)||p.length!==2||p.some(n=>!Number.isFinite(n)))))return null
            const [first,second]=entry.legs.map(([a,b])=>[
              transform(panel,range,a),transform(panel,range,b)])
            const label=[(first[0][0]+second[0][0])/2,
              (first[0][1]+second[0][1])/2]
            return <g key={index} data-physical-pleat-pair={index}>
              {[first,second].map(([a,b],n)=><line key={n}
                x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]}
                stroke="#087d8d" strokeWidth="2.5" strokeDasharray="5 3"
                vectorEffect="non-scaling-stroke"/>)}
              <line x1={first[0][0]} y1={first[0][1]}
                x2={second[0][0]} y2={second[0][1]}
                stroke="#d16b2c" strokeWidth="1.8" vectorEffect="non-scaling-stroke"/>
              <text x={label[0]} y={label[1]-(13+(index%2)*17)*screenUnit}
                fill="#07546a" stroke="white" strokeWidth={2*screenUnit}
                paintOrder="stroke" fontWeight="700" fontSize={10*screenUnit}
                textAnchor="middle">{nativePhysicalPleatPreview.intakeMm.toFixed(1)} mm · tuck {index+1}</text>
            </g>
          })}
        </g>
      })}
      {/* Draw active line dimensions LAST. Selected/hovered yellow cutlines and
          guide strokes must never paint over their own measurement readout. */}
      {!sewingActive&&panels.flatMap(({panel,range})=>{
        const edges=measuredNativeEdges(panel)
        if(!edges.length)return []
        const livePolygon=handlePreview?.panelId===panel.id&&handlePreview.polygon||
          pendingCurveCommit?.panelId===panel.id&&pendingCurveCommit.polygon||panel.polygon
        const rows=curveDraftDimensions(livePolygon)
        const baselineRows=livePolygon!==panel.polygon?curveDraftDimensions(panel.polygon):[]
        const currentPreview=preview?.panelId===panel.id||
          (preview?.kind==='move'&&preview?.groupIds?.includes(panel.id))?preview:null
        return edges.map(edge=>{
          const row=rows.find(item=>item.edge===edge)
          if(!row)return null
          const middle=previewPoint(transform(panel,range,row.midpoint),currentPreview)
          const label=penInlineLabelPoint(middle,middle,screenUnit)
          if(!label)return null
          const previous=baselineRows.find(item=>item.edge===edge)
          const change=previous?row.length-previous.length:null
          const minX=view[0]-offset[0]+48*screenUnit
          const maxX=view[0]-offset[0]+view[2]-48*screenUnit
          const x=minX<maxX?Math.max(minX,Math.min(maxX,label.x)):label.x
          const y=Math.max(view[1]-offset[1]+16*screenUnit,
            Math.min(view[1]-offset[1]+view[3]-8*screenUnit,label.y))
          return <text key={`${panel.id}:${edge}`} data-2d-boundary-readout={`${panel.id}:${edge}`}
            data-2d-readout-approx-cm={(row.length*100).toFixed(3)}
            data-clo-inline-length={selection?.panel===panel.id&&edges.includes(edge)?'selected':'hover'}
            data-line-length-unit={penPrecision.unit} data-2d-measure-top-layer="true"
            x={x} y={y} {...cloInlineDimensionStyle}>
            ≈ {formatPenDistancePrecise(row.length,penPrecision.unit)}
            {change!==null&&Math.abs(change)>=.00005
              ?` (${change>=0?'+':''}${formatPenDistancePrecise(change,penPrecision.unit)})`:''}
          </text>
        }).filter(Boolean)
      })}
      {(referenceModeActive||(!busy&&mode==='edit'&&['select','direct-select'].includes(tool2d)))&&<g transform="scale(.001)" data-reference-photo-edit-layer="true">
        <PatternReferencesSvgLayer20261025 references={patternReferences}
          onChange={onUpdatePatternReferences} rootUnitMm={1000}
          interactive={!busy&&['select','direct-select'].includes(tool2d)&&mode==='edit'}/>
      </g>}
      {!sewingActive&&(hoveredGuideId||selectedGuide?.points?.length===2)&&(()=>{
        const guide=hoveredGuideId&&hoveredGuideId===selectedGuide?.id?selectedGuide:
          hoveredGuideId&&hoveredGuideGeometry?.id===hoveredGuideId?hoveredGuideGeometry:
          hoveredGuideId?null:selectedGuide
        if(!guide?.points||guide.points.length!==2)return null
        const panel=panels.find(item=>item.panel.id===guide.panelId)?.panel
        const range=panels.find(item=>item.panel.id===guide.panelId)?.range
        let points=guide.pathPoints||guide.points
        let baseline=null
        if(['chest','belly'].includes(guide.kind)){
          const original=guideHalfCurves[guide.id]||[0,0]
          const updated=guideHalfCurveDraft?.id===guide.id?guideHalfCurveDraft.offset:original
          const angle=(panel?.layout_rotation_degrees||0)*Math.PI/180+
            (preview?.panelId===guide.panelId&&preview?.kind==='rotate'?preview.angle:0)
          points=sampleGuideHalfCurve(guide.points[0],guide.points[1],updated,angle)?.points||points
          if(guideHalfCurveDraft?.id===guide.id)
            baseline=sampledPenLineMetrics(sampleGuideHalfCurve(...guide.points,original,angle)?.points)?.length
        }else if(guide.nativeLineId&&panel&&range){
          const line=panel.polygon?.lines?.find(item=>item.id===guide.nativeLineId)
          const index=Number(guide.id.split(':').at(-1))
          if(line&&Number.isInteger(index)&&index>=0&&index<line.points.length-1){
            const tangent=i=>{
              const t=line.tangents?.[i]||[0,0]
              return handlePreview?.panelId===panel.id&&handlePreview.anchor===`l:${line.id}:${i}`
                ?t.map((v,j)=>v+(handlePreview.delta?.[j]||0)):t
            }
            points=sampleInternalCurve(line.points[index],line.points[index+1],
              tangent(index),tangent(index+1)).map(p=>previewPoint(transform(panel,range,p),
                preview?.panelId===panel.id?preview:null))
          }
        }
        const measured=sampledPenLineMetrics(points)
        if(!measured)return null
        const pos=penInlineLabelPoint(measured.midpoint,measured.midpoint,screenUnit)
        if(!pos)return null
        const change=baseline===null?null:measured.length-baseline
        const minX=view[0]-offset[0]+48*screenUnit,maxX=view[0]-offset[0]+view[2]-48*screenUnit
        return <text data-2d-guide-length={guide.id} data-clo-inline-length={hoveredGuideId===guide.id?'guide-hover':'guide-selected'}
          data-guide-length-metres={measured.length.toFixed(8)} data-line-length-unit={penPrecision.unit}
          x={minX<maxX?Math.max(minX,Math.min(maxX,pos.x)):pos.x}
          y={Math.max(view[1]-offset[1]+16*screenUnit,
            Math.min(view[1]-offset[1]+view[3]-8*screenUnit,pos.y))}
          {...cloInlineDimensionStyle}>
          {formatPenDistancePrecise(measured.length,penPrecision.unit)}
          {change!==null&&Math.abs(change)>=.00005
            ?` (${change>=0?'+':''}${formatPenDistancePrecise(change,penPrecision.unit)})`:''}
        </text>
      })()}
      </g>
      <PatternReferenceImageLayer image={reference.image} setImage={reference.setImage} unitsPerCm={.01}
        screenUnit={screenUnit}
        interactive={!busy && tool2d === 'select' && mode === 'edit'} handlesOnly/>
    </svg>
    {showRulers&&<CadViewportRulers20261023 svgRef={svg} view={view} worldToMetres={1} units={rulerUnits} green={accumarkGreen}
      markColor={adaptiveCad?.ruler||studioPreferences?.twoDRulerMarkColor} glassColor={studioPreferences?.twoDRulerGlassColor} glassOpacity={studioPreferences?.twoDRulerGlassOpacity} glow={studioPreferences?.twoDRulerGlow}/>}
  </div>
}
