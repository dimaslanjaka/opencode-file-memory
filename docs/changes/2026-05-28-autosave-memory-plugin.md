# Changes — 2026-05-28

Summary of edits made while improving the OpenCode memory plugin during this session.

- **New tool:** `MemoryAutosave` added to `src/tools.ts` — a tool to create project-scoped memory blocks from arbitrary text, with generated labels when no explicit title is provided.
- **Registered tool:** `memory_autosave` registered in `src/plugin.ts` tool map so it can be invoked via tools.
- **Improved filename generation:** `MemoryAutosave` now uses:
  - Markdown header preference, then first sentence, then first non-empty line.
  - Code-block stripping and stopword-trimmed slugification (keeps up to 5 meaningful words).
- **Autosave hook:** added a best-effort, non-blocking autosave call in the `chat.message` hook in `src/plugin.ts`.
  - Heuristics: saves when message is long (>120 chars), multi-line, or contains a markdown header.
  - The tool context includes the message `role` (e.g. `user:autosave`) so saves can be attributed.
  - The hook is fire-and-forget and wrapped in try/catch so normal chat flow is unaffected.
- **TypeScript safety:** chat input parsing now casts the runtime `input` to `any` in `src/plugin.ts` before extracting `role`/`text`/`message` to avoid type errors (providers vary in shape).
- **Unit tests:** Added `src/tools.autosave.test.ts` which verifies a project memory file is created by the autosave tool.
- **Sample file:** created a test sample memory at `.opencode/memory/sample-memory.md` during local testing.
- **Test run:** executed `bun test` — all tests passed (28 passed, 0 failed).

Files changed (high level):

- Updated/Added: `src/tools.ts` (added `MemoryAutosave`)  
- Updated: `src/plugin.ts` (registered tool, added autosave hook, cast chat input)  
- Updated: `src/tools.ts` (improved summarization + slugify)  
- Added: `src/tools.autosave.test.ts` (unit test)  
- Added: `.opencode/memory/sample-memory.md` (test sample)  

How to reproduce locally

1. Run tests:

```bash
bun test
```

2. Trigger autosave manually via the tool API (example tool invocation in an agent environment):

- Call tool `memory_autosave` with `{ value: "your text here", title?: "optional title" }`.

Notes & next steps

- Autosave heuristics are conservative; make them configurable (opt-in) if you want fewer/more saves.
- Optionally integrate an LLM summarizer for higher-quality titles (requires model/provider config).
- Consider adding frontmatter fields (e.g., `role`) to saved memory files for easier filtering.

If you want, I can:
- Make autosave opt-in via plugin config.  
- Add role-prefixed frontmatter to saved files.  
- Integrate an LLM summarizer and add configuration options.
