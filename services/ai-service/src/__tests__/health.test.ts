import request from 'supertest';
import { createApp } from '../app.js';

describe('GET /health', () => {
  const app = createApp();

  it('should return 200 OK with status and dependency states', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('service', 'ai-service');
    expect(response.body).toHaveProperty('dependencies');
    expect(response.body.dependencies).toHaveProperty('database');
    expect(response.body.dependencies).toHaveProperty('llmProvider');
    expect(response.body.dependencies.llmProvider.status).toBe('ready');
  });

  it('should return 404 for unknown routes', async () => {
    const response = await request(app).get('/non-existent-route');
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error', 'Not Found');
  });
});
