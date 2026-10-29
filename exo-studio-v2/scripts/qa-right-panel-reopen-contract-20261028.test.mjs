import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8')
const layout=read('src/patternFocusExpanded.css')
const app=read('src/App.jsx')
const custom=read('src/components/StudioCustomToolbarCollection.css')
const widget=read('src/components/StudioWorkspaceWidgets.css')
const style=read('src/styles.css')
test('right inspector and toolbar reopen actions are independent',()=>{
 assert.match(app,/exo-right-independent-tools-arrow[^\n]+onClick=\{\(\)=>setRightToolsCollapsed/)
 assert.match(app,/exo-reopen-inspector-arrow[^\n]+onClick=\{event=>/)
 assert.match(layout,/data-inspector-visible="false"\]\[data-right-tools-collapsed="true"\]\{--effective-inspector-width:0px!important\}/)
 assert.match(layout,/exo-right-independent-tools-arrow\{[\s\S]*?top:32px!important/)
 assert.match(layout,/exo-reopen-inspector-arrow\{[\s\S]*?top:3px!important/)
})
test('custom and native toolbar top and bottom docks have horizontal responsive layouts',()=>{
 for(const css of [custom,widget,style]){assert.match(css,/data-toolbar-dock="bottom"|exo-custom-toolbar-dock-region--bottom|exo-workspace-widget--bottom/);assert.match(css,/data-toolbar-dock="top"|exo-custom-toolbar-dock-region--top|exo-workspace-widget--top/)}
 assert.match(custom,/grid-template-columns:repeat\(auto-fit,minmax\(32px,1fr\)\)/)
 assert.match(widget,/grid-template-columns:repeat\(auto-fit,minmax\(32px,1fr\)\)/)
})
