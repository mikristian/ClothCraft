import React, {useEffect,useMemo,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import {BookOpen,ChevronLeft,ChevronRight,Columns3,Download,FileImage,FilePlus2,FileSpreadsheet,FolderOpen,Highlighter,ImagePlus,LayoutTemplate,Maximize2,MousePointer2,MoveUpRight,PenTool,Pencil,Plus,Printer,RefreshCw,Rows3,Ruler,Settings2,Table2,Tag,Trash2,Upload,Scaling,ClipboardCheck,Square} from 'lucide-react'
import TechPackTechnicalBoard from './TechPackTechnicalBoard.jsx'
import TechPackPageMarkup from './TechPackPageMarkup.jsx'
import TechPackBoardObject from './TechPackBoardObject.jsx'
import {resizeTechPackGroup} from './techPackGroupResize.js'
import {boardObjectTransform} from '../core/techPackBoardObjects.js'
import TechPackBoxContent from './TechPackBoxContent.jsx'
import TechPackSpreadsheetBlock from './techpack-spreadsheet/TechPackSpreadsheetBlock.jsx'
import TechPackFactoryReviewPanel from './techpack-spreadsheet/TechPackFactoryReviewPanel.jsx'
import TechPackTemplateLibrary from './TechPackTemplateLibrary.jsx'
import TechPackInteractive3D from './TechPackInteractive3D.jsx'
import {applyTechPackTemplate,TECHPACK_THEMES,TECHPACK_TABLE_TEMPLATES,saveTechPackUserPreset} from '../core/techPackTemplatePresets.js'
import {TECHPACK_ASSET_FOLDERS,assetInFolder,assetFolderDefault} from '../core/techPackAssetFolders.js'
import {TECHPACK_MARKER_COLORS,TECHPACK_MARKER_WIDTHS} from '../core/techPackPageMarkup.js'
import {nativeTechPackDocument,editNativeTechPackDocument} from '../core/techPackWorkspaceDocument.js'
import {TECHPACK_PAGES,techPackPageTable,techPackSource,techPackCsv} from '../core/techPackWorkspaceModel.js'
import {resolveTechPackPages,insertCustomTechPackPage,shiftTechPackPage,reorderTechPackPage,removeCustomTechPackPage,captureTechPackPageLayout,applyTechPackCapturedLayout,restyleTechPackPage,rebindTechPackTemplateTable,reconcileTechPackTemplateAssets,captureTechPackDocumentTemplate,applyTechPackDocumentTemplate} from '../core/techPackPageComposer.js'
import {applyTechPackPageLayout,techPackPageLayout,TECHPACK_PAPER_SIZES} from '../core/techPackPageLayout.js'
import {nextTechPackZoom,resolvedTechPackZoom,techPackZoomKey} from '../core/techPackCanvasZoom.js'
import {renderTechPackWorkspacePrintHTML} from '../core/techPackWorkspacePrint.js'
import {createBoundTechPackTable,createGarmentSpreadsheetTables,TECHPACK_BOUND_TABLE_PAGE_IDS} from '../core/techpack-spreadsheet/sourceBindings.js'
import {exportTechPackXlsx,importTechPackXlsx} from '../core/techpack-spreadsheet/exporterXlsx.js'
import {listSpreadsheetTablesFromWorkspace} from '../core/techpack-spreadsheet/printProjection.js'
import {importedSheetToWorkspaceTable} from '../core/techpack-spreadsheet/importIntoWorkspace.js'
import {spreadsheetFromTechPackPreset} from '../core/techpack-spreadsheet/templateBinding.js'
import {snapArtboardCoordinate,snapArtboardObject,alignArtboardBox,ARTBOARD_GRID_PX} from '../core/techPackArtboardGrid.js'
import {measurementReferenceRows,linkedMeasurementLabel} from '../core/techPackMeasurementDrawing.js'
import {getTechPackFabricSwatch,removeTechPackFabricSwatchAsset,setTechPackFabricSwatch} from '../core/techPackFabricSwatches.js'
import {editTechPackMaterialCell} from '../core/techPackMaterialEdits.js'
import {techPackAuthoringChecklist} from '../core/techPackAuthoringChecklist.js'
import {techPackFactoryReadiness} from '../core/techPackFactoryReadiness.js'
import {addTechPackColorway,updateTechPackColorway,removeTechPackColorway,normalizeTechPackColorways} from '../core/techPackColorways.js'
import {createTechPackCheckpoint,appendTechPackCheckpoint,compareTechPackCheckpoints} from '../core/techPackRevisionHistory.js'
import './TechPackWorkspace.css'

const HEADER_PRESETS=[['seville','Seville · Technical'],['technical','Technical'],['editorial','Editorial'],['minimal','Minimal'],['dark','Dark header']]
const EMPTY_3D_MARKERS=[]
const ORIENTATIONS=[['portrait','Portrait'],['landscape','Landscape']]
const CATEGORIES=['reference','fabric swatch','mockup','technical flat','fit','construction','logo','graphic','pattern','trim','inspiration','brand label','care label','size label','inside label','hangtag','packaging','packaging box','packaging bag']
const uid=()=>globalThis.crypto?.randomUUID?.()||`asset-${Date.now()}-${Math.random().toString(36).slice(2)}`
const safeAssetSrc=src=>typeof src==='string'&&(
  (/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(src)&&src.length<400000) ||
  (/^data:image\/svg\+xml,%3Csvg/i.test(src)&&src.length<450000)
) ? src : ''

// The user's original MIKRISTIAN specification sheets define the page
// architecture.  This is native, editable EXO data, not an image pasted from
// the reference PDF. The file's historical MK-HD002/HT001 values are never
// substituted into a different garment's tech pack.
function SevilleSheetHeader({source,draft,sheetDef,details,index,total,headerFields={},onHeaderField=()=>{},onPageField=()=>{}}){
  const brand=String(draft.brand||'').trim()||'—'
  const value=v=>v==null||String(v).trim()===''?'—':String(v)
  const category=String(draft.category||source.productionSpec?.category||'GARMENT')
  const size=String(source.grading?.baseSize||'NOT SET')
  const fabric=source.fabrics?.map(f=>f.name).filter(Boolean).slice(0,2).join(' / ')||'NOT ASSIGNED'
  const cell=(label,key,fallback,wide=false)=><div className={`tpws-seville-record ${wide?'tpws-seville-name':''}`}><b>{label}</b><input
    aria-label={`${label} header page ${index+1}`} title={`Edit ${label} on every Techpack page`}
    value={headerFields[key]??String(fallback??'')} onChange={event=>onHeaderField(key,event.target.value.slice(0,100))}/></div>
  return <header className="tpws-seville-titleblock" data-seville-title-block={sheetDef.id}>
    <div className="tpws-seville-record-grid">
      {cell('SEASON','season',draft.season)}
      {cell('STYLE NO.','sku',draft.sku)}
      {cell('CATEGORY','category',category)}
      {cell('FABRIC','fabric',fabric)}
      {cell('REV.','revision',source.revision)}
      {cell('BRAND','brand',brand)}
      {cell('NAME','name',draft.styleName||source.name,true)}
      {cell('SIZE','size',size)}
      {cell('MAT.','material',source.fabrics?.length?`${source.fabrics.length} MATERIALS`:'NOT SET')}
      {cell('ISSUE','issue','DRAFT')}
    </div>
    <div className="tpws-seville-section-title"><input aria-label={`Page ${index+1} section title`} value={details.title??sheetDef.name} onChange={e=>onPageField('title',e.target.value.slice(0,90))}/><input aria-label={`Page ${index+1} section subtitle`} value={details.subtitle??sheetDef.subtitle} onChange={e=>onPageField('subtitle',e.target.value.slice(0,130))}/></div>
  </header>
}

function download(name,content,type){
  const url=URL.createObjectURL(new Blob([content],{type}))
  const a=document.createElement('a');a.href=url;a.download=name;a.click()
  window.setTimeout(()=>URL.revokeObjectURL(url),1000)
}

// Preview uploaded SVGs as inert <img> resources. Strip every element and
// attribute outside the small drawing vocabulary; no scripts, links or CSS.
function cleanSvg(source){
  const xml=new DOMParser().parseFromString(source,'image/svg+xml')
  if(xml.querySelector('parsererror')||xml.documentElement.localName!=='svg')throw Error('Invalid SVG drawing')
  const tags=new Set(['svg','g','path','rect','circle','ellipse','line','polyline','polygon','defs','linearGradient','radialGradient','stop','text','tspan'])
  const attributes=new Set(['xmlns','viewBox','width','height','x','y','x1','y1','x2','y2','cx','cy','r','rx','ry','d','points','transform','fill','stroke','stroke-width','stroke-linecap','stroke-linejoin','fill-rule','opacity','fill-opacity','stroke-opacity','font-size','font-family','font-weight','text-anchor','offset','stop-color','stop-opacity','gradientUnits','gradientTransform','id'])
  function visit(node){
    for(const child of [...node.children]){
      if(!tags.has(child.localName)){child.remove();continue}
      visit(child)
    }
    for(const attr of [...node.attributes]){
      if(!attributes.has(attr.name)||/url\s*\(|javascript:|data:|https?:|@import/i.test(attr.value))node.removeAttribute(attr.name)
    }
  }
  visit(xml.documentElement)
  xml.documentElement.setAttribute('xmlns','http://www.w3.org/2000/svg')
  return new XMLSerializer().serializeToString(xml.documentElement)
}

async function readReference(file){
  if(file.type==='image/svg+xml'||/\.svg$/i.test(file.name)){
    if(file.size>300000)throw Error('SVG must be under 300 KB')
    const cleaned=cleanSvg(await file.text())
    return `data:image/svg+xml,${encodeURIComponent(cleaned)}`
  }
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>3*1024*1024)throw Error('Use SVG, JPEG, PNG or WebP under 3 MB')
  const bitmap=await createImageBitmap(file)
  try{
    const scale=Math.min(1,1300/Math.max(bitmap.width,bitmap.height))
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale))
    const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height)
    for(const quality of [.82,.66,.48,.32]){
      const image=canvas.toDataURL('image/jpeg',quality)
      if(image.length<250000)return image
    }
    throw Error('Image is too large for the project library')
  }finally{bitmap.close()}
}

