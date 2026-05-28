---
description: "When editing files, write a concise change-summary markdown into `docs/changes` with a filename like `YYYY-MM-DD-my-summary-title.md`."
applyTo: "**/*"
user-invocable: false
---

When you (the coding agent) make edits to the repository, also create a short, human-readable change summary file in `docs/changes` describing what changed and why.

Rules
- Create `docs/changes` if it does not exist.
- Filename format: `YYYY-MM-DD-<slugified-title>.md` where `YYYY-MM-DD` is UTC date and `<slugified-title>` is lowercase, spaces→dashes, remove punctuation, and limited to 60 characters.
- If multiple related edits are made in one session, put them in a single file summarizing all edits.

Filename examples
- `2026-05-28-fix-memory-label-validation.md`
- `2026-05-28-add-journal-search.md`

Content template (use this exact structure)

---
title: "<Short title — one line>"
date: "<YYYY-MM-DD>"
author: "<name or agent>"
summary: |
  <Two to three sentence summary explaining the change and its rationale.>

files_changed:
  - path: "src/foo.ts"
    change: "Updated validation to accept underscores"
  - path: "src/bar.ts"
    change: "Added tests for X"

diff_snippets:
  - file: "src/foo.ts"
    snippet: |
      - old line
      + new line

tags: ["area:memory","type:fix"]
pr: "<optional PR or commit URL>"
---

Guidance
- Keep the `summary` concise: 1–3 sentences focused on intent and user-facing effects.
- List only the files that materially changed; short `change` descriptions are fine.
- For `diff_snippets` include up to 3 small examples (3–6 lines each) to help reviewers quickly scan the important edits.
- Use UTC date for the filename and `date` field.

When in doubt about the title, derive it from the first sentence of the `summary` and slugify it.

If you are an automated agent (non-human), add an `author` like `bot/auto-summary` and include a `pr` or commit link when available.
