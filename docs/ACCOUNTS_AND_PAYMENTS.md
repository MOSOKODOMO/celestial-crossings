# Accounts and payments setup (Supabase + Stripe)

Accounts stay switched off until a MooJai Supabase project is connected. A Thai/English
checkout for a **฿49 card-and-wallpaper bundle** is implemented at `payment.html`.
It offers PromptPay QR and cards through Stripe Checkout. Both the frontend payment
flag and server payment flag default to off. No live merchant or backend is connected.
The current tests use Stripe/Supabase doubles, plus real PostgreSQL/PGlite for access
policies. They do not represent a real PromptPay payment or deployed backend.

## How it fits together

```
Visitor's browser (GitHub Pages)
  ├─ Sign up / sign in / reset password ──► Supabase Auth (stores email + hashed password)
  ├─ "Report a problem"                 ──► Supabase table bug_reports (insert only)
  └─ Buy (later)  ──► Edge Function create-checkout ──► Stripe Checkout page
                                   Stripe ──► Edge Function stripe-webhook ──► entitlements table
```

Birth dates and readings are never sent to Supabase or Stripe. GitHub Pages can keep
hosting the website; Supabase provides the server side.

## Part 1 — Accounts (about 15 minutes)

1. Create a free project at supabase.com. Choose the Singapore or Sydney region (closest to Thailand and Australia).
2. **SQL Editor** → paste all of `supabase/schema.sql` → Run.
3. **Authentication → Sign In / Providers → Email**: keep *Confirm email* on. Set minimum password length to 8.
4. **Authentication → URL Configuration**
   - Site URL: `https://mosokodomo.github.io/celestial-crossings/`
   - Redirect URLs: add the same URL plus `https://mosokodomo.github.io/celestial-crossings/reading.html` and `http://127.0.0.1:4173/**` for local testing.
5. **Authentication → Emails**: edit the templates. Add Thai wording, and set the sender name to MooJai. The default Supabase mail sender has a low hourly limit. Before launch, add your own SMTP (for example Resend or Brevo) under *SMTP Settings*.
6. **Project Settings → API**: copy the *Project URL* and the *anon public* key into `dist/config.js`:
   ```js
   supabaseUrl: 'https://xxxx.supabase.co',
   supabaseAnonKey: 'eyJ...',
   ```
   Never paste the `service_role` key into any website file. The scheduled site check fails if a secret-looking key appears in `config.js`.
7. Run `npm run check`, then commit and push. The account button appears in the header of both pages.

Bug reports then arrive in **Table Editor → bug_reports**. Without Supabase, the button opens a prefilled GitHub issue instead.

## Pet world and server-owned charms

The world is at `world.html`. Preview works without an account service. To enable
live accounts, apply `supabase/world.sql` after the initial schema and deploy
**both** `draw` and `world-action` with their `_shared` files. The collector uses
server draws whenever signed in; deploy these before enabling account settings.

The functions use platform-provided `SUPABASE_URL`, `SUPABASE_ANON_KEY` and
`SUPABASE_SERVICE_ROLE_KEY` on the server. Set `SITE_ORIGIN` to the allowed origin
(default `https://mosokodomo.github.io`; comma-separated origins are supported).
`FREE_DRAWS_PER_DAY` defaults to 5, maximum 100. Online draws/rewards reset at
**00:00 UTC**. Editable browser preview history is never imported as ownership.

Add `world.html` to Auth redirect URLs. Disable **Allow public access** in
Realtime settings. The SQL creates server-owned inventory/rewards, a minimal
public roster, insert-only reports, room leases, and policies binding broadcast
publishing to an account's private topic. Check that unrelated permissive
policies cannot grant world-topic access. Never put a service key in config.js.

The live checklist is in `docs/OPEN_WORLD_PLAN.md`. Local tests execute the SQL
against PostgreSQL/PGlite and use browser HTTP/channel doubles. They do not prove
hosted delivery, quotas or token renewal. Read reports through trusted admin
access and establish moderation/data-retention practices before public chat.

