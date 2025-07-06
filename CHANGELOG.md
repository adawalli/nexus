# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-07-06

### BREAKING CHANGES

- **CLI**: The `--stdio` flag is now enabled by default to align with the MCP specification. This means the server will use STDIO transport by default instead of requiring the flag to be explicitly set.

### Changed

- Default behavior of CLI now uses STDIO transport mode
- Improved MCP specification compliance

### Migration Guide

If you have automation or scripts that relied on the previous default behavior (non-STDIO mode), you will need to update them to explicitly handle the new STDIO default. The server will now communicate via STDIO by default, which is the standard MCP transport mechanism.

### Impact

This change ensures better compatibility with MCP clients and follows the MCP specification more closely. Most users should see improved integration with MCP-compliant tools.

## [1.0.8] - Previous Release

### Fixed

- Restricted model selection to only working perplexity/sonar model
- Improved model compatibility and reliability
