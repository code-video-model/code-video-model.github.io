"""Import the three accepted demo cases, retaining their exact media/source bindings."""
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
CASES = {
    'rally-hairpin': ('rally', 'Rally Hairpin', 'long-horizon-style', 'Bullet Time'),
    'cockatiel-flight': ('cockatiel', 'Cockatiel Flight', 'control-world-states', 'Gaming'),
    'fishing-lake-strike': ('fishing', 'Lake Fishing', 'control-world-states', 'Gaming'),
}


def import_cases(public, deliveries):
    manifest = public / 'assets/v9/manifest.json'
    assets = read(manifest)
    registry_paths = {
        'prompts': SITE / 'static/project-page-cases/prompts.json',
        'catalog': SITE / 'static/interactive/catalog.json',
        'mosaics': SITE / 'static/images/mosaic-posters.json',
        'selections': SITE / 'static/images/poster-selections.json',
    }
    before = {p: p.read_bytes() for p in [*registry_paths.values(), SITE / 'gallery.html']}
    data = {key: read(path) for key, path in registry_paths.items()}
    cards = {}
    bindings = []
    # Refuse changed inputs before publishing anything.
    for key, *_ in CASES.values():
        asset = assets[key]
        for kind in ('proxy', 'output'):
            assert sha(public / asset[kind]['src']) == asset[kind]['sha256'], (key, kind)
        assert sha(public / asset['sourceFile']) == asset['sourceSha256'], key

    for case, (key, title, section, session) in CASES.items():
        asset = assets[key]
        package = SITE / 'static/interactive' / case
        delivery = deliveries / asset['package']
        delivery_meta = read(delivery / 'delivery-manifest.json')
        assert delivery_meta['finalOutputSha256'] == asset['output']['sha256']
        paths, posters = {}, {}
        for kind, label in [('proxy', 'threejs'), ('output', 'output')]:
            media = asset[kind]
            relative = f'seedance/{case}/{label}-{media["sha256"][:16]}.mp4'
            target = SITE / 'static/project-page-cases' / relative
            copy_exact(public / media['src'], target, media['sha256'])
            paths[kind] = relative
            frame = round(media['fps'])
            png = SITE / f'static/images/first-frames-native/{media["sha256"]}-frame{frame:06d}.png'
            if not png.exists():
                subprocess.run(['ffmpeg', '-v', 'error', '-nostdin', '-n', '-i', str(target),
                                '-vf', f'select=eq(n\\,{frame})', '-frames:v', '1', '-pix_fmt', 'rgb24',
                                '-update', '1', str(png)], check=True)
            image = Image.open(png).convert('RGB')
            assert image.size == (media['width'], media['height'])
            webp = png.with_suffix('.webp')
            if not webp.exists():
                image.save(webp, lossless=True, method=6)
            posters[kind] = webp.relative_to(SITE).as_posix()
            data['selections'][target.relative_to(SITE).as_posix()] = {
                'frame_index': frame, 'note': 'One second on the original media clock; no retiming.'}

        provenance = {'origin': 'Seedance demo deliveries', 'package': asset['package'],
                      'asset_manifest_sha256': sha(manifest),
                      'delivery_manifest_sha256': sha(delivery / 'delivery-manifest.json'),
                      'result_sha256': asset['output']['sha256'],
                      'input_fps': asset['proxy']['fps'], 'output_fps': asset['output']['fps'],
                      'timeline': 'Full accepted output at original speed; no demo edit or retiming.'}
        if key == 'rally':
            source_root = delivery / 'threejs'
            modules = ['case/scene.mjs', 'case/runtime.mjs']
            extras = ['spec.json']
            main, vendor_folder, namespace = 'case/runtime.mjs', 'vendor', 'THREE'
            assert sha(source_root / modules[0]) == asset['sourceSha256']
            provenance['proxy_role'] = 'Accepted v2 matching RGB proxy, including authored steering-time remap.'
        elif key == 'cockatiel':
            source_root = (public / asset['sourceFile']).parent
            modules = ['scene.mjs', 'motion.mjs', 'camera.mjs', 'entry-curve.mjs', 'environment.mjs']
            extras = []
            main, vendor_folder, namespace = 'scene.mjs', 'vendor', 'T'
            recolor = read(public / asset['provenanceFile'])
            assert sha(source_root / main) == recolor['sourceSceneSha256']
            for name, digest in recolor['unchangedSources'].items():
                assert sha(source_root / name) == digest
            provenance.update(proxy_role='Presentation recolor of v27; original generation used a neutral gray proxy.',
                              generation_proxy_sha256=recolor['originalConditioningProxySha256'],
                              presentation_edits=recolor['edits'])
        else:
            # The delivery's top-level threejs folder contains the later alignment;
            # this is the actual generation-source snapshot used in the demo.
            source_root = (public / asset['sourceFile']).parent
            modules, extras = ['scene.js'], []
            main, vendor_folder, namespace = 'scene.js', 'vendor', 'THREE'
            assert asset['proxy']['sha256'] == delivery_meta['generationProxySha256']
            provenance['proxy_role'] = 'Original generation input; not the post-acceptance aligned proxy.'

        sources = []
        for name in modules + extras:
            source = source_root / name
            copy_exact(source, package / 'original' / name)
            destination = package / 'runtime' / name
            destination.parent.mkdir(parents=True, exist_ok=True)
            code = source.read_text()
            if name in modules:
                functions = [{'name': match[1], 'line': code[:match.start()].count('\n') + 1}
                             for match in re.finditer(r'(?:async\s+)?function\s+(\w+)\s*\(', code)]
                sources.append({'path': 'original/' + name, 'name': name,
                                'sha256': sha(source), 'functions': functions})
            if name == main:
                code += '\n// Workbench capture adapter; the published original is unchanged.\n'
                code += 'const __pageRender = renderer.render.bind(renderer);\n'
                code += 'renderer.render = (s,c) => { if (!window.__bfSampling) return __pageRender(s,c); };\n'
                code += f'window.__bfCapture = {{THREE: {namespace}, renderer, scene, camera}};\n'
            destination.write_text(code)
        provenance['source_program_sha256'] = sources[0]['sha256']
        vendor_source = (delivery / 'threejs/case/vendor/three.module.js' if key == 'fishing'
                         else source_root / vendor_folder / 'three.module.js')
        vendor = SITE / 'static/interactive/vendors/seedance/three.module.js'
        copy_exact(vendor_source, vendor)
        license_source = deliveries / 'fishing-lake-strike-8s-final-v1/threejs/case/vendor/LICENSE.threejs'
        copy_exact(license_source, vendor.parent / 'LICENSE.threejs')
        for kind in ('original', 'runtime'):
            folder = package / kind / vendor_folder
            folder.mkdir(parents=True, exist_ok=True)
            relative = Path(os.path.relpath(vendor, folder)).as_posix()
            (folder / 'three.module.js').write_text(f"export * from '{relative}';\n")
            copy_exact(license_source, folder / 'LICENSE.threejs')
        entry = 'runtime/case/index.html' if key == 'rally' else 'runtime/index.html'
        entry_path = package / entry
        hook = Path(os.path.relpath(SITE / 'static/js/scene-host.js', entry_path.parent)).as_posix()
        entry_module = Path(os.path.relpath(package / 'runtime' / main, entry_path.parent)).as_posix()
        entry_path.write_text(
            '<!doctype html><html lang="en"><head><meta charset="utf-8">'
            f'<title>{html.escape(title)}</title><script src="{hook}"></script>'
            '<style>html,body{margin:0;overflow:hidden}canvas{display:block}</style></head>'
            f'<body><canvas id="proxy" width="1280" height="720"></canvas>'
            f'<script type="module" src="./{entry_module}"></script></body></html>\n')
        output, proxy = asset['output'], asset['proxy']
        write(package / 'case.json', {'case_id': case, 'session': session, 'prompt': title,
              'width': proxy['width'], 'height': proxy['height'], 'fps': output['fps'],
              'frames': round(output['duration'] * output['fps']), 'entry': entry,
              'threejs_sha256': proxy['sha256'], 'sources': sources, 'provenance': provenance})
        record = {'case_id': case, 'session': session, 'title': title, 'source_prompt': title,
                  'threejs_video': paths['proxy'], 'threejs_sha256': proxy['sha256'],
                  'code_video_model': paths['output'], 'code_video_model_sha256': output['sha256'],
                  'display_code_video_model': paths['output'], 'display_code_video_model_sha256': output['sha256'],
                  'display_code_video_model_setting': asset['package'], 'interactive_source': case + '/',
                  'display_code_video_model_provenance': provenance}
        data['prompts']['items'] = [r for r in data['prompts']['items'] if r['case_id'] != case] + [record]
        data['catalog']['cases'] = [r for r in data['catalog']['cases'] if r['case_id'] != case] + [{'case_id': case, 'session': session}]
        data['mosaics'][f'{section}|{case}||'] = {'src': posters['output']}
        image = Image.open(SITE / posters['output']).convert('RGB')
        color = ', '.join(map(str, image.resize((1, 1)).getpixel((0, 0))))
        quantized = image.resize((64, 36)).quantize(colors=4)
        palette_values = quantized.getpalette()
        palette = [palette_values[i * 3:i * 3 + 3] for _, i in sorted(quantized.getcolors(), reverse=True)]
        palette_json = html.escape(json.dumps(palette), quote=True)
        expanded_id = 'fps-expanded' if section == 'control-world-states' else section + '-expanded'
        image.thumbnail((384, 216))
        thumb = SITE / f'static/images/first-person-bubbles/{case}-{output["sha256"][:12]}.webp'
        image.save(thumb, quality=88, method=6)
        cards.setdefault(section, []).append(
            f'<div class="fps-bubble-float"><a class="case-explore fps-case-bubble" href="?case={case}" '
            f'data-case="{case}" data-title="{title}" data-color="{color}" data-palette="{palette_json}" '
            f'aria-label="Open {title}" aria-controls="{expanded_id}" aria-expanded="false" '
            f'style="--case-rgb: {color}"><img src="{thumb.relative_to(SITE).as_posix()}" '
            f'width="{image.width}" height="{image.height}" alt="" loading="lazy"></a></div>')
        bindings.append({'case_id': case, 'media': paths, 'provenance': provenance})

    page = before[SITE / 'gallery.html'].decode()
    eol = '\r\n' if '\r\n' in page else '\n'
    for section, section_cards in cards.items():
        match = re.search(r'<section\b[^>]*id="' + section + r'"[\s\S]*?</section>', page)
        assert match, section
        fragment = match[0]
        start, end = '<!-- seedance:start -->', '<!-- seedance:end -->'
        block = start + eol + eol.join(section_cards) + eol + end + eol
        if start in fragment:
            fragment = re.sub(re.escape(start) + r'[\s\S]*?' + re.escape(end) + r'\r?\n?', lambda _: block, fragment)
        else:
            expanded = re.search(r'<div\b[^>]*class="fps-expanded"', fragment)
            assert expanded, section
            boundary = fragment.rfind('</div>', 0, expanded.start())
            assert boundary >= 0
            fragment = fragment[:boundary] + block + fragment[boundary:]
        page = page[:match.start()] + fragment + page[match.end():]
    for path, content in before.items():
        assert path.read_bytes() == content, f'Concurrent registry change: {path}'
    data['prompts']['count'] = len(data['prompts']['items'])
    data['catalog']['count'] = len(data['catalog']['cases'])
    for key, path in registry_paths.items():
        write(path, data[key])
    (SITE / 'gallery.html').write_bytes(page.encode())
    write(ROOT / '.local-import/seedance-20260922/bindings.json', bindings)
    subprocess.run(['python3', str(ROOT / 'scripts/build_case_catalog.py')], check=True)
    print('Imported Rally Hairpin, Cockatiel Flight and Lake Fishing with original media bytes.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--public-root', type=Path, required=True)
    parser.add_argument('--deliveries', type=Path, required=True)
    args = parser.parse_args()
    import_cases(args.public_root.resolve(), args.deliveries.resolve())
