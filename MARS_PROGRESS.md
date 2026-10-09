# Mars implementation progress

Read this file with `MARS_BUILD_PLAN.md` before continuing. Verify status against the code and test evidence; an unchecked milestone is unfinished. Update this record at every milestone and before stopping.

## Current work

Started 2026-10-07. **Current user scope: expand Mars to 1,536 m and prove the separated Dish Ridge → Glassfall → Iron Maze journey. Focused checks only; the user drives it before longer validation.** Habitat and Crown stay at pilot positions in this pass. Do not proceed to Keyhole Badlands. Mars stays out of the production picker during development.

## Milestones

The completed regional gates below refer to the original compact layout. The expanded-layout journey needs fresh user acceptance and later driving/browser verification.

- [x] World layout, region design cards, and concept map.
- [x] Deterministic terrain and worker streaming, with seam and lifecycle tests.
- [x] Habitat Seven, Crown Crater, northern Great Ring, and connected pilot routes.
- [x] Mars Scout model, surface feedback, regional starts, and development entry.
- [x] Pilot driving and visual checks in Chromium and WebKit; build and PWA checks (known WebKit offline-reload skip remains manual acceptance).
- [x] Dish Ridge.
- [x] Glassfall Plain.
- [ ] Iron Maze.
- [ ] Keyhole Badlands.
- [ ] Fossil Delta.
- [ ] Rust Dunes.
- [ ] Lava Tubes and Quiet Vault.
- [ ] Full circuit, regression checks, public integration, and device acceptance.
- [ ] Expanded-layout eastern journey accepted and reverified.

## Decisions

- Work in individually verified milestones. Do not implement seven unreviewed regions in one pass.
- Keep existing gravity and four-wheel physics. The Scout is a new vehicle model; terrain supplies handling differences.
- Preserve Northern Reach's runtime while introducing a small Mars-specific generator/runtime. Share existing vehicle, camera, effects, and disposal APIs; avoid a risky rewrite of Northern Reach's region-specific prop system.
- Established starts are Habitat Seven, Crown Crater, Dish Ridge, and Glassfall Plain. Future regions appear on the design map, not as finished in-game destinations.

## Evidence and next action

As of 2026-10-08:

- Typecheck and production build passed.
- 49 focused unit tests passed, including all six pilot routes driven in both directions with the real Scout, geometry grades, seams, stream disposal/errors, and existing physics/surface/effects checks.
- The initial six Mars browser scenarios passed across Chromium and WebKit. These cover the Habitat–Crown return loop, rim circuit, crater descent/ascent, regional reset, model switching, and travel.
- A subsequent focused browser run passed all 10 cases across both engines: pilot presentation/travel, delayed Mars worker requests, existing home-screen behavior, location selection, and travel through the three existing locations. Delayed terrain holds the Scout safely on loaded collision until streaming catches up.
- The final Mars browser run passed all four selected cases across both engines: presentation/reset/travel and the reverse circuit (eastern climb, opposite rim, northern return without reset).
- Actual Chromium captures are saved as `artifacts/mars/pilot-habitat.png`, `pilot-crown-overlook.png`, `pilot-crater-floor.png`, and `pilot-reverse-circuit.png`. The habitat and overlook captures were refreshed after the final model/camera review.
- The first geometry check exposed sharp shoulder grades at junctions. Road profiles now blend smoothly, with flat approaches to reset/lookout clearings; the original slope assertion passes without weakening it.
- Visual inspection exposed incorrectly oriented Scout fenders. The model and its generated thumbnail are corrected.
- A subsequent typecheck and 19 focused tests passed, including the new Great Ring physical escape checks in all four cardinal directions and the existing Northern Reach regional-start tests.
- `npm run test:pwa` completed after the browser runs: production build passed; 5 PWA tests passed and the existing WebKit offline-reload case was skipped. Both engines confirmed production hides the unfinished Mars entry and Scout option while precaching their assets. Chromium offline reload passed.
- Physical iPad Safari acceptance, including two-contact touch and offline reload, remains outstanding. Full regression suites have not been run for a merge/release. No release or merge has been performed.

## Handoff

Pilot feedback revisions on 2026-10-08:

