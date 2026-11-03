# Island: Castaway Cove and the Old Aqueduct

North is -Z, east +X. Invented tropical geography, not a real archaeological site.
Development-only pilot, not a completed or released world.

The experience is a connected journey: open beach, enclosed green approach,
stone arches overhead, a looping jungle climb, the same arches beneath the
wheels, and the sea revealed on the return. A forgiving main line is available
in both directions. The western shortcut is optional, narrower and rougher.

| Place | X / Z | Driving identity |
| --- | --- | --- |
| Castaway Cove | -70 / 132 | Dry sandy start looking toward the inland departure. Pale sand and fitted turquoise shallows; the open sea is not a driving route. |
| Aqueduct underpass | 0 / 0 | Low trail at height 5 beneath the central arch. No bounding-box collision sealing the passage. |
| Rootwood Trail | -108 / -36 | Western climb through solid trunks, buttress roots and layered broadleaf crowns; branch rejoins before the bridge. |
| Old Aqueduct | 0 / 0 | Separate deck at height 26, three 18 m-wide arch openings and low solid parapets. Wide straight approaches at both ends. |
| Aqueduct overlook | 64 / 0 | Dry eastern regional start, then a graded descent opening onto the ocean. |

The detailed ground spans 480 x 480 m on a 2 m lattice. The island itself is
smaller and surrounded by submerged bed; the sea continues through a separate
non-overlapping deep-water apron. Both inland and beach routes remain dry.
The island terrain, water and batched scenery stay resident with no LOD swaps.
The pilot does not establish suitability for a larger jungle or iPad frame rate.

Vegetation has a deliberate hierarchy: leaning palms on low ground, taller
broadleaf canopy inland, buttress roots, low clustered green dressing and sparse
grounded solid rocks. Final jittered positions are checked against routes and
regional clearings. Crowns and small undergrowth are decorative; trunks, roots,
rocks and the aqueduct are solid. Small plants do not cast dense shadow patterns.

The coordinate-only surface callback cannot distinguish vertically stacked
deck and trail at the same X/Z. Both therefore use the existing firm-dirt
handling rather than claiming stone traction while driving beneath the bridge.
The upper driving-height sampler is for entry/placement; normal physics and
local recovery use actual colliders, not that highest-surface shortcut.
The navigation HUD uses the lower ground while the car is below the deck, so
the arch passage reports 5 m and the upper crossing reports 26 m.

The eastern shoulder descends broadly toward the sea; it is not merely a narrow
graded road carved through a taller hill. Canopy scatter leaves a deliberate
seaward opening from the eastern landing. The southern beach shelf similarly
keeps generic inland relief from forming an artificial wall beside the start.

Development entry links:

- `http://127.0.0.1:5173/?area=island&start=castaway-cove`
- `http://127.0.0.1:5173/?area=island&start=rootwood-trail`
- `http://127.0.0.1:5173/?area=island&start=aqueduct`

No hidden cenote, upper terraces, journal, secrets, moving water, external assets
or new vehicles are included in this pilot.

## Actual-game review views

The browser scenarios save unaltered driving-height and close landmark frames
under `chromium-tablet/` and `webkit-tablet/` beside this document: the three
regional starts, cove, arch arrival, jungle, aqueduct side and ocean overlook.
`loop-forward.json` and `loop-reverse.json` record actual keyboard-driven closed
circuits, including passage beneath and across the same bridge, dry wheel
travel and render budgets. These are development evidence, not user acceptance
or physical-iPad certification.
