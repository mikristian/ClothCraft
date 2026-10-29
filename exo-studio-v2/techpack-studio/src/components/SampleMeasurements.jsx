import React from 'react'
import {evaluateSample} from '../model.js'

export default function SampleMeasurements({pack,sample,onEdit}){
 const evaluation=evaluateSample(pack,sample)
 return <div className="sample-review">
  <div className="panel-heading"><h3>Actual vs. target measurements</h3><span className="badge">{evaluation.measuredCount} / {evaluation.rows.length} MEASURED</span></div>
  <div className="sample-size-line"><label className="field"><span>SAMPLE SIZE</span><select value={evaluation.size} onChange={e=>onEdit('size',e.target.value)}>{pack.sizes.map(size=><option key={size}>{size}</option>)}</select></label><span className={evaluation.outOfTolerance?'fail-total':'pass-total'}>{evaluation.outOfTolerance} outside tolerance</span></div>
  <div className="table-scroll"><table className="grid-table"><thead><tr><th>POM</th><th>LOCATION</th><th>TARGET</th><th>ACTUAL</th><th>DELTA</th><th>± CM</th><th>RESULT</th></tr></thead><tbody>{evaluation.rows.map(row=><tr key={row.id}><td>{row.code}</td><td>{row.description}</td><td>{row.target}</td><td><input aria-label={'Actual sample '+row.code} type="number" step=".1" value={sample.measurements?.[row.id]??''} placeholder="—" onChange={e=>onEdit('measurements',{...sample.measurements,[row.id]:e.target.value===''?'':Number(e.target.value)})}/></td><td>{row.delta==null?'—':(row.delta>0?'+':'')+row.delta.toFixed(1)}</td><td>±{row.tolerance}</td><td><span className={'result-chip '+(row.pass===null?'pending':row.pass?'passed':'failed')}>{row.pass===null?'Pending':row.pass?'Pass':'Review'}</span></td></tr>)}</tbody></table></div>
  <p className="hint">Tolerance review uses the editable current working spec for the selected sample size; save a revision and record the source revision before manufacturer signoff. This comparison is advisory until measurements and physical samples are verified.</p>
 </div>
}
