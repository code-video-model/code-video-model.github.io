#!/usr/bin/env python3
"""Normalize visible Project Page card names while preserving stable internal IDs."""

import html
import json
import re
import subprocess
from pathlib import Path

from build_native_posters import ensure_poster, main as rebuild_native_posters


ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "project-page-template"
SECTIONS = (
    ("anime", "Anime"),
    ("long-horizon-style", "Bullet_Time"),
    ("control-world-states", "Gaming"),
    ("gallery", "Scene_World_Editing"),
    ("robotics-simulation", "Robotics_Trajectory_Control"),
    ("architectural-cinematics", "Architectural_Cinematics"),
    ("product-cinematography", "Product_Cinematography"),
    ("physical-grounding", "Physical_Grounding"),
    ("reconstruction-3d-4d", "3D_4D_Reconstruction"),
)
PRODUCT_ORDER = (
    "624",
    "625",
    "636",
    "640",
    "product-new15-07",
    "product-new15-09",
    "product-new15-06",
    "product-new15-04",
)
ROBOTICS_ORDER = (
    ("563", ""),
    ("581", "trajectory-group23-581-582-image-group23-4-v12"),
    ("564", "robotics-group23-564-563-image-group23-2-v13"),
    ("564", "robotics-group23-564-563-image-group23-4-v15"),
    ("571", ""),
    ("577", "trajectory-group23-577-578-image-group23-2-v16"),
)
RECONSTRUCTION_ORDER = (
    "astra-bicycle",
    "astra-garden-gray",
    "442",
    "astra-room-gray",
    "astra-bonsai",
    "astra-cook-spinach",
    "astra-kitchen",
    "astra-train",
)


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_crlf_json(path, data):
    rendered = (json.dumps(data, indent=2, ensure_ascii=False) + "\n").replace("\n", "\r\n")
    path.write_bytes(rendered.encode("utf-8"))


def ensure_webp(png):
    target = png.with_suffix(".webp")
    if not target.exists():
        subprocess.run([
            "ffmpeg", "-v", "error", "-y", "-i", str(png),
            "-c:v", "libwebp", "-lossless", "1", "-compression_level", "6",
            str(target),
        ], check=True)
    return target


def normalize_homepage_posters():
    manifest = read_json(SITE / "static/images/first-frames-native/manifest.json")
    for record in manifest:
        ensure_webp(SITE / record["poster"])
    path = SITE / "index.html"
    text = path.read_text(encoding="utf-8")
    text = re.sub(
        r'((?:poster|data-poster|data-poster-a|data-poster-b)="[^"]+)\.png"',
        r'\1.webp"',
        text,
    )
    path.write_bytes(text.replace("\n", "\r\n").encode("utf-8"))


def update_architectural_preview():
    prompts = read_json(SITE / "static/project-page-cases/prompts.json")
    item = next(record for record in prompts["items"] if str(record["case_id"]) == "643")
    proxy_relative = item["threejs_video"]
    output_relative = item.get("display_code_video_model") or item["code_video_model"]
    proxy = SITE / "static/project-page-cases" / proxy_relative
    output = SITE / "static/project-page-cases" / output_relative
    proxy_poster = ensure_webp(ensure_poster(proxy)).relative_to(SITE).as_posix()
    output_poster = ensure_webp(ensure_poster(output)).relative_to(SITE).as_posix()

    path = SITE / "index.html"
    text = path.read_text(encoding="utf-8")
    match = re.search(
        r'<section class="category-shell" id="architectural-cinematics">.*?</section>',
        text,
        re.S,
    )
    if not match:
        raise ValueError("Architectural Cinematics homepage preview not found")
    section = match.group()
    section = re.sub(r'\bdata-case="[^"]+"', 'data-case="643"', section, count=1)
    videos = list(re.finditer(r'<video\b[^>]*>', section))
    if len(videos) != 2:
        raise ValueError("Architectural Cinematics preview video pair changed")
    replacements = (
        (proxy_relative, proxy_poster),
        (output_relative, output_poster),
    )
    offset = 0
    for video, (source, poster) in zip(videos, replacements):
        markup = video.group()
        markup = re.sub(r'\bdata-src="[^"]*"', f'data-src="static/project-page-cases/{source}"', markup)
        markup = re.sub(r'\bdata-poster="[^"]*"', f'data-poster="{poster}"', markup)
        start, end = video.start() + offset, video.end() + offset
        section = section[:start] + markup + section[end:]
        offset += len(markup) - (video.end() - video.start())
    text = text[:match.start()] + section + text[match.end():]
    path.write_bytes(text.replace("\n", "\r\n").encode("utf-8"))

    manifest_path = SITE / "static/images/application-previews/manifest.json"
    manifest = read_json(manifest_path)
    preview = next(entry for entry in manifest if entry["section_id"] == "architectural-cinematics")
    preview.update({
        "case_id": "643",
        "threejs": proxy_relative,
        "threejs_sha256": item["threejs_sha256"],
        "result": output_relative,
        "result_sha256": item.get("display_code_video_model_sha256") or item["code_video_model_sha256"],
        "proxy_poster": proxy_poster,
        "output_poster": output_poster,
    })
    write_crlf_json(manifest_path, manifest)


