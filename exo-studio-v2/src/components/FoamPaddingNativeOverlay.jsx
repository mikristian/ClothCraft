import * as THREE from 'three'
import {createFoamPaddingGeometry} from '../core/foamPaddingGeometry.js'

const finite=p=>Array.isArray(p)&&p.length>=3&&p.slice(0,3).every(Number.isFinite)

// Material UV barycentric bindings remain stable while Rust advances cloth positions.

const uvCache=new WeakMap()
function uvMapping(snapshot,panelId,point){
 let cache=uvCache.get(snapshot.uv)
 if(!cache){cache=new Map();uvCache.set(snapshot.uv,cache)}
 const panel=snapshot.panels.find(p=>p.id===panelId)
 if(!panel)return null
 let triangles=cache.get(panelId)
 if(!triangles){
  triangles=snapshot.triangles.slice(...panel.triangles).map(tri=>{
   const uv=tri.map(i=>snapshot.uv[i]),[a,b,c]=uv
   if(![a,b,c].every(p=>Array.isArray(p)&&p.slice(0,2).every(Number.isFinite)))return null
   const denominator=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
   return Math.abs(denominator)>1e-12?{tri,a,b,c,denominator}:null
  }).filter(Boolean)
  cache.set(panelId,triangles)
 }
 for(const {tri,a,b,c,denominator} of triangles){
  const u=((b[1]-c[1])*(point[0]-c[0])+(c[0]-b[0])*(point[1]-c[1]))/denominator
  const v=((c[1]-a[1])*(point[0]-c[0])+(a[0]-c[0])*(point[1]-c[1]))/denominator,w=1-u-v
  if(Math.min(u,v,w)>=-1e-5)return {tri,weights:[u,v,w]}
 }
 return null
}
function mappedPosition(snapshot,mapped,heightCm,offset=null,outwardHint=null){
 if(!mapped)return null
 const positions=mapped.tri.map(i=>snapshot.positions[i]);if(!positions.every(finite))return null
 const a=new THREE.Vector3(...positions[0]),b=new THREE.Vector3(...positions[1]),c=new THREE.Vector3(...positions[2])
 const normal=b.clone().sub(a).cross(c.clone().sub(a)).normalize()
 if(normal.lengthSq()<1e-12)return null
 // Solver triangle winding is not a reliable indication of the outside of a
 // garment. The authored pattern face follows its UV winding; correct reversed
 // 3D winding before offsetting a pad, then add the same panel spread offset.
 const ta=mapped.tri.map(i=>snapshot.uv[i])
 const uvCross=(ta[1][0]-ta[0][0])*(ta[2][1]-ta[0][1])-(ta[1][1]-ta[0][1])*(ta[2][0]-ta[0][0])
 if(uvCross<0)normal.negate()
 // A mirrored/back pattern can have positive UV winding while facing inward.
 // The visible garment's radial direction is a stable fallback for draped
 // torsos and sleeves, where an inward lift would bury the pad in the cloth.
 if(outwardHint&&normal.dot(outwardHint)<0)normal.negate()
 const point=a.multiplyScalar(mapped.weights[0]).addScaledVector(b,mapped.weights[1]).addScaledVector(c,mapped.weights[2]).addScaledVector(normal,.004+heightCm/100)
 if(offset)point.add(offset)
 return point
}

export function shapePoints(pad){
 const source=pad.points||[]
 if(source.length<3)return []
 const xs=source.map(p=>p.x),ys=source.map(p=>p.y)
 const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys)
 const originX=(minX+maxX)/2,originY=(minY+maxY)/2
 const sx=(pad.widthCm||maxX-minX)/Math.max(1e-6,maxX-minX),sy=(pad.heightCm||maxY-minY)/Math.max(1e-6,maxY-minY)
 const angle=(pad.rotationDeg||0)*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle)
 return source.map(p=>{const x=(p.x-originX)*sx,y=(p.y-originY)*sy;return [((pad.x||0)+x*c-y*s)/100,((pad.y||0)+x*s+y*c)/100]})
}

export function safeFoamEdgeWidth(points,preferred=1.2){
 const xs=points.map(p=>p.x),ys=points.map(p=>p.y)
 const width=Math.max(...xs)-Math.min(...xs),height=Math.max(...ys)-Math.min(...ys)
 if(!(width>0&&height>0))return null
 for(let edge=Math.min(preferred,width*.18,height*.18);edge>=.025;edge*=.65){
  const result=createFoamPaddingGeometry({points,depthCm:1,edgeWidthCm:edge})
  if(result.valid)return Number(edge.toFixed(4))
 }
 return null
}

