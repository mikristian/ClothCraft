import test from 'node:test'
import assert from 'node:assert/strict'
import {createDefaultProject} from '../data/defaultProject.js'
import {techPackSource,TECHPACK_PAGES} from './techPackWorkspaceModel.js'
import {renderTechPackWorkspacePrintHTML} from './techPackWorkspacePrint.js'

const source=techPackSource(createDefaultProject(),null,false)
const customId='custom-blank-sheet'
const pages={customPages:[{id:customId,name:'My Layout'}],pageOrder:['overview',customId,'fabrics'],paperSize:'A4',orientation:'landscape'}
const customSheet=html=>html.match(/<section class="sheet custom-artboard"[^>]*>[\s\S]*?<\/main><\/section>/)?.[0]||''

test('new custom sheets print without inherited factory chrome or default content',()=>{
  const html=renderTechPackWorkspacePrintHTML(source,{styleName:'Sample'},pages)
  const sheet=customSheet(html)
  assert.match(sheet,/style="page:A4Landscape"/)
  assert.match(sheet,/<main><\/main>/)
  assert.doesNotMatch(sheet,/seville|folio|footer|PAGE NOTES|No additional|Factory note|table|page-number/i)
  assert.ok(html.indexOf('class="sheet seville')<html.indexOf('class="sheet custom-artboard"'))
  assert.equal((html.match(/class="sheet seville /g)||[]).length,TECHPACK_PAGES.length)
  assert.match(html,/PAGE NOTES &amp; INSTRUCTIONS/)
})

test('custom print retains authored boxes, tables, linked assets and transforms',()=>{
  const workspace={...pages,boardObjects:{[customId]:{'box-b':{x:22,y:-10,scaleX:1.2,scaleY:1},'table-t':{x:12,y:35},'asset-a':{x:90,y:5}}},
    pageBoxes:{[customId]:[{id:'b',title:'Placement',width:210,height:100,note:'Stitch detail'}]},
    tables:{[customId]:[{id:'t',title:'Wash',headers:['Process'],rows:[{cells:['Enzyme']}]}]},
    pageAssets:{[customId]:['a']}}
  const html=renderTechPackWorkspacePrintHTML(source,{},workspace,[{id:'a',name:'Logo artwork',dataUrl:'data:image/png;base64,AAAA'}])
  const sheet=customSheet(html)
  for(const snippet of ['Placement','Stitch detail','Process','Enzyme','Logo artwork','translate(22px,-10px) scale(1.2,1)','translate(12px,35px)','translate(90px,5px)'])assert.ok(sheet.includes(snippet),snippet)
  assert.doesNotMatch(sheet,/seville-block|seville-footer|PAGE NOTES|seville-page-number/)
})

test('custom box table slot prints authored cells escaped and uses normalized box placement',()=>{
  const workspace={...pages,pageBoxes:{[customId]:[{id:'detail',title:'Size details',width:320,height:180,
    slot:{category:'tables',title:'Spec',headers:['Size <XS>','Chest & body'],rows:[{id:'one',cells:['<script>alert(1)</script>','20" & fit']}]}}]},
    boardObjects:{[customId]:{'box-detail':{x:9999,y:-9999,scaleX:99,scaleY:-20}}}}
  const sheet=customSheet(renderTechPackWorkspacePrintHTML(source,{},workspace))
  assert.match(sheet,/custom-artboard-slot-table/)
  assert.match(sheet,/<th>Size &lt;XS&gt;<\/th>/)
  assert.match(sheet,/<th>Chest &amp; body<\/th>/)
  assert.match(sheet,/<td>&lt;script&gt;alert\(1\)&lt;\/script&gt;<\/td>/)
  assert.match(sheet,/<td>20&quot; &amp; fit<\/td>/)
  assert.match(sheet,/translate\(400px,-400px\) scale\(3,0\.25\)/)
  assert.doesNotMatch(sheet,/<script>|PAGE NOTES|seville-footer/)
})

test('independent garment render placements survive the factory print projection',()=>{
  const renders={front:'data:image/png;base64,AAAA',back:'data:image/png;base64,BBBB',side:'data:image/png;base64,CCCC'}
  const workspace={boardObjects:{overview:{'render-front':{x:72,y:-14,scaleX:1.25,scaleY:.8},'render-back':{x:-31,y:8,scaleX:.9,scaleY:1.1}}}}
  const html=renderTechPackWorkspacePrintHTML(source,{},workspace,[],{},renders)
  assert.match(html,/data-render-view="front" style="transform:translate\(72px,-14px\) scale\(1\.25,0\.8\)/)
  assert.match(html,/data-render-view="back" style="transform:translate\(-31px,8px\) scale\(0\.9,1\.1\)/)
  assert.match(html,/data-render-view="side" style="transform:translate\(0px,0px\) scale\(1,1\)/)
  assert.match(html,/src="data:image\/png;base64,AAAA" alt="front garment render"/)
})

test('render replacement is printed instead of its source render while missing views remain explicit',()=>{
  const replacement='data:image/png;base64,DDDD'
  const workspace={boardObjects:{overview:{'render-front':{assetId:'designer-view',x:19,y:7}}}}
  const html=renderTechPackWorkspacePrintHTML(source,{},workspace,[{id:'designer-view',name:'Designer front',dataUrl:replacement}],{},
    {front:'data:image/png;base64,AAAA'})
  assert.match(html,/data-render-view="front" style="transform:translate\(19px,7px\)/)
  assert.match(html,/src="data:image\/png;base64,DDDD" alt="front garment render"/)
  assert.doesNotMatch(html,/src="data:image\/png;base64,AAAA" alt="front garment render"/)
  assert.match(html,/data-render-view="back"[^>]*><div class="missing">Render pending<\/div>/)
})
