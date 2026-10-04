# Test strategy for future sessions

Use the [Checks](README.md#checks) section of the README for commands and test coverage.

- During implementation, run `npm run typecheck` and the unit or Playwright specs relevant to the changed code. Prefer real driving tests for changes to handling, terrain, routes, or controls.
- Before calling a feature ready, run `npm run build`, affected unit tests, and affected browser scenarios in both Chromium and WebKit when browser behavior matters. Run `npm run test:pwa` for changes to startup, caching, storage, or offline behavior.
- Run the full unit and browser suites before merging substantial gameplay or world changes, before a release, or when the user requests them. Small isolated changes can use focused checks during development; keep a regular full-suite run to catch interactions.
- Run browser and PWA suites sequentially. Both use Playwright's default `test-results` directory, so parallel runs can delete each other's traces and cause false failures.
- Reproduce a failed long-running browser scenario alone and compare it with `main` before changing game physics or weakening an assertion. Do not treat a skipped test as passed.
- WebKit's automated two-contact touch and offline-reload scenarios are currently skipped. Keep the corresponding iPad Safari checks in manual acceptance until those gaps are automated.
