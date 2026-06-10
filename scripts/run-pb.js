const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

function findBinary() {
  const pbDir = path.join(__dirname, '..', 'pocketbase');
  const candidates = [
    path.join(pbDir, 'pocketbase'),
    path.join(pbDir, 'pocketbase.exe'),
    path.join(pbDir, 'pocketbase-linux-amd64'),
    path.join(pbDir, 'pocketbase-macos-amd64')
  ];

  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}

const bin = findBinary();
if (!bin) {
  console.error('PocketBase binary not found in ./pocketbase. Please run the download script in pocketbase/ or place the binary at ./pocketbase/pocketbase');
  process.exit(1);
}

// PocketBase expects a host:port for --http (e.g. 127.0.0.1:8090)
const args = ['serve', '--dir', path.join(process.cwd(), 'pocketbase'), `--http=127.0.0.1:8090`];
const child = spawn(bin, args, { stdio: 'inherit' });

child.on('exit', (code) => process.exit(code));
child.on('error', (err) => {
  console.error('Failed to start PocketBase:', err);
  process.exit(1);
});
