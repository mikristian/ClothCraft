import React, { useEffect, useState } from 'react'
import CadToolIcon from './CadToolIcon.jsx'
import PatternReferencePanel20261025 from './PatternReferencePanel20261025.jsx'
import {getHardwarePreset} from '../data/hardwarePresets.js'
import {resolveHardwareStyle} from '../core/hardwareStyleProperties.js'
import {libraryFolders} from '../data/libraryFolderTree.js'
import './ObjectBrowserHierarchy.css'
import {
  ChevronDown, ChevronRight, CircleDot, Cloud, Folder, Grid2X2,
  Image, Layers3, List, MoreHorizontal, Palette, Search, Shirt, Eye, EyeOff, Lock, Unlock, Plus, Copy, Check, Repeat2, ImagePlus,
  SlidersHorizontal, Sparkles, Star, StretchHorizontal, UserRound,
} from 'lucide-react'

/** CLO's spatial organization, not a claim that unfinished engines already work. */
export { CLO_MENUS } from '../core/cloMenus.js'

export const OBJECT_TABS = [
  { id: 'Fabric', icon: Shirt },
  { id: 'Graphic', icon: Image }, { id: 'Reference', icon: Image }, { id: 'Button', icon: CircleDot },
  { id: 'Buttonhole', icon: StretchHorizontal }, { id: 'Topstitch', icon: MoreHorizontal },
  { id: 'Puckering', icon: SlidersHorizontal },
  { id: 'Grading', icon: Grid2X2 }, { id: 'POM', icon: List },
]
const OBJECT_TAB_ART = {
  Scene:'scene', Fabric:'fabric', Graphic:'graphics', Reference:'graphics', Button:'buttons',
  Buttonhole:'buttonholes', Topstitch:'topstitch', Puckering:'puckering',
  Trim:'trim', Zipper:'trim', Grading:'grading', POM:'pom',
}
const OBJECT_CATEGORY_ART = {
  '2D Pattern':'pattern-properties',
  'Sewing':'sew',
  '3D Form':'select-3d',
  'Material':'fabric',
  'Environment':'render',
}

export const OBJECT_HIERARCHY = [
  {title:'2D Pattern', children:[['Pattern Pieces','Pattern','Scene'],['Photo References','Pattern','Reference'],['Internal Lines','Pattern','Scene'],['Grading & Measurements','Production','POM']]},
  {title:'Sewing', children:[['Sewing Relationships','Sewing','Scene'],['Buttons','Sewing','Button'],['Buttonholes','Sewing','Buttonhole'],['Zippers','Sewing','Zipper'],['Topstitch','Sewing','Topstitch']]},
  {title:'3D Form', children:[['Arrangement','Pattern','Scene'],['Avatar','Avatar','Scene'],['Simulation & Fit','Fit','Scene']]},
  {title:'Material', children:[['Fabric Editor','Fabric','Fabric'],['Graphics & Texture','Fabric','Graphic'],['Trims','Sewing','Trim']]},
  {title:'Environment', children:[
    {label:'Camera',children:[{label:'Default Camera',environmentType:'camera',id:'default-camera'}]},
    {label:'Light',children:[{label:'3D',children:[{label:'Light',environmentType:'light',id:'light-1'},{label:'Light',environmentType:'light',id:'light-2'}]}]},
    {label:'Render',environmentType:'render'},
    {label:'Simulation Properties',environmentType:'simulation'},
    {label:'Render_Image/Video Properties',environmentType:'render-image'},
    {label:'Render_Light Properties',environmentType:'render-light'},
    {label:'Render_Render Properties',environmentType:'render-settings'},
  ]},
]

