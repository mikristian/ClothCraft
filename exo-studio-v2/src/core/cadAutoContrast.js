import {contrastRatio,readableUiInk} from './interfaceColorContrast.js'

const valid = color => typeof color === 'string' && /^#[\da-f]{6}$/i.test(color)
const choose = (provided,fallback,bg,min=4.5) => readableUiInk(valid(provided) ? provided : fallback,bg,{autoContrast:true,minContrast:min})
const blend = (from,to,part) => '#'+[1,3,5].map(i=>{
  const a=Number.parseInt(from.slice(i,i+2),16),b=Number.parseInt(to.slice(i,i+2),16)
  return Math.round(a+(b-a)*part).toString(16).padStart(2,'0')
}).join('')

/** Even if the user chooses matching paper/canvas colors, preserve the chosen
 * swatch in settings but separate the visible drafting PAPER from its canvas.
 * A 7:1 outline cannot alone communicate a closed shape whose entire fill
 * vanishes into the canvas. This separation never changes physical fabric. */
export function separateDraftPaper(paper,canvas,min=2) {
  if(!valid(paper)||!valid(canvas))return '#f4f4f3'
  if(contrastRatio(paper,canvas)>=min)return paper
  const target=contrastRatio('#ffffff',canvas)>contrastRatio('#000000',canvas)?'#ffffff':'#000000'
  if(contrastRatio(target,canvas)<min)return target
  let low=0,high=1
  for(let i=0;i<22;i++){
    const middle=(low+high)/2
    if(contrastRatio(blend(paper,target,middle),canvas)>=min)high=middle
    else low=middle
  }
  return blend(paper,target,high)
}

/** Readable drafting ink for native and legacy 2D pattern display ONLY.
 * Pattern geometry, size grading data and garment material values are untouched.
 * The pattern surface and dark/light canvas are separate backgrounds; use a
 * contrasting outline against paper with a secondary halo against the canvas.
 */
export function cadAutoContrastColors({canvas='#c6c7c9',paper='#f4f4f3',grid='auto',edge='auto',point='auto',selection='auto',notch='auto',ruler='auto'}={}) {
  const background=valid(canvas)?canvas:'#c6c7c9'
  const patternPaper=separateDraftPaper(valid(paper)?paper:'#f4f4f3',background)
  // Thin CAD strokes, ruler ticks and nested grading outlines need stronger
  // contrast than ordinary large text, especially on high-DPI dark canvases.
  const gridColor=choose(grid,'#718492',background,4.5)
  const foreground=choose(edge,'#243748',patternPaper,7)
  const halo=choose('#ffffff','#ffffff',background,3)
  const measure=choose('#273e4b','#273e4b',patternPaper,7)
  const backgroundText=choose(ruler,'#34434d',background,7)
  const measurementOutside=choose('#334858','#334858',background,7)
  const dark=contrastRatio('#ffffff',background)>contrastRatio('#000000',background)
  // Grading is a nonphysical visual overlay. Saturated readable hues plus
  // patterned dashes/line widths differentiate XS/S/M/L/XL/XXL without color alone.
  const gradeMain=choose(selection,dark?'#ffcf70':'#a64c0d',background,7)
  const gradeBase=choose(edge,dark?'#b4e7ff':'#1e5a83',background,7)
  const gradeOther=choose('#7497d5',dark?'#91c8f4':'#385a86',background,7)
  const gradeText=choose('#eaeef5','#eaeef5',gradeMain,4.5)
  return {
    background,patternPaper,grid:gridColor,edge:foreground,edgeHalo:halo,point:choose(point,'#e1792d',patternPaper,7),
    selection:choose(selection,'#9f550c',patternPaper,7),notch:choose(notch,'#8f3944',patternPaper,7),
    ruler:backgroundText,measure,measurementOutside,measurementHalo:choose('#ffffff','#ffffff',measure,4.5),
    gradeMain,gradeBase,gradeOther,gradeText,
    gradeHalo:choose('#ffffff','#ffffff',gradeMain,3),
    contrast:{edge:contrastRatio(foreground,patternPaper),ruler:contrastRatio(backgroundText,background),measurementOutside:contrastRatio(measurementOutside,background),
      gradeMain:contrastRatio(gradeMain,background),gradeBase:contrastRatio(gradeBase,background)},
  }
}
