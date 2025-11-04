# Branch protection setup (guide)

Use the GitHub CLI to configure branch protection rules for `main` and other branches.

Example commands (requires `gh` and appropriate permissions):

```bash
# protect main (require PR reviews, status checks and admins cannot push)
gh api --method PUT /repos/{owner}/{repo}/branches/main/protection -f required_status_checks.contexts='["generate-and-test"]' -f required_pull_request_reviews.dismiss_stale_reviews=true -f enforce_admins=true

# Alternatively, use the simpler gh command
gh repo edit --default-branch=main
gh api repos/{owner}/{repo}/branches/main/protection -F required_status_checks='{"strict": true, "contexts": ["generate-and-test"]}'
```

Replace `{owner}` and `{repo}` with `gapontegroupgithii-maker` and `AST-04-11-2025` respectively. You must have `repo` scope when using a PAT or be authenticated with `gh auth login`.
