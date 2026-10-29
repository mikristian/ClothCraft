import test from 'node:test'
import assert from 'node:assert/strict'
import {createModarisGradedNotchLink20261027 as create,reapplyModarisGradedNotchLink20261027 as reapply} from './modarisGradedNotchLink20261027.js'
import {validateSavedProject,writeSavedProject,readSavedProject} from './projectRestore.js'

const piece=(id,x,t)=>({id,points:[{x,y:0},{x:x+10,y:0},{x:x+10,y:8},{x,y:8}],edgeNames:['waist','side','hem','center'],notches:[{id:'waist',edgeIndex:0,t}]})
const source=()=>({revision:7,units:'cm',pieces:[piece('front',0,.35),piece('back',25,.6)],seams:[],fabrics:{},simulation:{},grading:{sizes:['S','M','L'],baseSize:'M',widthPerSizeCm:1,lengthPerSizeCm:.5}})
const refs={source:{pieceId:'front',notchId:'waist'},target:{pieceId:'back',notchId:'waist'}}
const store=()=>{const map=new Map();return {getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),peek:k=>map.get(k)}}
test('actual restore contract accepts stamped graded notch and preserves revision through JSON save/reopen',()=>{
 const initial=source()
 assert.equal(validateSavedProject(initial),initial)
 const stamped=create(initial,{...refs,expectedRevision:7}).project
 assert.equal(stamped.revision,8)
 assert.equal(validateSavedProject(stamped),stamped)
 const storage=store()
 writeSavedProject(storage,'primary','backup',stamped)
 const reopened=readSavedProject(storage,'primary','backup')
 assert.equal(reopened.status,'primary')
 assert.equal(reopened.project.revision,8)
 assert.deepEqual(reopened.project,stamped)
 assert.ok(storage.peek('backup'))
 assert.deepEqual(initial,source())
})
test('source notch edit requires explicit reapply; invalid save cannot replace primary or backup',()=>{
 const storage=store(),linked=create(source(),{...refs,expectedRevision:7}).project
 writeSavedProject(storage,'primary','backup',linked)
 const primary=storage.peek('primary'),backup=storage.peek('backup')
 const edited=structuredClone(linked);edited.pieces[0].notches[0].t=.7
 assert.throws(()=>writeSavedProject(storage,'primary','backup',edited),/linked graded notches are invalid/i)
 assert.equal(storage.peek('primary'),primary)
 assert.equal(storage.peek('backup'),backup)
 const updated=reapply(edited,{expectedRevision:8}).project
 assert.equal(updated.revision,9)
 writeSavedProject(storage,'primary','backup',updated)
 assert.equal(readSavedProject(storage,'primary','backup').project.revision,9)
 assert.equal(JSON.parse(storage.peek('backup')).revision,8)
})
test('corrupt or tampered primary falls back to original valid backup; sewn seams never accepted',()=>{
 const storage=store(),linked=create(source(),{...refs,expectedRevision:7}).project
 writeSavedProject(storage,'primary','backup',linked)
 const backup=storage.peek('backup')
 const corrupt=structuredClone(linked);corrupt.pieces[1].notches[0].t=.9
 storage.setItem('primary',JSON.stringify(corrupt))
 const recovered=readSavedProject(storage,'primary','backup')
 assert.equal(recovered.status,'backup')
 assert.deepEqual(recovered.project,linked)
 assert.equal(storage.peek('backup'),backup)
 const sewn=source();sewn.seams=[{id:'s',a:{pieceId:'front',edgeIndex:0},b:{pieceId:'back',edgeIndex:0}}]
 assert.throws(()=>create(sewn,{...refs,expectedRevision:7}),/ATTACHED_PRODUCTION/)
 const changed=structuredClone(linked);changed.seams.push({id:'sewn'})
 assert.throws(()=>validateSavedProject(changed),/linked graded notches are invalid/i)
 storage.setItem('primary','{bad')
 assert.equal(readSavedProject(storage,'primary','backup').status,'backup')
})
