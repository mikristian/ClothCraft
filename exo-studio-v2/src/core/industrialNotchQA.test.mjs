import test from 'node:test'
import assert from 'node:assert/strict'
import {createTeeTemplate} from '../data/templates.js'
import {createDefaultProject} from '../data/defaultProject.js'
import {inspectGradedNotchPairs} from './industrialNotchQA.js'
import {inspectIndustrialPatterns} from './industrialPatternQA.js'

test('Foundation Tee has all four notch groups matched along sewn edges across XS–XXL',()=>{
 const tee=createTeeTemplate(), report=inspectGradedNotchPairs(tee)
 assert.equal(report.status,'pass',JSON.stringify(report.issues))
 assert.equal(report.pairedGroups,4)
 assert.equal(report.checks.length,24)
 const maximum=Math.max(...report.checks.map(x=>x.offsetCm))
 assert(maximum<0.01,`notch drift ${maximum}cm`)
 assert.equal(inspectIndustrialPatterns(tee).blockers,0)
})

test('moving a sewn notch by 5 mm fails without relaxing the 0.5 mm distance tolerance',()=>{
 const project=createTeeTemplate(),sleeve=project.pieces.find(p=>p.id==='sleeve-left')
 sleeve.notches.find(n=>n.edgeIndex===1).t-=.05
 const notch=inspectGradedNotchPairs(project)
 assert.equal(notch.status,'blocked')
 assert(notch.issues.some(item=>item.code==='NOTCH_SEAM_MISALIGNMENT'))
 assert(inspectIndustrialPatterns(project).issues.some(item=>item.code==='NOTCH_SEAM_MISALIGNMENT'))
})

test('missing paired notch, broken seam reference and unsafe grade all fail closed',()=>{
 const a=createTeeTemplate()
 a.pieces.find(p=>p.id==='sleeve-left').notches.splice(0,1)
 assert(inspectGradedNotchPairs(a).issues.some(item=>item.code==='INVALID_NOTCH_GROUP'))
 const b=createTeeTemplate()
 b.pieces.find(p=>p.id==='sleeve-left').notches[0].matchedSeamId='not-an-existing-seam'
 assert(inspectGradedNotchPairs(b).issues.some(item=>item.code==='INVALID_NOTCH_GROUP'))
 const c=createTeeTemplate()
 c.pieces.find(p=>p.id==='front').notches[0].t=Infinity
 assert(inspectGradedNotchPairs(c).issues.some(item=>item.code==='INVALID_NOTCH_FRACTION'))
})

test('legacy Essential Shell unresolved armhole geometry remains blocked; no silent template replacement',()=>{
 const legacy=createDefaultProject(),before=structuredClone(legacy)
 const qa=inspectIndustrialPatterns(legacy)
 assert.equal(qa.blockers,44)
 assert(qa.issues.every(item=>item.code==='SEAM_LENGTH_MISMATCH'))
 assert.deepEqual(legacy,before)
})
