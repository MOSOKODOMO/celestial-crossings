# MooJai World (โลกมูใจ) — reviewed Phase 2 plan

Updated 20 November 2026. Scope: review, revise and implement milestones M1–M7
in the existing MooJai repository. The owner's image is the visual reference;
a local copy is in `planning/world-style-reference.png` (not published).
The original plan is preserved beside the supplied document as
`OPEN_WORLD_PLAN.original-2026-11-20.md`.

## Review decisions

The product direction is retained. These technical gaps were corrected:

1. **Private shared channels do not authenticate payload IDs.** The lobby carries
   Presence for discovery. Movement, chat and emotes use private
   `world:lobby-N:<user UUID>` channels. RLS permits publishing only on the
   caller's topic. Receivers bind payload IDs to that topic, then verify pet
   ownership. A player cannot borrow another identity by editing a message.
2. **Optimistic locking must cover every draw write.** `commit_draw` updates
   state, allowance, inventory, roster and audit history in one transaction.
   Request UUIDs make retries idempotent. Only the service role can execute it.
3. **A roster view must not bypass inventory privacy.** `world_roster_data` holds
   only user ID, nickname and owned card IDs. The `world_roster` view uses
   `security_invoker = true`; quantities and draw history stay private.
4. **Online stardust also needs authority.** The `world-action` Edge Function
   uses the same core rules and atomically commits rewards and offerings.
5. **Preview and account collections stay separate.** Server inventory is not
   limited to 1,000 retained draw records. Editable preview history is never
   automatically uploaded. Failed online requests do not become local draws.
6. **A room limit requires allocation.** `world_join` serializes allocation and
   assigns at most 40 active accounts to a room, with renewable leases.
7. **Performance targets require distinct measurements.** Desktop frame time,
   mobile layout, crowded-room geometry and Lighthouse are tested separately.
   Physical phones and hosted Realtime remain release checks.
8. **The copied agent prompt is replaced by this plan.** The current scope covers
   all seven milestones. Existing uncommitted work is preserved; repository
   history and publishing are separate actions.

## 1. Product and visual direction

A cosy browser world where players walk as their owned charm pets, with up to
two owned followers. Visitors exchange short messages and emotes, and visit the
Wishing Pavilion for reflection and offerings paid with in-game stardust.

Follow the supplied image: bright grass, rounded layered tree canopies, rolling
hills, warm wooden fences and benches, expressive simple animals and a close
third-person camera. Thai sala roofs, gold tips, lotus flowers, a crescent arch
and lanterns give it MooJai's identity. The implemented first pass uses original
procedural geometry. Imported models and image-generated reference sheets are
optional later art work, not dependencies of this release.

Daytime is green and warm; night uses indigo, lilac and gold. Rarity is cosmetic:
C none; R silver; S amethyst; SR ruby; SSR gold with orbiting stars. It never
changes movement, rewards or promised outcomes.

Out of scope: payments inside the world, pet trading, marketplace, private
messages, voice chat, real-money donations, native apps and the phase 3 farm.

## 2. Architecture and files

| Responsibility | Implementation |
|---|---|
| Page and HUD | `dist/world.html`, `dist/world.css` |
| Gameplay, UI and lifecycle | `dist/world.js` |
| Models, scenery, camera and rendering | `dist/world-scene.js` |
| Thai/English interface copy | `dist/world-i18n.js` |
| Pure game rules | `dist/world-core.js` |
| Preview and online transport | `dist/world-transport.js` |
| Authenticated API calls | `dist/world-api.js` |
| Renderer | Vendored Three.js **0.180.0**, `three.module.min.js` plus `three.core.min.js` |
| Online client | Vendored Supabase JS **2.119.2**, loaded only online |
| Database additions | `supabase/world.sql`, applied after `schema.sql` |
| Server draws and rewards | Edge Functions `draw` and `world-action` |
| Shared rules | Exact copies under `supabase/functions/_shared/` |
| Browser checks | `tests/world.qa.cjs`, `tests/world-online.qa.cjs` |
| Database/security checks | `tests/world-backend.test.cjs`, with PGlite PostgreSQL |

