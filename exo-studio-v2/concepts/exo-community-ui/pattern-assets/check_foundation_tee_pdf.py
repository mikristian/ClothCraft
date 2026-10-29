"""Check printable EXO original Foundation Tee PDF media and physical scale."""
from pathlib import Path
import fitz
from reportlab.lib.pagesizes import A4,letter

ROOT=Path(__file__).parent
for label,dimensions,expected_pages in [('a4',A4,22),('letter',letter,26)]:
    doc=fitz.open(ROOT/f'exo-foundation-tee-{label}-cc0.pdf')
    assert len(doc)==expected_pages,(label,len(doc))
    assert all(abs(page.rect.width-dimensions[0])<.03 and abs(page.rect.height-dimensions[1])<.03 for page in doc)
    square=[drawing['rect'] for drawing in doc[0].get_drawings()
        if abs(drawing['rect'].width-141.73228)<.05 and abs(drawing['rect'].height-141.73228)<.05]
    assert len(square)==1,(label,'missing actual-size 50mm square')
    texts='\n'.join(p.get_text() for p in doc).upper()
    for phrase in ('FRONT','BACK','SLEEVE','GRAINLINE','FIT','10 MM OVERLAP','CC0','A1'):
        assert phrase in texts,(label,phrase)
    tile_names=[page.get_text().splitlines()[0] for page in list(doc)[1:]]
    assert len(tile_names)==len(set(tile_names)),(label,'duplicate tile captions')
    print('PASS',label,len(doc),'pages, 50mm calibration square, grain/notch construction labels')
