# Product Mission

## Pitch

Nexus MCP is a Model Context Protocol server that helps developers and AI-assisted workflows access real-time web information by providing AI-powered search with citations through OpenRouter's Perplexity Sonar models. Zero-install deployment via `npx nexus-mcp` means instant integration with any MCP-compatible client.

## Users

### Primary Customers

- **Developers using MCP clients**: Engineers working with Claude Desktop, Cursor, Claude Code, or other MCP-compatible tools who need current web information during development
- **AI-assisted researchers**: Users who rely on AI workflows for research and need real-time, cited information rather than stale training data
- **Teams building AI applications**: Organizations integrating web search capabilities into their AI-powered products through the MCP protocol

### User Personas

**Alex** (28-40)

- **Role:** Full-stack developer
- **Context:** Uses Claude Code or Cursor daily for development work. Frequently needs to look up current documentation, API changes, or recent library updates while coding.
- **Pain Points:** Context-switching to browser disrupts flow. AI assistants have outdated information. Manual copy-paste of search results is tedious.
- **Goals:** Stay in the IDE. Get accurate, current information with sources. Trust the answers are up-to-date.

**Jordan** (30-50)

- **Role:** Technical writer or researcher
- **Context:** Creates documentation, technical reports, or market analysis using AI assistance. Needs factual, verifiable information with proper citations.
- **Pain Points:** AI hallucinations on factual matters. No way to verify claims. Needs to cross-reference multiple sources manually.
- **Goals:** Get comprehensive answers with cited sources. Verify information accuracy. Produce trustworthy content efficiently.

**Sam** (25-45)

- **Role:** DevOps or platform engineer
- **Context:** Building internal tools and automation. Wants to add web search capability to AI-powered systems without managing infrastructure.
- **Pain Points:** Running search infrastructure is complex. API integrations require maintenance. Self-hosted solutions need security hardening.
- **Goals:** Drop-in solution that just works. No servers to manage. Predictable API costs through OpenRouter.

## The Problem

### AI Assistants Lack Current Information

Large language models are trained on historical data, leaving users without access to current information during AI-assisted workflows. When developers ask about recent API changes, new security vulnerabilities, or current best practices, they get outdated or fabricated answers.

**Our Solution:** Nexus MCP bridges AI assistants to real-time web search through Perplexity's Sonar models. Search results include citations, letting users verify information and trust the answers they receive.

### MCP Clients Need Search Without Complexity

MCP-compatible clients like Claude Desktop and Cursor lack built-in web search. Adding this capability typically requires running servers, managing API keys across services, and handling authentication complexity.

**Our Solution:** Single command deployment (`npx nexus-mcp`) with one API key (OpenRouter). Production-ready architecture with caching, retry logic, and error handling built in.

## Differentiators

### Zero-Install Deployment

Unlike traditional MCP servers that require cloning repos, installing dependencies, and configuring builds, Nexus MCP runs directly via NPX. One command, one environment variable, and you're searching.

This results in setup measured in seconds rather than minutes, and eliminates "works on my machine" deployment issues.

### Production Architecture Out of the Box

Unlike proof-of-concept MCP servers, Nexus MCP includes request caching, deduplication, retry logic with exponential backoff, structured error handling, and correlation IDs for debugging.

This results in reliable operation under real-world conditions without users needing to add their own resilience layer.

### Citation-First Search Results

Unlike generic web scrapers or search APIs, Nexus MCP uses Perplexity Sonar models that synthesize information and provide source citations. Users get answers, not just links.

This results in trustworthy, verifiable information that users can cite in their own work.

## Key Features

### Core Features

- **AI-Powered Search:** Natural language queries processed by Perplexity Sonar models, returning synthesized answers rather than raw search results
- **Source Citations:** Every response includes the sources used, enabling verification and further reading
- **MCP Protocol Compliance:** Full compatibility with the Model Context Protocol for seamless integration with Claude Desktop, Cursor, and other MCP clients

### Reliability Features

- **Request Caching:** Identical queries within the cache window return instantly without API costs
- **Request Deduplication:** Concurrent identical requests share a single API call
- **Retry Logic:** Transient failures trigger automatic retry with exponential backoff
- **Structured Error Handling:** Clear, actionable error messages with correlation IDs for debugging

### Developer Experience

- **Zero-Install Deployment:** `npx nexus-mcp` starts the server immediately
- **Single API Key:** One OpenRouter key handles all authentication
- **Configuration Status Resource:** Query `config://status` to verify server health and settings
- **Structured Logging:** Winston-based logging with configurable levels for debugging