Native ES modules; no bundler or runtime package installation. All scripts,
artwork and fonts are served locally. Online mode connects to the configured
Supabase API and WebSocket endpoints. MIT notices accompany the vendored
libraries. The home and bilingual reading navigation link to the world.

## 3. Map and controls

WorldCore remains authoritative. One 3D unit equals 20 core pixels. Core `x/y`
maps to scene `x/z`; packets consistently use core `x/y` to avoid mixed units.

| Zone | Content |
|---|---|
| Moon Meadow / ทุ่งพระจันทร์ | Spawn, benches, crescent arch, paths and flowers |
| Wishing Pavilion / ศาลาตั้งจิต | Raised sala, steps, layered roof, bell and bowl |
| Moonlit Lotus Pond / สระบัวจันทร์ | Animated stylised water, lotus pads and bank-side pier |
| Firefly Grove / ป่าหิ่งห้อย | Rounded trees, mushrooms and nighttime fireflies |
| Star Garden / สวนดาว | Flower beds and low fences; future farm space |

Trees, rocks, water and the pavilion block movement through WorldCore. Long
frames are subdivided to prevent tunnelling. Visible fences and low hills mark
the map edge. Decorative foliage does not introduce a second collision map.

- Desktop: WASD/arrows to walk; drag to orbit; E near the pavilion; Enter from
  the canvas to chat; Escape from chat returns focus to the canvas.
- Touch: joystick, drag empty space to look, contextual pavilion button. Touch
  cancellation clears movement.
- Map and visitor list are HUD buttons. Visitor actions are available through
  the list as well as by tapping a nearby avatar.

The map displays all five zones. The third-person camera shows nearby scenery,
rather than requiring every zone to fit in the same frame.

## 4. Ownership and care

Only drawing a card grants a pet. Sharing images or browsing the gallery does
not. Preview quantities come from `history` under the unchanged
`celestial-atelier-preview-v1` localStorage key, through `quantitiesFromHistory`
and `petsFromQuantities`. Online quantities come from `charm_collection`.

Players with no cards appear as a little star, with a link to `./#ritual`.
The pet panel shows existing card art, quantity, level (maximum 10), rarity,
lead selection and up to two distinct followers. Selecting a lead removes it
from the follower list. Every selected pet must be owned.

Pat and feed grant one stardust, capped at five rewards per day. Wave and
happy hop are cosmetic. Daily visits grant three stardust. Duplicate-card
stardust follows the existing core rules. Online days reset at **00:00 UTC**;
preview days follow the browser's local calendar.

The lead pet has visible hunger and energy gauges, also shown for each pet in
the companion panel. Hunger runs from 0 (full) to 100 (hungry); energy runs from
0 to 100. New pets start at 25 hunger and 85 energy. The lead and followers gain
one hunger point per minute while idle, or two while walking; walking uses
three energy points per minute. Rest restores two energy points per second,
stops on movement, and ends when all active companions have full energy.

Feeding offers free sweet berries (−20 hunger, +5 energy) or a garden meal
(−45 hunger, +12 energy), with a four-second chewing cooldown and a full-tummy
guard. Nutrition continues after the daily care-star cap. Needs stay within
0–100, do not restrict movement, and pause for hidden tabs and time away.
`world-care.js` owns these rules. Each card's needs are saved locally under
`moojai-world-needs-v1` (suffixed by account ID online); they are device-local
even in online mode. Ownership and the stardust ledger keep their existing
authority. No inventory or card odds are changed by feeding.

Choosing food closes the menu and shows a four-second eating action: the lead
pet turns toward the camera, reaches into a bowl, lifts food and chews while the
portion shrinks. Rest uses a horizontal body pose, lowered head, closed eyes,
gentle breathing and floating sleep marks for the lead and followers. Movement
interrupts either pose and clears food props. Each of the six species has a
small local skeleton; bunny ears fold and the elephant's trunk curls above the
ground. Reduced motion shows still eating/sleeping poses without looping motion.
These poses are local visual feedback; network avatar state remains unchanged.

## 5. Multiplayer, chat and safety

