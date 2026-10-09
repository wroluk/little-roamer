# Glassfall Plain — region card

A low ivory impact fan contrasts with Dish Ridge's red terraces. Three charcoal melt ribbons spread southwest from a fractured scar. The safe circuit stays firm; the flow field is unmarked and freely driveable, with no crossing road.

| Feature | Placement and purpose |
| --- | --- |
| Western reset | (426.05, -109.75), 8 m; arrival from Dish Ridge and Habitat Seven. |
| Firm circuit | Broad loop outside the intact flow footprints, rising gently to 12 m on the eastern edge. The western/southern arc was moved outward so roads no longer cut pale lanes through the glass. Connects north to Dish and south toward Iron Maze. |
| Impact scar | (552.2, -69.15); a broken raised lip surrounds a shallow floor and six clustered black impact rocks. A shared 14.5 m-radius melt pool beneath them connects continuously to all three flows. The southwest breach points into the glass fan. |
| Three solid melt flows | Continuous raised ribbons without sand-filled plate fractures. Rounded 1.8 m shoulders meet gently undulating 31–45 cm interiors; visible geometry supplies matching collision. |
| Off-road exploration | No graded or colored crossing through the flows. Natural dust separates the ribbons, with beveled glass edges that the Scout can traverse. Trail posts are absent throughout the wild region. |
| High eastern lookout | (598.6, -137.3), 18 m; a broad supporting shoulder overlooks the enlarged fan. |
| Secondary landmarks | Split pale shield slabs against the eastern boundary, low radial ejecta plates, and a paired stone threshold at the west arrival. |
| Outpost spoke | A firm diagonal road joins the existing habitat courtyard. |
| Southern exit | (520.3, 141.1), 9 m; leads through a winding sediment wash and around the screening ridge into Iron Maze. |

## Geometry and review gate

Seat glass slab edges on the actual terrain triangles, with gently beveled approaches and matching collision. Ground every slab across its footprint and keep the circuit clear. Verify exact seams, grade samples, reset flatness, material/traction agreement and streaming disposal. Drive all new routes both ways with the Scout and compare lateral grip on glass against packed regolith. Review arrival, impact scar, crossing, eastern framing and overlook captures; save a map of the actual field. Finish this region before starting Iron Maze.

## Review

Preview locally: `http://127.0.0.1:5173/?area=mars&start=glassfall-plain`.

- [Actual terrain and routes](glassfall-plain-map.svg)
- [Arrival](glassfall-review/arrival.png)
- [Impact scar](glassfall-review/impact-scar.png)
- [Glass crossing](glassfall-review/glass-crossing.png)
- [Eastern shields](glassfall-review/eastern-shields.png)
- [Lookout](glassfall-review/lookout.png)
- Equivalent WebKit views are in `glassfall-review/webkit/`.

The glass uses continuous lava-like raised black flows with rounded edges and subdued highlights, without gray streaks. Sand-filled plate fractures and roadside shard clusters have been removed. Lower lateral grip creates a sliding challenge, with a firm perimeter alternative. No vehicle physics algorithms were changed.

The expanded terrain is 1.45 times wider, centred at (500, -30), while roads and rocks retain their scale. Following feedback, the northern approach is low and open, with a broader transition into pale ground and 55–220 m haze. The added screening peaks are gone. Glass uses a uniform 1.2 m clipped lattice, avoiding adaptive-mesh cracks and keeping the whole field below 18,000 triangles; rendering and collision share it. The user approved the quieter landscape; latest changes remove the crossing and trail posts, increase haze and reduce repeated terrain sampling. See `wild-terrain-review/` for current close/approach views in both engines. The original captures, terrain map and regional browser evidence below are historical, not validation of the latest layout.

### Verification

Typecheck and production build passed. All six authored routes pass actual Scout driving in both directions, including their existing Habitat and Dish junctions. Focused checks cover terrain seams, reset grades, glass/traction alignment, streaming and cleanup. Chromium and WebKit each pass presentation/reset, the complete firm loop and the glass crossing out and back. Saved completed drives: [firm circuit](glassfall-review/firm-drive.png) and [crossing](glassfall-review/crossing-drive.png).

Sequential PWA verification: five checks passed; the existing WebKit offline-reload skip remains manual iPad acceptance. Full unrelated suites were deferred under the focused Mars testing policy. Stop before Iron Maze for user review.