- Replaced the three ribbed habitats with geodesic shells: flat triangular ivory/glazed panels and pale shared struts, following the user's habitat reference. The visible hull panels supply the colliders. A geometry inspection confirmed each shell has 168 outward-facing triangles, no degenerate faces, and no open seams above the foundation.
- Rebuilt the Mars Scout from the user's expedition-rover reference: angular beveled cabin, split windshield, side windows, open roof rack, radiator/service hatch, driving lamps and bull bar, visible suspension details, and treaded tires. Refreshed the selection thumbnail; existing car thumbnails were unchanged.
- Typecheck, production build, and 18 focused Mars/lifecycle unit tests passed. All four selected browser cases passed: visual/reset/travel checks and the actual habitat–crater drive in Chromium and WebKit. Reviewed the rendered habitat view and Scout front view; corrected the windshield clearance found during the first render.
- Updated `artifacts/mars/pilot-habitat.png`, `pilot-crown-overlook.png`, and new `pilot-scout-front.png` show this revision. Crater-floor and reverse-circuit captures above remain evidence of the earlier pilot version. Design notes and the vehicle concept now reflect the user references.
- This revision changes models and scenery only. The previous PWA results above remain the latest offline evidence; physical iPad acceptance is still pending.
- Sign feedback: fixed the batching path that removed texture UVs and made the mapped signs black. Replaced the boards with chamfered sci-fi housings, illuminated ivory pedestals/edge strips, and cream/amber navigation displays. Separate front/back planes preserve upright lettering, sit clear of the housing, and use an unlit material for stable readability without shadow shimmer.
- Sign verification: typecheck, final production build, and 18 Mars/lifecycle tests passed. Four focused browser cases passed across Chromium/WebKit (pilot presentation and sign rendering), followed by two final sign cases after lowering the pedestal below the display. The new regression renders actual batched sign faces from both sides at three angles and checks bright lettering remains visible and stable. Reviewed game screenshots; final captures are `artifacts/mars/pilot-sign-front.png` and `pilot-sign-back.png`.
- Follow-up sign feedback: replaced the central pedestal with two illuminated ivory side pylons, clipped shoulders, orange bands, and angular feet individually seated on the terrain. Matching solids follow both supports. Typecheck, build, 18 Mars/lifecycle tests and both Chromium/WebKit sign scenarios passed; refreshed the two sign captures.
- Scout suspension feedback: removed all four fender plates to leave open wheel wells. Refreshed the Scout thumbnail and the habitat, overlook, and Scout-front captures. Production build/typecheck and the lifecycle unit test passed; all four presentation and actual habitat–crater driving cases passed across Chromium and WebKit. Shared suspension and wheel physics are unchanged.

### Attached image feedback review

Read all six images in `artifacts/mars/Mars-feedback1/Mars feedback.md`; the original document and attachments are preserved. The response and seven actual game captures are in `artifacts/mars/FEEDBACK1_RESPONSE.md` and `artifacts/mars/feedback1-review/`.

- Shared camera: a short obstructed boom searches swept raised/alternate views, centres the car during recovery, and uses a wider exit threshold to avoid toggling near the obstruction. Close rear/side wall tests and an actual habitat-airlock browser reproduction keep the camera outside the Scout.
- Rocks: buried skirts conform to samples around each footprint; render and collision share the result. Independent deterministic variation changes placement, omission, scale, yaw and shape. Loose scatter is excluded from steep cliff faces. Inspected close-up foundations and the varied scatter.
- Perimeter and scale: irregular shoulders and softened mesa terraces replace periodic rim waves. Warm fog now spans 65–430 m (previously 190–720 m; Northern Reach uses 78–188 m). Broader colour variation reduces coarse-terrain striping. The saved skyline capture shows the new silhouette; final artistic acceptance remains with the user.
- Terrain joins: coarse tiles retain all 40 fine-grid edge segments on each side. Transition cells connect those edges to coarse interiors, eliminating unmatched boundary edges. Tests verify the actual perimeter vertices and edge topology; browser captures straddle a streaming transition.
- Verification: typecheck and production build passed; 40 focused Mars/physics/Highlands/lifecycle tests passed. All 10 selected browser cases passed in Chromium/WebKit: existing camera drag, pilot presentation, habitat–crater return, rim/descent/ascent, and feedback reproductions. Sequential production/PWA verification passed: build plus 5 tests, with the existing WebKit offline-reload case skipped. Physical iPad Safari acceptance remains pending. The feedback fixes are complete for review; region work remains stopped.

