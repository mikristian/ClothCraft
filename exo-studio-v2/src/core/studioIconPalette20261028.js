import {CLO7_3D_A,CLO7_3D_B,CLO7_2D_A,CLO7_2D_B} from '../data/clo7ToolbarOrder.js'
export const ICON_COLOR_SWATCHES_20261028=Object.freeze([
 ['Auto','auto'],['White','#ffffff'],['Ivory','#f8f2e9'],['Black','#171a20'],
 ['Silver','#bcc5d2'],['Graphite','#555b66'],['Sky','#6ab9fa'],['Cobalt','#487af5'],
 ['Lavender','#b4a1fd'],['Pink','#f58bbd'],['Rose','#e76d96'],
 ['Coral','#ff967d'],['Gold','#e9b85a'],['Mint','#74d8ac'],['Teal','#45b6ad'],
])
export const normalizeIconColors20261028=value=>Object.fromEntries(Object.entries(value&&typeof value==='object'&&!Array.isArray(value)?value:{})
 .filter(([id,color])=>id.length<=100&&/^#[0-9a-f]{6}$/i.test(color||'')).slice(0,256))
export const nativeToolCatalog20261028=[
 ...[...CLO7_3D_A,...CLO7_3D_B].map(t=>({...t,key:'3d:'+t.id})),
 ...[...CLO7_2D_A,...CLO7_2D_B].map(t=>({...t,key:'2d:'+t.id})),
]
