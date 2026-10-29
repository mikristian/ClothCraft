"""A visual index of the exact EXO Foundation Tee 2D source contours.

The full-size printable cutlines are in the separate tiled PDF; this image is
only a high-resolution catalog cover and is never substituted for the pattern.
"""
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
OUTPUT = Path(__file__).with_name('foundation-tee-cover.webp')
SOURCE = ROOT / 'blender_bridge/fixtures/tee.garment.json'

data = json.loads(SOURCE.read_text())
img = Image.new('RGB', (1200, 1240), '#e4e4e0')
d = ImageDraw.Draw(img)

def font(sz, bold=False):
    candidates = ['/System/Library/Fonts/HelveticaNeue.ttc', '/System/Library/Fonts/Supplemental/Arial.ttf']
    for path in candidates:
        try:
            return ImageFont.truetype(path, sz, index=1 if bold else 0)
        except OSError:
            pass
    return ImageFont.load_default()

d.rectangle((33, 31, 1167, 1206), outline='#c2c4c1', width=2)
d.text((68, 66), 'EXO   /   PATTERN ARCHIVE   01', font=font(24, True), fill='#23282a')
d.text((68, 106), 'FOUNDATION TEE', font=font(62, True), fill='#23282a')
d.text((70, 183), 'ORIGINAL 2D SOURCE  /  FOUR SEPARATE CUT PANELS', font=font(17), fill='#59636a')
d.line((68, 215, 1130, 215), fill='#adada6', width=2)

placements = [('front',68,285,6.0,'01  FRONT / CUT 1'), ('back',665,285,6.0,'02  BACK / CUT 1'),
              ('sleeve-left',125,804,5.1,'03  SLEEVE / LEFT'), ('sleeve-right',700,804,5.1,'04  SLEEVE / RIGHT')]
for name, dx,dy,scale,label in placements:
    piece = next(p for p in data['pieces'] if p['id'] == name)
    pts = piece['points']
    lo = min(p['x'] for p in pts)
    hi = max(p['y'] for p in pts)
    def xy(p): return (round(dx+(p['x']-lo)*scale), round(dy+(hi-p['y'])*scale))
    contour = []
    for i, start in enumerate(pts):
        end = pts[(i+1)%len(pts)]
        curve = piece.get('curves', {}).get(str(i))
        for t_index in range(12 if curve else 1):
            t = t_index/12 if curve else 0
            if curve:
                p = {'x':(1-t)**2*start['x']+2*t*(1-t)*curve['cx']+t*t*end['x'],
                     'y':(1-t)**2*start['y']+2*t*(1-t)*curve['cy']+t*t*end['y']}
            else:p = start
            contour.append(xy(p))
    d.polygon(contour,fill='#fafafa')
    d.line(contour+[contour[0]],fill='#263b42',width=4,joint='curve')
    cx=(min(v[0] for v in contour)+max(v[0] for v in contour))/2
    top=min(v[1] for v in contour)
    bottom=max(v[1] for v in contour)
    # Original grain runs down the garment's Y direction.
    for offset in range(0,int(bottom-top),18):
        d.line((cx,top+35+offset,cx,min(bottom-35,top+46+offset)),fill='#b2a398',width=2)
    d.text((dx,dy-35),label,font=font(19,True),fill='#303b3e')

d.rectangle((67,1155,1133,1203),fill='#23282a')
d.text((86,1169),'A4 + US LETTER PRINT AT 100%    /    FREE CC0    /    SAMPLE FIT NOT CERTIFIED',font=font(17,True),fill='white')
img.save(OUTPUT,'WEBP',quality=90,method=5)
print(OUTPUT)
