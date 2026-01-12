# Task Breakdown: Grok 4 Integration

## Overview

Total Tasks: 16

This feature adds xAI's Grok 4 model as an alternative option in the existing search tool, expanding nexus-mcp beyond Perplexity Sonar models while maintaining Perplexity as the default for real-time web search.

## Task List

### Type System Layer

#### Task Group 1: Type Refactoring and Model Configuration

**Dependencies:** None

- [x] 1.0 Complete type system and model configuration updates
  - [x] 1.1 Write 4 focused tests for type and configuration changes
    - Test that `ModelId` type accepts all Perplexity model IDs
    - Test that `ModelId` type accepts `'x-ai/grok-4'`
    - Test that `MODELS` constant maps `'grok-4'` to `'x-ai/grok-4'`
    - Test that `MODEL_TIMEOUTS` and `MODEL_COST_TIERS` include `'grok-4'`
  - [x] 1.2 Rename `PerplexityModelId` to `ModelId` in `/Users/awallis/dev/nexus-mcp/src/types/openrouter.ts`
    - Add `'x-ai/grok-4'` to the union type
    - Keep all existing Perplexity model IDs in the union
  - [x] 1.3 Update `UserFriendlyModelName` type in `/Users/awallis/dev/nexus-mcp/src/constants/models.ts`
    - Add `'grok-4'` to the union type
  - [x] 1.4 Rename `PERPLEXITY_MODELS` to `MODELS` in `/Users/awallis/dev/nexus-mcp/src/constants/models.ts`
    - Update type to `Record<UserFriendlyModelName, ModelId>`
    - Add mapping: `'grok-4': 'x-ai/grok-4'`
  - [x] 1.5 Add Grok 4 to `MODEL_TIMEOUTS` in `/Users/awallis/dev/nexus-mcp/src/constants/models.ts`
    - Set timeout to 60000ms (60 seconds)
  - [x] 1.6 Add Grok 4 to `MODEL_COST_TIERS` in `/Users/awallis/dev/nexus-mcp/src/constants/models.ts`
    - Set cost tier to `'premium'`
  - [x] 1.7 Ensure type system tests pass
    - Run ONLY the 4 tests written in 1.1
    - Verify TypeScript compilation succeeds
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**

- The 4 tests written in 1.1 pass
- `ModelId` type includes both Perplexity and Grok 4 model identifiers
- `MODELS` constant properly maps all user-friendly names to OpenRouter IDs
- Grok 4 has correct timeout (60s) and cost tier (premium) configuration
- TypeScript compiles without errors

### Schema and Validation Layer

#### Task Group 2: Search Schema Updates

**Dependencies:** Task Group 1

- [x] 2.0 Complete schema and validation updates
  - [x] 2.1 Write 3 focused tests for schema validation
    - Test that `'grok-4'` is accepted as a valid model value
    - Test that default model remains `'sonar'` when not specified
    - Test that model validation error message includes `'grok-4'` in valid options
  - [x] 2.2 Update import in `/Users/awallis/dev/nexus-mcp/src/schemas/search.ts`
    - Change `PERPLEXITY_MODELS` import to `MODELS`
  - [x] 2.3 Update `VALID_MODELS` derivation in `/Users/awallis/dev/nexus-mcp/src/schemas/search.ts`
    - Change `Object.keys(PERPLEXITY_MODELS)` to `Object.keys(MODELS)`
  - [x] 2.4 Update model schema description in `/Users/awallis/dev/nexus-mcp/src/schemas/search.ts`
    - Include Grok 4 in the description
    - Add note that Grok 4 uses training data, not real-time web search
    - Example: `'Model to use for search. Options: sonar (fast Q&A, default), sonar-pro (multi-step queries), sonar-reasoning-pro (chain-of-thought reasoning), sonar-deep-research (exhaustive research reports), grok-4 (training-data knowledge, no real-time search)'`
  - [x] 2.5 Ensure schema tests pass
    - Run ONLY the 3 tests written in 2.1
    - Verify Zod schema validates correctly
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**

