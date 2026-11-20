# MooJai World — local validation

20 November 2026, Windows. Implementation and reviewed scope are in
[OPEN_WORLD_PLAN.md](OPEN_WORLD_PLAN.md).

## Checks

- `npm run build` preserves the authored world and builds the existing reading data.
- `npm run check` runs the existing reader/collector checks plus the world checks.
- 50 unit/database tests cover the original rules, companion needs, byte-identical server copies,
  PostgreSQL transactions, rollback, idempotency, ownership/RLS, private topic
  authorization, room capacity and forged avatar claims.
- Eleven browser suites cover the existing pages and the new world. World tests
  include keyboard/touch movement, collection selection/followers, care caps,
  two-tab movement/chat, filters, rate limits, mute/report, pavilion privacy,
  shared lotuses, night/performance modes, responsive layouts and server draws.
- Companion care checks cover both food effects, cooldown persistence, feeding
  after the daily reward cap, resting/follower recovery, movement drain, separate
  per-pet saves, hidden-tab pause, bilingual copy and mobile feeding layout.
- Animation checks cover all six species, moving paws, diminishing food, menu
  dismissal, lying-down geometry above the ground, closed eyes, resting followers,
  waking/interruption, prop cleanup, mobile and still reduced-motion poses. The
  world budget check also measures eating and sleeping in the crowded scene.
- Online browser tests use deterministic Supabase HTTP/channel doubles. They
  verify private-topic use, no local fallback, retry IDs, safe text insertion,
  cross-tab collection refresh and throttled Presence updates.
- Deno 2.5.6 type-checks both Edge entrypoints. Runtime imports expose both shared
  rule APIs. No Edge Function or schema was deployed to a hosted project.

The latest animation update passed `world-care.qa.cjs`, `world-animation.qa.cjs`
and `world.qa.cjs` with the performance gate. The preceding care/visual update
passed 50 unit/database tests and the then-existing ten browser suites. The
expanded eleven-suite runner has not been rerun as one command after animation
changes. To run the full suite using the isolated preview server:

```powershell
$env:QA_BASE_URL = 'http://127.0.0.1:4174'
$env:WORLD_PERF_GATE = '1'
npm run check
```

## Performance evidence

`output/world/metrics.json` records the latest desktop, mobile-emulation and
crowded-scene measurements. Budgets are asserted below 120 draw calls, 150,000
triangles and six MB before play. The crowded test includes 39 remote players,
two followers each, the local player and sample visitors; a second case adds
up to 80 lotus offerings and cosmetic glows.

Desktop samples are approximately 6.6 ms between frames on this machine. The
crowded scene with offerings is about 8.1 ms, 100 draws and 145,606 triangles;
eating is about 9.9 ms / 103 draws / 145,910 triangles and sleeping about
8.2 ms / 103 draws / 145,750 triangles. The
download is approximately 1.3 MB with local text compression, including the
test collection artwork. CPU render submission time is recorded separately;
neither measurement is a physical-phone benchmark.

Earlier baseline, before the lighting/grass and companion-needs update:
Lighthouse 13.6.0, headless Chrome, mobile emulation, local compressed server:
**87 performance / 100 accessibility**, with FCP around 2.1 seconds. The full
JSON and HTML reports are under `output/world/lighthouse.report.*`. Lighthouse
scores describe that earlier run and can vary between machines and runs. The
Lighthouse audit has not been repeated for this update.

Screenshots in `output/world/`: `desktop.png` (1440×900), `mobile.png` (390×844),
`mobile-pets.png`, `desktop-feeding.png`, `mobile-feeding.png`, `pavilion.png`
and `night.png`. Animation captures include `eating-<species>.png`,
`sleeping-<species>.png`, `mobile-eating.png` and `mobile-sleeping.png`.
They use test collections, not
the owner's personal save. Browser tests make no requests to a live account
service and do not send reports to staff.

## Remaining release verification

The public configuration still has empty Supabase values. Cross-device online
play requires a configured project, the SQL and Edge Functions, and two-account
live checks for delivery, token renewal, reconnects, reports and quotas. Physical
iPhone/Android frame-rate targets remain unmeasured. The scene is updated
with softer daylight, fuller grass and rounder painted canopies from
the owner's reference. Hunger and energy are device-local, including online
mode, and pause while away. Nothing has been published or
pushed, and existing uncommitted project work remains intact.


## Review and fixes — 20 Nov 2026 (Claude)

Tested on a deliberately weak machine (2 CPU cores, software WebGL, about 2–4 fps),
which acts as a worst-case phone.

Fixed:
- **Slow motion on slow devices.** Each frame's time step was capped at 0.05 s, so
  below 20 fps the pet, demo visitors and needs all ran slower than real time.
  Movement now runs real elapsed time in ≤0.05 s sub-steps (collision stays
  accurate), with a 0.5 s cap so a hitch never teleports the pet.
- **Adaptive resolution never engaged on very slow devices.** Frames slower than
  150 ms were excluded from the frame-time average. Slow frames now count (capped
  at 250 ms each), and adaptation starts after 60 frames instead of 120.
- **Night mode.** Stars were beyond the fog distance and sub-pixel, so they never
  showed; there was no moon and lanterns had no glow. Added a camera-following
  sky dome (fog-free stars, moon with halo), additive glow halos on all lanterns
  and pavilion candles, glowing fireflies, and a midnight-and-gold HUD theme at
  night. Cost: about 3–7 extra draw calls at night.
- **Fullness bar.** Hunger is still stored internally, but the bar now shows
  Fullness / อิ่มท้อง (100% = full) so both bars mean "fuller is better".
- **Followers** walk in a wider V about one body-width apart instead of overlapping.
- **Zone title** has a soft backdrop so it stays readable over the pavilion roof.
- **Crescent sculpture** is gold and set further from spawn, so it no longer looks
  like a cut-off interface shape.
- **Thai preview label**: โหมดตัวอย่าง · เชื่อมต่อระหว่างแท็บของคุณ.
- **Collector test race**: the test now waits for the dialog's asynchronous close
  event before checking that categories unlock.

Results on the weak machine: 40/40 unit tests; 8 of 11 browser suites pass,
including world-animation (which failed before the slow-motion fix). The other
three fail only on timing at 2 fps (chat rate limit window, real-time hunger drift
within a 0.2 tolerance, heartbeat count during a slow run). Run `Run Checks.cmd`
on a machine with a GPU to confirm the full suite; the log is saved to
output/check-log.txt. The database tests (PGlite) were not run here.

### Full run on the owner's Windows PC (GPU) — 20 Nov 2026, after the fixes

`Run Checks.cmd` (WORLD_PERF_GATE=1): 50/50 unit and database tests passed; 10 of
11 browser suites passed. The one failure was world-care.qa expecting the old
"ความหิว" label; the test now checks the Fullness meter (อิ่มท้อง = 100 − hunger).
Measured: desktop ~6.1 ms/frame, 17 draws, 112k triangles; crowded with
offerings/eating/sleeping ~6.1–6.3 ms, ≤103 draws, ≤146k triangles; mobile
viewport ~6.0 ms; download ~1.31 MB. All within budget.
