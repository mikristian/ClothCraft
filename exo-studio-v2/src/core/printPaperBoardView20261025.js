// Screen-only geometry. Never scale physical paper, cut dimensions, or exports.
export function fitCompletePrintBoard20261025({
  widthCm,heightCm,viewportWidthPx,viewportHeightPx,
  pixelsPerCm=4.2,chromeWidthPx=48,chromeHeightPx=72,
}={}){
  if(![widthCm,heightCm,viewportWidthPx,viewportHeightPx,pixelsPerCm].every(Number.isFinite) ||
     widthCm<=0||heightCm<=0||pixelsPerCm<=0||viewportWidthPx<=0||viewportHeightPx<=0)return null
  const availableWidth=Math.max(1,viewportWidthPx-chromeWidthPx)
  const availableHeight=Math.max(1,viewportHeightPx-chromeHeightPx)
  return Math.min(3,Math.max(.01,Math.min(
    availableWidth/(widthCm*pixelsPerCm),
    availableHeight/(heightCm*pixelsPerCm),
  )))
}

// Show actual *printable content* tile divisions; paper margins are rendered
// separately on the exact page proof so this overlay never impersonates trim.
export function getPrintTileGrid20261025(plan,widthCm,heightCm) {
  if(!plan || !Number.isFinite(widthCm) || !Number.isFinite(heightCm) ||
     widthCm<=0 || heightCm<=0 || !(plan.ratio>0) ||
     !(plan.printableWidthCm>0) || !(plan.printableHeightCm>0))return null
  return {
    tileWidthCm:plan.printableWidthCm/plan.ratio,
    tileHeightCm:plan.printableHeightCm/plan.ratio,
    rows:plan.rows,cols:plan.cols,
    widthCm,heightCm,
  }
}
