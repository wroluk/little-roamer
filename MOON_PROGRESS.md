# Moon implementation progress

Read with [build plan](MOON_BUILD_PLAN.md), [design](artifacts/moon/DESIGN.md)
and [shared guide](WORLD_BUILD_GUIDE.md).

## Lunar Rover window fit and matching tint — 2026-10-23

- Corrected the broad side panes after the user spotted their mismatched front
  edges and awkward pillars. Reference: the current lunar cabin's actual face
  equations and existing exterior-glass geometry checks. Front, corner and side
  glass now share sill/header heights; side leading edges follow the same front
  slope with a constant inset, and rear edges follow the rear cabin face.
  Moved the small flank identification bars below the glazing.
- All panes already used one material, but its metallic/glossy lighting made
  differently angled faces look like different tints. Lunar cabin glazing now
  shares one light-independent dark-blue material, keeping its colour uniform
  across the front, corners and sides. The solar panel retains its lit finish;
  body lighting, Mars Scout, terrain and driving physics are unchanged.
- **20 focused unit checks pass**, plus typecheck/build. Regressions inspect the
  actual batched glass vertices for matching heights and constant pillar width,
  raycast both sides at three heights to verify glass/frame boundaries, and
  retain clearance, rim-opening, disposal and identical-driving checks.
  **Four focused browser cases pass** across Chromium/WebKit on Moon and Mars.
  Samples of actual rendered front/corner/side pixels match within two RGB
  levels. Inspected final three-quarter and profile captures in both engines,
  and regenerated the actual-model Lunar Rover thumbnail.
  [Moon corner/pillar](artifacts/moon/lunar-rover/chromium-tablet/moon-rover-front.png),
  [Moon profile](artifacts/moon/lunar-rover/chromium-tablet/moon-rover-side.png),
  [Mars opposite side](artifacts/moon/lunar-rover/webkit-tablet/mars-rover-other-side.png).
- No full-project, PWA, long-region or fresh hardware checks for this visual-only
  correction. Last full-suite evidence remains 2026-10-11; prior PWA skips and
  physical-iPad acceptance remain open. **Exact next step:** user reviews window
  alignment and tint at `?area=moon&car=lunar-rover`. Broken Highlands review is
  still pending; Skylight Hollow is unbuilt. User requested committing and
  pushing the accumulated Moon expansion and Lunar Rover work.

## Lunar Rover upright front and exposed wheels — 2026-10-23

- User accepted the cab-forward direction, requested removing the wheel guards,
  and selected an upright three-pane windshield, rectangular lamps and simple
  bumper. Removed all four guards and their stays. The front now has one wide
  centre pane, two narrow angled corner panes, a roughly 11-degree windshield
  lean from vertical, paired rectangular lamps and a low bumper instead of the
  Scout's projecting bull bar. Kept the rear solar deck, dish rims and handling.
- References: current Scout/lunar builder and vehicle geometry regressions;
  `solidPanel` in `vehicle-geometry.ts`, already used for closed faceted vehicle
  bodies. Adapted it to a lunar-only cabin with actual clipped front corners,
  rather than turning glass across the previous flat extruded nose. Glazing is
  offset from the same authored face equations; verified every pane remains
  the first exterior hit. Mars Scout's cabin, circular lamps and bull bar remain
  unchanged. Both models retain their shared wheel/physics arrangement.
- **20 focused unit tests pass**, plus typecheck/build. Added explicit checks
  for all three visible panes, upright angle, angled corner normals, exposed
  tires with no intervening guard/stay, rectangular lamp corners and removal of
  the projecting bar. Retained dish openings, repeated swap/disposal, identical
  driving/contact simulation under both gravities, and the small model budget.
  The shorter nose is contained within Scout's clearance envelope rather than
  required to touch exactly the same front boundary. An initial guard check
  assumed settled suspension in an unstepped world; replaced that height proxy
  with the stricter actual first-hit tire ownership check.
