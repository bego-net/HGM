const PocketBase = require('pocketbase');

const pb = new PocketBase('http://127.0.0.1:8090');

async function run() {
  try {
    const email = process.argv[2] || 'begobegonet1@gmail.com';
    const pass = process.argv[3] || 'hgm3001';
    await pb.admins.authWithPassword(email, pass);
    console.log('AUTH OK', pb.authStore.isValid);
  } catch (err) {
    console.error('AUTH FAIL', err && err.message ? err.message : err);
    process.exit(1);
  }
}

run();