def update_physical_preview():
    prompts = read_json(SITE / "static/project-page-cases/prompts.json")
    item = next(
        record for record in prompts["items"]
        if str(record["case_id"]) == "physical-isochronous"
    )
    proxy_relative = item["threejs_video"]
    output_relative = item.get("display_code_video_model") or item["code_video_model"]
    proxy = SITE / "static/project-page-cases" / proxy_relative
    output = SITE / "static/project-page-cases" / output_relative
    proxy_poster = ensure_webp(ensure_poster(proxy)).relative_to(SITE).as_posix()
    output_poster = ensure_webp(ensure_poster(output)).relative_to(SITE).as_posix()

    path = SITE / "index.html"
    text = path.read_text(encoding="utf-8")
    match = re.search(
        r'<section class="category-shell" id="physical-grounding">.*?</section>',
        text,
        re.S,
    )
    if not match:
        raise ValueError("Physical Grounding homepage preview not found")
    section = match.group()
    section = re.sub(
        r'\bdata-case="[^"]+"',
        'data-case="physical-isochronous"',
        section,
        count=1,
    )
    videos = list(re.finditer(r'<video\b[^>]*>', section))
    if len(videos) != 2:
        raise ValueError("Physical Grounding preview video pair changed")
    replacements = (
        (proxy_relative, proxy_poster),
        (output_relative, output_poster),
    )
    offset = 0
    for video, (source, poster) in zip(videos, replacements):
        markup = video.group()
        markup = re.sub(
            r'\bdata-src="[^"]*"',
            f'data-src="static/project-page-cases/{source}"',
            markup,
        )
        markup = re.sub(
            r'\bdata-poster="[^"]*"',
            f'data-poster="{poster}"',
            markup,
        )
        start, end = video.start() + offset, video.end() + offset
        section = section[:start] + markup + section[end:]
        offset += len(markup) - (video.end() - video.start())
    text = text[:match.start()] + section + text[match.end():]
    path.write_bytes(text.replace("\n", "\r\n").encode("utf-8"))

    manifest_path = SITE / "static/images/application-previews/manifest.json"
    manifest = read_json(manifest_path)
    preview = next(entry for entry in manifest if entry["section_id"] == "physical-grounding")
    preview.update({
        "case_id": "physical-isochronous",
        "threejs": proxy_relative,
        "threejs_sha256": item["threejs_sha256"],
        "result": output_relative,
        "result_sha256": item.get("display_code_video_model_sha256") or item["code_video_model_sha256"],
        "proxy_poster": proxy_poster,
        "output_poster": output_poster,
    })
    write_crlf_json(manifest_path, manifest)


def section_match(text, section_id):
    match = re.search(
        rf'<section\b[^>]*\bid="{re.escape(section_id)}"[^>]*>.*?</section>',
        text,
        re.S,
    )
    if not match:
        raise ValueError(f"Section not found: {section_id}")
    return match


def move_section_after(text, section_id, anchor_id):
    anchor = section_match(text, anchor_id)
    section = section_match(text, section_id)
    between = text[anchor.end():section.start()] if anchor.end() <= section.start() else ""
    if section.start() >= anchor.end() and "<section" not in between:
        return text

    block = section.group()
    text = text[:section.start()] + text[section.end():]
    anchor = section_match(text, anchor_id)
    return text[:anchor.end()] + "\n\n" + block + text[anchor.end():]


