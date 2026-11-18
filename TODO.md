# Tilen Kungu Website — Delivery Checklist

## UI pass — approved Signal & Craft direction

- [x] Replace the Tailwind CDN homepage with semantic editorial layout.
- [x] Establish shared forest-green, deep-green, yellow, slate, typography, spacing, focus, and motion tokens in `styles.css`.
- [x] Add responsive sticky navigation, active section state, mobile menu, and skip link.
- [x] Clarify the hero hierarchy with outcome-led copy, two CTAs, proof metrics, and image rail.
- [x] Preserve and reorganize the existing capabilities, services, portfolio subjects, testimonials, WhatsApp CTA, contact form, and authentication entry point.
- [x] Add same-origin API calls so deployed authentication and contact flows do not target `localhost`.
- [x] Restyle `login_register.html` with the shared visual language and accessible form labels/status messages.
- [x] Add reduced-motion handling, visible focus states, and responsive layouts.
- [x] Add `public/manus-routes.json` for the managed preview workflow.
- [x] Add resume-backed positioning, the Testing & Operations capability, and the LottoOps inventory-platform case study using only details supplied in the uploaded resume.
- [x] Add crawler-visible SEO metadata to the homepage: canonical URL, title, description, keywords, Open Graph, Twitter Card, and Person JSON-LD.
- [x] Add `sitemap.xml` for the public homepage and `robots.txt` exclusions for APIs and authentication.
- [x] Mark the authentication page `noindex, nofollow`.
- [x] Create the reusable `portfolio-refresh-seo` skill for resume-backed portfolio refreshes and SEO validation.

## Acceptance criteria

- [x] `node --check app.js` passes.
- [x] No `localhost:3000` or `127.0.0.1:3000` references remain in the UI files.
- [x] All existing homepage image assets referenced by the redesign are present.
- [x] Homepage loads in a local static preview and exposes the expected navigation, CTAs, form fields, and footer links.
- [x] Login/register page loads in a local static preview and exposes both auth modes.
- [ ] Verify production deployment after pushing the UI commit.
- [ ] Test authenticated contact submission against production API credentials/database.

## Next phase — backend hardening

- [x] Make session storage serverless-safe and durable across Vercel instances using hashed bearer tokens in PostgreSQL, SQL expiry checks, logout deletion, and a configurable seven-day default lifetime.
- [x] Add an advisory-lock migration runner and explicit PostgreSQL migration for `users`, `contacts`, `sessions`, indexes, and contact ownership.
- [x] Gate API requests on migration readiness and expose database connectivity in `/api/health`.
- [x] Add `npm run db:migrate` and document `DATABASE_URL`, pool, TLS, and session settings in `.env.example`.
- [ ] Add request validation, normalization, and useful error responses.
- [ ] Add rate limiting and abuse protection to auth/contact endpoints.
- [ ] Confirm SMTP configuration, sender identity, and delivery failure handling.
- [ ] Audit production secrets, CORS policy, security headers, and logging.
- [ ] Add API/integration tests for registration, login, logout, session, and contact flow.

The migration command was syntax-checked but could not execute in this sandbox because no local PostgreSQL server is available. It must be run against the configured production/staging `DATABASE_URL` before relying on the hardened endpoints.
