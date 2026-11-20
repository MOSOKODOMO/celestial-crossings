# มูใจ / MooJai

A Thai-first, bilingual fortune-reading website with an illustrated mobile landing page and a minimal desktop form. Readings run entirely in the browser. No account or payment is required.

## Run locally

Requires Node.js 22 or later. The website needs no build server or runtime package installation.

```sh
npm run build
npm start
```

Open http://127.0.0.1:4173. On Windows, the included Start Demo and Stop Demo launchers are also available.

## Collectible card preview

Open http://127.0.0.1:4173/ for the MooJai home page and card collection (dark theme); the fortune reader is at http://127.0.0.1:4173/reading.html. The old /collect.html address redirects to the home page. Choose two intentions, then pick one of three face-down cards to reveal a charm. Each position uses the same draw odds. Preferences remain fixed within each group of ten draws. If the first nine miss both preferences, the tenth is selected equally from either preferred category. An earlier match fulfils that group's guarantee; a new group begins on draw eleven.

Each draw opens a full-screen reveal: a floating purple card turns to gold, then light and particles reveal the illustrated charm. Skip animation shows the result immediately; reduced-motion preferences bypass the sequence. Closing or reloading during the animation preserves the saved draw. Browsing existing cards still opens the compact detail view. The effect is authored in `dist/card-reveal.js` and `dist/card-reveal.css` and uses no additional packages or external assets.

Rarity is rolled independently on every draw: SSR 0.15%, SR 2.85%, S 12%, R 30%, C 55%. Ordinary category draws are equally weighted. The illustrated deck contains 30 cards, one per category and rank. Duplicates are counted, and the latest 1,000 draws plus current progress are saved in browser local storage; Reset preview clears them. Two-category combinations are shown as a future feature.

With accounts unconfigured, this is a browser-only preview. The gallery shows all 30 illustrated fronts and supports category filters. Configured, signed-in accounts use the server-authoritative draw function and durable inventory described below; local preview history stays separate. There is no payment flow for charms. The original reading experience is at `/reading.html`.

## MooJai World

Open `/world.html` for the Thai/English 3D pet world. Walk with WASD/arrows or the
mobile joystick, drag to look around, choose owned pets and followers, chat with
other preview tabs, and visit the Wishing Pavilion. Empty collections enter as a
little star. Preview visitors are labelled as examples. Offerings use stardust
earned in the game; there are no world payments.

The lead companion's hunger and energy appear beside Feed and Rest. Berries and
garden meals are free; walking uses energy, and resting restores it. Needs are
saved separately for each owned card on this device and pause while away. Food
continues to work after the five daily care-star rewards. The meadow uses soft
daylight, dense painted grass, and round tree canopies inspired by the reference.
Choosing food returns to the meadow to show the pet reaching into a bowl and
chewing. Resting pets and their followers lie down, close their eyes and breathe
gently; moving wakes them. Reduced motion keeps clear, still care poses.

The page uses native modules and locally vendored **Three.js 0.180.0**
(`dist/vendor/three.module.min.js` and `three.core.min.js`). Online mode loads
locally vendored **Supabase JS 2.119.2**. Both MIT license files are alongside the
libraries. No CDN or external scripts are loaded. Scenery and all six pet models
are procedural, with instancing and distance/crowd LODs.

Empty Supabase settings connect tabs in the same browser. Configured accounts
use server inventory, draws and stardust. Apply `supabase/world.sql` after
`supabase/schema.sql` and deploy `draw` and `world-action` before enabling
accounts. See the [reviewed plan](docs/OPEN_WORLD_PLAN.md). Hosted delivery and
physical-phone performance still need a live check.

`npm run check` includes PostgreSQL/RLS tests using development-only PGlite
**0.5.17**. World screenshots and metrics go to `output/world/`.
`WORLD_PERF_GATE=1` enforces the desktop frame-time target. Portable CI checks
geometry and download budgets without assuming a hardware GPU. An isolated
server can use `MOOJAI_PORT`; set `QA_BASE_URL` to its URL for browser checks.

## Reading experience

- Enter a birth date, with exact, approximate or unknown birth time.
- Read this week or next week for free, or choose a specific day from today onwards.
- Add preparation, confidence or communication guidance for an ordinary day, interview or date.
- Switch Thai/English without changing reading IDs; explicitly download or print your reading.
- Explore all 52 core fortunes, 64 topic passages and 14 supporting notes in the story library.

The custom-week option is a future feature. It explains its unavailable status and cannot take payments or grant access.

## Editing

- `dist/index.html`, `dist/styles.css`, `dist/app.js`: authored interface files; the build preserves them.
- `dist/engine.js`: deterministic calendar and reading selection.
- `content/library.cjs`, `content/guidance.cjs`: editable Thai/English content.
- `assets/web`: optimized artwork, self-hosted font, font license and icon, copied into `dist/assets` by the build.
- `scripts/build-demo.cjs`: generates the browser data, JSON library and printable catalogue.

Design brainstorming files and machine-local data are intentionally excluded from the public repository.

## Accounts, bug reports and payments

- `dist/config.js`: public site settings. Accounts stay off until the Supabase URL and anon key are filled in.
- `dist/site-extras.js` / `.css`: the account button and dialogs (Supabase email + password, password reset), plus the "Report a problem" button on both pages.
- `supabase/`: database schema (profiles, entitlements, bug reports, all with row-level security) and the Stripe Checkout and webhook Edge Functions.
- Setup steps: `docs/ACCOUNTS_AND_PAYMENTS.md`. Launch status and UX review: `docs/LAUNCH_CHECKLIST.md`. Image prompts for ChatGPT: `docs/CHATGPT_ART_PROMPTS.md`.

## Live site check

```sh
node scripts/site-check.cjs                 # public site, HTTP checks
node scripts/site-check.cjs --browser       # also a real reading and charm draw in Chromium
node scripts/site-check.cjs http://127.0.0.1:4173/ --browser
```

`.github/workflows/site-check.yml` runs this daily and after each deployment.

## Validation

```sh
npm ci
npx playwright install chromium
npm run check
```

On Linux, use `npx playwright install --with-deps chromium` if browser libraries are missing. Windows tests use Microsoft Edge when available. The checks cover calendar boundaries, deterministic readings, language switching, downloads, privacy behavior, responsive navigation and desktop/mobile layouts.

## Publishing

The GitHub Actions workflow tests the app and publishes only `dist` to GitHub Pages after a push to `main`. In repository Settings → Pages, select **GitHub Actions** as the source. All asset paths are relative, so project URLs work without domain-specific configuration.

This deployment is a free project preview. Before adding commercial transactions or paid services, choose appropriate production hosting and implement server-verified payments and access controls. See [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).

## Method and privacy

The 52 birthday bands, six four-hour windows and weekly rotation are invented editorial rules. They are not a traditional Thai chart calculation or evidence of predictive accuracy. Artwork is symbolic. Traditional-method integration and Thai practitioner review are future work.

Birth details stay in page memory and reset on reload. The app has no trackers, remote fonts or analytics. Accounts are optional: when enabled, Supabase stores only the email and a hashed password, never birth details. Downloading a reading explicitly saves it to the visitor’s device. GitHub Pages may process ordinary request metadata under its own privacy policy; the app does not send birth details.

Noto Sans Thai is distributed under the SIL Open Font License; see `assets/web/OFL-Noto-Sans-Thai.txt`.
