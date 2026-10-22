# Postcard captures

`mars-photo-views.json` preserves ten photo-mode views supplied for Mars, and
`northern-reach-photo-views.json` preserves seventeen Northern Reach views,
including Pine Hollows and the hidden stone circle. Each entry keeps the copied car pose and camera values. The capture
script uses the camera position, target, and field of view for car-free images;
the car pose remains as a reference to the original photo-mode session.

With the local development server running, regenerate the images with:

```sh
POSTCARD_BASE_URL=http://127.0.0.1:5173 node --import tsx artifacts/postcards/capture.mjs
```

The script writes images to `public/postcards/mars/` and
`public/postcards/northern-reach/`. Set `POSTCARD_AREA=northern-reach` or
`POSTCARD_AREA=mars` to capture one location, or pass postcard IDs as arguments
to capture selected entries. Saved views must cover every authored postcard.

## Development trigger maps

The [Mars map](../mars/postcard-trigger-map.png) and
[Northern Reach map](../northern-reach/postcard-trigger-map.png) plot all current
postcard visit circles over their existing region maps. Solid rings mark each
card's primary trigger; dashed rings mark additional approach zones. Numbered
markers match the legend. The purple stars show secret discovery triggers for
development review. The SVG versions are beside the PNGs for zooming.

The circles are generated directly from `src/game/postcards.ts` in world x/z
coordinates, including each radius. The Northern Reach background shows sampled
terrain, water and routes; the Mars background is its schematic exploration
layout. A map circle is only the spatial condition: the tracker also requires
at least 8 m of actual driving since spawn/reset, and ignores teleports.

The October 2026 geometry review re-centred Crown Crater, Iron Maze, Stonegate
Basin, Ember Basin and Ochre Terraces on their main landforms. Great Lake now
has shoreline circles around its entire scalloped perimeter and an island
circle, while keeping the eastern entrance circle. The isolated Iron precursor
fin remains outside the main field trigger. The PNGs reflect these current
definitions; regenerate them after future postcard edits.

Ochre Terraces (#11) was subsequently narrowed from one 165 m circle to two
85 m circles over the shelves circuit and rock-ramp traverse. The pair covers
the complete authored loop while leaving the outer slopes outside the trigger.

Regenerate these artifact images after changing trigger geometry:

```sh
node --import tsx artifacts/postcards/render-trigger-maps.mjs
```
