# Iceland implementation progress

## Sólheimasandur south-coast connector — 2026-10-18

- Committed the preceding Skógafoss pilot as `d2c80d1`, then extended its
  eastern black-sand shelf into a varied Sólheimasandur outwash plain. A faint
  dry spur leaves Route 1 and reaches a level wreck site south of the road.
  The route stays clear of instanced stones and shrubs; new detail sampling is
  limited to the built south-coast strip.
- Added a hollow, broken aircraft shell with actual cockpit/side openings,
  short uneven wing roots, a torn tail and matching static collision meshes.
  Updated the design anchor to `(-365, 635)` and noted that the real wreck is
  reached on foot; the game's short drivable approach is fictional.
- Both Modern and Classic drove the spur out and back in the real wheel
  simulation. Six change-focused unit checks passed for the wreck, driving,
  chunk seams, Ring Road grading and ground detail. `npm run build` passed
  (including typecheck); Rollup still reports its existing large-chunk warning.
- The affected browser scenario passed in Chromium and WebKit: the wreck and
  sandur render, and the route drives both ways without water contact or page
  errors. Inspected and saved final captures in `artifacts/iceland/solheimasandur/`.
  An intermediate Chromium rerun was interrupted by Vite hot reload during an
  edit; the settled rerun passed. No full project or PWA suite was run for this
  local region slice.

**Next:** connect the east side of the Sólheimasandur shelf to Reynisfjara.
Build the shore's basalt columns and Reynisdrangar stacks, refine the joining
cliff/shoreline, and verify the Ring Road and optional beach descent in both
engines. Continue toward the south sandur and Jökulsárlón pilot gate afterward.

## Skógá-to-Skógafoss brink refinement — 2026-10-18

- User capture showed the broad pale upstream river meeting a narrower bright
  curtain at a hard straight edge. Measured the rendered upper water at nearly
  29 m wide against the 18 m falling sheet. Narrowed the final bank and wet
  channel over the last 24 m so the water reaches the curtain at its width.
- Added a six-metre gradual foam/opacity brightening on the upper river, then
  a short curved overflow (less than one metre vertically) before the rest of
  the sheet drops straight down. The cliff remains the terrain/collision mesh;
  the river source, ford, bridge and sea handoff retain their existing paths.
- Captured the front and oblique brink in Chromium and WebKit and inspected
  both. Saved the current views in `artifacts/iceland/skoga-brink-fix/`.
  The transition is visibly closer in width and colour, with the water rolling
  over the edge rather than starting as an independent flat sheet.
- **33 focused unit tests passed**, including new upper-edge width and overflow
  geometry assertions. `npm run typecheck` passed. The brink and river-visibility
  browser scenarios passed in both engines (4/4). `npm run build` passed;
  Rollup retains its existing large-chunk warning. No full project or PWA suite
  was run for this local visual change.

**Next:** review the revised brink on the user's device, then continue the
Sólheimasandur connector. The eastern shoreline/cliff remains deferred until
the adjoining area is designed.

## Skógá visibility regression — 2026-10-18

- User screenshot and exact camera at the ford showed the river absent, including
  the stretch between the waterfall and bridge. Reproduced it in Chromium.
  The mesh had positive depth, intersected rays at the expected water elevation,
  and became visible when its custom material shader was bypassed. This was a
  rendering failure, not a missing river channel or sea handoff.
- Removed the custom `onBeforeCompile` alpha/estuary code. The same sampled
  water mesh now carries RGBA vertex colours: shallow-bank transparency,
  deeper-water colour and opacity, and a blend into the sea at the narrow mouth.
  The standard Three.js vertex-colour path renders the river in both engines.
- Added the user's exact ford camera and a close waterfall-to-bridge view to
  the focused browser scenario. Inspected both engines: the continuous river
  is visible again. Rechecked the river-mouth view in Chromium and WebKit.
  The scenario now checks a blue-green pixel in the rendered river, so a
  future invisible-material regression cannot pass on mesh presence alone.
  Captures are saved in `artifacts/iceland/river-visibility-fix/`.
- `npm run typecheck`, `npm run build`, and 33 focused Iceland/surface unit tests
  passed. The new river-view browser case passed in both engines (2/2), as did
  the mouth/coastal case (2/2). No full project or PWA suite was rerun.
- General lesson added to `WORLD_BUILD_GUIDE.md`: mesh and depth tests cannot
  validate a custom shader; inspect the complete rendered feature after any
  material edit.

**Next:** continue user visual review of the restored river, then the
Sólheimasandur connector. The eastern shore/cliff remains deferred until the
adjoining area is designed.

