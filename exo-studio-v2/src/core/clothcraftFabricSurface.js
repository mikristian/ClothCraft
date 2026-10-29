import * as THREE from 'three'
import {presetForFabric} from './clothcraftFabrics.js'
import {normalizeWashSpec} from './clothWashProcedurals.js'
import {washPixelColor} from './clothWashImage.js'
import {tintLicensedFabricScan} from './photographicScanToning.js'
import {balanceScannedRoughness} from './fabricPbrAppearance.js'
// Tile = 8 yarn pitches in metre-based rest UVs, independent of panel size/drape.
const tau=2*Math.PI
// Periodic micro-irregularity avoids a visible discontinuity at texture tile edges.
const noise=(x,y)=>.5+.27*Math.sin(tau*(13*x+19*y)/64)+.23*Math.cos(tau*(17*x-11*y)/64)
const clamp01=x=>Math.max(0,Math.min(1,x))
const validRange=(value,min,max)=>typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max
export function applyFabricSurfaceAppearance(material,appearance) {
 if(!material?.isMeshPhysicalMaterial)return material
 const overrides=appearance&&typeof appearance==='object'&&!Array.isArray(appearance)?appearance:{}
 const color=typeof overrides.color==='string'&&/^#[0-9a-f]{6}$/i.test(overrides.color)?overrides.color:null
 if(color)material.color.set(color)
 if(validRange(overrides.opacity,0,1)){
  material.opacity=overrides.opacity
  material.transparent=overrides.opacity<1
  material.depthWrite=overrides.opacity===1
 }
 if(validRange(overrides.roughness,0,1))material.roughness=overrides.roughness
 if(validRange(overrides.metalness,0,1))material.metalness=overrides.metalness
 if(validRange(overrides.reflectionIntensity,0,3)){
  material.envMapIntensity=overrides.reflectionIntensity
  material.specularIntensity=overrides.reflectionIntensity
 }
 material.userData.fabricAppearance=Object.fromEntries(Object.entries({color,opacity:overrides.opacity,roughness:overrides.roughness,metalness:overrides.metalness,reflectionIntensity:overrides.reflectionIntensity}).filter(([key,value])=>key==='color'?Boolean(value):validRange(value,0,key==='reflectionIntensity'?3:1)))
 material.needsUpdate=true
 return material
}
function relief(kind,u,v,x,y) {
 const warp=(Math.cos(u*tau)+1)*.5
 const weft=(Math.cos(v*tau)+1)*.5
 const grain=noise(x,y)-.5
 if (kind==='twill') return clamp01(.27*warp+.27*weft+.28*Math.sin((u-v)*tau*.25)+.10*grain+.13)
 if (kind==='jersey-knit'||kind==='knit') return clamp01(.48+.25*Math.cos(u*tau+Math.sin(v*tau)*.55)+.14*Math.cos(v*tau)+.09*grain)
 if (kind==='rib-knit')return clamp01(.5+.32*Math.cos(u*tau*.5)+.12*Math.cos(v*tau)+.07*grain)
 if (kind==='waffle-knit')return clamp01(.2+.44*Math.abs(Math.cos(u*tau*.5)*Math.cos(v*tau*.5))+.09*grain)
 if (kind==='terry-knit'||kind==='fleece-pile')return clamp01(.52+.13*Math.cos(u*tau+.7*Math.sin(v*tau))+.12*Math.cos(v*tau*1.5)+.17*grain)
 if (kind==='basket-weave')return clamp01(.30+.22*Math.cos(u*tau*.5)+.22*Math.cos(v*tau*.5)+.09*grain)
 if (kind==='corduroy')return clamp01(.43+.33*Math.cos(u*tau*.5)+.07*grain)
 if (kind==='velvet'||kind==='boucle')return clamp01(.48+.22*Math.cos(u*tau*2)*Math.cos(v*tau*2)+.16*grain)
 if (kind==='crepe')return clamp01(.49+.09*(warp+weft)+.25*grain)
 if (kind==='mesh')return clamp01(.14+.8*Math.max(Math.pow(warp,5),Math.pow(weft,5)))
 if (kind==='suede')return clamp01(.48+.24*grain+.1*Math.sin((u*.41+v*.15)*tau))
 if (kind==='leather')return clamp01(.49+.12*Math.sin((u*.47+v*.29)*tau)+.12*Math.sin((u*.59-v*.33)*tau)+.12*grain)
 if (kind==='synthetic'||kind==='silk')return clamp01(.50+.11*warp+.11*weft+.04*grain)
 if (kind==='ripstop') return clamp01(.33+.12*warp+.12*weft+.31*Math.pow(Math.cos(u*tau*.125),18)+.09*grain)
 return clamp01(.3+.26*warp+.26*weft+.08*grain)
}
export function createFabricSurface(fabric,grainDegrees=0,appearance=null,onTextureUpdate=null) {
 const preset=presetForFabric(fabric),a=preset?.appearance
 const wash=normalizeWashSpec(preset?.wash)
 const washed=wash.type!=='raw'&&wash.strength>0
 const material=new THREE.MeshPhysicalMaterial({
  color:washed?'#ffffff':a?.color||'#b8b4ab',side:THREE.DoubleSide,metalness:0,
  roughness:a?.roughness??.85,sheen:a?.sheen??.2,
  sheenColor:new THREE.Color('#eee9df'),sheenRoughness:.75,
  clearcoat:/patent|coated|waxed/i.test(preset?.name||'') ? .38 : 0,
  clearcoatRoughness:.28,
  anisotropy:/silk|satin|suede|velvet|twill|denim/i.test(preset?.name||'') ? .33 : .08,
 })
 material.userData.fabricPreset=preset?.id||'custom'
 material.userData.washEffect=washed?wash.type:'raw'
 if(!a)return applyFabricSurfaceAppearance(material,appearance)
 const size=64,data=new Uint8Array(size*size*4),albedo=new Uint8Array(size*size*4)
 const dyed=/^#[\da-f]{6}$/i.test(a.color||'')?[1,3,5].map(i=>parseInt(a.color.slice(i,i+2),16)):[184,180,171]
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/8,v=y/8,h=relief(a.weave,u,v,x,y)
  const n=(y*size+x)*4
  data[n]=data[n+1]=data[n+2]=Math.round(85+h*105);data[n+3]=255
  // A neutral dye multiplier lets woven crossings / nap catch the studio
  // lighting without overriding assigned fabric color or providing a photo.
  const dye=Math.round(Math.max(208,Math.min(255,229+(h-.5)*28)))
  if(washed){
   const result=washPixelColor(dyed.map(channel=>Math.round(channel*dye/255)),x/size,y/size,wash)
   albedo[n]=result[0];albedo[n+1]=result[1];albedo[n+2]=result[2]
  } else {
   albedo[n]=albedo[n+1]=albedo[n+2]=dye
  }
  albedo[n+3]=255
 }
 const map=new THREE.DataTexture(data,size,size,THREE.RGBAFormat)
 const color=new THREE.DataTexture(albedo,size,size,THREE.RGBAFormat)
 const repeats=1/(Math.max(.00015,Number(a.pitch)||.001)*8)
 for (const texture of [map,color]) {
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping
  texture.repeat.set(repeats,repeats);texture.rotation=grainDegrees*Math.PI/180
  texture.generateMipmaps=true;texture.minFilter=THREE.LinearMipmapLinearFilter
  texture.magFilter=THREE.LinearFilter;texture.anisotropy=8;texture.needsUpdate=true
 }
 color.colorSpace=THREE.SRGBColorSpace
 map.generateMipmaps=true;map.minFilter=THREE.LinearMipmapLinearFilter;map.magFilter=THREE.LinearFilter;map.needsUpdate=true
 material.bumpMap=map
 material.map=color
 material.bumpScale=a.weave==='suede'?.000022 : a.weave==='leather'?.000065 : a.weave==='fleece-pile'?.00011 : .000055
 const owned=[map,color]
 let disposed=false
 const photo=preset?.photoScan
 if(photo?.scanAssetId&&typeof document!=='undefined'){
  const loader=new THREE.TextureLoader()
  const repeat={x:1/(Math.max(.5,photo.repeatWidthCm)*.01),y:1/(Math.max(.5,photo.repeatHeightCm)*.01)}
  const load=(source,key,colorChannel)=>{
   if(!source)return
   const texture=loader.load(source,(loaded)=>{
    if(disposed)return
    if(colorChannel){
      const graded=tintLicensedFabricScan(loaded.image,{
        color:photo.color, wash:photo.wash,
      },{width:Math.min(1024,loaded.image?.naturalWidth||1024),height:Math.min(1024,loaded.image?.naturalHeight||1024)})
      if(graded){
       loaded.image=graded;loaded.needsUpdate=true
       // Retargeted scan already contains the dye and must not be tinted twice.
       material.color.set('#ffffff')
      }else{
       // A raw photographic scan must not inherit the washed procedural
       // fallback's white material tint when canvas access is unavailable.
       material.color.set(photo.color||a.color||'#b8b4ab')
      }
      material.map=loaded
    }else if(key==='normalMap'){
      material.normalMap=loaded;material.bumpMap=null
      material.normalScale=new THREE.Vector2(.65,.65)
    }else {
      const graded=balanceScannedRoughness(loaded.image,{
        name:preset.name,
        texture:photo,
      },{width:Math.min(1024,loaded.image?.naturalWidth||1024),height:Math.min(1024,loaded.image?.naturalHeight||1024)})
      if(graded){loaded.image=graded;loaded.needsUpdate=true}
      material.roughnessMap=loaded
    }
    applyFabricSurfaceAppearance(material,appearance)
    onTextureUpdate?.(material)
   })
   texture.wrapS=texture.wrapT=THREE.RepeatWrapping
   texture.repeat.set(repeat.x,repeat.y)
   texture.colorSpace=colorChannel?THREE.SRGBColorSpace:THREE.NoColorSpace
   texture.anisotropy=8
   texture.minFilter=THREE.LinearMipmapLinearFilter
   texture.magFilter=THREE.LinearFilter
   // TextureLoader performs the first needsUpdate when the image is decoded.
   // Forcing it here, while texture.image is still undefined, repeatedly
   // logged 'Texture marked for update but no image data found' in the native
   // garment viewport. The procedural DataTexture remains the fallback.
   owned.push(texture)
  }
  load(photo.src,'map',true)
  load(photo.normalSrc,'normalMap',false)
  load(photo.roughnessSrc,'roughnessMap',false)
  material.userData.scanProvenance=photo.opticalProvenance
 }
 material.userData.ownedTexture={dispose(){
  disposed=true
  for(const texture of owned)texture.dispose()
 }}
 return applyFabricSurfaceAppearance(material,appearance)
}

