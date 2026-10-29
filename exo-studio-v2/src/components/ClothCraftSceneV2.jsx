import {vertexExtensions} from '../core/clothcraftStrainView.js'
import {createFabricFaceMaterials,createFabricEdgeRibbon} from '../core/clothcraftFabricSurface.js'
import {attachGarmentGraphics} from '../core/nativeGarmentGraphics.js'
import {createNativeImportedHardwareOverlay,nativeHardwareAnchor} from './ClothCraftImportedHardwareOverlay.jsx'
import React, {useEffect, useRef, useState} from 'react'
import ClothCraftCornerTools from './ClothCraftCornerTools.jsx'
import * as THREE from 'three'
import {createStageEnvironment, applyStageSettings} from '../core/createStageEnvironment.js'
import {OrbitControls} from 'three/addons/controls/OrbitControls.js'
import {TransformControls} from 'three/addons/controls/TransformControls.js'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js'
import {paintStudioGradient} from './studioGradientBackdrop.js'
import {applySceneCameraViewport} from '../core/sceneCameraViewport.js'
import {cursorForTool} from '../core/toolCursors.js'
import {preDrapeDisplayPositions} from '../core/nativePreDrapeCurvature.js'
import {buildNativeSeam3DSelection20261025,nativeSeamSelectionFromGuide20261025} from '../core/nativeSeam3DSelection20261025.js'
import {rankNativeSeam3DGuideScreen20261025,nativeSeamPerspectiveFraction20261025} from '../core/nativeSeam3DHitGeometry20261025.js'
import {createSceneMeshes} from './FoamPaddingNativeOverlay.jsx'
import {normalizeFoamMaterial, stepFoamCompressionState, foamPressFalloff} from '../core/foamCompressionModel.js'
import {avatarSurfaceConstructionCurves} from './avatarConstructionGuides.js'
import {WALK_PRESETS, WALK_SEQUENCES, walkKeys, walkDuration, walkPose, walkVertex} from '../core/avatarWalkPreview20261025.js'
import {Camera} from 'lucide-react'

const COLORS = ['#638da2', '#d49b70', '#8caf87', '#b69bc7', '#ceb96d', '#82b7b1']
const SEAM_COLORS = ['#eb775e', '#55aecd', '#dbb44c', '#8dc575', '#a98cd9', '#dd91b9']
const WALK_AVATAR_SOURCES = [
  {id:'native',label:'Current fitted avatar · MakeHuman / CLO'},
  {id:'theo',label:'Theo · rigged visual avatar',url:'/avatars/opensew/theo.glb'},
  {id:'nora',label:'Nora · rigged visual avatar',url:'/avatars/opensew/nora.glb'},
  {id:'thomas-preview',label:'CLO Thomas · visual preview',url:'/avatars/preview/clo-thomas.glb'},
]
const setMarkerDiagnostics = (canvas, counts, visible) => {
  if (!canvas) return
  const total = counts.reduce((sum, count) => sum + count, 0)
  canvas.dataset.seamMarkerCount = String(total)
  canvas.dataset.seamMarkerVisibleCount = String(visible ? total : 0)
  canvas.dataset.seamMarkerColors = JSON.stringify(SEAM_COLORS.filter((_, index) => counts[index] > 0))
  canvas.dataset.seamMarkerPalette = JSON.stringify(SEAM_COLORS)
}
const degrees = values => values.map(value => THREE.MathUtils.degToRad(Number(value) || 0))
const finiteVec = values => Array.isArray(values) && values.length >= 3 && values.slice(0, 3).every(Number.isFinite)
const v3 = values => new THREE.Vector3(...values)
const disposeTree = object => {
  object.traverse(child => {
    child.geometry?.dispose()
    const materials = child.material ? (Array.isArray(child.material) ? child.material : [child.material]) : []
    for (const material of materials) {material.userData?.ownedTexture?.dispose(); material.dispose()}
  })
}
const replaceChildren = group => {
  for (const child of [...group.children]) {
    group.remove(child)
    disposeTree(child)
  }
}
const material = (color, options = {}) => new THREE.MeshStandardMaterial({
  color, side: THREE.DoubleSide, roughness: .82, metalness: .025, ...options,
})
// Stage GLBs share runway materials with the walls. Clone only runway meshes
// while a custom floor is active so a floor change does not recolor the set.
const applyStageFloorTint = (group, color, custom) => {
  group?.userData.stageRoom?.traverse(node => {
    if (!node.isMesh || !/(?:runway|floor|ground)/i.test(node.name)) return
    let saved = node.userData.exoStudioFloorMaterials
    if (!custom) {
      if (saved) {
        node.material = saved.original
        saved.clones.forEach(value => value.dispose())
        delete node.userData.exoStudioFloorMaterials
      }
      return
    }
    if (!saved) {
      const originals = Array.isArray(node.material) ? node.material : [node.material]
      const clones = originals.map(value => value.clone())
      saved = {original:node.material,clones}
      node.userData.exoStudioFloorMaterials=saved
      node.material=Array.isArray(node.material)?clones:clones[0]
    }
    for (const value of saved.clones) {
      value.color?.set(color)
      // A solid set-design floor swatch must not be multiplied by a dark
      // imported texture. Other runway properties stay on the private clone.
      if (value.map) {value.map=null;value.needsUpdate=true}
    }
  })
}
const buildIndexedMesh = (positions, triangles, color, uv = null) => {
  // Native snapshots may contain uninitialized or collapsed solver triangles.
  // They cannot contribute visible cloth and poison normal calculations.
  const validTriangles = (Array.isArray(triangles) ? triangles : []).filter(tri => {
    if (!Array.isArray(tri) || tri.length !== 3 || !tri.every(i => Number.isInteger(i) && finiteVec(positions?.[i]))) return false
    if (new Set(tri).size !== 3) return false
    const a = v3(positions[tri[0]]), b = v3(positions[tri[1]]), c = v3(positions[tri[2]])
    return b.sub(a).cross(c.sub(a)).lengthSq() > 1e-18
  })
  const indices = [...new Set(validTriangles.flat())]
  const remap = new Map(indices.map((value, index) => [value, index]))
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(indices.flatMap(index => positions[index]), 3))
  if (uv) geometry.setAttribute('uv', new THREE.Float32BufferAttribute(indices.flatMap(index =>
    Array.isArray(uv[index]) && uv[index].length >= 2 && uv[index].slice(0, 2).every(Number.isFinite)
      ? uv[index].slice(0, 2) : [0, 0]), 2))
  geometry.userData.nativeVertices=indices
  geometry.setIndex(validTriangles.flatMap(tri => tri.map(index => remap.get(index))))
  if (validTriangles.length) geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return new THREE.Mesh(geometry, material(color))
}
const line = (a, b, color, opacity = 1) => {
  const geometry = new THREE.BufferGeometry().setFromPoints([a, b])
  return new THREE.Line(geometry, new THREE.LineBasicMaterial({color, transparent: opacity < 1, opacity, depthTest: true}))
}
// Project an authored material-space construction point back onto the current
// Rust cloth triangles. The template's internal lines are not world-space
// sketches: this keeps saved marks attached to the moving cloth geometry.
const worldPointAtMaterialUv=(triangles,uv,positions,point,offset)=>{
  for(const [ia,ib,ic] of triangles){
    const a=uv?.[ia],b=uv?.[ib],c=uv?.[ic]
    if(![a,b,c].every(v=>Array.isArray(v)&&v.length>=2&&v.slice(0,2).every(Number.isFinite)))continue
    const den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
    if(Math.abs(den)<1e-12)continue
    const wa=((b[1]-c[1])*(point[0]-c[0])+(c[0]-b[0])*(point[1]-c[1]))/den
    const wb=((c[1]-a[1])*(point[0]-c[0])+(a[0]-c[0])*(point[1]-c[1]))/den
    const wc=1-wa-wb
    if(Math.min(wa,wb,wc)<-1e-5||Math.max(wa,wb,wc)>1.00001)continue
    if(![ia,ib,ic].every(i=>finiteVec(positions?.[i])))continue
    return v3(positions[ia]).multiplyScalar(wa)
      .addScaledVector(v3(positions[ib]),wb)
      .addScaledVector(v3(positions[ic]),wc)
      .add(offset)
  }
  return null
}

/**
 * ClothCraft Rust snapshot visualizer. Positions and triangle indices are Rust-world coordinates (metres).
 * onPlace({kind:'Place', panel, placement:{translation:[x,y,z],rotation_degrees:[x,y,z]}})
 * onStretchDrag is optional and receives {panel,delta:[x,y,z],point:[x,y,z],origin:[x,y,z]}.
 * A Place edit requests a solver reinitialization through the host; this view cannot guarantee
 * that moved simulated vertices remain at their visualized positions after the new snapshot.
 */
