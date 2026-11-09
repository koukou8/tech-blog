# Publishing workflow

- Read `docs/publishing.md` before article, branch, PR, or deployment work.
- Start article branches as `codex/<slug>` from current `origin/staging`.
- Open article PRs against `staging`, never directly against `main`.
- A merge into `staging` deploys to GitHub Pages with `noindex`.
- After the user accepts staging, open a release PR from `staging` to `main`.
- A merge into `main` deploys to Cloudflare Workers. Do not merge or publish without the user's authorization.
- Do not use the legacy `stg` or `master` branches for new publishing work.
- Preserve the user's unrelated edits and the original Claude skill files.
- Run `npm test`, both builds, and their generated-output checks for deployment changes.
- Staging is publicly readable when Pages is enabled; noindex is not authentication.
