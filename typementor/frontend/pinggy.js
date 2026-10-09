import { spawn } from 'child_process';

const p = spawn('ssh', ['-tt', '-o', 'StrictHostKeyChecking=no', '-p', '443', '-R', '80:127.0.0.1:5173', 'a.pinggy.io'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

p.stdout.on('data', (data) => {
  const str = data.toString();
  console.log(str);
});

p.stderr.on('data', (data) => {
  console.log(data.toString());
});
