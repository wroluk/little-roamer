# Moon implementation progress

Read with [build plan](MOON_BUILD_PLAN.md), [design](artifacts/moon/DESIGN.md)
and [shared guide](WORLD_BUILD_GUIDE.md).

## Grounded structures and pilot checkpoint — 2026-10-23

- User approved the staged expansion and requested a pilot commit, with a small
  correction for visible gaps beneath human-made structures. The quiet
  atmosphere, lighting/palette, Earth, handling and terrain remain unchanged.
  Recorded the approved six-place direction and basalt–rille-first sequence in
  [the build plan](MOON_BUILD_PLAN.md); no new region is claimed implemented.
- References: `groundMarsRock` in `mars-landmarks.ts` and its dense skirt-edge
  checks, plus the Dish relay's whole-footprint placement test and independent
  leg/foot construction. Adapted the technique to rectangular footings with
  native cuboid collision rather than introducing a new terrain or mesh system.
- Confirmed centre-sampled instrument/foot pads left daylight gaps. The shelter
  also crossed nearly 2.9 m of terrain, clipping its uphill deck and producing an
  inverted uphill leg. Shifted it six metres west onto a gentler site, then set
  deck clearance from the highest footprint sample. Its base/legs remain level,
  positive-sized and connected; no tall enclosing plinth or terrain flattening.
- Sample each ground-contact footprint at intervals no larger than 0.25 m.
  Bury its flat underside below the lowest sample and retain a clear top.
  Shelter feet, shelter/solar legs, mast and instrument have matching solid
  cuboids. Solar posts still overlap the panel underside; collision/visual
  changes do not alter the accepted easy routes.
- Typecheck/build and all **9 Moon unit tests pass**, including both complete
  routes in both directions with the actual rover. New dense footprint checks
  verify buried undersides, exposed tops, deck clearance, connected positive
  legs and rendered/collider agreement. **4 focused browser cases pass** across
  Chromium and WebKit: structure views plus pilot presentation/reset/travel.
  Inspected low shelter/feet, solar and instrument captures in both engines.
  [Before shelter](artifacts/moon/grounding/before-shelter.png),
  [grounded shelter](artifacts/moon/grounding/webkit-tablet/shelter.png),
  [feet](artifacts/moon/grounding/webkit-tablet/shelter-feet.png),
  [solar supports](artifacts/moon/grounding/webkit-tablet/solar.png) and
  [instrument](artifacts/moon/grounding/chromium-tablet/instrument.png).
- This checkpoint includes the accepted internal pilot, corrected Earth,
  grounded structures, evidence and approved continuation. No push or public
  release requested. Full-project/PWA and long browser-driving suites were not
  repeated for this scenery correction; earlier coverage is recorded below.
- **Exact next step:** lay out the connected Basalt Reach–Silver Rille excursion,
  its return and sightlines against the current footprint/terrain budget before
  generating new terrain. Physical iPad Safari touch/performance remains open;
  desktop browser checks do not clear that gate.

## Visual acceptance and continuation — 2026-10-23

- User accepted the corrected Earth and especially the lighting and colour
  palette, and chose to continue developing Moon. Preserve this art direction
  and the previously accepted handling.
- User asked how to proceed; the next expansion is being proposed, not yet
  implemented. The current design still describes the pilot, not a completed
  larger world. Physical iPad Safari performance/touch acceptance remains open.

## Earth texture correction — 2026-10-22

- User accepted the lunar visual feel, Earthrise and initial handling, noting
  slower travel and longer hops. Kept gravity, vehicle settings, terrain, camera,
  lighting, Earth's direction and angular size unchanged.
- Preserved the [reported image](artifacts/moon/earth-texture/user-artifacts.png)
  and captured the original globe at
  [driving height](artifacts/moon/earth-texture/before-driving.png) and
  [close zoom](artifacts/moon/earth-texture/before-close.png). Reproduced the
  diagonal white cloud dashes and pixel-stepped coastlines.
- Reference: the existing `earthTexture`/`buildMoonSky` in `moon-scenery.ts`,
  `moonRandom`/interpolated terrain noise, Moon disposal checks and actual
  browser sightline tests. Adapted the deterministic hash to smooth spherical
  cloud noise rather than adding another renderer or downloaded artwork.
  Replaced repeating sine-product clouds with irregular coherent cover;
  blended land and polar boundaries at 512 x 256. Integer longitude frequencies,
  matching endpoint samples and spherical cloud coordinates close the wrap and
  poles. Enabled repeat wrapping and trilinear mip filtering.
- The map is baked once per sky creation, with no additional meshes, draw calls
  or per-frame texture work. Its RGBA pixels plus mip chain occupy approximately
  0.67 MiB. The accepted pilot landscape and scene geometry budget are unchanged.
- Final typecheck/build pass; all **8 Moon unit tests pass**, including complete
  two-way real-rover routes, handling and disposal. The new texture check covers
  determinism, opaque pixels, blended coasts, matching seam/pole pixels,
  filtering, retained size/direction and texture/material/geometry disposal.
  **4 focused browser cases pass** across Chromium and WebKit: existing Moon
  presentation/reset/travel plus driving-height, enlarged Earth and an exposed
  longitude-seam view. Inspected actual captures in both engines; the repeated
  cloud dashes and stair-stepped shore are no longer visible.
