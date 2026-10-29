"""Development-only parity check against an EXTERNALLY TRUSTED PDF reference.

The caller must establish independent reference provenance; supplying a PDF
extracted from the candidate's untrusted archive defeats that trust boundary.
Neither PDF is evidence of exporter correctness or manufacturing fitness.
"""
import base64
import importlib.util
import json
import math
from pathlib import Path
import sys

import fitz

MAX_INPUT = 4200000
MAX_DRAWINGS = 12000
MAX_ITEMS = 40000
MAX_TEXT = 10000
MAX_RASTER_PIXELS = 2500000
MAX_RASTER_SCALE = 1.0

spec = importlib.util.spec_from_file_location(
    'factory_pdf_hardened', Path(__file__).with_name(
        'factoryZipIndependentRasterHardened20261024_1854.py'))
hardened = importlib.util.module_from_spec(spec)
spec.loader.exec_module(hardened)


def normalized(value):
    if value is None or isinstance(value, (str, bool, int)):
        return value
    if isinstance(value, float):
        if not math.isfinite(value):
            raise ValueError('nonfinite vector parameter')
        return round(value, 4)
    if isinstance(value, (fitz.Point, fitz.Rect, fitz.Quad, tuple, list)):
        return [normalized(v) for v in value]
    if isinstance(value, dict):
        return {str(k): normalized(v) for k, v in sorted(value.items())}
    raise ValueError('unsupported vector parameter')


def drawing_inventory(raw):
    document = fitz.open(stream=raw, filetype='pdf')
    inventory = []
    total_drawings = total_items = 0
    for page in document:
        # Images and annotations/links can introduce visual changes outside path
        # parity; deny them instead of silently treating them as equivalent.
        if page.get_images(full=True) or page.get_image_info() or page.first_annot or page.get_links():
            raise ValueError('unsupported image, annotation, or link')
        if len(page.get_text('text')) > MAX_TEXT:
            raise ValueError('text character budget')
        blocks = page.get_text('dict')['blocks']
        if any(block['type'] != 0 for block in blocks):
            raise ValueError('unsupported embedded image block')
        # Compare authored calibration labels and annotation text in addition
        # to vector paths. Text changes are visible content changes too.
        text_items = normalized(blocks)
        drawings = page.get_drawings()
        total_drawings += len(drawings)
        if total_drawings > MAX_DRAWINGS:
            raise ValueError('vector drawing count budget')
        operations = []
        for drawing in drawings:
            total_items += len(drawing['items'])
            if total_items > MAX_ITEMS:
                raise ValueError('vector item count budget')
            if any(item[0] not in ('l', 're') for item in drawing['items']):
                raise ValueError('unsupported vector drawing geometry')
            # seqno is a rendering-engine ordinal, while every actual drawing
            # primitive and visual property remains part of the comparison.
            operations.append(normalized({k: v for k, v in drawing.items()
                                          if k != 'seqno'}))
        inventory.append({'drawings': operations, 'text': text_items})
    return inventory, total_drawings, total_items


def raster_inventory(raw):
    """Compare renderer-visible ink, including clipping absent from drawings."""
    document = fitz.open(stream=raw, filetype='pdf')
    result = []
    for page_index, page in enumerate(document, start=1):
        width, height = page.rect.width, page.rect.height
        if not all(math.isfinite(v) and v > 0 for v in (width, height)):
            raise ValueError('invalid raster dimensions')
        scale = min(MAX_RASTER_SCALE, math.sqrt(MAX_RASTER_PIXELS / (width * height)))
        # PyMuPDF rounds dimensions up; guard the actual worst-case allocation.
        while math.ceil(width * scale + 1) * math.ceil(height * scale + 1) > MAX_RASTER_PIXELS:
            scale *= 0.99
        estimated = math.ceil(width * scale + 1) * math.ceil(height * scale + 1)
        if estimated > MAX_RASTER_PIXELS or scale <= 0:
            raise ValueError('raster pixel budget')
        pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale),
                              colorspace=fitz.csGRAY, alpha=False)
        if pix.width * pix.height > MAX_RASTER_PIXELS or pix.n != 1:
            raise ValueError('raster output budget')
        result.append((pix.width, pix.height, bytes(pix.samples)))
    return result


def verify(request):
    if not isinstance(request, dict) or len(json.dumps(request)) > MAX_INPUT:
        raise ValueError('request byte budget')
    arguments = {key: request[key] for key in ('pages', 'width', 'length', 'contours')}
    payloads = []
    for key in ('referencePdf', 'candidatePdf'):
        encoded = request[key]
        if not isinstance(encoded, str) or len(encoded) > ((hardened.MAX_PDF + 2) // 3) * 4 + 8:
            raise ValueError(f'{key} encoded byte budget')
        raw = base64.b64decode(encoded, validate=True)
        if not raw or len(raw) > hardened.MAX_PDF:
            raise ValueError(f'{key} byte budget')
        arguments['pdf'] = encoded
        hardened.verify(arguments)
        payloads.append(raw)
    first, first_count, first_items = drawing_inventory(payloads[0])
    second, second_count, second_items = drawing_inventory(payloads[1])
    if first != second:
        for page_index, (ref, candidate) in enumerate(zip(first, second), start=1):
            if ref != candidate:
                raise ValueError(f'vector/text parity mismatch on page {page_index}: reference {len(ref["drawings"])} drawings, candidate {len(candidate["drawings"])} drawings')
        raise ValueError('vector parity page mismatch')
    reference_rasters = raster_inventory(payloads[0])
    candidate_rasters = raster_inventory(payloads[1])
    for page_index, (reference, candidate) in enumerate(zip(reference_rasters, candidate_rasters), start=1):
        if reference != candidate:
            raise ValueError(f'whole-page raster parity mismatch on page {page_index}')
    if len(reference_rasters) != len(candidate_rasters):
        raise ValueError('whole-page raster page count mismatch')
    return {'pages': len(first), 'drawings': first_count, 'items': first_items,
            'candidateDrawings': second_count, 'candidateItems': second_items}


if __name__ == '__main__':
    try:
        body = sys.stdin.buffer.read(MAX_INPUT + 1)
        if len(body) > MAX_INPUT:
            raise ValueError('request byte budget')
        result = verify(json.loads(body))
        print(json.dumps({'ok': True, **result}))
    except Exception as exc:
        print(json.dumps({'ok': False, 'reason': str(exc)}))
        sys.exit(1)
