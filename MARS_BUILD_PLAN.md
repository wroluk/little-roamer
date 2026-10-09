# Mars Outpost build plan

This plan develops the [Mars Outpost concept](LOCATION_IDEAS.md#mars-outpost--expanded-concept) as a sequence of finished, driveable places. Northern Reach showed that a large generated landscape can be technically complete yet feel sparse. Mars should grow from a small polished pilot: **one region at a time, each reviewed on screen and driven with the real car before the next begins**. Do not publish a broad placeholder map as the new location.

## Target experience

- A **1,536 × 1,536 m** continuous world, matching Northern Reach's footprint, with nine distinct regions and the Great Ring as a varied, solid perimeter.
- An outer circuit in both directions, shorter spokes through Habitat Seven, and cross-country choices. Routes invite exploration; there are no objectives, timers, survival systems, or mandatory puzzles.
- Each region has an unmistakable silhouette, a named landmark, a gentle route, an optional driving challenge or discovery, a useful view, and a visible connection to its neighbors. The full region roster and landmarks are in `LOCATION_IDEAS.md`.
- The **Mars Scout** is a third, four-wheel car with its own model and thumbnail. Mars features it by default; the two existing cars remain usable there, and the Scout can be chosen elsewhere. All three use the established four-wheel physics, with Mars's surfaces supplying the new driving feel.
- Procedural scenery and geometry remain local and deterministic, preserving static hosting and offline play. Spend detail on driveable landmarks and nearby silhouettes; use instancing and distant scenery for scale.

## 1. Design the world before generating it

1. Draw a top-down concept map at the final 1,536 m scale. Mark the nine region centres, the outer circuit, at least four spokes to Habitat Seven, regional reset clearings, overlooks, and the Great Ring. Reserve transition corridors so neighboring regions meet without abrupt changes in height, surface, or color. Keep Crown Crater separate from the much larger Great Ring.
2. Make a short design card for **each** region before implementation: its silhouette and palette, primary landmark, two-way easy line, optional harder line or discovery, surfaces, sightline to another landmark, safe reset point, and connection at each exit. Sketch the landmark from the approach and from its lookout; this catches landmarks that read well only from above.
3. Define a visual hierarchy: warm red plains as the base; dark lava in the northwest; pale impact material at Crown and Glassfall; ironstone fins in the southeast; man-made cream and orange at the outpost and Dish Ridge; the Quiet Vault's angular form and restrained glow as the only unexplained object. Give distant mesas atmospheric depth without using them as fake driveable geometry.
4. Save the map, cards, and a few reference screenshots in the repo as reviewable design artifacts. Lock the region names and main route graph before detailed terrain work; revise exact route shapes when real driving reveals problems.

**Gate:** The map has no stranded region, overlapping landmark footprints, or long featureless link. A player can identify where to go from each regional entrance using terrain, landmarks, and signs.

## 2. Build a small technical and visual pilot

1. Add Mars as an isolated development entry, keeping it out of the public location picker until the world is ready. Reuse Northern Reach's deterministic, worker-generated chunk approach at **96 m chunks and a 2.4 m terrain lattice**, with a finite 16 × 16 nominal chunk footprint plus an apron. Rendering and Rapier collision must use the same vertices and triangles. Keep Mars generation area-specific, while sharing area-neutral streaming and resource-lifecycle code where practical; Northern Reach behavior must remain intact.
2. Implement **Habitat Seven and Crown Crater only** as the pilot. These establish the safe spawn, the first spoke, a recognizable landmark, a graded rim road, an optional crater descent, and a complete return loop. Undeveloped sectors remain internal development terrain, not advertised destinations or evidence of completion.
3. Establish the Mars materials and surface feel with the pilot: firm packed regolith, loose dust, rough rock, and a reserved slick surface for Glassfall. Make the color and particle feedback match the physical behavior. Tune slopes with the actual four-wheel car rather than relying on a visual estimate.
4. Model the Mars Scout early so all regions are designed around its actual wheel placement, camera clearance, silhouette, and turn radius. Keep the established vehicle handling initially; add Mars-specific surface tuning only when real driving shows a need.
5. Build one representative section of the Great Ring behind the pilot: gentle inner approach, reachable lookout, steeper collidable outer face, and distant scenery. Confirm the boundary feels natural from ground level and cannot be crossed accidentally.

**Pilot gate:** A fresh player can leave Habitat Seven, reach Crown Crater, descend and climb back out, visit a lookout, and return without reset. Inspect the route in both directions in Chromium and WebKit. Check mesh/collider agreement, chunk seams, camera clearance, regional reset, and resource disposal before expanding the world.

## 3. Finish one region per iteration

Develop the remaining regions in this order, following the outer circuit. Each iteration includes its connector from the previous region, its spoke or shortcut where planned, its own perimeter segment, and the design card's landmark. Finish the easy line before refining the optional challenge.

| Iteration | Region | Geometry and authored content to prove |
| --- | --- | --- |
| 1 | **Dish Ridge** | A readable switchback with broad turnouts, a solid communications dish, and a view back to the crater and outpost. |
| 2 | **Glassfall Plain** | A shaped impact fan with distinct glassy streaks, a firm perimeter route, and unmarked off-road exploration over the glass. No crossing road or trail posts. |
| 3 | **Iron Maze** | Rock fins with varied silhouettes and matching collision; a clearly readable corridor and a smoother bypass. |
| 4 | **Keyhole Badlands** | A layered wash and a genuine open arch the car can pass beneath; a low route and optional ledge return. |
| 5 | **Fossil Delta** | Branching dry channels with coherent sediment terraces; multiple lines that reconnect instead of ending in traps. |
| 6 | **Rust Dunes** | A sculpted crescent and bedrock island, with dust that affects traction and a reliable firm perimeter route. |
| 7 | **Lava Tubes** | A short daylight-visible passage, drivable surface bypass, and a side alcove for the Quiet Vault; roof, opening, and Vault collisions must match what is seen. |

For **every** region, follow the same review loop:

1. Shape the terrain and primary path with authored profiles and smooth transitions. Sample the actual terrain triangles across the route width, at turns, and on both sides of chunk seams. Use local detail rather than repeating the same noise pattern across the map.
2. Build the landmark as a recognizable form at near and middle distance. Give arches, fins, tube roof, dish supports, and outpost structures collision that corresponds to their visible shape. Keep small decorative details out of the wheel path.
3. Add a few region-specific secondary details that tell a visual story without clutter: ejecta rays at Crown, aligned relay masts at Dish Ridge, darker flow lines near the tubes, scattered sediment slabs at the delta. Avoid filling all areas with the same rocks and props.
4. Drive the easy route and optional feature **in both directions** using the real vehicle. Check steep climbs, sideways slopes, wheel contact, braking room, obstacle clearance, camera obstruction, and recovery from a mistake. If a route fails, adjust its geometry or provide a clear bypass; do not weaken the driving test to make it pass.
5. Capture approach, landmark, and lookout views, plus a top-down map update. Compare them with the design card: does this region have its own identity, does its landmark guide the player, and can the next region be seen or found? Revise before moving on.
6. Run the relevant unit tests, typecheck, and affected Chromium and WebKit browser scenarios. Keep the existing Northern Reach tests green when shared streaming or vehicle code changes.

**Per-region gate:** The region is visually identifiable, interesting to drive for several minutes, connected cleanly at both ends, reset-safe, and verified on both browser engines. A skipped browser case is not a pass.

## 4. Connect, polish, and release the whole world

1. Drive the full outer circuit clockwise and counterclockwise, then each Habitat Seven spoke. Remove awkward seam grades, sudden palette changes, repetitive prop clusters, and stretches with no landmark or meaningful choice. Test cross-country shortcuts and ensure difficult areas always have a discoverable safe line.
2. Complete all four faces of the Great Ring with different silhouettes. Test attempts to drive outward at multiple points; the car should meet visible, collidable geology, not a drop or invisible barrier. Verify that rim overlooks and the Quiet Vault alcove remain optional and do not block the main circuit.
3. Finish the Mars Scout picker integration, regional starts, reset messages, direct links, thumbnails, home-screen presentation, and documentation. Check that switching among Mars and existing areas releases terrain, props, colliders, particles, and vehicle graphics correctly.
4. Profile a sustained circuit on the intended iPad, including chunk transitions and the densest landmark scenes. Hold at least the project's **30 FPS device minimum** and avoid loading spikes or memory growth. Use batching, instancing, bounded chunk rings, and reduced distant detail before cutting authored near-field geometry.
5. Make the world available in the normal location picker only after the route, content, performance, and offline gates pass. The review should judge it as a complete set of distinctive places, not merely as 1,536 m of traversable terrain.

## Exploration-layout revision — 2026-10-09

The user approved expanding to Northern Reach's footprint after finding that the compact layout exposed too many regions at once. Prove **Dish Ridge → Glassfall → Iron Maze** before redistributing or building the remaining regions. Habitat and Crown retain their pilot positions for this first comparison.

- Move the dish to (398, -472), Glassfall's terrain centre to (500, -30), and Iron Maze's to (380, 460). Expand Glassfall's horizontal landforms by 1.45 and Iron's by 1.4, without enlarging road widths, vehicles or buildings. Iron's hero fins gain modest length/height rather than uniform scaling.
- Give the eastern connectors winding 300 m-plus journeys, gradual ground-color changes and sparse geological clues. Latest user feedback keeps Glassfall open and relatively flat, retains Iron's screened approach, and uses stronger 55–220 m haze to soften streaming pop-in rather than large peaks around every destination. Restrict trail posts to Habitat, Crown and Dish; leave wild regions unmarked.
- Verify Iron's hidden approach and clear reveal against actual terrain heights; verify the absence of added screening hills around Glassfall. Reconnect Crown and Habitat with authored roads rather than stretching an old segment across the gap.
- User-directed gate for this iteration: focused checks and a playable preview first. Long route-driving/browser suites, full regression and PWA acceptance wait until after user review. Earlier regional passes do not certify the relocated layout.

## Verification and acceptance

- During each iteration, run change-focused checks: `npm run typecheck`, relevant Mars terrain/region unit tests, and the affected Playwright case in Chromium for visual review. Add WebKit immediately when browser behavior may differ. Drive changed terrain, routes, handling, and collisions with the real Scout. At the completed-region gate, run the affected driving and browser scenarios in **both Chromium and WebKit**. Unit coverage checks deterministic generation, exact sampled height versus triangles, seam equality, geometry bounds, landmark collider clearance, regional starts, and stream lifecycle.
- Before calling the location ready: `npm run build`, affected unit tests, and all Mars browser scenarios in both engines. Because Mars changes startup choice, worker caching, and offline content, run `npm run test:pwa` **after** browser tests; the suites share `test-results` and must run sequentially.
- After each block of three completed post-pilot Mars regions, or after broad changes to shared systems that could affect other worlds, run the full unit and browser suites. Routine commits and pushes do not require those suites. Before public release: `npm run typecheck`, `npm test`, `npm run build`, `npm run test:browser`, then `npm run test:pwa`, in that order. Reproduce a failed long-running browser case alone and compare it with `main` before changing physics or assertions.
- Manual iPad Safari acceptance: drive the complete circuit and one harder route with touch controls, switch areas and cars, reset near each region, rotate and resume, reload offline, and confirm sustained frame rate. WebKit's skipped automated two-contact touch and offline-reload cases remain manual checks until automated.
