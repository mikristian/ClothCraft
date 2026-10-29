// CAD ruler ticks in real physical units. worldToMetres is .01 for the draft
// editor (centimetres) and 1 for the native ClothCraft material-space board.
const UNIT_METRES={mm:.001,cm:.01,in:.0254}
const finite=x=>typeof x==='number'&&Number.isFinite(x)

export function calculateCadRuler20261023({startWorld,spanWorld,worldUnitsPerPixel,
  worldToMetres=1,units='mm',targetMajorPx=90}={}) {
  const unitMetres=UNIT_METRES[units]
  if (![startWorld,spanWorld,worldUnitsPerPixel,worldToMetres,targetMajorPx].every(finite)||
    !unitMetres||spanWorld<=0||worldUnitsPerPixel<=0||worldToMetres<=0||
    targetMajorPx<30||targetMajorPx>300) return {ok:false,reason:'INVALID_RULER_SCALE',ticks:[]}
  const displayPerWorld=worldToMetres/unitMetres
  const needed=worldUnitsPerPixel*targetMajorPx*displayPerWorld
  const magnitude=10**Math.floor(Math.log10(needed))
  const majorDisplay=[1,2,5,10].map(v=>v*magnitude).find(v=>v>=needed)
  if(!finite(majorDisplay)||majorDisplay<=0) return {ok:false,reason:'INVALID_TICK_STEP',ticks:[]}
  const majorWorld=majorDisplay/displayPerWorld
  const subWorld=majorWorld/5
  // Never create an unbounded number of ticks on pathological zoom input.
  const first=Math.ceil((startWorld/subWorld)-1e-9)
  const last=Math.floor(((startWorld+spanWorld)/subWorld)+1e-9)
  if(!Number.isSafeInteger(first)||!Number.isSafeInteger(last)||last-first>1600)
    return {ok:false,reason:'RULER_TOO_DENSE',ticks:[]}
  const ticks=[]
  for(let i=first;i<=last;i++){
    const atWorld=i*subWorld
    const major=((i%5)+5)%5===0
    const value=atWorld*displayPerWorld
    const decimals=majorDisplay>=1?Math.max(0,-Math.floor(Math.log10(majorDisplay))):Math.min(6,Math.ceil(-Math.log10(majorDisplay)))
    ticks.push({atWorld,positionPx:(atWorld-startWorld)/worldUnitsPerPixel,
      major,label:major?(Math.abs(value)<majorDisplay*1e-9?'0':Number(value.toFixed(decimals)).toString()):null})
  }
  return {ok:true,units,majorDisplay,minorDisplay:majorDisplay/5,ticks}
}
