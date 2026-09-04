# Homepage motion spec — reference pass

## Reference
Primary behavioral reference: https://labs.chaingpt.org/
Implementation evidence: ChainGPT Labs Codrops case study by Ilya Kostin / Sigma Software.

## Opening sequence
1. Dark full-screen loading layer.
2. Counter runs 000 → 100 with brief decoding/flicker noise.
3. Pixel cells collapse in a randomized mask pattern.
4. Eight vertical columns wipe upward with stagger.
5. Orange technical marquee moves during the handoff.
6. Hero title, media object and supporting copy enter as one synchronized timeline.
7. Preloader runs once per session; returning to the page skips directly to the hero intro.

## Global motion primitives
- `data-reveal`: GSAP fade + vertical reveal, one shot via ScrollTrigger.
- `data-scramble`: short decoding effect; never on body copy.
- `data-flicker`: short stepped opacity reveal for large display labels.
- `data-line-draw`: horizontal technical line draw.
- `data-parallax`: low-amplitude ScrollTrigger parallax only.
- `data-magnetic`: subtle pointer displacement for selected CTAs.

## Smooth scroll
Lenis is enabled when `prefers-reduced-motion` is false. GSAP ticker drives Lenis RAF and Lenis updates ScrollTrigger.

## Hero
- Giant clipped two-line display type dominates the first fold.
- Central visual is independent from the text and can later be replaced by alpha video.
- Left and right supporting copy enter after the headline/media settle.
- Readout strip acts as a structural footer for the hero, not a floating dashboard.

## Sticky laboratory narrative
- One ScrollTrigger owns the entire desktop narrative.
- Pin duration is intentionally long to create a staged editorial sequence.
- Four states: ORIENTATION → FORMATION → TELEMETRY → SURFACE.
- State copy crossfades; selected modules in the central chamber brighten while non-selected modules recede.
- Rail/progress visual is driven by the same timeline.
- No React setState on every scroll frame.
- Mobile uses normal document flow with four readable cards and no pinning.

## Reduced motion
- No Lenis smooth scrolling.
- No long pinned choreography.
- No continuous orbit/marquee requirement.
- All information remains readable in normal flow.
