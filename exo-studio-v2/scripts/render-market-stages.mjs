import {chromium} from 'playwright-core';
import {readFileSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const site='concepts/exo-community-ui';
const manifest=JSON.parse(readFileSync(`${site}/market-media.json`,'utf8'));
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1200,height:750},deviceScaleFactor:1});
 page.on('pageerror',error=>console.error('Stage render error',error.message));
 await page.goto('http://127.0.0.1:5188/scripts/marketplace-stage-render.html',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>typeof window.renderEXOStage==='function');
 for(const entry of manifest.appStages){
  // The approved EXO01 Blender studio already has a stronger authored camera
  // poster; preserve that 1120x770 composition over the generic orbit camera.
  if(entry.id==='EXO01')continue;
  const frame=await page.evaluate(id=>window.renderEXOStage(id),entry.id);
  const png=await page.locator('#stage canvas').screenshot({type:'png'});
  const output=`${site}/market-media/scene-${entry.id}.webp`;
  const script='import io,sys\nfrom PIL import Image\nim=Image.open(io.BytesIO(sys.stdin.buffer.read())).convert("RGB")\nim.save(sys.argv[1],"WEBP",quality=86,method=5)';
  const result=spawnSync('python3',['-c',script,output],{input:png});
  if(result.status!==0)throw Error(result.stderr?.toString()||`Invalid stage image ${entry.id}`);
  entry.render='EXO native GLB scene rendered using Three.js GLTFLoader';
  console.log('Stage',entry.id,JSON.stringify(frame));
 }
}finally{await browser.close()}
writeFileSync(`${site}/market-media.json`,JSON.stringify(manifest,null,2)+'\n');
