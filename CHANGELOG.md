# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.4.0](https://github.com/adawalli/nexus/compare/v3.3.2...v3.4.0) (2026-02-28)


### Features

* update deps, add security overrides, migrate to release-it ([12e10ac](https://github.com/adawalli/nexus/commit/12e10acd6b24534b51bf8af3ecb692d12071368b))

## [3.3.2](https://github.com/adawalli/nexus/compare/v3.3.1...v3.3.2) (2026-02-28)

### Bug Fixes

- use bun run test in publish workflow to isolate mock.module files ([b49a90f](https://github.com/adawalli/nexus/commit/b49a90f994b1878611050c103edb95725cf32ce1))

## [3.3.1](https://github.com/adawalli/nexus/compare/v3.3.0...v3.3.1) (2026-02-28)

### Bug Fixes

- correct repo name in CONTRIBUTING.md clone instructions ([522f462](https://github.com/adawalli/nexus/commit/522f4621aeb659082793e8bc76592e117419be57))

## [Unreleased]

### BREAKING CHANGES

- **Runtime Requirements**: Minimum Node.js version raised from 16.0.0 to 18.0.0. This change was necessary to support modern development dependencies (e.g., cross-env 10.x) and aligns with Node.js LTS support policy. Node.js 16 reached End-of-Life on September 11, 2023.

### Changed

- Updated `engines.node` in package.json to require Node.js >= 18.0.0
- Updated all documentation to reflect Node.js 18+ requirement

### Migration Guide

If you are running Node.js 16, you will need to upgrade to Node.js 18 or higher before using this version. We recommend using the latest Node.js LTS version (currently Node.js 20 or 22).

To upgrade Node.js:

- Using nvm: `nvm install 18 && nvm use 18`
- Using official installer: Visit [nodejs.org](https://nodejs.org/)

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
