<!-- markdownlint-disable MD033 MD041 -->

<div align="center">

# 🔍 Nexus MCP Server

**AI integration without the complexity**

[![npm version](https://img.shields.io/npm/v/nexus-mcp.svg)](https://www.npmjs.com/package/nexus-mcp)
![NPM Downloads](https://img.shields.io/npm/dt/nexus-mcp?style=flat-square&logo=npm&label=downloads)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![MCP Compatible](https://img.shields.io/badge/MCP-Compatible-green.svg)](https://modelcontextprotocol.io/)
[![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/adawalli/nexus)](https://coderabbit.ai)

_Intelligent AI model search and discovery with zero-install simplicity_

[Quick Start](#-quick-start) • [Features](#-features) • [Documentation](#-documentation) • [Contributing](#-contributing)

</div>

---

## What is Nexus?

Nexus is a **Model Context Protocol (MCP) server** that provides AI-powered web search functionality through the OpenRouter API. It integrates with MCP-compatible clients including Claude Desktop and Cursor, providing search capabilities via the Perplexity Sonar model family.

### Key Characteristics

- **Zero-install deployment**: Executable via `npx` with no build requirements
- **OpenRouter integration**: Uses Perplexity Sonar models for web search with citations
- **MCP protocol compliance**: Implements standard MCP tool and resource interfaces
- **Production architecture**: Includes request caching, deduplication, retry logic, and error handling
- **Type-safe implementation**: Full TypeScript coverage with strict type checking

## Features

### Deployment

- NPX-based execution with zero local installation
- Cross-platform compatibility (macOS, Linux, Windows)
- Node.js 18+ runtime requirement
- Automated version updates via npm registry

### Search Capabilities

- Perplexity Sonar model family integration
- Real-time web search with current information
- Structured citation extraction from responses
- Configurable model parameters (temperature, max tokens, penalties)

### Architecture

- Comprehensive error handling with typed error classes
- Request caching with configurable TTL
- Request deduplication for concurrent identical queries
- Automatic retry logic with exponential backoff
- Winston-based structured logging
- TypeScript strict mode implementation with full type coverage

## Quick Start

### Prerequisites

- Node.js 18 or higher
- OpenRouter API key ([register at openrouter.ai](https://openrouter.ai))

### NPX Installation

Execute the server without local installation:

```bash
# Set your OpenRouter API key
export OPENROUTER_API_KEY=your-api-key-here

# Run the server via NPX
npx nexus-mcp
```

The server starts and listens for MCP client connections via STDIO transport.

### Testing the NPX Installation

```bash
# Test the CLI help
npx nexus-mcp --help

# Test the version
npx nexus-mcp --version

# Run with your API key
OPENROUTER_API_KEY=your-key npx nexus-mcp
```

## Alternative: Local Development Installation

For local development or customization:

1. Clone the repository:

```bash
git clone https://github.com/adawalli/nexus.git
cd nexus
```

2. Install dependencies:

```bash
npm install
```

3. Build the server:

```bash
npm run build
```

4. Configure your OpenRouter API key:

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your actual API key
# OPENROUTER_API_KEY=your-api-key-here
```

5. Test the server:

```bash
npm start
```

## Integration with MCP Clients

### NPX-Based Integration (Recommended)

Configure MCP clients to execute the server via NPX:

### Claude Code

Configuration in `~/.claude/mcp_settings.json`:

```json
{
  "mcpServers": {
    "nexus": {
      "command": "npx",
      "args": ["nexus-mcp"],
      "env": {
        "OPENROUTER_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

Restart Claude Code after configuration changes.

### Cursor

Add server configuration in Cursor's MCP settings:

- **Name**: `nexus`
- **Command**: `npx`
- **Args**: `["nexus-mcp"]`
- **Environment Variables**: `OPENROUTER_API_KEY=your-api-key-here`

Restart Cursor after configuration changes.

### Generic MCP Client Configuration

Standard MCP client connection parameters:

- **Transport**: stdio
- **Command**: `npx`
- **Args**: `["nexus-mcp"]`
- **Environment**: `OPENROUTER_API_KEY=your-api-key-here`

### Alternative: Local Installation

If you prefer using a local installation (after following the local development setup):

```json
{
  "mcpServers": {
    "nexus": {
      "command": "node",
      "args": ["/path/to/nexus-mcp/dist/cli.js"],
      "env": {
        "OPENROUTER_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## Usage

Once integrated, you can use the search tool in your MCP client:

### Basic Search

```
Use the search tool to find information about "latest developments in AI"
```

### Advanced Search with Parameters

```
Search for "climate change solutions" using:
- Model: perplexity/sonar
- Max tokens: 2000
- Temperature: 0.3
```

## Available Tools

### `search`

The main search tool that provides AI-powered web search capabilities.

**Parameters:**

- `query` (required): Search query (1-2000 characters)
- `model` (optional): Perplexity model to use (default: "perplexity/sonar")
- `maxTokens` (optional): Maximum response tokens (1-4000, default: 1000)
- `temperature` (optional): Response randomness (0-2, default: 0.7)

**Example Response:**

```
Based on current information, here are the latest developments in AI...

[Detailed AI-generated response with current information]

---
**Search Metadata:**
- Model: perplexity/sonar
- Response time: 1250ms
- Tokens used: 850
- Sources: 5 found
```

## Configuration

### Environment Variables

- `OPENROUTER_API_KEY` (required): Your OpenRouter API key
- `NODE_ENV` (optional): Environment setting (development, production, test)
- `LOG_LEVEL` (optional): Logging level (debug, info, warn, error)

### Advanced Configuration

The server supports additional configuration through environment variables:

- `OPENROUTER_TIMEOUT_MS`: Request timeout in milliseconds (default: 30000)
- `OPENROUTER_MAX_RETRIES`: Maximum retry attempts (default: 3)
- `OPENROUTER_BASE_URL`: Custom OpenRouter API base URL

## Resources

The server provides a configuration status resource at `config://status` that shows:

- Server health status
- Configuration information (with masked API key)
- Search tool availability
- Server uptime and version

## Troubleshooting

### NPX-Specific Issues

**"npx: command not found"**

- Ensure Node.js 18+ is installed: `node --version`
- Update npm: `npm install -g npm@latest`

**"Cannot find package 'nexus-mcp'"**

- The package may not be published yet. Use local installation instead
- Verify network connectivity for npm registry access

**NPX takes a long time to start**

- This is normal on first run as NPX downloads the package
- Subsequent runs will be faster due to caching
- For faster startup, use local installation instead

**"Permission denied" errors with NPX**

- Try: `npx --yes nexus-mcp --stdio`
- Or set npm permissions: `npm config set user 0 && npm config set unsafe-perm true`

### Common Issues

**"Search functionality is not available"**

- Ensure `OPENROUTER_API_KEY` environment variable is set
- Verify your API key is valid at [OpenRouter](https://openrouter.ai)
- Check the server logs for initialization errors

**"Authentication failed: Invalid API key"**

- Double-check your API key format and validity
- Ensure the key has sufficient credits/permissions
- Test the key directly at OpenRouter dashboard

**"Rate limit exceeded"**

- Wait for the rate limit to reset (usually 1 minute)
- Consider upgrading your OpenRouter plan for higher limits
- Monitor usage in your OpenRouter dashboard

**Connection timeouts**

- Check your internet connection
- The server will automatically retry failed requests
- Increase timeout if needed: `OPENROUTER_TIMEOUT_MS=60000`

**MCP client can't connect to server**

- Verify your MCP configuration uses the correct command and arguments
- Check that Node.js 18+ is available in your MCP client's environment
- Ensure the API key is properly set in the environment variables

### Debug Logging

Enable debug logging by:

**For local development:** Add `LOG_LEVEL=debug` to your `.env` file

**For MCP clients:** Add `LOG_LEVEL: "debug"` to the `env` section of your MCP configuration

This will provide detailed information about:

- Configuration loading
- API requests and responses
- Error details and stack traces
- Performance metrics

### Testing Connection

You can test if the server is working by checking the configuration status resource in your MCP client, or by running a simple search query.

## Development

For developers working on this server:

```bash
# Development with hot reload
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format
```

## API Costs

OpenRouter charges for API usage based on token consumption:

- **Pricing**: See current rates at [OpenRouter Models](https://openrouter.ai/models)
- **Monitoring**: Usage tracking available in OpenRouter dashboard
- **Limits**: Configure spending limits in OpenRouter account settings
- **Optimization**: Server implements response caching and request deduplication to minimize redundant API calls

## 📚 Documentation

<div align="center">

| 📖 **Guide**        | 🔗 **Link**                                 | 📝 **Description**               |
| ------------------- | ------------------------------------------- | -------------------------------- |
| **Quick Start**     | [Getting Started](#-quick-start)            | Zero-install setup in 30 seconds |
| **API Reference**   | [MCP Tools](CLAUDE.md#development-commands) | Complete command reference       |
| **Configuration**   | [Environment Setup](#configuration)         | Advanced configuration options   |
| **Contributing**    | [Contributing Guide](CONTRIBUTING.md)       | Join our open source community   |
| **Troubleshooting** | [Common Issues](#troubleshooting)           | Solutions to common problems     |

</div>

## 🤝 Contributing

We welcome contributions from developers of all experience levels!

<table>
<tr>
<td width="33%">

### 🚀 **Get Started**

- Fork the repository
- Read our [Contributing Guide](CONTRIBUTING.md)
- Check out [good first issues](https://github.com/search?q=repo%3Anexus-mcp+label%3A%22good+first+issue%22&type=issues)

</td>
<td width="33%">

### 🐛 **Report Issues**

- [Bug Reports](https://github.com/adawalli/nexus/issues/new)
- [Feature Requests](https://github.com/adawalli/nexus/issues/new)
- [Ask Questions](https://github.com/adawalli/nexus/issues/new)

</td>
<td width="33%">

### 💬 **Join Community**

- [GitHub Discussions](https://github.com/adawalli/nexus/discussions)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Roadmap & Project Board](https://github.com/adawalli/nexus/projects)

</td>
</tr>
</table>

### 🌟 Recognition

Contributors are recognized in our:

- [Contributors list](https://github.com/adawalli/nexus/graphs/contributors)
- Release notes for significant contributions
- Community spotlights and testimonials

## 🔗 Related Projects

- [Model Context Protocol](https://modelcontextprotocol.io) - The standard we implement
- [OpenRouter](https://openrouter.ai) - Our AI model provider
- [Claude Desktop](https://claude.ai) - Primary MCP client
- [Cursor](https://cursor.sh) - AI-powered code editor with MCP support

## 📞 Support & Community

<div align="center">

| 💬 **Need Help?**    | 🔗 **Resource**                                                                                      |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| **Quick Questions**  | [GitHub Discussions](https://github.com/adawalli/nexus/discussions)                                  |
| **Bug Reports**      | [GitHub Issues](https://github.com/adawalli/nexus/issues)                                            |
| **Documentation**    | [OpenRouter Docs](https://openrouter.ai/docs) • [MCP Specification](https://modelcontextprotocol.io) |
| **Feature Requests** | [Enhancement Proposals](https://github.com/adawalli/nexus/issues/new)                                |

</div>

## 📄 License

**MIT License** - see [LICENSE](LICENSE) file for details.

---

<div align="center">

**Made with ❤️ by the open source community**

[⭐ Star us on GitHub](https://github.com/adawalli/nexus) • [📦 View on NPM](https://www.npmjs.com/package/nexus-mcp) • [📚 Read the Docs](CLAUDE.md)

_Nexus: AI integration without the complexity_

[![Star History Chart](https://api.star-history.com/svg?repos=adawalli/nexus&type=Date)](https://star-history.com/#adawalli/nexus&Date)

</div>
