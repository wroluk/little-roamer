# Traction proving ground

## Plan and design

This is a development tool, not another public world. Use one vehicle model and
the existing controls; tune against repeatable drives rather than difficulty
modes. Do not commit or push this work without the user's instruction.

1. Build a compact, dev-only proving ground and record the unchanged vehicle.
2. Replace inferred wheelspin with contact/load-dependent tyre response and a
   shared longitudinal/lateral traction budget. Smooth boolean throttle without
   adding controls. Drive particles from the wheels actually slipping.
3. Compare identical trials, then check existing authored routes, both browser
   engines, driving-height captures and the shared-system regression suites.

Geometry: four measured climbs with level run-ups, a marked constant-radius arc
and slalom, a left/right split strip, and a cross-slope with a small unloading
bump. Surface selection must not rebuild or alter the geometry. Reset must give
the same position, heading and settled state.

References inspected: `vehicle.ts`, `driving.ts`, `surfaces.ts`,
`tests/surfaces.test.ts`, `terrain-effects.ts`, `ground-effects.ts`, the
development instrumentation in `main.ts`, Highlands browser climbs, and Moon's
matching render/collider ownership. Adaptation: a single small fixed triangle
mesh needs neither streamed chunks nor scenic decoration. No changes to Iceland
geometry, its checkout or its server are authorized.

## Progress

2026-10-30: Work started from a clean isolated worktree. Dependencies were absent;
the first typecheck reported `tsc: command not found`, then `npm ci` restored the
lockfile dependencies. No vehicle changes yet. Baseline and acceptance remain
open; the complete traction goal is not delivered by the proving ground alone.

### First stage delivered / physics prototype rejected

- Dev URL: `http://127.0.0.1:5174/?dev=traction`, optional
  `&start=grade-25&surface=sand`. Own server uses `--strictPort`; no other
  checkout/server was touched. No commits or pushes.
- One bounded 240 m square triangle mesh, shared with Rapier and the exact
  triangle sampler. Four 24 m long slopes (10/20/25/32 degrees), level run-ups,
  34 m usable ramp widths for oblique lines, a 15 m radius arc, six slalom
  markers, a split strip and a 15-degree traverse with a 0.34 m authored bump.
  Simple markers remain decorative and outside the intended wheel paths.
- Surface and left-strip selections repaint the existing mesh and change
  wheel classification, not collision/geometry. Straight/37-degree/reverse
  starts are repeatable. Oblique ramp starts are offset to keep the whole
  ascent on the measured face. Local righting is bypassed only in the lab.
- Development telemetry exposes actual contact, suspension force and tyre
  impulses, plus **visual RPM** and the explicitly labelled **legacy spin
  estimate**. No physical slip ratio or new drivetrain is claimed.
- Baseline: `artifacts/traction/baseline.json` contains 44 real-Vehicle
  trials on dirt/sand/mud/ice, including forward/reverse, steering reversal,
  run-up climbs, hill starts, same-speed braking, split grip and traverse
  coasting. It includes source hash, actual origins/endpoints, step counts,
  per-wheel minimum load, peak visual RPM, estimated spin and body-side speed.
  Seeds/geometry/inputs are deterministic; this is a headless fixed-step
  baseline, not an iPad performance or visual-acceptance claim.
- Existing model findings: ice reaches about 4.52 m/s body-side speed in the
  pad reversal trial while reporting zero wheel spin estimate. The same-speed
  braking trial travels about 0.85 m on dirt versus 4.10 m on ice. Dirt's
  settled hill-start trial rolls back to the toe and loses contact; this is
  recorded as a baseline limitation, not hidden or fixed by changing the track.
- A wheel-inertia/contact-impulse prototype was tried after recording the
  original behavior, then completely withdrawn. It left five existing surface
  checks failing: snow/ice stopping-distance separation, loose oblique climbs,
  firm-ground wheel rotation agreement, sudden ice countersteer and shallow
  ford progress (about 7.85 m versus the required >8 m). Early iterations also
  exposed a throttle-ramp/rollback trap: direction-change braking can suppress
  a held uphill command. The experiment is retained only in session artifacts,
  not active game code. No assertion was weakened or skipped.
- Shared driving behavior, surface profiles, wheel animation and terrain effects
  remain unchanged. The only retained Vehicle addition is a read-only telemetry
  getter. The module and panel are stripped from the production build; changing
  to a normal world removes the panel, clears the lab query and restores normal
  recovery/reset behavior.

Validation: typecheck, production build and absence-of-lab bundle check passed.
37 focused unit checks passed (surfaces, recovery, lab geometry and read-only
wheel telemetry). All 6 lab browser checks passed in Chromium/WebKit, including
an actual loose climb, offset oblique start and keyboard reset; the 14 existing
dual-engine recovery checks also passed. Two consecutive 44-trial baseline runs
were byte-identical. The runner reuses the live lab's surface callback, including
the split strip's longitudinal ends, rather than duplicating its classification.

Driving-height captures of slopes, arc, slalom, split grip, traverse and actual
loose-climb driving have been inspected. Evidence is under
`artifacts/traction/baseline-views/`; the two engine climb shots are taken during
real driving, not at an identical fixed simulation tick. The earlier floating
sign across the wheel path was moved onto a shoulder-mounted post. Initial
startup and lab reset both settle for 90 steps; the standalone measurement
protocol explicitly uses 100 settle steps.

**Remaining:** implement and validate the actual tyre model, smooth boolean
throttle and wheel-local sliding effects; tune under/oversteer and traverse
sliding without the old forced ice axle rule; compare against these measurements,
then drive authored routes and run full shared-system regression suites.
The full unit/browser suites and physical-iPad checks have not been run for this
stage because no shared physics change is retained.

**Next step at that handoff:** build small executable torque/load/brake contact tests before
rewiring Vehicle again. Keep Rapier's proven suspension/contact ownership and
its reference routes. Prove rolling-wheel angular agreement, airborne zero
traction, mixed-grip torque overflow, simultaneous braking/steering capacity,
and hill-start rollback behavior before replacing the current tire impulses.

### First retained drivetrain increment

The continuation keeps Rapier's raycasts, suspension, braking and lateral
controller rather than replacing all contact impulses at once.
References: the existing `driveForces`, real surface/Highlands/Northern log
regressions, and Rapier's raycast-controller friction implementation. Adaptation:
four inertial `WheelDrive` rotors propose drive impulses, consume the **actual**
bounded contact reaction, and feed their angular speed back into motor torque.

- Boolean throttle now rises exponentially with a 0.25 s time constant.
  Short taps deliver less torque than holding the pedal. Release and explicit
  braking cut motor torque immediately; controls/buttons are unchanged.
- Drive intent is latched while a pedal stays held, so rollback on a failed
  hill start does not turn the same command into alternating brake/drive.
  A new opposite command brakes until nearly stopped before building reverse
  torque. Both pedals still brake immediately. Reset clears this state.
- Powered wheel rotation comes from motor angular impulse minus measured ground
  reaction, not `18 * inferredSlopeSlip`. Low contact load caps transmitted
  force, excess torque accelerates that wheel, and its rim speed reduces further
  motor torque. Airborne wheels receive no ground impulse. A provisional drive
  impulse is offered even after a previous airborne raycast: Rapier's **fresh**
  raycast owns contact admission, avoiding a one-frame hole on touchdown.
- The same longitudinal/lateral ellipse bounds acceleration, braking and
  cornering, including Rapier's straight-line zero-side-impulse corner case.
  Telemetry reports the bounded impulses actually applied to the body, rotor
  angular speed, signed rim/contact slip speed, normalized absolute slip and
  each contact's lateral velocity. Ordinary rolling dust remains; extra slip
  debris is wheel-local, thrown opposite the actual rim slip, and cannot accrue
  emission debt while airborne.
- Existing uphill envelopes are retained as a transitional material capacity,
  using the chassis' averaged grade but the individual wheel's surface and load.
  This is **not** yet a slope-independent replacement tyre model. Motor/capacity
  calibration includes the added rotating mass so authored climbs retain their
  usable acceleration scale.

Problems found and corrected against actual routes:

- The first rotor calibration passed uniform slopes but failed the existing
  unsteered oblique Highlands glacier route. Compared the original `HEAD`
  Vehicle in memory, without switching or touching another checkout: original
  reached >34 m while the intermediate model turned back. Small yaw differences
  put the car on a steeper part of the ice. Keeping the averaged grade envelope
  and consistently accounting for rotating mass restored the unchanged route.
- Northern's scattered coastal log at Z625 exposed a real high-centering
  interaction: most weight rested on the hull, leaving little normal load on
  tyres. The old model crossed despite the controller's missing zero-side
  saturation; the bounded model could not. An experimental passive torque bias
  did **not** fix it and was removed. Reducing the whole hull's friction caused
  an unacceptable sideways detour and was also rejected.
- Retained fix: split the original hull envelope into its ordinary-friction
  body and a massless 2 cm low-friction underside plate. Cabin/side friction,
  total mass and external bounds remain protected by tests. This lets actually
  loaded tyres push the underside over logs instead of inventing unloaded tyre
  force. Existing scattered-log, route-log and driftwood scenarios pass with
  their driving assertions unchanged; only the geometry tests' collider count
  changes from two to three, with additional bounds/mass/material assertions.
- A freely rolling rotor is synchronized from contact velocity, not the
  previous controller-angle delta. Otherwise an injected body velocity creates
  spurious wheel braking on the next throttle application.

Evidence: `artifacts/traction/drive-response.json` preserves the same 44 trial
inputs and adds hashes for all three drivetrain source files. The original
`baseline.json` remains untouched. Physical slip values and the baseline's
inferred spin estimate are different quantities; compare matching progress,
speed, lateral movement, contacts and loads, not the two slip columns directly.

