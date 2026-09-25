#!/usr/bin/env python3
"""Publish the selected v13 Take 2 gallery pair and apply current gallery ordering."""

import hashlib
import html
import json
import re
import shutil
import subprocess
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "project-page-template"
SOURCE_SITE = ROOT.parent / "project-page-template"
SOURCE_CODE = (
    ROOT.parent
    / "manual-work/paired-expansion-20260908/camera-v13-601-681-take2/work/601"
)
SELECTION = "gallery-v13-601-681-take2-seed44"
TITLE = "展厅 · v13 · Take 2 · Seed 44"
EDIT_LABEL = "Replace Arch with Doorway"
CASES = {
    "601": {
        "role": "anchor",
        "control_sha": "3e1d04a1a522c5ff4ed80b0a6bca27557072614c63b8530d4ba62a02d59de5c2",
        "reference_sha": "5d7d25d44ed19ffebcec695985daa29af6704e727c175934d416a1ff4d826fba",
        "output_sha": "840ac9b1d601ea520e7854768b7e5ac8eb981f128c265217dfc4b5d78e6861f7",
    },
    "681": {
        "role": "variant",
        "control_sha": "170a535925ffead3920b7631f567cd8504fd9bb76794ed4df839ad5c84af269d",
        "reference_sha": "5f53afc9d8977a76b971fec315772fc62ae850b79cb4765e0b65df419f4c9c7f",
        "output_sha": "6ad541cfacb6f7295e4ef8c2a378fe91a76eb544011916297d79bf808e2a84c6",
    },
}


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def verify(path, expected):
    if not path.is_file():
        raise FileNotFoundError(path)
    actual = sha256(path)
    if actual != expected:
        raise ValueError(f"SHA256 mismatch: {path}: {actual} != {expected}")


def copy_verified(source, target, expected):
    verify(source, expected)
    target.parent.mkdir(parents=True, exist_ok=True)
    if not target.exists() or sha256(target) != expected:
        shutil.copy2(source, target)
    verify(target, expected)


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_crlf_json(path, data):
    rendered = (json.dumps(data, indent=2, ensure_ascii=False) + "\n").replace("\n", "\r\n")
    path.write_bytes(rendered.encode("utf-8"))


def functions(path):
    text = path.read_text(encoding="utf-8")
    return [
        {"name": match.group(1), "line": text[:match.start()].count("\n") + 1}
        for match in re.finditer(r"(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(", text)
    ]


def make_poster(video, target):
    target.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run([
        "ffmpeg", "-v", "error", "-y", "-i", str(video),
        "-vf", "select=eq(n\\,0),scale=384:216:flags=lanczos",
        "-frames:v", "1", "-pix_fmt", "rgb24", str(target),
    ], check=True)


def palette_record(poster, output_relative):
    with Image.open(poster) as image:
        rgb = image.convert("RGB")
        color = list(rgb.resize((1, 1), Image.Resampling.BOX).getpixel((0, 0)))
        quantized = rgb.quantize(colors=4, method=Image.Quantize.MEDIANCUT)
        swatches = quantized.getpalette()
        palette = [
            swatches[index * 3:index * 3 + 3]
            for _, index in sorted(quantized.getcolors(), reverse=True)
        ]
        palette += [palette[-1]] * (4 - len(palette))
    return {
        "case_id": "601",
        "name": TITLE,
        "session": "Scene / World Editing",
        "source_rgb": color,
        "source_palette": palette,
        "rgb": color,
        "palette": palette,
        "source_kind": "displayed-code-video-model",
        "first_frame": poster.relative_to(SITE).as_posix(),
        "source_video": output_relative,
        "source_sha256": CASES["601"]["output_sha"],
        "frame": 0,
        "alpha": 0.5,
    }


def source_record(case_id):
    prompts = read_json(SOURCE_SITE / "static/editing-h3/prompts.json")
    return next(item for item in prompts if item["id"] == f"v13-{case_id}-take2")


