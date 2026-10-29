import test from 'node:test'
import assert from 'node:assert/strict'
import {createDefaultProject} from '../data/defaultProject.js'
import {createAccuMarkNativeRuleSet} from './accumarkNativePointRuleSet20261023.js'
import {techPackSource,techPackPageTable,techPackCsv,TECHPACK_PAGES} from './techPackWorkspaceModel.js'
import {renderTechPackWorkspacePrintHTML} from './techPackWorkspacePrint.js'
import {nativeTechPackDocument,editNativeTechPackDocument} from './techPackWorkspaceDocument.js'
import {applyTechPackPageLayout,techPackPageLayout,TECHPACK_PAPER_SIZES} from './techPackPageLayout.js'

test('legacy garment creates separate editable spreadsheet sections with graded POM and original seam IDs',()=>{
  const project=createDefaultProject()
  const source=techPackSource(project,null,false)
  assert.equal(source.kind,'project')
  assert.equal(source.panels.length,project.pieces.length)
  assert.equal(source.seams.length,project.seams.length)
  const patterns=techPackPageTable('patterns',source)
  const seams=techPackPageTable('construction',source)
  const measurements=techPackPageTable('measurements',source,{pom:source.pom})
  assert.equal(patterns.rows.length,project.pieces.length)
  assert.equal(seams.rows.length,project.seams.length)
  assert.deepEqual(Object.keys(source.pom),project.grading.sizes)
  assert(measurements.rows.some(row=>row.cells[0]==='Body length'))
  assert.deepEqual(seams.rows.map(r=>r.id),project.seams.map(s=>s.id))
  assert(TECHPACK_PAGES.length>=10)
})

test('native V2 source uses current Rust panel names, mm bounds, seam edges and its own fabrics',()=>{
  const snapshot={revision:32,template:{name:'Live Jeans',panels:[{id:'front-left',name:'Front L',fabric:'denim',polygon:{points:[[0,0],[.2,0],[.2,.4],[0,.4]],edges:['a','b','c','d']}}],
    fabrics:[{id:'denim',name:'Denim',properties:{gsm:420}}],
    seams:[{id:'inseam-1',type:'basic',a:{panel:'front-left',edge:'b'},b:{panel:'back-left',edge:'d'},reverseB:true}]}}
  const source=techPackSource(createDefaultProject(),snapshot,true)
  assert.equal(source.kind,'native')
  assert.equal(source.name,'Live Jeans')
  assert.equal(source.panels.length,1)
  assert.equal(source.panels[0].width,'200.0')
  assert.equal(source.panels[0].height,'400.0')
  assert.equal(source.seams[0].id,'inseam-1')
  assert.equal(source.fabrics[0].name,'Denim')
  assert.deepEqual(source.pom,{})
})

test('native user-defined grading POM displays measured and target rows without manufacturing approval',()=>{
  const snapshot={revision:4,template:{panels:[{id:'front',polygon:{points:[[0,0],[.2,0],[.2,.3],[0,.3]],edges:['a','b','c','d']}}],fabrics:[],seams:[]}}
  const created=createAccuMarkNativeRuleSet(snapshot)
  assert.equal(created.ok,true,created.reason)
  snapshot.nativePOMRuleSet=created.ruleSet
  snapshot.nativePOMDefinitions=[{id:'POM-1',label:'Front width',panelId:'front',kind:'anchor-distance',fromPoint:0,toPoint:1,toleranceMm:2,
    targetsMm:{XS:200,S:200,M:200,L:200,XL:200,XXL:200}}]
  const source=techPackSource(null,snapshot,true)
  const table=techPackPageTable('measurements',source,{pom:source.pom})
  assert.equal(source.pom.M[0].cm,20)
  assert.equal(source.pomTargets.M[0].cm,20)
  assert.equal(table.rows.length,2)
  assert.match(table.rows[1].cells[0],/TARGET/)
})

