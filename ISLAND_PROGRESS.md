# Island implementation progress

Read [plan](ISLAND_BUILD_PLAN.md), [design](artifacts/island/DESIGN.md) and
[world-building guide](WORLD_BUILD_GUIDE.md) before extending.

## Connected pilot ready for review — 2026-10-26

- User approved beach → jungle climb → aqueduct → beach, optional rough
  shortcuts, and development-only availability until acceptance.
- Implementing one compact, resident landscape with a real lower underpass and
  upper crossing, fitted sea, grounded batched vegetation, three starts and
  nearest-region recovery. Existing unrelated Mars changes are preserved.
- References: Moon resident pilot and exact Float32 sampling, Highlands clipped
  water, Iceland positional noise, Mars real-car driving harness. Adaptation:
  one full compact terrain collider rather than streaming a 3 x 3 core.
- Corrected the first terrain pass after actual-game review: broad southern
  beach shelf instead of a narrow cut through generic high ground; descending
  eastern shoulder and a canopy opening so the ocean overlook really sees the
  water. Camera poses are checked above sampled terrain before review captures.
- First mesh budget failed at 401,588 triangles. Retained one detailed canopy
  lobe per tree, reduced secondary lobes, and replaced cylindrical buttress
  roots with solid wedges. Current world geometry is 282,964 triangles in
  material batches, with 10 colliders and no per-frame generation.
- The coastal revision exposed an authored cairn in the east return line:
  both unit forward drives stopped at the same coordinates. Applied the same
  route-exclusion contract to authored markers and added a final vertex check
  for every solid tree/root/rock/cairn batch. All four complete real-car unit
  drives and both shortcut directions now pass without changing physics.
- The initial partial browser run was intentionally stopped after its visual
  case to correct that obstruction; it is not counted as a completed suite.
- Typecheck, production build and 12 focused units currently pass, including
  local righting underneath the bridge without teleporting to its deck.
  Final dual-engine browser run passed all 6 scenarios (12.6 minutes), including
  complete circuits both directions in Chromium and WebKit. WebKit's actual
  arch-arrival and ocean-overlook captures were inspected alongside Chromium.
  Production/PWA exclusion now passes in both engines alongside the comparison
  pilots. The full PWA run passed 22 other scenarios with four existing WebKit
  offline skips; after isolating comparison checks per fresh browser context,
  all 10 targeted comparison PWA cases also passed. See
  [comparison evidence](LOCATION_DEMOS.md) for the exact run scope.
- User acceptance is pending. No claims of completed-world, visual
  acceptance, physical-iPad performance or offline acceptance.
- Next: user comparison with the five other location pilots; physical iPad
  performance, simultaneous touch and offline acceptance remain open.
