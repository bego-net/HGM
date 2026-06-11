const PocketBase = require('pocketbase').default;

async function main() {
  const pb = new PocketBase('http://127.0.0.1:8090');
  pb.autoCancellation(false);
  await pb.collection('_superusers').authWithPassword('begobegonet1@gmail.com', 'hgm3001Admin!');
  const headers = { Authorization: 'Bearer ' + pb.authStore.token, 'Content-Type': 'application/json' };
  const rule = '@request.auth.id != ""';

  const body = {
    name: 'scanLogs', type: 'base',
    listRule: rule, viewRule: rule, createRule: rule, updateRule: rule, deleteRule: rule,
    fields: [
      { name: 'registrantId', type: 'text',     required: false },
      { name: 'checkpoint',   type: 'text',     required: false },
      { name: 'scannedAt',    type: 'date',     required: false },
      { name: 'scannedBy',    type: 'text',     required: false },
      { name: 'created',      type: 'autodate', required: false, onCreate: true, onUpdate: false },
      { name: 'updated',      type: 'autodate', required: false, onCreate: true, onUpdate: true },
    ]
  };

  // Try create, then patch
  let res = await fetch('http://127.0.0.1:8090/api/collections', {
    method: 'POST', headers, body: JSON.stringify(body)
  });
  if (res.status === 200 || res.status === 201) {
    console.log('scanLogs: CREATED');
  } else {
    res = await fetch('http://127.0.0.1:8090/api/collections/scanLogs', {
      method: 'PATCH', headers, body: JSON.stringify(body)
    });
    console.log('scanLogs PATCH:', res.status === 200 ? 'OK' : 'FAIL ' + res.status);
  }
}

main().catch(e => console.log('ERROR:', e.message));
