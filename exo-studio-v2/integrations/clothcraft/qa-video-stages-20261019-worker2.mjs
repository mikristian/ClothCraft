// ClothCraft promo staging audit: DOM observation only, no app writes.
// Optionally attach to a PREEXISTING Chrome debugging session with EXO_QA_CDP.
import { chromium } from 'playwright-core'

export const videoStages = [
  { start: 0, end: 18, title: 'Opening / full workspace', selectors: ['.three-mount', '[aria-label="Metric 2D pattern board with linked sewing and measurements"]'] },
  { start: 18, end: 43, title: 'Settings / themes', selectors: ['[aria-label="Open Studio Settings"]', '[data-testid="studio-settings-dialog"]', '[aria-label="Search theme presets"]', '[data-theme-id]'] },
  { start: 43, end: 63, title: 'Workspace panels', selectors: ['[data-testid="studio-settings-dialog"]', '[aria-label="Side panel color presets"]'] },
  { start: 63, end: 87, title: '2D drafting and framing', selectors: ['[aria-label="Frame all"]', '[aria-label="Focus selected"]', '[aria-label="Precision drafting"]', '[data-2d-pattern-piece]'] },
  { start: 87, end: 115, title: 'Bezier geometry close-up', selectors: ['[data-tool-family="curve"]', '[data-2d-edge-hit]', '[data-bezier-arm]', '[data-curve-handle]', '[data-side-edit-station]'] },
  { start: 115, end: 137, title: 'Pattern precision', selectors: ['[data-curve-pattern-measurements]', '[data-paper-preview-state]', '[data-free-curve-point]'] },
  { start: 137, end: 154, title: 'Sewing mode', selectors: ['[data-tool-family="sew"]', '[data-sewing-guide-index]', '[data-sew-edge-state]'] },
  { start: 154, end: 174, title: 'Avatar orbit / drape', selectors: ['[data-tool-family="orbit"]', '.three-mount', '.three-mount canvas'] },
  { start: 174, end: 180, title: 'Final workspace hero', selectors: ['.three-mount', '[data-2d-pattern-piece]'] },
]

const endpoint = process.env.EXO_QA_UI || 'http://127.0.0.1:5386'
const res = await fetch(endpoint).catch(() => null)
if (!res?.ok) throw Error(`UI not reachable: ${endpoint}, response ${res?.status ?? 'connection error'}`)
const cdp = process.env.EXO_QA_CDP
if (!cdp) {
  console.log(JSON.stringify({ endpoint, http: res.status, stageSeconds: videoStages.at(-1).end, stages: videoStages, dom: 'skipped: set EXO_QA_CDP to existing browser CDP URL; no new browser is launched' }, null, 2))
  process.exit(0)
}
const browser = await chromium.connectOverCDP(cdp)
try {
  const page = browser.contexts().flatMap(ctx => ctx.pages()).find(page => page.url().startsWith(endpoint))
  if (!page) throw Error(`No existing page for ${endpoint}; open the app in the attached browser first`)
  const stages = []
  for (const stage of videoStages) {
    const selectors = Object.fromEntries(await Promise.all(stage.selectors.map(async selector => [selector, await page.locator(selector).count()])))
    stages.push({ ...stage, selectors })
  }
  console.log(JSON.stringify({ endpoint, stageSeconds: 180, stages }, null, 2))
} finally {
  // Leave the attached browser and all existing tabs open.
  browser.close()
}
