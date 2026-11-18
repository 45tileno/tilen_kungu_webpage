# Tilen Kungu Website — UI-First Redesign Plan

## Goal

Upgrade the existing portfolio and IT-services website from a large Tailwind CDN page into a polished, responsive, accessible professional site. Preserve the current services, portfolio subjects, authentication entry points, WhatsApp CTA, and contact flow while improving hierarchy, trust, visual consistency, and mobile usability.

## Current Findings

- `index.html` is a 768-line monolith containing markup, inline CSS, Tailwind CDN usage, and all browser logic.
- The visual system mixes gradients, glass cards, rounded pills, and generic Tailwind defaults without a single strong brand language.
- The hero is visually heavy and text-dense; the primary conversion path is not clear enough.
- Skills and portfolio sections repeat similar card patterns and need stronger grouping, scannability, and content hierarchy.
- Contact and login/register pages do not share a coherent design system.
- Browser code still points to `http://localhost:3000`, which breaks production API calls from the deployed site.
- The site needs a route manifest for the managed preview workflow and a more maintainable asset/style/script structure.

## Design Options

1. **Signal & Craft — 0.62 probability (chosen):** editorial IT studio aesthetic with dark forest green, deep leaf green, warm yellow accent, strong typography, technical labels, and asymmetrical section composition.
2. **Soft Systems — 0.21 probability:** calm light interface with cool blue surfaces, rounded cards, and friendly service-first messaging.
3. **Field Engineer — 0.17 probability:** darker operational aesthetic with lime status accents, utility panels, and a more technical dashboard feel.

## Chosen Design Direction: Signal & Craft

### Design Movement

Modern editorial technology portfolio: confident typography, deliberate whitespace, dark signal panels, and bright accent markers inspired by network diagrams and studio case studies.

### Core Principles

- Make the next action obvious: view work or start a conversation.
- Use editorial hierarchy rather than equal-weight card grids.
- Show proof through concise outcomes, services, and selected work.
- Keep motion subtle, purposeful, and respectful of reduced-motion preferences.

### Color Philosophy

Dark forest green communicates reliability, stability, and technical depth. Deep leaf green provides the primary brand signal. Warm yellow is reserved for emphasis and action, making important words and CTAs easy to spot. Soft slate surfaces keep long-form content readable.

### Layout Paradigm

Use a strong left-aligned editorial rail for headings and a flexible content field for cards and details. Sections alternate between bright reading surfaces and dark signal panels instead of placing every element inside centered grids.

### Signature Elements

- Small uppercase technical labels such as `01 / CAPABILITIES` and `AVAILABLE FOR WORK`.
- Thin signal lines, corner markers, and numbered service/portfolio items.
- A dark hero with a bright yellow statement and a compact proof strip.

### Interaction Philosophy

Interactions should feel responsive and tactile without being noisy: clear hover elevation, visible focus rings, active navigation state, mobile menu transitions, and inline form feedback. No essential information depends on hover.

### Animation

Use short fade/translate reveals for section content, a restrained hero image crossfade, and hover transitions under 250ms. Disable nonessential movement under `prefers-reduced-motion: reduce`.

### Typography System

Use `Manrope` for display and navigation text, with `Inter` for body copy and form labels. H1 should be bold and compact; section labels small and tracked; body copy should stay around 16–18px with a readable measure.

### Brand Essence

A practical IT partner for people and small businesses who need dependable technology that works in the real world. Personality: capable, clear, hands-on.

### Brand Voice

Headlines are direct and outcome-led. CTAs are specific and welcoming.

- “Technology that earns its place in your business.”
- “Tell me what needs to work better.”

### Wordmark & Logo

Keep the Tilen Kungu wordmark as text for now, but add a small signal-bar mark that can later become a favicon and social avatar.

### Signature Brand Color

Deep leaf green `#1F6B52`, paired with warm signal yellow `#F4C84A`.

## Implementation Plan

### UI structure

- Extract reusable design tokens, reset styles, responsive layout rules, and components into `styles.css`.
- Extract browser interactions into `app.js`.
- Keep `index.html` semantic and focused on content.
- Add a shared visual system to `login_register.html`.
- Add accessible labels, focus states, `aria-expanded`, and reduced-motion handling.
- Add `public/manus-routes.json` with the current page routes.

### Homepage changes

- Redesign sticky navigation with active section state and improved mobile menu.
- Rework hero around a stronger outcome-led statement, two clear CTAs, proof metrics, and a visual project rail.
- Add an editorial “what I solve” section before the long skills list.
- Convert skills into a more scannable capabilities list with concise descriptions.
- Rework services as outcome-focused service panels.
- Rework portfolio cards with clearer case-study structure, category labels, and consistent image treatment.
- Improve testimonials with stronger attribution treatment.
- Improve contact section with a two-column layout, trust notes, and more useful form feedback.
- Improve footer hierarchy and social links.

### Technical UI fixes included in this pass

- Replace production-breaking `http://localhost:3000` API references with same-origin relative `/api` paths.
- Keep authentication and contact behavior intact while making loading/error states visible.
- Preserve existing image assets; do not introduce unplanned placeholder imagery.
- Add metadata, theme color, and social-preview basics.

## Deferred Backend Work

After the UI pass is stable, address serverless-safe sessions, PostgreSQL schema migrations for `users` and `contacts`, request validation, rate limiting, SMTP configuration, and production secrets.

## Project Structure Target

- `index.html`: homepage content and semantic structure.
- `styles.css`: tokens, layout, components, responsive rules, motion.
- `app.js`: navigation, auth UI, contact form, hero slideshow.
- `login_register.html`: shared auth UI and auth interactions.
- `server.js`: existing Express API, to be hardened in the next phase.
- `api/index.js`: Vercel entrypoint.
- `public/manus-routes.json`: managed route manifest.
- `vercel.json`: Vercel routing and asset bundling.