Latest follow-up: the user accepted the feedback fixes and requested slightly less haze. Mars fog now starts at 80 m and reaches full strength at 480 m (was 65–430 m). Typecheck/production build and the two Chromium/WebKit pilot presentation scenarios passed; refreshed the pilot captures. This is a visual tuning change only.

### Mars feedback 2

Read `artifacts/mars/Mars feedback 2/MArs feedback 2.md` and both attached images. The response and three actual Chromium captures are in `artifacts/mars/FEEDBACK2_RESPONSE.md` and `artifacts/mars/feedback2-review/`.

- Moved the north lookout board to a more even roadside shelf, turned it toward the approach, and grounded its supports and matching collision geometry there. The close driving capture shows the board readable with both feet seated.
- Darkened the Mars sky/fog tint to a dustier rose while keeping the recently reduced haze range of 80–480 m.
- Matched each solar-panel post to its tilted panel underside and local terrain height; added ground pads. The mounted panels are shown in the review capture.
- Replaced the ambiguous pad strokes with `07` and `HABITAT SEVEN` paint. The review capture confirms it reads from the northern approach.
- Final verification passed: `npm run typecheck`, `npm run build`, 20 focused Mars/lifecycle unit tests, `git diff --check`, and the feedback capture scenario in Chromium and WebKit. These are focused pilot checks, not a full release regression run.

Latest follow-up: removed the north lookout board and all of its generated display/support colliders, keeping the rock lookout and route markers. Replaced the pad label with larger, centred `07` stencil numerals and a double octagonal paint border with locator ticks. The stencil glyphs are drawn directly, giving Chromium and WebKit the same shapes without relying on local font installation. Current captures are `artifacts/mars/feedback2-review/north-lookout-clear.png` and `habitat-pad-stencil.png`; previous review captures remain as historical evidence. The browser case also checks that no wayfinding display remains at the lookout. Final typecheck, production build, 20 focused Mars/lifecycle tests, four affected browser cases across Chromium and WebKit, and `git diff --check` passed. The pilot revision is ready for visual review; region work remains stopped. Full release regression and physical iPad Safari acceptance remain for a later release gate.

Push preparation: darkened the Mars sky/fog tint one small step from `#bf9384` to `#bb8f80`, retaining the 80–480 m fog range and all lighting values. The user requested a commit and push of the current Mars work. Typecheck, production build, `git diff --check`, and the focused Mars presentation scenario in Chromium and WebKit passed; refreshed `pilot-habitat.png` and `pilot-crown-overlook.png` with the new tint. `npm test` could not open its tsx IPC pipe in the sandbox; the equivalent Node test runner began passing but was stopped when the user explicitly asked to skip long-running tests. The full browser and PWA suites were likewise skipped at the user's request. Prior focused Mars checks are recorded above. Region work stays stopped; physical iPad Safari acceptance remains outstanding.

Testing policy updated for faster Mars iteration: focused checks are the default, the affected scenarios run in both browser engines at each completed-region gate, and full unit/browser suites run after each block of three completed post-pilot regions, broad shared-system changes, or before public release. Routine commits and pushes alone do not require full suites. The last full-suite run remains unrecorded for this pilot; run the next full gate after Dish Ridge, Glassfall Plain, and Iron Maze are complete, or sooner if shared-system work warrants it.

Region work resumed and completed with Dish Ridge. Its detailed card, map and review captures are linked from `artifacts/mars/DISH_RIDGE.md`. Preview with `npm run dev` at `http://127.0.0.1:5173/?area=mars`; use `&start=dish-ridge` for its west saddle. The Great Ring outside completed sectors and the other regions remain development terrain. No automatic continuation has been scheduled.

Latest user scope (2026-10-09): the user resumed construction of the next region, Glassfall Plain. Finish it under the focused region gates, then stop before Iron Maze for review.

### Dish Ridge implementation — 2026-10-09

