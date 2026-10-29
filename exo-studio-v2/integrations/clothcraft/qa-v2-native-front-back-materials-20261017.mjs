import assert from 'node:assert/strict'
import * as THREE from 'three'
import {createFabricFaceMaterials,createFabricEdgeRibbon} from '../../src/core/clothcraftFabricSurface.js'

const nearly=(a,b)=>Math.abs(a-b)<1e-8
const sample={id:'test-fabric'}
for(const appearance of [null,{color:'#aabbcc',opacity:.7,roughness:.42,metalness:.31,reflectionIntensity:1.4}]){
  const {front,back,side}=createFabricFaceMaterials(sample,0,appearance)
  assert.equal(front.side,THREE.FrontSide)
  assert.equal(back.side,THREE.BackSide)
  assert.equal(side.side,THREE.DoubleSide)
  assert.notEqual(front,back)
  for(const key of ['opacity','roughness','metalness','envMapIntensity','specularIntensity'])assert.ok(nearly(front[key],back[key]),key)
  assert.equal(front.color.getHexString(),back.color.getHexString())
  assert.equal(front.color.getHexString(),side.color.getHexString())
  assert.equal(back.userData.ownedTexture,null)
  front.userData.ownedTexture?.dispose()
  front.dispose();back.dispose();side.dispose()
}
const {front,back,side}=createFabricFaceMaterials(sample,0,{
 color:'#aa3344',opacity:.65,roughness:.83,metalness:.17,reflectionIntensity:1.4,
 back:{color:'#3399bb',opacity:.4,metalness:.7},
 side:{color:'#8822ff',roughness:.2},
})
assert.equal(front.color.getHexString(),'aa3344')
assert.equal(back.color.getHexString(),'3399bb')
assert.ok(nearly(back.opacity,.4))
assert.ok(nearly(back.metalness,.7))
assert.ok(nearly(back.roughness,front.roughness))
assert.ok(nearly(back.envMapIntensity,front.envMapIntensity))
assert.equal(side.color.getHexString(),'8822ff')
assert.ok(nearly(side.roughness,.2))
assert.ok(nearly(side.opacity,front.opacity))
const geometry=new THREE.BufferGeometry()
geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,1,0,0,0,1,0],3))
geometry.setIndex([0,1,2]);geometry.computeVertexNormals()
const ribbon=createFabricEdgeRibbon(geometry,.0007)
assert.equal(ribbon.edgeCount,3)
assert.ok(nearly(ribbon.thicknessMeters,.0007))
assert.equal(ribbon.geometry.getAttribute('position').count,12)
assert.equal(ribbon.geometry.getIndex().count,18)
assert.equal(createFabricEdgeRibbon(geometry,0).geometry,null)
const closed=new THREE.BufferGeometry()
closed.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,1,0,0,0,1,0,0,0,1],3))
closed.setIndex([0,2,1,0,1,3,1,2,3,2,0,3]);closed.computeVertexNormals()
assert.equal(createFabricEdgeRibbon(closed,.001).edgeCount,0)
const capped=createFabricEdgeRibbon(geometry,1)
assert.equal(capped.thicknessMeters,.01)
const mesh=new THREE.Mesh(geometry,front)
const backMesh=new THREE.Mesh(geometry,back)
backMesh.raycast=()=>{}
mesh.add(backMesh)
assert.equal(backMesh.geometry,mesh.geometry)
const ray=new THREE.Raycaster(new THREE.Vector3(.2,.2,1),new THREE.Vector3(0,0,-1))
assert.equal(ray.intersectObject(mesh,true).length,1)
ray.set(new THREE.Vector3(.2,.2,-1),new THREE.Vector3(0,0,1))
assert.equal(ray.intersectObject(mesh,true).length,0)
geometry.dispose();closed.dispose();ribbon.geometry.dispose();capped.geometry.dispose()
front.userData.ownedTexture?.dispose();front.dispose();back.dispose();side.dispose()
console.log('PASS: front/back/side material independence and inheritance, boundary ribbon, closed topology, thickness cap, selection')
