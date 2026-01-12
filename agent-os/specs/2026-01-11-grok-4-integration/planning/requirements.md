# Spec Requirements: Grok 4 Integration

## Initial Description

Add support for xAI's Grok 4 (`x-ai/grok-4`) as an alternative model option for nexus-mcp. This expands the MCP server beyond Perplexity Sonar models to include xAI's offering. Grok 4 provides 256K context window with pricing at $3/$15 per million tokens (input/output).

## Requirements Discussion

### First Round Questions

**Q1:** Model Purpose & Behavior - Grok 4 is a general-purpose LLM without built-in web search capabilities like Perplexity Sonar. Should it be exposed as a separate tool, or integrated into the existing search tool with a note that it uses training data rather than real-time search?

**Answer:** It's ok to add it - we will just want to expose in the tool notes this limitation (e.g., not realtime). Perplexity will remain the default.

**Q2:** Model Naming & Variants - xAI offers multiple Grok models via OpenRouter. Should we start with just x-ai/grok-4, or include other variants like x-ai/grok-3-beta or x-ai/grok-2-vision-1212?

**Answer:** Just x-ai/grok-4 initially (user-friendly name: `grok-4`)

**Q3:** Max Tokens Default - Current Perplexity models default to 1000 max tokens. Should Grok 4 use the same default, or a different value given its 256K context?

**Answer:** Same as Perplexity (1000 tokens) since hoping to retain the same tool call

**Q4:** Timeout Configuration - Current Perplexity timeouts range from 30s to 300s based on model tier. What timeout should Grok 4 use?

**Answer:** 60 seconds is fine

**Q5:** Cost Tier Classification - The existing model configuration includes costTier (standard/premium/research). At $3/$15 per M tokens, should Grok 4 be classified as premium?

**Answer:** premium is fine

**Q6:** Type Naming - The current codebase has PerplexityModelId type. Should we refactor to a generic ModelId type that encompasses both Perplexity and Grok models?

**Answer:** Yes, refactor PerplexityModelId to generic ModelId

**Q7:** Scope Exclusions - What capabilities should we explicitly exclude from this integration? For example: streaming responses, multimodal inputs (images), parallel tool calling?

**Answer:** Ignore streaming, multimodal inputs, parallel tool calling - seeking parity with Perplexity. Perplexity remains the default model.

### Existing Code to Reference

No similar existing features identified for reference. However, the Deep Research Modes feature (Phase 1 completed) provides the model parameter infrastructure that this integration will extend.

### Follow-up Questions

None required - all requirements are clear.

## Visual Assets

### Files Provided:

No visual assets provided.

### Visual Insights:

Not applicable.

## Requirements Summary

### Functional Requirements

- Add `x-ai/grok-4` as a new model option in the search tool
- Use user-friendly name `grok-4` for the model parameter
- Integrate into existing search tool (not a separate tool)
- Document in tool notes that Grok 4 uses training data, not real-time web search
- Perplexity Sonar remains the default model when no model parameter specified
- Same tool interface and parameters as existing Perplexity models

### Technical Requirements

- Refactor `PerplexityModelId` type to generic `ModelId` type
- Default max tokens: 1000 (same as Perplexity)
- Timeout: 60 seconds
- Cost tier: premium
- Include cost information in response metadata ($3/$15 per M tokens)

### Reusability Opportunities

- Extend existing model configuration infrastructure from Deep Research Modes
- Reuse existing OpenRouter client (Grok 4 is available via OpenRouter)
- Leverage existing caching, deduplication, and retry logic
- Follow existing model configuration patterns in `src/config/`

### Scope Boundaries

**In Scope:**

- Add Grok 4 model support to existing search tool
- Refactor type naming from Perplexity-specific to generic
- Model configuration (timeout, cost tier, max tokens)
- Tool description updates noting Grok 4 limitations
- Response metadata with cost information

**Out of Scope:**

- Streaming responses
- Multimodal inputs (image processing)
- Parallel tool calling
- Other xAI models (grok-3-beta, grok-2-vision, etc.)
- Changing default model (Perplexity remains default)
- Creating a separate tool for Grok

### Technical Considerations

- OpenRouter is already integrated; Grok 4 is available through the same API
- Existing model parameter infrastructure from Deep Research Modes can be extended
- Type refactoring should maintain backwards compatibility
- Tool descriptions should clearly differentiate real-time search (Perplexity) from training-data responses (Grok)
