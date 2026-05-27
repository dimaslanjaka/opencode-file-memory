# OpenCode Agent Memory Plugin

This workspace contains an experimental OpenCode plugin that provides persistent, file-backed memory blocks with optional journal support. Start with [README.md](README.md) for the user-facing overview, then use the code entry points below for implementation details.

## What This Project Does

- [src/plugin.ts](src/plugin.ts) wires the plugin into OpenCode, seeds memory blocks, injects memory into the system prompt, and registers tools.
- [src/memory.ts](src/memory.ts) owns filesystem-backed memory blocks, seeding, label validation, size limits, and read-only enforcement.
- [src/prompt.ts](src/prompt.ts) renders the XML memory payload that gets inserted into the chat system prompt.
- [src/journal.ts](src/journal.ts) implements opt-in journal configuration, append-only entries, embeddings, and semantic search.
- [src/tools.ts](src/tools.ts) defines the memory and journal tools plus their default scope behavior.
- [src/frontmatter.ts](src/frontmatter.ts) handles YAML frontmatter and atomic writes.

## Commands

- Test: `bun test`
- Typecheck: `tsc --noEmit`

There is no build script in this package. The package metadata and scripts live in [package.json](package.json).

## Repo Conventions

- Project memory lives in `.opencode/memory` and is auto-gitignored; global memory lives in `~/.config/opencode/memory`.
- Seed blocks are `persona`, `human`, and `project`.
- Memory labels must be 2 to 61 characters and use letters, numbers, dash, or underscore.
- Memory values are trimmed and capped by the block limit; read-only blocks cannot be modified.
- `memory_list` defaults to `all`; `memory_set` and `memory_replace` default to `project`.
- Journal support is opt-in via `~/.config/opencode/agent-memory.json`.
- Keep prompt-rendered memory compact and stable so the injected system text stays cache-friendly.

## Working Style

- Prefer small edits that preserve existing file formats and defaults.
- Link to existing docs instead of copying them here when more detail is needed.
- If a change touches memory or journal behavior, check the nearby tests in [src/memory.test.ts](src/memory.test.ts), [src/journal.test.ts](src/journal.test.ts), [src/prompt.test.ts](src/prompt.test.ts), and [src/memory.ts](src/memory.ts) before broadening the change.

## Recommended Agents

- Use the memory steward agent for memory block edits, seed updates, and memory-label questions.
- Use the journal scout agent for journal search, entry recovery, and embedding-related investigation.
- Use the repo onboarding agent when you need a compact explanation of the plugin, its commands, and its boundaries.
