# Little Roamer

An open-ended 3D toy 4WD playground with two places to explore: sunny hills in
**Sunshine Valley** and a much larger **Iceland Highlands** landscape of
volcanoes, black-sand deserts, old lava flows, glacier ice, and rivers.
No score, objectives, timers, accounts, audio, or downloads of external artwork.

Built with TypeScript, Vite, Three.js and Rapier. All meshes and trail-sign
textures are generated locally. Runtime requests stay on the game server.

## Install on iPad for offline play

Little Roamer is an installable PWA. The production build precaches the game,
both areas, Rapier physics, icons, and generated styling for offline use.

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

GitHub Pages, Cloudflare Pages, Netlify, or an internal HTTPS static host can
serve `dist/`; no backend is required. No deployment destination is configured
by this project. After a new version is published, opening the installed app
online downloads it in the background. An **Update game** button appears when
the new offline version is ready, avoiding a forced reload while driving.

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

Use the **Explore** area picker in the top bar to switch between Sunshine
Valley and Iceland Highlands. The valley and its three ramps are still
available unchanged. Each area opens with a welcome card; press **Let's take
a drive** when ready. Switching areas clears held controls and returns the
car to that area's safe starting point. **Reset car** stays in your current area.
Only one area's terrain and physics stay loaded, and graphics resources from
the old area are released.

Direct links:

- Sunshine Valley: `http://127.0.0.1:5173/?area=valley`
- Iceland Highlands: `http://127.0.0.1:5173/?area=highlands`

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
| Glacier ice | Keeps momentum but turns and brakes slowly over imperfect ice, with light powder |
| Glacial river | Very slow, with depth-scaled drag, rocky-bed suspension shake, and bright spray |

Each grounded raycast wheel uses the surface directly beneath it, so straddling
ice, ash, or dirt creates stable mixed traction. Vehicle-wide power, drag,
speed, and suspension blend over a fraction of a second instead of snapping at
terrain boundaries. The surface chip briefly shows a trait such as **Slippery**
or **Rocky & rough**, while restrained camera feedback makes roughness readable
without inheriting the car's roll or bypassing collision avoidance.

Marked fords remain shallow and passable. Beyond roughly 0.65 metres, water
resistance rises nonlinearly and engine power fades; pools around one metre deep
stall the car instead of allowing an unmarked crossing. Back out before the
water becomes too deep, or use **Reset car** if the engine is fully submerged.

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
| Reset upright at the clearing | Reset car | R |
| Pause | Pause button | Escape |
| Resume | Keep roaming | Focus the button and press Enter |

Steering and throttle can be held simultaneously with independent thumbs.
The steering pad springs to center on release, including release outside the
pad. Changing direction brakes first; releasing both pedals coasts to a stop.
Control input clears on cancellation, focus loss, rotation/resize, or
backgrounding. Returning from another tab leaves the game paused until
**Keep roaming** is pressed, preventing unintended movement.

If the car gets wedged or rolls over, **Reset car** clears its motion and
returns it to the starting area. Tree trunks/canopies, boulders, ramps,
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
with `file://` is not supported. No public deployment is configured.

Rapier's WebAssembly is embedded in its compatibility bundle, so its production
JavaScript chunk is about 2.24 MB before compression (roughly 835 KB gzipped).
Vite's large-chunk notice is expected. Enable normal gzip/Brotli on a chosen
static host. A harmless upstream Rapier initialization deprecation warning may
appear in development; the public `RAPIER.init()` API is used.

## Checks

```sh
npm run typecheck
npm test
npx playwright install chromium webkit
npm run test:browser
```

The browser suite starts its own local server when one is not already running.
Physics tests use actual Rapier bodies, terrain and raycast wheels, not mocks.
They cover acceleration, four-wheel drive, steering, braking/reverse, speed
caps, reset, collision boundaries, exact terrain triangle heights, access to
all three ramp placements, and camera obstruction sweeps. Input and fixed-clock
tests cover independent pointers, deadzones, release, and capped catch-up.
Area-lifecycle tests cover area-specific reset positions and disposal of shared
graphics resources. Iceland coverage exercises the actual riverbeds and
region switching, including returning to the original valley. Each ford is
driven in both directions in the physics suite; browser tests cross all three
fords and drive up the glacier and volcano flank with camera-clearance checks.

Browser coverage includes real rendering/driving in Chromium and WebKit,
portrait/landscape layouts, pause/resume, error presentation, and the actual
world's ramps and camera clearance. Chromium's CDP injects genuine two-contact
touch input to exercise capture, independent release, and cancellation.
That single multitouch test is deliberately skipped in WebKit because
Playwright's WebKit API does not expose equivalent multi-contact injection.

On-device acceptance: load over Wi-Fi in Safari; hold steering + forward,
then steering + reverse; release outside each control; rotate; switch apps and
resume; climb all three ramps; hit a rock and the perimeter; reset after a
rollover; and check sustained frame rate during several minutes of driving.
The goal is 60 FPS, with a minimum of 30 FPS on the agreed iPad.

## Implementation

| File | Responsibility |
| --- | --- |
| `src/main.ts` | Initialization, readable errors, render loop, resizing, pause/resume, adaptive quality |
| `src/game/terrain.ts` | Deterministic sampled hills/trails, flat ramp pads and safe start |
| `src/game/world.ts` | Terrain mesh/collider, matching prop hulls, ramps, scenery |
| `src/game/highlands.ts`, `src/game/highlands-terrain.ts` | Larger Iceland landscape, volcanoes, glaciers, rivers and marked fords |
| `src/game/areas.ts`, `src/game/dispose.ts` | Area definitions and graphics-resource cleanup when travelling |
| `src/game/water-effects.ts` | Lightweight instanced wheel spray on river crossings |
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
The app intentionally has no saving, offline/PWA mode, infinite terrain,
multiplayer, realistic drivetrain/damage, or native app packaging.