- **Four focused browser cases pass** across Chromium/WebKit, covering both
  worlds, car swapping/reload/travel and actual Lunar Rover driving. Inspected
  final head-on and three-quarter views in both engines; all three front panes
  and rectangular lights are visible, and the wheels are unguarded. Refreshed
  only the Lunar Rover thumbnail from the actual model.
  [Moon front](artifacts/moon/lunar-rover/webkit-tablet/moon-rover-head-on.png),
  [Mars front](artifacts/moon/lunar-rover/chromium-tablet/mars-rover-head-on.png),
  [three-quarter body](artifacts/moon/lunar-rover/webkit-tablet/mars-rover-front.png).
- No terrain, route, startup, selection/storage or offline behavior changes.
  Did not repeat PWA, long-region or full-project suites for this visual-only
  refinement; the preceding PWA result remains 17 passed / three existing
  WebKit skips, and the last full-suite record remains 2026-10-11. Hardware
  probes remain historical; physical-iPad acceptance is still open.
  **Exact next step:** user reviews the front and exposed wheels at
  `http://localhost:5173/?area=moon&car=lunar-rover`. Broken Highlands review
  remains pending; Skylight Hollow is unbuilt. No commit or push.

## Separate Lunar Rover and cab-forward body — 2026-10-23

- User requested a separate Lunar Rover with two extraterrestrial vehicle
  choices, then selected the cab-forward survey design after finding the first
  solar-panel/gold-trim variant too similar to Scout. Moon now defaults to
  `lunar-rover`; both it and `mars-scout` are selectable on Moon and Mars.
  Mars still defaults to Scout. Explicit `car` URLs survive reload; an active
  rover choice carries directly between Moon and Mars. Saved Earth preferences
  stay separate and neither rover is offered on Earth.
- Reference: `src/game/mars-scout.ts`, the existing `Vehicle.setModel` lifecycle,
  selection helpers, thumbnail renderer, geometry/physics tests and Mars
  preference/travel browser checks. Reused the shared four-wheel chassis and
  batched builder, with a lunar-only body branch rather than duplicate physics.
  The new silhouette has a short forward pressure cabin, split windshield,
  stepped rear equipment deck/solar panel, angular wheel guards and silver
  dish rims with six actual openings per face. Wheel positions/radii, shared
  collision envelope, mass and world-specific handling are unchanged.
- The reprofiled beveled shell initially hid the front glazing; the user also
  spotted this while the iteration was underway. Sampled the actual assembled
  front face, fitted both panes outside it, and added first-hit glass raycasts.
  Inspected final rendered front/side and following-camera views in both
  engines and both worlds, plus the regenerated actual-model thumbnail.
  [Moon front](artifacts/moon/lunar-rover/webkit-tablet/moon-rover-front.png),
  [Moon driving](artifacts/moon/lunar-rover/webkit-tablet/moon-rover-driving.png),
  [Mars front](artifacts/moon/lunar-rover/chromium-tablet/mars-rover-front.png).
  Added the bevel/glazing lesson to the shared guide.
- **32 focused unit tests pass**, covering selection/defaults/invalid links,
  both physical simulations under normal and lunar gravity, body clearance,
  separate deck relief, six true rim openings, visible windshield panes,
  identical driving/contact results, repeated swap disposal, existing physics
  and all Moon terrain/routes. Typecheck and production build pass.
  **8 focused browser cases pass** across Chromium/WebKit for both-world rover
  switching, URL reload, real driving, geometry-count stability, Earth preference
  restoration, camera framing and the original Moon presentation/reset/travel.
  Refreshed the four rover cases again after the final windshield correction.
  Initial radio-count checks included location radios; scoped them to the car
  picker. An existing WebKit camera assertion sampled the first home-to-driving
  frame; now waits for the unchanged driving-height threshold rather than
  changing the camera or weakening the bound.
- Production/PWA: **17 passed, three existing WebKit offline cases skipped**.
  Both rover choices and the new thumbnail are cached; Chromium additionally
  selects Lunar Rover offline, reloads its URL/thumbnail and starts driving.
  Moon remains internal in production while Lunar Rover is available on Mars.
  Browser and PWA suites ran sequentially. No full-project or long-region browser
  suites were repeated for this local vehicle addition; last full-suite record
  remains 2026-10-11. Known Rapier/Vite warnings and physical-iPad touch/offline/
  performance acceptance remain open. Prior hardware frame probes are historical,
  not a new benchmark of the redesigned body.
