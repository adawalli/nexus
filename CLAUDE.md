# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nexus MCP is a Model Context Protocol server providing AI-powered web search via OpenRouter's Perplexity Sonar models. It's designed for zero-install deployment via `npx nexus-mcp`.

## Essential Commands

```bash
bun run dev              # Watch mode with type checking
bun run build            # Production build
bun run test             # Full test suite (unit + integration)
bun run test:unit        # Unit tests only
bun run test:watch       # Watch mode for development

# Single test execution
bun run test -- tests/unit/clients/openrouter.test.ts
bun run test -- --grep "OpenRouter"
```

## Architecture

### Request Flow

```
Client Request → STDIO Transport → MCP Server (src/index.ts)
    → Correlation ID → Input Validation (Zod) → Deduplication → Cache Check
    → OpenRouter Client (src/clients/openrouter.ts) → Response Optimization
    → Structured Response with Metadata
```

### Key Directories

- `src/index.ts` - MCP server entry point with tool/resource handlers
- `src/tools/search.ts` - Search tool with caching, deduplication, retry logic
- `src/clients/openrouter.ts` - OpenRouter API client with error handling
- `src/config/` - Configuration management with JSON schema validation
- `src/utils/` - Shared utilities (caching, deduplication, error handling, logging)
- `src/schemas/` - Zod validation schemas
- `src/types/` - TypeScript type definitions

### Testing Structure

- `tests/unit/` - Component tests with mocking
- `tests/integration/` - End-to-end MCP server tests
- `tests/fixtures/` - Test data and mock responses
- Coverage threshold: 80%

## Environment Variables

- `OPENROUTER_API_KEY` - Required for OpenRouter API access
- `NODE_ENV` - Environment (development, production, test)
- `LOG_LEVEL` - Logging verbosity (debug, info, warn, error)
