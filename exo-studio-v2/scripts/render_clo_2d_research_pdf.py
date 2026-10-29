#!/usr/bin/env python3
"""Render the source-linked CLO 2D research manuscript to a paginated PDF.

Uses one full chapter per page intentionally: this is a visual software
specification/reference dossier, with space for annotation and review.
"""
from pathlib import Path
from html import escape
import re

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, KeepTogether, Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs/CLO_2D_PATTERN_SYSTEM_RESEARCH_36_PAGES.md"
DEST = ROOT / "docs/CLO_2D_PATTERN_SYSTEM_RESEARCH_38_PAGES.pdf"
REG = "/System/Library/Fonts/Supplemental/Arial.ttf"
BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
if Path(REG).exists() and Path(BOLD).exists():
    pdfmetrics.registerFont(TTFont("CLOResearch", REG))
    pdfmetrics.registerFont(TTFont("CLOResearchBold", BOLD))
    pdfmetrics.registerFontFamily("CLOResearch", normal="CLOResearch", bold="CLOResearchBold")
else:
    REG = "Helvetica"
    BOLD = "Helvetica-Bold"
FONT = "CLOResearch" if Path(REG).is_file() else "Helvetica"
FONT_BOLD = "CLOResearchBold" if Path(BOLD).is_file() else "Helvetica-Bold"
INK = colors.HexColor("#1c2934")
ACCENT = colors.HexColor("#316a8b")
SOFT = colors.HexColor("#586876")


def markup(s):
    s = escape(s)
    s = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s)
    s = re.sub(r"`([^`]+)`", r"<font color='#31546b'>\1</font>", s)
    # Break long links at slash boundaries without altering the link text.
    s = re.sub(r"(https?://[^\s<]+)", lambda m: m.group(0).replace("/", "/&#8203;"), s)
    return s


styles = {
    "subtitle": ParagraphStyle("subtitle", fontName=FONT, fontSize=12, leading=19,
                               textColor=SOFT, spaceAfter=16),
    "title": ParagraphStyle("title", fontName=FONT_BOLD, fontSize=28, leading=35,
                            textColor=INK, spaceAfter=22),
    "page": ParagraphStyle("page", fontName=FONT_BOLD, fontSize=18, leading=25,
                           textColor=INK, spaceAfter=17),
    "body": ParagraphStyle("body", fontName=FONT, fontSize=9.5, leading=15.5,
                           textColor=INK, alignment=TA_LEFT, spaceAfter=13,
                           allowWidows=0, allowOrphans=0),
    "sources": ParagraphStyle("sources", fontName=FONT, fontSize=7.2, leading=10,
                              textColor=INK, spaceAfter=1, splitLongWords=True),
    "label": ParagraphStyle("label", fontName=FONT_BOLD, fontSize=9.5, leading=16,
                            textColor=ACCENT, spaceAfter=14),
}


def page_footer(canvas, doc):
    canvas.saveState()
    width, _ = letter
    canvas.setStrokeColor(colors.HexColor("#d6dee4"))
    canvas.line(53, 49, width - 53, 49)
    canvas.setFont(FONT, 8)
    canvas.setFillColor(SOFT)
    canvas.drawString(53, 34, "EXO CLOTHCRAFT / CLO 2D PATTERN RESEARCH")
    canvas.drawRightString(width - 53, 34, f"PAGE {doc.page:02d}")
    canvas.restoreState()


def generate():
    source = SOURCE.read_text(encoding="utf-8")
    matches = list(re.finditer(r"^## Page (\d+) — (.+)$", source, re.MULTILINE))
    assert len(matches) == 37, f"Expected 37 numbered chapters, got {len(matches)}"
    doc = SimpleDocTemplate(str(DEST), pagesize=letter,
                            topMargin=59, bottomMargin=66,
                            leftMargin=54, rightMargin=54,
                            title="CLO 2D Pattern System: Research and Implementation Blueprint",
                            author="ClothCraft research")
    story = [
        Spacer(1, 58),
        Paragraph("CLO 2D PATTERN SYSTEM", styles["label"]),
        Paragraph("Deep Research &amp;<br/>Implementation Blueprint", styles["title"]),
        Paragraph("37 detailed chapters · 29 linked official CLO sources · live CLO inspector review · EXO ClothCraft V2 first-panel implementation", styles["subtitle"]),
        Spacer(1, 15),
        Paragraph("Primary visual reference: Screenshot 2026-10-17 at 11:33:53 PM. The manuscript distinguishes confirmed CLO behavior, image-based observations, current EXO implementation, and engineering proposals.", styles["body"]),
        Spacer(1, 18),
        Paragraph("Focus: correctly implement one T-shirt front 2D panel, including real measurement semantics, guide selection, red double notches, shoulder relationships, seam allowances and stitch metadata, before generalizing across garments.", styles["body"]),
        Spacer(1, 18),
        Paragraph("Prepared 18 October 2026", styles["subtitle"]),
        PageBreak(),
    ]
    for i, match in enumerate(matches):
        block_start = match.end()
        block_end = matches[i + 1].start() if i + 1 < len(matches) else len(source)
        chapter_number, title = int(match.group(1)), match.group(2)
        story.append(Paragraph(f"{chapter_number:02d} / {markup(title)}", styles["page"]))
        for paragraph in re.split(r"\n\s*\n", source[block_start:block_end].strip()):
            if not paragraph.strip():
                continue
            if paragraph.startswith("### "):
                story.append(Paragraph(markup(paragraph[4:].strip()), styles["label"]))
                continue
            if paragraph.startswith("- "):
                for line in paragraph.splitlines():
                    if line.startswith("- "):
                        official = re.match(r"- \[(S\d+)\] (.+?) — (https?://\S+)$", line)
                        if official:
                            code, label, url = official.groups()
                            story.append(Paragraph(
                                f"• <link href='{escape(url,quote=True)}' color='#315e81'>[{code}] {markup(label)}</link>",
                                styles["sources"]))
                        else:
                            story.append(Paragraph("• " + markup(line[2:]), styles["sources"]))
                continue
            clean = paragraph.replace("\n", " ").strip()
            story.append(Paragraph(markup(clean), styles["body"]))
        if chapter_number == 2:
            reference = ROOT / "research/screenshots/clo-pattern-2334-reference.png"
            if reference.is_file():
                story.append(Spacer(1, 6))
                figure = Image(str(reference), width=140, height=255)
                figure.hAlign = "CENTER"
                story.append(figure)
                story.append(Paragraph(
                    "FIGURE: exact user-supplied CLO screenshot, 11:33:53 PM; line semantics require tool and property inspection.",
                    styles["sources"]))
        if i != len(matches) - 1:
            story.append(PageBreak())
    doc.build(story, onFirstPage=page_footer, onLaterPages=page_footer)
    print(f"Wrote {DEST} ({DEST.stat().st_size:,} bytes)")


if __name__ == "__main__":
    generate()
