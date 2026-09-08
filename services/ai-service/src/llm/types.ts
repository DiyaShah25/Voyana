export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  jsonMode?: boolean;
}

export interface LlmResponse {
  content: string;
  tokens: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
  provider: string;
  model: string;
}

export interface LlmClient {
  readonly providerName: string;
  generate(messages: LlmMessage[], options?: LlmOptions): Promise<LlmResponse>;
}
