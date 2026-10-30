# Location comparison pilots

## Scope and design

The user requested a small driveable pilot for each unbuilt concept in
[LOCATION_IDEAS.md](LOCATION_IDEAS.md), developed in a loop so the next full
location can be chosen by driving. These are development-only samples, not
implementations of the concepts' eight-region plans. Tropical Island remains
separate; Mars and Moon already exist and are not being rebuilt.

| Pilot | Connected sample | Optional choice |
| --- | --- | --- |
| Red Canyon | Juniper wash, Split Spire, Echo Arch and layered mesa return | Rock-shelf shortcut |
| Old Quarry | Terraced haul-road circuit, excavator bench and blue mineral seam | Direct stepped cut and deep covered rubble route |
| Dune Sea | Firm White Pan/gravel circuit, crescent dune and Stone Window | Soft-sand crescent climb |
| Autumn Woods | Golden grove, shallow creek ford, small cascade and covered bridge | High ridge with fallen timber, roots and mossy stones |
| Island Tracks | Grass headland, lighthouse, raised Tide Gate and second-islet loop | Whale's Back rock ridge |

Each has Earth handling, a dry start/reset, a continuous route in both
directions, terrain-matched solid landmarks, bounded resident resources and
explicit disposal. Route markings and landmarks should be readable from car
height. No missions, discoveries, vehicles or production release are included.

## Implementation references

- Tropical Island and Moon runtime/tests: compact resident terrain, exact
  Float32 triangle sampling, batched matching collision, boundary guards and
  disposal. Adaptation: shared infrastructure only for these five new pilots;
  their landforms, routes, landmarks, plants and surface choices are authored
  separately.
- Mars Keyhole geometry/tests: irregular natural openings with solid piers
  and roof. Adaptation: Earth sandstone, shorter passages, no Martian lighting.
- Mars dunes layout and driving checks: finite crescent and firm bypass.
  Adaptation: Earth sand handling and a pale salt pan, never a mandatory climb.
- Highlands water/tests and Island fitted sea/tests: clip actual terrain
  triangles, retain shallow beds and give water exclusive ownership.
- Samurai bridge/architecture and Northern adventure checks: continuous solid
  decks and approaches, open structural framing, grounded tree footprints.
  Adaptation: a roofed woodland bridge, retired quarry machinery and lighthouse.

## Progress

### Fresh Island Tracks earned-shore recovery and game DNA — 2026-10-30

The user called the sea crossing **"the DNA of our game"** after driving it.
Recorded this explicitly in `WORLD_BUILD_GUIDE.md`: readable but demanding
travel, deliberate wheel placement, tactile feedback, supported breathing
space and earned arrival, not a scenery theme or a repeated crossing template.
Preserve the accepted crossing's terrain, obstacles and normal handling.

The user also found that R still returned to Harbor Cove after reaching the
other island, including after the first inland left turn. The previous retry
implementation incorrectly treated the whole original authored route up to
Windward Lookout as one crossing challenge. References: its attempt/physical-
visit isolation, `TIDAL_ROUTE`, the actual landing rib geometry, and the
existing two-car/digital-controller driving tests. Adaptation: split the
earned crossing from the inland approach, rather than weakening strict retries.

The corrected crossing completes on the safe far shore after the landing rib,
before the inland road. Recovery then stays at Saltgrass Landing. The approach
to Windward Lookout is a separate leg, followed by the unchanged Seabird Climb.
Return crossings likewise finish on the home shore rather than requiring the
last walk-in road to Harbor Cove. Shore rest areas include their safe
approaches (55 m around Harbor Cove, 18 m around Saltgrass Landing, dry bed
above 0.6 m), not the crossing's final obstacles. Departure recognition uses
the outgoing route segment outside that area. Crossing visit gates cover the
road's width with 7 m tolerance; the cliff's existing tolerance is unchanged.
Ordered visits alone cannot finish before entering the safe arrival area.
Gull Rock, Split Saddle and Wind Notch remain intermediate, non-retry shelves.
Saltgrass Landing is now an endpoint and an independent inspection start.
No terrain, scenery, colliders, water or handling changed.

Typecheck/build and **51 fresh-world units pass**, including both cars'
real-keyboard shore arrivals in both directions, the first inland turn,
final-rib rejection, offset visit lines, all six ordered-direction legs,
strict retries and the existing full connected drives. The focused browser
run passed regional entries and strict retries in both engines, but its new
shore scenario failed at the first channel in both. The new controller call
incorrectly required 1 m waypoint arrivals instead of the accepted tidal
driver's 2 m policy: it overshot into deep sea while attempting the next gate.
Restored the established 2 m policy, retaining all water, upright, tactile,
camera, arrival and actual R-destination assertions. No terrain or handling
was changed to accommodate this test. The corrected shore scenario now passes
in Chromium and WebKit, including R immediately after arrival, after the first
inland turn and after the return crossing.

