import { tool } from '@opencode-ai/plugin';

import type { JournalStore } from './journal';
import type { MemoryScope, MemoryStore } from './memory';

export function MemoryList(store: MemoryStore) {
  return tool({
    description: 'List available memory blocks (labels, descriptions, sizes).',
    args: {
      scope: tool.schema.enum(['all', 'global', 'project']).optional()
    },
    async execute(args) {
      // Default to "all" for list (show everything)
      const scope = (args.scope ?? 'all') as MemoryScope | 'all';
      const blocks = await store.listBlocks(scope);
      if (blocks.length === 0) {
        return 'No memory blocks found.';
      }

      return blocks
        .map(
          (b) =>
            `${b.scope}:${b.label}\n  read_only=${b.readOnly} chars=${b.value.length}/${b.limit}\n  ${b.description}`
        )
        .join('\n\n');
    }
  });
}

export function MemorySet(store: MemoryStore) {
  return tool({
    description: 'Create or update a memory block (full overwrite).',
    args: {
      label: tool.schema.string(),
      scope: tool.schema.enum(['global', 'project']).optional(),
      value: tool.schema.string(),
      description: tool.schema.string().optional(),
      limit: tool.schema.number().int().positive().optional()
    },
    async execute(args) {
      // Default to "project" for mutations (safer default)
      const scope = (args.scope ?? 'project') as MemoryScope;
      await store.setBlock(scope, args.label, args.value, {
        description: args.description,
        limit: args.limit
      });
      return `Updated memory block ${scope}:${args.label}.`;
    }
  });
}

export function MemoryReplace(store: MemoryStore) {
  return tool({
    description: 'Replace a substring within a memory block.',
    args: {
      label: tool.schema.string(),
      scope: tool.schema.enum(['global', 'project']).optional(),
      oldText: tool.schema.string(),
      newText: tool.schema.string()
    },
    async execute(args) {
      // Default to "project" for mutations (safer default)
      const scope = (args.scope ?? 'project') as MemoryScope;
      await store.replaceInBlock(scope, args.label, args.oldText, args.newText);
      return `Updated memory block ${scope}:${args.label}.`;
    }
  });
}

export function MemoryAutosave(store: MemoryStore) {
  return tool({
    description: 'Save a memory file to the current project using a generated filename when no title is provided.',
    args: {
      value: tool.schema.string(),
      title: tool.schema.string().optional()
    },
    async execute(args) {
      const value: string = args.value.trim();
      const title = (args.title ?? '').trim().replace(/\s+/g, ' ');

      // Improved summarization: prefer first markdown header, then first sentence,
      // then first non-empty line. Collapse long titles and trim common stopwords
      // for shorter, more meaningful filenames.
      function summarize(text: string): string {
        if (!text || text.trim().length === 0) return 'memory';

        // Remove code blocks for cleaner summaries
        const noCode = text.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '');

        // Look for markdown headings (#, ##, ###)
        const lines = noCode.split(/\r?\n/).map((l) => l.trim());
        for (const l of lines) {
          if (l.startsWith('#')) {
            // strip leading hashes and trim
            const hdr = l
              .replace(/^#+\s*/, '')
              .replace(/\s+/g, ' ')
              .slice(0, 120)
              .trim();
            if (hdr.length > 0) return hdr;
          }
        }

        // Fallback: first sentence (split on .!? followed by space/newline)
        // eslint-disable-next-line no-useless-escape
        const sentenceMatch = noCode.match(/([\s\S]*?)[\.\?!](?:\s|$)/);
        if (sentenceMatch && sentenceMatch[1]) {
          const s = sentenceMatch[1].trim();
          if (s.length > 0) return s.slice(0, 120).trim();
        }

        // Next fallback: first non-empty line
        const firstLine = lines.find((l) => l.length > 0) ?? 'memory';
        return firstLine.slice(0, 120).trim();
      }

      // Slugify with word-level trimming: keep up to 5 meaningful words,
      // drop common stopwords, normalize to ASCII-ish lowercase.
      function slugify(text: string): string {
        const stopwords = new Set([
          'the',
          'a',
          'an',
          'and',
          'or',
          'of',
          'to',
          'in',
          'for',
          'on',
          'with',
          'by',
          'is',
          'are',
          'was',
          'were',
          'be',
          'this',
          'that'
        ]);

        const normalized = text
          .normalize('NFKD')
          .replace(/[^\w\s-]/g, ' ')
          .toLowerCase();

        const words = normalized
          .split(/\s+/)
          .map((w) => w.trim())
          .filter(Boolean)
          .filter((w) => !stopwords.has(w));

        const chosen = words.length > 0 ? words.slice(0, 5) : [normalized.replace(/\s+/g, '-')];
        let s = chosen.join('-');
        s = s.replace(/-+/g, '-');
        s = s.replace(/^-+|-+$/g, '');
        if (!/^[a-z0-9]/.test(s)) s = `m-${s}`;
        if (s.length < 2) s = `${s}-1`;
        if (s.length > 61) s = s.slice(0, 61);
        return s;
      }

      const baseTitle = title.length > 0 ? title : summarize(value);
      let label = slugify(baseTitle);

      // Ensure uniqueness by probing existing blocks
      let attempt = 0;
      while (true) {
        try {
          const s: any = (store as any).getBlock;
          if (typeof s === 'function') {
            await (store as any).getBlock('project', label);
            attempt += 1;
            label = slugify(`${baseTitle}-${attempt}`);
            continue;
          }
        } catch {
          break;
        }
      }

      await store.setBlock('project', label, value, { description: '' });

      return `Saved memory to project:${label}.`;
    }
  });
}