Empty Supabase settings enable BroadcastChannel across tabs of the same origin
and browser storage partition. Three labelled demo visitors wander locally.
This preview does not connect separate devices.

Online mode requires the existing sign-in flow. Private Realtime channels use
the current account token. `world_join`, `world_touch`, `world_members` and
`world_leave` manage authenticated room membership. No demo visitors appear.

Presence is a discovery hint. Only an account may publish to its private topic.
Other room members can subscribe. `sanitizeState` validates each snapshot;
`authorizeState` binds it to the authenticated topic and owned card IDs. Forged
pets become stars, unowned followers are removed, and mismatched sender IDs are
rejected. Missing roster evidence fails closed.

Movement sends at 10 Hz while moving, on stopping, and as a three-second
heartbeat. Remote players interpolate with a 100 ms receiver-clock buffer.
Eight seconds without a valid snapshot removes an avatar. Buffers, labels,
messages, lotus objects and detailed models are bounded. Leases renew after
backgrounding. Live delivery, token renewal and room-change reconnection still
need a hosted smoke test.

Per-user topics use more subscriptions than one shared broadcast channel.
Measure bandwidth and Supabase project quotas at intended concurrency before
launch; there is no free-tier capacity promise.

Chat is limited to 120 characters. Filter and rate checks apply on send and
receive. Messages appear in six-second bubbles and a 30-entry log. Emotes use
the same rate limit. All text is inserted as text, never HTML. Muted IDs persist
locally. Reports contain a fixed reason and at most ten recent filtered
messages from the selected visitor. Preview reports explicitly say they were
not sent. Routine chat is not stored on the server; submitted reports are the
explicit exception.

First entry asks for a filtered nickname and states: be kind, do not share
personal details, and do not sell. Staff never ask for passwords or payments in
chat. Text filtering reduces common abuse; launch still needs report handling
and moderation.

## 6. Wishing Pavilion

- **Prayer:** free once a day; choose one of six intentions, optionally type a
  private thought, bow and receive a reflection plus five stardust.
- **Moon lantern:** ten stardust; warm glow for 24 hours.
- **Star lotus:** 25 stardust; floats for one hour and is shared across preview
  tabs. Online lotus creation and ledger debit share a transaction; receivers
  verify the server's lotus record.
- **Letting go:** a free rising lantern. Typed words are cleared, never sent or
  stored. Closing or hiding the pavilion also clears private fields.

No money, promised luck, health, wealth or forgiveness outcomes. This is a
fictional reflection space, with no Buddha images, monks or deity props. Keep
the Thai disclaimer:

> พื้นที่สำหรับตั้งจิตและผ่อนคลาย ไม่ใช่การทำบุญกับวัดจริง ไม่มีการรับเงิน และไม่รับประกันโชคลาภ

These are product requirements. The original legal rationale has not been
treated as legal advice or launch clearance. Charity donations remain outside
this implementation.

## 7. Server draws and data protection

`draw_state` holds engine state, version, UTC allowance counter and credits.
Default free allowance is five, configured on the server. No world payment
interface or client credit grant is added.

The `draw` function checks the account through Supabase Auth, accepts a request
UUID and two preferences, enforces the ten-draw preference lock, and runs the
exact collector engine. `commit_draw` checks version and allowance, increments
ownership, updates the public roster and appends the audit record atomically.
Retries return the saved outcome. Conflicts recompute against current state;
failed commits grant nothing.

`world-action` similarly commits rewards and any lotus together. Clients cannot
submit an earned balance, inventory update or private intention text.

Browser roles may read their own collection/state and the minimal public
roster. They cannot change draws, quantities, rewards or roster ownership.
Reports are insert-only with the caller's identity. Privileged RPC execution is
revoked from public, anonymous and authenticated browser roles. Membership RPCs
check the caller before accessing private session records.

Preserve artwork, the ten-draw category guarantee and rarity probabilities:
**C 55%, R 30%, S 12%, SR 2.85%, SSR 0.15%**. Server/browser rule copies remain
byte-identical, checked by tests. No service key goes in `dist/`.

## 8. Performance and accessibility

