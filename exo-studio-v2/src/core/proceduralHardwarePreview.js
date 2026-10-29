import * as THREE from 'three'
import {createHardwareButton3D} from '../components/HardwareButton3D.js'
import {createButtonholeHardware3D} from '../components/ButtonholeHardware3D.js'
import {createZipperHardware3D} from '../components/ZipperHardware3D.js'

/** Same metre-scale geometry used on garments, not a texture billboard. */
export function createProceduralHardwarePreview(preset) {
  const d=preset.dimensionsMm||{}
  if(preset.kind==='button')return {object:createHardwareButton3D({id:preset.id,threadColor:'#b6aca0',threadType:preset.threadType||'cross'},preset)}
  if(preset.kind==='buttonhole')return {object:createButtonholeHardware3D({},preset)}
  if(preset.kind==='zipper'){
    const length=(d.length||180)/1000, count=96
    const positions=[], normals=[]
    for(let i=0;i<count;i++){positions.push(0,(i/(count-1)-.5)*length,0);normals.push(0,0,1)}
    const geometry=new THREE.BufferGeometry()
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
    geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3))
    const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial())
    const zipper={id:preset.id,type:preset.zipperType||(/coil|invisible/.test(preset.id)?'coil':/molded/.test(preset.id)?'molded':'metal'),
      chainWidthMm:d.nominalChainWidth||5,tapeWidthMm:d.tapeWidthEachSide||12,sliderLengthMm:d.sliderLength,pullerLengthMm:d.pullLength,
      toothPitchMm:d.toothPitch||2,tapeColor:preset.pbr?.baseColor||'#333940',
      twoWay:!!preset.twoWay||/two-way/.test(preset.id),sliderFraction:.68,fastened:true,openFrom:'end'}
    const record=createZipperHardware3D(zipper,[0,1].map(()=>({record:{geometry,mesh},indices:Array.from({length:count},(_,i)=>i)})))
    if(!record)throw new Error('Zipper preview geometry unavailable')
    return {object:record.object,setClosure(value){zipper.sliderFraction=value;record.update()},setRoll(rolled){
      const p=geometry.attributes.position,n=geometry.attributes.normal
      for(let i=0;i<count;i++){
        const t=i/(count-1),angle=t*length/.016,radius=.015+t*.002
        p.setXYZ(i,0,rolled?Math.cos(angle)*radius:(t-.5)*length,rolled?Math.sin(angle)*radius:0)
        n.setXYZ(i,0,rolled?Math.cos(angle):0,rolled?Math.sin(angle):1)
      }
      p.needsUpdate=true;n.needsUpdate=true;record.update()
    },dispose(){geometry.dispose();mesh.material.dispose()}}
  }
  if(['snap','rivet'].includes(preset.kind)){
    const group=new THREE.Group(), radius=(d.capDiameter||d.headDiameter||12)/2000
    const material=new THREE.MeshPhysicalMaterial({color:preset.pbr?.baseColor||'#aeb4be',roughness:preset.pbr?.roughness??.3,metalness:preset.pbr?.metalness??.8})
    const add=(geometry,name,z=0)=>{const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.position.z=z;group.add(mesh)}
    const profile=[new THREE.Vector2(0,-.001),new THREE.Vector2(radius*.8,-.001),new THREE.Vector2(radius,-.0003),new THREE.Vector2(radius,.0005),new THREE.Vector2(radius*.85,.0013),new THREE.Vector2(0,.0016)]
    const cap=new THREE.LatheGeometry(profile,48);cap.rotateX(Math.PI/2);add(cap,'rounded-fastener-cap')
    const shaft=new THREE.CylinderGeometry(radius*.18,radius*.18,.004,20);shaft.rotateX(Math.PI/2);add(shaft,'attachment-post',-.003)
    if(preset.kind==='snap'){
      const socket=new THREE.TorusGeometry(radius*.62,radius*.16,12,48);add(socket,'separate-snap-socket',-.008)
    }
    return {object:group}
  }
  throw new Error(`No procedural mesh builder for ${preset.kind}`)
}
