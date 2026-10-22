# Iceland implementation progress

## Tapered overhang sides — 2026-10-22

- User identified exposed, abruptly cut caps on both sides of the new white
  overhang. Preserved the supplied image as
  `artifacts/iceland/ice-cave-lips/user-abrupt-sides.png` and retained the
  preceding same-camera views under `ice-cave-lips/side-endings/before/`.
- Reference: the current continuous, closed curtain and its ceiling-buried
  attachment. The old 4.8 m clearance filter ended that curtain at full profile
  thickness. Adapted the existing geometry rather than adding end decorations:
  measure contour distance from all six ends and smoothly retract the hanging
  profile into its supported back over the final 3.2 m. The closed end keeps
  a small finite section entirely inside the ice, avoiding both visible slabs
  and zero-area collapsed geometry. The central rounded lip stays intact.
- Same 2,655 vertices, 5,298 triangles and single draw batch. No extra terrain
  refinement, material, collider or per-frame update. Floor, routes, cavity,
  accepted dirty contact colours and final driving clearance are retained.
  An isolated fringe-builder probe took about 144 ms; this is not a world-load
  benchmark and does not clear the outstanding generation-performance gate.
- Three focused unit checks pass: cavity/solid agreement, the closed lip and
  its six buried terminations, and permanent contact colours. The strengthened
  lip check samples the vertices and interiors of every terminal face between
  the actual ceiling and roof, verifies a multi-column taper, retains full
  central projection, and still checks watertight topology, matching Rapier
  hits and final clearance. Typecheck/production build pass.
- Chromium/WebKit entrance scenarios pass 2/2 (3.2 minutes), covering the reported northern angle,
  close views of both shoulders at all three mouths and six entrance drives
  per engine. Current views replace `ice-cave-lips/{chromium,webkit}/`; the
  single aerial is refreshed. No whole-cave unit drives were repeated because
  this only retracts the local fringe and the browser cases exercise every
  affected entrance in both directions.
- **Next:** user review of the tapered sides at
  `http://localhost:5173/?area=iceland&start=ice-cave`. Physical iPad Safari and
  refined-world loading comparisons remain open. Work remains uncommitted;
  unrelated work and user images are preserved. Full-project/PWA suites were
  not rerun for this local geometry correction; last full suite remains
  2026-10-11. Lakagígar/sandur is unchanged and not started here.

## Rolled white entrance lips, not attached icicles — 2026-10-22

- User reported knife-cut cave edges and requested the white top surface itself
  continue down into hanging ice, without requiring round cones. Reproduced the
  defect at the same close southern camera: the old fitted cones still sat
  behind a dark, sharply cut edge despite sharing the snow palette.
- References: the shared cavity/exterior contour, `buildIceCaveIcicles`, its
  ceiling-root and driving-clearance checks, and the accepted opaque snow
  material. Replaced the discrete pieces with three connected curtains built
  from the actual exposed roof contours. A rounded depth profile flows into
  irregular flat hanging points; its front inherits the existing snow vertices'
  colours and normals, while its back is buried in real ceiling triangles.
  Adjacent source edges share columns and the ends are closed. No new planar
  portal collar, extra draw call, shader or terrain refinement was added.
- One batch contains 146 hanging points, 2,655 vertices and 5,298 triangles,
  versus 97 / 2,716 / 5,044 before. Buffer storage is 127,368 bytes versus
  128,040 before. Minimum final-vertex clearance is 3.95 m. The main glacier's
  positions, normals, indices and accepted dirty colours remain byte-identical.
  The flat floor, Y layout, hall, high traverse and calving face are unchanged.
- Six selected unit checks pass across the initial run and focused repeat:
  cavity/solid integration, the new continuous lips, both cars over all three
  full cave/return routes in both directions, calving/roof agreement and
  permanent contact colours. The new check proves three closed connected
  solids, inherited roof normals/colours, buried backs, bounded mesh size,
  final clearance and matching visible/Rapier hits beneath the hanging points.
  An obsolete length calculation measured only tip records, not the new
  continuous lower outline; it now measures all actual outline columns and
  passes. Production geometry was unchanged during that test correction.
  Typecheck and production build pass.
- Chromium and WebKit final entrance scenarios pass 2/2 (about 1.5 minutes
  each), including all three approaches, close/oblique views and six real
  entrance drives per engine. Inspected the actual driving-height captures,
  including the before/after southern close-up and all three mouths. The
  white top now visibly rolls into the fringe, rather than ending above a row
  of attached pieces. Current evidence and retained before views:
  `artifacts/iceland/ice-cave-lips/`. The single aerial is refreshed.
- The isolated Node fringe-builder probe fell from about 425 ms before to
  139 ms after (199 ms during concurrent validation), reusing the already-built
  glacier and reducing repeated ceiling raycasts. These are individual builder
  probes, not a whole-world loading benchmark. The user clarified that the
  separate loading investigation runs on a branch predating detailed contacts:
  current refined-world loading therefore remains unverified, independently
  of the earlier desktop frame-rate sample. Physical iPad Safari performance
  also remains open.
- **Next:** user review at
  `http://localhost:5173/?area=iceland&start=ice-cave`; retain the existing loading
  and device-performance gates. Lakagígar/sandur is still the next planned
  region, not started here. Work remains uncommitted; unrelated changes and
  user images are preserved. Full-project/PWA suites were not rerun for this
  local scenery replacement; last full suite remains 2026-10-11.

## Permanent dirty contact colours; retained geometry — 2026-10-22

- User accepted the earthy fade as more natural and requested removal of the
  comparison controls. Promoted that exact appearance to the normal glacier
  builder. Removed the G shortcut, pause-menu button and reversible-colour
  cache. Reloads and location changes no longer switch back to clean contacts.
  References: the accepted live preview, actual Float32 ground-triangle colours
  and its unit/browser comparisons; the adaptation is applying the blend once
  after mesh attributes are created instead of keeping alternate buffers.
- The separate rounded solid is retained, as the user permits if technically
  reasonable. It has 137,483 triangles, about 55,600 more than the coarse
  version, with no additional draw calls or per-frame mesh generation.
  Actual render buffers total 4,174,872 bytes (3.98 MiB), up about 2.07 MiB,
  including the switch from 16-bit to 32-bit indices above 65,535 vertices.
  This is render-buffer storage, not total CPU/physics memory.
- Local macOS measurements at the western-cave driving camera, 1080 × 810,
  pixel ratio 1, 25 active render chunks and normal graphics: Chromium median
  and 95th percentile 16.7 ms; WebKit median 17 ms / 95th percentile 18 ms
  across 240 frames each. Both recorded 106 draw calls and about 2.20 million
  rendered triangles across passes. No immediate local frame-cadence issue
  was observed. This is neither an iPad benchmark nor a before/after comparison;
  physical iPad Safari performance remains open. Recorded sample:
  `artifacts/iceland/glacier-contacts/frame-timing.json`.
- Permanent colours match the accepted enabled preview byte-for-byte:
  colour SHA-256
  `834cd1a23072c9b63268a4422680fccc4f1a6656b553b433636f468d1a4ec092`.
  Position, normal and index hashes also match exactly. No geometry, route,
  traction, collision, floor or cave-layout changes were made for promotion.
  High snow and underwater calving ice stay clean; the blue cavity and white
  fringe are unchanged.
- Four selected unit checks and typecheck/production build pass. Final
  Chromium/WebKit margin and permanent-default scenarios pass 4/4 (2.9 minutes),
  including no preview control, no G effect, exact parked screenshot stability
  and unchanged colours after reload. Inspected actual close-angle images in
  both engines; refreshed current contact captures and the single aerial.
  Historical before/after images and the supplied user image are preserved.
- **Next:** physical iPad Safari acceptance of the retained refinement; Lakagígar
  and sandur remain the next planned region, not started by this colour change.
  Work remains uncommitted. Long driving suites were not repeated because the
  solid buffers are byte-identical to their validated versions. Full-project
  and PWA suites were not rerun for this appearance-only promotion; last full
  suite remains 2026-10-11. Unrelated beach, Mars and postcard work is preserved.

## Optional live terrain-colour fade comparison — 2026-10-22

- Historical comparison, superseded by the permanent appearance above.
- User requested an alternative they could try while playing, not screenshots.
  Added a development-only **G** shortcut while driving/in photo mode and a
  touch-accessible **Glacier colour fade** button in the pause menu. Off by
  default; reload or changing location restores the original appearance.
  This is an explicitly requested comparison, not a replacement of the
  accepted separate solid glacier or rounded contacts.
- References: existing glacier vertex colours, the terrain triangle sampler,
  coastal turnout's vertex-based transition and development instrumentation.
  Adapted to opaque RGB blending instead of opacity: shallow ice fades toward
  the exact ground triangles' linear Float32 colours over the first 3 m of
  height above the bed. High snow and the full calving-water contact retain
  their original colours. Original/faded arrays are cached per geometry with
  weak ownership; toggling back restores every original colour exactly.
- Positions, normals, indices, collision, traction and routes are unchanged.
  The white entrance fringe and blue cavity are not recoloured. Inspected the
  close reported-angle comparison: terrain colour softens the boundary but
  produces an earthy transition; separate surface normals remain perceptible.
  The existing default aerial is unchanged.
