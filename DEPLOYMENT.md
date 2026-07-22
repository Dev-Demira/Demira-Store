# Demira Sales Point 2 — Full Deployment Guide

This is a plain static site (HTML + CSS + JS) that talks to Supabase from the
browser. No build step. Push to GitHub, deploy to Vercel, done.

---

## 0. One-time: apply the security migration to Supabase

Open your Supabase project → SQL editor → run the contents of
`supabase/migrations/20260722_security_fixes.sql`.

This does two things:
1. Hides secret keys in `site_settings` behind a safe public view
   (`site_settings_public`) and restricts the base table to admins.
2. Revokes `EXECUTE` on `public.has_role(...)` from anonymous users.

The app already reads through `site_settings_public` on public pages, so
nothing else needs to change on your side.

---

## 1. Create your admin account (one-time, if not done yet)

1. Open the site at `/admin.html` (or `/admin` on Vercel — a rewrite is set up).
2. Click **"First time? Create the owner account"**.
3. Enter your email + password.
4. From then on, sign in at `/admin` to manage the store.

If Supabase has email confirmation on, confirm the email first.
To turn it off: Supabase → Authentication → Providers → Email → uncheck
"Confirm email".

---

## 2. Push to GitHub

```bash
cd Demira_Sales_Point_2
git init
git add .
git commit -m "Demira Sales Point 2"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

---

## 3. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import the repo.
2. Framework preset: **Other**.
3. **Root directory**: leave as `.` (project root).
4. Build command: *(leave blank)*
5. Output directory: *(leave blank)*
6. Click **Deploy**.

`vercel.json` already handles clean URLs and the `/admin` → `/admin.html`
rewrite.

---

## 4. Custom domain

1. Vercel → your project → **Settings → Domains → Add** → enter `yourdomain.com`.
2. In your domain registrar's DNS panel, add:
   - `A` record `@` → `76.76.21.21`
   - `CNAME` record `www` → `cname.vercel-dns.com`
3. Wait a few minutes for Vercel to issue SSL. Done.

---

## 5. Supabase — nothing else to set up

The site is already wired to Supabase project `pmmpradnnduixslbcvtr`.
Tables, RLS policies, the `product-images` storage bucket, and the admin
bootstrap trigger are already live.

You only need to sign in to Supabase if you want to:
- Run the security migration in step 0 above.
- Move to a different Supabase project (create a new project, run all
  migrations under `supabase/migrations/`, then update `window.__SB_URL__`
  and `window.__SB_KEY__` in `index.html` and `admin.html`).

You do **not** need to create a new Supabase account — the site works as-is.

---

## 6. What the admin dashboard can do

- **Products** — create / edit / delete, upload images with a proper file
  picker, toggle "Featured" and "In stock", fill in Highlights, Full specs,
  and Display specs with plain-text inputs (no JSON needed — the fields are
  pre-populated with the standard rows for a laptop; just type the values).
- **Categories** — create / edit / delete.
- **Site settings** — store name, tagline, hero copy, about, services intro,
  contact intro, announcement bar, WhatsApp number, Paystack public key,
  Web3Forms key, FAQs.

All changes appear live on the site on next page load — no redeploy needed.
