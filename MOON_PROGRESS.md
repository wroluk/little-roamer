# Moon implementation progress

Read with [build plan](MOON_BUILD_PLAN.md), [design](artifacts/moon/DESIGN.md)
and [shared guide](WORLD_BUILD_GUIDE.md).

## Shared initial-load logo flash — 2026-10-25

- Reproduced the oversized initial SVG with game JavaScript disabled: it was
  1,064 px wide instead of 37 px. Moved the unchanged stylesheet from the
  JavaScript import to a render-blocking HTML-head link, styling the page before
  its first paint. Reference: the existing HTML asset loading and browser/PWA
  checks; no new splash screen, duplicated CSS or lunar scenery changes.
- Inspected before/after first-load captures. The no-JavaScript regression and
  normal driving/reset/pause pass in Chromium and WebKit; production/typecheck
  pass. Full PWA run: 19 pass, four existing WebKit offline skips, one 45-second
  timeout in the complete multi-world offline journey. That journey passes
  unchanged alone in 43.4 seconds; no assertion or physics changes made.
- Work remains uncommitted/unpushed. Next: user review of initial page loading
  and the perimeter change; the duplicate-shadow decision remains as below.

## Perimeter safety and duplicate-shadow investigation — 2026-10-25

- User authorized hidden collision protection only if the accepted scenery
  remains intact, and a shadow fix only if simple and without performance loss.
  The reported west-edge centre was X=-383.139, just inside the +/-384 m solid
  footprint; the existing predicted-position readiness gate can freeze physics
  there. Added four invisible, frictionless guards at +/-378 m, retaining six
  metres of supported margin. Terrain, mountains, routes, scenery, lighting,
  handling and controls are unchanged; no render geometry or frame loop added.
- References: existing Moon scenery collider ownership/disposal, the original
  valley's physical boundary and `tests/physics.test.ts`, and shared camera
  obstruction sweeps. Adaptation: a dedicated collision group excludes only
  hidden guards from both camera sweeps, pointer ground picks and development
  obstruction probes; they still physically stop the vehicle and block unsafe
  local recovery. Existing <=9 streamed terrain colliders and 91,008 rendered
  terrain triangles are unchanged; the four guards dispose with the scenery.
- **54 focused unit/physics cases, typecheck and production build pass.**
  These include both lunar models driving full-throttle into all sides/corners
  and reversing without loss of collision readiness, all ten lunar routes both
  ways, local recovery, and existing Earth camera/ford checks. **Eight affected
  Chromium/WebKit browser cases pass**: real west-edge/corner approach, stop,
  camera orbit beyond the guard and reverse, plus both Moon recovery cases.
  Final explicit model-selection assertions also pass in both engines.
  Inspected driving-height captures in both engines and the restored original
  escape camera; no visible barrier or scenery change.
- Reproduced the duplicate shadow at the exact supplied pose. The upper shelf
  does not cast terrain shadows, allowing the rover's silhouette onto lower
  ground too. Full terrain casting removes it, but introduces visible striping
  and adds **91,008 depth-pass triangles**: total rendered work rises from
  115,568 to 206,576 triangles. Isolated Chromium SwiftShader/readback round
  medians were 45.2–50.4 ms before and 51.1–52.3 ms with terrain casting.
  These are comparative software-renderer samples, not physical-device frame
  acceptance. **No shadow change retained** under the user's condition.
  Preserved the [user image, exact poses, baseline/rejected view and costs](artifacts/moon/perimeter-shadow/).
- Work remains uncommitted/unpushed; concurrent discoveries/tracks and accepted
  local-reset/camera work are preserved. No unrelated broad browser/PWA suites
  repeated; physical-iPad acceptance remains open. **Next:** user review of the
  unchanged-looking boundary behavior. Duplicate shadow remains a known issue;
  a more selective terrain-occlusion solution needs separately authorized scope.