def build_revision(case_id):
    record = CASES[case_id]
    base = SITE / f"static/interactive/revisions/{record['control_sha']}/{case_id}"
    source_case = SOURCE_CODE / "case"
    source_vendor = SOURCE_CODE / "vendor/three.module.js"
    for kind in ("original", "runtime"):
        case_dir = base / kind / "case"
        vendor_dir = base / kind / "vendor"
        case_dir.mkdir(parents=True, exist_ok=True)
        vendor_dir.mkdir(parents=True, exist_ok=True)
        for name in ("index.html", "main.js", "camera-path.mjs", "textures.js", "people.js"):
            shutil.copy2(source_case / name, case_dir / name)
        shutil.copy2(source_vendor, vendor_dir / "three.module.js")
        adapter = base / kind / "selection-adapter.mjs"
        adapter.write_text(
            "import './case/main.js';\n"
            "// Select the recorded variant of the shared source program.\n"
            "if (typeof window.reconstruction?.setVariant !== 'function') "
            "throw new Error('Missing source variant API');\n"
            f'window.reconstruction.setVariant("{case_id}");\n'
            "window.reconstruction.seek(0);\n",
            encoding="utf-8",
        )

    runtime_html = base / "runtime/case/index.html"
    runtime_html.write_text(
        runtime_html.read_text(encoding="utf-8").replace(
            "<head>",
            '<head><script src="../../../../../../js/scene-host.js"></script>',
            1,
        ).replace(
            'src="./main.js"',
            'src="../selection-adapter.mjs"',
            1,
        ),
        encoding="utf-8",
    )
    runtime_main = base / "runtime/case/main.js"
    text = runtime_main.read_text(encoding="utf-8")
    text += (
        "\n// Project-page adapter: expose the reviewed source to the read-only inspector.\n"
        "window.__bfCapture = {THREE, renderer, scene, camera};\n"
    )
    runtime_main.write_text(text, encoding="utf-8")

    sources = []
    for name in ("main.js", "camera-path.mjs", "textures.js", "people.js"):
        path = base / "original/case" / name
        sources.append({
            "path": path.relative_to(base).as_posix(),
            "name": name,
            "sha256": sha256(path),
            "functions": functions(path),
        })
    adapter = base / "original/selection-adapter.mjs"
    sources.append({
        "path": adapter.relative_to(base).as_posix(),
        "name": "selection-adapter.mjs",
        "sha256": sha256(adapter),
        "functions": [],
        "generated_adapter": True,
    })
    prompt = source_record(case_id)
    metadata = {
        "case_id": case_id,
        "session": "Scene / World Editing",
        "prompt": prompt["prompt"],
        "fps": 24.0,
        "frames": 124,
        "width": 960,
        "height": 540,
        "threejs_sha256": record["control_sha"],
        "entry": "runtime/case/index.html",
        "sources": sources,
        "provenance": {
            "source_package": "paired-expansion-20260908/camera-v13-601-681-take2",
            "selected_variant": case_id,
            "runtime_parameters": {"variant": case_id},
            "pair_id": "camera-v13-601-681-take2",
            "take": 2,
            "reference_version": "v13",
            "result_model": "MiniMax-H3",
            "result_seed": 44,
            "result_sha256": record["output_sha"],
            "timeline": "Native 124-frame, 24-FPS reviewed camera trajectory.",
        },
    }
    write_crlf_json(base / "case.json", metadata)
    return base.relative_to(SITE / "static/interactive").as_posix() + "/"


