# Island Tracks implementation progress

Read the [build plan](BUILD_PLAN.md) and
[shared world-building guide](../../WORLD_BUILD_GUIDE.md) before extending
`?area=island-tracks`. The tropical Island remains separate. The old causeway
comparison is removed; earlier entries describing `tidal-islands` or preserving
both Island Tracks versions are historical, superseded by the user's naming
cleanup. Dated entries retain their original evidence;
later decisions supersede earlier scope and recovery policies.

## Progress

### Completion sign-off and final scoped acceptance - 2026-11-05

The user accepted **Island Tracks as complete**, including the mainland,
western coast, discovery and current eight postcard compositions, and
authorized committing everything and pushing. This supersedes the earlier
preview/framing holds. Local validation is limited to Island Tracks and its
shared postcard behavior; the user explicitly retained the normal Pages CI
workflow, including its standard full unit run after the push.

The user reaffirmed that an obstacle needs a safe, repeatable traversal, not
crawl-speed success on every line. Heather Cut initially stalled under the
test driver's slow approach. A controlled **5 m/s** run-up passes on the
**original terrain** with both cars, both directions and analog/keyboard
steering, retaining upright, physical articulation, water and flight limits.
Temporary grading/line experiments were discarded; no accepted obstacle,
terrain, shared handling, traction or safety assertion was weakened.
The first browser batch was stopped when that clarification arrived; it is
not counted as completed coverage. The final maps were regenerated against
the restored original terrain.

**Final scoped acceptance is complete.** No full local regression for other
locations was run.

| Check | Final result |
| --- | --- |
| Focused Island Tracks/postcard units | **173 passed** on the final code; both cars and steering policies, reversible mainland/Heather/cliff-foot journeys, plus beach/discovery matrices |
| Typecheck and production build | Pass on the final code |
| Mainland/journal browser coverage | All **24 distinct cases passed across the full batch and targeted reruns**, in Chromium and WebKit; see the failure/rerun history below |
| Final targeted beach/nook and full-size-photo rerun | **4 passed**, both engines, 4.4 min |
| Final focused production/PWA rerun | **7 passed / 1 existing skip**, 1.5 min; all eight images decode offline and the secret detail opens in both engines |
| Production postcard copies | All eight accepted source JPEGs match `dist/postcards/island-tracks/` byte-for-byte |

The initial 24-case browser batch had **21 passes / 3 failures**, not a
fully green run. All twelve long mainland-circuit, Heather Cut and cliff-foot
journeys passed, including physical articulation, water/camera limits and
both Reset controls. The beach/nook drives completed safely but peaked at
66 draw calls, over the unchanged `<65` budget. Chromium's all-photo case
finished its image assertions but timed out on an incidental final screenshot.
Removed only that screenshot, retaining every full-size image/title/note and
secret assertion; the case then passed in both engines.

Profiled the actual main/shadow draw contributors during wet driving.
Disabling fine-ground-cover shadows did not fix the peak and was reverted.
Reused the existing owned vertex-color batching instead: merged the nearby
farm fence into the solid farmstead batch and the harbor trim into the
decorative roof batch. Material, sidedness, shadows, every visible/physical
triangle and all terrain/handling remain unchanged. The farm/fence now share
one trimesh collider, reducing the resident count from 29 to **28**, with
**254,056 resident triangles** unchanged. Updated current count assertions;
the earlier long-route JSON deliberately retains its pre-batching count.

The final beach/nook rerun passes in both engines at **64 calls** and
**298,664 rendered triangles** maximum, below the unchanged `<65`/`<300,000`
limits. Both engines finish all 17 beach and 12 nook points, with zero camera
obstructions, water at most 0.3001 m and upright above 0.914. The earlier twelve
long rides peak at 61 calls / 297,686 triangles; technical rides record
0.355-0.438 m contact lift, meaningful independent suspension movement and
water below 0.381 m. Reviewed actual driving-height route captures and both
final beach/nook captures, not only the maps.

Evidence: [Chromium journeys](chromium-tablet/mainland-acceptance/) and
[WebKit journeys](webkit-tablet/mainland-acceptance/), alongside the accepted
[postcards and exact saved views](postcards/) and
[trigger map](postcard-trigger-map.png). No additional framing approval remains.
WebKit offline navigation and automated two-contact touch remain existing
manual iPad Safari gaps, not passed automated checks.

**Next:** verify the normal push-to-main Pages deployment of this signed-off
build, then perform the user's later iPad check. Keep Island Tracks marked
complete; physical-device performance/offline observations are follow-up
feedback, not a reason to reopen accepted content or release other local
development worlds.

### User-framed Smuggler's Nook - 2026-11-05

Preserved the user's complete copied car/camera pose and regenerated only
Smuggler's Nook using the shared saved-view capture workflow. The exact
position, viewing direction and 48-degree FOV checks pass with the car hidden.
Inspected the actual-game image: the crates and beached skiff are framed within
the cleft, without the car or HUD. Production build/typecheck and whitespace
checks pass; its source JPEG matches
`dist/postcards/island-tracks/smugglers-nook.jpg` byte-for-byte.
No discovery zones, terrain or other photographs changed. Four postcards now
use user-supplied framing; the other four remain drafts. Next: continue with
the remaining views, then the deferred focused browser/offline checks.
No longer suites, commit or publication were performed.

### User-framed West Beach

Applied the user's complete copied West Beach pose without changing position,
target, 48-degree FOV or discovery geometry. Regenerated only its vehicle/HUD-free
postcard with the shared saved-view script and inspected the actual-game result:
the beach frames the cliff-foot shallows and coastal rocks. Production
build/typecheck pass; the JPEG matches its `dist/postcards/island-tracks/`
copy byte-for-byte. The preceding 20 postcard units and all eight source/build
image comparisons also passed. Pebble Cove, Seabird Summit and West Beach now
use user-supplied framing; the other five remain drafts. Next: continue applying
the user's remaining views, then the deferred focused browser/offline checks.
No longer suites, commit or publication were performed.

### Postcards, trigger map and user-framed Pebble Cove / Seabird Summit

Implemented the eight approved keepsakes in the existing journal: Mainland
Meadows, Needle Lighthouse, Western Beacon, West Beach, The Other Shore,
Seabird Summit, Pebble Cove and secret Smuggler's Nook. Retained shared
storage, first-discovery dates, detail images and anonymous locked-secret
presentation. Existing Northern Reach/Mars postcard definitions, Moon journal
presentation and the shared photo capture script are the references; this is
not a separate collectible or checkpoint system.

