import {buildMeasurementSizeRun} from './measurements.js'
import {inspectNativeGradingPOM20261025} from './nativeGradingPOM20261025.js'

const TECHPACK_PAGE_DEFINITIONS = [
  {id:'overview',name:'Style overview',tag:'01',subtitle:'Style identity & development'},
  {id:'authoring-checklist',name:'Specification checklist',subtitle:'Complete and confirm required specification records'},
  {id:'factory-review',name:'Factory handoff review',subtitle:'Outstanding requirements & sample validation'},
  {id:'flats',name:'Technical flats',tag:'02',subtitle:'Front, back and side reference views'},
  {id:'callouts',name:'Detail callouts & arrows',tag:'03',subtitle:'Numbered construction arrows and placement notes'},
  {id:'patterns',name:'Pattern drawing',tag:'04',subtitle:'Large individual source cutlines and pattern geometry'},
  {id:'pattern-cutlist',name:'Pattern cutting specification',tag:'05',subtitle:'Piece identifiers, quantities, allowances, notches and grain'},
  {id:'grading',name:'Pattern grading',tag:'06',subtitle:'Base size, size run and sourced grade increments'},
  {id:'measurements',name:'Measurement drawing',tag:'07',subtitle:'Illustrated points of measure and factory annotation arrows'},
  {id:'measurement-table',name:'Measurement specifications',subtitle:'Size run, tolerances and measured values'},
  {id:'construction',name:'Sewing & construction',tag:'08',subtitle:'Seam map and factory instructions'},
  {id:'construction-operations',name:'Sewing operation register',subtitle:'Source-linked seam operations and written instructions'},
  {id:'fabrics',name:'Fabric specification',tag:'09',subtitle:'Swatches, fiber content, weight and treatments'},
  {id:'materials',name:'Trims & bill of materials',tag:'10',subtitle:'Fabric and trim sourcing and consumption'},
  {id:'artwork',name:'Artwork & placements',tag:'11',subtitle:'Logo, SVG and graphic references'},
  {id:'colorways',name:'Colorways & finishes',tag:'12',subtitle:'Color references and treatments'},
  {id:'labels',name:'Labels & branding',tag:'13',subtitle:'Care labels, main labels and trims'},
  {id:'packaging',name:'Packaging & folding',tag:'14',subtitle:'Folding, bags, cartons and shipment'},
  {id:'notes',name:'Sampling & revisions',tag:'15',subtitle:'Comments, sampling and approvals'},
  {id:'interactive3d',name:'Interactive 3D review',tag:'15',subtitle:'Orbitable garment and editable detail markers'},
]
export const TECHPACK_PAGES=TECHPACK_PAGE_DEFINITIONS.map((page,i)=>({...page,tag:String(i+1).padStart(2,'0')}))

const arr = value => Array.isArray(value) ? value : []
const text = value => value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value)
const row = (id, ...cells) => ({id:String(id),cells:cells.map(text)})
const mm = value => Number.isFinite(Number(value)) ? (Number(value)*1000).toFixed(1) : '—'
const cm = value => Number.isFinite(Number(value)) ? (Number(value)).toFixed(2) : '—'
const nativeBounds = points => {
  const coords=arr(points).filter(p=>Array.isArray(p)&&Number.isFinite(p[0])&&Number.isFinite(p[1]))
  if(!coords.length)return {width:'—',height:'—'}
  return {width:mm(Math.max(...coords.map(p=>p[0]))-Math.min(...coords.map(p=>p[0]))),height:mm(Math.max(...coords.map(p=>p[1]))-Math.min(...coords.map(p=>p[1])))}
}