- **Exact next step:** review the distinct body and corrected split windshield
  at `http://localhost:5173/?area=moon&car=lunar-rover`, or choose either rover
  from the Moon/Mars home screen. Broken Highlands remains available for the
  user's planned review; Skylight Hollow is still unbuilt. No commit or push.

## Broken Highlands connected loop — 2026-10-23

- User accepted the stronger Basalt Reach identity and authorized continuing.
  Added Broken Highlands in the western/northwestern space inside the existing
  footprint. Skylight Hollow remains unbuilt; no new buildings, sky, handling
  changes, public entry, commit or push.
- References: the supporting shelves, spine and gullies in
  `src/game/mars-dish-layout.ts` and `tests/mars-dish.test.ts`, plus the current
  Moon terrain, route grading, whole-footprint slab grounding and drive tests.
  Adapted the terrain technique to a small pale upland with two solid clefts,
  not Mars's dish, worker system or terrain footprint. Reused the existing slab
  builder (renamed `moonSlabGeometry`) for five sparse pale outcrops, with the
  same matching solid meshes, route clearance and disposal ownership.
- The main traverse leaves the old western circuit, reaches a safe clearing at
  X=-264 / Z=-65, climbs around unequal massifs and returns through the northern
  saddle to Earthrise Overlook. An optional western ridge reaches 43 m and
  rejoins that saddle. Recorded the layout before implementation, then updated
  the navigation [PNG](artifacts/moon/moon-map.png) /
  [SVG](artifacts/moon/moon-map.svg): six numbered starts, green main traverse
  and dashed-green ridge, plus departure directions from Earthview Base.
- The first immediately uphill branches interacted with the flat spawn field,
  compressing their departure grades despite passing rover simulation. Added
  a shared level departure beyond the clearing before separating the climbs,
  and balanced the lower ridge saddle to 33.5 m. A cleft initially lacked its
  eastern shoulder; added the supporting buttress. Moved outcrops off steep
  sites rather than allowing tall bases. Kept grade thresholds and vehicle
  physics unchanged; recorded the clearing/departure lesson in the shared guide.
- Final **12 Moon unit tests**, typecheck and production build pass. Tests cover
  both complete new routes and all six older routes in both directions with
  the actual rover; full-width triangle grades; safe starts; connected exits;
  cleft shoulders and pale relief; exact render/collision/seam agreement;
  dense full-footprint grounding and matching solid tops for all 17 slabs;
  bounded collision and complete disposal. Final runtime-construction sample:
  **597 ms**, with this pass's earlier samples around 558–593 ms versus
  453–524 ms in the basalt identity pass. These non-isolated desktop samples
  indicate additional construction cost, not a claim of unchanged generation.
  Known Rapier initialization and Vite chunk-size warnings remain.
- **6 focused browser cases pass** across Chromium and WebKit: original pilot
  presentation/reset/home travel; Highlands direct entry/reset and five route
  views; actual keyboard-driven main-climb and exposed-ridge sections in both
  directions. Browser driving covers approximately 174 m of main climb and
  164 m of ridge each way; complete routes and the northern return remain
  simulation-covered, not a full browser-loop claim. Final long-drive run:
  both engines passed, 5.6 minutes including presentation. Refreshed the
  presentation again after correcting photo angles. No runtime source was
  changed while long driving ran.
- Inspected actual arrival, shelf, ridge, return, basin and real-drive captures
  in both engines. Corrected the shelf's east-facing wall shot to face along the
  climb. Low/steep fracture cameras were occluded or filled by nearby ground;
  moved only the photo camera to the higher eastern bank and used a shallow
  near-target view. Evidence:
  [arrival](artifacts/moon/broken-highlands/webkit-tablet/arrival.png),
  [climb](artifacts/moon/broken-highlands/webkit-tablet/shelf-climb.png),
  [ridge and Earth](artifacts/moon/broken-highlands/hardware-chromium/western-ridge.png),
  [northern return](artifacts/moon/broken-highlands/webkit-tablet/northern-return.png),
  [fracture side view](artifacts/moon/broken-highlands/webkit-tablet/fracture.png),
  [actual drive](artifacts/moon/broken-highlands/webkit-tablet/real-drive.png).
  The map remains a navigation reference, not a game aerial or visual gate.
