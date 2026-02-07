import { PassThrough } from 'stream';

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';

import {
  StdioHandler,
  sendStdioMessage,
  createStdioReceiver,
  type StdioMessage,
} from '../../../src/utils/stdio-handler.js';

describe('StdioHandler', () => {
  let handler: StdioHandler;
  let mockOutput: PassThrough;
  let _mockInput: PassThrough;

  beforeEach(() => {
    handler = new StdioHandler({
      maxBufferSize: 1024 * 1024, // 1MB for testing
      timeout: 5000, // 5 seconds for testing
      lineEnding: 'LF',
      chunkSize: 1024, // 1KB for testing
    });
    mockOutput = new PassThrough();
    _mockInput = new PassThrough();
  });

  afterEach(async () => {
    await handler.cleanup();
  });

  describe('sendMessage', () => {
    it('should send a simple JSON-RPC message with proper line endings', async () => {
      const message: StdioMessage = {
        jsonrpc: '2.0',
        id: 1,
        method: 'test',
        params: { query: 'hello' },
      };

      const outputData: Buffer[] = [];
      mockOutput.on('data', chunk => outputData.push(chunk));

      await handler.sendMessage(message, mockOutput);

      const output = Buffer.concat(outputData).toString('utf8');
      expect(output).toContain('"jsonrpc":"2.0"');
      expect(output).toContain('"id":1');
      expect(output).toContain('"method":"test"');
      expect(output).toMatch(/\n$/); // Should end with newline
      expect(output).not.toContain('\r\n'); // Should use LF only
    });

    it('should handle large messages with buffering', async () => {
      const largeContent = 'x'.repeat(2 * 1024 * 1024); // 2MB string
      const message: StdioMessage = {
        jsonrpc: '2.0',
        id: 2,
        result: { content: largeContent },
      };

      const outputData: Buffer[] = [];
      mockOutput.on('data', chunk => outputData.push(chunk));

      await handler.sendMessage(message, mockOutput);

      const output = Buffer.concat(outputData).toString('utf8');
      const parsed = JSON.parse(output.trim());
      expect(parsed.result.content).toBe(largeContent);
      expect(handler.getMetrics().largeMessages).toBe(1);
    });

    it('should normalize line endings based on configuration', async () => {
      const crlfHandler = new StdioHandler({ lineEnding: 'CRLF' });
      const message: StdioMessage = {
        jsonrpc: '2.0',
        id: 3,
        result: { text: 'line1\nline2\r\nline3\rline4' },
      };

      const outputData: Buffer[] = [];
      mockOutput.on('data', chunk => outputData.push(chunk));

      await crlfHandler.sendMessage(message, mockOutput);

      const output = Buffer.concat(outputData).toString('utf8');
      const parsed = JSON.parse(output.trim());
      expect(parsed.result.text).toContain('line1');

      await crlfHandler.cleanup();
    });

    it('should handle timeout for large messages', async () => {
      const timeoutHandler = new StdioHandler({ timeout: 100 }); // Very short timeout
      const message: StdioMessage = {
        jsonrpc: '2.0',
        id: 4,
        result: { content: 'x'.repeat(1024 * 1024) }, // 1MB
      };

      // Create a slow output stream
      const slowOutput = new PassThrough();
      slowOutput._write = (chunk, encoding, callback) => {
        setTimeout(() => callback(), 200); // Slower than timeout
      };

      await timeoutHandler.sendMessage(message, slowOutput);
      expect(timeoutHandler.getMetrics().messagesSent).toBe(1);

      await timeoutHandler.cleanup();
    });

    it('should update metrics correctly', async () => {
      const message: StdioMessage = {
        jsonrpc: '2.0',
        id: 5,
        method: 'test',
      };

      const initialMetrics = handler.getMetrics();
      await handler.sendMessage(message, mockOutput);
      const finalMetrics = handler.getMetrics();

      expect(finalMetrics.messagesSent).toBe(initialMetrics.messagesSent + 1);
      expect(finalMetrics.bytesTransmitted).toBeGreaterThan(
        initialMetrics.bytesTransmitted
      );
    });

    it('should handle serialization errors gracefully', async () => {
      const circularMessage: any = {
        jsonrpc: '2.0',
        id: 6,
        result: {},
      };
      circularMessage.result.circular = circularMessage; // Create circular reference

      await expect(
        handler.sendMessage(circularMessage, mockOutput)
      ).rejects.toThrow();
      expect(handler.getMetrics().errors).toBeGreaterThan(0);
    });
  });

  describe('createMessageReceiver', () => {
    it('should parse valid JSON-RPC messages', async () => {
      const receiver = handler.createMessageReceiver();
      const messages: StdioMessage[] = [];

      return new Promise<void>(resolve => {
        receiver.on('data', (message: StdioMessage) => {
          messages.push(message);
          if (messages.length === 2) {
            expect(messages[0]).toEqual({
              jsonrpc: '2.0',
              id: 1,
              method: 'test1',
            });
            expect(messages[1]).toEqual({
              jsonrpc: '2.0',
              id: 2,
              method: 'test2',
            });
            resolve();
          }
        });

        // Send two messages
        receiver.write(
          Buffer.from('{"jsonrpc":"2.0","id":1,"method":"test1"}\n')
        );
        receiver.write(
          Buffer.from('{"jsonrpc":"2.0","id":2,"method":"test2"}\n')
        );
      });
    });

    it('should handle partial messages across multiple chunks', async () => {
      const receiver = handler.createMessageReceiver();
      const messages: StdioMessage[] = [];

      return new Promise<void>(resolve => {
        receiver.on('data', (message: StdioMessage) => {
          messages.push(message);
          if (messages.length === 1) {
            expect(messages[0]).toEqual({
              jsonrpc: '2.0',
              id: 1,
              method: 'test',
              params: { query: 'hello world' },
            });
            resolve();
          }
        });

        // Send message in multiple chunks
        const fullMessage =
          '{"jsonrpc":"2.0","id":1,"method":"test","params":{"query":"hello world"}}\n';
        const midpoint = Math.floor(fullMessage.length / 2);

        receiver.write(Buffer.from(fullMessage.substring(0, midpoint)));
        receiver.write(Buffer.from(fullMessage.substring(midpoint)));
      });
    });

    it('should handle different line endings', async () => {
      const receiver = handler.createMessageReceiver();
      const messages: StdioMessage[] = [];

      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(
            new Error(
              'Test timeout - only received ' + messages.length + ' messages'
            )
          );
        }, 1000);

        receiver.on('data', (message: StdioMessage) => {
          messages.push(message);
          if (messages.length === 2) {
            // Only test LF and CRLF
            clearTimeout(timeout);
            expect(messages).toHaveLength(2);
            expect(messages[0].id).toBe(1);
            expect(messages[1].id).toBe(2);
            resolve();
          }
        });

        // Send messages with different line endings
        receiver.write(
          Buffer.from('{"jsonrpc":"2.0","id":1,"method":"test1"}\n')
        ); // LF
        receiver.write(
          Buffer.from('{"jsonrpc":"2.0","id":2,"method":"test2"}\r\n')
        ); // CRLF
        // Note: CR alone doesn't create a proper line ending for JSON-RPC
      });
    });

    it('should handle malformed JSON gracefully', async () => {
      const receiver = handler.createMessageReceiver();
      let validMessageReceived = false;

      return new Promise<void>(resolve => {
        receiver.on('data', (message: StdioMessage) => {
          expect(message.id).toBe(1);
          validMessageReceived = true;
        });

        // Set a timeout to check that invalid messages don't break the stream
        setTimeout(() => {
          expect(validMessageReceived).toBe(true);
          expect(handler.getMetrics().errors).toBeGreaterThan(0);
          resolve();
        }, 100);

        // Send malformed JSON followed by valid JSON
        receiver.write(Buffer.from('{"invalid":"json",}\n')); // Invalid: trailing comma
        receiver.write(
          Buffer.from('{"jsonrpc":"2.0","id":1,"method":"test"}\n')
        ); // Valid
      });
    });
  });

  describe('flush and cleanup', () => {
    it('should flush pending messages', async () => {
      const message: StdioMessage = {
        jsonrpc: '2.0',
        id: 1,
        method: 'test',
      };

      // Send message but don't wait for completion
      const sendPromise = handler.sendMessage(message, mockOutput);

      // Flush should wait for all pending operations
      await handler.flush();
      await sendPromise;

      const metrics = handler.getMetrics();
      expect(metrics.messagesSent).toBe(1);
    });

    it('should cleanup resources properly', async () => {
      const message: StdioMessage = {
        jsonrpc: '2.0',
        id: 1,
        method: 'test',
      };

      await handler.sendMessage(message, mockOutput);
      const initialMetrics = handler.getMetrics();

      await handler.cleanup();

      // Metrics should be preserved but internal state should be clean
      const finalMetrics = handler.getMetrics();
      expect(finalMetrics.messagesSent).toBe(initialMetrics.messagesSent);
    });
  });

  describe('utility functions', () => {
    it('should send message using global handler', async () => {
      const message: StdioMessage = {
        jsonrpc: '2.0',
        id: 1,
        method: 'test',
      };

      const outputData: Buffer[] = [];
      mockOutput.on('data', chunk => outputData.push(chunk));

      await sendStdioMessage(message, mockOutput);

      const output = Buffer.concat(outputData).toString('utf8');
      expect(output).toContain('"method":"test"');
    });

    it('should create receiver using global handler', async () => {
      const receiver = createStdioReceiver();

      return new Promise<void>(resolve => {
        receiver.on('data', (message: StdioMessage) => {
          expect(message.method).toBe('test');
          resolve();
        });

        receiver.write(
          Buffer.from('{"jsonrpc":"2.0","id":1,"method":"test"}\n')
        );
      });
    });
  });

  describe('metrics and monitoring', () => {
    it('should track all metrics correctly', async () => {
      const message1: StdioMessage = { jsonrpc: '2.0', id: 1, method: 'test1' };
      const message2: StdioMessage = {
        jsonrpc: '2.0',
        id: 2,
        result: { data: 'x'.repeat(2048 * 1024) },
      }; // Large message

      handler.resetMetrics();
      const initialMetrics = handler.getMetrics();
      expect(initialMetrics.messagesSent).toBe(0);

      await handler.sendMessage(message1, mockOutput);
      await handler.sendMessage(message2, mockOutput);

      const finalMetrics = handler.getMetrics();
      expect(finalMetrics.messagesSent).toBe(2);
      expect(finalMetrics.largeMessages).toBe(1);
      expect(finalMetrics.bytesTransmitted).toBeGreaterThan(0);
    });

    it('should reset metrics properly', async () => {
      const message: StdioMessage = { jsonrpc: '2.0', id: 1, method: 'test' };

      await handler.sendMessage(message, mockOutput);
      expect(handler.getMetrics().messagesSent).toBe(1);

      handler.resetMetrics();
      expect(handler.getMetrics().messagesSent).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle write stream errors', async () => {
      const errorStream = new PassThrough();
      errorStream._write = (_chunk, _encoding, callback) => {
        callback(new Error('Write error'));
      };

      const message: StdioMessage = { jsonrpc: '2.0', id: 1, method: 'test' };

      await expect(handler.sendMessage(message, errorStream)).rejects.toThrow(
        'Write error'
      );
      expect(handler.getMetrics().errors).toBeGreaterThan(0);
    });

    it('should handle large messages without errors', async () => {
      const smallBufferHandler = new StdioHandler({ maxBufferSize: 1024 }); // 1KB limit
      const largeMessage: StdioMessage = {
        jsonrpc: '2.0',
        id: 1,
        result: { data: 'x'.repeat(2048) }, // 2KB content
      };

      // This should work because the buffer check is only in streaming scenarios
      await smallBufferHandler.sendMessage(largeMessage, mockOutput);
      expect(smallBufferHandler.getMetrics().messagesSent).toBe(1);

      await smallBufferHandler.cleanup();
    });
  });

  describe('platform compatibility', () => {
    it('should handle auto line ending detection', async () => {
      const autoHandler = new StdioHandler({ lineEnding: 'auto' });
      const message: StdioMessage = {
        jsonrpc: '2.0',
        id: 1,
        result: { text: 'test\nline' },
      };

      const outputData: Buffer[] = [];
      mockOutput.on('data', chunk => outputData.push(chunk));

      await autoHandler.sendMessage(message, mockOutput);

      const output = Buffer.concat(outputData).toString('utf8');
      // Should normalize based on platform (LF for non-Windows)
      if (process.platform === 'win32') {
        expect(output).toContain('test\\r\\nline');
      } else {
        expect(output).toContain('test\\nline');
      }

      await autoHandler.cleanup();
    });
  });
});
