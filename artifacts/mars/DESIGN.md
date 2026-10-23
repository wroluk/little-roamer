# Mars Outpost: world and region design

Coordinates use metres, north is negative Z. The nominal square is -768..768 on both axes. This is a design layout, not a claim that all regions exist in the game. See [concept map](concept-map.svg).

The central clearing is (0, 48). The expanded layout places Dish's receiver at (398, -472), Glassfall's terrain centre at (500, -30), and Iron's at (380, 460). Habitat and Crown (0, -195) retain their pilot positions. Keyhole (0, 530), Delta (-428, 434), Dunes (-525, 15), and Tubes (-430, -418) now have authored terrain, landmarks, routes and regional starts. Keep the outer 45–70 m for the perimeter's steepest terrain. The outer route reconnects to Crown. Habitat now has northern/Crown, eastern/Glassfall, southern/Keyhole and western/Delta spokes; the two new wild roads have no trail posts.

Glassfall's terrain footprint is 1.45 times wider and Iron's 1.4 times wider; buildings, vehicles and road widths retain their scale. Glassfall now has a low, open approach and a broad gradual fade into pale ground: the large northern screening peaks were removed after user review. Two low, asymmetric sediment shoulders replace the central bell-shaped hills. The next connector still bends west around the stronger shoulder at (465, 310); Split Anvil emerges at (374, 315). The two small fins on steep approach slopes were removed. Fog now spans 65–250 m, restoring the previous setting after user review of visible detail transitions. Trail posts remain only on the developed Habitat, Crown and Dish routes; wild regions and their connectors are unmarked.

| Region | Silhouette / palette | Easy line and optional feature | Landmark and secondary details | View, reset and connection |
| --- | --- | --- | --- | --- |
| Habitat Seven | Low ivory domes, orange airlocks, dark solar wings; flat ochre apron | Broad courtyard circuit and departure lane; optional cargo-pad loop | Three geodesic domes with triangular glazing and pale structural struts, numbered landing pad, raised solar panels and a four-legged cargo lander | Arrival/reset on southern 07 pad (0, 40), facing Crown with lower static Mars camera; road anchor remains (0, 8); four outward spokes |
| Crown Crater | Pale scalloped bowl, three broken crown teeth above the north rim | Broad rim circuit; winding descent to a small dark impact stone on the floor | Exposed sediment bands, radial ejecta slabs, paired route posts and a north lookout | Look south to Habitat; reset (0, -120); west reserved for Tubes, east for Dish |
| Dish Ridge | High terracotta shoulder with an ivory concave dish above it | Long switchbacks and broad turnouts; optional rock shelf | 34 m segmented reflector, radial lattice trusses, four braced feed arms, fork pivot, catwalk, ladder, three supporting legs and relay masts | Overlook sees Crown and Habitat; reset on west saddle; descends south to Glassfall |
| Glassfall Plain | Low pale fan crossed by solid dark melt flows | Firm loop around impact scar; unmarked off-road glass exploration, no crossing road | Raised impact lip, continuous rounded glass flows without plate fractures or shards, scattered pale ejecta | Dish remains north reference; reset west approach; southern fan opens to Iron |
| Iron Maze | Tall rust-black fins, uneven roofline, open ochre corridors | Clear broad central passage and perimeter bypass; narrow optional slalom | Fins have individual tapered profiles and visible sediment feet; one fallen slab forms a side pocket | Dish glimpsed between fins; reset north entrance; south exit curves toward Keyhole |
| Keyhole Badlands | Muted sandstone strata and two asymmetric natural bridges | Winding dry wash; optional ledge and narrow driveable main crest | Thin, irregular rock ribs grow out of broad rocky shoulders; smaller northeast companion arch; grounded foothill slabs | Main span frames the northern basin; reset east wash; west exit to Delta |
| Fossil Delta | Branching low channels and default rusty-orange Martian sand | Two channel branches reconnect; firmer bank route above them | Pale flat sediment slabs, stranded dark boulder, a stepped fan visible from overlook | Keyhole silhouette to east; reset upper bank; west/north trail reaches Dunes |
| Rust Dunes | Sweeping asymmetric crescents in orange dust | Firm bedrock perimeter; optional dune crest and bowl | Tall crescent surrounding a dark bedrock island; smaller leeward ripples | Outpost domes to east; reset on bedrock; north exit toward Tubes |
| Lava Tubes | Buried basalt trenches under a low lava field | Two long parallel tubes, staggered entrances, collapsed connecting chamber; driving below and on top | Thin irregular crust with six skylights and fallen rock; fractured angular Quiet Vault gate with restrained teal inlays in the eastern alcove | Light patches guide underground travel; reset south approach; east saddle returns to Crown |

