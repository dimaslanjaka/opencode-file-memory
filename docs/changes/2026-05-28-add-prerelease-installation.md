---
title: "Add prerelease installation instruction"
date: "2026-05-28"
author: "bot/auto-summary"
summary: |
  Added README guidance for installing the latest pre-release of the plugin from the GitHub release tarball.

files_changed:
  - path: "README.md"
    change: "Added pre-release install command under Installation"

diff_snippets:
  - file: "README.md"
    snippet: |
      - OpenCode fetches unpinned plugins from npm on each startup; pinned versions are cached and require a manual version bump to update.
      + OpenCode fetches unpinned plugins from npm on each startup; pinned versions are cached and require a manual version bump to update.
      +
      +To install the latest pre-release directly from this repo:
      +
      +```bash
      +opencode plugin opencode-agent-memory@https://github.com/dimaslanjaka/opencode-file-memory/raw/refs/heads/main/release/opencode-agent-memory.tgz
      +```

tags: ["type:update"]
pr: ""
---