- The 3 tests written in 2.1 pass
- `'grok-4'` is a valid model option in the schema
- Default model remains `'sonar'`
- Schema description clearly differentiates Grok 4 from Perplexity models

### API Client Layer

#### Task Group 3: OpenRouter Client and Search Tool Updates

**Dependencies:** Task Group 2

- [x] 3.0 Complete OpenRouter client and search tool implementation
  - [x] 3.1 Write 5 focused tests for client and search tool changes
    - Test that `resolveModelIdentifier` returns `'x-ai/grok-4'` for `'grok-4'`
    - Test that `getEffectiveTimeout` returns 60000ms for `'grok-4'`
    - Test that `getCostTier` returns `'premium'` for `'grok-4'`
    - Test that search response includes `searchType: 'training-data'` for Grok 4
    - Test that search response includes `searchType: 'realtime'` for Perplexity models
  - [x] 3.2 Update type imports in `/Users/awallis/dev/nexus-mcp/src/tools/search.ts`
    - Change `PerplexityModelId` import to `ModelId`
    - Change `PERPLEXITY_MODELS` import to `MODELS`
  - [x] 3.3 Update `resolveModelIdentifier` function in `/Users/awallis/dev/nexus-mcp/src/tools/search.ts`
    - Change return type from `PerplexityModelId` to `ModelId`
    - Update to use `MODELS` constant instead of `PERPLEXITY_MODELS`
  - [x] 3.4 Update `performActualSearch` method in `/Users/awallis/dev/nexus-mcp/src/tools/search.ts`
    - Change `openRouterModelId` parameter type from `PerplexityModelId` to `ModelId`
  - [x] 3.5 Add `searchType` field to response metadata
    - Determine search type based on model: `'realtime'` for Perplexity models, `'training-data'` for Grok 4
    - Include in `formatSearchResponseWithMetrics` call or add after formatting
  - [x] 3.6 Update type import in `/Users/awallis/dev/nexus-mcp/src/clients/openrouter.ts` (if needed)
    - Verify client uses generic `string` type for model parameter (should already be compatible)
  - [x] 3.7 Ensure client and search tool tests pass
    - Run ONLY the 5 tests written in 3.1
    - Verify search tool resolves Grok 4 model correctly
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**

- The 5 tests written in 3.1 pass
- `resolveModelIdentifier` correctly maps `'grok-4'` to `'x-ai/grok-4'`
- Search responses include `searchType` metadata field
- All model-related type references updated from Perplexity-specific to generic

### MCP Server Layer

#### Task Group 4: MCP Server Tool Definition Updates

**Dependencies:** Task Group 3

- [x] 4.0 Complete MCP server tool definition updates
  - [x] 4.1 Write 3 focused tests for MCP server tool definitions
    - Test that `ListToolsRequest` returns tool description mentioning Grok 4
    - Test that `ListToolsRequest` returns model enum including `'grok-4'`
    - Test that search response for Grok 4 model includes search type indication
  - [x] 4.2 Update tool description in `/Users/awallis/dev/nexus-mcp/src/index.ts`
    - Add Grok 4 to the description
    - Clearly state Grok 4 uses training data, not real-time web search
    - Example: `'Nexus AI-powered search using Perplexity and Grok models via OpenRouter. Perplexity models (sonar, sonar-pro, sonar-reasoning-pro, sonar-deep-research) search the web for current information. Grok 4 provides responses from training data without real-time search.'`
  - [x] 4.3 Update model enum in inputSchema in `/Users/awallis/dev/nexus-mcp/src/index.ts`
    - Add `'grok-4'` to the enum array
  - [x] 4.4 Update model description in inputSchema in `/Users/awallis/dev/nexus-mcp/src/index.ts`
    - Include Grok 4 with note about training-data usage and 60s timeout
    - Example: `'grok-4 (training-data knowledge, 60s timeout)'`
  - [x] 4.5 Update search response formatting to include `searchType` in metadata output
    - Add `- Search type: realtime` or `- Search type: training-data` to metadata lines
  - [x] 4.6 Ensure MCP server tests pass
    - Run ONLY the 3 tests written in 4.1
    - Verify tool definition includes Grok 4
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**

