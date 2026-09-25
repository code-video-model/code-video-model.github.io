"""Publish the requested Fern delivery and restore the existing Cook Spinach card."""
import argparse
import html
import json
import os
from pathlib import Path
import re
import subprocess

from PIL import Image
from import_selected_products import copy_exact, read, sha, write

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / 'project-page-template'
SECTION = 'reconstruction-3d-4d'


def publish(bundle):
    manifest = read(bundle / 'delivery-manifest.json')
    expected = {r['path']: r['sha256'] for r in manifest['files']}
    modules = ['case/scene.mjs', 'case/runtime.mjs', 'case/camera-path.mjs']
    needed = [manifest['recommendedMedia'], manifest['generationProxy'], 'references/reference-frame.png',
              'prompts/seedance25.prompt.txt', 'threejs/spec.json', 'threejs/vendor/three.module.js']
    needed += ['threejs/' + name for name in modules]
    for name in needed:
        assert sha(bundle / name) == expected[name], name
    watched = [SITE / 'gallery.html', SITE / 'static/project-page-cases/prompts.json',
               SITE / 'static/interactive/catalog.json', SITE / 'static/images/mosaic-posters.json',
               SITE / 'static/images/poster-selections.json', ROOT / 'scripts/data/case-catalog.json']
    before = {p: p.read_bytes() for p in watched}
    backup = ROOT / '.local-import/fern-cook-20260922/before'
    for p, contents in before.items():
        dest = backup / p.relative_to(ROOT)
        if not dest.exists():
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(contents)
    prompts, catalog, mosaics, selections = [read(p) for p in watched[1:5]]
    case = 'astra-fern-safe'
    paths = {}
    for key, name, suffix in [('threejs_video', manifest['generationProxy'], 'mp4'),
                              ('code_video_model', manifest['recommendedMedia'], 'mp4'),
                              ('reference_image', 'references/reference-frame.png', 'png')]:
        relative = f'fern/{key}-{expected[name][:16]}.{suffix}'
        copy_exact(bundle / name, SITE / 'static/project-page-cases' / relative, expected[name])
        paths[key] = relative
    proxy_sha, output_sha = expected[manifest['generationProxy']], expected[manifest['recommendedMedia']]
    media_info = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height,r_frame_rate,nb_frames', '-of', 'json',
        str(bundle / manifest['recommendedMedia'])]))['streams'][0]
    fps_num, fps_den = map(int, media_info['r_frame_rate'].split('/'))
    spec = read(bundle / 'threejs/spec.json')
    package = SITE / 'static/interactive' / case
    sources = []
    for name in modules:
        original = bundle / 'threejs' / name
        copy_exact(original, package / 'original' / name, expected['threejs/' + name])
        code = original.read_text()
        sources.append({'path': 'original/' + name, 'name': name, 'sha256': sha(original),
                        'functions': [{'name': m[1], 'line': code[:m.start()].count('\n') + 1}
                                      for m in re.finditer(r'(?:async\s+)?function\s+(\w+)\s*\(', code)]})
        if name == 'case/runtime.mjs':
            code += '\n// Project-page capture adapter; the original source is unchanged.\n'
            code += 'const __pageRender = renderer.render.bind(renderer);\n'
            code += 'renderer.render = (s,c) => { if (!window.__bfSampling) return __pageRender(s,c); };\n'
            code += 'window.__bfCapture = {THREE, renderer, scene, camera};\n'
        runtime = package / 'runtime' / name
        runtime.parent.mkdir(parents=True, exist_ok=True)
        runtime.write_text(code)
    # Runtime only consumes these fields. Do not publish the delivery's private photo paths.
    public_spec = {'target': spec['target'], 'normalization': {'viewport': spec['normalization']['viewport']}}
    vendor = SITE / 'static/interactive/vendors/seedance/three.module.js'
    copy_exact(bundle / 'threejs/vendor/three.module.js', vendor, expected['threejs/vendor/three.module.js'])
    for kind in ('original', 'runtime'):
        write(package / kind / 'spec.json', public_spec)
        folder = package / kind / 'vendor'
        folder.mkdir(parents=True, exist_ok=True)
        relative = Path(os.path.relpath(vendor, folder)).as_posix()
        (folder / 'three.module.js').write_text(f"export * from '{relative}';\n")
        copy_exact(SITE / 'static/interactive/vendors/seedance/LICENSE.threejs', folder / 'LICENSE.threejs')
    entry = package / 'runtime/case/index.html'
    hook = Path(os.path.relpath(SITE / 'static/js/scene-host.js', entry.parent)).as_posix()
    entry.write_text('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Fern</title>'
                    f'<script src="{hook}"></script><style>html,body{{margin:0;overflow:hidden}}'
                    'canvas{display:block}</style></head><body><canvas id="proxy"></canvas>'
                    '<script type="module" src="./runtime.mjs"></script></body></html>\n')
    prompt = (bundle / 'prompts/seedance25.prompt.txt').read_text().strip()
    provenance = {'package': bundle.name, 'delivery_manifest_sha256': sha(bundle / 'delivery-manifest.json'),
                  'source_spec_sha256': expected['threejs/spec.json'], 'runtime_spec_fields': ['target', 'normalization.viewport'],
                  'source_program_sha256': sources[0]['sha256'], 'result_sha256': output_sha,
                  'input_fps': spec['target']['fps'], 'output_fps': fps_num / fps_den,
                  'proxy_role': 'Original RGB generation input; no material override or recoloring.',
                  'timeline': 'Original output clock; scene clamps to its authored 10-second duration.',
                  'publication_requested': '2026-09-22', 'runtime_parameters': {'renderOverride': 'rgb'}}
    write(package / 'case.json', {'case_id': case, 'session': '3D / 4D Reconstruction', 'prompt': prompt,
          'width': spec['target']['width'], 'height': spec['target']['height'], 'fps': fps_num / fps_den,
          'frames': int(media_info['nb_frames']), 'entry': 'runtime/case/index.html?renderOverride=rgb',
          'threejs_sha256': proxy_sha, 'sources': sources, 'provenance': provenance})
    record = {'case_id': case, 'session': '3D / 4D Reconstruction', 'title': 'Fern', 'source_prompt': prompt,
              **paths, 'threejs_sha256': proxy_sha, 'code_video_model_sha256': output_sha,
              'reference_image_sha256': expected['references/reference-frame.png'],
              'display_code_video_model': paths['code_video_model'], 'display_code_video_model_sha256': output_sha,
              'display_code_video_model_setting': bundle.name, 'interactive_source': case + '/',
              'gallery_visible': False, 'source_package_status': manifest['status'],
              'source_creative_accepted': manifest['creativeAccepted'], 'display_code_video_model_provenance': provenance}
    prompts['items'] = [r for r in prompts['items'] if r['case_id'] != case] + [record]
    catalog['cases'] = [r for r in catalog['cases'] if r['case_id'] != case] + [{'case_id': case, 'session': record['session']}]
    cook = next(r for r in prompts['items'] if r['case_id'] == 'astra-cook-spinach')
    cook['gallery_visible'] = True
    cards = []
    for item, title in [(cook, 'Cook Spinach')]:
        cid = item['case_id']
        video = SITE / 'static/project-page-cases' / item['display_code_video_model']
        digest = item['display_code_video_model_sha256']
        assert sha(video) == digest
        poster = SITE / f'static/images/first-frames-native/{digest}-frame000024.png'
        if not poster.exists():
            subprocess.run(['ffmpeg', '-v', 'error', '-nostdin', '-n', '-i', str(video), '-vf',
                            'select=eq(n\\,24)', '-frames:v', '1', '-pix_fmt', 'rgb24', '-update', '1', str(poster)], check=True)
        image = Image.open(poster).convert('RGB')
        webp = poster.with_suffix('.webp')
        if not webp.exists():
            image.save(webp, lossless=True, method=6)
        mosaics[f'{SECTION}|{cid}||'] = {'src': webp.relative_to(SITE).as_posix()}
        selections[video.relative_to(SITE).as_posix()] = {'frame_index': 24, 'note': 'Original one-second output frame.'}
        color = ', '.join(map(str, image.resize((1, 1)).getpixel((0, 0))))
        quantized = image.resize((64, 36)).quantize(colors=4)
        values = quantized.getpalette()
        palette = [values[i * 3:i * 3 + 3] for _, i in sorted(quantized.getcolors(), reverse=True)]
        image.thumbnail((384, 216))
        thumb = SITE / f'static/images/first-person-bubbles/{cid}-{digest[:12]}.webp'
        image.save(thumb, quality=88, method=6)
        cards.append(f'<div class="fps-bubble-float"><a class="case-explore fps-case-bubble" href="?case={cid}" '
                     f'data-case="{cid}" data-title="{title}" data-color="{color}" '
                     f'data-palette="{html.escape(json.dumps(palette), quote=True)}" aria-label="Open {title}" '
                     f'aria-controls="{SECTION}-expanded" aria-expanded="false" style="--case-rgb: {color}">'
                     f'<img src="{thumb.relative_to(SITE).as_posix()}" width="{image.width}" height="{image.height}" alt="" loading="lazy"></a></div>')
    page = before[watched[0]].decode()
    eol = '\r\n' if '\r\n' in page else '\n'
    section = re.search(r'<section\b[^>]*id="' + SECTION + r'"[\s\S]*?</section>', page)
    assert section
    fragment = section[0]
    start, end = '<!-- fern-cook:start -->', '<!-- fern-cook:end -->'
    block = start + eol + eol.join(cards) + eol + end + eol
    if start in fragment:
        fragment = re.sub(re.escape(start) + r'[\s\S]*?' + re.escape(end) + r'\r?\n?', lambda _: block, fragment)
    else:
        boundary = fragment.rfind('</div>', 0, fragment.index(f'<div id="{SECTION}-expanded"'))
        assert boundary >= 0
        fragment = fragment[:boundary] + block + fragment[boundary:]
    page = page[:section.start()] + fragment + page[section.end():]
    for p, content in before.items():
        assert p.read_bytes() == content, f'Concurrent edit: {p}'
    prompts['count'], catalog['count'] = len(prompts['items']), len(catalog['cases'])
    for p, data in zip(watched[1:5], [prompts, catalog, mosaics, selections]):
        write(p, data)
    watched[0].write_bytes(page.encode())
    subprocess.run(['python3', str(ROOT / 'scripts/build_case_catalog.py')], check=True)
    print('Published Fern and restored Cook Spinach; all other gallery visibility choices retained.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--bundle', type=Path, required=True)
    publish(parser.parse_args().bundle.resolve())