Powered-wheel increment evidence: **34 dual-engine browser cases passed**,
covering the lab, Highlands ford/glacier routes and recovery in all worlds.
Inspected actual Chromium/WebKit loose-climb and WebKit traverse captures are
preserved under `artifacts/traction/drive-views/`. The telemetry fits the view;
wheel-local particles stay at the tyres and the climb shows real excess rim
speed, not just a stationary animation. All 44 measurements repeated
byte-for-byte. Typecheck/production build passed; the lab chunk and panel title
were absent from the production assets.
Earlier full attempts were interrupted for the confirmed glacier/log regressions.
A 120 s per-file attempt reported 284 passed, one log failure and three file
timeouts, **not** a full pass. The limit was inappropriate for long route files:
the later cave-driving test alone takes about 168 s. Full-suite outcomes belong
to the following integrated increment, not this intermediate browser pass.

**Remaining at this intermediate point:** coasting/brake-wheel rotation follows rolling contact;
lifting off a spinning powered wheel is not yet a fully inertial recovery.
The old ice-specific axle/steering rule remains. Replace those in a separate
small step with braking/coasting torque reaction and a common lateral-slip/
relaxation law, prove controlled under/oversteer and traverse recovery, then
repeat the unchanged authored-route gates. Physical iPad acceptance remains
manual. No commits or pushes.

### Inertial lift-off and brake reaction

The next retained step removes the coast/brake rotation shortcut. References:
`driveForces`' existing lift-off/direction-change brake requests, the powered
rotor/contact solve, and the unchanged braking, downhill, countersteer and
authored-obstacle tests. Adaptation: solve pad torque and contact reaction
together rather than letting Rapier's separate brake force bypass rotor inertia.

- Every wheel now integrates motor momentum, measured ground reaction and
  bounded pad torque, including neutral and braking. A locked/sliding wheel may
  stop rotating while the chassis continues; it cannot invent contact force.
  Lift-off transfers excess wheel momentum through available grip instead of
  assigning the road's rolling speed to the rotor.
- Kept the inherited neutral brake and per-surface rolling resistance. Converted
  the old per-60-Hz-step brake impulse into a `dt`-scaled angular budget; included
  the same rotating-mass calibration as the drive. Both pedals and a new opposite
  command still cut the motor immediately. Brake/coast reactions are applied
  separately from the controller's engine-force channel.
- A locked-wheel stopping correction must use the contact lever arm, inverse
  inertia and shared contact count. Using a quarter of chassis mass for that
  correction made the body rock and creep under both pedals. The contact-point
  effective mass fixes it without weakening the existing holding assertion.
- Explicit pose/velocity captures initialize rolling rotor state; a normal
  `beforeStep`/`world.step`/`capture` retains integrated momentum. This preserves
  injected equal-speed trials without reintroducing a throttle-release snap.
- New checks cover lift-off angular/linear momentum exchange, brake energy
  dissipation and locking, and the real mixed-surface Vehicle's torque/reaction
  balance after releasing the pedal. Existing surface/physics driving assertions
  remain unchanged.

A separate lateral experiment was rejected, **without withdrawing the retained
drive/coast/brake work**. A common slip-angle-dependent stiffness/relaxation
curve made ice too directionally stable and changed contact with authored beach
logs. Adding a tighter material-dependent lateral ellipse also lost the useful
oblique loose-slope line. Neither attempt preserved the countersteer and route
gates. No `LateralGrip` prototype or altered lateral coefficient remains.
Simply reducing static lateral stiffness/capacity does not reproduce transient
side-force buildup and yaw; the next lateral step needs to prove those dynamics
in a bounded fixture before removing the old ice axle rule.

`artifacts/traction/drive-coast.json` contains the current 44-trial protocol and
source hashes; a second run was byte-identical. Baseline and drive-only JSON are
preserved. At the same initial speed, coast displacement is 22.68 m on ice,
2.96 m on sand and 2.08 m in mud. Stopping distance is 4.17 m on ice versus
1.20 m on dirt. Unpowered traverse displacement remains 2.12 m on ice versus
0.37 m on dirt; that inherited lateral behavior is not a new lateral-model win.

The first full integrated unit run finished **433 passed / one failed out of
434**, with no skips or cancellations. The failure was the unchanged Northern
coastal beach-log assertion, not an accepted new handling difference. All Mars
routes, Iceland real-driving routes, recovery and core surface/physics checks
passed in that run. It took about 34.4 minutes; a 120 s per-file limit is not a
valid substitute for those long route checks.

The full 398-case browser attempt was stopped after repeated Iceland failures,
before reaching WebKit; it is **not** a full-suite pass. Isolated comparisons
served the original `HEAD` sources in memory on this worktree's own port:
both the duplicate `.wordmark` strict-selector failure and the Iceland
ford/bridge 210 s timeout reproduce without the new drivetrain. Other Iceland
failures in the stopped run were not individually baseline-proven. No unrelated
selectors, routes, physics assertions or timeouts were weakened to hide them.
The later 66-case affected run was also stopped before completion, so it is not
acceptance of coast/brake changes either. Physical-iPad acceptance stays manual.

### Underbody regression correction and integrated acceptance

The coast-log investigation reused the unchanged real streamed trials in
`northern-coast.test.ts` and `northern-west.test.ts`. The failing scattered log
is near Z419.9115: the car crossed the target but moved about 3.66 m sideways,
hit the next rock and stopped at Z411.1055. Original collision shapes with the
new drivetrain crossed it in 296 steps with about 0.31 m lateral deviation.
Restoring only mass properties did not fix that trajectory; the material/contact
split mattered too.

The retained correction keeps the full-width 2 cm underside and ordinary side/
cabin materials, but raises the underside coefficient from 0.08 to **0.16**.
It also explicitly restores the unsplit hull's original centre of mass and
principal inertia. A new geometry assertion compares those mass properties
against the original two-collider body, not just its total mass and outer bounds.
This is a calibrated model material, not a measured real-world coefficient.
No tyre-load limit or existing driving assertion changed.

Rejected alternatives: narrower plates caused lateral detours; same-height
ordinary-friction side rails snagged the Z625 high-centering log again. Recessed
rails did not solve both gates either. A plate at 0.24 or above restored straight
coastal progress but stuck at Z625. The retained material passes both complete
beach-log tests, including the western 2.5 m lateral-corridor guard. All 58
focused drivetrain, physics, surface, effect, geometry and lab checks passed.
The 44-trial coast/brake measurement was regenerated with the corrected source
hash and repeated byte-for-byte; baseline and drive-only evidence stay intact.
Typecheck/build and absence-of-lab production-bundle checks pass.
The measurement runner now also records 24 samples for each of the four pad
trials: body yaw rate/side speed, actual steering, and per-wheel contact velocity,
load and forward/right impulse. Airborne rolling/lateral contact speeds are
`null`, not invented road measurements. Inputs, total trial count and duration
are unchanged. Both output repetitions, including these traces, match exactly.
The last half-second shows initial straightening, not the separate two-second
countersteer recovery gate.

Additional bounded lateral probes used common slip relaxation, an elastic
contact-patch deflection model, and balanced tyres without global yaw damping.
They were runtime experiments only. None reproduced the existing ice
countersteer gate: the elastic probe reached roughly 5.8–8 degrees against the
required >18, despite controlled recovery. No contact-patch prototype, changed
yaw damping or new front/rear rule is retained. A slowly filtered stiffness
multiplier is not a demonstrated replacement for transient lateral forces.

The corrected model's fresh **full unit run passes all 434 tests**, with zero
failures, skips or cancellations (about 33.9 minutes). The named integrated
dual-engine browser run passes **52/52** (15.1 minutes): lab, Highlands ford/
glacier routes, Northern coast/west, all-world recovery and Moon/Mars rover
driving. It includes a new actual-keyboard coast/brake sequence. Its first draft incorrectly assumed
that the inherited weak ice brake would lock a loaded tyre at speed; headless
measurements show rolling brake slip around -0.23 m/s instead. The scenario now
checks that actual rim/contact lag, not a fictional lock. Low-capacity locking
remains covered by the mechanical unit fixture; it is not claimed for normal
ice braking.

Four additional browser checks pass: both reference logs driven with the real
keyboard controls in Chromium/WebKit, after the same 91-step neutral settling
as the unit reference. Both clear the obstacle by 9 m within a 2.5 m observed
lateral corridor. This is **56 affected browser passes**, not a full-browser
pass or physical-iPad acceptance.

Inspected actual coast/brake, loose-climb, traverse and reference-log captures
are preserved in `artifacts/traction/coast-views/`, separate from the powered-only
and original evidence. Normal rolling RPM agrees with body speed; braking
shows rim/contact lag and front load transfer, while the loose climb shows
excess rim speed and wheel-local debris. The log views include the chassis
lifting/rolling over the actual obstacle, not an overhead placement check.
Browser captures are at live frame times, not identical cross-engine ticks.
Reference Moon/Mars rover PNGs overwritten by the exploration scenarios were
restored; user/reference images and original traction evidence were preserved.
No PWA rerun or publication was performed for this drivetrain-only development
increment; existing iPad touch/offline gaps remain manual.

**Exact next implementation step:** retain this verified inertial drivetrain.
Use the pad traces and existing longer countersteer fixture to develop a
transient lateral-force/yaw response with measured front/rear slip, load
transfer, steering reversal and straight-ahead recovery. Replace the old
ice axle rule only after the common response passes those gates and the unchanged
angled climbs, glacier ascent and beach-log routes. The full agreed traction
scope is not complete. No commits or pushes.

## Fast-turn understeer and lift-off response — 2026-10-31

The user reported that the lab still felt too similar and authorized continuing.
This increment follows the existing `tyreImpulse`/`WheelDrive` contact correction,
the surface countersteer fixture and the unchanged 44-trial protocol. It does
not add controls, a new steering algorithm, cosmetic spin or a surface-specific
front/rear multiplier.