// Both sides share the same cloth coordinates and texture ownership. The back
// inherits current front optics unless a specific back field was edited.
export function createFabricFaceMaterials(fabric,grainDegrees=0,appearance=null) {
 const frontAppearance=appearance&&typeof appearance==='object'?appearance:{}
 const backOverrides=frontAppearance.back&&typeof frontAppearance.back==='object'?frontAppearance.back:{}
 let back=null,side=null
 const syncBack=front=>{
  if(!back)return
  for(const key of ['map','bumpMap','normalMap','roughnessMap'])back[key]=front[key]
  back.color.copy(front.color)
  back.opacity=front.opacity
  back.transparent=front.transparent
  back.depthWrite=front.depthWrite
  back.roughness=front.roughness
  back.metalness=front.metalness
  back.envMapIntensity=front.envMapIntensity
  back.specularIntensity=front.specularIntensity
  applyFabricSurfaceAppearance(back,backOverrides)
  if(side){
   for(const key of ['map','bumpMap','normalMap','roughnessMap'])side[key]=front[key]
   side.color.copy(front.color)
   for(const key of ['opacity','transparent','depthWrite','roughness','metalness','envMapIntensity','specularIntensity'])side[key]=front[key]
   applyFabricSurfaceAppearance(side,sideOverrides)
  }
 }
 const sideOverrides=frontAppearance.side&&typeof frontAppearance.side==='object'?frontAppearance.side:{}
 const front=createFabricSurface(fabric,grainDegrees,frontAppearance,syncBack)
 front.side=THREE.FrontSide
 back=front.clone()
 back.side=THREE.BackSide
 // Only the front owns texture disposal. A clone shares every texture object.
 back.userData={...front.userData,ownedTexture:null}
 side=front.clone()
 side.side=THREE.DoubleSide
 side.userData={...front.userData,ownedTexture:null}
 syncBack(front)
 return {front,back,side}
}