- Four selected unit checks and typecheck/production build pass. Final
  Chromium/WebKit live-toggle cases pass 2/2 (about a minute), covering keyboard
  and pause controls, changed opaque colours, unchanged parked view and mesh
  counts, exact restoration and area isolation. Coverage caught and corrected
  preview-button reset placement during area changes. No long driving suites
  were repeated for this colour-only alternative.
- Evidence: `artifacts/iceland/glacier-contacts/colour-preview/{chromium,webkit}/`.
  **Next:** try G at `http://localhost:5173/?area=iceland&start=ice-cave`
  and compare at the same viewpoint. Work remains uncommitted; the default
  remains the rounded, distinct ice edge until the user chooses otherwise.
  Physical iPad Safari/performance, full-project and PWA coverage remain as
  recorded below; last full suite remains 2026-10-11.

## Rounded glacier/terrain contacts — 2026-10-22

- User reported sharp, coarse ice/rock intersections beside the western cave.
  Preserved the supplied image in
  `artifacts/iceland/glacier-contacts/user-sharp-edge.png` and reproduced the
  southern contact at driving height, with a same-camera baseline.
- References: the accepted separate glacier's buried land closures, shared
  cavity/exterior clipping and exact render/Rapier/sampler checks. Adapted that
  technique with a rounded shallow land toe and local 0.6 m ice triangles.
  The ground and broad cap retain their 2.4 m lattice. Ice remains a distinct
  solid and material: no transparency fade, terrain paint, extra skirt or
  removal of the framing hills.
- Exterior, cavity, occupancy, roof sampling and collision share the adaptive
  triangles and scalar fields. Fractional vertices use the actual ground
  triangles, including the special compressed waterfall row, not a different
  analytic bed. The first transition prototype failed the existing exposed
  cavity-edge assertion: freezing heights alone left T-junctions. Conforming
  coarse-face fans fixed the topology without relaxing that check.
- Extended driving found an eastern uphill handoff regression near
  `(533, 376)`: both cars stopped after refining the graded corridor, despite
  exempting it from toe rounding. Reproduced the modern-car failure alone and
  compared it with an isolated committed-main snapshot, where the same drive
  passed. Preserved the original ice/bed triangles wherever a cell touches the
  fully graded traverse. Added route-wide lattice assertions; changed neither
  vehicle physics nor the driving test's requirements.
- Final glacier: 70,141 vertices and 137,483 triangles versus 41,955 / 81,886
  before contact refinement, below the regression's 150,000-triangle budget.
  Bounded immutable grid caches and fixed fractional sample memoisation avoid
  repeatedly evaluating the fields. No additional scenery object or draw call.
  Calving walls retain their full underwater contact.
- Refitting against the refined lip gives 97 icicles: 36 south, 30 north and
  31 west, in 5,044 triangles; the cavity has 3,368 triangles. The final
  graded-route exemption leaves the cavity and fringe's complete vertex,
  colour, normal and index buffers byte-identical to the preceding validated
  version. Flat floor, hall, smaller throats, Y layout and tip clearance remain
  unchanged.
- Final nine selected unit checks pass: rounded toes and route lattice,
  exact roof/bed/render/Rapier contacts, submerged calving walls, tongue
  profiles/traction, cave and icicle geometry, sampled traverse, broad grades,
  and both cars over the complete upper passage in both directions.
  Typecheck and production build pass. The preceding extended run also passed
  both-car cave/Y/return drives, deterministic chunk/LOD seams and
  stale-worker/disposal checks; its two upper-route failures are fixed above.
- Chromium and WebKit passed all eight glacier-margin, terminal-approach,
  entrance and full cave/Y/return/hall/reset scenarios (10.9 minutes).
  After the route exemption, repeated final contact and entrance scenarios
  passed 4/4 (2.1 minutes). The cave geometry was byte-identical, so its long
  drives were not needlessly repeated after that correction.
- Inspected the close southern comparison, northern mouth, both tongues and
  calving views. The large sawteeth are reduced and the toe is rounder; the
  contrasting white/dark boundary and some fine faceting remain, rather than
  blurring the two materials together. Saved final dual-engine views in
  `artifacts/iceland/glacier-contacts/{chromium,webkit}/`, refreshed the cave
  gallery and regenerated the single actual-material aerial.
- **Next:** review the contact locally at
  `http://localhost:5173/?area=iceland&start=ice-cave`; Lakagígar/sandur remains
  the next planned region. Work remains local and uncommitted. Physical iPad
  Safari and its performance gate remain open; full-project/PWA suites were
  not rerun for this local scenery change. Last recorded full suite remains
  2026-10-11. Unrelated beach, Mars and postcard work is preserved.

## Smaller mouths and a white glacier fringe — 2026-10-22

- User requested a fringe instead of scattered icicle clusters, smaller
  driveable openings that reveal less of the interior, and roots continuing
  the white upper glacier surface. This supersedes the tall, widely spaced
  entrance dressing described below.
- Reference: the accepted shared-grid cavity/glacier intersection,
  `buildIceCaveIcicles`, its whole-root contact checks, and the existing
  glacier's snow palette and opaque material. Lowered and narrowed the three
  entrance throats through the shared cavity field, easing back into the
  unchanged winding passages and large hall. Central throat heights are
  approximately 7.2–7.7 m rather than the former full-height vaults.
  The roof remains joined to the real cap, not a new front panel or collar.
- Preserved the original full-width floor grading separately from the
  constricted roof. The first geometry check caught rising shoulders when
  grading followed the newly smaller void; retaining the original grading
  footprint fixes that without excavating the neighbouring upper route.
- The current fringe has 88 unequal pieces: 36 south, 29 north and 23 west,
  approximately 0.6–3.4 m long, in one 4,576-triangle solid batch.
  Roots sit closer to the true lip and conform vertex-by-vertex to its
  ceiling, buried below the snow. A flat root plane rejected too many
  near-edge pieces; fitted roots retain full contact without moving the
  fringe back inside. The lip and roots now share the actual glacier snow
  palette; the fringe uses its opaque, rough material rather than the
  previous separately transmitting blue decoration. Tips retain a subtle
  pale icy tint. No loose floor ice was added.
- Regression checks measure 5–9 m central throat clearance, solid walls
  bounding each smaller mouth, screened upper-interior sightlines, the
  unchanged broad level floor and hall, neighbour density across the fringe,
  shared snow colour, buried roots, exact render/Rapier contacts, and over
  3.8 m clearance beneath every final bent vertex. Six focused
  geometry/terrain/streaming/disposal checks and typecheck/production build
  pass. The aperture-change run passed ten selected checks, including both
  cars driving the main passage, Y branch and hillside return both ways, plus
  both directions over the preserved higher cap passage. Final Chromium and
  WebKit scenarios passed (4/4): entrance views/materials and all three real
  cave routes in both directions, hall placement and nearest reset.
- Inspected final Chromium and WebKit views of all three mouths and the close southern
  lip at driving height: white roots read as part of the overhang, while the
  smaller throats screen the upper interior. Refreshed the actual-material
  aerial. Current captures are preserved in
  `artifacts/iceland/ice-cave-refined/{chromium,webkit}/`.
- **Next:** view the smaller white-fringed mouths locally at
  `http://localhost:5173/?area=iceland&start=ice-cave`.
  Work remains local and uncommitted. Physical iPad Safari,
  full-project and PWA checks have not been rerun; the last recorded full
  suite remains 2026-10-11. Lakagígar/sandur remains the next planned region.

## Western cave entrance icicles — 2026-10-21

- User accepted the revised cavity/hall/flat-floor shape and requested entrance
  icicles. Added 46 irregular hanging pieces: 22 at the southern mouth, 16 at
  the northern mouth and eight at the western fork. Lengths range from about
  0.8 to 5.3 m, with uneven spacing, omissions, thickness, taper and slight
  lean. The accepted cave geometry, level floor and routes are unchanged.
- References: the existing cavity's shared three-dimensional lip and exact
  contact checks, the lagoon's seeded `fracturedIce` variation/physical ice
  material, and existing scenery render/collider/disposal ownership. Adapted
  footprint grounding for hanging forms: inset candidates from the actual
  lip, ray-sample the entire root footprint against the visible ceiling, bury
  the base in ice and reject roots that could poke through the snow.
- All final vertices retain over 10 m of floor clearance. The lightly
  transmitting pale ice is one 2,392-triangle batch with the identical Rapier
  mesh, owned and disposed by existing scenery. No new floor obstacles,
  falling debris or motion were introduced.
- The cavity and new icicle geometry/contact units passed, as did typecheck
  and production build. The final four-view entrance scenario passed in
  Chromium and WebKit (2/2); inspected each mouth at driving height and a
  close southern view. An initial browser lookup used an orphaned, no-HMR
  test server with cached scenery; identified and stopped that session-owned
  process, then reran against a fresh server. This was not a missing runtime
  mesh. Preserved corrected views in
  `artifacts/iceland/ice-cave-refined/{chromium,webkit}/` and refreshed the
  single actual-material aerial.
- Full drives were not repeated for this high-clearance decoration; their
  preceding two-car and dual-engine cave results remain recorded below.
  Full-project/PWA suites and physical iPad Safari were not rerun. Last
  recorded full-project run remains 2026-10-11.
