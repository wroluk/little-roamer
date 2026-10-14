# Hidden shuttle replacement — 2026-10-14

Selected study F replaces the old cylindrical wreck at (-653, 265). The nose-down
shuttle retains its large fin, rudder, asymmetric stabilizers and three open engine
bells. It is seated 3 m deeper than the study version. Existing screening banks
were raised to conceal its taller silhouette. There are no temporary wrecks,
plaques, review controls or comparison URL hooks left in the game.

## Actual game captures

- [Reveal](reveal.png), [stern](stern.png), [side](side.png).
- [Connector track](connector.png), [perimeter track](perimeter.png): the shuttle is hidden by terrain in both views.

`capture.mjs` takes direct Chromium screenshots of the normal local game. It does
not use a test runner or execute driving scenarios. Typecheck and build passed.
Existing wreck tests were adapted for the shuttle and exterior approach, but no
tests were run. Full sightline coverage, driving and device acceptance remain
unverified. Previous hull-specific test results do not certify this replacement.

Review locally at http://127.0.0.1:5174/?area=mars&start=fossil-delta and explore
west toward the Delta/Dunes transition. The discovery remains unmarked.