- Under 120 draw calls and 150,000 rendered triangles, including a crowded room.
- Repeated scenery and remote pets use instancing; static scenery is merged.
- At most 8 nearby remote/follower pets use full models. Additional or distant
  pets use small LOD shapes. The local pet remains detailed.
- One sun and hemisphere light; a 512-pixel real shadow for the local pet only;
  blob shadows for other avatars.
- Soft ambient daylight, lighter contact shadows, rounded crowns with scalloped
  painted bands, and denser five-blade grass clumps. Grass uses a root-to-tip
  colour gradient with night tinting, avoiding dark crossed-blade shading.
- Pixel ratio capped at 1.75; adaptive scale falls in 15% steps after sustained
  slow frames, to a minimum of 0.6, then recovers with headroom.
- Performance mode: scale 0.75, less grass, no fireflies or real shadow.
  Reduced-motion preferences default to it and suppress sway, bobbing, hopping
  and orbiting effects.
- Rendering stops while hidden. Sound starts off; soft synthesized chimes
  require a user gesture.
- Playable download under six MB. Loader paints before scene construction.
  The local server compresses text assets; publishing remains static/zero-build.
- Thai default with an English toggle. World UI copy is in one module, reusing
  core species/zone/reflection dictionaries. Canvas has a label, chat a polite
  live log, and HUD actions/dialogs are keyboard reachable.

## 9. Milestones and evidence

| Milestone | Implemented and locally checked |
|---|---|
| M1 — world | Five zones, procedural pets/scenery, camera, collision, keyboard/touch, desktop/mobile screenshots and download budget |
| M2 — pets | Empty star, collection, lead/followers, card art, levels, feeding, saved hunger/energy, resting and care reward cap |
| M3 — multiplayer | Two-tab movement/departure, demo visitors, private transport and room-allocation integration checks |
| M4 — chat | Send/receive filtering, rate limit, escaping, nickname, mute and report paths |
| M5 — pavilion | Daily prayer, stardust, shared lotus, private text clearing, release and disclaimer |
| M6 — backend | PostgreSQL RLS, atomic idempotent draws/rewards, server collector, forged ownership, Deno type/runtime checks |
| M7 — polish | Day/night, chimes, performance mode, reduced motion, crowded budget, Lighthouse and visual inspection |

`npm run check` runs unit/database and browser checks. `WORLD_PERF_GATE=1`
enforces the desktop frame-time target on calibrated hardware. Portable CI
always enforces geometry, download and functional budgets without treating
software-rendered frame times as phone benchmarks.

Evidence goes in `output/world/`. Before the lighting/grass and companion-needs
update, mobile Lighthouse scored **87 performance / 100 accessibility**; that
baseline has not been rerun for this update. Actual iPhone 12, Galaxy
A54 and budget Android frame rates remain unmeasured. Hosted Supabase delivery,
token renewal and reconnect need verification after project setup. Nothing has
been deployed to production.

## 10. Setup and release checks

Read `docs/ACCOUNTS_AND_PAYMENTS.md`, then:

1. On a fresh project, apply `supabase/schema.sql`, then `supabase/world.sql`.
   On an initialized project, apply `world.sql`.
2. Deploy `draw` and `world-action` with their `_shared` files. Set `SITE_ORIGIN`
   and optionally `FREE_DRAWS_PER_DAY`.
3. Disable public Realtime channels. Check that unrelated permissive policies
   do not grant access to world topics.
4. Put only public URL/key values into `dist/config.js`; add `world.html` to
   Auth redirect URLs.
5. Use two real accounts in separate browsers to test draws, retries, ownership,
   movement, chat, reports, offerings, sign-out, token renewal, network loss and
   background/resume.
6. Run database advisors, check Realtime quotas, test physical phones, and review
   the art and moderation workflow before publishing.

Integration references: [Realtime authorization](https://supabase.com/docs/guides/realtime/authorization),
[Supabase changelog](https://supabase.com/changelog),
[Three.js](https://threejs.org/docs/), [PGlite API](https://pglite.dev/docs/api),
and [Lighthouse](https://developer.chrome.com/docs/lighthouse/overview).