def copy_assets():
    assets = {}
    for case_id, record in CASES.items():
        source_control = SOURCE_SITE / f"static/editing-h3/controls/v13-{case_id}-take2.mp4"
        source_reference = SOURCE_SITE / f"static/editing-h3/references/v13-{case_id}-take2.png"
        source_output = SOURCE_SITE / f"static/editing-h3/h3/seed-44/v13-{case_id}-take2.mp4"
        input_dir = SITE / f"static/project-page-cases/experiment-inputs/{record['control_sha']}"
        output_relative = (
            f"experiment-pairs/{SELECTION}/case-{case_id}-{record['output_sha'][:12]}.mp4"
        )
        copy_verified(source_control, input_dir / "threejs.mp4", record["control_sha"])
        reference_name = f"reference-{record['reference_sha'][:12]}.png"
        copy_verified(source_reference, input_dir / reference_name, record["reference_sha"])
        copy_verified(
            source_output,
            SITE / "static/project-page-cases" / output_relative,
            record["output_sha"],
        )
        assets[case_id] = {
            "video": output_relative,
            "sha256": record["output_sha"],
            "threejs_video": (
                f"experiment-inputs/{record['control_sha']}/threejs.mp4"
            ),
            "threejs_sha256": record["control_sha"],
            "interactive_source": build_revision(case_id),
            "reference_image": (
                f"experiment-inputs/{record['control_sha']}/{reference_name}"
            ),
            "reference_sha256": record["reference_sha"],
            "source_case_id": f"v13-{case_id}-take2",
            "origin": "editing-h3",
            "width": 960,
            "height": 544,
            "frames": 124,
            "fps": 24,
            "provenance": {
                "pair_id": "camera-v13-601-681-take2",
                "role": record["role"],
                "group": "image-group23-2",
                "version": "v13",
                "take": 2,
                "seed": 44,
                "source_page": "perception-respond-chemical-remix.trycloudflare.com",
                "result_sha256": record["output_sha"],
                "threejs_sha256": record["control_sha"],
                "reference_sha256": record["reference_sha"],
            },
        }
    poster = (
        SITE / "static/images/first-person-bubbles"
        / f"601-{CASES['601']['output_sha'][:12]}.png"
    )
    make_poster(
        SITE / "static/project-page-cases" / assets["601"]["video"],
        poster,
    )
    return assets, poster, palette_record(poster, assets["601"]["video"])


def update_registry(assets, cover):
    path = SITE / "static/interactive/experiment-pairs.json"
    registry = read_json(path)
    pair = {
        "id": SELECTION,
        "section_id": "gallery",
        "section": "Scene / World Editing",
        "a": "601",
        "b": "681",
        "batch": "editing-h3",
        "group": "image-group23-2",
        "version": "v13-take2-seed44",
        "label": "v13 / Take 2 / Seed 44",
        "edit_label": EDIT_LABEL,
        "assets": assets,
        "cover": cover,
    }
    registry["pairs"] = [item for item in registry["pairs"] if item["id"] != SELECTION]
    registry["pairs"].append(pair)
    registry["count"] = len(registry["pairs"])
    write_crlf_json(path, registry)


def mark_hidden_prompts():
    path = SITE / "static/project-page-cases/prompts.json"
    raw = path.read_bytes()
    for case_id in ("524", "531"):
        marker = f'      "case_id": "{case_id}",\r\n'.encode()
        replacement = marker + b'      "gallery_visible": false,\r\n'
        if replacement in raw:
            continue
        if raw.count(marker) != 1:
            raise ValueError(f"Unexpected prompt record count for case {case_id}")
        raw = raw.replace(marker, replacement, 1)
    path.write_bytes(raw)


