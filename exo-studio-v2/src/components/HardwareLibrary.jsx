import React,{useEffect,useMemo,useState} from 'react'
import {ChevronDown,ChevronRight,PackageOpen} from 'lucide-react'
import {listHardwarePresets} from '../data/hardwarePresets.js'
import LibraryAssetHover from './LibraryAssetHover.jsx'
import PremiumHardware3DPreview from './PremiumHardware3DPreview.jsx'
import CloImportedHardwareLibrary from './CloImportedHardwareLibrary.jsx'
import {CLO_IMPORT_MANIFEST_URL,normalizeCloImportedHardwareManifest} from '../data/cloImportedHardwareCatalog.js'
import {HARDWARE_FOLDERS,folderIncludes} from '../data/libraryFolderTree.js'
import './HardwareLibrary.css'

// The CLO meshes live beside EXO's native designs in the matching folders.
// Companion OBJ archives are grouped by part (puller/slider), not ZIP format.
const groups=[
  ['button','Buttons'],['buttonhole','Buttonholes'],['zipper','Zippers'],
  ['slider','Sliders'],['puller','Pullers'],['stopper','Stoppers'],
  ['tape','Zipper Tapes & Teeth'],['snap','Snaps'],['rivet','Rivets'],
  ['buckle','Buckles & Rings'],['graphic','Graphics'],['trim','Other Trims'],
]
// Curated by visual inspection of docs/hardware-contact-sheet-20261017.jpg.
// All presets stay available for legacy selections and production annotations.
const featuredIds = new Set([
  'black-matte-button','coat-shank-button','four-hole-shirt-button','gold-shank-button',
  'horn-look-button','mother-of-pearl-look','pearl-shirt-button','silver-ring-button',
  'square-fashion-button','two-hole-button',
  'coil-zipper-5','invisible-zipper','metal-jeans-zipper','molded-zipper-8','two-way-outerwear-zipper',
  'd-ring','prong-buckle','slide-adjuster',
])

function HardwareThumbnail({preset}){
  return <span className="exo-hardware-thumb" data-preview-source={preset.previewImage ? 'premium-glb-render' : 'procedural-legacy'}><img src={preset.previewImage || `/hardware-thumbnails/${preset.id}.png`} alt={`${preset.name} rendered hardware preview`} width="176" height="176" loading="lazy" decoding="async"/></span>
}

export function LibraryHardwarePreview({preset,style}){
  if(!preset)return null
  const dimensions=Object.entries(preset.dimensionsMm).map(([name,value])=>`${name.replace(/([A-Z])/g,' $1').toLowerCase()}: ${value} mm`).join(' · ')
  return <aside className="exo-hardware-hover-preview" style={style} data-hardware-preview={preset.id} aria-label={`${preset.name} enlarged 3D render`}>
    <div className="exo-hardware-preview-visual"><img src={preset.previewImage || `/hardware-thumbnails/${preset.id}.png`} alt={`${preset.name} 3D model render`} width="352" height="352" decoding="async"/><span>3D STUDIO RENDER</span></div>
    <div className="exo-hardware-preview-details"><strong>{preset.name}</strong><span>{preset.kind.toUpperCase()} · {preset.finish}</span>
      <dl><div><dt>Dimensions</dt><dd>{dimensions}</dd></div><div><dt>Material</dt><dd>{preset.material}</dd></div><div><dt>Appearance</dt><dd><span className="exo-hardware-pbr-swatch" style={{backgroundColor:preset.pbr.baseColor}}/>{preset.pbr.baseColor} · metal {preset.pbr.metalness.toFixed(2)} · roughness {preset.pbr.roughness.toFixed(2)}</dd></div><div><dt>Construction</dt><dd>{preset.construction}</dd></div></dl>
      <small>{preset.modelAsset ? 'Original 3D model rendered in Blender; illustrative dimensions and finishes.' : 'Procedural 3D visualization; illustrative dimensions and finishes.'} Verify with supplier before production.</small>
    </div>
  </aside>
}