- Added six connected routes: Crown saddle, broad southern switchbacks, summit circuit, western lookout, optional eastern rock ledge, and south descent ending before Glassfall. The west saddle is the third regional reset/start (`?area=mars&start=dish-ridge`).
- Built a closed concave receiver with matching collision, panel variation, rear ribs, feed arms, open tripod, service cabinets, relay masts and grounded feet. Authored split sentinels and shelf slabs complement the ridge's unequal terraces and gullies.
- Broadened the lookout and eastern supporting shoulders after visual review. Added distant dish/habitat silhouettes that yield to detailed chunks, preserving the intended sightlines while keeping the existing streaming bounds.
- An actual driving failure exposed a route marker across the lookout junction. Markers now check clearance from neighboring branches; the original lookout assertions pass in both directions.
- Typecheck, production build and 23 focused unit checks passed: six new routes in both directions, the existing Crown rim in both directions, route grades and reset clearings, bowl topology/cavity, terrain seams and sampling, streaming transitions/failures/disposal, and shared resource cleanup. No handling changes were made.
- Saved and inspected the actual terrain/route map, five tablet views in each browser, and both completed-circuit captures, linked from `artifacts/mars/DISH_RIDGE.md`. All four final region browser cases passed: presentation/reset and the complete 629 m switchback/summit/ledge return circuit without reset, in Chromium and WebKit. Each full browser drive took about 1.8 minutes.
- Repeated browser driving attempts timed out under software rendering. An experiment with Playwright's controlled clock was also too slow and was removed. The driving check now uses real animation timing at a smaller viewport; tablet-resolution visual coverage remains separate. No route was shortened and no completion assertion was relaxed.
- Final sequential `npm run test:pwa` passed its production build and five startup/cache/offline checks. The existing WebKit offline-reload case was skipped and remains manual acceptance. Full unrelated suites were not run, in line with the focused iteration policy.
- User scope remains: finish this region, then stop. Glassfall has not been started. No commit, push, or public release has been performed for this region.

Next action: wait for the user's Dish Ridge review. Address feedback within this region; start Glassfall only after the user resumes region construction. The next full unit/browser regression gate remains after Glassfall and Iron Maze, or sooner for broad shared-system changes. Physical iPad Safari acceptance remains outstanding.

### Dish feedback and upward camera — 2026-10-09

- Rebuilt the antenna around the user's industrial radio-telescope reference: 34 m segmented concave reflector, deep radial/hoop lattice, four paired and braced feed arms, large elevation bearing and fork mount, and a maintenance catwalk with rails and ladder. Detailed and distant versions retain the same silhouette; large structures use matching collision meshes.
- Removed coplanar cabinet-side/lid intersections. Overhanging orange caps now sit above the cabinet bodies with a small clear seam.
- Added an area-specific particle palette: Martian rock throws terracotta fragments. Other locations keep their existing rock colour and all handling remains unchanged.
- Extended the upward camera range. The boom lowers to a safe limit, then the gaze rises so tall landmarks fit in view; ground clearance and obstacle sweeps remain active.
- Typecheck, production build, 15 focused unit tests and all four selected browser cases passed. Units cover the concave shell, the summit/ledge routes in both directions, particle colours and default-area isolation, camera orbit/ground clearance/obstruction recovery, and resource cleanup. Chromium and WebKit both passed the feedback capture/actual rock-driving scenario and the existing camera drag scenario.
- Inspected and saved updated antenna, cabinet and particle captures in `artifacts/mars/dish-feedback-review/`, with corresponding WebKit captures in its `webkit/` subfolder. Links and reference are in `artifacts/mars/DISH_RIDGE.md`. No full suite or PWA rerun was needed for these geometry, colour and camera changes.
- Feedback fixes are ready for user review. Stop remains in effect before Glassfall; no new region, commit or push was made.

### Dish tripod joints — 2026-10-09

