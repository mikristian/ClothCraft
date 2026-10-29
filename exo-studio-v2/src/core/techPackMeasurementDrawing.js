// MIKRISTIAN-inspired spec references. Only source POM values are displayed;
// dimensions are not inferred from drawn screen distances or 3D silhouettes.
export function measurementReferenceRows(rows=[]){
  const ids=new Map()
  return rows.map(row=>{
    const id=String(row?.id??'')
    const target=id.endsWith(':target')
    const base=target?id.slice(0,-7):id
    if(!ids.has(base))ids.set(base,`P${String(ids.size+1).padStart(2,'0')}`)
    return {id,sourceId:base,reference:ids.get(base)+(target?'-T':''),target}
  })
}

export function linkedMeasurementLabel(annotation,table,overrides={}){
  const id=String(annotation?.pomId||'')
  const value=String(annotation?.label||'').trim()
  if(!id)return {reference:'',label:value||'DIMENSION · SPEC PENDING',detail:'Unlinked annotation',linked:false}
  const row=table?.rows?.find(item=>item.id===id)
  if(!row)return {reference:'',label:value||'UNRESOLVED POINT',detail:'Source point missing',linked:false}
  const keys=measurementReferenceRows(table.rows)
  const reference=keys.find(x=>x.id===id)?.reference||''
  const index=Number(annotation?.sizeIndex)
  const validIndex=Number.isInteger(index)&&index>=2&&index<table.headers.length-1?index:2
  const raw=overrides[id]?.[validIndex]??row.cells[validIndex]
  const number=String(raw??'').trim()
  const sourceSize=String(table.headers[validIndex]||'').replace(/\s*\(cm\)/,'')
  const output=number!==''&&Number.isFinite(Number(number))?`${number} cm`:'VALUE PENDING'
  return {reference,label:value||`${reference} · ${output}`,detail:`${row.cells[0]} · ${sourceSize} · ${output}`,linked:true,sourceSize}
}

export function readableMeasurementEntries(table,overrides={}){
  const references=measurementReferenceRows(table?.rows||[])
  return (table?.rows||[]).map((row,i)=>({id:row.id,reference:references[i].reference,
    name:String(overrides[row.id]?.[0]??row.cells?.[0]??''),target:references[i].target,
    sizes:(table?.headers||[]).slice(2,-1).map((heading,j)=>({heading,value:String(overrides[row.id]?.[j+2]??row.cells?.[j+2]??'')}))}))
}
