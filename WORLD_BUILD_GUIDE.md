# World-building lessons and reference implementations

Read this before adding or refining a location. This is the shared engineering and
visual-review memory for Northern Reach, Iceland Highlands, Mars and Iceland.
It records why an approach worked or failed, with pointers to executable examples.
It does not replace the current world's design, progress record or the user's
latest instructions. Historical screenshots are not proof of the current code.

## Start a world task by transferring experience

1. Read this guide and the current world's plan, design and latest progress entry.
2. Identify the closest existing feature below. Read its implementation **and**
   tests before implementing a new version. Record the reference in the current
   progress entry, what is reused, and any reason it needs adapting.
3. Reuse a suitable helper directly; otherwise transfer the complete technique,
   including its placement, collision, cleanup and validation constraints. Do not
   copy only the visible material while discarding the terrain/water contract.
   Avoid broad shared-system refactors just to create reuse during a local fix.
4. Inspect actual game captures early, including at driving height. A passing
   geometry test or an overhead view is insufficient evidence of visual quality.
5. When feedback reveals a general lesson, update this guide and the world's
   progress record. Include the failure, correction, evidence and remaining limits.

## Reference map

| Feature | Read first | Useful checks/evidence |
| --- | --- | --- |
| River profiles, shallow shelves, banks and ford beds | [Northern valley](src/game/northern-valley.ts), [watershed](src/game/northern-watershed.ts), [Highlands terrain](src/game/highlands-terrain.ts) | [Valley unit tests](tests/northern-valley.test.ts), [watershed tests](tests/northern-watershed.test.ts), [Highlands tests](tests/highlands.test.ts) |
| Water fitted to terrain and depth-aware appearance | `waterVertexAt`, `waterBoundary`, `clipWaterTriangle`, `emitWaterTriangle` in [Northern terrain](src/game/northern-terrain.ts); `waterGeometry` in [Highlands scenery](src/game/highlands.ts) | [Watershed browser views/drives](tests/browser/northern-watershed.spec.ts), [Highlands browser checks](tests/browser/highlands.spec.ts) |
| Deterministic prop ownership, terrain grounding, route exclusions | `generateNorthernProps` in [Northern terrain](src/game/northern-terrain.ts); [Northern scenery pools](src/game/northern-streaming.ts) | [Northern streaming tests](tests/northern-streaming.test.ts); [Mars floating/repeated rock fixes](artifacts/mars/FEEDBACK1_RESPONSE.md) |
| Landmark silhouettes, natural rock forms and real solid passages | [Mars design](artifacts/mars/DESIGN.md), [Keyhole card](artifacts/mars/KEYHOLE_BADLANDS.md), [Lava Tubes card](artifacts/mars/LAVA_TUBES.md) | [Keyhole tests](tests/mars-keyhole.test.ts), [tube tests](tests/mars-tubes.test.ts), corresponding browser scenarios |
| Exact terrain sampling, worker lifecycle, coarse/detailed seams | [Northern terrain](src/game/northern-terrain.ts), [Northern streaming](src/game/northern-streaming.ts), [Mars build plan](MARS_BUILD_PLAN.md) | [Northern streaming tests](tests/northern-streaming.test.ts), [Mars tests](tests/mars.test.ts) |
| Surface appearance, labels and per-wheel handling | [Surface profiles](src/game/surfaces.ts), [vehicle](src/game/vehicle.ts), [terrain effects](src/game/terrain-effects.ts) | [Surface regressions](tests/surfaces.test.ts), actual region drives |
| Current Iceland river, sea join and connected road ribbon | [River geometry](src/game/iceland-river.ts), [terrain](src/game/iceland-terrain.ts), [road geometry](src/game/iceland-road-scenery.ts) | [Iceland tests](tests/iceland.test.ts), [browser checks](tests/browser/iceland.spec.ts), [current progress](ICELAND_PROGRESS.md). Recent revisions remain subject to user review. |

## Earlier world-building feedback ledger

