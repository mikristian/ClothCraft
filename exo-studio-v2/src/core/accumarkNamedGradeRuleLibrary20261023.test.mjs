import test from 'node:test'
import assert from 'node:assert/strict'
import {gradeProject} from './grading.js'
import {createNamedGradeRuleLibrary,captureNamedGradeRule,updateNamedGradeRule,assignNamedGradeRule,detachNamedGradeRule,inspectNamedGradeRuleReferences,serializeNamedGradeRuleLibrary,deserializeNamedGradeRuleLibrary,validateNamedGradeRuleLibrary} from './accumarkNamedGradeRuleLibrary20261023.js'
const rule={mode:'small-large-incremental',sizes:['S','M','L','XL'],baseSize:'M',steps:[{dx:-.3,dy:.1},{dx:.7,dy:-.2},{dx:1.2,dy:.4}]}
function project(){return {grading:{sizes:['S','M','L','XL'],baseSize:'M'},pieces:[{id:'front',points:[{id:'a',x:1,y:2,industrialGradeRule:structuredClone(rule)},{id:'b',x:10,y:2}]},{id:'back',points:[{id:'q',x:1,y:2}]}]}}
const grab=(lib,p)=>captureNamedGradeRule(lib,p,{id:'bodice.side',name:'Bodice side',pieceId:'front',pointIndex:0,source:'workshop'})
test('capture versioned nonuniform rules, assign cloned project and preserve isolated snapshots',()=>{
 const source=project(),before=structuredClone(source),empty=createNamedGradeRuleLibrary()
 const library=grab(empty,source)
 assert(Object.isFrozen(library.entries[0].rule.steps[1]))
 assert.deepEqual(source,before)
 const assigned=assignNamedGradeRule(source,library,{id:'bodice.side',version:1,pieceId:'back',pointIndex:0})
 assert.notStrictEqual(assigned,source)
 assert.equal(source.pieces[1].points[0].industrialGradeRule,undefined)
 assert.deepEqual(assigned.pieces[1].points[0].industrialGradeRule,rule)
 assert.equal(assigned.pieces[1].points[0].namedGradeRuleRef.version,1)
 assert.deepEqual(inspectNamedGradeRuleReferences(assigned,library),[])
 assert.equal(gradeProject(assigned,'XL').pieces[1].points[0].x,2.9)
 const updated=updateNamedGradeRule(library,{id:'bodice.side',rule:{...rule,steps:[rule.steps[0],{dx:1.5,dy:0},rule.steps[2]]}})
 assert.equal(updated.entries.length,2)
 assert.equal(assigned.pieces[1].points[0].industrialGradeRule.steps[1].dx,.7)
 assert.deepEqual(inspectNamedGradeRuleReferences(assigned,updated),[])
 assert.equal(library.entries.length,1)
 const newer=assignNamedGradeRule(assigned,updated,{id:'bodice.side',pieceId:'back',pointIndex:0})
 assert.equal(newer.pieces[1].points[0].namedGradeRuleRef.version,2)
 assert.equal(assigned.pieces[1].points[0].namedGradeRuleRef.version,1)
 const detached=detachNamedGradeRule(newer,{pieceId:'back',pointIndex:0})
 assert.equal(detached.pieces[1].points[0].namedGradeRuleRef,undefined)
 assert(detached.pieces[1].points[0].industrialGradeRule)
 assert.equal(newer.pieces[1].points[0].namedGradeRuleRef.version,2)
 assert.equal(detachNamedGradeRule(newer,{pieceId:'back',pointIndex:0,keepRule:false}).pieces[1].points[0].industrialGradeRule,undefined)
})
test('strict schema and checksum reject altered, missing, or duplicate rule history',()=>{
 const p=project(),lib=grab(createNamedGradeRuleLibrary(),p)
 assert.deepEqual(deserializeNamedGradeRuleLibrary(serializeNamedGradeRuleLibrary(lib)),lib)
 const altered=JSON.parse(serializeNamedGradeRuleLibrary(lib))
 altered.entries[0].rule.steps[1].dx=900
 assert.throws(()=>validateNamedGradeRuleLibrary(altered),/checksum/)
 altered.entries[0].rule.steps[1].dx=.7
 altered.entries[0].version=9
 assert.throws(()=>validateNamedGradeRuleLibrary(altered),/version history/)
 assert.throws(()=>deserializeNamedGradeRuleLibrary('{broken'),/invalid JSON/)
 const edited=assignNamedGradeRule(p,lib,{id:'bodice.side',pieceId:'back',pointIndex:0})
 edited.pieces[1].points[0].industrialGradeRule.steps[0].dy=77
 assert.equal(inspectNamedGradeRuleReferences(edited,lib)[0].code,'RULE_SNAPSHOT_MISMATCH')
 assert.equal(inspectNamedGradeRuleReferences(edited,createNamedGradeRuleLibrary())[0].code,'MISSING_REFERENCE')
})
test('rejects mismatched grading run, duplicate id, unknown versions and conflicting rule',()=>{
 const p=project(),lib=grab(createNamedGradeRuleLibrary(),p)
 assert.throws(()=>grab(lib,p),/already exists/)
 assert.throws(()=>assignNamedGradeRule(p,lib,{id:'missing',pieceId:'back',pointIndex:0}),/missing named/)
 assert.throws(()=>assignNamedGradeRule(p,lib,{id:'bodice.side',version:2,pieceId:'back',pointIndex:0}),/missing named/)
 const mismatch=project()
 mismatch.grading.sizes=['XS','M','L','XL']
 assert.throws(()=>assignNamedGradeRule(mismatch,lib,{id:'bodice.side',pieceId:'back',pointIndex:0}),/size set/)
 const legacy=project()
 legacy.pieces[1].points[0].gradeRule={enabled:true}
 assert.throws(()=>assignNamedGradeRule(legacy,lib,{id:'bodice.side',pieceId:'back',pointIndex:0}),/conflicting/)
 assert.throws(()=>updateNamedGradeRule(lib,{id:'bodice.side',rule:{...rule,sizes:['XS','M','L','XL']}}),/size set/)
})