Island Tracks recognition requires real movement and grounded, upright,
shallow/dry travel. The three eastern destination cards additionally require
their runtime's ordered completed arrival. Inspection starts and Reset do not
earn those arrivals. Elevation gates prevent the cliff above Smuggler's Nook
from discovering the secret below it. The generated
[trigger map](postcard-trigger-map.png) and [zoomable SVG](postcard-trigger-map.svg)
show all main/alternate circles and explain non-spatial gates. The background
samples actual terrain and routes; it is a development reference, not a game
capture or new in-game map.

Preserved the user's supplied Pebble Cove and Seabird Summit JSON, including
car poses, in [saved views](postcards/photo-views.json). Regenerated only those
two 800 x 520, car/HUD-free JPEGs using the exact supplied camera positions,
targets and 48-degree FOVs. The shared capture now checks rendered direction
and FOV as well as position and car visibility. Inspected both actual-game
images: the cove shows the beach, pebbles and shallow bay; the summit shows the
complete beacon and sea horizon without the previous cropped lantern.
The other six photographs remain drafts for the user's framing assistance.
Sources remain `public/postcards/island-tracks/`; production build/typecheck
pass and both revised JPEGs match `dist/postcards/island-tracks/` byte-for-byte.

Earlier focused evidence: all 20 postcard units and the earned-arrival/runtime
integration case passed. The first browser batch passed seven of eight cases;
the compound Chromium image/persistence case timed out. After splitting it,
both engines passed persistence/world isolation and WebKit passed all eight
full-size photographs. Chromium reached the final journal screenshot after
the image assertions, then timed out waiting for the scrollable element to
stabilize. Changed that evidence capture to a viewport screenshot; that final
test-only change has not yet been rerun. The new offline all-image decode /
secret-detail case is also still unrun. Do not treat either as passed or claim
full browser/PWA acceptance. Longer checks remain deferred while the user
reviews framing; no game physics, deadlines or recognition assertions were
weakened.

**Next:** apply the user's remaining postcard views, then rerun the affected
Chromium image case and focused offline coverage sequentially. Broader
mainland/coastal route and iPad acceptance remain pending. Nothing has been
committed, pushed or published; the user's existing preview panel was not
navigated or reset.

### Home tile: Heather Cut view and shorter subtitle - 2026-11-05

Removed the user-rejected `Preview` prefix and separator from the home tile.
Its subtitle is now **Meadows, coves & crossings**. Updated the production
picker assertion to require that exact text and aligned the current plan
and README.

Replaced `public/locations/island-tracks.jpg` with an actual-game view from
Heather Cut toward Western Beacon. Used the existing photo-mode capture
workflow, retaining the 476 x 350 JPEG contract and existing asset path.
Selected a clear ridge view rather than a nearby angle dominated by a
foreground boulder. Preserved the full capture as
[Heather Cut toward Western Beacon](west-coast-refinement/heather-cut-western-beacon.png)
and checked the [actual home tile](west-coast-refinement/home-tile-heather-cut.png)
at its displayed size. Chromium confirms the exact subtitle and loaded image
dimensions; production build/typecheck and `git diff --check` pass.
Long browser/PWA journeys remain deferred. These presentation changes do not
complete the pending mainland/coastal acceptance or publish the local changes.

### Separate the mainland lights at its north and south tips - 2026-11-05

The user rejected clustering three lights around the western headland.
Moved the two smaller mainland beacons to naturally supported coastal
shoulders near the northern tip `(-434, -118.5)` and southern tip
`(-442, 134)`, about 12 m and 8 m above sea level. They are about 253 m
apart and each more than 150 m from Western Beacon. The larger western
landmark, Needle Lighthouse and Seabird Summit light stay unchanged.
No new land, terrain pads, route changes, named starts or lights were added.

Reference: the existing owned coastal-beacon batch and full-footprint
support/sightline checks. Adapted the sea-facing ray to north or south for
these sites, rather than assuming every mainland light faces west.
Regression checks now require opposite mainland extremities, separation
from the larger western light, and full-footing clearance outside the
broad circuit. Both retain the existing less-than-0.3 m support variation.

Eight selected unit checks pass, covering the light placement/physical
landmarks, terrain/resources, arrival and existing both-car crossing journeys.
Production build/typecheck and `git diff --check` pass. Actual Chromium
iPad-emulation driving and seaward captures show both grounded beacons
with clear outward horizons. Driving samples have four contacts, dry
ground, unobstructed cameras and no page errors; sampled maximum is
281,406 rendered triangles / 41 calls. Resident resources remain
254,056 triangles / 29 colliders. Evidence:
[tip views and distribution](mainland-tip-beacons/),
[samples](mainland-tip-beacons/preview-samples.json).

**Next: the user's local preview review.** Longer mainland/coastal acceptance,
WebKit and PWA checks remain deferred as recorded below. The local server
stays running; nothing has been committed, pushed or published.

### Coastal refinement, high lights and mainland-first arrival - 2026-11-05

The user rejected the low shore beacons and brick-course watchtower, supplied
a driving-height screenshot showing the water shelf's straight edge, and
authorized the hidden discovery. They also requested a light on the other
islet's highest plateau, a mainland-facing start, a new tile subtitle and a
much shorter arrival toast.

**Local preview changes:**

- Replaced the ruin with a continuous tapered **Western Beacon**, about
  10 m high, versus Needle Lighthouse's roughly 20 m. No separated masonry,
  slit-like course gaps or floating broken blocks. The entry is `west-beacon`,
  replacing the experimental `watchtower` entry.
- Moved the two small lights onto exposed approximately 22 m headlands.
  Added a third on the 67 m Seabird Summit shoulder, outside its accepted
  approach and turning envelope. Supported each complete footing and checked
  a clear near-coast seaward ray, not elevation alone. Static emissive lanterns
  share one owned batch; no new point lights, flashing logic or moving beam.
- Curved the cliff-foot bed, varied its width and cliff edge, added irregular
  outer shallow pockets and seven larger rigid outcrops around the three ribs.
  The ordinary mainland circuit remains a broad dry bypass. West Beach retains
  its own shallow turning basin and now has a more gradual dry return.
- Built **Smuggler's Nook** as a recessed open-top rock cleft with a dry turning
  area, small beached skiff, cargo crates and worn mooring post. Offset its
  approach behind flanking boulders. No named entry, map marker, collectible,
  tide timer or extra recovery checkpoint. It is not a new roofed tunnel.
