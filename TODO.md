# Tilen Kungu Website — Delivery Checklist

## UI pass — approved Signal & Craft direction

- [x] Replace the Tailwind CDN homepage with semantic editorial layout.
- [x] Establish shared navy, indigo, yellow, slate, typography, spacing, focus, and motion tokens in `styles.css`.
- [x] Add responsive sticky navigation, active section state, mobile menu, and skip link.
- [x] Clarify the hero hierarchy with outcome-led copy, two CTAs, proof metrics, and image rail.
- [x] Preserve and reorganize the existing capabilities, services, portfolio subjects, testimonials, WhatsApp CTA, contact form, and authentication entry point.
- [x] Add same-origin API calls so deployed authentication and contact flows do not target `localhost`.
- [x] Restyle `login_register.html` with the shared visual language and accessible form labels/status messages.
- [x] Add reduced-motion handling, visible focus states, and responsive layouts.
- [x] Add `public/manus-routes.json` for the managed preview workflow.

## Acceptance criteria

- [x] `node --check app.js` passes.
- [x] No `localhost:3000` or `127.0.0.1:3000` references remain in the UI files.
- [x] All existing homepage image assets referenced by the redesign are present.
- [x] Homepage loads in a local static preview and exposes the expected navigation, CTAs, form fields, and footer links.
- [x] Login/register page loads in a local static preview and exposes both auth modes.
- [ ] Verify production deployment after pushing the UI commit.
- [ ] Test authenticated contact submission against production API credentials/database.

## Next phase — backend hardening

- [ ] Make session storage serverless-safe and durable across Vercel instances.
- [ ] Add explicit PostgreSQL migrations for `users` and `contacts`.
- [ ] Add request validation, normalization, and useful error responses.
- [ ] Add rate limiting and abuse protection to auth/contact endpoints.
- [ ] Confirm SMTP configuration, sender identity, and delivery failure handling.
- [ ] Audit production secrets, CORS policy, security headers, and logging.
- [ ] Add API/integration tests for registration, login, logout, session, and contact flow.