## Skógafoss silhouette, coastal route and ground detail — 2026-10-17

- Refined the Skógá mouth again after the user's exact photo view exposed a
  straight-sided river strip. The river now descends to sea level and hands off
  at a narrow channel at z=635; the ocean alone occupies the wider outlet.
  A small shoreline inlet removes the artificial straight beach termination.
  Chromium and WebKit captures from that camera and the new coastal turnout
  are saved in `artifacts/iceland/skoga-refinement/final-mouth/`. The east-side
  shoreline and cliff remain a later connector task as requested.
- Removed the waterfall curtain's repeated width and edge-height waves. Its
  edges spread gently from the fixed brink; water motion remains inside the
  sheet, with the existing falling drops and animated pool spray.
- Extended the rounded Skógá source to z=100 and water start to z=50, with a
  level below the surrounding plateau. The detailed source/brink corridor now
  remains in the distant layer. Updated the source camera view.
- Shifted the western Ring Road return to the coastal shelf and tapered the
  Skógafoss cliff before it. The full road remains closed, paved and drivable
  in both directions. The coastal dirt trail ends in a 12 m radius dry turnout.
  An actual capture exposed its first pale overlay as a painted disk; a darker,
  translucent dirt material now blends it with the track and sand. Saved the
  revised Chromium and WebKit views and rebuilt after this visual correction.
- Removed the repeated white foam strips that read as dashes in the sea.
- Changed small rocks and shrubs to three deterministic shape variants each;
  shrubs are low domes. Their dense cast/receive shadows are disabled and one
  combined low trimesh gives visible detail physical contact. Clearances are
  checked after placement. Northern Reach's low shrub collider and shadow
  policy, plus Mars's variant lesson, were the direct references.
- Focused unit checks: **33 passed** (18 Iceland, 15 surface/handling). This
  includes full Modern and Classic Ring Road drives, source/shore geometry,
  fixed waterfall edges, turnout and detail collision counts. `npm run
  typecheck` and `npm run build` passed. The focused turnout/mouth captures
  passed in Chromium and WebKit (2/2); the final Ring Road browser drive also
  passed in both engines (2/2). I inspected the final mouth view; it no longer
  shows the rectangular river strip. These checks do not establish user visual
  acceptance or physical iPad Safari performance.
- The preceding 12-scenario browser run had **11 passed, one Chromium visual
  capture case timed out at 120 s**. WebKit's equivalent passed. The capture
  case contains 15 viewpoints and an area switch; its time budget is now 180 s
  with the same assertions. A later mixed run had four Chromium navigation
  failures during source edits and live reload; a clean isolated Chromium rerun
  passed 5/5 and WebKit passed 6/6 before the final mouth revision. The final
  mouth and road changes have the focused reruns above. No full suite was run.
- Expanded `WORLD_BUILD_GUIDE.md` into an evidence-linked, cross-world
  experience record, including Northern Reach's region layout, biome and
  obstacle lessons and Mars's feedback on geometry, repeated forms, props,
  silhouettes, camera, signs, symbols, streaming and performance. `AGENTS.md`
  and README direct future sessions to consult it and the relevant source/tests.

**Next:** obtain user visual review of the Skógafoss and mouth captures, then
continue the Sólheimasandur connector. Refine the eastern shoreline and cliff
when its adjoining region is laid out; do not treat the whole Iceland world as
complete.

## Whole Skógá refinement — 2026-10-17

- Scope includes the plateau river and cliff top as well as the plunge pool,
  bridge, ford and downstream river to the sea. User explicitly confirmed the
  downstream section also needs the same quality treatment.
- Applied Highlands' broad eased-bank profile to the upper river; introduced
  gentle meanders and a rounded source pool instead of the abrupt z=360 cut.
  Soft gravel/moss colour transitions replace the hard dark river stripe.
- Widened the lower plunge pool and eased the downstream banks, retaining the
  original bank profiles at the bridge and marked ford. Water clipping,
  depth-dependent transparency and the clean sea join remain in place.
- Preserve detailed river corridor terrain in the distant layer, including
  the source and outlet. This avoids coarse banks cutting through the water
  when Photo mode moves away from the car.
- Added upstream and source views to the browser inspection. Initial Chromium
  captures show the continuous source-to-brink channel and lower pool.
- The user's later sea screenshot exposed the ocean plane showing through
  the submerged riverbed. Replaced the full ocean plane with four rectangles
  around the river footprint. The river and ocean now meet at a common edge
  and elevation; colour/opacity blend toward the mouth instead of overlaying
  two water surfaces. Added a downward-ray test proving no ocean under the river.
