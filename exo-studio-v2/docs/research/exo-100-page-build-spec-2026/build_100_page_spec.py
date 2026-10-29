"""Generate EXO ClothCraft V2's exact 100-page implementation specification.

Reads four editable, numbered Markdown chapter files and writes the unified
Markdown and a searchable, bookmarked, text PDF. Never edits application code.
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
from reportlab.platypus import BaseDocTemplate, Frame, PageTemplate, PageBreak, Paragraph, Spacer

ROOT = Path(__file__).resolve().parent
PARTS = [
    ROOT / "01-platform-01-25.md",
    ROOT / "02-factory-26-50.md",
    ROOT / "03-photo-51-75.md",
    ROOT / "04-delivery-76-100.md",
]
MARKDOWN = ROOT / "EXO_100_PAGE_BUILD_SPEC_2026.md"
PDF = ROOT / "EXO_100_PAGE_BUILD_SPEC_2026.pdf"
TOC = ROOT / "TABLE_OF_CONTENTS.md"

fontroot = Path("/System/Library/Fonts/Supplemental")
pdfmetrics.registerFont(TTFont("EXOBody", str(fontroot / "Arial.ttf")))
pdfmetrics.registerFont(TTFont("EXOBold", str(fontroot / "Arial Bold.ttf")))
pdfmetrics.registerFontFamily("EXOBody", normal="EXOBody", bold="EXOBold",
                              italic="EXOBody", boldItalic="EXOBold")

for path in PARTS:
    if not path.exists():
        raise FileNotFoundError(f"Expected chapter not yet complete: {path}")

text = "\n\n<!-- PAGE -->\n\n".join(
    path.read_text(encoding="utf-8").strip() for path in PARTS
)
pages = re.split(r"\n\s*<!-- PAGE -->\s*\n", text)
assert len(pages) == 100, f"Expected 100 source pages, found {len(pages)}"
titles: list[str] = []
for i, section in enumerate(pages, start=1):
    m = re.search(r"^## Page (\d+) \| (.+)$", section, flags=re.M)
    assert m and int(m.group(1)) == i, f"Page heading sequence failed at {i}"
    titles.append(m.group(2).strip())
    words = len(section.split())
    assert 190 <= words <= 520, f"Page {i} unusually sparse or long ({words} words)"

MARKDOWN.write_text(
    "# EXO ClothCraft V2 | 100-Page Build Specification\n\n"
    "**Version:** 2026-10-17 research and implementation specification. "
    "**Status:** proposed requirements and architectural decisions; "
    "not a claim that the integrated service is implemented.\n\n"
    "This main file consists of exactly 100 numbered sections. Refer to "
    "`README.md` and `TRACEABILITY_86_GAPS.md` for source references, "
    "existing capability gaps, test coverage and delivery approach.\n\n"
    + text + "\n", encoding="utf-8"
)

def formatted(source: str) -> str:
    s = html.escape(source)
    # Links first; then formatting. Avoid HTML parsing of user files.
    s = re.sub(
        r"\[([^\]]+)\]\((https?://[^)]+)\)",
        lambda m: f'<link href="{m.group(2)}" color="#246a98">{m.group(1)}</link>',
        s
    )
    s = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s)
    s = re.sub(r"`([^`]+)`", r"<font color='#486781'>\1</font>", s)
    return s

def chapter(n: int) -> str:
    if n <= 25: return "01 / FOUNDATIONS + NATIVE DESIGN"
    if n <= 50: return "02 / MANUFACTURER + TECH PACK"
    if n <= 75: return "03 / VIRTUAL + REAL PHOTO STUDIO"
    return "04 / PLATFORM DELIVERY + QA"

PAGE_W, PAGE_H = A4
def on_page(can, doc):
    n = doc.page
    can.saveState()
    if n == 1:
        can.setFillColor(colors.HexColor("#080c13"))
        can.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
        can.setFillColor(colors.HexColor("#a8b6c8"))
        can.setFont("EXOBold", 9)
        can.drawString(44, PAGE_H-46, "EXO CLOTHCRAFT V2  /  ENGINEERING SPECIFICATION")
        can.setStrokeColor(colors.HexColor("#697384"))
    else:
        accent = "#536b89" if n<=25 else "#1e7a78" if n<=50 else "#7c638f" if n<=75 else "#986b37"
        can.setFillColor(colors.HexColor(accent))
        can.rect(43, PAGE_H-55, 4, 13, fill=1, stroke=0)
        can.setFillColor(colors.HexColor("#394c60"))
        can.setFont("EXOBold", 8)
        can.drawString(54, PAGE_H-50, "EXO  /  100-PAGE BUILD SPEC")
        can.setFont("EXOBody", 7.7)
        can.drawRightString(PAGE_W-43, PAGE_H-50, chapter(n))
        can.setStrokeColor(colors.HexColor("#d2d9df"))
    can.line(43, PAGE_H-68, PAGE_W-43, PAGE_H-68)
    can.setFillColor(colors.HexColor("#a7b4c5" if n==1 else "#667788"))
    can.setFont("EXOBody", 7.7)
    can.drawString(43, 30, "SOURCE-GROUNDED IMPLEMENTATION CONTRACT  |  17 OCT 2026")
    can.drawRightString(PAGE_W-43, 30, f"{n:03d} / 100")
    can.restoreState()

def make_doc():
    doc = BaseDocTemplate(
        str(PDF), pagesize=A4, leftMargin=43, rightMargin=43,
        topMargin=81, bottomMargin=50,
        title="EXO ClothCraft V2 | 100-Page Build Specification",
        author="EXO ClothCraft V2 implementation research",
        subject="Garment CAD, Factory Hub, Tech Pack, Photo Studio and Quality/Deployment"
    )
    frame = Frame(43, 50, PAGE_W-86, PAGE_H-130,
                  leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
    doc.addPageTemplates(PageTemplate(id="default", frames=frame, onPage=on_page))
    return doc

def render(font_size: float, leading: float) -> int:
    body = ParagraphStyle(
        "body", fontName="EXOBody", fontSize=font_size, leading=leading,
        textColor=colors.HexColor("#2d3946"), spaceAfter=9.0,
        allowWidows=0, allowOrphans=0
    )
    heading = ParagraphStyle(
        "section-heading", fontName="EXOBold", fontSize=16.1, leading=20,
        spaceAfter=16, textColor=colors.HexColor("#112337")
    )
    cover_heading = ParagraphStyle(
        "cover-heading", fontName="EXOBold", fontSize=23, leading=30,
        spaceAfter=22, textColor=colors.HexColor("#ffffff")
    )
    cover_body = ParagraphStyle(
        "cover-body", parent=body, fontSize=11.1, leading=17.8,
        textColor=colors.HexColor("#e0e7f1"), spaceAfter=14
    )
    story = []
    for page_i, raw in enumerate(pages):
        if page_i:
            story.append(PageBreak())
        blocks = [block.strip() for block in re.split(r"\n\s*\n", raw) if block.strip()]
        for block in blocks:
            if block.startswith("## Page "):
                title = re.sub(r"^##\s+", "", block)
                story.append(Paragraph(formatted(title),
                                       cover_heading if page_i == 0 else heading))
                continue
            # Normalize any standalone Markdown bullets / code blocks to text.
            joined = " ".join(
                line.lstrip(" -\t") if line.startswith("- ") else line.strip()
                for line in block.splitlines()
            )
            story.append(Paragraph(formatted(joined),
                                   cover_body if page_i == 0 else body))
    make_doc().build(story)
    with fitz.open(PDF) as pdf:
        return len(pdf)

last = None
for font_size, leading in [
    (10.4, 14.9), (10.1, 14.4), (9.8, 13.9),
    (9.5, 13.4), (9.2, 12.9), (8.9, 12.5),
]:
    count = render(font_size, leading)
    last = (font_size, leading, count)
    print(f"Candidate body font {font_size}, leading {leading}: {count} pages")
    if count == 100:
        break
else:
    raise RuntimeError(f"Could not fit exactly 100 PDF pages: {last}")

bookmarks: list[list[str | int]] = []
chapter_names = {
    1: "Foundations and native garment engineering",
    26: "Living manufacturer tech pack and factory production",
    51: "Virtual photography and real-world shoot planning",
    76: "Cloud platform, security, delivery and quality",
}
for i, title in enumerate(titles, start=1):
    if i in chapter_names:
        bookmarks.append([1, chapter_names[i], i])
    bookmarks.append([2, f"{i:03d} | {title}", i])

with fitz.open(PDF) as pdf:
    assert len(pdf) == 100
    for n, page in enumerate(pdf, start=1):
        rendered_text = page.get_text()
        assert re.search(r"Page\s+%02d\s*\|" % n, rendered_text), (
            f"Expected section heading absent from physical PDF page {n}"
        )
        assert len(rendered_text.strip()) >= 1000, (
            f"Suspiciously sparse page {n}: {len(rendered_text.strip())} chars"
        )
    pdf.set_toc(bookmarks)
    pdf.saveIncr()

TOC.write_text(
    "# EXO 100-page build spec: table of contents\n\n"
    + "\n".join(
        (f"\n## {chapter_names[i]}\n" if i in chapter_names else "")
        + f"- Page {i:03d}: {name}"
        for i, name in enumerate(titles, start=1)
    ) + "\n",
    encoding="utf-8"
)

print("FINAL:", PDF, PDF.stat().st_size, "bytes")
print("MARKDOWN:", MARKDOWN, len(MARKDOWN.read_text().split()), "words")
print("TOC:", TOC, "100 numbered entries")