- Current detail evidence:
  [Chromium close view](artifacts/moon/earth-texture/chromium-tablet/close.png),
  [WebKit close view](artifacts/moon/earth-texture/webkit-tablet/close.png),
  [exposed seam](artifacts/moon/earth-texture/webkit-tablet/seam.png) and
  [driving view](artifacts/moon/earth-texture/webkit-tablet/driving.png).
  The earlier hardware benchmark remains historical evidence, not a fresh
  measurement of this texture revision. Did not rerun long browser drives,
  full-project suites or PWA checks for this local texture-only correction.
- **Exact next step:** user review when convenient at
  `http://localhost:5173/?area=moon&start=earthrise-overlook`, followed by physical
  iPad Safari touch-driving/frame-cadence acceptance before expanding the world.
  No new region, commit, push or public release was added.

## Earthview pilot implementation — 2026-10-22

- User authorized a Moon pilot to assess reduced gravity and a haze-free horizon.
  Added the internal `?area=moon` entry, Earthview Base, a two-way crater circuit,
  Earthrise Overlook, and a graded two-way crater-floor descent. No new public
  picker entry or complete-world claim.
- References: Mars terrain/streaming and their seam, lifecycle and real-rover
  tests. Adapted to a compact, fixed rendered landscape rather than importing
  the full worker/render-ring system. The terrain contains 91,008 triangles,
  with matching fine/coarse boundary positions and normals. Collision moves in
  a bounded 3 x 3 core; the rendered terrain buffers do not change.
- Added a procedural, fixed-direction Earth and black fog-free sky; local
  ivory/gold shelter, solar racks, communications mast and overlook instrument.
  Rocks are varied, grounded, kept off the easy routes and use matching solid
  geometry. No artwork, texture or runtime request goes to a third-party host.
- Lunar gravity is -3 versus the existing game's -18. A separate handling
  profile reduces motor force/speed/steering and retunes suspension. The pilot
  reuses the Scout, labelled Lunar Scout here, and adds neutral lunar regolith
  particles/tracks without recolouring Mars. Area travel restores normal
  gravity, lighting, view distance, vehicle availability and Earth preference.
- Smoothed the descent's route-joint elevation blend after a route-width grade
  check caught a discontinuity. Both complete routes pass real-rover simulation
  in both directions. Final focused unit run: **31 passed**, including lunar
  free flight, speed/braking, route widths, Float32 terrain agreement, stitched
  positions/normals, bounded collision, disposal, and existing shared surface,
  feedback, vehicle-geometry and selection regressions. Typecheck/build pass.
- Initial real-browser captures exposed a poor northern overlook: the nearby
  highland wall hid Earth. Lowered and moved the perimeter shoulders outward,
  retained their solid steep face, framed the Earth away from the HUD, and
  removed the shared warm sky vignette for Moon only. The normal lunar driving
  camera is lower than Earth's. Added camera-projection and rendered-terrain
  raycast assertions so the intended Earth views cannot pass while occluded.
  Inspected final base, overlook, Earth and floor captures in both engines.
- Final Moon browser coverage: **6 passed** across Chromium and WebKit. This
  includes genuine driving across collision boundaries and down/up the complete
  crater descent, regional direct entry/reset, a black vignette-free sky,
  visible Earth, and travel back to Earth with the saved Classic preference.
  Full two-way circuit coverage is simulation-based, not a claim that the
  browser drove the entire outer circuit. Four additional Earth/Mars browser
  regression cases pass across the same engines.
- Default headless Chromium uses **SwiftShader software rendering** here,
  explaining its roughly 50–67 ms median frame samples and automatic reduced
  graphics; those runs are not a hardware benchmark. WebKit reports Apple GPU
  and measured about 17 ms median / 31 ms p95 in the final capture run. The
  raw backend-labelled samples and five current views per engine are under
  `artifacts/moon/{chromium-tablet,webkit-tablet}/`.
- Separate Chromium **Metal / Apple M1 Pro** probe at 1080 x 810, pixel ratio 1,
  normal graphics and shadows: 240 frames each at the Earth overlook, shelter
  approach and an actual driven collision-chunk crossing. All three measured
  **16.7 ms median / 16.7–16.8 ms p95**, with 24–31 draw calls and roughly
  112,500–116,000 rendered triangles across passes. Recorded collision activation
  was at most 2.8 ms; the crossing traveled from Z=8 through Z=0. First-page
  navigation through playable startup took 3.38 s in this probe; it is not an
  isolated generation-time benchmark or an iPad result. Evidence:
  `artifacts/moon/hardware-chromium/performance.json` and its captures.
  The unobstructed southern shelter view is `base-shelter-arrival.png`;
  the initial aligned west view places the shelter behind the rover.
- Production/PWA regression: **17 passed, three existing WebKit offline cases
  skipped**. Both engines confirm Moon URLs fall back to Northern Reach and
  do not expose a public Moon/Scout picker option. Existing cache, offline,
  update and vehicle-selection behavior remains covered. Browser and PWA
  suites ran sequentially. Full-project unit/browser suites were not run for
  this internal pilot; the prior full-suite record remains 2026-10-11.
- **Exact next step:** drive the pilot at
  `http://localhost:5173/?area=moon`, then compare the exposed view at
  `?area=moon&start=earthrise-overlook`. Judge steering, braking, float and
  horizon presentation before expanding. Physical iPad Safari frame cadence,
  touch driving and visual acceptance remain open; desktop evidence does not
  clear that gate. No commit/push was requested or performed.
