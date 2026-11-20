# MooJai accounts and Thai payments

The product is a **฿49 one-time purchase of one chosen Growth card and its matching text-free phone wallpaper**. All five Growth designs cost the same. This checkout does not sell random draws. PromptPay QR is first, with debit/credit cards also available through Stripe Checkout. Birth details and readings are not sent with account or payment requests.

## Deployment status — 20 November 2026 UTC

- Website: https://mosokodomo.github.io/celestial-crossings/
- Supabase project: **MooJai**, ref `tlixjcgravudrpgsuuxt`, Singapore.
- API: https://tlixjcgravudrpgsuuxt.supabase.co
- Three migrations are deployed. Local versions match hosted migration history.
- Six active Edge Functions: `create-checkout`, `checkout-status`, `stripe-webhook`, `purchase-download`, `draw`, `world-action`.
- Hosted transaction checks passed for fulfillment, duplicate events, refunds and late-event rejection. The smoke transaction was rolled back.
- Security advisors report no warnings/errors. Four RLS-without-policy info notices are intentional server-only tables, with no browser access.
- **Accounts and purchases remain disabled in `dist/config.js`.** Merchant activation/connection, private asset upload, Auth configuration and a real Stripe test-mode round trip remain outstanding. The published site has not been switched to this payment release.

The SCB settlement account belongs in the verified merchant dashboard. Do not put bank details, Stripe secrets, Supabase service keys or passwords in website code. An SCB account number is not a PromptPay ID or proof of merchant eligibility.

## Customer journey

1. Open a Growth card from the catalogue, or open Shop; choose the exact design.
2. See the paired wallpaper preview and total of ฿49, then sign in.
3. Stripe shows PromptPay and cards. On one phone, customers can save/import the QR into a banking app that supports scanning from the photo library.
4. On return, MooJai verifies the payment directly with Stripe. Pending payments show a check-again button. A success URL alone never proves payment.
5. The purchased card is added once to the account collection and pet roster. Download buttons appear after verification.
6. Returning buyers can download again from Shop. The current receipt is omitted from history to avoid duplicate controls.

Guest collections remain separate from account collections. Purchases do not change free-draw progress. Collection totals include bought cards; another open catalogue tab refreshes when a purchase is verified.

## Authentication setup

Open [MooJai Auth settings](https://supabase.com/dashboard/project/tlixjcgravudrpgsuuxt/auth/url-configuration):

- Site URL: `https://mosokodomo.github.io/celestial-crossings/`.
- Allow exact redirects to that URL and `reading.html`, `charms.html`, `world.html`, `payment.html` under the same path. Add localhost only for local tests.
- Keep email confirmation enabled and configure the production email sender. Supabase's default email sender has restrictions.
- Disable public Realtime access before enabling the online pet world. Its policies restrict private topics to room members and bind senders to accounts.

The dashboard sign-in was opened in Chrome and requires the user to complete it. The connector does not expose Auth settings, secret updates or file upload.

## Private assets

Create **`moojai-paid`** with **Public disabled**, and no public read/list policy. Upload the prepared `.local/moojai-paid/` folders, preserving their names:

```
cards/growth-C.webp       wallpapers/growth-C.png
cards/growth-R.webp       wallpapers/growth-R.png
cards/growth-S.webp       wallpapers/growth-S.png
cards/growth-SR.webp      wallpapers/growth-SR.png
cards/growth-SSR.webp     wallpapers/growth-SSR.png
```

Original wallpapers stay under `output/wallpaper-growth-v1/` (ignored by Git). Only the low-resolution catalogue preview is published. Card illustrations are also visible in the public catalogue; wallpaper originals stay private.

`node scripts/upload-paid-assets.mjs` validates ten local files without network requests. For an API upload, supply `SUPABASE_URL` and `SUPABASE_SERVER_KEY` securely in the process environment, then run with `--upload`. The script refuses a public bucket and verifies uploaded hashes. It never prints keys or signed URLs. Do not paste secret values into chat.

## Stripe setup

Use an activated **Thai Stripe account** with PromptPay enabled. A Thai bank account alone does not establish Stripe eligibility. Connect Stripe before creating the merchant product, price and webhook through authorized account tools.

Create a one-time price of **4900 satang, THB**, for `cardWallpaper`. The selected card is session metadata; the server fixes the product and amount. Set these Supabase secrets, initially with Stripe **test** credentials:

| Name | Value |
| --- | --- |
| `STRIPE_SECRET_KEY` | Merchant test secret key |
| `STRIPE_PRICE_CARDWALLPAPER` | Exact `price_...` ID for ฿49 |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for this endpoint |
| `SITE_URL` | `https://mosokodomo.github.io/celestial-crossings/` |
| `PAYMENTS_ENABLED` | `false` until assets/configuration are ready |

Webhook: `https://tlixjcgravudrpgsuuxt.supabase.co/functions/v1/stripe-webhook`

Subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded` and `charge.refunded`. Pinned Stripe API version: `2026-11-18.endive`.

The platform supplies Supabase URL/key environment variables. Modern default publishable/secret maps and legacy keys are supported. Gateway JWT checks are disabled because browser-facing functions validate tokens with Supabase Auth themselves; the Stripe function verifies the signed raw body.

## Verification and release

Complete Stripe test-mode purchases with PromptPay and cards. Verify actual files, two-account access isolation, cancellation, delayed events, retries and full refund behavior. No live-money transaction has been performed.

Then configure the public Supabase URL and **publishable** key in `dist/config.js`, enable the server flag and frontend `payments.enabled`, and publish. Never put a secret/service key in browser configuration. Shop and catalogue purchase links appear only when payment configuration is enabled.

## Backend behavior

`fulfill_card_bundle` inserts the receipt, inventory copy and roster projection in one transaction. Session uniqueness makes webhook/return retries safe. Stripe prices, line items, amount, currency, identity and paid state are verified server-side. Both private assets must be signable before checkout.

Download requests check authenticated ownership and revocation, then sign one fixed path for five minutes. A full refund revokes the receipt and removes one purchased copy; other copies remain. A refund ledger and advisory transaction lock prevent out-of-order events restoring access. Partial refunds retain access. An existing signed link may work until its five-minute expiry; downloaded files cannot be recalled.

For a fresh database, apply `supabase/migrations/` in order. The original `schema.sql` and `world.sql` baseline files do not include later hardening. Public room APIs are invoker wrappers around narrowly scoped private functions.

## Validation and references

`npm run check` runs local unit/PostgreSQL and browser checks. Browser payment tests use HTTP doubles and do not prove a completed Stripe payment. Hosted smoke checks separately exercise database transactions and verify unauthenticated payment/download requests are rejected.

- [Stripe PromptPay](https://docs.stripe.com/payments/promptpay)
- [Stripe fulfillment](https://docs.stripe.com/checkout/fulfillment)
- [Private downloads](https://supabase.com/docs/guides/storage/serving/downloads)
- [Publishable and secret keys](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys)
- [Intentional RLS-without-policy notices](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
