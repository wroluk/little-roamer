# Location comparison pilots

## Scope and design

The user requested a small driveable pilot for each unbuilt concept in
[LOCATION_IDEAS.md](LOCATION_IDEAS.md), developed in a loop so the next full
location can be chosen by driving. These are development-only samples, not
implementations of the concepts' eight-region plans. Tropical Island remains
separate; Mars and Moon already exist and are not being rebuilt.

**Current selection:** Island Tracks is now the single `?area=island-tracks`
world, with Rock Passage, Seabird Climb and Pebble Cove. The old causeway
comparison implementation is removed, and `tidal-islands` is retired.
The table and dated entries below preserve the original comparison history,
not five currently selectable alternatives. The other four pilots remain.

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

The table describes the historical comparison samples, not the selected Island
Tracks world. For `?area=island-tracks`, use
[its build plan](artifacts/island-tracks/BUILD_PLAN.md) as the current design
and continuation plan. The [tropical Island plan](artifacts/island/BUILD_PLAN.md)
describes a different world.
Entries below are dated history; later corrections supersede earlier recovery
policies, route boundaries and "next" actions without erasing their evidence.

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

Island Tracks' complete implementation history now lives in
[its own progress record](artifacts/island-tracks/PROGRESS.md).
The entries below cover the five comparison pilots only.

### Tropical Island joins the optional demos — 2026-11-03

The user explicitly classified tropical Island (`island`) like Old Quarry:
it now appears under **Development → Comparison demos**. Its units moved to
`tests/optional/island.test.ts`, and its browser spec is excluded by default.
The existing demo opt-in commands include it; its production-exclusion guard
stays in the normal PWA suite. This does not exclude fresh Island Tracks
(`tidal-islands`), change the five original demo IDs, or repair deferred terrain.

### Comparison demos are optional, not release gates — 2026-11-03

The user clarified that the five comparison demos exist only to get a feeling
for possible locations; broken demo drives should not block other work.
Moved their units to `tests/optional/location-demos.test.ts`, outside the
default root test glob. Default browser discovery excludes both comparison
specs. Explicit opt-in commands retain the old checks for future reference:
`npm run test:demos` and `npm run test:browser:demos`.

The fresh Island Tracks crossing (`tidal-islands`), shared vehicle behavior
and other worlds remain covered normally. Production tests still guard
against accidentally exposing demos; they do not drive experimental terrain.
The interrupted integration browser run's 17 failures were in UI, Highlands
and Iceland, not comparison demos, so this scope change does not resolve or
reclassify those failures.

### Traction integration: controlled run-ups — 2026-11-02

The user explicitly confirmed the direction: a passage may be a challenge,
including needing a run-up. Preserve the accepted load-bounded drivetrain and
the authored physical obstacles rather than requiring every approach to crawl.
Reference: the existing isolated-obstacle drivers and their full-journey
counterparts in `tests/optional/location-demos.test.ts` and `tests/tidal-tracks.test.ts`.

The four original forward failure cases now pass unchanged contact, wheel-lift,
articulation, upright, water-depth and airborne-time assertions using a controlled
approach: Diagonal fallen oak at 3.2 m/s for both cars, Split Saddle slab at
4 m/s, Landing rib at 3.2 m/s. Only these approaches' speed limits changed;
all reverse approaches keep their original lower limits, as do the other
obstacles and complete journeys. No terrain, vehicle physics, controls,
colliders or pass thresholds changed. All **205** affected units across shared
physics/recovery/feedback and all new worlds now pass, including the complete
two-way journeys and unchanged slow reverse trials. Integration-wide browser
and publication gates remain pending; this is not yet a release result.

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

All five samples are implemented and available under **Development → Comparison demos**
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
full-loop run passed; see [Island progress](artifacts/island/PROGRESS.md).

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
