import { AiRequestModel } from '../db/models/ai-request.model.js';
import { getMongoStatus } from '../db/mongo.js';

export interface LogAiRequestParams {
  feature: string;
  promptVersion: string;
  tripId?: string;
  inputMessage: string;
  tokens: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
  outcome: 'success' | 'error';
  errorMessage?: string;
  provider: string;
}

export class AiRequestService {
  private static inMemoryLog: LogAiRequestParams[] = [];

  static async logRequest(params: LogAiRequestParams): Promise<void> {
    try {
      if (getMongoStatus() === 'connected') {
        await AiRequestModel.create(params);
      } else {
        // Safe in-memory buffer when Mongo is not connected
        this.inMemoryLog.push(params);
        if (this.inMemoryLog.length > 500) {
          this.inMemoryLog.shift();
        }
      }
    } catch (err: any) {
      console.warn(`[AiRequestService] Failed to record telemetry to Mongo: ${err?.message || err}`);
      this.inMemoryLog.push(params);
    }
  }

  static getInMemoryLogs(): LogAiRequestParams[] {
    return [...this.inMemoryLog];
  }

  static clearInMemoryLogs(): void {
    this.inMemoryLog = [];
  }
}
