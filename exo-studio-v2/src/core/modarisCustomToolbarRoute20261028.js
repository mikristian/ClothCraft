// Verified EXO entry points for a LIMITED subset of the Modaris-inspired
// command inventory. These launch EXO workflows and do not assert equivalence
// of proprietary Lectra algorithms or all operation preconditions.
import {getModarisToolbarTool20261028} from './modarisToolbarCatalog20261028.js'
import {MODARIS_F7_EXO_ACTIONS_20261028} from './modarisF7SizeEvolution20261028.js'
export const MODARIS_EXO_ROUTES_20261028 = Object.freeze({
  select:{kind:'app',action:'select'}, point:{kind:'app',action:'point'},
  // A drawing cursor must be activated on the actual 2D board, not just by
  // changing the native mode flag (which would leave the old cursor selected).
  line:{kind:'canvas',action:'line'}, polygon:{kind:'native',action:'tool:base-polygon'},
  rectangle:{kind:'native',action:'tool:base-rectangle'},
  ellipse:{kind:'native',action:'tool:base-ellipse'},
  notch:{kind:'canvas',action:'notch'},
  split:{kind:'canvas',action:'split'},
  allowance:{kind:'canvas',action:'allowance'},
  measure:{kind:'canvas',action:'measure'},
  mirror:{kind:'native',action:'mirror-selected',requiresSelection:true},
  trace:{kind:'native',action:'trace-selected',requiresSelection:true},
  duplicate:{kind:'native',action:'duplicate-selected',requiresSelection:true},
  delete:{kind:'native',action:'delete-selected',requiresSelection:true},
  dart:{kind:'tool',action:'dart-precision'},
  pleat:{kind:'tool',action:'physical-pleat'},
  'grade-chart':{kind:'studio',action:'grade-table'},
  'grade-edit':{kind:'studio',action:'grade-manual'},
  'grade-run':{kind:'studio',action:'grade-auto'},
  'grade-audit':{kind:'studio',action:'pattern-qa'},
  'grade-copy':{kind:'grade24',action:'copy-grading'},
  'grade-paste':{kind:'grade24',action:'paste-grading'},
  'grade-paste-x':{kind:'grade24',action:'paste-x-grading'},
  'grade-paste-y':{kind:'grade24',action:'paste-y-grading'},
  'grade-notch':{kind:'grade24',action:'grade-notch'},
  'grade-clear':{kind:'grade24',action:'clear-grading'},
  'grade-stack':{kind:'grade24',action:'stack-point'},
  'grade-angle':{kind:'grade24',action:'angle'},
  'grade-proportional':{kind:'grade24',action:'grade-proportionally'},
  'grade-nest':{kind:'studio',action:'toggle-native-nest'},
  sew:{kind:'native',action:'mode:sew'},
  'seam-walk':{kind:'studio',action:'walk-seam'},
  'industrial-audit':{kind:'studio',action:'industrial-panel'},
  'view-2d':{kind:'layout',action:'2d'},
  'view-split':{kind:'layout',action:'split'},
  simulate:{kind:'app',action:'simulate'}, undo:{kind:'app',action:'undo'},
  redo:{kind:'app',action:'redo'}, save:{kind:'app',action:'save'}, export:{kind:'app',action:'export'}
})

// These commands have an exact, explicit destination in EXO's existing UI.
// Keeping them keyed by complete IDs prevents category-wide aliasing.
const EXPLICIT_UI_ROUTES = Object.freeze({
  'modaris:menu:view-object-browser':{kind:'panel',action:'object-browser'},
  'modaris:menu:view-properties':{kind:'panel',action:'property-editor'},
  'modaris:menu:view-toolbar':{kind:'settings',action:'customToolbar'},
  'modaris:menu:configure-toolbar':{kind:'settings',action:'customToolbar'},
  'modaris:menu:configure-workspace':{kind:'settings',action:'workspace'},
  'modaris:menu:parameters-units':{kind:'settings',action:'units'},
  'modaris:menu:preferences':{kind:'settings',action:'preferences'},
  'modaris:menu:tool-index':{kind:'settings',action:'toolIndex'},
  'modaris:menu:display-grid':{kind:'app',action:'grid'},
})

// A vague nativeCandidate is not enough: e.g. Select All must not quietly run
// Select, and Show 3D must not quietly begin garment simulation.
const EXACT_ACTION_SLUGS = Object.freeze({
  select:['select'],point:['point'],
  // EXO line mode authors *internal* lines within existing pattern panels.
  // Modaris straight/construction lines have different placement semantics,
  // so sharing this mode would silently produce the wrong geometry.
  line:['internal-line'],
  polygon:['polygon','create-piece'],
  rectangle:['rectangle'],ellipse:['oval'],
  notch:['notch'],split:['split'],allowance:['seam-allowance'],
  measure:['measure-length'],pleat:['pleat'],
  mirror:['mirror'],trace:['trace'],duplicate:['duplicate'],delete:['delete'],dart:['dart'],
  'grade-chart':['grading-table','view-grading-table'],
  'grade-edit':['grading-rule','grade-point'],
  'grade-run':['grade-run','automatic-grading'],
  'grade-audit':['grade-audit'],
  'grade-copy':['grade-copy'],'grade-paste':['grade-paste'],
  'grade-paste-x':['grade-paste-x'],'grade-paste-y':['grade-paste-y'],
  'grade-notch':['grade-notch'],'grade-clear':['grade-clear'],'grade-stack':['grade-stack'],
  'grade-angle':['grade-angle'],'grade-proportional':['grade-proportional'],
  'grade-nest':['grade-nest'],
  sew:['sew'],
  'seam-walk':['seam-walk'],
  'industrial-audit':['industrial-audit','production-audit'],
  'view-2d':['view-2d'],
  'view-split':['view-split'],
  simulate:['simulate'],
  undo:['undo'],redo:['redo'],save:['save'],export:['export','production-export'],
})

export function getModarisExoRoute20261028(id){
  const tool=getModarisToolbarTool20261028(id)
  if(!tool)return null
  // These eleven operations open the real, persisted source-linked EXO F7
  // authoring console. The three remaining commands have no equivalent yet.
  if(id.startsWith('modaris:f7:')){
    const action=id.slice('modaris:f7:'.length)
    return MODARIS_F7_EXO_ACTIONS_20261028.includes(action)?{kind:'f7-size',action,tool}:null
  }
  if(id==='modaris:f6:grade-angle')return {...MODARIS_EXO_ROUTES_20261028['grade-angle'],tool}
  if(id==='modaris:f6:grade-proportional')return {...MODARIS_EXO_ROUTES_20261028['grade-proportional'],tool}
  if(id==='modaris:f6:grade-nest')return {...MODARIS_EXO_ROUTES_20261028['grade-nest'],tool}
  if(EXPLICIT_UI_ROUTES[id])return {...EXPLICIT_UI_ROUTES[id],tool}
  if(!tool?.nativeCandidate)return null
  const route=MODARIS_EXO_ROUTES_20261028[tool.nativeCandidate]
  const slug=tool.id.split(':').slice(2).join(':')
  if(!route||!EXACT_ACTION_SLUGS[tool.nativeCandidate]?.includes(slug))return null
  return {...route,tool}
}

