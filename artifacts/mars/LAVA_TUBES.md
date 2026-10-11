# Lava Tubes and the Quiet Vault

Two partly buried basalt tubes run roughly north-south under a low lava field.
Their open approaches descend into the rock rather than entering freestanding arches.
The eastern roof extends 244 m; the western roof extends 218 m and starts 43 m later.
The centre lines bend independently, about 58 m apart.

| Feature | Placement and purpose |
| --- | --- |
| Reset | (-455, -275), 10 m; connected to Rust Dunes. |
| Eastern passage | Roof from Z -330 to -574, floor near 6 m, generally 12-15 m below the surface. |
| Western passage | Roof from Z -373 to -591; rejoins the northern exit route. |
| Collapses | Three irregular open skylights per tube, with broken crust at the rim and matching fallen blocks beneath. |
| Junction | At Z -456, both tubes open into a cross-passage under the collapsed area. |
| Rubble | Large blocks collect beside the easy line; low fallen plates and small flattened Northern Reach-style dodecahedra give bumps along both floors. The small stones protrude less than 24 cm and have matching mesh collision. |
| Upper ground | Low rolling basalt shoulders join the solid roof skins; cross-country driving is possible above the tubes, avoiding the actual holes. |
| Quiet Vault | (-419, -526), recessed eastern alcove: asymmetrical fractured gate leaves, a central tapered marker and narrow pale-teal inlays. No cube, objective or required interaction. |
| Surface bypass | Western high ground through (-526, -430), reconnecting around the northern mouths. |
| Crown return | Existing eastward route through (-275, -433) to Crown's western rim. |

The roof is roughly 1-1.7 m thick, with irregular undersides and broken edges.
Terrain supplies the stepped trench walls and floor; separate roof meshes provide the
second driveable level. Both skins and opening rims use the same triangles for rendering
and collision. Roof strips are assigned deterministically to nearby streaming chunks;
their geometry is identical when reconstructed across chunk owners.
Rim rocks sit back from the openings with embedded, slope-following bases; support checks
sample their base edges against the actual roof triangles, preventing hovering overhangs.
Rock particles are dark basalt here; Mars's rusty rock-particle palette remains elsewhere.

Reference inspiration: the user's Surtshellir entrance and collapsed-roof photographs.
These are visual references only, not shipped textures or assets.

Preview: `/?area=mars&start=lava-tubes`. Current captures: `lava-tubes-review/`.
Short checks cover roof/opening geometry, chunk ownership, rubble and rooftop driving,
and crossing between tubes. Full-length revised journeys and device acceptance remain
deferred at the user's request; older complete-circuit results do not certify this layout.
