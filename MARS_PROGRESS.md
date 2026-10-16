# Mars implementation progress

Read this file with `MARS_BUILD_PLAN.md` before continuing. Verify status against the code and test evidence; an unchecked milestone is unfinished. Update this record at every milestone and before stopping.

## Current work

### Northern Reach postcard route audit and journal presentation — 2026-10-16

- Audited every authored Northern Reach trail in both directions against the postcard tracker. Several far-side trails missed their start-centred circle, including Gravel Ford and the long Alder bank, the River Mouth south spit, and separate mountain/forest spurs. Added visit zones on those ordinary routes. Alder River now has discovery points at both fords and along five upstream bank stretches, including the far end, so a drive along the river need not pass one fixed spot. Stone Circle retains its small secret visit circle.
- Tracker tests cover all authored trails in both directions and four independent Alder bank stretches in both directions. All ten focused postcard unit tests passed. Focused real-driving far-upstream Alder and journal presentation scenarios passed in Chromium and WebKit (6/6).
- Recaptured all 27 Mars and Northern Reach postcard JPEGs from the saved photo views after the terrain lighting change. Inspected contact sheets for both worlds; all scenes and landmarks rendered. Unlocked secret postcard cards and details now use a dark background, gold border, and clear discovery badge. The discovery notice opens the journal focused on its card and returns to driving when closed. Inspected full Chromium captures of the secret card and detail.
- Typecheck and production build passed. The six focused Chromium/WebKit browser checks passed; the secret card capture scenario passed again in Chromium after adding full card/detail screenshots. No full browser/unit or PWA suite ran per the user's instruction to avoid long tests. Last full-suite run remains 2026-10-11; existing WebKit touch/offline automation gaps and physical iPad review remain open.
- **Exact next step:** commit and push these accepted lighting, postcard image, presentation, and discovery-route changes. If a particular Northern off-road path still misses, record its car coordinates and add a local visit zone.

### Fossil Delta and Rust Dunes postcard routes — 2026-10-16

- User reported that the ordinary cards sometimes appeared only on a second approach. Their single 76 m start-centred circles missed alternate branches and arrivals from the far end. Added visit zones on the Delta northern/southern channels, sediment shelf, and western junction, and on the Dunes bedrock perimeter, crescent crest, and island loop. Cards still require at least 8 m of actual driving after spawn/reset/teleport; no route, collision, landmark or image changed.
- Focused tracker tests cover each of the six through routes in both directions and passed (8 postcard tests total). Focused real-Scout feature drives in Chromium and WebKit verified first-pass saved discoveries for both regions (4/4 passed). Typecheck and production build passed.
- The PWA suite started before the user instructed us to stop long tests. It was interrupted immediately on that instruction: eight Chromium cases had passed; one WebKit case was interrupted and seven did not run. **The PWA suite is not counted as passed.** Last complete PWA result remains the earlier 13 passed / three skipped run; last full unit/browser suite remains 2026-10-11.
- **Exact next step:** user checks a first drive through Delta and Dunes in the live preview. If a specific track still misses, record its path and add a route zone at that track. Do not resume long suites until the user asks.

### Buried Shuttle discovery coverage — 2026-10-16

- User reported driving past the visible shuttle without a discovery. The secret postcard's only visit circle was 41 m around the buried hull centre; the clear west-side approach enters it only near its final point. Added three 42 m visit zones along that unmarked exterior approach, retaining the central circle. The ordinary Delta/Dunes route stays more than 100 m from these zones; no marker, route or scenery changed.
- A focused tracker test proves a west-flank drive unlocks the card while a connector pass does not. The existing real-Scout shuttle browser scenario now verifies that the forward exterior drive saves the discovery; it passed in Chromium and WebKit (2/2). Postcard unit tests passed (7/7), typecheck and production build passed. PWA suite: 13 passed, with the three existing WebKit offline cases skipped. No full unit/browser suites ran; last full-suite record remains 2026-10-11.
- **Exact next step:** revisit the shuttle in the live preview along its west side and confirm the notice appears; if a different visible drive-by still misses, use the car position from Photo mode to adjust only that accessible flank.

### Smooth terrain lighting across locations — 2026-10-16

- At the user's request, switched only the basic terrain materials in Sunshine Valley, Iceland Highlands, and Northern Reach to interpolated vertex normals. Mars terrain was already switched in the prior pass; Samurai Village terrain already used smooth normals. Rocks, buildings, roads/ramps, and other authored props retain their existing materials. Render vertices and collision geometry did not change.
- Inspected fresh Chromium game captures at `artifacts/valley-smooth-terrain.png`, `artifacts/highlands-smooth-terrain.png`, and `artifacts/northern-reach-smooth-terrain.png`. Focused drive/lifecycle scenarios for all three affected locations passed in Chromium and WebKit (6/6). Typecheck and production build passed. No full suites ran; last full-suite record remains 2026-10-11.
- **Exact next step:** user compares the live views across locations; address any specific visible chunk seam or terrain surface that needs local normal refinement.

### Crown Crater terrain lighting — 2026-10-16

- User reviewed the live Crown and Lava Tubes views and found the lighting somewhat better; remaining angular cliffs and a jumping Scout are the new concern. Iceland Highlands also uses a 2.4 m terrain lattice and formerly shared Mars's flat terrain shading, but has gentler terrain profiles. Lava Tubes additionally has steep terraced terrain, separate collidable roof skins and rocks, and the shared rock surface's visual/camera bump effect. A screenshot alone does not isolate which of these causes a particular jump.
- **Exact next step after visual review:** reproduce one jump at a recorded car position and route, log wheel contacts/body motion against the visible terrain and solid props, then smooth only the offending terrain/roof/rubble geometry or tune the rock bump effect as indicated. Keep render and collision geometry aligned, and run the affected real-driving unit/browser scenarios in both engines.
- Switched the Mars terrain material to interpolated vertex normals. This removes much of the visible triangle-by-triangle lighting on Crown's bowl without changing terrain vertices, collider triangles, routes, or handling. Landmarks keep their authored flat shading. The remaining angular edges in the crater wall come from the 2.4 m terrain lattice and sharp height profile.
- The focused pilot presentation/reset scenario passed in Chromium and WebKit (1/1 each); its Crown capture now waits for streaming and uses the normal raised camera angle. Inspected both actual game captures and saved the WebKit view at `artifacts/mars/crown-smooth-lighting.png`. Typecheck and production build passed. No full suites ran; the last full-suite record remains 2026-10-11, and physical iPad acceptance remains open.

### Northern Reach postcard views supplied by user — 2026-10-15

- Saved the user's 17 Northern Reach photo-mode views in `artifacts/postcards/northern-reach-photo-views.json`. Pine Hollows was the one supplied view without an existing journal entry; added it as a discoverable card near the southern pine hollow. Northern Reach now has 16 ordinary cards plus the hidden stone circle.
- Regenerated all 17 car-free JPEGs at 800 × 520 from the exact camera positions, targets and field of view. Inspected a contact sheet; every view rendered. The capture script now requires complete saved-view coverage in both supported locations.
- Focused postcard unit tests passed **6/6**, including Pine Hollows discovery after driving; the journal browser scenario passed in Chromium and WebKit **2/2**. The production/PWA suite passed **13 tests with three existing WebKit offline scenarios skipped**, confirming the new image is precached. Typecheck and production build passed. No full unit or driving browser suites ran; physical iPad acceptance remains open.
- User reviewed and accepted all Northern Reach postcard images. **Exact next step:** no recapture is pending; retain the saved views for any later revisions.

### Mars postcard views supplied by user — 2026-10-15

