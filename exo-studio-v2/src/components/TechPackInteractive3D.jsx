import {techPackSeamMarkers} from '../core/techPackSeamMarkers.js'
import React,{useEffect,useRef,useState} from 'react'
import * as THREE from 'three'
import {OrbitControls} from 'three/addons/controls/OrbitControls.js'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {Crosshair,Maximize,Plus,RotateCcw,Trash2,ZoomIn,ZoomOut} from 'lucide-react'
import {anchorLocalPoint,createSurfaceAnchor} from '../core/techPack3DAnchors.js'
import {mergeNative3DMarkers,resolveNative3DSource} from '../core/techPackInteractiveSources.js'
import './TechPackInteractive3D.css'

const finite=p=>Array.isArray(p)&&p.length>=3&&p.slice(0,3).every(Number.isFinite)
const clamp=n=>Math.max(0,Math.min(1,n))
const posFrom=(position,bounds)=>new THREE.Vector3(...[0,1,2].map(axis=>
  bounds.min.getComponent(axis)+clamp(Number(position?.[axis])||0)*Math.max(.0001,bounds.max.getComponent(axis)-bounds.min.getComponent(axis))))

function nativeFacePanelIds(snapshot){
  const count=snapshot?.triangles?.length
  const panels=snapshot?.panels
  if(Number.isInteger(count)&&count>0&&Array.isArray(panels)&&panels.length){
    const ids=Array(count).fill(undefined)
    let valid=true
    for(const panel of panels){
      const [start,end]=Array.isArray(panel?.triangles)?panel.triangles:[]
      if(typeof panel?.id!=='string'||!panel.id||!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<=start||end>count){
        valid=false;break
      }
      for(let index=start;index<end;index++){
        if(ids[index]!==undefined){valid=false;break}
        ids[index]=panel.id
      }
      if(!valid)break
    }
    if(valid)return ids
  }
  const supplied=snapshot?.trianglePanelIds
  return Array.isArray(supplied)&&supplied.length===count?supplied:[]
}

function makeMesh(positions,triangles,color,source,panelIds){
  const vertices=Array.isArray(positions)?positions:[]
  const validFaces=(Array.isArray(triangles)?triangles:[]).map((triangle,index)=>({triangle,index})).filter(({triangle:t})=>Array.isArray(t)&&t.length===3&&t.every(i=>Number.isInteger(i)&&i>=0&&i<vertices.length&&finite(vertices[i])))
  const faces=validFaces.map(entry=>entry.triangle)
  if(!faces.length)return null
  const data=[]
  for(const tri of faces)for(const index of tri)data.push(...vertices[index].slice(0,3))
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(data,3))
  geometry.computeVertexNormals()
  const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color,roughness:.85,metalness:.02,side:THREE.DoubleSide}))
  mesh.name='EXO techpack native geometry'
  mesh.userData={techpackSource:source,positions,triangles:faces,panelIds:Array.isArray(panelIds)&&panelIds.length===triangles.length?validFaces.map(entry=>panelIds[entry.index]):[]}
  return mesh
}

