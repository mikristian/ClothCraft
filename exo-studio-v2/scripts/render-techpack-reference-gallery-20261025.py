#!/usr/bin/env python3
"""Make a source-labeled page-image index from existing local tech packs.

For internal visual reference only; no third-party example artwork is shipped
with EXO or represented as a user-authored factory specification.
"""
import hashlib
import json
from pathlib import Path

import fitz
from PIL import Image, ImageDraw

BASE=Path(__file__).resolve().parents[1]/'research/techpack-library'
SOURCE=BASE/'examples-20261025'
DEST=BASE/'reference-gallery-20261025'
DEST.mkdir(parents=True,exist_ok=True)
records=[]
for path in sorted(SOURCE.glob('*.pdf')):
    try:
        doc=fitz.open(path)
        folder=DEST/path.stem
        folder.mkdir(exist_ok=True)
        for index,page in enumerate(doc):
            scale=min(1.65,800/max(page.rect.width,1))
            pix=page.get_pixmap(matrix=fitz.Matrix(scale,scale),alpha=False,colorspace=fitz.csRGB)
            im=Image.frombytes('RGB',(pix.width,pix.height),pix.samples)
            file=folder/f'page-{index+1:02}.jpg'
            im.save(file,'JPEG',quality=79,optimize=True)
            records.append({'source':str(path.relative_to(BASE)),'page':index+1,'preview':str(file.relative_to(BASE)),
                'size':list(im.size),'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),
                'text_snippet':page.get_text('text')[:220].replace('\n',' ')})
        print(path.name,'pages',len(doc))
    except Exception as error:
        print('FAILED',path.name,str(error)[:220])

(DEST/'manifest.json').write_text(json.dumps({'source_count':len(set(row['source'] for row in records)),
    'rendered_pages':len(records),'rights':'third-party copyrighted examples, private UI comparison only',
    'pages':records},indent=2)+'\n')

headings={}
for row in records:headings.setdefault(row['source'],row['preview'])
tiles=list(headings.items())
across=4
cell_w,cell_h=290,320
sheet=Image.new('RGB',(across*cell_w,((len(tiles)+across-1)//across)*cell_h),'#f4f4f3')
draw=ImageDraw.Draw(sheet)
for i,(title,img) in enumerate(tiles):
    pic=Image.open(BASE/img).convert('RGB')
    pic.thumbnail((cell_w-16,cell_h-46))
    x=(i%across)*cell_w+(cell_w-pic.width)//2
    y=(i//across)*cell_h+6
    sheet.paste(pic,(x,y))
    label=Path(title).stem[:41]
    draw.text(((i%across)*cell_w+12,(i//across)*cell_h+cell_h-27),label,fill='#273945')
sheet.save(DEST/'all-source-covers.jpg',quality=84)
print('TOTAL',len(tiles),'documents',len(records),'reference page images')
