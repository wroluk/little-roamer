# Moon preview and staged expansion

Home-screen **Moon / Low-gravity preview** tile, or `?area=moon`.
Read [WORLD_BUILD_GUIDE.md](WORLD_BUILD_GUIDE.md),
[design](artifacts/moon/DESIGN.md) and [progress](MOON_PROGRESS.md) before extending.

**Current availability decision — 2026-10-24:** the user accepted Broken Highlands
and authorized a home-screen tile, commit and push to make physical-iPad testing
easy. Moon is available in production as a preview. This supersedes the historical
internal-only gate, not the unverified device-performance/offline/touch checks.
Discuss discoveries next; this request does not authorize implementing them.

The user accepted the pilot's visual direction and handling, and approved the
staged continuation on 2026-10-23. The basalt–rille excursion and Broken Highlands
and Skylight Hollow are implemented inside the existing footprint.
Hollow's corrected roof/shade was accepted on 2026-10-24. Its base and southern
return connectors now have complete two-way browser-driving coverage, with a
fresh desktop hardware frame probe; physical-iPad acceptance remains separate.
The user subsequently requested a separate Lunar Rover: it is now the default
Moon vehicle. Mars Scout, Lunar Rover and the reference-inspired Lunar Nomad
alternative are selectable on Moon and Mars; Nomad does not replace either
existing design or change the world's handling.

## Purpose and scope

Prove enjoyable reduced-gravity driving and a crisp, haze-free landscape before
committing to another full location. This is invented lunar geography, not a
replica of a named crater. The original pilot reused the Scout; the later
user-approved Lunar Rover shares its established physics. No missions, survival
mechanics, extensive caves or completed larger region roster in the pilot checkpoint.

- Earthview Base, a broad two-way crater circuit, an exposed Earthrise Overlook,
  and a two-way descent to Quiet Crater's floor.
- Black sky, fixed-direction procedural Earth, pale impact ground and a darker
  basalt plain. Earth is revealed by terrain, not a daily rising animation.
- Gravity of -3 world units/s², one sixth of the existing game's -18.
  This is a relative game setting, not a calibrated lunar-units simulation.
- Moon-specific acceleration, speed, steering and suspension. Existing Earth
  and Mars defaults remain unchanged.
- 768 m-wide detailed footprint, a continuous coarse landscape extending to
  +/-1,152 m, at most nine terrain colliders around the rover, and explicit
  generation/resource budgets. All pilot terrain stays rendered at fixed
  resolution: this pilot does not certify a future full-world render-LOD system.
- Skylight Hollow's fixed roof casts permanent geometry-derived sunlight
  occlusion without enlarging the rover-centred shadow map. Ambient lighting,
  real skylights/portals and nearby dynamic rover shadows are preserved.

## References and adaptations

Use `src/game/mars-streaming.ts` and `tests/mars.test.ts` for bounded collision,
terrain/render agreement, seam checks and disposal. Use `mars-terrain.ts` for
graded routes and Float32 triangle sampling, and `tests/mars-driving.ts` for
real-vehicle, two-direction route following.

Adaptation: instead of reproducing Mars's worker/render rings, retain the small
pilot's entire 91,008-triangle terrain mesh. Fine/coarse boundaries have matching
vertices and globally sampled normals; no rendered mesh changes when crossing
collision chunks. Scenery is batched, with grounded supports, route exclusions
and solid rocks. Earth is generated locally; there is no external artwork.

## Pilot gate

1. Drive the circuit and crater descent both ways with the actual rover; verify
   braking, turning, wheel contact, recovery and collision-boundary crossings.
2. Inspect actual base, exposed-overlook, Earth and floor views in Chromium and
   WebKit. Earth must actually be visible at its intended viewpoints; an object
   existing in the scene is not sufficient.
3. Measure construction, frame cadence, draw/triangle counts and collision work.
   Repeat on physical iPad Safari before claiming device-performance acceptance.
4. Verify regional direct links/reset, home travel and restoration of normal
   Earth gravity/handling. Check the production preview tile, direct regional
   links, rover choices and offline travel; Iceland remains development-only.

## Approved continuation — 2026-10-23

Preserve the accepted lighting, palette, black sky, Earth and lunar handling.
Grow the existing pilot rather than replacing it or recreating a real lunar site.

| Place | Driving identity | Status |
| --- | --- | --- |
| Earthview Base | Home anchor, restrained exploration hardware and clear departures. | Pilot implemented. |
| Quiet Crater and Earthrise Overlook | Bowl descent, rim circuit and signature Earth view. | Pilot implemented. |
| Basalt Reach | Open dark lava plain, overlapping low flow lobes, pressure ridges and sparse angular basalt clusters. | Excursion and identity pass accepted by user; physical-device acceptance pending. |
| Silver Rille | Winding channel floor, broad crossing breach and an upper-bank route. | Excursion accepted by user; physical-device acceptance pending. |
| Broken Highlands | Pale fractured uplands, broad graded traverse, optional 43 m western ridge and return to Earthrise Overlook. | Implemented; accepted by user 2026-10-24. Physical-device acceptance pending. |
| Skylight Hollow | Short daylight-visible collapsed-tube passage with an easy western surface bypass and southern return to the basalt approach. | Implemented; visuals and corrected permanent roof shade accepted 2026-10-24. Physical-device acceptance pending. Not an extensive cave system. |

1. Save the accepted pilot after correcting the structure footings.
2. Sketch connected routes, landmark sightlines and natural boundaries. Use
   several short loops, shortcuts home and a longer outer circuit; size journeys
   for the slower rover rather than pursuing a kilometre target.
3. Complete one Basalt Reach–Silver Rille excursion and return: an easy route
   both ways, an optional harder line, scenery, matching collision and a safe
   regional start/reset. Keep the existing pilot reachable and unchanged in feel.
4. Inspect rover-height arrivals, the channel floor and exposed horizons; measure
   resource growth and frame cadence before adding the highlands or skylight.
5. Complete the bounded Broken Highlands loop with a safe regional clearing,
   a broad main climb and optional higher ridge. Inspect both directions and
   compare current performance before proceeding to Skylight Hollow.
6. Add Skylight Hollow in the southwest, retaining the existing terrain budget.
   Fit a closed solid roof to the trench shoulders, cut a genuine daylight
   opening, and keep the surface bypass outside the roof's whole footprint.
   Verify portal/skylight winding, clear headroom, two-way passage and bypass,
   regional entry/reset and an updated navigation map.

Use the current detailed footprint where practical. Establish the next terrain
budget before widening it; the fixed pilot mesh does not prove larger-world
performance. Retain physical iPad Safari touch/frame-cadence acceptance before
broad expansion. Do not conceal horizon or streaming problems with haze.
Vehicle redesign, discoveries/postcards and public release come after the
landscape, not alongside the first extension.