export default function TechPackInteractive3D({snapshot,markers=[],onChange=()=>{},onOpenPattern,fallbackViews={}}){
  const allMarkers=React.useMemo(()=>mergeNative3DMarkers(snapshot,markers),[snapshot,markers])
  const host=useRef(null)
  const sceneRef=useRef(null)
  const markersRef=useRef(allMarkers)
  const snapshotRef=useRef(snapshot)
  const onChangeRef=useRef(onChange)
  const addRef=useRef(false)
  const [adding,setAdding]=useState(false)
  const [selected,setSelected]=useState('')
  const [pixels,setPixels]=useState({})
  const pinElements=useRef(new Map())
  const pinSignature=useRef('')
  const [message,setMessage]=useState('')
  markersRef.current=allMarkers
  snapshotRef.current=snapshot
  onChangeRef.current=onChange
  addRef.current=adding
  useEffect(()=>{
    const node=host.current
    if(!node)return
    let dead=false
    const scene=new THREE.Scene()
    scene.background=new THREE.Color('#e7e9eb')
    const camera=new THREE.PerspectiveCamera(35,1,.01,100)
    camera.position.set(2.7,1.9,3.8)
    const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:false})
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5))
    renderer.outputColorSpace=THREE.SRGBColorSpace
    node.appendChild(renderer.domElement)
    const controls=new OrbitControls(camera,renderer.domElement)
    controls.target.set(0,.92,0)
    controls.enableDamping=false
    controls.minDistance=.25
    controls.maxDistance=20
    controls.zoomToCursor=true
    controls.update()
    const hemi=new THREE.HemisphereLight('#ffffff','#87929c',2.1)
    const key=new THREE.DirectionalLight('#ffffff',2.5)
    key.position.set(3,6,5)
    const fill=new THREE.DirectionalLight('#d8e7f7',1)
    fill.position.set(-4,3,-3)
    scene.add(hemi,key,fill)
    const floor=new THREE.Mesh(new THREE.CircleGeometry(3.4,56),new THREE.MeshStandardMaterial({color:'#d4d9dd',roughness:1}))
    floor.rotation.x=-Math.PI/2
    floor.position.y=-.02
    scene.add(floor)
    const garment=new THREE.Group()
    scene.add(garment)
    const bounds=new THREE.Box3(new THREE.Vector3(-.7,0,-.5),new THREE.Vector3(.7,1.9,.5))
    const state={scene,camera,renderer,controls,garment,bounds,actor:null,frame:()=>{},fit:()=>{},pick:()=>{}}
    sceneRef.current=state
    const locate=marker=>{
      const anchor=marker.anchor
      if(marker.sourceRef&&!anchor)return null
      if(anchor){
        let object
        if(anchor.source==='actor'&&state.actor){
          const matches=[]
          state.actor.traverse(child=>{if(child.isMesh&&child.name===anchor.objectName)matches.push(child)})
          object=matches[anchor.objectIndex||0]
        }else object=garment.children.find(child=>child.userData.techpackSource===anchor.source)
        if(object){
          const data=object.userData
          const local=anchorLocalPoint(anchor,data.positions,data.triangles,object.geometry)
          if(local)return object.localToWorld(new THREE.Vector3(...local))
        }
        // A surface anchor is authoritative: a missing triangle must not silently
        // drift to an unrelated normalized point after geometry changes.
        return null
      }
      return posFrom(marker.position,bounds) // Existing saved markers.
    }
    state.locateMarker=locate
    const syncPins=()=>{
      // Use untransformed CSS pixels. Techpack zoom/fit scales the entire page,
      // including HTML pins, after these local positions have been calculated.
      const width=renderer.domElement.clientWidth,height=renderer.domElement.clientHeight
      if(!width||!height)return
      const next={}
      const occupied=[]
      for(const marker of markersRef.current){
        const point=locate(marker)
        if(!point)continue
        const vector=point.clone().project(camera)
        if(!Number.isFinite(vector.x)||!Number.isFinite(vector.y)||vector.z>=1||vector.z<=-1||Math.abs(vector.x)>1||Math.abs(vector.y)>1)continue
        const x=(vector.x+1)*width/2,y=(1-vector.y)*height/2
        // A panel and its fabric often share the exact same 3D triangle.
        // Spread only their HTML pins; both still focus the true source anchor.
        let placed=null
        for(let ring=0;ring<7&&!placed;ring++){
          for(let angle=0;angle<(ring?8:1);angle++){
            const theta=angle*Math.PI/4
            const dx=ring*30*Math.cos(theta),dy=ring*30*Math.sin(theta)
            const px=Math.max(14,Math.min(width-14,x+dx))
            const py=Math.max(14,Math.min(height-14,y+dy))
            if(occupied.every(pin=>Math.hypot(px-pin.x,py-pin.y)>=28)){
              placed={x:px,y:py};break
            }
          }
        }
        if(!placed)continue
        occupied.push(placed)
        next[marker.id]=placed
      }
      // OrbitControls sends many changes while dragging; mutate pin layout directly,
      // keeping React state updates for marker membership only.
      for(const [id,element] of pinElements.current){
        const pixel=next[id]
        element.style.display=pixel?'':'none'
        if(pixel){element.style.left=`${pixel.x}px`;element.style.top=`${pixel.y}px`}
      }
      const signature=Object.entries(next).sort(([a],[b])=>a.localeCompare(b)).map(([id,p])=>`${id}:${p.x.toFixed(2)}:${p.y.toFixed(2)}`).join('\u0000')
      if(signature!==pinSignature.current){
        pinSignature.current=signature
        setPixels(next)
      }
    }
    const frame=()=>{if(dead)return;renderer.render(scene,camera);syncPins()}
    const fit=()=>{
      const cloth=garment.children.find(child=>child.userData.techpackSource==='garment')
      const fitBounds=cloth?new THREE.Box3().setFromObject(cloth):bounds
      const size=fitBounds.getSize(new THREE.Vector3())
      const center=fitBounds.getCenter(new THREE.Vector3())
      const vertical=THREE.MathUtils.degToRad(camera.fov)
      const horizontal=2*Math.atan(Math.tan(vertical/2)*camera.aspect)
      const distance=Math.max(.15,size.length()/2/Math.sin(Math.min(vertical,horizontal)/2)*1.12)
      controls.target.copy(center)
      camera.position.copy(center).add(new THREE.Vector3(1.2,.45,2.2).normalize().multiplyScalar(distance))
      camera.lookAt(center)
      controls.update()
      frame()
    }
    const resize=()=>{
      if(!node.isConnected)return
      const width=Math.max(100,node.clientWidth),height=Math.max(100,node.clientHeight)
      renderer.setSize(width,height,false)
      camera.aspect=width/height
      camera.updateProjectionMatrix()
      frame()
    }
    let pointerStart=null
    let dragged=false
    const pointerDown=event=>{pointerStart={x:event.clientX,y:event.clientY};dragged=false}
    const pointerMove=event=>{if(pointerStart&&Math.hypot(event.clientX-pointerStart.x,event.clientY-pointerStart.y)>4)dragged=true}
    const pointerUp=()=>{pointerStart=null}
    const pick=event=>{
      if(!addRef.current)return
      if(dragged){dragged=false;return}
      const rect=renderer.domElement.getBoundingClientRect()
      const pointer=new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-((event.clientY-rect.top)/rect.height*2-1))
      const ray=new THREE.Raycaster()
      ray.setFromCamera(pointer,camera)
      const targets=[...garment.children,...(!garment.children.some(child=>child.userData.techpackSource==='avatar')&&state.actor?[state.actor]:[])]
      const hit=ray.intersectObjects(targets,true).find(entry=>entry.object.isMesh)
      if(!hit){setMessage('Click directly on the 3D avatar or garment to place a detail.');return}
      const size=bounds.getSize(new THREE.Vector3())
      const position=[0,1,2].map(axis=>clamp((hit.point.getComponent(axis)-bounds.min.getComponent(axis))/Math.max(.0001,size.getComponent(axis))))
      const data=hit.object.userData
      const source=data.techpackSource||'actor'
      const actorMeshes=[]
      if(source==='actor')state.actor?.traverse(child=>{if(child.isMesh&&child.name===hit.object.name)actorMeshes.push(child)})
      const anchor=createSurfaceAnchor(hit,source,data.triangles,data.panelIds)
      if(anchor&&source==='actor'){anchor.objectName=hit.object.name;anchor.objectIndex=actorMeshes.indexOf(hit.object)}
      const id=`detail-${Date.now()}-${Math.random().toString(36).slice(2,7)}`
      onChangeRef.current([...markersRef.current,{id,label:`D${String(markersRef.current.length+1).padStart(2,'0')}`,title:'New construction detail',detail:'Add seam, fabric, trim or placement instructions.',position,source,...(anchor?{anchor,...(anchor.panelId?{panelId:anchor.panelId,sourceRef:{kind:'panel',id:anchor.panelId,revision:snapshotRef.current?.revision??null}}:{})}:{})}])
      setSelected(id)
      setAdding(false)
      addRef.current=false
      setMessage('Marker placed. Edit its factory detail below.')
    }
    state.frame=frame;state.fit=fit;state.pick=pick
    controls.addEventListener('change',frame)
    renderer.domElement.addEventListener('click',pick)
    renderer.domElement.addEventListener('pointerdown',pointerDown)
    renderer.domElement.addEventListener('pointermove',pointerMove)
    renderer.domElement.addEventListener('pointerup',pointerUp)
    renderer.domElement.addEventListener('pointercancel',pointerUp)
    const observer=new ResizeObserver(resize)
    observer.observe(node)
    // Optional real preview actor while no native avatar geometry is supplied.
    new GLTFLoader().load('/avatars/opensew/theo.glb',gltf=>{
      if(dead){gltf.scene.traverse(child=>{child.geometry?.dispose?.();if(Array.isArray(child.material))child.material.forEach(m=>m.dispose());else child.material?.dispose?.()});return}
      gltf.scene.visible=false
      scene.add(gltf.scene)
      state.actor=gltf.scene
      state.refresh?.()
      if(!state.garment.children.length)state.fit()
      frame()
    },undefined,()=>setMessage(current=>current||'Native avatar data will appear when the garment loads.'))
    resize()
    return()=>{
      dead=true
      observer.disconnect()
      controls.removeEventListener('change',frame)
      renderer.domElement.removeEventListener('click',pick)
      renderer.domElement.removeEventListener('pointerdown',pointerDown)
      renderer.domElement.removeEventListener('pointermove',pointerMove)
      renderer.domElement.removeEventListener('pointerup',pointerUp)
      renderer.domElement.removeEventListener('pointercancel',pointerUp)
      controls.dispose()
      garment.traverse(child=>{child.geometry?.dispose?.();child.material?.dispose?.()})
      floor.geometry.dispose();floor.material.dispose()
      state.actor?.traverse(child=>{child.geometry?.dispose?.();if(Array.isArray(child.material))child.material.forEach(m=>m.dispose());else child.material?.dispose?.()})
      renderer.dispose()
      renderer.domElement.remove()
      if(sceneRef.current===state)sceneRef.current=null
    }
  },[])
  useEffect(()=>{
    const state=sceneRef.current
    if(!state)return
    state.refresh=()=>{
      const {garment,bounds}=state
      for(const child of [...garment.children]){garment.remove(child);child.geometry?.dispose?.();child.material?.dispose?.()}
      const body=makeMesh(snapshot?.avatar?.positions,snapshot?.avatar?.triangles,'#777c84','avatar',snapshot?.avatar?.trianglePanelIds)
      const cloth=makeMesh(snapshot?.positions,snapshot?.triangles,'#718fa4','garment',nativeFacePanelIds(snapshot))
      if(body)garment.add(body)
      if(cloth)garment.add(cloth)
      if(state.actor)state.actor.visible=!body
      bounds.set(new THREE.Vector3(-.7,0,-.5),new THREE.Vector3(.7,1.9,.5))
      const box=new THREE.Box3().setFromObject(garment)
      if(!box.isEmpty())bounds.copy(box)
      else if(state.actor){const actorBounds=new THREE.Box3().setFromObject(state.actor);if(!actorBounds.isEmpty())bounds.copy(actorBounds)}
      state.frame()
    }
    state.refresh()
    // Fit only once after the first native mesh arrives. Subsequent snapshot
    // updates must retain the user's orbit, zoom and focused source detail.
    if(!state.hasInitialFit&&state.garment.children.length){state.hasInitialFit=true;state.fit()}
  },[snapshot])
  useEffect(()=>{sceneRef.current?.frame()},[allMarkers])
  useEffect(()=>{sceneRef.current?.frame()},[selected])
  const selectedMarker=allMarkers.find(item=>item.id===selected)
  const sourceDetail=resolveNative3DSource(snapshot,selectedMarker?.sourceRef)
  const updateMarker=(id,update)=>onChange(allMarkers.map(marker=>{
    if(marker.id!==id)return marker
    const currentSource=marker.sourceRef?resolveNative3DSource(snapshot,marker.sourceRef):null
    const requiresReview=Boolean(marker.sourceRef&&(!currentSource||currentSource.stale))
    const next={...marker,...update,autoGenerated:false,verified:update.verified??(marker.autoGenerated||requiresReview?false:marker.verified)}
    if(update.verified===true&&marker.sourceRef){
      next.verified=Boolean(currentSource)
      if(currentSource)next.sourceRef={...marker.sourceRef,revision:currentSource.revision}
    }
    return next
  }).filter(marker=>marker.id===id||!marker.autoGenerated))
  const focusMarker=id=>{
    setSelected(id)
    setAdding(false)
    const state=sceneRef.current,marker=allMarkers.find(item=>item.id===id)
    if(!state||!marker)return
    const target=state.locateMarker?.(marker)
    if(!target){setMessage('Marker surface is unavailable in the current mesh. Review its native source before placing or zooming to it.');return}
    const direction=state.camera.position.clone().sub(state.controls.target)
    if(direction.lengthSq()<1e-10)direction.set(0,0,1)
    direction.normalize()
    const distance=Math.max(state.controls.minDistance*1.5,Math.min(1.5,state.bounds.getSize(new THREE.Vector3()).length()*.5))
    state.controls.target.copy(target)
    state.camera.position.copy(target).addScaledVector(direction,distance)
    state.camera.near=Math.max(.001,Math.min(.01,distance/100))
    state.camera.updateProjectionMatrix()
    state.controls.update()
    state.frame()
  }
  const zoom=multiplier=>{
    const scene=sceneRef.current
    if(!scene)return
    scene.camera.position.sub(scene.controls.target).multiplyScalar(multiplier).add(scene.controls.target)
    scene.controls.update();scene.frame()
  }
  return <section className="tpws-interactive-3d tpws-interactive-fullpage" aria-label="Interactive 3D techpack garment and details">
    <div className="tpws-interactive-toolbar" data-editor-only="true"><strong>LIVE GARMENT / INTERACTIVE DETAILS</strong><button type="button" aria-pressed={adding} onClick={()=>{setAdding(v=>!v);setSelected('')}}><Plus size={13}/> Place marker</button><button type="button" onClick={()=>{
      const next=techPackSeamMarkers(snapshot,allMarkers)
      onChange(next);setMessage(next.length===allMarkers.length?'All locatable native seams are already shown.':`Added ${next.length-allMarkers.length} seam references.`)
    }}>Map seam details</button><button type="button" aria-label="Zoom into 3D garment" onClick={()=>zoom(.75)}><ZoomIn size={14}/></button><button type="button" aria-label="Zoom out of 3D garment" onClick={()=>zoom(1.35)}><ZoomOut size={14}/></button><button type="button" aria-label="Fit 3D garment" onClick={()=>sceneRef.current?.fit()}><Maximize size={14}/></button><button type="button" aria-label="Reset 3D view" onClick={()=>sceneRef.current?.fit()}><RotateCcw size={14}/></button></div>
    <div className="tpws-interactive-square">
      <div className={`tpws-interactive-webgl ${adding?'placing':''}`} ref={host}/>
      {Object.entries(pixels).map(([id,pixel])=><button type="button" key={id} ref={element=>{if(element)pinElements.current.set(id,element);else pinElements.current.delete(id)}} className={`tpws-interactive-pin ${selected===id?'selected':''}`} style={{left:pixel.x,top:pixel.y}} title={`Zoom to ${allMarkers.find(m=>m.id===id)?.title||id}`} aria-label={`Zoom to marker ${allMarkers.find(m=>m.id===id)?.label||id}`} onClick={()=>focusMarker(id)}>{allMarkers.find(m=>m.id===id)?.label||'+'}</button>)}
      {selectedMarker&&<div className="tpws-interactive-popover" role="status"><strong>{selectedMarker.label} · {selectedMarker.title}</strong><p>{selectedMarker.detail}</p><span>{selectedMarker.sourceRef?`${selectedMarker.sourceRef.kind} / ${selectedMarker.sourceRef.id}`:'Manual detail'} · {selectedMarker.verified?'Reviewed':'Review pending'}</span></div>}
    </div>
    <p className="tpws-interactive-hint"><Crosshair size={13}/> Drag to orbit. Scroll to zoom. Place a marker by clicking garment geometry. Markers are authored notes and do not imply measured factory tolerances.</p>
    {message&&<p className="tpws-interactive-message" role="status">{message}</p>}
    <div className="tpws-interactive-register"><strong>SOURCE DETAIL INDEX · {allMarkers.length} MARKERS</strong>{selectedMarker&&<div className="tpws-interactive-selected"><strong>{selectedMarker.title}</strong><span>Source: {selectedMarker.sourceRef?`${selectedMarker.sourceRef.kind} / ${selectedMarker.sourceRef.id}`:'Manually placed'} · {sourceDetail?.stale?'Source revision changed':`Revision ${snapshot?.revision??'unavailable'}`}</span>{sourceDetail&&<pre aria-label="Linked native source data">{JSON.stringify(sourceDetail.data,null,2)}</pre>}{selectedMarker.sourceRef&&!sourceDetail&&<p>Native source unavailable. Confirm this reference before production.</p>}</div>}{allMarkers.map(marker=><div className="tpws-interactive-detail" key={marker.id}><button type="button" className="tpws-detail-select" onClick={()=>focusMarker(marker.id)} aria-pressed={selected===marker.id}>{marker.label}</button><div><input aria-label={`${marker.label} detail title`} value={marker.title||''} onChange={e=>updateMarker(marker.id,{title:e.target.value.slice(0,80)})}/><textarea aria-label={`${marker.label} factory detail`} rows={2} value={marker.detail||''} onChange={e=>updateMarker(marker.id,{detail:e.target.value.slice(0,350)})}/><label><input type="checkbox" checked={marker.verified===true} onChange={e=>updateMarker(marker.id,{verified:e.target.checked})}/> Marker position and factory instruction reviewed against sample</label>{marker.sourceRef&&<small>Linked {marker.sourceRef.kind}: {marker.sourceRef.id}</small>}{marker.panelId&&onOpenPattern&&<button type="button" onClick={()=>onOpenPattern(marker)}>View linked pattern · {marker.panelId}</button>}</div>{!marker.autoGenerated&&<button type="button" aria-label={`Delete ${marker.label}`} onClick={()=>{onChange(allMarkers.filter(m=>m.id!==marker.id));if(selected===marker.id)setSelected('')}}><Trash2 size={13}/></button>}</div>)}{allMarkers.length===0&&<p>{!snapshot?.positions?.length?'Native garment mesh is unavailable; hotspots appear when the garment snapshot includes real triangulated panels and seams.':'No native 3D anchors are available for this snapshot. You may place a reviewed manual marker directly on garment geometry.'}</p>}</div>
    {!snapshot?.avatar?.positions?.length&&<small className="tpws-interactive-source">Character preview uses a local visual avatar until a native fitted avatar is available.</small>}
    {fallbackViews.front&&<img className="tpws-interactive-print-fallback" src={fallbackViews.front} alt="Static front garment reference for printed 3D detail sheet"/>}
  </section>
}
