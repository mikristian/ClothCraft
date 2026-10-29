import assert from 'node:assert/strict'
import * as THREE from 'three'
import { createZipperHardware3D } from '../../src/components/ZipperHardware3D.js'

const near = (actual, expected, tolerance = 0.13) => assert.ok(
  Math.abs(actual - expected) <= tolerance,
  `Expected ${expected.toFixed(3)} mm ±${tolerance} mm; received ${actual.toFixed(3)} mm`,
)
const boundsMm = (mesh) => {
  mesh.geometry.computeBoundingBox()
  const size = new THREE.Vector3()
  mesh.geometry.boundingBox.getSize(size)
  return size.multiplyScalar(1000)
}
const allNamed = (root, name) => {
  const found = []
  root.traverse(node => { if (node.name === name) found.push(node) })
  return found
}
const first = (root, name) => {
  const result = allNamed(root, name)[0]
  assert.ok(result, `Missing ${name}`)
  return result
}
const fixture = () => {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    0,0,0, 0,.03,0, 0,.06,0, 0,.09,0,
  ], 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute([
    0,0,1, 0,0,1, 0,0,1, 0,0,1,
  ], 3))
  return {geometry,mesh:{position:new THREE.Vector3(),visible:true}}
}
const base = {
  id:'unit-zipper',type:'metal',chainWidthMm:5,tapeWidthMm:12,tapeThicknessMm:.65,
  toothPitchMm:3,sliderWidthMm:9,sliderLengthMm:15,sliderThicknessMm:2.4,
  pullerWidthMm:7,pullerLengthMm:22,pullerThicknessMm:1.8,
  toothThicknessMm:1.8,stopperThicknessMm:2.6,
  reflectionIntensity:1.4,clearcoat:.55,roughness:.22,metalness:.84,tapeRoughness:.73,
  teethRoughness:.31,sliderRoughness:.25,pullerRoughness:.37,stopperRoughness:.43,
  tapeMaterialType:'satin',teethMaterialType:'metal',sliderMaterialType:'metal',
  sliderFraction:.65,twoWay:true,bottomSliderFraction:.12,
}
let assertions=0
const check=(name,fn)=>{ fn(); assertions++; console.log(`PASS ${name}`) }
const record=fixture()
const render=(changes={})=>createZipperHardware3D({...base,...changes},[{record,indices:[0,1,2,3]}])
const assemblies=[]
const created=[]
try {
  const a=render()
  assert.ok(a?.object)
  created.push(a)
  const housing=first(a.object,'zipper-slider-body')
  const puller=first(a.object,'zipper-puller-tab')
  const tooth=first(a.object,'zipper-teeth-0')
  const stopper=first(a.object,'zipper-stop-0-0')
  const tape=first(a.object,'zipper-tape-0')
  check('slider housing width, length and thickness from actual mesh bounding box',()=>{
    const size=boundsMm(housing)
    near(size.x,base.sliderWidthMm,.6)
    near(size.y,base.sliderLengthMm,.6)
    near(size.z,base.sliderThicknessMm,.05)
  })
  check('puller width, length and thickness from actual mesh bounding box',()=>{
    const size=boundsMm(puller)
    near(size.x,base.pullerWidthMm,.6)
    near(size.y,base.pullerLengthMm,.6)
    near(size.z,base.pullerThicknessMm,.05)
    assert.ok(puller.geometry.parameters.shapes.holes.length>0,'pull tab retains an actual cutout')
  })
  check('tooth thickness and stopper thickness from actual geometry',()=>{
    near(boundsMm(tooth).z,base.toothThicknessMm,.06)
    near(boundsMm(stopper).z,base.stopperThicknessMm,.001)
  })
  check('two-way assemblies and valid instanced tooth transforms',()=>{
    assert.equal(a.sliderCount,2)
    assert.equal(allNamed(a.object,'zipper-slider-body').length,2)
    assert.equal(a.stopCount,2)
    assert.ok(a.toothInstanceCount>0)
    const matrix=new THREE.Matrix4()
    tooth.getMatrixAt(0,matrix)
    assert.ok(matrix.elements.every(Number.isFinite))
  })
  check('component PBR values are independently applied',()=>{
    for(const [mesh,rough] of [[tooth,.31],[housing,.25],[puller,.37],[stopper,.43]]){
      assert.ok(mesh.material.isMeshPhysicalMaterial,`${mesh.name} physical material`)
      near(mesh.material.roughness*1000,rough*1000,.001)
      near(mesh.material.metalness*1000,840,.001)
      near(mesh.material.clearcoat*1000,550,.001)
      near(mesh.material.envMapIntensity*1000,1400,.001)
    }
    near(tape.material.roughness*1000,730,.001)
    near(tape.material.envMapIntensity*1000,1400,.001)
    assert.ok(tape.material.normalMap)
  })
  const b=render({sliderWidthMm:14,sliderLengthMm:23,sliderThicknessMm:4.2,
    pullerWidthMm:12,pullerLengthMm:36,pullerThicknessMm:3.3,
    toothThicknessMm:3.2,stopperThicknessMm:5.3,
    reflectionIntensity:.25,clearcoat:.08,metalness:.22,roughness:.81,
    sliderRoughness:.69,pullerRoughness:.64,teethRoughness:.58,stopperRoughness:.72,
    tapeRoughness:.42,tapeMaterialType:'cotton',teethMaterialType:'nylon',sliderMaterialType:'plastic',twoWay:false})
  created.push(b)
  check('changing all eight dimensions regenerates mesh geometry',()=>{
    const altered=[[first(b.object,'zipper-slider-body'),14,23,4.2],
      [first(b.object,'zipper-puller-tab'),12,36,3.3]]
    for(const [mesh,w,l,t] of altered){const d=boundsMm(mesh);near(d.x,w,.8);near(d.y,l,.8);near(d.z,t,.06)}
    near(boundsMm(first(b.object,'zipper-teeth-0')).z,3.2,.06)
    near(boundsMm(first(b.object,'zipper-stop-0-0')).z,5.3,.001)
    assert.equal(b.sliderCount,1)
  })
  check('material types and PBR changes modify rendered component materials',()=>{
    const t=first(b.object,'zipper-teeth-0').material
    const s=first(b.object,'zipper-slider-body').material
    const p=first(b.object,'zipper-puller-tab').material
    const st=first(b.object,'zipper-stop-0-0').material
    for (const material of [t,s,p,st]){
      near(material.envMapIntensity*1000,250,.001)
      near(material.clearcoat*1000,80,.001)
    }
    near(t.metalness*1000,20,.001)
    for(const material of [s,p,st])near(material.metalness*1000,30,.001)
    near(t.roughness*1000,580,.001)
    near(s.roughness*1000,690,.001)
    near(p.roughness*1000,640,.001)
    near(st.roughness*1000,720,.001)
    near(first(b.object,'zipper-tape-0').material.roughness*1000,420,.001)
  })
  check('animation update and scene teardown complete without exceptions',()=>{
    for(const entry of created){
      assert.doesNotThrow(()=>entry.update())
      const geometries=new Set(),materials=new Set()
      entry.object.traverse(node=>{
        if(node.geometry)geometries.add(node.geometry)
        if(node.material)for(const m of (Array.isArray(node.material)?node.material:[node.material]))materials.add(m)
      })
      for(const geometry of geometries)assert.doesNotThrow(()=>geometry.dispose())
      for(const material of materials)assert.doesNotThrow(()=>material.dispose())
      assert.doesNotThrow(()=>entry.object.clear())
    }
    assert.doesNotThrow(()=>record.geometry.dispose())
  })
  console.log(`PASS ${assertions} zipper geometry/material regression groups`)
}catch(error){
  console.error(`FAIL after ${assertions} groups: ${error.stack||error}`)
  process.exitCode=1
}
