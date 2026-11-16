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
  - There are three templates: code, invite, and request alert. Request alerts go to clients@.
- **Invoices:** add a pay-by-card link per invoice (for example a Stripe payment link), or leave it blank for bank transfer.

## Local
```
npm install && npm run build
npx wrangler d1 execute dh-client-area --local --file schema.sql
npx wrangler pages dev dist --binding DEV_ECHO=1 --port 8788   # codes are returned instead of emailed
```
