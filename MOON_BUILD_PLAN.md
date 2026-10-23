# Moon pilot and staged expansion

Internal development entry only: `http://localhost:5173/?area=moon`.
Read [WORLD_BUILD_GUIDE.md](WORLD_BUILD_GUIDE.md),
[design](artifacts/moon/DESIGN.md) and [progress](MOON_PROGRESS.md) before extending.

The user accepted the pilot's visual direction and handling, and approved the
staged continuation on 2026-10-23. The larger places below are planned, not built.
Moon remains internal; this approval is not a public-release gate.

## Purpose and scope

Prove enjoyable reduced-gravity driving and a crisp, haze-free landscape before
committing to another full location. This is invented lunar geography, not a
replica of a named crater. Reuse the Scout for the pilot; no new vehicle model,
missions, survival mechanics, extensive caves or completed larger region roster
in this pilot checkpoint.

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
   Earth gravity/handling. Check production keeps the pilot out of the picker
   and ignores its development URL.

## Approved continuation — 2026-10-23

Preserve the accepted lighting, palette, black sky, Earth and lunar handling.
Grow the existing pilot rather than replacing it or recreating a real lunar site.

| Place | Driving identity | Status |
| --- | --- | --- |
| Earthview Base | Home anchor, restrained exploration hardware and clear departures. | Pilot implemented. |
| Quiet Crater and Earthrise Overlook | Bowl descent, rim circuit and signature Earth view. | Pilot implemented. |
| Basalt Reach | Open dark lava plain, shallow flow ridges and pale boulders. | Planned first extension. |
| Silver Rille | Winding channel floor, broad crossing breaches and an upper-bank route. | Planned with the basalt excursion. |
| Broken Highlands | Pale fractured uplands, graded climbs and optional technical lines. | Planned later. |
| Skylight Hollow | Short daylight-visible collapsed-tube passage with an easy surface bypass. | Planned last, not an extensive cave system. |

1. Save the accepted pilot after correcting the structure footings.
2. Sketch connected routes, landmark sightlines and natural boundaries. Use
   several short loops, shortcuts home and a longer outer circuit; size journeys
   for the slower rover rather than pursuing a kilometre target.
3. Complete one Basalt Reach–Silver Rille excursion and return: an easy route
   both ways, an optional harder line, scenery, matching collision and a safe
   regional start/reset. Keep the existing pilot reachable and unchanged in feel.
4. Inspect rover-height arrivals, the channel floor and exposed horizons; measure
   resource growth and frame cadence before adding the highlands or skylight.

Use the current detailed footprint where practical. Establish the next terrain
budget before widening it; the fixed pilot mesh does not prove larger-world
performance. Retain physical iPad Safari touch/frame-cadence acceptance before
broad expansion. Do not conceal horizon or streaming problems with haze.
Vehicle redesign, discoveries/postcards and public release come after the
landscape, not alongside the first extension.
