# Demira Sales Point 2 — Database migrations

Run in this exact order in the Supabase SQL editor:

1. `20260722_schema.sql` — tables, RBAC, RLS policies, storage bucket, triggers.
2. `20260722_seed.sql` — categories, products, site settings, FAQs.
3. `20260722_security_fixes.sql` — locks down `site_settings` and `has_role`.

After step 3, the public site reads from the `site_settings_public` view; the
admin dashboard (signed in) continues to read/write `site_settings` directly.

## First admin
The first user to sign up via `/admin` is automatically granted the `admin`
role (via the `handle_first_user_admin` trigger). Create your owner account
once, then use it to sign in from then on.
