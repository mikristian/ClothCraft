import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {authorIndustrialAllowanceGraph,reapplyIndustrialAllowanceGraph,assertFreshIndustrialAllowanceGraph20261027} from './industrialAllowanceGraph20261027.js'
import {writeSavedProject,readSavedProject} from './projectRestore.js'

const storage=()=>{
  const data=new Map()
  return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)}
}

test('legacy garment project stores and reopens typed linked allowance graph, then reapplies source edits',()=>{
  const source=createTeeTemplate(),store=storage()
  assert(source.pieces.length>=2)
  const from=source.pieces[0],to=source.pieces[1]
  const links=[{source:{pieceId:from.id,edgeIndex:0,pointCount:from.points.length},
    target:{pieceId:to.id,edgeIndex:0,pointCount:to.points.length}}]
  const applied=authorIndustrialAllowanceGraph(source,links,{expectedRevision:source.revision})
  assert.equal(applied.factoryCertified,false)
  writeSavedProject(store,'garment','backup',applied.project)
  const reopened=readSavedProject(store,'garment','backup')
  assert.equal(reopened.status,'primary')
  assert.deepEqual(reopened.project.industrialAllowanceGraph,applied.project.industrialAllowanceGraph)
  assert.deepEqual(reopened.project.pieces,applied.project.pieces)
  const updated=structuredClone(reopened.project)
  updated.revision++
  updated.pieces[0].edgeSeamAllowances={...updated.pieces[0].edgeSeamAllowances,0:1.75}
  const recalculated=reapplyIndustrialAllowanceGraph(updated,{expectedRevision:updated.revision})
  assert.equal(recalculated.project.pieces[1].edgeSeamAllowances[0],1.75)
  assert.equal(recalculated.factoryCertified,false)
  writeSavedProject(store,'garment','backup',recalculated.project)
  const again=readSavedProject(store,'garment','backup')
  assert.equal(again.status,'primary')
  assert.equal(again.project.pieces[1].edgeSeamAllowances[0],1.75)
  assert.equal(again.project.industrialAllowanceGraph.lastAppliedRevision,updated.revision)
})

test('tampered persisted seam link cannot overwrite a valid save; reopen recovers backup',()=>{
  const source=createTeeTemplate(),store=storage(),[front,back]=source.pieces
  const saved=authorIndustrialAllowanceGraph(source,[{
    source:{pieceId:front.id,edgeIndex:0,pointCount:front.points.length},
    target:{pieceId:back.id,edgeIndex:0,pointCount:back.points.length},
  }],{expectedRevision:source.revision}).project
  writeSavedProject(store,'garment','backup',saved)
  const before=store.getItem('garment')
  const bad=structuredClone(saved)
  bad.industrialAllowanceGraph.links[0].source.pieceId='deleted-pattern'
  assert.throws(()=>writeSavedProject(store,'garment','backup',bad),/linked seam allowances|topology/i)
  assert.equal(store.getItem('garment'),before)
  const changed=structuredClone(saved)
  const target=changed.pieces.find(piece=>piece.id===back.id)
  target.edgeSeamAllowances[0]=93
  assert.throws(()=>writeSavedProject(store,'garment','backup',changed),/linked seam allowances|target/i)
  assert.equal(store.getItem('garment'),before)
  store.setItem('garment',JSON.stringify(bad))
  const restored=readSavedProject(store,'garment','backup')
  assert.equal(restored.status,'backup')
  assert.deepEqual(restored.project.industrialAllowanceGraph,saved.industrialAllowanceGraph)
  assert.deepEqual(restored.project.pieces,saved.pieces)
})

test('direct out-of-band source allowance edits cannot silently save stale linked targets',()=>{
  const source=createTeeTemplate(),store=storage(),[a,b]=source.pieces
  const current=authorIndustrialAllowanceGraph(source,[{
    source:{pieceId:a.id,edgeIndex:0,pointCount:a.points.length},
    target:{pieceId:b.id,edgeIndex:0,pointCount:b.points.length},
  }],{expectedRevision:source.revision}).project
  assert.equal(assertFreshIndustrialAllowanceGraph20261027(current,
    {expectedRevision:current.revision}).sourceProvenanceVerified,true)
  writeSavedProject(store,'garment','backup',current)
  const previous=store.getItem('garment')
  const tampered=structuredClone(current)
  tampered.revision++
  tampered.pieces[0].edgeSeamAllowances={...tampered.pieces[0].edgeSeamAllowances,0:2.25}
  assert.throws(()=>writeSavedProject(store,'garment','backup',tampered),/source allowance|linked seam allowances/i)
  assert.equal(store.getItem('garment'),previous)
  const revalidated=reapplyIndustrialAllowanceGraph(tampered,{expectedRevision:tampered.revision}).project
  assert.equal(revalidated.pieces[1].edgeSeamAllowances[0],2.25)
  assert.equal(assertFreshIndustrialAllowanceGraph20261027(revalidated,
    {expectedRevision:revalidated.revision}).sourceProvenanceVerified,true)
  writeSavedProject(store,'garment','backup',revalidated)
  assert.equal(readSavedProject(store,'garment','backup').status,'primary')
})

test('old v1 graphs lacking root snapshots remain readable but do not claim verified provenance',()=>{
  const source=createTeeTemplate(),[a,b]=source.pieces
  const current=authorIndustrialAllowanceGraph(source,[{
    source:{pieceId:a.id,edgeIndex:0,pointCount:a.points.length},
    target:{pieceId:b.id,edgeIndex:0,pointCount:b.points.length},
  }],{expectedRevision:source.revision}).project
  const historical=structuredClone(current)
  delete historical.industrialAllowanceGraph.sources
  const result=assertFreshIndustrialAllowanceGraph20261027(historical,
    {expectedRevision:historical.revision})
  assert.equal(result.ok,true)
  assert.equal(result.sourceProvenanceVerified,false)
  const store=storage()
  writeSavedProject(store,'garment','backup',historical)
  assert.equal(readSavedProject(store,'garment','backup').status,'primary')
  const migrated=reapplyIndustrialAllowanceGraph(historical,{expectedRevision:historical.revision}).project
  assert.equal(assertFreshIndustrialAllowanceGraph20261027(migrated,
    {expectedRevision:migrated.revision}).sourceProvenanceVerified,true)
})
