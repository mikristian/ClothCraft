import React from 'react'
import {projectNativeGradedPOMOverlay20261025} from '../core/nativeGradingPOMOverlay20261025.js'

/** Highlight the currently selected six-size drafted POM over its true
 * proposed sized cutline. No native measurement or garment edit is performed.
 */
export default function NativeGradingPOMOverlay20261025({definition,polygon,panel,range,size='M',screenUnit=1}){
  const projected=projectNativeGradedPOMOverlay20261025(definition,polygon,panel,range,size)
  if(!projected.ok)return null
  const pts=projected.points
  const midpoint=pts[Math.floor(pts.length/2)]
  const stroke=projected.status==='pass'?'#287957':
    projected.status==='review'?'#ad4c36':'#b67929'
  const targetNote=projected.targetMm===null?'target unset':
    `target ${projected.targetMm.toFixed(1)} · Δ ${projected.deltaMm>=0?'+':''}${projected.deltaMm.toFixed(1)} mm`
  return <g data-2d-grading-pom={definition.id} data-grade-pom-size={size}
    data-grade-pom-provenance="draft-size-proposal" data-grade-pom-measured-mm={projected.actualMm.toFixed(3)}
    data-grade-pom-status={projected.status} data-grade-pom-target-mm={projected.targetMm??'unset'}
    pointerEvents="none">
    <polyline points={pts.map(p=>p.join(',')).join(' ')} fill="none" stroke="#fff" strokeWidth={5}
      strokeLinecap="round" strokeLinejoin="round" strokeOpacity=".86" vectorEffect="non-scaling-stroke"/>
    <polyline points={pts.map(p=>p.join(',')).join(' ')} fill="none" stroke={stroke} strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" strokeDasharray={definition.kind==='anchor-distance'?'6 3':undefined}
      vectorEffect="non-scaling-stroke"/>
    {[pts[0],pts.at(-1)].map((p,i)=><circle key={i} cx={p[0]} cy={p[1]}
      r={4.5*screenUnit} fill="#fff" stroke={stroke} strokeWidth={2} vectorEffect="non-scaling-stroke"/>)}
    <text x={midpoint[0]} y={midpoint[1]-18*screenUnit} textAnchor="middle"
      fontSize={11*screenUnit} fontWeight={650} fill="#6c3618"
      stroke="#fff" strokeWidth={3*screenUnit} paintOrder="stroke">
      {size} · {definition.label} · {projected.actualMm.toFixed(1)} mm · {targetNote} (draft)
    </text>
  </g>
}