The inherited ellipse allowed side force up to 2.4 times the longitudinal
material coefficient times normal load. On dirt that is 2.4 times wheel load;
the large drive allowance also made the front hold an implausibly tight fast
turn. `tyreImpulse` now supports distinct longitudinal/lateral axes in the
same budget. Vehicle retains its calibrated longitudinal capacity, but limits
the sliding lateral axis to **1.25 times normal load**, or the existing material
limit when lower. The original radial budget first bounds both reactions; the
lower lateral axis then clips side force to the remaining ellipse without
repeatedly reducing the solved shaft reaction. Bounded forward reaction returns
to the rotor. Static grip transitions to sliding from signed wheel-centre axial
scrub, filtered at 3/s between 0.5 and 1 m/s. New colliders, a normal change over
15 degrees, unloading and resets clear that history. This does not invent slip
from steering input or confuse chassis roll on a log with tyre scrub.

Before/after deterministic flat-ground probes start at 12 m/s, hold full forward
and full steer for 90 ticks, then lift off at unchanged steering. On dirt, yaw
response relative to the no-slip wheelbase/steering prediction falls from about
**0.86 to 0.535** under power: a visibly wider turn, not merely a different RPM.
After release it returns to about **0.85–0.86**, already around 12 m/s. Sand
changes from roughly **0.76–0.80 to 0.620**, recovering to about **0.905**.
The tests cover both turn directions, the per-wheel combined budget, continuing
forward movement during recovery and stable straightening afterwards.

The 44 original lab inputs and durations are unchanged. Repeated current output
is byte-identical and lives separately in `artifacts/traction/lateral-response.json`.
The original, powered-only and coast/brake evidence remains intact. The dirt
pad finishes **4.22 m** from the preceding model's end position after the same
four-second steering sequence. Sand differs by 0.48 m, ice by 0.27 m and mud by
0.11 m. This is not a claim that every surface now feels newly tuned.

The initial constant lateral cap broke the western reference log despite the
fast-turn fixture passing. Static/scrub blending and contact-history corrections
alone did not robustly preserve both real browser approaches. A 0.14 skid-plate
probe was rejected; the accepted 0.16 plate, geometry, mass and inertia remain
unchanged. No invisible clearance or authored route was altered.

The retained contact approximation assigns each thin-ring rotor a wheel weight
from `WHEEL_INERTIA / radius^2`. Its gravity-normal reaction is applied at actual
ground contact, including when a drooped wheel touches with zero spring force.
It is not a friction-only load floor or additional chassis mass. The native
spring equilibrium drops by that support; the final total normal load still
equals chassis weight. This raises settled ride height by about 1.9 cm on the
flat dirt fixture; no rest length or collision shape is changed. New tests prove
the load balance at gravity 18 and 3.7, zero airborne force and unchanged free
fall against a matching rigid body. This remains a raycast approximation, not
independently simulated unsprung bodies.

Using spring-only native friction with the new total load suppressed existing
ice countersteer; giving raw motor demand priority over the already clipped
native reactions was not a consistent fix. Rapier now receives the same total
load allowance, and its forward allocation is retained whenever spring load is
positive. A zero-spring, grounded wheel uses its prepared motor demand bounded
by its real wheel-weight reaction. Service braking initially pitched the car
onto the front axle and lengthened dirt stopping time. Active shaft brake torque
no longer receives the rotating-mass acceleration multiplier; neutral shaft
drag keeps its preceding calibration. Existing brake/ice assertions were not
changed.

Fresh focused physics checks pass **33/33**, including the added load/free-fall
test and unchanged loose angled climbs, ice braking, countersteer and recovery.
The glacier and both complete beach-log unit gates also pass. Typecheck/build,
strict browser-test typing and repeated 44-trial measurements pass. Both
reference-log drives and the new actual-keyboard fast-turn/lift-off case pass
in Chromium and WebKit (**6/6**). The fresh complete affected browser set passes
**58/58** in 17 minutes: lab, Highlands ford/glacier routes, Northern coast/west,
all-world recovery and Moon/Mars rover switching/driving.

The fresh full unit run finished **436/437** in 33.7 minutes, with no skips or
cancellations. Every Mars/Iceland route and the existing ice, recovery and
obstacle gates passed. The sole failure was Sheltered beach loop in reverse:
the test's always-full-throttle waypoint driver ran 8.28 m outside the authored
polyline into a rock 10.35 m from that line. Isolating lateral saturation did
not cure it; withdrawing wheel support did, but also discarded the physical
grounded-wheel correction needed for the log gates. A support-only load floor
and re-scaling both ellipse axes did not robustly preserve the other obstacles
and were rejected.

Retained adaptation: the **test driver**, not the game controls or route, now
uses the existing opposite-pedal brake above 6 m/s before nearby waypoints or
large heading errors. Real understeer must not be evaluated by assuming a car
can take every downhill bend at permanent full throttle. All original waypoint,
step-limit, terrain-clearance and streaming assertions remain; a new **5 m
maximum distance from the authored polyline** guard makes the route check
stricter. All six coastal route directions pass that guard. The complete
coast/west plus focused traction/surface/lab rerun passes **46/46**, and the
strengthened coastal route case passes again alone.

The final Vehicle, driving and wheel-drive hashes exactly match the full-run,
58-browser and repeated 44-trial source. Only the test driver's inputs and
additional corridor assertion changed after that full run; no game-code
shortcut was introduced. All 437 unit cases are covered by the full run plus
these reruns, **not** by a new single all-green 437-case run. The earlier
434-unit pass belongs to the preceding increment.

Inspected current Chromium/WebKit driving-height views are preserved under
`artifacts/traction/lateral-views/`. Under power, the shown front contact scrub
is about 1.9–2.4 m/s versus 0.4–0.5 m/s at the rear; it decreases after release.
Tyres remain grounded and local debris follows the moving vehicle. Screenshots
use live frame times, not matching ticks: Chromium's recovered view is already
at 3.44 m/s versus WebKit's 10.18 m/s, so it is not itself the equal-speed
comparison. The fixed-step probes and actual keyboard yaw samples establish
the steering improvement while the vehicle is still moving.
The 60 reference rover PNGs overwritten by these browser runs were preserved in
session artifacts and restored; curated/user reference images remain unchanged.

An earlier full-browser attempt in this lateral iteration stopped at the baseline-proven
duplicate `.wordmark` strict-selector failure: 10 passed, one failed and 395
not run. Earlier full/affected attempts interrupted for confirmed new log
regressions are not successes. No browser assertion was weakened or skipped.

**Remaining scope:** this is a retained lateral-capacity/understeer increment,
not completion of the shared transient tyre model. The inherited uphill
envelopes and ice axle rule still exist. Next develop common rear breakaway,
countersteer and recovery from actual contact state, preserving this new
powered-turn/lift-off gate, then the unchanged ice, oblique-climb, glacier and
both beach-log gates. Cross-slope sliding still needs separate final acceptance.
No commits, pushes or production publication.

## Visible sand-wheelspin demonstrator — 2026-11-02

The user explicitly refocused the work on playful, immediately readable effects
rather than more invisible tyre-model development, then selected sand struggle
and wheelspin as the first demonstration. This supersedes automatic continuation
into the common lateral model. Do not start another broad physics increment
before evaluating the visible result.

References reused: the existing 25-degree sand climb, `WheelTerrainState`'s real
rim/contact slip, `TerrainEffects`' bounded wheel-local debris and palette
overrides, and `GroundEffects`' transient terrain-fitted stamps. Adaptation:
amplify the consequence of existing wheelspin, not wheel rotation or chassis
movement. Vehicle, wheel-drive, surfaces, controls and terrain geometry are
unchanged; their physics hashes still match `lateral-response.json`.

- On sand only, substantial actual slip speed and ratio produce a denser,
  larger, directional fan of low angular grains/clods. Signed slip determines
  throw direction; no random loss of traction or throttle-only trigger.
  Ordinary rolling retains the preceding feedback. The first large round-puff
  version was refined into smaller flattened elongated grains after inspecting
  the driving captures. Area-specific colours, including Iceland's black sand,
  are preserved.
- Actual churning contacts leave darker shallow visual stamps even when the
  chassis barely moves. One stationary contact refreshes one footprint instead
  of endlessly stacking decals. Stamps require contact at terrain height, remain
  bounded and expire; this is not physical digging or terrain deformation.
- The particle pool remains 72 instances and track pool 256. Airborne wheels
  cannot emit or churn terrain. Reset/clear/disposal and reduced-motion behavior
  retain the existing ownership.
- Direct demo: `http://127.0.0.1:5174/?dev=traction&start=grade-25&surface=sand&car=modern`.
  Hold forward onto the ramp: the existing car loses progress while the tyres
  keep spinning and throwing sand. Release forward: slip decays and the strong
  spray dies away. No new gameplay controls. This does **not** establish that
  short throttle taps climb farther; no such new physical benefit is claimed.

Focused validation: **43/43 units**, typecheck/build and strict browser-test
typing pass. **14/14 Chromium/WebKit browser cases** pass: the complete lab plus
the existing wheel-local-feedback/draw-call gate. The new actual-keyboard
scenario hides telemetry, requires a moving-but-slowing car below 2 m/s with
loaded-wheel slip ratio above 0.65 and rim/contact excess above 3 m/s, then checks
that releasing the pedal reduces slip and particles. Both engines have recorded
video; final driving-height spin/release images are under
`artifacts/traction/sand-views/`. Earlier `coast-views` are preserved as the
visually subdued reference, not a matching-tick A/B measurement.

No new full-suite or PWA run: this bounded feedback increment changes no
physics/startup/storage behavior. Previous full-run-plus-rerun coverage and the
unresolved full-browser baseline issues remain as recorded above, not newly
passed. Physical iPad acceptance remains manual. Own strict-port server 5174 is
running; no other checkout/server was touched. No commits or pushes.

**Exact next step:** user judges the short visible sand demonstration and live
drive, especially whether wheelspin versus body progress and spray are readable
without numbers. If still too subtle, identify which cue is missing before
investing in another physics layer. Ice, common rear breakaway and final traverse
acceptance remain unfinished; this is a first visual-feedback slice, not the
whole traction goal.

## Small positional sand-grip variation — 2026-11-02

The user approved the sand feedback, then explicitly authorized a small real
variation in each wheel's breakaway threshold, initially **90–110%**, rather
than independent cosmetic RPM randomness. This supersedes the earlier pause
for visual assessment, not the remaining broader traction goals.