def reorder_page_sections():
    expected = [section_id for section_id, _ in SECTIONS]
    for filename in ("index.html", "gallery.html"):
        path = SITE / filename
        text = path.read_text(encoding="utf-8")
        text = move_section_after(text, "robotics-simulation", "gallery")
        order = []
        for tag in re.findall(r'<section\b[^>]*>', text):
            if not re.search(r'\bclass="[^"]*(?:category-shell|gallery-section)', tag):
                continue
            section_id = re.search(r'\bid="([^"]+)"', tag)
            if section_id:
                order.append(section_id.group(1))
        visible_order = [section_id for section_id in order if section_id in expected]
        if len(visible_order) != len(expected) or set(visible_order) != set(expected):
            raise ValueError(f"Unexpected {filename} sections: {visible_order}")
        scene_index = visible_order.index("gallery")
        if visible_order[scene_index + 1] != "robotics-simulation":
            raise ValueError(f"Robotics does not follow Scene in {filename}: {visible_order}")
        path.write_bytes(text.replace("\n", "\r\n").encode("utf-8"))

    path = SITE / "static/images/application-previews/manifest.json"
    manifest = read_json(path)
    by_section = {entry["section_id"]: entry for entry in manifest}
    if set(by_section) != set(expected):
        raise ValueError("Application preview manifest sections changed unexpectedly")
    write_crlf_json(path, [by_section[section_id] for section_id in expected])


def bubble_case(bubble):
    return re.search(r'\bdata-case="([^"]+)"', bubble).group(1)


def reorder_products(text):
    match = section_match(text, "product-cinematography")
    section = match.group()
    grid = re.search(
        r'(<div class="fps-bubble-grid" aria-label="Product Cinematography cases">)(.*?)(</div>\s*<div id="product-cinematography-expanded")',
        section,
        re.S,
    )
    if not grid:
        raise ValueError("Product Cinematography grid not found")
    bubbles = re.findall(
        r'\s*<div class="fps-bubble-float"><a[^\n]*?</a></div>',
        grid.group(2),
    )
    by_case = {bubble_case(bubble): bubble.strip() for bubble in bubbles}
    if set(by_case) != set(PRODUCT_ORDER):
        raise ValueError("Product Cinematography cases changed unexpectedly")
    grid_content = "".join(
        f"\n          {by_case[case_id]}" for case_id in PRODUCT_ORDER
    ) + "\n        "
    section = section[:grid.start(2)] + grid_content + section[grid.end(2):]

    template = re.search(
        r'<template id="product-cinematography-original-pairs">(.*?)</template>',
        section,
        re.S,
    )
    if template:
        figures = list(re.finditer(
            r'\s*<figure class="agent-control-item agent-control-player">.*?</figure>',
            template.group(1),
            re.S,
        ))
        if len(figures) not in (8, len(PRODUCT_ORDER) * 2):
            raise ValueError("Unexpected Product Cinematography pair count")
        if len(figures) == len(PRODUCT_ORDER) * 2:
            current_order = [bubble_case(bubble) for bubble in bubbles]
            groups = {
                case_id: "".join(
                    figure.group().strip()
                    for figure in figures[index * 2:index * 2 + 2]
                )
                for index, case_id in enumerate(current_order)
            }
            content = "".join(f"\n {groups[case_id]}" for case_id in PRODUCT_ORDER) + "\n"
            section = section[:template.start(1)] + content + section[template.end(1):]
    return text[:match.start()] + section + text[match.end():]


def reorder_robotics(text):
    match = section_match(text, "robotics-simulation")
    section = match.group()
    grid = re.search(
        r'(<div class="fps-bubble-grid" aria-label="Robotics & Trajectory Control cases">)(.*?)(</div>\s*<div id="robotics-simulation-expanded")',
        section,
        re.S,
    )
    if not grid:
        raise ValueError("Robotics & Trajectory Control grid not found")
    bubbles = re.findall(
        r'\s*<div class="fps-bubble-float"><a[^\n]*?</a></div>',
        grid.group(2),
    )
    by_key = {}
    for bubble in bubbles:
        case_id = bubble_case(bubble)
        selection = re.search(r'\bdata-selection="([^"]+)"', bubble)
        by_key[(case_id, selection.group(1) if selection else "")] = bubble.strip()
    if set(by_key) != set(ROBOTICS_ORDER):
        raise ValueError("Robotics & Trajectory Control cases changed unexpectedly")
    content = "".join(
        f"\n          {by_key[key]}" for key in ROBOTICS_ORDER
    ) + "\n        "
    section = section[:grid.start(2)] + content + section[grid.end(2):]
    return text[:match.start()] + section + text[match.end():]


