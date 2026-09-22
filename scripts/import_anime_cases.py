"""Import the four reviewed Anime deliveries and their executable scene sources."""
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
TITLES = {'anime-hotel': 'Apocalypse Hotel', 'anime-nichijou': 'Nichijou',
          'anime-kumiko': 'Kumiko', 'three-colossal': 'Attack on Titan'}
VENDOR_SHA = '76dea8151bc9352aef3528b4262e249b2604f62543828328db978d060d61a495'


def replace_block(path, markup):
    # Preserve all unrelated page bytes, including the existing Demo edits.
    data = path.read_bytes()
    start, end = b'<!-- anime:start -->', b'<!-- anime:end -->'
    block = start + b'\n' + markup.encode() + b'\n' + end + b'\n'
    if start in data:
        data = re.sub(re.escape(start) + rb'[\s\S]*?' + re.escape(end) + rb'\r?\n?', lambda _: block, data)
    else:
        match = re.search(rb'<section\b[^>]*id="long-horizon-style"', data)
        if not match:
            raise ValueError('Missing insertion point')
        data = data[:match.start()] + block + data[match.start():]
    path.write_bytes(data)


def import_cases(public_root, manifest_path):
    assets = read(manifest_path)
    assert set(assets) == set(TITLES)
    vendor = SITE / 'static/interactive/vendors/anime/three.module.js'
    source_vendor = public_root / 'assets/v9/refined11/three-colossal/threejs/case/vendor/three.module.js'
    assert sha(source_vendor) == VENDOR_SHA
    license_file = public_root / 'assets/v9/refined11/three-colossal/threejs/case/vendor/LICENSE.threejs'
    for case, asset in assets.items():
        for kind in ('proxy', 'output'):
            assert sha(public_root / asset[kind]['src']) == asset[kind]['sha256'], (case, kind)
        assert sha(public_root / asset['sourceFile']) == asset['sourceSha256'], case
    copy_exact(source_vendor, vendor, VENDOR_SHA)
    copy_exact(license_file, vendor.parent / 'LICENSE.threejs')

    prompts_path = SITE / 'static/project-page-cases/prompts.json'
    catalog_path = SITE / 'static/interactive/catalog.json'
    mosaic_path = SITE / 'static/images/mosaic-posters.json'
    native_path = SITE / 'static/images/first-frames-native/manifest.json'
    selections_path = SITE / 'static/images/poster-selections.json'
    preview_path = SITE / 'static/images/application-previews/manifest.json'
    prompts, catalog, mosaics = read(prompts_path), read(catalog_path), read(mosaic_path)
    native, selections = read(native_path), read(selections_path)
    entries, cards, posters, media_paths = [], [], {}, {}
    for case, title in TITLES.items():
        asset = assets[case]
        package = SITE / 'static/interactive' / case
        media_paths[case] = {}
        for kind, label in [('proxy', 'threejs'), ('output', 'output')]:
            meta = asset[kind]
            relative = f'anime/{case}/{label}-{meta["sha256"][:16]}.mp4'
            target = SITE / 'static/project-page-cases' / relative
            copy_exact(public_root / meta['src'], target, meta['sha256'])
            media_paths[case][kind] = relative
            frame = round(meta['fps'])  # Corresponding one-second frames, including 30/24 FPS pair.
            png = SITE / f'static/images/first-frames-native/{meta["sha256"]}-frame{frame:06d}.png'
            if not png.exists():
                subprocess.run(['ffmpeg', '-v', 'error', '-nostdin', '-n', '-i', str(target),
                                '-vf', f'select=eq(n\\,{frame})', '-frames:v', '1', '-pix_fmt', 'rgb24',
                                '-update', '1', str(png)], check=True)
            image = Image.open(png).convert('RGB')
            assert image.size == (meta['width'], meta['height'])
            webp = png.with_suffix('.webp')
            if not webp.exists():
                image.save(webp, lossless=True, method=6)
            posters[case, kind] = webp.relative_to(SITE).as_posix()
            video = target.relative_to(SITE).as_posix()
            selections[video] = {'frame_index': frame, 'note': 'One second; proxy/output use the same time.'}
            if case == 'anime-hotel':
                import hashlib
                native = [row for row in native if row['video'] != video]
                native.append({'video': video, 'poster': png.relative_to(SITE).as_posix(),
                               'width': meta['width'], 'height': meta['height'], 'frame_index': frame,
                               'format': 'PNG/rgb24', 'video_sha256': meta['sha256'],
                               'poster_sha256': sha(png), 'decoded_pixels_sha256': hashlib.sha256(image.tobytes()).hexdigest()})

        source = public_root / asset['sourceFile']
        if case == 'three-colossal':
            source_root = public_root / 'assets/v9/refined11/three-colossal/threejs/case'
            main = 'scene.mjs'
            assert sha(source_root / main) == asset['sourceSha256']
            modules = ['scene.mjs', 'invasion_world.mjs', 'clip-contract.mjs']
            dependencies = ['motion.json', 'titan-mesh.json', 'ruins.json', 'refined-settings.json', 'cast.json']
            for name in modules + dependencies:
                for kind in ('original', 'runtime'):
                    if kind == 'runtime' and name == main and (package / kind / name).exists():
                        continue
                    copy_exact(source_root / name, package / kind / name)
            vendor_folder = 'vendor'
        else:
            source_root = source.parent.parent
            main = 'case/main.js'
            modules = [main]
            for kind in ('original', 'runtime'):
                # Runtime instrumentation is regenerated below; originals stay byte-identical.
                copy_exact(source, package / kind / main) if kind == 'original' or not (package / kind / main).exists() else None
            vendor_folder = 'vendor'

        sources = []
        for name in modules:
            original = package / 'original' / name
            code = original.read_text()
            functions = [{'name': m[1], 'line': code[:m.start()].count('\n') + 1}
                         for m in re.finditer(r'(?:async\s+)?function\s+(\w+)\s*\(', code)]
            sources.append({'path': 'original/' + name, 'name': name, 'sha256': sha(original), 'functions': functions})
            if name == main:
                # Expose the scene to the existing workbench; never replace its geometry or clock.
                code += '\n// Project-page capture adapter; original source is available separately.\n'
                code += 'const __animeRender = renderer.render.bind(renderer);\n'
                code += 'renderer.render = (s,c) => {if (!window.__bfSampling) return __animeRender(s,c);};\n'
                code += 'window.__bfCapture = {THREE, renderer, scene, camera};\n'
                (package / 'runtime' / name).write_text(code)
        for kind in ('original', 'runtime'):
            folder = package / kind / vendor_folder
            folder.mkdir(parents=True, exist_ok=True)
            relative = Path(os.path.relpath(vendor, folder)).as_posix()
            (folder / 'three.module.js').write_text(f"export * from '{relative}';\n")
            copy_exact(license_file, folder / 'LICENSE.threejs')
        runtime = package / 'runtime'
        hook = Path(os.path.relpath(SITE / 'static/js/scene-host.js', runtime)).as_posix()
        canvas = '<canvas></canvas>' if case == 'three-colossal' else ''
        runtime.joinpath('index.html').write_text(
            '<!doctype html><html lang="en"><head><meta charset="utf-8">'
            f'<title>{html.escape(title)} scene</title><script src="{hook}"></script>'
            '<style>html,body{margin:0;overflow:hidden}canvas{display:block}</style></head>'
            f'<body>{canvas}<script type="module" src="./{main}"></script></body></html>\n')
        output, proxy = asset['output'], asset['proxy']
        metadata = {'case_id': case, 'session': 'Anime', 'prompt': title,
                    'fps': output['fps'], 'frames': round(output['duration'] * output['fps']),
                    'width': proxy['width'], 'height': proxy['height'], 'threejs_sha256': proxy['sha256'],
                    'entry': 'runtime/index.html' + ('?motion=1' if case != 'three-colossal' else ''),
                    'sources': sources, 'provenance': {'package': asset['package'],
                    'asset_manifest_sha256': sha(manifest_path), 'source_program_sha256': asset['sourceSha256'],
                    'result_sha256': output['sha256'], 'timeline': 'Original output clock in seconds; no retiming.',
                    'runtime_parameters': {'motion': 1} if case != 'three-colossal' else {},
                    'input_fps': proxy['fps'], 'output_fps': output['fps']}}
        write(package / 'case.json', metadata)
        paths = media_paths[case]
        entries.append({'case_id': case, 'session': 'Anime', 'source_prompt': title,
                        'threejs_video': paths['proxy'], 'threejs_sha256': proxy['sha256'],
                        'code_video_model': paths['output'], 'code_video_model_sha256': output['sha256'],
                        'display_code_video_model': paths['output'], 'display_code_video_model_sha256': output['sha256'],
                        'display_code_video_model_setting': asset['package'], 'interactive_source': case + '/'})
        poster = posters[case, 'output']
        mosaics[f'anime|{case}||'] = {'src': poster}
        thumb = SITE / f'static/images/first-person-bubbles/{case}-{output["sha256"][:12]}.webp'
        image = Image.open(SITE / poster); image.thumbnail((384, 216)); image.save(thumb, quality=88, method=6)
        cards.append(f'<div class="fps-bubble-float"><a class="case-explore fps-case-bubble" href="?case={case}" '
                     f'data-case="{case}" data-title="{html.escape(title)}" data-color="177, 157, 178" '
                     'data-palette="[[177,157,178],[226,203,185],[176,208,215],[231,218,228]]" '
                     f'aria-label="Open {html.escape(title)}" aria-controls="anime-expanded" aria-expanded="false">'
                     f'<img src="{thumb.relative_to(SITE).as_posix()}" width="{image.width}" height="{image.height}" alt="" loading="lazy"></a></div>')

    prompts['items'] = [r for r in prompts['items'] if r['case_id'] not in TITLES] + entries
    prompts['count'] = len(prompts['items'])
    catalog['cases'] = [r for r in catalog['cases'] if r['case_id'] not in TITLES] + [{'case_id': c, 'session': 'Anime'} for c in TITLES]
    catalog['count'] = len(catalog['cases'])
    for path, data in [(prompts_path, prompts), (catalog_path, catalog), (mosaic_path, mosaics),
                       (native_path, native), (selections_path, selections)]:
        write(path, data)
    gallery = '<section class="gallery-section control-world-section" id="anime"><div class="container fps-bubbles-host"><h2>Anime</h2>'
    gallery += '<div class="fps-bubble-grid" aria-label="Anime cases">' + ''.join(cards) + '</div>'
    gallery += '<div id="anime-expanded" class="fps-expanded" hidden><div class="fps-expanded-heading"><button type="button" class="fps-back">← Return</button></div><p class="fps-load-status" role="status" aria-live="polite"></p><div class="fps-frame-slot"></div></div></div></section>'
    replace_block(SITE / 'gallery.html', gallery)
    figures = ''.join(f'<figure><figcaption>{label}</figcaption><video playsinline muted preload="none" '
                      f'data-poster="{posters["anime-hotel", kind]}" data-src="static/project-page-cases/{media_paths["anime-hotel"][kind]}" '
                      f'aria-label="Anime {label}"></video></figure>' for kind, label in [('proxy', 'Three.js'), ('output', 'Code Video Model')])
    overview = '<section class="category-shell" id="anime"><div class="category-content"><div class="category-overview"><article class="application-preview" data-case="anime-hotel" data-section="anime"><div class="comparison-frame"><div class="application-video-pair">' + figures
    overview += '</div><div class="application-transport"><button class="application-play" type="button">Play</button><input class="application-seek" type="range" min="0" max="1000" step="1" value="0" aria-label="Video pair progress" disabled><button class="application-sound" type="button" aria-pressed="false">Sound off</button></div><p class="application-status" role="status" aria-live="polite"></p></div><div class="application-copy"><h2><a href="gallery.html#anime">Anime</a></h2></div></article></div></div></section>'
    replace_block(SITE / 'index.html', overview)
    previews = [row for row in read(preview_path) if row['section_id'] != 'anime']
    previews.insert(1, {'section': 'Anime', 'section_id': 'anime', 'case_id': 'anime-hotel',
                       'threejs': media_paths['anime-hotel']['proxy'], 'threejs_sha256': assets['anime-hotel']['proxy']['sha256'],
                       'result': media_paths['anime-hotel']['output'], 'result_sha256': assets['anime-hotel']['output']['sha256'],
                       'proxy_poster': posters['anime-hotel', 'proxy'], 'output_poster': posters['anime-hotel', 'output']})
    write(preview_path, previews)
    subprocess.run(['python3', str(ROOT / 'scripts/build_case_catalog.py')], check=True)
    print('Imported four Anime cases with original media, source programs and native-resolution covers.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--public-root', type=Path, required=True)
    parser.add_argument('--manifest', type=Path, required=True)
    args = parser.parse_args()
    import_cases(args.public_root.resolve(), args.manifest.resolve())
