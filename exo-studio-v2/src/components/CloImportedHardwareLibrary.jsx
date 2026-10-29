import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Box, Image as ImageIcon, PackageOpen, Search, X } from 'lucide-react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import LibraryAssetHover from './LibraryAssetHover.jsx'
import { CLO_IMPORT_CATEGORIES, CLO_IMPORT_MANIFEST_URL, normalizeCloImportedHardwareManifest } from '../data/cloImportedHardwareCatalog.js'
import './CloImportedHardwareLibrary.css'

function ModelPreview({ item }) {
  const mount = useRef(null)
  const [error, setError] = useState('')
  const [ready,setReady] = useState(false)
  useEffect(() => {
    if (!item?.model || !mount.current) return undefined
    let disposed = false
    let raf = 0
    const host = mount.current
    let renderer
    let root
    let observer
    let flatGeometry = false
    let initialRotation = 0
    setReady(false)
    setError('')
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#b9c3ca')
    const camera = new THREE.PerspectiveCamera(35, 1, 0.001, 10000)
    scene.add(new THREE.HemisphereLight('#ffffff', '#79828e', 3.2))
    const studioLight = (color, intensity, x, y, z) => {
      const source = new THREE.DirectionalLight(color, intensity)
      source.position.set(x, y, z)
      scene.add(source)
    }
    studioLight('#ffffff', 4.0, 4, 7, 9)
    studioLight('#dbeaff', 2.6, -7, 3, 5)
    studioLight('#ffffff', 3.0, 2, 5, -8)
    studioLight('#f7e9dd', 1.3, -4, -3, -6)
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.3
      host.appendChild(renderer.domElement)
      const resize = () => {
        const { width, height } = host.getBoundingClientRect()
        if (!width || !height) return
        renderer.setSize(width, height, false)
        camera.aspect = width / height
        camera.updateProjectionMatrix()
      }
      observer = new ResizeObserver(resize)
      observer.observe(host)
      resize()
      new GLTFLoader().load(item.model, gltf => {
        if (disposed) {
          gltf.scene.traverse(object => { object.geometry?.dispose?.() })
          return
        }
        root = gltf.scene
        // Some original button GLBs share one near-black, 2x2 flat texture
        // across the button face, holes and thread. Studio lights alone cannot
        // reveal its construction. Apply neutral, high-contrast DISPLAY-ONLY
        // materials to the preview meshes; the stored GLB and on-garment
        // source finishes are never changed.
        let part=0
        root.traverse(object=>{
          if(!object.isMesh)return
          const partIndex=part++
          const illuminate=original=>{
            const mat=original.clone()
            const nearBlack=mat.color&&Math.max(mat.color.r,mat.color.g,mat.color.b)<0.3
            const tinyMap=mat.map?.image && (mat.map.image.width||1)<=4 && (mat.map.image.height||1)<=4
            if(nearBlack&&tinyMap){
              // When a source has a uniformly dark texture, showing it at
              // source value produces an unreadable black silhouette.
              if(tinyMap)mat.map=null
              if(mat.color)mat.color.set(item.category==='button'
                ? '#9fa5a9'
                : '#9caab4')
              if('metalness' in mat)mat.metalness=Math.max(.08,Math.min(.27,mat.metalness??0))
              if('roughness' in mat)mat.roughness=.55
            }
            return mat
          }
          object.material=Array.isArray(object.material)
            ?object.material.map(illuminate):illuminate(object.material)
        })
        scene.add(root)
        const bounds = new THREE.Box3().setFromObject(root)
        const size = bounds.getSize(new THREE.Vector3())
        const radius = size.length()
        if (!Number.isFinite(radius) || radius < 1e-8) { setError('Model has no visible geometry'); return }
        root.position.sub(bounds.getCenter(new THREE.Vector3()))
        // View the broad face of thin buttons, rings, tapes and zipper parts.
        // Their actual source materials stay untouched; only preview lighting changes.
        const dimensions = [size.x, size.y, size.z]
        const smallestAxis = dimensions.indexOf(Math.min(...dimensions))
        flatGeometry = dimensions[smallestAxis] < Math.max(...dimensions) * 0.18
        const direction = new THREE.Vector3(0.65, 0.45, 1)
        if (flatGeometry) {
          direction.set(smallestAxis === 0 ? 1 : 0.16,
            smallestAxis === 1 ? 1 : 0.22,
            smallestAxis === 2 ? 1 : 0.16)
        }
        direction.normalize()
        const fitDistance = (radius * 0.5) / Math.sin(THREE.MathUtils.degToRad(camera.fov) * 0.5)
        const fitAspect = Math.min(1, Math.max(0.4, host.clientWidth / Math.max(1, host.clientHeight)))
        camera.position.copy(direction.multiplyScalar(fitDistance * 1.35 / fitAspect))
        camera.near = Math.max(radius / 1000, 0.00001)
        camera.far = radius * 100
        camera.lookAt(0, 0, 0)
        camera.updateProjectionMatrix()
        setError('')
        setReady(true)
      }, undefined, () => { if (!disposed) setError('3D preview unavailable') })
      const render = () => {
        if (disposed) return
        if (root) {
          // A complete turn hides the face of thin hardware for much of the animation.
          if (flatGeometry) root.rotation.y = initialRotation + Math.sin(performance.now() * 0.0005) * 0.17
          else root.rotation.y += 0.003
        }
        renderer.render(scene, camera)
        raf = requestAnimationFrame(render)
      }
      render()
    } catch { setError('3D rendering unavailable') }
    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      observer?.disconnect()
      if (root) root.traverse(object => {
        object.geometry?.dispose?.()
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        materials.forEach(material => { if (material) material.dispose?.() })
      })
      renderer?.dispose()
      renderer?.domElement?.remove()
    }
  }, [item?.model])
  if (!item?.model) return <div className="clo-imported-no-model"><ImageIcon size={24}/><span>Source asset only · no GLB preview</span></div>
  return <div className="clo-imported-model" ref={mount} data-model-preview-ready={ready} aria-label={`Rotating 3D preview of ${item.name}`}>
    {!ready && !error && <div className="clo-imported-model-loading">Loading 3D model…</div>}
    {error && <div className="clo-imported-model-error">{error}</div>}
  </div>
}