export default function HardwareLibrary({search='',folderFilter='all',selectedPresetId,onSelectPreset,onSelectImportedAsset,onPlaceImportedAsset}){
  const [expanded,setExpanded]=useState(()=>new Set(['button','buckle']))
  const [showAll,setShowAll]=useState(false)
  const [showReferences,setShowReferences]=useState(false)
  const [importedAssets,setImportedAssets]=useState([])
  const [catalogState,setCatalogState]=useState('loading')
  useEffect(()=>{
    if(folderFilter==='all')return
    setExpanded(previous=>new Set([...previous,...groups.filter(([kind])=>folderIncludes(folderFilter,kind,HARDWARE_FOLDERS)).map(([kind])=>kind)]))
  },[folderFilter])
  useEffect(()=>{
    const controller=new AbortController()
    fetch(CLO_IMPORT_MANIFEST_URL,{signal:controller.signal})
      .then(async response=>{
        if(!response.ok)throw new Error(`HTTP ${response.status}`)
        return response.json()
      })
      .then(data=>{if(!controller.signal.aborted){setImportedAssets(normalizeCloImportedHardwareManifest(data));setCatalogState('ready')}})
      .catch(()=>{if(!controller.signal.aborted)setCatalogState('error')})
    return()=>controller.abort()
  },[])
  const query=search.trim().toLowerCase()
  const matchingImports=useMemo(()=>importedAssets.filter(item=>
    `${item.name} ${item.category} ${item.sourcePath} ${item.vendor} ${item.material} ${item.format}`.toLowerCase().includes(query)
  ),[importedAssets,query])
  const visiblePresets=listHardwarePresets().filter(preset=>showAll||query||featuredIds.has(preset.id)||selectedPresetId===preset.id)
  const toggle=kind=>setExpanded(previous=>{
    const next=new Set(previous)
    if(next.has(kind))next.delete(kind);else next.add(kind)
    return next
  })
  return <section className="exo-hardware-library" aria-label="Hardware and trims library">
    <div className="exo-hardware-library-summary"><PackageOpen size={14}/><strong>Hardware & Trims folders</strong>
      <small>{catalogState==='loading'?'Loading imported hardware files…':catalogState==='error'?'Imported hardware catalog unavailable':`${importedAssets.length} imported assets · ${importedAssets.filter(item=>item.model).length} placeable 3D · ${listHardwarePresets().length} EXO designs`}</small>
      <button type="button" className="exo-hardware-show-all" aria-pressed={showAll} onClick={()=>setShowAll(current=>!current)}>{showAll?'Featured designs':'All designs'}</button><button type="button" className="exo-hardware-show-all" aria-pressed={showReferences} onClick={()=>setShowReferences(v=>!v)}>{showReferences ? 'Hide texture/source references' : 'Show texture/source references'}</button></div>
    {groups.map(([kind,title])=>{
      const items=visiblePresets.filter(item=>item.kind===kind&&`${item.name} ${item.finish} ${item.material} ${item.construction}`.toLowerCase().includes(query))
      const imports=matchingImports.filter(item=>item.category===kind&&(item.model||showReferences))
      if((folderFilter!=='all'&&!folderIncludes(folderFilter,kind,HARDWARE_FOLDERS))||(!items.length&&!imports.length))return null
      const isOpen=Boolean(query)||expanded.has(kind)
      return <div className="exo-hardware-folder" key={kind} data-hardware-category-folder={kind}>
        <button type="button" className="exo-hardware-folder-toggle" aria-expanded={isOpen} aria-label={`${title} folder`} onClick={()=>toggle(kind)}>
          {isOpen?<ChevronDown size={13}/>:<ChevronRight size={13}/>}<strong>{title}</strong><span data-hardware-category-count={kind}>{items.length+imports.length}</span>
        </button>
        {isOpen&&<div className="exo-hardware-folder-items" aria-label={`${title} assets`}>
          {items.map(preset=><LibraryAssetHover key={preset.id} category="hardware" id={preset.id} title={preset.name} description={`${preset.kind} · ${preset.finish}`} details={[
            ['Dimensions',Object.entries(preset.dimensionsMm||{}).map(([name,value])=>`${name.replace(/([A-Z])/g,' $1').toLowerCase()}: ${value} mm`).join(' · ')],
            ['Material',preset.material],['Finish',preset.finish],['Construction',preset.construction],
            ['PBR',`metal ${preset.pbr?.metalness?.toFixed(2)??'—'} · roughness ${preset.pbr?.roughness?.toFixed(2)??'—'}`],
          ]} source={preset.modelAsset ? 'Original EXO 3D GLB with studio-rendered thumbnail. Reference size only; supplier engineering data remains unverified.' : 'Live parametric 3D mesh shared with garment rendering · illustrative specifications'} preview={<PremiumHardware3DPreview preset={preset}/>}>
          <button type="button" role="listitem" data-hardware-preset={preset.id} className={`exo-hardware-asset ${selectedPresetId===preset.id?'active':''}`} aria-pressed={selectedPresetId===preset.id} onClick={()=>onSelectPreset?.(preset)}>
            <HardwareThumbnail preset={preset}/>
            <span className="exo-hardware-asset-caption"><strong>{preset.name}</strong><small>{preset.finish}</small><small>{preset.dimensionsMm.diameter??preset.dimensionsMm.capDiameter??preset.dimensionsMm.length??preset.dimensionsMm.nominalChainWidth??preset.dimensionsMm.innerWidth??preset.dimensionsMm.width??preset.dimensionsMm.headDiameter??preset.dimensionsMm.outerWidth??'—'} mm · {preset.material}</small></span>
          </button></LibraryAssetHover>)}
          {imports.length>0&&<CloImportedHardwareLibrary compact itemsOverride={imports} onSelectAsset={onSelectImportedAsset} onPlaceAsset={onPlaceImportedAsset}/>}
        </div>}
      </div>
    })}
    {catalogState==='error'&&<p role="alert" className="exo-hardware-empty">Unable to load the local hardware catalog. EXO designs are still available.</p>}
    {query&&!matchingImports.length&&!listHardwarePresets().some(item=>`${item.name} ${item.finish} ${item.material} ${item.construction}`.toLowerCase().includes(query))&&<p className="exo-hardware-empty">No matching hardware. Search by style, material, vendor or finish.</p>}
  </section>
}
