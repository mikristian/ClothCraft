import React,{useMemo} from 'react'
import {createPortal} from 'react-dom'
import {parseSeamlyAamaManufacturingSemantics} from '../core/seamlyAamaManufacturingSemantics20261023.mjs'

// Pure source geometry inspection inside the signed EXO V2 window.
// Never mutates the native Rust garment or infers factory acceptance.
export default function SeamlyAamaCutReview20261023({file,unit,onClose}) {
  const evaluated=useMemo(()=>{
    try{return {ok:true,result:parseSeamlyAamaManufacturingSemantics(file?.content,{unit,filename:file?.name})}}
    catch(error){return {ok:false,error:error?.message||'Invalid AAMA input'}}
  },[file,unit])
  const width=960,cellW=240,cellH=262
  const pieces=evaluated.ok?evaluated.result.pieces:[]
  const height=Math.max(280,Math.ceil(pieces.length/4)*cellH)
  return createPortal(<div role="dialog" aria-modal="true" aria-label="Seamly2D physical CUT source review"
    style={{position:'fixed',zIndex:100000,inset:0,background:'rgba(0,0,0,.78)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
    <div style={{background:'#131b22',border:'1px solid #546578',borderRadius:12,width:'min(1250px,95vw)',height:'min(870px,94vh)',padding:18,display:'flex',flexDirection:'column',color:'#f1f5f8'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:16}}>
        <div><strong>Seamly2D AAMA Physical CUT Inspection</strong>
          <div style={{fontSize:12,opacity:.76}}>Original engine · explicit {unit}/unit · read-only native V2 source reference · NOT production approved</div></div>
        <button type="button" onClick={onClose} aria-label="Close Seamly2D cut review" style={{padding:'8px 14px',borderRadius:6}}>CLOSE</button>
      </div>
      {evaluated.ok?
        <>
          <p style={{fontSize:12,margin:'8px 0'}}>Verified from original Seamly2D exporter: layer 1 = physical CUT; layer 8 = DRAW guide, not a certified sewing boundary; 4 = NOTCH; 7 = GRAIN; 11 = INTCUT. {pieces.length} source pieces. Sewing/grade approval remains pending.</p>
          <div style={{overflow:'auto',flex:1,minHeight:0,background:'#f7f7f6',borderRadius:8}}>
            <svg viewBox={`0 0 ${width} ${height}`} xmlns="http://www.w3.org/2000/svg" width="100%" role="img" aria-label="Real Seamly cut pattern pieces arranged as independent source references">
              {pieces.map((piece,index)=>{
                const p=piece.cutOutlineMm.points,x0=Math.min(...p.map(a=>a.x)),x1=Math.max(...p.map(a=>a.x)),y0=Math.min(...p.map(a=>a.y)),y1=Math.max(...p.map(a=>a.y))
                const scale=Math.min(204/Math.max(x1-x0,1),209/Math.max(y1-y0,1))
                const cx=index%4*cellW,cy=Math.floor(index/4)*cellH
                const project=point=>[cx+14+(point.x-x0)*scale,cy+35+(point.y-y0)*scale]
                const toPoints=pts=>pts.map(a=>project(a).map(x=>x.toFixed(3)).join(',')).join(' ')
                return <g key={index}>
                  <rect x={cx+4} y={cy+4} width={232} height={254} rx={5} fill="#ffffff" stroke="#ced6dd"/>
                  <text x={cx+12} y={cy+20} fontSize="12" fill="#253646">{piece.name.slice(0,26)}</text>
                  <polygon points={toPoints(p)} stroke="#195fa9" strokeWidth="1.25" fill="rgba(51,111,185,.12)"/>
                  {piece.sewingContourMm&&<polygon points={toPoints(piece.sewingContourMm.points)} stroke="#a7587e" strokeDasharray="4 3" strokeWidth=".8" fill="none"/>}
                  {piece.notches.map((mark,j)=><polyline key={'n'+j} points={toPoints(mark.points)} stroke="#d02f28" strokeWidth="1.6" fill="none"/>)}
                  {piece.internalCuts.map((mark,j)=><polyline key={'i'+j} points={toPoints(mark.points)} stroke="#cc6e16" strokeWidth="1.2" fill="none"/>)}
                  {piece.grainline&&<polyline points={toPoints(piece.grainline.points)} stroke="#338354" strokeDasharray="3 3" strokeWidth="1.3" fill="none"/>}
                  <text x={cx+12} y={cy+248} fontSize="10" fill="#4b5a68">CUT · {p.length} points · {(x1-x0).toFixed(0)}×{(y1-y0).toFixed(0)} mm</text>
                </g>
              })}
            </svg>
          </div>
          <p style={{fontSize:12,margin:'9px 0 0',opacity:.8}}>Blue solid: upstream physical CUT. Magenta dashed: source DRAW contour (candidate construction guide, NOT verified sewline). Red: notch. Orange: internal cut. Green: grain. Individual pieces are arranged for inspection, not a print-to-scale layout. Original CAD DXF remains unchanged.</p>
        </>:
        <p role="alert" style={{color:'#ff8b87'}}>AAMA source review refused: {evaluated.error}</p>}
    </div>
  </div>,document.body)
}