function HardwareHoverPreview({item}) {
  if(item.category==='button'&&item.model&&item.thumbnail)return <div className="clo-imported-button-comparison" data-hardware-hover-geometry={item.id}>
    <div className="clo-imported-button-3d"><span>ORIGINAL 3D MESH</span><ModelPreview item={item}/></div>
    <div className="clo-imported-button-reference"><span>SHAPE REFERENCE</span><img src={item.thumbnail} alt={`Construction detail reference for ${item.name}`}/></div>
  </div>
  if(item.model)return <div className="clo-imported-hover-model" data-hardware-hover-geometry={item.id}>
    <ModelPreview item={item}/>
  </div>
  return <div className="clo-imported-hover-reference" data-hardware-hover-reference={item.id}>
    {item.thumbnail?<img src={item.thumbnail} alt={`Enlarged reference for ${item.name}`}/>:<ImageIcon size={35}/>}
    <small>Reference only · no standalone 3D mesh</small>
  </div>
}

/** Standalone browser; onSelectAsset receives a normalized record plus its untouched source metadata. */
export default function CloImportedHardwareLibrary({ manifestUrl = CLO_IMPORT_MANIFEST_URL, onSelectAsset, onPlaceAsset, onCatalogInfo, selectedAssetId, itemsOverride, compact=false, className = '' }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [preview, setPreview] = useState(null)
  useEffect(() => {
    if(compact)return undefined
    const controller = new AbortController()
    setLoading(true)
    setLoadError('')
    fetch(manifestUrl, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error(`Catalog HTTP ${response.status}`)
      const data = await response.json()
      const normalized=normalizeCloImportedHardwareManifest(data)
      setItems(normalized)
      onCatalogInfo?.({total:normalized.length,models:normalized.filter(item=>item.model).length})
    }).catch(error => { if (!controller.signal.aborted) setLoadError(error.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [manifestUrl,compact])
  const catalogItems=compact?(itemsOverride||[]):items
  const counts = useMemo(() => Object.fromEntries(CLO_IMPORT_CATEGORIES.map(([key]) => [key, catalogItems.filter(item => item.category === key).length])), [catalogItems])
  const visible = useMemo(() => catalogItems.filter(item =>
    (category === 'all' || (category === 'new-3d' && Boolean(item.model)) || (category === 'references' && !item.model) || item.category === category) &&
    (compact||`${item.name} ${item.category} ${item.sourcePath} ${item.vendor} ${item.material} ${item.format}`.toLowerCase().includes(search.trim().toLowerCase()))
  ), [catalogItems,category,search,compact])
  const modelCount = catalogItems.filter(item => item.model).length
  return <section className={`clo-imported-library ${compact?'clo-imported-library--nested':''} ${className}`} aria-label="Imported hardware and trims">
    {!compact&&<>
    <header className="clo-imported-header"><span className="clo-imported-eyebrow">LOCAL ASSET REFERENCE</span><strong>Hardware & Trims</strong>
      <p>{loading ? 'Reading asset catalog…' : `${items.length} indexed source files · ${modelCount} with 3D previews`}</p>
      <small>Local imported reference assets. Original asset ownership and licensing remain with their respective rights holders. Preview geometry is for visual reference; no manufacturing dimensions or cloth physics are verified.</small>
    </header>
    <label className="clo-imported-search"><Search size={15}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search buttons, YKK, zippers, trims…" aria-label="Search imported hardware" /></label>
    <div className="clo-imported-categories" role="group" aria-label="Filter imported hardware category">
      <button type="button" aria-pressed={category === 'all'} onClick={() => setCategory('all')}>All <span>{items.length}</span></button>
      <button type="button" data-clo-imported-new-3d aria-pressed={category === 'new-3d'} onClick={() => setCategory('new-3d')}>New 3D <span>{modelCount}</span></button>
      <button type="button" data-clo-imported-references aria-pressed={category === 'references'} onClick={() => setCategory('references')}>Source files <span>{items.length-modelCount}</span></button>
      {CLO_IMPORT_CATEGORIES.filter(([key]) => counts[key]).map(([key, label]) => <button type="button" key={key} aria-pressed={category === key} onClick={() => setCategory(key)}>{label} <span>{counts[key]}</span></button>)}
    </div>
    </>}
    {loadError && <div className="clo-imported-empty" role="alert">Unable to load imported catalog: {loadError}. Expected {manifestUrl}</div>}
    {!compact&&!loading && !loadError && !visible.length && <div className="clo-imported-empty">{items.length ? 'No matching files. Try another category or search.' : 'No hardware files are listed in the manifest yet.'}</div>}
    <div className="clo-imported-grid" role="list" aria-label="Imported hardware assets">
      {visible.map(item => <LibraryAssetHover key={item.id} category="hardware" id={item.id}
        title={item.name}
        description={`${item.vendor && !['Unknown','CLO'].includes(item.vendor) ? `${item.vendor} · ` : ''}${item.model?'3D hardware model':'Hardware reference'} · ${item.format || 'Asset'}`}
        details={[
          ['Category',CLO_IMPORT_CATEGORIES.find(([key])=>key===item.category)?.[1]||item.category],
          ['Material',item.material||'Not specified'],
          ['Format',item.format||'Unknown'],
          ['Geometry',item.model?'Original imported 3D mesh':'No standalone 3D mesh'],
        ]}
        source="Preview lighting may lift very dark parts to reveal construction. Original source finishes remain on the garment; supplier dimensions and licensing require verification."
        preview={<HardwareHoverPreview item={item}/>}>
      <button type="button" role="listitem" className="clo-imported-tile" aria-pressed={selectedAssetId === item.id} onClick={() => { setPreview(item); onSelectAsset?.(item) }}>
        <span className={`clo-imported-thumb ${item.model?'clo-imported-thumb--mesh':''}`}>{item.thumbnail ? <img src={item.thumbnail} loading="lazy" alt="" onError={event => { event.currentTarget.style.display = 'none' }} /> : item.model ? <Box size={25}/> : <ImageIcon size={23}/>}</span>
        <span className="clo-imported-tile-text"><strong title={item.name}>{item.name}</strong><small>{item.vendor==='YKK'?'YKK · ':''}{item.model?'3D model': 'Source reference'} · {item.format || 'ASSET'}</small></span>
      </button>
      </LibraryAssetHover>)}
    </div>
    {preview && <div className="clo-imported-overlay" onMouseDown={event => { if (event.target === event.currentTarget) setPreview(null) }}>
      <div className="clo-imported-dialog" role="dialog" aria-modal="true" aria-label={`${preview.name} asset preview`} onKeyDown={event => { if (event.key === 'Escape') setPreview(null) }}>
        <div className="clo-imported-dialog-head"><div><small>HARDWARE & TRIMS · ASSET PREVIEW</small><h3>{preview.name}</h3></div><button type="button" autoFocus aria-label="Close asset preview" onClick={() => setPreview(null)}><X size={17}/></button></div>
        {preview.model?<HardwareHoverPreview item={preview}/>:<ModelPreview item={preview}/>}
        {preview.model&&onPlaceAsset&&<button type="button" data-clo-imported-place="true" onClick={()=>{onPlaceAsset(preview);setPreview(null)}} style={{margin:'12px 16px 2px',padding:'10px',background:'#36566b',border:'1px solid #8cb4ca',color:'#edf7ff',borderRadius:6,fontWeight:650,cursor:'pointer'}}>Place 3D model on garment</button>}
        <dl><div><dt>Category</dt><dd>{preview.category}</dd></div><div><dt>Source format</dt><dd>{preview.format || 'Unknown'}</dd></div><div><dt>Conversion</dt><dd>{preview.model ? 'GLB available' : preview.status || 'Source only'}</dd></div>{preview.sourcePath && <div><dt>Source filename</dt><dd title={preview.sourcePath}>{preview.sourcePath.replace(/\\/g,'/').split('/').pop()}</dd></div>}</dl>
        <p className="clo-imported-provenance">Local imported hardware reference. Preview geometry, when available, is not validated for manufacturing, fit, sewing, or simulation.</p>
      </div>
    </div>}
  </section>
}
