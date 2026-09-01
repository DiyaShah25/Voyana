import fs from 'fs';
import path from 'path';
import { getLlmClient } from '../llm/client-factory.js';
import { LlmClient, LlmMessage } from '../llm/types.js';
import { ChatRequest, ChatResponse, ChatResponseSchema } from '../schemas/chat.schema.js';
import { Trip, TripSchema } from '../schemas/trip.schema.js';
import { AiRequestService } from './ai-request.service.js';

export class ChatService {
  private llmClient: LlmClient;
  private promptTemplate: string;
  private tripFixture: Trip;
  public static readonly PROMPT_VERSION = 'chat.v1';

  constructor(customLlmClient?: LlmClient) {
    this.llmClient = customLlmClient || getLlmClient();
    this.promptTemplate = this.loadPromptTemplate();
    this.tripFixture = this.loadTripFixture();
  }

  private loadPromptTemplate(): string {
    const promptPaths = [
      path.resolve(process.cwd(), 'prompts', 'chat.v1.md'),
      path.resolve(__dirname, '..', '..', 'prompts', 'chat.v1.md'),
    ];

    for (const p of promptPaths) {
      if (fs.existsSync(p)) {
        return fs.readFileSync(p, 'utf-8');
      }
    }

    // Default inline fallback prompt
    return `You are Voyana AI, the intelligent travel assistant. Answer user travel questions in valid JSON schema with content, aiGenerated: true, citedContext: { days: [] }, and proposedChanges: [].`;
  }

  private loadTripFixture(): Trip {
    const fixturePaths = [
      path.resolve(process.cwd(), 'fixtures', 'trip-bali.json'),
      path.resolve(__dirname, '..', '..', 'fixtures', 'trip-bali.json'),
    ];

    for (const p of fixturePaths) {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf-8');
        return TripSchema.parse(JSON.parse(raw));
      }
    }

    throw new Error('Trip fixture not found at fixtures/trip-bali.json');
  }

  public renderSystemPrompt(trip: Trip): string {
    let prompt = this.promptTemplate;
    prompt = prompt.replace('{{destination}}', trip.destination);
    prompt = prompt.replace('{{startDate}}', trip.startDate);
    prompt = prompt.replace('{{endDate}}', trip.endDate);
    prompt = prompt.replace('{{totalBudget}}', String(trip.totalBudget));
    prompt = prompt.replace('{{currency}}', trip.currency || 'USD');
    prompt = prompt.replace('{{budgetBreakdown}}', JSON.stringify(trip.budgetBreakdown || {}, null, 2));
    prompt = prompt.replace('{{members}}', JSON.stringify(trip.members, null, 2));
    prompt = prompt.replace('{{itineraryDays}}', JSON.stringify(trip.itineraryDays, null, 2));
    return prompt;
  }

  public async processChat(chatRequest: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();
    const trip = this.tripFixture;
    const systemPrompt = this.renderSystemPrompt(trip);

    const messages: LlmMessage[] = [
      { role: 'system', content: systemPrompt },
    ];

    if (chatRequest.history && chatRequest.history.length > 0) {
      for (const h of chatRequest.history) {
        messages.push({ role: h.role as 'user' | 'assistant', content: h.content });
      }
    }

    messages.push({ role: 'user', content: chatRequest.message });

    try {
      const llmResponse = await this.llmClient.generate(messages, {
        jsonMode: true,
        temperature: 0.3,
      });

      let parsedJson: any;
      try {
        parsedJson = JSON.parse(llmResponse.content);
      } catch (parseErr) {
        throw new Error(`LLM returned invalid JSON: ${llmResponse.content.substring(0, 100)}...`);
      }

      // Validate against Zod schema
      const validatedResponse = ChatResponseSchema.parse(parsedJson);

      // Log telemetry
      await AiRequestService.logRequest({
        feature: 'ai_chat',
        promptVersion: ChatService.PROMPT_VERSION,
        tripId: chatRequest.tripId || trip.id,
        inputMessage: chatRequest.message,
        tokens: llmResponse.tokens,
        latencyMs: llmResponse.latencyMs,
        outcome: 'success',
        provider: llmResponse.provider,
      });

      return validatedResponse;
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const errorMessage = err?.message || 'Unknown error occurred in AI Chat';

      // Log failure telemetry
      await AiRequestService.logRequest({
        feature: 'ai_chat',
        promptVersion: ChatService.PROMPT_VERSION,
        tripId: chatRequest.tripId || trip.id,
        inputMessage: chatRequest.message,
        tokens: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        latencyMs,
        outcome: 'error',
        errorMessage,
        provider: this.llmClient.providerName,
      });

      // Pass down or throw mapped error
      if (err?.statusCode === 503) {
        throw err;
      }

      const wrappedError: any = new Error(errorMessage);
      wrappedError.statusCode = err?.statusCode || 500;
      throw wrappedError;
    }
  }
}
