import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';

// Mock modules before importing the module under test
const readFileSyncMock = mock(() => {});
const parseArgsMock = mock(() => {});
const createServerMock = mock(() => Promise.resolve({}));

mock.module('node:fs', () => ({
  readFileSync: readFileSyncMock,
}));

mock.module('node:util', () => ({
  parseArgs: parseArgsMock,
}));

mock.module('../../src/index.js', () => ({
  createServer: createServerMock,
}));

describe('CLI Module', () => {
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalProcessExit = process.exit;
  const originalProcessArgv = process.argv;
  const originalEnv = { ...process.env };

  let consoleLogMock: ReturnType<typeof mock>;
  let consoleErrorMock: ReturnType<typeof mock>;
  let processExitMock: ReturnType<typeof mock>;
  let importCounter = 0;

  beforeEach(() => {
    consoleLogMock = mock(() => {});
    consoleErrorMock = mock(() => {});
    processExitMock = mock(() => {});

    console.log = consoleLogMock;
    console.error = consoleErrorMock;
    process.exit = processExitMock as unknown as typeof process.exit;
    process.argv = ['node', 'cli.js'];

    readFileSyncMock.mockClear();
    parseArgsMock.mockClear();
    createServerMock.mockClear();

    delete process.env.OPENROUTER_API_KEY;
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    process.exit = originalProcessExit;
    process.argv = originalProcessArgv;
    process.env = { ...originalEnv };
  });

  // Use cache-busting query string to force re-execution of the CLI module
  // since Bun caches dynamic imports and has no vi.resetModules() equivalent
  function importCli() {
    importCounter++;
    return import(`../../src/cli.js?cachebust=${importCounter}`);
  }

  describe('printUsage', () => {
    it('should display help message when --help flag is passed', async () => {
      parseArgsMock.mockReturnValue({
        values: { help: true, version: false, stdio: true },
        positionals: [],
      });

      await importCli();

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
      parseArgsMock.mockReturnValue({
        values: { help: false, version: true, stdio: true },
        positionals: [],
      });

      readFileSyncMock.mockReturnValue(JSON.stringify({ version: '3.0.1' }));

      await importCli();

      expect(consoleLogMock).toHaveBeenCalledWith('nexus-mcp v3.0.1');
      expect(processExitMock).toHaveBeenCalledWith(0);
    });

    it('should display version unavailable when package.json has no version', async () => {
      parseArgsMock.mockReturnValue({
        values: { help: false, version: true, stdio: true },
        positionals: [],
      });

      readFileSyncMock.mockReturnValue(JSON.stringify({}));

      await importCli();

      expect(consoleLogMock).toHaveBeenCalledWith(
        'nexus-mcp (version unavailable)'
      );
      expect(processExitMock).toHaveBeenCalledWith(0);
    });

    it('should display version unavailable when package.json cannot be read', async () => {
      parseArgsMock.mockReturnValue({
        values: { help: false, version: true, stdio: true },
        positionals: [],
      });

      readFileSyncMock.mockImplementation(() => {
        throw new Error('File not found');
      });

      await importCli();

      expect(consoleLogMock).toHaveBeenCalledWith(
        'nexus-mcp (version unavailable)'
      );
      expect(processExitMock).toHaveBeenCalledWith(0);
    });
  });

  describe('main', () => {
    it('should error when OPENROUTER_API_KEY is not set', async () => {
      parseArgsMock.mockReturnValue({
        values: { help: false, version: false, stdio: true },
        positionals: [],
      });

      delete process.env.OPENROUTER_API_KEY;

      await importCli();

      expect(consoleErrorMock).toHaveBeenCalledWith(
        'Error: OPENROUTER_API_KEY environment variable is required'
      );
      expect(processExitMock).toHaveBeenCalledWith(1);
    });

    it('should start server when OPENROUTER_API_KEY is set', async () => {
      parseArgsMock.mockReturnValue({
        values: { help: false, version: false, stdio: true },
        positionals: [],
      });

      process.env.OPENROUTER_API_KEY = 'sk-or-v1-test-key-that-is-valid';

      await importCli();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(createServerMock).toHaveBeenCalled();
    });

    it('should set NODE_ENV to production when not specified', async () => {
      parseArgsMock.mockReturnValue({
        values: { help: false, version: false, stdio: true },
        positionals: [],
      });

      process.env.OPENROUTER_API_KEY = 'sk-or-v1-test-key-that-is-valid';
      delete process.env.NODE_ENV;

      await importCli();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(process.env.NODE_ENV).toBe('production');
    });

    it('should handle server startup errors', async () => {
      parseArgsMock.mockReturnValue({
        values: { help: false, version: false, stdio: true },
        positionals: [],
      });

      process.env.OPENROUTER_API_KEY = 'sk-or-v1-test-key-that-is-valid';

      createServerMock.mockRejectedValue(new Error('Startup failed'));

      await importCli();
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(consoleErrorMock).toHaveBeenCalledWith(
        'Failed to start Nexus MCP server:',
        expect.any(Error)
      );
      expect(processExitMock).toHaveBeenCalledWith(1);
    });
  });
});
