"""Render the dated 30-section research atlas into a readable, precisely paginated PDF."""
from __future__ import annotations

import html
import re
from pathlib import Path

import fitz
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, PageBreak

ROOT = Path(__file__).resolve().parent
PARTS = [ROOT / name for name in ("01-foundations.md", "02-production.md", "03-strategy-and-sources.md")]
MASTER = ROOT / "EXO_APPAREL_SOFTWARE_GAP_ATLAS_30_PAGES.md"
PDF = ROOT / "EXO_APPAREL_SOFTWARE_GAP_ATLAS_30_PAGES.pdf"
SOURCE = ROOT / "SOURCE_REGISTER.md"

fontdir = Path("/System/Library/Fonts/Supplemental")
pdfmetrics.registerFont(TTFont("Atlas", str(fontdir / "Arial.ttf")))
pdfmetrics.registerFont(TTFont("AtlasBold", str(fontdir / "Arial Bold.ttf")))
pdfmetrics.registerFontFamily("Atlas", normal="Atlas", bold="AtlasBold", italic="Atlas", boldItalic="AtlasBold")

def sources() -> dict[str, str]:
    urls = {}
    for line in SOURCE.read_text().splitlines():
        m = re.search(r"\| (S\d\d) \|[^\n]*?\]\((https?://[^)]+)\)", line)
        if m:
            urls[m.group(1)] = m.group(2)
    return urls

URLS = sources()
combined = "\n\n<!-- PAGE -->\n\n".join(p.read_text().strip() for p in PARTS)
MASTER.write_text(combined + "\n", encoding="utf8")
pages = re.split(r"\n\s*<!-- PAGE -->\s*\n", combined)
assert len(pages) == 30, f"Expected 30 sections, got {len(pages)}"
assert all(re.search(r"Page\s+\d\d", p) for p in pages)

def formatted(s: str) -> str:
    s = html.escape(s)
    s = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s)
    s = re.sub(r"`([^`]+)`", r"<font color='#4b5563'>\1</font>", s)
    s = re.sub(r"\[(S\d\d)\]", lambda m: f"<link href='{URLS[m.group(1)]}' color='#1f4d7a'>[{m.group(1)}]</link>" if m.group(1) in URLS else m.group(0), s)
    return s

def on_page(can, doc):
    can.saveState()
    w, h = A4
    if doc.page == 1:
        can.setFillColor(colors.HexColor("#0b0d12"))
        can.rect(0, 0, w, h, fill=1, stroke=0)
        can.setStrokeColor(colors.HexColor("#505c6d"))
        can.line(43, h-71, w-43, h-71)
        can.setFillColor(colors.HexColor("#9cabbf"))
        can.setFont("AtlasBold", 9)
        can.drawString(46, h-58, "EXO  /  RESEARCH & PRODUCT STRATEGY")
    else:
        can.setStrokeColor(colors.HexColor("#d7dce3"))
        can.line(43, h-57, w-43, h-57)
        can.setFillColor(colors.HexColor("#5b6574"))
        can.setFont("AtlasBold", 7.7)
        can.drawString(44, h-45, "EXO  /  APPAREL SOFTWARE GAP ATLAS")
        can.drawRightString(w-44, h-45, "17 OCT 2026")
    can.setFillColor(colors.HexColor("#8b94a3" if doc.page == 1 else "#5b6574"))
    can.setFont("Atlas", 7.6)
    can.drawString(44, 33, "RESEARCH EDITION  •  COMPANION SOURCE REGISTER AVAILABLE")
    can.drawRightString(w-44, 33, f"{doc.page:02d} / 30")
    can.restoreState()

class AtlasDoc(BaseDocTemplate):
    pass

def make_doc():
    doc = AtlasDoc(str(PDF), pagesize=A4, leftMargin=44, rightMargin=44,
                   topMargin=72, bottomMargin=53, title="EXO Apparel Software Gap Atlas | 30-page Research",
                   author="EXO ClothCraft V2 Research", subject="Grading, garment CAD and manufacturing software gaps")
    frame = Frame(44, 53, A4[0]-88, A4[1]-125, leftPadding=0, bottomPadding=0, rightPadding=0, topPadding=0)
    doc.addPageTemplates(PageTemplate(id="atlas", frames=frame, onPage=on_page))
    return doc

def render(font_size: float, leading: float) -> int:
    body = ParagraphStyle("Body", fontName="Atlas", fontSize=font_size, leading=leading,
                          textColor=colors.HexColor("#29313d"), spaceAfter=9.0,
                          allowWidows=0, allowOrphans=0, alignment=TA_LEFT)
    title = ParagraphStyle("Title", fontName="AtlasBold", fontSize=17.5,
                           leading=21, spaceAfter=18, textColor=colors.HexColor("#101826"))
    cover = ParagraphStyle("Cover", fontName="AtlasBold", fontSize=29,
                           leading=36, spaceAfter=28, textColor=colors.HexColor("#ffffff"))
    coverbody = ParagraphStyle("CoverBody", parent=body, fontSize=12.5, leading=19,
                               spaceAfter=18, textColor=colors.HexColor("#d1d9e4"))
    story = []
    for i, section in enumerate(pages):
        if i: story.append(PageBreak())
        for block in re.split(r"\n\s*\n", section):
            block = block.strip()
            if not block: continue
            if block.startswith("# ") or block.startswith("## "):
                head = re.sub(r"^#+\s+", "", block)
                story.append(Paragraph(formatted(head), cover if i == 0 else title))
            else:
                txt = " ".join(line.strip() for line in block.splitlines())
                story.append(Paragraph(formatted(txt), coverbody if i == 0 else body))
    make_doc().build(story)
    with fitz.open(PDF) as result:
        return len(result)

last = None
for size, leading in [(10.2,14.5),(9.8,13.8),(9.5,13.2),(9.25,12.7),(9.0,12.3)]:
    count = render(size, leading)
    last = (size, leading, count)
    print(f"font {size} leading {leading}: {count} PDF pages")
    if count == 30:
        break
else:
    raise RuntimeError(f"Could not fit 30 sections to 30 pages: {last}")

with fitz.open(PDF) as f:
    for i, page in enumerate(f):
        text = page.get_text()
        if len(text.strip()) < 280:
            print(f"WARNING: page {i+1} unusually little text: {len(text.strip())} characters")
    print("PDF rendered:", PDF, "pages:", len(f), "bytes:", PDF.stat().st_size)
print("Master markdown:", MASTER, "words:", len(MASTER.read_text().split()))
