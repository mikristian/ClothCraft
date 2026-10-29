import {GARMENT_TEMPLATES,createTemplateProject} from '../src/data/templates.js'
import {inspectGradedNotchSeamIntervals} from '../src/core/gradedNotchIntervalAudit.js'

const results=[]
for(const template of GARMENT_TEMPLATES){
  const project=createTemplateProject(template.id)
  const before=JSON.stringify(project)
  const report=inspectGradedNotchSeamIntervals(project)
  if(JSON.stringify(project)!==before)throw new Error(`QA mutated template ${template.id}`)
  results.push({template:template.id,status:report.status,pairedGroups:report.pairedGroups,
    checks:report.checks.length,blockers:report.blockers,issues:report.issues.slice(0,8)})
}
const summary={templates:results.length,configured:results.filter(r=>r.status!=='not_configured').length,
  checkedStations:results.reduce((sum,row)=>sum+row.checks,0),
  blockers:results.reduce((sum,row)=>sum+row.blockers,0),results}
console.log(JSON.stringify(summary,null,2))
if(summary.blockers)process.exitCode=1
