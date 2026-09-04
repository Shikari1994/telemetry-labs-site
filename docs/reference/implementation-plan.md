# Implementation status

## P1 — Foundation
DONE
- Next.js / React / TypeScript foundation
- 12 / 8 / 4 column responsive grid
- typography / color / border tokens
- homepage static composition
- reduced motion baseline

## P2 — Motion language
DONE
- opening preloader
- browser-native reveal and scramble primitives
- scroll progress
- signal marquee
- telemetry micro-motion
- single-authority sticky telemetry state machine
- mobile non-pinned fallback

## P3 — Product depth and RFQ
DONE
- real catalog navigation
- `/equipment` catalog
- generic detail route + 8 product entities
- capabilities / specs / compatibility / signal-path sections
- product-to-product navigation
- `/request` RFQ form
- server validation API
- honeypot + request ID

### P3 data policy
Do not invent exact equipment performance values. Numeric diameter, pressure, temperature, measurement range, accuracy, telemetry rate and other model-specific characteristics must come from approved datasheets.

### P3 RFQ backend policy
Current API validates only. Before launch select exactly one destination adapter (CRM, transactional email or database/CRM bridge). Do not log field contents.

## P4 — Next recommended phase
- add actual brand/company identity and copy
- collect real product datasheets and replace generic specification rows
- decide product hierarchy: standalone modules vs full MWD/LWD systems vs BHA packages
- add case / deployment pages
- add contacts / company route if needed
- connect RFQ destination
- then migrate high-value motion to GSAP/ScrollTrigger/Lenis

## P5 — Media / 3D later
- define BHA/module asset manifest
- create static posters first
- integrate alpha-video or selective WebGL only where it adds useful interaction
- reserve realtime 3D for true interactive assemblies / trajectory visualization

## P9 — CSS sanitation, media layer, conversion, transitions, WebGL
DONE

### CSS sanitation
- Four stacked top-level `:root` blocks consolidated into one authoritative
  token set, preserving the values that were actually rendering.
- 249 dead rule blocks removed (167 top-level + 82 inside media queries),
  covering the pre-P5 homepage: `toolStage`, `heroKicker`, `heroDescription`,
  `telemetryStrip`, `flowRail`, `equipmentRow`, `monitorMock` and others.
- See `docs/reference/design-tokens.md`.

### Media layer
- `lib/media/manifest.ts`: id -> variants -> dimensions -> poster -> bytes.
- `components/media/AlphaVideo.tsx` implements the §11.2 loading policy.
- Three hand-authored SVG posters with real material description.
- Hero, pinned chamber and footer now render through media slots.
- See `docs/reference/media-manifest.md`.

### Conversion + ticker + transitions
- `PartnerTicker`: seamless discipline ticker (§6 row 03). Duplicated track
  translated by exactly one copy width; CSS-only so reduced-motion stops it.
- `NextStage` + `/api/lead`: conversion block (§6 row 12) with server
  validation, honeypot, idempotency id and input retained on network failure.
- `PageTransition`: column wipe reusing the preloader language (§17).
  Navigation fires at a minimal cover threshold, not after the full cycle.

### WebGL
- `SignalFieldCanvas`: pointer-reactive footer scene (§6 row 14). Raw WebGL,
  lazy init at 300px, DPR capped at 1.75, paused offscreen/hidden, GL resources
  released on unmount, poster fallback, skipped under reduced motion.

### Fixed defects
- Resizing across the 761px breakpoint destroyed the pinned narrative: the
  four `.labState` panels ended up absolutely stacked at opacity 1, overlapping
  into unreadable text. `matchMedia` cleanup now clears the inline styles.
- The two horizontal decks were gated by a boolean read once at mount, so they
  never rebuilt on resize. Both now use `gsap.matchMedia`.
- The resize handler called `ScrollTrigger.refresh()` on every event during a
  drag; now debounced.

## P10 — Next
- Replace the three posters with project-owned 3D (ProRes 4444 -> WebM VP9
  alpha + MP4 HEVC alpha, <=2 MB each). No choreography changes required.
- Connect exactly one lead/RFQ destination adapter.
- Decide whether homepage CTAs start routing; they are still placeholders.
- Add Playwright visual baselines at 1440/1280/768/390.
