# Branch Protection Policy for `main`

To maintain production stability, security, and continuous quality, the `main` branch is protected against direct pushes and unverified changes.

---

## Required Protection Rules

1. **Require a pull request before merging**:
   - Direct commits and pushes to `main` are disallowed.
   - All code contributions must be proposed via feature branches and Pull Requests.
   - Require review thread resolution before merging.

2. **Require status checks to pass before merging**:
   - The GitHub Actions workflow **`Lint, Typecheck, Test & Build`** (`.github/workflows/ci.yml`) must pass cleanly.
   - Status checks required:
     - Prettier code style check (`npm run format:check`)
     - ESLint analysis (`npm run lint`)
     - Astro typecheck (`npm run check`)
     - Cloudflare Worker typecheck (`npx tsc --noEmit --project workers/api/tsconfig.json`)
     - Vitest unit tests (`npm test`)
     - Static production build & SEO audit script (`npm run build`)

3. **Require branches to be up to date before merging**:
   - Ensures feature branches are tested against the latest HEAD of `main`.

4. **Prevent destructive actions**:
   - Force pushes are blocked (`non_fast_forward`).
   - Branch deletion is blocked (`deletion`).

---

## Configuring via GitHub UI or GitHub CLI

### Option A: Using GitHub Web UI
1. Navigate to **Settings** &rarr; **Rules** &rarr; **Rulesets** (or **Branches** &rarr; **Branch protection rules**).
2. Click **New branch ruleset**.
3. Name: `Protect main branch`.
4. Target branch: `main` (include `refs/heads/main`).
5. Check:
   - **Require a pull request before merging**
   - **Require status checks to pass**: add `Lint, Typecheck, Test & Build`
   - **Block force pushes**
   - **Prevent deletions**
6. Click **Save changes**.

### Option B: Using GitHub CLI with the Ruleset JSON
```bash
gh api \
  --method POST \
  -H "Accept: application/vnd.github+json" \
  /repos/:owner/:repo/rulesets \
  --input .github/rulesets/main-protection.json
```
