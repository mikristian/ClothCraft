import assert from 'node:assert/strict'
import {buildPortableTechPackHTML,buildMarketplaceTechPackListing} from '../src/core/techPackHtmlExport.js'
import {createTechPackDraft,updateTechPackDraft,createTechPackRevision,buildTraditionalTechPackHTML} from '../src/core/digitalTechPack.js'

const project={id:'fixture-private',name:'Technical Jacket',revision:7,units:'cm',pieces:[],fabrics:{},seams:[],grading:{sizes:['S','M']}}
const original=structuredClone(project)
const frame='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMBAABoqXUAAAAASUVORK5CYII='
const state=updateTechPackDraft(createTechPackDraft(project),{
  styleName:'Private <script>alert(1)</script>',
  sku:'S-001',brand:'Brand',
  references:[
    {id:'ref1',dataUrl:frame,caption:'Center <label> draft',category:'pattern',annotations:[{x:.25,y:.75,text:'Reinforce <armhole>',patternId:'front'}]},
    {id:'malicious',dataUrl:'javascript:alert(1)',caption:'Forbidden link'},
  ],
  factory:'Confidential Maker',technicalNotes:'Topstitch near neckline.',
})
const snapshot=createTechPackRevision(state,{label:'Factory A',manufacturerId:'factory-a',createdAt:'2026-10-18T03:00:00Z'})
const printable=buildTraditionalTechPackHTML(project,snapshot,{versionId:snapshot.revisions[0].id})
assert.ok(printable.includes('reference-pin'))
assert.ok(printable.includes('left:25%;top:75%'))
assert.ok(printable.includes('Reinforce &lt;armhole&gt;'))
assert.ok(!printable.includes('javascript:alert(1)'))
const output=buildPortableTechPackHTML(project,snapshot,{versionId:snapshot.revisions[0].id})
assert.ok(output.startsWith('<!doctype html>'))
assert.ok(output.includes('Technical Jacket')||output.includes('Private'))
assert.ok(output.includes('EXO / PRODUCT DEVELOPMENT'))
assert.ok(output.includes('Reference'))
assert.ok(output.includes('Center &lt;label&gt; draft'))
assert.ok(output.includes('Reinforce &lt;armhole&gt;'))
assert.ok(output.includes('left:25%;top:75%;'))
assert.ok(output.includes('sandbox=""'))
assert.ok(!output.includes('javascript:alert(1)'))
assert.ok(!output.includes('<script>alert(1)</script>'))
assert.ok(output.includes('Private &lt;script&gt;alert(1)&lt;/script&gt;'))
assert.ok(output.includes('Revision history'))
assert.ok(output.includes('factory-a'))
assert.throws(()=>buildPortableTechPackHTML(project,snapshot,{versionId:'unknown'}),/Unknown/)
const listing=buildMarketplaceTechPackListing(project,snapshot)
assert.equal(listing.visibility,'private')
assert.equal(listing.requiresExplicitPublication,true)
assert.equal(listing.technicalDataIncluded,false)
assert.ok(!JSON.stringify(listing).includes('Confidential Maker'))
assert.ok(!JSON.stringify(listing).includes('fixture-private'))
assert.ok(!JSON.stringify(listing).includes('Topstitch'))
assert.deepEqual(project,original)
console.log('PORTABLE TECH PACK HTML / MARKETPLACE SANITIZATION PASS')
