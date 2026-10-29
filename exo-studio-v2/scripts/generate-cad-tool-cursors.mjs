// Original EXO CAD cursor artwork. Regenerate with:
// node scripts/generate-cad-tool-cursors.mjs
// Every cursor is 32×32 with a precise click point at (5,3). The small
// crosshair stays clear of the illustration and retains a visible pointer.
import {mkdirSync,writeFileSync} from 'node:fs'
import path from 'node:path'

const assets={
  'polygon': '<path d="m10 18 5-9 11 4 1 11-12 3-5-9" /><circle cx="15" cy="9" r="1.7"/><circle cx="26" cy="13" r="1.7"/><circle cx="27" cy="24" r="1.7"/>',
  'pen': '<path d="m11 26 2.4-8.3L24 7l3 3-10.5 10.6Z"/><path d="m13.4 17.7 3.2 2.9M22 9l3 3"/><circle cx="14" cy="24" r="1.6"/>',
  'curve': '<path d="M10 25C17 27 13 8 26 10" fill="none"/><circle cx="10" cy="25" r="2.1"/><circle cx="26" cy="10" r="2.1"/><path d="m9 18 12-8" stroke-dasharray="2 2"/>',
  'points': '<path d="m10 26 5-15 11 3-3 12-13 0"/><circle cx="10" cy="26" r="2.1"/><circle cx="15" cy="11" r="2.1"/><circle cx="26" cy="14" r="2.1"/><circle cx="23" cy="26" r="2.1"/>',
  'split': '<path d="m10 25 12-16M14 10l12 14"/><circle cx="12" cy="8.5" r="3" fill="#384752"/><circle cx="11" cy="26" r="3" fill="#384752"/><path d="M15 19h14M22 12v14" stroke-dasharray="2 2"/>',
  'notch': '<path d="M10 10h8l3 7 3-7h4v17H10Z"/><path d="m18 10 3 7 3-7"/><circle cx="21" cy="17" r="1.2"/>',
  'allowance': '<path d="m11 25 3-16 11 2 2 14Z"/><path d="m8 28 3-22 17 3 2 19" fill="none" stroke-dasharray="3 2"/>',
  'pin': '<circle cx="19" cy="12" r="5" /><path d="M19 17v12l-2-4 2 4 2-4"/><path d="M16 12h6"/>',
  'measure': '<path d="m10 24 14-15 6 6-14 15-6-6"/><path d="m20 13 3 3m-7 1 4 4m-8 0 3 3"/>',
  'move': '<path d="M19 8v21M9 19h20M19 8l-4 5m4-5 4 5M19 29l-4-5m4 5 4-5M9 19l5-4m-5 4 5 4m15-4-5-4m5 4-5 4"/><circle cx="19" cy="19" r="2.5"/>',
  'rotate': '<path d="M27 15A9 9 0 1 0 23 27" fill="none"/><path d="m25 9 3 7-8-2"/><circle cx="19" cy="19" r="2"/>',
  'brush': '<path d="M23 8 13 19m10-11 4 4-10 10-4-3 10-11"/><path d="M13 19c-5-1-6 4-5 7 2-2 6 1 9-4"/><circle cx="25" cy="25" r="1.1"/>',
  'graphics': '<rect x="10" y="9" width="19" height="18" rx="1.5"/><circle cx="16" cy="15" r="2"/><path d="m11 24 6-6 4 3 3-4 4 7"/>',
  'grading': '<path d="m11 9 4-3 4 4 4-4 5 3v18H11Z"/><path d="m8 12-2 2v16h19" fill="none" stroke-dasharray="3 2"/><path d="M16 17h8m-4-4v8"/>',
  'fill': '<path d="m15 8 12 12-8 8L8 16l7-8Z"/><path d="M8 16h19M24 28c0-3 4-6 4-6s4 3 4 6a4 4 0 0 1-8 0Z"/>',
  'trace': '<path d="m11 25 3-17 12 3-1 14Z" stroke-dasharray="3 2"/><path d="m17 12 6 9-10 3" fill="none"/>',
  'annotation': '<rect x="9" y="8" width="19" height="21" rx="2"/><path d="M13 14h11m-11 5h9m-9 5h7"/>',
  'steam': '<path d="M13 28V17c-5-5 5-6 0-12m7 23V17c-5-5 5-6 0-12m7 23V17c-5-5 5-6 0-12" fill="none"/>',
  'tape': '<circle cx="17" cy="16" r="8"/><circle cx="17" cy="16" r="3"/><path d="m21 22 8 6-2 3-8-8"/>',
}
const dir=path.resolve('public/cursors')
mkdirSync(dir,{recursive:true})
const prefix='<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">'
const hotspot='<path d="M5 3v10M1 8l4-5 4 5" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 3v10M1 8l4-5 4 5" fill="none" stroke="#16719f" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"/>'
for(const [name,art] of Object.entries(assets)){
  const shadow='<g transform="translate(.45 .55)" stroke="white" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" fill="#34414c">'+art+'</g>'
  const foreground='<g stroke="#d7f2fb" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" fill="#3c505e">'+art+'</g>'
  writeFileSync(path.join(dir,`cad-${name}.svg`),prefix+shadow+foreground+hotspot+'</svg>\n')
}
console.log(`Generated ${Object.keys(assets).length} original EXO cursor SVGs in ${dir}`)