- **Next:** review the entrance detail locally at
  `http://localhost:5173/?area=iceland&start=ice-cave`. Cave work remains
  uncommitted; no unrelated beach, Mars or postcard edits were changed.
  Lakagígar/sandur remains the next planned region.

## Western cave: glacier cavity, Y junction, hall and flat floor — 2026-10-21

- User rejected the regular tunnel attached to the glacier and requested a
  naturally integrated entrance, non-straight passage, possible Y junction,
  underground hall and a flat floor rather than a raised strip. This supersedes
  the earlier two-portal cave geometry and its captures below.
- The shared guide already warned against symmetric primitives and repeated
  extrusions. The first implementation did not carry that lesson far enough:
  small centreline noise and blue ice did not disguise a semicircular tube and
  planar portal collars. References for this correction: Mars
  `lavaTubeGeometry`, its solid/open-passage tests and the guide's buried,
  unequal forms; Iceland's exact glacier triangles and render/collider checks.
  Reviewed the user's [flat-floor entrance reference](https://thumbs.dreamstime.com/b/ice-cave-26646831.jpg).
  The supplied Westend61 Plaine Morte image returned HTTP 402, so no visual
  comparison with that image is claimed. Reference URLs remain preserved in
  this conversation; the fetched preview is kept in session artifacts.
- Replaced the separate extruded arch with a cavity intersecting the actual
  glacier solid. The inner blue skin and outer snow use the same global
  triangles and interpolated clearance field: their lip meets along a shared
  three-dimensional contour, without front panels, a collar or a detached
  shell. The broad, noisy rounded glacier shoulder attaches to the cap rather
  than following the tunnel as a narrow strip. Unequal widths, shear, scallops
  and changing roof height are actual geometry, not just colour variation.
- The main passage now bends from `(112, 331.2)` through `(132, 310)` and
  `(142, 287)`, turning northwest through `(132, 265)` toward the northern
  mouth. A western fork through `(110, 256)` and `(88, 248)` exits to the
  hillside return at `(70, 240)`. All three mouths have a return route.
  The branching cavity is merged before meshing, so no second shell blocks
  the Y junction.
- Added an irregular underground hall centred near `(130, 270)`, with an
  approximately 50 by 58 m ceiling footprint and three passage openings.
  Lowered the main cavity/hall floor from 84 m to the southern clearing's
  78 m level, and graded the full cavity width to the walls. Removed the
  narrow bright-blue driving ribbon; the broad floor is muted frosty gravel/
  ice, with gravel on exposed approaches. The external hillside return keeps
  its gentle elevation changes. The original higher glacier traverse remains
  above the cavity and retains its grades.
- Early checks caught a missing northern terrain chunk in the expanded geometry
  test, and the first broad floor grade disturbed an upper-route shoulder.
  Restricted the full cavity excavation to the actual underground extent,
  preserving the exposed ascent. Also faded outside grades before the sampling
  bounds to prevent a new approach step. These are geometry/test-fixture
  corrections, not vehicle-physics changes or relaxed drive-completion checks.
- Final checks: nine focused unit/real-driving checks passed: geometry,
  wall-to-wall level floor, broad hall,
  three-dimensional mouth contact, open fork lanes, exact visible/solid roof
  and floor, safe start, original traverse grades/contacts, chunk/LOD seams,
  stale/error worker handling, full disposal and calving-water contact. Both real
  cars completed the main passage, Y branch and hillside return in both
  directions after lowering the floor. The final envelope correction and direct
  blocked-line/flat-floor regression were rechecked separately; typecheck and
  production build passed. The cavity's nominal north/south span remains 120 m,
  but a solid wall now interrupts the straight line between them.
- Final Chromium and WebKit cave scenarios passed (2/2), each driving all three
  routes in both directions, checking the actual hall floor/ice HUD and nearest
  reset. The earlier interrupted browser run is not counted as a pass.
  Compared actual low portal, oblique glacier, hall and driving-height captures
  under `artifacts/iceland/ice-cave-refined/{chromium,webkit}/`. The old cave
  directory is superseded evidence, not the current accepted shape; intermediate
  raised-floor trial views were moved to session storage.
- Regenerated the single 3072-square actual-material aerial and the separate
  concept SVG/PNG, including the winding route, hall and Y branch. The user's
  local server remains running.
- **Next:** user visual review at
  `http://localhost:5173/?area=iceland&start=ice-cave`.
  Work is uncommitted; unrelated beach, Mars and postcard work is preserved.
  Physical iPad acceptance remains open, and no full-project/PWA rerun is
  claimed; the last recorded full-project run remains 2026-10-11. The region
  stays internal. Lakagígar/sandur follows user review of this cave.

## Eastern Jökulsá beach ice — 2026-10-21

- The user found only one small piece of ice east of the outlet. A fresh Chromium capture from `(541, 3.2, 685)` confirmed it. The existing eastern scatter used a broad `z = 675–699` rectangle; the narrow beach falls below the water surface across most of that range, so nearly all candidates were filtered out.
- Reference: the existing `fracturedIce` forms, shore materials and `add(..., true)` render/collider ownership in `src/game/iceland-lagoon-scenery.ts`, plus its ice-mix regression in `tests/iceland.test.ts`. Kept that technique, its western placements and lagoon ice. Adapted the eastern candidates to follow the sampled dry-shore slope, retain a shallow-ground filter, and keep at least 6 m between survivors. A modest size floor makes the smaller pieces visible from the beach. The eastern side now has five distinct pieces instead of one; the west still has four. All five eastern pieces are solid, partly buried and more than 18 m from the Ring Road.
- The focused ice unit check, typecheck, production build and `git diff --check` passed. Compared identical beach-level Chromium captures before/after and inspected the final WebKit view under `artifacts/iceland/east-beach-ice/`. Both final views show the scattered group along the waterline with the road open above it. This was a focused visual check; the long five-view browser scenario, full unit/browser suites and physical iPad Safari review were not run for this local correction.
- Next: user review of the eastern beach in the game; keep the separate cave and postcard work out of this ice commit. Continue the previously planned Iceland region work after that review.

## Western ice margin: drive-through cave — 2026-10-21

- Committed and pushed the accepted Vatnajökull/coastal/map/junction work as
  `49a2046`. Left concurrent Mars/postcard changes uncommitted and untouched.
  The ordinary push could not find a password through `osxkeychain`; succeeded
  with the saved github.com login through a command-local `gh auth git-credential`
  helper, without changing credential configuration or persisting credentials.
- Built the next planned slice: a 120 m fictional western-margin ice cave near
  `x = 105`, between `z = 211.2` and `331.2`. A gently unequal blue layered vault
  and two open portal rims sit below the opaque glacier roof. Light physical
  transmission distinguishes the ice from snow without an alpha-blended shell.
  The sampled floor is approximately 84 m high; the 8 m-wide easy lane has more
  than 12 m of headroom. Visible vault, rims and approach walls are solid.
- The southern gravel approach joins the accepted western ascent at `(120, 370)`.
  The northern portal connects to an open-air hillside return through
  `(70, 190)`, `(70, 270)` and `(70, 330)`, closing the loop at the south approach.
  Both entrances have daylight and a clear driving line; no new cairns were added.
  The existing higher cap traverse remains the alternative above the cave.
  Lakagígar and Askja connectors are explicitly future work.
- Added internal start/reset `?area=iceland&start=ice-cave` at `(95, 350)`,
  facing the south portal. Kept highest-surface sampling for the snow roof
  separate from driving/spawn/camera floor selection inside the cave.
  Ground scatter excludes the complete final route offsets. Existing scene
  ownership disposes the vault material/geometry and its Rapier collider.
- References: Mars `lavaTubeGeometry` and tube tests for a real separate vault
  over a graded terrain floor, shared render/collision triangles, open portals
  and actual drives; Iceland's independent glacier, paired grading, exact
  sampling, cairns and regional starts. Adapted the technique for a single
  translucent ice vault and continuous retained snow roof, rather than copying
  Mars's collapsed rock skylights. Both exposed approaches are clipped out of
  the glacier roof; lowering the roof into a channel would create a solid lid.
- Initial checks caught overlapping fork grades and interference with the
  existing through-route shoulders. Moved the vault slightly north, joined both
  lower branches at one equal-height point, and preserved primary-route grades
  through the exposed approach. The first browser drives failed before entering
  the cave; an isolated reproduction passed after the browser drive helper
  waited for wheel contact and settling, matching the unit driver's idle start.
  No physics tuning or relaxed drive-completion assertions.
- Focused unit coverage passed: portal daylight ray in both directions; exact
  floor/vault collision and measured headroom; dry level regional starts; the
  retained traverse/low brown rim and exact glacier/rim contacts; both real cars
  on the complete cave and return routes both directions; retained cairn
  omissions; exact chunk/LOD seams; worker errors/stale results and complete
  collider disposal; accepted solid glacier/calving contact. Typecheck/build
  passed. The final flat clearing also passed a full-wheelbase height check;
  Chromium remained stationary at `(95, 350)` after settling and reset there.
