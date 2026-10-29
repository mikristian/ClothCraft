import {compileAccuMarkNativeRuleSizeRun} from './accumarkNativePointRuleSet20261023.js'

const SIZES=['XS','S','M','L','XL','XXL']
const finite=n=>typeof n==='number'&&Number.isFinite(n)
const fail=(reason,issues=[])=>({ok:false,reason,issues,nativeActivationReady:false,
  manufacturingApproved:false})

/**
 * A source GarmentTemplate stays subject to its authored width/height. Native
 * grade-only fitting may expand a *temporary* compile envelope to the positive
 * extent of checked graded points without editing stored source or size rules.
 * Negative/nonfinite/over-10m coordinates remain forbidden. This is fitting
 * preview readiness, never CUT, POM tolerance or factory sign-off.
 *
 * Older JS-only drafting fixtures may omit the native envelope; those cannot
 * establish activation readiness and are reported as unverified, not passed.
 */
export function inspectNativeGradeActivationEnvelope20261025(snapshot,ruleSet,{allowNamedSizes=false}={}){
  try{
    if(!allowNamedSizes&&JSON.stringify(ruleSet?.sizes)!==JSON.stringify(SIZES))
      return fail('Six ordered XS–XXL grades are required')
    const sizes=allowNamedSizes?ruleSet?.sizes:SIZES
    if(allowNamedSizes&&(!Array.isArray(sizes)||sizes.length<2||sizes.length>24||
      new Set(sizes).size!==sizes.length||sizes.some(s=>typeof s!=='string'||!/^[A-Za-z0-9-]{1,24}$/.test(s))))
      return fail('Native envelope requires 2–24 safe canonical named sizes')
    const compiled=compileAccuMarkNativeRuleSizeRun(snapshot,ruleSet,{selectedSize:ruleSet.baseSize})
    if(!compiled.ok)return fail(compiled.reason||'Unable to compile graded polygon geometry')
    const issues=[],unverified=[],panelRequirements=[]
    for(const panel of snapshot.template.panels){
      const bounds=panel?.pattern
      if(!bounds||!finite(bounds.width)||!finite(bounds.height)){
        unverified.push(panel.id)
        continue
      }
      if(bounds.width<=0||bounds.height<=0||bounds.width>10||bounds.height>10)
        return fail('Invalid native authored pattern envelope for '+panel.id)
      const required={panelId:panel.id,minX:Infinity,minY:Infinity,maxX:-Infinity,maxY:-Infinity}
      for(const size of sizes){
        const points=compiled.byPanel?.[panel.id]?.sizeRun?.[size]?.polygon?.points
        if(!Array.isArray(points)||!points.length)return fail('Missing graded geometry for '+panel.id+'/'+size)
        for(let index=0;index<points.length;index++){
          const p=points[index]
          if(!Array.isArray(p)||p.length!==2||!p.every(finite))
            return fail('Invalid graded point for '+panel.id+'/'+size)
          required.minX=Math.min(required.minX,p[0])
          required.minY=Math.min(required.minY,p[1])
          required.maxX=Math.max(required.maxX,p[0])
          required.maxY=Math.max(required.maxY,p[1])
          if(p[0]<0||p[1]<0||p[0]>10||p[1]>10){
            issues.push({code:'GRADE_UNSUPPORTED_NATIVE_POINT',panelId:panel.id,size,
              pointIndex:index,pointMetres:[...p],
              declaredBoundsMetres:[bounds.width,bounds.height],
              message:`${panel.id}/${size} P${index+1} is outside the safe nonnegative 10 m native grade-only compile limit`})
          }
        }
      }
      // Rust rejects every negative vertex, even sub-micrometre negatives.
      // Its 1e-9 tolerance only applies to positive width/height overflow.
      const needsTranslation=required.minX < 0||required.minY < 0
      const expansionRequired=required.maxX>bounds.width+1e-9||required.maxY>bounds.height+1e-9
      panelRequirements.push({panelId:panel.id,
        declaredBoundsMm:[bounds.width*1000,bounds.height*1000],
        minimumSourceBoundsMm:[Math.max(0,required.maxX)*1000,Math.max(0,required.maxY)*1000],
        temporaryCompileBoundsMm:[Math.max(bounds.width,required.maxX)*1000,Math.max(bounds.height,required.maxY)*1000],
        minimumGradedPointMm:[required.minX*1000,required.minY*1000],
        requiresSourceRepositioning:needsTranslation,
        canExpandSourceEnvelope:!needsTranslation&&expansionRequired,
        requiresTemporaryExpansion:!needsTranslation&&expansionRequired})
    }
    if(issues.length)return {...fail('Some graded panels exceed the authored native pattern envelope',issues),
      panelRequirements}
    if(unverified.length)return fail('Native pattern envelope unavailable for '+unverified.join(', '),
      unverified.map(panelId=>({code:'GRADE_NATIVE_ENVELOPE_UNVERIFIED',panelId})))
    return {ok:true,nativeActivationReady:true,issues:[],panelRequirements,
      temporaryEnvelopeOnly:panelRequirements.some(row=>row.requiresTemporaryExpansion),
      checkedPanels:snapshot.template.panels.length,
      checkedSizes:sizes.length,manufacturingApproved:false}
  }catch(error){return fail(String(error?.message||error))}
}
