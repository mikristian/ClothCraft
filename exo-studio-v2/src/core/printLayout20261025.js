// Print-room planning geometry. The editor's original pattern source is immutable.
// Layout positions are session-only until a native nesting persistence schema exists.
const valid = p => Array.isArray(p) && p.length >= 3 && p.every(q => Number.isFinite(q?.[0]) && Number.isFinite(q?.[1]))
const sampledEdge = (a,b,handles) => {
  if (!Array.isArray(handles) || ![1,2].includes(handles.length) || !handles.every(p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite))) return [a]
  const pts=[]
  for(let k=0;k<12;k++) {
    const t=k/12,u=1-t
    pts.push(handles.length===1
      ?[u*u*a[0]+2*u*t*handles[0][0]+t*t*b[0],u*u*a[1]+2*u*t*handles[0][1]+t*t*b[1]]
      :[u**3*a[0]+3*u*u*t*handles[0][0]+3*u*t*t*handles[1][0]+t**3*b[0],
        u**3*a[1]+3*u*u*t*handles[0][1]+3*u*t*t*handles[1][1]+t**3*b[1]])
  }
  return pts
}
function outline(panel, native) {
  if(native) {
    const poly=panel?.polygon, vertices=poly?.points
    if(!valid(vertices))return null
    return vertices.flatMap((a,i)=>sampledEdge(a,vertices[(i+1)%vertices.length],poly.curves?.[poly.edges?.[i]]))
  }
  const points=panel?.points?.map(p=>[p?.x,p?.y])
  if(!valid(points))return null
  return points.flatMap((a,i)=>{
    const curve=panel.curves?.[i]
    return sampledEdge(a,points[(i+1)%points.length],curve?[[curve.cx,curve.cy]]:null)
  })
}
export function printPieces20261025(source,{native=false}={}) {
  const panels=native?(source?.template?.panels??source?.panels):source?.pieces
  if(!Array.isArray(panels))return []
  const scale=native?100:1
  return panels.flatMap((p,i)=>{
    const points=outline(p,native)
    if(!points)return []
    const scaled=points.map(q=>[q[0]*scale,q[1]*scale])
    const xs=scaled.map(p=>p[0]),ys=scaled.map(p=>p[1])
    const minX=Math.min(...xs),minY=Math.min(...ys)
    const widthCm=Math.max(...xs)-minX,heightCm=Math.max(...ys)-minY
    if(!Number.isFinite(widthCm)||!Number.isFinite(heightCm)||widthCm<.01||heightCm<.01)return []
    const local=scaled.map(q=>[q[0]-minX,q[1]-minY])
    const areaCm2=Math.abs(local.reduce((total,q,j)=>{const next=local[(j+1)%local.length];return total+q[0]*next[1]-q[1]*next[0]},0)/2)
    const id=String(p.id??`piece-${i}`)
    // Only explicit production quantities are expanded. Native panels already
    // represent individual physical pieces and must not be doubled implicitly.
    const rawCount=p.cutQuantity??p.cut_count??1
    const count=Number(rawCount)
    if(!Number.isSafeInteger(count)||count<1||count>100)return []
    return Array.from({length:count},(_,copy)=>({
      id:count===1?id:`${id}::cut-${copy+1}`,
      sourcePanelId:id,cutIndex:copy+1,cutQuantity:count,
      name:count===1?String(p.name||id):`${String(p.name||id)} (${copy+1}/${count})`,
      fabricId:String(p.fabric??p.fabricId??'main'),points:local,widthCm,heightCm,areaCm2,
      originCm:[minX,minY],
    }))
  })
}
/** Source-to-marker integrity only. Never implies sewing or factory approval. */
export function auditPrintSourceCompleteness20261025(source,{native=false}={}) {
  const issues=[]
  const template=native?(source?.template??source):source
  const panels=native?template?.panels:template?.pieces
  if(!Array.isArray(panels)||panels.length===0)return ['No source pattern panels available for print layout']
  const identifiers=new Set()
  const printable=new Set()
  for(let i=0;i<panels.length;i++) {
    const panel=panels[i]
    const id=String(panel?.id??`piece-${i}`)
    if(identifiers.has(id))issues.push(`Duplicate source panel ID: ${id}`)
    identifiers.add(id)
    const points=outline(panel,native)
    const copies=Number(panel?.cutQuantity??panel?.cut_count??1)
    if(!Number.isSafeInteger(copies)||copies<1||copies>100)issues.push(`${id}: invalid cut quantity`)
    if(!points||points.length<3||!points.every(q=>q.every(Number.isFinite))) {
      issues.push(`${id}: invalid source print geometry`)
      continue
    }
    const xs=points.map(q=>q[0]),ys=points.map(q=>q[1])
    const width=Math.max(...xs)-Math.min(...xs),height=Math.max(...ys)-Math.min(...ys)
    if(!Number.isFinite(width)||!Number.isFinite(height)||width<.0001||height<.0001) {
      issues.push(`${id}: invalid source print geometry`)
      continue
    }
    printable.add(id)
  }
  for(const seam of (Array.isArray(template?.seams)?template.seams:[])) {
    for(const side of [seam?.a,seam?.b]) {
      const id=side?.panel??side?.pieceId
      if(id!=null&&!identifiers.has(String(id)))issues.push(`${String(seam?.id??'Unnamed seam')}: missing sewn panel ${id}`)
      else if(id!=null&&!printable.has(String(id)))issues.push(`${String(seam?.id??'Unnamed seam')}: sewn panel ${id} has no printable geometry`)
    }
  }
  // Apply this rule only to explicitly named native T-shirt templates.
  const templateName=String(template?.name??'')
  if(native&&/\b(?:t[ -]?shirt|tee(?:\s*shirt)?)\b/i.test(templateName)) {
    const labels=panels.map(p=>`${p?.id??''} ${p?.name??''}`.toLowerCase())
    for(const part of ['front','back'])if(!labels.some(label=>new RegExp(`\\b${part}\\b`).test(label)))issues.push(`T-shirt source missing ${part} panel`)
  }
  return [...new Set(issues)]
}
/** Height of the current printable marker, including all dragged placements. */
export function computePrintRollLength20261025(pieces,placements={},gapCm=2,minLengthCm=25) {
  if(!Number.isFinite(gapCm)||gapCm<0||!Number.isFinite(minLengthCm)||minLengthCm<0)throw Error('Invalid marker bounds')
  let length=Math.max(0,minLengthCm)
  for(const piece of pieces||[]) {
    const position=placements?.[piece.id]
    if(!position)continue
    if(!Number.isFinite(position.y)||position.y<0||!Number.isFinite(piece.heightCm)||piece.heightCm<0)throw Error('Invalid marker placement')
    length=Math.max(length,position.y+piece.heightCm+gapCm)
  }
  return length
}
export function nestPrintPieces20261025(pieces,rollWidthCm,gapCm=2) {
  if(!Number.isFinite(rollWidthCm)||rollWidthCm<=0||!Number.isFinite(gapCm)||gapCm<0)throw Error('Invalid roll width or pattern spacing')
  let x=gapCm,y=gapCm,rowHeight=0
  const placements={},unplaced=[]
  for(const piece of pieces) {
    if(!Number.isFinite(piece.widthCm)||!Number.isFinite(piece.heightCm)||piece.widthCm<=0||piece.heightCm<=0||piece.widthCm+2*gapCm>rollWidthCm) {unplaced.push(piece.id);continue}
    if(x+piece.widthCm+gapCm>rollWidthCm+1e-9){x=gapCm;y+=rowHeight+gapCm;rowHeight=0}
    placements[piece.id]={x,y}
    x+=piece.widthCm+gapCm
    rowHeight=Math.max(rowHeight,piece.heightCm)
  }
  return {placements,unplaced,lengthCm:Math.max(20,y+rowHeight+gapCm)}
}
export function auditPrintLayout20261025(pieces,placements,widthCm) {
  const issues=[]
  const ready=pieces.filter(piece=>placements?.[piece.id])
  for(const p of ready){
    const xy=placements[p.id]
    if(!Number.isFinite(xy.x)||!Number.isFinite(xy.y)||xy.x<0||xy.y<0||xy.x+p.widthCm>widthCm+1e-7)issues.push(`${p.name}: outside fabric roll`)
  }
  for(let i=0;i<ready.length;i++)for(let j=i+1;j<ready.length;j++){
    const a=ready[i],b=ready[j],p=placements[a.id],q=placements[b.id]
    if(p.x<q.x+b.widthCm-1e-8&&p.x+a.widthCm>q.x+1e-8&&p.y<q.y+b.heightCm-1e-8&&p.y+a.heightCm>q.y+1e-8)issues.push(`${a.name} overlaps ${b.name} (bounding boxes)`)
  }
  for(const p of pieces)if(!placements?.[p.id])issues.push(`${p.name}: unplaced`)
  return issues
}

