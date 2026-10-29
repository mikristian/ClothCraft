import {zipSync,strToU8,unzipSync,strFromU8} from 'fflate'
import {XMLParser} from 'fast-xml-parser'
import {normalizeTableStyle,TABLE_THEMES} from './tableAdapter.js'

// XLSX is a data-interchange export, not a factory approval or a VBA runtime.
// Every table is exported to one worksheet. No macros, external links, scripts
// or imported formulas execute in EXO; unknown forms are preserved as text.
const esc = value => String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'')
const rawInput = value => value&&typeof value==='object'&&!Array.isArray(value)?value.input??value.value??'':value??''
// Inspect ZIP central-directory size declarations BEFORE allocating decompressed
// content. fflate's unzipSync alone would otherwise expand a zip bomb first.
function preflightXlsxZip(input,maxEntries,maxUnpackedBytes){
  const view=new DataView(input.buffer,input.byteOffset,input.byteLength)
  let end=-1
  for(let i=view.byteLength-22;i>=Math.max(0,view.byteLength-65557);i--){
    if(view.getUint32(i,true)===0x06054b50){end=i;break}
  }
  if(end<0)throw Error('Invalid XLSX ZIP directory')
  const count=view.getUint16(end+10,true),bytes=view.getUint32(end+12,true),start=view.getUint32(end+16,true)
  if(count>maxEntries||count===65535||view.getUint16(end+8,true)!==count||view.getUint16(end+4,true)!==0||view.getUint16(end+6,true)!==0)throw Error('Unsupported XLSX ZIP directory')
  if(start+bytes>view.byteLength||bytes>view.byteLength)throw Error('Invalid XLSX ZIP directory range')
  let offset=start,total=0
  for(let i=0;i<count;i++){
    if(offset+46>view.byteLength||view.getUint32(offset,true)!==0x02014b50)throw Error('Malformed XLSX ZIP record')
    const method=view.getUint16(offset+10,true),compressed=view.getUint32(offset+20,true),unpacked=view.getUint32(offset+24,true)
    const filenameLength=view.getUint16(offset+28,true),extra=view.getUint16(offset+30,true),comment=view.getUint16(offset+32,true)
    if(unpacked===0xffffffff||compressed===0xffffffff)throw Error('ZIP64 XLSX not supported')
    if(unpacked>maxUnpackedBytes||unpacked>Math.max(1024,compressed)*1000)throw Error('XLSX ZIP expansion ratio exceeds limit')
    if(![0,8].includes(method))throw Error('Unsupported XLSX compression')
    total+=unpacked
    if(total>maxUnpackedBytes)throw Error('XLSX unpacked size exceeds limit')
    offset+=46+filenameLength+extra+comment
    if(offset>start+bytes)throw Error('Invalid XLSX ZIP entry bounds')
  }
}
const columnLetters=index=>{let n=index+1,result='';while(n>0){result=String.fromCharCode(65+(n-1)%26)+result;n=Math.floor((n-1)/26)}return result}
const safeSheetName=(name,index,seen)=>{
  const base=String(name||`Sheet ${index+1}`).replace(/[\\/*?:\[\]]/g,' ').replace(/^'+|'+$/g,'').trim().slice(0,29)||`Sheet ${index+1}`
  let candidate=base,n=2
  while(seen.has(candidate.toLowerCase()))candidate=base.slice(0,Math.max(1,31-String(n).length-1))+`_${n++}`
  seen.add(candidate.toLowerCase());return candidate
}
const asPrintableRows=table=>{
  const columns=Array.isArray(table.columns)&&table.columns.length?table.columns.map((c,i)=>({id:c.id??`col-${i}`,label:String(c.label??c.name??c.id??`Column ${i+1}`),width:c.width||110})): (table.headers||[]).map((header,i)=>({id:`col-${i}`,label:String(header),width:110}))
  const body=(table.rows||[]).map(row=>columns.map((column,i)=>row?.cells&& !Array.isArray(row.cells)?rawInput(row.cells[column.id]):rawInput(row.cells?.[i])))
  return {columns,rows:[columns.map(c=>c.label),...body]}
}
const cellXml=(value,ref,origin='authored',styleId=0)=>{
  let input=rawInput(value)
  if(input==null)input=''
  if(typeof input==='number'&&Number.isFinite(input))return `<c r="${ref}" s="${styleId}"><v>${input}</v></c>`
  if(typeof input==='boolean')return `<c r="${ref}" s="${styleId}" t="b"><v>${input?1:0}</v></c>`
  const str=String(input)
  if(str.length>32767)throw new Error('Excel cell exceeds maximum 32767 characters')
  // Only explicitly calculated/export-approved formula cells may carry formulas.
  if(origin==='calculated'&&/^=[\w.()+\-*\/:!,\s$]+$/.test(str)&&str.length<=2048&&!/\b(?:HYPERLINK|WEBSERVICE|DDE|RTD|CMD|SHELL)\b/i.test(str)){
    return `<c r="${ref}" s="${styleId}"><f>${esc(str.slice(1))}</f></c>`
  }
  // Preserve +/@/=/-prefixed user-entered strings as inlineStr. XLSX must never
  // upgrade them to executable formulas because of spreadsheet app heuristics.
  return `<c r="${ref}" s="${styleId}" t="inlineStr"><is><t xml:space="preserve">${esc(str)}</t></is></c>`
}
const color=value=>/^#[0-9a-f]{6}$/i.test(String(value||''))?`FF${value.slice(1).toUpperCase()}`:null
function workbookStyles(tables){
  const fonts=[{bold:false}],fills=[null,null],xfs=[{font:0,fill:0,align:'left'}]
  const fontIndex=new Map([['|0|0|0',0]]),fillIndex=new Map(),xfIndex=new Map([['0|0|left',0]])
  const getFont=(value={})=>{
    const ink=color(value.color)||'',bold=Boolean(value.bold),italic=Boolean(value.italic),underline=Boolean(value.underline)
    const key=`${ink}|${bold?1:0}|${italic?1:0}|${underline?1:0}`
    if(fontIndex.has(key))return fontIndex.get(key)
    const id=fonts.length;fonts.push({ink,bold,italic,underline});fontIndex.set(key,id);return id
  }
  const getFill=value=>{
    const ink=color(value)
    if(!ink)return 0
    if(fillIndex.has(ink))return fillIndex.get(ink)
    const id=fills.length;fills.push(ink);fillIndex.set(ink,id);return id
  }
  const getXf=(font,fill,align='left')=>{
    const alignment=['left','center','right'].includes(align)?align:'left'
    const key=`${font}|${fill}|${alignment}`
    if(xfIndex.has(key))return xfIndex.get(key)
    const id=xfs.length;xfs.push({font,fill,align:alignment});xfIndex.set(key,id);return id
  }
  const maps=tables.map(table=>{
    const theme=normalizeTableStyle(table.tableStyle)
    const base=TABLE_THEMES[theme.theme==='custom'?'light':theme.theme]||TABLE_THEMES.light
    const headerColor=theme.header||base.header
    const stripeColor=theme.stripe||base.stripe
    const textColor=theme.text||base.text
    const header=getXf(getFont({bold:true,color:textColor}),getFill(headerColor),'left')
    const stripe=getXf(0,getFill(stripeColor),'left')
    const cells=new Map()
    for(const [coordinate,style] of Object.entries(table.cellStyles||{})){
      if(!/^[^:]+:\d+$/.test(coordinate)||!style||typeof style!=='object')continue
      const font=getFont(style),fill=getFill(style.background)
      cells.set(coordinate,getXf(font,fill,style.align))
    }
    return {header,stripe,cells}
  })
  const fontXml=fonts.map(f=>`<font>${f.bold?'<b/>':''}${f.italic?'<i/>':''}${f.underline?'<u/>':''}<sz val="10"/><name val="Arial"/>${f.ink?`<color rgb="${f.ink}"/>`:''}</font>`).join('')
  const fillXml=fills.map((ink,i)=>i===0?'<fill><patternFill patternType="none"/></fill>':i===1?'<fill><patternFill patternType="gray125"/></fill>':`<fill><patternFill patternType="solid"><fgColor rgb="${ink}"/><bgColor indexed="64"/></patternFill></fill>`).join('')
  const xfXml=xfs.map(x=>`<xf numFmtId="0" fontId="${x.font}" fillId="${x.fill}" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="${x.align}" vertical="center" wrapText="1"/></xf>`).join('')
  return {maps,xml:`<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="${fonts.length}">${fontXml}</fonts><fills count="${fills.length}">${fillXml}</fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${xfs.length}">${xfXml}</cellXfs></styleSheet>`}
}
const sheetXml=(table,styles)=>{
  const {columns,rows}=asPrintableRows(table)
  if(columns.length>256||rows.length>10001)throw new Error('Techpack export limit: 256 columns / 10000 data rows')
  const colXml=columns.map((c,i)=>`<col min="${i+1}" max="${i+1}" width="${Math.min(70,Math.max(9,Number(c.width||110)/7))}" customWidth="1"/>`).join('')
  const xmlRows=rows.map((row,i)=>{
    const cells=row.map((v,j)=>{
      const sourceCell=i>0?Array.isArray(table.rows[i-1].cells)?table.rows[i-1].cells[j]:table.rows[i-1].cells?.[columns[j].id]:null
      const visual=i===0?styles.header:styles.cells.get(`${i-1}:${j}`)??styles.cells.get(`${table.rows[i-1]?.id}:${j}`)??(i%2===0?styles.stripe:0)
      return cellXml(v,`${columnLetters(j)}${i+1}`,sourceCell?.origin||'authored',visual)
    }).join('')
    return `<row r="${i+1}"${i===0?' ht="24" customHeight="1"':''}>${cells}</row>`
  }).join('')
  const freeze=rows.length>1?'<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>':'<sheetViews><sheetView workbookViewId="0"/></sheetViews>'
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${freeze}<sheetFormatPr defaultRowHeight="17"/><cols>${colXml}</cols><sheetData>${xmlRows}</sheetData><pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.25" footer="0.25"/></worksheet>`
}
/** Returns a Uint8Array XLSX file, ready for an application/octet-stream Blob. */
export function exportTechPackXlsx(tables,{creator='EXO ClothCraft Studio'}={}){
  const items=(Array.isArray(tables)?tables:Object.values(tables||{})).filter(t=>t&&Array.isArray(t.rows)).slice(0,80)
  if(!items.length)throw new Error('No tables available to export')
  const styleMap=workbookStyles(items)
  const names=new Set(),sheets=items.map((table,i)=>({name:safeSheetName(table.name||table.title||table.kind,i,names),xml:sheetXml(table,styleMap.maps[i])}))
  const xml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>`
  const workbook=xml+`<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${sheets.map((s,i)=>`<sheet name="${esc(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`
  const wbRels=xml+`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`
  const types=xml+`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`
  const styles=xml+styleMap.xml
  const rootRels=xml+`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`
  const zipFiles={'[Content_Types].xml':strToU8(types),'_rels/.rels':strToU8(rootRels),'xl/workbook.xml':strToU8(workbook),'xl/_rels/workbook.xml.rels':strToU8(wbRels),'xl/styles.xml':strToU8(styles)}
  sheets.forEach((s,i)=>{zipFiles[`xl/worksheets/sheet${i+1}.xml`]=strToU8(s.xml)})
  return zipSync(zipFiles,{level:5})
}

// Conservative import: simple worksheets and canonical text/numeric cell values,
// with bounded decompression and NO macro/external data execution or recalc.
export function importTechPackXlsx(bytes,{maxBytes=8_000_000,maxEntries=200,maxUnpackedBytes=40_000_000}={}){
  const input=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes)
  if(input.length>maxBytes)throw Error('XLSX exceeds upload limit')
  preflightXlsxZip(input,maxEntries,maxUnpackedBytes)
  const files=unzipSync(input)
  const names=Object.keys(files)
  if(names.length>maxEntries)throw Error('XLSX has too many zip entries')
  let sum=0
  for(const [name,data] of Object.entries(files)){
    sum+=data.length
    if(sum>maxUnpackedBytes)throw Error('XLSX unpacked size exceeds limit')
    if(name.includes('..')||name.startsWith('/')||name.includes('\\'))throw Error('Unsafe XLSX path')
  }
  const required=(name)=>{const data=files[name];if(!data)throw Error(`Missing XLSX ${name}`);const xml=strFromU8(data);if(/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(xml))throw Error('XLSX XML entities and DTD are prohibited');return xml}
  if(names.some(name=>/vbaProject\.bin|externalLinks\//i.test(name)))throw Error('Macros and external workbook links are not permitted')
  const parser=new XMLParser({ignoreAttributes:false,attributeNamePrefix:'@_',parseTagValue:false,trimValues:false,processEntities:false})
  const list=value=>value==null?[]:[].concat(value)
  const xmlText=value=>String(typeof value==='object'&&value!==null?value['#text']??'':value??'').replace(/&(?:amp|lt|gt|quot|apos);/g,entity=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'"}[entity]))
  const rich=value=>value==null?'':list(value.r).length?list(value.r).map(run=>xmlText(run.t)).join(''):xmlText(value.t)
  const resolvePart=(base,target)=>{
    const path=String(target||'').replace(/^\//,'')
    if(!path||/[\\?#]/.test(path)||/^[a-z]+:/i.test(path))throw Error('Unsafe XLSX relationship target')
    const parts=(target.startsWith('/')?[]:base.split('/').slice(0,-1)).concat(path.split('/'))
    const safe=[]
    for(const part of parts){if(part===''||part==='.')continue;if(part==='..'){if(!safe.length)throw Error('Unsafe XLSX relationship traversal');safe.pop()}else safe.push(part)}
    return safe.join('/')
  }
  const wb=parser.parse(required('xl/workbook.xml')).workbook
  const sheets=wb?.sheets?.sheet?([].concat(wb.sheets.sheet)) : []
  const rels=list(parser.parse(required('xl/_rels/workbook.xml.rels')).Relationships?.Relationship)
  const relationship=new Map(rels.map(rel=>[rel['@_Id'],rel]))
  const getRelated=(id,type)=>{
    const rel=relationship.get(id)
    if(!rel||!String(rel['@_Type']||'').endsWith('/'+type)||rel['@_TargetMode']==='External')throw Error('Invalid XLSX '+type+' relationship')
    return resolvePart('xl/workbook.xml',rel['@_Target'])
  }
  const sharedRel=rels.find(r=>String(r['@_Type']||'').endsWith('/sharedStrings')&&r['@_TargetMode']!=='External')
  const sharedPath=sharedRel?resolvePart('xl/workbook.xml',sharedRel['@_Target']):'xl/sharedStrings.xml'
  const sst=files[sharedPath]?parser.parse(required(sharedPath)).sst?.si:[]
  const strings=list(sst).map(rich)
  const stylesRel=rels.find(r=>String(r['@_Type']||'').endsWith('/styles')&&r['@_TargetMode']!=='External')
  const stylesPath=stylesRel?resolvePart('xl/workbook.xml',stylesRel['@_Target']):'xl/styles.xml'
  const styles=files[stylesPath]?parser.parse(required(stylesPath)).styleSheet:null
  const formats=new Map(list(styles?.numFmts?.numFmt).map(x=>[Number(x['@_numFmtId']),String(x['@_formatCode']||'')]))
  const xfs=list(styles?.cellXfs?.xf)
  const fonts=list(styles?.fonts?.font),fills=list(styles?.fills?.fill)
  const colorValue=node=>{const rgb=String(node?.['@_rgb']||'');return /^[0-9a-f]{8}$/i.test(rgb)?`#${rgb.slice(2).toLowerCase()}`:undefined}
  const cellStyle=index=>{
    const xf=xfs[Number(index)]
    if(!xf)return null
    const font=fonts[Number(xf['@_fontId'])],fill=fills[Number(xf['@_fillId'])]
    const style={}
    if(font?.b!=null)style.bold=true
    if(font?.i!=null)style.italic=true
    if(font?.u!=null)style.underline=true
    const ink=colorValue(font?.color),background=colorValue(fill?.patternFill?.fgColor)
    if(ink)style.color=ink
    if(background&&fill?.patternFill?.['@_patternType']==='solid')style.background=background
    const align=xf.alignment?.['@_horizontal']
    if(['left','center','right'].includes(align))style.align=align
    return Object.keys(style).length?style:null
  }
  const isDateStyle=index=>{const id=Number(xfs[Number(index)]?.['@_numFmtId']);return [14,15,16,17,22,27,30,36,45,46,47,50,57].includes(id)||(/(?:[ymdhHsS])/.test((formats.get(id)||'').replace(/"[^"]*"|\\.|\[[^\]]*\]/g,'')))}
  const date1904=wb?.workbookPr?.['@_date1904']==='1'||wb?.workbookPr?.['@_date1904']==='true'
  const dateCell=n=>{const ms=(n-(date1904?24107:25569))*86400000;const d=new Date(ms);return Number.isFinite(ms)&&!Number.isNaN(d.getTime())?d.toISOString().replace(/\.000Z$/,'Z'):String(n)}
  return sheets.slice(0,80).map((meta,i)=>{
    const path=getRelated(meta['@_r:id']||meta['@_id'],'worksheet')
    const parsed=parser.parse(required(path))
    const rows=list(parsed.worksheet?.sheetData?.row)
    if(rows.length>10001)throw Error('Sheet exceeds 10000 row cap')
    const matrix=[];const cache=[];const cellStyles={}
    const columnWidths=[]
    for(const col of list(parsed.worksheet?.cols?.col)){
      const min=Number(col['@_min']),max=Number(col['@_max']),width=Number(col['@_width'])
      if(!Number.isInteger(min)||!Number.isInteger(max)||min<1||max<min||max>256||!Number.isFinite(width)||width<=0)continue
      for(let j=min-1;j<max;j++)columnWidths[j]=Math.round(width*7)
    }
    for(let rowIndex=0;rowIndex<rows.length;rowIndex++){
      const row=rows[rowIndex]
      const rowNumber=Number(row['@_r']??rowIndex+1)
      if(!Number.isInteger(rowNumber)||rowNumber<1||rowNumber>10001)throw Error('Sheet exceeds 10000 row cap')
      if(matrix[rowNumber-1])throw Error('Duplicate XLSX row')
      const cells=list(row.c)
      const record=[]
      const cached={}
      for(const c of cells){
        const loc=String(c['@_r']||'').match(/^([A-Z]{1,3})(\d+)$/)
        if(!loc)continue
        let index=0;for(const char of loc[1])index=index*26+char.charCodeAt(0)-64;index--
        if(index>=256)throw Error('Sheet exceeds 256 column cap')
        if(rowNumber>1&&c['@_s']!=null){const style=cellStyle(c['@_s']);if(style)cellStyles[`${rowNumber-2}:${index}`]=style}
        if(c.f!=null){
          record[index]=`=${xmlText(c.f)}`
          if(c.v!=null)cached[index]={value:xmlText(c.v),type:String(c['@_t']||'n')}
          continue
        }
        if(c['@_t']==='inlineStr')record[index]=rich(c.is)
        else if(c['@_t']==='s'){
          const pointer=Number(c.v);if(!Number.isInteger(pointer)||pointer<0||pointer>=strings.length)throw Error('Invalid shared string index')
          record[index]=strings[pointer]
        }
        else if(c['@_t']==='b')record[index]=String(c.v)==='1'
        else if(c['@_t']==='str'||c['@_t']==='e'||c['@_t']==='d')record[index]=xmlText(c.v)
        else if(c.v==null||String(c.v).trim()==='')record[index]=''
        else {const num=Number(c.v);record[index]=Number.isFinite(num)?(isDateStyle(c['@_s'])?dateCell(num):num):xmlText(c.v)}
      }
      matrix[rowNumber-1]=record;cache[rowNumber-1]=cached
    }
    if(matrix.length>10001)throw Error('Sheet exceeds 10000 row cap')
    for(let j=0;j<matrix.length;j++)matrix[j]??=[]
    const headers=(matrix.shift()||[]).map((x,j)=>String(x??`COLUMN ${j+1}`))
    if(headers.length>256)throw Error('Sheet exceeds 256 column cap')
    return {id:`import-${i+1}`,name:meta['@_name']||`Sheet ${i+1}`,kind:'imported',headers,
      columns:headers.map((label,j)=>({id:`col-${j}`,label,width:columnWidths[j]||110})),columnWidths:headers.map((_,j)=>columnWidths[j]||110),cellStyles,
      rows:matrix.map((values,j)=>({id:`import-row-${j+1}`,cells:headers.map((_,k)=>values[k]??''),...(Object.keys(cache[j+1]||{}).length?{formulaCachedValues:cache[j+1]}:{})})),
      imported:true,needsReview:true,importWarning:'Workbook formulas were NOT executed or verified; review before factory use'}
  })
}

export {asPrintableRows}