- Earlier WebKit runs failed while loading, not at a cave obstacle. Returning
  from photo mode streams terrain asynchronously; vehicle placement started too
  early and retained loading mode. The browser helper now waits for playing mode
  before placement, then wheel contact and settling. Reset checks wait for the
  reset button to re-enable before asserting the unchanged exact destination.
  The final cave and plateau scenarios passed in Chromium and WebKit (4/4),
  including cave/return drives in both directions and nearest reset. No physics
  changes or weakened position/drive assertions.
- Refreshed the single aerial and concept map for the cave. Preserved actual
  portal, interior, margin and driving-height captures under
  `artifacts/iceland/ice-cave/{chromium,webkit}/`; reviewed the blue vault and
  stable angled arrival. The region remains internal and awaits user visual
  review. Physical iPad Safari and ordinary software-headless Chromium
  acceptance remain open. No full-project or PWA suites were rerun for this
  local region; the last recorded full-project run remains 2026-10-11.
- **Next:** user visual review at
  `http://localhost:5173/?area=iceland&start=ice-cave`. This cave work is not
  committed. Lakagígar and sandur are the next planned region after review.

## Eastern entry: clear the lower cairns — 2026-10-21

- Removed the final two eastern marker pairs (four cairns) along the approach
  from `(610, 485)` to `(635, 530)`. One sat on the asphalt and the final pair
  straddled the Ring Road. The preceding uphill pair, western correction,
  route grading and all other markers remain unchanged.
- Reused the western entry correction in `iceland-scenery.ts`: omit these
  stations before generating the shared visible/solid cairn mesh. Expanded its
  focused unit test to verify all six removed cairns across both junctions,
  their absent colliders and the retained uphill pairs. It passed, as did
  `npm run build` including typecheck. Full driving/browser/PWA suites were
  not rerun for this obstacle-only removal.
- Preserved feedback as `artifacts/iceland/feedback/eastern-route-bottom-cairns.png`.
  Inspected the actual Chromium/Metal junction capture at
  `artifacts/iceland/vatnajokull/chromium/eastern-entry-no-bottom-cairns.png`;
  the road and lower approach are clear. Refreshed the single aerial map.
  Changes remain uncommitted.
- **Next:** user visual review; western ice cave remains the next planned slice.

## Western entry: remove the lowest cairn pair — 2026-10-21

- Removed only the first paired cairns on the western ascent, near
  `(156.06, 583.90)` and `(146.94, 606.10)`. The latter sat on the Ring Road.
  The next pair and every remaining marker, route grade and entry stay unchanged.
  Reference: existing paired cairn generation and its shared visible/collider
  mesh in `iceland-scenery.ts`; omitted that station before stone generation so
  no invisible obstacle survives.
- Added a focused unit regression checking the exact remaining stone count,
  both removed footprints, and the next pair's visible geometry and Rapier
  collision. It passed; `npm run build` passed with typecheck. Inspected an
  actual Chromium/Metal ground-height capture of the cleared junction.
  Full driving/browser/PWA suites were not rerun for this two-obstacle removal.
- Preserved the user's image at
  `artifacts/iceland/feedback/western-route-bottom-cairns.png` and the corrected
  view at `artifacts/iceland/vatnajokull/chromium/western-entry-no-bottom-cairns.png`.
  Regenerated the single full-world aerial map. Work remains uncommitted.
- **Next:** user visual review; western ice cave remains the next planned slice.

## Coastal reshaping, northern crater and through-route only — 2026-10-21

- Applied the user's confirmed scope: low coastal ground outside the Ring Road
  around the whole island, except existing named landmarks. Removed the generic
  eastern seaward mountains without flattening Skógafoss, Reynisfjall or
  Lómagnúpur. Rounded all four island corners and retained dry road clearance.
- Enlarged Vatnajökull northward and westward to about 0.172 km² of exposed
  ice including its tongues. Expanded the shared glacier mesh bounds and
  detailed supporting terrain, preserving the accepted lower tongues and
  underwater calving walls. Grímsvötn is now warm brown, about 122 m high
  against 110 m snow, with roughly 44% of its rim exposed.
- Moved Grímsvötn from `(310, 232)` to `(310, 143)`: 89 m north, approximately
  40% of the former distance to the northern ice margin. Anchored its noise in
  crater-local coordinates to preserve the unequal shoulder shape.
- Latest route decision supersedes the earlier request to leave routes alone:
  removed the former Grímsvötn overlook branch, its grading and paired cairns.
  Shared route clearance now follows only the through-route. The western/eastern
  entries, through-route waypoints and regional start/reset are unchanged.
  Added a regression requiring zero spur blend and natural ice at `(335, 270)`,
  and included that point in exact rendered/Rapier surface checks.
- Reference: existing `iceland-road.ts` nearest-segment lookup, paired
  `vatnajokullRouteAt` bed/roof grading, `southernGlacier`, solid glacier
  geometry, footprint-grounded scenery cairns, and their unit/browser checks.
  Kept all downstream consumers on the shared route definition rather than
  patching only the visible markers. Reused the proven road lookup with a
  separately bounded coastal index. Named relief follows the coastal base;
  hemisphere-gated corner masks prevent opposite-coast distortion.
- Kept only `artifacts/iceland/iceland-aerial.png` as the current-world map,
  regenerated from actual game materials after branch removal. Retired the
  sampled full/south maps, sampled-map exporter and southern aerial.
  `concept-map.svg/.png` remain a separate planning reference; removed the
  obsolete spur from both. Rebuild the current map with
  `node --import tsx scripts/render-iceland-aerial.ts`.
- Earlier coastal/cap checks passed: focused terrain/road/corner, named-relief,
  expanded ice, buried closures, calving-water contact, seam, exact road overlay
  and streaming/disposal checks; both cars traversed the cap and representative
  complete Ring Road directions. Coastal/crater views and regional approach
  scenarios passed in Chromium and WebKit after the four-corner update and
  again after crater relocation. Historical drives including the old overlook
  are not evidence of the final branch-free route.
- **Final branch-removal checks:** five focused Iceland unit scenarios passed,
  including broad route shoulders/low rim, exact render/Rapier contact, both cars
  driving the complete through passage both directions, and solid glacier/
  underwater front agreement. `npm run build` passed, including typecheck.
  Four browser cases passed: regional entry/views/reset and remaining approach
  drives both directions in Chromium and WebKit. Used the session-only no-HMR
  configuration and Chromium/Metal setup documented below. No assertions were
  weakened; no skipped cases counted as passes.
- Inspected the refreshed aerial, final plateau arrival, and a driving-height
  view toward the former branch: open natural snow, no spur cairns. Preserved
  final coastal/crater views in `artifacts/iceland/coastal-refinement/`,
  refreshed regional views in `artifacts/iceland/vatnajokull/`, and saved the
  former-branch view there as `chromium/former-overlook-removed.png`.
- Full-project/PWA suites were not rerun for these local Iceland changes; the
  last recorded full-project run remains 2026-10-11. Physical iPad Safari and
  ordinary software-headless Chromium performance acceptance remain open.
  Iceland remains internal, all work after `f466e42` is uncommitted, and the
  user-requested local server remains available on port 5173.
- **Next:** visual review of this branch-free passage and revised island;
  the next planned implementation is the western ice cave, not part of this
  feedback pass. Earlier entries below retain superseded map/route history.

## Actual-material bird's-eye renders — 2026-10-21

- Added `artifacts/iceland/iceland-aerial.png` (3072 × 3072) and
  `iceland-aerial-south.png` (3930 × 2040), alongside the labelled sampled maps.
  These are real Three.js renders of the same detailed terrain meshes, vertex
  colours and scenery materials used by the game, not a surface-class palette.
  Roads/markings, bridges, glacier solids, iceberg meshes, wreck, basalt and
  ground detail are included. North is up; images have no overlays.
- Reference: `scripts/render-car-thumbnails.ts` for browser rendering of actual
  game objects through a temporary Vite server; `iceland-streaming.ts` for
  detailed terrain geometry/material construction; `main.ts` and `areas.ts`
  for renderer settings and Iceland lighting. Read the existing glacier render/
  collider checks and retained ground-height junction views for context.
  New `scripts/render-iceland-aerial.ts` imports live game builders rather than
  copying terrain colour rules or reconstructing scenery.
- Rendered all 324 detailed chunks (1,036,800 terrain triangles) simultaneously
  in an export-only scene, without changing gameplay streaming or camera limits.
  Used the game's sRGB/ACES settings, light colours/intensities and sun direction.
  Export differences are explicit: straight-down orthographic projection,
  distance fog disabled, island-wide shadow coverage, no car/UI, animation at
  its initial state. This is material-faithful overhead reference, not a promise
  of identical pixels from an atmospheric driving camera.
- Inspected both images, including actual ice/rock/sand colours, icebergs,
  roads and both river bridges. Generator checks complete detailed chunk count,
  terrain triangle count, required scenery, WebGL/browser errors and PNG sizes.
  The initial module lookup matched a Three.js addon instead of core; narrowed
  it to the exact core URL and regenerated successfully. Final exports use
  installed full Chromium/Metal. No game source changes or gameplay/PWA checks
  needed for this offline exporter; physical device acceptance stays open.
- **Next:** review these alternative renders with the corrected glacier join,
  then continue the already planned western ice cave after regional visual
  review. All new exports/exporter and preceding work remain uncommitted.

