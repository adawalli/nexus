# Spec Requirements: Deep Research Modes

## Initial Description

Add `model` parameter to search tool supporting all four Perplexity Sonar tiers. This will allow users to choose between different Perplexity Sonar models for their searches.

## Requirements Discussion

### First Round Questions

**Q1:** Model tiers - Which Perplexity Sonar models should be supported?
**Answer:** All four Perplexity Sonar tiers confirmed - sonar, sonar-pro, sonar-reasoning-pro, and sonar-deep-research

**Q2:** Default model - What should the default be when no model is specified?
**Answer:** Keep `perplexity/sonar` as the default for backwards compatibility

**Q3:** Timeouts - Should there be model-specific timeouts?
**Answer:** Yes to model-specific timeouts. Values from PRD:

- `sonar`: 30 seconds (fast Q&A)
- `sonar-pro`: 60 seconds (multi-step queries)
- `sonar-reasoning-pro`: 120 seconds (chain-of-thought reasoning)
- `sonar-deep-research`: 300 seconds (exhaustive research)

**Q4:** Cost awareness - How should cost information be communicated?
**Answer:** Just warnings, keep it simple - no detailed cost metadata needed

**Q5:** Reasoning/think tags - Should sonar-reasoning-pro output reasoning steps?
**Answer:** Do NOT support think tags or reasoning output - exclude this feature

**Q6:** Validation - How should invalid model values be handled?
**Answer:** Yes to validation with suggestions for valid models in error messages

**Q7:** Scope exclusions - What features should NOT be included?
**Answer:**

- No streaming support needed
- No automatic model selection by MCP - let the LLM calling the tool decide which model to use
- Keep it simple

**Q8:** Existing code patterns - Are there similar features to reference?
**Answer:** User is not sure about existing patterns to reference

### Existing Code to Reference

No similar existing features identified for reference. However, based on the codebase architecture from the PRD:

- `src/schemas/` - Zod validation schemas (for model parameter validation)
- `src/tools/search.ts` - Search tool implementation (for adding model parameter)
- `src/clients/openrouter.ts` - OpenRouter API client (for passing model to API)

### Follow-up Questions

None required - all requirements are clear.

## Visual Assets

### Files Provided:

No visual assets provided.

### Visual Insights:

N/A - This is a backend/API feature with no UI components.

## Requirements Summary

### Functional Requirements

1. Add `model` parameter to the existing search tool accepting four valid values:
   - `sonar` (maps to `perplexity/sonar`)
   - `sonar-pro` (maps to `perplexity/sonar-pro`)
   - `sonar-reasoning-pro` (maps to `perplexity/sonar-reasoning-pro`)
   - `sonar-deep-research` (maps to `perplexity/sonar-deep-research`)

2. Default to `sonar` when model parameter is not specified (backwards compatibility)

3. Apply model-specific default timeouts:
   - `sonar`: 30,000 ms
   - `sonar-pro`: 60,000 ms
   - `sonar-reasoning-pro`: 120,000 ms
   - `sonar-deep-research`: 300,000 ms

4. Add optional `timeout` parameter allowing callers to override the model's default timeout (in milliseconds)

5. Validate model parameter and return clear error messages with list of valid options when invalid

6. Include simple cost warning in response metadata when using non-default (premium) models

7. Include model used in response metadata

8. Update search tool description to document available model options and their use cases

### Reusability Opportunities

- Existing Zod schemas in `src/schemas/` for adding model enum validation
- Existing search tool structure in `src/tools/search.ts` for parameter extension
- Existing OpenRouter client in `src/clients/openrouter.ts` for model parameter passthrough

### Scope Boundaries

**In Scope:**

- Add `model` parameter to search tool
- Add `timeout` parameter for override capability
- Model-specific default timeouts
- Model validation with helpful error messages
- Cost warning in metadata for premium models
- Model identifier in response metadata
- Updated tool description documenting options

**Out of Scope:**

- Streaming responses for long-running deep research
- Automatic model selection based on query complexity
- Think tags or reasoning output from sonar-reasoning-pro
- Detailed cost tracking or usage limits
- Separate `deep_search` tool (using parameter on existing tool instead)
- Different caching behavior for deep research results

### Technical Considerations

- Update Zod schema to validate model parameter with enum constraint
- Map user-friendly model names to OpenRouter model identifiers
- Model timeouts should potentially be configurable via environment variables
- Ensure backwards compatibility - existing tool usage without model parameter continues to work
- Tech stack: TypeScript 5.9+, Vitest for testing, Zod for validation
- Coverage requirements: 90% threshold for branches, functions, lines, statements

### Model Reference (from PRD)

| Model               | Context | Input $/M | Output $/M | Search $/K | Timeout | Use Case                    |
| ------------------- | ------- | --------- | ---------- | ---------- | ------- | --------------------------- |
| sonar               | 127K    | $1        | $1         | $5         | 30s     | Fast Q&A                    |
| sonar-pro           | 200K    | $3        | $15        | $5         | 60s     | Multi-step queries          |
| sonar-reasoning-pro | 128K    | $2        | $8         | $5         | 120s    | Chain-of-thought reasoning  |
| sonar-deep-research | 128K    | $2        | $8         | $5         | 300s    | Exhaustive research reports |