- Terrain remains **91,008 triangles**, one fixed rendered mesh and at most
  nine terrain colliders. Five outcrops add **100 scenery triangles**, one
  batched material and one matching rock collider. Fresh Chromium Metal /
  Apple M1 Pro measurement at 1080 x 810, DPR 1, normal graphics/shadows,
  240 frames each at the clearing, shelf, ridge, northern return and actual
  driven collision boundary: **16.7 ms median / 16.7–16.8 ms p95**, 23–26 draw
  calls, about 110,400–113,900 rendered triangles, at most 2.7 ms recorded
  activation. Cadence is consistent with the previous hardware probe; camera
  culling differs, so lower triangle samples are not an optimization claim.
  Warm-server navigation through playable startup took 1.24 s, not isolated
  generation time. [Raw results](artifacts/moon/broken-highlands/hardware-chromium/performance.json).
- Did not rerun unrelated full-project, PWA, long crater or long rille browser
  suites for this bounded local region. The last full-project suite record
  remains 2026-10-11; prior Moon PWA/production checks are recorded below.
  Physical-iPad Safari touch, frame cadence and visual acceptance remain open.
  **Exact next step:** user review at
  `http://localhost:5173/?area=moon&start=broken-highlands`, following the main
  climb or the optional western ridge back toward Earthrise Overlook. Review
  this slice before Skylight Hollow; retain the physical-device gate before
  broader expansion. All post-pilot work remains uncommitted and unpushed.

## Basalt Reach visual identity pass — 2026-10-23

- User found the new plain difficult to distinguish: darker and flatter, but
  otherwise similar to the existing ground. Authorized continuing the proposed
  local shaping pass. Stayed within Basalt Reach rather than starting Highlands.
  No Iceland visibility change was made during this pass.
- References: the existing Moon sampled terrain, route clearings, scenery
  batching/solid-rock ownership and browser drive helpers; Delta slabs in
  `mars-delta-landmarks.ts`, the whole-skirt grounding technique in
  `mars-landmarks.ts`, and `tests/mars-western.test.ts`. Adapted to a small
  six-sided lunar slab with whole-footprint sampling, not the larger Mars
  geology/helper dependency. Reused Moon's existing ground-range sampler for
  both structures and slabs; matching rock trimeshes remain runtime-owned.
- Replaced the nearly invisible single flow ridge with five finite, irregular
  overlapping lobes, low pressure crests and subtle neutral crust darkening.
  Their corridor-facing shoulders exceed 2 m relief; centres stand above
  7.5 m elevation, roughly 3–5 m above the surrounding plain. Kept the central
  open route and safe regional clearing. Added twelve varied angular slabs in
  four sparse off-route clusters. Flat facets, exposed tops and buried full
  undersides avoid floating boulders or tall enclosing plinths.
- Preserved actual before images and matched the user's reported camera
  exactly (position 108.684 / 10.09 / 173.21, target
  98.706 / 6.846 / 182.326, FOV 48). Inspected that comparison, the rover-height
  regional arrival, a close rock-side view and genuine two-way driving captures
  in Chromium and WebKit. The first close-view camera hid slab bases behind a
  nearby crest; moved only the capture camera to the unobstructed northern side.
  Evidence: [before](artifacts/moon/basalt-identity/webkit-tablet/before-reported-view.png),
  [same-camera after](artifacts/moon/basalt-identity/webkit-tablet/reported-view.png),
  [arrival](artifacts/moon/basalt-identity/webkit-tablet/arrival.png),
  [grounded crust](artifacts/moon/basalt-identity/webkit-tablet/grounded-crust.png)
  and [actual drive](artifacts/moon/basalt-identity/webkit-tablet/real-drive.png).
  Refreshed the navigation PNG/SVG from the final terrain.
- Typecheck/build and **11 Moon unit tests pass**. Added measurable lobe/shoulder
  relief, determinism, dense buried slab undersides, route clearance and actual
  rendered/Rapier solid-top agreement. Extended exact lattice/seam/collision
  sampling into the basalt chunks. All six complete routes still pass actual
  rover simulation in both directions; existing full-width grades, starts,
  structure grounding and handling thresholds are unchanged.
