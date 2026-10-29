import index from '../../research/accumark-v10-playlist/ACCUMARK_FUNCTION_ENGINEERING_INDEX.json' with { type: 'json' }

// A route is a declaration for the App dispatcher, never an executable operation.
// Reference routes deliberately have no executable UI target.
const LIVE = Object.freeze({
  'accu.workspace.setup': ['inspector','workspace'],
  'accu.storage.model': ['inspector','models'],
  'accu.selection.prompts': ['inspector','commands'],
  'accu.draft.curve': ['tool', 'curve'],
  'accu.draft.trace': ['slot', 'A07'],
  'accu.draft.split': ['tool', 'split'],
  'accu.draft.dart': ['engineering-draft', 'dart.pivot'],
  'accu.draft.fullness': ['engineering-draft', 'fullness.spread'],
  'accu.draft.alter': ['engineering-draft', 'alter.local'],
  'accu.seam.allowance': ['slot', 'A09'],
  'accu.seam.walk': ['slot', 'A10'],
  'accu.seam.notch': ['slot', 'A08'],
  'accu.grading.size_line': ['inspector', 'grading'],
  'accu.grading.rule_table': ['inspector', 'grading'],
  'accu.grading.delta': ['inspector', 'grading'],
  'accu.grading.offset': ['engineering-grade', 'offset'],
  'accu.grading.copy': ['inspector', 'grading'],
  'accu.grading.point': ['inspector', 'grading'],
  'accu.grading.intersection': ['engineering-constraint', 'intersect'],
  'accu.grading.keep_angle': ['engineering-constraint', 'keep-angle'],
  'accu.grading.smooth': ['engineering-grade', 'smooth'],
  'accu.grading.nest': ['toggle-nest'],
  'accu.grading.qa': ['inspector', 'quality'],
  'accu.marker.setup': ['inspector', 'markers'],
  'accu.marker.nest': ['inspector', 'markers'],
  'accu.marker.cost': ['inspector', 'markers'],
  'accu.output.plot': ['engineering-marker', 'plot'],
  'accu.output.cutdata': ['export-factory-package'],
  'accu.output.import': ['import-dxf'],
  'accu.output.export': ['export-dxf'],
})

const makeRoute = (id) => {
  const entry = LIVE[id]
  return Object.freeze(entry ? { kind: entry[0], ...(entry[1] ? { target: entry[1] } : {}) } : { kind: 'reference' })
}

export const ACCUMARK_2D_COMMANDS = Object.freeze(index.items.map((item) => Object.freeze({
  id: item.id,
  label: item.label,
  domain: item.domain,
  purpose: item.purpose,
  engineering: Object.freeze({
    inputs: Object.freeze([...(item.inputs || [])]),
    steps: Object.freeze([...(item.engineering_algorithm || [])]),
    outputs: Object.freeze([...(item.outputs || [])]),
    invariants: Object.freeze([...(item.safety_invariants || [])]),
    tests: Object.freeze([...(item.acceptance_tests || [])]),
    exoModules: Object.freeze([...(item.candidate_exo_modules || [])]),
  }),
  route: makeRoute(item.id),
  sourceIds: Object.freeze([...(item.official_source_ids || [])]),
  helpUrl: item.official_references?.find((ref) => ref.url)?.url || null,
  implemented: Object.hasOwn(LIVE, item.id),
})))

export const ACCUMARK_2D_GROUPS = Object.freeze([...new Set(ACCUMARK_2D_COMMANDS.map(({ domain }) => domain))].map((domain) => Object.freeze({
  id: domain,
  label: domain[0].toUpperCase() + domain.slice(1),
  commands: Object.freeze(ACCUMARK_2D_COMMANDS.filter((item) => item.domain === domain)),
})))

export const ACCUMARK_2D_UI_SUMMARY = Object.freeze({
  total: ACCUMARK_2D_COMMANDS.length,
  implemented: ACCUMARK_2D_COMMANDS.filter((item) => item.implemented).length,
  reference: ACCUMARK_2D_COMMANDS.filter((item) => !item.implemented).length,
  grading: ACCUMARK_2D_COMMANDS.filter((item) => item.id.startsWith('accu.grading.')).length,
})

export const findAccuMark2DCommand = (id) => ACCUMARK_2D_COMMANDS.find((command) => command.id === id) || null
