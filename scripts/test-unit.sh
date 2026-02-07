#!/usr/bin/env bash
# Run unit tests with mock.module files isolated in separate processes
# to prevent Bun's global mock.module from leaking between test files
set -e

export NODE_ENV=test

# Files using mock.module need their own process
bun test tests/unit/cli.test.ts
bun test tests/unit/server/index.test.ts
bun test tests/unit/tools/search.test.ts
bun test tests/unit/tools/search-grok4.test.ts
bun test tests/unit/tools/search-deep-research.test.ts
bun test tests/unit/utils/json-validator.test.ts
bun test tests/unit/utils/json-rpc-validator.test.ts

# Remaining files can run together (no mock.module usage)
bun test \
  tests/unit/sample.test.ts \
  tests/unit/clients \
  tests/unit/config \
  tests/unit/constants \
  tests/unit/errors \
  tests/unit/schemas \
  tests/unit/types \
  tests/unit/utils/cache.test.ts \
  tests/unit/utils/deduplication.test.ts \
  tests/unit/utils/error-messages.test.ts \
  tests/unit/utils/logger.test.ts \
  tests/unit/utils/mcp-error-handler.test.ts \
  tests/unit/utils/response-optimizer.test.ts \
  tests/unit/utils/retry.test.ts \
  tests/unit/utils/stdio-handler.test.ts \
  tests/unit/utils/zod-error-parser.test.ts \
  tests/unit/server/mcp-grok4.test.ts