- **8 focused browser cases pass** across Chromium and WebKit: original pilot
  presentation/home travel, both new starts/reset/views, the reported-position
  visual case and the affected 210 m basalt corridor driven both directions.
  Refreshed the visual case in both engines after the close-camera correction.
  Did not repeat the unchanged long rille/crater browser drives or unrelated
  full-project/PWA suites; their earlier evidence remains below. Known Vite
  chunk-size and Rapier deprecation warnings remain.
- Terrain stays at **91,008 triangles** with at most nine active terrain
  colliders. Clusters add **240 scenery triangles**, one batched material and
  one matching rock trimesh collider. Unit runtime-construction samples were
  453–524 ms; these are non-isolated desktop measurements. Fresh Chromium
  Metal / Apple M1 Pro sampling at 1080 x 810, DPR 1, normal graphics/shadows,
  240 frames each at the overlook, basalt, rille, bank and an actual basalt
  collision crossing: **16.7 ms median / 16.7–16.8 ms p95**, 22–26 draw calls,
  about 110,800–114,600 rendered triangles, at most 3.1 ms recorded activation.
  [Raw hardware results](artifacts/moon/basalt-identity/hardware-chromium/performance.json).
  This does not clear physical-iPad acceptance.
- Lighting, Earth, quiet palette, gravity/handling and render footprint are
  unchanged. Recorded the colour-only-region failure and geometry-based
  correction in the shared guide. **Exact next step:** user review at
  `http://localhost:5173/?area=moon&start=basalt-reach`, particularly the low
  lobes on either side of the main line and the previously reported northern
  approach. Physical iPad touch/cadence and visual acceptance remain open;
  Highlands/Skylight remain unbuilt. All current expansion/map/refinement work
  is uncommitted and unpushed.

## Current navigation map — 2026-10-23

- User requested a simple design map or aerial to locate the new areas.
  Added a north-up [PNG](artifacts/moon/moon-map.png) and self-contained
  [SVG](artifacts/moon/moon-map.svg), linked from README and the design.
  Orange highlights Basalt Reach, cyan Silver Rille, cream the original circuit
  and descent, and dashed purple the optional bank/crossing breach.
  Five numbered starts and directions from Earthview Base make the actual
  departures clear. No unbuilt region is plotted.
- Reference: `scripts/render-northern-map.ts` (no dedicated map tests exist).
  Reused live terrain sampling, embedded relief and vector route/start overlays;
  adapted to dry Moon terrain with a compact navigation legend rather than
  copying Northern region boxes or claiming a material-faithful aerial.
  The map is not new game-render evidence and changes no gameplay.
- Generator: `node --import tsx scripts/render-moon-map.ts`. Its executable
  assertions check finite terrain, route bounds and complete route/start styles;
  decoded the SVG and inspected the final PNG for readable, unclipped labels.
  Normal repository typecheck/build pass. An additional standalone-script
  typecheck could not resolve Node declarations (`@types/node` is not installed);
  scripts are outside the project's configured typecheck. No dependency change
  was made for this documentation generator.
- Shared guide now records that route connectivity alone is insufficient for
  navigation: highlight new branches and explain how to leave the default start.
  **Exact next step:** use the map to review the basalt/rille excursion; physical
  iPad touch/cadence and user acceptance remain open before broader expansion.
  No terrain, handling, commit or push changes in this map task.

## Basalt Reach and Silver Rille excursion — 2026-10-23

- User accepted the grounded structures and authorized continuing the plan.
  The recurring footing failure is explicitly recorded in the shared guide:
  sample the whole footprint, bury the lowest underside, clear the highest
  terrain beneath a deck, and keep positive matching visual/collision supports.
  The existing dense grounding regression remains passing.
- References: the Moon pilot terrain/runtime and tests, the Delta's inline
  channel profile/routes in `mars-delta-layout.ts`, and connected-route/relief
  checks in `tests/mars-western.test.ts`. Adapted the channel technique to dry
  lunar ground and the existing fixed mesh, not Mars water, workers or new props.
  Recorded the connected layout in [the design](artifacts/moon/DESIGN.md)
  before terrain implementation.