export default function TechPackWorkspace({project,value,onChange,nativeMode=false,nativeSnapshot=null,nativeGraphics=[],storageError=''}){
  const [hosts,setHosts]=useState(null)
  useEffect(()=>{
    setHosts({library:document.getElementById('exo-techpack-library-host'),
      objects:document.getElementById('exo-techpack-object-host'),
      properties:document.getElementById('exo-techpack-properties-host'),
      leftTools:document.getElementById('exo-techpack-left-tools-host'),
      rightTools:document.getElementById('exo-techpack-right-tools-host')})
  },[])
  const [page,setPage]=useState('overview')
  const [annotationTool,setAnnotationTool]=useState('select')
  const [highlightColor,setHighlightColor]=useState('#f4d03f')
  const [highlightWidth,setHighlightWidth]=useState(25)
  const [selectedAnnotationId,setSelectedAnnotationId]=useState('')
  const [renderViews,setRenderViews]=useState({})
  const capturedRevision=useRef(null)
  useEffect(()=>{
    if(!nativeMode)return
    const captured=event=>{
      const results=event.detail?.views
      if(!results||!['front','back','side'].every(key=>/^data:image\/jpeg;base64,/.test(results[key]||'')))return
      setRenderViews(results)
    }
    window.addEventListener('exo-clothcraft-techpack-render-captured',captured)
    return()=>window.removeEventListener('exo-clothcraft-techpack-render-captured',captured)
  },[nativeMode])
  useEffect(()=>{
    if(!nativeMode||!nativeSnapshot||capturedRevision.current===nativeSnapshot.revision)return
    capturedRevision.current=nativeSnapshot.revision
    window.dispatchEvent(new Event('exo-clothcraft-techpack-render-capture-request'))
  },[nativeMode,nativeSnapshot])
  const [pageFlow,setPageFlow]=useState('vertical')
  const [documentZoom,setDocumentZoom]=useState('1')
  const [canvasWidth,setCanvasWidth]=useState(800)
  const scrollRef=useRef(null)
  useEffect(()=>{
    const element=scrollRef.current
    if(!element)return
    const observer=new ResizeObserver(entries=>setCanvasWidth(entries[0].contentRect.width))
    observer.observe(element)
    return()=>observer.disconnect()
  },[])
  const selectedPageRef=useRef('overview')
  const flowAnchorRef=useRef(null)
  useEffect(()=>{
    const scroller=scrollRef.current
    if(pageFlow!=='horizontal'||!scroller)return
    const wheel=event=>{
      // An ordinary mouse wheel advances the sideways document strip.
      // Native trackpad horizontal gestures keep working without interception.
      if(event.ctrlKey||event.shiftKey||Math.abs(event.deltaX)>Math.abs(event.deltaY))return
      if(event.target.closest('.tpws-table-scroll,.tpws-sheet-notes textarea'))return
      scroller.scrollLeft+=event.deltaY
      event.preventDefault()
    }
    scroller.addEventListener('wheel',wheel,{passive:false})
    return()=>scroller.removeEventListener('wheel',wheel)
  },[pageFlow])
  const [rightTab,setRightTab]=useState('properties')
  const [selectedAsset,setSelectedAsset]=useState('')
  const [assetCategory,setAssetCategory]=useState('reference')
  const [assetFilter,setAssetFilter]=useState('all')
  const [assetSearch,setAssetSearch]=useState('')
  const [assetFolder,setAssetFolder]=useState('all')
  const [librarySection,setLibrarySection]=useState('assets')
  const [selectedBoardObject,setSelectedBoardObject]=useState(null)
  const [selectedBoardObjects,setSelectedBoardObjects]=useState([])
  const [focused3DPanel,setFocused3DPanel]=useState('')
  const [revisionLabel,setRevisionLabel]=useState('')
  const [error,setError]=useState('')
  const uploadRef=useRef(null)
  const xlsxImportRef=useRef(null)
  const [spreadsheetKind,setSpreadsheetKind]=useState('measurement-table')
  const pendingFabricSwatchRef=useRef('')
  const source=useMemo(()=>techPackSource(project,nativeSnapshot,nativeMode),[project?.pieces,project?.fabrics,project?.seams,project?.grading,project?.customMeasurements,project?.name,project?.revision,nativeSnapshot,nativeMode])
  const state=useMemo(()=>nativeTechPackDocument(source,value),[value,source])
  const draft=state.draft||{}
  const workspace=draft.workspace||{}
  const documentPages=useMemo(()=>resolveTechPackPages(workspace,TECHPACK_PAGES),[workspace.pageOrder,workspace.customPages])
  const [editMode,setEditMode]=useState('content')
  const [boxPreview,setBoxPreview]=useState(null)
  const boxGesture=useRef(null)
  useEffect(()=>{
    const key=event=>{
      if(event.metaKey||event.ctrlKey||event.altKey||event.target?.closest?.('input,textarea,select,[contenteditable="true"]'))return
      if(event.key==='v'||event.key==='V'){
        setEditMode('layout');setAnnotationTool('select')
      }else if(event.key==='b'||event.key==='B'){
        setEditMode('layout');setAnnotationTool('box');setSelectedBoardObject(null)
      }else if(event.key==='Escape'){
        boxGesture.current=null;setBoxPreview(null)
        if(annotationTool==='box')setAnnotationTool('select')
      }
    }
    window.addEventListener('keydown',key)
    return()=>window.removeEventListener('keydown',key)
  },[annotationTool])
  const [dragPage,setDragPage]=useState('')
  const [layoutNotice,setLayoutNotice]=useState('')
  const details=workspace.pages?.[page]||{}
  const activePage=documentPages.find(p=>p.id===page)||documentPages[0]
  const {orientation,paperSize}=techPackPageLayout(workspace,page)
  useEffect(()=>{
    const onZoomKey=event=>{
      const action=techPackZoomKey(event)
      if(!action)return
      event.preventDefault()
      event.stopPropagation()
      setDocumentZoom(current=>nextTechPackZoom(current,action,canvasWidth,orientation==='landscape'))
    }
    // Run before the app-level shortcuts and the browser's page-zoom handler.
    window.addEventListener('keydown',onZoomKey,true)
    return()=>window.removeEventListener('keydown',onZoomKey,true)
  },[canvasWidth,orientation])
  const preset=details.headerPreset||workspace.headerPreset||'seville'
  const table=useMemo(()=>techPackPageTable(page,source,{...draft,pom:source.kind==='project'?source.pom:(draft.pom&&Object.keys(draft.pom).length?draft.pom:source.pom),samples:state.samples}),[page,source,draft,state.samples])
  const override=workspace.cells?.[page]||{}
  const extraRows=workspace.extraRows?.[page]||[]
  const combinedRows=[...table.rows,...extraRows]
  const measurementSpec=techPackPageTable('measurements',source,{...draft,
    pom:source.kind==='project'?source.pom:(Object.keys(draft.pom||{}).length?draft.pom:source.pom),samples:state.samples})
  const measurementRefs=measurementReferenceRows(measurementSpec.rows)
  const factoryPOMTable=useMemo(()=>createBoundTechPackTable('measurement-table',source,draft),[source,draft])
  const refs=(draft.references||[]).map(ref=>({...ref,_source:'references',_src:ref.dataUrl||ref.src}))
  const uploads=(workspace.assets||[]).map(ref=>({...ref,_source:'assets',_src:ref.dataUrl}))
  const graphics=nativeMode?(nativeGraphics||[]).map(g=>({id:`native-${g.id}`,name:g.name||g.id,category:'graphic',_source:'native',_src:g.thumbnail||'',panel:g.panel})):[]
  const sourceFabricAssets=(source.fabrics||[]).map(f=>({id:`source-fabric-${f.id}`,name:f.name||f.id,caption:f.name||f.id,
    category:'fabric',_source:'native-fabric',_src:'',color:f.color||''}))
  const assets=[...refs,...uploads,...graphics,...sourceFabricAssets].filter(item=>item.id)
    .map(item=>({...item,category:workspace.assetFolderOverrides?.[item.id]||item.category||'reference'}))
  const authoring=techPackAuthoringChecklist(source,draft,workspace,assets)
  const factoryReview=techPackFactoryReadiness(source,draft,workspace,assets)
  const colorways=normalizeTechPackColorways(draft.colorways)
  const revisions=Array.isArray(workspace.revisions)?workspace.revisions:[]
  const revisionChanges=revisions.length>1?compareTechPackCheckpoints(revisions.at(-2),revisions.at(-1)):[]
  const chosen=assets.find(a=>a.id===selectedAsset)
  const linked=new Set(workspace.pageAssets?.[page]||[])
  const pageAssets=assets.filter(a=>linked.has(a.id)||((page==='flats'||page==='artwork')&&(draft.technicalFlat?.referenceId===a.id)))
  const position=documentPages.findIndex(p=>p.id===page)
  const selectedPageBox=selectedBoardObject?.pageId===page&&selectedBoardObject.id.startsWith('box-')
    ?(workspace.pageBoxes?.[page]||[]).find(item=>'box-'+item.id===selectedBoardObject.id):null
  const selectedIds=selectedBoardObjects.filter(item=>item.pageId===page).map(item=>item.id)
  const existingGroupIds=pageId=>new Set([
    ...['header','drawing','renders','render-front','render-back','render-side','fabric-swatches','images','spec-table','notes','footer-logo'].filter(id=>!workspace.hiddenObjects?.[pageId]?.includes(id)),
    ...(workspace.pageBoxes?.[pageId]||[]).map(box=>'box-'+box.id),
    ...(workspace.pageAssets?.[pageId]||[]).map(id=>'asset-'+id),
  ])
  const liveGroups=pageId=>{
    const valid=existingGroupIds(pageId)
    return (workspace.objectGroups?.[pageId]||[]).map(group=>({
      ...group,ids:[...new Set(group.ids||[])].filter(id=>valid.has(id)),
    })).filter(group=>group.ids.length>=2)
  }
  const groupMembers=(pageId,id)=>liveGroups(pageId).find(group=>group.ids.includes(id))?.ids||[id]
  const boardSelectionNodes=(pageId,ids)=>{
    const nodes=[...(scrollRef.current?.querySelectorAll('[data-board-object]')||[])]
    return ids.map(id=>{
      const node=nodes.find(item=>item.dataset.boardPage===pageId&&item.dataset.boardObject===id)
      if(!node)return null
      const value=workspace.boardObjects?.[pageId]?.[id]||{}
      const transform=boardObjectTransform(value)
      return {id,value:{...value,...transform},x:node.offsetLeft+transform.x,y:node.offsetTop+transform.y,
        width:node.offsetWidth*transform.scaleX,height:node.offsetHeight*transform.scaleY,
        baseWidth:node.offsetWidth,baseHeight:node.offsetHeight}
    }).filter(Boolean)
  }
  const boardGestureStart=(pageId,id,handle)=>{
    const selected=selectedBoardObjects.filter(item=>item.pageId===pageId).map(item=>item.id)
    const ids=[...new Set([...groupMembers(pageId,id),...(selected.includes(id)?selected:[])])]
    return {pageId,id,handle,items:boardSelectionNodes(pageId,ids)}
  }
  const selectBoardObject=(object,additive=false)=>{
    setSelectedBoardObject(object)
    setSelectedBoardObjects(current=>{
      if(!object)return []
      const members=groupMembers(object.pageId,object.id).map(id=>({pageId:object.pageId,id}))
      if(!additive)return members
      const onPage=current.filter(item=>item.pageId===object.pageId)
      const already=onPage.some(item=>item.id===object.id)
      return already?onPage.filter(item=>!members.some(member=>member.id===item.id)):
        [...onPage,...members.filter(member=>!onPage.some(item=>item.id===member.id))]
    })
  }
  const groupSelection=()=>{
    const valid=existingGroupIds(page)
    const ids=[...new Set(selectedIds)].filter(id=>valid.has(id))
    if(ids.length<2)return
    const prior=liveGroups(page).filter(group=>!group.ids.some(id=>ids.includes(id)))
    // Members of an existing group cannot be split by selecting a subset.
    const expanded=[...new Set(ids.flatMap(id=>groupMembers(page,id)))].filter(id=>valid.has(id))
    const groups=prior.filter(group=>!group.ids.some(id=>expanded.includes(id)))
    groups.push({id:uid(),ids:expanded})
    update({...workspace,objectGroups:{...workspace.objectGroups,[page]:groups}})
    setSelectedBoardObjects(expanded.map(id=>({pageId:page,id})))
    setLayoutNotice(`${expanded.length} layers grouped. Selection and movement are linked after reload.`)
  }
  const ungroupSelection=()=>{
    const groups=liveGroups(page)
    const chosen=groups.filter(group=>group.ids.some(id=>selectedIds.includes(id)))
    if(!chosen.length)return
    update({...workspace,objectGroups:{...workspace.objectGroups,[page]:groups.filter(group=>!chosen.includes(group))}})
    setLayoutNotice(`${chosen.length} group${chosen.length===1?'':'s'} ungrouped. Layer positions preserved.`)
  }
  // Each page stays physically 8.5×11 or 11×8.5. Fit long editable content
  // *within* that artboard rather than stretching the paper to portrait-like
  // heights or adding an internal scrollbar.
  useEffect(()=>{
    const raf=requestAnimationFrame(()=>{
      const papers=scrollRef.current?.querySelectorAll('[data-techpack-sheet]')||[]
      const list=[]
      // Split writes from reads; interleaving each of the 14 full-page
      // measurements caused repeated synchronous relayout on orientation.
      for(const paper of papers){
        const viewport=paper.querySelector('.tpws-page-content-scroll')
        const inner=paper.querySelector('.tpws-seville-ruled-frame')
        if(!viewport||!inner)continue
        inner.style.transform='none';inner.style.width='100%'
        if(paper.dataset.techpackSheet==='interactive3d'){paper.dataset.contentFit='1.000';continue}
        list.push({paper,viewport,inner})
      }
      let measurements=list.map(({paper,viewport,inner})=>({paper,viewport,inner,
        scale:Math.max(.18,Math.min(1,(viewport.clientHeight-3)/Math.max(1,inner.scrollHeight)))}))
      // The old fitter widened the source by just 20%, leaving a tiny
      // centered print plate in landscape. Give the content the ENTIRE paper
      // width after fitting; never change the Letter paper dimensions.
      // Batch writes and reads, avoiding 16 synchronous relayouts per page.
      for(let pass=0;pass<3;pass++){
        for(const {inner,scale} of measurements){
          inner.style.width=`${100/scale}%`
          inner.style.transform=`scale(${scale})`
        }
        measurements=measurements.map(({paper,viewport,inner,scale})=>({paper,viewport,inner,
          scale:Math.max(.18,Math.min(1,(viewport.clientHeight-4)/Math.max(1,inner.scrollHeight)))}))
      }
      for(const {paper,viewport,inner,scale} of measurements){
        inner.style.width=`${100/scale}%`
        inner.style.transform=`scale(${scale})`
        paper.dataset.contentFit=scale.toFixed(3)
      }
    })
    return()=>cancelAnimationFrame(raf)
  // A scroll event changes the selected page. It must NOT refit every sheet:
  // doing so triggers expensive relayout while the user scrolls to Add Page.
  },[workspace,source,orientation,paperSize,canvasWidth,renderViews,pageFlow,documentZoom])

  const navigateToPage=target=>{
    selectedPageRef.current=target
    setPage(target)
    const container=scrollRef.current
    const node=[...(container?.querySelectorAll('[data-techpack-sheet]')||[])].find(el=>el.getAttribute('data-techpack-sheet')===target)
    if(container&&node){
      const x=node.getBoundingClientRect().left-container.getBoundingClientRect().left+container.scrollLeft
      const y=node.getBoundingClientRect().top-container.getBoundingClientRect().top+container.scrollTop
      container.scrollTo({left:pageFlow==='horizontal'?x:0,top:pageFlow==='vertical'?y:0,behavior:'instant'})
    }
  }
  const syncPageOnScroll=()=>{
    if(flowAnchorRef.current)return
    const scroller=scrollRef.current
    if(!scroller)return
    const bounds=scroller.getBoundingClientRect()
    const start=pageFlow==='vertical'?bounds.top:bounds.left
    const finish=pageFlow==='vertical'?bounds.bottom:bounds.right
    let best=null,visible=-1
    for(const item of scroller.querySelectorAll('[data-techpack-sheet]')){
      const r=item.getBoundingClientRect()
      const pos=pageFlow==='vertical'?r.top:r.left
      const end=pageFlow==='vertical'?r.bottom:r.right
      const overlap=Math.max(0,Math.min(end,finish)-Math.max(pos,start))
      if(overlap>visible){visible=overlap;best=item.getAttribute('data-techpack-sheet')}
    }
    if(best&&best!==selectedPageRef.current){selectedPageRef.current=best;setPage(best)}
  }
  const changeFlow=next=>{
    if(next===pageFlow)return
    const anchor=selectedPageRef.current
    flowAnchorRef.current=anchor
    setPageFlow(next)
    // Reposition on the active sheet after the flex direction changes.
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      const container=scrollRef.current
      const node=[...(container?.querySelectorAll('[data-techpack-sheet]')||[])].find(el=>el.getAttribute('data-techpack-sheet')===anchor)
      if(container&&node){
        const rect=node.getBoundingClientRect(),frame=container.getBoundingClientRect()
        container.scrollTo({left:next==='horizontal'?rect.left-frame.left+container.scrollLeft:0,
          top:next==='vertical'?rect.top-frame.top+container.scrollTop:0})
      }
      selectedPageRef.current=anchor
      setPage(anchor)
      requestAnimationFrame(()=>{flowAnchorRef.current=null})
    }))
  }

  useEffect(()=>{
    const anchor=selectedPageRef.current
    flowAnchorRef.current=anchor
    const frame=requestAnimationFrame(()=>{
      const container=scrollRef.current
      const node=[...(container?.querySelectorAll('[data-techpack-sheet]')||[])].find(el=>el.getAttribute('data-techpack-sheet')===anchor)
      if(container&&node){
        const rect=node.getBoundingClientRect(),bounds=container.getBoundingClientRect()
        container.scrollTo({left:pageFlow==='horizontal'?rect.left-bounds.left+container.scrollLeft:0,
          top:pageFlow==='vertical'?Math.max(0,rect.top-bounds.top+container.scrollTop-48):0,behavior:'instant'})
      }
      flowAnchorRef.current=null
    })
    return()=>cancelAnimationFrame(frame)
  },[documentZoom,canvasWidth])

  const update=(next,otherDraft={})=>onChange?.(editNativeTechPackDocument(state,{...otherDraft,workspace:next}))
  const addCustomPage=()=>{
    if(documentPages.length>=60){setError('Maximum of 60 Techpack pages reached.');return}
    const id='custom-'+uid().replace(/[^a-z0-9_-]/gi,'').slice(0,65)
    const next=insertCustomTechPackPage(workspace,id,page,'Custom page',TECHPACK_PAGES)
    // Select the newly created page synchronously. Waiting for its artboard to
    // mount before setting page allowed quick Template Library actions to use
    // the previous page, then overwrite the selection during the next frame.
    selectedPageRef.current=id
    setPage(id)
    update(next);setEditMode('layout');setAnnotationTool('transform');setSelectedBoardObject(null)
    requestAnimationFrame(()=>requestAnimationFrame(()=>navigateToPage(id)))
    setLayoutNotice('New page created. Add a box, table or photo, then save its layout as a template.')
  }
  const moveDocumentPage=(id,direction)=>update(shiftTechPackPage(workspace,id,direction,TECHPACK_PAGES))
  const reorderDocumentPage=(from,to)=>{if(from!==to)update(reorderTechPackPage(workspace,from,to,TECHPACK_PAGES))}
  const deleteCustomPage=id=>{
    if(!workspace.customPages?.some(p=>p.id===id))return
    if(!window.confirm('Delete this custom page and its placed content? Garment source data is not changed.'))return
    update(removeCustomTechPackPage(workspace,id));setSelectedBoardObject(null);navigateToPage('overview')
  }
  const savePageAsTemplate=(includeContent=false)=>{
    const title=String(workspace.pages?.[page]?.title||activePage.name||'My page layout').slice(0,70)
    const name=window.prompt(includeContent?'Name the reusable design with your authored text, graphics and tables:':'Name the blank reusable page layout:',title)
    if(name===null)return
    if(!name.trim()){setError('Enter a name for the custom template.');return}
    try{
      saveTechPackUserPreset(captureTechPackPageLayout(workspace,page,name.trim(),{includeContent}))
      window.dispatchEvent(new Event('exo-techpack-user-templates-changed'))
      setLibrarySection('templates');setLayoutNotice(includeContent?'Designed page and manually authored content saved as a reusable template. Native source values will refresh on future garments.':'Blank reusable page layout saved; garment measurements and private notes excluded.')
    }catch(err){setError('Could not save template: '+(err?.message||'Storage not available'))}
  }
  const saveEntireTechpackTemplate=(includeContent=false)=>{
    const name=window.prompt('Name your complete reusable Techpack design system:','My custom Techpack')
    if(name===null)return
    if(!name.trim()){setError('Enter a template name.');return}
    // Authored notes, image references and template data should only be saved
    // on explicit opt-in; the default pack snapshot always uses blank values.
    try{
      saveTechPackUserPreset(captureTechPackDocumentTemplate(workspace,TECHPACK_PAGES,name.trim(),{includeContent,assets}))
      window.dispatchEvent(new Event('exo-techpack-user-templates-changed'))
      setLibrarySection('templates')
      setLayoutNotice(includeContent?'Saved the full Techpack with authored text and small uploaded photos. Native garment measurements and approvals are excluded.':'Saved all page layouts, header styles, boxes and Excel schemas without content or garment measurements.')
    }catch(err){setError('Could not save full Techpack template: '+(err?.message||String(err)))}
  }
  const setMode=mode=>{
    setEditMode(mode);setAnnotationTool(mode==='layout'?'select':'select');setSelectedBoardObject(null)
    setLayoutNotice(mode==='layout'?'Layout mode: drag objects using blue bounding boxes; garment specifications are protected.':'Content mode: edit the garment and factory information.')
  }
  const focusSelectedContent=(pageId,id)=>{
    setEditMode('content');setAnnotationTool('select')
    setSelectedBoardObject({pageId,id})
    if(id.startsWith('asset-')||id.startsWith('render-')||id==='footer-logo'){
      setLibrarySection('assets');setRightTab('assets')
      setLayoutNotice('Choose the replacement image from Assets. The existing object position stays intact.')
      return
    }
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      const target=[...document.querySelectorAll('[data-board-object]')]
        .find(node=>node.dataset.boardPage===pageId&&node.dataset.boardObject===id)
      const input=target?.querySelector('.tpbc-title, .tpbc-note, .tps td[tabindex], textarea, input')
      input?.focus()
    }))
  }
  const deleteLayoutObject=(pageId,id)=>{
    if(id.startsWith('render-')){
      // Native capture stays available; removing an authored override restores it.
      const objects={...workspace.boardObjects?.[pageId]}
      delete objects[id]
      update({...workspace,boardObjects:{...workspace.boardObjects,[pageId]:objects}})
      setSelectedBoardObject(null)
      return
    }
    if(id.startsWith('box-')){deleteTemplateBox(pageId,id.slice(4));return}
    if(id.startsWith('table-')){removeTable(pageId,id.slice(6));return}
    if(id.startsWith('asset-')){
      const assetId=id.slice(6)
      const prior=workspace.boardObjects?.[pageId]||{}
      const transforms={...prior};delete transforms[id]
      update({...workspace,pageAssets:{...workspace.pageAssets,[pageId]:(workspace.pageAssets?.[pageId]||[]).filter(v=>v!==assetId)},
        boardObjects:{...workspace.boardObjects,[pageId]:transforms}})
      return
    }
    update({...workspace,hiddenObjects:{...workspace.hiddenObjects,
      [pageId]:[...new Set([...(workspace.hiddenObjects?.[pageId]||[]),id])]}})
  }
  const layoutContext=(pageId,id,action)=>{
    if(action==='reset'){
      update({...workspace,boardObjects:{...workspace.boardObjects,
        [pageId]:{...workspace.boardObjects?.[pageId],[id]:{x:0,y:0,scaleX:1,scaleY:1}}}})
    }else if(action==='delete')deleteLayoutObject(pageId,id)
    else if(action==='replace'){
      setSelectedBoardObject({pageId,id})
      if(id.startsWith('asset-')||id.startsWith('render-')||id.startsWith('box-')||id==='footer-logo'){
        setLibrarySection('assets');setRightTab('assets')
        setLayoutNotice('Select another image in Assets, then choose Replace selected object. Its artboard position and size will be preserved.')
      }else{
        setLibrarySection('templates')
        setLayoutNotice('Select a new template style. Layout appearance can be changed without replacing existing text or measurements.')
      }
      return
    }else if(action==='duplicate'){
      if(id.startsWith('box-')){
        const item=(workspace.pageBoxes?.[pageId]||[]).find(box=>'box-'+box.id===id)
        if(item&& (workspace.pageBoxes?.[pageId]||[]).length<24){
          const newId=uid()
          const duplicate=structuredClone(item)
          duplicate.id=newId
          duplicate.x=Math.max(0,(Number(item.x)||0)+18);duplicate.y=Math.max(0,(Number(item.y)||0)+18)
          if(duplicate.slot?.spreadsheetTable){
            duplicate.slot.spreadsheetTable={...duplicate.slot.spreadsheetTable,id:'table-'+uid(),boxId:newId,
              rows:(duplicate.slot.spreadsheetTable.rows||[]).map(row=>({...row,id:'row-'+uid()}))}
          }
          const current=workspace.boardObjects?.[pageId]?.[id]||{}
          update({...workspace,pageBoxes:{...workspace.pageBoxes,[pageId]:[...(workspace.pageBoxes?.[pageId]||[]),duplicate]},
            boardObjects:{...workspace.boardObjects,[pageId]:{...workspace.boardObjects?.[pageId],['box-'+newId]:{...current}}}})
          setSelectedBoardObject({pageId,id:'box-'+newId})
          return
        }
      }else if(id.startsWith('asset-')){
        const assetId=id.slice(6)
        if((workspace.pageBoxes?.[pageId]||[]).length<24){
          const newId=uid(),current=workspace.boardObjects?.[pageId]?.[id]||{}
          const box={id:newId,title:'Visual reference',assetId,width:245,height:195,
            x:60+Math.max(0,Number(current.x)||0),y:60+Math.max(0,Number(current.y)||0),
            border:'solid',lineColor:'#8897a1',positionMode:'absolute',note:''}
          update({...workspace,pageBoxes:{...workspace.pageBoxes,[pageId]:[...(workspace.pageBoxes?.[pageId]||[]),box]}})
          setSelectedBoardObject({pageId,id:'box-'+newId})
          return
        }
      }
      setLayoutNotice('To duplicate this inherited factory element, create a new independent box and place its content inside.')
      return
    }else if(action==='front'||action==='back'){
      const current=workspace.boardObjects?.[pageId]?.[id]||{}
      update({...workspace,boardObjects:{...workspace.boardObjects,
        [pageId]:{...workspace.boardObjects?.[pageId],[id]:{...current,zIndex:action==='front'?50:0}}}})
      return
    }
    setSelectedBoardObject(null)
  }
  const applyDroppedPreset=(preset,pageId,boxId=null)=>{
    if(!preset||typeof preset!=='object')return
    if(boxId){
      const categories=new Set(['boxes','tables','pages','headers','packs','garments','themes','custom','interactive'])
      if(!categories.has(preset.category))return
      const existingBox=(workspace.pageBoxes?.[pageId]||[]).find(item=>String(item.id)===String(boxId))
      if(['pages','packs','garments','themes','custom','interactive'].includes(preset.category)){
        update(preset.kind==='page-layout'?restyleTechPackPage(workspace,pageId,preset):
          applyTechPackTemplate(workspace,preset,pageId))
        setLayoutNotice('Restyled this page without replacing any existing photos, tables, factory values or selected-box content.')
        return
      }
      if(preset.category==='boxes'&&existingBox){
        editTemplateBox(pageId,boxId,{
          border:preset.border==='dashed'?'dashed':'solid',
          lineColor:/^#[0-9a-f]{6}$/i.test(preset.lineColor||'')?preset.lineColor:existingBox.lineColor,
          width:Math.max(60,Math.min(580,Number(preset.width)||existingBox.width||240)),
          height:Math.max(55,Math.min(540,Number(preset.height)||existingBox.height||180))})
        setLayoutNotice('Box frame resized and restyled. Its photos, table cells, notes and links were preserved.')
        return
      }
      // Inserting a new visual table style into an existing Excel widget must
      // never discard the data or its source links. Structure replacement is
      // a separate, explicitly destructive operation in spreadsheet editing.
      if(preset.category==='tables'&&existingBox?.slot?.spreadsheetTable?.columns?.length){
        const current=existingBox.slot.spreadsheetTable
        editTemplateBox(pageId,boxId,{slot:{...existingBox.slot,
          tablePresetId:String(preset.id||'').slice(0,80),
          spreadsheetTable:{...current,styleId:current.styleId||'exo-seville-spec-v1',
            tableTheme:preset.tableTheme||current.tableTheme||'excel-light'}}})
        setEditMode('content');setAnnotationTool('select')
        setLayoutNotice('Table design applied without changing its columns, formulas, source links or data. Use the table toolbar to change the structure.')
        return
      }
      if(preset.category==='headers'&&existingBox?.slot?.category==='headers'){
        editTemplateBox(pageId,boxId,{slot:{...existingBox.slot,
          header:String(preset.id||preset.header||'technical').slice(0,32)}})
        setLayoutNotice('Header design changed. Existing heading text and page metadata preserved.')
        return
      }
      const headers=Array.isArray(preset.headers)?preset.headers.slice(0,12).map(v=>String(v).slice(0,65)):[]
      const rows=Array.isArray(preset.rows)?preset.rows.slice(0,30).map(row=>({id:uid(),cells:headers.map((_,index)=>String(row?.cells?.[index]||'').slice(0,500))})):
        Array.from({length:Math.min(12,Math.max(1,Number(preset.rows)||4))},()=>({id:uid(),cells:headers.map(()=>'')}))
      editTemplateBox(pageId,boxId,{...(preset.category==='tables'||preset.category==='headers'?{title:String(preset.name||'').slice(0,80)}:{}),
        slot:{id:String(preset.id||'').slice(0,80),name:String(preset.name||'Template').slice(0,100),category:preset.category,
        title:String(preset.title||preset.name||'').slice(0,100),headers,
        rows,header:String(preset.header||''),layout:String(preset.layout||''),
        ...(preset.category==='tables'?{spreadsheetTable:spreadsheetFromTechPackPreset(preset,{pageId,boxId})}:{})}})
      if(preset.category==='tables'){setEditMode('content');setAnnotationTool('select')}
      return
    }
    if(preset.category==='boxes'){insertTemplateBox(preset,pageId);return}
    if(preset.category==='tables'){addTable(pageId,preset);return}
    applyTemplatePreset(preset,pageId)
  }
  // Pointer coordinates are converted back to unzoomed artboard CSS px.
  // The same coordinates are stored by both the Box tool and the selector.
  const boxPoint=(event,paper)=>{
    const rect=paper.getBoundingClientRect()
    const ratioX=paper.clientWidth/Math.max(rect.width,1),ratioY=paper.clientHeight/Math.max(rect.height,1)
    return {x:Math.max(0,Math.min(paper.clientWidth,(event.clientX-rect.left)*ratioX)),
      y:Math.max(0,Math.min(paper.clientHeight,(event.clientY-rect.top)*ratioY))}
  }
  const boxGestureStart=(event,pageId)=>{
    if(editMode!=='layout'||annotationTool!=='box'||event.button!==0)return
    event.preventDefault();event.stopPropagation()
    const paper=event.currentTarget.closest('[data-techpack-sheet]')
    if(!paper)return
    const start=boxPoint(event,paper)
    boxGesture.current={pointerId:event.pointerId,pageId,start,paper}
    event.currentTarget.setPointerCapture(event.pointerId)
    setBoxPreview({...start,width:0,height:0,pageId})
  }
  const boxGestureMove=event=>{
    const gesture=boxGesture.current
    if(!gesture||gesture.pointerId!==event.pointerId)return
    const point=boxPoint(event,gesture.paper)
    setBoxPreview({pageId:gesture.pageId,x:Math.min(point.x,gesture.start.x),y:Math.min(point.y,gesture.start.y),
      width:Math.abs(point.x-gesture.start.x),height:Math.abs(point.y-gesture.start.y)})
  }
  const boxGestureEnd=event=>{
    const gesture=boxGesture.current
    if(!gesture||gesture.pointerId!==event.pointerId)return
    boxGesture.current=null
    setBoxPreview(null)
    const point=boxPoint(event,gesture.paper)
    const grid=workspace.artboardGuides?.[gesture.pageId]
    const x=snapArtboardCoordinate(Math.min(point.x,gesture.start.x),ARTBOARD_GRID_PX,Boolean(grid?.snap))
    const y=snapArtboardCoordinate(Math.min(point.y,gesture.start.y),ARTBOARD_GRID_PX,Boolean(grid?.snap))
    const width=Math.round(Math.abs(point.x-gesture.start.x)),height=Math.round(Math.abs(point.y-gesture.start.y))
    if(width<18||height<18)return
    const existing=workspace.pageBoxes?.[gesture.pageId]||[]
    if(existing.length>=24){setError('Maximum 24 boxes per page.');return}
    const id=uid()
    const box={id,x,y,width,height,title:'',note:'',border:'solid',lineColor:'#252c34',positionMode:'absolute'}
    update({...workspace,pageBoxes:{...workspace.pageBoxes,[gesture.pageId]:[...existing,box]}})
    setSelectedBoardObject({pageId:gesture.pageId,id:'box-'+id})
    setAnnotationTool('select')
  }
  const handlePageTemplateDrop=(event,pageId)=>{
    event.preventDefault()
    const raw=event.dataTransfer.getData('application/x-exo-techpack-template')||event.dataTransfer.getData('text/plain')
    if(!raw||raw.length>100000)return
    try{
      const object=event.target.closest?.('[data-board-object^="box-"]')
      const boxId=object?.dataset.boardObject?.slice(4)
      applyDroppedPreset(JSON.parse(raw),pageId,boxId)
    }catch{setError('Cannot read dropped template. Drag an EXO template from the Library.')}
  }
  const updateBoardObject=(pageId,id,next,gestureInfo)=>{
    const previous=workspace.boardObjects?.[pageId]?.[id]||{}
    const snapped=snapArtboardObject(next,ARTBOARD_GRID_PX,Boolean(workspace.artboardGuides?.[pageId]?.snap))
    const selected=selectedBoardObjects.filter(item=>item.pageId===pageId).map(item=>item.id)
    const group=[...new Set([...groupMembers(pageId,id),...(selected.includes(id)?selected:[])])]
    const gesture=gestureInfo?.gesture
    if(gestureInfo?.handle!=='move'&&gesture?.pageId===pageId&&gesture.id===id&&gesture.items.length>1){
      const resized=resizeTechPackGroup(gesture.items,id,gestureInfo.initial,snapped,gestureInfo.handle)
      if(resized){
        update({...workspace,boardObjects:{...workspace.boardObjects,[pageId]:{...workspace.boardObjects?.[pageId],...resized}}})
        return
      }
    }
    const deltaX=(Number(snapped.x)||0)-(Number(previous.x)||0),deltaY=(Number(snapped.y)||0)-(Number(previous.y)||0)
    const revised={...workspace.boardObjects?.[pageId],[id]:{...previous,...snapped}}
    if(group.length>1&&group.includes(id)&&(deltaX||deltaY))for(const other of group){
      if(other===id)continue
      const prior=revised[other]||{}
      revised[other]={...prior,x:Math.max(-400,Math.min(400,(Number(prior.x)||0)+deltaX)),y:Math.max(-400,Math.min(400,(Number(prior.y)||0)+deltaY))}
    }
    update({...workspace,boardObjects:{...workspace.boardObjects,[pageId]:revised}})
  }
  const alignBoardSelection=direction=>{
    if(!selectedIds.length)return
    const nodes=[...(scrollRef.current?.querySelectorAll('[data-board-object]')||[])]
    const sizes=selectedIds.map(id=>{
      const node=nodes.find(item=>item.dataset.boardPage===page&&item.dataset.boardObject===id)
      if(!node)return null
      const saved=workspace.boardObjects?.[page]?.[id]||{}
      const originalX=Number(saved.x)||0,originalY=Number(saved.y)||0
      const scaleX=Number(saved.scaleX)||1,scaleY=Number(saved.scaleY)||1
      return {id,saved,x:node.offsetLeft+originalX,y:node.offsetTop+originalY,width:node.offsetWidth*scaleX,height:node.offsetHeight*scaleY}
    }).filter(Boolean)
    if(!sizes.length)return
    const edges={left:Math.min(...sizes.map(v=>v.x)),right:Math.max(...sizes.map(v=>v.x+v.width)),top:Math.min(...sizes.map(v=>v.y)),bottom:Math.max(...sizes.map(v=>v.y+v.height))}
    const {orientation:pageOrientation}=techPackPageLayout(workspace,page)
    const paperWidth=pageOrientation==='landscape'?792:612,paperHeight=pageOrientation==='landscape'?612:792
    const target=direction==='left'?sizes.length>1?edges.left:0:direction==='right'?sizes.length>1?edges.right:paperWidth:
      direction==='center'?sizes.length>1?(edges.left+edges.right)/2:paperWidth/2:
      direction==='top'?sizes.length>1?edges.top:0:direction==='bottom'?sizes.length>1?edges.bottom:paperHeight:
      sizes.length>1?(edges.top+edges.bottom)/2:paperHeight/2
    const revised={...workspace.boardObjects?.[page]}
    for(const item of sizes){
      const oldPosition=['left','right','center'].includes(direction)?direction==='left'?item.x:direction==='right'?item.x+item.width:item.x+item.width/2:
        direction==='top'?item.y:direction==='bottom'?item.y+item.height:item.y+item.height/2
      const key=['left','right','center'].includes(direction)?'x':'y'
      revised[item.id]={...item.saved,[key]:Math.max(-400,Math.min(400,(Number(item.saved[key])||0)+target-oldPosition))}
    }
    update({...workspace,boardObjects:{...workspace.boardObjects,[page]:revised}})
  }
  const scaleBoardSelection=factor=>{
    const items=boardSelectionNodes(page,selectedIds)
    if(!items.length)return
    const left=Math.min(...items.map(item=>item.x)),top=Math.min(...items.map(item=>item.y))
    const right=Math.max(...items.map(item=>item.x+item.width)),bottom=Math.max(...items.map(item=>item.y+item.height))
    const centerX=(left+right)/2,centerY=(top+bottom)/2
    const revised={...workspace.boardObjects?.[page]}
    for(const item of items){
      const scaleX=Math.max(.25,Math.min(3,item.value.scaleX*factor))
      const scaleY=Math.max(.25,Math.min(3,item.value.scaleY*factor))
      const actualX=scaleX/item.value.scaleX,actualY=scaleY/item.value.scaleY
      revised[item.id]={...item.value,scaleX,scaleY,
        x:Math.max(-400,Math.min(400,item.value.x+(item.x-centerX)*(actualX-1))),
        y:Math.max(-400,Math.min(400,item.value.y+(item.y-centerY)*(actualY-1)))}
    }
    update({...workspace,boardObjects:{...workspace.boardObjects,[page]:revised}})
  }
  const setArtboardGuide=(key,on,pageId=page)=>update({...workspace,artboardGuides:{...workspace.artboardGuides,
    [pageId]:{...workspace.artboardGuides?.[pageId],[key]:Boolean(on)}}})
  const alignSelectedBox=direction=>{
    if(!selectedPageBox)return
    const {orientation:pageOrientation}=techPackPageLayout(workspace,page)
    const width=pageOrientation==='landscape'?792:612,height=pageOrientation==='landscape'?612:792
    const updated=alignArtboardBox(selectedPageBox,direction,width,height)
    editTemplateBox(page,selectedPageBox.id,{x:updated.x,y:updated.y})
  }
  const addAnnotation=(pageId,item)=>{
    const prior=workspace.annotations?.[pageId]||[]
    const enriched=pageId==='callouts'&&item.type==='arrow'?{...item,label:`D${String(prior.filter(a=>a.type==='arrow').length+1).padStart(2,'0')}`,component:'',instruction:''}:item
    update({...workspace,annotations:{...workspace.annotations,[pageId]:[...prior,enriched]}})
    setSelectedAnnotationId(item.id)
  }
  const updateAnnotation=(pageId,id,patch)=>update({...workspace,annotations:{...workspace.annotations,
    [pageId]:(workspace.annotations?.[pageId]||[]).map(item=>item.id===id?{...item,...patch}:item)}})
  const deleteAnnotation=(pageId,id)=>{
    update({...workspace,annotations:{...workspace.annotations,[pageId]:(workspace.annotations?.[pageId]||[]).filter(item=>item.id!==id)}})
    setSelectedAnnotationId('')
  }
  // All new table actions now create the same native Excel-like widget.
  // Existing saved legacy tables remain readable/editable for compatibility.
  const addTable=(pageId=page,template=null)=>insertExcelWidget(template||TECHPACK_TABLE_TEMPLATES[0],pageId)
  // Notion-style Excel widget: one draggable visual block, independent of
  // garment-generated factory tables and available on EVERY artboard.
  const insertExcelWidget=(template=TECHPACK_TABLE_TEMPLATES[0],pageId=page)=>{
    if(selectedBoardObject?.pageId===pageId&&selectedBoardObject.id.startsWith('box-')){
      applyDroppedPreset(template,pageId,selectedBoardObject.id.slice(4))
      return
    }
    const existing=workspace.pageBoxes?.[pageId]||[]
    if(existing.length>=24){setError('Maximum 24 blocks on this page. Select an existing box to insert a table.');return}
    const id=uid()
    const table=spreadsheetFromTechPackPreset(template,{pageId,boxId:id})
    const horizontal=techPackPageLayout(workspace,pageId).orientation==='landscape'
    const width=Math.min(horizontal?650:510,Math.max(horizontal?610:490,table.columns.length*76))
    const box={id,positionMode:'absolute',
      x:Math.round(35+Math.min(existing.length,6)*17),
      y:Math.round(60+Math.min(existing.length,6)*20),
      width,height:Math.max(235,Math.min(horizontal?435:485,table.rows.length*28+145)),
      title:table.title||template.title||'Editable spreadsheet',
      border:'solid',lineColor:'#8798a2',note:'',
      slot:{category:'tables',title:table.title||template.title,headers:table.columns.map(c=>c.label),
        sourceLinked:false,spreadsheetTable:table}}
    update({...workspace,pageBoxes:{...workspace.pageBoxes,[pageId]:[...existing,box]}})
    setSelectedBoardObject({pageId,id:'box-'+id})
    setEditMode('content');setAnnotationTool('select')
    navigateToPage(pageId)
    setLayoutNotice('Excel widget added. Edit its cells, headers and theme; choose Layout to drag or resize the block.')
  }
  const insertLinkedSpreadsheet=(pageId=page,kind=spreadsheetKind)=>{
    if(!source.ready){setError('Load a garment before inserting source-linked specifications.');return}
    const existing=workspace.pageBoxes?.[pageId]||[]
    const spreadsheetTable=createBoundTechPackTable(kind,source,draft)
    if(selectedBoardObject?.pageId===pageId&&selectedBoardObject.id.startsWith('box-')){
      const boxId=selectedBoardObject.id.slice(4)
      editTemplateBox(pageId,boxId,{title:spreadsheetTable.name,slot:{category:'tables',id:spreadsheetTable.id,
        title:spreadsheetTable.name,spreadsheetTable,sourceLinked:true}})
      setEditMode('content');setAnnotationTool('select')
      setLayoutNotice('Linked specification table placed in the selected box. Native measurements remain protected.')
      return
    }
    if(existing.length>=24){setError('This page already contains 24 boxes. Select an existing box for the linked table.');return}
    const boxId=uid()
    const box={id:boxId,title:spreadsheetTable.name,positionMode:'absolute',x:45+Math.min(existing.length,5)*17,
      y:60+Math.min(existing.length,5)*20,width:Math.min(500,Math.max(340,Math.max(3,spreadsheetTable.columns.length)*62)),
      height:300,border:'solid',lineColor:'#333e47',note:'',
      slot:{id:spreadsheetTable.id,category:'tables',title:spreadsheetTable.name,sourceLinked:true,spreadsheetTable}}
    update({...workspace,pageBoxes:{...workspace.pageBoxes,[pageId]:[...existing,box]}})
    navigateToPage(pageId);setEditMode('content');setAnnotationTool('select')
    setLayoutNotice('Source-linked Techpack spreadsheet inserted. Edit cells explicitly to create reviewed overrides.')
  }
  const exportSpreadsheetWorkbook=()=>{
    try{
      const nativeTables=source.ready?createGarmentSpreadsheetTables(source,draft):{}
      const linked=listSpreadsheetTablesFromWorkspace(workspace,nativeTables)
      const authored=Object.entries(workspace.tables||{}).flatMap(([pageId,tables])=>
        (Array.isArray(tables)?tables:[]).map(table=>({...table,name:table.title||pageId})))
      const all=[...linked,...authored]
      const bytes=exportTechPackXlsx(all)
      download(`${(source.name||'garment').replace(/[^\w-]+/g,'-')}-techpack-rev-${String(source.revision??'draft').replace(/[^\w-]+/g,'-')}.xlsx`,
        bytes,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      setLayoutNotice(`Exported ${all.length} Techpack sheets as editable XLSX. Factory review remains required.`)
    }catch(err){setError('Excel export failed: '+(err?.message||String(err)))}
  }
  const importSpreadsheetWorkbook=async event=>{
    const file=event.currentTarget.files?.[0]
    event.currentTarget.value=''
    if(!file)return
    try{
      if(file.size>8_000_000)throw Error('Excel file exceeds 8 MB import cap')
      const imported=importTechPackXlsx(new Uint8Array(await file.arrayBuffer()))
      if(!imported.length)throw Error('Workbook contains no supported worksheets')
      let next=workspace,first=null
      const count=Math.min(imported.length,8,Math.max(0,60-documentPages.length))
      for(const sheet of imported.slice(0,count)){
        const pageId='custom-'+uid().replace(/[^a-z0-9_-]/gi,'').slice(0,60)
        next=insertCustomTechPackPage(next,pageId,page,sheet.name||'Imported Excel sheet',TECHPACK_PAGES)
        if(!first)first=pageId
        const boxId=uid()
        const typed=importedSheetToWorkspaceTable(sheet,{id:'import-'+uid(),pageId,boxId})
        const box={id:boxId,title:sheet.name,x:25,y:35,width:565,height:360,positionMode:'absolute',
          border:'solid',lineColor:'#586572',note:'Imported spreadsheet; check formulas and measurements before factory use.',
          slot:{id:typed.id,category:'tables',spreadsheetTable:typed,sourceLinked:false}}
        next={...next,pageBoxes:{...next.pageBoxes,[pageId]:[...(next.pageBoxes?.[pageId]||[]),box]}}
      }
      if(!first)throw Error('No room for imported sheets: maximum 60 Techpack pages')
      update(next);setEditMode('content')
      requestAnimationFrame(()=>requestAnimationFrame(()=>navigateToPage(first)))
      setLayoutNotice(`Imported ${count} of ${imported.length} Excel sheets with widths and cell formatting. ${count<imported.length?'Additional sheets were skipped (8 per import and 60 page maximum). ':''}Verify all imported values and formulas before factory use.`)
    }catch(err){setError('Excel import failed: '+(err?.message||String(err)))}
  }
  const editTable=(pageId,id,edit)=>{
    const previous=workspace.tables?.[pageId]||[]
    update({...workspace,tables:{...workspace.tables,[pageId]:previous.map(t=>t.id===id?edit(t):t)}})
  }
  const removeTable=(pageId,id)=>{
    if(!window.confirm('Remove this custom table from the tech pack?'))return
    update({...workspace,tables:{...workspace.tables,[pageId]:(workspace.tables?.[pageId]||[]).filter(t=>t.id!==id)}})
  }
  const configure=(patch,pageId=page)=>update({...workspace,pages:{...workspace.pages,[pageId]:{...workspace.pages?.[pageId],...patch}}})
  const configureAllPages=patch=>update(applyTechPackPageLayout(workspace,patch))
  const applyTemplatePreset=(template,targetPage=null)=>{
    if(template?.kind==='page-layout'){
      update(restyleTechPackPage(workspace,targetPage||page,template))
      setLayoutNotice('The new page appearance is applied. Existing photos, cell data, source links, and object positions were preserved.')
      return
    }
    if(editMode==='layout'&&selectedBoardObject?.pageId===(targetPage||page)&&selectedBoardObject?.id?.startsWith('box-')&&
      ['boxes','tables','headers'].includes(template?.category)){
      applyDroppedPreset(template,targetPage||page,selectedBoardObject.id.slice(4));return
    }
    update(applyTechPackTemplate(workspace,template,targetPage))
  }
  const createPageFromSavedTemplate=(template)=>{
    if(!template?.pageSnapshot){setError('Choose a saved page layout template.');return}
    if(documentPages.length>=60){setError('Maximum 60 Techpack pages reached.');return}
    const id='custom-'+uid().replace(/[^a-z0-9_-]/gi,'').slice(0,60)
    const blank=insertCustomTechPackPage(workspace,id,page,template.name||'Custom page',TECHPACK_PAGES)
    const next=applyTechPackCapturedLayout(blank,id,template,uid)
    // Binding is opt-in via the original template sourceRef: use the CURRENT
    // garment only. Never duplicate measurements from another garment.
    const boxes=(next.pageBoxes?.[id]||[]).map(box=>{
      const slot=box.slot
      if(!(slot?.sourceLinked||slot?.spreadsheetTable?.sourceLinked||slot?.spreadsheetTable?.origin==='native')||!source.ready||!slot?.spreadsheetTable?.kind)return box
      try{
        const fresh=createBoundTechPackTable(slot.spreadsheetTable.kind,source,draft)
        return {...box,slot:{...slot,spreadsheetTable:{...rebindTechPackTemplateTable(slot.spreadsheetTable,fresh,{includeAuthored:template.contentMode==='authored'}),id:slot.spreadsheetTable.id,pageId:id,boxId:box.id}}}
      }catch{return box}
    })
    selectedPageRef.current=id;setPage(id)
    update(reconcileTechPackTemplateAssets({...next,pageBoxes:{...next.pageBoxes,[id]:boxes}},id,assets.map(asset=>asset.id)))
    setEditMode('layout');setAnnotationTool('select');setSelectedBoardObject(null)
    requestAnimationFrame(()=>requestAnimationFrame(()=>navigateToPage(id)))
    setLayoutNotice('New artboard created from your saved template. Manually authored content was retained only if selected when saving; garment-linked data uses this design.')
  }
  const applyFullTechpackTemplate=template=>{
    if(template?.kind!=='pack-layout'){setError('Choose a complete saved Techpack system.');return}
    if(!window.confirm('Use this saved Techpack system? Page layouts and inserted boxes will be replaced. Existing garment geometry, source measurements, and source revision will remain unchanged.'))return
    let next=applyTechPackDocumentTemplate(workspace,template,TECHPACK_PAGES,uid,assets.map(asset=>asset.id))
    for(const page of resolveTechPackPages(next,TECHPACK_PAGES)){
      const boxes=(next.pageBoxes?.[page.id]||[]).map(box=>{
        const slot=box.slot
        if(!(slot?.sourceLinked||slot?.spreadsheetTable?.sourceLinked||slot?.spreadsheetTable?.origin==='native')||!source.ready||!slot?.spreadsheetTable?.kind)return box
        try{
          const fresh=createBoundTechPackTable(slot.spreadsheetTable.kind,source,draft)
          return {...box,slot:{...slot,spreadsheetTable:{...rebindTechPackTemplateTable(slot.spreadsheetTable,fresh,{includeAuthored:template.contentMode==='authored'}),id:slot.spreadsheetTable.id,pageId:page.id,boxId:box.id}}}
        }catch{return box}
      })
      next={...next,pageBoxes:{...next.pageBoxes,[page.id]:boxes}}
    }
    update(next)
    setEditMode('layout');setAnnotationTool('select');setSelectedBoardObject(null)
    setLayoutNotice('Complete design system applied. Every linked spreadsheet is populated from the current garment only; authored specifications still require review.')
  }
  const insertTemplateBox=(template,pageId=page)=>{
    const existing=workspace.pageBoxes?.[pageId]||[]
    if(existing.length>=24){setError('Maximum 24 boxes per page.');return}
    const box={id:uid(),title:String(template.name||'Detail box').slice(0,80),note:'',width:Math.min(580,Math.max(90,Number(template.width)||270)),
      height:Math.min(440,Math.max(70,Number(template.height)||125)),border:template.border==='dashed'?'dashed':'solid',
      lineColor:/^#[0-9a-f]{6}$/i.test(template.lineColor||'')?template.lineColor:'#171717',
      ...(pageId.startsWith('custom-')?{positionMode:'absolute',x:45+Math.min(existing.length,8)*14,y:52+Math.min(existing.length,8)*14}:{})}
    update({...workspace,pageBoxes:{...workspace.pageBoxes,[pageId]:[...existing,box]}})
    navigateToPage(pageId)
  }
  const editTemplateBox=(pageId,id,patch)=>update({...workspace,pageBoxes:{...workspace.pageBoxes,
    [pageId]:(workspace.pageBoxes?.[pageId]||[]).map(b=>b.id===id?{...b,...patch}:b)}})
  const editSelectedBoxGeometry=(field,raw)=>{
    if(!selectedPageBox)return
    const next=Number(raw)
    if(!Number.isFinite(next))return
    const {orientation:boxOrientation}=techPackPageLayout(workspace,page)
    const pageWidth=boxOrientation==='landscape'?792:612
    const pageHeight=boxOrientation==='landscape'?612:792
    const currentWidth=Math.min(pageWidth,Math.max(48,Number(selectedPageBox.width)||240))
    const currentHeight=Math.min(pageHeight,Math.max(34,Number(selectedPageBox.height)||180))
    const x=Math.max(0,Math.min(pageWidth-currentWidth,Number(selectedPageBox.x)||0))
    const y=Math.max(0,Math.min(pageHeight-currentHeight,Number(selectedPageBox.y)||0))
    const rounded=Math.round(next)
    const value=field==='x'?Math.max(0,Math.min(pageWidth-currentWidth,rounded)):
      field==='y'?Math.max(0,Math.min(pageHeight-currentHeight,rounded)):
      field==='width'?Math.max(48,Math.min(pageWidth-x,rounded)):
      Math.max(34,Math.min(pageHeight-y,rounded))
    editTemplateBox(page,selectedPageBox.id,{[field]:value})
  }
  const deleteTemplateBox=(pageId,id)=>update({...workspace,pageBoxes:{...workspace.pageBoxes,
    [pageId]:(workspace.pageBoxes?.[pageId]||[]).filter(b=>b.id!==id)}})
  const set3DMarkers=items=>update({...workspace,interactiveMarkers:items.slice(0,60)})
  const addColorway=()=>onChange?.(editNativeTechPackDocument(state,addTechPackColorway(draft,{name:`Colorway ${colorways.length+1}`})))
  const editColorway=(id,patch)=>onChange?.(editNativeTechPackDocument(state,updateTechPackColorway(draft,id,patch)))
  const deleteColorway=id=>onChange?.(editNativeTechPackDocument(state,removeTechPackColorway(draft,id)))
  const saveRevision=()=>{
    const title=revisionLabel.trim()||`Development revision ${revisions.length+1}`
    const checkpoint=createTechPackCheckpoint(source,draft,workspace,title)
    update({...workspace,revisions:appendTechPackCheckpoint(revisions,checkpoint)})
    setRevisionLabel('')
  }
  const editHeaderField=(key,val)=>update({...workspace,headerFields:{...workspace.headerFields,[key]:val}})
  const field=(key,val)=>onChange?.(editNativeTechPackDocument(state,{[key]:val}))
  const refreshSpecifications=()=>{
    if(!source.ready||!window.confirm('Refresh measurements, fabric specifications and material BOM from the current garment? This replaces manual values on those three sheets; custom tables, swatch photos and notes stay intact.'))return
    onChange?.({...state,draft:{...draft,
      pom:structuredClone(source.pom||{}),
      bom:source.fabrics.map(f=>({id:f.id,description:f.name,color:f.color,gsm:f.gsm,thickness:f.thickness,quantity:null,unit:'',supplier:f.supplier||'',cost:null})),
      workspace:{...workspace,cells:{...workspace.cells,measurements:{},fabrics:{},materials:{}}}}})
  }
  const setCell=(pageId,id,index,val)=>{
    const oldOverride=workspace.cells?.[pageId]||{}
    const cells={...workspace.cells,[pageId]:{...oldOverride,[id]:{...oldOverride[id],[index]:val}}}
    const changes={}
    // Keep edited measurement values in the shared Tech Pack draft so both
    // the page editor and existing traditional exports see the same POM table.
    const pageTable=techPackPageTable(pageId,source,{...draft,pom:source.kind==='project'?source.pom:(draft.pom&&Object.keys(draft.pom).length?draft.pom:source.pom),samples:state.samples})
    if(pageId==='measurements'&&index>0&&index<pageTable.headers.length-1){
      const sizes=Object.keys(Object.keys(draft.pom||{}).length?draft.pom:source.pom||{})
      if(index===1||sizes[index-2]){
        const number=Number(val)
        if(val.trim()!==''&&Number.isFinite(number)&&number>=0&&number<=10000){
          const run=Object.keys(draft.pom||{}).length?draft.pom:source.pom||{}
          changes.pom=Object.fromEntries(Object.entries(run).map(([size,rows])=>[size,rows.map(m=>m.id===id?
            {...m,...(index===1?{toleranceCm:number}:size===sizes[index-2]?{cm:number}:{})}:m)]))
        }
      }
    }
    const materialEdit=editTechPackMaterialCell(source,workspace,draft,pageId,id,index,val)
    if(materialEdit?.bom)changes.bom=materialEdit.bom
    update({...workspace,cells:materialEdit?.cells||cells},changes)
  }
  const changeRow=(pageId,id,index,val)=>{
    const rows=workspace.extraRows?.[pageId]||[]
    if(rows.some(r=>r.id===id))update({...workspace,extraRows:{...workspace.extraRows,[pageId]:rows.map(r=>r.id===id?{...r,cells:r.cells.map((c,i)=>i===index?val:c)}:r)}})
    else setCell(pageId,id,index,val)
  }
  const addRow=(pageId=page)=>{
    const rows=workspace.extraRows?.[pageId]||[]
    const headers=techPackPageTable(pageId,source,{...draft,samples:state.samples}).headers
    update({...workspace,extraRows:{...workspace.extraRows,[pageId]:[...rows,{id:uid(),cells:headers.map(()=>'')}]}})
  }
  const removeRow=(pageId,id)=>update({...workspace,extraRows:{...workspace.extraRows,[pageId]:(workspace.extraRows?.[pageId]||[]).filter(r=>r.id!==id)}})
  const attach=id=>{
    if(selectedBoardObject?.pageId===page&&/^render-(front|back|side)$/.test(selectedBoardObject.id)){
      const renderId=selectedBoardObject.id
      const original=workspace.boardObjects?.[page]?.[renderId]||{}
      update({...workspace,boardObjects:{...workspace.boardObjects,[page]:{
        ...workspace.boardObjects?.[page],[renderId]:{...original,assetId:id}}}})
      setLayoutNotice('Render image replaced independently. Its position, size and view label remain intact.')
      return
    }
    if(selectedBoardObject?.pageId===page&&selectedBoardObject.id.startsWith('box-')){
      editTemplateBox(page,selectedBoardObject.id.slice(4),{assetId:id})
      setLayoutNotice('Image replaced inside this box. The original box geometry, size and other content remain unchanged.')
      return
    }
    if(selectedBoardObject?.pageId===page&&selectedBoardObject.id==='footer-logo'){
      update({...workspace,pageFooterAssets:{...workspace.pageFooterAssets,[page]:id}})
      setLayoutNotice('Footer logo replaced without changing its artboard transform or factory information.')
      return
    }
    if(selectedBoardObject?.pageId===page&&selectedBoardObject.id.startsWith('asset-')){
      const oldId=selectedBoardObject.id.slice(6)
      const prior=workspace.pageAssets?.[page]||[]
      const updated=prior.map(key=>key===oldId?id:key)
      if(!updated.includes(id))updated.push(id)
      const before=workspace.boardObjects?.[page]||{}
      const revised={...before,['asset-'+id]:{...(before['asset-'+id]||{}),...(before['asset-'+oldId]||{})}}
      if(oldId!==id)delete revised['asset-'+oldId]
      update({...workspace,pageAssets:{...workspace.pageAssets,[page]:[...new Set(updated)]},
        boardObjects:{...workspace.boardObjects,[page]:revised}})
      setSelectedBoardObject({pageId:page,id:'asset-'+id})
      setLayoutNotice('Photo replaced. Existing position and bounding-box scale preserved.')
      return
    }
    update({...workspace,pageAssets:{...workspace.pageAssets,[page]:linked.has(id)?[...linked].filter(x=>x!==id):[...linked,id]}})
  }
  const updateAssetCaption=(assetId,caption)=>{
    const safeCaption=String(caption).slice(0,160)
    if((workspace.assets||[]).some(asset=>asset.id===assetId)){
      update({...workspace,assets:workspace.assets.map(asset=>asset.id===assetId?{...asset,caption:safeCaption}:asset)})
    }else if((draft.references||[]).some(asset=>asset.id===assetId)){
      onChange?.(editNativeTechPackDocument(state,{references:draft.references.map(asset=>asset.id===assetId?{...asset,caption:safeCaption}:asset)}))
    }
  }
  const linkFabricSwatch=(fabricId,assetId)=>{
    const linkedWorkspace=setTechPackFabricSwatch(workspace,fabricId,assetId)
    update({...linkedWorkspace,pageAssets:assetId?{
      ...linkedWorkspace.pageAssets,fabrics:[...new Set([...(workspace.pageAssets?.fabrics||[]),assetId])]
    }:linkedWorkspace.pageAssets})
  }
  const uploadFabricSwatch=fabricId=>{
    pendingFabricSwatchRef.current=fabricId
    navigateToPage('fabrics')
    uploadRef.current?.click()
  }
  const uploadGeneralReference=()=>{
    pendingFabricSwatchRef.current=''
    uploadRef.current?.click()
  }
  const classifyAsset=(id,category)=>{
    if(!CATEGORIES.includes(category))return
    update({...workspace,assetFolderOverrides:{...workspace.assetFolderOverrides,[id]:category}})
  }
  const deleteAsset=id=>{
    if(!window.confirm('Remove this uploaded asset from the tech pack?'))return
    const next=removeTechPackFabricSwatchAsset({...workspace,assets:(workspace.assets||[]).filter(a=>a.id!==id),pageAssets:Object.fromEntries(Object.entries(workspace.pageAssets||{}).map(([k,v])=>[k,v.filter(x=>x!==id)]))},id)
    const remaining=refs.filter(a=>a.id!==id).map(({_source,_src,...a})=>a)
    update(next,{references:remaining,technicalFlat:draft.technicalFlat?.referenceId===id?null:draft.technicalFlat})
    setSelectedAsset('')
  }
  const handleUpload=async event=>{
    const files=[...(event.target.files||[])].slice(0,12)
    const fabricId=pendingFabricSwatchRef.current
    pendingFabricSwatchRef.current=''
    event.target.value=''
    if(!files.length)return
    if(refs.length+uploads.length+files.length>35){setError('The local tech pack supports up to 35 uploaded assets.');return}
    const imported=[]
    for(const file of files){
      try{const dataUrl=await readReference(file);imported.push({id:uid(),name:file.name,caption:file.name.replace(/\.[^.]+$/,''),category:fabricId?'fabric swatch':assetCategory,dataUrl,createdAt:new Date().toISOString()})}
      catch(err){setError(`${file.name}: ${err.message}`)}
    }
    if(!imported.length)return
    const raster=imported.filter(i=>!i.dataUrl.startsWith('data:image/svg+xml'))
    const vector=imported.filter(i=>i.dataUrl.startsWith('data:image/svg+xml'))
    const updatedWorkspace={...workspace,assets:[...(workspace.assets||[]),...vector],pageAssets:{...workspace.pageAssets,[fabricId?'fabrics':page]:[...new Set([...(workspace.pageAssets?.[fabricId?'fabrics':page]||[]),...imported.map(i=>i.id)])]}}
    update(fabricId?setTechPackFabricSwatch(updatedWorkspace,fabricId,imported[0].id):updatedWorkspace,
      {references:[...draft.references||[],...raster]})
    setRightTab('assets');setSelectedAsset(imported[0].id)
  }
  const assetPreview=a=>safeAssetSrc(a?._src)
  const exportCsv=()=>download(`${(source.name||'garment').replace(/[^\w-]+/g,'-')}-${page}.csv`,techPackCsv({headers:table.headers,rows:combinedRows},override),'text/csv;charset=utf-8')
  const exportJson=()=>{
    // A native tech pack lives independently of the legacy project. Bundle its
    // current manufacturing snapshot into the downloaded editable document.
    const exported=nativeMode?{...state,source:{...state.source,
      project:{name:source.name,revision:source.revision},patternPieces:source.panels,
      construction:source.seams,materials:source.fabrics,sizeMeasurements:source.pom,
      grading:source.grading,productionSpec:source.productionSpec}}:state
    download(`${(source.name||'garment').replace(/[^\w-]+/g,'-')}-techpack-draft.json`,JSON.stringify(exported,null,2),'application/json')
  }
  const printFullPack=()=>{
    // Export the same source-derived SVG drawings and author annotations that
    // the engineer sees in the EXO native document editor.
    const artwork=Object.fromEntries(documentPages.map(p=>{
      const el=[...(scrollRef.current?.querySelectorAll('[data-techpack-sheet]')||[])].find(item=>item.getAttribute('data-techpack-sheet')===p.id)
      const drawing=el?.querySelector('[data-annotation-surface]')?.cloneNode(true)
      drawing?.querySelectorAll('[data-editor-only]').forEach(node=>node.remove())
      drawing?.querySelectorAll('[stroke="#2189b6"]').forEach(node=>node.setAttribute('stroke','#c63e3e'))
      return [p.id,drawing?.outerHTML||'']
    }))
    const html=renderTechPackWorkspacePrintHTML(source,draft,workspace,assets,artwork,renderViews)
    const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}))
    const preview=window.open(url,'_blank')
    if(!preview){
      URL.revokeObjectURL(url)
      download(`${(source.name||'garment').replace(/[^\w-]+/g,'-')}-all-techpack-pages.html`,html,'text/html;charset=utf-8')
      setError('The full pack was downloaded as printable HTML because the preview window was blocked.')
    }else window.setTimeout(()=>URL.revokeObjectURL(url),60000)
  }

  const renderSheet=sheetDef=>{
    const sheetId=sheetDef.id
    // Source specification edits keep their original stable storage IDs when
    // diagrams and dense factory tables are shown on separate Letter sheets.
    const specificationId=sheetId==='measurement-table'?'measurements':sheetId==='construction-operations'?'construction':sheetId
    const sheetDetails=workspace.pages?.[sheetId]||{}
    const {orientation:sheetOrientation,paperSize:sheetPaperSize}=techPackPageLayout(workspace,sheetId)
    const sheetPreset=sheetDetails.headerPreset||workspace.headerPreset||'seville'
    const sheetTable=techPackPageTable(sheetId,source,{...draft,
      pom:source.kind==='project'?source.pom:(draft.pom&&Object.keys(draft.pom).length?draft.pom:source.pom),samples:state.samples})
    const sheetOverrides=workspace.cells?.[specificationId]||{}
    const sheetExtraRows=workspace.extraRows?.[specificationId]||[]
    const sheetRows=[...sheetTable.rows,...sheetExtraRows]
    const sheetLinked=new Set(workspace.pageAssets?.[sheetId]||[])
    const sheetAssets=assets.filter(a=>sheetLinked.has(a.id)||((sheetId==='flats'||sheetId==='artwork')&&draft.technicalFlat?.referenceId===a.id))
    const sheetAnnotations=workspace.annotations?.[sheetId]||[]
    const drawingPages=new Set(['flats','callouts','patterns','measurements','construction','artwork'])
    const showDrawing=drawingPages.has(sheetId)||sheetAnnotations.some(item=>item.scope!=='page')||
      (page===sheetId&&['pen','bezier','arrow','dimension','marker'].includes(annotationTool))
    const sheetLayout=sheetDetails.layoutPreset||workspace.layoutPreset||'balanced'
    const theme=TECHPACK_THEMES.find(t=>t.id===(sheetDetails.templateTheme||workspace.templateTheme))||TECHPACK_THEMES[0]
    const sheetColors={...theme,...workspace.templateColors,...sheetDetails.templateColors}
    const measurementRefs=['measurements','measurement-table'].includes(sheetId)?measurementReferenceRows(sheetRows):[]
    const board=(id,content)=>workspace.hiddenObjects?.[sheetId]?.includes(id)?null:<TechPackBoardObject key={id} id={id} pageId={sheetId} enabled={editMode==='layout'} keyboardEnabled={selectedBoardObject?.id===id}
      selected={selectedBoardObjects.some(item=>item.pageId===sheetId&&item.id===id)}
      onSelect={selectBoardObject} onChange={updateBoardObject} onGestureStart={boardGestureStart} onContextAction={layoutContext} value={workspace.boardObjects?.[sheetId]?.[id]||{}}
      style={{zIndex:workspace.boardObjects?.[sheetId]?.[id]?.zIndex??(selectedIds.includes(id)?25:2)}}
      onEnterContent={()=>focusSelectedContent(sheetId,id)}>{sheetId==='interactive3d'&&['spec-table','notes'].includes(id)?<details className="tpws-3d-supplement"><summary>{id==='notes'?'Page notes & manufacturing comments':'Additional specifications'}</summary>{content}</details>:content}</TechPackBoardObject>
    const renderCustomTable=custom=>board('table-'+custom.id,<section key={custom.id} className="tpws-table-section tpws-custom-table" aria-label="Custom specification table">
            <div className="tpws-custom-table-heading"><div><span>CUSTOM SPECIFICATION / {sheetDef.tag}</span><input aria-label="Custom table title" value={custom.title||''} onChange={event=>editTable(sheetId,custom.id,t=>({...t,title:event.target.value.slice(0,100)}))}/></div>
              <button type="button" title="Download this editable table as CSV" aria-label={`Export table ${custom.title} CSV`} onClick={()=>download(`${(source.name||'garment')}-${sheetId}-${custom.title||'table'}`.replace(/[^\w-]+/g,'-').slice(0,105)+'.csv',techPackCsv({headers:custom.headers,rows:custom.rows}),'text/csv;charset=utf-8')}><Download size={14}/></button>
              <button type="button" title="Delete custom table" aria-label={`Delete table ${custom.title}`} onClick={()=>removeTable(sheetId,custom.id)}><Trash2 size={14}/></button></div>
            <div className="tpws-custom-grid-mount">
              <TechPackSpreadsheetBlock table={custom} sourceLabel={custom.title||'Custom Techpack specification'}
                readOnly={editMode==='layout'} onChange={next=>editTable(sheetId,custom.id,()=>next)}
                onExit={()=>setSelectedBoardObject(null)}/>
            </div>
          </section>)
    const boxDrawingSurface=editMode==='layout'&&annotationTool==='box'?<div className="tpws-box-drawing-surface" aria-label={`Draw a rectangle on ${sheetDetails.title||sheetDef.name}`}
      onPointerDown={e=>boxGestureStart(e,sheetId)} onPointerMove={boxGestureMove} onPointerUp={boxGestureEnd} onPointerCancel={()=>{boxGesture.current=null;setBoxPreview(null)}}>
      {boxPreview?.pageId===sheetId&&<div className="tpws-box-drawing-preview" style={{left:boxPreview.x,top:boxPreview.y,width:boxPreview.width,height:boxPreview.height}}/>}
    </div>:null
    const positionedBoxes=(workspace.pageBoxes?.[sheetId]||[]).filter(box=>sheetId.startsWith('custom-')||box.positionMode==='absolute').map(box=>
      <TechPackBoardObject key={box.id} id={`box-${box.id}`} pageId={sheetId} enabled={editMode==='layout'} keyboardEnabled={selectedBoardObject?.id===`box-${box.id}`}
        selected={selectedBoardObjects.some(item=>item.pageId===sheetId&&item.id===`box-${box.id}`)}
        onSelect={selectBoardObject} onChange={updateBoardObject} onGestureStart={boardGestureStart} onContextAction={layoutContext}
        onEnterContent={()=>focusSelectedContent(sheetId,'box-'+box.id)}
        value={workspace.boardObjects?.[sheetId]?.[`box-${box.id}`]||{}}
        style={{position:'absolute',left:Number(box.x)||0,top:Number(box.y)||0,width:box.width,height:box.height,zIndex:workspace.boardObjects?.[sheetId]?.[`box-${box.id}`]?.zIndex??(selectedIds.includes(`box-${box.id}`)?25:2)}}>
        <div className="tpws-freeform-box" style={{width:'100%',height:'100%',border:`1.5px ${box.border==='dashed'?'dashed':'solid'} ${box.lineColor||'#252c34'}`}}
          onDoubleClick={()=>{if(editMode==='layout'){setEditMode('content');setAnnotationTool('select')}}}>
          <TechPackBoxContent box={box} layoutMode={editMode==='layout'} assets={assets} onEdit={patch=>editTemplateBox(sheetId,box.id,patch)}
            onDelete={()=>deleteTemplateBox(sheetId,box.id)} onApplyTemplate={preset=>applyDroppedPreset(preset,sheetId,box.id)}
            onAssetPick={()=>{setLibrarySection('assets');setRightTab('assets');setLayoutNotice('Choose an image in the Assets library and attach it to your selected box.');setSelectedBoardObject({pageId:sheetId,id:'box-'+box.id})}}/>
        </div>
      </TechPackBoardObject>)
    // Unlike built-in manufacturing pages, a custom page is a genuinely empty
    // white sheet: no inherited factory header, frame, notes or footer. It
    // contains only the elements that the designer deliberately adds.
    if(sheetId.startsWith('custom-'))return <div key={sheetId} className={`tpws-sheet-frame tpws-sheet-frame-${sheetOrientation}`}
      data-paper-size={sheetPaperSize} style={{zoom:documentZoom==='fit'?Math.max(.5,Math.min(1.5,(canvasWidth-96)/(sheetOrientation==='landscape'?792:612))):Number(documentZoom)}}>
      <div className="tpws-sheet-frame-caption"><span>{sheetDef.tag} / {documentPages.length} · {sheetDetails.title||sheetDef.name}</span><span>{sheetOrientation.toUpperCase()} · {sheetPaperSize==='Letter'?'8.5 × 11 IN':'A4'}</span></div>
      <article className={`tpws-paper tpws-custom-empty-sheet tpws-${sheetOrientation} ${editMode==='layout'?'tpws-layout-editing':''}`}
        data-artboard-grid={editMode==='layout'&&workspace.artboardGuides?.[sheetId]?.visible?'visible':'hidden'}
        data-testid={sheetId===page?'techpack-page':undefined} data-techpack-sheet={sheetId} data-custom-blank="true" data-paper-size={sheetPaperSize} data-orientation={sheetOrientation}
        onPointerDown={e=>{if(e.target===e.currentTarget&&editMode==='layout'&&annotationTool==='select')selectBoardObject(null)}}
        onDragOver={e=>{if(e.dataTransfer.types.includes('application/x-exo-techpack-template'))e.preventDefault()}}
        onDrop={e=>handlePageTemplateDrop(e,sheetId)}>
        {positionedBoxes}
        {(workspace.tables?.[sheetId]||[]).map(renderCustomTable)}
        {(workspace.pageAssets?.[sheetId]||[]).map(id=>assets.find(item=>item.id===id)).filter(Boolean).map(asset=>board('asset-'+asset.id,
          <figure className="tpws-custom-page-image">{assetPreview(asset)?<img src={assetPreview(asset)} alt={asset.caption||asset.name}/>:<FileImage size={28}/>}<figcaption>{asset.caption||asset.name}</figcaption></figure>))}
        {boxDrawingSurface}
      </article>
    </div>
    return <div className={`tpws-sheet-frame tpws-sheet-frame-${sheetOrientation}`} data-paper-size={sheetPaperSize} key={sheetId} style={{zoom:documentZoom==='fit'
      ?Math.max(.5,Math.min(1.5,(canvasWidth-96)/(sheetOrientation==='landscape'?792:612)))
      :Number(documentZoom)}}>
      <div className="tpws-sheet-frame-caption"><span>{sheetDef.tag} / {documentPages.length} · {sheetDetails.title||sheetDef.name}</span><span>{sheetOrientation.toUpperCase()} · {sheetPaperSize==='Letter'?'8.5 × 11 IN':'A4'}</span></div>
      <article className={`tpws-paper tpws-seville-paper tpws-${sheetOrientation} tpws-header-${sheetPreset} tpws-layout-${sheetLayout} ${editMode==='layout'?'tpws-layout-editing':''}`} style={{'--tpws-template-accent':sheetColors.accent,'--tpws-template-rule':sheetColors.line,'--tpws-template-wash':sheetColors.wash}} data-testid={sheetId===page?"techpack-page":undefined} data-techpack-sheet={sheetId} data-layout-style={sheetLayout} data-orientation={sheetOrientation} data-paper-size={sheetPaperSize}
        data-artboard-grid={editMode==='layout'&&workspace.artboardGuides?.[sheetId]?.visible?'visible':'hidden'}
        onBeforeInputCapture={event=>{if(editMode==='layout')event.preventDefault()}}
        onPasteCapture={event=>{if(editMode==='layout')event.preventDefault()}}
        onDragOver={event=>{if(event.dataTransfer.types.includes('application/x-exo-techpack-template'))event.preventDefault()}}
        onDrop={event=>handlePageTemplateDrop(event,sheetId)}>
          <div className="tpws-seville-top-number" aria-label={`Page ${documentPages.findIndex(p=>p.id===sheetId)+1}`}>{documentPages.findIndex(p=>p.id===sheetId)+1}</div>
          <div className="tpws-page-content-scroll" tabIndex={0} role="region" aria-label={`${sheetDetails.title||sheetDef.name} page content`}>
          <div className="tpws-seville-ruled-frame" data-seville-page-frame={sheetId}>
          {board('header',<SevilleSheetHeader source={source} draft={draft} sheetDef={sheetDef} details={sheetDetails} index={documentPages.findIndex(p=>p.id===sheetId)} total={documentPages.length}
            headerFields={workspace.headerFields||{}} onHeaderField={editHeaderField} onPageField={(key,val)=>configure({[key]:val},sheetId)}/>) }
          {sheetId==='authoring-checklist'&&<section className="tpws-authoring-checklist" aria-label="Techpack pre-production authoring checklist">
            <div className="tpws-authoring-heading"><div><strong>PRE-PRODUCTION SPECIFICATION REVIEW</strong><span>Check whether essential factory handoff fields are recorded.</span></div><span>{authoring.recorded} / {authoring.total} RECORDED</span></div>
            <div className="tpws-authoring-grid">{authoring.items.map(item=><button type="button" key={item.id} className={item.done?'tpws-authoring-done':'tpws-authoring-missing'} onClick={()=>navigateToPage(item.pageId)} title={`${item.title}: ${item.detail}`}>
              <span aria-hidden="true">{item.done?'✓':'!'}</span><strong>{item.title}</strong><small>{item.done?'Recorded':'Needs input'}</small>
            </button>)}</div>
            <p>Document fields can be completed without approval. Physical fit, fabric testing and factory sign-off are separate requirements.</p>
          </section>}
          {sheetId==='factory-review'&&<section className="tpws-factory-review" aria-label="Factory handoff readiness review">
            <div className="tpws-factory-review-heading"><div><ClipboardCheck size={17}/><strong>FACTORY HANDOFF REVIEW</strong></div><span>{factoryReview.counts.missing} MISSING · {factoryReview.counts.review} TO VERIFY</span></div>
            <p>The following records require attention before factory handoff. Physical sample and factory approval must be recorded separately.</p>
            <div className="tpws-factory-review-items">{factoryReview.items.map(item=><button key={item.id} type="button" onClick={()=>navigateToPage(item.pageId)} title={item.description}>
              <span className={item.status==='missing'?'missing':'review'}>{item.status==='missing'?'MISSING':'VERIFY'}</span><strong>{item.label}</strong><small>{item.description}</small>
            </button>)}{factoryReview.items.length===0&&<p>All tracked records are complete. Confirm physical sample testing and factory sign-off before releasing production.</p>}</div>
          </section>}
          {sheetId==='factory-review'&&<TechPackFactoryReviewPanel
            sourceTable={factoryPOMTable}
            review={workspace.factorySampleReview}
            onChange={next=>update({...workspace,factorySampleReview:next})}/>}
          {sheetId==='overview'&&!workspace.hiddenObjects?.[sheetId]?.includes('renders')&&<section className="tpws-render-reference">
            <header><span>GARMENT APPEARANCE · EXO LIVE 3D</span><button type="button" onClick={()=>window.dispatchEvent(new Event('exo-clothcraft-techpack-render-capture-request'))} title="Refresh renders from the native EXO 3D viewer"><RefreshCw size={12}/> Capture views</button></header>
            <div className="tpws-render-triptych">{['front','back','side'].map(view=>{
              const objectId=`render-${view}`
              const override=assets.find(asset=>asset.id===workspace.boardObjects?.[sheetId]?.[objectId]?.assetId)
              const imageSrc=assetPreview(override)||renderViews[view]
              return <TechPackBoardObject key={view} id={objectId} pageId={sheetId} enabled={editMode==='layout'} keyboardEnabled={selectedBoardObject?.id===objectId}
                selected={selectedBoardObjects.some(item=>item.pageId===sheetId&&item.id===objectId)}
                onSelect={selectBoardObject} onChange={updateBoardObject} onGestureStart={boardGestureStart} onContextAction={layoutContext}
                onEnterContent={()=>focusSelectedContent(sheetId,objectId)}
                value={workspace.boardObjects?.[sheetId]?.[objectId]||{}}
                style={{minWidth:0,zIndex:workspace.boardObjects?.[sheetId]?.[objectId]?.zIndex??(selectedIds.includes(objectId)?25:2)}}>
                <figure>{imageSrc?<img src={imageSrc} alt={`${view} garment reference`}/>:<div className="tpws-render-pending"><FileImage size={18}/> No {view} view captured</div>}
                  <figcaption>{view.toUpperCase()} · {override?'REFERENCE IMAGE':'3D RENDER'}</figcaption></figure>
              </TechPackBoardObject>
            })}</div>
          </section>}
          {sheetId==='measurements'&&<section className="tpws-pom-guide"><strong>05 / MEASUREMENT ENGINEERING</strong><span>Draw dimension leaders over front/back views. Link each arrow to its point of measure; reference numbers match the table below. Screen distance is not a real measured dimension.</span><button type="button" onClick={()=>{setAnnotationTool('dimension');navigateToPage(sheetId)}}><Ruler size={15}/> Add dimension</button></section>}
          {sheetId==='grading'&&<section className="tpws-pom-guide"><strong>05 / PATTERN GRADING</strong><span>Base pattern cutlines come from the current garment. Size values and incremental grade rules below come from recorded POM or grading data; graded pattern outlines are not invented.</span><button type="button" onClick={()=>navigateToPage('measurements')}><FileSpreadsheet size={15}/> POM source</button></section>}
          {sheetId==='interactive3d'&&(page===sheetId?<TechPackInteractive3D snapshot={nativeSnapshot} markers={workspace.interactiveMarkers||EMPTY_3D_MARKERS} onChange={set3DMarkers} fallbackViews={renderViews} onOpenPattern={marker=>{
            const panelId=String(marker?.panelId||'')
            if(panelId&&source.panels.some(panel=>String(panel.id)===panelId)){
              setFocused3DPanel(panelId)
              navigateToPage('patterns')
            }else setError('This detail is not linked to a source pattern piece. Place a marker on garment geometry to link a real panel.')
          }}/>:<section className="tpws-3d-page-preview"><strong>INTERACTIVE 3D GARMENT / DETAIL MAP</strong>{renderViews.front?<img src={renderViews.front} alt="3D garment front preview"/>:<p>Open this sheet for the interactive 3D viewer.</p>}<span>{(workspace.interactiveMarkers||EMPTY_3D_MARKERS).length} EDITABLE DETAIL MARKERS</span><button type="button" onClick={()=>navigateToPage('interactive3d')}>Open 3D viewer</button></section>)}
          {sheetId!=='interactive3d'&&showDrawing&&board('drawing',<TechPackTechnicalBoard pageId={sheetId} source={source} nativeSnapshot={nativeSnapshot} project={project} nativeMode={nativeMode} focusPanelId={focused3DPanel}
            measurementTable={sheetTable} measurementOverrides={sheetOverrides}
            tool={annotationTool} annotations={sheetAnnotations} selectedId={selectedAnnotationId} highlighterColor={highlightColor} highlighterWidth={highlightWidth} onAdd={addAnnotation}
            onUpdate={updateAnnotation} onDelete={deleteAnnotation} onSelect={setSelectedAnnotationId} onPageSelect={setPage}/>) }
          {sheetId==='measurements'&&<section className="tpws-pom-register"><div className="tpws-section-title"><h2>MEASUREMENT LEADER / NOTE INDEX</h2><span>{sheetAnnotations.filter(a=>a.type==='dimension'||a.type==='arrow').length} CALLOUTS</span></div>
            {sheetAnnotations.filter(a=>a.type==='dimension'||a.type==='arrow').map((a,i)=>{
              const specification=a.type==='dimension'?linkedMeasurementLabel(a,sheetTable,sheetOverrides):null
              return <div className="tpws-pom-link-row" key={a.id}><button type="button" onClick={()=>{navigateToPage(sheetId);setSelectedAnnotationId(a.id);setAnnotationTool('select')}}>{a.type==='dimension'?<Ruler size={14}/>:<MoveUpRight size={14}/>}<strong>{specification?.reference||a.label||`N${i+1}`}</strong></button>
                <span>{specification?.detail||a.instruction||'Add a detail note in the Property Editor'}</span>
                <small>{a.type==='dimension'?(a.placementVerified?'Placement checked':'Placement to verify'):'Factory note'}</small></div>
            })}
            {!sheetAnnotations.some(a=>a.type==='dimension'||a.type==='arrow')&&<div className="tpws-pom-empty">No callouts placed. Use the <strong>Dimension</strong> tool to mark two endpoints on the drawing; connect that leader to a POM in the Property Editor. Use <strong>Arrow</strong> for construction notes.</div>}
          </section>}
          {sheetId==='callouts'&&<section className="tpws-callout-register"><div className="tpws-section-title"><h2>CONSTRUCTION DETAIL / LEADER REGISTER</h2><span>{sheetAnnotations.filter(a=>a.type==='arrow').length} ARROWS</span></div>
            <p>Use the Arrow tool on the drawing above to point to a seam, trim, pocket or label. Select an arrow to move it, then fill in its factory instruction below.</p>
            <div className="tpws-table-scroll"><table className="tpws-sheet-table"><thead><tr><th>REF</th><th>COMPONENT / LOCATION</th><th>FACTORY DETAIL / DIMENSION</th></tr></thead><tbody>
              {sheetAnnotations.filter(a=>a.type==='arrow').map((a,i)=><tr key={a.id}><td><input aria-label={`Callout ${i+1} reference`} value={a.label||''} onChange={e=>updateAnnotation(sheetId,a.id,{label:e.target.value.slice(0,35)})}/></td>
                <td><input aria-label={`Callout ${i+1} component`} placeholder="e.g. sleeve hem" value={a.component||''} onChange={e=>updateAnnotation(sheetId,a.id,{component:e.target.value.slice(0,100)})}/></td>
                <td><input aria-label={`Callout ${i+1} instruction`} placeholder="Stitch type, placement, tolerance" value={a.instruction||''} onChange={e=>updateAnnotation(sheetId,a.id,{instruction:e.target.value.slice(0,260)})}/></td></tr>)}
              {!sheetAnnotations.some(a=>a.type==='arrow')&&<tr><td colSpan={3} className="tpws-empty-cells">No arrow details yet. Draw a leader line on the garment to add one.</td></tr>}
            </tbody></table></div><button type="button" className="tpws-callout-activate" onClick={()=>setAnnotationTool('arrow')}><MoveUpRight size={15}/> Draw a callout arrow</button>
          </section>}
          {sheetId==='fabrics'&&board('fabric-swatches',<section className="tpws-fabric-section"><div className="tpws-section-title"><h2>FABRIC LIBRARY / MATERIAL SWATCHES</h2><span>{source.fabrics.length} FABRIC REFERENCES</span></div>
            <div className="tpws-fabric-grid">{source.fabrics.map((fabric,i)=>{
              const entries=workspace.cells?.fabrics?.[fabric.id]||{}
              const authored=(Array.isArray(draft.bom)?draft.bom:[]).find(item=>String(item.id)===String(fabric.id))||{}
              const color=entries[1]??authored.color??fabric.color??''
              const swatch=/^#[0-9a-f]{3,8}$/i.test(String(color))?color:'#dce2e5'
              const image=getTechPackFabricSwatch(workspace,fabric.id,assets)
              const imageSrc=assetPreview(image)
              return <article className="tpws-fabric-card" key={fabric.id}>
                <div className="tpws-fabric-swatch" style={{backgroundColor:swatch}} aria-label={`${authored.description||fabric.name} material swatch`}>
                  {imageSrc&&<img src={imageSrc} alt={`${authored.description||fabric.name} fabric reference · ${image.caption||image.name}`}/>}
                  <span>FAB {String(i+1).padStart(2,'0')}</span>
                </div>
                <div><strong>{authored.description||fabric.name}</strong><small>{fabric.id} · {color||'COLOR TBD'}</small>
                <dl><div><dt>COMPOSITION</dt><dd>{(entries[2]??authored.composition??fabric.composition)||'Specify fiber mix'}</dd></div><div><dt>WEIGHT</dt><dd>{(entries[3]??authored.gsm??fabric.gsm)||'—'} GSM</dd></div><div><dt>MILL</dt><dd>{(entries[7]??authored.supplier??fabric.supplier)||'Not assigned'}</dd></div></dl>
                <div className="tpws-fabric-link"><label>Fabric photo
                  <select aria-label={`Fabric swatch photo for ${fabric.name}`} value={imageSrc?image.id:''} onChange={e=>linkFabricSwatch(fabric.id,e.target.value)}>
                    <option value="">No linked photo</option>
                    {assets.filter(a=>assetPreview(a)).map(asset=><option value={asset.id} key={asset.id}>{asset.caption||asset.name}</option>)}
                  </select></label>
                  <button type="button" title={`Upload a swatch photograph for ${fabric.name}`} onClick={()=>uploadFabricSwatch(fabric.id)}><ImagePlus size={13}/> Upload</button>
                </div></div>
              </article>
            })}{!source.fabrics.length&&<p className="tpws-origin-note">No fabric is assigned in the garment source. Add fabrics in EXO or enter rows in the specification below.</p>}</div>
            <p className="tpws-fabric-hint">Assign a photographed swatch to each fabric. The selected image is saved with the document and printed beside that fabric. Verify mill approval and lab dips separately; linking a photograph is not factory approval. Record composition, usable width, stretch, shrinkage and finish below.</p>
          </section>)}
          {sheetId==='colorways'&&<section className="tpws-colorway-library" aria-label="Editable garment colorways">
            <div className="tpws-section-title"><h2>COLORWAY LIBRARY / FINISHES</h2><span>{colorways.length} VARIATIONS</span></div>
            <p>Record each version's actual fabric, color standard, wash, and factory instructions. These specifications are saved with the garment Techpack.</p>
            <div className="tpws-colorway-grid">{colorways.map(colorway=><article className="tpws-colorway-card" key={colorway.id}>
              <div className="tpws-colorway-swatch" style={{background:/^#[0-9a-f]{6}$/i.test(colorway.hex)?colorway.hex:'#e6eaed'}}><span>{colorway.name||'UNNAMED COLORWAY'}</span></div>
              <div className="tpws-colorway-fields">
                <label>Colorway name<input aria-label={`Colorway ${colorway.id} name`} maxLength={80} value={colorway.name} onChange={e=>editColorway(colorway.id,{name:e.target.value})}/></label>
                <label>Reference / code<input aria-label={`Colorway ${colorway.id} color code`} maxLength={65} value={colorway.code} placeholder="Pantone or mill reference" onChange={e=>editColorway(colorway.id,{code:e.target.value})}/></label>
                <label>Preview HEX<input aria-label={`Colorway ${colorway.id} hexadecimal color`} maxLength={7} value={colorway.hex} placeholder="#000000" onChange={e=>editColorway(colorway.id,{hex:e.target.value})}/></label>
                <label>Fabric<select aria-label={`Colorway ${colorway.id} fabric`} value={colorway.fabric} onChange={e=>editColorway(colorway.id,{fabric:e.target.value})}><option value="">Select documented fabric</option>{source.fabrics.map(f=><option key={f.id} value={f.id}>{f.name||f.id}</option>)}{colorway.fabric&&!source.fabrics.some(f=>f.id===colorway.fabric)&&<option value={colorway.fabric}>{colorway.fabric} (external reference)</option>}</select></label>
                <label>Finish / wash<input aria-label={`Colorway ${colorway.id} finish`} maxLength={120} value={colorway.finish} placeholder="Garment wash, dye, coating" onChange={e=>editColorway(colorway.id,{finish:e.target.value})}/></label>
                <label>Factory notes<textarea aria-label={`Colorway ${colorway.id} notes`} rows={2} maxLength={400} value={colorway.notes} onChange={e=>editColorway(colorway.id,{notes:e.target.value})}/></label>
                <button type="button" className="tpws-colorway-delete" aria-label={`Remove ${colorway.name||colorway.id} colorway`} onClick={()=>deleteColorway(colorway.id)}><Trash2 size={13}/> Remove colorway</button>
              </div>
            </article>)}{colorways.length===0&&<p className="tpws-colorway-empty">No colorways authored. Create a version for each planned fabric color and treatment.</p>}</div>
            <button type="button" className="tpws-colorway-add" onClick={addColorway}><Plus size={14}/> Add colorway</button>
          </section>}
          {sheetAssets.length>0&&(['flats','artwork','fabrics'].includes(sheetId))&&<section className="tpws-sheet-media"><h2>{sheetId==='flats'?'TECHNICAL FLATS / VISUAL CALLOUTS':sheetId==='fabrics'?'FABRIC SWATCH PHOTOGRAPHS / APPROVAL REFERENCES':'ARTWORK / LOGOS / PLACEMENTS'}</h2>
            <div className="tpws-sheet-gallery">{sheetAssets.map(a=>board('asset-'+a.id,<figure key={a.id}>{assetPreview(a)?<img src={assetPreview(a)} alt={a.caption||a.name}/>:<div className="tpws-empty-image"><FileImage size={32}/><span>{a.name}</span></div>}<figcaption><strong>{a.caption||a.name}</strong><span>{a.category||'Reference'}{a.panel?` · ${a.panel}`:''}</span></figcaption></figure>))}</div>
          </section>}
          {sheetTable.headers.length>0 && !['flats','patterns','colorways','measurements','construction'].includes(sheetId)&&(sheetId!=='artwork'||sheetRows.length>0)&&board('spec-table',<section className="tpws-table-section"><div className="tpws-section-title"><h2>{sheetId==='grading'?'PATTERN GRADING / SIZE RULES':sheetId==='artwork'?'GRAPHIC DIMENSIONS & PLACEMENTS':sheetId==='measurement-table'?'POINTS OF MEASURE · CM':sheetId==='construction-operations'?'SEWING OPERATION REGISTER':sheetId==='pattern-cutlist'?'PATTERN CUT LIST':sheetId==='materials'?'BILL OF MATERIALS':sheetId==='fabrics'?'FABRIC PERFORMANCE SPECIFICATIONS':sheetId==='packaging'?'PACKAGING & FOLDING INSTRUCTIONS':`${sheetDef.name.toUpperCase()} / SPECIFICATION`}</h2><span>{sheetRows.length} ROWS</span></div>
            <div className="tpws-table-scroll"><table className={`tpws-sheet-table ${sheetId==='measurement-table'?'tpws-measurement-grid':''}`}><thead><tr>{sheetId==='measurement-table'&&<th scope="col">REF</th>}{sheetTable.headers.map((col,i)=><th key={`${col}-${i}`} scope="col">{col}</th>)}{sheetExtraRows.length>0&&<th aria-label="Row actions"/>}</tr></thead><tbody>{sheetRows.map((r,ri)=><tr key={r.id}>
              {sheetId==='measurement-table'&&<td className="tpws-pom-ref">{measurementRefs[ri]?.reference||''}</td>}
              {r.cells.map((cell,ci)=><td key={`${r.id}-${ci}`}><input type="text" aria-label={`${sheetTable.headers[ci]} row ${ri+1}`} value={sheetExtraRows.some(x=>x.id===r.id)?cell:sheetOverrides[r.id]?.[ci]??cell} onChange={e=>changeRow(specificationId,r.id,ci,e.target.value)} title="Edit this specification cell"/></td>)}
              {sheetExtraRows.length>0&&<td className="tpws-row-action">{sheetExtraRows.some(x=>x.id===r.id)&&<button title="Remove custom row" aria-label={`Remove custom row ${ri+1}`} type="button" onClick={()=>removeRow(specificationId,r.id)}><Trash2 size={13}/></button>}</td>}
            </tr>)}{!sheetRows.length&&<tr><td colSpan={sheetTable.headers.length+(sheetId==='measurement-table'?2:1)} className="tpws-empty-cells">{source.ready?'No source entries yet. Add a custom specification row or update the garment design.':'Waiting for native garment data.'}</td></tr>}</tbody></table></div>
            <div className="tpws-table-actions"><button type="button" onClick={()=>addRow(specificationId)}><Plus size={14}/> Add specification row</button><span>Calculated values come from the garment. Cells can be edited for this tech pack.</span></div>
          </section>)}
          {(workspace.tables?.[sheetId]||[]).map(renderCustomTable)}
          {(workspace.pageBoxes?.[sheetId]||[]).filter(box=>box.positionMode!=='absolute'&&!workspace.hiddenObjects?.[sheetId]?.includes('box-'+box.id)).map(box=><TechPackBoardObject key={box.id} id={`box-${box.id}`} pageId={sheetId} enabled={editMode==='layout'} keyboardEnabled={selectedBoardObject?.id===`box-${box.id}`}
            selected={selectedBoardObjects.some(item=>item.pageId===sheetId&&item.id===`box-${box.id}`)} value={workspace.boardObjects?.[sheetId]?.[`box-${box.id}`]||{}}
            onSelect={selectBoardObject} onChange={updateBoardObject} onGestureStart={boardGestureStart} onContextAction={layoutContext}>
            <section className="tpws-inserted-box" aria-label={`Inserted ${box.title}`} style={{width:box.width,height:box.height,border:`2px ${box.border} ${box.lineColor}`}}>
              <header><input aria-label="Box title" value={box.title} maxLength={80} onChange={e=>editTemplateBox(sheetId,box.id,{title:e.target.value})}/>
                <button type="button" title="Remove box" aria-label={`Delete box ${box.title}`} onClick={()=>deleteTemplateBox(sheetId,box.id)}><Trash2 size={13}/></button></header>
              <textarea aria-label={`Notes for ${box.title}`} placeholder="Add an authored factory detail or reference…" value={box.note} maxLength={500} onChange={e=>editTemplateBox(sheetId,box.id,{note:e.target.value})}/>
            </section>
          </TechPackBoardObject>)}
          {sheetId==='measurements'&&source.kind==='native'&&Object.keys(source.pom||{}).length===0&&<p className="tpws-origin-note">The native garment has no currently calculated graded POM data. {source.pomStatus||'Add a native grading point of measure or enter manual values; verify against physical samples before production.'}</p>}
          {sheetId==='notes'&&<section className="tpws-revision-history" aria-label="Techpack revision checkpoint history">
            <div className="tpws-section-title"><h2>REVISION CHECKPOINTS / SPECIFICATION CHANGES</h2><span>{revisions.length} SAVED</span></div>
            <p>Save a named checkpoint before changing the garment, measurements, materials or 3D notes. Each checkpoint stores compact specification data and the garment revision, excluding images and meshes.</p>
            <div className="tpws-revision-controls"><input aria-label="New revision checkpoint name" value={revisionLabel} maxLength={100} placeholder={`Revision ${revisions.length+1} · e.g. sample 2 feedback`} onChange={e=>setRevisionLabel(e.target.value)}/><button type="button" onClick={saveRevision}><Plus size={13}/> Save checkpoint</button></div>
            <div className="tpws-revision-list">{[...revisions].reverse().map((revision,index)=><div className="tpws-revision-row" key={revision.id}><strong>{revision.title||'Revision'}</strong><span>{Number.isFinite(Date.parse(revision.createdAt))?new Date(revision.createdAt).toLocaleString():'Date unavailable'}</span><small>Garment revision: {String(revision.snapshot?.source?.revision??'not recorded')}</small>{index===0&&index<revisions.length-1&&<b>Latest checkpoint</b>}</div>)}{revisions.length===0&&<p>No checkpoints yet. Save the starting sample specifications to compare future changes.</p>}</div>
            {revisions.length>1&&<div className="tpws-revision-diff"><strong>LAST TWO CHECKPOINTS · {revisionChanges.length} CHANGES</strong><div>{revisionChanges.slice(0,40).map((change,i)=><p key={`${change.section}-${change.field}-${i}`}><b>{change.section}</b> {change.description}</p>)}{revisionChanges.length===0&&<p>No differences in the tracked specifications.</p>}{revisionChanges.length>40&&<p>{revisionChanges.length-40} more changes in these revisions.</p>}</div></div>}
          </section>}
          {sheetId!=='flats'&&sheetId!=='artwork'&&sheetAssets.length>0&&<div className="tpws-sheet-small-assets"><h2>ATTACHED REFERENCES</h2>{sheetAssets.map(a=>board('asset-'+a.id,<figure key={a.id}>{assetPreview(a)?<img src={assetPreview(a)} alt={a.name}/>:<FileImage size={28}/>}<figcaption>{a.caption||a.name}</figcaption></figure>))}</div>}
          {board('notes',<section className="tpws-sheet-notes"><h2>{sheetId==='construction'?'CONSTRUCTION INSTRUCTIONS':sheetId==='patterns'?'PATTERN / CUTTING NOTES':'PAGE NOTES & MANUFACTURING COMMENTS'}</h2><textarea aria-label="Page notes" placeholder="Add instructions, tolerances, annotations, placement notes or open questions for your factory…" value={sheetDetails.notes||''} onChange={e=>configure({notes:e.target.value},sheetId)}/></section>)}
          <TechPackPageMarkup pageId={sheetId} active={annotationTool==='highlighter'} color={highlightColor} width={highlightWidth} annotations={sheetAnnotations} onAdd={addAnnotation}/>
          </div>
          </div>
          {board('footer-logo',<footer className="tpws-sheet-footer tpws-seville-footer" aria-label="Techpack footer">
            {assets.find(item=>item.id===workspace.pageFooterAssets?.[sheetId])&&assetPreview(assets.find(item=>item.id===workspace.pageFooterAssets?.[sheetId]))?
              <img className="tpws-seville-footer-logo" src={assetPreview(assets.find(item=>item.id===workspace.pageFooterAssets?.[sheetId]))} alt="Custom selected footer artwork"/>:
              draft.brand?.trim()&&!/^mikristian$/i.test(draft.brand.trim())?<span className="tpws-seville-footer-brand">{draft.brand}</span>:null}
            <span className="tpws-seville-footer-caption">TECHNICAL SPECIFICATION · DEVELOPMENT COPY · NOT FACTORY APPROVED</span>
          </footer>)}
          {positionedBoxes}
          {boxDrawingSurface}
        </article>
    </div>
  }
  
  return <div className="tpws-root tpws-native-editor" role="region" aria-label="EXO Techpack document canvas" data-testid="techpack-workspace">
    {hosts?.library&&createPortal(<section className="tpws-native-library" aria-label="Techpack Library">
      <header className="tpws-native-panel-title"><FolderOpen size={15}/> LIBRARY <small>{librarySection==='templates'?'TEMPLATE SYSTEM':'PROJECT ASSETS'}</small></header>
      <div className="tpws-library-view-tabs" role="tablist" aria-label="Techpack Library views">
        <button type="button" role="tab" aria-selected={librarySection==='assets'} onClick={()=>setLibrarySection('assets')}><FolderOpen size={14}/> Assets</button>
        <button type="button" role="tab" aria-selected={librarySection==='templates'} onClick={()=>setLibrarySection('templates')}><LayoutTemplate size={14}/> Templates</button>
      </div>
      {librarySection==='templates'?<TechPackTemplateLibrary workspace={workspace} page={page} onApply={applyTemplatePreset} onNavigate={navigateToPage}
        onCreatePage={createPageFromSavedTemplate} onCreatePack={applyFullTechpackTemplate} onRestyle={template=>applyTemplatePreset(template,page)}
        onInsertBox={template=>insertTemplateBox(template,page)} onInsertTable={template=>insertExcelWidget(template,page)}/>:<>
      <div className="tpws-native-library-controls">
        <input aria-label="Search techpack assets" placeholder="Search assets..." value={assetSearch} onChange={event=>setAssetSearch(event.target.value)}/>
        <select aria-label="Asset type for uploads" value={assetCategory} onChange={event=>setAssetCategory(event.target.value)}>{CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select>
        <button type="button" className="tpws-native-action" onClick={uploadGeneralReference}><Upload size={14}/> Import image / SVG</button>
      </div>
      <nav className="tpws-asset-folders" aria-label="Techpack asset folders">
        <p><FolderOpen size={13}/> PROJECT ASSET FOLDERS</p>
        {TECHPACK_ASSET_FOLDERS.map(folder=><button type="button" key={folder.id} className={assetFolder===folder.id?'active':''}
          aria-current={assetFolder===folder.id?'page':undefined} aria-label={`Open ${folder.name} folder`}
          onClick={()=>{setAssetFolder(folder.id);setAssetCategory(assetFolderDefault(folder.id));setAssetFilter('all')}}>
          <FolderOpen size={14}/><span>{folder.name}</span><small>{assets.filter(a=>assetInFolder(a,folder.id)).length}</small>
        </button>)}
      </nav>
      {error&&<p className="tpws-error" role="alert">{error}</p>}
      <div className="tpws-native-assets">{assets.filter(a=>assetInFolder(a,assetFolder)&&(assetFilter==='all'||a.category===assetFilter)&&(!assetSearch||(''+(a.name||'')+' '+(a.caption||'')).toLowerCase().includes(assetSearch.toLowerCase()))).map(a=>
        <button key={a.id} type="button" className={selectedAsset===a.id?'active':''} onClick={()=>setSelectedAsset(a.id)}>
          {assetPreview(a)?<img src={assetPreview(a)} alt=""/>:a._source==='native-fabric'?<span className="tpws-asset-fabric-chip" style={{background:/^#[0-9a-f]{3,8}$/i.test(a.color)?a.color:'#d6dedc'}}/>:<FileImage size={25}/>}
          <span><strong>{a.caption||a.name}</strong><small>{a.category||'reference'}{a._source==='native'?' · garment':''}</small></span>
        </button>)}
        {!assets.some(a=>assetInFolder(a,assetFolder))&&<p className="tpws-native-empty">This folder is empty. Import a graphic, photo, label, tag or packaging design using the controls above.</p>}
      </div>
      {chosen&&<div className="tpws-native-asset-detail"><strong>{chosen.name}</strong>
        <button type="button" onClick={()=>attach(chosen.id)}>{selectedBoardObject?.pageId===page&&(selectedBoardObject.id.startsWith('box-')||selectedBoardObject.id.startsWith('asset-')||selectedBoardObject.id.startsWith('render-')||selectedBoardObject.id==='footer-logo')?'Replace selected object':linked.has(chosen.id)?'Detach from page':'Attach to current page'}</button>
        {['assets','references'].includes(chosen._source)&&<label>Image caption<input aria-label="Selected image caption" maxLength={160} value={chosen.caption||''} onChange={e=>updateAssetCaption(chosen.id,e.target.value)} placeholder="Caption shown beneath this image"/></label>}
        {chosen._source!=='native'&&chosen._source!=='native-fabric'&&<label>Move to folder<select aria-label="Selected asset folder" value={chosen.category} onChange={e=>classifyAsset(chosen.id,e.target.value)}>{CATEGORIES.map(category=><option key={category} value={category}>{category}</option>)}</select></label>}
        {chosen._source!=='native'&&chosen._source!=='native-fabric'&&<button type="button" onClick={()=>deleteAsset(chosen.id)}><Trash2 size={13}/> Remove asset</button>}
      </div>}
      </>}
    </section>,hosts.library)}
    {hosts?.objects&&createPortal(<section className="tpws-native-objects" aria-label="Techpack Object Browser">
      <header className="tpws-native-panel-title"><BookOpen size={15}/> OBJECT BROWSER <small>TECHPACK PAGES</small></header>
      <div className="tpws-native-tree-title">DOCUMENT <span>{documentPages.length} PAGES</span></div>
      {documentPages.map(p=><div key={p.id} className={`tpws-page-browser-entry ${dragPage===p.id?'is-dragging':''}`}
        draggable={editMode==='layout'} onDragStart={event=>{
          if(editMode!=='layout')return
          setDragPage(p.id);event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('application/x-exo-techpack-page',p.id)
        }} onDragEnd={()=>setDragPage('')} onDragOver={event=>{
          if(editMode==='layout'&&event.dataTransfer.types.includes('application/x-exo-techpack-page'))event.preventDefault()
        }} onDrop={event=>{
          const id=event.dataTransfer.getData('application/x-exo-techpack-page')
          if(editMode==='layout'&&id){event.preventDefault();reorderDocumentPage(id,p.id)}setDragPage('')
        }}>
        <button type="button" aria-current={page===p.id?'page':undefined} className={page===p.id?'active':''} data-page={p.id} onClick={()=>navigateToPage(p.id)}>
          <FileSpreadsheet size={15}/><span><strong>{workspace.pages?.[p.id]?.title||p.name}</strong><small>{p.tag} · {p.subtitle}</small></span><ChevronRight size={13}/>
        </button>
        {editMode==='layout'&&<div className="tpws-page-order-controls">
          <button type="button" aria-label={`Move ${p.name} up`} title="Move page up" onClick={()=>moveDocumentPage(p.id,-1)}>↑</button>
          <button type="button" aria-label={`Move ${p.name} down`} title="Move page down" onClick={()=>moveDocumentPage(p.id,1)}>↓</button>
          {p.id.startsWith('custom-')&&<button type="button" aria-label={`Delete custom page ${p.name}`} title="Delete custom page" onClick={()=>deleteCustomPage(p.id)}><Trash2 size={12}/></button>}
        </div>}
      </div>)}
      <button type="button" className="tpws-add-page-browser" onClick={addCustomPage}><Plus size={15}/> Add custom page</button>
      <div className="tpws-native-tree-title">CUSTOM TABLES <span>{(workspace.tables?.[page]||[]).length} ON THIS PAGE</span></div>
      {(workspace.tables?.[page]||[]).map((t,i)=><button key={t.id} type="button" className="tpws-object-table" onClick={()=>{
        const el=[...(scrollRef.current?.querySelectorAll('[data-techpack-sheet]')||[])].find(node=>node.getAttribute('data-techpack-sheet')===page)
        el?.querySelectorAll('.tpws-custom-table')?.[i]?.scrollIntoView({behavior:'instant',block:'center'})
      }}><Table2 size={15}/><span><strong>{t.title||'Untitled table'}</strong><small>{t.rows.length} rows · {t.headers.length} columns</small></span><ChevronRight size={13}/></button>)}
      <button type="button" className="tpws-object-table tpws-insert-object" onClick={()=>addTable()}><Plus size={14}/> Insert table on page</button>
      <div className="tpws-native-tree-title">LINKED CONTENT</div>
      <p className="tpws-native-source">{source.panels.length} patterns · {source.seams.length} seams · {source.fabrics.length} materials</p>
      <div className="tpws-native-tree-title">PAGE LAYOUT OBJECTS <span>TRANSFORM</span></div>
      {editMode==='layout'&&<p className="tpws-native-source">Shift-click objects or layers to select several. Drag one selected object to move the selection.</p>}
      {['header','drawing','renders','render-front','render-back','render-side','fabric-swatches','images','spec-table','notes','footer-logo'].map(id=><button type="button" key={id} className={`tpws-object-table ${selectedIds.includes(id)?'tpws-layer-selected':''}`} aria-pressed={selectedIds.includes(id)}
        onClick={event=>{setEditMode('layout');setAnnotationTool('select');selectBoardObject({pageId:page,id},event.shiftKey||event.metaKey||event.ctrlKey)}}>
        <Scaling size={14}/><span><strong>{id.replaceAll('-',' ').toUpperCase()}</strong><small>{workspace.hiddenObjects?.[page]?.includes(id)?'Hidden · click Restore':workspace.boardObjects?.[page]?.[id]?'Adjusted placement':'Default placement'}</small></span>
      </button>)}
      {(workspace.pageBoxes?.[page]||[]).map(box=><button key={'layer-'+box.id} type="button" className={`tpws-object-table ${selectedIds.includes('box-'+box.id)?'tpws-layer-selected':''}`}
        aria-pressed={selectedIds.includes('box-'+box.id)} onClick={event=>{setEditMode('layout');setAnnotationTool('select');selectBoardObject({pageId:page,id:'box-'+box.id},event.shiftKey||event.metaKey||event.ctrlKey)}}>
        <Square size={14}/><span><strong>{box.title||'Artboard box'}</strong><small>{liveGroups(page).some(group=>group.ids.includes('box-'+box.id))?'Grouped layer':'Independent editable layer'}</small></span>
      </button>)}
      {(workspace.pageAssets?.[page]||[]).map(id=>assets.find(asset=>asset.id===id)).filter(Boolean).map(asset=><button key={'layer-asset-'+asset.id} type="button" className={`tpws-object-table ${selectedIds.includes('asset-'+asset.id)?'tpws-layer-selected':''}`}
        aria-pressed={selectedIds.includes('asset-'+asset.id)} onClick={event=>{setEditMode('layout');setAnnotationTool('select');selectBoardObject({pageId:page,id:'asset-'+asset.id},event.shiftKey||event.metaKey||event.ctrlKey)}}>
        <FileImage size={14}/><span><strong>{asset.name||'Image'}</strong><small>{liveGroups(page).some(group=>group.ids.includes('asset-'+asset.id))?'Grouped image layer':'Image layer'}</small></span>
      </button>)}
      {(workspace.hiddenObjects?.[page]||[]).length>0&&<div className="tpws-hidden-layout-objects"><strong>HIDDEN LAYOUT OBJECTS</strong>{workspace.hiddenObjects[page].map(id=><button key={id} type="button" onClick={()=>update({...workspace,hiddenObjects:{...workspace.hiddenObjects,[page]:workspace.hiddenObjects[page].filter(value=>value!==id)}})}>Restore {id.replaceAll('-',' ')}</button>)}</div>}
    </section>,hosts.objects)}
    {hosts?.properties&&createPortal(<section className="tpws-native-properties" aria-label="Techpack Property Editor">
      <header className="tpws-native-panel-title"><Settings2 size={15}/> PROPERTY EDITOR <small>{activePage.name}</small></header>
      {editMode==='layout'&&selectedIds.length>0&&<div className="tpws-side-section tpws-selection-toolbar" aria-label="Artboard selection controls">
        <strong>{selectedIds.length} selected {selectedIds.length===1?'layer':'layers'}</strong>
        <p className="tpws-selection-hint">Drag a selected object to move the selection. Resize any selected handle to scale the whole selection.</p>
        <div className="tpws-object-direct-actions" role="group" aria-label="Group selected layers">
          <button type="button" disabled={selectedIds.length<2} onClick={groupSelection}>Group layers</button>
          <button type="button" disabled={!liveGroups(page).some(group=>group.ids.some(id=>selectedIds.includes(id)))} onClick={ungroupSelection}>Ungroup layers</button>
        </div>
        <div className="tpws-box-align" role="group" aria-label="Align selected layers">
          {[['left','Left'],['center','Center X'],['right','Right'],['top','Top'],['middle','Center Y'],['bottom','Bottom']].map(([direction,label])=><button key={direction} type="button" onClick={()=>alignBoardSelection(direction)}>{label}</button>)}
        </div>
        <div className="tpws-object-direct-actions" role="group" aria-label="Scale selected layers">
          <button type="button" onClick={()=>scaleBoardSelection(.9)}>Smaller 10%</button>
          <button type="button" onClick={()=>scaleBoardSelection(1.1)}>Larger 10%</button>
        </div>
        <div className="tpws-object-direct-actions">
          <button type="button" onClick={()=>{
            const revised={...workspace.boardObjects?.[page]}
            const upper=Math.max(2,...Object.values(revised).map(entry=>Number(entry?.zIndex)||0))
            selectedIds.forEach((id,index)=>{revised[id]={...revised[id],zIndex:upper+index+1}})
            update({...workspace,boardObjects:{...workspace.boardObjects,[page]:revised}})
          }}>Bring forward</button>
          <button type="button" onClick={()=>{
            const revised={...workspace.boardObjects?.[page]}
            selectedIds.forEach((id,index)=>{revised[id]={...revised[id],zIndex:-selectedIds.length+index}})
            update({...workspace,boardObjects:{...workspace.boardObjects,[page]:revised}})
          }}>Send backward</button>
          <button type="button" onClick={()=>selectBoardObject(null)}>Clear selection</button>
        </div>
      </div>}
      {selectedBoardObject?.pageId===page&&<div className="tpws-side-section tpws-object-properties" aria-label="Selected page object properties">
        <p className="tpws-side-label"><Scaling size={14}/> SELECTED PAGE OBJECT</p>
        <strong>{selectedBoardObject.id.replaceAll('-',' ').toUpperCase()}</strong>
        <div className="tpws-object-direct-actions">
          <button type="button" aria-label="Edit selected object's content" onClick={()=>focusSelectedContent(page,selectedBoardObject.id)}>Edit content</button>
          <button type="button" aria-label="Replace selected object image or style" onClick={()=>layoutContext(page,selectedBoardObject.id,'replace')}>Replace visual</button>
          <button type="button" aria-label="Duplicate selected layout object" onClick={()=>layoutContext(page,selectedBoardObject.id,'duplicate')}>Duplicate</button>
          <button type="button" aria-label="Delete selected layout object" onClick={()=>layoutContext(page,selectedBoardObject.id,'delete')}>Delete</button>
        </div>
        {selectedPageBox&&<div className="tpws-selected-box-properties" aria-label="Selected artboard box settings">
          <strong>ARTBOARD BOX</strong>
          <div className="tpws-box-dimensions">{[['x','Left X'],['y','Top Y'],['width','Width'],['height','Height']].map(([key,label])=><label key={key}>{label}<input type="number" aria-label={`Selected box ${label}`} min={0} max={792} value={selectedPageBox[key]??0} onChange={e=>editSelectedBoxGeometry(key,e.target.value)}/></label>)}</div>
          <div className="tpws-box-align" role="group" aria-label="Align selected box to artboard">
            {[['left','Left'],['center','Center X'],['right','Right'],['top','Top'],['middle','Center Y'],['bottom','Bottom']].map(([key,label])=><button key={key} type="button" onClick={()=>alignSelectedBox(key)} aria-label={`Align selected box ${label.toLowerCase()}`}>{label}</button>)}
          </div>
          <label>Border style<select value={selectedPageBox.border==='dashed'?'dashed':'solid'} onChange={e=>editTemplateBox(page,selectedPageBox.id,{border:e.target.value})}><option value="solid">Solid</option><option value="dashed">Dashed</option></select></label>
          <label>Border color<input type="color" aria-label="Selected box border color" value={/^#[0-9a-f]{6}$/i.test(selectedPageBox.lineColor||'')?selectedPageBox.lineColor:'#252c34'} onChange={e=>editTemplateBox(page,selectedPageBox.id,{lineColor:e.target.value})}/></label>
          <button type="button" onClick={()=>{setLibrarySection('assets');setRightTab('assets');setLayoutNotice('Choose an image to place or replace inside the selected box.')}}><ImagePlus size={13}/> Add or replace image</button>
          <button type="button" onClick={()=>insertExcelWidget(TECHPACK_TABLE_TEMPLATES[0],page)}><Table2 size={13}/> Insert Excel table in box</button>
        </div>}
        {editMode==='layout'&&['x','y','scaleX','scaleY'].map(key=>{
          const saved=workspace.boardObjects?.[page]?.[selectedBoardObject.id]||{}
          return <label key={key}>{({x:'Position X / px',y:'Position Y / px',scaleX:'Horizontal scale',scaleY:'Vertical scale'})[key]}
            <input type="number" aria-label={`Object ${key}`} step={key.startsWith('scale')?.05:1} value={saved[key]??(key.startsWith('scale')?1:0)}
              onChange={e=>updateBoardObject(page,selectedBoardObject.id,{...saved,[key]:Number(e.target.value)})}/>
          </label>
        })}
        {editMode==='layout'&&<button type="button" onClick={()=>updateBoardObject(page,selectedBoardObject.id,{x:0,y:0,scaleX:1,scaleY:1})}>Reset object position and size</button>}
      </div>}
      <div className="tpws-annotation-properties"><p className="tpws-side-label">DRAWING ANNOTATIONS</p>
        <span>{annotationTool==='select'?'Click and drag an arrow, dimension, path or marker to reposition. Select a Bezier path to edit its anchors.':annotationTool==='bezier'?'Click points on a technical drawing; drag for curved handles. Double-click or press Enter to finish.':annotationTool==='dimension'?'Drag between the two measured locations, then select and link the annotation to a POM value.':'DRAW / '+annotationTool.toUpperCase()+' TOOL ACTIVE · DRAW ON PAGE'}</span>
        {(workspace.annotations?.[page]||[]).map((item,i)=><div key={item.id} className="tpws-annotation-property-row">
          <button type="button" className={selectedAnnotationId===item.id?'active':''} onClick={()=>{setSelectedAnnotationId(item.id);setAnnotationTool('select')}}>{i+1}. {item.type==='highlighter'?'Colored marker':item.type==='dimension'?'Measurement dimension':item.type==='arrow'?'Leader arrow':item.type==='pen'?'Pen stroke':item.type==='bezier'?'Bezier path':'Detail marker'}</button>
          {selectedAnnotationId===item.id&&<><label>Annotation label<input aria-label="Selected annotation label" value={item.label||''} onChange={e=>updateAnnotation(page,item.id,{label:e.target.value.slice(0,140)})}/></label>
            {item.type==='highlighter'&&<><label>Markup color<select aria-label="Selected markup color" value={item.color||'#f4d03f'} onChange={e=>updateAnnotation(page,item.id,{color:e.target.value})}>{TECHPACK_MARKER_COLORS.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}</select></label>
              <label>Markup width<select aria-label="Selected markup width" value={item.width||24} onChange={e=>updateAnnotation(page,item.id,{width:Number(e.target.value)})}>{TECHPACK_MARKER_WIDTHS.map(w=><option key={w} value={w}>{w===12?'Fine':w===24?'Medium':'Wide'}</option>)}</select></label></>}
            {item.type==='dimension'&&<>
              <label>Linked point of measure<select aria-label="Linked point of measure" value={item.pomId||''} onChange={e=>updateAnnotation(page,item.id,{pomId:e.target.value,label:''})}><option value="">Unlinked · select POM</option>{measurementRefs.map((reference,i)=><option key={reference.id} value={reference.id}>{reference.reference} · {measurementSpec.rows[i].cells[0]}</option>)}</select></label>
              <label>Measurement size<select aria-label="Dimension measurement size" value={item.sizeIndex??2} onChange={e=>updateAnnotation(page,item.id,{sizeIndex:Number(e.target.value)})}>{measurementSpec.headers.slice(2,-1).map((name,i)=><option key={name} value={i+2}>{name}</option>)}</select></label>
              <label className="tpws-pom-check"><input type="checkbox" checked={Boolean(item.placementVerified)} onChange={e=>updateAnnotation(page,item.id,{placementVerified:e.target.checked})}/> Drawing endpoints manually checked</label>
              <small>{linkedMeasurementLabel(item,measurementSpec,workspace.cells?.measurements||{}).detail}. This references an authored/source POM, not a measurement computed from the drawn arrow length.</small>
            </>}
            {item.type==='arrow'&&<><label>Component / location<input aria-label="Arrow component" value={item.component||''} placeholder="e.g. collar rib join" onChange={e=>updateAnnotation(page,item.id,{component:e.target.value.slice(0,100)})}/></label>
              <label>Factory instruction<textarea aria-label="Arrow factory note" value={item.instruction||''} placeholder="Stitch type, finish, needle, seam allowance, tolerance..." onChange={e=>updateAnnotation(page,item.id,{instruction:e.target.value.slice(0,260)})}/></label>
              <label className="tpws-pom-check"><input type="checkbox" aria-label="Construction leader placement reviewed against sample" checked={item.verified===true} onChange={e=>updateAnnotation(page,item.id,{verified:e.target.checked})}/> Leader position and instruction checked against the actual sample</label></>}
            <button type="button" onClick={()=>deleteAnnotation(page,item.id)}><Trash2 size={12}/> Delete</button></>}
        </div>)}
      </div>
      <div className="tpws-properties"><div className="tpws-side-section"><p className="tpws-side-label"><LayoutTemplate size={14}/> PAGE SETTINGS</p>
          <label>Page title<input aria-label="Techpack page title" value={details.title??activePage.name} onChange={e=>configure({title:e.target.value})}/></label>
          <label>Subtitle<input aria-label="Techpack page subtitle" value={details.subtitle??activePage.subtitle} onChange={e=>configure({subtitle:e.target.value})}/></label>
          <label>Header preset<select aria-label="Header preset" value={preset} onChange={e=>configure({headerPreset:e.target.value})}>{HEADER_PRESETS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
          <label>Page composition<select aria-label="Page composition preset" value={details.layoutPreset||workspace.layoutPreset||'balanced'} onChange={e=>configure({layoutPreset:e.target.value})}>{[['square','Square content frame'],['balanced','Balanced specification'],['illustration','Drawing first'],['specification','Specification first'],['gallery','Visual gallery'],['minimal','Minimal plate']].map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
          <div className="tpws-orientation-buttons" role="group" aria-label="All Techpack pages orientation">{ORIENTATIONS.map(([v,l])=><button type="button" key={v} onClick={()=>configureAllPages({orientation:v})} className={orientation===v?'active':''} aria-pressed={orientation===v} title={`Apply ${l.toLowerCase()} to all ${documentPages.length} sheets`}><span className={`tpws-paper-icon tpws-paper-icon-${v}`}/>{l} · All pages</button>)}</div>
          <label>Canvas zoom<select aria-label="Document zoom" value={documentZoom} onChange={event=>setDocumentZoom(event.target.value)}><option value="fit">Fit width</option>{[.5,.75,1,1.25,1.5,1.75,2,2.25,2.5].map(zoom=><option key={zoom} value={zoom}>{Math.round(zoom*100)}%</option>)}</select></label>
          <label>Page arrangement<select aria-label="Page arrangement" value={pageFlow} onChange={event=>changeFlow(event.target.value)}><option value="vertical">Vertical artboards</option><option value="horizontal">Horizontal artboards</option></select></label>
          <label>Document paper size<select aria-label="All pages paper size" value={paperSize} onChange={e=>configureAllPages({paperSize:e.target.value})}><option value="Letter">US Letter · 8.5 × 11 in</option><option value="A4">A4 · 210 × 297 mm</option></select></label><p className="tpws-layout-help">Paper format and orientation apply to every sheet, including print and exports.</p></div>
          <div className="tpws-side-section"><p className="tpws-side-label"><FileSpreadsheet size={14}/> STYLE IDENTIFICATION</p>
            {[['styleName','Style'],['brand','Brand'],['sku','Style number'],['season','Season'],['factory','Factory']].map(([key,label])=><label key={key}>{label}<input value={draft[key]??(key==='styleName'?source.name:'')} placeholder="Enter value" onChange={e=>field(key,e.target.value)}/></label>)}
            <label>Status<select value={draft.status||'draft'} onChange={e=>field('status',e.target.value)}><option value="draft">Draft</option><option value="in review">In review</option><option value="sampling">Sampling</option><option value="approved">Approved (manual)</option></select></label>
          </div><div className="tpws-side-section"><p className="tpws-side-label"><Maximize2 size={14}/> DOCUMENT TOOLS</p><button className="tpws-wide" disabled={!source.ready} onClick={refreshSpecifications} title="Replace measurements and materials with the current design"><RefreshCw size={15}/> Refresh garment specifications</button><button className="tpws-wide" onClick={()=>addTable()}><Table2 size={15}/> Insert editable table</button><button className="tpws-wide" onClick={()=>addRow()}><FilePlus2 size={15}/> Insert specification row</button><button className="tpws-wide" onClick={()=>{setRightTab('assets');uploadGeneralReference()}}><ImagePlus size={15}/> Add a reference to page</button><button className="tpws-wide" onClick={exportCsv}><Download size={15}/> Export this page CSV</button>
            <div className="tpws-spreadsheet-actions" aria-label="Excel Techpack spreadsheet integration">
              <strong>EXCEL / SPREADSHEET TABLES</strong>
              <label>Garment table<select aria-label="Linked garment spreadsheet type" value={spreadsheetKind} onChange={e=>setSpreadsheetKind(e.target.value)}>
                {TECHPACK_BOUND_TABLE_PAGE_IDS.map(type=><option key={type} value={type}>{({"measurement-table":"POM measurements",grading:"Grading matrix",materials:"Materials & BOM",fabrics:"Fabric specification","construction-operations":"Sewing operations","pattern-cutlist":"Pattern cut list",labels:"Labels and tags",packaging:"Packaging",notes:"Fit / revisions"})[type]||type}</option>)}
              </select></label>
              <button className="tpws-wide" disabled={!source.ready} onClick={()=>insertLinkedSpreadsheet()}><Table2 size={15}/> Insert linked specification table</button>
              <button className="tpws-wide" onClick={exportSpreadsheetWorkbook}><Download size={15}/> Export editable Excel workbook</button>
              <input ref={xlsxImportRef} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={importSpreadsheetWorkbook} style={{display:'none'}} aria-label="Choose Excel techpack to import"/>
              <button className="tpws-wide" onClick={()=>xlsxImportRef.current?.click()}><Upload size={15}/> Import Excel onto new pages</button>
              <small>Source values stay linked; imported and overridden values require factory review.</small>
            </div></div>
        </div>
    </section>,hosts.properties)}
    {hosts?.leftTools&&createPortal(<div className="tpws-native-rail" aria-label="Techpack left tools">
      <strong>ANNOTATE</strong>
      <button type="button" className={editMode==='layout'&&annotationTool==='select'?'active':''} aria-pressed={editMode==='layout'&&annotationTool==='select'} title="Select tool (V) · click objects, drag to move, 8 bounding-box handles to resize" aria-label="Select tool" onClick={()=>{setEditMode('layout');setAnnotationTool('select')}}><MousePointer2 size={19}/></button>
      <button type="button" className={editMode==='layout'&&annotationTool==='transform'?'active':''} aria-pressed={editMode==='layout'&&annotationTool==='transform'} title="Transform tool · move and resize selected objects" aria-label="Transform bounding box tool" onClick={()=>{setEditMode('layout');setAnnotationTool('transform')}}><Scaling size={19}/></button>
      <button type="button" className={editMode==='layout'&&annotationTool==='box'?'active':''} aria-pressed={editMode==='layout'&&annotationTool==='box'} title="Box tool (B) · drag on any artboard to draw a resizable layout box" aria-label="Box tool" onClick={()=>{setEditMode('layout');setAnnotationTool('box');setSelectedBoardObject(null)}}><Square size={19}/></button>
      <button type="button" className={annotationTool==='pen'?'active':''} aria-pressed={annotationTool==='pen'} title="Draw freehand seam and construction annotations" aria-label="Pen annotation tool" onClick={()=>setAnnotationTool('pen')}><Pencil size={19}/></button>
      <button type="button" className={annotationTool==='bezier'?'active':''} aria-pressed={annotationTool==='bezier'} title="Bezier Pen · click anchors and drag handles, Enter to finish" aria-label="Bezier pen tool" onClick={()=>setAnnotationTool('bezier')}><PenTool size={19}/></button>
      <button type="button" className={annotationTool==='arrow'?'active':''} aria-pressed={annotationTool==='arrow'} title="Draw annotation arrow / leader line" aria-label="Arrow annotation tool" onClick={()=>setAnnotationTool('arrow')}><MoveUpRight size={19}/></button>
      <button type="button" className={annotationTool==='dimension'?'active':''} aria-pressed={annotationTool==='dimension'} title="Double-headed dimension arrows · link to measurement specification" aria-label="Dimension measurement tool" onClick={()=>{setAnnotationTool('dimension');navigateToPage('measurements')}}><Ruler size={19}/></button>
      <button type="button" className={annotationTool==='marker'?'active':''} aria-pressed={annotationTool==='marker'} title="Place a numbered-style detail marker" aria-label="Detail marker tool" onClick={()=>setAnnotationTool('marker')}><Tag size={19}/></button>
      <button type="button" className={annotationTool==='highlighter'?'active':''} aria-pressed={annotationTool==='highlighter'} title="Colored page marker · highlight technical drawings, notes and tables" aria-label="Colored markup marker tool" onClick={()=>setAnnotationTool('highlighter')}><Highlighter size={19}/></button>
      {annotationTool==='highlighter'&&<div className="tpws-ink-rail-palette" role="group" aria-label="Marker colors">{TECHPACK_MARKER_COLORS.map(color=><button key={color.value} type="button" aria-label={`${color.label} marker`} aria-pressed={highlightColor===color.value} onClick={()=>setHighlightColor(color.value)} title={color.label} style={{'--tpws-ink':color.value}}/>)}</div>}
      {annotationTool==='highlighter'&&<div className="tpws-ink-width-controls" role="group" aria-label="Marker stroke width">{TECHPACK_MARKER_WIDTHS.map(w=><button type="button" key={w} aria-label={`${w===12?'Fine':w===24?'Medium':'Wide'} marker width`} aria-pressed={highlightWidth===w} onClick={()=>setHighlightWidth(w)}>{w===12?'S':w===24?'M':'L'}</button>)}</div>}
      <div className="tpws-native-tools-separator"/>
      <strong>PAGES</strong>
      <button type="button" title="Page overview" onClick={()=>navigateToPage('overview')}><BookOpen size={18}/></button>
      <button type="button" title="Fabric specification page" onClick={()=>navigateToPage('fabrics')}><FileImage size={18}/></button>
      <button type="button" title="Callouts and arrows page" onClick={()=>{navigateToPage('callouts');setAnnotationTool('arrow')}}><MoveUpRight size={18}/></button>
      <button type="button" title="Measurement sheet" onClick={()=>navigateToPage('measurements')}><FileSpreadsheet size={18}/></button>
      <button type="button" title="Sewing sheet" onClick={()=>navigateToPage('construction')}><Settings2 size={18}/></button>
      <button type="button" title="Add reference" onClick={uploadGeneralReference}><ImagePlus size={18}/></button>
      <button type="button" title="Add specification row" onClick={()=>addRow()}><Plus size={18}/></button>
      <button type="button" title="Excel/Notion table widget · insert into selected box, or draw an independent widget on any artboard" aria-label="Insert Excel table widget" onClick={()=>insertExcelWidget()}><Table2 size={18}/></button>
    </div>,hosts.leftTools)}
    {hosts?.rightTools&&createPortal(<div className="tpws-native-rail" aria-label="Techpack right tools">
      <strong>PAGES</strong>
      <button type="button" title="Previous page" disabled={position===0} onClick={()=>navigateToPage(documentPages[position-1].id)}><ChevronLeft size={18}/></button>
      <button type="button" title="Next page" disabled={position===documentPages.length-1} onClick={()=>navigateToPage(documentPages[position+1].id)}><ChevronRight size={18}/></button>
      <button type="button" title="Toggle portrait / landscape on all Techpack pages" aria-label="Toggle orientation for all pages" onClick={()=>configureAllPages({orientation:orientation==='portrait'?'landscape':'portrait'})}><Maximize2 size={18}/></button>
      <button type="button" title="Export complete Techpack" onClick={exportJson}><Download size={18}/></button>
      <button type="button" title="Export sheet CSV" onClick={exportCsv}><FileSpreadsheet size={18}/></button>
      <button type="button" title="Print all pages" onClick={printFullPack}><Printer size={18}/></button>
    </div>,hosts.rightTools)}
    {storageError&&<div className="tpws-save-alert" role="alert">{storageError}</div>}
    <div className="tpws-editor-body">
      <section className="tpws-center tpws-native-canvas" aria-label="Techpack document editor">
        <div className="tpws-glass-dock" aria-label="Techpack page orientation and navigation">
          <div className="tpws-glass-segment tpws-layout-switch" role="group" aria-label="Techpack editing mode">
            <span>EDIT</span><button type="button" aria-pressed={editMode==='content'} aria-label="Content edit mode" onClick={()=>setMode('content')}><Pencil size={14}/> Content</button>
            <button type="button" aria-pressed={editMode==='layout'} aria-label="Layout edit mode" onClick={()=>setMode('layout')}><Scaling size={14}/> Layout</button>
          </div>
          <div className="tpws-glass-segment" role="group" aria-label="All pages orientation">
            <span>PAGE</span>{ORIENTATIONS.map(([value,label])=><button type="button" key={value} aria-label={`Set all pages ${label.toLowerCase()}`} aria-pressed={orientation===value} onClick={()=>configureAllPages({orientation:value})}><span className={`tpws-paper-icon tpws-paper-icon-${value}`}/>{label}</button>)}
          </div>
          <div className="tpws-glass-segment" role="group" aria-label="Scroll pages vertically or horizontally">
            <span>SCROLL</span><button type="button" aria-label="Scroll pages vertically" aria-pressed={pageFlow==='vertical'} onClick={()=>changeFlow('vertical')}><Rows3 size={15}/> Vertical</button><button type="button" aria-label="Scroll pages horizontally" aria-pressed={pageFlow==='horizontal'} onClick={()=>changeFlow('horizontal')}><Columns3 size={15}/> Horizontal</button>
          </div>
          {editMode==='layout'&&<div className="tpws-glass-segment" role="group" aria-label="Artboard alignment controls">
            <span>ARTBOARD</span><button type="button" aria-label="Toggle visible artboard grid" aria-pressed={Boolean(workspace.artboardGuides?.[page]?.visible)} onClick={()=>setArtboardGuide('visible',!workspace.artboardGuides?.[page]?.visible)}>Grid</button>
            <button type="button" aria-label="Toggle snap to 8 pixel artboard grid" aria-pressed={Boolean(workspace.artboardGuides?.[page]?.snap)} onClick={()=>setArtboardGuide('snap',!workspace.artboardGuides?.[page]?.snap)}>Snap 8</button>
          </div>}
          <div className="tpws-glass-segment tpws-zoom-glass" role="group" aria-label="Techpack document zoom shortcuts">
            <span>ZOOM</span>
            <button type="button" aria-label="Zoom out Techpack" title="Zoom out · ⌘−" onClick={()=>setDocumentZoom(value=>nextTechPackZoom(value,'out',canvasWidth,orientation==='landscape'))}>−</button>
            <button type="button" aria-label="Reset Techpack zoom" title="Reset zoom · ⌘0" onClick={()=>setDocumentZoom('1')}>{Math.round(resolvedTechPackZoom(documentZoom,canvasWidth,orientation==='landscape')*100)}%</button>
            <button type="button" aria-label="Zoom in Techpack" title="Zoom in · ⌘+" onClick={()=>setDocumentZoom(value=>nextTechPackZoom(value,'in',canvasWidth,orientation==='landscape'))}>+</button>
            <button type="button" aria-label="Fit Techpack artboard width" title="Fit width" onClick={()=>setDocumentZoom('fit')}>Fit</button>
          </div>
          {editMode==='layout'&&<><button type="button" className="tpws-save-page-template" onClick={()=>savePageAsTemplate(false)}><LayoutTemplate size={13}/> Save blank layout template</button><button type="button" className="tpws-save-page-template" onClick={()=>savePageAsTemplate(true)}><LayoutTemplate size={13}/> Save template with my content</button><button type="button" className="tpws-save-page-template" onClick={()=>saveEntireTechpackTemplate(false)}><LayoutTemplate size={13}/> Save complete blank system</button><button type="button" className="tpws-save-page-template" onClick={()=>saveEntireTechpackTemplate(true)}><LayoutTemplate size={13}/> Save full system + my content</button></>}
          <span className="tpws-glass-count">{documentPages.length} PAGES · {paperSize.toUpperCase()}</span>
        </div>
        {layoutNotice&&<div className="tpws-layout-notice" role="status">{layoutNotice}<button type="button" onClick={()=>setLayoutNotice('')} aria-label="Dismiss layout notice">×</button></div>}
        <div className="tpws-paper-scroll" ref={scrollRef} data-page-flow={pageFlow} onScroll={syncPageOnScroll} aria-label="Scrollable Techpack pages">
          <div className={`tpws-sheet-track tpws-sheet-track-${pageFlow}`}>
            {documentPages.map(sheetDef=>renderSheet(sheetDef))}
            <button type="button" className="tpws-add-page-artboard" aria-label="Add another Techpack page" onClick={addCustomPage}><Plus size={27}/><strong>ADD PAGE</strong><span>Blank artboard · edit and save your own layout</span></button>
          </div>
        </div>

      </section>
    </div>
    <input ref={uploadRef} hidden type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg" multiple onChange={handleUpload} aria-label="Upload techpack reference assets"/>
  </div>
}