- Added an Asphalt surface used only by the new Iceland road/bridge. Firm-road
  handling values remain the same; the HUD says Asphalt and no dirt dust emits.
  Registered the surface in the wheel counts, effects palette and exhaustive
  terrain palette. Gravel tracks and the river keep their distinct labels.
- Replaced axis-aligned sinusoidal colour stripes with deterministic smooth
  noise at two scales. Added clustered basalt gravel and low vegetation in two
  instanced draws around the playable corridor; some black sand remains bare.
  Clearances protect pavement, trails and water. A placement test caught offset
  stones/shrubs crossing the bank; those final positions now get water checks.
- Final unit checks: **32 passed** (17 Iceland plus 15 existing surface/handling
  regressions). Typecheck and build passed. Initial build caught missing entries
  for the new surface in exhaustive maps; completed those entries before the
  final verification run.
- Intermediate browser runs were intentionally interrupted to incorporate the new sea
  screenshot, complete the asphalt registration and add the requested ground detail; interrupted runs are not
  counted as passes. Final browser verification is in progress.
- No full project or PWA suites rerun. Existing worlds' surface definitions are
  unchanged; the shared edits add only Asphalt lookup entries. Physical iPad
  Safari and sustained device performance remain manual checks.

- Cross-world references reviewed: Northern valley/watershed terrain and water
  clipping, Highlands eased banks and depth colours, Mars feedback 1 rock grounding,
  anti-striping and seam fixes, and the smooth-terrain lighting decisions.
  Added `WORLD_BUILD_GUIDE.md` as shared memory, linked from `AGENTS.md` and README.
  Future location work must read it, name the reference implementation, carry its
  constraints forward and update the guide when a general lesson emerges.

**Next:** review the complete Skógá corridor, then continue the coastal pilot
with Sólheimasandur and its optional airplane wreck.


## River banks and shallow transparency — 2026-10-17

- Replaced the fixed-width water ribbon with triangles clipped against the
  actual terrain waterline, following Northern Reach's terrain-clipping approach.
  The old ribbon could end above the submerged bank, exposing polygon edges.
- Added depth-based colour and shallow opacity: the gravel ford and bank bed
  remain visible, while the deeper pool retains its blue-green colour. Kept the
  river-mouth fade and exclusion of foam across the outlet from the prior fix.
- Added close bank and ford captures. Inspected Chromium and WebKit views of
  the banks, ford, waterfall brink and mouth; evidence in
  `artifacts/iceland/river-bank-fix/`.
- New focused geometry test passed: water vertices fit wet ground, shallow ford
  remains covered, clipped bank vertices exist, and no extension crosses the
  sea-level endpoint. Both focused browser scenarios passed (2/2). Typecheck
  and build passed after removing an unused import caught by the initial build.
- Terrain/collision and water-depth physics did not change. Full driving, PWA
  and project suites were not rerun; previous results remain below.
- Next: review the water appearance on the user's device, then extend the coast
  to Sólheimasandur and the airplane wreck.

## River mouth overlap — 2026-10-17

- Removed the flat river extension beyond its sea-level endpoint (previously
  extending to z=704). Fade the river material over the last 32 m to avoid a
  rectangular colour boundary and competing near-coplanar ocean surfaces.
- Exclude shoreline foam strips across the outlet, including their half width
  and a bank margin. These strips caused the dashed lines in the user capture.
- Added high and low river-mouth views to the visual browser scenario. The
  initial low view was inside the bank; moved it over the channel and reran.
- Typecheck/build passed. Final focused visual scenarios passed in Chromium and
  WebKit (2/2); inspected both mouth views in both engines. Captures saved in
  `artifacts/iceland/river-mouth-fix/`.
- Terrain, water-depth sampling and vehicle behavior are unchanged. No driving,
  unit or PWA rerun for this scenery-only correction; prior results below stand.
- Next: continue the coastal slice toward Sólheimasandur and the airplane wreck.

## Bridge verge flicker — 2026-10-17

- The grey concrete deck meets the graded terrain at the same elevation near
  the banks. Added concrete polygon depth bias to resolve their competing
  surfaces, including the exposed strips beside the asphalt. Collision and
  driving geometry are unchanged.
- Typecheck and production build passed. Both focused visual browser scenarios
  passed in Chromium and WebKit (2/2); inspected overhead bridge captures in
  both engines. Saved updated evidence in `artifacts/iceland/bridge-fix/`.
- No unit, driving or PWA rerun for this material-only change. Earlier geometry
  repair results below remain the latest driving checks.