New feedback: following a car into deep water exposes a dry-looking seabed
because the driving camera goes below the sea plane. Original image saved as
`artifacts/island-tracks/feedback-underwater-dry-seabed-2026-10-30.png`.
The user selected **keep the driving camera above the water surface**, not an
underwater-fog mode.

Reference: `FollowCamera`'s existing ground floor, smoothed sphere sweep and
collision-tested cabin escape views, with the obstruction/orbit/recovery
physics cases in `tests/physics.test.ts` and `tests/vehicle-recovery.test.ts`.
Adaptation: an optional local water-height sampler, enabled only for
`tidal-islands`. Requested and interpolated camera positions stay at least
1 m above water, and a submerged boom origin is lifted before sweeping.
This keeps shortened/escape views above the sea without a final unswept move
through coastal geometry. The car still falls and sinks; Reset destinations,
shallow handling, water geometry/materials and freely positioned photo mode
are unchanged. Other worlds do not opt in.

Typecheck, production build and **88 focused units pass** (19 shared physics,
18 recovery and 51 Island Tracks). New camera cases cover levels 0 and 12,
deep falls, low orbit, nearby walls, feedback, actual water depth and the
unchanged non-opted-in camera. Their initial fixture lacked the water surface
classification; corrected the fixture rather than weakening the depth check.
The first camera browser run passed Chromium and the fall/orbit checks in
WebKit, but WebKit's shallow-drive measurement included stale deep-water
readings immediately after debug placement. The shallow phase now boots a
fresh dry fixture before using the unchanged real-keyboard driver. Its water
and clearance assertions remain intact. The corrected combined camera/shore
run passes all **4 cases in both engines (9.1 min)**:
`npx playwright test tests/browser/tidal-tracks.spec.ts --grep 'earned shore survives|driving camera stays above'`.

Outward/return crossings reached all three wet channels, with maximum depths
0.428/0.321 m in Chromium and 0.466/0.307 m in WebKit. Their minimum upright
values stayed above 0.83, and the first inland turn retained Saltgrass Landing.
Actual keyboard R reached the appropriate reset pad in every case. The deep
fall/orbit cases kept camera height at least 1 m above sea within numerical
tolerance while car centres fell to -7.79/-6.89 m (open sea/cliff foot) in
Chromium and -7.81/-6.63 m in WebKit. All these scenarios had zero camera
obstruction frames. The camera scenario also drives the actual first shallow
channel, retaining positive wet contact, depth below 0.6 m and upright above
0.65, then verifies R still returns to Windward Lookout after a deep-water fall.

Inspected actual normal follow-camera fall and low-orbit views in
`artifacts/island-tracks/<engine>/*water-camera.png`: deep sea remains visibly
water, while the near-cliff case can show the car through the paler surface.
Normal driving at `water-camera-shallow-exit.png` retains the accepted
crossing view. These are actual game captures, not photo-mode substitutes.
Measurements are beside them in `*-water-camera.json`. Final browser
outcomes and earned-shore drives are retained in `shore-recovery-evidence.json`,
`earned-far-shore-before-reset.png`, `earned-far-shore-first-left-turn.png` and
`earned-home-shore-before-reset.png` in each engine's folder. Inspected both
engines' shore-arrival and normal-driving images as well.

The user subsequently requested a local commit of the work so far and
explicitly discarded the separate uncommitted Mars dust-colour correction.
Restored only that correction's source, tests and documentation, preserving
the original colourful Mars particles and all pilot work. After that removal,
typecheck/build and **191 change-focused units pass** across shared physics,
recovery, terrain feedback, Island, comparison pilots and Island Tracks:
`npx tsx --test tests/physics.test.ts tests/vehicle-recovery.test.ts tests/tidal-tracks.test.ts tests/driving-feedback.test.ts tests/island.test.ts tests/location-demos.test.ts`.
The final sequential production/PWA run also passes all **14 cases**:
`npm run test:pwa -- tests/pwa/tidal-tracks.spec.ts tests/pwa/island.spec.ts tests/pwa/location-demos.spec.ts`.
All seven development pilots remain excluded from production selection/direct
entry and retain installation readiness.

Resources remain **155,884 resident triangles / 15 colliders** for fresh Island
Tracks. No unrelated full-unit/browser or full-PWA suite was rerun. Physical-iPad
Safari performance, simultaneous touch and offline acceptance remain manual;
desktop engines are not proof of those checks. Next: review the earned-shore
Reset and above-water fall behavior by driving, before choosing another
extension. Development-only status is unchanged; the requested commit is
local, with no push or release authorized.

### Fresh Island Tracks challenge retries — 2026-10-30

