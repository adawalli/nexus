# Specification: Grok 4 Integration

## Goal

Add xAI's Grok 4 model as an alternative option in the existing search tool, expanding nexus-mcp beyond Perplexity Sonar models while maintaining Perplexity as the default for real-time web search.

## User Stories

- As a developer using nexus-mcp, I want to use Grok 4 for queries where training-data knowledge is sufficient, so that I have model flexibility without switching tools
- As a power user, I want clear indication when using Grok 4 that responses come from training data rather than real-time search, so that I understand the response source

## Specific Requirements

**Refactor PerplexityModelId to Generic ModelId**

- Rename `PerplexityModelId` type in `/Users/awallis/dev/nexus-mcp/src/types/openrouter.ts` to `ModelId`
- Add `'x-ai/grok-4'` to the union type alongside existing Perplexity model IDs
- Update all imports and references across the codebase to use the new generic type name
- Maintain backwards compatibility with no breaking changes to external API

**Add Grok 4 Model Configuration**

- Add `'grok-4'` to `UserFriendlyModelName` type in `/Users/awallis/dev/nexus-mcp/src/constants/models.ts`
- Map `'grok-4'` to `'x-ai/grok-4'` in the models constant (rename from `PERPLEXITY_MODELS` to generic `MODELS`)
- Set timeout to 60000ms (60 seconds) in `MODEL_TIMEOUTS`
- Set cost tier to `'premium'` in `MODEL_COST_TIERS`

**Update Search Tool Schema**

- Add `'grok-4'` to the model enum in `/Users/awallis/dev/nexus-mcp/src/schemas/search.ts`
- Maintain `'sonar'` as the default model
- Update model description to include Grok 4 with note about training-data usage

**Update Tool Description in MCP Server**

- Modify tool description in `/Users/awallis/dev/nexus-mcp/src/index.ts` to mention Grok 4
- Clearly state that Grok 4 uses training data, not real-time web search
- Update model enum in inputSchema to include `'grok-4'`

**Update Search Tool Implementation**

- Modify `resolveModelIdentifier` function in `/Users/awallis/dev/nexus-mcp/src/tools/search.ts` to handle both Perplexity and Grok models
- Ensure Grok 4 uses the same max tokens default (1000) as Perplexity models
- Include cost information ($3/$15 per M tokens input/output) in response metadata

**Update OpenRouter Client**

- Change default model type from `PerplexityModelId` to `ModelId` in `/Users/awallis/dev/nexus-mcp/src/clients/openrouter.ts`
- Keep `'perplexity/sonar'` as the default fallback model

**Add Response Metadata Differentiation**

- Include a `searchType` field in response metadata: `'realtime'` for Perplexity, `'training-data'` for Grok 4
- Display search type in the formatted response output so users know the data source

## Visual Design

No visual assets provided.

## Existing Code to Leverage

**`/Users/awallis/dev/nexus-mcp/src/constants/models.ts`**

- Contains `UserFriendlyModelName` type, `PERPLEXITY_MODELS` mapping, `MODEL_TIMEOUTS`, and `MODEL_COST_TIERS`
- Extend these constants to include Grok 4 configuration
- Follow the same pattern for timeout and cost tier assignment

**`/Users/awallis/dev/nexus-mcp/src/types/openrouter.ts`**

- Contains `PerplexityModelId` union type that needs to be generalized
- Provides the type safety pattern for model identifiers
- Rename to `ModelId` and add Grok 4

**`/Users/awallis/dev/nexus-mcp/src/schemas/search.ts`**

- Contains Zod validation schema with model enum derived from constants
- Already uses `VALID_MODELS` derived from the models constant
- Adding Grok 4 to constants will automatically include it in schema

**`/Users/awallis/dev/nexus-mcp/src/tools/search.ts`**

- Contains `resolveModelIdentifier`, `getEffectiveTimeout`, and `getCostTier` helper functions
- Orchestrates search flow with caching, deduplication, and API calls
- Reuse the same flow for Grok 4 requests

**`/Users/awallis/dev/nexus-mcp/src/clients/openrouter.ts`**

- OpenRouter client already supports any model via OpenRouter API
- Uses generic `ChatCompletionRequest` with string model field
- No changes needed to core client logic, just type updates

## Out of Scope

- Streaming responses for Grok 4
- Multimodal inputs (image processing) for Grok 4
- Parallel tool calling with Grok 4
- Other xAI models (grok-3-beta, grok-2-vision-1212, etc.)
- Changing the default model from Perplexity Sonar
- Creating a separate tool for Grok 4 (must be integrated into existing search tool)
- Different max tokens default for Grok 4 (must use same 1000 token default)
- Custom Grok 4 specific parameters not shared with Perplexity
- Backwards compatibility code for old type names (clean rename, not aliasing)