- Saved the user's ten photo-mode view records in `artifacts/postcards/mars-photo-views.json`, including car pose and exact camera position, target, and field of view. They cover all nine Mars regions plus the hidden shuttle; no Mars postcard view is missing.
- The reproducible postcard capture script now uses those exact Mars camera views and streams detailed terrain around each view. Regenerated all ten car-free `public/postcards/mars/` JPEGs at 800 × 520 and inspected a contact sheet; each image rendered with its intended scene and no blank/missing terrain was observed. The user then supplied a replacement Crown Crater view at (-108.801, 31.365, -248.616); saved it and regenerated that JPEG. The full-size image shows the crater wall clearly.
- Typecheck and production build passed. The focused Chromium postcard browser scenario passed (1/1), confirming an unlocked Mars postcard still displays its image and survives reload. No full suites or PWA suite ran for this visual capture pass; prior full-suite and physical-device gaps remain unchanged.
- User reviewed and accepted all Mars postcard images, including the revised Crown Crater. **Exact next step:** no recapture is pending; retain the saved views for any later revisions.

### In-game photo mode for postcard framing — 2026-10-14

- Added a photo mode available while driving in every location. P freezes the car; dragging the scene or using arrow keys adjusts yaw and pitch, WASD moves the camera horizontally, Q/E changes height, and +/− zooms. Shift accelerates movement. H hides the car, U hides the interface, and C copies the area, car pose, and exact camera view for sharing with screenshots. P or Escape returns to driving. The top-bar button was removed to keep the driving interface clear.
- Streaming follows the camera while composing a shot. On exit, the game restores terrain and collision around the parked car before physics resumes.
- Postcard JPEGs now live in `public/postcards/northern-reach/` and `public/postcards/mars/`; the journal, capture script, and offline-cache checks use those paths.
- Backgrounding the browser now preserves photo mode, including its framing and hidden-car/UI choices. Held camera keys and an active drag clear on focus loss. Ordinary driving still opens the pause screen when backgrounded. Focused background-event browser checks passed in Chromium and WebKit (2/2); typecheck and production build passed.
- Typecheck and production build passed. Focused Mars photo-mode browser scenarios passed in Chromium and WebKit (2/2), including scene dragging and return to driving; Chromium captures from the clean starting view and after dragging were inspected. The PWA suite passed **13 tests, with three existing WebKit offline scenarios skipped**, confirming the relocated images are precached and an unlocked image opens offline in Chromium. No full unit or driving browser suites ran. Last full-suite record remains 2026-10-11.
- **Exact next step:** user captures and shares preferred landmark screenshots and, if possible, the copied view for each; recapture weak postcard images to match those references and inspect visible landmarks.

### Postcard camera-angle pass — 2026-10-14

- User set a general rule that the landmark must be clearly visible and the postcard camera should usually look a little more from above. Stone Circle needed a modest zoom and more sky; Keyhole Badlands was accepted as-is.
- Re-captured 25 car-free game images with a modestly higher view for ordinary scenes, individual upward framing for tall Dish Ridge and shuttle landmarks, and a tighter Stone Circle frame that keeps the whole circle visible beneath the sky. The Keyhole image was preserved byte-for-byte. Updated the reproducible capture script with output-directory and skip controls.
- Inspected representative full-size captures and the 26-image contact sheet. Some regional landmarks still need a better camera position; the higher angle alone does not solve those images. Awaiting the user's reference screenshots before their individual reshoots.
- Build/typecheck passed; the focused Chromium postcard browser scenario passed. Focused PWA cache/offline checks **3 passed, one existing WebKit offline scenario skipped**. No long suites ran for this image-only pass.
- **Exact next step:** use the user's landmark screenshots to choose positions and headings for the weak regional images, recapture them, and inspect each against the visible-landmark rule.

### Lava Tubes postcard trigger correction — 2026-10-14

- User reported driving through the tubes without receiving the postcard. The card was anchored at the southern regional start (-455, -275), so a drive through the covered passages from the Crown side could miss its 76 m radius.
- Moved the main unlock point to the passage centre (-430, -456), covering both tubes, and added a second 76 m zone at the surface lookout for the bypass route. The card still requires eight metres of actual post-spawn/reset/travel driving.
- Focused postcard unit tests **5/5 passed**, including both passages, bypass, and no early unlock at the southern start. A real Scout drive in the western tube unlocked the card in **Chromium and WebKit (2/2 passed)**. Typecheck and production build passed. No unrelated suites ran.
- **Exact next step:** user checks the trigger on their route and sends landmark framing references; refine postcard images from those references before committing.

### Postcard presentation follow-up — 2026-10-14

- User feedback: make secret cards more distinctive, replace “Unknown place,” enlarge unlocked images, make discovery notices easier to see, and turn the journal entry button into a photo-stack tile.
- Locked secrets now use a purple/gold card with a star and “Secret discovery.” Home and pause journal tiles show a layered photo preview and progress. Unlocked photos open a large dialog with the original game image, note and visit date; Escape and the close button return to the journal. The discovery notice uses that image, stronger contrast, and animated entrance/exit.
- Focused Chromium/WebKit journal browser scenarios **4/4 passed**. Typecheck and production build passed. A focused Chromium PWA scenario opened an enlarged postcard while offline; WebKit's automated offline scenario remains skipped pending physical iPad Safari review. No full unit/browser suites ran for this presentation follow-up.
- **Exact next step:** review the revised journal and discovery notice in game; refine only the visual details the user identifies before committing.

### Postcard journal for Northern Reach and Mars — 2026-10-14

- Added a fresh journal on the home and pause screens for these two worlds. It contains 15 Northern regions plus the hidden stone circle, and nine Mars regions plus the hidden shuttle. Locked secret cards conceal their names. Unlocked cards show car-free game captures, authored notes and the first visit date; records persist in local storage.
- A driving pass near each place unlocks its card at any speed after eight metres of post-spawn, post-reset or post-travel movement. Segment checks cover motion between frames; teleports and other world visits cannot unlock a card. A short notice appears during play without interrupting driving.
- Generated and inspected 26 current-game JPEG captures (800 × 520, about 377 KiB total), including the stone circle, dish and buried shuttle. The capture script is in `artifacts/postcards/`.
- Focused postcard unit tests **4/4 passed**. Journal browser scenarios **4/4 passed** across Chromium and WebKit, including actual driving and reload persistence. Typecheck and production build passed. PWA suite **12 passed, 2 existing WebKit offline scenarios skipped**; new postcard images were confirmed in the offline cache in both engines.
- No full unit/browser suites ran for this scoped journal UI and persistence addition. Last full-suite record remains 2026-10-11. Physical iPad Safari review, including offline reload, remains open.
- **Exact next step:** review the journal and its 26 images in game, then adjust any framing or copy the user identifies before committing.

### Focused shuttle verification — 2026-10-14

- User authorized the proposed focused wreck unit tests and Chromium scenario after accepting/pushing `8f9ae20`.
- Initial unit run: 3/4 passed; the geometry check caught dust vertex colors slightly above 1. Clamped the red component to 1 without changing geometry, collision, terrain or assertions. Rerun: **4/4 passed**, including closed structure, deterministic texture-free finish, sampled track concealment and real Scout exterior approach in both directions.
- Focused Chromium scenario: **1/1 passed** (44.5 s), including rendered views and real two-way approach driving. Inspected the reveal and forward-drive captures. This browser run preceded the color-only clamp; the final unit rerun and production build include it.
- Production build (including TypeScript checking) passed after the fix. No full regression, WebKit or PWA suites ran. Last full-suite record remains 2026-10-11; physical-device acceptance remains unverified.
- User requested commit/push of the color clamp and verification record. No checks were repeated for this documentation and commit step.
- **Exact next step:** no further focused fixes are pending; WebKit and physical-device acceptance remain optional follow-up work.

### Selected shuttle installed; comparison removed — 2026-10-14

