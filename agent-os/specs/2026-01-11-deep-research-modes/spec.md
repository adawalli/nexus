# Specification: Deep Research Modes

## Goal

Add a `model` parameter to the search tool supporting all four Perplexity Sonar tiers, enabling users to choose between fast Q&A and exhaustive deep research capabilities with appropriate timeout handling and cost awareness.

## User Stories

- As a developer using Nexus MCP, I want to select different Perplexity Sonar models so that I can balance speed, cost, and depth of research for different query types
- As an AI agent, I want model-specific timeouts so that deep research queries have sufficient time to complete without timing out prematurely

## Specific Requirements

**Model Parameter Enum**

- Add `model` parameter accepting four values: `sonar`, `sonar-pro`, `sonar-reasoning-pro`, `sonar-deep-research`
- Map user-friendly names to full OpenRouter identifiers (e.g., `sonar` -> `perplexity/sonar`)
- Default to `sonar` when parameter is not specified for backwards compatibility
- Store model mapping as a constant object for maintainability

**Model-Specific Default Timeouts**

- `sonar`: 30,000 ms (fast Q&A)
- `sonar-pro`: 60,000 ms (multi-step queries)
- `sonar-reasoning-pro`: 120,000 ms (chain-of-thought reasoning)
- `sonar-deep-research`: 300,000 ms (exhaustive research)
- Create a `MODEL_TIMEOUTS` constant mapping model names to timeout values
- Apply timeout to both OpenRouter client and deduplicator

**Timeout Override Parameter**

- Add optional `timeout` parameter (in milliseconds) to allow callers to override model defaults
- Validate timeout is a positive integer
- Cap maximum timeout at 600,000 ms (10 minutes)
- Minimum timeout of 5,000 ms to prevent unreasonable values

**Input Validation with Helpful Errors**

- Extend existing Zod schema in `src/schemas/search.ts` with new model enum
- Return clear error message listing valid model options when invalid model is provided
- Example: "Invalid model 'invalid'. Valid options: sonar, sonar-pro, sonar-reasoning-pro, sonar-deep-research"

**Cost Warning in Response Metadata**

- Add `costTier` field to response metadata for premium models (sonar-pro, sonar-reasoning-pro, sonar-deep-research)
- Keep warning simple: just a string like "premium" for non-default models
- Do not include actual pricing information

**Response Metadata Enhancement**

- Include `model` field in response metadata showing the model used
- Include `timeout` field showing the effective timeout applied
- Existing metadata fields (responseTime, usage, etc.) remain unchanged

**Tool Description Update**

- Update search tool description in `src/index.ts` to document model options
- Document use cases for each model tier in the inputSchema description
- Update model enum in inputSchema to include all four options

**OpenRouter Client Integration**

- Pass model identifier to existing `chatCompletions` method
- Create per-request client instance or update timeout for model-specific values
- Model mapping happens in search tool layer, client receives full identifier

## Visual Design

N/A - This is a backend/API feature with no UI components.

## Existing Code to Leverage

**`src/schemas/search.ts` - Zod Validation Schema**

- Contains existing `SearchToolInputSchema` with model enum validation
- Extend the model enum from `['perplexity/sonar']` to include all four model identifiers
- Follow existing pattern of `.default()` and `.describe()` for the model field
- Add new timeout field following existing pattern for optional numeric parameters

**`src/tools/search.ts` - SearchTool Class**

- Contains `performActualSearch` method that builds `ChatCompletionRequest`
- Timeout is currently sourced from `this.config.getTimeoutMs()`
- Add model-specific timeout logic before API call
- Include model and cost tier in response formatting

**`src/clients/openrouter.ts` - OpenRouterClient Class**

- Already accepts model in `ChatCompletionRequest.model`
- Timeout is set in constructor via `config.timeout`
- May need per-request timeout override or create client with model-specific timeout

**`src/types/openrouter.ts` - Type Definitions**

- Contains `PerplexityModelId` type currently set to `'perplexity/sonar'`
- Extend to union type with all four model identifiers
- Types are used across multiple files, change propagates automatically

**`src/index.ts` - MCP Server Entry Point**

- Contains tool registration with `inputSchema` definition
- Update model enum and description in the search tool registration
- Follow existing pattern for documenting parameters

## Out of Scope

- Streaming responses for long-running deep research queries
- Automatic model selection based on query complexity or content
- Think tags or reasoning output extraction from sonar-reasoning-pro
- Detailed cost tracking, usage limits, or billing information
- Separate `deep_search` tool (using parameter on existing tool instead)
- Different caching behavior or TTL for deep research results
- Environment variable configuration for model-specific timeouts
- Model-specific maxTokens defaults
- Retry configuration changes based on model
- Rate limiting differences between models
