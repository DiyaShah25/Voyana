import mongoose, { Schema, Document } from 'mongoose';

export interface IAiRequest extends Document {
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
  createdAt: Date;
}

const AiRequestSchema: Schema = new Schema(
  {
    feature: { type: String, required: true, default: 'ai_chat' },
    promptVersion: { type: String, required: true, default: 'chat.v1' },
    tripId: { type: String, required: false },
    inputMessage: { type: String, required: true },
    tokens: {
      promptTokens: { type: Number, default: 0 },
      completionTokens: { type: Number, default: 0 },
      totalTokens: { type: Number, default: 0 },
    },
    latencyMs: { type: Number, required: true },
    outcome: { type: String, enum: ['success', 'error'], required: true },
    errorMessage: { type: String },
    provider: { type: String, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const AiRequestModel = mongoose.models.AiRequest || mongoose.model<IAiRequest>('AiRequest', AiRequestSchema, 'ai_requests');
