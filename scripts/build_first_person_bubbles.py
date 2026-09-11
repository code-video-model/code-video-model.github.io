#!/usr/bin/env python3
"""Build translucent bubbles from the currently displayed Code Video Model first frames."""

import html
import json
import math
import re
import subprocess
from collections import defaultdict
from pathlib import Path

from PIL import Image
from project_page_experiment_pairs import render_experiment_bubbles

ROOT = Path(__file__).resolve().parents[1] / "project-page-template"
SECTIONS = {
    "First-Person Games": "control-world-states",
    "Bullet Time": "long-horizon-style",
    "Product Cinematography": "product-cinematography",
    "Scientific Visualization": "scientific-visualization",
    "Architectural Cinematics": "architectural-cinematics",
    "Scene / World Editing": "gallery",
    "Robotics Simulation": "robotics-simulation",
    "Trajectory Variation": "trajectory-variation",
}
# A is the displayed first case, not necessarily the unedited source world.
# Labels describe A → B, verified against source_prompt and the original scenes.
PAIRS = {
    "Scene / World Editing": [
        ("583", "663", "Move Chair to Desk"),
        ("586", "666", "Add Left Table"),
        ("601", "681", "Replace Arch with Doorway"),
        ("590", "670", "Close Loading Door"),
        ("595", "675", "Move Car Left"),
        ("591", "671", "Close Double Doors"),
    ],
    "Robotics Simulation": [
        ("563", "564", "Use Humanoid Robot"),
        ("567", "568", "Use Humanoid Robot"),
        ("571", "572", "Use Humanoid Robot"),
    ],
    "Trajectory Variation": [
        ("577", "578", "Take Right Route"),
        ("581", "582", "Follow Perimeter Path"),
    ],
}
NAMES = {
    "first-person-009": "Hyrule Ride",
    "first-person-007": "Tower Glide",
    "first-person-014": "Balrog Bridge",
    "first-person-030": "Forest Spirit",
    "121": "Halo Boarding",
    "132": "Jurassic Encounter",
    "322": "Titan Swing",
    "93": "City Webs",
}

MIN_COLOR_DISTANCE = 0.03
ACCENT_WEIGHT = .3
MAX_BRIGHTNESS_ADJUSTMENT = .08


def extract_accent_candidates(image):
    """Find visible chromatic regions, excluding isolated pixels and near-black areas."""
    quantized = image.quantize(colors=32, method=Image.Quantize.MEDIANCUT)
    swatches = quantized.getpalette()
    total = image.width * image.height
    regions = []
    for count, index in quantized.getcolors():
        color = swatches[index * 3:index * 3 + 3]
        fraction = count / total
        chroma = max(color) - min(color)
        if fraction >= .002 and chroma >= 18 and max(color) >= 60:
            regions.append({"color": color, "fraction": fraction,
                            "salience": chroma * math.sqrt(fraction)})
    return sorted(regions, key=lambda region: (-region["salience"], region["color"]))[:8]


def accent_palette(source, accent):
    return [
        [round(base * (1 - ACCENT_WEIGHT) + highlight * ACCENT_WEIGHT)
         for base, highlight in zip(color, accent)]
        for color in source
    ]


def tint_source_palette(palette, amount):
    """Mix only a small amount of white/black into actual source colors; never rotate hues."""
    endpoint = 255 if amount >= 0 else 0
    return [
        [round(value * (1 - abs(amount)) + endpoint * abs(amount)) for value in color]
        for color in palette
    ]


def perceived_color(palette):
    """Measure the representative tint after 50% compositing over the section background."""
    average = [sum(color[channel] for color in palette) / len(palette) for channel in range(3)]
    rgb = [(value * .5 + background * .5) / 255 for value, background in zip(average, (244, 242, 237))]
    r, g, b = [value / 12.92 if value <= .04045 else ((value + .055) / 1.055) ** 2.4 for value in rgb]
    l = (.4122214708 * r + .5363325363 * g + .0514459929 * b) ** (1 / 3)
    m = (.2119034982 * r + .6806995451 * g + .1073969566 * b) ** (1 / 3)
    s = (.0883024619 * r + .2817188376 * g + .6299787005 * b) ** (1 / 3)
    return (.2104542553 * l + .793617785 * m - .0040720468 * s,
            1.9779984951 * l - 2.428592205 * m + .4505937099 * s,
            .0259040371 * l + .7827717662 * m - .808675766 * s)