def reorder_reconstruction(text):
    match = section_match(text, "reconstruction-3d-4d")
    section = match.group()
    grid = re.search(
        r'(<div class="fps-bubble-grid" aria-label="3D / 4D Reconstruction cases">)(.*?)(</div>\s*<div id="reconstruction-3d-4d-expanded")',
        section,
        re.S,
    )
    if not grid:
        raise ValueError("3D / 4D Reconstruction grid not found")
    bubbles = re.findall(
        r'\s*<div class="fps-bubble-float"><a[^\n]*?</a></div>',
        grid.group(2),
    )
    current_order = [bubble_case(bubble) for bubble in bubbles]
    by_case = {bubble_case(bubble): bubble.strip() for bubble in bubbles}
    if set(by_case) != set(RECONSTRUCTION_ORDER):
        raise ValueError("3D / 4D Reconstruction cases changed unexpectedly")
    content = "".join(
        f"\n          {by_case[case_id]}" for case_id in RECONSTRUCTION_ORDER
    ) + "\n        "
    section = section[:grid.start(2)] + content + section[grid.end(2):]

    template = re.search(
        r'<template id="reconstruction-3d-4d-original-pairs">(.*?)</template>',
        section,
        re.S,
    )
    if template:
        figures = list(re.finditer(
            r'\s*<figure class="agent-control-item agent-control-player">.*?</figure>',
            template.group(1),
            re.S,
        ))
        if len(figures) == len(RECONSTRUCTION_ORDER) * 2:
            groups = {
                case_id: "".join(
                    figure.group().strip()
                    for figure in figures[index * 2:index * 2 + 2]
                )
                for index, case_id in enumerate(current_order)
            }
            template_content = "".join(
                f"\n {groups[case_id]}" for case_id in RECONSTRUCTION_ORDER
            ) + "\n"
            section = (
                section[:template.start(1)]
                + template_content
                + section[template.end(1):]
            )
    return text[:match.start()] + section + text[match.end():]


def normalize_bubbles(text):
    cards = []
    for section_id, prefix in SECTIONS:
        match = section_match(text, section_id)
        section = match.group()
        grid = re.search(
            rf'(<div class="fps-bubble-grid"[^>]*>)(.*?)(</div>\s*<div id="[^"]*-expanded")',
            section,
            re.S,
        )
        if not grid:
            raise ValueError(f"Bubble grid not found: {section_id}")
        position = 0

        def replace(match):
            nonlocal position
            position += 1
            markup = match.group()
            start = re.search(r'<a\b[^>]*>', markup).group()
            case_id = re.search(r'\bdata-case="([^"]+)"', start).group(1)
            case_b = re.search(r'\bdata-case-b="([^"]+)"', start)
            selection = re.search(r'\bdata-selection="([^"]+)"', start)
            display_name = f"{prefix}_{position:02d}"
            start = re.sub(
                r'\bdata-title="[^"]*"',
                f'data-title="{display_name}"',
                start,
                count=1,
            )
            start = re.sub(
                r'\baria-label="[^"]*"',
                f'aria-label="Open {display_name}"',
                start,
                count=1,
            )
            markup = markup.replace(re.search(r'<a\b[^>]*>', markup).group(), start, 1)
            cards.append({
                "section_id": section_id,
                "display_name": display_name,
                "case": case_id,
                "case_b": case_b.group(1) if case_b else "",
                "selection": selection.group(1) if selection else "",
            })
            return markup

        content = re.sub(
            r'<div class="fps-bubble-float"><a[^\n]*?</a></div>',
            replace,
            grid.group(2),
        )
        section = section[:grid.start(2)] + content + section[grid.end(2):]
        text = text[:match.start()] + section + text[match.end():]
    if len(cards) != 62:
        raise ValueError(f"Expected 62 visible cards, found {len(cards)}")
    names = [card["display_name"] for card in cards]
    if len(names) != len(set(names)):
        raise ValueError("Display names must be unique")
    return text, cards


def base_display_names(cards):
    mapping = {}
    for card in cards:
        if card["selection"]:
            continue
        for case_id in (card["case"], card["case_b"]):
            if case_id:
                existing = mapping.setdefault(case_id, card["display_name"])
                if existing != card["display_name"]:
                    raise ValueError(f"Case {case_id} has conflicting base display names")
    return mapping


