# Mars implementation progress

Read this file with `MARS_BUILD_PLAN.md` before continuing. Verify status against the code and test evidence; an unchecked milestone is unfinished. Update this record at every milestone and before stopping.

## Current work

Started 2026-10-07. **Stopped on 2026-10-08 after implementing and verifying the Habitat Seven / Crown Crater pilot. The user requested stopping before the next region. Do not begin Dish Ridge under the current authorization.** Mars stays out of the production picker during development. Existing world code was clean at the start; the two concept/plan documents were untracked.

## Milestones

- [x] World layout, region design cards, and concept map.
- [x] Deterministic terrain and worker streaming, with seam and lifecycle tests.
- [x] Habitat Seven, Crown Crater, northern Great Ring, and connected pilot routes.
- [x] Mars Scout model, surface feedback, regional starts, and development entry.
- [x] Pilot driving and visual checks in Chromium and WebKit; build and PWA checks (known WebKit offline-reload skip remains manual acceptance).
- [ ] Dish Ridge.
- [ ] Glassfall Plain.
- [ ] Iron Maze.
- [ ] Keyhole Badlands.
- [ ] Fossil Delta.
- [ ] Rust Dunes.
- [ ] Lava Tubes and Quiet Vault.
- [ ] Full circuit, regression checks, public integration, and device acceptance.

## Decisions

- Work in individually verified milestones. Do not implement seven unreviewed regions in one pass.
- Keep existing gravity and four-wheel physics. The Scout is a new vehicle model; terrain supplies handling differences.
- Preserve Northern Reach's runtime while introducing a small Mars-specific generator/runtime. Share existing vehicle, camera, effects, and disposal APIs; avoid a risky rewrite of Northern Reach's region-specific prop system.
- The first pilot uses only Habitat Seven and Crown Crater regional starts. Future regions appear on the design map, not as finished in-game destinations.

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

Region work remains stopped. Preview the pilot with `npm run dev` at `http://127.0.0.1:5173/?area=mars`; use `&start=crown-crater` for the crater entrance. The Great Ring outside the pilot and other sectors remain development terrain, not finished regions. No automatic continuation has been scheduled.

Dish Ridge is the next implementation milestone **only after the user asks to resume region work**. Start by reading its design card and inspecting the Crown connection; build and verify that region individually using the plan's geometry, landmark, real-driving, and browser gates.
