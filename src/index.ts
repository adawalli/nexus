import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import winston from 'winston';

// Load environment variables from .env file
dotenv.config();

import { ConfigurationManager, ConfigurationError } from './config/index.js';
import { createSearchTool } from './tools/search.js';
import { validateSearchResponse } from './types/search.js';
import { JSONValidator, safeStringify } from './utils/json-validator.js';
import { validateSearchInput } from './schemas/search.js';
import { createUserFriendlyMessage } from './utils/zod-error-parser.js';
import {
  logger,
  withCorrelationId,
  generateCorrelationId,
} from './utils/logger.js';
import {
  MCPErrorHandler,
  withMCPErrorHandling,
} from './utils/mcp-error-handler.js';
import { stdioHandler } from './utils/stdio-handler.js';

// Export our OpenRouter client and types
export * from './clients/index.js';
export * from './types/index.js';
export * from './tools/index.js';
export * from './schemas/index.js';

// Global configuration and legacy winston logger
let config: ConfigurationManager;
let legacyLogger: winston.Logger;

// Initialize configuration and logger
function initializeConfiguration(): void {
  try {
    config = ConfigurationManager.getInstance();

    // Configure legacy logger with settings from configuration
    legacyLogger = winston.createLogger({
      level: config.getLogLevel(),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
          stderrLevels: ['error', 'warn', 'info', 'debug'],
        }),
      ],
    });

    logger.info('Configuration loaded successfully', {
      config: config.getSafeConfig(),
    });
  } catch (error) {
    // Create a basic logger for error reporting if configuration fails
    const basicLogger = winston.createLogger({
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.simple()
      ),
      transports: [new winston.transports.Console()],
    });

    if (error instanceof ConfigurationError) {
      basicLogger.error('Configuration validation failed:', {
        errors: error.errors,
        warnings: error.warnings,
      });
    } else {
      basicLogger.error('Failed to initialize configuration:', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    throw error;
  }
}

const server = new Server(
  {
    name: 'nexus',
    version: '1.0.0',
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

// Initialize search tool
let searchTool: ReturnType<typeof createSearchTool> | null = null;

// Initialize search tool with configuration
function initializeSearchTool(): void {
  try {
    const apiKey = config.getApiKey();
    searchTool = createSearchTool(apiKey);
    logger.info('Search tool initialized successfully', {
      apiKey: config.getMaskedApiKey(),
      defaultModel: config.getDefaultModel(),
      timeout: config.getTimeoutMs(),
    });
  } catch (error) {
    logger.error('Failed to initialize search tool', { error });
    throw error;
  }
}

// Request handlers with enhanced error handling
server.setRequestHandler(
  ListToolsRequestSchema,
  withMCPErrorHandling('list_tools', async () => {
    const correlationId = generateCorrelationId();

    return withCorrelationId(correlationId, () => {
      logger.debug('Received list tools request');

      const tools = [];

      // Add search tool if available
      if (searchTool) {
        tools.push({
          name: 'search',
          description:
            'Nexus AI-powered search using Perplexity models via OpenRouter. Searches the web for current information and provides comprehensive answers with sources.',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description:
                  'The search query to process (required, 1-2000 characters)',
                minLength: 1,
                maxLength: 2000,
              },
              model: {
                type: 'string',
                description: 'Perplexity model to use for search',
                enum: [
                  'perplexity/sonar',
                  'perplexity/sonar-small-chat',
                  'perplexity/sonar-medium-chat',
                  'perplexity/sonar-large-chat',
                  'perplexity/sonar-small-online',
                  'perplexity/sonar-medium-online',
                ],
                default: 'perplexity/sonar',
              },
              maxTokens: {
                type: 'number',
                description:
                  'Maximum number of tokens in the response (1-4000)',
                minimum: 1,
                maximum: 4000,
                default: 1000,
              },
              temperature: {
                type: 'number',
                description: 'Controls randomness in the response (0-2)',
                minimum: 0,
                maximum: 2,
                default: 0.3,
              },
            },
            required: ['query'],
          },
        });
      }

      // Return the tools directly - MCP SDK will wrap this in JSON-RPC format
      return { tools };
    });
  })
);

