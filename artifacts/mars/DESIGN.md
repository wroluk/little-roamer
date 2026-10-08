# Mars Outpost: world and region design

Coordinates use metres, north is negative Z. The nominal square is -384..384 on both axes. This is a design layout, not a claim that all regions exist in the game. See [concept map](concept-map.svg).

The central clearing is (0, 48). Region centres follow an irregular circuit inside the Great Ring: Crown (0, -195), Dish (210, -220), Glassfall (245, -20), Iron (230, 190), Keyhole (0, 245), Delta (-210, 200), Dunes (-245, 0), Tubes (-210, -220). Reserve 25 m of blending around region edges and keep the outer 45–65 m for the perimeter's steepest terrain. The playable network has spokes from Habitat to Crown, Glassfall, Keyhole/Delta, and Dunes. Each pair of adjacent outer regions gets a two-way connection.

| Region | Silhouette / palette | Easy line and optional feature | Landmark and secondary details | View, reset and connection |
| --- | --- | --- | --- | --- |
| Habitat Seven | Low ivory domes, orange airlocks, dark solar wings; flat ochre apron | Broad courtyard circuit and departure lane; optional cargo-pad loop | Three geodesic domes with triangular glazing and pale structural struts, numbered landing pad, raised solar panels and a four-legged cargo lander | North departure frames Crown; reset (0, 8); four outward spokes |
| Crown Crater | Pale scalloped bowl, three broken crown teeth above the north rim | Broad rim circuit; winding descent to a small dark impact stone on the floor | Exposed sediment bands, radial ejecta slabs, paired route posts and a north lookout | Look south to Habitat; reset (0, -120); west reserved for Tubes, east for Dish |
| Dish Ridge | High terracotta shoulder with an ivory concave dish above it | Long switchbacks and broad turnouts; optional rock shelf | Dish has a visible open bowl, three supporting legs, feed arm, relay masts and cable trenches | Overlook sees Crown and Habitat; reset on west saddle; descends south to Glassfall |
| Glassfall Plain | Low pale fan cut by charcoal glass streaks | Firm loop around impact scar; optional slick transverse crossing | Raised impact lip, glossy dark streaks flush with terrain, scattered pale ejecta | Dish remains north reference; reset west approach; southern fan opens to Iron |
| Iron Maze | Tall rust-black fins, uneven roofline, open ochre corridors | Clear broad central passage and perimeter bypass; narrow optional slalom | Fins have individual tapered profiles and visible sediment feet; one fallen slab forms a side pocket | Dish glimpsed between fins; reset north entrance; south exit curves toward Keyhole |
| Keyhole Badlands | Horizontal buff/red strata with a single large arch | Winding dry wash; optional elevated ledge reconnects to it | Beveled, genuinely open Keyhole Arch; terraced buttes; eroded wash banks | Arch frames Habitat from south approach; reset east wash; west exit to Delta |
| Fossil Delta | Branching low channels and pale sediment fans | Two channel branches reconnect; firmer bank route above them | Flat sediment slabs, stranded dark boulder, a stepped fan visible from overlook | Keyhole silhouette to east; reset upper bank; west/north trail reaches Dunes |
| Rust Dunes | Sweeping asymmetric crescents in orange dust | Firm bedrock perimeter; optional dune crest and bowl | Tall crescent surrounding a dark bedrock island; smaller leeward ripples | Outpost domes to east; reset on bedrock; north exit toward Tubes |
| Lava Tubes | Dark broken flow shelves and open skylight | Daylight-visible short tunnel and surface bypass; alcove discovery | Continuous roof geometry with an actual opening; Quiet Vault half buried in side alcove, angular bronze-black shell and thin pale-teal seams | Skylight reveals a sliver of the Vault; reset south entrance; east saddle returns to Crown |

## Geometry and visual review rules

Hero forms use authored profiles, ribs, bevels, strata, and asymmetric silhouettes. Scattered rocks support these forms and stay outside the easy route. A landmark must read from the car's camera, not just an overhead map. Keep routes at least 7 m wide in the pilot, widen switchbacks and junctions, and grade both shoulders. Sample actual triangle heights, then drive in both directions.

The landing pad and roads meet the terrain without raised collision lips. Domes use flat triangular panels cut at the foundation plane, with matching panel colliders; airlocks and support feet have matching solids. The crater has a genuine terrain bowl; the visible road is the collision surface. Future arches and tubes require open meshes with matching triangle collisions; a bounding box must never seal a visible passage.

Review each region from three named views: arrival (silhouette and route choice), feature (shape and collision clearance), and overlook (relationship to the wider map). Save actual game captures after each milestone. Concept drawings are only layout evidence.

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
