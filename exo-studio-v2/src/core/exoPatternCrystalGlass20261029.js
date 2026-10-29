/** Appearance-only resolver: changing the crystal finish cannot mutate any
 * garment pattern, grade vectors, stitches or native Rust saved geometry. */
export function resolveExoPatternCrystalSurface20261029(appearance={},preferences={},preview=null){
 if(preview?.surface=== 'glass'||preview?.surface==='solid'||preview?.surface==='outline')return preview.surface
 const saved=['solid','glass','outline'].includes(preferences?.twoDPatternSurfaceStyle)
   ?preferences.twoDPatternSurfaceStyle:'solid'
 if(saved==='outline')return 'outline'
 return appearance?.patternClearGlass!==false?'glass':saved
}