Reference reused: the pure dependency-free `icelandNoise` helper, imported as
positional noise without importing Iceland terrain/runtime or changing its
implementation; existing real wheel rotors, load/native-friction compensation
and the final tyre ellipse. Adaptation: a shared smooth two-metre sand field,
sampled at each wheel's most recent contact once per fixed step. The same
position produces the same value independently of wheel ID, call order or
frame rate; rear wheels encounter the same patches later. No fresh RNG per tick.

- Scale the inherited uphill coupling envelope, normal-load drive/coast/brake
  limits, native friction, final longitudinal allowance and final lateral
  allowance, including its sliding ceiling, with the same coefficient.
  Leave motor torque, spring/load support, hull, controls, terrain geometry,
  steering stiffness and wheel-animation integration unchanged.
- Read-only wheel telemetry exposes `gripMultiplier` and
  `longitudinalFriction`; the lab displays the multiplier. Reset clears cached
  coefficients. Existing particles/marks respond to real slip without new
  cosmetic randomness.
- Every non-sand material returns exactly 1, including ash, ice, Martian dust
  and lunar materials. All **33 non-sand trials** match the preceding v3
  measurements exactly, including their wheel-level turning traces after
  removing the newly added telemetry fields.
- Preserve `lateral-response.json`; new 44-trial measurements are
  `artifacts/traction/sand-grip-response.json`, with additional surface/noise
  source hashes. At four seconds, sand 20-degree run-up progress changes
  28.625 → 28.713 m; 25-degree run-up 24.649 → 24.659 m; oblique hill-start
  7.866 → 7.413 m. Straight hill-start still rolls back. This intentionally
  varies actual sand capability slightly; it is not presentation-only.
- A real loaded 20-degree slope regression records over 30 RPM separation
  between wheels (observed peak about 85 RPM), checks native/final agreement,
  the dynamic shared ellipse, and exact independent replay. Spatial tests
  check bounds, distribution, negative coordinates, cell-boundary continuity
  and sand-only scope. The existing turning test now checks the actual
  longitudinal coefficient instead of incorrectly assuming uniform sand.
- Do not oversell the amplitude: the ordinary running-start demo can keep
  all four wheels spinning, with only a few RPM difference near the drivetrain
  speed ceiling. The 85 RPM fixture is a separate slow slope trial, not the
  driving-view run-up. No amplitude increase or fake RPM was added.

Completed checks: **87 affected units**: 45 traction/surface/lab/feedback,
13 complete coast/west including both logs and all coastal routes,
23 geometry/recovery, and six existing Iceland beach/wreck real-driving cases
covering both cars. Typecheck/build, strict browser-test typing and the
44-trial comparison pass.

**20 distinct Chromium/WebKit cases have passing coverage**, not one fresh
20/20 run: 18 pass in the broader run, then both amended sand demonstrations
pass separately. Both logs keep the original lateral-corridor limits. The
new demonstration initially demanded more than 2 RPM separation while the
car had already slowed below 2 m/s. Its trace instead shows only about
1.2–1.9 RPM separation near the motor-speed ceiling despite distinct grip
coefficients. Retained the original slip/speed/particle/lift-off assertions
and verified modest real RPM separation above 0.5 there; the separate slow
slope unit still requires over 30 RPM. Physics and amplitude were not changed
to force this presentation test to pass.

An attempted 24-case broader browser run was stopped after the Sólheimasandur
return drive timed out; its Reynisfjara case was interrupted and is not passed.
Sólheimasandur also exceeds 210 seconds alone. A page-local module interception
then fixed `surfaceGripAt` to exactly 1, reproducing the pre-patch v3 force
calculations without changing this checkout/server: **the same return drive
still times out at the same assertion**. This is a pre-patch-v3 control, not a
test of `HEAD`/`main`. No route assertion, car physics or timeout was changed.
Its unresolved browser acceptance remains open despite all six headless
Iceland sand drives passing. Control fixture and traces are preserved in
session `files/sand-grip-baseline-probe.spec.ts`,
`sand-grip-iceland-alone/` and `sand-grip-prepatch-control/`;
the temporary fixture was removed from the repository.

Inspected actual spin images from both engines against the approved preceding
sand view. Directional spray remains intact; these images do not establish a
large new wheel-speed difference. New spin/release images are under
`artifacts/traction/sand-grip-views/`, with original `sand-views/` untouched.
Final demo recordings are in session `files/sand-grip-final-demo/`;
the other passing cases are in `sand-grip-focused-browser/`.
No new full-suite/PWA or physical-device result is claimed. Previous full-run
and incomplete full-browser evidence remains unchanged. Own strict-port 5174
server remains available; no other checkout/server, commits or pushes.

**User driving assessment — 2026-11-02:** accepted the sand variation, noting
that wheel differences are visible while the rear wheels are still on the
flat approach. No larger amplitude or wider surface scope was requested.
Keep this accepted sand behavior rather than reopening general tuning.

**Next slice authorized by the user:** one short visible ice-slide/recovery demonstration on
the existing pad, starting from the current ice behavior rather than another
broad tyre-model rewrite. Judge actual sideways travel, steering response and
recoverability from the driving view before expanding the work. This next
slice is recorded below. Do not promise front-only/rear-only spinning
at every point. The existing Iceland browser return-drive timeout needs
separate diagnosis; common rear breakaway and traverse acceptance remain
unfinished.

## Existing ice-slide and moving-recovery demonstrator — 2026-11-02

The user accepted the bounded next step: show actual sideways ice travel,
countersteer/lift-off and recoverability before further physics work.
References reused: the existing ice countersteer regression in
`tests/surfaces.test.ts`, keyboard-driven lab demonstrations and marked pad.
**No tyre/vehicle physics changed.** Vehicle, driving, wheel-drive, surface and
noise hashes match `sand-grip-response.json`. The inherited ice axle rule
remains; this is not its replacement or the completed common breakaway model.
Sand's accepted 90–110% patches are untouched.

Initial footage already showed the slide, but the pale featureless ground
made movement hard to read. The only runtime change is DEV lab presentation:
a five-metre pad grid and contrasting blue ice lines, updated on surface
changes. Reuse the same line mesh/material ownership and draw call. Ground
vertices/indices remain byte-identical, SHA-256
`65a59fb91ae5b2b6c0847dbcc39ce74217b8fc20c8e200222889a036a655b19c`.
Collision/sampling, slopes, spawn/reset, normal worlds and production bundles
are unchanged; the lab remains absent from production JavaScript.

The recorded input uses normal keyboard handlers, not injected body velocity
or a scripted car path: accelerate to about 10 m/s; left plus forward for
0.9 seconds; counter right without throttle for 0.75 seconds; straighten and
coast for 1.5 seconds. Packed dirt is the reference. An initial driver's
separate protocol round trips extended Chromium's held turn. Preserve that
calibration separately, then schedule input transitions atomically in one
page evaluation. Final phase-transition gaps are 0–2 ms; actual phase times
and per-frame responses are preserved rather than assumed render-rate exact.

| Surface | Chromium peak sideslip / side speed | WebKit peak sideslip / side speed |
| --- | --- | --- |
| Packed dirt | 6.53 degrees / 1.27 m/s | 6.56 degrees / 1.27 m/s |
| Ice | 16.17 degrees / 3.34 m/s | 16.12 degrees / 3.31 m/s |

After countersteer and straight coasting, ice retains about 8.2–8.9 m/s with
less than 0.01 degree residual sideslip. Both surfaces recover while travelling
over five metres, remain upright and keep at least two contacts. This proves
the combined manoeuvre, not that lifting alone immediately reduces slide or
is better than every held-throttle alternative.

Validation: **46/46 focused units**, including matched-speed ice/dirt recovery
in both steering directions; **6/6 affected Chromium/WebKit cases**, covering
both comparison surfaces and the approved sand fan/lift-off. Existing ice
braking/countersteer, loose climbs, sand replay and feedback assertions remain.
Typecheck/build, strict browser typing and diff checks pass. No full-suite,
PWA, device or route rerun: shared physics and normal worlds are unchanged.
Earlier full-suite evidence and the pre-patch-v3 Sólheimasandur browser return
timeout remain as documented, not newly passed.

Evidence: `artifacts/traction/ice-slide-response.json` contains final hashes
and four browser traces; `artifacts/traction/ice-views/` contains actual
sliding/recovery driving images. Final raw recordings/report are in session
`files/ice-slide-reference-final/` and `ice-slide-reference-final-report.json`.
Inspected the footage and labelled 4.76-second side-by-side video,
`files/ice-slide-comparison.mp4`: left packed dirt, right ice, both WebKit.
No synthetic car animation, changed camera or telemetry overlay. Earlier
no-grid/calibration footage remains separate. The general-lab preview is now
on the ice pad; accepted sand preview/video are preserved.

**Exact next step:** user assesses whether this existing ice slide and moving
recovery are readable and playful enough. Do not retune ice or broaden
randomness just to increase numbers. Common rear breakaway and final traverse
acceptance remain unfinished; this is not the whole traction scope. No commits,
pushes or other checkout/server changes.

## Stronger, user-accepted ice slide — 2026-11-02

The user accepted the mild comparison, authorized a stronger but recoverable
25–30-degree variant, then confirmed **“Mi się podoba.”** Keep this variant;
do not continue increasing it. The accepted sand patches and feedback are
unchanged.

Reference: the existing `iceAxleGrip` turn response and its speed, steering and
steep-uphill fades, the matched-speed unit trial in both steering directions,
and the atomic real-keyboard browser comparison above. The only vehicle-source
change from v4 is the full-turn rear multiplier **0.32 → 0.25**. The front stays
1.75. Material profiles, force budgets, brakes, motor, wheel inertia, controls,
terrain and visuals are untouched. This is physical lateral-response tuning,
not random grip, injected yaw or a completed general breakaway model.
Temporary in-memory coefficient trials rejected stronger values: 0.20 produced
about 44 degrees and left only 3.3 m/s after recovery. The retained 0.25 reaches
the requested range without approaching that near-stop.

