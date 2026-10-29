#!/usr/bin/env python3
"""Archive public YouTube preview frames for private EXO tech-pack UI research.

Downloads small official storyboard sprites, not the full copyrighted streams.
Keeps original video URLs so the references remain directly attributable.
"""
import hashlib
import html
import io
import json
import math
import re
import time
from pathlib import Path

import requests
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1] / 'research/techpack-library/youtube-techpack-20261025'
VIDEOS = {
    'jA9QSVEnfVE': {'title': 'How to Create a Clothing Tech pack in Clo3d | 3d clothing design software', 'channel': '383 Design Studio', 'requested_start': 143},
    'tPlynHhOXuU': {'title': 'How I Create Clothing Tech Pack | Beginner Tutorial', 'channel': 'Onelusion Hub', 'requested_start': 0},
}


def obtain(url, session, limit=4_000_000):
    for attempt in range(3):
        try:
            reply = session.get(url, timeout=17)
            reply.raise_for_status()
            if len(reply.content) > limit:
                raise RuntimeError(f'Oversized response {len(reply.content)}')
            return reply.content
        except requests.RequestException:
            if attempt == 2:
                raise
            time.sleep(.7 * (attempt + 1))


def archive(video_id, session):
    info = VIDEOS[video_id]
    directory = ROOT / video_id
    frames_directory = directory / 'frames'
    frames_directory.mkdir(parents=True, exist_ok=True)
    page = obtain(f'https://www.youtube.com/watch?v={video_id}', session, limit=3_000_000).decode('utf-8', errors='replace')
    match = re.search(r'"storyboards":\{"playerStoryboardSpecRenderer":\{"spec":"([^\"]+)', page)
    if not match:
        raise RuntimeError('YouTube did not provide a storyboard; video URL retained for manual review')
    parts = html.unescape(match.group(1)).replace('\\u0026', '&').split('|')
    level, attrs = len(parts)-2, parts[-1].split('#')
    if len(attrs) != 8:
        raise RuntimeError('Unexpected YouTube storyboard format')
    width, height, frame_count, columns, rows, interval_ms = map(int, attrs[:6])
    # Every requested video is used for UI research, so choose its highest-
    # resolution storyboard without fetching the entire stream.
    if frame_count < 10 or frame_count > 1200 or columns*rows > 150:
        raise RuntimeError('Storyboard dimensions outside bounded archive contract')
    interval_ms = interval_ms or 5000
    base = parts[0].replace('$L', str(level))
    signature = attrs[-1]
    n = attrs[-2]
    manifest = {'video_id': video_id, 'title': info['title'], 'channel': info['channel'],
                'watch_url': f'https://www.youtube.com/watch?v={video_id}',
                'requested_start_seconds': info['requested_start'],
                'capture_type': 'official YouTube storyboard preview frames',
                'full_video_downloaded': False, 'source_rights': 'third-party preview frames, local private analysis only',
                'frame_interval_seconds': interval_ms / 1000,
                'total_frame_count': frame_count, 'tile_size': [width, height], 'frames': []}
    for sprite_index in range(math.ceil(frame_count / (columns * rows))):
        ref = n.replace('$M', str(sprite_index))
        url = base.replace('$N', ref) + '&sigh=' + signature
        raw = obtain(url, session)
        sprite_path = directory / f'storyboard-{sprite_index:02}.jpg'
        sprite_path.write_bytes(raw)
        with Image.open(io.BytesIO(raw)) as sheet:
            sheet = sheet.convert('RGB')
            for cell in range(columns * rows):
                position = sprite_index*columns*rows + cell
                if position >= frame_count:
                    break
                col, row = cell % columns, cell // columns
                image = sheet.crop((col*width,row*height,(col+1)*width,(row+1)*height))
                file = frames_directory / f'frame-{position:03}-{round(position*interval_ms/1000):04}s.jpg'
                image.save(file, 'JPEG', quality=88)
                manifest['frames'].append({'file': 'frames/'+file.name,
                    'time_seconds': position * interval_ms / 1000,
                    'sha256': hashlib.sha256(file.read_bytes()).hexdigest()})
    # Contact sheets are an index of source video chronology, not a claim
    # about exact source playback frames (YouTube may omit sections).
    selected = [manifest['frames'][i] for i in range(0,len(manifest['frames']),3)]
    across = 5
    cell_w, cell_h = 220, 147
    thumb = Image.new('RGB', (across*cell_w, math.ceil(len(selected)/across)*cell_h), 'white')
    draw = ImageDraw.Draw(thumb)
    for i,row in enumerate(selected):
        im = Image.open(directory / row['file']).convert('RGB')
        im.thumbnail((cell_w-10,cell_h-24))
        x=(i%across)*cell_w + 5
        y=(i//across)*cell_h + 4
        thumb.paste(im,(x,y))
        draw.text((x,y+cell_h-22), f"{row['time_seconds']/60:.1f} min · frame {i*3}", fill='#223344')
    thumb.save(directory / 'contact-sheet.jpg', quality=88)
    manifest['contact_sheet'] = 'contact-sheet.jpg'
    (directory / 'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    (directory / 'README.md').write_text(f"# {info['title']}\n\nSource: {manifest['watch_url']}\n\nChannel: {info['channel']}\n\nStored: {frame_count} official preview frames ({width}×{height}), sprite sheets and visual index. "
        "This is not a full MP4 archive and is not guaranteed to cover every video edit. "
        "Internal UI research only; source copyrights remain with the creators.\n")
    print(video_id, f'{frame_count} frames', f'{width}x{height}', 'sprites', math.ceil(frame_count/(columns*rows)),
          'bytes', sum(p.stat().st_size for p in directory.rglob('*') if p.is_file()))


if __name__ == '__main__':
    ROOT.mkdir(parents=True, exist_ok=True)
    client = requests.Session()
    client.headers['User-Agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    for video in VIDEOS:
        try:
            archive(video, client)
        except Exception as error:
            print(video, 'UNAVAILABLE:', type(error).__name__, str(error)[:250])
