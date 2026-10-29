import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { createTemplateProject } from '../data/templates.js'
import { garmentPreviewPage } from '../core/garmentPreviewPaging.js'
import { createGarmentPreviewTextile, garmentPreviewStudioColor } from '../core/garmentPreviewFabric.js'
import {
  addPatternThread,
  inwardOffsetEdge,
  makePanelGeometry,
} from '../core/garmentPreviewGeometry.js'
import { garmentThreeViewPose } from './garmentThreeViewPose.js'
import { buildCloGarmentSourcePreview, positionCloGarmentSourcePanels } from '../core/cloGarmentSourcePreview.js'
import { createAvatarWornTeeDisplay } from '../core/avatarWornTeeDisplay.js'
import './GarmentLibraryPreview.css'

// A reference grid is drawn on the actual sampled cut polygon. Each segment
// ends at the panel boundary, including at tapered shoulders and armholes.
function panelSection(points, axis, value) {
  const intersections = []
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i], b = points[(i + 1) % points.length]
    const delta = b[axis] - a[axis]
    if (Math.abs(delta) < 1e-7) continue
    const t = (value - a[axis]) / delta
    if (t >= 0 && t < 1) intersections.push(a[axis === 'x' ? 'y' : 'x'] + t * (b[axis === 'x' ? 'y' : 'x'] - a[axis === 'x' ? 'y' : 'x']))
  }
  intersections.sort((a, b) => a - b)
  if (intersections.length < 2) return null
  const first = intersections[0], last = intersections[intersections.length - 1]
  if (last - first < .3) return null
  const inset = Math.min(.45, (last - first) * .04)
  return axis === 'x'
    ? [{ x: value, y: first + inset }, { x: value, y: last - inset }]
    : [{ x: first + inset, y: value }, { x: last - inset, y: value }]
}

/** Static multi-angle arrangement of source pattern pieces, inspired by IMG_6936.
 * Curvature and placement are posed illustrations; no cloth dynamics are run here. */
