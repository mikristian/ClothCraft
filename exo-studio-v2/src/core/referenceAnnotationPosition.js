// Reference-image callouts use normalized image coordinates, never material-space
// pattern coordinates. Missing or off-image locations must not be rendered as
// factory placement evidence; callers can still show their textual notes.
export function referenceAnnotationPercentPosition(entry) {
  const coordinate=value=>{
    if(typeof value!=='number' && (typeof value!=='string'||!value.trim()))return null
    // Number() also accepts hexadecimal, binary and octal strings, which are
    // not authored normalized image coordinates and can create false pins.
    if(typeof value==='string'&&!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value.trim()))return null
    const number=Number(value)
    if(typeof value==='string'&&(number===0||number===1)){
      // Do not silently move a tiny nonzero pin to 0 or a near-one pin to 1
      // when binary64 rounding loses the authored decimal position.
      const [mantissa,exponentText='0']=value.trim().replace(/^[+-]/,'').split(/[eE]/)
      const [integer,fraction='']=mantissa.split('.')
      const digits=integer+fraction
      const firstNonzero=digits.search(/[1-9]/)
      if(number===0&&firstNonzero!==-1)return null
      if(number===1){
        const significant=digits.slice(firstNonzero)
        const exponent=Number(exponentText)
        if(firstNonzero===-1||significant[0]!=='1'||/[1-9]/.test(significant.slice(1))||
          integer.length-firstNonzero-1+exponent!==0)return null
      }
    }
    return Number.isFinite(number)&&number>=0&&number<=1?number:null
  }
  // Imported callouts must carry their own stored coordinates. Property reads
  // can resolve inherited values or invoke accessors, creating misleading pins
  // (or throwing) while a factory reference sheet is rendered.
  const ownCoordinate=key=>{
    if(entry===null||(typeof entry!=='object'&&typeof entry!=='function'))return null
    const descriptor=Object.getOwnPropertyDescriptor(entry,key)
    return descriptor&&Object.hasOwn(descriptor,'value')?coordinate(descriptor.value):null
  }
  const x=ownCoordinate('x'),y=ownCoordinate('y')
  return x===null||y===null?null:{left:x*100,top:y*100}
}
