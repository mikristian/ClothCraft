// Pure spreadsheet evaluator. Raw cell inputs are never replaced or executed.
export class FormulaError extends Error {
  constructor(code,message=code){super(message);this.name='FormulaError';this.code=code}
}
const fail=(code,message)=>{throw new FormulaError(code,message)}
const raw=(cell)=>cell&&typeof cell==='object'&&!Array.isArray(cell)?cell.input??cell.value??'':cell??''
const colNumber=letters=>[...letters.toUpperCase()].reduce((n,ch)=>n*26+ch.charCodeAt(0)-64,0)-1
const num=value=>{
  if(value===null||value==='')return 0
  const n=Number(value)
  if(!Number.isFinite(n))fail('#VALUE!','Expected a finite number')
  return n
}
const scalar=value=>Array.isArray(value)?fail('#VALUE!','Range requires an aggregate function'):value
const truth=value=>typeof value==='string'?value.length>0:!!value
function tokens(input){
  const result=[]
  let i=0
  while(i<input.length){
    const rest=input.slice(i),white=/^\s+/.exec(rest)
    if(white){i+=white[0].length;continue}
    const match=/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|^\$?[A-Za-z]+\$?[1-9]\d*(?![A-Za-z_0-9])|^[A-Za-z_][A-Za-z_0-9]*|^(?:<=|>=|<>|[()+\-*/^,:=<>])/.exec(rest)
    if(!match)fail('#ERROR!',`Unexpected character at position ${i+1}`)
    result.push(match[0]);i+=match[0].length
  }
  result.push('EOF')
  return result
}
export function evaluateTableFormulas(table){
  const columns=Array.isArray(table?.columns)?table.columns:Array.isArray(table?.headers)?table.headers.map((label,i)=>({id:String(i),label})):[]
  const rows=Array.isArray(table?.rows)?table.rows:[]
  const memory=new Map(),active=new Set()
  const get=(r,c)=>{
    if(r<0||c<0||r>=rows.length||c>=columns.length)fail('#REF!','Cell reference is out of bounds')
    const key=`${r}:${c}`
    if(active.has(key))fail('#CYCLE!','Circular reference')
    if(memory.has(key)){const cached=memory.get(key);if(cached.error)fail(cached.error,cached.message);return cached.value}
    active.add(key)
    try{
      const cell=Array.isArray(rows[r]?.cells)?rows[r].cells[c]:rows[r]?.cells?.[columns[c].id]
      const source=raw(cell)
      const result=typeof source==='string'&&source.startsWith('=')?parse(source.slice(1)):source
      memory.set(key,{value:result})
      return result
    }catch(error){
      const normalized=error instanceof FormulaError?error:new FormulaError('#ERROR!',error.message)
      memory.set(key,{error:normalized.code,message:normalized.message})
      throw normalized
    }finally{active.delete(key)}
  }
  const reference=token=>{
    const match=/^\$?([A-Za-z]+)\$?([1-9]\d*)$/.exec(token)
    if(!match)return null
    const c=colNumber(match[1]),r=Number(match[2])-1
    if(!Number.isSafeInteger(r))fail('#REF!','Invalid row reference')
    return {r,c}
  }
  function parse(formula){
    const list=tokens(formula);let pos=0
    const peek=()=>list[pos],eat=value=>{if(peek()!==value)fail('#ERROR!',`Expected ${value}`);pos++}
    function expression(){return compare()}
    function compare(){
      let left=add()
      while(['=','<>','<','>','<=','>='].includes(peek())){
        const op=list[pos++],right=add(),a=scalar(left),b=scalar(right)
        left=op==='='?a===b:op==='<>'?a!==b:op==='<'?a<b:op==='>'?a>b:op==='<='?a<=b:a>=b
      }
      return left
    }
    function add(){
      let left=mult()
      while(['+','-'].includes(peek())){const op=list[pos++],right=mult();left=op==='+'?num(scalar(left))+num(scalar(right)):num(scalar(left))-num(scalar(right))}
      return left
    }
    function mult(){
      let left=power()
      while(['*','/'].includes(peek())){const op=list[pos++],right=power(),divisor=num(scalar(right))
        if(op==='/'&&divisor===0)fail('#DIV/0!','Division by zero')
        left=op==='*'?num(scalar(left))*divisor:num(scalar(left))/divisor
      }
      return left
    }
    function power(){let value=unary();if(peek()==='^'){pos++;value=Math.pow(num(scalar(value)),num(scalar(power())))}return value}
    function unary(){if(peek()==='+'||peek()==='-'){const op=list[pos++];return (op==='-'?-1:1)*num(scalar(unary()))}return atom()}
    function atom(){
      const token=peek()
      if(token==='('){pos++;const val=expression();eat(')');return val}
      if(/^\d|^\.\d/.test(token)){pos++;return Number(token)}
      if(/^[A-Za-z_$]/.test(token)){
        pos++
        if(peek()==='('){
          pos++
          // IF evaluates only the selected branch, as spreadsheets do.
          if(token.toUpperCase()==='IF'){
            const parts=[[]];let depth=0
            while(peek()!=='EOF'){
              const current=list[pos++]
              if(current===')'&&depth===0)break
              if(current==='(')depth++
              if(current===')')depth--
              if(current===','&&depth===0){parts.push([]);continue}
              parts.at(-1).push(current)
            }
            if(list[pos-1]!==')'||parts.length!==3||parts.some(p=>!p.length))fail('#ERROR!','IF requires three arguments')
            const branch=truth(scalar(parse(parts[0].join(''))))?1:2
            return parse(parts[branch].join(''))
          }
          const args=[]
          if(peek()!==')')do{args.push(expression());if(peek()!==',')break;pos++}while(true)
          eat(')')
          const name=token.toUpperCase()
          if(!['SUM','MIN','MAX','ROUND','IF','COUNT'].includes(name))fail('#NAME?',`Unsupported function ${token}`)
          if(name==='IF'){if(args.length!==3)fail('#ERROR!','IF needs three arguments');return truth(scalar(args[0]))?scalar(args[1]):scalar(args[2])}
          if(name==='ROUND'){if(args.length<1||args.length>2)fail('#ERROR!','ROUND takes one or two arguments');const digits=args.length===2?num(scalar(args[1])):0;if(!Number.isInteger(digits)||Math.abs(digits)>12)fail('#NUM!','ROUND digits out of range');const factor=10**digits;return Math.round(num(scalar(args[0]))*factor)/factor}
          const values=args.flatMap(v=>Array.isArray(v)?v:[v])
          if(name==='COUNT')return values.filter(v=>v!==''&&v!==null&&v!==undefined&&Number.isFinite(Number(v))).length
          const ns=values.map(num)
          if(name==='SUM')return ns.reduce((a,b)=>a+b,0)
          if(!ns.length)return 0
          return name==='MIN'?Math.min(...ns):Math.max(...ns)
        }
        if(token.toUpperCase()==='TRUE')return true
        if(token.toUpperCase()==='FALSE')return false
        const start=reference(token)
        if(!start)fail('#NAME?',`Unknown name ${token}`)
        if(peek()!==':')return get(start.r,start.c)
        pos++;const endToken=peek();pos++
        const end=reference(endToken)
        if(!end)fail('#REF!','Invalid range endpoint')
        if(end.r<start.r||end.c<start.c)fail('#REF!','Reversed range')
        if((end.r-start.r+1)*(end.c-start.c+1)>100000)fail('#NUM!','Range too large')
        const values=[]
        for(let r=start.r;r<=end.r;r++)for(let c=start.c;c<=end.c;c++)values.push(get(r,c))
        return values
      }
      fail('#ERROR!',`Unexpected token ${token}`)
    }
    const answer=expression()
    if(peek()!=='EOF')fail('#ERROR!','Unexpected trailing tokens')
    if(typeof answer==='number'&&!Number.isFinite(answer))fail('#NUM!','Non-finite result')
    return scalar(answer)
  }
  const cells=rows.map((row,r)=>columns.map((column,c)=>{
    const original=Array.isArray(row.cells)?row.cells[c]:row.cells?.[column.id]
    try{return {rowId:row.id,columnId:column.id,raw:raw(original),value:get(r,c),error:null}}
    catch(error){return {rowId:row.id,columnId:column.id,raw:raw(original),value:null,error:error.code||'#ERROR!'}}
  }))
  return {columns,rows:cells,getCell:(r,c)=>cells[r]?.[c]??null}
}
