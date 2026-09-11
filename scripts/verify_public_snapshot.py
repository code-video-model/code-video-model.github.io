"""Verify published media hashes and live scene entry/source dependencies."""
import argparse
import hashlib
import json
import os
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote

repo = Path(__file__).resolve().parents[1]
if os.name == 'nt': repo = Path('\\\\?\\' + str(repo))
parser = argparse.ArgumentParser()
parser.add_argument('--staged', action='store_true')
args = parser.parse_args()
site = repo / 'project-page-template'
stage = repo / '.local-sync/public-20260910/files' if args.staged else site
missing = []; conflicts = []; verified = set(); cases = set()

def locate(relative):
    path = stage / relative
    return path if path.is_file() else site / relative

def check(relative, expected=None):
    if relative in verified and not expected: return
    path = locate(relative)
    if not path.is_file(): missing.append(relative); return
    if expected:
        with path.open('rb') as f: actual = hashlib.file_digest(f, 'sha256').hexdigest()
        if actual != expected: conflicts.append(relative)
    verified.add(relative)

class References(HTMLParser):
    def handle_starttag(self, tag, attrs):
        for key,value in attrs:
            if not value or not (key in ('src','href','poster') or key.startswith(('data-src','data-poster'))): continue
            url=urlsplit(value)
            if url.scheme or url.netloc or not url.path: continue
            value=unquote(url.path).lstrip('/')
            if re.search(r'\.(?:js|mjs|css|json|html|mp4|png|jpg|svg|webp)$',value): check(value)

for page in ['index.html','gallery.html']:
    References().feed(locate(page).read_text(encoding='utf-8'))
manifest=json.loads(locate('static/project-page-cases/prompts.json').read_text(encoding='utf-8'))
items={str(item['case_id']):item for item in manifest['items']}

def scene(directory, expected):
    prefix='static/interactive/'+directory
    if prefix in cases: return
    cases.add(prefix)
    path=locate(prefix+'case.json')
    if not path.is_file(): missing.append(prefix+'case.json'); return
    data=json.loads(path.read_text(encoding='utf-8'))
    if data['threejs_sha256']!=expected: conflicts.append(prefix+'case.json:threejs_sha256')
    check(prefix+data['entry'])
    for source in data['sources']: check(prefix+source['path'],source.get('sha256'))

for identity,item in items.items():
    for field,hashfield in [('threejs_video','threejs_sha256'),('reference_image','reference_image_sha256'),('display_code_video_model','display_code_video_model_sha256')]:
        if item.get(field): check('static/project-page-cases/'+item[field], item.get(hashfield))
    scene(item.get('interactive_source',identity+'/'),item['threejs_sha256'])
registry=json.loads(locate('static/interactive/experiment-pairs.json').read_text(encoding='utf-8'))
for pair in registry['pairs']:
    if pair['id'] in registry.get('hidden_pairs',[]): continue
    for identity,asset in pair['assets'].items():
        for field,hashfield in [('threejs_video','threejs_sha256'),('video','sha256')]:
            if asset.get(field): check('static/project-page-cases/'+asset[field],asset.get(hashfield))
        directory=asset.get('interactive_source',items[identity].get('interactive_source',identity+'/'))
        scene(directory,asset['threejs_sha256'])
print(json.dumps({'published_cases':len(items),'source_packages':len(cases),'verified_files':len(verified),'missing':sorted(set(missing)),'hash_conflicts':sorted(set(conflicts))},indent=2))
raise SystemExit(1 if missing or conflicts else 0)