def update_homepage_preview_names(cards):
    names = {
        (card["section_id"], card["case"], card["case_b"], card["selection"]):
            card["display_name"]
        for card in cards
    }
    path = SITE / "index.html"
    text = path.read_text(encoding="utf-8")

    def replace(match):
        tag = match.group()
        values = {}
        for key in ("section", "case", "case-b", "selection"):
            attribute = re.search(rf'\bdata-{key}="([^"]*)"', tag)
            values[key] = attribute.group(1) if attribute else ""
        display_name = names.get((
            values["section"],
            values["case"],
            values["case-b"],
            values["selection"],
        ))
        if not display_name:
            return tag
        if re.search(r'\bdata-display-name="[^"]*"', tag):
            return re.sub(
                r'\bdata-display-name="[^"]*"',
                f'data-display-name="{display_name}"',
                tag,
                count=1,
            )
        return tag[:-1] + f' data-display-name="{display_name}">'

    text = re.sub(
        r'<article class="application-preview"[^>]*>',
        replace,
        text,
    )
    path.write_bytes(text.replace("\n", "\r\n").encode("utf-8"))


def update_prompt_names(mapping):
    path = SITE / "static/project-page-cases/prompts.json"
    raw = path.read_bytes()
    for case_id, display_name in mapping.items():
        marker = f'      "case_id": "{case_id}",\r\n'.encode()
        if raw.count(marker) != 1:
            raise ValueError(f"Unexpected prompt record count for case {case_id}")
        pattern = (
            re.escape(marker)
            + rb'(?:      "display_name": "[^"]*",\r\n)?'
        )
        replacement = (
            marker
            + f'      "display_name": "{display_name}",\r\n'.encode()
        )
        raw, count = re.subn(pattern, replacement, raw, count=1)
        if count != 1:
            raise ValueError(f"Unable to update prompt display name: {case_id}")
    path.write_bytes(raw)


def update_interactive_catalog(mapping):
    path = SITE / "static/interactive/catalog.json"
    catalog = read_json(path)
    for entry in catalog["cases"]:
        entry.pop("display_name", None)
        if entry["case_id"] in mapping:
            entry["display_name"] = mapping[entry["case_id"]]
    write_crlf_json(path, catalog)


def update_experiment_pairs(cards):
    path = SITE / "static/interactive/experiment-pairs.json"
    registry = read_json(path)
    selected = {card["selection"]: card["display_name"] for card in cards if card["selection"]}
    for pair in registry["pairs"]:
        pair.pop("display_name", None)
        if pair["id"] in selected:
            pair["display_name"] = selected[pair["id"]]
            if pair.get("cover"):
                pair["cover"]["name"] = selected[pair["id"]]
    write_crlf_json(path, registry)


def update_case_catalog(cards):
    path = ROOT / "scripts/data/case-catalog.json"
    catalog = read_json(path)
    current = {
        f'{card["section_id"]}|{card["case"]}|{card["case_b"]}|{card["selection"]}':
            card["display_name"]
        for card in cards
    }
    for key, entry in catalog["entries"].items():
        if key in current:
            entry["title"] = current[key]
            entry["displayName"] = current[key]
        else:
            entry.pop("displayName", None)
    write_crlf_json(path, catalog)


def update_bubble_manifest(mapping):
    path = SITE / "static/images/first-person-bubbles/manifest.json"
    records = read_json(path)
    for record in records:
        case_id = str(record["case_id"])
        if case_id in mapping:
            record["name"] = mapping[case_id]
    write_crlf_json(path, records)


def main():
    reorder_page_sections()
    update_architectural_preview()
    update_physical_preview()
    rebuild_native_posters()
    normalize_homepage_posters()
    path = SITE / "gallery.html"
    text = path.read_text(encoding="utf-8")
    text = reorder_products(text)
    text = reorder_robotics(text)
    text = reorder_reconstruction(text)
    text, cards = normalize_bubbles(text)
    path.write_bytes(text.replace("\n", "\r\n").encode("utf-8"))
    update_homepage_preview_names(cards)
    mapping = base_display_names(cards)
    update_prompt_names(mapping)
    update_interactive_catalog(mapping)
    update_experiment_pairs(cards)
    update_case_catalog(cards)
    update_bubble_manifest(mapping)
    print(json.dumps({
        "cards": len(cards),
        "product_order": list(PRODUCT_ORDER),
        "example": next(
            card["display_name"]
            for card in cards
            if card["section_id"] == "product-cinematography" and card["case"] == "636"
        ),
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
