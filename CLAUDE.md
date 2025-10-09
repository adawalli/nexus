# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is Nexus MCP - an intelligent AI model search and discovery server implementing the Model Context Protocol (MCP). The project provides a production-ready TypeScript server that interfaces with the OpenRouter API, featuring Perplexity Sonar models for AI-powered web search with proper source citations. The server includes a sophisticated plugin system for extensibility and enterprise-grade reliability features.

## Development Commands

### Build Commands

- `npm run build` - Complete production build (clean → compile → validate → CLI setup)
- `npm run build:clean` - Remove dist directory and build artifacts
- `npm run build:compile` - Compile TypeScript source to JavaScript (no bundling)
- `npm run build:validate` - Verify build output structure and integrity
- `npm run build:cli-setup` - Configure CLI executable with proper shebang and permissions

### Development Commands

- `npm run dev` - Start parallel development with watch mode and type checking
- `npm run dev:start` - Start development server with hot reload using ts-node
- `npm run dev:watch` - Run development server in watch mode (alias for dev:start)
- `npm run dev:types` - Run TypeScript compiler in watch mode for type checking
- `npm run dev:clean` - Clean development artifacts (dist and TypeScript build info)

### Testing Commands

- `npm test` - Run complete test suite (unit + integration tests)
- `npm run test:unit` - Run unit tests only (excludes integration tests)
- `npm run test:integration` - Run integration tests only
- `npm run test:watch` - Run all tests in watch mode for development
- `npm run test:ui` - Launch Vitest UI for interactive test management
- `npm run test:coverage` - Run tests with coverage reporting
- `npm run test:npx:local` - Test local NPX installation (pack → install globally → test CLI → cleanup)
- `npm run test:npx:published` - Test published package NPX functionality

### Release Commands

- `npm run release` - Complete release workflow (validate → build → publish)
- `npm run release:patch` - Automated patch release with version bump and publishing
- `npm run release:minor` - Automated minor release with version bump and publishing
- `npm run release:major` - Automated major release with version bump and publishing
- `npm run release:validate` - Pre-release validation (lint + format + type-check + tests)
- `npm run release:build` - Production build for release
- `npm run release:publish` - Publish to NPM registry
- `npm run release:dry-run` - Test publish process without actually publishing

### Code Quality Commands

- `npm run lint` - Lint code with ESLint (check for code quality issues)
- `npm run lint:fix` - Automatically fix linting issues where possible
- `npm run format` - Format all code with Prettier
- `npm run format:check` - Check if code formatting meets Prettier standards
- `npm run type-check` - TypeScript type checking using development config (includes tests)

### Utility Commands

- `npm run start` - Run the compiled MCP server from dist/
- `npm run cli` - Execute the CLI tool from compiled output
- `npm run clean` - Alias for build:clean (remove dist directory)
- `npm run verify` - Run build verification script
- `npm run scripts:list` - Display available script categories and their purposes

## Architecture

### Core Components

1. **MCP Server Entry Point** (`src/index.ts`)
   - Fully implemented MCP server with complete tool and resource handlers
   - Initializes configuration management and search tool capabilities
   - Graceful shutdown handling and comprehensive error management
   - Request deduplication and correlation ID tracking
   - STDIO transport with enhanced error handling

2. **Configuration System** (`src/config/`)
   - JSON schema-based environment validation (`validation.ts`)
   - Type-safe configuration management (`manager.ts`, `types.ts`)
   - Structured logging with Winston integration (`logging.ts`)
   - Environment-based configuration with masked API keys

3. **Search Tool Implementation** (`src/tools/search.ts`)
   - Production-ready search tool with caching and deduplication
   - Request validation using Zod schemas
   - Performance metrics tracking and optimization
   - Comprehensive error handling for different failure modes
   - OpenRouter client integration with retry logic

4. **Plugin System** (`src/plugins/interfaces.ts`)
   - Extensible plugin architecture for providers, tools, and integrations
   - Type-safe plugin interfaces with lifecycle management
   - Plugin discovery, loading, and health monitoring
   - Standardized error handling and performance metrics

5. **Utility Infrastructure** (`src/utils/`)
   - JSON validation and sanitization (`json-validator.ts`)
   - MCP request/response error handling (`mcp-error-handler.ts`)
   - TTL caching system (`cache.ts`)
   - Request deduplication (`deduplication.ts`)
   - STDIO stream handling (`stdio-handler.ts`)
   - Response optimization (`response-optimizer.ts`)

6. **Type System** (`src/types/`)
   - Complete OpenRouter API type definitions (`openrouter.ts`)
   - Search operation types and validators (`search.ts`)
   - Schema definitions with Zod validation (`src/schemas/`)

### Testing Architecture

- **Vitest** configuration with 90% coverage thresholds
- **MSW** for API mocking in tests
- Structured test organization:
  - `tests/unit/` - Unit tests for individual components
  - `tests/integration/` - Integration tests
  - `tests/fixtures/` - Test data and sample responses
  - `tests/utils/mocks/` - Mock implementations

### Development Tooling

- **TypeScript** with strict mode and ES2022 target
- **ESLint** with comprehensive rules including:
  - TypeScript-specific linting
  - Import order enforcement
  - Unused import removal
  - Node.js specific rules
- **Prettier** for code formatting
- **Nodemon** for development server hot reload

## Key Implementation Details

### Search Tool Features