## Home-screen preview publication — 2026-10-25

- User accepted **Broken Highlands** and requested a home-screen tile, commit
  and push for convenient physical-iPad testing. This supersedes the historical
  internal-only restriction. Moon now appears as **Moon / Low-gravity preview**
  in development and production, with all regional links and three exploration
  rover choices. Northern Reach remains the default; Iceland stays hidden.
  Discoveries are discussion-only at this point.
- Reference: the existing Mars tile, area validation, rover selection and
  production/offline travel tests. Added a 476 x 350 thumbnail rendered from
  the actual Earthrise game view, not a concept image. Updated picker-count,
  responsive-layout, regional-link and asset-cache coverage. Inspected the
  actual home screen in Chromium and WebKit. No terrain, handling or lighting
  change in this availability step.
- **Full unit suite: 386 passed**, completed overnight on 2026-10-24/25 in
  about 34 minutes. The subsequent full browser attempt was **not successful:
  213 passed, 140 failed, one skipped**. Failures include an existing ambiguous
  `.wordmark` selector, long Iceland timeouts, and many later WebKit launch
  failures. Do not count that run as full-browser acceptance or silently
  attribute every failure to the environment. The raw logs are retained in
  the session artifacts.
- On 2026-10-25 the user explicitly chose **focused checks for this testing
  preview** instead of another full run. Fresh typecheck and **23 focused units,
  22 Chromium/WebKit browser cases** pass: lunar routes/collision/gravity,
  Nomad geometry and identical handling, swaps/reload/driving in both worlds,
  home tile/small-screen layout and exact GPU tube-shade/roof-face regressions.
  Sequential production/PWA: **19 passed, three existing WebKit offline
  scenarios skipped**. Includes production Moon tile and regional links,
  cached thumbnail/rovers, and offline reload/travel/driving on Moon in Chromium.
  Production build passes; 58 precache entries, about 4.16 MiB.
- Physical-iPad sustained performance, touch and Safari offline acceptance
  remain open. This is a user-authorized testing preview, not a declaration
  that those checks passed. The prior successful full-browser record remains
  historical; current full-unit evidence is 2026-10-25.
- **Publication:** user authorized committing and pushing the accumulated
  Nomad, Hollow, Moon/Mars static-sunlight and preview-tile work to `main`.
  **Exact next step:** install/update the preview on iPad, then discuss a small
  set of optional discoveries without adding them automatically.

## Hollow acceptance, connectors and current performance — 2026-10-24

- User accepted the corrected Hollow roof and requested continuing. Recorded
  acceptance in the plan/design without inferring physical-iPad approval or
  explicit Broken Highlands review. Finished the two remaining Hollow
  browser-driving coverage gaps rather than widening the approved footprint.
- Reference: the existing Nomad passage/bypass browser driver, exported
  `MOON_ROUTES` and earlier hardware-backed Highlands probe. Adaptation:
  drive the **complete base-to-northern-portal connector** and **southern
  portal-to-basalt-approach return**, each in both directions, with real Nomad
  input and no mid-leg repositioning. Record resource peaks throughout each
  drive, not only at the endpoint.
- **Four dual-engine cases pass: eight complete connector drives**. All
  waypoints reached, queues empty and cameras clear at the endpoints. Peak
  terrain colliders **9**, rendered triangles **114,042**, draw calls **38**.
  Retained departure/arrival captures and per-direction evidence in
  [connector evidence](artifacts/moon/hollow-connectors/). Inspected the actual
  portal arrival and reverse southern return alongside current interior and
  southern-roof views. Existing passage/bypass two-way coverage is unchanged.
