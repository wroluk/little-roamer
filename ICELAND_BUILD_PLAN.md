# Iceland build plan

Status: **South-coast glacier corrections accepted and pushed; expanded Vatnajökull, lower brown Grímsvötn moved north, coastal lowlands and four rounded island corners are in visual review. Vatnajökull retains only the through-route; its overlook branch is removed. Western ice cave is next** (2026-10-21).
See [implementation progress](ICELAND_PROGRESS.md) for checks and the next chunk.
This is a new, full-size **Iceland** location alongside the existing 480 × 480 m
Iceland Highlands. Do not replace that location during development. The new
world is 1,536 × 1,536 m, like Northern Reach and Mars Outpost. Its geography is
compressed and deliberately driveable, but the relative placement of named
places follows Iceland. See the [draft map](artifacts/iceland/concept-map.png)
and [spatial design and region cards](artifacts/iceland/DESIGN.md).

## Experience to build

- A coast-to-highlands expedition with real sea around an irregular landmass,
  mostly black beaches, one red sand Westfjords beach, and a solid underwater
  boundary. Water is deep visual space, never a shortcut to another region.
- Fourteen coherent driving regions plus an optional hidden discovery. Each has a
  recognisable silhouette, a route in both directions, a safe regional start,
  and a view or clue pointing toward its neighbour. The ice cap and coast are
  large enough to feel like places rather than a dense checklist.
- A coastal circuit, an inland highland route, and several cross-links. There
  are no objectives, timers, damage systems, or mandatory hazards. The named
  real-world sites are stylised; the game is not a navigation map.
- Motion is restrained and local: waterfall water and mist, fumarole steam,
  slow iceberg drift, lagoon/sea water, and occasional wind-blown sand or snow.
  Motions must survive chunk streaming and remain light enough for iPad Safari.

## 1. Lock the map before terrain work

1. Review the coordinate map and regional cards in `artifacts/iceland/DESIGN.md`.
   Protect coastline, glacier, lagoon, canyon, and route corridors first. Check
   at car-camera height that major landmarks have distinct approach silhouettes.
2. Set the nominal land footprint inside the ±768 m square. Reserve a deep-sea
   apron to every edge and a natural sea-floor collision boundary beyond the
   reachable coast. Keep the route back from any shore plainly visible.
3. Set a south-coast start near Skógafoss, where the player can choose the
   coastal circuit or the inland Lakagígar route. Make regional direct links
   internal during development. Use the existing Earth vehicle at first; decide
   whether a dedicated Iceland car adds value only after the first driving pilot.
4. Mark planned crossings, reset clearings, landmarks, postcard viewpoints,
   chunk boundaries, and water bodies. Confirm no road ends at a cliff or sea.

**Map gate:** every region has at least two exits or a clear return line; the
south-coast and highland routes form loops; the lagoon outflow reaches the sea;
the Westfjords remains a meaningful journey, not a disconnected postcard.

## 2. Pilot: south coast and glacial lagoon

Build **Skógafoss → Sólheimasandur → Reynisfjara → sandur → Jökulsárlón** as the
first playable slice. This proves the sea edge, black sand, waterfall, the
Skógá and its marked ford, glacial river, bridge, lagoon, calving glacier
front, icebergs, and safe routes beside deep water. The north and west sectors
remain internal development terrain.

- Reuse the proven area-specific worker/chunk approach as a starting point:
  96 m chunks, matching visible and Rapier terrain triangles, bounded render
  and collision rings, deterministic generation, and a coarse distant layer.
  Share only area-neutral streaming code; keep Iceland geology separate.
- Let the river flow visually from Jökulsárlón to the southern sea under a
  broad, collidable bridge across the **short Jökulsá outlet river**, south of
  the lagoon basin. Route 1 skirts the lagoon on dry land; no bridge or road
  crosses the open lagoon. Leave visible river both upstream and downstream
  of the bridge before it reaches the sea. The glacier front is a sheer **Breiðamerkurjökull**
  outlet above the lagoon, with a clearly separate safe approach to Vatnajökull.
  Icebergs stay inside the lagoon and do not obstruct the bridge or safe route.
- Give Skógafoss and Reynisfjara distinct silhouettes. The plane wreck is an
  optional discovery on the Sólheimasandur black sand, between them.
- Shape the Skógá from high ground over Skógafoss, into a plunge pool, and
  onward to the southern sea. Place a shallow, broad gravel-bar ford downstream
  of the falls, clear of the plunge pool. Grade both banks for the gravel ford and carry the paved Ring Road over a
  separate bridge; keep the waterfall away from the wheel path.
- Make the sea a convincing boundary: surf, beach shelf, then deep water and a
  visible seabed/cliff that keeps the vehicle inside. Test recovery from shore
  mistakes and reset from every reachable water edge.

**Pilot gate:** with the real car, drive the coast in both directions, ford the
Skógá both ways, cross the lagoon outflow bridge, reach an iceberg and glacier
viewpoint, return to the start without reset, and safely reset after leaving
the track. Check actual water depth, traction, current visual cues, and bank
grades; inspect Chromium and WebKit captures from road and beach level.

## Additional design reservations — 2026-10-17

