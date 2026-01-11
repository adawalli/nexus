import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock modules before importing the module under test
vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
}));

vi.mock('node:util', () => ({
  parseArgs: vi.fn(),
}));

// Mock the index.ts module to prevent side effects
vi.mock('../../src/index.js', () => ({
  createServer: vi.fn().mockResolvedValue({}),
}));

describe('CLI Module', () => {
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalProcessExit = process.exit;
  const originalProcessArgv = process.argv;
  const originalEnv = { ...process.env };

  let consoleLogMock: ReturnType<typeof vi.fn>;
  let consoleErrorMock: ReturnType<typeof vi.fn>;
  let processExitMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    consoleLogMock = vi.fn();
    consoleErrorMock = vi.fn();
    processExitMock = vi.fn();

    console.log = consoleLogMock;
    console.error = consoleErrorMock;
    process.exit = processExitMock as unknown as typeof process.exit;
    process.argv = ['node', 'cli.js'];

    delete process.env.OPENROUTER_API_KEY;
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    process.exit = originalProcessExit;
    process.argv = originalProcessArgv;
    process.env = { ...originalEnv };

    vi.resetModules();
  });

  describe('printUsage', () => {
    it('should display help message when --help flag is passed', async () => {
      vi.mocked(parseArgs).mockReturnValue({
        values: { help: true, version: false, stdio: true },
        positionals: [],
      });

      await import('../../src/cli.js');

      expect(consoleLogMock).toHaveBeenCalled();
      const helpOutput = consoleLogMock.mock.calls
        .map(call => call[0])
        .join('\n');
      expect(helpOutput).toContain('Usage:');
      expect(helpOutput).toContain('nexus');
      expect(helpOutput).toContain('--help');
      expect(helpOutput).toContain('--version');
      expect(processExitMock).toHaveBeenCalledWith(0);
    });
  });

  describe('printVersion', () => {
    it('should display version from package.json when --version flag is passed', async () => {
      vi.mocked(parseArgs).mockReturnValue({
        values: { help: false, version: true, stdio: true },
        positionals: [],
      });

      vi.mocked(readFileSync).mockReturnValue(
        JSON.stringify({ version: '3.0.1' })
      );

      await import('../../src/cli.js');

      expect(consoleLogMock).toHaveBeenCalledWith('nexus-mcp v3.0.1');
      expect(processExitMock).toHaveBeenCalledWith(0);
    });

    it('should display version unavailable when package.json has no version', async () => {
      vi.mocked(parseArgs).mockReturnValue({
        values: { help: false, version: true, stdio: true },
        positionals: [],
      });

      vi.mocked(readFileSync).mockReturnValue(JSON.stringify({}));

      await import('../../src/cli.js');

      expect(consoleLogMock).toHaveBeenCalledWith(
        'nexus-mcp (version unavailable)'
      );
      expect(processExitMock).toHaveBeenCalledWith(0);
    });

    it('should display version unavailable when package.json cannot be read', async () => {
      vi.mocked(parseArgs).mockReturnValue({
        values: { help: false, version: true, stdio: true },
        positionals: [],
      });

      vi.mocked(readFileSync).mockImplementation(() => {
        throw new Error('File not found');
      });

      await import('../../src/cli.js');

      expect(consoleLogMock).toHaveBeenCalledWith(
        'nexus-mcp (version unavailable)'
      );
      expect(processExitMock).toHaveBeenCalledWith(0);
    });
  });

  describe('main', () => {
    it('should error when OPENROUTER_API_KEY is not set', async () => {
      vi.mocked(parseArgs).mockReturnValue({
        values: { help: false, version: false, stdio: true },
        positionals: [],
      });

      delete process.env.OPENROUTER_API_KEY;

      await import('../../src/cli.js');

      expect(consoleErrorMock).toHaveBeenCalledWith(
        'Error: OPENROUTER_API_KEY environment variable is required'
      );
      expect(processExitMock).toHaveBeenCalledWith(1);
    });

    it('should start server when OPENROUTER_API_KEY is set', async () => {
      vi.mocked(parseArgs).mockReturnValue({
        values: { help: false, version: false, stdio: true },
        positionals: [],
      });

      process.env.OPENROUTER_API_KEY = 'sk-or-v1-test-key-that-is-valid';

      const { createServer } = await import('../../src/index.js');

      await import('../../src/cli.js');
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(createServer).toHaveBeenCalled();
    });

    it('should set NODE_ENV to production when not specified', async () => {
      vi.mocked(parseArgs).mockReturnValue({
        values: { help: false, version: false, stdio: true },
        positionals: [],
      });

      process.env.OPENROUTER_API_KEY = 'sk-or-v1-test-key-that-is-valid';
      delete process.env.NODE_ENV;

      await import('../../src/cli.js');
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(process.env.NODE_ENV).toBe('production');
    });

    it('should handle server startup errors', async () => {
      vi.mocked(parseArgs).mockReturnValue({
        values: { help: false, version: false, stdio: true },
        positionals: [],
      });

      process.env.OPENROUTER_API_KEY = 'sk-or-v1-test-key-that-is-valid';

      const { createServer } = await import('../../src/index.js');
      vi.mocked(createServer).mockRejectedValue(new Error('Startup failed'));

      await import('../../src/cli.js');
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(consoleErrorMock).toHaveBeenCalledWith(
        'Failed to start Nexus MCP server:',
        expect.any(Error)
      );
      expect(processExitMock).toHaveBeenCalledWith(1);
    });
  });
});
