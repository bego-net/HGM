const PocketBase = require('pocketbase').default;

async function main() {
  const pb = new PocketBase('http://127.0.0.1:8090');
  pb.autoCancellation(false);
  await pb.collection('_superusers').authWithPassword('begobegonet1@gmail.com', 'hgm3001Admin!');
  const headers = { Authorization: 'Bearer ' + pb.authStore.token, 'Content-Type': 'application/json' };

  // 1. Add created/updated autodate fields to registrants (PB v0.39 base collections need these explicitly)
  const regRes = await fetch('http://127.0.0.1:8090/api/collections/registrants', { headers });
  const regCol = await regRes.json();
  const regFields = regCol.fields || [];
  const hasCreated = regFields.some(f => f.name === 'created');
  const hasUpdated = regFields.some(f => f.name === 'updated');

  if (!hasCreated || !hasUpdated) {
    const newFields = [...regFields];
    if (!hasCreated) newFields.push({ name: 'created', type: 'autodate', onCreate: true, onUpdate: false });
    if (!hasUpdated) newFields.push({ name: 'updated', type: 'autodate', onCreate: true, onUpdate: true });
    const patchRes = await fetch('http://127.0.0.1:8090/api/collections/registrants', {
      method: 'PATCH', headers, body: JSON.stringify({ fields: newFields })
    });
    console.log('registrants created/updated fields:', patchRes.status === 200 ? 'ADDED' : 'FAILED');
  } else {
    console.log('registrants created/updated fields: already exist');
  }

  // 2. Same for scanLogs
  const scanRes = await fetch('http://127.0.0.1:8090/api/collections/scanLogs', { headers });
  const scanCol = await scanRes.json();
  const scanFields = scanCol.fields || [];
  if (!scanFields.some(f => f.name === 'created') || !scanFields.some(f => f.name === 'updated')) {
    const newFields = [...scanFields];
    if (!newFields.some(f => f.name === 'created')) newFields.push({ name: 'created', type: 'autodate', onCreate: true, onUpdate: false });
    if (!newFields.some(f => f.name === 'updated')) newFields.push({ name: 'updated', type: 'autodate', onCreate: true, onUpdate: true });
    const patchRes = await fetch('http://127.0.0.1:8090/api/collections/scanLogs', {
      method: 'PATCH', headers, body: JSON.stringify({ fields: newFields })
    });
    console.log('scanLogs created/updated fields:', patchRes.status === 200 ? 'ADDED' : 'FAILED');
  }

  // 3. Fix rules to use @request.auth.id != "" (works for any auth collection)
  const rule = '@request.auth.id != ""';
  await fetch('http://127.0.0.1:8090/api/collections/registrants', {
    method: 'PATCH', headers,
    body: JSON.stringify({ listRule: rule, viewRule: rule, createRule: '', updateRule: rule, deleteRule: rule })
  });
  await fetch('http://127.0.0.1:8090/api/collections/scanLogs', {
    method: 'PATCH', headers,
    body: JSON.stringify({ listRule: rule, viewRule: rule, createRule: rule, updateRule: rule, deleteRule: rule })
  });
  console.log('Collection rules updated to:', rule);

  // 4. Verify sort=-created works now
  const pb2 = new PocketBase('http://127.0.0.1:8090');
  pb2.autoCancellation(false);
  await pb2.collection('admins').authWithPassword('begobegonet1@gmail.com', 'hgm3001Admin!');
  
  const testRes = await fetch('http://127.0.0.1:8090/api/collections/registrants/records?sort=-created', {
    headers: { Authorization: 'Bearer ' + pb2.authStore.token }
  });
  console.log('sort=-created test:', testRes.status === 200 ? 'PASS' : 'FAIL (' + testRes.status + ')');
  
  const list = await pb2.collection('registrants').getFullList({ sort: '-created' });
  console.log('getFullList with sort: PASS -', list.length, 'records');
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
