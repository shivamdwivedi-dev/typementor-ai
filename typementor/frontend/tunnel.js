import localtunnel from 'localtunnel';

(async () => {
  try {
    const tunnel = await localtunnel({
      port: 5173,
      local_host: '127.0.0.1',
      subdomain: 'typementor-ai-' + Math.floor(Math.random() * 100000)
    });
    console.log(`STABLE_SHAREABLE_URL: ${tunnel.url}`);
    tunnel.on('close', () => console.log('Tunnel closed'));
  } catch (err) {
    console.error('Tunnel error:', err);
  }
})();
