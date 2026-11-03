# Carry forward world-building experience

Before adding or refining any location, read [WORLD_BUILD_GUIDE.md](WORLD_BUILD_GUIDE.md)
and the current world's plan, design and latest progress entry. The guide links
proven Northern Reach, Iceland Highlands and Mars implementations and records
failed approaches that must not be repeated without a specific reason.

World records live in `artifacts/<world>/BUILD_PLAN.md` and `PROGRESS.md`,
beside `DESIGN.md` when one exists and the world's evidence. Use these paths
rather than recreating prefixed plan/progress files at the repository root.

- Before implementing a feature, inspect its closest existing implementation and
  relevant tests. Record which reference you used and any necessary adaptation.
- Carry forward the whole technique: terrain/render/collision agreement, fitted
  water, grounded and varied details, route clearance, streaming and disposal.
- Compare actual game captures from driving height and the reported problem angle;
  passing tests or an overhead map alone do not establish visual quality.
- Add transferable lessons to `WORLD_BUILD_GUIDE.md` and current results/remaining
  work to the world's progress file before ending a session. Preserve user images.
- Follow the user's latest scope and authorization. Existing preferences persist;
  do not add a new approval step just because this guide is required reading.

  ## Continuing Island Tracks work

  Read `artifacts/island-tracks/BUILD_PLAN.md` and `artifacts/island-tracks/PROGRESS.md`.
  These describe `?area=tidal-islands`; the tropical Island and old causeway
  comparison are separate. Keep comparison history in `LOCATION_DEMOS.md`.

## Continuing Iceland work

Read `artifacts/iceland/BUILD_PLAN.md`, `artifacts/iceland/PROGRESS.md`, and
`artifacts/iceland/DESIGN.md` alongside the shared guide. Skógafoss includes the
cliff top, upstream river, plunge pool and downstream Skógá through the bridge,
ford and sea outlet. Do not treat only the waterfall effect as the completed slice.
The world remains an internal development entry until its agreed release gate.

# Test strategy for future sessions

Use the [Checks](README.md#checks) section of the README for commands and test coverage.

- Default to change-focused checks for Mars iterations. Run `npm run typecheck` for code edits, unit tests for changed behavior when applicable, and `npm run build` before calling a code change ready. Documentation-only edits need no automated tests. Do not run unrelated long suites merely because a change is committed or pushed.
- For visual-only Mars changes, inspect an actual game capture and run the affected browser scenario in Chromium. Add WebKit when rendering or platform behavior could differ. For terrain, routes, handling, collisions, or controls, use the relevant real-driving unit and browser scenarios; check both Chromium and WebKit at a completed region gate.
- Run `npm run test:pwa` when startup, caching, storage, or offline behavior changes, and before public release. Keep browser and PWA suites sequential because both use Playwright's default `test-results` directory.
- Run the full unit and browser suites after each block of three completed post-pilot Mars regions, after broad shared-system changes that could affect other worlds, before a public release, or when the user requests them. At each completed region, run its affected unit and browser scenarios in both engines. Record the last full-suite run and any skipped coverage in `artifacts/mars/PROGRESS.md`.
- Reproduce a failed long-running browser scenario alone and compare it with `main` before changing game physics or weakening an assertion. Do not treat a skipped test as passed.
- WebKit's automated two-contact touch and offline-reload scenarios are currently skipped. Keep the corresponding iPad Safari checks in manual acceptance until those gaps are automated.

## Continuing Mars work

Read `artifacts/mars/BUILD_PLAN.md`, `artifacts/mars/PROGRESS.md`, and `artifacts/mars/DESIGN.md` before changing Mars. Check the recorded milestone against the actual code and test evidence. Update `artifacts/mars/PROGRESS.md` with completed work, test outcomes, unresolved issues, and the exact next step before ending a session. Follow the user's latest scope; a later region should not be marked complete based on generated terrain alone.
