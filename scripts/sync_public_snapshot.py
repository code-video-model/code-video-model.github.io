"""Stage an explicit public site's static dependency graph; never delete local files."""
import argparse
import hashlib
import json
import os
import re
import shutil
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from html.parser import HTMLParser
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
if os.name == 'nt' and not str(REPO).startswith('\\\\?\\'):
    REPO = Path('\\\\?\\' + str(REPO))
SITE = REPO / 'project-page-template'
EXT = re.compile(r'\.(?:html|css|js|mjs|json|txt|png|jpg|jpeg|svg|webp|mp4|webm|pdf|woff2?|glb|gltf|bin|obj|mtl|wasm)(?:[?#].*)?$', re.I)
TEXT = {'.html', '.css', '.js', '.mjs', '.json', '.txt'}

class Links(HTMLParser):
    def __init__(self):
        super().__init__(); self.values = []
    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if value and (key in ('href', 'src', 'poster') or key.startswith('data-')):
                self.values.append(value)

def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--origin', required=True)
    parser.add_argument('--snapshot', required=True)
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--apply-only', action='store_true', help='Apply a completed, already reviewed snapshot without downloading again')
    args = parser.parse_args()
    origin = args.origin.rstrip('/') + '/'
    stage = (REPO / '.local-sync' / args.snapshot).resolve()
    if not stage.is_relative_to(REPO / '.local-sync'):
        raise ValueError('Snapshot must be a local name')
    files = stage / 'files'; files.mkdir(parents=True, exist_ok=True)
    report_path = stage / 'report.json'
    report = json.loads(report_path.read_text(encoding='utf-8')) if report_path.exists() else {'origin': origin, 'files': {}, 'errors': {}, 'directories': []}
    assert report['origin'] == origin
    done = set(); queued = set(); pending = set(); expected = {}

    def add(value, parent='index.html', directory=False):
        value = value.strip()
        if not value or value.startswith(('#', 'data:', 'blob:', 'mailto:')) or '${' in value or '\\' in value:
            return
        if value.startswith('static/'): value = '/' + value
        url = urllib.parse.urljoin(origin + parent, value)
        parsed = urllib.parse.urlsplit(url)
        if parsed.netloc != urllib.parse.urlsplit(origin).netloc: return
        relative = urllib.parse.unquote(parsed.path).lstrip('/')
        if not relative: relative = 'index.html'
        if any(part in ('.', '..') or part.startswith('.') for part in Path(relative).parts): return
        if not (directory and relative.endswith('/')) and not EXT.search(relative): return
        if relative not in queued:
            queued.add(relative); pending.add(relative)

    def json_links(obj, parent):
        if parent in ('static/interactive/experiment-pairs.json', 'static/images/application-previews/manifest.json', 'static/images/first-person-bubbles/manifest.json'):
            parent = 'static/project-page-cases/prompts.json'
        if isinstance(obj, dict):
            for key, value in obj.items():
                if isinstance(value, str) and EXT.search(value):
                    hash_key = 'threejs_sha256' if key == 'threejs_video' else key + '_sha256'
                    sha = obj.get(hash_key)
                    if not sha and key in ('path', 'url', 'file', 'video'): sha = obj.get('sha256')
                    if isinstance(sha, str) and re.fullmatch('[0-9a-f]{64}', sha):
                        href = '/' + value if value.startswith('static/') else value
                        url = urllib.parse.urljoin(origin + parent, href)
                        if urllib.parse.urlsplit(url).netloc == urllib.parse.urlsplit(origin).netloc:
                            expected[urllib.parse.unquote(urllib.parse.urlsplit(url).path).lstrip('/')] = sha
            for key, value in obj.items():
                if key in ('source_page', 'source_path', 'original_path', 'output_path'): continue
                if key == 'interactive_source' and isinstance(value, str):
                    add('static/interactive/' + value, directory=True)
                elif isinstance(value, str) and EXT.search(value) and not re.search(r'\s', value):
                    if value.startswith(('/data', '/home', '/mnt', 'C:', '/workspace')): continue
                    add(value, parent)
                elif key in ('path', 'file') and isinstance(value, str): add(value, parent)
                else: json_links(value, parent)
        elif isinstance(obj, list):
            for value in obj: json_links(value, parent)
        elif isinstance(obj, str) and EXT.search(obj) and not re.search(r'\s', obj): add(obj, parent)

    def discover(relative, data):
        suffix = Path(relative).suffix.lower()
        if relative.endswith('/') or suffix in TEXT:
            try: text = data.decode('utf-8-sig')
            except UnicodeError: return
            if '<title>Directory listing for ' in text:
                links = Links(); links.feed(text)
                for value in links.values: add(value, relative, directory=True)
                return
            if suffix == '.html' or relative.endswith('/'):
                links = Links(); links.feed(text)
                for value in links.values: add(value, relative)
            if suffix == '.json':
                try:
                    obj = json.loads(text); json_links(obj, relative)
                    if relative == 'static/project-page-cases/prompts.json':
                        for item in obj['items']:
                            directory = item.get('interactive_source', str(item['case_id']) + '/')
                            add('static/interactive/' + directory, directory=True)
                except ValueError: pass
            # Literal browser URLs and ES module imports; ignore templates and provenance prose.
            for value in re.findall(r'''["']([^"'\r\n]+)["']''', text):
                if EXT.search(value) and not re.search(r'\s', value):
                    if value.startswith(('static/', './', '../')): add(value, relative if not value.startswith('static/') else 'index.html')
            for value in re.findall(r'url\(\s*[\"\']?([^\)\"\']+)', text): add(value, relative)

    def fetch(relative):
        target = files / relative
        if not relative.endswith('/') and relative in report['files'] and target.exists():
            return relative, target.read_bytes(), report['files'][relative], None
        if not relative.endswith('/') and target.is_file():
            data = target.read_bytes()
            return relative, data, {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(), 'resumed': True}, None
        local = SITE / relative
        if not relative.endswith('/') and relative in expected and local.is_file() and digest(local) == expected[relative]:
            data = local.read_bytes()
            return relative, data, {'bytes': len(data), 'sha256': expected[relative], 'verified_from': 'remote manifest hash'}, None
        for attempt in range(3):
            try:
                req = urllib.request.Request(origin + urllib.parse.quote(relative, safe='/'), headers={'User-Agent': 'ProjectPageSync/1.0'})
                with urllib.request.urlopen(req, timeout=60) as response:
                    data = response.read()
                    info = {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(), 'last_modified': response.headers.get('Last-Modified')}
                return relative, data, info, None
            except urllib.error.HTTPError as exc:
                if exc.code in (404,403,401): return relative, None, None, str(exc)
                error = str(exc)
            except Exception as exc: error = str(exc)
        return relative, None, None, error

    for relative in ['index.html','gallery.html','group23-pairs.html','seedvr-comparison.html', 'static/js/','static/css/',
                     'static/demo/','static/images/application-previews/manifest.json','static/project-page-cases/prompts.json',
                     'static/interactive/catalog.json','static/interactive/experiment-pairs.json','static/interactive/vendors/']:
        add(relative, directory=relative.endswith('/'))
    if args.apply_only:
        if not report.get('delta'): raise RuntimeError('Snapshot scan must finish before apply-only')
        pending.clear()
    with ThreadPoolExecutor(max_workers=8) as pool:
        while pending:
            batch = sorted(pending, key=lambda p: (0 if p.endswith('/') or Path(p).suffix in TEXT else 1, p)); pending.clear()
            print(f'Fetch batch {len(batch)}; completed {len(done)}', flush=True)
            for future in as_completed([pool.submit(fetch, relative) for relative in batch]):
                relative, data, info, error = future.result(); done.add(relative)
                if len(done) % 25 == 0: print(f'Processed {len(done)}: {relative}', flush=True)
                if error:
                    report['errors'][relative] = error; continue
                report['errors'].pop(relative, None)
                if relative.endswith('/'):
                    if '<title>Directory listing for ' not in data.decode('utf-8', errors='replace'):
                        index = relative + 'index.html'
                        target = files / index; target.parent.mkdir(parents=True, exist_ok=True); target.write_bytes(data)
                        report['files'][index] = info
                    report['directories'].append(relative)
                else:
                    target = files / relative; target.parent.mkdir(parents=True, exist_ok=True); target.write_bytes(data)
                    report['files'][relative] = info
                discover(relative, data)
                if len(done) % 25 == 0: report_path.write_text(json.dumps(report, indent=2), encoding='utf-8')
            report['checked_at'] = time.strftime('%Y-%m-%dT%H:%M:%S')
            report_path.write_text(json.dumps(report, indent=2), encoding='utf-8')
    changed = []; new = []; unchanged = 0
    for relative, info in report['files'].items():
        target = SITE / relative
        if not target.exists(): new.append(relative)
        elif digest(target) != info['sha256']: changed.append(relative)
        else: unchanged += 1
    report['delta'] = {'changed': changed, 'new': new, 'unchanged': unchanged}
    if args.apply or args.apply_only:
        backup = stage / 'backup'
        for relative in changed + new:
            if digest(files / relative) != report['files'][relative]['sha256']:
                raise RuntimeError(f'Staged file changed: {relative}')
        for relative in changed:
            saved = backup / relative
            if saved.exists(): raise RuntimeError(f'Backup already exists: {relative}')
            saved.parent.mkdir(parents=True, exist_ok=True); shutil.copy2(SITE / relative, saved)
        for relative in sorted(changed + new, key=lambda p: p in ('index.html', 'gallery.html')):
            target = SITE / relative; target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(files / relative, target)
        report['applied'] = True
    report_path.write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps({'downloaded': len(report['files']), 'changed': len(changed), 'new': len(new), 'unchanged': unchanged, 'unresolved_candidates': len(report['errors']), 'report': str(report_path)}, indent=2), flush=True)

if __name__ == '__main__': main()
