# DH client area

https://app.dhwebsiteservices.co.uk. This is the Cloudflare Pages project `dh-client-portal`. A push to `main` deploys it.

- **Sign-in:** the client enters their email and we email them a 6-digit code. There are no passwords and no Microsoft accounts.
  - Codes last 10 minutes. After 5 wrong tries the email is locked for 15 minutes.
  - Sessions last 30 days, in an HttpOnly cookie.
- **Data:** stored in the private D1 database `dh-client-area` (`schema.sql`). Only this project's Functions can read it, so none of it is in the shared Supabase.
- **Staff:** owners (`OWNERS` in wrangler.toml, David) and anyone an owner adds on the **Team** page (the `staff` table) see every client and can edit. Only owners can add or remove staff, and removing someone signs them out at once. Staff can:
  - website links and the "now" line;
  - updates, requests, invoices, documents;
  - who can sign in, with an optional invite email.
- **Email:** sent through the main site's relay, `DH-Website-New/functions/api/client-mail.js`. This project only queues a one-time job in `mail_jobs`; the relay collects it from `/api/mail-job/<id>` and sends it.
  - There are five templates: code, invite, request, notify and alert. Request and alert emails go to clients@.
- **Invoices:** add a pay-by-card link per invoice (for example a Stripe payment link), or leave it blank for bank transfer.

## What's in it (v3, Nov 2026)
**Clients** get one area with these tabs:
- **Home:** website up/down, visits and enquiries this month, a 30-day chart, the latest update, project stage, and anything waiting on them (invoices to pay, designs to approve).
- **Website:** uptime and load time (checked when the page opens, at most every 10 minutes), plus visits over 30 or 90 days or 12 months, top pages and traffic sources.
- **Requests:** quick forms (opening hours, offer, menu/prices, photos, something else) with attachments. Each request is a back-and-forth thread with a status.
- **Files:** "from you" and "from DH". Up to 10 MB each, stored in D1 in 1 MB chunks because R2 isn't enabled on the account. HTML and SVG are refused.
- **Project:** the six stages (brief → live), designs to approve or send back with changes, and updates.
- **Billing:** what's due and what's paid, the plan and its renewal date, and pay-by-card links.
- **Help:** guides and contact details.
- **Settings:** their name, and email notifications on or off.

**Staff** get:
- **Inbox:** requests that need a reply, design changes asked for, overdue invoices, renewals due within 30 days, and new client files.
- **Clients**, **Activity** (who did what) and **Team**.
- Every client tab with edit controls, plus **Access & notes**: who can sign in, private notes and that client's history.

**Emails:**
- The client is emailed (relay template `notify`) when we post an update, reply to a request, add an invoice, send a design for approval, add a file, or move the project stage.
- We're emailed at clients@ (template `alert`) when a client replies, uploads a file, or answers an approval.

**Visit stats:** add `<script defer src="https://app.dhwebsiteservices.co.uk/t.js" data-site="SITE_KEY"></script>` to the client's site. The key is on the client's Website tab (staff view). It uses no cookies and no personal data. To count enquiries, add `data-dh-enquiry` to the contact form.

**Database changes:** go in `migrations/`. Apply them with `npx wrangler d1 execute dh-client-area --remote --file migrations/000N_x.sql`. Keep them additive (no drops or renames), because preview branches share the production database: the account is at its D1 limit, so there's no separate preview database.

## Local
```
npm install && npm run build
npx wrangler d1 execute dh-client-area --local --file schema.sql
npx wrangler d1 execute dh-client-area --local --file migrations/0002_features.sql
npx wrangler pages dev dist --binding DEV_ECHO=1 --port 8788   # codes are returned instead of emailed
```