The user confirmed that both demanding rides look and work great, then chose
**always restart the challenge**, including when an overturned car could
otherwise be righted in place. Intermediate shelves are breathing space, not
checkpoints that let Reset move the car beyond a difficult section.

Reference: the existing physical-visit/photo-isolation hook in
`tidal-tracks.ts`, shared Reset/settling/camera lifecycle in `main.ts`, both-car
connected driving tests, and `vehicle-recovery.spec.ts`'s side/roof poses.
Adaptation: keep the infrastructure and apply a stricter, world-local attempt
policy; other worlds retain safe local righting and their existing fallbacks.
No terrain, scenery, colliders, water, handling or routes changed.

Rock Passage retries from Harbor Cove toward Windward Lookout; Seabird Climb
retries from Windward Lookout toward Seabird Summit. Completing a ride permits
the opposite direction from the earned endpoint. Direction comes from which
route the car enters and ordered route-point visits, not its heading or gear:
backing up to line up a wheel does not flip the attempt. The shared lookout
supports either the return crossing or the onward climb. Visits only count
while playing with at least two wheel contacts, upright above 0.65 and within
2 m of the bed. Loading/photo targets and an out-of-order arrival at an exit
cannot unlock recovery. Reset clears partial progress and faces the car along
the chosen attempt; naturally returning to departure also abandons progress.

Named development inspection links remain available. Gull Rock, Split Saddle
and Saltgrass Landing can inspect the remaining outward route but retry the
whole ride from Harbor Cove; Wind Notch retries from Windward Lookout. The
summit entry permits a descent. Explicit inspection initialization is separate
from ordinary physical visits, and Reset removes its partial-route head start.
The home hint, Reset tooltip, README and shared guide describe the new policy.
The historical shelf-checkpoint/local-righting entries below are superseded.

Verification:

- `npm run typecheck` and `npm run build` pass.
- `npx tsx --test tests/tidal-tracks.test.ts`: **43 pass**, including both cars'
  complete connected drives, all four ordered-direction/retry regressions,
  returning naturally to departure, inspection initialization, grounding,
  collision, water and disposal.
- `npx tsx --test tests/vehicle-recovery.test.ts`: **18 pass**, preserving
  existing local-righting physics.
- `npx playwright test tests/browser/tidal-tracks.spec.ts tests/browser/vehicle-recovery.spec.ts --grep 'Reset and R restart|valley: Reset'`:
  **4 pass** across Chromium/WebKit (2.9 min). Real keyboard entry into all four
  ride directions, upright/side/roof retries, unearned exit arrivals, both
  Reset controls, correct retry headings, and unchanged Valley local righting.
- `npx playwright test tests/browser/tidal-tracks.spec.ts --grep 'views, safe entries|complete technical journey|Seabird Climb from'`:
  **6 pass** across both engines (17.6 min). All seven inspection entries,
  tooltip/photo isolation/switching, full wet crossing both ways and connected
  Seabird ascent/descent retain their physical, camera and resource assertions.
  The partial descent ending at Saltgrass now correctly keeps Windward Lookout
  as its retry departure rather than unlocking the intermediate landing.
- `npm run test:pwa -- tests/pwa/tidal-tracks.spec.ts`: **2 pass**, sequentially
  after browser checks; production selection/direct entry stay excluded and
  offline installation is ready.

Inspected actual normal-driving retry captures at the south-facing lookout
and summit, plus the connected descent arrival. Preserved all four directional
retry captures in `artifacts/island-tracks/<engine>/*-challenge-restart.png`.
Full journey images/metrics remain beside them in `driving-evidence.json`,
`seabird-driving-evidence.json`, `full-journey-*.png` and `seabird-climb-*.png`.
Resources remain **155,884 resident triangles / 15 colliders**.

No broader unit/browser or full PWA suite was run for this scoped behavior
change; no cache/storage/offline policy changed. Both rides have the user's
positive driving/visual acceptance, but the new retry feel and physical-iPad
Safari performance/touch/offline acceptance still need manual review. Next:
try Reset and R midway through either ride in each direction and confirm that
the whole-attempt restart feels fair before choosing another extension.
Development-only status is unchanged. No commits, pushes or branch changes
were made.

### Fresh Island Tracks tree silhouette correction — 2026-10-30

The user's cliff-top image showed a tree crown reading as a rock balanced on
a pole. The wind-bent trees used one flattened dodecahedron in muted olive
colours, too similar to the world's boulders. Preserved the original image as
`artifacts/island-tracks/feedback-tree-crown-2026-10-30.png`.