## Part 2 — Thai payments (฿49, one-time)

1. Confirm the receiving country and merchant eligibility. Stripe currently supports
   PromptPay for **Thai Stripe accounts**; an Australian Stripe account must not be
   assumed eligible. Enable PromptPay and cards in the merchant dashboard.
2. Create a **one-time THB price of 4900 satang (฿49)** for `cardWallpaper`. The server
   rejects inactive prices, subscriptions, other currencies and other amounts.
3. Set these **server-side secrets**, initially with Stripe test credentials:
   - `STRIPE_SECRET_KEY`: Stripe secret key.
   - `STRIPE_PRICE_CARDWALLPAPER`: the `price_...` ID from step 2.
   - `STRIPE_WEBHOOK_SECRET`: the signing secret for this exact webhook endpoint.
   - `SITE_URL`: `https://mosokodomo.github.io/celestial-crossings/` including its path.
   - `PAYMENTS_ENABLED`: leave `false` until delivery and merchant setup are ready.
4. Deploy `create-checkout`, `checkout-status`, and `stripe-webhook`, including their
   shared `payments.mjs`. `supabase/config.toml` disables the gateway JWT check for
   these functions: the first two validate the user's token against Supabase Auth;
   the webhook validates Stripe's HMAC signature. Discover current CLI flags with
   `supabase functions deploy --help` before deployment.
5. Register `https://<project>.supabase.co/functions/v1/stripe-webhook` for
   `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
   Failed, cancelled or unpaid sessions never grant a purchase record. A delayed
   webhook can also be recovered through the authenticated status endpoint, which
   fetches the payment directly from Stripe before recording it.
6. Apply the current `schema.sql` to a new MooJai project. For an existing project,
   apply its entitlement grants as an incremental migration. Both modern default
   publishable/secret key maps and legacy keys are supported by the payment handlers.
   The frontend config's `supabaseAnonKey` can contain a modern publishable key.
7. Complete the bundle delivery before enabling real payments: approve the final
   card/wallpaper selection flow, store paid wallpaper originals privately, and
   serve them only after checking the signed-in account's entitlement. The Growth
   wallpaper renders are currently local review assets, not a live paid-download
   catalogue. The payment code records purchases; it does **not yet deliver the
   card/wallpaper or grant pet-world inventory**. Repeated bundle purchases and
   per-card delivery need a product-specific fulfillment model before activation.
8. Add `payment.html` to Supabase Auth redirect URLs. Run a complete Stripe test-mode
   purchase, late webhook, retry and refund exercise. Verify the purchase record and
   actual delivered bundle with two separate user accounts.
9. Only then enable `payments.enabled` in `dist/config.js` and `PAYMENTS_ENABLED=true`
   on the backend. The site header adds a Shop link automatically. Switching the
   frontend flag off does not stop webhook processing for already-paid purchases.

The fixed server return page prevents redirects to another website. Request UUIDs
become Stripe idempotency keys, and the unique session ID in `entitlements` prevents
duplicate records. Never unlock a product based on `?checkout=success` or a screenshot
of a bank transfer. Configure provider receipts and operational handling of refunds;
automatic refund-related entitlement revocation is not implemented here.

References verified during implementation:
- [Stripe PromptPay eligibility and payment flow](https://docs.stripe.com/payments/promptpay)
- [Stripe fulfillment and delayed confirmation](https://docs.stripe.com/checkout/fulfillment)
- [Stripe supported checkout languages](https://support.stripe.com/questions/supported-languages-for-stripe-checkout-and-payment-links)
- [Supabase publishable and secret keys](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys)

### Before taking real money

- Write Terms of Service, a refund policy and a privacy policy, in Thai and English. Under Thailand's PDPA, the privacy policy must cover account emails.
- If paid random draws are introduced, display their odds beside the purchase and use server-owned inventory. The current card/wallpaper payment scaffold does not sell draws or change the free preview.
- Fortune content must stay framed as reflection and entertainment.