export function createSceneMeshes(snapshot,pads,panelOffsets=null){
 const objects=[]
 if(!snapshot?.triangles||!snapshot?.positions||!snapshot?.uv)return objects
 const valid=snapshot.positions.filter(finite)
 const garmentCenter=new THREE.Vector3()
 for(const p of valid)garmentCenter.add(new THREE.Vector3(...p))
 if(valid.length)garmentCenter.divideScalar(valid.length)
 for(const pad of pads){
  const source=shapePoints(pad)
  const offset=panelOffsets?.get?.(pad.panel)||null
  const panel=snapshot.panels.find(item=>item.id===pad.panel)
  const panelIndices=[...new Set((panel&&Array.isArray(panel.triangles)?snapshot.triangles.slice(panel.triangles[0],panel.triangles[1]):[]).flat())]
  const panelCenter=new THREE.Vector3()
  const panelVertices=panelIndices.map(index=>snapshot.positions[index]).filter(finite)
  for(const p of panelVertices)panelCenter.add(new THREE.Vector3(...p))
  if(panelVertices.length)panelCenter.divideScalar(panelVertices.length)
  const outwardHint=panelCenter.clone().sub(garmentCenter)
  outwardHint.y=0
  if(outwardHint.lengthSq()>.0001)outwardHint.normalize()
  else outwardHint.set(0,0,0)
  const geom=createFoamPaddingGeometry({points:source.map(([x,y])=>[x*100,y*100]),depthCm:Math.max(.01,pad.depthCm||.01),edgeWidthCm:Math.max(.05,pad.edgeWidthCm||.05)})
  if(!geom.valid)continue
  const positions=[], compressionHeights=[], surfacePositions=[];let missing=false
  for(const vertex of geom.vertices){
   const hit=uvMapping(snapshot,pad.panel,[vertex.x/100,vertex.y/100]);if(!hit){missing=true;break}
   const p=mappedPosition(snapshot,hit,vertex.heightCm,offset,outwardHint.lengthSq()?outwardHint:null);if(!p){missing=true;break}
   positions.push(...p.toArray())
   compressionHeights.push(Math.max(0,vertex.heightCm)/100)
   const surface=mappedPosition(snapshot,hit,0,offset,outwardHint.lengthSq()?outwardHint:null)
   if(!surface){missing=true;break}
   surfacePositions.push(...surface.toArray())
  }
  if(missing)continue
  const buffer=new THREE.BufferGeometry();buffer.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));buffer.setIndex(geom.indices);buffer.computeVertexNormals()
  const foam=new THREE.Mesh(buffer,new THREE.MeshStandardMaterial({color:0xd9e2ea,roughness:.72,metalness:0,side:THREE.DoubleSide,transparent:false,depthTest:true,depthWrite:true}))
  foam.userData={foamPadId:pad.id,foamPanelId:pad.panel,foamPreview:true,
   foamCompressionBase:new Float32Array(positions),
   foamCompressionSurface:new Float32Array(surfacePositions),
   foamCompressionHeights:new Float32Array(compressionHeights),
   foamCompressionDepthMeters:Math.max(.0001,Number(pad.depthCm)||.01)/100,
   foamCompressionProperties:pad.material||pad.properties||pad.foamProperties||{}}
  foam.renderOrder=20;foam.castShadow=false;foam.receiveShadow=false;objects.push(foam)
  if(pad.sewn){
   for(const guide of geom.stitchPaths){
    const points=[]
    for(const p of guide){const hit=uvMapping(snapshot,pad.panel,[p.x/100,p.y/100]);const mapped=mappedPosition(snapshot,hit,.1,offset,outwardHint.lengthSq()?outwardHint:null);if(!mapped){points.length=0;break}points.push(mapped)}
    if(points.length<2)continue
    const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineDashedMaterial({color:0xffae56,dashSize:.009,gapSize:.006,depthTest:false}))
    line.computeLineDistances();line.renderOrder=22;line.userData={foamPadId:pad.id,foamStitchGuide:true};objects.push(line)
   }
  }
 }
 return objects
}