- Fresh [hardware-backed Hollow probe](artifacts/moon/skylight-hollow/hardware-chromium/performance.json):
  **Apple M1 Pro / ANGLE Metal**, 1080 x 810, pixel ratio 1, current Nomad and
  corrected static sunlight. Seven views/runs, **240 frames each**: arrival,
  northern portal, interior, skylight, southern roof, surface bypass and actual
  passage driving across Z=192. Median **16.7 ms**, p95 **16.7–16.8 ms**.
  No reduced graphics, at most **9** terrain colliders, **113,426** rendered
  triangles, **34** draw calls; collision activation peak **2.2 ms**.
  Terrain remains **91,008 triangles**. Local load-to-driving was **1,452 ms**,
  including browser/server work, not a pure terrain-generation measurement.
- The first Chromium connector runs failed a newly added full-graphics
  assertion, despite completing their forward drives. Reproduced alone:
  default headless Chromium uses **SwiftShader**, activates the existing
  adaptive quality reduction, and does the same on committed **main 547959b**.
  Confirmed with a separately served read-only main snapshot; stopped and
  removed that temporary snapshot afterward. Current Metal Chromium does not
  reduce quality. Functional connector evidence now records renderer and
  quality state; the separate hardware probe retains its full-graphics
  assertion. No physics, rendering or adaptive-quality thresholds changed.
- Typecheck/build pass. No new runtime geometry, handling, footprint, light,
  shader, public-picker or release change. No full-project suite or PWA rerun
  for these focused coverage/documentation additions; last full-suite record
  remains **2026-10-11**. Desktop cadence is not a sustained iPad benchmark.
- **Exact next step:** explicit Broken Highlands user review and physical-iPad
  touch/driving/frame-cadence acceptance before broad terrain expansion.
  All approved compact landscape slices are implemented; retain Moon's
  internal release gate. Work remains uncommitted; no new push requested.

## Southern roof-face pattern correction — 2026-10-24

- Reproduced the user's exact camera position **-253.213 / 16.214 / 269.189**,
  target **-249.582 / 13.952 / 256.524**, FOV **48**. Preserved the
  [user image](artifacts/moon/static-tube-shadows/roof-pattern-user.png) and
  [actual before capture](artifacts/moon/static-tube-shadows/chromium-tablet/reported-before.png).
  Disabling only the roof material's static depth comparison removed the teeth:
  **370 of 953 visible, ray-verified sunlit samples** were incorrectly darkened,
  by up to **27 RGB levels**. This was atlas self-shadowing, not roof geometry.
- Reference: the existing shared static-sunlight filter and its actual GPU
  near/far/disabled comparisons. Adaptation: calculate the receiver plane's
  depth gradient from fragment derivatives and evaluate its depth at each of
  the four filter taps. The old filter compared all four neighbours against
  the centre depth, which fails on steep walls. Derivatives run before the
  atlas-bounds branch. No larger bias, texture, extra render pass, geometry,
  collision, handling, global lighting or material-colour changes.
- The [corrected Chromium view](artifacts/moon/static-tube-shadows/chromium-tablet/reported-current.png)
  and [WebKit view](artifacts/moon/static-tube-shadows/webkit-tablet/reported-current.png)
  are clean. Both retain **953 verified samples, zero patterned samples and
  zero RGB difference** against the unoccluded roof reference. Inspected both
  captures; genuine floor shade and the skylight patch remain.
- **Four focused static-sunlight units, eight dual-engine browser cases,
  typecheck and production build pass.** Includes dense sub-texel sampling of
  a steep lit wall, floor occlusion, both worlds' near/far/disabled shading,
  vehicle swaps and Earth isolation. The initial exact-camera regression
  failed on the original shader before the correction. No full-project suite,
  PWA rerun or new device benchmark for this shader-only correction.
- User also confirmed **Mars Tubes shadows look good**; recorded acceptance
  in `MARS_PROGRESS.md`. **Exact next step:** user reviews the corrected Moon
  roof side; keep physical-iPad acceptance and Moon's internal release gate
  open. Changes remain uncommitted; no new commit/push was requested.

## Permanent tube sunlight occlusion — 2026-10-24