| Browser | Previous ice peak / side speed | Stronger ice peak / side speed | Speed after recovery, previous → stronger |
| --- | --- | --- | --- |
| Chromium | 16.17 degrees / 3.34 m/s | 26.68 degrees / 4.56 m/s | 8.88 → 6.71 m/s |
| WebKit | 16.12 degrees / 3.31 m/s | 26.30 degrees / 4.49 m/s | 8.18 → 6.05 m/s |

Packed dirt remains about 6.6 degrees / 1.3 m/s. The stronger ice car recovers
below 0.01 degree residual sideslip while covering another 8.7–10.6 metres,
remaining upright with at least two contacts. The intended tradeoff is more
speed lost **during this slide**, not weaker straight-line braking or climbing.
Target inputs remain 10 m/s entry, 900 ms powered left, 750 ms unpowered right,
and 1500 ms straight coast. Actual render-quantized phase times are retained
in the traces, not claimed identical between engines.

**47 focused units plus seven actual-world unit cases pass.** These preserve
the original braking/countersteer/loose-climb gates, strengthen the matched
ice trial to 25–30 degrees and over 4 m/s side speed in both directions, and
check unchanged balanced response at low speed, gentle steering, steep uphill
and on non-ice materials. The actual-world cases cover Highlands volcano/
oblique glacier and both cars driving the western ice cave, Vatnajökull through
route, outlet bridge and both glacier viewpoints in both directions.
All **43 other deterministic trial objects match v4 exactly**, including sand,
ice straight braking/coast, reverse, traverse and climbs; only ice/pad changes.

**Eight distinct affected browser cases have passing coverage:** six final lab
cases in one Chromium/WebKit run, plus both Highlands oblique glacier/volcano
cases from the preceding run. This is not a single new eight-case run.
The preceding run was 7/8: Chromium's ice comparison reached only 22.8 degrees
while heavy headless routes ran concurrently. Its trace shows seven powered
and six countersteer samples with 140–170 ms frame gaps, exceeding the game's
five-step/83 ms catch-up cap. Preserved that failure and reran the lab after
the headless routes finished; no physical value, input or angle/recovery
assertion was changed to resolve it. Moved JSON attachment before assertions
so failed future comparisons retain their phase data too.

Typecheck, production build, strict browser typing and diff checks pass.
No new full-suite, PWA, physical-device or Iceland browser-route acceptance;
the earlier full-suite ledger and unrelated Sólheimasandur timeout remain open
as recorded, not newly passed.

Evidence: `artifacts/traction/ice-strong-response.json` retains the 44 trials;
`ice-strong-slide-response.json` contains final browser traces, source hashes,
the preserved mild reference and the passing WebKit run used for footage.
Inspected actual driving images in `ice-strong-views/` and the normal-speed,
4.76-second **old ice / stronger ice** comparison in session
`files/ice-strong-before-after.mp4`. Both clips use the normal driving camera
with telemetry hidden; only titles are added. Mild-ice and sand references,
videos and views are preserved. Raw reports/logs are `ice-strong-browser*`,
`ice-strong-final-browser*`, `ice-strong-focused-units.log` and
`ice-strong-world-units.log` in session files.

**Exact next step:** retain the accepted sand and stronger ice as the new
reference. Further traction work should address the still-unfinished traverse
ice-versus-mud behavior and remaining common breakaway/route acceptance rather
than silently amplifying these approved demonstrations. No new feature work,
commits, pushes or other checkout/server changes in this closing step.

## Traverse assessment and user-accepted very slippery glass — 2026-11-02

The user requested Glassfall glass be **“super super śliskie”**, then drove it
and confirmed **“Glass jest super :)”**. Retain the current glass tune alongside
the accepted sand and ice; do not keep increasing it. No commits or pushes.

Reference: the existing ice axle-response mechanism and its speed, steering and
steep-uphill fades; the actual Scout tests in `mars-glassfall.test.ts`, existing
Glassfall crossing/firm-circuit browser drivers, and atomic keyboard slide trial.
Generalized the existing mechanism through optional material
`rearTurnResponse`: ice retains exactly 0.25, glass uses 0.1. Front response 1.75,
steering gain, fades, tyre budgets, motor, wheel inertia, geometry and controls
are unchanged. The separate steep-glacier climb curve remains ice-only.
Only glass also changes neutral rolling brake 0.04 → 0.01, service-brake effect
0.38 → 0.1 and drag 0.01 → 0.002. Mars still uses its existing gravity −18,
not an invented lower Mars gravity. Firm regolith and sand remain untouched.

Measured flat-ground Scout calibration, with normal inputs and matched entry
speed near 10 m/s: old glass reached **4.53 degrees / 0.92 m/s sideways**;
the chosen glass reaches **49.69 degrees / 8.20 m/s**. After countersteer and
1.5 s straight coasting, it retains 3.38 m/s with 4.11 degrees residual slip.
The regression allows 2 s to recover below 3 degrees while still moving.
A stronger 0.06 rear trial reached 61.48 degrees but left only 1.58 m/s after
1.5 s; rejected in favor of the now user-accepted 0.1.
The chosen straight-glide/brake profile calibration gave 14.49 m / 6.19 m/s
after 2 s coasting from 8 m/s and about 7.37 m braking distance, versus
13.36 m / 5.14 m/s and 2.71 m before. Historical phase data is preserved, not
relabelled as identical initial speeds or identical recovery duration.

Added glass and regolith to the DEV material selector without changing terrain.
The lab is an Earth entry: use `car=modern`, not a silently normalized Scout URL.
Actual Glassfall uses the Scout. Added both-direction Scout breakaway/recovery,
coast/brake and low-speed/gentle/uphill response checks. The first focused run
passed **56/56 units**, typecheck, production build and strict browser typing.
The later glass-gate additions still require their final rerun.

The first flat browser comparison was **3/4**, not fully passing: WebKit glass
reached 50.47 degrees / 8.24 m/s; Chromium 48.62 degrees / 8.12 m/s. Chromium
ended at 2.03 degrees but failed the old “last ten samples” recovery assertion:
ten frames meant about one second there versus 0.17 s in WebKit. Replaced that
frame-count proxy with the same final **150 ms** window and at least two samples,
retaining the 3-degree / 0.5 m/s limits. Lab captures now use DPR 1, as existing
Mars browser checks do; this is not physical-iPad/native-DPR performance acceptance.
The final expanded dual-engine Glassfall run is **still in progress**, with
firm circuit, both-direction off-road crossing, no-climb lip and actual-ribbon
slide coverage; do not claim those gates passed yet. Raw reports/videos:
session `files/glass-flat-browser*` and `files/glass-world-browser*`.
The initial lab URL normalized to an Earth car; final scenarios explicitly
request and assert Modern in the lab and Scout in Glassfall.

The preceding traverse assessment changed no runtime physics or geometry.
On the existing 15-degree slope, 4 s lift-off produced **1.74 m sideways /
5.36 m along on ice** versus **0.73 m / 0.35 m on mud** headlessly. Both creep
downhill and retain four contacts through the load-varying bump. Preserved
`artifacts/traction/traverse-response.json` as the pre-glass v5 assessment.
The broader browser run was **14/16**: all four traverse and six existing
Highlands/reference-log cases passed; Chromium lab ice reached 24.73 rather
than 25 degrees, and the Chromium Vatnajökull manoeuvre hit its 45 s timeout.
These remain open, not accepted or used to retune physics. The actual-world
manoeuvre now has a 90 s setup budget, without relaxed handling assertions.

The user also noted inconsistent material throw while wheels spin.
Verified: the amplified granular fan and stationary churn are **sand-only**.
Ash/black sand, Martian dust, regolith, dirt and mud retain their older, subtler
particles; snow has pale particles. No further effect changes were requested
or made. Clearer ash/dust throw remains a potential follow-up, not completed work.

### Closing evidence and measurement follow-up

The expanded Glassfall run finished **11/12**, with no skips or flaky passes.
Both engines pass the firm circuit, off-road crossing out and back, no-climb lip,
flat glass and firm-regolith manoeuvres. Actual-ribbon WebKit also passes.
Chromium's actual-ribbon trial reaches 41.69 degrees / 7.76 m/s sideways but
ends at 4.67 degrees, above the 3-degree recovery gate. Its isolated rerun
also fails, ending at 3.46 degrees; do not mark this as passed. The preceding
anchored-grep command selected no tests and is not validation evidence.
Neither run changed the accepted tune or assertions.

The final focused rerun passes **56/56** after the additional glass safeguards.
All **44 complete non-glass trial objects match v5 exactly**, including accepted
ice and sand: `artifacts/traction/glass-response.json`. Typecheck/build passed
after the runtime changes; strict browser typing passed after harness changes.
An extra attempt to typecheck Node unit sources using the browser-only type
configuration fails on missing Node declarations; no dependency was added.
The existing unit execution and production/browser checks are separate results.

Inspected the actual Glassfall Scout driving images and filmstrip, including
the ribbon edges, sideways travel and moving recovery. Original wall-clock
videos/reports remain in session `files/glass-world-browser*`; nothing was
replaced. Removed the temporary root recording config after that run.

A follow-up harness observes the game's existing completed `Vehicle.capture`
steps and schedules ordinary keyboard transitions after exactly 54 powered /
45 countersteer steps. It does not manually step physics, inject forces, change
the fixed clock or alter production code. Traces keep both simulation elapsed
and wall elapsed. This addresses render catch-up losses and phase overshoot
without changing the physical acceptance thresholds. The expanded **16-case
run is still in progress**; early Chromium real-world/recovery and mud-entry
failures remain failures pending the final report, not accepted passes.

**Exact next step:** collect that active report and preserve its actual outcomes,
including remaining real-terrain/timing failures. Do not keep changing approved
glass to fit a measurement gate. The user now asks where ice is used and is
considering a stronger ice slide; this is discussion, not yet authorization to
replace its accepted tune. Explain its shared use in Iceland, Highlands and
Blue Hollow, and protect slow/steep driving in any later authorized experiment.
Earlier full-suite/PWA/device gaps remain unchanged.