This ledger covers more than shoreline work. The Mars entries come from the
user's preserved [first](artifacts/mars/Mars-feedback1/Mars%20feedback.md) and
[second](artifacts/mars/Mars%20feedback%202/MArs%20feedback%202.md) feedback
sets, later reviews in [Mars progress](MARS_PROGRESS.md), and the final
[Mars design](artifacts/mars/DESIGN.md). Northern Reach's retained
[region descriptions](README.md#northern-reach--river-valley-pilot), code and
tests are the source for its engineering decisions. A previous screenshot
or intermediate progress entry can describe superseded work; check the latest
design/progress entry and the current implementation before reusing it.

| Observed problem or decision | Reusable method | Source and proof |
| --- | --- | --- |
| A generated 1.5 km map can feel sparse; a compact Mars layout exposed too many regions at once. | Plan region centres, connectors, starts, silhouettes and sightlines at final scale. Polish a connected pilot, then complete one driveable region with its exits before widening scope. | [Mars plan](MARS_BUILD_PLAN.md), [expanded layout and landscape review](MARS_PROGRESS.md) |
| Northern Reach regions became useful when they formed connected choices, rather than isolated scenery stops. | Design a short loop or through route with distinct easy and technical lines, a readable return, and a dry regional start/reset. Keep older routes and landmarks reachable as new terrain blends in. | [River Valley pilot](README.md#northern-reach--river-valley-pilot), [connected adventures](README.md#northern-reach--timber-run-boulder-shoals-and-stonegate-basin), [Pine Hollow](README.md#northern-reach--pine-hollow) |
| A scenic obstacle could be visible but lack believable wheel contact, or be solid where it looked open. | Pair authored shapes with matching collision: climbable logs and rocks, open arch passages, and decorative tree crowns. Test both approach directions and verify actual wheel climb, not proximity alone. | [Northern adventures](README.md#northern-reach--timber-run-boulder-shoals-and-stonegate-basin), [Windstone/Ochre](README.md#northern-reach--windstone-ridge-and-ochre-terraces), [Northern tests](tests/northern-adventures.test.ts) |
| Varied biomes still needed coherent local route and landmark grammar. | Use region-specific ground, plant, rock and route forms: dry hummocks and reeds around marsh fords, a graded ash caldera descent, cairns in high snow, or pines framing a ravine. Include overlooks and deliberate clearings to let players read the next choice. | [Willow Marsh](README.md#northern-reach--willow-marsh), [Ember Basin](README.md#northern-reach--ember-basin), [High Pass](README.md#northern-reach--high-pass), [Pine Hollow](README.md#northern-reach--pine-hollow) |
| Landmarks looked generic or read only from overhead. | Use an authored silhouette and material hierarchy; inspect arrival, feature and overlook from car height. Large structures need near and distant forms with the same recognizable outline. | [Mars design rules](artifacts/mars/DESIGN.md), [Dish Ridge](artifacts/mars/DISH_RIDGE.md), [Northern region descriptions](README.md#northern-reach--windstone-ridge-and-ochre-terraces) |
| Sloped roads, arches and tubes looked passable but could trap or jump the car. | Grade the whole width and both approaches; use the visible triangle surface as collision, leave actual open passages, and drive both directions with the real vehicle. Diagnose wheel contacts before changing physics. | [Mars plan region gate](MARS_BUILD_PLAN.md), [Keyhole](artifacts/mars/KEYHOLE_BADLANDS.md), [Lava Tubes](artifacts/mars/LAVA_TUBES.md), [Northern beach-route tests](tests/northern-west.test.ts) |
| Floating or repeated Mars rocks; steep-ground props stretched into plinths. | Sample the entire footprint, bury supports, use matching collision, and vary placement, omission, size and form independently. Move technical props to level ground when terrain-conforming foundations become implausible. | [Mars feedback 1](artifacts/mars/FEEDBACK1_RESPONSE.md), [relay review](MARS_PROGRESS.md), [Northern prop tests](tests/northern-west.test.ts) |
| Rim waves, terrain stripes and visible coarse/detailed joins. | Replace periodic silhouette noise with irregular broad forms and multi-scale colour variation. Keep detailed boundary vertices in coarse chunks and test edge topology and drive-through captures. | [Mars feedback 1](artifacts/mars/FEEDBACK1_RESPONSE.md), [Northern streaming tests](tests/northern-streaming.test.ts) |
| Glass and water edges followed whole terrain triangles, giving teeth, pale gaps or false dark fringes. | Clip the visual to its true contour. Keep foreground and background surfaces under explicit ownership; remove redundant tint/shadows and check the overlap from low and high cameras. | [Mars Glassfall revisions](MARS_PROGRESS.md), [Northern river clipping](src/game/northern-terrain.ts), [Iceland mouth history](ICELAND_PROGRESS.md) |
| Northern river and lake banks separated from the water or made fords hard to read. | Shape bed, shallow shelf and bank together; sample the rendered collision triangles for water level/depth and clip the waterline. Keep two-way ford approaches dry enough to enter and leave. | [Alder watershed](src/game/northern-watershed.ts), [watershed tests](tests/northern-watershed.test.ts), [README](README.md#northern-reach--great-lake-and-alder-river) |
| Northern western shore needed an actual sea edge, reachable coves and a river outlet. | Blend the ground below sea level through the streamed apron, retain an open channel between spits, provide a low beach line beside harder ridge choices, and stall/recover the car in deep sea. | [Western Shores](src/game/northern-west.ts), [coastal tests](tests/northern-west.test.ts), [README](README.md#northern-reach--western-shores) |
| Small shrubs, logs and stones could look repeated or disagree with tyre contact. | Give low forms varied profiles and scale, use combined low colliders where they should be felt, inspect the result from wheel height, and keep loose props out of route shoulders. Small repeated objects generally should not cast dense shadows. | [Northern pooled props/colliders](src/game/northern-streaming.ts), [western log drives](tests/northern-west.test.ts), [Mars rock review](artifacts/mars/FEEDBACK1_RESPONSE.md) |
| Signs went black, shimmered, faced the wrong way or had awkward supports. | Preserve UVs through batching, separate readable front/back display faces, use stable unlit lettering where appropriate, and ground every visible support with matching collision. Remove a sign if the landscape guides the route better. | [Mars sign and lookout revisions](MARS_PROGRESS.md), [feedback 2](artifacts/mars/FEEDBACK2_RESPONSE.md) |
| Mars solar supports missed or pierced tilted panels; the landing-pad mark read as the wrong number. | Sample each support from its own terrain point to the actual underside of the object. Review symbols at arrival scale and simplify them until the intended meaning is unambiguous. | [Mars feedback 2](artifacts/mars/FEEDBACK2_RESPONSE.md) |
| Camera recovery entered the Scout; tall landmarks did not fit the view. | Sweep raised/alternate recovery views, use hysteresis against toggling, and extend upward gaze while preserving ground and obstacle sweeps. Reproduce at the actual obstructing structure. | [Mars feedback 1](artifacts/mars/FEEDBACK1_RESPONSE.md), [Dish camera review](MARS_PROGRESS.md) |
| Atmospheric changes altered perceived scale but could hide landmarks; extra distance silhouettes and shadow fades were later rejected. | Tune fog against named ground-level views in both engines, preserve accepted sightlines, and re-check the latest design before reviving an experiment. | [Mars feedback 1](artifacts/mars/FEEDBACK1_RESPONSE.md), [Mars later rollback](MARS_PROGRESS.md), [Mars design](artifacts/mars/DESIGN.md) |
| Hidden discoveries were exposed from some approaches; ordinary journal cards triggered only on one route direction. | Verify concealment from recorded route-level sightlines and give normal landmarks multiple visit zones along alternate entrances, while keeping true secrets narrowly triggered. | [Mars wreck/design record](artifacts/mars/DESIGN.md), [journal visit-zone corrections](MARS_PROGRESS.md) |
| Rich geometry made chunk transitions expensive. | Budget triangles and generation time per feature; cache immutable terrain samples, reuse horizon buffers, keep prop ownership deterministic, and measure on the intended device before declaring performance complete. | [Mars landscape and sampling reviews](MARS_PROGRESS.md), [Northern streaming](src/game/northern-streaming.ts) |

The table is an index into the evidence, not a claim that every old visual
choice remains accepted. For a new region, name the relevant rows in its plan
and record the result of current captures and actual drives in that world's
progress file.

## Water is a terrain feature, not a ribbon placed over it

- Author a continuous water-level profile, submerged bed, shelves and bank rise
  together. Banks must rise above water before their regional blend ends.
  Northern Reach's watershed documents this requirement explicitly in the
  [README](README.md#northern-reach--great-lake-and-alder-river).
- Determine wet ground and vehicle depth from the same **sampled triangles** used
  by rendering and collision, not just the unsampled analytic height function.
- Clip water triangles at the wet/dry boundary. Northern Reach refines mixed
  triangles and level discontinuities; Highlands clips its actual terrain mesh.
  Preserve the precision margin at boundaries and verify triangle interiors too.
- Give shallows and deeper pools distinct appearance. Highlands uses depth colours
  to reveal its shallow bed; Northern Reach combines depth colours and material
  transparency. Copying an opacity value alone does not reproduce either result.
  Inspect the ford, near bank and deep pool, not just a material's `transparent` flag.
- Define which surface owns every river/lake/sea join. An ocean plane beneath a
  transparent river can appear to flow upstream where the bed dips below sea level.
  Remove the redundant overlap or use one coherent water surface. Do not treat a
  colour fade or depth bias as a substitute for fixing overlapping water geometry.
- A river must close naturally at a source or continue into a designed upstream
  feature. Do not stop its water at an arbitrary rectangle while the channel goes on.
- At waterfalls, connect upstream bed, water, fixed brink, vertical drop, plunge
  pool and downstream river. Animation must stay in front of solid rock; spray must
  reach the pool. Keep the curtain silhouette calm and animate flow inside it;
  repeating width waves read as fabric. Do not build a decorative cliff shell
  that disagrees with terrain.
- Inspect source, brink from above and side, pool, both banks, ford, bridge and
  outlet at high and low angles. Shore foam/ripples must not cross unrelated dry
  ground or span the river mouth as a row of dashed lines.

## Ground, vegetation and rocks need authored variation

- Northern Reach established region-specific framing groves, reeds, gravel,
  outcrops and open clearings. Mars established distinctive silhouettes and varied
  chips/slabs/knuckles. Use the appropriate local palette and forms; do not scatter
  the same generic rocks uniformly across every biome.
- Avoid periodic sine stripes and regular wave skylines. Mars already needed
  broad irregular colour variation to stop distance aliasing and unequal rim
  shoulders to remove regular waves. Use coherent variation at several scales,
  with independent deterministic choices for placement, omission, shape and size.
- Smooth basic-terrain lighting was adopted across worlds on 2026-10-16; retain
  interpolated normals for ground. Flat facets can suit stones and landmarks.
  Smooth normals do not fix a jagged silhouette or a poorly shaped height profile.
- Ground stones across their footprint, not just at the centre. Large rocks need
  buried skirts/support sampled around the base, with the visible shape and solid
  collision in agreement. Exclude loose scatter from steep cliff walls.
- Evaluate clearance **after** final jitter/cluster offsets. Keep roads, ford
  entrances, trails, reset sites and discoveries' accessible lines clear. Decide
  deliberately which props are solid: large obstacles/trunks must be; tiny ground
  dressing and crowns may be decorative. Do not hide invisible blockers in a route.
- Use instancing, stable seeds and one owner per prop cell; release owned resources.
  Cluster detail and leave intentional open ground, including bare black sand.
  A generated field with no near-camera detail is not a finished region.
- Northern Reach gives low shrubs a combined six-sided collider mesh and omits
  small prop shadows. Carry both visual shape and collision policy forward:
  flattened crowns, multiple deterministic variants, low solid forms, and no
  dense repeated shadow pattern over the ground.

## Roads, collision and landmarks

- Build a continuous road mesh with shared joins at bends. Separate rectangles
  caused gaps and overlapping markings in Iceland. Check the mesh topology and
  inspect an overhead bend as well as a normal driving approach.
- Grade the full width, shoulders, switchbacks and connections. A centreline that
  passes a slope check does not prove the wheel paths are safe. Drive both ways
  with the actual cars; fix geometry before changing established vehicle physics.
- Rendering, sampled heights and Rapier must describe the same surface. Arches and
  tubes need genuinely open passages, not bounding-box colliders that seal openings.
- Deliberate paint/deck overlays may need a small depth bias. First establish that
  they are intentional layers; remove accidental duplicate geometry instead.
- Visible paving, HUD label, traction and particles should agree. Adding a surface
  requires its profile, per-wheel counts and exhaustive colour/effects maps, plus
  label/transition checks. Do not rename shared dirt globally to fix a local road.
- Spend detail on the landmark silhouette and approach. Mars moved away from
  generic arches, cubes and repeated props through region-specific authored forms.
  Keep optional discoveries unmarked where that is part of their accepted design.

## Streaming and visual evidence

- The established large-world baseline is 96 m chunks, a 2.4 m global lattice,
  5×5 detailed render and 3×3 collider rings. Adapt only with an explicit local need.
- Keep coarse boundary vertices compatible with detailed terrain. Preserve essential
  shoreline/brink geometry in distant views; a photo camera can leave the car's
  detail ring. Do not use fog to conceal geometry mismatches.
- Mars's experimental scenery/shadow fading and extra simplified landmark silhouettes
  were removed after user review. Do not silently reintroduce them as a universal
  improvement. See the current [Mars design](artifacts/mars/DESIGN.md) and dated
  progress entries; old fog numbers and captures may have been superseded.
- Inspect arrival, feature, reverse approach, overlook and the problem-specific
  angle. Add bank-level, cliff-top, road-bend or source views when needed. Save the
  user's original image unchanged and retain actual game captures of the revision.
- `Photo mode → Copy view` supplies reproducible camera/vehicle coordinates. Ask for
  it when an angle cannot be reproduced, but do not make the user diagnose the bug.
- Tests prove geometry/behavior constraints, not aesthetic acceptance. Do not claim
  a world or region is complete based on generated terrain or passing automation.

## Build and handoff discipline

Follow [README Checks](README.md#checks) and [AGENTS.md](AGENTS.md). Keep checks
focused on changed behavior; run both browser engines at completed region gates.
PWA checks cover startup/cache/storage/offline or releases, not every scenery edit.
Desktop WebKit is not physical iPad acceptance. Interrupted/skipped runs are not passes.

Build one polished, connected pilot before advertising a whole placeholder world.
This follows the explicit lesson at the start of [Mars's plan](MARS_BUILD_PLAN.md):
Northern Reach's large generated map could be technically present yet feel sparse.
Carry the visual quality baseline forward from the start, rather than postponing
banks, local detail and usable routes as optional polish.

Before ending a session, update the current world's progress with:

- scope completed and still unfinished; relevant user decisions;
- reference implementations used and any local deviations;
- exact commands/results, interrupted runs and remaining manual checks;
- current capture paths and whether the user has reviewed them;
- the exact next task. Append a general lesson here if it transfers to another world.

## Iceland regression record — 2026-10-17

These failures explain why the guide is required, not just optional reading:

| Failure | Corrective lesson |
| --- | --- |
| Fixed-width river ribbon floated beyond banks | Use Northern/Highlands triangle clipping and matching sampled bed from the outset. |
| River appeared opaque despite an opacity setting | Evaluate depth, bank geometry, bed visibility and colour together. |
| River rectangle extended over sea; later sea showed through riverbed | Model exclusive water ownership and an actual mouth join, not successive overlay/fade patches. |
| Upper water abruptly ended; distant banks cut across it | Design the upstream source and retain essential river geometry outside the car's detail ring. |
| Mossy cliff shell and floating waterfall brink | Author terrain/solid support first; attach the effect to shared coordinates. |
| Independent road spans broke at turns; deck shimmered | Use shared ribbon joins, then resolve deliberate deck/terrain depth overlap. |
| Packed-dirt HUD on asphalt | Define a distinct local road surface and verify the live label and effects. |
| Repeating zigzag ground, sparse landscape | Transfer Mars's anti-striping lesson and Northern/Highlands' grounded, clustered local detail. |
| Wavy waterfall sides, round repeating shrubs and flickering ground shadows | Keep the falling-water edge steady; use varied low shrub forms with low colliders and leave tiny detail out of the shadow pass. |
| Shore foam looked like dashed road paint; west Ring Road climbed the cliff | Remove placeholder repeated strips and check the route's actual terrain height against the shoreline and escarpment. |
| A broad river rectangle remained visible past the mouth despite removing the overlapping ocean | End the river at a narrow, sea-level handoff; give the ocean sole ownership beyond it and shape the inlet shoreline around the channel. Verify at the user's exact camera, not just an overhead debug view. |
| A coastal turnout fixed the abrupt dirt-track end but initially read as a bright painted disk. | Grade a broad circular driving area and blend its colour into the track and surrounding sand; inspect it at arrival distance and from above before accepting the material. |
| The Skógá mesh and water-depth tests passed while a custom shader made the entire river invisible in the game. | Treat geometry, material and final rendered pixels as separate checks. Prefer the engine's standard RGBA vertex-colour path for static depth and estuary fades; capture the complete feature from an actual driving view after any shader or material change. |
| The Skógá river reached the brink but its wet width was much larger than the falling sheet, leaving a pale, flat-looking join. | Match the sampled wet cross-section to the waterfall width, brighten and agitate only the final approach, and curve a short overflow into the vertical curtain. Check the join from above, head-on and obliquely; preserving one shared top coordinate alone is insufficient. |

See [Iceland progress](ICELAND_PROGRESS.md) for what has actually passed and what
still awaits review. These recent fixes are not blanket acceptance of Iceland.
