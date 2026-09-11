#!/usr/bin/env python3
"""Build the main-page previews from the first published case in each Gallery section."""

import hashlib
import html
import json
import re
import subprocess
from pathlib import Path

from build_first_person_bubbles import SECTIONS, displayed_model_asset

ROOT = Path(__file__).resolve().parents[1] / "project-page-template"
START = "          <!-- application-previews:start -->"
END = "          <!-- application-previews:end -->"


def media_assets(item):
    result, result_hash = displayed_model_asset(item)
    assets = []
    for label, relative, expected in [
        ("Three.js", item["threejs_video"], item["threejs_sha256"]),
        ("Code Video Model", result, result_hash),
    ]:
        video = ROOT / "static/project-page-cases" / relative
        if hashlib.sha256(video.read_bytes()).hexdigest() != expected:
            raise ValueError(f"Published input changed: {video}")
        poster = ROOT / "static/images/application-previews" / f"{expected}.jpg"
        poster.parent.mkdir(parents=True, exist_ok=True)
        if not poster.exists():
            subprocess.run(["ffmpeg", "-v", "error", "-n", "-i", str(video), "-frames:v", "1",
                            "-vf", "scale=480:-1", "-q:v", "3", str(poster)], check=True)
        assets.append({"label": label, "path": relative, "sha256": expected,
                       "src": video.relative_to(ROOT).as_posix(),
                       "poster": poster.relative_to(ROOT).as_posix()})
    return assets


def main():
    if (ROOT.parent / 'PUBLIC_SYNC.md').exists():
        raise SystemExit('This legacy generator predates the public snapshot. Edit the current HTML directly; obtain the matching upstream generator before regeneration. See PUBLIC_SYNC.md.')
    gallery = (ROOT / "gallery.html").read_text()
    items = json.loads((ROOT / "static/project-page-cases/prompts.json").read_text())["items"]
    by_id = {str(item["case_id"]): item for item in items}
    cards = []
    provenance = []
    for match in re.finditer(r'<section\b[^>]*\bid="([^"]+)"[^>]*>(.*?)</section>', gallery, re.S):
        section_id, content = match.groups()
        first = re.search(r'<a\b[^>]*class="[^"]*\bfps-case-bubble\b[^"]*"[^>]*data-case="([^"]+)"[^>]*>', content)
        if first is None:
            continue
        item = by_id[first[1]]
        sources = media_assets(item)
        edited_case = re.search(r'\bdata-case-b="([^"]+)"', first[0])
        edited = media_assets(by_id[edited_case[1]]) if edited_case else None
        edit_label = None
        if edited:
            edit_label = html.unescape(re.search(r'\bdata-edit-label="([^"]+)"', first[0])[1])
        figures = []
        for position, asset in enumerate(sources):
            variants = ""
            if edited:
                variants = (f'data-src-a="{asset["src"]}" data-poster-a="{asset["poster"]}" '
                            f'data-src-b="{edited[position]["src"]}" data-poster-b="{edited[position]["poster"]}" ')
            figures.append(
                f'              <figure><figcaption>{asset["label"]}</figcaption>'
                f'<video playsinline muted preload="none" '
                f'poster="{asset["poster"]}" data-src="{asset["src"]}" {variants}'
                f'aria-label="{html.escape(item["session"])} {asset["label"]}"></video></figure>'
            )
        edit_controls = ""
        variant_attributes = ""
        if edited:
            variant_attributes = f' data-case-b="{html.escape(edited_case[1])}" data-variant="a"'
            edit_controls = (
                '              <div class="application-edit-controls" role="group" aria-label="Edit preview">\n'
                f'                <button class="application-edit" type="button" aria-pressed="false">{html.escape(edit_label)}</button>\n'
                '                <button class="application-restore" type="button" aria-pressed="true" disabled>Restore Original</button>\n'
                '                <span class="application-version" role="status">Original</span>\n'
                '              </div>\n'
            )
        cards.append(
            f'            <article class="application-preview" data-case="{html.escape(first[1])}" '
            f'data-section="{html.escape(section_id)}"{variant_attributes}>\n'
            f'              <h2><a href="gallery.html#{html.escape(section_id)}">{html.escape(item["session"])}</a></h2>\n'
            '              <div class="application-video-pair">\n' + "\n".join(figures) + '\n              </div>\n'
            '              <div class="application-transport">\n'
            '                <button class="application-play" type="button" aria-label="Play video pair">Play</button>\n'
            '                <input class="application-seek" type="range" min="0" max="1000" step="1" value="0" '
            'aria-label="Video pair progress" disabled>\n'
            '                <button class="application-sound" type="button" aria-pressed="false">Sound off</button>\n'
            '              </div>\n' + edit_controls +
            '              <p class="application-status" role="status" aria-live="polite"></p>\n'
            '            </article>'
        )
        provenance.append({"section": item["session"], "section_id": section_id, "case_id": first[1],
                           "threejs": sources[0]["path"], "threejs_sha256": sources[0]["sha256"],
                           "result": sources[1]["path"], "result_sha256": sources[1]["sha256"],
                           **({"edited": {"case_id": edited_case[1], "label": edit_label,
                                          "threejs": edited[0]["path"], "threejs_sha256": edited[0]["sha256"],
                                          "result": edited[1]["path"], "result_sha256": edited[1]["sha256"]}}
                              if edited else {})})
    if len(cards) != len(SECTIONS):
        raise ValueError(f"Expected {len(SECTIONS)} Applications, got {len(cards)}")
    index = ROOT / "index.html"
    text = index.read_text()
    if text.count(START) != 1 or text.count(END) != 1:
        raise ValueError("Main-page preview markers missing or duplicated")
    before, remainder = text.split(START)
    _, after = remainder.split(END)
    index.write_text(before + START + "\n" + "\n".join(cards) + "\n" + END + after)
    (ROOT / "static/images/application-previews/manifest.json").write_text(json.dumps(provenance, indent=2) + "\n")
    print(f"Published {len(cards)} first-case previews ({sum('edited' in item for item in provenance)} editable pairs)")


if __name__ == "__main__":
    main()
