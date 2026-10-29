import React,{useEffect,useMemo,useState} from 'react'
import {ChevronDown,ChevronRight,Folder,Layers,Plus,Save,Search,Trash2,Table2,Square,LayoutTemplate} from 'lucide-react'
import LibraryAssetHover from './LibraryAssetHover.jsx'
import TechPackTemplatePreview from './TechPackTemplatePreview.jsx'
import {TECHPACK_HEADERS,TECHPACK_LAYOUTS,TECHPACK_THEMES,TECHPACK_TEMPLATES,TECHPACK_BOX_TEMPLATES,TECHPACK_TABLE_TEMPLATES,loadTechPackUserPresets,saveTechPackUserPreset,deleteTechPackUserPreset} from '../core/techPackTemplatePresets.js'
import {captureTechPackPageLayout} from '../core/techPackPageComposer.js'
import './TechPackTemplateLibrary.css'

const FOLDERS=[
  {id:'packs',name:'Full techpacks',sub:'Apply a layout across all pages'},
  {id:'pages',name:'Page templates',sub:'Patterns, fabric, measurements and more'},
  {id:'headers',name:'Header templates',sub:'Change the title block only'},
  {id:'boxes',name:'Boxes & frames',sub:'Insert editable visual detail boxes'},
  {id:'tables',name:'Table templates',sub:'Insert preformatted specification tables'},
  {id:'garments',name:'Garment types',sub:'Layout recipes by category'},
  {id:'themes',name:'Color palettes',sub:'Document or page color systems'},
  {id:'interactive',name:'Interactive pages',sub:'3D viewer and annotated details'},
  {id:'custom',name:'Saved presets',sub:'Your reusable layouts'},
]
const options=(collection,chosen,onChange,label)=><select aria-label={label} value={chosen} onChange={e=>onChange(e.target.value)}>{collection.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select>
const itemsFor=(id,custom)=>id==='headers'?TECHPACK_HEADERS.map(item=>({...item,kind:'header',category:'headers',header:item.id,layout:'balanced',theme:'mono',description:item.detail})):
  id==='themes'?TECHPACK_THEMES.map(item=>({...item,kind:'theme',category:'themes',theme:item.id,layout:'balanced',header:'seville',description:'Page accent, ruling and title block wash',colors:item})):
  id==='boxes'?TECHPACK_BOX_TEMPLATES:id==='tables'?TECHPACK_TABLE_TEMPLATES:id==='custom'?custom:TECHPACK_TEMPLATES.filter(item=>item.category===id)

export default function TechPackTemplateLibrary({workspace={},page,onApply,onNavigate,onInsertBox=()=>{},onInsertTable=()=>{},onCreatePage=()=>{},onCreatePack=()=>{},onRestyle=()=>{}}){
  const [folder,setFolder]=useState('packs')
  const [custom,setCustom]=useState(loadTechPackUserPresets)
  useEffect(()=>{const reload=()=>setCustom(loadTechPackUserPresets());window.addEventListener('exo-techpack-user-templates-changed',reload);window.addEventListener('storage',reload);return ()=>{window.removeEventListener('exo-techpack-user-templates-changed',reload);window.removeEventListener('storage',reload)}},[])
  const [search,setSearch]=useState('')
  const [builderOpen,setBuilderOpen]=useState(false)
  const [name,setName]=useState('My studio layout')
  const [layout,setLayout]=useState('square')
  const [header,setHeader]=useState('technical')
  const [theme,setTheme]=useState('mono')
  const [colors,setColors]=useState(null)
  const [notice,setNotice]=useState('')
  const themePalette=TECHPACK_THEMES.find(item=>item.id===theme)||TECHPACK_THEMES[0]
  const palette={...themePalette,...colors}
  const recipe={name,layout,header,theme,colors:palette}
  const saveCurrentArtboard=()=>{
    if(!name.trim()){setNotice('Name your blank artboard before saving.');return}
    if(!page){setNotice('Select an artboard to save its layout.');return}
    try{
      setCustom(saveTechPackUserPreset(captureTechPackPageLayout(workspace,page,name.trim(),{includeContent:false})))
      setFolder('custom')
      setNotice('Blank artboard saved. Frames, positions, table headers and styling are reusable; entered values are excluded.')
      window.dispatchEvent(new Event('exo-techpack-user-templates-changed'))
    }catch{setNotice('Could not save the artboard in local storage.')}
  }
  const apply=(preset,toPage)=>{
    onApply(preset,toPage)
    if(preset.pageId&&toPage)onNavigate(preset.pageId)
    setNotice(`${preset.name} applied ${toPage?'to the selected sheet':'across the document'}.`)
  }
  const insert=(item)=>{
    if(item.category==='boxes')onInsertBox(item)
    else onInsertTable(item)
    setNotice(`${item.name} inserted on the selected page.`)
  }
  const usePreset=item=>{
    if(item.category==='boxes'||item.category==='tables')insert(item)
    else if(item.kind==='pack-layout')onCreatePack(item)
    else if(item.kind==='page-layout')onCreatePage(item)
    else apply(item,['pages','interactive'].includes(item.category)?item.pageId||page:page)
  }
  const startDrag=(event,item)=>{
    const payload={...item,id:item.id,category:item.category,pageId:item.pageId||null,name:item.name}
    const json=JSON.stringify(payload)
    event.dataTransfer.setData('application/x-exo-techpack-template',json)
    event.dataTransfer.setData('text/plain',json)
    event.dataTransfer.effectAllowed='copy'
  }
  const list=useMemo(()=>itemsFor(folder,custom).filter(item=>(item.name+' '+(item.description||'')+' '+(item.pageId||'')).toLowerCase().includes(search.toLowerCase().trim())),[folder,custom,search])
  return <div className="tpws-template-library" aria-label="Techpack templates and layout builder">
    <header className="tpws-template-library-title"><Layers size={16}/><div><strong>TEMPLATE LIBRARY</strong><small>EXO / REUSABLE SHEETS & COMPONENTS</small></div></header>
    <label className="tpws-template-search"><Search size={14}/><input aria-label="Search Techpack templates" placeholder="Search pages, headers, tables..." value={search} onChange={e=>setSearch(e.target.value)}/>{search&&<button type="button" onClick={()=>setSearch('')} aria-label="Clear template search">×</button>}</label>
    <nav className="tpws-template-folders" aria-label="Techpack template folders">
      {FOLDERS.map(item=><button type="button" key={item.id} className={folder===item.id?'active':''} aria-current={folder===item.id?'page':undefined} aria-label={`Open ${item.name} templates`} onClick={()=>setFolder(item.id)}>
        {item.id==='boxes'?<Square size={15}/>:item.id==='tables'?<Table2 size={15}/>:item.id==='headers'?<LayoutTemplate size={15}/>:<Folder size={15}/>}<span>{item.name}</span><small>{itemsFor(item.id,custom).length}</small>
      </button>)}
    </nav>
    <div className="tpws-template-collection">
      <div className="tpws-template-collection-heading"><strong>{FOLDERS.find(item=>item.id===folder)?.name}</strong><small>{FOLDERS.find(item=>item.id===folder)?.sub}</small><span>{list.length} {list.length===1?'PRESET':'PRESETS'}</span></div>
      {folder==='pages'&&<p className="tpws-template-page-note">Page templates apply to their matching page, including Pattern Drawing, Grading, Measurement and Fabric Specification.</p>}
      <div className="tpws-template-card-grid">{list.map(item=><LibraryAssetHover key={item.id} category="Techpack" id={item.id} title={item.name} description={item.description||item.detail||'Reusable document composition'}
        details={[["Type",FOLDERS.find(f=>f.id===folder)?.name],["Destination",item.pageId||'Selected page / complete pack'],["Paper","US Letter 8.5 × 11"]]}
        source="Visual template preview only. Factory measurements and source patterns are not replaced."
        preview={<TechPackTemplatePreview preset={item}/>}>
        <article className="tpws-template-card" tabIndex={0} draggable onDragStart={event=>startDrag(event,item)} onDoubleClick={event=>{if(event.target.closest('button'))return;usePreset(item)}} onKeyDown={event=>{if(event.target!==event.currentTarget)return;if(event.key==='Enter'){event.preventDefault();usePreset(item)}}} aria-label={`${item.name} template. Double click or press Enter to use. Drag to a sheet to place.`} title="Double-click to use · Drag onto a page">
          <TechPackTemplatePreview preset={item} compact/>
          <div className="tpws-template-card-copy"><strong>{item.name}</strong><small>{item.description||item.detail}</small></div>
          <div className="tpws-template-card-actions">
            {['boxes','tables'].includes(folder)?<button type="button" onClick={()=>insert(item)}><Plus size={12}/> Insert {folder==='boxes'?'box':'table'}</button>:
              item.kind==='pack-layout'?<button type="button" title="Apply all page layouts and Excel schemas from this saved studio Techpack system to the current garment" onClick={()=>onCreatePack(item)}>Use complete system</button>:
              item.kind==='page-layout'?<><button type="button" title="Create a completely new page from this saved design" onClick={()=>onCreatePage(item)}><Plus size={12}/> New artboard</button><button type="button" title="Retain all information and objects; only adopt this template's theme, paper and header" onClick={()=>onRestyle(item)}>Restyle only</button></>:
              folder==='pages'||folder==='interactive'?<button type="button" onClick={()=>apply(item,item.pageId||page)}>Use on {item.pageId||'page'}</button>:
              <><button type="button" onClick={()=>apply(item,page)}>This page</button><button type="button" className="tpws-apply-pack" onClick={()=>apply(item,null)}>Whole pack</button></>}
            {folder==='custom'&&<button type="button" title={`Delete ${item.name}`} aria-label={`Delete template ${item.name}`} onClick={()=>{setCustom(deleteTechPackUserPreset(item.id));setNotice('Saved template removed.')}}><Trash2 size={12}/></button>}
          </div>
        </article>
      </LibraryAssetHover>)}
      </div>
      {list.length===0&&<p className="tpws-template-empty">No templates match your search in this folder.</p>}
    </div>
    <section className="tpws-template-builder" aria-label="Create custom techpack template">
      <button type="button" className="tpws-template-builder-toggle" aria-expanded={builderOpen} onClick={()=>setBuilderOpen(open=>!open)}><Plus size={14}/><strong>CREATE YOUR OWN TEMPLATE</strong>{builderOpen?<ChevronDown size={13}/>:<ChevronRight size={13}/>}</button>
      {builderOpen&&<div className="tpws-template-builder-body">
        <label>Preset name<input aria-label="Custom template name" maxLength={70} value={name} onChange={e=>setName(e.target.value)}/></label>
        <label>Page composition{options(TECHPACK_LAYOUTS,layout,setLayout,'Custom layout type')}</label>
        <label>Header style{options(TECHPACK_HEADERS,header,setHeader,'Custom header style')}</label>
        <label>Color theme{options(TECHPACK_THEMES,theme,v=>{setTheme(v);setColors(null)},'Custom color theme')}</label>
        <div className="tpws-template-swatches">{[['accent','Accent'],['line','Rules'],['wash','Tint']].map(([key,label])=><label key={key}><span>{label}</span><input type="color" aria-label={`${label} template color`} value={palette[key]} onChange={e=>setColors(current=>({...current,[key]:e.target.value}))}/></label>)}</div>
        <div className="tpws-template-builder-actions"><button type="button" onClick={()=>apply(recipe,page)}>This page</button><button type="button" onClick={()=>apply(recipe,null)}>Whole pack</button><button type="button" className="tpws-template-save" onClick={()=>{if(!name.trim()){setNotice('Name the preset before saving.');return}try{setCustom(saveTechPackUserPreset(recipe));setFolder('custom');setNotice('Saved to My templates.')}catch{setNotice('Local storage unavailable; export the document to preserve this layout.')}}}><Save size={13}/> Save preset</button><button type="button" className="tpws-template-save" onClick={saveCurrentArtboard}><LayoutTemplate size={13}/> Save current artboard as blank template</button></div>
      </div>}
      {notice&&<p className="tpws-template-notice" role="status">{notice}</p>}
      <p className="tpws-template-helper">Double-click a saved page to make a fresh artboard; drag a table into a box to insert the widget. Restyle changes appearance while preserving existing cell values and photos.</p>
    </section>
  </div>
}
