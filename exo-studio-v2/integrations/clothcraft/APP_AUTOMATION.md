# ClothCraft automation surfaces

ClothCraft uses two cooperating automation surfaces. Both operate on real
workspace data, but they control different systems:

1. **Native Rust HTTP agent**, bound to `127.0.0.1:5385` in the signed V2 app.
   `GET /agent/v1/capabilities` is the authoritative list of runnable native
   operations. `GET /agent/v1/status`, `POST /agent/v1/actions` and
   `POST /agent/v1/batch` operate on the current editable garment, not an
   imported copy. Native mutating commands require the current revision and
   are rejected on a stale revision. See `AGENT_API.md` for MCP and auth.

2. **In-app automation**, running in the existing V2 browser window. This
   controls the EXO interface systems that are not stored in the Rust engine:
   File Library (IndexedDB), project collections, built-in garments/fabrics/
   hardware/studio sets, interface themes, viewport layout and legacy scene
   staging. There is no unauthenticated HTTP access to private browser files.

## Automate the visible app

Run this from a trusted same-page browser script (for example a Playwright
`page.evaluate()` call, or the same-origin browser automation that controls
the open V2 window):

```js
function clothcraftAction(action, args = {}) {
  const id = `my-automation-${crypto.randomUUID()}`
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      window.removeEventListener('clothcraft:automation:response', receive)
      reject(new Error('ClothCraft action timed out'))
    }, 30000)
    const receive = event => {
      if (event.detail?.id !== id) return
      clearTimeout(timeout)
      window.removeEventListener('clothcraft:automation:response', receive)
      event.detail.ok ? resolve(event.detail.result) : reject(new Error(event.detail.error))
    }
    window.addEventListener('clothcraft:automation:response', receive)
    window.dispatchEvent(new CustomEvent('clothcraft:automation:request', {
      detail: { id, action, args }
    }))
  })
}

await clothcraftAction('app.capabilities')
await clothcraftAction('app.project.summary')
await clothcraftAction('app.assets.list', { category: 'studioSets' })
await clothcraftAction('app.library.collections.create', { name: 'FW27' })
await clothcraftAction('app.appearance.setTheme', { theme: 'graphite' })
await clothcraftAction('app.workspace.setLayout', { layout: 'split' })
```

To archive the currently open actual editable garment:

```js
const saved = await clothcraftAction('app.library.capture', {
  name: 'Jacket sample V1', status: 'sample', category: 'garment',
  notes: 'Reduce sleeve length by 1.5 cm'
})
const projects = await clothcraftAction('app.library.list')
await clothcraftAction('app.library.project.open', { id: saved.id })
```

The event bridge exposes a closed action catalog; unknown action names and
invalid arguments return structured errors. Commands execute sequentially.
`app.scene.setStage` is currently available in the legacy renderer only; the
native Rust viewport does not yet render those custom studio stages.

## Automation status and limits

The native API exposes only actions listed by the live manifest. It does not
claim every UI feature has an independently addressable server operation.
For example, native advanced graphics placement, custom studio scene
rendering, techpack production approval, and external cloud integrations
still need dedicated backend adapters. The library remains controllable from
the browser automation surface with real persisted snapshots and files.
User data and app settings remain on the local machine, and no remote
listener or account connection is created by these changes.
