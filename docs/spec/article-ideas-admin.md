# Article Ideas Admin Specification

Status: Stitch design approved; local implementation and verification complete. Production D1/Access setup and release pending. Application name: 記事アイデア.

## Purpose and audience

A private workspace for the blog owner to collect article ideas and move them toward writing.
The owner is the only user. Authentication is required before viewing or modifying any saved idea.

Confirmed scope: add, edit and delete ideas; tags; reference URLs; search; and status management.
Statuses are アイデア, 調査中, 執筆中, 記事化済み.

## Proposed architecture

| Area | Choice |
| --- | --- |
| Language | TypeScript |
| Frontend and API | Astro, matching the existing blog's Astro 5 conventions |
| Styling | Scoped admin CSS and Lucide icons; existing public blog retains Tailwind CSS |
| Hosting | The existing `tech-blog` Cloudflare Worker; admin under `/admin` |
| Storage | Cloudflare D1, with separate local development storage |
| Authentication | Path-scoped Cloudflare Access plus server JWT validation; allow only the owner's selected email |
| Repository | Existing Astro app; admin UI and endpoints are conditionally registered for Cloudflare builds |
| Publication | Existing main-merge deployment; public articles stay prerendered, admin and API render on demand |

Protect `/admin` and `/admin/*`, with the API inside `/admin/api/*`; public articles remain accessible without login.
Do not enable whole-Worker Access protection, which would also lock the public blog.
Apply the owner identity check on every admin request, including alternate hostnames, even when the Access edge policy is absent.
GitHub Pages continues to host the public blog staging site; exclude dynamic admin routes from its build rather than prerendering private pages or data.
Production storage is server-side so ideas remain available across devices and browser restarts.
Local development uses a local database and a development-only identity; deployed environments must never accept that identity.

## Screens and routes

| Screen | Proposed route | Behavior |
| --- | --- | --- |
| Sign in | Cloudflare Access login | Authenticate the allowed owner before entering the application |
| Idea list | `/admin/` | Search, filter by status/tag, sort by update time, select an idea, create a new idea |
| Idea editor | Side panel on desktop; dedicated view on mobile | Edit title, notes, status, tags and reference URLs; save or discard |
| Delete confirmation | Dialog | Identify the idea being deleted and require explicit confirmation |

The admin uses the existing blog hostname. Do not invent an account subdomain or create a separate admin Worker.

## Features and behavior

1. Create an idea with a required title and optional notes, tags, reference URLs and status.
2. View and edit an existing idea. The list updates after a successful save.
3. Delete only after confirmation. Canceling preserves the idea.
4. Search titles, notes and tags; combine search with status and tag filters.
5. Change status without publishing an article. 記事化済み is an organizational label only.

Empty, loading, saving, error and no-search-results states must be designed.
Keep unsaved edits when saving fails; warn before discarding unsaved changes.
Do not fill an empty production account with invented saved ideas.
Reference URLs must be valid HTTP(S) URLs. User-entered content is rendered as text rather than executable HTML.

## Data model

| Entity | Fields |
| --- | --- |
| Idea | id, title, notes, status, created_at, updated_at, revision |
| Tag | id, name |
| IdeaTag | idea_id, tag_id |
| Reference | id, idea_id, url, sort_order |

Idea has many tags through IdeaTag and has many references.
Use prepared SQL statements and transactions for related updates.
Use revision checks to reject overwriting changes made in another tab or device.
Store timestamps in UTC and display them in the user's local time zone.

## Authentication and API constraints

- Protect UI and API requests, including direct API calls.
- Validate Access JWT signature, issuer, audience and expiry using a maintained JWT library.
- Verify the authenticated identity against the configured owner email.
- Deny access if production auth configuration is missing; do not fall back to a public mode.
- Keep authorization checks on the server; hiding controls is not authorization.
- Require same-origin mutations and validate request bodies before saving.
- Disable caching of private responses and add noindex to the admin interface.
- API errors must not expose secrets or database internals.

## Deployment and verification

Use an isolated branch from staging and the existing staging -> main review flow.
The public blog's Pages and Cloudflare builds must continue to pass.
Test admin CRUD against local D1, rejected unauthenticated requests, URL validation, search/filter combinations,
delete cancellation, save failures, and conflicting updates.
Verify the UI in desktop and mobile browsers, including keyboard navigation and long Japanese titles.

Production setup requires a D1 database/binding on the existing Worker and path-scoped Cloudflare Access configuration.
Do not deploy publicly or claim login works until the actual Access policy and server verification are configured.
GitHub Actions may deploy the admin after required resources are configured; do not add an always-failing production job while IDs are unknown.

## Out of scope for the first version

Automatic article publication, direct GitHub commits/PRs from the UI, AI article generation, collaborative editing,
analytics dashboards, file uploads, and importing existing Markdown memos without a separate user request.

## Remaining production configuration

- During deployment setup: allowed owner email, Access issuer/audience and D1 binding IDs.

Suggested visual direction: a compact Japanese editorial workspace, neutral surfaces, teal accents,
a scan-friendly list and an unframed editor. Use the blog identity lightly; prioritize frequent data entry over decoration.

## Design review artifacts

### Approved visual refinement

The owner approved the softer comparison variant on 2026-11-17. Keep the existing desktop list/editor
layout and mobile navigation. Use muted green actions (`#447e6e`), pale green-gray surfaces,
8px control corners, quieter separators, and more space between ideas and editor fields.
Keep status colors distinct, keyboard focus visible, and text contrast readable.
This refinement changes presentation only; authentication, storage and deployment scope are unchanged.

Stitch project: https://stitch.withgoogle.com/projects/14068518729790887197
Design system: `assets/4da011c14c6143449633b62ce4dd02bc`.

- Desktop list/editor screenshot: `projects/14068518729790887197/files/0a8dc22748754bb59b85ca1c6f3a7270`.
- Mobile editor: `projects/14068518729790887197/screens/64d18a5f99c1460a95e66ac0f5f13cc5`.
- Delete confirmation: `projects/14068518729790887197/screens/55bee478eadc44dcb66bf729cb60c95e`.

These are review mockups, not an implemented or deployed application.
Do not interpret design-generator suggestions as scope additions: Markdown preview, AI tools, dark mode and undo-after-delete are not part of the agreed first version.
Use 44px minimum touch targets on mobile even where desktop design tokens use smaller controls.
Maintain visible keyboard focus and render notes as plain text in the first version.