Scenery loads with its detailed chunks, without dithered transitions or activation
fades. Only the original distant Dish and Habitat silhouettes remain, replaced when
their detailed owners load. The experimental extra landmark silhouettes and fading
were removed after visual review. Fog is 65–250 m; rendering remains 5 x 5 chunks
and collision remains 3 x 3 chunks.

## Unmarked shuttle wreck in the Delta / Dunes transition — 2026-10-14

The user selected the shuttle stern from six temporary geometry studies. It now
replaces the cylindrical hull at **(-653, 265)**, west of the connector. The nose
is buried at an angle, leaving a huge swept tail fin, separate rudder, asymmetric
stabilizers and three thick open engine exhausts visible. Its gray materials and
vertex-color dust retain the texture-free style. Every visible structural part
supplies matching collision triangles through the existing chunk lifecycle.

The shuttle sits 3 m deeper than the comparison version to meet this site's sand.
The existing east and north screening banks now have amplitudes of 39 m and 37 m,
respectively, to conceal the taller fin. Road grading still takes precedence.
The south/west approach remains unmarked, with no sign, reset destination or new
route. The former hollow interior is gone; exploration is around the stern and
buried fuselage. The recorded approach path now follows the clear west side.

Actual Chromium captures of the reveal, stern, side, connector and perimeter are
in [shuttle-wreck](shuttle-wreck/README.md). The shuttle is hidden in both captured
track views. This is visual evidence at those viewpoints; the updated automated
sightline and driving checks were **not run**, per the user's instruction.
Typecheck and production build passed. Device/WebKit acceptance remains unverified.

All temporary study generators, placements, plaques, scatter exclusions, A–F
controls, URL hooks and comparison capture code have been removed. The old
comparison screenshots remain only as archived design history in
[wreck-comparison](wreck-comparison/README.md). The normal Mars game now contains
only the selected hidden shuttle. Earlier wreck screenshots and acceptance
records describe superseded geometry.

## Geometry and visual review rules

Mars offers both Mars Scout and Lunar Rover, defaulting to Scout. The Lunar
Rover's upright three-pane forward cabin, rectangular lamps, low bumper,
exposed wheels, rear solar deck and six-opening silver dish rims give it
a separate silhouette without changing established four-wheel physics or route
clearances. Both are also available on the internal Moon; Earth retains its
Modern/Classic choices. [Current lunar body on Mars](../moon/lunar-rover/webkit-tablet/mars-rover-front.png).
Its side glazing follows the cabin faces with common front/corner/side window
heights and a parallel corner pillar. Cabin panes share one light-independent
dark-blue finish; solar and body lighting remain separate.

Hero forms use authored profiles, ribs, bevels, strata, and asymmetric silhouettes. Scattered rocks support these forms and stay outside the easy route. A landmark must read from the car's camera, not just an overhead map. Keep routes at least 7 m wide in the pilot, widen switchbacks and junctions, and grade both shoulders. Sample actual triangle heights, then drive in both directions.

The landing pad and roads meet the terrain without raised collision lips. Domes use flat triangular panels cut at the foundation plane, with matching panel colliders; airlocks and support feet have matching solids. The crater has a genuine terrain bowl; the visible road is the collision surface. Future arches and tubes require open meshes with matching triangle collisions; a bounding box must never seal a visible passage.