## Playful ice for Blue Hollow — 2026-11-02

The user drove Blue Hollow, authorized stronger skating behavior and explicitly
deferred Vatnajökull until returning to Iceland. Their suggestion of using
`snow` there is recorded in `ICELAND_PROGRESS.md` as a possible later change,
not an implemented conversion. This supersedes the earlier freeze on the
25–30-degree ice variant; accepted glass and sand remain fixed.

Reference: the shared material turn response, existing flat ice comparison,
High Pass geometry/presentation checks and actual Blue Hollow terrain sampling.
The sole runtime change is **ice rear response 0.25 → 0.2**. All other material
parameters, brakes, drivetrain, wheel budgets, controls, terrain and speed/
steering/uphill fades remain. In-memory calibration compared 0.25/0.22/0.2/0.18.
The chosen 0.2 reaches about **43.7 degrees / 5.75 m/s sideways**, versus
26.3 degrees / 4.49 m/s before. Countersteer plus 1.5 s coasting recovers below
0.01 degree at **3.3 m/s**, travelling over 5 m during recovery. The stronger
slide intentionally loses more speed, not straight-line braking performance.
Unit/browser targets now require 40–48 degrees, over 5.5 m/s sideways and over
3 m/s moving recovery; the dirt control retains its previous limits.
Glass keeps its absolute strong-slide gates and remains stronger than ice;
its old 1.5x angle comparison is superseded by the newly authorized stronger ice.

**56 focused units and two selected High Pass geometry units pass.**
Typecheck/build and strict browser typing pass. The full mountain-route unit
driver, Vatnajökull and unrelated long/full/PWA suites were not run.
Only **ice/pad** changes among the 44 complete v6 trial objects; all other
43 are identical, including sand, ice straight braking/coast, hills and traverse.
Preserved v6 in `glass-response.json`; current v7 is `ice-playful-response.json`.

**Six distinct affected browser cases have passing coverage**, not one fresh
six-case green run: both engines pass lab ice and the existing High Pass
climb/lookout/reset in the first run; the final separate Blue Hollow run passes
2/2. Chromium/WebKit lab peaks are **43.80 / 43.68 degrees**, side speeds
5.76 / 5.75 m/s and recovered speeds 3.30 / 3.31 m/s.
The actual bowl uses 8 m/s entry, 36 powered-right, 30 lift-off-left and
72 straight-coast native steps, rather than the lab's 10 m/s /54/45/90.
It peaks at **21.71 / 21.48 degrees**, about 4 m/s sideways, recovers below
0.01 degree at 8.37 / 8.28 m/s, and keeps every wheel on ice throughout.
Inspected actual driving images in `ice-playful-views/`; detailed results and
decimated traces are in `ice-playful-slide-response.json`.

Preserved failed fixture attempts: the first leftward trial climbed the
eastern exit, and a westward trial ran onto snow. Sampled the whole path and
wheel envelope before moving the start 5 m east/11 m north of `PASS_BOWL`
and fitting the recovery window inside the bowl. Kept the contact, angle and
moving-recovery limits. The last Chromium failure was a later live snapshot
after the measured run had already ended; now assert the captured final
surface instead of moving the car through extra automation round trips.
No physics or authored terrain was changed to accommodate those failures.

### Close the preceding glass/traverse measurement work

The fixed-step 16-case run was **12/16**. Final targeted glass/mud coverage
then passes **4/4**, producing 15 distinct passing cases across those runs.
Real glass gets its 2 s recovery plus 150 ms stability observation; angle/
side-speed limits stay unchanged. Traverse throttle is sampled after every
native step and its coast is exactly 240 steps, avoiding render-dependent
mud entry speed. Both glass engines and both mud cases now pass.
The only remaining pre-v7 case is Chromium Vatnajökull, explicitly deferred
by the user, not skipped-as-passed or claimed fixed. Evidence and actual
glass views: `glass-slide-response.json` and `glass-views/`.

**Exact next step:** user assesses the new ice in Blue Hollow or the lab.
Do not silently increase glass/sand, convert Vatnajökull to snow now, or resume
its acceptance checks in this scope. General traction acceptance and earlier
full-suite/device gaps remain unfinished. No commits or pushes.

## Extend wheelspin material throw — 2026-11-02

The user accepted the latest ice (“jest super”) and approved extending the
sand fan to similar loose ground, with subtler dirt/regolith. This is a visual
increment, not new grip variation, physics, controls or world authoring.

Reference: `TerrainEffects`' accepted sand fan and its real contact/slip tests
in `driving-feedback.test.ts`. Replaced the sand-only gate with a small material
strength table: **sand 1 / ash 0.8 / Martian dust 1 / packed dirt and Martian
regolith 0.35**. Ash already has larger base particles; the lower extra gain
avoids inflating them to a copied sand-scale cloud. The signed-slip direction,
0.7 m/s rim-slip and 0.15 slip-ratio onset, contact gating, own area/material
palettes, 72-particle pool, reduced mode, expiry and disposal stay unchanged.
Accepted sand output follows the same calculation at strength 1. Stationary
churn marks remain sand-only. Snow, mud, lunar regolith and hard surfaces keep
their preceding effects. Five physics-source hashes match v7 exactly.

Added `mars-dust` to the DEV selector; geometry and all other material profiles
are unchanged. Tests reuse actual ramps and an existing Rust Dunes slope
(-570, 12, east-facing) with Scout, not an Earth lab pretending to be Mars.
Packed-surface trials start from rest on the 32-degree ramp to obtain actual
wheelspin, rather than expecting steady high-speed rolling to throw a fan.

**36/36 focused units pass**, including contact-local emission, forward/negative
slip, both slip gates, reduced-mode intensity, weaker packed profiles, excluded
materials, constant/position-dependent palette overrides, pool bounds, expiry,
clearing emission debt and resource disposal. Existing surface/vehicle behavior
and geometry cases pass. Typecheck/build and strict browser typing pass.
The added pool test initially assumed packed particles appear within two ticks;
corrected its warm-up, retaining the per-tick capacity and end/cleanup checks.

**Final new-material browser run: 10/10**, both engines for ash, dust, dirt,
regolith and actual Rust Dunes Scout. Both unchanged-sand browser cases also
pass in the first run, giving **12 distinct passing cases across runs**.
Lab ash/dust fill but never exceed the existing 72-instance pool. Packed
profiles show 14–18 particles at the selected spin sample, actual Dunes 32–36;
these are event-based visibility samples, not equal-time performance metrics.
All final cases retain contact, real slip, correct surface, grip multiplier 1
and lift-off decay gates. Inspected actual driving images, including the Scout
and its much quieter lift-off. See `loose-spray-response.json` and
`loose-spray-views/` under `artifacts/traction/`.

Preserved the initial **10/12** browser run. Chromium regolith/Dunes entered
rollback before gas because placement and throttle were separate automation
calls. The Dunes trace has forward input but zero angular speed: it was holding
the existing direction-change brake, not spinning without particles. Placement
and ordinary KeyW now happen in one page evaluation before the next game step.
No slip/contact/count/decay limit, physics or effect tuning was relaxed.

**Exact next step:** user assesses the material differences in normal play.
Keep accepted ice/glass/sand fixed; do not extend to snow/mud/lunar soil or
resume Vatnajökull without later scope. Previous full-suite/PWA/device gaps
remain; no fresh broad-suite acceptance, commits or pushes.

## Keep full-sized fragments outside the tyres — 2026-11-02

User's side-angle image showed grains apparently leaving the rim through the
tyre. The emitter already used the real contact, but its +0.08 m birth height
placed full-sized grains inside the lower tyre; its chassis-forward launch also
ignored front steering. Preserved the original image and pre-fix emitter/run.
Reference: existing sand/material fan emitter, detailed/rover wheel envelopes
and the established contact/slip/palette/pool regressions.

Read each rendered, interpolated wheel frame before emission. Dry fragments
now leave the lower trailing tread with whole-grain clearance and the actual
steered contact-plane direction, reversing with signed rim slip. Project away
inward launch velocity rather than shooting back through rubber. A bounded
four-wheel swept envelope retires later fragments intercepted by any tyre.
No new physical colliders/impulses or handling changes. Material gains, particle
sizes/lifetimes/colors, real-slip/contact gates, reduced settings and the
72-instance pool remain fixed. Other material paths and sand-only churn remain
unchanged. Exporting the existing 0.48 m radius is the only `vehicle.ts` edit;
removing that export reproduces its accepted physical source hash exactly.

Before: Chromium forward dust recorded **772 overlap observations in 14 render
samples**, using full fragment bounding spheres and a conservative tyre cylinder;
these repeat observations are not a count of distinct grains. After:
**4/4 side-angle browser cases pass**, forward dust and reverse steered sand in
Chromium/WebKit, with zero grain/tyre intersections and 30–66 visible particles
across the recorded samples. Existing visible-fan/lift-off checks on sand, ash,
dust, dirt, regolith and actual Rust Dunes Scout also pass: **12/12** in a
separate run, without weakened thresholds or changed driver physics.

**61 focused units pass**: existing handling/geometric regressions, full-fragment
clearance on five materials across flat/pitched/cross-sloped steered poses,
both slip signs and quiet rolling, plus old-grain second-tyre swept interception.
Typecheck/build, strict browser typing and diff formatting pass. Inspected real
side-angle before/after and normal-camera Scout/black-sand captures. Evidence:
`artifacts/traction/tyre-clearance-response.json` and `tyre-clearance-views/`.
These are render/wall-time visibility observations, not equal-duration native
physics comparisons; the accepted physics remains unchanged.

**Exact next step:** user assesses the corrected departure point while driving.
No new material scope, Vatnajökull work, full-suite/PWA/device acceptance,
commits or pushes. Earlier unrelated broad-suite gaps remain open.

### User correction: avoid a detached source — 2026-11-02

