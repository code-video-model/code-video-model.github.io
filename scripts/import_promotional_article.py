"""Import the reviewed article, reusing existing project videos instead of copying them.

Usage: python scripts/import_promotional_article.py --source /path/to/report-directory
"""

import argparse
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import shutil
from urllib.parse import quote, unquote, urlsplit


SITE = Path(__file__).resolve().parents[1] / "project-page-template"
DEST = SITE / "static/promotional-article"
ATTRIBUTES = {"src", "href", "poster", "data-src-a", "data-src-b", "data-poster-a", "data-poster-b"}


class References(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.urls = set()
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        for name, value in attrs:
            if name in ATTRIBUTES and value and not value.startswith(("http:", "https:", "#", "data:")):
                self.urls.add(value)


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("--source", type=Path, required=True)
    source = cli.parse_args().source.resolve()
    html = (source / "preview.html").read_text()
    markdown = (source / "Code-Video-Model-报道.md").read_text()
    media = json.loads((source / "media-manifest.json").read_text())
    videos = {}
    for item in media:
        for video in [item, item.get("proxy", {}), item.get("after", {}),
                      item.get("after", {}).get("proxy", {})]:
            if video.get("file", "").endswith(".mp4"):
                original = Path(video["source"]).resolve()
                assert original.is_relative_to(SITE), f"Video is outside the project: {original}"
                assert digest(original) == video["sha256"] == digest(source / video["file"])
                videos[video["file"]] = original
    mapping = {}
    for url in sorted(References(html).urls):
        rel = unquote(urlsplit(url).path)
        original = (source / rel).resolve()
        assert original.is_relative_to(source) and original.is_file(), rel
        if original.suffix == ".mp4":
            target = videos[rel]
        else:
            target = DEST / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(original, target)
        published = quote(target.relative_to(SITE).as_posix(), safe="/")
        if target.suffix in {".mp4", ".js", ".css", ".png", ".jpg", ".webp"}:
            published += "?v=" + digest(target)[:16]
        mapping[url] = published
    pattern = re.compile(r'''(\b(?:data-src-a|data-src-b|data-poster-a|data-poster-b|src|href|poster)=["'])([^"']+)(["'])''')

    def replace_attribute(match):
        return match[1] + mapping.get(match[2], match[2]) + match[3]

    published_html = pattern.sub(replace_attribute, html)
    if 'rel="canonical"' not in published_html:
        published_html = published_html.replace(
            "</head>",
            '  <link rel="canonical" href="https://code-video-model.github.io/code_video_model_blog.html">\n</head>',
            1,
        )
    published_markdown = pattern.sub(replace_attribute, markdown)
    published_markdown = re.sub(r"\]\(([^)]+)\)", lambda match: "](" + mapping.get(match[1], match[1]) + ")", published_markdown)
    (SITE / "code_video_model_blog.html").write_text(published_html)
    (SITE / "code_video_model_blog.md").write_text(published_markdown)
    (DEST / "media-map.json").write_text(json.dumps({
        "source_markdown_sha256": digest(source / "Code-Video-Model-报道.md"),
        "source_html_sha256": digest(source / "preview.html"),
        "resources": mapping,
    }, ensure_ascii=False, indent=2) + "\n")
    assert len([url for url in mapping if url.endswith(".mp4")]) == 23
    print(f"Imported article and {len(mapping)} dependencies; all 23 videos reuse existing project files.")


if __name__ == "__main__":
    main()
