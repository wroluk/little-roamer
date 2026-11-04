# Island Tracks build plan

Revised 2026-11-04 against the current implementation, Pebble Cove visual
feedback and the uphill-return recovery report.
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

## Implemented baseline

| Leg | Driving character | Completion and recovery |
| --- | --- | --- |
| Harbor Cove to Saltgrass Landing | Winding basalt chain, four solid ribs, narrow gates and three real shallow channels | Finish beyond the landing rib on the safe far shore; Reset then uses Saltgrass Landing without requiring the inland climb |
| Saltgrass Landing to Windward Lookout | Connected inland approach to the 30 m lookout | Separate bidirectional leg; the first inland turn retains Saltgrass recovery |
| Windward Lookout to Seabird Summit | About 180 m of exposed ledges, four solid stones, 47 m Wind Notch and a 67 m summit | Complete at the summit; descent is a return attempt from there |
| Windward Lookout to Pebble Cove | 193 m descending 26 m through offset basalt steps, a resting shelf and a 25 m daylight cave to a dry 4 m cove | One ordered challenge in each direction; the resting shelf and cave mouths do not unlock recovery |

Gull Rock, Split Saddle and Wind Notch are supported resting places, not
recovery checkpoints. The compact world occupies a 400 m square with a 2 m
terrain grid and a resident render/physics runtime. The recorded baseline is
156,882 resident triangles and 19 colliders (156,738 before the shallow-water
addition, originally 155,884 / 15); that is a measurement, not a
promise that an extension costs nothing or evidence of iPad performance.
The current headland/roof revision measures **157,596 triangles / 19 colliders**;
the shallow-water baseline above is historical. See progress for actual captures
and current coverage.

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
- **Keep earned arrivals:** the next approach must not erase a finished
  crossing. Likewise, reaching dry ground before the final obstacle must not
  unlock an arrival. Match challenge boundaries to the player's actual journey.
  Isolate the cove physically as well: the landing, mainland shore and lower
  ravine must not offer an easy alternative arrival around the intended descent.
- **Separate inspection from play:** the eight named development starts remain
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
  deterministic, bounded, owned and disposed. Stay resident at this scale;
  expansion beyond it needs a separate sizing decision.
- **Permanent cave shade:** reuse Moon/Mars's triangle-derived static sunlight
  for the fixed roof, on the actual terrain, scenery and swapped cars. Shade
  must already exist before entry and survive distant or disabled dynamic
  shadows. Keep ambient light, the lower driving bed and daylight mouths;
  this does not authorize baking every scenery object.

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

The user accepted the cove itself and requested a small driveable water area;
feedback on the full challenge is still pending. A gradual beach ramp now
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

## Gates and remaining scope

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

Still open: user review of corrected recovery/camera feel and physical-iPad
Safari performance, simultaneous touch and offline acceptance. Keep the world
internal until an explicit release decision; no home-page promotion, saved
progression, missions, new vehicles, full eight-region rollout or world-size
increase is included. The user authorized Pebble Cove and the single-world
naming cleanup, not a new release, commit or push.
