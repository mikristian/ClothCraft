import {getHardwarePreset} from '../data/hardwarePresets.js'

// A library style is editable without placing hardware on a garment. The
// record lives in the EXO project and is used when a draft button is placed.
export const HARDWARE_STYLE_FIELDS=Object.freeze({
 widthMm:{type:'number',min:1,max:150},heightMm:{type:'number',min:1,max:150},
 thicknessMm:{type:'number',min:.1,max:50},
 roughness:{type:'number',min:0,max:1},metalness:{type:'number',min:0,max:1},
 reflectionIntensity:{type:'number',min:0,max:2},clearcoat:{type:'number',min:0,max:1},
 color:{type:'color'},materialType:{type:'optionalText',maxLength:96},
})

export function initialHardwareStyle(preset){
 const dimensions=preset?.dimensionsMm||{}
 const width=dimensions.width??dimensions.diameter??dimensions.capDiameter??dimensions.headDiameter??dimensions.outerWidth??18
 return {
  widthMm:width,heightMm:dimensions.height??dimensions.diameter??dimensions.capDiameter??width,
  thicknessMm:dimensions.thickness??dimensions.frontThickness??dimensions.capHeight??2.5,
  roughness:preset?.pbr?.roughness??.5,metalness:preset?.pbr?.metalness??0,
  reflectionIntensity:1,clearcoat:preset?.pbr?.clearcoat??.12,
  color:preset?.pbr?.baseColor??'#888888',materialType:preset?.material??'Custom',
 }
}

export function resolveHardwareStyle(project,id){
 const preset=getHardwarePreset(id)
 if(!preset)return null
 return {...initialHardwareStyle(preset),...(project?.hardwareStyles?.[id]||{})}
}

export function validateHardwareStyleEdit(project,id,field,value){
 const schema=HARDWARE_STYLE_FIELDS[field]
 if(!getHardwarePreset(id))return {ok:false,error:'Hardware library item no longer exists'}
 if(!schema)return {ok:false,error:`Unknown editable hardware property: ${field}`}
 let parsed=value
 if(schema.type==='number'){
  if(value===null||value===undefined||typeof value==='boolean'||(typeof value==='string'&&!value.trim())||!Number.isFinite(Number(value)))return {ok:false,error:`${field} must be a finite number`}
  parsed=Number(value)
  if(parsed<schema.min||parsed>schema.max)return {ok:false,error:`${field} must be ${schema.min}–${schema.max}`}
 }else if(schema.type==='color'){
  if(typeof value!=='string'||!/^#[\da-fA-F]{6}$/.test(value))return {ok:false,error:'Use a six-digit hex color'}
 }else if(schema.type==='optionalText'){
  if(typeof value!=='string'||value.length>schema.maxLength)return {ok:false,error:'Material name is too long'}
  parsed=value.trim()
 }
 return {ok:true,field,value:parsed}
}