- Extended all three leg ends into their foundation pads and added raised sockets, burying the full angled end caps.
- Joined the rising orange braces to a central collar and a vertical support reaching the bearing above. Updated visible geometry and matching solids together, including the distant silhouette.
- Production build/typecheck, five focused unit checks (including the summit circuit driven both ways), and the Chromium tripod inspection scenario passed. Reviewed three close views and saved them in `artifacts/mars/dish-tripod-review/`. This local geometry fix did not require full suites or PWA checks.
- Ready for user review. Remain stopped before Glassfall; no commit or push requested for this refinement.

### Dish relay placement feedback

- Identified the user's pictured structures as the three relay antennas. Their original steep-slope placements stretched the terrain-conforming foundations into tall exposed plinths.
- Moved all three onto the level service island at (227, -274), (238, -280), and (251, -274), clear of the main tripod and summit road. Replaced the stretched foundations with low pads and refined the panels, aerials and service boxes to communicate their purpose.
- Production build/typecheck, six focused unit checks (including foundation-footprint flatness, road clearance and summit driving in both directions), and the Chromium relay inspection passed. Inspected and saved two captures in `artifacts/mars/dish-relay-review/`.
- The first browser invocation was blocked by an automatic approval-review usage-limit failure. After the user resumed, the approved retry completed successfully. No outstanding blocker remains.
- Ready for review; remain stopped before Glassfall. No commit or push performed.

### Dish service access follow-up

- Connected the previously floating service deck to the azimuth bearing with an overlapping solid bridge, and braced its outer edge back to the tripod's central column. The ladder now leads to a supported platform.
- Production build/typecheck, the summit circuit driven both ways in focused unit checks, and the Chromium tripod/service-view scenario passed. Inspected and saved the side view at `artifacts/mars/dish-tripod-review/service-bridge.png`.
- Ready for review. Continue to stop before Glassfall; no commit or push performed.

### Service support endpoint correction

- User found that the added deck braces stopped short of the tripod joint and exposed their upper end caps below the deck.
- Both braces now end at the centre of the existing shared tripod collar. Their upper endpoints sit inside a thicker deck slab, with enough depth to contain the full angled caps. Render and collision use the same beams.
- Production build/typecheck, summit driving in both directions, Chromium close-view inspection, and `git diff --check` passed. Refreshed `artifacts/mars/dish-tripod-review/service-bridge.png` after visual inspection.
- Ready for review. Continue to stop before Glassfall; no commit or push performed.


### Glassfall Plain started

The user requested the next region, superseding the earlier stop before Glassfall. Its design card is `artifacts/mars/GLASSFALL_PLAIN.md`. Finish and verify this region, then stop before Iron Maze for review.

### Glassfall implementation and focused verification — 2026-10-09

- Built the pale impact fan, breached scar, three tapered glass ribbons, unequal fracture splinters, pale eastern shields, grounded radial ejecta and a supported 18 m lookout.
- Added six routes: Dish connection, firm circuit, optional glass crossing, lookout spur, Habitat spoke and southern exit. Glassfall is the fourth regional reset/start (`?area=mars&start=glassfall-plain`). Iron Maze remains unbuilt.
- Glass appearance and wheel surface classification share the exact terrain triangles. Refined the initially flat black material with radial flow striations. Added a dedicated lower-grip impact-glass profile without changing the vehicle physics algorithms.
- Typecheck/build and 38 distinct focused unit checks passed: all six routes driven both ways, adjacent Dish descent and Habitat courtyard both ways, grade/reset checks, exact seams and sampling, streaming failures/cleanup, glass boundary agreement, actual Scout sliding comparison, existing surface behavior and resource disposal.
- Both engines passed the crossing out and back. WebKit also passed the complete firm circuit. The first Chromium circuit run was interrupted by a development-server reload after a welcome-text edit; rerun is pending. Presentation/reset passed in both engines, but WebKit screenshots needed an extra rendered frame before capture; refreshed capture run is pending.
- Actual terrain map is `artifacts/mars/glassfall-plain-map.svg`; captures and the region card are under `artifacts/mars/`. Complete remaining browser checks and sequential PWA check before marking this milestone finished.

### Glassfall milestone complete — 2026-10-09

