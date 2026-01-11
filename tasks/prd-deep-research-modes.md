# PRD: Deep Research Modes

## 1. Introduction/Overview

Nexus MCP currently uses a single Perplexity Sonar model optimized for quick searches. This feature adds support for all four Sonar model tiers via a `model` parameter on the existing search tool. This enables users to select the appropriate research depth - from fast Q&A to exhaustive multi-source research - based on their needs.

## 2. Goals

- Allow users to select from four research depth levels without complicating the API
- Enable thorough real-time research for use cases requiring comprehensive sourcing
- Warn users about cost implications before executing expensive research requests
- Maintain backwards compatibility with existing search tool usage
- Set appropriate timeouts per model tier to handle varying response times

## 3. User Stories

- As a developer using the MCP, I want to choose a research depth level so that I can balance speed vs thoroughness based on my needs.
- As a researcher, I want to use Sonar Deep Research so that I get exhaustive analysis across hundreds of sources for complex topics.
- As a cost-conscious user, I want to be warned before executing deep research so that I understand the pricing implications.
- As an existing user, I want my current searches to work unchanged so that I don't need to update my integrations.
- As a user with complex reasoning needs, I want to use Sonar Reasoning Pro so that I get chain-of-thought problem solving.

## 4. Functional Requirements

1. The search tool must accept a `model` parameter with four valid values: `sonar`, `sonar-pro`, `sonar-reasoning-pro`, and `sonar-deep-research`.
2. The `model` parameter must default to `sonar` when not specified (current behavior).
3. The system must validate the `model` parameter and reject invalid values with a clear error message.
4. When a non-default model is selected, the response must include a cost note in the metadata indicating the pricing tier (e.g., "Model: sonar-pro ($3/M input, $15/M output)").
5. The system must use the correct OpenRouter model identifier for each tier:
   - `sonar` -> `perplexity/sonar`
   - `sonar-pro` -> `perplexity/sonar-pro`
   - `sonar-reasoning-pro` -> `perplexity/sonar-reasoning-pro`
   - `sonar-deep-research` -> `perplexity/sonar-deep-research`
6. The search tool description must document the available model options and their use cases.
7. The system must apply default timeouts per model tier:
   - `sonar`: 30 seconds (fast Q&A)
   - `sonar-pro`: 60 seconds (multi-step queries)
   - `sonar-reasoning-pro`: 120 seconds (chain-of-thought reasoning)
   - `sonar-deep-research`: 300 seconds (exhaustive research)
8. The search tool must accept an optional `timeout` parameter (in milliseconds) allowing callers to override the default timeout for their model tier.
9. The response metadata must include which model was used for the search.

## 5. Non-Goals (Out of Scope)

- Not included: Separate `deep_search` tool - using parameter on existing tool instead
- Not included: Streaming responses for long-running deep research
- Not included: Cost tracking or usage limits - just informational notes
- Not included: Caching deep research results differently than standard searches
- Not included: Automatic model selection based on query complexity

## 6. Design Considerations

Tool parameter additions:

```
model (optional): The Perplexity model to use for the search
  - "sonar" (default) - Fast, lightweight Q&A ($1/M tokens)
  - "sonar-pro" - In-depth multi-step queries, 200K context ($3/$15 per M tokens)
  - "sonar-reasoning-pro" - Advanced reasoning with chain-of-thought ($2/$8 per M tokens)
  - "sonar-deep-research" - Exhaustive research across hundreds of sources ($2/$8 per M tokens + $5/K searches)

timeout (optional): Override the default timeout in milliseconds
  - If not provided, uses model-specific defaults (30s/60s/120s/300s)
  - Allows callers to extend timeout for complex queries
```

## 7. Technical Considerations

- Update Zod schema in `src/schemas/` to validate the new `model` parameter with enum constraint
- Update `src/tools/search.ts` to:
  - Accept model parameter
  - Apply model-specific timeout
  - Include model info and cost note in response metadata
- Update `src/clients/openrouter.ts` to accept and pass model parameter to API
- Consider making timeouts configurable via environment variables for flexibility

### Model Reference

| Model               | Context | Input $/M | Output $/M | Search $/K | Use Case                    |
| ------------------- | ------- | --------- | ---------- | ---------- | --------------------------- |
| sonar               | 127K    | $1        | $1         | $5         | Fast Q&A                    |
| sonar-pro           | 200K    | $3        | $15        | $5         | Multi-step queries          |
| sonar-reasoning-pro | 128K    | $2        | $8         | $5         | Chain-of-thought reasoning  |
| sonar-deep-research | 128K    | $2        | $8         | $5         | Exhaustive research reports |

## 8. Success Metrics

- Users can successfully execute searches with all four model tiers
- No breaking changes to existing integrations using default behavior
- Cost notes appear in responses when using premium models
- No timeout errors for deep research requests under normal conditions

## 9. Open Questions

None - all questions resolved.
