import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { describe, it, expect, beforeAll } from 'bun:test';

/**
 * Tests verify the MCP server tool definitions contain Grok 4 support.
 * File content is read once and shared across tests for efficiency.
 */
describe('MCP Server Grok 4 Integration', () => {
  let indexContent: string;

  beforeAll(async () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const indexPath = path.resolve(currentDir, '../../../src/index.ts');
    indexContent = await readFile(indexPath, 'utf-8');
  });

  describe('ListToolsRequest response', () => {
    it('should return tool description mentioning Grok 4 and training data', () => {
      expect(indexContent).toContain('Grok');
      expect(indexContent).toContain('training data');
    });

    it('should return model enum including all supported models', () => {
      const expectedModels = [
        'sonar',
        'sonar-pro',
        'sonar-reasoning-pro',
        'sonar-deep-research',
        'grok-4',
      ];

      for (const model of expectedModels) {
        expect(indexContent).toMatch(
          new RegExp(`enum:\\s*\\[[\\s\\S]*'${model}'[\\s\\S]*\\]`)
        );
      }
    });
  });

  describe('Search response for Grok 4', () => {
    it('should include search type indication in metadata output', () => {
      expect(indexContent).toContain('searchType');
      expect(indexContent).toContain('Search type:');
    });
  });
});