def update_catalog_and_mosaics(assets, poster):
    catalog_path = ROOT / "scripts/data/case-catalog.json"
    catalog = read_json(catalog_path)
    for key in (
        "physical-grounding|524||",
        "physical-grounding|531||",
        "gallery|rolling-inertia||",
    ):
        if key in catalog["entries"]:
            catalog["entries"][key]["active"] = False
    key = f"gallery|601|681|{SELECTION}"
    if key not in catalog["entries"]:
        identifier = catalog["nextId"]
        catalog["entries"][key] = {
            "id": f"R{identifier:03d}",
            "section": "gallery",
            "a": "601",
            "b": "681",
            "selection": SELECTION,
            "title": TITLE,
            "active": True,
            "sectionTitle": "Scene / World Editing",
            "version": "v13 / Take 2 / MiniMax-H3 Seed 44",
            "sources": {
                case_id: {
                    "threejsSHA": asset["threejs_sha256"],
                    "result": asset["video"],
                }
                for case_id, asset in assets.items()
            },
        }
        catalog["nextId"] = identifier + 1
    write_crlf_json(catalog_path, catalog)

    path = SITE / "static/images/mosaic-posters.json"
    mosaics = read_json(path)
    for old in (
        "physical-grounding|524||",
        "physical-grounding|531||",
        "gallery|rolling-inertia||",
    ):
        mosaics.pop(old, None)
    mosaics[key] = {
        "src": poster.relative_to(SITE).as_posix(),
        "video": f"static/project-page-cases/{assets['601']['video']}",
        "frame_index": 0,
        "dimensions": [960, 544],
    }
    write_crlf_json(path, mosaics)


def bubble_markup(cover):
    color = ", ".join(map(str, cover["rgb"]))
    palette = html.escape(json.dumps(cover["palette"]))
    style = "; ".join(
        f"--case-color-{index}: {', '.join(map(str, value))}"
        for index, value in enumerate(cover["palette"], 1)
    )
    return (
        f'          <div class="fps-bubble-float"><a class="case-explore fps-case-bubble" '
        f'href="?case=601&amp;selection={SELECTION}" data-case="601" data-case-b="681" '
        f'data-selection="{SELECTION}" data-title="{TITLE}" '
        f'data-edit-label="{EDIT_LABEL}" data-color="{color}" data-palette="{palette}" '
        f'aria-label="Open {TITLE}" aria-controls="gallery-expanded" aria-expanded="false" '
        f'style="--case-rgb: {color}; {style}"><img src="{cover["first_frame"]}" '
        f'width="384" height="216" alt="" loading="lazy"></a></div>'
    )


def pair_figures(assets):
    labels = {"601": "Original", "681": "Edited"}
    figures = []
    for case_id in ("601", "681"):
        asset = assets[case_id]
        suffix = "" if case_id == "601" else " (Edited)"
        figures.extend([
            f'\n <figure class="agent-control-item agent-control-player"><div class="agent-control-stage">'
            f'<video class="agent-control-video" controls muted loop playsinline preload="none" '
            f'data-src="static/project-page-cases/{asset["threejs_video"]}" '
            f'aria-label="{TITLE} {labels[case_id]} Three.js"></video>'
            f'<button class="compare-loader" type="button" aria-label="Load {TITLE} '
            f'{labels[case_id]} Three.js">Load video</button></div><figcaption>Three.js{suffix}'
            f'<a class="case-explore" href="?case={case_id}&amp;selection={SELECTION}" '
            f'aria-label="Explore {TITLE} {labels[case_id]} code and live scene">'
            f'Explore code &amp; 3D</a></figcaption></figure>',
            f'\n <figure class="agent-control-item agent-control-player"><div class="agent-control-stage">'
            f'<video class="agent-control-video" controls muted loop playsinline preload="none" '
            f'data-src="static/project-page-cases/{asset["video"]}" '
            f'aria-label="{TITLE} {labels[case_id]} Code Video Model"></video>'
            f'<button class="compare-loader" type="button" aria-label="Load {TITLE} '
            f'{labels[case_id]} Code Video Model">Load video</button></div>'
            f'<figcaption>Code Video Model{suffix}</figcaption></figure>',
        ])
    return "".join(figures)


