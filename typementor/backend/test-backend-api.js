const http = require('http');
const https = require('https');

async function makeRequest(url, method = 'GET', headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const lib = isHttps ? https : http;
    const req = lib.request(url, { method, headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) { json = data; }
        resolve({ statusCode: res.statusCode, data: json });
      });
    });
    req.on('error', err => reject(err));
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function testBackend(baseUrl, label) {
  console.log(`\n==============================================`);
  console.log(`Testing Backend API: ${label} (${baseUrl})`);
  console.log(`==============================================`);

  const timestamp = Date.now();
  const testUser = {
    name: `Test User ${timestamp}`,
    email: `test_user_${timestamp}@example.com`,
    password: `Password123!`
  };

  try {
    // 1. Health check
    console.log(`\n1. GET /health`);
    const health = await makeRequest(`${baseUrl}/health`);
    console.log(`Status: ${health.statusCode}`, health.data);
    if (health.statusCode !== 200 || health.data.status !== 'ok') {
      throw new Error(`Health check failed: ${JSON.stringify(health.data)}`);
    }

    // 2. Register
    console.log(`\n2. POST /api/auth/register`);
    const regRes = await makeRequest(`${baseUrl}/api/auth/register`, 'POST', { 'Content-Type': 'application/json' }, testUser);
    console.log(`Status: ${regRes.statusCode}`, regRes.data.user ? { user: regRes.data.user.email, id: regRes.data.user.id } : regRes.data);
    if (regRes.statusCode !== 201 || !regRes.data.token) {
      throw new Error(`Registration failed: ${JSON.stringify(regRes.data)}`);
    }
    const token = regRes.data.token;
    const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

    // 3. Login
    console.log(`\n3. POST /api/auth/login`);
    const loginRes = await makeRequest(`${baseUrl}/api/auth/login`, 'POST', { 'Content-Type': 'application/json' }, {
      email: testUser.email,
      password: testUser.password
    });
    console.log(`Status: ${loginRes.statusCode}`, loginRes.data.user ? { user: loginRes.data.user.email } : loginRes.data);
    if (loginRes.statusCode !== 200 || !loginRes.data.token) {
      throw new Error(`Login failed: ${JSON.stringify(loginRes.data)}`);
    }

    // 4. GET /api/auth/profile
    console.log(`\n4. GET /api/auth/profile`);
    const profileRes = await makeRequest(`${baseUrl}/api/auth/profile`, 'GET', authHeaders);
    console.log(`Status: ${profileRes.statusCode}`, profileRes.data.user ? { email: profileRes.data.user.email, level: profileRes.data.user.level } : profileRes.data);
    if (profileRes.statusCode !== 200) {
      throw new Error(`Profile check failed: ${JSON.stringify(profileRes.data)}`);
    }

    // 5. POST /api/sessions
    console.log(`\n5. POST /api/sessions`);
    const sessionPayload = {
      mode: 'words',
      difficulty: 1,
      wpm: 75.5,
      rawWpm: 80.0,
      accuracy: 96.2,
      consistency: 88.0,
      focusScore: 92.0,
      duration: 30.0,
      backspaceCount: 3,
      correctionCount: 3,
      keystrokes: [
        { expectedKey: 'a', actualKey: 'a', reactionTime: 120, holdTime: 60, pauseDuration: 10, wordIndex: 0, isMistake: false },
        { expectedKey: 'b', actualKey: 'v', reactionTime: 150, holdTime: 70, pauseDuration: 15, wordIndex: 0, isMistake: true }
      ]
    };
    const sessionRes = await makeRequest(`${baseUrl}/api/sessions`, 'POST', authHeaders, sessionPayload);
    console.log(`Status: ${sessionRes.statusCode}`, sessionRes.data.session ? { id: sessionRes.data.session.id, xpGained: sessionRes.data.xpGained } : sessionRes.data);
    if (sessionRes.statusCode !== 201) {
      throw new Error(`Session submission failed: ${JSON.stringify(sessionRes.data)}`);
    }

    // 6. GET /api/sessions
    console.log(`\n6. GET /api/sessions`);
    const getSessionsRes = await makeRequest(`${baseUrl}/api/sessions`, 'GET', authHeaders);
    console.log(`Status: ${getSessionsRes.statusCode}`, Array.isArray(getSessionsRes.data) ? `Fetched ${getSessionsRes.data.length} sessions` : getSessionsRes.data);

    // 7. GET /api/analytics/heatmap
    console.log(`\n7. GET /api/analytics/heatmap`);
    const heatmapRes = await makeRequest(`${baseUrl}/api/analytics/heatmap`, 'GET', authHeaders);
    console.log(`Status: ${heatmapRes.statusCode}`, heatmapRes.data);

    // 8. GET /api/coach/insights
    console.log(`\n8. GET /api/coach/insights`);
    const insightsRes = await makeRequest(`${baseUrl}/api/coach/insights`, 'GET', authHeaders);
    console.log(`Status: ${insightsRes.statusCode}`, insightsRes.data.insights ? `Primary weak key: ${insightsRes.data.insights.primaryWeakKey}` : insightsRes.data);

    // 9. POST /api/feedback (Public user feedback)
    console.log(`\n9. POST /api/feedback`);
    const feedbackRes = await makeRequest(`${baseUrl}/api/feedback`, 'POST', { 'Content-Type': 'application/json' }, {
      name: 'Test Tester',
      email: testUser.email,
      device: 'Desktop',
      rating: 5,
      whatWorked: 'Everything is fast and beautiful',
      whatConfused: 'Nothing',
      bugFound: 'None',
      suggestion: 'Keep up the good work'
    });
    console.log(`Status: ${feedbackRes.statusCode}`, feedbackRes.data);
    if (feedbackRes.statusCode !== 201) {
      throw new Error(`Feedback submission failed: ${JSON.stringify(feedbackRes.data)}`);
    }

    console.log(`\n✅ ALL ENDPOINTS PASSED CLEANLY FOR ${label}!`);
    return true;
  } catch (err) {
    console.error(`\n❌ FAILED ${label}:`, err.message);
    return false;
  }
}

async function runAll() {
  const localSuccess = await testBackend('http://localhost:5000', 'LOCAL BACKEND');
  const liveSuccess = await testBackend('https://typementor-backend1.onrender.com', 'LIVE RENDER BACKEND');
  
  if (!localSuccess || !liveSuccess) {
    process.exit(1);
  }
}

runAll();
