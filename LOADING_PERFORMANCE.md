# Loading optimization — 2026-09-11

The current design is preserved. No case, video, selected frame, source code,
gradient, glass treatment, or interaction was removed.

## Findings and changes

- Every homepage video poster was requested eagerly, including below-fold rows.
  Mosaics requested a small PNG immediately, then a native PNG near the viewport.
- Native PNGs and Gallery covers now have quality-92 WebP delivery copies with
  identical pixel dimensions. All native PNGs and video files are retained.
  Across 175 generated copies: 71,078,355 source bytes → 8,462,950 WebP bytes
  (88.1% reduction). WebP delivery is high-quality lossy, not pixel-identical PNG.
- Below-fold video posters use `data-poster` until 350px from the viewport;
  playback/edit actions explicitly hydrate them as well. Hero poster stays eager.
- Mosaics request their final native-resolution WebP once, near the viewport.
  Hidden Gallery cards retain native image lazy loading.
- Google font CSS no longer blocks initial rendering. Existing fallback font
  stacks render while fonts arrive. The font choice itself is unchanged.
- The preview/share origin now serves WebP MIME, gzip text, ETags and conditional
  304 responses. Assets revalidate to keep local changes immediately discoverable.
  Video range responses remain supported; disconnected streams are closed.

## Reproducible cold-load comparison

`node tests/loading-performance.cjs before` / `after`, Chrome, no scroll or video
play, cache disabled, 80ms latency, 1 MiB/s download (~8.4 Mbps). External Google
font CSS is replaced with an empty response delayed 1.5s in **both** runs to
isolate a repeatable external-font delay. Desktop 1440×1000, mobile 390×844.
These are single local simulated-network samples, not measured Cloudflare-user
timings or a benchmark against the collaborator's original site.

| Metric | Desktop before | Desktop after | Mobile before | Mobile after |
| --- | ---: | ---: | ---: | ---: |
| Initial local resource bytes | 32,178,294 | 509,488 | 34,069,105 | 1,147,916 |
| Local requests | 96 | 39 | 100 | 43 |
| Images | 64 | 6 | 68 | 10 |
| First contentful paint | 2.252s | 1.088s | 2.008s | 0.712s |
| Window load event | 32.016s | 2.854s | 33.707s | 2.830s |

Initial bytes are measured through network idle with no scrolling, not the size
of the entire page after visiting all categories. Offscreen content loads later.
Large videos still download on explicit play/open for reliable synchronized
seeking; temporary-tunnel throughput and host upload remain external constraints.

Raw request reports: `test-results/loading-before.json`, `loading-after.json`.

## Maintenance and checks

After rebuilding native frames or Gallery covers/mosaics, run:

```sh
python scripts/build_web_posters.py
npm run test:loading
npm run test:gallery
```

The builder is idempotent and checks every WebP's dimensions against its PNG.
It updates only HTML image/poster references and the mosaic delivery manifest.
Native source provenance and frame-selection manifests remain unchanged.

`lazy-posters.cjs` scrolls all ten rows on desktop and touch-mobile, verifies
native-resolution mosaics/posters, no eager MP4 or native PNG requests, no
horizontal overflow, and gzip/cache/video-range behavior. `native-posters.cjs`
checks default/A/B delivery paths and dimensions against source manifests.
