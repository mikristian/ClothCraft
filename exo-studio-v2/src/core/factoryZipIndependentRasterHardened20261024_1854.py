"""Development-only independent PDF geometry and ink check; not factory approval.

Limitation: a three-edge open U drawn as three distinct one-segment strokes
cannot be distinguished from permitted EXO annotation strokes and may pass.
Unsupported drawing primitives, including PyMuPDF's ``qu``, fail closed.
"""
import base64
import json
import math
import sys

import fitz

SCALE = 72 / 2.54
MAX_PDF = 1500000
MAX_PAGES = 3
MAX_PIXELS = 2500000
RASTER_SCALE = 0.5


def edge_key(a, b):
    return tuple(sorted(((round(a[0] / 0.07), round(a[1] / 0.07)),
                         (round(b[0] / 0.07), round(b[1] / 0.07)))))


def visible_color(drawing):
    color = drawing.get('color')
    if color is None or drawing.get('type') not in ('s', 'fs'):
        return False
    if not isinstance(color, (tuple, list)) or len(color) != 3:
        return False
    if not all(isinstance(v, (int, float)) and math.isfinite(v) and 0 <= v <= 1 for v in color):
        return False
    if min(color) >= 0.97:
        return False
    opacity = drawing.get('stroke_opacity', 1)
    return isinstance(opacity, (int, float)) and math.isfinite(opacity) and opacity > 0.01


def raster_cut_evidence(page, drawing):
    """Require visible samples near matched CUT edges.

    Rasterization includes all page artwork. A coincident dark annotation could
    spoof this local check; the verified CUT's stroke visibility is tested
    separately. This is not a printing, separation or plotter proof.
    """
    paths = []
    for item in drawing['items']:
        if item[0] == 'l':
            paths.append((item[1], item[2]))
        elif item[0] == 're':
            r = item[1]
            pts = [fitz.Point(r.x0, r.y0), fitz.Point(r.x1, r.y0),
                   fitz.Point(r.x1, r.y1), fitz.Point(r.x0, r.y1)]
            paths.extend((pts[i], pts[(i + 1) % 4]) for i in range(4))
    if not paths:
        return False
    # Render a tight neighborhood of the path; get_pixmap includes any other
    # artwork there, so only a local presence test is possible without an
    # independently isolated redraw of the CUT path.
    clip = fitz.Rect(drawing['rect']) & page.rect
    if clip.is_empty:
        return False
    clip = (clip + (-1, -1, 1, 1)) & page.rect
    pix = page.get_pixmap(matrix=fitz.Matrix(RASTER_SCALE, RASTER_SCALE),
                          colorspace=fitz.csGRAY, alpha=False, clip=clip)
    if pix.width * pix.height > MAX_PIXELS:
        raise ValueError('CUT raster pixel budget')
    samples = pix.samples
    dark = 0
    count = 0
    for a, b in paths:
        distance = math.hypot(b.x - a.x, b.y - a.y)
        if distance < 0.2:
            continue
        for j in range(1, min(16, max(3, int(distance / 8))) + 1):
            t = j / (min(16, max(3, int(distance / 8))) + 1)
            x = a.x + (b.x - a.x) * t
            y = a.y + (b.y - a.y) * t
            ix = int((x - clip.x0) * RASTER_SCALE)
            iy = int((y - clip.y0) * RASTER_SCALE)
            if not (0 <= ix < pix.width and 0 <= iy < pix.height):
                continue
            count += 1
            if any(samples[yy * pix.stride + xx] < 225
                   for yy in range(max(0, iy - 1), min(pix.height, iy + 2))
                   for xx in range(max(0, ix - 1), min(pix.width, ix + 2))):
                dark += 1
    return count >= 3 and dark >= max(2, math.ceil(count * 0.35))