- Retained the proven Harbor Cove spawn pad, but turned normal arrival and
  named Harbor Cove toward the grassy circuit, away from the other islet.
  Ordinary Reset agrees; an entered challenge still owns its own departure.
  The tile reads **Preview · Meadows, coves & crossings**, with the welcome
  **Take the long way round**. The arrival toast is now only **Explore the
  mainland first. Pale water is shallow; dark blue is deep.**

References: the existing continuous Needle Lighthouse mesh, owned scenery
batching, rigid coastal rocks, exact mixed-resolution bed and fitted water,
Pebble Cove's full-footprint wet play, and current physical/recovery helpers.
Extracted the original Harbor skiff geometry unchanged into a reusable helper
for the smaller discovery boat. The hidden place uses the terrain itself for
its enclosure, avoiding another roof without a matching shade/lifecycle design.
The only eastern terrain adjustment is the small summit-light footing;
accepted climb coordinates, endpoints and shared handling remain unchanged.

**Corrections during this preview:** cubic bed interpolation overshot below its
wet control points, so clamp the sampled bed to -0.34 m before mesh generation.
Reworked the basin's abrupt shoreline blend rather than changing wet traction.
Adapted turning paths that had asked the automatic driver for an impossible
short U-turn, without weakening upright/depth/contact limits. Reduced the
western beacon's footing to its actual footprint so its plateau did not steepen
the approach; enlarged the summit footing locally to remove its overhang.
Actual-game captures exposed a detached-looking boulder high on the nook wall;
removed it and refreshed the nook images, rather than accepting a numerical
grounding check as sufficient.

**Preview evidence only:** typecheck/production build and `git diff --check`
pass. The initial focused 13-case batch passed 12 and found the approach-slope
issue above. After corrections, the six selected coast checks all pass, including
high-site support/sightlines, full-width shelf/turning support, recovery
separation, and real classic-car wet-loop/dry-return and discovery entry/exit.
After the final wall-boulder removal, the discovery real-driving check passes
again with explicit wet travel and dry arrival. Existing targeted resource,
entry, easy-mainland, seam and landmark ray checks passed in the earlier focused
batch; this is **not a full unit-suite result**.

Chromium/iPad-emulation actual-game captures confirm the changed home tile,
westward ordinary-keyboard departure on dry ground, short two-line toast,
western and summit lights, the user's water-trail angle and the hidden cleft.
All sampled driving views have four contacts and no obstructed camera or page
errors. The first fixed-duration departure capture was inconclusive under
rendering load; the final capture waits for actual westward displacement.
Final resources are **254,056 resident triangles / 29 colliders**, within
unchanged budgets. Across the ten-view capture before removal of the final
36-triangle boulder, the observed maximum was **295,212 rendered triangles /
63 calls**. These are sample peaks with little headroom, not completed route
peaks or physical-iPad performance acceptance.

