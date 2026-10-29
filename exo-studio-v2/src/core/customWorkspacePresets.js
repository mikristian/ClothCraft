// Inspiration presets use EXO's own tools and are not copies of proprietary UIs.
export const CUSTOM_WORKSPACE_PRESETS=Object.freeze([
 {id:'exo',name:'EXO Native',description:'Balanced EXO 3D/2D studio and familiar tool rails.',theme:'graphite',layout:'split',order:'standard',left:true,right:true,glass:false,tools:['select','point','sew','grid','save']},
 {id:'optitex',name:'Optitex-inspired',description:'Focused 2D grading, compact upper toolbar and visible measurement controls.',theme:'bone-light',layout:'2d',order:'standard',left:true,right:true,glass:false,tools:['grade24:prev-point','grade24:next-point','grade24:copy-grading','grade24:paste-grading','grade24:grade-notch','grade24:show-from-base-size']},
 {id:'modaris',name:'Modaris-inspired',description:'2D drafting emphasis with point and contour commands. Tool parity varies by command.',theme:'graphite',layout:'2d',order:'standard',left:true,right:true,glass:false,tools:['select','point','grade24:move-point-size','grade24:align-points-size','grade24:grade-notch']},
 {id:'hybrid',name:'EXO + CAD Hybrid',description:'Native EXO controls with grading actions and liquid-glass floating widgets.',theme:'graphite',layout:'split',order:'standard',left:true,right:true,glass:true,tools:['select','point','sew','grade24:copy-grading','grade24:paste-grading','grade24:grade-notch','save']},
]);
export const CUSTOM_WIDGET_MODES=Object.freeze(['floating','left','right','top','bottom']);
