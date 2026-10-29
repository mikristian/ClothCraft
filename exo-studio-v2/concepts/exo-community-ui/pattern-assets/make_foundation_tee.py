"""CC0 EXO Foundation Tee SAMPLE pattern from blender_bridge fixture geometry.

Produces tiled, actual-size A4 and US Letter PDFs. These are printable *sample*
cut outlines and are explicitly not graded, fit-tested or factory certified.
The fixture's quadratic curves and notch references are preserved; output is
independent of the original garment/project file.
"""
from pathlib import Path
import json
import math
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.colors import HexColor

ROOT=Path(__file__).resolve().parents[3]
FIXTURE=ROOT/'blender_bridge/fixtures/tee.garment.json'
OUT=Path(__file__).parent
CM=72/2.54
INK=HexColor('#172531')
MUTED=HexColor('#647685')
ACCENT=HexColor('#a37545')
SOURCE=json.loads(FIXTURE.read_text())

def quad(a, ctrl, b, t):
    return ((1-t)**2*a[0]+2*(1-t)*t*ctrl[0]+t*t*b[0],
            (1-t)**2*a[1]+2*(1-t)*t*ctrl[1]+t*t*b[1])

def sample_edges(piece):
    points=[(float(p['x']),float(p['y'])) for p in piece['points']]
    edges=[]
    for i,a in enumerate(points):
        b=points[(i+1)%len(points)]
        ctrl=piece.get('curves',{}).get(str(i))
        if ctrl:
            control=(float(ctrl['cx']),float(ctrl['cy']))
            edges.append([quad(a,control,b,j/26) for j in range(27)])
        else:
            edges.append([a,b])
    return edges

def ring_from_edges(edges):
    return [point for edge in edges for point in edge[:-1]]

def closed_area(ring):
    return sum(ring[i][0]*ring[(i+1)%len(ring)][1]-ring[(i+1)%len(ring)][0]*ring[i][1] for i in range(len(ring)))/2

def outset(ring,cm=1.):
    """Bounded vertex-normal offset of the densely sampled sewing path.

    Angular joins are mitered to at most 2.5x allowance. Approximate cut
    polygons therefore need a physical sample fit check before production.
    """
    ccw=closed_area(ring)>0
    out=[]
    n=len(ring)
    for i,p in enumerate(ring):
        prior=ring[(i-1)%n]
        following=ring[(i+1)%n]
        vx=p[0]-prior[0];vy=p[1]-prior[1]
        wx=following[0]-p[0];wy=following[1]-p[1]
        vl=math.hypot(vx,vy) or 1
        wl=math.hypot(wx,wy) or 1
        sign=1 if ccw else -1
        n1=(sign*vy/vl,-sign*vx/vl)
        n2=(sign*wy/wl,-sign*wx/wl)
        bis=(n1[0]+n2[0],n1[1]+n2[1])
        dot=(bis[0]*n2[0]+bis[1]*n2[1])
        if abs(dot)<.1:
            dx,dy=n2[0]*cm,n2[1]*cm
        else:
            dx,dy=bis[0]*cm/dot,bis[1]*cm/dot
            length=math.hypot(dx,dy)
            if length>cm*2.5:dx*=cm*2.5/length;dy*=cm*2.5/length
        out.append((p[0]+dx,p[1]+dy))
    return out

def clip_fold(ring):
    """Clip around center-front/back fold line x=0 (no SA on fold)."""
    result=[]
    for idx,p in enumerate(ring):
        q=ring[(idx+1)%len(ring)]
        pi=p[0]>=0
        qi=q[0]>=0
        if pi:result.append(p)
        if pi!=qi:
            t=-p[0]/(q[0]-p[0])
            result.append((0,p[1]+t*(q[1]-p[1])))
    return result

def trace(c,ring):
    path=c.beginPath()
    path.moveTo(ring[0][0]*CM,ring[0][1]*CM)
    for x,y in ring[1:]:path.lineTo(x*CM,y*CM)
    path.close()
    c.drawPath(path,stroke=1,fill=0)

def arrow(c,x,y_top,y_bottom):
    c.line(x,y_top,x,y_bottom)
    for y,sign in [(y_top,1),(y_bottom,-1)]:
        p=c.beginPath();p.moveTo(x-8,y-sign*13);p.lineTo(x,y);p.lineTo(x+8,y-sign*13)
        c.drawPath(p)

def grainline(c,ring,fold):
    xs=[p[0] for p in ring];ys=[p[1] for p in ring]
    x=(12 if fold else 0)*CM
    y0=(min(ys)+18)*CM;y1=(min(ys)+35)*CM
    c.setStrokeColor(ACCENT);c.setLineWidth(1.2);arrow(c,x,y1,y0)
    c.setFillColor(ACCENT);c.setFont('Helvetica-Bold',8)
    c.drawCentredString(x,y0-14,'GRAINLINE / PARALLEL TO SELVEDGE')
    c.setFillColor(INK);c.setStrokeColor(INK)

