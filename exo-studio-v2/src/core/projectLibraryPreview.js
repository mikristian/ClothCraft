// Real pattern silhouettes for offline file-library cards. The preview uses
// the saved garment's authored 2D coordinates, never a stock garment drawing.
const polygonFor = (piece, engine) => {
  const points = engine === 'native' ? piece?.polygon?.points : piece?.points
  if (!Array.isArray(points)) return null
  const xy = points.map(p => Array.isArray(p) ? p : [p?.x,p?.y]).map(([x,y])=>[Number(x),Number(y)])
  return xy.length >= 3 && xy.every(p=>p.every(Number.isFinite)) ? xy : null
}
export function projectPatternPreview(snapshot, engine = 'legacy') {
  const pieces = (engine === 'native' ? snapshot?.template?.panels : snapshot?.pieces) || []
  const polygons = pieces.map(piece=>polygonFor(piece,engine)).filter(Boolean)
  if (!polygons.length) return ''
  const minX=Math.min(...polygons.flatMap(p=>p.map(a=>a[0]))),maxX=Math.max(...polygons.flatMap(p=>p.map(a=>a[0])))
  const minY=Math.min(...polygons.flatMap(p=>p.map(a=>a[1]))),maxY=Math.max(...polygons.flatMap(p=>p.map(a=>a[1])))
  const spanX=Math.max(1e-6,maxX-minX),spanY=Math.max(1e-6,maxY-minY)
  const groups=polygons.slice(0,18),columns=Math.min(groups.length,4),rows=Math.ceil(groups.length/columns)
  const slotW=360/columns,slotH=192/rows
  const paths=groups.map((points,i)=>{
    const localX=Math.min(...points.map(p=>p[0])),localY=Math.min(...points.map(p=>p[1]))
    const rangeX=Math.max(1e-6,Math.max(...points.map(p=>p[0]))-localX)
    const rangeY=Math.max(1e-6,Math.max(...points.map(p=>p[1]))-localY)
    const factor=Math.min((slotW-25)/rangeX,(slotH-26)/rangeY)
    const x=12+(i%columns)*slotW+(slotW-rangeX*factor)/2
    const y=12+Math.floor(i/columns)*slotH+(slotH-rangeY*factor)/2
    const d=points.map(([px,py],j)=>`${j?'L':'M'}${(x+(px-localX)*factor).toFixed(2)} ${(y+(py-localY)*factor).toFixed(2)}`).join(' ')+' Z'
    return `<path d="${d}" fill="${['#73797f','#8b9095','#696f75','#a2a6aa'][i%4]}" fill-opacity=".88" stroke="#d0d3d5" stroke-width="1.3" stroke-linejoin="round"/>`
  }).join('')
  // Use data:image/svg+xml, never object URL, so the saved thumbnail remains
  // valid after a browser restart or an IndexedDB roundtrip.
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="360" height="216" viewBox="0 0 360 216"><rect width="360" height="216" fill="#222427"/><g opacity=".20" stroke="#afb2b6" stroke-width=".5"><path d="M0 54h360M0 108h360M0 162h360M90 0v216M180 0v216M270 0v216"/></g>${paths}</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export function captureVisibleCanvasPreview(root=document) {
  const selectors=['.cc-embedded-root .cc-scene canvas','.cc-embedded-root canvas','.three-mount canvas','.garment-viewport canvas']
  for (const selector of selectors) {
    const canvas=root.querySelector?.(selector)
    if (!canvas||canvas.width<100||canvas.height<100)continue
    try {
      const output=document.createElement('canvas')
      output.width=480;output.height=288
      const ctx=output.getContext('2d')
      if (!ctx)continue
      ctx.fillStyle='#262729';ctx.fillRect(0,0,output.width,output.height)
      const fit=Math.min(output.width/canvas.width,output.height/canvas.height)
      const width=canvas.width*fit,height=canvas.height*fit
      ctx.drawImage(canvas,(output.width-width)/2,(output.height-height)/2,width,height)
      const pixels=ctx.getImageData(30,30,output.width-60,output.height-60).data
      let changeCount=0,brightness=0
      for(let i=0;i<pixels.length;i+=120){brightness+=pixels[i]+pixels[i+1]+pixels[i+2];if(Math.abs(pixels[i]-38)+Math.abs(pixels[i+1]-39)+Math.abs(pixels[i+2]-41)>22)changeCount++}
      if(changeCount<20||brightness===0)continue
      return output.toDataURL('image/webp',.78)
    }catch{/* WebGL canvas or cross-origin materials may prohibit readback. */}
  }
  return ''
}
