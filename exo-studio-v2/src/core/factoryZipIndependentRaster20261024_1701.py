import base64
import json
import math
import sys
import fitz

SCALE = 72 / 2.54
MAX_PDF = 1500000
MAX_PAGES = 3
MAX_PIXELS = 2500000

def verify(request):
    raw = base64.b64decode(request['pdf'], validate=True)
    if not raw or len(raw) > MAX_PDF:
        raise ValueError('PDF byte budget')
    expected = request['contours']
    if not isinstance(expected, list) or not 1 <= len(expected) <= 60:
        raise ValueError('contour count budget')
    if any(not isinstance(c, list) or not 3 <= len(c) <= 200 for c in expected):
        raise ValueError('vertex budget')
    if any(not all(isinstance(p, list) and len(p) == 2 and all(isinstance(v, (int, float)) and math.isfinite(v) for v in p) for p in c) for c in expected):
        raise ValueError('invalid expected contour')
    doc = fitz.open(stream=raw, filetype='pdf')
    if not 1 <= len(doc) <= MAX_PAGES:
        raise ValueError('page count budget')
    if len(doc) != request['pages']:
        raise ValueError('unexpected page count')
    width_cm = request['width']
    length_cm = request['length']
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
            raise ValueError(f'missing page stations: {start_type}/{end_type}')
        start, end = float(start_value), float(end_value)
        if abs(start - last_end) > 0.002 or end <= start or end > length_cm + 0.002:
            raise ValueError('page stations invalid')
        if abs(page.rect.height - (end - start) * SCALE) > 0.03:
            raise ValueError('MediaBox height mismatch')
        last_end = end
        pix = page.get_pixmap(matrix=fitz.Matrix(0.08, 0.08), alpha=False, colorspace=fitz.csGRAY)
        if pix.width * pix.height > MAX_PIXELS:
            raise ValueError('raster pixel budget')
        ink = sum(1 for pixel in pix.samples if pixel < 225)
        if ink < 3:
            raise ValueError('blank page')
        paths = page.get_drawings()
        def edge_key(a, b):
            return tuple(sorted(((round(a[0] / 0.07), round(a[1] / 0.07)), (round(b[0] / 0.07), round(b[1] / 0.07)))))
        closed_drawings = []
        for drawing in paths:
            actual_edges = {}
            only_lines = True
            for item in drawing['items']:
                edges = []
                if item[0] == 'l':
                    edges = [((item[1].x, item[1].y), (item[2].x, item[2].y))]
                elif item[0] == 're':
                    r = item[1]
                    corners = [(r.x0, r.y0), (r.x1, r.y0), (r.x1, r.y1), (r.x0, r.y1)]
                    edges = [(corners[k], corners[(k + 1) % 4]) for k in range(4)]
                else:
                    only_lines = False
                for a, b in edges:
                    key = edge_key(a, b)
                    actual_edges[key] = actual_edges.get(key, 0) + 1
            if not only_lines or not actual_edges:
                continue
            # Page border is a single full-MediaBox rectangle, never CUT geometry.
            if len(drawing['items']) == 1 and drawing['items'][0][0] == 're':
                r = drawing['items'][0][1]
                if abs(r.x0) < .1 and abs(r.y0) < .1 and abs(r.x1 - page.rect.width) < .1 and abs(r.y1 - page.rect.height) < .1:
                    continue
            degrees = {}
            for (a, b), count in actual_edges.items():
                degrees[a] = degrees.get(a, 0) + count
                degrees[b] = degrees.get(b, 0) + count
            if len(degrees) >= 3 and all(degree == 2 for degree in degrees.values()):
                closed_drawings.append(actual_edges)
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
            for drawing_index, edges in enumerate(closed_drawings):
                if edges == needed:
                    closed_drawings.pop(drawing_index)
                    matches[contour_index] = True
                    found_this_page += 1
                    break
        if closed_drawings:
            raise ValueError(f'unexpected extra closed CUT-like paths: {len(closed_drawings)}')
        output.append({'page': index + 1, 'width_pt': round(page.rect.width, 3), 'height_pt': round(page.rect.height, 3), 'ink_pixels': ink, 'cut_paths_matched': found_this_page})
    if abs(last_end - length_cm) > 0.002:
        raise ValueError('incomplete page stations')
    if not all(matches):
        raise ValueError(f'CUT geometry mismatch: {sum(not m for m in matches)} unmatched contours')
    return {'pages': output, 'matched': sum(matches)}

try:
    payload = json.load(sys.stdin)
    result = verify(payload)
    print(json.dumps({'ok': True, **result}))
except Exception as exc:
    print(json.dumps({'ok': False, 'reason': str(exc)}))
    sys.exit(1)
