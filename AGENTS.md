# AGENTS.md

## Active scope
Work only on `/` unless explicitly told otherwise. Secondary routes are dormant scaffolding and must not be linked from the homepage.

## Reference
The visual/motion reference is ChainGPT Labs (`https://labs.chaingpt.org/`) as documented in the reverse-engineering blueprint and `docs/reference/home-completion-pass-p8.md`. Reproduce composition logic, density, grid discipline and choreography; do not copy ChainGPT-owned media, text, marks or unlicensed fonts.

## Architecture rules
- Next.js + React + TypeScript.
- Lenis owns smooth scroll.
- GSAP/ScrollTrigger owns pin/scrub/sequenced motion.
- No React state updates per scroll frame.
- One authoritative timeline per narrative scene.
- No new animation library without explicit approval.
- Homepage buttons remain non-routing placeholders unless explicitly enabled.
- The System Stack overlay may open/close because it is an in-page UI state, not route navigation.
- Media slots are declared in `lib/media/manifest.ts` and rendered through
  `components/media/AlphaVideo.tsx`. Sections reference an asset by id; never
  hardcode a media path in a section.
- Design tokens live in exactly one top-level `:root` in `app/globals.css`.
  Do not append a new token layer; edit the existing block.
- When a pass replaces a section, delete that section's CSS in the same change.
- Realtime WebGL is limited to the footer scene. Anything else is poster or
  alpha video.
- Pin-heavy and breakpoint-dependent timelines must be registered through
  `gsap.matchMedia`, never a boolean read once at mount.

## Homepage acceptance
- Grid lines and gutters remain shared and aligned across all sections.
- Hero is typography-first and uses one central media object.
- Motion must read as coordinated choreography, not independent fade-ins.
- Main reveals use clip/transform or scrubbed state transitions; generic fade-only motion is not acceptable.
- Long narrative and horizontal stages pin only on desktop and have mobile fallbacks.
- `prefers-reduced-motion` keeps all content readable.
- Crossing the 761px breakpoint by resizing must rebuild pinned timelines, not
  leave stacked or stale state.
- No fake product specifications, fake customer endorsements or fake field performance claims.

## Before handing off
When dependencies are installed, run `npm run typecheck` and `npm run build`. Verify homepage at 1440×900, 1280×800, 768×1024 and 390×844.
