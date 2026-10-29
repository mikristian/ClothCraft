// Parser for explicitly declared roll inventory. Optional defect segments are
// given as physical roll offsets in cm, e.g. 110-120|390-406. The parser
// never invents a certified shade, dye-lot or physically measured defect.
export function parseAccuMarkCutRoomRolls20261029(text,{fabricId,nap,widthCm}={}){
  if(typeof text!=='string'||!text.trim())throw Error('Declare one or more fabric rolls')
  const lines=text.trim().split(/\r?\n/).filter(line=>line.trim())
  if(lines.length>1000)throw Error('Maximum 1000 fabric rolls')
  const parseNumber=(s,label)=>{
    if(!s||!s.trim()||!Number.isFinite(Number(s)))throw Error(label+' must be a finite number')
    return Number(s)
  }
  return lines.map((line,i)=>{
    const values=line.split(',').map(x=>x.trim()),label='Roll line '+(i+1)
    if(values.length<5||values.length>8)
      throw Error(label+' needs 5–8 columns: ID,batch,shade,length cm,cost/m[,dye lot,max ply,defect ranges]')
    const [rollId,batchId,shade,stock,cost,dyeLot,maxPly,defects]=values
    if(!rollId||!batchId||!shade)throw Error(label+' needs roll ID, batch and shade')
    const roll={rollId,batchId,shade,usableLengthCm:parseNumber(stock,label+' length'),
      costPerMeter:parseNumber(cost,label+' cost'),fabricId,nap,widthCm}
    if(dyeLot)roll.dyeLotId=dyeLot
    if(maxPly)roll.maxPlyCount=parseNumber(maxPly,label+' maximum ply count')
    if(defects){
      roll.defectRangesCm=defects.split('|').map(pair=>{
        // Explicit delimiter prevents a negative number from being mistaken
        // for a range endpoint; any invalid value remains a hard parse error.
        const match=/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/.exec(pair.trim())
        if(!match)throw Error(label+' defect range must be start-end in cm')
        return {startCm:Number(match[1]),endCm:Number(match[2])}
      })
    }
    return roll
  })
}