export function BulletListIcon(){return <svg viewBox="0 0 20 20" width="17" height="17" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round"><circle cx="3.5" cy="4.3" r="1.25" fill="currentColor" stroke="none"/><circle cx="3.5" cy="10" r="1.25" fill="currentColor" stroke="none"/><circle cx="3.5" cy="15.7" r="1.25" fill="currentColor" stroke="none"/><path d="M7.5 4.3h10M7.5 10h10M7.5 15.7h10"/></svg>}

const libraryCategories = ['Garment', 'Avatar', 'Hanger', 'Fabric', 'Hardware and Trims', 'Material', 'Substance', 'Stage', 'Patterns']

export function GarmentSilhouette({ type = 'tee' }) {
  const isPants = /pants|jeans|501/i.test(type)
  const isSkirt = /skirt/i.test(type)
  const isHood = /hood/i.test(type)
  return <svg className="garment-silhouette" viewBox="0 0 64 72" role="img" aria-label={`${type} pattern silhouette`}>
    <defs><linearGradient id="garment-tile-shade" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fafafa"/><stop offset="1" stopColor="#aab6c4"/></linearGradient></defs>
    {isPants ? <path d="M19 8 H45 L49 63 H36 L32 32 L28 63 H15 Z"/> : isSkirt
      ? <path d="M23 11 H41 L52 63 H12 Z"/>
      : <path d={isHood ? 'M22 15 Q19 3 32 2 Q46 3 43 15 L53 21 L62 38 L50 45 L45 34 L45 65 H19 V34 L14 45 L2 38 L11 21 Z' : 'M23 12 L16 17 L2 30 L12 43 L20 36 L20 64 H44 V36 L52 43 L62 30 L48 17 L41 12 Q32 20 23 12 Z'} />}
    <path className="garment-stitch" d={isPants ? 'M32 9 V32 M19 17 H45' : isSkirt ? 'M21 18 H43' : 'M22 21 Q32 28 42 21 M20 58 H44'}/>
  </svg>
}

export function LibraryChrome({ category, setCategory, folder='all', setFolder, fabricGroups=[], search, setSearch, thumbnails, setThumbnails, children }) {
  const [expandedRoots,setExpandedRoots]=useState(()=>new Set(['Garment']))
  const [expandedBranches,setExpandedBranches]=useState(()=>new Set())
  const [expandedSections,setExpandedSections]=useState(()=>({}))
  const sectionExpanded=expandedSections[category]!==false
  const openRoot=item=>setExpandedRoots(previous=>new Set([...previous,item]))
  const toggleRoot=item=>setExpandedRoots(previous=>{
    const next=new Set(previous)
    if(next.has(item))next.delete(item);else next.add(item)
    return next
  })
  const chooseCategory=(next,{expand=true}={})=>{
    if(next!==category)setSearch('')
    setCategory(next)
    setFolder?.('all')
    if(expand)openRoot(next)
    setExpandedSections(previous=>({...previous,[next]:true}))
  }
  const chooseFolder=(parent,node)=>{
    if(parent!==category)setSearch('')
    setCategory(parent)
    setFolder?.(node.id)
    openRoot(parent)
    setExpandedSections(previous=>({...previous,[parent]:true}))
    if(node.children?.length)setExpandedBranches(previous=>{
      const key=`${parent}:${node.id}`,next=new Set(previous);next.add(key);return next
    })
  }
  const toggleBranch=(parent,node)=>setExpandedBranches(previous=>{
    const next=new Set(previous),key=`${parent}:${node.id}`
    if(next.has(key))next.delete(key);else next.add(key)
    return next
  })
  const folderNodes=libraryFolders(category,fabricGroups)
  const selectedNode=folderNodes.flatMap(node=>[node,...(node.children||[])]).find(node=>node.id===folder)
  useEffect(()=>{
    if(folder!=='all')setExpandedSections(previous=>({...previous,[category]:true}))
  },[category,folder])
  return <>
    <div className="clo-library-top"><strong>Library</strong><div className="clo-library-top-icons" aria-label="Library quick categories">
      <button className={category === 'Garment' ? 'active' : ''} aria-label="Browse garments" aria-pressed={category === 'Garment'} title="Garment library" onClick={() => chooseCategory('Garment')}><Star size={16}/></button>
      <button className={category === 'Avatar' ? 'active' : ''} aria-label="Browse avatars" aria-pressed={category === 'Avatar'} title="Avatar library" onClick={() => chooseCategory('Avatar')}><Cloud size={16}/></button>
      <button className={category === 'Fabric' ? 'active' : ''} aria-label="Browse fabrics" aria-pressed={category === 'Fabric'} title="Fabric library" onClick={() => chooseCategory('Fabric')}><Shirt size={16}/></button>
      <span className="clo-library-icon-spacer"/>
      <span className="clo-library-scope">LOCAL</span>
    </div></div>
    <div className="clo-library-categories" role="navigation" aria-label="Library categories">
      {libraryCategories.map(item=>{
        const roots=libraryFolders(item,fabricGroups),expanded=expandedRoots.has(item)
        return <div className="clo-library-tree-group" key={item} data-library-tree-category={item}>
          <div className={`clo-library-tree-root-line ${category===item?'active':''}`}>
            <button type="button" className="clo-library-tree-expand" aria-label={`Toggle ${item} folders`}
              aria-expanded={expanded} onClick={()=>toggleRoot(item)}>
              {expanded?<ChevronDown size={12}/>:<ChevronRight size={12}/>}
            </button>
            <button type="button" data-library-tree-root={item} aria-expanded={expanded} aria-current={category===item?'page':undefined}
              className={`clo-library-tree-root ${category===item?'active':''}`}
              onClick={()=>chooseCategory(item)} onDoubleClick={()=>chooseCategory(item)}>
              <Folder size={13}/><span>{item}</span>
            </button>
          </div>
          {expanded&&<div className="clo-library-tree-children" aria-label={`${item} folders`}>
            {roots.map(node=>{
              const hasChildren=Boolean(node.children?.length),key=`${item}:${node.id}`,branchOpen=expandedBranches.has(key)
              return <div className="clo-library-tree-node" key={node.id}>
                <button type="button" data-library-tree-child={node.id} aria-current={category===item&&folder===node.id?'true':undefined}
                  aria-expanded={hasChildren?branchOpen:undefined} className={category===item&&folder===node.id?'selected':''}
                  onClick={()=>hasChildren&&folder===node.id?toggleBranch(item,node):chooseFolder(item,node)}
                  onDoubleClick={()=>{chooseFolder(item,node)}}>
                  {hasChildren?(branchOpen?<ChevronDown size={12}/>:<ChevronRight size={12}/>):<span className="clo-library-tree-spacer" aria-hidden="true"/>}
                  <Folder size={12}/><span>{node.label}</span>
                </button>
                {hasChildren&&branchOpen&&<div className="clo-library-tree-branch">
                  {node.children.map(child=><button type="button" data-library-tree-child={child.id} key={child.id}
                    className={category===item&&folder===child.id?'selected':''}
                    aria-current={category===item&&folder===child.id?'true':undefined}
                    onClick={()=>chooseFolder(item,child)} onDoubleClick={()=>chooseFolder(item,child)}>
                    <span className="clo-library-tree-spacer" aria-hidden="true"/><Folder size={12}/><span>{child.label}</span>
                  </button>)}
                </div>}
              </div>
            })}
          </div>}
        </div>
      })}
    </div>
    <div className="clo-library-search"><Search size={14}/><input aria-label="Search library" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search assets…"/>{search && <button aria-label="Clear asset search" title="Clear search" onClick={() => setSearch('')}>×</button>}<button aria-label={thumbnails ? 'Switch to list view' : 'Switch to thumbnail view'} title={thumbnails ? 'List view' : 'Thumbnail view'} onClick={() => setThumbnails(value => !value)}>{thumbnails ? <List size={15}/> : <Grid2X2 size={15}/>}</button></div>
    <div className={`asset-library-content ${thumbnails ? 'thumbnail-mode' : 'list-mode'}`}>
      <button type="button" className="asset-section-heading asset-section-heading-toggle" data-library-section-toggle={category}
        {...(category==='Hardware and Trims'?{'data-hardware-and-trims-toggle':true}:{})}
        aria-expanded={sectionExpanded} onClick={()=>setExpandedSections(previous=>({...previous,[category]:previous[category]===false}))}>
        {sectionExpanded?<ChevronDown size={12}/>:<ChevronRight size={12}/>}<Folder size={13}/> {category.toUpperCase()}
        {selectedNode&&<span className="clo-library-selected-folder">/ {selectedNode.label}</span>}
      </button>
      {sectionExpanded&&children}
    </div>
  </>
}

export function ObjectBrowser({ tab, setTab, project, setSelectedPieceId, setSelectedFabricId, onApplyFabric, setActiveSection, selectedPieceId, selectedFabricId, selectedObject, selectedHardwarePreset, onAddFabric, onAddPattern, onTogglePieceProperty, onSelectedObjectChange,
  nativeMode=false,nativePanelRefs=[],nativeFabricRefs=[],nativeGraphicRefs=[],nativeSelectedObject,nativeGraphicsDisabled=false,showGraphicMeasurements=true,onToggleGraphicMeasurements,onNativePanelSelect,onNativeFabricSelect,onNativeGraphicSelect,onNativeGraphicVisibilityChange,onNativeGraphicAdd,onCreateObject,onCopyObject,onAssignObject,onFabricTextureRepeat,onFabricAddPrint,onRemoveObject,onObjectVisibilityChange,nativeImportedHardware=[],onEnvironmentSelect,
  referenceProjectKey=null, referenceItems=[],onReferenceChange,onReferenceSelect,selectedReferenceId=null }) {
  const [objectSearch, setObjectSearch] = useState('')
  const [categoryMenuOpen,setCategoryMenuOpen]=useState(false)
  const [categoryExpanded,setCategoryExpanded]=useState('Environment')
  const [expandedHierarchyNodes,setExpandedHierarchyNodes]=useState(()=>new Set(['Environment/Camera','Environment/Light','Environment/Light/3D']))
  const [selectedHierarchyNode,setSelectedHierarchyNode]=useState('')
  const toggleHierarchyNode=path=>setExpandedHierarchyNodes(previous=>{const next=new Set(previous);if(next.has(path))next.delete(path);else next.add(path);return next})
  const renderHierarchyNode=(node,parentPath,index)=>{
    const item=Array.isArray(node)?{label:node[0],section:node[1],objectTab:node[2]}:node
    const path=`${parentPath}/${item.label}${item.id?`:${item.id}`:''}`
    const hasChildren=Boolean(item.children?.length)
    const displayName=item.environmentType==='camera'?(project.render?.camera?.name||item.label):item.label
    const expanded=expandedHierarchyNodes.has(path)
    const selected=selectedHierarchyNode===path
    return <div className="clo-object-hierarchy-node" key={`${path}:${index}`}>
      <button type="button" className={`clo-object-hierarchy-entry ${selected?'selected':''}`} aria-selected={selected} aria-expanded={hasChildren?expanded:undefined}
        onClick={()=>{
          setSelectedHierarchyNode(path)
          if(hasChildren)toggleHierarchyNode(path)
          if(item.environmentType)onEnvironmentSelect?.({type:item.environmentType,id:item.id,name:displayName})
          else if(item.section){onEnvironmentSelect?.(null);setActiveSection(item.section);setTab(item.objectTab);setCategoryMenuOpen(false)}
        }}>
        {hasChildren?(expanded?<ChevronDown size={12}/>:<ChevronRight size={12}/>):<span className="clo-object-hierarchy-leaf-spacer" aria-hidden="true"/>}
        <span>{displayName}</span>
      </button>
      {hasChildren&&expanded&&<div className="clo-object-hierarchy-nested">{item.children.map((child,childIndex)=>renderHierarchyNode(child,path,childIndex))}</div>}
    </div>
  }
  const fabrics = nativeMode ? nativeFabricRefs.map(f=>[f.id,f]) : Object.entries(project.fabrics || {})
  const allPieces = nativeMode?nativePanelRefs:(project.pieces || [])
  const draftPieces = project.pieces || []
  const sceneItems = [{ id: 'avatar', name: nativeMode?'Native avatar':project.avatar?.name || 'Avatar', icon: UserRound, type:'avatar', action: () => setActiveSection('Avatar') },
    ...allPieces.map(piece => ({ id: piece.id, name: piece.name, icon: Shirt, type:'pattern',pieceId:piece.id,
      action: () => {if(nativeMode)onNativePanelSelect?.(piece.id);else setSelectedPieceId(piece.id);setActiveSection('Pattern')} }))]
  const pieceObjectRows = (collection, type, Icon, label) => draftPieces.flatMap(piece =>
    (piece[collection] || []).map((item, index) => ({
      id: `${piece.id}:${collection}:${item.id ?? index}`,
      pieceId: piece.id,
      itemId: item.id ?? index,
      name: `${getHardwarePreset(item.hardwarePresetId)?.name || item.name || label} · ${piece.name} ${index + 1}`,
      visible:item.visible!==false,
      color: item.teethColor || item.color,
      icon: Icon,
      type,
      collection,
      action: () => { setSelectedPieceId(piece.id); setActiveSection('Sewing') },
    })))
  const importedRows = (nativeMode ? nativeImportedHardware : draftPieces.flatMap(piece=>(piece.importedHardwarePlacements||[]).map(item=>({...item,panel:piece.id})))).map((item,index)=>({
    id:`imported-hardware:${item.id}`,
    itemId:item.id,pieceId:item.panel||item.pieceId,
    name:item.name||item.assetName||item.assetId||`Imported hardware ${index+1}`,
    detail:`Imported 3D hardware · ${item.panel||item.pieceId||'garment'}`,
    visible:item.visible!==false,icon:CircleDot,type:'imported-hardware',source:'imported',
    collection:'importedHardwarePlacements',
    action:()=>{if(!nativeMode&&item.panel)setSelectedPieceId(item.panel);setActiveSection('Sewing')},
  }))
  const getRows = () => {
    if (tab === 'Scene') return sceneItems
    if (tab === 'Fabric') return fabrics.map(([id, item]) => ({
      id,name:item.name||id,color:item.color||item.appearance?.color||'#f3f3f3',icon:Shirt,type:'fabric',
      action:()=>{if(nativeMode)onNativeFabricSelect?.(id);else setSelectedFabricId(id);setActiveSection('Fabric')}}))
    if (tab === 'Graphic') return nativeMode
      ? nativeGraphicRefs.map(graphic=>({id:graphic.id,icon:Image,type:'graphic',
          name:graphic.name||'Artwork',detail:`${Number(graphic.widthMm||0).toFixed(1)} × ${Number(graphic.heightMm||0).toFixed(1)} mm · ${graphic.panel||'Panel'}`,
          thumbnail:graphic.thumbnail,visible:graphic.visible,
          action:()=>{onNativeGraphicSelect?.(graphic.id);setActiveSection('Fabric')}}))
      : draftPieces.flatMap(piece => (piece.graphics || []).map((item,i) => ({ id: item.id??`${piece.id}-graphic-${i}`,pieceId:piece.id,itemId:item.id??i,collection:'graphics',type:'graphic',name:item.name||`${piece.name} · Graphic`, icon: Image, action: () => { setSelectedPieceId(piece.id); setActiveSection('Fabric') } })))
    if (tab === 'Button') return [...pieceObjectRows('buttons', 'button', CircleDot, 'Button'),...importedRows.filter(row=>/button/i.test(row.name)&&!/buttonhole/i.test(row.name))]
    if (tab === 'Buttonhole') return pieceObjectRows('buttonholes', 'buttonhole', StretchHorizontal, 'Buttonhole')
    if (tab === 'Topstitch') return pieceObjectRows('topstitches', 'topstitch', MoreHorizontal, 'Topstitch')
    if (tab === 'Puckering') return [
      ...pieceObjectRows('puckerings', 'puckering', SlidersHorizontal, 'Puckering'),
      ...(project.puckerings || []).map((item, index) => ({id:`project:puckerings:${item.id ?? index}`,itemId:item.id ?? index,name:item.name || `Puckering ${index + 1}`,icon:SlidersHorizontal,type:'puckering',collection:'puckerings',action:()=>setActiveSection('Sewing')})),
    ]
    if (tab === 'Zipper' || tab === 'Trim') return [
      ...(tab==='Trim'?(project.fasteners||[]).map((item,i)=>({id:`fastener-${item.id??i}`,itemId:item.id??i,collection:'fasteners',visible:item.visible!==false,name:item.name||`Fastener ${i+1}`,icon:CircleDot,type:'fastener',action:()=>setActiveSection('Sewing')})):[]),
      ...(tab==='Trim'?pieceObjectRows('bindings','binding',StretchHorizontal,'Edge Binding'):[]),
      ...pieceObjectRows('zippers', 'zipper', StretchHorizontal, 'Zipper'),
      ...(tab==='Trim'?importedRows:importedRows.filter(row=>/puller|slider|stopper|zipper/i.test(row.name))),
    ]
    if (tab === 'Grading') return (project.grading?.sizes || []).map((name) => ({ id: name, name: `Size ${name}`, icon: Grid2X2, action: () => setActiveSection('Production') }))
    if (tab === 'POM') return (project.customMeasurements || []).map((measurement, i) => ({ id: measurement.id || i, name: measurement.name || `POM ${i + 1}`, icon: List, action: () => setActiveSection('Production') }))
    return []
  }
  const hardwareTab=selectedHardwarePreset?.kind==='button'?'Button':selectedHardwarePreset?.kind==='buttonhole'?'Buttonhole':selectedHardwarePreset?.kind==='zipper'?'Zipper':'Trim'
  const selectedLibraryRow=selectedObject?.source==='library'&&selectedHardwarePreset&&hardwareTab===tab
    ? [{id:selectedHardwarePreset.id,name:selectedHardwarePreset.name,detail:'Selected library style · editable below',
      icon:CircleDot,type:'hardware',source:'library'}] : []
  const rows = [...selectedLibraryRow,...getRows()]
  const filteredRows = rows.filter(row => row.name.toLowerCase().includes(objectSearch.trim().toLowerCase()))
  const selectedRow = rows.find(row => row.id === selectedObject?.id)
  const creatableTabs = ['Button','Buttonhole','Zipper','Trim','Topstitch','Puckering']
  const draftAnnotationTabs = ['Graphic','Button','Buttonhole','Zipper','Trim','Topstitch','Puckering','Grading','POM']
  const currentRow=selectedRow || (tab==='Fabric' ? rows.find(row=>row.id===(nativeMode?nativeSelectedObject?.id:selectedFabricId)) : null)
  const canAdd=(tab==='Fabric'&&!nativeMode)||(tab==='Graphic'&&Boolean(nativeMode?onNativeGraphicAdd&&!nativeGraphicsDisabled:onFabricAddPrint))||(tab==='Scene'&&!nativeMode)||creatableTabs.includes(tab)&&Boolean(onCreateObject)
  const supportsCopy=Boolean(currentRow?.type==='fabric'||currentRow?.type==='graphic'||
    currentRow?.type==='imported-hardware'||currentRow?.collection&&currentRow?.pieceId)
  const supportsAssign=Boolean(currentRow?.type==='fabric'||currentRow?.type==='graphic'||
    currentRow?.collection&&currentRow?.pieceId&&currentRow?.type!=='imported-hardware')
  const canCopy=Boolean(currentRow&&supportsCopy&&onCopyObject&&!(nativeMode&&(tab==='Fabric'||nativeGraphicsDisabled))&&currentRow.source!=='library')
  const canAssign=Boolean(currentRow&&supportsAssign&&onAssignObject&&
    !(nativeMode&&(nativeGraphicsDisabled||!['Fabric','Graphic'].includes(tab)))&&currentRow.source!=='library')
  const addSelected=()=>{
    if(tab==='Fabric')onAddFabric?.()
    else if(tab==='Graphic')nativeMode?onNativeGraphicAdd?.():onFabricAddPrint?.()
    else if(tab==='Scene')onAddPattern?.()
    else onCreateObject?.(tab,selectedPieceId)
  }
  const selectFabric=(id,name)=>{
    if(nativeMode)onNativeFabricSelect?.(id)
    else setSelectedFabricId(id)
    setActiveSection('Fabric')
    onSelectedObjectChange?.({source:nativeMode?'native':'draft',type:'fabric',id,name})
  }
  return <section className="clo-object-browser" aria-label="Object Browser">
    <div className="clo-panel-header"><strong>Object Browser</strong><span>{categoryMenuOpen ? `${OBJECT_HIERARCHY.length} GROUPS` : `${tab==='Reference'?referenceItems.length:rows.length} ITEMS`}</span></div>
    <div className="clo-object-tabs" role="tablist" aria-label="Object Browser types">
      <button className={`clo-object-bullet-menu-trigger clo-object-tab-menu ${categoryMenuOpen ? 'active' : ''}`}
        type="button" role="tab" aria-selected={categoryMenuOpen}
        aria-label="Object Browser category list" aria-controls="clo-object-hierarchy-menu"
        title="Object Browser categories"
        onClick={()=>setCategoryMenuOpen(value=>!value)}><BulletListIcon/></button>
      {OBJECT_TABS.map(({id}) => <button key={id} type="button" role="tab" aria-label={id} aria-selected={!categoryMenuOpen && tab === id} title={id} className={!categoryMenuOpen && tab === id ? 'active' : ''} onClick={() => {
        setTab(id);setCategoryMenuOpen(false);onEnvironmentSelect?.(null)
        if(id==='Fabric'&&fabrics.length)selectFabric(fabrics.find(([fabricId])=>fabricId===(nativeMode?nativeSelectedObject?.id:selectedFabricId))?.[0]||fabrics[0][0],fabrics.find(([fabricId])=>fabricId===(nativeMode?nativeSelectedObject?.id:selectedFabricId))?.[1]?.name||fabrics[0][1]?.name)
        else onSelectedObjectChange?.(null)
        const workspace={Fabric:'Fabric',Graphic:'Fabric',Reference:'Pattern',Button:'Sewing',Buttonhole:'Sewing',Zipper:'Sewing',Trim:'Sewing',Topstitch:'Sewing',Puckering:'Sewing',Grading:'Production',POM:'Production'}[id]
        if(workspace)setActiveSection(workspace)
      }}>{id==='Reference'?<ImagePlus size={20}/>:<CadToolIcon id={OBJECT_TAB_ART[id]} size={21}/>}<span>{id}</span></button>)}
    </div>
    {tab==='Reference'&&!categoryMenuOpen ? <PatternReferencePanel20261025
      projectKey={referenceProjectKey} references={referenceItems} onChange={onReferenceChange}
      selectedId={selectedReferenceId} onSelect={onReferenceSelect} disabled={!referenceProjectKey} variant="list"/>
    : categoryMenuOpen ? <>
      <nav id="clo-object-hierarchy-menu" className="clo-object-hierarchy-menu" aria-label="Object Browser categories">
      {OBJECT_HIERARCHY.map(item=><div className="clo-object-hierarchy-group" key={item.title}>
        <button type="button" className={categoryExpanded===item.title?'expanded':''} aria-expanded={categoryExpanded===item.title} onClick={()=>setCategoryExpanded(categoryExpanded===item.title?'':item.title)}>{categoryExpanded===item.title?<ChevronDown size={12}/>:<ChevronRight size={12}/>}<CadToolIcon id={OBJECT_CATEGORY_ART[item.title]} size={15}/><strong>{item.title}</strong></button>
        {categoryExpanded===item.title && <div className="clo-object-hierarchy-children">{item.children.map((child,index)=>renderHierarchyNode(child,item.title,index))}</div>}
      </div>)}
      </nav>
    </> : <>
    <div className="clo-object-actions clo-object-actions-compact" role="group" aria-label={`${tab} object actions`}>
      <span className="clo-object-actions-count" title={`${rows.length} objects`}>{rows.length}</span>
      <div className="clo-object-action-buttons">
        <button type="button" aria-label={`Add ${tab.toLowerCase()}`} disabled={!canAdd} title={canAdd?`Add ${tab.toLowerCase()}`:'This object type cannot be added in the current workspace'} onClick={addSelected}><Plus size={13}/>Add</button>
        <button type="button" aria-label={`Copy selected ${tab.toLowerCase()}`} disabled={!canCopy} title={canCopy?'Duplicate the selected object':'Select an editable object to copy'} onClick={()=>onCopyObject?.(currentRow)}><Copy size={12}/>Copy</button>
        <button type="button" aria-label={`Assign selected ${tab.toLowerCase()}`} disabled={!canAssign} title={canAssign?'Assign to the active garment panel':'Select an assignable object and garment panel'} onClick={()=>onAssignObject?.(currentRow)}><Check size={12}/>Assign</button>
        {currentRow?.collection&&onRemoveObject&&<button type="button" aria-label={`Remove ${currentRow.name}`} onClick={()=>onRemoveObject({type:currentRow.type,collection:currentRow.collection,pieceId:currentRow.pieceId,itemId:currentRow.itemId,id:currentRow.id})}>Remove</button>}
      </div>
    </div>
    {nativeMode&&tab==='Graphic'&&<div className="clo-object-graphic-measurements">
      <span className="clo-object-graphic-measurements-label">2D graphic dimensions</span>
      <button type="button" className="clo-object-graphic-measurements-toggle" role="switch" aria-checked={showGraphicMeasurements}
        aria-label="Show graphic measurements in 2D" title="Show the selected graphic's width and height on the 2D pattern"
        onClick={()=>onToggleGraphicMeasurements?.(!showGraphicMeasurements)}>
        <span className="clo-object-graphic-measurements-track"><span/></span>
        <span>{showGraphicMeasurements?'On':'Off'}</span>
      </button>
    </div>}
    {selectedHardwarePreset&&<div className="clo-fabric-preview" aria-label="Selected hardware preview">
      {selectedHardwarePreset.kind==='button'&&(()=>{
        const style=resolveHardwareStyle(project,selectedHardwarePreset.id)
        const aspect=Math.max(.3,Math.min(3,style.widthMm/style.heightMm))
        return <div className="clo-fabric-preview-tile" data-hardware-live-preview="button" style={{background:'#222629',borderRadius:'5px',display:'grid',placeItems:'center',overflow:'hidden'}}>
          <span aria-label={`Button material ${style.color}, ${style.widthMm} by ${style.heightMm} millimetres`} role="img"
            style={{width:Math.min(65,Math.round(56*Math.min(1,aspect)))+'px',height:Math.min(65,Math.round(56/Math.max(1,aspect)))+'px',minWidth:8,minHeight:8,display:'block',borderRadius:selectedHardwarePreset.shape==='square'?'18%':'50%',border:'1px solid #ffffff4d',
              background:`radial-gradient(circle at ${Math.round(32+style.roughness*30)}% ${Math.round(23+style.roughness*26)}%,rgba(255,255,255,${Math.max(.02,Math.min(.75,style.reflectionIntensity*(1-style.roughness)*.45))}),transparent 65%), ${style.color}`,
              boxShadow:`inset 1px 2px 4px #0008, 0 2px ${Math.round(3+style.metalness*5)}px #000b`}}/>
        </div>
      })()}
      {selectedHardwarePreset.kind!=='button'&&<div className="clo-fabric-preview-tile" style={{background:'#242629',borderRadius:'5px',overflow:'hidden'}}><img src={`/hardware-thumbnails/${selectedHardwarePreset.id}.png`} loading="lazy" decoding="async" alt={`${selectedHardwarePreset.name} rendered 3D hardware preview`} style={{width:'100%',height:'100%',objectFit:'cover'}}/></div>}
      <div className="clo-fabric-preview-details"><strong>{selectedHardwarePreset.name}</strong><span>{selectedHardwarePreset.kind==='button'?resolveHardwareStyle(project,selectedHardwarePreset.id).materialType:selectedHardwarePreset.material} · {selectedHardwarePreset.finish}</span><span>{selectedHardwarePreset.kind==='button'?'Editable style · dimensions and reflection below':`Style parameters below · ${selectedHardwarePreset.kind}`}</span></div>
    </div>}
    {tab!=='Fabric'&&<div className="clo-object-search"><Search size={13}/><input aria-label="Search Object Browser" placeholder="Filter objects…" value={objectSearch} onChange={event => setObjectSearch(event.target.value)}/>{objectSearch && <button type="button" aria-label="Clear object search" onClick={() => setObjectSearch('')}>×</button>}</div>}
    <div className="clo-object-list" role="list">
      {filteredRows.length ? filteredRows.map(({ id, name, detail, thumbnail, visible, icon: Icon, color, action, pieceId, itemId, type, collection, source }) => {
        const piece = !nativeMode && tab === 'Scene' ? allPieces.find(item => item.id === id) : null
        const nativeGraphic=nativeMode&&tab==='Graphic'
        const current=(nativeGraphic?nativeSelectedObject?.id===id:selectedObject?.id===id) || (nativeMode && !nativeGraphic && !draftAnnotationTabs.includes(tab) ? nativeSelectedObject?.id===id : id === selectedPieceId || id === selectedFabricId)
        return <div key={id} role="listitem" className={`clo-object-row ${tab==='Fabric'?'clo-object-fabric-row':''} ${nativeGraphic?'clo-object-graphic-row':''} ${visible===false?'is-hidden':''} ${current ? 'selected' : ''}`}>
          {tab==='Fabric'?<label className="clo-object-graphic-toggle" title={`Select ${name}`}><input type="checkbox" aria-label={`Select fabric ${name}`} checked={current} onChange={()=>selectFabric(id,name)}/></label> : nativeGraphic ? <label className="clo-object-graphic-toggle" title={visible===false?`Show ${name}`:`Hide ${name}`}><input type="checkbox" checked={visible!==false} disabled={nativeGraphicsDisabled} aria-label={`Show ${name}`} onChange={event=>onNativeGraphicVisibilityChange?.(id,event.target.checked)}/></label> : piece ? <button type="button" className="clo-object-mini-action" aria-label={`${piece.visible3d === false ? 'Show' : 'Hide'} ${name} in 3D`} title="Toggle 3D visibility" onClick={() => onTogglePieceProperty?.(id, 'visible3d')} >{piece.visible3d === false ? <EyeOff size={13}/> : <Eye size={13}/>}</button> : ['button','buttonhole','zipper','binding','topstitch','fastener','puckering','imported-hardware'].includes(type)
            ? <label className="clo-object-graphic-toggle" title={visible===false?`Show ${name}`:`Hide ${name}`}><input type="checkbox" checked={visible!==false} aria-label={`Show ${name}`} onChange={event=>onObjectVisibilityChange?.({source:source||'draft',type,id,itemId,pieceId},event.target.checked)}/></label>
            : <span className="clo-row-visible" aria-hidden="true">✓</span>}
          <button type="button" className="clo-object-select" aria-current={current?'true':undefined} onClick={()=>{action?.();onSelectedObjectChange?.({source:source||(nativeMode && (!draftAnnotationTabs.includes(tab)||tab==='Graphic')?'native':'draft'),type:type||tab,id,name,pieceId,itemId,collection})}}>{thumbnail ? <img className="clo-object-graphic-thumbnail" src={thumbnail} alt=""/> : color ? <span className="clo-material-swatch" style={{background:color}}/> : <Icon size={16}/>}<span className="clo-object-row-name">{name}{detail&&<small>{detail}</small>}</span></button>
          {tab==='Fabric'?<div className="clo-object-fabric-icons"><button type="button" aria-label={`Texture Repeat for ${name}`} title="Edit texture repeat in Fabric Property Editor" onClick={()=>{selectFabric(id,name);onFabricTextureRepeat?.(id)}}><Repeat2 size={14}/></button><button type="button" aria-label={`Add Print to ${name}`} title="Import a printed graphic layer" onClick={()=>{selectFabric(id,name);onFabricAddPrint?.(id)}}><ImagePlus size={14}/></button></div> : piece ? <button type="button" className="clo-object-mini-action" aria-label={`${piece.locked ? 'Unlock' : 'Lock'} ${name}`} title="Toggle pattern editing lock" onClick={() => onTogglePieceProperty?.(id, 'locked')}>{piece.locked ? <Lock size={13}/> : <Unlock size={13}/>}</button> : <MoreHorizontal size={13}/>}
        </div>
      }) : <div className="clo-object-empty">{objectSearch ? 'No matching objects.' : `No ${tab.toLowerCase()} objects in the project yet.`}</div>}
    </div>
    </>}
  </section>
}