Reference: tropical Island's branching cylinders and overlapping broadleaf
crowns in `src/game/island-scenery.ts`, its route-clearance/collision tests, and
the comparison pilots' multi-lobed canopy geometry. Adaptation: retain these
13 small coastal trees, their original positions and leaning stems; replace
each stone-like crown with four unequal, rounded foliage clusters in three
distinct greens, supported by two visible fork branches. Branches join the
existing solid trunk batch; foliage remains decorative. Terrain, water,
routes, obstacles, recovery and handling are unchanged.

All **38 fresh-world unit cases** pass, including the complete analog/keyboard
drives with both cars, tree-geometry clearance across the whole route and
visible/physical branch agreement. Typecheck and production build pass.
The focused tree-view/browser-driving case passes in **Chromium and WebKit**:
actual keyboard approach, normal driving capture, high-cliff context,
close tree silhouette and lower viewing angle. Inspected those actual images,
including the branching high-cliff tree rather than only distant foliage.
Current captures are `artifacts/island-tracks/<engine>/wind-tree-*.png`.
Resident resources are now **155,884 triangles / 15 colliders**; the earlier
151,568-triangle measurements below describe the previous canopy.

Long complete browser journeys, unrelated suites and PWA were not rerun for
this local scenery refinement. Existing manual iPad and user visual acceptance
remain open. Next: review the updated high-cliff tree during normal driving;
no further location extension is included in this correction. No commits,
pushes or branch changes were made.

### Fresh Island Tracks continuation direction — 2026-10-28

The user authorized continuing Island Tracks and explicitly asked to preserve
"more deliberate wheel placement and demanding terrain, not just scenery to
drive through" as a general world-building principle. Recorded it prominently
in `WORLD_BUILD_GUIDE.md`, including physical obstacles, larger vertical
journeys, readable line choices, resting space and unchanged normal handling.
The accepted crossing and solid cairns remain the baseline. This continuation
implements the selected **higher cliff climb with rock steps and narrow ledges**, not an
enlargement of the old causeway comparison or a public release.

The new **Seabird Climb** continues from the 30 m Windward Lookout through an
exposed western ledge, a 47 m Wind Notch resting shelf, an upper switchback and
four offset stone crossings to a 67 m summit. The approach reaches summit
height before its 10 m flat turning core. New inspection/recovery entries:
`windward-lookout`, `wind-notch`, `seabird-summit`; only physical visits advance
them. The existing Rock Passage is preserved.

References inspected: this world's solid ribs, exact-bed/sea ownership,
last-visited recovery and two-car driving tests; the comparison Woodland Ridge
for an earned vertical route; Quarry turning/obstacle browser scenarios.
Adaptation: an exposed coastal climb with longer, lower stone ramps on grades,
not woodland obstacles or different vehicle handling. Initial physical runs
caught narrow grid-supported bend footprints, a too-sharp departure from the
resting shelf, and authored markers clearing only an outgoing segment while
intruding into the incoming leg. Widened bends rather than the whole ledge,
made the route level before/after Wind Notch, and placed cliff markers at
segment midpoints on supported inland shoulders. Check every cliff marker
against the whole route and clear the summit sentinel from both the approach
and turning circle. Steep coastal faces also exposed Float32 shoreline drift:
clip 1 mm inside the wet bed and restore the original visible sea height,
retaining both the dry-ground tolerance and physical water level.

A full WebKit drive then caught an intermittent full-lock steering stall at
the first cliff bend. Its isolated retry passed, but a deterministic unit drive
using the browser's digital steering policy reproduced the same stalled pose.
All four tyre contacts were on the bare bed, not a blocking stone or cairn.
Added a short level bend exit before the grade resumes, giving the car room
to finish turning without widening the whole ledge or changing handling.
The regression now covers the complete landing-to-summit route with keyboard
steering, both cars and both directions, alongside the analog drives.

Final typecheck and production build pass. **133 related unit cases pass**,
including **37 fresh-world cases**: the original crossings, analog and keyboard
climbs/descents, both summit circles, individual stones both ways, exposed
ledge support/drop, matching cairn collision, exact bed/water and disposal.
The final affected browser run passed **6 cases in Chromium and WebKit**
(9.8 min): all seven entries/views/recovery/switching, solid cairn contact
versus the adjacent clear line, and the complete connected Seabird ascent and
descent with real keyboard controls. All four connected drives reached all
**17 waypoints**, kept the correct physical recovery shelf and registered no
water or obstructed-camera frames. Wheel-contact lift was 0.320–0.330 m,
peak suspension differences 0.233–0.275 m, and the weakest upright value
remained above 0.802. Peak rendering was **45 calls / 187,036 triangles**;
resident resources are **151,568 triangles / 15 colliders**.

