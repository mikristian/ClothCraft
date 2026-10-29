import test from 'node:test'
import assert from 'node:assert/strict'
import {
  TECHPACK_TEMPLATES,TECHPACK_THEMES,TECHPACK_LAYOUTS,TECHPACK_HEADERS,TECHPACK_BOX_TEMPLATES,TECHPACK_TABLE_TEMPLATES,
  applyTechPackTemplate,loadTechPackUserPresets,saveTechPackUserPreset,deleteTechPackUserPreset,
} from './techPackTemplatePresets.js'
import {renderTechPackWorkspacePrintHTML} from './techPackWorkspacePrint.js'

test('presets cover garment types, full packs, pages, headers, palettes and interactive view',()=>{
  assert(TECHPACK_TEMPLATES.filter(p=>p.category==='garments').length>=6)
  assert(TECHPACK_TEMPLATES.some(p=>p.pageId==='interactive3d'))
  assert(TECHPACK_THEMES.length>=6)
  assert(TECHPACK_LAYOUTS.some(p=>p.id==='square'))
  assert(TECHPACK_HEADERS.length>=5)
  for(const id of ['patterns','pattern-cutlist','grading','measurements','measurement-table','construction','construction-operations','fabrics'])
    assert(TECHPACK_TEMPLATES.some(p=>p.pageId===id),`Missing page template: ${id}`)
  assert(TECHPACK_BOX_TEMPLATES.length>=4)
  assert(TECHPACK_TABLE_TEMPLATES.length>=5)
})

test('header-only and single-page themes preserve unrelated layout styles and all source data',()=>{
  const before={layoutPreset:'square',headerPreset:'seville',templateTheme:'mono',
    cells:{fabrics:{cotton:{2:'100%'}}},pageBoxes:{fabrics:[{id:'note1',title:'Factory note'}]},
    pages:{patterns:{layoutPreset:'illustration',notes:'Keep original'},fabrics:{layoutPreset:'gallery',notes:'Keep swatch notes'}}}
  const header=applyTechPackTemplate(before,{kind:'header',name:'Editorial',header:'editorial'},'patterns')
  assert.equal(header.pages.patterns.headerPreset,'editorial')
  assert.equal(header.pages.patterns.layoutPreset,'illustration')
  assert.equal(header.pages.fabrics.headerPreset,undefined)
  assert.equal(header.templateTheme,'mono')
  assert.deepEqual(header.cells,before.cells)
  const swatch=applyTechPackTemplate(header,{kind:'theme',theme:'clay'},'fabrics')
  assert.equal(swatch.pages.fabrics.templateTheme,'clay')
  assert.equal(swatch.pages.patterns.templateTheme,undefined)
  assert.equal(swatch.pages.fabrics.layoutPreset,'gallery')
  assert.equal(swatch.templateTheme,'mono')
  assert.deepEqual(swatch.pageBoxes,before.pageBoxes)
})

test('applying page template keeps source tables and other pages unchanged',()=>{
  const before={cells:{measurements:{chest:{2:'44.5'}}},interactiveMarkers:[{id:'detail-1',title:'Stitch',position:[.5,.6,.3]}],
    pages:{flats:{notes:'Author note',headerPreset:'seville'},measurements:{notes:'POM note',layoutPreset:'balanced'}}}
  const after=applyTechPackTemplate(before,TECHPACK_TEMPLATES.find(p=>p.id==='flat-drawing'),'flats')
  assert.equal(after.pages.flats.notes,'Author note')
  assert.equal(after.pages.flats.layoutPreset,'illustration')
  assert.deepEqual(after.pages.measurements,before.pages.measurements)
  assert.deepEqual(after.cells,before.cells)
  assert.deepEqual(after.interactiveMarkers,before.interactiveMarkers)
  assert.equal(before.pages.flats.layoutPreset,undefined)
})

test('whole document template changes all existing page styles and safely defaults unknown values',()=>{
  const input={pages:{overview:{notes:'Keep'},fabrics:{notes:'Keep swatch notes'}},headerPreset:'seville'}
  const result=applyTechPackTemplate(input,{layout:'unknown',header:'dark',theme:'forest',colors:{accent:'red',line:'#123456',wash:'#fedcba'}})
  assert.equal(result.layoutPreset,'balanced')
  assert.equal(result.pages.overview.headerPreset,'dark')
  assert.equal(result.pages.fabrics.notes,'Keep swatch notes')
  assert.equal(result.templateColors.accent,TECHPACK_THEMES.find(t=>t.id==='forest').accent)
  assert.equal(result.templateColors.line,'#123456')
})

test('designer presets persist for reuse and can be deleted independently',()=>{
  const original=globalThis.localStorage
  const records=new Map()
  globalThis.localStorage={getItem:k=>records.get(k)||null,setItem:(k,v)=>records.set(k,v)}
  try{
    const saved=saveTechPackUserPreset({name:'Maker square',layout:'square',header:'editorial',theme:'violet'})
    assert.equal(saved.length,1)
    assert.equal(loadTechPackUserPresets()[0].name,'Maker square')
    assert.equal(loadTechPackUserPresets()[0].layout,'square')
    deleteTechPackUserPreset(saved[0].id)
    assert.deepEqual(loadTechPackUserPresets(),[])
  }finally{if(original===undefined)delete globalThis.localStorage;else globalThis.localStorage=original}
})

test('print keeps physical page settings and escapes authored 3D marker notes',()=>{
  const source={name:'Sample coat',revision:1,panels:[],seams:[],fabrics:[],pom:{}}
  const workspace={orientation:'landscape',layoutPreset:'square',templateTheme:'blueprint',
    interactiveMarkers:[{id:'d1',label:'D01',title:'Collar <factory>',detail:'Check <script>alert(1)</script> seam'}]}
  const html=renderTechPackWorkspacePrintHTML(source,{},workspace)
  assert.match(html,/style="page:LetterLandscape"/)
  assert.match(html,/INTERACTIVE 3D \/ PRINTED DETAIL REFERENCE/)
  assert.match(html,/Collar &lt;factory&gt;/)
  assert.match(html,/Check &lt;script&gt;alert\(1\)&lt;\/script&gt; seam/)
  assert.doesNotMatch(html,/<script>alert\(1\)<\/script>/)
})

test('inserted factory detail frames print on their selected sheet with escaped authored text',()=>{
  const source={name:'Sample tee',revision:1,panels:[],seams:[],fabrics:[],pom:{}}
  const workspace={pageBoxes:{patterns:[{id:'b1',title:'Collar <script>',note:'Use <double> needle',width:245,height:115,border:'dashed',lineColor:'#171717'}]},
    boardObjects:{patterns:{'box-b1':{x:11,y:5,scaleX:1.1,scaleY:1}}}}
  const html=renderTechPackWorkspacePrintHTML(source,{},workspace)
  assert.match(html,/data-inserted-box="true"/)
  assert.match(html,/Collar &lt;script&gt;/)
  assert.match(html,/Use &lt;double&gt; needle/)
  assert.match(html,/translate\(11px,5px\) scale\(1\.1,1\)/)
  assert.doesNotMatch(html,/<script>Collar/)
})
