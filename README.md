# Little Roamer

An open-ended 3D toy 4WD playground with four places to explore: sunny hills
in **Sunshine Valley**, the volcanic **Iceland Highlands**, and the streamed
1.5 km-wide wilderness of **Northern Reach**, and **Samurai Village**.
No score, objectives, timers, accounts, audio, or downloads of external artwork.

Built with TypeScript, Vite, Three.js and Rapier. All meshes and trail-sign
textures are generated locally. Runtime requests stay on the game server.

## Install on iPad for offline play

Little Roamer is an installable PWA. The production build precaches the game,
all area generators, the Northern Reach worker, Rapier physics, icons, and
generated styling for offline use.
Northern chunks are regenerated deterministically from cached code; no network
or previously generated chunk database is needed while driving.

1. Publish `dist/` on an **HTTPS** static URL.
2. Open that URL directly in **Safari on the iPad** while online.
3. Wait for **Ready to play offline**. It may take a moment because the complete
   game is roughly 1 MB compressed.
4. Tap Safari's **Share** button, choose **Add to Home Screen**, then **Add**.
5. Launch Little Roamer from its new home-screen icon.
6. Test once in Airplane Mode to confirm that iPadOS finished caching it.

Opening the URL on a Mac is useful for testing, but it does **not** install or
transfer the PWA to an iPad. Each iPad must visit the HTTPS URL and add it to
its own home screen. `http://127.0.0.1` is trusted only on the same Mac, and
plain `http://192.168...`/`http://10...` LAN URLs cannot register a service
worker on iPadOS. A public or private HTTPS static host is therefore needed
for the first install and future updates.

The configured GitHub Pages deployment is
**https://wroluk.github.io/little-roamer/**; `.github/workflows/pages.yml`
publishes successful `main` builds. Other HTTPS static hosts can also serve
`dist/`; no backend is required. After a new version is published, opening the
installed app online downloads it in the background. An **Update game** button
appears when the new offline version is ready, avoiding a forced reload while
driving.

Safari may remove offline website data under severe storage pressure. Reopen
the HTTPS URL and add/cache the app again if that happens.

## Run

Use Node.js **22.12 or later** (Node 22 LTS recommended) and npm.

```sh
cd /Users/U255567/Development/Toy4WD
npm ci
npm run dev -- --port 5173 --strictPort
```

Open **http://127.0.0.1:5173/** on the Mac. Click **Let's take a drive**.
The server listens on all local interfaces for tablet access, not just localhost.
Keep this terminal/session and the Mac awake while playing.

## Choose your next adventure

Use the Home Screen to choose Sunshine Valley, Iceland Highlands, Northern
Reach, or Samurai Village, and to switch between the green Modern Roamer and
the orange Classic expedition wagon. The car choice is remembered locally and
does not change the shared four-wheel physics or terrain handling. Pause and
choose **Choose another location** to return to these options. Switching areas
clears held controls and returns the car to that area's safe starting point.
**Reset car** stays in your current area. Only one area's terrain and physics
stay loaded, and graphics resources from the old area are released.

Direct links:

- Sunshine Valley: `http://127.0.0.1:5173/?area=valley`
- Iceland Highlands: `http://127.0.0.1:5173/?area=highlands`
- Northern Reach: `http://127.0.0.1:5173/?area=northern-reach`

In the highlands, follow the **amber posts** for broad, shallow river crossings.
Drive down the bank, through the water, and up the opposite side. The riverbed
is solid terrain, not an invisible bridge; the wheels kick up a little spray.
Volcanoes and glacier slopes are part of the terrain you can explore, not just
background scenery. This is still a relaxed toy playground, not a realistic
river-driving simulation: there is no drowning, lava damage, or vehicle damage.

Iceland Highlands spans **480 x 480 world metres**, versus the valley's
150 x 150: **10.24 times the exploration area**. Visit Eldfell and Raudafell's
rounded craters, moss-covered lava fields, basalt columns, the blue-striped
Blajokull glacier, and Moss, Sky, and Ember fords. The amber-post crossings
retain broad shallow beds, while unmarked river stretches contain much deeper
pools. The highlands car has extra climbing torque for long slopes, but the
same forward/reverse speed limits and braking behavior as the valley.

