import test from 'node:test'
import assert from 'node:assert/strict'
import {build} from 'esbuild'
import {createRequire} from 'node:module'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {createNativePatternConstraintSidecar20261023 as create} from '../core/nativePatternConstraintBindings20261023.js'

const compiled=await build({entryPoints:['src/components/ModarisNativeCrossPieceReference20261027.jsx'],
  bundle:true,write:false,platform:'node',format:'cjs',packages:'external',loader:{'.jsx':'jsx'}})
const module={exports:{}}
new Function('module','exports','require',compiled.outputFiles[0].text)(module,module.exports,createRequire(import.meta.url))
const {default:Editor,modarisNativeCrossPieceReferencePreflight20261027:preflight,
  modarisNativeCrossPieceSourceIdentity20261027:sourceIdentity}=module.exports

function fixture(){
  const panel=(id,offset,rotation=0)=>({id,name:id,layout_2d:offset,layout_rotation_degrees:rotation,
    fabric:'main',grain_degrees:90,pins:[],pattern:{width:.4,height:.3,nx:1,ny:1},
    placement:{translation:[0,1.5,.4],rotation_degrees:[0,0,0]},
    polygon:{points:[[0,0],[.4,0],[.4,.3],[0,.3]],edges:[id+'a',id+'b',id+'c',id+'d'],
      subdivisions:0,meshing:{target_edge_m:.025},curves:{},free_curve_points:{},vertex_ids:{},
      vertex_mirror_groups:{},holes:[],lines:[],target_lengths:{},notches:[],seam_allowances:{},annotations:[],measurements:{}}})
  const snapshot={revision:9,template:{panels:[panel('front',[0,0],90),panel('back',[.8,.1]),panel('spare',[1.5,.2])]}}
  const created=create(snapshot,{measurements:{reach:{valueMm:250}},
    bindings:[{id:'bound-spare',panelId:'spare',pointIndex:2,mode:'polar',a:1,b:0,angleDeg:90,distanceFormula:'reach'}]})
  assert.equal(created.ok,true,created.reason)
  return {snapshot,sidecar:created.sidecar}
}
test('SSR renders source and target unbound selectors, desired millimetres and separate preview gate',()=>{
  const {snapshot,sidecar}=fixture(),saved=structuredClone({snapshot,sidecar})
  const html=renderToStaticMarkup(React.createElement(Editor,{snapshot,sidecar,onApplyBatch:async()=>({ok:false})}))
  assert.match(html,/Native cross-panel point reference/)
  assert.match(html,/Cross-panel source panel/)
  assert.match(html,/Cross-panel source anchor/)
  assert.match(html,/Cross-panel target panel/)
  assert.match(html,/Cross-panel target anchor/)
  assert.match(html,/Desired source X mm/)
  assert.match(html,/Desired source Y mm/)
  assert.match(html,/Preview cross-panel source and dependent points/)
  assert.match(html,/relative update/)
  assert.doesNotMatch(html,/Apply confirmed cross-panel native batch/)
  assert.deepEqual({snapshot,sidecar},saved)
})
test('preflight requires source fingerprint and revision, rejects stale and busy',()=>{
  const {snapshot,sidecar}=fixture()
  assert.equal(preflight(snapshot,sidecar),'')
  assert.match(preflight(snapshot,sidecar,true),/busy/)
  assert.match(preflight(null,sidecar),/revisioned/)
  assert.match(preflight(snapshot,null),/sidecar/)
  assert.match(preflight({...snapshot,revision:10},sidecar),/stale/)
  const changed=structuredClone(snapshot);changed.template.panels[0].polygon.points[1][0]=.41
  assert.match(preflight(changed,sidecar),/stale/)
  const disabled=renderToStaticMarkup(React.createElement(Editor,{snapshot,sidecar,disabled:true}))
  assert.match(disabled,/unavailable/)
  assert.match(disabled,/disabled=""/)
})
test('SSR survives missing native source or callback and exposes no commit action',()=>{
  const html=renderToStaticMarkup(React.createElement(Editor,{}))
  assert.match(html,/revisioned native Rust snapshot/)
  assert.match(html,/Preview cross-panel source and dependent points/)
  assert.doesNotMatch(html,/Apply confirmed cross-panel native batch/)
})
test('real callback stripped before revision/template matches full live snapshot with service metadata',()=>{
  const {snapshot,sidecar}=fixture()
  const live={...structuredClone(snapshot),nativePointBindings:{active:true,measurements:sidecar.measurements},
    serviceStatus:{connected:true},selectedPanel:'front'}
  const before={revision:snapshot.revision,template:structuredClone(snapshot.template)}
  assert.equal(sourceIdentity(live,before),true)
  assert.equal(sourceIdentity(live,{...before,revision:before.revision+1}),false)
  const changed=structuredClone(before);changed.template.panels[0].polygon.points[1][0]+=.01
  assert.equal(sourceIdentity(live,changed),false)
  assert.equal(sourceIdentity(live,{revision:before.revision}),false)
})
test('snapshot-grade and sewing remain delegated to guarded planner, UI never claims permanent native link',()=>{
  const {snapshot,sidecar}=fixture()
  const rendered=renderToStaticMarkup(React.createElement(Editor,{snapshot,sidecar}))
  assert.match(rendered,/No continuously updating cross-panel graph/)
  assert.match(rendered,/one Undo transaction/)
  const sewn=structuredClone(snapshot);sewn.template.seams=[{a:{panel:'front'},b:{panel:'back'}}]
  // Fingerprint includes authored polygons and revision; scoped attached
  // validation runs on preview through the core, before native batch callback.
  const sealed=create(sewn,{measurements:sidecar.measurements,bindings:sidecar.bindings})
  assert.equal(sealed.ok,true)
  assert.equal(preflight(sewn,sealed.sidecar),'')
})
