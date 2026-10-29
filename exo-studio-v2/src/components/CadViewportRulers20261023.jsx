import React,{useEffect,useMemo,useState} from 'react'
import {calculateCadRuler20261023} from '../core/cadViewportRulers20261023.js'
import {cadColor20261023} from '../core/cadDotAppearance20261023.js'
import './CadViewportRulers20261023.css'

/** Fixed pixel-sized CAD rulers. SVG content uses xMidYMid meet, which can
 * letterbox significantly in split view; map physical coordinates through
 * that same camera transform but pin ruler chrome to the viewport's edges.
 */
export default function CadViewportRulers20261023({svgRef,view,worldToMetres=1,
  units='mm',green=false,topInsetPx=0,markColor='auto',glassColor='auto',glassOpacity=.1,glow=false}){
  const [size,setSize]=useState({width:0,height:0})
  useEffect(()=>{
    const svg=svgRef?.current
    if(!svg)return undefined
    const update=()=>{
      const rect=svg.getBoundingClientRect()
      if(rect.width>0&&rect.height>0)setSize({width:rect.width,height:rect.height})
    }
    update()
    if(typeof ResizeObserver==='undefined')return undefined
    const observer=new ResizeObserver(update)
    observer.observe(svg)
    return ()=>observer.disconnect()
  },[svgRef])

  const [x,y,width,height]=view
  const {horizontal,vertical,overlayHeight}=useMemo(()=>{
    const empty={horizontal:null,vertical:null,overlayHeight:0}
    if(![x,y,width,height,size.width,size.height,topInsetPx].every(Number.isFinite)||
      width<=0||height<=0||size.width<=0||size.height<=topInsetPx+20)return empty
    // SVG preserveAspectRatio=xMidYMid meet (the default in both editors).
    const scale=Math.min(size.width/width,size.height/height)
    if(!(scale>0))return empty
    const xMargin=(size.width-width*scale)/2
    const yMargin=(size.height-height*scale)/2
    const unitsPerPixel=1/scale
    const h=calculateCadRuler20261023({startWorld:x-xMargin/scale,
      spanWorld:size.width/scale,worldUnitsPerPixel:unitsPerPixel,worldToMetres,units})
    const v=calculateCadRuler20261023({startWorld:y+(topInsetPx-yMargin)/scale,
      spanWorld:(size.height-topInsetPx)/scale,worldUnitsPerPixel:unitsPerPixel,worldToMetres,units})
    return {horizontal:h,vertical:v,overlayHeight:size.height-topInsetPx}
  },[x,y,width,height,size.width,size.height,topInsetPx,worldToMetres,units])

  if(!horizontal?.ok||!vertical?.ok)return null
  const bar=25,left=38
  const stroke=cadColor20261023(markColor,green?'#d9f9de':'#34434d')
  const tint=cadColor20261023(glassColor,green?'#ffffff':'#ebf4ff')
  const alpha=Number.isFinite(glassOpacity)?Math.max(0,Math.min(.3,glassOpacity)):.1
  return <div className="cad-viewport-rulers" data-cad-rulers="true"
    aria-label={`2D horizontal and vertical measurement rulers in ${units}`}
    style={{position:'absolute',top:topInsetPx,left:0,right:0,bottom:0,pointerEvents:'none',zIndex:2}}>
    <svg viewBox={`0 0 ${size.width} ${overlayHeight}`} preserveAspectRatio="none"
      aria-hidden="true" style={{display:'block',width:'100%',height:'100%',pointerEvents:'none',background:'transparent',backdropFilter:'none',WebkitBackdropFilter:'none'}}>
      <g fontFamily="Arial, sans-serif" fontWeight="600" className={glow?'cad-ruler-illumination':undefined} style={{'--cad-ruler-glow':stroke}}>
        <defs><linearGradient id="cad-ruler-edge-sheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".24"/>
          <stop offset=".5" stopColor="#ffffff" stopOpacity=".045"/>
          <stop offset="1" stopColor="#ffffff" stopOpacity="0"/>
        </linearGradient></defs>
        <rect x="0" y="0" width={size.width} height={bar} fill={tint} opacity={alpha}/>
        <rect x="0" y="0" width={left} height={overlayHeight} fill={tint} opacity={alpha}/>
        <rect x="0" y="0" width={size.width} height={Math.min(5,bar)} fill="url(#cad-ruler-edge-sheen)"/>
        <rect x="0" y="0" width="2" height={overlayHeight} fill="#ffffff" opacity=".19"/>
        <path d={`M0 ${bar} H${size.width} M${left} 0 V${overlayHeight}`} fill="none" stroke={stroke} strokeWidth="1"/>
        {horizontal.ticks.map((tick,i)=>{
          const px=tick.positionPx
          if(px<left||px>size.width)return null
          return <g key={`x-${i}`}>
            <line x1={px} x2={px} y1={bar} y2={bar-(tick.major?9:4)} stroke={stroke} strokeWidth=".8"/>
            {tick.major&&<text x={px+3} y="11" fill={stroke} fontSize="10">{tick.label}</text>}
          </g>
        })}
        {vertical.ticks.map((tick,i)=>{
          const py=tick.positionPx
          if(py<bar||py>overlayHeight)return null
          return <g key={`y-${i}`}>
            <line x1={left} x2={left-(tick.major?9:4)} y1={py} y2={py} stroke={stroke} strokeWidth=".8"/>
            {tick.major&&<text x="3" y={py-3} fill={stroke} fontSize="10">{tick.label}</text>}
          </g>
        })}
        <rect x="0" y="0" width={left} height={bar} fill={tint} opacity={alpha}/>
        <text x="5" y="16" fill={stroke} fontSize="10">{units}</text>
      </g>
    </svg>
  </div>
}