- Added the broad dark Basalt Reach plain and winding Silver Rille, connected
  to the original crater circuit at both ends. The floor and optional upper
  bank share their mouth/northern exit; a crossing breach creates a shorter
  connection and an eastern turnaround. Both new regions have safe direct
  entry and nearest-region reset. No new buildings or expanded render footprint.
  Lighting, palette, Earth, gravity and handling retain the accepted direction.
- A full-width rendered-surface check caught excessive breach grades despite
  successful rover simulation. Narrowed the new routes' elevation influence,
  lowered the shared saddle/eastern turnaround and lengthened the approach.
  Kept the original grade threshold and vehicle physics. Added this route-field
  interaction lesson to the shared guide. Per-chunk temporary height reuse
  limits repeated normal-generation work without a persistent terrain cache.
- Final typecheck/build pass; **10 Moon unit tests pass**. The actual rover
  completes all six old/new routes in both directions, including the entire
  bank and return connections. Tests retain full-width grades, bank relief,
  connected routes, neutral palette, safe clearings, grounding, exact terrain
  seams/collision, bounded resources and disposal. Known Rapier initialization
  deprecation and Vite chunk-size warnings remain.
- **6 focused browser cases pass** across Chromium and WebKit on final terrain:
  new regional entry/reset/views, original pilot presentation/reset/home travel,
  and keyboard-driven basalt, rille-core bends and crossing breach in both
  directions. Browser driving covers a 130 m basalt section, roughly 300 m
  through the channel and roughly 136 m of breach; full-route and upper-bank
  two-way coverage is simulation-based, not a full browser excursion claim.
  Refreshed final rover-height captures after waiting for ground contact and
  inspected the plain, channel, bank, breach, shoulder and real-drive evidence.
  [Basalt arrival](artifacts/moon/basalt-rille/webkit-tablet/basalt-reach.png),
  [channel with Earth](artifacts/moon/basalt-rille/webkit-tablet/silver-rille.png),
  [upper bank](artifacts/moon/basalt-rille/hardware-chromium/upper-bank.png),
  [breach](artifacts/moon/basalt-rille/webkit-tablet/breach-floor.png),
  [eastern return view](artifacts/moon/basalt-rille/chromium-tablet/eastern-shoulder.png)
  and [actual drive](artifacts/moon/basalt-rille/webkit-tablet/real-drive.png).
- Retained **91,008 terrain triangles**, one fixed mesh and at most nine active
  terrain colliders. Final unit construction sample: **530 ms**, versus earlier
  pilot samples around 472–504 ms; these are non-isolated desktop measurements,
  not an assertion of unchanged generation cost. No concurrent browser/build
  load during the separate Chromium Metal / Apple M1 Pro frame probe:
  1080 x 810, DPR 1, normal graphics/shadows, 240 frames per viewpoint.
  Overlook, basalt, channel, bank and an actual basalt collision-chunk crossing
  each measured **16.7 ms median / 16.8 ms p95**. Observed 22–25 draw calls,
  about 110,800–114,400 rendered triangles and at most 2.9 ms recorded collision
  activation. Cadence matches the historical pilot hardware sample; this is
  not physical-iPad acceptance. Raw backend-labelled results:
  [performance.json](artifacts/moon/basalt-rille/hardware-chromium/performance.json).
- Did not rerun unrelated full-project/PWA suites or the old long browser
  crater drive for this localized extension. The full-project suite record
  remains 2026-10-11; prior PWA coverage is below. Physical iPad Safari touch,
  cadence and user visual acceptance remain open. Moon remains internal;
  Broken Highlands and Skylight Hollow are unbuilt. Expansion is uncommitted;
  the accepted pilot is saved in `98307fc`. Nothing was pushed.
- **Exact next step:** user review at
  `http://localhost:5173/?area=moon&start=basalt-reach` and
  `http://localhost:5173/?area=moon&start=silver-rille`, including the bank/breach
  choices and return to the crater circuit. Check physical iPad Safari before
  broad expansion; then lay out Broken Highlands within an explicit terrain
  budget rather than silently widening this fixed mesh.

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
