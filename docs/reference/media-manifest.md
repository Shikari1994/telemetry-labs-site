# Media manifest — blueprint §11

## Where it lives

`lib/media/manifest.ts` is the single source of truth. Sections reference an
asset by **id only** (`<AlphaVideo id="hero-probe" />`) and never hardcode a
path. Replacing a placeholder with final art is therefore a manifest edit, not
a markup or choreography change.

## Current slots

| id | Section | Intrinsic | State |
| --- | --- | --- | --- |
| `hero-probe` | Hero | 1200×1500 | poster only |
| `lab-chamber` | Beyond Measurement (pinned) | 1000×1250 | poster only |
| `footer-signal` | Final CTA | 1400×900 | poster + WebGL overlay |

All three posters are hand-authored SVG in `public/media/posters/`. They carry
real material description — machined-steel gradients with an off-centre
specular, tooling-mark patterns, contact shadows — rather than flat fills, so
the page reads as finished before the 3D pipeline lands.

## Loading policy (§11.2)

Implemented in `components/media/AlphaVideo.tsx`:

1. Poster always paints, and the slot reserves its intrinsic aspect ratio, so
   nothing reflows and layout shift stays at zero.
2. Video sources attach only when the slot comes within 200 px of the viewport.
   `priority` (hero) skips the wait.
3. Playback pauses when scrolled 100 px clear of the viewport and whenever
   `document.hidden`.
4. The video reveals itself only on its first `playing` event, so the crossfade
   from the poster never flashes an empty frame.
5. A slot with no sources stays a poster. Sections cannot tell the difference.

## Adding real 3D output

1. Render to Apple ProRes 4444 to preserve alpha.
2. Encode two variants: WebM VP9 with alpha, and MP4 HEVC with alpha for
   Safari. Re-verify current codec support before launch — it moves.
3. Keep each file at or below 2 MB (`SINGLE_VIDEO_BYTE_BUDGET`).
4. Add the variants to the asset's `sources`, with real `bytes` values.
5. `findOversizedAssets()` backs the CI asset-size check in §14.

Nothing else changes: no section markup, no ScrollTrigger timeline.

## WebGL boundary

`components/media/SignalFieldCanvas.tsx` is the only realtime surface, used for
the footer scene alone (§6 row 14). It is deliberately raw WebGL — the effect
is one full-quad fragment shader, so a scene graph would cost more transfer
than the scene. It lazy-inits at 300 px, caps DPR at 1.75, pauses offscreen and
on hidden tabs, destroys its GL resources on unmount, and is skipped entirely
under `prefers-reduced-motion`, leaving the poster as the fallback.
