# Create Pull Request

Create a Pull Request from the current branch to the main branch.

## Prerequisites

- All changes must be committed

## Steps

1. **Fetch latest from origin**

   - Run `git fetch origin -p` to get the latest state and prune deleted branches

2. **Review commit history**

   - Run `git log origin/main..HEAD --oneline` to see commits not in main

3. **Decide on a descriptive branch name**

   - Based on the commits, decide a descriptive branch name
   - Example: `update-dependencies`, `add-new-feature`, `fix-validation-bug`

4. **Push with the descriptive branch name**

   - Run `git push origin HEAD:<branch-name>` to push with the chosen name

5. **Create PR title and body**

   - Based on the commits, create an appropriate PR title and body
   - Use only ASCII characters (no emojis, Japanese, etc.)
   - Write in English
   - Create a temporary file `/tmp/pr_body.md` with the PR description

6. **Create PR**

   - Use `gh pr create` command with `--body-file` to create the PR

7. **Clean up**

   - Delete the temporary file after PR creation completes

## gh pr create Command Format

```bash
gh pr create --base main --head <branch-name> --title "<title>" --body-file /tmp/pr_body.md
```
