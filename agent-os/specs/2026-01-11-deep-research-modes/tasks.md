# Task Breakdown: Deep Research Modes

## Overview

Total Tasks: 22 (across 4 task groups)

This feature adds a `model` parameter to the search tool supporting all four Perplexity Sonar tiers, enabling users to choose between fast Q&A and exhaustive deep research capabilities with appropriate timeout handling and cost awareness.

## Task List

### Type Definitions & Constants

#### Task Group 1: Core Types and Model Configuration

**Dependencies:** None

- [x] 1.0 Complete type definitions and model configuration
  - [x] 1.1 Write 4-6 focused tests for model types and constants
    - Test that all four model identifiers are valid
    - Test model-to-timeout mapping returns correct values
    - Test model name to OpenRouter identifier mapping
    - Test timeout bounds validation (min 5000ms, max 600000ms)
  - [x] 1.2 Extend `PerplexityModelId` type in `src/types/openrouter.ts`
    - Change from single string to union type
    - Include: `'perplexity/sonar' | 'perplexity/sonar-pro' | 'perplexity/sonar-reasoning-pro' | 'perplexity/sonar-deep-research'`
  - [x] 1.3 Create model constants file `src/constants/models.ts`
    - Define `PERPLEXITY_MODELS` object mapping user-friendly names to OpenRouter identifiers
    - Define `MODEL_TIMEOUTS` object mapping models to default timeouts
    - Define `MODEL_COST_TIERS` object mapping models to cost tier (standard/premium)
    - Export `UserFriendlyModelName` type for parameter validation
  - [x] 1.4 Add `costTier` and `timeout` fields to `SearchMetadata` interface in `src/types/search.ts`
    - `costTier?: 'standard' | 'premium'`
    - `timeout?: number` (effective timeout in ms)
  - [x] 1.5 Ensure type definition tests pass
    - Run ONLY the 4-6 tests written in 1.1
    - Verify TypeScript compilation succeeds
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**

- All four Perplexity model identifiers are properly typed
- Model constants are centralized and exported
- Timeout mappings are correctly defined (30s, 60s, 120s, 300s)
- Cost tier metadata is available for premium models

---

### Schema & Validation Layer

#### Task Group 2: Input Validation and Schema Updates

**Dependencies:** Task Group 1

- [x] 2.0 Complete schema validation layer
  - [x] 2.1 Write 4-6 focused tests for schema validation
    - Test valid model parameter values are accepted
    - Test invalid model returns descriptive error with valid options listed
    - Test timeout parameter validation (min 5000, max 600000)
    - Test default model is applied when not specified
    - Test backwards compatibility (existing calls without model parameter work)
  - [x] 2.2 Update `SUPPORTED_MODELS` array in `src/schemas/search.ts`
    - Include all four user-friendly model names: `sonar`, `sonar-pro`, `sonar-reasoning-pro`, `sonar-deep-research`
  - [x] 2.3 Update model enum in `SearchToolInputSchema`
    - Change enum to accept user-friendly names
    - Update default to `'sonar'`
    - Add clear description documenting use cases for each tier
  - [x] 2.4 Add `timeout` parameter to `SearchToolInputSchema`
    - Optional number parameter
    - Minimum: 5000 (5 seconds)
    - Maximum: 600000 (10 minutes)
    - Add descriptive `.describe()` explaining it overrides model default
  - [x] 2.5 Enhance validation error messages
    - When invalid model provided, list all valid options in error message
    - Format: "Invalid model 'invalid'. Valid options: sonar, sonar-pro, sonar-reasoning-pro, sonar-deep-research"
  - [x] 2.6 Ensure schema validation tests pass
    - Run ONLY the 4-6 tests written in 2.1
    - Verify invalid inputs return helpful errors
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**

- Schema accepts all four model names
- Default model is `sonar` for backwards compatibility
- Timeout parameter has proper bounds validation
- Invalid model values produce helpful error messages with valid options

---

### Search Tool Implementation

#### Task Group 3: Search Tool and Client Integration

**Dependencies:** Task Groups 1 and 2

- [x] 3.0 Complete search tool implementation
  - [x] 3.1 Write 6-8 focused tests for search tool behavior
    - Test model name maps to correct OpenRouter identifier in API request
    - Test model-specific default timeout is applied when no override
    - Test timeout override parameter is respected
    - Test costTier appears in metadata for premium models
    - Test costTier is absent or 'standard' for default sonar model
    - Test model and timeout fields appear in response metadata
  - [x] 3.2 Add model name resolution in `SearchTool.search()` method
    - Import model constants from `src/constants/models.ts`
    - Map user-friendly name to OpenRouter identifier before API call
    - Determine cost tier based on model selection
  - [x] 3.3 Implement model-specific timeout logic
    - Look up default timeout from `MODEL_TIMEOUTS` constant
    - Allow timeout parameter to override model default
    - Apply effective timeout to deduplicator.execute() call
  - [x] 3.4 Update `performActualSearch()` to handle dynamic timeouts
    - Create new `OpenRouterClient` instance with model-specific timeout, OR
    - Pass timeout to client method if supported
    - Ensure timeout applies to the API request
  - [x] 3.5 Enhance response metadata in `formatSearchResponseWithMetrics()`
    - Include `model` field showing OpenRouter model identifier used
    - Include `timeout` field showing effective timeout applied
    - Include `costTier` field for premium models
  - [x] 3.6 Update response formatting in `src/index.ts` CallToolRequestSchema handler
    - Include timeout in metadata display
    - Include cost tier warning for premium models in response text
  - [x] 3.7 Ensure search tool tests pass
    - Run ONLY the 6-8 tests written in 3.1
    - Verify API requests use correct model identifiers
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**

