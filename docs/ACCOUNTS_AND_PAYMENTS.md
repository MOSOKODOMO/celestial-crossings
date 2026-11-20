# Accounts and payments setup (Supabase + Stripe)

The website code for accounts is finished and tested. It stays switched off until
you connect a Supabase project. Payments are prepared on the server side but are not
offered on the website until you decide what they unlock.

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

## Part 2 — Payments (when you decide what to sell)

1. Create a Stripe account. For Thai customers, enable **PromptPay** under Payment methods. PromptPay needs THB prices.
2. Create a Product and a Price in Stripe. Copy the price ID (`price_...`).
3. Install the Supabase CLI and run:
   ```sh
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase secrets set STRIPE_SECRET_KEY=sk_test_... SITE_ORIGIN=https://mosokodomo.github.io STRIPE_PRICE_CUSTOMWEEK=price_...
   supabase functions deploy create-checkout
   supabase functions deploy stripe-webhook --no-verify-jwt
   ```
4. In Stripe → Developers → Webhooks, add the endpoint `https://<project>.supabase.co/functions/v1/stripe-webhook` with the event `checkout.session.completed`. Copy its signing secret, then run `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...`.
5. In the website, call `MooJaiAccount.startCheckout('customWeek')` from the button that should start a purchase. Use `MooJaiAccount.entitlements()` to check what the user owns. This is the step still waiting on your decision about the paid item.
6. Test the whole flow with Stripe test cards before you switch to live keys.

### Before taking real money

- Write Terms of Service, a refund policy and a privacy policy, in Thai and English. Under Thailand's PDPA, the privacy policy must cover account emails.
- If you sell card draws, publish the odds next to the purchase button. The collector already shows them. Move the draw logic server-side so results can't be edited in the browser. The current collector is a browser-only simulation.
- Fortune content must stay framed as reflection and entertainment.
