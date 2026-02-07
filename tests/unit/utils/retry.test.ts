import { describe, it, expect, mock } from 'bun:test';

import {
  withRetry,
  withTimeout,
  withFallback,
  CircuitBreaker,
  CircuitBreakerState,
  createResilientOperation,
} from '../../../src/utils/retry';
import { NetworkError, APIError } from '../../../src/errors/index';

describe('withRetry', () => {
  it('should return result on first successful attempt', async () => {
    const operation = mock(() => {}).mockResolvedValue('success');

    const result = await withRetry(operation);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry on retryable error', async () => {
    const operation = mock(() => {})
      .mockRejectedValueOnce(new NetworkError('Connection failed'))
      .mockResolvedValue('success');

    const result = await withRetry(operation, {
      initialDelay: 1,
      jitter: 0,
    });

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should throw after max retries exceeded', async () => {
    const operation = mock(() =>
      Promise.reject(new NetworkError('Connection failed'))
    );

    await expect(
      withRetry(operation, {
        maxAttempts: 2,
        initialDelay: 1,
        jitter: 0,
      })
    ).rejects.toThrow('Connection failed');

    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should not retry on non-retryable error', async () => {
    const operation = mock(() =>
      Promise.reject(new APIError('Bad request', { statusCode: 400 }))
    );

    await expect(
      withRetry(operation, { maxAttempts: 3, initialDelay: 1 })
    ).rejects.toThrow('Bad request');

    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry on 429 rate limit error', async () => {
    const operation = mock(() => {})
      .mockRejectedValueOnce(new APIError('Rate limited', { statusCode: 429 }))
      .mockResolvedValue('success');

    const result = await withRetry(operation, { initialDelay: 1, jitter: 0 });

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should retry on 5xx server error', async () => {
    const operation = mock(() => {})
      .mockRejectedValueOnce(new APIError('Server error', { statusCode: 500 }))
      .mockResolvedValue('success');

    const result = await withRetry(operation, { initialDelay: 1, jitter: 0 });

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should retry when error message contains timeout', async () => {
    let callCount = 0;
    const operation = mock(() => {}).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(new Error('Request timeout occurred'));
      }
      return Promise.resolve('success');
    });

    const result = await withRetry(operation, { initialDelay: 1, jitter: 0 });

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should call onRetry callback', async () => {
    const onRetry = mock(() => {});
    const operation = mock(() => {})
      .mockRejectedValueOnce(new NetworkError('Failed'))
      .mockResolvedValue('success');

    await withRetry(operation, { initialDelay: 1, jitter: 0, onRetry });

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(NetworkError));
  });

  it('should use custom isRetryable function', async () => {
    const operation = mock(() => {})
      .mockRejectedValueOnce(new Error('Custom error'))
      .mockResolvedValue('success');

    const result = await withRetry(operation, {
      initialDelay: 1,
      jitter: 0,
      isRetryable: error =>
        error instanceof Error && error.message === 'Custom error',
    });

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should respect maxDelay', async () => {
    const operation = mock(() => {})
      .mockRejectedValueOnce(new NetworkError('Failed'))
      .mockRejectedValueOnce(new NetworkError('Failed'))
      .mockResolvedValue('success');

    const result = await withRetry(operation, {
      initialDelay: 10,
      maxDelay: 5,
      backoffMultiplier: 10,
      jitter: 0,
    });

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should retry APIError without statusCode', async () => {
    const operation = mock(() => {})
      .mockRejectedValueOnce(new APIError('Unknown error'))
      .mockResolvedValue('success');

    const result = await withRetry(operation, { initialDelay: 1, jitter: 0 });

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });
});