def assign_distinct_palettes(records):
    """Mix source-only accents into the main colors; resolve conflicts within each session."""
    sessions = defaultdict(list)
    for record in records:
        sessions[record["session"]].append(record)
    for group in sessions.values():
        chosen = []
        # Reserve faithful colors for chromatic scenes before adapting near-neutral ones.
        for record in sorted(group, key=lambda row: (
            -(max(row["source_rgb"]) - min(row["source_rgb"])), row["case_id"]
        )):
            candidates = []
            accents = record["accent_candidates"]
            for rank, accent in enumerate(accents):
                base_palette = accent_palette(record["source_palette"], accent["color"])
                for step in range(-8, 9):
                    amount = step / 100
                    palette = tint_source_palette(base_palette, amount)
                    perceived = perceived_color(palette)
                    separation = min((math.dist(perceived, previous) for previous in chosen), default=1)
                    candidates.append({"cost": abs(amount) + rank * .008, "amount": amount,
                                       "palette": palette, "perceived": perceived,
                                       "separation": separation, "accent": accent["color"]})
            separated = [candidate for candidate in candidates if candidate["separation"] >= MIN_COLOR_DISTANCE]
            if separated:
                selected = min(separated, key=lambda candidate: candidate["cost"])
            else:
                selected = min(candidates, key=lambda candidate: (-candidate["separation"], candidate["cost"]))
                print(f"Palette note: {record['case_id']} retains source colors over forced separation", flush=True)
            palette = selected["palette"]
            record["palette"] = palette
            record["rgb"] = [round(sum(color[c] for color in palette) / 4) for c in range(3)]
            record["palette_method"] = "source-main70-accent30-v3"
            record["accent_color"] = selected["accent"]
            record["main_weight"] = 1 - ACCENT_WEIGHT
            record["accent_weight"] = ACCENT_WEIGHT
            record["brightness_adjustment"] = selected["amount"]
            record["separation_satisfied"] = selected["separation"] >= MIN_COLOR_DISTANCE
            chosen.append(selected["perceived"])


def displayed_model_asset(item):
    if item.get("display_code_video_model"):
        return item["display_code_video_model"], item["display_code_video_model_sha256"]
    if item.get("code_video_model_v2"):
        return item["code_video_model_v2"], item["code_video_model_v2_sha256"]
    return item["code_video_model"], item["code_video_model_sha256"]


def build_records(items, *, case_ids=None):
    if {str(item["case_id"]) for item in items if item["session"] == "First-Person Games"} != set(NAMES):
        raise ValueError("Bubble titles must cover exactly the first-person Case set")
    if case_ids is not None and set(case_ids) - {str(item["case_id"]) for item in items}:
        raise ValueError("Unknown case requested for cover refresh")
    assets = ROOT / "static/images/first-person-bubbles"
    assets.mkdir(parents=True, exist_ok=True)
    provenance = []
    for item in items:
        case_id = str(item["case_id"])
        if case_ids is not None and case_id not in case_ids:
            continue
        model_video, model_sha = displayed_model_asset(item)
        suffix = f"-{model_sha[:12]}" if case_ids is not None else ""
        relative = f"static/images/first-person-bubbles/{case_id}{suffix}.png"
        subprocess.run([
            "ffmpeg", "-v", "error", "-y", "-i",
            str(ROOT / "static/project-page-cases" / model_video),
            "-vf", "select=eq(n\\,0),scale=384:-1", "-frames:v", "1", str(ROOT / relative),
        ], check=True)
        with Image.open(ROOT / relative) as image:
            rgb_image = image.convert("RGB")
            color = list(rgb_image.resize((1, 1), Image.Resampling.BOX).getpixel((0, 0)))
            quantized = rgb_image.quantize(colors=4, method=Image.Quantize.MEDIANCUT)
            swatches = quantized.getpalette()
            # Frequency sorting discards spatial information: no scene silhouettes survive.
            palette = [
                swatches[index * 3:index * 3 + 3]
                for count, index in sorted(quantized.getcolors(), reverse=True)
            ]
            palette += [palette[-1]] * (4 - len(palette))
        provenance.append({"case_id": case_id, "name": NAMES.get(case_id, f"Case {case_id}"), "session": item["session"],
                           "source_rgb": color, "source_palette": palette,
                           "rgb": color, "palette": palette, "source_kind": "displayed-code-video-model",
                           "first_frame": relative, "source_video": model_video,
                           "source_sha256": model_sha, "frame": 0, "alpha": .5})
    return provenance