Northern Reach spans **1,536 x 1,536 world metres**. Its western fjord coast,
southern pine country, central lake basin, northeastern snow range,
southeastern volcanic uplands, and northern tundra form one continuous finite
landscape. Pale dirt roads connect the major regions, while cross-country
driving remains open. Terrain streams in deterministic 96 m chunks: a 5 x 5
render neighborhood and a collision-ready 3 x 3 core follow the car. The
outer landscape rises into a natural collidable boundary rather than ending
at an invisible drop. Streamed loose boulders are solid obstacles, matching
the playful collisions in the original areas.

## Mars development regions

Mars is available locally at `http://127.0.0.1:5173/?area=mars`.
It includes Habitat Seven, Crown Crater, Dish Ridge, Glassfall Plain, Iron Maze, their connecting roads,
the crater rim and floor descent, and the four-wheel Mars Scout. Dish Ridge adds
switchbacks, a concave communications receiver, a summit loop, a western lookout,
and an optional eastern rock ledge. Glassfall adds a pale impact fan, dark slippery
glass ribbons, a firm circuit and an eastern overlook. Iron Maze adds layered ironstone
fins, a broad passage, a western bypass and an optional rock slalom.
Trail posts remain around Habitat, Crown and Dish; Glassfall and Iron are unmarked.
The glass flows have no crossing road, but remain driveable off-road.
Stronger 55–220 m haze softens distant scenery appearing at the streaming boundary.
Use `?area=mars&start=crown-crater` to begin at the crater entrance,
`?area=mars&start=dish-ridge` for the ridge saddle,
`?area=mars&start=glassfall-plain` for the impact fan,
`?area=mars&start=iron-maze` for the fin field, or add
`&car=classic` / `&car=modern` to try an existing car. Reset chooses the nearest
of the five established regional starts. Mars is hidden from the production picker
and production direct links while its remaining regions are under construction.

The design spans 1,536 × 1,536 metres, matching Northern Reach. Detailed terrain streams in 96 m chunks,
with a 5 × 5 render neighborhood and 3 × 3 collision core. A coarse visual
terrain layer keeps the distant basin visible; simplified dish and habitat models
preserve their silhouettes beyond the detailed chunks. Packed regolith and soft red
dust have matching surface feedback and temporary tire marks. Delayed terrain
generation holds the car on loaded ground until the next chunk has collision.

The expanded-layout preview separates Dish Ridge, Glassfall and Iron Maze with
winding journeys. Glassfall has a broad open plain with a gradual pale-ground
transition; Iron remains hidden behind a screening shoulder. Both have larger landforms;
road widths, buildings and the Scout retain their scale. Start at Dish Ridge,
take its southern descent, then follow the road through Glassfall toward Iron.
Habitat and Crown retain their pilot positions for this first comparison.
See the [revised spatial map](artifacts/mars/concept-map.svg). Longer driving
and browser acceptance for the relocated layout is pending user review.

Follow [the build plan](MARS_BUILD_PLAN.md) and [progress record](MARS_PROGRESS.md)
for implementation status, evidence, and the next region. The broader Mars
landscape is development terrain; the remaining four regions are not finished.
See the [Dish Ridge card](artifacts/mars/DISH_RIDGE.md) and
[Glassfall Plain card](artifacts/mars/GLASSFALL_PLAIN.md), plus the
[Iron Maze card](artifacts/mars/IRON_MAZE.md), for layouts and review captures.

## Terrain handling

The current surface appears above the controls. Surface colors now correspond
to distinct vehicle behavior rather than being purely decorative:

| Surface | Driving feel |
| --- | --- |
| Packed dirt | Predictable and responsive, with subtle natural trail vibration and tan dust |
| Soft grass | Softer, uneven suspension response, resistance, and occasional grass clippings |
| Loose black sand | Wheels dig in and slide laterally over rippled ground, throwing dense dark dust |
| Rough lava | Slow, firm suspension chatter with small dark pebbles |
| Springy moss | Soft suspension and a gentle rebound with moss flecks |
| Glacier ice | Slides longer, turns and brakes reluctantly; an oblique line helps on steep climbs |
| Glacial river | Very slow, with depth-scaled drag, rocky-bed suspension shake, and bright spray |
| Mountain snow | Softer than ice, but drifts and needs a gentler uphill line |
| Soft mud | Heavy resistance with deep suspension movement |
| Mountain rock | Strong grip with firm, visible chassis movement |
| Coastal sand | Loose steering and soft rolling resistance |