- Next: review the bridge in motion on the user's device, then continue the
  coastal slice as recorded below.

## Geometry repair — Skógafoss and road joins — 2026-10-17

### Implemented

- Removed the separate mossy cliff shell. The exposed cliff is now the terrain
  itself, including collision; its brink and waterfall share fixed coordinates.
  A tightly spaced terrain row forms the vertical drop. Nearby coarse terrain
  retains the detailed cliff geometry to avoid cutting through the waterfall.
- Extended the upper river to the brink with a tapered, transparent surface.
  Removed the contrasting horizontal lip slab. Turbulent water stays in front
  of the cliff throughout its animation; the top edge stays fixed to the river.
- Lowered the expanding spray so it overlaps the pool surface while retaining
  the moving droplets and fixed particle budget.
- Rebuilt road pavement as one indexed closed ribbon with shared cross sections
  and mitered edge markings. Independent rectangles caused the visible gaps
  and overlaps in turns; adjacent spans now share vertices.
- Restored the collidable road bridge and graded approaches. The downstream
  ford remains a separate gravel option. Updated the concept map and design.
- Added front, brink and overhead bend captures to the visual review scenario.
  Earlier captures missed the joins exposed by the user's screenshots.

### Verification

- All **12 focused unit checks passed**, including both cars across bridge and
  ford both ways, full road laps, closed pavement topology, brink support and
  vertical clearance. Typecheck and production build passed (existing bundle
  size warning remains).
- The initial geometry check assumed a symmetric water bounding box. Replaced
  it with an exact fixed-top-edge assertion; the waterfall intentionally moves
  forward of the cliff. All checks above passed after that correction.
- Chromium front/brink/bend captures inspected: spray touches water, no moss
  shell or floating lip, and no open road joins. A render inspection exposed
  animated water crossing the cliff plane; its displacement was corrected.
- All **10 browser checks passed** (five each in Chromium and WebKit, 8.7m):
  visual views/reset/disposal, bridge and ford both directions, river loop,
  animation/pause/reduced motion, and road driving across streamed chunks.
  Inspected both engines’ front/brink/bend captures; saved evidence in
  `artifacts/iceland/geometry-fixes/`.
- No full project or PWA suite rerun for this isolated geometry repair. Last
  full project suite remains 2026-10-11; last PWA result 15 passed / three skipped.
  Physical iPad Safari and sustained device performance remain manual checks.

**Next:** review this repaired Skógafoss slice from the user's preferred camera
angle, then extend the coastal route to Sólheimasandur and the airplane wreck.
The other Iceland regions remain planned, not complete.

## Refinement — vertical Skógafoss, ford and Ring Road — 2026-10-17

### Implemented

- Updated `artifacts/iceland/concept-map.svg` and `.png` with Landmannalaugar,
  Brennisteinsalda, Laugahraun, Ljótipollur, Langjökull, Kerlingarfjöll,
  Lómagnúpur and Kverkfjöll. Fourteen regions; Route 1 and the Westfjords
  branch are distinct. Added a reproducible map renderer.
- Skógafoss is a vertical drop from a horizontal lip. Subdivided turbulent water,
  uneven edges, falling droplets and broad mossy cliff faces replace the sloping
  strip and repeated columns. Used the user's photograph as the reference.
- Spray now has 56 expanding, rising and drifting billboards plus 80 falling
  droplets in two instanced draws. Particle counts remain fixed. Pause and
  reduced motion freeze animation.
- Restored transparent river water (opacity 0.56), with the gravel bed visible.
  Removed the local bridge, its collision and old bridge approach. The marked
  shallow ford carries Route 1; the riverbank visit crosses back through it.
- Added a continuous, graded Ring Road with dark pavement, edge lines and dashed
  centre markings. The crossing becomes unpainted gravel in the river. Road
  geometry follows terrain collision; route sampling is spatially indexed.
  The rest of Iceland's named regions remain unfinished development terrain.

### Checks and review

- Both full laps passed with real Rapier wheels: Modern clockwise and Classic
  counterclockwise. Road grade/depth, ford both directions, riverbank return,
  sea stall/reset, chunk seams, stale workers and disposal checks passed.
- All ten Iceland browser checks passed (five in Chromium and five in WebKit),
  including southern/eastern/northern/western road sections across streamed
  chunks, the river route, transparent water, absence of the bridge, motion,
  pause/reduced motion and reset/area switching.
- A new geometry/motion check verifies the vertical drop and fixed spray budget.
- Actual captures caught a shader compile newline error and transparent river
  sorting across the waterfall lip; both were fixed. The visual browser check
  now fails on console errors as well as page errors.
