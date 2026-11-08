# Celestial Crossings

A Thai-first, bilingual fortune-reading website with an illustrated mobile landing page and a minimal desktop form. Readings run entirely in the browser. No account or payment is required.

## Run locally

Requires Node.js 22 or later. The website itself has no runtime package dependencies.

```sh
npm run build
npm start
```

Open http://127.0.0.1:4173. On Windows, the included Start Demo and Stop Demo launchers are also available.

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

Birth details stay in page memory and reset on reload. The app has no trackers, remote fonts, analytics, accounts or profile storage. Downloading a reading explicitly saves it to the visitor’s device. GitHub Pages may process ordinary request metadata under its own privacy policy; the app does not send birth details.

Noto Sans Thai is distributed under the SIL Open Font License; see `assets/web/OFL-Noto-Sans-Thai.txt`.