- User liked Hollow, then reported the same problem seen in Mars's Lava Tubes:
  roof shadows appeared only when the rover approached. Approved a fixed,
  geometry-derived sunlight mask for **both** worlds, not a larger global
  shadow map or a rollout to all rocks/trees.
- The moving sun shadow camera covers 48 x 48 m. Added a one-time CPU depth
  rasterization of the actual roof triangles, projected along each world's
  unchanged sun direction. One packed 16-bit-depth RGBA8 texture feeds the lit
  terrain, scenery and rover materials, including after car swaps. It blocks
  only direct sunlight; ambient fill, materials, skylights and portals retain
  their lighting. Static and dynamic coverage combine with `min`, avoiding
  double-darkening. The mask remains active when adaptive quality disables
  moving shadows. Roofs no longer render into the redundant dynamic shadow pass;
  rover and other existing moving shadows remain.
- References: Moon/Mars's actual closed roof geometry, exact roof/rim raycasts,
  current area/streaming/disposal lifecycle and Iceland's existing
  `onBeforeCompile` material customization. Adaptation:
  [shared static sunlight](src/game/static-sunlight.ts) uses a small fixed
  light-space atlas, not terrain colour darkening, a ground overlay, a second
  light or a continuously rendered shadow map. Four depth comparisons use
  bilinear weights to soften texel edges. The dynamic map stays **1024 x 1024,
  48 m wide**, and terrain/collision geometry and handling are unchanged.
- Moon's atlas is **379 x 181 / 274,396 bytes** at 0.2 m spacing; Mars's is
  **908 x 571 / 2,073,872 bytes** at 0.3 m. Generated once per world creation,
  with no per-frame geometry generation or extra draw pass. Materials unhook
  on disposal; streamed scenery and car swaps release their references; the
  atlas is disposed once on world exit. This is a bounded cost, not a claim
  of improved device frame cadence.
- **28 focused unit checks pass**, including actual roof-ray comparisons
  (Moon: 130 shaded / 233 open floor samples; Mars: 261 / 206), sun-facing
  roofs remaining lit, shader composition, swaps/disposal, lunar two-way
  routes, Mars tube/rubble/roof/junction driving and streaming lifecycle.
  Typecheck and final production build pass.
- **14 unique affected browser cases have passing results** across Chromium
  and WebKit, including targeted reruns: fixed-camera near/far/disabled shadow
  comparisons, car swaps and Earth isolation, Hollow presentation, Mars tube
  views and short floor/roof drives. In both engines, **87 shaded Moon
  samples and 88 shaded Mars samples change by zero RGB levels** when the
  moving shadow map is relocated 600 m away or disabled; real sunlit patches
  remain. Final static/Hollow/lifecycle rerun: eight passed. An initial
  Chromium multi-view Mars case hit its 45 s timeout while CPU checks ran;
  it passed alone in 39.1 s without changing assertions, timeout or physics.
  Corrected an exact-name selector in the new swap test, then both engines
  passed. An overbroad Mars-unit invocation was stopped; only completed
  change-focused results are counted.
- Inspected actual approach views in both engines and the current Hollow
  interior. [Moon distant-map view](artifacts/moon/static-tube-shadows/webkit-tablet/far.png),
  [Mars distant-map view](artifacts/mars/static-tube-shadows/webkit-tablet/far.png).
  The capture folders retain near/far/disabled renders and pixel evidence.
  Sequential production/PWA run: **17 passed, three pre-existing WebKit
  offline cases skipped**. No full-project unit/browser run or new hardware
  frame benchmark; last full-suite record remains 2026-10-11.
- **Exact next step:** user approaches Hollow and the Mars tubes to review
  continuous shade and skylight patches. Keep physical-iPad acceptance and
  Moon's internal release gate open. Do not extend this bake to all scenery
  without separately evaluating memory, generation and moving foliage.
  Changes remain uncommitted; no commit/push was requested.

