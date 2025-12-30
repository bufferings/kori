# Commit

Commit all unstaged changes.

## Steps

1. **Check changes**

   - Run `git status` and `git diff` to review the changes
   - Always verify actual diffs with `git diff`, never rely on memory or assumptions

2. **Stage changes**

   - Run `git add .` to stage all changes

3. **Verify staged changes**

   - Run `git diff --cached` to verify what will be committed
   - Always run `git diff --cached` right before committing

4. **Create commit message**

   - Create a temporary file in `/tmp` directory with the commit message (following the format below)

5. **Execute commit**

   - Run `git commit -F <temp-file>` to commit using the temporary file

6. **Clean up**
   - Delete the temporary file after commit completes

## Commit Message Format

### Basic Format

```
<title in one line>

<description>
```

### Rules

- Use only ASCII characters (no emojis, Japanese, etc.)
- Write in English
- Title line: around 50 characters, capitalize first letter, no period at end
- Use imperative mood: "Fix bug" not "Fixed bug" or "Fixes bug"
- Blank line between title and description (required if description exists)
- Description lines wrapped at 72 characters
- Focus on why, not just what

### Example

```
Fix API endpoint validation

This commit addresses several validation issues:

- Add null check for request body
- Validate required fields before processing
- Return proper error codes for invalid input
```
