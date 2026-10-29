import assert from 'node:assert/strict'
import {test} from 'node:test'
import {createMetadataValidator} from './validator-client.mjs'

function jsValid(field,value){
 const appearance=field.startsWith('appearance.')&&!field.endsWith('.reset')
 const reset=field==='appearance.back.reset'||field==='appearance.side.reset'
 const optional=field!=='itemNo'&&!appearance&&!reset
 if(reset)return value===true
 if(appearance){const key=field.split('.').at(-1);return key==='color' ? typeof value==='string'&&/^#[0-9a-fA-F]{6}$/.test(value): typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=(key==='reflectionIntensity'?3:1)}
 if(field==='pantoneSystem'&&!['','TCX','TPG','PMS'].includes(value))return false
 if(field==='pantoneCode'&&value!==''&&!(typeof value==='string'&&(/^[0-9]{2}-[0-9]{4} (TCX|TPG)$/.test(value)||/^PANTONE [A-Z0-9][A-Z0-9 ]{0,35} (C|U)$/.test(value))))return false
 return (typeof value==='string'&&value.length<=(optional?128:120)&&!/[\u0000-\u001f\u007f]/.test(value))||(optional&&value===null)
}

test('persistent Rust subprocess agrees with JS on manufacturing validation',async()=>{
 const validator=createMetadataValidator()
 const samples=[
  ['itemNo','ST-101'],['itemNo','line\nbreak'],['itemNo','x'.repeat(121)],
  ['construction','French terry'],['supplier',null],['supplier','\u0000'],
  ['pantoneSystem','TCX'],['pantoneSystem','RGB'],['pantoneCode','19-4052 TCX'],
  ['pantoneCode','19-4052 RGB'],['pantoneCode','PANTONE WARM GRAY 1 C'],
  ['pantoneCode','PANTONE Warm Gray 1 C'],['pantoneSource','Physical swatch'],
  ['appearance.color','#AA33ff'],['appearance.back.color','red'],
  ['appearance.opacity',0.5],['appearance.side.metalness',2],
  ['appearance.reflectionIntensity',2.5],['appearance.back.reset',true],
  ['appearance.side.reset',false],
 ]
 for(const [field,value] of samples){
  const target=field==='itemNo'?'panel':'fabric'
  const response=await validator.validate({target,field,value})
  assert.ok(response,`Rust binary unavailable for ${field}`)
  assert.equal(response.ok,jsValid(field,value),`${field} ${JSON.stringify(value)}`)
  assert.equal(validator.active,true)
 }
 validator.close()
 assert.equal(validator.active,false)
})

test('missing binary returns null to enable existing JS fallback',async()=>{
 const validator=createMetadataValidator({binary:'/missing-exo-metadata-validator'})
 assert.equal(await validator.validate({target:'panel',field:'itemNo',value:'X'}),null)
 validator.close()
})
