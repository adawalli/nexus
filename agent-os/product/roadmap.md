# Product Roadmap

## Phase 1: Core Features

1. [x] Deep Research Modes - Add `model` parameter to search tool supporting all four Perplexity Sonar tiers (sonar, sonar-pro, sonar-reasoning-pro, sonar-deep-research) with model-specific timeouts, cost notes in metadata, and backwards-compatible defaults. See `tasks/prd-deep-research-modes.md`. `L`

## Phase 2: Enhanced Search

2. [ ] Advanced Search Parameters - Add search context options (domain restrictions, date ranges, content filters) and support for follow-up queries that maintain session context. `L`

3. [ ] Batch Search Operations - Add `batch_search` tool for executing multiple queries efficiently with consolidated, cross-referenced results. `M`

## Phase 3: Observability

4. [ ] Usage Metrics & Export - Add `metrics://usage` resource for session stats (search counts, cache hits, token usage, costs) and structured result export (JSON, Markdown). `M`
