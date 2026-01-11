import { ZodError, type ZodIssue } from 'zod';

import { SUPPORTED_MODELS } from '../schemas/search.js';

interface ZodIssueDetails {
  field: string;
  issue: string;
  received?: unknown;
  expected?: string | string[];
  suggestion?: string;
}

// Zod v3 and v4 use different property names for the same concepts.
// This helper safely accesses properties that may exist in either version.
function getIssueProperty<T>(issue: ZodIssue, prop: string): T | undefined {
  return (issue as unknown as Record<string, unknown>)[prop] as T | undefined;
}

/**
 * Parse a Zod error and convert to user-friendly message
 */
export function parseZodError(error: ZodError): {
  message: string;
  details: ZodIssueDetails[];
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
 * Compatible with both Zod v3 and v4 issue structures
 */
function parseZodIssue(issue: ZodIssue): ZodIssueDetails {
  const field = issue.path.join('.');
  const code = issue.code;

  // Handle invalid_type (Zod v3/v4)
  if (code === 'invalid_type') {
    const received = getIssueProperty<string>(issue, 'received');
    const expected = getIssueProperty<string>(issue, 'expected');
    return {
      field,
      issue: `Invalid type for ${field}`,
      received,
      expected,
      suggestion: `Parameter '${field}' must be of type ${expected ?? 'expected type'}, but received ${received ?? 'unknown'}`,
    };
  }

  // Handle invalid_value (Zod v4) or invalid_enum_value (Zod v3)
  // Type assertion needed because TypeScript only knows about v4 codes
  if (code === 'invalid_value' || (code as string) === 'invalid_enum_value') {
    return handleInvalidValue(field, issue);
  }

  // Handle too_small
  if (code === 'too_small') {
    return handleTooSmall(field, issue);
  }

  // Handle too_big
  if (code === 'too_big') {
    return handleTooBig(field, issue);
  }

  // Handle invalid_format (Zod v4) or invalid_string (Zod v3)
  // Type assertion needed because TypeScript only knows about v4 codes
  if (code === 'invalid_format' || (code as string) === 'invalid_string') {
    const formatType =
      getIssueProperty<string>(issue, 'format') ??
      getIssueProperty<string>(issue, 'validation') ??
      'unknown';
    return {
      field,
      issue: `Invalid string format for ${field}`,
      suggestion: `Parameter '${field}' has invalid format: ${formatType}`,
    };
  }

  // Handle custom errors
  if (code === 'custom') {
    return {
      field,
      issue: issue.message || `Custom validation failed for ${field}`,
      suggestion: issue.message,
    };
  }

  // Default fallback for any other codes
  return {
    field,
    issue: issue.message || `Validation failed for ${field}`,
    suggestion: issue.message,
  };
}

/**
 * Handle invalid enum/value errors with model-specific suggestions
 * Compatible with both Zod v3 (invalid_enum_value) and v4 (invalid_value)
 */
function handleInvalidValue(field: string, issue: ZodIssue): ZodIssueDetails {
  // Get received value (Zod v3 and v4 compatible)
  const received = getIssueProperty<unknown>(issue, 'received');
  // Get options (Zod v3: options, Zod v4: values)
  const options =
    getIssueProperty<unknown[]>(issue, 'options') ??
    getIssueProperty<unknown[]>(issue, 'values') ??
    [];

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
  const optionStrings = options.map(String);
  return {
    field,
    issue: `Invalid value for ${field}`,
    received,
    expected: optionStrings,
    suggestion:
      optionStrings.length > 0
        ? `Parameter '${field}' must be one of: ${optionStrings.join(', ')}. Received: ${received}`
        : `Parameter '${field}' received invalid value: ${received}`,
  };
}

// Zod v3 uses 'type', Zod v4 uses 'origin' for constraint target type
function getConstraintType(issue: ZodIssue): string | undefined {
  return (
    getIssueProperty<string>(issue, 'type') ??
    getIssueProperty<string>(issue, 'origin')
  );
}

function handleTooSmall(field: string, issue: ZodIssue): ZodIssueDetails {
  // Zod v3: minimum, Zod v4: min
  const minimum =
    getIssueProperty<number>(issue, 'minimum') ??
    getIssueProperty<number>(issue, 'min') ??
    0;
  const type = getConstraintType(issue);
  const inclusive = getIssueProperty<boolean>(issue, 'inclusive') ?? true;

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

function handleTooBig(field: string, issue: ZodIssue): ZodIssueDetails {
  // Zod v3: maximum, Zod v4: max
  const maximum =
    getIssueProperty<number>(issue, 'maximum') ??
    getIssueProperty<number>(issue, 'max') ??
    0;
  const type = getConstraintType(issue);
  const inclusive = getIssueProperty<boolean>(issue, 'inclusive') ?? true;

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
  details?: ZodIssueDetails[];
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
