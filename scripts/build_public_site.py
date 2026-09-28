"""Package the current homepage, Gallery and their reachable local resources."""
import argparse
import json
import re
import shutil
from collections import deque
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1] / "project-page-template"
STRINGS = re.compile(r"""["'`]([^"'`\n]+)["'`]|url\(\s*([^)\s]+)\s*\)""")
TEXT_SUFFIXES = {".html", ".css", ".js", ".mjs", ".json", ".txt", ".svg"}
PROVENANCE_KEYS = {"provenance", "source_directory", "sourcePath", "source_page",
                   "source_url", "source_video", "source_manifest", "original_run"}


class Document(HTMLParser):
    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.references = []
        self.cases = set()
        self.selections = set()
        self.base = None
        self.cards = 0
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "base":
            self.base = attrs.get("href")
        self.references.extend(value for value in attrs.values() if value)
        classes = (attrs.get("class") or "").split()
        if "fps-case-bubble" in classes:
            self.cards += 1
        if "fps-case-bubble" in classes or "application-preview" in classes:
            for key in ["data-case", "data-case-b"]:
                if attrs.get(key):
                    self.cases.add(attrs[key])
            if attrs.get("data-selection"):
                self.selections.add(attrs["data-selection"])


def json_strings(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, list):
        for item in value:
            yield from json_strings(item)
    elif isinstance(value, dict):
        for key, item in value.items():
            if key not in PROVENANCE_KEYS:
                yield from json_strings(item)


