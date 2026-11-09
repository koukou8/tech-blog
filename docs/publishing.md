# Staging and production

## Branches and review

1. Fetch `origin`, then create `codex/<slug>` from `origin/staging` in a clean checkout.
2. Write the article with `draft: false`, preserving source memos.
3. Open a non-draft PR into `staging`. PR Checks builds both deployment targets.
4. CodeRabbit reviews PRs into both `staging` and `main` when its GitHub App is installed and enabled for this repository.
5. Merge into `staging` after review. Deploy Staging publishes GitHub Pages.
6. Verify the deployed staging commit, links, images, and article content.
7. On the user's acceptance, open a PR with head `staging` and base `main`.
8. Review again, then merge to publish through Deploy Production.

```bash
git fetch origin
git switch -c codex/example-article origin/staging
gh pr create --base staging --head codex/example-article --body-file /tmp/article-pr.md
# After staging acceptance:
gh pr create --base main --head staging --body-file /tmp/release-pr.md
```

Use merge commits for `staging` -> `main` releases. Keep the long-lived staging branch after merging.
Avoid squash/rebase merges for releases: preserving ancestry makes subsequent release PRs easier to review.
If staging has moved since acceptance, verify the newer content before release; a release PR promotes the entire staging branch.

## Staging: GitHub Pages

- Intended URL: `https://koukou8.github.io/tech-blog/` (confirm in Settings -> Pages).
- Source: GitHub Actions, workflow `Deploy Staging`.
- Only pushes to `staging` deploy; dispatch from other branches is ignored.
- Build: `npm run build:staging`.
- Output: static HTML, no Cloudflare adapter or worker.
- All HTML, including the 404 page, contains `noindex, nofollow, noarchive`.
- Internal component and Markdown URLs use `/tech-blog/`.
- GitHub Pages does not run server-side Basic authentication. Noindex does not restrict access, protect unpublished information, or guarantee that every crawler obeys it.
- Do not add a robots.txt Disallow-all rule: crawlers need to fetch pages to see noindex.
- Never collect production analytics on this hostname when GA4 is added.

The repository is private. The GitHub API currently rejects Pages activation because the account plan does not support Pages for this repository.
Enable a plan supporting private-repository Pages, or explicitly choose a separate public staging-output repository and adapt the workflow.
Do not make this source repository public as a workaround.

After the plan issue is resolved:

1. Settings -> Pages -> Build and deployment -> Source: GitHub Actions.
2. In Settings -> Environments -> github-pages, allow deployment only from `staging`.
3. Merge the setup PR into `staging` and inspect Deploy Staging's reported URL.

## Production: Cloudflare Workers

- The production Worker name is `tech-blog` in `wrangler.jsonc`. The first production deployment creates or updates this Worker. Keep the old `tech-blog-temp` Worker until the new deployment and any domain migration have been verified; changing the name does not migrate its bindings, secrets, or domains.
- Only pushes to `main` deploy. The production environment is named `production`.
- Register `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as production environment or repository secrets.
- The token needs the permissions required to deploy this Worker; use a scoped token for the intended account.
- In Settings -> Environments -> production, allow deployment only from `main`.
- Keep the production hostname/routes in Cloudflare. This change does not invent or replace a domain.
- Before the first main release, disable any existing Workers Builds Git integration or explicitly migrate its production branch away from `master`. Use one deployment mechanism to avoid duplicate or unexpected deployments.
- Once the first release is accepted, change the repository default branch from `master` to `main`.
- Do not delete `master` or `stg` during setup. They are retained for the existing configuration and history.

Secrets are not required or available to PR checks. A missing deployment secret causes the production workflow to fail before deployment.
The first production release remains a user-approved action.

## CodeRabbit and merge protection

Install/enable the [CodeRabbit GitHub App](https://github.com/apps/coderabbitai) for `koukou8/tech-blog`.
The `.coderabbit.yaml` file enables automatic reviews for both exact branch names, with Japanese article review guidance.
Configuration alone does not install the App or guarantee a review under the account's plan.
Land this configuration on the target branch before relying on subsequent automatic reviews.

Protect `staging` and `main` against direct pushes and force pushes. Require PRs and these checks:

- `Build (staging)`
- `Build (production)`
- `Release source`

Enable the appropriate CodeRabbit check only after its actual check name and behavior have been confirmed on a PR.
Protection/ruleset availability depends on the GitHub plan for this private repository.

## Local verification

Use Node.js 22 or newer (CI uses 22).

```bash
npm ci
npm test
npm run build:staging
npm run check:build -- --target staging --base /tech-blog
npm run build
npm run check:build -- --target production
```

The generated-page check verifies environment-specific noindex, base paths, local image/style/favicon assets, and absence of Worker output in staging.
The existing RSS navigation points to `/rss.xml`, but this repository currently has no feed route. This setup preserves that link; RSS generation is separate work.

The installed Codex `tech-blog-article` skill follows this flow. Original Claude skills are retained unchanged; use this repository's workflow when giving Claude new publishing instructions.