def verify(request):
    if not isinstance(request, dict):
        raise ValueError('invalid request')
    encoded = request['pdf']
    if not isinstance(encoded, str) or len(encoded) > ((MAX_PDF + 2) // 3) * 4 + 8:
        raise ValueError('PDF encoded byte budget')
    raw = base64.b64decode(encoded, validate=True)
    if not raw or len(raw) > MAX_PDF:
        raise ValueError('PDF byte budget')
    expected = request['contours']
    if not isinstance(expected, list) or not 1 <= len(expected) <= 60:
        raise ValueError('contour count budget')
    if any(not isinstance(c, list) or not 3 <= len(c) <= 200 for c in expected):
        raise ValueError('vertex budget')
    if any(not all(isinstance(p, list) and len(p) == 2 and
                   all(type(v) in (int, float) and math.isfinite(v) for v in p)
                   for p in c) for c in expected):
        raise ValueError('invalid expected contour')
    doc = fitz.open(stream=raw, filetype='pdf')
    if not 1 <= len(doc) <= MAX_PAGES or len(doc) != request['pages']:
        raise ValueError('page count mismatch or budget')
    width_cm, length_cm = request['width'], request['length']
    if not all(type(v) in (int, float) and math.isfinite(v) for v in (width_cm, length_cm)):
        raise ValueError('invalid physical dimensions')
    if not 0 < width_cm <= 300 or not 0 < length_cm <= 1000:
        raise ValueError('physical source budget')
    matches = [False] * len(expected)
    output = []
    last_end = 0.0
    for index, page in enumerate(doc):
        if page.rect.width * page.rect.height > MAX_PIXELS * 200:
            raise ValueError('page physical budget')
        if abs(page.rect.width - width_cm * SCALE) > 0.03:
            raise ValueError('MediaBox width mismatch')
        start_type, start_value = doc.xref_get_key(page.xref, 'EXOStartCm')
        end_type, end_value = doc.xref_get_key(page.xref, 'EXOEndCm')
        if start_type not in ('int', 'real', 'float') or end_type not in ('int', 'real', 'float'):
            raise ValueError('missing page stations')
        start, end = float(start_value), float(end_value)
        if not all(math.isfinite(v) for v in (start, end)) or abs(start - last_end) > 0.002 or end <= start or end > length_cm + 0.002:
            raise ValueError('page stations invalid')
        if abs(page.rect.height - (end - start) * SCALE) > 0.03:
            raise ValueError('MediaBox height mismatch')
        last_end = end
        pix = page.get_pixmap(matrix=fitz.Matrix(0.08, 0.08),
                              alpha=False, colorspace=fitz.csGRAY)
        if pix.width * pix.height > MAX_PIXELS:
            raise ValueError('raster pixel budget')
        ink = sum(pixel < 225 for pixel in pix.samples)
        if ink < 3:
            raise ValueError('blank page')
        candidates = []
        for drawing in page.get_drawings():
            edges = {}
            only_lines = True
            segments = 0
            for item in drawing['items']:
                pairs = []
                if item[0] == 'l':
                    pairs = [((item[1].x, item[1].y), (item[2].x, item[2].y))]
                elif item[0] == 're':
                    r = item[1]
                    corners = [(r.x0, r.y0), (r.x1, r.y0), (r.x1, r.y1), (r.x0, r.y1)]
                    pairs = [(corners[k], corners[(k + 1) % 4]) for k in range(4)]
                else:
                    only_lines = False
                for a, b in pairs:
                    key = edge_key(a, b)
                    edges[key] = edges.get(key, 0) + 1
                    segments += 1
            if not only_lines:
                raise ValueError('unsupported vector drawing geometry')
            if not segments:
                continue
            if len(drawing['items']) == 1 and drawing['items'][0][0] == 're':
                r = drawing['items'][0][1]
                if abs(r.x0) < .1 and abs(r.y0) < .1 and abs(r.x1 - page.rect.width) < .1 and abs(r.y1 - page.rect.height) < .1:
                    continue
            if segments == 1:
                # EXO grainlines, notches, rulers and printed registration
                # consist of separate one-segment drawing operations.
                continue
            degrees = {}
            for (a, b), count in edges.items():
                degrees[a] = degrees.get(a, 0) + count
                degrees[b] = degrees.get(b, 0) + count
            if len(degrees) < 3 or not all(degree == 2 for degree in degrees.values()):
                raise ValueError('unexpected extra open CUT-like path')
            candidates.append((edges, drawing))
        found_this_page = 0
        for contour_index, contour in enumerate(expected):
            if matches[contour_index]:
                continue
            ys = [point[1] for point in contour]
            if min(ys) < start - 0.002 or max(ys) > end + 0.002:
                continue
            points = [(x * SCALE, (y - start) * SCALE) for x, y in contour]
            keys = [edge_key(points[k], points[(k + 1) % len(points)]) for k in range(len(points))]
            needed = {key: keys.count(key) for key in set(keys)}
            for drawing_index, (edges, drawing) in enumerate(candidates):
                if edges == needed:
                    if not visible_color(drawing):
                        raise ValueError('matched CUT invisible stroke')
                    if not raster_cut_evidence(page, drawing):
                        raise ValueError('matched CUT has no local raster evidence')
                    candidates.pop(drawing_index)
                    matches[contour_index] = True
                    found_this_page += 1
                    break
        if candidates:
            raise ValueError(f'unexpected extra closed CUT-like paths: {len(candidates)}')
        output.append({'page': index + 1, 'width_pt': round(page.rect.width, 3),
                       'height_pt': round(page.rect.height, 3), 'ink_pixels': ink,
                       'cut_paths_matched': found_this_page})
    if abs(last_end - length_cm) > 0.002:
        raise ValueError('incomplete page stations')
    if not all(matches):
        raise ValueError(f'CUT geometry mismatch: {sum(not m for m in matches)} unmatched contours')
    return {'pages': output, 'matched': sum(matches)}


if __name__ == '__main__':
    try:
        payload = json.load(sys.stdin)
        result = verify(payload)
        print(json.dumps({'ok': True, **result}))
    except Exception as exc:
        print(json.dumps({'ok': False, 'reason': str(exc)}))
        sys.exit(1)
