import React, {useMemo} from 'react'
import {buildAccuMarkGradingOverlayGeometry} from '../core/accumarkGradingOverlayGeometry20261023.js'

/**
 * Place inside the SAME SVG coordinate group as the native board's panel paths.
 * `sizeRun` must contain independently graded panel polygons as:
 * {XS:{panelId:'front',units:'m',polygon:{points:[[x,y],...],edges:[...]}},...}.
 * Pass the native board's `range.layout` and `offset` explicitly. For the
 * legacy PatternEditor, set units/outputUnits to 'cm', invertY:true and
 * layout:[piece.layout2d.x,piece.layout2d.y].
 * By default only the base and selected nest outlines are visible; expanding
 * all sizes, labels, and vectors is an explicit user control upstream.
 */
export default function AccuMarkGradingOverlay20261023({
  panelId,basePolygon,sizeRun,sizes,baseSize,selectedSize,units='m',
  outputUnits='m',layout=[0,0],boardOffset=[0,0],rotationDegrees=0,
  invertY=false,showAllSizes=false,showVectors=false,showPointLabels=false,
  zoomUnit=.001,visible=true,onPickPoint=null,showAllSizePoints=false,contrastPalette=null,
  visibleSizes=null,colorsBySize=null,stackPointIndex=null,
}) {
  const geometry=useMemo(()=>{
    if(!visible || !basePolygon || !sizeRun)return null
    try{return buildAccuMarkGradingOverlayGeometry({panelId,basePolygon,sizeRun,sizes,baseSize,
      selectedSize,units,outputUnits,layout,boardOffset,rotationDegrees,
      invertY,showAllSizes,showVectors,showPointLabels})}
    catch {return null}
  },[visible,panelId,basePolygon,sizeRun,sizes,baseSize,selectedSize,units,outputUnits,
    layout,boardOffset,rotationDegrees,invertY,showAllSizes,showVectors,showPointLabels])
  if(!geometry)return null
  const focused=geometry.selectedSize,base=geometry.baseSize
  const radius=Math.max(1e-7,zoomUnit*3.7)
  const fontSize=Math.max(1e-7,zoomUnit*11)
  // The board computes grade ink against the CANVAS; nested outlines can
  // cross a separate pattern-paper fill. A two-sided halo keeps either
  // foreground readable at both backgrounds without changing grade geometry.
  const gradePaper=contrastPalette?.patternPaper||'#f4f4f3'
  const gradeCanvas=contrastPalette?.background||'#c6c7c9'
  const gradeHalo=contrastPalette?.gradeHalo||'#fff'
  // Stack Point changes only the VIEW coordinate frame. The authentic graded
  // point vectors and source polygons stay untouched in the saved grade run.
  const stackBase=geometry.paths.find(path=>path.size===base)
  const stackShift=path=>{
    if(!Number.isInteger(stackPointIndex)||stackPointIndex<0||
      stackPointIndex>=path.points.length||!stackBase?.points?.[stackPointIndex])return undefined
    const delta=[0,1].map(i=>stackBase.points[stackPointIndex][i]-path.points[stackPointIndex][i])
    return `translate(${delta[0]} ${delta[1]})`
  }
  const onDarkPaper=(()=>{
    const rgb=/^#([\da-f]{6})$/i.exec(gradePaper)?.[1]
    if(!rgb)return false
    const channels=[0,2,4].map(i=>parseInt(rgb.slice(i,i+2),16)/255)
    const linear=channels.map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4)
    return linear[0]*.2126+linear[1]*.7152+linear[2]*.0722<.18
  })()
  const paperHalo=onDarkPaper?'#080f16':'#ffffff'
  const paperPointFill=onDarkPaper?'#f2f6fa':gradePaper
  return <g data-accumark-grade-overlay={panelId} data-grade-selected-size={focused}
    aria-label={`Grading overlay ${panelId}, base ${base}, selected ${focused}`}>
    {geometry.paths.filter(path=>path.visible&&(!visibleSizes||visibleSizes.includes(path.size))).map(path=>{
      const selected=path.size===focused,baseline=path.size===base
      const stroke=colorsBySize?.[path.size]||(selected?(contrastPalette?.gradeMain||'#c06d12'):baseline?(contrastPalette?.gradeBase||'#284f6c'):(contrastPalette?.gradeOther||'#6390a9'))
      return <g key={path.size} data-grade-size={path.size} data-grade-baseline={String(baseline)}
        data-grade-focused={String(selected)} data-grade-stack-point={stackPointIndex??undefined}
        transform={stackShift(path)} pointerEvents="none">
        <path d={path.localPath} transform={path.transform} fill="none" stroke={stroke}
          strokeWidth={selected?2.5:baseline?1.85:1.35} strokeOpacity={contrastPalette?1:selected?1:baseline?.9:.65}
          vectorEffect="non-scaling-stroke" strokeLinejoin="round"
          style={{filter:`drop-shadow(0 0 1px ${paperHalo}) drop-shadow(0 0 2px ${onDarkPaper?'#f4f6fa':'#111827'})`}}/>
        <text x={path.bounds.maxX+6*zoomUnit} y={path.bounds.minY-3*zoomUnit}
          fill={stroke} fontSize={fontSize} fontWeight={selected?700:500}
          stroke={paperHalo} strokeWidth={3*zoomUnit} paintOrder="stroke">{path.size}</text>
      </g>
    })}
    {stackPointIndex==null&&(!visibleSizes||visibleSizes.includes(focused))&&geometry.vectors.map(vector=><g key={vector.pointIndex} data-grade-vector={vector.pointIndex} pointerEvents="none">
      <line x1={vector.from[0]} y1={vector.from[1]} x2={vector.to[0]} y2={vector.to[1]}
        stroke={contrastPalette?.gradeMain||'#bf6b17'} strokeWidth="1.5" vectorEffect="non-scaling-stroke"/>
      <circle cx={vector.to[0]} cy={vector.to[1]} r={radius} fill={paperPointFill} stroke={contrastPalette?.gradeMain||'#bf6b17'}
        strokeWidth="1" vectorEffect="non-scaling-stroke"/>
      <text x={vector.to[0]+7*zoomUnit} y={vector.to[1]-6*zoomUnit} fontSize={fontSize}
        fill={contrastPalette?.gradeMain||'#835018'} stroke={gradeHalo} strokeWidth={2.5*zoomUnit} paintOrder="stroke">
        {`P${vector.pointIndex+1}: ΔX ${vector.deltaCm[0].toFixed(2)} ΔY ${vector.deltaCm[1].toFixed(2)} cm`}
      </text>
    </g>)}
    {showAllSizes&&showAllSizePoints&&geometry.paths.filter(path=>path.visible&&(!visibleSizes||visibleSizes.includes(path.size))).map(path=>
      <g key={path.size} data-graded-size-points={path.size} transform={stackShift(path)}>
        {path.points.slice(0,256).map((point,index)=>{
          const selectedPoint=path.size===focused
          const stroke=colorsBySize?.[path.size]||(selectedPoint?(contrastPalette?.gradeMain||'#c06d12'):path.size===base?(contrastPalette?.gradeBase||'#284f6c'):(contrastPalette?.gradeOther||'#6390a9'))
          return <g key={index} data-grade-size-point={`${panelId}:${path.size}:${index}`}>
            <circle cx={point[0]} cy={point[1]} r={selectedPoint?radius*1.3:radius*.98}
              fill={paperPointFill} stroke={stroke} strokeWidth=".85" pointerEvents="none" vectorEffect="non-scaling-stroke"/>
            {(selectedPoint||geometry.paths.length<=3)&&<text x={point[0]+radius*1.4}
              y={point[1]-radius} fill={stroke} fontSize={fontSize*.72} fontWeight="700"
              stroke={paperHalo} strokeWidth={2.5*zoomUnit} paintOrder="stroke"
              pointerEvents="none">{`P${index+1}`}</text>}
            {onPickPoint&&<circle cx={point[0]} cy={point[1]} r={Math.max(radius*2,zoomUnit*8)}
              fill="transparent" pointerEvents="all" tabIndex={0} role="button"
              aria-label={`Select ${panelId} graded point ${index+1}, size ${path.size}`}
              onClick={e=>{e.stopPropagation();onPickPoint({panelId,size:path.size,pointIndex:index})}}
              onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onPickPoint({panelId,size:path.size,pointIndex:index})}}}>
              <title>{`${panelId} · P${index+1} · ${path.size}`}</title>
            </circle>}
          </g>
        })}
      </g>
    )}
    {!showAllSizePoints&&(!visibleSizes||visibleSizes.includes(focused))&&geometry.points.map(({index,point})=><g key={index} data-grade-point={index}
      transform={stackShift(geometry.paths.find(p=>p.size===focused))}>
      <circle cx={point[0]} cy={point[1]} r={radius} fill={paperPointFill} stroke={contrastPalette?.gradeMain||'#c06d12'}
        strokeWidth="1" vectorEffect="non-scaling-stroke" pointerEvents="none"/>
      <text x={point[0]+5*zoomUnit} y={point[1]+12*zoomUnit} fill={contrastPalette?.gradeMain||'#70420d'}
        fontSize={fontSize} stroke={paperHalo} strokeWidth={2*zoomUnit} paintOrder="stroke"
        pointerEvents="none">{index+1}</text>
      {onPickPoint && <circle cx={point[0]} cy={point[1]} r={Math.max(radius,zoomUnit*10)}
        fill="transparent" pointerEvents="all" tabIndex={0} role="button"
        aria-label={`Select grade point ${index+1}, size ${focused}`}
        onClick={e=>{e.stopPropagation();onPickPoint({panelId,size:focused,pointIndex:index})}}
        onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onPickPoint({panelId,size:focused,pointIndex:index})}}}/>} 
    </g>)}
  </g>
}
