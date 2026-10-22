/**
 * Collaboration Mongoose Models
 * Manages group chat messages, collaborative task boards, voting polls,
 * travel memories, and shared trip files for Voyana.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

// ---------------------------------------------------------------------------
// Chat Message Model
// ---------------------------------------------------------------------------
export interface IChatMessage extends Document {
  id: string;
  tripId: string;
  senderId?: string;
  senderName: string;
  senderAvatar?: string;
  message: string;
  messageType: 'text' | 'activity_log' | 'poll_share' | 'image';
  createdAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    id: { type: String, required: true, unique: true, index: true },
    tripId: { type: String, required: true, index: true },
    senderId: { type: String },
    senderName: { type: String, required: true },
    senderAvatar: { type: String },
    message: { type: String, required: true },
    messageType: {
      type: String,
      enum: ['text', 'activity_log', 'poll_share', 'image'],
      default: 'text',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const ChatMessageModel: Model<IChatMessage> =
  mongoose.models.ChatMessage || mongoose.model<IChatMessage>('ChatMessage', ChatMessageSchema);

// ---------------------------------------------------------------------------
// Task Board Model
// ---------------------------------------------------------------------------
export interface ITask extends Document {
  id: string;
  tripId: string;
  title: string;
  description?: string;
  assignedTo?: string;
  assignedEmail?: string;
  dueDate?: string;
  status: 'todo' | 'in_progress' | 'completed';
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    id: { type: String, required: true, unique: true, index: true },
    tripId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    assignedTo: { type: String },
    assignedEmail: { type: String },
    dueDate: { type: String },
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'completed'],
      default: 'todo',
      index: true,
    },
    category: { type: String, default: 'General' },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const TaskModel: Model<ITask> =
  mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);

// ---------------------------------------------------------------------------
// Voting Poll Model
// ---------------------------------------------------------------------------
export interface IPollOption {
  id: number;
  text: string;
  votes: number;
  voterNames: string[];
}

export interface IPoll extends Document {
  id: string;
  tripId: string;
  question: string;
  options: IPollOption[];
  isClosed: boolean;
  totalVotes: number;
  createdAt: Date;
  updatedAt: Date;
}

const PollOptionSchema = new Schema<IPollOption>(
  {
    id: { type: Number, required: true },
    text: { type: String, required: true },
    votes: { type: Number, default: 0 },
    voterNames: [{ type: String }],
  },
  { _id: false }
);

const PollSchema = new Schema<IPoll>(
  {
    id: { type: String, required: true, unique: true, index: true },
    tripId: { type: String, required: true, index: true },
    question: { type: String, required: true },
    options: { type: [PollOptionSchema], default: [] },
    isClosed: { type: Boolean, default: false },
    totalVotes: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const PollModel: Model<IPoll> =
  mongoose.models.Poll || mongoose.model<IPoll>('Poll', PollSchema);

// ---------------------------------------------------------------------------
// Memory / Journal Model
// ---------------------------------------------------------------------------
export interface IMemory extends Document {
  id: string;
  tripId: string;
  uploadedBy: string;
  title: string;
  locationName?: string;
  caption?: string;
  imageUrl: string;
  date: string;
  likes: string[];
  tags: string[];
  createdAt: Date;
}

const MemorySchema = new Schema<IMemory>(
  {
    id: { type: String, required: true, unique: true, index: true },
    tripId: { type: String, required: true, index: true },
    uploadedBy: { type: String, required: true },
    title: { type: String, required: true },
    locationName: { type: String },
    caption: { type: String },
    imageUrl: { type: String, required: true },
    date: { type: String, default: () => new Date().toISOString().split('T')[0] },
    likes: [{ type: String }],
    tags: [{ type: String }],
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const MemoryModel: Model<IMemory> =
  mongoose.models.Memory || mongoose.model<IMemory>('Memory', MemorySchema);