- The 3 tests written in 4.1 pass
- Tool description clearly explains Grok 4 capabilities and limitations
- Model enum includes all five model options
- Search responses display search type in formatted output

### Integration and Testing

#### Task Group 5: Test Review and Gap Analysis

**Dependencies:** Task Groups 1-4

- [x] 5.0 Review existing tests and fill critical gaps only
  - [x] 5.1 Review tests from Task Groups 1-4
    - Review the 4 tests written by type system layer (Task 1.1)
    - Review the 3 tests written by schema layer (Task 2.1)
    - Review the 5 tests written by client layer (Task 3.1)
    - Review the 3 tests written by MCP server layer (Task 4.1)
    - Total existing tests: 15 tests
  - [x] 5.2 Analyze test coverage gaps for Grok 4 integration only
    - Identify critical user workflows that lack test coverage
    - Focus ONLY on gaps related to this spec's feature requirements
    - Do NOT assess entire application test coverage
    - Prioritize end-to-end workflows over unit test gaps
  - [x] 5.3 Write up to 5 additional strategic tests maximum
    - Focus on integration points between layers
    - Verify full request flow with Grok 4 model parameter
    - Test error handling for Grok 4 specific scenarios
    - Do NOT write comprehensive coverage for all scenarios
  - [x] 5.4 Update all references to old type/constant names
    - Search codebase for remaining `PerplexityModelId` references
    - Search codebase for remaining `PERPLEXITY_MODELS` references
    - Update any missed imports or usages
  - [x] 5.5 Run feature-specific tests only
    - Run ONLY tests related to this spec's feature (tests from 1.1, 2.1, 3.1, 4.1, and 5.3)
    - Expected total: approximately 20 tests maximum
    - Do NOT run the entire application test suite
    - Verify critical workflows pass
  - [x] 5.6 Run full test suite and fix any regressions
    - Execute `npm test` to run complete test suite
    - Fix any tests broken by type/constant renaming
    - Verify 80% coverage threshold is maintained

**Acceptance Criteria:**

- All feature-specific tests pass (approximately 20 tests total)
- Full test suite passes with no regressions
- No remaining references to old type/constant names
- Critical user workflows for Grok 4 integration are covered
- 80% test coverage threshold maintained

## Execution Order

Recommended implementation sequence:

1. Type System Layer (Task Group 1) - Foundation types and configuration
2. Schema and Validation Layer (Task Group 2) - Input validation updates
3. API Client Layer (Task Group 3) - Core business logic updates
4. MCP Server Layer (Task Group 4) - User-facing tool definition updates
5. Test Review and Gap Analysis (Task Group 5) - Integration verification

## Files to Modify

| File                                                     | Task Groups                 |
| -------------------------------------------------------- | --------------------------- |
| `/Users/awallis/dev/nexus-mcp/src/types/openrouter.ts`   | 1                           |
| `/Users/awallis/dev/nexus-mcp/src/constants/models.ts`   | 1                           |
| `/Users/awallis/dev/nexus-mcp/src/schemas/search.ts`     | 2                           |
| `/Users/awallis/dev/nexus-mcp/src/tools/search.ts`       | 3                           |
| `/Users/awallis/dev/nexus-mcp/src/clients/openrouter.ts` | 3 (if needed)               |
| `/Users/awallis/dev/nexus-mcp/src/index.ts`              | 4                           |
| `/Users/awallis/dev/nexus-mcp/src/types/search.ts`       | 3 (for searchType metadata) |

## Technical Notes

- The OpenRouter client already uses a generic `string` type for the model parameter in `ChatCompletionRequest`, so minimal changes are needed there
- The `VALID_MODELS` array in the schema is derived from the models constant, so adding Grok 4 to the constant will automatically include it in validation
- Grok 4 pricing ($3/$15 per M tokens input/output) should be documented in tool description for user awareness
- The `searchType` metadata field helps users understand the data source: `'realtime'` indicates fresh web search results, `'training-data'` indicates responses from the model's training knowledge
