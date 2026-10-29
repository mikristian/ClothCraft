/** Explicit UI capability matrix. Supported exchange is not licensed interoperability. */
export const CAD_FORMAT_AVAILABILITY_20261028=Object.freeze([
 {extension:'.garment.json',label:'EXO editable project',import:'EDITABLE',export:'EDITABLE',note:'Preserves authored EXO grading, sewing and project data.'},
 {extension:'.dxf',label:'Generic layered DXF',import:'GEOMETRY_ONLY',export:'GEOMETRY_ONLY',note:'Can edit imported outlines; original construction, grades, seams and annotations are not automatically restored.'},
 {extension:'.zip',label:'EXO factory source package',import:'EDITABLE_WITH_SOURCE',export:'EXO_FACTORY_PACKAGE',note:'Editable only when a valid original garment-source.json is included and verified.'},
 {extension:'.mdl',label:'Lectra Modaris MDL',import:'UNAVAILABLE',export:'UNAVAILABLE',note:'Native editable import/export requires a documented vendor format and licensed receiving CAD round-trip.'},
 {extension:'.vet',label:'Lectra legacy VET',import:'UNAVAILABLE',export:'UNAVAILABLE',note:'No verified native reader, writer, or pairwise interchange.'},
 {extension:'.iba',label:'Lectra legacy IBA',import:'UNAVAILABLE',export:'UNAVAILABLE',note:'No verified native reader, writer, or pairwise interchange.'},
 {extension:'.rul',label:'AAMA/ASTM grading-rule sidecar',import:'UNAVAILABLE',export:'UNAVAILABLE',note:'Rule correspondence, size breaks and actual vendor acceptance have not been implemented.'},
])