// A render-only ribbon for topological open edges. This does not alter the
// indexed physics surface. Closed manifolds produce no visible SIDE geometry.
export function createFabricEdgeRibbon(surface,thicknessMeters) {
 const empty={geometry:null,edgeCount:0,thicknessMeters:0}
 if(!surface?.isBufferGeometry||!Number.isFinite(thicknessMeters)||thicknessMeters<=0)return empty
 const position=surface.getAttribute('position'),normal=surface.getAttribute('normal'),uv=surface.getAttribute('uv')
 const index=surface.getIndex()
 if(!position||!normal||!index)return empty
 const counts=new Map()
 const vertices=index.array
 for(let i=0;i+2<vertices.length;i+=3){
  for(const [a,b] of [[vertices[i],vertices[i+1]],[vertices[i+1],vertices[i+2]],[vertices[i+2],vertices[i]]]){
   const key=`${Math.min(a,b)}:${Math.max(a,b)}`
   const record=counts.get(key)
   if(record)record.count++
   else counts.set(key,{a,b,count:1})
  }
 }
 const boundary=[...counts.values()].filter(edge=>edge.count===1)
 if(!boundary.length)return empty
 // Cap display thickness to prevent bad metadata from producing huge fins.
 const thickness=Math.min(.01,thicknessMeters)
 const xyz=[],tex=[],indices=[]
 for(const {a,b} of boundary){
  const start=xyz.length/3
  for(const vertex of [a,b])for(const sign of [1,-1]){
   xyz.push(position.getX(vertex)+normal.getX(vertex)*sign*thickness*.5,
    position.getY(vertex)+normal.getY(vertex)*sign*thickness*.5,
    position.getZ(vertex)+normal.getZ(vertex)*sign*thickness*.5)
   tex.push(uv?.getX(vertex)??0,uv?.getY(vertex)??0)
  }
  indices.push(start,start+1,start+2,start+1,start+3,start+2)
 }
 const geometry=new THREE.BufferGeometry()
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(xyz,3))
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(tex,2))
 geometry.setIndex(indices)
 geometry.computeVertexNormals()
 return {geometry,edgeCount:boundary.length,thicknessMeters:thickness}
}
