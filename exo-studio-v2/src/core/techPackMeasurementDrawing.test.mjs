import test from 'node:test'
import assert from 'node:assert/strict'
import {linkedMeasurementLabel,measurementReferenceRows,readableMeasurementEntries} from './techPackMeasurementDrawing.js'
import {renderTechPackWorkspacePrintHTML} from './techPackWorkspacePrint.js'

const spec={headers:['POINT OF MEASURE','TOL. (cm)','M (cm)','L (cm)','METHOD / NOTES'],rows:[
  {id:'chest',cells:['Chest width','0.5','56','58','Measured source']},
  {id:'chest:target',cells:['Chest width · TARGET','0.5','57','59','Target only']},
  {id:'length',cells:['Body length','0.8','68','70','Measured source']},
]}

test('numbered POM references match duplicate target and actual rows without renumbering',()=>{
  assert.deepEqual(measurementReferenceRows(spec.rows).map(x=>x.reference),['P01','P01-T','P02'])
  assert.equal(readableMeasurementEntries(spec)[2].name,'Body length')
})

test('dimension arrow only shows linked source value; not synthetic length from drawing coordinates',()=>{
  const dim={type:'dimension',pomId:'chest',sizeIndex:3,points:[[0,0],[950,500]]}
  assert.equal(linkedMeasurementLabel(dim,spec).label,'P01 · 58 cm')
  assert.equal(linkedMeasurementLabel(dim,spec,{chest:{3:'59'}}).label,'P01 · 59 cm')
  assert.match(linkedMeasurementLabel({...dim,pomId:'missing'},spec).detail,/Source point missing/)
  assert.equal(linkedMeasurementLabel({type:'dimension',points:[[0,0],[950,500]]},spec).label,'DIMENSION · SPEC PENDING')
})

test('print contains numbered measurement register and escaped factory notes',()=>{
  const tableSource={kind:'native',name:'EXO Seville reference',revision:1,panels:[],seams:[],fabrics:[],pom:{M:[
    {id:'chest',label:'Chest width',cm:56,toleranceCm:.5},
  ]},grading:{baseSize:'M'}}
  const html=renderTechPackWorkspacePrintHTML(tableSource,{status:'draft'},
    {annotations:{measurements:[{id:'d1',type:'dimension',pomId:'chest',sizeIndex:2,points:[[1,2],[9,10]],placementVerified:false},
      {id:'a1',type:'arrow',label:'A01',instruction:'&lt;notify&gt; no manufactured seam'}]}})
  assert.match(html,/class="pom-print"/)
  assert.match(html,/class="pom-ref">P01/)
  assert.match(html,/Verify drawn endpoints/)
  assert.match(html,/Chest width · M · 56 cm/)
  assert(!html.includes('<notify>'))
  assert.match(html,/&amp;lt;notify&amp;gt;/)
})
