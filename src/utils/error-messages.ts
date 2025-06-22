/**
 * User-friendly error message system with localization support
 */

import { BaseError, ERROR_CODES, ErrorCode } from '../errors/index.js';

import { isZodError, createUserFriendlyMessage } from './zod-error-parser.js';

/**
 * Severity levels for error messages
 */
export type MessageSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * Error message template with variables
 */
export interface ErrorMessageTemplate {
  code: ErrorCode;
  severity: MessageSeverity;
  title: string;
  message: string;
  suggestion: string;
  technicalDetails?: string;
  helpUrl?: string;
  variables?: string[];
}

/**
 * Localized error message
 */
export interface LocalizedErrorMessage {
  title: string;
  message: string;
  suggestion: string;
  technicalDetails?: string;
  helpUrl?: string;
  severity: MessageSeverity;
  timestamp: string;
  correlationId?: string;
}

/**
 * Error message templates for different error codes
 */
const ERROR_MESSAGE_TEMPLATES: Record<ErrorCode, ErrorMessageTemplate> = {
  // API Errors
  [ERROR_CODES.API_TIMEOUT]: {
    code: ERROR_CODES.API_TIMEOUT,
    severity: 'error',
    title: 'Service Timeout',
    message: 'The OpenRouter API took too long to respond.',
    suggestion:
      'Please try again in a few moments. If the problem persists, check the OpenRouter service status.',
    technicalDetails: 'Request timeout exceeded {timeout}ms',
    helpUrl: 'https://openrouter.ai/status',
    variables: ['timeout'],
  },

  [ERROR_CODES.API_RATE_LIMIT]: {
    code: ERROR_CODES.API_RATE_LIMIT,
    severity: 'warning',
    title: 'Rate Limit Exceeded',
    message: 'You have exceeded the API rate limit.',
    suggestion:
      'Please wait a moment before making another request. Consider upgrading your plan for higher limits.',
    technicalDetails: 'Rate limit: {limit} requests per {window}',
    helpUrl: 'https://openrouter.ai/docs/rate-limits',
    variables: ['limit', 'window'],
  },

  [ERROR_CODES.API_AUTHENTICATION]: {
    code: ERROR_CODES.API_AUTHENTICATION,
    severity: 'error',
    title: 'Authentication Failed',
    message: 'Your API key is invalid or has expired.',
    suggestion:
      'Please check your API key in the configuration settings. Generate a new key if needed.',
    technicalDetails: 'Authentication failed with status code {statusCode}',
    helpUrl: 'https://openrouter.ai/keys',
    variables: ['statusCode'],
  },

  [ERROR_CODES.API_SERVER_ERROR]: {
    code: ERROR_CODES.API_SERVER_ERROR,
    severity: 'error',
    title: 'Server Error',
    message: 'The OpenRouter service is currently experiencing issues.',
    suggestion:
      'This is a temporary issue. Please try again later or check the service status.',
    technicalDetails: 'Server returned status code {statusCode}',
    helpUrl: 'https://openrouter.ai/status',
    variables: ['statusCode'],
  },

  // Configuration Errors
  [ERROR_CODES.CONFIG_MISSING]: {
    code: ERROR_CODES.CONFIG_MISSING,
    severity: 'error',
    title: 'Missing Configuration',
    message: 'Required configuration setting is missing.',
    suggestion:
      'Please check your configuration file and ensure all required settings are provided.',
    technicalDetails: 'Missing configuration key: {key}',
    variables: ['key'],
  },

  [ERROR_CODES.CONFIG_INVALID]: {
    code: ERROR_CODES.CONFIG_INVALID,
    severity: 'error',
    title: 'Invalid Configuration',
    message: 'Configuration setting has an invalid value.',
    suggestion:
      'Please check the configuration documentation and correct the invalid value.',
    technicalDetails: 'Invalid value for {key}: {value}',
    variables: ['key', 'value'],
  },

  [ERROR_CODES.CONFIG_TYPE_MISMATCH]: {
    code: ERROR_CODES.CONFIG_TYPE_MISMATCH,
    severity: 'error',
    title: 'Configuration Type Error',
    message: 'Configuration setting has the wrong data type.',
    suggestion:
      'Please check the expected data type and correct the configuration.',
    technicalDetails: 'Expected {expectedType} for {key}, got {actualType}',
    variables: ['expectedType', 'key', 'actualType'],
  },

  // Validation Errors
  [ERROR_CODES.VALIDATION_REQUIRED]: {
    code: ERROR_CODES.VALIDATION_REQUIRED,
    severity: 'error',
    title: 'Required Field Missing',
    message: 'A required field is missing from your request.',
    suggestion: 'Please provide all required fields and try again.',
    technicalDetails: 'Missing required field: {field}',
    variables: ['field'],
  },

  [ERROR_CODES.VALIDATION_FORMAT]: {
    code: ERROR_CODES.VALIDATION_FORMAT,
    severity: 'error',
    title: 'Invalid Format',
    message: 'The provided value does not match the expected format.',
    suggestion: 'Please check the format requirements and correct the value.',
    technicalDetails: 'Invalid format for {field}: {value}',
    variables: ['field', 'value'],
  },

  [ERROR_CODES.VALIDATION_RANGE]: {
    code: ERROR_CODES.VALIDATION_RANGE,
    severity: 'error',
    title: 'Value Out of Range',
    message: 'The provided value is outside the acceptable range.',
    suggestion: 'Please provide a value within the acceptable range.',
    technicalDetails:
      'Value {value} for {field} must be between {min} and {max}',
    variables: ['value', 'field', 'min', 'max'],
  },

  // Network Errors
  [ERROR_CODES.NETWORK_TIMEOUT]: {
    code: ERROR_CODES.NETWORK_TIMEOUT,
    severity: 'error',
    title: 'Network Timeout',
    message: 'The network request timed out.',
    suggestion: 'Please check your internet connection and try again.',
    technicalDetails: 'Network timeout after {timeout}ms',
    variables: ['timeout'],
  },

  [ERROR_CODES.NETWORK_CONNECTION]: {
    code: ERROR_CODES.NETWORK_CONNECTION,
    severity: 'error',
    title: 'Connection Failed',
    message: 'Unable to connect to the service.',
    suggestion: 'Please check your internet connection and firewall settings.',
    technicalDetails: 'Connection failed to {url}',
    variables: ['url'],
  },

  [ERROR_CODES.NETWORK_DNS]: {
    code: ERROR_CODES.NETWORK_DNS,
    severity: 'error',
    title: 'DNS Resolution Failed',
    message: 'Unable to resolve the service hostname.',
    suggestion: 'Please check your DNS settings and try again.',
    technicalDetails: 'DNS resolution failed for {hostname}',
    variables: ['hostname'],
  },

  // MCP Protocol Errors
  [ERROR_CODES.MCP_INVALID_REQUEST]: {
    code: ERROR_CODES.MCP_INVALID_REQUEST,
    severity: 'error',
    title: 'Invalid MCP Request',
    message: 'The request format is not valid for the MCP protocol.',
    suggestion:
      'Please check the MCP protocol documentation and correct the request format.',
    technicalDetails: 'Invalid request format for method {method}',
    variables: ['method'],
  },

  [ERROR_CODES.MCP_METHOD_NOT_FOUND]: {
    code: ERROR_CODES.MCP_METHOD_NOT_FOUND,
    severity: 'error',
    title: 'Method Not Found',
    message: 'The requested MCP method is not supported.',
    suggestion: 'Please check the available methods and use a supported one.',
    technicalDetails: 'Method {method} not found',
    variables: ['method'],
  },

  [ERROR_CODES.MCP_PROTOCOL_VERSION]: {
    code: ERROR_CODES.MCP_PROTOCOL_VERSION,
    severity: 'error',
    title: 'Protocol Version Mismatch',
    message: 'The MCP protocol version is not compatible.',
    suggestion: 'Please update your MCP client to a compatible version.',
    technicalDetails: 'Protocol version {version} not supported',
    variables: ['version'],
  },
};