- Model names correctly map to OpenRouter identifiers
- Model-specific timeouts are applied correctly
- Timeout override works as expected
- Response metadata includes model, timeout, and costTier fields
- Premium models show cost tier in response

---

### Tool Documentation & Integration

#### Task Group 4: MCP Tool Schema and Documentation Updates

**Dependencies:** Task Group 3

- [x] 4.0 Complete tool documentation and integration
  - [x] 4.1 Write 2-4 focused integration tests
    - Test end-to-end search with default model
    - Test end-to-end search with premium model (sonar-pro)
    - Test end-to-end search with timeout override
  - [x] 4.2 Update search tool inputSchema in `src/index.ts`
    - Update model enum to include all four options
    - Add descriptions for each model tier and use case
    - Add timeout parameter with description
  - [x] 4.3 Update search tool description
    - Document model selection capability
    - Briefly describe each tier's use case:
      - `sonar`: Fast Q&A (default)
      - `sonar-pro`: Multi-step queries
      - `sonar-reasoning-pro`: Chain-of-thought reasoning
      - `sonar-deep-research`: Exhaustive research reports
  - [x] 4.4 Ensure integration tests pass
    - Run ONLY the 2-4 tests written in 4.1
    - Verify MCP tool registration is correct
    - Do NOT run the entire test suite at this stage

**Acceptance Criteria:**

- Tool schema accurately reflects all parameters
- Model options and use cases are documented in tool description
- Integration tests verify end-to-end functionality

---

### Test Review & Gap Analysis

#### Task Group 5: Test Review and Critical Gap Coverage

**Dependencies:** Task Groups 1-4

- [x] 5.0 Review existing tests and fill critical gaps only
  - [x] 5.1 Review tests from Task Groups 1-4
    - Review the 4-6 tests from Task Group 1 (types/constants)
    - Review the 4-6 tests from Task Group 2 (schema/validation)
    - Review the 6-8 tests from Task Group 3 (search tool)
    - Review the 2-4 tests from Task Group 4 (integration)
    - Total existing tests: approximately 16-24 tests
  - [x] 5.2 Analyze test coverage gaps for Deep Research Modes feature only
    - Identify critical user workflows lacking test coverage
    - Focus ONLY on gaps related to this feature's requirements
    - Do NOT assess entire application test coverage
    - Prioritize end-to-end workflows over unit test gaps
  - [x] 5.3 Write up to 6 additional strategic tests maximum (if needed)
    - Focus on integration points between components
    - Consider error scenarios for premium model timeouts
    - Skip edge cases and exhaustive validation testing
  - [x] 5.4 Run feature-specific tests only
    - Run ONLY tests related to Deep Research Modes feature
    - Expected total: approximately 20-30 tests maximum
    - Do NOT run the entire application test suite
    - Verify all critical workflows pass

**Acceptance Criteria:**

- All feature-specific tests pass
- Critical user workflows for model selection are covered
- No more than 6 additional tests added when filling gaps
- Testing focused exclusively on Deep Research Modes requirements

---

## Execution Order

Recommended implementation sequence:

1. **Task Group 1: Core Types and Model Configuration** - Establish foundational types and constants
2. **Task Group 2: Input Validation and Schema Updates** - Add parameter validation with helpful errors
3. **Task Group 3: Search Tool and Client Integration** - Implement core functionality
4. **Task Group 4: MCP Tool Schema and Documentation** - Update tool registration and docs
5. **Task Group 5: Test Review and Gap Analysis** - Ensure adequate test coverage

---

## Files to Modify

| File                                  | Task Groups | Changes                                   |
| ------------------------------------- | ----------- | ----------------------------------------- |
| `src/types/openrouter.ts`             | 1           | Extend `PerplexityModelId` union type     |
| `src/constants/models.ts`             | 1           | New file: model mappings and timeouts     |
| `src/types/search.ts`                 | 1, 3        | Add `costTier` and `timeout` to metadata  |
| `src/schemas/search.ts`               | 2           | Update model enum, add timeout parameter  |
| `src/tools/search.ts`                 | 3           | Model resolution, timeout logic, metadata |
| `src/index.ts`                        | 4           | Update tool schema and description        |
| `tests/unit/constants/models.test.ts` | 1           | New file: model constants tests           |
| `tests/unit/schemas/search.test.ts`   | 2           | Schema validation tests                   |
| `tests/unit/tools/search.test.ts`     | 3           | Search tool behavior tests                |
| `tests/integration/search.test.ts`    | 4           | End-to-end integration tests              |

---

## Key Implementation Notes

1. **Backwards Compatibility**: Default to `sonar` model when parameter not specified
2. **User-Friendly Names**: Accept short names (`sonar`, `sonar-pro`) and map to full OpenRouter identifiers internally
3. **Timeout Hierarchy**: Model default timeout -> Caller override -> Capped at 600000ms max
4. **Cost Awareness**: Simple `premium` cost tier indicator, no actual pricing information
5. **Error Messages**: When invalid model provided, list all valid options in the error message