## Curved lagoon-glacier / ice-cap junction — 2026-10-21

- The sampled development map exposed a real geometric issue: the eastern
  tongue's constant-width strip switched on along a straight Z line, leaving
  a rectangular shoulder northeast of the cap. Preserved the user's crop as
  `artifacts/iceland/feedback/glacier-rectangular-cap-junction.png`.
- Reference: existing `southernGlacier`, its independent clipped glacier mesh,
  paired bed/roof route grading and glacier contact/real-driving tests.
  Curved the upper centreline into the cap and tapered its head with an elliptical
  width profile. The change ends at Z=350; the lower reach, calving front,
  framing hills, western tongue and vehicle physics retain their accepted
  definitions. Bed, visible ice, Rapier collision and traction all continue
  using the same shared shape. No map-only colour patch or new scenery geometry.
- Added a regression requiring the upper edge to advance progressively south
  across the outer flowlines, rather than starting along one straight line.
  Checked three new junction probes against exact rendered/Rapier heights.
  Eleven focused unit scenarios passed, including both cars on the full
  Vatnajökull traverse/overlook and existing lagoon/viewpoint routes, buried
  western closures, calving-water contact, tongue traction and framing hills.
  Application typecheck and production build passed.
- Regenerated both full-world and southern SVG/PNG maps from the corrected
  live definitions and inspected the reported overhead outline. Inspected
  actual ground, route-height and raised-oblique game views; preserved final
  Chromium/WebKit captures in `artifacts/iceland/glacier-junction/`.
  The glacier margin views and regional approaches both directions also
  passed in both engines. Chromium used the previously documented full channel/
  Metal setup and the session-only no-HMR config; no assertions were weakened.
- No full-project or PWA run for this local shape correction. Physical iPad
  Safari and standard software-headless Chromium performance remain open;
  Iceland is still internal. Plateau, maps and this correction are uncommitted.
- **Next:** user visual review of the corrected junction and Vatnajökull/rim,
  then the planned western ice cave. No later region was added in this fix.

## Current-world development maps — 2026-10-21

- Added full-world `artifacts/iceland/mapa-iceland.svg/.png` and enlarged
  south-coast/ice-cap `mapa-iceland-south.svg/.png`. Unlike the concept map,
  these show actual current terrain, exposed glacier roofs, water depths,
  wheel-surface classes and implemented roads/routes, not planned regions.
  Added coordinate axes, north/scale, 96 m chunk grid, 20 m contours, eleven
  numbered landmarks and all six regional starts/reset positions.
- Reference: `scripts/render-northern-map.ts` and its current Northern Reach
  SVG/PNG maps. Reused its code-sampled relief, hillshading, embedded raster,
  live vector overlays and Playwright PNG export. Adapted sampling to Iceland's
  highest exposed bed/independent ice roof and elevated Skógá water; sampled
  wet depth prevents painting water across the glacier. Read the exact triangle/
  seam checks in `tests/iceland.test.ts` before using those terrain samplers.
- Rebuild command: `node --import tsx scripts/render-iceland-map.ts`.
  Generator asserts finite samples, dry regional entries, elevated upstream
  water, exposed Grímsvötn rock, plateau ice, deep lagoon and outer sea.
  Both SVGs decoded and both PNG exports were visually inspected for layout,
  terrain/route alignment and readable markers. No game behavior or geometry
  changed; no driving/browser gameplay/PWA suite needed for these artifacts.
  Application typecheck/build passed. A separate standalone generator `tsc`
  check could not resolve Node built-in types because this repository does not
  install `@types/node`; the documented `tsx` generator ran successfully twice.
  No dependencies were added for this development-only artifact.
- Individual props and structure roofs/rails are omitted; the three sea stacks
  have schematic live-anchor footprints. SVG relief is an embedded 2 m raster;
  routes, contours, grid, markers and labels remain vector/editable.
  These maps are implementation references, not new route-acceptance evidence.
- Next implementation remains visual review of Vatnajökull/Grímsvötn, then the
  western ice cave. Maps and preceding plateau work remain uncommitted.

## Vatnajökull traverse and Grímsvötn rim — 2026-10-20

- Committed and pushed the accepted solid-glacier/no-band corrections and gentler
  road transitions as `f466e42` on `main`. The initial push failed because the
  enterprise `GH_TOKEN` overrode the saved github.com login; the retry used the
  existing github.com keyring credentials without changing credential settings.
  Earlier "uncommitted" notes below describe their historical checkpoints.
- Built the next planned slice: a broad western ascent from the sandur road,
  approximately 110 m-high ice plateau, short Grímsvötn overlook, and eastern
  descent to the existing road beyond the lagoon. Paired solid, footprint-grounded
  stone cairns mark the through route. Scatter is excluded after secondary
  offsets, not just at cluster seeds. Ice cave, Lakagígar and northern
  Askja/Kverkfjöll connector remain later work.
- Grímsvötn is an unequal, southeast-breached dark rock rim around an ice-filled
  interior, not a bare conical volcano. It uses the streamed terrain's exact
  visible/collision triangles; the retained separate ice roof remains below
  exposed rock. Plateau grading feeds that same ice mesh, sampling and collider.
  Render/physics rings, vehicle handling and the accepted tongues/calving bay
  are unchanged. New cairn geometry uses the existing solid callback/disposal.
- References: `highlands-terrain.ts` and `tests/highlands.test.ts` for a broad,
  real-vehicle-tested glacier ascent and ice-filled volcanic landform;
  Iceland's existing road grading, separate glacier mesh, scenery solid callback
  and regional start/reset tests for the actual implementation. Adapted the
  old Highlands' symmetric shallow bowl into unequal exposed nunatak shoulders
  intersecting independent ice, rather than copying its bare volcano profile.
- Initial real-driving checks caught excessive grades at both ice/rock handoffs.
  Eased the authored route profiles instead of changing physics or assertions.
  A first grading attempt also re-exposed the accepted western closure; retained
  the existing buried-wall regression and corrected the roof/bed transition.
  The roof meets the graded line before excavation lowers the supporting bed.
  Extended dark rock colour below the snow intersection to avoid green stripes
  interpolating up the exposed rim.
- Added internal `/?area=iceland&start=vatnajokull` and nearest-region reset;
  updated README and SVG/PNG concept map (cyan marks the implemented traverse).
  Reviewed actual arrival, low rim, raised caldera and both slope captures in
  Chromium/WebKit, saved in `artifacts/iceland/vatnajokull/`. Retained current
  original-angle, western-front and calving regression captures there too.
- Thirteen focused unit scenarios passed: both cars on the full new traverse
  and overlook in both directions, dry graded shoulders, exact rendered/Rapier
  roof and exposed-rim heights, reset selection, chunk/LOD seams, scatter
  clearance, buried land closure, calving waterline, retained road reductions,
  lagoon geometry, and both cars on the existing outlet/viewpoint routes.
  Production build/typecheck passed. Six browser scenarios passed: regional
  entry/views/reset, unchanged local approach drives both ways, and all eight
  glacier-margin views, each in Chromium and WebKit.
- Browser evidence caveats: live-reload runs were interrupted and are not
  passes. A stable default headless Chromium run missed the existing driving
  time budget while still moving with four contacts and no obstruction.
  The final run disabled Vite watching/HMR in a session-only config and used
  Chromium's full headless channel with `--use-angle=metal`; unchanged route,
  deadline and assertions passed. WebKit passed without rendering flags.
  Standard headless Chromium performance and physical iPad Safari acceptance
  remain open; no assertion, speed threshold or vehicle physics was weakened.
- No full-project or PWA suite for this first post-pilot region. Last recorded
  full project run remains 2026-10-11; full suites are next due after three
  completed post-pilot regions, broader shared changes or public release.
  Iceland remains an internal development entry. This new slice is uncommitted.
- **Next:** visual review of the plateau/rim and western/eastern approaches;
  then the planned western drive-through ice cave around `(115, 290)`, with
  broad portals, roof clearance, a separate roof route and both-way driving.
  Do not count the cave or the northern connector as built by this slice.

## Gentler Ring Road and bridge transitions — 2026-10-20

- Reduced both existing nonperiodic road-height noise amplitudes by exactly
  25% (1.5 to 1.125 and 0.65 to 0.4875). Reduced bridge approach settling by
  30% (0.35 to 0.245) and the local threshold depression by 30% (0.30 to
  0.21 m). Retained wavelengths, road alignment, level decks, verge drops,
  vehicle physics and the shared render/collision height profile.
- Reference: existing `iceland-road.ts` undulations and
  `iceland-terrain.ts` threshold grading; adjusted amplitudes only.
  Four focused unit scenarios passed: exact reduction ratios, measured
  threshold heights and both cars' physical suspension response at road
  edges/bridges in both directions. Production build/typecheck passed.
  No browser, full-project or PWA run for this numeric tuning; driving-feel
  acceptance remains with the user.
- Next: user review of gentler road/bridge feel, then the outstanding
  Iceland regional work. Changes remain uncommitted.

## Buried land-margin closure, no basal band — 2026-10-20

