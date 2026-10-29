import test from 'node:test'
import assert from 'node:assert/strict'
import {routeModarisNativeNumericalAnchor20261027 as route} from './modarisNativeAutomaticAnchor20261027.js'
import {createNativePatternConstraintSidecar20261023 as create} from './nativePatternConstraintBindings20261023.js'
import {rebaseNativePatternBindingsAfterAnchorGroup20261027 as rebase} from './nativePatternBindingsRebase20261027.js'

function fixture(){
  const snapshot={revision:17,template:{panels:[
    {id:'front',name:'front',fabric:'main',grain_degrees:90,layout_2d:[0,0],
      placement:{translation:[0,1.5,.4],rotation_degrees:[0,0,0]},pins:[],
      pattern:{width:.4,height:.3,nx:1,ny:1},polygon:{points:[[0,0],[.4,0],[.4,.3],[0,.3]],
        edges:['f1','f2','f3','f4'],subdivisions:0,curves:{},holes:[],lines:[],notches:[],seam_allowances:{},annotations:[]}},
    {id:'back',name:'back',fabric:'main',grain_degrees:0,layout_2d:[.5,0],
      placement:{translation:[1,1.5,.4],rotation_degrees:[0,0,0]},pins:[],
      pattern:{width:.3,height:.3,nx:1,ny:1},polygon:{points:[[0,0],[.3,0],[.3,.3],[0,.3]],
        edges:['b1','b2','b3','b4'],subdivisions:0}}
  ],seams:[]}}
  const definition={measurements:{reach:{valueMm:250}},bindings:[
    {id:'follow-front',panelId:'front',pointIndex:2,mode:'polar',a:1,b:0,angleDeg:90,distanceFormula:'reach'}
  ]}
  const created=create(snapshot,definition)
  assert.equal(created.ok,true,created.reason)
  const linked=structuredClone(snapshot)
  linked.nativePointBindings={version:1,active:true,automaticRegeneration:false,
    manufacturingApproved:false,measurements:structuredClone(definition.measurements),
    bindings:structuredClone(definition.bindings)}
  const proposal={ok:true,revision:17,panelId:'front',pointIndex:1,
    command:{kind:'Anchor',panel:'front',anchor:1,position:[.42,0]}}
  return {snapshot,linked,proposal,sidecar:created.sidecar}
}

test('unauthored numerical construction retains its existing direct native Anchor',()=>{
  const {snapshot,proposal}=fixture(),previous=structuredClone(snapshot)
  const result=route(snapshot,proposal)
  assert.equal(result.ok,true,result.reason)
  assert.equal(result.mode,'direct')
  assert.deepEqual(result.command,proposal.command)
  assert(Object.isFrozen(result.command))
  assert.deepEqual(snapshot,previous)
})

test('saved active native rules reroute source Anchor to one source-first dependent group',()=>{
  const {linked,proposal,sidecar}=fixture(),previous=structuredClone(linked)
  const result=route(linked,proposal)
  assert.equal(result.ok,true,result.reason)
  assert.equal(result.mode,'linked-native')
  assert.equal(result.batch.panelCount,1)
  assert.equal(result.batch.pointCount,2)
  assert.deepEqual(result.batch.commands[0].edits,[[1,[.42,0]],[2,[.42,.25]]])
  assert.deepEqual(result.dependentBindingIds,['follow-front'])
  assert.deepEqual(linked,previous)
  assert(Object.isFrozen(result.batch.commands[0]))
  const after=structuredClone(linked);after.revision++
  after.template.panels[0].polygon.points[1]=[.42,0]
  after.template.panels[0].polygon.points[2]=[.42,.25]
  after.template.panels[0].pattern.width=.42
  const checked=rebase({revision:linked.revision,template:linked.template},
    {revision:after.revision,template:after.template},sidecar,result.batch)
  assert.equal(checked.ok,true,checked.reason)
})

test('inactive or stale native graph, bound point, altered geometry and unsafe marked contour refuse direct fallback',()=>{
  const {linked,proposal}=fixture()
  const inactive=structuredClone(linked);inactive.nativePointBindings.active=false
  assert.match(route(inactive,proposal).reason,/inactive/)
  const changed=structuredClone(linked);changed.nativePointBindings.sourceRevision=4
  assert.match(route(changed,proposal).reason,/source revision/)
  const bound=structuredClone(linked),target={...proposal,pointIndex:2,
    command:{kind:'Anchor',panel:'front',anchor:2,position:[.44,.30]}}
  assert.match(route(bound,target).reason,/Bound source anchor/)
  const marked=structuredClone(linked);marked.template.panels[0].polygon.notches={f1:[{t:.4,depth:.01}]}
  assert.match(route(marked,proposal).reason,/Attached native notches/)
  const stale={...proposal,revision:16}
  assert.match(route(linked,stale).reason,/Stale/)
  const crossPanel=structuredClone(proposal);crossPanel.command.panel='back'
  assert.match(route(linked,crossPanel).reason,/identity changed/)
  const unrelated=structuredClone(linked)
  unrelated.nativePointBindings.measurements.backWidth={valueMm:350}
  unrelated.nativePointBindings.bindings.push({id:'back-width',panelId:'back',pointIndex:1,
    mode:'polar',a:0,b:3,angleDeg:0,distanceFormula:'backWidth'})
  assert.match(route(unrelated,proposal).reason,/Unrelated native panel already violates/)
})