Inspected actual Chromium and WebKit driving-height ledge, resting-shelf,
summit and arrival captures, plus the summit lookback. The ledge's drop and
physical slabs are visible; the lookback shows the western island and part of
the crossing, not an unobscured whole-route map. Current evidence lives in
`artifacts/island-tracks/<engine>/`, including `seabird-driving-evidence.json`,
`seabird-ledge-driving.png`, `wind-notch-driving.png`,
`seabird-summit-driving.png`, `seabird-summit-lookback.png` and
`seabird-climb-{ascent,descent}.png`.

The original complete wet-crossing browser scenario and full PWA suite were
not rerun for this extension; the original route passed final both-car,
both-direction units, while its earlier browser/PWA evidence remains
historical below. No startup, caching, storage or offline behavior changed.
User enjoyment/visual acceptance and physical-iPad Safari performance,
simultaneous touch and offline acceptance remain open. This is still an
internal development entry, not a public release.

Next: [drive from Windward Lookout](http://127.0.0.1:5173/?area=tidal-islands&start=windward-lookout),
climb through Wind Notch to the 67 m summit, turn around and descend. Judge
the ledge widths and step rhythm before choosing another extension.
No commits, pushes or branch changes were made.

### Fresh Island Tracks cairn collision follow-up — 2026-10-28

The user liked the demanding crossing and wants that spirit carried forward:
deliberate wheel placement, tactile obstacles and earned destinations rather
than scenery-only driving. Their immediate correction was that the pale route
cairns could be driven through.

The cairn batch had inherited the scenery helper's decorative default. Marked
it solid, reusing the existing stone-rib/gate batches and runtime's exact
rendered-triangle colliders. No geometry, placement, terrain, water or handling
changed. Reference: the existing solid batches in `tidal-scenery.ts` and the
Three/Rapier surface-agreement checks in `tests/island.test.ts`; adaptation:
probe exposed upward faces throughout the merged three-stone cairn batch.
The new batch adds one owned collider: **13 total**, still **153,010 triangles**.
The earlier 12-collider first-slice measurements below remain historical.

Typecheck and production build pass. All **18 fresh-world unit cases** pass,
including the new visible/physical stone agreement, both cars' complete
forward/reverse crossings, summit circles and individual ribs. Focused browser
coverage passed **4 cases in Chromium and WebKit**: entries/views/recovery/
switching and real keyboard contact with the Saltgrass Landing cairn versus
an unobstructed adjacent line. A final stricter contact/capture rerun passed
in both engines: the car advances to the pile, stops before it with near-zero
speed, remains upright and has no obstructed-camera frames; the adjacent
drive completes. Inspected actual side-on driving captures showing the stones
against the bumper, not merely a collider count. Images and metrics are
`artifacts/island-tracks/<engine>/{solid-cairn-driving.png,cairn-collision.json}`.

The complete browser journey and PWA suites were not rerun for this local
collision-only change; their previous evidence remains below. Next: define the
next connected demanding ride, preserving this tactile character rather than
adding an easy sightseeing extension. No new region was implemented in this
fix. Development-only status and remaining manual iPad acceptance are unchanged.

### Fresh Island Tracks build — 2026-10-28

The user chose Island Tracks for a fresh start, not an enlargement of its
comparison pilot. They explicitly selected a genuinely technical inter-island
crossing: reaching the other island should feel earned. Authorized first slice:
departure cove, the complete winding rock/wading passage and a rewarding second-
island arrival. No easy causeway bypass, tide timer, jumps or hidden underwater
traps. Keep the existing comparison and tropical Island pilots intact.

The independent development entry is `?area=tidal-islands`. Fresh geography:
Harbor Cove on a grassy western island, a broken basalt chain with three
shallow channels and narrow rock gates, Gull Rock and Split Saddle resting
shelves, Saltgrass Landing on the eastern island, then a climb to Windward
Lookout. Water level is fixed. Dark offshore water is intentionally too deep;
the pale channel bed and exposed rock silhouettes identify the intended route.

References inspected: comparison resident runtime/triangle/water helpers and
tests, tropical Island terrain/runtime/entry/reset tests, Northern solid
obstacle and wet-shoal driving tests, and the previous Quarry/Woods contact
measurements. Reuse exact Float32 bed sampling, triangle-clipped water,
batched matching collision, bounded resident disposal and real per-wheel
validation. Adaptation: wholly new island/rock/route geometry, narrow wet
approaches and physical stone ribs, not the comparison causeway layout.

Recovery uses the last dry resting shelf actually visited by the grounded car,
not the nearest future shelf across the water. Photo/loading targets must not
advance it; local righting is retained before fallback. Initial regional URL
entries are available for development review, not a progression/unlock system.
Starts: `harbor-cove`, `gull-rock`, `split-saddle`, `saltgrass-landing`.

Implemented a roughly 395 m cove-to-lookout journey in a resident 400 m square
world. Four matched solid stone ribs produce independent wheel contact and
suspension movement. The sea has actual submerged terrain and no invisible
road or dry bypass. The two intermediate resting shelves are level, with
enough supported space to stop and choose the next line.

Corrections during implementation:

- Initial wet exits climbed too abruptly while wheels still had reduced water
  traction. Lengthened the first approach and tapered wet beds longitudinally
  into dry rock rather than leaving rounded flat-bed caps.
- Small analytic resting circles did not cover their grid-interpolated wheel
  footprints. Enlarged flat cores instead of relaxing the level-bed check.
- A short summit approach hit the lookout pad's grading feather too low.
  Extended the climb and made it reach 30 m before the final turning space.
- An added real turning-circle check caught solid summit props in the turning
  envelope, then wheels falling over the pad's outer grading lip. Moved the
  props outward and reserved a 10 m flat core. Both cars now complete actual
  summit circles as well as the entire journey in either direction. Reference:
  the Quarry turning-chamber drive, adapted to the exposed coastal summit.
  The relocated mast also needed a full-footprint minimum, not a centre-height
  placement on the sloping shoulder; an explicit bottom-vertex check now
  protects its footing.
- Actual low and high captures showed chalky shallows and large offshore
  triangles from uniform sea transparency. Retinted only this world's water
  and used depth-dependent vertex alpha: clear shallow beds, opaque deep sea
  before the finite terrain boundary. Rechecked actual wading and lookout
  images; the offshore seams are gone and the shallow line remains visible.
- Kept render/loading updates separate from physical shelf visitation so
  photo mode cannot unlock a later recovery point.
- Made terrain-backed pilot starts lazy getters. The five comparisons,
  tropical Island and fresh crossing no longer generate their resident grids
  merely because an unrelated world is starting.

Normal Earth handling, collision agreement and traversal safety thresholds
remain unchanged.

#### First-slice evidence

| Check | Result |
| --- | --- |
| Typecheck and production build | Pass on the final code |
| Combined fresh crossing, comparison, tropical Island and vehicle-selection units | **115 passed**, including 17 fresh-world/startup cases, both cars in both journey directions, summit circles and individual stone traversals |
| Complete fresh-world browser gate | **4 passed** in Chromium and WebKit, 10.7 min: all regional entries/views/recovery/switching and complete keyboard journeys both ways |
| Final footing/lazy-start entry and view refresh | **2 passed**, both engines, 1.4 min |
| Preserved Island Tracks comparison signature drives | **2 passed**, both engines, 1.4 min |
| Final complete `npm run test:pwa` | **34 passed, 4 skipped**, 4.9 min; new entry excluded from production selection/direct entry in both engines |

All four browser journeys registered all three wet channels, reached the 30 m
lookout and retained the appropriate last-visited recovery shelf. Measured
wheel-contact lift was 0.386–0.389 m and peak suspension differences were
0.247–0.280 m, with zero reported obstructed-camera frames. Maximum wheel-water
depth was 0.489 m, below the unchanged 0.6 m limit. Peak rendering was 45 calls
and 188,686 triangles; the resident world owns 153,010 triangles and 12
colliders. Switching and idempotent disposal remain covered.

Actual review images and per-direction JSON are in
[`artifacts/island-tracks/`](artifacts/island-tracks/), separated by engine.
Inspected normal cove/resting-shelf/wading views and the complete passage
lookback from Windward Lookout, not just an overhead map. The earlier
interrupted browser run is not counted as a completed gate.

The first PWA run hit the old multi-world offline scenario's aggregate 45 s
deadline near its final Moon step; isolated reruns reproduced it. An isolated
tracked-HEAD baseline, without changing branches or the user's checkout, also
took about 45 s. Deferred unnecessary pilot grid initialization and gave only
that multi-reload scenario its own 90 s budget, consistent with the update
scenarios. No behavior assertions, per-action waits or skip conditions were
weakened. It then completed alone in 47 s and in the final full suite in 46 s.
Temporary baseline files were removed; diagnostic images remain in the session
artifacts.

#### Remaining scope and exact next step

This completes the authorized connected **first slice**, not the earlier
eight-region concept or a public release. The old causeway comparison and
tropical Island remain separate and available. No changing tide, timed gate,
new vehicle, missions or persistent progression were added.

Next: drive from Harbor Cove without a regional shortcut, cross all three
channels, turn at the lookout and return, judging whether wheel-line choices,
water readability and the reward feel right. Physical iPad Safari touch,
thermal/performance and offline acceptance remain manual; desktop emulation
is not device proof. The four known WebKit offline skips and automated
two-contact touch gap are not counted as passes. Refine this slice from that
feedback before widening the island world.

### Tactile refinement pass — 2026-10-27

The user found all pilots promising but too much like driving through scenery.
They selected Old Quarry and Autumn Woods as the first refinement pair: real
wheel interaction with logs, roots and boulders, larger elevation differences,
and a genuinely descending quarry tunnel. The other three pilots and tropical
Island are outside this pass. Keep the relaxed circuits and existing cars/
handling; challenge routes are optional, not random obstructions.

Implementation references read: Northern `trailLog` geometry and
`tests/northern-adventures.test.ts` (measure wheel-contact lift, not proximity);
Mars `mars-tubes-layout.ts`, `mars-tubes-landmarks.ts` and tube tests (a graded
trench under a matched, closed roof skin, grounded small rubble, real passage).
Adaptation: a bent Earth-gravity excavation with a broad chamber and second
exit, and a 43 m woodland ridge with embedded crossable timber/stone. Both use
the pilots' existing resident ownership and exact terrain triangle sampler.

Implemented the optional quarry descent from its 6 m eastern floor to -25 m,
about 55 m below the starting yard. Follow the pale posts into **Deep Cut**:
three crossable rubble/slab obstacles, a bent solid-roof passage, a wider level
turning chamber and a second exit climbing back to the northern circuit.
The original haul road and direct cut remain available.

The woodland option now climbs from 8 m to a 43 m ridge, with two fallen trunks,
exposed roots and two mossy stone crossings. Golden posts lead outward from
Cathedral Grove through the timber and up to the crest; a longer descending
return reconnects before the ford. Both worlds retain unchanged Earth handling,
their original safe starts/reset behavior, and clear relaxed main circuits.
Obstacles use matching visible/solid geometry conformed to the exact bed;
the tactile movement is wheel/suspension interaction, not added camera shake.

Corrections during this pass:

- The first woodland return crossed the main road's grading feather too high,
  tipping cars on an abrupt descent. Extended its approach until the elevations
  converge; both cars now complete the whole option in either direction.
- Steep clipped quarry strata exposed Float32 coordinate drift beyond the
  existing terrain-agreement tolerance. Reproject final rounded X/Z vertices
  onto the exact sampled bed and recompute normals; did not relax the tolerance.
- Actual cave captures showed an unreadable black slab overhead and posts too
  high on the shoulders. Added an arched, buried-edge roof profile, lighter
  underside colour and local floor shading, and moved guides inward to the low
  shoulder. No shared lighting, headlights or extra shadow passes were added.
- The first crest photo looked down into foreground; the next was blocked by
  a nearby canopy. Moved the review pose to the ridge edge and aimed toward the
  valley. Final captures show the descending trail and Copper Falls below,
  without changing terrain simply to fix a photograph.

#### Refinement evidence

Typecheck, production build and the combined comparison/Island/vehicle-selection
unit command pass: **98 tests**. This includes all original circuits/options,
both cars driving both complete new journeys in both directions, 32 individual
obstacle/model/direction drives, actual turning circles in the underground
chamber with both cars, matching roof raycasts, open mouths and local recovery
that stays underground.

All **12 affected browser scenarios** passed across Chromium and WebKit
(12.7 minutes): entry/views/reset/world switching, existing easy signature
drives, and the new keyboard-driven tactile journeys in both directions.
After the final photo-only crest adjustment, both affected visual scenarios
passed again (53.6 seconds). Units cover the complete optional routes;
new browser drives cover the covered quarry section and woodland timber-to-
ridge section, not the complete return connectors. Both cars have physics
coverage; the new browser adventures use the modern car.

Saved new-adventure runs measure peak wheel lift of **0.329–0.351 m** and
suspension differences of **0.220–0.276 m**, with independent contact heights,
minimum upright-vector Y above 0.82, no water immersion and zero reported
obstructed-camera frames in either engine/direction. The normal chamber camera
also remains below the roof. Browser car-centre heights reach approximately
-24.19 m in the quarry and 43.83 m on the woodland ridge. New-adventure peaks
are 41 draw calls and 173,634 rendered triangles, below the unchanged limits.

| Refined pilot | World triangles | Resident colliders |
| --- | ---: | ---: |
| Old Quarry | 136,447 | 10 |
| Autumn Woods | 140,052 | 9 |

Actual Chromium and WebKit views were inspected: `deep-cut-driving-camera.png`,
the entrance/bend/chamber views, `fallen-timber.png`, `ridge-boulders.png`,
`ridge-crown.png`, and normal driving captures. Evidence and measurements live
under `artifacts/location-demos/<pilot>/<browser-project>/`, including
`tactile-driving-evidence.json`. The roof/obstacles are batched into existing
resident ownership and disposed on switching worlds; no per-frame generation.

Next: drive this pair and compare slow obstacle line choices, the ridge climb
and underground descent before choosing another refinement or full location.
User enjoyment/visual acceptance and physical-iPad performance/touch/offline
acceptance remain open. These are still development pilots. Unrelated full
unit/browser suites and PWA were not rerun this pass: startup, storage, cache
behavior and public release are outside its scope; the earlier PWA evidence
and WebKit skips below remain historical, not a new release gate.
No commits, pushes or branch changes were made.

### Original five-pilot implementation

All five samples are implemented and available in the development home picker
and through `?area=red-canyon`, `?area=old-quarry`, `?area=dune-sea`,
`?area=autumn-woods` and `?area=island-tracks`. Each uses a 400 x 400 m resident
terrain, with the connected sample concentrated in the centre. A finite CPU
height-grid cache is generated lazily per visited pilot; only the selected
pilot owns scene, physics and GPU resources. Reset returns to its single safe
clearing when local righting is inappropriate. No regional start names imply
that unbuilt full-concept regions exist.

### Original corrections from driving and visual review

- First passes drove all four mainland circuits, but causeway rail ends blocked
  both turns onto/off the second islet. Shortened the rails to the straight
  crossing; both cars now complete that circuit both ways.
- Nearest-segment grading made shoulder steps around forks and sharp bends.
  Blend adjacent grades within each route, then let the main road control its
  full envelope instead of an optional shortcut. Extended the quarry return
  climb rather than relaxing the grade check.
- Actual Red Canyon captures showed smeared, sawtooth terrain layers. Split
  triangles at horizontal stratum boundaries, retaining the exact same planes
  for collision. The quarry's mineral band now colours exposed slopes, not the
  excavator platform, so the machinery no longer appears parked over a pool.
- Changed lighthouse and dune review poses to include coast/pan context rather
  than just a tower against sky or a near dune face. These are actual game
  views, not concept renders; user visual acceptance remains separate.
- Copper Falls initially met dry ground before reaching the creek. Widened the
  channel's western cut and ended the falling sheet on an actual submerged grid
  vertex. The regression checks its source, continuous low outlet, and sampled
  points across every falling-water triangle against the exact rendered bed.
- A stronger ford drive exposed a missing water surface classification: visible
  water alone did not activate wet-wheel handling or spray. Wet ground now uses
  the water profile while the timber deck and raised causeway stay dry. Actual
  two-way browser ford drives reach about 0.207 m wheel depth in both engines.

### Original comparison gate (before tactile refinement)

`npm run typecheck`, the production build, and
`node --import tsx --test tests/location-demos.test.ts tests/island.test.ts tests/vehicle-selection.test.ts`
pass (54 tests). Comparison units include all five complete circuits in both
directions with both Earth cars, optional lines both ways, exact geometry/
height agreement, fitted water, dry starts, route clearance, open/solid
landmarks, resource budgets and disposal. No shared vehicle physics was changed.

| Pilot | World triangles | Resident colliders |
| --- | ---: | ---: |
| Red Canyon | 138,667 | 9 |
| Old Quarry | 118,686 | 8 |
| Dune Sea | 81,200 | 7 |
| Autumn Woods | 141,896 | 8 |
| Island Tracks | 149,998 | 8 |

Actual driving-height and feature captures are under
`artifacts/location-demos/<pilot>/<browser-project>/`. All 20 dual-engine
visual/entry/reset/world-switching and two-way keyboard-controlled signature
scenarios passed (9.1 minutes). After the final water fixes, all eight affected
Autumn Woods/Island Tracks scenarios passed again (3.3 minutes). Complete
circuits are covered in units; comparison browser drives cover the signature
sections, not full circuits. The tropical Island's separate six-case dual-engine
full-loop run passed; see [Island progress](ISLAND_PROGRESS.md).

Saved browser evidence peaks at 44 draw calls and 195,014 rendered triangles,
below the focused 65-call/300,000-triangle limits. Actual Chromium and WebKit
captures were reviewed, including the repaired cascade and the different
landmark/landform views. These desktop measurements are not iPad benchmarks.

Production/PWA evidence is complete for this development gate. The full
`npm run test:pwa` run passed its 22 other scenarios, including tropical Island's
production exclusion, cache installation, Chromium offline travel and
phone/tablet update confirmation. Four existing WebKit offline scenarios remain
skipped, not passed. Its two comparison failures exposed a test isolation issue:
five successive navigations reused an installed service worker, but the final
assertion expected its one-time installation badge event. Each pilot now gets
its own fresh browser context and retains all production exclusion and
offline-ready assertions. The targeted corrected PWA run passed all 10 cases
in both engines (46.1 seconds); the whole PWA suite was not rerun after that
test-only correction.

Next: drive and compare these five pilots plus the tropical Island, then choose
which location deserves full-world development. These are development samples,
not full-world completion, user visual acceptance or physical-iPad performance/
touch/offline acceptance. Keep manual iPad Safari offline and simultaneous-touch
acceptance open. Full unrelated browser and unit suites are not part of this
change-focused gate. No changes were committed or pushed.
