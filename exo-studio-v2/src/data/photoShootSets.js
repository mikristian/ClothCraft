// Photographic lighting/backdrop configurations backed by the real viewport.
// These are editable studio setups, separate from the EXO01 imported 3D stage.
export const PHOTO_SHOOT_SETS = Object.freeze([
  Object.freeze({id:'shoot-softbox',name:'Softbox Product Studio',kind:'Photo shoot set',description:'Even softbox lighting for garment product images',environmentPreset:'softbox',background:'#d9d7d3',lightColor:'#ffffff',lightIntensity:1.15,lightPosition:[2.5,5.5,3.5]}),
  Object.freeze({id:'shoot-white',name:'White Cyclorama',kind:'Photo shoot set',description:'Neutral light and a continuous white photo backdrop',environmentPreset:'neutral',background:'#f1f1ee',lightColor:'#ffffff',lightIntensity:1.35,lightPosition:[1.5,5,3]}),
  Object.freeze({id:'shoot-editorial',name:'Dark Editorial',kind:'Photo shoot set',description:'Directional dramatic lighting for editorial silhouettes',environmentPreset:'dramatic',background:'#202125',lightColor:'#fff0d9',lightIntensity:0.9,lightPosition:[-3,5,2.5]}),
  Object.freeze({id:'shoot-grey',name:'Grey Lookbook',kind:'Photo shoot set',description:'Balanced studio lighting against a warm grey backdrop',environmentPreset:'studio',background:'#777672',lightColor:'#fffdfa',lightIntensity:1,lightPosition:[2,4.5,3]}),
])

export function getPhotoShootSet(id) {
  return PHOTO_SHOOT_SETS.find(set=>set.id===id)||null
}
