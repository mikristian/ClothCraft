import React,{useEffect,useMemo,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import {auditPrintLayout20261025,auditPrintSourceCompleteness20261025,nestPrintPieces20261025,printPieces20261025,computePrintRollLength20261025,PRINT_PAPERS_20261025,planPrintPages20261025,renderPrintPageSvg20261025,createPrintPdf20261025,printPngDimensions20261025} from '../core/printLayout20261025.js'
import {fitCompletePrintBoard20261025} from '../core/printPaperBoardView20261025.js'
import {PATTERN_VISUAL,patternCutlinePresentation} from '../core/patternVisualTokens.js'
import {buildPrintPatternAppearance20261025} from '../core/printPatternAppearance20261025.js'
import {printPatternGuideOverlay20261025} from '../core/printPatternGuideOverlay20261025.js'
import './PrintLayoutStudio.css'

const xml = value => String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
const path = points => points.map((point,i)=>`${i?'L':'M'}${point[0].toFixed(4)} ${point[1].toFixed(4)}`).join(' ')+' Z'
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n))
const ALL_PIECES='__all__'

export default function PrintLayoutStudio({source,native=false,graphics=[],revision='current',onClose,embedded=false}) {
  const pieces=useMemo(()=>printPieces20261025(source,{native}),[source,native])
  const fabricIds=useMemo(()=>[...new Set(pieces.map(p=>p.fabricId))],[pieces])
  const sourcePanels=native?(source?.template?.panels||source?.panels||[]):(source?.pieces||[])
  const coveredPanels=new Set(pieces.map(p=>p.sourcePanelId||p.id))
  const unprintablePanels=sourcePanels.filter((p,i)=>!coveredPanels.has(String(p?.id??`piece-${i}`)))
  const sourceIssues=useMemo(()=>auditPrintSourceCompleteness20261025(source,{native}),[source,native])
  const previewGraphics=Array.isArray(graphics)&&graphics.length?graphics:Array.isArray(source?.printGraphics)?source.printGraphics:[]
  const artworkForPiece=piece=>{
    if(!native||!Array.isArray(previewGraphics)||!previewGraphics.length)return []
    const panel=sourcePanels.find(panel=>String(panel?.id)===String(piece.sourcePanelId||piece.id))
    const vertices=panel?.polygon?.points
    if(!Array.isArray(vertices)||!vertices.length)return []
    const minX=Math.min(...vertices.map(q=>Number(q[0])))*100
    const maxY=Math.max(...vertices.map(q=>Number(q[1])))*100
    const origin=piece.originCm||[minX,0]
    return previewGraphics.filter(g=>g?.panel===(piece.sourcePanelId||piece.id)&&g.visible!==false).flatMap(g=>{
      const url=g.displayedMap==='normal'&&g.normalMapDataUrl?g.normalMapDataUrl:g.dataUrl
      const w=Number(g.widthMm)/10,h=Number(g.heightMm)/10
      if(typeof url!=='string'||!/^data:image\/(?:png|jpeg|webp);base64,/i.test(url)||!(w>0&&h>0))return []
      const position=Array.isArray(g.positionMm)?g.positionMm:[(piece.widthCm-w)/2*10,(piece.heightCm-h)/2*10]
      const x=minX-origin[0]+Number(position[0])/10
      const y=maxY-origin[1]-Number(position[1])/10-h
      if(!Number.isFinite(x)||!Number.isFinite(y))return []
      return [{id:g.id||'artwork',src:url,x,y,width:w,height:h,rotation:Number(g.rotation)||0,opacity:g.opacity??1}]
    })
  }
  const [selectedFabric,setSelectedFabric]=useState(ALL_PIECES)
  const showAll=selectedFabric===ALL_PIECES||!fabricIds.includes(selectedFabric)
  const fabricId=showAll?(fabricIds.length===1?fabricIds[0]:ALL_PIECES):selectedFabric
  const active=useMemo(()=>showAll?pieces:pieces.filter(p=>p.fabricId===fabricId),[pieces,fabricId,showAll])
  const mixedFabricOverview=showAll&&fabricIds.length>1
  const [propertyHost,setPropertyHost]=useState(null)
  useEffect(()=>{
    if(!embedded){setPropertyHost(null);return}
    setPropertyHost(document.getElementById('exo-print-layout-property-host'))
  },[embedded])
  const [rollWidth,setRollWidth]=useState(150)
  const [spacing,setSpacing]=useState(2)
  const [paper,setPaper]=useState('A4')
  const [orientation,setOrientation]=useState('portrait')
  const [customWidth,setCustomWidth]=useState(21)
  const [customHeight,setCustomHeight]=useState(29.7)
  const [margin,setMargin]=useState(.5)
  const [printScale,setPrintScale]=useState(100)
  const [previewPage,setPreviewPage]=useState(1)
  const [pngDpi,setPngDpi]=useState(300)
  const [pngStatus,setPngStatus]=useState('')
  const [pngBusy,setPngBusy]=useState(false)
  const [placements,setPlacements]=useState({})
  const [selectedPiece,setSelectedPiece]=useState('')
  const [hoveredPiece,setHoveredPiece]=useState('')
  const [showReferenceGuides,setShowReferenceGuides]=useState(true)
  const [showGuideMeasurements,setShowGuideMeasurements]=useState(true)
  const [guideKinds,setGuideKinds]=useState({chest:true,center:true,belly:true})
  const [zoom,setZoom]=useState(1)
  const [autoFit,setAutoFit]=useState(true)
  const [boardView,setBoardView]=useState('board')
  const [paperPageBatch,setPaperPageBatch]=useState(0)
  const [panEnabled,setPanEnabled]=useState(false)
  const selectedPattern=active.find(p=>p.id===selectedPiece)||null
  const savedLayouts=useRef({})
  const svg=useRef(null),drag=useRef(null),scroll=useRef(null),pan=useRef(null)
  const identity=active.map(p=>`${p.id}:${p.widthCm.toFixed(4)}:${p.heightCm.toFixed(4)}`).join('|')
  const suggested=useMemo(()=>nestPrintPieces20261025(active,rollWidth,spacing),[identity,rollWidth,spacing])
  const layoutKey=`${identity}:${rollWidth}:${spacing}`
  useEffect(()=>{
    const saved=savedLayouts.current[fabricId]
    setPlacements(saved?.key===layoutKey?saved.placements:suggested.placements)
    setSelectedPiece('')
  },[fabricId,layoutKey])
  const updatePlacements=next=>{
    savedLayouts.current[fabricId]={key:layoutKey,placements:next}
    setPlacements(next)
  }
  const totalLength=Math.max(suggested.lengthCm,computePrintRollLength20261025(active,placements,spacing))
  const unplacedPieces=active.filter(piece=>!placements[piece.id])
  const widestPieceCm=pieces.reduce((width,p)=>Math.max(width,p.widthCm),0)
  const issues=useMemo(()=>auditPrintLayout20261025(active,placements,rollWidth),[identity,placements,rollWidth])
  const fabricArea=active.reduce((total,p)=>total+p.areaCm2,0)
  const utilization=rollWidth*totalLength>0?100*fabricArea/(rollWidth*totalLength):0
  const printResult=useMemo(()=>{if(mixedFabricOverview)return {error:'Select a fabric roll to print. All Pieces is an overview of separate fabric types.'};try{return {plan:planPrintPages20261025({widthCm:rollWidth,heightCm:totalLength,paper,orientation,customWidthCm:customWidth,customHeightCm:customHeight,marginCm:margin,scale:printScale})}}catch(error){return {error:error.message}}},[rollWidth,totalLength,paper,orientation,customWidth,customHeight,margin,printScale,mixedFabricOverview])
  const printPlan=printResult.plan
  // Paper guides are a proof even in All Pieces. Mixed fabrics remain
  // deliberately non-printable until the user selects their real fabric roll.
  const paperProofPlan=useMemo(()=>{
    if(printPlan)return printPlan
    try{return planPrintPages20261025({widthCm:rollWidth,heightCm:totalLength,paper,orientation,
      customWidthCm:customWidth,customHeightCm:customHeight,marginCm:margin,scale:printScale})}
    catch{return null}
  },[printPlan,rollWidth,totalLength,paper,orientation,customWidth,customHeight,margin,printScale])
  const paperBatchSize=32
  const paperPageStart=paperPageBatch*paperBatchSize
  const visiblePaperPages=paperProofPlan?.pages.slice(paperPageStart,paperPageStart+paperBatchSize)||[]
  useEffect(()=>setPaperPageBatch(0),[paper,orientation,customWidth,customHeight,margin,printScale,rollWidth,totalLength,fabricId])
  const selectedPage=printPlan?.pages[Math.min(previewPage,printPlan.pages.length)-1]||printPlan?.pages[0]
  const pageSvg=useMemo(()=>selectedPage?renderPrintPageSvg20261025({pieces:active,placements,plan:printPlan,page:selectedPage,revision,fabricId}):'', [active,placements,printPlan,selectedPage,revision,fabricId])
  const readyToPrint=!!active.length&&!issues.length&&!sourceIssues.length&&!mixedFabricOverview&&!!printPlan
  const saveFile=(content,name,mime)=>{const url=URL.createObjectURL(new Blob([content],{type:mime}));const link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),15000)}
  const exportSheetSVG=()=>{if(!readyToPrint)return;const page=selectedPage||printPlan.pages[0];saveFile(renderPrintPageSvg20261025({pieces:active,placements,plan:printPlan,page,revision,fabricId}),`exo-${fabricId.replace(/[^a-z0-9_-]/gi,'-')}-page-${page.number}.svg`,'image/svg+xml;charset=utf-8')}
  const downloadPDF=()=>{if(!readyToPrint)return;const bytes=createPrintPdf20261025({pieces:active,placements,plan:printPlan,revision,fabricId});saveFile(bytes,`exo-${fabricId.replace(/[^a-z0-9_-]/gi,'-')}-pattern-pages.pdf`,'application/pdf')}
  const pngDetails=useMemo(()=>{try{return printPlan?{value:printPngDimensions20261025(printPlan,pngDpi)}:{error:'Set valid paper settings'}}catch(error){return {error:error.message}}},[printPlan,pngDpi])
  const downloadPagePng=async()=>{
    if(!readyToPrint||pngBusy||!pngDetails.value)return
    setPngBusy(true);setPngStatus('')
    let imageUrl
    try{
      const {width,height,dpi}=pngDetails.value
      const page=selectedPage||printPlan.pages[0]
      const markup=renderPrintPageSvg20261025({pieces:active,placements,plan:printPlan,page,revision,fabricId})
      imageUrl=URL.createObjectURL(new Blob([markup],{type:'image/svg+xml;charset=utf-8'}))
      const image=new Image()
      await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Unable to rasterize SVG page'));image.src=imageUrl})
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height
      const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas is unavailable')
      ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);ctx.drawImage(image,0,0,width,height)
      const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(Error('PNG conversion failed')),'image/png'))
      canvas.width=0;canvas.height=0
      saveFile(blob,`exo-${fabricId.replace(/[^a-z0-9_-]/gi,'-')}-page-${page.number}-${dpi}dpi-${width}x${height}.png`,'image/png')
      setPngStatus(`Saved page ${page.number} at ${dpi} DPI (${width} × ${height} px)`)
    }catch(error){setPngStatus(error.message||'PNG export failed')}
    finally{if(imageUrl)URL.revokeObjectURL(imageUrl);setPngBusy(false)}
  }
  const printSheets=()=>{
    if(!readyToPrint)return
    const sheets=printPlan.pages.map(page=>`<section class="sheet">${renderPrintPageSvg20261025({pieces:active,placements,plan:printPlan,page,revision,fabricId})}</section>`).join('')
    const html=`<!doctype html><html><head><meta charset="utf-8"><title>EXO Print Layout · ${xml(fabricId)}</title><style>@page{size:${printPlan.sheetWidthCm}cm ${printPlan.sheetHeightCm}cm;margin:0}*{box-sizing:border-box}html,body{padding:0;margin:0}.sheet{width:${printPlan.sheetWidthCm}cm;height:${printPlan.sheetHeightCm}cm;break-after:page;page-break-after:always;overflow:hidden}.sheet:last-child{break-after:auto;page-break-after:auto}.sheet svg{display:block;width:100%;height:100%}@media screen{body{background:#ccc}.sheet{margin:12px auto;background:white;box-shadow:0 1px 8px #888}}@media print{html,body{width:${printPlan.sheetWidthCm}cm}.sheet{margin:0}}</style></head><body>${sheets}<script>window.addEventListener('load',()=>{setTimeout(()=>window.print(),350)})<\/script></body></html>`
    const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));const frame=document.createElement('iframe');frame.title='EXO printable pattern pages';frame.style.cssText='position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none';frame.src=url;document.body.append(frame);window.setTimeout(()=>{frame.remove();URL.revokeObjectURL(url)},120000)
  }
  const toPoint=event=>{
    const matrix=svg.current?.getScreenCTM()
    if(!matrix)return null
    const p=svg.current.createSVGPoint();p.x=event.clientX;p.y=event.clientY
    const result=p.matrixTransform(matrix.inverse())
    return {x:result.x,y:result.y}
  }
  const measureBoardFit=()=>{
    const viewport=scroll.current
    if(!viewport||boardView!=='board')return
    const next=fitCompletePrintBoard20261025({
      widthCm:rollWidth,heightCm:totalLength,
      viewportWidthPx:viewport.clientWidth,viewportHeightPx:viewport.clientHeight,
      chromeHeightPx:unplacedPieces.length?260:100,
    })
    if(next!=null)setZoom(current=>Math.abs(current-next)>.0001?next:current)
  }
  const fitBoard=()=>{
    setAutoFit(true)
    measureBoardFit()
    if(scroll.current){scroll.current.scrollLeft=0;scroll.current.scrollTop=0}
  }
  useEffect(()=>{
    if(!autoFit||boardView!=='board')return undefined
    const element=scroll.current
    if(!element)return undefined
    const sync=()=>{if(!drag.current&&!pan.current)measureBoardFit()}
    sync()
    if(typeof ResizeObserver==='undefined')return undefined
    const observer=new ResizeObserver(sync)
    observer.observe(element)
    return()=>observer.disconnect()
  },[autoFit,boardView,rollWidth,totalLength,unplacedPieces.length,embedded,selectedFabric])
  const startPan=event=>{
    if(boardView!=='board')return
    if(event.button!==1 && !(panEnabled&&event.button===0))return
    const container=scroll.current
    if(!container)return
    event.preventDefault();event.stopPropagation()
    drag.current=null
    pan.current={pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,
      left:container.scrollLeft,top:container.scrollTop}
    try{container.setPointerCapture(event.pointerId)}catch{}
  }
  const movePan=event=>{
    if(!pan.current||!scroll.current||pan.current.pointerId!==event.pointerId)return
    scroll.current.scrollLeft=pan.current.left+pan.current.startX-event.clientX
    scroll.current.scrollTop=pan.current.top+pan.current.startY-event.clientY
  }
  const endPan=event=>{
    if(!pan.current||pan.current.pointerId!==event.pointerId)return
    pan.current=null
    try{scroll.current?.releasePointerCapture(event.pointerId)}catch{}
  }
  const startDrag=(event,p)=>{
    if(event.button!==0||panEnabled||!placements[p.id])return
    event.preventDefault()
    const pt=toPoint(event);if(!pt)return
    drag.current={id:p.id,start:pt,origin:{...placements[p.id]}}
    setSelectedPiece(p.id)
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const moveDrag=event=>{
    if(!drag.current)return
    const pt=toPoint(event);if(!pt)return
    const p=active.find(p=>p.id===drag.current.id)
    if(!p)return
    const {start,origin,id}=drag.current
    const x=clamp(origin.x+pt.x-start.x,0,Math.max(0,rollWidth-p.widthCm))
    const y=Math.max(0,origin.y+pt.y-start.y)
    setPlacements(old=>{
      const next={...old,[id]:{x:Math.round(x*10)/10,y:Math.round(y*10)/10}}
      savedLayouts.current[fabricId]={key:layoutKey,placements:next}
      return next
    })
    const container=scroll.current,rect=container?.getBoundingClientRect()
    if(rect){
      if(event.clientY>rect.bottom-28)container.scrollTop+=Math.min(18,Math.max(0,event.clientY-(rect.bottom-28)))
      if(event.clientY<rect.top+28)container.scrollTop-=Math.min(18,Math.max(0,rect.top+28-event.clientY))
      if(event.clientX>rect.right-28)container.scrollLeft+=Math.min(18,Math.max(0,event.clientX-(rect.right-28)))
      if(event.clientX<rect.left+28)container.scrollLeft-=Math.min(18,Math.max(0,rect.left+28-event.clientX))
    }
  }
  const finishPieceDrag=()=>{
    if(!drag.current)return
    drag.current=null
    // While a piece is being dragged, changing the view transform would
    // move its pointer target. Fit to the newly grown sheet only on release.
    if(autoFit&&boardView==='board')requestAnimationFrame(measureBoardFit)
  }
  const exportSVG=()=>{
    const height=Math.ceil(totalLength+spacing)
    const content=`<svg xmlns="http://www.w3.org/2000/svg" width="${rollWidth}cm" height="${height}cm" viewBox="0 0 ${rollWidth} ${height}">
<title>EXO Print Layout - ${xml(fabricId)}</title><desc>Pattern positioning proof, revision ${xml(revision)}. Base outlines for planning; cutline and grading verification required.</desc>
<rect x="0" y="0" width="${rollWidth}" height="${height}" fill="white" stroke="#333" stroke-width=".15"/>
${active.filter(p=>placements[p.id]).map(p=>`<g transform="translate(${placements[p.id].x} ${placements[p.id].y})"><path d="${path(p.points)}" fill="none" stroke="black" stroke-width=".12"/><text x="${p.widthCm/2}" y="${p.heightCm/2}" font-family="sans-serif" font-size="2" text-anchor="middle">${xml(p.name)}</text></g>`).join('\n')}
<text x="1" y="${height-1}" font-family="sans-serif" font-size="1.8">EXO / ${xml(fabricId)} / ${rollWidth} cm roll / ${issues.length} layout warnings / planning proof</text></svg>`
    const url=URL.createObjectURL(new Blob([content],{type:'image/svg+xml;charset=utf-8'}))
    const link=document.createElement('a');link.href=url;link.download=`exo-print-layout-${fabricId.replace(/[^a-z0-9_-]/gi,'-')}.svg`
    document.body.appendChild(link);link.click();link.remove()
    window.setTimeout(()=>URL.revokeObjectURL(url),1000)
  }
  const printProperties= <aside className="exo-print-properties">
        <div className="exo-print-properties-heading"><strong>PROPERTY EDITOR</strong><span>{mixedFabricOverview?'All pattern pieces':fabricId||'Fabric roll'}</span></div>
        <strong>GARMENT PATTERN INVENTORY</strong>
        <p data-print-source-coverage={`${sourcePanels.length-unprintablePanels.length}/${sourcePanels.length}`}>
          {sourcePanels.length-unprintablePanels.length} of {sourcePanels.length} authored panels have printable contours · {pieces.length} physical cut{pieces.length===1?'':'s'}.
        </p>
        {unprintablePanels.length>0&&<p className="exo-print-incomplete" role="alert" data-print-missing-panels="true">
          Missing valid cut outlines: {unprintablePanels.map(p=>p.name||p.id||'Unnamed panel').join(', ')}. Export is blocked until these are repaired in Pattern editing.
        </p>}
        {sourceIssues.length>0&&<div className="exo-print-incomplete" role="alert" data-print-completeness-warnings={sourceIssues.length}>
          {sourceIssues.map((issue,i)=><p key={i}>{issue}</p>)}
          Export is blocked until the authored source inventory is consistent.
        </div>}
        {!sourcePanels.length&&<p className="exo-print-incomplete" role="alert">No authored pattern pieces. Open or draft a complete garment before printing.</p>}
        {mixedFabricOverview&&<p>Viewing every garment piece together. Select an individual fabric tab to export a physical cutting marker for that material.</p>}
        <div className="exo-print-inventory-list" aria-label="All authored pattern pieces">
          {sourcePanels.map((p,index)=><div key={`${String(p?.id??index)}-${index}`}>
            <span>{p?.name||p?.id||`Panel ${index+1}`}</span>
            <small>{unprintablePanels.includes(p)?'NO CUTLINE':pieces.filter(piece=>piece.sourcePanelId===String(p?.id??`piece-${index}`)).length+' cut(s)'}</small>
          </div>)}
        </div>
        <details className="exo-print-settings"><summary>PRINT SETUP <small>{paper} · {orientation} · {printScale}%</small></summary>
    <div className="exo-print-paper-controls" aria-label="Paper and printer setup">
      <label>Paper <select value={paper} onChange={e=>{setPaper(e.target.value);setPreviewPage(1)}}>{[...Object.keys(PRINT_PAPERS_20261025),'Custom'].map(name=><option key={name} value={name}>{name}</option>)}</select></label>
      <label>Orientation <select value={orientation} onChange={e=>{setOrientation(e.target.value);setPreviewPage(1)}}><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></label>
      {paper==='Custom'&&<><label>Width <input type="number" min="1" max="1000" step=".1" value={customWidth} onChange={e=>setCustomWidth(e.target.value)}/> cm</label><label>Height <input type="number" min="1" max="1000" step=".1" value={customHeight} onChange={e=>setCustomHeight(e.target.value)}/> cm</label></>}
      <label>Margins <input type="number" min="0" max="10" step=".1" value={margin} onChange={e=>setMargin(e.target.value)}/> cm</label>
      <label>Scale <input type="number" min="10" max="200" step="1" value={printScale} onChange={e=>setPrintScale(e.target.value)}/> %</label>
      <label>PNG resolution <select aria-label="PNG export DPI" value={pngDpi} onChange={e=>setPngDpi(Number(e.target.value))}><option value={150}>150 DPI</option><option value={300}>300 DPI</option></select></label>
      <span role="status">{pngDetails.value?`PNG sheet ${pngDetails.value.widthCm.toFixed(2)} × ${pngDetails.value.heightCm.toFixed(2)} cm = ${pngDetails.value.width} × ${pngDetails.value.height} px`:pngDetails.error}{pngStatus?` · ${pngStatus}`:''}</span>
      <span>{printPlan?`${printPlan.cols} columns × ${printPlan.rows} rows · ${printPlan.pages.length} pages · ${printPlan.sheetWidthCm.toFixed(2)} × ${printPlan.sheetHeightCm.toFixed(2)} cm`:printResult.error}</span>
    </div>
        </details>
        <strong>ROLL</strong>
        <div className="exo-print-property-fields">
          <label>Fabric width <span><input aria-label="Fabric roll width in centimeters" type="number" min="60" max="300" step=".5" value={rollWidth} onChange={e=>{const n=Number(e.target.value);if(Number.isFinite(n))setRollWidth(clamp(n,60,300))}}/> cm</span></label>
          {widestPieceCm+spacing*2>rollWidth&&<button type="button" className="exo-print-widen-roll" disabled={widestPieceCm+spacing*2>300}
            onClick={()=>setRollWidth(Math.min(300,Math.ceil((widestPieceCm+spacing*2)*2)/2))}>
            Fit fabric width to widest piece ({(widestPieceCm+spacing*2).toFixed(1)} cm)
          </button>}
          <label>Marker length <output>{totalLength.toFixed(1)} cm</output></label>
          <label>Grain direction <output>1-way · fixed</output></label>
        </div>
        <strong>NESTING</strong>
        <div className="exo-print-property-fields">
          <label>Pattern buffer <span><input aria-label="Nesting buffer spacing in centimeters" type="number" min="0" max="20" step=".5" value={spacing} onChange={e=>{const n=Number(e.target.value);if(Number.isFinite(n))setSpacing(clamp(n,0,20))}}/> cm</span></label>
          <label>Method <output>Bounding box rows</output></label>
        </div>
        <strong>MARKER EFFICIENCY</strong>
        <dl><div><dt>Pattern area</dt><dd>{(fabricArea/10000).toFixed(3)} m²</dd></div>
          <div><dt>Fabric consumption</dt><dd>{((rollWidth*totalLength)/10000).toFixed(3)} m²</dd></div>
          <div><dt>Area utilization</dt><dd>{utilization.toFixed(1)}%</dd></div>
          <div><dt>Placed patterns</dt><dd>{active.length-issues.filter(message=>message.endsWith('unplaced')).length} / {active.length}</dd></div></dl>
        {selectedPattern&&<><strong>SELECTED PATTERN</strong><div className="exo-print-property-fields">
          <label>Name <output title={selectedPattern.name}>{selectedPattern.name}</output></label>
          <label>Width × height <output>{selectedPattern.widthCm.toFixed(2)} × {selectedPattern.heightCm.toFixed(2)} cm</output></label>
          {['x','y'].map(axis=><label key={axis}>{axis.toUpperCase()} position <span><input type="number" aria-label={`Selected pattern ${axis.toUpperCase()} position in centimeters`}
            step=".1" min="0" value={placements[selectedPattern.id]?.[axis]??0}
            onChange={event=>{const next=Number(event.target.value);if(event.target.value===''||!Number.isFinite(next))return
              const previous=placements[selectedPattern.id];if(!previous)return
              const cap=axis==='x'?rollWidth-selectedPattern.widthCm:100000
              updatePlacements({...placements,[selectedPattern.id]:{...previous,[axis]:Math.round(clamp(next,0,Math.max(0,cap))*10)/10}})}}/> cm</span></label>)}
        </div></>}
        <strong>PLACEMENT CHECK</strong>
        {issues.length?<ul aria-live="polite">{issues.slice(0,8).map((message,i)=><li key={i}>{message}</li>)}</ul>:<p className="exo-print-ok">All visible pieces have positions; bounding boxes are within the roll.</p>}
        <strong>PRINT SHEET PREVIEW</strong>
        {printPlan&&<><div className="exo-print-page-nav"><button type="button" disabled={selectedPage.number===1} onClick={()=>setPreviewPage(n=>Math.max(1,n-1))}>Previous</button><span>{selectedPage.number} / {printPlan.pages.length}</span><button type="button" disabled={selectedPage.number===printPlan.pages.length} onClick={()=>setPreviewPage(n=>Math.min(printPlan.pages.length,n+1))}>Next</button></div><div className="exo-print-page-preview" dangerouslySetInnerHTML={{__html:pageSvg}}/><p>White page shows true paper proportions. Each page includes a calibration bar. Print at actual size (100%) with browser headers and footers disabled.</p></>}
        {!printPlan&&<p role="status">{printResult.error}</p>}
        <small>Marker estimates use bounding-box nesting and existing base pattern outlines. Seam allowance and grainline verification remain required before cutting. Confirm printer scale against the calibration bar.</small>
      </aside>
  return <section className="exo-print-studio" aria-label="Print Layout Studio" data-print-layout-mode="true" data-print-layout-embedded={String(embedded)} data-external-properties={String(Boolean(propertyHost))}>
    <header className="exo-print-header">
      <div><strong>PRINT LAYOUT</strong><span>Pattern pieces · {sourcePanels.length} panels</span></div>
      <div className="exo-print-header-actions">
        <button type="button" onClick={()=>updatePlacements(suggested.placements)} title="Arrange pattern pieces on the selected fabric roll">Arrange</button>
        <button type="button" className="exo-print-export-primary" onClick={downloadPDF} disabled={!readyToPrint}>PDF</button>
        <details className="exo-print-export-menu"><summary aria-label="More print export formats">Export ▾</summary>
          <div className="exo-print-export-options">
            <button type="button" onClick={exportSVG} disabled={!readyToPrint} title="Export complete fabric marker as vector SVG">Marker SVG</button>
            <button type="button" onClick={exportSheetSVG} disabled={!readyToPrint}>Page SVG</button>
            <button type="button" onClick={downloadPagePng} disabled={!readyToPrint||pngBusy||!!pngDetails.error}>Page PNG</button>
            <button type="button" onClick={printSheets} disabled={!readyToPrint} title="Use printer settings at Actual Size (100%)">Print dialog</button>
          </div>
        </details>
        <button type="button" className="exo-print-close" onClick={onClose} aria-label="Exit Print Layout and return to drafting">Exit</button>
      </div>
    </header>
    <div className="exo-print-controls">
      <div className="exo-print-view-modes" role="group" aria-label="Print layout display">
        <button type="button" data-print-board-view="true" aria-pressed={boardView==='board'}
          onClick={()=>{setBoardView('board');setAutoFit(true)}}>Full board</button>
        <button type="button" data-print-pages-view="true" aria-pressed={boardView==='pages'}
          onClick={()=>{finishPieceDrag();setPanEnabled(false);setBoardView('pages')}}>Printed pages</button>
      </div>
      <div className="exo-print-view-controls" role="toolbar" aria-label="Print layout navigation">
        <button type="button" onClick={()=>{setBoardView('board');fitBoard()}}
          aria-label="Fit entire print board to viewport" title="Show all four paper edges">Fit sheet</button>
        <button type="button" onClick={()=>{setAutoFit(false);setZoom(value=>clamp(value/1.25,.01,3))}} disabled={boardView==='pages'} aria-label="Zoom out print layout">−</button>
        <output aria-label="Print layout zoom">{Math.round(zoom*100)}%</output>
        <button type="button" onClick={()=>{setAutoFit(false);setZoom(value=>clamp(value*1.25,.01,3))}} disabled={boardView==='pages'} aria-label="Zoom in print layout">+</button>
        <button type="button" onClick={()=>setPanEnabled(value=>!value)} disabled={boardView==='pages'} aria-label="Pan fabric roll" aria-pressed={panEnabled} title="Drag blank paper or the board with Hand; middle-drag also pans">Hand</button>
      </div>
      <div className="exo-print-overlay-controls" role="group" aria-label="Pattern construction overlays">
        <button type="button" data-print-toggle-guides="true" aria-pressed={showReferenceGuides}
          onClick={()=>setShowReferenceGuides(value=>!value)}
          title="Show or hide chest, center, and belly construction reference lines">
          Guides
        </button>
        <details className="exo-print-guides-settings">
          <summary aria-label="Choose visible construction lines" title="Choose individual reference lines">⌄</summary>
          <div className="exo-print-guides-options">
            {[['chest','Chest horizontal'],['center','Center vertical'],['belly','Belly horizontal']].map(([kind,title])=>
              <label key={kind}><input type="checkbox" data-print-guide-setting={kind}
                checked={guideKinds[kind]} onChange={e=>setGuideKinds(old=>({...old,[kind]:e.target.checked}))}/>{title}</label>)}
          </div>
        </details>
        <button type="button" data-print-toggle-measurements="true" aria-pressed={showGuideMeasurements}
          onClick={()=>setShowGuideMeasurements(value=>!value)}
          title="Show or hide accurate construction line and pattern measurements">
          Measurements
        </button>
      </div>
      <span data-print-visible-pieces={active.length} data-print-total-pieces={pieces.length}>
        {active.length} / {pieces.length} pieces · {rollWidth.toFixed(0)} × {totalLength.toFixed(0)} cm
      </span>
    </div>

    <nav className="exo-print-fabric-tabs" aria-label="Fabric roll layouts">
      <button type="button" className={showAll?'active':''} aria-current={showAll?'page':undefined}
        data-print-all-pieces="true" onClick={()=>setSelectedFabric(ALL_PIECES)}>
        All Pieces <small>{pieces.length} cuts</small>
      </button>
      {fabricIds.map(id=><button type="button" key={id} aria-current={!showAll&&id===fabricId?'page':undefined}
        className={!showAll&&id===fabricId?'active':''} onClick={()=>setSelectedFabric(id)}>
        <span className="exo-print-fabric-swatch"/> {id}
        <small>{pieces.filter(p=>p.fabricId===id).length} {pieces.filter(p=>p.fabricId===id).length===1?'piece':'pieces'}</small>
      </button>)}
      {!fabricIds.length&&<span className="exo-print-no-fabric">No patterns available in this garment</span>}
    </nav>
    <div className="exo-print-body">
      <div ref={scroll} className="exo-print-scroll" data-print-pan-enabled={String(panEnabled)}
        onPointerDownCapture={startPan} onPointerMove={movePan} onPointerUp={endPan} onPointerCancel={endPan}>
        {boardView==='pages'?<section className="exo-print-paper-pages" data-print-paper-pages="true"
          aria-label="Actual printed paper sheet previews">
          <header className="exo-print-pages-heading">
            <strong>PRINTED PAPER SHEETS</strong>
            <span>{paper} · {orientation} · {printScale}% print scale · {paperProofPlan?.pages.length??0} sheets</span>
            {mixedFabricOverview&&<small>All Pieces is a mixed-fabric proof only. Select a fabric for production exports.</small>}
          </header>
          {paperProofPlan&&<div className="exo-print-page-batches">
            <button type="button" disabled={paperPageBatch===0} onClick={()=>setPaperPageBatch(p=>Math.max(0,p-1))}>Previous sheets</button>
            <span>Showing {paperPageStart+1}–{Math.min(paperPageStart+paperBatchSize,paperProofPlan.pages.length)} of {paperProofPlan.pages.length}</span>
            <button type="button" disabled={paperPageStart+paperBatchSize>=paperProofPlan.pages.length} onClick={()=>setPaperPageBatch(p=>p+1)}>Next sheets</button>
          </div>}
          <div className="exo-print-page-grid" data-print-physical-page-count={paperProofPlan?.pages.length??0}>
            {visiblePaperPages.map(page=><article key={page.number} className="exo-print-physical-page" data-print-paper-page={page.number}>
              <div className="exo-print-physical-page-title">Sheet {page.number} / {paperProofPlan.pages.length}</div>
              <div className="exo-print-physical-page-paper"
                style={{aspectRatio:`${paperProofPlan.sheetWidthCm} / ${paperProofPlan.sheetHeightCm}`}}
                dangerouslySetInnerHTML={{__html:renderPrintPageSvg20261025({
                  pieces:active,placements,plan:paperProofPlan,page,revision,fabricId,
                })}}/>
            </article>)}
          </div>
          {!paperProofPlan&&<p role="status">The selected paper settings cannot contain this marker. Adjust paper size or print scale.</p>}
          <p className="exo-print-paper-proof-note">Each sheet has the selected paper dimensions and margins, matching PDF tiling. The Full board view remains draggable.</p>
        </section>:<div className="exo-print-roll" style={{width:Math.max(1,Math.round(Number(rollWidth)*4.2*zoom))}}
          data-print-roll-length-cm={totalLength.toFixed(2)} data-print-full-paper="true">
          <div className="exo-print-roll-caption">PATTERN BOARD <span>{rollWidth.toFixed(1)} × {totalLength.toFixed(1)} cm</span></div>
          <svg ref={svg} viewBox={`0 0 ${rollWidth} ${totalLength}`} preserveAspectRatio="xMinYMin meet"
            aria-label="Neutral gray print board with native 2D-style garment pattern pieces"
            role="img" data-print-roll-canvas="true">
            <rect width={rollWidth} height={totalLength} fill={PATTERN_VISUAL.canvas} data-print-paper-surface="true"/>
            {active.filter(p=>placements[p.id]).map((p,i)=>{
              const selected=selectedPiece===p.id
              const hovered=hoveredPiece===p.id
              const look=buildPrintPatternAppearance20261025(source,p,{native})
              const sourcePanel=native?(source?.template?.panels||source?.panels||[])
                .find(panel=>String(panel?.id)===String(p.sourcePanelId||p.id)):null
              const reference=printPatternGuideOverlay20261025(p,sourcePanel)
              const visibleKind=kind=>kind.startsWith('center-')?guideKinds.center:guideKinds[kind]===true
              const artwork=artworkForPiece(p)
              const clipId=`exo-print-pattern-clip-${i}`
              const cutline=patternCutlinePresentation({selected,hovered})
              const labelSize=Math.max(.85,Math.min(2.8,10/Math.max(.04,4.2*zoom)))
              const nodeRadius=Math.max(.12,Math.min(.8,2.2/Math.max(.1,4.2*zoom)))
              return <g key={p.id} data-print-piece-id={p.id} data-print-pattern-parity="2d"
                data-print-source-panel={p.sourcePanelId||p.id} transform={`translate(${placements[p.id].x} ${placements[p.id].y})`}
                onPointerEnter={()=>setHoveredPiece(p.id)} onPointerLeave={()=>setHoveredPiece(current=>current===p.id?'':current)}
                onPointerDown={event=>startDrag(event,p)} onPointerMove={moveDrag} onPointerUp={finishPieceDrag} onPointerCancel={finishPieceDrag}
                style={{cursor:'grab',touchAction:'none'}}>
                <defs><clipPath id={clipId}><path d={path(p.points)}/></clipPath></defs>
                <path data-pattern-surface="drafting-paper" data-print-pattern-surface={p.id}
                  d={path(p.points)} fill={PATTERN_VISUAL.paper} {...cutline}/>
                {artwork.length>0&&<g clipPath={`url(#${clipId})`} pointerEvents="none">
                  {artwork.map((graphic,index)=><image key={`${graphic.id}:${index}`} data-print-pattern-graphic={graphic.id}
                    href={graphic.src} x={graphic.x} y={graphic.y} width={graphic.width} height={graphic.height}
                    opacity={graphic.opacity} preserveAspectRatio="none"
                    transform={graphic.rotation?`rotate(${graphic.rotation} ${graphic.x+graphic.width/2} ${graphic.y+graphic.height/2})`:undefined}/>) }
                </g>}
                {showReferenceGuides&&<g data-print-reference-guides={p.id} pointerEvents="none">
                  {reference.guides.filter(line=>visibleKind(line.kind)).map(line=>
                    <g key={line.id} data-print-construction-guide={line.kind}
                      data-print-construction-guide-id={line.id}>
                      <polyline points={line.pointsCm.map(q=>q.join(',')).join(' ')}
                        stroke={line.kind.startsWith('center-')?'#0e2634':'#8f91ae'}
                        strokeWidth={1.15} strokeDasharray={line.style==='dotted'?'6 4':undefined}
                        strokeLinecap="round" strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke" fill="none"/>
                      {line.pointsCm.map((point,index)=><circle key={index}
                        data-print-construction-node={line.kind} cx={point[0]} cy={point[1]}
                        r={nodeRadius} fill="#f7f8f7" stroke="#8c9296"
                        strokeWidth={.8} vectorEffect="non-scaling-stroke"/>)}
                    </g>)}
                </g>}
                {look.internalLines.map(line=><polyline key={line.id} data-print-native-internal-line={line.id}
                  points={line.points.map(q=>q.join(',')).join(' ')} {...line.style} pointerEvents="none"/>)}
                {look.seamAllowances.map(line=><polyline key={line.id} data-print-native-seam-allowance={line.id}
                  points={line.points.map(q=>q.join(',')).join(' ')} {...line.style} pointerEvents="none"/>)}
                <path data-print-pattern-cutline={p.id} d={path(p.points)} fill="none" {...cutline} pointerEvents="none"/>
                {look.notches.map(line=><polyline key={line.id} data-print-native-notch={line.id}
                  points={line.points.map(q=>q.join(',')).join(' ')} {...line.style} pointerEvents="none"/>)}
                {showGuideMeasurements&&<g data-print-reference-measurements={p.id}
                  pointerEvents="none" fontFamily="Arial,sans-serif" fontSize={labelSize*.79}>
                  {reference.dimensions.filter(dim=>visibleKind(dim.kind)).map(dim=>{
                    const vertical=dim.kind.startsWith('center-')
                    const x=dim.positionCm[0]+(vertical?labelSize*.9:0)
                    const y=dim.positionCm[1]+(vertical?0:dim.kind==='chest'?-labelSize*.85:labelSize*1.25)
                    return <text key={dim.id} data-print-guide-measurement={dim.kind}
                      x={x} y={y} textAnchor="middle" dominantBaseline="middle"
                      fill="#53616c" paintOrder="stroke" stroke="#ffffff"
                      strokeWidth={labelSize*.27} strokeLinejoin="round"
                      transform={vertical?`rotate(-90 ${x} ${y})`:undefined}>
                      {dim.valueCm.toFixed(1)} cm
                    </text>
                  })}
                  <text data-print-piece-measurement={p.id} x={p.widthCm/2} y={p.heightCm-labelSize*1.4}
                    textAnchor="middle" fill="#53616c" stroke="#ffffff"
                    strokeWidth={labelSize*.24} paintOrder="stroke" strokeLinejoin="round">
                    {p.widthCm.toFixed(1)} × {p.heightCm.toFixed(1)} cm
                  </text>
                </g>}
                <text data-print-pattern-label={p.id} x={p.widthCm/2} y={p.heightCm+labelSize*1.25}
                  textAnchor="middle" fontSize={labelSize} fill="#697076" stroke={PATTERN_VISUAL.canvas}
                  strokeWidth={labelSize*.16} strokeLinejoin="round" paintOrder="stroke"
                  pointerEvents="none">{p.name}</text>
                <title>{p.name} · {p.widthCm.toFixed(2)} × {p.heightCm.toFixed(2)} cm</title>
              </g>
            })}
            <rect x=".24" y=".24" width={Math.max(.01,rollWidth-.48)} height={Math.max(.01,totalLength-.48)}
              fill="none" stroke="#626d76" strokeWidth=".48" data-print-complete-paper-edge="true" pointerEvents="none"/>
          </svg>
          <div className="exo-print-paper-end" data-print-paper-end="true"><span>{rollWidth.toFixed(1)} × {totalLength.toFixed(1)} cm</span></div>
        </div>}
        {unplacedPieces.length>0&&<section className="exo-print-unplaced-tray" role="region" aria-label="Unplaced pattern pieces"
          data-print-unplaced-count={unplacedPieces.length}>
          <strong>{unplacedPieces.length} unplaced pattern piece{unplacedPieces.length===1?'':'s'}</strong>
          <p>These remain part of the garment but cannot fit on the current fabric width. Increase the roll width or adjust the marker before exporting.</p>
          <div className="exo-print-unplaced-items">
            {unplacedPieces.map(piece=><div key={piece.id} data-print-unplaced-piece={piece.id}>
              <svg viewBox={`-2 -2 ${piece.widthCm+4} ${piece.heightCm+4}`} aria-label={`${piece.name} unplaced cut outline`}>
                <path d={path(piece.points)} fill="#fbfcfd" stroke="#bb6849" strokeWidth=".65" vectorEffect="non-scaling-stroke"/>
              </svg>
              <span>{piece.name}</span>
              <small>{piece.widthCm.toFixed(1)} × {piece.heightCm.toFixed(1)} cm</small>
            </div>)}
          </div>
        </section>}
      </div>
      {propertyHost ? createPortal(printProperties,propertyHost) : printProperties}
    </div>
  </section>
}
