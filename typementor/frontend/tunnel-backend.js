import localtunnel from 'localtunnel';

(async () => {
  try {
    const tunnel = await localtunnel({
      port: 5000,
      local_host: '127.0.0.1',
      subdomain: 'typementor-backend-' + Math.floor(Math.random() * 100000)
    });
    console.log(`BACKEND_PUBLIC_URL: ${tunnel.url}`);
    tunnel.on('close', () => console.log('Backend tunnel closed'));
  } catch (err) {
    console.error('Backend tunnel error:', err);
  }
})();
