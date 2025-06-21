import { parseArgs } from 'node:util';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createServer } from './index.js';

function printUsage() {
  console.log(`
Usage: nexus [options]

Nexus MCP Server - Intelligent AI model search and discovery

Options:
  --stdio     Use STDIO transport (required for MCP clients)
  --help      Show this help message
  --version   Show version information

Environment Variables:
  OPENROUTER_API_KEY    OpenRouter API key (required)
  NODE_ENV             Environment (development, production, test)

Examples:
  npx nexus-mcp --stdio
  nexus --stdio
`);
}

function printVersion() {
  try {
    // Get the current file path and resolve package.json location
    const currentFilePath = fileURLToPath(import.meta.url);
    const projectRoot = dirname(dirname(currentFilePath));
    const packageJsonPath = join(projectRoot, 'package.json');

    // Read and parse package.json
    const packageJsonContent = readFileSync(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    if (packageJson.version) {
      console.log(`nexus-mcp v${packageJson.version}`);
    } else {
      console.log('nexus-mcp (version unavailable)');
    }
  } catch {
    // Fallback if package.json cannot be read
    console.log('nexus-mcp (version unavailable)');
  }
}

async function main() {
  try {
    const { values } = parseArgs({
      args: process.argv.slice(2),
      options: {
        stdio: {
          type: 'boolean',
          default: false,
        },
        help: {
          type: 'boolean',
          default: false,
        },
        version: {
          type: 'boolean',
          default: false,
        },
      },
      allowPositionals: true,
    });

    if (values.help) {
      printUsage();
      process.exit(0);
    }

    if (values.version) {
      printVersion();
      process.exit(0);
    }

    if (!values.stdio) {
      console.error('Error: --stdio flag is required for MCP server operation');
      printUsage();
      process.exit(1);
    }

    // Check for required environment variables
    if (!process.env.OPENROUTER_API_KEY) {
      console.error(
        'Error: OPENROUTER_API_KEY environment variable is required'
      );
      console.error('Please set your OpenRouter API key:');
      console.error('  export OPENROUTER_API_KEY=your_api_key_here');
      process.exit(1);
    }

    // Set default environment if not specified
    if (!process.env.NODE_ENV) {
      process.env.NODE_ENV = 'production';
    }

    // Start the MCP server
    await createServer();
  } catch (error) {
    console.error('Failed to start Nexus MCP server:', error);
    process.exit(1);
  }
}

main();
