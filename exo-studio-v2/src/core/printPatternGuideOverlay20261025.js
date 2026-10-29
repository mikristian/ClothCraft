// Print-room reference geometry mirrors ClothCraftBoardV2 ConstructionGuides.
// It is derived only from the printable cut outline and never changes a pattern.
import {armpitChestReference} from './patternGuideTracks.js'

const EPS=1e-7
const finite=p=>Array.isArray(p)&&p.length>=2&&Number.isFinite(p[0])&&Number.isFinite(p[1])
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])

/** Even/odd filled polygon intervals, including concave regions and openings. */
function spans(points,at,vertical=false) {
  const crossings=[]
  for(let i=0;i<points.length;i++) {
    const a=points[i],b=points[(i+1)%points.length]
    const aStation=a[vertical?0:1],bStation=b[vertical?0:1]
    if((aStation<=at&&at<bStation)||(bStation<=at&&at<aStation)) {
      const t=(at-aStation)/(bStation-aStation)
      crossings.push(a[vertical?1:0]+t*(b[vertical?1:0]-a[vertical?1:0]))
    }
  }
  crossings.sort((a,b)=>a-b)
  const result=[]
  for(let i=0;i+1<crossings.length;i+=2)if(crossings[i+1]-crossings[i]>.05)
    result.push([crossings[i],crossings[i+1]])
  return result
}

/** Native panel and print piece are in metres and local centimetres respectively. */
export function printPatternGuideOverlay20261025(piece,panel) {
  const empty={guides:[],dimensions:[]}
  const outline=piece?.points
  if(!Array.isArray(outline)||outline.length<3||
    !finite(piece?.originCm)||!Number.isFinite(piece?.widthCm)||!Number.isFinite(piece?.heightCm)||
    piece.widthCm<12||piece.heightCm<10)return empty
  // Array.every skips holes; for-of visits them as undefined so malformed outlines fail closed.
  for(const point of outline)if(!finite(point))return empty
  const identity=`${panel?.id??piece?.sourcePanelId??''} ${panel?.name??piece?.name??''}`
  if(!/front|back|bodice|torso/i.test(identity))return empty
  const xValues=outline.map(p=>p[0]),yValues=outline.map(p=>p[1])
  const minX=Math.min(...xValues),maxX=Math.max(...xValues)
  const minY=Math.min(...yValues),maxY=Math.max(...yValues)
  const height=maxY-minY
  if(height<10||maxX-minX<12)return empty
  const nativeUnderarms=armpitChestReference(panel?.polygon)
  const underarms=nativeUnderarms?{
    left:[nativeUnderarms.left[0]*100-piece.originCm[0],nativeUnderarms.left[1]*100-piece.originCm[1]],
    right:[nativeUnderarms.right[0]*100-piece.originCm[0],nativeUnderarms.right[1]*100-piece.originCm[1]],
    y:nativeUnderarms.y*100-piece.originCm[1],
  }:null
  const chestY=underarms?.y??minY+height*.46
  const bellyY=minY+height*.64
  const widest=at=>spans(outline,at).sort((a,b)=>(b[1]-b[0])-(a[1]-a[0]))[0]
  const chest=widest(chestY)
  if(!chest)return empty
  const preferredX=(chest[0]+chest[1])/2
  const bellySpans=spans(outline,bellyY)
  const overlap=bellySpans.flatMap(([a,b])=>spans(outline,chestY).map(([c,d])=>[Math.max(a,c),Math.min(b,d)]))
    .filter(([a,b])=>b-a>2.5).sort((a,b)=>(b[1]-b[0])-(a[1]-a[0]))
  const axisSpan=overlap.find(([a,b])=>preferredX>a+.1&&preferredX<b-.1)??overlap[0]
  const centerX=axisSpan?(preferredX>axisSpan[0]+.1&&preferredX<axisSpan[1]-.1?preferredX:(axisSpan[0]+axisSpan[1])/2):preferredX
  const guides=[],dimensions=[]
  const add=(kind,index,pointsCm,style)=>{
    const id=`${piece.id}:${kind}:${index}`
    const lengthCm=pointsCm.slice(1).reduce((sum,p,i)=>sum+distance(p,pointsCm[i]),0)
    guides.push({id,kind,pointsCm,style,lengthCm})
    const a=pointsCm[0],b=pointsCm[pointsCm.length-1]
    dimensions.push({id:`${id}:measurement`,kind,valueCm:lengthCm,
      positionCm:[(a[0]+b[0])/2,(a[1]+b[1])/2],pointsCm:[a.slice(),b.slice()]})
  }
  for(const [kind,y] of [['chest',chestY],['belly',bellyY]]) {
    let intervals=spans(outline,y).filter(([a,b])=>centerX>a+.1&&centerX<b-.1)
    if(kind==='chest'&&underarms&&intervals.some(([a,b])=>
      underarms.left[0]>=a-EPS&&underarms.right[0]<=b+EPS&&underarms.left[0]<centerX&&centerX<underarms.right[0]))
      intervals=[[underarms.left[0],underarms.right[0]]]
    intervals.forEach(([a,b],i)=>add(kind,i,[[a,y],[centerX,y],[b,y]],'solid'))
  }
  const vertical=spans(outline,centerX,true).filter(([a,b])=>b-a>2.5)
  vertical.forEach(([a,b],i)=>{
    const inset=Math.min(.6,(b-a)*.05)
    add(/back/i.test(identity)?'center-back':'center-front',i,
      [[centerX,a+inset],[centerX,b-inset]],'dotted')
  })
  return {guides,dimensions}
}

export default printPatternGuideOverlay20261025
