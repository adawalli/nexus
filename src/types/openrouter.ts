/**
 * TypeScript type definitions for OpenRouter API
 * Focused on chat completions endpoint and Perplexity Sonar models
 */

export type ChatRole = 'user' | 'assistant' | 'system';

export type FinishReason =
  | 'stop'
  | 'length'
  | 'content_filter'
  | 'tool_calls'
  | null;

export type PerplexityModelId =
  | 'perplexity/sonar'
  | 'perplexity/sonar-pro'
  | 'perplexity/sonar-reasoning-pro'
  | 'perplexity/sonar-deep-research';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  name?: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  stream?: boolean;
  user?: string;
}

export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ChatChoice {
  index: number;
  message: ChatMessage;
  finish_reason: FinishReason;
}

export interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: ChatChoice[];
  usage: Usage;
}

export interface ChatCompletionChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: ChatChoiceDelta[];
}

export interface ChatChoiceDelta {
  index: number;
  delta: {
    role?: ChatRole;
    content?: string;
  };
  finish_reason: FinishReason;
}

export interface OpenRouterError {
  error: {
    code: number;
    message: string;
    type: string;
    param?: string;
  };
}

export interface OpenRouterModelInfo {
  id: string;
  name: string;
  description: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
  top_provider: {
    max_completion_tokens: number;
  };
}

export interface OpenRouterModelsResponse {
  data: OpenRouterModelInfo[];
}
