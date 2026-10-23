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
4. Inspect actual game captures early, including at driving height. When using
   photo-mode captures, keep the look-at target close to the intended camera
   position along its viewing direction: orbit distance is capped at 100 m, so
   aiming directly at a distant landmark can silently move the camera forward. A passing
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
| Regional entry and reset shortcuts | [Northern starts](src/game/regional-starts.ts), [Mars starts](src/game/mars-terrain.ts), [Iceland starts](src/game/iceland-starts.ts), [URL and reset wiring](src/main.ts) | Give each completed region a unique `?area=<world>&start=<region>` ID, a dry level spawn, a useful heading, and nearest-region reset. Check direct URL entry, initial vehicle position, and reset in a real browser. Document the exact URL when a region is completed. |
| Sampled development maps | [Northern renderer](scripts/render-northern-map.ts) | Sample live terrain and water, then overlay exported routes/starts. Keep concept maps separate: unbuilt regions must not appear implemented. Embed relief in SVG for portability; preserve vector labels, grid and routes. Such maps are references, not driving-acceptance evidence. |
| Actual material-colour aerial views | [Iceland aerial renderer](scripts/render-iceland-aerial.ts), [actual-model thumbnail renderer](scripts/render-car-thumbnails.ts) | Render full-detail chunks and actual scenery/materials in Three.js with the game's lighting and tone mapping. A surface-ID palette is not a colour-faithful scene render. Use a north-up orthographic camera, disclose disabled distance fog and expanded shadow coverage, and do not widen gameplay streaming just to export an image. The user chose this [full aerial render](artifacts/iceland/iceland-aerial.png) as Iceland's single current-world map; do not recreate sampled/southern variants. |
| Haze-free pilot and reduced-gravity driving | [Moon terrain](src/game/moon-terrain.ts), [runtime](src/game/moon.ts), [pilot plan](MOON_BUILD_PLAN.md) | [Moon unit checks](tests/moon.test.ts), [browser views and drives](tests/browser/moon.spec.ts), [current evidence](MOON_PROGRESS.md). A compact fixed render mesh can avoid LOD pop-in while collision stays bounded; this is not proof of full-world render streaming or iPad performance. |

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
| Reynisfjara basalt columns looked like a comb added to the mountain. | Cover the slope with many tiers, low at the beach and progressively taller inland. Derive tops from the local hillside, bury their backs into the sampled cliff, and leave continuous rock above them. Inspect the profile from along the beach and across the shore. | [Reynisfjara terrain](src/game/iceland-reynisfjara.ts), [column/cave geometry](src/game/iceland-reynisfjara-scenery.ts), [Iceland visual captures](artifacts/iceland/reynisfjara/) |
| Sloped roads, arches and tubes looked passable but could trap or jump the car. | Grade the whole width and both approaches; use the visible triangle surface as collision, leave actual open passages, and drive both directions with the real vehicle. Diagnose wheel contacts before changing physics. | [Mars plan region gate](MARS_BUILD_PLAN.md), [Keyhole](artifacts/mars/KEYHOLE_BADLANDS.md), [Lava Tubes](artifacts/mars/LAVA_TUBES.md), [Northern beach-route tests](tests/northern-west.test.ts) |
| Floating or repeated Mars rocks; steep-ground props stretched into plinths. | Sample the entire footprint, bury supports, use matching collision, and vary placement, omission, size and form independently. Move technical props to level ground when terrain-conforming foundations become implausible. | [Mars feedback 1](artifacts/mars/FEEDBACK1_RESPONSE.md), [relay review](MARS_PROGRESS.md), [Northern prop tests](tests/northern-west.test.ts) |
| The Sólheimasandur wreck looked placed on top of a flat sand plate; its rear stabilizer touched the hull at one corner, then crossed a side opening. | Embed the lower hull in the sampled ground and overlap appendage roots with intact solid shell, clear of authored apertures. Review large props from low side views as well as overhead. | [Iceland wreck](src/game/iceland-wreck.ts), [geometry check](tests/iceland.test.ts), [low-view browser capture](tests/browser/iceland.spec.ts) |
| Rim waves, terrain stripes and visible coarse/detailed joins. | Replace periodic silhouette noise with irregular broad forms and multi-scale colour variation. Keep detailed boundary vertices in coarse chunks and test edge topology and drive-through captures. | [Mars feedback 1](artifacts/mars/FEEDBACK1_RESPONSE.md), [Northern streaming tests](tests/northern-streaming.test.ts) |
| Glass and water edges followed whole terrain triangles, giving teeth, pale gaps or false dark fringes. | Clip the visual to its true contour. Keep foreground and background surfaces under explicit ownership; remove redundant tint/shadows and check the overlap from low and high cameras. | [Mars Glassfall revisions](MARS_PROGRESS.md), [Northern river clipping](src/game/northern-terrain.ts), [Iceland mouth history](ICELAND_PROGRESS.md) |
| The sea at the Skógá mouth displayed the river's HUD name because both reached water level zero. | Classify the displayed surface from the same spatial handoff used by the rendered water, not a shared height or handling ID. Check both sides of the mouth in the browser. | [Iceland river/sea ownership](src/game/iceland-river.ts), [surface HUD check](tests/browser/iceland.spec.ts) |
| Northern river and lake banks separated from the water or made fords hard to read. | Shape bed, shallow shelf and bank together; sample the rendered collision triangles for water level/depth and clip the waterline. Keep two-way ford approaches dry enough to enter and leave. | [Alder watershed](src/game/northern-watershed.ts), [watershed tests](tests/northern-watershed.test.ts), [README](README.md#northern-reach--great-lake-and-alder-river) |
| Northern western shore needed an actual sea edge, reachable coves and a river outlet. | Blend the ground below sea level through the streamed apron, retain an open channel between spits, provide a low beach line beside harder ridge choices, and stall/recover the car in deep sea. | [Western Shores](src/game/northern-west.ts), [coastal tests](tests/northern-west.test.ts), [README](README.md#northern-reach--western-shores) |
| Small shrubs, logs and stones could look repeated or disagree with tyre contact. | Give low forms varied profiles and scale, use combined low colliders where they should be felt, inspect the result from wheel height, and keep loose props out of route shoulders. Small repeated objects generally should not cast dense shadows. | [Northern pooled props/colliders](src/game/northern-streaming.ts), [western log drives](tests/northern-west.test.ts), [Mars rock review](artifacts/mars/FEEDBACK1_RESPONSE.md) |
| Signs went black, shimmered, faced the wrong way or had awkward supports. | Preserve UVs through batching, separate readable front/back display faces, use stable unlit lettering where appropriate, and ground every visible support with matching collision. Remove a sign if the landscape guides the route better. | [Mars sign and lookout revisions](MARS_PROGRESS.md), [feedback 2](artifacts/mars/FEEDBACK2_RESPONSE.md) |
| Mars solar supports missed or pierced tilted panels; the landing-pad mark read as the wrong number. | Sample each support from its own terrain point to the actual underside of the object. Review symbols at arrival scale and simplify them until the intended meaning is unambiguous. | [Mars feedback 2](artifacts/mars/FEEDBACK2_RESPONSE.md) |
| Camera recovery entered the Scout; tall landmarks did not fit the view. | Sweep raised/alternate recovery views, use hysteresis against toggling, and extend upward gaze while preserving ground and obstacle sweeps. Reproduce at the actual obstructing structure. | [Mars feedback 1](artifacts/mars/FEEDBACK1_RESPONSE.md), [Dish camera review](MARS_PROGRESS.md) |
| Atmospheric changes altered perceived scale but could hide landmarks; extra distance silhouettes and shadow fades were later rejected. | Tune fog against named ground-level views in both engines, preserve accepted sightlines, and re-check the latest design before reviving an experiment. | [Mars feedback 1](artifacts/mars/FEEDBACK1_RESPONSE.md), [Mars later rollback](MARS_PROGRESS.md), [Mars design](artifacts/mars/DESIGN.md) |
| Hidden discoveries were exposed from some approaches; ordinary journal cards triggered only on one route direction. | Verify concealment from recorded route-level sightlines and give normal landmarks multiple visit zones along alternate entrances, while keeping true secrets narrowly triggered. | [Mars wreck/design record](artifacts/mars/DESIGN.md), [journal visit-zone corrections](MARS_PROGRESS.md) |
| Postcard trigger placement is difficult to judge from coordinate lists, and an in-game map would change the journal's scope. | Generate development-only overlays from the live postcard centres and radii on the existing world maps. Show primary and alternate circles distinctly, include secrets for review, and state the movement gate separately. Use the maps to spot gaps or overly broad overlaps, then confirm suspect routes by driving; a circle plot alone does not prove a route unlocks. | [Mars trigger map](artifacts/mars/postcard-trigger-map.png), [Northern trigger map](artifacts/northern-reach/postcard-trigger-map.png), [renderer](artifacts/postcards/render-trigger-maps.mjs) |
| A start-centred postcard circle can miss the far side of a crater, basin or mesa; one lake-shore circle missed both the opposite shore and island. | Fit a main circle to a compact landform's authored rim while retaining the start within it. For a scalloped or elongated water body, place a small set of visit circles along the real shoreline plus an island zone instead of one huge enclosing circle. Sweep the sampled boundary at shore and dry-bank offsets, then verify representative far approaches with actual driving in both engines. Keep unrelated distant precursor props outside the main region circle. | [Postcard definitions](src/game/postcards.ts), [coverage tests](tests/postcards.test.ts), [Mars/Northern review](MARS_PROGRESS.md) |
| A single circle fitted around a mesa's entire route can unlock its postcard from the unrelated outer slope. | Use a small union of circles centred over the drivable landmark when one enclosing circle extends too far. Sample the full circuit and inner traverse, including segments between authored waypoints; check representative outer-slope drives remain outside. Inspect the regenerated trigger map and real driving captures at both ends of the route. | [Ochre postcard zones](src/game/postcards.ts), [Northern trigger map](artifacts/northern-reach/postcard-trigger-map.png), [coverage tests](tests/postcards.test.ts) |
| Rich geometry made chunk transitions expensive. | Budget triangles and generation time per feature; cache immutable terrain samples, reuse horizon buffers, keep prop ownership deterministic, and measure on the intended device before declaring performance complete. | [Mars landscape and sampling reviews](MARS_PROGRESS.md), [Northern streaming](src/game/northern-streaming.ts) |
| A Moon viewpoint contained Earth in the scene, but a nearby perimeter ridge filled the camera and hid it. The shared warm vignette also tinted the supposedly black sky. | Check the actual camera projection and raycast the rendered landscape toward the sky landmark, then inspect the capture. Design the local ridge's angular height from the viewpoint, not just its map footprint. Audit UI overlays as well as scene fog when requiring a black sky. | [Moon scenery](src/game/moon-scenery.ts), [browser sightline assertions](tests/browser/moon.spec.ts), [Moon progress](MOON_PROGRESS.md) |
| Earth's procedural clouds read as repeated diagonal dashes, with stepped coasts when enlarged. | Bake irregular coherent cloud noise on spherical coordinates, blend colour boundaries, close the longitude wrap and poles, and use mip filtering for the distant globe. Inspect the actual lit sphere at driving size and close zoom, including a deliberately exposed seam; a seamless flat image alone does not establish visual quality. Keep texture generation out of the frame loop. | [Moon sky texture](src/game/moon-scenery.ts), [seam/pole and disposal tests](tests/moon.test.ts), [before/after captures](artifacts/moon/earth-texture/), [Moon progress](MOON_PROGRESS.md) |
| Centre-sampled Moon footings left gaps; a shelter spanning steep ground also clipped its deck and inverted an uphill leg. | Sample the whole footprint. Bury each footing below its lowest ground sample, clear the deck above the highest, and keep render/collision dimensions identical and positive. Move a building a little onto gentler ground rather than compensating with tall plinths. Check leg-to-deck contact and inspect from ground height. | [Moon footings](src/game/moon-scenery.ts), [dense contact and collider checks](tests/moon.test.ts), [low-view evidence](artifacts/moon/grounding/), [Moon progress](MOON_PROGRESS.md) |
| Headless Chromium's lunar frame times were much slower than WebKit despite identical geometry budgets. | Record the GPU backend before interpreting frame cadence. Software SwiftShader and hardware Apple GPU are not comparable device benchmarks; use hardware-backed Chromium for a desktop comparison and retain physical-iPad acceptance. | [Moon performance evidence](MOON_PROGRESS.md) |
| Deterministic shoreline filtering removed most seeded ice pieces, leaving only two shapes and no large stranded slab; the eastern beach later retained just one piece. | Evaluate variety, scale and count per shore after terrain, water and route filters, using the actual survivors. Follow the local dry shoreline rather than scattering over a broad rectangle, space pieces after filtering, and verify grounding, road clearance and a driving-height view on each bank. | [Iceland lagoon scenery](src/game/iceland-lagoon-scenery.ts), [ice mix regression](tests/iceland.test.ts) |

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
- Gravel shoulders need a local geological palette and a transition, not an opaque
  fixed-width strip. Iceland's brown/olive ribbons looked pasted onto the ground.
  Keep a narrow solid dark-gray edge beside the asphalt, then use several
  terrain-fitted RGBA fade bands with independently varied widths on each side.
  The zero-alpha outer edge reveals the actual local ground rather than guessing
  its colour. Use the standard material path with depth writes disabled; inspect
  both black sand and green heath from driving height and raised road-facing
  angles. See [road geometry](src/game/iceland-road-scenery.ts) and
  [current captures](artifacts/iceland/road-shoulders/).
- Road lips and structure thresholds must be physical geometry, not camera-only
  feedback. Keep ramps/depressions in shared terrain/collision and decks solid;
  verify both cars' actual suspension motion in both crossing directions.
  A broad road overlay sampled only at its corners can cut through terrain when
  a verge profile changes. Split asphalt, paint and gravel along the underlying
  terrain grid **and its diagonals**, with separate faces at deck boundaries.
  Check triangle interiors, not just vertices, and inspect reverse/oblique views.
  Derive roadside-post colliders from the same instance geometry/transforms and
  dispose them with their scenery; instancing alone does not make markers solid.
- When clipping a road overlay to terrain triangles, let that clipping supply
  interior tessellation. Redundant closely spaced collinear ribbon rows create
  many thin triangles and hurt headless/mobile driving, especially when physical
  transmission adds another render pass. Retain all authored turn joins, reduce
  intermediate surface rows, and keep paint/dash sampling independent. Recheck
  triangle interiors and saved approach views after reducing the mesh.
- Preserve a landmark's surrounding landform, not just its isolated outline.
  Lómagnúpur needed a continuous inland ridge and a broad lower gravel apron
  below the steep rock face. A standalone steep mound lost both its real shape
  and its role as the gateway to the glacier. Use reference photographs to check
  slope sections and connections before adding surface detail.
- Glacier tongues need their own lower terminal profiles, broken calving edges and
  irregularly spaced crevasses in matching render/collision geometry. Keep
  fractures clear of established viewpoint routes. Icebergs need broad broken
  slabs and unequal ridges; stretched spheres and narrow cone peaks were rejected.
  Use depth-based lagoon opacity to hide submerged glacier walls while keeping
  the immediate shallows clear. Small stranded beach ice can use transmission.
- Ice variety needs different topology as well as size: mix broad tabular roofs,
  split ridges, tilted slabs and fractured blocks, with unequal rim counts and
  triangulation. A repeated roof fan made the same facets appear transparent on
  every piece. Seed shape, clear/frosted selection, optical properties and colour
  independently; enlarge only selected pieces and keep broad silhouettes and
  matching collision. Check transparent ice after the water pass from low views.
  Do not reuse lagoon optics unchanged on black-sand shore ice: combined low
  alpha and high transmission can make stranded slabs look ghost-like. Give
  shore pieces higher opacity, lower transmission and a rougher frosted surface;
  inspect the sand showing through from raised as well as low cameras.
- Ice/rock contacts need distinct physical surfaces, not just a hard colour seam
  across one heightfield. Iceland's contour-coloured terrain left an exposed dark
  skirt below the ice and disconnected most of the calving face from the lagoon.
  Use a separate, solid ice mesh with a sampled roof and walls buried into the
  actual rock bed. Taper land-ending margins geometrically, weld roof/wall normals
  to soften the rim, and retain full-height calving walls below the waterline.
  Keep the original crevasses and vary lateral outlines as well as terminal fronts.
- A glacier tongue needs a shaped head as well as irregular side noise. Turning
  on a constant-width strip with a straight longitudinal fade can leave a square
  shoulder where it meets an elliptical cap. Curve its upper centreline and
  taper the head inside the cap, preserving the accepted lower reach. Change
  the shared shape used by ice, bed, collision and traction, not just map colours.
  Check a sampled overhead map alongside low and oblique game views; see the
  lagoon junction in `iceland-lagoon.ts` and `tests/iceland.test.ts`.
- A land-ending ice taper must finish below the bed, not a fixed distance above
  it. Leaving 2 m of exposed thickness produced a uniform vertical basal band
  despite the separate mesh and softened normals. Keep the closing contour
  buried before the roof rises into the visible ice; test sampled wall clearance
  along the entire land front. Preserve the calving-wall exemption underwater.
- Buried walls and smooth normals do not remove coarse sawteeth where two
  independent surfaces intersect. Round the shallow ice toe in real geometry
  and refine only the contact band, sampling the actual rendered ground
  triangles rather than the analytic terrain underneath them. Iceland uses
  0.6 m ice cells at land contacts and 2.4 m elsewhere, retaining a separate
  opaque solid. Colour blending is an independent appearance choice, not a
  substitute for aligned geometry. Share the adaptive
  triangles and scalar fields across the exterior, cave, surface/traction
  sampling and collision. Freeze fields along fine/coarse transitions and
  split the adjoining coarse faces into conforming fans: matching heights
  alone still left T-junctions and false exposed cavity edges. Keep the
  watertight-lip check, route grades and submerged calving exemption intact.
  Exempt the proven graded corridor from refinement as well as toe shaping:
  denser ice over its original ground triangles changed an uphill traction
  handoff and stopped both cars. Preserve that corridor's existing lattice,
  compare a failed drive with main, and do not rescue it by changing physics.
  Bound immutable sample caches and measure mesh growth instead of raising
  the whole terrain resolution. Count actual typed-buffer bytes: crossing
  65,535 vertices also promotes the index buffer from 16 to 32 bits. Iceland's
  local refinement adds about 2.1 MiB of render buffers and no draw calls;
  local desktop frame cadence is not proof of iPad Safari performance.
  Compare the reported close view as well as
  the other tongues; see [contact evidence](artifacts/iceland/glacier-contacts/).
- A terrain-colour contact blend can make a separate glacier look naturally
  dirty without changing its geometry or opacity. Blend toward the
  actual terrain triangles' linear vertex colours, including their Float32
  samples, not an independently evaluated colour/noise field. Exempt high snow
  and submerged calving ice, and keep physics unchanged.
  Different ice/ground normals can still reveal the seam despite matching
  colours. Iceland's user accepted the dirty transition after a reversible
  in-game comparison. It is now applied once during geometry construction,
  after Float32 conversion, with no toggle or retained preview buffers.
  Compare the accepted preview's actual colours and geometry byte-for-byte
  when promoting it; see `blendGlacierTerrainColors`, the permanent-colour
  unit/browser checks and `glacier-contacts/colour-preview/` evidence.
- Grade an ice/rock route as a pair of surfaces: bring the independent ice roof
  to the intended line before lowering its supporting bed, while keeping the
  closure contour buried. Grading only the roof can expose the closing wall
  again; a nominally smooth height profile can still hide a steep traction
  handoff after triangle interpolation. Leave gentler grades specifically
  through the snowline and prove both cars uphill and downhill without changing
  physics to rescue an authored slope. See `iceland-vatnajokull.ts` and its
  full-traverse tests. Carry dark rock colour below the ice intersection too:
  low green vertices can interpolate moss stripes up an otherwise dark cliff.
- Preserve the hills framing a glacier: the tongue need not stand taller than its
  valley sides. Lowering the surrounding escarpment to hide a painted seam was a
  rejected correction, not a general glacier technique. Excavate only beneath the
  ice, let its sides intersect the framing hills, and keep a separate dry viewpoint.
  Sample the highest exposed rock/ice surface for wheels and spawning. Render water
  against the submerged bed rather than interpolating a ramp from the glacier roof.
  Check horizontal visible/solid ray hits across the calving waterline, not just
  glacier height above the lagoon; inspect front, side, low and supplied cameras.
  See `iceland-glacier.ts`, `iceland-terrain.ts` and `iceland-lagoon-scenery.ts`;
  current captures are in `artifacts/iceland/glacier-solids-final/`.
- Keep generic inland relief on the inland side of a coastal circuit. When
  flattening a seaward strip, derive its side and road height from the actual
  closed route, ease down toward low shore ground, then add named landmark
  relief separately. Preserve road/deck grades and fit water to the revised
  terrain. Gate rounded-corner masks to their intended hemisphere; an ungated
  rounded-box distance also changes the opposite shore. Check all four coast
  profiles, dry road widths and actual low-angle/overhead captures.
- Enlarging a separate ice cap must also enlarge its mesh iteration bounds and
  detailed supporting terrain coverage. Share explicit footprint bounds instead
  of leaving a hardcoded mesh box behind. For a mostly subglacial crater, bury
  the unwanted half of the actual rock ridge below the ice instead of painting
  it white. Anchor shape noise locally when relocating it, and move routes only
  when requested. Verify exposed circumference and peak height against snow.
- A cave in a separate glacier needs an actual opening in the outer roof at both
  approaches. Lowering that roof to the floor instead makes a solid sloping lid.
  Clip the approach channels, close their side walls and fit a separate solid
  vault and portal rims below the retained snow roof. Keep the highest surface
  sampler separate from the driving/spawn/camera floor, and check vertical floor/
  ceiling rays plus a horizontal daylight ray through both portals. See
  `iceland-ice-cave.ts`, its scenery builder and Iceland contact/driving tests.
- A small amount of noise on a straight semicircular vault still reads as an
  engineered tunnel. Planar portal collars reinforce the detached appearance.
  Intersect an asymmetric, winding cavity with the real glacier on one shared
  triangle grid, so its inner skin and outer solid meet on the same depth-varying
  contour. Merge branch and chamber fields before meshing: overlapping shells
  leave walls across a Y junction. Grade the full cavity and chamber footprint,
  not a narrow centre strip; otherwise the floor reads as a raised causeway.
  Keep that grading footprint independent when tightening an entrance roof,
  or the floor shoulders rise again as the void becomes smaller.
  Preserve neighbouring upper routes and fade exposed grades before sampling
  bounds. Check the lip, wall-to-wall floor, hall and each fork from driving
  height as well as measuring shared render/collider seams. Current reference:
  [Iceland cavity](src/game/iceland-ice-cave-scenery.ts),
  [flat-floor/Y checks](tests/iceland.test.ts) and
  [refined cave views](artifacts/iceland/ice-cave-refined/).
- Hanging ice must be supported over its complete root footprint, not merely
  centred on a lip where the glacier has zero thickness. Inset from the actual
  three-dimensional contour, sample the visible ceiling across the base, bury
  it without piercing the outer roof, and measure clearance after taper/lean.
  A flat root plane may not fit near a thin, inclined lip: conform its vertices
  to the actual ceiling instead of moving every piece back inside. For a dense
  fringe, retain unequal lengths, lean and spacing without blocking the lane.
  Continue a snowy overhang using its shared palette and opaque material at the
  roots, not unrelated transparent blue cones behind a dark band. Verify final
  tip clearance, smaller-mouth sightlines and real driving rather than keeping
  an obsolete tall-vault clearance requirement. Keep visible/solid geometry and
  disposal together; see `buildIceCaveIcicles`.
- Matching the snow palette and burying individual icicle roots still left
  Iceland's entrance looking knife-cut: a dark gap separated the white outer
  edge from pieces mounted farther back on the ceiling. Roll the actual outer
  contour down into a continuous, irregular curtain instead. Share the roof's
  vertex colours and normals at its front join, round the shoulder through
  depth, and end it in unequal flat hanging points rather than repeated cones.
  Bury the back in sampled ceiling triangles; share columns across source
  edges and close the ends so each mouth is one watertight solid. Verify the
  connected topology, root lighting, final point clearance and real drives,
  then compare the same close camera with the rejected attached-piece version.
  Reuse the existing glacier buffers; do not rebuild or refine the whole cap.
  Closing the strip at a height cutoff still left blunt caps on its sides.
  Measure distance along the real contour from both ends and ease the profile
  back into its buried attachment over several metres. Keep a finite closed
  cross-section inside the solid rather than collapsing it into degenerate
  triangles. Check terminal face interiors as well as their vertices against
  the roof and ceiling, and inspect both shoulders of every entrance.
- Runtime frame cadence and generation time are separate performance gates.
  A profile on a branch predating a geometry change cannot clear that change's
  loading cost. Record isolated builder measurements as such, not as complete
  world-load benchmarks or physical-device acceptance.
- Leaving photo mode restores streamed terrain asynchronously. Browser drives
  must wait for playing mode before placing the vehicle, then wait for wheel
  contact and settling before input. Otherwise placement can preserve loading
  mode and falsely look like a handling failure. Wait for reset readiness before
  checking exact destination coordinates; do not loosen driving assertions.
- Suspension-bridge approaches must stay straight beyond the outer cable anchors,
  not merely through the deck. Jökulsá's original immediate east turn put a stay
  and anchorage in the road. Reserve the full asphalt/shoulder envelope through
  the anchor zone, check every stay/anchor vertex against it, and inspect the
  departure from above and from driving height before accepting the alignment.
- Natural rocks, arches and caves must have irregular, asymmetric geometry:
  unequal shoulders, broken outlines, variable thickness and depth, and buried
  connections to surrounding rock. Perfect primitives, symmetric gates and repeated
  extrusions look built by people. Use [Keyhole's rock ribs](src/game/mars-keyhole-landmarks.ts)
  and [Mars lava tubes](artifacts/mars/LAVA_TUBES.md) as proven references. Inspect
  from the arrival camera and inside the passage, with matching solid geometry.
- Ground stones across their footprint, not just at the centre. Large rocks need
  buried skirts/support sampled around the base, with the visible shape and solid
  collision in agreement. Exclude loose scatter from steep cliff walls.
- Evaluate clearance **after** final jitter/cluster offsets. Keep roads, ford
  entrances, trails, reset sites and discoveries' accessible lines clear. Decide
  deliberately which props are solid: large obstacles/trunks must be; tiny ground
  dressing and crowns may be decorative. Do not hide invisible blockers in a route.
  A trail-side marker pair can still straddle an intersecting road at its entry;
  inspect junction stations separately and remove unwanted markers before building
  both their visible and collision meshes. Check both ends of a through-route.
- Use instancing, stable seeds and one owner per prop cell; release owned resources.
  Cluster detail and leave intentional open ground, including bare black sand.
  A generated field with no near-camera detail is not a finished region.
- Northern Reach gives low shrubs a combined six-sided collider mesh and omits
  small prop shadows. Carry both visual shape and collision policy forward:
  flattened crowns, multiple deterministic variants, low solid forms, and no
  dense repeated shadow pattern over the ground.

### Iceland coastal palette preference

The user approved pale blue-green shallow sea water at the shore (2026-10-19)
and requested it around the whole Iceland coast. Preserve this depth-based fade
into dark deep sea when extending regions. Sea, river mouths and lagoon handoffs
must share colour/opacity at their ownership boundaries; do not add overlapping
water sheets. Ignore the submerged outer streaming apron when colouring shallows:
its raised terrain is not another coastline. River carving must only lower land
at an ocean outlet: forcing deeper seabed back up to a fixed river depth creates
an artificial rectangular shallow shelf even when the water mesh joins correctly.

## Roads, collision and landmarks

- Iceland Route 1 should have dark gravel shoulders, small yellow markers with
  reflectors, sparse shoulder grit and restrained nonperiodic asphalt variation.
  Markers are flexible decorative posts clear of junctions and bridge decks.
  Mild height variation must live in the shared road grading used by terrain and
  driving; keep decks level and ease their approach transitions without steps.
- Build a continuous road mesh with shared joins at bends. Separate rectangles
  caused gaps and overlapping markings in Iceland. Check the mesh topology and
  inspect an overhead bend as well as a normal driving approach.
- Grade the full width, shoulders, switchbacks and connections. A centreline that
  passes a slope check does not prove the wheel paths are safe. Drive both ways
  with the actual cars; fix geometry before changing established vehicle physics.
- Removing a route means removing its grading, markers and scatter exclusions,
  not just its map line. Keep these consumers on one route definition; check a
  former endpoint returns to natural ground without disturbing the retained
  through-route. See Iceland's removed Grímsvötn spur and route/contact tests.
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
