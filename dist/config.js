// MooJai site configuration. Everything here is public: it ships to every visitor.
// Never put a Supabase service-role key or a Stripe secret key in this file.
//
// Accounts stay switched off until both Supabase values are filled in.
// See docs/ACCOUNTS_AND_PAYMENTS.md for the setup steps.
window.MOOJAI_CONFIG = {
  version: '0.4.0',

  // Supabase project → Settings → API. The anon key is designed to be public;
  // row-level security in supabase/schema.sql protects the data.
  supabaseUrl: '',          // e.g. 'https://abcdefgh.supabase.co'
  supabaseAnonKey: '',

  // Payments are prepared but not offered in the interface yet. When a paid
  // item is chosen, list it here and call MooJaiAccount.startCheckout(key).
  products: {},             // e.g. { customWeek: { priceLabel: '฿49' } }

  // Bug reports: with Supabase configured they are saved to the bug_reports
  // table. Without it, visitors can open a prefilled GitHub issue or copy the report.
  githubRepo: 'MOSOKODOMO/celestial-crossings',
  supportEmail: ''          // optional, e.g. 'hello@moojai.app'
};
