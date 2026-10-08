# Mars feedback 1 — implementation review

Source: [Mars feedback with six attached images](Mars-feedback1/Mars%20feedback.md).

| Feedback | Change | Verification |
| --- | --- | --- |
| Obstructed camera enters the Scout | When the normal swept boom becomes too short, sweep raised views and alternate directions. Keep the car centred in the recovery view; use hysteresis when returning to the normal boom. | Close rear/side-wall physics tests; browser reproduction directly in front of a habitat airlock. |
| Floating stones and Crown rocks | Extend each rock's buried base using terrain samples around its footprint. The visible mesh and collider share the same adjusted vertices. Exclude loose scatter from steep cliff faces. | Sample every base edge on steep terrain, including all three large Crown teeth; inspect Crown screenshots. |
| Repeated rock shapes and placement | Independent deterministic channels choose position, omission, scale, height, yaw, taper, lean, thickness and twist. Mix chips, slabs and occasional taller stones. | Deterministic chunk tests and shape/grounding checks; inspect scatter from the driving camera. |
| Regular waves along the outer rim | Replace periodic sine modulation with irregular broad shoulders, unequal buttresses and softened terraces. | Retain the physical escape tests in all four directions; inspect rim views. |
| Mars looks small / insufficient distance haze | Start warm haze at 65 m and reach full fog at 430 m (previously 190–720 m). Northern Reach uses the same linear fog type at 78–188 m. Mars keeps a longer range so the crater and outpost can still serve as distant landmarks. | Compare habitat and Crown views in both engines. The visual sense of scale still needs the user's review. |
| Moving gaps between detailed and coarse terrain | Give every coarse tile the same 40 boundary segments per side as the detailed tile, with triangulated transition cells into its coarse interior. Broaden surface colour variation to avoid fine stripes aliasing at distance. | Verify all perimeter heights and boundary edges match; drive across a streaming transition and inspect before/after captures. |

## Scope and evidence

The work stays within the existing pilot and its common terrain/camera systems. No further region has been started. The original feedback and attachments are preserved.

Validation passed: typecheck, production build, 40 focused unit tests, and 10 selected browser cases across Chromium and WebKit. The sequential PWA run passed 5 tests, with the existing WebKit offline-reload skip. Details are recorded in `MARS_PROGRESS.md`. Physical iPad Safari acceptance remains pending.

## Captures from the revised game

- [Camera beside the airlock](feedback1-review/camera-airlock.png)
- [Large rock foundations](feedback1-review/crown-rock-foundations.png)
- [Varied scatter and distance haze](feedback1-review/varied-scatter.png)
- [Irregular rim skyline](feedback1-review/rim-skyline.png)
- Terrain transition: [before crossing](feedback1-review/rim-before.png) / [after crossing](feedback1-review/rim-after.png)