Each grounded raycast wheel uses the surface directly beneath it, so straddling
ice, ash, or dirt creates stable mixed traction. Vehicle-wide power and drag
blend over a fraction of a second instead of snapping at terrain boundaries.
Dry surfaces share the same safety speed cap; acceleration, rolling resistance,
braking, lateral grip and suspension make them feel different. Deeper water
still limits progress. Sideways sliding adds more surface-colored particles.
On flat terrain, subtle visual ride texture moves all four wheels and gently
rocks the body as each axle crosses the same patch of ground. This leaves the
physical suspension to respond to actual terrain geometry. Rock and grass have
more visible ride texture than soft sand. Very steep uphill grades reduce drive
force; loose sand, ash, and mud lose additional uphill traction as the
grade rises. On those slopes the wheels visibly spin and throw more terrain
particles when the car struggles, while a gentler or diagonal line can keep it
moving. On descents, sand and mud shed momentum quickly, while ice keeps the
car gliding and needs much more room to brake. A sudden steering reversal on
ice lets the rear slide wide before the car settles. Steep ice faces also
reward a diagonal approach.
Authored trail climbs remain passable. The four wheels have separate Rapier
raycasts and drive forces;
their visible meshes also free-spin under throttle when airborne or overturned.
The surface chip briefly shows a trait such as **Slippery**
or **Rocky & rough**, while restrained camera feedback makes roughness readable
without inheriting the car's roll or bypassing collision avoidance.

Marked fords remain shallow and passable. Beyond roughly 0.65 metres, water
resistance rises nonlinearly and engine power fades; pools around one metre deep
stall the car instead of allowing an unmarked crossing. Back out before the
water becomes too deep, or use **Reset car** if the engine is fully submerged.

## Navigation instruments

The compact instrument at the top of the driving view shows a 16-point compass,
numeric heading, and terrain elevation in metres. North is the top of each
authored map (`-Z` in world coordinates). The altimeter reports the sampled
ground or riverbed elevation used by both rendering and collision, rather than
the car's suspension movement, so rough terrain does not make the reading
flicker.

## Play on an iPad

On the same Wi-Fi network, open **http://192.168.0.94:5173/** in Safari.
This is the Mac's LAN address at setup time; it may change after reconnecting.
Vite also prints its current Network URL when started. On a Mac using `en0`
for Wi-Fi, `ipconfig getifaddr en0` reports that interface's address.

**Network status at delivery (2026-09-07):** the Mac's IPv4 loopback URL
responds with HTTP 200 and the server listens on `0.0.0.0:5173`. LAN requests
worked earlier but were reset during the final check. The same failure occurred
with a temporary independent Node HTTP server, before a request reached its
handler, so this is not specific to Vite or the game. The exact network cause
is unknown; access from a physical iPad is not yet confirmed.

Do not use `localhost` or `127.0.0.1` on the iPad: those refer to the iPad itself.
If the LAN URL does not load, check that the Mac server is still running,
both devices are on the same network, and the Mac firewall permits Node's
incoming connection. Guest Wi-Fi/client isolation and corporate VPNs or
proxies can block local traffic. There is no need to disable the firewall
or publish the game to the internet. For a local shell health check bypassing
corporate proxies:

```sh
curl --noproxy '*' --fail http://192.168.0.94:5173/
```

Landscape is recommended; portrait works too. Fullscreen is not required.
Use current Safari/iPadOS with WebGL 2 support; the build targets Safari 16+.
**Physical iPad compatibility and sustained 30 FPS remain to be confirmed on
the user's actual device. Desktop WebKit and touch emulation are not device
acceptance.**

## Controls

| Action | Touch | Keyboard |
| --- | --- | --- |
| Steer | Drag the left horizontal pad | A / D or Left / Right |
| Forward | Hold the orange forward pedal | W or Up |
| Reverse | Hold the cream reverse pedal | S or Down |
| Brake | Hold both pedals, or the opposite direction while moving | Up + Down or W + S |
| Reset upright at the nearest regional start | Reset car | R |
| Pause | Pause button | Escape |
| Resume | Keep roaming | Focus the button and press Enter |