Reserve Landmannalaugar with Brennisteinsalda, Laugahraun obsidian and the
optional Ljótipollur crater lake west of Lakagígar. Add Lómagnúpur to the
south-coast pilot as the visual gateway onto Skeiðarársandur before the glacier
and lagoon approach. Recommend Langjökull as a compact second glacier linked
to Hallmundarhraun/Surtshellir. Kerlingarfjöll is confirmed as the pale geothermal mountain region. Include
Kverkfjöll as a compact northern Vatnajökull landmark within the existing
glacier region; it does not need a separate region allocation.
See the [new placement and route reservations](artifacts/iceland/DESIGN.md#additional-highland-and-gateway-reservations--2026-10-17).

Finish the current coast pilot first, including Lómagnúpur at its sandur stage.
Add Landmannalaugar after Lakagígar, and build Langjökull with the western
Surtshellir connector. Complete Kerlingarfjöll with the central highland cross-link and Kverkfjöll
with Vatnajökull’s northern Askja connector. Every added region needs the same driving, capture and
dual-engine gates. The revised SVG/PNG now includes all fourteen regions,
Lómagnúpur, Kverkfjöll and Route 1 with a separate Westfjords branch.

## 3. Build one region per iteration

| Order | Region | Main driving/content proof |
| --- | --- | --- |
| 1 | Vatnajökull and Grímsvötn | Broad snow and ice ascent, genuinely driveable high plateau, low brown half-buried caldera rim, safe descent to lagoon side. |
| 2 | Western ice margin | Long drive-through ice cave at the western edge, translucent layered ice, broad portal and roof clearance; optional roof route with separate safe line. |
| 3 | Lakagígar and sandur | Moss-dark fissure row west of the ice cap, varied crater silhouettes, a dry braided outwash plain, and a road with optional rough volcanic-sand lines. |
| 4 | Askja, Víti and Herðubreið | Large highland caldera with inner crater lake, smaller Víti crater, flat-topped Herðubreið landmark north/northeast of Askja, and a pumice-desert approach. |
| 5 | Ódáðahraun | Broad, rough black lava wilderness between Askja and Mývatn, with a long winding traverse, varied old and new flows, and a firm line among optional rock challenges. |
| 6 | Mývatn volcanic country | Green lake margin and Skútustaðagígar pseudocraters; Hverfjall, Krafla/Stóra-Víti, Hverir at Námafjall, and contrasting lava fields. |
| 7 | Stuðlagil and eastern river | Columnar basalt canyon with Jökla river, safe rim track in both directions, a bridge/return loop and optional rough overlook. |
| 8 | Surtshellir and Hallmundarhraun | Central-west mossy lava field, a stylised drive-through Surtshellir lava tube with roof openings, and a return route toward the south coast or Westfjords. |
| 9 | Westfjords | Long fjord road, steep but fair switchbacks, Rauðasandur red-sand exception, and Garðar BA 64 shipwreck on a separate nearby shore. |

For each region, finish the connector from the previous region and an exit to
the next. Model every visible hero structure with matching collision, including
ice-cave walls/roof, basalt columns, bridge, tube roofs, ship and plane wrecks.
Grade the easy route and shoulders from sampled terrain triangles; test the
actual vehicle in both directions. Keep an optional difficult line separate
from the safe route. Save approach, feature, and overlook captures plus an
updated map. Do not call a region complete from generated terrain alone.

## 4. Motion and effects

Implement motion after the static scene and driving lines work. Prioritise:

1. Waterfall sheet, foam and low mist at Skógafoss. Reuse a fixed, small local
   simulation; the waterfall must remain legible when motion is reduced.
2. Fumarole steam at Hverir and selected volcanic vents. Use sparse particles
   or animated cards with depth-aware placement, no steam across the safe line.
3. Slow, bounded iceberg bob/drift in Jökulsárlón. Keep iceberg collision simple
   or keep moving ice outside car-reachable water; never have visible solids
   diverge from collision in a vehicle path.
4. Subtle surf, river flow, wind-blown ash/snow. Tune for readability and device
   cost before adding more effects.

Animation uses deterministic seeded shapes and time-based transforms, pauses
with the game, and disposes with its chunk or scene. Offer a reduced-motion
presentation where the existing UI/platform preference supports it.

## 5. Whole-world acceptance and release

Drive the coast circuit and highland loop both ways, including the Skógá ford,
every bridge, ice-cave entrance, tube, and regional reset. Check silhouette, route visibility,
terrain/collider agreement, chunk seams, camera clearance, water recovery,
iceberg and effect lifecycle, area switching, and sustained device performance.
Keep public picker availability behind completion of the full world.

Use the [README checks](README.md#checks) as the baseline: typecheck, affected
unit/real-driving tests, build, and focused Chromium/WebKit browser cases at each
completed region. Run full unit/browser suites after each block of three
completed regions or broad shared-system edits, and before public release. Run
PWA checks for startup/cache/storage/offline changes and before release, after
browser tests because they share `test-results`. Record progress, last full-suite
date, skipped cases and exact next step in a dedicated `ICELAND_PROGRESS.md` once
implementation starts. Physical iPad Safari driving, touch and offline reload
remain explicit manual acceptance until covered by automation.

**Next step:** review the new plateau, Grímsvötn rim and cairned coast connectors,
then build the western ice-cave route. The northern Askja/Kverkfjöll connector
remains reserved for its later slice. Preserve the implemented Ring Road
corridor as regional terrain is authored; road access alone does not complete a region.
