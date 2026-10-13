# Northern Reach stone circle rework

The circle is now at **(-170, 650)** in a shallow hollow south of Pine Hollow.
Enter from the south through **(-170, 680)**. The old roadside placement was removed.
There is no sign, marked access track, destination entry or map marker.

The geometry uses closed, individually shaped stone slabs with clipped corners,
broken crowns, unequal heights, lean, moss at the bases and grounded fragments.
The rendered geometry also supplies the concave collision mesh, preserving the
open entrance and the gaps between stones. The stones cast and receive shadows.

Terrain encloses the north, east and west sides. The southern entrance has a
clear grass approach; random props are excluded from the interior and entrance.
The height change is local and uses the existing shared terrain lattice.

## Review evidence

- `entrance.png`, `inside.png`: actual Chromium game captures of the new geometry.
- `pine-track.png`, `timber-track.png`, `upland-track.png`: game views toward the site from the surrounding tracks.
- `north-hill.png`: the near side of the enclosing northern hill.
- `sightlines.json`: terrain-only design measurements from nearby authored tracks,
  sampled every 8 metres, including camera offsets up to 18 metres and a
  conservative camera elevation 17 metres above the track. All 10,080 sampled
  lines to a box above the entire circle were terrain-occluded. The weakest
  measured margin was 5.89 metres. This does not rely on fog, trees or streaming.

`npm run typecheck` and `npm run build` passed. Per the user's instruction, no
unit, browser or PWA test suites were run. Captures used Chromium directly;
WebKit and driving acceptance remain unrun.