- User approved the separate ice shapes but identified a remaining uniform
  vertical ice band along the western tongue's foot. The existing taper
  deliberately stopped 2 m above the bed, and interpolation left its closing
  wall exposed. Reused the separate glacier's sampled roof/bed technique:
  the low-weight land margin now tapers 1 m into the bed before rising into
  the retained ice shapes. No wall/material overlay or surrounding-hill change.
  The calving-bay exemption still preserves full-height underwater ice walls.
- Preserved feedback as `artifacts/iceland/feedback/glacier-basal-ice-band.png`.
  Inspected WebKit low front/side and calving captures in
  `artifacts/iceland/glacier-no-band/`: the uniform basal strip is gone and
  the ice still meets the lagoon. The full eight-angle WebKit scenario passed,
  as did real browser terminal approaches both ways. Chromium capture/driving
  attempts failed with execution-context loss and then timeouts, including
  destination loading; these are not passes. Assertions/timeouts are unchanged.
- Added a regression measuring over 1,000 wall vertices across the western
  land margin: every closing-wall vertex must be at least 0.5 m below the bed.
  Existing ice-roof sampling and visible/Rapier calving-waterline checks passed.
  Moved the lateral traction probe inward to the exposed ice, because the
  outer geometric closure is now intentionally buried rather than driveable ice.
- Four focused unit scenarios passed, including both cars driving the full
  outlet and both viewpoint routes in both directions. Production build and
  typecheck passed. No full-project or PWA suite for this local contact fix.
- Next: visual review of the accepted ice with its corrected basal contact.
  Chromium browser acceptance and physical iPad review remain open.
  Changes remain uncommitted.

## Separate glacier solids and restored calving contact — 2026-10-20

- User rejected the exposed terrain skirt and lowering of the hills in the
  previous iteration. Restored the higher rock sides framing both tongues.
  The earlier hard-colour contour is superseded, not an accepted glacier design.
- Added `iceland-glacier.ts`: one independent ice mesh for the connected cap
  and both existing tongues, with clipped irregular roofs and walls buried
  2 m into the sampled bed. The visible mesh is also its Rapier solid, owned
  and disposed with the existing Iceland scenery. No transparent skirt or
  depth-offset shell. Land-ending edges taper geometrically toward the bed,
  while the calving bay retains steep full-height walls. Shared roof/wall
  vertices soften the rim lighting; the ice no longer switches to earth colour.
- Removed ice colour from the rock terrain. Excavation is restricted to the
  footprint under the ice, leaving surrounding hills intact. The existing
  global terrain lattice supplies the ice roof interpolation too; wheel
  surfaces, spawning and water depth select the exposed bed or ice roof.
  No new driving routes or summit/ice-cave completion are claimed.
- Extended the lagoon's northern submerged bay against the central calving
  face. Lagoon water clips to the rock bed, not an interpolated roof-to-bed
  heightfield ramp, so the ice continues down through the waterline rather
  than terminating above a dry bank.
- References: the solid-geometry callback and cleanup used by the existing
  lagoon icebergs and Reynisfjara scenery, terrain-triangle clipping from the
  existing river, and the shared global-lattice sampling from Iceland terrain.
  Adapted these for separate top/side geometry, not another coloured overlay.
- Preserved both new images in `artifacts/iceland/feedback/` as
  `glacier-calving-dark-skirt.png` and `glacier-painted-ground-contact.png`.
  Final eight-angle Chromium/WebKit captures are in
  `artifacts/iceland/glacier-solids-final/`; approach driving arrivals and the
  preceding tapered iteration are in `artifacts/iceland/glacier-solids/`.
  Inspected front/oblique water contact, both tongue margins, cap and original
  problem camera. Physical iPad visual/performance acceptance remains open.
- Eight focused unit scenarios passed: geometry/sampling and real Rapier
  waterline raycasts at eight positions across the face, irregular profiles
  and restored hills, chunk seams, lagoon water, both cars on both full
  glacier viewpoint routes/outlet and the Lómagnúpur route in both directions.
  Final roof-normal change reran the four focused geometry scenarios (4/4).
  Production build/typecheck passed. Browser margin captures and terminal
  approach drives passed in both engines (4/4); final normals/waterline
  captures passed again in both engines (2/2).
- No full-project/PWA suite for this local geometry change. The previously
  reproduced long Chromium whole-region deadline and physical iPad checks
  remain open; no test deadlines or driving assertions were weakened.
- Next: user visual review of restored rock framing, rounded land contacts
  and direct calving water contact before summit/Grímsvötn/ice-cave work.
  Changes remain uncommitted.

## Shape-aligned glacier margins — 2026-10-20

- **Superseded by user feedback and the separate-solid correction above.**
- Reviewed both existing southern tongues and the connected cap, including the
  user's exact camera. Replaced the colour fade with a sharp, shape-derived
  ice/ground contour. Split mixed terrain triangles and duplicate boundary
  colours without lifting an overlay or changing the original triangle planes.
  The same refined mesh remains the streamed Rapier solid; per-wheel ice
  classification now samples that same contour instead of a different threshold.
- Added coherent, unequal outline variation to both sides and terminal fronts,
  with narrower lateral transitions. Preserved the existing lower western
  profile, crevasses, routes, lagoon carving and scenery ownership/disposal.
  Near and distant terrain retain identical glacier geometry and borders.
- The first hard-border capture still showed a tall dark mound beside the
  eastern ice: the inherited generic coast escarpment was higher than the lower
  tongue. Recessed that bed into moraine valleys before applying the ice profile.
  Both glaciers now stand above their surrounding ground rather than cutting
  into a taller rock face. This is a local glacier correction, not completion
  of Vatnajökull, Grímsvötn or the ice cave.
- References: transferred the terrain-triangle clipping principle from
  `iceland-river.ts` and the fitted road repair in `iceland-road-scenery.ts`.
  Here the two materials share coplanar solid triangles, with duplicated seam
  colours, rather than a water/road overlay. Reused `southernGlacier` as the
  single shape field and the established sampled-terrain/LOD contract.
- Preserved the original image at
  `artifacts/iceland/feedback/glacier-straight-faded-edge.png`.
  Before captures are in `artifacts/iceland/glacier-margins-before/`; final
  Chromium/WebKit captures are in `artifacts/iceland/glacier-margins/`.
  Inspected all six views, including both tongue sides/fronts, the cap margin
  and the supplied camera, plus real driving arrivals in
  `artifacts/iceland/glacier-margins-approaches/`.
- Final typecheck and production build passed. Eight focused unit scenarios
  passed: hard-seam geometry/area/interior height agreement, irregular lateral
  profiles and traction, expanded glacier chunk/LOD seams, lagoon geometry,
  and both cars driving the cliff route, outlet and both full viewpoint routes
  in both directions. Command:
  `node --import tsx --test --test-name-pattern='glacier margins|both glacier tongues|meshes are deterministic|drives Jökulsárlón|drives the Lómagnúpur|bridge crosses the outlet' tests/iceland.test.ts`.
- Browser margin captures and terminal-approach driving passed in both engines
  (four final scenario/engine combinations). The existing full outlet/shore/reset
  scenario passed in WebKit. Chromium exhausted its unchanged 150 s path budget
  while moving normally on the bridge with four contacts. Reproduced the same
  deadline failure against unmodified `main`/HEAD source via a separate baseline
  server, without switching branches or overwriting working files; it also
  failed before reaching the glacier routes. Neither attempt is a pass.
  Kept the long scenario and assertions unchanged; the new focused scenario
  explicitly covers the final segment of each viewpoint route both ways.
- No full-project or PWA suite for this local terrain refinement. Physical iPad
  performance/touch and the long Chromium whole-region gate remain open.
  Next: user review of the revised ice/terrain contacts before extending the
  summit, Grímsvötn or western ice cave. No commits made.

## Frosted shore ice correction — 2026-10-19

- The user found the large stranded ice too transparent against black sand.
  Adapted the existing varied ice material specifically for shore pieces:
  opacity is now 0.88–0.95, transmission 0.35–0.55 and roughness 0.25–0.40.
  This retains translucent variation without the ghost-like background bleed.
  Lagoon materials, all shapes, sizes and collision remain unchanged.
- Preserved the supplied image as `artifacts/iceland/feedback/shore-ice-too-transparent.png`.
  Added a raised shore camera matching the problem angle. Inspected this and
  the low beach view in Chromium/WebKit; the stranded slab now has a visibly
  stronger frosted body. Updated captures in `artifacts/iceland/ice-refinement/`.
- Typecheck, focused ice-material unit check, production build and both-engine
  ice visual scenarios passed. No full, driving or PWA suites for this local
  material correction; physical iPad acceptance remains open.
- Next: user review of the shore ice and the outstanding Iceland refinements.
  Changes remain uncommitted.

## Jökulsá eastern approach and varied translucent ice — 2026-10-19

- Extended the straight bridge corridor through `x = 575, z = 650`, past the
  east cable anchor at `x = 561`. Moved the eastern bend inland, preserving a
  smooth departure and the dry eastern connection. Straightened the matching
  west approach too. Updated `JOKULSA_CROSSING` to drive the actual revised road
  through the eastern turn, not cut diagonally beneath a stay.
- Checked every vertex of all four outer stays and anchor blocks against the
  full asphalt corridor: all stay outside its width and clearance margin.
  Preserved the user image in `artifacts/iceland/feedback/bridge-east-cables-road.png`.