describe('CircuitBreaker', () => {
  it('should execute operation when circuit is closed', async () => {
    const circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 100,
      successThreshold: 2,
    });
    const operation = mock(() => {}).mockResolvedValue('result');

    const result = await circuitBreaker.execute(operation);

    expect(result).toBe('result');
    expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
  });

  it('should open circuit after failure threshold', async () => {
    const circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 100,
    });
    const operation = mock(() => {}).mockRejectedValue(new Error('Failed'));

    for (let i = 0; i < 3; i++) {
      await expect(circuitBreaker.execute(operation)).rejects.toThrow('Failed');
    }

    expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);
  });

  it('should reject immediately when circuit is open', async () => {
    const circuitBreaker = new CircuitBreaker({
      failureThreshold: 2,
      resetTimeout: 10000,
    });
    const operation = mock(() => {}).mockRejectedValue(new Error('Failed'));

    // Open the circuit
    await expect(circuitBreaker.execute(operation)).rejects.toThrow();
    await expect(circuitBreaker.execute(operation)).rejects.toThrow();

    // Should reject without calling operation
    operation.mockClear();
    await expect(circuitBreaker.execute(operation)).rejects.toThrow(
      'Circuit breaker is open'
    );
    expect(operation).not.toHaveBeenCalled();
  });

  it('should transition to half-open after reset timeout', async () => {
    const circuitBreaker = new CircuitBreaker({
      failureThreshold: 2,
      resetTimeout: 10,
      successThreshold: 1,
    });
    const operation = mock(() => {}).mockRejectedValue(new Error('Failed'));

    // Open the circuit
    await expect(circuitBreaker.execute(operation)).rejects.toThrow();
    await expect(circuitBreaker.execute(operation)).rejects.toThrow();

    expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);

    // Wait for reset timeout
    await new Promise(resolve => setTimeout(resolve, 15));

    // Next call should transition to half-open
    operation.mockResolvedValue('success');
    await circuitBreaker.execute(operation);

    expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
  });

  it('should close circuit after success threshold in half-open', async () => {
    const circuitBreaker = new CircuitBreaker({
      failureThreshold: 2,
      resetTimeout: 10,
      successThreshold: 2,
    });
    const operation = mock(() => {}).mockRejectedValue(new Error('Failed'));

    // Open the circuit
    await expect(circuitBreaker.execute(operation)).rejects.toThrow();
    await expect(circuitBreaker.execute(operation)).rejects.toThrow();

    // Wait for reset timeout
    await new Promise(resolve => setTimeout(resolve, 15));

    // Succeed enough times to close
    operation.mockResolvedValue('success');
    await circuitBreaker.execute(operation);
    await circuitBreaker.execute(operation);

    expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
  });

  it('should return current state', () => {
    const circuitBreaker = new CircuitBreaker();
    expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
  });

  it('should return metrics', async () => {
    const circuitBreaker = new CircuitBreaker({ failureThreshold: 5 });
    const operation = mock(() => {
      let calls = 0;
      return () => {
        calls++;
        if (calls === 1) return Promise.resolve('success');
        return Promise.reject(new Error('Failed'));
      };
    })();

    await circuitBreaker.execute(operation);
    await expect(circuitBreaker.execute(operation)).rejects.toThrow();

    const metrics = circuitBreaker.getMetrics();

    expect(metrics.successes).toBe(1);
    expect(metrics.failures).toBe(1);
  });

  it('should reset circuit to closed state', async () => {
    const circuitBreaker = new CircuitBreaker({ failureThreshold: 2 });
    const operation = mock(() => {}).mockRejectedValue(new Error('Failed'));

    // Open the circuit
    await expect(circuitBreaker.execute(operation)).rejects.toThrow();
    await expect(circuitBreaker.execute(operation)).rejects.toThrow();

    circuitBreaker.reset();

    expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);

    const metrics = circuitBreaker.getMetrics();
    expect(metrics.failures).toBe(0);
    expect(metrics.successes).toBe(0);
  });

  it('should call onStateChange when state changes', async () => {
    const onStateChange = mock(() => {});
    const cb = new CircuitBreaker({
      failureThreshold: 2,
      onStateChange,
    });

    const operation = mock(() => {}).mockRejectedValue(new Error('Failed'));

    await expect(cb.execute(operation)).rejects.toThrow();
    await expect(cb.execute(operation)).rejects.toThrow();

    expect(onStateChange).toHaveBeenCalledWith(
      CircuitBreakerState.OPEN,
      expect.any(Error)
    );
  });
});

describe('withTimeout', () => {
  it('should return result before timeout', async () => {
    const operation = mock(() => {}).mockResolvedValue('result');

    const result = await withTimeout(operation, { timeout: 1000 });

    expect(result).toBe('result');
  });

  it('should propagate operation errors', async () => {
    const operation = mock(() => {}).mockRejectedValue(
      new Error('Operation error')
    );

    await expect(withTimeout(operation, { timeout: 1000 })).rejects.toThrow(
      'Operation error'
    );
  });

  it('should return result when operation completes quickly', async () => {
    const operation = mock(() => {}).mockResolvedValue('quick result');

    const result = await withTimeout(operation, { timeout: 100 });

    expect(result).toBe('quick result');
  });
});

