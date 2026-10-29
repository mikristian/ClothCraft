// Build optimized local preview images from the same licensed photographic
// reference set and hardware thumbnails already present in the EXO app.
// Each fabric family shares its source scan across finish variants.
import {readFileSync,writeFileSync,mkdirSync,existsSync,readdirSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {POLYHAVEN_ARCHETYPE_SCAN_IDS,AMBIENTCG_ARCHETYPE_SCAN_OVERRIDES} from '../../../src/data/polyhavenFabricAssignments.js';

const site=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const repository=resolve(site,'../..');
const out=join(site,'market-media');
mkdirSync(out,{recursive:true});
// The dedicated fabric-ball and approved-stage renderers contribute their
// own keys to this manifest. Rebuilding texture/hardware crops must preserve
// those derived visual assets and their already-verified source associations.
const manifestPath=join(site,'market-media.json');
const previous=existsSync(manifestPath)?JSON.parse(readFileSync(manifestPath,'utf8')):{};
const manifest={...previous,fabrics:{},hardware:[]};
if(existsSync(join(out,'nike-saved-native-render.webp')))
 manifest.nativeGarmentPreview='./market-media/nike-saved-native-render.webp';
const tasks=[];
for(const [familyId,scan] of Object.entries(POLYHAVEN_ARCHETYPE_SCAN_IDS)){
 const ambient=AMBIENTCG_ARCHETYPE_SCAN_OVERRIDES[familyId];
 const candidates=[ambient&&join(repository,'public/fabric-scans-ambientcg',ambient,'color.jpg'),scan&&join(repository,'public/fabric-scans',scan,'color.jpg')].filter(Boolean);
 const input=candidates.find(existsSync);
 if(!input)continue;
 const target=`market-media/fabric-${familyId}.webp`;
 manifest.fabrics[familyId]=`./${target}`;
 tasks.push({source:input,destination:join(site,target)});
}
const hardwareDir=join(repository,'public/hardware-thumbnails');
for(const file of readdirSync(hardwareDir).filter(name=>name.endsWith('.png'))){
 const id=file.slice(0,-4);
 const target=`market-media/hardware-${id}.webp`;
 tasks.push({source:join(hardwareDir,file),destination:join(site,target)});
 manifest.hardware.push({id,title:id.split('-').map(token=>token.charAt(0).toUpperCase()+token.slice(1)).join(' '),image:`./${target}`});
}
const examples=[
 ['avatar-fit','screenshots/exo-2026-current-pattern-and-3d-grid.png'],
];
for(const [id,path] of examples){const source=join(repository,path);if(!existsSync(source))continue;
 const target=`market-media/${id}.webp`; tasks.push({source,destination:join(site,target)});
 manifest[id.replaceAll('-','_')]=`./${target}`;
}
const python=`import sys,json,os\nfrom PIL import Image,ImageOps\nfor item in json.load(sys.stdin):\n try:\n  with Image.open(item['source']) as im:\n   im=ImageOps.exif_transpose(im).convert('RGB')\n   im.thumbnail((1000,1000),Image.Resampling.LANCZOS)\n   im.save(item['destination'],'WEBP',quality=86,method=5)\n except Exception as exc:\n  print(str(exc),file=sys.stderr)\n  sys.exit(1)\n`;
const run=spawnSync('python3',['-c',python],{input:JSON.stringify(tasks),encoding:'utf8'});
if(run.status!==0)throw Error(run.stderr||run.error?.message||'Image conversion failed');
writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
console.log(`Generated ${tasks.length} real image thumbnails: ${Object.keys(manifest.fabrics).length} fabric archetypes, ${manifest.hardware.length} hardware designs`);
