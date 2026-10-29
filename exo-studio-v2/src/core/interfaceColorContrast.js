/** Presentation-only theme contrast. Never applied to garment/fabric colors. */
const RGB=/^#[0-9a-f]{6}$/i
const channels=value=>[1,3,5].map(i=>Number.parseInt(value.slice(i,i+2),16))
const hex=rgb=>'#'+rgb.map(value=>Math.round(Math.max(0,Math.min(255,value))).toString(16).padStart(2,'0')).join('')
const lumChannel=value=>{const c=value/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4}
export const contrastRatio=(a,b)=>{
  if(!RGB.test(a)||!RGB.test(b))return 1
  const luminance=color=>channels(color).map(lumChannel).reduce((total,c,i)=>total+c*[.2126,.7152,.0722][i],0)
  const x=luminance(a),y=luminance(b)
  return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)
}
const mix=(a,b,t)=>hex(channels(a).map((v,i)=>v*(1-t)+channels(b)[i]*t))

/** Brightness may be user-requested, while auto contrast prevents unreadable
 * toolbar text. Resolve each independent surface against its own background. */
export function readableUiInk(foreground,background,{brightness=1,autoContrast=true,minContrast=4.5}={}) {
  const fg=RGB.test(foreground||'')?foreground:'#e9eef6'
  const bg=RGB.test(background||'')?background:'#272c33'
  const intensity=Number.isFinite(brightness)?Math.max(.5,Math.min(1.5,brightness)):1
  let ink=intensity>1?mix(fg,'#ffffff',(intensity-1)*.78):intensity<1?mix(fg,'#000000',(1-intensity)*.78):fg.toLowerCase()
  if(!autoContrast||contrastRatio(ink,bg)>=minContrast)return ink
  const towardLight=contrastRatio('#ffffff',bg)>=contrastRatio('#000000',bg)
  const end=towardLight?'#ffffff':'#000000'
  if(contrastRatio(end,bg)<minContrast)return end
  let lo=0,hi=1
  for(let i=0;i<20;i++){
    const mid=(lo+hi)/2
    if(contrastRatio(mix(ink,end,mid),bg)>=minContrast)hi=mid
    else lo=mid
  }
  return mix(ink,end,hi)
}
