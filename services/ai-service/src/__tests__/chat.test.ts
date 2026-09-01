import request from 'supertest';
import { createApp } from '../app.js';
import { AiRequestService } from '../services/ai-request.service.js';

describe('POST /ai/chat', () => {
  const app = createApp();

  beforeEach(() => {
    AiRequestService.clearInMemoryLogs();
  });

  it('should answer travel questions and cite specific days from the fixture context', async () => {
    const payload = {
      message: 'What should we pack for Day 4 Mount Batur hike?',
      tripId: 'trip-bali-001',
    };

    const response = await request(app)
      .post('/ai/chat')
      .send(payload)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('content');
    expect(response.body.content).toContain('Mount Batur');
    expect(response.body.aiGenerated).toBe(true);
    expect(response.body).toHaveProperty('citedContext');
    expect(response.body.citedContext.days).toContain(4);

    // Verify telemetry logging
    const logs = AiRequestService.getInMemoryLogs();
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[0].feature).toBe('ai_chat');
    expect(logs[0].promptVersion).toBe('chat.v1');
    expect(logs[0].outcome).toBe('success');
  });

  it('should cite budget information accurately', async () => {
    const response = await request(app)
      .post('/ai/chat')
      .send({ message: 'What is our total budget and largest expense?' });

    expect(response.status).toBe(200);
    expect(response.body.content).toContain('$4,500');
    expect(response.body.aiGenerated).toBe(true);
    expect(response.body.citedContext.days.length).toBeGreaterThan(0);
  });

  it('should propose adjustments when requested without modifying the underlying itinerary', async () => {
    const response = await request(app)
      .post('/ai/chat')
      .send({ message: 'Can you propose a change for more adventure on Day 5?' });

    expect(response.status).toBe(200);
    expect(response.body.aiGenerated).toBe(true);
    expect(response.body.proposedChanges.length).toBeGreaterThan(0);
    expect(response.body.proposedChanges[0].day).toBe(5);
    expect(response.body.proposedChanges[0]).toHaveProperty('rationale');
  });

  it('should reject empty or malformed requests with 400 Bad Request', async () => {
    const response = await request(app)
      .post('/ai/chat')
      .send({})
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Invalid request payload');
    expect(response.body).toHaveProperty('details');
  });
});
