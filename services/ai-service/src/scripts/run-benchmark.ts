import http from 'http';
import { createApp } from '../app.js';
import { connectMongo, disconnectMongo } from '../db/mongo.js';
import { DestinationModel } from '../db/models/destination.model.js';
import fs from 'fs';
import path from 'path';

async function runNativeBenchmark() {
  await connectMongo();

  // Ensure destination exists
  await DestinationModel.findOneAndUpdate(
    { id: 'dst-bench-1' },
    {
      id: 'dst-bench-1',
      name: 'Benchmark City',
      country: 'Testland',
      region: 'Europe',
      image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34',
      bestSeason: 'Spring',
      highlight: 'Test Tower',
      style: 'Modern',
      coordinates: { latitude: 48.8, longitude: 2.3 },
    },
    { upsert: true }
  );

  const app = createApp();
  const server = http.createServer(app);
  
  await new Promise<void>((resolve) => {
    server.listen(4006, '127.0.0.1', () => {
      console.log('Voyana Express server listening on http://127.0.0.1:4006');
      resolve();
    });
  });

  async function benchmarkEndpoint(endpointPath: string, label: string, durationSec = 3, concurrency = 10) {
    const latencies: number[] = [];
    let totalRequests = 0;
    let successfulRequests = 0;
    let errorRequests = 0;
    let bytesRead = 0;

    const startTime = Date.now();
    const endTime = startTime + durationSec * 1000;

    async function worker() {
      while (Date.now() < endTime) {
        const reqStart = performance.now();
        await new Promise<void>((resolve) => {
          const req = http.get(`http://127.0.0.1:4006${endpointPath}`, (res) => {
            let body = '';
            res.on('data', (chunk) => {
              body += chunk;
              bytesRead += chunk.length;
            });
            res.on('end', () => {
              const reqEnd = performance.now();
              latencies.push(reqEnd - reqStart);
              totalRequests++;
              if (res.statusCode && res.statusCode < 400) {
                successfulRequests++;
              } else {
                errorRequests++;
              }
              resolve();
            });
          });
          req.on('error', () => {
            totalRequests++;
            errorRequests++;
            resolve();
          });
          req.end();
        });
      }
    }

    console.log(`Starting ${concurrency}-client load test against ${endpointPath} for ${durationSec}s...`);
    await Promise.all(Array.from({ length: concurrency }, () => worker()));

    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.50)]?.toFixed(2) || '0.00';
    const p95 = latencies[Math.floor(latencies.length * 0.95)]?.toFixed(2) || '0.00';
    const p99 = latencies[Math.floor(latencies.length * 0.99)]?.toFixed(2) || '0.00';
    const min = latencies[0]?.toFixed(2) || '0.00';
    const max = latencies[latencies.length - 1]?.toFixed(2) || '0.00';
    const elapsedSec = (Date.now() - startTime) / 1000;
    const rps = (totalRequests / elapsedSec).toFixed(1);
    const mbps = ((bytesRead / elapsedSec) / (1024 * 1024)).toFixed(2);

    return {
      endpointPath,
      label,
      totalRequests,
      successfulRequests,
      errorRequests,
      elapsedSec: elapsedSec.toFixed(2),
      rps,
      mbps,
      min,
      p50,
      p95,
      p99,
      max,
    };
  }

  const resHealth = await benchmarkEndpoint('/health', 'Health Ping (No DB)', 3, 10);
  const resDest = await benchmarkEndpoint('/api/destinations', 'Destinations Catalog (Mongoose Query)', 3, 10);

  server.close();
  await disconnectMongo();

  const report = [
    '=================================================================',
    'VOYANA API LOAD & PERFORMANCE BENCHMARK (MULTI-ENDPOINT SUITE)',
    'Hardware / Environment: Local Development (Windows 11, Node.js v22.19.0)',
    'Concurrency: 10 parallel connections per test',
    '=================================================================',
    '',
    `--- 1. Health Check Endpoint (GET /health) ---`,
    `Description:           Lightweight health ping without DB query`,
    `Test Duration:         ${resHealth.elapsedSec}s`,
    `Requests Total:        ${resHealth.totalRequests}`,
    `Successful (2xx):      ${resHealth.successfulRequests}`,
    `Failed / Errored:      ${resHealth.errorRequests}`,
    `Average Req/Sec:       ${resHealth.rps} req/s`,
    `Throughput:            ${resHealth.mbps} MB/s`,
    `Latency Min:           ${resHealth.min} ms`,
    `Latency p50 (Median):  ${resHealth.p50} ms`,
    `Latency p95:           ${resHealth.p95} ms`,
    `Latency p99:           ${resHealth.p99} ms`,
    `Latency Max:           ${resHealth.max} ms`,
    '',
    `--- 2. Database Catalog Endpoint (GET /api/destinations) ---`,
    `Description:           Full Mongoose database query and JSON serialization`,
    `Test Duration:         ${resDest.elapsedSec}s`,
    `Requests Total:        ${resDest.totalRequests}`,
    `Successful (2xx):      ${resDest.successfulRequests}`,
    `Failed / Errored:      ${resDest.errorRequests}`,
    `Average Req/Sec:       ${resDest.rps} req/s`,
    `Throughput:            ${resDest.mbps} MB/s`,
    `Latency Min:           ${resDest.min} ms`,
    `Latency p50 (Median):  ${resDest.p50} ms`,
    `Latency p95:           ${resDest.p95} ms`,
    `Latency p99:           ${resDest.p99} ms`,
    `Latency Max:           ${resDest.max} ms`,
    '=================================================================',
  ].join('\n');

  console.log(report);

  const outDir = path.resolve(process.cwd(), '../../docs/testing/evidence');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  fs.writeFileSync(path.join(outDir, 'load-test-benchmark.txt'), report, 'utf-8');
  console.log('Saved multi-endpoint benchmark results to docs/testing/evidence/load-test-benchmark.txt');
}

runNativeBenchmark().catch(console.error);
