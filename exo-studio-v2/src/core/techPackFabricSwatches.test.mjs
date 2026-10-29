import test from 'node:test'
import assert from 'node:assert/strict'
import {getTechPackFabricSwatch,removeTechPackFabricSwatchAsset,setTechPackFabricSwatch} from './techPackFabricSwatches.js'
import {renderTechPackWorkspacePrintHTML} from './techPackWorkspacePrint.js'

const swatchPng='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMBAABoqXUAAAAASUVORK5CYII='

test('linking one fabric image preserves other draft state and does not mutate the original',()=>{
  const original={orientation:'landscape',cells:{fabrics:{cotton:{3:'220'}}},fabricSwatches:{rib:'rib-photo'}}
  const chosen=setTechPackFabricSwatch(original,'cotton','cotton-photo')
  assert.equal(chosen.orientation,'landscape')
  assert.equal(chosen.cells.fabrics.cotton[3],'220')
  assert.deepEqual(chosen.fabricSwatches,{rib:'rib-photo',cotton:'cotton-photo'})
  assert.equal(original.fabricSwatches.cotton,undefined)
  assert.equal(getTechPackFabricSwatch(chosen,'cotton',[{id:'cotton-photo',dataUrl:swatchPng}])?.id,'cotton-photo')
  assert.equal(getTechPackFabricSwatch(chosen,'rib',[]),null)
  assert.equal(setTechPackFabricSwatch(chosen,'cotton','').fabricSwatches.cotton,undefined)
  assert.deepEqual(removeTechPackFabricSwatchAsset(chosen,'cotton-photo').fabricSwatches,{rib:'rib-photo'})
})

test('factory print includes the correct linked fabric photo with escaped labels and never remote or script images',()=>{
  const source={name:'T-shirt',revision:1,kind:'native',ready:true,panels:[],seams:[],fabrics:[
    {id:'cotton',name:'Cotton jersey',color:'#111111',gsm:220,composition:'100% cotton'},
    {id:'rib',name:'Rib neck',color:'#222222',gsm:280,composition:'95% cotton / 5% elastane'}
  ],pom:{},grading:{}}
  const workspace={fabricSwatches:{cotton:'cotton-photo',rib:'rib-photo'}}
  const photos=[{id:'cotton-photo',dataUrl:swatchPng,caption:'Jersey <front>'},{id:'rib-photo',dataUrl:'javascript:alert(1)',caption:'Unsafe'}]
  const html=renderTechPackWorkspacePrintHTML(source,{},workspace,photos)
  assert.match(html,/Cotton jersey/)
  assert.match(html,/IMAGE REFERENCE: Jersey &lt;front&gt;/)
  assert.match(html,/data:image\/png;base64,/)
  assert.doesNotMatch(html,/javascript:alert/)
  assert.match(html,/Photographic swatch not supplied/)
  assert.doesNotMatch(html,/<front>/)
})
