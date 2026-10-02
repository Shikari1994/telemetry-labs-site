# AGENTS.md

## Active scope
`/` is a portfolio: the owner's works (currently geo-tn.com and Drill Monitor)
presented in this site's own bitmap style and with its mascot. Never borrow the
visual style of a work; only its content. Copy lives in `data/home.ts`.
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
- Phones get every feature of the desktop homepage (the owner's call), in a
  phone layout: pinned scenes, WebGL, the mascot's stations, the bus. A
  hover affordance gets a touch equivalent (a tap lights what a hover would).
- The signal bus (`components/layout/SignalBus.tsx`, `lib/motion/bus.ts`) is
  an SVG board in the gutter beside the rail from 1025px, and in the page's
  left margin below that. `jumpTo` launches its packet; section heads boot
  on its `SIGNAL_LINE`.
- Transits: three, approved by the owner, each moving the camera its own
  way across one voxel circuit board, so that the site reads as a world on a
  board. The page scrolls through a `[data-transit]` spacer
  (`components/sections/Transit.tsx`) while one fixed WebGL canvas
  (`components/motion/TransitScene.tsx`, one renderer in `lib/transit`)
  draws the stretch picked by the section ahead (`STRETCHES` in
  `lib/transit/scene.ts`):
  - into `works`: the flight, low along the board to a gate (`scene.ts`);
  - into `drill-monitor`: the drill, a plan view of the board, then a
    spinning descent through a via into rock, a build curve to level and a
    chamber with the gate (`drill.ts`);
  - into `request`: the overview, every homepage section a chip with its
    number, the visit's route lighting chip by chip as the camera rises and
    swings round, then a dive into the opening on the last chip
    (`overview.ts`).
  The board shows only where the spacer is on screen (the page peels off
  it), and each stretch ends in a see-through portal onto the next section
  that fills the screen; no full-screen dissolves. Spacers collapse without
  motion. Props preview the section ahead (`THEMES`), sparse and in the
  site's orange and ink only, off the camera's path and out of the portal's
  last stretch. A new transit needs a new camera verb and the owner's
  approval; never repeat a stretch.
  The mascot rides every transit: each stretch has a `guide` (where the
  robot is in that world for a progress); `TransitScene` puts it through
  the frame's camera and publishes it in `ride` (`lib/transit/guide.ts`),
  and the mascot takes it once the board is uncovered under it and draws it
  as that camera sees it. It jumps in off the page ahead of the camera, goes
  through the way out before it and flies back to the page; a new stretch
  needs its own guide.
- The mascot never vanishes once the intro has played (the owner's call).
  Between stations it sits on its perch (`perch` in `lib/mascot/route.ts`:
  the TREE panel's progress bar from 1025px, hanging under the TREE bar
  below that), kept on screen; stations and seams fly it over from the
  perch and back, and any other change of what it follows (a ride, the
  dive, a rebuilt route) is flown from where it was drawn
  (`components/mascot/Mascot.tsx`). Never hide it or cut it from one spot
  to another; a new station must keep it on screen. The one way out of
  sight is behind the content of a section, and it always comes back out
  (the owner's call).
- Inside the works' sections the mascot does not stand in front of the
  content pointing (the owner found that a fly in the face): it plays a
  part in the scene or hides behind it, an `act` per station
  (`lib/mascot/acts.ts`): 02 stamps the works' cartridges into the deck,
  a step per landing, and pops up out of the first free slot (the deck's
  scrub, `lib/deck/state.ts`), 03 plays hide-and-seek round the ring's WebGL screen (its outline
  published in `lib/showcase/state.ts`), 04 climbs the layer stack as it
  lights, 05 turns the captures over on the viewer's scrub
  (`lib/viewer/state.ts`), 07 peeks over the form and climbs onto it when
  the request is sent. What it is behind is masked out of its drawing
  (`lib/mascot/occlude.ts`, the renderer's stencil). The hero, the 06 screen,
  the seams, the transits and the footer keep their own beats; the perch
  only sits and looks about.
- Seams: every other section boundary is a short `Seam`
  (`components/sections/Seam.tsx`) in the page's own language: the next
  number, a stepped load bar and the name on one row, scrubbed so it lands
  just before the bus branch lights and the head boots. No WebGL there.
- Homepage controls never route to other pages of this site. Enabled: in-page
  anchor jumps (`components/layout/AnchorLink.tsx`, through `lib/motion/jump.ts`)
  and external links to the works themselves, opened in a new tab.
- The works index overlay ([S]) may open/close because it is an in-page UI state, not route navigation.
- Media slots are declared in `lib/media/manifest.ts` and rendered through
  `components/media/AlphaVideo.tsx`. Sections reference an asset by id; never
  hardcode a media path in a section. An asset's `live` feed (a recording of
  the work or a reel of its captures) plays only where a section passes
  `live` (the current work's screen over the hero island), through the
  captures' own grain (`lib/media/live.ts`).
- The footer is the end of the visit: an exit menu, then the last screen,
  which powers off as the page runs out (shutdown log, the mascot asleep on
  its dock, CRT collapse, SYSTEM HALTED) and reboots on the way back up.
  One scrub in `MotionProvider`; the mascot reads `lib/motion/finale.ts`.
- Design tokens live in exactly one top-level `:root` in `app/globals.css`.
  Do not append a new token layer; edit the existing block.
- When a pass replaces a section, delete that section's CSS in the same change.
- Realtime WebGL is limited to the footer scene, the homepage mascot
  overlay (`components/mascot`, route in `lib/mascot/route.ts`), the
  three transits (`lib/transit`, approved by the owner), the 03 showcase
  screen (`components/sections/ShowcaseScene.tsx`, `lib/showcase`, approved
  by the owner) and the hero island (`components/sections/HeroIsland.tsx`,
  `lib/hero`, approved by the owner): a floating chunk of the transits'
  voxel board, built out of the socket the mascot lands on, with one chip per
  work projecting its capture as a voxel hologram; the work's real screen
  (a DOM link, live while current) is laid over the slab from the scene's
  camera. The voxel
  module models (`components/sections/ModuleModels.tsx`, `lib/modules`) are
  not rendered on the portfolio. The works are shown as 3D scenes built
  from CSS 3D transforms (the 02 cartridge deck: the works as cartridges
  stamped into its slots, a screen booting each and the three directions
  as its channels, `components/sections/Works.tsx`; ring, layer stack,
  flip-stack viewer, and the 06
  stack board: one chip per technology on a circuit board, seated on one
  pinned scrub, traces and packets in SVG; `components/sections/StackBoard.tsx`,
  layout in `lib/stack/board.ts`). The one exception is the 03
  ring with motion: its front capture is a WebGL slab of voxels
  that tumbles to the next capture in a wave, on the ring's own scrub
  (published in `lib/showcase/state.ts`); the CSS ring stays laid out under
  it for the mascot's aim and is the scene under reduced motion and without
  WebGL. Anything else is poster or alpha video.
- Works are presented as a visual, technological showcase: one short line
  per beat. No formulas, calculations, line counts or spec tables.
- Every case tells itself the same way: the head's lead says what the work
  is, then its passport (`CasePassport`, `passports` in `data/home.ts`: who
  it is for, the task, where it runs, what we did), then its features, and
  one offer closes the case, even when it spans two sections.
- Pin-heavy and breakpoint-dependent timelines must be registered through
  `gsap.matchMedia`, never a boolean read once at mount.

## Homepage acceptance
- Grid lines and gutters remain shared and aligned across all sections.
- Hero is typography-first and uses one central media object.
- Motion must read as coordinated choreography, not independent fade-ins.
- Main reveals use clip/transform or scrubbed state transitions; generic fade-only motion is not acceptable.
- Long narrative stages (02 deck, 03 ring, 05 viewer, 06 board) pin on every width:
  desktop pins the section, phones only the scene under its head, in a phone
  layout (the 06 camera rides close over the board there). Reduced motion is
  the unpinned fallback.
- `prefers-reduced-motion` keeps all content readable.
- Crossing the 761px breakpoint by resizing must rebuild pinned timelines, not
  leave stacked or stale state.
- No fake product specifications, fake customer endorsements or fake field performance claims.
  Describe a work only by what it actually contains; demo values are labelled as demo.

## Before handing off
When dependencies are installed, run `npm run typecheck` and `npm run build`.
`next build` overwrites `.next`; never run it in the project while `next dev`
is serving from it — build a copy instead. Verify homepage at 1440×900, 1280×800, 768×1024 and 390×844.
