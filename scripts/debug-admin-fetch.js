const PocketBase = require('pocketbase').default;

async function main() {
  const pb = new PocketBase('http://127.0.0.1:8090');
  pb.autoCancellation(false);

  // 1. Auth as admin
  const auth = await pb.collection('admins').authWithPassword('begobegonet1@gmail.com', 'hgm3001Admin!');
  console.log('Auth OK, token valid:', pb.authStore.isValid);
  const token = pb.authStore.token;

  // 2. Try raw fetch to isolate the problem
  console.log('\n--- Testing raw REST calls ---');
  
  // Simple list with no sort
  const r1 = await fetch('http://127.0.0.1:8090/api/collections/registrants/records', {
    headers: { Authorization: 'Bearer ' + token }
  });
  console.log('GET /records (no params):', r1.status, r1.statusText);
  if (r1.status !== 200) {
    const t = await r1.text();
    console.log('  Body:', t);
  } else {
    const j = await r1.json();
    console.log('  Items:', j.items?.length, '| Total:', j.totalItems);
  }

  // With sort
  const r2 = await fetch('http://127.0.0.1:8090/api/collections/registrants/records?sort=-created', {
    headers: { Authorization: 'Bearer ' + token }
  });
  console.log('GET /records?sort=-created:', r2.status);
  if (r2.status !== 200) {
    console.log('  Body:', await r2.text());
  } else {
    const j = await r2.json();
    console.log('  Items:', j.items?.length);
  }

  // 3. Try SDK getList instead of getFullList
  console.log('\n--- Testing SDK calls ---');
  try {
    const list = await pb.collection('registrants').getList(1, 10);
    console.log('getList OK:', list.items.length, 'items');
  } catch (e) {
    console.log('getList FAIL:', e.status, e.message);
    if (e.originalError) console.log('  originalError:', e.originalError.message);
    if (e.response) console.log('  response:', JSON.stringify(e.response));
  }

  try {
    const full = await pb.collection('registrants').getFullList();
    console.log('getFullList OK:', full.length, 'items');
  } catch (e) {
    console.log('getFullList FAIL:', e.status, e.message);
  }
}

main().catch(e => { console.error('SCRIPT ERROR:', e.message); process.exit(1); });
