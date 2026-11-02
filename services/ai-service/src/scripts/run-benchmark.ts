import http from 'http';
import { createApp } from '../app.js';
import fs from 'fs';
import path from 'path';

async function runNativeBenchmark() {
  const app = createApp();
  const server = http.createServer(app);
  
  await new Promise<void>((resolve) => {
    server.listen(4005, '127.0.0.1', () => {
      console.log('Voyana Express server listening on http://127.0.0.1:4005');
      resolve();
    });
  });

  const durationMs = 4000;
  const concurrency = 10;
  const latencies: number[] = [];
  let totalRequests = 0;
  let successfulRequests = 0;
  let errorRequests = 0;
  let bytesRead = 0;

  const startTime = Date.now();
  const endTime = startTime + durationMs;

  async function worker() {
    while (Date.now() < endTime) {
      const reqStart = performance.now();
      await new Promise<void>((resolve) => {
        const req = http.get('http://127.0.0.1:4005/health', (res) => {
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

  console.log(`Starting ${concurrency}-client load test against /health for ${durationMs / 1000}s...`);
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  server.close();

  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.50)]?.toFixed(2) || '0.00';
  const p95 = latencies[Math.floor(latencies.length * 0.95)]?.toFixed(2) || '0.00';
  const p99 = latencies[Math.floor(latencies.length * 0.99)]?.toFixed(2) || '0.00';
  const min = latencies[0]?.toFixed(2) || '0.00';
  const max = latencies[latencies.length - 1]?.toFixed(2) || '0.00';
  const elapsedSec = (Date.now() - startTime) / 1000;
  const rps = (totalRequests / elapsedSec).toFixed(1);
  const mbps = ((bytesRead / elapsedSec) / (1024 * 1024)).toFixed(2);

  const report = [
    '=================================================================',
    'VOYANA API LOAD & PERFORMANCE BENCHMARK (NATIVE CONCURRENT SUITE)',
    'Target Endpoint: GET /health',
    'Hardware / Environment: Local Development (Windows 11, Node.js v22.19.0)',
    'Concurrency: 10 parallel connections',
    `Test Duration: ${elapsedSec.toFixed(2)}s`,
    '=================================================================',
    `Requests Total:       ${totalRequests}`,
    `Successful (2xx):     ${successfulRequests}`,
    `Failed / Errored:     ${errorRequests}`,
    `Average Req/Sec:      ${rps} req/s`,
    `Throughput:           ${mbps} MB/s`,
    `Latency Min:          ${min} ms`,
    `Latency p50 (Median): ${p50} ms`,
    `Latency p95:          ${p95} ms`,
    `Latency p99:          ${p99} ms`,
    `Latency Max:          ${max} ms`,
    '=================================================================',
  ].join('\n');

  console.log(report);

  const outDir = path.resolve(process.cwd(), '../../docs/testing/evidence');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  fs.writeFileSync(path.join(outDir, 'load-test-benchmark.txt'), report, 'utf-8');
  console.log('Saved benchmark results to docs/testing/evidence/load-test-benchmark.txt');
}

runNativeBenchmark().catch(console.error);