def build(source, output):
    source, output = source.resolve(), output.resolve()
    if output == source or output.is_relative_to(source) or source.is_relative_to(output):
        raise ValueError("Output must be separate from the source tree")
    if output.exists() and any(output.iterdir()):
        raise ValueError("Output directory must be empty")
    pending = deque()
    files = set()
    transforms = {}

    def add(path):
        path = (source / path).resolve()
        if not path.is_relative_to(source) or not path.is_file():
            raise ValueError(f"Missing or invalid site dependency: {path}")
        rel = path.relative_to(source).as_posix()
        if rel not in files:
            files.add(rel)
            pending.append(rel)

    def manifest(rel, data):
        transforms[rel] = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
        add(rel)

    documents = []
    for name in ["index.html", "gallery.html"]:
        text = (source / name).read_text()
        # Inert legacy templates are not used by the current runtime.
        text = re.sub(r"<template\b[^>]*>.*?</template\s*>", "", text, flags=re.S | re.I)
        transforms[name] = text
        documents.append(Document(text))
        add(name)
    case_ids = set().union(*(doc.cases for doc in documents))
    selection_ids = set().union(*(doc.selections for doc in documents))
    catalog = json.loads((source / "static/interactive/catalog.json").read_text())
    case_ids.update(str(item["case_id"]) for item in catalog["cases"] if item.get("display_name"))
    catalog["cases"] = [item for item in catalog["cases"] if str(item["case_id"]) in case_ids]
    catalog["count"] = len(catalog["cases"])
    manifest("static/interactive/catalog.json", catalog)

    data = json.loads((source / "static/project-page-cases/prompts.json").read_text())
    items = {str(item["case_id"]): item for item in data["items"] if str(item["case_id"]) in case_ids}
    if set(items) != case_ids:
        raise ValueError(f"Missing published cases: {case_ids - set(items)}")
    registry = json.loads((source / "static/interactive/experiment-pairs.json").read_text())
    pairs = [pair for pair in registry["pairs"] if pair["id"] in selection_ids]
    if {pair["id"] for pair in pairs} != selection_ids:
        raise ValueError("Missing selected experiment")

    packages = set()
    for cid, item in items.items():
        packages.add(item.get("interactive_source") or cid + "/")
        video = item.get("display_code_video_model") or item.get("code_video_model_v2") or item.get("code_video_model")
        if not video:
            raise ValueError(f"No delivery video for {cid}")
        item["display_code_video_model"] = video
        add("static/project-page-cases/" + video)
    for pair in pairs:
        for cid, asset in pair["assets"].items():
            item = items[cid]
            if not asset.get("interactive_source"):
                if asset["threejs_sha256"] != item["threejs_sha256"]:
                    original = item["original_threejs"]
                    if asset["threejs_sha256"] != original["sha256"]:
                        raise ValueError(f"Unresolved source revision: {cid}")
                    asset["interactive_source"] = original["interactive_source"]
                else:
                    asset["interactive_source"] = item.get("interactive_source") or cid + "/"
            packages.add(asset["interactive_source"])
            add("static/project-page-cases/" + asset["video"])
    fields = {"case_id", "session", "display_name", "interactive_source", "threejs_sha256",
              "display_code_video_model", "display_code_video_model_sha256", "source_prompt"}
    data["items"] = [{key: value for key, value in item.items() if key in fields} for item in items.values()]
    data["count"] = len(data["items"])
    manifest("static/project-page-cases/prompts.json", data)
    pair_fields = {"id", "a", "b", "label", "display_name", "assets"}
    asset_fields = {"video", "sha256", "threejs_sha256", "origin", "width", "height", "frames", "fps", "interactive_source"}
    for pair in pairs:
        for asset in pair["assets"].values():
            for key in list(asset):
                if key not in asset_fields:
                    del asset[key]
    manifest("static/interactive/experiment-pairs.json",
             {"pairs": [{key: value for key, value in pair.items() if key in pair_fields} for pair in pairs]})
    add("static/interactive/workbench.html")
    for package in packages:
        folder = (source / "static/interactive" / package).resolve()
        if not folder.is_relative_to(source / "static/interactive") or not (folder / "case.json").is_file():
            raise ValueError(f"Missing source package: {package}")
        for path in folder.rglob("*"):
            if path.is_file():
                add(path)

    while pending:
        rel = pending.popleft()
        path = source / rel
        if path.suffix not in TEXT_SUFFIXES:
            continue
        text = transforms.get(rel, path.read_text())
        if rel == "static/interactive/cs2-active-duel/runtime/case/index.html":
            # Only the standalone controls used this absent audio track. The
            # embedded inspector gets sound from its generated result video.
            text = text.replace('src="audio.wav" preload="auto"', 'preload="none"')
            transforms[rel] = text
        bases = [path.parent, source]
        if path.suffix == ".json":
            refs = list(json_strings(json.loads(text)))
        else:
            refs = [match[1] or match[2] for match in STRINGS.finditer(text)]
        if path.suffix == ".html":
            document = Document(text)
            refs.extend(document.references)
            if document.base:
                bases.insert(0, (path.parent / document.base).resolve())
        for value in refs:
            ref = value.strip()
            if ref.startswith(("http:", "https:", "//", "data:", "blob:", "#", "/")):
                continue
            ref = unquote(ref.split("?", 1)[0].split("#", 1)[0])
            if not ref or len(ref) > 400 or "${" in ref or "\0" in ref:
                continue
            if any(len(part.encode()) > 255 for part in ref.split("/")):
                continue
            for base in bases:
                candidate = (base / ref).resolve()
                if candidate.is_relative_to(source) and candidate.is_file():
                    add(candidate)
                    break

    output.mkdir(parents=True, exist_ok=True)
    for rel in sorted(files):
        target = output / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        if rel in transforms:
            target.write_text(transforms[rel])
        else:
            shutil.copyfile(source / rel, target)
    (output / ".nojekyll").touch()
    sizes = [(p.stat().st_size, p.relative_to(output).as_posix()) for p in output.rglob("*") if p.is_file()]
    total = sum(size for size, _ in sizes)
    largest = max(sizes)
    if total >= 1_000_000_000 or largest[0] >= 100_000_000:
        raise ValueError(f"Pages size budget exceeded: total={total}, largest={largest}")
    return {
        "files": sorted(rel for _, rel in sizes), "bytes": total, "largest_file": largest,
        "case_ids": sorted(case_ids), "selections": sorted(selection_ids),
        "source_packages": sorted(packages), "gallery_entries": documents[1].cards,
        "videos": sum(rel.endswith(".mp4") for _, rel in sizes),
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=ROOT)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    report = build(args.source, args.output)
    if args.report:
        args.report.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({key: len(value) if key in {"files", "case_ids", "selections", "source_packages"} else value
                      for key, value in report.items()}, indent=2))
