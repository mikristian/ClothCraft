#!/usr/bin/env bash
# Test the FULL EXOClothCraft candidate, never the GarmentStudioNative preview.
# Uses isolated localhost ports and a disposable project directory; does not
# terminate or modify the user's installed app or persistent garment projects.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
MOUNTED_APP="${EXO_CANDIDATE_MOUNTED_APP:-/Volumes/EXO ClothCraft Studio V2 LOCAL TEST/EXO ClothCraft Studio V2.app}"
RES="$MOUNTED_APP/Contents/Resources"
[[ -x "$MOUNTED_APP/Contents/MacOS/EXOClothCraft" ]] || { echo 'Missing full EXO V2 launcher' >&2; exit 1; }
[[ -x "$RES/bin/node" && -x "$RES/integrations/clothcraft/rust-static-host/target/debug/exo-rust-static-host" ]] || { echo 'Missing embedded runtime' >&2; exit 1; }
for port in 5284 5497; do
  if lsof -nP -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null | grep -q .; then
    echo "Refusing to interfere with existing localhost:$port process" >&2; exit 1
  fi
done
TEMP="$(mktemp -d /tmp/exo-v2-candidate-qa.XXXXXXXX)"
STATIC_PID=''; API_PID=''
cleanup() {
  [[ -z "$API_PID" ]] || kill "$API_PID" 2>/dev/null || true
  [[ -z "$STATIC_PID" ]] || kill "$STATIC_PID" 2>/dev/null || true
  rm -rf "$TEMP"
}
trap cleanup EXIT
mkdir -p "$TEMP/output"
cp -c "$RES/bin/node" "$TEMP/node"
chmod 755 "$TEMP/node"
EXO_WEB_PORT=5284 "$RES/integrations/clothcraft/rust-static-host/target/debug/exo-rust-static-host" \
  --web-root "$RES/web" > "$TEMP/static.log" 2>&1 & STATIC_PID=$!
EXO_CLOTHCRAFT_OUTPUT_DIR="$TEMP/output" \
EXO_CLOTHCRAFT_PORT=5497 EXO_CLOTHCRAFT_REPO="$RES/research/oss/clothcraft" \
EXO_CLOTHCRAFT_TEMPLATE_BIN="$RES/research/oss/clothcraft/target/debug/cloth-template" \
EXO_CLOTHCRAFT_FIT_BIN="$RES/research/oss/clothcraft/target/debug/cloth-fit" \
EXO_NATIVE_CLI="$RES/native_cpp/build-cmake/garment_cad_cli" EXO_CLOTHCRAFT_GPU=1 \
  "$TEMP/node" "$RES/integrations/clothcraft/server.mjs" > "$TEMP/api.log" 2>&1 & API_PID=$!
ready=0
for _ in {1..40}; do
  if curl -fsS --max-time 1 http://127.0.0.1:5284/ -o /dev/null 2>/dev/null && \
     curl -fsS --max-time 1 http://127.0.0.1:5497/health -o "$TEMP/health.json" 2>/dev/null; then
    ready=1; break
  fi
  sleep .25
done
if [[ "$ready" != 1 ]]; then
  echo 'Isolated backend startup failed:' >&2
  tail -30 "$TEMP/static.log" "$TEMP/api.log" >&2
  exit 1
fi
"/usr/local/bin/node" -e 'let x=require(process.argv[1]);if(!x.ok||x.backend!=="clothcraft-exo-local"||!x.nativeReady)process.exit(1)' "$TEMP/health.json"
# Exercise the real Rust workspace using *only* this disposable output root.
# In particular, never send a garment-changing command to the user's live
# 5385 process, and do not confuse a static HTML render with a working editor.
open_code="$(curl -sS --max-time 35 -w '%{http_code}' \
  -H 'Origin: http://127.0.0.1:5284' -H 'Content-Type: application/json' \
  -d '{"op":"open","preset":"tshirt"}' \
  http://127.0.0.1:5497/workspace -o "$TEMP/open.json")"
if [[ "$open_code" != '200' ]]; then
  echo "Isolated Rust T-shirt open failed with HTTP $open_code" >&2
  head -c 650 "$TEMP/open.json" >&2 || true
  echo >&2
  tail -20 "$TEMP/api.log" >&2 || true
  exit 1
fi
"/usr/local/bin/node" -e 'const x=require(process.argv[1]);if(!x.ok||!Array.isArray(x.data?.template?.panels)||x.data.template.panels.length<2)process.exit(1);console.log("RUST_OPEN_PANELS",x.data.template.panels.length)' "$TEMP/open.json"
curl -fsS --max-time 35 \
  -H 'Origin: http://127.0.0.1:5284' -H 'Content-Type: application/json' \
  -d '{"op":"save"}' \
  http://127.0.0.1:5497/workspace -o "$TEMP/save.json"
"/usr/local/bin/node" -e 'const x=require(process.argv[1]);if(!x.ok)process.exit(1);console.log("RUST_SAVE_OK")' "$TEMP/save.json"
[[ -s "$TEMP/output/workspace/fitting-project.json" ]] || {
  echo 'The isolated Rust workspace did not persist a garment file' >&2; exit 1
}
/usr/local/bin/node --input-type=module <<'JS'
import {chromium} from 'playwright-core'
const browser=await chromium.launch({
  headless:true,
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args:['--disable-background-networking']
})
const page=await browser.newPage({viewport:{width:1440,height:900}})
const errors=[], failedAssets=[]
let redirected=0
page.on('pageerror', e=>errors.push(e.message))
page.on('response', r=>{
  if(r.status()>=400&&/\.(wasm|js|css)(?:\?|$)/.test(r.url())){
    failedAssets.push({status:r.status(),url:r.url()})
  }
})
await page.route(/http:\/\/127\.0\.0\.1:5385\//, async route=>{
  redirected++
  await route.continue({url:route.request().url().replace('127.0.0.1:5385','127.0.0.1:5497')})
})
let result
try {
  await page.goto('http://127.0.0.1:5284/?desktop=1&engine=clothcraft&testSession=tee',{
    waitUntil:'domcontentloaded',timeout:25000
  })
  await page.waitForTimeout(6000)
  const edgeCount=await page.locator('.cc-board [data-edge]').count()
  const canvases=await page.locator('canvas').count()
  result={
    pass:edgeCount>0&&canvases>0&&failedAssets.length===0,
    title:await page.title(),edgeCount,canvases,redirected,
    jsErrors:errors.slice(0,10),failedAssets
  }
} catch(e) {
  result={pass:false,error:String(e),jsErrors:errors.slice(0,10),failedAssets}
} finally {
  await browser.close()
}
console.log(JSON.stringify(result))
if(!result.pass)process.exit(1)
JS
echo 'PASS: mounted full EXO V2 isolated browser/Node/Rust smoke'
