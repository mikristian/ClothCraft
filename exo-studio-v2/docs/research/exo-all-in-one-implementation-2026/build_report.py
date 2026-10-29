"""Build the 30-page implementation blueprint from three owned Markdown chapters.

Requires reportlab and pymupdf. This script never touches the application source.
"""
from __future__ import annotations

import html
import re
from pathlib import Path

import fitz
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import BaseDocTemplate, Frame, PageTemplate, PageBreak, Paragraph

ROOT = Path(__file__).resolve().parent
PARTS = [ROOT / n for n in (
    "01-product-platform.md",
    "02-manufacturer-production.md",
    "03-photo-studio-and-roadmap.md",
)]
MASTER = ROOT / "EXO_ALL_IN_ONE_IMPLEMENTATION_BLUEPRINT_30_PAGES.md"
PDF = ROOT / "EXO_ALL_IN_ONE_IMPLEMENTATION_BLUEPRINT_30_PAGES.pdf"

fontdir = Path("/System/Library/Fonts/Supplemental")
pdfmetrics.registerFont(TTFont("EXO", str(fontdir / "Arial.ttf")))
pdfmetrics.registerFont(TTFont("EXOBold", str(fontdir / "Arial Bold.ttf")))
pdfmetrics.registerFontFamily("EXO", normal="EXO", bold="EXOBold", italic="EXO", boldItalic="EXOBold")

parts = [p.read_text(encoding="utf8").strip() for p in PARTS]
combined = "\n\n<!-- PAGE -->\n\n".join(parts)
MASTER.write_text(combined + "\n", encoding="utf8")
sections = re.split(r"\n\s*<!-- PAGE -->\s*\n", combined)
assert len(sections) == 30, f"Expected exactly 30 sections; found {len(sections)}"
assert all(re.search(r"Page\s+%02d\b" % (i+1), section) for i, section in enumerate(sections)), "Page sequence invalid"

def clean_inline(text: str) -> str:
    result = html.escape(text)
    result = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", result)
    result = re.sub(r"`([^`]+)`", r"<font color='#38516a'>\1</font>", result)
    # Turn bare and explicit Markdown links into clickable references, not raw markup.
    result = re.sub(r"\[([^\]]+)\]\((https?://[^)]+)\)",
                    lambda m: f'<link href="{m.group(2)}" color="#23699b">{m.group(1)}</link>', result)
    result = re.sub(r"(?<!\"|=)(https?://[^\s<]+)",
                    lambda m: f'<link href="{m.group(1).rstrip(".,;")}" color="#23699b">{m.group(1).rstrip(".,;")}</link>{m.group(1)[len(m.group(1).rstrip(".,;")):]}'
                    if not m.group(0).startswith("https://www.w3.org/") else m.group(0), result)
    return result

def section_name(page_index: int) -> str:
    return ("PLATFORM" if page_index <= 10 else "MANUFACTURING" if page_index <= 20 else "PHOTO PRODUCTION")

def draw_page(can, doc):
    can.saveState()
    w, h = A4
    first = doc.page == 1
    if first:
        can.setFillColor(colors.HexColor("#090d13"))
        can.rect(0, 0, w, h, stroke=0, fill=1)
        can.setFillColor(colors.HexColor("#e1e6ed"))
        can.setFont("EXOBold", 9)
        can.drawString(46, h - 48, "EXO CLOTHCRAFT  /  IMPLEMENTATION PROGRAM")
        can.setStrokeColor(colors.HexColor("#5e6877"))
    else:
        accent = {"PLATFORM": "#4c6b8c", "MANUFACTURING": "#166b75", "PHOTO PRODUCTION": "#76548f"}[section_name(doc.page)]
        can.setFillColor(colors.HexColor(accent))
        can.rect(44, h - 60, 3, 15, stroke=0, fill=1)
        can.setFillColor(colors.HexColor("#364350"))
        can.setFont("EXOBold", 8)
        can.drawString(53, h - 50, "EXO  /  ALL-IN-ONE IMPLEMENTATION")
        can.setFont("EXO", 7.6)
        can.drawRightString(w - 44, h - 50, section_name(doc.page))
        can.setStrokeColor(colors.HexColor("#d4dce4"))
    can.line(44, h - 68, w-44, h-68)
    can.setFillColor(colors.HexColor("#aab8c9" if first else "#68798a"))
    can.setFont("EXO", 7.4)
    can.drawString(44, 33, "DESIGN • FACTORY HUB • PHOTO STUDIO  |  17 OCT 2026")
    can.drawRightString(w-44, 33, f"{doc.page:02d} / 30")
    can.restoreState()

