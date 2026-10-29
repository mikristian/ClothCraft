// Measured reference export, not an allowance/cutter-ready production pattern.
export function patternPrintReference(lines) {
  if(!Array.isArray(lines)||!lines.length)throw new Error('No pattern boundaries to print.')
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity
  for(const line of lines){
    if(!Array.isArray(line)||line.length<2)throw new Error('Print boundaries must have finite millimetre coordinates.')
    for(const p of line){
      // Array#every skips sparse slots and can be overridden by an imported
      // point. Validate both coordinates directly before constructing SVG.
      if(!Array.isArray(p)||p.length!==2||!Number.isFinite(p[0])||!Number.isFinite(p[1]))throw new Error('Print boundaries must have finite millimetre coordinates.')
      minX=Math.min(minX,p[0]);maxX=Math.max(maxX,p[0])
      minY=Math.min(minY,p[1]);maxY=Math.max(maxY,p[1])
    }
  }
  const width=Math.max(100,maxX-minX)+20,height=maxY-minY+150
  if(width>20000||height>20000)throw new Error('Reference sheet exceeds 20 m. Check pattern units.')
  const x=minX-10,y=minY-10,calY=maxY+20
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="${x} ${y} ${width} ${height}"><title>EXO measured pattern reference — print at 100%, not fit to page</title><desc>Material-space boundary reference only. Not a certified production cutline. No tiled page layout. Measure both sides of the 100 mm calibration square on paper before use.</desc><g fill="none" stroke="black" stroke-width="0.2">${lines.map(line=>`<polyline points="${line.map(p=>p.join(',')).join(' ')}"/>`).join('')}<rect data-print-calibration="100mm" x="${minX}" y="${calY}" width="100" height="100"/></g><text x="${minX}" y="${calY+108}" font-size="3">100 × 100 mm — measure on paper; print at actual size</text><text x="${minX}" y="${calY+114}" font-size="3">REFERENCE ONLY — allowances / factory approval not included</text></svg>`
  return {svg,widthMm:width,heightMm:height,calibrationMm:100}
}
