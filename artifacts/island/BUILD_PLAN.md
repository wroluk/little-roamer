# Island pilot

Approved scope, 2026-10-26: a development-only connected beach, jungle climb,
aqueduct crossing and ocean-facing return, with an easy main line and optional
rough shortcut. No cenote, missions, survival systems or full-world expansion.

Start with `npm run dev` and `/?area=island`. Development home also offers Island;
production home and URL validation exclude it until user acceptance and a later
release decision. Earth vehicles, gravity, controls and recovery are preserved.

Current classification, 2026-11-03: **Development → Comparison demos**, alongside
Old Quarry and the other exploratory sketches. Functional tests are optional,
not release gates: `npm run test:demos` and `npm run test:browser:demos` include
Island. Keep the lightweight production-exclusion guard.

## Connected pilot gate

- Castaway Cove: dry, level start, pale sand and terrain-fitted turquoise sea.
- Lower trail passes through a genuinely open aqueduct arch before climbing.
- Rootwood: broad graded two-way climb, solid trunks and buttress roots clear
  of the route, layered crowns and undergrowth, optional rough shortcut.
- Old Aqueduct: three masonry arches, matching visible/solid deck and parapets,
  buried piers, connected approaches and a coastline view from the eastern end.
- Eastern descent and beach return close the loop without jumps or deep water.
- Three unique regional starts and nearest-region reset; safe local righting
  retains the shared actual-collision behavior beneath stacked surfaces.
- Exact terrain triangles for wheels, water clipping, rendering and collision.
  Whole compact pilot resident; no new workers or unbounded streaming.
- Real-car drives in both directions, focused geometry/lifecycle checks,
  Chromium/WebKit driving-height captures, typecheck and production build.
  Check production exclusion. Physical-iPad and aesthetic acceptance stay manual.

## References and adaptations

Read `WORLD_BUILD_GUIDE.md`, Moon's plan/design/progress, `moon.ts`,
`moon-terrain.ts`, `tests/moon.test.ts` and `tests/browser/moon.spec.ts`.
Transfer exact Float32 triangle sampling, stable resident rendering, explicit
resource ownership and real-vehicle two-way verification. Unlike Moon's larger
footprint, this 480 m-wide pilot has one resident terrain collider; no collider
streaming is needed.

Transfer terrain-triangle water clipping from `highlands.ts` and its tests,
with depth colour and a non-overlapping offshore apron. Reuse the pure positional
noise helper in `iceland-noise.ts`; no new world-generation dependency.
Transfer Mars's real-driving harness technique, not altered vehicle physics.
The aqueduct is intentionally engineered masonry, not a natural rock arch:
regular voussoirs are appropriate here. Render and solid triangles match.

See [design](DESIGN.md) and [progress](PROGRESS.md).
