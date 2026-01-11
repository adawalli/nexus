# Tech Stack

## Runtime and Language

| Component       | Choice          | Notes                                      |
| --------------- | --------------- | ------------------------------------------ |
| Language        | TypeScript 5.9+ | Strict mode enabled, ES modules            |
| Runtime         | Node.js 18+     | Required for ES module support             |
| Package Manager | npm             | Using npm-run-all for script orchestration |
| Module System   | ESM             | `"type": "module"` in package.json         |

## Core Dependencies

| Package                     | Purpose                                        |
| --------------------------- | ---------------------------------------------- |
| `@modelcontextprotocol/sdk` | MCP server implementation with STDIO transport |
| `axios`                     | HTTP client for OpenRouter API requests        |
| `winston`                   | Structured logging with configurable levels    |
| `dotenv`                    | Environment variable loading                   |
| `data-masking`              | Secure masking of sensitive values in logs     |
| `zod`                       | Runtime schema validation (via MCP SDK)        |

## Development Tooling

| Tool         | Purpose                                       |
| ------------ | --------------------------------------------- |
| `typescript` | Type checking and compilation                 |
| `ts-node`    | Development execution without build step      |
| `nodemon`    | File watching and auto-restart in development |
| `cross-env`  | Cross-platform environment variable setting   |

## Testing

| Tool                  | Purpose                                    |
| --------------------- | ------------------------------------------ |
| `vitest`              | Test runner with native TypeScript support |
| `@vitest/coverage-v8` | Code coverage reporting                    |
| `@vitest/ui`          | Interactive test UI for development        |
| `msw`                 | API mocking for integration tests          |

**Coverage Requirements:** 90% threshold for branches, functions, lines, and statements.

**Test Structure:**

- `tests/unit/` - Component tests with mocking
- `tests/integration/` - End-to-end MCP server tests
- `tests/fixtures/` - Test data and mock responses

## Code Quality

| Tool                           | Purpose                                              |
| ------------------------------ | ---------------------------------------------------- |
| `eslint`                       | Linting with TypeScript rules                        |
| `prettier`                     | Code formatting                                      |
| `@typescript-eslint/*`         | TypeScript-specific lint rules                       |
| `eslint-config-prettier`       | Disable formatting rules that conflict with Prettier |
| `eslint-plugin-import`         | Import order and resolution rules                    |
| `eslint-plugin-unused-imports` | Remove unused imports                                |

**Pre-commit:** Uses pre-commit hooks with gitleaks for secrets scanning.

## Build and Release

| Tool               | Purpose                           |
| ------------------ | --------------------------------- |
| `tsc`              | TypeScript compilation to dist/   |
| `standard-version` | Semantic versioning and changelog |
| `npm publish`      | NPM registry distribution         |

**Distribution:** Published to npm for zero-install deployment via `npx nexus-mcp`.

## Architecture Patterns

- **Request Flow:** STDIO Transport -> MCP Server -> Validation (Zod) -> Deduplication -> Cache -> OpenRouter Client
- **Error Handling:** Structured errors with correlation IDs, exponential backoff retry
- **Logging:** Winston with JSON format, configurable via LOG_LEVEL environment variable
- **Configuration:** Centralized ConfigurationManager with JSON schema validation

## Environment Variables

| Variable             | Required | Purpose                                          |
| -------------------- | -------- | ------------------------------------------------ |
| `OPENROUTER_API_KEY` | Yes      | Authentication for OpenRouter API                |
| `NODE_ENV`           | No       | Environment mode (development, production, test) |
| `LOG_LEVEL`          | No       | Logging verbosity (debug, info, warn, error)     |