The user rejected the full-sized departure above: it clears rubber but leaves a
visible gap. Preserved the corrected user image as `user-reported-detached.png`.
Quick preview now starts small grains immediately against the lower tread,
grows them only into available clearance and does not advance newborn grains
before their first render. Amplification and physical handling stay fixed.
Next: user evaluates this connection in the existing preview; this revision is
not yet a completed visual/browser acceptance. The measurements above belong
to the rejected variant and must not be presented as this revision's results.
Quick typecheck and 18 driving-feedback units pass; the revised emitter is
served on 5174. Browser captures/build remain pending this requested immediate
user assessment.

The user accepted this near-tread version, then authorized a lunar equivalent.
The lunar preview reuses the same source/contact/slip/pool and adds smaller grey
ballistic grains with Moon's -3 gravity and longer life, without changing handling.
76 focused checks, including all lunar routes both ways and measurable source
proximity, pass. Final browser/build evidence is still being collected; see
`MOON_PROGRESS.md`. User is now assessing the live version; do not retune the
accepted source or expand terrain/handling scope while awaiting that assessment.

### Accepted lunar extension and final particle evidence — 2026-11-02

The user accepted the lunar result and authorized a commit when ready, not a
push. Preserve the accepted near-tread source, sand/glass/ice and lunar tuning.
**18/18 cases pass in one fresh Chromium/WebKit run**: four side-angle whole-grain
clearance cases, twelve existing visible-fan/lift-off cases and two actual Moon
launches/lift-off. No side-angle overlap is recorded. Moon's selected samples
contain two grains, with zero/one at release; this remains a sparse lunar
presentation, not an atmospheric plume. Inspected both normal-driving and
reported-angle captures. There is no new matched native-step physics trial.

Product build and strict traction-browser typing pass; 76 focused units include
all Moon routes in both directions, physical handling regressions, true lunar
ballistic acceleration, full-grain clearance and a source-gap bound at first
render. Standalone strict checking of the existing Moon browser file cannot
resolve its Node filesystem declarations; Playwright executes it successfully,
and no dependency was added for that pre-existing typing setup.
Current generated evidence and captures:
`artifacts/traction/tyre-clearance-response.json`, `tyre-clearance-views/`,
`artifacts/moon/tyre-ejecta-response.json` and `tyre-ejecta-views/`.
The original clipping baseline and user-rejected detached source are explicitly
separate historical stages. No fresh full-suite/PWA/physical-device acceptance.

### Particle colour review before commit — 2026-11-02

User paused the requested commit for a colour review. Nothing is staged or
committed. New image: `artifacts/traction/color-review/user-reported.png`.
The main confirmed mismatch is one rusty Mars dust/regolith colour across both
rust and pale/golden ground. Generic dirt/sand and brown Ember ash also vary
locally without corresponding particle overrides. Iceland already has explicit
black-sand/grey-gravel overrides. Lunar highland albedo `#abaaa8` is close to
the current `#a6a6a0`; basalt `#898987` is darker, so preserve neutral lunar hue
and review contrast separately instead of changing its accepted ballistics.
Ground is lit, particles are unlit and amplified spray adds darkening: equal
hex codes alone would not prove equal rendered appearance.
Next: present the palette review and agree the local-colour correction scope.
No colour implementation or new physics/emission tuning during this review.

The already-running final changed-route checks completed successfully:
**21/21** in `northern-coast.test.ts`, `northern-west.test.ts` and
`mars-glassfall.test.ts` (about 546 s). This is separate from the 76 focused
checks and 18 browser cases above, not a fresh full-suite result. Commit remains
paused for the user's colour decision; no source or palette changes followed
the review.

### Limited pale-Mars dust correction and commit authorization — 2026-11-02

User chose a local fix now, with broader palette/HUD unification deferred, and
explicitly requested committing once corrected. Reference: Mars's existing
per-contact rock-colour callback and terrain `marsColor`. The new `mars-dust`
override blends the original rusty tint toward the actual local pale hue using
the terrain's shared Glassfall/pale-approach weight. Rust Dunes keeps its exact
original tint. No packed-regolith, other-world, HUD, physics, source geometry,
emission, size, lifetime or ballistic changes.

Actual Scout driving on the pale slope at (545, -150) reproduced the old red
mismatch. The before-case passed loaded-slip/contact/count gates then failed
the new pale-hue assertion. After correction, pale dust and Rust Dunes pass
**4/4 Chromium/WebKit cases**, including normal pedal release. Inspected actual
before/after side and normal driving captures, preserved with the user's image
in `artifacts/traction/color-review/`. Current source hashes and results:
`pale-mars-response.json`. These are render/wall-time observations, not matched
native-step handling measurements.

Fresh **21/21 driving-feedback units**, product typecheck/build and strict
traction-browser typing pass. All 961 sampled terrain colours have the same
before/after SHA-256. A separate production-JS search confirms the DEV proving
ground is absent, resolving the earlier ambiguous combined-command exit code.
The earlier 76 focused units, 18 browser cases and 21 additional route units
remain distinct pre-colour runs; no new full-suite/PWA/physical-iPad claim.
Commit scope is this authorized batch, without pushing. Next: keep accepted tuning.
Remaining general breakaway work and wider palette consolidation are not
silently marked complete.

### Deferred colour follow-up: tyre tracks — 2026-11-02

User reports that ground tracks remain strongly rusty after the pale airborne
dust correction in `030aae1` and asks only for a note, not another fix now.
`GroundEffects.TRACK_STYLES` is a separate fixed palette for `mars-dust` and
packed regolith. Future work should consider a shared local terrain/material
colour source for tracks and particles, keeping effect-specific contrast and
opacity and preserving red Rust Dunes. Review both effects together at driving
height and from the reported side angle. See the deferred item at the top of
`MARS_PROGRESS.md`; no game changes or new acceptance are implied.

### Integration with current main: controlled run-ups approved — 2026-11-02

- User authorized integration with `origin/main` (`f8be182`) and explicitly
  approved pushing the result to main after verification. Work remains in this
  isolated traction worktree; the other checkout/server is untouched.
- Resolved README, area-union and reset conflicts while retaining both worlds'
  behavior. Poligon repeat-start and Island Tracks whole-challenge restart both
  bypass local righting. Preserved all Island Tracks and comparison-pilot
  geometry, recovery, water-aware camera and development-only gates. Added a
  dual-world switching/reset browser regression; not executed yet.
- Typecheck/build and strict traction-browser typing pass. Fresh full unit run:
  **604/608 pass, four fail**, no skips/cancellations, about 38.3 minutes.
  Failures reproduce alone and all four pass on an isolated `origin/main` copy:
  both Earth cars crossing Diagonal fallen oak forward; modern crossing
  Split Saddle slab and Landing rib forward.
- Complete authored journeys, wet channels and Seabird routes pass; the failures
  are isolated low-speed obstacle approaches under the inertial/load-bounded
  drivetrain. Diagnostic input-only probes retain unchanged physics/geometry:
  3.2 m/s clears the oak and Landing rib; 4 m/s clears all three, with minimum
  upright component above 0.83. Slower 1.4 m/s, pedal hysteresis and a small
  diagonal approach do not solve the stalls. These probes are not replacements
  for the original unit assertions or browser acceptance.
- User chose to preserve accepted physics and validate controlled run-ups, then
  explicitly confirmed this as the direction for future terrain challenges.
  Updated only the four forward input speed limits: both oak cases 3.2 m/s,
  Split Saddle 4 m/s and Landing rib 3.2 m/s. All four original unit cases now
  pass with unchanged wheel-lift, articulation and safety assertions. Reverse
  approaches and full-journey inputs retain their original limits.
- No production physics, terrain or control changes. Next: finish all new-world
  regressions and full browser/PWA gates before merge commit and publication.
- Follow-up validation: **205/205** units pass across physics, vehicle recovery,
  driving feedback, Tropical Island, all comparison pilots and Island Tracks.
  This includes both cars/directions, all other slow isolated obstacles and
  complete connected journeys; no skips/cancellations. Typecheck, production
  build, strict browser typing and staged/unstaged whitespace checks pass.
  Attempted the complete **492-case** Chromium/WebKit browser gate alone,
  without a heavy unit process. Stopped on 2026-11-03 after **42 completed:
  25 pass / 17 fail**, all in Chromium; one Iceland case reported 39.7 minutes.
  This is not a full-suite result. Failures include UI layout/heading,
  Highlands feedback and multiple Iceland startup/driving scenarios.
  Do not assume every failure is pre-existing: isolate them and compare with
  `origin/main` before changing product behavior. New-world browser scenarios,
  WebKit and PWA have not yet been reached by this attempt. Publication remains
  blocked; next prioritize affected-world browser coverage and baseline
  classification instead of repeating this broad failing run.

### Integration scope: comparison demos no longer gate releases — 2026-11-03

- User explicitly removed the five exploratory comparison demos from default
  functional test suites. Their units now live under `tests/optional/`, and
  browser discovery ignores the two comparison specs unless explicitly opted
  in. Existing checks remain available through `test:demos` and
  `test:browser:demos`; no test assertions or game behavior were weakened.
- Fresh Island Tracks (`tidal-islands`) is the selected new direction, not the
  old comparison sketch (`island-tracks`), and retains its normal coverage.
  The production-exclusion guard remains, since released-game availability
  is independent of demo terrain correctness.
- This removes optional scope, not the 17 UI/Highlands/Iceland failures from
  the interrupted browser run. Next: isolate a small representative failure
  set against current main, run the affected real-game/Island Tracks scenarios
  in both engines, then sequential production/PWA checks. Fix integration-caused
  regressions rather than maintaining speculative demo terrain. Main is not
  committed/published yet.
- Verified discovery after this scope change: **468 default browser cases**,
  **24 opt-in comparison cases**, with no comparison spec in the default list.
  Fresh Island Tracks and production-exclusion guards remain discoverable.
  The moved unit fixture imports successfully; typecheck/build and diff checks
  pass. These are configuration checks, not a new browser-drive acceptance.

### Remaining release-failure triage — 2026-11-03