export const PRINT_PAPERS_20261025=Object.freeze({
  A4:[21,29.7],A3:[29.7,42],A2:[42,59.4],A1:[59.4,84.1],A0:[84.1,118.9],
  B5:[17.6,25],B4:[25,35.3],
  Letter:[21.59,27.94],Legal:[21.59,35.56],Tabloid:[27.94,43.18],
  '24-inch roll':[60.96,91.44], '36-inch roll':[91.44,121.92],
  '44-inch roll':[111.76,152.4],
})
const positive=(value,name)=>{const n=Number(value);if(!Number.isFinite(n)||n<=0||n>1000)throw Error(`Invalid ${name}`);return n}
const escapeXml=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;')
/** Coordinates in centimeters. Each tile maps to a real printer sheet, without rescaling to fit. */
export function planPrintPages20261025({widthCm,heightCm,paper='A4',orientation='portrait',customWidthCm=21,customHeightCm=29.7,marginCm=.5,scale=100,maxPages=300}={}) {
  const paperSize=paper==='Custom'?[positive(customWidthCm,'custom paper width'),positive(customHeightCm,'custom paper height')]:PRINT_PAPERS_20261025[paper]
  if(!paperSize)throw Error('Unsupported paper size')
  if(!['portrait','landscape'].includes(orientation))throw Error('Invalid orientation')
  const [sheetW,sheetH]=orientation==='landscape'?[paperSize[1],paperSize[0]]:paperSize
  const margin=Number(marginCm),ratio=Number(scale)/100
  if(!Number.isFinite(margin)||margin<0||margin>10||sheetW-2*margin<=0||sheetH-2*margin<=0)throw Error('Invalid printable margins')
  if(!Number.isFinite(ratio)||ratio<.1||ratio>2)throw Error('Print scale must be between 10% and 200%')
  const physicalWidth=positive(widthCm,'layout width')*ratio,physicalHeight=positive(heightCm,'layout height')*ratio
  const printableWidth=sheetW-2*margin,printableHeight=sheetH-2*margin
  const cols=Math.ceil((physicalWidth-1e-9)/printableWidth),rows=Math.ceil((physicalHeight-1e-9)/printableHeight)
  if(rows*cols>maxPages)throw Error(`Layout requires ${rows*cols} pages (limit ${maxPages}). Select larger paper or reduce the scale.`)
  return {paper,orientation,scale,ratio,marginCm:margin,sheetWidthCm:sheetW,sheetHeightCm:sheetH,printableWidthCm:printableWidth,printableHeightCm:printableHeight,physicalWidthCm:physicalWidth,physicalHeightCm:physicalHeight,rows,cols,pages:Array.from({length:rows*cols},(_,index)=>({number:index+1,row:Math.floor(index/cols),col:index%cols}))}
}