- The isolated Chromium firm-circuit rerun passed. All six final regional browser scenarios passed across Chromium and WebKit: presentation/reset, complete firm circuit, and glass crossing out and back. Refreshed and inspected the captures after waiting for rendered camera frames.
- Sequential `npm run test:pwa` passed the production build and five checks. The existing WebKit offline-reload scenario remains skipped and requires manual iPad Safari acceptance; it is not counted as passed.
- `git diff --check` passed. Region card, actual terrain map, concept-map status and README are updated. Review evidence is in `artifacts/mars/GLASSFALL_PLAIN.md` and `artifacts/mars/glassfall-review/`.
- Next action: wait for the user's Glassfall review and address feedback. Do not start Iron Maze until asked. The next full unit/browser gate remains after Iron Maze, completing the three-region block. No commit or push was requested or performed.

### Iron Maze started — 2026-10-09

The user requested continuation, authorizing Iron Maze as the next individual region. Built six routes, a fifth regional start, an ochre corridor floor, broad lookout shoulder and twelve authored blades/fragments. Initial focused checks pass all new routes both ways and verify closed outward-facing fin geometry with buried feet. Visual review prompted varied ridgelines and more level sediment bands. Focused browser checks and the three-region full regression gate are in progress. Stop before Keyhole Badlands.

### Glass edge and raised-slab feedback — 2026-10-09

- Replaced whole-triangle glass selection with continuous contour clipping, refined near the shoreline. Removed the coarse dark terrain tint underneath and disabled glass shadow casting to eliminate its false dark fringe.
- Following the user's additional direction, made the ribbons solid raised slabs: gently undulating 31–45 cm interiors with 1.8 m rounded bevels down to the ground. The rendered mesh supplies the collision mesh; firm routes remain excluded, and wheel grip follows the continuous glass footprint.
- Typecheck, production build and three focused glass unit checks passed, including nondegenerate contours, relief bounds, collision registration and the existing actual-Scout lateral-grip comparison.
- User explicitly requested to check first without longer checks. No browser captures, route-driving suites, full regression or PWA rerun were performed for this revision. Existing saved images show the previous flat version; actual driving over the new slab bevels and visual acceptance remain unverified.
- Exact next step: user previews `?area=mars&start=glassfall-plain` and drives the crossing, then address feedback before running longer checks. Iron Maze status is unchanged; do not proceed to Keyhole Badlands.

### Obsidian direction — 2026-10-09

- User rejected the soft lava-flow appearance and chose low angular obsidian plates with taller shards beside the crossing.
- Split the glass fields into irregular fracture cells with pale gaps, flat dark faces and straight chamfers. Plate heights vary from 22–42 cm; removed sinusoidal relief and flowing color bands. Added solid pointed fragments outside the full route shoulders.
- Initial focused glass checks and build passed. Reduced unnecessary edge subdivision and cached base-terrain heights after the geometry check exposed excessive generation cost. The bounded representative chunk now generates about 59,500 triangles in 3.4 seconds on this machine; further performance and visual review remain outstanding.
- Browser, real route-driving, full-suite and PWA checks remain deferred at the user's request. Existing captures do not show this revision. Next: user reviews the obsidian appearance and low crossing before further checks or region work.

### Restore solid lava-like flows — 2026-10-09

- User preferred the earlier lava-like version and requested solid flows without sand-filled fractures, simpler geometry and no shards.
- Removed the fracture-cell mask and restored continuous raised flows, rounded 1.8 m edges, 31–45 cm relief and radial streaks. Removed both the added roadside shards and the original scar splinter cluster; retained the central impact stone. Matching collision and the firm route remain.
- Kept cached terrain samples and boundary-only refinement; no interior fracture subdivision remains. Typecheck, three focused glass tests and production build passed. The focused tests took about eight seconds.
- No browser, route-driving, full-suite or PWA checks were run. Next step remains the user's visual/driving review of Glassfall; do not advance region work.

### Connect flows to the impact source — 2026-10-09

- Added a shared 10 m-radius dark melt pool under the central impact rock, joining all three flow roots without pale gaps.
- Added five grounded black rocks around the central stone, with matching collision. The compact cluster stays at the impact source rather than scattering shards along the driving routes.
- Typecheck, four focused glass checks and production build passed. New coverage samples the continuous connection from the source into each flow and verifies the glass grip classification.
- Longer browser/driving/PWA checks remain deferred. Next: user reviews the source connection and rock cluster in-game.

