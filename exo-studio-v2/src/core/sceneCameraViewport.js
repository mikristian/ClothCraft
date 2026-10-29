import * as THREE from 'three'
import {rustFiniteClamp} from './rustCoreMathKernel.js'

const clamp=(n,lo,hi,fallback)=>Number.isFinite(Number(n))
  ?rustFiniteClamp(Number(n),lo,hi):fallback

/**
 * Apply persisted CLO-style Camera properties to the real Three.js camera.
 * Positions are metres in the scene; UI distances and clipping are millimetres.
 * No simulated garment vertices, avatar measurements, or patterns are changed.
 */
export function applySceneCameraViewport(camera,controls,settings,canvas) {
  if(!camera||!controls||!settings)return false
  const distance=clamp(settings.distanceMm,150,100000,4000)/1000
  const heading=THREE.MathUtils.degToRad(clamp(settings.horizontalAngle,-180,180,0))
  const elevation=THREE.MathUtils.degToRad(clamp(settings.verticalAngle,-89,89,12))
  const fov=clamp(settings.fieldOfView,5,150,34)
  const near=clamp(settings.nearClipMm,.1,100000,5)/1000
  const far=Math.max(near+.02,clamp(settings.farClipMm,10,1000000,150000)/1000)
  camera.near=near
  camera.far=far
  camera.fov=fov
  camera.filmGauge=clamp(settings.sensorWidthMm,8,70,36)
  if(settings.physicalCamera)camera.setFocalLength(clamp(settings.focalLengthMm,8,300,50))
  // Orthographic mode has a real parallel projection matrix. Keeping the
  // PerspectiveCamera wrapper allows existing OrbitControls, transform gizmos
  // and raycasting code to continue referring to the same camera instance.
  if(!camera.userData.exoSceneProjectionUpdate){
    const original=camera.updateProjectionMatrix.bind(camera)
    camera.userData.exoSceneProjectionUpdate=original
    camera.updateProjectionMatrix=()=>{
      original()
      if(camera.userData.exoSceneViewType==='orthographic'){
        const halfHeight=Math.max(.025,camera.userData.exoSceneOrthoHalfHeight||1)
        const aspect=Math.max(.1,camera.aspect||1)
        camera.projectionMatrix.makeOrthographic(-halfHeight*aspect,halfHeight*aspect,halfHeight,-halfHeight,camera.near,camera.far)
        camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert()
      }
    }
  }
  camera.userData.exoSceneViewType=settings.viewType==='orthographic'?'orthographic':'spherical'
  camera.userData.exoSceneOrthoHalfHeight=distance*Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)
  camera.updateProjectionMatrix()
  const target=controls.target
  const horizontal=Math.cos(elevation)*distance
  camera.position.copy(target).add(new THREE.Vector3(
    Math.sin(heading)*horizontal,
    Math.sin(elevation)*distance,
    Math.cos(heading)*horizontal,
  ))
  controls.minDistance=Math.min(controls.minDistance,distance)
  controls.maxDistance=Math.max(controls.maxDistance,distance)
  camera.lookAt(target)
  controls.update()
  if(canvas){
    canvas.dataset.cameraFieldOfView=String(Number(camera.fov.toFixed(3)))
    canvas.dataset.cameraViewType=camera.userData.exoSceneViewType
    canvas.dataset.cameraDistanceMm=String(Math.round(distance*1000))
    canvas.dataset.cameraHorizontalAngle=String(clamp(settings.horizontalAngle,-180,180,0))
    canvas.dataset.cameraVerticalAngle=String(clamp(settings.verticalAngle,-89,89,12))
    canvas.dataset.cameraNearClipMm=String(Number((near*1000).toFixed(2)))
    canvas.dataset.cameraFarClipMm=String(Number((far*1000).toFixed(2)))
    canvas.dataset.cameraPhysical=String(Boolean(settings.physicalCamera))
  }
  return true
}