def draw_outline(c,item):
    ring=item['cut']
    c.setLineWidth(1.15);c.setStrokeColor(INK);trace(c,ring)
    c.setDash(4,3);c.setLineWidth(.65);c.setStrokeColor(MUTED);trace(c,item['sew'])
    c.setDash([]);c.setStrokeColor(INK)
    if item['fold']:
        ys=[p[1] for p in ring if abs(p[0])<1e-5]
        low,high=min(ys),max(ys)
        c.setLineWidth(1.8);c.setStrokeColor(ACCENT)
        c.line(0,low*CM,0,high*CM)
        for y in (low+5,high-5):
            c.line(0,y*CM,6,y*CM-6);c.line(0,y*CM,6,y*CM+6)
        c.setStrokeColor(INK)
    grainline(c,ring,item['fold'])
    # Place the source edge-referenced sewing notch on its exact edge location,
    # retaining single-front vs double-back conventions.
    for notch in item['piece'].get('notches',[]):
        edge=item['edges'][notch['edgeIndex']]
        t=float(notch['t'])*(len(edge)-1)
        idx=min(len(edge)-2,int(t));fraction=t-idx
        x=edge[idx][0]*(1-fraction)+edge[idx+1][0]*fraction
        y=edge[idx][1]*(1-fraction)+edge[idx+1][1]*fraction
        if item['fold'] and x<0:continue
        p=(x*CM,y*CM)
        c.setStrokeColor(ACCENT);c.setLineWidth(1)
        for dy in ([0,5] if notch.get('type')=='double' else [0]):
            c.line(p[0]-6,p[1]+dy-6,p[0]+6,p[1]+dy+6)
        c.setStrokeColor(INK)
    xs=[p[0] for p in ring];ys=[p[1] for p in ring]
    c.setFillColor(INK);c.setFont('Helvetica-Bold',12)
    cx=(min(xs)+max(xs))/2*CM
    c.drawCentredString(cx,(min(ys)+12)*CM,item['title'].upper())
    c.setFont('Helvetica',8)
    c.drawCentredString(cx,(min(ys)+10)*CM,item['cut_note'])

def prepare():
    items=[]
    for index,title,fold,cut_note in [
        (0,'Front',True,'CUT 1 ON FOLD'),(1,'Back',True,'CUT 1 ON FOLD'),
        (2,'Sleeve',False,'CUT 2 MIRRORED · LONG SLEEVE SAMPLE')]:
        piece=SOURCE['pieces'][index]
        edges=sample_edges(piece)
        sew=ring_from_edges(edges)
        cut=outset(sew,1.0)
        if fold:cut=clip_fold(cut);sew=clip_fold(sew)
        assert len(cut)>=6 and len(sew)>=6
        items.append({'piece':piece,'edges':edges,'sew':sew,'cut':cut,'title':title,'fold':fold,'cut_note':cut_note})
    return items

def cover(c,size,paper,items):
    w,h=size
    c.setFillColor(INK);c.rect(0,h-120,w,120,fill=1,stroke=0)
    c.setFillColor(HexColor('#fffaf2'));c.setFont('Helvetica-Bold',11)
    c.drawString(35,h-36,'EXO / ORIGINAL OPEN SEWING PATTERN')
    c.setFont('Helvetica-Bold',29);c.drawString(35,h-77,'FOUNDATION TEE')
    c.setFont('Helvetica',10);c.drawString(35,h-98,'Print-at-home long-sleeve sample / Source EXO fixture')
    c.setFillColor(INK);y=h-155
    lines=[
        'FREE / CC0 1.0  -  SHARE, CHANGE OR SELL DERIVATIVES',
        f'Paper: {paper}  |  Pattern units: centimetres  |  Print at 100%, no scaling',
        'Source: blender_bridge/fixtures/tee.garment.json (EXO Foundation Tee)',
        'Front and back half patterns are CUT ON FOLD. Sleeve is full width, cut 2 mirrored.',
        'All cut lines include an APPROXIMATE 10 mm outward allowance; fold edge has none.',
        'Dashed interior path = original EXO sewing path, solid exterior = proposed cut path.',
        'Curves are sampled from the fixture; selected notches come from source edge indices.',
        'This is ONE ungraded design sample, with NO fit, seam or ease verification.',
        '',
        'PRINT / ASSEMBLE',
        '1  Print every tile at actual size, with pages upright; disable fit-to-page.',
        '2  Check the 50 mm square below with a physical ruler.',
        '3  Assemble pages by pattern name and tile coordinates (A1, B1 ...).',
        '4  Adjacent tiles overlap 10 mm. Align crosshair marks; tape only once aligned.',
        '5  Cut on solid exterior and transfer fold lines and notches to the fabric.',
        '',
        'SEWING / TRIAL GARMENT',
        '1  Use a stretch knit and stabilize the shoulder seam as needed.',
        '2  Sew front and back at shoulder seams, right sides together.',
        '3  Attach each sleeve to its matching armhole; match single/double notches.',
        '4  Sew sides and underarms. Finish neckline with a measured knit binding.',
        '5  Finish sleeve and body hems with preferred knit technique.',
        '6  Test neck opening, armhole and sleeve ease on a toile before wearing.',
        '',
        'License: creativecommons.org/publicdomain/zero/1.0/',
        'NOT FACTORY CERTIFIED. Dimensions have not been fit-tested on humans.',
    ]
    for line in lines:
        if y<80:break
        bold=line.startswith(('FREE','PRINT /','SEWING /','NOT FACTORY'))
        c.setFont('Helvetica-Bold' if bold else 'Helvetica',9 if bold else 8)
        c.drawString(35,y,line);y-=17 if bold else 14
    x=w-180;y=50
    c.setLineWidth(1);c.setStrokeColor(ACCENT)
    c.rect(x,y,50/25.4*72,50/25.4*72,fill=0,stroke=1)
    c.setFont('Helvetica',8);c.setFillColor(MUTED);c.drawCentredString(x+70,y-12,'50 x 50 mm scale check')
    c.showPage()