- User chose study F and requested replacing the existing hidden wreck and removing all temporary wreck functionality. The buried shuttle is now the sole wreck at (-653, 265), with its tall swept fin, rudder, asymmetric stabilizers and three open exhaust bells. It sits 3 m deeper than the study version to meet the sand at the hidden site.
- Raised the existing east/north screening bank amplitudes to 39/37 m for the taller fin; authored road grading still takes precedence. Expanded local scatter clearance to cover the exterior approach. Visible geometry supplies collision through the existing chunk lifecycle.
- Removed both study source files, all temporary placement/scatter hooks, plaques, picker, URL handling and comparison capture script. Kept historical screenshots as archived design evidence. Main startup and general landmark integration have no remaining experiment changes.
- Typecheck and production build passed. Inspected actual Chromium reveal, stern, side, connector and perimeter captures in `artifacts/mars/shuttle-wreck/`; the shuttle is hidden in both captured track views. These captures do not establish all-route concealment or driving acceptance.
- Updated existing wreck unit/browser definitions from the removed hollow-hull experience to the shuttle's structure and exterior approach. **No tests ran**, including automated sightlines, driving, browser, WebKit or PWA suites. Last full-suite evidence remains 2026-10-11 and does not certify this replacement.
- User accepted the installed shuttle and requested commit/push. This revision records that accepted replacement and the removal of the temporary comparison. No additional tests were run for commit/push.
- **Exact next step:** inspect any publication separately if requested; deferred driving/sightline/device checks require a new instruction permitting tests.

### Temporary six-wreck refinement — 2026-10-14

- Latest user scope: add a tilted flying saucer partly buried in sand and a shuttle tail with a huge fin and engine exhaust, and refine all comparison geometries. **Do not run tests.**
- Added E **Buried saucer** at (-240, 155): closed lens-shaped disc, rolled equator, segmented rim, raised canopy and a broken stabilizer; the tilted lower edge intersects the actual terrain. Added F **Shuttle stern** at (255, 35): buried nose-down fuselage, tall swept fin and rudder, asymmetric stabilizers and three thick open exhaust bells. Moved F off a mound and buried it deeper after inspecting its first capture.
- Refined A with an aft frame, internal rails and dorsal spine; B with a recessed throat and cooling vanes; C with longitudinal rails and a diagonal brace; D with a raised docking collar and recessed hatch. The gray texture-free hull palette and mesh-based collision remain. Expanded the temporary comparison picker to A–F.
- Typecheck and production build passed. Inspected actual Chromium overview/close captures for all six under `artifacts/mars/wreck-comparison/`. No unit, browser, PWA, driving or WebKit test suites ran. Driving/collision acceptance and physical-device performance remain unverified; last full-suite release record is still 2026-10-11.
- These are uncommitted development-only comparison models. Original hidden wreck, screening terrain and authored roads are unchanged. Local server: `http://127.0.0.1:5174/?area=mars&wrecks=1`.
- **Exact next step:** user compares A–F and chooses a direction; apply the chosen design to the hidden discovery and remove temporary models only when requested. No deferred tests without a new instruction.

### Temporary four-wreck comparison — 2026-10-13

- Latest user scope: commit the accepted Northern Reach discovery, then create four temporary Mars wreck geometries near Habitat Seven for comparison. **Do not run tests.** Northern Reach is committed as `c74ca4a`; the Mars experiment is a separate, uncommitted change.
- Added A **Wedge prow** at (-95, 165), B **Fractured drive** at (130, 150), C **Split cargo hull** at (-110, 275), and D **Toppled lander** at (130, 275). Each has a different silhouette, thick open skins and matching visible/collision geometry. Hulls use clean gray materials and vertex-color dust; only the temporary identification plaques use text textures.
- The existing hidden wreck at (-653, 265), its screening sand, and all authored roads remain intact. The comparison models and their local scatter clearances are development-only. Production builds exclude the experiment. No new permanent region, route or reset destination was added.
- Local review: `http://127.0.0.1:5174/?area=mars&wrecks=1`. Start driving, then use the A–D picker to jump between the four views. The picker uses a lower camera pitch only for this comparison URL. All models can also be approached from Habitat on the running development server.
- Typecheck and production build passed. Inspected actual Chromium overview and close captures of all four concepts under `artifacts/mars/wreck-comparison/`; adjusted framing and the cargo sidewall mass after inspection. No unit, browser, PWA, route-driving or WebKit tests were run, as requested. Collision/driving acceptance and physical-iPad performance are unverified for these prototypes. The last full-suite release record remains 2026-10-11 below.
- **Exact next step:** user compares A–D in game and selects a direction. Refine that geometry, then replace the original hidden-site hull and remove the temporary study layout/picker only when requested. Do not treat this comparison as release-ready or run deferred suites without a new instruction.

### Shared lower driving camera — 2026-10-12

- Applied Mars's existing `-0.2` initial driving pitch to Northern Reach, Sunshine Valley, Iceland Highlands and Samurai Village. The separate home showcase framing is unchanged; yaw, boom distance and camera collision handling are unchanged.
- Typecheck and production build passed. Focused starting-camera checks passed in landscape and portrait in Chromium and WebKit for all five locations (10 browser cases). Inspected actual Northern Reach, Iceland, Samurai Village and Valley driving captures. No long driving, full browser or PWA suites ran for this camera-only change; previous full-suite evidence is unchanged.
- Next: review the new Earth driving views in game and tune the shared pitch only if visual feedback calls for it. The user requested a commit and push without waiting for publication.

### Home screen and driving hint refresh — 2026-10-12

- The home screen now uses rendered, car-free location tiles; Northern Reach is first and the default, and Mars Outpost is last. The logo scrolls with the home content, and the pause action says “Back to home screen.”
- Shortened the Habitat Seven driving hint and moved driving hints above the phone controls and surface label. They fade after six seconds and hide on very short landscape screens. Inspected a fresh 390 × 844 Mars game capture after the final styling change.
- Typecheck and production build passed. Five focused home/hint browser scenarios passed in Chromium and WebKit; the final hint layout rerun passed in both engines. The focused PWA thumbnail cache checks passed earlier in this home-screen iteration. Per the user's direction, no long driving or full suites were run for this UI work. The last full-suite record below is unchanged; physical iPad acceptance remains open.
- Next: publish the home-screen refresh through Pages, inspect the deployment, then collect phone feedback.

### Accepted feedback release — 2026-10-11

The user accepted the final angled home preview and lower behind-car driving
view and requested commit/publication. Publish these changes together with the
already committed Safari update fix `b75c91b`. Per the user's instruction, do
not repeat full local suites for this release; focused verification below is
complete, and the existing Pages workflow retains its unit/build gate.