- User also deferred unfinished Iceland (`iceland`) until its development
  resumes. Its units moved to `tests/optional/iceland.test.ts`; browser specs
  and embedded Vatnajökull/recovery/palette cases are opt-in. The production
  exclusion guard remains. Public Iceland Highlands and selected Island Tracks
  remain covered in both engines. Default browser discovery is **404 cases**;
  the dedicated optional Iceland browser command retains 60 cases.
- Refreshed origin: main is still `f8be182`. Preserved interrupted browser
  traces before reproducing only the five remaining failures. Merged result:
  **4 fail / 1 pass**; isolated clean main snapshot, including its public
  assets, same Chromium/5174 settings: **3 fail / 2 pass**. Temporarily stopped
  only our own 5174 server for the comparison, then restored this worktree's
  server and confirmed it responds. The other checkout/server was untouched.

| Check | Evidence | Classification / next correction |
| --- | --- | --- |
| Touch-layout logo | Both revisions fail because `.wordmark` matches two elements. | Pre-existing ambiguous selector; scope it to the in-game topbar, retaining the responsive visibility requirement. |
| Location tiles | Both revisions expect six choices but DEV has thirteen. | Pre-existing public-only count applied to DEV; assert required public choices and accessibility without fixing the total to a demo count. |
| Home-screen bounds | Both revisions reject fieldset bottom 790.6875 at viewport height 768. | Pre-existing non-scrolling assumption. Actual scroll probes reach every public tile, Island Tracks and Start at all three tested viewports, without horizontal overflow. |
| Compass | Merged raw heading is 359.99999999999 while the HUD correctly displays N / 000 degrees; clean main's raw value happens to be near positive zero. | Circular-angle test error exposed by the drivetrain, not a wrong heading. Retain the same tolerance using shortest angular distance. Actual eastward placement shows E / 087 degrees and 5 m altitude. |
| Highlands feedback | Original failure was the transient `changed` CSS class, before particle assertions. Passes isolated on both revisions and all three further merged repeats. | Intermittent cue-observation risk, not a reproduced particle regression. The class lasts 750 ms with a 1200 ms cooldown; observe the transition rather than relying on a late instantaneous sample. |

- No UI/handling/terrain product code or those five browser assertions changed
  during triage. The recommended next step is bounded test-harness maintenance,
  then affected real-game/Island Tracks scenarios in both engines and sequential
  PWA checks; this does not establish a full release pass or authorize repairing
  the deferred worlds.
- Evidence is retained in session files: `integration-triage-{current,main}.log`,
  separate trace folders, `integration-feedback-repeat.log`, and
  `integration-ui-triage-probe.json` with menu/navigation captures.
  Shared navigation/feedback units pass **23/23**; a single parked Iceland
  start fixture verifies the move/imports, not that world's acceptance.
- Typecheck/build, strict browser typing and diff checks pass. Environment-gated
  runner files now import `env` explicitly from `node:process`; the missing Node
  declarations exposed by the strict check were added as a development-only
  `@types/node` dependency. Use `--types node,vite/client` for that check.
- Preserved all thirty historical Moon captures overwritten by the interrupted
  broad run: archived its generated versions in session files, verified each
  backup against the staged original bytes, then restored only those PNGs.
  No unrelated source/image edits were reverted. The worktree preview responds
  HTTP 200 on its restored strict-port 5174 server.

### Grouped local menu and browser-test maintenance — 2026-11-03

- User approved fixing the five triaged browser problems and separating local
  work from released locations. The public picker now always contains its six
  released worlds; the collapsed DEV-only **Development** disclosure groups
  active builds (fresh Island Tracks, unfinished Iceland, tropical Island),
  five comparison demos, and **Traction lab (poligon)**. A selected development
  world/tool opens its group automatically. Production visibility is unchanged.
- Reference: the existing `main.ts` DEV choice creation, official `.area-choice`
  radio markup, native fieldset disabling and `travel()` disposal lifecycle.
  Reused those paths rather than creating another navigation system; adapted a
  native keyboard-accessible `details` disclosure and scoped responsive styles.
  A lab-to-public-Valley transition now bypasses the same-area early return,
  because the tool uses Valley's ID but still needs disposal and query cleanup.
- Scoped the duplicate logo selector, asserted the explicit public-world list
  instead of a DEV-wide count, checked scrollable tile/Start accessibility
  instead of full-fieldset fit, and compared north circularly with the original
  angular tolerance. Highlands feedback now observes the actual transient
  target-surface class transition before placement, retaining its particle,
  track, reduced-motion and rendering-budget assertions.
- The first focused Chromium run finished **5 pass / 5 fail**. Two new harness
  errors were diagnosed: Playwright does not interpret a fieldset itself as a
  disabled control, and nearest scrolling left 0.17 CSS pixels of a tile outside
  the viewport. Check the fieldset DOM property and its genuinely disabled
  descendants; center the visible tile while retaining 100% viewport visibility.
  Three multi-viewport scenarios exhausted their 45-second test budget (one
  spent 38 seconds navigating after a worker restart), not a failed layout
  assertion. Their bounded budget is now 90 seconds; assertion timeouts and
  visibility/44px/no-overflow requirements are unchanged.
- Added coverage for default collapse, group membership, keyboard disclosure,
  three viewport sizes, tool launch/disabled state, lab disposal to public
  Valley, and Island Tracks selection/return. Updated existing Island, optional
  Iceland/demo, and Island Tracks switching scenarios to use the disclosure.
  Island Tracks switches via public Valley rather than depending on a deferred
  comparison demo. Production checks explicitly reject the drawer/tool launcher.
- Corrected menu/compass/Highlands feedback checks pass **14/14**, seven in each
  engine. Inspected actual portrait and short-landscape captures, including the
  expanded drawer in Chromium and WebKit. Default discovery is now **408 cases**
  (two added menu scenarios per engine), with deferred worlds still excluded.
  Typecheck, production build and strict typing of all eight affected browser
  fixtures plus the production offline fixture pass.
- Extended world-switching run: **4 pass / 4 fail**. Tropical Island and fresh
  Island Tracks render/recovery/switching scenarios both pass in WebKit;
  leaving the lab for a public world passes in both engines. Both Chromium
  compound capture scenarios exhaust their existing 120/180-second budgets
  before reaching the changed menu path. These are not world acceptance passes
  or yet classified as pre-existing against main.
- The new lab/Island Tracks reset fixture had an incorrect pad expectation:
  actual authored spawn is `(38, 52)`, not `(0, 52)`. It now reads
  `TRACTION_STARTS[0]`; the exact same reset tolerance remains. Corrected
  full-restart checks pass **2/2**, one per engine, for the sideways lab vehicle
  and Island Tracks challenge. No production reset/physics change was needed.
- Tried larger budgets for the two compound capture scenarios. Island still
  timed out at 300 seconds, later at Pause after the photo views. Stopped the
  follow-up run during Island Tracks instead of repeating an unproductive
  timeout escalation; restored both original budgets. Its unfinished case is
  not passed. Keep these separate from the green menu checks and reproduce on
  clean main before any game changes; consider separating capture and navigation
  responsibilities if the baseline confirms test-harness scope/runtime debt.
- Archived generated Island/Island Tracks captures and JSON separately, then
  restored the exact pre-run artifact snapshots. Both portrait menu engines and
  the inspected world driving-height captures remain retained in session files.
  Production/PWA validation ran sequentially after browser checks.
- Full PWA attempt: **33 pass / 1 timeout / 4 existing WebKit skips**. Production
  exclusion of the new drawer/launcher, unfinished Iceland, Island, all five
  demos and fresh Island Tracks passes in both engines. Installation, updates
  and the supported offline cases pass. The compound production car/world
  picker hit its existing 45-second Chromium test budget; the exact scenario
  passes isolated in **45.3 seconds** (including teardown), with all assertions
  unchanged. Its global budget is now 90 seconds, consistent with the focused
  multi-viewport menu cases; per-condition waits and car/world contracts remain
  unchanged. The affected picker then passes **2/2** in Chromium and WebKit
  (34.7/11.3 seconds). This is a focused correction/recheck, not a second full
  PWA run. The four skipped offline WebKit scenarios still require manual
  iPad Safari acceptance and are not counted as passed.
- Default unit suite after the approved exclusions passes **459/459**, with no
  skips or cancellations, in 12 minutes 22 seconds. This is the latest complete
  default-unit result, separate from the earlier 604/608 attempt that included
  deferred worlds. Browser/PWA and heavy unit runs stayed sequential.
- These are targeted corrections, not a green rerun of the full browser/PWA
  suites. Merge remains open and unpublished. Exact next integration step: classify
  those two Chromium compound scenarios against clean main, then finish the
  narrowed full-suite/actual-driving gates before publication.

### User-directed Island demo classification and publication — 2026-11-03

- The user explicitly requested tropical Island be treated like Old Quarry:
  move it from active builds to comparison demos, exclude its functional tests
  from normal suites, then commit and push the integration. This is the latest
  publication instruction following the previously reported validation gaps.
- Reused the existing demo menu group, `tests/optional/` directory and
  `ROAMER_INCLUDE_DEMOS` flag. The parked Island checks remain available in the
  two demo commands; the cheap production guard stays mandatory. Fresh Island
  Tracks remains an active build with normal coverage. No terrain, physics,
  controls or image assets changed in this reclassification.
- Fresh validation: typecheck/build, strict typing and moved-unit smoke check
  pass. Development grouping/navigation **4/4**, Island/Island Tracks production
  guards **4/4**, both engines; inspected the actual revised portrait menu.
  Default browser discovery is **402 cases**, optional Island retains six.
  The preceding **459/459** unit run predates this fixture move; it is not a new
  full-unit run under the smaller selection.
- Refetched main before publication: still `f8be182`, the open merge parent.
  Commit/push follows these focused checks as requested. The fresh Island
  Tracks compound Chromium capture timeout is still open and is not excluded;
  the last full browser attempt remains incomplete, and the previous PWA
  attempt/rechecks/manual WebKit gaps remain as recorded above. Publication
  does not certify those outstanding acceptance items.
