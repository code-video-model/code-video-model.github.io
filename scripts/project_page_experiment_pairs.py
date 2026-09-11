"""Render additional experiment-specific Gallery entries without replacing default cases."""

import html
import json
from pathlib import Path

REGISTRY = Path(__file__).resolve().parents[1] / "project-page-template/static/interactive/experiment-pairs.json"


def render_experiment_bubbles(section_id):
    if not REGISTRY.is_file():
        return ""
    document = json.loads(REGISTRY.read_text())
    rows = []
    for pair in document["pairs"]:
        if pair["section_id"] != section_id or pair["id"] in document.get("hidden_pairs", []):
            continue
        cover = pair["cover"]
        rgb = ", ".join(map(str, cover["rgb"]))
        palette = cover["palette"]
        styles = "; ".join(f"--case-color-{index}: {', '.join(map(str, value))}"
                           for index, value in enumerate(palette, 1))
        identity = html.escape(pair["id"], quote=True)
        title = html.escape(f"Cases {pair['a']} and {pair['b']} / {pair['label']}", quote=True)
        rows.append(
            f'          <div class="fps-bubble-float"><a class="case-explore fps-case-bubble" '
            f'href="?case={pair["a"]}&amp;selection={identity}" data-case="{pair["a"]}" '
            f'data-case-b="{pair["b"]}" data-selection="{identity}" data-title="{title}" '
            f'data-edit-label="{html.escape(pair["edit_label"], quote=True)}" data-color="{rgb}" '
            f'data-palette="{html.escape(json.dumps(palette), quote=True)}" aria-label="Open {title}" '
            f'aria-controls="{section_id}-expanded" aria-expanded="false" style="--case-rgb: {rgb}; {styles}">'
            f'<img src="{cover["first_frame"]}" width="384" height="216" alt="" loading="lazy"></a></div>'
        )
    return "\n".join(rows)