/** Every page has its own viewBox with centimeter-sized clipping and a 5 cm calibration guide. */
export function renderPrintPageSvg20261025({pieces,placements,plan,page,revision='current',fabricId=''}) {
  if(!plan?.pages?.some(p=>p.number===page?.number&&p.row===page.row&&p.col===page.col))throw Error('Invalid print page')
  const {sheetWidthCm:w,sheetHeightCm:h,marginCm:m,printableWidthCm:pw,printableHeightCm:ph,ratio}=plan
  const shiftX=m-page.col*pw,shiftY=m-page.row*ph
  const pieceLines=(pieces||[]).filter(p=>placements?.[p.id]).map(p=>{
    const pos=placements[p.id]
    if(!Number.isFinite(pos.x)||!Number.isFinite(pos.y)||!Array.isArray(p.points))return ''
    const points=p.points.map(q=>`${Number(q[0]).toFixed(5)},${Number(q[1]).toFixed(5)}`).join(' ')
    return `<polygon points="${points}" transform="translate(${pos.x} ${pos.y})" fill="none" stroke="#111" stroke-width="0.035" vector-effect="non-scaling-stroke"/>`
  }).join('')
  const guide=Math.min(5,pw*.65),markX=m+.2,markY=h-m-.28
  const tileMarks=plan.pages.length>1&&m>=.35?[ [m,m],[w-m,m],[m,h-m],[w-m,h-m] ]
    .map(([x,y])=>`M${x-.25},${y}h.5 M${x},${y-.25}v.5`).join(' '):''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}cm" height="${h}cm" viewBox="0 0 ${w} ${h}"><title>EXO print page ${page.number} of ${plan.pages.length}</title><desc>${escapeXml(fabricId)} ${escapeXml(revision)}, ${plan.scale}% scale. Print at actual size; disable printer fit-to-page.</desc><rect width="${w}" height="${h}" fill="white"/><defs><clipPath id="printable"><rect x="${m}" y="${m}" width="${pw}" height="${ph}"/></clipPath></defs><g clip-path="url(#printable)"><g transform="translate(${shiftX} ${shiftY}) scale(${ratio})">${pieceLines}</g></g>${tileMarks?`<path data-print-tile-registration="true" d="${tileMarks}" fill="none" stroke="#777" stroke-width=".018"/>`:''}<path d="M${markX} ${markY} h${guide}" stroke="#111" stroke-width="0.035"/><path d="M${markX} ${markY-.12}v.24 M${markX+guide} ${markY-.12}v.24" stroke="#111" stroke-width="0.035"/><text x="${markX}" y="${markY-.19}" font-size=".22" fill="#111">${guide.toFixed(2)} cm calibration</text><text x="${w-m-.12}" y="${h-m-.15}" font-size=".23" text-anchor="end" fill="#111">${escapeXml(fabricId)} · ${page.col+1}/${plan.cols} × ${page.row+1}/${plan.rows} · ${plan.scale}%</text></svg>`
}

