import ngrok from 'ngrok';

(async () => {
  try {
    const url = await ngrok.connect({
      proto: 'http',
      addr: 5173,
    });
    console.log(`NGROK_PUBLIC_URL: ${url}`);
  } catch (err) {
    console.error('Ngrok error:', err);
  }
})();
