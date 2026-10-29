import {patternTiledPrint,nativeCutlineTiledPrint} from '../core/patternTiledPrint.js'
import {patternPrintReference} from '../core/patternPrintReference.js'
import {nativeGradePlan} from '../core/nativeGradePlan.js'
import {buildAccuMarkNativeGradeProposal20261023} from '../core/accumarkNativeGradeProposal20261023.js'
import {buildAccuMarkNativeMultiPanelNest20261023} from '../core/accumarkNativeMultiPanelNest20261023.js'
import {createAccuMarkNativeRuleSet,compileAccuMarkNativeRuleSizeRun} from '../core/accumarkNativePointRuleSet20261023.js'
import {createPortal} from 'react-dom'
import React,{useState,useEffect,useRef,useCallback,useMemo} from 'react'
import * as THREE from 'three'
import {OrbitControls} from 'three/addons/controls/OrbitControls.js'
import {TransformControls} from 'three/addons/controls/TransformControls.js'
import ClothCraftFabricLibrary from './ClothCraftFabricLibrary.jsx'
import ClothCraftGraphicEditor from './ClothCraftGraphicEditor.jsx'
import {normalizeGarmentGraphic} from '../core/nativeGarmentGraphics.js'
import {importedCloHardwareDimensions} from '../core/importedCloHardwareDimensions.js'
import {readNativeGraphics,saveNativeGraphics} from '../core/nativeGraphicStorage.js'
import ClothCraftSceneV2 from './ClothCraftSceneV2.jsx'
import PrintLayoutStudio from './PrintLayoutStudio.jsx'
import FoamMaterialPropertyEditor from './FoamMaterialPropertyEditor.jsx'
import {parseSvgPattern} from '../core/svgPatternImport.js'
import {safeFoamEdgeWidth} from './FoamPaddingNativeOverlay.jsx'
import CameraFabricHand from './CameraFabricHand.jsx'
import ClothCraftBoardV2 from './ClothCraftBoardV2.jsx'
import {buildSeamlyNativeCutCommand20261024} from '../core/seamlyNativeCutTransfer20261024.js'
import {convertNativeCutlineStudy20261024} from '../core/accumarkNativeCutRoomStudy20261024.js'
import AccuMarkProductionControls from './AccuMarkProductionControls.jsx'
import NativeVerifiedProductionOrder20261029 from './NativeVerifiedProductionOrder20261029.jsx'
import AccuMarkNativeGradePointInspector20261023 from './AccuMarkNativeGradePointInspector20261023.jsx'
import AccuMarkNativeRuleTableEditor20261023 from './AccuMarkNativeRuleTableEditor20261023.jsx'
import OptitexGradeToolbar20261027,{OPTITEX_GRADE_TOOLS_20261027} from './OptitexGradeToolbar20261027.jsx'
import ModarisF7SizeEvolution20261028 from './ModarisF7SizeEvolution20261028.jsx'
import NativeGradeSizeCorrespondenceStudio20261028 from './NativeGradeSizeCorrespondenceStudio20261028.jsx'
import {commitNativeGradeSizeCorrespondenceTransaction20261028} from '../core/nativeGradeSizeCorrespondenceTransaction20261028.js'
import {commitNativeGradeCanonicalSizeTransaction20261028} from '../core/nativeGradeCanonicalSizeTransaction20261028.js'
import {commitNativeGradeNamedSizePom20261028} from '../core/nativeGradeNamedSizePomCommit20261028.js'
import OptitexGradeTable20261027,{OPTITEX_GRADE_COLORS_20261027} from './OptitexGradeTable20261027.jsx'
import OptitexGradeBottomDock20261027 from './OptitexGradeBottomDock20261027.jsx'
import ExoBottomDockSplitControls20261027 from './ExoBottomDockSplitControls20261027.jsx'
import ExoGradingQuickToolbar20261028 from './ExoGradingQuickToolbar20261028.jsx'
import OptitexGradeNotchEditor20261027 from './OptitexGradeNotchEditor20261027.jsx'
import {planOptitexNativeGradeNotch20261027,verifyOptitexNativeGradeNotch20261027} from '../core/optitexNativeGradeNotch20261027.js'
import {applyOptitexGradeTool20261027} from '../core/optitexGradeTools20261027.js'
import AccuMarkNativeGradeQA20261023 from './AccuMarkNativeGradeQA20261023.jsx'
import NativeGradingQualityDashboard20261025 from './NativeGradingQualityDashboard20261025.jsx'
import NativeGradedFitEvidence20261025 from './NativeGradedFitEvidence20261025.jsx'
import NativeGradingPOMEditor20261025 from './NativeGradingPOMEditor20261025.jsx'
import NativeGradedPomAudit20261027 from './NativeGradedPomAudit20261027.jsx'
import NativeSixSizeIndustrialAudit20261027 from './NativeSixSizeIndustrialAudit20261027.jsx'
import NativeSixSizeSewingAudit20261027 from './NativeSixSizeSewingAudit20261027.jsx'
import NativeFacingCandidate20261027 from './NativeFacingCandidate20261027.jsx'
import GriceModaris2Dto3DReadiness20261027 from './GriceModaris2Dto3DReadiness20261027.jsx'
import Grice3DProductionVariant20261027 from './Grice3DProductionVariant20261027.jsx'
import ModarisIndustrialInterchangeStudio20261027 from './ModarisIndustrialInterchangeStudio20261027.jsx'
import ModarisCommandStudio20261027 from './ModarisCommandStudio20261027.jsx'
import ModarisDependencyStudio20261027 from './ModarisDependencyStudio20261027.jsx'
import ModarisProfessionalPanels20261027 from './ModarisProfessionalPanels20261027.jsx'
import ModarisCadHotkeyGuide20261027 from './ModarisCadHotkeyGuide20261027.jsx'
import ModarisGeometryNavigator20261027 from './ModarisGeometryNavigator20261027.jsx'
import ModarisRibbonWorkbench20261027 from './ModarisRibbonWorkbench20261027.jsx'
import ModarisPrecisionInspector20261027 from './ModarisPrecisionInspector20261027.jsx'
import {resolveModaris2DCommandCapabilities20261027} from '../core/modaris2DCommandCapabilities20261027.js'
import NativeSixSizeRegeneration20261027 from './NativeSixSizeRegeneration20261027.jsx'
import NativeGradingReleaseChecklist20261025 from './NativeGradingReleaseChecklist20261025.jsx'
import NativeGradeCatalogPersistence20261025 from './NativeGradeCatalogPersistence20261025.jsx'
import {prepareNativeGradeCatalog20261025,verifyNativeGradeCatalog20261025,recoverNativeGradeRules20261025} from '../core/nativeGradeCatalogBridge20261025.js'
import {inspectNativeGradingPOM20261025} from '../core/nativeGradingPOM20261025.js'
import {inspectNativeGradeAuthenticCutBundle20261026} from '../core/nativeGradeAuthenticCutBundle20261026.js'
import './NativeGradingStudio20261025.css'
import AccuMarkNativeUnifiedWorkflow20261024 from './AccuMarkNativeUnifiedWorkflow20261024.jsx'
import NativePatternAuditPanel from './NativePatternAuditPanel.jsx'
import NativePatternConstructionTools20261023 from './NativePatternConstructionTools20261023.jsx'
import {fingerprintNativePatternBindingsSource20261023} from '../core/nativePatternConstraintBindings20261023.js'
import {routeModarisNativeNumericalAnchor20261027} from '../core/modarisNativeAutomaticAnchor20261027.js'
import {witnessModarisNativeReferenceCommit20261027} from '../core/modarisNativeReferenceCommitWitness20261027.js'
import {verifyNativePerSizeChartStore20261027} from '../core/modarisNativePerSizeChartStoreWitness20261027.js'
import {verifyNativeSixSizePreview20261028,verifyNativeSixSizeCommit20261028} from '../core/nativeSixSizeCommandContract20261028.js'
import NativeCurveStationTool20261023 from './NativeCurveStationTool20261023.jsx'
import NativeDartPrecisionTool20261023 from './NativeDartPrecisionTool20261023.jsx'
import NativePhysicalPleatTool20261025 from './NativePhysicalPleatTool20261025.jsx'
import NativeConstructionGuides20261025 from './NativeConstructionGuides20261025.jsx'
import ClothCraftContextMenu from './ClothCraftContextMenu.jsx'
import {CloFloatingPanel} from './CloFinishingToolWidgets.jsx'
import NativeSewingGestureDock20261025 from './NativeSewingGestureDock20261025.jsx'
import NativeSeamEndpointEditor20261025 from './NativeSeamEndpointEditor20261025.jsx'
import {measureNativeSelection} from '../core/clothcraftSelectionMetrics.js'
import {nativeRustEdgeLength20261023} from '../core/nativeRustArcLengthCompat20261023.js'
import {inspectNativeSeamTrueing20261023} from '../core/nativeSeamTrueing20261023.js'
import {planNativeMatchedSeamNotches20261024} from '../core/nativeSeamMatchedNotch20261024.js'
import {preflightNativeSewing20261025} from '../core/nativeSewingPreflight20261025.js'
import {planNativeManySewing20261025,planNativeSymmetricSewing20261025} from '../core/nativeSewingBatchPlans20261025.js'
import {CLOTHCRAFT_FABRICS,presetProperties,validFabric} from '../core/clothcraftFabrics.js'
import {Scissors,Shirt,Layers,UserRound,Activity,Factory,Sun,FolderOpen,Save,Download,Undo2,Redo2,Play,Pause,RotateCcw,MousePointer2,PenTool,Move3D,Rotate3D,Search,Settings2,Eye,EyeOff,Grid2X2,Box,ChevronRight,FilePlus2,BookOpen,UploadCloud,LockKeyhole,UnlockKeyhole,SlidersHorizontal,Trash2,Maximize2,Minimize2,Spline,Ruler,ShieldCheck,FileDown} from 'lucide-react'
import './ClothCraftWorkspace.css'
import './ClothCraftToolDialogs.css'
import './ClothCraftExoShell.css'
import './ClothCraftPatternStudio.css'
import './ModarisProfessionalLayout20261027.css'
import './OptitexGradingPortal20261027.css'
import './ModarisCadUnifiedLibrary20261027.css'
import './ClothCraftTopGradingRibbon20261028.css'
import './ExoPatternCrystalGlass20261029.css'
// The signed Mac app always serves its UI on 5386 and its native Rust bridge
// on 5385. Resolve that pair at runtime: concurrent local builds can omit the
// VITE_* production variable, and must never send desktop commands to 5193.
const BASE=typeof window!=='undefined'&&window.location.port==='5486'
  ? 'http://127.0.0.1:5485'
  : typeof window!=='undefined'&&window.location.port==='5386'
    ? 'http://127.0.0.1:5385'
  : (import.meta.env.VITE_CLOTHCRAFT_BRIDGE_URL||'http://127.0.0.1:5193')
const COLORS=['#527e91','#d29465','#7a9e79','#a889b2','#c3ab5d','#76a5a4']
const EXO_SECTIONS=[['Pattern',Shirt],['Sewing',Scissors],['Fabric',Layers],['Avatar',UserRound],['Fit',Activity],['Production',Factory],['Render',Sun]]
const weighted=(weights,values)=>weights.reduce((p,[i,w])=>p.map((n,k)=>n+values[i][k]*w),values[0].map(()=>0))
function boardPoint(s,i){const range=s.panels.find(p=>i>=p.vertices[0]&&i<p.vertices[1]),p=s.template.panels.find(p=>p.id===range.id),a=(p.layout_rotation_degrees||0)*Math.PI/180,[u,v]=s.uv[i];return[range.layout[0]+u*Math.cos(a)-v*Math.sin(a),range.layout[1]+u*Math.sin(a)+v*Math.cos(a)]}
function Scene({snapshot,active,selected,mode,onPick,onHover,onPlace,showAvatar=true,showSeams=true,wireframe=false}){
 const host=useRef(),engine=useRef(),latest=useRef();latest.current={onPick,onHover,onPlace,selected}
 useEffect(()=>{
  const scene=new THREE.Scene();scene.background=new THREE.Color('#e6e7e5');
  const camera=new THREE.PerspectiveCamera(35,1,.01,100);camera.position.set(2,1.4,3)
  const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));host.current.appendChild(renderer.domElement)
  const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.95,0);controls.enableDamping=true
  scene.add(new THREE.HemisphereLight(0xffffff,0x77736e,2.2));const light=new THREE.DirectionalLight(0xffffff,2.5);light.position.set(2,4,3);scene.add(light)
  const grid=new THREE.GridHelper(4,40,0xb5b8b5,0xd0d2cf);scene.add(grid)
  const cloth=new THREE.Group(),body=new THREE.Group(),lines=new THREE.Group();scene.add(cloth,body,lines)
  const pivot=new THREE.Object3D();scene.add(pivot);const transform=new TransformControls(camera,renderer.domElement);scene.add(transform.getHelper());
  transform.addEventListener('dragging-changed',e=>{controls.enabled=!e.value})
  transform.addEventListener('mouseUp',()=>{if(latest.current.selected)latest.current.onPlace({kind:'Place',panel:latest.current.selected.panel,placement:{translation:pivot.position.toArray(),rotation_degrees:[pivot.rotation.x,pivot.rotation.y,pivot.rotation.z].map(n=>THREE.MathUtils.radToDeg(n))}})})
  const ray=new THREE.Raycaster();ray.params.Line.threshold=.008
  const hit=e=>{const r=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);const boundary=ray.intersectObjects(lines.children).find(h=>h.object.userData.edge);const surface=ray.intersectObjects(cloth.children)[0];if(boundary&&(!surface||boundary.distance<=surface.distance+.025))return boundary.object.userData;return surface?.object.userData||null}
  let down=null;const start=e=>{down=[e.clientX,e.clientY]},move=e=>latest.current.onHover(hit(e)),end=e=>{if(!transform.dragging&&down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<4)latest.current.onPick(hit(e));down=null}
  renderer.domElement.addEventListener('pointerdown',start);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',end)
  const resize=new ResizeObserver(()=>{const {width,height}=host.current.getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix()});resize.observe(host.current)
  let frame;const draw=()=>{controls.update();renderer.render(scene,camera);frame=requestAnimationFrame(draw)};draw();engine.current={cloth,body,lines,transform,pivot}
  return()=>{cancelAnimationFrame(frame);resize.disconnect();controls.dispose();transform.dispose();scene.traverse(o=>{o.geometry?.dispose();o.material?.dispose()});renderer.dispose();renderer.domElement.remove();engine.current=null}
 },[])
 useEffect(()=>{
  if(!snapshot||!engine.current)return
  const {cloth,body,lines}=engine.current
  const clear=g=>{for(const o of [...g.children]){o.geometry?.dispose();o.material?.dispose();g.remove(o)}}
  clear(cloth);clear(lines)
  const mesh=(positions,triangles,color)=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions.flat(),3));g.setIndex(triangles.flat());g.computeVertexNormals();return new THREE.Mesh(g,new THREE.MeshStandardMaterial({color,side:THREE.DoubleSide,roughness:.92}))}
  if(snapshot.avatar&&engine.current.avatarData!==snapshot.avatar){clear(body);body.add(mesh(snapshot.avatar.positions,snapshot.avatar.triangles,'#c5c0b7'));engine.current.avatarData=snapshot.avatar}
  snapshot.panels.forEach((p,i)=>{const m=mesh(snapshot.positions,snapshot.triangles.slice(...p.triangles),active?.panel===p.id?'#e4b66d':COLORS[i%COLORS.length]);m.userData={panel:p.id};cloth.add(m)
   for(const [edge,indices] of Object.entries(p.boundaries)){
    const selected=active?.panel===p.id&&(!active.edge||active.edge===edge)
    const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(indices.map(n=>new THREE.Vector3(...snapshot.positions[n]))),new THREE.LineBasicMaterial({color:selected?'#f2693d':'#43555a',depthTest:true}));l.userData={panel:p.id,edge};lines.add(l)
   }
  })
  snapshot.seams.forEach((seam,i)=>{const spec=snapshot.template.seams.find(s=>s.id===seam.id);const emphasized=active&&[spec.a,spec.b].some(b=>b.panel===active.panel&&(!active.edge||b.edge===active.edge));seam.guides.forEach((pair,j)=>{if(!emphasized&&j%4)return;const points=pair.map(w=>new THREE.Vector3(...weighted(w,snapshot.positions)));const l=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:emphasized?'#f2693d':COLORS[i%COLORS.length],transparent:true,opacity:emphasized?1:.35}));lines.add(l)})})
 },[snapshot,active?.panel,active?.edge])
 useEffect(()=>{const e=engine.current;if(!e)return;e.body.visible=showAvatar;e.lines.visible=showSeams;e.cloth.traverse(o=>{if(o.isMesh&&o.material)o.material.wireframe=wireframe})},[showAvatar,showSeams,wireframe,snapshot?.revision,active?.panel,active?.edge])
 useEffect(()=>{const e=engine.current;if(!e)return;const p=snapshot?.template.panels.find(p=>p.id===selected?.panel);if(p&&['move3d','rotate3d'].includes(mode)){e.pivot.position.fromArray(p.placement.translation);e.pivot.rotation.set(...p.placement.rotation_degrees.map(n=>THREE.MathUtils.degToRad(n)));e.transform.setMode(mode==='move3d'?'translate':'rotate');e.transform.attach(e.pivot)}else e.transform.detach()},[snapshot?.revision,selected?.panel,mode])
 return <div className="cc-scene" ref={host} aria-label="ClothCraft 3D garment and original mannequin"/>
}
function Board({s,active,pick,hover,edit,mode,busy,onPolygon}){
 const svg=useRef(),drag=useRef(),[view,setView]=useState([-0.15,-.15,2.4,1.9]),[draft,setDraft]=useState([])
 const point=e=>{const p=svg.current.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const n=p.matrixTransform(svg.current.getScreenCTM().inverse());return[n.x,n.y]}
 useEffect(()=>{
  if(mode!=='pen'&&mode!=='line')return
  const onKey=e=>{
   if(e.target?.closest?.('input,textarea,select,[contenteditable="true"]'))return
   if(e.key==='Escape'&&draft.length){e.preventDefault();e.stopImmediatePropagation();setDraft([])}
   if(e.key==='Enter'&&draft.length>=(mode==='line'?2:3)&&!busy){e.preventDefault();onPolygon(draft);setDraft([])}
  }
  window.addEventListener('keydown',onKey,true)
  return()=>window.removeEventListener('keydown',onKey,true)
 },[mode,draft,busy,onPolygon])
 const screen=(p,uv)=>{const a=(p.layout_rotation_degrees||0)*Math.PI/180,r=s.panels.find(r=>r.id===p.id);return[r.layout[0]+uv[0]*Math.cos(a)-uv[1]*Math.sin(a),r.layout[1]+uv[0]*Math.sin(a)+uv[1]*Math.cos(a)]}
 const start=(e,p,anchor)=>{if(busy||mode==='sew'||mode==='pen'||mode==='line'||e.button!==0)return;e.stopPropagation();svg.current.setPointerCapture(e.pointerId);drag.current={p,anchor,start:point(e)};pick({panel:p.id,...(typeof anchor==='number'?{anchor}:{})})}
 const up=e=>{const d=drag.current;drag.current=null;if(!d)return;const q=point(e),delta=q.map((n,i)=>n-d.start[i]);if(Math.hypot(...delta)<.002)return;if(d.pan){setView(v=>[v[0]-delta[0],v[1]-delta[1],v[2],v[3]]);return}const r=s.panels.find(p=>p.id===d.p.id);if(d.anchor!==undefined){const a=-(d.p.layout_rotation_degrees||0)*Math.PI/180;const local=[delta[0]*Math.cos(a)-delta[1]*Math.sin(a),delta[0]*Math.sin(a)+delta[1]*Math.cos(a)];if(typeof d.anchor==='string'){const [,edge,j]=d.anchor.split(':');const polygon=structuredClone(d.p.polygon);polygon.curves[edge][Number(j)]=polygon.curves[edge][Number(j)].map((n,i)=>n+local[i]);edit({kind:'Shape',panel:d.p.id,polygon})}else edit({kind:'Anchor',panel:d.p.id,anchor:d.anchor,position:d.p.polygon.points[d.anchor].map((n,i)=>n+local[i])})}else edit({kind:'BoardTransform',panel:d.p.id,origin:r.layout.map((n,i)=>n+delta[i]),rotation_degrees:d.p.layout_rotation_degrees||0})}
 return <div className="cc-board"><svg ref={svg} viewBox={view.join(' ')} onPointerUp={up} onContextMenu={e=>e.preventDefault()} onPointerDown={e=>{if((mode==='pen'||mode==='line')&&!busy){setDraft(p=>[...p,point(e)]);return}drag.current={pan:true,start:point(e)};svg.current.setPointerCapture(e.pointerId)}} onWheel={e=>{const factor=e.deltaY>0?1.1:.9;setView(v=>[v[0],v[1],v[2]*factor,v[3]*factor])}} aria-label="Linked metric 2D pattern board">
  <defs><pattern id="cc-grid" width=".05" height=".05" patternUnits="userSpaceOnUse"><path d="M .05 0 L 0 0 0 .05" fill="none" stroke="#dde0dc" strokeWidth=".001"/></pattern></defs><rect x="-50" y="-50" width="100" height="100" fill="url(#cc-grid)"/>
  {s.panels.map((r,i)=>{const p=s.template.panels.find(p=>p.id===r.id),selected=active?.panel===p.id;return <g key={p.id} onPointerEnter={()=>hover({panel:p.id})} onPointerLeave={()=>hover(null)}>
   <path data-panel={p.id} d={s.triangles.slice(...r.triangles).map(t=>'M'+t.map(n=>screen(p,s.uv[n]).join(',')).join('L')+'Z').join('')} fill={selected?'#f4deb7':COLORS[i%COLORS.length]} fillOpacity=".72" onPointerDown={e=>start(e,p)} onClick={e=>{e.stopPropagation();pick({panel:p.id})}}/>
   {Object.entries(r.boundaries).map(([edge,indices])=><polyline data-edge={`${p.id}:${edge}`} key={edge} points={indices.map(n=>screen(p,s.uv[n]).join(',')).join(' ')} fill="none" stroke={selected&&active.edge===edge?'#ef6339':'#374e57'} strokeWidth={selected&&active.edge===edge?'.009':'.003'} style={{cursor:'crosshair'}} onPointerDown={e=>e.stopPropagation()} onPointerEnter={e=>{e.stopPropagation();hover({panel:p.id,edge})}} onClick={e=>{e.stopPropagation();pick({panel:p.id,edge})}}/>)}
   <text x={r.layout[0]} y={r.layout[1]-.035} fontSize=".027" fill="#34454a">{p.name}</text>
   {selected&&mode==='edit'&&p.polygon?.points.map((uv,n)=>{const q=screen(p,uv);return <circle key={n} cx={q[0]} cy={q[1]} r=".009" fill="#fff" stroke="#f2693d" strokeWidth=".003" onPointerDown={e=>start(e,p,n)}/>})}
   {selected&&mode==='edit'&&Object.entries(p.polygon?.curves||{}).flatMap(([edge,controls])=>controls.map((uv,j)=>{const q=screen(p,uv),n=p.polygon.edges.indexOf(edge),anchor=screen(p,p.polygon.points[(n+j)%p.polygon.points.length]);return <g key={`${edge}-${j}`}><line x1={anchor[0]} y1={anchor[1]} x2={q[0]} y2={q[1]} stroke="#527e91" strokeWidth=".002"/><circle cx={q[0]} cy={q[1]} r=".008" fill="#527e91" stroke="white" strokeWidth=".002" onPointerDown={e=>start(e,p,`c:${edge}:${j}`)}/></g>}))}
  </g>})}
  {s.seams.flatMap((seam,i)=>{const spec=s.template.seams.find(s=>s.id===seam.id),em=active&&[spec.a,spec.b].some(b=>b.panel===active.panel&&(!active.edge||b.edge===active.edge));const uv=s.uv.map((_,i)=>boardPoint(s,i));return seam.guides.filter((_,j)=>em||j%4===0).map((pair,j)=>{const a=weighted(pair[0],uv),b=weighted(pair[1],uv);return <line key={`${i}-${j}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={em?'#ef6339':COLORS[i%COLORS.length]} strokeWidth={em?'.003':'.0015'} strokeDasharray=".01 .008" opacity={em?1:.35} pointerEvents="none"/>})})}
  {draft.length>0&&<polyline points={draft.map(p=>p.join(',')).join(' ')} fill="none" stroke="#ef6339" strokeWidth=".005" pointerEvents="none"/>}
 </svg></div>
}
export default function ClothCraftWorkspace({embedded=false,exoSection='Pattern',exoObjectTab='Scene',exoLayout='split',exoSplit=50,environmentPreset='studio',stageId='none',stageSettings=null,onRemoveStage, onCollapse3D, onTogglePatternStudio, patternStudioActive=false, onToggle3DStudio, onToggle3DStudioFullscreen, studio3DActive=false, studio3DFullscreenActive=false, animationWorkspaceActive=false, printLayoutActive=false, onExitPrintLayout, patternReferences=[], onUpdatePatternReferences=()=>{}, cameraSettings=null,sceneLight=null,sceneLight2=null,exposure=1.1,studioAppearance=null,studioPreferences=null,workspaceGrid=true,workspaceSeams=true}){
 const [s,setS]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[selected,setSelected]=useState(null),[hovered,setHovered]=useState(null),[mode,setMode]=useState('edit'),[pair,setPair]=useState([]),[reverse,setReverse]=useState(true),[ease,setEase]=useState(false),[sewingVariant,setSewingVariant]=useState('free'),[playing,setPlaying]=useState(false),[size,setSize]=useState([300,400]),[shape,setShape]=useState('rectangle'),[basePolygonOpen,setBasePolygonOpen]=useState(false),[fillPanelOpen,setFillPanelOpen]=useState(false),[fillPanelTarget,setFillPanelTarget]=useState(''),[fillFabricId,setFillFabricId]=useState(''),[gradeMode,setGradeMode]=useState(''),[gradePanelTarget,setGradePanelTarget]=useState(''),[gradeWidthDelta,setGradeWidthDelta]=useState(20),[gradeHeightDelta,setGradeHeightDelta]=useState(10),[gradeStep,setGradeStep]=useState(1),[gradeWidthStep,setGradeWidthStep]=useState('20'),[gradeHeightStep,setGradeHeightStep]=useState('10'),[walkOpen,setWalkOpen]=useState(false),[walkSeamId,setWalkSeamId]=useState(''),[walkFraction,setWalkFraction]=useState(0),[fullnessOpen,setFullnessOpen]=useState(false),[fullnessPanel,setFullnessPanel]=useState(''),[fullnessLine,setFullnessLine]=useState(''),[toolPanel,setToolPanel]=useState(''),[lineId,setLineId]=useState(''),[ruffleWidth,setRuffleWidth]=useState(60),[ruffleRatio,setRuffleRatio]=useState(1.5),[edgeLength,setEdgeLength]=useState(100),[ranges,setRanges]=useState([[0,1],[0,1]])
 const [showBoundingBox,setShowBoundingBox]=useState(false),[showContactDots,setShowContactDots]=useState(true),[showMeasurements,setShowMeasurements]=useState(true),[showSilhouette,setShowSilhouette]=useState(true)
 const [sewingGroupMode,setSewingGroupMode]=useState('single')
 const [manySewCount,setManySewCount]=useState(2)
 const [gradeNestAllBlocks,setGradeNestAllBlocks]=useState(true)
 const [gradeNestAllSizes,setGradeNestAllSizes]=useState(true)
 const [gradeNestShowPoints,setGradeNestShowPoints]=useState(true)
 const [gradeNestShowVectors,setGradeNestShowVectors]=useState(false)
 const [gradeNestSelectedSize,setGradeNestSelectedSize]=useState('L')
 const [gradeTableVisibleSizes,setGradeTableVisibleSizes]=useState(['XS','S','M','L','XL','XXL'])
 const [gradeTableColors,setGradeTableColors]=useState(()=>Object.fromEntries(
   ['XS','S','M','L','XL','XXL'].map((size,i)=>[size,OPTITEX_GRADE_COLORS_20261027[i]])))
 const [gradeStackPointIndex,setGradeStackPointIndex]=useState(null)
 const [optitexGradeMessage,setOptitexGradeMessage]=useState('')
 const [gradeBottomTableOpen,setGradeBottomTableOpen]=useState(false)
 const [gradeBottomCompareOpen,setGradeBottomCompareOpen]=useState(false)
 const [gradeQuickToolbarOpen,setGradeQuickToolbarOpen]=useState(false)
 // Track entry into the 2D workspace, not whether the toolbar was ever shown.
 // A once-per-mount flag left Grading Toolbar closed after the first visit.
 const gradeQuickToolbarWasIn2DRef=useRef(false)
 const [gradeQuickToolbarEmbedTarget,setGradeQuickToolbarEmbedTarget]=useState(null)
 const [gradeQuickToolbarEmbedRequest,setGradeQuickToolbarEmbedRequest]=useState(0)
 const [gradeDockHost,setGradeDockHost]=useState(null)
 const [gradeInnerDockHost,setGradeInnerDockHost]=useState(null)
 const [workspaceBottomDockPortal,setWorkspaceBottomDockPortal]=useState(null)
 useEffect(()=>{
  if(!embedded){setWorkspaceBottomDockPortal(null);return}
  const main=document.querySelector('.app-shell>.main-layout.clo-adjustable-panels')
  if(!main){setWorkspaceBottomDockPortal(null);return}
  let host=main.querySelector(':scope > .exo-global-grade-dock-host')
  if(!host){host=document.createElement('section');host.className='exo-grade-workspace-dock-host exo-global-grade-dock-host';host.dataset.exoGradeDockHost='true';host.dataset.exoDockEdge='bottom';host.setAttribute('aria-label','Full workspace bottom grading tables dock');host.innerHTML='<div class="exo-bottom-dock-rail" role="toolbar" aria-label="Full workspace bottom docking bar"><span class="exo-bottom-dock-handle" aria-hidden="true">⋮⋮</span><span class="exo-bottom-dock-instruction">Drag Grading Table or Compare Length here to dock below all panels</span></div>';main.appendChild(host)}
  setWorkspaceBottomDockPortal(host)
  return()=>{setWorkspaceBottomDockPortal(null);host.remove()}
 },[embedded])
 const [gradeTopDockHost,setGradeTopDockHost]=useState(null)
 const activeGradeDockHosts=[gradeDockHost,gradeInnerDockHost,gradeTopDockHost]
 useEffect(()=>{if(embedded&&workspaceBottomDockPortal)setGradeDockHost(workspaceBottomDockPortal)},[embedded,workspaceBottomDockPortal])
 // The bottom pane belongs to the 2D page, even when only a non-grading EXO
 // tool is embedded. Do not depend on the grading windows being open.
 useEffect(()=>{
   if(!activeGradeDockHosts.some(Boolean))return
   const sync=()=>{
     for(const host of activeGradeDockHosts){
       if(host)host.dataset.exoGradeDockOccupied=String(Boolean(
         host.querySelector('.exo-grade-bottom-widget--docked,.clo-floating-tool--docked')))
     }
   }
   const observer=new MutationObserver(sync)
   for(const host of activeGradeDockHosts)if(host)
     observer.observe(host,{childList:true,subtree:true,attributes:true,attributeFilter:['data-docked']})
   sync()
   return ()=>observer.disconnect()
 },[gradeDockHost,gradeInnerDockHost,gradeTopDockHost])
 const [gradeDockFooterInfoOpen,setGradeDockFooterInfoOpen]=useState(false)
 const [gradeNotchEditorOpen,setGradeNotchEditorOpen]=useState(false)
 const [gradeNestEnabled,setGradeNestEnabled]=useState(true)
 const [gradeNestPinned,setGradeNestPinned]=useState(false)
 useEffect(()=>{
  const send=()=>window.dispatchEvent(new CustomEvent('exo-native-nest-state',{detail:{visible:Boolean(gradeNestEnabled&&(gradeMode||gradeNestPinned))}}))
  window.addEventListener('exo-native-nest-state-request',send);send()
  return()=>window.removeEventListener('exo-native-nest-state-request',send)
 },[gradeNestEnabled,gradeMode,gradeNestPinned])

 const [gradeStudioTab,setGradeStudioTab]=useState('rules')
 const gradingScrollRef=useRef(null)
 const [nativeGradeRules,setNativeGradeRules]=useState(null)
 const nativeGradeRulesRef=useRef(null)
 const nativeGradeDraftHistory=useRef({undo:[],redo:[]})
 const [gradeDraftHistoryRevision,setGradeDraftHistoryRevision]=useState(0)
 const [nativePOMDefinitions,setNativePOMDefinitions]=useState([])
 const [selectedGradingPOMId,setSelectedGradingPOMId]=useState('')
 const [nativeGradeCatalogStatus,setNativeGradeCatalogStatus]=useState(null)
 const [nativeGradeCatalogMessage,setNativeGradeCatalogMessage]=useState('')
 const nativeGradeLastError=useRef('')
 const [nativeGradeRuleMessage,setNativeGradeRuleMessage]=useState('')
 const nativeRuleDraftKey=useMemo(()=>{
   if(!s?.template?.panels?.length)return null
   const available=createAccuMarkNativeRuleSet(s)
   return available.ok?`exo-native-grade-sidecar:${available.ruleSet.templateFingerprint}`:null
 },[s?.template])
 useEffect(()=>{
   const panels=s?.template?.panels||[]
   if(panels.length&&!panels.some(panel=>panel.id===gradePanelTarget))
     setGradePanelTarget(panels[0].id)
 },[s?.template?.panels,gradePanelTarget])
 useEffect(()=>{
   // A persisted catalog is bound to an exact authored source fingerprint.
   // Activation changes the displayed template temporarily, so preserve the
   // verified catalog through that reversible preview. A true source edit
   // invalidates the cached verification before another size can be opened.
   if(!s?.activeGradedSize)setNativeGradeCatalogStatus(previous=>
     previous?.templateFingerprint===nativeRuleDraftKey?.slice('exo-native-grade-sidecar:'.length)
       ?previous:null)
 },[nativeRuleDraftKey,s?.activeGradedSize])
 const nativePOMDraftKey=nativeRuleDraftKey?nativeRuleDraftKey.replace('grade-sidecar:','pom-sidecar:'):null
 useEffect(()=>setSelectedGradingPOMId(''),[nativePOMDraftKey])
 useEffect(()=>{
   setNativePOMDefinitions([])
   if(!nativePOMDraftKey)return
   try{
     const candidate=JSON.parse(localStorage.getItem(nativePOMDraftKey)||'null')
     if(Array.isArray(candidate)&&candidate.length<=64)setNativePOMDefinitions(candidate)
   }catch{}
 },[nativePOMDraftKey])
 const updateNativePOMDefinitions=next=>{
   if(!nativePOMDraftKey||!Array.isArray(next)||next.length>64||!s?.template)return
   const checked=inspectNativeGradingPOM20261025(s,nativeGradeRules,next,
     {allowNamedSizes:Array.isArray(nativeGradeRules?.sizes)&&
       JSON.stringify(nativeGradeRules.sizes)!==JSON.stringify(['XS','S','M','L','XL','XXL'])})
   if(checked.reason){setNativeGradeRuleMessage('POM not saved: '+checked.reason);return}
   setNativePOMDefinitions(next)
   // Target edits change the source-linked catalog comparison. Invalidate
   // the prior badge immediately until Rust reports a matching saved run.
   setNativeGradeCatalogStatus(null)
   setNativeGradeCatalogMessage('POM specifications changed. Recheck or save the native size catalog before activating a size.')
   try{localStorage.setItem(nativePOMDraftKey,JSON.stringify(next))}
   catch{setNativeGradeRuleMessage('POM updated in memory; local draft storage is unavailable.')}
 }
 // The native Rust project is the sole source of truth for persisted graded
 // sizes. A matching browser sidecar alone never marks a catalog as committed.
 const checkNativeGradeCatalog=async()=>{
   const snapshot=state.current
   if(!snapshot||!nativeGradeRules){setNativeGradeCatalogStatus(null);return null}
   const status=await request({op:'grade-run-status'})
   if(!status?.persistedInProject){setNativeGradeCatalogStatus(null);return null}
   const checked=verifyNativeGradeCatalog20261025(state.current,nativeGradeRules,status,
     {durablySaved:true,pomDefinitions:nativePOMDefinitions})
   setNativeGradeCatalogStatus(checked.ok?checked:null)
   return checked
 }
 const runNativeGradedPomAudit=async()=>{
   const source=state.current
   if(!source?.template||source.gradeRunPersisted!==true)
     throw Error('Save a six-size graded catalog containing physical POM targets in Rust first.')
   if(source.activeGradedSize||busy||playing||lock.current||running.current)
     throw Error('Restore the base garment and pause native editing before measuring six sizes.')
   const report=await request({op:'grade-run-pom-audit',revision:source.revision})
   if(!report||report.format!=='exo-native-grade-pom-audit.v1'||
      report.sourceRevision!==source.revision||state.current?.revision!==source.revision)
     throw Error('Six-size native measurement evidence is stale or incomplete. Rerun the audit.')
   return report
 }
 const runNativeSixSizeIndustrialAudit=async({sourceRevision,panelId})=>{
   const source=state.current
   if(!source?.template||source.revision!==sourceRevision||source.gradeRunPersisted!==true||
     source.activeGradedSize||busy||playing||lock.current||running.current)
     throw Error('Restore the saved six-size base garment and pause native editing before industrial inspection.')
   if(typeof panelId!=='string'||!source.template.panels?.some(panel=>panel.id===panelId))
     throw Error('Select one current native industrial piece before inspection.')
   const report=await request({op:'grade-run-industrial-audit',revision:sourceRevision,panel:panelId})
   if(!report||report.format!=='exo-native-linked-industrial-six-size-proof.v1'||
     report.sourceRevision!==sourceRevision||report.sourcePanelId!==panelId||
     report.manufacturerApproved!==false||report.factoryApproved!==false||
     state.current?.revision!==sourceRevision)
     throw Error('Native six-size industrial evidence is missing, incomplete or stale.')
   return report
 }
 const runNativeSixSizeSewingAudit=async({sourceRevision})=>{
   const source=state.current
   if(!source?.template||source.revision!==sourceRevision||source.gradeRunPersisted!==true||
     !source.template.seams?.length||source.activeGradedSize||busy||playing||lock.current||running.current)
     throw Error('Restore a source-revision-matched saved six-size sewn garment before native inspection.')
   const report=await request({op:'grade-run-sewing-balance-audit',revision:sourceRevision})
   if(!report||report.format!=='exo-native-six-size-sewn-balance-audit.v1'||
     report.sourceRevision!==sourceRevision||report.factoryApproved!==false||
     report.joinedCurveMutation!==false||state.current?.revision!==sourceRevision)
     throw Error('Native six-size seam audit is unavailable, stale or incompatible.')
   return report
 }
 const nativeSixSizeRegeneration=async({measurement,valueMm,overrides,sourceRevision},commit=false)=>{
   const source=state.current
   if(busy||playing||lock.current||running.current||
     !source?.template||source.revision!==sourceRevision||source.activeGradedSize||
     source.gradeRunPersisted!==true||source.nativePointBindings?.active!==true){
     throw Error('Restore a current base garment with active saved measurements and six graded sizes before regenerating.')
   }
   const changes=overrides??{[measurement]:valueMm}
   const stored=source.nativePointBindings?.measurements
   if(!changes||typeof changes!=='object'||Array.isArray(changes)||!stored||
     Object.keys(changes).length<1||Object.keys(changes).length>64||
     Object.entries(changes).some(([key,mm])=>{
       if(!/^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(key)||typeof mm!=='number'||!Number.isFinite(mm)||Math.abs(mm)>5000)return true
       const original=stored[key]
       const direct=typeof original==='number'?original:
         original&&typeof original==='object'&&!Object.hasOwn(original,'formula')&&typeof original.valueMm==='number'?original.valueMm:null
       return direct===null||!Number.isFinite(direct)||direct===mm
     }))throw Error('Stage 1–64 changed saved direct measurements with finite values in millimetres.')
   // Both dependency workbenches now execute the SAME Rust-owned two-stage
   // contract. Re-evaluate at commit time, because UI preview confirmation
   // can become stale while another native tool/worker edits the garment.
   const preview=await request({op:'bindings-grade-regenerate-preview',revision:sourceRevision,overrides:changes})
   const reviewed=verifyNativeSixSizePreview20261028(source,changes,preview)
   if(!reviewed.ok||state.current?.revision!==sourceRevision)
     throw Error(`Native six-size preview rejected or source changed: ${reviewed.reason||'stale revision'}`)
   if(!commit)return preview
   const result=await request({op:'bindings-grade-regenerate',revision:sourceRevision,overrides:changes})
   if(!result)throw Error('Native six-size regeneration was rejected without changing dependent geometry.')
   if(commit){
     const receipt=verifyNativeSixSizeCommit20261028(source,reviewed,result)
     if(!receipt.ok)throw Error(`Native grouped update may have committed but did not match its six-size Rust preview: ${receipt.reason}. Inspect or Undo before continuing.`)
     setNativeGradeCatalogStatus(null)
     setNativeGradeCatalogMessage('A shared measurement rebuilt source-linked geometry in all six sizes. Recheck the new Rust POM audit, seam balance, grading and release gates.')
     return {nativeSnapshot:result}
   }
 }
 const commitNativeGradeCatalog=async()=>{
   const before=state.current
   if(!before||!nativeGradeRules||busy||playing)return
   const saved=await request({op:'save'})
   if(!saved?.project){setNativeGradeCatalogMessage('Could not capture the native Rust source project.');return}
   if(state.current?.revision!==before.revision){
     setNativeGradeCatalogMessage('The garment changed during capture. Recheck grading.');return
   }
   const prepared=prepareNativeGradeCatalog20261025(before,saved.project,nativeGradeRules,
     {pomDefinitions:nativePOMDefinitions})
   if(!prepared.ok){setNativeGradeCatalogMessage('Native grading refused: '+prepared.reason);return}
   const result=await request({op:'grade-run-commit',revision:before.revision,gradeRun:prepared.gradeRun})
   if(!result?.gradeCatalogResult?.persisted){
     setNativeGradeCatalogMessage('Native catalog refused: '+(nativeGradeLastError.current||'Native durable save was not confirmed.'));return
   }
   const status=await request({op:'grade-run-status'})
   const verified=status?.persistedInProject?
     verifyNativeGradeCatalog20261025(state.current,nativeGradeRules,status,
       {durablySaved:true,pomDefinitions:nativePOMDefinitions}):null
   setNativeGradeCatalogStatus(verified?.ok?verified:null)
   setNativeGradeCatalogMessage(verified?.ok?
     `${nativeGradeRules.sizes.length} graded templates saved into the current native Rust project. 3D fit and graded CUT still require separate verification.`:
     'Native catalog saved, but its current rule comparison needs review.')
 }
 const inspectNativeF7Correspondence=async()=>{
   const before=state.current
   if(!before?.template||before.gradeRunPersisted!==true||before.activeGradedSize||
      busy||playing||running.current||lock.current)
     return {ok:false,reason:'Restore a saved, inactive native grade catalog and pause editing.'}
   const status=await request({op:'grade-run-status',revision:before.revision})
   if(!status?.persistedInProject||status.revision!==before.revision||
      status.sizeActivated!==false||!Array.isArray(status.catalog?.sizes)||
      JSON.stringify(status.catalog?.baseTemplate)!==JSON.stringify(before.template)||
      state.current?.revision!==before.revision)
     return {ok:false,reason:'Rust did not confirm the exact saved source and grading catalog.'}
   if(nativeGradeRules){
     const checked=verifyNativeGradeCatalog20261025(before,nativeGradeRules,status,
       {durablySaved:true,pomDefinitions:nativePOMDefinitions})
     if(!checked.ok)return {ok:false,reason:'Unsaved or mismatched local grade rules must be saved or recovered before native correspondence editing: '+checked.reason}
   }
   return {ok:true,revision:before.revision,sizes:[...status.catalog.sizes],
     aliases:{...(status.catalog.sizeCorrespondence||{})}}
 }
 const commitNativeF7Correspondence=async({expectedRevision,aliases})=>{
   const before=state.current
   if(!before||busy||playing||running.current||lock.current||
      before.revision!==expectedRevision)
     return {ok:false,reason:'Native source changed or is busy; inspect again.',nativeCommitted:false}
   // Never overwrite an uncommitted browser grading draft with metadata-only
   // Rust history. The saved native source remains authoritative.
   const preflight=await inspectNativeF7Correspondence()
   if(!preflight.ok)return {...preflight,nativeCommitted:false}
   const result=await commitNativeGradeSizeCorrespondenceTransaction20261028({
     snapshot:before,expectedRevision,aliases,request,
   })
   if(!result.ok){
     setNativeGradeCatalogStatus(null)
     setNativeGradeCatalogMessage(result.needsNativeRecovery?
       'Rust correspondence may have committed but the receipt failed. Inspect native Undo/history and recover the catalog; do not retry blindly.':
       'Native correspondence was rejected before confirmed commit: '+result.reason)
     return result
   }
   const recovered=recoverNativeGradeRules20261025(result.snapshot,result.status)
   if(recovered.ok&&commitNativeGradeRuleSet(recovered.ruleSet)){
     setNativeGradeCatalogStatus(recovered.catalog)
     setNativeGradeCatalogMessage(`${result.aliases} external size correspondences durably saved in Rust revision ${result.revision}; graded geometry unchanged. Factory release remains blocked.`)
   }else{
     setNativeGradeCatalogStatus(null)
     setNativeGradeCatalogMessage('Rust saved the correspondence, but the local grading draft was not recovered. Use Recover sizes from native project.')
   }
   return result
 }
 const clearNativeGradeCatalog=async()=>{
   if(!state.current||busy||playing)return
   const result=await request({op:'grade-run-clear'})
   if(!result?.gradeCatalogResult?.persisted)return
   setNativeGradeCatalogStatus(null)
   setNativeGradeCatalogMessage('Native graded catalog detached from the project; independent point rules are retained.')
 }
 const recoverNativeGradeCatalog=async()=>{
   if(!state.current||busy||playing)return
   const status=await request({op:'grade-run-status'})
   if(!status){setNativeGradeCatalogMessage('Native catalog could not be read.');return}
   const result=recoverNativeGradeRules20261025(state.current,status)
   if(!result.ok){setNativeGradeCatalogMessage('Recover refused: '+result.reason);return}
   commitNativeGradeRuleSet(result.ruleSet)
   const restoredPOM=inspectNativeGradingPOM20261025(state.current,result.ruleSet,result.pomSpecs,
     {allowNamedSizes:JSON.stringify(result.ruleSet.sizes)!==JSON.stringify(['XS','S','M','L','XL','XXL'])})
   if(!restoredPOM.reason&&nativePOMDraftKey){
     setNativePOMDefinitions(result.pomSpecs)
     try{localStorage.setItem(nativePOMDraftKey,JSON.stringify(result.pomSpecs))}catch{}
   }
   setNativeGradeCatalogStatus(result.catalog)
   setNativeGradeCatalogMessage(`Recovered ${result.ruleSet.sizes.length} editable point-rule tables from the saved Rust project. Factory approval remains blocked.`)
 }
 const activateSavedNativeGradeSize=async size=>{
   if(!state.current||busy||playing||!state.current.nativeGradeActivationSupported||!nativeGradeCatalogStatus?.persisted)return
   if(!nativeGradeRules?.sizes?.includes(size)&&!Object.hasOwn(nativeGradeRules?.sizeEvolution?.correspondences||{},size))return
   const result=await request({op:'grade-run-activate',revision:state.current.revision,size})
   if(result?.activeGradedSize===size){
     setGradeNestSelectedSize(size)
     setNativeGradeCatalogMessage(`Native ${size} is active in both 2D and 3D. The original source and all six saved grade templates remain preserved. Factory approval is blocked.`)
   }else setNativeGradeCatalogMessage('Size activation was not confirmed. The original saved garment is preserved.')
 }
 const restoreOriginalNativeGradeSize=async()=>{
   if(!state.current||busy||playing)return
   const result=await request({op:'grade-run-restore',revision:state.current.revision})
   if(result&&result.activeGradedSize==null){
     setNativeGradeCatalogMessage('Restored the exact original native garment and preserved the complete XS–XXL grade catalog.')
   }else setNativeGradeCatalogMessage('Original garment restoration was not confirmed.')
 }
 // Autosaved separate rule sidecars: never insert unknown fields into the
 // Rust FittingProject/Template/Polygon serde structs (deny_unknown_fields).
 useEffect(()=>{
   setNativeGradeRules(null)
   nativeGradeRulesRef.current=null
   nativeGradeDraftHistory.current={undo:[],redo:[]}
   setGradeDraftHistoryRevision(value=>value+1)
   setNativeGradeRuleMessage('')
   if(!nativeRuleDraftKey||!s?.template)return
   try{
     const stored=JSON.parse(localStorage.getItem(nativeRuleDraftKey)||'null')
     if(!stored)return
     const checked=compileAccuMarkNativeRuleSizeRun(s,stored,{
       selectedSize:stored.sizes?.includes('L')?'L':stored.baseSize,
     })
     if(!checked.ok)throw Error(checked.reason)
     setNativeGradeRules(stored)
    nativeGradeRulesRef.current=stored
     setNativeGradeRuleMessage('Recovered matching per-point grading draft from local workspace storage.')
   }catch(error){
     setNativeGradeRuleMessage('Stored grade draft not loaded: '+(error?.message||String(error)))
   }
 },[nativeRuleDraftKey])
 const commitNativeGradeRuleSet=next=>{
   if(!nativeRuleDraftKey||!next||!s?.template)return false
   const checked=compileAccuMarkNativeRuleSizeRun(s,next,{
     selectedSize:next.sizes?.includes(gradeNestSelectedSize)?gradeNestSelectedSize:next.baseSize,
   })
   if(!checked.ok){setNativeGradeRuleMessage('Grade rule edit blocked: '+checked.reason);return false}
   if(`exo-native-grade-sidecar:${next.templateFingerprint}`!==nativeRuleDraftKey){
     setNativeGradeRuleMessage('Grade rule source fingerprint changed. Re-import against the matching garment.')
     return false
   }
   if(nativeGradeRulesRef.current!==next){
     const history=nativeGradeDraftHistory.current
     history.undo=[...history.undo,nativeGradeRulesRef.current].slice(-40)
     history.redo=[]
     setGradeDraftHistoryRevision(value=>value+1)
   }
   nativeGradeRulesRef.current=next
   setNativeGradeRules(next)
   setNativeGradeCatalogStatus(null)
   setNativeGradeCatalogMessage('Grading point rules changed. Recheck or save the native size catalog before activating a size.')
   try{localStorage.setItem(nativeRuleDraftKey,JSON.stringify(next))
     setNativeGradeRuleMessage('Independent point rules saved to local draft storage. Export a JSON copy for your garment archive.')
   }catch{setNativeGradeRuleMessage('Updated in memory, but local draft storage unavailable. Export JSON now.')}
   setGradeNestPinned(true)
   setGradeNestEnabled(true)
   return true
 }
 const restoreNativeGradeDraft=direction=>{
   if(busy||playing||s?.activeGradedSize||!nativeRuleDraftKey||!s?.template)return false
   const history=nativeGradeDraftHistory.current
   const from=direction==='undo'?history.undo:history.redo
   const to=direction==='undo'?history.redo:history.undo
   if(!from.length)return false
   const next=from[from.length-1]
   if(next){
     const checked=compileAccuMarkNativeRuleSizeRun(s,next,{selectedSize:next.baseSize})
     if(!checked.ok||`exo-native-grade-sidecar:${next.templateFingerprint}`!==nativeRuleDraftKey){
       setNativeGradeRuleMessage(`Cannot ${direction} grading: the saved rules no longer match this native pattern.`)
       return false
     }
   }
   from.pop()
   to.push(nativeGradeRulesRef.current)
   nativeGradeRulesRef.current=next
   setNativeGradeRules(next)
   setGradeDraftHistoryRevision(value=>value+1)
   setNativeGradeCatalogStatus(null)
   setNativeGradeCatalogMessage(`Grading ${direction} applied to the draft and visible nest. Save the size catalog to Rust again after reviewing all sizes.`)
   try{if(next)localStorage.setItem(nativeRuleDraftKey,JSON.stringify(next))
     else localStorage.removeItem(nativeRuleDraftKey)}catch{}
   setGradeNestPinned(true)
   setGradeNestEnabled(true)
   return true
 }
 const clearNativeGradeRuleSet=()=>{
   if(nativeRuleDraftKey)try{localStorage.removeItem(nativeRuleDraftKey)}catch{}
   nativeGradeRulesRef.current=null
   nativeGradeDraftHistory.current={undo:[],redo:[]}
   setGradeDraftHistoryRevision(value=>value+1)
   setNativeGradeRules(null)
   setNativeGradeCatalogStatus(null)
   setNativeGradeCatalogMessage('Local grade draft cleared; reopen or recover the saved native catalog to verify its size rules.')
   setNativeGradeRuleMessage('Local point-rule sidecar cleared; Rust garment was not changed.')
 }
 const ensureNativeOptitexGradeRules=()=>{
   if(!s?.template||!s.template.panels?.length||busy||playing||s.activeGradedSize){
     return {ok:false,reason:'Open the native base pattern and pause simulation before grading.'}
   }
   if(nativeGradeRules){
     const checked=compileAccuMarkNativeRuleSizeRun(s,nativeGradeRules,{selectedSize:nativeGradeRules.baseSize})
     if(checked.ok)return {ok:true,ruleSet:nativeGradeRules,created:false}
     return {ok:false,reason:'The current grading draft no longer matches this native pattern. Restore or clear the stale draft before editing.'}
   }
   const created=createAccuMarkNativeRuleSet(s)
   if(!created.ok)return {ok:false,reason:created.reason}
   if(commitNativeGradeRuleSet(created.ruleSet)!==true)
     return {ok:false,reason:'A valid grading draft could not be saved against the current native source.'}
   setOptitexGradeMessage('Created validated XS–XXL grading rules for the actual native pattern. Edits remain drafts until saved to Rust.')
   return {ok:true,ruleSet:created.ruleSet,created:true}
 }
 const applyNativeOptitexGrading=(toolId,options={})=>{
   // The active table can target a different pattern piece than the last
   // opened Grading Studio inspector. Commit to the panel explicitly supplied
   // by the tool; never redirect its point edits to a stale inspector target.
   const targetPanelId=options.panelId||gradePanelTarget
   if(!s?.template?.panels?.some(panel=>panel.id===targetPanelId)){
     const reason='Select a valid native pattern panel before grading.'
     setOptitexGradeMessage(reason)
     return {ok:false,reason}
   }
   const prepared=ensureNativeOptitexGradeRules()
   if(!prepared.ok){setOptitexGradeMessage(prepared.reason);return prepared}
   const response=applyOptitexGradeTool20261027({
     snapshot:s,ruleSet:prepared.ruleSet,toolId,
     panelId:targetPanelId,pointIndex:options.pointIndex??0,
     targetPointIndex:options.targetPointIndex,
     sourcePointIndex:options.sourcePointIndex,
     referencePointIndex:options.referencePointIndex??options.targetPointIndex,
     size:options.selectedSize||options.size||gradeNestSelectedSize,
     axis:options.axis||'both',amountMm:options.amountMm,angleDeg:options.angleDeg,
     pointIndices:options.targetPointIndices?.length>0?
       [...new Set([options.pointIndex,...options.targetPointIndices])]:
       [...new Set([options.pointIndex,options.targetPointIndex])].filter(Number.isInteger),
     rectangle:options.rectangle,clipboard:options.clipboard,
   })
   if(!response.ok){setOptitexGradeMessage(`Grading rejected: ${response.reason}`);return response}
   // An operation is not complete until its source-fingerprint-matched draft
   // storage accepts it. Otherwise a toolbar click would incorrectly report
   // success while leaving all graded physical geometry unchanged.
   if(response.ruleSet&&commitNativeGradeRuleSet(response.ruleSet)!==true){
     const reason='The graded pattern changed before the proposed edit was saved; restore or recover the matching source rules and retry.'
     setOptitexGradeMessage(`Grading rejected: ${reason}`)
     return {ok:false,reason,nativeCommitted:false,manufacturingApproved:false}
   }
   if(response.view?.stackPointIndex!=null){
     setGradeStackPointIndex(prev=>prev===response.view.stackPointIndex?null:response.view.stackPointIndex)
     setGradeNestAllSizes(true)
   }
   if(response.view?.size){
     // Choosing a size highlights it; do not erase the professional full
     // multi-size outline/point nest. Single-size isolation belongs to an
     // explicit visibility control, never an ordinary grade operation.
     setGradeNestSelectedSize(response.view.size)
     setGradeNestAllSizes(true)
     setGradeTableVisibleSizes(pre=>[...new Set([...pre,response.view.size])])
   }
   // Source-point transforms edit the active point. An unrelated target
   // selector must not silently change the inspector/table selection.
   if(toolId.startsWith('paste-')&&response.selectedPointIndex!=null&&
     response.selectedPointIndex!==options.pointIndex)
     setSelected({panel:targetPanelId,anchor:response.selectedPointIndex})
   setOptitexGradeMessage(response.notice||'Independent grading sidecar checked; native Rust catalog needs explicit commit.')
   return response
 }
 useEffect(()=>{if(embedded)setShowSeams(workspaceSeams)},[embedded,workspaceSeams])
 const [segmentCommitting,setSegmentCommitting]=useState(false)
 const [seamEditing,setSeamEditing]=useState(false)
 const segmentPendingRef=useRef(null)
 const groupSewPendingRef=useRef([])
 const [freeSewPoints,setFreeSewPoints]=useState([])
 const freeSewPendingRef=useRef([])
 const [section,setSection]=useState('Pattern'),[libraryTab,setLibraryTab]=useState('Pieces'),[filter,setFilter]=useState(''),[showAvatar,setShowAvatar]=useState(true),[showSeams,setShowSeams]=useState(true),[wireframe,setWireframe]=useState(false),[layout,setLayout]=useState('split'),[libraryOpen,setLibraryOpen]=useState(true),[inspectorOpen,setInspectorOpen]=useState(true)
 const [standalone3DFullscreen,setStandalone3DFullscreen]=useState(false)
 const standalone3DReturnLayout=useRef('split')
 const standalone3DFullscreenReturnLayout=useRef('split')
 const standalone3DOwnsFullscreen=useRef(false)
 const exitStandalone3DStudio=()=>{
  setStandalone3DFullscreen(false)
  setLayout(standalone3DFullscreenReturnLayout.current)
  if(document.fullscreenElement===document.documentElement)document.exitFullscreen?.().catch(()=>{})
  standalone3DOwnsFullscreen.current=false
 }
 const toggleStandalone3DStudio=()=>{
  if(standalone3DFullscreen){exitStandalone3DStudio();setLayout(standalone3DReturnLayout.current)}
  else if(layout==='3d')setLayout(standalone3DReturnLayout.current==='3d'?'split':standalone3DReturnLayout.current)
  else{standalone3DReturnLayout.current=layout==='2d'?'split':layout;setLayout('3d')}
 }
 const toggleStandalone3DStudioFullscreen=()=>{
  if(standalone3DFullscreen)exitStandalone3DStudio()
  else{
   standalone3DFullscreenReturnLayout.current=layout
   setStandalone3DFullscreen(true)
   setLayout('3d')
   if(!document.fullscreenElement)document.documentElement.requestFullscreen?.().then(()=>{
    standalone3DOwnsFullscreen.current=document.fullscreenElement===document.documentElement
   }).catch(()=>{})
  }
 }
 useEffect(()=>{
  if(!standalone3DFullscreen)return
  const onFullscreenChange=()=>{if(!document.fullscreenElement&&standalone3DOwnsFullscreen.current)exitStandalone3DStudio()}
  const onEscape=event=>{if(event.key==='Escape'&&!document.fullscreenElement&&!event.defaultPrevented){event.preventDefault();exitStandalone3DStudio()}}
  document.addEventListener('fullscreenchange',onFullscreenChange)
  window.addEventListener('keydown',onEscape)
  return()=>{document.removeEventListener('fullscreenchange',onFullscreenChange);window.removeEventListener('keydown',onEscape)}
 },[standalone3DFullscreen])
 const [patternFocus,setPatternFocus]=useState(false)
 const [modaris2DOpen,setModaris2DOpen]=useState(false)
 const [modaris2DTab,setModaris2DTab]=useState('tools')
 const [modaris2DSideTab,setModaris2DSideTab]=useState('inspector')
 const [cadInspectorCollapsed,setCadInspectorCollapsed]=useState(()=>{
   if(embedded&&exoLayout==='2d')return true
   try{return localStorage.getItem('exo.nativeCadInspectorCollapsed.v1')==='true'}catch{return false}
 })
 const previousFull2D=useRef(false)
 useEffect(()=>{
   const in2D=Boolean(embedded&&(patternFocus||exoLayout==='2d'))
   if(in2D&&!previousFull2D.current)setCadInspectorCollapsed(true)
   previousFull2D.current=in2D
 },[embedded,patternFocus,exoLayout])
 useEffect(()=>{
   try{localStorage.setItem('exo.nativeCadInspectorCollapsed.v1',String(cadInspectorCollapsed))}catch{}
 },[cadInspectorCollapsed])
 const [modarisPatternGroup,setModarisPatternGroup]=useState('editing')
 const enterPatternFocus=()=>{
  setLibraryOpen(false)
  if(embedded){
   // Use the shared EXO layout instead of overlaying a second interface that
   // obscures the existing 2D toolbar, object browser, and property editor.
   onCollapse3D?.()
   window.dispatchEvent(new CustomEvent('exo-clothcraft-focus-grading-workspace'))
   return
  }
  if(!embedded)setSection('Production')
  setPatternFocus(true)
  // Fullscreen the document, not a nested canvas: grading and sewing dialogs
  // are portaled to document.body and must remain reachable while editing.
  if(!document.fullscreenElement)document.documentElement.requestFullscreen?.().catch(()=>{})
 }
 const exitPatternFocus=()=>{
  setPatternFocus(false)
  if(document.fullscreenElement===document.documentElement)document.exitFullscreen?.().catch(()=>{})
 }
 useEffect(()=>{
  if(!patternFocus)return
  const onFullscreenChange=()=>{if(!document.fullscreenElement)setPatternFocus(false)}
  const onEscape=event=>{
   if(event.key==='Escape'&&!gradeMode&&!document.fullscreenElement&&!event.defaultPrevented){
    event.preventDefault();setPatternFocus(false)
   }
  }
  document.addEventListener('fullscreenchange',onFullscreenChange)
  window.addEventListener('keydown',onEscape)
  return()=>{document.removeEventListener('fullscreenchange',onFullscreenChange);window.removeEventListener('keydown',onEscape)}
 },[patternFocus,gradeMode])
 const [patternAudit,setPatternAudit]=useState(null)
 const [cutlineProof,setCutlineProof]=useState(null)
 const [analysisMode,setAnalysisMode]=useState('surface')
 const [foamOpen,setFoamOpen]=useState(false)
 const [selectedFoamId,setSelectedFoamId]=useState(null)
 const [nativeFoamPads,setNativeFoamPads]=useState([])
 const [foamMessage,setFoamMessage]=useState('')
 const foamFileInput=useRef(null)
 const foamLoadedKey=useRef(null)
 const foamProjectKey=s?.template?.id||s?.template?.name||null
 useEffect(()=>{
  foamLoadedKey.current=null
  setSelectedFoamId(null)
  if(!foamProjectKey){setNativeFoamPads([]);return}
  try{
   const saved=JSON.parse(localStorage.getItem(`exo-v2-native-foam:${foamProjectKey}`)||'[]')
   setNativeFoamPads(Array.isArray(saved)?saved.filter(p=>p&&typeof p.panel==='string'&&Array.isArray(p.points)):[])
  }catch{setNativeFoamPads([])}
  foamLoadedKey.current=foamProjectKey
 },[foamProjectKey])
 const commitFoamPads=next=>{
  if(!foamProjectKey||foamLoadedKey.current!==foamProjectKey)return
  setNativeFoamPads(next)
  if(foamProjectKey){try{localStorage.setItem(`exo-v2-native-foam:${foamProjectKey}`,JSON.stringify(next))}catch{setFoamMessage('Foam draft changed, but browser storage is unavailable.')}}
 }
 const editNativeFoamPad=(id,changes)=>commitFoamPads(nativeFoamPads.map(p=>p.id===id?{...p,...changes}:p))
 useEffect(()=>{
  if(!embedded)return
  const pad=nativeFoamPads.find(item=>item.id===selectedFoamId)||null
  window.dispatchEvent(new CustomEvent('exo-clothcraft-foam-selection',{detail:{pad,projectKey:foamProjectKey}}))
 },[embedded,selectedFoamId,nativeFoamPads,foamProjectKey])
 useEffect(()=>{
  if(!embedded)return undefined
  const edit=event=>{
   const {id,material}=event.detail||{}
   if(!id||!material||!nativeFoamPads.some(pad=>pad.id===id))return
   editNativeFoamPad(id,{material})
  }
  window.addEventListener('exo-clothcraft-foam-material-edit',edit)
  return()=>window.removeEventListener('exo-clothcraft-foam-material-edit',edit)
 },[embedded,nativeFoamPads,foamProjectKey])
 const importNativeFoam=async e=>{
  const file=e.target.files?.[0];e.target.value=''
  if(!file||!foamProjectKey)return
  try{
   if(file.size>3*1024*1024)throw Error('SVG file exceeds 3MB')
   const result=parseSvgPattern(await file.text(),{fileName:file.name,maxPieces:12})
   const panel=selected?.panel||s?.template?.panels?.find(p=>/front/i.test(p.name+' '+p.id))?.id||s?.template?.panels?.[0]?.id
   if(!panel)throw Error('Select a native pattern first')
   const panelRange=s?.panels?.find(p=>p.id===panel)
   const panelUv=panelRange?.vertices&&s.uv?.slice(...panelRange.vertices)
   if(!panelUv?.length)throw Error('Native panel material coordinates are unavailable')
   const midX=(Math.min(...panelUv.map(p=>p[0]))+Math.max(...panelUv.map(p=>p[0])))*50
   const midY=(Math.min(...panelUv.map(p=>p[1]))+Math.max(...panelUv.map(p=>p[1])))*50
   const pads=result.pieces.map((piece,i)=>{
    const x=piece.points.map(p=>p.x),y=piece.points.map(p=>p.y)
    const width=Math.max(...x)-Math.min(...x),height=Math.max(...y)-Math.min(...y)
    if(width>120||height>120)throw Error('Imported foam outline must be at most 120 cm')
    const edgeWidthCm=safeFoamEdgeWidth(piece.points)
    if(!edgeWidthCm)throw Error(`Foam outline ${piece.name} cannot form a valid edge ramp. Simplify or enlarge it.`)
    return {id:`native-foam-${Date.now()}-${i}`,panel,name:piece.name,points:piece.points,x:midX,y:midY,widthCm:width,heightCm:height,rotationDeg:0,depthCm:1.5,edgeWidthCm,sewn:false,locked:false,mode:'sandwich'}
   })
   if(foamLoadedKey.current!==foamProjectKey)throw Error('Project changed during SVG import; reimport into the active project')
   commitFoamPads([...nativeFoamPads,...pads]);setSelectedFoamId(pads[0]?.id||null);setFoamMessage(`Imported ${pads.length} foam shape(s) for ${panel}. Preview guides are independent of native Rust sewing.`);setFoamOpen(true)
  }catch(error){setFoamMessage(error.message||'Foam SVG import failed')}
 }
 const [cloHardwareCatalog,setCloHardwareCatalog]=useState([])
 useEffect(()=>{
  let active=true
  fetch('/clo-hardware-converted/manifest.json').then(response=>response.ok?response.json():null)
    .then(value=>{if(active&&Array.isArray(value?.items))setCloHardwareCatalog(value.items)})
    .catch(()=>{})
  return()=>{active=false}
 },[])
 const cloAssetsById=useMemo(()=>new Map(cloHardwareCatalog.map(asset=>[asset.id,asset])),[cloHardwareCatalog])
 const sceneImportedHardware=useMemo(()=>(s?.importedHardware||[]).map(placed=>{
  const asset=cloAssetsById.get(placed.assetId)
  if(!asset?.glb)return null
  const base=importedCloHardwareDimensions(asset)
  return {id:placed.id,panel:placed.panel,assetId:placed.assetId,glbUrl:asset.glb,
   x:placed.positionMm?.[0]||0,y:placed.positionMm?.[1]||0,
   liftMm:Math.max(0,placed.positionMm?.[2]||1),
   widthMm:base[0]*(placed.scale?.[0]||1),heightMm:base[1]*(placed.scale?.[1]||1),depthMm:base[2]*(placed.scale?.[2]||1),
   rotationDeg:placed.rotationDegrees?.[2]||0,visible:placed.visible,
   roughness:placed.roughness,metalness:placed.metalness,color:placed.color,opacity:placed.opacity??1,
   reflectionIntensity:placed.reflectionIntensity??1,clearcoat:placed.clearcoat??0,
   materialType:placed.materialType||'original',weightGrams:placed.weightGrams??0}
 }).filter(Boolean),[s?.importedHardware,cloAssetsById])
 const [pleatActive,setPleatActive]=useState(false),[drawingError,setDrawingError]=useState('')
 const [constructionOpen,setConstructionOpen]=useState(false)
 const [constructionGuidesOpen,setConstructionGuidesOpen]=useState(false)
 const [cutRoomOpen,setCutRoomOpen]=useState(false)
 const [cutRoomStudy,setCutRoomStudy]=useState(null)
 const [nativeConstructionPreview,setNativeConstructionPreview]=useState(null)
 const [curveStationOpen,setCurveStationOpen]=useState(false)
 const [nativeCurveStationPreview,setNativeCurveStationPreview]=useState(null)
 const [dartPrecisionOpen,setDartPrecisionOpen]=useState(false)
 const [physicalPleatOpen,setPhysicalPleatOpen]=useState(false)
 const [nativePhysicalPleatPreview,setNativePhysicalPleatPreview]=useState(null)
 const [nativeDartPrecisionPreview,setNativeDartPrecisionPreview]=useState(null)
 useEffect(()=>{
  if(!embedded)return
  const open=()=>{setMode('edit');setSection('Pattern');setConstructionGuidesOpen(true)}
  window.addEventListener('exo-clothcraft-open-construction-guides',open)
  return()=>window.removeEventListener('exo-clothcraft-open-construction-guides',open)
 },[embedded])
 useEffect(()=>{
  if(!embedded)return undefined
  const onTool=event=>{
   if(event.detail?.tool==='construction-point'){
    setCurveStationOpen(false)
    setNativeCurveStationPreview(null)
    setDartPrecisionOpen(false)
    setNativeDartPrecisionPreview(null)
    setMode('edit')
    setConstructionOpen(true)
    setSection('Pattern')
    setNotice('Numerical construction: choose a corner and reference points, review the metric proposal, then Apply through Rust Undo.')
   }else if(event.detail?.tool==='curve-station'){
    setConstructionOpen(false)
    setNativeConstructionPreview(null)
    setDartPrecisionOpen(false)
    setNativeDartPrecisionPreview(null)
    setMode('edit')
    setCurveStationOpen(true)
    setSection('Pattern')
    setNotice('Curve station: choose a named pattern edge, select physical distance in mm or %, then ask Rust to split it with Undo.')
   }else if(event.detail?.tool==='physical-pleat'){
    setConstructionGuidesOpen(false)
    setConstructionOpen(false)
    setCurveStationOpen(false)
    setDartPrecisionOpen(false)
    setMode('edit')
    setSection('Pattern')
    setPhysicalPleatOpen(true)
    setNotice('Physical tuck sewing: choose a straight cutline, measured intake/depth and number of repeats. Rust will stitch the original material along paired internal lines; inspect simulated closure before any production release.')
   }else if(event.detail?.tool==='dart-precision'){
    setPhysicalPleatOpen(false)
    setConstructionGuidesOpen(false)
    setConstructionOpen(false)
    setNativeConstructionPreview(null)
    setCurveStationOpen(false)
    setNativeCurveStationPreview(null)
    setMode('edit')
    setDartPrecisionOpen(true)
    setSection('Pattern')
    setNotice('Precision dart: choose an unsewn straight edge, set intake and depth in mm, review the physical V-cut proposal and Apply through Rust Undo.')
   }else if(typeof event.detail?.tool==='string'){
    setPhysicalPleatOpen(false)
    setConstructionOpen(false)
    setNativeConstructionPreview(null)
    setCurveStationOpen(false)
    setNativeCurveStationPreview(null)
    setDartPrecisionOpen(false)
    setNativeDartPrecisionPreview(null)
   }
  }
  window.addEventListener('exo-clothcraft-select-2d-tool',onTool)
  return()=>window.removeEventListener('exo-clothcraft-select-2d-tool',onTool)
 },[embedded])
 useEffect(()=>{
  if(!embedded)return undefined
  const invalid=event=>setDrawingError(event.detail?.reason||'Draw the internal line entirely inside a pattern.')
  const pleat=event=>{
   if(!pleatActive)return
   if(!event.detail?.panelId){setDrawingError('Click a rectangular pattern to create pleat guides.');return}
   void createPleatGuides(event.detail.panelId)
  }
  window.addEventListener('exo-clothcraft-invalid-internal-polygon',invalid)
  window.addEventListener('exo-clothcraft-pleat-target',pleat)
  return()=>{
   window.removeEventListener('exo-clothcraft-invalid-internal-polygon',invalid)
   window.removeEventListener('exo-clothcraft-pleat-target',pleat)
  }
 },[embedded,pleatActive,busy,playing])
 // A Base Polygon form is transient. Never leave it obscuring both views
 // after Select, Trace, Sewing, or a related inspector has been activated.
 useEffect(()=>{
  if(!embedded)return undefined
  const onToolbar=event=>{
   const editSewing=event.detail?.nativeAction==='sewing.editExisting'
   setSeamEditing(editSewing)
   // Edit Sewing is a native seam-inspection/edit tool, not a new free/segment
   // sewing gesture. Exit whichever sewing mode was previously active so the
   // editable seam inspector actually opens, even after constructing a seam.
   if(editSewing){
    setMode('edit')
    segmentPendingRef.current=null
    groupSewPendingRef.current=[]
    freeSewPendingRef.current=[]
    setPair([])
    setFreeSewPoints([])
    // Keep the 2D highlighted correspondence, 3D seam selection and Edit
    // Sewing Property Editor on the SAME native relationship from entry.
    // A panel/edge selection alone is not equivalent to a seam identity.
    const inventory=state.current?.template?.seams||[]
    const current=inventory.find(seam=>seam.id===selected?.seamId)
    const matching=current||inventory.find(seam=>
      [seam.a,seam.b].some(side=>side.panel===selected?.panel&&
        (!selected?.edge||side.edge===selected.edge)))||inventory[0]
    const seamSelection=matching?{
      panel:matching.a.panel,edge:matching.a.edge,kind:'sewing',seamId:matching.id,
    }:null
    setSelected(seamSelection)
    if(embedded&&seamSelection)window.dispatchEvent(
      new CustomEvent('exo-clothcraft-native-pick',{detail:seamSelection}))
   }
   // Validation belongs to the previous drawing tool; selecting Walk or any
   // other toolbar action must dismiss it before opening the next dialog.
   setDrawingError('')
   if(event.detail?.nativeAction!=='pattern2d.basePolygon')setBasePolygonOpen(false)
   if(event.detail?.nativeAction==='pattern2d.fillPanel'){
    setFillPanelTarget(state.current?.template?.panels?.find(p=>p.id===selected?.panel)?.id||state.current?.template?.panels?.[0]?.id||'')
    setFillFabricId(state.current?.template?.fabrics?.[0]?.id||'')
    setFillPanelOpen(true)
   }else setFillPanelOpen(false)
   if(['pattern2d.editGrading','pattern2d.autoGrading'].includes(event.detail?.nativeAction)){
    setGradePanelTarget(state.current?.template?.panels?.find(p=>p.id===selected?.panel)?.id||state.current?.template?.panels?.[0]?.id||'')
    setGradeMode(event.detail.nativeAction==='pattern2d.editGrading'?'manual':'auto')
   }else setGradeMode('')
   if(event.detail?.nativeAction==='pattern2d.walkSeam'){
    setWalkSeamId(state.current?.template?.seams?.find(seam=>seam.id===selected?.seamId)?.id||state.current?.template?.seams?.[0]?.id||'')
    setWalkFraction(0)
    setWalkOpen(true)
   }else setWalkOpen(false)
   if(event.detail?.nativeAction==='pattern2d.fullnessRuffle'){
    const candidate=state.current?.template?.panels?.find(p=>p.id===selected?.panel&&p.polygon?.lines?.length)||state.current?.template?.panels?.find(p=>p.polygon?.lines?.length)
    setFullnessPanel(candidate?.id||'')
    setFullnessLine(candidate?.polygon?.lines?.[0]?.id||'')
    setFullnessOpen(true)
   }else setFullnessOpen(false)
   setPleatActive(event.detail?.nativeAction==='pattern2d.pleatGuides')
   if(event.detail?.nativeAction==='sewing.segmentSew'){
    setSewingVariant('segment')
    setEase(false)
    setRanges([[0,1],[0,1]])
    segmentPendingRef.current=null
    groupSewPendingRef.current=[]
    freeSewPendingRef.current=[]
    setFreeSewPoints([])
    setPair([])
   }else if(event.detail?.nativeAction==='sewing.freeSew'){
    setSewingVariant('free')
    setRanges([[0,1],[0,1]])
    // A free range is authored by independent pointer picks. Do not
    // silently accept mismatched lengths; easing must be deliberate.
    setEase(false)
    segmentPendingRef.current=null
    groupSewPendingRef.current=[]
    freeSewPendingRef.current=[]
    setFreeSewPoints([])
    setPair([])
   }
  }
  window.addEventListener('exo-clothcraft-toolbar-activated',onToolbar)
  return()=>window.removeEventListener('exo-clothcraft-toolbar-activated',onToolbar)
 },[embedded,selected?.panel])
 useEffect(()=>{if(mode!=='edit')setBasePolygonOpen(false)},[mode])
 const [contextMenu,setContextMenu]=useState(null)
 const [inspectorFabricId,setInspectorFabricId]=useState(null)
 const [fabricHost,setFabricHost]=useState(null)
 const [graphicHost,setGraphicHost]=useState(null)
 const [nativeGraphics,setNativeGraphics]=useState([])
 const [selectedGraphicId,setSelectedGraphicId]=useState(null)
 const [showGraphicMeasurements,setShowGraphicMeasurements]=useState(()=>{
  try{return localStorage.getItem('exo-v2-show-2d-graphic-measurements')!=='false'}catch{return true}
 })
 const toggleGraphicMeasurements=value=>{
  setShowGraphicMeasurements(Boolean(value))
  try{localStorage.setItem('exo-v2-show-2d-graphic-measurements',String(Boolean(value)))}catch{}
 }
 useEffect(()=>{
  if(!embedded)return undefined
  const setMeasurements=event=>{
   if(typeof event.detail?.visible==='boolean')toggleGraphicMeasurements(event.detail.visible)
  }
  window.addEventListener('exo-clothcraft-set-graphic-measurements',setMeasurements)
  return()=>window.removeEventListener('exo-clothcraft-set-graphic-measurements',setMeasurements)
 },[embedded])
 const graphicThumbnailCache=useRef(new Map())
 const [graphicThumbnailVersion,setGraphicThumbnailVersion]=useState(0)
 const graphicsDocumentRef=useRef(null)
 const graphicsSaveTimer=useRef(null),graphicsPending=useRef(null),graphicsEditVersion=useRef(0)
 // Rust's panel material UVs are in metres. These are the permanent cutting
 // dimensions, independent of zoom or how far the garment is draped.
 const nativeGraphicPanelBounds=panelId=>{
  const value=s?.graphicPanelMetrics?.[panelId]
  if(value?.width>0&&value?.height>0)return {widthMm:value.width*1000,heightMm:value.height*1000,
    minXmm:value.minX*1000,minYmm:value.minY*1000}
  const p=s?.panels?.find(panel=>panel.id===panelId)
  const uv=p?.vertices&&s?.uv?.slice(...p.vertices)
  if(!uv?.length)return null
  const x=uv.map(v=>v[0]),y=uv.map(v=>v[1])
  return {widthMm:(Math.max(...x)-Math.min(...x))*1000,
   heightMm:(Math.max(...y)-Math.min(...y))*1000,minXmm:Math.min(...x)*1000,minYmm:Math.min(...y)*1000}
 }
 const preparePrintGraphic=graphic=>{
  const g=normalizeGarmentGraphic(graphic)
  const bounds=nativeGraphicPanelBounds(g.panel)
  if(!bounds?.widthMm||!bounds?.heightMm)throw Error(`No physical panel coordinates for ${g.panel}`)
  const widthMm=g.widthMm??g.scale*bounds.widthMm
  const heightMm=g.heightMm??widthMm*g.height/g.width
  return {...g,widthMm,heightMm,
   positionMm:g.positionMm??[g.center[0]*bounds.widthMm-widthMm/2,g.center[1]*bounds.heightMm-heightMm/2]}
 }
 // Panel ids/count can change after Duplicate, Mirror or Remove. Do not key
 // artwork storage to mutable topology or a valid edit would hide all prints.
 const graphicsDocumentKey=s?.template?.panels?.length
  ? `exo-v2-print-layout:${s.template.id||s.template.name||'untitled'}`:null
 // Native Rust persists real print dimensions and layers with the garment.
 // IndexedDB serves only as a backwards-compatible migration source/cache.
 useEffect(()=>{
  let cancelled=false
  graphicsDocumentRef.current=graphicsDocumentKey
  if(!graphicsDocumentKey){setNativeGraphics([]);return()=>{cancelled=true}}
  const valid=saved=>Array.isArray(saved)?saved.filter(g=>
    typeof g?.panel==='string'&&typeof g?.dataUrl==='string'&&g.dataUrl.startsWith('data:image/png;base64,')
    &&s.template.panels.some(p=>p.id===g.panel)):[]
  let legacy=[]
  try{legacy=valid(JSON.parse(localStorage.getItem(graphicsDocumentKey)||'[]'))}catch{}
  readNativeGraphics(graphicsDocumentKey).then(saved=>{
   if(cancelled||graphicsDocumentRef.current!==graphicsDocumentKey)return
   const artwork=valid(saved)
   const native=valid(s?.printGraphics)
   if(native.length){setNativeGraphics(native);return}
   const toMigrate=artwork.length?artwork:legacy
   if(toMigrate.length)updateNativeGraphics(toMigrate)
   else setNativeGraphics([])
  }).catch(()=>{if(!cancelled&&legacy.length)updateNativeGraphics(legacy)})
  return()=>{cancelled=true}
 },[graphicsDocumentKey])
 const updateNativeGraphics=next=>{
  if(!Array.isArray(next))return
  let calibrated
  try{calibrated=next.map(preparePrintGraphic)}catch(error){setError(error.message);return}
  const version=++graphicsEditVersion.current
  setNativeGraphics(calibrated)
  if(graphicsDocumentRef.current)void saveNativeGraphics(graphicsDocumentRef.current,calibrated).catch(()=>{})
  graphicsPending.current=calibrated
  if(graphicsSaveTimer.current)clearTimeout(graphicsSaveTimer.current)
  graphicsSaveTimer.current=setTimeout(()=>{void (async()=>{
   while(lock.current)await new Promise(resolve=>setTimeout(resolve,25))
   if(running.current){setError('Pause simulation before saving graphics. The current preview is not yet stored in Rust.');return}
   const latest=graphicsPending.current
   graphicsPending.current=null
   if(!latest)return
   // Rust accepts only production fields. Legacy percent-scale, browser file
   // format and old relief aliases must never enter the signed project JSON.
   const printGraphics=latest.map(({format,scale,reliefHeightMm,...graphic})=>graphic)
   const response=await request({op:'graphics-set',printGraphics,graphics:true})
   if(response?.printGraphics&&version===graphicsEditVersion.current){
    setNativeGraphics(response.printGraphics)
    setNotice('Rust saved the artwork, its material settings, and exact millimetre print dimensions with this garment.')
   }
  })()},260)
 }
 const selectGraphicOnBoard=id=>{
  setSelectedGraphicId(id)
  if(embedded)window.dispatchEvent(new CustomEvent('exo-clothcraft-graphic-picked',{detail:{id}}))
 }
 const moveGraphicOnBoard=(id,positionMm)=>{
  if(busy||playing||!nativeGraphics.some(graphic=>graphic.id===id))return
  updateNativeGraphics(nativeGraphics.map(graphic=>graphic.id===id?{...graphic,positionMm}:graphic))
 }
 const resizeGraphicOnBoard=(id,fields)=>{
  if(busy||playing||!nativeGraphics.some(graphic=>graphic.id===id))return
  if(!Number.isFinite(fields?.widthMm)||!Number.isFinite(fields?.heightMm)||
    !(fields.widthMm>=1&&fields.heightMm>=1)||!Array.isArray(fields.positionMm))return
  updateNativeGraphics(nativeGraphics.map(graphic=>graphic.id===id?{...graphic,...fields}:graphic))
  selectGraphicOnBoard(id)
 }
 // The upper Object Browser and the lower Property Editor share one layer ID.
 // Small actual-artwork thumbnails are cached separately from full print PNGs,
 // so simulation status messages never copy megabytes of artwork each frame.
 useEffect(()=>{
  let cancelled=false
  const cache=graphicThumbnailCache.current
  const ids=new Set(nativeGraphics.map(graphic=>graphic.id))
  for(const id of cache.keys())if(!ids.has(id))cache.delete(id)
  for(const graphic of nativeGraphics){
   if(cache.get(graphic.id)?.source===graphic.dataUrl)continue
   const image=new Image()
   image.onload=()=>{
    if(cancelled)return
    const canvas=document.createElement('canvas')
    canvas.width=canvas.height=64
    const ctx=canvas.getContext('2d')
    if(!ctx)return
    const fit=Math.min(56/image.naturalWidth,56/image.naturalHeight)
    const width=image.naturalWidth*fit,height=image.naturalHeight*fit
    ctx.drawImage(image,(64-width)/2,(64-height)/2,width,height)
    cache.set(graphic.id,{source:graphic.dataUrl,thumbnail:canvas.toDataURL('image/png')})
    setGraphicThumbnailVersion(value=>value+1)
   }
   image.src=graphic.dataUrl
  }
  return()=>{cancelled=true}
 },[nativeGraphics])
 useEffect(()=>{
  if(selectedGraphicId!==null&&nativeGraphics.length&&!nativeGraphics.some(graphic=>graphic.id===selectedGraphicId))setSelectedGraphicId(null)
  if(!nativeGraphics.length&&selectedGraphicId!==null)setSelectedGraphicId(null)
 },[nativeGraphics,selectedGraphicId])
 useEffect(()=>{
  if(!embedded)return
  const setVisibility=event=>{
   const {id,visible}=event.detail||{}
   if(typeof id!=='string'||typeof visible!=='boolean'||busy||playing)return
   if(!nativeGraphics.some(graphic=>graphic.id===id))return
   updateNativeGraphics(nativeGraphics.map(graphic=>graphic.id===id?{...graphic,visible}:graphic))
  }
  window.addEventListener('exo-clothcraft-graphic-visibility',setVisibility)
  return()=>window.removeEventListener('exo-clothcraft-graphic-visibility',setVisibility)
 },[embedded,nativeGraphics,busy,playing,s?.graphicPanelMetrics])
 // Object Browser Copy / Assign share the existing Rust-backed graphics store.
 // The new record has an independent ID and is saved by updateNativeGraphics.
 useEffect(()=>{
  if(!embedded)return undefined
  const copy=event=>{
   if(busy||playing)return
   const source=nativeGraphics.find(g=>g.id===event.detail?.id)
   if(!source)return
   const id=`graphic-copy-${Date.now()}-${Math.random().toString(36).slice(2,7)}`
   const duplicate=normalizeGarmentGraphic({...source,id,name:`${source.name||'Graphic'} Copy`,
    center:Array.isArray(source.center)?source.center.map(n=>Math.min(.95,n+.03)):[.53,.53],
    ...(Array.isArray(source.positionMm)?{positionMm:source.positionMm.map(n=>n+10)}:{})})
   updateNativeGraphics([...nativeGraphics,duplicate])
   setSelectedGraphicId(id)
   setNotice(`Copied ${source.name||'graphic'}; the copy has its own saved layer and print position.`)
  }
  const assign=event=>{
   if(busy||playing)return
   const source=nativeGraphics.find(g=>g.id===event.detail?.id)
   const panel=selected?.panel||s?.template?.panels?.[0]?.id
   if(!source||!panel)return
   updateNativeGraphics(nativeGraphics.map(g=>g.id===source.id?{...g,panel}:g))
   setSelectedGraphicId(source.id)
   setNotice(`Assigned ${source.name||'graphic'} to ${s?.template?.panels?.find(p=>p.id===panel)?.name||panel}.`)
  }
  window.addEventListener('exo-clothcraft-copy-graphic',copy)
  window.addEventListener('exo-clothcraft-assign-graphic',assign)
  return()=>{window.removeEventListener('exo-clothcraft-copy-graphic',copy);window.removeEventListener('exo-clothcraft-assign-graphic',assign)}
 },[embedded,nativeGraphics,busy,playing,selected?.panel,s?.template?.panels])
 // The Fabric Property Editor region may first mount when a Fabric object is
 // selected (after the workspace already switched tabs). Reacquire the portal
 // host on actual native asset selection/revision, not only on section change.
 useEffect(()=>{setFabricHost(embedded?document.getElementById('cc-native-fabric-inspector'):null)},
  [embedded,exoSection,inspectorFabricId,s?.revision])
 useEffect(()=>{setGraphicHost(embedded?document.getElementById('cc-native-graphic-editor'):null)},[embedded,exoSection,exoObjectTab,s?.revision])
 const workspaceRoot=useRef(null), shortcutsFocused=useRef(false), nativeOpenInput=useRef(null)
 const cameraViewport=useRef(null)
 const state=useRef(),running=useRef(false),runToken=useRef(0),lock=useRef(false),resumeAfterGrab=useRef(false),grabPause=useRef(Promise.resolve()),fitAfterReset=useRef(false);state.current=s
 // A native Undo, redo branch, source-panel deletion or project replacement
 // can remove a saved seam. Clear obsolete correspondence selection in both
 // viewports rather than leaving a 3D highlight tied to a nonexistent seam.
 useEffect(()=>{
  if(!selected?.seamId||!Array.isArray(s?.template?.seams)||
    s.template.seams.some(seam=>seam.id===selected.seamId))return
  setSelected(current=>current?.seamId===selected.seamId?null:current)
  setHovered(current=>current?.seamId===selected.seamId?null:current)
  if(embedded)window.dispatchEvent(new CustomEvent('exo-clothcraft-native-pick',{detail:null}))
 },[s?.revision,selected?.seamId,embedded])
 // Wait for the Rust snapshot and the Three.js garment meshes to refresh
 // before fitting the camera to a freshly reset, off-body garment. A stage
 // stays in place, and the off-body panels remain visible in front of it.
 useEffect(()=>{
  if(!fitAfterReset.current||stageId!=='EXO01'||!s?.template)return
  fitAfterReset.current=false
  window.dispatchEvent(new CustomEvent('exo-clothcraft-fit-camera'))
 },[s?.revision,stageId])
 const request=useCallback(async(data)=>{if(lock.current)return null;lock.current=true;setBusy(true);setError('');nativeGradeLastError.current='';try{const res=await fetch(BASE+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:state.current?.revision,...data})});const result=await res.json();if(result.data?.template){const next={...result.data,avatar:result.data.avatar||(data.op==='open'?null:state.current?.avatar)};state.current=next;setS(next)}if(!res.ok||!result.ok)throw Error(result.error||'ClothCraft request failed');return result.data}catch(e){nativeGradeLastError.current=e.message;setError(e.message.includes('OGC initial intersection')?'A panel overlaps the avatar or another panel. Use Move to place it fully clear, then switch to Hand or press SIM. Reset Panels restores the initial arrangement.':e.message);running.current=false;setPlaying(false);return null}finally{lock.current=false;setBusy(false)}},[])
 // On project reopen, a valid grade catalog lives in the Rust project even
 // when the browser's verification badge has not been restored. Perform one
 // read-only comparison per exact revision/rule/POM draft so saved XS–XXL
 // activation becomes available without an unnecessary second manual save.
 // Never infer persistence from the browser sidecar alone.
 const gradeCatalogAutoProbe=useRef(null)
 useEffect(()=>{
  if(!s?.template||s?.activeGradedSize||!nativeGradeRules||!nativeRuleDraftKey||
    busy||playing||lock.current||running.current||
    nativeRuleDraftKey!==`exo-native-grade-sidecar:${nativeGradeRules.templateFingerprint}`)return
  const revision=s.revision,rules=nativeGradeRules,poms=nativePOMDefinitions
  const prior=gradeCatalogAutoProbe.current
  if(prior?.revision===revision&&prior.rules===rules&&prior.poms===poms)return
  const token=Symbol('native-grade-catalog-probe')
  gradeCatalogAutoProbe.current={revision,rules,poms,token}
  void (async()=>{
    const status=await request({op:'grade-run-status',revision})
    if(gradeCatalogAutoProbe.current?.token!==token||state.current?.revision!==revision||state.current?.activeGradedSize)return
    const checked=status?.persistedInProject
      ?verifyNativeGradeCatalog20261025(state.current,rules,status,{durablySaved:true,pomDefinitions:poms})
      :null
    setNativeGradeCatalogStatus(checked?.ok?checked:null)
  })()
 },[s?.revision,s?.activeGradedSize,nativeGradeRules,nativePOMDefinitions,nativeRuleDraftKey,busy,playing,request])
 useEffect(()=>{
  if(!embedded)return undefined
  const listener=async event=>{
   const detail=event.detail||{}
   const respond=(ok,message,panelId)=>window.dispatchEvent(new CustomEvent('exo-seamly-native-cut-import-result',{detail:{requestId:detail.requestId,ok,message,panelId}}))
   if(running.current){respond(false,'Pause the native simulation before importing a CUT pattern');return}
   for(let n=0;lock.current&&n<250;n++)await new Promise(resolve=>setTimeout(resolve,20))
   const before=state.current
   if(lock.current||!before?.template?.fabrics?.length){respond(false,'Native project is still busy or unavailable');return}
   const selectedPanel=before.template.panels.find(p=>p.id===selected?.panel)
   const fabricId=selectedPanel?.fabric||before.template.fabrics[0].id
   const planned=buildSeamlyNativeCutCommand20261024(detail.file,{unit:detail.unit,index:detail.index,fabricId})
   if(!planned.ok){respond(false,planned.reason);return}
   try{
    const savedBytes=new TextEncoder().encode(detail.file.content)
    const actualSha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',savedBytes))).map(v=>v.toString(16).padStart(2,'0')).join('')
    if(actualSha.toLowerCase()!==planned.expectedSourceSha256.toLowerCase()){respond(false,'Upstream AAMA source checksum failed before native edit');return}
    const probe='exo-seamly-native-import-storage-probe'
    localStorage.setItem(probe,'ready');localStorage.removeItem(probe)
   }catch(err){respond(false,'Source checksum or local provenance storage unavailable: '+err.message);return}
   if(state.current?.revision!==before.revision){respond(false,'Native project changed while source was being verified');return}
   const prior=new Set(before.template.panels.map(p=>p.id))
   const accepted=await request({op:'edit',command:planned.command})
   if(!accepted?.template){respond(false,'Native Rust rejected the new physical CUT contour; no panel was imported');return}
   const newPanels=accepted.template.panels.filter(p=>!prior.has(p.id))
   if(newPanels.length!==1){
    setNotice('Native CUT edit returned an unexpected panel inventory. Review Undo and do not export for production.')
    respond(false,'Unexpected native panel inventory after edit; inspect Undo');return
   }
   const panelId=newPanels[0].id
   const metadata={schema:'exo-seamly-native-cut-draft.v1',panelId,
    nativeTemplate:accepted.template.name,revision:accepted.revision,
    originalFile:planned.originalSourceFile,originalSourceSha256:planned.expectedSourceSha256,
    upstreamBlock:planned.sourceBlock,sourceUnits:planned.unit,
    maxCutDeviationMm:planned.geometryDeviationMm,
    originalVertices:planned.originalVertexCount,nativeVertices:planned.nativeVertexCount,
    markersNotTranscribed:planned.markerCounts,
    stitchlineVerified:false,gradedRuleImported:false,
    factoryApproved:false,manufacturingApproved:false}
   try{localStorage.setItem('exo-seamly-native-cut-provenance:'+panelId+':'+planned.expectedSourceSha256,JSON.stringify(metadata))}
   catch(err){setNotice('Native CUT imported but source provenance could not be persisted. Undo the new panel and retry before continuing.');respond(false,'Native CUT saved, but provenance was not persisted; Undo required');return}
   setNotice(`Imported editable ${planned.name} CUT as native Rust panel ${panelId}. Maximum simplification deviation ${planned.geometryDeviationMm.toFixed(3)} mm. No Seamly grade formulas, sewn seams, physical notches or factory permission transferred. Undo removes this panel.`)
   respond(true,`Native CUT panel ${panelId} created. Source metadata saved; manufacturing markings/grade still unapproved.`,panelId)
  }
  window.addEventListener('exo-seamly-native-cut-import-request',listener)
  return()=>window.removeEventListener('exo-seamly-native-cut-import-request',listener)
 },[embedded,request,selected?.panel])
 const runPatternAudit=async()=>{
  if(busy||lock.current||!state.current?.template)return
  const audit=await request({op:'pattern-audit'})
  if(audit?.format==='exo-native-pattern-audit.v1'){
   setPatternAudit(audit)
   setNotice(`Rust measured ${audit.editablePanelCount} editable pattern(s) and ${audit.seams.length} sewing pair(s). Factory validation remains required.`)
  }
 }
 const runProductionCutlines=async()=>{
  if(busy||lock.current||!state.current?.template)return
  const proof=await request({op:'production-cutlines'})
  if(proof?.format==='exo-native-cutline-proof.v1'){
   setCutlineProof(proof)
   setNotice(`Rust created ${proof.generatedCount} closed engineering cutline proof(s); ${proof.blockedCount} panel(s) blocked. This is not a factory-approved export.`)
  }
 }
 const runNativeCutRoomStudy=async()=>{
  if(running.current||lock.current||!state.current?.template){setNotice('Pause the native simulation and finish the active edit before cutting-room planning.');return}
  const source=state.current
  const proof=await request({op:'production-cutlines'})
  if(!proof||proof.format!=='exo-native-cutline-proof.v1'){setNotice('Native physical CUT proof was unavailable; no marker estimate created.');return}
  const result=convertNativeCutlineStudy20261024(source,proof)
  if(!result.ok){
   setCutRoomOpen(false);setCutRoomStudy(null)
   setNotice('Native production workflow blocked: '+result.reason+' '+proof.panels?.filter(p=>!p.ok).slice(0,4).map(p=>p.name+': '+p.error).join(' · '))
   return
  }
  setCutRoomStudy(result);setCutRoomOpen(true)
  setNotice('Created a BASE-size study from real Rust physical CUT polygons. Original sewing and grading source remains unchanged; fabric/order planning is unapproved.')
 }
 useEffect(()=>{
  const handle=()=>{void runNativeCutRoomStudy()}
  window.addEventListener('exo-clothcraft-generate-native-cut-room-study',handle)
  return()=>window.removeEventListener('exo-clothcraft-generate-native-cut-room-study',handle)
 },[runNativeCutRoomStudy])
 useEffect(()=>{
  if(cutRoomStudy && s?.revision!==cutRoomStudy.sourceRevision){setCutRoomOpen(false);setCutRoomStudy(null)}
 },[s?.revision,cutRoomStudy])
 const downloadCutlineProof=(panel,format='svg')=>{
  if(['A4','Letter'].includes(format)){
   if(cutlineProof?.revision!==state.current?.revision){setError('Refresh the cutline proof before printing.');return}
   try{
    const sheet=nativeCutlineTiledPrint(panel,cutlineProof.revision,format)
    downloadText(sheet.html,`exo-cutline-proof-${format.toLowerCase()}.html`,'text/html')
    setNotice(`Saved ${sheet.pageCount} ${format} engineering proof pages. Print at actual size and measure calibration. External cutting approval remains required.`)
   }catch(error){setError(error.message)}
   return
  }
  if(cutlineProof?.revision!==state.current?.revision||!['svg','dxf'].includes(format)||!panel?.[format])return
  const blob=new Blob([panel[format]],{type:format==='svg'?'image/svg+xml':'application/dxf'}),url=URL.createObjectURL(blob)
  const a=document.createElement('a')
  a.href=url
  a.download=`exo-${String(panel.name||panel.panelId).replace(/[^a-z0-9_-]+/gi,'_').slice(0,70)}-cutline-QA.${format}`
  a.click()
  setTimeout(()=>URL.revokeObjectURL(url),5000)
  setNotice(`Downloaded Rust metric engineering ${format.toUpperCase()}. External CAD import, plotting scale and sewn samples still require validation.`)
 }
 useEffect(()=>{
  if(!embedded)return undefined
  const action=async event=>{
   const detail=event.detail||{},command=detail.action
   const respond=(ok,error)=>window.dispatchEvent(new CustomEvent('exo-clothcraft-imported-hardware-result',{detail:{requestId:detail.requestId,ok,error}}))
   if(running.current){respond(false,'Pause simulation before editing imported hardware');return}
   while(lock.current)await new Promise(resolve=>setTimeout(resolve,20))
   // Every queued hardware edit must start from the latest accepted snapshot.
   // Capturing this before awaiting lock silently overwrites preceding slider
   // edits when users change several dimensions and material fields quickly.
   const original=state.current
   if(!original?.template){respond(false,'Native project is still loading');return}
   if(command==='undo'||command==='redo'){
    const response=await request({op:command==='undo'?'hardware-undo':'hardware-redo'})
    respond(Boolean(response),response?'':'No imported hardware history step available')
    return
   }
   const previous=original.importedHardware||[]
   let next=previous
   if(command==='place'){
    const asset=cloAssetsById.get(detail.assetId)
    const panel=original.template.panels.find(p=>p.id===detail.panel)||original.template.panels[0]
    if(!asset?.glb||!panel){respond(false,'Select a native garment panel and 3D model');return}
    const points=panel.polygon?.points||[]
    const panelRange=original.panels?.find(entry=>entry.id===panel.id)?.triangles
    const vertices=panelRange&&original.triangles?.[panelRange[0]]?.map(index=>original.uv?.[index])
    const centroid=vertices?.length===3&&vertices.every(point=>Array.isArray(point)&&point.length>=2)
      ?[(vertices[0][0]+vertices[1][0]+vertices[2][0])/3,(vertices[0][1]+vertices[1][1]+vertices[2][1])/3]
      :points.length?points.reduce((a,p)=>[a[0]+p[0]/points.length,a[1]+p[1]/points.length],[0,0]):[0.1,0.1]
    const kind=({Buttons:'button','Zipper pullers':'puller','Zipper sliders':'slider','Zipper stoppers':'stopper'})[asset.category]||'trim'
    const id=typeof detail.id==='string'&&detail.id.length<100?detail.id:`clo-hardware-${Date.now()}-${Math.random().toString(36).slice(2,8)}`
    next=[...previous,{id,assetId:asset.id,panel:panel.id,kind,positionMm:[centroid[0]*1000,centroid[1]*1000,1],rotationDegrees:[0,0,0],scale:[1,1,1],visible:true,color:'#ffffff',roughness:.5,metalness:0,
      reflectionIntensity:1,clearcoat:0,weightGrams:0,materialType:'original'}]
   }else if(command==='update'||command==='remove'||command==='duplicate'){
    const record=previous.find(p=>p.id===detail.id)
    if(!record){respond(false,'Selected imported hardware no longer exists');return}
    if(command==='remove')next=previous.filter(p=>p.id!==detail.id)
    else if(command==='duplicate')next=[...previous,{...record,id:`clo-hardware-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,positionMm:[record.positionMm[0]+10,record.positionMm[1],record.positionMm[2]]}]
    else{
     const asset=cloAssetsById.get(record.assetId),value=detail.value,field=detail.field
     const base=importedCloHardwareDimensions(asset)
     const changed={...record,positionMm:[...record.positionMm],rotationDegrees:[...record.rotationDegrees],scale:[...record.scale]}
     if(['widthMm','heightMm','depthMm'].includes(field)){
      const axis={widthMm:0,heightMm:1,depthMm:2}[field]
      if(!Number.isFinite(Number(value))||Number(value)<=0||!Number.isFinite(base[axis])||base[axis]<=0){respond(false,'Invalid model dimension');return}
      changed.scale[axis]=Number(value)/base[axis]
     }else if(field==='x'||field==='y'||field==='liftMm'){
      const axis={x:0,y:1,liftMm:2}[field]
      changed.positionMm[axis]=Number(value)*(field==='liftMm'?1:10)
     }else if(field==='rotationDeg')changed.rotationDegrees[2]=Number(value)
     else if(['visible','color','roughness','metalness','opacity','reflectionIntensity','clearcoat','weightGrams','materialType'].includes(field))changed[field]=value
     else{respond(false,'Unsupported native hardware property');return}
     next=previous.map(p=>p.id===record.id?changed:p)
    }
   }else{respond(false,'Unknown imported hardware action');return}
   const result=await request({op:'hardware-set',importedHardware:next})
   respond(Boolean(result),result?'':'Native imported hardware edit was not accepted')
  }
  window.addEventListener('exo-clothcraft-imported-hardware-command',action)
  return()=>window.removeEventListener('exo-clothcraft-imported-hardware-command',action)
 },[embedded,cloAssetsById,request])
 useEffect(()=>{request({op:'snapshot',avatar:true,graphics:true});const pause=()=>{running.current=false;fetch(BASE+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({op:'pause'}),keepalive:true}).catch(()=>{})};window.addEventListener('pagehide',pause);return()=>{running.current=false;window.removeEventListener('pagehide',pause)}},[request])
 const edit=async c=>{
  // A mode transition or a previous edit may still own the native request.
  // Queue this user edit rather than silently dropping its button click.
  while(lock.current)await new Promise(resolve=>setTimeout(resolve,20))
  if(running.current){
   running.current=false;setPlaying(false)
   await request({op:'pause'})
  }
  while(lock.current)await new Promise(resolve=>setTimeout(resolve,20))
  return request({op:'edit',command:c})
 }
 const editPatternLayoutBatch=async commands=>{
  if(!Array.isArray(commands)||commands.length<2||commands.length>256||
    commands.some(c=>c?.kind!=='BoardTransform'))return null
  while(lock.current)await new Promise(resolve=>setTimeout(resolve,20))
  if(running.current){running.current=false;setPlaying(false);await request({op:'pause'})}
  while(lock.current)await new Promise(resolve=>setTimeout(resolve,20))
  return request({op:'edit-batch',commands})
 }
 const applyMatchedNotches=async()=>{
  if(lock.current||running.current||playing||nativeGradeRules){
   setError('Pause simulation and close/save active native grading rules before changing sewn source notches.');return
  }
  const before=state.current
  const proposed=planNativeMatchedSeamNotches20261024(before,{seamId:walkSeamId,fraction:walkFraction,depthMm:4})
  if(!proposed.ok){setError('Matched notches blocked: '+proposed.reason);return}
  const originalRevision=before.revision
  const first=await request({op:'edit',command:proposed.commands[0]})
  if(!first?.template)return
  if(first.revision!==originalRevision+1){
   setError('Native revision changed unexpectedly after the first notch; review Undo before further editing.');return
  }
  const second=await request({op:'edit',command:proposed.commands[1]})
  if(!second?.template){
   const undo=await request({op:'undo'})
   if(undo?.template)setNotice('Native Rust rejected the second matched notch. The first notch was rolled back with Undo; review the sewing source.')
   else setError('Second native notch failed and automatic Undo could not be verified. Inspect the first notch manually; do not export.')
   return
  }
  const a=second.template.panels.find(p=>p.id===proposed.commands[0].panel)?.polygon?.notches?.[proposed.commands[0].edge]
  const b=second.template.panels.find(p=>p.id===proposed.commands[1].panel)?.polygon?.notches?.[proposed.commands[1].edge]
  if(!a?.some(n=>Math.abs(n.t-proposed.commands[0].t)<1e-7)||!b?.some(n=>Math.abs(n.t-proposed.commands[1].t)<1e-7)){
   setError('Paired notch metadata was not verified after native edits. Review Undo before exporting.');return
  }
  setNotice(`Placed two physical matched seam notches at ${(proposed.stationFraction*100).toFixed(0)}% across ${proposed.seamId}. Rust saved both edits; Undo twice to restore. Grade propagation and factory approval are NOT complete.`)
 }
 // Changing a sewn side boundary alters its material length. Rust correctly
 // refuses that Shape while allow_ease=false. Require an explicit, visible
 // user action to enable ease on ONLY the affected sewn relationships; never
 // silently change production fit or relax compiler validation.
 const enableCurveSeamEase=async({panelId,edge,mirror=false,polygon=null,expectedRevision=null,affectedEdges=null})=>{
  if(!panelId||!edge)return false
  // A staged curve is a concrete proposal against a specific native snapshot.
  // Never commit it on top of another user's intervening pattern changes.
  if(polygon&&expectedRevision!==null&&state.current?.revision!==expectedRevision){
   setError('Curve proposal is stale after another edit; select the edge again and redraw the curve.')
   return false
  }
  const touchingEdges=new Set(Array.isArray(affectedEdges)&&affectedEdges.length?affectedEdges:[edge])
  if(mirror){
   // Side curves edit BOTH left and right boundaries of this material panel.
   // Both sewn side relationships must explicitly allow ease, or Rust rejects
   // the mirrored contour after the first seam has already been updated.
   const counterpart=edge.endsWith('-left')?edge.replace(/-left$/,'-right'):
    edge.endsWith('-right')?edge.replace(/-right$/,'-left'):null
   const polygon=state.current?.template?.panels?.find(item=>item.id===panelId)?.polygon
   if(counterpart&&polygon?.edges?.includes(counterpart))touchingEdges.add(counterpart)
  }
  const related=(state.current?.template?.seams||[]).filter(seam=>!seam.allow_ease&&
   [seam.a,seam.b].some(boundary=>boundary?.panel===panelId&&touchingEdges.has(boundary?.edge)))
  for(const seam of related){
   while(lock.current)await new Promise(resolve=>setTimeout(resolve,20))
   const applied=await request({op:'edit-seam',seam:seam.id,
    reverse:seam.reverse_b,ease:true,stiffness:seam.stiffness})
   if(!applied)return false
  }
  if(polygon){
   const committed=await edit({kind:'Shape',panel:panelId,polygon})
   if(!committed)return false
  }
  setNotice(`Enabled native sewing ease on ${related.map(seam=>seam.id).join(', ')} so curved-edge lengths may differ. Undo restores the original sewing setting.`)
  return true
 }
 // Import one user-selected EXO fabric preset into the live Rust document.
 // The native Fabric command edits a matching panel; when several panels
 // share the material it creates an independent fabric for just this panel,
 // never silently changes unrelated garment fabrics or the whole project.
 useEffect(()=>{
  if(!embedded)return undefined
  const importFabric=async event=>{
   const {requestId,id,entry}=event.detail||{}
   if(!requestId)return
   const respond=(ok,error='',fabricId)=>window.dispatchEvent(new CustomEvent('exo-clothcraft-fabric-preset-result',
     {detail:{requestId,ok,error,fabricId}}))
   const snapshot=state.current
   const oldFabric=snapshot?.template?.fabrics?.find(f=>f.id===id)
   const panel=snapshot?.template?.panels?.find(p=>p.fabric===id)
   if(!oldFabric||!panel){respond(false,'The selected native fabric is not assigned to a garment pattern');return}
   if(!entry?.name||!validFabric(entry.properties)){respond(false,'Invalid native fabric name or physical properties');return}
   if(running.current||lock.current){respond(false,'Pause simulation and finish current edits before opening a fabric');return}
   try{
    const revised=await edit({kind:'Fabric',panel:panel.id,name:entry.name,properties:entry.properties,all_panels:false})
    if(!revised){respond(false,'The Rust solver did not accept the imported physical material');return}
    const fabricId=state.current?.template?.panels?.find(p=>p.id===panel.id)?.fabric
    if(!fabricId){respond(false,'Native fabric changed but its new identifier could not be resolved');return}
    for(const field of ['itemNo','construction','supplier','owner']){
     if(typeof entry[field]!=='string')continue
     const result=await request({op:'set-property',target:'fabric',id:fabricId,field,value:entry[field]})
     if(!result){respond(false,`Physical fabric imported, but the ${field} metadata update failed`,fabricId);return}
    }
    for(const field of ['color','opacity','roughness','metalness','reflectionIntensity']){
     if(entry.appearance?.[field]===undefined)continue
     const result=await request({op:'set-property',target:'fabric',id:fabricId,field:`appearance.${field}`,value:entry.appearance[field]})
     if(!result){respond(false,`Physical fabric imported, but appearance ${field} could not be saved`,fabricId);return}
    }
    setInspectorFabricId(fabricId)
    setNotice(`Opened ${entry.name} as a native fabric for ${panel.name}. Its physical properties are saved in Rust; other garment materials are unchanged.`)
    respond(true,'',fabricId)
   }catch(error){respond(false,error?.message||'Native fabric import failed')}
  }
  window.addEventListener('exo-clothcraft-import-fabric-preset',importFabric)
  return()=>window.removeEventListener('exo-clothcraft-import-fabric-preset',importFabric)
 })
 // A 3D cloth ray hit has exact interpolated native material coordinates.
 // Forward two hits on the same sewn pattern to the authoritative Rust
 // InternalLine editor rather than storing a disconnected visual stroke.
 useEffect(()=>{
  if(!embedded)return undefined
  let active=true
  const onLine=async event=>{
   const {panel,points}=event.detail||{}
   const templatePanel=state.current?.template?.panels?.find(p=>p.id===panel)
   const valid=Array.isArray(points)&&points.length===2&&points.every(p=>
    Array.isArray(p)&&p.length===2&&p.every(n=>Number.isFinite(n)))
   if(!templatePanel||!valid){setError('3D internal line: choose two visible points on the same native garment panel.');return}
   const gap=Math.hypot(points[1][0]-points[0][0],points[1][1]-points[0][1])
   if(gap<.001||gap>5){setError('3D internal line length must be at least 1 mm and within 5 m.');return}
   const created=await edit({kind:'InternalLine',panel,points,tangents:[[0,0],[0,0]]})
   if(active&&created)setNotice(`Created a native 3D-drawn construction line (${(gap*1000).toFixed(1)} mm) on ${templatePanel.name}. Undo/Redo and Save apply.`)
  }
  window.addEventListener('exo-clothcraft-3d-internal-line',onLine)
  return()=>{active=false;window.removeEventListener('exo-clothcraft-3d-internal-line',onLine)}
 },[embedded])
 useEffect(()=>{
  if(!embedded)return undefined
  const applyPreset=async event=>{
   const presetId=event.detail?.presetId
   const preset=CLOTHCRAFT_FABRICS.find(entry=>entry.id===presetId)
   const snapshot=state.current
   const panel=snapshot?.template?.panels?.find(p=>p.id===selected?.panel)||snapshot?.template?.panels?.[0]
   const fabric=snapshot?.template?.fabrics?.find(f=>f.id===panel?.fabric)
   if(!preset||!panel||!fabric){setError(!preset?'Unknown native fabric preset.':'No native garment panel is available for fabric assignment.');return}
   if(lock.current){setNotice('Native workspace is processing another change. Apply the fabric again once ready.');return}
   const properties=presetProperties(preset,fabric.properties)
   if(!validFabric(properties)){setError(`Invalid native material values for ${preset.name}.`);return}
   const allPanels=event.detail?.allPieces===true
   const updated=await edit({kind:'Fabric',panel:panel.id,name:preset.name,properties,all_panels:allPanels})
   if(updated)setNotice(`${preset.name} applied to ${allPanels?'all garment panels':panel.name}. Native physical properties and visual material updated; values are estimates until tested.`)
  }
  window.addEventListener('exo-clothcraft-apply-preset',applyPreset)
  return()=>window.removeEventListener('exo-clothcraft-apply-preset',applyPreset)
 },[embedded,selected?.panel,request])
 useEffect(()=>{
  if(!embedded)return undefined
  const assignExisting=async event=>{
   const snapshot=state.current
   const fabric=snapshot?.template?.fabrics?.find(f=>f.id===event.detail?.id)
   const panel=snapshot?.template?.panels?.find(p=>p.id===selected?.panel)||snapshot?.template?.panels?.[0]
   if(!fabric||!panel){setError('Select a fabric and native garment panel to assign.');return}
   if(running.current||lock.current){setError('Pause the native simulation before assigning fabric.');return}
   const changed=await edit({kind:'Fabric',panel:panel.id,name:fabric.name,properties:fabric.properties,all_panels:false})
   if(changed)setNotice(`Applied ${fabric.name} to ${panel.name} in the native cloth simulation.`)
  }
  window.addEventListener('exo-clothcraft-assign-fabric',assignExisting)
  return()=>window.removeEventListener('exo-clothcraft-assign-fabric',assignExisting)
 },[embedded,selected?.panel])
 const createPleatGuides=async panelId=>{
  if(busy||playing||lock.current)return
  const panel=state.current?.template?.panels?.find(p=>p.id===panelId)
  if(!panel||panel.polygon?.points?.length!==4){setDrawingError('Select a rectangular pattern to place pleat fold guides.');return}
  const result=await request({op:'pleat-guides',panel:panelId,orientation:'vertical',spacing_mm:20,inset_mm:10})
  if(result)setNotice('Three native pleat fold guides created. Undo removes them together.')
 }
 const pick=value=>{if(embedded)window.dispatchEvent(new CustomEvent('exo-clothcraft-native-pick',{detail:value||null}));setInspectorFabricId(null);if(!value){setSelected(null);setHovered(null);setPair([]);return}setSelected(value);if(mode==='sew'&&value.edge)setPair(p=>p.length===1?[p[0],value]:[value])}
 useEffect(()=>{
  if(!embedded)return undefined
  const chooseFabric=event=>{const id=event.detail?.id;setInspectorFabricId(typeof id==='string'?id:null)}
  const onPropertyEdit=async event=>{
   const d=event.detail||{}
   const outcome={requestId:d.requestId,ok:false,error:'Property could not be saved'}
   const allowedField=['name','itemNo'].includes(d.field)||
     (d.kind==='fabric'&&['construction','supplier','owner','pantoneCode','pantoneSystem','pantoneSource','pantoneApproval','appearance.color','appearance.opacity','appearance.roughness','appearance.metalness','appearance.reflectionIntensity','appearance.back.color','appearance.back.opacity','appearance.back.roughness','appearance.back.metalness','appearance.back.reflectionIntensity','appearance.back.reset','appearance.side.color','appearance.side.opacity','appearance.side.roughness','appearance.side.metalness','appearance.side.reflectionIntensity','appearance.side.reset'].includes(d.field))
   if(!['pattern','fabric'].includes(d.kind)||!allowedField||typeof d.id!=='string'){
     outcome.error='Unsupported native property edit'
   }else if(running.current){
     outcome.error='Pause simulation before editing properties'
   }else{
     // Snapshot polling briefly holds the same native request lock. Queue an
     // intentional property edit until the in-flight read completes, rather
     // than silently dropping user changes during routine viewport updates.
     for(let attempt=0;lock.current&&attempt<250;attempt++)
       await new Promise(resolve=>setTimeout(resolve,20))
     if(running.current)outcome.error='Pause simulation before editing properties'
     else if(lock.current)outcome.error='Native workspace is busy; retry when the current operation completes'
     else {
       const data=await request({op:'set-property',target:d.kind==='pattern'?'panel':'fabric',
         id:d.id,field:d.field,value:d.value,
         revision:d.revision})
       if(data){outcome.ok=true;delete outcome.error}
       else outcome.error='Native property update failed; check the workspace notice'
     }
   }
   window.dispatchEvent(new CustomEvent('exo-clothcraft-property-result',{detail:outcome}))
  }
  window.addEventListener('exo-clothcraft-select-fabric',chooseFabric)
  window.addEventListener('exo-clothcraft-edit-property',onPropertyEdit)
  return()=>{
   window.removeEventListener('exo-clothcraft-select-fabric',chooseFabric)
   window.removeEventListener('exo-clothcraft-edit-property',onPropertyEdit)
  }
 },[embedded,request])
 useEffect(()=>{
  const onPropertyCommand=event=>{
   const detail=event.detail
   if(detail?.type!=='target-length'||!state.current?.template||running.current)return
   const panel=state.current.template.panels.find(p=>p.id===detail.panel)
   if(!panel?.polygon?.edges?.includes(detail.edge)||!Number.isFinite(detail.cm)||detail.cm<=0||detail.cm>1000)return
   void request({op:'line-spec',panel:detail.panel,edge:detail.edge,target_m:detail.cm/100})
  }
  window.addEventListener('exo-clothcraft-property-command',onPropertyCommand)
  return()=>window.removeEventListener('exo-clothcraft-property-command',onPropertyCommand)
 },[])
 useEffect(()=>{
  const onSelectSeam=event=>{
   const id=event.detail?.seamId
   if(!id){pick(null);return}
   const spec=state.current?.template?.seams?.find(s=>s.id===id)
   if(!spec)return
   showNativeSewingSelection(spec)
  }
  window.addEventListener('exo-clothcraft-select-seam',onSelectSeam)
  return()=>window.removeEventListener('exo-clothcraft-select-seam',onSelectSeam)
 },[])
 const save=async(download=false)=>{const data=await request({op:'save'});if(!data)return;setNotice('Workspace saved with editable patterns, seams and drape.');if(download){const blob=new Blob([JSON.stringify(data.project,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='exo-clothcraft-fitting-project.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000)}}
 // File Library shares the currently open authoritative Rust document. Each
 // request carries a response ID so switching between saved projects cannot
 // accidentally snapshot the hidden legacy project or an older fixture.
 useEffect(()=>{
  if(!embedded)return undefined
  let mounted=true
  const onFileLibrary=event=>{
   const {requestId,action,project}=event.detail||{}
   if(typeof requestId!=='string'||!['capture','open'].includes(action))return
   void (async()=>{
    let response={requestId,ok:false,error:'Native garment workspace is unavailable'}
    try{
     if(running.current)throw Error('Pause simulation before saving or opening a library project')
     let waiting=0
     while(lock.current&&waiting++<120)await new Promise(resolve=>setTimeout(resolve,25))
     if(lock.current)throw Error('Native garment is still busy; try again')
     if(action==='capture'){
      if(!state.current?.template)throw Error('Native garment has not loaded yet')
      const saved=await request({op:'save'})
      if(!saved?.project?.template)throw Error('Native garment save failed')
      response={requestId,ok:true,project:saved.project,name:saved.project.template.name||state.current.template.name||'Untitled garment'}
     }else{
      if(!project?.template||!Array.isArray(project.template.panels))throw Error('This saved file does not contain a valid native ClothCraft garment')
      const opened=await request({op:'open',project})
      if(!opened?.template)throw Error('The native engine could not reopen this saved garment')
      setSelected(null);setHovered(null);setPair([]);setPlaying(false)
      response={requestId,ok:true,name:opened.template.name||'Saved garment'}
     }
    }catch(error){response.error=error instanceof Error?error.message:String(error)}
    if(mounted)window.dispatchEvent(new CustomEvent('exo-project-file-library-native-result',{detail:response}))
   })()
  }
  window.addEventListener('exo-project-file-library-native-request',onFileLibrary)
  return()=>{mounted=false;window.removeEventListener('exo-project-file-library-native-request',onFileLibrary)}
 },[embedded,request])
 const play=async()=>{
  // Starting SIM after Select/Move/Rotate switches to the live Fabric Hand
  // tool, exactly as the native ClothCraft grab workflow. Keep a single
  // simulation loop: the subsequent mode effect must not start a second one.
  const token=++runToken.current
  if(running.current){running.current=false;setPlaying(false);while(lock.current)await new Promise(r=>setTimeout(r,20));await request({op:'pause'});return}
  while(lock.current)await new Promise(r=>setTimeout(r,20))
  if(token!==runToken.current)return
  const started=await request({op:'play'});if(!started||token!==runToken.current)return
  running.current=true;setPlaying(true)
  modeIntent.current='stretch3d'
  setMode('stretch3d')
  while(running.current&&token===runToken.current){
   await new Promise(r=>setTimeout(r,100))
   if(!running.current||token!==runToken.current)break
   const result=await request({op:'snapshot'})
   if(!result||result.running===false)break
  }
  if(token===runToken.current){running.current=false;setPlaying(false)}
 }
 // Mode changes own automatic physics. A pending release must never restart
 // the solver after Select/reset, and an old poll loop must not stop a new one.
 const modeIntent=useRef(mode), modeTransition=useRef(0), previousMode=useRef(mode)
 modeIntent.current=mode
 useEffect(()=>{
  if(previousMode.current===mode)return
  previousMode.current=mode
  const transition=++modeTransition.current
  const needsPause=running.current||resumeAfterGrab.current
  if(mode!=='stretch3d'){
   const hadGrab=livePointer.current.held||livePointer.current.ready||livePointer.current.sending
   livePointer.current.held=false;livePointer.current.ready=false
   if(hadGrab)void queueLiveGrab(null)
   ++runToken.current;running.current=false;resumeAfterGrab.current=false;setPlaying(false)
  }
  void (async()=>{
   await grabPause.current
   while(lock.current)await new Promise(resolve=>setTimeout(resolve,20))
   if(transition!==modeTransition.current)return
   if(mode==='stretch3d'){
    if(!running.current&&!resumeAfterGrab.current)void play()
   }else if(needsPause)await request({op:'pause'})
  })()
 },[mode])
 const selectedPanel=s?.template.panels.find(p=>p.id===selected?.panel),active=hovered||selected
 const showNativeSewingSelection=seam=>{
  if(!seam?.id||!seam?.a?.panel||!seam?.a?.edge)return
  const next={panel:seam.a.panel,edge:seam.a.edge,kind:'sewing',seamId:seam.id}
  setInspectorFabricId(null)
  setSelected(next)
  setHovered(null)
  // Seam choice is a garment-wide selection, not a new edge pick. Notify the
  // outer Object Browser/Property Editor without changing a staged seam pair.
  if(embedded)window.dispatchEvent(new CustomEvent('exo-clothcraft-native-pick',{detail:next}))
 }
 const selectExistingSewingSeam=seamId=>{
  const seam=state.current?.template?.seams?.find(item=>item.id===seamId)
  if(!seam)return
  showNativeSewingSelection(seam)
 }
 const selectNewlyAuthoredSeam=(previousIds,result)=>{
  const added=(result?.template?.seams||[]).filter(seam=>!previousIds.has(seam.id))
  if(added.length===1)showNativeSewingSelection(added[0])
 }
 const pickInSewingMode=value=>{
  if(seamEditing&&value?.panel){
   const matching=state.current?.template?.seams?.filter(seam=>
    [seam.a,seam.b].some(side=>side.panel===value.panel&&(!value.edge||side.edge===value.edge)))||[]
   if(matching.length){
    const exact=matching.find(seam=>seam.id===value.seamId)
    const current=matching.findIndex(seam=>seam.id===selected?.seamId)
    selectExistingSewingSeam(exact?.id||matching[(current+1)%matching.length].id)
    return
   }
  }
  if(seamEditing)return
  if(mode==='sew'&&sewingVariant==='segment'){
   if(value?.panel&&value?.edge)void selectSegmentEdge(value)
   else setNotice('Segment Sewing: select a highlighted pattern boundary in 2D or 3D.')
   return
  }
  if(mode==='sew'&&sewingVariant==='free'){
   setNotice('Free Sewing needs four precise 2D boundary points. Choose endpoints on the 2D pattern.')
   return
  }
  pick(value)
 }
 const openPreset=async preset=>{if(s&&!window.confirm('Open a new ClothCraft fixture? Export your current project first if you want to keep a separate copy.'))return;running.current=false;setPlaying(false);setPair([]);setSelected(null);await request({op:'open',preset})}
 const importFile=async e=>{const file=e.target.files?.[0];if(!file)return;try{const project=JSON.parse(await file.text());if(s&&!window.confirm('Replace this workspace with the imported project?'))return;await request({op:'open',...(project.template?{project}:{document:project})});setSelected(null)}catch(err){setError(err.message)}e.target.value=''}
 const boundary=(x,i)=>({panel:x.panel,edge:x.edge,side:'top',range:ranges[i]})
 const clearFreeSew=()=>{
  freeSewPendingRef.current=[]
  setFreeSewPoints([])
 }
 useEffect(()=>{
  if(mode==='sew'&&sewingVariant==='segment')return
  segmentPendingRef.current=null
  groupSewPendingRef.current=[]
  setSegmentCommitting(false)
 },[mode,sewingVariant])
 useEffect(()=>{
  if(mode==='sew'&&sewingVariant==='free')return
  freeSewPendingRef.current=[]
  setFreeSewPoints([])
 },[mode,sewingVariant])
 useEffect(()=>{
  if(mode!=='sew')return
  const cancel=event=>{
   if(event.target?.closest?.('input,select,textarea,[contenteditable="true"]')||event.ctrlKey||event.metaKey||event.altKey)return
   if(sewingVariant==='segment'&&event.key==='Escape'&&
     (segmentPendingRef.current||groupSewPendingRef.current.length)){
    event.preventDefault()
    event.stopPropagation()
    segmentPendingRef.current=null
    groupSewPendingRef.current=[]
    setPair([])
    setNotice('Pending Segment Sewing pair cancelled.')
   }else if(sewingVariant==='free'&&freeSewPendingRef.current.length&&
     ['Escape','Backspace','Delete'].includes(event.key)){
    event.preventDefault()
    event.stopPropagation()
    // CLO-style Delete/Backspace removes the newest partial pick. Escape
    // discards the entire unfinished relationship; native Undo is untouched.
    freeSewPendingRef.current=event.key==='Escape'?[]:freeSewPendingRef.current.slice(0,-1)
    setFreeSewPoints([...freeSewPendingRef.current])
   }
  }
  window.addEventListener('keydown',cancel,true)
  return()=>window.removeEventListener('keydown',cancel,true)
 },[mode,sewingVariant])
 const selectFreeSewPoint=async mark=>{
  if(playing||busy||segmentCommitting||mode!=='sew'||sewingVariant!=='free'||
    !mark?.panel||!mark?.edge||!Number.isFinite(mark?.fraction))return
  const candidate={panel:mark.panel,edge:mark.edge,revision:state.current?.revision,
    fraction:Math.max(0,Math.min(1,Math.round(mark.fraction*100000)/100000))}
  const previous=freeSewPendingRef.current
  if(previous.length&&previous[0].revision!==state.current?.revision){
   clearFreeSew()
   setNotice('Pattern revision changed while Free Sewing was in progress. Start a new seam on the current cutlines.')
   return
  }
  if(previous.length===1||previous.length===3){
   const beginning=previous.at(-1)
   if(candidate.panel!==beginning.panel||candidate.edge!==beginning.edge){
    setNotice(`Finish the selected ${previous.length===1?'first':'second'} edge by clicking another point along the same highlighted edge.`)
    return
   }
   if(Math.abs(candidate.fraction-beginning.fraction)<.008){
    setNotice('The free sewing range needs two different points along the edge. Click farther from its start.')
    return
   }
  }
  if(previous.length===2 && candidate.panel===previous[0].panel&&candidate.edge===previous[0].edge){
   setNotice('Choose the matching second edge to connect to the first selected range.')
   return
  }
  const next=[...previous,candidate]
  setSelected({panel:candidate.panel,edge:candidate.edge})
  freeSewPendingRef.current=next
  setFreeSewPoints(next)
  if(next.length!==4)return
  const interval=(first,second)=>[Math.min(first.fraction,second.fraction),
    Math.max(first.fraction,second.fraction)]
  const first=interval(next[0],next[1]),second=interval(next[2],next[3])
  // The clicked start→end direction defines the alignment. Rust receives
  // normalized cutline ranges and reverses the second edge as necessary.
  const flipSecond=(next[1].fraction-next[0].fraction)*(next[3].fraction-next[2].fraction)<0
  const preflight=preflightNativeSewing20261025(state.current,{
   a:{panel:next[0].panel,edge:next[0].edge,range:first},
   b:{panel:next[2].panel,edge:next[2].edge,range:second},
   reverse:flipSecond,ease,expectedRevision:previous[0].revision})
  if(!preflight.ok){
   setNotice('Free Sewing blocked: '+preflight.reason+' The selected endpoints were preserved for correction.')
   freeSewPendingRef.current=next.slice(0,3)
   setFreeSewPoints(next.slice(0,3))
   return
  }
  setSegmentCommitting(true)
  try{
   const previousIds=new Set(state.current?.template?.seams?.map(seam=>seam.id)||[])
   const result=await edit(preflight.command)
   if(result){
    freeSewPendingRef.current=[]
    setFreeSewPoints([])
    selectNewlyAuthoredSeam(previousIds,result)
    setNotice(`Free seam created: ${next[0].edge} ${(first[0]*100).toFixed(1)}–${(first[1]*100).toFixed(1)}% ↔ ${next[2].edge} ${(second[0]*100).toFixed(1)}–${(second[1]*100).toFixed(1)}% · difference ${preflight.mismatchMm.toFixed(2)} mm. ${preflight.warning}`)
   }else{
    freeSewPendingRef.current=next.slice(0,3)
    setFreeSewPoints(next.slice(0,3))
   }
  }finally{setSegmentCommitting(false)}
 }
 const selectSegmentEdge=async edge=>{
  if(playing||busy||segmentCommitting||mode!=='sew'||sewingVariant!=='segment'||!edge?.panel||!edge?.edge)return
  const candidate={panel:edge.panel,edge:edge.edge,revision:state.current?.revision}
  if(sewingGroupMode!=='single'){
   const previous=groupSewPendingRef.current
   if(previous.length&&previous[0].revision!==candidate.revision){
    groupSewPendingRef.current=[];setPair([])
    setNotice('Native pattern changed during grouped sewing. Reselect all boundaries.');return
   }
   if(previous.some(value=>value.panel===candidate.panel&&value.edge===candidate.edge)){
    setNotice('Each grouped sewing boundary must be selected once. Choose a different edge.');return
   }
   const picked=[...previous,candidate],needed=sewingGroupMode==='symmetric'?2:manySewCount+1
   groupSewPendingRef.current=picked
   setPair(picked)
   setSelected(candidate)
   if(picked.length<needed)return
   const options={reverse,ease,expectedRevision:picked[0].revision}
   const preflight=sewingGroupMode==='symmetric'?
    planNativeSymmetricSewing20261025(state.current,{a:picked[0],b:picked[1],...options}):
    planNativeManySewing20261025(state.current,{primary:picked[0],targets:picked.slice(1),...options})
   if(!preflight.ok){
    groupSewPendingRef.current=picked.slice(0,-1)
    setPair(picked.slice(0,-1))
    setNotice('Grouped sewing blocked: '+preflight.reason+' Choose another matching boundary.');return
   }
   setSegmentCommitting(true)
   try{
    const existing=new Set(state.current?.template?.seams?.map(seam=>seam.id)||[])
    const result=await edit(preflight.command)
    if(!result?.template){
     groupSewPendingRef.current=picked.slice(0,-1)
     setPair(picked.slice(0,-1));return
    }
    groupSewPendingRef.current=[]
    setPair([])
    const added=(result.template.seams||[]).filter(seam=>!existing.has(seam.id))
    if(added.length)showNativeSewingSelection(added[0])
    const expected=preflight.pairs?.length||needed-1
    if(added.length!==expected)setError(`Native grouped sewing returned ${added.length} new seams, expected ${expected}. Review the garment before exporting.`)
    else setNotice(`${sewingGroupMode==='symmetric'?'Symmetric':'One-to-many'} sewing: saved ${added.length} physical seam relationship(s) together in one native Rust edit. Undo restores the complete group. Check 3D closure before production.`)
   }finally{setSegmentCommitting(false)}
   return
  }
  const first=segmentPendingRef.current
  setSelected(candidate)
  if(!first){
   segmentPendingRef.current=candidate
   setPair([candidate])
   return
  }
  if(first.revision!==state.current?.revision){
   segmentPendingRef.current=null
   setPair([])
   setNotice('Pattern revision changed during Segment Sewing. Reselect both boundaries on the current pattern.')
   return
  }
  if(first.panel===candidate.panel&&first.edge===candidate.edge){
   segmentPendingRef.current=null
   setPair([])
   return
  }
  segmentPendingRef.current=null
  setPair([first,candidate])
  const preflight=preflightNativeSewing20261025(state.current,{
   a:{...first,range:[0,1]},b:{...candidate,range:[0,1]},reverse,ease,
   expectedRevision:first.revision})
  if(!preflight.ok){
   segmentPendingRef.current=first
   setPair([first])
   setNotice('Segment Sewing blocked: '+preflight.reason+' First edge remains selected.')
   return
  }
  setSegmentCommitting(true)
  try {
   const previousIds=new Set(state.current?.template?.seams?.map(seam=>seam.id)||[])
   const result=await edit(preflight.command)
   if(result){
    setPair([])
    selectNewlyAuthoredSeam(previousIds,result)
    setNotice(`Segment sewn: ${first.panel}/${first.edge} → ${candidate.panel}/${candidate.edge} · length difference ${preflight.mismatchMm.toFixed(2)} mm. ${preflight.warning} Native Undo restores the original.`)
   }else{
    segmentPendingRef.current=first
    setPair([first])
   }
  }finally{setSegmentCommitting(false)}
 }
 const activateSection=value=>{setSection(value);if(value==='Sewing')setMode('sew');else if(mode==='sew')setMode('edit');setPair([])}
 const changeViewportMode=value=>{
  if(!['edit','sew','pen','line','move3d','rotate3d','stretch3d'].includes(value))return
  setMode(value)
  setPair([])
  if(value==='sew'||value==='line')setSection('Sewing')
 }
 const openViewportContext=({x,y,dimension,hit,hasBackgroundImage=false})=>{
  shortcutsFocused.current=true
  if(seamEditing){
   const candidate=hit?.seamId ? state.current?.template?.seams?.find(seam=>seam.id===hit.seamId)
     :state.current?.template?.seams?.find(seam=>[seam.a,seam.b].some(side=>side.panel===hit?.panel&&side.edge===hit?.edge))
   if(candidate){
    selectExistingSewingSeam(candidate.id)
    hit={...hit,seamId:candidate.id}
   }
  }else if(hit?.panel){setSelected(hit);setHovered(null)}
  setContextMenu({x,y,dimension,hit:hit||null,hasBackgroundImage})
 }
 const requestHistory=async op=>{
  if(running.current)return
  // React updates the panel list slightly before the prior backend request's
  // busy flag clears. Keyboard repeat/rapid Undo→Redo must wait for the lock
  // rather than silently dropping the second native history operation.
  while(lock.current)await new Promise(resolve=>setTimeout(resolve,20))
  let current=state.current
  // A qualified Rust measurement regeneration can commit from a grading
  // workbench before React's canUndo/canRedo flags have rendered. Refresh the
  // authoritative session instead of silently discarding Cmd+Z/Cmd+Shift+Z.
  // The snapshot is read-only and also catches an external native edit.
  if((op==='undo'&&!current?.canUndo)||(op==='redo'&&!current?.canRedo)){
   const latest=await request({op:'snapshot'})
   if(latest?.template)current=latest
  }
  if((op==='undo'&&current?.canUndo)||(op==='redo'&&current?.canRedo))
   return request({op})
  return null
 }
 const contextItems=(()=>{
  if(!contextMenu)return []
  const item=(id,label,shortcut,disabled=false,danger=false,title='')=>({id,label,shortcut,disabled,danger,title})
  if(contextMenu.dimension==='shortcuts')return [
    item('undo','Undo','⌘Z',!s?.canUndo||busy||playing),
    item('redo','Redo','⌘⇧Z',!s?.canRedo||busy||playing),
    item('save','Save project','⌘S',busy),
    item('select','Select / edit','V'),item('draw','Draw pattern','B'),
    item('sew','Sew boundaries','E'),item('internal','Internal line','I'),
    item('move','Move 3D garment','G'),item('rotate','Rotate 3D garment','R'),
    item('hand','Fabric hand / stretch','H'),
    item('simulate',playing?'Pause simulation':'Start simulation','Space',busy&&!playing),
    item('delete','Delete selected pattern','⌫',!selected?.panel||busy||playing),
  ]
  const is2D=contextMenu.dimension==='2d'
  const hasPanel=Boolean(contextMenu.hit?.panel)
  const canEdit=!busy&&!playing
  const selectedPattern=s?.template?.panels?.find(row=>row.id===contextMenu.hit?.panel)
  const isPatternEdge=is2D&&hasPanel&&Boolean(contextMenu.hit?.edge)
  const isPatternSurface=is2D&&hasPanel
  if(seamEditing){
   const id=contextMenu.hit?.seamId||selected?.seamId
   const seam=s?.template?.seams?.find(item=>item.id===id)
   const seamActions=seam ? [
    item('edit-seam-select',`Edit Sewing · ${seam.id}`,'',true),
    {separator:true},
    item('edit-seam-reverse',seam.reverse_b?'Unreverse second edge':'Reverse second edge','',!canEdit),
    item('edit-seam-ease',seam.allow_ease?'Disable seam easing':'Allow seam easing','',!canEdit),
    item('edit-seam-soft','Stiffness · Soft (10,000)','',!canEdit),
    item('edit-seam-standard','Stiffness · Standard (50,000)','',!canEdit),
    item('edit-seam-firm','Stiffness · Firm (150,000)','',!canEdit),
    {separator:true},
    item('edit-seam-remove','Remove selected sewing relationship','',!canEdit,true),
    item('select','Exit Edit Sewing','V'),
   ] : [
    item('edit-seam-empty','Click an existing sewn edge or dotted sewing link to select it','',true),
    item('select','Exit Edit Sewing','V'),
   ]
   return contextMenu.dimension==='3d'&&stageId!=='none'&&onRemoveStage
    ? [...seamActions,{separator:true},item('remove-stage','Remove Stage','',false,true)]
    : seamActions
  }
  const common=[
    item('undo','Undo','⌘Z',!s?.canUndo||!canEdit),
    item('redo','Redo','⌘⇧Z',!s?.canRedo||!canEdit),
    {separator:true},
  ]
  if(isPatternSurface){
   // Native commands are exposed only when they have a real handler. Other CLO
   // names remain visible as unavailable, so clicking never fakes a mutation.
   const available=(id,label,shortcut='',danger=false)=>item(id,label,shortcut,!canEdit,danger)
   const unavailable=label=>item(`unsupported-${label}`,label,'',true,false,'Requires native pattern authoring support')
   return [
    ...(isPatternEdge?[item('edge-selection-label',`Selected edge · ${contextMenu.hit.edge}`,'',true),{separator:true}]:[]),
    available('fabric-assign','Assign New Fabric…'),
    available('delete','Delete Pattern','⌫',true),available('duplicate',isPatternEdge?'Copy Pattern (duplicate)':'Duplicate pattern'),
    unavailable('Paste'),unavailable('Mirror Paste'),unavailable('Replace By…'),
    unavailable('Lock'),{separator:true},
    available('mirror','Mirror Pattern (independent copy)'),unavailable('Symmetric Pattern with Sewing'),
    unavailable('Instance Pattern (linked)'),
    unavailable('Half Symmetric Pattern with Sewing'),{separator:true},
    unavailable('Clone as Internal Shape'),unavailable('Offset as Internal Line'),
    unavailable('Offset as Seamless Block Line'),unavailable('Offset Pattern Outline'),
    unavailable('Layer Clone Over'),unavailable('Layer Clone Under'),
    unavailable('Clone as Reference Line'),unavailable('Delete Reference Line'),
    {separator:true},unavailable('Archive'),unavailable('Deactivate Pattern Only'),
    unavailable('Deactivate Pattern and Sewing'),unavailable('Freeze'),
    unavailable('Strengthen'),unavailable('Solidify'),unavailable('Order'),
    unavailable('Rotate'),unavailable('Flip'),unavailable('Hide 3D Pattern'),
    item('zoom-selected-pattern','Zoom to Selected','',!selectedPattern),
    unavailable('Export to USD Layer'),{separator:true},
    item(contextMenu.hasBackgroundImage?'background-replace':'background-add',
      contextMenu.hasBackgroundImage?'Replace Background Image…':'Add Background Image…'),
    ...(contextMenu.hasBackgroundImage?[item('background-format','Format 2D Background…')]:[]),
    {separator:true},
    item('undo','Undo','⌘Z',!s?.canUndo||!canEdit),
    item('redo','Redo','⌘⇧Z',!s?.canRedo||!canEdit),
   ]
  }
  const panelActions=hasPanel ? [
    item('select','Select pattern','V'),
    item(is2D?'internal':'hand',is2D?'Draw internal line':'Fabric hand / stretch',is2D?'I':'H'),
    item('duplicate','Duplicate pattern','',!canEdit),
    item('mirror','Mirror pattern','',!canEdit),
    item('delete','Delete pattern','⌫',!canEdit,true),
    {separator:true},
  ] : []
  const viewActions=is2D ? [
    item('draw','Draw new pattern','B',!canEdit),
    item('sew','Sew boundaries','E',!canEdit),
    ...(!hasPanel?[
      {separator:true},
      ...(contextMenu.hasBackgroundImage?[
        item('background-format','Format 2D Background…'),
        item('background-replace','Replace Background Image…'),
        item('background-remove','Remove Background Image','',false,true),
      ]:[item('background-add','Add Background Image…')]),
    ]:[]),
  ] : [
    item('orbit','Orbit / select','V'),
    item('move','Move garment','G'),
    item('rotate','Rotate garment','R'),
    item('hand','Fabric hand / stretch','H'),
    {separator:true},
    item('avatar',showAvatar?'Hide avatar':'Show avatar'),
    item('wireframe',wireframe?'Hide wireframe':'Show wireframe'),
    item('seams',showSeams?'Hide seam links':'Show seam links'),
    item('simulate',playing?'Pause simulation':'Start simulation','Space',busy&&!playing),
    ...(stageId!=='none'&&onRemoveStage?[{separator:true},item('remove-stage','Remove Stage','',false,true)]:[]),
  ]
  return [...common,...panelActions,...viewActions,{separator:true},item('shortcuts','Keyboard shortcuts','?')]
 })()
 const executeContextAction=(id,context)=>{
  const panel=context?.hit?.panel ?? (context?.dimension==='shortcuts'?selected?.panel:null)
  if(id.startsWith('edit-seam-')&&id!=='edit-seam-select'&&id!=='edit-seam-empty'){
   const seamId=context?.hit?.seamId||selected?.seamId
   const seam=state.current?.template?.seams?.find(item=>item.id===seamId)
   if(!seam||busy||playing)return
   if(id==='edit-seam-remove'){
    if(window.confirm(`Remove sewing relationship ${seam.id}? Native Undo restores it.`))
      void edit({kind:'RemoveSeam',seam:seam.id}).then(result=>{if(result)setSelected(null)})
    return
   }
   const updates={
    'edit-seam-reverse':{reverse:!seam.reverse_b},
    'edit-seam-ease':{ease:!seam.allow_ease},
    'edit-seam-soft':{stiffness:10000},
    'edit-seam-standard':{stiffness:50000},
    'edit-seam-firm':{stiffness:150000},
   }[id]
   if(updates)void request({op:'edit-seam',seam:seam.id,
     reverse:seam.reverse_b,ease:seam.allow_ease,stiffness:seam.stiffness,...updates})
     .then(result=>{if(result)setNotice(`Updated native sewing relationship ${seam.id}. Undo restores the earlier settings.`)})
   return
  }
  switch(id){
   case 'remove-stage':
    if(context?.dimension==='3d'&&stageId!=='none'&&onRemoveStage){
     onRemoveStage()
     setNotice('Stage removed from 3D view. Garment and avatar preserved.')
    }
    break
   case 'background-add':case 'background-format':case 'background-replace':case 'background-remove':
    window.dispatchEvent(new CustomEvent('exo-open-2d-background-image',{
      detail:{editor:'native',action:id.substring('background-'.length)},
    }));break
   case 'undo':if(!playing)void requestHistory('undo');break
   case 'redo':if(!playing)void requestHistory('redo');break
   case 'save':if(!busy)void save(false);break
   case 'select':case 'orbit':
    changeViewportMode('edit');setSeamEditing(false)
    window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'select'}}))
    break
   case 'draw':setMode('pen');setSection('Pattern');setPair([]);break
   case 'internal':changeViewportMode('line');break
   case 'sew':changeViewportMode('sew');break
   case 'move':changeViewportMode('move3d');break
   case 'rotate':changeViewportMode('rotate3d');break
   case 'hand':changeViewportMode('stretch3d');break
   case 'fabric-assign':
    if(panel&&!busy&&!playing){
     setSelected({panel,edge:context?.hit?.edge})
     setSection('Fabric');setInspectorOpen(true)
     if(embedded)window.dispatchEvent(new CustomEvent('exo-clothcraft-open-fabric-inspector',{detail:{panel}}))
     setNotice('Select a fabric in the Fabric inspector and apply it to the selected pattern.')
    }
    break
   case 'zoom-selected-pattern':
    if(panel)window.dispatchEvent(new CustomEvent('exo-clothcraft-zoom-selected-pattern',{detail:{panel}}))
    break
   case 'duplicate':if(panel&&!busy&&!playing)void edit({kind:'Duplicate',panel});break
   case 'mirror':if(panel&&!busy&&!playing)void edit({kind:'Mirror',panel,axis:'x',copy_side:1});break
   case 'delete':
    if(panel!=null&&!busy&&!playing&&state.current?.template?.panels?.some(item=>item.id===panel)){
     setContextMenu(null)
     void edit({kind:'RemovePanel',panel}).then(result=>{
      if(!result)return
      setSelected(current=>current?.panel===panel?null:current)
      setHovered(current=>current?.panel===panel?null:current)
      setPair(current=>current.filter(item=>item?.panel!==panel))
      setNotice(`Deleted pattern ${panel}. Press ⌘Z to undo.`)
     })
    }
    break
   case 'avatar':setShowAvatar(v=>!v);break
   case 'wireframe':setWireframe(v=>!v);break
   case 'seams':setShowSeams(v=>!v);break
   case 'simulate':if(!busy||playing)void play();break
   case 'shortcuts':setContextMenu({x:Math.round(window.innerWidth/2-120),y:Math.round(window.innerHeight/2-200),dimension:'shortcuts',hit:null});break
   default:break
  }
 }
 // Preserve the original EXO keyboard focus when users work elsewhere in the
 // native app. Modifier shortcuts only intercept keys while this workspace
 // has been activated, and never while entering property values or file names.
 useEffect(()=>{
  const activate=event=>{
   if(event.target.closest?.('.cc-native-context-menu'))return
   shortcutsFocused.current=Boolean(workspaceRoot.current?.contains(event.target))
  }
  const keyboard=event=>{
   if(!shortcutsFocused.current||event.defaultPrevented)return
  const target=event.target
  if(target?.closest?.('input, textarea, select, [contenteditable="true"], [role="textbox"]'))return
  // The corner toolbar owns Escape while a flyout option has keyboard focus.
  // Let its local handler close the row without changing the drawing mode or
  // replacing the user's current Property Editor selection.
  if(event.key==='Escape'&&target?.closest?.('.exo-viewport-inline-tools, .exo-pattern-toolpanel .exo-pen-family'))return
  // VectorCraft keys belong to the focused 2D metric SVG. Let its listener
  // choose actual Pen/Pencil/Curve tools instead of invoking global commands.
  if(target?.closest?.('.cc-board')&&!event.metaKey&&!event.ctrlKey&&!event.altKey&&
    ['p','b','v','a','c'].includes(event.key.toLowerCase()))return
   const key=event.key.toLowerCase()
   const modifier=event.metaKey||event.ctrlKey
   let action=null
   if(modifier&&!event.altKey){
    if(key==='z')action=event.shiftKey?'redo':'undo'
    else if(key==='y')action='redo'
    else if(key==='s')action='save'
   } else if(!event.altKey&&!modifier&&!event.shiftKey){
    const map={v:'select',b:'draw',e:'sew',i:'internal',g:'move',r:'rotate',h:'hand',' ':'simulate','?':'shortcuts'}
    action=map[key]||null
    if(key==='delete'||key==='backspace')action='delete'
   } else if(!modifier&&!event.altKey&&event.key==='?')action='shortcuts'
   if(event.key==='Escape' && Number(document.querySelector('.cc-board svg[data-native-tool]')?.dataset.vectorDraftCount||0)>0)return
   if(event.key==='Escape'){
    action='select'
    setContextMenu(null)
    setPair([])
    setSelected(null)
   }
   if(!action)return
   // The 2D board owns the newest uncommitted polygon/line vertex. Its own
   // capture listener rewinds that draft before native Rust history applies.
   if(action==='undo'&&document.querySelector('.cc-board polyline[stroke="#ef6339"]'))return
   event.preventDefault()
   event.stopPropagation()
   event.stopImmediatePropagation?.()
   setContextMenu(null)
   executeContextAction(action,{dimension:'shortcuts',hit:selected})
  }
  document.addEventListener('pointerdown',activate,true)
  window.addEventListener('keydown',keyboard,true)
  return()=>{document.removeEventListener('pointerdown',activate,true);window.removeEventListener('keydown',keyboard,true)}
 },[busy,playing,selected,s?.canUndo,s?.canRedo,contextMenu])
 const downloadText=(content,filename,type)=>{const url=URL.createObjectURL(new Blob([content],{type}));const link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),3000)}
 const exportClothObj=()=>{if(!s)return;const lines=['# EXO ClothCraft Studio research cloth OBJ (not factory fit)','o cloth'];s.positions.forEach(p=>lines.push(`v ${p.join(' ')}`));s.triangles.forEach(t=>lines.push(`f ${t.map(n=>n+1).join(' ')}`));downloadText(lines.join('\n'),'exo-clothcraft-simulation.obj','text/plain');setNotice('Exported the current Rust cloth mesh as a reference OBJ (not fit certified).')}
 const exportTiledPattern=format=>{
  if(!s)return
  try{
   const lines=s.panels.flatMap(range=>Object.values(range.boundaries).map(indices=>indices.map(index=>boardPoint(s,index).map(n=>n*1000))))
   const sheet=patternTiledPrint(lines,{format,revision:s.revision})
   downloadText(sheet.html,`exo-pattern-reference-${format.toLowerCase()}.html`,'text/html')
   setNotice(`Saved ${sheet.pageCount} ${format} pages including calibration. Open the HTML and print at 100% with headers/footers off. Measure the square before use; reference only.`)
  }catch(error){setError(error.message)}
 }
 const exportPatternSvg=()=>{
  if(!s)return
  try{
   const lines=s.panels.flatMap(range=>Object.values(range.boundaries).map(indices=>indices.map(index=>boardPoint(s,index).map(n=>n*1000))))
   const sheet=patternPrintReference(lines)
   downloadText(sheet.svg,'exo-clothcraft-pattern-reference.svg','image/svg+xml')
   setNotice(`Saved ${sheet.widthMm.toFixed(1)} × ${sheet.heightMm.toFixed(1)} mm reference sheet. Print at 100% and measure the 100 mm square. Not tiled or factory-approved; seam allowances are not included.`)
  }catch(error){setError(error.message)}
 }
 // Upstream live mouse spring: coalesce pointer targets, never pause physics
 // or overwrite particles. The solver owns all visible cloth deformation.
 const livePointer=useRef({pending:undefined,sending:false,held:false})
 const queueLiveGrab=async value=>{
  const q=livePointer.current;q.pending=value
  if(q.sending)return
  q.sending=true
  try{
   while(q.pending!==undefined){
    const grab=q.pending;q.pending=undefined
    const response=await fetch(BASE+'/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({op:'grab',grab})})
    const result=await response.json()
    if(!response.ok||!result.ok)throw Error(result.error||'Live cloth grab failed')
   }
  }catch(error){setError(error.message);q.pending=undefined;q.held=false}
  finally{q.sending=false}
 }
 const startClothGrab=async grab=>{
  livePointer.current.held=true;livePointer.current.ready=false;livePointer.current.target=grab
  while(lock.current)await new Promise(resolve=>setTimeout(resolve,10))
  if(!livePointer.current.held||modeIntent.current!=='stretch3d')return
  if(!running.current){void play();while(lock.current)await new Promise(resolve=>setTimeout(resolve,10))}
  if(livePointer.current.held&&running.current){livePointer.current.ready=true;void queueLiveGrab(livePointer.current.target)}
 }
 const cancelClothGrab=()=>{livePointer.current.held=false;livePointer.current.ready=false;void queueLiveGrab(null)}
 // Reset the *3D simulated pose*, not the authored pattern or sewn edges.
 // This is safe even if the user hits Reset while physics or a fabric grab is
 // running: stop automatic stepping, finish any pending operation, then ask
 // Rust to restore the editable garment's original off-body initial_state.
 const resetPatternPosition=async()=>{
  modeIntent.current='edit';previousMode.current='edit';++modeTransition.current;++runToken.current;setMode('edit')
  if(!state.current?.template){
   const recovered=await request({op:'recover-off-body'})
   if(recovered){
    setSelected(null);setHovered(null);setPair([]);setMode('edit')
    setNotice('Recovered off-body panels from the saved garment. The original project and drape were backed up before recovery. Press SIM to try again.')
   }
   return
  }
  running.current=false
  resumeAfterGrab.current=false
  setPlaying(false)
  await grabPause.current
  while(lock.current)await new Promise(resolve=>setTimeout(resolve,20))
  // A diverged solver may return an error from pause/snapshot even after
  // stopping. Reset must use the cached last-authoritative revision, rather
  // than failing because a previous OGC intersection blocks snapshots.
  await request({op:'pause'})
  await request({op:'snapshot'})
  fitAfterReset.current=stageId==='EXO01'
  const result=await request({op:'reset',revision:state.current?.revision})
  if(!result){fitAfterReset.current=false;return}
  setPair([])
  setSelected(null)
  setHovered(null)
  setMode('edit')
  setNotice('Patterns returned to their original off-body positions. Pattern shapes, sewing links and materials are preserved. Press SIM to drape again.')
 }
 const resetBoardArrangement=async()=>{
  if(lock.current){setNotice('Wait for the current operation before resetting the 2D arrangement.');return}
  if(running.current){running.current=false;setPlaying(false);await request({op:'pause'})}
  let x=0
  const commands=(state.current?.template?.panels||[]).map(panel=>{
   const command={kind:'BoardTransform',panel:panel.id,origin:[x,0],rotation_degrees:0}
   x+=panel.pattern.width+.15;return command
  })
  if(commands.length){const result=await request({op:'edit-batch',commands});if(result)setNotice('Reset all 2D panel layouts. Drape, rest patterns and materials preserved. Undo restores all layouts together.')}
 }
 const pullClothPoint=grab=>{
  livePointer.current.target=grab
  if(livePointer.current.held&&livePointer.current.ready&&modeIntent.current==='stretch3d'&&running.current)void queueLiveGrab(grab)
 }
 const placeVisiblePanel=async command=>{
  const original=state.current?.template?.panels?.find(panel=>panel.id===command.panel)
  if(!original||!command?.placement)return
  if(running.current){running.current=false;setPlaying(false);while(lock.current)await new Promise(resolve=>setTimeout(resolve,20));await request({op:'pause'})}
  // Authored Place arranges flat panels BEFORE simulation. Once draped, move
  // the current solver particles, preserving the other panels' exact pose.
  if(!(state.current?.time>0))return edit(command)
  const prior=original.placement
  const translation_delta=command.placement.translation.map((n,i)=>n-(prior.translation[i]||0))
  const rotation_delta_degrees=command.placement.rotation_degrees.map((n,i)=>n-(prior.rotation_degrees[i]||0))
  const result=await request({op:'pose-panel',panel:command.panel,translation_delta,rotation_delta_degrees})
  if(result)setNotice(`Repositioned ${original.name} as simulated cloth; other draped panels stayed fixed. Connected seams relax on the next physics step.`)
  return result
 }
 const commitNativeF7CanonicalSizes=async()=>{
   const before=state.current
   if(!before?.template||before.gradeRunPersisted!==true||before.activeGradedSize||
      !nativeGradeRules||nativeGradeRules.sizes?.length<4||busy||playing||
      running.current||lock.current)
     return {ok:false,reason:'Restore an inactive Rust catalog with four or more authored canonical sizes.'}
   const result=await commitNativeGradeCanonicalSizeTransaction20261028({
     snapshot:before,expectedRevision:before.revision,ruleSet:nativeGradeRules,
     pomDefinitions:nativePOMDefinitions,request,
   })
   if(!result.ok){
     setNativeGradeCatalogStatus(null)
     setNativeGradeCatalogMessage(result.needsNativeRecovery?
       'Canonical F7 Rust commit may have completed; inspect native history before any retry.':
       'Canonical F7 native commit rejected: '+result.reason)
     return result
   }
   const recovered=recoverNativeGradeRules20261025(result.snapshot,result.status)
   if(!recovered.ok||!commitNativeGradeRuleSet(recovered.ruleSet)){
     setNativeGradeCatalogStatus(null)
     setNativeGradeCatalogMessage('Rust committed canonical sizes, but local draft recovery failed; recover the saved native catalog before further edits.')
     return {...result,ok:false,needsNativeRecovery:true,
       reason:'Durable native catalog committed but browser grading draft recovery failed'}
   }
   // The new named-size targets were explicitly authored before Rust's CAS.
   // Restore their exact committed values rather than retaining a stale
   // browser sidecar with the previous canonical size inventory.
   setNativePOMDefinitions(result.pomDefinitions)
   if(nativePOMDraftKey)try{
     localStorage.setItem(nativePOMDraftKey,JSON.stringify(result.pomDefinitions))
   }catch{setNativeGradeRuleMessage('Rust saved the POM targets; browser draft cache unavailable.')}
   const checked=verifyNativeGradeCatalog20261025(result.snapshot,recovered.ruleSet,
     result.status,{durablySaved:true,pomDefinitions:result.pomDefinitions})
   setNativeGradeCatalogStatus(checked.ok?checked:null)
   setNativeGradeCatalogMessage(`${result.sizes.length} canonical F7 sizes saved and verified in Rust revision ${result.revision}; physical factory release remains unapproved.`)
   return result
 }
 const commitNativeF7PomTargets=async({expectedRevision,definitions})=>{
   const before=state.current
   if(!before?.template||before.gradeRunPersisted!==true||before.activeGradedSize||
      before.revision!==expectedRevision||!nativeGradeRules||busy||playing||
      running.current||lock.current)
     return {ok:false,nativeCommitted:false,needsNativeRecovery:false,
       reason:'Restore a current inactive Rust grade catalog and pause editing before committing POM targets.'}
   const result=await commitNativeGradeNamedSizePom20261028({
     snapshot:before,expectedRevision,ruleSet:nativeGradeRules,definitions,request,
   })
   if(!result.ok){
     setNativeGradeCatalogStatus(null)
     setNativeGradeCatalogMessage(result.needsNativeRecovery?
       'Rust POM targets may have committed. Inspect native history and recover the saved catalog before retrying.':
       'Named-size POM commit refused: '+result.reason)
     return result
   }
   const checked=verifyNativeGradeCatalog20261025(result.snapshot,nativeGradeRules,
     result.status,{durablySaved:true,pomDefinitions:result.definitions})
   if(!checked.ok){
     setNativeGradeCatalogStatus(null)
     setNativeGradeCatalogMessage('Rust saved POM targets but browser verification needs recovery: '+checked.reason)
     return {...result,ok:false,needsNativeRecovery:true,
       reason:'Native commit confirmed; browser grading verification needs recovery'}
   }
   setNativePOMDefinitions(result.definitions)
   if(nativePOMDraftKey)try{
     localStorage.setItem(nativePOMDraftKey,JSON.stringify(result.definitions))
   }catch{setNativeGradeRuleMessage('Rust saved POM targets; browser draft cache unavailable.')}
   setNativeGradeCatalogStatus(checked)
   setNativeGradeCatalogMessage(`Named-size POM targets durably saved in Rust revision ${result.revision}; ${result.nativeNumericalAccepted?'native numerical tolerances passed':'out-of-tolerance draft remains unapproved'}. Factory release remains blocked.`)
   return result
 }
 const showPiece=item=>{setSelected({panel:item});setHovered(null)}
 const gradeWidth=gradeMode==='auto'?(String(gradeWidthStep).trim()===''?NaN:Number(gradeWidthStep)*gradeStep):gradeWidthDelta
 const gradeHeight=gradeMode==='auto'?(String(gradeHeightStep).trim()===''?NaN:Number(gradeHeightStep)*gradeStep):gradeHeightDelta
 const gradePlan=nativeGradePlan(s,gradePanelTarget,gradeWidth,gradeHeight)
 const nativeGradeProposal=useMemo(()=>
   gradeMode&&gradePlan.ok?buildAccuMarkNativeGradeProposal20261023(s,{
     panelId:gradePanelTarget,widthDeltaMm:gradeWidth,heightDeltaMm:gradeHeight,gradeModeOpen:true,
   }):null,
   [s,gradeMode,gradePanelTarget,gradeWidth,gradeHeight,gradePlan.ok])
 const affineMultiPanelGradeNest=useMemo(()=>{
   if((!gradeMode&&!gradeNestPinned)||!gradeNestEnabled||!s?.template?.panels?.length)return null
   return buildAccuMarkNativeMultiPanelNest20261023(s,{
     sizes:['XS','S','M','L','XL','XXL'],baseSize:'M',selectedSize:gradeNestSelectedSize,
     widthStepMm:gradeMode==='auto'?Number(gradeWidthStep):Number(gradeWidthDelta),
     heightStepMm:gradeMode==='auto'?Number(gradeHeightStep):Number(gradeHeightDelta),
   })
 },[s,gradeMode,gradeNestPinned,gradeNestEnabled,gradeNestSelectedSize,gradeWidthStep,gradeHeightStep,gradeWidthDelta,gradeHeightDelta])
 const multiPanelGradeNest=useMemo(()=>{
   if(!nativeGradeRules||(!gradeMode&&!gradeNestPinned)||!gradeNestEnabled)return affineMultiPanelGradeNest
   return compileAccuMarkNativeRuleSizeRun(s,nativeGradeRules,{selectedSize:gradeNestSelectedSize})
 },[s,nativeGradeRules,gradeMode,gradeNestPinned,gradeNestEnabled,gradeNestSelectedSize,affineMultiPanelGradeNest])
 const selectedGradingPOMDefinition=nativePOMDefinitions.find(item=>item.id===selectedGradingPOMId)||nativePOMDefinitions[0]
 const gradedPOMSource=useMemo(()=>{
   if(!gradeMode||gradeStudioTab!=='pom'||!nativeGradeRules||!s?.template||s.activeGradedSize||
     !selectedGradingPOMDefinition)return null
   // Compute from authored per-point rules even if the visual grade nest was
   // hidden; affine proposals must never substitute for POM-grade geometry.
   const graded=compileAccuMarkNativeRuleSizeRun(s,nativeGradeRules,{selectedSize:gradeNestSelectedSize})
   return graded?.ok?{definition:selectedGradingPOMDefinition,size:gradeNestSelectedSize,
     byPanel:graded.byPanel}:null
 },[s,nativeGradeRules,gradeMode,gradeStudioTab,selectedGradingPOMDefinition,gradeNestSelectedSize])
 const nativeGradeVisibility={
   allBlocks:gradeNestAllBlocks,showAllSizes:gradeNestAllSizes,
   showGradePoints:gradeNestShowPoints,showVectors:gradeNestShowVectors,
   selectedPanelId:gradePanelTarget,
   visibleSizes:gradeTableVisibleSizes,colorsBySize:gradeTableColors,
   stackPointIndex:gradeStackPointIndex,
 }
 const filtered=value=>value.toLowerCase().includes(filter.trim().toLowerCase())
 useEffect(()=>{
  if(!embedded)return undefined
  const selectAvatar=async event=>{
   const model=event.detail?.model
   if(!['makehuman-base','clo-thomas'].includes(model)){
    setError('Native V2 supports MakeHuman and CLO Thomas collision avatars.')
    return
   }
   while(lock.current)await new Promise(resolve=>setTimeout(resolve,20))
   if(running.current){running.current=false;setPlaying(false);await request({op:'pause'})}
   while(lock.current)await new Promise(resolve=>setTimeout(resolve,20))
   const result=await request({op:'select-avatar',model})
   if(!result)return
   setShowAvatar(true)
   setSelected(null);setHovered(null)
   setNotice(`${model==='clo-thomas'?'CLO Thomas':'MakeHuman'} loaded as the native 2D and 3D fitting body. Garment patterns and seams preserved; simulation reset for the new collider.`)
   window.dispatchEvent(new CustomEvent('exo-clothcraft-native-avatar-applied',{detail:{model}}))
  }
  window.addEventListener('exo-clothcraft-select-avatar',selectAvatar)
  return()=>window.removeEventListener('exo-clothcraft-select-avatar',selectAvatar)
 },[embedded,request])
 // Register the global native command listener once per embedded mount. Busy,
 // selection and request callbacks change during regeneration; recreating the
 // listener for each render could drop an immediate macOS Cmd+Z event.
 const embeddedCommandDispatchRef=useRef(null)
 embeddedCommandDispatchRef.current=event=>{
   if(!embedded)return
   const command=event.detail
   if(['duplicate-selected','mirror-selected','delete-selected','trace-selected'].includes(command)&&!selected?.panel){setNotice('Select a native fabric panel first.');return}
   if((busy||playing)&&['file:new','file:open'].includes(command)){setNotice('Pause the native simulation and finish the current operation before opening a different project.');return}
   // History requests wait for the in-flight Rust edit inside requestHistory.
   // Rejecting them on React's transient busy flag loses immediate Cmd+Z.
   if(busy&&['save','export','duplicate-selected','mirror-selected','delete-selected','trace-selected'].includes(command)){setNotice('Wait for the current native operation to finish, then try again.');return}
   if(command==='file:new')void openPreset('tshirt')
   else if(command==='file:open')nativeOpenInput.current?.click()
   else if(command==='toggle-sim')void play()
   else if(command==='redrape'&&!running.current)void play()
   else if(command==='reset-2d')void resetBoardArrangement()
   // An edit's UI can settle before its Rust request releases the async lock.
   // Queue history behind that lock rather than silently dropping immediate
   // Undo/Redo from the CLO toolbar or macOS menu.
   else if(command==='undo')void requestHistory('undo')
   else if(command==='redo')void requestHistory('redo')
   else if(command==='save'&&!busy)void save(false)
   else if(command==='export'&&!busy)void save(true)
   else if(command==='reset'||command==='reset-position')void resetPatternPosition()
   else if(command==='step'&&!busy)void request({op:'step',steps:1})
   else if(command==='tool:base-polygon'||command==='tool:base-rectangle'||command==='tool:base-ellipse'){
    if(command==='tool:base-rectangle')setShape('rectangle')
    if(command==='tool:base-ellipse')setShape('ellipse')
    setBasePolygonOpen(true)
    setMode('edit')
    setNotice('Base Polygon: review the selected shape and exact dimensions. Create adds a native Rust pattern; Undo reverses the result.')
   }
   else if(command==='duplicate-selected'&&!busy&&selected?.panel)void edit({kind:'Duplicate',panel:selected.panel})
   else if(command==='trace-selected'&&!busy&&selected?.panel){
    if(running.current||playing){setNotice('Pause native simulation before tracing a source contour.');return}
    void (async()=>{
      const result=await request({op:'trace-contour',panel:selected.panel,revision:state.current?.revision})
      if(!result)return
      const traced=result.template?.panels?.at(-1)
      if(traced?.id)setSelected({panel:traced.id})
      setNotice('Trace created an independent straight-edge native pattern. Undo restores the prior draft; curves and holes are rejected.')
    })()
   }
   else if(command==='mirror-selected'&&!busy&&selected?.panel)void edit({kind:'Mirror',panel:selected.panel,axis:'x',copy_side:1})
   else if(command==='delete-selected'&&!busy&&selected?.panel){
    if(window.confirm('Remove the selected ClothCraft panel, its seams and attached imported hardware? Native Undo restores them together.'))void edit({kind:'RemovePanel',panel:selected.panel})
   }
   else if(command==='analysis:strain'||command==='analysis:surface')setAnalysisMode(command.slice(9))
   else if(command==='wireframe')setWireframe(x=>!x)
   else if(command==='seams')setShowSeams(x=>!x)
   else if(command==='avatar')setShowAvatar(x=>!x)
   else if(typeof command==='string'&&command.startsWith('set-wireframe:'))setWireframe(command.endsWith('true'))
   else if(typeof command==='string'&&command.startsWith('set-seams:'))setShowSeams(command.endsWith('true'))
   else if(typeof command==='string'&&command.startsWith('select:')){
    const id=command.slice(7).toLowerCase()
    if(id==='none'){setSelected(null);setHovered(null);return}
    const matching=state.current?.template?.panels.find(p=>p.id.toLowerCase()===id||p.name.toLowerCase()===id)
    if(matching)setSelected({panel:matching.id})
   }
   else if(typeof command==='string'&&command.startsWith('mode:')){setMode(command.slice(5));setPair([])}
  }
 useEffect(()=>{
  if(!embedded)return undefined
  const dispatch=event=>embeddedCommandDispatchRef.current?.(event)
  window.addEventListener('exo-clothcraft-command',dispatch)
  return()=>window.removeEventListener('exo-clothcraft-command',dispatch)
 },[embedded])
 useEffect(()=>{
  if(!embedded)return undefined
  const handle=event=>{
   const command=event.detail?.command
   if(!command)return
   if(exoLayout!=='2d'&&!patternFocus&&!['grade-table','grade-compare'].includes(command))return
   if(command==='custom-grade-tool'){const toolId=event.detail?.toolId;if(!OPTITEX_GRADE_TOOLS_20261027.some(tool=>tool[0]===toolId))return;setGradePanelTarget(selected?.panel||s?.template?.panels?.[0]?.id||'');setGradeMode('manual');setGradeStudioTab('rules');window.__exoPendingGradeTool=toolId;window.dispatchEvent(new CustomEvent('exo-clothcraft-grading-toolbar-command',{detail:{toolId}}));}
   else if(command==='f7-size-evolution'){
     setGradePanelTarget(selected?.panel||s?.template?.panels?.[0]?.id||'')
     setGradeMode('manual');setGradeStudioTab('evolution')
     // F7 can be invoked while the grading panel is not yet mounted.
     window.__exoPendingF7Action=event.detail?.action
     window.dispatchEvent(new CustomEvent('exo-clothcraft-f7-action',{detail:{action:event.detail?.action}}))
   }
   else if(command==='grade-manual'){setGradePanelTarget(selected?.panel||s?.template?.panels?.[0]?.id||'');setGradeMode('manual');setGradeStudioTab('rules')}
   else if(command==='grade-auto'){setGradePanelTarget(selected?.panel||s?.template?.panels?.[0]?.id||'');setGradeMode('auto');setGradeStudioTab('resize')}
   else if(command==='grade-table'){setGradePanelTarget(selected?.panel||s?.template?.panels?.[0]?.id||'');setGradeBottomTableOpen(value=>!value)}
   else if(command==='grade-compare'){setGradePanelTarget(selected?.panel||s?.template?.panels?.[0]?.id||'');setGradeBottomCompareOpen(value=>!value)}
   else if(command==='open-construction-guides'){setMode('edit');setConstructionOpen(true)}
   else if(command==='walk-seam'){setWalkSeamId(s?.template?.seams?.[0]?.id||'');setWalkOpen(true)}
   else if(command==='pattern-qa')runPatternAudit()
   else if(command==='cut-room-study')runNativeCutRoomStudy()
   else if(command==='toggle-native-nest'){
     // Pin all six graded outlines without requiring the grading dialog open.
     // Both the 2D toolbar and saved Nest button use this single native state.
     setGradeNestEnabled(!(gradeNestEnabled&&(Boolean(gradeMode)||gradeNestPinned)))
     setGradeNestPinned(true)
     setGradeNestAllSizes(true)
     setGradeNestAllBlocks(true)
     setGradeNestShowPoints(true)
     // The grading table and Size Evolution tools can leave a single-size
     // visibility filter active. Nest must override that view filter so
     // every XS–XXL outline is actually rendered on every eligible panel.
     setGradeTableVisibleSizes(['XS','S','M','L','XL','XXL'])
     setGradeStackPointIndex(null)
   }
   else if(command==='print-panel')exportTiledPattern('A4')
   else if(command==='pieces-panel'){setModaris2DSideTab('inspector');setModarisPatternGroup('pieces')}
   else if(command==='dependencies-panel'){setModaris2DTab('dependencies');setModarisPatternGroup('commands');setModaris2DOpen(true)}
   else if(command==='industrial-panel'){setModaris2DTab('industrial');setModarisPatternGroup('commands');setModaris2DOpen(true)}
   else if(command==='commands-panel'){setModaris2DTab('tools');setModarisPatternGroup('commands');setModaris2DOpen(true)}
   else if(command?.startsWith('native:'))window.dispatchEvent(new CustomEvent('exo-clothcraft-toolbar-activated',{detail:{nativeAction:command==='native:A08'?'pattern2d.notch':'pattern2d.seamAllowance'}}))
   else if(['tool:base-polygon','mode:edit','mode:line','mode:sew','export'].includes(command))window.dispatchEvent(new CustomEvent('exo-clothcraft-command',{detail:command}))
  }
  window.addEventListener('exo-clothcraft-pattern-studio-command',handle)
  return()=>window.removeEventListener('exo-clothcraft-pattern-studio-command',handle)
 },[embedded,exoLayout,patternFocus,selected,s,gradeNestEnabled,gradeMode,gradeNestPinned])
 useEffect(()=>{
  if(!embedded||!s)return
  const sendTechpack=()=>window.dispatchEvent(new CustomEvent('exo-clothcraft-techpack-snapshot',{
    detail:{...s,nativePOMDefinitions,nativePOMRuleSet:nativeGradeRules}
  }))
  window.addEventListener('exo-clothcraft-techpack-request',sendTechpack)
  return()=>window.removeEventListener('exo-clothcraft-techpack-request',sendTechpack)
 },[embedded,s,nativePOMDefinitions,nativeGradeRules])
 useEffect(()=>{
  if(!embedded||!s)return
  const panelRefs=(s.template?.panels||[]).map(p=>({
    id:p.id,name:p.name,type:'pattern',itemNo:s.propertyMetadata?.panels?.[p.id]?.itemNo||'',
    fabricId:p.fabric,
  }))
  const fabricRefs=(s.template?.fabrics||[]).map(f=>({
    id:f.id,name:f.name,type:'fabric',itemNo:s.propertyMetadata?.fabrics?.[f.id]?.itemNo||'',
    construction:s.propertyMetadata?.fabrics?.[f.id]?.construction||'',
    supplier:s.propertyMetadata?.fabrics?.[f.id]?.supplier||'',
    owner:s.propertyMetadata?.fabrics?.[f.id]?.owner||'',
    appearance:s.propertyMetadata?.fabrics?.[f.id]?.appearance||null,
    properties:f.properties||null,
  }))
  const measuredSelection=measureNativeSelection(s,selected)
  const activePanel=panelRefs.find(p=>p.id===measuredSelection?.panelId)
  window.dispatchEvent(new CustomEvent('exo-clothcraft-status',{detail:{
   name:s.template?.name||'ClothCraft garment',referenceKey:graphicsDocumentKey,revision:s.revision||0,avatarModel:s.avatarModel||'makehuman-base',
   panels:s.template?.panels?.length||0,seams:s.template?.seams?.length||0,
   panelRefs,fabricRefs,
   graphicRefs:nativeGraphics.map(graphic=>({id:graphic.id,name:graphic.name,
     panel:graphic.panel,widthMm:graphic.widthMm,heightMm:graphic.heightMm,visible:graphic.visible,
     thumbnail:graphicThumbnailCache.current.get(graphic.id)?.source===graphic.dataUrl?graphicThumbnailCache.current.get(graphic.id)?.thumbnail:null})),
   selectedGraphicId,
   showGraphicMeasurements,
   importedHardware:(s.importedHardware||[]).map(entry=>({...entry,name:cloAssetsById.get(entry.assetId)?.name||entry.assetId,
     sourcePath:cloAssetsById.get(entry.assetId)?.sourcePath||'',
     thumbnail:cloAssetsById.get(entry.assetId)?.thumbnail||'',
     glbUrl:cloAssetsById.get(entry.assetId)?.glb||'',
     dimensionsMm:importedCloHardwareDimensions(cloAssetsById.get(entry.assetId))})),
   canUndoHardware:Boolean(s.canUndoHardware),canRedoHardware:Boolean(s.canRedoHardware),
   seamRefs:s.template?.seams?.map(seam=>({id:seam.id,first:seam.a?.panel,second:seam.b?.panel}))||[],
   seamMeasurements:s.template?.seams?.map(seam=>measureNativeSelection(s,{seamId:seam.id})).filter(Boolean)||[],
   vertices:s.positions?.length||0, time:s.time||0,running:playing,busy,mode,
   canUndo:Boolean(s.canUndo),canRedo:Boolean(s.canRedo),
   selection:measuredSelection?{...measuredSelection,itemNo:activePanel?.itemNo||''}:null,
  }}))
 },[embedded,playing,busy,mode,selected?.panel,selected?.edge,selected?.seamId,s?.revision,s?.positions,s?.propertyMetadata,s?.template?.name,s?.template?.panels?.length,s?.template?.fabrics,s?.template?.seams?.length,s?.canUndo,s?.canRedo,s?.importedHardware,cloAssetsById,nativeGraphics,selectedGraphicId,showGraphicMeasurements,graphicThumbnailVersion,Math.floor(s?.time||0)])
 useEffect(()=>{
  if(!embedded)return
  const open=()=>setFoamOpen(true)
  window.addEventListener('exo-clothcraft-open-foam-padding',open)
  return()=>window.removeEventListener('exo-clothcraft-open-foam-padding',open)
 },[embedded])
 const focusDock=(patternFocus||embedded&&exoLayout==='2d')&&<aside className="cc-pattern-focus-dock exo-pattern-third-toolbar" aria-label="2D pattern studio toolbar" data-pattern-focus-dock="true">
  <div className="cc-pattern-focus-heading"><Grid2X2 size={18}/><div><strong>PATTERN STUDIO</strong><small>2D drafting & grading</small></div><button type="button" onClick={exitPatternFocus} aria-label="Exit full-screen 2D pattern studio" title="Exit pattern studio"><Minimize2 size={18}/></button></div>
  <nav className="exo-pattern-third-tabs" role="tablist" aria-label="Pattern Studio tool families">{[['editing','Editing'],['pieces','Pieces'],['commands','F1–F8'],['output','Output']].map(([id,label])=><button key={id} type="button" role="tab" aria-selected={modarisPatternGroup===id} onClick={()=>setModarisPatternGroup(id)}>{label}</button>)}</nav>
  {modarisPatternGroup==='pieces'&&<div className="cc-pattern-focus-summary"><span>{s?.template?.panels?.length??0} pattern pieces</span><span>Revision {s?.revision??'—'}</span></div>}
  {modarisPatternGroup==='pieces'&&<div className="cc-pattern-focus-section"><h3>PATTERN PIECES</h3><div className="cc-pattern-focus-pieces" role="group" aria-label="Select pattern piece">{(s?.template?.panels||[]).map((panel,index)=><button key={panel.id} type="button" className={selected?.panel===panel.id?'active':''} aria-pressed={selected?.panel===panel.id} onClick={()=>showPiece(panel.id)}><i style={{background:COLORS[index%COLORS.length]}}/>{panel.name}</button>)}</div></div>}
  {modarisPatternGroup==='commands'&&<div className="cc-pattern-focus-section" data-modaris-2d-visible-controls="true"><h3>MODARIS-STYLE 2D TOOLS</h3><button type="button" aria-expanded={modaris2DOpen} onClick={()=>setModaris2DOpen(value=>!value)}>{modaris2DOpen?'Hide':'Show'} drafting, grading and QA tools</button>{modaris2DOpen&&<><div role="group" aria-label="Modaris 2D tool groups"><button type="button" aria-pressed={modaris2DTab==='tools'} onClick={()=>setModaris2DTab('tools')}>F1–F8 commands</button><button type="button" aria-pressed={modaris2DTab==='dependencies'} onClick={()=>setModaris2DTab('dependencies')}>Measurements & dependencies</button><button type="button" aria-pressed={modaris2DTab==='industrial'} onClick={()=>setModaris2DTab('industrial')}>Industrial & 3D</button></div>{modaris2DTab==='tools'?<ModarisCommandStudio20261027 enableHotkeys={patternFocus||embedded&&exoLayout==='2d'} {...resolveModaris2DCommandCapabilities20261027({snapshot:s,selection:selected,full2D:patternFocus||embedded&&exoLayout==='2d',busy,playing,allow3DActions:false,actions:{select:()=>setMode('edit'),line:()=>setMode('line'),polygon:()=>setMode('pen'),'measurement-chart':()=>setConstructionOpen(true),'grade-chart':()=>{setGradeMode('auto');setGradeStudioTab('rules')},'grade-edit':()=>{setGradeMode('manual');setGradeStudioTab('rules')},sew:()=>setMode('sew'),'industrial-audit':runPatternAudit,cutline:runProductionCutlines,'view-2d':()=>embedded?onCollapse3D?.():setLayout('2d'),simulate:play,undo:()=>requestHistory('undo'),redo:()=>requestHistory('redo'),save:()=>save(false),export:()=>save(true)}})}/>:modaris2DTab==='dependencies'?<ModarisDependencyStudio20261027 snapshot={s} disabled={busy||playing||Boolean(s?.activeGradedSize)} onPreview={payload=>nativeSixSizeRegeneration(payload,false)} onCommit={payload=>nativeSixSizeRegeneration(payload,true)}/>:<ModarisIndustrialInterchangeStudio20261027 snapshot={s} disabled={busy||playing||Boolean(s?.activeGradedSize)} onAuditPattern={runPatternAudit} onGenerateCutlines={runProductionCutlines} onOpenGrading={()=>{setGradeMode('auto');setGradeStudioTab('quality')}} onOpenSewing={()=>setMode('sew')} onOpenVariant={()=>{setSection('Sewing');exitPatternFocus()}} onOpen3D={()=>{setLayout('split');exitPatternFocus()}} onDownloadProject={()=>save(true)} onDownloadPattern={exportPatternSvg} onDownloadDrape={exportClothObj} onAuditSixSizes={()=>runNativeSixSizeIndustrialAudit({sourceRevision:s?.revision,panelId:selected?.panel||s?.template?.panels?.[0]?.id})} onAuditSewing={()=>runNativeSixSizeSewingAudit({sourceRevision:s?.revision})}/>}</>}</div>}
  {modarisPatternGroup==='editing'&&<div className="cc-pattern-focus-section"><h3>EDITING</h3><button type="button" onClick={()=>{if(embedded)setBasePolygonOpen(true);else{setSection('Pattern');setMode('pen')}}} disabled={busy||playing||!s}><FilePlus2 size={14}/> {embedded?'Create native pattern':'Draw new pattern'}</button><button type="button" disabled={busy||playing||!s} onClick={()=>{setMode('edit');setConstructionOpen(true);setCurveStationOpen(false)}}><SlidersHorizontal size={14}/> Numerical point construction</button><button type="button" disabled={busy||playing||!s} onClick={()=>{setMode('edit');setCurveStationOpen(true);setConstructionOpen(false)}}><SlidersHorizontal size={14}/> Split at physical curve distance</button><button type="button" onClick={()=>{if(!embedded)setSection('Production');setGradePanelTarget(selected?.panel||s?.template?.panels?.[0]?.id||'');setGradeMode('manual')}} disabled={busy||playing||!s}><SlidersHorizontal size={14}/> {embedded?'Manual pattern grading':'Grading & size rules'}</button>{embedded&&<button type="button" onClick={()=>{setGradePanelTarget(selected?.panel||s?.template?.panels?.[0]?.id||'');setGradeMode('auto')}} disabled={busy||playing||!s}><SlidersHorizontal size={14}/> Auto pattern grading</button>}</div>}
  {modarisPatternGroup==='output'&&<div className="cc-pattern-focus-section"><h3>VALIDATION & PRINT</h3><button type="button" disabled={busy||playing||!s} onClick={()=>exportTiledPattern('A4')}><Download size={14}/> Tiled A4 · actual size</button><button type="button" disabled={busy||playing||!s} onClick={()=>exportTiledPattern('Letter')}><Download size={14}/> Tiled Letter · actual size</button><button type="button" disabled={busy||playing||!s} onClick={exportPatternSvg}><Download size={14}/> SVG reference</button><button type="button" disabled={busy||!s} onClick={runPatternAudit}><Activity size={14}/> Run native pattern QA</button><button type="button" disabled={busy||playing||!s} onClick={runNativeCutRoomStudy}><Factory size={14}/> Rust CUT marker / cut room QA</button><button type="button" disabled={busy||playing||!s||!s?.gradeRunPersisted||Boolean(s?.activeGradedSize)} onClick={()=>{setCutRoomStudy(null);setCutRoomOpen(true)}}><Factory size={14}/> Verified native graded order · all sizes</button></div>}
  <p className="cc-pattern-focus-warning">Engineering previews only. Not factory certified. Check sewing relationships, all sizes, physical print scale and destination CAD import before cutting.</p>
 </aside>
 useEffect(()=>{if(gradeMode)setGradeStudioTab(gradeMode==='auto'?'resize':'rules')},[gradeMode])
 const previewNativeOptitexGradeNotch=async({panelId,edgeId,t,depthMm})=>{
   const source=state.current
   if(!source?.template||source.gradeRunPersisted!==true||source.activeGradedSize||
      busy||playing||running.current||lock.current)
     return {ok:false,reason:'Restore the native base garment with a saved six-size catalog and pause editing.'}
   // An independently edited browser rule draft must match Rust before native
   // authoring. A source restored without a browser draft still has its real
   // durable Rust catalog: the native grade status + save are authoritative.
   if(nativeGradeRules){
     const checked=await checkNativeGradeCatalog()
     if(!checked?.ok||state.current?.revision!==source.revision)
       return {ok:false,reason:'Save or recover the matching native Rust six-size grading catalog first; an uncommitted rule draft cannot be silently overwritten.'}
   }else{
     const status=await request({op:'grade-run-status'})
     if(status?.persistedInProject!==true||state.current?.revision!==source.revision)
       return {ok:false,reason:'The real Rust six-size catalog was not verified; restore or save the native grade run before continuing.'}
   }
   const saved=await request({op:'save'})
   if(!saved?.project||state.current?.revision!==source.revision)
     return {ok:false,reason:'Rust did not provide a source-revision-matched saved six-size garment.'}
   return planOptitexNativeGradeNotch20261027({
     project:saved.project,sourceSnapshot:source,sourceRevision:source.revision,
     panelId,edgeId,t,depthMm,
   })
 }
 const commitNativeOptitexGradeNotch=async({preview,panelId,edgeId,t,depthMm})=>{
   const source=state.current
   if(!preview?.ok||!source||source.revision!==preview.sourceRevision||
     preview.command?.panel!==panelId||preview.command?.edge!==edgeId||
     Math.abs(preview.command?.t-t)>1e-10||
     Math.abs(preview.command?.depth_m-depthMm/1000)>1e-10||
     busy||playing||lock.current||running.current)
     return {ok:false,reason:'Grade Notch preview is stale or the native garment is busy; preview again.'}
   const updated=await request({op:'grade-notch-commit',revision:source.revision,
     panelId,edgeId,t,depthMm})
   const nativeNotchReceipt=updated?.gradeNotchReceipt
   if(!updated?.template||updated.revision!==source.revision+1||
     updated.gradeRunPersisted!==true||updated.gradeNotchCommitted!==true||
     nativeNotchReceipt?.panelId!==panelId||nativeNotchReceipt?.edgeId!==edgeId||
     Math.abs(nativeNotchReceipt?.t-t)>1e-10||
     Math.abs(nativeNotchReceipt?.depthMm-depthMm)>1e-10||
     JSON.stringify(nativeNotchReceipt?.sizes)!=='["XS","S","M","L","XL","XXL"]'||
     nativeNotchReceipt?.manufacturingApproved!==false)
     return {ok:false,reason:'Rust did not confirm a single-revision six-size native notch commit: '+
       (nativeGradeLastError.current||'review native history and retry only after inspection')}
   const saved=await request({op:'save'})
   if(!saved?.project||state.current?.revision!==updated.revision)
     return {ok:false,reason:'Rust changed the notch but the six-size durable save receipt could not be verified; inspect native history.'}
   const verified=verifyOptitexNativeGradeNotch20261027({
     plan:preview,project:saved.project,afterRevision:updated.revision,afterSnapshot:state.current,
   })
   if(!verified.ok)return verified
   const status=await request({op:'grade-run-status'})
   const recovered=status?.persistedInProject?
     recoverNativeGradeRules20261025(state.current,status):{ok:false}
   if(recovered.ok)commitNativeGradeRuleSet(recovered.ruleSet)
   else{
     nativeGradeRulesRef.current=null
     nativeGradeDraftHistory.current={undo:[],redo:[]}
     setGradeDraftHistoryRevision(value=>value+1)
     setNativeGradeRules(null)
     setNativeGradeRuleMessage('Native physical notch committed; recover the new six-size rule catalog before more point grading.')
   }
   setNativeGradeCatalogStatus(null)
   setNativeGradeCatalogMessage('Native Rust saved one physical notch across XS–XXL. Run independent all-size CUT and sewing audits before production release.')
   return verified
 }
 const gradeTablePanelId=s?.template?.panels?.find(p=>p.id===gradePanelTarget)?.id||s?.template?.panels?.find(p=>p.id===selected?.panel)?.id||s?.template?.panels?.[0]?.id||''
 const gradeDockProps={snapshot:s,ruleSet:nativeGradeRules,panelId:gradeTablePanelId,
   chartThemes:studioPreferences?.exoGradeChartThemes,
   selectedPointIndex:selected?.panel===gradeTablePanelId?selected.anchor:0,
   selectedSize:gradeNestSelectedSize,onSelectSize:size=>{
     setGradeNestSelectedSize(size)
     setGradeNestEnabled(true)
     setGradeNestPinned(true)
     setGradeNestAllSizes(true)
     setGradeTableVisibleSizes(previous=>previous.includes(size)?previous:[...previous,size])
   },
   onSelectContour:({panelId,edge,size})=>{
     if(!s?.template?.panels?.some(panel=>panel.id===panelId&&panel.polygon?.edges?.includes(edge)))return
     setGradePanelTarget(gradeTablePanelId)
     setSelected({panel:panelId,edge,kind:'edge'})
     if(size)setGradeNestSelectedSize(size)
     setGradeNestEnabled(true)
     setGradeNestPinned(true)
     setGradeNestAllBlocks(true)
     setGradeNestAllSizes(true)
   },
   onSelectPanel:panelId=>{
     if(!s?.template?.panels?.some(panel=>panel.id===panelId))return
     setGradePanelTarget(panelId)
     setSelected({panel:panelId,anchor:0})
     setGradeNestEnabled(true)
     setGradeNestPinned(true)
   },
   onSelectPoint:pointIndex=>setSelected({panel:gradeTablePanelId,anchor:pointIndex}),
   onApplyRuleSet:commitNativeGradeRuleSet,
   disabled:busy||playing||Boolean(s?.activeGradedSize),
   visibleSizes:gradeTableVisibleSizes,onVisibleSizesChange:sizes=>{
     setGradeTableVisibleSizes(sizes);setGradeNestEnabled(true);setGradeNestPinned(true)
     if(sizes.length>1)setGradeNestAllSizes(true)
   },
   colorsBySize:gradeTableColors,onColorsBySizeChange:setGradeTableColors,
   onCommitNativeCatalog:commitNativeGradeCatalog,onRecoverNativeCatalog:recoverNativeGradeCatalog,catalogMessage:nativeGradeCatalogMessage,
   onGradeTool:applyNativeOptitexGrading,
   onUndoGradeDraft:()=>restoreNativeGradeDraft('undo'),
   onRedoGradeDraft:()=>restoreNativeGradeDraft('redo'),
   canUndoGradeDraft:nativeGradeDraftHistory.current.undo.length>0,
   canRedoGradeDraft:nativeGradeDraftHistory.current.redo.length>0}
 const gradeBottomDock=<OptitexGradeBottomDock20261027
   openValues={gradeBottomTableOpen} openCompare={gradeBottomCompareOpen}
   onCloseValues={()=>setGradeBottomTableOpen(false)}
   onCloseCompare={()=>setGradeBottomCompareOpen(false)} tableProps={gradeDockProps}
   dockHost={gradeDockHost} innerDockHost={gradeInnerDockHost} topDockHost={gradeTopDockHost} onEmbedToolbar={target=>{
     setGradeQuickToolbarEmbedTarget(target)
     setGradeQuickToolbarEmbedRequest(count=>count+1)
     setGradeQuickToolbarOpen(true)
   }}/>
 const nativeGradingPortal=typeof document!=='undefined'&&createPortal(<CloFloatingPanel kind="grading" title={gradeMode==='auto'?'Auto Grading':'Pattern Grading'} open={Boolean(gradeMode)} active={true} onClose={()=>{setGradeMode('');window.dispatchEvent(new Event('exo-clothcraft-grading-panel-closed'))}}>
     <div ref={gradingScrollRef} className="clo-native-grading" data-native-grade-pattern="true" data-grading-variant={gradeMode} data-grade-step={gradeStudioTab} aria-label="Native pattern grading">
       <OptitexGradeToolbar20261027 snapshot={s} ruleSet={nativeGradeRules} panelId={gradePanelTarget}
         selectedPointIndex={selected?.panel===gradePanelTarget?selected.anchor:0}
         selectedSize={gradeNestSelectedSize} disabled={busy||playing||Boolean(s?.activeGradedSize)}
         onSelectPoint={pointIndex=>setSelected({panel:gradePanelTarget,anchor:pointIndex})}
         onSelectSize={setGradeNestSelectedSize}
         onApply={applyNativeOptitexGrading}
         onEnsureGradeRules={ensureNativeOptitexGradeRules}
         onShowBase={options=>applyNativeOptitexGrading('show-from-base-size',options)}
         onStackPoint={options=>applyNativeOptitexGrading('stack-point',options)}
         onOpenGradeTable={()=>setGradeBottomTableOpen(true)}
         onOpenCompareLength={()=>setGradeBottomCompareOpen(true)}
         onOpenGradeNotch={()=>{
           setGradeNotchEditorOpen(true)
           return {ok:true,notice:'Native physical Grade Notch editor opened. Preview and commit before source geometry changes.'}
         }}/>
       {gradeNotchEditorOpen&&<OptitexGradeNotchEditor20261027
         snapshot={s} panelId={gradePanelTarget}
         disabled={busy||playing||Boolean(s?.activeGradedSize)}
         onPreview={previewNativeOptitexGradeNotch} onCommit={commitNativeOptitexGradeNotch}
         onClose={()=>setGradeNotchEditorOpen(false)}/>}
       <div className="exo-grade-bottom-triggers" role="group" aria-label="Bottom grading analysis widgets">
         <button type="button" aria-pressed={gradeBottomTableOpen} onClick={()=>setGradeBottomTableOpen(v=>!v)}>Grading Table ↗</button>
         <button type="button" aria-pressed={gradeBottomCompareOpen} onClick={()=>setGradeBottomCompareOpen(v=>!v)}>Compare Length ↗</button>
       </div>
       <nav className="exo-grade-studio-nav" role="tablist" aria-label="Grading studio tools">
         {[
           ['resize','Resize'],['rules','Grade Points'],['pom','Measurements'],['nest','Size Nest'],
           ['quality','Seams & QA'],['evolution','F7 Sizes'],['export','Export'],
         ].map(([id,label])=><button key={id} role="tab" type="button" aria-selected={gradeStudioTab===id}
           aria-controls="exo-native-grade-studio-content" id={`exo-native-grade-tab-${id}`}
           onClick={()=>{if(gradingScrollRef.current)gradingScrollRef.current.scrollTop=0;setGradeStudioTab(id);if(id==='nest'){setGradeNestEnabled(true);setGradeNestPinned(true)}}}>
           {label}</button>)}
       </nav>
       <div className="exo-grade-studio-meta">
         <span>{s?.template?.panels?.length||0} pieces · {nativeGradeRules?.sizes?.length||6} sizes · source revision {s?.revision??'—'}</span>
         <em>{nativeGradeRules?'INDEPENDENT GRADE DRAFT':'AFFINE PREVIEW ONLY'}</em>
       </div>
       <div className="clo-floating-tool-body" id="exo-native-grade-studio-content" role="tabpanel" aria-labelledby={`exo-native-grade-tab-${gradeStudioTab}`}>
        <div className="exo-grade-studio-view" data-grade-view={gradeStudioTab}>
        {gradeStudioTab==='evolution'&&<ModarisF7SizeEvolution20261028 snapshot={s}
          ruleSet={nativeGradeRules} onChange={commitNativeGradeRuleSet}
          onNativeCommit={commitNativeF7CanonicalSizes}
          disabled={busy||playing||Boolean(s?.activeGradedSize)}/>}
        {gradeStudioTab==='evolution'&&<NativeGradeSizeCorrespondenceStudio20261028 snapshot={s}
          disabled={busy||playing} onInspect={inspectNativeF7Correspondence}
          onCommit={commitNativeF7Correspondence}/>}
        {gradeStudioTab==='resize'&&<>
         <p>Single-pattern resizing changes the native Rust source with Undo. This is not a linked six-size grading run.</p>
         <div className="clo-finishing-inset">
           <label className="clo-grading-row">
             <span>Pattern</span>
             <select aria-label="Pattern to grade" value={gradePanelTarget} onChange={event=>setGradePanelTarget(event.target.value)}>
               {(s?.template?.panels||[]).map(panel=><option key={panel.id} value={panel.id}>{panel.name}</option>)}
             </select>
           </label>
           {gradeMode==='auto'?<><label className="clo-grading-row">
             <span>Size step</span>
             <select aria-label="Auto grading increment" value={gradeStep} onChange={event=>setGradeStep(Number(event.target.value))}>
               <option value={-2}>Down two steps</option><option value={-1}>Down one step</option>
               <option value={1}>Up one step</option><option value={2}>Up two steps</option>
             </select>
           </label>
           <label className="clo-grading-row"><span>Width per size</span><div className="clo-grading-unit"><input aria-label="Grade width per size millimetres" type="number" step="0.1" value={gradeWidthStep} onChange={e=>setGradeWidthStep(e.target.value)}/><span>mm</span></div></label>
           <label className="clo-grading-row"><span>Height per size</span><div className="clo-grading-unit"><input aria-label="Grade height per size millimetres" type="number" step="0.1" value={gradeHeightStep} onChange={e=>setGradeHeightStep(e.target.value)}/><span>mm</span></div></label>
           </>:<>
             <label className="clo-grading-row">
               <span>Width change</span>
               <div className="clo-grading-unit">
                 <input aria-label="Grade width delta millimetres" type="number" min="-500" max="500" step="1"
                   value={gradeWidthDelta} onChange={event=>setGradeWidthDelta(event.target.value)}/>
                 <span>mm</span>
               </div>
             </label>
             <label className="clo-grading-row">
               <span>Height change</span>
               <div className="clo-grading-unit">
                 <input aria-label="Grade height delta millimetres" type="number" min="-500" max="500" step="1"
                   value={gradeHeightDelta} onChange={event=>setGradeHeightDelta(event.target.value)}/>
                 <span>mm</span>
               </div>
             </label>
           </>}
         </div>
  <div className="clo-grading-preview" aria-label="Grading dimensions preview">
           <span>Pattern size change</span>
           <strong>{Number.isFinite(Number(gradeWidth))?Number(gradeWidth):'—'} × {Number.isFinite(Number(gradeHeight))?Number(gradeHeight):'—'} mm</strong>
         </div>
         {gradePlan.before&&<div data-grade-dimensions="true">Before: {gradePlan.before.map(v=>v.toFixed(2)).join(' × ')} mm<br/>After: {gradePlan.after.map(v=>v.toFixed(2)).join(' × ')} mm <small>(compiled boundary estimate)</small></div>}
         {nativeGradeProposal?.ok&&<p role="status" data-native-grading-overlay-status={nativeGradeProposal.accuracy==='approximate'?'approximate':'ready'}>
           {nativeGradeProposal.accuracy==='approximate'
             ?'Approximate curved-pattern preview: sampled boundary positions may differ slightly from Rust. Amber outline, dashed base and point vectors show the proposed change; inspect the committed cutline after Apply.'
             :'Live on-pattern grade geometry: solid amber proposed outline, dashed base outline, X/Y displacement vectors and point labels. Rust changes the pattern only after Apply.'}
         </p>}
        </>}
        {(gradeStudioTab==='nest'||gradeStudioTab==='rules')&&<section aria-label="All-block graded nest proposals" data-native-grade-all-blocks="true" style={{display:'grid',gap:6,padding:'8px 0'}}>
           <strong>{gradeStudioTab==='nest'?'MULTI-SIZE GRADE NEST':'SIX-SIZE POINT RULE LIBRARY'}</strong>
           {gradeStudioTab==='rules'&&<p>Edit XS–XXL point movements in millimetres. The nest and QA recalculate automatically from these rules.</p>}
           {gradeStudioTab==='nest'&&<label><input type="checkbox" checked={gradeNestEnabled} onChange={event=>setGradeNestEnabled(event.target.checked)}/> Show graded outlines on pattern canvas</label>}
           {(gradeStudioTab==='rules'||gradeNestEnabled)&&<>
             {gradeStudioTab==='nest'&&<><label><input type="checkbox" checked={gradeNestAllBlocks} onChange={event=>setGradeNestAllBlocks(event.target.checked)}/> All pattern blocks (not just selected)</label>
             <label><input type="checkbox" checked={gradeNestAllSizes} onChange={event=>setGradeNestAllSizes(event.target.checked)}/> Show XS–XXL outlines together</label>
             <label><input type="checkbox" checked={gradeNestShowPoints} onChange={event=>setGradeNestShowPoints(event.target.checked)}/> Show per-size grade points and numbers</label>
             <label><input type="checkbox" checked={gradeNestShowVectors} onChange={event=>setGradeNestShowVectors(event.target.checked)}/> Show selected-size point movement vectors</label>
             <label>Highlighted proposed size<select aria-label="Native graded nest selected size" value={gradeNestSelectedSize} onChange={event=>setGradeNestSelectedSize(event.target.value)}>
               {['XS','S','M','L','XL','XXL'].map(size=><option key={size} value={size}>{size}</option>)}
             </select></label>
             <small role="status">{multiPanelGradeNest?.ok?
               `${Object.keys(multiPanelGradeNest.byPanel).length} pattern block(s) × ${nativeGradeRules?.sizes.length||6} named sizes. ${multiPanelGradeNest.issues.length} excluded. ${nativeGradeRules?'Independent per-point editable source-sidecar rules; these are NOT committed to Rust and do not affect current drape.':'Read-only per-panel affine previews; these are not independently authored size tables or native commits.'}`
               :`Named-size proposal unavailable: ${multiPanelGradeNest?.reason||'No valid run'}`}</small>
             {multiPanelGradeNest?.issues?.length>0&&<small>Excluded panels: {multiPanelGradeNest.issues.map(issue=>`${issue.panelId}: ${issue.reason}`).join(' · ')}</small>}
             {!nativeGradeRules&&gradeStudioTab==='nest'&&multiPanelGradeNest?.ok&&multiPanelGradeNest.byPanel[gradePanelTarget]&&
               <AccuMarkNativeGradePointInspector20261023
                 proposal={multiPanelGradeNest.byPanel[gradePanelTarget]}
                 selectedPointIndex={selected?.panel===gradePanelTarget?selected.anchor:null}
                 onSelectPoint={pointIndex=>pick({panel:gradePanelTarget,anchor:pointIndex})}/>}
             </>}
             {gradeStudioTab==='rules'&&<AccuMarkNativeRuleTableEditor20261023
               snapshot={s} ruleSet={nativeGradeRules} onChange={commitNativeGradeRuleSet}
               onClear={clearNativeGradeRuleSet} affineRun={affineMultiPanelGradeNest}
               panelId={gradePanelTarget} pointIndex={selected?.panel===gradePanelTarget?selected.anchor:null}
               onSelectPoint={pointIndex=>pick({panel:gradePanelTarget,anchor:pointIndex})}
               selectedSize={gradeNestSelectedSize} onSelectSize={setGradeNestSelectedSize}
               disabled={busy||playing}/>}
           </>}
         </section>}
         {gradeStudioTab==='pom'&&<>
           <NativeGradingPOMEditor20261025 snapshot={s}
             ruleSet={nativeGradeRules} definitions={nativePOMDefinitions}
             selectedId={selectedGradingPOMId} onSelect={setSelectedGradingPOMId}
             selectedSize={gradeNestSelectedSize} onSelectSize={setGradeNestSelectedSize}
             onChange={updateNativePOMDefinitions} selectedPanel={gradePanelTarget}
             onCommitNative={commitNativeF7PomTargets}
             disabled={busy||playing}/>
           <NativeGradedPomAudit20261027 snapshot={s}
             disabled={busy||playing} onRunAudit={runNativeGradedPomAudit}/>
           <NativeSixSizeRegeneration20261027 snapshot={s}
             disabled={busy||playing}
             onPreview={request=>nativeSixSizeRegeneration(request,false)}
             onCommit={request=>nativeSixSizeRegeneration(request,true)}/>
         </>}
         {gradeStudioTab==='quality'&&<><details data-grice-2d-3d-stage-review="true">
           <summary>2D → 3D preparation · seam, fabric and compiled mesh review</summary>
           <GriceModaris2Dto3DReadiness20261027 snapshot={s} disabled={busy||playing}/>
         </details><NativeSixSizeIndustrialAudit20261027 snapshot={s}
           disabled={busy||playing} onAudit={runNativeSixSizeIndustrialAudit}/>
         <NativeSixSizeSewingAudit20261027 snapshot={s}
           disabled={busy||playing} onAudit={runNativeSixSizeSewingAudit}/>
         <details data-native-facing-six-size-tool="true"><summary>Connected facing · native six-size physical candidate</summary>
           <NativeFacingCandidate20261027 snapshot={s} disabled={busy||playing}
             onReadProject={async ({sourceRevision})=>{
               if(state.current?.revision!==sourceRevision)throw Error('Native facing source changed before read.')
               const result=await request({op:'save',revision:sourceRevision})
               if(!result?.project?.template||state.current?.revision!==sourceRevision)
                 throw Error('Native saved six-size facing source is unavailable or stale.')
               return result.project
             }} onNativePreview={async ({sourceRevision,parentPanelId,parentEdgeId,facingId,depthMm,allowanceMm})=>{
               if(state.current?.revision!==sourceRevision)throw Error('Native facing source changed before Rust preview.')
               const result=await request({op:'facing-dependency-preview',revision:sourceRevision,
                 parentPanelId,parentEdgeId,facingId,depthMm,allowanceMm})
               if(state.current?.revision!==sourceRevision||result?.sourceRevision!==sourceRevision)
                 throw Error('Stale source revision after native Rust facing preview.')
               return result
             }} onInstall={async ({sourceRevision,parentPanelId,parentEdgeId,facingId,depthMm,allowanceMm})=>{
               if(state.current?.revision!==sourceRevision)
                 throw Error('Native document changed after the reviewed facing preview.')
               const result=await request({op:'facing-dependency-install',revision:sourceRevision,
                 parentPanelId,parentEdgeId,facingId,depthMm,allowanceMm})
               if(!result?.template||!result?.nativeFacingDependency)
                 throw Error('Rust did not confirm a saved facing dependency; inspect the native revision before retrying.')
               return result
             }}/>
         </details>
         <NativeGradingQualityDashboard20261025 snapshot={s}
           ruleSet={nativeGradeRules} selectedSize={gradeNestSelectedSize}
           onSelectSize={setGradeNestSelectedSize}
           editingDisabled={busy||playing} onApplyGradeRules={commitNativeGradeRuleSet}
           pomDefinitions={nativePOMDefinitions} nativeCatalog={nativeGradeCatalogStatus}
           onGoRules={()=>setGradeStudioTab('rules')}
           onGoMeasurements={({id,size}={})=>{
             if(id)setSelectedGradingPOMId(id)
             if(size)setGradeNestSelectedSize(size)
             setGradeStudioTab('pom')
           }}/></>}
         {gradeStudioTab==='export'&&<>
           <NativeGradeCatalogPersistence20261025 ruleSet={nativeGradeRules}
             catalogStatus={nativeGradeCatalogStatus} message={nativeGradeCatalogMessage}
             disabled={busy||playing} onCommit={commitNativeGradeCatalog}
             onCheck={checkNativeGradeCatalog} onClear={clearNativeGradeCatalog}
             onRecover={recoverNativeGradeCatalog}
             activeSize={s?.activeGradedSize} previewSize={gradeNestSelectedSize}
             runtimeReady={s?.nativeGradeActivationSupported===true}
             onChoosePreviewSize={setGradeNestSelectedSize}
             onActivate={activateSavedNativeGradeSize} onRestore={restoreOriginalNativeGradeSize}/>
           {!s?.activeGradedSize?<NativeGradingReleaseChecklist20261025 snapshot={s} ruleSet={nativeGradeRules}
             pomDefinitions={nativePOMDefinitions} nativeCatalog={nativeGradeCatalogStatus}
             inspectionDisabled={busy||playing}
             onRequestNativeCutInspection={async()=>{
               const before=state.current
               if(!before?.template||!nativeGradeRules)throw Error('Current native grade source or rules are unavailable')
               // Both replies come from the active native Rust session and
               // must describe the same immutable base source revision.
               const status=await request({op:'grade-run-status',revision:before.revision})
               const proof=await request({op:'grade-run-cutlines',revision:before.revision})
               if(state.current?.revision!==before.revision)throw Error('Native garment changed during the physical CUT inspection')
               const audited=inspectNativeGradeAuthenticCutBundle20261026(
                 before,nativeGradeRules,status,proof,{liveRustRpc:true})
               if(!audited.ok)throw Error(`Native six-size CUT review failed: ${audited.reason||audited.code}`)
               return {...proof,structuralAudit:audited}
             }}/>:
             <NativeGradedFitEvidence20261025 snapshot={s}/>}
           <p>Native sized 2D/3D fitting is a reversible engineering preview; factory cutting and independently accepted graded DXF remain blocked.</p>
           {!s?.activeGradedSize&&nativeGradeRules?<AccuMarkNativeUnifiedWorkflow20261024
               snapshot={s} ruleSet={nativeGradeRules} disabled={busy||playing}
               onRequestCutProof={()=>request({op:'production-cutlines'})}
               onCaptureSavedProject={async()=>{
                 const result=await request({op:'save'})
                 if(!result?.project?.template)throw Error('Rust did not return a complete saved garment')
                 return result.project
               }}/>:<p role="status">Create independent size rules under Grade Points before exporting a graded proposal.</p>}
           <div className="clo-grading-actions">
             <button type="button" disabled={busy||playing||!s||Boolean(s?.activeGradedSize)} onClick={()=>exportTiledPattern('A4')}>Base CUT · A4</button>
             <button type="button" disabled={busy||playing||!s||Boolean(s?.activeGradedSize)} onClick={()=>exportTiledPattern('Letter')}>Base CUT · Letter</button>
             <button type="button" disabled={busy||playing||!s||Boolean(s?.activeGradedSize)} onClick={exportPatternSvg}>Base reference SVG</button>
           </div>
         </>}
         {gradeStudioTab==='resize'&&<>
         {gradePlan.ok&&nativeGradeProposal&&!nativeGradeProposal.ok&&<p role="status" data-native-grading-overlay-status="unavailable">Exact on-pattern preview unavailable: {nativeGradeProposal.reason}. Rust grading remains available; review dimensions and apply only after checking the result.</p>}
         {!gradePlan.ok&&<p role="status" data-grade-validation="true">{gradePlan.reason}</p>}
         {gradePlan.ok&&gradePlan.industrialCutlineBlockedReason&&<p role="status" data-native-grade-manufacturing-blocker="true">{gradePlan.industrialCutlineBlockedReason}</p>}
         {gradePlan.seams>0&&<p role="status">This panel has {gradePlan.seams} sewing relationships. Grade matching pieces and check seam lengths; this is not a linked size run.</p>}
         <p className="clo-grading-note">Rust single-panel affine grading now preserves actual contour points, cubic/free curve controls, internal Bézier guides and qualified straight hole rims, with native Undo and saved history. Notch depths and allowance widths remain metric. Multi-piece linked sizing, topology-aware industrial CUT output for holes/guides and factory approval still require further work.</p>
         <div className="clo-grading-actions">
           <button type="button" disabled={busy||playing||!s} onClick={()=>exportTiledPattern('A4')}>Tiled A4</button>
           <button type="button" disabled={busy||playing||!s} onClick={()=>exportTiledPattern('Letter')}>Tiled Letter</button>
         </div>
         <div className="clo-grading-actions">
           <button type="button" disabled={busy||playing||!s} onClick={exportPatternSvg} title="Export the current applied pattern boundaries, not an unapplied grading preview">Export reference sheet</button>
           <button type="button" onClick={()=>{setGradeMode('');window.dispatchEvent(new Event('exo-clothcraft-grading-panel-closed'))}}>Cancel</button>
           <button type="button" className="clo-grade-primary" data-native-grade-apply="true"
             disabled={busy||playing||!gradePlan.ok||Boolean(nativeGradeRules)}
             onClick={async()=>{
               const panel=state.current?.template?.panels?.find(p=>p.id===gradePanelTarget)
               if(!panel){setError('Select a valid native pattern first.');return}
               const expectedRevision=gradePlan.revision
               while(lock.current)await new Promise(resolve=>setTimeout(resolve,20))
               if(state.current?.revision!==expectedRevision){setError('Pattern changed while grading. Review the updated dimensions and apply again.');return}
               const checked=nativeGradePlan(state.current,panel.id,gradeWidth,gradeHeight)
               if(!checked.ok){setError(checked.reason);return}
               const {width,height}=checked
               const result=await request({op:'grade-pattern',panel:panel.id,width_delta_mm:width,height_delta_mm:height})
               if(result){
                 setNotice(`Graded ${panel.name} ${width>=0?'+':''}${width} mm wide, ${height>=0?'+':''}${height} mm high. Rust Undo restores its original dimensions.`)
                 setGradeMode('')
                 window.dispatchEvent(new Event('exo-clothcraft-grading-panel-closed'))
               }
             }}>Apply Grading</button>
         </div>
         </>}
         {nativeGradeRuleMessage&&gradeStudioTab!=='resize'&&<small role="status">{nativeGradeRuleMessage}</small>}
        </div>
       </div>
       {optitexGradeMessage&&<p role="status" className="optitex-native-grade-message">{optitexGradeMessage}</p>}
     </div>
   </CloFloatingPanel>,document.body)
 const restoreQuickGradingToolbar=()=>{
   setGradeQuickToolbarEmbedTarget('floating')
   setGradeQuickToolbarEmbedRequest(request=>request+1)
   setGradeQuickToolbarOpen(true)
 }
 useEffect(()=>{
   const entering2D=Boolean(embedded&&(patternFocus||exoLayout==='2d'))
   if(entering2D&&!gradeQuickToolbarWasIn2DRef.current){
     restoreQuickGradingToolbar()
   }
   // Closing the toolbar manually while already in 2D remains respected.
   // Returning to 2D from split/3D always restores it on that new entry.
   gradeQuickToolbarWasIn2DRef.current=entering2D
 },[embedded,patternFocus,exoLayout])
 if(embedded){
  const layout=patternFocus?'2d':exoLayout==='3d'?'3d':exoLayout==='2d'?'2d':exoLayout==='stack'?'stack':'split'
  const nativeFabricPanel=inspectorFabricId
    ?s?.template?.panels?.find(p=>p.fabric===inspectorFabricId)||null
    :selectedPanel||s?.template?.panels?.[0]||null
  return <div ref={workspaceRoot} className={`cc-embedded-root cc-embedded-${layout} ${patternFocus?'cc-pattern-studio-focus':''} ${studio3DFullscreenActive?'cc-3d-studio-focus':''} ${animationWorkspaceActive?'cc-animation-workspace-active':''} ${printLayoutActive?'cc-print-layout-workspace-active':''}`} aria-label="ClothCraft linked native Rust 3D and 2D editors" data-native-clothcraft="true" data-exo-cad-collapsed={String(layout==='2d'&&cadInspectorCollapsed)} style={{'--cc-embedded-split':`${exoSplit}%`}}>
   {layout==='2d'&&!cadInspectorCollapsed&&<nav className="exo-modaris-side-tabs" aria-label="2D CAD navigator tabs"><button type="button" aria-pressed={modaris2DSideTab==='inspector'} onClick={()=>setModaris2DSideTab('inspector')}>Properties</button><button type="button" aria-pressed={modaris2DSideTab==='geometry'} onClick={()=>setModaris2DSideTab('geometry')}>Geometry tree</button><button type="button" aria-pressed={modaris2DSideTab==='shortcuts'} onClick={()=>setModaris2DSideTab('shortcuts')}>Hotkeys</button><button type="button" aria-pressed={modaris2DSideTab==='precision'} onClick={()=>setModaris2DSideTab('precision')}>Precision</button>{modaris2DSideTab!=='inspector'&&<button type="button" className="exo-modaris-collapse-tab" aria-label="Collapse EXO CAD panel" aria-expanded={true} title="Collapse EXO CAD panel" onClick={()=>setCadInspectorCollapsed(true)}>‹</button>}</nav>}
   {layout==='2d'&&cadInspectorCollapsed&&modaris2DSideTab!=='inspector'&&<aside className="exo-cad-mini-rail" data-exo-cad-mini-rail="true" aria-label="EXO CAD panel collapsed"><button type="button" aria-label="Expand EXO CAD panel" aria-expanded={false} title="Expand EXO CAD panel" onClick={()=>setCadInspectorCollapsed(false)}>›</button><span aria-hidden="true">EXO CAD</span></aside>}
   {layout==='2d'&&!cadInspectorCollapsed&&modaris2DSideTab==='precision'&&<ModarisPrecisionInspector20261027 snapshot={s} selection={selected} disabled={busy||playing} fullWidth2D actions={{selectPoint:({panel,anchor})=>{setSelected({panel,anchor});setHovered(null)},selectEdge:({panel,edge})=>{setSelected({panel,edge});setHovered(null)}}}/> }
   {layout==='2d'&&!cadInspectorCollapsed&&modaris2DSideTab==='geometry'&&<ModarisGeometryNavigator20261027 snapshot={s} selection={selected} disabled={busy||playing} fullWidth2D actions={{selectPiece:({panel})=>showPiece(panel),selectPoint:({panel,anchor})=>{setSelected({panel,anchor});setHovered(null)},selectEdge:({panel,edge})=>{setSelected({panel,edge});setHovered(null)},selectSeam:({panel,edge,seamId})=>{setSelected({panel,edge,seamId,kind:'sewing'});setHovered(null)}}}/>}
   {layout==='2d'&&!cadInspectorCollapsed&&modaris2DSideTab==='shortcuts'&&<ModarisCadHotkeyGuide20261027 full2DFocus actions={{select:()=>setMode('edit'),line:()=>setMode('line'),polygon:()=>setMode('pen'),'grade-chart':()=>{setGradeMode('auto');setGradeStudioTab('rules')},'grade-edit':()=>{setGradeMode('manual');setGradeStudioTab('rules')},sew:()=>setMode('sew'),'industrial-audit':runPatternAudit,cutline:runProductionCutlines,save:()=>save(false),export:()=>save(true)}} capabilities={{select:true,line:true,polygon:true,'grade-chart':true,'grade-edit':true,sew:true,'industrial-audit':true,cutline:true,save:true,export:true}} disabled={busy||playing||!s}/>}
   {layout==='2d'&&modaris2DSideTab==='inspector'&&<ModarisProfessionalPanels20261027 snapshot={s} selection={selected} disabled={busy||playing} collapsed={cadInspectorCollapsed} onToggleCollapsed={()=>setCadInspectorCollapsed(v=>!v)} actions={{selectPiece:({panel})=>showPiece(panel),selectPoint:({panel,anchor})=>{setSelected({panel,anchor});setHovered(null)},selectSeam:({seamId,panel,edge})=>{setSelected({seamId,panel,edge,kind:'sewing'});setMode('sew')},grade:({panel})=>{setGradePanelTarget(panel||s?.template?.panels?.[0]?.id||'');setGradeMode('manual')},gradeAudit:()=>{setGradeMode('manual');setGradeStudioTab('quality')},industrialAudit:()=>runPatternAudit(),sewingAudit:()=>runNativeSixSizeSewingAudit({sourceRevision:s?.revision}),cutlines:()=>runProductionCutlines(),export:()=>exportPatternSvg()}}/>}
   {cutRoomOpen&&<CloFloatingPanel kind="native-cut-room-qa" title="Native Rust CUT · Graded Marker and Cut Room Study" open active onClose={()=>setCutRoomOpen(false)}>
     <div style={{padding:12,overflow:'auto',maxHeight:'72vh'}}>
       {cutRoomStudy&&<><p>Read-only BASE-size physical CUT outlines produced by Rust revision {cutRoomStudy.sourceRevision}. This section is not an approved graded cutting order.</p><AccuMarkProductionControls project={cutRoomStudy.project}/></>}
       <NativeVerifiedProductionOrder20261029 nativeBase={BASE} nativeRevision={s?.revision} disabled={busy||playing||Boolean(s?.activeGradedSize)}/>
     </div>
   </CloFloatingPanel>}
   <input ref={nativeOpenInput} data-native-project-import="true" type="file" accept=".json,application/json" hidden onChange={importFile}/>
   <ClothCraftContextMenu context={contextMenu} items={contextItems} onChoose={executeContextAction} onClose={()=>setContextMenu(null)}/>
   {(error||notice)&&<div className={error?'cc-error':'cc-notice'} role="status">{error||notice}<button onClick={()=>{setError('');setNotice('')}}>×</button></div>}
   <CloFloatingPanel kind="numerical-construction" title="2D Numerical Construction" open={constructionOpen} active={true} onClose={()=>{setConstructionOpen(false);setNativeConstructionPreview(null)}}>
     <NativePatternConstructionTools20261023 snapshot={s} selected={selected} disabled={busy||playing||Boolean(nativeGradeRules)}
       onSelect={point=>{setSelected(point);setHovered(null)}} onPreview={setNativeConstructionPreview}
       onPersistBindings={async payload=>{
         if(busy||playing||nativeGradeRules||running.current||lock.current||!state.current){
           setError('Finish native editing and restore the base grade before saving point bindings.');return null
         }
         const saved=await request({op:'bindings-store',nativeBindings:payload})
         if(!saved?.nativePointBindings?.active)setError('Native measurement bindings could not be persisted against the current garment.')
         return saved
       }}
       onClearBindings={async()=>{
         if(busy||playing||nativeGradeRules||running.current||lock.current||!state.current){
           setError('The native workspace is busy; cannot clear the saved point bindings.');return null
         }
         return request({op:'bindings-clear'})
       }}
       onLoadNativeProject={async()=>{
         if(busy||playing||nativeGradeRules||running.current||lock.current||!state.current)return {ok:false,reason:'Native project is busy or has an active independent grade draft'}
         const revision=state.current.revision
         const saved=await request({op:'save'})
         if(!saved?.project||state.current?.revision!==revision)return {ok:false,reason:'Rust did not return a stable saved source project'}
         return {ok:true,project:saved.project,revision}
       }}
       onInspectNativeFabricEnvelope={async({revision}={})=>{
         if(busy||playing||running.current||lock.current||!state.current||state.current.revision!==revision)
           return {ok:false,reason:'Native envelope inspection refused: stale or busy source'}
         const data=await request({op:'fabric-grade-envelope-inspect'})
         return data?.nativeAuthoritative===true&&data.sourceRevision===revision?
           {ok:true,envelope:data.envelope,sourceRevision:data.sourceRevision}: {ok:false,reason:'Rust envelope inspection was not authoritative'}
       }}
       onStoreNativeFabricEnvelope={async({envelope,revision}={})=>{
         if(busy||playing||nativeGradeRules||running.current||lock.current||!state.current||
            state.current.revision!==revision||!envelope||typeof envelope!=='object')
           return {ok:false,reason:'Native fabric chart store refused: stale source, busy editor or invalid envelope'}
         const beforeRevision=revision
         const beforeSaved=await request({op:'save'})
         if(!beforeSaved?.project||state.current?.revision!==beforeRevision)
           return {ok:false,reason:'Native fabric chart store refused: no stable saved source to authenticate'}
         const after=await request({op:'fabric-grade-envelope-store',envelope})
         if(!after?.template||after.revision!==beforeRevision+1)
           return {ok:false,reason:'Native fabric chart store did not return one revision; inspect Undo before continuing'}
         const saved=await request({op:'save'})
         if(!saved?.project?.fabric_grade_envelope||state.current?.revision!==after.revision)
           return {ok:false,reason:'Rust committed a chart, but its native save receipt could not be verified; inspect before continuing'}
         const inspected=await request({op:'fabric-grade-envelope-inspect'})
         if(inspected?.nativeAuthoritative!==true||inspected.sourceRevision!==after.revision||
            !inspected.envelope?.perSizeChart)
           return {ok:false,reason:'Rust committed a chart, but native reinspection failed; inspect or Undo before continuing'}
         const witness=verifyNativePerSizeChartStore20261027({
           beforeProject:beforeSaved.project,afterProject:saved.project,
           authoredEnvelope:envelope,inspected,
           beforeRevision,afterRevision:after.revision,
         })
         if(!witness.ok)
           return {ok:false,reason:`Rust committed a chart but independent six-size saved-project witness failed: ${witness.reason}. Inspect or Undo before continuing`}
         return {ok:true,beforeRevision,after,project:saved.project,inspected,storeWitness:witness}
       }}
       onRegenerateNativeFabricChart={async({measurement,valueMm,revision}={})=>{
         if(busy||playing||nativeGradeRules||running.current||lock.current||!state.current||
            state.current.revision!==revision||!/^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(measurement)||
            !Number.isFinite(valueMm)||!state.current.fabricGradeEnvelope?.perSizeChart)
           return {ok:false,reason:'Native six-size regeneration refused: stale, unbounded or busy source'}
         const beforeRevision=revision
         const before=structuredClone(state.current)
         const overrides={[measurement]:valueMm}
         const preview=await request({op:'bindings-grade-regenerate-preview',revision,overrides})
         const review=verifyNativeSixSizePreview20261028(before,overrides,preview)
         if(!review.ok||state.current?.revision!==beforeRevision)
           return {ok:false,reason:`Native six-size preview rejected or source changed: ${review.reason||'stale source'}`}
         const after=await request({op:'bindings-grade-regenerate',overrides})
         const receipt=verifyNativeSixSizeCommit20261028(before,review,after)
         if(!receipt.ok)return {ok:false,reason:`Native recomputation receipt disagreed with Rust preview: ${receipt.reason}. Inspect/Undo before continuing`}
         const saved=await request({op:'save'})
         if(!saved?.project?.fabric_grade_envelope?.perSizeChart||
            state.current?.revision!==after.revision)
           return {ok:false,reason:'Rust committed six-size recomputation but saved chart could not be verified; inspect/Undo'}
         return {ok:true,beforeRevision,after,project:saved.project,preview}
       }}
       onApplyBindingBatch={async (proposal,stored)=>{
         if(!proposal?.ok||proposal.op!=='edit-batch'||!Array.isArray(proposal.commands)||
            proposal.commands.length<1||proposal.commands.length>32||!state.current||
            state.current.revision!==proposal.sourceRevision||running.current||lock.current||
            nativeGradeRules||playing||busy){
           setError('The linked measurement batch is stale or the native editor is busy. Review the source and try again.');return false
         }
         try {
           if(fingerprintNativePatternBindingsSource20261023(state.current)!==proposal.sourceFingerprint){
             setError('Native geometry changed since the saved measurement bindings; rebase the bindings before applying.');return false
           }
           if(!stored||stored.sourceFingerprint!==proposal.sourceFingerprint||
             stored.sourceRevision!==proposal.sourceRevision){
             setError('The grouped Rust edit is not bound to the saved measurement chart.');return false
           }
         }catch(error){setError(`Linked pattern source is invalid: ${error?.message||String(error)}`);return false}
         const panels=new Set()
         const invalid=proposal.commands.some(command=>{
           if(command.kind!=='AnchorGroup'||typeof command.panel!=='string'||panels.has(command.panel)||
             !Array.isArray(command.edits)||command.edits.length<1||command.edits.length>32)return true
           const points=new Set()
           for(const row of command.edits){
             if(!Array.isArray(row)||row.length!==2||!Number.isInteger(row[0])||row[0]<0||
               points.has(row[0])||!Array.isArray(row[1])||row[1].length!==2||
               !row[1].every(Number.isFinite))return true
             points.add(row[0])
           }
           panels.add(command.panel)
           return false
         })
         if(invalid||panels.size!==proposal.panelCount){
           setError('Invalid native linked-point group, duplicate target or mismatched panel count.');return false
         }
         const before=structuredClone({revision:state.current.revision,template:state.current.template})
         const result=await request({op:'edit-batch',commands:proposal.commands,
           nativeBindings:{measurements:stored.measurements,bindings:stored.bindings}})
         if(!result)return false
         if(result.revision!==before.revision+1||!result.template||
           result.nativePointBindings?.active!==true){
           setError('Unexpected native batch revision. Inspect the garment and Undo before exporting.');return false
         }
         setNotice(`Applied ${proposal.pointCount} linked measurement points across ${proposal.panelCount} panel(s) with one native Undo. Verifying source bindings; review sewing, grading and industrial cutlines.`)
         return {ok:true,before,after:{revision:result.revision,template:result.template,
           nativePointBindings:result.nativePointBindings}}
       }}
       onApplyNativeMeasurement={async payload=>{
         if(!payload||payload.op!=='bindings-measurement-recompute'||
            Object.keys(payload).length!==5||
            !['op','revision','measurement','expectedValueMm','valueMm'].every(key=>Object.hasOwn(payload,key))||
            !Number.isSafeInteger(payload.revision)||
            !/^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(payload.measurement)||
            !Number.isFinite(payload.expectedValueMm)||!Number.isFinite(payload.valueMm)||
            !state.current?.nativePointBindings?.active||
            state.current.revision!==payload.revision||
            busy||playing||nativeGradeRules||running.current||lock.current){
           setError('Native measurement recompute refused: stale source, invalid payload, busy editor or active grade.');return {ok:false}
         }
         const before=structuredClone(state.current)
         const result=await request(payload)
         if(!result?.template||result.revision!==before.revision+1||
            result.nativeMeasurementRecompute?.nativeAuthoritative!==true||
            result.nativePointBindings?.active!==true){
           setError('Native measurement transaction was not witnessed. Inspect the saved garment and Undo if a commit occurred.');return {ok:false}
         }
         return {ok:true,before,after:result}
       }}
       onApply={async proposal=>{
         if(!proposal?.ok||!s||state.current?.revision!==proposal.revision){setError('Numerical construction changed while open. Review the latest native pattern before applying.');return false}
         if(nativeGradeRules){setError('A source-linked graded rule draft is active. Export or remove the sidecar before changing this source geometry.');return false}
         if(running.current||lock.current){setError('Pause simulation or finish the active native edit before applying this construction.');return false}
         const panel=state.current.template.panels.find(p=>p.id===proposal.panelId)
         if(!panel||proposal.pointIndex>=panel.polygon?.points?.length){setError('The construction target has changed. Reselect the point.');return false}
         // If Rust has saved point-construction rules, a direct Anchor would
         // silently invalidate dependents. Route the same authorized numeric
         // source edit through one exact grouped native transaction instead.
         const routed=routeModarisNativeNumericalAnchor20261027(state.current,proposal)
         if(!routed.ok){
           setError(`Numerical construction refused to orphan saved native rules: ${routed.reason}`)
           return false
         }
         if(routed.mode==='linked-native'){
           const before=structuredClone(state.current)
           const result=await request({op:'edit-batch',commands:routed.batch.commands,
             nativeBindings:{measurements:routed.sidecar.measurements,bindings:routed.sidecar.bindings}})
           if(!result)return false
           const reviewed=witnessModarisNativeReferenceCommit20261027(
             before,result,routed.sidecar,routed.input,routed.batch)
           if(!reviewed.ok){
             throw Error(`Native grouped reference edit may already be committed but its dependent rules could not be verified: ${reviewed.reason}. Inspect the native garment and Undo before editing again.`)
           }
           setNotice(`Native numerical construction moved P${proposal.pointIndex+1} and updated ${routed.dependentCount} saved dependent point(s) in one Rust Undo revision ${reviewed.committedRevision}. All native rule positions were verified; sewing and graded fit require separate QA.`)
           return {ok:true,linked:true,dependentCount:routed.dependentCount,revision:reviewed.committedRevision}
         }
         const changed=await edit(proposal.command)
         if(!changed)return false
         setNotice(`Numerical construction moved ${panel.name} point ${proposal.pointIndex+1} by ${proposal.displacementMm.toFixed(2)} mm. Native Undo/Redo works; sewing and graded fit need revalidation.`)
         return true
       }}/>
   </CloFloatingPanel>
   <CloFloatingPanel kind="native-construction-guides" title="2D Internal Lines · Folds · Pleats · Darts"
     open={constructionGuidesOpen} active onClose={()=>setConstructionGuidesOpen(false)}>
    <NativeConstructionGuides20261025 snapshot={s} selected={selected}
      disabled={busy||playing||Boolean(nativeGradeRules)}
      onApply={async proposal=>{
       if(!proposal?.ok||!Array.isArray(proposal.guides)||proposal.guides.length<1||
         proposal.guides.length>64||!state.current||state.current.revision!==proposal.revision||
         busy||playing||nativeGradeRules||lock.current){
        setError('Construction guide proposal is stale, busy, or blocked by an active grading rule set.')
        return false
       }
       let committed=0,lastRevision=proposal.revision
       const expectedPanel=state.current.template.panels.find(item=>item.id===proposal.panelId)
       if(!expectedPanel){setError('Construction guide target panel has changed.');return false}
       for(const item of proposal.guides){
        if(state.current?.revision!==lastRevision||item.command?.panel!==proposal.panelId||
          item.command?.kind!=='InternalLine'){
          setError('Native construction guide transaction changed unexpectedly; undo/review before exporting.')
          return false
        }
        const result=await edit(item.command)
        if(!result?.template){
          // Native undo is one step per InternalLine, not a guaranteed atomic
          // batch. Restore the prefix of accepted commands and verify revision.
          let undoOk=true
          for(let n=0;n<committed;n++){
           const reverted=await request({op:'undo'})
           if(!reverted?.template){undoOk=false;break}
          }
          setError(undoOk?
            'Native construction rejected a guide. Previously added guides were undone; original cutline retained.':
            'Native guide failed and rollback was incomplete. Inspect Undo history before exporting.')
          return false
        }
        committed++
        lastRevision=result.revision
       }
       setNotice(`Saved ${committed} native ${proposal.kind} construction guide(s) on ${expectedPanel.name}. Physical cutlines unchanged. ${proposal.guides.length>1?'Undo each guide to remove the set.':''} Fold simulation, pleat sewing and dart intake still need separate validation.`)
       return true
      }}/>
   </CloFloatingPanel>
   <CloFloatingPanel kind="curve-station" title="2D Physical Curve Station" open={curveStationOpen} active={true} onClose={()=>{setCurveStationOpen(false);setNativeCurveStationPreview(null)}}>
     <NativeCurveStationTool20261023 snapshot={s} selected={selected} disabled={busy||playing||Boolean(nativeGradeRules)}
       onSelect={point=>{setSelected(point);setHovered(null)}} onPreview={setNativeCurveStationPreview}
       onApply={async proposal=>{
         if(!proposal?.ok||!s||state.current?.revision!==proposal.revision){setError('Curve station proposal became stale. Review the current source curve and retry.');return false}
         if(nativeGradeRules){setError('Export or reset the local graded rule sidecar before altering source edge topology.');return false}
         if(running.current||lock.current){setError('Finish the current native edit or pause simulation before splitting.');return false}
         const panel=state.current.template.panels.find(p=>p.id===proposal.panelId)
         if(!panel?.polygon?.edges?.includes(proposal.edge)){setError('Named curve is no longer present in the current native document.');return false}
         const changed=await edit(proposal.command)
         if(!changed)return false
         setSelected({panel:proposal.panelId})
         setNotice(`Split ${panel.name} edge ${proposal.edge} at ${proposal.stationMm.toFixed(2)} mm of measured curve arclength. Undo restores the original topology. Revalidate sewn edge IDs, grading and notches.`)
         return true
       }}/>
   </CloFloatingPanel>
   <CloFloatingPanel kind="dart-precision" title="Physical Dart Precision" open={dartPrecisionOpen} active={true} onClose={()=>{setDartPrecisionOpen(false);setNativeDartPrecisionPreview(null)}}>
     <NativeDartPrecisionTool20261023 snapshot={s} selected={selected} disabled={busy||playing||Boolean(nativeGradeRules)}
       onSelect={item=>{setSelected(item);setHovered(null)}} onPreview={setNativeDartPrecisionPreview}
       onApply={async proposal=>{
         if(!proposal?.ok||!s||state.current?.revision!==proposal.revision){setError('Dart proposal became stale. Review the current source edge before cutting.');return false}
         if(nativeGradeRules){setError('A source-linked graded rule sidecar is active. Reset or export it before changing pattern topology.');return false}
         if(running.current||lock.current){setError('Pause simulation or finish the active native edit before creating the dart.');return false}
         const current=state.current.template.panels.find(p=>p.id===proposal.panelId)
         if(!current?.polygon?.edges?.includes(proposal.edge)){setError('Dart source edge changed; reselect a live boundary.');return false}
         const changed=await edit(proposal.command)
         if(!changed)return false
         setSelected({panel:proposal.panelId})
         setNotice(`Created a physical ${proposal.intakeMm.toFixed(1)} mm intake cut-and-sewn dart on ${current.name}. Native Undo restores the contour. Check graded notches, trueing and sewing fit.`)
         return true
       }}/>
   </CloFloatingPanel>
   <CloFloatingPanel kind="physical-pleat" title="Experimental Physical Tuck / Pleat"
     open={physicalPleatOpen} active onClose={()=>{setPhysicalPleatOpen(false);setNativePhysicalPleatPreview(null)}}>
    <NativePhysicalPleatTool20261025 snapshot={s} selected={selected}
      disabled={busy||playing||Boolean(nativeGradeRules)}
      onPreview={setNativePhysicalPleatPreview}
      onSelect={value=>{setSelected(value);setHovered(null)}}
      onApply={async proposal=>{
       const before=state.current
       if(!proposal?.ok||!before||!Number.isInteger(proposal.count)||
         !Array.isArray(proposal.commands)||proposal.commands.length!==proposal.count||
         proposal.count>16||before.revision!==proposal.revision||busy||playing||
         lock.current||running.current||nativeGradeRules){
        setError('Physical pleat source is stale, the garment is simulating, or native grading is active. Pause and review the latest source.')
        return false
       }
       const source=before.template.panels.find(item=>item.id===proposal.panelId)
       if(!source?.polygon?.edges.includes(proposal.edge)){
        setError('Source pleat cutline changed; reopen the native precision inspector.')
        return false
       }
       const originalPoints=JSON.stringify(source.polygon.points)
       const originalEdges=JSON.stringify(source.polygon.edges)
       const firstSeams=new Set(before.template.seams.map(item=>item.id))
       const oldLines=source.polygon.lines?.length||0
       const result=await request({op:'tuck-fold-sew-batch',commands:proposal.commands})
       if(!result?.template)return false
       const revised=result.template.panels.find(item=>item.id===proposal.panelId)
       const newSeams=result.template.seams.filter(item=>!firstSeams.has(item.id))
       const linesAdded=(revised?.polygon?.lines?.length||0)-oldLines
       const geometrySafe=Boolean(revised)&&JSON.stringify(revised.polygon.points)===originalPoints&&
         JSON.stringify(revised.polygon.edges)===originalEdges
       const complete=geometrySafe&&linesAdded===2*proposal.count&&newSeams.length===proposal.count&&
         newSeams.every(seam=>seam.a.panel===proposal.panelId&&
           seam.b.panel===proposal.panelId&&seam.a.edge!==seam.b.edge&&
           seam.allow_ease===false)
       if(!complete){
        const rollback=await request({op:'undo'})
        setError(rollback?.template?
          'Native tuck sewing metadata did not match the physical construction contract. Entire batch rolled back with Undo.':
          'Native tuck sewing validation failed and Undo was not confirmed. Inspect and export the source before editing further.')
        return false
       }
       setSelected({panel:proposal.panelId})
       const recorded=(result.tuckFit||[]).filter(row=>newSeams.some(seam=>seam.id===row.seamId))
       const maxGap=recorded.length?Math.max(...recorded.map(row=>row.maxGapMm??Infinity)):null
       setNotice(`Created ${newSeams.length} real seam-constrained tuck(s) with ${linesAdded} internal material paths on ${source.name}. Original exterior cut contour preserved. ${Number.isFinite(maxGap)?'Initial seam gap '+maxGap.toFixed(1)+' mm; simulate to close it.':''} Native Undo restores the group. Fold direction/self-contact and manufacturing release need verification.`)
       return true
      }}/>
   </CloFloatingPanel>
   <CloFloatingPanel kind="edit-sewing" title="Edit Sewing · Native" open={seamEditing&&mode!=='sew'}
     active={true} onClose={()=>{setSeamEditing(false);setSelected(null)}}>
    <section className="cc-embedded-sew-commit" data-native-edit-sewing="true"
      aria-label="Selected native sewing correspondence" style={{display:'grid',gap:9,minWidth:250}}>
     <strong>EDIT SEWING · NATIVE RUST</strong>
     {(s?.template?.seams||[]).length===0?<p role="status">No sewing relationships yet. Connect two pattern edges using Segment Sewing or Free Sewing first.</p>:
      <>
       <label>Native sewing pair
        <select aria-label="Select native sewing pair" value={selected?.seamId&&s.template.seams.some(seam=>seam.id===selected.seamId)?selected.seamId:s.template.seams[0].id}
          onChange={event=>selectExistingSewingSeam(event.target.value)}>
         {s.template.seams.map(seam=><option key={seam.id} value={seam.id}>
          {seam.id} · {seam.a.panel}/{seam.a.edge} ↔ {seam.b.panel}/{seam.b.edge}
         </option>)}
        </select>
       </label>
       {(()=>{
        const seam=s.template.seams.find(item=>item.id===selected?.seamId)||s.template.seams[0]
        if(!seam)return null
        const preflight=preflightNativeSewing20261025(
          {...s,template:{...s.template,seams:s.template.seams.filter(item=>item.id!==seam.id)}},
          {a:seam.a,b:seam.b,reverse:seam.reverse_b,ease:seam.allow_ease})
        const native3dSeam=s.seams?.find(item=>item.id===seam.id)
        const gapMm=Number.isFinite(native3dSeam?.gap_m)?native3dSeam.gap_m*1000:null
        const rmsGapMm=Number.isFinite(native3dSeam?.rms_gap_m)?native3dSeam.rms_gap_m*1000:null
        const update=async values=>{
          if(busy||playing||segmentCommitting||lock.current)return
          const revision=state.current?.revision
          const latest=state.current?.template?.seams?.find(item=>item.id===seam.id)
          if(!latest||revision!==s.revision){setError('Sewing selection changed. Reselect the pair before editing.');return}
          const result=await request({op:'edit-seam',seam:latest.id,
            reverse:latest.reverse_b,ease:latest.allow_ease,stiffness:latest.stiffness,...values})
          if(result)setNotice(`Saved sewing settings for ${latest.id} in native Rust. Recheck seam direction and ease before export.`)
        }
        return <div key={seam.id} data-native-edit-seam={seam.id} style={{display:'grid',gap:8}}>
         <div role="status" data-native-edit-seam-mismatch={preflight.ok?'measured':'unavailable'}>
          <strong>{preflight.ok?`Mismatch ${preflight.mismatchMm.toFixed(2)} mm`:
            `Cannot verify sewing length: ${preflight.reason}`}</strong>
          {preflight.ok&&<small style={{display:'block'}}>
           Edge A {preflight.measuredMm[0].toFixed(2)} mm · Edge B {preflight.measuredMm[1].toFixed(2)} mm
          </small>}
         </div>
         <div role="status" data-native-3d-seam-id={seam.id}
           data-native-3d-seam-gap-mm={gapMm??'unavailable'}
           data-native-3d-seam-rms-gap-mm={rmsGapMm??'unavailable'}>
          <strong>3D seam connection · {gapMm===null?'awaiting native guide data':`${gapMm.toFixed(2)} mm maximum gap`}</strong>
          <small style={{display:'block'}}>{rmsGapMm===null?'No Rust RMS gap measurement available':`RMS separation ${rmsGapMm.toFixed(2)} mm`}</small>
          <small style={{display:'block'}}>Both views select this same Rust seam. Simulate to evaluate physical closure; visible 3D guides and gap measurements do not certify fit.</small>
         </div>
         <label><input type="checkbox" aria-label="Reverse selected sewing direction"
           disabled={busy||playing} checked={Boolean(seam.reverse_b)}
           onChange={event=>void update({reverse:event.target.checked})}/> Reverse second edge</label>
         <label><input type="checkbox" aria-label="Allow selected sewing easing"
           disabled={busy||playing} checked={Boolean(seam.allow_ease)}
           onChange={event=>void update({ease:event.target.checked})}/> Allow unequal sewn lengths / ease</label>
         <label>Sewing stiffness
          <select aria-label="Selected sewing stiffness" disabled={busy||playing}
           value={[10000,50000,150000].includes(seam.stiffness)?String(seam.stiffness):'50000'}
           onChange={event=>void update({stiffness:Number(event.target.value)})}>
           <option value="10000">Soft · 10,000</option><option value="50000">Standard · 50,000</option><option value="150000">Firm · 150,000</option>
          </select>
         </label>
         <NativeSeamEndpointEditor20261025 key={`${seam.id}:${s.revision}`}
          snapshot={s} seam={seam} disabled={busy||playing||segmentCommitting}
          onCommit={async({a,b,expectedRevision})=>{
           const current=state.current
           if(current?.revision!==expectedRevision||
             !current.template.seams.some(item=>item.id===seam.id)){
            setError('Seam changed during endpoint editing. Reselect the seam and try again.');return
           }
           const candidate=preflightNativeSewing20261025(
            {...current,template:{...current.template,seams:current.template.seams.filter(item=>item.id!==seam.id)}},
            {a,b,reverse:seam.reverse_b,ease:seam.allow_ease,expectedRevision})
           if(!candidate.ok){setError('Endpoint change blocked: '+candidate.reason);return}
           const result=await request({op:'edit-seam-ends',seam:seam.id,a,b})
           if(result?.template){
            const saved=result.template.seams.find(item=>item.id===seam.id)
            const same=(end,next)=>end?.panel===next.panel&&end?.edge===next.edge&&
              end?.range?.every((value,i)=>Math.abs(value-next.range[i])<1e-8)
            if(!saved||!same(saved.a,a)||!same(saved.b,b)){
             setError('Rust endpoint edit did not match the selected source seam; inspect before export.');return
            }
            showNativeSewingSelection(saved)
            setNotice(`Updated native endpoints of ${seam.id}; both physical cutline ranges saved as one Undo step. Simulate to inspect seam closure.`)
           }
          }}/>
         <button type="button" data-native-remove-seam="true" disabled={busy||playing}
           onClick={async()=>{
            if(!window.confirm(`Remove native sewing relationship ${seam.id}? Undo restores it.`))return
            const result=await edit({kind:'RemoveSeam',seam:seam.id})
            if(result){setSelected(null);setNotice(`Removed seam ${seam.id}; native Undo restores it.`)}
           }}>Remove selected sewing relationship</button>
         <small>Material-space length and direction review. Automatic easing distribution and factory sewing approval are not implied.</small>
        </div>
       })()}
      </>}
    </section>
   </CloFloatingPanel>
   <CloFloatingPanel kind="base-polygon" title="Base Polygon" open={basePolygonOpen} active={true} onClose={()=>setBasePolygonOpen(false)}><section className="cc-embedded-sew-commit" data-native-base-polygon="true" aria-label="Native base polygon creation">
     <strong>BASE POLYGON</strong>
     <label>Shape <select aria-label="Base polygon shape" value={shape} onChange={event=>setShape(event.target.value)}><option value="rectangle">Rectangle</option><option value="ellipse">Ellipse</option><option value="sector">Sector</option></select></label>
     {size.map((mm,index)=><label key={index}>{index?'Height':'Width'} (mm) <input aria-label={`Base polygon ${index?'height':'width'} in millimetres`} type="number" min="5" max="10000" step="5" value={mm} onChange={event=>setSize(current=>current.map((value,j)=>j===index?Number(event.target.value):value))}/></label>)}
     <button type="button" disabled={busy||playing||!s?.template?.fabrics?.[0]||size.some(mm=>!Number.isFinite(mm)||mm<5||mm>10000)} onClick={async()=>{
       const before=state.current
       const fabric=before?.template?.fabrics?.[0]?.id
       if(!fabric)return
       const result=await edit({kind:'Primitive',shape,size:size.map(mm=>mm/1000),origin:[0,0],fabric})
       if(result){setBasePolygonOpen(false);setNotice(`Created native ${shape} pattern, ${size[0]} × ${size[1]} mm. Undo restores previous topology.`)}
     }}>Create native pattern</button>
     <button type="button" onClick={()=>setBasePolygonOpen(false)}>Cancel</button>
   </section></CloFloatingPanel>
   <CloFloatingPanel kind="fabric-fill" title="Fill Pattern" open={fillPanelOpen} active={true} onClose={()=>setFillPanelOpen(false)}><section className="cc-embedded-sew-commit" data-native-fill-panel="true" aria-label="Native pattern fabric fill">
     <strong>FILL PATTERN · RUST FABRIC</strong>
     <label>Pattern<select aria-label="Pattern to fill" value={fillPanelTarget} onChange={event=>setFillPanelTarget(event.target.value)}>{(s?.template?.panels||[]).map(panel=><option key={panel.id} value={panel.id}>{panel.name}</option>)}</select></label>
     <label>Material<select aria-label="Fill with existing material" value={fillFabricId} onChange={event=>setFillFabricId(event.target.value)}>{(s?.template?.fabrics||[]).map(fabric=><option key={fabric.id} value={fabric.id}>{fabric.name}</option>)}</select></label>
     <button type="button" data-native-fill-apply="true" disabled={busy||playing||!fillPanelTarget||!s?.template?.fabrics?.some(f=>f.id===fillFabricId)} onClick={async()=>{
       const fabric=state.current?.template?.fabrics?.find(f=>f.id===fillFabricId)
       const panel=state.current?.template?.panels?.find(p=>p.id===fillPanelTarget)
       if(!fabric||!panel){setError('Choose a valid native panel and material.');return}
       const result=await edit({kind:'Fabric',panel:panel.id,name:fabric.name,properties:fabric.properties,all_panels:false})
       if(result){setNotice(`Filled ${panel.name} with ${fabric.name} in the native garment. Undo reverses the material assignment.`);setFillPanelOpen(false)}
     }}>Apply fabric fill to pattern</button>
     <button type="button" onClick={()=>setFillPanelOpen(false)}>Cancel</button>
     <small>Applies a physical material to the entire native panel. Area paint and masks are separate features.</small>
   </section></CloFloatingPanel>
   <CloFloatingPanel kind="fullness" title="Fullness" open={fullnessOpen} active={true} onClose={()=>setFullnessOpen(false)}><section className="cc-embedded-sew-commit" data-native-fullness="true" aria-label="Native gathered fullness">
     <strong>FULLNESS · GATHERED STRIP</strong>
     {(s?.template?.panels||[]).some(p=>p.polygon?.lines?.length)?<>
       <label>Pattern<select aria-label="Fullness source pattern" value={fullnessPanel} onChange={event=>{
         const id=event.target.value;setFullnessPanel(id);setFullnessLine(s?.template?.panels?.find(p=>p.id===id)?.polygon?.lines?.[0]?.id||'')
       }}>{s.template.panels.filter(p=>p.polygon?.lines?.length).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
       <label>Internal line<select aria-label="Fullness source internal line" value={fullnessLine} onChange={e=>setFullnessLine(e.target.value)}>{(s.template.panels.find(p=>p.id===fullnessPanel)?.polygon?.lines||[]).map(line=><option key={line.id} value={line.id}>{line.id}</option>)}</select></label>
       <label>Strip width (mm)<input aria-label="Fullness strip width millimetres" type="number" min="5" max="1000" step="5" value={ruffleWidth} onChange={e=>setRuffleWidth(Number(e.target.value))}/></label>
       <label>Gather ratio<input aria-label="Fullness gathering ratio" type="number" min="1" max="4" step="0.1" value={ruffleRatio} onChange={e=>setRuffleRatio(Number(e.target.value))}/></label>
       <button type="button" data-native-fullness-apply="true" disabled={busy||playing||!fullnessPanel||!fullnessLine||!Number.isFinite(ruffleWidth)||ruffleWidth<5||ruffleWidth>1000||!Number.isFinite(ruffleRatio)||ruffleRatio<1||ruffleRatio>4} onClick={async()=>{
         const result=await edit({kind:'Ruffle',panel:fullnessPanel,line:fullnessLine,width:ruffleWidth/1000,ratio:ruffleRatio})
         if(result){setNotice('Created a native sewn fullness strip from the selected internal line. Undo removes the new panel and seam.');setFullnessOpen(false)}
       }}>Create sewn fullness strip</button>
     </>:<span role="status">Draw an internal line first with Internal Polygon/Line, then use Fullness to create a gathered strip.</span>}
     <button type="button" onClick={()=>setFullnessOpen(false)}>Cancel</button>
     <small>Actual Rust geometry and sewing creation. Point-directed fullness on an existing contour is not implemented.</small>
   </section></CloFloatingPanel>
   <CloFloatingPanel kind="pattern-validation" title="Pattern Tool" open={Boolean(drawingError)} active={true} onClose={()=>setDrawingError('')}>
    <div className="clo-floating-tool-body"><div className="clo-finishing-inset" role="status">{drawingError}</div><button type="button" onClick={()=>setDrawingError('')}>OK</button></div>
   </CloFloatingPanel>
   {nativeGradingPortal}
   {gradeBottomDock}
   <CloFloatingPanel kind="grading-quick-toolbar" title="Grading Toolbar" open={gradeQuickToolbarOpen}
     embedTarget={gradeQuickToolbarEmbedTarget} embedRequest={gradeQuickToolbarEmbedRequest}
     active={true} onClose={()=>setGradeQuickToolbarOpen(false)}>
     <ExoGradingQuickToolbar20261028 snapshot={s} panelId={gradePanelTarget}
       selectedPointIndex={selected?.panel===gradePanelTarget?selected.anchor:0}
       selectedSize={gradeNestSelectedSize} disabled={busy||playing||Boolean(s?.activeGradedSize)}
       sizeNames={nativeGradeRules?.sizes||['XS','S','M','L','XL','XXL']}
       onSelectSize={size=>{setGradeNestSelectedSize(size);setGradeNestPinned(true);setGradeNestEnabled(true)}}
       onApply={applyNativeOptitexGrading}
       onSelectPoint={pointIndex=>setSelected({panel:gradePanelTarget,anchor:pointIndex})}
       onGradeNotch={()=>{setGradeMode('manual');setGradeNotchEditorOpen(true)}}
       onOpenAll={()=>{setGradeMode('manual');setGradeStudioTab('rules')}}/>
   </CloFloatingPanel>
   <ExoBottomDockSplitControls20261027 host={gradeDockHost} edge="bottom"/>
   <ExoBottomDockSplitControls20261027 host={gradeInnerDockHost} edge="inner-bottom"/>
   <ExoBottomDockSplitControls20261027 host={gradeTopDockHost} edge="top"/>
   {typeof document!=='undefined'&&createPortal(<CloFloatingPanel kind="walk" title="Walk Pattern" open={walkOpen} active={true} onClose={()=>setWalkOpen(false)}>
   <section className="clo-walk-body clo-floating-tool-body" data-native-seam-walk="true" aria-label="Walk native sewing relationship">
     <div className="clo-finishing-inset"><strong className="clo-walk-label">Matched sewing edges</strong>
     {(s?.template?.seams?.length||0)>0?<>
       <label>Sewn edge pair<select aria-label="Walk sewing pair" value={walkSeamId} onChange={event=>{setWalkSeamId(event.target.value);setWalkFraction(0)}}>{s.template.seams.map(seam=><option key={seam.id} value={seam.id}>{seam.id} · {seam.a.panel} / {seam.a.edge} ↔ {seam.b.panel} / {seam.b.edge}</option>)}</select></label>
       {(()=>{const measured=measureNativeSelection(s,{seamId:walkSeamId});if(!measured)return null;const a=measured.first.length2DCm,b=measured.second.length2DCm;return <div className="clo-walk-measures" data-native-walk-measurements="true" role="status"><div><span>First cut edge</span><strong>{a?.toFixed(2)??'—'} cm</strong></div><div><span>Second cut edge</span><strong>{b?.toFixed(2)??'—'} cm</strong></div><div><span>Mismatch</span><strong>{a!=null&&b!=null?(Math.abs(a-b)*10).toFixed(1)+' mm':'—'}</strong></div></div>})()}
       {(()=>{
         const seam=s.template.seams.find(item=>item.id===walkSeamId)
         const left=s.template.panels.find(p=>p.id===seam?.a?.panel)
         const right=s.template.panels.find(p=>p.id===seam?.b?.panel)
         if(!seam||!left?.polygon||!right?.polygon)return <p role="status">Named sewing source geometry is unavailable.</p>
         const complete=edge=>Array.isArray(edge?.range)&&edge.range.length===2&&
           Math.abs(edge.range[0])<1e-8&&Math.abs(edge.range[1]-1)<1e-8
         if(!complete(seam.a)||!complete(seam.b))return <p role="status" data-native-curve-length-status="partial">This is a partial seam interval; full-edge length checks cannot establish its sewing mismatch.</p>
         const leftLength=nativeRustEdgeLength20261023(left.polygon,seam.a.edge)
         const rightLength=nativeRustEdgeLength20261023(right.polygon,seam.b.edge)
         if(!leftLength.ok||!rightLength.ok)return <p role="status" data-native-curve-length-status="unavailable">Native-compatible material arclength unavailable: {leftLength.reason||rightLength.reason}. This seam is not approved.</p>
         const a=leftLength.totalLengthM,b=rightLength.totalLengthM
         const mismatch=Math.abs(a-b)
         return <div className="clo-walk-measures" data-native-curve-length-status="approximate" role="status" aria-label="Curved material-space seam length verification">
           <div><span>Curved edge A</span><strong>{(a*1000).toFixed(2)} mm</strong></div>
           <div><span>Curved edge B</span><strong>{(b*1000).toFixed(2)} mm</strong></div>
           <div><span>Physical mismatch</span><strong>{(mismatch*1000).toFixed(2)} mm</strong></div>
           <div><span>2 mm reference tolerance</span><strong>{mismatch<=.002&&!seam.allow_ease?'Length within tolerance':'Review required'}</strong></div>
           <div><span>Station {(walkFraction*100).toFixed(0)}%</span><strong>{(a*walkFraction*1000).toFixed(1)} / {(b*walkFraction*1000).toFixed(1)} mm</strong></div>
           <small>Material-space Bézier and free-knot lengths use the same 0.25 mm flattening convention as native Rust sewing geometry. This full-edge comparison does not approve partial sewing, eased seams, notch correspondence or production cutting.</small>
         </div>
       })()}
       {(()=>{
         const report=inspectNativeSeamTrueing20261023(s,{seamId:walkSeamId,stations:9})
         if(!report.ok)return <p role="status" data-native-seam-trueing="blocked">Full-edge seam truing unavailable: {report.reason}. Production trueing is not established.</p>
         return <div className="clo-walk-measures" data-native-seam-trueing="diagnostic" role="status" aria-label="Native 2D seam shape and tangent comparison">
           <strong>SEAM TRUEING · 2D DIAGNOSTIC</strong>
           <div><span>Shape normal difference</span><strong>{report.maxShapeMm.toFixed(2)} mm max</strong></div>
           <div><span>Shape RMS difference</span><strong>{report.rmsShapeMm.toFixed(2)} mm</strong></div>
           <div><span>Join tangent mismatch</span><strong>{report.maxTangentDegrees.toFixed(2)}° max</strong></div>
           <div><span>Sewing direction</span><strong>{report.reversedSecond?'Reverse B':'Forward B'}</strong></div>
           <div><span>Provisional diagnostic</span><strong>{report.referenceWithinTolerance?'Reference tolerances met':'Review shape / sewing'}</strong></div>
           {report.issues.length>0&&<small>Flags: {report.issues.join(' · ')}</small>}
           <small>9 material-space stations aligned by chord. This does not reshape a sewn boundary, distribute ease, match notches or certify factory release.</small>
         </div>
       })()}
       <label className="clo-walk-slider">Matched arclength <input aria-label="Walk arclength fraction" type="range" min="0" max="1" step="0.01" value={walkFraction} onChange={event=>setWalkFraction(Number(event.target.value))}/><output>{(walkFraction*100).toFixed(0)}%</output></label>
       {walkOpen&&(()=>{
         const preview=planNativeMatchedSeamNotches20261024(s,{seamId:walkSeamId,fraction:walkFraction,depthMm:4})
         return <div role="status" data-native-matched-notch-preview={preview.ok?'ready':'blocked'}>
           <strong>MATCHED PHYSICAL NOTCHES · RUST</strong>
           {preview.ok?<p>Left {preview.proposals[0].panelId}/{preview.proposals[0].edge} at {(preview.proposals[0].t*100).toFixed(2)}% · right {preview.proposals[1].panelId}/{preview.proposals[1].edge} at {(preview.proposals[1].t*100).toFixed(2)}% · matched sewn length mismatch {preview.mismatchMm.toFixed(3)} mm</p>:
             <small>Blocked: {preview.reason}</small>}
           <button type="button" disabled={!preview.ok||busy||playing||!!nativeGradeRules} onClick={applyMatchedNotches}>Apply both 4 mm native sewn notches · two Undo steps</button>
           <small>Source arclength placement is supported on full and partial seams, including reversed B. Two sequential Rust commands are not atomic; a failed second edit triggers Undo of the first. Industrial grading and sewn sample signoff still pending.</small>
         </div>
       })()}
       <small>Both highlighted dots move along their actual Rust material-space boundary coordinates. This measures mismatch; it does not automatically ease or reshape geometry.</small>
     </>:<span role="status">No native sewing pairs yet. Use Segment Sewing or Free Sewing to connect two pattern edges.</span>}
     </div><button className="clo-walk-close" type="button" onClick={()=>setWalkOpen(false)}>Close</button>
   </section>
   </CloFloatingPanel>,document.body)}
   {exoSection==='Fabric'&&fabricHost&&createPortal(<ClothCraftFabricLibrary snapshot={s} panel={nativeFabricPanel} busy={busy||playing} onEdit={edit} showPresets={false}/>,fabricHost)}
   {foamOpen&&<CloFloatingPanel kind="foam-padding" title="Foam Padding / Trapunto" open={foamOpen} active={true} onClose={()=>setFoamOpen(false)}>
    <section data-native-foam-padding="true" className="cc-foam-editor">
     <div className="cc-foam-hero"><div className="cc-foam-hero-mark"><Layers size={19}/></div><div><strong>Raised Foam Studio</strong><span>SVG contours → sculpted padding → stitch guides</span></div><span className="cc-foam-draft-chip">PREVIEW</span></div>
     <div className="cc-foam-upload-area">
      <input ref={foamFileInput} hidden type="file" accept=".svg,image/svg+xml" onChange={importNativeFoam}/>
      <button type="button" className="cc-foam-import" disabled={!s?.template?.panels?.length} onClick={()=>foamFileInput.current?.click()}><UploadCloud size={20}/><span><strong>Import SVG shape</strong><small>Closed vector paths · up to 3 MB</small></span><span aria-hidden="true">+</span></button>
     </div>
     {foamMessage&&<p className="cc-foam-message" role="status">{foamMessage}</p>}
     <div className="cc-foam-section-heading"><span>SHAPE LAYERS</span><strong>{nativeFoamPads.length} {nativeFoamPads.length===1?'shape':'shapes'}</strong></div>
     {nativeFoamPads.length===0&&<div className="cc-foam-empty"><Layers size={26}/><strong>No padding shapes yet</strong><span>Import an SVG to place raised foam on the selected garment pattern.</span></div>}
     {nativeFoamPads.length>0&&<div className="cc-foam-layer-list" role="group" aria-label="Foam layers">{nativeFoamPads.map((pad,index)=><button key={pad.id} type="button" className={`cc-foam-layer ${selectedFoamId===pad.id?'is-selected':''}`} aria-pressed={selectedFoamId===pad.id} onClick={()=>setSelectedFoamId(pad.id)}><span className="cc-foam-layer-icon"><Layers size={15}/></span><span className="cc-foam-layer-info"><strong>{pad.name||`Foam layer ${index+1}`}</strong><small>{pad.panel} · {Number(pad.depthCm||0).toFixed(1)} cm raised</small></span>{pad.locked?<LockKeyhole size={14}/>:<ChevronRight size={15}/>}</button>)}</div>}
     {nativeFoamPads.filter(pad=>pad.id===(selectedFoamId||nativeFoamPads[0]?.id)).map(pad=><div className="cc-foam-selected" key={pad.id}>
      <div className="cc-foam-section-heading"><span>PLACEMENT & SHAPE</span><span className="cc-foam-status-dot">Live 2D + 3D</span></div>
      <div className="cc-foam-form">
       <label className="cc-foam-full">Target garment panel<select value={pad.panel} onChange={e=>editNativeFoamPad(pad.id,{panel:e.target.value})}>{(s?.template?.panels||[]).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
       {[
        ['x','Position X','cm',-150,150,.5],['y','Position Y','cm',-150,150,.5],
        ['widthCm','Width','cm',.5,120,.5],['heightCm','Height','cm',.5,120,.5],
        ['depthCm','Foam height','cm',.05,8,.1],['edgeWidthCm','Edge softness','cm',.025,8,.1],
        ['rotationDeg','Rotation','°',-180,180,1],
       ].map(([field,label,unit,min,max,step])=><label key={field}>{label}<span className="cc-foam-number"><input aria-label={`${label} (${unit})`} type="number" value={pad[field]??0} min={min} max={max} step={step} disabled={Boolean(pad.locked)&&['x','y','widthCm','heightCm','rotationDeg'].includes(field)} onChange={e=>{const v=Number(e.target.value);if(e.target.value!==''&&Number.isFinite(v))editNativeFoamPad(pad.id,{[field]:Math.max(min,Math.min(max,v))})}}/><small>{unit}</small></span></label>)}
       <label className="cc-foam-full">Fabric construction<select value={pad.mode||'sandwich'} onChange={e=>editNativeFoamPad(pad.id,{mode:e.target.value})}><option value="sandwich">Outer fabric / foam / backing</option><option value="underlay">Foam beneath shell</option></select></label>
      </div>
      <div className="cc-foam-switches"><label><input type="checkbox" checked={Boolean(pad.sewn)} onChange={e=>editNativeFoamPad(pad.id,{sewn:e.target.checked})}/><span><strong>Stitch perimeter guide</strong><small>Visual placement reference only</small></span></label><label><input type="checkbox" checked={Boolean(pad.locked)} onChange={e=>editNativeFoamPad(pad.id,{locked:e.target.checked})}/><span><strong>Lock placement</strong><small>Prevent dragging on the 2D pattern</small></span></label></div>
      <div className="cc-foam-actions"><button type="button" className="cc-foam-properties" onClick={()=>{setSelectedFoamId(pad.id);if(embedded){setFoamOpen(false);window.dispatchEvent(new CustomEvent('exo-clothcraft-foam-selection',{detail:{pad,projectKey:foamProjectKey}}))}}}><SlidersHorizontal size={15}/> Material properties</button><button type="button" className="cc-foam-remove" onClick={()=>{commitFoamPads(nativeFoamPads.filter(p=>p.id!==pad.id));if(selectedFoamId===pad.id)setSelectedFoamId(null)}} aria-label={`Remove ${pad.name||'foam shape'}`} title="Remove shape"><Trash2 size={16}/></button></div>
     </div>)}
     {!embedded&&nativeFoamPads.find(pad=>pad.id===selectedFoamId)&&<FoamMaterialPropertyEditor pad={nativeFoamPads.find(pad=>pad.id===selectedFoamId)} onChange={material=>editNativeFoamPad(selectedFoamId,{material})} onClose={()=>setSelectedFoamId(null)}/>}
     <div className="cc-foam-footnote"><span className="cc-foam-footnote-icon">i</span><span>These are locally saved construction previews. Real foam contact physics and automatic multilayer sewing are not yet supported by the Rust solver.</span></div>
    </section>
   </CloFloatingPanel>}
   {graphicHost&&createPortal(<ClothCraftGraphicEditor graphics={nativeGraphics} onChange={updateNativeGraphics} panels={(s?.template?.panels||[]).map(p=>({...p,printBoundsMm:nativeGraphicPanelBounds(p.id)}))} panelId={selected?.panel||s?.template?.panels?.find(p=>/front/i.test(p.name+' '+p.id))?.id||s?.template?.panels?.[0]?.id} selectedGraphicId={selectedGraphicId} onSelectGraphic={setSelectedGraphicId} showLayerList={false} disabled={busy||playing} unit={studioPreferences?.units}/>,graphicHost)}
   {layout==='2d'&&<section ref={setGradeTopDockHost} className="exo-grade-workspace-dock-host exo-grade-workspace-dock-host--top"
     data-exo-grade-dock-host="true" data-exo-dock-edge="top" aria-label="Embedded 2D top tool workspace">
     <div className="exo-bottom-dock-rail exo-grade-top-command-rail" role="toolbar"
       aria-label="2D grading toolbar and pattern commands" data-exo-grade-top-command-rail="true">
       <button type="button" className="exo-bottom-dock-tab exo-grade-top-launcher"
         aria-pressed={gradeQuickToolbarOpen} title="Restore visible floating Grading Toolbar widget"
         onClick={restoreQuickGradingToolbar}><Grid2X2 size={13} aria-hidden="true"/>Grading Toolbar</button>
       <span className="exo-grade-top-separator" aria-hidden="true"/>
	       <button type="button" className="exo-bottom-dock-tab" data-native-history-action="undo"
	         aria-label="Undo native pattern edit" title="Undo native pattern edit" disabled={playing||!s}
	         onClick={()=>void requestHistory('undo')}><Undo2 size={13} aria-hidden="true"/>Undo</button>
	       <button type="button" className="exo-bottom-dock-tab" data-native-history-action="redo"
	         aria-label="Redo native pattern edit" title="Redo native pattern edit" disabled={playing||!s}
	         onClick={()=>void requestHistory('redo')}><Redo2 size={13} aria-hidden="true"/>Redo</button>
	       <span className="exo-grade-top-separator" aria-hidden="true"/>
       <button type="button" className="exo-bottom-dock-tab" aria-pressed={constructionOpen}
         disabled={busy||playing||!s} title="Open the native numeric point editor"
         onClick={()=>{setConstructionOpen(true);setMode('edit')}}><Ruler size={13} aria-hidden="true"/>Numeric Point Editor</button>
       <button type="button" className="exo-bottom-dock-tab" aria-pressed={Boolean(gradeMode)}
         disabled={busy||playing||!s} title="Edit grading point rules"
         onClick={()=>{setGradeMode('manual');setGradeStudioTab('rules')}}><SlidersHorizontal size={13} aria-hidden="true"/>Grading Rules</button>
       <button type="button" className="exo-bottom-dock-tab" disabled={busy||!s}
         title="Run native pattern QA" onClick={runPatternAudit}><ShieldCheck size={13} aria-hidden="true"/>Pattern QA</button>
       <button type="button" className="exo-bottom-dock-tab exo-grade-top-secondary" disabled={busy||playing||!s}
         title="Generate native CUT proof" onClick={runProductionCutlines}><Scissors size={13} aria-hidden="true"/>CUT Proof</button>
       <span className="exo-grade-top-status" role="status"
         title={`Revision ${s?.revision??'—'} · ${s?.template?.panels?.length??0} pieces · ${s?.template?.seams?.length??0} sewn pairs · mm · Active tool: ${mode}`}>R{s?.revision??'—'} · {s?.template?.panels?.length??0} pcs</span>
     </div>
   </section>}
   <div ref={cameraViewport} className="cc-embedded-main">

    <CameraFabricHand viewportRef={cameraViewport} onActivate={()=>changeViewportMode('stretch3d')} disabled={busy&&!playing||!s?.template?.panels?.length}/>
    <section className="cc-view cc-viewport-3d" aria-label="ClothCraft 3D garment viewport" style={{position:'relative'}}><ClothCraftSceneV2 onCollapse3D={onCollapse3D} onToggle3DStudio={onToggle3DStudio} studio3DActive={studio3DActive} onToggle3DStudioFullscreen={onToggle3DStudioFullscreen} studio3DFullscreenActive={studio3DFullscreenActive} animationWorkspaceActive={animationWorkspaceActive} foamPads={nativeFoamPads} onFoamSelect={id=>{setSelectedFoamId(id);if(!embedded)setFoamOpen(true)}} importedHardware={sceneImportedHardware} graphics={nativeGraphics} analysisMode={analysisMode} snapshot={s} active={hovered||selected} selected={selected} mode={mode==='stretch3d'?'stretch3d':playing||busy?'edit':mode} seamEditing={seamEditing} onContextMenuRequest={event=>openViewportContext({...event,dimension:'3d'})} onCanvasActivate={()=>{shortcutsFocused.current=true}} onChangeMode={changeViewportMode} toolsDisabled={busy&&!playing} onPick={pickInSewingMode} onHover={setHovered} onPlace={placeVisiblePanel} showAvatar={showAvatar} showSeams={showSeams} sewingToolsActive={mode==='sew'||seamEditing} wireframe={wireframe} showBoundingBox={showBoundingBox} showContactDots={showContactDots} onStretchStart={startClothGrab} onStretchCancel={cancelClothGrab} onStretchDrag={pullClothPoint} environmentPreset={environmentPreset} stageId={stageId} stageSettings={stageSettings} cameraSettings={cameraSettings} sceneLight={sceneLight} sceneLight2={sceneLight2} exposure={exposure} studioAppearance={studioAppearance} studioPreferences={studioPreferences}/></section>
   {layout==='2d'&&<section className="exo-grade-side-dock-host" data-exo-grade-dock-host="true" data-exo-dock-edge="left" aria-label="Left vertical grading toolbar dock"/>}
   {layout==='2d'&&<section className="exo-grade-side-dock-host" data-exo-grade-dock-host="true" data-exo-dock-edge="right" aria-label="Right vertical grading toolbar dock"/>}
   {printLayoutActive ? <section className="cc-view cc-viewport-2d exo-print-viewport" style={{position:'relative'}} aria-label="ClothCraft Print Layout viewport replacing 2D pattern editor">
      <PrintLayoutStudio source={s} nativeGraphics={nativeGraphics} revision={s?.revision??'current'} onClose={onExitPrintLayout} embedded/>
    </section> : <section className="cc-view cc-viewport-2d" style={{position:'relative'}} aria-label="ClothCraft 2D pattern viewport">{s&&<ClothCraftBoardV2 studioPreferences={studioPreferences} onTogglePatternStudio={onTogglePatternStudio} patternStudioActive={patternStudioActive} showGrid={workspaceGrid} nativeGradeProposal={nativeGradeRules?null:nativeGradeProposal} nativeGradeRunsByPanel={multiPanelGradeNest?.ok?multiPanelGradeNest.byPanel:null} nativeGradeVisibility={nativeGradeVisibility} nativeConstructionPreview={nativeConstructionPreview} nativeCurveStationPreview={nativeCurveStationPreview} nativeDartPrecisionPreview={nativeDartPrecisionPreview} nativePhysicalPleatPreview={nativePhysicalPleatPreview} gradingPOMPreview={gradedPOMSource} onPickGradeSize={setGradeNestSelectedSize} showMeasurements={showMeasurements} showSilhouette={layout==='2d'?false:showSilhouette} onToggleSilhouette={setShowSilhouette} showAvatar={layout==='2d'?false:showAvatar} onToggleAvatar={setShowAvatar} showSeamDots={showContactDots} walkSeamId={walkOpen?walkSeamId:null} walkFraction={walkFraction} onAvatarPick={()=>{pick({avatar:true});activateSection('Avatar')}} graphics={nativeGraphics} foamPads={nativeFoamPads} onMoveFoamPad={editNativeFoamPad} sewingVariant={sewingVariant} editSewing={seamEditing} onSelectSewingSeam={selectExistingSewingSeam} sewingFirstEdge={pair[0]||null} sewingCommitting={segmentCommitting} onSegmentSewEdge={selectSegmentEdge} freeSewPoints={freeSewPoints} onFreeSewPoint={selectFreeSewPoint} onClearFreeSew={clearFreeSew} allowFreeSewEase={ease} onChangeFreeSewEase={setEase} selectedGraphicId={selectedGraphicId} onSelectGraphic={selectGraphicOnBoard} onMoveGraphic={moveGraphicOnBoard} onResizeGraphic={resizeGraphicOnBoard} patternReferences={patternReferences} onUpdatePatternReferences={onUpdatePatternReferences} referenceModeActive={exoObjectTab==='Reference'} showGraphicMeasurements={showGraphicMeasurements} showGraphicMeasurementToggle={false} s={s} selection={selected} active={hovered||selected} pick={pick} hover={setHovered} edit={edit} editBatch={editPatternLayoutBatch} onEnableCurveSeamEase={enableCurveSeamEase} mode={mode} onChangeMode={changeViewportMode} onContextMenuRequest={openViewportContext} busy={busy||playing} onPolygon={(points,tangents)=>{if(mode==='line'){if(!selectedPanel){setDrawingError('Select a pattern before drawing an internal line.');return}const r=s.panels.find(p=>p.id===selectedPanel.id),a=-(selectedPanel.layout_rotation_degrees||0)*Math.PI/180;const local=points.map(p=>{const u=p[0]-r.layout[0],v=p[1]-r.layout[1];return[u*Math.cos(a)-v*Math.sin(a),u*Math.sin(a)+v*Math.cos(a)]});edit({kind:'InternalLine',panel:selectedPanel.id,points:local,tangents:local.map(()=>[0,0])})}else edit({kind:'Polygon',points,tangents:Array.isArray(tangents)&&tangents.length===points.length?tangents:points.map(()=>[0,0]),fabric:s.template.fabrics[0].id})}}/>}<NativePatternAuditPanel audit={patternAudit} revision={s?.revision} onClose={()=>setPatternAudit(null)} onRefresh={runPatternAudit} onGenerateCutlines={runProductionCutlines} onDownloadCutline={downloadCutlineProof} cutlines={cutlineProof} disabled={busy}/><NativeSewingGestureDock20261025
     mode={mode} variant={sewingVariant} firstEdge={pair[0]||null}
     freePoints={freeSewPoints} reverse={reverse} onReverse={setReverse}
     ease={ease} onEase={setEase} committing={segmentCommitting}
     groupMode={sewingGroupMode} manyCount={manySewCount} stagedEdges={pair}
     onGroupMode={next=>{setSewingGroupMode(next);segmentPendingRef.current=null;groupSewPendingRef.current=[];setPair([])}}
     onManyCount={next=>{setManySewCount(next);groupSewPendingRef.current=[];setPair([])}}
     onCancel={()=>{if(sewingVariant==='segment'){segmentPendingRef.current=null;groupSewPendingRef.current=[];setPair([])}else clearFreeSew()}}
     onExit={()=>{segmentPendingRef.current=null;groupSewPendingRef.current=[];clearFreeSew();setPair([]);setMode('edit');setSeamEditing(false);
       window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'select'}}))}}/>
   </section>}
   </div>
   {embedded&&<section ref={setGradeInnerDockHost} className="exo-grade-workspace-dock-host exo-grade-inner-bottom-dock"
     data-exo-grade-dock-host="true" data-exo-dock-edge="inner-bottom" aria-label="Inside 2D and 3D board bottom grading tables dock">
	     <div className="exo-bottom-dock-rail" role="toolbar" aria-label="Inside board bottom docking bar">
       <span className="exo-bottom-dock-handle" aria-hidden="true">⋮⋮</span>
	       <span data-native-history-controls="true">
	         <button type="button" className="exo-bottom-dock-tab" aria-label="Undo native pattern edit" title="Undo native pattern edit" disabled={playing||!s} onClick={()=>void requestHistory('undo')}><Undo2 size={13} aria-hidden="true"/> Undo</button>
	         <button type="button" className="exo-bottom-dock-tab" aria-label="Redo native pattern edit" title="Redo native pattern edit" disabled={playing||!s} onClick={()=>void requestHistory('redo')}><Redo2 size={13} aria-hidden="true"/> Redo</button>
	       </span>
       <button type="button" className="exo-bottom-dock-tab" aria-pressed={gradeBottomTableOpen} onClick={()=>setGradeBottomTableOpen(value=>!value)}>Grading Table</button>
       <button type="button" className="exo-bottom-dock-tab" aria-pressed={gradeBottomCompareOpen} onClick={()=>setGradeBottomCompareOpen(value=>!value)}>Compare Length</button>
       <button type="button" className="exo-bottom-dock-tab" aria-pressed={gradeQuickToolbarOpen}
         title="Restore floating Grading Toolbar" onClick={restoreQuickGradingToolbar}>Grading Toolbar</button>
       <span className="exo-bottom-dock-instruction">Dock inside pattern workspace</span>
     </div>
   </section>}
   {!embedded&&<section ref={setGradeDockHost} className="exo-grade-workspace-dock-host"
     data-exo-grade-dock-host="true" data-exo-dock-edge="bottom" aria-label="Workspace bottom grading tables dock">
     <div className="exo-bottom-dock-rail" role="toolbar" aria-label="2D bottom docking bar">
       <span className="exo-bottom-dock-handle" aria-hidden="true">⋮⋮</span>
       <button type="button" className="exo-bottom-dock-tab" aria-pressed={gradeBottomTableOpen}
         onClick={()=>setGradeBottomTableOpen(previous=>!previous)}>Grading Table</button>
       <button type="button" className="exo-bottom-dock-tab" aria-pressed={gradeBottomCompareOpen}
         onClick={()=>setGradeBottomCompareOpen(previous=>!previous)}>Compare Length</button>
       <button type="button" className="exo-bottom-dock-tab" aria-pressed={gradeQuickToolbarOpen}
         title="Restore floating Grading Toolbar" onClick={restoreQuickGradingToolbar}>Grading Toolbar</button>
       <span className="exo-bottom-dock-instruction">Drag a tool here to embed</span>
       <div className="exo-bottom-dock-status">
         <button type="button" title="Native session diagnostics" aria-label="Show native session diagnostics"
           aria-expanded={gradeDockFooterInfoOpen} onClick={()=>setGradeDockFooterInfoOpen(previous=>!previous)}>
           <Activity size={13}/></button>
         {gradeDockFooterInfoOpen&&<aside className="exo-bottom-dock-diagnostics" aria-label="Native session diagnostics">
           <strong>{busy?'Computing':playing?'Rust simulation running':'Rust session ready'}</strong>
           <span>{s?.positions.length??0} vertices · {s?.time?.toFixed(3)??'—'} s</span>
           <span>Seam gap: {s?.metrics?.max_seam_gap_m!=null?(s.metrics.max_seam_gap_m*1000).toFixed(2)+' mm':'—'}</span>
           <button type="button" disabled={busy||!s} onClick={runPatternAudit}>Run Pattern QA</button>
           <small>Native diagnostics are informational, not physical fit certification.</small>
         </aside>}
       </div>
     </div>
   </section>}
   {layout!=='2d'&&<div className="cc-embedded-footer"><button type="button" disabled={busy||!s} onClick={runPatternAudit} aria-label="Run native Rust pattern QA">Pattern QA</button><strong>{busy?'Computing…':playing?'Running Rust simulation':'Rust session ready'}</strong><span>{s?.positions.length??0} vertices · {s?.time?.toFixed(3)??'—'} s · Seam gap {s?.metrics?.max_seam_gap_m!=null?(s.metrics.max_seam_gap_m*1000).toFixed(2)+' mm':'—'} · P95 stretch {s?.metrics?.extension_p95_percent?.toFixed(2)??'—'}%</span><details data-dart-fit-inspector="true" style={{maxWidth:300,fontSize:11}}><summary>3D dart closure · {s?.dartFit?.length||0} seam(s)</summary>{s?.dartFit?.length?s.dartFit.map(dart=><p key={dart.seamId} data-dart-fit-seam={dart.seamId} data-dart-gap-mm={dart.maxGapMm} data-dart-rms-mm={dart.rmsGapMm} data-dart-provisional-closure={String(dart.withinProvisional2mm)}>{dart.seamId}: max {Number(dart.maxGapMm).toFixed(2)} mm · RMS {Number(dart.rmsGapMm).toFixed(2)} mm · {dart.withinProvisional2mm?'within provisional 2 mm':'legs still open'}</p>):<p>Add a cut-and-sewn physical dart to inspect 3D seam separation.</p>}<small>Measured from Rust solver positions; not a folded-dart, fit or collision certification.</small></details><small>Physical fit not certified</small></div>}
  </div>
 }
 return <main ref={workspaceRoot} className={`cc-workspace cc-exo-shell ${patternFocus?'cc-pattern-studio-focus':''} ${standalone3DFullscreen?'cc-3d-studio-focus':''}`}><ClothCraftContextMenu context={contextMenu} items={contextItems} onChoose={executeContextAction} onClose={()=>setContextMenu(null)}/>{focusDock}{nativeGradingPortal}<header className="cc-header"><div className="cc-brand"><Box size={18}/><strong>EXO <span>SAMPLE 3D</span></strong><small>× CLOTHCRAFT ENGINE</small></div><div className="cc-exo-menus"><button onClick={()=>setLibraryOpen(v=>!v)} aria-label="Toggle asset library"><FolderOpen size={15}/> LIBRARY</button><button onClick={()=>setInspectorOpen(v=>!v)} aria-label="Toggle property editor"><Settings2 size={15}/> PROPERTIES</button><select aria-label="EXO workspace section" value={section} onChange={e=>activateSection(e.target.value)}>{EXO_SECTIONS.map(([name])=><option key={name}>{name}</option>)}</select><select aria-label="Viewport layout" value={layout} onChange={e=>setLayout(e.target.value)}><option value="split">3D + 2D</option><option value="3d">3D focus</option><option value="2d">2D focus</option></select></div><div className="cc-header-actions"><button type="button" onClick={patternFocus?exitPatternFocus:enterPatternFocus} aria-label={patternFocus?'Exit full-screen 2D pattern studio':'Open full-screen 2D pattern studio'}><Maximize2 size={14}/> {patternFocus?'Exit 2D Studio':'2D Grading Studio'}</button><label className="cc-button" title="Open ClothCraft or compatible EXO garment project"><FolderOpen size={14}/> Open project<input type="file" accept=".json" hidden disabled={busy||playing} onChange={importFile}/></label><button onClick={()=>save(false)} disabled={busy||playing||!s} title="Save current Rust garment project"><Save size={15}/> Save</button><button onClick={()=>save(true)} disabled={busy||playing||!s}><Download size={15}/> Save / export</button><a href="?desktop=1" title="Open the full EXO interface">FULL EXO <ChevronRight size={14}/></a></div></header>
 <div className="cc-project-bar"><div><strong>GARMENT STUDIO</strong><span>{s?.template.name||'Loading ClothCraft project…'}</span><small>REV {s?.revision??'—'} · {s?.template.panels.length??0} PANELS · {s?.template.seams.length??0} SEAMS</small></div><div className="cc-project-fittings"><span className="cc-online-dot"/> RUST VBD + OGC <span className="cc-project-status">{playing?'SIMULATING':busy?'WORKING':'READY'}</span></div></div>
 <nav className="cc-toolbar"><div>{[['edit','Select / edit',MousePointer2],['sew','Sew edges',Scissors],['pen','Draw pattern',PenTool],['line','Internal line',Layers],['move3d','Move 3D',Move3D],['rotate3d','Rotate 3D',Rotate3D]].map(([key,label,Icon])=><button key={key} title={label} aria-pressed={mode===key} className={mode===key?'active':''} onClick={()=>{setMode(key);setPair([]);if(key==='sew')setSection('Sewing');else if(key==='line')setSection('Sewing');else if(key==='pen')setSection('Pattern')}}><Icon size={15}/>{label}</button>)}<button type="button" title="Foam Padding / Trapunto" aria-label="Foam Padding / Trapunto" aria-pressed={foamOpen} onClick={()=>{setFoamOpen(v=>!v);setSection('Pattern')}}><Layers size={15}/>Foam Padding / Trapunto</button><button type="button" disabled={busy||!s} onClick={runPatternAudit} aria-label="Run native Rust pattern QA">Pattern QA</button></div><div><button disabled={busy||playing||!s?.canUndo} onClick={()=>requestHistory('undo')}><Undo2 size={15}/>Undo</button><button disabled={busy||playing||!s?.canRedo} onClick={()=>requestHistory('redo')}><Redo2 size={15}/>Redo</button><button disabled={(!playing&&busy)||!s} className="cc-primary" onClick={play}>{playing?<Pause size={15}/>:<Play size={15}/>} {playing?'Pause':'Simulate'}</button><button disabled={busy||playing||!s} onClick={()=>request({op:'step',steps:1})}>Single step</button><button disabled={busy||playing||!s} onClick={()=>void resetPatternPosition()}><RotateCcw size={15}/>Reset arrangement</button></div></nav>
 {(error||notice)&&<div className={error?'cc-error':'cc-notice'} role="status">{error||notice}<button onClick={()=>{setError('');setNotice('')}}>×</button></div>}
 <div className={`cc-body cc-layout-${patternFocus?'2d':layout} ${libraryOpen?'':'cc-no-library'} ${inspectorOpen?'':'cc-no-inspector'}`}>
 <nav className="cc-exo-rail" aria-label="EXO tool categories">{EXO_SECTIONS.map(([name,Icon])=><button key={name} className={section===name?'active':''} aria-pressed={section===name} title={name} onClick={()=>activateSection(name)}><Icon size={19}/><span>{name}</span></button>)}</nav>
 {libraryOpen&&<aside className="cc-pieces" aria-label="EXO asset browser"><div className="cc-side-title"><span>ASSET BROWSER</span><FolderOpen size={15}/></div><div className="cc-library-tabs">{['Pieces','Seams','Library','History'].map(tab=><button key={tab} className={tab===libraryTab?'active':''} onClick={()=>setLibraryTab(tab)}>{tab}</button>)}</div><label className="cc-search"><Search size={14}/><input aria-label="Search library items" value={filter} onChange={e=>setFilter(e.target.value)} placeholder={`Find ${libraryTab.toLowerCase()}…`}/></label>
 {libraryTab==='Pieces'&&<><h3>GARMENT · {s?.template.panels.length??0} PANELS</h3><p>{s?.template.name||'Connecting…'}</p>{s?.template.panels.filter(p=>filtered(p.name)).map((p,i)=><button data-piece={p.id} key={p.id} className={active?.panel===p.id?'active':''} onMouseEnter={()=>setHovered({panel:p.id})} onMouseLeave={()=>setHovered(null)} onClick={()=>showPiece(p.id)}><i style={{background:COLORS[i%COLORS.length]}}/>{p.name}<ChevronRight size={13}/></button>)}</>}
 {libraryTab==='Seams'&&<><h3>SEWING RELATIONSHIPS · {s?.template.seams.length??0}</h3>{s?.template.seams.filter(item=>filtered(item.id)).map(seam=><div className="cc-seam-row" key={seam.id} onMouseEnter={()=>setHovered({panel:seam.a.panel,edge:seam.a.edge})} onMouseLeave={()=>setHovered(null)}><button onClick={()=>{setSelected({panel:seam.a.panel,edge:seam.a.edge,kind:'sewing',seamId:seam.id});activateSection('Sewing')}}>{seam.id}</button><button aria-label={`Delete seam ${seam.id}`} disabled={busy||playing} onClick={()=>edit({kind:'RemoveSeam',seam:seam.id})}>×</button></div>)}</>}
 {libraryTab==='Library'&&<><h3>STARTING BLOCKS</h3>{[['T-shirt','tshirt'],['Dress','dress']].filter(([name])=>filtered(name)).map(([name,preset])=><button key={preset} disabled={busy||playing} onClick={()=>openPreset(preset)}><Shirt size={15}/>{name} fixture</button>)}<h3>NEW PATTERN ELEMENTS</h3><button onClick={()=>{activateSection('Pattern');setShape('rectangle')}}><FilePlus2 size={14}/> Rectangle</button><button onClick={()=>{activateSection('Pattern');setShape('ellipse')}}><FilePlus2 size={14}/> Ellipse</button><button onClick={()=>{activateSection('Pattern');setMode('pen')}}><PenTool size={14}/> Draw custom outline</button></>}
 {libraryTab==='History'&&<><h3>SESSION HISTORY</h3><p>Revision {s?.revision??0}</p><button disabled={!s?.canUndo||busy||playing} onClick={()=>requestHistory('undo')}><Undo2 size={15}/> Undo last edit</button><button disabled={!s?.canRedo||busy||playing} onClick={()=>requestHistory('redo')}><Redo2 size={15}/> Redo last edit</button><p>The Rust editing history supports undo/redo; save a project for persistent revisions.</p></>}
 <footer>EXO asset workspace · ClothCraft physics<br/>Unsupported EXO-specific production features remain in Full EXO</footer></aside>}
 <section className="cc-view cc-viewport-3d" style={{position:'relative'}}><h2><span><Box size={14}/> 3D GARMENT</span><small>ClothCraft linked viewport · Orbit / select</small></h2><ClothCraftSceneV2 onCollapse3D={onCollapse3D} onToggle3DStudio={toggleStandalone3DStudio} studio3DActive={layout==='3d'} onToggle3DStudioFullscreen={toggleStandalone3DStudioFullscreen} studio3DFullscreenActive={standalone3DFullscreen} foamPads={nativeFoamPads} onFoamSelect={id=>{setSelectedFoamId(id);if(!embedded)setFoamOpen(true)}} importedHardware={sceneImportedHardware} analysisMode={analysisMode} snapshot={s} active={active} selected={selected} mode={mode==='stretch3d'?'stretch3d':playing||busy?'edit':mode} seamEditing={seamEditing} onContextMenuRequest={event=>openViewportContext({...event,dimension:'3d'})} onCanvasActivate={()=>{shortcutsFocused.current=true}} onChangeMode={changeViewportMode} toolsDisabled={busy&&!playing} onPick={pickInSewingMode} onHover={setHovered} onPlace={placeVisiblePanel} showAvatar={showAvatar} showSeams={showSeams} wireframe={wireframe} showBoundingBox={showBoundingBox} showContactDots={showContactDots} onStretchStart={startClothGrab} onStretchCancel={cancelClothGrab} onStretchDrag={pullClothPoint} environmentPreset={environmentPreset} stageId={stageId} stageSettings={stageSettings} cameraSettings={cameraSettings} sceneLight={sceneLight} sceneLight2={sceneLight2} exposure={exposure} studioAppearance={studioAppearance} studioPreferences={studioPreferences}/></section><section className="cc-view cc-viewport-2d" style={{position:'relative'}}><h2><span><Grid2X2 size={14}/> 2D PATTERN</span><small>True material geometry · metres</small></h2>{s&&<ClothCraftBoardV2 studioPreferences={studioPreferences} patternStudioActive={patternFocus} showGrid={workspaceGrid} nativeGradeProposal={nativeGradeRules?null:nativeGradeProposal} nativeGradeRunsByPanel={multiPanelGradeNest?.ok?multiPanelGradeNest.byPanel:null} nativeGradeVisibility={nativeGradeVisibility} nativeConstructionPreview={nativeConstructionPreview} nativeCurveStationPreview={nativeCurveStationPreview} nativeDartPrecisionPreview={nativeDartPrecisionPreview} nativePhysicalPleatPreview={nativePhysicalPleatPreview} gradingPOMPreview={gradedPOMSource} onPickGradeSize={setGradeNestSelectedSize} showMeasurements={showMeasurements} showSilhouette={showSilhouette} onToggleSilhouette={setShowSilhouette} showAvatar={showAvatar} onToggleAvatar={setShowAvatar} showSeamDots={showContactDots} walkSeamId={walkOpen?walkSeamId:null} walkFraction={walkFraction} onAvatarPick={()=>{pick({avatar:true});activateSection('Avatar')}} graphics={nativeGraphics} foamPads={nativeFoamPads} onMoveFoamPad={editNativeFoamPad} sewingVariant={sewingVariant} editSewing={seamEditing} onSelectSewingSeam={selectExistingSewingSeam} sewingFirstEdge={pair[0]||null} sewingCommitting={segmentCommitting} onSegmentSewEdge={selectSegmentEdge} freeSewPoints={freeSewPoints} onFreeSewPoint={selectFreeSewPoint} onClearFreeSew={clearFreeSew} allowFreeSewEase={ease} onChangeFreeSewEase={setEase} selectedGraphicId={selectedGraphicId} onSelectGraphic={selectGraphicOnBoard} onMoveGraphic={moveGraphicOnBoard} onResizeGraphic={resizeGraphicOnBoard} patternReferences={patternReferences} onUpdatePatternReferences={onUpdatePatternReferences} referenceModeActive={exoObjectTab==='Reference'} showGraphicMeasurements={showGraphicMeasurements} onToggleGraphicMeasurements={toggleGraphicMeasurements} s={s} selection={selected} active={active} pick={pick} hover={setHovered} edit={edit} editBatch={editPatternLayoutBatch} onEnableCurveSeamEase={enableCurveSeamEase} mode={mode} onChangeMode={changeViewportMode} onContextMenuRequest={openViewportContext} busy={busy||playing} onPolygon={(points,tangents)=>{if(mode==='line'){if(!selectedPanel){setDrawingError('Select a pattern before drawing an internal line.');return}const r=s.panels.find(p=>p.id===selectedPanel.id),a=-(selectedPanel.layout_rotation_degrees||0)*Math.PI/180;const local=points.map(p=>{const u=p[0]-r.layout[0],v=p[1]-r.layout[1];return[u*Math.cos(a)-v*Math.sin(a),u*Math.sin(a)+v*Math.cos(a)]});edit({kind:'InternalLine',panel:selectedPanel.id,points:local,tangents:local.map(()=>[0,0])})}else edit({kind:'Polygon',points,tangents:Array.isArray(tangents)&&tangents.length===points.length?tangents:points.map(()=>[0,0]),fabric:s.template.fabrics[0].id})}}/>}<NativePatternAuditPanel audit={patternAudit} revision={s?.revision} onClose={()=>setPatternAudit(null)} onRefresh={runPatternAudit} onGenerateCutlines={runProductionCutlines} onDownloadCutline={downloadCutlineProof} cutlines={cutlineProof} disabled={busy}/><NativeSewingGestureDock20261025
     mode={mode} variant={sewingVariant} firstEdge={pair[0]||null}
     freePoints={freeSewPoints} reverse={reverse} onReverse={setReverse}
     ease={ease} onEase={setEase} committing={segmentCommitting}
     groupMode={sewingGroupMode} manyCount={manySewCount} stagedEdges={pair}
     onGroupMode={next=>{setSewingGroupMode(next);segmentPendingRef.current=null;groupSewPendingRef.current=[];setPair([])}}
     onManyCount={next=>{setManySewCount(next);groupSewPendingRef.current=[];setPair([])}}
     onCancel={()=>{if(sewingVariant==='segment'){segmentPendingRef.current=null;groupSewPendingRef.current=[];setPair([])}else clearFreeSew()}}
     onExit={()=>{segmentPendingRef.current=null;groupSewPendingRef.current=[];clearFreeSew();setPair([]);setMode('edit');setSeamEditing(false);
       window.dispatchEvent(new CustomEvent('exo-clothcraft-select-2d-tool',{detail:{tool:'select'}}))}}/>
   </section>
 {inspectorOpen&&<aside className="cc-inspector" aria-label="EXO property editor"><div className="cc-inspector-heading"><span>PROPERTY EDITOR</span><strong>{section.toUpperCase()}</strong></div><div className="cc-inspector-context"><small>{selectedPanel?'ACTIVE PATTERN':'NO PATTERN SELECTED'}</small><strong>{selectedPanel?.name||'Project settings'}</strong>{selected?.edge&&<span>Edge: {selected.edge}</span>}</div>
 {section==='Pattern'&&<><p className="cc-section-intro">Author material-space patterns with ClothCraft's original 2D and 3D editors.</p><button type="button" onClick={()=>setFoamOpen(true)}>Foam Padding / Trapunto · {nativeFoamPads.length} draft shape(s)</button></>}
 {section==='Sewing'&&<><p className="cc-section-intro">Select two boundaries in either viewport, inspect their correspondence, then sew using Rust's native authoring engine.</p>
  <details data-grice-2d-3d-stage-review="true"><summary>2D → 3D preparation readiness · Grice workshop reference</summary>
   <GriceModaris2Dto3DReadiness20261027 snapshot={s} disabled={busy||playing}/>
  </details>
  <details data-grice-variant-preparation="true"><summary>Production vs 3D piece selection · single/paired review</summary>
   <Grice3DProductionVariant20261027 snapshot={s}
     disabled={busy||playing||Boolean(s?.activeGradedSize)}
     onInstancePreview={async sourceRevision=>{
       const before=state.current
       if(!before?.pieceVariant?.persisted||before.activeGradedSize||
         before.variantAssemblyActive||busy||playing||lock.current||running.current||
         before.revision!==sourceRevision)
         throw Error('Restore the base garment and review the currently saved source variant before previewing physical instances.')
       const response=await request({op:'piece-variant-instance-preview',revision:sourceRevision})
       if(!response||response.sourceRevision!==sourceRevision||
         response.manufacturingApproved!==false||
         !Number.isSafeInteger(response.actualCompiledTriangleCount))
         throw Error('Native Rust did not prove a revision-matched physical 3D instance mesh.')
       return response
     }}
     onInstanceActivate={async sourceRevision=>{
       const before=state.current
       if(!before?.pieceVariant?.persisted||before.activeGradedSize||
         before.variantAssemblyActive||busy||playing||lock.current||running.current||
         before.revision!==sourceRevision)
         throw Error('The authoritative garment changed before 3D assembly activation.')
       const response=await request({op:'piece-variant-instance-activate',revision:sourceRevision})
       if(!response||!response.variantAssemblyActive||response.revision!==sourceRevision+1)
         throw Error('Native Rust did not activate the temporary physical assembly scene.')
       return response
     }}
     onInstanceRestore={async sourceRevision=>{
       const before=state.current
       if(!before?.variantAssemblyActive||before.revision!==sourceRevision||
         busy||playing||lock.current||running.current)
         throw Error('The 3D assembly is not available for safe restore.')
       const response=await request({op:'piece-variant-instance-restore',revision:sourceRevision})
       if(!response||response.variantAssemblyActive||response.revision!==sourceRevision+1)
         throw Error('Native Rust did not restore the original physical source scene.')
       return response
     }}
     onStore={async definition=>{
       const before=state.current
       if(!before?.template||!Number.isSafeInteger(before.revision)||
         before.activeGradedSize||busy||playing||lock.current||running.current||
         definition?.sourceRevision!==before.revision)
         throw Error('Native garment changed or is busy. Restore the base size and review the variant again.')
       const result=await request({op:'piece-variant-store',revision:before.revision,
         variant:{version:1,sourceTemplate:before.template,pieces:definition.pieces}})
       if(!result||result.revision!==before.revision+1||result.pieceVariant?.persisted!==true)
         throw Error('Native Rust did not confirm durable variant storage.')
       return result
     }}
     onClear={async()=>{
       const before=state.current
       if(!before?.pieceVariant?.persisted||before.activeGradedSize||busy||playing||
         lock.current||running.current)
         throw Error('No current saved variant is available to clear.')
       const result=await request({op:'piece-variant-clear',revision:before.revision})
       if(!result||result.pieceVariant?.persisted)
         throw Error('Native Rust did not confirm removal of the saved variant.')
       return result
     }}/>
  </details></>}
 {section==='Fabric'&&<p className="cc-section-intro">Edit the selected panel's actual physical material values in the ClothCraft solver.</p>}
 {section==='Avatar'&&<><fieldset><legend>AVATAR · COLLISION BODY</legend><p>Current body: {s?.avatarModel==='clo-thomas'?'CLO Thomas':'MakeHuman'} fitted collision mesh. Its triangles feed Rust VBD + OGC contact.</p><label><span>Show avatar</span><input type="checkbox" checked={showAvatar} onChange={e=>setShowAvatar(e.target.checked)}/></label><small>Select MakeHuman or CLO Thomas in the EXO avatar library to load its corresponding native collision body. This resets the simulation pose while preserving garment patterns.</small></fieldset><fieldset><legend>BODY MESH DIAGNOSTICS</legend><p>{s?.avatar?.positions.length??'—'} vertices · {s?.avatar?.triangles.length??'—'} triangles</p></fieldset></>}
 {section==='Fit'&&<><fieldset><legend>RUST SIMULATION</legend><p>{s?.backend||'Connecting Rust solver…'}</p><button disabled={busy||!s} onClick={play}>{playing?'Pause simulation':'Simulate garment'}</button><button disabled={busy||playing||!s} onClick={()=>request({op:'step',steps:1})}>Single step</button><button disabled={busy||playing||!s} onClick={()=>void resetPatternPosition()}>Reset arrangement</button></fieldset><fieldset><legend>LIVE CONTACT / FIT</legend><p>Physics time: {s?.time?.toFixed(3)??'—'} s</p><p>Worst seam gap: {s?.metrics?.max_seam_gap_m!=null?(s.metrics.max_seam_gap_m*1000).toFixed(2)+' mm':'—'}</p><p>Stretch p95: {s?.metrics?.extension_p95_percent?.toFixed(2)??'—'}%</p><p>Active contacts: {s?.metrics?.contacts??'—'}</p><p className="cc-warning">Collision and garment fit are experimental. These numbers do not certify a production-ready fit.</p></fieldset><fieldset data-dart-fit-inspector="true"><legend>CUT-AND-SEWN DART · 3D SEAM CLOSURE</legend>{s?.dartFit?.length?s.dartFit.map(dart=><div key={dart.seamId} data-dart-fit-seam={dart.seamId} data-dart-gap-mm={dart.maxGapMm} data-dart-rms-mm={dart.rmsGapMm} data-dart-provisional-closure={String(dart.withinProvisional2mm)}><strong>{dart.seamId}</strong><p>Maximum leg separation: {Number(dart.maxGapMm).toFixed(2)} mm</p><p>RMS separation: {Number(dart.rmsGapMm).toFixed(2)} mm</p><p>Leg lengths: {(dart.lengthsMm||[]).map(value=>Number(value).toFixed(1)).join(' / ')} mm</p><small>{dart.withinProvisional2mm?'Within provisional 2 mm geometry check':'Legs remain more than 2 mm apart — continue checking the simulation'}</small></div>):<p>Author a physical cut-and-sewn dart to inspect its individual 3D seam closure.</p>}<p className="cc-warning">These are direct Rust world-space seam measurements. The 2 mm check is provisional, not a certification of stable simulation, self-contact, an uncut folded dart or garment fit.</p></fieldset></>}
 {section==='Production'&&<details data-modaris-six-stage-tools="true"><summary>Modern Modaris-style F1–F8 command workstation</summary><ModarisCommandStudio20261027 disabled={busy||playing||!s} actions={{
  select:()=>setMode('edit'),line:()=>setMode('line'),polygon:()=>setMode('pen'),
  'measurement-chart':()=>{setConstructionOpen(true);setMode('edit')},
  'grade-chart':()=>{setGradeMode('auto');setGradeStudioTab('rules')},
  'grade-edit':()=>{setGradeMode('manual');setGradeStudioTab('rules')},
  sew:()=>{setSection('Sewing');setMode('sew')},'sewing-balance':()=>{setGradeMode('auto');setGradeStudioTab('quality')},
  'industrial-audit':()=>runPatternAudit(),'cutline':()=>runProductionCutlines(),
  'view-2d':()=>setLayout('2d'),'view-split':()=>setLayout('split'),
  simulate:()=>play(),fit:()=>setSection('Fit'),variant:()=>setSection('Sewing'),
  undo:()=>requestHistory('undo'),redo:()=>requestHistory('redo'),save:()=>save(false),export:()=>save(true),
 }} capabilities={{select:true,line:true,polygon:true,'measurement-chart':true,'grade-chart':true,
 'grade-edit':true,sew:true,'sewing-balance':Boolean(s?.gradeRunPersisted),
 'industrial-audit':true,cutline:true,'view-2d':true,'view-split':true,
 simulate:true,fit:true,variant:true,undo:Boolean(s?.canUndo),redo:Boolean(s?.canRedo),save:true,export:true}}
 /></details>}{section==='Production'&&<details data-modaris-dependency-tools="true"><summary>Parametric measurement and six-size dependency inspector</summary>
 <ModarisDependencyStudio20261027 snapshot={s} disabled={busy||playing||Boolean(s?.activeGradedSize)} onPreview={payload=>nativeSixSizeRegeneration(payload,false)} onCommit={payload=>nativeSixSizeRegeneration(payload,true)}/></details>}
 {section==='Production'&&<><ModarisIndustrialInterchangeStudio20261027 snapshot={s} disabled={busy||playing||Boolean(s?.activeGradedSize)} onAuditPattern={runPatternAudit} onGenerateCutlines={runProductionCutlines} onOpenGrading={()=>{setGradePanelTarget(selected?.panel||s?.template?.panels?.[0]?.id||'');setGradeMode('auto')}} onOpenSewing={()=>activateSection('Sewing')} onOpenVariant={()=>activateSection('Sewing')} onOpen3D={()=>setLayout('3d')} onDownloadProject={()=>save(true)} onDownloadPattern={exportPatternSvg} onDownloadDrape={exportClothObj} onAuditSixSizes={()=>runNativeSixSizeIndustrialAudit({sourceRevision:s?.revision,panelId:selected?.panel||s?.template?.panels?.[0]?.id})} onAuditSewing={()=>runNativeSixSizeSewingAudit({sourceRevision:s?.revision})}/><fieldset><legend>EXO FILE OUTPUT</legend><button disabled={busy||playing||!s} onClick={()=>save(true)}><Download size={14}/> Export editable fitting project JSON</button><button disabled={!s} onClick={exportClothObj}><Box size={14}/> Export current drape OBJ</button><button disabled={!s} onClick={exportPatternSvg}><Grid2X2 size={14}/> Export pattern reference SVG</button><p>Visual SVG is not a print-to-scale factory pattern. Full EXO has the grading, DXF, tech packs and production handoff tools.</p><a href="?desktop=1" className="cc-go-classic">Open full EXO production workspace <ChevronRight size={13}/></a></fieldset></>}
 {section==='Render'&&<><fieldset><legend>3D DISPLAY</legend><label>Avatar body<input type="checkbox" checked={showAvatar} onChange={e=>setShowAvatar(e.target.checked)}/></label><label>Seam correspondences<input type="checkbox" checked={showSeams} onChange={e=>setShowSeams(e.target.checked)}/></label><label>Cloth wireframe<input type="checkbox" checked={wireframe} onChange={e=>setWireframe(e.target.checked)}/></label></fieldset><fieldset><legend>VIEWPORT LAYOUT</legend><select aria-label="Render viewport layout" value={layout} onChange={e=>setLayout(e.target.value)}><option value="split">Side by side</option><option value="3d">3D focus</option><option value="2d">2D focus</option></select><p>Studio lighting and material rendering in Full EXO are separate from ClothCraft's physical material controls.</p></fieldset></>}
 {section==='Sewing'&&<fieldset><legend>Sewing correspondence</legend><p>{pair.map(p=>`${p.panel} / ${p.edge}`).join(' → ')||'Pick two edges in either view'}</p><label><input type="checkbox" checked={reverse} onChange={e=>setReverse(e.target.checked)}/> Reverse second edge</label><label><input type="checkbox" checked={ease} onChange={e=>setEase(e.target.checked)}/> Allow easing / unequal lengths</label>{ranges.map((range,i)=><label key={i}>Edge {'AB'[i]} interval{range.map((n,j)=><input key={j} aria-label={`Edge ${'AB'[i]} ${j?'end':'start'}`} type="number" min="0" max="1" step=".05" value={n} onChange={e=>setRanges(v=>v.map((r,k)=>k===i?r.map((n,l)=>l===j?Number(e.target.value):n):r))}/>)}</label>)}<button disabled={busy||pair.length!==2} onClick={async()=>{const r=await edit({kind:'Sew',a:boundary(pair[0],0),b:boundary(pair[1],1),reverse,ease});if(r)setPair([])}}>Create seam</button><button onClick={()=>setPair([])}>Cancel</button></fieldset>}
 {section==='Pattern'&&<fieldset><legend>Add pattern</legend><select value={shape} onChange={e=>setShape(e.target.value)}><option value="rectangle">Rectangle</option><option value="ellipse">Ellipse</option><option value="sector">Arc sector</option></select>{size.map((n,i)=><label key={i}>{i?'Height':'Width'} (mm)<input type="number" value={n} min="5" max="10000" onChange={e=>setSize(v=>v.map((n,k)=>k===i?Number(e.target.value):n))}/></label>)}<button disabled={busy||!s} onClick={()=>edit({kind:'Primitive',shape,size:size.map(n=>n/1000),origin:[0,0],fabric:s.template.fabrics[0].id})}>Create piece</button></fieldset>}
 {selectedPanel&&['Pattern','Fabric'].includes(section)&&<>{section==='Pattern'&&<><fieldset><legend>Pattern operations</legend><button disabled={busy||playing} onClick={()=>edit({kind:'Duplicate',panel:selectedPanel.id})}>Duplicate</button>{['x','y'].map(axis=><button key={axis} disabled={busy||playing} onClick={()=>edit({kind:'Mirror',panel:selectedPanel.id,axis,copy_side:1})}>Mirror {axis.toUpperCase()}</button>)}<button disabled={busy||playing} onClick={()=>{if(confirm('Remove this panel and its sewing relationships?'))edit({kind:'RemovePanel',panel:selectedPanel.id})}}>Remove piece</button></fieldset><fieldset><legend>3D arrangement</legend>{['translation','rotation_degrees'].map(key=><div key={key}><small>{key==='translation'?'Position (m)':'Rotation (°)'}</small>{selectedPanel.placement[key].map((n,i)=><label key={`${selectedPanel.id}-${key}-${i}-${n}`}>{'XYZ'[i]}<input type="number" step={key==='translation'?'.01':'5'} defaultValue={n} disabled={busy||playing} onBlur={e=>edit({kind:'Place',panel:selectedPanel.id,placement:{...selectedPanel.placement,[key]:selectedPanel.placement[key].map((n,j)=>i===j?Number(e.target.value):n)}})}/></label>)}</div>)}</fieldset></>}{section==='Fabric'&&<ClothCraftFabricLibrary snapshot={s} panel={selectedPanel} busy={busy||playing} onEdit={edit}/>}</>}
 {section==='Pattern'&&selectedPanel?.polygon&&<fieldset><legend>Points and curves</legend><select aria-label="Pattern point" value={selected?.anchor??0} onChange={e=>setSelected({panel:selectedPanel.id,anchor:Number(e.target.value)})}>{selectedPanel.polygon.points.map((_,i)=><option key={i} value={i}>Point {i+1}</option>)}</select>{selectedPanel.polygon.points[selected?.anchor??0]?.map((n,i)=><label key={`${selectedPanel.id}-${selected?.anchor}-${i}-${n}`}>{i?'Y':'X'} (mm)<input type="number" defaultValue={n*1000} disabled={busy||playing} onBlur={e=>{const anchor=selected?.anchor??0,position=[...selectedPanel.polygon.points[anchor]];position[i]=Number(e.target.value)/1000;edit({kind:'Anchor',panel:selectedPanel.id,anchor,position})}}/></label>)}<button disabled={busy||playing} onClick={()=>edit({kind:'CurvePoint',panel:selectedPanel.id,anchor:selected?.anchor??0,curved:true})}>Curve point</button><button disabled={busy||playing} onClick={()=>edit({kind:'CurvePoint',panel:selectedPanel.id,anchor:selected?.anchor??0,curved:false})}>Straighten point</button><button disabled={busy||playing} onClick={()=>edit({kind:'RemovePoint',panel:selectedPanel.id,point:selected?.anchor??0})}>Remove point</button></fieldset>}
 {section==='Sewing'&&selected?.edge&&<fieldset><legend>Boundary length</legend><label>Length (mm)<input type="number" min="1" value={edgeLength} onChange={e=>setEdgeLength(Number(e.target.value))}/></label><button disabled={busy||playing} onClick={()=>edit({kind:'TargetLength',panel:selected.panel,edge:selected.edge,target_m:edgeLength/1000})}>Set target length</button><button disabled={busy||playing} onClick={()=>edit({kind:'SplitBoundary',panel:selected.panel,edge:selected.edge,at_m:edgeLength/1000})}>Split at distance</button></fieldset>}
 {section==='Pattern'&&selectedPanel&&<fieldset><legend>Combine patterns / cut holes</legend><select aria-label="Boolean tool panel" value={toolPanel} onChange={e=>setToolPanel(e.target.value)}><option value="">Choose second panel</option>{s.template.panels.filter(p=>p.id!==selectedPanel.id).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>{['union','difference','intersection'].map(operation=><button key={operation} disabled={busy||!toolPanel} onClick={()=>edit({kind:'Boolean',a:selectedPanel.id,b:toolPanel,operation,keep_tool:true})}>{operation==='union'?'Join':operation==='difference'?'Subtract / hole':'Intersection'}</button>)}</fieldset>}
 {section==='Sewing'&&selectedPanel?.polygon?.lines?.length>0&&<fieldset><legend>Internal sewing / ruffle</legend><select value={lineId||selectedPanel.polygon.lines[0].id} onChange={e=>setLineId(e.target.value)}>{selectedPanel.polygon.lines.map(l=><option key={l.id} value={l.id}>{l.id}</option>)}</select><label>Width (mm)<input type="number" value={ruffleWidth} onChange={e=>setRuffleWidth(Number(e.target.value))}/></label><label>Gather ratio<input type="number" step=".1" value={ruffleRatio} onChange={e=>setRuffleRatio(Number(e.target.value))}/></label><button disabled={busy||playing} onClick={()=>edit({kind:'Ruffle',panel:selectedPanel.id,line:lineId||selectedPanel.polygon.lines[0].id,width:ruffleWidth/1000,ratio:ruffleRatio})}>Create and sew ruffle</button><button disabled={busy||playing} onClick={()=>edit({kind:'RemoveLine',panel:selectedPanel.id,line:lineId||selectedPanel.polygon.lines[0].id})}>Remove internal line</button></fieldset>}
 </aside>}</div><footer className="cc-status"><span>{busy?'Computing…':playing?'Simulating':'Ready'} · {s?.backend||'Connecting to native workspace'}</span><span>{s?.positions.length||0} vertices · {s?.time?.toFixed(3)||'0'} s · Seam gap {s?.metrics?.max_seam_gap_m!=null?(s.metrics.max_seam_gap_m*1000).toFixed(2)+' mm':'—'} · P95 stretch {s?.metrics?.extension_p95_percent?.toFixed(2)??'—'}%</span><small>{s?.metrics?.max_seam_gap_m>.015&&s?.time>4?'Seams remain open — adjust arrangement':'Normal contact · no friction · fit not certified'}</small></footer></main>
}
