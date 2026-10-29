import {createFoamPaddingGeometry} from './foamPaddingGeometry.js'

const n=value=>Number(value.toFixed(4))
const escapeXml=value=>{
  const text=String(value??'')
  // XML 1.0 forbids control characters, lone surrogates and U+FFFE/U+FFFF.
  // Reject rather than silently changing manufacturing annotation text.
  for(const character of text){
    const cp=character.codePointAt(0)
    if(!(cp===9||cp===10||cp===13||(cp>=32&&cp<=0xD7FF)||(cp>=0xE000&&cp<=0xFFFD)||(cp>=0x10000&&cp<=0x10FFFF)))
      throw Error('Pad annotation contains invalid XML characters')
  }
  return text.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]))
}

/**
 * True-size foam cut outline and matching topstitch guidelines for a single
 * EXO pad. Dimensions are centimeters, not printer pixels. The exported
 * contours are construction references, without graded fit certification.
 */
export function exportFoamPaddingSvg(pad){
  const source=pad?.points
  if(!Array.isArray(source)||source.length<3||source.length>5000)throw Error('Pad has no valid closed outline')
  const xs=source.map(p=>Number(p.x)),ys=source.map(p=>Number(p.y))
  if([...xs,...ys].some(v=>!Number.isFinite(v)))throw Error('Pad outline includes invalid coordinates')
  const minX=Math.min(...xs),minY=Math.min(...ys),maxX=Math.max(...xs),maxY=Math.max(...ys)
  const w=maxX-minX,h=maxY-minY
  if(!(w>.01&&h>.01))throw Error('Pad outline has no printable area')
  const widthCm=Number(pad.widthCm),heightCm=Number(pad.heightCm)
  if(!Number.isFinite(widthCm)||!Number.isFinite(heightCm)||widthCm<=0||heightCm<=0||widthCm>120||heightCm>120)throw Error('Invalid physical pad dimensions')
  const sx=widthCm/w,sy=heightCm/h
  const points=source.map(p=>({x:(p.x-minX)*sx,y:(p.y-minY)*sy}))
  const geometry=createFoamPaddingGeometry({points,depthCm:Number(pad.depthCm),edgeWidthCm:Number(pad.edgeWidthCm)})
  if(!geometry.valid)throw Error(geometry.error.message)
  const margin=2
  const pageWidth=widthCm+2*margin,pageHeight=heightCm+2*margin
  const path=shape=>shape.map((p,i)=>`${i?'L':'M'}${n(p.x+margin)} ${n(pageHeight-p.y-margin)}`).join(' ')+' Z'
  const cut=path(geometry.cutPath)
  const stitch=geometry.stitchPaths.map(path).map((d,i)=>`<path d="${d}" fill="none" stroke="${i===0?'#057b93':'#a66522'}" stroke-width="0.045" stroke-dasharray="0.25 0.15"/>`).join('')
  const label=escapeXml(pad.name||'EXO Foam Padding')
  const info=escapeXml(`${pad.mode==='underlay'?'Underlay':'Outer + foam + backing'} / ${n(pad.depthCm)} cm foam depth`)
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${n(pageWidth)}cm" height="${n(pageHeight)}cm" viewBox="0 0 ${n(pageWidth)} ${n(pageHeight)}"><title>${label} | EXO foam cut and stitch guide</title><desc>Print 100% actual size. Sample cut and sewing guides; verify materials and construction with sample sewing before production. ${info}</desc><rect width="100%" height="100%" fill="#fff"/><g id="foam-cut-line"><path d="${cut}" fill="none" stroke="#171b22" stroke-width="0.06"/></g><g id="foam-stitch-guides">${stitch}</g><g id="calibration"><rect x="0.3" y="0.3" width="1" height="1" fill="none" stroke="#111" stroke-width="0.035"/><text x="1.45" y="0.9" font-family="sans-serif" font-size="0.25" fill="#111">10mm</text></g><text x="${n(pageWidth/2)}" y="${n(pageHeight-.25)}" text-anchor="middle" font-family="sans-serif" font-size="0.21" fill="#555">EXO CC0 PAD STUDY · CUTLINE BLACK · STITCH GUIDES BLUE/AMBER · NOT FACTORY CERTIFIED</text></svg>`
}
