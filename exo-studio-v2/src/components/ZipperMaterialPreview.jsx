import React from 'react'
import './ZipperMaterialPreview.css'

// Schematic material preview for the selected EXO draft zipper. Measurements
// and part colors come from the same record used by the 3D zipper renderer.
const clamped=(value,fallback,min,max)=>Math.max(min,Math.min(max,Number.isFinite(Number(value))?Number(value):fallback))
const hex=(value,fallback)=>/^#[\da-fA-F]{6}$/.test(value||'')?value:fallback

export default function ZipperMaterialPreview({zipper}){
 if(!zipper)return null
 const chainWidth=clamped(zipper.chainWidthMm,5,2,20)
 const tapeWidth=clamped(zipper.tapeWidthMm,12,5,35)
 const sliderWidth=clamped(zipper.sliderWidthMm,chainWidth*1.38,3,45)
 const pullerWidth=clamped(zipper.pullerWidthMm,chainWidth*.84,2,35)
 const pullerLength=clamped(zipper.pullerLengthMm,chainWidth*2.7,5,70)
 const reflection=clamped(zipper.reflectionIntensity,1,0,3)
 const roughness=clamped(zipper.sliderRoughness,zipper.roughness??.27,0,1)
 const tapeColor=hex(zipper.tapeColor,'#363a42')
 const teethColor=hex(zipper.teethColor,'#bcc1c6')
 const sliderColor=hex(zipper.sliderColor,'#abb3bd')
 const pullerColor=hex(zipper.pullerColor,'#bec4ca')
 const stopperColor=hex(zipper.stopperColor,'#888e93')
 const tapePx=tapeWidth*1.5
 const chainPx=chainWidth*1.65
 const housingPx=sliderWidth*1.55
 const pullerPx=pullerWidth*1.55
 const highlight=Math.max(0,Math.min(.85,(1-roughness)*reflection*.35))
 const zipperLength=144
 const position=(1-clamped(zipper.sliderFraction,1,0,1))*(zipperLength-32)
 const glow=(color)=>`linear-gradient(125deg,rgba(255,255,255,${highlight.toFixed(3)}), transparent 56%, rgba(0,0,0,.3)),${color}`
 return <div className="exo-zipper-preview" role="img" aria-label="Zipper material preview"
   data-zipper-chain-width-mm={chainWidth} data-zipper-tape-width-mm={tapeWidth}
   data-zipper-slider-width-mm={sliderWidth}
   data-zipper-reflection={reflection} data-zipper-tape-color={tapeColor}>
   <div className="exo-zipper-preview-title"><strong>COMPONENT PREVIEW</strong><span>Appearance and proportions</span></div>
   <div className="exo-zipper-preview-stage">
     <div className="exo-zipper-preview-tape" style={{width:tapePx,backgroundColor:tapeColor}}/>
     <div className="exo-zipper-preview-chain" style={{width:chainPx,
       backgroundColor:teethColor,
       backgroundImage:'repeating-linear-gradient(0deg,rgba(0,0,0,.46) 0 2px,rgba(255,255,255,.42) 2px 4px,transparent 4px 6px)'}}/>
     <div className="exo-zipper-preview-tape" style={{width:tapePx,backgroundColor:tapeColor}}/>
     <div className="exo-zipper-preview-slider" style={{width:housingPx,top:position,background:glow(sliderColor)}}>
       <div className="exo-zipper-preview-puller" style={{
         width:pullerPx,height:Math.min(48,Math.max(15,pullerLength*1.2)),background:glow(pullerColor),
       }}><span/></div>
     </div>
     <div className="exo-zipper-preview-stop" style={{background:glow(stopperColor)}}/>
   </div>
   <div className="exo-zipper-preview-spec"><span>CHAIN {chainWidth.toFixed(1)} mm</span><span>TAPE {tapeWidth.toFixed(1)} mm / SIDE</span></div>
 </div>
}
