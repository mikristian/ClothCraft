import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {CLO7_NATIVE_TOOL_CAPABILITIES} from '../src/core/clo7NativeToolCapabilities.js'
const out='docs/qa/pattern-engine-mission-20261018';mkdirSync(out,{recursive:true})
const commands={
 'pattern2d.selectTransform':'BoardTransform','pattern2d.editPoints':'Anchor / MovePoints / CurvePoint / Shape','pattern2d.fullnessRuffle':'Ruffle (line-based, not point fullness)',
 'pattern2d.drawPolygon':'Polygon','pattern2d.drawInternalLine':'InternalLine','pattern2d.basePolygon':'Primitive','pattern2d.traceContour':'Polygon (straight contours only)',
 'pattern2d.placeNotch':'Notch / RemoveNotch','pattern2d.setSeamAllowanceGuide':'SeamAllowance','pattern2d.walkSeam':'read-only compiled seam arclength',
 'pattern2d.editAnnotation':'Annotation / RemoveAnnotation','pattern2d.addAnnotation':'Annotation','pattern2d.pleatGuides':'pleat-guides (rectangular guide lines only)',
 'pattern2d.editGrading':'grade-pattern (single affine size change)','pattern2d.autoGrading':'grade-pattern (not multi-size grading)',
 'sewing.editExisting':'seam-edit','sewing.segmentSew':'Sew [0,1]','sewing.freeSew':'Sew with boundary ranges','pattern2d.fillPanel':'Fabric',
}
const slots=CLO7_NATIVE_TOOL_CAPABILITIES.filter(x=>x.dimension==='2d').map(x=>({...x,nativeCommand:commands[x.nativeAction]||null,runtimeEvidence:'NOT individually validated in this mission',source:'src/core/clo7NativeToolCapabilities.js',interactionSource:'src/components/ClothCraftBoardV2.jsx + ClothCraftWorkspace.jsx'}))
const board=readFileSync('src/components/ClothCraftBoardV2.jsx','utf8')
const modes=[...new Set([...board.matchAll(/tool2d\s*===?\s*['"]([^'"]+)/g)].map(x=>x[1]))].sort()
const authoring=readFileSync('research/oss/clothcraft/src/authoring.rs','utf8').split('pub enum Command {')[1].split('\npub struct Edit')[0]
const nativeKinds=[...authoring.matchAll(/^    (\w+)\s*\{/gm)].map(x=>x[1])
writeFileSync(out+'/coverage.json',JSON.stringify({format:'exo-pattern-engine-coverage.v1',scope:'native V2; declared support is not parity',slots,additionalBoardModes:modes,nativeAuthoringCommands:nativeKinds},null,2)+'\n')
const rows=slots.map(x=>`| ${x.id} | ${x.label} | ${x.mode} | ${x.nativeCommand||'No equivalent mutation'} | ${x.reason.replaceAll('|','/')} |`).join('\n')
writeFileSync(out+'/TOOL-COVERAGE.md',`# Native V2 2D tool baseline\n\nAll ${slots.length} physical 2D toolbar slots; generated from current source declarations. These are NOT 32 runtime passes. Frontend handler source: ClothCraftBoardV2 / ClothCraftWorkspace; native boundary: workspace.mjs / exo-session.rs / authoring.rs.\n\n| Slot | Tool | Declared status | Native operation | Actual limits |\n|---|---|---|---|---|\n${rows}\n\n## Additional board modes needing independent coverage\n\n${modes.join(', ')}\n\n## Native authoring command inventory\n\n${nativeKinds.join(', ')}\n\nEvery listed mutation requires separate interaction, metric accuracy, rejection atomicity, Undo/Redo, save/reopen, seam/reference, and downstream export checks. A declared native action does not pass those gates automatically.\n`)
console.log(JSON.stringify({slots:slots.length,modes:modes.length,nativeCommands:nativeKinds.length,output:out}))
