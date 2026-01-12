# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nexus MCP is a Model Context Protocol server providing AI-powered web search via OpenRouter's Perplexity Sonar models. It's designed for zero-install deployment via `npx nexus-mcp`.

## Essential Commands

```bash
# Development
npm run dev              # Watch mode with type checking
npm run build            # Production build

# Testing
npm test                 # Full test suite (unit + integration)
npm run test:unit        # Unit tests only
npm run test:watch       # Watch mode for development

# Single test execution
npm test -- tests/unit/clients/openrouter.test.ts
npm test -- --grep "OpenRouter"

# Code quality
npm run lint             # Check for issues
npm run lint:fix         # Auto-fix issues
npm run format           # Format with Prettier
npm run type-check       # TypeScript validation

# Pre-commit (run on staged files)
pre-commit run
```

### Validation Workflow

**Before committing:**

- Code style, linting, and security checks run automatically via pre-commit
- Manual validation: `pre-commit run` (checks staged files only)

**Before pushing:**

- Full validation runs automatically via pre-push
- Runs: `npm run release:validate` (lint, format, type-check, secrets, test)
- Manual validation: `pre-commit run --hook-stage pre-push`

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

## Pre-Commit Requirements

- Pre-commit hooks (fast checks) run automatically on every commit
- Run `pre-commit run` before committing to ensure staged files pass linting
- Pre-push hooks (full validation) run automatically before pushing
- Pre-push runs `npm run release:validate` (lint, format, type-check, secrets, test)
- Never use `git commit --no-verify` - fix issues instead
- Secrets scanning via gitleaks is included in validation

### Temporarily Skip Hooks

**Skip pre-commit:**

```bash
SKIP=hook-id git commit -m "message"
```

**Skip pre-push:**

```bash
SKIP=hook-id git push
```