Evidence: [capture samples](west-coast-refinement/preview-samples.json),
[final nook sample](west-coast-refinement/final-nook-sample.json), and actual
game images in [west-coast-refinement](west-coast-refinement/). Preserved the
[user's original screenshot](west-coast-refinement/user-linear-water-feedback.png).
The main capture JSON precedes the final wall-boulder removal; the final nook
JSON and refreshed nook images record the current build.

**Next: user visual/driving review on the still-running local server.** Hold
longer checks until that peek. The complete revised water challenge and Heather
Cut remain unaccepted: both cars, both directions, steering policies, full
camera/route/render peaks and both browser engines remain pending. The changed
home copy/arrival still needs the focused production/PWA scenario before
publication; no PWA/browser marathon was run during this preview. Nothing has
been committed, pushed or published.

### Western coast first pass: paused for an immediate look - 2026-11-05

The user chose a ruined western stone watchtower, an accessible beach/wade
area and an optional challenging cliff-foot water ride, while retaining the
grassy mainland. They then rejected the benches and suggested smaller beacons.
Both benches and the dedicated western bench pad are removed. Two small,
static coastal beacons stand near the beach and northern water-trail ends.

Implemented locally: the tower's broken stone courses, real doorway/window
gaps and fallen blocks; a coastal headland; dry approaches from the existing
mainland circuit; West Beach and a separate shallow turning basin; and a
cliff-foot water line with three matching physical ribs and resting rocks.
Added `watchtower`, `west-beach` and `north-cove` entries. The water ride has
bidirectional ordered attempts; dry mid-route rocks do not establish recovery.
Both ends have easy mainland access, so this is optional traversal rather
than an exclusively earned destination. No shared handling or world-bound
changes, commits, pushes or publication.

References inspected: existing tidal fitted water, exact coarse terrain,
Pebble Cove's full-footprint shallow-water lesson, physical step generation,
batched solid scenery and Heather Cut's optional-ride recovery. Adaptation:
reuse the existing resident mesh for the western shelf and cliff, and keep
easy wet play south of the distinct northbound challenge departure. The world
still loads its entire 860 x 400 m terrain, water and colliders together; it
does not stream. Further large expansion should consider the established
Northern/Mars chunked runtimes rather than assuming resident size is unlimited.

**Limited checks before the latest pause:** typecheck and production build
passed before the final basin correction. A short nine-case selection passed
six existing terrain/resource/entry/seam/bypass checks and failed three new
coastal checks. The measured pre-correction cost was 254,645 resident triangles
and 27 colliders, under unchanged budgets; final view peaks are not established.
The wet shelf was too small for a real full-lock turn, and its upper edge was
not yet uniformly submerged. Enlarged and explicitly graded the turning basin.
The unordered-exit test also incorrectly assumed a freely accessible mainland
destination required a completed water ride; it now starts an actual attempt
before checking that an unordered arrival cannot complete it. These corrections
have **not been rerun**. The cliff-foot depth assertions following the failed
basin assertion, complete both-car water drives and visual quality remain
unverified. Do not claim the new water challenge passes.

The user explicitly repeated: **"Again: let me check briefly before running
longer tests"**. Stopped validation and opened the existing Browser panel at
the watchtower. Port 5173 was responsive immediately before this pause.
Next: wait for their brief inspection and feedback; then address feedback and
rerun the short coastal checks before any longer acceptance work. Preserve the
earlier second-mainland preview evidence rather than presenting it as new coast
evidence. The requested live preview server remains running.

Proposed hidden discovery: **Smuggler's Nook**, a concealed dry cliff alcove
with old boat remnants and a sheltered sea view. This is only an idea, not an
implemented feature or newly approved scope.

### Second mainland expansion: early look before long checks - 2026-11-05

After liking the first expansion, the user requested another 2–3x land area
and more details, explicitly selecting growth relative to the **current**
42,788 square metres. They then requested a peek once the land was stable,
before all checks, and added a difficult ride that must not damage the
mainland's relaxed character.

**Early local implementation:** 114,508 square metres of dry western land on
the same 2 m measurement lattice, **2.676x** the first expansion and **7.790x**
the original. New loaded bounds are X=-660..200, Z=-200..200. An **809 m**
easy mainland circuit surrounds broad grass, a 52 m radius prop-free meadow,
a small cream farmstead with fence and bench, a sheltered grove, wildflowers
and a coastal seat. The first lighthouse circuit and optional Whale's Back
remain in place; no eastern route coordinates or shared handling were changed.

**Heather Cut** is an optional **149 m** rocky shoulder ride with four solid
offset steps, a 26 m upper section and whole-ride ordered retry. The coastal
circuit bypasses it. Added `heather-cut` and `west-overlook` entries; both are
safe home destinations during free roaming. Their departure areas extend 12 m
before attempt detection, preventing the nearby easy bypass from accidentally
starting the hard ride. This is a first pass, **not an accepted difficult ride**.

References: the existing tidal exact Float32 bed, fitted ocean, first home
circuit, wind-bent trees, grounded solid landmarks and owned scenery batching;
existing crossing/cliff physical-step geometry and ordered retry tests.
Adaptation: preserve the 2 m original terrain patch and use 4 m new western
rolling land, splitting coarse seam triangles at each fine-grid vertex.
Height queries use exactly those split triangles. All technical world meshes,
water and collision remain one owned bounded runtime; no generic streaming
or shared-physics change was introduced.

**Preview-only checks:** production build/typecheck pass; six short geometry,
water, pad, resource, seam and attempt/bypass checks pass. Exhaustive terrain
triangle-centre comparison measured maximum height disagreement below 1e-12.
Resident resources are **251,799 triangles / 24 colliders**, under unchanged
280,000 resident ceiling. A short classic-car grass drive has four contacts,
no water and no browser errors. Captured classic views measure 282,104
triangles / 42 calls in the meadow and 290,864 / 53 at Heather Cut.
These are samples, not verified journey peaks.

The first resource smoke check caught grove/flower loops incorrectly nested
inside per-site scatter, duplicating geometry. Moved them outside; final six
smoke checks pass without raising any limit. New named pads have an 8 m flat
core to support the interpolated wheel footprint on the coarser mesh.

Inspected actual-game grass driving, the farmstead, Heather Cut's departure
and the wider island/sea balance. Evidence is in
[mainland-preview](mainland-preview/preview-smoke.json), with driving-height
and overhead captures. The running local server remains on port 5173 for the
user's requested early look; the Browser panel is an additional preview.

**Paused for user review, as requested.** Do not run the long suites before
their peek. Next: incorporate their landscape/detail/ride feedback, then
validate both cars/directions/steering policies on the new circuit and hard
ride, full-footprint landmark grounding and clearance, protected old-terrain
comparison, recovery, both browser engines and actual peak render budgets.
Existing first-pass acceptance does not carry forward to this larger build.
No new commit, push or publication has been performed.

### Larger grassy home island and a relaxed lighthouse circuit - 2026-11-05

The user tested the published preview on a physical iPad and reported **"all
good"**. This accepts the previous build as reviewed; it is not evidence that
the new expansion has already been tested on-device, nor a set of separately
measured touch/offline/thermal results.

They observed that the formerly small eastern islet had become large and
rocky enough to dominate the starting island. They authorized proceeding with
the retained Harbor Meadow, Whale's Back and Needle Lighthouse ideas, then
selected **2–3 times the former home-island land area, mainly westward**.
They explicitly reaffirmed that not every region must be difficult: cruising
wide grassy hills is an enjoyable alternative in its own right.

**Implemented:** a 574 m reversible, broadly supported home circuit from the
unchanged Harbor Cove start through rolling grass to Needle Lighthouse and
back. The 147 m Whale's Back line climbs a rounded 28 m bedrock crest; the easy
main circuit bypasses it. A reserved grassy meadow supports off-road driving
and turns. The existing boathouse stays, with a matching solid beached skiff
outside both approaches. A cream/red lighthouse and dark lantern stand on a
16 m headland with room to circle outside the solid tower. No new handling,
moving beacon, missions or persistent progression is introduced.

Relaxed home roaming accepts actual grounded visits to the harbor, crest and
lighthouse pad as safe Reset destinations, without ordered circuit gates.
Crossing and eastern challenge attempts keep their ordered whole-journey
rules; home roaming cannot earn Saltgrass Landing or complete an active
crossing out of order. Added `whales-back` and `needle-lighthouse` inspection
starts without changing the existing eight entries.

**References and adaptation:** read the historical region ideas alongside the
current build plan, guide, tidal terrain/scenery/runtime and real-drive tests.
Retained exact Float32 sampled terrain, terrain-fitted water, grounded rigid
scenery, batched matching colliders and owned disposal. Extended only western
grid columns into a **560 x 400 m** rectangle, X=-360..200 and Z=-200..200,
with the same 2 m spacing. Parameterized the shared water helper's ocean-apron
bounds while preserving its existing square default for other worlds. The
apron must not overlay the new western land.

The same 2 m western sample measures **14,700 -> 42,788 square metres (2.91x)**.
All protected eastern/crossing height samples from X=-108..190 and
Z=-190..190 remain exactly unchanged. Current resident cost is **210,853
triangles / 21 colliders**, within the existing budgets. The lighthouse and
skiff add two owned collider batches over the previous nineteen colliders.
See [layout measurements](home-island-layout.json).

**Corrections during development:** the first return approach grazed the
boathouse corner and trapped both cars, despite passing the outward drive;
rerouted the broad approach around the building instead of changing handling.
The optional ridge's grading initially pinched one outer edge of the easy
lane; reapplied its broad supported core after the ridge blend. Reserved a
full-footprint lighthouse turning apron, excluded nearby vegetation and kept
the skiff above dry ground. The open skiff shell renders both sides to agree
with its matching physical triangles. Landmark downward-ray checks use
exposed upward-facing faces, avoiding ambiguous rays exactly along a vertical
gallery edge.

**Final verification:**

- `npm run typecheck` and `npm run build` pass.
- `node --import tsx --test tests/tidal-tracks.test.ts tests/static-sunlight.test.ts`:
  **119 pass, no skips**. Includes both cars, both directions, keyboard and
  analog steering on the new circuit/ridge; off-road meadow and lighthouse
  turns; exact terrain/water/landmark agreement; recovery ordering, lifecycle
  and existing crossing/cliff/cove driving regressions.
- Six affected browser cases pass across Chromium and WebKit, in two
  sequential batches: home circuit and optional ridge in modern-forward and
  classic-reverse journeys; all ten named entries, Reset and world switching;
  off-road grass turns, lighthouse circles and both Reset controls. The
  circuit reaches all 17 points, the ridge all seven and the apron all 13;
  no wet travel or obstructed camera frames. Peak across the two-car journeys:
  **57 calls / 255,497 rendered triangles**, below unchanged 65 / 300,000
  ceilings. Worst minimum upright component is **0.861**, on the optional
  ridge; the main circuit stays above **0.965**.
- Focused production/PWA spec: **5 pass, 1 known WebKit offline-reload skip**.
  Normal home selection and all three tested regional links (Pebble Cove,
  Whale's Back, Needle Lighthouse) retain the requested Earth car in both
  engines. Chromium reload and travel offline pass with the cached tile.
  Browser and PWA batches ran sequentially.

A superseded browser batch was stopped after the final apron refinement; it
is not counted as a completed run. The first focused unit batches found stale
collider expectations and a skiff ray/render discrepancy; those were corrected
before the final 119/119 run. Full unrelated unit/browser/PWA suites and the
long eastern browser course marathons were not repeated for this western
iteration. WebKit automated two-contact touch and offline-reload gaps remain
manual iPad checks, not passes.

Inspected actual-game driving captures in both engines, including the open
grass field, both-car circuit/lighthouse approaches and the close tower turn,
alongside the overhead and across-the-crossing balance views. The new island
reads as lower, broader grassland with clear space off the painted circuit;
the rocky eastern island remains the taller dramatic destination. The skiff
is dry, the lighthouse door is clear and the solid tower does not block the
circuit or circling space. Capture sets and measured journeys:
[Chromium](chromium-tablet/home-island-driving-evidence.json),
[WebKit](webkit-tablet/home-island-driving-evidence.json),
[Chromium grass/apron](chromium-tablet/home-roaming-evidence.json),
[WebKit grass/apron](webkit-tablet/home-roaming-evidence.json).
Existing entry/view evidence was refreshed for the enlarged world; user
feedback images remain preserved.

**Next:** user review of the enlarged island's visual balance and relaxed
driving, then publish only when requested and repeat physical-iPad acceptance
for this expansion. No known failing focused checks remain. This revision
has not been committed or pushed; previous iPad acceptance applies only to
the pre-expansion build.

### Published preview for later iPad review - 2026-11-04

The user requested pushing the accepted work, then explicitly authorized
including Island Tracks in the existing GitHub Pages game. They regard this
site as the development preview, not a finished public launch, and will test
on the iPad later. The accepted gameplay/scenery commits were pushed first.
This publication supersedes internal-only availability without claiming
physical-device or whole-world release acceptance.

Reused the normal Moon home-tile/direct-entry/PWA technique: one Island Tracks
tile in the main picker, labelled Preview, canonical area validation in
production, existing Earth car selection, regional links and offline caching.
Removed its duplicate local Development entry; unfinished Iceland, comparison
demos and traction tools remain excluded from published selection/direct entry.
No terrain, physics, recovery, camera or scenery changes are included.

The tile uses a new unaltered actual-game photo-mode capture of the basalt
crossing, pale channels and both grassy shores, resized to the existing
476 x 350 JPEG format. Photo view requests `(5, 40, 100)` looking at
`(5, 16, -20)` with 95-degree FOV and uses the existing 100 m camera-distance
limit; UI and car are hidden. The original source is session-local;
the shipped image is `public/locations/island-tracks.jpg`.

Updated home-menu/canonical-entry regressions and replaced the production
exclusion scenario with preview selection, regional-entry and offline-travel
coverage. Retained the WebKit offline-navigation limitation as an explicit
skip, not a pass. Typecheck passed before the final thumbnail/documentation
updates. The focused unit run was interrupted; the user then reported that all
tests had just run in a separate session and directed us not to rerun them.
No local full-suite result is claimed for this publication change.

Next: open the published preview on the iPad, accept **Update game** when
offered, and review sustained performance, simultaneous steering/throttle,
cave-camera feel, Cove uphill retry ownership and offline play. Do not mark
these manual checks complete merely because the preview is online.

### Cove visual feedback, permanent shade and uphill departure - 2026-11-04

The user reported a tree growing from an unnatural cliff, an orphaned track
shadow, a wind vane stranded on a slope and a cave skirt protruding as a shelf.
Preserved the four original images in [feedback-2026-11-04](feedback-2026-11-04/).
They explicitly requested the permanent, precalculated Moon/Mars cave shadows.
They also reported Reset returning to Windward after falling about two-thirds
through an uphill drive begun at Pebble Cove.

**Corrections and references:** retained the accepted exact lower floor,
normal handling, five physical steps, headland isolation and shallow play.
Reused the existing rigid-boulder grounding and full-footprint placement
techniques: reject steep vegetation sites, ground each tree from its root
footprint and keep detached rocks rigid instead of stretching them onto
cliffs. The existing mast and vane now stand at measured flat `(149, -49)`,
with rigid lookout stones beside them. No replacement landmark is introduced.

The Quarry-derived closed roof now fades into buried ground outside its usable
opening. Finer geometry follows the actual terrain; skirt-face centres and
edge midpoints must remain buried, rather than only the original vertices.
The first coarse revision failed that check at a sharp terrain transition;
kept the assertion and corrected the geometry instead of hiding the shelf.
Central driving/camera clearance and open approaches remain protected.

Reused `StaticSunlight` unchanged from Moon/Mars, with the actual owned cave
triangles and the matching Earth sunlight direction. Its **184 x 204 RGBA atlas
uses about 147 KiB** and is generated once, not as the car enters. Terrain,
scenery and swapped vehicles receive the shader; disposal restores material
hooks and releases the texture. Removed redundant dynamic roof casting and
enabled terrain casting so buried props cannot cast through a non-occluding
hill. This is a local fixed-roof bake, not a whole-world static-shadow system.

**Recovery root cause reproduced:** a complete ordered descent onto the safe
pad at `(137, 68)`, without visiting its centre, retained Windward. The dry pad
has a 12 m radius but its old arrival/resting tolerance was only 4.5 m.
Aligning only Cove's final gate and resting area with its 12 m pad makes that
regression pass and retains Cove through the partial uphill return. This is
consistent with the reported path, not proof of the user's exact trajectory.
Other rides' gates, final-obstacle ordering, physical-visit eligibility and
strict whole-challenge policy are unchanged.

**Current evidence:** typecheck, production build and **96 focused units pass**
(91 Island Tracks and five static-sunlight tests). Both cars still complete
the crossing, Seabird, Cove in both directions and shallow-water play with
analog/digital steering. The new atlas agrees with actual roof rays, including
171 shaded and 545 open samples; existing Moon/Mars coverage also passes.
The earlier pre-correction unit process was cancelled as obsolete; the current
complete run is recorded separately, not counted as that run finishing.

All **eight visual/browser cases pass across Chromium and WebKit**: permanent
floor shade with the car outside and the dynamic map near, distant and
disabled; the reported cliff/tree view; shortcut blocking and headland views;
both cave-mouth driving views and camera orbits. The first visual run had one
tree-count failure after an overly strict placement filter removed every tree;
corrected the supported-site filter and retained the resource assertions.
Resident cost is **157,596 triangles / 19 colliders**. Physical-iPad performance
remains unverified.

**Final browser evidence:** all **14 distinct affected cases pass** across both
engines, including the full descent to an off-centre Cove arrival and complete
return. Chromium actually earns Cove at `(136.67, 67.04)`, more than 10 m from
the centre, before R returns to the centre. The separate uphill regression
drives from the outer pad to about two-thirds of the return, drops the car
into the sea and verifies both button Reset and R return to Cove. It does not
replay the user's exact accidental wheel departure. Retained actual driving,
before-fall and both-reset captures plus JSON for each engine.

Inspected the corrected above-ground mast, both cave joins and reported
cliff/track views. The mast stands on the level shoulder, the blade-like
detached rocks and cliff vegetation are gone, and the skirt no longer
protrudes as the reported horizontal shelf. The track capture places the car
nearby and enables live shadows, rather than relying on a distant shadow map
or reduced graphics to hide an orphan shadow; that final capture case was
rerun in both engines. The exterior remains stylized rock, subject to the
user's visual judgment, not a claim of final landscape acceptance.

The user accepted these fixes on 2026-11-04 and requested a commit. This accepts
the reported visual/recovery corrections, not a public release or unrelated
extension. Physical-iPad performance/touch/offline acceptance remains manual;
the world is still internal. No push is authorized.
PWA/startup/storage and unrelated full suites were not rerun for these local
scene/recovery changes; the previous production/PWA result below is historical.

### Physical cove isolation, integrated roof and remote-main physics - 2026-11-04

The user authorized fixing the bypass and asked to rebase onto remote main's
physics improvements. Rebased the local documentation commit onto `ddc839b`
(`dab99db` is the rewritten documentation commit), then restored all uncommitted
Island Tracks work. Kept the remote per-wheel traction/contact-driven effects,
nested Development menu, traction lab and optional-demo/Iceland test scope.
The six shared physics/effects implementation files remain identical to remote
main. No new gameplay commit or push; the named pre-rebase stash is retained
as a recovery backup, not pending work to apply again.

A real coastal headland now closes the reported Saltgrass-to-cove dry corridor.
Its inland arm separates the lower ravine from the mainland; broad overlapping
rock outcrops support the cave rather than leaving a narrow ridge topped by an
obvious cap. Roof width and mouth lips vary asymmetrically, its edges are buried,
and its crown shares the headland height, rock palette and crown-normal field.
The collision uses those actual visible vertices. Preserved the existing route
coordinates and driving floor, open approaches, dry cove, shallow-water play
area, ordered arrivals and normal handling.

**References and adaptation:** reused the current exact tidal terrain sampler,
resident terrain/solid ownership and existing solid-step drive tests. Retained
the Quarry-derived closed separate roof over a lower driving bed, but replaced
its regular external treatment with the surrounding outcrop profile. Used the
accepted full return drive's 2.5 m/s controlled approach for the isolated uphill
Resting shelf exit rib: the new traction model stalls the old 2.2 m/s straight
crawl there. The stone and shared handling are unchanged, as are articulation,
support, upright, water and airborne assertions. Other reverse stone checks
retain their original slow pace.

**Current evidence:** typecheck, production build and **163 focused units pass**
(88 Island Tracks plus shared physics, traction, recovery, navigation, surfaces
and vehicle selection). New real-car
attempts cover direct, western-shore and lower-cave shortcuts with both cars.
A separate bounded 2 m slope/depth connectivity search cannot reach the cove
from the landing without entering the descent. This is supplementary geography
coverage, not a substitute for real-car evidence or proof against every stunt.

The four Chromium/WebKit shortcut/visual/cave-camera cases pass. Inspected
actual overhead and oblique views, both driving mouths, cave interior and
the blocked landing approach. The roof is materially less regular and blends
into the broader headland; user judgment of the remaining stylized cliff
silhouette is still pending. Current resident cost is **156,464 triangles /
19 colliders**, within the existing budgets. Both browser shortcut attempts
stop near `(115, 27)`, well before the cove, with Saltgrass recovery retained.

**Final browser result:** all **14 distinct affected cases pass** across
Chromium and WebKit, covering menu/entry/reset/switching, earned-shore recovery,
Seabird both ways, Cove both ways, wet play/return, shortcut blocking and
overhead/driving/cave-camera views. This is coverage across the initial run and
isolated reruns, not a claim that the long batch passed uninterrupted.

The long ten-case batch had seven passes and three failures. Chromium's
earned-shore drive stalled at the landing rib near `(89.8, -2.2)`; the same
isolated scenario then passed on both an archived, unmodified `origin/main`
(5.5 minutes) and the local checkout (4.4 minutes), without behavior or
assertion changes. Later, WebKit lost its graphics context during the Cove
drive, followed by disk-write exhaustion during failure reporting; its trace
zip is incomplete. With storage available again, both isolated WebKit Cove
drive/return and wet-play cases passed (3.3 minutes combined). Retained the
original crossing trace, WebKit error capture, comparison and rerun logs in
the session artifacts. Do not silently erase the intermittent failure history
or retune shared handling to make a single automated approach succeed.

The subsequent sequential full production/PWA run passes **32 cases**, with
**four existing WebKit offline skips**. Production exclusion, installation,
cache/update and supported offline scenarios pass. Skips are not passes;
physical-iPad Safari offline/touch acceptance remains manual. Unrelated full
unit/browser and optional comparison/Iceland suites were not rerun.

Evidence: `chromium-tablet/pebble-headland-above.png`,
`pebble-headland-oblique.png`, `pebble-rock-roof-above.png`,
`pebble-shortcut-blocked.png`, `pebble-shortcut-evidence.json`, cave driving
views and `pebble-camera-evidence.json`, with matching WebKit captures.
The temporary baseline comparison never switches or resets the user checkout.

Next: user review of the full
Windward-to-cove drive, the naturalness of the headland/roof from above and the
now-blocked direct landing approach. Physical-iPad performance, simultaneous
touch and offline acceptance remain manual; this is still an internal world.

### Driving feedback: artificial cave and unearned cove access - 2026-11-03

The user finds the drive nice, but the cave looks too regular/man-made,
especially from above. Its solid roof already exists; the straight,
constant-width footprint and repeated arch are not a finished natural-rock
exterior. Any refinement must preserve the accepted floor, daylight and
camera clearance while integrating the enclosure into the surrounding rock.

The user also reports direct driving access from the far-island landing to
Pebble Cove, bypassing the lookout/descent. Inspection confirms a continuous
dry terrain corridor from Saltgrass Landing `(110, 8)` to the cove `(126, 66)`,
with sampled heights about 4-7.6 m. This inspection is not a new driven test,
but corroborates the user's actual drive. Ordered recovery prevents an
unearned checkpoint; it does not prevent physical access to the reward.
The earned-cove geography contract is therefore **not met**.

No terrain or gameplay change is made in this feedback investigation.
The next design correction should address physical access and cave
integration together using visible, collision-matched coastal landforms,
not invisible walls or merely stricter progress tracking. Preserve the cove,
its shallows and the driving line the user enjoys. Validate the reported
landing-to-cove shortcut as well as the intended route and actual overhead/
driving views before claiming the cove is an earned destination.

### Pebble Cove shallow-water play area - 2026-11-03

The user said **"Pebble cove itself is great"** and requested a small shallow
area to drive in the water. Their full-challenge feedback will follow later;
this is acceptance of the cove, not the whole descent/return.

Added a local submerged shelf beyond the existing dry arrival, reached by a
gradual beach ramp. Its bed is 32 cm below the unchanged sea level, with a
verified 20 m by 10 m flat wet core and extra whole-car turning clearance.
Pale fitted water shows the shallow area; the surrounding dark sea remains
deep. Kept the dry pad, cave/challenge route, normal handling, earned-arrival
rules and strict retry behavior unchanged. No new start, checkpoint, saved
progression, public release, commit or push.

**Reference and adaptation:** read the existing `TIDAL_CHANNELS` profiles,
exact heightfield/fitted-water generation, wet-channel unit drives and browser
water checks. Reused the same terrain/collision/colour/depth-aware sea pipeline
and normal per-wheel wet handling, adapting a crossing channel into a compact
shore-connected play shelf. No new mesh/collider lifecycle is introduced;
resident resources remain owned and disposed by the current runtime.

The first shelf supported the path's centre but not all wheels during a
full-lock turn near the edge. Widened its flat support to cover that physical
footprint rather than changing handling, tightening waypoint precision or
relaxing wet-depth assertions.

**Evidence:** typecheck, production build and all **81 Island Tracks units
pass**, including both cars with analog and keyboard steering around the
water loop and back onto dry land. Existing crossing, both Cove directions,
dry turning pads, recovery, cave and exact fitted-water checks also pass.
All **four affected browser cases pass** across Chromium and WebKit: real
keyboard wet loop/dry return/Reset, current driving views and cave orbits.
Inspected actual wet-driving captures in both engines and the dry return.
Browser maximum wet depth was 0.32-0.345 m, with zero obstructed-camera frames,
at most 49 draw calls / 192,510 rendered triangles. Current resident cost is
**156,882 triangles / 19 colliders**.

Evidence: `chromium-tablet/pebble-shallows-driving.png`,
`pebble-shallows-dry-return.png` and `pebble-shallows-evidence.json`, with the
same set under `webkit-tablet/`. Unrelated full suites and production/PWA
were not rerun for this local terrain change; the preceding production/PWA
result remains historical. Physical-iPad Safari gates remain manual.

Next: drive down the beach into the pale water from
[Pebble Cove](http://127.0.0.1:5173/?area=island-tracks&start=pebble-cove);
await the user's later feedback on the full challenge without redesigning it
in the meantime.

### Pebble Cove and one canonical Island Tracks world - 2026-11-03

The user authorized **"Let's do Pebble Cove"**, then requested one world called
**Island Tracks**, accessed through `?area=island-tracks`, without intermediate
variants. The current runtime now owns that ID and one picker entry. Removed
the old causeway comparison's terrain, landmarks, configuration and executable
scenarios; `tidal-islands` is no longer an accepted ID or picker choice. The
other four comparison pilots, tropical Island and historical captures remain.
Production exclusion remains in force. Current URLs:

- [Harbor Cove](http://127.0.0.1:5173/?area=island-tracks)
- [Windward junction](http://127.0.0.1:5173/?area=island-tracks&start=windward-lookout)
- [Pebble Cove return](http://127.0.0.1:5173/?area=island-tracks&start=pebble-cove)

**Implementation:** a 192.51 m eastern branch from the 30 m lookout descends
26 m to a dry 4 m cove. It includes offset basalt steps, an inland ravine wall,
a supported resting shelf, a 25.46 m dry daylight cave and a pebble shore with
a level turning pad and fitted sea. Five real crossable stones provide tactile
wheel-line choices. Both mouths are open; the car, spawn, surfaces and
altimeter use the lower heightfield, while a separately matched roof supplies
stacked collision. The existing sphere-swept camera handles the enclosure
without changing shared camera/handling code or lifting it through the roof.

**References and adaptation:** read the accepted tidal terrain/scenery/runtime
and their real-driving/retry tests, plus Quarry's `quarryTunnelGeometry` and
Deep Cut floor/roof/open-mouth tests before implementation. Built and proved
the bare reversible floor with both cars and both analog/digital steering
before adding the roof. Transferred the quarry's closed roof skin, buried
edges, exact collision and light-readable interior, not its industrial theme,
scale or local-righting policy. All added meshes/colliders use the resident
runtime's deterministic ownership and disposal.

The cove journey is one full challenge in each direction. Reset from the
ravine, shelf or cave retries the actual departure; ordered arrival beyond
the last threshold earns the cove, and returning retries from there. A real
drive exposed overlapping entry tolerances immediately outside the lookout:
the first matching ride could capture the new route as Seabird. Select the
closest eligible outgoing segment, then pin ordered progress to it. Backing
up, visiting the other branch or falling to an endpoint cannot skip a ride.
The existing crossing, shore completion and Seabird geography are unchanged.

**Corrections during development:** expanded the cove's flat core to include
the 2 m grid's interpolated edge around the turning footprint. Replaced an
incorrect fixed-Y cave camera assertion with actual ceiling-relative raycasts
at the camera position. Early captures showed a grassy arrival; added a
pebble-coloured shore and fitted shallow shelf. Conforming each vertex of a
new shoulder boulder to a steep bank stretched it into an oversized blade;
keep these stones rigid and embed them from the sampled footprint instead.
Crossable low slabs retain their established bed-conforming technique.

**Evidence:** typecheck, production build and **191 focused units pass**
(Island Tracks, the four comparisons, shared physics and recovery). This
includes both cars/both directions/both steering policies, all five new
individual stone crossings, real cove turning circles, exact roof render/
collision agreement, open mouths, lower-level queries, route isolation,
ordered recovery and complete accepted crossing/Seabird drives. All **14 affected
browser scenarios pass**, seven each in Chromium and WebKit: connected
crossing/Seabird journeys, both Cove directions with real keyboard controls,
strict retries, earned shores, above-water falls, named entries, world
switching, canonical-ID selection and ceiling-relative cave camera orbits.
Inspected final actual driving-height ravine, cave and cove captures in both
engines after the shoulder-grounding refinement.

The subsequent full production/PWA run reports **32 passed / 4 skipped**.
Both engines exclude Island Tracks from production selection/direct entry.
The four existing WebKit offline-keepsake/worker/reload skips remain manual
gaps, not passes. Browser and PWA suites ran sequentially. Unrelated full
unit/browser suites were not rerun.

Current resident cost is **156,738 triangles / 19 colliders**, versus
155,884 / 15 before the extension. The four added solid batches own the
ravine steps, cave, shoulder boulders and cove pebbles; resource limits are
unchanged. No world enlargement, vehicle/handling changes, missions, saved
progression, public release, commit or push is included.

Both engines completed the Cove descent and return with zero wet contact and
zero obstructed-camera frames; observed peaks were 47 draw calls and 190,058
rendered triangles, within the unchanged budgets. Final views and measurements
are saved in the Chromium/WebKit `pebble-*.png` and `pebble-*-evidence.json`
artifacts alongside refreshed accepted-route regressions.

Next: user driving review from Windward Lookout along the eastern branch,
descending the ravine and daylight cave, turning at Pebble Cove and climbing
back to the lookout. Physical-iPad Safari performance, simultaneous touch and
offline acceptance remain manual; the world stays internal.

### World documentation layout - 2026-11-03

The user chose to keep all world plans and progress under `artifacts/<world>/`,
using `BUILD_PLAN.md` and `PROGRESS.md` beside design records and evidence.
Moved this world's existing implementation history out of the mixed
[comparison log](../../LOCATION_DEMOS.md), without dropping its earlier entries
or images. The Pebble Cove proposal and accepted driving contracts are
unchanged; no game code, new ride, commit, push or release is included.

### Island Tracks plan revision and recommended next ride - 2026-11-03

Reviewed the current terrain, scenery, six directional challenge definitions,
shore/camera browser regressions and recorded feedback before revising the
plan. Both demanding rides have the user's positive driving/visual acceptance;
the sea crossing is the design reference, not merely a prototype to replace.
The corrected shore Reset and above-water camera have automated evidence, but
their subjective feel and physical-iPad acceptance are not newly claimed.

Added a dedicated [Island Tracks build plan](BUILD_PLAN.md)
instead of extending the obsolete easy-causeway region list or the unrelated
tropical Island plan. It separates the three implemented bidirectional legs,
whole-challenge retry/earned-arrival contracts, existing evidence and open
release gates from proposed work. Updated the idea index, README and shared
guide links; Seabird Climb is implemented, not the "next" unbuilt ride.
The earlier "retry to Windward after crossing" and intermediate-shelf policies
below are historical, superseded by Saltgrass shore completion and strict
whole-challenge retries. Recovery remains runtime-local, not saved progression.

Recommended next: **Pebble Cove Descent**, a branch from Windward Lookout down
a boulder ravine through a short, dry, daylight-lit basalt cave to a sheltered
coastal arrival. The purpose is a new driving rhythm - controlled descent,
wheel-line choices, enclosure and a sea reveal - rather than another summit
or a copy of Rock Passage. Initial length/height targets and placement remain
proposals, not surveyed or approved geometry. Build a reversible supported
floor before adding the roof, with one full-challenge retry leg each way and
junction isolation from Seabird Climb.

References inspected: current tidal source/tests for routes, real obstacle
contact and ordered recovery; Quarry's `quarryTunnelGeometry` and Deep Cut
floor/roof/open-mouth/turning tests for stacked collision. Transfer their
technique, not quarry styling or its local-righting behavior. The heightfield
alone cannot create a cave; floor, roof, camera, lighting and level-aware
queries must agree. Also retained the level bend-exit, solid-cairn,
leafy-silhouette and waterline-sweep lessons in the current plan.

No game code or geography changed, and no new automated/gameplay results are
claimed for this docs-only revision. The prior baseline remains 191 focused
unit passes, four final camera/shore browser passes and 14 pilot PWA passes.
Commit `f8be182` contains the preceding pilot work and was subsequently pushed
at the user's request; earlier "local/no push" statements describe their
original point in time. No commit/push is authorized by this revision request.
The world remains development-only.

Next implementation, if selected: lay out the Pebble Cove descent and dry
arrival inside the current footprint, preserving both accepted rides, then
prove the floor uphill and downhill with both cars before roofing it. User
review and physical-iPad Safari performance/touch/offline gates remain open.

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

Next: [drive from Windward Lookout](http://127.0.0.1:5173/?area=island-tracks&start=windward-lookout),
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
[`artifacts/island-tracks/`](.), separated by engine.
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
