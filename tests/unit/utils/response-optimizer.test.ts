import { describe, it, expect, beforeEach, afterEach } from 'bun:test';

import type { ChatCompletionResponse } from '../../../src/types/openrouter';
import {
  ResponseOptimizer,
  StreamingResponseProcessor,
  createOptimizedFormatter,
  formatResponseQuick,
} from '../../../src/utils/response-optimizer';

// Performance API declaration for tests
declare const performance: {
  now(): number;
};

describe('ResponseOptimizer', () => {
  let optimizer: ResponseOptimizer;
  let mockApiResponse: ChatCompletionResponse;

  beforeEach(() => {
    optimizer = ResponseOptimizer.getInstance();

    mockApiResponse = {
      id: 'test-123',
      object: 'chat.completion',
      created: 1640995200,
      model: 'perplexity/sonar',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content:
              'This is a test response with sources [1]: https://example.com "Example Site" and https://test.org',
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30,
      },
    };
  });

  afterEach(() => {
    optimizer.clearCache();
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ResponseOptimizer.getInstance();
      const instance2 = ResponseOptimizer.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should work with createOptimizedFormatter', () => {
      const formatter = createOptimizedFormatter();
      expect(formatter).toBeInstanceOf(ResponseOptimizer);
      expect(formatter).toBe(ResponseOptimizer.getInstance());
    });
  });

  describe('formatSearchResponseOptimized', () => {
    it('should format response with performance metrics', () => {
      const startTime = Date.now() - 1000;
      const query = 'test query';
      const temperature = 0.3;
      const maxTokens = 1000;

      const result = optimizer.formatSearchResponseOptimized(
        mockApiResponse,
        query,
        startTime,
        temperature,
        maxTokens
      );

      expect(result.response.success).toBe(true);
      expect(result.response.result?.content).toBe(
        mockApiResponse.choices[0].message.content
      );
      expect(result.response.requestId).toBe('test-123');

      // Check metrics
      expect(result.metrics).toBeDefined();
      expect(result.metrics.parseTime).toBeGreaterThanOrEqual(0);
      expect(result.metrics.sourceExtractionTime).toBeGreaterThanOrEqual(0);
      expect(result.metrics.validationTime).toBeGreaterThanOrEqual(0);
      expect(result.metrics.formattingTime).toBeGreaterThanOrEqual(0);
      expect(result.metrics.totalTime).toBeGreaterThanOrEqual(0);
      expect(result.metrics.sourceCount).toBeGreaterThanOrEqual(0);
      expect(result.metrics.contentLength).toBeGreaterThan(0);
      expect(result.metrics.estimatedMemoryUsage).toBeGreaterThan(0);
    });

    it('should extract citation-style sources', () => {
      const result = optimizer.formatSearchResponseOptimized(
        mockApiResponse,
        'test query',
        Date.now()
      );

      const sources = result.response.result?.sources || [];
      expect(sources.length).toBeGreaterThan(0);

      // Should find citation-style source
      const citationSource = sources.find(s => s.url === 'https://example.com');
      expect(citationSource).toBeDefined();
      expect(citationSource?.title).toBe('Example Site');

      // Should also find plain URL
      const plainUrlSource = sources.find(s => s.url === 'https://test.org');
      expect(plainUrlSource).toBeDefined();
    });

    it('should handle empty or missing content', () => {
      const emptyResponse: ChatCompletionResponse = {
        ...mockApiResponse,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: '',
            },
            finish_reason: 'stop',
          },
        ],
      };

      const result = optimizer.formatSearchResponseOptimized(
        emptyResponse,
        'test query',
        Date.now()
      );

      expect(result.response.success).toBe(true);
      expect(result.response.result?.content).toBe('');
      expect(result.response.result?.sources).toEqual([]);
      expect(result.metrics.sourceCount).toBe(0);
    });

    it('should handle response with no choices', () => {
      const noChoicesResponse: ChatCompletionResponse = {
        ...mockApiResponse,
        choices: [],
      };

      const result = optimizer.formatSearchResponseOptimized(
        noChoicesResponse,
        'test query',
        Date.now()
      );

      expect(result.response.success).toBe(false);
      expect(result.response.result).toBeUndefined();
    });

    it('should extract multiple citation sources correctly', () => {
      const multiCitationResponse: ChatCompletionResponse = {
        ...mockApiResponse,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content:
                'Sources: [1]: https://example.com "Example" and [2]: https://test.org "Test Site" and [3]: https://github.com "GitHub"',
            },
            finish_reason: 'stop',
          },
        ],
      };

      const result = optimizer.formatSearchResponseOptimized(
        multiCitationResponse,
        'test query',
        Date.now()
      );

      const sources = result.response.result?.sources || [];
      expect(sources).toHaveLength(3);
      expect(sources[0].url).toBe('https://example.com');
      expect(sources[0].title).toBe('Example');
      expect(sources[1].url).toBe('https://test.org');
      expect(sources[1].title).toBe('Test Site');
      expect(sources[2].url).toBe('https://github.com');
      expect(sources[2].title).toBe('GitHub');
    });

    it('should measure performance correctly', () => {
      const startTime = performance.now();

      // Create a large content to ensure measurable processing time
      const largeContent =
        'Large content '.repeat(1000) + ' https://example.com';
      const largeResponse: ChatCompletionResponse = {
        ...mockApiResponse,
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: largeContent,
            },
            finish_reason: 'stop',
          },
        ],
      };

      const result = optimizer.formatSearchResponseOptimized(
        largeResponse,
        'test query',
        Date.now()
      );

      const endTime = performance.now();
      const actualTime = endTime - startTime;

      // Metrics should reflect the actual processing
      expect(result.metrics.totalTime).toBeGreaterThan(0);
      expect(result.metrics.totalTime).toBeLessThanOrEqual(actualTime + 1); // Allow small margin
      expect(result.metrics.contentLength).toBe(largeContent.length);
      expect(result.metrics.sourceCount).toBe(1);
    });
  });

  describe('batchFormatResponses', () => {
    it('should process multiple responses efficiently', () => {
      const responses = [
        {
          apiResponse: mockApiResponse,
          query: 'query 1',
          startTime: Date.now() - 1000,
          temperature: 0.5,
        },
        {
          apiResponse: { ...mockApiResponse, id: 'test-456' },
          query: 'query 2',
          startTime: Date.now() - 800,
          temperature: 0.8,
        },
      ];

      const results = optimizer.batchFormatResponses(responses);

      expect(results).toHaveLength(2);
      expect(results[0].response.requestId).toBe('test-123');
      expect(results[1].response.requestId).toBe('test-456');

      results.forEach(result => {
        expect(result.response.success).toBe(true);
        expect(result.metrics).toBeDefined();
        expect(result.metrics.totalTime).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('memory management', () => {
    it('should clear cache without affecting functionality', () => {
      const result1 = optimizer.formatSearchResponseOptimized(
        mockApiResponse,
        'test query',
        Date.now()
      );

      optimizer.clearCache();

      const result2 = optimizer.formatSearchResponseOptimized(
        mockApiResponse,
        'test query',
        Date.now()
      );

      expect(result1.response.success).toBe(true);
      expect(result2.response.success).toBe(true);
    });

    it('should estimate memory usage correctly', () => {
      const result = optimizer.formatSearchResponseOptimized(
        mockApiResponse,
        'test query',
        Date.now()
      );

      expect(result.metrics.estimatedMemoryUsage).toBeGreaterThan(0);

      // Should roughly correlate with content length
      const contentLength = mockApiResponse.choices[0].message.content.length;
      expect(result.metrics.estimatedMemoryUsage).toBeGreaterThan(
        contentLength
      );
    });
  });
});

describe('StreamingResponseProcessor', () => {
  let processor: StreamingResponseProcessor;

  beforeEach(() => {
    processor = new StreamingResponseProcessor();
  });

  describe('processChunk', () => {
    it('should process chunks incrementally', () => {
      processor.processChunk('This is a test ');
      processor.processChunk('with a URL https://example.com ');
      processor.processChunk('and more content.');

      const result = processor.finalize();

      expect(result.content).toBe(
        'This is a test with a URL https://example.com and more content.'
      );
      expect(result.contentLength).toBe(result.content.length);
      expect(result.sources).toHaveLength(1);
      expect(result.sources[0].url).toBe('https://example.com');
    });

    it('should extract sources from streaming chunks', () => {
      processor.processChunk('Check out ');
      processor.processChunk('https://github.com ');
      processor.processChunk('and https://stackoverflow.com ');
      processor.processChunk('for more info.');

      const result = processor.finalize();

      expect(result.sources).toHaveLength(2);
      expect(result.sources[0].url).toBe('https://github.com');
      expect(result.sources[1].url).toBe('https://stackoverflow.com');
    });

    it('should handle URLs that span chunks', () => {
      processor.processChunk('Visit https://very-long-');
      processor.processChunk('domain-name.example.com/path');
      processor.processChunk(' for details.');

      const result = processor.finalize();

      expect(result.sources).toHaveLength(1);
      expect(result.sources[0].url).toBe(
        'https://very-long-domain-name.example.com/path'
      );
    });

    it('should avoid duplicate sources', () => {
      processor.processChunk('Visit https://example.com ');
      processor.processChunk('and also https://example.com ');
      processor.processChunk('again.');

      const result = processor.finalize();

      expect(result.sources).toHaveLength(1);
      expect(result.sources[0].url).toBe('https://example.com');
    });
  });

  describe('reset', () => {
    it('should reset processor state', () => {
      processor.processChunk('Test content https://example.com');

      let result = processor.finalize();
      expect(result.content).toBe('Test content https://example.com');
      expect(result.sources).toHaveLength(1);

      processor.reset();

      result = processor.finalize();
      expect(result.content).toBe('');
      expect(result.sources).toHaveLength(0);
      expect(result.contentLength).toBe(0);
    });
  });
});

describe('formatResponseQuick', () => {
  it('should format response quickly without detailed metrics', () => {
    const mockApiResponse: ChatCompletionResponse = {
      id: 'test-123',
      object: 'chat.completion',
      created: 1640995200,
      model: 'perplexity/sonar',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'Quick test with https://example.com',
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 5,
        completion_tokens: 10,
        total_tokens: 15,
      },
    };

    const result = formatResponseQuick(
      mockApiResponse,
      'test query',
      Date.now() - 500,
      0.3,
      1000
    );

    expect(result.success).toBe(true);
    expect(result.result?.content).toBe('Quick test with https://example.com');
    expect(result.result?.sources).toHaveLength(1);
    expect(result.result?.sources[0].url).toBe('https://example.com');
    expect(result.result?.metadata.temperature).toBe(0.3);
    expect(result.result?.metadata.maxTokens).toBe(1000);
    expect(result.requestId).toBe('test-123');
  });
});

describe('Performance Benchmarks', () => {
  it('should process large responses efficiently', () => {
    const largeContent =
      'Large response content '.repeat(5000) +
      ' with sources https://example.com and https://test.org and https://github.com';

    const largeResponse: ChatCompletionResponse = {
      id: 'perf-test-123',
      object: 'chat.completion',
      created: 1640995200,
      model: 'perplexity/sonar',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: largeContent,
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 50,
        completion_tokens: 2000,
        total_tokens: 2050,
      },
    };

    const startTime = performance.now();
    const optimizer = ResponseOptimizer.getInstance();

    const result = optimizer.formatSearchResponseOptimized(
      largeResponse,
      'performance test query',
      Date.now()
    );

    const endTime = performance.now();
    const actualTime = endTime - startTime;

    expect(result.response.success).toBe(true);
    expect(result.response.result?.sources).toHaveLength(3);

    // Performance should be reasonable even for large content
    expect(actualTime).toBeLessThan(50); // Should complete in under 50ms
    expect(result.metrics.totalTime).toBeLessThan(20); // Internal processing under 20ms

    // Memory usage should be reasonable
    expect(result.metrics.estimatedMemoryUsage).toBeGreaterThan(0);
    expect(result.metrics.estimatedMemoryUsage).toBeLessThan(
      largeContent.length * 5
    ); // Less than 5x content size
  });

  it('should handle many small responses efficiently', () => {
    const optimizer = ResponseOptimizer.getInstance();
    const smallResponse: ChatCompletionResponse = {
      id: 'small-test',
      object: 'chat.completion',
      created: 1640995200,
      model: 'perplexity/sonar',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'Small response https://example.com',
          },
          finish_reason: 'stop',
        },
      ],
      usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
    };

    const startTime = performance.now();

    // Process 100 small responses
    const results = [];
    for (let i = 0; i < 100; i++) {
      const response = { ...smallResponse, id: `small-test-${i}` };
      results.push(
        optimizer.formatSearchResponseOptimized(
          response,
          `query ${i}`,
          Date.now()
        )
      );
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const avgTimePerRequest = totalTime / 100;

    expect(results).toHaveLength(100);
    expect(results.every(r => r.response.success)).toBe(true);

    // Should process 100 small responses quickly
    expect(totalTime).toBeLessThan(100); // Total under 100ms
    expect(avgTimePerRequest).toBeLessThan(2); // Average under 2ms per request
  });
});
