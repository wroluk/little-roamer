# Island Tracks build plan

Revised 2026-11-03 against the current implementation and recorded driving
feedback. This is the plan for `?area=tidal-islands`, not the tropical
`?area=island` pilot or the old `?area=island-tracks` causeway comparison.
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

Gull Rock, Split Saddle and Wind Notch are supported resting places, not
recovery checkpoints. The compact world occupies a 400 m square with a 2 m
terrain grid and a resident render/physics runtime. The recorded baseline is
155,884 resident triangles and 15 colliders; that is a measurement, not a
promise that an extension costs nothing or evidence of iPad performance.

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
- **Keep earned arrivals:** the next approach must not erase a finished
  crossing. Likewise, reaching dry ground before the final obstacle must not
  unlock an arrival. Match challenge boundaries to the player's actual journey.
- **Separate inspection from play:** the seven named development starts remain
  available. Gull/Split inspect the crossing but retry Harbor; Wind Notch retries
  Windward. Loading, photo targets and out-of-order exits cannot earn progress.
  Recovery state is runtime-local, not a new saved unlock/journal system.
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

## Recommended next slice: Pebble Cove Descent

**Proposal only; not approved or implemented.** Reuse the old concept's cove
idea, not its easy shore road or causeway geography. Add one connected
bidirectional branch from Windward Lookout down a folded basalt ravine,
through a short dry sea-cave passage, to a sheltered pebble cove.

The experience is controlled descent and choosing wheel lines rather than
another exposed climb: offset bedrock steps and a few grounded boulders,
a supported place to pause, brief enclosure, then a framed reveal of the sea.
The return must be an equally real climb, not a one-way drop.

Initial design targets, to verify before fixing coordinates: roughly
150-220 m of route and 25 m of descent from the 30 m lookout to a dry
3-5 m coastal shelf. Shape a plausible cove in the existing island footprint;
do not force it into the accepted crossing or Seabird turning areas.
The cave should have daylight at both mouths, room for the normal follow
camera and visible rock detail, not a long dark tunnel, diving section or
dead-end requiring a precision reverse. Keep its driving floor above sea.

Treat Windward Lookout to the safe cove as one new challenge in each direction.
Resting ledges and cave mouths do not unlock recovery; the cove arrival comes
after the last obstacle. Returning from the cove retries from the cove.
Test the junction with Seabird Climb so entering one ride cannot advance the
other. No new checkpoint is earned merely by falling onto the cove.

### Implementation order if selected

1. Establish the ravine, dry cove, supported two-way floor and endpoint
   boundaries first. Drive the connected descent and return with both cars
   before adding a cave roof or decorative scenery. Place a new named start
   only after checking its terrain-flattening effect on adjacent grades.
2. Add a short solid basalt roof and deliberately placed tactile obstacles.
   The heightfield cannot represent stacked floor/roof surfaces by itself:
   keep a true lower driving bed and a separately matched roof, with open
   mouths. Resolve camera, lighting, surface/HUD and spawn queries against the
   correct level; do not lift the camera or car through the roof.
3. Wire ordered retries, junction isolation, inspection entry, disposal and
   connected-route regressions. Inspect actual descent, cave entrance/interior/
   exit, cove arrival and return-driving views before calling the slice ready.

References inspected for this proposal: `tidal-terrain.ts`, `tidal-scenery.ts`,
`tidal-tracks.ts` and `tests/tidal-tracks.test.ts` for accepted terrain,
obstacles and recovery; `quarryTunnelGeometry` in
`src/game/location-demo-scenery.ts` and the Deep Cut cases in
`tests/location-demos.test.ts` for real floor/roof clearance, open approaches,
matching collision and two-way drives. Adapt the technique to a short natural
coastal passage, not the quarry's scale, industrial appearance or local-righting
policy. Do not copy its material treatment without checking actual cave light.

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

The latest recorded baseline is 191 focused units, four camera/shore browser
cases and 14 pilot production/PWA cases passing; older full-route checks are
listed separately in the progress log. These are historical results, not
new checks run during this documentation revision.

Still open: user review of corrected recovery/camera feel and physical-iPad
Safari performance, simultaneous touch and offline acceptance. Keep the world
internal until an explicit release decision; no home-page promotion, saved
progression, missions, new vehicles, full eight-region rollout or world-size
increase is included. This revision authorizes documentation only, not the
proposed descent, a commit, a push or a release.
