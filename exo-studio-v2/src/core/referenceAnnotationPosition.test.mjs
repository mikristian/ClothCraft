import assert from 'node:assert/strict'
import {test} from 'node:test'
import {buildTraditionalTechPackHTML} from './digitalTechPack.js'
import {buildPortableTechPackHTML} from './techPackHtmlExport.js'

const project={id:'pin-qa',name:'Annotation QA'}
const dataUrl='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMBAABoqXUAAAAASUVORK5CYII='
const render=annotations=>{
  const state={source:{project},draft:{styleName:'Annotation QA',references:[{dataUrl,annotations}]}}
  const before=structuredClone(state)
  const traditional=buildTraditionalTechPackHTML(project,state)
  const portable=buildPortableTechPackHTML(project,state)
  assert.deepEqual(state,before,'rendering must not mutate the source draft')
  return {traditional,portable}
}
const count=(html,klass)=>(html.match(new RegExp(`class="${klass}"`,'g'))||[]).length

test('missing, malformed and off-image coordinates never become false factory annotation pins',()=>{
  const invalid=[{}, {x:null,y:.5}, {x:.5}, {x:'',y:.5}, {x:'   ',y:.5},
    {x:true,y:.5}, {x:-.001,y:.5}, {x:1.001,y:.5}, {x:Infinity,y:.5},
    {x:NaN,y:.5}, {x:'1e309',y:.5}].map((value,i)=>({...value,text:`note-${i}`}))
  const {traditional,portable}=render(invalid)
  assert.equal(count(traditional,'reference-pin'),0)
  assert.equal(count(portable,'callout'),0)
  for(const entry of invalid){
    assert.ok(traditional.includes(entry.text),'annotation text must remain reviewable')
    assert.ok(portable.includes(entry.text),'portable annotation text must remain reviewable')
  }
})

test('valid 0..1 annotation coordinates, including image edges and numeric strings, retain exact placement',()=>{
  const {traditional,portable}=render([{x:0,y:1,text:'bottom-left'},
    {x:1,y:0,text:'top-right'}, {x:'0.25',y:'0.75',text:'interior'}])
  assert.equal(count(traditional,'reference-pin'),3)
  assert.equal(count(portable,'callout'),3)
  for(const expected of ['left:0%;top:100%','left:100%;top:0%','left:25%;top:75%']){
    assert.ok(traditional.includes(expected),expected)
    assert.ok(portable.includes(expected),expected)
  }
})
