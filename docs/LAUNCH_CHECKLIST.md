# MooJai launch checklist and UX review — 19 Nov 2026

## Current state

- **Live site is out of date.** https://mosokodomo.github.io/celestial-crossings/ still serves the old build. It has "Celestial Crossings" branding, no collector page and none of the work below. Deploying requires committing the local work and merging into `main` (see "Deploy" below).
- Local build: `npm run check` passes. That covers 26 unit tests and 6 browser QA suites, including the new `extras.qa.cjs`.

## UX problems found and fixed in this pass

| # | Problem | Fix |
|---|---------|-----|
| 1 | The reading page had no way to reach the card collector. Half the product was invisible to Thai-first visitors. | Added "การ์ดมูใจ / Card charms" with a "ใหม่ / New" badge to the main nav (desktop and mobile menu), plus a footer link. |
| 2 | The footer showed a developer link, "คลังเรื่อง JSON" (raw data download). | Replaced it with "สุ่มการ์ดมูใจ / Find a card charm". The JSON file is still published. |
| 3 | No social preview image. Links shared on LINE, Facebook or X showed only text. | Added a 1200×630 preview (`assets/og-image.jpg`), Open Graph and Twitter tags on both pages, and canonical URLs. |
| 4 | No 404 page. GitHub's generic error page appeared instead. | Added a bilingual MooJai `404.html` that links home and to the charms page. It works at any URL depth. |
| 5 | No way for users to report problems. | Added a "แจ้งปัญหา / Report a problem" button on both pages. It sends to Supabase when connected; otherwise it opens a prefilled GitHub issue or copies the report. The report attaches page, browser and screen size plus recent JS errors, and never includes birth data. |
| 6 | The privacy text said "There are no accounts", which becomes untrue once accounts exist. | Reworded it to "No account is needed". When accounts are switched on, an extra account paragraph appears in the privacy dialog. |
| 7 | The local server blocked all network connections (CSP), so accounts could not be tested locally. Its 404 was plain text. | The CSP now allows Supabase only. The local 404 serves the real 404 page. |

## Still pending — your decision or action needed

### Must do before launch
1. **Deploy.** Commit the working tree on `codex/website-publish`, merge into `main` and push. In GitHub → Settings → Pages, set the source to *GitHub Actions*. The site-check workflow then checks the live site automatically.
2. **Brand art.** All 30 card fronts still read "CELESTIAL CROSSINGS" in the top banner, as does the hero Phra Chan card in the original art (the site covers it with an overlay). See `docs/CHATGPT_ART_PROMPTS.md`.
3. **Collector is English-only** while the rest of the site defaults to Thai. Thai visitors who click "การ์ดมูใจ" land on an English page. Translating its interface and the 30 card names and meanings is the biggest remaining UX gap. *Claude can do the code; a native-speaker review of the card wording is recommended.*

### When you're ready
4. **Accounts.** Create the Supabase project and paste two values into `dist/config.js` (`docs/ACCOUNTS_AND_PAYMENTS.md`, Part 1).
5. **Payments.** Decide what is paid (custom-week reading, charm draws or a subscription), then follow Part 2. Selling draws also needs server-side draws and published odds.
6. **Legal pages.** Before taking money or storing emails, add Terms, a refund policy and a PDPA-compliant privacy policy (Thai and English).
7. **Custom domain** (optional): for example moojai.app. That needs a CNAME file in `dist/` and updates to the canonical/og URLs and `scripts/site-check.cjs`.

### Smaller UX notes (not changed, to preserve approved design)
- The reader (light cream) and the collector (midnight) look like two different products. Consider sharing one header between them.
- On mobile, the collector header hides the "Fortune readings" link. The hero button is the only way back.
- Desktop birth form: the "รูปแบบปี" (year format) selector sits on its own row under the date fields. Placing it beside the year field would read faster.
- Many hint texts are 11px. Thai script with tone marks reads better at 12–13px.
- The collector card gallery shows all 30 cards at once. On mobile that makes the page about 7,000px tall. Consider showing six with a "show all" button.

## Scheduled checking

`node scripts/site-check.cjs [url] --browser` checks:

- both pages and the 404 page
- every referenced file, all 30 cards and the 52-reading library
- that `config.js` contains no secret keys
- Supabase reachability once configured
- in a real browser on desktop and mobile: a full free reading, a charm draw, broken images, sideways scroll, console errors and the bug button

It exits non-zero on any problem.

- `.github/workflows/site-check.yml` runs it daily at 09:17 Sydney time and after every deployment. GitHub emails you when a run fails.
- A Claude scheduled task can also run it and summarise the results (set it up after the first deployment).