def update_gallery(assets, cover):
    path = SITE / "gallery.html"
    text = path.read_text(encoding="utf-8")

    physical_match = re.search(
        r'<!-- physical-grounding:start -->(.*?)<!-- physical-grounding:end -->',
        text,
        re.S,
    )
    if not physical_match:
        raise ValueError("Physical Grounding section not found")
    physical = physical_match.group(1)
    grid = re.search(
        r'(<div class="fps-bubble-grid" aria-label="Physical Grounding cases">)(.*?)(</div><div id="physical-grounding-expanded")',
        physical,
        re.S,
    )
    if not grid:
        raise ValueError("Physical Grounding grid not found")
    bubbles = re.findall(
        r'<div class="fps-bubble-float"><a[^\n]*?</a></div>',
        grid.group(2),
    )
    by_id = {
        re.search(r'data-case="([^"]+)"', bubble).group(1): bubble
        for bubble in bubbles
    }
    order = [
        "physical-isochronous",
        "physical-pendulum",
        "physical-induction",
        "physical-prism",
        "black-hole-background-grade",
        "stable-mass-transfer-binary",
        "rolling-inertia",
        "newtons-cradle",
    ]
    if set(order) - set(by_id):
        raise ValueError("Physical Grounding cases changed unexpectedly")
    grid_content = "".join(
        ("\n          " if index else "") + by_id[case_id]
        for index, case_id in enumerate(order)
    )
    physical = (
        physical[:grid.start(2)] + grid_content + physical[grid.end(2):]
    )
    template = re.search(
        r'<template id="physical-grounding-original-pairs">(.*?)</template>',
        physical,
        re.S,
    )
    content = template.group(1)
    figures = list(re.finditer(
        r'\s*<figure class="agent-control-item agent-control-player">.*?</figure>',
        content,
        re.S,
    ))
    removed = [
        figure for figure in figures
        if re.search(r'\bcase[- ](?:524|531)\b', figure.group())
    ]
    if len(removed) not in (0, 4):
        raise ValueError("Expected four Physical Grounding case 524/531 figures")
    for figure in reversed(removed):
        content = content[:figure.start()] + content[figure.end():]
    physical = physical[:template.start(1)] + content + physical[template.end(1):]
    text = text[:physical_match.start(1)] + physical + text[physical_match.end(1):]

    scene_match = re.search(
        r'<section class="gallery-section" id="gallery">.*?</section>',
        text,
        re.S,
    )
    scene = scene_match.group()
    old_bubble = re.search(
        r'          <div class="fps-bubble-float"><a[^\n]*data-case="rolling-inertia"[^\n]*</a></div>',
        scene,
    )
    if not old_bubble:
        existing = re.search(
            rf'<div class="fps-bubble-float"><a[^\n]*data-selection="{SELECTION}"[^\n]*</a></div>',
            scene,
        )
        if not existing:
            raise ValueError("Scene fifth bubble is neither rolling nor selected gallery pair")
    else:
        scene = scene[:old_bubble.start()] + bubble_markup(cover) + scene[old_bubble.end():]
        template = re.search(r'<template id="gallery-original-pairs">(.*?)</template>', scene, re.S)
        content = template.group(1)
        figures = list(re.finditer(
            r'\s*<figure class="agent-control-item agent-control-player">.*?</figure>',
            content,
            re.S,
        ))
        removed = [
            figure for figure in figures
            if "rolling-inertia" in figure.group()
        ]
        if len(removed) != 2:
            raise ValueError("Expected two rolling-inertia template figures")
        insertion = removed[0].start()
        for figure in reversed(removed):
            content = content[:figure.start()] + content[figure.end():]
        content = content[:insertion] + pair_figures(assets) + content[insertion:]
        scene = scene[:template.start(1)] + content + scene[template.end(1):]
    text = text[:scene_match.start()] + scene + text[scene_match.end():]
    path.write_bytes(text.replace("\n", "\r\n").encode("utf-8"))


def main():
    assets, poster, cover = copy_assets()
    update_registry(assets, cover)
    mark_hidden_prompts()
    update_catalog_and_mosaics(assets, poster)
    update_gallery(assets, cover)
    print("Published v13 Take 2 Seed 44 gallery pair and updated Physical Grounding.")


if __name__ == "__main__":
    main()