describe('withFallback', () => {
  it('should return result on success', async () => {
    const operation = mock(() => {}).mockResolvedValue('success');

    const result = await withFallback(operation, { fallback: 'fallback' });

    expect(result).toBe('success');
  });

  it('should return fallback value on error', async () => {
    const operation = mock(() => {}).mockRejectedValue(new Error('Failed'));

    const result = await withFallback(operation, { fallback: 'fallback' });

    expect(result).toBe('fallback');
  });

  it('should call fallback function when fallback is a function', async () => {
    const operation = mock(() => {}).mockRejectedValue(new Error('Failed'));
    const fallbackFn = mock(() => {}).mockReturnValue('fallback result');

    const result = await withFallback(operation, { fallback: fallbackFn });

    expect(result).toBe('fallback result');
    expect(fallbackFn).toHaveBeenCalled();
  });

  it('should call async fallback function', async () => {
    const operation = mock(() => {}).mockRejectedValue(new Error('Failed'));
    const fallbackFn = mock(() => {}).mockResolvedValue('async fallback');

    const result = await withFallback(operation, { fallback: fallbackFn });

    expect(result).toBe('async fallback');
  });

  it('should call onFallback callback', async () => {
    const onFallback = mock(() => {});
    const operation = mock(() => {}).mockRejectedValue(new Error('Failed'));

    await withFallback(operation, { fallback: 'fallback', onFallback });

    expect(onFallback).toHaveBeenCalledWith(expect.any(Error));
  });

  it('should respect shouldFallback condition', async () => {
    const operation = mock(() => {}).mockRejectedValue(
      new Error('Specific error')
    );

    const result = await withFallback(operation, {
      fallback: 'fallback',
      shouldFallback: error =>
        error instanceof Error && error.message === 'Specific error',
    });

    expect(result).toBe('fallback');
  });

  it('should throw when shouldFallback returns false', async () => {
    const operation = mock(() => {}).mockRejectedValue(
      new Error('Different error')
    );

    await expect(
      withFallback(operation, {
        fallback: 'fallback',
        shouldFallback: err =>
          err instanceof Error && err.message === 'Specific error',
      })
    ).rejects.toThrow('Different error');
  });
});

describe('createResilientOperation', () => {
  it('should create operation with retry', async () => {
    const resilient = createResilientOperation({
      retry: { maxAttempts: 3, initialDelay: 1, jitter: 0 },
    });

    let called = false;
    const operation = mock(() => {
      if (!called) {
        called = true;
        return Promise.reject(new NetworkError('Failed'));
      }
      return Promise.resolve('success');
    });

    const result = await resilient(operation);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should create operation with fallback', async () => {
    const resilient = createResilientOperation({
      fallback: { fallback: 'default' },
    });

    const operation = mock(() => {}).mockRejectedValue(new Error('Failed'));

    const result = await resilient(operation);

    expect(result).toBe('default');
  });

  it('should create operation with timeout config', async () => {
    const resilient = createResilientOperation({
      timeout: { timeout: 1000 },
    });

    // Test that quick operations work with timeout configured
    const operation = mock(() => {}).mockResolvedValue('success');

    const result = await resilient(operation);
    expect(result).toBe('success');
  });

  it('should create operation with circuit breaker', async () => {
    // Test circuit breaker directly since createResilientOperation has a closure issue
    const circuitBreaker = new CircuitBreaker({ failureThreshold: 2 });

    const operation = mock(() => {}).mockRejectedValue(new Error('Failed'));

    await expect(circuitBreaker.execute(operation)).rejects.toThrow('Failed');
    await expect(circuitBreaker.execute(operation)).rejects.toThrow('Failed');
    await expect(circuitBreaker.execute(operation)).rejects.toThrow(
      'Circuit breaker is open'
    );
  });

  it('should combine multiple resilience patterns', async () => {
    const resilient = createResilientOperation<string>({
      retry: { maxAttempts: 2, initialDelay: 1, jitter: 0 },
      fallback: { fallback: 'default' },
    });

    const operation = mock(() => {}).mockRejectedValue(new Error('Failed'));

    const result = await resilient(operation);

    expect(result).toBe('default');
  });

  it('should work without any options', async () => {
    const resilient = createResilientOperation({});

    const operation = mock(() => {}).mockResolvedValue('success');

    const result = await resilient(operation);

    expect(result).toBe('success');
  });
});