Steering and throttle can be held simultaneously with independent thumbs.
The steering pad springs to center on release, including release outside the
pad. Changing direction brakes first; releasing both pedals coasts to a stop.
Control input clears on cancellation, focus loss, rotation/resize, or
backgrounding. Returning from another tab leaves the game paused until
**Keep roaming** is pressed, preventing unintended movement.

If the car gets wedged or rolls over, **Reset car** clears its motion and
returns it to the nearest established regional start in Northern Reach, including
unvisited starts. Other worlds use their original starting area. A brief message
names the destination; regional resets cost journey progress without returning
you across the whole world. Tree trunks/canopies, boulders, ramps,
signposts/boards, and the visible sandstone perimeter are solid. Tiny flowers,
painted ramp stripes, and distant scenery are decorative.

## Production build

```sh
npm run build
npm run preview -- --port 4173 --strictPort
```

The static site is in `dist/`. Preview at `http://127.0.0.1:4173/` (or the
Mac's LAN address on port 4173). Relative asset paths also support hosting
under a subdirectory. An authorized static HTTPS host can serve `dist/`;
no backend or special headers are required. Opening `index.html` directly
with `file://` is not supported. Push an approved `main` revision to trigger
the configured GitHub Pages deployment.

Rapier's WebAssembly is embedded in its compatibility bundle, so its production
JavaScript chunk is about 2.24 MB before compression (roughly 835 KB gzipped).
Vite's large-chunk notice is expected. Enable normal gzip/Brotli on a chosen
static host. A harmless upstream Rapier initialization deprecation warning may
appear in development; the public `RAPIER.init()` API is used.

## Checks

Choose tests by the change while working. A recent local run took about four
minutes for all unit tests, 22 minutes for the full Chromium and WebKit browser
suite, and 20 seconds for PWA tests. Times vary by machine. Routine Mars commits
and pushes use focused checks; they do not trigger the full suites by themselves.

| When | Checks |
| --- | --- |
| Documentation only | No automated tests. |
| Code edit or small fix | `npm run typecheck`, unit tests for changed behavior when applicable, and `npm run build` before calling it ready. |
| Mars visual-only change | Inspect a game capture and run its focused browser case in Chromium; add WebKit if rendering may differ. |
| Gameplay, terrain, routes, collisions, or controls | Relevant real-driving unit and browser cases; run the affected browser cases in both engines at the completed-region gate. |
| Startup, storage, caching, or offline change | Affected browser cases plus `npm run test:pwa`. |
| Every three completed post-pilot Mars regions, broad shared-system change, or public release | Full unit and browser suites; include PWA before release. |

For example, test a navigation change without running every terrain simulation:

```sh
node --import tsx --test tests/navigation.test.ts
./node_modules/.bin/playwright test tests/browser/game.spec.ts -g 'compass follows'
```

Playwright runs both configured browser projects unless `--project` is given.
Use `--project=chromium-tablet` for quick visual iteration. Check WebKit when
rendering or platform behavior could differ, and check both engines for the
affected scenarios before finishing each Mars region. The full checks are:

```sh
npm run typecheck
npm test
npm run build
./node_modules/.bin/playwright install chromium webkit
npm run test:browser
npm run test:pwa
```

The browser suite starts its own local server when one is not already running.
Run browser and PWA suites sequentially: both write to Playwright's default
`test-results` directory, and parallel runs can delete each other's traces.
When a long browser run fails, repeat the affected spec alone and compare it
with `main` before changing game behavior or loosening an assertion.
Physics tests use actual Rapier bodies, terrain and raycast wheels, not mocks.
They cover acceleration, four-wheel drive, steering, braking/reverse, speed
caps, reset, collision boundaries, exact terrain triangle heights, access to
all three ramp placements, and camera obstruction sweeps. Input and fixed-clock
tests cover independent pointers, deadzones, release, and capped catch-up.
Area-lifecycle tests cover area-specific reset positions and disposal of shared
graphics resources. Northern Reach tests cover deterministic generation,
bit-identical chunk seams, worker errors, delayed streaming, collider retention,
bounded render/physics rings, offline worker caching, and cross-browser seam
driving. Iceland coverage exercises the actual riverbeds and
region switching, including returning to the original valley. Each ford is
driven in both directions in the physics suite; browser tests cross all three
fords and drive up the glacier and volcano flank with camera-clearance checks.

Browser coverage includes real rendering/driving in Chromium and WebKit,
portrait/landscape layouts, pause/resume, error presentation, and the actual
world's ramps and camera clearance. Chromium's CDP injects genuine two-contact
touch input to exercise capture, independent release, and cancellation.
That single multitouch test is deliberately skipped in WebKit because
Playwright's WebKit API does not expose equivalent multi-contact injection.
The PWA offline-reload test is also skipped in WebKit because this Playwright
setup cannot navigate after `context.setOffline(true)`; the manifest and cache
readiness test still runs there. A skip is a gap in automated coverage, not a
passing result for the missing behavior.

On-device acceptance: load over Wi-Fi in Safari; hold steering + forward,
then steering + reverse; release outside each control; rotate; switch apps and
resume; launch and reload after going offline; climb all three ramps; hit a
rock and the perimeter; reset after a
rollover; and check sustained frame rate during several minutes of driving.
The goal is 60 FPS, with a minimum of 30 FPS on the agreed iPad.

## Implementation

| File | Responsibility |
| --- | --- |
| `src/main.ts` | Initialization, readable errors, render loop, resizing, pause/resume, adaptive quality |
| `src/game/terrain.ts` | Deterministic sampled hills/trails, flat ramp pads and safe start |
| `src/game/world.ts` | Terrain mesh/collider, matching prop hulls, ramps, scenery |
| `src/game/highlands.ts`, `src/game/highlands-terrain.ts` | Larger Iceland landscape, volcanoes, glaciers, rivers and marked fords |
| `src/game/northern-terrain.ts` | Pure deterministic Northern Reach geography, water, routes, surfaces, props, and exact sampled heights |
| `src/game/northern-worker.ts`, `src/game/northern-streaming.ts` | ES-module generation worker and bounded Three.js/Rapier chunk lifecycle |
| `src/game/areas.ts`, `src/game/dispose.ts` | Area definitions and graphics-resource cleanup when travelling |
| `src/game/terrain-effects.ts` | Lightweight pooled wheel spray, dust, snow, and terrain particles |
| `src/game/vehicle.ts` | Four driven raycast wheels, suspension, low-mass roof, visuals and reset |
| `src/game/driving.ts` | Direction-change braking, speed targets, steering mapping, fixed clock |
| `src/game/input.ts` | Independent pointer and keyboard state |
| `src/game/camera.ts` | Smoothed level-heading follow camera and sphere-sweep collision |
| `src/ui/controls.ts`, `src/styles.css` | Safe-area-aware tablet controls and visual presentation |

Physics runs at 60 Hz with at most five catch-up steps and interpolated vehicle
poses. Terrain rendering and collision share identical vertex/index arrays.
Rocks and solid scenery use hulls derived from the displayed geometry. Trees,
rocks, flowers and clouds are instanced; static car parts are batched by
material. Pixel ratio is capped at 1.5, with a single 1024-pixel shadow map.
Sustained slow frames reduce pixel ratio to 1 and turn off shadows. Shadows
follow the car instead of covering the whole map.

Development builds expose `window.__ROAMER__` for reproducible behavioral
inspection, snapshots, and test positioning. Production builds omit this hook.
The app intentionally has no saved journeys, infinite terrain, multiplayer,
realistic drivetrain/damage, or native app packaging.

## Samurai Village

Choose **Samurai Village** in Explore, or open `?area=samurai-village`. This
240 × 240 metre garden has intersecting village lanes, timber and plaster
houses with tiled roofs, hanging red lanterns, and cherry trees. The central
path passes through a bamboo forest to an old Japanese temple. To the east,
a torii stands in a shallow lake with a solid, gently sloping bed; the car can
drive through the water and under the gate. Houses, bamboo trunks, gate posts
and visible perimeter walls have colliders. Repeated scenery is instanced.

A wooden bridge with red railings crosses the southern part of the village
lake, 20 metres from the torii. Gentle ramps connect both banks, leaving
the gate and its water approach clear.

## Northern Reach · River Valley pilot

The lake outlet now includes an authored region spanning several streamed chunks:
**Willow Ford**, **Cairn Ford**, shallow river shelves, small ridges, a hollow,
framing groves, rock outcrops and a looping dirt trail. Amber posts mark broad
wheel-deep crossings; stone cairns mark the ridge route. Deeper water remains
between the crossings. From the usual spawn, follow Lake Road, then Coast Road
west; the River Valley sign near `(-207, 322)` marks the turn north.

For a short visit, open `?area=northern-reach&start=river-valley`. This starts
south of Willow Ford. Reset uses the nearest regional start as you explore. Choosing
another area clears the special starting point.

`src/game/northern-valley.ts` defines the authored geography independently of
chunk ownership. The existing deterministic generator incorporates the region
into terrain, trails, props and water. The river has a continuous longitudinal
profile, broad bank transitions and two flattened crossing beds. Within the
pilot, water classification and shoreline clipping use the actual sampled
collision surface. The 2.4 m global terrain lattice and 5×5 render / 3×3 physics
rings are retained; no extra network assets or whole-world geometry are loaded.
Signs and authored props are owned by one chunk and released with it.

Validation includes sampled bank and trail grades, both fords driven in both
directions with actual Rapier wheels, browser streaming crossings, and the
existing terrain seam / resource lifecycle suite. This is one pilot region;
the rest of Northern Reach retains its previous geography.

## Northern Reach · Willow Marsh

Take River Valley's ridge loop north to `(-270, 115)` and follow the
**Willow Marsh** sign. The dry hummock loop winds between willow groves and
two reed-fringed pools. **Reed Ford** cuts across the eastern pool between
amber posts, with a broad shallow bed and gradual approaches on both sides.
The western branch climbs to **Heron lookout**, overlooking the smaller pool.

Start directly at `http://127.0.0.1:5173/?area=northern-reach&start=willow-marsh`,
or append `?area=northern-reach&start=willow-marsh` to the published game's URL.
The entrance clearing is a regional reset point. Stay between the ford posts:
the open pools are deeper than the marked crossing.

`src/game/northern-marsh.ts` authors the region within `x = -430..-145`,
`z = -235..135`. Water clipping and wheel depth use the same sampled terrain
as the collision mesh. Tests cover dry routes, shallow ford width, both
driving directions, water triangles, chunk seams and the existing valley.

## Northern Reach · Ember Basin

Follow **Upland Road** to its eastern end and the **Ember Basin** signs. An
ochre trail circles an extinct caldera, with a winding descent into its soft
ash floor. Basalt columns stand on the inner slopes and eastern flank. A
northern spur reaches **Ashen overlook**, with a level turnout facing back
toward the crater. Moss patches soften the southern scree.

Start directly at `http://127.0.0.1:5173/?area=northern-reach&start=ember-basin`,
or append `?area=northern-reach&start=ember-basin` to the published game's URL.
The caldera entrance is a regional reset point. The longer ash descent is graded for
the reduced traction, so the car can climb back out along the same trail.

`src/game/northern-ember.ts` defines the region within `x = 480..710`,
`z = 285..580`, blending east of Upland Road's endpoint `(505, 445)`.
The crater, routes and lookouts share the streamed terrain/collision lattice;
basalt columns use matching solid colliders and stay clear of the trails.
Tests drive all routes in both directions and check grades, surface handling,
chunk seams, browser driving and reset.

## Northern Reach · Western Shores

Three areas complete the western coastal routes:

- **River Mouth** (`?area=northern-reach&start=river-mouth`): low estuary banks
  lead to two sandy spits, with reeds, timber and an open outflow between them.
- **Outer Headlands** (`?area=northern-reach&start=outer-headlands`): continue
  north from Boulder Shoals along a rolling ridge or a lower cove beach trail.
- **Driftwood Strand** (`?area=northern-reach&start=driftwood-strand`): descend
  south from Fjord Coast through dunes and return along the inland ridge.

The western terrain wall is removed for `|z| <= 655 m`, blending back into the
land boundaries at the far corners. Sea continues through the streamed apron
and into a two-triangle ocean mesh that fades in the existing fog. Deep water
stalls the car; a physics-only stop beyond the nominal map prevents escape
from the available chunks. Both resources are removed when leaving the area.

`src/game/northern-west.ts` authors the coast, trails and landmarks. Tests cover
existing connections, river-mouth continuity, coastal water, open-sea geometry,
boundary collision, disposal and browser driving.

## Northern Reach · Great Lake and Alder River

The central lake now sits at 8 m in a lowland basin, with scalloped coves,
a willow island, shallow shelves and an eastern/southern shore trail.
Start at `?area=northern-reach&start=great-lake`.

The mountain inlet follows a meandering valley, with a steeper upper reach
and a nearly level lower river. Two marked gravel fords join a rolling bank
trail. Start at `?area=northern-reach&start=alder-river`. Reeds, willows and
driftwood follow the new shorelines. The outlet descends from the lowered lake
to the sea; River Valley's existing fords and dry ridge links are regraded.

`src/game/northern-watershed.ts` defines the shoreline, island, inlet, water
profiles, trails and vegetation. Water rendering and physics use the same
sampled terrain everywhere. Banks rise above water before their terrain blend
ends, preventing disconnected water edges. Tests check flow continuity,
shallow shelves, ford depths, water-to-bank contact, driving and browser resets.

## Northern Reach · Windstone Ridge and Ochre Terraces

**Windstone Ridge** (`?area=northern-reach&start=windstone-ridge`) connects to
Stonegate Basin's eastern rim. Climb the saddle, drive beneath a weathered
stone arch, then follow the rolling crest to the northern lookout. Layered
outcrops frame the ridge and the return trail drops into its sheltered flank.

**Ochre Terraces** (`?area=northern-reach&start=ochre-terraces`) branches east
from Mountain Road. A winding circuit climbs stone shelves and descends around
the mesa. The inner traverse offers a broad, irregular rock ramp to crawl over.

Major formations use custom geometry: eroded strata with offset ledges, a low
radial rock ramp and a beveled arch with an open passage. Static triangle
colliders match their visible faces, including the arch opening and rock
recesses. Tests drive the trails both ways, check wheel contact on obstacles,
and verify that the arch's passage and overhead stone behave correctly.

## Northern Reach · Timber Run, Boulder Shoals and Stonegate Basin

[Northern Reach regional overview (October 2026, PNG)](artifacts/northern-reach/mapa-northern-reach.png)
shows all sixteen enhanced regions, with the updated River Valley and three western shore areas
highlighted in amber. The [River Valley close-up](artifacts/northern-reach/mapa-river-valley.png)
shows the two fords, rock branch, and dry or muddy return lines. Both maps have SVG sources.
Regenerate the maps from the game's terrain with
`node --import tsx scripts/render-northern-map.ts` (requires Playwright Chromium).

Three connected driving playgrounds extend the authored terrain:

- **Timber Run** (`?area=northern-reach&start=timber-run`): south of Coast Road,
  a pine-lined gully has two fallen trunks to drive over and a hillside bypass.
- **Boulder Shoals** (`?area=northern-reach&start=boulder-shoals`): west of Willow
  Marsh, a shallow inlet offers low climbable rocks among tall sea stacks,
  with a dry beach route alongside it.
- **Stonegate Basin** (`?area=northern-reach&start=stonegate-basin`): a pass north
  of Willow Marsh opens into an enclosed highland bowl, a stone garden and
  a rising rim trail with a lookout back through the entrance. The north crown
  now forks into a rock shelf and an easier bend, both reaching the lookout.

For a longer unscored drive, start at Willow Marsh
(`?area=northern-reach&start=willow-marsh`). A visible muddy patch appears near
the start of the dry hummock loop. Choose that loop or the marked Reed Ford,
then follow Heron lookout through the hidden pass to
Stonegate Basin. A short muddy patch and the stone-shelf climb make the surface
changes part of the route. Signs and the terrain show the choices; either line
can be bypassed or explored in reverse.

Append these query strings to the local or published game URL. The regional starting point is
at each region's dry starting clearing. `src/game/northern-adventures.ts`
contains their layouts, blended terrain and authored obstacles. They use the
existing chunk streaming and shared render/collision lattice. Tests drive every
trail in both directions and verify that the wheels actually climb the logs
and shallow-water rocks, as well as checking water, grades and browser resets.

## Northern Reach · High Pass

Continue to the end of **Mountain Road** in the northeast, then follow the
**High Pass** signs. The **Twin Peaks circuit** winds between two snow-covered
summits and granite outcrops. Stone cairns mark the bends. A northern spur
climbs to a level lookout at 140 m, while **Blue Hollow** descends into a
sheltered ice basin with reduced traction.

Start directly at `http://127.0.0.1:5173/?area=northern-reach&start=high-pass`.
The level turnout at this entrance is a regional reset point. In Codespaces or on
GitHub Pages, append `?area=northern-reach&start=high-pass` to the game's URL.

`src/game/northern-pass.ts` defines the region within `x = 475..695`,
`z = -660..-350`. Graded trails, frozen ground and clearings use the same
global mesh for rendering and collision. The established Mountain Road
connects to the circuit at `(500, -430)`; the western meltwater stream remains
outside this region. Automated tests drive each route in both directions,
check road grades and seams, and exercise the lookout, ice and reset in both
Chromium and WebKit.

## Northern Reach · Fjord Coast

Follow Coast Road west past River Valley to the **Fjord Coast** signs. The
clifftop trail connects to a beach loop with two graded ramps, a sheltered
pebble cove, offshore sea stacks and driftwood. A broad shallow shelf makes
the waterline approachable before the seabed drops into deeper water.
Start directly on the cliff at `http://127.0.0.1:5173/?area=northern-reach&start=fjord-coast`.

`src/game/northern-coast.ts` authors this region within `x = -725..-435`,
`z = 255..550`. Trails, terrain and shoreline share the streamed collision
lattice; road clearance keeps rocks and logs out of driving routes. The
region blends into the existing Coast Road and leaves the river mouth intact.

## Northern Reach · Pine Hollow

The next authored region fills the southern forest west of Lake Road. From the
usual Northern Reach starting point, drive north a short way and follow the
**Pine Hollow** sign on the left. Its dirt loop runs through a dry, mossy ravine,
climbs to a level lake lookout, and returns through tall pine groves and rock
outcrops. A shorter route crosses the rock saddle. The northern connection joins
Coast Road, which continues west to River Valley.

The lookout is at `(-98, 375)`, the ravine follows approximately `x = -72` from
`z = 500` to `438`, and the region grades into its surroundings between
`x = -215..65` and `z = 330..595`. Reset chooses the nearest established regional start.
The existing lake, river-valley fords, main-road grades and starting clearing
are retained.

`src/game/northern-forest.ts` contains the region layout and relief. Trail grades
blend through bends to avoid sudden changes between segments. Layered pines,
signs and outcrops stream with their owning chunks; pine trunks and rock outcrops
are solid, while tree crowns remain decorative. Checks cover driving all three
routes with the real vehicle, trail slopes across their width, chunk seams,
landmark ownership, and browser driving through the ravine and up to the lookout.

## River Valley driving loop

Open `?area=northern-reach&start=river-valley` for a short exploratory visit.
Follow the sheltered approach into Willow Ford. On the north bank, the rock
branch bends west over three staggered low stones; the existing dirt trail
provides an easier climb. Both lead to the ridge and its open river-facing
turnout. Continue to Cairn Ford and return along the southern trail, where a
short muddy patch has a dry line alongside it. Every route works both ways.
Aim for a relaxed five-minute wander including stops and retries; there is no
clock or reward for finishing. The controls and basic handling are unchanged.

Across all areas, grounded tires leave temporary marks on dirt, mud, coastal
sand, and loose black sand. In
shallow water, the trailing wheels leave faint, short wakes while the spray
remains the main feedback. Tire marks have varied lengths and gaps, appearing
more often while turning or changing speed, with stronger marks during a turn, acceleration, or
braking. Marks are pooled (256 segments, 18-second lifetime); wakes are pooled
separately. Reset and travel clear both. Reduced graphics keep sparser marks
and fewer particles. These effects never deform
the ground.
Saved parking positions, a journal and accumulated dirt on the car are
left for a later update.

Manual acceptance for this update: on an actual iPad, drive both route choices,
check that the rocky branch rewards careful wheel placement and the ridge
reveals the crossings, then recover from deep coastal water. Verify two-thumb
controls, offline reload and at least 30 FPS.
Desktop browser checks do not establish these device results.