Review each region from three named views: arrival (silhouette and route choice), feature (shape and collision clearance), and overlook (relationship to the wider map). Save actual game captures after each milestone. Concept drawings are only layout evidence.

## Dish Ridge — 2026-10-09

Dish Ridge's original implementation is documented in its [region card](DISH_RIDGE.md), historical [terrain map](dish-ridge-map.svg), and linked game captures. The expanded-layout western lookout is at (321, -494), on a 54 m shoulder. Low-detail receiver and habitat models preserve silhouettes outside the detailed terrain ring, but intervening terrain now screens ordinary ground-level views. The southern road connects to Glassfall through the new rust gully.

## Pilot visual revisions — 2026-10-08

User reference feedback replaces the initial meridional dome ribs with a geodesic triangle network. The three habitats have ivory insulated skirts and crowns, dark triangular glazing toward the courtyard, and pale struts along shared panel edges. Hull triangles supply both visible surfaces and collision.

The Mars Scout now uses an angular expedition cabin, split sloped windshield, wraparound side glazing, white bodywork with restrained orange markings, open roof rack, rear radiator and service hatch, front bull bar and driving lights, visible suspension arms, and chunky treaded tires with open wheel wells. The fender plates were removed following suspension-clipping feedback. The four existing wheel contact positions and shared handling remain the mechanical basis.

User-supplied visual references:
- [Geodesic habitat reference](https://t4.ftcdn.net/jpg/09/58/42/45/360_F_958424514_Pbrn4DBj7m1So1Z9E5tWUiknvwpLolwu.jpg)
- [Expedition rover reference by Gabriel Patrulescu](https://cdna.artstation.com/p/assets/images/images/025/311/906/large/gabriel-patrulescu-1.jpg?1585392211)

These guide locally modeled geometry; reference images are not shipped as game assets.

Mars wayfinding uses clipped-corner dark housings between two ivory side pylons with clipped shoulders and individually grounded angular feet, steady cream edge lights, and amber route information. Separate illuminated display faces show upright text from both directions. Large destination labels take priority over the small navigation-network identifiers; compass words keep directions unambiguous from either side. Display geometry retains texture coordinates through batching and stands clear of the solid housing.

The first image-feedback review grounds rock skirts across their footprints and keeps loose scatter off steep walls. Independent deterministic shape and placement choices mix chips, slabs and taller knuckles. The Great Ring uses irregular shoulders and terraced buttresses; warm haze runs from 80 to 480 m after the user's request for a slight reduction. Coarse horizon tiles retain the detailed boundary lattice to meet streamed terrain without cracks. See [feedback response and captures](FEEDBACK1_RESPONSE.md).

The second review aligns solar-panel posts to the tilted underside and local terrain. A later follow-up removes the north lookout board completely, leaving the rock silhouettes and route posts in view. The landing pad has a layered octagonal paint outline and large, centred **07** stencil numerals, without a text label. The Mars haze keeps its 80–480 m range; its dusty rose tint was darkened slightly once more after the pad review. See [feedback 2 response and captures](FEEDBACK2_RESPONSE.md).

## Glassfall Plain — 2026-10-09

See the [region card](GLASSFALL_PLAIN.md) for the impact scar, three melt ribbons, firm circuit, off-road exploration, eastern lookout and connecting roads. The authored crossing road has been removed following user review.

## Iron Maze — 2026-10-09

The [region card](IRON_MAZE.md) details the layered fin field, Split Anvil, main passage, western bypass, rock slalom and eastern lookout. Its westbound exit now joins Keyhole Badlands.

## Western regions — 2026-10-09

The user approved continuing without intermediate manual review, with region-focused checks only. See [Keyhole](KEYHOLE_BADLANDS.md), [Delta](FOSSIL_DELTA.md), [Dunes](RUST_DUNES.md), and [Tubes/Vault](LAVA_TUBES.md) for implemented layouts, previews, geometry and acceptance limits. No new wilderness trail posts are introduced. The 65–250 m haze takes precedence over old long-distance view promises: Keyhole frames the northern basin, but Habitat is not visible through half a kilometre of haze.