### Black flow coloring — 2026-10-09

- Removed the lighter radial streaks and made flow vertex colors uniformly near-black. Increased roughness and removed metalness to subdue pale specular highlights; geometry and collision are unchanged.
- The focused uniform-color/collision test and production build (including typecheck) passed. Browser and longer checks remain deferred for user review.
- Next: user reviews the black flows in-game before any further changes.

### Expanded exploration layout — 2026-10-09

- User approved a 1,536 × 1,536 m world and an initial Dish Ridge → Glassfall → Iron Maze journey, with focused checks only before their first drive. This supersedes the compact-world layout; it does not authorize new regions or a release.
- Added shared world bounds and explicit regional placements. Dish moves to (398, -472), Glassfall to (500, -30) with 1.45-times-wider landforms, and Iron to (380, 460) with 1.4-times-wider landforms. Road widths, buildings, rocks and vehicle scale stay unchanged, except modestly enlarged Iron hero fins. Habitat and Crown retain pilot positions.
- Reauthored the Crown connection, Habitat spoke and two eastern connectors. Rust gullies, central shoulders and a sediment ridge screen destinations; pale ground/ejecta and low iron fins introduce the next geology. Broad connector shoulders avoid narrow artificial embankments. Fog remains 80–480 m.
- Updated nominal/apron chunk bounds, exact surface-sampling clamps, Great Ring position, horizon generation and landmark ownership. The detailed streaming rings remain 5×5 render / 3×3 collision. Updated regional starts, scenery ownership and browser capture coordinates together.
- Redrew `artifacts/mars/concept-map.svg` and updated regional cards and README. Earlier regional maps/captures are explicitly historical; new Chromium views are [rust gully](artifacts/mars/expansion-review/rust-gully.png), [Glassfall reveal](artifacts/mars/expansion-review/glassfall-reveal.png), and [Iron reveal](artifacts/mars/expansion-review/iron-reveal.png).
- Fourteen distinct focused unit checks passed across the iteration: expanded bounds/apron sampling, connected route spacing, terrain sightline occlusion/reveal, exact seams/LOD edges, route grades and reset clearings, dish shell/terrace/relay placement, closed Iron geometry, glass source/contours/color/collision, and streaming transitions/disposal. One shifted-lattice descent grade marginally exceeded the existing limit; raising its intermediate road point by 1 m fixed it without changing the assertion.
- Final production build/typecheck and `git diff --check` passed. A short Chromium scenario (about 14 seconds) loaded three new viewpoints with wheel contact and no page errors. Inspected the actual captures and broadened the new connector shoulders after the first pass. This is a presentation smoke check, not a completed drive.
- User-directed omissions: no long real-driving route suites, full browser regression, WebKit region gate, PWA rerun or device-performance acceptance. The last full-suite status remains unchanged/unrecorded. Expanded-layout acceptance is still pending; prior compact-region gates do not certify it.
- Exact next step: user opens `http://127.0.0.1:5173/?area=mars&start=dish-ridge`, drives the southern descent through Glassfall and toward Iron, and reviews the sense of scale and reveal timing. Address that feedback before long validation, further redistribution or Keyhole work. No commit or push was requested for this revision.

### Landscape feedback and streaming cost — 2026-10-09