export default function GarmentLibraryPreview({ name = 'Garment', templateId = 'tee' }) {
  const mount = useRef(null)
  const presentation = useRef(null)
  const [layers, setLayers] = useState({ style: true, sewing: true, edges: true })
  const [piecePage, setPiecePage] = useState(0)
  const [renderFailure, setRenderFailure] = useState(false)
  const [cloSource, setCloSource] = useState(null)
  // Show each of the seven curved source panels once on first open.
  const [sourceArrangement, setSourceArrangement] = useState('assembled')
  const project = useMemo(() => createTemplateProject(templateId), [templateId])
  const sourceAsset = project.cloReference?.previewAsset || null
  const mainFabric = project.fabrics?.main || {}
  useEffect(() => {
    if(!sourceAsset) return undefined
    const controller=new AbortController()
    fetch(sourceAsset,{signal:controller.signal})
      .then(response=>{if(!response.ok)throw new Error(`CLO garment preview ${response.status}`);return response.json()})
      .then(data=>{if(!controller.signal.aborted)setCloSource({asset:sourceAsset,data})})
      .catch(error=>{if(!controller.signal.aborted){console.error('CLO preview source loading failed',error);setCloSource({asset:sourceAsset,error:true})}})
    return ()=>controller.abort()
  }, [sourceAsset])
  // Do not retain another garment's pagination when the Library swaps assets.
  useEffect(() => {setPiecePage(0);setRenderFailure(false);setSourceArrangement('assembled')}, [templateId, sourceAsset])
  const previewPage = useMemo(() => garmentPreviewPage(project.pieces, piecePage), [project, piecePage])
  const { pieces } = previewPage
  const seamEdges = useMemo(() => {
    const result = new Map()
    for (const seam of project.seams || []) {
      for (const end of [seam.a, seam.b]) {
        if (!end?.pieceId || !Number.isInteger(end.edgeIndex)) continue
        if (!result.has(end.pieceId)) result.set(end.pieceId, new Set())
        result.get(end.pieceId).add(end.edgeIndex)
      }
    }
    return result
  }, [project])

  useEffect(() => {
    const host = mount.current
    if (!host) return undefined
    if(sourceAsset && cloSource?.asset !== sourceAsset) return undefined
    if(sourceAsset && !cloSource?.data){setRenderFailure(true);return undefined}
    const resources = []
    let renderer
    let observer
    try {
      const scene = new THREE.Scene()
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.12
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8))
      renderer.domElement.dataset.previewStatus = 'loading'
      renderer.domElement.dataset.previewTemplateId = templateId
      renderer.domElement.dataset.previewRenderMode = sourceAsset?'clo-source-three-instances':'reference-three-view-static'
      renderer.domElement.dataset.previewViewCount = '3'
      host.appendChild(renderer.domElement)
      const camera = new THREE.OrthographicCamera(-4, 4, 2, -2, .1, 80)
      const root = new THREE.Group()

      scene.add(new THREE.HemisphereLight(0xf6f8fc, 0x454852, 1.45))
      const softbox = new THREE.DirectionalLight(0xfff1e7, 2.5)
      softbox.position.set(-3.8, 5.5, 5.2)
      scene.add(softbox)
      const rim = new THREE.DirectionalLight(0xd7e6f5, 2.3)
      rim.position.set(3.6, 1.2, -4.3)
      scene.add(rim)
      const fill = new THREE.DirectionalLight(0xe4e9f2, .7)
      fill.position.set(4, -2.4, 3.1)
      scene.add(fill)

      const textile = createGarmentPreviewTextile(resources, mainFabric)
      const studioColor = garmentPreviewStudioColor(mainFabric.color)
      renderer.domElement.dataset.previewTextileFamily = textile.family
      renderer.domElement.dataset.previewTextileProvenance = 'procedural-estimated'
      renderer.domElement.dataset.previewOriginalFabricColor = studioColor.sourceColor || ''
      renderer.domElement.dataset.previewStudioColorLifted = String(studioColor.adjusted)
      const fabric = new THREE.MeshPhysicalMaterial({
        color: studioColor.color, map: textile.map, bumpMap: textile.bumpMap, bumpScale: .00045,
        metalness: 0, roughness: .84, sheen: .3, sheenRoughness: .82,
        clearcoat: 0, side: THREE.DoubleSide,
      })
      const lining = new THREE.MeshPhysicalMaterial({
        color: studioColor.color, map: textile.map, bumpMap: textile.bumpMap, bumpScale: .00045,
        metalness: 0, roughness: .95, side: THREE.DoubleSide,
      })
      const clothEdge = new THREE.MeshStandardMaterial({ color: '#777b7a', roughness: 1, side: THREE.DoubleSide })
      resources.push(fabric, lining, clothEdge)
      // Share each assigned textile across its panels and all three display
      // views. Resources are disposed by the existing preview teardown.
      const materialsByFabricId = new Map([['main', { face: fabric, back: lining }]])
      const materialForPiece = (piece) => {
        const assignedId = piece.fabricId || 'main'
        const fabricId = Object.prototype.hasOwnProperty.call(project.fabrics || {}, assignedId) ? assignedId : 'main'
        if (!materialsByFabricId.has(fabricId)) {
          const assigned = project.fabrics[fabricId]
          const weave = createGarmentPreviewTextile(resources, assigned)
          const swatch = garmentPreviewStudioColor(assigned.color)
          const face = new THREE.MeshPhysicalMaterial({
            color: swatch.color, map: weave.map, bumpMap: weave.bumpMap, bumpScale: .00045,
            metalness: 0, roughness: .84, sheen: .3, sheenRoughness: .82,
            clearcoat: 0, side: THREE.DoubleSide,
          })
          const back = face.clone()
          back.roughness = .95
          resources.push(face, back)
          materialsByFabricId.set(fabricId, { face, back })
        }
        const backPanel = piece.id === 'back' || /(?:^|-)back(?:$|-)/.test(piece.id)
        return { fabricId, material: materialsByFabricId.get(fabricId)[backPanel ? 'back' : 'face'] }
      }

      let meshCount = 0
      let triangleCount = 0
      let edgeCount = 0
      const panelTriangleCounts = new Map()
      const allLayers = []
      if(sourceAsset){
        const loaded=buildCloGarmentSourcePreview(root,cloSource.data,project,fabric,resources)
        meshCount=loaded.meshCount
        triangleCount=loaded.triangleCount
        edgeCount=loaded.edgeCount
        for(const [id,count] of loaded.byPieceTriangles)panelTriangleCounts.set(id,count)
        renderer.domElement.dataset.previewSourceVertexCount=String(loaded.sourceVertexCount)
        renderer.domElement.dataset.previewCloSewingPaths=String(loaded.sewingPathCount)
        renderer.domElement.dataset.previewSourceGeometry='official-clo-obj-export'
        renderer.domElement.dataset.previewFitCertified='false'
      } else pieces.forEach((piece, index) => {
        const pose = garmentThreeViewPose(piece, templateId, index, pieces.length)
        const panel = makePanelGeometry(piece, pose, resources)
        if (!panel) return
        // Collect each source piece as one unit, so the side diagram can omit
        // the far sleeve without removing individual lines or fabric finishes.
        const pieceGroup = new THREE.Group()
        pieceGroup.name = 'source-piece-' + piece.id
        pieceGroup.userData.sourcePieceId = piece.id
        root.add(pieceGroup)
        const assigned = materialForPiece(piece)
        const surface = new THREE.Mesh(panel.geometry, assigned.material)
        surface.name = piece.id + '-source-posed-panel'
        surface.userData.sourcePieceId = piece.id
        surface.userData.fabricId = assigned.fabricId
        surface.userData.isSurface = true
        surface.userData.presentationOnly = true
        pieceGroup.add(surface)
        const rimMesh = new THREE.Mesh(panel.edgeGeometry, clothEdge)
        rimMesh.userData.sourcePieceId = piece.id
        rimMesh.userData.presentationOnly = true
        pieceGroup.add(rimMesh)
        meshCount += 2
        triangleCount += panel.triangles
        panelTriangleCounts.set(piece.id, panel.triangles)
        edgeCount += piece.points.length

        // The stroke is tied directly to the sampled source cut boundary.
        addPatternThread(pieceGroup, [...panel.boundary.points, panel.boundary.points[0]], pose, resources, {
          color: '#7470c7', radius: .0035, layer: 'edges', lift: .019,
        })
        for (const edgeIndex of seamEdges.get(piece.id) || []) {
          addPatternThread(pieceGroup, inwardOffsetEdge(piece, edgeIndex, .55), pose, resources, {
            color: ['#f05b50', '#16c7df', '#2abf87', '#e64ea4'][edgeIndex % 4],
            radius: .0039, lift: .025, layer: 'sewing',
          })
        }
        // CLO-like orientation and seam guides. Cross sections are computed
        // against the real cut boundary; they are presentation guides rather
        // than simulated fabric stress measurements.
        const isBodyPanel = ['front', 'back', 'front-left', 'front-right'].includes(piece.id)
        if (isBodyPanel) {
          const boundary = panel.boundary.points
          const minY = Math.min(...boundary.map(p => p.y))
          const maxY = Math.max(...boundary.map(p => p.y))
          const minX = Math.min(...boundary.map(p => p.x))
          const maxX = Math.max(...boundary.map(p => p.x))
          for (const fraction of [.16, .48, .82]) {
            const section = panelSection(boundary, 'y', minY + (maxY - minY) * fraction)
            if (section) addPatternThread(pieceGroup, section, pose, resources, {
              color: '#8881e4', radius: .0038, lift: .029, layer: 'style',
            })
          }
          const centerline = panelSection(boundary, 'x', (minX + maxX) / 2)
          if (centerline) addPatternThread(pieceGroup, centerline, pose, resources, {
            color: '#8584ec', radius: .0041, lift: .03, layer: 'style',
          })
          // Narrow colored courses follow actual side-panel intersections,
          // so even unusual templates retain their authored silhouettes.
          for (const [fraction, color] of [[.13, '#e65a64'], [.19, '#26bed9'], [.81, '#2bbf91'], [.87, '#d85cb4']]) {
            const section = panelSection(boundary, 'x', minX + (maxX - minX) * fraction)
            if (section) addPatternThread(pieceGroup, section, pose, resources, {
              color, radius: .0032, lift: .027, layer: 'sewing',
            })
          }
        }
        // One/two row topstitches use each drafted edge number and actual offset.
        for (const stitch of piece.topstitches || []) {
          const count = Math.max(1, Math.min(8, stitch.rows || 1))
          for (let row = 0; row < count; row += 1) {
            const offset = Number(stitch.offsetCm || 0.7) + row * Number(stitch.rowGapCm || 0.45)
            addPatternThread(pieceGroup, inwardOffsetEdge(piece, stitch.edgeIndex, offset), pose, resources, {
              color: '#37bbab', radius: .004, lift: .025,
            })
          }
        }
        // Rib finish lies along the true neckline drafting edges on both torso panels.
        if (templateId === 'tee' && ['front', 'back'].includes(piece.id)) {
          for (const edgeIndex of [9, 10, 11]) {
            addPatternThread(pieceGroup, inwardOffsetEdge(piece, edgeIndex, .29), pose, resources, {
              color: '#db62b4', radius: .006, lift: .029, layer: 'style',
            })
          }
        }
        for (const line of piece.internalLines || []) {
          const points = line.points || line
          if (!Array.isArray(points) || points.length < 2) continue
          addPatternThread(pieceGroup, points, pose, resources, { color: '#a482e4', radius: .0035, layer: 'style' })
        }
      })
      renderer.domElement.dataset.previewFabricIds = sourceAsset ? 'main' : [...materialsByFabricId.keys()].join(',')
      // Three independent render instances share each original BufferGeometry.
      // Each shirt stays complete; yaw is anatomical, not an oblique camera approximation.
      const showcase = new THREE.Group()
      let cloneCount=0
      let removedSideSleeveTriangles=0
      if(sourceAsset){
        root.name='garment-front-view'
        const sourceViews=[root,root.clone(true),root.clone(true)]
        const names=['front','side','back']
        // CLO's positive-Z exported face is the back. Rotate the actual
        // instances so the front camera faces the physical garment front.
        const yaws=[0,Math.PI/2,Math.PI]
        sourceViews.forEach((shirt,index)=>{
          shirt.name=`garment-${names[index]}-view`
          shirt.position.x=(index-1)*2.65
          shirt.rotation.y=yaws[index]
          showcase.add(shirt)
        })
        // CLO exports the front/back as distinct, unsewn sheets. A rounded
        // neutral underlay makes the side profile legible without mutating the
        // sampled CLO meshes or pretending that the native cloth was solved.
        // A subtly shaped body profile: eased shoulder/chest, waist taper,
        // and a slightly rolled lower hem. Geometry belongs to presentation.
        const bodyRings=[[-1.065,.945],[-1.052,.99],[-1.025,1.015],[-.96,1.012],[-.81,.975],[-.59,.935],[-.40,.905],[-.18,.93],[.08,.99],[.32,1.055],[.52,1.09],[.64,1.06],[.735,.89],[.805,.60],[.835,.48]]
        const profile=[]
        for(const [y,r] of bodyRings)profile.push(new THREE.Vector2(r,y))
        const torsoUnderlay=new THREE.LatheGeometry(profile,40)
        torsoUnderlay.scale(.455,1,.29)
        resources.push(torsoUnderlay)
        const shell=new THREE.Mesh(torsoUnderlay,fabric)
        shell.name='render-only-curved-torso-underlay'
        shell.position.set(0,0,0)
        shell.userData.presentationOnly=true
        shell.userData.sourceGeometry='display-underlay'
        sourceViews[1].add(shell)
        // One continuous shoulder contour replaces the previous conical cap.
        // The lathe's upper rings taper smoothly into the attached neck band.
        const collarGeometry=new THREE.TorusGeometry(.145,.014,10,48)
        collarGeometry.rotateX(Math.PI/2)
        collarGeometry.scale(1,1,.92)
        resources.push(collarGeometry)
        const collar=new THREE.Mesh(collarGeometry,lining)
        collar.name='render-only-side-collar'
        collar.position.set(0,.823,0)
        collar.userData.presentationOnly=true
        sourceViews[1].add(collar)
        // CLO's front is local -Z. At exactly 90 degrees yaw this projects
        // toward screen left, so the upper arm falls slightly to the front.
        const upperArm=new THREE.Vector3(-.41,.615,-.07)
        const cuffCenter=new THREE.Vector3(-.59,.27,-.34)
        const sleeveAxis=new THREE.Vector3().subVectors(cuffCenter,upperArm)
        const sleeveGeometry=new THREE.CylinderGeometry(.225,.18,sleeveAxis.length(),40,4,true)
        resources.push(sleeveGeometry)
        const sideSleeve=new THREE.Mesh(sleeveGeometry,fabric)
        sideSleeve.name='render-only-side-sleeve'
        sideSleeve.position.copy(upperArm).add(cuffCenter).multiplyScalar(.5)
        sideSleeve.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),sleeveAxis.clone().normalize().negate())
        sideSleeve.userData.presentationOnly=true
        sourceViews[1].add(sideSleeve)
        const cuffGeometry=new THREE.TorusGeometry(.18,.004,8,40)
        cuffGeometry.rotateX(Math.PI/2)
        resources.push(cuffGeometry)
        const sleeveCuff=new THREE.Mesh(cuffGeometry,lining)
        sleeveCuff.name='render-only-side-cuff-seam'
        sleeveCuff.position.copy(cuffCenter)
        sleeveCuff.quaternion.copy(sideSleeve.quaternion)
        sleeveCuff.userData.presentationOnly=true
        // The ring is attached to the sleeve's actual end and remains
        // visible as a subtle short-sleeve cuff finish.
        sourceViews[1].add(sleeveCuff)
        cloneCount=2
        renderer.domElement.dataset.previewViews='front,side,back'
        renderer.domElement.dataset.previewSourcePanelCount=String(meshCount)
        renderer.domElement.dataset.previewRenderedPanelCount=String(meshCount*sourceViews.length)
        renderer.domElement.dataset.previewSharedGeometry='true'
        renderer.domElement.dataset.previewCurvedUnderlayCount='1'
        renderer.domElement.dataset.previewRenderedPieceIds=Array.from(root.children)
          .filter(group=>group.userData?.sourcePieceId).map(group=>group.userData.sourcePieceId).join(',')
      } else {
        const exactTeeView=['tee','avatar-worn-tee'].includes(templateId)
        if(exactTeeView){
          // Preserve every native source panel and its guides, including the
          // three-panel MakeHuman fixture whose front/back polygons already
          // incorporate the sleeves. Only the staged view is assembled.
          for(const piece of root.children)if(piece.userData.sourcePieceId)piece.visible=false
        }
        if(templateId==='avatar-worn-tee'){
          root.add(createAvatarWornTeeDisplay(project,{fabricMaterial:fabric,edgeMaterial:clothEdge,resources}))
          renderer.domElement.dataset.previewAssembly='avatar-worn-tee-source-derived-display'
          renderer.domElement.dataset.previewNativeSourcePanelIds=project.pieces.map(piece=>piece.id).join(',')
        } else if(exactTeeView){
          const display=new THREE.Group()
          display.name='render-only-assembled-tee'
          const torsoProfile=[[-1.04,.74],[-1.02,.76],[-.89,.75],[-.45,.70],[.12,.71],[.57,.78],[.78,.75],[.91,.56]]
          const shape=new THREE.LatheGeometry(torsoProfile.map(([y,r])=>new THREE.Vector2(r,y)),48)
          shape.scale(1,1,.55)
          resources.push(shape)
          display.add(new THREE.Mesh(shape,fabric))
          const shoulder=new THREE.CylinderGeometry(.55,.77,.23,40,1,true)
          shoulder.scale(1,1,.55)
          resources.push(shoulder)
          const shoulderMesh=new THREE.Mesh(shoulder,fabric)
          shoulderMesh.position.y=.77
          display.add(shoulderMesh)
          for(const side of [-1,1]){
            const sleeveGeo=new THREE.CylinderGeometry(.24,.31,.54,32,1,true)
            resources.push(sleeveGeo)
            const sleeve=new THREE.Mesh(sleeveGeo,fabric)
            sleeve.position.set(side*.88,.57,0)
            sleeve.rotation.z=side*.99
            display.add(sleeve)
            const cuffGeo=new THREE.TorusGeometry(.31,.009,6,32)
            resources.push(cuffGeo)
            const cuff=new THREE.Mesh(cuffGeo,clothEdge)
            cuff.rotation.x=Math.PI/2
            cuff.rotation.z=side*.99
            cuff.position.set(side*(.88+.27*Math.sin(.99)),.57-.27*Math.cos(.99),0)
            display.add(cuff)
          }
          const neckGeo=new THREE.TorusGeometry(.23,.018,10,40)
          neckGeo.rotateX(Math.PI/2)
          neckGeo.scale(1,1,.68)
          resources.push(neckGeo)
          const neck=new THREE.Mesh(neckGeo,lining)
          neck.position.set(0,.944,0)
          display.add(neck)
          root.add(display)
          renderer.domElement.dataset.previewAssembly='render-only-shirt-shell'
        }
        const frontView=root
        const sideView=root.clone(true)
        const backView=root.clone(true)
        cloneCount=2
        // Keep the existing three-angle study for the standard EXO templates.
        const farSleeve=!exactTeeView&&['hoodie','zip-hoodie'].includes(templateId)
          ?sideView.children.find(child=>child.userData.sourcePieceId==='sleeve-left'):null
        if(farSleeve){sideView.remove(farSleeve);removedSideSleeveTriangles=panelTriangleCounts.get('sleeve-left')||0}
        const layout=[
          {group:frontView,x:-2.5,yaw:0,name:'front'},
          {group:sideView,x:0,yaw:exactTeeView?Math.PI/2:-1.02,name:'side'},
          {group:backView,x:2.5,yaw:Math.PI,name:'back'},
        ]
        for(const view of layout){
          view.group.position.x=view.x
          view.group.rotation.y=view.yaw
          view.group.name='garment-'+view.name+'-view'
          showcase.add(view.group)
        }
        renderer.domElement.dataset.previewViews=layout.map(view=>view.name).join(',')
        if(exactTeeView){
          // Procedural T-shirt front faces +Z; unlike the imported CLO OBJ,
          // its native physical front is visible at yaw zero.
          renderer.domElement.dataset.previewCameraAngles=layout.map(view=>view.yaw.toFixed(6)).join(',')
        }
      }
      scene.add(showcase)
      renderer.domElement.dataset.previewCloneCount=String(cloneCount)
      renderer.domElement.dataset.previewMeshCount=String(sourceAsset?meshCount*3:meshCount*3-(removedSideSleeveTriangles?2:0))
      renderer.domElement.dataset.previewTriangleCount=String(sourceAsset?triangleCount*3:triangleCount*3-removedSideSleeveTriangles)
      renderer.domElement.dataset.previewSourceTriangleCount=String(triangleCount)
      renderer.domElement.dataset.previewSourcePieceCount = String(previewPage.total)
      renderer.domElement.dataset.previewDisplayedPieceCount = String(pieces.length)
      renderer.domElement.dataset.previewHiddenPieceCount = String(previewPage.total - pieces.length)
      renderer.domElement.dataset.previewInvalidPieceCount = String(previewPage.invalidCount)
      renderer.domElement.dataset.previewPage = String(previewPage.page + 1)
      renderer.domElement.dataset.previewPageCount = String(previewPage.pageCount)
      renderer.domElement.dataset.previewSourcePieceIds = pieces.map(piece => piece.id).join(',')
      renderer.domElement.dataset.previewSourceEdgeCount = String(edgeCount)
      renderer.domElement.dataset.previewGuideMode = sourceAsset?'clo-original-mesh-boundaries-and-stitch-paths':'source-polygon-cross-sections-illustrative'
      renderer.domElement.dataset.previewStatus = meshCount ? 'ready' : 'empty'
      const updateSourceView=(arrangement)=>{
        if(!sourceAsset)return
        for(const shirt of showcase.children)positionCloGarmentSourcePanels(shirt,arrangement)
        renderer.domElement.dataset.previewArrangement=arrangement
        renderer.domElement.dataset.previewCameraAngles='0,1.570796,3.141593'
      }
      const render = () => {
        const width = Math.max(1, host.clientWidth)
        const height = Math.max(1, host.clientHeight)
        if (renderer.domElement.width !== Math.round(width * renderer.getPixelRatio()) ||
            renderer.domElement.height !== Math.round(height * renderer.getPixelRatio())) {
          renderer.setSize(width, height)
        }
        const aspect = width / height
        const bounds=new THREE.Box3().setFromObject(showcase)
        const size=bounds.getSize(new THREE.Vector3())
        const center=bounds.getCenter(new THREE.Vector3())
        const halfHeight=sourceAsset
          ?Math.max(size.y*.66,size.x*.55/aspect,1.21)
          :Math.max(size.y*.60,size.x*.56/aspect,1.48)
        if(!sourceAsset){
          camera.left = -halfHeight * aspect
          camera.right = halfHeight * aspect
          camera.top = halfHeight
          camera.bottom = -halfHeight
          camera.updateProjectionMatrix()
          camera.position.set(center.x,center.y+.025,center.z+15)
          camera.lookAt(center)
        }
        if(sourceAsset){
          camera.left=-halfHeight*aspect
          camera.right=halfHeight*aspect
          camera.top=halfHeight
          camera.bottom=-halfHeight
          camera.updateProjectionMatrix()
        }
        camera.position.set(center.x,center.y+.025,center.z+15)
        camera.lookAt(center)
        renderer.render(scene,camera)
      }
      presentation.current = { render, updateSourceView, canvas: renderer.domElement, allLayers }
      showcase.traverse(node => { if (node.userData?.previewLayer) allLayers.push(node) })
      for (const node of allLayers) node.visible = layers[node.userData.previewLayer] !== false
      renderer.domElement.dataset.previewVisibleDetails = String(allLayers.filter(node => node.visible).length)
      // Apply the intended panel layout before the first visible frame and
      // before previewStatus='ready' can be observed by tests or consumers.
      updateSourceView(sourceArrangement)
      render()
      if(renderFailure)setRenderFailure(false)
      observer = new ResizeObserver(render)
      observer.observe(host)
    } catch (error) {
      console.error('Garment preview rendering failed', error)
      if (renderer?.domElement) renderer.domElement.dataset.previewStatus = 'failed'
      setRenderFailure(true)
    }
    return () => {
      observer?.disconnect()
      if (presentation.current?.canvas === renderer?.domElement) presentation.current = null
      if (renderer?.domElement.parentNode === host) host.removeChild(renderer.domElement)
      for (const resource of resources) resource.dispose()
      renderer?.dispose()
      renderer?.forceContextLoss()
    }
  }, [pieces, seamEdges, templateId, project, mainFabric, sourceAsset, cloSource])

  useEffect(()=>{
    const view=presentation.current
    if(!view||!sourceAsset)return
    view.updateSourceView(sourceArrangement)
    view.render()
  },[sourceAsset,cloSource,sourceArrangement])

  useEffect(() => {
    const view = presentation.current
    if (!view) return
    for (const node of view.allLayers) node.visible = layers[node.userData.previewLayer] !== false
    view.canvas.dataset.previewVisibleDetails = String(view.allLayers.filter(node => node.visible).length)
    view.render()
  }, [layers, project])

  return <div className="exo-garment-mini">
    <div className="exo-garment-mini-topline"><span className="exo-garment-mini-live" />{sourceAsset?'CLO 3D GARMENT PATTERNS':'3D PATTERN ARRANGEMENT'}<span>{sourceAsset?'THREE SOURCE INSTANCES':'SIMULTANEOUS VIEWS'}</span></div>
    <div className="exo-garment-mini-gallery">
      <div ref={mount} className="exo-garment-mini-canvas" role="img" data-template-id={templateId} data-piece-count={project.pieces?.length || 0} data-seam-count={project.seams?.length || 0} aria-label={sourceAsset?`${name}: three display instances, front, exact 90-degree side, and back, each containing seven original CLO source panels`:name + ': front, side and back views of gently curved sewing pattern panels in one fixed image'}>
        {renderFailure && <div className="exo-garment-mini-fallback" role="status">
          <strong>3D preview unavailable</strong>
          <span>{name} · {previewPage.total} drafted source pieces</span>
          <span>{pieces.map(piece=>piece.name || piece.id).join(' · ')}</span>
          <small>The original pattern remains available. Select its Library tile to open it in the workspace.</small>
        </div>}
      </div>
      <div className="exo-garment-mini-view-labels" aria-hidden="true"><span>01 · FRONT</span><span>02 · SIDE</span><span>03 · BACK</span></div>
    </div>
    {sourceAsset && <div className="exo-garment-mini-source-controls" aria-label="Garment preview controls">
      <button type="button" aria-pressed={sourceArrangement==='assembled'} onClick={()=>setSourceArrangement('assembled')}>CLO source placement · front / side / back</button>
      <button type="button" aria-pressed={sourceArrangement==='separated'} onClick={()=>setSourceArrangement('separated')}>Separated 7 pieces · 3 views</button>
    </div>}
    <div className="exo-garment-mini-caption">
      {previewPage.pageCount>1 ? `${previewPage.start+1}–${previewPage.end} OF ${previewPage.total}` : previewPage.total} SOURCE PANELS
      <span /> {sourceAsset?'23 CLO STITCH GROUPS':`${project.seams?.length || 0} SEAM LINKS`} <span /> {mainFabric.name || 'UNSPECIFIED FABRIC'} · {sourceAsset?'CLO MESH SNAPSHOT':'ILLUSTRATIVE LIGHT'}
    </div>
    {previewPage.pageCount>1 ? <div className="exo-garment-mini-pagination" role="group" aria-label="Preview source pattern pages">
      <button type="button" disabled={previewPage.page===0} onClick={()=>setPiecePage(p=>Math.max(0,p-1))} aria-label="Previous source panels">←</button>
      <span>GROUP {previewPage.page+1} / {previewPage.pageCount} · UNSEWN PATTERNS</span>
      <button type="button" disabled={previewPage.page===previewPage.pageCount-1} onClick={()=>setPiecePage(p=>Math.min(previewPage.pageCount-1,p+1))} aria-label="Next source panels">→</button>
    </div> : <div className="exo-garment-mini-note">{sourceAsset?'THREE DISPLAY COPIES · SEVEN SHARED SOURCE MESHES · UNSIMULATED':'CURVED SOURCE PATTERNS · FRONT / SIDE / BACK'}</div>}
    {!renderFailure && <div className="exo-garment-mini-switches">{(sourceAsset?[['sewing', 'CLO sewing guides'],['edges', 'Source cut edges']]:[['style', 'Style lines'], ['sewing', 'Sewing lines'], ['edges', 'Pattern edges']]).map(([key, label]) => <button key={key} type="button" aria-pressed={layers[key]} onClick={() => setLayers(current => ({ ...current, [key]: !current[key] }))}>{label}</button>)}</div>}
  </div>
}