Published as **`e9525fd`**, including Safari update fix **`b75c91b`**.
[Pages run 38147358987](https://github.com/wroluk/little-roamer/actions/runs/38147358987)
passed its unit/build gate and deployment. Live WebKit verification confirmed
Mars forces the Scout even for an incompatible car link, gameplay starts, and
returning to Earth exposes only Modern/Classic.

Latest scope supersedes the publication instruction below for these changes:
Mars Scout is exclusive to Mars; Modern/Classic are exclusive to Earth. The
picker hides and disables incompatible models, rejects synthetic incompatible
changes, normalizes direct links, migrates legacy Scout storage to an Earth
default, and preserves the selected Earth model across Mars visits.

Habitat arrival and regional reset now use the southern part of the 07 pad
(0, 40), facing Crown; the (0, 8) road anchor is unchanged. Mars alone uses a
lower driving view directly behind the car. The home screen retains the shared
angled car showcase, with the normal transition into driving and no special fly-in.
The user accepted the pad alone as the habitat clue and requested removing the
initial side angle; a dome need not be visible. The original camera distance and 48-degree
field of view are preserved (the first wide/far framing trial was discarded). Earth retains its
original camera. Glass longitudinal/lateral grip is now 0.18/0.12 with full
uphill slip: the actual Scout cannot crest the glass-covered impact lip in
forward or reverse, but can drive level glass; firm perimeter routes remain.

Validation completed:

- Home-screen follow-up: restored the standard angled showcase on Mars while
  retaining the lower, directly-behind driving view. Typecheck/build and both
  browser startup scenarios pass with separate home-angle and driving-alignment
  assertions. Inspected the current home capture in session `files/mars-home-angle/`.
  This supersedes the earlier no-transition home framing. Not committed or pushed.
- Rear-view follow-up: removed the initial side angle while retaining the lower
  pitch and pad spawn. Typecheck/build and both Chromium/WebKit startup scenarios
  pass, including explicit behind-car alignment assertions. Inspected the current
  driving capture under the session's `files/mars-rear-camera/`; this supersedes
  earlier side-angle captures. Changes remain local, uncommitted and unpublished.
- Final `npm run typecheck`, `npm run build`, and 23 focused
  model/surface/glass tests pass. The broader Mars unit run also passed all 103
  existing Mars terrain/route checks, including every route in both directions.
  An initial impact probe spawned inside a source rock; the corrected probe is
  clear of it, with a firm-traction control proving the same slope is climbable.
- Chromium and WebKit pass world/picker/storage/URL startup, static pad framing,
  actual glass-lip driving, firm circuit, off-road glass both ways, regional reset,
  Earth picker regressions, and nine-region resource lifecycle checks.
- The original lifecycle assertion compared cold GPU allocation against warmed
  distant landmarks now hidden by the lower initial camera. Reproduced separately
  and compared against unchanged `b75c91b` on an isolated server (baseline passes).
  The test now warms one circuit and compares two subsequent full circuits with
  unchanged resource thresholds; both engines pass. No streaming/physics workaround.
- One pilot rerun was interrupted by development-server reload while deleting the
  isolated baseline scratch checkout; its isolated final rerun passes both engines.
- Sequential `npm run test:pwa`: **12 passed, 2 existing WebKit offline skips**,
  including tablet/phone update activation and world-restricted production selection.
  Physical iPad offline/module-worker and two-thumb touch acceptance remain manual.
- The final close-camera refinement passes the world/picker/framing scenario in
  both engines. Its current captures are in the session's
  `files/mars-feedback-close/` (per-engine `mars-pad-home.png` and
  `mars-pad-driving.png`); these supersede the initial wider framing trial.
- Earlier captures inspected in `artifacts/mars/feedback-final/` (per-engine
  `mars-pad-home.png`, `mars-pad-driving.png`, `earth-original-camera.png`,
  `glass-lip-no-climb.png`). Route evidence is in `feedback-verified/`; validation
  logs are `feedback-focused-unit.log`, `feedback-build.log`, `feedback-final.log`,
  `feedback-pilot-final.log`, and `feedback-pwa.log` under `artifacts/mars/`.

No full unrelated local suites were rerun; the last full-suite release evidence
below is unchanged. The user's existing untracked review images/directories are
preserved and excluded from the release. **Exact next step:** user checks the
published update; no automated release work remains.
Physical-iPad acceptance remains outstanding.

Started 2026-10-07. **Current user scope: all regions and the texture-free buried
hull are accepted; mark Mars complete, enable the public location picker, finish
pending checks, commit and publish.** This supersedes the earlier pause on long
checks. Public Mars and Scout integration, automated release verification,
commit and GitHub Pages publication are complete.
Physical-iPad performance, two-thumb touch and
installed-PWA acceptance remain unverified.

## Milestones

Checked region entries mean implemented with the focused evidence recorded below, not a public-release or full browser-circuit gate. Earlier complete gates refer to the compact layout. The user accepted the expanded eastern presentation; full expanded-world acceptance remains separate.

- [x] World layout, region design cards, and concept map.
- [x] Deterministic terrain and worker streaming, with seam and lifecycle tests.
- [x] Habitat Seven, Crown Crater, northern Great Ring, and connected pilot routes.
- [x] Mars Scout model, surface feedback, regional starts, and development entry.
- [x] Pilot driving and visual checks in Chromium and WebKit; build and PWA checks (known WebKit offline-reload skip remains manual acceptance).
- [x] Dish Ridge.
- [x] Glassfall Plain.
- [x] Iron Maze implementation and user-reviewed presentation.
- [x] Keyhole Badlands implementation and focused region checks.
- [x] Fossil Delta implementation and focused region checks.
- [x] Rust Dunes implementation and focused region checks.
- [x] Lava Tubes and Quiet Vault implementation and focused region checks.
- [x] All nine regions and the final buried hull visually accepted by the user.
- [x] Public Mars picker, Scout selection, direct links and regional starts.
- [x] Full circuit and automated release regression checks (explicit skips below).
- [x] Commit and GitHub Pages publication.
- [ ] Physical-iPad acceptance (not certified by desktop automation).
- [x] Expanded-layout eastern journey accepted and reverified.

## Decisions

- Work in region-focused milestones. The latest user instruction permits continuing without manual checks between regions; keep automated evidence and remaining acceptance gaps explicit.
- Keep existing gravity and four-wheel physics. The Scout is a new vehicle model; terrain supplies handling differences.
- Preserve Northern Reach's runtime while introducing a small Mars-specific generator/runtime. Share existing vehicle, camera, effects, and disposal APIs; avoid a risky rewrite of Northern Reach's region-specific prop system.
- Nine regional starts are wired publicly. Route/landmark implementation is distinct from full-world, browser-circuit and target-device acceptance.

## Public release verification — 2026-10-11

**Final automated outcome:** 286 unit tests passed; typecheck and production
build passed. All 203 executable browser cases passed across the original run
and targeted retries; the known WebKit two-contact touch case remains skipped.
After the Mac restart, Iron slalom passed unchanged in isolation and all 47
remaining browser cases passed in 16.7 minutes. No physics or driving assertions
were weakened. Production/PWA checks passed 8 cases with 2 explicit WebKit skips.

The offline-worker test now reloads after service-worker installation before
going offline, matching the prompt-based activation policy. Chromium verifies
cached generation in all four new regions and offline travel into Mars.
WebKit offline module-worker startup failed for both the unchanged Northern
worker and Mars, while both generated successfully online. This additional
automation limitation is skipped explicitly and joins offline navigation,
two-contact touch and sustained 30 FPS in physical-iPad manual acceptance.

Release commit **`9a00f8d`** was pushed to main and deployed successfully by
[GitHub Pages run 38125537132](https://github.com/wroluk/little-roamer/actions/runs/38125537132).
CI independently passed the full unit suite and production build. Live checks
in Chromium and WebKit confirmed the public Mars selection, default Scout,
entering gameplay and completed offline cache at
https://wroluk.github.io/little-roamer/?area=mars.

Final logs are `files/mars-release-browser-final.log`,
`files/mars-release-iron-retry.log`, and `files/mars-release-pwa-final.log` in the
session artifacts. No automated release work remains. Next: physical-iPad
manual acceptance when the device is available; no further region work is planned.
Superseded local review captures and user-supplied feedback were left untouched
and uncommitted; final region and texture-free hull captures are committed.

### Historical release attempts (resolved by restart and retries)

- Resume on 2026-10-11: both blank browser probes initially passed. The original
  WebKit Tubes skylight timeout passed unchanged in isolation (3 minutes), then
  passed again during the 67-case retry. Twenty previously failed cases passed,
  including the Vault approach and all remaining full regional/spoke circuits.
  The runtime failed again during Iron slalom: one timeout followed by 46 browser
  launch aborts. A fresh WebKit launch without game code also aborts.
  Cumulative unique browser results are **156 passed, 1 known skip, 47 unresolved**.
  Production/PWA checks still have not run. The next isolated reproduction is
  now Iron slalom, not Tubes; `--last-failed` now selects the remaining 47 cases.
  Retry log: `files/mars-release-browser-retry.log`; isolated successful Tubes
  evidence: `files/mars-release-tubes-retry.log`. No game code was changed.
- Production picker and direct links now accept Mars and all three cars, without
  exposing the development debug API. Production acceptance covers remembered
  Scout selection, explicit regional/car links, and offline travel into Mars.
- The first full unit run exposed a steep triangle at the Quiet Vault approach's
  eastern shoulder. Broadened only that route's shoulder from 2 m to 5 m; its
  centreline, road width, physics and original 0.55 grade limit are unchanged.
  The all-route grade/reset check now passes.
- Latest full unit release gate: **286 passed, zero failed or skipped** after
  the shoulder fix. Typecheck and production build also passed. The continuous
  5,102 m outer circuit passed in both directions with the real Scout.
- Inspected current home-screen captures at 1080 x 810, 810 x 1080 and 390 x 844;
  the Mars option, three car choices and start button remain accessible.
- The complete 204-case Chromium/WebKit browser run finished after 1.9 hours:
  **136 passed, 1 known WebKit touch skip, 67 failed**. All Chromium cases passed.
  WebKit first timed out on the full Tubes skylight passage; the remaining 66
  cases could not launch WebKit (`Abort trap: 6`). The chained PWA suite did not run.
- Independent blank-page launch probes now fail in both WebKit and Chromium,
  without loading game code. Chromium reports macOS `bootstrap_check_in`
  failure 141; `launchctl` also reports 141 (`Reentrancy avoided`). This is a
  local browser/runtime blocker, not evidence that 67 game behaviors regressed.
  The first route timeout remains unresolved until it can be reproduced alone.
  No physics or test assertions were changed in response.
- Logs and browser artifacts are in the session's `files/mars-release-*` paths,
  not committed test output. Preserve `mars-release-browser/.last-run.json` so
  Playwright can retry only the failed cases.
- Next: restore browser launching (restart the Copilot app/session, and the Mac
  if necessary), reproduce `full Tubes skylight passage` alone in WebKit using a
  separate output directory, then retry the 67 failures with `--last-failed`
  and the original `mars-release-browser` output directory. If a driving failure
  persists, compare against `main` before changing physics or assertions.
  Run production/PWA checks sequentially afterward; then commit, publish and
  verify the deployed game. No release commit or push has happened.

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

### Remaining-region implementation — 2026-10-09

- Committed all approved expansion/wilderness/crest work as **`1decdc7`** and pushed `origin/main`. Subsequent new-region work is uncommitted; the commit/push request preceded this work.
- User explicitly authorized proceeding without their checks between regions, running only tests relevant to changed regions. No unrelated full suite, public release or PWA gate was run.
- **Keyhole:** winding low wash, true open beveled arch, horizontal buff/rust strata, terraced secondary buttes, optional 24 m ledge and gentle alternative. Initial large-triangle color patches were replaced with actual horizontal mesh cuts after capture review. Iron connects at the east; the west wash leads to Delta.
- **Delta:** two descending dry channels fork and rejoin, with an elevated sediment-shelf route, pale slabs and a stranded dark boulder. Both branches reach the Dunes connector.
- **Dunes:** broad loose-dust crescent rising to 29 m, dark solid bedrock island, firm western perimeter and lower eastern loop. Existing dust traction is used without changing vehicle physics.
- **Tubes:** two open basalt roof sections, daylight skylight, solid half-buried Quiet Vault with restrained teal seams, side alcove and elevated surface bypass. Capture review prompted irregular roof profiles and surrounding basalt banks instead of identical straight extrusions. The north/east return reconnects to Crown's existing western rim, closing the authored outer route graph.
- Added all four regional spawns, nearest-reset selection, welcome hints, materials, deterministic chunk-owned solids, region cards and concept-map routes. Wild regions remain unmarked. Kept the requested 55–220 m haze; the old promise of seeing Habitat through Keyhole is explicitly superseded by that range.
- **36 real-Scout unit driving cases passed**: every one of the 18 new routes in both directions, including optional routes, Vault alcove and Crown return. All ten Tubes cases were repeated after roof/bank refinement. **Seven targeted geometry/integration checks passed**, covering open passages, solid roofs/piers, grade sampling, branch/region joins, resets, surface contrast, terrain/collision sampling and bounded meshes. Build/typecheck passed.
- **Eight regional browser checks passed in Chromium and WebKit**: views/reset plus Keyhole arch passage, Delta channel segment, Dunes crest segment and the full covered Tubes passage in both directions. These are representative feature drives, not complete regional browser circuits. Final Tubes appearance/drive checks are repeated after the geology refinement; see the follow-up entry for that outcome.
- Current captures are in `keyhole-review/`, `fossil-delta-review/`, `rust-dunes-review/` and `lava-tubes-review/` under `artifacts/mars/`, with WebKit counterparts. The map reflects actual route nodes, not reserved circles.
- **Remaining acceptance:** full-length regional browser routes/bypasses, sustained full-circuit drive, missing western/southern Habitat spokes, perimeter integration, device frame-rate/streaming profiling, PWA/offline and public-picker release gates. The last full-suite record remains unchanged; none was run this iteration. Manual iPad Safari two-contact touch and offline reload remain open as previously recorded.
- Next: complete the remaining region-specific browser circuits and integration work under the user's scoped-testing instruction; do not advertise Mars publicly or mark the release gate complete.

Final Tubes follow-up: the revised roof/bank presentation and both-direction passage drive passed again in Chromium and WebKit (two checks, about 96 seconds). Inspected the final capture and saved both engines' images in `lava-tubes-review/`. Final build/typecheck and `git diff --check` passed. The four new regions are available locally; their changes remain uncommitted.

### Integration and remaining acceptance — 2026-10-09

- Added the **southern Habitat → Keyhole** and **western Habitat → Delta** shortcuts. They join existing courtyard and regional route nodes exactly and remain unmarked in the wilderness. An initial southern departure clipped the third habitat dome; actual Scout tests found it, and the departure now goes around the east side via (40, 110).
- Both new spokes pass actual Scout driving in both directions, with the existing grade limits unchanged. The map, region cards and design now show all four Habitat destination spokes.
- Added an explicit continuous outer itinerary using only existing road segments. The real Scout completed **4,888 m clockwise and counterclockwise**, visiting all route junctions without resetting or teleporting. Simulated driving durations were approximately 796 and 805 seconds; these are physics simulation times, not wall-clock browser or device performance claims.
- Streaming stayed within the existing 25 render / 9 physics chunk bounds; peak collider count was 187. The final car remained above terrain throughout (minimum measured body-to-terrain clearance approximately 0.60 m). Resource cleanup checks account for the live car's colliders separately from disposed terrain/scenery.
- Existing lifecycle/failure checks and attempts to escape the Great Ring at all four sides passed. No vehicle physics or safety assertions were weakened.
- Full western-region/spoke browser coverage is running in both engines, using actual animation-loop keyboard driving. Route profiles record frame intervals, chunk-activation peaks and resource counts; these desktop automation measurements are not physical iPad acceptance. PWA and final lifecycle results will be recorded below.

### Acceptance paused for region refinement — 2026-10-10

- User requested no further long tests until the new regions are improved. Stopped the resumed WebKit circuit run; remaining circuit and PWA checks are deferred, not passed.
- Before interruption, the full-route run reported 20 Chromium and 11 WebKit passes. There are 35 completed-route captures, but no final run report; captures alone do not certify the remaining cases. Preserved evidence in the session's `files/mars-circuit-interrupted/` directory.
- All 118 Mars unit tests passed previously, including the continuous outer circuit in both directions. The nine-region travel/car-switch/area-cleanup browser checks passed in Chromium and WebKit (two cases).
- Updated the development picker and welcome copy to describe nine regions and four Habitat routes. Production availability remains gated. These latest text edits have not had a final build.
- Next: refine the new regions from user feedback using visual inspection and short, focused checks only. Do not resume long route, full-suite or PWA runs until authorized. New-region and integration changes remain uncommitted.

### Buried Lava Tubes and fractured Vault — 2026-10-10

- Replaced the two freestanding 42 m roof sections with **two roughly parallel buried tubes, 244 m and 218 m long**. The western entrance starts 43 m later; independent bends avoid identical straight extrusions. A low lava field surrounds the passages, with floors near 6 m and upper terrain around 20 m.
- Terrain forms irregular stepped trench walls. Thin basalt roof skins (roughly 1-1.7 m) supply the second driveable level, with matching triangle collision above and below. Roof strips have deterministic nearby chunk ownership; reconstruction tests reject missing or duplicated strips across owners.
- Added **six actual roof openings**, broken rim stones, large fallen blocks beside the easy line, and low driveable plates across it. A cross-passage connects the tubes under the collapsed area at Z -456. Left clearance through the side rubble for that connection.
- Extended underground routes and the western surface bypass around the northern mouths, preserving the Crown and Dunes connections. Removed the pale trail tint from the basalt region; rock grip applies both inside and above the tubes. Shared vehicle physics and camera behavior are unchanged.
- Rebuilt the Quiet Vault at (-419, -526) as asymmetrical fractured gate leaves around a narrow tapered marker, with sparse pale-teal inlays. It sits in a recessed side alcove rather than reading as a cube.
- **12 short unit checks passed** (about 27 seconds), including both-direction actual Scout drives over collapse rubble, across the roof and through the connecting chamber, plus roof thickness/opening, chunk-owner, reset, mesh-budget and terrain checks. **Six focused Chromium/WebKit browser cases passed**: presentation and short rubble/rooftop drives. The rooftop case verifies the car remains above 18 m over the buried floor. Repeated both presentation cases after correcting the capture camera framing.
- Inspected real game captures of the entrances, interior, skylight, upper field and Vault. Saved current views in `artifacts/mars/lava-tubes-review/` and `webkit/`; the new `roof-drive.png` and `rubble-drive.png` show short Chromium driving results. Updated the region card, concept map, README and design/build descriptions.
- Final production build/typecheck and whitespace check passed. **No long route, full-world or PWA suites ran.** Historical circuit results do not certify these changed routes; physical iPad and full-length two-tube journeys remain deferred. No commit or push.
- Next: user reviews Lava Tubes at `http://127.0.0.1:5173/?area=mars&start=lava-tubes`. Address this region's feedback before changing Delta, Dunes or Keyhole. The local server remains running.

### Tube rubble, supported rim stones and basalt particles — 2026-10-10

- Added small flattened dodecahedral stones, matching Northern Reach's roadside rock family, along both tube floors. Deterministic variation changes spacing, width and rotation. Embedded bases and protrusions below 24 cm produce wheel-sized bumps without adding tall obstacles.
- Fixed the photographed hovering rim stones: moved footprints back onto intact crust, inset stones from the open portal ends, and conformed their buried bases to roof slopes. Regression rays check the base perimeter against the actual rendered roof triangles, not just an analytical height estimate.
- Kept every tube chunk below the existing 5,000-solid-triangle budget; reduced initial rubble density rather than relaxing the budget. Eight short real-Scout drives cover both directions over rubble, across the roof, through the junction and along the western tube.
- Dark basalt now emits dark brown-gray rock particles rather than Mars's default orange fragments. Particle palette overrides can resolve the wheel's position; other Mars rock regions retain their rusty palette and other areas retain their defaults.
- Final focused results: 16 tube/western geometry and driving checks passed, five effects checks passed, build/typecheck passed. Six short browser scenarios passed across Chromium/WebKit; both rubble drives were repeated after final density tuning, followed by a Chromium drive/capture after the particle fix. Inspected the updated roof, floor and driving captures. No long-route, full-suite or PWA tests ran.
- Next: user checks the small bumps and supported roof stones in the local Lava Tubes preview. Continue refining this region only; broader acceptance remains paused. Changes are uncommitted.

### Natural Keyhole bridges — 2026-10-10

- Replaced the upright gate-like arch with a **176 m east-west sandstone rib**, with unequal spring points, a thin crown, changing width and irregular faces. Added a smaller diagonal companion arch northeast at (103, 467). Both have genuine open passages and matching mesh collision.
- Raised broad rocky shoulders into the spring points, buried the rock bases, added low fractured foothill slabs, and muted the strata palette to match neighboring geology. Removed the broad flat apron beneath the original freestanding monument; retained the easy wash.
- Added optional western/eastern crest approaches. The main crest rises from 18 m to about 35 m and descends to 16 m; its crossing is a separate solid mesh, not a terrain road that fills the opening. The western approach leaves the existing lookout and the eastern approach rejoins the regional start.
- Actual driving initially found steep terrain intruding through the crest landings; capped those shoulders below the rock crown. A companion-passage drive found an abrupt exit bank; widened its low wash and moved a nearby butte out of the exit. Both fixes preserve the original driving assertions.
- **Seven focused unit checks passed**, including real Scout crest crossings and companion-arch passage in both directions, geometry openness/thickness/budget checks and route grades. Four Chromium/WebKit cases passed for presentation, the main lower passage and an actual above-wash crossing; both presentation/lower-passage cases were repeated with the final companion wash and now also drive beneath that arch. The browser crest check confirms the Scout is above 32 m, not on the wash below.
- Inspected actual arch, companion and crest captures; current images are in `artifacts/mars/keyhole-review/` and `webkit/`. Updated the concept map with both arches, the approaches and dashed optional crest crossing, plus the region card, README, design, build plan and welcome hint.
- Final build/typecheck and whitespace check passed. No long regional/full-world/PWA suites or physical-device gate ran. Full-world circuit evidence predates this revision and is not renewed by these local checks. Changes remain uncommitted.
- Next: user reviews Keyhole at `http://127.0.0.1:5173/?area=mars&start=keyhole-badlands`, including the optional route from the western lookout across the crest. Address feedback before refining another region.

### Slight haze reduction — 2026-10-10

- At the user's request, eased Mars fog from **55–220 m to 65–250 m**. Sky color, lighting, geometry and streaming settings are unchanged.
- Build/typecheck passed. Captured and inspected a short Chromium Keyhole preview (`keyhole-review/haze-eased.png`) without page errors; no long checks ran.
- Updated current visibility documentation and the concept map. Next: user reviews the slightly clearer distance in the running local preview. Changes remain uncommitted; broader acceptance stays deferred.

Follow-up: eased haze one more step to **75–280 m** at the user's request. Build/typecheck and a short Chromium capture passed; inspected and refreshed `keyhole-review/haze-eased.png`. Current docs/map reflect the new range. No long checks ran. Next: user reviews visibility locally; geometry and lighting remain unchanged.

### Scenery pop-in follow-up

- Retained 75–280 m haze and the existing 5 x 5 render / 3 x 3 collision rings. Small scenery fades across 130–180 m with opaque screen-door dithering rather than transparent material sorting. Distant newly activated details ease in over 0.65 seconds; geometry within 70 m is immediately visible.
- Added persistent, simplified visual-only Keyhole arches, Iron fins, Glassfall skins and Lava Tube roofs alongside the distant Dish/Habitat. Each anchor blends complementarily with its detailed owner using independent material uniforms. Long formations return to their silhouettes before their owning chunks unload; no additional distant colliders are created.
- Matching shadow fades are explicitly disposed with each chunk. Streaming idle waits retain the actual observer position rather than moving visibility calculations to the chunk corner. Existing detailed terrain/horizon replacement is unchanged.
- Eight focused unit checks passed, covering fade continuity, near visibility, long-landmark unloading, a fixed sub-15,000-triangle distant-landmark budget, shadow-material disposal, worker failures, and retained arch/roof geometry. Build/typecheck passed. Four focused Chromium/WebKit cases passed: pixel-level complementary fades without holes and short real-Scout chunk-boundary crossings in both directions. The initial synthetic fixture imported a second Three.js instance; corrected it to reuse the game's exact browser module.
- Inspected actual approach captures in both engines; archived boundary captures in `artifacts/mars/scenery-review/`. No long regional circuits, full suites, PWA tests or physical-device acceptance ran. Prior full-suite status remains unchanged; changes are uncommitted.
- Next: review distant scenery while approaching/leaving landmarks in the running local Mars preview, then continue user-directed region refinements. Full-world and iPad acceptance remain deferred.

### Restore previous haze — 2026-10-10

- User found the simplified silhouettes and scenery fading visually unsatisfactory and requested reverting the last haze reduction for now. Restored **65–250 m** from 75–280 m; this does not revert the first reduction from 55–220 m.
- Left the geometry, current fading system, lighting, streaming and collision ranges unchanged. Updated current docs and the concept-map legend.
- Typecheck/build and one short Chromium chunk-boundary scenario passed. Inspected and saved `artifacts/mars/scenery-review/haze-restored.png`. No long suites or PWA checks ran; prior full-suite evidence and deferred acceptance are unchanged.
- Next: user reviews the restored haze locally before further region or visibility refinements. The visible LOD/fade quality concern remains open, not claimed resolved by this setting change. Changes remain uncommitted.

### Remove experimental scenery transitions — 2026-10-10

- At the user's request, removed the recent scenery/shadow fading and extra simplified Keyhole, Iron, Glassfall and Lava Tube silhouettes, including their optional low-detail generator paths and experiment-specific tests. Restored the original streaming implementation and distant Dish/Habitat behavior.
- Kept **65–250 m haze**, all earlier region refinements, and the existing render/collision ranges. Updated current visibility documentation; previous scenery-review captures are historical evidence of the removed experiment.
- Typecheck/build, two focused streaming lifecycle/error tests, and the existing Chromium Keyhole views/reset/short-passage scenario passed. Inspected the actual arch capture and saved `keyhole-review/visibility-restored.png`. No long regional, full-suite or PWA checks ran; deferred full-world/device acceptance remains unchanged.
- Next: user reviews the restored presentation in the running local preview, then directs the next region refinement. Original chunk pop-in can still occur; no new transition workaround is claimed. Changes remain uncommitted.

### Fossil Delta default Martian sand — 2026-10-10

- Removed Delta's beige regional ground-color override so channels, shelves and surrounding fan use the default rusty-orange Mars palette, including existing natural variation and lighter path accents. Retained pale sediment slabs and the dark stranded boulder as contrasting landmarks.
- Geometry, collision, routes, handling, haze and other regional palette overrides are unchanged. Updated the Delta design card, design table and concept-map fill.
- Typecheck/build and two focused Delta unit checks passed, including a new ground-palette regression for channels and shelves. The Chromium Delta views/reset/short-feature drive scenario passed; inspected its actual feature and lookout captures and saved `fossil-delta-review/martian-feature.png` and `martian-lookout.png`. No long suites, WebKit rerun or PWA checks ran for this color-only change; prior full-suite and deferred acceptance status is unchanged.
- Next: user reviews the default sand in the local Fossil Delta preview before choosing further region refinements. Changes remain uncommitted.

### Unmarked buried spacecraft — 2026-10-10

- Added an original approximately 94 m survey-carrier wreck at (-653, 265), off the west side of the Fossil Delta / Rust Dunes transition. Dull ivory/grey segmented plating, a tilted buried bow, exposed broken spine, incomplete aft bulkhead, open twin exhaust throats and five large grounded fragments form the discovery. No reference artwork is shipped or copied; no region, route, sign, mission, beacon, reset destination or loot was added.
- Surveyed the actual transition: existing low relief could not conceal the required ship scale. Added two local asymmetric windward sand shoulders east/north of the site, rather than putting it beside a road. Existing route grading remains authoritative. The west/south remains open to cross-country exploration, without an access trail.
- The 13 m-plus fracture has an uninterrupted sandy floor; the forward hold is also driveable beneath the remaining shell. Visible structural meshes provide their exact triangle colliders. Scatter is excluded around the hull and breach. The initial drive exposed an overly steep inner dune approach; widened/repositioned that bank and verified the final passage in both directions. A first visual pass read too much like an open shelter; added the broken pressure bulkhead, low cargo sponsons, crushed bow and recessed bow structure.
- Four wreck unit checks passed: bounded/open geometry; terrain occlusion from sampled nearby route centrelines at terrain + 4 m against an 18-point upper hull envelope within 250 m; real Scout breach crossings both ways; and actual forward-hold driving both ways. Three focused Delta/Dunes regression checks passed. Sightline testing includes the northern bedrock perimeter and crescent, not only the closest connector. It does not guarantee concealment from elevated orbit cameras, every road-shoulder position or arbitrary off-road viewpoints.
- Chromium and WebKit each passed the short wreck scenario: exterior/engine/breach views, connector/perimeter screening views, driving inside the hold and both transverse crossings. Actual captures were inspected under `artifacts/mars/wreck-review/` (separate engine folders). Camera framing was corrected to avoid accumulating orbit pitch between views.
- Typecheck and production build passed; existing large-bundle warning remains. Haze stays 65–250 m; no fading or extra distant silhouettes were reintroduced. Delta's orange ground and pale slabs remain intact.
- No long regional circuits, full suites, PWA checks or physical-iPad gate ran; the user explicitly paused them. Last full-suite evidence remains the previously recorded historical run, not renewed by this feature. All prior uncommitted work was preserved; no commits, pushes or branch operations occurred. The existing port-5173 preview was left running.
- Next: user explores/reviews the unmarked wreck in the existing Delta / Dunes transition. Keep the full integration, public release and iPad acceptance gates deferred until requested.

Exact focused commands:
```sh
npm run typecheck
node --import tsx --test --test-name-pattern='wreck|windward|Scout can explore|Delta|Dunes' tests/mars-wreck.test.ts tests/mars-western.test.ts
npm run build
./node_modules/.bin/playwright test tests/browser/mars-wreck.spec.ts --output=artifacts/mars/wreck-review
git diff --check
```

### Wreck scale and mechanical detail — 2026-10-10

- Replaced the small twin exhausts with one 25.4 m drive bell, with its lower half buried in the existing sand. Segmented thick heat-shield petals, torn casing and reinforced rim surround a deep tapered chamber; concentric collars, swept stator blades, an annular rear housing and spindle provide real mechanical depth. The bell is many rover widths across without raising the wreck above the established screening envelope.
- Added missing casing sections, torn metal at the fracture, bolted service covers, radiator slats, internal conduits and small maintenance rungs. Retained the main breach and sandy forward hold. Structural skins, engine walls and framing remain collidable; small flush fittings are visual detail without extra collision complexity.
- Site, screening dunes, roads, default orange ground, haze and streaming are unchanged. Expanded the sightline envelope to include the new nozzle lip. Updated geometry checks to measure render/collision triangle budgets instead of the original coarse-model mesh count; ray checks verify a 16 m open span and deeply recessed machinery.
- Four focused wreck unit checks passed, including both-direction real-Scout hold and breach drives; typecheck/build passed. The short wreck browser scenario passed in Chromium and WebKit, with an additional close engine-scale view. Inspected actual engine, side and rover-comparison captures in `artifacts/mars/wreck-detail-review/`.
- No long regional/full suites or PWA tests ran; full-world and physical-device acceptance remain deferred, with earlier full-suite evidence unchanged. Next: user reviews the larger buried engine and finer hull detail at the same hidden site. Changes remain uncommitted.

### Buried capital-vessel fragment and weathered gray — 2026-10-10

- Reworked the discovery around an implied much larger vessel rather than a complete 94 m ship. Removed the recognizable forward shell, bow and long upper spine. The drive bell is now 53 m in diameter, with its centre and over two-thirds of its height below the sand. Only the upper curved machinery and partial mounting remain exposed; low broken structural teeth continue across a scattered footprint over 100 m long.
- Changed ivory to dark neutral gray. Added a shared, locally generated mipmapped grime texture for fine streaks/mottling, with per-vertex soot and rusty dust at actual terrain contact. Kept small service details for scale, structural collision, the open crossing and the driveable sand over the former hold. Screening terrain, main routes and 65–250 m haze are unchanged.
- Four focused unit checks passed, including scale, gray/weathered material attributes, sampled main-trail occlusion using the new geometry's exposed upper vertices, and both-direction real driving. Typecheck/build passed. Chromium's first browser attempt was interrupted by navigation; the final scenario passed. WebKit initially timed out at startup with unusually long elapsed wall time; its isolated rerun passed without changing assertions or physics. Inspected actual game captures in `wreck-buried-review/` and `wreck-buried-webkit-review/`.
- No full regional/circuit, full-suite or PWA checks were requested or run. Earlier full-suite evidence and physical-device acceptance remain unchanged/deferred. Next: user judges this in-game buried-fragment study, especially the huge partial nozzle and dirty-gray surface. Changes remain uncommitted.

### Connected twin-engine aft section — 2026-10-10

- Added a second full-size 53 m drive, offset 56 m west and 16 m farther into the wreck, settled 2 m deeper. Its more intact casing contrasts with the broken original; both retain recessed annular housings, stator blades, collars, stiffeners and dirty-gray finishes. Omitted fully buried lower engine sectors to keep the existing render/collision triangle budgets.
- Removed the ambiguous repeated black structural teeth. A continuous braced thrust frame now ties the pair to a tapering buried machinery spine, with recessed service panels and vents. Filled more casing panels and added interior stiffeners/lighter mechanical surfaces so the remains are not just empty skins. The entire ship remains implied, not exposed.
- The broader western silhouette initially became visible from the Dunes perimeter. Broadened the existing north sand bank westward (profile width 59 to 82 m), preserving the main routes and the original sightline assertions. Both drives now pass the actual-geometry, sampled main-route occlusion check. No access trail or marker was added; the transverse crossing and forward exploration line remain clear.
- Typecheck/build and eight focused wreck/Delta/Dunes checks passed, including both-direction actual Scout drives, paired nozzle depth, geometry/material budgets and terrain screening. Both Chromium/WebKit short wreck scenarios passed after final detailing. Inspected final paired-engine and close-up captures in `artifacts/mars/wreck-twin-review/`; map and design notes are updated.
- No long regional/circuit, full-suite or PWA tests ran. Prior full-suite evidence and deferred physical-device/public acceptance are unchanged. Next: user reviews the paired drives and connected aft machinery in the running preview. Changes remain uncommitted.

### Simplify wreck surfaces for driving — 2026-10-10

- Removed the small non-colliding covers, bolts, pipes, rungs, slats and panels. Also removed narrow raised ribs, braces, collars, stator blades and torn casing tongues that could catch wheels. Every remaining visible wreck mesh now provides matching triangle collision; no invisible collision fillers were introduced.
- Closed the 0.26 m casing-bay slots and narrow angular gaps between nozzle petals. Retained both giant engines, broad casing, recessed annular housings, connecting thrust frame, machinery spine, heavy ground-seated debris and procedural weathering. Site, sand screens, routes, terrain and handling are unchanged. Large intentional breaks and steep edges remain obstacles, not universally safe driving surfaces.
- Five focused wreck unit checks passed, including a new raycast continuity check at the upper casing seam and real Scout roof traversal in both directions. The driving helper accepts an explicit initial surface height for this roof-only test; existing terrain-start behavior is unchanged. Replaced obsolete detail-count minimums with a bounded triangle budget and exact visual/collision triangle parity.
- Typecheck/build passed. Both short Chromium/WebKit wreck scenarios passed, including a new actual drive from sand onto the machinery spine with elevation confirmation. Inspected actual twin-engine and on-spine captures in `artifacts/mars/wreck-clean-review/`. Existing sightline, nozzle-depth, sand-passage and forward exploration checks remain intact.
- No long regional circuits, full suites or PWA/device checks ran; previously recorded full-suite evidence and deferred acceptance are unchanged. Changes remain uncommitted; the port-5173 preview remains running.
- Next: user drives the simplified wreck off the usual crossing, especially casing seams and spine edges, and judges whether the remaining large broken sections need further shaping.

### New rounded-hull form study — 2026-10-10

- Following rejection of the twin-engine wreck and approval of reference 6's broken cylinder with reference 4's rounded end, replaced the old model completely. One 113 m hull section, up to 39 m across, has a continuous curved shoulder, a roughly 20 m mouth, a large western side breach and a rear that sinks beneath the sand. No reference images are shipped.
- Modeled outer and inner skins as one closed wall volume around the openings. The main wall is roughly 1.8 m thick, with a much thicker rounded shoulder and a visible layered core at the breach. Shared vertices prevent panel slots; all three emitted meshes supply exact collision. Removed all old engines, spine and debris. The base gray finish uses subtle procedural mottling/panel joints rather than small physical fittings. This is deliberately the first shape/scale study, not final mechanical detailing.
- Kept the site and absence of trail/signs. The original sandy ground provides the interior floor and both entrances, with no raised threshold. Expanded scatter exclusion to cover the new entrance and full buried footprint. The taller silhouette initially failed concealment from the Delta shelf; increased the existing east/north bank amplitudes from 17/18 m to 22/20.5 m without weakening sightline assertions or changing route grading.
- Nine focused wreck/Delta/Dunes checks passed: closed-volume edge pairing, material/triangle bounds, physical wall thickness, mouth depth, cabin clearance, sampled main-trail concealment, continuous roof traversal, sandy interior exploration and real mouth-to-side-breach driving in both directions, plus nearby region regressions. Typecheck/build and diff formatting checks passed.
- Both Chromium and WebKit passed the short new hull scenario, including rendered exterior/interior views and real driving through both entrances. Inspected final captures in `artifacts/mars/wreck-hull-review/`, including a lower-angle `shape-study.png`. The first prototype captures in `wreck-hull-study/` predate the refined entrance and restored screening.
- No long circuits, full suites, PWA checks or physical-device acceptance ran. Previously recorded full-suite evidence and deferred public/device gates are unchanged. Updated the design, concept map and focused-check documentation. Changes remain uncommitted; the existing port-5173 preview remains running.
- Next: user judges this new in-game silhouette, apparent wall mass and entry proportions before further detailing. Preserve the broad sandy passages and closed collision volume during any subsequent refinement.

### Worn mechanical finish on the approved hull — 2026-10-10

- User approved the shape and thick walls and requested continuing. Added staggered armor-panel joints, broad circumferential metal bands, inset-looking service covers/vents, worn identification bars, localized corrosion and scorching. The hull remains predominantly gray, with a separately grained layered wall core.
- These details are flush procedural surface treatments with shallow bump shading and variable roughness, not new small mesh fittings. Compared all three position/index fingerprints before and after: approved geometry and exact collision are byte-for-byte unchanged. No changes to entrances, sandy floor, routes, screening terrain, streaming or vehicle handling.
- Outer/inner materials share one 1024 x 512 color atlas and one packed bump/roughness atlas; cut edges have a 128 x 128 grain map. Raw shared pixel data totals 4.0625 MiB before mipmaps. Generation is deterministic and local, without reference-image assets. Existing scene disposal releases all shared maps, including the new bump/roughness map.
- Six focused wreck checks passed, including new deterministic finish, predominantly gray/localized corrosion, shared texture budget and disposal checks, plus existing closed volume, sightlines and actual Scout driving. Typecheck/build and diff formatting checks passed. Both Chromium and WebKit short wreck scenarios passed, including both-direction entry/breach driving. Inspected actual exterior, lower-angle plating and interior views under `artifacts/mars/wreck-finish-review/`.
- No long circuits, full suites, PWA or physical-device checks ran. Earlier full-suite evidence and deferred release/device gates are unchanged. Changes remain uncommitted and the port-5173 preview remains running.
- Next: user reviews the weathered mechanical finish in game. Keep the approved hull shape and clear sandy passages fixed during any further visual refinement.

### Restore the wreck's texture-free visual style — 2026-10-10

- User identified the textured finish as inconsistent with other objects and approved returning to clean materials. Removed the procedural atlas generator and all color, bump, roughness and grain maps, including painted-on service covers, vents, markings and rust streaks. No texture coordinates or texture allocations remain on the wreck.
- Kept the approved curved hull, thick rounded shoulder, layered cut edges and exact physical surfaces. Added a few broad gray armor sections using vertex colors; duplicated outer vertices only at the render representation level, retaining smooth normals and the same triangle positions. Restrained vertex-color dust shading now follows actual terrain contact. No fittings, obstacles, terrain or route changes.
- Six focused wreck checks passed, including texture-free material/attribute assertions, deterministic vertex colors, closed wall volume, sightlines and real Scout driving. Typecheck/build and diff formatting checks passed. Both short Chromium/WebKit scenarios passed; inspected actual side and mouth views in `artifacts/mars/wreck-solid-review/`.
- No long circuits, full suites, PWA or physical-device checks ran; earlier full-suite evidence and deferred release/device gates are unchanged. Changes remain uncommitted, and the existing preview remains running.
- Next: user reviews the clean material/color treatment alongside the rest of Mars. Any future mechanical additions should be substantial integrated geometry, not texture-painted recesses or small wheel-catching fittings.