/**
 * Fallback error message for unknown errors
 */
const FALLBACK_ERROR_MESSAGE: ErrorMessageTemplate = {
  code: 'UNKNOWN_ERROR' as ErrorCode,
  severity: 'error',
  title: 'Unexpected Error',
  message: 'An unexpected error occurred.',
  suggestion:
    'Please try again later. If the problem persists, contact support.',
  technicalDetails: 'Error: {error}',
};

/**
 * Replace variables in a string template
 */
function replaceVariables(
  template: string,
  variables: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = variables[key];
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Create a localized error message from an error
 */
export function createErrorMessage(
  error: unknown,
  variables: Record<string, string | number> = {},
  correlationId?: string
): LocalizedErrorMessage {
  let template: ErrorMessageTemplate;

  // Handle Zod validation errors with enhanced parsing
  if (isZodError(error)) {
    const parsedError = createUserFriendlyMessage(error);

    return {
      title: 'Validation Error',
      message: parsedError.message,
      suggestion:
        parsedError.details?.[0]?.suggestion ||
        'Please check your input parameters and try again.',
      technicalDetails: parsedError.details
        ? JSON.stringify(parsedError.details, null, 2)
        : undefined,
      severity: 'error',
      timestamp: new Date().toISOString(),
      correlationId,
    };
  }

  if (error instanceof BaseError) {
    template =
      ERROR_MESSAGE_TEMPLATES[error.code as ErrorCode] ||
      FALLBACK_ERROR_MESSAGE;

    // Add error-specific variables
    if (error.context) {
      Object.assign(variables, error.context);
    }
  } else if (error instanceof Error) {
    template = FALLBACK_ERROR_MESSAGE;
    variables.error = error.message;
  } else {
    template = FALLBACK_ERROR_MESSAGE;
    variables.error = String(error);
  }

  return {
    title: replaceVariables(template.title, variables),
    message: replaceVariables(template.message, variables),
    suggestion: replaceVariables(template.suggestion, variables),
    technicalDetails: template.technicalDetails
      ? replaceVariables(template.technicalDetails, variables)
      : undefined,
    helpUrl: template.helpUrl,
    severity: template.severity,
    timestamp: new Date().toISOString(),
    correlationId,
  };
}

/**
 * Create a user-friendly error response for MCP protocol
 */
export function createMCPErrorResponse(
  error: unknown,
  variables: Record<string, string | number> = {},
  correlationId?: string
): {
  code: number;
  message: string;
  data?: {
    title: string;
    suggestion: string;
    helpUrl?: string;
    correlationId?: string;
    technicalDetails?: string;
  };
} {
  const errorMessage = createErrorMessage(error, variables, correlationId);

  // Map severity to MCP error codes
  const errorCodeMap: Record<MessageSeverity, number> = {
    info: -32000,
    warning: -32001,
    error: -32002,
    critical: -32003,
  };

  return {
    code: errorCodeMap[errorMessage.severity],
    message: errorMessage.message,
    data: {
      title: errorMessage.title,
      suggestion: errorMessage.suggestion,
      helpUrl: errorMessage.helpUrl,
      correlationId: errorMessage.correlationId,
      technicalDetails: errorMessage.technicalDetails,
    },
  };
}

/**
 * Format error for display in different contexts
 */
export function formatErrorForDisplay(
  error: unknown,
  format: 'plain' | 'markdown' | 'html' = 'plain',
  variables: Record<string, string | number> = {},
  correlationId?: string
): string {
  const errorMessage = createErrorMessage(error, variables, correlationId);

  switch (format) {
    case 'markdown':
      return formatMarkdownError(errorMessage);
    case 'html':
      return formatHtmlError(errorMessage);
    default:
      return formatPlainError(errorMessage);
  }
}

/**
 * Format error as plain text
 */
function formatPlainError(errorMessage: LocalizedErrorMessage): string {
  let output = `${errorMessage.title}: ${errorMessage.message}\n`;
  output += `Suggestion: ${errorMessage.suggestion}\n`;

  if (errorMessage.helpUrl) {
    output += `Help: ${errorMessage.helpUrl}\n`;
  }

  if (errorMessage.correlationId) {
    output += `Reference ID: ${errorMessage.correlationId}\n`;
  }

  if (errorMessage.technicalDetails) {
    output += `Technical Details: ${errorMessage.technicalDetails}\n`;
  }

  return output.trim();
}

/**
 * Format error as markdown
 */
function formatMarkdownError(errorMessage: LocalizedErrorMessage): string {
  let output = `## ${errorMessage.title}\n\n`;
  output += `${errorMessage.message}\n\n`;
  output += `**Suggestion:** ${errorMessage.suggestion}\n\n`;

  if (errorMessage.helpUrl) {
    output += `**Help:** [View Documentation](${errorMessage.helpUrl})\n\n`;
  }

  if (errorMessage.correlationId) {
    output += `**Reference ID:** \`${errorMessage.correlationId}\`\n\n`;
  }

  if (errorMessage.technicalDetails) {
    output += `**Technical Details:** \`${errorMessage.technicalDetails}\`\n\n`;
  }

  return output.trim();
}

/**
 * Format error as HTML
 */
function formatHtmlError(errorMessage: LocalizedErrorMessage): string {
  let output = `<div class="error-message error-${errorMessage.severity}">`;
  output += `<h3>${escapeHtml(errorMessage.title)}</h3>`;
  output += `<p>${escapeHtml(errorMessage.message)}</p>`;
  output += `<p><strong>Suggestion:</strong> ${escapeHtml(errorMessage.suggestion)}</p>`;

  if (errorMessage.helpUrl) {
    output += `<p><strong>Help:</strong> <a href="${escapeHtml(errorMessage.helpUrl)}" target="_blank">View Documentation</a></p>`;
  }

  if (errorMessage.correlationId) {
    output += `<p><strong>Reference ID:</strong> <code>${escapeHtml(errorMessage.correlationId)}</code></p>`;
  }

  if (errorMessage.technicalDetails) {
    output += `<details><summary>Technical Details</summary><code>${escapeHtml(errorMessage.technicalDetails)}</code></details>`;
  }

  output += '</div>';
  return output;
}

/**
 * Escape HTML characters
 */
function escapeHtml(text: string): string {
  // Node.js environment - no DOM
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Get available error codes for reference
 */
export function getAvailableErrorCodes(): ErrorCode[] {
  return Object.values(ERROR_CODES);
}

/**
 * Get error message template by code
 */
export function getErrorTemplate(
  code: ErrorCode
): ErrorMessageTemplate | undefined {
  return ERROR_MESSAGE_TEMPLATES[code];
}

/**
 * Validate error message template
 */
export function validateErrorTemplate(template: ErrorMessageTemplate): boolean {
  const required = ['code', 'severity', 'title', 'message', 'suggestion'];
  return required.every(
    field => field in template && template[field as keyof ErrorMessageTemplate]
  );
}
