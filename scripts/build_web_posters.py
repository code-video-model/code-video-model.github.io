"""Create full-resolution web delivery copies; retain native PNG source frames.

Run after regenerating native/mosaic posters. Only rewrites poster references,
never MP4s, selected frame indices, or source manifests.
"""
import json
import re
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / 'project-page-template'

def main():
    total_before = total_after = 0
    count = 0
    for directory in ['first-frames-native', 'first-person-bubbles']:
        for original in (ROOT / 'static/images' / directory).glob('*.png'):
            target = original.with_suffix('.webp')
            if not target.exists() or target.stat().st_mtime < original.stat().st_mtime:
                with Image.open(original) as image:
                    image.save(target, 'WEBP', quality=92, method=6)
            with Image.open(original) as original_image, Image.open(target) as web_image:
                assert original_image.size == web_image.size, str(original)
            total_before += original.stat().st_size
            total_after += target.stat().st_size
            count += 1
    # Keep lazy poster paths in the HTML itself so the speculative parser cannot
    # request every video poster before JavaScript has a chance to defer them.
    for name in ['index.html', 'gallery.html']:
        file = ROOT / name
        text = file.read_text(encoding='utf-8')
        text = re.sub(r'(static/images/(?:first-frames-native|first-person-bubbles)/[^"\s?]+)\.png', r'\1.webp', text)
        if name == 'index.html':
            def lazy_video(match):
                tag = match[0]
                if 'intro-standalone-video' not in tag:
                    tag = re.sub(r'(?<![\w-])poster=', 'data-poster=', tag)
                return tag
            text = re.sub(r'<video\b[^>]*>', lazy_video, text)
        file.write_text(text, encoding='utf-8')
    file = ROOT / 'static/images/mosaic-posters.json'
    records = json.loads(file.read_text(encoding='utf-8'))
    for record in records.values():
        record['src'] = record['src'].removesuffix('.png').removesuffix('.webp') + '.webp'
    file.write_text(json.dumps(records, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'images': count, 'source_bytes': total_before, 'web_bytes': total_after,
                      'saved_percent': round(100*(1-total_after/total_before), 1)}), flush=True)

if __name__ == '__main__':
    main()
