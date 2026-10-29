import {patternPrintReference} from './patternPrintReference.js'
const FORMATS={A4:[210,297],Letter:[215.9,279.4]}
export function patternTiledPrint(lines,options={}){
 const reference=patternPrintReference(lines)
 let minX=Infinity,minY=Infinity
 for(const line of lines)for(const [x,y] of line){minX=Math.min(minX,x);minY=Math.min(minY,y)}
 return paginate(reference,minX-10,minY-10,options)
}
export function nativeCutlineTiledPrint(panel,revision,format='A4'){
 if(!panel?.ok||panel.units!=='mm'||!panel.svg)throw new Error('A valid native metric cutline proof is required.')
 const doc=new DOMParser().parseFromString(panel.svg,'image/svg+xml'),root=doc.documentElement
 if(root.localName!=='svg'||doc.querySelector('parsererror'))throw new Error('Invalid native proof SVG.')
 const tags=new Set(['svg','g','path','polyline','polygon','line','rect','text','title','desc'])
 const attributes=new Set(['xmlns','width','height','viewBox','d','points','fill','stroke','stroke-width','stroke-dasharray','stroke-linecap','stroke-linejoin','x','y','x1','y1','x2','y2','font-size','text-anchor','data-pattern-role'])
 for(const node of [root,...root.querySelectorAll('*')]){
  if(!tags.has(node.localName))throw new Error('Unsupported element in native proof.')
  for(const attr of [...node.attributes])if(!attributes.has(attr.name)||/url\s*\(|javascript:/i.test(attr.value))throw new Error('Unsupported attribute in native proof.')
 }
 const view=root.getAttribute('viewBox')?.trim().split(/\s+/).map(Number)
 if(view?.length!==4||!view.every(Number.isFinite)||view[2]<=0||view[3]<=0)throw new Error('Invalid proof dimensions.')
 for(const [name,index] of [['width',2],['height',3]]){
  const value=root.getAttribute(name)
  if(!/^[0-9.]+mm$/.test(value||'')||Math.abs(parseFloat(value)-view[index])>1e-5)throw new Error('Native proof is not 1:1 millimetres.')
 }
 const serialize=new XMLSerializer()
 const geometry=[...root.children].filter(node=>!['title','desc'].includes(node.localName)).map(node=>serialize.serializeToString(node)).join('')
 return paginate({widthMm:view[2],heightMm:view[3],geometry},view[0],view[1],{format,revision,engineering:true})
}
function paginate(reference,minX,minY,{format='A4',marginMm=10,overlapMm=10,revision=null,engineering=false}={}){
 if(!FORMATS[format])throw new Error('Choose A4 or Letter paper.')
 if(!Number.isFinite(marginMm)||marginMm<5||marginMm>25)throw new Error('Print margins must be 5–25 mm.')
 if(!Number.isFinite(overlapMm)||overlapMm<5||overlapMm>25)throw new Error('Tile overlap must be 5–25 mm.')
 const [pageWidth,pageHeight]=FORMATS[format]
 const width=pageWidth-2*marginMm,height=pageHeight-2*marginMm-10
 const stepX=width-overlapMm,stepY=height-overlapMm
 const columns=Math.max(1,1+Math.ceil((reference.widthMm-width)/stepX)),rows=Math.max(1,1+Math.ceil((reference.heightMm-height)/stepY))
 if(columns*rows>200)throw new Error('This reference needs more than 200 tiles. Print fewer patterns or use a plotter.')
 const geometry=reference.geometry||reference.svg.slice(reference.svg.indexOf('<g '),reference.svg.lastIndexOf('</svg>'))
 const sourceRevision=Number.isSafeInteger(revision)?String(revision):'unrecorded'
 const tiles=Array.from({length:rows*columns},(_,i)=>{
  const row=Math.floor(i/columns),column=i%columns,x=minX+column*stepX,y=minY+row*stepY
  const crosses=[[overlapMm/2,overlapMm/2],[width-overlapMm/2,overlapMm/2],[overlapMm/2,height-overlapMm/2],[width-overlapMm/2,height-overlapMm/2]].map(([a,b])=>`<path d="M ${a-2} ${b} h 4 M ${a} ${b-2} v 4"/>`).join('')
  return {row:row+1,column:column+1,x,y,width,height,html:`<section class="page tile" data-row="${row+1}" data-column="${column+1}"><svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="${x} ${y} ${width} ${height}">${geometry}</svg><svg class="registration" xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}"><g fill="none" stroke="#555" stroke-width="0.15" stroke-dasharray="1 1"><rect x="${overlapMm/2}" y="${overlapMm/2}" width="${width-overlapMm}" height="${height-overlapMm}"/></g><g stroke="black" stroke-width="0.2">${crosses}</g></svg><footer>R${row+1} C${column+1} · tile ${i+1}/${rows*columns} · ${format} · ${overlapMm} mm overlap · revision ${sourceRevision}<br/>ACTUAL SIZE / 100% · ${engineering?'engineering cutline proof':'reference boundary'} — not factory approved</footer></section>`}
 })
 const map=rows*columns>40?`Layout: ${rows} rows, ${columns} columns. Read left to right, then top to bottom. Each tile is labelled with its row and column.`:Array.from({length:rows},(_,r)=>`<div>${Array.from({length:columns},(_,c)=>`<span>R${r+1} C${c+1}</span>`).join(' ')}</div>`).join('')
 const html=`<!doctype html><html><head><meta charset="utf-8"><title>EXO tiled pattern reference</title><style>@page{size:${pageWidth}mm ${pageHeight}mm;margin:0}*{box-sizing:border-box}body{margin:0;font:10pt sans-serif;color:#111}.page{width:${pageWidth}mm;height:${pageHeight}mm;padding:${marginMm}mm;position:relative;break-after:page;overflow:hidden}.page:last-child{break-after:auto}.page>svg{display:block}.registration{position:absolute;left:${marginMm}mm;top:${marginMm}mm;pointer-events:none}footer{font-size:8pt;line-height:1.3;margin-top:2mm}.map{font-size:7pt}.map span{display:inline-block;border:1px solid #888;padding:1mm;margin:0.5mm}h1{font-size:16pt}p{max-width:170mm}@media screen{body{background:#ddd}.page{background:white;margin:10px auto;box-shadow:0 1px 8px #999}}</style></head><body><section class="page calibration"><h1>EXO pattern reference — calibration first</h1><p>${format}; ${rows} rows × ${columns} columns; ${overlapMm} mm overlap. Source revision ${sourceRevision}. Print at 100% / Actual size. Turn off Fit to page and browser headers/footers. Match page labels and overlapping pattern geometry before joining sheets.</p><svg xmlns="http://www.w3.org/2000/svg" width="110mm" height="110mm" viewBox="0 0 110 110"><rect x="5" y="5" width="100" height="100" fill="none" stroke="black" stroke-width="0.2"/><text x="10" y="55" font-size="5">100 × 100 mm</text></svg><p>Measure both axes before using the sheet. ${engineering?'This export preserves the native cut/stitch contours, notch marks, labels and POM annotations. It is an engineering proof, not factory approved.':'This export contains reference boundaries, not seam allowances or a certified cutting layout.'}</p><div class="map">${map}</div></section>${tiles.map(t=>t.html).join('')}</body></html>`
 return {html,format,pageWidth,pageHeight,marginMm,overlapMm,rows,columns,pageCount:tiles.length+1,tiles:tiles.map(({html,...tile})=>tile),sourceRevision}
}
