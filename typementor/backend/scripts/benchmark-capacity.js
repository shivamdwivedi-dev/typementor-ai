const http = require('http');

const BASE_URL = 'http://localhost:5000';

function makeRequest(path, headers = {}) {
  return new Promise((resolve) => {
    const start = process.hrtime.bigint();
    const req = http.get(`${BASE_URL}${path}`, {
      headers,
      agent: new http.Agent({ keepAlive: true, maxSockets: 2000 })
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const end = process.hrtime.bigint();
        const durationMs = Number(end - start) / 1e6;
        resolve({
          status: res.statusCode,
          durationMs,
          success: res.statusCode >= 200 && res.statusCode < 400
        });
      });
    });

    req.on('error', (err) => {
      const end = process.hrtime.bigint();
      const durationMs = Number(end - start) / 1e6;
      resolve({
        status: 0,
        error: err.code || err.message,
        durationMs,
        success: false
      });
    });

    req.setTimeout(8000, () => {
      req.destroy();
      resolve({ status: 504, durationMs: 8000, success: false });
    });
  });
}

async function runScenario(scenarioName, path, concurrentUsers, totalRequests, headers = {}) {
  console.log(`\n======================================================`);
  console.log(`[${scenarioName}] Concurrency: ${concurrentUsers} | Total: ${totalRequests} | Path: ${path}`);
  console.log(`======================================================`);

  const results = [];
  let remaining = totalRequests;
  let activeWorkers = 0;
  const startTime = Date.now();

  return new Promise((resolve) => {
    function launchWorker() {
      if (remaining <= 0) {
        if (activeWorkers === 0) {
          const totalDurationSec = (Date.now() - startTime) / 1000;
          finalize(results, totalDurationSec);
          resolve();
        }
        return;
      }

      remaining--;
      activeWorkers++;

      makeRequest(path, headers).then((res) => {
        results.push(res);
        activeWorkers--;
        launchWorker();
      });
    }

    for (let i = 0; i < Math.min(concurrentUsers, totalRequests); i++) {
      launchWorker();
    }
  });
}

function finalize(results, totalSec) {
  const total = results.length;
  const successful = results.filter(r => r.success).length;
  const failed = total - successful;
  const statusCounts = {};
  for (const r of results) {
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
  }

  const latencies = results.map(r => r.durationMs).sort((a, b) => a - b);
  const sum = latencies.reduce((a, b) => a + b, 0);
  const avg = (sum / (latencies.length || 1)).toFixed(2);
  const p50 = (latencies[Math.floor(latencies.length * 0.50)] || 0).toFixed(2);
  const p90 = (latencies[Math.floor(latencies.length * 0.90)] || 0).toFixed(2);
  const p95 = (latencies[Math.floor(latencies.length * 0.95)] || 0).toFixed(2);
  const p99 = (latencies[Math.floor(latencies.length * 0.99)] || 0).toFixed(2);
  const max = (latencies[latencies.length - 1] || 0).toFixed(2);
  const rps = (total / (totalSec || 0.001)).toFixed(2);

  console.log(`Execution Time:      ${totalSec.toFixed(2)}s`);
  console.log(`Throughput:          ${rps} req/sec`);
  console.log(`Success Rate:        ${((successful / total) * 100).toFixed(1)}% (${successful}/${total})`);
  console.log(`Status Codes:        ${JSON.stringify(statusCounts)}`);
  console.log(`Avg Latency:         ${avg} ms`);
  console.log(`p50 (Median):        ${p50} ms`);
  console.log(`p90:                 ${p90} ms`);
  console.log(`p95:                 ${p95} ms`);
  console.log(`p99:                 ${p99} ms`);
  console.log(`Max Latency:         ${max} ms`);
}

async function start() {
  console.log('=== TypeMentor Backend Concurrency & Capacity Benchmark ===');

  // Warm-up
  await runScenario('Warm-Up', '/health', 10, 50);

  // 1. Database Query Concurrency (hitting Prisma SELECT 1 through Express pipeline)
  await runScenario('Prisma DB Concurrency - Low', '/health', 25, 200);
  await runScenario('Prisma DB Concurrency - Medium', '/health', 50, 400);
  await runScenario('Prisma DB Concurrency - High', '/health', 100, 800);

  // 2. High Concurrency Peak Test
  await runScenario('Peak Burst Concurrency', '/health', 200, 1000);

  console.log('\n======================================================');
  console.log('Benchmark execution complete.');
  console.log('======================================================');
}

start().catch(console.error);
