# SaveLah Change Log Convention

Every user-visible release must add an entry to `src/data/changelog.ts`.

Keep each entry concise and user-facing:

- Use a new version and release date.
- Add a short release title and one-sentence summary.
- List the key changes only.
- Label each item as `new`, `improved`, or `fixed`.
- Describe what changed for the user, not internal implementation details.
- Put the newest release first.

Database-only maintenance, formatting, and other invisible development work do not need an in-app entry unless they affect users.