export type JournalContext = {
  directory: string;
  model: string;
  provider: string;
};

export function JournalWrite(store: JournalStore, ctx: JournalContext) {
  return tool({
    description:
      'Write a new journal entry. Use this to capture insights, technical discoveries, ' +
      'design decisions, observations, or reflections. Entries are append-only and cannot be edited. ' +
      'Tags are optional comma-separated names, e.g. "perf, debugging".',
    args: {
      title: tool.schema.string(),
      body: tool.schema.string(),
      tags: tool.schema.string().optional()
    },
    async execute(args, toolCtx) {
      const tags = args.tags
        ? args.tags
            .split(',')
            .map((t: string) => t.trim())
            .filter(Boolean)
        : undefined;

      const entry = await store.write({
        title: args.title,
        body: args.body,
        project: ctx.directory,
        model: ctx.model,
        provider: ctx.provider,
        agent: toolCtx.agent,
        sessionId: toolCtx.sessionID,
        tags
      });

      return `Journal entry created: ${entry.id}\n  title: ${entry.title}\n  created: ${entry.created.toISOString()}`;
    }
  });
}

export function JournalRead(store: JournalStore) {
  return tool({
    description: 'Read a specific journal entry by its ID. Returns the full entry ' + 'including metadata and body.',
    args: {
      id: tool.schema.string()
    },
    async execute(args) {
      const entry = await store.read(args.id);

      const meta = [
        `title: ${entry.title}`,
        `created: ${entry.created.toISOString()}`,
        entry.project ? `project: ${entry.project}` : null,
        entry.model ? `model: ${entry.model}` : null,
        entry.provider ? `provider: ${entry.provider}` : null,
        entry.agent ? `agent: ${entry.agent}` : null,
        entry.sessionId ? `session: ${entry.sessionId}` : null,
        entry.tags.length > 0 ? `tags: ${entry.tags.join(', ')}` : null
      ]
        .filter(Boolean)
        .join('\n');

      return `${meta}\n\n${entry.body}`;
    }
  });
}

export function JournalSearch(store: JournalStore) {
  return tool({
    description:
      'Search journal entries using semantic similarity. Returns matching entries ' +
      'sorted by relevance. All filters are optional and combined with AND logic. ' +
      'Use with no arguments to list recent entries. Use offset to paginate.',
    args: {
      text: tool.schema.string().optional(),
      project: tool.schema.string().optional(),
      tags: tool.schema.string().optional(),
      limit: tool.schema.number().int().positive().optional(),
      offset: tool.schema.number().int().nonnegative().optional()
    },
    async execute(args) {
      const tags = args.tags
        ? args.tags
            .split(',')
            .map((t: string) => t.trim())
            .filter(Boolean)
        : undefined;

      const result = await store.search({
        text: args.text,
        project: args.project,
        tags,
        limit: args.limit,
        offset: args.offset
      });

      if (result.entries.length === 0) {
        const tagsLine = result.allTags.length > 0 ? `\nTags in use: ${result.allTags.join(', ')}` : '';
        return `No journal entries found.${tagsLine}`;
      }

      const offset = args.offset ?? 0;
      const header = `Found ${result.total} entries (showing ${offset + 1}–${offset + result.entries.length}):`;
      const tagsLine = result.allTags.length > 0 ? `\nTags in use: ${result.allTags.join(', ')}` : '';

      const lines = result.entries.map((e) => {
        const tagStr = e.tags.length > 0 ? ` [${e.tags.join(', ')}]` : '';
        return `${e.id}\n  ${e.title}${tagStr}\n  ${e.created.toISOString()}`;
      });

      return `${header}${tagsLine}\n\n${lines.join('\n\n')}`;
    }
  });
}