- Removed road subtraction from the glass footprint. The firm loop now goes around the flow ends instead of cutting light strips through them; the optional crossing still traverses intact glass. Moved the nearby pale slabs clear of the revised route.
- Removed the two large screening peaks north of Glassfall, lowered its approach to 8–12 m, widened the flat/pale transition, and replaced the central Gaussian hills with two low asymmetric sediment shoulders (14–18 m). Iron retains a stronger 46 m screening shoulder and its verified hidden/reveal sequence.
- Removed both small precursor fins found on steep slopes. The main Iron field is unchanged; the remaining small approach fin sits on gentle ground.
- Increased haze modestly from 80–480 m to 65–370 m. Geometry and atmosphere now leave Glassfall open rather than surrounding it with competing peaks.
- Simplified glass to a uniform 1.2 m clipped lattice: **14,750 triangles total, 6,170 in the largest chunk**, measured at about **140 ms for the whole field** locally. An initial smaller adaptive version showed fine open seams at mismatched subdivisions; the final uniform lattice removes those seams. New checks enforce matching interior edges, per-chunk/whole-field budgets, and a 15 cm boundary approximation appropriate to the simplified geometry.
- Removed repeated whole-horizon index allocation and normal recomputation during chunk activation. The static normal buffer and dynamic index buffer are now reused, updating only tiles whose visibility changes. Lifecycle checks verify buffer identity, unchanged normals, active-ring bounds and disposal.
- Eleven distinct focused unit checks passed across the iteration, including full glass checks, real-Scout lateral grip, route grades, Iron solids, bounds, reveal logic and streaming. Final build/typecheck and whitespace check passed. The short four-view Chromium and WebKit smoke checks passed (about 21 seconds combined); inspected actual captures of the open plain, intact flows and Iron approach.
- Current review images are in `artifacts/mars/landscape-feedback-review/`, with WebKit counterparts in `webkit/`. Concept map and region documentation reflect the latest feedback; the earlier tall-ridge captures remain historical.
- Long real-driving/full-browser/PWA suites remain deferred. Local geometry timings are not an iPad frame-rate guarantee. Next: user drives Glassfall's revised loop and the Iron approach, checking the quieter landscape and reduced loading pauses before further validation. No commit or push performed.

### Unmarked wilderness, stronger haze and sampling reuse — 2026-10-09

- User approved the quieter landscape but reported remaining Glassfall/Iron pauses and distant scenery appearing. Removed the Glassfall crossing route entirely, including its terrain grading/coloring, map line and route-index consumers. The flow field remains driveable over natural dust and raised glass; the firm perimeter loop and connected exits remain.
- Restricted trail posts to the existing developed Habitat/Crown/Dish routes. Glassfall, Iron and their connecting wild roads have no posts or post colliders. Updated the Glassfall welcome hint to describe off-road exploration instead of a crossing road.
- Increased haze from 65–370 m to **55–220 m**. Actual Chromium/WebKit captures retain nearby glass and Iron silhouettes while substantially fading distant scenery. Current captures: `artifacts/mars/wild-terrain-review/` and its `webkit/` subfolder.
- Local sampling identified repeated full terrain/road evaluation while grounding scenery. Added a bounded **8,192-entry** cache of immutable Float32 lattice heights and removed repeated corner evaluations within each interpolation. Heights, normals, meshes and vehicle handling are otherwise unchanged. Tests compare exact lattice interpolation after cache eviction.
- On the same sampled chunk sequence, local Glassfall scenery construction fell from roughly **16–63 ms to 11–32 ms**, and sampled Iron chunks from roughly **6–13 ms to 1–4 ms**, including the reduction from removed posts. These are local CPU construction measurements, not device frame-time guarantees; some chunk activations still exceed a 16 ms frame.
- **13 focused unit checks passed**, covering post removal/retention, cache eviction, exact terrain sampling, grades, route connectivity, glass geometry/collision/grip and streaming lifecycle. Typecheck/build passed. **Four short browser checks passed** in about 38 seconds: presentation in both engines and an actual Scout drive across an unmarked glass edge in each.
- Long route drives, full suites and PWA checks remain deferred; no new full-suite gate is claimed. Next: user reviews haze visibility and remaining pauses while driving through Glassfall and Iron. Sustained target-device profiling remains open. No commit or push requested or performed.

### Iron crest correction — 2026-10-09

- User spotted twin peaks with a deep top gap. The non-planar top had been triangulated as a fan from one low end, producing an unintended sunken roof. Replaced it with four paired strips joining opposite crest sections.
- Narrowed the top from 22% to 8% of base width, retaining irregular heights, all lower strata and grounded feet. Rendering and collision still use the same closed geometry; triangle count is unchanged.
- Both focused Iron geometry tests pass, including downward rays at each interior crest station of every fin to reject sunken caps. Build/typecheck pass. Short Chromium/WebKit presentation/reset checks pass; long driving/full/PWA suites remain deferred. Added a dedicated end-on crest capture to the presentation scenario.
- Next: user reviews the narrower, solid tops. No commit or push performed; earlier target-device performance review remains open.
