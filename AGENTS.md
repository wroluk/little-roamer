# Test strategy for future sessions

Use the [Checks](README.md#checks) section of the README for commands and test coverage.

- Default to change-focused checks for Mars iterations. Run `npm run typecheck` for code edits, unit tests for changed behavior when applicable, and `npm run build` before calling a code change ready. Documentation-only edits need no automated tests. Do not run unrelated long suites merely because a change is committed or pushed.
- For visual-only Mars changes, inspect an actual game capture and run the affected browser scenario in Chromium. Add WebKit when rendering or platform behavior could differ. For terrain, routes, handling, collisions, or controls, use the relevant real-driving unit and browser scenarios; check both Chromium and WebKit at a completed region gate.
- Run `npm run test:pwa` when startup, caching, storage, or offline behavior changes, and before public release. Keep browser and PWA suites sequential because both use Playwright's default `test-results` directory.
- Run the full unit and browser suites after each block of three completed post-pilot Mars regions, after broad shared-system changes that could affect other worlds, before a public release, or when the user requests them. At each completed region, run its affected unit and browser scenarios in both engines. Record the last full-suite run and any skipped coverage in `MARS_PROGRESS.md`.
- Reproduce a failed long-running browser scenario alone and compare it with `main` before changing game physics or weakening an assertion. Do not treat a skipped test as passed.
- WebKit's automated two-contact touch and offline-reload scenarios are currently skipped. Keep the corresponding iPad Safari checks in manual acceptance until those gaps are automated.

## Continuing Mars work

Read `MARS_BUILD_PLAN.md`, `MARS_PROGRESS.md`, and `artifacts/mars/DESIGN.md` before changing Mars. Check the recorded milestone against the actual code and test evidence. Update `MARS_PROGRESS.md` with completed work, test outcomes, unresolved issues, and the exact next step before ending a session. Follow the user's latest scope; a later region should not be marked complete based on generated terrain alone.