test('CSV encodes quotes and prevents spreadsheet formula interpretation',()=>{
  const table={headers:['Label','Value'],rows:[{id:'a',cells:['=HYPERLINK("https://example.test")','-2']},{id:'b',cells:['+cmd','@user']} ]}
  const csv=techPackCsv(table)
  assert.match(csv,/'=HYPERLINK/)
  assert.match(csv,/"'-?\+cmd"|"'\+cmd"/)
  assert.match(csv,/"-2"/)
  assert.match(csv,/"'@user"/)
})

test('all-page print document includes every sheet, editable headers, orientations and escaped copy',()=>{
  const source=techPackSource(createDefaultProject(),null,false)
  const html=renderTechPackWorkspacePrintHTML(source,{brand:'<script>alert(1)</script>'},{pages:{
    patterns:{title:'Cut Plan',orientation:'landscape',notes:'<img onerror=evil()>'},
  }})
  assert.equal((html.match(/class="sheet /g)||[]).length,TECHPACK_PAGES.length)
  assert.match(html,/Cut Plan/)
  assert.match(html,/style="page:LetterLandscape"/)
  assert.match(html,/&lt;script&gt;/)
  assert.match(html,/&lt;img onerror=evil\(\)&gt;/)
  assert.doesNotMatch(html,/<script>alert\(1\)<\/script>/)
  assert.match(html,/BODY LENGTH|Body length/)
})

test('EXO native techpack draft stays separate from the website editor data',()=>{
  const source={name:'Current Rust Jeans',revision:8}
  const initial=nativeTechPackDocument(source,{draft:{brand:'Website Brand',sku:'OLD-WEB'}})
  assert.equal(initial.kind,'exo-native-techpack-v2')
  assert.equal(initial.draft.styleName,'Current Rust Jeans')
  assert.equal(initial.draft.brand,'')
  const edited=editNativeTechPackDocument(initial,{brand:'EXO',workspace:{pages:{patterns:{orientation:'landscape'}}}})
  const restored=nativeTechPackDocument(source,structuredClone(edited))
  assert.equal(restored.draft.brand,'EXO')
  assert.equal(restored.draft.workspace.pages.patterns.orientation,'landscape')
})

test('printable all-page pack includes source drawings and stored pen/arrow annotations',()=>{
  const source=techPackSource(createDefaultProject(),null,false)
  const svg='<svg viewBox="0 0 100 100"><path d="M5 5 L95 95" fill="none" stroke="#333"/><text>Seam annotation</text></svg>'
  const result=renderTechPackWorkspacePrintHTML(source,{styleName:'EXO Crewneck'}, {},[],{construction:svg})
  assert.match(result,/<section class="drafting">/)
  assert.match(result,/Seam annotation/)
  assert.equal((result.match(/class="sheet /g)||[]).length,TECHPACK_PAGES.length)
})

test('custom techpack tables print on their chosen sheet with escaped headers and cell values',()=>{
  const source=techPackSource(createDefaultProject(),null,false)
  const result=renderTechPackWorkspacePrintHTML(source,{}, {tables:{flats:[{id:'custom',title:'CUSTOM & PLACEMENTS',
    headers:['Position','Artwork'],rows:[{id:'row',cells:['Left chest','Logo <script>']}]}]}})
  assert.match(result,/CUSTOM &amp; PLACEMENTS/)
  assert.match(result,/Left chest/)
  assert.match(result,/Logo &lt;script&gt;/)
  assert.doesNotMatch(result,/Logo <script>/)
  assert.equal((result.match(/class="sheet /g)||[]).length,TECHPACK_PAGES.length)
})

test('Letter 8.5 × 11 is default and global orientation overrides all historical sheet settings',()=>{
  const source=techPackSource(createDefaultProject(),null,false)
  assert.equal(TECHPACK_PAPER_SIZES.Letter.width,8.5)
  assert.equal(TECHPACK_PAPER_SIZES.Letter.height,11)
  assert.equal(techPackPageLayout({},'overview').pageStyle,'LetterPortrait')
  const before={pages:{patterns:{orientation:'portrait',paperSize:'A4',notes:'Preserved'},materials:{orientation:'landscape',title:'Custom BOM'}}}
  const next=applyTechPackPageLayout(before,{orientation:'landscape',paperSize:'Letter'})
  assert.equal(next.pages.patterns.notes,'Preserved')
  assert.equal(next.pages.materials.title,'Custom BOM')
  for(const page of TECHPACK_PAGES)assert.equal(techPackPageLayout(next,page.id).pageStyle,'LetterLandscape')
  const html=renderTechPackWorkspacePrintHTML(source,{},next)
  assert.equal((html.match(/style="page:LetterLandscape"/g)||[]).length,TECHPACK_PAGES.length)
  assert.match(html,/@page LetterLandscape\{size:Letter landscape/)
  const portrait=applyTechPackPageLayout(next,{orientation:'portrait'})
  assert.equal((renderTechPackWorkspacePrintHTML(source,{},portrait).match(/style="page:LetterPortrait"/g)||[]).length,TECHPACK_PAGES.length)
})

test('fabric, callout and packaging pages appear as dedicated editable factory sections',()=>{
  const source=techPackSource(createDefaultProject(),null,false)
  const ids=TECHPACK_PAGES.map(p=>p.id)
  for(const id of ['fabrics','materials','callouts','packaging','flats','patterns','measurements','construction','artwork','colorways','labels','notes'])assert(ids.includes(id))
  const fabric=techPackPageTable('fabrics',source)
  assert(fabric.rows.length>0)
  assert(fabric.headers.includes('STRETCH %'))
  assert(fabric.headers.includes('SHRINKAGE %'))
  assert(techPackPageTable('packaging',source,{packaging:[{id:'polybag',name:'Individual polybag',notes:'Fold and seal'}]}).rows.some(row=>row.cells.some(c=>c==='Individual polybag')))
  const result=renderTechPackWorkspacePrintHTML(source,{}, {annotations:{callouts:[{id:'a01',type:'arrow',label:'D01',component:'Neck binding',instruction:'Coverstitch 6 mm <test>'}]}})
  assert.match(result,/CONSTRUCTION DETAIL \/ LEADER REGISTER/)
  assert.match(result,/Coverstitch 6 mm &lt;test&gt;/)
  assert.match(result,/FABRIC SWATCHES \/ SOURCE MATERIALS/)
  assert.equal((result.match(/class="sheet /g)||[]).length,TECHPACK_PAGES.length)
})