## Skylight Hollow and Nomad acceptance — 2026-10-24

- The user accepted **Lunar Nomad** as a separate vehicle and requested continuing.
  Returned to the approved Moon landscape plan rather than adding more vehicle
  detailing. Existing vehicle choices/defaults, lighting, Earth, black sky and
  low-gravity handling are unchanged.
- Added **Skylight Hollow** in the southwest, inside the existing footprint.
  Direct entry: `http://localhost:5173/?area=moon&start=skylight-hollow&car=lunar-nomad`.
  From Earthview Base, leave south and turn west to the level clearing at
  **-248 / 150**. The short roofed trench runs south, with a genuine central
  daylight opening; an easy western surface bypass climbs to 18 m.
  Both meet at -220 / 250 and return east to the existing basalt approach.
- References: Mars's `lavaTubeGeometry`, tube trench and real-driving tests,
  plus Moon's exact terrain sampling, full-width grade checks, solid scenery
  and disposal. Adapted the technique to one bounded neutral-grey roof with
  actual thick, irregular portal/skylight walls and single-sided rendering.
  Rendered Float32 vertices also provide collision; no invisible box covers
  the opening. Lateral margins are buried between authored rows, not only
  at the geometry's vertices. Random rocks are excluded from the passage.
- Corrected three issues exposed during implementation: the first otherwise
  graded bypass crossed the solid roof edge, so its turn now occurs outside
  the whole roof; a thin straight-edged roof read as a board and disappeared
  into the black sky, so it now has thicker irregular portals and a restrained
  local material bounce; undirected manifold counts missed inward-facing
  rim/portal walls, so regressions now check directed edge cancellation and
  visible inner-rim raycasts. No physics or grade thresholds were relaxed.
- **34 focused unit checks pass**, including all ten lunar routes in both
  directions with the real rover, full-width grades, level starts, exact roof
  render/collision parity from above/below/inside, real open portals/skylight,
  headroom, buried shoulders, resource disposal and unchanged vehicle handling.
  Typecheck and final production build pass. The roof is **592 triangles,
  one mesh/material and one static triangle collider**; the fixed terrain
  remains **91,008 triangles**, with at most nine moving terrain colliders.
  The browser views retain fewer than 90 draw calls and 120,000 triangles.
- **Six focused browser cases pass** across Chromium and WebKit: retained
  Earth/base presentation and Earth visibility, Hollow regional entry/reset
  and actual views, plus Nomad driving through the entire roofed section
  and along the **complete bypass, both directions**. All ten complete
  routes are covered in simulation; the new base connector and southern
  basalt return were not separately driven end-to-end in the browser.
  Inspected real arrival, portals, interior, skylight, daylight-from-inside
  and bypass/roof captures in both engines, including the corrected rim faces.
  [Northern portal](artifacts/moon/skylight-hollow/webkit-tablet/north-portal.png),
  [daylight from inside](artifacts/moon/skylight-hollow/chromium-tablet/daylight-from-inside.png),
  [roof/bypass](artifacts/moon/skylight-hollow/chromium-tablet/roof-and-bypass.png),
  [actual drive](artifacts/moon/skylight-hollow/webkit-tablet/real-drive.png).
- Regenerated and inspected the [navigation map](artifacts/moon/moon-map.png):
  **seven starts, ten routes**, pink Hollow connection, dashed western bypass
  and a distinct roof/opening overlay. Updated the plan, design, README and
  transferable shared-guide lessons.
- No new hardware frame-cadence or physical-iPad benchmark. No full-project
  unit/browser or PWA rerun for this bounded internal geometry addition.
  Last full-suite record remains **2026-10-11**; the prior Nomad PWA result
  remains 17 passed / three pre-existing WebKit offline skips. Physical-iPad
  touch/offline acceptance and the internal-world publication gate remain open.
