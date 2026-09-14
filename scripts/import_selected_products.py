"""Import eight explicitly selected product results without changing existing cases."""
import argparse
import ast
import hashlib
import html
import json
import os
from pathlib import Path
import re
import shutil
import subprocess

from PIL import Image
from build_native_posters import ensure_poster

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "project-page-template"
SELECTIONS = {
    "product-new15-01": 42,
    "product-new15-02": 45,
    "product-new15-04": 42,
    "product-new15-05": 42,
    "product-new15-06": 45,
    "product-new15-07": 42,
    "product-new15-09": 43,
    "product-new15-10": 44,
}


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write(path, data):
    crlf = path.exists() and b"\r\n" in path.read_bytes()
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
    path.write_bytes(text.replace("\n", "\r\n").encode("utf-8") if crlf else text.encode("utf-8"))


def copy_exact(source, destination, expected=None):
    digest = sha(source)
    if expected is not None and digest != expected:
        raise ValueError(f"Source hash mismatch: {source}")
    if destination.exists():
        if sha(destination) != digest:
            raise ValueError(f"Existing published file differs: {destination}")
    else:
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)
    return digest


def import_cases(bundle, review, source_site, license_file):
    frozen = read(bundle / "manifest.json")
    runtime_source = bundle / "code/scripts/minimax_h3_latent_edit_runtime.py"
    if sha(runtime_source) != frozen["frozen_sha256"]["code/scripts/minimax_h3_latent_edit_runtime.py"]:
        raise ValueError("Frozen random-stream derivation changed")
    seed_functions = [node for node in ast.parse(runtime_source.read_text()).body
                      if isinstance(node, ast.FunctionDef)
                      and node.name in {"deterministic_stream_seed", "request_stream_seeds"}]
    if len(seed_functions) != 2:
        raise ValueError("Missing frozen random-stream derivation")
    seeds = {"hashlib": hashlib}
    exec(compile(ast.Module(body=seed_functions, type_ignores=[]), str(runtime_source), "exec"), seeds)
    metadata = {item["id"]: item for item in read(bundle / "code/metadata/seed-42.json")["items"]}
    camera_cases = {item["id"]: item for item in read(source_site / "static/product-new15-camera-v2/manifest.json")["cases"]}
    public_path = SITE / "static/project-page-cases/prompts.json"
    catalog_path = SITE / "static/interactive/catalog.json"
    mosaic_path = SITE / "static/images/mosaic-posters.json"
    gallery_path = SITE / "gallery.html"
    watched = [public_path, catalog_path, mosaic_path, gallery_path]
    before = {path: path.read_bytes() for path in watched}
    public = read(public_path)
    catalog = read(catalog_path)
    mosaics = read(mosaic_path)
    existing = {str(item["case_id"]): item for item in public["items"]}
    backup = ROOT / ".local-import/selected-products-20260912/before"
    for path, content in before.items():
        target = backup / path.relative_to(SITE)
        if not target.exists():
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(content)
    new_items, cards, bindings = [], [], []
    for case, seed in SELECTIONS.items():
        item = metadata[case]
        camera_case = camera_cases[case]
        result = read(review / "provenance" / f"seed-{seed}" / f"{case}.json")
        if (result["status"] != "completed" or result["item_id"] != case
                or result["group"] != "image-group23-2"
                or result["generation_seed"] != seeds["request_stream_seeds"](seed)["sdedit_base_noise"]
                or result["source_video_sha256"] != item["source_video_sha256"]
                or result["explicit_image_reference_sha256"] != item["image_reference_sha256"]
                or result["target_prompt_sha256"] != item["target_prompt_sha256"]
                or camera_case["sha256"] != item["source_video_sha256"]):
            raise ValueError(f"Result/input identity mismatch: {case}")
        source = (source_site / camera_case["source"]).parent
        app_hash = frozen["frozen_sha256"][f"camera-evidence/{case}/app.js"]
        if sha(source / "app.js") != app_hash or sha(bundle / "camera-evidence" / case / "app.js") != app_hash:
            raise ValueError(f"Camera-v2 source mismatch: {case}")
        output_sha = result["output"]["sha256"]
        media_base = Path("product-selected-20260912") / case
        paths = {
            "threejs_video": media_base / f"threejs-{item['source_video_sha256'][:16]}.mp4",
            "reference_image": media_base / f"reference-{item['image_reference_sha256'][:16]}.png",
            "code_video_model": media_base / f"seed-{seed}-{output_sha[:16]}.mp4",
        }
        media_root = SITE / "static/project-page-cases"
        copy_exact(bundle / "inputs/threejs_videos" / f"{case}.mp4",
                   media_root / paths["threejs_video"], item["source_video_sha256"])
        copy_exact(bundle / "inputs/reference_images" / f"{case}.png",
                   media_root / paths["reference_image"], item["image_reference_sha256"])
        copy_exact(review / "site/assets" / case / f"seed-{seed}.mp4",
                   media_root / paths["code_video_model"], output_sha)
        package = SITE / "static/interactive" / case
        files = [source / "index.html", source / "app.js", source / "vendor/three.module.js"]
        for path in files:
            relative = path.relative_to(source)
            copy_exact(path, package / "original" / relative)
            if not (package / "runtime" / relative).exists():
                copy_exact(path, package / "runtime" / relative)
        for kind in ("original", "runtime"):
            copy_exact(license_file, package / kind / "vendor/LICENSE.threejs")
        code = (source / "app.js").read_text(encoding="utf-8")
        imports = re.findall(r"import\s+\*\s+as\s+(\w+)\s+from\s+['\"]\./vendor/three\.module\.js['\"]", code)
        if len(imports) != 1:
            raise ValueError(f"Unknown Three.js namespace: {case}")
        namespace = imports[0]
        captured = {}
        for label, constructor in (("renderer", "WebGLRenderer"), ("scene", "Scene"), ("camera", "PerspectiveCamera")):
            names = re.findall(r"\b(?:const|let)\s+(\w+)\s*=\s*new\s+" + re.escape(namespace) + r"\." + constructor + r"\b", code)
            if label in names:
                captured[label] = label
            elif len(names) == 1:
                captured[label] = names[0]
            else:
                raise ValueError(f"Ambiguous {label} binding: {case}")
        functions = [{"name": m[1], "line": code[:m.start()].count("\n") + 1}
                     for m in re.finditer(r"(?:async\s+)?function\s+(\w+)\s*\(", code)]
        def instrument(match):
            line = code[:match.start()].count("\n") + 1
            return match[0] + f" window.__bfTrace?.add({line});"
        runtime_code = re.sub(r"(?:async\s+)?function\s+\w+\s*\([^)]*\)\s*\{", instrument, code)
        runtime_code += (
            "\n// Capture and sampling adapter; product geometry and animation are unchanged.\n"
            f"const __productRender = {captured['renderer']}.render.bind({captured['renderer']});\n"
            f"{captured['renderer']}.render = (s, c) => {{ if (!window.__bfSampling) return __productRender(s, c); }};\n"
            f"window.__bfCapture = {{ THREE: {namespace}, renderer: {captured['renderer']}, "
            f"scene: {captured['scene']}, camera: {captured['camera']} }};\n"
        )
        subprocess.run(["node", "--check", "--input-type=module"],
                       input=runtime_code, text=True, check=True)
        (package / "runtime/app.js").write_text(runtime_code, encoding="utf-8")
        original_html = (source / "index.html").read_text(encoding="utf-8")
        hook = Path(os.path.relpath(SITE / "static/js/scene-host.js", package / "runtime")).as_posix()
        (package / "runtime/index.html").write_text(
            original_html.replace("<head>", f'<head><script src="{hook}"></script>', 1), encoding="utf-8")
        provenance = {
            "origin": "product-new15-four-seeds", "group": "image-group23-2", "seed": seed,
            "camera_revision": "camera-v2", "reference_revision": "photoreal-v2",
            "frozen_bundle_sha256": sha(bundle / "manifest.json"),
            "source_program_sha256": app_hash, "result_sha256": output_sha,
        }
        write(package / "case.json", {
            "case_id": case, "session": "Product Cinematography", "prompt": item["source_prompt"],
            "width": 960, "height": 544, "fps": 24, "frames": 124,
            "threejs_sha256": item["source_video_sha256"], "entry": "runtime/index.html",
            "sources": [{"path": "original/app.js", "name": "app.js", "sha256": app_hash, "functions": functions}],
            "provenance": provenance,
        })
        record = {
            "case_id": case, "session": "Product Cinematography", "title": item["title"],
            "source_prompt": item["source_prompt"], **{k: v.as_posix() for k, v in paths.items()},
            "threejs_sha256": item["source_video_sha256"], "reference_image_sha256": item["image_reference_sha256"],
            "code_video_model_sha256": output_sha, "display_code_video_model": paths["code_video_model"].as_posix(),
            "display_code_video_model_sha256": output_sha,
            "display_code_video_model_setting": f"image-group23-2 / seed {seed} / camera-v2 / photoreal-v2",
            "interactive_source": case + "/", "display_code_video_model_provenance": provenance,
        }
        if case in existing and existing[case] != record:
            raise ValueError(f"Existing case binding differs: {case}")
        new_items.append(record)
        poster = ensure_poster(media_root / paths["code_video_model"])
        native_webp = poster.with_suffix(".webp")
        with Image.open(poster) as image:
            image.save(native_webp, format="WEBP", lossless=True)
            palette = image.convert("RGB").resize((64, 36)).quantize(colors=4)
            colors = sorted(palette.getcolors(), reverse=True)
            rgb = palette.getpalette()
            triples = [rgb[index * 3:index * 3 + 3] for _, index in colors]
            while len(triples) < 4:
                triples.append(triples[-1])
            average = list(image.convert("RGB").resize((1, 1)).getpixel((0, 0)))
            thumb = image.convert("RGB")
            thumb.thumbnail((384, 216))
            cover = SITE / "static/images/first-person-bubbles" / f"{case}.webp"
            thumb.save(cover, format="WEBP", quality=88)
        palette_json = html.escape(json.dumps(triples), quote=True)
        color = ", ".join(map(str, average))
        style = "; ".join([f"--case-rgb: {color}"] + [
            f"--case-color-{i + 1}: " + ", ".join(map(str, value)) for i, value in enumerate(triples)])
        title = html.escape(item["title"], quote=True)
        cards.append(
            f'<div class="fps-bubble-float"><a class="case-explore fps-case-bubble" href="?case={case}" '
            f'data-case="{case}" data-title="{title}" data-color="{color}" data-palette="{palette_json}" '
            f'aria-label="Open {title}, seed {seed}" aria-controls="product-cinematography-expanded" '
            f'aria-expanded="false" style="{style}"><img src="{cover.relative_to(SITE).as_posix()}" '
            'width="384" height="216" alt="" loading="lazy"></a></div>')
        mosaics[f"product-cinematography|{case}||"] = {
            "src": native_webp.relative_to(SITE).as_posix(),
            "video": (media_root / paths["code_video_model"]).relative_to(SITE).as_posix(),
            "frame_index": 0, "dimensions": [960, 544],
        }
        bindings.append({"case_id": case, "seed": seed, "title": item["title"],
                         "source_sha256": item["source_video_sha256"], "reference_sha256": item["image_reference_sha256"],
                         "result_sha256": output_sha, "source_program_sha256": app_hash})
    page = before[gallery_path].decode("utf-8")
    eol = "\r\n" if "\r\n" in page else "\n"
    section = re.search(r'<section\b[^>]*id="product-cinematography"[\s\S]*?</section>', page)
    if not section:
        raise ValueError("Product section not found")
    start, end = "<!-- selected-products:start -->", "<!-- selected-products:end -->"
    block = start + eol + eol.join(cards) + eol + end + eol
    fragment = section[0]
    if start in fragment:
        fragment = re.sub(re.escape(start) + r"[\s\S]*?" + re.escape(end) + r"\r?\n?", lambda _: block, fragment)
    else:
        grid_end = fragment.rfind("</div>", 0, fragment.index('<div id="product-cinematography-expanded"'))
        if grid_end < 0:
            raise ValueError("Product card-grid boundary not found")
        fragment = fragment[:grid_end] + block + fragment[grid_end:]
    page = page[:section.start()] + fragment + page[section.end():]
    for path, content in before.items():
        if path.read_bytes() != content:
            raise ValueError(f"Concurrent registry change: {path}")
    public["items"] = [item for item in public["items"] if str(item["case_id"]) not in SELECTIONS] + new_items
    public["count"] = len(public["items"])
    catalog["cases"] = [item for item in catalog["cases"] if item["case_id"] not in SELECTIONS] + [
        {"case_id": case, "session": "Product Cinematography"} for case in SELECTIONS]
    catalog["count"] = len(catalog["cases"])
    write(public_path, public)
    write(catalog_path, catalog)
    write(mosaic_path, mosaics)
    gallery_path.write_bytes(page.encode("utf-8"))
    write(ROOT / ".local-import/selected-products-20260912/selected-results.json", bindings)
    print(f"Added {len(bindings)} selected products; existing product cases and homepage highlights retained.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bundle", required=True, type=Path)
    parser.add_argument("--review-root", required=True, type=Path)
    parser.add_argument("--source-site", required=True, type=Path)
    parser.add_argument("--three-license", required=True, type=Path)
    args = parser.parse_args()
    import_cases(args.bundle.resolve(), args.review_root.resolve(), args.source_site.resolve(), args.three_license.resolve())
