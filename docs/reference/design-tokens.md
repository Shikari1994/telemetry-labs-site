# Design tokens

## Single authority

All tokens live in **one** `:root` block at the top of `app/globals.css`.

Earlier passes (P5–P8) each appended their own `:root`, so four blocks
redefined `--display`, `--accent`, `--bg` and friends. Only the last one won,
which made token edits appear to do nothing. They are now consolidated to the
values that were actually rendering, so editing a token has the obvious effect.

Two `:root` blocks remain **inside** media queries — those are deliberate
responsive overrides (`--gutter` at mobile), not duplicates.

| Token | Value | Role |
| --- | --- | --- |
| `--bg` | `#efeee8` | Page ground |
| `--surface` | `#f7f6f1` | Raised panels, ticker |
| `--surface-2` | `#ddddda` | Recessed cells |
| `--ink` | `#10100e` | Primary text, hairlines |
| `--muted` | `#6d6c65` | Secondary copy, labels |
| `--line` | `rgba(16,16,14,.34)` | Structural borders |
| `--line-soft` | `rgba(16,16,14,.12)` | Internal grid lines |
| `--gutter` | `clamp(16px, 1.8vw, 30px)` | Outer gutter |
| `--header-h` | `62px` | Sticky header, pin offsets |
| `--accent` | `#ff5b22` | The single accent |
| `--accent-2` | `#ff7141` | Accent highlight |
| `--display` | Unbounded Variable | Display headings |
| `--body-font` | Arial | Body copy |
| `--mono` | Roboto Mono Variable | Labels, numerals, machine copy |

## Accent discipline

`--accent` is the only chromatic colour on the page. It marks live signal,
active state and the primary CTA. Using it decoratively weakens all three.

## Dead-CSS policy

The cleanup removed 249 rule blocks whose selectors no longer matched any TSX
(leftovers from `toolStage`, `heroKicker`, `monitorMock`, `telemetryStrip`,
`flowRail`, `equipmentRow` and the rest of the pre-P5 homepage).

When a pass replaces a section, delete its CSS in the same change. Do not
append a new layer over the old one.
