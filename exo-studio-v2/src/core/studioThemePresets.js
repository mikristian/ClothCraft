// Curated, readable interface themes. Scene lighting and garment materials are
// intentionally independent of these UI colors.
import { STUDIO_PALETTE_LIBRARY } from './studioPaletteLibrary.js'
const seeds = [
  // Factory Graphite uses the original neutral CLO-like grey chrome, without
  // the lavender tint that inadvertently became its default accent.
  ['graphite','Graphite','Neutrals','#c9cbcf','#262729'],['obsidian','Obsidian','Neutrals','#c5d1dd','#17191e'],
  ['slate','Slate','Neutrals','#a9c3db','#27313a'],['espresso','Espresso','Neutrals','#ecc69d','#30251f'],
  ['midnight','Midnight','Blue','#69bfea','#192333'],['ocean','Deep Ocean','Blue','#91d8e9','#142d38'],
  ['sapphire','Sapphire','Blue','#a3bbff','#1b2854'],['denim','Indigo Denim','Blue','#a9c8f5','#26384d'],
  ['cobalt','Cobalt','Blue','#abc5fc','#222e65'],['azure','Azure','Blue','#8bd8ee','#123b56'],
  ['lilac','Lilac','Purple','#d8b7f7','#32263f'],['orchid','Orchid','Purple','#e1b5ed','#402a42'],
  ['amethyst','Amethyst','Purple','#cab0ff','#30284f'],['aubergine','Aubergine','Purple','#f0acd7','#38243a'],
  ['plum','Plum Velvet','Purple','#e2b5d7','#422b42'],['violet','Violet','Purple','#bcb0ff','#30295b'],
  ['forest','Forest','Nature','#9fd5b4','#23372e'],['sage','Sage','Nature','#bfd9bd','#33453a'],
  ['moss','Moss','Nature','#b4d69e','#37402a'],['emerald','Emerald','Nature','#88e0bd','#163b32'],
  ['olive','Olive','Nature','#dfdb91','#40402a'],['jade','Jade','Nature','#a9e2d1','#1c3a37'],
  ['clay','Clay','Earth','#e9b3a3','#42312c'],['terra','Terracotta','Earth','#e7ae91','#422d26'],
  ['sandstone','Sandstone','Earth','#e8d2ae','#40362b'],['bronze','Bronze','Earth','#ecc48b','#433428'],
  ['rose','Rose','Pink','#f2b8cc','#482e3b'],['blush','Blush','Pink','#f2c5dc','#48333f'],
  ['raspberry','Raspberry','Pink','#f29ec7','#492439'],['magenta','Magenta','Pink','#f5aedf','#432449'],
  ['coral','Coral','Warm','#ffa995','#492b2c'],['amber','Amber','Warm','#f3cc91','#453323'],
  ['copper','Copper','Warm','#eeb88e','#493126'],['vermillion','Vermilion','Warm','#f4ada3','#4d2a29'],
  ['pearl','Pearl Graphite','Neutrals','#d5d9e3','#303238'],['smoke','Blue Smoke','Neutrals','#b9cad8','#253039'],
  ['ink','Ink Blue','Blue','#9ec9eb','#192b42'],['lagoon','Lagoon','Blue','#8ddcda','#163a40'],
  ['wisteria','Wisteria','Purple','#dec5f5','#3b3048'],['mulberry','Mulberry','Purple','#e9b4d8','#41283d'],
  ['pine','Pine','Nature','#a0d6be','#213d36'],['eucalyptus','Eucalyptus','Nature','#b5d9c9','#304039'],
  ['ochre','Golden Ochre','Earth','#efd29e','#423729'],['cacao','Cacao','Earth','#e0bea7','#392b29'],
  ['dusty-rose','Dusty Rose','Pink','#efb8cb','#44303c'],['hibiscus','Hibiscus','Pink','#ffb3d5','#4d293c'],
  ['papaya','Papaya','Warm','#ffc3a1','#493229'],['garnet','Garnet','Warm','#f2b0bd','#442931'],
]
const modes = [
  ['studio','Studio',0],['night','Night',-13],
]
const clamp = value => Math.max(0,Math.min(255,Math.round(value)))
const rgb = color => [1,3,5].map(index=>parseInt(color.slice(index,index+2),16))
const hex = parts => '#'+parts.map(value=>clamp(value).toString(16).padStart(2,'0')).join('')
const shade = (color,amount) => hex(rgb(color).map(value=>value+amount))
const mix = (a,b,alpha) => hex(rgb(a).map((v,i)=>v*(1-alpha)+rgb(b)[i]*alpha))
const channel = v=>{const s=v/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4}
const luminance = color=>rgb(color).map(channel).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0)
export const colorContrast = (a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
function safeAccent(color,surface) {
  let result=color
  const target=luminance(surface)>.179?'#121512':'#ffffff'
  for(let i=0;i<60&&colorContrast(result,surface)<4.5;i++) result=mix(result,target,.12)
  return result
}
const legacyPresets = seeds.flatMap(([id,name,category,accent,base])=>modes.map(([variant,variantName,delta])=>{
  const originalGrey=id==='graphite'&&variant==='studio'
  const panel=originalGrey?'#262729':shade(base,delta+8)
  const sidebar=originalGrey?'#262729':shade(base,delta-5)
  return Object.freeze({
    id:variant==='studio'?id:`${id}-${variant}`,
    name:`${name} ${variantName}`,category,
    accent:safeAccent(accent,panel),panelColor:panel,sidebarColor:sidebar,
    textColor:originalGrey?'#e9eaec':'#f2f5f8',mutedColor:originalGrey?'#bfc1c5':'#c4cbd3',
    borderColor:originalGrey?'#47494d':mix(panel,'#ffffff',.23),
  })
}))

// Direct ramp specs provide true light chrome. Avoid dark-seed shade offsets,
// which would turn cream and white themes into low-contrast grey panels.
const lightSpecs = [
  ['bone-light','Bone','bone'],['sand-taupe-light','Sand Taupe','sandTaupe'],
  ['stone-sage-light','Stone Sage','stoneSage'],['resin-light','Resin','resin'],
  ['onyx-light','Onyx','onyx'],['oil-light','Oil','oil'],
  ['ash-light','Ash','ash'],['granite-light','Granite','granite'],
  ['chalk-light','Chalk White','chalk'],['cloud-light','Cloud White','cloud'],
  ['cream-light','Soft Cream','cream'],['limestone-light','Limestone','limestone'],
  ['dune-light','Dune','dune'],['mist-light','Morning Mist','mist'],
  ['pearl-light','Pearl','pearl'],['fog-light','Fog','fog'],
  ['eucalyptus-light','Pale Eucalyptus','eucalyptus'],
  ['mushroom-light','Mushroom','mushroom'],
  ['mineral-light','Pale Mineral','mineral'],['alabaster-light','Alabaster','alabaster'],
  ['desert-light','Desert Linen','desert'],['cinder-light','Cinder White','cinder'],
  ['basalt-light','Pale Basalt','basalt'],['olive-drab-light','Olive Linen','oliveDrab'],
]
const deepSpecs = [
  ['bone-earth','Bone Earth','bone'],['sand-taupe-earth','Sand Taupe Earth','sandTaupe'],
  ['stone-sage-earth','Stone Sage Earth','stoneSage'],
  ['resin-earth','Resin Earth','resin'],['onyx-earth','Onyx Earth','onyx'],
  ['oil-earth','Oil Earth','oil'],['ash-earth','Ash Earth','ash'],
  ['granite-earth','Granite Earth','granite'],['desert-earth','Desert Earth','desert'],
  ['cinder-earth','Cinder Earth','cinder'],['basalt-earth','Basalt Earth','basalt'],
  ['olive-drab-earth','Olive Drab Earth','oliveDrab'],
]
// Designer-facing light palettes with their own panel/rail colors. Unlike a
// "dark theme + brightness" overlay these keep every surface genuinely light.
// Accent colors are darkened as needed to preserve WCAG AA text contrast.
const expandedLightSpecs = [
 ['pure-white-light','Pure White','White & Paper','#ffffff','#f4f5f7','#345a78'],
 ['soft-white-light','Soft White','White & Paper','#fafafa','#f0f0f1','#515861'],
 ['gallery-white-light','Gallery White','White & Paper','#fffefd','#f3f1ed','#70604e'],
 ['porcelain-light','Porcelain','White & Paper','#fbfaf8','#efeeeb','#5b6470'],
 ['cotton-light','Cotton','White & Paper','#fffefa','#f5f2e9','#78674e'],
 ['milk-glass-light','Milk Glass','White & Paper','#fcffff','#e9f3f5','#426c79'],
 ['paper-light','Paper','White & Paper','#f9f9f6','#eceee8','#5c6958'],
 ['canvas-light','Canvas','White & Paper','#faf8f1','#eee9dc','#806744'],
 ['vanilla-light','Vanilla Cream','Cream & Linen','#fff9eb','#f3e9d4','#7a633e'],
 ['buttercream-light','Buttercream','Cream & Linen','#fff9e8','#efe7d0','#77653f'],
 ['cashmere-light','Cashmere','Cream & Linen','#f9f5ed','#ece4d7','#786956'],
 ['champagne-light','Champagne','Cream & Linen','#fff9ef','#f0e6d6','#886648'],
 ['oat-milk-light','Oat Milk','Cream & Linen','#faf5e9','#eee7d9','#77694a'],
 ['linen-light','Natural Linen','Cream & Linen','#f7f4ec','#eae6da','#756b55'],
 ['almond-light','Almond','Cream & Linen','#fbf4e8','#efe4d4','#83674f'],
 ['warm-ivory-light','Warm Ivory','Cream & Linen','#fffdf4','#f1eddf','#726746'],
 ['frost-gray-light','Frost Gray','Gray & Silver','#f5f7f9','#e7ebef','#465a6c'],
 ['silver-gray-light','Silver Gray','Gray & Silver','#f1f2f4','#e1e3e7','#4f5a6a'],
 ['light-ash-gray','Light Ash','Gray & Silver','#f3f3f1','#e4e4e2','#565d60'],
 ['warm-gray-light','Warm Gray','Gray & Silver','#f4f1ed','#e8e2dc','#675c55'],
 ['cool-gray-light','Cool Gray','Gray & Silver','#f1f4f6','#e0e6ea','#4c6271'],
 ['mist-gray-light','Mist Gray','Gray & Silver','#f8f9fa','#e8ecf1','#526176'],
 ['pebble-gray-light','Pebble','Gray & Silver','#eeefed','#e0e1dd','#59635b'],
 ['silver-linen-light','Silver Linen','Gray & Silver','#f5f5f1','#e7e8e4','#60665b'],
 ['ice-blue-light','Ice Blue','Soft Color','#f1f8fd','#e3eef7','#356782'],
 ['pale-sky-light','Pale Sky','Soft Color','#f6fafd','#e5f1f9','#386c8d'],
 ['sea-glass-light','Sea Glass','Soft Color','#f3faf8','#e2f1ec','#387263'],
 ['mint-white-light','Mint White','Soft Color','#f6fcf8','#e7f2e9','#436d58'],
 ['pistachio-cream-light','Pistachio Cream','Soft Color','#f8faee','#eaf0df','#667641'],
 ['pale-lavender-light','Lavender Milk','Soft Color','#fbf8fd','#f0eaf6','#725c85'],
 ['lilac-fog-light','Lilac Fog','Soft Color','#f8f6fc','#eae7f3','#6c6285'],
 ['powder-rose-light','Powder Rose','Soft Color','#fff9fa','#f4e8ec','#8b576a'],
 ['ballet-pink-light','Ballet Pink','Soft Color','#fff2f8','#f9e3ef','#935270'],
 ['petal-pink-light','Petal Pink','Soft Color','#fff7fb','#f5e4ee','#a45d7d'],
 ['blush-cream-light','Blush Cream','Soft Color','#fff8f4','#f4e9e3','#915b52'],
 ['pale-peach-light','Pale Peach','Soft Color','#fffaf5','#f5e9df','#976b47'],
 ['lemon-paper-light','Lemon Paper','Soft Color','#fffef5','#f5f1dd','#7b702f'],
 ['blueprint-white-light','Blueprint White','Soft Color','#f7fbff','#e8f0f8','#3b6284'],
]
const expandedLightPresets=expandedLightSpecs.map(([id,name,category,panelColor,sidebarColor,accent])=>Object.freeze({
 id,name,category,mode:'light',panelColor,sidebarColor,
 textColor:'#202a34',mutedColor:safeAccent('#566371',panelColor),
 accent:safeAccent(accent,panelColor),borderColor:mix(sidebarColor,'#232a31',.20),
}))
function rampPreset([id,name,key],light) {
  const ramp=STUDIO_PALETTE_LIBRARY[key]
  const panelColor=light?ramp[0]:ramp[900]
  const sidebarColor=light?ramp[100]:ramp[800]
  const textColor=light?ramp[900]:'#f7f8f5'
  const mutedColor=light?safeAccent(ramp[700],panelColor):safeAccent(ramp[300],panelColor)
  const accent=safeAccent(light?ramp[700]:ramp[300],panelColor)
  return Object.freeze({
    id,name:light?`${name} Light`:name,category:light?'Light & Cream':'Earth',
    mode:light?'light':'dark',accent,panelColor,sidebarColor,textColor,mutedColor,
    borderColor:light?ramp[200]:ramp[700],
  })
}
export const STUDIO_THEME_PRESETS = Object.freeze([
  ...legacyPresets,...lightSpecs.map(spec=>rampPreset(spec,true)),
  ...expandedLightPresets,
  ...deepSpecs.map(spec=>rampPreset(spec,false)),
])
export const STUDIO_THEME_IDS = new Set(STUDIO_THEME_PRESETS.map(p=>p.id))
export const getStudioTheme = id=>STUDIO_THEME_PRESETS.find(theme=>theme.id===id)||STUDIO_THEME_PRESETS[0]
export const STUDIO_PANEL_FINISHES = Object.freeze([
  {id:'balanced',label:'Balanced',description:'Coordinated sidebar and Property Editor'},
  {id:'deep',label:'Deep',description:'Extra separation for object and tool panels'},
  {id:'unified',label:'Unified',description:'A single color across the interface'},
  {id:'tinted',label:'Tinted',description:'Soft accent tint for side panels'},
])
export const studioResolvedPalette = (theme,finish='balanced')=>{
  const p=typeof theme==='string'?getStudioTheme(theme):theme
  const isLight=p.mode==='light'
  const sidebar=finish==='unified'?p.panelColor:finish==='deep'?shade(p.sidebarColor,isLight?-14:-12):finish==='tinted'?mix(p.sidebarColor,p.accent,isLight?.06:.12):p.sidebarColor
  const panel=finish==='deep'?shade(p.panelColor,isLight?-6:-4):p.panelColor
  const borderColor=p.id==='graphite'&&finish==='balanced'?p.borderColor:mix(panel,isLight?'#131715':'#ffffff',isLight?.19:.24)
  const onBothSurfaces=color=>{
    let result=color
    const target=isLight?'#111411':'#ffffff'
    for(let i=0;i<60&&(colorContrast(result,panel)<4.5||colorContrast(result,sidebar)<4.5);i++)result=mix(result,target,.12)
    return result
  }
  return {...p,sidebarColor:sidebar,panelColor:panel,borderColor,
    textColor:p.mode?onBothSurfaces(p.textColor):safeAccent(p.textColor,panel),
    mutedColor:p.mode?onBothSurfaces(p.mutedColor):safeAccent(p.mutedColor,panel),
    accent:p.mode?onBothSurfaces(p.accent):safeAccent(p.accent,panel)}
}
