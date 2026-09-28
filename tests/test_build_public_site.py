import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    "build_public_site", Path(__file__).resolve().parents[1] / "scripts/build_public_site.py")
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class PublicSiteTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root / "source"
        self.write("index.html", '<main><img src="assets/logo.png"><script src="static/js/page.js"></script></main>')
        self.write("gallery.html", '<a class="fps-case-bubble" data-case="one"></a>'
                   '<template><video src="static/unused.mp4"></video></template>')
        self.write("assets/logo.png", "logo")
        self.write("static/js/page.js", "import './extra.mjs';")
        self.write("static/js/extra.mjs", "export const value=1;")
        self.write("static/unused.mp4", "unused")
        self.write("static/project-page-cases/result.mp4", "video")
        self.write("static/interactive/one/case.json", json.dumps({"case_id": "one"}))
        self.write("static/interactive/one/runtime/index.html", "<canvas></canvas>")
        self.write("static/interactive/workbench.html", "<main></main>")
        self.write("static/interactive/catalog.json", json.dumps(
            {"cases": [{"case_id": "one", "display_name": "One"}]}))
        self.write("static/project-page-cases/prompts.json", json.dumps({"items": [{
            "case_id": "one", "code_video_model": "result.mp4",
            "threejs_sha256": "hash", "provenance": {"source_manifest": "static/history.json"},
        }]}))
        self.write("static/interactive/experiment-pairs.json", '{"pairs":[]}')
        self.write("static/history.json", '{"video":"static/unused.mp4"}')

    def write(self, rel, text):
        path = self.source / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text)

    def test_preserves_live_dependencies_without_history(self):
        output = self.root / "output"
        report = builder.build(self.source, output)
        self.assertIn("assets/logo.png", report["files"])
        self.assertIn("static/js/extra.mjs", report["files"])
        self.assertIn("static/interactive/one/runtime/index.html", report["files"])
        self.assertEqual(report["videos"], 1)
        self.assertEqual(report["gallery_entries"], 1)
        self.assertNotIn("static/unused.mp4", report["files"])
        self.assertNotIn("static/history.json", report["files"])
        self.assertNotIn("<template", (output / "gallery.html").read_text())
        self.assertIn("<template", (self.source / "gallery.html").read_text())
        self.assertTrue((output / ".nojekyll").exists())

    def test_missing_selected_video_is_an_error(self):
        (self.source / "static/project-page-cases/result.mp4").unlink()
        with self.assertRaisesRegex(ValueError, "Missing or invalid"):
            builder.build(self.source, self.root / "output")

    def test_source_cannot_be_used_as_output(self):
        with self.assertRaisesRegex(ValueError, "separate"):
            builder.build(self.source, self.source)

    def test_existing_output_is_not_overwritten(self):
        output = self.root / "output"
        output.mkdir()
        (output / "sentinel").write_text("preserve")
        with self.assertRaisesRegex(ValueError, "empty"):
            builder.build(self.source, output)
        self.assertEqual((output / "sentinel").read_text(), "preserve")


if __name__ == "__main__":
    unittest.main()