server.setRequestHandler(
  CallToolRequestSchema,
  withMCPErrorHandling('call_tool', async request => {
    const correlationId = generateCorrelationId();

    return withCorrelationId(correlationId, async () => {
      logger.debug(`Received call tool request: ${request.params.name}`);

      switch (request.params.name) {
        case 'search': {
          if (!searchTool) {
            logger.error('Search tool not available - API key not configured');
            return MCPErrorHandler.createSafeResponse(
              new Error(
                'Search functionality is not available. Please configure OPENROUTER_API_KEY environment variable.'
              ),
              { method: 'search', correlationId }
            );
          }

          // Validate search request parameters using Zod schema
          try {
            validateSearchInput(request.params.arguments);
          } catch (error) {
            logger.warn('Search parameter validation failed', { error });

            // Use enhanced Zod error parsing for better user experience
            const parsedError = createUserFriendlyMessage(error);

            return {
              content: [
                {
                  type: 'text',
                  text: parsedError.message,
                },
              ],
            };
          }

          try {
            logger.info('Search request received', {
              query: request.params.arguments?.query,
              model: request.params.arguments?.model,
            });

            const searchResponse = await searchTool.search(
              request.params.arguments
            );

            if (!validateSearchResponse(searchResponse)) {
              logger.error('Invalid search response format', {
                searchResponse,
              });
              return MCPErrorHandler.createSafeResponse(
                new Error('Internal error: Invalid search response format'),
                { method: 'search', correlationId }
              );
            }

            if (!searchResponse.success) {
              logger.warn('Search request failed', {
                error: searchResponse.error,
                errorType: searchResponse.errorType,
              });

              // Return the specific error message directly instead of wrapping it
              return {
                content: [
                  {
                    type: 'text',
                    text: searchResponse.error,
                  },
                ],
                isError: true,
              };
            }

            const result = searchResponse.result!;

            // Format response with metadata
            const responseText = [
              result.content,
              '',
              '---',
              `**Search Metadata:**`,
              `- Model: ${result.metadata.model}`,
              `- Response time: ${result.metadata.responseTime}ms`,
              `- Tokens used: ${result.metadata.usage?.total_tokens || 'N/A'}`,
              result.sources.length > 0
                ? `- Sources: ${result.sources.length} found`
                : '',
            ]
              .filter(Boolean)
              .join('\n');

            logger.info('Search completed successfully', {
              requestId: searchResponse.requestId,
              tokensUsed: result.metadata.usage?.total_tokens,
              sourcesFound: result.sources.length,
              responseTime: result.metadata.responseTime,
            });

            return {
              content: [
                {
                  type: 'text',
                  text: responseText,
                },
              ],
            };
          } catch (error) {
            logger.error('Unexpected error during search', { error });
            return MCPErrorHandler.createSafeResponse(error, {
              method: 'search',
              correlationId,
            });
          }
        }

        default:
          logger.warn(`Unknown tool requested: ${request.params.name}`);
          return MCPErrorHandler.createSafeResponse(
            new Error(`Unknown tool: ${request.params.name}`),
            { method: request.params.name, correlationId }
          );
      }
    });
  })
);

server.setRequestHandler(
  ListResourcesRequestSchema,
  withMCPErrorHandling('list_resources', async () => {
    const correlationId = generateCorrelationId();

    return withCorrelationId(correlationId, () => {
      logger.debug('Received list resources request');
      // Return the resources directly - MCP SDK will wrap this in JSON-RPC format
      return {
        resources: [
          {
            uri: 'config://status',
            name: 'Nexus Configuration Status',
            description:
              'Current Nexus MCP server configuration and health information',
            mimeType: 'application/json',
          },
        ],
      };
    });
  })
);

