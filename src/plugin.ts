import type { Plugin, ToolDefinition } from '@opencode-ai/plugin';

import { buildJournalSystemNote, createJournalStore, loadConfig } from './journal';
import { createMemoryStore } from './memory';
import { renderMemoryBlocks } from './prompt';
import {
  JournalRead,
  JournalSearch,
  JournalWrite,
  MemoryList,
  MemoryReplace,
  MemorySet,
  MemoryAutosave
} from './tools';
import type { JournalContext } from './tools';

export const MemoryPlugin: Plugin = async ({ directory }) => {
  const store = createMemoryStore(directory);
  await store.ensureSeed();

  // Journal: opt-in via ~/.config/opencode/agent-memory.json
  const config = await loadConfig();
  const journalEnabled = config.journal?.enabled === true;

  // Mutable state updated by chat.message hook
  const journalCtx: JournalContext = {
    directory,
    model: '',
    provider: ''
  };

  let journalTools: Record<string, ToolDefinition> = {};
  let journalSystemNote = '';

  // Instantiate autosave tool for optional automatic saves from chat turns
  const autosaveTool = MemoryAutosave(createMemoryStore(directory));

  if (journalEnabled) {
    const journalStore = createJournalStore();
    journalTools = {
      journal_write: JournalWrite(journalStore, journalCtx),
      journal_read: JournalRead(journalStore),
      journal_search: JournalSearch(journalStore)
    };
    journalSystemNote = buildJournalSystemNote(config.journal?.tags);
  }

  return {
    'chat.message': async (input, _output) => {
      if (input.model) {
        journalCtx.model = input.model.modelID;
        journalCtx.provider = input.model.providerID;
      }

      // Attempt to extract a textual payload from the chat input.
      // Cast to any because the exact shape of the chat input is runtime-defined
      // and varies between providers.
      const msg: any = input as any;
      const role = msg.role ?? msg.message?.role ?? 'user';
      let contentText = '';
      if (typeof msg.text === 'string') contentText = msg.text;
      else if (typeof msg.message?.content === 'string') contentText = msg.message.content;
      else if (Array.isArray(msg.message?.content)) {
        contentText = msg.message.content.map((c: any) => (typeof c === 'string' ? c : (c?.text ?? ''))).join('\n');
      }

      // Heuristics: save when message is reasonably long or contains a markdown header.
      try {
        if (contentText && (contentText.length > 120 || contentText.includes('\n') || contentText.match(/^#+\s+/m))) {
          // call the autosave tool; provide a minimal tool context
          // don't await to avoid blocking critical chat processing
          void autosaveTool.execute({ value: contentText }, {
            agent: `${role}:autosave`,
            sessionID: 'autosave'
          } as any);
        }
      } catch {
        // swallow errors — autosave is best-effort
      }
    },

    'experimental.chat.system.transform': async (_input, output) => {
      const blocks = await store.listBlocks('all');
      const xml = renderMemoryBlocks(blocks);
      if (!xml) return;

      // Insert early (right after provider header) for salience.
      // OpenCode will re-join system chunks to preserve caching.
      const insertAt = output.system.length > 0 ? 1 : 0;
      output.system.splice(insertAt, 0, xml);

      // Append journal instructions at the end (preserves memory block cache)
      if (journalSystemNote) {
        output.system.push(journalSystemNote);
      }
    },

    tool: {
      memory_list: MemoryList(store),
      memory_set: MemorySet(store),
      memory_replace: MemoryReplace(store),
      memory_autosave: MemoryAutosave(store),
      ...journalTools
    }
  };
};