- Expanded the existing fractured-ice technique in `iceland-lagoon-scenery.ts`:
  four distinct roof/topology families (tabular, split-ridge, tilted-slab and
  fractured-block), six to nine unequal rim sides, variable taper and shear,
  different roof triangulations, and seeded face colour variation.
- Clear/frosted selection is independent of shape, with per-piece opacity,
  transmission, roughness and thickness, mixed among opaque ice in both lagoon
  and beach groups. Transparent ice draws after the water without writing depth.
  This replaces the first repeated facet layout and uniform transparency.
- Enlarged selected lagoon slabs to about 20–25 m wide, with taller pieces,
  while retaining the smaller field. Enlarged selected beach pieces too,
  including a roughly 7 m stranded slab, still partially buried in the beach.
  All visible ice retains matching solid geometry.
- Focused cable-clearance, lagoon geometry and mixed-ice geometry/material/size
  checks passed, as did typecheck and production build. Both cars completed the
  realigned full Ring Road and both bridge/road-edge crossing directions in unit
  simulation. The final road-fit topology and full triangle-interior checks also
  passed. Browser runs interrupted by subsequent feedback are not counted as passes.
- Final road/bridge and varied-ice visual scenarios passed in both engines.
  Inspected the bridge approach from raised and driving cameras: stays and
  anchor blocks now flank the road. Inspected lagoon and beach ice, including
  the larger stranded slab. Preserved final views in `artifacts/iceland/road-shoulders/`
  and `artifacts/iceland/ice-refinement/`.
- Final focused physical scenarios passed in Chromium and WebKit: crossing both
  road verges and each of the four bridge thresholds in both directions, with
  measured suspension travel and vertical chassis motion, followed by real
  chassis contact with a narrow marker collider. Captures are preserved with
  the road views. Both visual scenarios also passed in both engines: six final
  scenario/engine combinations, with the physical checks rerun separately.
- Chromium's earlier combined long approach round trip exhausted its path
  deadline while moving normally with four contacts; extending the deadline
  did not reliably cover the return either. Those attempts are not passes.
  Isolated each threshold in the new focused scenario instead, asserting motion
  at every individual entrance/exit rather than aggregating it across a long
  trip. The full realigned Ring Road still passed both directions in real-wheel
  unit simulation; a final full-region browser drive remains outside this local
  gate. No game-physics or arrival/motion assertions were weakened.
  The seven-camera capture needed three minutes rather than two.
- Removed redundant collinear ribbon rows while retaining every authored turn
  and fine paint/dash sampling. Terrain clipping still fits every triangle
  exactly. Asphalt dropped from roughly 189,000 to 91,420 triangles; final
  markings use 60,124 and gravel 204,008. Node generation measured about 4.6 s
  instead of 8.7 s. Physical iPad performance still needs acceptance.
- Physical iPad, full-project and PWA gates remain open.
- Next: user review of bridge approaches, road feel and ice variety in the
  running world, then the outstanding ridge/glacier review before summit and
  ice-cave work. Changes remain uncommitted.

## Physical road edges, bridge thresholds and solid markers — 2026-10-19

- Darkened the accepted cool-gray gravel and grit another step.
- Settled the gravel verges by up to 0.34 m in the shared terrain/collision
  profile. Crossing either side of Route 1 now moves the actual wheels and
  suspension. Added short 0.30 m approach depressions at both ends of the Skógá
  and Jökulsá bridges, leaving their solid decks level and creating a real
  raised entry/exit threshold. Vehicle physics and camera feedback are unchanged.
- Yellow roadside posts now have one combined static collision mesh derived
  directly from the instanced post geometry and transforms, following the
  combined-collider approach in `iceland-detail.ts`. Small grit remains decorative.
  The roadside collider belongs to the existing scenery disposal lifecycle.
- The initial verge edit exposed terrain through the road: sampling ribbon
  corners did not keep its broad transverse triangles above the new cross-section.
  Corrected the root cause by splitting asphalt, markings and shoulder overlays
  at terrain grid edges, terrain diagonals and bridge rectangle edges. Every
  resulting face follows the sampled collision plane; bridge boundaries retain
  their actual height step rather than an asphalt ramp across it.
  Transferred the terrain-triangle fitting principle from `iceland-river.ts`,
  retaining the shared mitered road outline. Preserved the user's regression image
  in `artifacts/iceland/feedback/road-terrain-breakthrough.png`.
- Ten focused unit checks passed for the physical terrain revision: both cars
  crossed road edges and both bridges in both directions with measured suspension
  movement and vertical chassis velocity; real chassis contact with a marker;
  the full Ring Road both ways; Skógá ford/bridge regressions; and terrain seams.
  After the overlay repair, all three focused topology, gravel and complete
  triangle-interior clearance checks passed, plus typecheck and production build.
- Inspected repaired captures from road height and raised forward/reverse views:
  no terrain breakthrough. Final dual-engine visual and focused driving/contact
  scenarios passed as recorded in the latest entry above. Earlier interrupted
  runs and long-trip deadline failures are not passes.
- Next: user review of road feel and the outstanding ridge/glacier/lagoon refinements.
  Full/PWA suites and physical iPad acceptance remain open; no commits made.

## Ring Road shoulder colour and terrain blending — 2026-10-19

- Replaced the brown/olive gravel and grit with dark, cool volcanic gray.
  Kept a narrow solid gravel edge beside the asphalt, then faded five
  cross-road bands into the actual underlying terrain. Independent left/right
  width variation and fine positional noise break up the outer transition.
