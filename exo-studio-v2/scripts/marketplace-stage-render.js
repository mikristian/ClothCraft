import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const width=1200,height=750;
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
renderer.setPixelRatio(1);renderer.setSize(width,height,false);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.35;
renderer.shadowMap.enabled=false;
document.querySelector('#stage').append(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#242628');
scene.add(new THREE.HemisphereLight('#fffef6','#44454a',2.5));
for(const [x,y,z,color,intensity] of [[-1,3,4,'#ffffff',3],[5,5,-1,'#dfd5cc',2.5]]){
 const light=new THREE.DirectionalLight(color,intensity);light.position.set(x,y,z);scene.add(light);
}
const camera=new THREE.PerspectiveCamera(48,width/height,0.005,1e5);
let subject=null;
window.renderEXOStage=async id=>{
 if(subject){scene.remove(subject);subject=null;}
 const gltf=await new GLTFLoader().loadAsync(`/stage-scenes/${id}.glb`);
 subject=gltf.scene;scene.add(subject);
 const bounds=new THREE.Box3().setFromObject(subject);
 const center=bounds.getCenter(new THREE.Vector3());
 const size=bounds.getSize(new THREE.Vector3());
 const radius=Math.max(.1,size.length()*.5);
 const distance=radius*.67/Math.tan(THREE.MathUtils.degToRad(48/2));
 const targets=[new THREE.Vector3(center.x+distance*.10,center.y+distance*.19,center.z+distance*.95),new THREE.Vector3(center.x-distance*.1,center.y+distance*.19,center.z-distance*.95)];
 camera.position.copy(targets[0]);camera.near=Math.max(.002,distance/500);camera.far=distance*12;camera.lookAt(center);camera.updateProjectionMatrix();
 renderer.render(scene,camera);
 window.__stageFrame={id,center:[center.x,center.y,center.z],size:[size.x,size.y,size.z],distance};
 return window.__stageFrame;
};
