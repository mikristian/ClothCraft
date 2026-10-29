/** Real Rust process, isolated project directory; never contacts the live app. */
import assert from 'node:assert/strict'
import {mkdtempSync,readFileSync,existsSync} from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import {createWorkspace} from '../integrations/clothcraft/workspace.mjs'

const temp=mkdtempSync(path.join(os.tmpdir(),'exo-physical-graphics-rust-'))
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Yl1zE0AAAAASUVORK5CYII='
const record={
 id:'test-print-25mm',name:'25.4 mm physical print',panel:'front',dataUrl:png,
 width:1,height:1,widthMm:25.4,heightMm:25.4,positionMm:[40,65],
 center:[.5,.5],lockAspectRatio:true,rotation:0,side:'front',visible:true,
 opacity:.8,roughness:.6,metalness:.2,reflectivity:.35,inkHeightMm:.5,
 color:'#ffffff',displayedMap:'texture',normalMapDataUrl:null,
}
let workspace=createWorkspace(temp)
try{
 const started=await workspace.request({op:'snapshot',avatar:true,graphics:true})
 assert(started.ok,'Initial native Rust garment did not open')
 const before=started.data
 assert(before.graphicPanelMetrics?.front?.width>0,'Missing true Rust UV material-space panel calibration')
 assert.deepEqual(before.printGraphics,[],'Disposable fixture unexpectedly has artwork')
 const changed=await workspace.request({op:'graphics-set',revision:before.revision,graphics:true,printGraphics:[record]})
 assert(changed.ok,changed.error||'Native Rust graphics-set rejected physical print')
 assert.equal(changed.data.printGraphics.length,1)
 assert.equal(changed.data.printGraphics[0].widthMm,25.4)
 assert.equal(changed.data.printGraphics[0].heightMm,25.4)
 assert.equal(changed.data.printGraphics[0].inkHeightMm,.5)
 assert.deepEqual(changed.data.template,before.template,'Printing must never alter cut contours, fabric or seams')
 assert.equal(changed.data.positions.length,before.positions.length)
 const stale=await workspace.request({op:'graphics-set',revision:before.revision,graphics:true,printGraphics:[]})
 assert(!stale.ok&&/revision/i.test(stale.error||''),'Rust must reject stale graphics edits')
 const bad=await workspace.request({op:'graphics-set',revision:changed.data.revision,graphics:true,printGraphics:[{...record,widthMm:-20}]})
 assert(!bad.ok,'Rust must reject invalid negative print dimensions')
 const recent=await workspace.request({op:'snapshot',graphics:true})
 assert.equal(recent.data.printGraphics[0].widthMm,25.4,'Rejected edit changed native saved width')
 assert(existsSync(path.join(temp,'workspace','fitting-project.json')))
 const saved=JSON.parse(readFileSync(path.join(temp,'workspace','fitting-project.json'),'utf8'))
 assert.equal(saved.printGraphics[0].widthMm,25.4,'Native disk document missing physical millimetre dimensions')
 workspace.close()
 workspace=createWorkspace(temp)
 const reopened=await workspace.request({op:'snapshot',avatar:true,graphics:true})
 assert(reopened.ok,'Native Rust saved project failed to reopen')
 assert.deepEqual(reopened.data.printGraphics,[record],'Rust print dimensions/material/texture did not survive save and reopen')
 assert.deepEqual(reopened.data.template,before.template,'Reopen changed garment construction topology')
 console.log(JSON.stringify({pass:true,temp,printMm:[25.4,25.4],positionMm:[40,65],
  panelWidthMm:reopened.data.graphicPanelMetrics.front.width*1000,
  sourcePixels:[1,1],sourceDpi:1,nativeSaveReopen:true,rejectsStale:true,rejectsInvalid:true,
  garmentTopologyPreserved:true},null,2))
}finally{workspace.close()}
