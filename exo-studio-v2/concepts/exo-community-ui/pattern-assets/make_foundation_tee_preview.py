"""Regenerate the actual 2D Foundation Tee marketplace thumbnail."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from make_foundation_tee import prepare

HERE=Path(__file__).parent
WIDTH,HEIGHT=1100,760
SCALE=4.65
COLORS={'background':'#d6d8d4','paper':'#f7f7f2','ink':'#202b30','guide':'#b7bdb7','accent':'#697777'}

def font(size,bold=False):
    path='/System/Library/Fonts/Supplemental/Arial Bold.ttf' if bold else '/System/Library/Fonts/Supplemental/Arial.ttf'
    if Path(path).exists():return ImageFont.truetype(path,size)
    return ImageFont.load_default()

def polyline(draw,points,tx,ty,fill,width=3):
    shifted=[(round(tx+p[0]*SCALE),round(ty-p[1]*SCALE)) for p in points]
    draw.line(shifted+[shifted[0]],fill=fill,width=width,joint='curve')

def main():
    img=Image.new('RGB',(WIDTH,HEIGHT),COLORS['background'])
    d=ImageDraw.Draw(img)
    d.rounded_rectangle((29,27,WIDTH-29,HEIGHT-28),radius=12,fill=COLORS['paper'])
    d.text((68,61),'EXO / OPEN PATTERN LIBRARY',fill=COLORS['accent'],font=font(19,True))
    d.text((66,91),'FOUNDATION TEE',fill=COLORS['ink'],font=font(53,True))
    d.text((69,157),'ORIGINAL 2D CUT PANELS  /  FRONT  +  BACK  +  SLEEVE',fill=COLORS['accent'],font=font(15))
    for i,item in enumerate(prepare()):
        ring=item['cut']; sew=item['sew']
        minx=min(p[0] for p in ring);maxy=max(p[1] for p in ring)
        xbase=[80,430,778][i]
        tx=xbase-minx*SCALE
        ty=596+maxy*SCALE-71*SCALE
        # A clear miniature of the actual EXO sample cutline with its source
        # sewing path. It is a catalog illustration, not printable to scale.
        points=[(tx+p[0]*SCALE,ty-p[1]*SCALE) for p in ring]
        d.polygon(points,fill='#e5e7e2')
        polyline(d,ring,tx,ty,COLORS['ink'],3)
        polyline(d,sew,tx,ty,COLORS['guide'],2)
        label=['01 / FRONT ON FOLD','02 / BACK ON FOLD','03 / SLEEVE, CUT TWO'][i]
        d.text((xbase,604),label,fill=COLORS['ink'],font=font(16,True))
    d.rectangle((68,671,WIDTH-68,673),fill='#c5c9c4')
    d.text((69,693),'A4 / LETTER TILED PDF',fill=COLORS['ink'],font=font(17,True))
    d.text((515,693),'CC0 / FREE',fill=COLORS['ink'],font=font(17,True))
    d.text((720,696),'UNVERIFIED FIT SAMPLE',fill=COLORS['accent'],font=font(13))
    out=HERE/'foundation-tee-pattern-catalog.webp'
    img.save(out,'WEBP',quality=91,method=6)
    print(out,out.stat().st_size)

if __name__=='__main__':main()
