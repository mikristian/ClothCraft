"""Original CC0 sewing pattern. Requires reportlab; run from this directory."""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.colors import HexColor

OUT = Path(__file__).with_name('exo-drawstring-pouch-a4-letter.pdf')
INK = HexColor('#202b36')
MUTED = HexColor('#677988')

def line(c, x1, y1, x2, y2, dash=None):
    c.setDash(dash or [])
    c.line(x1, y1, x2, y2)
    c.setDash([])

def page(c, size, name):
    w, h = size
    mm = 72 / 25.4
    c.setPageSize(size)
    c.setStrokeColor(INK)
    c.setFillColor(INK)
    c.setFont('Helvetica-Bold', 13)
    c.drawString(18, h-25, 'EXO / ORIGINAL SEWING PATTERN')
    c.setFont('Helvetica', 8)
    c.drawRightString(w-18, h-24, name + '  |  PRINT 100% / ACTUAL SIZE')
    c.setFont('Helvetica-Bold', 10)
    c.drawString(18, h-42, 'DRAWSTRING POUCH  /  20 x 25 cm CUT PANEL')
    # Full size 200 x 250 mm cut outline, positioned with printable margins.
    x = (w - 200*mm)/2
    y = 25
    c.setLineWidth(1.15)
    c.rect(x, y, 200*mm, 250*mm)
    c.setLineWidth(.55)
    c.setStrokeColor(MUTED)
    # Finished seam placement, 10 mm from sides and bottom.
    line(c, x+10*mm, y+10*mm, x+190*mm, y+10*mm, [4,3])
    line(c, x+10*mm, y+10*mm, x+10*mm, y+250*mm, [4,3])
    line(c, x+190*mm, y+10*mm, x+190*mm, y+250*mm, [4,3])
    # Fold twice: 10mm then 20mm, forming 20mm casing.
    for offset, caption in [(10, 'FIRST FOLD 10 mm'), (30, 'SECOND FOLD / CASING 20 mm')]:
        yy = y+(250-offset)*mm
        line(c, x, yy, x+200*mm, yy, [3,3])
        c.setFont('Helvetica', 7)
        c.drawCentredString(x+100*mm, yy-9, caption)
    c.setStrokeColor(INK)
    c.setFillColor(INK)
    c.setFont('Helvetica-Bold', 9)
    c.drawCentredString(x+100*mm, y+125*mm, 'CUT 2 IDENTICAL PANELS')
    c.setFont('Helvetica', 8)
    c.drawCentredString(x+100*mm, y+117*mm, 'Cut outline includes all seam and casing allowances')
    # Physical print calibration square.
    c.rect(x+12*mm, y+14*mm, 20*mm, 20*mm)
    c.setFont('Helvetica', 7)
    c.drawString(x+35*mm, y+22*mm, '20 x 20 mm calibration square')
    c.setFont('Helvetica', 7)
    c.drawString(18, 12, 'CC0 1.0 / ORIGINAL EXO PATTERN  •  Verify calibration before cutting')
    c.showPage()

def instructions(c):
    w,h=A4
    c.setPageSize(A4)
    c.setFillColor(INK)
    c.setFont('Helvetica-Bold', 18)
    c.drawString(40,h-55,'DRAWSTRING POUCH')
    c.setFont('Helvetica', 10)
    lines=[
      'A simple beginner woven-fabric pouch. All measurements are metric.',
      'Finished flat size: approximately 18 cm wide x 21 cm high.',
      'Cut: 2 panels from stable woven fabric using either page 1 (A4) or page 2 (Letter).',
      'Notions: two cords, each 55 cm long; matching thread; safety pin.',
      'Allowances: 10 mm side/bottom seam; 10 mm + 20 mm double-fold top casing.',
      '',
      '1. Print at actual size (100%). Measure the 20 mm calibration square.',
      '2. Cut two identical panels. Finish side and bottom raw edges if fabric frays.',
      '3. On each panel, press the top raw edge 10 mm to the wrong side, then 20 mm.',
      '4. Stitch each folded casing close to its lower folded edge. Keep both ends open.',
      '5. Place panels right sides together. Stitch sides and bottom 10 mm from cut edge.',
      '   Begin stitching immediately below each casing, leaving casing ends unsewn.',
      '6. Turn right side out and press corners gently.',
      '7. Thread first cord through front casing left-to-right and back casing right-to-left.',
      '   Tie its ends together at the left. Repeat second cord from the opposite side.',
      '8. Pull both cord loops to close. Test seams before carrying anything heavy.',
      '',
      'This is an original, freely reusable teaching pattern released under CC0 1.0.',
      'No graded sizes or factory fit certification are claimed.',
      'License: https://creativecommons.org/publicdomain/zero/1.0/',
    ]
    yy=h-83
    for item in lines:
        c.setFont('Helvetica',9)
        c.drawString(40,yy,item)
        yy-=19 if item else 12
    c.showPage()

def main():
    c=canvas.Canvas(str(OUT),pagesize=A4,pageCompression=1)
    c.setTitle('EXO Original Drawstring Pouch — A4 and US Letter Sewing Pattern')
    c.setAuthor('EXO Clothcraft')
    page(c,A4,'PAGE 1 / A4')
    page(c,letter,'PAGE 2 / US LETTER')
    instructions(c)
    c.save()
    print(OUT, OUT.stat().st_size, 'bytes')

if __name__=='__main__':
    main()
