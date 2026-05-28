import { describe, expect, test } from 'bun:test';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { createMemoryStore } from './memory';
import { MemoryAutosave } from './tools';

async function mkTmpDir(): Promise<string> {
  const root = await fs.mkdtemp(path.join('/tmp/', 'opencode-memory-'));
  return root;
}

describe('memory_autosave tool', () => {
  test('creates a project memory block with generated label', async () => {
    const dir = await mkTmpDir();
    const store = createMemoryStore(dir);
    await store.ensureSeed();

    const tool = MemoryAutosave(store);

    const content = `# Feature idea\n\nAdd autosave for memories. This should generate a filename.`;

    const res = await tool.execute({ value: content }, {} as any);
    expect(typeof res).toBe('string');

    const blocks = await store.listBlocks('project');
    const found = blocks.find((b) => b.value.includes('Add autosave for memories'));
    expect(found).toBeTruthy();

    // Verify file exists on disk
    const fileExists = await fs
      .stat(found!.filePath)
      .then(() => true)
      .catch(() => false);
    expect(fileExists).toBe(true);
  });
});
