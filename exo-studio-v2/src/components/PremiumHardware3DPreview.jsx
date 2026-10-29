import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import './PremiumHardware3DPreview.css'
import {createProceduralHardwarePreview} from '../core/proceduralHardwarePreview.js'

function disposeMeshTree(root) {
  root.traverse(node => {
    node.geometry?.dispose?.()
    const materials = Array.isArray(node.material) ? node.material : [node.material]
    materials.forEach(material => {
      if (!material) return
      for (const key of ['map', 'normalMap', 'metalnessMap', 'roughnessMap', 'aoMap', 'emissiveMap']) material[key]?.dispose?.()
      material.dispose?.()
    })
  })
}

/** A single, interactive viewer mounted only for an expanded hardware hover.
 * Actual imported GLB is displayed; no physics or production tolerances implied. */
export default function PremiumHardware3DPreview({ preset }) {
  const hostRef = useRef(null)
  const controlsRef = useRef(null)
  const rollRef = useRef(null)
  const [rolled,setRolled]=useState(false)
  const [status, setStatus] = useState('loading')
  const modelAsset = preset?.modelAsset
  const image = preset?.previewImage || `/hardware-thumbnails/${preset.id}.png`

  useEffect(() => {
    const host = hostRef.current
    if (!host) return undefined
    setStatus('loading');setRolled(false)
    let alive = true
    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
    } catch {
      setStatus('fallback')
      return undefined
    }
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(31, 1, .01, 100)
    camera.position.set(0, .05, 4.7)
    camera.lookAt(0, 0, 0)
    scene.add(new THREE.HemisphereLight(0xe9f0ff, 0x333946, 2.6))
    const softbox = new THREE.DirectionalLight(0xffffff, 4.8)
    softbox.position.set(-3, 5, 6)
    scene.add(softbox)
    const highlight = new THREE.DirectionalLight(0xc6d9ff, 3.4)
    highlight.position.set(4, 3, -4)
    scene.add(highlight)
    const warm = new THREE.DirectionalLight(0xffe6ce, 1.1)
    warm.position.set(3, -4, 5)
    scene.add(warm)
    const root = new THREE.Group()
    scene.add(root)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.3
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6))
    renderer.domElement.setAttribute('aria-label', `Rotate real 3D preview of ${preset.name}`)
    host.appendChild(renderer.domElement)
    let procedural = null
    const draw = () => {
      if (alive && renderer.domElement.parentNode) renderer.render(scene, camera)
    }
    const resize = () => {
      const width = Math.max(1, host.clientWidth), height = Math.max(1, host.clientHeight)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
      draw()
    }
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null
    observer?.observe(host)
    resize()
    let dragging = false, pointer = 0, previousX = 0
    const down = event => {
      dragging = true; pointer = event.pointerId; previousX = event.clientX
      renderer.domElement.setPointerCapture?.(pointer)
    }
    const move = event => {
      if (!dragging || pointer !== event.pointerId) return
      root.rotation.y += Math.max(-.18, Math.min(.18, (event.clientX - previousX) * .013))
      previousX = event.clientX
      draw()
    }
    const up = () => { dragging = false }
    for (const [event, callback] of [['pointerdown', down], ['pointermove', move], ['pointerup', up], ['pointercancel', up]]) {
      renderer.domElement.addEventListener(event, callback)
    }
    const loader = new GLTFLoader()
    const accept = gltf => {
      if (!alive) { disposeMeshTree(gltf.scene); return }
      const object = gltf.scene
      const bounds = new THREE.Box3().setFromObject(object)
      const dimensions = bounds.getSize(new THREE.Vector3())
      if (!Number.isFinite(dimensions.length()) || dimensions.lengthSq() < 1e-8) {
        disposeMeshTree(object)
        setStatus('fallback')
        return
      }
      // Apparel hardware GLBs vary between XY and XZ authoring planes.
      if (dimensions.y < dimensions.z * .32 && dimensions.y < dimensions.x * .32) object.rotation.x = Math.PI / 2
      else if (dimensions.x < dimensions.z * .32 && dimensions.x < dimensions.y * .32) object.rotation.y = Math.PI / 2
      object.updateMatrixWorld(true)
      const frameObject=()=>{
        object.scale.setScalar(1);object.position.set(0,0,0)
        object.traverse(node=>{if(node.geometry){node.geometry.computeBoundingBox();node.geometry.computeBoundingSphere()}if(node.isInstancedMesh){node.computeBoundingBox();node.computeBoundingSphere()}})
        object.updateMatrixWorld(true)
        const box=new THREE.Box3().setFromObject(object),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3())
        const scale=1.8/Math.max(size.x/Math.min(1,camera.aspect),size.y,size.z/Math.min(1,camera.aspect),.0001)
        object.scale.setScalar(scale);object.position.copy(center).multiplyScalar(-scale)
      }
      frameObject()
      root.add(object)
      let meshCount=0
      object.traverse(node=>{if(node.isMesh)meshCount++})
      renderer.domElement.dataset.hardwareMeshCount=String(meshCount)
      rollRef.current = procedural?.setRoll ? value=>{procedural.setRoll(value);root.rotation.y=value?-.55:0;frameObject();draw()} : null
      controlsRef.current = procedural?.setClosure ? value=>{procedural.setClosure(value);frameObject();draw()} : null
      setStatus('loaded')
      draw()
    }
    if(modelAsset) loader.load(modelAsset,accept,undefined,()=>{if(alive)setStatus('fallback')})
    else {try {procedural=createProceduralHardwarePreview(preset);accept({scene:procedural.object})} catch(error){console.error(error);setStatus('fallback')}}
    return () => {
      alive = false
      observer?.disconnect()
      for (const [event, callback] of [['pointerdown', down], ['pointermove', move], ['pointerup', up], ['pointercancel', up]]) {
        renderer.domElement.removeEventListener(event, callback)
      }
      controlsRef.current=null;rollRef.current=null
      procedural?.dispose?.()
      disposeMeshTree(root)
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    }
  }, [modelAsset, preset.id, preset.name])

  return <div className="exo-premium-hardware-3d" data-hardware-model={preset.id} data-model-status={status}>
    <img className={status === 'loaded' ? 'is-hidden' : ''} src={image} alt={`${preset.name} Blender rendered preview`} />
    <div className="exo-premium-hardware-3d-canvas" ref={hostRef} />
    {preset.kind==='zipper' && !modelAsset && status==='loaded' && <label style={{position:'absolute',bottom:30,left:12,right:12,color:'#fff',fontSize:10}}>OPEN / CLOSED<button type="button" aria-label="Toggle zipper roll preview" aria-pressed={rolled} onClick={()=>{const next=!rolled;setRolled(next);rollRef.current?.(next)}}>{rolled?'Straight strip':'Roll zipper'}</button><input aria-label="Zipper preview closure" type="range" min="0" max="1" step=".01" defaultValue=".68" onChange={e=>controlsRef.current?.(Number(e.target.value))}/></label>}
    <span>{status === 'loaded' ? '3D MODEL · DRAG TO ROTATE' : status === 'fallback' ? 'STUDIO RENDER' : 'LOADING 3D MODEL'}</span>
  </div>
}