server.setRequestHandler(
  ReadResourceRequestSchema,
  withMCPErrorHandling('read_resource', async request => {
    const correlationId = generateCorrelationId();

    return withCorrelationId(correlationId, async () => {
      logger.debug(`Received read resource request: ${request.params.uri}`);

      switch (request.params.uri) {
        case 'config://status': {
          try {
            const status = {
              status: 'healthy',
              timestamp: new Date().toISOString(),
              configuration: config ? config.getSafeConfig() : null,
              searchTool: {
                initialized: searchTool !== null,
                available: searchTool !== null,
              },
              server: {
                name: 'nexus',
                version: '1.0.0',
                uptime: process.uptime(),
              },
            };

            const statusJsonResult = JSONValidator.safeStringify(status, {
              sanitize: true,
              fallback: true,
            });

            return {
              contents: [
                {
                  uri: request.params.uri,
                  mimeType: 'application/json',
                  text: statusJsonResult.success
                    ? statusJsonResult.data
                    : safeStringify(status),
                },
              ],
            };
          } catch (error) {
            logger.error('Error generating status report', { error });
            const errorStatus = {
              status: 'error',
              timestamp: new Date().toISOString(),
              error: error instanceof Error ? error.message : String(error),
            };

            const errorJsonResult = JSONValidator.safeStringify(errorStatus, {
              sanitize: true,
              fallback: true,
            });

            return {
              contents: [
                {
                  uri: request.params.uri,
                  mimeType: 'application/json',
                  text: errorJsonResult.success
                    ? errorJsonResult.data
                    : safeStringify(errorStatus),
                },
              ],
            };
          }
        }

        default:
          return MCPErrorHandler.createSafeResponse(
            new Error(`Resource not found: ${request.params.uri}`),
            { method: 'read_resource', correlationId }
          );
      }
    });
  })
);

// Server lifecycle management
let isShuttingDown = false;

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress, forcing exit');
    process.exit(1);
  }

  isShuttingDown = true;
  logger.info(`Received ${signal}, starting graceful shutdown`);

  try {
    // Flush any pending STDIO operations
    await stdioHandler.flush();

    // Clean up STDIO handler resources
    await stdioHandler.cleanup();

    // Close server connections
    logger.info('Server shutdown completed', {
      stdioMetrics: stdioHandler.getMetrics(),
    });
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error });
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle unhandled errors with enhanced logging
process.on('uncaughtException', error => {
  logger.error('Uncaught exception', {
    error: error.message,
    stack: error.stack,
    name: error.name,
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: String(promise),
  });
  process.exit(1);
});

export async function createServer() {
  try {
    // Initialize configuration first
    initializeConfiguration();
    logger.info('Starting Nexus MCP server');

    // Initialize search tool after configuration is loaded
    initializeSearchTool();

    // Start the MCP server
    const transport = new StdioServerTransport();
    await server.connect(transport);

    logger.info('Nexus MCP server running on stdio', {
      version: '1.0.0',
      config: config.getSafeConfig(),
      stdioHandler: {
        options: stdioHandler.getMetrics(),
        initialized: true,
      },
    });

    return server;
  } catch (error) {
    // If we don't have a logger yet, create a basic one
    const errorLogger =
      legacyLogger ||
      winston.createLogger({
        level: 'error',
        format: winston.format.simple(),
        transports: [new winston.transports.Console()],
      });

    errorLogger.error('Failed to start server', { error });
    throw error;
  }
}

async function main() {
  try {
    await createServer();
  } catch {
    process.exit(1);
  }
}

// Only run main() if this file is executed directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    const errorLogger =
      legacyLogger ||
      winston.createLogger({
        level: 'error',
        format: winston.format.simple(),
        transports: [new winston.transports.Console()],
      });
    errorLogger.error('Fatal error in main', { error });
    process.exit(1);
  });
}
