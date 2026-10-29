import {nativeRustEdgeLength20261023} from './nativeRustArcLengthCompat20261023.js'

const fail=reason=>({ok:false,reason,manufacturingApproved:false})
const valid=n=>typeof n==='number'&&Number.isFinite(n)
// Native Rust persists seam_allowances widths and notch depth in metres,
// but the 2D inspector edits millimetres and stations in sewn arclength t.
export function preflightNativeCutMark20261025(snapshot,{panelId,edge,kind='notch',
  t=null,widthMm=null,depthMm=6,spacingMm=6,minSpacingMm=1}={}){
  try{
    const panels=snapshot?.template?.panels
    if(!Array.isArray(panels)||typeof panelId!=='string'||typeof edge!=='string')throw Error('Current native pattern and edge required')
    const candidates=panels.filter(p=>p.id===panelId)
    if(candidates.length!==1||!candidates[0].polygon)throw Error('Pattern no longer exists')
    const polygon=candidates[0].polygon,measured=nativeRustEdgeLength20261023(polygon,edge)
    if(!measured.ok)throw Error(measured.reason||'Physical boundary length could not be measured')
    const total=measured.totalLengthM
    if(!valid(total)||total<.002)throw Error('Physical edge too short')
    if(kind==='allowance'){
      if(!valid(widthMm)||widthMm<0||widthMm>500)throw Error('Seam allowance width must be between 0 and 500 mm')
      return{ok:true,lengthMm:total*1000,manufacturingApproved:false,
        command:{kind:'SeamAllowance',panel:panelId,edge,width_m:widthMm/1000}}
    }
    if(!valid(t)||t<=0||t>=1)throw Error('Choose an interior point on a named cutline')
    const stored=polygon.notches?.[edge]||[]
    if(!Array.isArray(stored)||stored.some(mark=>!valid(mark?.t)||!valid(mark?.depth_m)))
      throw Error('Saved notch positions are malformed')
    if(kind==='remove'){
      const nearest=stored.reduce((best,mark)=>!best||Math.abs(mark.t-t)<Math.abs(best.t-t)?mark:best,null)
      if(!nearest||Math.abs(nearest.t-t)*total>.003)throw Error('Click within 3 mm of an existing notch to delete')
      return{ok:true,lengthMm:total*1000,manufacturingApproved:false,
        command:{kind:'RemoveNotch',panel:panelId,edge,t:nearest.t}}
    }
    if(!valid(depthMm)||depthMm<.5||depthMm>100||!valid(minSpacingMm)||minSpacingMm<.5||minSpacingMm>15)
      throw Error('Notch depth or physical separation is invalid')
    const positions=kind==='pair'
      ?(()=>{
        if(!valid(spacingMm)||spacingMm<1||spacingMm>200)throw Error('Double notch spacing must be 1–200 mm')
        return[t-spacingMm/(2*total*1000),t+spacingMm/(2*total*1000)]
      })()
      :kind==='notch'?[t]:null
    if(!positions)throw Error('Unknown notch operation')
    const safetyMm=Math.max(1,minSpacingMm)
    for(const position of positions){
      if(!valid(position)||position<=0||position>=1||
        Math.min(position,1-position)*total*1000<safetyMm)
        throw Error('Notch would be too close to a physical pattern corner')
      if(stored.some(mark=>Math.abs(mark.t-position)*total*1000<safetyMm))
        throw Error('Notch overlaps an existing physical notch')
    }
    return{ok:true,lengthMm:total*1000,stations:positions,
      manufacturingApproved:false,command:kind==='pair'
        ?{kind:'NotchPair',panel:panelId,edge,center_t:t,spacing_m:spacingMm/1000,depth_m:depthMm/1000}
        :{kind:'Notch',panel:panelId,edge,t,depth_m:depthMm/1000}}
  }catch(error){return fail(error.message||String(error))}
}
