/**
 * Trip Collaboration Router
 * Provides REST endpoints for real-time collaborative features:
 * group chat messages, task management boards, voting polls, and travel memories.
 */

import { Router, Response } from 'express';
import { randomUUID } from 'crypto';
import {
  ChatMessageModel,
  TaskModel,
  PollModel,
  MemoryModel,
} from '../db/models/collaboration.model.js';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth.middleware.js';

export const collaborationRouter = Router();

// ===========================================================================
// Group Chat Endpoints
// ===========================================================================
collaborationRouter.get('/:tripId/chat', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { tripId } = req.params;
    const messages = await ChatMessageModel.find({ tripId }).sort({ createdAt: 1 }).limit(200);
    res.status(200).json({ ok: true, count: messages.length, messages });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: 'Failed to fetch messages.', error: err?.message });
  }
});

collaborationRouter.post('/:tripId/chat', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { tripId } = req.params;
    const { message, senderName, senderAvatar, messageType } = req.body;

    if (!message || !message.trim()) {
      res.status(400).json({ ok: false, message: 'Message content is required.' });
      return;
    }

    const chatMsg = new ChatMessageModel({
      id: `msg-${randomUUID().slice(0, 8)}`,
      tripId,
      senderId: req.user?.id,
      senderName: senderName || req.user?.name || 'Voyana Traveler',
      senderAvatar: senderAvatar,
      message: message.trim(),
      messageType: messageType || 'text',
    });

    await chatMsg.save();

    res.status(201).json({ ok: true, message: chatMsg });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: 'Failed to send message.', error: err?.message });
  }
});

// ===========================================================================
// Tasks Endpoints
// ===========================================================================
collaborationRouter.get('/:tripId/tasks', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { tripId } = req.params;
    const tasks = await TaskModel.find({ tripId }).sort({ createdAt: -1 });
    res.status(200).json({ ok: true, count: tasks.length, tasks });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: 'Failed to fetch tasks.', error: err?.message });
  }
});

collaborationRouter.post('/:tripId/tasks', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { tripId } = req.params;
    const body = req.body;

    if (!body.title || !body.title.trim()) {
      res.status(400).json({ ok: false, message: 'Task title is required.' });
      return;
    }

    const task = new TaskModel({
      id: body.id || `task-${randomUUID().slice(0, 6)}`,
      tripId,
      title: body.title.trim(),
      description: body.description,
      assignedTo: body.assignedTo,
      assignedEmail: body.assignedEmail,
      dueDate: body.dueDate,
      status: body.status || 'todo',
      category: body.category || 'General',
    });

    await task.save();
    res.status(201).json({ ok: true, message: 'Task created.', task });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: 'Failed to create task.', error: err?.message });
  }
});

collaborationRouter.put('/:tripId/tasks/:taskId', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const updates = { ...req.body };
    delete updates._id;

    const task = await TaskModel.findOneAndUpdate(
      { id: taskId },
      { $set: updates },
      { new: true }
    );

    if (!task) {
      res.status(404).json({ ok: false, message: 'Task not found.' });
      return;
    }

    res.status(200).json({ ok: true, message: 'Task updated.', task });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: 'Failed to update task.', error: err?.message });
  }
});

collaborationRouter.delete('/:tripId/tasks/:taskId', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    await TaskModel.findOneAndDelete({ id: taskId });
    res.status(200).json({ ok: true, message: 'Task deleted.' });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: 'Failed to delete task.', error: err?.message });
  }
});

// ===========================================================================
// Polls Endpoints
// ===========================================================================
collaborationRouter.get('/:tripId/polls', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { tripId } = req.params;
    const polls = await PollModel.find({ tripId }).sort({ createdAt: -1 });
    res.status(200).json({ ok: true, count: polls.length, polls });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: 'Failed to fetch polls.', error: err?.message });
  }
});

collaborationRouter.post('/:tripId/polls', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { tripId } = req.params;
    const { question, options } = req.body;

    if (!question || !Array.isArray(options) || options.length < 2) {
      res.status(400).json({ ok: false, message: 'Question and at least 2 options are required.' });
      return;
    }

    const poll = new PollModel({
      id: `poll-${randomUUID().slice(0, 6)}`,
      tripId,
      question: question.trim(),
      options: options.map((opt: any, idx: number) => ({
        id: idx + 1,
        text: typeof opt === 'string' ? opt : opt.text,
        votes: 0,
        voterNames: [],
      })),
      isClosed: false,
      totalVotes: 0,
    });

    await poll.save();
    res.status(201).json({ ok: true, message: 'Poll created.', poll });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: 'Failed to create poll.', error: err?.message });
  }
});

collaborationRouter.post('/:tripId/polls/:pollId/vote', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { pollId } = req.params;
    const { optionId, voterName } = req.body;
    const voter = voterName || req.user?.name || 'Collaborator';

    const poll = await PollModel.findOne({ id: pollId });
    if (!poll) {
      res.status(404).json({ ok: false, message: 'Poll not found.' });
      return;
    }

    const option = poll.options.find((o) => o.id === optionId);
    if (!option) {
      res.status(400).json({ ok: false, message: 'Invalid option selected.' });
      return;
    }

    // Increment vote and record voter
    if (!option.voterNames.includes(voter)) {
      option.votes += 1;
      option.voterNames.push(voter);
      poll.totalVotes += 1;
      poll.markModified('options');
      await poll.save();
    }

    res.status(200).json({ ok: true, message: 'Vote recorded.', poll });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: 'Failed to record vote.', error: err?.message });
  }
});

// ===========================================================================
// Travel Memories Endpoints
// ===========================================================================
collaborationRouter.get('/:tripId/memories', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { tripId } = req.params;
    const memories = await MemoryModel.find({ tripId }).sort({ createdAt: -1 });
    res.status(200).json({ ok: true, count: memories.length, memories });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: 'Failed to fetch memories.', error: err?.message });
  }
});

collaborationRouter.post('/:tripId/memories', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { tripId } = req.params;
    const body = req.body;

    if (!body.title || !body.imageUrl) {
      res.status(400).json({ ok: false, message: 'Memory title and imageUrl are required.' });
      return;
    }

    const memory = new MemoryModel({
      id: `mem-${randomUUID().slice(0, 6)}`,
      tripId,
      uploadedBy: body.uploadedBy || req.user?.name || 'Voyana Traveler',
      title: body.title,
      locationName: body.locationName,
      caption: body.caption,
      imageUrl: body.imageUrl,
      date: body.date || new Date().toISOString().split('T')[0],
      likes: [],
      tags: Array.isArray(body.tags) ? body.tags : [],
    });

    await memory.save();
    res.status(201).json({ ok: true, message: 'Memory saved.', memory });
  } catch (err: any) {
    res.status(500).json({ ok: false, message: 'Failed to save memory.', error: err?.message });
  }
});
