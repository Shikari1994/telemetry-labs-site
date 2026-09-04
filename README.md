# Telemetry Systems — Homepage P8 Completion Pass

Homepage-focused Next.js prototype based on the composition and motion logic documented for the ChainGPT Labs reference, translated into drilling telemetry.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Active scope

Only `/` is an active design surface. Secondary routes remain dormant scaffolding. Homepage controls look interactive but do not navigate to other pages.

## P8 homepage sequence

1. Sticky technical header + in-page System Stack overlay.
2. Typography-first Hero with central telemetry media placeholder.
3. System stack rail.
4. Pinned Beyond Measurement narrative.
5. Two engineering loops.
6. Indexed equipment / service-like stage.
7. Horizontal systems showcase.
8. Drill Monitor surface software stage.
9. Field Presence editorial grid.
10. Horizontal Field Notes operating-principles deck.
11. Built for the Rig proof band.
12. FAQ.
13. Latest Research editorial grid.
14. Final CTA / interactive media placeholder footer.

## Motion

Lenis owns smooth scrolling. GSAP/ScrollTrigger owns pin/scrub choreography. Generic opacity fades are intentionally avoided for the main reveal language; clipped reveals, scrubbed handoffs, pinned stages and horizontal decks are used instead.

## 3D boundary

All current tool/BHA visuals remain CSS media placeholders. They define geometry and motion ownership only. Replace them later with project-owned 3D or alpha-video assets without restructuring homepage choreography.
