import { ZodError, ZodIssue } from 'zod';

import { SUPPORTED_MODELS } from '../schemas/search.js';

/**
 * Parse a Zod error and convert to user-friendly message
 */
export function parseZodError(error: ZodError): {
  message: string;
  details: Array<{
    field: string;
    issue: string;
    received?: unknown;
    expected?: string | string[];
    suggestion?: string;
  }>;
} {
  const details = error.issues.map(issue => parseZodIssue(issue));

  // Create a comprehensive error message
  const primaryIssue = details[0];
  let message: string;

  if (details.length === 1) {
    message = primaryIssue.suggestion || primaryIssue.issue;
  } else {
    const issueCount = details.length;
    message = `Found ${issueCount} validation errors. Primary issue: ${primaryIssue.suggestion || primaryIssue.issue}`;
  }

  return {
    message,
    details,
  };
}

/**
 * Parse individual Zod issue into user-friendly details
 */
function parseZodIssue(issue: ZodIssue): {
  field: string;
  issue: string;
  received?: unknown;
  expected?: string | string[];
  suggestion?: string;
} {
  const field = issue.path.join('.');

  switch (issue.code) {
    case 'invalid_type':
      return {
        field,
        issue: `Invalid type for ${field}`,
        received: issue.received,
        expected: issue.expected,
        suggestion: `Parameter '${field}' must be of type ${issue.expected}, but received ${issue.received}`,
      };

    case 'invalid_enum_value':
      return handleInvalidEnum(field, issue);

    case 'too_small':
      return handleTooSmall(field, issue);

    case 'too_big':
      return handleTooBig(field, issue);

    case 'invalid_string':
      return {
        field,
        issue: `Invalid string format for ${field}`,
        suggestion: `Parameter '${field}' has invalid string format: ${issue.validation}`,
      };

    case 'custom':
      return {
        field,
        issue: issue.message || `Custom validation failed for ${field}`,
        suggestion: issue.message,
      };

    default:
      return {
        field,
        issue: issue.message || `Validation failed for ${field}`,
        suggestion: issue.message,
      };
  }
}

/**
 * Handle invalid enum value with model-specific suggestions
 */
function handleInvalidEnum(
  field: string,
  issue: ZodIssue & { code: 'invalid_enum_value' }
): {
  field: string;
  issue: string;
  received?: unknown;
  expected?: string | string[];
  suggestion?: string;
} {
  const { received, options } = issue;

  // Special handling for model field
  if (field === 'model') {
    const suggestion = suggestModelName(String(received));
    return {
      field,
      issue: `Invalid model name: ${received}`,
      received,
      expected: SUPPORTED_MODELS as string[],
      suggestion: suggestion
        ? `Invalid model '${received}'. Did you mean '${suggestion}'? Supported models: ${SUPPORTED_MODELS.join(', ')}`
        : `Invalid model '${received}'. Supported models: ${SUPPORTED_MODELS.join(', ')}`,
    };
  }

  // Generic enum handling
  return {
    field,
    issue: `Invalid value for ${field}`,
    received,
    expected: options.map(String),
    suggestion: `Parameter '${field}' must be one of: ${options.join(', ')}. Received: ${received}`,
  };
}

/**
 * Handle "too small" validation errors
 */
function handleTooSmall(
  field: string,
  issue: ZodIssue & { code: 'too_small' }
): {
  field: string;
  issue: string;
  received?: unknown;
  expected?: string;
  suggestion?: string;
} {
  const { minimum, type, inclusive } = issue;

  if (type === 'string') {
    return {
      field,
      issue: `String too short for ${field}`,
      expected: `minimum ${minimum} characters`,
      suggestion: `Parameter '${field}' must be at least ${minimum} character${minimum === 1 ? '' : 's'} long`,
    };
  }

  if (type === 'number') {
    const operator = inclusive ? '>=' : '>';
    return {
      field,
      issue: `Number too small for ${field}`,
      expected: `${operator} ${minimum}`,
      suggestion: `Parameter '${field}' must be ${operator} ${minimum}`,
    };
  }

  if (type === 'array') {
    return {
      field,
      issue: `Array too small for ${field}`,
      expected: `minimum ${minimum} items`,
      suggestion: `Parameter '${field}' must contain at least ${minimum} item${minimum === 1 ? '' : 's'}`,
    };
  }

  return {
    field,
    issue: `Value too small for ${field}`,
    expected: `minimum ${minimum}`,
    suggestion: `Parameter '${field}' must be at least ${minimum}`,
  };
}

/**
 * Handle "too big" validation errors
 */
function handleTooBig(
  field: string,
  issue: ZodIssue & { code: 'too_big' }
): {
  field: string;
  issue: string;
  received?: unknown;
  expected?: string;
  suggestion?: string;
} {
  const { maximum, type, inclusive } = issue;

  if (type === 'string') {
    return {
      field,
      issue: `String too long for ${field}`,
      expected: `maximum ${maximum} characters`,
      suggestion: `Parameter '${field}' must be at most ${maximum} character${maximum === 1 ? '' : 's'} long`,
    };
  }

  if (type === 'number') {
    const operator = inclusive ? '<=' : '<';
    return {
      field,
      issue: `Number too large for ${field}`,
      expected: `${operator} ${maximum}`,
      suggestion: `Parameter '${field}' must be ${operator} ${maximum}`,
    };
  }

  if (type === 'array') {
    return {
      field,
      issue: `Array too large for ${field}`,
      expected: `maximum ${maximum} items`,
      suggestion: `Parameter '${field}' must contain at most ${maximum} item${maximum === 1 ? '' : 's'}`,
    };
  }

  return {
    field,
    issue: `Value too large for ${field}`,
    expected: `maximum ${maximum}`,
    suggestion: `Parameter '${field}' must be at most ${maximum}`,
  };
}

/**
 * Suggest similar model names using simple string similarity
 */
function suggestModelName(input: string): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const inputLower = input.toLowerCase();
  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const model of SUPPORTED_MODELS) {
    const score = calculateStringSimilarity(inputLower, model.toLowerCase());
    if (score > bestScore && score > 0.4) {
      // Minimum threshold for suggestions
      bestScore = score;
      bestMatch = model;
    }
  }

  return bestMatch;
}

/**
 * Calculate string similarity using simple algorithm
 * Returns a score between 0 and 1, where 1 is identical
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  if (str1.length === 0 || str2.length === 0) return 0;

  // Simple similarity based on common substrings and character overlap
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  // Check if shorter string is contained in longer string
  if (longer.includes(shorter)) {
    return shorter.length / longer.length;
  }

  // Count common characters
  const chars1 = new Set(str1);
  const chars2 = new Set(str2);
  const intersection = new Set([...chars1].filter(x => chars2.has(x)));
  const union = new Set([...chars1, ...chars2]);

  return intersection.size / union.size;
}

/**
 * Check if an error is a Zod validation error
 */
export function isZodError(error: unknown): error is ZodError {
  return error instanceof ZodError;
}

/**
 * Create a user-friendly error message from any error
 */
export function createUserFriendlyMessage(error: unknown): {
  message: string;
  isValidationError: boolean;
  details?: Array<{
    field: string;
    issue: string;
    received?: unknown;
    expected?: string | string[];
    suggestion?: string;
  }>;
} {
  if (isZodError(error)) {
    const parsed = parseZodError(error);
    return {
      message: parsed.message,
      isValidationError: true,
      details: parsed.details,
    };
  }

  // Handle other error types
  const message =
    error instanceof Error ? error.message : 'An unexpected error occurred';
  return {
    message,
    isValidationError: false,
  };
}