/** Keep native and legacy garment data separate: never substitute old project data for a Rust garment. */
export function techPackSource(project, nativeSnapshot, nativeMode=false) {
  if(nativeMode) {
    const template=nativeSnapshot?.template
    if(!template)return {kind:'native',ready:false,name:'Native garment loading',revision:null,panels:[],seams:[],fabrics:[],graphics:[],pom:{},grading:null}
    const panels=arr(template.panels).map((p,i)=>{
      const {width,height}=nativeBounds(p.polygon?.points)
      const meta=nativeSnapshot.propertyMetadata?.panels?.[p.id]||{}
      return {id:p.id||`panel-${i}`,name:p.name||p.id||`Panel ${i+1}`,fabricId:p.fabric||p.fabricId||'',
        itemNo:meta.itemNo||'',quantity:p.cutCount??p.quantity??p.count??'',grain:p.grainline||p.grain||'',
        allowance:p.seamAllowanceMm??p.seam_allowance_mm??'',points:arr(p.polygon?.points).length,
        width,height,notches:arr(p.polygon?.notches).length,notes:meta.notes||''}
    })
    const fabrics=arr(template.fabrics).map((f,i)=>{
      const meta=nativeSnapshot.propertyMetadata?.fabrics?.[f.id]||{}
      return {id:f.id||`fabric-${i}`,name:f.name||f.id||'Fabric',color:f.color||f.properties?.color||'',gsm:f.gsm??f.properties?.gsm??'',
        thickness:f.thickness??f.properties?.thickness??'',supplier:meta.supplier||'',composition:meta.construction||'',quantity:''}
    })
    const seams=arr(template.seams).map((s,i)=>({id:s.id||`seam-${i}`,name:s.name||s.id||`Seam ${i+1}`,type:s.type||s.kind||'Sew',
      first:s.a?.panel||s.a?.piece||'',second:s.b?.panel||s.b?.piece||'',from:s.a?.edge??'',to:s.b?.edge??'',
      reverse:s.reverseB?'Reversed':'',notes:s.notes||''}))
    const definitions=arr(nativeSnapshot.nativePOMDefinitions)
    const gradingReport=definitions.length&&nativeSnapshot.nativePOMRuleSet?
      inspectNativeGradingPOM20261025(nativeSnapshot,nativeSnapshot.nativePOMRuleSet,definitions):null
    const pom={},pomTargets={}
    if(gradingReport&&!gradingReport.reason){
      for(const point of gradingReport.rows){
        if(!pom[point.size])pom[point.size]=[]
        if(!pomTargets[point.size])pomTargets[point.size]=[]
        pom[point.size].push({id:point.id,label:point.label,cm:Number((point.actualMm/10).toFixed(3)),toleranceCm:point.toleranceMm/10})
        pomTargets[point.size].push({id:point.id,label:point.label,cm:point.targetMm==null?'':Number((point.targetMm/10).toFixed(3)),toleranceCm:point.toleranceMm/10})
      }
    }
    return {kind:'native',ready:true,name:template.name||'Native garment',revision:nativeSnapshot.revision??null,
      panels,seams,fabrics,pom:Object.keys(pom).length?pom:nativeSnapshot.gradingPOM||{},pomTargets,
      pomStatus:gradingReport?.reason||null,grading:template.grading||null,
      graphics:arr(nativeSnapshot.graphics),productionSpec:template.productionSpec||null}
  }
  return {kind:'project',ready:true,name:project.name||'Garment',revision:project.revision,
    panels:arr(project.pieces).map(p=>({id:p.id,name:p.name||p.id,fabricId:p.fabricId,itemNo:'',quantity:'',grain:p.grainline||'',
      allowance:p.seamAllowance==null?'':cm(p.seamAllowance),points:arr(p.points).length,
      width:'',height:'',notches:arr(p.notches).length,notes:'',allowanceUnit:'cm'})),
    seams:arr(project.seams).map(s=>({id:s.id,name:s.name||s.id,type:s.type||'normal',first:s.a?.pieceId||s.a?.piece||s.a?.panel||'',
      second:s.b?.pieceId||s.b?.piece||s.b?.panel||'',from:s.a?.edgeIndex??s.a?.edge??'',to:s.b?.edgeIndex??s.b?.edge??'',
      reverse:s.reverseB?'Reversed':'',notes:''})),
    fabrics:Object.values(project.fabrics||{}).map(f=>({id:f.id,name:f.name,color:f.color,gsm:f.gsm,thickness:f.thickness,supplier:'',quantity:'',composition:''})),
    pom:buildMeasurementSizeRun(project),grading:project.grading,graphics:[],productionSpec:project.productionSpec}
}

