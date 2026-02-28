# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.3.1](https://github.com/adawalli/nexus/compare/v3.3.0...v3.3.1) (2026-02-28)


### Bug Fixes

* correct repo name in CONTRIBUTING.md clone instructions ([522f462](https://github.com/adawalli/nexus/commit/522f4621aeb659082793e8bc76592e117419be57))

## 1.0.0 (2026-02-28)

### ⚠ BREAKING CHANGES

- bump version to 3.0.0 for Node.js 18 requirement
- Node.js 18 or higher is now required. Users on Node.js 16 must upgrade to continue using new versions of this package.
- The --stdio flag is now enabled by default to align with the MCP specification. This affects automation and scripts that relied on the previous default behavior.

### Features

- add Claude Code hooks for automated code quality ([5f0599c](https://github.com/adawalli/nexus/commit/5f0599c95d43e4c26e3e19e8adaf8819658c959a))
- add Deep Research Modes with multi-tier Perplexity model support ([552d205](https://github.com/adawalli/nexus/commit/552d2052d328fde8802c93a1b4fad3f246bbf5cb))
- add development tooling and code quality setup ([6b945b4](https://github.com/adawalli/nexus/commit/6b945b47fb9e0063a43610cb0d948c00361a3fe8))
- add Grok 4 model support with searchType metadata ([9479512](https://github.com/adawalli/nexus/commit/947951257993a8b5fab49e95f6083cb017037cfc))
- add MCP server instructions for tool compaction support ([84af230](https://github.com/adawalli/nexus/commit/84af23038f5aecfb8f9e7031a8a175e6c36b0185))
- add OIDC autopublishing and fix Claude code review workflows ([deba97a](https://github.com/adawalli/nexus/commit/deba97a597063794331872198d34e5bf23141211))
- add project configuration and documentation structure ([0924bde](https://github.com/adawalli/nexus/commit/0924bde61e0e0a2286c39b01b73e1eb5ec5b7821))
- add repository metadata to package.json ([f75d134](https://github.com/adawalli/nexus/commit/f75d134ac40b8b3a315ba689ea8d5a8cece68412))
- add searchType metadata display to MCP server responses ([f6fe2be](https://github.com/adawalli/nexus/commit/f6fe2bebad380487c855eeb5a8250bd64f2f94ae))
- bump version to 2.0.0 for --stdio default breaking change ([ed96f73](https://github.com/adawalli/nexus/commit/ed96f73cf01995cb5f821f9734b1d4686fa8bd15))
- change default temperature from 0.7 to 0.3 ([fb9e569](https://github.com/adawalli/nexus/commit/fb9e569bc5d31d57419774ffe0c2cd3862bd6201))
- complete development tooling validation and setup ([12cc754](https://github.com/adawalli/nexus/commit/12cc7545e7f0b9fb486b3543045439528c6ba017))
- complete project sanity test and build fixes ([1af23f0](https://github.com/adawalli/nexus/commit/1af23f0c78dd3c201becb4f4f2af8411e86034ec))
- **config:** complete environment configuration system implementation ([65a7a97](https://github.com/adawalli/nexus/commit/65a7a972acd499ecf8941cfcc8f9eef26e450261))
- **config:** implement environment configuration schema and validation ([a82e77f](https://github.com/adawalli/nexus/commit/a82e77f395de50c196010c6885395a984950bd75))
- **distribution:** implement production NPX distribution with zero-install support ([e07469a](https://github.com/adawalli/nexus/commit/e07469a686284357eda260f20c7501d6a916d638))
- enhance error handling with contextual validation messages ([ca9243c](https://github.com/adawalli/nexus/commit/ca9243c60d290d54cdb7bf2d0451cfab24e9403a))
- **error-handling:** implement comprehensive error handling and logging system ([42770a9](https://github.com/adawalli/nexus/commit/42770a956120235a31dea90b6ae4e19e35937e2d))
- implement comprehensive MCP server framework ([02f8f20](https://github.com/adawalli/nexus/commit/02f8f20b3b59e4f94b98c04e6545c344242e3369))
- implement comprehensive search tool with OpenRouter integration ([e000588](https://github.com/adawalli/nexus/commit/e0005885b4f56fb151cfde89efce62624af597a7))
- implement comprehensive Vitest testing framework ([9fe1be0](https://github.com/adawalli/nexus/commit/9fe1be02a3b0d5ce2f5c3070df1eb8f2e0fecce0))
- implement OpenRouter API client with comprehensive features ([0605221](https://github.com/adawalli/nexus/commit/0605221c2fff4ea682b6ec91cde98b033c8b0a10))
- make --stdio the default CLI behavior ([d28002b](https://github.com/adawalli/nexus/commit/d28002b510d1f1e0018c3ef062333ffb927b1669))
- raise minimum Node.js version to 18.0.0 ([317089c](https://github.com/adawalli/nexus/commit/317089c4191994cee54b03447e07f2f42ca623fa))
- rebrand project from openrouter-search-mcp to nexus-mcp ([15f6590](https://github.com/adawalli/nexus/commit/15f65900edb4aee1dbb2b7df57e3ae712761cbac))
- **search:** implement advanced search features and performance optimization ([da1ccd4](https://github.com/adawalli/nexus/commit/da1ccd490a726b0874de2eea148fd5303ceb9081))
- **serialization:** implement comprehensive JSON validation and error handling ([f9af4a0](https://github.com/adawalli/nexus/commit/f9af4a08ed200827053246187994122918f0312d))
- **stdio:** implement comprehensive STDIO communication optimization and response buffering ([5e2baef](https://github.com/adawalli/nexus/commit/5e2baef03ba8e7430542ef9f6185207dd85f9063))
- **validation:** implement structured logging and JSON-RPC 2.0 compliance validation ([b551d3f](https://github.com/adawalli/nexus/commit/b551d3f7deed6d931167f8dd6e8991e8cd563634))

### Bug Fixes

- address MR feedback for Bun migration ([2347517](https://github.com/adawalli/nexus/commit/23475175ebd0ccb17e2209bc5391ee71c491b3ef))
- **build:** resolve TypeScript error and improve pre-commit ([000642b](https://github.com/adawalli/nexus/commit/000642baa3bc008450624cc682f880c63ad9408c))
- correct HTTP-Referer header to show proper repository URL in OpenRouter stats ([d9afeed](https://github.com/adawalli/nexus/commit/d9afeed40fbb932fccf2edc4c4e16fcd24214bd8))
- correct Zod v4 error function signature in model schema ([836d61d](https://github.com/adawalli/nexus/commit/836d61da3c8ffd5ec2571e0246837859cf2abe06))
- include package.json in npm distribution for proper version detection ([3684946](https://github.com/adawalli/nexus/commit/3684946b0fa74b60e6bb78dacfee3b9091b82cab))
- **mcp:** resolve JSON serialization errors in MCP protocol communication ([7dcf394](https://github.com/adawalli/nexus/commit/7dcf3944d25656be9755828c4894d402b64995ee))
- prevent duplicate server initialization in CLI execution ([f791932](https://github.com/adawalli/nexus/commit/f7919326dfae1d353f3f571c3b13917a9f489ed2))
- prevent logs from contaminating JSON-RPC stdout ([7bc85f4](https://github.com/adawalli/nexus/commit/7bc85f485e1605274cbc4f7ba901b7847c6e19e4))
- prevent pre-commit hooks from passing filenames to npm scripts ([38b479f](https://github.com/adawalli/nexus/commit/38b479fc625317ab317091a8aeb67ef2ae7e709e))
- remove double JSON-RPC wrapping in MCP server responses ([3173816](https://github.com/adawalli/nexus/commit/3173816d0c0b4b76aaebbe2bdefe5b6cc3727957))
- replace generic error messages with specific validation responses ([56dc6e5](https://github.com/adawalli/nexus/commit/56dc6e535f92ed4aa2ee7b15c059542a0b7f3565))
- resolve type errors and lint issues in JSON validator ([b10cbd2](https://github.com/adawalli/nexus/commit/b10cbd221d48781290791b326b122a569af2b1bf))
- resolve Winston logging warnings and dynamic CLI version reading ([93546a0](https://github.com/adawalli/nexus/commit/93546a05a2a61aa65fc575bb958127c697ef7ffa))
- restrict model selection to only working perplexity/sonar model ([89034bb](https://github.com/adawalli/nexus/commit/89034bbd0f417a4b9fd3e3ff1dbb0bfeada2a987))
- update imports to use renamed model types ([d6bcfcf](https://github.com/adawalli/nexus/commit/d6bcfcf9f1a84e71f56f07680655c0b4b9bbd9e8))
- update npm badge URL to use Shields.io instead of Badge Fury ([838a156](https://github.com/adawalli/nexus/commit/838a15615dc9dd4ad3225d996b0d7c4696145ccc))
- update type casting in test files for stricter TypeScript ([6df889b](https://github.com/adawalli/nexus/commit/6df889b8bef6de91ff49f23816cf3b70f75b885b))

### Miscellaneous Chores

- bump version to 3.0.0 for Node.js 18 requirement ([47dea4e](https://github.com/adawalli/nexus/commit/47dea4e5a49560f3b89bb76547863aaf125fe702))

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