- References: retained the existing mitered Ring Road joins and sampled driving
  heights in `iceland-road-scenery.ts`; transferred the standard RGBA vertex-colour
  fade from `iceland-river.ts`, adapted to a dry gravel overlay with depth writes
  disabled. No terrain, collision, handling, bridge or road-marking changes.
  Visual reference: [Ring Road photograph](https://maycausewanderlust.com/wp-content/uploads/2023/02/Iceland-Ring-Road-May-Cause-Wanderlust.jpg).
- Preserved the user's before image in
  `artifacts/iceland/feedback/road-shoulders-before.png`. Inspected actual sandur
  and heath captures at driving height and from raised road-facing angles,
  including both Chromium and WebKit. Current captures are in
  `artifacts/iceland/road-shoulders/`; the hard brown outer ribbon is gone.
- Typecheck, production build, two focused road geometry checks and the new
  dual-engine shoulder browser scenario passed. Geometry checks enforce cool
  dark colours, a fully opaque inner edge, intermediate fade bands, zero-alpha
  outer edges and terrain fitting. No full, driving or PWA suites were rerun
  for this material/visual-only refinement; physical iPad review remains open.
- Next: review the road shoulders in the running Iceland world, then resume
  the outstanding ridge/glacier/lagoon review before summit and ice-cave work.
  All existing work remains uncommitted.

## Lagoon and glacier feedback refinement — 2026-10-19

- Rounded Lómagnúpur’s prow and shoulders while retaining its inland ridge,
  steep upper face, lower gravel apron and existing route.
- Lowered the western glacier tongue beside Lómagnúpur; cut irregular crevasses
  into shared terrain/collision and broke up both terminal outlines.
- Replaced round icebergs and rejected narrow spikes with broader fractured
  slabs/ridges, including larger pieces. Added partially buried beach ice,
  with selected pieces using physical light transmission.
- Deep lagoon water now becomes opaque, hiding submerged glacier geometry.
  Added all four outer bridge stays and grounded anchors beside the road.
- Build/typecheck and six focused geometry/real-driving unit checks passed;
  both cars completed the cliff route, bridge and glacier viewpoints both ways.
  Extended geometry assertions for deep-water opacity, beach ice and stays passed.
- Initial glacier Chromium/WebKit visual captures passed. The final combined
  coast/road/glacier Chromium captures passed; remaining browser gates are running.
- Final Iceland unit run: 34/35 passed. The sole failure was the previous assertion
  requiring an opaque dark sea at the Reynisfjara boundary. Updated it to require
  identical shared depth colour/opacity instead, then reran it with the river-mouth
  and lagoon geometry checks: 3/3 passed. New four-coast/apron regression passed.
  All real-driving scenarios, including the full Ring Road both ways, passed.
- Fixed the rectangular Jökulsá mouth shelf: carving now only lowers land and
  never raises deeper ocean floor to river depth. Focused water/coast geometry
  checks passed 5/5; the overhead capture shows the river fading into open sea.
- No full project/PWA run for these local edits.
- Extended the approved light coastal shallows around the island with a shared
  depth palette at sea/river/lagoon joins. Excluded the submerged streaming apron
  after captures exposed an unwanted distant pale band.
- Added gravel shoulder ribbons, sparse grit, instanced yellow roadside markers,
  subtle asphalt variation and small terrain-aligned road undulations with level
  bridge decks and eased approaches. Collision remains the shared terrain.
- The extended browser run was interrupted to incorporate new coastline/road
  requests and then correct the apron band; interrupted runs are not passes.
- Next: review these refinements before extending the summit and ice-cave stage.
  Changes remain uncommitted; physical iPad acceptance remains open.

## Highland ridge, glacier gateway and Jökulsárlón — 2026-10-19

- Corrected Lómagnúpur from an isolated massif to a continuous northern ridge.
  The upper face is steep rock; the lower section is a broad gentler gravel
  apron, following the user photograph. Kept the existing dry gravel route.
- Added a connected southern ice field with a tongue immediately east of the
  gateway and a separate dry viewpoint spur. This is the coastal glacier
  approach, not completion of Vatnajökull/Grímsvötn or its highland routes.
- Built Jökulsárlón with a calving front, irregular fixed icebergs, west-bank
  gravel viewpoint and a continuous outlet to the sea. Route 1 skirts the
  lagoon and crosses the short Jökulsá outlet on a solid suspension bridge.
- Water uses the proven terrain-triangle clipping and exclusive sea ownership.
  The ocean handoff matches colour, opacity and level. Bridge deck, rails and
  towers are solid; icebergs are fixed solids in deep water. Motion is deferred
  until the static layout is accepted, keeping visible ice and collision aligned.
- Added `?area=iceland&start=jokulsarlon`, regional reset, Glacial lagoon/river
  labels, and a revised SVG/PNG map showing the western glacier tongue.
- All 35 Iceland unit checks passed: both cars on every new route in both
  directions, full Ring Road, existing coast regressions and water/bridge geometry.
  Actual views passed in Chromium and WebKit and are saved in
  `artifacts/iceland/jokulsarlon/`. Production build/typecheck passed; the final
  iceberg-size geometry regression passed separately. Chromium's full outlet,
  shore-route and deep-water-reset scenario passed (5.5 min), as did WebKit
  (2.3 min). Both visual and driving gates passed in both engines (4/4).
- The first visual iteration exposed grass at the calving face and oversized
  icebergs. Extended ice colour down the terminal face, gave the lagoon gravel
  banks, and reduced iceberg sizes/count. The initial browser drive was stopped
  for that refinement; it is not counted as passed.
- Full project and PWA suites were not run for these local terrain additions.
  Physical iPad Safari performance and long-session acceptance remain manual.

**Next:** review the ridge, glacier fronts and lagoon; address feedback before
  the Vatnajökull summit, Grímsvötn and western ice-cave stage. Public release,
  full-world acceptance and physical iPad testing remain open.


## Lómagnúpur and Skeiðarársandur — 2026-10-19

- Added the tall southern cliff prow at the reserved western sandur gateway,
  with unequal shoulders, erosion terraces and a buried talus foot. Visible
  terrain and collision use the same triangles; nearby distant chunks keep
  full detail so the cliff silhouette does not change with streaming.
- Added shallow dry distributary channels, gravel bars, varied black outwash
  ground and sparse low stones. Extended the existing detail system, including
  route clearance, deterministic variants, low colliders and no small-prop shadows.
- Added a graded gravel detour below the cliff that rejoins Route 1 at both ends,
  and `/?area=iceland&start=lomagnupur` with nearest-region reset.
- References transferred: Mars irregular rim shoulders/terraces, existing Iceland
  road grading, Northern-style low shrubs and existing regional start checks.
  No new water overlay is used for the dry sandur channels.
- Focused unit checks passed: both cars drive the cliff route both ways, dry
  grades and spawn/reset placement, deterministic detail and route clearance.
  Full Ring Road driving, mesh continuity and the existing river/waterfall/shore
  regressions passed too: 15 focused unit checks total. Typecheck and production
  build passed (existing bundle-size advisory only). The complete gravel/road/reset
  scenario passed in Chromium (7.5 min) and WebKit (3.4 min). Chromium required
  a longer driving deadline: the initial reverse run timed out four metres before
  arrival while moving normally with four wheel contacts. Its isolated rerun
  passed with arrival assertions unchanged. Earlier interrupted development runs
  are not counted as passes.
- Actual arrival, cliff and plain captures are saved in `artifacts/iceland/lomagnupur/`.
  Updated the capture guidance after finding photo mode clamps distant look-at
  targets to a 100 m orbit; captures now retain their intended camera position.
- No full-project/PWA suites were run for this terrain-only chunk. Physical iPad
  performance and visual acceptance remain manual.

**Next:** user review of the gateway, then Jökulsárlón, Breiðamerkurjökull
  glacier front, icebergs, shore viewpoint and the short Jökulsá outlet bridge.
  Lagoon terrain is not implemented by this chunk.


## Reynisfjara feedback refinement — 2026-10-19

- Replaced the two-row basalt wall with ten tiers following the sampled hillside.
  Low beach-side columns rise into the headland; the same mesh is solid.
- Added a dry beach shelf and depth-tinted shallow coastal water with exclusive
  ocean ownership. Added a driveable Hálsanefshellir cavity with unequal spring
  points, changing cross-sections and a fractured rim, using the Keyhole lesson.
- Replaced repeating escarpment waves away from Skógafoss with unequal shoulders
  and recesses. The authored waterfall brink is preserved.
- Added the explicit natural-geometry rule and Mars references to WORLD_BUILD_GUIDE.md.
- The eastern shallow-water mesh now extends beyond the full terrain fade. Its
  boundary is opaque and matches the ocean colour; a regression check enforces
  that handoff. The original shallow shelf is preserved at the feedback camera.
- Typecheck and production build passed (existing bundle-size advisory only).
  All 29 Iceland unit checks passed, including both vehicles on the beach and
  full Ring Road. The final water-boundary regression also passed separately.
  Final beach/cave driving and waterfall regression checks passed in Chromium
  and WebKit (4/4). Inspected actual game captures, including the supplied cave
  and eastern shore viewpoints; saved them in
  `artifacts/iceland/reynisfjara/refinement/`.

Accepted by the user and committed as `e737e19`. Before lagoon work, corrected
the concept map and build plan: the bridge crosses the short outlet river south
of Jökulsárlón, with dry-bank approaches and open water throughout the lagoon.

**Next:** continue east through the sandur
and Lómagnúpur toward Jökulsárlón. Full project/PWA suites were not run for this
local geometry change; physical iPad review remains open.


## Reynisfjara coast and sea-label correction — 2026-10-18

- Added a dry spur south of Route 1 to the Reynisfjara black beach, a low basalt
  headland with varied hexagonal columns, and three irregular Reynisdrangar
  stacks in the sea. The columns and stacks have static colliders. Sparse basalt
  ground detail extends along this coast, clear of the driving line.
- Added `?area=iceland&start=reynisfjara`, with a safe beach entry and nearest
  reset. Modern and Classic drove the spur out and back in real-wheel unit
  checks. The visible route and start also passed in Chromium and WebKit.
- Fixed the sea HUD label at the Skógá mouth. River water reaches sea level
  before the river mesh ends, so water height alone identified some ocean as
  **Glacial river**. The label now uses the rendered river corridor boundary;
  a sea point beside the mouth reads **Deep sea** in both engines.
- `npm run typecheck` and `npm run build` passed. The local region and HUD
  browser checks passed in both engines (4/4), followed by a final narrowed
  column and beach-view pass in both engines (2/2). Inspected and saved the
  final captures in `artifacts/iceland/reynisfjara/`. No full project or PWA
  suite was run for this local section.

**Next:** continue east through the sandur toward Jökulsárlón, shaping the
joining shore and Ring Road before adding the lagoon, glacier front and bridge.

## Sólheimasandur wreck and surface-cue refinement — 2026-10-18

- Lowered the wreck shell 0.52 m into its prepared sand footprint so the lower
  fuselage is buried. Rebuilt the rear stabilizer as a short trapezoid rooted
  behind the lower side opening. The initial broader repair overlapped that
  opening and looked like an arrow sign; the user's close-up exposed it.
- Iceland sand retains its sand driving profile, with dark gray particles and
  HUD dot. Asphalt's dot now matches its gray pavement/particles. Sea-level
  Iceland water shows **Deep sea**, while the Skógá still shows **Glacial river**;
  the HUD can update the name when both use the same water handling profile.
- Focused wreck and particle unit tests passed. The Sólheimasandur drive and
  black-sand HUD checks passed in Chromium and WebKit (4/4). Final low and
  overhead wreck captures passed in both engines (2/2), as did the final HUD
  check including asphalt and sea (2/2). `npm run build` passed. No full/PWA
  suite was run for these local visual and label changes.
- Updated captures in `artifacts/iceland/solheimasandur/` and recorded the
  large-prop grounding lesson in `WORLD_BUILD_GUIDE.md`.

**Next:** continue east from Sólheimasandur to Reynisfjara, including the
joining shoreline/cliff and distinct basalt-column beach silhouette.

## Iceland regional start shortcuts — 2026-10-18

- Added `?area=iceland&start=skogafoss` and
  `?area=iceland&start=solheimasandur`, with safe positions, headings and
  region-specific welcome text. Reset now returns to the nearest completed
  Iceland regional start. The original `?area=iceland` entry still starts at
  Skógafoss.
- Recorded the shared URL/start/reset convention in `WORLD_BUILD_GUIDE.md` so
  future completed Iceland regions receive the same entry and browser check.
- Verification: focused regional-start unit check passed; the direct URL and
  nearest-reset browser scenario passed in Chromium and WebKit (2/2).
  `npm run typecheck` and `npm run build` passed. The existing Rollup
  large-chunk warning remains. No full or PWA suite was run for this local
  entry-point change.

**Next:** continue the Reynisfjara connector as recorded below, and add its
regional start when its safe entry and return route are complete.

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