def make_doc():
    doc = BaseDocTemplate(str(PDF), pagesize=A4, leftMargin=44,
                          rightMargin=44, topMargin=81, bottomMargin=53,
                          title="EXO All-in-One Implementation Blueprint | 30 pages",
                          author="EXO ClothCraft V2 Strategy", subject="Living tech pack, manufacturer portal, photoshoot previsualization")
    frame = Frame(44, 53, A4[0]-88, A4[1]-134,
                  leftPadding=0, rightPadding=0, bottomPadding=0, topPadding=0)
    doc.addPageTemplates(PageTemplate(id="default", frames=frame, onPage=draw_page))
    return doc

def build(font_size: float, leading: float) -> int:
    body = ParagraphStyle("body", fontName="EXO", fontSize=font_size, leading=leading,
                          textColor=colors.HexColor("#2d3845"), spaceAfter=8.9,
                          allowWidows=0, allowOrphans=0)
    hstyle = ParagraphStyle("heading", fontName="EXOBold", fontSize=17, leading=21.5,
                           spaceAfter=16, textColor=colors.HexColor("#132338"))
    cover = ParagraphStyle("cover", fontName="EXOBold", fontSize=26, leading=33,
                          spaceAfter=29, textColor=colors.white)
    coverbody = ParagraphStyle("coverbody", parent=body, fontSize=11.7, leading=18.3,
                              spaceAfter=16, textColor=colors.HexColor("#d5dfec"))
    story=[]
    for page_i, sec in enumerate(sections):
        if page_i: story.append(PageBreak())
        for block in re.split(r"\n\s*\n", sec):
            block = block.strip()
            if not block or block == "---": continue
            if re.match(r"^#{1,2} ", block):
                story.append(Paragraph(clean_inline(re.sub(r"^#{1,2}\s+", "", block)), cover if page_i == 0 else hstyle))
            else:
                story.append(Paragraph(clean_inline(" ".join(line.strip() for line in block.splitlines())),
                                       coverbody if page_i == 0 else body))
    make_doc().build(story)
    with fitz.open(PDF) as result: return len(result)

for f, lh in ((10.2,14.6),(10.0,14.1),(9.8,13.8),(9.5,13.4),(9.25,12.9),(9.0,12.5)):
    count=build(f,lh)
    print(f"Body {f:g}pt / {lh:g} leading -> {count} PDF pages")
    if count == 30: break
else:
    raise RuntimeError(f"Unable to paginate in exactly 30 pages (last: {count})")

with fitz.open(PDF) as pdf:
    actual=[]
    for page in pdf:
        m=re.search(r"Page\s+(\d\d)\b", page.get_text())
        actual.append(int(m.group(1)) if m else 1 if page.number == 0 else -1)
        if len(page.get_text().strip()) < 350:
            raise RuntimeError(f"Page {page.number+1} appears empty")
    if actual != list(range(1,31)):
        raise RuntimeError(f"Unexpected page sequence: {actual}")
    print("VALIDATED: 30 sequential, nonempty PDF pages")
    print("PDF bytes:", PDF.stat().st_size, "Markdown words:", len(MASTER.read_text().split()))