def pages(c,size,paper,items):
    w,h=size
    margin_x=12/25.4*72;bottom=16/25.4*72;top=21/25.4*72
    draw_w=w-2*margin_x;draw_h=h-bottom-top
    step_w=draw_w-10/25.4*72;step_h=draw_h-10/25.4*72
    for item in items:
        points=item['cut']
        xmin=min(p[0] for p in points);xmax=max(p[0] for p in points)
        ymin=min(p[1] for p in points);ymax=max(p[1] for p in points)
        # The source x and y coordinates are physical cm; both sewing and
        # cut paths undergo the same fixed translation. Drawing is 1:1.
        origin_x=(xmin-1)*CM;origin_y=(ymin-1)*CM
        bound_w=(xmax-xmin+2)*CM;bound_h=(ymax-ymin+2)*CM
        columns=max(1,math.ceil((bound_w-draw_w)/step_w)+1)
        rows=max(1,math.ceil((bound_h-draw_h)/step_h)+1)
        for row in range(rows):
            for col in range(columns):
                name=f'{"ABCDEF"[col]}{row+1}'
                c.setPageSize(size)
                c.setFillColor(INK);c.setFont('Helvetica-Bold',13)
                c.drawString(margin_x,h-29,f'EXO / {item["title"].upper()} / {name}')
                c.setFont('Helvetica',8);c.setFillColor(MUTED)
                c.drawRightString(w-margin_x,h-27,f'{paper} · TILE {col+1}/{columns} x {row+1}/{rows} · PRINT 100%')
                c.setStrokeColor(MUTED);c.setDash(3,3)
                c.rect(margin_x,bottom,draw_w,draw_h)
                c.setDash([])
                for x in (margin_x,margin_x+draw_w):
                    for y in (bottom,bottom+draw_h):
                        c.setStrokeColor(ACCENT);c.line(x-5,y,x+5,y);c.line(x,y-5,x,y+5)
                c.saveState()
                clip=c.beginPath();clip.rect(margin_x,bottom,draw_w,draw_h)
                c.clipPath(clip,stroke=0,fill=0)
                c.translate(margin_x-origin_x-col*step_w,bottom-origin_y-row*step_h)
                # draw_outline maps EXO's source centimetres to PDF points;
                # this translation only changes the printed tile viewport.
                draw_outline(c,item)
                c.restoreState()
                c.setFillColor(MUTED);c.setFont('Helvetica',7)
                c.drawString(margin_x,12,'SOURCE: EXO FOUNDATION TEE R1 / sample geometry · fit unverified')
                c.drawRightString(w-margin_x,12,'10 mm OVERLAP / ALIGN CROSSES')
                c.showPage()

def main():
    items=prepare()
    for paper,size in [('a4',A4),('letter',letter)]:
        path=OUT/f'exo-foundation-tee-{paper}-cc0.pdf'
        c=canvas.Canvas(str(path),pagesize=size,pageCompression=1)
        c.setTitle(f'EXO Foundation Tee original CC0 sample sewing pattern / {paper.upper()} tiled')
        c.setAuthor('EXO ClothCraft')
        cover(c,size,paper.upper(),items)
        pages(c,size,paper.upper(),items)
        c.save()
        print(path.name,path.stat().st_size,'bytes')

if __name__=='__main__':main()