def render_section(original, session, section_id, records):
    first_person = session == "First-Person Games"
    expanded_id = "fps-expanded" if first_person else f"{section_id}-expanded"
    template_id = "first-person-original-pairs" if first_person else f"{section_id}-original-pairs"
    saved = re.search(rf'<template id="{template_id}">(.*?)</template>', original, re.S)
    figures = saved.group(1).strip() if saved else "\n".join(
        re.findall(r'<figure class="agent-control-item agent-control-player">.*?</figure>', original, re.S)
    )
    if not records or len(re.findall(r"<figure\b", figures)) != len(records) * 2:
        raise ValueError(f"Original pair count changed unexpectedly: {session}")
    pairs = PAIRS.get(session, [])
    by_id = {record["case_id"]: record for record in records}
    if pairs and (len(by_id) != len(records) or
                  set(by_id) != {case_id for a, b, _ in pairs for case_id in (a, b)}):
        raise ValueError(f"Grouped cases must cover every A/B variant exactly once: {session}")
    bubbles_to_render = [(by_id[a], b, label) for a, b, label in pairs] if pairs else [
        (record, None, None) for record in records
    ]
    legacy_id = f"{section_id}-legacy-gallery"
    saved_legacy = re.search(rf'<template id="{legacy_id}">.*?</template>', original, re.S)
    legacy = re.search(r'<div class="video-gallery legacy-gallery" hidden>.*?</figure>\s*</div>', original, re.S)
    legacy_html = saved_legacy.group() if saved_legacy else (
        f'<template id="{legacy_id}">{legacy.group()}</template>' if legacy else ""
    )
    opening = re.match(r"<section\b[^>]*>", original).group()
    bubbles = []
    for record, variant_b, edit_label in bubbles_to_render:
        case_id, name = record["case_id"], record["name"]
        color, palette = record["rgb"], record["palette"]
        rgb = ", ".join(map(str, color))
        palette_style = "; ".join(
            f"--case-color-{index}: {', '.join(map(str, value))}"
            for index, value in enumerate(palette, 1)
        )
        pair_data = (f'data-case-b="{variant_b}" data-edit-label="{html.escape(edit_label)}" '
                     if variant_b else "")
        accessible_name = (f"Open cases {case_id} and {variant_b}; {edit_label}"
                           if variant_b else f"Open {name}, case {case_id}")
        bubbles.append(
            f'          <div class="fps-bubble-float">'
            f'<a class="case-explore fps-case-bubble" href="?case={case_id}" '
            f'data-case="{case_id}" data-title="{html.escape(name)}" data-color="{rgb}" '
            f'{pair_data}'
            f'data-palette="{html.escape(json.dumps(palette))}" '
            f'aria-label="{html.escape(accessible_name)}" aria-controls="{expanded_id}" aria-expanded="false" '
            f'style="--case-rgb: {rgb}; {palette_style}">'
            f'<img src="{record["first_frame"]}?v=code-model-frame-1" width="384" height="216" alt="" loading="lazy">'
            '</a></div>'
        )
    variant_controls = f'''
            <div class="fps-variant-controls" role="group" aria-label="World variant" hidden>
              <button type="button" class="fps-variant" data-variant="a" aria-pressed="true" aria-controls="{section_id}-frame-slot">Restore Original</button>
              <button type="button" class="fps-variant" data-variant="b" aria-pressed="false" aria-controls="{section_id}-frame-slot">Change World</button>
            </div>''' if pairs else ""
    return opening + f'''
      <div class="container fps-bubbles-host">
        <h2>{html.escape(session)}</h2>
        <div class="fps-bubble-grid" aria-label="{html.escape(session)} cases">
''' + "\n".join(bubbles) + "\n" + render_experiment_bubbles(section_id) + '''
        </div>
''' + f'''        <div id="{expanded_id}" class="fps-expanded" hidden>
          <div class="fps-expanded-heading">
            <button type="button" class="fps-back">More Worlds</button>
{variant_controls}
          </div>
          <p class="fps-load-status" role="status" aria-live="polite"></p>
          <div id="{section_id}-frame-slot" class="fps-frame-slot"></div>
        </div>
        <template id="{template_id}">
''' + figures + f'''
        </template>
{legacy_html}
      </div>
    </section>'''


def main():
    if (ROOT.parent / 'PUBLIC_SYNC.md').exists():
        raise SystemExit('This legacy generator predates the public snapshot. Edit the current HTML directly; obtain the matching upstream generator before regeneration. See PUBLIC_SYNC.md.')
    manifest = json.loads((ROOT / "static/project-page-cases/prompts.json").read_text())
    items = [item for item in manifest["items"] if item["session"] in SECTIONS and item.get("gallery_visible", True)]
    provenance = build_records(items)
    index = ROOT / "gallery.html"
    text = index.read_text()
    for session, section_id in SECTIONS.items():
        pattern = re.compile(rf'<section\b[^>]*\bid="{section_id}"[^>]*>.*?</section>', re.S)
        old = pattern.search(text)
        if not old:
            raise ValueError(f"Section not found: {session}")
        records = [record for record in provenance if record["session"] == session]
        section = render_section(old.group(), session, section_id, records)
        text = text[:old.start()] + section + text[old.end():]
    if "static/css/first-person-bubbles.css" not in text:
        text = text.replace("</head>", '  <link rel="stylesheet" href="static/css/first-person-bubbles.css?v=1">\n</head>')
    if "static/js/first-person-bubbles.js" not in text:
        text = text.replace("</body>", '  <script src="static/js/first-person-bubbles.js?v=1"></script>\n</body>')
    text = re.sub(r"(static/(?:css/first-person-bubbles\.css|js/first-person-bubbles\.js))\?v=[^\"']+",
                  r"\1?v=group23-pairs-27", text)
    text = re.sub(r'<script(?: type="module")? src="(static/js/first-person-bubbles\.js[^"]*)"',
                  r'<script type="module" src="\1"', text)
    text = text.replace('href="behind-frame.html?case=', 'href="?case=')
    index.write_text(text)
    (ROOT / "static/images/first-person-bubbles/manifest.json").write_text(json.dumps(provenance, indent=2) + "\n")
    print(json.dumps({"bubbles": text.count('class="case-explore fps-case-bubble"'),
                      "experiment_pairs": text.count('data-selection='),
                      "cases": len(items), "first_frame_alpha": .5, "sections": list(SECTIONS)}))


if __name__ == "__main__":
    main()