const pdfNumber=n=>{if(!Number.isFinite(n)||Math.abs(n)>1e8)throw Error('Invalid PDF geometry');return (Math.round(n*100000)/100000).toString()}
const pdfLabel=value=>String(value).normalize('NFKD').replace(/[^\x20-\x7e]/g,'?').slice(0,120).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)')
const CM_TO_PT=72/2.54
/** Browser rasterization safety budget: one page, up to 24M RGBA pixels (96 MB backing store). */
export function printPngDimensions20261025(plan,dpi=300) {
  if(!plan||![150,300].includes(Number(dpi)))throw Error('PNG resolution must be 150 or 300 DPI')
  const width=Math.round(positive(plan.sheetWidthCm,'PNG paper width')/2.54*dpi)
  const height=Math.round(positive(plan.sheetHeightCm,'PNG paper height')/2.54*dpi)
  if(width>16000||height>16000||width*height>24000000)throw Error(`PNG ${width} × ${height} pixels exceeds 24 megapixel safety limit. Choose 150 DPI or smaller paper; resolution was not reduced.`)
  return {width,height,dpi,pixels:width*height,widthCm:plan.sheetWidthCm,heightCm:plan.sheetHeightCm}
}
/** Dependency-free, deterministic PDF 1.4 writer. All byte content is ASCII by construction. */
export function createPrintPdf20261025({pieces=[],placements={},plan,fabricId='',revision='current'}={}) {
  if(!plan?.pages?.length||plan.pages.length>300||!Number.isFinite(plan.sheetWidthCm)||!Number.isFinite(plan.sheetHeightCm))throw Error('Invalid PDF page plan')
  const objects=[null]
  const add=body=>{objects.push(body);return objects.length-1}
  const catalogId=add(''),pagesId=add(''),fontId=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  const pageIds=[]
  for(const page of plan.pages){
    const {sheetWidthCm:w,sheetHeightCm:h,marginCm:m,printableWidthCm:pw,printableHeightCm:ph,ratio}=plan
    if(!Number.isFinite(page.col)||!Number.isFinite(page.row)||!Number.isFinite(ratio)||ratio<=0)throw Error('Invalid PDF tile')
    const commands=['q',`${pdfNumber(CM_TO_PT)} 0 0 ${pdfNumber(-CM_TO_PT)} 0 ${pdfNumber(h*CM_TO_PT)} cm`,
      `${pdfNumber(m)} ${pdfNumber(m)} ${pdfNumber(pw)} ${pdfNumber(ph)} re W n`,
      'q',`${pdfNumber(ratio)} 0 0 ${pdfNumber(ratio)} ${pdfNumber(m-page.col*pw)} ${pdfNumber(m-page.row*ph)} cm`,'.035 w','0 G']
    for(const p of pieces){
      const pos=placements[p.id]
      if(!pos)continue
      if(!Number.isFinite(pos.x)||!Number.isFinite(pos.y)||!valid(p.points)||p.points.length>100000)throw Error('Invalid pattern geometry for PDF')
      commands.push('q',`1 0 0 1 ${pdfNumber(pos.x)} ${pdfNumber(pos.y)} cm`)
      for(let i=0;i<p.points.length;i++){
        const [x,y]=p.points[i]
        commands.push(`${pdfNumber(x)} ${pdfNumber(y)} ${i===0?'m':'l'}`)
      }
      commands.push('h S','Q')
    }
    commands.push('Q','Q')
    if(plan.pages.length>1&&m>=.35){
      commands.push('q',`${pdfNumber(CM_TO_PT)} 0 0 ${pdfNumber(-CM_TO_PT)} 0 ${pdfNumber(h*CM_TO_PT)} cm`,
        '.018 w','.45 G')
      for(const [cx,cy] of [[m,m],[w-m,m],[m,h-m],[w-m,h-m]]){
        commands.push(`${pdfNumber(cx-.25)} ${pdfNumber(cy)} m ${pdfNumber(cx+.25)} ${pdfNumber(cy)} l S`,
          `${pdfNumber(cx)} ${pdfNumber(cy-.25)} m ${pdfNumber(cx)} ${pdfNumber(cy+.25)} l S`)
      }
      commands.push('Q')
    }
    const guide=Math.min(5,pw*.65),gx=m+.2,gy=h-m-.28
    commands.push('q',`${pdfNumber(CM_TO_PT)} 0 0 ${pdfNumber(-CM_TO_PT)} 0 ${pdfNumber(h*CM_TO_PT)} cm`,'.035 w','0 G',`${pdfNumber(gx)} ${pdfNumber(gy)} m ${pdfNumber(gx+guide)} ${pdfNumber(gy)} l S`,`${pdfNumber(gx)} ${pdfNumber(gy-.12)} m ${pdfNumber(gx)} ${pdfNumber(gy+.12)} l S`,`${pdfNumber(gx+guide)} ${pdfNumber(gy-.12)} m ${pdfNumber(gx+guide)} ${pdfNumber(gy+.12)} l S`,'Q')
    const label=`${pdfLabel(fabricId)} | ${pdfLabel(revision)} | ${page.number}/${plan.pages.length} | ${plan.scale}% | ruler ${pdfNumber(guide)} cm`
    commands.push(`BT /F1 7 Tf ${pdfNumber((m+.2)*CM_TO_PT)} ${pdfNumber((m+.6)*CM_TO_PT)} Td (${label}) Tj ET`)
    const stream=commands.join('\n')+'\n'
    const contentId=add(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`)
    pageIds.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pdfNumber(w*CM_TO_PT)} ${pdfNumber(h*CM_TO_PT)}] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`))
  }
  objects[catalogId]=`<< /Type /Catalog /Pages ${pagesId} 0 R >>`
  objects[pagesId]=`<< /Type /Pages /Kids [${pageIds.map(id=>`${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`
  let output='%PDF-1.4\n%EXO\n'
  const offsets=[0]
  for(let i=1;i<objects.length;i++){offsets.push(output.length);output+=`${i} 0 obj\n${objects[i]}\nendobj\n`}
  const xref=output.length
  output+=`xref\n0 ${objects.length}\n0000000000 65535 f \n`
  for(const offset of offsets.slice(1))output+=`${String(offset).padStart(10,'0')} 00000 n \n`
  output+=`trailer\n<< /Size ${objects.length} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return new TextEncoder().encode(output)
}