- Final verification: **10/10 focused unit checks passed**, typecheck and
  production build passed. After the final shoulder/lip adjustment, the four
  affected visual/motion browser checks passed again in Chromium and WebKit.
  Inspected final waterfall/river and road captures; no shader errors remain.
- Captures: `artifacts/iceland/refinement/`. No full project unit/browser or PWA
  suite was rerun for this isolated terrain/scenery iteration. Last full project
  suite remains 2026-10-11; last PWA result remains 15 passed / three skipped.
  Physical iPad Safari and sustained device performance remain manual checks.

**Next:** review the updated waterfall in the game, then author the coastal
Sólheimasandur/airplane-wreck stretch along the reserved Ring Road corridor.

## First chunk — Skógafoss / Skógá — 2026-10-17

The new 1,536 × 1,536 m world has its first playable southwest-coast slice.
Open `http://localhost:5173/?area=iceland` with `npm run dev` running. The existing
Iceland Highlands remains a separate location. Iceland is deliberately absent
from the production picker; production direct links fall back to Northern Reach.

### Implemented

- Independent deterministic terrain worker, 96 m chunks, at most 25 detailed
  render chunks and nine terrain colliders. Coarse terrain has matching boundary
  vertices and normals. Loading holds the car until nearby collision is ready.
- Skógafoss escarpment, waterfall curtain, basalt shoulders and moss; Skógá
  river continues to the southern sea. Waterfall streaks and spray animate while
  playing, and stop on pause or with reduced motion enabled.
- Marked shallow ford downstream, graded driving loop and collidable dry bridge
  return. Modern and Classic use Earth handling. The start faces the falls.
- Black sand coast, deep sea and submerged outer apron. Deep water stalls the
  vehicle; Reset returns it to the dry starting clearing.
- Runtime disposal removes owned meshes, materials, worker and colliders.

### Verification

- Typecheck and production build passed. Existing large-bundle warning remains.
- Focused unit checks: **9 passed**. Exact terrain triangles, chunk/LOD edges,
  water depths, both cars across ford/bridge both ways, forward/reverse loops,
  powered coast entry/stall and reset, delayed/stale worker results, worker
  failure and disposal, plus existing vehicle-selection regressions.
- Iceland browser checks: **8 passed**, four each in Chromium and WebKit:
  rendered viewpoints, reset/area switching, ford/bridge both directions, full
  river loop, motion/pause/reduced motion. Existing Valley driving, steering,
  braking, reset and pause regression: **2 passed**, one in each engine.
- Full PWA checks: **15 passed, three existing WebKit offline cases skipped**.
  The new production Iceland direct-link/picker gate passed in both engines.
- Inspected actual Chromium and WebKit captures, saved in
  `artifacts/iceland/pilot/`. Fixed overlapping waterfall sheets,
  bridge/terrain depth flicker and a visible sea-boundary wall found in captures.
  The first capture scenario also exposed an asynchronous photo-exit wait in the
  test, which now waits for playing mode before entering the next viewpoint.
- The direct `tsx` CLI was blocked by sandbox IPC permissions; the documented
  `node --import tsx --test` command ran successfully.

### Scope and remaining work

This is a first playable slice, **not completion of the south-coast pilot**.
The remaining world is reserved terrain. Sólheimasandur, airplane wreck,
Reynisfjara, sandur, Jökulsárlón, glacier cliff and icebergs are not implemented.
The waterfall, basalt and surf are first-pass art; physical iPad Safari review
and long-session performance acceptance remain open.

No full unit/browser suites were requested or run for this isolated slice.
The last project full-suite record in `MARS_PROGRESS.md` remains 2026-10-11.
WebKit two-contact touch and offline-reload automation gaps retain manual iPad
acceptance; skipped cases must not be counted as passed.

**Exact next chunk:** extend the existing black coast east to Sólheimasandur,
add the optional airplane wreck and a safe coastal route/return, and prove both
cars can drive the connector both ways. Then continue to Reynisfjara and the
lagoon pilot gate described in `ICELAND_BUILD_PLAN.md`.

The user's later additions are reserved in `artifacts/iceland/DESIGN.md`:
Landmannalaugar/Brennisteinsalda/Laugahraun/Ljótipollur, Lómagnúpur and a
recommended Langjökull route. The user confirmed Kerlingarfjöll; Kverkfjöll
also fits as a compact northern Vatnajökull landmark. The expanded design has
14 regions. No terrain for these additions has been generated. Lómagnúpur now
belongs in the sandur portion of the continuing coastal pilot.