- **Intelligent Search**: AI-powered web search using Perplexity Sonar models
- **Performance Optimization**: TTL caching, request deduplication, and response optimization
- **Error Resilience**: Comprehensive error handling with retry logic and graceful degradation
- **Metrics Collection**: Performance tracking, memory usage monitoring, and execution statistics
- **Input Validation**: Zod schema validation for all request parameters
- **Type Safety**: Complete TypeScript coverage with strict type checking

### Configuration Management

- **Environment Validation**: JSON schema-based configuration validation
- **Security**: API key masking and secure credential handling
- **Logging**: Structured logging with configurable levels and Winston integration
- **Type Safety**: Fully typed configuration system with compile-time validation

### Plugin Architecture

- **Extensible Design**: Support for provider, tool, and integration plugins
- **Lifecycle Management**: Plugin loading, initialization, health monitoring, and cleanup
- **Type Safety**: Complete TypeScript interfaces for all plugin types
- **Error Handling**: Standardized error categorization and reporting
- **Performance**: Built-in metrics collection and performance monitoring

### Task Master Integration

The project uses Task Master for development workflow management. See `.windsurfrules` for complete development workflow documentation including:

- Task breakdown and complexity analysis
- Dependency management
- Status tracking commands
- Research-backed task expansion

## Development Notes

- Production-ready MCP server with comprehensive tool and resource implementations
- Plugin system architecture ready for extensibility with provider, tool, and integration plugins
- Complete OpenRouter client with caching, deduplication, and performance optimization
- Sophisticated configuration system with environment validation and type safety
- Enterprise-grade error handling with structured logging and metrics collection
- Test coverage requirements are set to 90% across all metrics
- Uses ES modules throughout the project with strict TypeScript configuration
- NPX-ready distribution for zero-install deployment

## Pre-Commit Guidelines

- Run `pre-commit run --all-files` before attempting commits - This should be run repeatedly until all tests pass before committing
- Never run `git commit --no-verify` unless explicitly directed to do so. You see an issue, you fix it.

## Single Test Execution

To run a specific test file during development:

```bash
# Run a specific test file
npm test -- tests/unit/clients/openrouter.test.ts

# Run tests matching a pattern
npm test -- --grep "OpenRouter"

# Run tests in watch mode for specific file
npm run test:watch -- tests/unit/tools/search.test.ts
```

## Configuration and Environment

### Environment Variables

The project uses environment variables for configuration:

- `OPENROUTER_API_KEY` - Required for OpenRouter API access
- `NODE_ENV` - Environment setting (development, production, test)
- Log levels and other settings are managed through the configuration system

### Configuration Architecture

The project uses a sophisticated configuration system in `src/config/`:

- **Schema validation** - Comprehensive environment validation using JSON schema
- **Type safety** - Full TypeScript typing for all configuration options
- **Logging integration** - Structured logging with Winston, configured via config
- **Error handling** - Detailed configuration error reporting with validation feedback

## MCP Server Architecture Details

### Request Flow

1. **Initialization**: Configuration validation → Logger setup → Search tool initialization → Plugin system ready
2. **Tool Registration**: Search tool with input/output validation schemas
3. **Request Handling**: Correlation ID generation → Input validation → Deduplication → Caching → API execution
4. **Resource Management**: Configuration status endpoint with health monitoring and metrics
5. **Error Handling**: Structured error responses with correlation tracking and performance metrics

### Error Handling Strategy

- **Layered Error Handling**: Plugin-level, tool-level, and server-level error boundaries
- **Error Classification**: Categorized error types (auth, rate_limit, validation, timeout, etc.)
- **Graceful Degradation**: Server continues operation even with individual component failures
- **Correlation Tracking**: Request correlation IDs for distributed tracing and debugging
- **Comprehensive Logging**: Structured logging with correlation IDs, performance metrics, and error context
- **User-Friendly Responses**: Clear, actionable error messages with troubleshooting guidance

### Advanced Features

- **Request Deduplication**: Prevents duplicate concurrent requests with identical parameters
- **TTL Caching**: Configurable response caching to reduce API calls and improve performance
- **Performance Monitoring**: Real-time metrics collection for response times, memory usage, and API efficiency
- **STDIO Optimization**: Enhanced STDIO handling with buffering and cleanup for MCP transport
- **Configuration Validation**: Runtime configuration validation with detailed error reporting

## Development Workflow Integration

### Task Master Commands

This project integrates with Task Master for workflow management. Key commands available in this project:

```bash
# Initialize Task Master project structure
task-master init

# View current tasks and status
task-master list

# Get next task to work on
task-master next

# Mark task as completed
task-master set-status --id=<id> --status=done

# Expand complex tasks into subtasks
task-master expand --id=<id> --research
```

See `.windsurfrules` for complete Task Master workflow documentation.

## Testing Strategy

### Test Organization

- **Unit tests** - Individual component testing with mocking
- **Integration tests** - End-to-end MCP server testing
- **Fixtures** - Structured test data and mock responses
- **Coverage requirements** - 90% threshold across all metrics

### Mock Strategy

- **MSW** for HTTP API mocking
- **Vitest mocking** for module dependencies
- **Structured mocks** - Organized in `tests/utils/mocks/`

### Running Tests

- Use `npm test` for single run with coverage checking
- Use `npm run test:watch` for development with file watching
- Use `npm run test:ui` for visual test interface
- Integration tests: `npm run test:integration`