- **Exact next step:** user drives/reviews Skylight Hollow with Nomad from the
  direct entry, comparing the roofed line with the western surface bypass.
  Explicit Broken Highlands review is also still pending. Do not widen the
  footprint or mark either region user-approved based on automated coverage.
  Nomad and Hollow remain uncommitted; no new commit/push was requested.

## Lunar Nomad reference-inspired alternative — 2026-10-23

- User requested another lunar vehicle authored from scratch using a supplied
  Sketchfab thumbnail for body-geometry inspiration, retaining all handling and
  two axles. Added **Lunar Nomad** as a separate choice, preserving Lunar Rover,
  Mars Scout and both world defaults. Direct entry:
  `http://localhost:5173/?area=moon&car=lunar-nomad`.
- References: the user's [image](artifacts/moon/DESIGN.md#lunar-nomad-alternative),
  existing rover tire/tread construction and batching, `solidPanel`/`beveledBox`,
  vehicle selection and exterior-glass/disposal/real-driving tests. The new
  `lunar-nomad.ts` builder authors a continuous chamfered pressure hull, large
  raked windshield, small forward/clerestory side panes, access doors and roof
  equipment rather than modifying the Scout body. Shortened the reference's
  three-axle proportions around the unchanged four existing contacts.
  Ivory/teal bodywork, uniform amber glazing, capped silver rims with diagonal
  inserts, four roof lamps and a solar roof distinguish the alternative.
  No imported model, source textures/logos or runtime external requests.
- Extracted the unchanged rover tire/tread and batching technique for reuse;
  Scout's 6,990 triangles and existing Rover's 6,278 are unchanged. Nomad has
  **6,830 triangles / 21 batched meshes** versus Scout's 19 meshes. The first
  capped-rim ring exceeded the strict relative triangle check; matching the
  established 16-segment ring resolution saved 512 triangles without changing
  tire shape, radius or contact. All body bounds remain within Scout's overall
  visual envelope; mass, two colliders, wheelbase, suspension and handling are
  unchanged.
- **21 focused unit checks pass**, plus typecheck/build. Tests cover actual
  front/side first-hit glass, rear hull/roof and outward-facing trim, two axles,
  clearance/triangle budgets, repeated swapping/disposal and identical vehicle
  position, rotation, velocity and wheel contacts under Earth and lunar gravity.
  **Ten focused browser cases pass** in Chromium/WebKit, including both lunar
  models on both worlds, actual driving, three-choice picker, URL reload,
  cross-world selection, saved Earth preference and stable geometry counts.
  Actual rendered glazing samples match across visible panes.
- Inspected current front, head-on, both profiles, home and driving views in both
  engines; the lit opposite-side Moon profile confirms hull/rim colours rather
  than judging only the shaded side. Refreshed only the Nomad thumbnail.
  [Moon front](artifacts/moon/lunar-nomad/chromium-tablet/moon-nomad-front.png),
  [lit Moon profile](artifacts/moon/lunar-nomad/webkit-tablet/moon-nomad-other-side.png),
  [Mars front](artifacts/moon/lunar-nomad/webkit-tablet/mars-nomad-front.png),
  [driving](artifacts/moon/lunar-nomad/chromium-tablet/moon-nomad-driving.png).
- Sequential production/PWA checks: **17 passed, three existing WebKit offline
  cases skipped**. Nomad's asset is precached in both engines; Chromium selects,
  reloads and drives it offline. Internal Moon publication gate and Earth-only
  car restrictions remain intact. Full unit/browser terrain suites and new
  hardware/device benchmarks were not run for this cosmetic addition; the last
  full-suite record remains 2026-10-11. Physical-iPad acceptance remains open.
- **Exact next step:** user compares Nomad with the existing Rover in the
  running preview before further detailing. Broken Highlands review remains
  pending and Skylight Hollow is unbuilt. This alternative is uncommitted.

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
