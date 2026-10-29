// Reference defaults are saved preferences, not a proprietary CLO integration.
export const DEFAULT_CLO_SETTINGS = Object.freeze({
useVbos:true,antiAliasing:'x16',normalBlending:'Alpha Blending',viewPreset:'Magic Mouse',
panMod1:'Alt',panMod2:'None',panButton:'Left Mouse Button + Alt',
zoomMod1:'None',zoomMod2:'None',zoomButton:'Middle Mouse Button',zoomIncrement:1,zoomDirection:'Backward',
rotateMod1:'None',rotateMod2:'None',rotateButton:'Right Mouse Button',
popupMod1:'None',popupMod2:'None',popupButton:'Right Mouse Button',axisConstraint:'Shift',smartPanning:true,
unitSystem:'Centimeter',useLigne:false,threadUnit:'Tex',currency:'USD',
defaultMode:'Simulation',toolbar3d:'Left',toolbar2d:'Right',toolbarRender:'Right',
groupTools:true,showTooltipLinks:true,showColorwayOnStartup:false,fontFamily:'Tahoma',fileDialogType:'System',
meshType:'Triangle',arrangementShape:'Curved',arrangementPointSize:18,syncFoldAngle:true,gizmoMode:'Unified Gizmo',
particleDistance:20,copiedPatternIndex:'Index Number (1, 2, 3 …)',autoOffsetCut:true,notchDisplay:'Length Fixed to Screen',
maintainBlockSelections:true,maintainFabricProperties:false,dmixDownloadPath:'',textureApplication:'',
projectFile:'',saveMultiviewThumbnails:false,avatarAvtp:'',avatarApf:'',fabricPhysicalProperty:'',
textureOpenFrom:'Project (ZPRJ) / Garment (ZPAC) File',refreshTextures:false,textureFolder:'',
aiPdfOpenFrom:'Project (ZPRJ) / Garment (ZPAC) File',saveAiPdfSeparately:false,openTopVersionOnly:false,substanceCompatibility:false
});
export function normalizeCloSettings(input) {
const src=input&&typeof input==='object'&&!Array.isArray(input)?input:{},output={};
for(const [key,fallback] of Object.entries(DEFAULT_CLO_SETTINGS)){
const v=src[key];output[key]=typeof v===typeof fallback?(typeof v==='string'?v.slice(0,512):typeof v==='number'?(Number.isFinite(v)?Math.max(0,Math.min(1000,v)):fallback):v):fallback;
}
for(const [key,val] of Object.entries(src))if(/^shortcut:[a-zA-Z0-9 /().:,-]{1,100}$/.test(key)&&typeof val==='string')output[key]=val.slice(0,40);
return output;
}