export default function ClothCraftSceneV2({
  snapshot, active, selected, mode = 'edit', seamEditing=false, onPick, onHover, onPlace,
  graphics = [], importedHardware = [], foamPads = [],
  onChangeMode = () => {}, toolsDisabled = false, onCollapse3D, onToggle3DStudio, studio3DActive = false,
  onToggle3DStudioFullscreen, studio3DFullscreenActive = false, animationWorkspaceActive = false,
  showAvatar = true, showSeams = true, sewingToolsActive = mode==='sew'||seamEditing, wireframe = false, analysisMode = 'surface',
  showBoundingBox = false, showContactDots = true, spread = 0,
  onStretchDrag, onStretchStart, onStretchCancel, environmentPreset = 'studio', stageId = 'none', showFloor = true,
  cameraSettings = null, sceneLight = null, sceneLight2 = null, exposure = 1.1, studioAppearance = null, studioPreferences = null, stageSettings = null,
  onContextMenuRequest, onCanvasActivate, onFoamSelect,
}) {
  const host = useRef(null)
  const sceneRef = useRef(null)
  const hardwareRecordsRef = useRef(new Map())
  const hardwareSnapshotRef = useRef(snapshot)
  hardwareSnapshotRef.current = snapshot
  const [grabRefresh, setGrabRefresh] = useState(0)
  const [showConstructionGuides, setShowConstructionGuides] = useState(false)
  const [walkAvatarSource, setWalkAvatarSource] = useState('native')
  const [walkAvatarError, setWalkAvatarError] = useState('')
  const [photoStatus, setPhotoStatus] = useState('')
  const [walkPresetId, setWalkPresetId] = useState('runway')
  const [walkSequenceId, setWalkSequenceId] = useState('straight')
  const [walkSequenceEdits, setWalkSequenceEdits] = useState(()=>{
    // Reusable motion edits belong to the local animation library, not a
    // garment's Rust sewing history or fitted collision body.
    try{
      const stored=JSON.parse(window.localStorage.getItem('exo-3d-walk-motion-keys-v1')||'{}')
      if(!stored||typeof stored!=='object'||Array.isArray(stored))return {}
      const valid={}
      for(const sequence of WALK_SEQUENCES){
        const keys=stored[sequence.id]
        if(!Array.isArray(keys)||keys.length<2||keys.length>64||
          !keys.every(key=>typeof key?.id==='string'&&key.id.length<64&&
            Number.isFinite(key.t)&&Number.isFinite(key.z)&&Number.isFinite(key.yaw)))continue
        valid[sequence.id]=walkKeys({sequence:sequence.id,keyframes:keys})
      }
      return valid
    }catch{return {}}
  })
  const [walkSelectedKeyId, setWalkSelectedKeyId] = useState('start')
  const [walkFps, setWalkFps] = useState(30)
  const [walkTimelineHeight, setWalkTimelineHeight] = useState(204)
  const [walkOptionsOpen, setWalkOptionsOpen] = useState(false)
  const [walkKeyEditorOpen, setWalkKeyEditorOpen] = useState(false)
  const walkTimelineResizeRef=useRef(null)
  const clampTimelineHeight=height=>Math.max(165,Math.min(Math.min(520,window.innerHeight-180),height))
  const startTimelineResize=event=>{
    if(event.button!==0)return
    event.preventDefault()
    walkTimelineResizeRef.current={y:event.clientY,height:walkTimelineHeight}
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const moveTimelineResize=event=>{
    if(!walkTimelineResizeRef.current)return
    const {y,height}=walkTimelineResizeRef.current
    setWalkTimelineHeight(clampTimelineHeight(height+y-event.clientY))
  }
  const stopTimelineResize=()=>{walkTimelineResizeRef.current=null}
  const [walkPlaying, setWalkPlaying] = useState(false)
  const [walkSpeed, setWalkSpeed] = useState(1)
  const [walkDistance, setWalkDistance] = useState(2.4)
  const [walkDirection, setWalkDirection] = useState('forward')
  const [walkLoop, setWalkLoop] = useState(true)
  const [walkProgress, setWalkProgress] = useState(0)
  const walkProgressRef = useRef(0)
  const walkKeyDragRef = useRef(null)
  const walkPreviewRef = useRef({})
  const currentWalkKeys=walkKeys({sequence:walkSequenceId,keyframes:walkSequenceEdits[walkSequenceId]})
  const selectedWalkKey=currentWalkKeys.find(key=>key.id===walkSelectedKeyId)||currentWalkKeys[0]
  const walkFrames=Math.max(2,Math.ceil(walkDuration({
    preset:walkPresetId,sequence:walkSequenceId,keyframes:currentWalkKeys,
    distance:walkDistance,speed:walkSpeed,
  })*walkFps))
  walkPreviewRef.current = {preset:walkPresetId,playing:walkPlaying,speed:walkSpeed,
    distance:walkDistance,direction:walkDirection,loop:walkLoop,
    sequence:walkSequenceId,keyframes:currentWalkKeys}
  const updateWalkKey=(id,field,value)=>{
    setWalkSequenceEdits(old=>{
      const keys=walkKeys({sequence:walkSequenceId,keyframes:old[walkSequenceId]})
      const index=keys.findIndex(key=>key.id===id)
      if(index<0)return old
      const prior=keys[index],last=keys.length-1
      const bounds=field==='t'
        ? [index===0?0:keys[index-1].t+.005,index===last?1:keys[index+1].t-.005]
        :field==='z'?[-2,2]:[-720,720]
      const next=keys.map(key=>key.id===id
        ? {...key,[field]:field==='t'&&index===0?0:field==='t'&&index===last?1
          :Math.min(bounds[1],Math.max(bounds[0],Number(value)||0))}
        :key)
      if(next.every((key,i)=>JSON.stringify(key)===JSON.stringify(keys[i])))return old
      return {...old,[walkSequenceId]:next}
    })
  }
  const selectWalkSequence=id=>{
    setWalkSequenceId(id)
    setWalkSelectedKeyId('start')
    setWalkPlaying(false)
    setWalkLoop(id==='straight'||id==='catwalk')
    walkProgressRef.current=0
    setWalkProgress(0)
  }
  const seekWalkFrame=frame=>{setWalkPlaying(false);seekWalk(frame/walkFrames)}
  const selectWalkKey=key=>{
    setWalkSelectedKeyId(key.id)
    seekWalkFrame(Math.round(key.t*walkFrames))
  }
  const beginWalkDrag=(event,key)=>{
    if(event.button!==0||key.id===currentWalkKeys[0].id||
      key.id===currentWalkKeys[currentWalkKeys.length-1].id)return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    walkKeyDragRef.current={id:key.id,x:event.clientX,t:key.t,
      width:event.currentTarget.parentElement.getBoundingClientRect().width}
    setWalkSelectedKeyId(key.id)
    setWalkPlaying(false)
  }
  const moveWalkDrag=event=>{
    const drag=walkKeyDragRef.current
    if(!drag)return
    const next=drag.t+(event.clientX-drag.x)/Math.max(20,drag.width)
    updateWalkKey(drag.id,'t',next)
    walkProgressRef.current=next
    setWalkProgress(next)
  }
  const stopWalkDrag=()=>{walkKeyDragRef.current=null}
  useEffect(()=>{
    try{window.localStorage.setItem('exo-3d-walk-motion-keys-v1',JSON.stringify(walkSequenceEdits))}
    catch{/* Private mode or disabled storage never breaks animation playback. */}
  },[walkSequenceEdits])
  const insertWalkKey=()=>{
    const t=Math.max(.005,Math.min(.995,walkProgressRef.current))
    const pose=walkPose(t,walkPreviewRef.current)
    const id='user-'+Date.now()
    const key={id,name:'Custom key',t,z:pose.translationZ/Math.max(.01,walkDistance)*
      (walkDirection==='backward'?-1:1),
      yaw:pose.yaw*180/Math.PI-(walkDirection==='backward'?180:0)}
    setWalkSequenceEdits(old=>({...old,[walkSequenceId]:
      [...walkKeys({sequence:walkSequenceId,keyframes:old[walkSequenceId]}),key].sort((a,b)=>a.t-b.t)}))
    setWalkSelectedKeyId(id)
  }
  const removeWalkKey=()=>{
    if(selectedWalkKey?.id===currentWalkKeys[0].id||
      selectedWalkKey?.id===currentWalkKeys[currentWalkKeys.length-1].id)return
    setWalkSequenceEdits(old=>({...old,[walkSequenceId]:
      currentWalkKeys.filter(key=>key.id!==selectedWalkKey.id)}))
    setWalkSelectedKeyId('start')
  }
  const seekWalk = value => {
    const next = Math.max(0,Math.min(1,Number(value)||0))
    walkProgressRef.current = next
    setWalkProgress(next)
  }
  const resetWalk = () => {setWalkPlaying(false);seekWalk(0)}
  useEffect(()=>{
    const toggle=()=>{if(walkProgressRef.current>=1)seekWalk(0);setWalkPlaying(value=>!value)}
    const stop=()=>resetWalk()
    window.addEventListener('exo-clothcraft-animation-toggle',toggle)
    window.addEventListener('exo-clothcraft-animation-reset',stop)
    window.addEventListener('exo-clothcraft-animation-stop',stop)
    return ()=>{
      window.removeEventListener('exo-clothcraft-animation-toggle',toggle)
      window.removeEventListener('exo-clothcraft-animation-reset',stop)
      window.removeEventListener('exo-clothcraft-animation-stop',stop)
    }
  },[])
  useEffect(()=>{
    if(!animationWorkspaceActive)resetWalk()
  },[animationWorkspaceActive])
  useEffect(()=>{
    window.dispatchEvent(new CustomEvent('exo-clothcraft-animation-playback',{detail:{playing:walkPlaying}}))
  },[walkPlaying])
  const propsRef = useRef({})
  propsRef.current = {snapshot, active, selected, mode, seamEditing, onPick, onHover, onPlace, showAvatar,
    showSeams, sewingToolsActive, wireframe, showBoundingBox, showContactDots, spread, onStretchDrag, onStretchStart, onStretchCancel, environmentPreset, stageId, showFloor,
    onContextMenuRequest, onCanvasActivate, onFoamSelect}

  useEffect(() => {
    const hostNode = host.current
    if (!hostNode) return
    const scene = new THREE.Scene()
    // The original EXO GarmentViewport daylight backdrop and fog are part of
    // the studio, independent of the Rust geometry displayed in this scene.
    const backdropCanvas = document.createElement('canvas')
    backdropCanvas.width = 8
    backdropCanvas.height = 512
    const studioBackdrop = new THREE.CanvasTexture(backdropCanvas)
    studioBackdrop.colorSpace = THREE.SRGBColorSpace
    paintStudioGradient(studioBackdrop)
    scene.background = studioBackdrop
    scene.fog = new THREE.Fog(0xe9e9eb, 6, 16)
    const camera = new THREE.PerspectiveCamera(34, 1, .005, 150)
    camera.position.set(2.4, 1.65, 3.1)
    const renderer = new THREE.WebGLRenderer({antialias: studioPreferences?.antialias!==false, alpha: false})
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1
    const renderSurface=hostNode.querySelector('.cc-scene-render-surface')||hostNode
    renderSurface.appendChild(renderer.domElement)
    const pmremGenerator = new THREE.PMREMGenerator(renderer)
    const roomEnvironment = new RoomEnvironment()
    const studioEnvironment = pmremGenerator.fromScene(roomEnvironment, .04).texture
    roomEnvironment.dispose()
    scene.environment = studioEnvironment

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, 0.95, 0)
    controls.enableDamping = true
    controls.dampingFactor = .07
    controls.zoomToCursor = true
    controls.minDistance = .15
    controls.maxDistance = 15
    const ambient = new THREE.HemisphereLight(0xffffff, 0xb7b7bc, 1.85)
    scene.add(ambient)
    const key = new THREE.DirectionalLight(0xfffcf8, 2.6)
    key.position.set(2.5, 4.5, 3.1)
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0xe2ecff, .85)
    fill.position.set(-3, 2, -2.5)
    scene.add(fill)

    const floor = new THREE.Mesh(new THREE.CircleGeometry(3.2, 96), material('#ebebed', {roughness:.94,metalness:0}))
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -.005
    floor.receiveShadow = true
    scene.add(floor)
    const grid = new THREE.GridHelper(5.5, 22, 0xaeb0b4, 0xdddddf)
    grid.position.y = .002
    scene.add(grid)
    const axes = new THREE.Group()
    axes.add(line(new THREE.Vector3(0,.013,-2.75),new THREE.Vector3(0,.013,2.75),'#8b8c91',.52))
    grid.add(axes)
    // Subtle studio centerline from floor to above the mannequin. The regular
    // 6-metre metric floor grid and orientation axes remain intact.
    const centerGuide = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 2.12, 0)]),
      new THREE.LineDashedMaterial({color:'#729bb0',dashSize:.08,gapSize:.045,transparent:true,opacity:.46,depthTest:true}),
    )
    centerGuide.computeLineDistances()
    grid.add(centerGuide)
    const cloth = new THREE.Group()
    const avatar = new THREE.Group()
    const boundaries = new THREE.Group()
    const seams = new THREE.Group()
    const dots = new THREE.Group()
    const boxes = new THREE.Group()
    const brushMarks = new THREE.Group()
    const tapeMarks = new THREE.Group()
    const internalLineMarks = new THREE.Group()
    const authoredLines = new THREE.Group()
    const foamPaddingGroup = new THREE.Group()
    foamPaddingGroup.name = 'exo-native-foam-padding-preview'
    scene.add(cloth, avatar, boundaries, seams, dots, boxes, brushMarks, tapeMarks, internalLineMarks, authoredLines, foamPaddingGroup)

    const pivot = new THREE.Object3D()
    scene.add(pivot)
    const transform = new TransformControls(camera, renderer.domElement)
    scene.add(transform.getHelper())
    transform.setSize(.65)
    transform.setSpace('world')
    transform.setMode('translate')
    const rings = new THREE.Group()
    scene.add(rings)
    const pickRings = []
    for (const [axis,color] of Object.entries({x:0xef6967,y:0x76d38f,z:0x76aaff,free:0xe9f4ff})) {
      const visual = new THREE.Mesh(new THREE.TorusGeometry(1,.014,8,120),
        new THREE.MeshBasicMaterial({color,transparent:true,opacity:axis==='free'?.63:.97,depthTest:false,depthWrite:false}))
      const picker = new THREE.Mesh(new THREE.TorusGeometry(1,.065,8,120),
        new THREE.MeshBasicMaterial({color,transparent:true,opacity:0,depthTest:false,depthWrite:false,side:THREE.DoubleSide}))
      picker.userData.rotationAxis=axis
      if(axis==='x'){visual.rotation.y=Math.PI/2;picker.rotation.y=Math.PI/2}
      if(axis==='y'){visual.rotation.x=-Math.PI/2;picker.rotation.x=-Math.PI/2}
      if(axis==='free'){visual.scale.setScalar(1.24);picker.scale.setScalar(1.24)}
      visual.renderOrder=95;picker.renderOrder=96
      rings.add(visual,picker);pickRings.push(picker)
    }
    rings.visible=false
    const ray = new THREE.Raycaster()
    ray.params.Line.threshold = .012
    const pointer = new THREE.Vector2()
    const state = {scene, camera, renderer, controls, cloth, avatar, boundaries, seams, dots, boxes,
      floor, grid, ambient, key, fill, studioBackdrop, brushMarks, tapeMarks,
      pivot, transform, ray, pointer, panelMeshes: new Map(), panelOffsets: new Map(),
      down: null, dragging: false, nativeStart: null, handleStart: null, requestId: null,
      sceneSnapshot: null, rings, ringDrag:null, ringEnabled:false, stretchGrab:null,
      stretchCommitPending:false, pendingGrabSnapshot:false, meshBrushActive:false,
      authoredLines, internalLineMarks, brushVertices:new Set(), brushDrag:null, tapeMode:null, tapePoints:[], tapeDrag:null,
      internalLineActive:false,internalLinePoints:[],foamPaddingGroup,
      foamPress:null,foamCompression:new Map(),foamMeshes:new Map()}
    state.walkGeometries = new Map()
    state.walkBodyBounds = {minY:0,height:1.75}
    state.walkAvatarRoot=null
    state.walkAvatarBones=[]
    state.walkAvatarSource='native'
    state.walkLastFrame = 0
    state.walkApplied = false
    const applyWalkPreview = progress => {
      const cfg = walkPreviewRef.current
      const canvas = renderer.domElement
      // The Rust solver's original positions are never overwritten: each
      // independent Three geometry has a private rest-pose byte-for-byte copy.
      // Native 2D patterns, sewing history and collisions stay unchanged.
      if (!state.walkGeometries.size) {
        const modelRoot=state.walkAvatarRoot||avatar
        const box=new THREE.Box3().setFromObject(modelRoot)
        if (!box.isEmpty() && Number.isFinite(box.min.y) && Number.isFinite(box.max.y)) {
          state.walkBodyBounds={minY:box.min.y,height:Math.max(.5,box.max.y-box.min.y)}
        }
        for(const root of [modelRoot,cloth]){
          root.traverse(node=>{
            const geometry=node.isMesh?node.geometry:null
            const positions=geometry?.getAttribute('position')
            // A skinned GLB is animated at its named bones, not by deforming
            // bind-space vertices a second time on the CPU.
            if(node.isSkinnedMesh || !positions || positions.itemSize!==3 || state.walkGeometries.has(geometry))return
            state.walkGeometries.set(geometry,{positions,rest:positions.array.slice()})
          })
        }
      }
      const pose=walkPose(progress,cfg)
      const active=progress>0
      if(!active && !state.walkApplied){
        canvas.dataset.walkPreview='idle'
        return
      }
      for(const {positions,rest} of state.walkGeometries.values()){
        const values=positions.array
        if(active){
          for(let i=0;i<rest.length;i+=3){
            const [x,y,z]=walkVertex(rest[i],rest[i+1]-state.walkBodyBounds.minY,rest[i+2],
              pose.phase,state.walkBodyBounds.height,cfg.preset,pose.gaitWeight)
            values[i]=x
            values[i+1]=y+state.walkBodyBounds.minY
            values[i+2]=z
          }
        } else values.set(rest)
        positions.needsUpdate=true
      }
      for(const joint of state.walkAvatarBones){
        const side=joint.name.startsWith('left')?1:-1
        const oscillation=Math.sin(pose.phase+(side<0?Math.PI:0))
        let amount=0
        if(joint.name.includes('upleg')||joint.name.includes('thigh')) amount=oscillation*.42
        else if(joint.name.includes('leg')&&!joint.name.includes('upleg')) amount=Math.max(0,-oscillation)*.33
        else if(joint.name.includes('arm')) amount=-oscillation*.27
        joint.bone.rotation.x=joint.restX+(active?amount*pose.gaitWeight:0)
        if(joint.name==='leftarm'||joint.name==='rightarm'){
          const drop=joint.name==='leftarm'?-1:1
          joint.bone.rotation.z=joint.restZ+drop*.95
        }
      }
      for(const group of [state.walkAvatarRoot||avatar,cloth]){
        group.position.z=active?pose.translationZ:0
        group.rotation.y=active?pose.yaw:0
        group.updateMatrixWorld(true)
      }
      state.walkApplied=active
      canvas.dataset.walkPreview=active?'visual-only':'idle'
      canvas.dataset.walkPositionZ=String((state.walkAvatarRoot||avatar).position.z.toFixed(4))
      canvas.dataset.walkPhase=String(pose.phase.toFixed(4))
      canvas.dataset.walkYawDegrees=String((pose.yaw*180/Math.PI).toFixed(2))
      canvas.dataset.walkSequence=cfg.sequence
      canvas.dataset.walkSegment=String(pose.segment)
      canvas.dataset.walkAvatarSource=state.walkAvatarSource
      canvas.dataset.walkRigBones=String(state.walkAvatarBones.length)
      canvas.dataset.walkRigMotion=state.walkAvatarBones.reduce((sum,joint)=>
        sum+Math.abs(joint.bone.rotation.x-joint.restX),0).toFixed(4)
    }
    state.applyWalkPreview=applyWalkPreview
    sceneRef.current = state
    // Cursor follows the actual active viewport operation. Native pointer
    // handlers occasionally change the cursor while dragging; restore the
    // selected tool artwork as soon as that transient interaction ends.
    const updateToolCursor=()=>{
      const currentMode=propsRef.current.mode
      const tool=state.internalLineActive?'line-3d':state.tapeMode
        ||(currentMode==='edit'&&propsRef.current.seamEditing?'seam-edit':null)
        ||(currentMode==='sew'?'sew':null)
        ||(state.meshBrushActive?'mesh-brush'
          :currentMode==='rotate3d'?'rotate'
          :currentMode==='move3d'||currentMode==='transform'?'move'
          :currentMode==='stretch3d'?'hand':null)
      const cursor=state.stretchGrab||state.brushDrag!==null?'grabbing'
        :(['move3d','rotate3d','transform'].includes(currentMode)&&state.rotationHoverAxis)?cursorForTool('rotate')
        :tool==='hand'?'grab':cursorForTool(tool)||'default'
      renderer.domElement.style.cursor=cursor
      renderer.domElement.dataset.activeToolCursor=tool||'default'
    }
    state.updateToolCursor=updateToolCursor
    updateToolCursor()
    const updateInternalLine=()=>{
      replaceChildren(internalLineMarks)
      const points=state.internalLinePoints
      for(const hit of points){
        const marker=new THREE.Mesh(new THREE.SphereGeometry(.009,12,8),new THREE.MeshBasicMaterial({color:'#56dbff',depthTest:false,depthWrite:false}))
        marker.position.copy(hit.point);marker.renderOrder=111;internalLineMarks.add(marker)
      }
      if(points.length===2){
        const segment=line(points[0].point,points[1].point,'#56dbff')
        segment.material.depthTest=false;segment.material.depthWrite=false;segment.renderOrder=110
        internalLineMarks.add(segment)
      }
      renderer.domElement.dataset.internalLine3dMode=state.internalLineActive?'on':'off'
      renderer.domElement.dataset.internalLine3dPoints=String(points.length)
      renderer.domElement.dataset.internalLine3dPanel=points[0]?.panel||''
    }
    state.clearInternalLine=()=>{state.internalLinePoints=[];updateInternalLine()}
    const activateInternalLine=event=>{
      const next=event.detail?.tool==='line-3d'
      if(next!==state.internalLineActive)state.internalLinePoints=[]
      state.internalLineActive=next
      updateToolCursor()
      updateInternalLine()
    }
    window.addEventListener('exo-clothcraft-3d-tool',activateInternalLine)
    const internalLineHit=event=>{
      const rect=renderer.domElement.getBoundingClientRect()
      if(!rect.width||!rect.height)return null
      pointer.set(2*(event.clientX-rect.left)/rect.width-1,1-2*(event.clientY-rect.top)/rect.height)
      ray.setFromCamera(pointer,camera)
      const surface=ray.intersectObjects(cloth.children,false)[0]
      if(!surface?.uv||!surface.face||!surface.object.userData.panel)return null
      const body=avatar.visible?ray.intersectObjects(avatar.children,false)[0]:null
      if(body&&body.distance<surface.distance-1e-5)return null
      // buildIndexedMesh uses snapshot.uv verbatim, in Rust panel material metres.
      // Three interpolates the triangle UV at the precise ray intersection.
      const vertices=surface.object.geometry.userData.nativeVertices
      const indices=[surface.face.a,surface.face.b,surface.face.c].map(i=>vertices?.[i])
      const source=state.sceneSnapshot?.uv
      if(indices.some(i=>!Array.isArray(source?.[i])||source[i].length<2||!source[i].slice(0,2).every(Number.isFinite)))return null
      const uv=surface.uv.toArray()
      if(!uv.every(Number.isFinite))return null
      return {point:surface.point.clone(),panel:surface.object.userData.panel,uv}
    }
    updateInternalLine()
    const tapeHit=event=>{
      const rect=renderer.domElement.getBoundingClientRect()
      if(!rect.width||!rect.height)return null
      pointer.set(((event.clientX-rect.left)/rect.width)*2-1,-((event.clientY-rect.top)/rect.height)*2+1)
      ray.setFromCamera(pointer,camera)
      const clothHit=ray.intersectObjects(cloth.children,false)[0]
      const avatarHit=avatar.visible?ray.intersectObjects(avatar.children,false)[0]:null
      if(state.tapeMode?.startsWith('avatar-measure')){
        if(!avatarHit||(clothHit&&clothHit.distance<avatarHit.distance-1e-5))return null
        return {point:avatarHit.point.clone(),panel:'avatar'}
      }
      if(!clothHit||(avatarHit&&avatarHit.distance<clothHit.distance-1e-5))return null
      return {point:clothHit.point.clone(),panel:clothHit.object.userData.panel}
    }
    const updateTape=()=>{
      replaceChildren(tapeMarks)
      const points=state.tapePoints
      if(points.length){
        const pointGeometry=new THREE.SphereGeometry(.009,12,8)
        for(const hit of points){
          const marker=new THREE.Mesh(pointGeometry.clone(),new THREE.MeshBasicMaterial({color:'#ffbd39',depthTest:false}))
          marker.position.copy(hit.point);marker.renderOrder=110;tapeMarks.add(marker)
        }
        pointGeometry.dispose()
      }
      if(points.length===2){
        const geometry=new THREE.BufferGeometry().setFromPoints(points.map(hit=>hit.point))
        const segment=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:'#ffbd39',depthTest:false,depthWrite:false}))
        segment.renderOrder=109;tapeMarks.add(segment)
      }
      const mm=points.length===2?points[0].point.distanceTo(points[1].point)*1000:null
      const isAvatar=state.tapeMode?.startsWith('avatar-measure')
      renderer.domElement.dataset.garmentMeasurePoints=String(isAvatar?0:points.length)
      renderer.domElement.dataset.garmentMeasureMm=!isAvatar&&mm!==null?mm.toFixed(2):''
      renderer.domElement.dataset.garmentMeasurePanels=JSON.stringify(isAvatar?[]:points.map(hit=>hit.panel))
      renderer.domElement.dataset.avatarMeasurePoints=String(isAvatar?points.length:0)
      renderer.domElement.dataset.avatarMeasureMm=isAvatar&&mm!==null?mm.toFixed(2):''
    }
    state.updateTape=updateTape
    const activateTape=event=>{
      const tool=event.detail?.tool
      const next=['garment-measure','garment-measure-edit','avatar-measure','avatar-measure-edit'].includes(tool)?tool:null
      if(next!==state.tapeMode){
        if(state.tapeDrag!==null&&renderer.domElement.hasPointerCapture(state.tapeDrag))
          renderer.domElement.releasePointerCapture(state.tapeDrag)
        state.tapePoints=[];state.tapeDrag=null;controls.enabled=true
      }
      state.tapeMode=next
      renderer.domElement.dataset.garmentMeasureMode=next?.startsWith('garment-')?next:'off'
      renderer.domElement.dataset.avatarMeasureMode=next?.startsWith('avatar-')?next:'off'
      updateToolCursor()
      updateTape()
    }
    window.addEventListener('exo-clothcraft-3d-tool',activateTape)
    updateTape()
    const updateBrushMarks = () => {
      replaceChildren(brushMarks)
      const points=[]
      for (const mesh of state.panelMeshes.values()) {
        const indices=mesh.geometry.userData.nativeVertices || []
        const position=mesh.geometry.getAttribute('position')
        mesh.updateWorldMatrix(true,false)
        for(let i=0;i<indices.length;i++)if(state.brushVertices.has(indices[i]))
          points.push(...new THREE.Vector3().fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld).toArray())
      }
      if(points.length){
        const geometry=new THREE.BufferGeometry()
        geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3))
        brushMarks.add(new THREE.Points(geometry,new THREE.PointsMaterial({color:'#ffcb41',size:9,sizeAttenuation:false,depthTest:false,depthWrite:false})))
      }
      renderer.domElement.dataset.meshBrushSelectedCount=String(state.brushVertices.size)
      renderer.domElement.dataset.meshBrushHighlightedCount=String(points.length/3)
      renderer.domElement.dataset.meshBrushSelectedIndices=JSON.stringify([...state.brushVertices].sort((a,b)=>a-b))
    }
    state.updateBrushMarks=updateBrushMarks
    const applyBrush = event => {
      const rect=renderer.domElement.getBoundingClientRect()
      pointer.set(((event.clientX-rect.left)/rect.width)*2-1,-((event.clientY-rect.top)/rect.height)*2+1)
      ray.setFromCamera(pointer,camera)
      const contact=ray.intersectObjects(cloth.children,false)[0]
      if(!contact)return
      const point=contact.point
      const paintedMesh=contact.object
      // A brush stroke belongs to the visible, ray-hit panel. Nearby panels
      // may overlap in 3D but must never receive this stroke by proximity.
      const avatarHit=ray.intersectObjects(avatar.children,false)[0]
      if(avatar.visible && avatarHit && avatarHit.distance < contact.distance-1e-5)return
      // Fixed pixel brush size translates into metres at the hit depth, so zoom
      // changes its world-space radius rather than making it unusably tiny.
      const distance=camera.position.distanceTo(point)
      const radius=2*distance*Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)*22/Math.max(1,rect.height)
      const removing=event.altKey
      for(const mesh of [paintedMesh]){
        const attr=mesh.geometry.getAttribute('position')
        const native=mesh.geometry.userData.nativeVertices||[]
        mesh.updateWorldMatrix(true,false)
        for(let i=0;i<native.length;i++){
          const position=new THREE.Vector3().fromBufferAttribute(attr,i).applyMatrix4(mesh.matrixWorld)
          if(position.distanceTo(point)<=radius){
            if(removing)state.brushVertices.delete(native[i])
            else state.brushVertices.add(native[i])
          }
        }
      }
      renderer.domElement.dataset.meshBrushRadiusMetres=String(radius)
      renderer.domElement.dataset.meshBrushHitPanel=String(contact.object.userData.panel)
      updateBrushMarks()
    }
    const setBrushActive=(active,clear=false)=>{
      state.meshBrushActive=Boolean(active)
      renderer.domElement.dataset.meshBrushActive=String(state.meshBrushActive)
      updateToolCursor()
      if(!state.meshBrushActive){
        if(state.brushDrag!==null&&renderer.domElement.hasPointerCapture(state.brushDrag))
          renderer.domElement.releasePointerCapture(state.brushDrag)
        state.brushDrag=null
        controls.enabled=true
      }
      if(clear){state.brushVertices.clear();updateBrushMarks()}
    }
    state.setBrushActive=setBrushActive
    const activateBrush=event=>{
      const active=event.type==='exo-clothcraft-3d-tool'
        ?event.detail?.tool==='mesh-brush':Boolean(event.detail?.active)
      setBrushActive(active,Boolean(event.detail?.clear)||!active)
    }
    const clearBrush=event=>{
      if(event.key==='Escape'&&state.internalLineActive)state.clearInternalLine()
      if(event.key==='Escape'&&state.tapeMode){
        state.tapePoints=[];state.tapeDrag=null;controls.enabled=true;updateTape()
      }
      if(event.key==='Escape'&&state.meshBrushActive){
        state.brushVertices.clear();updateBrushMarks()
        if(state.brushDrag!==null&&renderer.domElement.hasPointerCapture(state.brushDrag))
          renderer.domElement.releasePointerCapture(state.brushDrag)
        state.brushDrag=null;controls.enabled=true
      }
    }
    window.addEventListener('exo-clothcraft-mesh-brush',activateBrush)
    window.addEventListener('exo-clothcraft-3d-tool',activateBrush)
    window.addEventListener('keydown',clearBrush,true)
    renderer.domElement.dataset.meshBrushActive='false'
    updateBrushMarks()
    const transformMode = () => ['move3d','rotate3d','transform'].includes(propsRef.current.mode)
    const hideGizmo = () => {
      state.ringEnabled = false
      rings.visible = false
      transform.detach()
      transform.visible = false
      transform.enabled = false
      delete renderer.domElement.dataset.gizmoCenterX
      delete renderer.domElement.dataset.gizmoCenterY
      delete renderer.domElement.dataset.gizmoRingRadius
      renderer.domElement.dataset.gizmoVisible = 'false'
    }
    hideGizmo()
    const updateRings = () => {
      rings.visible=state.ringEnabled
      if(!rings.visible)return
      rings.position.copy(pivot.position)
      rings.quaternion.copy(pivot.quaternion)
      rings.scale.setScalar(.25)
      // Match our original GarmentViewport's projected gizmo center metadata;
      // used for browser input regression, not to approximate ring geometry.
      const projected=pivot.position.clone().project(camera)
      renderer.domElement.dataset.gizmoCenterX=String((projected.x+1)*renderer.domElement.clientWidth*.5)
      renderer.domElement.dataset.gizmoCenterY=String((1-projected.y)*renderer.domElement.clientHeight*.5)
      const cameraRight=new THREE.Vector3(.25,0,0).applyQuaternion(camera.quaternion).add(pivot.position).project(camera)
      renderer.domElement.dataset.gizmoRingRadius=String(Math.abs(cameraRight.x-projected.x)*renderer.domElement.clientWidth*.5)
      renderer.domElement.dataset.gizmoVisible='true'
      const face=pivot.quaternion.clone().invert().multiply(camera.quaternion)
      for(const child of rings.children)if(child.userData.rotationAxis==='free'||child.scale.x>1.2)child.quaternion.copy(face)
      rings.updateMatrixWorld(true)
    }
    const angleAt = event => {
      const rect=renderer.domElement.getBoundingClientRect(), projected=pivot.position.clone().project(camera)
      return Math.atan2(event.clientY-(rect.top+(1-projected.y)*rect.height/2),
        event.clientX-(rect.left+(projected.x+1)*rect.width/2))
    }
    const ringHit = event => {
      if(!rings.visible)return null
      const rect=renderer.domElement.getBoundingClientRect()
      const center=pivot.position.clone().project(camera)
      const right=new THREE.Vector3(.25,0,0).applyQuaternion(camera.quaternion).add(pivot.position).project(camera)
      const radius=Math.abs(right.x-center.x)*rect.width/2
      if(Math.hypot(event.clientX-(rect.left+(center.x+1)*rect.width/2),event.clientY-(rect.top+(1-center.y)*rect.height/2))<radius*.6)return null
      pointer.set((event.clientX-rect.left)*2/rect.width-1,1-(event.clientY-rect.top)*2/rect.height)
      ray.setFromCamera(pointer,camera)
      return ray.intersectObjects(pickRings,false)[0]?.object.userData.rotationAxis||null
    }
    const startPose = id => {
      const mesh=state.panelMeshes.get(id)
      const placement=propsRef.current.snapshot?.template?.panels?.find(p=>p.id===id)?.placement
      if(!mesh||!placement)return null
      return {id,mesh,placement:structuredClone(placement),center:pivot.position.clone(),
        quaternion:pivot.quaternion.clone(), vertices:mesh.geometry.attributes.position.array.slice(),
        meshPosition:mesh.position.clone()}
    }
    const previewPose = pose => {
      if(!pose)return
      const spin=pivot.quaternion.clone().multiply(pose.quaternion.clone().invert())
      const translation=pivot.position.clone().sub(pose.center)
      const attr=pose.mesh.geometry.attributes.position
      for(let i=0;i<attr.count;i++){
        const value=new THREE.Vector3(pose.vertices[i*3],pose.vertices[i*3+1],pose.vertices[i*3+2])
          .add(pose.meshPosition).sub(pose.center).applyQuaternion(spin).add(pose.center).add(translation).sub(pose.meshPosition)
        attr.setXYZ(i,value.x,value.y,value.z)
      }
      attr.needsUpdate=true
      pose.mesh.geometry.computeVertexNormals()
      pose.mesh.geometry.computeBoundingBox()
      pose.mesh.geometry.computeBoundingSphere()
      const moved=point=>point.clone().sub(pose.center).applyQuaternion(spin).add(pose.center).add(translation)
      for(const group of [state.seams,state.boundaries]){
        for(const guide of group.children){
          const links=guide.userData.links||[guide.userData.panel,guide.userData.panel]
          const originals=guide.userData.basePoints
          if(!originals)continue
          const positions=guide.geometry.attributes.position
          originals.forEach((point,index)=>{
            const next=links[index]===pose.id?moved(point):point
            positions.setXYZ(index,next.x,next.y,next.z)
          })
          positions.needsUpdate=true
          guide.geometry.computeBoundingSphere()
        }
      }
      for(const cloud of state.dots.children){
        const markers=cloud.userData.markers||[]
        const dummy=new THREE.Object3D()
        markers.forEach((marker,index)=>{
          dummy.position.copy(marker.panel===pose.id?moved(marker.point):marker.point)
          dummy.updateMatrix();cloud.setMatrixAt(index,dummy.matrix)
        })
        cloud.instanceMatrix.needsUpdate=true
      }
      updateRings()
    }
    const commitPose = pose => {
      if(!pose)return
      const translation=pivot.position.clone().sub(pose.center)
      const spin=pivot.quaternion.clone().multiply(pose.quaternion.clone().invert())
      const baseRotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(...degrees(pose.placement.rotation_degrees||[0,0,0])))
      const euler=new THREE.Euler().setFromQuaternion(spin.multiply(baseRotation),'XYZ')
      if(translation.lengthSq()>1e-12||pivot.quaternion.angleTo(pose.quaternion)>1e-5)
        propsRef.current.onPlace?.({kind:'Place',panel:pose.id,placement:{
          ...pose.placement,translation:(pose.placement.translation||[0,0,0]).map((value,i)=>value+translation.getComponent(i)),
          rotation_degrees:[euler.x,euler.y,euler.z].map(THREE.MathUtils.radToDeg)}})
    }

    const hit = event => {
      const rect = renderer.domElement.getBoundingClientRect()
      if (!rect.width || !rect.height) return null
      pointer.set(2 * (event.clientX - rect.left) / rect.width - 1, 1 - 2 * (event.clientY - rect.top) / rect.height)
      ray.setFromCamera(pointer, camera)
      const edge = ray.intersectObjects(boundaries.children, false).find(item => item.object.userData?.edge)
      const surface = ray.intersectObjects(cloth.children, false)[0]
      const body = propsRef.current.showAvatar && avatar.visible
        ? ray.intersectObjects(avatar.children,false)[0] : null
      // A 10-pixel seam picker remains usable while orbiting and zooming.
      // THREE.Line ray thresholds are measured in world metres, causing the
      // same guide to become nearly unclickable at some camera distances.
      let seam = null
      if (propsRef.current.seamEditing && seams.visible) {
        const projected=[]
        camera.updateMatrixWorld()
        seams.updateMatrixWorld(true)
        for (let index=0;index<seams.children.length;index++) {
          const guide=seams.children[index]
          if (!guide.visible || !guide.userData?.seamId) continue
          const attribute=guide.geometry?.getAttribute('position')
          if (!attribute || attribute.count!==2) continue
          const first=new THREE.Vector3().fromBufferAttribute(attribute,0).applyMatrix4(guide.matrixWorld)
          const second=new THREE.Vector3().fromBufferAttribute(attribute,1).applyMatrix4(guide.matrixWorld)
          const a=first.clone().project(camera),b=second.clone().project(camera)
          if (![a.x,a.y,a.z,b.x,b.y,b.z].every(Number.isFinite) ||
              a.z < -1 || a.z > 1 || b.z < -1 || b.z > 1) continue
          projected.push({seamId:guide.userData.seamId,guideIndex:index,visible:true,
            a:[rect.left+(a.x+1)*rect.width/2,rect.top+(1-a.y)*rect.height/2],
            b:[rect.left+(b.x+1)*rect.width/2,rect.top+(1-b.y)*rect.height/2],
            first,second})
        }
        // Evaluate each guide sample before collapsing to a single candidate
        // per seam. One hidden sample must not hide a different visible sample
        // of the same physical stitching relation.
        const ranked=rankNativeSeam3DGuideScreen20261025(projected,[event.clientX,event.clientY],10,{keepAllSamples:true})
        const projectPoint=candidate=>{
          const preview=candidate.segment
          const startDepth=-preview.first.clone().applyMatrix4(camera.matrixWorldInverse).z
          const endDepth=-preview.second.clone().applyMatrix4(camera.matrixWorldInverse).z
          const corrected=camera.isPerspectiveCamera
            ? nativeSeamPerspectiveFraction20261025(candidate.t,startDepth,endDepth):candidate.t
          return corrected===null?null:preview.first.clone().lerp(preview.second,corrected)
        }
        const uniqueBySeam=rows=>{
          const seen=new Set()
          return rows.filter(candidate=>{
            if(seen.has(candidate.seamId))return false
            seen.add(candidate.seamId)
            return true
          })
        }
        const viewable=uniqueBySeam(ranked.filter(candidate=>{
          const point=projectPoint(candidate)
          if(!point)return false
          const distance=point.sub(ray.ray.origin).dot(ray.ray.direction)
          return distance>0&&(!surface||surface.distance>=distance-.018)&&
            (!body||body.distance>=distance-.018)
        }))
        // Do not let an occluded close line steal the click from the next
        // visible seam. Highlighted selected lines are drawn over cloth; only
        // fall back to that see-through line if nothing physically visible won.
        const selectedId=propsRef.current.selected?.seamId
        const candidates=viewable.length?viewable:uniqueBySeam(ranked.filter(candidate=>{
          if(candidate.seamId!==selectedId)return false
          const point=projectPoint(candidate)
          if(!point)return false
          const distance=point.sub(ray.ray.origin).dot(ray.ray.direction)
          return distance>0&&(!body||body.distance>=distance-.018)
        }))
        const repeated=event.type==='pointerup'&&state.lastSeamClick?.seamId===selectedId&&
          Math.hypot(event.clientX-state.lastSeamClick.x,event.clientY-state.lastSeamClick.y)<6&&
          performance.now()-state.lastSeamClick.at<1500
        const cycle=event.type==='pointerup'&&(event.altKey||state.down?.altKey||repeated)&&candidates.length>1
        const current=cycle?candidates.findIndex(candidate=>candidate.seamId===selectedId):-1
        seam=candidates[current>=0?(current+1)%candidates.length:0]?.segment||null
        renderer.domElement.dataset.native3dSeamLastPickMethod=seam?(cycle?'screen-10px-cycle':'screen-10px'):'none'
        renderer.domElement.dataset.native3dSeamLastPickId=seam?.seamId||''
        renderer.domElement.dataset.native3dSeamPickCandidates=JSON.stringify(candidates.map(candidate=>candidate.seamId))
        renderer.domElement.dataset.native3dSeamOverlapCount=String(candidates.length)
        if(event.type==='pointerup')state.lastSeamClick=seam?{
          x:event.clientX,y:event.clientY,seamId:seam.seamId,at:performance.now()
        }:null
        // Screen samples are diagnostic targets for lightweight browser QA.
        // Their positions are taken from the actual displayed line geometry.
        renderer.domElement.dataset.native3dSeamScreenSamples=JSON.stringify(projected.slice(0,80).map(item=>({
          seamId:item.seamId,x:(item.a[0]+item.b[0])/2,y:(item.a[1]+item.b[1])/2})))
      }
      // A visible fitting body is selectable wherever cloth does not occlude
      // it. This also prevents clicking through the body to fabric behind it.
      if(body && (!surface || body.distance<surface.distance-.003) &&
        (!edge || body.distance<edge.distance-.003) &&
        !seam) return {avatar:true}
      if (seam) {
        const relation=state.seamRelations?.find(item=>item.seamId===seam.seamId)
        return nativeSeamSelectionFromGuide20261025(relation)
      }
      return edge && (!surface || edge.distance < surface.distance + .018)
        ? edge.object.userData : surface?.object.userData || null
    }
    const foamHit=event=>{
      const rect=renderer.domElement.getBoundingClientRect()
      if(!(rect.width>0&&rect.height>0))return null
      pointer.set(2*(event.clientX-rect.left)/rect.width-1,1-2*(event.clientY-rect.top)/rect.height)
      ray.setFromCamera(pointer,camera)
      const candidates=ray.intersectObjects(foamPaddingGroup.children,false)
      const foam=candidates.find(row=>row.object.userData?.foamPadId&&!row.object.userData?.foamStitchGuide)
      if(!foam){renderer.domElement.dataset.nativeFoamLastRay='no-intersection';return null}
      const body=propsRef.current.showAvatar&&avatar.visible?ray.intersectObjects(avatar.children,false)[0]:null
      const clothHit=ray.intersectObjects(cloth.children,false)[0]
      const contactTolerance=.012
      renderer.domElement.dataset.nativeFoamLastRay=[foam.distance.toFixed(3),clothHit?.distance?.toFixed(3)||'none',body?.distance?.toFixed(3)||'none'].join(',')
      if(body&&body.distance<foam.distance-contactTolerance)return null
      if(clothHit&&clothHit.distance<foam.distance-contactTolerance)return null
      return foam
    }
    const releaseFoamPress=event=>{
      if(!state.foamPress||(event?.pointerId!==undefined&&event.pointerId!==state.foamPress.pointerId))return false
      const press=state.foamPress
      state.foamPress=null
      const entry=state.foamCompression.get(press.id)
      if(entry)entry.pressed=false
      controls.enabled=true
      if(renderer.domElement.hasPointerCapture(press.pointerId))renderer.domElement.releasePointerCapture(press.pointerId)
      renderer.domElement.dataset.nativeFoamPressActive='false'
      updateToolCursor()
      return true
    }
    const applyFoamCompression=dt=>{
      for(const [id,entry] of state.foamCompression){
        const mesh=state.foamMeshes.get(id)
        if(!mesh){state.foamCompression.delete(id);continue}
        const props=normalizeFoamMaterial(mesh.userData.foamCompressionProperties)
        const result=stepFoamCompressionState(entry,{pressStrength:entry.pressed?1:0,pressureKpa:45},dt,props)
        entry.compression=result.compression
        entry.velocity=result.velocity
        entry.memory=result.memory
        if(!entry.pressed&&entry.compression<.0005&&Math.abs(entry.velocity)<.001){entry.compression=0;entry.velocity=0}
        const base=mesh.userData.foamCompressionBase,surface=mesh.userData.foamCompressionSurface
        if(!base||!surface)continue
        const attr=mesh.geometry.getAttribute('position')
        const radius=Math.max(.002,entry.radius)
        for(let i=0;i<attr.count;i++){
          const j=i*3,dx=base[j]-entry.point.x,dy=base[j+1]-entry.point.y,dz=base[j+2]-entry.point.z
          const attenuation=foamPressFalloff(Math.sqrt(dx*dx+dy*dy+dz*dz)*100,radius*100)
          const compression=entry.compression*attenuation
          attr.setXYZ(i,base[j]+(surface[j]-base[j])*compression,
            base[j+1]+(surface[j+1]-base[j+1])*compression,
            base[j+2]+(surface[j+2]-base[j+2])*compression)
        }
        attr.needsUpdate=true
        mesh.geometry.computeVertexNormals()
        mesh.geometry.computeBoundingSphere()
        mesh.geometry.computeBoundingBox()
      }
    }
    // Keep the cloth responsive under the pointer while one Rust brush edit is
    // prepared. Solver positions remain authoritative after pointer release.
    // ClothCraft atelier.rs::pick_and_drag: triangle barycentric spring,
    // ray-normal drag plane, continuous solver updates; release removes force.
    const finishStretch = (event, cancelled) => {
      const grab=state.stretchGrab
      if(!grab)return
      state.stretchGrab=null
      controls.enabled=true
      updateToolCursor()
      if(renderer.domElement.hasPointerCapture(event.pointerId))renderer.domElement.releasePointerCapture(event.pointerId)
      propsRef.current.onStretchCancel?.()
      renderer.domElement.dataset.fabricGrabState='idle'
    }
    state.cancelStretch=()=>{if(state.stretchGrab)finishStretch({pointerId:state.stretchGrab.pointerId},true)}
    // Camera input uses the identical live Rust Fabric Hand spring as mouse
    // dragging: ray-hit triangle indices + barycentric weights + world target.
    // The hand tracker never modifies saved vertices or sewing relationships.
    const stopCameraGrab=()=>{
      if(!state.cameraGrab)return
      state.cameraGrab=null
      renderer.domElement.dataset.fabricGrabSource='none'
      renderer.domElement.dataset.fabricGrabState='idle'
      propsRef.current.onStretchCancel?.()
    }
    state.stopCameraGrab=stopCameraGrab
    // Screen-space mouse pointer follows the tracked index fingertip even
    // while the fingers are open. It lives above WebGL and never intercepts
    // mouse input, so the real canvas and toolbar remain usable.
    const cameraCursor=document.createElement('div')
    cameraCursor.className='cc-camera-fabric-cursor'
    cameraCursor.setAttribute('aria-hidden','true')
    cameraCursor.innerHTML='<span class="cc-camera-cursor-arrow"></span><span class="cc-camera-cursor-contact"></span>'
    cameraCursor.dataset.visible='false'
    cameraCursor.dataset.grabbing='false'
    hostNode.appendChild(cameraCursor)
    const cameraFabricHand=event=>{
      const hand=event.detail
      if(!hand?.tracking){
        cameraCursor.dataset.visible='false'
        cameraCursor.dataset.grabbing='false'
        renderer.domElement.dataset.cameraHandCursorVisible='false'
        stopCameraGrab();return
      }
      if(!Number.isFinite(hand.x)||!Number.isFinite(hand.y))return
      const x=THREE.MathUtils.clamp(hand.x,0,1),y=THREE.MathUtils.clamp(hand.y,0,1)
      const rect=renderer.domElement.getBoundingClientRect()
      const rootRect=hostNode.getBoundingClientRect()
      cameraCursor.style.left=`${rect.left-rootRect.left+x*rect.width}px`
      cameraCursor.style.top=`${rect.top-rootRect.top+y*rect.height}px`
      cameraCursor.dataset.visible='true'
      renderer.domElement.dataset.cameraHandCursorVisible='true'
      renderer.domElement.dataset.cameraHandCursorX=x.toFixed(4)
      renderer.domElement.dataset.cameraHandCursorY=y.toFixed(4)
      pointer.set(x*2-1,1-y*2)
      ray.setFromCamera(pointer,camera)
      const hoveredSurface=ray.intersectObjects(cloth.children,false)[0]
      const hoveredBody=ray.intersectObjects(avatar.children,false)[0]
      const overFabric=Boolean(hoveredSurface?.face&&!(avatar.visible&&hoveredBody&&hoveredBody.distance<hoveredSurface.distance-.001))
      cameraCursor.dataset.overFabric=String(overFabric)
      cameraCursor.dataset.grabbing=String(Boolean(hand.pinched&&state.cameraGrab))
      if(!hand.pinched||propsRef.current.mode!=='stretch3d'){
        stopCameraGrab();return
      }
      if(!state.cameraGrab){
        if(state.stretchGrab)return
        const surface=hoveredSurface
        if(!overFabric||!surface?.object.userData?.panel)return
        const origin=surface.point.clone(),mesh=surface.object
        const native=mesh.geometry.userData.nativeVertices||[]
        const face=surface.face,position=mesh.geometry.getAttribute('position')
        if([face.a,face.b,face.c].some(i=>!Number.isInteger(native[i])))return
        const p=mesh.worldToLocal(origin.clone())
        const a=new THREE.Vector3().fromBufferAttribute(position,face.a)
        const b=new THREE.Vector3().fromBufferAttribute(position,face.b)
        const c=new THREE.Vector3().fromBufferAttribute(position,face.c)
        const bary=THREE.Triangle.getBarycoord(p,a,b,c,new THREE.Vector3())
        if(!bary)return
        state.cameraGrab={vertices:[face.a,face.b,face.c].map(i=>native[i]),weights:bary.toArray(),
          origin,plane:new THREE.Plane().setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()),origin)}
        renderer.domElement.dataset.fabricGrabSource='camera'
        renderer.domElement.dataset.fabricGrabState='dragging'
        cameraCursor.dataset.grabbing='true'
        propsRef.current.onStretchStart?.({vertices:state.cameraGrab.vertices,weights:state.cameraGrab.weights,target:origin.toArray()})
      }else{
        const grab=state.cameraGrab
        const point=ray.ray.intersectPlane(grab.plane,new THREE.Vector3())
        if(!point)return
        const displacement=point.sub(grab.origin).clampLength(0,.8)
        const target=grab.origin.clone().add(displacement)
        propsRef.current.onStretchDrag?.({vertices:grab.vertices,weights:grab.weights,target:target.toArray()})
      }
    }
    window.addEventListener('exo-clothcraft-camera-fabric-hand',cameraFabricHand)
    const contextMenu = event => {
      event.preventDefault()
      event.stopPropagation()
      const picked = hit(event)
      // Client coordinates let the workspace's shared portal position the menu
      // correctly even when this canvas is nested in a resizable split pane.
      propsRef.current.onContextMenuRequest?.({
        x: event.clientX, y: event.clientY,
        hit: picked?.panel ? {panel: picked.panel, edge: picked.edge ?? null} : null,
      })
    }
    const pointerDown = event => {
      propsRef.current.onCanvasActivate?.()
      // A moved visual pose cannot be used as an authoritative solver hit
      // target. Allow camera orbit, but block garment edit/pick gestures until
      // the user resets the preview to the genuine Rust rest pose.
      if(walkPreviewRef.current.playing || walkProgressRef.current>0){
        state.down=null
        return
      }
      if (event.button !== 0) return
      if(state.internalLineActive){
        const selectedHit=internalLineHit(event)
        if(selectedHit){
          if(state.internalLinePoints.length===2)state.internalLinePoints=[]
          // Reject a line crossing two independently authored garment panels.
          if(!state.internalLinePoints.length||state.internalLinePoints[0].panel===selectedHit.panel){
            state.internalLinePoints.push(selectedHit)
            if(state.internalLinePoints.length===2){
              const [a,b]=state.internalLinePoints
              if(Math.hypot(a.uv[0]-b.uv[0],a.uv[1]-b.uv[1])>1e-7)
                window.dispatchEvent(new CustomEvent('exo-clothcraft-3d-internal-line',{detail:{panel:a.panel,points:[a.uv,b.uv]}}))
            }
            updateInternalLine()
          }
        }
        event.preventDefault();event.stopImmediatePropagation()
        return
      }
      if(state.tapeMode){
        const hit=tapeHit(event)
        if(hit){
          if(state.tapePoints.length===2&&['garment-measure','avatar-measure'].includes(state.tapeMode))state.tapePoints=[]
          let index=state.tapePoints.length===2?0:state.tapePoints.length
          if(state.tapeMode?.endsWith('-measure-edit')&&state.tapePoints.length===2){
            const rect=renderer.domElement.getBoundingClientRect()
            const screenDistance=point=>{
              const screen=point.clone().project(camera)
              return Math.hypot((screen.x+1)*rect.width/2+rect.left-event.clientX,(1-screen.y)*rect.height/2+rect.top-event.clientY)
            }
            const distances=state.tapePoints.map(p=>screenDistance(p.point))
            if(Math.min(...distances)<=24)index=distances[0]<=distances[1]?0:1
          }
          state.tapePoints[index]=hit
          if(state.tapePoints.length>2)state.tapePoints.length=2
          updateTape()
          if(state.tapeMode?.endsWith('-measure-edit')){
            state.tapeDrag=event.pointerId;state.tapeDragIndex=index
            controls.enabled=false;renderer.domElement.setPointerCapture(event.pointerId)
          }
        }
        event.preventDefault();event.stopImmediatePropagation()
        return
      }
      if(state.meshBrushActive){
        state.brushDrag=event.pointerId
        controls.enabled=false
        renderer.domElement.setPointerCapture(event.pointerId)
        applyBrush(event)
        event.preventDefault();event.stopImmediatePropagation()
        return
      }
      if(!state.stretchCommitPending&&!state.dragging&&!state.stretchGrab&&!transformMode()&&propsRef.current.mode==='edit'&&!propsRef.current.seamEditing){
        const foam=foamHit(event)
        if(foam){
          const mesh=foam.object,id=mesh.userData.foamPadId
          const bounds=mesh.geometry.boundingSphere||new THREE.Sphere()
          const props=normalizeFoamMaterial(mesh.userData.foamCompressionProperties)
          const specifiedRadius=Number(props.contactRadiusCm)/100
          const radius=Math.max(.012,Math.min(.15,Number.isFinite(specifiedRadius)&&specifiedRadius>0?specifiedRadius:bounds.radius*.75||.045))
          const point=foam.point.clone()
          const entry=state.foamCompression.get(id)||{compression:0,velocity:0,memory:0}
          Object.assign(entry,{pressed:true,point,radius})
          state.foamCompression.set(id,entry)
          state.foamPress={id,pointerId:event.pointerId}
          controls.enabled=false
          renderer.domElement.setPointerCapture(event.pointerId)
          renderer.domElement.dataset.nativeFoamPressActive='true'
          renderer.domElement.dataset.nativeFoamSelectedPadId=String(id)
          propsRef.current.onFoamSelect?.(id)
          event.preventDefault();event.stopImmediatePropagation()
          return
        }
      }
      if (state.stretchCommitPending) {event.preventDefault();return}
      // The 3D placement ring remains available in both Move and Rotate;
      // translating with the gizmo and rotating by its circular handle can
      // be combined without switching toolbar modes.
      const axis=['move3d','rotate3d'].includes(propsRef.current.mode)?ringHit(event):null
      if(axis&&propsRef.current.selected?.panel){
        const pose=startPose(propsRef.current.selected.panel)
        if(pose){
          const direction=axis==='free'?camera.getWorldDirection(new THREE.Vector3()).negate():
            new THREE.Vector3(axis==='x'?1:0,axis==='y'?1:0,axis==='z'?1:0).applyQuaternion(pose.quaternion)
          state.ringDrag={pose,direction:direction.normalize(),previous:angleAt(event),accumulated:0}
          controls.enabled=false;transform.enabled=false
          renderer.domElement.setPointerCapture(event.pointerId)
          event.preventDefault();event.stopImmediatePropagation()
          return
        }
      }
      state.down = {x: event.clientX, y: event.clientY, altKey:event.altKey, hit: hit(event)}
      if (propsRef.current.mode === 'move3d' && state.down.hit?.panel && !state.transform.dragging && !state.transform.axis) {
        const id = state.down.hit.panel
        const surface = ray.intersectObjects(cloth.children, false).find(item => item.object.userData?.panel === id)
        const mesh = state.panelMeshes.get(id)
        const panel = propsRef.current.snapshot?.template?.panels?.find(item => item.id === id)
        if (mesh && surface && panel?.placement) {
          const start = surface.point.clone()
          state.move = {pointerId:event.pointerId,id, mesh, start, last:start.clone(), origin:mesh.position.clone(),pivotOrigin:pivot.position.clone(),
            plane:new THREE.Plane().setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()),start),
            placement:structuredClone(panel.placement)}
          controls.enabled = false
          renderer.domElement.setPointerCapture(event.pointerId)
          propsRef.current.onPick?.({panel:id})
        }
      }
      if (propsRef.current.mode === 'stretch3d' && typeof propsRef.current.onStretchDrag === 'function') {
        const surface=ray.intersectObjects(cloth.children,false)[0]
        const occluder=ray.intersectObjects(avatar.children,false)[0]
        if (surface?.object.userData?.panel && (!occluder||occluder.distance>=surface.distance-1e-5)) {
          const origin=surface.point.clone()
          state.down.hit={panel:surface.object.userData.panel}
          const mesh=surface.object,indices=mesh.geometry.userData.nativeVertices
          const face=surface.face,local=mesh.worldToLocal(origin.clone()),position=mesh.geometry.attributes.position
          const a=new THREE.Vector3().fromBufferAttribute(position,face.a),b=new THREE.Vector3().fromBufferAttribute(position,face.b),c=new THREE.Vector3().fromBufferAttribute(position,face.c)
          const bary=THREE.Triangle.getBarycoord(local,a,b,c,new THREE.Vector3())
          if(!bary)return
          const vertices=[face.a,face.b,face.c].map(i=>indices[i]),weights=bary.toArray()
          state.stretchGrab={pointerId:event.pointerId,panel:mesh.userData.panel,vertices,weights,origin,last:origin.clone(),
            plane:new THREE.Plane().setFromNormalAndCoplanarPoint(ray.ray.direction.clone(),origin)}
          renderer.domElement.dataset.fabricGrabState='dragging'
          controls.enabled=false
          renderer.domElement.setPointerCapture(event.pointerId)
          updateToolCursor()
          propsRef.current.onStretchStart?.({vertices,weights,target:origin.toArray()})
          event.preventDefault()
          event.stopImmediatePropagation()
        }
      }
    }
    const pointerMove = event => {
      if(state.foamPress){
        if(event.pointerId===state.foamPress.pointerId){
          const entry=state.foamCompression.get(state.foamPress.id)
          if(entry&&event.buttons===1){
            const foam=foamHit(event)
            if(foam?.object.userData.foamPadId===state.foamPress.id)entry.point.copy(foam.point)
          }
        }
        return
      }
      if(state.tapeMode){
        if(state.tapeDrag===event.pointerId&&event.buttons===1){
          const hit=tapeHit(event)
          if(hit){state.tapePoints[state.tapeDragIndex]=hit;updateTape()}
        }
        return
      }
      if(state.meshBrushActive){
        if(state.brushDrag===event.pointerId&&event.buttons===1)applyBrush(event)
        return
      }
      if(state.ringDrag){
        const drag=state.ringDrag,next=angleAt(event)
        let delta=next-drag.previous
        if(delta>Math.PI)delta-=2*Math.PI
        if(delta< -Math.PI)delta+=2*Math.PI
        drag.previous=next;drag.accumulated+=delta
        pivot.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(drag.direction,drag.accumulated).multiply(drag.pose.quaternion))
        previewPose(drag.pose)
        event.preventDefault()
        return
      }
      if (state.dragging) return
      const axis=transformMode()?ringHit(event):null
      transform.enabled=transformMode()&&!axis
      state.rotationHoverAxis=axis||null
      updateToolCursor()
      const current = hit(event)
      if (!state.stretchGrab) propsRef.current.onHover?.(current)
      if (state.move && event.buttons === 1) {
        const point = ray.ray.intersectPlane(state.move.plane,new THREE.Vector3())
        if (point) {
          state.move.last.copy(point)
          const delta = point.clone().sub(state.move.start)
          state.move.mesh.position.copy(state.move.origin).add(delta)
          pivot.position.copy(state.move.pivotOrigin).add(delta)
          updateRings()
          // Update active sewing guides in-place while the selected cloth is
          // pulled away. All untouched panel endpoints stay at the draped pose.
          for (const guide of state.seams.children) {
            const links=guide.userData?.links,points=guide.userData?.basePoints
            if (!links || !points) continue
            const attr=guide.geometry.attributes.position
            for(let index=0;index<2;index++){
              const p=points[index].clone()
              if(links[index]===state.move.id)p.add(delta)
              attr.setXYZ(index,p.x,p.y,p.z)
            }
            attr.needsUpdate=true
            guide.geometry.computeBoundingSphere()
          }
          for(const boundary of state.boundaries.children){
            if(boundary.userData.panel!==state.move.id)continue
            const attr=boundary.geometry.attributes.position
            boundary.userData.basePoints?.forEach((point,index)=>{
              const next=point.clone().add(delta)
              attr.setXYZ(index,next.x,next.y,next.z)
            })
            attr.needsUpdate=true
            boundary.geometry.computeBoundingSphere()
          }
          const dummy=new THREE.Object3D()
          for(const cloud of state.dots.children){
            ;(cloud.userData.markers||[]).forEach((marker,index)=>{
              dummy.position.copy(marker.point).add(marker.panel===state.move.id?delta:new THREE.Vector3())
              dummy.updateMatrix();cloud.setMatrixAt(index,dummy.matrix)
            })
            cloud.instanceMatrix.needsUpdate=true
          }
        }
        return
      }
      if (state.stretchGrab && event.buttons === 1) {
        const point=ray.ray.intersectPlane(state.stretchGrab.plane,new THREE.Vector3())
        if (point) {
          state.stretchGrab.last.copy(point)
          propsRef.current.onStretchDrag?.({vertices:state.stretchGrab.vertices,weights:state.stretchGrab.weights,target:point.toArray()})
        }
        event.preventDefault()
      }
    }
    const pointerUp = event => {
      if(releaseFoamPress(event))return
      if(state.tapeDrag===event.pointerId){
        state.tapeDrag=null;controls.enabled=true
        if(renderer.domElement.hasPointerCapture(event.pointerId))renderer.domElement.releasePointerCapture(event.pointerId)
        updateToolCursor()
        return
      }
      if(state.brushDrag===event.pointerId){
        state.brushDrag=null;controls.enabled=true
        if(renderer.domElement.hasPointerCapture(event.pointerId))renderer.domElement.releasePointerCapture(event.pointerId)
        updateToolCursor()
        return
      }
      if (state.stretchGrab) {
        const wasClick=state.down && Math.hypot(event.clientX-state.down.x,event.clientY-state.down.y)<5
        const picked=state.down?.hit
        finishStretch(event,event.type==='pointercancel')
        if(wasClick&&event.type!=='pointercancel')propsRef.current.onPick?.(picked)
        state.down=null
        return
      }
      if(state.ringDrag){
        const drag=state.ringDrag
        if(event.type==='pointercancel'){pivot.quaternion.copy(drag.pose.quaternion);previewPose(drag.pose)}
        else commitPose(drag.pose)
        state.ringDrag=null;controls.enabled=true;transform.enabled=transformMode()
        if(renderer.domElement.hasPointerCapture(event.pointerId))renderer.domElement.releasePointerCapture(event.pointerId)
        updateToolCursor()
        return
      }
      const movedPanel = Boolean(state.move)
      if (state.move) {
        const movement=state.move.last.clone().sub(state.move.start)
        const p=state.move.placement
        if (event.type!=='pointercancel' && movement.lengthSq()>1e-8) {
          const translation=(p.translation||[0,0,0]).map((n,i)=>n+movement.getComponent(i))
          propsRef.current.onPlace?.({kind:'Place',panel:state.move.id,placement:{...p,translation}})
        } else {state.move.mesh.position.copy(state.move.origin);setGrabRefresh(value=>value+1)}
        state.move=null
        controls.enabled=true
        if (renderer.domElement.hasPointerCapture(event.pointerId))renderer.domElement.releasePointerCapture(event.pointerId)
      }
      if (state.down && !movedPanel && event.type!=='pointercancel' && !state.dragging && Math.hypot(event.clientX - state.down.x, event.clientY - state.down.y) < 5)
        propsRef.current.onPick?.(hit(event))
      state.down = null
      state.stretchPlane = null
      state.stretchPoint = null
      state.stretchLast = null
    }
    const pointerLeave = () => {
      propsRef.current.onHover?.(null)
      state.rotationHoverAxis=null
      updateToolCursor()
      if(!state.move&&!state.stretchGrab){state.down=null;state.stretchPlane=null}
    }
    const draggingChanged = event => {
      state.dragging = !!event.value
      controls.enabled = !event.value
      if (event.value) {
        state.handleStart = {position: pivot.position.clone(), rotation: pivot.quaternion.clone()}
        state.transformPose=startPose(propsRef.current.selected?.panel)
        const p = propsRef.current.snapshot?.template?.panels?.find(panel => panel.id === propsRef.current.selected?.panel)
        if (p) state.nativeStart = structuredClone(p.placement)
      }
    }
    const transformEnd = () => {
      if(state.transformPose){
        commitPose(state.transformPose)
        state.transformPose=null;state.nativeStart=null;state.handleStart=null
        return
      }
      const id = propsRef.current.selected?.panel
      if (!id || !state.nativeStart || !state.handleStart) return
      const base = state.nativeStart
      const movement = pivot.position.clone().sub(state.handleStart.position)
      const translation = (base.translation || [0, 0, 0]).map((coordinate, index) => coordinate + movement.getComponent(index))
      const baseQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(...degrees(base.rotation_degrees || [0, 0, 0]), 'XYZ'))
      const rotationDelta = pivot.quaternion.clone().multiply(state.handleStart.rotation.clone().invert())
      const updatedEuler = new THREE.Euler().setFromQuaternion(rotationDelta.multiply(baseQuaternion), 'XYZ')
      const rotation_degrees = [updatedEuler.x, updatedEuler.y, updatedEuler.z].map(THREE.MathUtils.radToDeg)
      if (movement.lengthSq() > 1e-12 || rotation_degrees.some((value, index) => Math.abs(value - (base.rotation_degrees?.[index] || 0)) > 1e-5))
        propsRef.current.onPlace?.({kind: 'Place', panel: id, placement: {translation, rotation_degrees}})
      state.nativeStart = null
      state.handleStart = null
    }
    renderer.domElement.addEventListener('pointerdown', pointerDown)
    renderer.domElement.addEventListener('pointerdown', pointerDown, true)
    renderer.domElement.removeEventListener('pointerdown', pointerDown)
    renderer.domElement.addEventListener('pointermove', pointerMove)
    renderer.domElement.addEventListener('contextmenu', contextMenu)
    renderer.domElement.addEventListener('pointerup', pointerUp)
    renderer.domElement.addEventListener('pointercancel', pointerUp)
    const cancelLostGrab=()=>{releaseFoamPress();state.cancelStretch?.();stopCameraGrab();if(state.move)pointerUp({type:'pointercancel',pointerId:state.move.pointerId,clientX:NaN,clientY:NaN})}
    renderer.domElement.addEventListener('lostpointercapture',cancelLostGrab)
    window.addEventListener('blur',cancelLostGrab)
    renderer.domElement.addEventListener('pointerleave', pointerLeave)
    transform.addEventListener('dragging-changed', draggingChanged)
    const transformPreview=()=>previewPose(state.transformPose)
    transform.addEventListener('objectChange', transformPreview)
    transform.addEventListener('mouseUp', transformEnd)
    const resize = () => {
      if (!hostNode.isConnected) return
      const {width, height} = renderSurface.getBoundingClientRect()
      if (width <= 0 || height <= 0) return
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(renderSurface)
    resize()
    // Techpack images are genuine render captures from the active EXO scene,
    // not illustration substitutes or an unrelated website mockup. Restore
    // the user's camera and orbit target immediately after capturing.
    const captureTechpackViews=()=>{
      const pos=propsRef.current.snapshot?.positions
      const vertices=Array.isArray(pos)?pos.filter(p=>Array.isArray(p)&&p.length>=3&&p.every(Number.isFinite)):[]
      if(vertices.length<3||renderer.domElement.width<10||renderer.domElement.height<10)return
      const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity]
      for(const point of vertices)for(let axis=0;axis<3;axis++){
        lo[axis]=Math.min(lo[axis],point[axis]);hi[axis]=Math.max(hi[axis],point[axis])
      }
      const center=new THREE.Vector3(...lo.map((minimum,axis)=>(minimum+hi[axis])/2))
      const extent=Math.max(.4,...lo.map((minimum,axis)=>hi[axis]-minimum))
      const distance=Math.min(20,Math.max(1.1,extent*2.75))
      const previous={position:camera.position.clone(),quaternion:camera.quaternion.clone(),target:controls.target.clone()}
      const savedView=controls.enabled
      const hiddenNodes=[avatar,grid,floor,boundaries,seams,dots,boxes,brushMarks,tapeMarks,internalLineMarks,authoredLines,rings,pivot,transform.getHelper()]
      const previousVisibility=hiddenNodes.map(node=>node.visible)
      const previousBackground=scene.background,previousFog=scene.fog
      const results={}
      try{
        controls.enabled=false
        hiddenNodes.forEach(node=>{node.visible=false})
        scene.background=new THREE.Color('#ffffff')
        scene.fog=null
        const frame=document.createElement('canvas');frame.width=520;frame.height=560
        const ctx=frame.getContext('2d')
        if(!ctx)return
        for(const [name,direction] of [['front',[0,0,1]],['back',[0,0,-1]],['side',[1,0,0]]]){
          camera.position.copy(center).add(new THREE.Vector3(...direction).multiplyScalar(distance))
          camera.lookAt(center)
          camera.updateMatrixWorld(true)
          renderer.render(scene,camera)
          ctx.fillStyle='#f7f8f8';ctx.fillRect(0,0,frame.width,frame.height)
          ctx.drawImage(renderer.domElement,0,0,frame.width,frame.height)
          results[name]=frame.toDataURL('image/jpeg',.73)
        }
      }catch(error){console.warn('EXO techpack scene render capture unavailable:',error)}
      finally{
        camera.position.copy(previous.position);camera.quaternion.copy(previous.quaternion);controls.target.copy(previous.target)
        hiddenNodes.forEach((node,index)=>{node.visible=previousVisibility[index]})
        scene.background=previousBackground;scene.fog=previousFog
        controls.enabled=savedView;camera.updateMatrixWorld(true);renderer.render(scene,camera)
      }
      if(Object.keys(results).length===3)window.dispatchEvent(new CustomEvent('exo-clothcraft-techpack-render-captured',{detail:{views:results,revision:propsRef.current.snapshot?.revision??null}}))
    }
    window.addEventListener('exo-clothcraft-techpack-render-capture-request',captureTechpackViews)
    let lastFrame=performance.now()
    const render = () => {
      state.requestId = requestAnimationFrame(render)
      const now=performance.now(),dt=Math.min(.033,Math.max(0,(now-lastFrame)/1000))
      lastFrame=now
      const cfg=walkPreviewRef.current
      if(cfg.playing){
        let next=walkProgressRef.current+dt/walkDuration(cfg)
        if(next>=1){
          if(cfg.loop)next%=1
          else {next=1;setWalkPlaying(false)}
        }
        walkProgressRef.current=next
        if(now-(state.walkLastUiTime||0)>120){
          state.walkLastUiTime=now
          setWalkProgress(next)
        }
      }
      if(now-state.walkLastFrame>33 && (cfg.playing || state.walkApplied || walkProgressRef.current>0)){
        state.walkLastFrame=now
        applyWalkPreview(walkProgressRef.current)
      }
      applyFoamCompression(dt)
      updateRings()
      controls.update()
      renderer.render(scene, camera)
    }
    render()
    return () => {
      stopCameraGrab()
      cameraCursor.remove()
      window.removeEventListener('exo-clothcraft-camera-fabric-hand',cameraFabricHand)
      cancelAnimationFrame(state.requestId)
      window.removeEventListener('exo-clothcraft-mesh-brush',activateBrush)
      window.removeEventListener('exo-clothcraft-3d-tool',activateBrush)
      window.removeEventListener('exo-clothcraft-3d-tool',activateTape)
      window.removeEventListener('exo-clothcraft-3d-tool',activateInternalLine)
      window.removeEventListener('keydown',clearBrush,true)
      observer.disconnect()
      window.removeEventListener('exo-clothcraft-techpack-render-capture-request',captureTechpackViews)
      renderer.domElement.removeEventListener('pointerdown', pointerDown, true)
      renderer.domElement.removeEventListener('pointermove', pointerMove)
      renderer.domElement.removeEventListener('contextmenu', contextMenu)
      renderer.domElement.removeEventListener('pointerup', pointerUp)
      renderer.domElement.removeEventListener('pointercancel', pointerUp)
      renderer.domElement.removeEventListener('lostpointercapture',cancelLostGrab)
      window.removeEventListener('blur',cancelLostGrab)
      renderer.domElement.removeEventListener('pointerleave', pointerLeave)
      transform.removeEventListener('dragging-changed', draggingChanged)
      transform.removeEventListener('mouseUp', transformEnd)
      transform.removeEventListener('objectChange', transformPreview)
      transform.detach()
      transform.dispose()
      controls.dispose()
      replaceChildren(cloth); replaceChildren(avatar); replaceChildren(boundaries)
      replaceChildren(seams); replaceChildren(dots); replaceChildren(boxes); replaceChildren(brushMarks)
      replaceChildren(tapeMarks)
      replaceChildren(internalLineMarks)
      replaceChildren(authoredLines)
      replaceChildren(foamPaddingGroup)
      state.foamCompression.clear();state.foamMeshes.clear()
      if(state.stageGroup){
        state.stageGroup.userData.disposed = true
        scene.remove(state.stageGroup)
        applyStageFloorTint(state.stageGroup,null,false)
        disposeTree(state.stageGroup)
        state.stageGroup = null
      }
      disposeTree(rings)
      scene.environment = null
      studioEnvironment.dispose()
      pmremGenerator.dispose()
      studioBackdrop.dispose()
      floor.geometry.dispose();floor.material.dispose()
      grid.geometry.dispose()
      for (const value of [grid.material, axes.material]) {
        for (const mat of Array.isArray(value)?value:[value]) mat?.dispose?.()
      }
      disposeTree(axes)
      centerGuide.geometry.dispose()
      centerGuide.material.dispose()
      renderer.dispose()
      renderer.domElement.remove()
      for (const entry of hardwareRecordsRef.current.values()) entry.record?.dispose?.()
      hardwareRecordsRef.current.clear()
      sceneRef.current = null
    }
  }, [])

  // Preview-only avatar selector. The Rust collision body remains the same
  // authoritative fitted mesh; Theo/Nora and compact Thomas are visual actors
  // that can reuse the identical walking preset on any curated 3D stage.
  useEffect(()=>{
    const state=sceneRef.current
    if(!state)return undefined
    const source=WALK_AVATAR_SOURCES.find(item=>item.id===walkAvatarSource)
    let cancelled=false
    walkProgressRef.current=0
    setWalkProgress(0)
    setWalkPlaying(false)
    state.applyWalkPreview?.(0)
    state.walkGeometries.clear()
    state.walkAvatarBones=[]
    state.walkAvatarSource=walkAvatarSource
    state.avatar.visible=showAvatar&&walkAvatarSource==='native'
    setWalkAvatarError('')
    if(!source?.url)return undefined
    const loader=new GLTFLoader()
    loader.load(source.url,gltf=>{
      if(cancelled||sceneRef.current!==state){
        disposeTree(gltf.scene)
        return
      }
      const root=gltf.scene
      root.name='exo-stage-walk-visual-avatar-'+walkAvatarSource
      root.visible=showAvatar
      root.traverse(node=>{
        if(!node.isBone)return
        // GLTFLoader sanitizes ':' from Mixamo bone names to '_' so support
        // both the authored and the sanitized rig naming conventions.
        const name=node.name.toLowerCase().replace(/^.*?mixamorig[_:]?/,'').replace(/^.*:/,'')
        if(/^(left|right)(upleg|leg|thigh|arm|forearm)/.test(name))
          state.walkAvatarBones.push({name,bone:node,restX:node.rotation.x,restZ:node.rotation.z})
      })
      state.scene.add(root)
      state.walkAvatarRoot=root
      state.walkGeometries.clear()
      state.renderer.domElement.dataset.walkAvatarLoaded=walkAvatarSource
    },undefined,error=>{
      if(!cancelled)setWalkAvatarError('Could not load local avatar: '+String(error.message||error).slice(0,100))
    })
    return()=>{
      cancelled=true
      const root=state.walkAvatarRoot
      if(root){
        state.scene.remove(root)
        disposeTree(root)
      }
      state.walkAvatarRoot=null
      state.walkAvatarBones=[]
      state.walkGeometries.clear()
      state.walkAvatarSource='native'
      if(state.renderer?.domElement)state.renderer.domElement.dataset.walkAvatarLoaded=''
    }
  },[walkAvatarSource])

  // A native 3D mode change can originate from keyboard shortcuts, the
  // embedded quick bar, or a context menu instead of a CLO A/B slot. Release
  // mesh-brush pointer capture in every case when leaving the edit viewport.
  useEffect(() => {
    if (mode !== 'edit') sceneRef.current?.setBrushActive?.(false, true)
    if (mode !== 'stretch3d') sceneRef.current?.stopCameraGrab?.()
  }, [mode])

  useEffect(() => {
    const state = sceneRef.current
    if (!state) return
    state.floor.visible = showFloor && stageId === 'none'
    state.grid.visible = showFloor && stageId === 'none'
    const lighting = {
      studio: {hemi:1.85,key:2.6,rim:.85},
      softbox: {hemi:2.35,key:2.15,rim:.62},
      dramatic: {hemi:1.05,key:3.4,rim:1.65},
      neutral: {hemi:1.95,key:2.3,rim:.8},
    }[environmentPreset] || {hemi:1.85,key:2.6,rim:.85}
    state.ambient.intensity = lighting.hemi
    state.key.intensity = lighting.key
    state.fill.intensity = lighting.rim
    state.renderer.domElement.dataset.studioLightingPreset = environmentPreset
    state.renderer.domElement.dataset.studioFloorVisible = String(showFloor)
  }, [environmentPreset, stageId, showFloor])

  useEffect(()=>{
    const state=sceneRef.current
    if(!state)return
    applySceneCameraViewport(state.camera,state.controls,cameraSettings,state.renderer.domElement)
  },[cameraSettings])

  useEffect(()=>{
    const state=sceneRef.current
    if(!state)return
    const defaults={
      studio:{key:2.6,rim:.85},softbox:{key:2.15,rim:.62},
      dramatic:{key:3.4,rim:1.65},neutral:{key:2.3,rim:.8},
    }[environmentPreset]||{key:2.6,rim:.85}
    state.key.intensity=defaults.key*(sceneLight?.enabled===false?0:Math.max(0,Math.min(10,Number(sceneLight?.intensity??1))))
    state.fill.intensity=defaults.rim*(sceneLight2?.enabled===false?0:Math.max(0,Math.min(10,Number(sceneLight2?.intensity??1))))
    state.key.color.set(sceneLight?.color||'#fffcf8')
    state.fill.color.set(sceneLight2?.color||'#e2ecff')
    state.renderer.toneMappingExposure=Math.max(.2,Math.min(5,Number(exposure)||1.1))
    state.renderer.domElement.dataset.sceneLightIntensity=String(state.key.intensity)
    state.renderer.domElement.dataset.sceneLight2Intensity=String(state.fill.intensity)
  },[sceneLight,sceneLight2,environmentPreset,exposure])

  // Per-designer studio customization is optical only: never rewrite Rust
  // garment coordinates, stage presets or authored scene lighting properties.
  useEffect(()=>{
    const state=sceneRef.current
    if(!state)return
    const color=studioAppearance?.backgroundMode==='color'?studioAppearance?.studioColor:null
    const fogColor=paintStudioGradient(state.studioBackdrop,color)
    state.scene.background=state.studioBackdrop
    const floorColor=/^#[0-9a-f]{6}$/i.test(studioAppearance?.floorColor||'')?studioAppearance.floorColor:'#ebebed'
    const customFloor=studioAppearance?.floorMode==='color'
    state.floor.material.color.set(customFloor?floorColor:'#ebebed')
    state.studioFloorAppearance={color:floorColor,custom:customFloor}
    applyStageFloorTint(state.stageGroup,floorColor,customFloor)
    state.renderer.domElement.dataset.customStudioFloor=floorColor
    state.renderer.domElement.dataset.studioFloorMode=customFloor?'color':'default'
    // A runway is a full-sized room: neutral-studio distance fog must not
    // erase the rear set, avatar, or garment panels arranged off-body.
    state.scene.fog=stageId==='EXO01'?null:new THREE.Fog(fogColor,6,16)
    const base={
      studio:2.6,softbox:2.15,dramatic:3.4,neutral:2.3,
    }[studioAppearance?.environmentPreset||environmentPreset]||2.6
    const configured=sceneLight?.enabled===false?0:Math.max(0,Math.min(10,Number(sceneLight?.intensity??1)))
    state.key.intensity=base*configured*Math.max(0,Math.min(5,Number(studioAppearance?.lightIntensity??1)))
    state.key.color.set(studioAppearance?.lightColor||sceneLight?.color||'#fffcf8')
    state.key.position.set(
      Number(studioAppearance?.lightPositionX??2.5),
      Number(studioAppearance?.lightPositionY??4.5),
      Number(studioAppearance?.lightPositionZ??3.1),
    )
    state.renderer.domElement.dataset.customStudioBackground=color||''
    state.renderer.domElement.dataset.customStudioLight=studioAppearance?.lightColor||''
    state.renderer.domElement.dataset.studioBackgroundMode=studioAppearance?.backgroundMode||'default'
    state.renderer.domElement.dataset.studioLightPosition=state.key.position.toArray().map(v=>v.toFixed(2)).join(',')
  },[studioAppearance?.studioColor,studioAppearance?.floorColor,studioAppearance?.floorMode,studioAppearance?.backgroundMode,studioAppearance?.environmentPreset,studioAppearance?.lightColor,studioAppearance?.lightIntensity,studioAppearance?.lightPositionX,studioAppearance?.lightPositionY,studioAppearance?.lightPositionZ,sceneLight,environmentPreset,stageId])

  useEffect(()=>{
    const state=sceneRef.current
    if(!state)return
    const quality=studioPreferences?.graphicsQuality||'high'
    const ratios={low:1,medium:1.25,high:2,ultra:2.5}
    state.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,ratios[quality]||2))
    const blender=studioPreferences?.viewControls==='blender'
    state.controls.mouseButtons=blender
      ? {LEFT:THREE.MOUSE.PAN,MIDDLE:THREE.MOUSE.ROTATE,RIGHT:THREE.MOUSE.DOLLY}
      : {LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.PAN}
    state.renderer.domElement.dataset.studioGraphicsQuality=quality
    state.renderer.domElement.dataset.studioAntialias=String(studioPreferences?.antialias!==false)
    state.renderer.domElement.dataset.studioViewControls=studioPreferences?.viewControls||'clo'
  },[studioPreferences?.graphicsQuality,studioPreferences?.antialias,studioPreferences?.viewControls])

  // EXO's stage is purely presentation geometry. A switch does not re-create
  // the native Rust garment snapshot, contacts, or editor selection.
  const syncStageLogoDiagnostics = () => {
    const state = sceneRef.current
    if (!state) return
    const canvas = state.renderer.domElement
    const logo = state.stageGroup?.userData.stageLogo
    let meshCount = 0
    logo?.traverse(node => { if (node.isMesh && node.geometry?.getAttribute('position')?.count) meshCount++ })
    canvas.dataset.stageLogoVisible = String(Boolean(logo && logo.visible && meshCount))
    canvas.dataset.stageLogoMeshCount = String(meshCount)
    canvas.dataset.stageLogoScale = logo ? String(logo.scale.x) : '0'
    const mesh = logo?.children.find(node => node.isMesh && node.material?.color)
    canvas.dataset.stageLogoColor = mesh?.material?.color?.getHexString ? `#${mesh.material.color.getHexString()}` : ''
  }
  useEffect(() => {
    const state = sceneRef.current
    if (!state) return
    const previous = state.stageGroup
    if(previous){
      previous.userData.disposed = true
      state.scene.remove(previous)
      applyStageFloorTint(previous,null,false)
      disposeTree(previous)
      state.stageGroup = null
    }
    const canvas = state.renderer.domElement
    canvas.dataset.stageId = stageId || 'none'
    canvas.dataset.stageMeshCount = '0'
    canvas.dataset.stageStatus = stageId === 'none' ? 'none' : 'loading'
    canvas.dataset.stageCameraReady = 'false'
    syncStageLogoDiagnostics()
    state.framedStageId = null
    // Stage has its own authored floor at Y=0, and is presentation geometry.
    // The real Rust avatar and cloth groups always stay outside this group.
    state.scene.fog=stageId==='EXO01'?null:new THREE.Fog(state.scene.background?.isColor?state.scene.background:0xe9e9eb,6,16)
    if(!stageId || stageId === 'none') return
    const update = group => {
      if(state.stageGroup !== group || group.userData.disposed || !canvas.isConnected)return
      applyStageFloorTint(group,state.studioFloorAppearance?.color,state.studioFloorAppearance?.custom)
      let count = 0
      group.traverse(item => {if(item.isMesh && item.geometry?.getAttribute('position')?.count > 0)count++})
      canvas.dataset.stageMeshCount = String(count)
      canvas.dataset.stageStatus = group.userData.loadError ? 'error' : count > 0 ? 'ready' : 'empty'
      syncStageLogoDiagnostics()
      if(group.userData.loaded && count && state.framedStageId!==stageId){
        // Each recovered Blender room needs an initial shot from its runway
        // entrance. The avatar stays at the origin; the wall signage sits
        // behind/above it. Keep the previously approved EXO01 shot intact.
        const exo = stageId === 'EXO01'
        const target=exo ? new THREE.Vector3(0,1.05,-.25) : new THREE.Vector3(.15,1.55,-1.2)
        state.controls.target.copy(target)
        if(exo) state.camera.position.set(2.75,2.3,5.35)
        else if(stageId==='R02') state.camera.position.set(.75,2.55,6.5)
        else state.camera.position.set(.5,2.4,5.4)
        state.camera.lookAt(target)
        state.controls.update()
        state.framedStageId=stageId
        canvas.dataset.stageCameraReady='true'
      }
    }
    const group = createStageEnvironment(THREE,stageId,update,stageSettings || {})
    state.stageGroup = group
    state.scene.add(group)
    update(group)
    return () => {
      if(state.stageGroup!==group)return
      group.userData.disposed = true
      state.scene.remove(group)
      applyStageFloorTint(group,null,false)
      disposeTree(group)
      state.stageGroup = null
    }
  },[stageId])

  useEffect(() => {
    const group = sceneRef.current?.stageGroup
    if (group) applyStageSettings(THREE, group, stageSettings || {})
    syncStageLogoDiagnostics()
  }, [stageSettings, stageId])

  // Animation is a separate viewing workspace. On entry restore an intentional
  // runway shot instead of inheriting the last pattern-edit orbit (which can
  // be extremely zoomed out, facing a wall, or inside the stage geometry).
  useEffect(()=>{
    if(!animationWorkspaceActive)return
    const state=sceneRef.current
    if(!state)return
    const lookAt=new THREE.Vector3(0,1.03,0)
    state.controls.target.copy(lookAt)
    state.camera.position.set(stageId==='EXO01'?1.9:1.1,1.85,stageId==='EXO01'?5.2:4.0)
    state.camera.lookAt(lookAt)
    state.controls.update()
    state.renderer.domElement.dataset.animationCameraFramed='true'
  },[animationWorkspaceActive,stageId])

  useEffect(() => {
    const state = sceneRef.current
    if (!state) return
    const {cloth, boundaries, seams, dots, avatar, boxes, authoredLines, panelMeshes, panelOffsets} = state
    for (const group of [cloth, boundaries, seams, dots, avatar, boxes, authoredLines]) replaceChildren(group)
    // The prior geometries were just disposed. A new Rust snapshot becomes the
    // exact rest pose for the non-destructive visual animation.
    state.walkGeometries.clear()
    state.walkApplied=false
    panelMeshes.clear()
    panelOffsets.clear()
    if (!snapshot) {
      state.markerCounts = SEAM_COLORS.map(() => 0)
      state.seamRelations=[]
      setMarkerDiagnostics(state.renderer.domElement, state.markerCounts, false)
      state.renderer.domElement.dataset.native3dSeamGuideCount='0'
      state.renderer.domElement.dataset.native3dSewingRevision=''
      state.renderer.domElement.dataset.native3dSeamIssues='[]'
      state.renderer.domElement.dataset.native3dPanelMeshCount = '0'
      state.renderer.domElement.dataset.native3dMeshRevision = ''
      state.renderer.domElement.dataset.native3dMeshTriangles = '0'
      return
    }
    // Explicit proof that the Three.js cloth was rebuilt from the same
    // committed Rust Shape snapshot as the 2D pattern. A staged yellow
    // proposal never falsely reports a committed 3D fabric change.
    state.renderer.domElement.dataset.native3dMeshRevision=String(snapshot.revision??'')
    state.renderer.domElement.dataset.native3dMeshTriangles=String(snapshot.triangles?.length||0)
    state.renderer.domElement.dataset.native3dMeshVertices=String(snapshot.positions?.length||0)
    // Keep 3D scene QA tied to the exact Rust seam samples of the rendered
    // snapshot. A visible stitched dart is not proof of physical closure.
    state.renderer.domElement.dataset.nativeDartCount=String(snapshot.dartFit?.length||0)
    state.renderer.domElement.dataset.nativeDartMaxGapMm=String(
      Math.max(0,...(snapshot.dartFit||[]).map(item=>Number(item.maxGapMm)||0)))
    state.renderer.domElement.dataset.nativeDartProvisionalClosure=String(
      Boolean(snapshot.dartFit?.length)&&snapshot.dartFit.every(item=>item.withinProvisional2mm))
    const world = preDrapeDisplayPositions(snapshot)
    const previewCurved = world !== snapshot.positions
    state.renderer.domElement.dataset.nativePreDrapeCurved = String(previewCurved)
    state.renderer.domElement.dataset.nativePreDrapeDepth = previewCurved
      ? String(world.reduce((max,p,i)=>Math.max(max,Math.abs((p?.[0]||0)-(snapshot.positions?.[i]?.[0]||0)),Math.abs((p?.[2]||0)-(snapshot.positions?.[i]?.[2]||0))),0)) : '0'
    const panels = snapshot.panels || []
    const templatePanels = snapshot.template?.panels || []
    let renderedGraphics=0
    const strains=analysisMode==='strain'?vertexExtensions(snapshot):null
    state.renderer.domElement.dataset.analysisMode=analysisMode
    const offsetMagnitude = typeof spread === 'number' && Number.isFinite(spread) ? Math.max(0, spread) : (spread ? .3 : 0)
    panels.forEach((panel, index) => {
      const piece = templatePanels.find(item => item.id === panel.id)
      const triangleRange = Array.isArray(panel.triangles) && Array.isArray(snapshot.triangles)
        ? snapshot.triangles.slice(panel.triangles[0], panel.triangles[1]) : []
      const panelMesh = buildIndexedMesh(world, triangleRange, COLORS[index % COLORS.length], snapshot.uv)
      panelMesh.material.dispose()
      const fabricId=piece?.fabric
      const fabricAppearance=fabricId==null?null:snapshot.propertyMetadata?.fabrics?.[fabricId]?.appearance
      let backMaterial=null,sideMaterial=null
      const nativeFabric=snapshot.template?.fabrics?.find(f=>f.id===fabricId)
      if(!strains){
        const faces=createFabricFaceMaterials(nativeFabric,piece?.grain_degrees||0,fabricAppearance)
        panelMesh.material=faces.front
        backMaterial=faces.back
        sideMaterial=faces.side
      }
      if(strains){
        const colors=panelMesh.geometry.userData.nativeVertices.flatMap(i=>{
          const color=new THREE.Color().setHSL((1-Math.min(1,Math.max(0,strains[i])/.25))*.66,1,.5)
          return [color.r,color.g,color.b]
        })
        panelMesh.geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3))
        panelMesh.material.userData?.ownedTexture?.dispose()
        panelMesh.material.dispose()
        panelMesh.material=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide})
      }
      const offset = new THREE.Vector3()
      if (offsetMagnitude) {
        const angle = (index / Math.max(1, panels.length)) * 2 * Math.PI
        offset.set(Math.cos(angle) * offsetMagnitude, 0, Math.sin(angle) * offsetMagnitude)
      }
      panelMesh.position.copy(offset)
      panelMesh.userData = {panel: panel.id}
      // Keep native picking two-sided despite distinct front/back render faces.
      // The raycaster tests the original cloth only; display children never pick.
      if(backMaterial){
        const nativeRaycast=panelMesh.raycast
        panelMesh.raycast=function(raycaster,intersections){
          const originalSide=this.material.side
          this.material.side=THREE.DoubleSide
          try{nativeRaycast.call(this,raycaster,intersections)}finally{this.material.side=originalSide}
        }
      }
      if(backMaterial){
        const backMesh=new THREE.Mesh(panelMesh.geometry,backMaterial)
        backMesh.name='native-cloth-back-face'
        backMesh.raycast=()=>{}
        backMesh.castShadow=true
        backMesh.receiveShadow=true
        backMesh.material.wireframe=wireframe
        panelMesh.add(backMesh)
      }
      if(sideMaterial){
        // The Rust template stores fabric thickness in its properties object,
        // in metres; library presets may expose a legacy root-level value.
        const thickness=Number(nativeFabric?.properties?.thickness??nativeFabric?.thickness)
        const ribbon=createFabricEdgeRibbon(panelMesh.geometry,thickness)
        if(ribbon.geometry){
          const sideMesh=new THREE.Mesh(ribbon.geometry,sideMaterial)
          sideMesh.name='native-cloth-side-edge'
          sideMesh.raycast=()=>{}
          sideMesh.castShadow=false
          sideMesh.receiveShadow=true
          sideMesh.userData={edgeCount:ribbon.edgeCount,thicknessMeters:ribbon.thicknessMeters}
          sideMesh.material.wireframe=wireframe
          panelMesh.add(sideMesh)
        }else sideMaterial.dispose()
      }
      const graphicsForPanel=graphics.filter(graphic=>graphic.panel===panel.id&&graphic.visible!==false)
      if(graphicsForPanel.length){
        attachGarmentGraphics(panelMesh,graphicsForPanel)
        renderedGraphics+=graphicsForPanel.length
      }
      panelMesh.material.wireframe = wireframe
      panelMesh.castShadow = true
      panelMesh.receiveShadow = true
      cloth.add(panelMesh)
      panelMeshes.set(panel.id, panelMesh)
      panelOffsets.set(panel.id, offset)
      // Render native authored lines in 3D on every new solver snapshot. The
      // preview points can disappear when the tool is dismissed; the saved
      // pattern line remains visible here and in native project history.
      for(const guide of piece?.polygon?.lines||[]){
        const points=guide.points||[]
        if(points.length<2||!points.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)))continue
        for(let j=1;j<points.length;j++){
          const first=points[j-1],last=points[j]
          const count=Math.max(8,Math.min(120,Math.ceil(Math.hypot(last[0]-first[0],last[1]-first[1])/.012)))
          let current=[]
          const finish=()=>{
            if(current.length>1){
              const stroke=new THREE.Line(new THREE.BufferGeometry().setFromPoints(current),
                new THREE.LineBasicMaterial({color:'#1aadd4',depthTest:false,depthWrite:false,transparent:true,opacity:.92}))
              stroke.renderOrder=88;stroke.userData={panel:panel.id,internalLine:guide.id}
              authoredLines.add(stroke)
            }
            current=[]
          }
          for(let k=0;k<=count;k++){
            const t=k/count,uvPoint=[first[0]+t*(last[0]-first[0]),first[1]+t*(last[1]-first[1])]
            const point=worldPointAtMaterialUv(triangleRange,snapshot.uv,world,uvPoint,offset)
            if(point)current.push(point);else finish()
          }
          finish()
        }
      }
      for (const [edge, indices] of Object.entries(panel.boundaries || {})) {
        if (indices.length < 2) continue
        const vertices = indices.filter(i => finiteVec(world[i])).map(i => v3(world[i]).add(offset))
        if (vertices.length < 2) continue
        const geometry = new THREE.BufferGeometry().setFromPoints(vertices)
        const outline = new THREE.Line(geometry, new THREE.LineBasicMaterial({color: '#566875', transparent: true, opacity: .76}))
        outline.userData = {panel: panel.id, edge}
        outline.userData.basePoints=vertices.map(value=>value.clone())
        boundaries.add(outline)
      }
      if (!piece) return
    })
    state.renderer.domElement.dataset.garmentGraphicCount=String(renderedGraphics)
    state.renderer.domElement.dataset.native3dPanelMeshCount = String(panelMeshes.size)
    // Keep precisely the Rust guide endpoints, with clear, unlit marks that
    // remain legible against the garment even at grazing camera angles.
    const dotGeometry = new THREE.SphereGeometry(.008, 8, 6)
    // Keep correspondence markers associated with their individual seam IDs.
    // In particular, hovering one edge must not reveal dots for every seam.
    const dotPositions = []
    const compiled=buildNativeSeam3DSelection20261025({...snapshot,positions:world})
    state.seamRelations=compiled.relations
    state.renderer.domElement.dataset.native3dSeamIssueCount=String(compiled.issues?.length||0)
    state.renderer.domElement.dataset.native3dSeamIssues=JSON.stringify((compiled.issues||[]).slice(0,64))
    ;(compiled.relations || []).forEach((relation, index) => {
      const colorIndex = index % SEAM_COLORS.length
      const source=relation.source,target=relation.target
      const seamDots=[]
      // Keep a bounded sample of every native sewing relationship in the 3D
      // scene. Hover and selection only change presentation; they never
      // modify the native solver's constraints or simulation state.
      const pairs=relation.guides
      const stride=Math.max(1,Math.ceil(pairs.length/32))
      pairs.forEach((pair, pairIndex) => {
        if(pairIndex!==0 && pairIndex!==pairs.length-1 && pairIndex%stride!==0)return
        const ends=[v3(pair.a).add(panelOffsets.get(source.panel)||new THREE.Vector3()),
          v3(pair.b).add(panelOffsets.get(target.panel)||new THREE.Vector3())]
        const guide=line(ends[0],ends[1],SEAM_COLORS[colorIndex],.55)
        guide.userData={kind:'sewing',seamId:relation.seamId,panel:source.panel,edge:source.edge,
          links:[source.panel,target.panel],basePoints:ends.map(point=>point.clone())}
        seams.add(guide)
        if (showSeams && showContactDots)
          seamDots.push({point:ends[0].clone(),panel:source.panel},{point:ends[1].clone(),panel:target.panel})
      })
      if(seamDots.length)dotPositions.push({seamId:relation.seamId,colorIndex,positions:seamDots})
    })
    dotPositions.forEach(({seamId,colorIndex,positions}) => {
      const mat=new THREE.MeshBasicMaterial({color:SEAM_COLORS[colorIndex],
        depthTest:false,depthWrite:false,toneMapped:false})
      const mesh = new THREE.InstancedMesh(dotGeometry.clone(), mat, positions.length)
      const dummy = new THREE.Object3D()
      positions.forEach(({point}, i) => {
        dummy.position.copy(point)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      })
      mesh.instanceMatrix.needsUpdate = true
      mesh.frustumCulled = false
      mesh.renderOrder = 85
      mesh.userData={markers:positions,seamId,colorIndex}
      mesh.visible=false
      dots.add(mesh)
    })
    state.markerCounts = SEAM_COLORS.map(()=>0)
    state.renderer.domElement.dataset.native3dSeamGuideCount=String(seams.children.length)
    state.renderer.domElement.dataset.native3dSewingRevision=String(snapshot.revision??'')
    setMarkerDiagnostics(state.renderer.domElement, state.markerCounts, false)
    dotGeometry.dispose()
    if (snapshot.avatar?.positions?.length && snapshot.avatar?.triangles?.length) {
      const bodyMesh=buildIndexedMesh(snapshot.avatar.positions, snapshot.avatar.triangles, '#555b64')
      bodyMesh.material.metalness=0;bodyMesh.material.roughness=.95
      if (bodyMesh.geometry.index.count > 0) avatar.add(bodyMesh)
      // Guides derive their extents from the displayed avatar mesh and never
      // participate in collision, picking, simulation or exported geometry.
      bodyMesh.geometry.computeBoundingBox()
      const bounds=bodyMesh.geometry.boundingBox
      if(bodyMesh.geometry.index.count > 0 && bounds && !bounds.isEmpty() && Number.isFinite(bounds.min.y) && bounds.max.y-bounds.min.y>1e-6) {
        const guideGroup=new THREE.Group()
        guideGroup.name='avatar-construction-guides'
        guideGroup.raycast=()=>{}
        const guideMaterial=new THREE.LineDashedMaterial({color:'#6ed9df',transparent:true,opacity:.85,depthTest:false,dashSize:.035,gapSize:.02})
        const addGuide=(points,name)=>{
          if(points.length<2)return
          const geometry=new THREE.BufferGeometry().setFromPoints(points)
          const stroke=new THREE.Line(geometry,guideMaterial)
          stroke.name=name
          stroke.computeLineDistances()
          stroke.renderOrder=120
          guideGroup.add(stroke)
        }
        const vertices=bodyMesh.geometry.attributes.position
        const positions=Array.from({length:vertices.count},(_,i)=>[vertices.getX(i),vertices.getY(i),vertices.getZ(i)])
        const indices=bodyMesh.geometry.index.array
        const triangles=Array.from({length:indices.length/3},(_,i)=>[indices[i*3],indices[i*3+1],indices[i*3+2]])
        for(const curve of avatarSurfaceConstructionCurves(positions,triangles))
          addGuide(curve.points.map(p=>new THREE.Vector3(p[0],p[1],p[2])),curve.name)
        guideGroup.visible=showConstructionGuides
        if(guideGroup.children.length)avatar.add(guideGroup)
      }
      state.renderer.domElement.dataset.avatarColor='#555b64'
    }
    avatar.visible = showAvatar && walkAvatarSource==='native'
    if(state.walkAvatarRoot)state.walkAvatarRoot.visible=showAvatar
    state.renderer.domElement.dataset.constructionGuidesVisible=String(showAvatar && showConstructionGuides && avatar.children.some(child=>child.name==='avatar-construction-guides'))
    state.renderer.domElement.dataset.avatarVisible = String(showAvatar && avatar.children.length > 0)
    boundaries.visible = sewingToolsActive
    seams.visible = showSeams && sewingToolsActive
    dots.visible = showSeams && sewingToolsActive && showContactDots
    state.renderer.domElement.dataset.fabricPresets=JSON.stringify([...panelMeshes.values()].map(m=>m.material.userData.fabricPreset))
    state.renderer.domElement.dataset.nativeFabricAppearances=JSON.stringify([...panelMeshes.values()].map(mesh=>{
      const back=mesh.children.find(child=>child.name==='native-cloth-back-face')?.material
      const edge=mesh.children.find(child=>child.name==='native-cloth-side-edge')
      const face=mat=>mat?{appearance:mat.userData.fabricAppearance||null,side:mat.side===THREE.FrontSide?'front':mat.side===THREE.BackSide?'back':'double',color:`#${mat.color.getHexString()}`,opacity:mat.opacity,roughness:mat.roughness??null,metalness:mat.metalness??null,reflectionIntensity:mat.envMapIntensity??null}:null
      return {panel:mesh.userData.panel,...face(mesh.material),front:face(mesh.material),back:face(back),side:face(edge?.material),sideEdgeCount:edge?.userData.edgeCount??0,sideThicknessMeters:edge?.userData.thicknessMeters??0}
    }))
    state.renderer.domElement.dataset.native3dInternalLineCount=String(authoredLines.children.length)
    state.renderer.domElement.dataset.nativeGrabActive=String(Boolean(snapshot.grabActive))
    state.renderer.domElement.dataset.simulationTime=String(snapshot.time)
    state.sceneSnapshot = snapshot
    // Solver snapshots refresh continuously while the user is choosing two points.
    // Preserve the first material point across deformation; only invalidate it
    // when the referenced panel is removed from the native snapshot.
    if(state.internalLinePoints?.length&&!panelMeshes.has(state.internalLinePoints[0].panel))state.clearInternalLine?.()
    const valid=new Set(world.map((vertex,index)=>finiteVec(vertex)?index:null).filter(index=>index!==null))
    for(const index of state.brushVertices)if(!valid.has(index))state.brushVertices.delete(index)
    state.updateBrushMarks?.()
  }, [snapshot, spread, grabRefresh, analysisMode, graphics, walkAvatarSource])

  // Visual draft meshes share the native scene, camera, lighting and render
  // loop. Their material-space vertices follow the current Rust cloth pose;
  // this intentionally does not create native sewing or collision constraints.
  useEffect(() => {
    const state=sceneRef.current
    if(!state)return
    replaceChildren(state.foamPaddingGroup)
    state.foamMeshes.clear()
    if(!snapshot || !Array.isArray(foamPads) || !foamPads.length){
      state.foamPress=null
      state.foamCompression.clear()
      state.renderer.domElement.dataset.nativeFoamPadCount='0'
      state.renderer.domElement.dataset.nativeFoamStitchGuideCount='0'
      return
    }
    const displayPositions=preDrapeDisplayPositions(snapshot)
    const visibleSnapshot=displayPositions===snapshot.positions?snapshot:{...snapshot,positions:displayPositions}
    const meshes=createSceneMeshes(visibleSnapshot,foamPads,state.panelOffsets)
    for(const mesh of meshes){
      // Mark overlays so native garment picking keeps selecting cloth panels.
      mesh.userData.foamPreview=true
      mesh.frustumCulled=false
      state.foamPaddingGroup.add(mesh)
      if(mesh.isMesh&&mesh.userData.foamPadId){
        state.foamMeshes.set(mesh.userData.foamPadId,mesh)
      }
    }
    for(const id of [...state.foamCompression.keys()])if(!state.foamMeshes.has(id)){
      state.foamCompression.delete(id)
      if(state.foamPress?.id===id){state.foamPress=null;state.controls.enabled=true}
    }
    state.renderer.domElement.dataset.nativeFoamPadCount=String(meshes.filter(mesh=>mesh.isMesh).length)
    // Diagnostic screen-space centers help verify that a foam mesh is both
    // attached to the native cloth and reachable by the pointer.
    state.camera.updateMatrixWorld()
    state.renderer.domElement.dataset.nativeFoamProjectedCenters=meshes.filter(mesh=>mesh.isMesh).map(mesh=>{
      mesh.geometry.computeBoundingSphere()
      const world=mesh.geometry.boundingSphere?.center?.clone()
      if(!world)return ''
      const clip=world.clone().project(state.camera)
      return [mesh.userData.foamPadId,Number(clip.x.toFixed(4)),Number(clip.y.toFixed(4)),Number(clip.z.toFixed(4))].join(',')
    }).join(';')
    state.renderer.domElement.dataset.nativeFoamStitchGuideCount=String(meshes.filter(mesh=>mesh.userData.foamStitchGuide).length)
    state.renderer.domElement.dataset.nativeFoamMode='cloth-uv-visual-guide'
    return()=>replaceChildren(state.foamPaddingGroup)
  },[snapshot,foamPads])

  // Native Rust stores the placement records. This overlay resolves each
  // licensed local GLB by catalog asset ID and attaches it to the actual
  // deformed cloth triangle, without adding unsupported rigid contact forces.
  useEffect(() => {
    const state=sceneRef.current
    if(!state)return undefined
    const known=hardwareRecordsRef.current
    const wanted=new Map((importedHardware||[]).filter(item=>item?.visible!==false&&item.glbUrl&&item.panel&&item.id).map(item=>[
      item.id,{item,signature:JSON.stringify([item.panel,item.glbUrl,item.x,item.y,item.widthMm,item.heightMm,item.depthMm,item.rotationDeg,item.liftMm,item.color,item.roughness,item.metalness,item.opacity])},
    ]))
    for(const [id,previous] of known){
      if(wanted.get(id)?.signature===previous.signature)continue
      previous.record?.dispose?.()
      known.delete(id)
    }
    for(const [id,{item,signature}] of wanted){
      if(known.has(id))continue
      const pending={signature,item,record:null,cancelled:false}
      known.set(id,pending)
      // Imported hardware follows the visible preview surface at time zero,
      // then the authoritative native solver mesh when simulation starts.
      // This keeps buttons and YKK pulls attached after the visual pre-drape.
      const current=hardwareSnapshotRef.current
      const displayed=current&&preDrapeDisplayPositions(current)
      const visible=current&&displayed!==current.positions?{...current,positions:displayed}:current
      createNativeImportedHardwareOverlay(item,visible,item.panel,state.panelOffsets.get(item.panel))
        .then(record=>{
          if(!record)return
          if(pending.cancelled||known.get(id)!==pending||sceneRef.current!==state){record.dispose();return}
          pending.record=record
          state.scene.add(record.object)
          state.renderer.domElement.dataset.nativeImportedHardwareCount=String([...known.values()].filter(row=>row.record).length)
        })
        .catch(error=>{if(known.get(id)===pending){known.delete(id);state.renderer.domElement.dataset.importedHardwareLoadError=String(error.message).slice(0,140)}})
    }
    state.renderer.domElement.dataset.nativeImportedHardwareExpected=String(wanted.size)
    return()=>{for(const [id,previous] of known){if(!wanted.has(id)){previous.cancelled=true;previous.record?.dispose?.();known.delete(id)}}}
  },[importedHardware])
  useEffect(()=>{
    const state=sceneRef.current
    if(!state||!snapshot)return
    const displayPositions=preDrapeDisplayPositions(snapshot)
    const visibleSnapshot=displayPositions!==snapshot.positions
      ? {...snapshot,positions:displayPositions}:snapshot
    for(const entry of hardwareRecordsRef.current.values()){
      if(!entry.record)continue
      if(entry.lastUv!==snapshot.uv){
        const updated=nativeHardwareAnchor(snapshot,entry.item.panel,entry.item)
        if(updated)entry.record.anchor=updated
        entry.lastUv=snapshot.uv
      }
      entry.record.update(visibleSnapshot,state.panelOffsets.get(entry.item.panel))
    }
  },[snapshot,spread,importedHardware])

  useEffect(() => {
    const state = sceneRef.current
    if (!state) return
    state.avatar.visible = showAvatar && walkAvatarSource==='native'
    if(state.walkAvatarRoot)state.walkAvatarRoot.visible=showAvatar
    state.renderer.domElement.dataset.avatarVisible = String(showAvatar && state.avatar.children.length > 0)
    state.boundaries.visible = sewingToolsActive
    state.seams.visible = showSeams && sewingToolsActive
    state.dots.visible = showSeams && sewingToolsActive && showContactDots
    const visibleMarkers=SEAM_COLORS.map(()=>0)
    for(const cloud of state.dots.children){
      const spec=snapshot?.template?.seams?.find(item=>item.id===cloud.userData.seamId)
      const sameEdge=Boolean(!active?.seamId&&active?.edge&&[spec?.a,spec?.b].some(side=>
        side?.panel===active.panel&&side.edge===active.edge))
      cloud.visible=state.dots.visible&&(selected?.seamId===cloud.userData.seamId||
        active?.seamId===cloud.userData.seamId||sameEdge)
      if(cloud.visible)visibleMarkers[cloud.userData.colorIndex]+=cloud.count
    }
    setMarkerDiagnostics(state.renderer.domElement, visibleMarkers, state.dots.visible)
    for (const mesh of state.panelMeshes.values()) {
      mesh.material.wireframe = wireframe
      for(const child of mesh.children)if(['native-cloth-back-face','native-cloth-side-edge'].includes(child.name))child.material.wireframe=wireframe
    }
    const currentPanel = selected?.panel
    for (const [id, mesh] of state.panelMeshes) {
      const hover = active?.panel === id
      // Preserve the fabric surface during linked selection; emissive supplies the highlight.
      mesh.material.emissive?.set(hover ? '#5a3111' : '#000000')
      mesh.material.emissiveIntensity = hover ? .24 : 0
      for(const child of mesh.children)if(['native-cloth-back-face','native-cloth-side-edge'].includes(child.name)){
        child.material.emissive?.set(hover ? '#5a3111' : '#000000')
        child.material.emissiveIntensity=hover?.24:0
      }
    }
    let highlightedEdges=0
    let highlightedSeamGuides=0
    for (const guide of state.seams.children) {
      const details=guide.userData
      const spec=snapshot?.template?.seams?.find(item=>item.id===details.seamId)
      const focused=Boolean(selected?.seamId&&selected.seamId===details.seamId)
      const hoverEdge=Boolean(!active?.seamId&&active?.edge&&[spec?.a,spec?.b].some(side=>
        side?.panel===active.panel&&side.edge===active.edge))
      const highlighted=focused||active?.seamId===details.seamId||hoverEdge
      guide.visible=state.seams.visible&&(seamEditing||highlighted)
      guide.material.color.set(highlighted?'#f07847':SEAM_COLORS[(snapshot?.template?.seams||[]).findIndex(item=>item.id===details.seamId)%SEAM_COLORS.length]||'#eb775e')
      guide.material.opacity=highlighted?1:.48
      guide.material.depthTest=!highlighted
      guide.renderOrder=highlighted?98:0
      if(highlighted)highlightedSeamGuides++
    }
    state.renderer.domElement.dataset.native3dSelectedSeamId=selected?.seamId||''
    state.renderer.domElement.dataset.native3dHoveredSeamId=active?.seamId||''
    state.renderer.domElement.dataset.native3dHighlightedSeamGuideCount=String(highlightedSeamGuides)
    for (const boundary of state.boundaries.children) {
      const highlighted = sewingToolsActive && !!active?.edge && boundary.userData.panel === active.panel && active.edge === boundary.userData.edge
      boundary.material.color.set(highlighted ? '#ff9b3d' : '#566875')
      boundary.material.opacity = highlighted ? 1 : .76
      boundary.renderOrder=highlighted?96:0
      boundary.material.depthTest=!highlighted
      if(highlighted)highlightedEdges++
    }
    state.renderer.domElement.dataset.sewingHoverEdge=sewingToolsActive&&active?.edge?`${active.panel}:${active.edge}`:''
    state.renderer.domElement.dataset.sewingHighlighted3dEdgeCount=String(highlightedEdges)
    replaceChildren(state.boxes)
    if (showBoundingBox && currentPanel && state.panelMeshes.has(currentPanel)) {
      const bounds = new THREE.Box3().setFromObject(state.panelMeshes.get(currentPanel))
      if (!bounds.isEmpty()) state.boxes.add(new THREE.Box3Helper(bounds, '#e99b50'))
    }
    const nativePanel = snapshot?.template?.panels?.find(panel => panel.id === currentPanel)
    if (nativePanel && ['move3d', 'rotate3d','transform'].includes(mode) && state.panelMeshes.has(currentPanel) && !state.dragging && !state.ringDrag && !state.move) {
      const bounds = new THREE.Box3().setFromObject(state.panelMeshes.get(currentPanel))
      bounds.getCenter(state.pivot.position)
      state.pivot.rotation.set(0, 0, 0)
      state.transform.setMode(mode === 'rotate3d' ? 'rotate' : 'translate')
      state.transform.attach(state.pivot)
      state.transform.visible = true
      state.transform.enabled = true
      state.ringEnabled=['move3d','rotate3d'].includes(mode)
    } else if (!state.dragging&&!state.ringDrag&&!state.move) {
      state.ringEnabled=false
      state.rings.visible=false
      state.transform.detach()
      state.transform.visible=false
      state.transform.enabled=false
      delete state.renderer.domElement.dataset.gizmoCenterX
      delete state.renderer.domElement.dataset.gizmoCenterY
      delete state.renderer.domElement.dataset.gizmoRingRadius
      state.renderer.domElement.dataset.gizmoVisible='false'
    }
  }, [snapshot, active?.panel, active?.edge, selected?.panel, selected?.seamId, mode, seamEditing, showAvatar, walkAvatarSource, showConstructionGuides,
    showSeams, sewingToolsActive, wireframe, showBoundingBox, showContactDots, spread, analysisMode])

  useEffect(()=>{if(mode!=='stretch3d')sceneRef.current?.cancelStretch?.()},[mode])
  useEffect(()=>{if(sceneRef.current)sceneRef.current.rotationHoverAxis=null;sceneRef.current?.updateToolCursor?.()},[mode,seamEditing])

  // A03 operates in native edit mode. A subsequent viewport mode change must
  // release the brush even when a caller omitted the explicit tool event.
  useEffect(()=>{
    if(mode!=='edit')sceneRef.current?.setBrushActive?.(false,true)
  },[mode])

  useEffect(()=>{
    const receive=event=>{
      if(event.type==='exo-clothcraft-command' && event.detail!=='fit-camera')return
      const state=sceneRef.current;if(!state)return
      const box=new THREE.Box3()
      // Visible Rust meshes include the authored spread and live panel transforms.
      // Camera fit should follow what the artist actually sees in this viewport.
      state.cloth.updateWorldMatrix(true,true)
      for(const mesh of state.panelMeshes.values())box.expandByObject(mesh)
      if(box.isEmpty())for(const p of propsRef.current.snapshot?.positions||[])if(finiteVec(p))box.expandByPoint(v3(p))
      if(box.isEmpty())return
      const center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3())
      const vertical=THREE.MathUtils.degToRad(state.camera.fov)/2
      const horizontal=Math.atan(Math.tan(vertical)*state.camera.aspect)
      const distance=(Math.max(size.y/(2*Math.tan(vertical)),size.x/(2*Math.tan(horizontal)))+size.z/2)*1.35
      if(state.camera.userData.exoSceneViewType==='orthographic'){
        // Distance alone cannot fit an orthographic camera: its projection
        // bounds must grow to include reset/off-body panels as well.
        state.camera.userData.exoSceneOrthoHalfHeight=Math.max(.1,size.y/2,size.x/(2*Math.max(.1,state.camera.aspect)))*1.35
        state.camera.updateProjectionMatrix()
      }
      const direction=state.camera.position.clone().sub(state.controls.target).normalize()
      if(direction.lengthSq()<1e-8)direction.set(0,0,1)
      state.controls.target.copy(center);state.camera.position.copy(center).addScaledVector(direction,Math.max(.15,distance))
      state.camera.lookAt(center)
      state.controls.update()
      state.renderer.domElement.dataset.cameraFitCount=String(1+Number(state.renderer.domElement.dataset.cameraFitCount||0))
    }
    window.addEventListener('exo-clothcraft-command',receive)
    window.addEventListener('exo-clothcraft-fit-camera',receive)
    return()=>{
      window.removeEventListener('exo-clothcraft-command',receive)
      window.removeEventListener('exo-clothcraft-fit-camera',receive)
    }
  },[])
  const view = (position,lookAt=[0,.96,0]) => {
    const state = sceneRef.current
    if (!state) return
    const target = new THREE.Vector3(...lookAt)
    state.controls.target.copy(target)
    state.camera.position.copy(target.clone().add(new THREE.Vector3(...position)))
    state.camera.lookAt(target)
    state.controls.update()
  }
  const frameGarment=()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-fit-camera'))
  const takeAnimationPhoto=()=>{
    const state=sceneRef.current
    const {renderer,scene,camera,controls}=state||{}
    const canvas=renderer?.domElement
    if(!canvas||!canvas.isConnected||canvas.width<2||canvas.height<2){
      setPhotoStatus('3D camera is not ready.');return
    }
    const helpers=[state.grid,state.boundaries,state.seams,state.dots,state.boxes,
      state.brushMarks,state.tapeMarks,state.internalLineMarks,state.authoredLines,state.rings,
      state.transform.getHelper()]
    const visible=helpers.map(item=>item.visible)
    try{
      // Render the current camera and animation pose, omitting editing guides.
      // Copy synchronously while the WebGL drawing buffer is still available.
      helpers.forEach(item=>{item.visible=false})
      controls.update()
      renderer.render(scene,camera)
      const photo=document.createElement('canvas')
      photo.width=canvas.width
      photo.height=canvas.height
      const context=photo.getContext('2d')
      if(!context)throw Error('Canvas capture unavailable')
      context.drawImage(canvas,0,0)
      const url=photo.toDataURL('image/png')
      const date=new Date()
      const timestamp=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('')
      const time=[date.getHours(),date.getMinutes(),date.getSeconds()].map(n=>String(n).padStart(2,'0')).join('')
      const stage=String(stageId||'studio').replace(/[^a-z0-9-]/gi,'_')
      const name=`EXO-Animation-${stage}-${timestamp}-${time}-frame-${String(Math.round(walkProgressRef.current*walkFrames)).padStart(4,'0')}.png`
      const download=document.createElement('a')
      download.href=url
      download.download=name
      document.body.appendChild(download)
      download.click()
      download.remove()
      setPhotoStatus(`PNG download started · ${photo.width} × ${photo.height}`)
    }catch(error){
      setPhotoStatus(`Photo capture failed: ${error?.message||'Unknown error'}`)
    }finally{
      helpers.forEach((item,index)=>{item.visible=visible[index]})
      renderer.render(scene,camera)
    }
  }
  const focusedSeam=seamEditing&&selected?.seamId
    ? snapshot?.template?.seams?.find(seam=>seam.id===selected.seamId):null
  const focusedGap=focusedSeam?snapshot?.seams?.find(seam=>seam.id===focusedSeam.id):null
  const selectedGapMm=Number.isFinite(focusedGap?.gap_m)&&focusedGap.gap_m>=0?focusedGap.gap_m*1000:null
  const selectedRmsGapMm=Number.isFinite(focusedGap?.rms_gap_m)&&focusedGap.rms_gap_m>=0?focusedGap.rms_gap_m*1000:null
  const provisionalSeamClose=selectedGapMm!==null&&selectedRmsGapMm!==null&&
    Number(snapshot?.time)>0&&selectedGapMm<=2&&selectedRmsGapMm<=2
  const authoredSeams=seamEditing?(snapshot?.template?.seams||[]).filter(seam=>
    seam?.id&&seam?.a?.panel&&seam?.a?.edge&&seam?.b?.panel&&seam?.b?.edge):[]
  return <div ref={host} className={`cc-scene ${animationWorkspaceActive?'cc-animation-workspace':''}`}
    style={{'--cc-animation-timeline-height':`${walkTimelineHeight}px`}}
    aria-label="EXO 3D garment scene: Rust geometry, interactive transform gizmo and sewing guides">
    <div className="cc-scene-render-surface"/>
    {authoredSeams.length>0&&showSeams&&<aside data-native-3d-sewing-link={focusedSeam?.id||''}
      data-native-3d-seam-gap-mm={selectedGapMm??'unavailable'}
      data-native-3d-seam-rms-mm={selectedRmsGapMm??'unavailable'}
      data-native-3d-closure-candidate={String(provisionalSeamClose)}
      aria-label="Linked 2D and 3D sewing relation" style={{position:'absolute',left:12,
        bottom:animationWorkspaceActive?'calc(var(--cc-animation-timeline-height) + 16px)':14,
        zIndex:4,maxWidth:270,padding:'9px 12px',borderRadius:6,
        background:'rgba(37,40,44,.91)',color:'#f0f1f2',fontSize:11,
        boxShadow:'0 3px 12px rgba(0,0,0,.18)'}}>
      <label style={{display:'block',fontWeight:600,marginBottom:5}}>3D SEWING · Native pair
        <select aria-label="Select linked seam in 3D" value={focusedSeam?.id||''}
          disabled={toolsDisabled} onChange={event=>{
            const seam=authoredSeams.find(item=>item.id===event.target.value)
            if(seam)onPick?.({kind:'sewing',seamId:seam.id,panel:seam.a.panel,edge:seam.a.edge})
          }} style={{display:'block',width:'100%',minWidth:170,marginTop:4,
            padding:'4px 5px',background:'#34383c',color:'#f0f1f2',border:'1px solid #64696d',borderRadius:4,fontSize:11}}>
          {!focusedSeam&&<option value="">Choose a seam</option>}
          {authoredSeams.map(seam=><option key={seam.id} value={seam.id}>{seam.id}</option>)}
        </select>
      </label>
      {focusedSeam?.a?.panel&&focusedSeam?.b?.panel&&<>
      <span style={{display:'block',opacity:.85}}>{focusedSeam.a.panel}/{focusedSeam.a.edge} ↔ {focusedSeam.b.panel}/{focusedSeam.b.edge}</span>
      <span style={{display:'block',marginTop:3}}>{selectedGapMm!==null
        ? `Maximum separation ${selectedGapMm.toFixed(2)} mm`:'Awaiting native 3D seam measurement'}</span>
      <span style={{display:'block',opacity:.85}}>{selectedRmsGapMm!==null
        ? `RMS separation ${selectedRmsGapMm.toFixed(2)} mm`:'RMS measurement unavailable'}</span>
      <span style={{display:'block',opacity:.75,marginTop:3}}>{provisionalSeamClose
        ? 'Within provisional 2 mm check · verify stable drape'
        : Number(snapshot?.time)>0?'Physical seam still under evaluation':'Start simulation to evaluate closure'}</span>
      </>}
      <span style={{display:'block',opacity:.68,marginTop:3}}>Linked 2D source · Fit unverified</span>
      <span style={{display:'block',opacity:.68,marginTop:3}}>Click again or Option-click to cycle overlaps</span>
    </aside>}
    {analysisMode==='strain'&&<div data-strain-legend="true" style={{position:'absolute',bottom:12,left:12,zIndex:3,background:'#fff',color:'#263746',padding:8,fontSize:11}}>Principal extension · blue 0% → red 25%+ · not stress/pressure</div>}
    <ClothCraftCornerTools dimension="3d" mode={mode} onChangeMode={onChangeMode} disabled={toolsDisabled} onCollapse3D={onCollapse3D}
      cameraHandControl={<span data-camera-hand-toolbar-fallback-slot="true"/>}/>
    <div className="cc-v2-orientation" role="group" aria-label="3D viewport orientation widget">
      {onToggle3DStudio&&<button type="button" className="cc-3d-studio-glass-arrow" aria-label={studio3DActive?'Return to main studio':'Open 3D Studio'} title={studio3DActive?'Return to main studio':'Open 3D Studio'} aria-pressed={studio3DActive} onClick={onToggle3DStudio}>{studio3DActive?'‹':'›'}</button>}
      <strong title="World orientation">XYZ</strong>
      <button type="button" aria-pressed={showConstructionGuides} onClick={()=>setShowConstructionGuides(value=>!value)} title="Toggle approximate avatar construction references: center front/back, chest, waist and navel">Guides</button>
      <button type="button" onClick={() => view([0, .05, 3.3])} title="Front camera: looking along Z">F</button>
      <button type="button" onClick={() => view([3.3, .05, 0])} title="Right camera: looking along X">R</button>
      <button type="button" onClick={() => view([0, 3.4, .02])} title="Top camera: looking down Y">T</button>
      <button type="button" onClick={() => view([2.4, .7, 3.1])} title="Perspective orbit camera">3D</button>
      {stageId==='EXO01'&&<>
        <button type="button" onClick={() => view([0,2.5,9.0],[0,1.5,-.7])} title="View the full Stage 01 runway and avatar" aria-label="View Stage 01 runway">S</button>
        <button type="button" onClick={() => view([2.5,1.1,4.5])} title="Frame avatar at the runway standing position" aria-label="Frame avatar on stage">A</button>
        <button type="button" onClick={frameGarment} title="Fit visible garment, including off-body or reset panels" aria-label="Fit garment on stage">G</button>
      </>}
    </div>
    {animationWorkspaceActive&&<section className="cc-walk-timeline" role="region" aria-label="Animation timeline">
      <div className="cc-animation-timeline-resizer" role="separator" aria-orientation="horizontal"
        aria-label="Resize Animation Editor timeline" aria-valuemin={165} aria-valuemax={520}
        aria-valuenow={walkTimelineHeight} aria-valuetext={`${walkTimelineHeight} pixels`}
        title="Drag up to expand the timeline · double-click to restore compact height"
        tabIndex={0} onPointerDown={startTimelineResize} onPointerMove={moveTimelineResize}
        onPointerUp={stopTimelineResize} onPointerCancel={stopTimelineResize}
        onLostPointerCapture={stopTimelineResize}
        onDoubleClick={()=>setWalkTimelineHeight(204)}
        onKeyDown={event=>{
          if(event.key==='ArrowUp'||event.key==='ArrowDown'){
            event.preventDefault()
            setWalkTimelineHeight(height=>clampTimelineHeight(height+(event.key==='ArrowUp'?20:-20)))
          }else if(event.key==='Home'){event.preventDefault();setWalkTimelineHeight(204)}
        }}><span/></div>
      <div className="cc-animation-timeline-heading">
        <strong>ANIMATION EDITOR</strong>
        <span>{stageId!=='none'?'STAGE '+stageId+' · ':''}AVATAR MOTION · KEYFRAMES</span>
        <button type="button" className="cc-animation-photo" aria-label="Take photo of current 3D set" title="Take a PNG photo from the current camera, without editing guides" onClick={takeAnimationPhoto}><Camera size={14}/> Take photo</button>
        <button type="button" aria-expanded={walkOptionsOpen} onClick={()=>setWalkOptionsOpen(open=>!open)}>{walkOptionsOpen?'Hide controls':'More controls'}</button>
      </div>
      {photoStatus&&<span className="cc-animation-photo-status" role="status">{photoStatus}</span>}
      <div className={`cc-animation-preset-toolbar ${walkOptionsOpen?'expanded':''}`}>
        <label>Avatar
          <select aria-label="Walk avatar model" value={walkAvatarSource} onChange={event=>{resetWalk();setWalkAvatarSource(event.target.value)}}>
            {WALK_AVATAR_SOURCES.map(avatar=><option key={avatar.id} value={avatar.id}>{avatar.label}</option>)}
          </select>
        </label>
        <label>Motion sequence
          <select aria-label="Walk motion sequence" value={walkSequenceId} onChange={event=>selectWalkSequence(event.target.value)}>
            {WALK_SEQUENCES.map(sequence=><option key={sequence.id} value={sequence.id}>{sequence.label}</option>)}
          </select>
        </label>
        {walkOptionsOpen&&<label>Walk style
          <select aria-label="Walk preset" value={walkPresetId} onChange={event=>{setWalkPresetId(event.target.value);resetWalk()}}>
            {WALK_PRESETS.map(preset=><option key={preset.id} value={preset.id}>{preset.label}</option>)}
          </select>
        </label>}
        {walkOptionsOpen&&<label>Direction
          <select aria-label="Walk direction" value={walkDirection} onChange={event=>setWalkDirection(event.target.value)}>
            <option value="forward">Toward audience</option><option value="backward">Toward backdrop</option>
          </select>
        </label>}
      </div>
      {walkAvatarError&&<span role="alert" className="cc-animation-error">{walkAvatarError}</span>}
      <div className="cc-animation-transport">
        <div className="cc-animation-play-actions">
          <button type="button" aria-label="Go to first animation frame" onClick={()=>seekWalkFrame(0)}>⏮</button>
          <button type="button" aria-label="Previous animation frame" onClick={()=>seekWalkFrame(Math.max(0,Math.round(walkProgressRef.current*walkFrames)-1))}>‹</button>
          <button className="cc-animation-play" type="button" aria-label={walkPlaying?'Pause walk animation':'Play walk animation'}
            onClick={()=>{if(walkProgressRef.current>=1)seekWalk(0);setWalkPlaying(v=>!v)}}
            disabled={!snapshot?.avatar?.positions?.length&&!snapshot?.positions?.length}>{walkPlaying?'Ⅱ Pause':'▶ Play'}</button>
          <button type="button" aria-label="Next animation frame" onClick={()=>seekWalkFrame(Math.min(walkFrames,Math.round(walkProgressRef.current*walkFrames)+1))}>›</button>
          <button type="button" aria-label="Go to last animation frame" onClick={()=>seekWalkFrame(walkFrames)}>⏭</button>
          <button type="button" aria-label="Reset walk animation" onClick={resetWalk}>↺</button>
        </div>
        <span className="cc-animation-frame-counter">FRAME <b>{String(Math.round(walkProgress*walkFrames)).padStart(4,'0')}</b> / {walkFrames} <small>· {walkDuration(walkPreviewRef.current).toFixed(2)}s</small></span>
        <label>FPS
          <select aria-label="Animation frame rate" value={walkFps} onChange={event=>setWalkFps(Number(event.target.value))}>
            {[24,30,60].map(fps=><option key={fps} value={fps}>{fps}</option>)}
          </select>
        </label>
        {walkOptionsOpen&&<label>Speed
          <input aria-label="Walk speed" type="number" min=".3" max="2" step=".1" value={walkSpeed} onChange={event=>setWalkSpeed(Math.max(.3,Math.min(2,Number(event.target.value)||1)))}/>
        </label>}
        {walkOptionsOpen&&<label>Distance (m)
          <input aria-label="Walk travel distance" type="number" min=".3" max="6" step=".1" value={walkDistance} onChange={event=>setWalkDistance(Math.max(.3,Math.min(6,Number(event.target.value)||1)))}/>
        </label>}
        <label className="cc-walk-loop"><input type="checkbox" checked={walkLoop} onChange={event=>setWalkLoop(event.target.checked)}/> Loop</label>
      </div>
      <div className="cc-animation-tracks" data-animation-tracks={currentWalkKeys.length}>
        <div className="cc-animation-track-label cc-animation-track-header">TRACKS / KEYFRAMES</div>
        <div className="cc-animation-ruler">
          <div className="cc-animation-ruler-ticks">{[0,.25,.5,.75,1].map(t=><span key={t}>{Math.round(t*walkFrames)}f</span>)}</div>
          <input aria-label="Walk timeline" type="range" min="0" max={walkFrames} step="1"
            value={Math.round(walkProgress*walkFrames)} onChange={event=>seekWalkFrame(Number(event.target.value))}/>
        </div>
        {[
          {id:'motion',label:'Avatar · Motion clips'},
          {id:'position',label:'Position Z · metres'},
          {id:'heading',label:'Heading Y · degrees'},
        ].map(track=><React.Fragment key={track.id}>
          <div className="cc-animation-track-label">{track.label}</div>
          <div className={`cc-animation-track-lane cc-animation-track-${track.id}`}
            onPointerDown={event=>{
              if(event.target!==event.currentTarget)return
              const bounds=event.currentTarget.getBoundingClientRect()
              seekWalkFrame(Math.round(Math.max(0,Math.min(1,(event.clientX-bounds.left)/bounds.width))*walkFrames))
            }}>
            {track.id==='motion'&&currentWalkKeys.slice(1).map((key,i)=>{
              const from=currentWalkKeys[i],turning=Math.abs(key.yaw-from.yaw)>1
              const travelling=Math.abs(key.z-from.z)>.001
              return <div className={`cc-animation-motion-clip ${turning?'is-turn':travelling?'is-walk':'is-hold'}`} key={key.id}
                style={{left:`${from.t*100}%`,width:`${Math.max(.1,(key.t-from.t)*100)}%`}}
                title={`${from.name} → ${key.name} · ${turning?'Turn':travelling?'Walk':'Hold'}`}>
                {turning?'TURN':travelling?'WALK':'HOLD'}
              </div>
            })}
            {track.id!=='motion'&&currentWalkKeys.map(key=><button key={key.id} type="button"
              className={`cc-animation-keyframe ${selectedWalkKey?.id===key.id?'selected':''}`}
              style={{left:`${key.t*100}%`}}
              title={`${key.name} · frame ${Math.round(key.t*walkFrames)} · ${track.id==='position'?(key.z*walkDistance).toFixed(2)+'m':key.yaw+'°'}`}
              aria-label={`Select ${track.id} keyframe ${key.name}`}
              onClick={()=>selectWalkKey(key)}
              onPointerDown={event=>beginWalkDrag(event,key)}
              onPointerMove={moveWalkDrag}
              onPointerUp={stopWalkDrag}
              onPointerCancel={stopWalkDrag}>◆</button>)}
            <div className="cc-animation-playhead" data-walk-playhead="true" style={{left:`${walkProgress*100}%`}}/>
          </div>
        </React.Fragment>)}
      </div>
      <div className="cc-animation-key-inspector">
        <strong>KEY</strong>
        <span>{selectedWalkKey?.name||'Select a key'}</span>
        {walkKeyEditorOpen&&<label>Frame <input aria-label="Selected keyframe frame" type="number" min="0" max={walkFrames}
          value={Math.round((selectedWalkKey?.t||0)*walkFrames)}
          disabled={selectedWalkKey?.id===currentWalkKeys[0].id||selectedWalkKey?.id===currentWalkKeys[currentWalkKeys.length-1].id}
          onChange={event=>updateWalkKey(selectedWalkKey.id,'t',Number(event.target.value)/walkFrames)}/></label>}
        {walkKeyEditorOpen&&<label>Position Z <input aria-label="Selected keyframe position" type="number" min="-12" max="12" step=".1"
          value={Number(((selectedWalkKey?.z||0)*walkDistance).toFixed(2))}
          onChange={event=>updateWalkKey(selectedWalkKey.id,'z',Number(event.target.value)/Math.max(.01,walkDistance))}/></label>}
        {walkKeyEditorOpen&&<label>Heading <input aria-label="Selected keyframe rotation" type="number" min="-720" max="720" step="5"
          value={selectedWalkKey?.yaw||0} onChange={event=>updateWalkKey(selectedWalkKey.id,'yaw',event.target.value)}/></label>}
        <button type="button" aria-expanded={walkKeyEditorOpen} onClick={()=>setWalkKeyEditorOpen(open=>!open)}>{walkKeyEditorOpen?'Done':'Edit values'}</button>
        <button type="button" onClick={insertWalkKey} aria-label="Add animation keyframe">+ Add key</button>
        <button type="button" onClick={removeWalkKey} aria-label="Remove selected animation keyframe"
          disabled={selectedWalkKey?.id===currentWalkKeys[0].id||selectedWalkKey?.id===currentWalkKeys[currentWalkKeys.length-1].id}>− Delete</button>
        {walkKeyEditorOpen&&<button type="button" onClick={()=>{setWalkSequenceEdits(old=>{const next={...old};delete next[walkSequenceId];return next});setWalkSelectedKeyId('start');resetWalk()}}
          aria-label="Restore motion preset keyframes">Restore preset</button>}
      </div>
    </section>}
  </div>
}
