// Research-derived inventory. These entries document capabilities and do not
// dispatch actions unless a separately verified UI integration exists.
export const OPEN_SOURCE_PATTERN_SOURCES = Object.freeze([
  { id: 'seamly2d', name: 'Seamly2D', area: 'Parametric drafting' },
  { id: 'valentina', name: 'Valentina', area: 'Measurements and formulas' },
  { id: 'freesewing', name: 'FreeSewing', area: 'Measurement-driven patterns' },
  { id: 'openpattern', name: 'OpenPattern', area: 'Drafting geometry' },
  { id: 'garmentcode', name: 'GarmentCode', area: 'Procedural garment patterns' },
  { id: 'clipper2', name: 'Clipper2', area: 'Polygon operations and offsets' },
]);

const reference = (id, label, category, sources, description) =>
  Object.freeze({ id, label, category, sources, description, status: 'reference' });

export const OPEN_SOURCE_PATTERN_TOOLS = Object.freeze([
  reference('parametric-measurements', 'Measurement variables and formulas', 'Parametric drafting', ['seamly2d','valentina','freesewing'], 'Measurement tables, expressions, and dependency updates.'),
  reference('construction-geometry', 'Construction points and axes', 'Parametric drafting', ['seamly2d','valentina','openpattern'], 'Named points, lines, perpendiculars, intersections and geometric constraints.'),
  reference('curve-constraints', 'Curve controls and continuity', 'Pattern geometry', ['seamly2d','openpattern'], 'Smooth curve joins, tangent handles, and numerical curve editing.'),
  reference('geometric-operations', 'Accurate edge offsets and intersections', 'Pattern geometry', ['clipper2','openpattern'], 'Robust clipping, cut lines, self-intersection detection and allowances.'),
  reference('pattern-blocks', 'Reusable pattern blocks', 'Pattern geometry', ['freesewing','openpattern','garmentcode'], 'Configurable bodice, sleeve, skirt, trouser, and collar templates.'),
  reference('graded-measurements', 'Size charts and grading increments', 'Grading', ['seamly2d','valentina','freesewing'], 'Size-specific measurement tables, grading rules and rule validation.'),
  reference('grade-points', 'Grading points and nested sizes', 'Grading', ['seamly2d','valentina'], 'Per-point size movement with nested pattern outlines.'),
  reference('dart-transforms', 'Dart transfer and slash/spread', 'Pattern transformations', ['openpattern','freesewing'], 'Preserve garment dimensions through controlled dart and seam transformations.'),
  reference('procedural-panels', 'Procedural panel assembly', 'Pattern transformations', ['garmentcode','freesewing'], 'Generate connected pattern panels from garment parameters.'),
  reference('sewing-metadata', 'Seam correspondence and notches', 'Production preparation', ['garmentcode','seamly2d'], 'Match stitch edges and carry notches through topology changes.'),
  reference('print-layout', 'Tiled printing and cutting layout', 'Production preparation', ['seamly2d','valentina','clipper2'], 'Paper tiling, pattern outlines, registration and nesting checks.'),
  reference('measurement-qa', 'Production measurement validation', 'Production preparation', ['freesewing','valentina'], 'Compare graded output to points of measure and tolerances.'),
]);

export const PATTERN_TOOL_CATEGORIES = Object.freeze([...new Set(OPEN_SOURCE_PATTERN_TOOLS.map(tool => tool.category))]);

export function filterOpenSourcePatternTools(query = '', category = 'all') {
  const needle = String(query).trim().toLowerCase();
  return OPEN_SOURCE_PATTERN_TOOLS.filter(tool =>
    (category === 'all' || tool.category === category) &&
    (!needle || [tool.label, tool.description, tool.category, ...tool.sources].join(' ').toLowerCase().includes(needle))
  );
}
