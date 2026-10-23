# Moon: Earthview pilot

North is -Z; east is +X. Coordinates are invented, in world metres.
This is a compact playable experiment, not the plan for a complete Moon world.

| Place | Anchor X/Z | Identity and route |
| --- | --- | --- |
| Earthview Base | -140 / 80 | Ivory/gold landing shelter, solar racks and a communications mast, beside a level rover clearing. Two directions around the crater. |
| Earthrise Overlook | -45 / -200 | Broad northern shoulder with a small scientific instrument. Turn south for a basin panorama, north to frame Earth over the highlands. |
| Quiet Crater floor | 40 / -105 | Pale bowl with a broad turnaround. Eastern graded descent returns to the circuit; no mandatory jump or drop. |
| Basalt return | 75 / 105 | Darker, lower open ground on the southern circuit. Provides a change in value, scale and driving rhythm without adding water or vegetation. |

The western circuit climbs gradually from the base to the overlook. The northern
arc passes the crater rim and meets the eastern descent. The eastern and southern
return crosses darker ground and closes at the base. Small secondary craters and
scattered rocks remain outside the easy route and its shoulders.

The shelter is centred at X=-165, Z=85 on the gentler western ground. Its level
deck clears the highest point under the entire footprint; separate legs and
feet support it without enclosing the open underside. Ground-contact footings
extend below their lowest footprint sample, with matching solid collision.

## Sky and lighting

No atmospheric fog or bright horizon band. A restrained fill light keeps the
shadowed rover usable; directional sunlight creates the primary terrain relief.
Earth is a locally generated, stylized blue/green sphere with baked cloud shapes,
not a geographically accurate globe or downloaded texture. Its direction stays
fixed as the camera moves; terrain can reveal or conceal it. Its angular size is
deliberately enlarged for the toy-world presentation.

The single 512 x 256 map uses coherent spherical cloud noise, smoothly blended
coasts/ice, matching longitude/pole samples and trilinear mip filtering. Do not
restore the original periodic cloud dashes or binary low-resolution shore mask.
Texture work stays at sky creation, not in the frame loop.

## Pilot performance contract

The rendered ground is one fixed mesh: 4 m lattice in the 768 m-wide pilot,
24 m lattice in the far continuation, with matching 4 m transition edges.
Globally evaluated normals avoid a separate coarse/fine shading seam.
Terrain collision uses those exact fine triangles in a moving 3 x 3 core.
Most scenery is batched; small rocks do not cast individual shadows.

This buys a clean horizon without fog or render activation spikes at pilot
scale. It does not establish that a larger, more detailed Moon can avoid LOD.
Physical iPad performance and user acceptance remain separate gates.

## Current driving-height evidence

- [Earth above the rim](earth-texture/webkit-tablet/driving.png)
- [Current Earth detail](earth-texture/webkit-tablet/close.png)
- [Exposed texture seam](earth-texture/webkit-tablet/seam.png)
- [Grounded shelter](grounding/webkit-tablet/shelter.png)
- [Shelter foot contact](grounding/webkit-tablet/shelter-feet.png)
- [Solar support contact](grounding/webkit-tablet/solar.png)
- [Actual collision-boundary drive, earlier hardware probe](hardware-chromium/collision-crossing.png)
- [Basin panorama](webkit-tablet/exposed-overlook.png)

The default base start looks toward the crater; the shelter sits west of the
rover, not in that forward view. These are actual game captures, not concept
artwork. Earlier hardware-probe images predate the footing correction.

## Approved next stage

The user approved a compact connected expansion on 2026-10-23. See the
[staged plan](../../MOON_BUILD_PLAN.md#approved-continuation--2026-10-23).
Basalt Reach and Silver Rille are the next excursion to lay out, not terrain
already present in the pilot. Preserve this sky, palette and handling.
