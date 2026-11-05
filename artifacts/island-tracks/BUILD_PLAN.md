# Island Tracks build plan

**User accepted as complete on 2026-11-05**, including the enlarged mainland,
coastal refinements and current eight postcards, and authorized committing
and pushing everything. The final focused mainland/journal/production checks
and publication evidence are recorded in [progress](PROGRESS.md#progress).
Earlier preview holds below are superseded by this sign-off, not erased from
the historical progress record. No full other-location regression is requested.
The single current world is **Island Tracks**, at `?area=island-tracks`.
The old causeway comparison implementation and intermediate `tidal-islands`
ID are retired. The tropical `?area=island` pilot remains separate.
Read [world-building lessons](../../WORLD_BUILD_GUIDE.md) and
[latest progress/evidence](PROGRESS.md#progress) before changing it.

## Direction established by driving

**"The other shore is earned."** The user called Rock Passage the DNA of the
game and accepted both the crossing and Seabird Climb. Build readable terrain
to negotiate, not scenery to drive through: deliberate wheel placement,
solid tactile obstacles, meaningful height changes, breathing space and an
arrival worth reaching. Preserve normal Earth handling.

Difficulty belongs in the terrain and line choices, not hidden traps,
precision gates, forced jumps, timers or arbitrary prop clutter. An easy
causeway would defeat this crossing's purpose. This is a local design choice,
not permission to make every existing world harder.

The user explicitly wants relaxed cruising as well: wide grassy hills are an
enjoyable destination, not empty space awaiting obstacles. The larger home
island contrasts with the rocky eastern island. Keep its main circuit easy
and reversible, with the Whale's Back crest optional; do not make a difficult
home-island leg a prerequisite for Rock Passage.

## Implemented baseline

| Leg | Driving character | Completion and recovery |
| --- | --- | --- |
| Western mainland circuit | An 809 m broad coastal circuit around open rolling meadow, farmstead and grove | Freely accessible; bypasses the difficult side ride |
| Heather Cut | Optional 149 m rock pocket with four offset steps and a 26 m upper section | Ordered whole-ride attempts; broad grassland does not require this ride |
| Harbor Meadow home circuit | A 574 m broad, rolling loop from Harbor Cove to Needle Lighthouse and back; open grass supports cross-country cruising | Freely visited safe home destinations retain recovery, without ordered route gates |
| Whale's Back | Optional 147 m rounded bedrock climb to a 28 m crest, with the meadow circuit bypassing it | The supported crest is a home destination, not a required obstacle on the lighthouse journey |
| Harbor Cove to Saltgrass Landing | Winding basalt chain, four solid ribs, narrow gates and three real shallow channels | Finish beyond the landing rib on the safe far shore; Reset then uses Saltgrass Landing without requiring the inland climb |
| Saltgrass Landing to Windward Lookout | Connected inland approach to the 30 m lookout | Separate bidirectional leg; the first inland turn retains Saltgrass recovery |
| Windward Lookout to Seabird Summit | About 180 m of exposed ledges, four solid stones, 47 m Wind Notch and a 67 m summit | Complete at the summit; descent is a return attempt from there |
| Windward Lookout to Pebble Cove | 193 m descending 26 m through offset basalt steps, a resting shelf and a 25 m daylight cave to a dry 4 m cove | One ordered challenge in each direction; the resting shelf and cave mouths do not unlock recovery |

Gull Rock, Split Saddle and Wind Notch are supported resting places, not
recovery checkpoints. The second mainland preview occupies an **860 x 400 m
rectangle**, from `(-660, -200)` to `(200, 200)`. The original portion retains
its 2 m grid; new western columns beyond X=-360 use a 4 m grid with a fully
stitched edge. Rendering, collision and height queries share the exact same
triangles, including the split seam cells. The runtime remains bounded/resident.
Only the west boundary moves; the eastern island, channels and challenge
coordinates remain in place. The recorded pre-expansion baseline is
156,882 resident triangles and 19 colliders (156,738 before the shallow-water
addition, originally 155,884 / 15); that is a measurement, not a
promise that an extension costs nothing or evidence of iPad performance.
The first home-island revision measured **210,853 triangles / 21 colliders**, including
the owned lighthouse and beached skiff batches. The former headland/roof
measurement of 157,596 / 19 is historical. Keep the existing render budgets;
the enlarged build needs its own device review, not an assumption that the
previous iPad acceptance proves its performance.
The second preview measured **251,799 resident triangles / 24 colliders**.
The completed coastal build measures **254,056 resident triangles / 28
colliders**. Final focused browser route peaks are recorded in progress.

The route and appearance of both accepted rides are protected references,
not material for a fresh redesign with every extension. The lookout's
cross-shaped object is a static mast/wind vane; the user's identification
question did not authorize replacing it.

## Contracts to carry forward

- **Whole-challenge Reset:** both button and R restart the active leg from its
  departure, even after a roll. No local righting or intermediate retry shelves
  in this world. Completion requires ordered grounded, upright travel and a
  safe arrival after the final obstacle. Backing up does not change direction.
  At a junction, identify the entered route, not the nearest endpoint or heading.
  The cove's final arrival gate and resting area cover its actual 12 m dry pad;
  turning uphill from that safe arrival must not retain the lookout departure.
  Relaxed home roaming is separate: actual grounded visits to Harbor Cove,
  the Whale's Back crest or the lighthouse pad establish a safe destination
  without requiring an ordered circuit. Open meadow does not advance recovery,
  and these home visits cannot complete or bypass a crossing/cliff attempt.
- **Keep earned arrivals:** the next approach must not erase a finished
  crossing. Likewise, reaching dry ground before the final obstacle must not
  unlock an arrival. Match challenge boundaries to the player's actual journey.
  Isolate the cove physically as well: the landing, mainland shore and lower
  ravine must not offer an easy alternative arrival around the intended descent.
- **Separate inspection from play:** the fifteen named starts remain
  available. Gull/Split inspect the crossing but retry Harbor; Wind Notch retries
  Windward. Loading, photo targets and out-of-order exits cannot earn progress.
  Pebble Cove starts its return to the lookout. Recovery state is runtime-local,
  not a new saved unlock/journal system.
- **Honest water:** pale shallows have real submerged beds and wet-wheel
  handling; dark sea is not a route. Fixed water level, terrain-fitted shores,
  opaque deep water, no invisible road or easy bypass. During sinking, keep
  the driving camera at least 1 m above water without bypassing collision;
  photo mode remains free. Do not change car sinking to fix a camera problem.
- **Matched physical detail:** visible ribs, rocks and cairns need matching
  collision, embedded bases and clearance from the entire route/turning area.
  Flat resting cores must cover the interpolated wheel footprint. Complete
  tight turns on a level exit before resuming the grade; do not tune handling
  around a terrain trap.
- **Readable silhouettes and lifecycle:** keep clustered leafy crowns distinct
  from rocks, landmarks legible at driving height, and all added resources
  deterministic, bounded, owned and disposed. The user approved the bounded
  second western expansion; retain the bounded mixed-resolution resident layout at this scale.
  Any further world-size increase needs a separate sizing decision.
- **Permanent cave shade:** reuse Moon/Mars's triangle-derived static sunlight
  for the fixed roof, on the actual terrain, scenery and swapped cars. Shade
  must already exist before entry and survive distant or disabled dynamic
  shadows. Keep ambient light, the lower driving bed and daylight mouths;
  this does not authorize baking every scenery object.

## Harbor Meadow, Whale's Back and Needle Lighthouse

The first approved 2026-11-05 expansion uses the retained place ideas in
`LOCATION_IDEAS.md`, not a new woodland theme or the retired causeway.
The western dry-land sample grows from **14,700 to 42,788 square metres
(2.91x)** on the same 2 m sampling lattice. This is measured land growth,
not merely a larger world boundary or a longer road. The east remains the
dramatic rocky island; the home island becomes broader rather than taller.

Harbor Cove stays at `(-125, 60)` with the direct crossing departure intact.
The boathouse remains, with a solid beached skiff on supported dry ground
away from both loop approaches. The main route sweeps south and west through
low rolling grass, around the foot of Whale's Back, to the lighthouse's
16 m arrival pad at `(-276, -70)`, then returns through the eastern hills.
Its supported core is 16 m wide, with gentle shoulders. A reserved grassy
meadow around `(-220, 45)` supports real off-road turns rather than forcing
all cruising onto a painted road.

The optional rock line branches at `(-281, 61)`, crosses the 28 m Whale's Back
crest and rejoins before the lighthouse approach. It is not another exposed
cliff staircase and does not obstruct the easy circuit. Needle Lighthouse
stands on a separate level apron at `(-280, -90)`, with a solid cream/red
tapered tower, lantern and room for both cars to circle outside its footing.
No moving beam, new lighting system, missions or persistent unlocks are added.

References inspected: current tidal exact-grid sampling, fitted sea,
grounded scenery batches, whole-journey recovery and both-car real-driving
tests; the original Harbor Meadow/Whale's Back/Needle Lighthouse concept
in `LOCATION_IDEAS.md`; and the shared `demoWaterGeometry` apron clipping.
Adaptation: extend only the western grid columns and parameterize the
non-overlapping ocean apron bounds, rather than enlarging every side of
the old square. Keep the helper's existing square default for other worlds.
All protected 2 m eastern/crossing samples from X=-108 through 190 and
Z=-190 through 190 match the prior build exactly.

## Second mainland expansion and Heather Cut

The user explicitly selected another **2–3x the current land area**, not the
original 14,700 square metres. Current dry-land samples measure **114,508
square metres**, versus 42,788 immediately before this pass: **2.676x**,
or **7.790x** the original. The first lighthouse circuit and optional crest
remain; the new 809 m western circuit offers a longer, easy alternative.
The main meadow around `(-427, 15)` reserves a 52 m radius without solid props.
The farmstead, flowers and sheltered wind-bent grove add
destinations without filling that field with obstacles.

The later user instruction adds a difficult ride without changing the
mainland's grassy character. Heather Cut occupies one compact western
shoulder, separate from the coastal circuit. Its 149 m bedrock line has four
solid offset steps and raised rocky banks, with a 26 m upper section.
`heather-cut` and `west-overlook` provide inspection and safe home entries.
When intentionally entering the rock line, ordered whole-journey retry rules
apply; driving the easy coastal bypass must not start a failed challenge.
Twelve-metre departure areas separate the two lines before attempt detection.

The early-preview hold ended with the user's completion sign-off. The final
acceptance uses both cars/directions and analog/digital steering in real-driving
units, plus affected Chromium/WebKit journeys; see progress for actual results.
Heather Cut retains all four stones, its original approach and summit. A
successful safe traversal may require a controlled run-up or a different
wheel line; passing every obstacle at crawl speed is not an acceptance gate.

## Western coast

The user rejected the brick-course ruin's blocky silhouette and visible seams.
It is replaced by **Western Beacon**, a continuous tapered body with a
contrasting band, lantern cage and cap, about 10 m high versus Needle
Lighthouse's roughly 20 m. Its named entry is now `west-beacon`; `watchtower`
is retired. The two small mainland lights stand near its northern and southern
tips, on naturally supported coastal shoulders at about 12 m and 8 m, rather
than clustering around the western beacon. A third stands on a supported 67 m shoulder of
Seabird Summit, clear of the driving line and turning area. Lanterns use one
owned emissive batch, not extra point lights, flashing logic or a moving beam.
Both benches and the dedicated western bench pad remain removed.

Dry approaches link the mainland circuit to the western viewpoint, `west-beach`
and `north-cove`. West Beach has a separately supported 28 x 28 m shallow
turning core and a gradual dry return. The optional cliff-foot ride now uses
curved bed sampling, variable shelf widths, irregular outer rock pockets,
three tactile ribs and seven larger rigid outcrops. The cliff edge also varies;
it is not a constant-width straight strip. Clamp the smoothed bed's depth to
the agreed shallow range: cubic interpolation must not introduce deeper traps.

**Smuggler's Nook is now authorized and implemented:** a concealed open-top
rock cleft with a dry turning area, small weathered skiff, cargo crates and
a worn mooring post. An offset wet approach and flanking boulders hide the
reveal from the main shore line. This is a recessed landform, not another
roofed cave or a roof that lacks its own shade/clearance work. There is no
named start, map marker, tide timer or extra retry point. Its later-authorized
postcard uses the existing journal, not a separate collectible system.

Easy beach play must not start a cliff attempt; intermediate rocks and the
nook must not become recovery shortcuts. Both route ends are freely accessible
from the mainland: the challenge earns its traversal, not exclusive access to
a cove. Bounds, mixed-resolution topology and shared vehicle handling remain
unchanged. The small summit-light footing is locally supported without moving
the accepted climb or its endpoint.

The normal Harbor Cove position stays on its proven dry pad but now faces the
grassy circuit, away from the other islet. Named Harbor Cove and normal Reset
agree with that heading; entering a challenge still establishes that ride's
departure heading. The home subtitle is **Meadows, coves & crossings**,
with a Harbor Cove welcome and a brief mainland-first/water-depth toast.

The user accepted the coast as complete. Final focused checks cover both-car,
both-direction, analog/digital drives, browser camera/render peaks and
production/offline behavior; the latest progress entry records exact evidence
and any remaining platform limitations.

## Postcard keepsakes

The user approved eight cards: Mainland Meadows (the expanded farmstead/meadow,
not the original Harbor Meadow), Needle Lighthouse, Western Beacon, West Beach,
The Other Shore, Seabird Summit, Pebble Cove and secret Smuggler's Nook.
Use actual-game, vehicle/HUD-free images and brief notes in the existing journal.
Seven named locked slots and one anonymous secret retain the established UX.
Save discoveries and first-visit dates in the existing browser record.

Recognition requires eight metres of real movement, grounded/upright travel
and shallow/dry conditions. The Other Shore, summit and cove also require
their runtime's ordered completed arrival; named starts, Reset, photos and
teleports do not supply that achievement. Elevation checks distinguish the
hidden cleft from the cliff above. No new checkpoints, missions or map UI.
The trigger overlay is a development artifact generated from live definitions.

Pebble Cove, Seabird Summit, West Beach and Smuggler's Nook now use the user's
exact supplied photo-mode views. The user's completion sign-off accepts the
other four current compositions too; no further framing is required.
Saved cameras live in `postcards/photo-views.json`; capture through the shared
`artifacts/postcards/capture.mjs` script. Sources are
`public/postcards/island-tracks/`; builds copy them into
`dist/postcards/island-tracks/` and precache them. Keep exact user-supplied
poses rather than moving discovery zones to match a photograph.

## Pebble Cove Descent

**Authorized and implemented; final evidence/status is recorded in progress.**
The eastern branch from Windward Lookout descends through a basalt ravine,
a dry cave and a sheltered pebble cove. It carries forward the old concept's
cove idea, not its easy shore road or causeway geography.

The experience is controlled descent and choosing wheel lines rather than
another exposed climb: offset bedrock steps and a few grounded boulders,
a supported place to pause, brief enclosure, then a framed reveal of the sea.
The return must be an equally real climb, not a one-way drop.

The measured route is **192.51 m**, descending from the 30 m lookout to a
**4 m dry turning shelf**, within the existing footprint. It does not cross
the accepted passage or Seabird turning areas. Five offset physical stones,
an inland basalt wall and a level resting section create wheel-line choices.
The **25.46 m** cave has daylight at both mouths and room for the normal
collision-tested camera. Its true driving floor stays above sea beneath a
separate solid, faceted basalt roof. The cove has fitted shallow water at
its sea-facing edge and grounded shoulder pebbles outside the turning area.

Following the user's bypass report, a collision-matched coastal headland now
separates the landing/mainland from the cove, with an inland arm bounding the
lower ravine. Broad overlapping rock masses support an asymmetric roof with
uneven recessed mouths, varying width and a crown using the same rock height,
palette and smooth crown normals as the surrounding terrain. The existing
driving line, floor, open approaches, dry arrival and wet shelf remain protected.
This is a geography correction, not an invisible blocker or stricter unlock.

The subsequent visual corrections reject steep vegetation sites, retain rigid
detached rocks, move the mast onto measured level support and bury the roof's
whole skirt faces rather than only its vertices. The cave owns a bounded static
sunlight atlas; the terrain also casts ordinary nearby shadows so buried props
do not cast through an otherwise non-occluding hill. These are local scenery
corrections, not changes to shared handling or the accepted driving floor.

The user accepted the complete world after the cove refinements. A gradual beach ramp now
leads south from the unchanged dry arrival to a bounded, wheel-deep shelf
with a 32 cm submerged bed. It includes a verified 20 m by 10 m flat wet core
and additional room for the whole car to turn, not an offshore connection.
It reuses the actual terrain, fitted depth-coloured sea and normal wet-wheel
handling. Playing there does not change challenge completion or recovery.

Treat Windward Lookout to the safe cove as one new challenge in each direction.
Resting ledges and cave mouths do not unlock recovery; the cove arrival comes
after the last obstacle. Returning from the cove retries from the cove.
At the Seabird junction the closest outgoing segment chooses the attempt;
ordered progress on one ride cannot advance the other. No new checkpoint is
earned merely by falling onto the cove.

### Implementation sequence and retained references

1. Established and drove the unroofed floor with both cars, both ways, using
   analog and digital steering before adding the cave or tactile scenery.
   The cove's level core includes terrain-grid interpolation around its pad.
2. Added a separate matched solid roof and five embedded stones, retaining
   the true lower bed for camera, lighting, surface/HUD and spawn queries.
   There are no headlights, shared handling changes or roof teleports.
3. Added ordered bidirectional retries, closest-branch selection, a named cove
   inspection start and connected-route regressions. All new batches stay
   owned by the resident runtime and are removed on disposal.

References inspected for this proposal: `tidal-terrain.ts`, `tidal-scenery.ts`,
`tidal-tracks.ts` and `tests/tidal-tracks.test.ts` for accepted terrain,
obstacles and recovery; `quarryTunnelGeometry` in
`src/game/location-demo-scenery.ts` and the Deep Cut cases in
`tests/optional/location-demos.test.ts` for real floor/roof clearance, open approaches,
matching collision and two-way drives. Adapt the technique to a short natural
coastal passage, not the quarry's scale, industrial appearance or local-righting
policy. Do not copy its material treatment without checking actual cave light.

The current integration includes remote main's per-wheel traction changes.
Keep them intact: controlled run-ups are an accepted technique, not a reason to
restore artificial tyre force or lower stones. The isolated uphill Resting
shelf exit rib uses the full return drive's 2.5 m/s approach rather than a
2.2 m/s crawl; all articulation, support, water, upright and flight limits stay.

## Acceptance and maintenance

For code changes: typecheck, affected units and production build. Drive both
Earth cars both ways with analog and digital steering; retain the existing
upright, wet-contact, wheel-articulation and camera assertions. Use the accepted
2 m tidal browser waypoint policy, not a new precision target.

Complete affected browser scenarios in Chromium and WebKit, including existing
crossing/Seabird connections, both Reset controls, final-obstacle arrival,
wrong-route/out-of-order entry, above-water falls and cave camera clearance.
Capture actual driving views, not only an overhead map or photo poses.
Measure new resident/render costs and switching/disposal; do not silently
weaken the existing budgets. Browser and PWA runs stay sequential.

After the physical headland/roof correction and physics rebase, 163 focused
units pass, including all 88 Island Tracks cases and both cars with
analog/digital steering. Fourteen distinct affected Chromium/WebKit browser
cases pass across the initial run and isolated reruns; typecheck/build pass.
The sequential full production/PWA run has 32 passes and four existing WebKit
offline skips. The progress entry records the initial crossing stall,
clean-main/local isolated passes, subsequent WebKit graphics/storage
interruption and successful Cove reruns, rather than describing the interrupted
batch as green. Unrelated full unit/browser suites were not rerun.

The user accepted the visual/recovery corrections and subsequently authorized
publishing Island Tracks in the existing GitHub Pages game for later iPad
testing. Its normal home tile was initially labelled Preview; direct regional links and
offline travel are available. This supersedes internal-only availability,
not a blanket finished-release decision. On 2026-11-05 the user reported the
published preview was all good on their physical iPad. Record that acceptance
as reported without inventing separate offline/touch/thermal measurements.
The user's later 2026-11-05 completion sign-off includes the western expansion,
coast, discovery and current postcards. It supersedes the earlier preview-only
status and framing holds; see progress for the final scoped checks and push.
No saved progression, missions, new vehicles or full eight-region rollout
is included. The other unfinished worlds and tools remain local-only.