export function techPackPageTable(pageId, source, draft={}) {
  const measureRun=Object.keys(draft.pom||{}).length?draft.pom:source.pom||{}
  const sizes=Object.keys(measureRun)
  const materialDraft=new Map(arr(draft.bom).filter(item=>item&&item.id!=null).map(item=>[String(item.id),item]))
  const materialValue=(record,key,fallback='')=>record?.[key]??fallback
  switch(pageId){
    case 'overview':return {headers:['FIELD','DESIGN VALUE','STATUS / NOTES'],rows:[
      row('style','Style name',draft.styleName||source.name,''),row('sku','Style number',draft.sku||'Not assigned',''),
      row('brand','Brand',draft.brand||'Not assigned',''),row('season','Season',draft.season||'Not assigned',''),
      row('revision','Source revision',source.revision??'—','Read from current design'),
      row('factory','Factory',draft.factory||'Not assigned',''),row('status','Development status',draft.status||'Draft','') ]}
    case 'patterns':case 'pattern-cutlist':return {headers:['PIECE / ID','FABRIC','CUT QTY','W (mm)','H (mm)','POINTS','NOTCHES','SEAM ALLOWANCE','GRAIN / NOTES'],
      rows:source.panels.map(p=>row(p.id,`${p.name} · ${p.id}`,p.fabricId,p.quantity,p.width,p.height,p.points,p.notches,
        p.allowance===''?'Not set':`${p.allowance} ${p.allowanceUnit||'mm'}`,p.grain||p.notes))}
    case 'grading':{
      const run=Object.keys(measureRun).length?measureRun:{}
      const names=arr(source.grading?.sizes).length?source.grading.sizes:Object.keys(run)
      const sizes=[...new Set(names.filter(s=>typeof s==='string'&&s.length<30))]
      const base=source.grading?.baseSize||sizes[Math.floor(sizes.length/2)]||'—'
      const ids=[...new Set(sizes.flatMap(size=>arr(run[size]).map(p=>p.id)).filter(Boolean))]
      return {headers:['POINT OF MEASURE','BASE SIZE',...sizes.map(s=>`${s} / CM`),'GRADE STEP / CM','TOLERANCE / CM'],
        rows:ids.map(id=>{
          const first=sizes.map(s=>arr(run[s]).find(p=>p.id===id)).find(Boolean)||{}
          const vals=sizes.map(size=>arr(run[size]).find(p=>p.id===id)?.cm)
          const deltas=vals.slice(1).map((v,i)=>v!==''&&v!=null&&vals[i]!==''&&vals[i]!=null&&Number.isFinite(Number(v))&&Number.isFinite(Number(vals[i]))?
            `${sizes[i]}→${sizes[i+1]} ${((Number(v)-Number(vals[i]))).toFixed(2)}`:'—').join(' / ')
          return row(id,first.label||id,base,...vals.map(v=>v==null?'':v),deltas,first.toleranceCm??'')
        })}
    }
    case 'measurement-table':case 'measurements':{
      const ids=[...new Set(sizes.flatMap(s=>arr(measureRun[s]).map(p=>p.id)))];
      const rows=ids.map(id=>{
        const first=sizes.map(s=>arr(measureRun[s]).find(p=>p.id===id)).find(Boolean)||{}
        return row(id,first.label||id,first.toleranceCm??'',...sizes.map(s=>arr(measureRun[s]).find(p=>p.id===id)?.cm??''),source.kind==='native'?'Drafted geometry (actual)':'Drafted POM')
      })
      if(source.kind==='native')for(const id of ids){
        const first=sizes.map(s=>arr(source.pomTargets?.[s]).find(p=>p.id===id)).find(Boolean)
        if(first)rows.push(row(`${id}:target`,`${first.label||id} · TARGET`,first.toleranceCm??'',...sizes.map(s=>arr(source.pomTargets?.[s]).find(p=>p.id===id)?.cm??''),'Authored target · read-only source'))
      }
      return {headers:['POINT OF MEASURE','TOL. (cm)',...sizes.map(s=>`${s} (cm)`),'METHOD / NOTES'],rows}
    }
    case 'construction-operations':case 'construction':return {headers:['OPERATION','TYPE','FROM PANEL','EDGE','TO PANEL','EDGE','DIRECTION','FACTORY INSTRUCTION'],
      rows:source.seams.map(s=>row(s.id,s.name,s.type,s.first,s.from,s.second,s.to,s.reverse,s.notes))}
    case 'fabrics':return {headers:['FABRIC / APPLICATION','COLOR / CODE','FIBER COMPOSITION','WEIGHT (GSM)','WIDTH (CM)','STRETCH %','SHRINKAGE %','MILL / SUPPLIER','FINISH / CARE NOTES'],
      rows:source.fabrics.map(f=>{const b=materialDraft.get(String(f.id));return row(f.id,
        materialValue(b,'description',`${f.name} · ${f.id}`),materialValue(b,'color',f.color),
        materialValue(b,'composition',f.composition),materialValue(b,'gsm',f.gsm),'','','',
        materialValue(b,'supplier',f.supplier),'')})}
    case 'materials':return {headers:['ITEM / FABRIC','COLOR','GSM','THICKNESS','COMPOSITION','SUPPLIER','QTY','UNIT COST'],
      rows:[...source.fabrics.map(f=>{const b=materialDraft.get(String(f.id));return row(f.id,
        materialValue(b,'description',`${f.name} · ${f.id}`),materialValue(b,'color',f.color),
        materialValue(b,'gsm',f.gsm),materialValue(b,'thickness',f.thickness),
        materialValue(b,'composition',f.composition),materialValue(b,'supplier',f.supplier),
        materialValue(b,'quantity',f.quantity),materialValue(b,'cost',''))}),
        ...arr(draft.bom).filter(b=>b&&b.id!=null&&!source.fabrics.some(f=>String(f.id)===String(b.id)))
          .map(b=>row(b.id,b.description,b.color,b.gsm,b.thickness,b.composition,b.supplier,b.quantity,b.cost))]}
    case 'callouts':return {headers:[],rows:[]}
    case 'artwork':return {headers:['GRAPHIC / ID','PATTERN / PANEL','WIDTH','HEIGHT','PLACEMENT','COLOR / NOTES'],
      rows:arr(source.graphics).map((g,i)=>row(g.id||`graphic-${i}`,g.name||g.id||`Graphic ${i+1}`,g.panelId||g.panel||'',
        g.widthMm??g.width??'',g.heightMm??g.height??'',g.placement||g.position||'',g.color||g.notes||''))}
    case 'colorways':return {headers:['COLORWAY','CODE / HEX','FABRIC','WASH / FINISH','INSTRUCTIONS'],
      rows:arr(draft.colorways).map((c,i)=>row(c.id||`color-${i}`,c.name||c.color||'',c.code||c.hex||'',c.fabric||'',c.finish||'',c.notes||''))}
    case 'labels':return {headers:['COMPONENT','TYPE','PLACEMENT','MATERIAL','QUANTITY','INSTRUCTIONS'],
      rows:arr(draft.labels).map((v,i)=>row(v.id||`label-${i}`,v.name||v.description||'',v.type||'',v.placement||'',v.material||'',v.quantity||'',v.notes||v.instructions||''))}
    case 'packaging':return {headers:['PACKAGING ITEM','TYPE','PLACEMENT / FOLD','MATERIAL','QUANTITY','INSTRUCTIONS'],
      rows:arr(draft.packaging).map((v,i)=>row(v.id||`pack-${i}`,v.name||v.description||'',v.type||'',v.placement||'',v.material||'',v.quantity||'',v.notes||v.instructions||''))}
    case 'notes':return {headers:['ITEM','ROUND / VERSION','STATUS','DESCRIPTION'],rows:[
      ...arr(draft.samples).map((s,i)=>row(s.id||`sample-${i}`,s.manufacturer||'Sample',s.round||'',s.status||'',s.notes||''))]}
    default:return {headers:['REFERENCE','DETAILS'],rows:[]}
  }
}

export function techPackCsv(table,overrides={}){
  const quote=value=>{
    const raw=String(value??'')
    // Spreadsheet apps can execute formulas even inside quoted CSV cells.
    const safe=/^\s*[=+@\t\r]/.test(raw)||/^\s*-(?!\d)/.test(raw)?`'${raw}`:raw
    return `"${safe.replaceAll('"','""')}"`
  }
  return [table.headers,...table.rows.map(r=>r.cells.map((c,i)=>overrides[r.id]?.[i]??c))].map(r=>r.map(quote).join(',')).join('\r\n')
}
